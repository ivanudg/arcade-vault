# GAME JAM · AMIDAR — version completa: la malla con el salto de pintura, el reloj y las rondas

> **Estado:** Borrador de jam — no aprobada, no implementada
> **Alternativa de:** `specs/game-jam/amidar/spec-minima.md`. Se implementa una de las dos, nunca las dos.
> **Depende de:** SPEC 05, SPEC 07
> **Fecha:** 2026-08-15
> **Objetivo:** Añadir `amidar` como sexta máquina del vault con el Amidar de salón entero dentro del contrato: dos tipos de enemigo, salto de pintura, reloj de tablero con su perseguidor, bonus de fila y de esquinas, y una progresión de rondas que es función pura del número de ronda.

## Por qué existe esta spec

Amidar no tiene original en el repo. `references/started-games/` está agotado —hoy sólo
queda un `.DS_Store` dentro— y `references/source-assets/` ni existe, así que aquí no
hay un `game.js` del que copiar la física ya equilibrada ni una tabla de puntos decidida
por otro. Es el caso de Frogger en SPEC 14 y el de Snake en SPEC 10: **el motor se
escribe entero y las cifras las fija esta spec**. Quien implemente las copia sin
reinterpretar, exactamente como copiaría las de un original.

Eso mueve el trabajo de sitio. En un puerto lo caro es matar las cuatro cosas que un
`game.js` de navegador hace y que no sobreviven a montarse y desmontarse —el
`getElementById` al cargar, el estado en variables de módulo, los listeners eternos y el
`requestAnimationFrame` que no se puede cancelar—. Aquí no hay ninguna que matar, y a
cambio hay que inventar lo que un puerto regala. Esta versión inventa cuarenta y un
números, y por eso van todos juntos en dos archivos: `constants.ts` los valores y
`rounds.ts` la progresión, que es una **función pura de la ronda**, como el
`lanesForRound()` de Frogger. Ajustar la dificultad es cambiar una cifra en uno de esos
dos sitios; el motor no se toca.

Y hay una decisión que es la razón de existir de esta spec, no un detalle: **el
alcance**. La versión mínima —`specs/game-jam/amidar/spec-minima.md`— se queda con la
mecánica central: recorrer la malla, cerrar rectángulos, esquivar a dos perseguidores
que patrullan siempre igual. Es Amidar y se entiende en la primera partida. Lo que no es
es el Amidar del salón, y la diferencia está localizada en tres cosas concretas. La
primera: **el salto de pintura**, la única acción ofensiva del juego, que convierte al
pintor de presa en algo que decide cuándo sacar a todo el mundo del tablero; sin él lo
único que se puede hacer con un enemigo encima es huir. La segunda: **el reloj y su
perseguidor**, que es lo que impide que la partida buena consista en dar vueltas
esperando a que los patrulleros se alineen —con reloj, entretenerse tiene un precio con
nombre y silueta—. La tercera: **la progresión**, porque una máquina de marcador
compartido se juega diez y veinte veces, y lo que la sostiene entre la partida cuarta y
la vigésima es que la ronda seis no se parezca a la primera.

El precio está escrito y no se disimula: un archivo más, veinticuatro constantes más y
más de veinte criterios de aceptación adicionales, todos sobre números que nadie ha
jugado todavía.

La miniatura, en cambio, sale gratis en las dos versiones. `lib/preview-art.ts` guarda
desde SPEC 07 una escena archivada llamada `laberinto`: muro exterior, dos bloques
interiores, una fila de puntos amarillos, una figura amarilla y un guardián magenta. Es
una malla con un perseguidor dentro, ya dibujada. Se **mueve** a `GameId` —sale de
`ArchivedPreviewId` y el `case` se renombra—, que es la regla que ya siguieron Tetris,
Arkanoid, Snake y Frogger.

## Alcance

**Dentro:**

- **`lib/games/amidar/constants.ts`**: mundo, malla, velocidades, vidas, saltos, reloj,
  puntuación y las dos paletas de tema. Valores nuevos, fijados en esta spec.
- **`lib/games/amidar/grid.ts`**: la geometría de la malla —índices de arista, nodos,
  las cuatro aristas de una casilla, `nextDir()` y `chaseDir()`—, toda ella pura y sin
  estado.
- **`lib/games/amidar/rounds.ts`**: `roundPlan(round)`, función pura que devuelve
  enemigos, velocidad, segundos de reloj, cuándo entra el perseguidor y qué tema toca.
- **`lib/games/amidar/entities.ts`**: `Painter`, `Patrol` y `Hunter` como clases
  tipadas, con el `ctx` siempre por parámetro.
- **`lib/games/amidar/index.ts`**: `amidarGame: GameMount` con
  `world: { width: 640, height: 640 }` y `hud: ["PUNTUACION", "VIDAS", "NIVEL"]`. El
  `Run`, el bucle y el `GameHandle` viven en el closure de `mount()`.
- **`lib/games/engines.ts`**: una línea, `amidar: amidarGame`.
- **`lib/games.ts`**: `"amidar"` en `GameId` y su entrada al final de `GAMES`, con
  `cat: "LABERINTO"` y `glow: "#f5ff00"`.
- **`components/game-pad.tsx`**: una línea en `ENGINE_KEYS` con los **cinco** códigos y
  una en `ENGINE_PAD` con `A` = `ESPACIO`.
- **`lib/preview-art.ts`**: `laberinto` sale de `ArchivedPreviewId` y su `case` se
  renombra a `"amidar"`. La aritmética de la escena no se toca.
- **`supabase/migrations/<sello>_amidar.sql`**: `insert` de la fila `amidar` en
  `public.games` con `sort_order: 5`.
- **`lib/landing.ts`**: `STATS` pasa de `5` a `6` máquinas y el `desc` de `FEATURES`
  nombra a Amidar.
- **`references/implemented-games.md`**: la sexta fila de la tabla.
- **Apartado en `CLAUDE.md`**: la sexta máquina, la primera de `LABERINTO` —con lo que
  los seis valores de `GameCategory` quedan estrenados—, que su progresión es una
  función pura de la ronda como la de Frogger, y que de las escenas archivadas quedan
  tres.

**Fuera de alcance (para futuras specs):**

- **Aristas ausentes y tableros con callejones.** La malla es siempre completa, aquí y
  en la versión mínima, y por la misma razón: una casilla a la que le falte un lado no
  se puede reclamar nunca y el tablero deja de poder terminarse. Disposiciones de malla
  por ronda son otra spec, y la primera que tendría que resolver ese problema.
- **La segunda pantalla del arcade**, la del mono trepando lianas. Aquí los dos temas
  cambian siluetas y colores, no el tablero.
- **Los enemigos que cambian de comportamiento a media pantalla**, como los del original
  al quedar pocos. Los dos tipos de esta spec no mutan.
- **La animación de muerte** del pintor y la de los enemigos al caer con el salto. Se
  pierde la vida y se reaparece.
- **Sprites de cualquier clase.** El motor no carga ni un archivo: todo son primitivas
  de canvas, como Arkanoid y Frogger.
