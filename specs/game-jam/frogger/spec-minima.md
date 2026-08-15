# GAME JAM · FROGGER — version minima: una sola pantalla, cinco casas y se acabo

> **Estado:** Descartada — 2026-08-14. Se eligió la versión completa, hoy en `specs/14-frogger-rondas-infinitas.md`.
> **Alternativa de:** `specs/14-frogger-rondas-infinitas.md` (antes `specs/game-jam/frogger/spec-completa.md`). Se implementa una de las dos, nunca las dos.
> **Depende de:** SPEC 05, SPEC 07, SPEC 08
> **Fecha:** 2026-08-13
> **Objetivo:** Añadir `frogger` como quinta máquina del vault con el motor más barato que sigue siendo Frogger: una pantalla única de diez carriles, un tipo de vehículo, un tipo de tronco y cinco casas que llenar; sin rondas, sin cronómetro y sin fauna.

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

**La primera: el alcance.** Frogger de verdad tiene rondas infinitas, camiones,
tortugas que se sumergen, un cocodrilo asomando en una casa, una serpiente en la
mediana, una mosca bonus, una dama-rana a la que escoltar y un cronómetro que
paga por cada segundo que sobra. Esta spec deja **todo** eso fuera y se queda con
el esqueleto: salta hacia arriba, esquiva lo que viene por la carretera, cabalga
troncos por el río, mete cinco ranas en cinco casas y la partida termina. Es una
pantalla única, sin progresión, que se juega en dos o tres minutos. La versión
con el contenido entero existe y está escrita al lado, en
`specs/game-jam/frogger/spec-completa.md`; ésta es la que entra en una tarde y se
revisa de una sentada, y lo que compra a cambio de lo que renuncia está en
«Decisiones tomadas y descartadas».

**La segunda: el río no se recorta.** Podría parecer que la versión mínima de
Frogger es sólo la carretera —cinco carriles y esquivar coches— y que el río es
contenido añadido. No lo es: Frogger sin río es otro juego, y uno que ya existe
con otro nombre. Los troncos son la mitad de la mecánica, porque son lo único
que introduce el arrastre lateral: la rana deja de estar clavada a la rejilla y
pasa a tener una `x` continua que el tronco mueve debajo de ella. Quitarlo
ahorraría muy poco código —los carriles son una tabla de datos, no diez trozos de
lógica— y perdería lo que hace reconocible al juego. Se queda.

**La tercera: el rótulo del HUD.** Sin rondas, `NIVEL` marcaría un `1` fijo toda
la partida. La rúbrica lo permite si se declara como decisión, pero un rótulo
inmóvil es un rótulo desperdiciado, y esta versión sí tiene una cifra que cambia
y que el jugador mira: cuántas de las cinco casas lleva ocupadas. Así que el
tercer rótulo es `CASAS` y `level` lleva ese contador, de 0 a 5. Es exactamente
la reinterpretación que SPEC 08 abrió para el `LINEAS` de Tetris, y por eso esta
spec depende de la 08 y la hermana no.

La miniatura, en cambio, sale gratis en las dos. `lib/preview-art.ts` guarda
desde SPEC 07 una escena archivada llamada `corredor`: seis bandas horizontales
magenta que son una autopista, un suelo, dos bloques cian y una figura amarilla
con su rastro. Es una travesía de carriles, ya dibujada. Se **mueve** a `GameId`
—sale de `ArchivedPreviewId` y su `case` se renombra—, que es la regla que ya
siguieron Tetris, Arkanoid y Snake.

## Alcance

**Dentro:**

- **`lib/games/frogger/constants.ts`**: mundo, rejilla, filas con nombre, la
  tabla `LANES` de los diez carriles, vidas y puntuación. Valores nuevos, fijados
  en esta spec.
- **`lib/games/frogger/entities.ts`**: `Frog` y `Lane` como clases tipadas, con
  el `ctx` siempre por parámetro.
- **`lib/games/frogger/index.ts`**: `froggerGame: GameMount` con
  `world: { width: 600, height: 520 }` y `hud: ["PUNTUACION", "VIDAS", "CASAS"]`.
  El `Run`, el bucle y el `GameHandle` viven en el closure de `mount()`.
- **`lib/games/engines.ts`**: una línea, `frogger: froggerGame`.
- **`lib/games.ts`**: `"frogger"` en `GameId` y su entrada al final de `GAMES`,
  con `cat: "REFLEJOS"` y `glow: "#ff006e"`.
