# SPEC 10 — Snake con sprites de fruta

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 07
> **Fecha:** 2026-08-06
> **Objetivo:** Añadir `snake` como cuarta máquina del vault, con motor escrito desde cero contra el contrato y frutas dibujadas desde `fruits.png`, el primer asset binario que sirve el repo.

## Por qué existe esta spec

Las tres máquinas del vault son puertos. Asteroids, Tetris y Arkanoid salieron de
`references/started-games/`, con su física ya equilibrada y su tabla de puntos
decidida por otro. Snake no: el material que hay son `fruits.png` y un
`sprites.js` de 46 líneas que no contiene ni una de lógica de juego. Es un atlas
de recortes, no un juego. **El motor se escribe entero.**

Eso mueve el trabajo de sitio. En un puerto, lo caro es matar las cuatro cosas
que un `game.js` de navegador hace y que no sobreviven a montarse y desmontarse.
Aquí no hay ninguna que matar, y a cambio hay que inventar lo que un puerto trae
hecho: cuánto vale una fruta, cuánto dura un tick, qué se conserva al perder una
vida. Esas cifras están fijadas en esta spec y `/spec-impl` las copia sin
reinterpretar, exactamente como copiaría las de un original.

Y hay una decisión que rompe un patrón del repo. Hasta hoy **ningún motor del
vault carga archivos**: Arkanoid entró en SPEC 09 explícitamente redibujado sin
su spritesheet, y todo se pinta con primitivas de canvas. Snake carga
`fruits.png`. La razón es que las 22 frutas distintas solo existen si se carga:
en una celda de 32 píxeles, una fruta dibujada a mano es un punto de color, y 22
puntos de color son tres neones repetidos. La variedad visual es lo único que
separa este Snake del cuadrado clásico, así que la máquina que la trae es la que
paga el pipeline.

Lo que ese pipeline **no** hace es contagiar al resto. El contrato de
`lib/games/engine.ts` no cambia, `components/game-canvas.tsx` no cambia, y
`mount()` sigue siendo síncrono. El motor pide la imagen y sigue dibujando sin
ella; si nunca llega, la fruta es un círculo magenta y la partida no se entera.
Una máquina que necesitara esperar de verdad a sus assets pediría un contrato
distinto, y eso es otra spec.

La miniatura, en cambio, sale gratis. `lib/preview-art.ts` guarda desde SPEC 07
una escena archivada llamada `serpiente`: rejilla, cuerpo en L con cabeza
amarilla y fruta magenta. Es Snake, ya dibujado. Se **mueve** a `GameId`, no se
copia, que es la regla que ya siguieron Tetris y Arkanoid.

## Alcance

**Dentro:**

- **`public/snake/fruits.png`**: el atlas, copiado sin tocar un píxel desde
  `references/source-assets/snake-assets/fruits.png`. **La carpeta `public/` no
  existe hoy**: esta spec la crea.
- **`lib/games/snake/sprites.ts`**: las 22 coordenadas de `sprites.js` copiadas
  literales, la ruta pública del atlas y `loadFruitAtlas()`, que devuelve un
  cargador nuevo por cada `mount()`.
- **`lib/games/snake/constants.ts`**: mundo, rejilla, ritmo de tick, vidas y
  puntuación. Valores nuevos, fijados en esta spec.
- **`lib/games/snake/math.ts`**: `randInt` y `pickFreeCell`, puras y sin estado.
- **`lib/games/snake/entities.ts`**: `Snake` y `Fruit` como clases tipadas, con el
  `ctx` siempre por parámetro.
- **`lib/games/snake/index.ts`**: `snakeGame: GameMount` con
  `world: { width: 800, height: 600 }` y `hud: ["PUNTUACION", "VIDAS", "NIVEL"]`.
  El `Run`, el bucle y el `GameHandle` viven en el closure de `mount()`.
- **`lib/games/engines.ts`**: una línea, `snake: snakeGame`.
- **`lib/games.ts`**: `"snake"` en `GameId` y su entrada al final de `GAMES`, con
  `cat: "CLASICOS"` y `glow: "#00f5ff"`.
- **`components/play-cabinet.tsx`**: una línea en `ENGINE_KEYS` con los **cinco**
  códigos. Es la primera máquina del vault que usa el mando entero.
- **`lib/preview-art.ts`**: `serpiente` sale de `ArchivedPreviewId` y su `case` se
  renombra a `"snake"`. La aritmética de la escena no se toca.