- **Sonido**, aquí y en las otras cinco máquinas.
- **Skins.** `GameMount.skins` y `GameHandle.setSkin()` son opcionales y esta spec no
  los declara. Vestir la máquina es trabajo de `skin-designer`, en su propia ronda. Ojo:
  los dos temas de esta spec **no** son skins, y la decisión está escrita abajo.
- **Autenticación, antitrampas, realtime y paginación del marcador.** Igual que en
  SPEC 06, SPEC 09 y SPEC 10.
- **Tests.** El repo sigue sin framework y esta spec no lo introduce.
- **Tocar `lib/games/engine.ts`, `lib/games/input.ts` o `components/game-canvas.tsx`.**
  Ninguno hace falta.

## Modelo de datos

El contrato de SPEC 05 no cambia y el esquema de SPEC 06 tampoco. Lo que aparece es un
motor nuevo, una entrada de catálogo y una fila.

### La malla

El mundo es cuadrado y la malla vive centrada, con una banda de 80 píxeles arriba para
el progreso, el reloj y los saltos, y otra de 80 abajo.

```
        ORIGIN_X = 32                       W = 640
      +--------------------------------------------+  y = 0
      | PINTADO ####----   TIEMPO ######--   * * * |   * = saltos restantes
      +---+----+----+----+----+----+----+----------+  y = 80  (ORIGIN_Y)
      |   o----o----o----o----o----o----o          |   fila de nodos 0
      |   |    |    |    |    |    |    |          |
      |   o----o----o----o----o----o----o          |   fila 1
      |   |    |    |    |    |    |    |          |
      |   o----o----o----o----o----o----o          |   fila 2
      |   |    |    |    |    |    |    |          |
      |   o----o----o----o----o----o----o          |   fila 3
      |   |    |    |    |    |    |    |          |
      |   o----o----o----o----o----o----o          |   fila 4
      |   |    |    |    |    |    |    |          |
      |   P----o----o----o----o----o----o          |   fila 5   P = salida
      +---+----+----+----+----+----+----+----------+  y = 560
      |                                            |
      +--------------------------------------------+  y = 640
          7 columnas de nodos, CELL = 96 px
```

Seis casillas por fila y cinco filas: **30 casillas**. Las aristas son
`COLS * (ROWS + 1) = 36` horizontales y `(COLS + 1) * ROWS = 35` verticales, **71** en
total. Ninguna falta: la malla es siempre completa. Las **cuatro casillas de esquina**
son `(0,0)`, `(5,0)`, `(0,4)` y `(5,4)`.

### El motor — `lib/games/amidar/`

**`constants.ts`.** Las cifras se fijan aquí y no se reinterpretan al implementar.

```ts
export const W = 640;
export const H = 640;

/** La malla: 6 x 5 casillas de 96 px, centrada, con 80 px de banda arriba. */
export const CELL = 96;
export const COLS = 6;
export const ROWS = 5;
export const ORIGIN_X = 32;
export const ORIGIN_Y = 80;
export const TILES = COLS * ROWS; // 30

export const LIVES = 3;

/** Píxeles por segundo. Una arista de 96 px se recorre en 0,57 s. */
export const PLAYER_SPEED = 168;
export const PATROL_SPEED = 120;
/** El perseguidor del reloj corre más que un patrullero y menos que el pintor. */
export const HUNTER_SPEED = 138;

/** Distancia entre centros a la que un enemigo mata. */
export const HIT_DIST = 20;

/** El salto de pintura: cuántos por vida, el tope y cuánto dura fuera. */
export const JUMPS_START = 3;
export const JUMPS_MAX = 5;
export const JUMP_SECONDS = 4;

/** Segundos por tablero antes de que entre el perseguidor. */
export const ROUND_SECONDS = 90;

export const POINTS_TILE = 100;
/** Las seis casillas de una fila cerradas. */
export const POINTS_ROW = 300;
/** Las cuatro esquinas del tablero: además concede un salto. */
export const POINTS_CORNERS = 1000;
/** Tablero completo: `POINTS_BOARD * round`. */
export const POINTS_BOARD = 1000;
/** Cada segundo de reloj que sobra al completar el tablero. */
export const POINTS_PER_SECOND = 10;

/** La progresión, leída por `rounds.ts`. */
export const PATROLS_START = 2;
export const PATROLS_MAX = 5;
export const SPEED_STEP = 1.1;
export const SPEED_CAP = 2.2;
/** Segundos que se descuentan del reloj por ronda, con suelo. */
export const TIME_STEP = 5;
export const TIME_MIN = 60;

export const COLOR_BG = "#000";
export const COLOR_TILE = "rgba(245,255,0,0.18)";
export const COLOR_PLAYER = "#f5ff00";
export const COLOR_PATROL = "#ff006e";
export const COLOR_HUNTER = "#ffffff";
export const COLOR_BAR = "rgba(0,245,255,0.35)";
/** Aviso del reloj en los últimos diez segundos, como la barra de Frogger. */
export const COLOR_BAR_LOW = "#ff006e";

/** Los dos temas: raíl sin pintar y raíl pintado. `theme` los indexa. */
export const RAIL = ["rgba(0,245,255,0.28)", "rgba(245,255,0,0.24)"] as const;
export const RAIL_PAINTED = ["#00f5ff", "#f5ff00"] as const;
```

Cuarenta y un números y once colores, todos en un archivo. El factor de velocidad y los
demás valores por ronda salen de `rounds.ts`, que los combina.

**`grid.ts`.** Geometría pura, sin una sola variable mutable de módulo.

```ts
export type Dir = "up" | "down" | "left" | "right";

/** Píxeles del nodo `(col, row)`. */
export function nodeX(col: number): number;
export function nodeY(row: number): number;

/** Índice en el array de aristas horizontales: `row * COLS + col`, 36 en total. */
export function hIndex(col: number, row: number): number;
/** Índice en el de verticales: `row * (COLS + 1) + col`, 35 en total. */
export function vIndex(col: number, row: number): number;

/** ¿Existe raíl saliendo de `(col, row)` hacia `dir`? Falso sólo en los bordes. */
export function hasRail(col: number, row: number, dir: Dir): boolean;

/** El nodo al que lleva `dir` desde `(col, row)`. */
export function stepNode(col: number, row: number, dir: Dir): { col: number; row: number };

/** ¿Están pintadas las cuatro aristas de la casilla `(col, row)`? */
export function tileClosed(
  col: number,
  row: number,
  h: readonly boolean[],
  v: readonly boolean[],
): boolean;

/**
 * La dirección que toma un patrullero al llegar a `(col, row)`. **Pura y sin
 * azar**: depende sólo del nodo, de la dirección de entrada y de `seed`, que es
 * el índice del patrullero.
 */
export function nextDir(col: number, row: number, dir: Dir, seed: number): Dir;

/**
 * La dirección que toma el perseguidor: la salida del nodo que más acerca su
 * centro al del pintor, con la inversión como último recurso. También pura: es
 * función del nodo y de la posición del pintor, no de un generador.
 */
export function chaseDir(col: number, row: number, dir: Dir, targetX: number, targetY: number): Dir;
```

`tileClosed(c, r)` mira exactamente cuatro aristas: `hIndex(c, r)`, `hIndex(c, r + 1)`,
`vIndex(c, r)` y `vIndex(c + 1, r)`.

