# Cómo se optimiza un motor

La receta de la Fase 6: cómo se mide un motor y con qué patrón se arregla cada hallazgo. **Se lee
justo antes de tocar código, no antes.**

Existe porque el agente optimiza **un motor por invocación** y los cinco comparten el mismo
esqueleto de bucle, copiado a mano de uno a otro. Si cada ronda improvisara su propia solución, el
repo acabaría con cinco formas distintas de agrupar un halo y la sexta máquina no sabría cuál
copiar. Aquí está decidido de antemano, y por eso la Fase 6 es mecánica.

**Lo que manda es lo que hay en disco.** Los patrones de abajo no son ideas: los cuatro primeros
son líneas concretas de este repo que ya funcionan, escritas en un motor y sin aplicar en los
otros. Se copian.

---

## El reparto: qué es de un motor y qué es de todos

| Alcance  | Archivos                                                                            | Cuándo se escribe                  |
| -------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| De uno   | `lib/games/<juego>/` entero: `index.ts`, `entities.ts`, `constants.ts`, `board.ts`… | Cada vez que optimizas uno         |
| De todos | `lib/games/engine.ts`, `lib/games/input.ts`, `lib/games.ts`                         | **Nunca en esta ronda.** Ver abajo |
| Fuera    | `components/`, `app/`, `lib/games/<juego>/skins.ts`                                 | Nunca. Se anota `fuera-de-alcance` |

**`lib/games.ts` es la trampa de este agente.** Ahí viven `tint()` (`:113`), `glow()` (`:131`) y
`noGlow()` (`:143`), que son las tres primitivas que los cinco motores llaman dentro de su bucle,
y la tentación de «arreglarlo en el origen» —cachear `tint()` con un `Map`, por ejemplo— es
enorme. **No se toca.** Tres motivos: una caché global es estado mutable de módulo, que es
justo lo que el contrato prohíbe; crecería sin tope con las cadenas de alfa variable de
`asteroids/entities.ts:341`; y un cambio ahí toca las cinco máquinas a la vez, que es lo contrario
de una ronda por motor. La cadena se precomputa **en el motor**, al fijar la paleta, que es donde
se sabe cuántas hacen falta.

Y `lib/games/<juego>/skins.ts` tampoco: es de `skin-designer`. Si una optimización necesita un
campo nuevo en la paleta, se para y se cuenta. Un hex nuevo en un archivo de piel es un cambio
visual, y aquí no se hace ninguno.

---

## P1 · El instrumento

**No entra en el repo.** Se inyecta con `javascript_tool` sobre la página ya servida y desaparece
al cerrar la pestaña. El motivo es R10: un contador de FPS dentro de `lib/games/` acabaría
emitiendo por frame hacia el HUD, y sesenta `setState` por segundo sobre las 770 líneas de
`PlayCabinet` cuestan más que todo lo que esta ronda pueda ganar. Además sería código de
producción que nadie encargó, en el bundle de todos, y habría que mantenerlo sincronizado con
cinco motores.

**El parche.** Envuelve `requestAnimationFrame` y mide dos cosas distintas: `cb`, lo que tarda el
callback —que en estos motores **es** `update` + `draw` + `emitState`, porque el bucle entero vive
ahí— y `gap`, el intervalo entre frames, que es lo que delata un frame doblado. Los motores
reprograman su bucle con una llamada nueva cada frame, así que el parche entra en vigor al frame
siguiente sin remontar nada:

```js
(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const cb = [],
    gap = [];
  let last = null;
  window.__perf = { cb, gap, stop: () => (window.requestAnimationFrame = raf) };
  window.requestAnimationFrame = (fn) =>
    raf((ts) => {
      if (last !== null) gap.push(ts - last);
      last = ts;
      const a = performance.now();
      fn(ts);
      cb.push(performance.now() - a);
    });
  return "medidor puesto";
})();
```