- **`supabase/migrations/<sello>_snake.sql`**: `insert` de la fila `snake` en
  `public.games` con `sort_order: 3`.
- **`lib/landing.ts`**: `STATS` pasa de `3` a `4` máquinas y el `desc` de
  `FEATURES` nombra a Snake.
- **Apartado en `CLAUDE.md`**: la cuarta máquina, que el vault ya sirve un
  binario, y que quedan cinco escenas archivadas.

**Fuera de alcance (para futuras specs):**

- **Obstáculos y muros interiores por nivel.** El tablero de esta spec es una
  rejilla vacía con cuatro paredes.
- **Frutas especiales**: bonus temporal, fruta dorada, fruta que encoge. Las 22
  valen lo mismo y aparecen al azar.
- **Modo toroidal**, como opción o como modo aparte. La pared mata, y punto.
- **Selector de dificultad.** La única dificultad es la que sube sola.
- **Animación de muerte de la serpiente.** Se pierde la vida y se reaparece.
- **Que `GameCanvas` o el contrato aprendan a esperar assets.** Es la spec que
  necesitaría una máquina cuyo dibujo dependa de una imagen; ésta no lo es.
- **Optimizar o recortar `fruits.png`.** Se sirve entero; recortarlo invalidaría
  las 22 coordenadas.
- **Sonido**, aquí y en las otras tres.
- **Autenticación, antitrampas, realtime y paginación del marcador.** Igual que
  en SPEC 06 y SPEC 09.
- **Tests.** El repo sigue sin framework y esta spec no lo introduce.
- **Tocar `references/source-assets/`.** Es material de referencia: se lee, no se
  edita.

## Modelo de datos

El contrato de SPEC 05 no cambia y el esquema de SPEC 06 tampoco. Lo que aparece
es un motor nuevo, una entrada de catálogo y una fila.

### El motor — `lib/games/snake/`

**`constants.ts`.** Las cifras se fijan aquí y no se reinterpretan al implementar.

```ts
export const W = 800;
export const H = 600;
export const CELL = 32;
export const COLS = 25; // W / CELL
export const ROWS = 20; // H / CELL

export const LIVES = 3;
export const START_LEN = 3;

/** Milisegundos por celda. El nivel 1 empieza en 150 y el 10 toca el suelo. */
export const TICK_START = 150;
export const TICK_STEP = 10;
export const TICK_MIN = 60;
export const MAX_LEVEL = 10;

/** Frutas que hacen subir un nivel. */
export const FRUITS_PER_LEVEL = 5;
/** Puntos por fruta: `POINTS_PER_FRUIT * level`. */
export const POINTS_PER_FRUIT = 10;

export const COLOR_BODY = "#00f5ff";
export const COLOR_HEAD = "#f5ff00";
/** La fruta cuando el atlas no ha cargado, o no cargará nunca. */
export const COLOR_FRUIT_FALLBACK = "#ff006e";
export const COLOR_GRID = "rgba(0,245,255,0.1)";
```

El tick del nivel `n` es `max(TICK_START - (n - 1) * TICK_STEP, TICK_MIN)`. Con
estos números el nivel 10 vale 60 ms y es el último que acelera; a partir de ahí
se sigue jugando al mismo ritmo hasta perder.

**`sprites.ts`.** Las 22 entradas se copian literales de
`references/source-assets/snake-assets/sprites.js`, sin recalcular ni una
coordenada.

```ts
export const ATLAS_SRC = "/snake/fruits.png";

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Las 22 frutas de la fila `y = 136–295` del atlas. Copiadas literales. */
export const FRUITS: Readonly<Record<string, SpriteRect>>;
/** Las claves de `FRUITS`, para sortear una fruta por índice. */
export const FRUIT_KEYS: readonly string[];

/** Un cargador **por montaje**: sin estado de módulo, y el navegador cachea. */
export function loadFruitAtlas(): { image: HTMLImageElement; ready(): boolean };
```

`ready()` es `false` hasta que la imagen carga y **se queda en `false` para
siempre** si el `error` salta. El motor solo pregunta eso; no sabe de promesas ni
de reintentos.

Los recortes son verticales —`110 × 160` la manzana, `170 × 160` el kiwi— y la
celda es cuadrada. El sprite se dibuja **conservando su proporción**, escalado al
lado que primero llene la celda y centrado en ella. Estirarlo a `32 × 32`
deformaría las 22.

