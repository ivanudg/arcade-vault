# GAME JAM · PACMAN — version minima: el laberinto, la pildora y dos perseguidores

> **Estado:** Borrador de jam — no aprobada, no implementada
> **Alternativa de:** `specs/game-jam/pacman/spec-completa.md`. Se implementa una de las dos, nunca las dos.
> **Depende de:** SPEC 05, SPEC 07
> **Fecha:** 2026-08-17
> **Objetivo:** Añadir `pacman` como sexta máquina del vault con el motor más barato que sigue siendo Pac-Man: un laberinto de puntos, cuatro píldoras que invierten la persecución y dos fantasmas deterministas, sin túnel, sin frutas, sin dispersión y sin tabla de niveles.

## Por qué existe esta spec

Pac-Man no tiene original en el repo. `references/started-games/` está agotado —hoy
sólo queda un `.DS_Store` dentro— y `references/source-assets/` ni siquiera existe,
así que aquí no hay un `game.js` del que copiar la física ya equilibrada ni una tabla
de puntos decidida por otro. Es el caso de Snake en SPEC 10 y el de Frogger en
SPEC 14: **el motor se escribe entero y las cifras las fija esta spec**. Quien
implemente las copia sin reinterpretar, exactamente como copiaría las de un original.

Eso mueve el trabajo de sitio. En un puerto lo caro es matar las cuatro cosas que un
`game.js` de navegador hace y que no sobreviven a montarse y desmontarse —el
`getElementById` al cargar el módulo, el estado de partida en variables de módulo, los
listeners eternos en `window` y el `requestAnimationFrame` que no se puede cancelar—.
Aquí no hay ninguna que matar, y a cambio hay que inventar lo que un puerto regala:
cuánto corre Pac-Man, cuánto corren los fantasmas, cuánto dura una píldora y qué pasa
cuando el laberinto se queda sin puntos. Los diecinueve números que hacen falta están
escritos abajo, juntos en un solo archivo, para que ajustar la dificultad sea cambiar
una cifra y no tocar el motor. Y el trazado del laberinto también está escrito aquí,
celda a celda: es dato, no adivinanza.

Y hay una decisión que es la razón de existir de esta spec, no un detalle: **el
alcance**. Pac-Man de salón trae cuatro fantasmas con cuatro personalidades distintas,
una alternancia de dispersión y caza cronometrada por nivel, un túnel lateral donde
los fantasmas frenan, ojos que vuelven a casa, ocho frutas con su tabla de puntos, una
vida extra a los diez mil y una tabla de velocidades de veintiún niveles. Todo eso
cabe en el contrato del vault —lo desarrolla la spec hermana,
`specs/game-jam/pacman/spec-completa.md`— y todo eso cuesta dos archivos más, veintidós
constantes más y bastantes más criterios que verificar.

Esta versión se queda con la mecánica central y nada más. **La primera razón** es que
el verbo de Pac-Man se entiende en la primera partida sin ninguno de esos añadidos:
comer todo el laberinto huyendo, y morder la píldora para darse la vuelta y cazar. Una
máquina que no se entiende no se arregla con contenido, y ésta se entiende con dos
fantasmas. **La segunda** es que la mecánica de persecución en laberinto no existe en
el vault —hay disparo con inercia, piezas que caen, rebote con pala, rejilla que crece
y travesía de carriles—, y esta versión la trae entera: lo que se recorta es contenido,
no juego. **La tercera** es de riesgo, y es la que más pesa aquí: `game-planner` le
puso a Pac-Man un **C10 de 0** por «IA de varios agentes», que es la nota más baja que
da ese criterio. Dos fantasmas con un objetivo cada uno son unas veinte líneas de
decisión en intersección que se pueden leer de una sentada; cuatro con dispersión,
Cruise Elroy y ojos son un archivo propio. Validar a ojo dos comportamientos es
posible; validar seis, no, y un motor cuyo comportamiento no se puede validar entra al
vault a ciegas.

La miniatura, en cambio, sale gratis en las dos versiones. `lib/preview-art.ts` guarda
desde SPEC 07 una escena archivada llamada `laberinto`: muro exterior de trazo cian,
dos bloques interiores, una fila de siete puntos amarillos, una figura amarilla que el
propio código llama «glotón» y un «guardián» magenta. Es Pac-Man, ya dibujado y sin
saberlo. Se **mueve** a `GameId` —sale de `ArchivedPreviewId` y el `case` se renombra—,
que es la regla que ya siguieron Tetris, Arkanoid, Snake y Frogger.

## Alcance

**Dentro:**

- **`lib/games/pacman/constants.ts`**: mundo, rejilla, velocidades, duración de la
  píldora, vidas y puntuación. Diecinueve valores nuevos, fijados en esta spec.
- **`lib/games/pacman/maze.ts`**: el trazado como array de 21 cadenas, su vocabulario,
  y la geometría de rejilla pura —`tileAt()`, `walkable()`, `centerOf()`,
  `tileOf()`, `isIntersection()`—, sin estado.
- **`lib/games/pacman/entities.ts`**: `Player` y `Ghost` como clases tipadas, con el
  `ctx` siempre por parámetro.
- **`lib/games/pacman/index.ts`**: `pacmanGame: GameMount` con
  `world: { width: 456, height: 504 }` y `hud: ["PUNTUACION", "VIDAS", "NIVEL"]`. El
  `Run`, el bucle y el `GameHandle` viven en el closure de `mount()`.
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
  categoría estrenada y que quedan tres escenas archivadas.

