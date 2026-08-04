# SPEC 05 — Asteroids: primer motor de juego real

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-08-04
> **Objetivo:** Portar el Asteroids de `references/started-games/02-asteroids/` a un motor en TypeScript y añadirlo como novena máquina jugable de verdad, definiendo de paso el contrato que usarán los motores siguientes, sin tocar ninguna de las ocho máquinas simuladas.

## Por qué existe esta spec

Hasta aquí el vault es un escaparate. `/jugar/[id]` pinta la escena congelada de
`drawPreview()`, el HUD lee cifras fijas de `lib/demo-run.ts`, el mando no hace
nada y al fin de partida se llega con un botón que se llama, literalmente,
`SIMULAR FIN DE PARTIDA`. Esta spec mete el primer juego que se juega.

El juego ya existe: `references/started-games/02-asteroids/game.js` son 672 líneas
de canvas puro que funcionan. Lo que no existe es la forma de meterlo en Next.js
sin romperlo. Ese archivo lee `document.getElementById("canvas")` al cargarse,
guarda el estado de partida en variables de módulo, engancha listeners en `window`
para siempre y arranca un `requestAnimationFrame` que no se puede parar. Nada de
eso sobrevive dentro de un componente que se monta y se desmonta.

Por eso la spec hace dos cosas a la vez. La primera es el puerto. La segunda es el
contrato: `references/started-games/` tiene otras dos carpetas, `03-tetris` y
`04-arkanoid`, esperando el mismo trabajo. Definir cómo habla un motor con la
pantalla ahora, con un caso delante, cuesta un archivo de tipos. Descubrirlo al
tercer juego cuesta reescribir los dos primeros.

Y hace una cosa que parece pequeña y no lo es: `asteroids` entra como máquina
**nueva**. Existe ya una máquina de fantasía llamada `rocas` que describe este
mismo juego, pero meter el motor ahí habría arrastrado el tipo `GameId`, las
semillas, la miniatura, las marcas guardadas en `localStorage` y dos URLs. El
juego nuevo se pone al lado; lo que ya funciona no se toca.

## Alcance

**Dentro:**

- `lib/games/engine.ts`: el contrato que cumplirán todos los motores. Una función
  `mount(canvas, callbacks) → GameHandle`, y un `GameHandle` con `start()`,
  `pause()`, `resume()`, `restart()` y `destroy()`. Los callbacks son
  `onState({ score, lives, level })` —que solo se llama cuando alguno de los tres
  cambia— y `onGameOver(score)`. También el tipo `GameWorld` con el tamaño lógico
  del mundo (`800 × 600` para Asteroids), que el componente usa para el `aspect-ratio`.
- `lib/games/input.ts`: fuente de entrada compartida. Engancha `keydown` / `keyup`
  en `window` solo mientras hay partida activa, expone `keys` y `pressed(code)`
  como el original, y añade `press(code)` / `release(code)` para que el mando
  táctil inyecte las mismas teclas. `preventDefault` solo de las flechas y
  `Space`, y solo mientras está enganchada.
- `lib/games/asteroids/constants.ts`: `W`, `H`, `RADII`, `SPEEDS`, `POINTS`, y las
  constantes de los cinco power-ups, copiadas del original sin cambiar un número.
- `lib/games/asteroids/math.ts`: `wrap`, `dist`, `rand`, `randInt`.
- `lib/games/asteroids/entities.ts`: `Bullet`, `Asteroid`, `Ship`, `Particle` y
  `PowerUp` como clases tipadas. Misma física, mismo dibujo, mismos colores.
- `lib/games/asteroids/index.ts`: `mountAsteroids()`, que cumple el contrato.
  Contiene el estado de partida, `update`, `draw` y el bucle de
  `requestAnimationFrame`, todo dentro del closure: ni una variable de módulo.
- `lib/games/engines.ts`: registro `Partial<Record<GameId, GameMount>>`. Hoy tiene
  una sola entrada, `asteroids`. Es lo que consulta `PlayCabinet` para saber si una
  máquina tiene motor.
