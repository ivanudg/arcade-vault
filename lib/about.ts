/**
 * Textos y acentos de la pantalla «Acerca de».
 *
 * Puerto de los literales incrustados en `references/templates/home-about/about.jsx`.
 * Viven aquí por el mismo motivo que los de `lib/landing.ts`: un retoque
 * editorial no debería obligar a abrir la maquetación.
 *
 * Las dos reglas de siempre:
 * - Lo que se pinta en Press Start 2P va en mayúsculas y **sin tildes**: la
 *   fuente no tiene glifos acentuados y el navegador los sustituye por otra
 *   que sale como una mota. El único signo no ASCII admitido es `·`.
 * - Los cuerpos de texto van en Courier Prime y sí llevan su acentuación.
 *
 * Las líneas del terminal también son ASCII: son la salida simulada de una
 * consola, y ahí un `…` o una tilde delatan que no lo es.
 */

import type { Accent } from "@/lib/landing";

/** Una de las tres tarjetas destacadas de la misión. */
export interface Highlight {
  icon: "HEART" | "BROWSER" | "PLANT";
  /** Press Start 2P: mayúsculas sin tildes. */
  text: string;
  accent: Accent;
}

/** Un aviso con LED de la columna de contacto. */
export interface ContactTip {
  /** Press Start 2P: mayúsculas sin tildes. */
  text: string;
  accent: Accent;
}

/** El párrafo de misión, bajo el titular. Courier Prime: va acentuado. */
export const MISSION =
  "Arcade Vault nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar los arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar y sin costo.";

/**
 * Las tres tarjetas destacadas. El verde del template se descartó en SPEC 02,
 * así que la tercera toma ámbar. El `❤️` de la primera se cae: el icono de esa
 * misma fila ya es un corazón de píxeles.
 */
export const HIGHLIGHTS: readonly Highlight[] = [
  {
    icon: "HEART",
    text: "HECHO POR JUGADORES, PARA JUGADORES",
    accent: "magenta",
  },
  {
    icon: "BROWSER",
    text: "JUEGOS EN HTML · CORREN EN CUALQUIER NAVEGADOR",
    accent: "cyan",
  },
  {
    icon: "PLANT",
    text: "PROYECTO EN CONSTANTE CRECIMIENTO",
    accent: "amber",
  },
];

/** El subtítulo de la columna de contacto. Courier Prime: va acentuado. */
export const CONTACT_INTRO =
  "¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar? Escríbenos.";

/** Los tres avisos con LED, bajo el subtítulo. */
export const CONTACT_TIPS: readonly ContactTip[] = [
  { text: "RESPUESTA EN 24-48H", accent: "cyan" },
  { text: "SUGERENCIAS BIENVENIDAS", accent: "yellow" },
  { text: "SIN SPAM, JAMAS", accent: "magenta" },
];

/**
 * Las líneas del terminal de éxito, en el orden en que se pintan. El renglón
 * del prompt y el remate con el nombre los pone la maquetación: uno es fijo y
 * el otro lleva un dato interpolado.
 */
export const TERMINAL_OK: readonly string[] = [
  "[OK] Conectando con servidor...",
  "[OK] Validando contenido...",
  "[OK] Transmitiendo paquete...",
];

/** Las del terminal de error: se conecta, y ahí se cae. */
export const TERMINAL_FAIL: readonly string[] = [
  "[OK] Conectando con servidor...",
  "[ERR] Transmision rechazada",
];

/**
 * Topes de longitud de los tres campos. Los comparten el `maxLength` del
 * campo y la Server Action, que vuelve a comprobarlos porque es una URL
 * pública a la que se puede llamar sin pasar por el formulario.
 */
export const LIMITS = { name: 80, email: 120, message: 2000 } as const;
