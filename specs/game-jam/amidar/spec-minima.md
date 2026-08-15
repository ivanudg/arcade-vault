# GAME JAM · AMIDAR — version minima: la malla, la pintura y dos perseguidores

> **Estado:** Borrador de jam — no aprobada, no implementada
> **Alternativa de:** `specs/game-jam/amidar/spec-completa.md`. Se implementa una de las dos, nunca las dos.
> **Depende de:** SPEC 05, SPEC 07
> **Fecha:** 2026-08-15
> **Objetivo:** Añadir `amidar` como sexta máquina del vault con el motor más barato que sigue siendo Amidar: una malla de raíles, casillas que se reclaman al cerrar su perímetro y dos perseguidores deterministas, sin saltos de pintura, sin reloj y sin contenido por ronda.

## Por qué existe esta spec

Amidar no tiene original en el repo. `references/started-games/` está agotado —hoy
sólo queda un `.DS_Store` dentro— y `references/source-assets/` ni existe, así que
aquí no hay un `game.js` del que copiar la física ya equilibrada ni una tabla de
puntos decidida por otro. Es el caso de Frogger en SPEC 14 y el de Snake en SPEC 10:
**el motor se escribe entero y las cifras las fija esta spec**. Quien implemente las
copia sin reinterpretar, exactamente como copiaría las de un original.

Eso mueve el trabajo de sitio. En un puerto lo caro es matar las cuatro cosas que un
`game.js` de navegador hace y que no sobreviven a montarse y desmontarse —el
`getElementById` al cargar, el estado en variables de módulo, los listeners eternos y
el `requestAnimationFrame` que no se puede cancelar—. Aquí no hay ninguna que matar, y
a cambio hay que inventar lo que un puerto regala: cuánto corre el pintor, cuánto
corren los perseguidores, cuánto vale una casilla y qué pasa cuando el tablero se
completa. Los diecisiete números que hacen falta están escritos abajo, en un solo
archivo, para que ajustar la dificultad sea cambiar una cifra y no tocar el motor.

Y hay una decisión que es la razón de existir de esta spec, no un detalle: **el
alcance**. Amidar de salón trae saltos de pintura, dos temas que alternan, bonus por
fila y por esquinas, un reloj que suelta un perseguidor especial y una progresión de
rondas. Todo eso cabe en el contrato del vault —lo desarrolla la spec hermana,
`specs/game-jam/amidar/spec-completa.md`— y todo eso cuesta un archivo más, unas
treinta constantes más y bastantes más criterios que verificar. Esta versión se queda
con la mecánica central y nada más: recorrer la malla, cerrar rectángulos y no dejarse
tocar. La primera razón es que el verbo de Amidar se entiende en la primera partida sin
ninguno de esos añadidos, y una máquina que no se entiende no se arregla con contenido.
La segunda es que la mecánica de reclamar por perímetro no existe en el vault y esta
versión la trae entera: lo que se recorta es contenido, no juego. La tercera es de
riesgo: los números de un motor inventado se validan jugando, y es más honesto validar
diecisiete que cincuenta.

La miniatura, en cambio, sale gratis en las dos versiones. `lib/preview-art.ts` guarda
desde SPEC 07 una escena archivada llamada `laberinto`: muro exterior, dos bloques
interiores, una fila de puntos amarillos, una figura amarilla y un guardián magenta. Es
una malla con un perseguidor dentro, ya dibujada. Se **mueve** a `GameId` —sale de
`ArchivedPreviewId` y el `case` se renombra—, que es la regla que ya siguieron Tetris,
Arkanoid, Snake y Frogger.

## Alcance

**Dentro:**

- **`lib/games/amidar/constants.ts`**: mundo, malla, velocidades, vidas y puntuación.
  Valores nuevos, fijados en esta spec.
- **`lib/games/amidar/grid.ts`**: la geometría de la malla —índices de arista, nodos,
  las cuatro aristas de una casilla, `nextDir()`—, toda ella pura y sin estado.
- **`lib/games/amidar/entities.ts`**: `Painter` y `Chaser` como clases tipadas, con el
  `ctx` siempre por parámetro.
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
  los seis valores de `GameCategory` quedan estrenados—, y que de las escenas
  archivadas quedan tres.

**Fuera de alcance (para futuras specs):**