- `components/game-canvas.tsx`: componente cliente fino. Crea el `<canvas>`, lo
  escala por `devicePixelRatio`, monta el motor en un efecto, lo destruye al
  desmontar y no re-renderiza nunca por culpa del bucle.
- `lib/games.ts`: entrada nueva `asteroids` **al final** de `GAMES`, con
  `title: "ASTEROIDS"`, `cat: "DISPAROS"`, `glow: "#f5ff00"`, `playable: true` y una
  copia que sí nombra los cinco power-ups. `GameId` gana el noveno valor.
- `lib/scores.ts`: diez semillas para `asteroids` en el rango ~1.500–9.000, cifras
  que una partida real alcanza.
- `lib/preview-art.ts`: `case "asteroids"` con su propia escena vectorial.
- `lib/demo-run.ts`: `DEMO_RUN` pasa de `Record<GameId, DemoRun>` a
  `Partial<Record<GameId, DemoRun>>`. Las ocho entradas existentes no se tocan;
  `asteroids` simplemente no tiene.
- `components/play-cabinet.tsx`: bifurca según haya motor o no.
  - Con motor: el canvas es el juego, el HUD lee el estado real, PAUSA para el
    bucle de verdad, el D-pad inyecta teclas, el fin de partida lo dispara el
    motor y GUARDAR PUNTUACION escribe la puntuación real.
  - Sin motor: exactamente lo de hoy, botón `SIMULAR FIN DE PARTIDA` incluido.
- Apartado en `CLAUDE.md`: dónde vive el contrato, cómo se añade un motor nuevo y
  por qué el bucle no vive en React.

**Fuera de alcance (para futuras specs):**

- Motores para las ocho máquinas simuladas. `references/started-games/03-tetris` y
  `04-arkanoid` esperan su propia spec; esta solo deja el contrato que usarán.
- Renombrar los ids existentes. `rocas`, `muro`, `caida` y compañía se quedan tal
  cual, con su copia, sus semillas y sus URLs.
- Tocar `lib/storage.ts`, `lib/session.tsx` o la clave `arcadevault:v1`.
- Supabase. La marca sigue yendo a `localStorage` por `addScore()`.
- Validar la puntuación en servidor o cualquier medida antitrampas. El motor corre
  en el navegador y la marca es tan falsificable como hoy.
- Sonido y música.
- Guardar la partida en curso y reanudarla más tarde.
- Niveles de dificultad, tabla de controles reconfigurable y power-ups nuevos.
- Rediseñar el gabinete, el HUD o los superpuestos. Se rellenan los que ya existen.
- Tests: el repo no tiene framework y esta spec no lo introduce.
- Modificar `references/started-games/02-asteroids/`. Queda como está, de referencia.

## Modelo de datos

Esta spec no toca la base de datos ni la clave `arcadevault:v1`. Lo que aparece
son tres estructuras nuevas en el repo: el contrato de motor, el estado interno de
la partida y la entrada de catálogo de la máquina nueva.

### El contrato — `lib/games/engine.ts`

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
}

/** Lo que implementa cada juego. `world` es estático, no depende del canvas. */
export interface GameMount {
  world: GameWorld;
  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle;
}
```

`onState` recibe el objeto completo, no un delta: comparar tres números en el
motor es más barato que reconstruir el estado en React.

### El estado de partida — dentro de `mountAsteroids()`

Las mismas variables que hoy son globales de módulo en `game.js`, encerradas en el
closure de `mount()`. Ningún módulo puede leerlas ni escribirlas.

```ts
interface Run {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerups: PowerUp[];
  score: number;
  lives: number;
  level: number;
  /** Segundos restantes de cada power-up. 0 = inactivo. */
  timers: { triple: number; shield: number; slow: number; hyper: number };
  /** Control de drops del nivel actual. */
  drops: { types: Set<PowerUpType>; kills: number; levelTypes: PowerUpType[]; nova: boolean };
  phase: "playing" | "dead" | "gameover";
  deadTimer: number;
}

