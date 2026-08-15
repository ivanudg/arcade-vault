# GAME JAM · FROGGER — version completa: rondas infinitas, cronometro y la fauna del rio

> **Estado:** Aprobada
> **Alternativa de:** `specs/game-jam/frogger/spec-minima.md`. Se implementa una de las dos, nunca las dos.
> **Depende de:** SPEC 05, SPEC 07
> **Fecha:** 2026-08-13
> **Objetivo:** Añadir `frogger` como quinta máquina del vault con el juego entero dentro del contrato: rondas infinitas que aceleran, cronómetro por travesía con bonus, camiones, tortugas que se sumergen, cocodrilo en las casas, mosca bonus, dama-rana y serpiente en la mediana.

## Por qué existe esta spec

Frogger no está en `references/started-games/`. Ese directorio se agotó con
Arkanoid y hoy sólo contiene un `.DS_Store`, y `references/source-assets/` no
existe. **No hay original que portar**: no hay un `game.js` del que matar las
cuatro cosas que un juego de navegador hace y que no sobreviven a montarse y
desmontarse, y tampoco hay un equilibrio ya probado del que copiar los números.
Es el caso de Snake en SPEC 10, con la diferencia de que allí al menos venía un
atlas de sprites. Aquí no viene nada: **el motor y sus cifras se escriben
enteros, y las cifras las fija esta spec** para que `/spec-impl` las copie sin
reinterpretar, exactamente como copiaría las de un original.

Lo que se decide aquí y no se adivina leyendo el resultado son tres cosas.

**La primera: el alcance.** Esta versión mete el juego entero, y «entero»
significa siete sistemas que la versión mínima no tiene —rondas que aceleran,
cronómetro por travesía, dos tamaños de vehículo, tortugas que se sumergen,
cocodrilo asomando en un nicho, mosca bonus y dama-rana, y una serpiente
patrullando la mediana— más una fase de muerte y un salto animado. Frogger sin
eso se juega tres veces; con eso, la ronda 6 es un juego distinto de la 1, que es
la única forma de que un top 10 signifique algo. Lo que cuesta está medido: cinco
archivos en vez de tres, unas treinta constantes más y el doble de criterios de
aceptación. La versión barata existe y está escrita al lado, en
`specs/game-jam/frogger/spec-minima.md`; lo que cada una compra y paga frente a
la otra está en «Decisiones tomadas y descartadas».

**La segunda: el cronómetro no entra en el HUD.** Frogger da 30 segundos por
travesía y paga por cada segundo que sobra, así que el tiempo es información de
juego permanente. Pero `GameState` son tres cifras y ya están dichas —puntuación,
vidas y ronda—, y el contrato no se extiende por comodidad. La salida es la
novena regla de `engine-contract.md`: el motor no pinta el HUD, pero **sí** pinta
lo que no tiene equivalente fuera, como la barra de potenciador de Asteroids. El
cronómetro es una barra en el canvas, bajo la fila de casas, y por eso esta
versión **no toca `lib/games/engine.ts` ni depende de SPEC 08**: sus tres rótulos
son los de Asteroids, Arkanoid y Snake, y sería la cuarta máquina seguida que
entra sin tocar el contrato.

**La tercera: nada de esto necesita assets.** Las tortugas son tres `arc`, el
cocodrilo son dos triángulos y una fila de dientes, el camión son dos `fillRect`
y la mosca es un punto que parpadea. Es deliberado: SPEC 10 abrió la puerta a
cargar un binario y la dejó explícitamente acotada a Snake, y una máquina que
necesitara **esperar** a un archivo pediría otro contrato. Ésta no lo pide.

La miniatura, además, sale gratis. `lib/preview-art.ts` guarda desde SPEC 07 una
escena archivada llamada `corredor`: seis bandas horizontales magenta que son una
autopista, un suelo, dos bloques cian y una figura amarilla con su rastro. Es una
travesía de carriles, ya dibujada. Se **mueve** a `GameId` —sale de
`ArchivedPreviewId` y su `case` se renombra—, que es la regla que ya siguieron
Tetris, Arkanoid y Snake.

## Alcance

**Dentro:**

- **`lib/games/frogger/constants.ts`**: mundo, rejilla, filas con nombre, vidas,
  la tabla de puntuación, los tiempos del cronómetro, los ciclos de tortuga,
  cocodrilo, mosca y dama-rana, y las rondas desde las que aparece cada cosa.
  Valores nuevos, fijados en esta spec.
- **`lib/games/frogger/lanes.ts`**: la tabla base de los diez carriles y
  `lanesForRound(round)`, la función pura que le aplica el multiplicador de
  velocidad y decide qué carriles llevan camiones o tortugas.
- **`lib/games/frogger/math.ts`**: `wrapSpan`, `overlap` y `cycleAt`, puras y sin
  estado.
- **`lib/games/frogger/entities.ts`**: `Frog`, `Lane`, `Homes`, `Snake` y
  `Bonus`, clases tipadas con el `ctx` siempre por parámetro.
- **`lib/games/frogger/index.ts`**: `froggerGame: GameMount` con
  `world: { width: 600, height: 520 }` y `hud: ["PUNTUACION", "VIDAS", "NIVEL"]`.
  El `Run`, el bucle y el `GameHandle` viven en el closure de `mount()`.
- **`lib/games/engines.ts`**: una línea, `frogger: froggerGame`.
- **`lib/games.ts`**: `"frogger"` en `GameId` y su entrada al final de `GAMES`,
  con `cat: "REFLEJOS"` y `glow: "#ff006e"`.
- **`components/play-cabinet.tsx`**: una línea en `ENGINE_KEYS` con los **cinco**
  códigos. Es la segunda máquina del vault que usa el mando entero, después de
  Snake.
- **`lib/preview-art.ts`**: `corredor` sale de `ArchivedPreviewId` y su `case` se
  renombra a `"frogger"`. La aritmética de la escena no se toca.
- **`supabase/migrations/<sello>_frogger.sql`**: `insert` de la fila `frogger` en
  `public.games` con `sort_order: 4`.
- **`lib/landing.ts`**: `STATS` pasa de `4` a `5` máquinas y el `desc` de
  `FEATURES` nombra a Frogger.
- **`references/implemented-games.md`**: la quinta fila de la tabla.
- **Apartado en `CLAUDE.md`**: la quinta máquina, la primera de `REFLEJOS`, que el
  cronómetro se pinta en el canvas y no en el HUD, y que quedan cuatro escenas
  archivadas.

**Fuera de alcance (para futuras specs):**

- **Los cinco carriles fijos.** El reparto de zonas es siempre el mismo —cinco de
  carretera, mediana, cinco de río, casas—: lo que cambia por ronda es la
  velocidad y el contenido de cada carril, no su disposición. Un generador de
  disposiciones es otra spec.
