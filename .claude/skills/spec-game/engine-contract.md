# El contrato de motor, y cómo se lee un juego con él delante

Archivo de apoyo de `/spec-game`. Se lee **al empezar la Fase 2**, antes de abrir el fuente
original. Su función es doble: fijar lo que el motor nuevo tiene que cumplir, y dar la lente con
la que hay que mirar el código de `references/started-games/`.

---

## 1. El contrato — `lib/games/engine.ts`

Copiado verbatim. **Este archivo no se toca**, salvo por la extensión del HUD del apartado 3.

```ts
/** Tamaño lógico del mundo. El gabinete lo usa para el `aspect-ratio`. */
export interface GameWorld {
  width: number;
  height: number;
}

/** Las tres cifras del HUD. Se emiten solo cuando alguna cambia. */
export interface GameState {
  score: number;
  lives: number;
  level: number;
}

export interface GameCallbacks {
  onState: (state: GameState) => void;
  onGameOver: (score: number) => void;
}

export interface GameHandle {
  start(): void;
  pause(): void;
  resume(): void;
  /** Reinicia desde cero: puntuación a 0, tres vidas, nivel 1. */
  restart(): void;
  /** Suelta el bucle y los listeners. Llamarlo dos veces no rompe nada. */
  destroy(): void;
  /** Mantiene una tecla desde el mando táctil, como si viniera del teclado. */
  press(code: string): void;
  /** Suelta una tecla inyectada con `press()`. */
  release(code: string): void;
}

/** Lo que implementa cada juego. `world` es estático, no depende del canvas. */
export interface GameMount {
  world: GameWorld;
  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle;
}
```

---

## 2. Las cuatro cosas que hay que matar del original

Esta es la lente de lectura de la Fase 2. Un `game.js` de navegador hace las cuatro, y ninguna
sobrevive dentro de un componente que se monta y se desmonta. Al leer el original, **localiza
las cuatro y anótalas con su número de línea**: son el trabajo real del puerto.

| Lo que hace el original                         | Por qué no sobrevive                                                              | Qué lo sustituye                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `document.getElementById("canvas")` al cargarse | El canvas lo crea React y no existe cuando el módulo se evalúa                    | El `canvas` llega **por parámetro** a `mount()`          |
| Estado de partida en variables de módulo        | Montar dos veces compartiría una sola partida                                     | `interface Run`, dentro del closure de `mount()`         |
| Listeners en `window` enganchados para siempre  | Al desmontar seguirían vivos, y el `preventDefault` secuestra el scroll del sitio | `createInput()`, con `attach()` / `detach()`             |
| `requestAnimationFrame` que no se puede parar   | Sin forma de cancelarlo, cada remontaje añade un bucle y el juego va al doble     | El par `play()` / `halt()`, con el id del frame guardado |

---

## 3. Los ocho patrones no negociables

Salen de `lib/games/asteroids/index.ts`, que es el ejemplo trabajado. Un motor nuevo los cumple
todos; si alguno estorba, eso es una decisión que se escribe en la spec, no una excepción que se
toma en la implementación.

1. **Closure total.** En el ámbito de módulo no hay **ni una** variable mutable. Todo el estado
   de partida vive en un `interface Run` creado dentro de `mount()`. Montar el juego dos veces
   crea dos partidas independientes.

2. **La máquina de estados se llama `phase`, no `state`.** `Run.phase` es
   `"playing" | "dead" | "gameover"` o lo que pida el juego. No se llama `state` porque
   `GameState` ya son las tres cifras del HUD, y confundirlas es el error caro.

3. **El motor no importa `react` ni `next`.** Ni `@/components`. TypeScript puro y el DOM que le
   llega por parámetro.

4. **`dt` recortado.** `const MAX_DT = 0.05` y
   `const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);`. El primer
   frame vale `0` porque `play()` pone `lastTime = null`. Sin el tope, volver de una pestaña
   oculta teletransporta todas las entidades.

5. **`emitState()` por diferencia.** Un frame **nunca** provoca un render:

   ```ts
   function emitState() {
     if (
       emitted &&
       emitted.score === run.score &&
       emitted.lives === run.lives &&
       emitted.level === run.level
     )
       return;
     emitted = { score: run.score, lives: run.lives, level: run.level };
     cb.onState(emitted);
   }
   ```

6. **Orden dentro del bucle:** `update(dt)` → `draw()` → `emitState()` → y **después**
   `onGameOver`. Así el superpuesto de fin de partida se abre con el HUD ya cuadrado, no una
   cifra por detrás. El frame siguiente solo se pide si `running` sigue encendido.

7. **`onGameOver` una sola vez por partida.** Flag `overSent`, puesto al dispararlo y reseteado
   **solo** en `restart()`.