**`entities.ts`.** Dos clases, con el `ctx` siempre por parámetro.

```ts
export type Dir = "up" | "down" | "left" | "right";

export class Snake {
  /** La cabeza es `cells[0]`. Coordenadas de rejilla, no de píxel. */
  cells: { x: number; y: number }[];
  dir: Dir;
  /** El giro pedido este tick; se aplica al avanzar y se limpia. */
  queued: Dir | null;
  grow(): void;
  step(): void;
  hitsWall(): boolean;
  hitsSelf(): boolean;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class Fruit {
  x: number;
  y: number;
  /** Índice en `FRUIT_KEYS`, sorteado al colocarse. */
  kind: number;
  draw(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement | null): void;
}
```

`queued` existe por una razón concreta: entre dos ticks caben dos pulsaciones, y
sin cola `↑` seguido de `↓` a 150 ms daría media vuelta sobre el propio cuello.
Solo se guarda **un** giro por tick, y se rechaza el opuesto al `dir` actual.

**`index.ts`.** El estado de partida, dentro del closure de `mount()`.

```ts
interface Run {
  snake: Snake;
  fruit: Fruit;
  score: number;
  lives: number;
  level: number;
  /** Frutas comidas en el nivel actual; a `FRUITS_PER_LEVEL` sube. */
  eaten: number;
  /** Milisegundos acumulados desde el último paso de rejilla. */
  acc: number;
  phase: "ready" | "playing" | "gameover";
}
```

`phase` y no `state`, porque `GameState` ya son las tres cifras del HUD.
`"ready"` es la serpiente quieta en el centro esperando `ESPACIO`: es la fase con
la que empieza la partida y también cada vida después de perder una.

### La máquina nueva — entrada en `GAMES`

Última del array, cuarta posición.

```ts
{
  id: "snake",
  title: "SNAKE",
  cat: "CLASICOS",
  glow: "#00f5ff",
  playable: true,
  desc: "Come fruta, crece y no te muerdas la cola.",
  long: "El clásico de la serpiente, con veintidós frutas de verdad en vez de un cuadrado. Cada fruta que comes te hace un segmento más largo y vale diez puntos por nivel, así que la misma manzana renta diez veces más en el nivel diez que en el primero. Cada cinco frutas el juego acelera, de ciento cincuenta milisegundos por celda a sesenta. La pared mata y tu propia cola también. Tres vidas: al perder una vuelves al centro con la puntuación y la velocidad intactas.",
  controls: "Flechas ← ↑ → ↓ giran · ESPACIO arranca",
}
```

`CLASICOS` estrena una cuarta categoría con contenido, así que el filtro de
`/biblioteca` pasa de tres opciones vivas a cuatro. El cian repite con Tetris,
que es inevitable: hay tres neones y ésta es la cuarta máquina. Las siluetas no
se confunden — rejilla con serpiente frente a pila de piezas.

### El HUD y las tres cifras

Los tres rótulos dicen la verdad sin forzar nada, así que **el contrato no se
toca por tercera vez consecutiva**.

| Cifra   | Qué es en Snake                                   | Rótulo       |
| ------- | ------------------------------------------------- | ------------ |
| `score` | Puntos acumulados: `10 × nivel` por fruta         | `PUNTUACION` |
| `lives` | Vidas restantes, de 3 a 0                         | `VIDAS`      |
| `level` | Nivel de velocidad, de 1 a 10; sube cada 5 frutas | `NIVEL`      |

`hud: ["PUNTUACION", "VIDAS", "NIVEL"]`, los mismos de Asteroids y Arkanoid.

### La fila de `public.games`

```sql
insert into public.games (id, title, cat, playable, sort_order) values
  ('snake', 'SNAKE', 'CLASICOS', true, 3);
```

Ningún `update`: las tres filas existentes tienen `sort_order` 0, 1 y 2, así que
el 3 continúa la serie sin tocar nada. No se siembra ninguna marca, igual que en
SPEC 08 y SPEC 09.

## Plan de implementación

Cada paso deja el repo compilando. Los pasos 1 a 6 no los consume nadie: se
verifican con `npm run build` y `npx tsc --noEmit`.

