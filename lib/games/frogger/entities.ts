/**
 * Las entidades del tablero de Frogger. Clases tipadas con el `ctx` siempre por
 * parámetro: ninguna lo lee de un módulo, porque el canvas llega a `mount()` y
 * montar dos veces tiene que dar dos partidas independientes.
 *
 * Ninguna guarda posiciones de sus entidades: un carril **calcula** dónde está
 * cada coche en el instante `t` con la fórmula de `positions()`, y por eso el
 * juego entero es una función del tiempo y de la ronda. Lo único que sí es
 * estado es la rana, que la mueve el jugador.
 */

import {
  CELL,
  COLOR_CAR,
  COLOR_FROG,
  COLOR_GATOR,
  COLOR_HOME,
  COLOR_LADY,
  COLOR_LOG,
  COLOR_TRUCK,
  COLOR_TURTLE,
  COLOR_TURTLE_DIVING,
  DIVE_CYCLE,
  DIVE_DOWN,
  DIVE_WARN,
  FLY_EVERY,
  FLY_LASTS,
  GATOR_CYCLE,
  GATOR_FROM,
  GATOR_OPEN,
  HIT_PAD,
  HOME_COLS,
  HOMES,
  LADY_EVERY,
  LADY_FROM,
  RIDE_PAD,
  ROW_HOMES,
  ROW_MEDIAN,
  SNAKE_SPEED,
  W,
} from "@/lib/games/frogger/constants";
import { cycleAt, overlap, wrapSpan } from "@/lib/games/frogger/math";
import type { LaneSpec } from "@/lib/games/frogger/lanes";

/** Un carril con sus entidades, todas del mismo tipo, largo y velocidad. */
export class Lane {
  readonly spec: LaneSpec;

  constructor(spec: LaneSpec) {
    this.spec = spec;
  }

  /** Alto en píxeles de la fila del carril. */
  get y(): number {
    return this.spec.row * CELL;
  }

  /** Largo de una entidad, en píxeles. */
  get width(): number {
    return this.spec.len * CELL;
  }

  /**
   * Longitud del ciclo: un poco más ancha que la pantalla, para que una entidad
   * termine de salir por un borde antes de volver a entrar por el otro.
   */
  private get span(): number {
    return W + this.width;
  }

