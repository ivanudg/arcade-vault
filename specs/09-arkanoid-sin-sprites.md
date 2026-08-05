# SPEC 09 — Arkanoid: tercera máquina y el puerto sin sprites

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 07, SPEC 08
> **Fecha:** 2026-08-05
> **Objetivo:** Portar el Arkanoid de `references/started-games/04-arkanoid/` a un motor que cumpla el contrato y añadirlo como tercera máquina del vault, redibujando con primitivas de canvas todo lo que el original resolvía con un spritesheet.

## Por qué existe esta spec

SPEC 08 dejó dos máquinas y una escena archivada esperando: `muro`, que es una
pantalla de Arkanoid. Ésta es la máquina que la reclama, y la última que lo hace.
Después de esta spec, `ArchivedPreviewId` se queda sin ninguna escena que espere
máquina.

Es también la primera máquina que **no toca el contrato**. SPEC 05 lo escribió,
SPEC 08 lo extendió con `hud` porque Tetris no tiene vidas. Arkanoid tiene
puntuación, vidas y niveles de verdad, así que declara
`["PUNTUACION", "VIDAS", "NIVEL"]` y no pide nada más. Que la tercera máquina
entre sin negociar el contrato es la prueba de que el contrato ya estaba bien.

Tres decisiones no se adivinan leyendo el resultado.

**La primera: el original no dibuja ni una primitiva.** Paddle, bola, bloques y
las cuatro tiras de explosión son recortes de `assets/spritesheet-breakout.png`,
servidos por los globales `drawSprite` y `drawFrame` de `assets/spritesheet.js`.
Ningún motor del vault carga un archivo y `components/game-canvas.tsx` no tiene
estado de «cargando». Todo se redibuja con rectángulos y un círculo. Los siete
nombres de color de `COLOR_MAP` —`red`, `yellow`, `cyan`, `magenta`, `hotpink`,
`green`, `gray`— son los siete nombres de color CSS válidos, así que el mapa se
copia literal y pasa a ser `fillStyle` directo. Es el mismo criterio que dejó a
Asteroids en vectores blancos y a Tetris con sus siete colores: el neón lo pone
el gabinete, no el juego.

**La segunda: el ratón era el control principal y desaparece.** El README del
original lo lista primero y el paddle sigue al cursor. `lib/games/input.ts` solo
sabe de teclado, y meter puntero en el contrato es media spec. Se cae al control
que el original ya traía de segunda: `←` y `→` a 600 px/s. Se pierde precisión, y
en Arkanoid la precisión se nota más que en las otras dos máquinas.

**La tercera: `ESPACIO` gana un uso que el original no le da en juego.** El
original auto-relanza la bola tras cada vida perdida. Aquí la bola queda apoyada
sobre el paddle y espera. Es como funciona el Arkanoid de 1986, es como funciona
el propio original en su pantalla de inicio, y evita que el mando tenga tres
botones muertos de cinco.

## Alcance

**Dentro:**

- **`lib/games/arkanoid/constants.ts`**: `WORLD`, `INITIAL_LIVES`,
  `SCORE_PER_BLOCK`, las cuatro constantes de velocidad con sus dos fórmulas,
  `COLOR_MAP`, `HP_COLOR`, `UNBREAKABLE_LETTER`, `LEVELS` con sus diez rejillas,
  la geometría de la rejilla de bloques, `MAX_BOUNCE_ANGLE`, `LEVEL_CLEAR_TIME` y
  las medidas de paddle y bola. Copiadas del original sin retocar ni un número.
- **`lib/games/arkanoid/levels.ts`**: el tipo `Block`, `buildLevel()` y
  `remainingBlocks()`. Ocupa el hueco que en Asteroids ocupa `math.ts`: Arkanoid
  no tiene geometría continua que abstraer, tiene una rejilla que construir.
- **`lib/games/arkanoid/entities.ts`**: los tipos `Paddle` y `Ball`, su movimiento
  y su dibujo, y las dos colisiones —`ballVsPaddle()` y `ballVsBlocks()`— que
  reciben todo por parámetro y no leen nada de fuera.
- **`lib/games/arkanoid/index.ts`**: `arkanoidGame: GameMount` con
  `world: { width: 800, height: 600 }` y `hud: ["PUNTUACION", "VIDAS", "NIVEL"]`.
  El `interface Run`, `update`, `draw`, el bucle y el `GameHandle`. Todo el estado
  dentro del closure de `mount()`.
- **`lib/games.ts`**: `GameId` gana el literal `"arkanoid"` y `GAMES` gana la
  entrada, al final del array.
- **`lib/games/engines.ts`**: una línea, `arkanoid: arkanoidGame`.
- **`components/play-cabinet.tsx`**: una línea,
  `ENGINE_KEYS.arkanoid = ["ArrowLeft", "ArrowRight", "Space"]`.
- **`lib/preview-art.ts`**: `muro` sale de `ArchivedPreviewId` y el `case "muro":`
  se renombra a `case "arkanoid":`. La escena no se toca.
- **`supabase/migrations/<sello>_arkanoid.sql`**: `insert` de la fila `arkanoid`
  en `public.games` con `sort_order = 2`. Ninguna fila existente se actualiza.
