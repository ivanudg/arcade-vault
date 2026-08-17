# GAME JAM · PACMAN — version completa: los cuatro fantasmas, el tunel y la tabla de niveles

> **Estado:** Borrador de jam — no aprobada, no implementada
> **Alternativa de:** `specs/game-jam/pacman/spec-minima.md`. Se implementa una de las dos, nunca las dos.
> **Depende de:** SPEC 05, SPEC 07, SPEC 14
> **Fecha:** 2026-08-17
> **Objetivo:** Añadir `pacman` como sexta máquina del vault con el juego entero que cabe en el contrato: cuatro fantasmas con sus cuatro cabezas, dispersión y caza cronometradas por nivel, túnel lateral, ojos que vuelven a casa, ocho frutas y una tabla de veintiún niveles.

## Por qué existe esta spec

Pac-Man no tiene original en el repo. `references/started-games/` está agotado —hoy
sólo queda un `.DS_Store` dentro— y `references/source-assets/` ni siquiera existe, así
que aquí no hay un `game.js` del que copiar la física ya equilibrada. Es el caso de
Snake en SPEC 10 y el de Frogger en SPEC 14: **el motor se escribe entero y las cifras
las fija esta spec**. Quien implemente las copia sin reinterpretar, exactamente como
copiaría las de un original.

Con una diferencia que Snake y Frogger no tuvieron: Pac-Man **sí** tiene números
públicos. Las velocidades por nivel en porcentaje, la tabla de fases de dispersión y
caza, la duración del susto que baja hasta desaparecer en el nivel 19, los cuatro
objetivos de los cuatro fantasmas, la cadena 200/400/800/1600 y las ocho frutas de 100
a 5000 están documentados desde hace décadas y no hay que inventarlos. Por eso el C12
de esta máquina es un 3 en `.claude/game-planner/rubrica.md`: el equilibrio no se
adivina, se transcribe. Lo que sí hay que decidir aquí es la **escala** —el arcade mide
en tiles de 8 px a 60 Hz y este motor mide en píxeles por segundo con `dt` recortado— y
el **trazado**, que va literal más abajo.

Y hay una decisión que es la razón de existir de esta spec, no un detalle: **el
alcance**. Existe una versión mínima de esta misma máquina,
`specs/game-jam/pacman/spec-minima.md`, con dos fantasmas, sin túnel, sin frutas y con
la persecución siempre encendida. Cuesta cuatro archivos y diecinueve constantes, entra
en una tarde y se revisa de una sentada. Ésta cuesta seis archivos y cuarenta y una
constantes.

Lo que compra esa diferencia es lo siguiente. **La primera razón** es que Pac-Man no es
un juego de esquivar, es un juego de **rutas**: lo que lo hace grande es que los cuatro
fantasmas tienen objetivos distintos y por eso se reparten el laberinto en vez de
formar una fila detrás del jugador. Con dos, el jugador nunca se ve rodeado; con
cuatro, sí, y ahí aparece la lectura de la posición que es todo el juego. **La
segunda** es que la alternancia de dispersión y caza es lo que da ritmo a una ronda:
sin ella, la partida es una tensión plana de tres minutos. **La tercera** es el
marcador. El vault compite por puntos, y en la versión mínima una ronda vale como mucho
2090 puntos más los fantasmas: el top 10 mide cuántas rondas se aguanta y poco más. Con
frutas, cadena completa de fantasmas y vida extra a los diez mil, el techo se abre y
dos jugadores que aguantan lo mismo pueden acabar separados por miles de puntos según
cómo hayan jugado las píldoras. **La cuarta** es que todo eso ya está equilibrado por
otro: no es contenido que haya que inventar, es contenido que hay que transcribir.

La miniatura sale gratis en las dos versiones. `lib/preview-art.ts` guarda desde
SPEC 07 una escena archivada llamada `laberinto`: muro exterior de trazo cian, dos
bloques interiores, una fila de siete puntos amarillos, una figura amarilla que el
propio código llama «glotón» y un «guardián» magenta. Es Pac-Man, ya dibujado y sin
saberlo. Se **mueve** a `GameId` —sale de `ArchivedPreviewId` y el `case` se renombra—,
que es la regla que ya siguieron Tetris, Arkanoid, Snake y Frogger.

Y hay una pieza que esta versión hereda de SPEC 14, y por eso figura en `Depende de:`.
El susto de una píldora es información de juego permanente mientras dura —saber si
quedan cuatro segundos o medio decide si se persigue al cuarto fantasma o no—, pero
`GameState` son tres cifras y ya están dichas. La salida no es extender el contrato,
sino la novena regla de `engine-contract.md`, que Frogger ejerció con su cronómetro: el
motor no pinta el HUD, pero **sí** pinta lo que no tiene equivalente fuera. Aquí es una
barra bajo la casa de los fantasmas que se vacía mientras dura el susto. Por eso esta
máquina declara los mismos tres rótulos que Asteroids, Arkanoid, Snake y Frogger, y por
eso la barra corriendo **no** provoca renders: `onState` sigue emitiendo por diferencia
sobre las tres cifras de siempre.

## Alcance

**Dentro:**

- **`lib/games/pacman/constants.ts`**: mundo, rejilla, escala de velocidad,
  temporizadores, puntuación y paleta. Cuarenta y un valores, fijados en esta spec.
- **`lib/games/pacman/maze.ts`**: el trazado como array de 23 cadenas, su vocabulario,
  el túnel, y la geometría de rejilla pura —`tileAt()`, `walkable()`, `centerOf()`,
  `tileOf()`, `exits()`, `wrapTunnel()`—, sin estado.
- **`lib/games/pacman/levels.ts`**: `tuningFor(level)`, función pura del nivel que
  devuelve las cinco velocidades, la duración del susto, la fruta y la lista de fases
  de dispersión y caza.
- **`lib/games/pacman/ai.ts`**: `targetFor(kind, view)` con los cuatro objetivos y
  `chooseDir()` con la regla de decisión en intersección. Puras las dos.
- **`lib/games/pacman/entities.ts`**: `Player`, `Ghost`, `Fruit` y `Popup` como clases
  tipadas, con el `ctx` siempre por parámetro.
- **`lib/games/pacman/index.ts`**: `pacmanGame: GameMount` con
  `world: { width: 504, height: 552 }` y `hud: ["PUNTUACION", "VIDAS", "NIVEL"]`. El
  `Run`, el bucle, el canvas auxiliar del laberinto y el `GameHandle` viven en el
  closure de `mount()`.
- **`lib/games/engines.ts`**: una línea, `pacman: pacmanGame`.
- **`lib/games.ts`**: `"pacman"` en `GameId` y su entrada al final de `GAMES`, con
  `cat: "LABERINTO"` y `glow: "#f5ff00"`.
- **`components/game-pad.tsx`**: una línea en `ENGINE_KEYS` con los **cinco** códigos y
  una en `ENGINE_PAD` con `A` = `ESPACIO` y `B` apagado.
- **`lib/preview-art.ts`**: `laberinto` sale de `ArchivedPreviewId` y su `case` se
  renombra a `"pacman"`. La aritmética de la escena no se toca.
- **`supabase/migrations/<sello>_pacman.sql`**: `insert` de la fila `pacman` en
  `public.games` con `sort_order: 5`.
- **`lib/landing.ts`**: `STATS` pasa de `5` a `6` máquinas y el `desc` de `FEATURES`
  nombra a Pac-Man.
- **`references/implemented-games.md`**: la sexta fila de la tabla.
- **Apartado en `CLAUDE.md`**: la sexta máquina, la primera de `LABERINTO`, la sexta
  categoría estrenada, la segunda que pinta información de juego en el canvas y que
  quedan tres escenas archivadas.

**Fuera de alcance (para futuras specs):**

- **Un segundo trazado de laberinto** que alterne cada varias rondas, al modo de
  Ms. Pac-Man. Aquí el trazado es uno y se repone entero cada ronda.
- **El trazado exacto de 28 × 31 del arcade.** El de esta spec tiene su gramática
  —túnel central, casa con puerta, cuatro píldoras en las esquinas— pero es propio.
- **Las pantallas de intermedio** entre rondas, las de la persecución animada.
- **La fila de frutas conseguidas** en la esquina del canvas: es estado que se arrastra
  entre rondas y no cambia ninguna decisión de juego.
- **El _cornering_** del original, que permite recortar la esquina antes de llegar al
  centro de la celda.