`nextDir()` es el corazón del patrullero y **no usa `Math.random()`**, igual que Frogger:
mantiene el eje mientras haya raíl y, cuando `(col + row + seed) % 2 === 0`, gira al eje
perpendicular hacia el lado que marque `(col + seed) % 2`; si el raíl de continuación no
existe —está en un borde—, invierte. El recorrido barre la malla como el trazo de un
amidakuji.

`chaseDir()` tampoco tiene azar: es una comparación de cuatro distancias. Entre las dos,
**el motor entero es determinista**, así que dos partidas de la misma ronda con las
mismas teclas se juegan igual y una posición se reproduce en la consola sin montar el
juego. Es la propiedad que ya tiene Frogger y que hace depurable un motor de
perseguidores.

**`rounds.ts`.** La progresión, aparte del motor y del equilibrio base.

```ts
export interface RoundPlan {
  /** Patrulleros en el tablero: 2 en la ronda 1, +1 por ronda, tope 5. */
  patrols: number;
  /** Multiplicador de velocidad de los enemigos: `1.1 ** (round - 1)`, tope 2,2. */
  speed: number;
  /** Segundos de reloj: 90 menos 5 por ronda, suelo 60. */
  seconds: number;
  /** 0 = jungla, 1 = fábrica. Alterna con la paridad de la ronda. */
  theme: 0 | 1;
}

/** Función **pura** de la ronda. Ajustar la dificultad es cambiar esto. */
export function roundPlan(round: number): RoundPlan;
```

Los cuatro campos, desarrollados para que la tabla no haya que deducirla:

| Ronda | Patrulleros | Velocidad | Reloj | Tema    |
| ----- | ----------- | --------- | ----- | ------- |
| 1     | 2           | ×1,00     | 90 s  | jungla  |
| 2     | 3           | ×1,10     | 85 s  | fábrica |
| 3     | 4           | ×1,21     | 80 s  | jungla  |
| 4     | 5           | ×1,33     | 75 s  | fábrica |
| 5     | 5           | ×1,46     | 70 s  | jungla  |
| 6     | 5           | ×1,61     | 65 s  | fábrica |
| 7     | 5           | ×1,77     | 60 s  | jungla  |
| 9     | 5           | ×2,14     | 60 s  | jungla  |
| 10+   | 5           | ×2,20     | 60 s  | alterna |

**`entities.ts`.** Tres clases, con el `ctx` siempre por parámetro. Las tres comparten el
mismo modelo de tránsito, que es la pieza que hay que entender del motor:

```ts
/** Un móvil sobre la malla. `t` va de 0 (en `from`) a 1 (en `to`). */
export interface Transit {
  col: number; // nodo de origen
  row: number;
  dir: Dir;
  t: number;
  /**
   * `true` sólo si el móvil salió del nodo de origen y no ha invertido desde
   * entonces. Es lo que decide si la arista se pinta al llegar: sin esto,
   * recorrer media arista y volver pintaría un raíl que nadie recorrió entero.
   */
  spanned: boolean;
}

export class Painter {
  transit: Transit;
  /** El giro pedido; se aplica al llegar al nodo siguiente y se limpia. */
  queued: Dir | null;
  /** Avanza `speed * dt` píxeles. Devuelve la arista completada, o `null`. */
  advance(dt: number, speed: number): { kind: "h" | "v"; index: number } | null;
  /** Invierte a mitad de arista: `t = 1 - t`, se cambia el origen, `spanned = false`. */
  reverse(): void;
  reset(): void;
  /** El trazo parcial de la arista en curso se dibuja aquí, con `t`. */
  draw(ctx: CanvasRenderingContext2D, theme: 0 | 1): void;
}

export class Patrol {
  transit: Transit;
  /** Índice del patrullero: es la `seed` que le pasa a `nextDir()`. */
  seed: number;
  /** Segundos que le quedan fuera del tablero por un salto de pintura. */
  out: number;
  advance(dt: number, speed: number): void;
  reset(): void;
  draw(ctx: CanvasRenderingContext2D, theme: 0 | 1): void;
}

export class Hunter {
  transit: Transit;
  /** `false` hasta que el reloj se agota; entonces entra por la fila 0. */
  awake: boolean;
  out: number;
  advance(dt: number, speed: number, targetX: number, targetY: number): void;
  reset(): void;
  draw(ctx: CanvasRenderingContext2D, theme: 0 | 1): void;
}
```

Los dos temas cambian **la silueta y el par de colores de raíl**, no la geometría: en la
jungla el pintor es un triángulo y los patrulleros son rombos; en la fábrica el pintor es
un cuadrado con una muesca y los patrulleros, círculos. El `Hunter` es siempre una
silueta blanca de seis lados con halo, para que no se confunda con nada. Todo son
`Path2D` y `arc`: no se carga ningún archivo.

**`index.ts`.** El estado de partida, dentro del closure de `mount()`.

```ts
interface Run {
  painter: Painter;
  patrols: Patrol[];
  hunter: Hunter;
  /** 36 aristas horizontales pintadas o no. */
  h: boolean[];
  /** 35 verticales. */
  v: boolean[];
  /** 30 casillas reclamadas o no. */
  tiles: boolean[];
  /** Filas ya premiadas, para no pagar dos veces la misma. */
  rowsPaid: boolean[];
  /** Las cuatro esquinas, ya premiadas o no. */
  cornersPaid: boolean;
  claimed: number;
  /** Saltos de pintura restantes en esta vida. */
  jumps: number;
  /** Segundos que quedan del reloj de esta ronda. */
  clock: number;
  score: number;
  lives: number;
  /** El nivel del HUD **es** la ronda, y la ronda alimenta `roundPlan()`. */
  level: number;
  phase: "ready" | "playing" | "gameover";
}
```

`phase` y no `state`, porque `GameState` ya son las tres cifras del HUD. `"ready"` es el
pintor quieto en la esquina inferior izquierda esperando `ESPACIO`: es la fase con la que
empieza la partida y también cada vida después de perder una. Reaparecer en marcha es
morir antes de reaccionar, que es lo que ya resolvieron Arkanoid, Snake y Frogger.

**Las reglas de partida, escritas para que no haya que deducirlas:**

- Una arista se marca pintada cuando el pintor llega a un nodo con `spanned === true`.
- Al pintar una arista se comprueban **sólo** las casillas que la tocan —una o dos—; si
  alguna cierra, se reclama, suma `POINTS_TILE` y se rellena.
- Al reclamar una casilla se comprueban, en este orden, tres bonus, y cada uno se paga
  **una sola vez por tablero**: su fila entera (`POINTS_ROW`), las cuatro esquinas
  (`POINTS_CORNERS` y un salto más, hasta `JUMPS_MAX`) y el tablero completo.
- Tablero completo: suma `POINTS_BOARD * level` más `POINTS_PER_SECOND` por cada segundo
  entero que quede de reloj, `level` sube uno, la malla se vacía, el reloj se recarga con
  `roundPlan(level).seconds`, el `Hunter` se duerme, y todo el mundo vuelve a su sitio
  con la fase en `"ready"`. Los saltos **no** se recargan: son por vida.