- **Un editor o unos niveles con datos externos.** `lanesForRound()` es una
  función pura de un número; no se lee ningún archivo.
- **La segunda pantalla del arcade**, con la fila extra de tortugas
  bidireccionales de las versiones tardías.
- **Modo contrarreloj o modo práctica.** Una sola modalidad, sin selector.
- **Récords por ronda alcanzada.** El marcador guarda un entero, y ese entero es
  la puntuación.
- **Sonido**, aquí y en las otras cuatro máquinas. Falla el criterio C4 de la
  rúbrica sólo si el sonido es información de juego; en Frogger la mosca y el
  cocodrilo se ven, así que no lo es. Pero meterlo arrastra mute, volumen y
  desbloqueo del `AudioContext`.
- **Assets.** No se carga ni un archivo: todo son primitivas de canvas y `mount()`
  sigue siendo síncrono. `public/` conserva su único contenido, el atlas de Snake.
- **Autenticación, antitrampas, realtime y paginación del marcador.** Igual que en
  SPEC 06, SPEC 09 y SPEC 10.
- **Tests.** El repo sigue sin framework y esta spec no lo introduce.
- **Tocar `references/started-games/`.** Es material de referencia: se lee, no se
  edita. Aquí ni siquiera hay nada que leer.

## Modelo de datos

El contrato de SPEC 05 no cambia y el esquema de SPEC 06 tampoco. Lo que aparece
es un motor nuevo, una entrada de catálogo y una fila.

### El motor — `lib/games/frogger/`

Son **cinco** archivos, el mismo reparto que Snake. `lanes.ts` existe porque la
tabla de carriles deja de ser una constante y pasa a ser una función de la ronda,
y meter esa función en `constants.ts` mezclaría datos con lógica.

**`constants.ts`.** Las cifras se fijan aquí y no se reinterpretan al implementar.

```ts
/** Rejilla de 15 × 13 celdas de 40 px. El mundo es apaisado, no vertical. */
export const CELL = 40;
export const COLS = 15;
export const ROWS = 13;
export const W = 600; // COLS * CELL
export const H = 520; // ROWS * CELL

/** Las trece filas, de arriba abajo. Son índices, no píxeles. */
export const ROW_HOMES = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOTTOM = 5;
export const ROW_MEDIAN = 6;
export const ROW_ROAD_TOP = 7;
export const ROW_ROAD_BOTTOM = 11;
export const ROW_START = 12;

export const LIVES = 3;
export const HOMES = 5;
export const HOME_COLS: readonly number[] = [1, 4, 7, 10, 13];
export const START_COL = 7;

/** Puntuación. Todo entero: `public.scores.score` lo es. */
export const POINTS_ROW = 10; // por fila nueva de la travesía
export const POINTS_HOME = 50; // por ocupar un nicho libre
export const POINTS_TIME = 10; // por segundo entero que sobra al llegar
export const POINTS_ROUND = 200; // por completar los cinco nichos
export const POINTS_FLY = 200; // por entrar en el nicho con la mosca
export const POINTS_LADY = 200; // por llegar a casa escoltando a la dama-rana

/** Cronómetro por travesía, en segundos. */
export const TIME_START = 30;
export const TIME_STEP = 2; // se acorta cada ronda
export const TIME_MIN = 20; // suelo: la ronda 6 ya no acorta más

/** Multiplicador de velocidad de los carriles, acumulado por ronda. */
export const SPEED_STEP = 1.12;
export const SPEED_MAX = 2.2; // se alcanza en la ronda 8 y ahí se queda

/** Ritmos, en segundos. */
export const HOP_MS = 110; // duración del salto animado
export const DEATH_MS = 800; // la fase `"dead"` antes de reaparecer
export const DIVE_CYCLE = 4.0; // ciclo completo de una tortuga
export const DIVE_DOWN = 1.2; // cuánto pasa sumergida al final del ciclo
export const GATOR_CYCLE = 10.0; // ciclo del cocodrilo de las casas
export const GATOR_OPEN = 4.0; // cuánto asoma dentro de ese ciclo
export const FLY_EVERY = 12.0; // cada cuánto sale la mosca
export const FLY_LASTS = 5.0; // cuánto se queda
export const LADY_EVERY = 20.0; // cada cuánto sale la dama-rana
export const SNAKE_SPEED = 60; // px/s de la serpiente de la mediana

/** Ronda a partir de la cual aparece cada cosa. La 1 es limpia a propósito. */
export const TRUCKS_FROM = 2;
export const DIVERS_FROM = 2;
export const LADY_FROM = 2;
export const GATOR_FROM = 3;
export const SNAKE_FROM = 3;

/** Indulgencia de colisión, en píxeles por lado. Sin ella, rozar mata. */
export const HIT_PAD = 6;

export const COLOR_ROAD = "#0a0a0f";
export const COLOR_LANE_LINE = "rgba(255,0,110,0.16)";
export const COLOR_WATER = "rgba(0,245,255,0.10)";
export const COLOR_BANK = "#ff006e";
export const COLOR_CAR = "#ff006e";
export const COLOR_TRUCK = "rgba(255,0,110,0.7)";
export const COLOR_LOG = "#00f5ff";
export const COLOR_TURTLE = "rgba(0,245,255,0.75)";
export const COLOR_TURTLE_DIVING = "rgba(0,245,255,0.25)";
export const COLOR_FROG = "#f5ff00";
export const COLOR_LADY = "#ff006e";
export const COLOR_GATOR = "rgba(245,255,0,0.85)";
export const COLOR_HOME = "rgba(0,245,255,0.45)";
export const COLOR_TIMER = "#f5ff00";
export const COLOR_TIMER_LOW = "#ff006e";
```

**`lanes.ts`.** La tabla base y la función que la ajusta a la ronda.

```ts
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

/** Pura. `round` empieza en 1. No lee ni escribe nada de fuera. */
export function lanesForRound(round: number): LaneSpec[];
```

`lanesForRound(round)` hace exactamente tres cosas, y ninguna más:

1. Multiplica cada `speed` por `min(SPEED_STEP ** (round - 1), SPEED_MAX)`.
2. Si `round < TRUCKS_FROM`, convierte el carril `truck` en `car` de `len: 1`.
3. Si `round < DIVERS_FROM`, pone `dives: false` en todos los carriles `turtle`.

Así la ronda 1 es la travesía limpia —coches iguales, plataformas que no
traicionan— y a partir de la 2 el tablero empieza a mentir.

**La fórmula del carril.** La entidad `i` de un carril está, en el instante `t`
segundos desde que arrancó la **ronda**, en

```
span = W + len * CELL
x(i) = ((offset + i * span / count + speed * t) mod span + span) mod span - len * CELL
```