- **Los contadores de puntos por fantasma** que el arcade usa para decidir cuándo sale
  cada uno de la casa. Aquí salen por temporizador, que es equivalente en la práctica y
  cabe en cuatro números.
- **El _bug_ del desplazamiento diagonal** de Pinky e Inky cuando Pac-Man mira arriba.
- **La pantalla 256**, el famoso nivel roto por el desbordamiento del contador del
  arcade. Aquí el nivel 256 se juega como el 21.
- **Sonido**, aquí y en las otras cinco máquinas.
- **Las tres skins.** El motor entra con su paleta y lo viste `skin-designer` en su
  propia ronda, como el resto.
- **Autenticación, antitrampas, realtime y paginación del marcador.** Igual que en
  SPEC 06, SPEC 09 y SPEC 10.
- **Tests.** El repo sigue sin framework y esta spec no lo introduce.

## Modelo de datos

El contrato de SPEC 05 no cambia y el esquema de SPEC 06 tampoco. Lo que aparece es un
motor nuevo, una entrada de catálogo y una fila.

### El motor — `lib/games/pacman/`

**`constants.ts`.** Las cifras se fijan aquí y no se reinterpretan al implementar. Lo
que depende del nivel no vive aquí sino en `levels.ts`; aquí está lo que no cambia
nunca.

```ts
/** Rejilla de 21 x 23 celdas de 24 px. Proporción 0,91, la del arcade vertical. */
export const CELL = 24;
export const COLS = 21;
export const ROWS = 23;
export const W = COLS * CELL; // 504
export const H = ROWS * CELL; // 552

export const LIVES = 3;
/** La única vez que `lives` sube. Una sola vez por partida. */
export const EXTRA_LIFE_SCORE = 10000;

/**
 * El 100 % de la tabla de `levels.ts`, en píxeles por segundo. 120 px/s son 5
 * celdas por segundo: el arcade corre a unos 9,5 tiles/s y esta escala lo deja
 * jugable en un mundo de 504 px sin que la celda se cruce en dos frames.
 */
export const BASE_SPEED = 120;
/** Los ojos vuelven a casa al doble del máximo: se ve y no se pelea. */
export const EYES_SPEED = 240;

/** El giro encolado se aplica a menos de esto del centro de la celda. */
export const TURN_TOLERANCE = 3;
/** Distancia entre centros que cuenta como contacto: media celda. */
export const CATCH_DIST = 12;

/** Cuándo sale de la casa cada fantasma al empezar una ronda o una vida. */
export const GHOST_RELEASE_MS = [0, 2000, 5000, 9000] as const;
/** Lo que espera dentro un fantasma que acaba de resucitar. */
export const HOUSE_MS = 1500;

/** Cruise Elroy: el rojo acelera cuando quedan pocos puntos. */
export const ELROY1_LEFT = 20;
export const ELROY2_LEFT = 10;
export const ELROY1_BONUS = 0.05;
export const ELROY2_BONUS = 0.1;

/** Los tres números de personalidad que no dependen del nivel. */
export const PINKY_LEAD = 4;
export const INKY_PIVOT = 2;
export const CLYDE_SHY_TILES = 8;

export const DOT_POINTS = 10;
export const PILL_POINTS = 50;
/** Cadena de fantasmas dentro de una misma píldora. */
export const GHOST_POINTS = [200, 400, 800, 1600] as const;

/** El juego se para mientras se lee la cifra del fantasma comido. */
export const EAT_FREEZE_MS = 600;
/** Cuánto se queda en pantalla una cifra flotante. */
export const POPUP_MS = 800;
/** La animación del arco que se cierra al morir. */
export const DEATH_MS = 1200;
/** Los dos comestibles que hacen aparecer la fruta, y cuánto se queda. */
export const FRUIT_AT = [70, 170] as const;
export const FRUIT_MS = 9000;
/** Los últimos milisegundos de susto, con los fantasmas parpadeando. */
export const FRIGHT_FLASH_MS = 2000;
```

La paleta del canvas va también aquí, y es la de partida —la `clasico` que
`skin-designer` extraerá cuando le toque vestir la máquina—:

```ts
export const COLOR_WALL = "#00f5ff";
export const COLOR_DOOR = "#ff8fbf";
export const COLOR_PLAYER = "#f5ff00";
export const COLOR_DOT = "#ffd7a8";
export const COLOR_PILL = "#ffffff";
export const COLOR_BLINKY = "#ff006e";
export const COLOR_PINKY = "#ff8fbf";
export const COLOR_INKY = "#00f5ff";
export const COLOR_CLYDE = "#ffb020";
export const COLOR_FRIGHT = "#2b3bff";
export const COLOR_FRIGHT_FLASH = "#ffffff";
export const COLOR_EYES = "#ffffff";
export const COLOR_POPUP = "#00f5ff";
export const COLOR_BAR = "#f5ff00";
export const COLOR_BAR_LOW = "#ff006e";
```

**`maze.ts`.** El trazado, literal. Veintitrés cadenas de veintiún caracteres, todas
palíndromas: el laberinto es simétrico respecto a la columna 10.

```ts
/**
 * `#` muro · `.` punto · `o` píldora · `-` puerta · `G` casa · `P` salida ·
 * `T` boca de túnel (transitable, sin comida, teletransporta al otro lado).
 */
export const MAZE = [
  "#####################",
  "#o.................o#",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#...................#",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#...................#",
  "#.##.##.#---#.##.##.#",
  "#.##.##.#GGG#.##.##.#",
  "#.##.##.#####.##.##.#",
  "T...................T",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#...................#",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#.........P.........#",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#o.................o#",
  "#.##.##.##.##.##.##.#",
  "#####################",
] as const;

/** Celdas comestibles del trazado: 223 puntos y 4 píldoras. */
export const DOT_TOTAL = 223;
export const PILL_TOTAL = 4;
/** Las cuatro esquinas de dispersión, en el orden de `GhostKind`. */
export const SCATTER_TILES = [
  { col: 19, row: 1 }, // blinky, arriba a la derecha
  { col: 1, row: 1 }, // pinky, arriba a la izquierda
  { col: 19, row: 20 }, // inky, abajo a la derecha
  { col: 1, row: 20 }, // clyde, abajo a la izquierda
] as const;
/** La celda a la que salen los fantasmas, justo encima de la puerta. */
export const HOUSE_EXIT = { col: 10, row: 7 } as const;
/** La fila del túnel. Los fantasmas van al `ghostTunnel` del nivel dentro de ella. */
export const TUNNEL_ROW = 11;
```

Las cuentas del trazado, para que no haya que fiarse: son transitables las seis filas
de pasillo completo sin túnel (1, 4, 7, 14, 17 y 20, diecinueve celdas cada una: 114),
la fila 11 del túnel (diecinueve celdas con comida más las dos bocas: 19), las once
filas de bloque (2, 3, 5, 6, 12, 13, 15, 16, 18, 19 y 21, con pasillo en las columnas
1, 4, 7, 10, 13, 16 y 19: 77) y las seis columnas que bordean la casa en las filas 8, 9
y 10 (18). Total **228 celdas con comida posible**, más las dos bocas de túnel: 230
transitables. Menos la celda de salida de Pac-Man, 227 comestibles, de los cuales 4 son
píldoras: **223 puntos**. `P` está en la fila 17, columna 10, y no lleva punto. La
puerta `-` de la fila 8 la cruzan los fantasmas y no Pac-Man; las tres celdas `G` de la
fila 9 son la casa y no llevan nada.

El resto del archivo son funciones puras, sin ni una variable mutable:

```ts
export type Dir = "up" | "down" | "left" | "right";

export function tileAt(col: number, row: number): string;
/** `true` para `.`, `o`, `P` y `T`. La puerta sólo si `forGhost`. */
export function walkable(col: number, row: number, forGhost: boolean): boolean;
export function centerOf(col: number, row: number): { x: number; y: number };
export function tileOf(x: number, y: number): { col: number; row: number };
export function step(col: number, row: number, dir: Dir): { col: number; row: number };
export function opposite(dir: Dir): Dir;
export function exits(col: number, row: number, forGhost: boolean): Dir[];
/** Salir por una boca de túnel entra por la otra. Devuelve la `x` corregida. */
export function wrapTunnel(x: number): number;
/** `true` si la celda está en la fila del túnel y fuera del cuerpo del laberinto. */
export function inTunnel(col: number, row: number): boolean;
```

**`levels.ts`.** Toda la progresión, en una **función pura del nivel**, como
`lanesForRound()` en Frogger. Ajustar la dificultad es cambiar un número aquí; el motor
no se toca.

```ts
export interface LevelTuning {
  /** Fracciones de `BASE_SPEED`. */
  player: number;
  playerFright: number;
  ghost: number;
  ghostFright: number;
  ghostTunnel: number;
  /** Cuánto dura la píldora. `0` desde el nivel 19: los fantasmas sólo se giran. */
  frightMs: number;
  /** La fruta de este nivel: rótulo en MAYUSCULAS y puntos. */
  fruit: { label: string; points: number };
  /** Fases de dispersión y caza, en orden. La última dura para siempre. */
  phases: readonly { mode: "scatter" | "chase"; ms: number }[];
}