- **`lib/landing.ts`**: `STATS` pasa de `2 MAQUINAS` a `3 MAQUINAS`, y el `desc`
  de la ventaja `JUEGOS CLASICOS` nombra las tres.
- **Apartado en `CLAUDE.md`**: que el vault tiene tres máquinas, que `muro` ya se
  movió y que `ArchivedPreviewId` se queda sin escenas que esperen máquina.

**Fuera de alcance (para futuras specs):**

- **La explosión al romper un bloque.** Los cuatro frames del original son
  recortes del PNG que esta spec descarta, así que rehacerla es código nuevo
  —partículas— que nadie ha visto correr en este motor. Es la primera cosa que
  debería entrar en la spec siguiente, junto con las partículas de Tetris que
  SPEC 08 dejó esperando por la misma razón.
- **El audio.** Los dos `.mp3` de `assets/sounds/` quedan fuera, y con ellos la
  decisión de mute, volumen y desbloqueo del `AudioContext`. Va en su propia spec,
  y esa spec cubre las **tres** máquinas a la vez: hoy las tres son mudas.
- **El control con puntero.** Ni en Arkanoid ni en el contrato. Añadirlo obliga a
  abrir un canal nuevo en `GameCallbacks` o a meter `pointermove` en
  `createInput()`, y a convertir coordenadas de pantalla a mundo lógico, que es
  justo lo que `GameCanvas` encapsula hoy.
- **El menú de pausa y su selector de nivel.** Necesitan clics y una tecla que no
  está en el mando. El selector además reinicia puntuación y vidas al saltar de
  nivel, lo que en un marcador compartido es un editor de trampas.
- **Simplificar o rediseñar la biblioteca, el salón, la portada o el gabinete.**
  Con tres máquinas el buscador y los filtros tienen más sentido que nunca.
- **Tocar `lib/games/engine.ts`, `lib/games/asteroids/` o `lib/games/tetris/`.**
  Esta spec no cambia ni una línea de ninguno de los tres.
- **Autenticación, antitrampas, validación en servidor, realtime y paginación.**
  Igual que en SPEC 05, SPEC 06 y SPEC 08.
- **Tests.** El repo sigue sin framework y esta spec no lo introduce.
- **Modificar `references/started-games/04-arkanoid/`.** Queda como está, de
  referencia.

## Modelo de datos

### El motor — `lib/games/arkanoid/`

El mundo lógico es **800 × 600**, el mismo del original y el mismo de Asteroids.
Su proporción de 1,33 es aquella para la que se calibró el marco de
`PlayCabinet`, así que el gabinete no se entera de que ha entrado una máquina
nueva.

```
x=0                                        x=800
┌────────────────────────────────────────────┐ y=0
│                                            │
│   ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓  ← rejilla de bloques│  y=60  (TOP_MARGIN)
│   ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓                      │
│                                            │
│                    ●  ← bola (r = 8)       │
│                                            │
│              ▬▬▬▬▬▬▬▬  ← paddle 162 × 14   │  y=560
└────────────────────────────────────────────┘ y=600
```

El estado de partida, dentro del closure de `mount()`:

```ts
interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Nombre de color CSS: "red" | "yellow" | "cyan" | … */
  color: string;
  hp: number;
  maxHp: number;
  /** Los grises rebotan, no se rompen y no cuentan para despejar. */
  breakable: boolean;
  alive: boolean;
}

interface Run {
  paddle: { x: number; y: number; w: number; h: number; speed: number };
  /** `x`/`y` son el centro de la bola. */
  ball: { x: number; y: number; vx: number; vy: number; r: number; speed: number };
  blocks: Block[];
  score: number;
  lives: number;
  /** 0-based. El HUD enseña `levelIndex + 1`. */
  levelIndex: number;
  /** Cuenta atrás de la transición entre niveles, en segundos. */
  clearTimer: number;
  phase: "serve" | "playing" | "levelclear" | "gameover";
}
```

`phase` y no `state`: `GameState` ya son las tres cifras del HUD, y confundirlas
es el error caro.

Las cuatro fases se reparten así, y son menos que las seis del original porque
tres de las suyas las resuelve el gabinete:

| Fase         | Qué pasa                                                                                    | De dónde sale                                                             |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `serve`      | La bola descansa sobre el paddle. El paddle se mueve; la bola le sigue. `ESPACIO` la lanza. | `GameState.START` del original, más el auto-relanzamiento de `loseLife()` |
| `playing`    | El bucle completo: paddle, bola, colisiones, caída, despeje.                                | `GameState.PLAYING`                                                       |
| `levelclear` | 1,2 s de espera con la bola parada, y luego el nivel siguiente o el fin.                    | `GameState.LEVEL_CLEAR`                                                   |
| `gameover`   | El bucle se detiene.                                                                        | `GameState.GAME_OVER` y `GameState.WIN`, colapsados                       |

`GameState.PAUSED` no tiene fase: la pausa la da `handle.pause()`, que detiene el
bucle y desengancha la entrada.

**Constantes, copiadas del original sin retocar ni una:**