type PowerUpType = "triple" | "shield" | "slow" | "hyper" | "nova";
```

El `state` del original se renombra a `phase` para no chocar con el `GameState`
del contrato, que es otra cosa: uno es la máquina de estados interna, el otro las
tres cifras del HUD.

**Constantes que no cambian de valor:** `W = 800`, `H = 600`, `RADII = [0,16,30,50]`,
`SPEEDS = [0,85,55,32]`, `POINTS = [0,100,50,20]`, y las de los power-ups
(`TRIPLE_DURATION = 10`, `SHIELD_DURATION = 5`, `SLOW_DURATION = 6`,
`HYPER_DURATION = 8`, `DROP_CHANCE = 0.15`, `NOVA_CHANCE = 0.04`,
`TYPES_PER_LEVEL = 2`, ...). Se copian del original tal cual: cualquier retoque
desafina un juego que ya está equilibrado.

### La máquina nueva — entrada en `GAMES`

Última del array, novena posición.

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  cat: "DISPAROS",
  glow: "#f5ff00",
  playable: true,
  desc: "Pulveriza el campo de asteroides y sobrevive.",
  long: "El clásico de vectores, entero y jugable de verdad. Inercia real y espacio toroidal: sales por un borde y entras por el opuesto. Los asteroides grandes se parten en medianos y los medianos en pequeños, y cuanto más pequeños, más puntos. Cada nivel suelta dos de los cuatro potenciadores —disparo triple, escudo, cámara lenta e hiperpropulsión— y, con suerte, una bomba nova que limpia la pantalla.",
  controls: "Flechas ← → giran · ↑ empuja · ESPACIO dispara",
}
```

`glow` es el amarillo `#f5ff00` para separarla del cian de `rocas`. El título va
sin tildes ni caracteres raros, como el resto: Press Start 2P no tiene esos glifos.

### Semillas del marcador — `SEED_ROWS.asteroids`

Diez marcas en el rango 1.500–9.000, escalonadas para que una partida buena entre
en el top 10 y una excelente llegue al podio. Mismo formato que las demás:

```ts
asteroids: [
  ["VECTOR", 8940],
  ["NOVA_7", 7620],
  // ... hasta diez, bajando hasta ~1.500
],
```

Las fechas salen del array `DATES` que ya existe, igual que las otras ocho.

## Plan de implementación

Cada paso deja el repo compilando y es commiteable por separado. Los pasos 1 a 7
no los consume nadie todavía: se verifican con `npm run build` y `npx tsc --noEmit`.

1. **Escribir el contrato.** `lib/games/engine.ts` con `GameWorld`, `GameState`,
   `GameCallbacks`, `GameHandle` y `GameMount`. Solo tipos, ni una línea ejecutable.
   Verificación: `npx tsc --noEmit` pasa.

2. **Escribir la entrada compartida.** `lib/games/input.ts`: `createInput()` con
   `attach()` / `detach()`, el mapa `keys`, `pressed(code)` con su consumo de un
   solo uso, y `press(code)` / `release(code)` para el mando. `preventDefault` de
   `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space`, solo mientras está
   enganchada. Verificación: `npm run build` pasa.

3. **Portar constantes y utilidades.** `lib/games/asteroids/constants.ts` con
   `W`, `H`, `RADII`, `SPEEDS`, `POINTS` y las de los cinco power-ups, y
   `math.ts` con `wrap`, `dist`, `rand`, `randInt`. Los valores se copian del
   original sin tocar ni uno. Verificación: `npx tsc --noEmit` pasa.

4. **Portar las entidades.** `lib/games/asteroids/entities.ts` con `Bullet`,
   `Asteroid`, `Ship`, `Particle` y `PowerUp`. Dos cambios respecto al original,
   ambos obligados por no haber globales: `draw()` recibe el `ctx` por parámetro,
   y `Ship.update()` recibe `(dt, input, hyperActive)` en vez de leer `keys` y
   `hyperTimer` del módulo. La física y los trazos no cambian.
   Verificación: `npx tsc --noEmit` pasa.

