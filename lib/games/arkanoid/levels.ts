/**
 * Construcción de la rejilla de bloques de un nivel.
 *
 * Ocupa el hueco que en Asteroids ocupa `math.ts`: Arkanoid no tiene geometría
 * continua que abstraer, tiene una rejilla que construir.
 *
 * Las dos funciones son puras respecto al módulo: `buildLevel()` devuelve un
 * array nuevo en vez de mutar uno de ámbito de módulo, y `remainingBlocks()`
 * recibe el array por parámetro. En el original las dos leían el mismo
 * `export const blocks` global, que aquí no puede existir: el estado de partida
 * vive dentro del closure de `mount()`.
 */

import {
  BLOCK_H,
  COLOR_MAP,
  GAP_X,
  GAP_Y,
  HP_COLOR,
  LEVELS,
  SIDE_MARGIN,
  TOP_MARGIN,
  UNBREAKABLE_LETTER,
  WORLD,
} from "./constants";

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Nombre de color CSS: "red" | "yellow" | "cyan" | … */
  color: string;
  /** Golpes que le quedan. */
  hp: number;
  /** Golpes con los que nació. El desgaste se dibuja con `hp / maxHp`. */
  maxHp: number;
  /** Los grises rebotan, no se rompen y no cuentan para despejar. */
  breakable: boolean;
  alive: boolean;
}

/**
 * Construye los bloques del nivel `index`. Devuelve un array vacío si el índice
 * se sale de `LEVELS`, que es lo que hacía el original.
 */
export function buildLevel(index: number): Block[] {
  const blocks: Block[] = [];

  const level = LEVELS[index];
  if (!level) return blocks;

  const rows = level.rows;
  const cols = Math.max(...rows.map((r) => r.length));

  const usableW = WORLD.width - SIDE_MARGIN * 2;
  const blockW = (usableW - GAP_X * (cols - 1)) / cols;

  for (let row = 0; row < rows.length; row++) {
    const line = rows[row];
    for (let col = 0; col < line.length; col++) {
      const cell = line[col];
      if (cell === ".") continue; // hueco

      // Resuelve color, golpes (hp/maxHp) y si es rompible según el tipo de celda.
      let color: string | undefined;
      let hp: number;
      let breakable: boolean;

      if (cell === UNBREAKABLE_LETTER) {
        // Gris irrompible: la bola rebota, nunca se rompe ni cuenta para despejar.
        color = COLOR_MAP[cell];
        hp = 1;
        breakable = false;
      } else if (HP_COLOR[cell]) {
        // Multi-golpe: el dígito indica los golpes; color exclusivo por HP.
        color = HP_COLOR[cell];
        hp = Number(cell);
        breakable = true;
      } else {
        // Bloque de un golpe de siempre (letra de color).
        color = COLOR_MAP[cell];
        hp = 1;
        breakable = true;
      }

      if (!color) continue; // celda desconocida → ignorar

      blocks.push({
        x: SIDE_MARGIN + col * (blockW + GAP_X),
        y: TOP_MARGIN + row * (BLOCK_H + GAP_Y),
        w: blockW,
        h: BLOCK_H,
        color,
        alive: true,
        hp,
        maxHp: hp,
        breakable,
      });
    }
  }

  return blocks;
}

/**
 * Nº de bloques **rompibles** vivos que quedan. Los irrompibles no cuentan: el
 * nivel se despeja aunque los grises sigan en pantalla.
 */
export function remainingBlocks(blocks: readonly Block[]): number {
  let n = 0;
  for (const b of blocks) if (b.alive && b.breakable) n++;
  return n;
}