```
WORLD = 800 × 600 · INITIAL_LIVES = 3 · SCORE_PER_BLOCK = 100
paddle = { y: 560, w: 162, h: 14, speed: 600 }   ball = { r: 8 }
MAX_BOUNCE_ANGLE = 60°   ·   LEVEL_CLEAR_TIME = 1,2 s
Rejilla: SIDE_MARGIN = 40 · TOP_MARGIN = 60 · GAP_X = 6 · GAP_Y = 6 · BLOCK_H = 24
LEVELS = las diez rejillas, con baseSpeed de 260 a 460
COLOR_MAP = { r: "red", y: "yellow", c: "cyan", m: "magenta",
              h: "hotpink", g: "green", a: "gray" }
HP_COLOR = { 2: "cyan", 3: "magenta" }   ·   UNBREAKABLE_LETTER = "a"
```

Las fórmulas, también literales:

```
maxSpeedForLevel(i) = 460 + 15 × i        px/s
growthForLevel(i)   = 6 + 1 × i           px/s²
blockW              = (800 − 80 − 6 × 9) / 10 = 66,6 px
lanzamiento         = vx = speed × 0,6 ; vy = −speed × 0,8
puntos              = 100 por bloque roto; los grises no suman
nivel               = levelIndex + 1
```

**La única desviación de «copia literal»** es `MAX_DT`, que pasa de `1/30` del
original a `0,05`, el valor del patrón del vault. Es una constante del bucle, no
del juego, pero tiene consecuencias sobre la física y están escritas en
«Riesgos».

**Y lo que sustituye al spritesheet:** paddle y bloques son `fillRect`, la bola
es un `arc`. El desgaste de los multi-golpe sigue siendo
`globalAlpha = 0.4 + 0.6 × hp / maxHp`, que ya era una primitiva y no un sprite.
El fondo del área de juego es el `#12122b` del original; el `#0d0d1a` de las
bandas del letterbox no entra, porque `GameCanvas` no deja bandas.

### La máquina nueva — entrada en `GAMES`

Última del array, tercera posición.

```ts
{
  id: "arkanoid",
  title: "ARKANOID",
  cat: "ARCADE",
  glow: "#ff006e",
  playable: true,
  desc: "Rompe todos los bloques sin dejar caer la bola.",
  long: "El clásico de la pala y la bola, entero y jugable de verdad. Diez pantallas que van apretando: la bola sale más rápida en cada una y acelera mientras juegas. Los bloques de dos y tres golpes se desgastan a la vista antes de romperse, y los grises no se rompen nunca. El punto de la pala donde golpeas decide el ángulo de salida, hasta sesenta grados. Cada bloque roto vale cien puntos y despejar la decima pantalla acaba la partida.",
  controls: "Flechas ← → mueven la pala · ESPACIO lanza la bola",
}
```

`cat: "ARCADE"` estrena el tercer valor del vocabulario cerrado: con `DISPAROS`,
`PUZZLE` y `ARCADE`, los filtros de la biblioteca separan las tres máquinas.
`glow` es el magenta `#ff006e`, el único neón de los tres que quedaba libre. El
título va en mayúsculas y sin tildes, como el resto: Press Start 2P no tiene esos
glifos.

```ts
export type GameId = "asteroids" | "tetris" | "arkanoid";
```

### El HUD y las tres cifras

| Cifra   | Qué es en Arkanoid                                    | Rótulo       | Cuándo cambia                     |
| ------- | ----------------------------------------------------- | ------------ | --------------------------------- |
| `score` | 100 por bloque roto. Los grises irrompibles no suman. | `PUNTUACION` | Al romper un bloque               |
| `lives` | Vidas restantes, de 3 a 0                             | `VIDAS`      | Cuando la bola cae bajo el paddle |
| `level` | `levelIndex + 1`, de 1 a 10                           | `NIVEL`      | Al despejar una pantalla          |

Es el primer motor que declara los mismos tres rótulos que Asteroids sin ser
Asteroids. El campo `hud` ya existe desde SPEC 08, así que esta spec no toca
`lib/games/engine.ts`.

`emitState()` emite por diferencia, como los otros dos. En Arkanoid eso importa:
hay frames enteros en los que la bola vuela sin tocar nada.

`onGameOver(score)` se dispara en **dos** sitios, y son los dos finales del
original:

- Cuando la bola cae bajo el paddle con `lives` ya en 1, es decir, cuando la resta
  la deja en 0.
- Cuando se despeja el nivel 10, que en el original es la pantalla de victoria.