- **El salto de pintura.** El botón de Amidar que tira a todos los enemigos fuera del
  tablero unos segundos, con su cuenta de tres por vida y el que se gana al pintar las
  cuatro esquinas. Se queda fuera por coste: obliga a una fase más en el motor, a una
  cuarta cifra pintada en el canvas y a equilibrar cuánto dura. Está desarrollado en
  `specs/game-jam/amidar/spec-completa.md`.
- **El perseguidor del reloj.** El enemigo que entra cuando se agota el tiempo del
  tablero y sigue el rastro del jugador en vez de patrullar. Fuera por decisión: es un
  segundo tipo de enemigo con otra regla de movimiento, y esta versión tiene uno solo.
  Desarrollado en la spec completa.
- **El reloj de tablero.** Los noventa segundos con su barra en el canvas y su bonus
  por segundo sobrante. Fuera por coste, y porque sin perseguidor no tendría
  consecuencia. Desarrollado en la spec completa.
- **Los bonus de fila, de columna y de las cuatro esquinas.** Aquí una casilla vale lo
  mismo esté donde esté. Desarrollado en la spec completa.
- **Los dos temas alternos** —la jungla y la fábrica, con sus dos juegos de siluetas—.
  Fuera por coste. Desarrollado en la spec completa.
- **La progresión por ronda con más enemigos.** Aquí lo único que sube es la velocidad.
  Desarrollado en la spec completa.
- **El trazo de pintura parcial**: ver cómo se pinta la arista mientras se recorre.
  Aquí la arista aparece pintada al llegar al nodo. Desarrollado en la spec completa.
- **Aristas ausentes y tableros con callejones.** La malla es siempre completa en las
  dos versiones, y por la misma razón: una casilla a la que le falte un lado no se
  puede reclamar nunca y el tablero deja de poder terminarse.
- **Sonido**, aquí y en las otras cinco máquinas.
- **Skins.** `GameMount.skins` y `GameHandle.setSkin()` son opcionales y esta spec no
  los declara. Vestir la máquina es trabajo de `skin-designer`, en su propia ronda.
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
la barra de progreso y otra de 80 abajo.

```
        ORIGIN_X = 32                       W = 640
      +--------------------------------------------+  y = 0
      |            banda de estado (PINTADO)       |
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
total. Ninguna falta: la malla es siempre completa.

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
export const CHASER_SPEED = 120;
/** Perseguidores en el tablero. Fijo: esta versión no los aumenta por nivel. */
export const CHASERS = 2;

/** Lo único que sube con el nivel: `min(SPEED_STEP ** (level - 1), SPEED_CAP)`. */
export const SPEED_STEP = 1.08;
export const SPEED_CAP = 2;

/** Distancia entre centros a la que un perseguidor mata. */
export const HIT_DIST = 20;

export const POINTS_TILE = 100;
export const POINTS_BOARD = 1000;

export const COLOR_BG = "#000";
export const COLOR_RAIL = "rgba(0,245,255,0.28)";
export const COLOR_PAINTED = "#00f5ff";
export const COLOR_TILE = "rgba(245,255,0,0.18)";
export const COLOR_PLAYER = "#f5ff00";
export const COLOR_CHASER = "#ff006e";
export const COLOR_BAR = "rgba(0,245,255,0.35)";
```

Diecisiete números y siete colores. El factor de velocidad del nivel `n` es
`min(1.08 ** (n - 1), 2)`: el nivel 1 corre a 168/120, el nivel 10 a ×1,999 —o sea el
tope—, y a partir de ahí se sigue jugando al mismo ritmo hasta perder.

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
 * La dirección que toma un perseguidor al llegar a `(col, row)`. **Pura y sin
 * azar**: depende sólo del nodo, de la dirección de entrada y de `seed`, que es
 * el índice del perseguidor.
 */
export function nextDir(col: number, row: number, dir: Dir, seed: number): Dir;
```

`tileClosed(c, r)` mira exactamente cuatro aristas: `hIndex(c, r)`, `hIndex(c, r + 1)`,
`vIndex(c, r)` y `vIndex(c + 1, r)`.

`nextDir()` es el corazón del enemigo y **no usa `Math.random()`**, igual que Frogger:
mantiene el eje mientras haya raíl y, cuando `(col + row + seed) % 2 === 0`, gira al eje
perpendicular hacia el lado que marque `(col + seed) % 2`; si el raíl de continuación no
existe —el enemigo está en un borde—, invierte. El recorrido resultante barre la malla
como el trazo de un amidakuji, y dos partidas del mismo nivel se juegan igual: una
posición se reproduce en la consola sin montar el juego.

**`entities.ts`.** Dos clases, con el `ctx` siempre por parámetro. Las dos comparten el
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
  draw(ctx: CanvasRenderingContext2D): void;
}

export class Chaser {
  transit: Transit;
  /** Índice del perseguidor: es la `seed` que le pasa a `nextDir()`. */
  seed: number;
  advance(dt: number, speed: number): void;
  reset(): void;
  draw(ctx: CanvasRenderingContext2D): void;
}
```

