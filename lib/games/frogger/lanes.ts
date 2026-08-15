/**
 * Los diez carriles del tablero y su progresión por ronda.
 *
 * Existe como archivo aparte de `constants.ts` porque la tabla de carriles dejó
 * de ser un dato para ser una función de la ronda, y meter esa función entre las
 * constantes mezclaría datos con lógica.
 *
 * `BASE_LANES` es la ronda 1 y no se toca nunca: `lanesForRound()` es pura y
 * devuelve copias. Si mutara la tabla base, a partir de la ronda 2 el juego
 * aceleraría dos veces por ronda y sería un bug de los que no se ven hasta que
 * alguien llega lejos.
 */

import { DIVERS_FROM, SPEED_MAX, SPEED_STEP, TRUCKS_FROM } from "@/lib/games/frogger/constants";

export type LaneKind = "car" | "truck" | "log" | "turtle";

export interface LaneSpec {
  row: number;
  kind: LaneKind;
  count: number;
  /** Largo de cada entidad, en celdas. */
  len: number;
  /** Píxeles por segundo en la ronda 1. Negativo = hacia la izquierda. */
  speed: number;
  /** Desfase inicial en píxeles, para que los carriles no salgan alineados. */
  offset: number;
  /** Sólo `turtle`: si el grupo se sumerge. Se activa desde `DIVERS_FROM`. */
  dives?: boolean;
}

/**
 * Las diez filas con carril. La mediana (6) y las dos orillas (0 y 12) no
 * tienen: son las tres franjas donde la rana está a salvo del tráfico.
 */
export const BASE_LANES: readonly LaneSpec[] = [
  // Río, de la orilla de arriba a la de abajo.
  { row: 1, kind: "log", count: 3, len: 3, speed: -95, offset: 60 },
  { row: 2, kind: "turtle", count: 3, len: 3, speed: 130, offset: 150, dives: true },
  { row: 3, kind: "log", count: 3, len: 2, speed: -85, offset: 240 },
  { row: 4, kind: "log", count: 3, len: 3, speed: 100, offset: 120 },
  { row: 5, kind: "turtle", count: 4, len: 2, speed: -70, offset: 30, dives: false },
  // Carretera, de la mediana hacia la acera de salida.
  { row: 7, kind: "car", count: 3, len: 1, speed: 140, offset: 210 },
  { row: 8, kind: "truck", count: 2, len: 2, speed: -160, offset: 30 },
  { row: 9, kind: "car", count: 3, len: 1, speed: 100, offset: 180 },
  { row: 10, kind: "car", count: 3, len: 1, speed: -120, offset: 90 },
  { row: 11, kind: "car", count: 4, len: 1, speed: 80, offset: 0 },
];

/**
 * La tabla de carriles de la ronda `round`, que empieza en 1.
 *
 * Hace exactamente tres cosas y ninguna más: acelera, decide si hay camiones y
 * decide si las tortugas se sumergen. Así la ronda 1 es la travesía limpia
 * —coches iguales, plataformas que no traicionan— y a partir de la 2 el tablero
 * empieza a mentir.
 *
 * Es pura: no lee ni escribe nada de fuera y `BASE_LANES` sigue intacta después
 * de llamarla las veces que sea.
 */
export function lanesForRound(round: number): LaneSpec[] {
  const mult = Math.min(SPEED_STEP ** (round - 1), SPEED_MAX);
  const trucks = round >= TRUCKS_FROM;
  const divers = round >= DIVERS_FROM;

  return BASE_LANES.map((lane) => {
    const next: LaneSpec = { ...lane, speed: lane.speed * mult };

    // Sin camiones todavía: el carril existe igual, pero con coches de una celda.
    if (next.kind === "truck" && !trucks) {
      next.kind = "car";
      next.len = 1;
    }

    // Sin buceadoras todavía: las tortugas están, pero no traicionan.
    if (next.kind === "turtle" && !divers) {
      next.dives = false;
    }

    return next;
  });
}