5. **Montar el ciclo de vida.** `lib/games/asteroids/index.ts` exporta
   `asteroidsGame: GameMount` con `world: { width: 800, height: 600 }`. Su
   `mount()` crea el estado `Run` en el closure, engancha la entrada y devuelve el
   `GameHandle`: `start`, `pause`, `resume`, `restart` y `destroy`. El bucle de
   `requestAnimationFrame` ya corre, con el `dt` recortado a 0,05 s del original,
   pero `update` y `draw` están vacíos. `destroy()` cancela el frame pendiente,
   desengancha la entrada y es idempotente.
   Verificación: `npm run build` pasa.

6. **Implementar `update(dt)`.** Portar el `update` del original entero: fases
   `playing` / `dead` / `gameover`, temporizadores de power-ups, disparo, física,
   las tres colisiones (bala-asteroide, nave-power-up, nave-asteroide), los drops
   y el paso de nivel. Dos ajustes: `onState` se llama solo cuando cambia alguna
   de las tres cifras, y al entrar en `gameover` se llama `onGameOver(score)` una
   sola vez y el bucle se detiene, en lugar de esperar a ESPACIO.
   Verificación: `npx tsc --noEmit` pasa.

7. **Implementar `draw()`.** Portar el dibujo: fondo, partículas, asteroides,
   balas, power-ups, escudo y nave, más las barras de power-up activo
   (`HYPER` / `SLOW` / `SHIELD` / `TRIPLE`). **No se portan** `drawHUD` en su parte
   de `SCORE` / `NIVEL` / iconos de vidas, ni `drawOverlay`: eso lo pinta React.
   Verificación: `npm run build` pasa.

8. **Ampliar el catálogo.** Los cuatro archivos van juntos porque el tipo lo exige:
   entrada `asteroids` al final de `GAMES` en `lib/games.ts`, sus diez semillas en
   `SEED_ROWS`, `DEMO_RUN` pasa a `Partial<Record<GameId, DemoRun>>`, y
   `PlayCabinet` deja de asumir que hay demo: si no hay `run`, el HUD sale a cero
   y el botón `SIMULAR FIN DE PARTIDA` no se pinta.
   Verificación: `/biblioteca` muestra nueve tarjetas, `/juego/asteroids` y
   `/jugar/asteroids` cargan sin error, y las ocho máquinas viejas se ven igual.

9. **Registrar el motor.** `lib/games/engines.ts` con
   `export const ENGINES: Partial<Record<GameId, GameMount>> = { asteroids: asteroidsGame }`.
   Verificación: `npm run build` pasa.

10. **Escribir `GameCanvas`.** `components/game-canvas.tsx`, cliente. Crea el
    `<canvas>` con el tamaño lógico de `world` multiplicado por
    `devicePixelRatio`, aplica el `aspect-ratio` de `world` por estilo, monta el
    motor en un `useEffect` y llama a `destroy()` al limpiar. Los callbacks se
    guardan en una `ref` para que un re-render del padre no remonte el motor.
    Verificación: `npm run build` pasa; nadie lo usa todavía.

11. **Conectar el juego al gabinete.** En `PlayCabinet`, si `ENGINES[game.id]`
    existe, se pinta `GameCanvas` en lugar de `GamePreview` y el HUD lee el estado
    que llega por `onState` en vez de `DEMO_RUN`. El botón de simular no aparece.
    Verificación: `/jugar/asteroids` se juega con el teclado y PUNTUACION, VIDAS y
    NIVEL cambian de verdad. `/jugar/rocas` sigue exactamente como antes.

12. **Pausa real.** PAUSA llama a `handle.pause()` y SEGUIR a `handle.resume()`;
    el superpuesto `EN PAUSA` que ya existe se reutiliza. La partida se pausa sola
    al ocultarse la pestaña (`visibilitychange`) y al perder el foco la ventana,
    para no volver con quince segundos de asteroides encima.
    Verificación: en pausa el canvas se congela, el teclado no mueve la nave y
    cambiar de pestaña deja la partida detenida al volver.

