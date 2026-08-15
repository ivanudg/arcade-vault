/**
 * Las tres pieles de Asteroids.
 *
 * Once ranuras: el fondo, las cuatro entidades que el motor dibuja y los cinco
 * power-ups. Cinco de ellas eran literales sueltos fuera de `constants.ts` —el
 * `"#fff"` de la bala, el asteroide y la nave, el naranja del propulsor y el
 * blanco de la partícula—, y por eso la paleta vive aquí y no allí.
 *
 * **El alfa no es de la piel.** El propulsor se pinta al 0,85 y la partícula se
 * desvanece con su vida restante: eso lo sigue decidiendo el motor, que monta el
 * `rgba` con `tint()`. Aquí sólo está el color, y por eso esas dos ranuras van en
 * `#rrggbb` de seis dígitos, que es lo único que `tint()` acepta.
 *
 * **Y desde el 2026-08-15 una piel es color más un rasgo de dibujo**: `glow` dice
 * si las entidades salen con halo del suyo propio. Es el mismo rasgo que estrenó
 * Tetris el mismo día, y aquí cae sobre un motor de vectores: lo que se ilumina
 * no son rellenos sino trazos de 1,5 px. **Ni un hex de estas tres paletas cambió
 * al añadirlo.**
 *
 * `clasico` es extracción, no diseño: cada hex se puede señalar en el código que
 * había antes de vestir la máquina, así que elegirla deja la partida exactamente
 * como estaba.
 */

import type { SkinId } from "@/lib/games/skins";

export interface Palette {
  /** El lienzo. Se pinta opaco cada frame, así que borra el anterior. */
  bg: string;
  /** La nave del jugador. */
  ship: string;
  /** Sus balas. */
  bullet: string;
  /** La llama del propulsor. El motor le pone su 0,85. */
  thruster: string;
  /** El polígono de un asteroide, de cualquiera de los tres tamaños. */
  asteroid: string;
  /** Los trazos de la explosión. El motor los desvanece con su vida restante. */
  particle: string;
  /** Disparo triple: el rombo con abanico, y su barra del HUD. */
  triple: string;
  /** Escudo: el anillo doble del icono y el que rodea la nave mientras dura. */
  shield: string;
  /** Cámara lenta: el reloj con manecillas. */
  slow: string;
  /** Hiperpropulsión: el doble chevron. */
  hyper: string;
  /** Bomba nova: el estallido radial de ocho rayos. */
  nova: string;
  /**
   * Si esta piel pinta las entidades con halo de su propio color.
   *
   * **La piel dice si hay halo; el motor dice de cuánto**, igual que con el
   * alfa: aquí sólo está la decisión, y el radio lo miden las dos constantes de
   * `entities.ts`. No hay una segunda geometría escondida —el trazo, su grosor y
   * la silueta son los de siempre—: lo único que cambia es el `shadowBlur` del
   * contexto mientras se dibuja cada entidad.
   *
   * `false` en `clasico`, que es extracción y no se toca ni un píxel. El fondo y
   * las barras de power-up no lo llevan en ninguna piel: el lienzo lo mancharía
   * entero y las barras son HUD dentro del canvas, no entidades.
   */
  glow: boolean;
}

/**
 * `neon` reparte así: los cinco power-ups y el propulsor se llevan los acentos
 * `--av-*`, y la nave, las balas, las rocas y el polvo bajan a la rampa de
 * grises del tema. Es lo más fiel —nave y asteroides ya eran los dos blancos— y
 * lo único que cabe: hay cinco power-ups y sólo cuatro acentos, así que la nave
 * no puede quedarse con uno. El propulsor y la hiperpropulsión comparten el
 * ámbar a propósito: el ítem de propulsión y la llama del propulsor no son dos
 * cosas que haya que separar, y al recogerlo la nave arde de su color.
 *
 * `retro` separa por brillo en tres grupos: vivo lo tuyo y lo que quieres coger,
 * medio lo que te mata, tenue lo que sólo decora. Los cinco power-ups comparten
 * el escalón vivo —no hay cuatro—, y se distinguen por su glifo, que el motor
 * dibuja distinto para cada uno, y por el rótulo de su barra del HUD.
 *
 * Las dos llevan `glow`, y por motivos distintos. En `neon` el halo es lo que
 * convierte una silueta de vectores en un trazo de tubo encendido, que es lo que
 * la piel dice ser. En `retro` es el sangrado del fósforo de un monitor verde,
 * corto y pegado al trazo. Los dos radios los miden las constantes de
 * `entities.ts`, y no son el mismo: en `retro` las entidades se separan por
 * escalón de brillo, y un halo largo funde un escalón con el siguiente.
 */
export const PALETTES: Record<SkinId, Palette> = {
  clasico: {
    bg: "#000",
    ship: "#fff",
    bullet: "#fff",
    thruster: "#ff8200",
    asteroid: "#fff",
    particle: "#ffffff",
    triple: "#0ff",
    shield: "#8cf",
    slow: "#fd4",
    hyper: "#5f8",
    nova: "#f55",
    glow: false,
  },
  neon: {
    bg: "#0a0a0f",
    ship: "#c9cfdd",
    bullet: "#e7ebf5",
    thruster: "#ff9d4d",
    asteroid: "#9aa2b4",
    particle: "#6f7686",
    triple: "#00f5ff",
    shield: "#e7ebf5",
    slow: "#f5ff00",
    hyper: "#ff9d4d",
    nova: "#ff006e",
    glow: true,
  },
  retro: {
    bg: "#001100",
    ship: "#33ff33",
    bullet: "#33ff33",
    thruster: "#116611",
    asteroid: "#22aa22",
    particle: "#116611",
    triple: "#33ff33",
    shield: "#33ff33",
    slow: "#33ff33",
    hyper: "#33ff33",
    nova: "#33ff33",
    glow: true,
  },
};
