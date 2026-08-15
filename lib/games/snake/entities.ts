/**
 * Las dos entidades de Snake.
 *
 * Como en Asteroids y Arkanoid, el `ctx` va siempre por parámetro: una entidad
 * no guarda el contexto del canvas, así que el mismo objeto se dibujaría en
 * cualquier superficie y nada de aquí sobrevive a `destroy()` agarrado a un
 * `<canvas>` muerto.
 *
 * Las dos trabajan en coordenadas de rejilla —`0..COLS-1` por `0..ROWS-1`— y
 * solo pasan a píxeles dentro de `draw()`.
 *
 * Los colores llegan por parámetro, en la `Palette` de la piel activa, que vive
 * en el closure de `mount()`. Desde el 2026-08-15 esa piel trae además un rasgo
 * de dibujo, `glow`, y el radio de ese halo lo miden aquí `GLOW_BLUR` y
 * `GLOW_BLUR_TIGHT`: no hay una segunda geometría escondida —el `INSET`, la
 * celda y el radio del círculo de la fruta no cambian—, sólo el `shadowBlur` del
 * contexto mientras se pinta.
 */

import { glow, noGlow } from "@/lib/games";
import { CELL, COLS, ROWS } from "./constants";
import { randInt, type Cell } from "./math";
import type { Palette } from "./skins";
import { FRUITS, FRUIT_KEYS } from "./sprites";

export type Dir = "up" | "down" | "left" | "right";

const STEP: Readonly<Record<Dir, Cell>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Readonly<Record<Dir, Dir>> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

/** Margen de cada celda al pintarla, para que se distingan los segmentos. */
const INSET = 2;

/**
 * Radio del halo cuando la piel separa la cabeza del cuerpo por tinte: 8 px.
 *
 * Va **en píxeles** y no en fracción de la celda, al revés que el de Tetris y
 * como los de Asteroids y Arkanoid. Allí la celda cambiaba de tamaño entre el
 * tablero y la banda de la siguiente, y aquí `CELL` son 32 px fijos y nada se
 * escala. Y hay un motivo más fuerte para no atarlo a `CELL`: lo que el radio
 * tiene que medir no es la celda sino el **surco entre dos segmentos
 * contiguos**, que son los 4 px de `INSET * 2` y no dependen de la celda —si
 * mañana el inset subiera a 3, el surco cambiaría con `CELL` intacta—.
 *
 * Aquí ese surco se funde a propósito y el cuerpo se lee como un **tubo
 * continuo**: 8 px son el doble del surco, así que dos segmentos pegados se
 * unen. Fundirlos no esconde nada jugable —dos celdas contiguas ocupadas matan
 * las dos y no dejan paso entre ellas—, y el hueco que un jugador de Snake sí
 * lee es el de una **celda vacía**, que son 36 px de luz entre los dos rellenos
 * que la rodean: con 8 px por lado quedan 20 px de fondo intacto en el centro y
 * el paso se sigue viendo. Es además lo que hace un letrero de neón, que es un
 * tubo de gas y no una fila de cuadrados.
 */
const GLOW_BLUR = 8;

/**
 * El radio corto, para una piel que separa las entidades por brillo: 3 px.
 *
 * En una rampa monocroma la cabeza queda a un solo escalón del cuerpo —`#33ff33`
 * sobre `#22aa22`— y siempre tiene un segmento pegado, porque el segundo
 * eslabón nace en la celda de al lado. Con los 8 px de `neon` el aura del vivo
 * empuja ese segmento hacia arriba y la del cuerpo lame la cabeza, y ahí sí
 * habría choque de S3: **la cabeza es lo único que dice hacia dónde vas**, y en
 * monocromo lo único que la separa del cuerpo es el brillo, que es justo lo que
 * un halo largo funde. Con 3 px el sangrado muere dentro del surco de 4, la
 * cadena de segmentos aguanta y el escalón se lee. Es además lo físicamente
 * cierto y lo que ya cerró las tres rondas anteriores: un fósforo verde sangra
 * corto y un letrero de neón sangra amplio.
 */
const GLOW_BLUR_TIGHT = 3;

/**
 * Cuánto halo pide esta piel.
 *
 * **La piel dice si hay halo y el motor dice de cuánto**, que es la misma
 * frontera que ya rige el alfa. El motor mide mirando la paleta que tiene
 * delante y no el nombre de la piel —a `draw()` llega una `Palette` y nunca un
 * `SkinId`, así que ni podría—.
 *
 * Lo que mira es si **la cabeza y la fruta comparten color**, que es en esta
 * máquina el mismo indicador que las siete piezas de Tetris o los cinco
 * power-ups de Asteroids: Snake sólo tiene tres entidades de color, y una piel
 * que ha tenido que darle el mismo hex a las dos que persigue el jugador es una
 * piel que se quedó sin tintes libres, o sea una que separa por brillo. Una
 * cuarta piel monocroma se resolvería sola. La limitación conocida es la de
 * siempre: una piel que separase cabeza y fruta por tinte pero dejase la cabeza
 * a un escalón del cuerpo se llevaría el radio largo, y habría que revisarla.
 */
function glowSpread(p: Palette): number {
  return p.head === p.fruit ? GLOW_BLUR_TIGHT : GLOW_BLUR;
}

export class Snake {
  /** La cabeza es `cells[0]`. Coordenadas de rejilla, no de píxel. */
  cells: Cell[];
  dir: Dir;
  /** El giro pedido este tick; se aplica al avanzar y se limpia. */
  queued: Dir | null = null;
  /** Segmentos que faltan por añadir. Los pone `grow()` y los gasta `step()`. */
  private pending = 0;