- **`components/play-cabinet.tsx`**: una línea en `ENGINE_KEYS` con los **cuatro**
  códigos de flecha. `ESPACIO` se pinta atenuado, como el `↓` de Asteroids.
- **`lib/preview-art.ts`**: `corredor` sale de `ArchivedPreviewId` y su `case` se
  renombra a `"frogger"`. La aritmética de la escena no se toca.
- **`supabase/migrations/<sello>_frogger.sql`**: `insert` de la fila `frogger` en
  `public.games` con `sort_order: 4`.
- **`lib/landing.ts`**: `STATS` pasa de `4` a `5` máquinas y el `desc` de
  `FEATURES` nombra a Frogger.
- **`references/implemented-games.md`**: la quinta fila de la tabla.
- **Apartado en `CLAUDE.md`**: la quinta máquina, la primera de `REFLEJOS`, y que
  quedan cuatro escenas archivadas.

**Fuera de alcance (para futuras specs):**

- **Las rondas.** No hay progresión de ninguna clase: la velocidad de los diez
  carriles es la misma del primer segundo al último. Llenar las cinco casas
  **acaba** la partida en vez de empezar la ronda siguiente. Está desarrollado en
  `specs/game-jam/frogger/spec-completa.md`, que es la alternativa a esta spec.
- **El cronómetro por travesía** y su bonus por segundo restante. Sin él no hay
  prisa: se puede esperar el hueco perfecto. Es lo que más cambia el juego y es
  lo primero que trae la spec completa.
- **Los tipos de obstáculo.** Un solo vehículo de una celda, sin camiones ni
  velocidades mixtas dentro de un carril.
- **Las tortugas que se sumergen**, que son la única plataforma que traiciona.
  Aquí toda plataforma es un tronco de tres celdas y siempre está.
- **La fauna de las casas**: cocodrilo asomando en un nicho, mosca bonus,
  dama-rana a la que escoltar, serpiente patrullando la mediana.
- **La animación de salto y la de muerte.** El salto es instantáneo y la
  reaparición también: se pierde la vida y la rana vuelve a la acera en el mismo
  frame.
- **Cualquier dificultad seleccionable.** No hay menú en partida ni selector.
- **Sonido**, aquí y en las otras cuatro máquinas. Falla el criterio C4 de la
  rúbrica sólo si el sonido es información de juego, y no lo es; pero meterlo
  arrastra mute, volumen y desbloqueo del `AudioContext`.
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

Son **tres** archivos. No hay `math.ts`: toda la geometría de esta versión es
solape de rectángulos alineados a una rejilla y un módulo para envolver los
carriles, y el contrato de `engine-contract.md` permite prescindir de él cuando
el juego no tiene geometría propia.

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
/** Columna de cada nicho. Simétricos y separados por tres celdas. */
export const HOME_COLS: readonly number[] = [1, 4, 7, 10, 13];
export const START_COL = 7;

/** Puntos por cada fila nueva alcanzada en la travesía en curso. */
export const POINTS_ROW = 10;
/** Puntos por meter la rana en un nicho libre. */
export const POINTS_HOME = 50;

/** Indulgencia de colisión, en píxeles por lado. Sin ella, rozar mata. */
export const HIT_PAD = 6;

export const COLOR_ROAD = "#0a0a0f";
export const COLOR_LANE_LINE = "rgba(255,0,110,0.16)";
export const COLOR_WATER = "rgba(0,245,255,0.10)";
export const COLOR_BANK = "#ff006e";
export const COLOR_CAR = "#ff006e";
export const COLOR_LOG = "#00f5ff";
export const COLOR_FROG = "#f5ff00";
export const COLOR_HOME = "rgba(0,245,255,0.45)";
```

La tabla de carriles es el corazón del juego y también vive en `constants.ts`,
porque ajustar la dificultad de esta versión es ajustar estos treinta números.

```ts
export type LaneKind = "car" | "log";

export interface LaneSpec {
  row: number;
  kind: LaneKind;
  /** Cuántas entidades circulan por el carril. */
  count: number;
  /** Largo de cada entidad, en celdas. */
  len: number;
  /** Píxeles por segundo. Negativo = hacia la izquierda. */
  speed: number;
  /** Desfase inicial en píxeles, para que los carriles no salgan alineados. */
  offset: number;
}

