/**
 * Textos y acentos de la portada.
 *
 * Puerto de los literales incrustados en `references/templates/home-about/home.jsx`.
 * Viven aquí para que un retoque editorial no obligue a abrir la maquetación.
 *
 * Dos reglas heredadas del resto del proyecto:
 * - Lo que se pinta en Press Start 2P va en mayúsculas y **sin tildes**: la
 *   fuente no tiene glifos acentuados, igual que en `lib/games.ts`.
 * - Los cuerpos de texto van en Courier Prime y sí llevan su acentuación.
 */

/**
 * Los cuatro acentos permitidos en la portada: los tres neones del vault más
 * `--av-amber`. No hay verde ni morado; los cinco colores del template ajenos
 * a la paleta se descartaron en la spec.
 *
 * Nunca se interpola en un nombre de clase: cada componente declara un
 * `Record<Accent, string>` con las clases completas, porque Tailwind sólo ve
 * las cadenas escritas enteras en el código.
 */
export type Accent = "cyan" | "magenta" | "yellow" | "amber";

export interface Feature {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  /** Press Start 2P: mayúsculas sin tildes. */
  title: string;
  desc: string;
  accent: Accent;
}

export interface Stat {
  /** La cifra grande: `'8'`, `'MILES'`, `'GLOBAL'`. */
  value: string;
  /** Press Start 2P: mayúsculas sin tildes. */
  unit: string;
  note: string;
}

export interface FaqItem {
  /** Press Start 2P: mayúsculas sin tildes. */
  q: string;
  a: string;
}

/** Las cuatro ventajas de «¿por qué Arcade Vault?». */
export const FEATURES: readonly Feature[] = [
  {
    icon: "GAMEPAD",
    title: "JUEGOS CLASICOS",
    // Sólo se nombra lo que está en `GAMES`: SPEC 07 quitó de aquí a Arkanoid y
    // a Tetris, que volvieron al entrar con motor —Tetris en SPEC 08, Arkanoid
    // en SPEC 09, y Snake llegó en SPEC 10—. Ninguna promesa de máquina que no
    // esté en el catálogo.
    desc: "Asteroids, Tetris, Arkanoid y Snake, cuatro clásicos enteros y jugables en el navegador. Sin descargas ni emuladores.",
    accent: "cyan",
  },
  {
    icon: "FREE",
    title: "100% GRATIS",
    desc: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.",
    accent: "yellow",
  },
  {
    icon: "TROPHY",
    title: "TABLAS DE RECORDS",
    desc: "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.",
    accent: "magenta",
  },
  {
    icon: "ROCKET",
    title: "SIEMPRE CRECIENDO",
    desc: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.",
    accent: "amber",
  },
];

/**
 * Las tres cifras de la franja. La primera decía `9 JUEGOS Y CONTANDO` desde
 * `GAMES.length`, que con el catálogo de SPEC 07 habría quedado en un absurdo
 * `1 JUEGOS`. Sigue escrita a mano, y se actualiza con cada máquina que entra:
 * presumir de las que se juegan de verdad es más honesto que presumir de nueve
 * que no.
 */
export const STATS: readonly Stat[] = [
  { value: "4", unit: "MAQUINAS", note: "JUGABLES DE VERDAD" },
  { value: "MILES", unit: "DE PARTIDAS", note: "JUGADAS CADA DÍA" },
  { value: "GLOBAL", unit: "RANKING", note: "COMPITE CON EL MUNDO" },
];

/** Las tres preguntas que acompañan a la tarjeta de precios. */
export const FAQ: readonly FaqItem[] = [
  {
    q: "¿REALMENTE ES GRATIS?",
    a: 'Sí. Arcade Vault es un proyecto sin fines de lucro hecho por amor a los clásicos. No hay versión "premium" escondida.',
  },
  {
    q: "¿NECESITO CREAR CUENTA?",
    a: "No. Puedes jugar como invitado. Si quieres guardar tu puntuación y aparecer en el ranking, regístrate en 10 segundos.",
  },
  {
    q: "¿COMO SOBREVIVEN SIN COBRAR?",
    a: "Es un proyecto comunitario. Si te gusta, compártelo. Esa es toda la moneda que aceptamos.",
  },
];

/** El plan único. Las ventajas van sin viñeta: el ✔ lo pone la maquetación. */
export const PLAN = {
  label: "PLAN UNICO",
  name: "JUGADOR VAULT",
  amount: "$0",
  unit: "/ SIEMPRE",
  // El template dice «SIN LETRA PEQUEÑA», pero Press Start 2P no tiene Ñ y el
  // navegador la sustituye por un glifo de otra fuente que rompe el renglón.
  tag: "SIN TRUCOS · SIN PAGOS OCULTOS",
  perks: [
    "Acceso a todos los juegos",
    "Ranking global y salón de la fama",
    "Sin anuncios entre partidas",
    "Guarda tus puntuaciones",
    "Nuevos juegos cada mes",
    "Funciona en cualquier navegador",
  ],
  foot: "No pedimos tarjeta. Nunca lo haremos.",
} as const satisfies {
  label: string;
  name: string;
  amount: string;
  unit: string;
  tag: string;
  perks: readonly string[];
  foot: string;
};