1. **El atlas y su cargador.** Crear `public/` y copiar el PNG a
   `public/snake/fruits.png`, sin tocar un píxel. Escribir
   `lib/games/snake/sprites.ts` con `ATLAS_SRC`, las 22 entradas de `FRUITS`
   copiadas literales de `sprites.js`, `FRUIT_KEYS` y `loadFruitAtlas()`. El
   cargador crea un `new Image()` por llamada y expone `ready()`, que empieza en
   `false`, pasa a `true` en `load` y se queda en `false` si salta `error`.
   Verificación: `npm run dev` y abrir `/snake/fruits.png` devuelve la imagen;
   `npx tsc --noEmit` pasa.

2. **Constantes y utilidades.** `lib/games/snake/constants.ts` con los valores de
   esta spec, y `math.ts` con `randInt(n)` y
   `pickFreeCell(occupied, cols, rows)`, las dos puras.
   Verificación: `npx tsc --noEmit` pasa.

3. **Las entidades.** `lib/games/snake/entities.ts` con `Snake` y `Fruit`.
   `Snake` sabe avanzar, crecer, detectar pared y detectar su propio cuerpo, y
   acepta un giro encolado rechazando el opuesto. `Fruit.draw()` recibe el `ctx`
   y la imagen —o `null`— y decide entre `drawImage` con proporción conservada y
   un `arc` magenta.
   Verificación: `npx tsc --noEmit` pasa.

4. **El esqueleto de `mount()`.** `lib/games/snake/index.ts` exporta
   `snakeGame: GameMount` con su `world` y su `hud`. `mount()` crea el `Run` en el
   closure, llama a `loadFruitAtlas()`, engancha la entrada con `createInput()` y
   devuelve el `GameHandle`. El bucle de `requestAnimationFrame` ya corre con el
   `dt` recortado a `MAX_DT = 0.05`, pero `update` y `draw` están vacíos.
   **`mount()` emite el estado inicial antes de devolver el handle**, para que el
   `FRESH_RUN` de `PlayCabinet` no se vea durante la carga. `destroy()` cancela el
   frame guardado, desengancha la entrada y es idempotente.
   Verificación: `npm run build` pasa; nadie lo monta todavía.

5. **Implementar `update(dt)`.** El acumulador suma el `dt` en milisegundos y da
   un paso de rejilla cada vez que llega al tick del nivel. En `"ready"`,
   `ESPACIO` pasa a `"playing"`. En `"playing"`: aplicar el giro encolado,
   avanzar, comprobar pared y cuerpo, comer, sumar `POINTS_PER_FRUIT * level`,
   crecer, recolocar la fruta y subir de nivel cada `FRUITS_PER_LEVEL`. Al chocar
   se resta una vida; si quedan, la serpiente vuelve al centro con `START_LEN`, la
   fruta se recoloca y la fase pasa a `"ready"`, conservando puntuación y nivel.
   Sin vidas, la fase pasa a `"gameover"`, se llama a `onGameOver(score)` **una
   sola vez** —flag `overSent`, rearmado solo en `restart()`— y el bucle se
   detiene.
   Verificación: `npx tsc --noEmit` pasa.

6. **Implementar `draw()`.** Fondo, la rejilla tenue de `COLOR_GRID`, la fruta y
   la serpiente: cuerpo cian y cabeza amarilla, cada celda como un `fillRect` con
   inset para que se distingan los segmentos. **No se dibuja** puntuación, vidas,
   nivel ni `GAME OVER`: eso lo pinta React a veinte píxeles.
   Verificación: `npm run build` pasa.

7. **La máquina entra en el vault.** Este paso es **indivisible** y toca cinco
   archivos a la vez, porque separarlo deja el repo roto: el literal `"snake"` en
   `GameId` no compila sin su entrada en `GAMES` ni sin el `case` de
   `drawPreview()` —el `id satisfies never` rompe el build—, y `/jugar/snake`
   respondería en blanco sin la línea de `ENGINES`. Es el mismo razonamiento del
   paso 2 de SPEC 07 y no se trocea «para que sea más granular».
   - `lib/games.ts`: `"snake"` en `GameId` y la entrada al final de `GAMES`.
   - `lib/games/engines.ts`: `snake: snakeGame`.
   - `components/play-cabinet.tsx`:
     `snake: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"]` en
     `ENGINE_KEYS`.
   - `lib/preview-art.ts`: `"serpiente"` sale de `ArchivedPreviewId` y el
     `case "serpiente"` se renombra a `case "snake"`. **Se mueve, no se copia**:
     el id no puede quedar en los dos sitios.

   Verificación: `/biblioteca` muestra cuatro tarjetas, `/juego/snake` y
   `/jugar/snake` responden 200, la partida se juega con el teclado y con el
   mando, y las otras tres máquinas se ven y se juegan igual.