El `Painter` se dibuja como un triángulo amarillo apuntando en su dirección; el `Chaser`
como un rombo magenta. Los dos son primitivas: `Path2D` de cuatro puntos y `fill`. No se
carga ningún archivo.

**`index.ts`.** El estado de partida, dentro del closure de `mount()`.

```ts
interface Run {
  painter: Painter;
  chasers: Chaser[];
  /** 36 aristas horizontales pintadas o no. */
  h: boolean[];
  /** 35 verticales. */
  v: boolean[];
  /** 30 casillas reclamadas o no. */
  tiles: boolean[];
  /** Casillas reclamadas en el tablero actual; a `TILES` se completa. */
  claimed: number;
  score: number;
  lives: number;
  level: number;
  phase: "ready" | "playing" | "gameover";
}
```

`phase` y no `state`, porque `GameState` ya son las tres cifras del HUD. `"ready"` es el
pintor quieto en la esquina inferior izquierda esperando `ESPACIO`: es la fase con la
que empieza la partida y también cada vida después de perder una. Reaparecer en marcha
es morir antes de reaccionar, que es lo que ya resolvieron Arkanoid, Snake y Frogger.

**Las reglas de partida, escritas para que no haya que deducirlas:**

- Una arista se marca pintada cuando el pintor llega a un nodo con `spanned === true`.
- Al pintar una arista se comprueban **sólo** las casillas que la tocan —una o dos—; si
  alguna cierra, se reclama, suma `POINTS_TILE` y se rellena.
- Al llegar a `TILES` el tablero está completo: suma `POINTS_BOARD`, `level` sube uno,
  las aristas y las casillas se vacían, todo el mundo vuelve a su sitio y la fase pasa a
  `"ready"`. La puntuación no se toca.
- Tocar un perseguidor —distancia entre centros menor que `HIT_DIST`— resta una vida.
  **La pintura del tablero se conserva**; el pintor y los perseguidores vuelven a sus
  posiciones iniciales y la fase pasa a `"ready"`.
- Sin vidas, la fase pasa a `"gameover"`, se llama a `onGameOver(score)` una sola vez y
  el bucle se detiene.
- Los perseguidores **no** se mueven en `"ready"`: la reaparición no puede matar.

### La máquina nueva — entrada en `GAMES`

Última del array, sexta posición.

```ts
{
  id: "amidar",
  title: "AMIDAR",
  cat: "LABERINTO",
  glow: "#f5ff00",
  playable: true,
  desc: "Recorre la malla y reclama cada casilla que cierres.",
  long: "El clásico de la malla de raíles, con su mecánica entera. Recorres las líneas de una rejilla de treinta casillas y cada vez que completas los cuatro lados de una, la casilla es tuya y vale cien puntos. Dos perseguidores patrullan la malla con el trazo del amidakuji: no persiguen, barren, y siempre igual, así que la misma pantalla se puede aprender. Cerrar las treinta vale mil puntos, limpia el tablero y sube el nivel, y con cada nivel los perseguidores corren un ocho por ciento más, hasta el doble. Tres vidas: al perder una la pintura se conserva y vuelves a la esquina de salida.",
  controls: "Flechas ← ↑ → ↓ recorren la malla · ESPACIO arranca",
}
```

`LABERINTO` estrena la **sexta y última** categoría de `GameCategory`, así que el filtro
de `/biblioteca` pasa de cinco opciones vivas a seis y no queda ninguna vacía. El
amarillo repite con Asteroids, que es inevitable con tres neones y seis máquinas; las
siluetas no se confunden —malla con casillas rellenas frente a campo de rocas—.

### El HUD y las tres cifras

Los tres rótulos dicen la verdad sin forzar nada, así que **el contrato no se toca por
quinta vez consecutiva**.