`span` es la longitud del ciclo: un poco más ancha que la pantalla, para que una
entidad termine de salir por un borde antes de volver a entrar por el otro. El
doble módulo está escrito así a propósito, porque el `%` de JavaScript devuelve
negativo con dividendo negativo y los carriles con `speed < 0` lo producen desde
el primer segundo. **No hay `Math.random()` en ninguna parte** del motor: los
carriles, el ciclo de las tortugas, el del cocodrilo, la mosca y la dama-rana son
funciones del tiempo y de la ronda, así que dos partidas idénticas se juegan
igual y una posición se reproduce en la consola sin montar el juego.

Una tortuga del grupo `dives` está sumergida cuando
`cycleAt(t, DIVE_CYCLE) > DIVE_CYCLE - DIVE_DOWN`, con medio segundo de
transparencia previa que la delata: sumergida no sostiene, y pisarla es agua. Los
grupos de un mismo carril no se sumergen a la vez —cada grupo `i` desfasa su
ciclo en `i * DIVE_CYCLE / count`—, porque si lo hicieran el carril entero sería
intransitable durante 1,2 s.

**`math.ts`.** Tres funciones puras, sin estado:

```ts
/** El doble módulo de la fórmula del carril, en un sitio y no en diez. */
export function wrapSpan(v: number, span: number): number;
/** Solape de dos segmentos `[a, a + la]` y `[b, b + lb]`. */
export function overlap(a: number, la: number, b: number, lb: number): boolean;
/** Posición dentro de un ciclo: `((t % c) + c) % c`. */
export function cycleAt(t: number, c: number): number;
```

**`entities.ts`.** Cinco clases, con el `ctx` siempre por parámetro.

```ts
export class Lane {
  readonly spec: LaneSpec;
  positions(t: number): number[];
  /** ¿Solapa el rectángulo `[x, x + CELL]` algún vehículo? Con `HIT_PAD`. */
  hits(t: number, x: number): boolean;
  /** Extremo izquierdo de la plataforma **sólida** bajo el centro, o `null`. */
  carrier(t: number, x: number): number | null;
  draw(ctx: CanvasRenderingContext2D, t: number): void;
}

export class Frog {
  /** Píxel continuo del borde izquierdo: la plataforma la arrastra. */
  x: number;
  row: number;
  /** Fila más alta alcanzada en esta travesía; base de los puntos por avance. */
  best: number;
  /** Salto en curso: origen, destino y progreso 0→1. `null` si está quieta. */
  hop: { fromX: number; fromRow: number; toX: number; toRow: number; k: number } | null;
  /** ¿Lleva la dama-rana encima? Vale `POINTS_LADY` al llegar a casa. */
  escorting: boolean;
  snap(): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class Homes {
  /** Los cinco nichos: `true` si ya tienen rana. */
  filled: boolean[];
  /** Índice del nicho con cocodrilo ahora mismo, o `null`. */
  gatorAt(t: number, round: number): number | null;
  /** Índice del nicho con mosca ahora mismo, o `null`. */
  flyAt(t: number, round: number): number | null;
  draw(ctx: CanvasRenderingContext2D, t: number, round: number): void;
}

export class Snake {
  /** Patrulla la mediana de lado a lado. Sólo existe desde `SNAKE_FROM`. */
  x: number;
  dir: 1 | -1;
  update(dt: number, mult: number): void;
  hits(x: number): boolean;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class Bonus {
  /** La dama-rana esperando en un tronco del carril de la fila 3. */
  active: boolean;
  laneX: number;
  update(t: number, round: number, lane: Lane): void;
  draw(ctx: CanvasRenderingContext2D): void;
}
```

`hits()` compara con `HIT_PAD` de margen a cada lado de la rana: rozar la esquina
de un coche no mata. `carrier()` es más estricto y usa el **centro** de la rana:
si el centro no cae dentro de una plataforma sólida —tronco, o tortuga no
sumergida—, la rana está en el agua. Las dos reglas son distintas a propósito,
porque el error que producen es distinto: en carretera la injusticia es morir sin
tocar; en el río, ahogarse pareciendo estar encima.

**`index.ts`.** El estado de partida, dentro del closure de `mount()`.

```ts
interface Run {
  frog: Frog;
  lanes: Lane[];
  homes: Homes;
  snake: Snake | null;
  bonus: Bonus;
  /** Segundos desde que arrancó **la ronda**. Mueve carriles, tortugas y fauna. */
  t: number;
  /** Segundos que quedan de la travesía en curso. */
  time: number;
  score: number;
  lives: number;
  /** Ronda, desde 1. Es la tercera cifra del HUD. */
  round: number;
  /** Segundos restantes de la fase actual, cuando la fase tiene duración. */
  timer: number;
  phase: "ready" | "playing" | "dead" | "gameover";
}
```

`phase` y no `state`, porque `GameState` ya son las tres cifras del HUD.
`"ready"` es la rana quieta en la acera con el cronómetro parado, esperando
`ESPACIO`: es la fase con la que empieza la partida y también cada vida después
de perder una. `"dead"` dura `DEATH_MS` y sirve para que se vea **qué** te mató
antes de reaparecer; llegar a casa **no** pasa por `"ready"`, porque parar cinco
veces por ronda sería un peaje.

### La máquina nueva — entrada en `GAMES`

Última del array, quinta posición.

```ts
{
  id: "frogger",
  title: "FROGGER",
  cat: "REFLEJOS",
  glow: "#ff006e",
  playable: true,
  desc: "Cruza el trafico y el rio y llena las casas ronda tras ronda.",
  long: "El clásico de la rana, con todo lo que traía el salón. Abajo, cinco carriles de coches y camiones; arriba, cinco de río donde el agua mata y las plataformas te arrastran, y donde una de cada dos tortugas se sumerge justo cuando te has subido. Treinta segundos por travesía, y cada segundo que sobra vale diez puntos. Llenar los cinco nichos empieza otra ronda: todo va un doce por ciento más rápido y hay dos segundos menos, hasta más del doble de velocidad. Desde la tercera ronda un cocodrilo asoma en las casas y una serpiente patrulla la mediana. La mosca vale doscientos, y escoltar a la dama-rana hasta casa, otros doscientos.",
  controls: "Flechas ← ↑ → ↓ saltan · ESPACIO sale de la orilla",
}
```

`REFLEJOS` **estrena la quinta categoría con contenido**: de los seis valores de
`GameCategory` sólo quedaría `LABERINTO` sin usar, así que el filtro de
`/biblioteca` pasa de cuatro opciones vivas a cinco. El magenta repite con
Arkanoid, que es inevitable —hay tres neones y ésta es la quinta máquina— y es el
color que ya usa la escena `corredor` para su autopista y su suelo, así que la
tarjeta y su miniatura no se pelean. Las siluetas no se confunden: bandas
horizontales con una figura subiendo frente a un muro de bloques.

### El HUD y las tres cifras