- El reloj corre sólo en `"playing"`. Al llegar a 0 no pasa nada más que despertar al
  `Hunter`, que entra por el nodo central de la fila 0 y persigue con `chaseDir()`. El
  reloj no baja de 0 y no vuelve a subir hasta el tablero siguiente.
- `ESPACIO` en `"playing"` gasta un salto si queda alguno: todos los patrulleros y el
  `Hunter` ponen `out = JUMP_SECONDS`, salen del tablero y no matan mientras `out > 0`.
  Al volver, cada uno reaparece en su nodo inicial con su dirección inicial.
- Tocar un enemigo con `out === 0` —distancia entre centros menor que `HIT_DIST`— resta
  una vida. **La pintura del tablero se conserva**; el pintor, los patrulleros y el
  `Hunter` vuelven a sus posiciones iniciales, los saltos se recargan a `JUMPS_START`, el
  reloj **no** se recarga y la fase pasa a `"ready"`.
- Sin vidas, la fase pasa a `"gameover"`, se llama a `onGameOver(score)` una sola vez y
  el bucle se detiene.
- Los enemigos **no** se mueven en `"ready"`: la reaparición no puede matar.

### La máquina nueva — entrada en `GAMES`

Última del array, sexta posición.

```ts
{
  id: "amidar",
  title: "AMIDAR",
  cat: "LABERINTO",
  glow: "#f5ff00",
  playable: true,
  desc: "Recorre la malla, reclama casillas y salta la pintura.",
  long: "El clásico de la malla de raíles, con todo lo que traía el salón. Recorres las líneas de una rejilla de treinta casillas y cada casilla cuyos cuatro lados cierras vale cien puntos; una fila entera vale trescientos más y las cuatro esquinas, mil y un salto de pintura. Los patrulleros barren la malla con el trazo del amidakuji y siempre igual, así que la pantalla se puede aprender: son dos en la primera ronda y cinco a partir de la cuarta. Tienes tres saltos por vida y cada uno tira a todo el mundo fuera del tablero cuatro segundos. Noventa segundos por tablero, y cada uno que sobra vale diez puntos; si se agotan, entra un perseguidor blanco que no patrulla, te sigue. Cada ronda va un diez por ciento más rápida y con cinco segundos menos, hasta más del doble de velocidad.",
  controls: "Flechas ← ↑ → ↓ recorren la malla · ESPACIO arranca y salta la pintura",
}
```

`LABERINTO` estrena la **sexta y última** categoría de `GameCategory`, así que el filtro
de `/biblioteca` pasa de cinco opciones vivas a seis y no queda ninguna vacía. El
amarillo repite con Asteroids, que es inevitable con tres neones y seis máquinas; las
siluetas no se confunden —malla con casillas rellenas frente a campo de rocas—.

### El HUD y las tres cifras

Los tres rótulos dicen la verdad sin forzar nada, así que **el contrato no se toca por
quinta vez consecutiva**.

| Cifra   | Qué es en Amidar                                                | Rótulo       |
| ------- | --------------------------------------------------------------- | ------------ |
| `score` | Puntos: casillas, filas, esquinas, tablero y segundos sobrantes | `PUNTUACION` |
| `lives` | Vidas restantes, de 3 a 0                                       | `VIDAS`      |
| `level` | La ronda en curso; sube al reclamar las treinta casillas        | `NIVEL`      |

`hud: ["PUNTUACION", "VIDAS", "NIVEL"]`, los mismos de Asteroids, Arkanoid, Snake y
Frogger.

Lo que el canvas **sí** pinta, porque no tiene equivalente fuera —la novena regla del
contrato, la misma que ampara las barras de potenciador de Asteroids y el cronómetro de
Frogger—, va todo en la banda superior: la barra `PINTADO` con `claimed / TILES`, la
barra `TIEMPO` que se vacía de izquierda a derecha y pasa a `COLOR_BAR_LOW` en los
últimos diez segundos, y los pips de `SALTOS`, uno por salto restante. Son tres cifras
más que el HUD no puede llevar, y ninguna es puntuación, vidas ni nivel: el `onState`
sigue emitiendo por diferencia sobre las tres de siempre y el reloj corriendo **no**
provoca renders, exactamente como en Frogger.