export const LANES: readonly LaneSpec[] = [
  // Río, de la orilla de arriba a la de abajo.
  { row: 1, kind: "log", count: 3, len: 3, speed: -95, offset: 60 },
  { row: 2, kind: "log", count: 3, len: 3, speed: 130, offset: 150 },
  { row: 3, kind: "log", count: 3, len: 3, speed: -85, offset: 240 },
  { row: 4, kind: "log", count: 3, len: 3, speed: 100, offset: 120 },
  { row: 5, kind: "log", count: 3, len: 3, speed: -70, offset: 30 },
  // Carretera, de la mediana hacia la acera de salida.
  { row: 7, kind: "car", count: 3, len: 1, speed: 140, offset: 210 },
  { row: 8, kind: "car", count: 2, len: 1, speed: -160, offset: 30 },
  { row: 9, kind: "car", count: 3, len: 1, speed: 100, offset: 180 },
  { row: 10, kind: "car", count: 3, len: 1, speed: -120, offset: 90 },
  { row: 11, kind: "car", count: 4, len: 1, speed: 80, offset: 0 },
];
```

**La fórmula del carril.** La entidad `i` de un carril está, en el instante `t`
segundos desde que arrancó la partida, en

```
span = W + len * CELL
x(i) = ((offset + i * span / count + speed * t) mod span + span) mod span - len * CELL
```

`span` es la longitud del ciclo: un poco más ancha que la pantalla, para que una
entidad termine de salir por un borde antes de volver a entrar por el otro. El
doble módulo está escrito así a propósito, porque el `%` de JavaScript devuelve
negativo con dividendo negativo y los carriles con `speed < 0` lo producen desde
el primer segundo. **No hay `Math.random()` en ninguna parte**: los diez carriles
son una función del tiempo, así que dos partidas idénticas se juegan igual y una
posición se puede reproducir en la consola sin montar el juego.

**`entities.ts`.** Dos clases, con el `ctx` siempre por parámetro.

```ts
export class Lane {
  readonly spec: LaneSpec;
  /** Los `count` extremos izquierdos, recalculados cada frame desde `t`. */
  positions(t: number): number[];
  /** ¿Solapa el rectángulo `[x, x + CELL]` alguna entidad de este carril? */
  hits(t: number, x: number): boolean;
  /** Extremo izquierdo de la entidad bajo el centro de `x`, o `null`. */
  carrier(t: number, x: number): number | null;
  draw(ctx: CanvasRenderingContext2D, t: number): void;
}