| Cifra   | Qué es en esta versión                                          | Rótulo       |
| ------- | --------------------------------------------------------------- | ------------ |
| `score` | Puntos: filas, casas, tiempo sobrante, ronda, mosca y dama-rana | `PUNTUACION` |
| `lives` | Vidas restantes, de 3 a 0                                       | `VIDAS`      |
| `level` | Ronda, desde 1 y sin techo; sube al llenar los cinco nichos     | `NIVEL`      |

`hud: ["PUNTUACION", "VIDAS", "NIVEL"]`, los mismos de Asteroids, Arkanoid y
Snake: **el contrato no se toca por cuarta vez consecutiva**.

**El cronómetro no es una cuarta cifra.** Se pinta como una barra horizontal en
el canvas, justo bajo la fila de casas, que se vacía de izquierda a derecha y
cambia de `COLOR_TIMER` a `COLOR_TIMER_LOW` en los últimos cinco segundos. Es la
misma excepción que ya usa Asteroids para sus barras de potenciador, y está
escrita en la novena regla de `engine-contract.md`: del `drawHUD` de un original
sobrevive lo que **no** tiene equivalente fuera del canvas. Los cinco nichos
tampoco necesitan cifra: se ven ocupados en pantalla.

`mount()` emite el estado inicial antes de devolver el `GameHandle`, así que el
`FRESH_RUN` de `PlayCabinet` —escrito para Asteroids— no se ve durante
`CARGANDO CARTUCHO`.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('frogger', 'FROGGER', 'REFLEJOS', true, 4);
```

Ningún `update`: las cuatro filas existentes tienen `sort_order` 0, 1, 2 y 3, así
que el 4 continúa la serie sin tocar nada. No se siembra ninguna marca, igual que
en SPEC 08, SPEC 09 y SPEC 10.

## Plan de implementación

Cada paso deja el repo compilando. Los pasos 1 a 7 no los consume nadie: se
verifican con `npm run build` y `npx tsc --noEmit`.

1. **Constantes.** `lib/games/frogger/constants.ts` con los valores de esta spec:
   el mundo, las trece filas con nombre, `HOME_COLS`, vidas, la tabla de puntos,
   los tiempos, los ciclos, las rondas de aparición, `HIT_PAD` y los colores. Ni
   un número se elige aquí: todos están arriba.
   _Verificación:_ `npx tsc --noEmit` pasa.

2. **Utilidades puras.** `lib/games/frogger/math.ts` con `wrapSpan`, `overlap` y
   `cycleAt`. Sin estado y sin importar nada del motor salvo tipos.
   _Verificación:_ `npx tsc --noEmit` pasa; en consola, `wrapSpan(-10, 640)`
   devuelve 630 y `cycleAt(-1, 4)` devuelve 3.

3. **La tabla de carriles.** `lib/games/frogger/lanes.ts` con `BASE_LANES` —diez
   entradas, exactamente las de esta spec— y `lanesForRound(round)` haciendo las
   tres cosas descritas y ninguna más. Es una función pura: mismo `round`, misma
   salida, y no toca `BASE_LANES` —devuelve copias—.
   _Verificación:_ `lanesForRound(1)` no tiene ningún `kind: "truck"` ni ningún
   `dives: true`; `lanesForRound(2)` tiene uno de cada; las velocidades de
   `lanesForRound(9)` son las de la 8, porque `SPEED_MAX` ya topó; y
   `BASE_LANES` sigue intacto después de llamarla diez veces.

4. **Las entidades del tablero.** `lib/games/frogger/entities.ts` con `Lane` y
   `Frog`: `positions(t)`, `hits(t, x)` con `HIT_PAD`, `carrier(t, x)` por centro
   respetando las tortugas sumergidas, y la rana con su `x` continua, su `row`
   entera, su `best`, su `hop` y su `escorting`.
   _Verificación:_ `npx tsc --noEmit` pasa; `new Lane(BASE_LANES[9]).positions(0)`
   devuelve cuatro extremos dentro del ciclo y `positions(-1)` también.

5. **La fauna.** En el mismo `entities.ts`, `Homes`, `Snake` y `Bonus`.
   `gatorAt` y `flyAt` son funciones del tiempo y de la ronda y devuelven `null`
   por debajo de `GATOR_FROM` y mientras la mosca no toque; `Snake` patrulla la
   mediana rebotando en los bordes; `Bonus` coloca la dama-rana sobre una
   plataforma del carril de la fila 3.
   _Verificación:_ `npx tsc --noEmit` pasa; `gatorAt` devuelve `null` para toda
   `round < GATOR_FROM` y para todo `t` con `cycleAt(t, GATOR_CYCLE) > GATOR_OPEN`.

6. **El esqueleto de `mount()`.** `lib/games/frogger/index.ts` exporta
   `froggerGame: GameMount` con su `world` y su `hud`. `mount()` crea el `Run` en
   el closure, engancha la entrada con `createInput()` y devuelve el
   `GameHandle`. El bucle de `requestAnimationFrame` ya corre con el `dt`
   recortado a `MAX_DT = 0.05`, pero `update` y `draw` están vacíos. **`mount()`
   emite el estado inicial antes de devolver el handle.** `play()` / `halt()`
   como en Asteroids, y `destroy()` idempotente con su flag.
   _Verificación:_ `npm run build` pasa; nadie lo monta todavía.

7. **Implementar `update(dt)`, primera mitad: moverse y morir.** Sumar `dt` a
   `run.t`. En `"ready"`, `ESPACIO` pasa a `"playing"` y arranca el cronómetro.
   En `"dead"`, descontar `timer` y al agotarse volver a `"ready"` o a
   `"gameover"`. En `"playing"`: avanzar el salto en curso —`HOP_MS`,
   interpolación lineal, la colisión se resuelve **al aterrizar**—, arrastrar la
   rana con `carrier()` si va sobre plataforma, leer los cuatro flancos de flecha
   con `input.pressed()` y aplicar **un solo salto por frame** en el orden `↑`,
   `↓`, `←`, `→`, ignorándolos si ya hay un salto en curso. Después, en este
   orden: atropello, ahogo, arrastre fuera de `[0, W - CELL]`, serpiente de la
   mediana y cronómetro agotado. Cualquiera de esos resta una vida y pasa a
   `"dead"` con `timer = DEATH_MS / 1000`. Sumar `POINTS_ROW` por cada fila nueva
   por encima de `best`.
   _Verificación:_ `npx tsc --noEmit` pasa.

8. **Implementar `update(dt)`, segunda mitad: llegar y progresar.** En la fila de
   casas, el centro de la rana tiene que caer en un nicho **libre y sin
   cocodrilo**; si no, es muerte. Al ocupar uno: `POINTS_HOME`, más
   `POINTS_TIME * floor(time)`, más `POINTS_FLY` si ese nicho tenía la mosca, más
   `POINTS_LADY` si `escorting`; después la rana vuelve a la acera con el
   cronómetro reiniciado y `best` a `ROW_START`. Con los cinco nichos llenos:
   `POINTS_ROUND`, `round++`, `run.t = 0`, `lanes = lanesForRound(round)`,
   `homes.filled` a `false` y el cronómetro a
   `max(TIME_START - (round - 1) * TIME_STEP, TIME_MIN)`. Sin vidas, pasar a
   `"gameover"`, llamar a `onGameOver(score)` **una sola vez** —flag `overSent`,
   rearmado sólo en `restart()`— y detener el bucle.
   _Verificación:_ `npx tsc --noEmit` pasa.

9. **Implementar `draw()`.** En este orden: agua, asfalto y sus líneas de carril,
   las dos orillas y la mediana, los nichos —vacíos con contorno, ocupados con
   rana sentada, con cocodrilo o con mosca según toque—, la barra del cronómetro
   bajo las casas, troncos y tortugas —las sumergibles con su transparencia de
   aviso—, vehículos y camiones, la serpiente, la dama-rana y la rana, con su X
   de muerte durante la fase `"dead"`. **No se dibuja** puntuación, vidas, ronda
   ni `GAME OVER`: eso lo pinta React a veinte píxeles del canvas.
   _Verificación:_ `npm run build` pasa.

10. **La máquina entra en el vault.** Este paso es **indivisible** y toca cuatro
    archivos a la vez, porque separarlo deja el repo o una ruta pública rota: el
    literal `"frogger"` en `GameId` no compila sin su entrada en `GAMES` ni sin el
    `case` de `drawPreview()` —el `id satisfies never` rompe el build—, y
    `/jugar/frogger` respondería en blanco sin la línea de `ENGINES`, que es
    `Partial` y no avisa. Es el mismo razonamiento del paso 2 de SPEC 07 y del
    paso 7 de SPEC 10, y **no se trocea «para que sea más granular»**.
    - `lib/games.ts`: `"frogger"` en `GameId` y la entrada al final de `GAMES`.
    - `lib/games/engines.ts`: `frogger: froggerGame`.
    - `components/play-cabinet.tsx`:
      `frogger: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"]` en
      `ENGINE_KEYS`.
    - `lib/preview-art.ts`: `"corredor"` sale de `ArchivedPreviewId` y el
      `case "corredor"` se renombra a `case "frogger"`. **Se mueve, no se copia**:
      el id no puede quedar en los dos sitios.

    `app/(vault)/salon/page.tsx` **no se toca**: su `initialTab` cae en
    `?? "asteroids"` y `asteroids` sigue en el catálogo.
    _Verificación:_ `/biblioteca` muestra cinco tarjetas, `/juego/frogger` y
    `/jugar/frogger` responden 200, la partida se juega con el teclado y con el
    mando, y las otras cuatro máquinas se ven y se juegan igual.