El canvas no pinta `PUNTUACION`, `VIDAS`, `NIVEL` ni `GAME OVER`.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('amidar', 'AMIDAR', 'LABERINTO', true, 5);
```

Ningún `update`: las cinco filas existentes tienen `sort_order` 0, 1, 2, 3 y 4, así que
el 5 continúa la serie sin tocar nada. No se siembra ninguna marca, igual que en las
SPEC 08, 09, 10 y 14.

## Plan de implementación

Cada paso deja el repo compilando. Los pasos 1 a 7 no los consume nadie: se verifican con
`npm run build` y `npx tsc --noEmit`.

1. **Constantes y geometría.** `lib/games/amidar/constants.ts` con los cuarenta y un
   números y los once colores de esta spec, y `lib/games/amidar/grid.ts` con `nodeX`,
   `nodeY`, `hIndex`, `vIndex`, `hasRail`, `stepNode`, `tileClosed`, `nextDir` y
   `chaseDir`, todas puras.
   _Verificación:_ `npx tsc --noEmit` pasa; en un `node -e` suelto, `nextDir` devuelve la
   misma secuencia de 200 direcciones dos veces seguidas para la misma semilla, y
   `chaseDir` nunca devuelve una dirección sin raíl.

2. **La progresión.** `lib/games/amidar/rounds.ts` con `roundPlan(round)`, pura y sin
   leer nada más que `constants.ts`.
   _Verificación:_ imprimir `roundPlan(1..12)` reproduce la tabla de esta spec fila a
   fila, incluidos los topes de 5 patrulleros, ×2,2 y 60 segundos.

3. **Las entidades.** `lib/games/amidar/entities.ts` con `Transit`, `Painter`, `Patrol` y
   `Hunter`. `advance()` acumula `speed * dt` sobre `t` normalizado a la arista, y al
   pasar de 1 recoloca el nodo de origen y —en el `Painter`— devuelve la arista
   completada, o nada si `spanned` era `false`. `reverse()` invierte a mitad de arista y
   apaga `spanned`. `out` descuenta segundos y mientras sea mayor que 0 la entidad ni se
   mueve ni se dibuja dentro del tablero.
   _Verificación:_ `npx tsc --noEmit` pasa.

4. **El esqueleto de `mount()`.** `lib/games/amidar/index.ts` exporta
   `amidarGame: GameMount` con su `world` y su `hud`. `mount()` crea el `Run` en el
   closure, engancha la entrada con `createInput()` y devuelve el `GameHandle`. El bucle
   de `requestAnimationFrame` ya corre con el `dt` recortado a `MAX_DT = 0.05`, pero
   `update` y `draw` están vacíos. **`mount()` emite el estado inicial antes de devolver
   el handle**, para que el `FRESH_RUN` de `PlayCabinet` no se vea durante la carga.
   `destroy()` cancela el frame guardado, desengancha la entrada y es idempotente.
   _Verificación:_ `npm run build` pasa; nadie lo monta todavía.

5. **Implementar `update(dt)`: la malla y los patrulleros.** En `"ready"`, `ESPACIO` pasa
   a `"playing"`. En `"playing"`: aplicar el giro encolado si hay raíl, avanzar el
   pintor, marcar la arista completada, comprobar las una o dos casillas que toca, sumar
   casilla, fila, esquinas y tablero según las reglas escritas arriba, avanzar los
   patrulleros con `nextDir()` y la velocidad de `roundPlan(level)`, y comprobar la
   distancia. Muerte y fin de partida. `onGameOver` se dispara **una sola vez** —flag
   `overSent`, rearmado sólo en `restart()`— y el bucle se detiene.
   _Verificación:_ `npx tsc --noEmit` pasa.

6. **Implementar el reloj, el `Hunter` y el salto.** El reloj descuenta `dt` sólo en
   `"playing"`; al tocar 0 despierta al `Hunter`, que entra por el nodo central de la
   fila 0 y avanza con `chaseDir()`. `ESPACIO` en `"playing"` gasta un salto si queda
   alguno y pone `out = JUMP_SECONDS` a todos los enemigos. Al completar el tablero se
   pagan los segundos sobrantes, se recarga el reloj con la ronda nueva y el `Hunter` se
   duerme; al perder una vida los saltos vuelven a `JUMPS_START` y el reloj no.
   _Verificación:_ `npx tsc --noEmit` pasa.

7. **Implementar `draw()`.** Fondo, los 71 raíles en el color de tema —sin pintar y
   pintados—, el trazo parcial de la arista en curso, las casillas reclamadas como
   `fillRect` de `COLOR_TILE` con inset, el pintor, los patrulleros, el `Hunter` con su
   halo, y la banda superior con `PINTADO`, `TIEMPO` y los pips de `SALTOS`. **No se
   dibuja** puntuación, vidas, nivel ni `GAME OVER`: eso lo pinta React a veinte píxeles.
   _Verificación:_ `npm run build` pasa.

8. **La máquina entra en el vault.** Este paso es **indivisible** y toca cinco archivos a
   la vez, porque separarlo deja el repo o una ruta pública rota: el literal `"amidar"`
   en `GameId` no compila sin su entrada en `GAMES` ni sin el `case` de `drawPreview()`
   —el `id satisfies never` rompe el build—, y `/jugar/amidar` respondería en blanco sin
   la línea de `ENGINES`, que es `Partial` y no avisa. Es el mismo razonamiento del paso
   2 de SPEC 07 y **no se trocea «para que sea más granular»**.
   - `lib/games.ts`: `"amidar"` en `GameId` y la entrada al final de `GAMES`.
   - `lib/games/engines.ts`: `amidar: amidarGame`.
   - `components/game-pad.tsx`:
     `amidar: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"]` en
     `ENGINE_KEYS`, y
     `amidar: { a: { code: "Space", aria: "Saltar la pintura" }, b: null }` en
     `ENGINE_PAD`.
   - `lib/preview-art.ts`: `"laberinto"` sale de `ArchivedPreviewId` y el
     `case "laberinto"` se renombra a `case "amidar"`. **Se mueve, no se copia**: el id
     no puede quedar en los dos sitios.

   _Verificación:_ `/biblioteca` muestra seis tarjetas, `/juego/amidar` y `/jugar/amidar`
   responden 200, la partida se juega con el teclado y con el mando, y las otras cinco
   máquinas se ven y se juegan igual.

9. **Migración `<sello>_amidar.sql`.** El `insert` de la fila con `sort_order: 5`.
   Aplicar con `npx supabase db push`; **nunca** con `apply_migration` por MCP, que iría
   al proyecto remoto sin dejar rastro en git.
   _Verificación:_ `public.games` tiene 6 filas, `npx supabase migration list` marca la
   migración aplicada, y guardar una marca de Amidar no revienta contra la clave ajena.

10. **Los dos textos que contarían mal.** `lib/landing.ts`: `STATS` pasa de
    `{ value: "5", unit: "MAQUINAS" }` a `"6"`, y el `desc` de `FEATURES` deja de decir
    «cinco clásicos» para nombrar los seis. Y la sexta fila de
    `references/implemented-games.md`, que se alinea a mano porque `.prettierignore`
    excluye `references/`.
    _Verificación:_ la portada dice `6 MAQUINAS`, la tarjeta de ventajas nombra a Amidar
    y la tabla tiene seis filas.

