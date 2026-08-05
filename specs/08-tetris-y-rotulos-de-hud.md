# SPEC 08 — Tetris: segunda máquina y rótulos de HUD por motor

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 07
> **Fecha:** 2026-08-04
> **Objetivo:** Portar el Tetris clásico de `references/started-games/03-tetris/` a un motor que cumpla el contrato y añadirlo como segunda máquina del vault, extendiendo el contrato con los rótulos del HUD para que la cifra del medio pueda llamarse `LINEAS` y no `VIDAS`.

## Por qué existe esta spec

SPEC 07 dejó el vault con una máquina y una regla: **toda la que entre a partir de
aquí entra con motor**. Ésta es la primera que ejerce esa regla, y por eso hace de
banco de pruebas del contrato que SPEC 05 escribió con un solo caso delante.

Dos decisiones no se adivinan leyendo el resultado.

**La primera: el HUD miente si no se toca el contrato.** `GameState` son tres
cifras —`score`, `lives`, `level`— y `components/play-cabinet.tsx` las rotula con
tres literales escritos a mano. Encaja con Asteroids. No encaja con Tetris, que no
tiene vidas. La salida es extender `GameMount` con
`hud: readonly [string, string, string]` y que cada motor declare sus rótulos. Es
el único caso en que una spec de máquina nueva toca el motor de Asteroids, y por
eso va en un paso 0 propio, antes de escribir una línea de Tetris.

La alternativa era enseñar el contador de líneas bajo la etiqueta `VIDAS`. Cuesta
cero y deja una etiqueta que miente en pantalla, y las etiquetas que mienten se
quedan para siempre.

**La segunda: entra un Tetris de 1989, no el de la carpeta.**
`references/started-games/03-tetris/game.js` son 1.938 líneas: cuatro habilidades
cargables con su menú, tres modos de desafío con mutadores, cinco power-ups,
pentominós, T-Spin, combo, back-to-back, cuatro skins, tema claro y audio
sintetizado. De las 45 features del inventario entran 14. Lo que queda fuera no
está descartado: está esperando, con el motor ya en producción y sin riesgo. Lo que
está descartado de verdad —los modos, los skins, el audio, los récords locales— lo
está por una razón técnica escrita, no por falta de tiempo.

Y una tercera que es de higiene: la escena `caida` de `lib/preview-art.ts` **se
mueve**, no se copia. SPEC 07 la archivó diciendo exactamente para qué. Este es el
día.

## Alcance

**Dentro:**

- **`lib/games/engine.ts`**: `GameMount` gana `hud: readonly [string, string, string]`,
  campo requerido. Los rótulos van en el orden `score` / `lives` / `level`, en
  mayúsculas y sin tildes.
- **`lib/games/asteroids/index.ts`**: una línea, `hud: ["PUNTUACION", "VIDAS", "NIVEL"]`.
  Ni un píxel cambia.
- **`components/play-cabinet.tsx`**: el HUD deja de escribir tres literales y lee
  `engine.hud`. Además, `ENGINE_KEYS` gana la línea de `tetris`.
- **`lib/games/tetris/constants.ts`**: `COLS`, `ROWS`, `BLOCK`, `WORLD`, `COLORS`,
  `PIECES`, `LINE_SCORES`, `KICKS`, `LOCK_DELAY_MS`, `LOCK_RESET_MAX`, `QUEUE_MAX`,
  y las dos constantes de repetición `DAS_MS` y `ARR_MS`.
- **`lib/games/tetris/pieces.ts`**: el tipo `Piece`, `rotateCW`, `makePiece` y
  `randomPiece`. Ocupa el hueco que en Asteroids ocupa `math.ts`: Tetris no tiene
  geometría continua, tiene matrices.
- **`lib/games/tetris/board.ts`**: el tipo `Board`, `createBoard`, `collide`,
  `merge`, `clearLines`, `ghostY` y el dibujo de una celda. Ocupa el hueco de
  `entities.ts`.
- **`lib/games/tetris/index.ts`**: `tetrisGame: GameMount` con
  `world: { width: 420, height: 600 }`, el `interface Run`, `update`, `draw`, el
  bucle y el `GameHandle`. Todo el estado dentro del closure de `mount()`.
- **`lib/games.ts`**: `GameId` gana el literal `"tetris"` y `GAMES` gana la
  entrada, al final del array.
- **`lib/games/engines.ts`**: una línea, `tetris: tetrisGame`.
- **`lib/preview-art.ts`**: `caida` sale de `ArchivedPreviewId` y el
  `case "caida":` se renombra a `case "tetris":`. La escena no se toca.
- **`supabase/migrations/<sello>_tetris.sql`**: `insert` de la fila `tetris` en
  `public.games` con `sort_order = 1`, y `update` de `asteroids` a `sort_order = 0`.
- **`lib/landing.ts`**: `STATS` pasa de `1 MAQUINA` a `2 MAQUINAS`, y el `desc` de
  la ventaja `JUEGOS CLASICOS` nombra las dos.