  /**
   * Extremo izquierdo de cada entidad en el instante `t`, en píxeles.
   *
   * Las entidades se reparten el ciclo a partes iguales, así que un carril de
   * tres deja siempre dos huecos del mismo tamaño. El envolvimiento va por
   * `wrapSpan()` porque los carriles con `speed < 0` producen dividendo
   * negativo desde el primer segundo.
   */
  positions(t: number): number[] {
    const { count, offset, speed } = this.spec;
    const step = this.span / count;
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(wrapSpan(offset + i * step + speed * t, this.span) - this.width);
    }
    return out;
  }

  /**
   * ¿Está sumergida la entidad `i` en el instante `t`?
   *
   * Los grupos de un mismo carril desfasan su ciclo, porque si se sumergieran a
   * la vez el carril entero sería intransitable durante `DIVE_DOWN` segundos.
   */
  submerged(t: number, i: number): boolean {
    if (this.spec.kind !== "turtle" || !this.spec.dives) return false;
    return this.phase(t, i) > DIVE_CYCLE - DIVE_DOWN;
  }

  /** ¿Está a punto de sumergirse? Es el aviso que la convierte en decisión. */
  diving(t: number, i: number): boolean {
    if (this.spec.kind !== "turtle" || !this.spec.dives) return false;
    const phase = this.phase(t, i);
    return phase > DIVE_CYCLE - DIVE_DOWN - DIVE_WARN && phase <= DIVE_CYCLE - DIVE_DOWN;
  }

  private phase(t: number, i: number): number {
    return cycleAt(t + (i * DIVE_CYCLE) / this.spec.count, DIVE_CYCLE);
  }

  /**
   * ¿Atropella alguna entidad a una rana cuyo borde izquierdo está en `x`?
   *
   * Con `HIT_PAD` de margen a cada lado: rozar la esquina de un coche no mata.
   */
  hits(t: number, x: number): boolean {
    const body = CELL - 2 * HIT_PAD;
    return this.positions(t).some((pos) => overlap(x + HIT_PAD, body, pos, this.width));
  }

  /**
   * Extremo izquierdo de la plataforma **sólida** que sostiene a la rana, o
   * `null` si ahí no hay nada que la sostenga.
   *
   * Se apoya mientras la plataforma cubra algo de su franja central —`RIDE_PAD`
   * a cada lado—, que es la indulgencia simétrica a la que `hits()` da en la
   * carretera. Las dos existen porque el error que produce cada una es distinto:
   * en carretera la injusticia es morir sin tocar; en el río, ahogarse
   * pareciendo estar encima. Y aquí pasaba de verdad: entre que el salto dura
   * `HOP_MS` y que la plataforma deriva mientras la rana vuela, aterrizar con
   * medio cuerpo sobre el tronco dejaba el centro un píxel fuera.
   *
   * Una tortuga sumergida no cuenta, pero tampoco descarta al resto: se sigue
   * mirando por si hay otra plataforma debajo.
   */
  carrier(t: number, x: number): number | null {
    const positions = this.positions(t);
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (!overlap(x + RIDE_PAD, CELL - 2 * RIDE_PAD, pos, this.width)) continue;
      if (this.spec.kind === "turtle" && this.submerged(t, i)) continue;
      return pos;
    }
    return null;
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const positions = this.positions(t);
    for (let i = 0; i < positions.length; i++) {
      const x = positions[i];
      switch (this.spec.kind) {
        case "car":
          this.drawCar(ctx, x);
          break;
        case "truck":
          this.drawTruck(ctx, x);
          break;
        case "log":
          this.drawLog(ctx, x);
          break;
        case "turtle":
          this.drawTurtles(ctx, x, t, i);
          break;
      }
    }
  }

  private drawCar(ctx: CanvasRenderingContext2D, x: number): void {
    const y = this.y;
    ctx.fillStyle = COLOR_CAR;
    ctx.fillRect(x + 3, y + 8, this.width - 6, CELL - 16);
    // Morro, para que se vea hacia dónde va.
    const nose = this.spec.speed >= 0 ? x + this.width - 8 : x + 3;
    ctx.fillRect(nose, y + 13, 5, CELL - 26);
  }

  private drawTruck(ctx: CanvasRenderingContext2D, x: number): void {
    const y = this.y;
    const forward = this.spec.speed >= 0;
    ctx.fillStyle = COLOR_TRUCK;
    // Caja.
    const boxX = forward ? x + 3 : x + CELL - 3;
    ctx.fillRect(boxX, y + 6, this.width - CELL, CELL - 12);
    // Cabina, un poco más baja.
    const cabX = forward ? x + this.width - CELL + 2 : x + 4;
    ctx.fillStyle = COLOR_CAR;
    ctx.fillRect(cabX, y + 10, CELL - 6, CELL - 20);
  }

  private drawLog(ctx: CanvasRenderingContext2D, x: number): void {
    const y = this.y;
    ctx.fillStyle = COLOR_LOG;
    ctx.fillRect(x, y + 6, this.width, CELL - 12);
    // Vetas: una raya por celda, para que se lea el arrastre.
    ctx.fillStyle = "rgba(10,10,15,0.35)";
    for (let c = 1; c < this.spec.len; c++) {
      ctx.fillRect(x + c * CELL - 1, y + 8, 2, CELL - 16);
    }
  }

  private drawTurtles(ctx: CanvasRenderingContext2D, x: number, t: number, i: number): void {
    const y = this.y;
    const down = this.submerged(t, i);
    const warning = this.diving(t, i);
    ctx.fillStyle = down || warning ? COLOR_TURTLE_DIVING : COLOR_TURTLE;
    for (let c = 0; c < this.spec.len; c++) {
      const cx = x + c * CELL + CELL / 2;
      const cy = y + CELL / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL / 2 - 6, 0, Math.PI * 2);
      ctx.fill();
      if (down) continue;
      // Cabeza, sólo mientras sostiene: es la señal de que se puede pisar.
      ctx.beginPath();
      ctx.arc(cx + (this.spec.speed >= 0 ? 11 : -11), cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** El salto en curso: de dónde sale, a dónde va y cuánto lleva recorrido. */
export interface Hop {
  fromX: number;
  fromRow: number;
  toX: number;
  toRow: number;
  /** Progreso de 0 a 1. */
  k: number;
}

export class Frog {
  /** Píxel continuo del borde izquierdo: la plataforma la arrastra. */
  x: number;
  row: number;
  /** Fila más alta alcanzada en esta travesía; base de los puntos por avance. */
  best: number;
  /** Salto en curso, o `null` si está quieta. */
  hop: Hop | null = null;
  /** ¿Lleva la dama-rana encima? Vale `POINTS_LADY` al llegar a casa. */
  escorting = false;

  constructor(x: number, row: number) {
    this.x = x;
    this.row = row;
    this.best = row;
  }

  /**
   * Cuadra la rana a la celda más cercana, sin salirse del tablero.
   *
   * Hace falta porque en el río la arrastra la plataforma y su `x` deja de ser
   * múltiplo de `CELL`: un salto que partiera de ahí heredaría el desfase para
   * el resto de la travesía.
   */
  snap(): void {
    const col = Math.round(this.x / CELL);
    this.x = Math.min(Math.max(col, 0), W / CELL - 1) * CELL;
  }

  /** Dónde se pinta ahora mismo: durante un salto, entre origen y destino. */
  viewX(): number {
    if (!this.hop) return this.x;
    return this.hop.fromX + (this.hop.toX - this.hop.fromX) * this.hop.k;
  }

  viewY(): number {
    if (!this.hop) return this.row * CELL;
    return (this.hop.fromRow + (this.hop.toRow - this.hop.fromRow) * this.hop.k) * CELL;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.viewX();
    const y = this.viewY();
    // A media zancada la rana se agranda: es lo que da lectura al salto.
    const lift = this.hop ? Math.sin(this.hop.k * Math.PI) * 3 : 0;
    const pad = 7 - lift;

    ctx.fillStyle = COLOR_FROG;
    ctx.beginPath();
    ctx.ellipse(x + CELL / 2, y + CELL / 2, CELL / 2 - pad, CELL / 2 - pad - 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Patas traseras, abiertas mientras salta.
    const legs = 4 + lift * 2;
    ctx.fillRect(x + 4, y + CELL / 2 + legs - 2, 6, 3);
    ctx.fillRect(x + CELL - 10, y + CELL / 2 + legs - 2, 6, 3);

    // Ojos.
    ctx.fillStyle = "#0a0a0f";
    ctx.beginPath();
    ctx.arc(x + CELL / 2 - 5, y + CELL / 2 - 5, 2.5, 0, Math.PI * 2);
    ctx.arc(x + CELL / 2 + 5, y + CELL / 2 - 5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // La dama-rana viaja como un punto encima, no como una entidad que sigue.
    if (this.escorting) {
      ctx.fillStyle = COLOR_LADY;
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Los cinco nichos de la orilla de arriba, con el cocodrilo y la mosca.
 *
 * Cuál de los cinco toca no se sortea: sale del número de ciclo y de la ronda,
 * así que dos partidas de la misma ronda ven lo mismo en el mismo segundo. Una
 * casa que se cerrara sin motivo aparente parecería un bug, y es justo el sitio
 * donde el azar tentaría más.
 */
export class Homes {
  /** Los cinco nichos: `true` si ya tienen rana. */
  filled: boolean[] = Array.from({ length: HOMES }, () => false);

  /** Píxel del borde izquierdo del nicho `i`. */
  static x(i: number): number {
    return HOME_COLS[i] * CELL;
  }

  get y(): number {
    return ROW_HOMES * CELL;
  }

  /** ¿En qué nicho cae el centro de una rana con el borde izquierdo en `x`? */
  indexAt(x: number): number | null {
    const center = x + CELL / 2;
    for (let i = 0; i < HOMES; i++) {
      const left = Homes.x(i);
      if (center >= left && center < left + CELL) return i;
    }
    return null;
  }

  /** ¿Están los cinco ocupados? */
  get complete(): boolean {
    return this.filled.every(Boolean);
  }

  reset(): void {
    this.filled = this.filled.map(() => false);
  }

  /**
   * Índice del nicho con cocodrilo ahora mismo, o `null`.
   *
   * Asoma los `GATOR_OPEN` primeros segundos de cada ciclo de `GATOR_CYCLE`, y
   * nunca en un nicho que ya tiene rana: ahí no cabe.
   */
  gatorAt(t: number, round: number): number | null {
    if (round < GATOR_FROM) return null;
    if (cycleAt(t, GATOR_CYCLE) > GATOR_OPEN) return null;
    const i = (Math.floor(t / GATOR_CYCLE) + round) % HOMES;
    return this.filled[i] ? null : i;
  }

  /**
   * Índice del nicho con mosca ahora mismo, o `null`. Sale desde la ronda 1: es
   * la recompensa, no el castigo, y no hay ninguna `*_FROM` que la retrase.
   */
  flyAt(t: number, round: number): number | null {
    if (cycleAt(t, FLY_EVERY) > FLY_LASTS) return null;
    const i = (Math.floor(t / FLY_EVERY) + round) % HOMES;
    if (this.filled[i]) return null;
    // Nunca en el mismo nicho que el cocodrilo: sería un cebo imposible.
    return this.gatorAt(t, round) === i ? null : i;
  }

  draw(ctx: CanvasRenderingContext2D, t: number, round: number): void {
    const gator = this.gatorAt(t, round);
    const fly = this.flyAt(t, round);
    const y = this.y;

    for (let i = 0; i < HOMES; i++) {
      const x = Homes.x(i);

      ctx.strokeStyle = COLOR_HOME;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 4, CELL - 4, CELL - 8);

      if (this.filled[i]) {
        ctx.fillStyle = COLOR_FROG;
        ctx.beginPath();
        ctx.ellipse(x + CELL / 2, y + CELL / 2, CELL / 2 - 9, CELL / 2 - 11, 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      if (gator === i) this.drawGator(ctx, x, y);
      if (fly === i) this.drawFly(ctx, x, y, t);
    }
  }

  private drawGator(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = COLOR_GATOR;
    // Dos triángulos: el hocico abierto asomando por el fondo del nicho.
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 14);
    ctx.lineTo(x + CELL - 7, y + 18);
    ctx.lineTo(x + 7, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 26);
    ctx.lineTo(x + CELL - 7, y + 24);
    ctx.lineTo(x + 7, y + 32);
    ctx.closePath();
    ctx.fill();
    // Dientes.
    ctx.fillStyle = "#0a0a0f";
    for (let d = 0; d < 4; d++) {
      ctx.fillRect(x + 10 + d * 6, y + 20, 2, 4);
    }
  }

  private drawFly(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    // Parpadea: es lo que la distingue de un adorno del nicho.
    if (cycleAt(t, 0.6) > 0.4) return;
    ctx.fillStyle = COLOR_LADY;
    ctx.beginPath();
    ctx.arc(x + CELL / 2, y + CELL / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + CELL / 2 - 8, y + CELL / 2 - 5, 5, 2);
    ctx.fillRect(x + CELL / 2 + 3, y + CELL / 2 - 5, 5, 2);
  }
}

/**
 * La serpiente que patrulla la mediana desde `SNAKE_FROM`.
 *
 * Es la única entidad del tablero con estado propio en vez de una función del
 * tiempo: rebota, y un rebote depende de dónde venía.
 */
export class Snake {
  x: number;
  dir: 1 | -1 = 1;

  constructor(x: number) {
    this.x = x;
  }

  get y(): number {
    return ROW_MEDIAN * CELL;
  }

  update(dt: number, mult: number): void {
    this.x += SNAKE_SPEED * mult * this.dir * dt;
    if (this.x <= 0) {
      this.x = 0;
      this.dir = 1;
    } else if (this.x >= W - CELL) {
      this.x = W - CELL;
      this.dir = -1;
    }
  }

  /** Con la misma indulgencia que un coche: rozarla no mata. */
  hits(x: number): boolean {
    return overlap(x + HIT_PAD, CELL - 2 * HIT_PAD, this.x, CELL);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const y = this.y;
    ctx.fillStyle = COLOR_GATOR;
    // Cuerpo ondulado: cuatro tramos que alternan de altura.
    for (let s = 0; s < 4; s++) {
      const sx = this.x + s * 10;
      const sy = y + (s % 2 === 0 ? 15 : 20);
      ctx.fillRect(sx, sy, 10, 6);
    }
    // Cabeza, en el sentido de la marcha.
    const hx = this.dir === 1 ? this.x + CELL - 6 : this.x;
    ctx.fillRect(hx, y + 14, 6, 8);
  }
}

/**
 * La dama-rana, esperando sobre una plataforma del río.
 *
 * Se implementa como una bandera en la rana —`escorting`— y no como una entidad
 * que la sigue: es una línea de estado en vez de un sistema, y visualmente basta
 * con un punto encima.
 */
export class Bonus {
  /** ¿Está ahora mismo en el tablero? */
  active = false;
  /** Píxel del borde izquierdo, ya centrado sobre su plataforma. */
  laneX = 0;
  /** Fila del carril que la lleva, en píxeles. */
  laneY = 0;

  /** Ciclo de `LADY_EVERY` que se está sirviendo, y si ya se gastó. */
  private cycle = -1;
  private spent = false;

  /**
   * Sigue a la plataforma que le tocó este ciclo.
   *
   * Aparece cuando esa plataforma entra entera en pantalla y se va con ella:
   * una sola aparición por ciclo, sin más temporizador que la geometría del
   * carril.
   */
  update(t: number, round: number, lane: Lane): void {
    if (round < LADY_FROM) {
      this.active = false;
      return;
    }

    const cycle = Math.floor(t / LADY_EVERY);
    if (cycle !== this.cycle) {
      this.cycle = cycle;
      this.spent = false;
      this.active = false;
    }
    if (this.spent) return;

    const i = (cycle + round) % lane.spec.count;
    const x = lane.positions(t)[i];
    const visible = x >= 0 && x + lane.width <= W;

    if (visible) {
      this.active = true;
      this.laneX = x + lane.width / 2 - CELL / 2;
      this.laneY = lane.y;
    } else if (this.active) {
      // Se fue montada en su plataforma: hasta el ciclo siguiente.
      this.active = false;
      this.spent = true;
    }
  }

  /** La recoge la rana: se apaga hasta el ciclo siguiente. */
  take(): void {
    this.active = false;
    this.spent = true;
  }

  reset(): void {
    this.active = false;
    this.spent = false;
    this.cycle = -1;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const x = this.laneX;
    const y = this.laneY;

    ctx.fillStyle = COLOR_LADY;
    ctx.beginPath();
    ctx.ellipse(x + CELL / 2, y + CELL / 2, CELL / 2 - 9, CELL / 2 - 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0a0a0f";
    ctx.beginPath();
    ctx.arc(x + CELL / 2 - 4, y + CELL / 2 - 4, 2, 0, Math.PI * 2);
    ctx.arc(x + CELL / 2 + 4, y + CELL / 2 - 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
