// Construcción de los bloques del nivel a partir de LEVELS[game.levelIndex].
// Un bloque: { x, y, w, h, color, alive }. color = nombre del spritesheet (COLOR_MAP).

import { WORLD, LEVELS, COLOR_MAP, HP_COLOR, UNBREAKABLE_LETTER } from "./config.js";
import { clearExplosions } from "./explosions.js";

// Geometría de la rejilla (mundo lógico).
const SIDE_MARGIN = 40; // margen izq/der del área de bloques
const TOP_MARGIN = 60; // separación desde el techo
const GAP_X = 6; // hueco horizontal entre bloques
const GAP_Y = 6; // hueco vertical entre bloques
const BLOCK_H = 24; // alto de cada bloque

// Array de bloques del nivel actual (mutado por buildLevel).
export const blocks = [];

// Rellena `blocks` con la rejilla del nivel `index`. Vacía la anterior.
export function buildLevel(index) {
  blocks.length = 0;
  clearExplosions(); // no arrastrar explosiones del nivel anterior

  const level = LEVELS[index];
  if (!level) return blocks;

  const rows = level.rows;
  const cols = Math.max(...rows.map((r) => r.length));

  const usableW = WORLD.w - SIDE_MARGIN * 2;
  const blockW = (usableW - GAP_X * (cols - 1)) / cols;

  for (let row = 0; row < rows.length; row++) {
    const line = rows[row];
    for (let col = 0; col < line.length; col++) {
      const cell = line[col];
      if (cell === ".") continue; // hueco

      // Resuelve color, golpes (hp/maxHp) y si es rompible según el tipo de celda.
      let color;
      let hp;
      let breakable;

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
        // Bloque de 1 golpe de siempre (letra de color).
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

// Nº de bloques ROMPIBLES vivos restantes (útil para la progresión de nivel).
// Los irrompibles (gris) no cuentan: el nivel se despeja aunque sigan en pantalla.
export function remainingBlocks() {
  let n = 0;
  for (const b of blocks) if (b.alive && b.breakable) n++;
  return n;
}