  constructor(head: Cell, dir: Dir, length: number) {
    this.dir = dir;
    const back = STEP[OPPOSITE[dir]];
    this.cells = Array.from({ length }, (_, i) => ({
      x: head.x + back.x * i,
      y: head.y + back.y * i,
    }));
  }

  get head(): Cell {
    return this.cells[0];
  }

  /**
   * Encola un giro para el próximo paso, si es legal.
   *
   * Se compara contra `dir` —la dirección del último avance— y no contra el
   * giro ya encolado: entre dos ticks caben dos pulsaciones, y aplicarlas según
   * llegan permitiría girar a ↑ y de ahí a ← con el cuerpo aún tumbado a la
   * derecha, o sea media vuelta sobre el propio cuello.
   *
   * Solo cabe **un** giro por tick y gana el primero: el segundo se descarta en
   * vez de pisarlo, para que una pulsación válida nunca se pierda.
   */
  queue(dir: Dir): void {
    if (this.queued !== null) return;
    if (dir === this.dir || dir === OPPOSITE[this.dir]) return;
    this.queued = dir;
  }

  /** Alarga la serpiente un segmento, que aparece en el siguiente paso. */
  grow(): void {
    this.pending++;
  }

  /** Avanza una celda, aplicando el giro encolado y limpiándolo. */
  step(): void {
    if (this.queued !== null) {
      this.dir = this.queued;
      this.queued = null;
    }

    const delta = STEP[this.dir];
    this.cells.unshift({
      x: this.head.x + delta.x,
      y: this.head.y + delta.y,
    });

    if (this.pending > 0) this.pending--;
    else this.cells.pop();
  }

  /** La cabeza se ha salido del tablero. */
  hitsWall(): boolean {
    const { x, y } = this.head;
    return x < 0 || y < 0 || x >= COLS || y >= ROWS;
  }

  /** La cabeza ha caído sobre alguno de sus propios segmentos. */
  hitsSelf(): boolean {
    const { x, y } = this.head;
    return this.cells.some((cell, i) => i > 0 && cell.x === x && cell.y === y);
  }

  /**
   * Cabeza y cuerpo de distinto color, una celda con inset por segmento.
   *
   * Con `p.glow` cada segmento sale con halo **de su propio color**, así que la
   * cabeza ilumina en el suyo y el cuerpo en el suyo: es lo mismo que separa a
   * los dos en plano, sólo que también en el aura. El halo se enciende dentro
   * del bucle porque el color cambia en `i === 0`, y se suelta una sola vez al
   * salir, en esta misma función: `shadowColor` y `shadowBlur` son estado global
   * del contexto y lo que no se suelte lo hereda el frame siguiente.
   *
   * La geometría no se toca: el `INSET` sigue siendo 2 y el segmento 28 × 28 en
   * las tres pieles. Sin halo se pinta exactamente lo que se pintaba antes.
   */
  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    const size = CELL - INSET * 2;
    const blur = p.glow ? glowSpread(p) : 0;
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const cell = this.cells[i];
      const color = i === 0 ? p.head : p.body;
      ctx.fillStyle = color;
      if (p.glow) glow(ctx, color, blur);
      ctx.fillRect(cell.x * CELL + INSET, cell.y * CELL + INSET, size, size);
    }
    if (p.glow) noGlow(ctx);
  }
}

export class Fruit {
  x: number;
  y: number;
  /** Índice en `FRUIT_KEYS`, sorteado al colocarse. */
  kind: number;

  constructor(cell: Cell) {
    this.x = cell.x;
    this.y = cell.y;
    this.kind = randInt(FRUIT_KEYS.length);
  }

  /** Se muda a otra celda y vuelve a sortear qué fruta es. */
  place(cell: Cell): void {
    this.x = cell.x;
    this.y = cell.y;
    this.kind = randInt(FRUIT_KEYS.length);
  }

  /**
   * El sprite del atlas si el que llama lo da, y si no un círculo plano.
   *
   * `atlas` llega en `null` de dos maneras: porque la imagen aún no sirve —o no
   * servirá nunca— y porque la piel activa no lo usa. Las dos acaban en el mismo
   * camino, que es el que el motor ya tenía escrito.
   *
   * El recorte se escala **conservando su proporción** y centrado en la celda:
   * los 22 son verticales —110 × 160 la manzana, 170 × 160 el kiwi— y estirarlos
   * a 32 × 32 los deformaría todos.
   *
   * **El halo es sólo del círculo, nunca del atlas.** `drawImage` hereda el
   * `shadowBlur` del contexto igual que un `fillRect`, así que un aura encendida
   * aquí saldría pegada al recorte y eso es añadirle algo al asset, que es lo
   * que S7 prohíbe. Hoy no se puede dar —`clasico` es la única piel con atlas y
   * va sin halo—, pero tampoco se daría con una cuarta que juntara las dos
   * cosas: la rama del atlas no enciende nada y el contexto le llega limpio,
   * porque cada función suelta su halo antes de devolver.
   */
  draw(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement | null, p: Palette): void {
    const left = this.x * CELL;
    const top = this.y * CELL;

    if (atlas === null) {
      ctx.fillStyle = p.fruit;
      if (p.glow) glow(ctx, p.fruit, glowSpread(p));
      ctx.beginPath();
      ctx.arc(left + CELL / 2, top + CELL / 2, CELL * 0.35, 0, Math.PI * 2);
      ctx.fill();
      if (p.glow) noGlow(ctx);
      return;
    }

    const rect = FRUITS[FRUIT_KEYS[this.kind]];
    const scale = Math.min(CELL / rect.w, CELL / rect.h);
    const w = rect.w * scale;
    const h = rect.h * scale;

    ctx.drawImage(
      atlas,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      left + (CELL - w) / 2,
      top + (CELL - h) / 2,
      w,
      h,
    );
  }
}