- **Apartado en `CLAUDE.md`**: que el contrato lleva rótulos de HUD y que cada
  motor declara los suyos, y que la escena archivada de `caida` ya se movió.

**Fuera de alcance (para futuras specs):**

- **La capa moderna de puntuación**: hold, combo, T-Spin con su variante mini,
  back-to-back y perfect clear. Es lo que separa un Tetris de 1989 de uno de hoy, y
  multiplica por cuatro la superficie que hay que verificar a mano.
- **Las piezas que no son tetrominós**: la tuerca, los tres pentominós y el
  monominó de recompensa.
- **Los cinco power-ups** —bomba, rayo, tinte, gravedad, congelar— y el comodín que
  crea el Tinte.
- **La energía y las cuatro habilidades cargables**: Visión de Futuro, Intercambio
  de Pool, Distorsión Temporal y Rebobinar.
- **La retroalimentación visual**: partículas al estallar una fila, screen shake,
  flash y textos flotantes.
- **Arkanoid.** Sigue esperando en `references/started-games/04-arkanoid/`, con su
  escena `muro` archivada.
- **Simplificar o rediseñar la biblioteca, el salón y la portada.** El buscador y
  los filtros vuelven a tener sentido con dos máquinas; se quedan como están.
- **Tocar el motor de Asteroids más allá de la línea de `hud`.**
- **Autenticación, antitrampas, realtime y validación de la puntuación en
  servidor.** Igual que en SPEC 05 y SPEC 06.
- **Tests.** El repo sigue sin framework y esta spec no lo introduce.
- **Modificar `references/started-games/03-tetris/`.** Queda como está, de
  referencia.

## Modelo de datos

### El contrato — `lib/games/engine.ts`

El único cambio es un campo. `GameWorld`, `GameState`, `GameCallbacks` y
`GameHandle` no se tocan.

```ts
/** Lo que implementa cada juego. `world` es estático, no depende del canvas. */
export interface GameMount {
  world: GameWorld;
  /** Rótulos del HUD, en el orden score/lives/level. MAYÚSCULAS y sin tildes. */
  hud: readonly [string, string, string];
  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle;
}
```

El campo es **requerido, no opcional con default**. Así `tsc` obliga a cada motor a
declarar sus rótulos en vez de heredar en silencio unos que podrían no
corresponderle.

Los dos motores quedan así:

| Motor       | `hud`                               | `score`               | `lives`           | `level`            |
| ----------- | ----------------------------------- | --------------------- | ----------------- | ------------------ |
| `asteroids` | `["PUNTUACION", "VIDAS", "NIVEL"]`  | Puntos de asteroides  | Vidas restantes   | Oleada             |
| `tetris`    | `["PUNTUACION", "LINEAS", "NIVEL"]` | `LINE_SCORES × level` | Líneas acumuladas | `1 + ⌊lines / 10⌋` |

Y un segundo cambio, de comportamiento y no de tipo: **`mount()` emite el estado
inicial antes de devolver el `GameHandle`.** Hasta ahora la primera emisión llegaba
con el primer frame del bucle, y hasta entonces el HUD pintaba la constante
`FRESH_RUN` de `PlayCabinet`, que vale `{ score: 0, lives: 3, level: 1 }`. Para
Asteroids acierta por casualidad; para Tetris pintaría `3` bajo `LINEAS`. Con la
emisión en `mount()`, `FRESH_RUN` deja de verse en cuanto el canvas existe.

### El motor — `lib/games/tetris/`

El mundo lógico es **420 × 600**: los 300 px del tablero (10 × 20 celdas de 30, el
`BLOCK` del original) más 120 px de banda derecha para la pieza siguiente, que es
el ancho exacto del `#next-canvas` del original.

```
x=0            x=300      x=420
┌───────────────┬───────────┐ y=0
│               │  SIG.     │
│   tablero     │  ┌─────┐  │
│   10 × 20     │  │ ██  │  │
│               │  │██   │  │
│               │  └─────┘  │
└───────────────┴───────────┘ y=600
```

El estado de partida, dentro del closure de `mount()`:

```ts
type Cell = number; // 0 = vacía; 1..7 = tetrominó

interface Piece {
  type: number;
  shape: Cell[][];
  x: number;
  y: number;
}

interface Run {
  board: Cell[][];
  current: Piece;
  /** Piezas precalculadas. `queue[0]` es la siguiente. */
  queue: Piece[];
  score: number;
  lines: number;
  level: number;
  /** Milisegundos acumulados hacia la siguiente caída por gravedad. */
  dropAccum: number;
  dropInterval: number;
  /** Lock delay de la pieza activa. `> 0` significa "apoyada". */
  lockTimer: number;
  lockResets: number;
  /** Repetición al mantener: ms que lleva abajo cada tecla de movimiento. */
  held: { ArrowLeft: number; ArrowRight: number; ArrowDown: number };
  phase: "playing" | "gameover";
}
```