8. **El par `play()` / `halt()`.** `play()` engancha la entrada y pide el frame; `halt()` cancela
   el frame guardado y desengancha la entrada. Los seis métodos del `GameHandle` son casi
   triviales encima de ellos, y `destroy()` es idempotente con un flag `destroyed`. Esto es lo
   que hace que React en modo estricto —que monta los efectos dos veces en desarrollo— no deje
   dos bucles corriendo.

**Y una novena que es de reparto, no de mecánica:** el motor **no pinta** la puntuación, las
vidas, el nivel ni el `GAME OVER`. Eso lo pinta React a veinte píxeles del canvas. Del `drawHUD`
de un original solo sobrevive lo que no tiene equivalente fuera: barras de potenciador activo,
la pieza siguiente, y cosas así.

---

## 4. El reparto en archivos

Cuatro archivos en `lib/games/<id>/`. Un juego sin geometría propia puede prescindir de
`math.ts`; el resto no son opcionales.

| Archivo        | Qué va                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts` | Solo `export const` numéricos y tipos de unión. **Copiados del original sin retocar ni un número**: el juego ya está equilibrado y reajustarlo sin jugarlo es adivinar. |
| `math.ts`      | Utilidades geométricas puras (`wrap`, `dist`, `rand`, `randInt`…). Sin estado.                                                                                          |
| `entities.ts`  | Clases tipadas con campos públicos, `dead = false`, `update(dt)` y `draw(ctx)`. **El `ctx` va siempre por parámetro**, nunca leído de un módulo.                        |
| `index.ts`     | `mount()`, el `interface Run`, `update`, `draw`, el bucle y el `GameHandle`. Exporta `<id>Game: GameMount`.                                                             |

Si una entidad necesita la entrada —la nave de Asteroids la necesita—, se le pasa también por
parámetro: `update(dt, input, hyperActive)`. Leerla de fuera del closure rompe el patrón 1.

---

## 5. Lo que ya existe y se reutiliza

**No se escribe una entrada de teclado nueva.** `lib/games/input.ts` ya la tiene:

```ts
const input = createInput();
input.keys["ArrowLeft"]; // ¿mantenida ahora mismo?
input.pressed("Space"); // flanco de bajada, se consume en la primera lectura
input.press(code); // lo que inyecta el mando táctil
input.release(code);
input.attach(); // idempotente
input.detach(); // idempotente; además limpia las teclas mantenidas
```

Dos detalles que condicionan el diseño del motor:

- `preventDefault` **solo** de `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space`, y
  **solo** mientras está enganchada. Una tecla fuera de esas cinco no bloquea el scroll, lo que
  significa que un juego que use `P` o `Shift` hará scroll de la página al pulsarlas.
- `detach()` limpia las teclas mantenidas a propósito: sin listeners no llega el `keyup`, y una
  tecla que se quedara abajo movería al jugador solo al reanudar.

**Tampoco se escribe el componente de canvas.** `components/game-canvas.tsx` es genérico: crea el
`<canvas>`, lo escala por `devicePixelRatio` con tope 2, aplica el `aspect-ratio` de `world`,
monta el motor en un efecto que solo depende del `GameMount` y llama a `destroy()` al limpiar.
Los callbacks viven en una `ref`, así que un re-render del padre no reinicia la partida. **El
motor dibuja siempre en coordenadas lógicas** e ignora el `devicePixelRatio`.

---

## 6. La extensión del HUD

El HUD del gabinete tiene tres cifras y las rotula `PUNTUACION` / `VIDAS` / `NIVEL` con literales
escritos en `components/play-cabinet.tsx`. Encaja con Asteroids y con Arkanoid. **No encaja con
un juego que no tenga vidas**, y Tetris es exactamente ese caso.

La salida acordada para el vault es **extender el contrato**, no mapear a la fuerza:

```ts
export interface GameMount {
  world: GameWorld;
  /** Rótulos del HUD, en el orden score/lives/level. MAYÚSCULAS y sin tildes. */
  hud: readonly [string, string, string];
  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle;
}
```

`asteroids` declara `hud: ["PUNTUACION", "VIDAS", "NIVEL"]` y no cambia ni un píxel. Un Tetris
declararía `["PUNTUACION", "LINEAS", "NIVEL"]`.

**El campo es requerido, no opcional con default.** Así `tsc` obliga a cada motor a declarar sus
rótulos, en vez de heredar en silencio unos que podrían no corresponderle.

Antes de proponerlo, **comprueba si ya está**:

```
grep -n "hud" lib/games/engine.ts
```

- **No aparece** → la spec incluye la extensión como **paso 0**: el campo en `GameMount`, la
  línea en `lib/games/asteroids/index.ts` y el HUD de `play-cabinet.tsx` leyendo `engine.hud` en
  vez de los literales. Es el único caso en que una spec de máquina nueva toca el motor de
  Asteroids, y hay que escribirlo como decisión.
- **Ya aparece** → una spec anterior lo añadió. No hay paso 0: la máquina nueva solo declara sus
  tres rótulos.