| Cifra   | Qué es en Amidar                                        | Rótulo       |
| ------- | ------------------------------------------------------- | ------------ |
| `score` | Puntos: 100 por casilla y 1000 por tablero completo     | `PUNTUACION` |
| `lives` | Vidas restantes, de 3 a 0                               | `VIDAS`      |
| `level` | Tablero en curso; sube al reclamar las treinta casillas | `NIVEL`      |

`hud: ["PUNTUACION", "VIDAS", "NIVEL"]`, los mismos de Asteroids, Arkanoid, Snake y
Frogger.

Lo que el canvas **sí** pinta, porque no tiene equivalente fuera —la novena regla del
contrato, la misma que ampara las barras de potenciador de Asteroids y el cronómetro de
Frogger—: una barra de progreso en la banda superior, rotulada `PINTADO`, que se llena
de izquierda a derecha con `claimed / TILES`. No pinta puntuación, vidas, nivel ni
`GAME OVER`.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('amidar', 'AMIDAR', 'LABERINTO', true, 5);
```

Ningún `update`: las cinco filas existentes tienen `sort_order` 0, 1, 2, 3 y 4, así que
el 5 continúa la serie sin tocar nada. No se siembra ninguna marca, igual que en las
SPEC 08, 09, 10 y 14.

## Plan de implementación

Cada paso deja el repo compilando. Los pasos 1 a 5 no los consume nadie: se verifican
con `npm run build` y `npx tsc --noEmit`.

1. **Constantes y geometría.** `lib/games/amidar/constants.ts` con los diecisiete
   números y los siete colores de esta spec, y `lib/games/amidar/grid.ts` con `nodeX`,
   `nodeY`, `hIndex`, `vIndex`, `hasRail`, `stepNode`, `tileClosed` y `nextDir`, todas
   puras.
   _Verificación:_ `npx tsc --noEmit` pasa; en un `node -e` suelto, `nextDir` devuelve
   la misma secuencia de 200 direcciones dos veces seguidas para la misma semilla.

2. **Las entidades.** `lib/games/amidar/entities.ts` con `Transit`, `Painter` y
   `Chaser`. `advance()` acumula `speed * dt` sobre `t` normalizado a la arista, y al
   pasar de 1 recoloca el nodo de origen y devuelve la arista completada —o nada, si
   `spanned` era `false`—. `reverse()` invierte a mitad de arista y apaga `spanned`.
   _Verificación:_ `npx tsc --noEmit` pasa.

3. **El esqueleto de `mount()`.** `lib/games/amidar/index.ts` exporta
   `amidarGame: GameMount` con su `world` y su `hud`. `mount()` crea el `Run` en el
   closure, engancha la entrada con `createInput()` y devuelve el `GameHandle`. El bucle
   de `requestAnimationFrame` ya corre con el `dt` recortado a `MAX_DT = 0.05`, pero
   `update` y `draw` están vacíos. **`mount()` emite el estado inicial antes de devolver
   el handle**, para que el `FRESH_RUN` de `PlayCabinet` no se vea durante la carga.
   `destroy()` cancela el frame guardado, desengancha la entrada y es idempotente.
   _Verificación:_ `npm run build` pasa; nadie lo monta todavía.

4. **Implementar `update(dt)`.** En `"ready"`, `ESPACIO` pasa a `"playing"`. En
   `"playing"`: aplicar el giro encolado si hay raíl, avanzar el pintor, marcar la arista
   completada, comprobar las una o dos casillas que toca, sumar, avanzar los
   perseguidores con `nextDir()` y el factor de velocidad del nivel, y comprobar la
   distancia. Tablero completo, muerte y fin de partida según las reglas escritas arriba.
   `onGameOver` se dispara **una sola vez** —flag `overSent`, rearmado sólo en
   `restart()`— y el bucle se detiene.
   _Verificación:_ `npx tsc --noEmit` pasa.

5. **Implementar `draw()`.** Fondo, los 71 raíles en `COLOR_RAIL` y los pintados en
   `COLOR_PAINTED`, las casillas reclamadas como un `fillRect` de `COLOR_TILE` con
   inset, el pintor, los perseguidores y la barra `PINTADO`. **No se dibuja**
   puntuación, vidas, nivel ni `GAME OVER`: eso lo pinta React a veinte píxeles.
   _Verificación:_ `npm run build` pasa.

6. **La máquina entra en el vault.** Este paso es **indivisible** y toca cinco archivos
   a la vez, porque separarlo deja el repo o una ruta pública rota: el literal
   `"amidar"` en `GameId` no compila sin su entrada en `GAMES` ni sin el `case` de
   `drawPreview()` —el `id satisfies never` rompe el build—, y `/jugar/amidar`
   respondería en blanco sin la línea de `ENGINES`, que es `Partial` y no avisa. Es el
   mismo razonamiento del paso 2 de SPEC 07 y **no se trocea «para que sea más
   granular»**.
   - `lib/games.ts`: `"amidar"` en `GameId` y la entrada al final de `GAMES`.
   - `lib/games/engines.ts`: `amidar: amidarGame`.
   - `components/game-pad.tsx`:
     `amidar: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"]` en
     `ENGINE_KEYS`, y
     `amidar: { a: { code: "Space", aria: "Arrancar" }, b: null }` en `ENGINE_PAD`.
   - `lib/preview-art.ts`: `"laberinto"` sale de `ArchivedPreviewId` y el
     `case "laberinto"` se renombra a `case "amidar"`. **Se mueve, no se copia**: el id
     no puede quedar en los dos sitios.

   _Verificación:_ `/biblioteca` muestra seis tarjetas, `/juego/amidar` y
   `/jugar/amidar` responden 200, la partida se juega con el teclado y con el mando, y
   las otras cinco máquinas se ven y se juegan igual.