11. **Migración `<sello>_frogger.sql`.** El `insert` de la fila con
    `sort_order: 4`. Aplicar con `npx supabase db push`; **nunca** con
    `apply_migration` por MCP, que iría al proyecto remoto sin dejar rastro en git.
    _Verificación:_ `public.games` tiene 5 filas, `npx supabase migration list`
    marca la migración aplicada, y guardar una marca de Frogger no revienta contra
    la clave ajena.

12. **Los textos que contarían mal.** `lib/landing.ts`: `STATS` pasa de
    `{ value: "4", unit: "MAQUINAS" }` a `"5"`, y el `desc` de `FEATURES` nombra a
    Frogger. Y `references/implemented-games.md` gana su quinta fila —ojo:
    `.prettierignore` excluye `references/` entera, así que **las columnas de esa
    tabla se alinean a mano**—.
    _Verificación:_ la portada dice `5 MAQUINAS`, la tarjeta de ventajas nombra a
    Frogger y la tabla de `references/implemented-games.md` tiene cinco filas
    alineadas.

13. **Documentar en `CLAUDE.md`.** Que el vault tiene cinco máquinas y `frogger`
    es la primera de `REFLEJOS`; que es la segunda escrita desde cero y que sus
    números viven en `lib/games/frogger/constants.ts` y `lanes.ts`; que el
    cronómetro se pinta **en el canvas** y no en el HUD, y que por eso es la
    cuarta máquina seguida que no toca el contrato; y que de las escenas
    archivadas quedan **cuatro**, porque `corredor` hizo el viaje a `GameId`.
    _Verificación:_ el apartado existe y nombra `lib/games/frogger/`, `REFLEJOS`,
    `lanesForRound()` y la barra de tiempo en canvas.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/frogger/constants.ts`, `lanes.ts`, `math.ts`,
      `entities.ts` e `index.ts`.
- [ ] `lib/games/frogger/` no importa nada de `react`, `next` ni `@/components`.
- [ ] En el ámbito de módulo de `lib/games/frogger/index.ts` no hay ni una
      variable mutable: todo el estado vive en `mount()`.
- [ ] Montar y destruir dos veces no deja ningún `requestAnimationFrame` vivo ni
      ningún listener en `window`.
- [ ] `grep -n "Math.random" lib/games/frogger/` no devuelve nada: carriles,
      tortugas, cocodrilo, mosca y dama-rana son funciones de `run.t` y `round`.
- [ ] `BASE_LANES` tiene diez entradas y sus `row` son 1, 2, 3, 4, 5, 7, 8, 9, 10
      y 11: la mediana (6) y las dos orillas (0 y 12) no tienen carril.
- [ ] `lanesForRound()` es pura: llamarla diez veces no modifica `BASE_LANES`.
- [ ] `lanesForRound(1)` no devuelve ningún `kind: "truck"` ni ningún
      `dives: true`; `lanesForRound(2)` devuelve uno de cada.
- [ ] Las velocidades de `lanesForRound(9)` son idénticas a las de
      `lanesForRound(8)`: `SPEED_MAX` topa.
- [ ] Una pulsación de flecha mueve la rana exactamente una celda, el salto dura
      `HOP_MS` y mantener la tecla no la hace avanzar sola.
- [ ] Una flecha pulsada durante un salto en curso se ignora: no se encadenan dos
      saltos en 110 ms.
- [ ] La colisión se resuelve al aterrizar, no a mitad del salto: pasar por encima
      de un coche mientras se salta no mata.
- [ ] Un vehículo que sale por un borde reaparece por el opuesto sin saltos ni
      duplicados visibles.
- [ ] Estar sobre tronco o tortuga arrastra la rana a la velocidad del carril, y
      el arrastre se ve sin que la rana salte de celda.
- [ ] Una tortuga sumergida **no** sostiene: quedarse encima cuando se hunde resta
      una vida, y avisa con medio segundo de transparencia antes.
- [ ] Las tortugas de un mismo carril no se sumergen a la vez.
- [ ] Un camión ocupa dos celdas y mata igual que un coche.
- [ ] La serpiente aparece en la mediana desde la ronda 3, patrulla de lado a lado
      y mata al tocar.
- [ ] Un vehículo resta una vida al solapar la rana, con `HIT_PAD` de margen: rozar
      seis píxeles no mata.
- [ ] Pisar agua sin plataforma sólida bajo el centro resta una vida.
- [ ] Ser arrastrada fuera de `[0, W - CELL]` sobre una plataforma resta una vida.
- [ ] Agotar el cronómetro resta una vida.
- [ ] El cronómetro se para en la fase `"ready"` y en la `"dead"`, y se reinicia
      entero en cada travesía.
- [ ] Llegar a la fila de casas con el centro fuera de los nichos, a un nicho ya
      ocupado o a uno con cocodrilo resta una vida.
- [ ] Ocupar un nicho libre suma 50 puntos más 10 por segundo entero que sobre.
- [ ] Entrar en el nicho que tiene la mosca suma 200 puntos adicionales.
- [ ] Escoltar a la dama-rana hasta un nicho suma 200 puntos adicionales, y perder
      una vida llevándola encima la pierde.
- [ ] Cada fila nueva de la travesía suma 10 puntos, y volver a bajar y subir
      **no** los vuelve a pagar.
- [ ] Llenar los cinco nichos suma 200, sube la ronda, vacía los nichos, reinicia
      `run.t` y recarga los carriles con `lanesForRound(round)`.
- [ ] El cronómetro de la ronda `n` es
      `max(TIME_START - (n - 1) * TIME_STEP, TIME_MIN)`: 30 s en la 1, 20 s desde
      la 6.
- [ ] Perder una vida devuelve la rana a la acera en fase `"ready"` y conserva
      puntuación, ronda y nichos ya ocupados.
- [ ] Perder la tercera vida dispara `onGameOver` exactamente una vez y detiene el
      bucle.
- [ ] La barra del cronómetro se pinta en el canvas bajo las casas y cambia de
      color en los últimos cinco segundos.
- [ ] El canvas **no** pinta `PUNTUACION`, `VIDAS`, `NIVEL` ni `GAME OVER`.

**El catálogo y las rutas**

- [ ] `GAMES` tiene cinco entradas y la quinta es `frogger`, la última.
- [ ] `/biblioteca` muestra cinco tarjetas y filtrar por `REFLEJOS` deja sólo la de
      Frogger.
- [ ] `/juego/frogger` y `/jugar/frogger` responden 200.
- [ ] Las rutas de `asteroids`, `tetris`, `arkanoid` y `snake` siguen respondiendo 200.
- [ ] `ENGINES` tiene cinco entradas.
- [ ] La portada dice `5 MAQUINAS` y `FEATURES` nombra a Frogger.
- [ ] `references/implemented-games.md` tiene cinco filas y la de `frogger` dice
      `REFLEJOS` y `#ff006e`.

