/**
 * Catálogo de máquinas del vault.
 *
 * Nació como puerto literal de `GAMES` en references/templates/arcade-core.js,
 * con las ocho máquinas del prototipo. SPEC 07 lo dejó en una, `asteroids`,
 * porque era la única que se jugaba de verdad: las otras ocho eran escena
 * congelada y HUD de mentira, y un vault que enseña nueve y deja jugar una
 * promete ocho veces más de lo que da. De ahí la regla que sigue vigente:
 * **toda máquina que entre a partir de aquí entra con motor.** `tetris` es la
 * primera que la cumple.
 *
 * `getGame()` devuelve `undefined` en vez de la primera máquina cuando el id no
 * existe, para que las rutas dinámicas puedan responder 404.
 */

/** Una máquina nueva entra añadiendo un literal aquí y su entrada en `GAMES`. */
export type GameId = "asteroids" | "tetris" | "arkanoid" | "snake" | "frogger";

/**
 * Vocabulario cerrado de categorías, no inventario de lo que hay hoy: conserva
 * los seis valores aunque de momento sólo se usen `DISPAROS`, `PUZZLE`,
 * `ARCADE`, `CLASICOS` y `REFLEJOS`, que estrenó Frogger.
 */
export type GameCategory = "ARCADE" | "CLASICOS" | "DISPAROS" | "REFLEJOS" | "PUZZLE" | "LABERINTO";

/** Los tres neones de `globals.css`: cada máquina se pinta con uno de ellos. */
export type GameGlow = "#00f5ff" | "#ff006e" | "#f5ff00";

export interface Game {
  id: GameId;
  /** Rótulo en mayúsculas sin tilde: Press Start 2P no tiene glifos acentuados. */
  title: string;
  cat: GameCategory;
  /** Color de acento de la máquina. */
  glow: GameGlow;
  /** `false` en una máquina en mantenimiento. Hoy no hay ninguna. */
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
    id: "asteroids",
    title: "ASTEROIDS",
    cat: "DISPAROS",
    glow: "#f5ff00",
    playable: true,
    desc: "Pulveriza el campo de asteroides y sobrevive.",
    long: "El clásico de vectores, entero y jugable de verdad. Inercia real y espacio toroidal: sales por un borde y entras por el opuesto. Los asteroides grandes se parten en medianos y los medianos en pequeños, y cuanto más pequeños, más puntos. Cada nivel suelta dos de los cuatro potenciadores —disparo triple, escudo, cámara lenta e hiperpropulsión— y, con suerte, una bomba nova que limpia la pantalla.",
    controls: "Flechas ← → giran · ↑ empuja · ESPACIO dispara",
  },
  {
    id: "tetris",
    title: "TETRIS",
    cat: "PUZZLE",
    glow: "#00f5ff",
    playable: true,
    desc: "Encaja las piezas, limpia lineas y no llegues al techo.",
    long: "El clásico de las siete piezas, entero y jugable de verdad. Las piezas caen cada vez más rápido: cada diez líneas sube un nivel y el intervalo de caída baja noventa milisegundos, hasta un suelo de cien. Cuatro líneas de golpe valen ocho veces lo que una. La proyección marca dónde va a aterrizar la pieza y el retardo de bloqueo da medio segundo para encajarla. La partida acaba cuando la pieza siguiente ya no cabe.",
    controls: "Flechas ← → mueven · ↑ rota · ↓ baja rápido · ESPACIO suelta de golpe",
  },
  {
    id: "arkanoid",
    title: "ARKANOID",
    cat: "ARCADE",
    glow: "#ff006e",
    playable: true,
    desc: "Rompe todos los bloques sin dejar caer la bola.",
    long: "El clásico de la pala y la bola, entero y jugable de verdad. Diez pantallas que van apretando: la bola sale más rápida en cada una y acelera mientras juegas. Los bloques de dos y tres golpes se desgastan a la vista antes de romperse, y los grises no se rompen nunca. El punto de la pala donde golpeas decide el ángulo de salida, hasta sesenta grados. Cada bloque roto vale cien puntos y despejar la decima pantalla acaba la partida.",
    controls: "Flechas ← → mueven la pala · ESPACIO lanza la bola",
  },
  {
    id: "snake",
    title: "SNAKE",
    cat: "CLASICOS",
    glow: "#00f5ff",
    playable: true,
    desc: "Come fruta, crece y no te muerdas la cola.",
    long: "El clásico de la serpiente, con veintidós frutas de verdad en vez de un cuadrado. Cada fruta que comes te hace un segmento más largo y vale diez puntos por nivel, así que la misma manzana renta diez veces más en el nivel diez que en el primero. Cada cinco frutas el juego acelera, de ciento cincuenta milisegundos por celda a sesenta. La pared mata y tu propia cola también. Tres vidas: al perder una vuelves al centro con la puntuación y la velocidad intactas.",
    controls: "Flechas ← ↑ → ↓ giran · ESPACIO arranca",
  },
  {
    id: "frogger",
    title: "FROGGER",
    cat: "REFLEJOS",
    glow: "#ff006e",
    playable: true,
    desc: "Cruza el trafico y el rio y llena las casas ronda tras ronda.",
    long: "El clásico de la rana, con todo lo que traía el salón. Abajo, cinco carriles de coches y camiones; arriba, cinco de río donde el agua mata y las plataformas te arrastran, y donde una de cada dos tortugas se sumerge justo cuando te has subido. Treinta segundos por travesía, y cada segundo que sobra vale diez puntos. Llenar los cinco nichos empieza otra ronda: todo va un doce por ciento más rápido y hay dos segundos menos, hasta más del doble de velocidad. Desde la tercera ronda un cocodrilo asoma en las casas y una serpiente patrulla la mediana. La mosca vale doscientos, y escoltar a la dama-rana hasta casa, otros doscientos.",
    controls: "Flechas ← ↑ → ↓ saltan · ESPACIO sale de la orilla",
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
 * Un color hexadecimal con transparencia, como el `tint()` del prototipo.
 * Los velos y halos se calculan con esto porque el color no se conoce hasta el
 * render y no puede salir de una clase estática. Acepta cualquier `#rrggbb`:
 * además de los acentos de máquina, lo usan los colores del podio.
 */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