export function tuningFor(level: number): LevelTuning;
```

Las cinco velocidades son la tabla del arcade, en porcentaje:

| Nivel    | Pac-Man | Pac-Man con píldora | Fantasma | Fantasma asustado | Fantasma en túnel |
| -------- | ------- | ------------------- | -------- | ----------------- | ----------------- |
| 1        | 0,80    | 0,90                | 0,75     | 0,50              | 0,40              |
| 2 a 4    | 0,90    | 0,95                | 0,85     | 0,55              | 0,45              |
| 5 a 20   | 1,00    | 1,00                | 0,95     | 0,60              | 0,50              |
| 21 y más | 0,90    | 0,90                | 0,95     | 0,60              | 0,50              |

Que el fantasma sea siempre más lento que Pac-Man fuera del susto —salvo del nivel 21
en adelante, donde le gana por cinco centésimas— es lo que hace que el juego se pueda
ganar con oficio y lo que convierte el nivel 21 en el muro que el arcade tenía.

El susto sale de una fórmula y no de una tabla de veintiún entradas:
`frightMs = level >= 19 ? 0 : max(6000 - (level - 1) * 500, 1000)`. Nivel 1, seis
segundos; nivel 11, mil milisegundos; nivel 19 y siguientes, cero: la píldora sigue
sumando 50 puntos y sigue dando la vuelta a los cuatro fantasmas, pero ya no son
comestibles.

Las fases son dos listas:

| Niveles | Fases, en orden                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1 a 4   | `scatter` 7 s, `chase` 20 s, `scatter` 7 s, `chase` 20 s, `scatter` 5 s, `chase` 20 s, `scatter` 5 s, `chase` para siempre |
| 5 y más | `scatter` 5 s, `chase` 20 s, `scatter` 5 s, `chase` 20 s, `scatter` 5 s, `chase` para siempre                              |

El reloj de fases **se para** mientras dura el susto y se reanuda al acabarse, como en
el original, y se reinicia al empezar una ronda y al perder una vida.

Y las ocho frutas:

| Niveles  | Fruta     | Puntos |
| -------- | --------- | ------ |
| 1        | `CEREZA`  | 100    |
| 2        | `FRESA`   | 300    |
| 3 y 4    | `NARANJA` | 500    |
| 5 y 6    | `MANZANA` | 700    |
| 7 y 8    | `MELON`   | 1000   |
| 9 y 10   | `NAVE`    | 2000   |
| 11 y 12  | `CAMPANA` | 3000   |
| 13 y más | `LLAVE`   | 5000   |

Las ocho se dibujan con primitivas —dos `arc` y un tallo la cereza, un triángulo
redondeado la fresa, un `arc` con hoja la naranja y la manzana, un semicírculo con
gajos el melón, un casco con alas la nave, un trapecio con badajo la campana y un
rectángulo con dientes la llave—, así que **el motor no carga ni un archivo** y
`mount()` sigue siendo síncrono.

**`ai.ts`.** Los cuatro objetivos y la decisión, las dos funciones puras. Recibe una
vista de sólo lectura del `Run` y no lo muta:

```ts
export type GhostKind = "blinky" | "pinky" | "inky" | "clyde";

export interface AiView {
  playerTile: { col: number; row: number };
  playerDir: Dir;
  blinkyTile: { col: number; row: number };
  mode: "scatter" | "chase";
}

/** La celda a la que apunta un fantasma ahora mismo. */
export function targetFor(kind: GhostKind, view: AiView): { col: number; row: number };

/**
 * La dirección elegida en el centro de una celda: de las salidas legales,
 * descartando la contraria a `dir` salvo que sea la única, la que minimiza la
 * distancia euclídea al cuadrado hasta `target`. Empate a favor del orden fijo
 * `up`, `left`, `down`, `right`.
 */
export function chooseDir(
  col: number,
  row: number,
  dir: Dir,
  target: { col: number; row: number },
): Dir;
```

Los cuatro objetivos, que son las cuatro cabezas del juego:

| Fantasma | Color     | Objetivo en `chase`                                                                                   | Objetivo en `scatter`      |
| -------- | --------- | ----------------------------------------------------------------------------------------------------- | -------------------------- |
| `blinky` | `#ff006e` | La celda de Pac-Man. Es el que aprieta                                                                | Esquina superior derecha   |
| `pinky`  | `#ff8fbf` | `PINKY_LEAD` celdas por delante de Pac-Man, en su dirección                                           | Esquina superior izquierda |
| `inky`   | `#00f5ff` | El vector que va de Blinky a la celda `INKY_PIVOT` por delante de Pac-Man, **duplicado** desde Blinky | Esquina inferior derecha   |
| `clyde`  | `#ffb020` | La celda de Pac-Man si está a más de `CLYDE_SHY_TILES` de él; su esquina si está más cerca            | Esquina inferior izquierda |

En `fright` no se llama a `targetFor()`: el fantasma **maximiza** la distancia al
cuadrado hasta la celda de Pac-Man, con el mismo desempate. En `eyes`, el objetivo es
`HOUSE_EXIT`. No hay `Math.random()` en ninguna parte del motor, como en Frogger: dos
partidas del mismo nivel jugadas igual se juegan igual, y una posición se reproduce en
la consola sin montar el juego.

**`entities.ts`.** Cuatro clases, con el `ctx` siempre por parámetro y sin leer nada de
fuera del closure.

```ts
export class Player {
  x: number;
  y: number;
  dir: Dir;
  /** El giro pedido; se aplica al pasar por el centro de una celda y se limpia. */
  queued: Dir | null;
  /** Fase de la boca, 0..1, para el sector del `arc`. */
  mouth: number;
  update(dt: number, speed: number): void;
  /** `dying` de 0 a 1 cierra el arco sobre sí mismo. */
  draw(ctx: CanvasRenderingContext2D, dying: number | null): void;
}

export type GhostPhase = "house" | "leaving" | "roam" | "fright" | "eyes";

export class Ghost {
  kind: GhostKind;
  x: number;
  y: number;
  dir: Dir;
  phase: GhostPhase;
  /** Cuenta atrás de salida de la casa, en ms. */
  wait: number;
  update(dt: number, speed: number, target: { col: number; row: number }): void;
  draw(ctx: CanvasRenderingContext2D, flashing: boolean): void;
}

export class Fruit {
  col: number;
  row: number;
  label: string;
  points: number;
  /** Milisegundos que le quedan en pantalla. */
  life: number;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  draw(ctx: CanvasRenderingContext2D): void;
}
```

`queued` existe por la misma razón que en Snake: entre dos centros de celda caben dos
pulsaciones, y sin cola un giro pedido medio píxel antes de tiempo se pierde. Se guarda
**un** giro, y se aplica en cuanto el centro de la entidad esté a menos de
`TURN_TOLERANCE` del centro de una celda cuya salida en esa dirección sea legal.

**`index.ts`.** El estado de partida, dentro del closure de `mount()`.

```ts
interface Run {
  player: Player;
  ghosts: Ghost[]; // los cuatro, en el orden de `GhostKind`
  fruit: Fruit | null;
  popups: Popup[];
  /** Copia mutable del trazado: qué celdas conservan punto o píldora. */
  food: Uint8Array;
  /** Comestibles que quedan; a 0 se despeja la ronda. */
  left: number;
  /** Comestibles tragados en esta ronda; dispara la fruta en `FRUIT_AT`. */
  eaten: number;
  score: number;
  lives: number;
  level: number;
  /** Índice en `phases` y milisegundos que le quedan a la fase actual. */
  phase_i: number;
  phase_ms: number;
  /** Milisegundos que quedan de píldora; 0 si no hay ninguna activa. */
  fright: number;
  /** Fantasmas comidos dentro de la píldora actual, índice en `GHOST_POINTS`. */
  chain: number;
  /** Congelación tras comer un fantasma, en ms. */
  freeze: number;
  /** Cuenta atrás de `DEATH_MS` mientras `phase === "dying"`. */
  dying: number;
  /** `true` en cuanto se ha cobrado la vida extra. Una sola vez por partida. */
  extraGiven: boolean;
  phase: "ready" | "playing" | "dying" | "gameover";
}
```