**Fuera de alcance (para futuras specs):**

- **Los otros dos fantasmas.** Aquí hay dos, el perseguidor y el emboscador. Los cuatro
  del salón, con el vector reflejado del cian y la cobardía del naranja a ocho celdas,
  están desarrollados en `specs/game-jam/pacman/spec-completa.md`.
- **La alternancia de dispersión y caza.** Los dos fantasmas persiguen siempre. La tabla
  de fases cronometradas por nivel está en la spec completa.
- **El túnel lateral** y la ralentización de los fantasmas dentro de él. El laberinto de
  esta versión es una caja cerrada; el trazado con túnel está en la spec completa.
- **Los ojos que vuelven a casa.** Un fantasma comido reaparece en la casa después de un
  temporizador, sin recorrido de vuelta.
- **Las frutas** y su tabla de ocho valores por nivel. Están en la spec completa.
- **La vida extra a los diez mil.** Aquí las vidas sólo bajan.
- **La tabla de velocidades por nivel del arcade** —Pac-Man al 80/90/100 %, fantasma al
  75/85/95 %—. Aquí la progresión es un solo multiplicador con tope.
- **Cruise Elroy**, la aceleración del fantasma rojo cuando quedan pocos puntos.
- **La animación de muerte** del arco que se cierra, y la congelación al comer un
  fantasma. Aquí se parpadea y se sigue.
- **El _cornering_** del original, que permite recortar la esquina antes de llegar al
  centro de la celda.
- **Las pantallas de intermedio** entre rondas del arcade.
- **Sonido**, aquí y en las otras cinco máquinas.
- **Las tres skins.** El motor entra con su paleta y la viste `skin-designer` en su
  propia ronda, como el resto.
- **Autenticación, antitrampas, realtime y paginación del marcador.** Igual que en
  SPEC 06, SPEC 09 y SPEC 10.
- **Tests.** El repo sigue sin framework y esta spec no lo introduce.

## Modelo de datos

El contrato de SPEC 05 no cambia y el esquema de SPEC 06 tampoco. Lo que aparece es un
motor nuevo, una entrada de catálogo y una fila.

### El motor — `lib/games/pacman/`

**`constants.ts`.** Las cifras se fijan aquí y no se reinterpretan al implementar. Son
diecinueve, y las cinco de velocidad son las únicas que hay que jugar para afinar.

```ts
/** Rejilla de 19 x 21 celdas de 24 px. Proporción 0,90, como el arcade vertical. */
export const CELL = 24;
export const COLS = 19;
export const ROWS = 21;
export const W = COLS * CELL; // 456
export const H = ROWS * CELL; // 504

export const LIVES = 3;

/** Píxeles por segundo. 96 px/s son 4 celdas por segundo. */
export const PLAYER_SPEED = 96;
export const GHOST_SPEED = 88;
/** El fantasma asustado corre a poco más de la mitad: se le alcanza siempre. */
export const GHOST_FRIGHT_SPEED = 56;
/** Multiplicador de las tres velocidades por nivel, con tope. */
export const SPEED_STEP = 1.06;
export const SPEED_MAX = 1.5;

/** Cuánto dura la píldora y cuánto parpadea el fantasma antes de acabarse. */
export const FRIGHT_MS = 7000;
export const FRIGHT_FLASH_MS = 2000;
/** Un fantasma comido reaparece en la casa pasado esto. */
export const GHOST_RESPAWN_MS = 3000;

/** El giro encolado se aplica a menos de esto del centro de la celda. */
export const TURN_TOLERANCE = 3;
/** Distancia entre centros que cuenta como contacto: media celda. */
export const CATCH_DIST = 12;

export const DOT_POINTS = 10;
export const PILL_POINTS = 50;
/** Cadena de fantasmas dentro de una misma píldora. */
export const GHOST_POINTS = [200, 400, 800, 1600] as const;

/** Milisegundos de parpadeo al perder una vida, antes de volver a la fase `ready`. */
export const DEATH_MS = 900;
```

Del multiplicador salen las velocidades del nivel `n`:
`min(SPEED_STEP ** (n - 1), SPEED_MAX)` aplicado a las tres. Con estos números el
nivel 8 toca el tope y a partir de ahí se sigue jugando al mismo ritmo hasta perder.

La paleta del canvas va también aquí, y es la de partida —la `clasico` que
`skin-designer` extraerá cuando le toque vestir la máquina—:

```ts
export const COLOR_WALL = "#00f5ff";
export const COLOR_DOOR = "#ff8fbf";
export const COLOR_PLAYER = "#f5ff00";
export const COLOR_DOT = "#ffd7a8";
export const COLOR_PILL = "#ffffff";
export const COLOR_GHOST_CHASER = "#ff006e";
export const COLOR_GHOST_AMBUSHER = "#ff8fbf";
export const COLOR_FRIGHT = "#2b3bff";
export const COLOR_FRIGHT_FLASH = "#ffffff";
```

**`maze.ts`.** El trazado, literal. Veintiuna cadenas de diecinueve caracteres, todas
palíndromas: el laberinto es simétrico respecto a la columna 9.