8. **Migración `<sello>_snake.sql`.** El `insert` de la fila con
   `sort_order: 3`. Aplicar con `npx supabase db push`; **nunca** con
   `apply_migration` por MCP.
   Verificación: `public.games` tiene 4 filas, `npx supabase migration list`
   marca la migración aplicada, y guardar una marca de Snake no revienta contra
   la clave ajena.

9. **Los dos textos que contarían mal.** `lib/landing.ts`: `STATS` pasa de
   `{ value: "3", unit: "MAQUINAS" }` a `"4"`, y el `desc` de `FEATURES` deja de
   decir «tres clásicos» para nombrar los cuatro.
   Verificación: la portada dice `4 MAQUINAS` y la tarjeta de ventajas nombra a
   Snake.

10. **Documentar en `CLAUDE.md`.** Que el vault tiene cuatro máquinas y `snake`
    es la primera escrita desde cero; que sirve un binario desde
    `public/snake/fruits.png` y que el contrato no cambió por ello; y que de las
    escenas archivadas quedan **cinco**, porque `serpiente` hizo el viaje a
    `GameId`.
    Verificación: el apartado existe y nombra `lib/games/snake/`,
    `public/snake/fruits.png` y `lib/games/snake/sprites.ts`.

## Criterios de aceptación

**El motor**

- [ ] Existen `lib/games/snake/constants.ts`, `math.ts`, `sprites.ts`,
      `entities.ts` e `index.ts`.
- [ ] `lib/games/snake/` no importa nada de `react`, `next` ni `@/components`.
- [ ] En el ámbito de módulo de `lib/games/snake/index.ts` no hay ni una variable
      mutable: todo el estado vive en `mount()`.
- [ ] Montar y destruir dos veces no deja ningún `requestAnimationFrame` vivo ni
      ningún listener en `window`.
- [ ] Las 22 entradas de `FRUITS` coinciden número a número con
      `references/source-assets/snake-assets/sprites.js`.
- [ ] `public/snake/fruits.png` es byte a byte el archivo de
      `references/source-assets/snake-assets/`.
- [ ] Con la red cortada, `/jugar/snake` se juega igual y la fruta se ve como un
      círculo magenta.
- [ ] Las frutas se dibujan sin deformarse: un sprite vertical no sale estirado a
      cuadrado.
- [ ] La serpiente avanza una celda por tick y las cuatro flechas la giran.
- [ ] Pulsar `↑` y `↓` entre dos ticks no da media vuelta: el giro opuesto se
      rechaza.
- [ ] Comer una fruta alarga la serpiente un segmento y coloca otra fruta en una
      celda libre.
- [ ] La fruta nunca aparece bajo el cuerpo de la serpiente.
- [ ] Una fruta suma `10 × nivel`: 10 puntos en el nivel 1 y 100 en el 10.
- [ ] Cada 5 frutas sube el nivel y el juego acelera; el nivel 10 corre a 60 ms y
      ya no acelera más.
- [ ] Chocar con la pared o con el propio cuerpo resta una vida.
- [ ] Al perder una vida la serpiente vuelve al centro con 3 segmentos, y la
      puntuación y el nivel se conservan.
- [ ] Perder la tercera vida dispara `onGameOver` exactamente una vez y detiene el
      bucle.
- [ ] El canvas **no** pinta `PUNTUACION`, `VIDAS`, `NIVEL` ni `GAME OVER`.

**El catálogo y las rutas**

- [ ] `GAMES` tiene cuatro entradas y la cuarta es `snake`, la última.
- [ ] `/biblioteca` muestra cuatro tarjetas y filtrar por `CLASICOS` deja solo la
      de Snake.
- [ ] `/juego/snake` y `/jugar/snake` responden 200.
- [ ] Las rutas de `asteroids`, `tetris` y `arkanoid` siguen respondiendo 200.
- [ ] `ENGINES` tiene cuatro entradas.
- [ ] La portada dice `4 MAQUINAS` y `FEATURES` nombra los cuatro juegos.

**El mando y el HUD**

- [ ] Los **cinco** botones del mando están vivos en `/jugar/snake`: ninguno se ve
      atenuado.
- [ ] Con el ratón o el dedo se gira en las cuatro direcciones y se arranca, sin
      tocar el teclado.
