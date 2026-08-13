/**
 * Vocabulario de las pieles de las máquinas del vault.
 *
 * Una piel es la paleta del canvas de un motor, y no hereda nada del tema del
 * sitio: el sitio sigue siendo dark-only y estas tres sólo cambian lo que se
 * pinta dentro de la pantalla del gabinete.
 *
 * El sistema es **aditivo y opcional** a propósito. `GameMount.skins` y
 * `GameHandle.setSkin()` son campos opcionales del contrato, así que las
 * máquinas se visten de una en una sin romper las que aún no lo están, y
 * `mount()` no cambia de firma. El default es `clasico` —los colores que cada
 * motor ya tenía—, o sea que estrenar esto no cambia el aspecto de ninguna
 * partida hasta que alguien elija otra cosa en el selector.
 *
 * Las tres son obligatorias para toda máquina con entrada en `ENGINES`:
 * `clasico` se extrae del código, `neon` sólo usa tokens `--av-*` de
 * `app/globals.css` y `retro` es fósforo verde monocromo, donde las entidades se
 * separan por brillo y no por tinte.
 */

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS = ["clasico", "neon", "retro"] as const;

/** La que se ve si nadie elige: los colores de siempre de cada motor. */
export const DEFAULT_SKIN: SkinId = "clasico";

/** Rótulos del selector. MAYÚSCULAS y sin tildes: se pintan en Press Start 2P. */
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLASICO",
  neon: "NEON",
  retro: "RETRO",
};