**El mando y el HUD**

- [ ] Los **cinco** botones del mando están vivos en `/jugar/frogger`: ninguno se
      ve atenuado.
- [ ] Con el ratón o el dedo se salta en las cuatro direcciones y se sale de la
      orilla, sin tocar el teclado.
- [ ] Soltar el botón o sacar el puntero de él suelta la tecla, y la rana no se
      queda saltando.
- [ ] La rana empieza quieta en la acera y no sale hasta que se pulsa `ESPACIO`,
      tanto al empezar la partida como después de perder una vida.
- [ ] Llegar a casa **no** vuelve a pedir `ESPACIO`: la travesía siguiente arranca
      sola.
- [ ] El HUD rotula `PUNTUACION`, `VIDAS` y `NIVEL`, y las tres cifras coinciden
      con la partida.
- [ ] Al terminar `CARGANDO CARTUCHO` el HUD ya muestra `0 / 3 / 1`, sin parpadeo.
- [ ] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia; en
      particular, el cronómetro corriendo **no** provoca renders.
- [ ] PAUSA congela el canvas —los coches no avanzan ni un píxel y el cronómetro no
      baja— y SEGUIR reanuda en el mismo punto.
- [ ] Cambiar de pestaña pausa la partida y volver no teletransporta los coches ni
      se come el cronómetro: el `dt` está recortado.
- [ ] La línea de controles bajo el mando dice lo mismo que `ENGINE_KEYS.frogger`,
      incluido `ESPACIO`.

**La miniatura**

- [ ] `/biblioteca` y `/juego/frogger` muestran la escena del corredor, no la del
      `default`.
- [ ] `grep -n "corredor" lib/preview-art.ts` no devuelve nada: el id se movió, no
      se copió.
- [ ] `ArchivedPreviewId` tiene cuatro miembros: `invasores`, `rocas`, `duelo` y
      `laberinto`.
- [ ] La aritmética de la escena no cambió: el `case` sólo se renombró.

**El marcador**

- [ ] `public.games` tiene cinco filas y la de `frogger` tiene `sort_order = 4`.
- [ ] Las filas de `asteroids`, `tetris`, `arkanoid` y `snake` no cambiaron.
- [ ] `public.scores` no gana ninguna fila con la migración.
- [ ] Terminar una partida y pulsar GUARDAR PUNTUACION mete la marca y la enseñan
      `/salon`, `/juego/frogger`, `/biblioteca` y la portada.
- [ ] `/salon` muestra cinco pestañas y sigue abriendo en `ASTEROIDS` sin
      `?juego=`.
- [ ] Con `scores` vacía, `/juego/frogger` muestra `SE EL PRIMERO` y no
      `MARCADOR NO DISPONIBLE`.

**Nada más se ha movido**