`phase` y no `state`, porque `GameState` ya son las tres cifras del HUD. `"ready"` es
todo el mundo en su sitio esperando `ESPACIO`: es la fase con la que empieza la
partida, con la que empieza cada ronda y con la que se vuelve después de perder una
vida.

`food` es un `Uint8Array` de `COLS * ROWS` y no un array de objetos a propósito: se
consulta y se escribe una vez por celda pisada y se recorre entero una vez por frame
para dibujar. Reiniciarlo al despejar la ronda es volver a leer `MAZE`.

**El laberinto se pinta una vez.** En `mount()` se crea un `<canvas>` auxiliar del
tamaño del mundo y se dibujan en él los muros y la puerta; el bucle lo estampa con un
solo `drawImage` por frame en vez de repetir unos 150 `strokeRect`. Ese canvas vive en
el closure, como todo lo demás, así que dos montajes tienen dos suyos y el ámbito de
módulo sigue sin una sola variable mutable.

**Lo que el motor pinta y lo que no.** El laberinto, los puntos vivos, las píldoras,
Pac-Man, los cuatro fantasmas, la fruta y las cifras flotantes de lo que se acaba de
comer. Y dos cosas más que **no tienen equivalente fuera del canvas**, que es la novena
regla de `engine-contract.md` y el precedente de SPEC 14: la **barra de susto** bajo la
casa, que se vacía de izquierda a derecha mientras dura la píldora y cambia a
`COLOR_BAR_LOW` en los últimos `FRIGHT_FLASH_MS`, y la palabra `LISTO` durante la fase
`ready`, en MAYÚSCULAS y sin tildes. **No se dibuja** puntuación, vidas, nivel ni
`GAME OVER`: eso lo pinta React a veinte píxeles del canvas.

### La máquina nueva — entrada en `GAMES`

Última del array, sexta posición.

```ts
{
  id: "pacman",
  title: "PACMAN",
  cat: "LABERINTO",
  glow: "#f5ff00",
  playable: true,
  desc: "Vacia el laberinto con cuatro fantasmas detras.",
  long: "El clásico del laberinto, con todo lo que traía el salón: los cuatro fantasmas y sus cuatro cabezas. El rojo va a por tu celda y acelera cuando quedan veinte puntos, el rosa te embosca cuatro celdas por delante, el cian tira una línea desde el rojo y la dobla, y el naranja se acobarda y se va a su esquina cuando te tiene a menos de ocho. Alternan dispersión y caza según el reloj de cada nivel, y el túnel lateral es tu ventaja: ahí van a la mitad que tú. Las cuatro píldoras invierten la persecución, cada vez menos segundos según sube el nivel y ni uno a partir del diecinueve, y los ojos del que te comas vuelven a casa a resucitar. Bajo la casa aparecen ocho frutas que valen de cien a cinco mil, a los diez mil puntos te regalan una vida y en el nivel veintiuno los fantasmas pasan a ser más rápidos que tú.",
  controls: "Flechas ← ↑ → ↓ mueven · ESPACIO arranca la ronda",
}
```

`LABERINTO` es la **sexta y última categoría sin estrenar**: con esta máquina, las seis
de `GameCategory` tienen contenido y el filtro de `/biblioteca` deja de tener una
opción muerta. El amarillo repite con Asteroids, que es inevitable —hay tres neones y
ésta es la sexta máquina—; las siluetas no se confunden, campo de rocas frente a
laberinto con puntos.

### El HUD y las tres cifras

Los tres rótulos dicen la verdad sin forzar nada, así que **el contrato no se toca por
quinta vez consecutiva**: Arkanoid, Snake, Frogger y ésta.

| Cifra   | Qué es en Pac-Man                                                                             | Rótulo       |
| ------- | --------------------------------------------------------------------------------------------- | ------------ |
| `score` | Puntos: 10 por punto, 50 por píldora, 200/400/800/1600 por fantasma y de 100 a 5000 por fruta | `PUNTUACION` |
| `lives` | Vidas restantes, de 3 a 0. **Sube una vez** al pasar de `EXTRA_LIFE_SCORE`                    | `VIDAS`      |
| `level` | Ronda, desde 1 y sin tope; sube al vaciar el laberinto                                        | `NIVEL`      |