El contrato no distingue acabar bien de acabar mal, así que el jugador que
despeje la décima pantalla ve el mismo `FIN DEL JUEGO` con su puntuación. Un flag
`overSent` garantiza una sola emisión por partida, y solo `restart()` lo rearma.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('arkanoid', 'ARKANOID', 'ARCADE', true, 2);
```

Ningún `update`: SPEC 08 dejó `asteroids` en 0 y `tetris` en 1, así que `2`
continúa la serie sin tocar nada existente.

| Tabla           | Antes | Después                         |
| --------------- | ----- | ------------------------------- |
| `public.games`  | 2     | 3                               |
| `public.scores` | —     | Sin cambios: no se siembra nada |

El marcador de `arkanoid` arranca vacío, como los otros dos. Se llena jugando.

## Plan de implementación

Cada paso deja el repo compilando y es commiteable por separado. Los pasos 1 a 5
no los consume nadie todavía: se verifican con `npm run build` y
`npx tsc --noEmit`.

**No hay paso 0.** El contrato ya trae `hud` desde SPEC 08, así que
`lib/games/engine.ts` y `lib/games/asteroids/` no se tocan.

1. **Constantes y niveles.** `lib/games/arkanoid/constants.ts` con todos los
   valores copiados del original, y `lib/games/arkanoid/levels.ts` con el tipo
   `Block`, `buildLevel(index)` y `remainingBlocks(blocks)`. `buildLevel()`
   devuelve un array nuevo en vez de mutar uno de módulo, y `remainingBlocks()`
   recibe el array por parámetro: los dos leían un `export const blocks` global.
   Verificación: `npx tsc --noEmit` pasa.

2. **Entidades y colisiones.** `lib/games/arkanoid/entities.ts` con los tipos
   `Paddle` y `Ball`, el movimiento del paddle con su `clamp`, la integración y el
   rebote en paredes de la bola, y las dos colisiones.
   `ballVsPaddle(ball, paddle)` y `ballVsBlocks(ball, blocks)` reciben todo por
   parámetro y devuelven qué pasó —si hubo rebote y si se rompió un bloque— en vez
   de sumar puntos y reproducir sonido por su cuenta. El dibujo va con primitivas:
   `fillRect` para paddle y bloques, `arc` para la bola, y el `ctx` siempre por
   parámetro.
   Verificación: `npx tsc --noEmit` pasa.

3. **El esqueleto de `mount()`.** `lib/games/arkanoid/index.ts` exporta
   `arkanoidGame: GameMount` con `world: { width: 800, height: 600 }` y
   `hud: ["PUNTUACION", "VIDAS", "NIVEL"]`. Su `mount()` crea el `Run` en el
   closure, engancha `createInput()`, emite el estado inicial antes de devolver, y
   devuelve el `GameHandle` completo: `start`, `pause`, `resume`, `restart`,
   `destroy`, `press` y `release`. El par `play()` / `halt()` guarda el id del
   frame; `destroy()` es idempotente con un flag `destroyed`. El bucle ya corre
   con `dt` recortado a 0,05 s, pero `update` y `draw` están vacíos.
   Verificación: `npm run build` pasa.

4. **Implementar `update(dt)`.** Las cuatro fases. En `serve`, el paddle se mueve
   y la bola le sigue pegada hasta que `ESPACIO` la lanza. En `playing`, el
   movimiento del paddle, la aceleración gradual de la bola hasta el tope del
   nivel, la integración, las dos colisiones, los 100 puntos por bloque roto, la
   caída bajo el paddle con su resta de vida, y el despeje cuando
   `remainingBlocks()` llega a cero. En `levelclear`, la cuenta atrás y el salto al
   nivel siguiente o a `gameover`. Perder la última vida y despejar el nivel 10
   llevan los dos a `phase = "gameover"`, el bucle se detiene y `onGameOver(score)`
   se emite una sola vez. Orden dentro del bucle: `update(dt)` → `draw()` →
   `emitState()` → y después `onGameOver`.
   Verificación: `npx tsc --noEmit` pasa.

5. **Implementar `draw()`.** Fondo `#12122b`, bloques vivos con su `globalAlpha`
   de desgaste, paddle y bola. **No se portan** `drawHud()`, `drawScreens()` ni
   `drawPauseMenu()`: la puntuación, las vidas, el nivel, el `GAME OVER` y la
   pausa los pinta React a veinte píxeles del canvas. Durante `levelclear` el
   canvas sigue dibujando el tablero despejado, sin ningún rótulo.
   Verificación: `npm run build` pasa.

6. **La máquina entra al catálogo. Este paso no se trocea.** Van juntos porque
   separarlos deja el repo sin compilar o una ruta pública rota: el literal
   `"arkanoid"` en `GameId` no compila sin la entrada de `GAMES`, ni sin el `case`
   de `drawPreview()` —el `default: id satisfies never` rompe el build—, y
   `/jugar/arkanoid` respondería en blanco sin la línea de `ENGINES`. Son cuatro
   archivos:
   - `lib/games.ts`: el literal en `GameId` y la entrada al final de `GAMES`.
   - `lib/games/engines.ts`: `arkanoid: arkanoidGame`.
   - `components/play-cabinet.tsx`:
     `ENGINE_KEYS.arkanoid = ["ArrowLeft", "ArrowRight", "Space"]`.
   - `lib/preview-art.ts`: `muro` sale de `ArchivedPreviewId` y el `case "muro":`
     pasa a `case "arkanoid":`. La escena no cambia. La cabecera del archivo deja
     constancia de que era la última que esperaba máquina.

   Verificación: `/biblioteca` muestra tres tarjetas, `/juego/arkanoid` y
   `/jugar/arkanoid` responden 200, `/jugar/arkanoid` se juega con el teclado y
   con el mando, y `/jugar/asteroids` y `/jugar/tetris` siguen igual.