export class Frog {
  /** Píxel continuo del borde izquierdo: el tronco la arrastra. */
  x: number;
  /** Fila de la rejilla, siempre entera: el eje vertical no es continuo. */
  row: number;
  /** Fila más alta alcanzada en esta travesía; base de los puntos por avance. */
  best: number;
  hop(dx: number, dy: number): void;
  /** Al salir del río, la `x` se cuadra a la celda más cercana. */
  snap(): void;
  draw(ctx: CanvasRenderingContext2D): void;
}
```

`hits()` compara con `HIT_PAD` de margen a cada lado de la rana: rozar la esquina
de un coche no mata. `carrier()` es más estricto y usa el **centro** de la rana:
si el centro no cae dentro de ningún tronco, la rana está en el agua. Las dos
reglas son distintas a propósito y están escritas así porque la indulgencia en
carretera se agradece y en el río confunde —«iba sobre el tronco y me he
ahogado»—.

**`index.ts`.** El estado de partida, dentro del closure de `mount()`.

```ts
interface Run {
  frog: Frog;
  lanes: Lane[];
  /** Segundos desde que arrancó la partida. Es lo único que mueve los carriles. */
  t: number;
  score: number;
  lives: number;
  /** Nichos ocupados, en orden de `HOME_COLS`. Su cuenta es la tercera cifra. */
  homes: boolean[];
  phase: "playing" | "gameover";
}
```

`phase` y no `state`, porque `GameState` ya son las tres cifras del HUD. Sólo hay
dos fases: esta versión no tiene ni `"ready"` ni `"dead"`, porque no hay
cronómetro que dé sentido a esperar antes de salir ni animación de muerte que
reproducir. Al perder una vida, la rana vuelve a `(START_COL, ROW_START)` en el
mismo frame, con `best` reiniciado y `t` **sin tocar**: los carriles no se
recolocan, que sería regalar un hueco justo al reaparecer.

### La máquina nueva — entrada en `GAMES`

Última del array, quinta posición.

```ts
{
  id: "frogger",
  title: "FROGGER",
  cat: "REFLEJOS",
  glow: "#ff006e",
  playable: true,
  desc: "Cruza cinco carriles de trafico y un rio de troncos.",
  long: "El clásico de la rana, en una pantalla única. Abajo, cinco carriles de coches que van y vienen a distinta velocidad; arriba, cinco carriles de río donde el agua mata y los troncos son el único suelo, y además te arrastran. En medio, una franja de tierra donde respirar. Cada fila que ganas vale diez puntos y meter la rana en uno de los cinco nichos vale cincuenta. Tres vidas: llenar las cinco casas termina la partida, y perder la tercera vida también.",
  controls: "Flechas ← ↑ → ↓ saltan una casilla",
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

| Cifra   | Qué es en esta versión                                | Rótulo       |
| ------- | ----------------------------------------------------- | ------------ |
| `score` | Puntos: 10 por fila nueva de la travesía, 50 por casa | `PUNTUACION` |
| `lives` | Vidas restantes, de 3 a 0                             | `VIDAS`      |
| `level` | Nichos ocupados, de 0 a 5                             | `CASAS`      |

`hud: ["PUNTUACION", "VIDAS", "CASAS"]`. Es la **segunda** máquina del vault que
reinterpreta un rótulo, después del `LINEAS` de Tetris, y por eso esta spec
depende de SPEC 08: el mecanismo ya existe, `GameMount.hud` es requerido y
`PlayCabinet` lee los rótulos del motor en vez de escribirlos a mano. No hace
falta tocar `lib/games/engine.ts`.

La tercera cifra arranca en **0**, no en 1. El comentario de `restart()` en el
contrato dice «nivel 1» porque describe a Asteroids; Tetris ya arranca su
`lives`/`LINEAS` en 0 y nadie tuvo que cambiar nada. `mount()` emite el estado
inicial antes de devolver el `GameHandle`, así que el `FRESH_RUN` de
`PlayCabinet` —escrito para Asteroids— no se ve durante `CARGANDO CARTUCHO`.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('frogger', 'FROGGER', 'REFLEJOS', true, 4);
```

Ningún `update`: las cuatro filas existentes tienen `sort_order` 0, 1, 2 y 3, así
que el 4 continúa la serie sin tocar nada. No se siembra ninguna marca, igual que
en SPEC 08, SPEC 09 y SPEC 10.

## Plan de implementación

Cada paso deja el repo compilando. Los pasos 1 a 5 no los consume nadie: se
verifican con `npm run build` y `npx tsc --noEmit`.

1. **Constantes y la tabla de carriles.** `lib/games/frogger/constants.ts` con
   los valores de esta spec: el mundo, las trece filas con nombre, `HOME_COLS`,
   vidas, puntos, `HIT_PAD`, los colores y las diez entradas de `LANES`. Ni un
   número se elige aquí: todos están arriba.
   _Verificación:_ `npx tsc --noEmit` pasa y `LANES` tiene diez entradas, cinco
   con `kind: "log"` y cinco con `kind: "car"`.

2. **Las entidades.** `lib/games/frogger/entities.ts` con `Lane` y `Frog`. `Lane`
   implementa `positions(t)` con la fórmula del doble módulo, `hits(t, x)` con
   `HIT_PAD` y `carrier(t, x)` por centro; `Frog` guarda `x` continua, `row`
   entera y `best`, y sabe saltar y cuadrarse. El `ctx` va siempre por parámetro.
   _Verificación:_ `npx tsc --noEmit` pasa. En una consola de Node,
   `new Lane(LANES[9]).positions(0)` devuelve cuatro extremos dentro del ciclo y
   `positions(-1)` también, sin negativos fuera de rango.

3. **El esqueleto de `mount()`.** `lib/games/frogger/index.ts` exporta
   `froggerGame: GameMount` con su `world` y su `hud`. `mount()` crea el `Run` en
   el closure, engancha la entrada con `createInput()` y devuelve el
   `GameHandle`. El bucle de `requestAnimationFrame` ya corre con el `dt`
   recortado a `MAX_DT = 0.05`, pero `update` y `draw` están vacíos. **`mount()`
   emite el estado inicial antes de devolver el handle.** `play()` / `halt()`
   como en Asteroids, y `destroy()` idempotente con su flag.
   _Verificación:_ `npm run build` pasa; nadie lo monta todavía.

4. **Implementar `update(dt)`.** Sumar `dt` a `run.t`. Leer los cuatro flancos de
   flecha con `input.pressed()` y aplicar **un solo salto por frame** en el orden
   `↑`, `↓`, `←`, `→`. Si la rana está en el río, arrastrarla con
   `carrier()` antes de resolver nada. Después, en este orden: comprobar
   atropello en carretera, ahogo en río, arrastre fuera de `[0, W - CELL]`, y
   llegada a `ROW_HOMES`. En la fila de casas, el centro de la rana tiene que
   caer en un nicho **libre**; si no, es muerte. Sumar `POINTS_ROW` por cada fila
   nueva por encima de `best` y `POINTS_HOME` al ocupar un nicho. Al morir,
   restar una vida y devolver la rana a la acera sin tocar `run.t`. Con
   `HOMES` nichos ocupados o con `lives` a 0, pasar a `"gameover"`, llamar a
   `onGameOver(score)` **una sola vez** —flag `overSent`, rearmado sólo en
   `restart()`— y detener el bucle.
   _Verificación:_ `npx tsc --noEmit` pasa.

5. **Implementar `draw()`.** En este orden: agua, asfalto y sus líneas de carril,
   las dos orillas y la mediana, los nichos de las casas —vacíos con contorno,
   ocupados con una rana sentada—, los troncos, los vehículos y la rana. **No se
   dibuja** puntuación, vidas, casas ni `GAME OVER`: eso lo pinta React a veinte
   píxeles del canvas.
   _Verificación:_ `npm run build` pasa.

6. **La máquina entra en el vault.** Este paso es **indivisible** y toca cuatro
   archivos a la vez, porque separarlo deja el repo o una ruta pública rota: el
   literal `"frogger"` en `GameId` no compila sin su entrada en `GAMES` ni sin el
   `case` de `drawPreview()` —el `id satisfies never` rompe el build—, y
   `/jugar/frogger` respondería en blanco sin la línea de `ENGINES`, que es
   `Partial` y no avisa. Es el mismo razonamiento del paso 2 de SPEC 07 y del
   paso 7 de SPEC 10, y **no se trocea «para que sea más granular»**.
   - `lib/games.ts`: `"frogger"` en `GameId` y la entrada al final de `GAMES`.
   - `lib/games/engines.ts`: `frogger: froggerGame`.
   - `components/play-cabinet.tsx`:
     `frogger: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]` en
     `ENGINE_KEYS`. Sin `"Space"`: el quinto botón se pinta atenuado.
   - `lib/preview-art.ts`: `"corredor"` sale de `ArchivedPreviewId` y el
     `case "corredor"` se renombra a `case "frogger"`. **Se mueve, no se copia**:
     el id no puede quedar en los dos sitios.

   `app/(vault)/salon/page.tsx` **no se toca**: su `initialTab` cae en
   `?? "asteroids"` y `asteroids` sigue en el catálogo.
   _Verificación:_ `/biblioteca` muestra cinco tarjetas, `/juego/frogger` y
   `/jugar/frogger` responden 200, la partida se juega con el teclado y con el
   mando, y las otras cuatro máquinas se ven y se juegan igual.

7. **Migración `<sello>_frogger.sql`.** El `insert` de la fila con
   `sort_order: 4`. Aplicar con `npx supabase db push`; **nunca** con
   `apply_migration` por MCP, que iría al proyecto remoto sin dejar rastro en git.
   _Verificación:_ `public.games` tiene 5 filas, `npx supabase migration list`
   marca la migración aplicada, y guardar una marca de Frogger no revienta contra
   la clave ajena.

8. **Los textos que contarían mal.** `lib/landing.ts`: `STATS` pasa de
   `{ value: "4", unit: "MAQUINAS" }` a `"5"`, y el `desc` de `FEATURES` nombra a
   Frogger. Y `references/implemented-games.md` gana su quinta fila —ojo:
   `.prettierignore` excluye `references/` entera, así que **las columnas de esa
   tabla se alinean a mano**—.
   _Verificación:_ la portada dice `5 MAQUINAS`, la tarjeta de ventajas nombra a
   Frogger y la tabla de `references/implemented-games.md` tiene cinco filas
   alineadas.

9. **Documentar en `CLAUDE.md`.** Que el vault tiene cinco máquinas y `frogger` es
   la primera de `REFLEJOS`; que es la segunda escrita desde cero y que sus
   números viven en `lib/games/frogger/constants.ts`; que reinterpreta el tercer
   rótulo como `CASAS`, al modo del `LINEAS` de Tetris; y que de las escenas
   archivadas quedan **cuatro**, porque `corredor` hizo el viaje a `GameId`.
   _Verificación:_ el apartado existe y nombra `lib/games/frogger/`, `REFLEJOS` y
   el rótulo `CASAS`.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/frogger/constants.ts`, `entities.ts` e `index.ts`, y
      **no** existe `lib/games/frogger/math.ts`.