**El resumen**, que se lee cuando ha pasado la ventana de medición. Descarta los dos primeros
segundos —120 frames— porque el JIT, la primera composición y la primera pintada de cada entidad
ensucian el arranque, y eso ya está dicho en el presupuesto:

```js
(() => {
  const { cb, gap } = window.__perf;
  const CUT = 120;
  const c = cb.slice(CUT).sort((x, y) => x - y);
  const g = gap.slice(CUT);
  const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
  const r = (n) => Math.round(n * 100) / 100;
  return {
    frames: c.length,
    p50: r(q(c, 0.5)),
    p95: r(q(c, 0.95)),
    peor: r(c.reduce((m, x) => (x > m ? x : m), 0)),
    doblados: g.filter((x) => x > 33).length,
    fps: r(1000 / (g.reduce((s, x) => s + x, 0) / g.length)),
  };
})();
```

Tres avisos que cuestan una ronda si se olvidan. **`cb` no es el frame entero**: fuera quedan la
composición del navegador y lo que React haga en ese hueco, así que un `cb` de 4 ms con `fps` de
41 significa que el tiempo se va en otro sitio y el hallazgo no está en el motor. **`gap` sólo
vale con la pestaña visible**, y eso tiene un apartado propio aquí abajo porque es el fallo que se
come la ronda entera. Y **el medidor sobrevive a la navegación dentro de la SPA pero no a un
`navigate` completo**: se vuelve a poner después de cargar la página, nunca antes.

### La pestaña tiene que estar delante, y no basta con abrirla

**Es la trampa número uno de este agente, y está comprobada en esta máquina.** Una pestaña abierta
por el MCP de Chrome puede quedar con `document.visibilityState === "hidden"` —porque la ventana
de Chrome está detrás de otra aplicación, o porque la pestaña no es la activa de su ventana—, y
entonces pasan **dos** cosas a la vez, las dos silenciosas:

1. El navegador **no dispara `requestAnimationFrame`** en una pestaña oculta, o lo baja a 1 Hz.
2. `PlayCabinet` **pausa la partida** con `visibilitychange` y `blur`, así que aunque lo disparara,
   no habría nada que medir.

El resultado no es un error: es un resumen con `frames: 0`, `p95: null` y `doblados: 0`, que leído
deprisa parece un motor rapidísimo. **Se comprueba antes de medir y no después**, y por eso el
parche de arriba y el guion de abajo empiezan los dos por lo mismo:

```js
if (document.visibilityState !== "visible") throw new Error("pestaña oculta: la medición no vale");
```

Si salta, **la ventana de Chrome se trae al frente y la pestaña se hace activa**. Un `screenshot`
la despierta sólo mientras dura la captura, que no llega para veinte segundos. Y automatizarlo por
AppleScript —`tell application "Google Chrome" to activate`— **no es de fiar**: en esta máquina
Chrome agota el tiempo del evento Apple (`-1712`) y el comando se cuelga hasta que alguien acepta
un diálogo de permisos del sistema. Así que la salida es la barata: **se le pide al usuario que
ponga esa ventana de Chrome delante y la deje ahí durante la medición**, en una línea, y se
continúa cuando conteste. No es una degradación como la de «el MCP no está conectado»: aquí las
herramientas funcionan, lo que falta es el primer plano de un escritorio que no es tuyo.

## P2 · El escenario, que es lo que hace comparables dos rondas

Una medición sin escenario escrito no se puede repetir, y R11 pide repetirla. El escenario es
siempre el mismo y se anota en la columna `escenario` del ledger:

1. **Servidor**: `npm run dev`. Si ya hay uno en el 3000, se reutiliza; nunca se levanta un
   segundo.
2. **Página**: `navigate` a `http://localhost:3000/jugar/<juego>`, ventana a **1280×900**. Siempre
   el mismo tamaño: el canvas se escala por CSS y un marco más grande pinta más píxeles.