7. **La migración.** `supabase/migrations/<sello>_arkanoid.sql` con el `insert` de
   `arkanoid` y `sort_order = 2`. Se aplica con `npx supabase db push`. Nunca con
   `apply_migration` por MCP: iría al proyecto remoto sin dejar rastro en git.
   Verificación: `npx supabase migration list` la marca aplicada, `public.games`
   tiene tres filas con `sort_order` 0, 1 y 2, y terminar una partida de Arkanoid
   y pulsar GUARDAR PUNTUACION mete la marca sin reventar la clave ajena.

8. **Los textos que cuentan máquinas.** En `lib/landing.ts`: `STATS` pasa de
   `{ value: "2", unit: "MAQUINAS" }` a `3`, y el `desc` de la ventaja
   `JUEGOS CLASICOS` nombra Asteroids, Tetris y Arkanoid. El comentario que
   explica por qué la cifra va escrita a mano se actualiza con ella.
   `components/site-footer.tsx` y `app/not-found.tsx` ya no cuentan máquinas y no
   se tocan.
   Verificación: la portada dice `3 MAQUINAS` y ninguna pantalla promete una
   máquina que no esté en el catálogo.

9. **Documentar en `CLAUDE.md`.** En «Motores de juego»: que el vault tiene tres
   máquinas, que `muro` ya se movió y que `ArchivedPreviewId` baja a seis ids,
   ninguno de los cuales espera ya máquina. En «El marcador»: que `public.games`
   tiene tres filas con `sort_order` 0, 1 y 2.
   Verificación: el apartado nombra `lib/games/arkanoid/` y el movimiento de
   `muro`, y no sigue diciendo que el vault tiene dos máquinas ni que `muro`
   espera.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/arkanoid/constants.ts`, `levels.ts`, `entities.ts` e
      `index.ts`.
- [ ] `lib/games/arkanoid/` no importa nada de `react`, `next` ni de
      `@/components`.
- [ ] En el ámbito de módulo de `lib/games/arkanoid/index.ts` no hay ni una
      variable mutable: todo el estado de partida vive dentro de `mount()`.
- [ ] Montar el juego dos veces y destruirlo dos veces no deja ningún
      `requestAnimationFrame` vivo ni ningún listener enganchado en `window`.
- [ ] `←` y `→` mueven el paddle y no lo dejan salir del mundo.
- [ ] La partida empieza con la bola apoyada sobre el paddle, y `ESPACIO` la
      lanza.
- [ ] Golpear con el centro del paddle devuelve la bola casi vertical, y golpear
      con un extremo la devuelve inclinada, hasta 60° de la vertical.
- [ ] La bola rebota en las dos paredes y en el techo, y nunca se queda rebotando
      en horizontal.
- [ ] Un bloque de un golpe se rompe al primer impacto y suma 100 puntos.
- [ ] Un bloque de dos golpes aguanta dos impactos y uno de tres, tres; entre
      impactos se ve más transparente.
- [ ] Un bloque gris rebota la bola, no se rompe nunca y no suma puntos.
- [ ] Un nivel con bloques grises se despeja aunque los grises sigan en pantalla.
- [ ] Despejar un nivel espera 1,2 s antes de montar el siguiente.
- [ ] La bola acelera durante el nivel hasta el tope de ese nivel, y cada nivel
      sale más rápida que el anterior.
- [ ] Que la bola caiga bajo el paddle resta una vida y deja la siguiente apoyada,
      esperando `ESPACIO`.
- [ ] `constants.ts` no retoca ni un valor de
      `references/started-games/04-arkanoid/src/config.js`.
- [ ] El motor no carga ningún archivo:
      `grep -rn "Image\|Audio\|fetch\|\.png\|\.mp3" lib/games/arkanoid/` no
      devuelve nada.
- [ ] El canvas **no** pinta puntuación, vidas, nivel, `GAME OVER` ni ningún menú
      de pausa.

**El catálogo y las rutas**

- [ ] `GAMES` tiene tres entradas y la tercera es `arkanoid`, la última del array.
- [ ] `/biblioteca` muestra tres tarjetas y filtrar por `ARCADE` deja solo
      `ARKANOID`.
- [ ] `/juego/arkanoid` y `/jugar/arkanoid` responden 200; las cuatro rutas de
      `asteroids` y `tetris` siguen respondiendo 200.
- [ ] `/salon` muestra tres pestañas y sin `?juego=` sigue abriendo en
      `ASTEROIDS`.
- [ ] `ENGINES` tiene tres entradas y `/jugar/arkanoid` monta un canvas jugable,
      no una pantalla en blanco.
- [ ] Las tres tarjetas de `/biblioteca` tienen tres neones distintos.

**El mando y el HUD**

- [ ] El HUD de `/jugar/arkanoid` rotula `PUNTUACION`, `VIDAS` y `NIVEL`, y
      arranca en `0 / 3 / 1`.
- [ ] `←`, `→` y `ESPACIO` están vivos en el mando táctil y funcionan sin tocar el
      teclado.
- [ ] `↑` y `↓` se pintan deshabilitados y atenuados, no escondidos, y la rejilla
      de cinco botones no se descuadra.
- [ ] Mantener pulsado `←` o `→` en el mando táctil mueve el paddle de forma
      continua.
- [ ] Soltar el botón, sacar el puntero de él o cancelar el gesto detiene el
      paddle.
- [ ] Pulsar `A`, `D`, `P`, `Escape` o `Enter` en `/jugar/arkanoid` no hace nada y
      no mueve el scroll de la página.
- [ ] Mover el ratón sobre el canvas no mueve el paddle.
- [ ] `PAUSA` congela el canvas y deja el teclado sin efecto; `SEGUIR` reanuda en
      el mismo punto, con la bola donde estaba.
- [ ] Cambiar de pestaña pausa la partida sola, y al volver sigue pausada.
- [ ] Perder la tercera vida abre `FIN DEL JUEGO` con la puntuación real, y el
      bucle se detiene.
- [ ] Despejar el nivel 10 abre el mismo `FIN DEL JUEGO`, con la puntuación real.
- [ ] `JUGAR DE NUEVO` reinicia a 0 puntos, 3 vidas y nivel 1 sin recargar la
      página, con la bola apoyada.
- [ ] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia.

**La miniatura**

- [ ] `grep -n "muro" lib/preview-art.ts` solo devuelve líneas de comentario: el
      `case` y la unión archivada ya no lo nombran.
- [ ] `ArchivedPreviewId` tiene seis ids y ninguno de ellos tiene material en
      `references/started-games/`.
- [ ] La tarjeta de `/biblioteca` y la ficha de `/juego/arkanoid` muestran la
      escena de Arkanoid, no la del `default`.
- [ ] Añadir a `GAMES` una máquina sin `case` en `drawPreview()` sigue rompiendo
      `npx tsc --noEmit`.

**El marcador**

- [ ] `public.games` tiene tres filas, con `sort_order` 0, 1 y 2.
- [ ] `npx supabase migration list` marca aplicada la migración nueva.
- [ ] Terminar una partida de Arkanoid y pulsar `GUARDAR PUNTUACION` inserta la
      marca sin error de clave ajena.
- [ ] La marca guardada aparece en `/juego/arkanoid`, en `/salon` y en la
      actividad de la portada.
- [ ] Antes de la primera marca, `/juego/arkanoid` y la pestaña `ARKANOID` de
      `/salon` muestran `SE EL PRIMERO`, no `MARCADOR NO DISPONIBLE`.
- [ ] Las tablas de `/juego/asteroids` y `/juego/tetris` no cambian por nada de
      esta spec.

**Nada más se ha movido**

- [ ] `npm run build`, `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] `lib/games/engine.ts`, `lib/games/asteroids/` y `lib/games/tetris/` no
      tienen ni una línea modificada.