13. **Fin de partida real.** `onGameOver(score)` abre el `GameOverOverlay` que ya
    existe con la puntuación real; GUARDAR PUNTUACION llama
    `addScore("asteroids", nombre, score)`; JUGAR DE NUEVO llama `handle.restart()`
    en vez de simular una recarga.
    Verificación: perder las tres vidas abre el superpuesto, guardar mete la marca
    en `/salon` y en la tabla de `/juego/asteroids`, y JUGAR DE NUEVO empieza de
    cero sin recargar la página.

14. **Mando funcional.** Los botones del D-pad llaman `press()` / `release()` de
    la entrada compartida en `pointerdown` / `pointerup` / `pointercancel` y
    también al salir el puntero del botón. `↓` se pinta deshabilitado y atenuado
    en esta máquina, porque Asteroids no lo usa. En las ocho máquinas sin motor el
    mando sigue siendo decorativo.
    Verificación: en un móvil o con el ratón se puede girar, empujar y disparar sin
    tocar el teclado, y mantener pulsado mantiene la acción.

15. **Dibujar la miniatura.** `case "asteroids"` en `lib/preview-art.ts` con su
    escena vectorial: nave y dos o tres rocas irregulares, al estilo de las demás.
    Verificación: la tarjeta de `/biblioteca` y la ficha de `/juego/asteroids`
    muestran una escena propia, no la del `default`.

16. **Documentar en `CLAUDE.md`.** Apartado corto: dónde está el contrato, que el
    bucle no vive en React y nunca provoca un render por frame, cómo se añade un
    motor nuevo (implementar `GameMount` y registrarlo en `engines.ts`), y que las
    ocho máquinas simuladas siguen con `DEMO_RUN`.
    Verificación: el apartado existe y nombra `lib/games/engine.ts`,
    `lib/games/engines.ts` y `components/game-canvas.tsx`.

## Criterios de aceptación

**Contrato y motor**

- [x] Existen `lib/games/engine.ts`, `lib/games/input.ts`, `lib/games/engines.ts`,
      `components/game-canvas.tsx` y los cuatro archivos de `lib/games/asteroids/`.
- [x] `lib/games/asteroids/` no importa nada de `react`, `next` ni de `@/components`.
- [x] `grep -n "^let \|^var \|^const .*=" lib/games/asteroids/index.ts` no muestra
      estado de partida en el ámbito de módulo: todo vive dentro de `mount()`.
- [x] Montar el juego dos veces y destruirlo dos veces no deja ningún
      `requestAnimationFrame` vivo ni ningún listener enganchado en `window`.
- [x] `ENGINES` tiene exactamente una entrada, `asteroids`.

**La máquina nueva**

- [x] `/biblioteca` muestra nueve tarjetas y la novena es `ASTEROIDS`, la última.
- [x] `/juego/asteroids` y `/jugar/asteroids` responden 200; `/juego/rocas` y
      `/jugar/rocas` siguen respondiendo 200.
- [x] La tabla de `/juego/asteroids` arranca con diez semillas, la mayor por
      debajo de 10.000.
- [x] La ficha de `/juego/asteroids` nombra los cinco potenciadores.
- [x] La tarjeta y la ficha muestran una miniatura propia, distinta de la que
      pinta el `default` de `preview-art.ts`.

**Jugabilidad**

- [x] `←` y `→` giran la nave, `↑` la empuja con inercia y `ESPACIO` dispara.
- [x] La nave sale por un borde y entra por el opuesto; los asteroides también.
- [x] Un asteroide grande se parte en dos medianos y cada mediano en dos pequeños.
- [x] Destruir un asteroide suma 20, 50 o 100 puntos según sea grande, mediano o
      pequeño.
- [x] Limpiar la pantalla sube de nivel y repuebla el campo con más asteroides.
- [x] Chocar sin escudo resta una vida, muestra la explosión y reaparece la nave
      parpadeando e invulnerable.
- [x] Los cinco potenciadores aparecen y funcionan: triple abre el abanico de tres
      balas, escudo absorbe un impacto y se consume, cámara lenta frena solo a los
      asteroides, hiperpropulsión acelera la nave y la bomba nova limpia la
      pantalla puntuando cada asteroide.