- [ ] `lib/games/frogger/` no importa nada de `react`, `next` ni `@/components`.
- [ ] En el ámbito de módulo de `lib/games/frogger/index.ts` no hay ni una
      variable mutable: todo el estado vive en `mount()`.
- [ ] Montar y destruir dos veces no deja ningún `requestAnimationFrame` vivo ni
      ningún listener en `window`.
- [ ] `grep -n "Math.random" lib/games/frogger/` no devuelve nada: los diez
      carriles son función de `run.t`.
- [ ] `LANES` tiene diez entradas y sus `row` son 1, 2, 3, 4, 5, 7, 8, 9, 10 y 11:
      la mediana (6) y las dos orillas (0 y 12) no tienen carril.
- [ ] Una pulsación de flecha mueve la rana exactamente una celda, y mantener la
      tecla no la hace avanzar sola.
- [ ] Un vehículo que sale por un borde reaparece por el opuesto sin saltos ni
      duplicados visibles.
- [ ] Estar sobre un tronco arrastra la rana a la velocidad del carril, y el
      arrastre se ve en pantalla sin que la rana salte de celda.
- [ ] Saltar del río a la mediana o a la fila de casas cuadra la `x` de la rana a
      la celda más cercana.
- [ ] Pisar agua sin tronco debajo del centro resta una vida.
- [ ] Ser arrastrada fuera de `[0, W - CELL]` sobre un tronco resta una vida.
- [ ] Un vehículo resta una vida al solapar la rana, con `HIT_PAD` de margen: rozar
      seis píxeles no mata.