- [ ] `lib/games/input.ts`, `components/game-canvas.tsx` y
      `components/game-preview.tsx` no tienen ni una línea modificada.
- [ ] `lib/leaderboard.ts`, `lib/scores.ts`, `lib/storage.ts`, `lib/session.tsx` y
      `app/jugar/[id]/actions.ts` no cambian.
- [ ] `app/(vault)/salon/page.tsx` no cambia: el fallback `?? "asteroids"` sigue
      siendo válido.
- [ ] `lib/supabase/` no cambia y `/api/supabase-health` sigue respondiendo 200.
- [ ] El esquema de SPEC 06 no cambia: mismas tablas, mismos índices, mismas
      políticas, mismas dos vistas.
- [ ] `references/started-games/04-arkanoid/` no tiene ningún cambio.
- [ ] Las flechas y `ESPACIO` solo dejan de hacer scroll dentro de una pantalla de
      juego con la partida activa.

**Documentación**

- [ ] `CLAUDE.md` nombra `lib/games/arkanoid/` y dice que la escena de `muro` ya
      se movió.
- [ ] `CLAUDE.md` dice que `ArchivedPreviewId` baja a seis escenas y que ninguna
      espera ya máquina.
- [ ] `CLAUDE.md` ya no dice que el vault tiene dos máquinas.

## Decisiones tomadas y descartadas

**El contrato**

- **Sí:** esta spec no toca `lib/games/engine.ts`. Arkanoid tiene puntuación,
  vidas y niveles de verdad, así que declara los mismos tres rótulos que Asteroids
  y no pide nada. Es la prueba de que el `hud` de SPEC 08 se resolvió en el sitio
  correcto.
- **Sí:** `mount()` emite el estado inicial antes de devolver el `GameHandle`,
  como exige el contrato desde SPEC 08. Aquí el `FRESH_RUN` de `PlayCabinet`
  acertaría por casualidad —vale `{ 0, 3, 1 }`—, y aun así se emite: cumplir el
  contrato solo cuando hace falta es cómo se rompe la máquina siguiente.

**El dibujo**

- **Sí:** todo se redibuja con primitivas de canvas. Ningún motor del vault carga
  un archivo, `GameCanvas` no tiene estado de «cargando» y una máquina que puede
  quedarse en blanco si falla una petición sería la primera del catálogo.
- **No:** copiar `spritesheet-breakout.png` a `public/` y cargarlo. Arrastra el
  pipeline de assets, el estado de carga y la decisión de qué se ve mientras
  tanto. Se pierde la textura del sprite, que es lo único que este original tenía
  y los otros dos no.
- **Sí:** los siete nombres de `COLOR_MAP` pasan a ser `fillStyle` tal cual. Los
  siete —`red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`, `gray`— son
  nombres de color CSS válidos, así que la tabla se copia literal y no hay que
  inventar ni un hexadecimal.