- [ ] Soltar el botón o sacar el puntero de él suelta la tecla.
- [ ] La serpiente empieza quieta y no se mueve hasta que se pulsa `ESPACIO`,
      tanto al empezar la partida como después de perder una vida.
- [ ] El HUD rotula `PUNTUACION`, `VIDAS` y `NIVEL`, y las tres cifras coinciden
      con la partida.
- [ ] Al terminar `CARGANDO CARTUCHO` el HUD ya muestra `0 / 3 / 1`, sin
      parpadeo.
- [ ] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia.
- [ ] PAUSA congela el canvas y SEGUIR reanuda en el mismo punto.
- [ ] La línea de controles bajo el mando dice lo mismo que `ENGINE_KEYS.snake`.

**La miniatura**

- [ ] `/biblioteca` y `/juego/snake` muestran la escena de la serpiente, no la del
      `default`.
- [ ] `grep -n "serpiente" lib/preview-art.ts` no devuelve nada: el id se movió,
      no se copió.
- [ ] `ArchivedPreviewId` tiene cinco miembros.
- [ ] La aritmética de la escena no cambió: el `case` solo se renombró.

**El marcador**

- [ ] `public.games` tiene cuatro filas y la de `snake` tiene `sort_order = 3`.
- [ ] Las filas de `asteroids`, `tetris` y `arkanoid` no cambiaron.
- [ ] `public.scores` no gana ninguna fila con la migración.
- [ ] Terminar una partida y pulsar GUARDAR PUNTUACION mete la marca y la enseñan
      `/salon`, `/juego/snake`, `/biblioteca` y la portada.
- [ ] `/salon` muestra cuatro pestañas y sigue abriendo en `ASTEROIDS` sin
      `?juego=`.
- [ ] Con `scores` vacía, `/juego/snake` muestra `SE EL PRIMERO` y no
      `MARCADOR NO DISPONIBLE`.

**Nada más se ha movido**

- [ ] `npm run build`, `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] `lib/games/engine.ts` no tiene ni una línea modificada.
- [ ] `lib/games/input.ts` y `components/game-canvas.tsx` no tienen ni una línea
      modificada.
- [ ] `lib/games/asteroids/`, `lib/games/tetris/` y `lib/games/arkanoid/` no
      cambian.
- [ ] `lib/leaderboard.ts`, `lib/scores.ts`, `lib/storage.ts` y
      `app/jugar/[id]/actions.ts` no cambian.
- [ ] `references/source-assets/` y `references/started-games/` no tienen ningún
      cambio.
- [ ] `public/` contiene únicamente `snake/fruits.png`.

**Documentación**

- [ ] `CLAUDE.md` dice que el vault tiene cuatro máquinas y que `snake` es la
      primera escrita desde cero.
- [ ] `CLAUDE.md` nombra `public/snake/fruits.png` y explica que el contrato no
      cambió para cargarlo.
- [ ] `CLAUDE.md` dice que quedan cinco escenas archivadas en
      `lib/preview-art.ts`.

## Decisiones tomadas y descartadas

**El origen del juego**

- **Sí:** el motor se escribe desde cero. `sprites.js` son 46 líneas de
  coordenadas y ni una de lógica; no hay nada que portar. Se pierde lo que un
  puerto regala: un equilibrio ya probado. A cambio, las cifras se fijan en esta
  spec y se ajustan jugando si hace falta.
- **Sí:** los números quedan congelados aquí —150/60/10 ms, 5 frutas por nivel, 3
  vidas, celda de 32 px, longitud inicial 3—. Es el sustituto de la regla «copia
  literal del original»: `/spec-impl` los copia sin reinterpretar, y quien quiera
  cambiarlos lo hace contra un documento, no contra su memoria.
- **Sí:** mundo de `800 × 600` con celda de 32, o sea rejilla de 25 × 20. Es el
  mundo de Asteroids, que ya entra de sobra en el gabinete sin que
  `CABINET_CHROME` lo encoja. Un mundo cuadrado desperdiciaría ancho y arriesgaría
  encogerse en portátiles.
- **No:** mundo toroidal. Es la variante más pedida y la que estropea el
  marcador: sin paredes la partida se alarga casi sin límite y el top 10 mide
  paciencia, no habilidad.

**Los sprites**

- **Sí:** se carga `fruits.png`. Es la única forma de que existan 22 frutas
  distintas: en 32 píxeles, una fruta dibujada con primitivas es un punto de
  color, y 22 puntos de color son tres neones repetidos. Se pierde el patrón
  «ningún motor del vault carga archivos», que Arkanoid respetó en SPEC 09
  quedándose sin su spritesheet.
- **No:** redibujar las 22 con primitivas. Serían 22 funciones de dibujo para un
  resultado que a ese tamaño no se distingue. Es más código y peor pantalla.
- **Sí:** el PNG entero, con las 22 coordenadas copiadas literales. Se pierden
  unos 450 KB de filas del atlas que no se usan, y se gana no recalcular a mano 22
  rectángulos contra una imagen recortada — que es exactamente el tipo de retoque
  que estas specs no hacen.
- **Sí:** `loadFruitAtlas()` devuelve un cargador nuevo por cada `mount()`. Una
  caché de módulo sería estado mutable fuera del closure y rompería el primer
  patrón del contrato; el navegador ya cachea la petición, así que el segundo
  montaje no vuelve a descargar nada.
- **Sí:** el motor no espera a la imagen. `mount()` sigue siendo síncrono,
  `GameCanvas` no gana estado de «cargando» y el contrato no cambia. Se pierde la
  garantía de que la primera fruta salga con sprite; se gana que una imagen rota,
  o lenta, no rompa ni retrase la partida.
- **No:** atar los 750 ms de `CARGANDO CARTUCHO` a la carga real. Suena a que sale
  gratis y no lo es: convierte un temporizador decorativo en una espera de verdad,
  con su caso de «la imagen no llega nunca» que hoy no existe. Que casi siempre se
  solapen es suerte, y así queda escrito.
- **Sí:** el respaldo es un círculo **magenta** `#ff006e`. El cian del primer
  borrador era el color del cuerpo de la serpiente: una fruta invisible justo
  cuando la imagen ha fallado. El magenta es además el color de la fruta en la
  escena archivada.