3. **Esperar la carga**: el superpuesto dura `LOAD_MS = 750` y la partida **no arranca hasta que
   termina** (`components/play-cabinet.tsx:162`). Se esperan 1,5 s largos.
4. **Piel**: la de la medición. Se elige con un clic en su botón del gabinete —`play-cabinet.tsx:553`—
   y se persiste sola en `localStorage`, así que en la segunda vuelta ya viene puesta. **Se mide
   la más cara**, que es la que enciende el halo: `neon` en los cinco motores hoy.
5. **Poner el medidor** (P1). Después de elegir la piel, nunca antes: cambiar de piel no remonta
   el motor, pero sí repinta.
6. **Arrancar la partida** con la tecla que le toque a la máquina, y jugar el guion de abajo.
7. **20 segundos** de reloj, y leer el resumen.

**Las teclas se inyectan y funcionan.** `createInput()` engancha `keydown`/`keyup` en `window` y
lee **`e.code`** (`lib/games/input.ts:47-54`), así que un evento sintético es indistinguible de un
dedo:

```js
const tap = (code, ms = 90) => {
  const ev = (type) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  ev("keydown");
  setTimeout(() => ev("keyup"), ms);
};
```

El guion por máquina, que busca **el caso caro y no el bonito**:

| Motor       | Arranque | Guion de los 20 s                                                                                                            |
| ----------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `asteroids` | —        | `ArrowUp` mantenido y `Space` cada 200 ms: llena la pantalla de balas, rocas partidas y partículas                           |
| `tetris`    | —        | `ArrowLeft`/`ArrowRight` alternos y `ArrowDown` mantenido. **Se mide con el tablero medio lleno**, que es el peor caso de R4 |
| `arkanoid`  | `Space`  | `ArrowLeft`/`ArrowRight` alternos, con el primer nivel entero de bloques en pantalla                                         |
| `snake`     | `Space`  | Giros cada 600 ms. Ojo con R5: el mundo sólo avanza cada `tickFor(nivel)` ms y se dibuja a 60 fps                            |
| `frogger`   | `Space`  | `ArrowUp` cada 700 ms. El coste no depende de la rana sino de los carriles, que corren solos                                 |

**El peor caso importa más que el caso medio.** Tetris con el tablero vacío pinta 0 celdas y pasa
R1 sobrado; con el tablero medio lleno pinta 250 y es donde está el hallazgo. Si el guion no llega
a ese estado en 20 s, se alarga la ventana y se dice en `notas`.

---

## P3 · Los cinco patrones, uno por clase de hallazgo

Cada fallo tiene su patrón, y **no se improvisa otro**. Si un hallazgo no encaja en ninguno de los
cinco, es que la receta se queda corta: se para y se cuenta.

### P3.1 · Un valor de paleta recalculado por entidad → izarlo

El patrón ya está escrito en este repo, dos veces: `arkanoid/entities.ts:350` resuelve el radio
del halo **antes** del bucle de bloques con `const blur = p.glow ? glowSpread(p) : 0;`, y
`snake/entities.ts:192` hace lo mismo. Lo que falta es aplicarlo en los otros diez sitios:
`tetris/board.ts:157` —el peor, dentro de `drawCell`—, los diez de `asteroids/entities.ts` y
`arkanoid/entities.ts:367,374`.

Se iza al sitio donde la paleta se fija, no a una variable de módulo: **en el ámbito de módulo de
un motor no hay ni una variable mutable**, y esa propiedad no se negocia por un milisegundo. Si el
valor depende sólo de la piel, su sitio es junto a la paleta activa, dentro del closure de
`mount()`, recalculado en `setSkin()`.

### P3.2 · Una cadena `rgba` por frame → precomputarla al fijar la piel

Mismo sitio y mismo momento que P3.1: donde el motor guarda su paleta activa, guarda también las
cadenas que salen de ella. `tint(p.gloss, 0.12)` de `tetris/board.ts:162` es una constante
disfrazada; los seis `tint(p.X, ALPHA_Y)` de `frogger/entities.ts` también, porque los `ALPHA_*`
son constantes de `constants.ts`.

