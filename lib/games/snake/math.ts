/**
 * Las dos utilidades de Snake. Sin estado, sin `ctx` y sin nada del DOM: se leen
 * y se comprueban de un vistazo, que es justo lo que no se puede hacer con el
 * closure de `mount()`.
 */

/** Una celda de la rejilla. No son píxeles: van de `0` a `COLS-1` / `ROWS-1`. */
export interface Cell {
  x: number;
  y: number;
}

/** Entero al azar en `[0, n)`. */
export function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

/**
 * Una celda libre al azar del tablero `cols × rows`, o `null` si no queda
 * ninguna —el caso de la serpiente que ha llenado la pantalla, que con 500
 * celdas no llega a pasar, pero se devuelve en vez de girar en un bucle.
 *
 * El sorteo es uniforme entre las libres: se cuenta cuántas hay, se elige la
 * enésima y se recorre. Sortear al azar hasta acertar sería más corto y se
 * volvería lento justo cuando la serpiente es larga.
 */
export function pickFreeCell(occupied: readonly Cell[], cols: number, rows: number): Cell | null {
  const taken = new Set<number>();
  for (const cell of occupied) {
    if (cell.x >= 0 && cell.x < cols && cell.y >= 0 && cell.y < rows) {
      taken.add(cell.y * cols + cell.x);
    }
  }

  const free = cols * rows - taken.size;
  if (free <= 0) return null;

  let nth = randInt(free);
  for (let index = 0; index < cols * rows; index++) {
    if (taken.has(index)) continue;
    if (nth === 0) return { x: index % cols, y: Math.floor(index / cols) };
    nth--;
  }

  return null;
}