`phase` y no `state`: `GameState` ya son las tres cifras del HUD, y confundirlas es
el error caro.

**Constantes, copiadas del original sin retocar ni una:**

```
COLS = 10 · ROWS = 20 · BLOCK = 30
COLORS = los siete primeros del original (I cian, O amarillo, T morado,
         S verde, Z rojo, J azul, L naranja)
PIECES = las siete matrices, con I en 4×4 y O en 2×2
LINE_SCORES = [0, 100, 300, 500, 800]
KICKS = [0, -1, 1, -2, 2]
LOCK_DELAY_MS = 500 · LOCK_RESET_MAX = 15
QUEUE_MAX = 5
```

Las fórmulas, también literales:

```
dropInterval = max(100, 1000 − (level − 1) × 90)   ms
level        = 1 + ⌊lines / 10⌋
puntos       = LINE_SCORES[cleared] × level
soft drop    = +1 por celda
hard drop    = +2 por celda
```

**Las dos únicas constantes que no salen del original** son la repetición al
mantener: `DAS_MS = 170` y `ARR_MS = 50`. El original no las necesita porque se
apoya en el auto-repeat del teclado del sistema operativo, que dispara `keydown`
repetidos. El `press()` del mando táctil no produce ninguno, así que sin esto en
móvil cada celda cuesta un toque. Se aplican a `←`, `→` y `↓`; `↑` y `ESPACIO` son
solo flanco.

### La máquina nueva — entrada en `GAMES`

Última del array, segunda posición.

```ts
{
  id: "tetris",
  title: "TETRIS",
  cat: "PUZZLE",
  glow: "#00f5ff",
  playable: true,
  desc: "Encaja las piezas, limpia lineas y no llegues al techo.",
  long: "El clásico de las siete piezas, entero y jugable de verdad. Las piezas caen cada vez más rápido: cada diez líneas sube un nivel y el intervalo de caída baja noventa milisegundos, hasta un suelo de cien. Cuatro líneas de golpe valen ocho veces lo que una. La proyección marca dónde va a aterrizar la pieza y el retardo de bloqueo da medio segundo para encajarla. La partida acaba cuando la pieza siguiente ya no cabe.",
  controls: "Flechas ← → mueven · ↑ rota · ↓ baja rápido · ESPACIO suelta de golpe",
}
```

`glow` es el cian `#00f5ff` para separarla del amarillo de `ASTEROIDS` en la
rejilla de tarjetas. El título va en mayúsculas y sin tildes, como el resto: Press
Start 2P no tiene esos glifos.

`GameId` deja de ser una unión de un miembro:

```ts
export type GameId = "asteroids" | "tetris";
```

### El HUD y las tres cifras

| Cifra   | Qué es en Tetris                                       | Rótulo       | Cuándo cambia                       |
| ------- | ------------------------------------------------------ | ------------ | ----------------------------------- |
| `score` | `LINE_SCORES[cleared] × level`, más los puntos de drop | `PUNTUACION` | Al limpiar líneas y al bajar/soltar |
| `lives` | Líneas limpiadas acumuladas                            | `LINEAS`     | Al limpiar líneas                   |
| `level` | `1 + ⌊lines / 10⌋`                                     | `NIVEL`      | Cada diez líneas                    |

`emitState()` sigue emitiendo por diferencia: un frame nunca provoca un render. Con
Tetris eso importa más que con Asteroids, porque hay frames enteros en los que no
cambia nada.

`onGameOver(score)` se dispara en un único sitio: cuando la pieza recién sacada de
la cola colisiona en su posición de aparición. Es el **topout**, la única forma de
morir del modo clásico. Las otras dos del original —`timeout` de Contra Reloj y
`crushed` de Supervivencia— pertenecen a modos que no entran, y la victoria de
`winGame()` tampoco: el contrato no distingue acabar bien de acabar mal. Un flag
`overSent` garantiza una sola emisión por partida, y solo `restart()` lo rearma.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('tetris', 'TETRIS', 'PUZZLE', true, 1);