11. **Documentar en `CLAUDE.md`.** Que el vault tiene seis máquinas y `amidar` es la
    primera de `LABERINTO`, con lo que los seis valores de `GameCategory` quedan
    estrenados; que es la tercera escrita desde cero y que su equilibrio vive en dos
    sitios, `constants.ts` los números y `rounds.ts` la progresión, que es función pura
    de la ronda como la de Frogger; que no hay ni un `Math.random()` en el motor; y que
    de las escenas archivadas quedan **tres**, porque `laberinto` hizo el viaje a
    `GameId`.
    _Verificación:_ el apartado existe y nombra `lib/games/amidar/`, `rounds.ts`,
    `roundPlan()` y `nextDir()`.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/amidar/constants.ts`, `grid.ts`, `rounds.ts`, `entities.ts` e
      `index.ts`, y ningún archivo más en ese directorio.
- [ ] `lib/games/amidar/` no importa nada de `react`, `next` ni `@/components`.
- [ ] En el ámbito de módulo de `lib/games/amidar/index.ts` no hay ni una variable
      mutable: todo el estado vive en `mount()`.
- [ ] Montar y destruir dos veces no deja ningún `requestAnimationFrame` vivo ni ningún
      listener en `window`.
- [ ] `grep -rn "Math.random" lib/games/amidar/` no devuelve nada.
- [ ] Dos partidas de la misma ronda, pilotadas con la misma secuencia de teclas, dan la
      misma puntuación y las mismas posiciones de enemigo.
- [ ] `roundPlan(1..12)` reproduce la tabla de esta spec, incluidos los topes de 5
      patrulleros, ×2,2 de velocidad y 60 segundos de reloj.
- [ ] `roundPlan()` no lee ni escribe nada fuera de sus argumentos y `constants.ts`.
- [ ] La malla tiene 36 aristas horizontales, 35 verticales y 30 casillas, y ninguna
      arista falta.
- [ ] El pintor sólo se mueve por raíles: nunca aparece fuera de una arista de la malla.
- [ ] Recorrer una arista entera la deja pintada; invertir a mitad y volver al nodo de
      partida **no** la pinta.
- [ ] Mientras se recorre una arista se ve el trazo parcial, y al invertir el trazo
      desaparece.
- [ ] Cerrar los cuatro lados de una casilla la reclama, la rellena y suma exactamente
      100 puntos.
- [ ] Una casilla ya reclamada no vuelve a sumar al repasar sus lados.
- [ ] Cerrar las seis casillas de una fila suma 300 una sola vez; volver a pasar por esa
      fila no vuelve a pagar.
- [ ] Cerrar las cuatro casillas de esquina suma 1000 y concede un salto, una sola vez
      por tablero, y no pasa de `JUMPS_MAX`.
- [ ] Completar el tablero suma `1000 × ronda` más 10 por segundo entero de reloj
      restante, sube `level` uno y vacía la malla sin tocar la puntuación.
- [ ] Al empezar un tablero nuevo el reloj marca los segundos que dice `roundPlan()` y el
      perseguidor está dormido.
- [ ] Los patrulleros son 2 en la ronda 1 y 5 desde la 4.
- [ ] Ningún enemigo se mueve mientras la fase es `"ready"`.
- [ ] Agotado el reloj entra el perseguidor blanco por la fila 0, y persigue al pintor en
      vez de patrullar.
- [ ] `ESPACIO` en partida gasta un salto, saca a todos los enemigos 4 segundos y durante
      esos 4 segundos ninguno mata.
- [ ] Con 0 saltos, `ESPACIO` no hace nada y no resta puntuación.
- [ ] Los saltos vuelven a 3 al perder una vida y **no** se recargan al completar un
      tablero.
- [ ] Tocar un enemigo resta una vida, conserva la pintura del tablero y devuelve al
      pintor a la esquina inferior izquierda.
- [ ] Perder la tercera vida dispara `onGameOver` exactamente una vez y detiene el bucle.
- [ ] Las siluetas y los colores de raíl cambian entre ronda impar y par.
- [ ] El canvas **no** pinta `PUNTUACION`, `VIDAS`, `NIVEL` ni `GAME OVER`.
- [ ] El canvas pinta `PINTADO`, `TIEMPO` y los pips de `SALTOS`, y los tres coinciden
      con la partida.
- [ ] El reloj corriendo no provoca renders: el HUD sólo se emite cuando cambia una de
      las tres cifras.

**El catálogo y las rutas**

- [ ] `GAMES` tiene seis entradas y la sexta es `amidar`, la última.
- [ ] `/biblioteca` muestra seis tarjetas y filtrar por `LABERINTO` deja sólo la de
      Amidar.
- [ ] Ninguna de las seis categorías de `GameCategory` queda ya sin máquina.
- [ ] `/juego/amidar` y `/jugar/amidar` responden 200.
- [ ] Las rutas de `asteroids`, `tetris`, `arkanoid`, `snake` y `frogger` siguen
      respondiendo 200.
- [ ] `ENGINES` tiene seis entradas.
- [ ] La portada dice `6 MAQUINAS` y `FEATURES` nombra las seis máquinas.

**El mando y el HUD**

- [ ] Los **cinco** botones del mando están vivos en `/jugar/amidar`: ninguno se ve
      atenuado.
- [ ] Con el ratón o el dedo se recorre la malla en las cuatro direcciones, se arranca y
      se salta la pintura, sin tocar el teclado.
- [ ] Soltar el botón o sacar el puntero de él suelta la tecla.
- [ ] El botón `A` del mando de consola dice `Saltar la pintura` en su `aria` y `B` sale
      apagado.
- [ ] El pintor empieza quieto en la esquina de salida y no se mueve hasta `ESPACIO`,
      tanto al empezar como después de perder una vida.
- [ ] `ESPACIO` en `"ready"` arranca y **no** gasta un salto.
- [ ] El HUD rotula `PUNTUACION`, `VIDAS` y `NIVEL`, y las tres cifras coinciden con la
      partida.
- [ ] Al terminar `CARGANDO CARTUCHO` el HUD ya muestra `0 / 3 / 1`, sin parpadeo.
- [ ] PAUSA congela el canvas, el reloj no corre mientras tanto y SEGUIR reanuda en el
      mismo punto.
- [ ] La línea `controls` de la ficha dice lo mismo que `ENGINE_KEYS.amidar` y nombra las
      dos funciones de `ESPACIO`.

**La miniatura**

- [ ] `/biblioteca` y `/juego/amidar` muestran la escena del laberinto, no la del
      `default`.
- [ ] `grep -n "laberinto" lib/preview-art.ts` no devuelve nada: el id se movió, no se
      copió.
- [ ] `ArchivedPreviewId` tiene tres miembros: `invasores`, `rocas` y `duelo`.
- [ ] La aritmética de la escena no cambió: el `case` sólo se renombró.

**El marcador**

- [ ] `public.games` tiene seis filas y la de `amidar` tiene `sort_order = 5`.
- [ ] Las filas de las otras cinco máquinas no cambiaron.
- [ ] `public.scores` no gana ninguna fila con la migración.
- [ ] Terminar una partida y pulsar GUARDAR PUNTUACION mete la marca y la enseñan
      `/salon`, `/juego/amidar`, `/biblioteca` y la portada.
- [ ] `/salon` muestra seis pestañas y sigue abriendo en `ASTEROIDS` sin `?juego=`.
- [ ] Con `scores` vacía, `/juego/amidar` muestra `SE EL PRIMERO` y no
      `MARCADOR NO DISPONIBLE`.

**Nada más se ha movido**

- [ ] `npm run build`, `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] `lib/games/engine.ts` no tiene ni una línea modificada.
- [ ] `lib/games/input.ts` y `components/game-canvas.tsx` no tienen ni una línea
      modificada.
- [ ] `lib/games/asteroids/`, `tetris/`, `arkanoid/`, `snake/` y `frogger/` no cambian.
- [ ] `components/play-cabinet.tsx` no cambia: `ENGINE_KEYS` y `ENGINE_PAD` viven en
      `components/game-pad.tsx` desde SPEC 13.
- [ ] `lib/leaderboard.ts`, `lib/scores.ts`, `lib/storage.ts` y
      `app/jugar/[id]/actions.ts` no cambian.
- [ ] `public/` sigue conteniendo únicamente `snake/fruits.png`.
- [ ] `references/started-games/` no tiene ningún cambio.

**Documentación**

- [ ] `CLAUDE.md` dice que el vault tiene seis máquinas y que `amidar` es la primera de
      `LABERINTO`.
- [ ] `CLAUDE.md` dice que los seis valores de `GameCategory` quedan estrenados.
- [ ] `CLAUDE.md` explica que la progresión vive en `rounds.ts` como función pura de la
      ronda y que el motor no tiene azar.
- [ ] `CLAUDE.md` dice que quedan tres escenas archivadas en `lib/preview-art.ts`.
- [ ] `references/implemented-games.md` tiene seis filas y la última es Amidar.

## Decisiones tomadas y descartadas

**Por qué este alcance**

- **Sí:** esta versión trae los dos tipos de enemigo, el salto de pintura, el reloj, los
  tres bonus y la progresión por ronda. Compra la máquina que aguanta más de diez
  partidas: hay una decisión que tomar en cada tablero —cuándo gastar un salto, si
  perseguir el bonus de esquinas o cerrar filas, si arriesgarse a que entre el
  perseguidor—, y la ronda seis no se parece a la primera. Paga un archivo más
  (`rounds.ts`), veinticuatro constantes más, dos pasos más de plan y más de veinte
  criterios adicionales, todos sobre números inventados que hay que validar jugando.