- **Sí:** el sprite conserva su proporción dentro de la celda. Los recortes son
  verticales —`110 × 160` la manzana— y estirarlos a `32 × 32` deformaría las 22.

**La identidad**

- **Sí:** el id es `snake`, el nombre real del juego. Es la misma regla que trajo
  `tetris` y `arkanoid`.
- **No:** reutilizar `serpiente`. Es un nombre de fantasía de SPEC 01, no de
  máquina, y además choca con mover su escena.
- **Sí:** `cat: "CLASICOS"`, que estrena una cuarta categoría con contenido.
  `ARCADE` también sería cierto, pero repite la de Arkanoid y no aporta nada al
  filtro de la biblioteca.
- **Sí:** cian `#00f5ff`, repitiendo con Tetris. Solo hay tres neones y ésta es la
  cuarta máquina: la repetición era inevitable. Se elige el que ya usa la
  miniatura, y las dos siluetas no se parecen en nada.
- **Sí:** la escena `serpiente` **se mueve** a `GameId`. Copiarla compila igual y
  deja dos escenas divergiendo; es la regla escrita en SPEC 07 y en la cabecera
  del propio archivo.

**El juego**

- **Sí:** una fruta vale `10 × nivel`. Hace que la parte rápida sea donde se
  decide la partida y da al marcador un rango ancho. Se pierde que la puntuación
  se lea de un vistazo como «frutas × 10».
- **No:** 10 puntos fijos por fruta. Ordena el top 10 por frutas comidas y nada
  más: sobrevivir en el nivel 10 valdría lo mismo que en el 1.
- **Sí:** al perder una vida se conservan puntuación y nivel, y se pierde la
  longitud. Perder duele sin borrar la partida, y la velocidad ganada no se
  regala.
- **No:** conservar también la longitud. Suena generoso y en la práctica es un
  bucle: mueres largo, reapareces largo, vuelves a morir.
- **No:** reiniciar el nivel al perder una vida. Convierte tres vidas en tres
  partidas cortas pegadas.
- **Sí:** las 22 frutas al azar y todas al mismo valor. Una tabla de puntos por
  fruta habría que equilibrarla a ciegas, y la variedad ya es visual.
- **Sí:** un solo giro encolado por tick, rechazando el opuesto. A 150 ms caben
  dos pulsaciones entre pasos, y sin cola `↑` seguido de `↓` sería una muerte que
  el jugador no ha pedido.

**El mando**

- **Sí:** `ESPACIO` arranca la serpiente y ésta nace quieta. Es lo que hizo
  Arkanoid con la bola en SPEC 09 y resuelve el mismo problema: reaparecer en
  marcha tras perder una vida es morir antes de reaccionar. De paso deja los cinco
  botones vivos, por primera vez en el vault.