- [x] Con un potenciador activo se ve su barra en el canvas, y solo esa.
- [x] El canvas **no** pinta `SCORE`, `NIVEL` ni los iconos de vidas.

**HUD, pausa y fin de partida**

- [x] PUNTUACION, VIDAS y NIVEL del HUD coinciden en todo momento con la partida.
- [x] El HUD no se actualiza en frames donde ninguna de las tres cifras cambia.
- [x] PAUSA congela el canvas, muestra `EN PAUSA` y deja el teclado sin efecto;
      SEGUIR reanuda en el mismo punto.
- [x] Cambiar de pestaña pausa la partida sola, y al volver sigue pausada.
- [x] Perder la tercera vida abre `FIN DEL JUEGO` con la puntuación real de la
      partida, y el bucle se detiene.
- [x] `ESPACIO` en el fin de partida no reinicia nada: solo lo hacen los botones.
- [x] GUARDAR PUNTUACION mete la marca en `localStorage` y aparece en
      `/juego/asteroids` y en `/salon`; recargar la página la conserva.
- [x] JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas y nivel 1 sin recargar la página.

**Mando**

- [x] Con el ratón o el dedo, `←` `↑` `→` y `FUEGO` controlan la nave sin tocar el
      teclado, y mantener pulsado mantiene la acción.
- [x] Soltar el botón, sacar el puntero de él o cancelar el gesto suelta la tecla:
      la nave nunca se queda girando sola.
- [x] En `/jugar/asteroids` el botón `↓` se ve deshabilitado.
- [x] En `/jugar/rocas` los cinco botones siguen siendo decorativos.

**Nada más se ha movido**

- [x] `npm run build` y `npx tsc --noEmit` terminan sin errores.
- [x] `npm run lint` no añade avisos nuevos.
- [x] `lib/storage.ts`, `lib/session.tsx` y `lib/supabase/` no tienen ni una línea
      modificada.
- [x] Los ocho ids, títulos, textos y semillas que ya existían están intactos:
      `git diff` sobre `lib/games.ts` y `lib/scores.ts` solo añade líneas.
- [x] `/jugar/rocas` conserva su escena congelada, su HUD de `DEMO_RUN` y su botón
      `SIMULAR FIN DE PARTIDA`.
- [x] `references/started-games/02-asteroids/` no tiene ningún cambio.
- [x] Las flechas y `ESPACIO` solo dejan de hacer scroll dentro de
      `/jugar/asteroids` con la partida activa; en el resto del sitio, y en esa
      misma pantalla en pausa o con la partida terminada, la página se desplaza
      con normalidad.

**Documentación**

- [x] `CLAUDE.md` tiene un apartado que nombra `lib/games/engine.ts`,
      `lib/games/engines.ts` y `components/game-canvas.tsx`, y explica cómo se
      añade un motor nuevo.

## Decisiones tomadas y descartadas

**Arquitectura**

- **Sí:** contrato genérico (`lib/games/engine.ts`) ya, con un solo motor que lo
  cumpla. `references/started-games/` tiene dos juegos más esperando; descubrir el
  contrato al tercero significa reescribir los dos primeros.
- **Sí:** motor en TypeScript puro, sin importar `react`. El bucle corre a 60 fps y
  el estado de React no; mezclarlos convierte cada frame en un render.
- **No:** el bucle dentro de un componente con hooks. Es lo primero que se
  intenta y lo primero que se rompe: `useEffect` con dependencias mal puestas
  remonta el juego, y `useState` por frame lo hunde.
- **Sí:** `mount()` devuelve un `GameHandle` con métodos imperativos. Un motor de
  juego es estado mutable a 60 fps; fingir que es declarativo no ayuda a nadie.
- **Sí:** `lib/games/input.ts` compartido, aunque hoy tenga un solo consumidor. La
  captura de teclado es idéntica en los tres juegos y es donde vive el bug del
  scroll secuestrado: se arregla una vez.