**El caso con alfa variable es distinto y es uno solo**: `asteroids/entities.ts:341`,
`tint(p.particle, Number(alpha.toFixed(2)))`. Ese alfa cambia con el desvanecido de la partícula,
así que no hay una cadena sino unas cien —y el `toFixed(2)` que ya está ahí demuestra que alguien
quiso cuantizarlo—. Se resuelve con una tabla indexada por el alfa cuantizado, construida al fijar
la piel. **No se cambia el número de decimales**: eso movería el degradado y sería R12.

### P3.3 · Lo estático repintado → un path, y sólo después un canvas

Dos escalones, y **se prueba el primero antes del segundo**.

El primero es agrupar en un solo path, y el patrón está en `snake/index.ts:264-277`: 43 líneas de
rejilla con **un `beginPath`, muchos `moveTo`/`lineTo` y un `stroke`**. Aplicado a
`tetris/index.ts:333-348` convierte 28 paths en uno. Es barato, no añade estado, y suele ser el
90% de la ganancia.

El segundo es un canvas auxiliar, y sólo si el primero no basta —el caso candidato es Frogger, con
sus ~125 `fillRect` de línea de carril más el agua, el asfalto y los bancos de
`index.ts:456-471`—. Se crea con `document.createElement("canvas")` dentro de `mount()`, se pinta
una vez y se vuelca con un `drawImage` por frame. Tres condiciones, y las tres son obligatorias:
vive en el closure, **se repinta en `setSkin()`** —una capa cacheada con los colores de la piel
anterior es un fallo visual, que es peor que uno de rendimiento— y se dimensiona en coordenadas
lógicas, porque `GameCanvas` ya dejó aplicada la matriz de `devicePixelRatio` en el contexto
principal y el auxiliar no la hereda.

### P3.4 · Un halo conmutado por entidad → agrupar por lote

El hallazgo grande, y el que menos se parece a un `Edit` mecánico. La forma:

1. **Separar el recorrido en dos pasadas** cuando las entidades del lote comparten color: una con
   el halo encendido para las que lo llevan, y `noGlow()` una sola vez al final.
2. **Ordenar por color** cuando no lo comparten, de manera que `shadowColor` cambie una vez por
   grupo y no una por entidad.
3. **Sacar del bucle el `if (p.glow)`**: si la piel no lleva halo, el bucle entero se pinta sin
   tocar `shadowBlur` ni una vez, y ése es el camino de `clasico`.

En Tetris el lote natural son las celdas del tablero, que en `board.ts` se pintan con el color de
su pieza: son siete colores como mucho, así que ordenar por color deja siete conmutaciones por
frame en vez de doscientas cincuenta. En Asteroids el lote natural son las partículas, que
comparten color dentro de una explosión.

**Lo que no se hace es apagar el halo.** Eso arregla R4 de un plumazo y deshace el trabajo de
`skin-designer`: es R12.

### P3.5 · Basura por frame → compactar en el sitio, y topes en `constants.ts`

Para las colecciones: un barrido con dos índices en vez de `filter`, que reutiliza el array y no
crea closure.

```ts
let n = 0;
for (let i = 0; i < r.bullets.length; i++) {
  const b = r.bullets[i];
  if (!b.dead) r.bullets[n++] = b;
}
r.bullets.length = n;
```

Sustituye los dos `filter` de `asteroids/index.ts:261-262`. Para `positions(t)` de
`frogger/entities.ts:150-158`, que construye un array nuevo en cada una de sus tres llamadas por
frame, un buffer por carril creado en el constructor y rellenado en el sitio; el método sigue
devolviéndolo, y quien lo recibe **no lo guarda**, que es la única condición.