- [ ] Llegar a la fila de casas con el centro fuera de los cinco nichos resta una
      vida.
- [ ] Llegar a un nicho **ya ocupado** resta una vida.
- [ ] Ocupar un nicho libre suma 50 puntos y devuelve la rana a la acera de
      salida.
- [ ] Cada fila nueva de la travesía suma 10 puntos, y volver a bajar y subir
      **no** los vuelve a pagar.
- [ ] Perder una vida no recoloca los carriles: `run.t` sigue corriendo.
- [ ] Ocupar los cinco nichos dispara `onGameOver` exactamente una vez y detiene el
      bucle.
- [ ] Perder la tercera vida dispara `onGameOver` exactamente una vez y detiene el
      bucle.
- [ ] El canvas **no** pinta `PUNTUACION`, `VIDAS`, `CASAS` ni `GAME OVER`.

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

- [ ] Los cuatro botones de flecha están vivos en `/jugar/frogger` y `ESPACIO` se
      ve **atenuado**, no escondido: la rejilla de cinco no se descuadra.
- [ ] Con el ratón o el dedo se salta en las cuatro direcciones sin tocar el
      teclado.
- [ ] Soltar el botón o sacar el puntero de él suelta la tecla, y la rana no se
      queda saltando.
- [ ] El HUD rotula `PUNTUACION`, `VIDAS` y `CASAS`, y las tres cifras coinciden
      con la partida.
- [ ] Al terminar `CARGANDO CARTUCHO` el HUD ya muestra `0 / 3 / 0`, sin parpadeo.
- [ ] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia.
- [ ] PAUSA congela el canvas —los coches no avanzan ni un píxel— y SEGUIR reanuda
      en el mismo punto.
- [ ] Cambiar de pestaña pausa la partida y volver no teletransporta los coches:
      el `dt` está recortado.
- [ ] La línea de controles bajo el mando dice lo mismo que `ENGINE_KEYS.frogger`,
      y **no** menciona `ESPACIO`.

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
- [ ] `lib/games/engine.ts` no tiene ni una línea modificada.
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
- [ ] `CLAUDE.md` explica que el tercer rótulo es `CASAS` y por qué, citando el
      precedente de `LINEAS`.
- [ ] `CLAUDE.md` dice que quedan cuatro escenas archivadas en
      `lib/preview-art.ts`.

## Decisiones tomadas y descartadas

**Por qué este alcance**

- **Sí:** una pantalla única, sin rondas ni cronómetro. Lo que compra es un motor
  de tres archivos que se implementa y se revisa de una sentada, con una sola
  clase de obstáculo, una sola clase de plataforma y dos fases. Lo que paga es la
  vida útil: sin progresión, la partida número once es idéntica a la primera y el
  top 10 se satura en cuanto alguien llene las cinco casas sin morir —el techo es
  850 puntos y es alcanzable—. La versión que resuelve eso está entera en
  `specs/game-jam/frogger/spec-completa.md`, y cuesta cinco archivos, unas treinta
  constantes más y el doble de criterios de aceptación.