- **No:** el alcance de `specs/game-jam/amidar/spec-minima.md`, que se queda con la
  malla, la pintura y dos patrulleros. Es más barato, se revisa de una sentada y su
  equilibrio son diecisiete números en vez de cuarenta y uno. Lo que se pierde con él es
  concreto: la única mecánica ofensiva del juego y cualquier motivo para no dar vueltas
  esperando a que los patrulleros se alineen.
- **Sí:** las dos versiones comparten `id`, `title`, `cat`, `glow`, miniatura,
  `sort_order`, `world` y los tres rótulos del HUD. Es lo que las hace comparables:
  cambiar cualquiera de esos convertiría la decisión de alcance en una decisión de otra
  cosa.

**El origen del juego**

- **Sí:** el motor se escribe desde cero. No hay original en `references/`: es el caso de
  Snake en SPEC 10 y de Frogger en SPEC 14. Se pierde lo que un puerto regala, un
  equilibrio ya probado; a cambio las cifras se fijan aquí y se ajustan jugando.
- **Sí:** los números quedan congelados en esta spec, y repartidos en dos archivos:
  `constants.ts` los valores base y `rounds.ts` la curva. Es el reparto de Frogger, y
  existe por lo mismo: la dificultad se toca en un sitio y el motor no se entera.
- **Sí:** mundo de 640 × 640. Cuadrado porque la malla lo es: un mundo apaisado dejaría
  bandas muertas a los lados, y uno vertical como el de Tetris encogería la celda por
  debajo de lo que el dedo distingue. El gabinete lo acepta sin deformar nada, porque el
  ratio viaja en un `style` desde `world` desde SPEC 11.

**La malla**

- **Sí:** 6 × 5 casillas de 96 px. Treinta casillas es un tablero que se completa en
  torno al minuto y medio sin ser trivial, y 96 px por arista da 0,57 s de recorrido a la
  velocidad del pintor: tiempo de sobra para decidir el giro siguiente. Además cuadra con
  el reloj: 90 segundos son holgados en la ronda 1 y justos en la 7.
- **Sí:** la malla es siempre completa, sin aristas ausentes. Se pierde la silueta del
  tablero del arcade, que tiene callejones; se gana que ninguna casilla pueda quedar
  imposible de cerrar y que el tablero siempre se pueda terminar. **Es la misma decisión
  en la spec mínima**, y por la misma razón: es la única que no depende del alcance.
- **No:** disposiciones de malla por ronda, al modo de `lanesForRound()`. Es el añadido
  que más contenido daría y el único que puede generar un tablero incompletable; pide su
  propia spec, con una comprobación de que toda casilla conserva sus cuatro lados.
- **Sí:** la arista se pinta al llegar al nodo, con el flag `spanned`. Sin él, recorrer
  media arista y volver pintaría un raíl que nadie recorrió entero, que es el bug obvio de
  esta mecánica.
- **Sí:** el trazo parcial se dibuja mientras se recorre. Es dibujo puro —usa la `t` que
  ya lleva el `Transit`— y es lo que hace que pintar se sienta como pintar.

**Los enemigos**

- **Sí:** dos tipos, y sólo dos. El patrullero con `nextDir()` determinista es lo que
  hace que la pantalla se pueda aprender —que es el juego de Amidar— y el perseguidor con
  `chaseDir()` es lo que impide que aprenderla sea suficiente. Se pierde el tercer tipo
  del original, que cambia de comportamiento al quedar pocos.
- **Sí:** el motor entero es determinista, sin una línea de azar, como Frogger. Se pierde
  la sorpresa; se gana que una posición se reproduzca en la consola sin montar el juego,
  que es lo único que hace depurable un motor de perseguidores.
- **No:** perseguidores que calculen ruta con búsqueda por la malla. `chaseDir()` compara
  cuatro distancias y ya basta para agobiar; la IA de verdad es lo que le costó a `pacman`
  un C10 de 0 en la rúbrica.
- **Sí:** el perseguidor entra por el reloj y no desde el principio. Es lo que le da
  sentido al reloj: sin él, agotar el tiempo no tendría consecuencia y la barra sería
  decoración.
- **Sí:** los enemigos están quietos en `"ready"`. Reaparecer con uno encima es perder una
  vida sin haber jugado.

**El salto de pintura**

- **Sí:** tres saltos por vida, cuatro segundos fuera, tope de cinco. Es la mecánica que
  convierte al pintor en algo más que una presa, y el recurso limitado es lo que hace que
  gastarla sea una decisión. Se paga con una fase más en las entidades —el campo `out`— y
  con una cifra más pintada en el canvas.
- **Sí:** los saltos se recargan al morir y **no** al cambiar de tablero. Recargarlos por
  tablero los convierte en un impuesto que se paga solo; recargarlos al morir evita que
  perder una vida arrastre la siguiente.
- **No:** que el salto mate a los enemigos y dé puntos, al modo de las píldoras de
  Pac-Man. Es otra mecánica —la persecución invertida— y otro equilibrio de puntos
  crecientes; aquí el salto compra tiempo, no puntuación.
- **Sí:** las cuatro esquinas conceden un salto además de mil puntos. Es lo que hace que
  el bonus de esquinas se persiga aunque vaya mal la partida, y es exactamente lo que
  premia el original.

**El reloj y la puntuación**

- **Sí:** 90 segundos que bajan 5 por ronda con suelo en 60. La ronda 1 sobra tiempo y la
  7 no, que es la curva que se busca; el suelo evita que a partir de la ronda 10 el
  perseguidor entre antes de cerrar la primera casilla.
- **Sí:** 10 puntos por segundo sobrante, como Frogger. Premia terminar rápido sin
  obligar, y es un precedente del repo en vez de una idea nueva.
- **Sí:** casilla 100, fila 300, esquinas 1000, tablero 1000 × ronda. Da al marcador un
  rango ancho y hace que las rondas altas decidan la partida, sin escalar el valor de la
  casilla —que dejaría la puntuación ilegible—.
- **No:** bonus de columna además del de fila. Con 6 columnas y 5 filas, pagar las dos
  cosas convierte casi cada casilla tardía en un bonus y aplana la decisión de por dónde
  pintar.
- **Sí:** cada bonus se paga una sola vez por tablero, con `rowsPaid` y `cornersPaid`.
  Sin esa contabilidad, repasar una fila ya cerrada la volvería a pagar.

**Los temas**

- **Sí:** dos temas que alternan por ronda y cambian siluetas y el par de colores de
  raíl. Es el contenido más barato de todos —dos entradas en dos arrays de constantes— y
  el que más se nota: la ronda par no se parece a la impar de un vistazo.
- **No:** que los temas sean skins del sistema de `skin-designer`. Una skin es la paleta
  de la máquina y la elige quien juega; el tema aquí es estado de partida y lo elige la
  ronda. Mezclarlos haría que cambiar de skin cambiara de ronda o al revés. Las tres
  skins de Amidar —`clasico`, `neon` y `retro`— siguen siendo una ronda aparte de
  `skin-designer`, y se aplicarán sobre las once ranuras de color de `constants.ts`.
- **No:** un tema por sprites. El motor no carga archivos y esta spec no estrena ese
  pipeline: Frogger demostró que una máquina entera se dibuja con primitivas.

**El juego**