- **No:** repintar los bloques con la paleta neón del vault. Mismo criterio que
  dejó a Asteroids en vectores blancos y a Tetris con sus siete colores: el neón
  lo pone el gabinete que rodea al canvas.
- **No:** entra la explosión de cuatro frames. Sus frames son recortes del PNG
  descartado, así que rehacerla es escribir partículas nuevas. Se pierde toda la
  retroalimentación al romper un bloque, que es lo más visible de lo que queda
  fuera.

**El mando**

- **Sí:** el ratón se convierte a `←`/`→` a 600 px/s. No toca el contrato, ni
  `input.ts`, ni el mando, ni `GameCanvas`, y el teclado ya venía en el original
  como control alternativo. Se pierde la precisión del puntero, que en Arkanoid se
  nota más que en las otras dos máquinas.
- **No:** añadir soporte de puntero al motor. Es media spec: hay que abrir un
  canal nuevo o meter `pointermove` en `createInput()`, y convertir coordenadas de
  pantalla a mundo lógico, que es justo lo que `GameCanvas` encapsula.
- **Sí:** `ESPACIO` lanza la bola, y la partida y cada vida empiezan con ella
  apoyada. Es el Arkanoid de 1986, es la pantalla de inicio del propio original, y
  evita que el mando tenga tres botones muertos de cinco.
- **No:** auto-relanzar la bola tras perder vida, como hace el original en juego.
  Es más literal y deja al jugador sin un instante para colocarse justo cuando
  acaba de morir.
- **Sí:** `↑` y `↓` deshabilitados y atenuados. Es la primera máquina con dos
  botones muertos; esconderlos descuadraría la rejilla de cinco.
- **No:** inventarle un uso a `↑` o `↓`. No existen en el original y un botón que
  hace algo que el juego no tiene es peor que uno atenuado.
- **No:** entran `A`/`D`, `Enter`, `P` ni `Escape`. Una tecla sin botón es
  invisible en el gabinete y en móvil no existe, y `createInput()` solo hace
  `preventDefault` de las cinco: pulsar `P` haría scroll de la página en plena
  partida. Es la misma decisión que SPEC 08 tomó con `Z`, `C` y `E`.
- **Sí:** se pierde el atajo de pausa, no la pausa. El gabinete tiene su botón
  `PAUSA`.

**El recorte**

- **Sí:** entran los bloques multi-golpe, los irrompibles y los diez niveles. Son
  **el** contenido: sin ellos Arkanoid son tres pantallas planas que se acaban en
  dos minutos. Y cuestan dos campos por bloque y una tabla de cadenas.
- **No:** entra el menú de pausa. Se abre con `P` y se navega con clics, y ninguna
  de las dos cosas llega al motor.
- **No:** entra el selector de nivel del menú de pausa. Además de necesitar el
  ratón, reinicia puntuación y vidas al saltar de nivel: en un marcador compartido
  eso es un editor de trampas.
- **No:** entra el audio. Los dos `.mp3` arrastran mute, volumen y desbloqueo del
  `AudioContext`. Va en su propia spec, y esa spec cubre las tres máquinas a la
  vez: hoy las tres son mudas.
- **Sí:** copia literal de las constantes. El comentario del original avisa de que
  el tope de velocidad es «conservador para evitar tunneling»; retocarlo sin
  jugarlo es exactamente cómo se rompe este juego.

**El fin de partida**

- **Sí:** despejar el nivel 10 emite `onGameOver(score)`, igual que quedarse sin
  vidas. El contrato no distingue ganar de perder, y llegar ahí ya trae su
  recompensa: la puntuación será la más alta de la tabla.
- **No:** extender el contrato con un `outcome` para poder pintar `¡VICTORIA!`. Es
  media spec y toca los otros dos motores para un cartel.
- **No:** hacer que los niveles ciclen al despejar el décimo, para que la partida
  solo pueda acabar perdiendo. Encaja mejor con Asteroids y Tetris, y es inventar
  una regla que este juego no tiene.

**El catálogo y la base de datos**

- **Sí:** `arkanoid` como id y `ARKANOID` como título, el nombre real del juego.
  Es lo que se hizo con `asteroids` y con `tetris`.
- **No:** reutilizar el id `muro`. Es nombre de fantasía de una máquina que ya no
  existe, y su URL no significa nada.
- **No:** `breakout` como id. También es un nombre real, pero de otro juego:
  Breakout es el de Atari de 1976 y Arkanoid el de Taito de 1986. El material es
  Arkanoid.
- **Sí:** categoría `ARCADE`. Estrena el tercer valor del vocabulario cerrado y
  deja las tres máquinas en tres categorías distintas, que es cuando los filtros
  de la biblioteca empiezan a servir para algo.
- **Sí:** magenta `#ff006e`. Es el único de los tres neones que quedaba libre.
  SPEC 08 lo descartó por ser el color de alarma de `ScoreboardUnavailable`, y ese
  argumento pierde cuando la alternativa es repetir un neón ya usado y que dos
  tarjetas de tres se confundan.