```ts
/** `#` muro · `.` punto · `o` píldora · `-` puerta de la casa · `G` casa · `P` salida. */
export const MAZE = [
  "###################",
  "#o...............o#",
  "#.##.##.#.#.##.##.#",
  "#.##.##.#.#.##.##.#",
  "#.................#",
  "#.##.##.#.#.##.##.#",
  "#.##.##.#.#.##.##.#",
  "#.................#",
  "#.##.###---###.##.#",
  "#.##.###GGG###.##.#",
  "#.##.#########.##.#",
  "#.................#",
  "#.##.##.#.#.##.##.#",
  "#.##.##.#.#.##.##.#",
  "#.................#",
  "#.##.##.#.#.##.##.#",
  "#.##.##.#.#.##.##.#",
  "#........P........#",
  "#.##.##.#.#.##.##.#",
  "#o...............o#",
  "###################",
] as const;

/** Celdas comestibles del trazado: 189 puntos y 4 píldoras. */
export const DOT_TOTAL = 189;
export const PILL_TOTAL = 4;
```

Las cuentas del trazado, para que no haya que fiarse: son transitables las siete filas
de pasillo completo (1, 4, 7, 11, 14, 17 y 19, diecisiete celdas cada una: 119), las
nueve filas de bloque (2, 3, 5, 6, 12, 13, 15, 16 y 18, con pasillo en las columnas 1,
4, 7, 9, 11, 14 y 17: 63) y las cuatro columnas que bordean la casa en las filas 8, 9
y 10 (12). Total **194 celdas transitables**; menos la celda de salida de Pac-Man, 193
comestibles, de los cuales 4 son píldoras: **189 puntos**. `P` está en la fila 17,
columna 9, y no lleva punto. La puerta `-` de la fila 8 la cruzan los fantasmas y no
Pac-Man; las tres celdas `G` de la fila 9 son la casa y no llevan nada.

El resto del archivo son funciones puras, sin ni una variable mutable:

```ts
export type Dir = "up" | "down" | "left" | "right";