- **Sí:** el río entra igualmente. Es lo que separa a Frogger de «esquivar coches»
  y su coste real es una `x` continua en la rana y un `carrier()` en el carril, no
  un subsistema. Recortarlo habría ahorrado un puñado de líneas y habría hecho que
  la máquina no se reconociera.
- **No:** recortar a tres carriles por zona para abaratar más. Los carriles son
  filas de una tabla de datos: diez cuestan lo mismo de implementar que seis, y
  seis hacen la travesía trivial.

**El origen del juego y sus números**

- **Sí:** el motor se escribe desde cero. `references/started-games/` está agotado
  y no hay `game.js` de Frogger que portar. Se pierde lo que un puerto regala —un
  equilibrio ya probado—; a cambio no hay que matar las cuatro cosas del original.
- **Sí:** las cifras quedan congeladas en esta spec —celda de 40, rejilla de
  15 × 13, tres vidas, cinco casas, 10 por fila, 50 por casa, `HIT_PAD` de 6 y los
  treinta números de `LANES`—. Es el sustituto de la regla «copia literal del
  original» que usó SPEC 10: `/spec-impl` los copia sin reinterpretar y quien
  quiera cambiarlos lo hace contra un documento.
- **Sí:** mundo apaisado de `600 × 520`. El Frogger de salón es vertical, pero el
  gabinete ya demostró con Tetris que un mundo alto obliga a la rama de altura del
  `calc((100svh - CABINET_CHROME) * ratio)`; un mundo ligeramente apaisado cabe
  siempre y además da más recorrido a coches y troncos, que es donde está el
  juego. Se pierde la silueta vertical del original.
- **No:** `700 × 400` u otro apaisado más ancho. Con trece filas de 40 px la altura
  está fijada en 520; ensanchar sólo alarga los carriles y hace la espera más
  larga.
- **Sí:** los carriles son función de `run.t`, sin un solo `Math.random()`. Dos
  partidas son idénticas, un bug se reproduce y una posición se puede calcular en
  la consola sin montar el juego. Se pierde la sorpresa entre partidas, que en una
  versión sin rondas importa poco.

**El HUD**

- **Sí:** el tercer rótulo es `CASAS` y `level` cuenta nichos ocupados, de 0 a 5.
  Es información que cambia y que el jugador mira. Es la segunda reinterpretación
  del vault tras el `LINEAS` de Tetris, y por eso esta spec depende de SPEC 08.
- **No:** `NIVEL` fijo en `1`. La rúbrica lo permite declarándolo, pero deja un
  rótulo muerto en pantalla durante toda la partida y no aporta nada.
- **No:** extender `GameMount` con una cuarta cifra para el tiempo o las casas.
  Esta versión no tiene cronómetro, así que ni se plantea; y aunque lo tuviera, el
  sitio de una barra es el canvas, no el HUD.

**El juego**

- **Sí:** llenar las cinco casas **termina** la partida. Da un final limpio y
  positivo, y `onGameOver` se dispara igual que al perder la tercera vida, así que
  la marca se guarda por el camino de siempre. Se pierde el bucle infinito del
  original.
- **No:** vaciar las casas y seguir con los mismos números. Sería una partida
  infinita a dificultad constante: el marcador mediría paciencia, que es
  exactamente lo que SPEC 10 rechazó al descartar el modo toroidal de Snake.
- **Sí:** 10 puntos por cada fila **nueva** de la travesía, con `best` reiniciado
  en cada salida. Es lo que hace el original y evita que bajar y subir en la acera
  fabrique puntos.
- **Sí:** el nicho ocupado mata en vez de rebotar. Rebotar pide una animación y
  una fase; matar es una línea y el original tampoco perdona.
- **Sí:** `HIT_PAD = 6` en carretera y colisión por centro en el río. Dos reglas
  distintas porque el error que producen es distinto: en carretera la injusticia
  es morir sin tocar, en el río es ahogarse pareciendo estar encima.
- **No:** carriles que aceleran con el tiempo. Es progresión disfrazada, y la
  progresión es de la spec hermana.

**El mando**

- **No:** `ESPACIO` con función. No hay cronómetro que justifique una fase de
  espera antes de salir, ni ninguna acción que Frogger tenga además de saltar.
  Inventarle una —turbo, salto doble— sería añadir una mecánica que hay que
  equilibrar a ciegas.
- **Sí:** el quinto botón se pinta **atenuado**. Es lo que ya hace `asteroids` con
  el `↓` y `arkanoid` con dos botones; esconderlo descuadraría la rejilla de cinco.