- **Sí:** `world` estático en el `GameMount`, no derivado del canvas. Tetris es
  vertical y Arkanoid apaisado; que cada motor declare su mundo evita que el
  gabinete lleve tamaños a mano.

**La máquina nueva**

- **Sí:** `asteroids` entra como novena máquina y las ocho simuladas no se tocan.
  Renombrar `rocas` habría arrastrado `GameId`, `SEED_ROWS`, `DEMO_RUN`,
  `preview-art.ts`, las marcas guardadas en `localStorage` y dos URLs, todo para
  que un juego nuevo cupiera en un hueco que no era suyo.
- **No:** renombrar los ocho ids a los nombres reales de los juegos. Cada
  renombrado viaja con la spec que implemente ese juego, no antes.
- **Sí:** `rocas` sigue jugable-de-mentira y visible. Convivirá con `ASTEROIDS`
  siendo casi lo mismo, y es un precio aceptable por no tocar lo que ya funciona.
- **Sí:** última posición en `GAMES`. Añadir al final no reordena ninguna tarjeta
  existente en la portada ni en la biblioteca.
- **Sí:** acento amarillo `#f5ff00`. `rocas` ya es cian y van a estar cerca.
- **Sí:** semillas en el rango 1.500–9.000. Las de `rocas` llegan a 31.200, cifra
  que una partida real no alcanza: copiarlas habría dejado un top 10 al que nadie
  puede entrar, que es peor que no tener tabla.

**Fidelidad al original**

- **Sí:** los cinco power-ups se conservan con sus valores exactos. El juego está
  equilibrado; retocar constantes «de paso» es la forma más rápida de desafinarlo.
- **Sí:** vectores blancos sobre negro, como el arcade original. El neón lo pone
  el gabinete que ya rodea al canvas, y los power-ups ya traen sus cinco colores.
- **No:** repintar nave y asteroides en la paleta del vault. Se gana coherencia de
  marca y se pierde lo único que hace que Asteroids parezca Asteroids.
- **Sí:** mundo lógico de 800×600 escalado al contenedor. Reescalarlo a cuadrado
  obligaba a reafinar quince constantes de física a ojo.

**La frontera con React**

- **Sí:** `onState` solo cuando cambia alguna de las tres cifras. La puntuación
  cambia unas pocas veces por segundo; emitir cada frame son 60 renders/s regalados.
- **Sí:** el fin de partida lo pinta React, no el canvas. El `GameOverOverlay` ya
  existe y ya sabe guardar la marca; dejar además el `GAME OVER` de canvas debajo
  son dos carteles superpuestos.
- **Sí:** se quita el reinicio con `ESPACIO` del original. En el vault el reinicio
  es un botón, y `ESPACIO` es la tecla de disparar: reiniciar sin querer al morir
  sería lo normal, no la excepción.
- **Sí:** el canvas solo conserva las barras de power-up. `SCORE`, `NIVEL` y las
  vidas ya están en el HUD de React a veinte píxeles; duplicarlas parece un error.
- **No:** quitar el HUD de React y dejar el de canvas. Habría desmontado una pieza
  de SPEC 01 que las otras ocho máquinas siguen usando.
- **Sí:** pausa automática al ocultar la pestaña. Sin ella se vuelve a la pestaña
  con la partida ya perdida.

**Entrada**

- **Sí:** listeners en `window`, enganchados solo mientras hay partida activa.
- **No:** canvas con `tabIndex` y captura solo con foco. Es más correcto en
  accesibilidad, pero obliga a hacer clic en el canvas antes de poder jugar, y eso
  no se descubre solo.
- **Sí:** `preventDefault` únicamente de las cuatro flechas y `Space`, y solo
  mientras la entrada está enganchada. El original lo hace siempre y secuestra el
  scroll de la página entera.
- **Sí:** mando táctil funcional inyectando las mismas teclas. Sin él, el juego es
  injugable en móvil y media biblioteca del vault se visita desde el teléfono.
