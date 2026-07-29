/**
 * Catálogo de máquinas del vault.
 *
 * Puerto literal de `GAMES` en references/templates/arcade-core.js: los ocho
 * ids, títulos, categorías, colores y textos se copian tal cual. Lo único que
 * cambia respecto al prototipo es el tipado y que `getGame()` devuelve
 * `undefined` en vez de la primera máquina cuando el id no existe.
 */

export type GameId =
  | "muro"
  | "serpiente"
  | "invasores"
  | "rocas"
  | "duelo"
  | "corredor"
  | "caida"
  | "laberinto";

export type GameCategory =
  | "ARCADE"
  | "CLASICOS"
  | "DISPAROS"
  | "REFLEJOS"
  | "PUZZLE"
  | "LABERINTO";

/** Los tres neones de `globals.css`: cada máquina se pinta con uno de ellos. */
export type GameGlow = "#00f5ff" | "#ff006e" | "#f5ff00";

export interface Game {
  id: GameId;
  /** Rótulo en mayúsculas sin tilde: Press Start 2P no tiene glifos acentuados. */
  title: string;
  cat: GameCategory;
  /** Color de acento de la máquina. */
  glow: GameGlow;
  /** `false` en las dos máquinas en mantenimiento (`caida`, `laberinto`). */
  playable: boolean;
  /** Una línea, para la tarjeta de la biblioteca. */
  desc: string;
  /** Párrafo de la ficha. */
  long: string;
  /** Línea de controles de la ficha. */
  controls: string;
}

export const GAMES: readonly Game[] = [
  {
    id: "muro",
    title: "MURO NEON",
    cat: "ARCADE",
    glow: "#00f5ff",
    playable: true,
    desc: "Rompe cada ladrillo sin perder la bola.",
    long: "Una pala, una bola y un muro de luz que no perdona. Cada nivel acelera la bola y reduce tu margen de error. Limpia la pantalla completa para pasar al siguiente muro.",
    controls: "Flechas ← → para mover la pala · ESPACIO para lanzar",
  },
  {
    id: "serpiente",
    title: "SERPIENTE 64",
    cat: "CLASICOS",
    glow: "#f5ff00",
    playable: true,
    desc: "Crece sin morder tu propia cola.",
    long: "El clásico de rejilla llevado al vault. Cada fruta suma diez puntos y un segmento más de cuerpo. La velocidad crece con tu longitud, así que la codicia se paga caro.",
    controls: "Flechas ← ↑ → ↓ para girar",
  },
  {
    id: "invasores",
    title: "INVASORES DEL VACIO",
    cat: "DISPAROS",
    glow: "#ff006e",
    playable: true,
    desc: "Defiende la última base orbital.",
    long: "Formaciones enemigas descienden en oleadas cada vez más rápidas. Dispara, esquiva y aguanta: cada oleada limpiada te da un nivel y una salva más agresiva en contra.",
    controls: "Flechas ← → para moverte · ESPACIO para disparar",
  },
  {
    id: "rocas",
    title: "CINTURON DE ROCAS",
    cat: "DISPAROS",
    glow: "#00f5ff",
    playable: true,
    desc: "Vuela entre asteroides y pulverízalos.",
    long: "Inercia real: la nave no frena sola. Los asteroides grandes se parten en fragmentos más rápidos, y el campo se repuebla en cuanto lo despejas. Tres vidas, ningún escudo.",
    controls: "Flechas ← → giran · ↑ empuja · ESPACIO dispara",
  },
  {
    id: "duelo",
    title: "DUELO DE PALAS",
    cat: "ARCADE",
    glow: "#f5ff00",
    playable: true,
    desc: "Uno contra la máquina, sin piedad.",
    long: "El duelo más antiguo del vault: dos palas, una bola y ningún sitio donde esconderse. La máquina aprende el ángulo de tu golpe y cada punto acelera el intercambio. Tres fallos y se apaga la mesa.",
    controls: "Flechas ↑ ↓ para mover tu pala",
  },
  {
    id: "corredor",
    title: "CORREDOR DE NEON",
    cat: "REFLEJOS",
    glow: "#ff006e",
    playable: true,
    desc: "Salta los bloques y no mires atrás.",
    long: "Una carrera infinita por una autopista de rejilla. Los bloques llegan cada vez más rápido y la distancia es tu única puntuación. Salta en el instante justo: el suelo no perdona dos veces.",
    controls: "ESPACIO o ↑ para saltar · ↓ para caer rápido",
  },
  {
    id: "caida",
    title: "CAIDA VERTICAL",
    cat: "PUZZLE",
    glow: "#ff006e",
    playable: false,
    desc: "Encaja las piezas antes de que se apilen.",
    long: "Piezas que caen, líneas que desaparecen y una velocidad que nunca baja. Máquina en mantenimiento: la ROM se está reescribiendo para el vault.",
    controls: "Pendiente de calibración",
  },
  {
    id: "laberinto",
    title: "LABERINTO GLOTON",
    cat: "LABERINTO",
    glow: "#f5ff00",
    playable: false,
    desc: "Recoge cada punto y esquiva a los guardianes.",
    long: "Pasillos cerrados, cuatro perseguidores y un cronómetro implacable. Máquina en mantenimiento: los guardianes aún no tienen rutas asignadas.",
    controls: "Pendiente de calibración",
  },
];

/**
 * Busca una máquina por id. Devuelve `undefined` si no existe, para que las
 * rutas dinámicas puedan responder 404 en lugar de servir otra máquina.
 */
export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

/**
 * El color de una máquina con transparencia, como el `tint()` del prototipo.
 * Los velos y halos de las tarjetas y la ficha se calculan con esto porque el
 * color no se conoce hasta el render y no puede salir de una clase estática.
 */
export function tint(hex: GameGlow, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