update public.games set sort_order = 0 where id = 'asteroids';
```

El `update` existe porque `sort_order` se documentó como «la posición en `GAMES`» y
hoy miente: `asteroids` es la única máquina y vale `8`, resto de la siembra de
nueve de SPEC 06. La app no lee esas columnas —el título de una máquina sale de
`getGame()`— así que corregirlo no tiene riesgo, y una máquina nueva es el momento
barato de hacerlo.

Las dos tablas después:

| Tabla           | Antes | Después                         |
| --------------- | ----- | ------------------------------- |
| `public.games`  | 1     | 2                               |
| `public.scores` | —     | Sin cambios: no se siembra nada |

El marcador de `tetris` arranca vacío, como el de `asteroids`. Se llena jugando.

## Plan de implementación

Cada paso deja el repo compilando y es commiteable por separado. Los pasos 1 a 5 no
los consume nadie todavía: se verifican con `npm run build` y `npx tsc --noEmit`.

0. **El contrato gana los rótulos del HUD.** `GameMount` en `lib/games/engine.ts`
   gana `hud: readonly [string, string, string]`, requerido.
   `lib/games/asteroids/index.ts` declara `["PUNTUACION", "VIDAS", "NIVEL"]` y su
   `mount()` emite el estado inicial antes de devolver el `GameHandle`. El HUD de
   `components/play-cabinet.tsx` sustituye los tres literales por `engine.hud[0]`,
   `[1]` y `[2]`.
   Verificación: `npx tsc --noEmit` pasa y `/jugar/asteroids` se ve y se juega
   exactamente igual que antes, con `PUNTUACION`, `VIDAS` y `NIVEL`.

1. **Constantes y piezas.** `lib/games/tetris/constants.ts` con los valores
   copiados del original más `DAS_MS` y `ARR_MS`, y `lib/games/tetris/pieces.ts`
   con el tipo `Piece`, `rotateCW`, `makePiece` y `randomPiece`. `randomPiece()`
   sortea entre los siete tetrominós: el `Math.floor(Math.random() * 8) + 1` del
   original incluía la tuerca, que no entra.
   Verificación: `npx tsc --noEmit` pasa.

2. **Tablero y colisiones.** `lib/games/tetris/board.ts` con `createBoard`,
   `collide`, `merge`, `clearLines`, `ghostY` y el dibujo de una celda.
   `clearLines()` devuelve solo cuántas filas cayeron: la copia de filas que el
   original hacía era para las partículas, que no entran.
   Verificación: `npx tsc --noEmit` pasa.

3. **El esqueleto de `mount()`.** `lib/games/tetris/index.ts` exporta
   `tetrisGame: GameMount` con `world: { width: 420, height: 600 }` y
   `hud: ["PUNTUACION", "LINEAS", "NIVEL"]`. Su `mount()` crea el `Run` en el
   closure, engancha `createInput()` y devuelve el `GameHandle` completo: `start`,
   `pause`, `resume`, `restart`, `destroy`, `press` y `release`. El par `play()` /
   `halt()` guarda el id del frame; `destroy()` es idempotente con un flag
   `destroyed`. El bucle ya corre con `dt` recortado a 50 ms, pero `update` y
   `draw` están vacíos.
   Verificación: `npm run build` pasa.

4. **Implementar `update(dt)`.** La entrada con su repetición, la gravedad por
   `dropAccum`, el lock delay con su tope de reinicios, el bloqueo de la pieza, la
   limpieza de líneas, la puntuación, el nivel, el relleno de la cola y el spawn.
   Al colisionar el spawn, `phase` pasa a `"gameover"`, el bucle se detiene y
   `onGameOver(score)` se emite una sola vez. Orden dentro del bucle: `update(dt)`
   → `draw()` → `emitState()` → y después `onGameOver`.
   Verificación: `npx tsc --noEmit` pasa.

5. **Implementar `draw()`.** Fondo, rejilla del tablero, celdas fijas, pieza
   fantasma con alfa 0,2, pieza activa, y la banda derecha con el rótulo `SIG.` y
   la pieza siguiente centrada en una caja de 4 × 4. **No se portan** `updateHUD`,
   `drawEffects`, `drawHold` ni ningún overlay: la puntuación, las líneas, el nivel
   y el `GAME OVER` los pinta React a veinte píxeles del canvas.
   Verificación: `npm run build` pasa.

6. **La máquina entra al catálogo.** **Este paso no se trocea.** Van juntos porque
   separarlos deja el repo sin compilar o una ruta pública rota: el literal
   `"tetris"` en `GameId` no compila sin la entrada de `GAMES`, ni sin el `case` de
   `drawPreview()` —el `default: id satisfies never` rompe el build—, y
   `/jugar/tetris` respondería en blanco sin la línea de `ENGINES`. Son siete
   sitios:
   - `lib/games.ts`: el literal en `GameId` y la entrada al final de `GAMES`. Los
     comentarios de cabecera dejan de decir que queda una máquina.
   - `lib/games/engines.ts`: `tetris: tetrisGame`.
   - `components/play-cabinet.tsx`:
     `ENGINE_KEYS.tetris = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"]`.
   - `lib/preview-art.ts`: `caida` sale de `ArchivedPreviewId` y el `case "caida":`
     pasa a `case "tetris":`. La escena no cambia. La cabecera del archivo deja
     constancia de que esa era la que esperaba.

   Verificación: `/biblioteca` muestra dos tarjetas, `/juego/tetris` y
   `/jugar/tetris` responden 200, `/jugar/tetris` se juega con el teclado y con el
   mando, y `/jugar/asteroids` sigue igual.