7. **Migración `<sello>_amidar.sql`.** El `insert` de la fila con `sort_order: 5`.
   Aplicar con `npx supabase db push`; **nunca** con `apply_migration` por MCP, que iría
   al proyecto remoto sin dejar rastro en git.
   _Verificación:_ `public.games` tiene 6 filas, `npx supabase migration list` marca la
   migración aplicada, y guardar una marca de Amidar no revienta contra la clave ajena.

8. **Los dos textos que contarían mal.** `lib/landing.ts`: `STATS` pasa de
   `{ value: "5", unit: "MAQUINAS" }` a `"6"`, y el `desc` de `FEATURES` deja de decir
   «cinco clásicos» para nombrar los seis. Y la sexta fila de
   `references/implemented-games.md`, que se alinea a mano porque `.prettierignore`
   excluye `references/`.
   _Verificación:_ la portada dice `6 MAQUINAS`, la tarjeta de ventajas nombra a Amidar
   y la tabla tiene seis filas.

9. **Documentar en `CLAUDE.md`.** Que el vault tiene seis máquinas y `amidar` es la
   primera de `LABERINTO`, con lo que los seis valores de `GameCategory` quedan
   estrenados; que es la tercera escrita desde cero y que su equilibrio entero vive en
   `constants.ts`; que no hay ni un `Math.random()` en el motor; y que de las escenas
   archivadas quedan **tres**, porque `laberinto` hizo el viaje a `GameId`.
   _Verificación:_ el apartado existe y nombra `lib/games/amidar/`, `grid.ts` y
   `nextDir()`.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/amidar/constants.ts`, `grid.ts`, `entities.ts` e `index.ts`, y
      ningún archivo más en ese directorio.
- [ ] `lib/games/amidar/` no importa nada de `react`, `next` ni `@/components`.
- [ ] En el ámbito de módulo de `lib/games/amidar/index.ts` no hay ni una variable
      mutable: todo el estado vive en `mount()`.
- [ ] Montar y destruir dos veces no deja ningún `requestAnimationFrame` vivo ni ningún
      listener en `window`.
- [ ] `grep -rn "Math.random" lib/games/amidar/` no devuelve nada.
- [ ] Dos partidas del mismo nivel, pilotadas con la misma secuencia de teclas, dan la
      misma puntuación y las mismas posiciones de perseguidor.
- [ ] La malla tiene 36 aristas horizontales, 35 verticales y 30 casillas, y ninguna
      arista falta.
- [ ] El pintor sólo se mueve por raíles: nunca aparece fuera de una arista de la malla.
- [ ] Recorrer una arista entera la deja pintada; invertir a mitad y volver al nodo de
      partida **no** la pinta.
- [ ] Cerrar los cuatro lados de una casilla la reclama, la rellena y suma exactamente
      100 puntos.
- [ ] Una casilla ya reclamada no vuelve a sumar al repasar sus lados.
- [ ] Reclamar las 30 casillas suma 1000, sube `level` uno, vacía el tablero y devuelve
      la fase a `"ready"` sin tocar la puntuación.
- [ ] Los dos perseguidores no se mueven mientras la fase es `"ready"`.
- [ ] Tocar un perseguidor resta una vida, conserva la pintura del tablero y devuelve al
      pintor a la esquina inferior izquierda.
- [ ] Perder la tercera vida dispara `onGameOver` exactamente una vez y detiene el bucle.
- [ ] En el nivel 10 los perseguidores corren al tope, ×2, y no más rápido en el 11.
- [ ] El canvas **no** pinta `PUNTUACION`, `VIDAS`, `NIVEL` ni `GAME OVER`.
- [ ] El canvas pinta la barra `PINTADO` y su longitud coincide con las casillas
      reclamadas.

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
- [ ] Con el ratón o el dedo se recorre la malla en las cuatro direcciones y se arranca,
      sin tocar el teclado.
- [ ] Soltar el botón o sacar el puntero de él suelta la tecla.
- [ ] El botón `A` del mando de consola dice `Arrancar` en su `aria` y `B` sale apagado.
- [ ] El pintor empieza quieto en la esquina de salida y no se mueve hasta `ESPACIO`,
      tanto al empezar como después de perder una vida.
- [ ] El HUD rotula `PUNTUACION`, `VIDAS` y `NIVEL`, y las tres cifras coinciden con la
      partida.
- [ ] Al terminar `CARGANDO CARTUCHO` el HUD ya muestra `0 / 3 / 1`, sin parpadeo.
- [ ] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia.
- [ ] PAUSA congela el canvas y SEGUIR reanuda en el mismo punto.
- [ ] La línea `controls` de la ficha dice lo mismo que `ENGINE_KEYS.amidar`.

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
- [ ] `CLAUDE.md` dice que quedan tres escenas archivadas en `lib/preview-art.ts`.
- [ ] `references/implemented-games.md` tiene seis filas y la última es Amidar.

## Decisiones tomadas y descartadas

**Por qué este alcance**

- **Sí:** esta versión se queda con la mecánica central —recorrer la malla, cerrar
  rectángulos, esquivar— y con una sola progresión, la velocidad. Compra que el motor
  quepa en cuatro archivos y diecisiete constantes, que la revisión se haga de una
  sentada y que el equilibrio inventado sea pequeño de validar. Paga que la máquina
  aguante menos partidas: cerrado el cuarto tablero, lo único nuevo es que los
  perseguidores van más rápido.
- **No:** el alcance de `specs/game-jam/amidar/spec-completa.md` —salto de pintura,
  perseguidor del reloj, bonus de fila y esquinas, dos temas y `rounds.ts`—. Es más
  Amidar y aguanta más partidas, y cuesta un archivo más, unas treinta constantes más y
  bastantes más criterios que verificar sobre números que nadie ha jugado. Se pierde,
  concretamente, la única mecánica ofensiva del juego: aquí al pintor sólo le queda
  huir.
- **Sí:** las dos versiones comparten `id`, `title`, `cat`, `glow`, miniatura,
  `sort_order`, `world` y los tres rótulos del HUD. Es lo que las hace comparables:
  cambiar cualquiera de esos convertiría la decisión de alcance en una decisión de otra
  cosa.

**El origen del juego**

- **Sí:** el motor se escribe desde cero. No hay original en `references/`: es el caso
  de Snake en SPEC 10 y de Frogger en SPEC 14. Se pierde lo que un puerto regala, un
  equilibrio ya probado; a cambio las cifras se fijan aquí y se ajustan jugando.
- **Sí:** los números quedan congelados en esta spec —96 px de celda, 6 × 5 casillas,
  168 y 120 px/s, 3 vidas, 100 y 1000 puntos, ×1,08 con tope ×2, 20 px de contacto—.
  Es el sustituto de la regla «copia literal del original»: quien implemente los copia
  sin reinterpretar, y quien quiera cambiarlos lo hace contra un documento.
- **Sí:** mundo de 640 × 640. Cuadrado porque la malla lo es: un mundo apaisado dejaría
  bandas muertas a los lados, y uno vertical como el de Tetris encogería la celda por
  debajo de lo que el dedo distingue. El gabinete lo acepta sin deformar nada, porque el
  ratio viaja en un `style` desde `world` desde SPEC 11.

**La malla**

- **Sí:** 6 × 5 casillas de 96 px. Treinta casillas es un tablero que se completa en
  torno al minuto y medio sin ser trivial, y 96 px por arista da 0,57 s de recorrido a
  la velocidad del pintor: tiempo de sobra para decidir el giro siguiente.
- **No:** una malla más grande, de 8 × 6. Casillas de 96 no caben en 640 y bajar a 72
  aprieta el margen de reacción justo donde el juego se decide.
- **Sí:** la malla es siempre completa, sin aristas ausentes. Se pierde la silueta del
  tablero del arcade, que tiene callejones; se gana que ninguna casilla pueda quedar
  imposible de cerrar y que el tablero siempre se pueda terminar. **Es la misma decisión
  en la spec completa**, y por la misma razón.
- **Sí:** la arista se pinta al llegar al nodo, con el flag `spanned`. Sin él, recorrer
  media arista y volver pintaría un raíl que nadie recorrió entero, que es el bug obvio
  de esta mecánica.
- **No:** consolidar la pintura por fracciones recorridas. Es más fiel y obliga a llevar
  el estado parcial de 71 aristas; el trazo parcial está en la spec completa, y aun allí
  es sólo dibujo.

**Los perseguidores**

- **Sí:** dos perseguidores del mismo tipo, con `nextDir()` puro y determinista. Es lo
  que hace que la pantalla se pueda aprender —que es el juego de Amidar— y lo que deja
  el motor sin una sola línea de azar, como Frogger. Se pierde la sorpresa de un
  enemigo que reacciona.
- **No:** perseguidores que persigan de verdad, calculando ruta hacia el pintor. Es la
  IA que le costó a `pacman` un C10 de 0 en la rúbrica, y aquí además rompería el
  determinismo entero.
- **No:** más perseguidores por nivel. Sería la progresión de contenido, y ésa es la
  spec hermana.
- **Sí:** los perseguidores están quietos en `"ready"`. Reaparecer con uno encima es
  perder una vida sin haber jugado.

**El juego**

- **Sí:** al perder una vida se conserva la pintura del tablero. Es lo que hace el
  original y evita el bucle de rehacer treinta casillas desde cero con menos vidas.
- **No:** vaciar el tablero al morir. Convierte tres vidas en tres partidas cortas
  pegadas, que es exactamente lo que SPEC 10 descartó para Snake.
- **Sí:** 100 por casilla y 1000 por tablero, sin escalar por nivel. Deja el marcador
  legible —una marca dice cuántas casillas se cerraron— y evita equilibrar a ciegas una
  curva de puntos que nadie ha jugado.
- **No:** puntuación escalada por nivel al modo de Snake. Sería otra cifra inventada
  encima de las diecisiete que ya inventa esta spec.
- **Sí:** el nivel sube sólo al completar el tablero. `level` significa entonces «el
  tablero que voy», que es exactamente lo que rotula.

**El mando**

- **Sí:** `ESPACIO` arranca al pintor y éste nace quieto. Es lo que hicieron Arkanoid,
  Snake y Frogger, deja los cinco botones vivos y resuelve la reaparición.
- **No:** `ESPACIO` apagado, con la partida arrancando sola. Es más barato y deja los
  dos botones de acción del mando de consola muertos: con el dedo, en vertical, el
  bloque de la derecha no haría nada.
- **Sí:** `B` apagado en `ENGINE_PAD`, como en Arkanoid, Snake y Frogger. El salto de
  pintura, que sería su candidato natural, no existe en esta versión.
- **Sí:** el giro se encola y se aplica al llegar al nodo, como el `queued` de Snake.
  Sin cola, pulsar medio segundo antes del cruce se pierde y el juego se siente pegajoso.

**Lo que no se toca**

- **No:** extender `GameMount` ni `GameCallbacks`. Los tres rótulos dicen la verdad y el
  progreso del tablero se pinta en el canvas, que es la salida que ya usó Frogger para
  su cronómetro. Es la quinta máquina seguida que entra sin tocar el contrato.
- **No:** declarar `skins`. Los dos campos del sistema de skins son opcionales a
  propósito; vestir la máquina es una ronda de `skin-designer`, con sus tres skins y su
  ledger.
- **Sí:** `initialTab` del salón se queda en `?? "asteroids"`. `asteroids` sigue en el
  catálogo, así que el fallback vale; cambiarlo sería decidir que el salón abre en la
  máquina más nueva, y eso no lo pide esta spec.
- **Sí:** los dos textos de `lib/landing.ts` se actualizan a mano. SPEC 07 los desacopló
  de `GAMES.length` a propósito, así que nadie avisa si se quedan mintiendo.
- **No:** sonido. Ningún motor del vault suena, y meter audio arrastra mute, volumen y
  desbloqueo del `AudioContext`.

## Riesgos

| Riesgo                                                                                                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alguien implementa esta spec y también la hermana, o la segunda encima de la primera.** Los dos `insert` llevan `id = 'amidar'` y `sort_order = 5`: el segundo revienta contra la clave primaria de `public.games`, y antes de eso `GameId` ya tendría el literal duplicado. | Son **alternativas excluyentes**: aprobar una cierra la otra. Al mudar la elegida a `specs/NN-<slug>.md` se borra el directorio `specs/game-jam/amidar/` entero, con las dos specs dentro, así que no queda ninguna en pie para implementar.              |
| El determinismo de `nextDir()` deja recorridos que no barren la malla: los dos perseguidores acaban patrullando siempre el mismo pasillo y media rejilla queda gratis.                                                                                                         | El paso 1 verifica la secuencia en consola antes de que exista el motor, y hay un criterio de aceptación sobre reproducibilidad. Si el barrido es pobre, la regla se corrige en `grid.ts` sin tocar nada más; las semillas son el índice del perseguidor. |
| El equilibrio está fijado sobre el papel: 168 px/s puede resultar soso, o dos perseguidores pueden hacer el tablero incompletable a partir del nivel 6.                                                                                                                        | Los diecisiete números viven juntos en `constants.ts` y se ajustan sin tocar el motor, como en Snake y Frogger. El marcador arranca vacío, así que un reajuste temprano no invalida ninguna marca real.                                                   |
| La regla de `spanned` se implementa a ojo y una arista se pinta sin recorrerse entera, con lo que el tablero se completa antes de tiempo.                                                                                                                                      | Hay un criterio de aceptación específico: invertir a mitad y volver al nodo de partida **no** pinta la arista. Se comprueba jugando en diez segundos.                                                                                                     |
| El paso 6 se trocea «para que sea más granular» y deja el repo o una ruta pública rota entre commits.                                                                                                                                                                          | Está escrito como indivisible en el propio paso, con la razón: `GameId` no compila sin `GAMES` ni sin el `case`, y `ENGINES` decide si `/jugar/amidar` enseña algo. Es el razonamiento del paso 2 de SPEC 07.                                             |
| `laberinto` se queda en `ArchivedPreviewId` además de entrar por `GameId`: compila igual y deja dos escenas divergiendo.                                                                                                                                                       | Hay un criterio que lo comprueba con `grep`: el id debe aparecer cero veces en `lib/preview-art.ts`, y `ArchivedPreviewId` quedar en tres miembros.                                                                                                       |
| Guardar la primera marca de Amidar revienta contra la clave ajena si el paso 7 no se aplicó.                                                                                                                                                                                   | El paso 7 va inmediatamente después del 6 y su verificación es exactamente ésa: guardar una marca. Entre los dos pasos la máquina se juega y sólo falla al terminar.                                                                                      |
| Con celda de 96 px en un teléfono de 360, el pintor y los perseguidores quedan por debajo de lo que el dedo distingue.                                                                                                                                                         | El mundo es cuadrado y el marco de `PlayCabinet` lo escala completo a la ventana; con 640 lógicos en 328 útiles la celda cae a 49 px reales, que sigue siendo el doble de la celda de Frogger. Se comprueba al verificar el paso 6 en `handheld`.         |

## Lo que **no** entra en esta spec

- El salto de pintura y su cuenta por vida.
- El perseguidor del reloj y el reloj de tablero con su bonus por segundo sobrante.
- Los bonus de fila, de columna y de las cuatro esquinas.
- Los dos temas alternos, la jungla y la fábrica.
- La progresión por ronda con más enemigos y tableros con callejones.
- El trazo de pintura parcial mientras se recorre la arista.
- Las tres skins de la máquina, que son ronda de `skin-designer`.
- Sonido, aquí y en las otras cinco máquinas.
- Autenticación, antitrampas, moderación, realtime y paginación del marcador.
- Tests.

Cada una de esas, si llega, va en su propia spec.