- [ ] `npm run build`, `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] `lib/games/engine.ts` no tiene ni una línea modificada: es la cuarta máquina
      seguida que entra sin tocar el contrato.
- [ ] `lib/games/input.ts` y `components/game-canvas.tsx` no tienen ni una línea
      modificada.
- [ ] `lib/games/asteroids/`, `lib/games/tetris/`, `lib/games/arkanoid/` y
      `lib/games/snake/` no cambian.
- [ ] `lib/leaderboard.ts`, `lib/scores.ts`, `lib/storage.ts` y
      `app/jugar/[id]/actions.ts` no cambian.
- [ ] `app/(vault)/salon/page.tsx` no cambia.
- [ ] `public/` sigue conteniendo únicamente `snake/fruits.png`.
- [ ] `references/started-games/` no tiene ningún cambio.

**Documentación**

- [ ] `CLAUDE.md` dice que el vault tiene cinco máquinas y que `frogger` estrena
      `REFLEJOS`.
- [ ] `CLAUDE.md` explica que el cronómetro se pinta en el canvas y no en el HUD, y
      por qué eso evita extender `GameState`.
- [ ] `CLAUDE.md` nombra `lanesForRound()` como el sitio donde vive la progresión.
- [ ] `CLAUDE.md` dice que quedan cuatro escenas archivadas en
      `lib/preview-art.ts`.

## Decisiones tomadas y descartadas

**Por qué este alcance**

- **Sí:** el juego entero, con rondas, cronómetro y fauna. Lo que compra es vida
  útil: la ronda 6 corre a más del 1,7 del ritmo inicial y con diez segundos
  menos, así que la máquina aguanta muchas más de diez partidas y el top 10 mide
  algo. Lo que paga son cinco archivos en vez de tres, unas treinta constantes
  más, cuatro fases en vez de dos y una lista de aceptación que casi dobla la de
  la hermana; y paga sobre todo **riesgo de equilibrio**, porque siete sistemas
  inventados sobre el papel pueden desajustarse entre sí de formas que uno solo
  no. La versión barata está entera en `specs/game-jam/frogger/spec-minima.md`.
- **Sí:** la ronda 1 es limpia —sin camiones, sin tortugas que se sumergen, sin
  cocodrilo ni serpiente—. Así la primera partida enseña el juego sin manual, y
  cada ronda añade exactamente una cosa. Se pierde que la ronda 1 sea
  representativa de la dificultad real.
- **No:** meter todo desde la ronda 1. Es más fácil de implementar —no hacen falta
  las cinco constantes `*_FROM`— y convierte la primera partida en una pared.

**El origen del juego y sus números**

- **Sí:** el motor se escribe desde cero. `references/started-games/` está agotado
  y no hay `game.js` de Frogger que portar. Se pierde lo que un puerto regala —un
  equilibrio ya probado—; a cambio no hay que matar las cuatro cosas del original.
- **Sí:** las cifras quedan congeladas en esta spec —celda de 40, rejilla de
  15 × 13, tres vidas, cinco casas, 30 s que bajan a 20, ×1,12 por ronda con tope
  ×2,2, y la tabla de puntos entera—. Es el sustituto de la regla «copia literal
  del original» que usó SPEC 10.
- **Sí:** mundo apaisado de `600 × 520`. El Frogger de salón es vertical, pero el
  gabinete ya demostró con Tetris que un mundo alto obliga a la rama de altura del
  `calc((100svh - CABINET_CHROME) * ratio)`; un mundo ligeramente apaisado cabe
  siempre y además da más recorrido a coches y plataformas. Se pierde la silueta
  vertical del original.
- **Sí:** todo el juego es función de `run.t` y `round`, sin un solo
  `Math.random()`. Dos partidas de la misma ronda son idénticas, un bug se
  reproduce y una posición se calcula en la consola sin montar el juego. Se pierde
  la sorpresa entre partidas; a cambio, con rondas infinitas la variedad ya la da
  la progresión.
- **No:** aleatorizar la aparición de la mosca y del cocodrilo. Es el sitio donde
  el azar tentaría más y es justo donde peor sienta: una casa que se cierra sin
  motivo aparente parece un bug.

**El HUD y el cronómetro**

- **Sí:** el cronómetro se pinta como barra **en el canvas**, bajo las casas. Es la
  novena regla de `engine-contract.md` y el precedente son las barras de
  potenciador de Asteroids. Se pierde que la cifra exacta de segundos se pueda
  leer; se gana no tocar el contrato.
- **No:** extender `GameState` con una cuarta cifra. Sería el segundo cambio del
  contrato de la historia del repo, arrastraría `PlayCabinet`, el `hud` de los
  cuatro motores existentes y el rediseño de la rejilla del HUD, todo por un
  número que cabe en una barra.
- **No:** reinterpretar `level` como `TIEMPO`. Dejaría la ronda sin representar,
  que es la cifra que de verdad ordena una partida larga, y forzaría a emitir
  `onState` cada segundo en vez de unas pocas veces por travesía.
- **Sí:** los cinco nichos se leen en pantalla y no en el HUD. Están dibujados y
  ocupados a la vista; una cifra sería redundante.

**El juego**

- **Sí:** rondas infinitas con tope de velocidad en ×2,2. Sin tope, la ronda 15
  sería un muro y la partida acabaría por aritmética en vez de por habilidad; con
  tope, lo que sigue apretando es el cronómetro hasta su suelo de 20 s. Se pierde
  la escalada infinita.
- **Sí:** el bonus de tiempo es `10 × segundos enteros restantes`. Premia cruzar
  rápido sin que el juego mida tiempo: lo que va a `public.scores` sigue siendo un
  entero comparable, y el criterio C6 de la rúbrica se cumple.
- **No:** puntuar por tiempo total de partida. Eso sí convertiría el marcador en
  un cronómetro, y `public.scores.score` es un entero de puntos.
- **Sí:** al perder una vida se conservan puntuación, ronda y nichos ya ocupados.
  Perder duele sin borrar la ronda. Es la misma decisión que tomó SPEC 10 con
  Snake.
- **No:** vaciar los nichos al perder una vida. Convierte tres vidas en tres
  rondas cortas pegadas y hace la ronda 5 prácticamente inalcanzable.
- **Sí:** el salto dura `HOP_MS = 110` y la colisión se resuelve **al aterrizar**.
  Da lectura al movimiento y evita el caso raro de morir a mitad de un salto por
  un coche que pasaba por debajo. Se pierde la respuesta instantánea de la versión
  mínima.
- **Sí:** una fase `"dead"` de 800 ms. Sin ella, la muerte es un parpadeo y el
  jugador no sabe qué le mató. Cuesta una fase y un temporizador.
- **Sí:** `HIT_PAD = 6` en carretera y colisión por centro en el río. Dos reglas
  distintas porque el error que producen es distinto: en carretera la injusticia
  es morir sin tocar, en el río es ahogarse pareciendo estar encima.
- **Sí:** las tortugas avisan con medio segundo de transparencia antes de
  sumergirse. Sin aviso es una trampa; con aviso es una decisión.
- **Sí:** la dama-rana se implementa como una bandera `escorting` en la rana, no
  como una entidad que la sigue. Es una línea de estado en vez de un sistema, y
  visualmente basta con dibujarle un punto magenta encima.

**El mando**

- **Sí:** `ESPACIO` saca a la rana de la orilla, y la partida y cada vida empiezan
  en fase `"ready"`. Con cronómetro, reaparecer en marcha es empezar a perder
  antes de reaccionar; es la misma solución que Arkanoid dio a la bola en SPEC 09
  y Snake a la serpiente en SPEC 10. De paso deja los cinco botones vivos.
- **No:** `ESPACIO` también entre travesía y travesía. Pararse cinco veces por
  ronda es un peaje, y llegar a casa no tiene el problema que tiene morir.
- **No:** `ESPACIO` deshabilitado, como en la spec hermana. Más barato, y deja el
  problema de la reaparición con el cronómetro corriendo sin resolver.
- **Sí:** un solo salto por frame y ninguno mientras hay salto en curso, leyendo
  flancos con `input.pressed()`. Mantener la flecha no encadena saltos.

**Lo que no se toca**

- **Sí:** `initialTab` del salón se queda en `?? "asteroids"`. `asteroids` sigue en
  el catálogo, así que el fallback vale; cambiarlo sería decidir que el salón abre
  en la máquina más nueva, y eso no es lo que pide esta spec.
- **Sí:** los dos textos de `lib/landing.ts` se actualizan a mano. SPEC 07 los
  desacopló de `GAMES.length` a propósito, así que nadie avisa si se quedan
  mintiendo.
- **Sí:** la escena `corredor` **se mueve** a `GameId`. Copiarla compila igual y
  deja dos escenas divergiendo; es la regla escrita en SPEC 07 y en la cabecera del
  propio `lib/preview-art.ts`.
- **No:** redibujar la escena para que se parezca más a Frogger. Se reutiliza tal
  cual, sólo renombrando el `case`, que es lo que vale 3 puntos en C9 de la
  rúbrica. Se pierde precisión —la figura amarilla lleva un rastro horizontal que
  sugiere scroll lateral— y se gana no abrir la aritmética de una escena que ya
  funciona.
- **No:** cargar sprites para tortugas, camiones o cocodrilo. SPEC 10 abrió esa
  puerta y la dejó acotada a Snake, donde 22 frutas distintas no existían sin
  imagen. Aquí siete formas geométricas se distinguen de sobra a 40 píxeles.
- **No:** sonido. Ningún motor del vault suena y meter audio arrastra mute,
  volumen y desbloqueo del `AudioContext`.
- **No:** récord local en `localStorage`. Ahí sólo viven la sesión y el
  `device_id`; un segundo récord contradiría al marcador compartido.

## Riesgos

| Riesgo                                                                                                                                                                                                                                                                                          | Mitigación                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Alguien implementa las dos specs, o la mínima encima de ésta.** Los dos `insert` de `public.games` llevan el mismo `id` y el mismo `sort_order = 4`, así que el segundo revienta contra la clave primaria; y `GameId` acabaría con un literal y dos motores peleándose por `ENGINES.frogger`. | Son alternativas excluyentes y está escrito en el encabezado de las dos. Aprobar una **cierra** la otra: al mudar la elegida a `specs/NN-<slug>.md` se borra el directorio `specs/game-jam/frogger/` entero, con la hermana dentro.                                |
| Siete sistemas inventados sobre el papel se desajustan entre sí: la ronda 3 se vuelve imposible por acumulación —camiones, tortugas, cocodrilo y serpiente a la vez— aunque cada pieza por separado esté bien.                                                                                  | Las cinco constantes `*_FROM` escalonan las apariciones y viven juntas en `constants.ts`: mover una cosa una ronda más tarde es cambiar un número. `SPEED_STEP`, `SPEED_MAX`, `TIME_STEP` y `TIME_MIN` están al lado y no requieren tocar el motor.                |
| El cronómetro corriendo tienta a emitir `onState` cada segundo, y eso serían renders de React durante toda la partida.                                                                                                                                                                          | El cronómetro **no** es una de las tres cifras: se pinta en el canvas. Hay un criterio de aceptación explícito de que el cronómetro corriendo no provoca renders, y `emitState()` sigue emitiendo por diferencia.                                                  |
| `lanesForRound()` muta `BASE_LANES` al «ajustar» velocidades, y a partir de la ronda 2 el juego acelera dos veces por ronda.                                                                                                                                                                    | Es una función pura que devuelve copias, y hay un criterio de aceptación que lo comprueba: llamarla diez veces deja `BASE_LANES` intacto. El paso 3 lo verifica antes de que nadie la consuma.                                                                     |
| El paso 10 se trocea «para que sea más granular» y deja el repo o una ruta pública rota entre commits.                                                                                                                                                                                          | Está escrito como indivisible en el propio paso, con la razón: `GameId` no compila sin `GAMES` ni sin el `case`, y `ENGINES` decide si `/jugar/frogger` enseña algo. Es el mismo razonamiento del paso 2 de SPEC 07.                                               |
| `corredor` se queda en `ArchivedPreviewId` además de entrar por `GameId`: compila igual y deja dos escenas divergiendo.                                                                                                                                                                         | Hay un criterio de aceptación que lo comprueba con `grep`: el id debe aparecer cero veces en `lib/preview-art.ts`, y `ArchivedPreviewId` debe quedar con cuatro miembros.                                                                                          |
| El `%` de JavaScript devuelve negativo con dividendo negativo, y la mitad de los carriles tienen `speed < 0`: las plataformas aparecerían fuera de pantalla desde el primer segundo.                                                                                                            | `wrapSpan()` centraliza el doble módulo en `math.ts`, el paso 2 lo verifica en consola y hay un criterio de aceptación sobre el envolvimiento.                                                                                                                     |
| El salto animado abre una ventana de invulnerabilidad de 110 ms que se puede explotar cronometrando los saltos contra los coches.                                                                                                                                                               | Es deliberado y está escrito en «Decisiones»: la colisión se resuelve al aterrizar. La ventana es más corta que el hueco entre vehículos del carril más lento, así que no permite atravesar tráfico denso; si se explotara, se acorta `HOP_MS` sin tocar el motor. |
| Guardar la primera marca de Frogger revienta contra la clave ajena si el paso 11 no se aplicó.                                                                                                                                                                                                  | El paso 11 va inmediatamente después del 10 y su verificación es exactamente esa: guardar una marca. Entre los dos pasos la máquina se juega y sólo falla al terminar.                                                                                             |
| El `desc` de `FEATURES` y el `STATS` de la portada se quedan diciendo cuatro máquinas: nadie compila contra ellos.                                                                                                                                                                              | Es el paso 12, con verificación propia, y hay dos criterios de aceptación que miran la portada. Es el punto P10 de `contact-points.md`, marcado como «nadie avisa».                                                                                                |

## Lo que **no** entra en esta spec

- Disposiciones de carriles distintas por ronda: las zonas son siempre las mismas.
- Niveles definidos en datos externos o cualquier editor.
- La fila extra de tortugas bidireccionales de las versiones tardías del arcade.
- Modo contrarreloj, modo práctica y selector de dificultad.
- Récords por ronda alcanzada: el marcador guarda un entero de puntos.
- Sonido, aquí y en las otras cuatro máquinas.
- Assets de cualquier tipo: esta máquina no carga ni un archivo.
- Autenticación, antitrampas, moderación, realtime y paginación del marcador.
- Tests.

Cada una de esas, si llega, va en su propia spec.