`hud: ["PUNTUACION", "VIDAS", "NIVEL"]`, los mismos de Asteroids, Arkanoid, Snake y
Frogger. La vida extra es el único caso del vault en que `lives` sube, y `emitState()`
lo trata como cualquier otro cambio: emite por diferencia, no por evento.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('pacman', 'PACMAN', 'LABERINTO', true, 5);
```

Ningún `update`: las cinco filas existentes tienen `sort_order` 0, 1, 2, 3 y 4, así que
el 5 continúa la serie sin tocar nada. No se siembra ninguna marca, igual que en las
SPEC 08, 09, 10 y 14.

## Plan de implementación

Cada paso deja el repo compilando. Los pasos 1 a 8 no los consume nadie: se verifican
con `npm run build` y `npx tsc --noEmit`.

1. **Las constantes.** `lib/games/pacman/constants.ts` con los cuarenta y un valores y
   la paleta de esta spec. Nada de lo que dependa del nivel entra aquí.
   _Verificación:_ `npx tsc --noEmit` pasa.

2. **El trazado y su geometría.** `lib/games/pacman/maze.ts` con las veintitrés cadenas
   de `MAZE`, `DOT_TOTAL`, `PILL_TOTAL`, `SCATTER_TILES`, `HOUSE_EXIT`, `TUNNEL_ROW` y
   las funciones puras, incluidas `wrapTunnel()` e `inTunnel()`.
   _Verificación:_ `npx tsc --noEmit` pasa, las 23 cadenas miden 21 caracteres y contar
   los `.` y `o` del array da 223 y 4.

3. **La tabla de niveles.** `lib/games/pacman/levels.ts` con `tuningFor(level)`: las
   cinco velocidades de las cuatro franjas, la fórmula del susto con su corte en el
   nivel 19, las dos listas de fases y las ocho frutas. Función pura, sin estado.
   _Verificación:_ `npx tsc --noEmit` pasa, y `tuningFor()` devuelve en la consola de
   Node los valores de las tres tablas de esta spec para los niveles 1, 2, 5, 11, 19 y 21.

4. **La IA.** `lib/games/pacman/ai.ts` con `targetFor()` y `chooseDir()`, las dos puras
   y sin tocar el `Run`.
   _Verificación:_ `npx tsc --noEmit` pasa, y `targetFor()` con Pac-Man en una celda
   conocida devuelve las cuatro celdas objetivo de la tabla de esta spec.

5. **Las entidades.** `lib/games/pacman/entities.ts` con `Player`, `Ghost`, `Fruit` y
   `Popup`. `Player` sabe avanzar, encolar un giro y aplicarlo al pasar por un centro de
   celda; `Ghost` avanza hacia la dirección elegida y decide sólo en los centros; las
   ocho frutas son ocho funciones de dibujo con primitivas. El `ctx` va siempre por
   parámetro.
   _Verificación:_ `npx tsc --noEmit` pasa.

6. **El esqueleto de `mount()`.** `lib/games/pacman/index.ts` exporta
   `pacmanGame: GameMount` con su `world` y su `hud`. `mount()` crea el `Run` a partir
   de `MAZE`, crea el canvas auxiliar del laberinto, engancha la entrada con
   `createInput()` y devuelve el `GameHandle`. El bucle de `requestAnimationFrame` ya
   corre con el `dt` recortado a `MAX_DT = 0.05`, pero `update` y `draw` están vacíos.
   **`mount()` emite el estado inicial antes de devolver el handle**, para que el
   `FRESH_RUN` de `PlayCabinet` no se vea durante la pantalla de carga. `destroy()`
   cancela el frame guardado, desengancha la entrada y es idempotente con un flag
   `destroyed`.
   _Verificación:_ `npm run build` pasa; nadie lo monta todavía.

7. **Implementar `update(dt)`, primera mitad: Pac-Man y la comida.** En `"ready"`,
   `ESPACIO` pasa a `"playing"`. Mover a Pac-Man a `player` o `playerFright` del nivel,
   cruzar el túnel con `wrapTunnel()`, comer el punto o la píldora de su celda —sumando
   `DOT_POINTS` o `PILL_POINTS`, bajando `left`, subiendo `eaten` y, si es píldora,
   poniendo `fright` a `frightMs`, `chain` a 0 y **dando la vuelta a los cuatro
   fantasmas**—, soltar la fruta al llegar a `FRUIT_AT` y descontarle `FRUIT_MS`,
   cobrar la vida extra la primera vez que se cruza `EXTRA_LIFE_SCORE`, y subir de nivel
   con `left === 0` reponiendo `food` desde `MAZE` y volviendo a `"ready"`.
   _Verificación:_ `npx tsc --noEmit` pasa.

8. **Implementar `update(dt)`, segunda mitad: los fantasmas.** Avanzar el reloj de
   fases —parado mientras `fright > 0`—, resolver la salida de la casa por
   `GHOST_RELEASE_MS`, calcular el objetivo de cada fantasma según su fase, aplicar el
   Cruise Elroy de Blinky con `ELROY1_LEFT` y `ELROY2_LEFT`, mover cada uno a la
   velocidad que le toque —`ghost`, `ghostFright`, `ghostTunnel` dentro del túnel,
   `EYES_SPEED` en `eyes`— y resolver contactos a `CATCH_DIST`. Un contacto en `fright`
   suma `GHOST_POINTS[chain]`, incrementa `chain` con tope en 3, deja un `Popup`, pone
   `freeze = EAT_FREEZE_MS` y manda al fantasma a `eyes`; al llegar a `HOUSE_EXIT`
   entra en `house` con `HOUSE_MS`. Un contacto fuera de `fright` resta una vida y pasa
   a `"dying"`. Al agotarse `dying`: si quedan vidas, todo vuelve a su sitio y la fase
   es `"ready"`, conservando puntuación, nivel y el laberinto tal como estaba; si no,
   `"gameover"`, `onGameOver(score)` **una sola vez** —flag `overSent`, rearmado sólo
   en `restart()`— y el bucle se detiene.
   _Verificación:_ `npx tsc --noEmit` pasa.

9. **Implementar `draw()`.** Estampar el canvas auxiliar del laberinto con un
   `drawImage`, los puntos vivos como `fillRect` de 4 px, las píldoras como `arc` de
   6 px, la fruta, Pac-Man como un `arc` con sector de boca orientado a `dir` —cerrando
   sobre sí mismo mientras `dying`—, los cuatro fantasmas como cúpula, faldón y dos ojos
   que miran a su dirección, en `fright` de `COLOR_FRIGHT` y alternando con
   `COLOR_FRIGHT_FLASH` en los últimos `FRIGHT_FLASH_MS`, y en `eyes` sólo los ojos.
   Encima, las cifras flotantes, la barra de susto bajo la casa y la palabra `LISTO` en
   la fase `ready`. **No se dibuja** ninguna de las tres cifras del HUD ni `GAME OVER`.
   _Verificación:_ `npm run build` pasa.

10. **La máquina entra en el vault.** Este paso es **indivisible** y toca cuatro
    archivos a la vez, porque separarlo deja el repo o una ruta pública rota: el literal
    `"pacman"` en `GameId` no compila sin su entrada en `GAMES` ni sin el `case` de
    `drawPreview()` —el `id satisfies never` rompe el build—, y `/jugar/pacman`
    respondería en blanco sin la línea de `ENGINES`. Es el mismo razonamiento del paso 2
    de SPEC 07 y **no se trocea «para que sea más granular»**.
    - `lib/games.ts`: `"pacman"` en `GameId` y la entrada al final de `GAMES`.
    - `lib/games/engines.ts`: `pacman: pacmanGame`.
    - `components/game-pad.tsx`:
      `pacman: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"]` en
      `ENGINE_KEYS`, y
      `pacman: { a: { code: "Space", aria: "Arrancar la ronda" }, b: null }` en
      `ENGINE_PAD`.
    - `lib/preview-art.ts`: `"laberinto"` sale de `ArchivedPreviewId` y el
      `case "laberinto"` se renombra a `case "pacman"`. **Se mueve, no se copia**: el id
      no puede quedar en los dos sitios.

    _Verificación:_ `/biblioteca` muestra seis tarjetas y el filtro `LABERINTO` deja
    sólo la de Pac-Man, `/juego/pacman` y `/jugar/pacman` responden 200, la partida se
    juega con el teclado y con el mando, y las otras cinco máquinas se ven y se juegan
    igual.

11. **Migración `<sello>_pacman.sql`.** El `insert` de la fila con `sort_order: 5`.
    Aplicar con `npx supabase db push`; **nunca** con `apply_migration` por MCP, que
    iría al proyecto remoto sin dejar rastro en git.
    _Verificación:_ `public.games` tiene 6 filas, `npx supabase migration list` marca la
    migración aplicada, y guardar una marca de Pac-Man no revienta contra la clave
    ajena.

12. **Los textos que contarían mal.** `lib/landing.ts`: `STATS` pasa de `5` a `6`
    máquinas y el `desc` de `FEATURES` nombra a Pac-Man. Y la sexta fila de
    `references/implemented-games.md`, que se alinea a mano porque `.prettierignore`
    excluye `references/` entera.
    _Verificación:_ la portada dice `6 MAQUINAS`, la tarjeta de ventajas nombra a
    Pac-Man y la tabla de `references/` tiene seis filas.