- **Sí:** `↓` deshabilitado y atenuado en esta máquina. Asteroids no lo usa;
  esconderlo habría descuadrado la rejilla de cinco botones del gabinete.
- **No:** reasignar `↓` a un freno. No existe en el original y la inercia sin
  frenos es justamente el juego.

**Puntuación**

- **Sí:** `addScore("asteroids", nombre, score)` en `localStorage`, mismo circuito
  que las marcas simuladas. Es la persistencia que hay hoy.
- **No:** guardar la marca en Supabase. SPEC 04 dejó el cable puesto y ni una
  tabla; el esquema entra en su propia spec y entonces migran las nueve máquinas
  a la vez, no esta sola.
- **No:** validar la puntuación en servidor. El motor corre en el navegador y la
  cifra es falsificable desde la consola. Con las marcas viviendo en el
  `localStorage` de cada uno, no hay nada que proteger todavía.

## Riesgos

| Riesgo                                                                                                                                                                                      | Mitigación                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React en modo estricto monta los efectos dos veces en desarrollo. Un `destroy()` que no cancele el frame pendiente deja dos bucles corriendo y el juego va al doble de velocidad.           | `destroy()` es idempotente y cancela el `requestAnimationFrame` guardado antes de desenganchar la entrada. Hay un criterio de aceptación que lo comprueba montando y destruyendo dos veces.                              |
| El `preventDefault` de las flechas y `ESPACIO` secuestra el scroll de todo el sitio si la entrada no se desengancha.                                                                        | La entrada solo está enganchada mientras la partida corre: al pausar, al terminar y al desmontar se suelta. Un criterio de aceptación comprueba el scroll fuera de `/jugar/asteroids` y dentro con la partida detenida.  |
| `PlayCabinet` re-renderiza en cada `onState` —varias veces por segundo— y remonta `GameCanvas`, reiniciando la partida sola.                                                                | Los callbacks viven en una `ref` dentro de `GameCanvas` y el `useEffect` que monta depende solo del `GameMount`, que es una constante de módulo. El síntoma sería inconfundible: la partida se reinicia al primer punto. |
| En un móvil con `devicePixelRatio` 3, el buffer del canvas sería de 2400×1800 y el relleno de fondo por frame se come el presupuesto.                                                       | El multiplicador se recorta a 2. Por encima de ahí no se distingue nada en un canvas vectorial y sí se nota en fotogramas.                                                                                               |
| El rango de semillas (1.500–9.000) es una estimación hecha sobre el papel. Si la partida real puntúa muy por encima o muy por debajo, el top 10 queda inalcanzable o se llena a la primera. | Se ajusta la tabla de `SEED_ROWS`, nunca las constantes del juego. Es un array de diez pares en un archivo, y el equilibrio del original no se toca.                                                                     |
| Ampliar `GameId` rompe algún consumidor exhaustivo que no está a la vista. Los conocidos son `SEED_ROWS` y `DEMO_RUN`; `preview-art.ts` se salva porque tiene `default`.                    | El paso 8 los cambia juntos y `npx tsc --noEmit` es quien decide si falta alguno: un `Record<GameId, ...>` incompleto no compila.                                                                                        |
| La partida se juega en el navegador, así que la puntuación se puede falsificar desde la consola.                                                                                            | Aceptado. Las marcas viven en el `localStorage` de cada dispositivo y no hay nada compartido que proteger. Cuando el salón sea real, la validación entra con la spec que lo haga.                                        |

## Lo que **no** entra en esta spec

- Motores para las ocho máquinas simuladas. Tetris y Arkanoid tienen su carpeta en
  `references/started-games/` y esperan su propia spec.
- Renombrar los ids existentes. `rocas` sigue siendo `rocas`.
- Guardar las marcas en Supabase.
- Validar la puntuación en servidor o cualquier medida antitrampas.
- Sonido, música y vibración.
- Guardar la partida en curso para reanudarla después.
- Niveles de dificultad, controles reconfigurables y power-ups nuevos.
- Rediseñar el gabinete, el HUD o los superpuestos.
- Tests.

Cada una de esas, si llega, va en su propia spec.