7. **La migración.** `supabase/migrations/<sello>_tetris.sql` con el `insert` de
   `tetris` y el `update` del `sort_order` de `asteroids`. Se aplica con
   `npx supabase db push`. Nunca con `apply_migration` por MCP: iría al proyecto
   remoto sin dejar rastro en git.
   Verificación: `npx supabase migration list` la marca aplicada, `public.games`
   tiene dos filas con `sort_order` 0 y 1, y terminar una partida de Tetris y
   pulsar GUARDAR PUNTUACION mete la marca sin reventar la clave ajena.

8. **Los textos que cuentan máquinas.** En `lib/landing.ts`: `STATS` pasa de
   `{ value: "1", unit: "MAQUINA" }` a `2` / `MAQUINAS`, y el `desc` de la ventaja
   `JUEGOS CLASICOS` nombra Asteroids y Tetris. El comentario que explica por qué
   la cifra va escrita a mano se actualiza con ella. `components/site-footer.tsx` y
   `app/not-found.tsx` ya no cuentan máquinas y no se tocan.
   Verificación: la portada dice `2 MAQUINAS` y ninguna pantalla promete una
   máquina que no esté en el catálogo.

9. **Documentar en `CLAUDE.md`.** En «Motores de juego»: que el contrato lleva
   `hud` y que cada motor declara sus tres rótulos, y que los cuatro sitios de una
   máquina nueva son cinco cuando hay escena archivada que mover. Que `caida` ya se
   movió y `ArchivedPreviewId` baja a siete escenas, de las cuales `muro` sigue
   esperando a Arkanoid.
   Verificación: el apartado nombra `hud`, `lib/games/tetris/` y el movimiento de
   `caida`, y no sigue diciendo que el vault tiene una sola máquina.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/tetris/constants.ts`, `pieces.ts`, `board.ts` e `index.ts`.
- [ ] `lib/games/tetris/` no importa nada de `react`, `next` ni de `@/components`.
- [ ] En el ámbito de módulo de `lib/games/tetris/index.ts` no hay ni una variable
      mutable: todo el estado de partida vive dentro de `mount()`.
- [ ] Montar el juego dos veces y destruirlo dos veces no deja ningún
      `requestAnimationFrame` vivo ni ningún listener enganchado en `window`.
- [ ] `←` y `→` mueven una columna, `↑` rota en sentido horario y `↓` baja una fila.
- [ ] Rotar contra una pared desplaza la pieza hasta dos columnas antes de rendirse.
- [ ] La proyección de aterrizaje se ve bajo la pieza activa y desaparece al
      bloquearse.
- [ ] Una pieza apoyada tarda medio segundo en consolidarse, y moverla o rotarla
      reinicia esa espera hasta quince veces.
- [ ] `ESPACIO` suelta la pieza de golpe y suma 2 puntos por cada celda recorrida;
      `↓` suma 1.
- [ ] Una línea vale 100 × nivel, dos 300, tres 500 y cuatro 800.
- [ ] Cada diez líneas sube el nivel y la caída se acelera 90 ms, hasta un suelo de
      100 ms.
- [ ] `constants.ts` no retoca ni un valor del original, salvo `DAS_MS` y `ARR_MS`,
      que no existen allí.
- [ ] El canvas dibuja la pieza siguiente en la banda derecha y **no** pinta
      puntuación, líneas, nivel ni `GAME OVER`.

**El catálogo y las rutas**

- [ ] `GAMES` tiene dos entradas y la segunda es `tetris`, la última del array.
- [ ] `/biblioteca` muestra dos tarjetas y filtrar por `PUZZLE` deja solo `TETRIS`.
- [ ] `/juego/tetris` y `/jugar/tetris` responden 200; `/juego/asteroids` y
      `/jugar/asteroids` siguen respondiendo 200.
- [ ] `/salon` muestra dos pestañas y sin `?juego=` sigue abriendo en `ASTEROIDS`.
- [ ] `ENGINES` tiene dos entradas y `/jugar/tetris` monta un canvas jugable, no
      una pantalla en blanco.

**El mando y el HUD**

- [ ] `GameMount.hud` es requerido: un motor sin él no compila.
- [ ] El HUD de `/jugar/tetris` rotula `PUNTUACION`, `LINEAS` y `NIVEL`, y el de
      `/jugar/asteroids` rotula `PUNTUACION`, `VIDAS` y `NIVEL`.
- [ ] En `/jugar/tetris` el HUD arranca en `0 / 0 / 1`, sin pasar por un `3` bajo
      `LINEAS`.
- [ ] Los cinco botones del mando están vivos en `/jugar/tetris` y ninguno se pinta
      deshabilitado.
- [ ] Mantener pulsado `←` o `→` en el mando táctil mueve la pieza repetidamente,
      no una sola celda.
- [ ] Soltar el botón, sacar el puntero de él o cancelar el gesto detiene la
      repetición.
- [ ] En `/jugar/asteroids` el botón `↓` sigue viéndose deshabilitado.
- [ ] Pulsar `Z`, `C`, `E` o `P` en `/jugar/tetris` no hace nada y no mueve el
      scroll de la página.
- [ ] `PAUSA` congela el canvas y deja el teclado sin efecto; `SEGUIR` reanuda en el
      mismo punto.
- [ ] Cambiar de pestaña pausa la partida sola, y al volver sigue pausada.
- [ ] Que la pieza siguiente no quepa abre `FIN DEL JUEGO` con la puntuación real,
      y el bucle se detiene.
- [ ] `JUGAR DE NUEVO` reinicia a 0 puntos, 0 líneas y nivel 1 sin recargar la
      página.
- [ ] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia.

**La miniatura**

- [ ] `grep -n "caida" lib/preview-art.ts` no devuelve nada: la escena se movió, no
      se copió.
- [ ] `ArchivedPreviewId` tiene siete ids y `muro` sigue entre ellos.
- [ ] La tarjeta de `/biblioteca` y la ficha de `/juego/tetris` muestran la escena
      de Tetris, no la del `default`.
- [ ] Añadir a `GAMES` una máquina sin `case` en `drawPreview()` sigue rompiendo
      `npx tsc --noEmit`.

**El marcador**

- [ ] `public.games` tiene dos filas, con `sort_order` 0 para `asteroids` y 1 para
      `tetris`.
- [ ] `npx supabase migration list` marca aplicada la migración nueva.
- [ ] Terminar una partida de Tetris y pulsar `GUARDAR PUNTUACION` inserta la marca
      sin error de clave ajena.
- [ ] La marca guardada aparece en `/juego/tetris`, en `/salon` y en la actividad de
      la portada.
- [ ] Antes de la primera marca, `/juego/tetris` y la pestaña `TETRIS` de `/salon`
      muestran `SE EL PRIMERO`, no `MARCADOR NO DISPONIBLE`.
- [ ] La tabla de `/juego/asteroids` no cambia por nada de esta spec.

**Nada más se ha movido**

- [ ] `npm run build`, `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] `lib/games/asteroids/` solo cambia en la línea de `hud` y en la emisión del
      estado inicial.