13. **Documentar en `CLAUDE.md`.** Que el vault tiene seis máquinas; que `pacman` es la
    **primera de `LABERINTO`** y con ella las seis categorías de `GameCategory` tienen
    contenido; que es la tercera escrita desde cero, aunque su equilibrio se transcribe
    de un clásico documentado en vez de inventarse; que la progresión entera vive en
    `levels.ts` como función pura del nivel, igual que `lanesForRound()` en Frogger; que
    es la **segunda máquina que pinta información de juego en el canvas** —la barra de
    susto, por la misma razón que el cronómetro de Frogger— y sigue declarando los tres
    rótulos de siempre; que no hay ni un `Math.random()`; y que de las escenas
    archivadas quedan **tres**, porque `laberinto` hizo el viaje a `GameId`.
    _Verificación:_ el apartado existe y nombra `lib/games/pacman/`, sus seis archivos y
    las tres escenas archivadas que quedan.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/pacman/constants.ts`, `maze.ts`, `levels.ts`, `ai.ts`,
      `entities.ts` e `index.ts`, y ningún archivo más en ese directorio.
- [ ] `lib/games/pacman/` no importa nada de `react`, `next` ni `@/components`.
- [ ] En el ámbito de módulo de los seis archivos no hay ni una variable mutable: todo
      el estado, incluido el canvas auxiliar del laberinto, vive en el closure de
      `mount()`.
- [ ] Montar y destruir dos veces no deja ningún `requestAnimationFrame` vivo ni ningún
      listener en `window`; `destroy()` llamado dos veces no rompe nada.
- [ ] `grep -n "Math.random" lib/games/pacman/` no devuelve nada.
- [ ] `levels.ts` y `ai.ts` no mutan nada de lo que reciben: son funciones puras.
- [ ] Las 23 cadenas de `MAZE` miden 21 caracteres y todas son palíndromas.
- [ ] Contar los `.` y los `o` de `MAZE` da exactamente 223 y 4, y coincide con
      `DOT_TOTAL` y `PILL_TOTAL`.
- [ ] Desde la celda de salida se llega a las 230 celdas transitables: ninguna queda
      aislada.
- [ ] El motor no carga ni un archivo: `public/` no gana nada y `mount()` sigue siendo
      síncrono.

**El juego**

- [ ] Pac-Man no atraviesa ningún muro ni la puerta de la casa; los fantasmas sí cruzan
      la puerta, y sólo hacia dentro y hacia fuera de ella.
- [ ] Un giro pedido antes de llegar a la esquina se aplica al pasar por el centro de la
      celda, y se descarta si la salida no es legal.
- [ ] Salir por una boca del túnel entra por la otra, sin saltos ni parpadeo.
- [ ] Dentro del túnel los fantasmas van visiblemente más lentos que Pac-Man; en el
      nivel 1, al 40 % contra el 80 %.
- [ ] Comer un punto suma 10 y comer una píldora suma 50.
- [ ] Comer una píldora da la vuelta a los cuatro fantasmas en el mismo frame.
- [ ] La barra de susto se vacía de izquierda a derecha y cambia a `COLOR_BAR_LOW` en
      los 2 últimos segundos, a la vez que los fantasmas empiezan a parpadear.
- [ ] Comer los cuatro fantasmas dentro de la misma píldora suma 200, 400, 800 y 1600;
      la cadena se reinicia con la píldora siguiente.
- [ ] Al comer un fantasma el juego se congela 600 ms y aparece la cifra flotante.
- [ ] Los ojos del fantasma comido vuelven a la casa a `EYES_SPEED`, esperan `HOUSE_MS`
      y salen otra vez.
- [ ] Los cuatro fantasmas salen de la casa a los 0, 2, 5 y 9 segundos de arrancar la
      ronda.
- [ ] En `scatter` cada fantasma se va a **su** esquina y las cuatro son distintas.
- [ ] `blinky` va a la celda de Pac-Man, `pinky` a cuatro por delante, `inky` al vector
      reflejado desde Blinky y `clyde` se retira a su esquina cuando está a menos de 8
      celdas: se comprueba con las cuatro celdas objetivo dibujadas en la consola desde
      `targetFor()`.
- [ ] El reloj de fases se para mientras dura el susto y se reanuda al acabarse.
- [ ] Con 20 puntos restantes `blinky` acelera, y con 10 acelera otra vez.
- [ ] La fruta aparece bajo la casa al comestible 70 y otra vez al 170, y desaparece a
      los 9 segundos si no se coge.
- [ ] La fruta del nivel 1 es `CEREZA` y vale 100; la del nivel 13 es `LLAVE` y vale 5000.
- [ ] Al pasar de 10 000 puntos se gana una vida, **una sola vez** en toda la partida, y
      el HUD lo refleja.
- [ ] En el nivel 19 y siguientes la píldora suma 50 y gira a los fantasmas, pero no los
      vuelve comestibles ni pinta la barra.
- [ ] En el nivel 21 los fantasmas son más rápidos que Pac-Man.
- [ ] Al perder una vida se conservan puntuación, nivel y los puntos ya comidos, y se
      ve la animación del arco que se cierra durante 1,2 s.
- [ ] Vaciar el laberinto sube el nivel, repone los 223 puntos y las 4 píldoras y vuelve
      a la fase `LISTO`.
- [ ] Perder la última vida dispara `onGameOver` exactamente una vez y detiene el bucle.
- [ ] Dos partidas con la misma secuencia de teclas producen la misma posición de los
      cuatro fantasmas frame a frame.
- [ ] El canvas **no** pinta `PUNTUACION`, `VIDAS`, `NIVEL` ni `GAME OVER`; lo único
      escrito son `LISTO`, las cifras flotantes y los rótulos de fruta, todo en
      mayúsculas y sin tildes.

**El catálogo y las rutas**

- [ ] `GAMES` tiene seis entradas y la sexta es `pacman`, la última.
- [ ] `/biblioteca` muestra seis tarjetas y filtrar por `LABERINTO` deja sólo la de
      Pac-Man.
- [ ] `/juego/pacman` y `/jugar/pacman` responden 200; un id inventado sigue dando 404.
- [ ] Las rutas de `asteroids`, `tetris`, `arkanoid`, `snake` y `frogger` siguen
      respondiendo 200.
- [ ] `ENGINES` tiene seis entradas.
- [ ] La portada dice `6 MAQUINAS` y `FEATURES` nombra a Pac-Man.
- [ ] `references/implemented-games.md` tiene seis filas y la de `pacman` dice
      `LABERINTO` y `#f5ff00`.

**El mando y el HUD**

- [ ] Los **cinco** botones del mando están vivos en `/jugar/pacman`: ninguno se ve
      atenuado.
- [ ] Con el ratón o el dedo se mueve en las cuatro direcciones y se arranca la ronda,
      sin tocar el teclado.
- [ ] Con el dedo, `A` arranca la ronda y `B` se pinta apagado.
- [ ] Soltar el botón o sacar el puntero de él suelta la tecla.
- [ ] El HUD rotula `PUNTUACION`, `VIDAS` y `NIVEL`, y las tres cifras coinciden con la
      partida.
- [ ] Al terminar `CARGANDO CARTUCHO` el HUD ya muestra `0 / 3 / 1`, sin parpadeo.
- [ ] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia: la barra
      de susto vaciándose **no** provoca renders.
- [ ] `PAUSA` congela el canvas y `SEGUIR` reanuda en el mismo punto, con la barra de
      susto y el reloj de fases parados mientras tanto.
- [ ] La línea `controls` de la ficha dice lo mismo que `ENGINE_KEYS.pacman`.

**La miniatura**

- [ ] `/biblioteca` y `/juego/pacman` muestran la escena del laberinto, no la del
      `default`.
- [ ] `grep -n "laberinto" lib/preview-art.ts` no devuelve nada: el id se movió, no se
      copió.
- [ ] `ArchivedPreviewId` tiene tres miembros: `invasores`, `rocas` y `duelo`.
- [ ] La aritmética de la escena no cambió: el `case` sólo se renombró.

**El marcador**

- [ ] `public.games` tiene seis filas y la de `pacman` tiene `sort_order = 5`.
- [ ] Las filas de las otras cinco máquinas no cambiaron.
- [ ] `public.scores` no gana ninguna fila con la migración.
- [ ] Terminar una partida y pulsar `GUARDAR PUNTUACION` mete la marca y la enseñan
      `/salon`, `/juego/pacman`, `/biblioteca` y la portada.
- [ ] `/salon` muestra seis pestañas y sigue abriendo en `ASTEROIDS` sin `?juego=`.
- [ ] Con `scores` vacía, `/juego/pacman` muestra `SE EL PRIMERO` y no
      `MARCADOR NO DISPONIBLE`.

**Nada más se ha movido**

