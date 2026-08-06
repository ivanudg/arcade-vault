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
 */

import { CELL, COLOR_BODY, COLOR_FRUIT_FALLBACK, COLOR_HEAD, COLS, ROWS } from "./constants";
import { randInt, type Cell } from "./math";
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

  /** Cuerpo cian y cabeza amarilla, una celda con inset por segmento. */
  draw(ctx: CanvasRenderingContext2D): void {
    const size = CELL - INSET * 2;
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const cell = this.cells[i];
      ctx.fillStyle = i === 0 ? COLOR_HEAD : COLOR_BODY;
      ctx.fillRect(cell.x * CELL + INSET, cell.y * CELL + INSET, size, size);
    }
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
   * El sprite del atlas si ya sirve, y si no un círculo magenta.
   *
   * El recorte se escala **conservando su proporción** y centrado en la celda:
   * los 22 son verticales —110 × 160 la manzana, 170 × 160 el kiwi— y estirarlos
   * a 32 × 32 los deformaría todos.
   */
  draw(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement | null): void {
    const left = this.x * CELL;
    const top = this.y * CELL;

    if (atlas === null) {
      ctx.fillStyle = COLOR_FRUIT_FALLBACK;
      ctx.beginPath();
      ctx.arc(left + CELL / 2, top + CELL / 2, CELL * 0.35, 0, Math.PI * 2);
      ctx.fill();
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