- [ ] `lib/games/input.ts`, `components/game-canvas.tsx` y
      `components/game-preview.tsx` no tienen ni una línea modificada.
- [ ] `lib/leaderboard.ts`, `lib/scores.ts`, `lib/storage.ts`, `lib/session.tsx` y
      `app/jugar/[id]/actions.ts` no cambian.
- [ ] `lib/supabase/` no cambia y `/api/supabase-health` sigue respondiendo 200.
- [ ] El esquema de SPEC 06 no cambia: mismas tablas, mismos índices, mismas
      políticas, mismas dos vistas.
- [ ] `references/started-games/03-tetris/` no tiene ningún cambio.
- [ ] Las flechas y `ESPACIO` solo dejan de hacer scroll dentro de una pantalla de
      juego con la partida activa.

**Documentación**

- [ ] `CLAUDE.md` explica que `GameMount` lleva `hud` y que cada motor declara sus
      tres rótulos.
- [ ] `CLAUDE.md` nombra `lib/games/tetris/` y dice que la escena de `caida` ya se
      movió.
- [ ] `CLAUDE.md` ya no dice que el vault tiene una sola máquina.

## Decisiones tomadas y descartadas

**El HUD**

- **Sí:** extender `GameMount` con `hud`. Tetris no tiene vidas, y el vault tiene
  tres cifras. Se resuelve donde está el problema: en el contrato.
- **No:** enseñar el contador de líneas bajo la etiqueta `VIDAS`. Cuesta cero y deja
  una etiqueta que miente en la pantalla que más se mira. Las etiquetas que mienten
  se quedan para siempre.
- **No:** darle tres vidas artificiales a Tetris, vaciando el tablero en cada
  topout. Cambia el juego para no tocar el contrato, y no existe en ningún Tetris.
- **Sí:** `hud` requerido, sin valor por defecto. Un default habría dejado que un
  motor futuro heredase en silencio unos rótulos que no le corresponden. Con el
  campo requerido, `tsc` lo obliga a decidir.
- **Sí:** `mount()` emite el estado inicial. Sin eso, el HUD de Tetris enseñaría `3`
  bajo `LINEAS` durante los 750 ms de la pantalla de carga, porque `FRESH_RUN` está
  escrito para Asteroids.
- **No:** borrar `FRESH_RUN` y pintar guiones hasta el primer `onState`. Cambia lo
  que se ve en Asteroids sin ganar nada: con la emisión en `mount()`, `FRESH_RUN` ya
  solo cubre un render.

**El recorte**

- **Sí:** entra el Tetris clásico y nada más. 14 features de las 45 del inventario.
  Es un Tetris que nadie discutiría, y ya es una spec grande.
- **No:** partirla en dos specs, motor base y extras. El motor base no gana nada por
  trocearse; lo que se difiere no bloquea nada.
- **Sí:** entra la pieza fantasma. No está en el Tetris de 1989, pero está en todos
  desde hace veinte años y su ausencia se lee como un bug.