- [ ] `npm run build`, `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] `lib/games/engine.ts` no tiene ni una línea modificada.
- [ ] `lib/games/input.ts` y `components/game-canvas.tsx` no tienen ni una línea
      modificada.
- [ ] `lib/games/asteroids/`, `tetris/`, `arkanoid/`, `snake/` y `frogger/` no cambian.
- [ ] `lib/leaderboard.ts`, `lib/scores.ts`, `lib/storage.ts` y
      `app/jugar/[id]/actions.ts` no cambian.
- [ ] `public/` sigue conteniendo únicamente `snake/fruits.png`.
- [ ] `references/started-games/` y `references/source-assets/` no tienen ningún cambio.
- [ ] `specs/game-jam/pacman/spec-minima.md` sigue en disco sin implementar, o se ha
      borrado el directorio de la jam al mudar esta spec a `specs/NN-<slug>.md`.

**Documentación**

- [ ] `CLAUDE.md` dice que el vault tiene seis máquinas y que `pacman` es la primera de
      `LABERINTO`.
- [ ] `CLAUDE.md` dice que con esta máquina las seis categorías de `GameCategory` tienen
      contenido.
- [ ] `CLAUDE.md` explica que la progresión vive en `levels.ts` como función pura del
      nivel y que el motor no tiene ni un `Math.random()`.
- [ ] `CLAUDE.md` dice que la barra de susto se pinta en el canvas por la novena regla
      de `engine-contract.md`, igual que el cronómetro de Frogger, y que los tres
      rótulos del HUD no cambian.
- [ ] `CLAUDE.md` dice que quedan **tres** escenas archivadas en `lib/preview-art.ts`.

## Decisiones tomadas y descartadas

**Por qué este alcance**

- **Sí:** los cuatro fantasmas con sus cuatro objetivos. Compra el juego que la gente
  recuerda: los fantasmas se reparten el laberinto en vez de formar una fila detrás del
  jugador, y de ahí sale la lectura de posición que es todo Pac-Man. Paga el C10 de 0
  que `game-planner` le puso a esta máquina —«pide IA de varios agentes»— y un archivo
  `ai.ts` propio que hay que validar comportamiento por comportamiento. La alternativa
  barata está desarrollada en `specs/game-jam/pacman/spec-minima.md`, con dos fantasmas
  y sin `ai.ts`.
- **Sí:** dispersión y caza cronometradas. Compra el ritmo de una ronda: siete segundos
  de respiro cada veinte de presión, que es lo que hace que las esquinas se puedan
  recoger. Paga `levels.ts`, el reloj de fases dentro del `Run` y la regla de que se
  para durante el susto.
- **Sí:** frutas, cadena completa de fantasmas y vida extra. Compra el rango del
  marcador, que es lo que este vault mide: dos jugadores que aguantan las mismas rondas
  pueden acabar separados por miles de puntos. Paga dos clases más y la tabla de ocho
  frutas.
- **Sí:** túnel lateral con fantasmas frenados dentro. Compra la única vía de escape del
  laberinto y una decisión táctica real. Paga `wrapTunnel()`, `inTunnel()` y una quinta
  velocidad en la tabla.
- **Sí:** esta versión son seis archivos y cuarenta y una constantes, más del doble que
  la mínima. Es contenido, no arquitectura: el contrato, el reparto de archivos y los
  diez puntos de contacto son exactamente los mismos en las dos.

**El origen del juego**

- **Sí:** el motor se escribe desde cero. No hay original que portar en
  `references/started-games/`, así que no hay ni una de las cuatro cosas que matar de un
  `game.js`. Se pierde el equilibrio ya probado de un puerto; se gana que no haya que
  matar nada.
- **Sí:** el equilibrio se **transcribe** de las tablas conocidas del arcade en vez de
  inventarse. Es lo que separa a esta máquina de Snake y Frogger, que tuvieron que
  fijar sus números a ojo, y es el C12 de 3 de la rúbrica. Se pierde libertad para
  afinar; se gana un juego que ya se sabe que funciona.
- **Sí:** las velocidades se guardan como **fracciones** de `BASE_SPEED` y no en px/s.
  Así la tabla del arcade se copia tal cual, en porcentaje, y cambiar la escala del
  juego entero es tocar un solo número. Se pierde poder leer una velocidad absoluta de
  un vistazo.
- **Sí:** `BASE_SPEED = 120`, o sea 5 celdas por segundo al 100 %. Con `MAX_DT = 0.05`
  eso son 6 px por frame en el peor caso, un cuarto de celda: ninguna entidad se salta
  un centro de celda ni con un frame largo. Se pierde algo de la velocidad nerviosa del
  arcade en los niveles altos.
- **Sí:** el trazado va **literal en la spec**, con su recuento verificable. Un trazado
  descrito en prosa lo reinventa quien implementa, y entonces `DOT_TOTAL` deja de
  significar nada. Se pierden veintitrés líneas de spec; se gana que el criterio
  «contar los `.` da 223» sea comprobable.
- **No:** copiar el trazado de 28 × 31 del arcade. Es el que todo el mundo reconoce, pero
  transcribirlo de memoria es la clase de error que nadie revisa, y con celda de 24 daría
  un mundo de 672 × 744 que en el gabinete se encoge. Se pierde la silueta exacta del
  original; se conserva su gramática: túnel central, casa con puerta, cuatro píldoras en
  las esquinas y pasillos de una celda.
- **Sí:** rejilla de 21 × 23 con celda de 24, o sea 504 × 552. Proporción 0,91, la del
  arcade vertical, y menos alto que el mundo de Tetris (420 × 600), que ya entra en el
  gabinete sin encogerse en portátiles.

**Los fantasmas**

- **Sí:** los cuatro objetivos son los del original, incluido el vector reflejado de
  Inky y la cobardía de Clyde a ocho celdas. Son la personalidad entera del juego y no
  cuestan más que cualquier otro objetivo. Se gana que un jugador que conozca Pac-Man
  reconozca cómo se comporta cada uno.
- **No:** reproducir el _bug_ del desplazamiento diagonal de Pinky e Inky cuando Pac-Man
  mira arriba. Es fidelidad histórica y es un error del hardware de 1980; reproducirlo
  obliga a explicarlo en el código para que nadie lo «arregle». Se pierde que las rutas
  de las partidas grabadas del original se puedan seguir aquí paso a paso.
- **Sí:** el fantasma elige por distancia euclídea al cuadrado, con desempate fijo `up`,
  `left`, `down`, `right`. Es la regla del original. Se gana que la persecución sea
  legible y aprendible.
- **Sí:** cero `Math.random()`, también en el modo asustado: el fantasma **maximiza** la
  distancia. Es lo que hizo Frogger en SPEC 14, y compra que una muerte se pueda
  reproducir para saber si fue del jugador o del motor. Se pierde que los asustados sean
  impredecibles: aquí se les acorrala con oficio.
- **Sí:** salen de la casa por temporizador —0, 2, 5 y 9 segundos—. Se pierde el
  contador de puntos por fantasma del arcade, que adelanta la salida cuando el jugador
  come rápido; se gana que la salida quepa en cuatro números y sea la misma cada vida.
- **Sí:** Cruise Elroy con dos escalones, al quedar 20 y 10 puntos. Es lo que impide que
  el final de una ronda sea un paseo. Se pierde que la tabla del arcade cambia esos
  umbrales por nivel; aquí son fijos, y eso está escrito.
- **Sí:** los ojos vuelven a casa a `EYES_SPEED`, el doble del máximo. Se ve, se
  entiende y no da tiempo a interpretarlo como una segunda amenaza.

**El juego**

- **Sí:** el susto sale de una fórmula, `max(6000 - (level - 1) * 500, 1000)`, con corte
  en 0 desde el nivel 19. Se pierde la tabla exacta del arcade, que sube y baja de forma
  irregular —cinco segundos en el nivel 10, uno en el 12—; se gana una progresión que se
  entiende y una constante menos por nivel.
- **Sí:** en el nivel 19 y siguientes la píldora sigue sumando 50 y sigue girando a los
  fantasmas. Es lo que hace el original, y quitarla del todo dejaría cuatro celdas del
  laberinto valiendo lo mismo que un punto.
- **Sí:** el reloj de fases se para durante el susto. Es lo que hace el original y evita
  que una píldora larga se coma una fase de dispersión entera.
- **Sí:** congelación de 600 ms al comer un fantasma. Sin ella la cifra flotante no se
  lee y la cadena de cuatro se juega a ciegas. Se pierden seis décimas de reloj; el
  reloj de fases también se para, así que no cambia el equilibrio.
- **Sí:** al perder una vida se conservan puntuación, nivel **y los puntos ya comidos**.
  Perder duele sin borrar el progreso de la ronda. Se pierde tensión al final de una
  ronda casi vacía, donde morir cuesta poco.
- **No:** reponer el laberinto al perder una vida. Convierte tres vidas en tres partidas
  cortas pegadas, que es lo mismo que se descartó en SPEC 10.
- **Sí:** vida extra a los 10 000, una sola vez. Es el umbral del arcade y es la única
  vez que `lives` sube en todo el vault; `emitState()` lo trata por diferencia y no hace
  falta ningún evento nuevo.
- **No:** el _cornering_ del original. Es un detalle de tacto que exige mover en dos
  ejes a la vez durante unos frames. Se pierde algo de fluidez al girar; se gana un
  `update` que cabe en la cabeza.

**Lo que se pinta**

- **Sí:** la barra de susto va en el canvas. Es información de juego permanente mientras
  dura y no tiene equivalente fuera: es la novena regla de `engine-contract.md` y el
  precedente exacto del cronómetro de Frogger en SPEC 14. Se pierde la tentación de
  pedir una cuarta cifra al HUD, que habría obligado a tocar el contrato y las cinco
  máquinas.
- **No:** extender `GameState` con el tiempo de susto. Habría sido la primera vez que el
  contrato cambia desde SPEC 08, para una cifra que sólo existe siete segundos por
  píldora.
- **Sí:** las cifras flotantes de 200/400/800/1600 y del valor de la fruta se pintan en
  el canvas. Sin ellas la cadena no se entiende, y en el HUD llegan tarde y sin sitio.
- **No:** la fila de frutas conseguidas en la esquina, que el arcade sí tiene. Es estado
  que se arrastra entre rondas y no cambia ninguna decisión; se pierde un adorno
  reconocible.
- **Sí:** el laberinto se pinta una vez en un canvas auxiliar del closure y se estampa
  con un `drawImage`. Con 21 × 23 celdas son unos 150 `strokeRect` por frame que no
  cambian nunca. Se pierde la simplicidad de dibujarlo en el bucle, que es lo que hace
  la versión mínima con su laberinto más pequeño.

**La identidad**

- **Sí:** el id es `pacman`, el nombre real del juego, en minúsculas y sin guion. Es la
  misma regla que trajo `tetris`, `arkanoid`, `snake` y `frogger`.
- **No:** reutilizar `laberinto` como id. Es un nombre de fantasía de SPEC 01, no de
  máquina, y además colapsaría la unión `PreviewId` sin que `tsc` avisara del punto de
  contacto sin hacer.
- **Sí:** `cat: "LABERINTO"`, que estrena la sexta y última categoría sin usar. Es el
  hueco que `game-planner` premia con un C8 de 3, y deja el filtro de `/biblioteca` sin
  opciones muertas.
- **Sí:** amarillo `#f5ff00`, repitiendo con Asteroids. Sólo hay tres neones y ésta es la
  sexta máquina: la repetición era inevitable, y el amarillo es el color de Pac-Man y el
  que ya usa la escena archivada.