- **Sí:** al perder una vida se conserva la pintura del tablero y no se recarga el reloj.
  Lo primero es lo que hace el original y evita rehacer treinta casillas con menos vidas;
  lo segundo evita que morir sea una forma de comprar tiempo.
- **Sí:** el nivel sube sólo al completar el tablero, y `level` alimenta `roundPlan()`.
  Una sola cifra hace de rótulo del HUD y de entrada de la progresión, así que no pueden
  desincronizarse.
- **Sí:** el giro se encola y se aplica al llegar al nodo, como el `queued` de Snake. Sin
  cola, pulsar medio segundo antes del cruce se pierde y el juego se siente pegajoso.

**El mando**

- **Sí:** `ESPACIO` hace dos cosas según la fase: arranca en `"ready"` y salta la pintura
  en `"playing"`. Es la única forma de tener salto **y** arranque con cinco teclas, y no
  es ambiguo porque las dos fases se distinguen en pantalla. Se pierde poder explicar el
  botón con una sola palabra, y por eso el `aria` dice `Saltar la pintura`, que es lo que
  hace el 99 % del tiempo.
- **No:** que la partida arranque sola para dejarle a `ESPACIO` una sola función. Devuelve
  el problema de reaparecer en marcha, que Arkanoid, Snake y Frogger ya resolvieron al
  revés.
- **Sí:** `B` apagado en `ENGINE_PAD`, como en Arkanoid, Snake y Frogger. No hay una sexta
  tecla que repartir.

**Lo que no se toca**

- **No:** extender `GameMount` ni `GameCallbacks`. Las tres cifras del HUD dicen la
  verdad, y el progreso, el reloj y los saltos se pintan en el canvas, que es la salida
  que ya usó Frogger para su cronómetro. Es la quinta máquina seguida que entra sin tocar
  el contrato.
- **Sí:** `initialTab` del salón se queda en `?? "asteroids"`. `asteroids` sigue en el
  catálogo, así que el fallback vale.
- **Sí:** los dos textos de `lib/landing.ts` se actualizan a mano. SPEC 07 los desacopló
  de `GAMES.length` a propósito, así que nadie avisa si se quedan mintiendo.
- **No:** sonido. Ningún motor del vault suena, y meter audio arrastra mute, volumen y
  desbloqueo del `AudioContext`.

## Riesgos

| Riesgo                                                                                                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alguien implementa esta spec y también la hermana, o la segunda encima de la primera.** Los dos `insert` llevan `id = 'amidar'` y `sort_order = 5`: el segundo revienta contra la clave primaria de `public.games`, y antes de eso `GameId` ya tendría el literal duplicado. | Son **alternativas excluyentes**: aprobar una cierra la otra. Al mudar la elegida a `specs/NN-<slug>.md` se borra el directorio `specs/game-jam/amidar/` entero, con las dos specs dentro, así que no queda ninguna en pie para implementar.                   |
| El equilibrio está fijado sobre el papel y aquí son cuarenta y un números: cinco patrulleros a ×2,2 pueden hacer el tablero incompletable en la ronda 5, o 90 segundos pueden sobrar tanto que el perseguidor no llegue a verse nunca.                                         | Los valores base viven en `constants.ts` y la curva entera en `roundPlan()`, que es pura: ajustar la dificultad es cambiar una cifra y no tocar el motor, igual que en Frogger. Hay un criterio que fija la tabla de rondas para que el ajuste sea deliberado. |
| La doble función de `ESPACIO` confunde: se pulsa para arrancar, la fase ya es `"playing"` por un frame y se gasta un salto sin querer.                                                                                                                                         | El paso 6 la implementa como un `if` sobre `phase` **antes** de consumir el flanco, y hay un criterio de aceptación explícito: `ESPACIO` en `"ready"` arranca y no gasta salto.                                                                                |
| El determinismo de `nextDir()` deja recorridos que no barren la malla, y con cinco patrulleros tres acaban recorriendo el mismo pasillo.                                                                                                                                       | El paso 1 verifica la secuencia en consola antes de que exista el motor, y las semillas son el índice del patrullero, así que separar recorridos es cambiar la regla en `grid.ts` sin tocar nada más.                                                          |
| `chaseDir()` devuelve una dirección sin raíl en un borde y el perseguidor se sale de la malla.                                                                                                                                                                                 | Está en la verificación del paso 1: `chaseDir` nunca devuelve una dirección para la que `hasRail()` sea falso, y la inversión es su último recurso.                                                                                                            |
| La banda superior se llena de tres indicadores y en `handheld` no se lee ninguno.                                                                                                                                                                                              | Los 80 px de banda son lógicos y escalan con el mundo; se comprueba al verificar el paso 8 en las tres maquetaciones. Si aprieta, los pips de `SALTOS` se mueven bajo la malla, que tiene otros 80 px libres.                                                  |
| La regla de `spanned` se implementa a ojo y una arista se pinta sin recorrerse entera, con lo que el tablero se completa antes de tiempo.                                                                                                                                      | Hay un criterio de aceptación específico: invertir a mitad y volver al nodo de partida **no** pinta la arista.                                                                                                                                                 |
| El paso 8 se trocea «para que sea más granular» y deja el repo o una ruta pública rota entre commits.                                                                                                                                                                          | Está escrito como indivisible en el propio paso, con la razón: `GameId` no compila sin `GAMES` ni sin el `case`, y `ENGINES` decide si `/jugar/amidar` enseña algo. Es el razonamiento del paso 2 de SPEC 07.                                                  |
| `laberinto` se queda en `ArchivedPreviewId` además de entrar por `GameId`: compila igual y deja dos escenas divergiendo.                                                                                                                                                       | Hay un criterio que lo comprueba con `grep`: el id debe aparecer cero veces en `lib/preview-art.ts`, y `ArchivedPreviewId` quedar en tres miembros.                                                                                                            |
| Guardar la primera marca de Amidar revienta contra la clave ajena si el paso 9 no se aplicó.                                                                                                                                                                                   | El paso 9 va inmediatamente después del 8 y su verificación es exactamente ésa: guardar una marca. Entre los dos pasos la máquina se juega y sólo falla al terminar.                                                                                           |
| Con seis enemigos, 71 raíles y el trazo parcial, el frame se pasa de presupuesto en un teléfono.                                                                                                                                                                               | Las 71 aristas se pintan con dos `stroke` agrupados por estado —sin pintar y pintadas—, no con 71 llamadas sueltas, y las casillas reclamadas son `fillRect`. Si aun así costara, es una ronda de `game-performance-booster`, que mide antes y después.        |

## Lo que **no** entra en esta spec

- Aristas ausentes y disposiciones de malla por ronda.
- La segunda pantalla del arcade, la del mono y las lianas.
- Enemigos que cambian de comportamiento a media pantalla.
- Animaciones de muerte, del pintor y de los enemigos.
- Sprites de cualquier clase: el motor no carga archivos.
- Las tres skins de la máquina, que son ronda de `skin-designer`.
- Sonido, aquí y en las otras cinco máquinas.
- Autenticación, antitrampas, moderación, realtime y paginación del marcador.
- Tests.

Cada una de esas, si llega, va en su propia spec.