export function tileAt(col: number, row: number): string;
/** `true` para `.`, `o` y `P`. La puerta sólo es transitable si `forGhost`. */
export function walkable(col: number, row: number, forGhost: boolean): boolean;
export function centerOf(col: number, row: number): { x: number; y: number };
export function tileOf(x: number, y: number): { col: number; row: number };
export function step(col: number, row: number, dir: Dir): { col: number; row: number };
export function opposite(dir: Dir): Dir;
/** Las direcciones legales desde una celda, para un fantasma o para Pac-Man. */
export function exits(col: number, row: number, forGhost: boolean): Dir[];
```

**`entities.ts`.** Dos clases, con el `ctx` siempre por parámetro y sin leer nada de
fuera del closure.

```ts
export class Player {
  /** Posición en píxeles del centro. La rejilla se deriva con `tileOf()`. */
  x: number;
  y: number;
  dir: Dir;
  /** El giro pedido; se aplica al pasar por el centro de una celda y se limpia. */
  queued: Dir | null;
  /** Fase de la boca, 0..1, para el sector del `arc`. */
  mouth: number;
  update(dt: number, speed: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export type GhostKind = "chaser" | "ambusher";
export type GhostPhase = "hunt" | "fright" | "dead";

export class Ghost {
  kind: GhostKind;
  x: number;
  y: number;
  dir: Dir;
  phase: GhostPhase;
  /** Cuenta atrás de `GHOST_RESPAWN_MS` mientras `phase === "dead"`. */
  respawn: number;
  /** Decide en cada centro de celda y avanza. `target` llega ya calculado. */
  update(dt: number, speed: number, target: { col: number; row: number }): void;
  draw(ctx: CanvasRenderingContext2D, flashing: boolean): void;
}
```

`queued` existe por la misma razón que en Snake: entre dos centros de celda caben dos
pulsaciones, y sin cola un giro pedido medio píxel antes de tiempo se pierde. Se guarda
**un** giro, y se aplica en cuanto el centro de la entidad esté a menos de
`TURN_TOLERANCE` del centro de una celda cuya salida en esa dirección sea legal.

La decisión de los fantasmas cabe en un párrafo, y ésa es la mitad del argumento de
esta versión: al llegar al centro de una celda, el fantasma mira sus salidas legales,
**descarta la contraria a su dirección actual** —salvo que sea la única, en un
callejón— y se queda con la que **minimiza la distancia euclídea al cuadrado** hasta
su celda objetivo; empate a favor del orden fijo `up`, `left`, `down`, `right`. En
`fright` hace lo contrario: **maximiza** esa distancia, con el mismo desempate. No hay
`Math.random()` en ninguna parte del motor, como en Frogger: dos partidas del mismo
nivel jugadas igual se juegan igual, y una posición se reproduce en la consola sin
montar el juego.

Los dos objetivos, y no hay más IA que ésta:

| Fantasma   | Color     | Objetivo en `hunt`                                                                    |
| ---------- | --------- | ------------------------------------------------------------------------------------- |
| `chaser`   | `#ff006e` | La celda donde está Pac-Man                                                           |
| `ambusher` | `#ff8fbf` | Cuatro celdas por delante de Pac-Man, en su dirección actual, recortadas al laberinto |

**`index.ts`.** El estado de partida, dentro del closure de `mount()`.

```ts
interface Run {
  player: Player;
  ghosts: Ghost[];
  /** Copia mutable del trazado: qué celdas conservan punto o píldora. */
  food: Uint8Array;
  /** Comestibles que quedan; a 0 se despeja la ronda. */
  left: number;
  score: number;
  lives: number;
  level: number;
  /** Milisegundos que quedan de píldora; 0 si no hay ninguna activa. */
  fright: number;
  /** Fantasmas comidos dentro de la píldora actual, índice en `GHOST_POINTS`. */
  chain: number;
  /** Cuenta atrás de `DEATH_MS` mientras `phase === "dying"`. */
  dying: number;
  phase: "ready" | "playing" | "dying" | "gameover";
}
```

`phase` y no `state`, porque `GameState` ya son las tres cifras del HUD. `"ready"` es
todo el mundo quieto en su sitio esperando `ESPACIO`: es la fase con la que empieza la
partida, con la que empieza cada ronda nueva y con la que se vuelve después de perder
una vida.

`food` es un `Uint8Array` de `COLS * ROWS` y no un array de objetos a propósito: se
consulta y se escribe una vez por celda pisada y se recorre entero una vez por frame
para dibujar. Reiniciarlo al despejar la ronda es volver a leer `MAZE`.

**Lo que el motor pinta y lo que no.** El laberinto, los puntos, las píldoras, Pac-Man
y los dos fantasmas. Y una sola palabra: `LISTO`, centrada bajo la casa durante la fase
`ready`, en MAYÚSCULAS y sin tildes, porque no tiene equivalente fuera del canvas. **No
se dibuja** puntuación, vidas, nivel ni `GAME OVER`: eso lo pinta React a veinte
píxeles del canvas, que es la novena regla de `engine-contract.md`.

### La máquina nueva — entrada en `GAMES`

Última del array, sexta posición.

```ts
{
  id: "pacman",
  title: "PACMAN",
  cat: "LABERINTO",
  glow: "#f5ff00",
  playable: true,
  desc: "Come todos los puntos sin que te cacen en el laberinto.",
  long: "El clásico del laberinto, con lo que lo hace reconocible en la primera partida: ciento ochenta y nueve puntos, cuatro píldoras de poder y dos perseguidores que no se equivocan de camino. Uno va directo a por ti y el otro te corta el paso cuatro celdas por delante, así que huir en línea recta no sirve de nada. Morder una píldora invierte la persecución durante siete segundos: los dos se vuelven comestibles y valen doscientos, cuatrocientos, ochocientos y mil seiscientos si los cazas seguidos. Vaciar el laberinto lo repone entero y sube un nivel, y con él la velocidad, hasta una vez y media la del primero. Tres vidas, y ni un túnel por el que escapar: lo que hay es lo que se ve.",
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

| Cifra   | Qué es en Pac-Man                                                   | Rótulo       |
| ------- | ------------------------------------------------------------------- | ------------ |
| `score` | Puntos: 10 por punto, 50 por píldora, 200/400/800/1600 por fantasma | `PUNTUACION` |
| `lives` | Vidas restantes, de 3 a 0. Sólo bajan                               | `VIDAS`      |
| `level` | Ronda, desde 1 y sin tope; sube al vaciar el laberinto              | `NIVEL`      |

`hud: ["PUNTUACION", "VIDAS", "NIVEL"]`, los mismos de Asteroids, Arkanoid, Snake y
Frogger.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('pacman', 'PACMAN', 'LABERINTO', true, 5);
```

Ningún `update`: las cinco filas existentes tienen `sort_order` 0, 1, 2, 3 y 4, así que
el 5 continúa la serie sin tocar nada. No se siembra ninguna marca, igual que en las
SPEC 08, 09, 10 y 14.

## Plan de implementación

Cada paso deja el repo compilando. Los pasos 1 a 5 no los consume nadie: se verifican
con `npm run build` y `npx tsc --noEmit`.

1. **Constantes y trazado.** `lib/games/pacman/constants.ts` con los diecinueve valores
   y la paleta de esta spec, y `lib/games/pacman/maze.ts` con las veintiuna cadenas de
   `MAZE`, `DOT_TOTAL`, `PILL_TOTAL` y las funciones puras de geometría.
   _Verificación:_ `npx tsc --noEmit` pasa, las 21 cadenas miden 19 caracteres y contar
   los `.` y `o` del array da 189 y 4.

2. **Las entidades.** `lib/games/pacman/entities.ts` con `Player` y `Ghost`. `Player`
   sabe avanzar, encolar un giro y aplicarlo al pasar por el centro de una celda;
   `Ghost` sabe decidir en el centro de celda con la regla de la distancia mínima —o
   máxima en `fright`— y avanzar. El `ctx` va siempre por parámetro.
   _Verificación:_ `npx tsc --noEmit` pasa.

3. **El esqueleto de `mount()`.** `lib/games/pacman/index.ts` exporta
   `pacmanGame: GameMount` con su `world` y su `hud`. `mount()` crea el `Run` en el
   closure a partir de `MAZE`, engancha la entrada con `createInput()` y devuelve el
   `GameHandle`. El bucle de `requestAnimationFrame` ya corre con el `dt` recortado a
   `MAX_DT = 0.05`, pero `update` y `draw` están vacíos. **`mount()` emite el estado
   inicial antes de devolver el handle**, para que el `FRESH_RUN` de `PlayCabinet` no
   se vea durante la pantalla de carga. `destroy()` cancela el frame guardado,
   desengancha la entrada y es idempotente con un flag `destroyed`.
   _Verificación:_ `npm run build` pasa; nadie lo monta todavía.

4. **Implementar `update(dt)`.** En `"ready"`, `ESPACIO` pasa a `"playing"`. En
   `"playing"`: mover a Pac-Man con el giro encolado, comer el punto o la píldora de su
   celda —sumando `DOT_POINTS` o `PILL_POINTS`, bajando `left` y, si es píldora,
   poniendo `fright = FRIGHT_MS`, `chain = 0` y **dando la vuelta a los dos
   fantasmas**—, calcular los dos objetivos, mover los fantasmas, descontar `fright` y
   resolver contactos a `CATCH_DIST`. Un contacto en `fright` suma
   `GHOST_POINTS[chain]`, incrementa `chain` con tope en 3 y manda al fantasma a
   `"dead"` con `GHOST_RESPAWN_MS`; un contacto en `hunt` resta una vida y pasa a
   `"dying"`. Al agotarse `dying`: si quedan vidas, todo vuelve a su sitio y la fase es
   `"ready"`, conservando puntuación, nivel y el laberinto tal como estaba; si no,
   `"gameover"`, `onGameOver(score)` **una sola vez** —flag `overSent`, rearmado sólo en
   `restart()`— y el bucle se detiene. Con `left === 0` sube el nivel, se repone `food`
   desde `MAZE` y la fase vuelve a `"ready"`.
   _Verificación:_ `npx tsc --noEmit` pasa.

5. **Implementar `draw()`.** Fondo, los muros del laberinto como `strokeRect` por celda
   —unos 120 por frame, sin halo—, la puerta como una línea, los puntos como
   `fillRect` de 4 px, las píldoras como `arc` de 6 px, Pac-Man como un `arc` con
   sector de boca orientado a `dir` y los fantasmas como cúpula, faldón y dos ojos que
   miran a su dirección. En `fright` se pintan de `COLOR_FRIGHT`, y alternando con
   `COLOR_FRIGHT_FLASH` cuando `fright < FRIGHT_FLASH_MS`. En `"ready"`, la palabra
   `LISTO` bajo la casa. **No se dibuja** ninguna de las tres cifras del HUD ni
   `GAME OVER`.
   _Verificación:_ `npm run build` pasa.

6. **La máquina entra en el vault.** Este paso es **indivisible** y toca cuatro
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

7. **Migración `<sello>_pacman.sql`.** El `insert` de la fila con `sort_order: 5`.
   Aplicar con `npx supabase db push`; **nunca** con `apply_migration` por MCP, que
   iría al proyecto remoto sin dejar rastro en git.
   _Verificación:_ `public.games` tiene 6 filas, `npx supabase migration list` marca la
   migración aplicada, y guardar una marca de Pac-Man no revienta contra la clave
   ajena.

8. **Los textos que contarían mal.** `lib/landing.ts`: `STATS` pasa de `5` a `6`
   máquinas y el `desc` de `FEATURES` nombra a Pac-Man. Y la sexta fila de
   `references/implemented-games.md`, que se alinea a mano porque `.prettierignore`
   excluye `references/` entera.
   _Verificación:_ la portada dice `6 MAQUINAS`, la tarjeta de ventajas nombra a
   Pac-Man y la tabla de `references/` tiene seis filas.

9. **Documentar en `CLAUDE.md`.** Que el vault tiene seis máquinas; que `pacman` es la
   **primera de `LABERINTO`** y con ella las seis categorías de `GameCategory` tienen
   contenido; que es la tercera escrita desde cero y la quinta seguida que no toca el
   contrato; que su equilibrio vive entero en `constants.ts` y su trazado en `maze.ts`,
   así que ajustar la dificultad es cambiar un número; que no hay ni un
   `Math.random()`; y que de las escenas archivadas quedan **tres**, porque `laberinto`
   hizo el viaje a `GameId`.
   _Verificación:_ el apartado existe y nombra `lib/games/pacman/`, sus cuatro archivos
   y las tres escenas archivadas que quedan.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/pacman/constants.ts`, `maze.ts`, `entities.ts` e `index.ts`, y
      ningún archivo más en ese directorio.
- [ ] `lib/games/pacman/` no importa nada de `react`, `next` ni `@/components`.
- [ ] En el ámbito de módulo de `lib/games/pacman/index.ts` no hay ni una variable
      mutable: todo el estado vive en el closure de `mount()`.
- [ ] Montar y destruir dos veces no deja ningún `requestAnimationFrame` vivo ni ningún
      listener en `window`; `destroy()` llamado dos veces no rompe nada.
- [ ] `grep -n "Math.random" lib/games/pacman/` no devuelve nada.
- [ ] Las 21 cadenas de `MAZE` miden 19 caracteres y todas son palíndromas.
- [ ] Contar los `.` y los `o` de `MAZE` da exactamente 189 y 4, y coincide con
      `DOT_TOTAL` y `PILL_TOTAL`.
- [ ] Desde la celda de salida se llega a las 194 celdas transitables: ninguna queda
      aislada.
- [ ] Pac-Man no atraviesa ningún muro ni la puerta de la casa; los fantasmas sí cruzan
      la puerta.
- [ ] Un giro pedido antes de llegar a la esquina se aplica al pasar por el centro de la
      celda, y se descarta si la salida no es legal.
- [ ] Comer un punto suma 10 y comer una píldora suma 50.
- [ ] Comer una píldora da la vuelta a los dos fantasmas en el mismo frame y los pone
      azules durante 7 segundos.
- [ ] Los dos fantasmas parpadean durante los 2 últimos segundos de la píldora.
- [ ] Comer los dos fantasmas dentro de la misma píldora suma 200 y luego 400; la
      cadena se reinicia con la píldora siguiente.
- [ ] Un fantasma comido reaparece en la casa exactamente 3 segundos después.
- [ ] El fantasma `chaser` va a la celda de Pac-Man y el `ambusher` a cuatro celdas por
      delante: con Pac-Man quieto en un pasillo largo, uno llega por detrás y el otro se
      pone delante.
- [ ] Ningún fantasma da media vuelta en mitad de un pasillo salvo al morder una
      píldora o en un callejón sin salida.
- [ ] Tocar un fantasma en `hunt` resta una vida; tocarlo en `fright` no.
- [ ] Al perder una vida se conservan puntuación, nivel y los puntos ya comidos.
- [ ] Vaciar el laberinto sube el nivel, repone los 189 puntos y las 4 píldoras y
      vuelve a la fase `LISTO`.
- [ ] Del nivel 1 al 8 todo va más rápido; en el 8 se toca el tope y el 9 corre igual
      que el 8.
- [ ] Perder la tercera vida dispara `onGameOver` exactamente una vez y detiene el
      bucle.
- [ ] Dos partidas con la misma secuencia de teclas producen la misma posición de los
      fantasmas frame a frame.
- [ ] El canvas **no** pinta `PUNTUACION`, `VIDAS`, `NIVEL` ni `GAME OVER`; lo único
      escrito es `LISTO`, en mayúsculas y sin tildes.

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
- [ ] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia.
- [ ] `PAUSA` congela el canvas y `SEGUIR` reanuda en el mismo punto, con la cuenta de
      la píldora parada mientras tanto.
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
- [ ] `specs/game-jam/pacman/spec-completa.md` sigue en disco sin implementar, o se ha
      borrado el directorio de la jam al mudar esta spec a `specs/NN-<slug>.md`.

**Documentación**

- [ ] `CLAUDE.md` dice que el vault tiene seis máquinas y que `pacman` es la primera de
      `LABERINTO`.
- [ ] `CLAUDE.md` dice que con esta máquina las seis categorías de `GameCategory` tienen
      contenido.
- [ ] `CLAUDE.md` dice que el equilibrio vive en `lib/games/pacman/constants.ts` y el
      trazado en `maze.ts`, y que el motor no tiene ni un `Math.random()`.
- [ ] `CLAUDE.md` dice que quedan **tres** escenas archivadas en `lib/preview-art.ts`.

## Decisiones tomadas y descartadas

**Por qué este alcance**

- **Sí:** dos fantasmas y no cuatro. Compra un motor que se lee de una sentada y cuyo
  comportamiento se puede validar a ojo: dos objetivos, una regla de decisión y un modo
  de susto. `game-planner` le puso a Pac-Man un C10 de 0 —«pide IA de varios
  agentes»—, y ésta es la versión que rebaja esa nota a algo parecido a un 2. Se pierde
  la sensación de cerco de los cuatro del salón, que es de verdad lo que hace grande al
  original: con dos, un jugador con oficio no se ve nunca rodeado. Lo que se paga está
  desarrollado en `specs/game-jam/pacman/spec-completa.md`.
- **Sí:** persecución permanente, sin dispersión. Compra que no haya tabla de fases ni
  archivo `levels.ts`. Se pierde el respiro de los siete segundos de `scatter`, que es
  lo que en el arcade deja recoger las esquinas: aquí, el jugador que quiera las
  esquinas se las gana él.
- **No:** el túnel lateral. Es barato de implementar —dos celdas y un salto de
  coordenada— pero no es barato de equilibrar: sin frenado de los fantasmas dentro es
  un pasillo gratis, y con frenado hace falta la velocidad de túnel, que es una cifra
  más de una tabla que esta versión no tiene. Se pierde la vía de escape más
  característica del laberinto.
- **No:** frutas, vida extra y tabla de niveles. Son las tres cosas que alargan la vida
  de la máquina y ninguna cambia el verbo. Se pierde el techo de puntuación alto: aquí
  una ronda vale como mucho 2090 puntos más los fantasmas, así que el top 10 mide sobre
  todo cuántas rondas se aguanta.
- **Sí:** esta versión entra en una tarde y se revisa de una sentada. Es exactamente el
  reparto de archivos de Snake —cuatro—, con la misma clase de constantes juntas en un
  archivo.

**El origen del juego**

- **Sí:** el motor se escribe desde cero. No hay original que portar en
  `references/started-games/`, así que no hay ni una de las cuatro cosas que matar de
  un `game.js`. Se pierde lo que un puerto regala, un equilibrio ya probado; a cambio,
  las cifras se fijan aquí y se ajustan jugando sin tocar el motor.
- **Sí:** los diecinueve números quedan congelados en esta spec. Es el sustituto de la
  regla «copia literal del original» que siguieron Tetris y Arkanoid, y lo mismo que
  hicieron SPEC 10 y SPEC 14.
- **Sí:** el trazado del laberinto va **literal en la spec**, con su recuento
  verificable. Un trazado descrito en prosa lo reinventa quien implementa, y entonces
  `DOT_TOTAL` deja de significar nada. Se pierden veintiuna líneas de spec; se gana que
  el criterio «contar los `.` da 189» sea comprobable.
- **No:** copiar el trazado de 28 × 31 del arcade. Es el que todo el mundo reconoce, pero
  transcribirlo de memoria es la clase de error que nadie revisa, y su casa de fantasmas
  con cámaras laterales sólo tiene sentido con cuatro inquilinos. Se pierde la silueta
  exacta del original.
- **Sí:** rejilla de 19 × 21 con celda de 24, o sea 456 × 504. Proporción 0,90, casi la
  del arcade vertical, y menos alto que el mundo de Tetris (420 × 600), que ya entra en
  el gabinete sin encogerse en portátiles.

**El juego**

- **Sí:** `level` sube al vaciar el laberinto. C1 permite dejarlo fijo en 1 y declararlo
  como decisión, y aquí no hace falta: Pac-Man tiene un final de ronda natural y
  reponer el laberinto cuesta releer `MAZE`. Se gana la tercera cifra del HUD diciendo
  algo real en la versión barata.
- **Sí:** la velocidad sube un 6 % por nivel con tope en 1,5. Es la única progresión que
  hay, y con ella el nivel 8 ya corre a 144 px/s. Se pierde el escalonado del arcade,
  donde Pac-Man y los fantasmas suben a ritmos distintos y el jugador es más rápido que
  ellos en los primeros niveles.
- **Sí:** los fantasmas eligen por distancia euclídea al cuadrado, con desempate fijo
  `up`, `left`, `down`, `right`. Es la regla del original y no cuesta más que cualquier
  otra. Se gana que la persecución sea legible: el jugador aprende a predecirla.
- **Sí:** cero `Math.random()`. Es lo que hizo Frogger en SPEC 14, y aquí compra que una
  muerte se pueda reproducir para saber si fue del jugador o del motor. Se pierde la
  variedad entre partidas de un mismo nivel: dos partidas idénticas se juegan idénticas.
- **No:** el modo `fright` con movimiento pseudoaleatorio, como el arcade. Sin
  `Math.random()` habría que sembrar un generador desde `run.t`, y maximizar la
  distancia ya produce una huida creíble. Se pierde que los fantasmas asustados sean
  impredecibles: aquí se les acorrala con un poco de oficio.
- **Sí:** al morder una píldora los fantasmas dan media vuelta. Es lo que hace que la
  píldora se sienta como un vuelco y no como un cambio de color. Se pierde nada; cuesta
  una línea.
- **Sí:** al perder una vida se conservan puntuación, nivel **y los puntos ya comidos**.
  Perder duele sin borrar el progreso de la ronda. Se pierde tensión al final de una
  ronda casi vacía, donde morir cuesta poco.
- **No:** reponer el laberinto al perder una vida. Convierte tres vidas en tres
  partidas cortas pegadas, que es lo mismo que se descartó en SPEC 10.
- **Sí:** contacto a `CATCH_DIST = 12`, media celda entre centros. Con la comprobación
  por celda ocupada, un fantasma y Pac-Man se cruzan sin tocarse cuando van en
  direcciones opuestas y comparten frontera; la distancia lo evita.
- **No:** el _cornering_ del original, recortar la esquina antes del centro de celda. Es
  un detalle de tacto que exige mover en dos ejes a la vez durante unos frames. Se
  pierde algo de fluidez al girar; se gana un `update` que cabe en la cabeza.

**La identidad**

- **Sí:** el id es `pacman`, el nombre real del juego, en minúsculas y sin guion. Es la
  misma regla que trajo `tetris`, `arkanoid`, `snake` y `frogger`.
- **No:** reutilizar `laberinto` como id. Es un nombre de fantasía de SPEC 01, no de
  máquina, y además colapsaría la unión `PreviewId` sin que `tsc` avisara del punto de
  contacto sin hacer.
- **Sí:** `cat: "LABERINTO"`, que estrena la sexta y última categoría sin usar. Es el
  hueco que `game-planner` premia con un C8 de 3, y deja el filtro de `/biblioteca` sin
  opciones muertas.
- **Sí:** amarillo `#f5ff00`, repitiendo con Asteroids. Sólo hay tres neones y ésta es
  la sexta máquina: la repetición era inevitable, y el amarillo es el color de Pac-Man
  y el que ya usa la escena archivada.
- **Sí:** la escena `laberinto` **se mueve** a `GameId`. Copiarla compila igual y deja
  dos escenas divergiendo; es la regla escrita en SPEC 07 y en la cabecera del propio
  archivo, y la siguieron las cuatro que hicieron el viaje.

**El mando**

- **Sí:** `ESPACIO` arranca la ronda y Pac-Man nace quieto. Es lo que hicieron Arkanoid
  con la bola, Snake con la serpiente y Frogger con la rana, y resuelve el mismo
  problema: reaparecer en marcha con dos fantasmas encima es morir antes de reaccionar.
  De paso deja los cinco botones vivos, como Snake y Frogger.
- **No:** `ESPACIO` deshabilitado, con arranque automático tras un temporizador. Es más
  barato y deja un botón muerto en una máquina que puede usarlo.
- **No:** una tecla de pausa propia en el motor. `PAUSA` es del gabinete, y una tecla
  fuera de las cinco haría scroll de la página, porque `lib/games/input.ts` sólo hace
  `preventDefault` de esas cinco.

**Lo que no se toca**

- **No:** extender `GameMount` ni `GameCallbacks`. Los tres rótulos dicen la verdad y el
  dibujo no espera a ningún archivo; es la quinta máquina seguida que entra sin tocar
  el contrato.
- **Sí:** `initialTab` del salón se queda en `?? "asteroids"`. `asteroids` sigue en el
  catálogo, así que el fallback vale; cambiarlo sería decidir que el salón abre en la
  máquina más nueva, y eso no es lo que pide esta spec.
- **Sí:** los dos textos de `lib/landing.ts` se actualizan a mano. SPEC 07 los desacopló
  de `GAMES.length` a propósito, así que nadie avisa si se quedan mintiendo.
- **No:** cachear el laberinto en un canvas auxiliar. Con 19 × 21 celdas son unos 120
  `strokeRect` por frame sin halo, que cabe de sobra en el presupuesto; el caché es una
  optimización de la versión completa, y aquí sería complejidad sin medición que la
  justifique. Si algún día va a tirones, eso es trabajo de
  `game-performance-booster`, con su medición antes y después.
- **No:** las tres skins. El motor entra con su paleta `clasico` y lo viste
  `skin-designer` en su ronda, que es el reparto que el repo ya tiene escrito.
- **No:** sonido. Ningún motor del vault suena, y meter audio arrastra mute, volumen y
  desbloqueo del `AudioContext`.

## Riesgos

| Riesgo                                                                                                                                                                                                                                                                                  | Mitigación                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alguien implementa **las dos** specs de esta jam, o la completa encima de ésta. Los dos `insert` de `public.games` llevan el mismo `id` y el mismo `sort_order`, así que el segundo revienta contra la clave primaria, y antes de eso `GameId` tendría el literal `"pacman"` duplicado. | Son excluyentes y así está declarado en el encabezado. Aprobar una **cierra** la otra: al mudar la elegida a `specs/NN-<slug>.md` se borra el directorio `specs/game-jam/pacman/` entero, y hay un criterio de aceptación que lo comprueba.                                                            |
| La escena `laberinto` la reclama también `specs/game-jam/amidar/`, con el mismo `sort_order: 5`. Sólo puede viajar una vez, y las dos jams la dan por suya.                                                                                                                             | El aviso 1 de la ronda del 2026-08-12 en `.claude/game-planner/memoria.md` ya lo dice: ocho candidatos piden esa escena. La primera que se apruebe se la lleva; la otra jam pasa a necesitar un `case` nuevo y su `sort_order` sube a 6. No es un choque de esta spec, es una consecuencia de aprobar. |
| El equilibrio está fijado sobre el papel: 96 px/s puede resultar soso, la píldora de 7 s puede ser demasiado generosa, y el 6 % por nivel puede subir demasiado despacio.                                                                                                               | Los diecinueve números viven juntos en `constants.ts` y se ajustan sin tocar el motor, igual que en SPEC 10 y SPEC 14. El marcador arranca vacío para esta máquina, así que un reajuste temprano no invalida ninguna marca real.                                                                       |
| Con dos fantasmas persiguiendo siempre y sin túnel, el laberinto puede resultar imposible de vaciar en niveles altos: los dos convergen y no hay escape.                                                                                                                                | El tope `SPEED_MAX = 1.5` y que el fantasma sea más lento que Pac-Man en todos los niveles —88 contra 96, y el multiplicador es el mismo para los dos— dejan siempre margen de fuga. El criterio «del nivel 1 al 8 todo va más rápido; en el 8 se toca el tope» es el que obliga a comprobarlo.        |
| El trazado copiado a mano trae una fila de 18 o 20 caracteres, o una celda aislada, y el motor se comporta raro sin romper el build.                                                                                                                                                    | Tres criterios de aceptación: las 21 cadenas miden 19, todas son palíndromas, y contar `.` y `o` da 189 y 4. Más el criterio de conectividad desde la celda de salida.                                                                                                                                 |
| El paso 6 se trocea «para que sea más granular» y deja el repo o una ruta pública rota entre commits.                                                                                                                                                                                   | Está escrito como indivisible en el propio paso, con la razón: `GameId` no compila sin `GAMES` ni sin el `case` de `drawPreview()`, y `ENGINES` decide si `/jugar/pacman` enseña algo. Es el mismo razonamiento del paso 2 de SPEC 07.                                                                 |
| `laberinto` se queda en `ArchivedPreviewId` además de entrar por `GameId`: compila igual y deja dos escenas divergiendo.                                                                                                                                                                | Un criterio lo comprueba con `grep`: el id debe aparecer cero veces en `lib/preview-art.ts`, y `ArchivedPreviewId` quedarse con tres miembros.                                                                                                                                                         |
| Guardar la primera marca de Pac-Man revienta contra la clave ajena si el paso 7 no se aplicó.                                                                                                                                                                                           | El paso 7 va inmediatamente después del 6 y su verificación es exactamente ésa: guardar una marca. Entre los dos pasos la máquina se juega y sólo falla al terminar.                                                                                                                                   |
| Alguien lee esta spec como «la completa recortada» y le añade un tercer fantasma o el túnel al implementarla.                                                                                                                                                                           | El alcance es la decisión, no un límite provisional: lo que falta está desarrollado en la spec hermana, y añadirlo aquí es implementar la otra a medias. La sección «Fuera de alcance» nombra cada pieza y dónde vive.                                                                                 |

## Lo que **no** entra en esta spec

- Los otros dos fantasmas y sus personalidades.
- La alternancia de dispersión y caza, y la tabla de fases por nivel.
- El túnel lateral y la ralentización dentro de él.
- Los ojos que vuelven a la casa y la congelación al comer un fantasma.
- Las frutas, su tabla de valores y la vida extra a los diez mil.
- La tabla de velocidades por nivel del arcade y el Cruise Elroy.
- La animación de muerte y las pantallas de intermedio.
- El _cornering_ al girar.
- Las tres skins de la máquina, que son trabajo de `skin-designer`.
- Sonido, aquí y en las otras cinco máquinas.
- Autenticación, antitrampas, moderación, realtime y paginación del marcador.
- Tests.

Cada una de esas, si llega, va en su propia spec.