- **No:** `ESPACIO` deshabilitado como el `↓` de Asteroids. Más barato, y deja un
  botón muerto y el problema de la reaparición sin resolver.
- **No:** `ESPACIO` como turbo. Añade una mecánica que Snake no tiene y que habría
  que equilibrar a ciegas.

**Lo que no se toca**

- **No:** extender `GameMount` ni `GameCallbacks`. Los tres rótulos de Snake dicen
  la verdad y su dibujo no necesita esperar a nadie; es la tercera máquina seguida
  que entra sin tocar el contrato.
- **Sí:** `initialTab` del salón se queda en `?? "asteroids"`. `asteroids` sigue
  en el catálogo, así que el fallback vale; cambiarlo sería decidir que el salón
  abre en la máquina más nueva, y eso no es lo que pide esta spec.
- **Sí:** los dos textos de `lib/landing.ts` se actualizan a mano. SPEC 07 los
  desacopló de `GAMES.length` a propósito, así que nadie avisa si se quedan
  mintiendo.
- **No:** récord de Snake en `localStorage`. Ahí solo viven la sesión y el
  `device_id`; un segundo récord local contradiría al marcador compartido.
- **No:** sonido. Ningún motor del vault suena, y meter audio arrastra mute,
  volumen y desbloqueo del `AudioContext`.

## Riesgos

| Riesgo                                                                                                                                                               | Mitigación                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fruits.png` no ha cargado cuando arranca la partida, y las primeras frutas salen como círculos y luego cambian a sprite a media partida.                            | Es el comportamiento esperado y está escrito: la fruta tiene dos aspectos y ninguno rompe nada. La carga se lanza en `mount()`, antes de los 750 ms de `CARGANDO CARTUCHO`, así que en la práctica llega antes.    |
| El equilibrio está fijado sobre el papel: 150 ms puede resultar soso o el nivel 10 injugable, y `10 × nivel` puede dejar un rango de puntuación raro en el marcador. | Los siete números viven juntos en `constants.ts` y se ajustan sin tocar el motor. El marcador arranca vacío, así que un reajuste temprano no invalida ninguna marca real.                                          |
| El paso 7 se trocea «para que sea más granular» y deja el repo o una ruta pública rota entre commits.                                                                | Está escrito como indivisible en el propio paso, con la razón: `GameId` no compila sin `GAMES` ni sin el `case`, y `ENGINES` decide si `/jugar/snake` enseña algo. Es el mismo razonamiento del paso 2 de SPEC 07. |
| `serpiente` se queda en `ArchivedPreviewId` además de entrar por `GameId`: compila igual y deja dos escenas divergiendo.                                             | Hay un criterio de aceptación que lo comprueba con `grep`: el id debe aparecer cero veces en `lib/preview-art.ts`.                                                                                                 |
| Crear `public/` cambia lo que Next sirve en la raíz del sitio, y un archivo mal puesto ahí queda expuesto públicamente.                                              | La carpeta nace con un único archivo, `snake/fruits.png`, y hay un criterio que comprueba que no contiene nada más.                                                                                                |
| La cola de un solo giro por tick se siente lenta a 60 ms, donde caben menos pulsaciones entre pasos que a 150.                                                       | Es el comportamiento deliberado: una cola más larga permitiría encadenar dos giros en un tick y dar media vuelta. Si molesta, la cola se alarga a dos posiciones sin tocar nada más que `Snake`.                   |
| Guardar la primera marca de Snake revienta contra la clave ajena si el paso 8 no se aplicó.                                                                          | El paso 8 va inmediatamente después del 7 y su verificación es exactamente esa: guardar una marca. Entre los dos pasos la máquina se juega y solo falla al terminar.                                               |

## Lo que **no** entra en esta spec

- Obstáculos, muros interiores y tableros por nivel.
- Frutas especiales: bonus, fruta dorada, fruta que encoge.
- Modo toroidal y selector de dificultad.
- Animación de muerte de la serpiente.
- Que `GameCanvas` o el contrato de `lib/games/engine.ts` aprendan a esperar
  assets.
- Optimizar, recortar o reescalar `fruits.png`.
- Sonido, aquí y en las otras tres máquinas.
- Autenticación, antitrampas, moderación, realtime y paginación del marcador.
- Tests.

Cada una de esas, si llega, va en su propia spec.