- **Sí:** la escena de `muro` se mueve. SPEC 07 la archivó diciendo literalmente
  que era una pantalla de Arkanoid esperando a su máquina, y SPEC 08 ya hizo el
  mismo viaje con `caida`. Copiarla compila igual y deja dos escenas divergiendo.
- **Sí:** `sort_order = 2`, sin `update` de ninguna fila. SPEC 08 dejó la columna
  diciendo la verdad; continuarla es una línea.
- **Sí:** la entrada va al final de `GAMES`. Añadir al final no reordena ninguna
  tarjeta existente.
- **Sí:** `/salon` sigue abriendo en `ASTEROIDS`. El fallback es válido y
  cambiarlo es una decisión de producto que esta spec no toma, igual que en
  SPEC 08.
- **No:** sembrar marcas para `arkanoid`. SPEC 07 vació el marcador para que se
  llene jugando.

## Riesgos

| Riesgo                                                                                                                                                                                                                                                     | Mitigación                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MAX_DT` sube de `1/30` a `0,05`. En el nivel 10 la bola llega a 595 px/s, así que un frame en el tope recorre casi 30 px: más que el alto de un bloque (24) y casi el doble del diámetro de la bola (16). La bola podría atravesar un bloque sin tocarlo. | El `dt` solo llega al tope tras un parón largo, y el caso que lo provocaba —volver de una pestaña oculta— no se da: desde SPEC 05 la partida se pausa sola al ocultarse la pestaña, y el primer frame tras reanudar vale `0`. Si aun así aparece, la salida es subdividir el paso de integración de la bola dentro de `update()`, nunca bajar el tope de velocidad: ése es el equilibrio del original. |
| El original se juega con el ratón y el vault lo obliga a teclado. La respuesta del paddle podría resultar lenta en los niveles rápidos, y eso no se descubre hasta jugarlo.                                                                                | `paddle.speed` es una constante en `constants.ts` y se ajusta sin tocar nada más. Es la única constante que el cambio de control hace discutible, y el equilibrio del resto del juego no depende de ella.                                                                                                                                                                                              |
| `ENGINES` y `ENGINE_KEYS` son `Partial<Record<GameId, …>>`: olvidar cualquiera de los dos compila y pasa el lint. El síntoma de uno es una pantalla en blanco; el del otro, cinco botones muertos.                                                         | Los dos van en el paso 6, que es indivisible, y cada uno tiene su propio criterio de aceptación.                                                                                                                                                                                                                                                                                                       |
| La escena de `muro` se copia en vez de moverse. Compila, y el archivo queda con dos pantallas de Arkanoid que empiezan a divergir.                                                                                                                         | Un criterio comprueba que `muro` ya no aparece ni en el `case` ni en la unión archivada, y otro que `ArchivedPreviewId` bajó a seis ids.                                                                                                                                                                                                                                                               |
| Sin la fila de `public.games`, la máquina se ve, se juega y **revienta al guardar la primera marca** por la clave ajena de `scores.game_id`. Nadie avisa hasta ese momento.                                                                                | El paso 7 va inmediatamente después del 6, y su verificación no es que la migración exista: es guardar una marca de verdad desde `/jugar/arkanoid`.                                                                                                                                                                                                                                                    |
| Quitar el spritesheet cambia cómo se ve el juego, y eso no lo detecta ningún criterio booleano. Un bloque mal dimensionado o un color equivocado compila igual.                                                                                            | La geometría se copia entera de `levels.js` y `state.js`, así que las medidas no se recalculan: solo cambia con qué se rellenan. Los siete colores salen de nombres CSS que ya estaban escritos en `COLOR_MAP`.                                                                                                                                                                                        |
| `cat: "ARCADE"` estrena un valor del vocabulario que hasta hoy no usaba ninguna máquina. Si algún filtro o mapa asumía las categorías en uso en vez del tipo, se rompe.                                                                                    | `GameCategory` es un vocabulario cerrado de seis desde SPEC 01 y la biblioteca deriva sus filtros del tipo, no de `GAMES`. `tetris` ya estrenó `PUZZLE` en SPEC 08 sin incidencias.                                                                                                                                                                                                                    |
| La partida se juega en el navegador, así que la puntuación se puede falsificar desde la consola.                                                                                                                                                           | Aceptado, igual que en SPEC 05, SPEC 06 y SPEC 08. La validación entra con la spec que traiga la autenticación, y entonces cubre las tres máquinas a la vez.                                                                                                                                                                                                                                           |

## Lo que **no** entra en esta spec

- La explosión al romper un bloque, y cualquier otra retroalimentación visual.
- El audio, en Arkanoid, en Tetris y en Asteroids.
- El control del paddle con el ratón o con cualquier puntero.
- El menú de pausa y su selector de nivel.
- Las teclas `A`, `D`, `Enter`, `P` y `Escape`.
- La pantalla de victoria como final distinto del fin de partida.
- El spritesheet y cualquier otro asset binario.
- Simplificar o rediseñar la biblioteca, el salón, la portada o el gabinete.
- Tocar `lib/games/engine.ts`, `lib/games/asteroids/` o `lib/games/tetris/`.
- Autenticación, antitrampas, validación en servidor, realtime y paginación.
- Tests.

Cada una de esas, si llega, va en su propia spec.