- **Sí:** entra el lock delay. Misma razón: sin él, una pieza que toca el suelo se
  consolida al instante y no se puede deslizar.
- **No:** entran el hold, el combo, el T-Spin, el back-to-back y el perfect clear.
  Son lo que separa un Tetris moderno de uno clásico, y multiplican por cuatro lo
  que hay que verificar a mano. Se pierde profundidad de puntuación; se gana una
  spec que se puede revisar entera.
- **No:** entran los cinco power-ups, el comodín, la tuerca, los pentominós ni el
  monominó. Se pierde lo que hacía distinto a este Tetris en particular. Entran
  después, con el motor ya en producción.
- **No:** entran las partículas, el shake, el flash ni los textos flotantes. Son
  baratos y muy del vault, y aun así son código nuevo que nadie ha visto correr en
  este motor. Es la primera cosa que debería entrar en la spec siguiente.

**Lo que se descarta por razón técnica, no por alcance**

- **No:** los modos Contra Reloj y Supervivencia. Necesitan un menú de configuración
  que el gabinete no tiene, y Contra Reloj acaba en victoria: el contrato solo sabe
  de `onGameOver(score)` y no distingue ganar de perder.
- **No:** los mutadores Puzzle, Invisibles y Rotación inversa. Mismo menú que no
  existe.
- **No:** las cuatro habilidades cargables y su energía. El menú se abre con `E` y
  se navega con `1`–`4` y con el ratón. Ni las teclas ni el puntero llegan al motor.
- **No:** los cuatro skins y el tema claro. El vault es dark-only por decisión de
  SPEC 01 y no hay theme switcher; los skins además viven en un `<select>` y en
  `localStorage`.
- **No:** el audio. El original lo sintetiza con Web Audio y sin ficheros, así que
  técnicamente cabría. Arrastra las decisiones de mute, volumen y desbloqueo del
  `AudioContext`, y dejaría a `asteroids` como la única máquina muda. Eso es su
  propia spec, y para las dos a la vez.
- **No:** la tabla de récords en `localStorage` del original. Desde SPEC 06 el
  marcador es una tabla compartida en Supabase; un segundo ranking local lo
  contradiría. En `localStorage` solo quedan la sesión y el `device_id`.
- **No:** la rotación antihoraria de `Z` y el hold de `C`/`Shift`. El mando tiene
  cinco botones fijos y no hay dónde ponerlos. Una tecla sin botón es invisible en
  el gabinete y en móvil no existe, y `createInput()` solo hace `preventDefault` de
  las cinco: pulsar `Z` haría scroll de la página en plena partida.
- **No:** la pausa con `P` y `Escape`. La función no se pierde —el gabinete tiene su
  botón `PAUSA`—, solo el atajo.

**El motor**

- **Sí:** mundo lógico de 420 × 600. `BLOCK = 30` se copia del original y los 120 px
  de banda son el ancho del `#next-canvas`. Ninguna constante de geometría se
  retoca.
- **No:** 800 × 600 como Asteroids, con el tablero centrado. Las dos pantallas de
  juego se verían del mismo tamaño, a cambio de 250 px de negro a cada lado.
- **Sí:** la pieza siguiente se dibuja dentro del canvas del juego. El original la
  pinta en un `<canvas>` aparte que aquí no existe, y jugar a Tetris sin verla es
  otro juego.
- **Sí:** los siete colores del original, tal cual. Es el mismo criterio que dejó a
  Asteroids en vectores blancos: repintar las piezas con la paleta del vault gana
  coherencia de marca y pierde lo único que hace que Tetris parezca Tetris. El neón
  lo pone el gabinete que rodea al canvas.
- **Sí:** `DAS_MS` y `ARR_MS` como código nuevo. Es la única desviación de «copia
  literal», y existe porque el mando táctil no genera el auto-repeat del sistema
  operativo del que el original depende sin saberlo.
- **Sí:** `pieces.ts` y `board.ts` en lugar de `math.ts` y `entities.ts`. Mismos
  cuatro archivos y mismo reparto de responsabilidades; los nombres de Asteroids
  describen geometría continua y entidades móviles, y Tetris no tiene ninguna de las
  dos cosas.

**El catálogo y la base de datos**

- **Sí:** `tetris` como id y `TETRIS` como título, el nombre real del juego. Es lo
  que se hizo con `asteroids`, frente a los nombres de fantasía de las ocho máquinas
  de escaparate.
- **No:** reutilizar el id `caida`. Es nombre de fantasía de una máquina que ya no
  existe, y su URL no significa nada.
- **Sí:** categoría `PUZZLE`. Estrena un valor del vocabulario cerrado que hasta hoy
  no usaba nadie, y es lo que `caida` tenía sembrado.
- **Sí:** cian `#00f5ff`. `asteroids` es amarillo y van a estar una al lado de la
  otra. El magenta se descarta porque es el color de alarma de
  `ScoreboardUnavailable`, y gastarlo en una tarjeta le resta señal.