Para el tope de R9: una constante nueva en `lib/games/asteroids/constants.ts` —`MAX_PARTICLES`— y
la política de descarte escrita al lado. Es la **única** constante que esta ronda puede añadir, y
se declara en el ledger y en el cierre, porque es lo único que un humano tiene que mirar con sus
ojos.

---

## P4 · La verificación, y no es opcional

Ocho pasos. Los tres primeros van **antes** de tocar nada, para que exista un «antes» contra el
que comparar; sin eso R11 no se puede cumplir y ningún hallazgo se puede cerrar.

**V0 · El servidor.** `npm run dev`. Si ya hay uno en el 3000, se reutiliza.

**V1 · Las tres puertas.** `npx tsc --noEmit`, `npm run lint` y `npm run build`, en ese orden y
antes de mirar nada en el navegador: **una medición de una página que no compila es una mentira
con dos decimales.**

**V2 · El «antes».** El escenario de P2 entero, con la piel más cara, y su fila en la tabla de
Mediciones. Sin este paso el arreglo se diseña a ciegas.

**V3 · La segunda piel.** La misma medición con `clasico`, que en varios motores apaga el halo y
por tanto no pasa por R4. Es lo que separa «el motor es caro» de «el halo es caro», y las dos
cosas se arreglan distinto.

**V4 · El «después».** Mismo motor, misma piel, mismo escenario, misma duración. Se compara contra
V2 y **se escriben los dos números en la misma fila**. Si el después no mejora, el arreglo se
revierte y el hallazgo pasa a `aceptado` con la medida en `notas`: complejidad que no paga es
deuda.

**V5 · El equilibrio, que es R12.** `git diff lib/games/<juego>/constants.ts` tiene que salir
**vacío**, salvo el tope de R9 si esta ronda lo introdujo. Y `git status --short` no enseña ni un
archivo que no estuviera previsto: nada de `components/`, nada de `app/`, nada de `skins.ts`.

**V6 · Las tres pieles dibujan.** Una captura por piel, comparada contra la de antes. Un motor
optimizado que se ve distinto es un `skin-designer` que nadie llamó. Aquí es donde se cazan las
capas cacheadas que no se repintaron en `setSkin()`.

**V7 · La frontera, que es R10.** `grep -n "onState\|cb\." lib/games/<juego>/index.ts` para
comprobar que `emitState()` sigue emitiendo por diferencia, y `grep -rn "from \"react\"\|from \"next" lib/games/`
para que siga sin devolver nada.

### Si el navegador no está

`javascript_tool` y `navigate` son del MCP de Chrome. Si no está conectado, **se dice en una línea
y se degrada**: la auditoría estática sigue valiendo —el inventario del camino caliente se saca
con `Grep` y aritmética, y así se levantó el inventario inicial de este ledger—. Lo que se pierde
es V2, V3 y V4 como **medida**, y eso se anota: los hallazgos entran con `coste` a `—` y **ningún
motor puede pasar a `optimizado`** con una verificación así.

### El teléfono, cuando lo haya

Es donde de verdad se decide si esto ha servido, y el agente no llega. Probar desde el aparato
exige que su IP de la red local esté en `allowedDevOrigins` de `next.config.ts`, que cambia de red
en red. **El agente no la edita**: lo dice, y lo hace quien tiene el teléfono delante.

---

## Tres cosas que no son negociables

- **Si `tsc`, `lint` o `build` fallan, se arregla en esta misma ronda.** No se reporta para luego.
  Dejar el repo sin compilar es peor que no haber empezado: el usuario se entera al hacer
  `npm run build`, no leyéndote.
- **Un arreglo que no mejora el número se revierte.** No se deja «porque es más limpio»: lo que
  queda entonces es un motor distinto sin motivo, y el motivo es la única cosa que esta ronda
  produce.
- **El juego se juega igual.** `constants.ts` sin diff, las tres pieles idénticas, el bucle con su
  forma. Un motor más rápido que se juega distinto es un motor roto.