- **Sí:** un solo salto por frame, leyendo flancos con `input.pressed()`. Mantener
  la flecha no encadena saltos: sin eso, cruzar sería mantener `↑` pulsada.

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
- **No:** sonido. Ningún motor del vault suena y meter audio arrastra mute,
  volumen y desbloqueo del `AudioContext`.
- **No:** récord local en `localStorage`. Ahí sólo viven la sesión y el
  `device_id`; un segundo récord contradiría al marcador compartido.

## Riesgos

| Riesgo                                                                                                                                                                                                                                                                                            | Mitigación                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alguien implementa las dos specs, o la completa encima de ésta.** Los dos `insert` de `public.games` llevan el mismo `id` y el mismo `sort_order = 4`, así que el segundo revienta contra la clave primaria; y `GameId` acabaría con un literal y dos motores peleándose por `ENGINES.frogger`. | Son alternativas excluyentes y está escrito en el encabezado de las dos. Aprobar una **cierra** la otra: al mudar la elegida a `specs/NN-<slug>.md` se borra el directorio `specs/game-jam/frogger/` entero, con la hermana dentro.                        |
| El equilibrio está fijado sobre el papel: la travesía puede salir trivial o imposible, y 850 puntos de techo puede ser un rango pobre para el marcador.                                                                                                                                           | Los treinta números viven juntos en `LANES`, dentro de `constants.ts`, y se ajustan sin tocar el motor. El paso 1 los deja aislados a propósito. El marcador arranca vacío para esta máquina, así que un reajuste temprano no invalida ninguna marca real. |
| Sin cronómetro, el jugador puede esperar indefinidamente en la acera o en la mediana el hueco perfecto, y la partida se vuelve lenta en vez de tensa.                                                                                                                                             | Es el comportamiento deliberado de esta versión y está escrito en «Decisiones». El criterio que lo delimita es el del techo de 850 puntos: si la espera domina, lo que hay que implementar es la spec hermana, no parchear ésta.                           |
| El paso 6 se trocea «para que sea más granular» y deja el repo o una ruta pública rota entre commits.                                                                                                                                                                                             | Está escrito como indivisible en el propio paso, con la razón: `GameId` no compila sin `GAMES` ni sin el `case`, y `ENGINES` decide si `/jugar/frogger` enseña algo. Es el mismo razonamiento del paso 2 de SPEC 07.                                       |
| `corredor` se queda en `ArchivedPreviewId` además de entrar por `GameId`: compila igual y deja dos escenas divergiendo.                                                                                                                                                                           | Hay un criterio de aceptación que lo comprueba con `grep`: el id debe aparecer cero veces en `lib/preview-art.ts`, y `ArchivedPreviewId` debe quedar con cuatro miembros.                                                                                  |
| El `%` de JavaScript devuelve negativo con dividendo negativo, y cinco de los diez carriles tienen `speed < 0`: los troncos aparecerían fuera de pantalla desde el primer segundo.                                                                                                                | La fórmula del carril está escrita con doble módulo en «Modelo de datos» y el paso 2 la verifica en consola con `positions(-1)`, además del criterio de aceptación del envolvimiento.                                                                      |
| Guardar la primera marca de Frogger revienta contra la clave ajena si el paso 7 no se aplicó.                                                                                                                                                                                                     | El paso 7 va inmediatamente después del 6 y su verificación es exactamente esa: guardar una marca. Entre los dos pasos la máquina se juega y sólo falla al terminar.                                                                                       |
| El `desc` de `FEATURES` y el `STATS` de la portada se quedan diciendo cuatro máquinas: nadie compila contra ellos.                                                                                                                                                                                | Es el paso 8, con verificación propia, y hay dos criterios de aceptación que miran la portada. Es el punto P10 de `contact-points.md`, marcado como «nadie avisa».                                                                                         |

## Lo que **no** entra en esta spec

- Rondas, progresión de velocidad y cualquier dificultad creciente.
- El cronómetro por travesía y su bonus por segundo restante.
- Camiones, velocidades mixtas por carril y tortugas que se sumergen.
- Cocodrilo en las casas, mosca bonus, dama-rana y serpiente en la mediana.
- Animación de salto y de muerte.
- Sonido, aquí y en las otras cuatro máquinas.
- Assets de cualquier tipo: esta máquina no carga ni un archivo.
- Autenticación, antitrampas, moderación, realtime y paginación del marcador.
- Tests.

Cada una de esas, si llega, va en su propia spec.