- **Sí:** la escena de `caida` se mueve. SPEC 07 la archivó diciendo literalmente
  que era una pantalla de Tetris esperando a su máquina. Copiarla compila igual y
  deja dos escenas divergiendo.
- **Sí:** renumerar `sort_order` a 0 y 1. La columna se documentó como la posición
  en `GAMES` y hoy vale 8 para la única máquina que hay. Nadie lee esas columnas,
  así que corregirlo son dos líneas sin riesgo.
- **No:** `sort_order = 9` para no tocar la fila de `asteroids`. Evita un `update` y
  deja la columna mintiendo un poco más.
- **Sí:** `/salon` sigue abriendo en `ASTEROIDS`. `initialTab` es
  `requested?.id ?? "asteroids"` y el fallback sigue siendo válido; cambiarlo para
  que abra en la máquina más nueva es una decisión de producto que esta spec no
  toma.
- **Sí:** la entrada va al final de `GAMES`. Añadir al final no reordena ninguna
  tarjeta existente.
- **No:** sembrar marcas para `tetris`. SPEC 07 vació el marcador precisamente para
  que se llene jugando; sembrar la máquina nueva desharía eso al día siguiente.

## Riesgos

| Riesgo                                                                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El paso 0 toca el HUD que usa la única máquina que hoy se juega. Una regresión ahí rompe Asteroids sin que Tetris exista todavía.                                                                                             | `asteroids` declara exactamente los tres rótulos que el HUD escribía a mano, así que el cambio es sustituir tres literales por tres lecturas. El paso 0 es independiente y hay criterios que verifican Asteroids antes de empezar Tetris. |
| `ENGINES` y `ENGINE_KEYS` son `Partial<Record<GameId, …>>`: olvidar cualquiera de los dos compila y pasa el lint. El síntoma de uno es una pantalla en blanco; el del otro, cinco botones muertos.                            | Los dos van en el paso 6, que es indivisible, y cada uno tiene su propio criterio de aceptación.                                                                                                                                          |
| La escena de `caida` se copia en vez de moverse. Compila, y el archivo queda con dos pantallas de Tetris que empiezan a divergir.                                                                                             | Un criterio comprueba que `grep -n "caida" lib/preview-art.ts` no devuelve nada, y otro que `ArchivedPreviewId` bajó a siete ids.                                                                                                         |
| Sin la fila de `public.games`, la máquina se ve, se juega y **revienta al guardar la primera marca** por la clave ajena de `scores.game_id`. Nadie avisa hasta ese momento.                                                   | El paso 7 va inmediatamente después del 6, y su verificación no es que la migración exista: es guardar una marca de verdad desde `/jugar/tetris`.                                                                                         |
| `DAS_MS` y `ARR_MS` no salen del original: son dos números elegidos sobre el papel. Mal calibrados, el juego es injugable —o inmanejable— con el mando.                                                                       | Son dos constantes en `constants.ts` y se ajustan sin tocar nada más. El equilibrio del original no depende de ellas: solo afectan a la entrada.                                                                                          |
| El mundo 420 × 600 tiene proporción 0,70 y el gabinete se diseñó alrededor del 1,33 de Asteroids. En una pantalla baja, el canvas podría desbordar en vertical.                                                               | `GameCanvas` aplica el `aspect-ratio` de `world` por estilo, así que el canvas se ajusta al ancho disponible en vez de imponerlo. Hay un criterio visual en el paso 6.                                                                    |
| `GameId` deja de ser una unión de un miembro. SPEC 07 anotó que con un solo literal TypeScript estrechaba comparaciones y avisaba de código inalcanzable; esos avisos desaparecen ahora y podrían haber tapado código muerto. | Sale en `npx tsc --noEmit` y en `npm run lint` del paso 6, que es donde se mira. Es el problema inverso al que SPEC 07 mitigó, y desaparece del todo aquí.                                                                                |
| La partida se juega en el navegador, así que la puntuación se puede falsificar desde la consola.                                                                                                                              | Aceptado, igual que en SPEC 05 y SPEC 06. La validación entra con la spec que traiga la autenticación, y entonces cubre las dos máquinas a la vez.                                                                                        |

## Lo que **no** entra en esta spec

- Hold, combo, T-Spin, back-to-back y perfect clear.
- Los cinco power-ups, el comodín, la tuerca, los pentominós y el monominó.
- La energía y las cuatro habilidades cargables.
- Los modos Contra Reloj y Supervivencia, y los tres mutadores.
- Los cuatro skins, el tema claro y el selector de nivel inicial.
- Las partículas, el screen shake, el flash y los textos flotantes.
- El audio, en Tetris y en Asteroids.
- La tabla de récords local del original.
- Arkanoid, que sigue esperando en `references/started-games/04-arkanoid/`.
- Simplificar o rediseñar la biblioteca, el salón, la portada o el gabinete.
- Autenticación, antitrampas, validación en servidor, realtime y paginación.
- Tests.

Cada una de esas, si llega, va en su propia spec.