- **Sí:** la escena `laberinto` **se mueve** a `GameId`. Copiarla compila igual y deja
  dos escenas divergiendo; es la regla escrita en SPEC 07 y en la cabecera del propio
  archivo, y la siguieron las cuatro que hicieron el viaje.

**El mando**

- **Sí:** `ESPACIO` arranca la ronda y Pac-Man nace quieto. Es lo que hicieron Arkanoid
  con la bola, Snake con la serpiente y Frogger con la rana, y resuelve el mismo
  problema: reaparecer en marcha con cuatro fantasmas fuera es morir antes de
  reaccionar. De paso deja los cinco botones vivos, como Snake y Frogger.
- **No:** `ESPACIO` deshabilitado, con arranque automático tras un temporizador. Es más
  barato y deja un botón muerto en una máquina que puede usarlo.
- **No:** una tecla de pausa propia en el motor. `PAUSA` es del gabinete, y una tecla
  fuera de las cinco haría scroll de la página, porque `lib/games/input.ts` sólo hace
  `preventDefault` de esas cinco.

**Lo que no se toca**

- **No:** extender `GameMount` ni `GameCallbacks`. Los tres rótulos dicen la verdad y el
  dibujo no espera a ningún archivo; es la quinta máquina seguida que entra sin tocar el
  contrato.
- **Sí:** `initialTab` del salón se queda en `?? "asteroids"`. `asteroids` sigue en el
  catálogo, así que el fallback vale.
- **Sí:** los dos textos de `lib/landing.ts` se actualizan a mano. SPEC 07 los desacopló
  de `GAMES.length` a propósito, así que nadie avisa si se quedan mintiendo.
- **No:** las tres skins. El motor entra con su paleta `clasico` y lo viste
  `skin-designer` en su ronda, que es el reparto que el repo ya tiene escrito. Ojo: esta
  máquina tiene quince ranuras de color, más que ninguna otra.
- **No:** sonido. Ningún motor del vault suena, y meter audio arrastra mute, volumen y
  desbloqueo del `AudioContext`.

## Riesgos

| Riesgo                                                                                                                                                                                                                                                                                | Mitigación                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alguien implementa **las dos** specs de esta jam, o la mínima encima de ésta. Los dos `insert` de `public.games` llevan el mismo `id` y el mismo `sort_order`, así que el segundo revienta contra la clave primaria, y antes de eso `GameId` tendría el literal `"pacman"` duplicado. | Son excluyentes y así está declarado en el encabezado. Aprobar una **cierra** la otra: al mudar la elegida a `specs/NN-<slug>.md` se borra el directorio `specs/game-jam/pacman/` entero, y hay un criterio de aceptación que lo comprueba.                                                                                                              |
| La escena `laberinto` la reclama también `specs/game-jam/amidar/`, con el mismo `sort_order: 5`. Sólo puede viajar una vez, y las dos jams la dan por suya.                                                                                                                           | El aviso 1 de la ronda del 2026-08-12 en `.claude/game-planner/memoria.md` ya lo dice: ocho candidatos piden esa escena. La primera que se apruebe se la lleva; la otra jam pasa a necesitar un `case` nuevo y su `sort_order` sube a 6. No es un choque de esta spec, es una consecuencia de aprobar.                                                   |
| La IA de cuatro agentes es el mayor coste de esta máquina —C10 de 0 en la rúbrica— y un objetivo mal escrito produce fantasmas que se comportan «raro» sin romper nada: el build pasa, el juego se juega y nadie sabe si está bien.                                                   | Los cuatro objetivos son funciones puras en `ai.ts` con un paso de plan propio, el 4, y una verificación que los comprueba **fuera del juego**: `targetFor()` con Pac-Man en una celda conocida devuelve las cuatro celdas de la tabla. Y hay un criterio de aceptación por fantasma.                                                                    |
| El motor no tiene `Math.random()`, así que un fallo de decisión es reproducible… pero también lo es un bucle: dos fantasmas pueden quedarse orbitando el mismo bloque para siempre.                                                                                                   | El desempate fijo `up`, `left`, `down`, `right` y la prohibición de dar media vuelta hacen que un fantasma nunca se quede en el sitio; y el criterio «dos partidas con la misma secuencia de teclas producen la misma posición frame a frame» convierte cualquier órbita en algo que se reproduce y se corrige, no en un fantasma que a veces se atasca. |
| Cuarenta y una constantes más una tabla de niveles son muchas cifras que ajustar, y algunas sólo se notan en el nivel 19 o en el 21, donde casi nadie llega al probar.                                                                                                                | Todo lo que depende del nivel está en `levels.ts`, en una función pura que se puede llamar desde la consola de Node sin montar el juego; el paso 3 verifica exactamente eso para los niveles 1, 2, 5, 11, 19 y 21. Y hay criterios de aceptación específicos para el 19 y el 21.                                                                         |
| El trazado copiado a mano trae una fila de 20 o 22 caracteres, o una celda aislada, y el motor se comporta raro sin romper el build.                                                                                                                                                  | Tres criterios de aceptación: las 23 cadenas miden 21, todas son palíndromas, y contar `.` y `o` da 223 y 4. Más el criterio de conectividad desde la celda de salida.                                                                                                                                                                                   |
| Cuatro fantasmas, 223 puntos, la fruta, las cifras flotantes y el laberinto pintados cada frame pueden costar más de lo que da un teléfono.                                                                                                                                           | El laberinto se estampa con un `drawImage` desde un canvas auxiliar del closure y los puntos son `fillRect` sin halo. Si aun así va a tirones, eso es trabajo de `game-performance-booster`, que mide antes y después y no toca ni una constante de equilibrio.                                                                                          |
| El paso 10 se trocea «para que sea más granular» y deja el repo o una ruta pública rota entre commits.                                                                                                                                                                                | Está escrito como indivisible en el propio paso, con la razón: `GameId` no compila sin `GAMES` ni sin el `case` de `drawPreview()`, y `ENGINES` decide si `/jugar/pacman` enseña algo. Es el mismo razonamiento del paso 2 de SPEC 07.                                                                                                                   |
| `laberinto` se queda en `ArchivedPreviewId` además de entrar por `GameId`: compila igual y deja dos escenas divergiendo.                                                                                                                                                              | Un criterio lo comprueba con `grep`: el id debe aparecer cero veces en `lib/preview-art.ts`, y `ArchivedPreviewId` quedarse con tres miembros.                                                                                                                                                                                                           |
| Guardar la primera marca de Pac-Man revienta contra la clave ajena si el paso 11 no se aplicó.                                                                                                                                                                                        | El paso 11 va inmediatamente después del 10 y su verificación es exactamente ésa: guardar una marca. Entre los dos pasos la máquina se juega y sólo falla al terminar.                                                                                                                                                                                   |
| La barra de susto tienta a emitirla por `onState` para que la pinte React, y eso metería un render por frame.                                                                                                                                                                         | El criterio «el HUD no se actualiza en frames donde ninguna de las tres cifras cambia» lo caza, y la barra está declarada como dibujo del canvas en el paso 9 y en «Lo que se pinta». Es la misma decisión que tomó Frogger con su cronómetro.                                                                                                           |

## Lo que **no** entra en esta spec

- Un segundo trazado de laberinto que alterne cada varias rondas.
- El trazado exacto de 28 × 31 del arcade.
- Las pantallas de intermedio entre rondas.
- La fila de frutas conseguidas en la esquina del canvas.
- Los contadores de puntos por fantasma para la salida de la casa.
- El _bug_ del desplazamiento diagonal de Pinky e Inky, y la pantalla 256.
- El _cornering_ al girar.
- Las tres skins de la máquina, que son trabajo de `skin-designer`.
- Sonido, aquí y en las otras cinco máquinas.
- Autenticación, antitrampas, moderación, realtime y paginación del marcador.
- Tests.

Cada una de esas, si llega, va en su propia spec.
