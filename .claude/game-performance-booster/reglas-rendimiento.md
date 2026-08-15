# Reglas de rendimiento

Qué es un motor optimizado en Arcade Vault, cuál es el presupuesto de un frame y las doce reglas
con las que el agente `game-performance-booster` valida un motor antes de darlo por bueno. **Se
lee en la Fase 0, y sin él la auditoría no tiene contra qué comparar.**

Ninguna regla es una opinión: cada una sale de un archivo del repo que la impone hoy, o de una
línea de este repo que la incumple hoy. Si algún día ese archivo cambia —`lib/games/engine.ts`
gana un campo, `tint()` deja de fabricar cadenas, alguien mete un segundo canvas—, cambia la
regla, y los hallazgos cerrados por ella se pueden reabrir.

**El alcance son los motores y nada más**: `lib/games/` y lo que de `lib/games.ts` se llama
desde dentro de un bucle. `components/game-canvas.tsx`, `components/play-cabinet.tsx` y
`components/game-pad.tsx` **no se tocan**, aunque tengan defectos de rendimiento reales y aunque
se vean desde aquí: se anotan en el ledger como `fuera-de-alcance`, con su ancla, y ahí se
quedan. Ampliar el alcance es una decisión, y las decisiones no se toman a mitad de un `Edit`.

Y son **cinco motores**: `asteroids`, `tetris`, `arkanoid`, `snake` y `frogger`. Los cinco
comparten el mismo esqueleto de bucle —copiado a mano de uno a otro—, así que **una regla vale
para los cinco** y un patrón que arregla uno suele arreglar los otros cuatro. Eso es una ventaja
y una trampa: la ventaja es que la receta es corta; la trampa es que optimizar el de al lado
«ya que estoy» es exactamente lo que este agente no hace.

---

## Qué es un motor optimizado

Un **hallazgo** es una discrepancia entre lo que una regla exige y lo que el código hace,
anclada en un `archivo:linea` concreto y, cuando la regla lo pide, con un número medido detrás.
No es una impresión: «Tetris va lento» no es un hallazgo; «`tetris/board.ts:157` llama a
`glowSpread()` dentro de `drawCell`, hasta 250 veces por frame» sí. Un hallazgo sin ancla no se
puede reconciliar en la ronda siguiente, y por eso no existe.

Un motor está **optimizado** cuando no le queda ningún hallazgo abierto **de los que el agente
sabe ver**, y su medición del después cabe en el presupuesto. Está **firmado** cuando alguien lo
ha jugado en un aparato de verdad y ha dicho que va fino. Los dos estados no son el mismo y la
distancia entre ellos está medida en «Qué firma esto y qué no».

**Un coste se mide en el navegador, no se deduce del código.** Es la diferencia con una ranura
de color, que se lee con un `Grep`: `shadowBlur` cuesta lo que cuesta según el tamaño de lo que
se pinta, la GPU y el navegador, y **la única fuente honesta es el reloj**. Leer el código sirve
para saber **dónde** mirar y para proponer el arreglo; nunca para afirmar cuánto se ganó.

Y una advertencia que vale por media auditoría: **la arquitectura de estos motores ya es buena**.
`requestAnimationFrame` puro, `dt` acotado con `MAX_DT`, cero React por frame, `emitState()`
emitiendo por diferencia sobre las tres cifras, `destroy()` idempotente. Lo que está mal repartido
es el **coste del dibujo** y la **basura por frame**. Este agente afina lo segundo sin tocar lo
primero: reescribir el bucle de un motor sano para ganar medio milisegundo es cambiar riesgo por
nada.

## El presupuesto

A 60 Hz un frame dura **16,7 ms**, y no son del motor: el navegador tiene que componer la página,
y en la pantalla de juego comparte hilo con React —que renderiza en cada flanco de tecla y en
cada cambio de puntuación—. El reparto que este repo da por bueno:

| Métrica       | Qué es                                                             | Umbral                                    |
| ------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| `cb` p50      | Lo que tarda el callback de `rAF` —o sea `update` + `draw`— típico | **≤ 4 ms**                                |
| `cb` p95      | El mismo coste en el 5% de frames peores                           | **≤ 8 ms**                                |
| `cb` peor     | El frame más caro de la medición, pasado el arranque               | **≤ 16 ms**                               |
| `gap` > 33 ms | Frames doblados: se ve como un tirón                               | **cero**, pasados los 2 primeros segundos |

Los cuatro se miden en **escritorio**, que es donde el agente puede medir. El motivo del margen
—8 ms de p95 sobre un presupuesto de 16,7— es que el aparato del usuario no es esta máquina: un
teléfono de gama media tarda del orden del doble a triple en el mismo trabajo de canvas, y ahí
`shadowBlur` escala peor que el resto. **El margen no es prudencia, es la única forma de decir
algo sobre un móvil desde un portátil.**

**Los dos primeros segundos no cuentan.** Compilación JIT, primera composición, el `LOAD_MS = 750`
de `PlayCabinet` y la primera pintada de cada entidad ensucian el arranque. La medición descarta
ese tramo y lo dice.

**Y el frame no es el único coste.** Un motor que cabe en 4 ms pero fabrica dos mil cadenas por
segundo pasa R1 y falla R7: el GC no aparece en el p95 de una medición de veinte segundos, aparece
en un tirón cada medio minuto en un teléfono con poca memoria. Por eso hay reglas de memoria, y
por eso no tienen umbral en milisegundos.

---

## Las doce reglas — R1 a R12

Se responden con «sí» o «no». **Un solo «no» deja el motor en `medido` o en `en-curso`, nunca en
`optimizado`**, con el motivo citando la regla y el ancla (`R4: tetris/board.ts:157 conmuta el
halo por celda`).

**Una sola pasada, y es eliminatoria.** No hay nota ponderada como en `rubrica.md`, y no es un
olvido: aquella pondera para **ordenar candidatos que compiten**, y su propio archivo lo dice.
Aquí no compite nadie —los cinco motores hay que medirlos todos— y una nota sería además dañina,
porque «Tetris saca 10 sobre 15» invita a publicar un motor que dobla frames. **No hay nota
parcial para un tirón.** Lo que sustituye a la función de ordenar es una lista fija, y está al
final de este archivo.

Los cinco bloques que siguen sólo ordenan la lectura. No puntúan.

---

### Presupuesto — R1, R2, R3

### R1 · El frame cabe en su presupuesto

**Pasa si** la medición del motor, en la piel más cara de las tres y descartados los dos primeros
segundos, cumple los cuatro umbrales de la tabla de arriba. **Falla si** incumple uno, aunque la
partida se vea fluida en la máquina donde se mide.

Ese «aunque» es la regla entera. La máquina donde corre el agente es un portátil de desarrollo
enchufado a la corriente; el usuario juega en un teléfono, con el navegador compartiendo hilo con
React y con la batería a media carga. **A 60 fps clavados en escritorio no le queda margen a
nadie.** El p95 de 8 ms es lo que traduce «va bien aquí» en «probablemente va bien allí».

La piel más cara es casi siempre `neon` o `retro`, porque son las que encienden el halo:
`clasico` deja `glow` en `false` en varios motores y se salta R4 entera. **Medir sólo `clasico` es
medir el caso fácil**, y por eso la medición lleva la piel en su fila del ledger.

### R2 · El bucle conserva su forma

**Pasa si** el motor sigue teniendo un solo `requestAnimationFrame` cancelable, su `dt` acotado
con `MAX_DT`, y el orden `update(dt)` → `draw()` → `emitState()` → `onGameOver` intacto. **Falla
si** una optimización cambia el orden, quita el tope de `dt`, o mete un paso fijo donde no lo
había.

Los cuatro puntos están en `.claude/skills/spec-game/engine-contract.md` como patrones no
negociables, y no son adorno. `MAX_DT` —`0.05` en Asteroids, Arkanoid y Frogger; `50` en Tetris,
que cuenta en ms— es lo que impide que volver a una pestaña dormida teletransporte la nave a
través de un asteroide. **Quitarlo mejora un número y rompe el juego.**

El orden importa por `emitState()`: emitir antes de `update` publica el estado del frame
anterior, y emitir después de `onGameOver` publica una puntuación que ya se ha firmado. Y el rAF
único es lo que hace que `destroy()` pueda cancelarlo: un `setInterval` suelto dentro de `mount()`
sobrevive al desmontaje y sigue corriendo detrás de una pantalla que ya no existe.

### R3 · Ningún reloj propio

**Pasa si** dentro de `mount()` no hay `setInterval`, ni `setTimeout` que reprograme trabajo de
partida, ni un segundo `requestAnimationFrame`. **Falla si** hay uno, aunque se limpie en
`destroy()`.

Es la hermana de R2 y va aparte porque es la tentación clásica al optimizar: sacar el dibujo de lo
estático a «cada 500 ms» con un `setInterval` parece barato y crea un segundo reloj que no está
pausado cuando el juego lo está. `PlayCabinet` pausa el motor con `pause()`; un temporizador que
el motor se guarda por su cuenta no se entera, y sigue pintando debajo del superpuesto de pausa.

El único `setTimeout` legítimo de esta pantalla vive fuera del motor, en `PlayCabinet`, y es el
`LOAD_MS = 750` de la carga.

---

### Dibujo — R4, R5, R6

### R4 · El halo se conmuta por lote, no por entidad

**Pasa si** cada `glow()` del motor cubre **todas** las entidades que comparten color y radio
antes del `noGlow()` que lo cierra. **Falla si** hay un par `glow`/`noGlow` dentro de un bucle que
recorre entidades.

**Es el hallazgo grande de este repo y la razón de que este agente exista.** `shadowBlur` es la
propiedad más cara de Canvas2D: cada cambio invalida el estado del contexto y obliga al navegador
a rehacer trabajo de composición para la primitiva siguiente. Hoy se conmuta por entidad en los
cinco motores, y el peor caso está en `lib/games/tetris/board.ts:157`, dentro de `drawCell`: con
la piel `neon` y el tablero medio lleno son del orden de **250 encendidos y 250 apagados por
frame** para pintar 250 cuadrados. Le siguen `frogger/entities.ts` con doce sitios,
`asteroids/entities.ts:346` —una por partícula viva, y las partículas no tienen tope— y
`snake/entities.ts:197`, una por segmento de la serpiente.

Agrupar no siempre se puede: si dos entidades del mismo lote llevan colores distintos, el
`shadowColor` cambia igual. Lo que **siempre** se puede es sacar del bucle lo que no depende de la
entidad, que es R6, y ordenar el dibujo por color para que los lotes salgan solos.

### R5 · Lo que no cambia no se repinta

**Pasa si** lo que se dibuja igual en todos los frames de una partida —rejillas, fondos, marcos,
bandas de carril, la fila de casas— se pinta una vez en un canvas auxiliar y se vuelca con un
`drawImage`. **Falla si** se reconstruye con primitivas en cada frame.

El caso es `lib/games/tetris/index.ts:333-348`: `drawGrid()` hace un `beginPath`+`stroke` **por
línea**, 9 verticales y 19 horizontales, **28 paths por frame** para una rejilla que no cambia
nunca. Le sigue Frogger, que repinta agua, asfalto, bancos y ~125 `fillRect` de línea discontinua
en `index.ts:456-471`, todo función de constantes.

Y el contraejemplo sano está en el propio repo: `lib/games/snake/index.ts:264-277` dibuja sus 43
líneas de rejilla con **un solo `beginPath`, un solo `stroke`**. Eso ya es el 90% de la ganancia
sin canvas auxiliar ninguno, y es el arreglo que se prefiere cuando cabe: **un path es más barato
de mantener que un canvas que hay que invalidar al cambiar de piel**.

El canvas auxiliar se reserva para lo que ni con un path sale barato, y **se invalida en
`setSkin()`**: una capa cacheada que conserva los colores de la piel anterior es un fallo visual,
que es peor que uno de rendimiento.

### R6 · El estado del contexto se fija una vez por lote

**Pasa si** `font`, `lineWidth`, `strokeStyle`, `globalAlpha` y el radio de halo se asignan una
vez por lote de entidades. **Falla si** se reasigna el mismo valor dentro de un bucle, o si se
recalcula por entidad algo que sólo depende de la paleta.

Dos casos, y los dos están medidos. Uno: `glowSpread(p)` sólo depende de la piel, y se llama
**dentro** del bucle en `tetris/board.ts:157` —hasta 250 veces por frame, y su cuerpo recorre seis
comparaciones—, en los diez sitios de `asteroids/entities.ts` y en `arkanoid/entities.ts:367,374`.
Dos: `ctx.font = "15px monospace"` en `asteroids/index.ts:321`, dentro de `drawPowerBar()`, que se
llama hasta cuatro veces por frame para escribir la misma fuente cuatro veces.

Y otra vez el contraejemplo vive aquí: `arkanoid/entities.ts:350` iza el radio con
`const blur = p.glow ? glowSpread(p) : 0;` **antes** del bucle de bloques, y `snake/entities.ts:192`
hace lo mismo. **La forma correcta ya está escrita en este repo dos veces**; lo que falta es
aplicarla en los otros diez sitios.

---

### Memoria — R7, R8, R9

### R7 · Cero cadenas fabricadas por frame

**Pasa si** ningún `tint()` con argumentos constantes se llama desde `draw()` o `update()`: se
resuelve una vez, al fijar la paleta. **Falla si** una cadena `rgba` se construye por entidad o
por frame.

`tint()` de `lib/games.ts:113` hace un `parseInt` y un template string: **una cadena nueva por
llamada**. Los sitios, todos confirmados: `tetris/board.ts:162` monta `tint(p.gloss, 0.12)` dentro
de `drawCell` —hasta 250 cadenas idénticas por frame—; `frogger/entities.ts` lo hace en seis
sitios con constantes `ALPHA_*`; `frogger/index.ts:458,462`, `snake/index.ts:266` y
`asteroids/entities.ts:295` una vez por frame cada uno, con argumentos fijos.

El peor es `asteroids/entities.ts:341`: `tint(p.particle, Number(alpha.toFixed(2)))`, **por
partícula y por frame**, y encima con un `toFixed` que fabrica una segunda cadena para tirarla. Su
alfa **sí** varía —es el desvanecido de la partícula—, así que no se puede precomputar entero: se
resuelve con una tabla de los ~20 pasos de alfa que el redondeo a dos decimales ya está
produciendo. Que ese `toFixed` esté ahí para cuantizar el alfa es justamente la pista de que la
tabla es la forma correcta.

Ninguna de estas cadenas se nota en el p95. Se notan en el GC, y el GC se nota en el teléfono de
otro.

### R8 · Cero arrays y closures nuevos en el camino caliente

**Pasa si** las colecciones de entidades se compactan en el sitio y los recorridos del bucle no
crean funciones. **Falla si** hay `filter`, `map`, `concat`, `some` o spread dentro de `update()`
o `draw()`.

Asteroids reconstruye sus arrays cada frame en `index.ts:261-262` con dos `filter`, más un
`newAsteroids: Asteroid[]` nuevo en `:265` y un `push(...spread)` en `:250`. Frogger es más caro
por otra vía: `entities.ts:150-158`, `positions(t)`, **construye un array nuevo en cada llamada**,
y se la llama desde `hits()` —con un `some()` que además crea un closure—, desde `carrier()` y
desde `draw()`. Con diez carriles son decenas de arrays y closures por frame, todos muertos al
frame siguiente.

El arreglo es el de siempre y no es sofisticado: un barrido de compactación con dos índices para
las colecciones, y un buffer reutilizado por carril para `positions()`. **Lo que no se hace es
convertir el motor en un banco de arrays tipados**: la basura de generación joven es barata, y
sólo se persigue la que está dentro del bucle.

### R9 · Todo lo que se genera sin control tiene tope

**Pasa si** cada colección que crece por evento de juego tiene un máximo declarado en su
`constants.ts`. **Falla si** una explosión, una estela o un sistema de partículas puede crecer sin
límite.

`asteroids/index.ts:166-168`, `explode()`, crea `count` partículas nuevas por asteroide roto, y no
hay `MAX_PARTICLES` en ningún sitio. Con el power-up `nova` —`index.ts:190-196`, que detona
**todos** los asteroides a la vez— salen picos de cientos de `new Particle` en un solo frame, cada
una con su `glow` y su `tint` por frame mientras vive. Es el único sitio del repo donde el coste
de un frame depende de lo bien que juegue el usuario.

El tope va en `constants.ts` y no en el motor, porque es equilibrio y no mecánica: quien lo ajuste
tiene que poder hacerlo sin abrir `index.ts`. Y va con la política de descarte escrita —las nuevas
no entran, o desplazan a las más viejas—, porque las dos se ven distinto en pantalla.

---

### Frontera — R10

### R10 · El motor no gana un render de React

**Pasa si** después de la optimización `emitState()` sigue emitiendo sólo cuando cambia una de las
tres cifras del HUD, y nada nuevo cruza al gabinete. **Falla si** se añade un callback, se emite
por frame, o se mete `react` en un import de `lib/games/`.

Es la propiedad mejor defendida de este repo y la más fácil de romper sin querer: quien quiere
pintar un contador de FPS en el HUD acaba emitiendo por frame, y sesenta `setState` por segundo
sobre las 770 líneas de `PlayCabinet` cuestan más que todo lo que se hubiera ganado. **El
instrumento de medida no vive en el repo por esto mismo** —está en `optimizar-motor.md`, se
inyecta desde la consola del navegador y desaparece al cerrar la pestaña—.

Del otro lado de la frontera hay defectos reales: `padProps` se recrea en cada render de
`PlayCabinet`, `GamePad` no está memoizado, y `GameCanvas` no tiene `ResizeObserver`, así que en
un móvil se rellenan del orden de cuatro veces los píxeles visibles. **No son de este agente.**
Se anotan en el ledger con estado `fuera-de-alcance` y su ancla, y quedan escritos para quien
decida abrir esa puerta.

---

### Método y perímetro — R11, R12

### R11 · Se mide antes y después, o no se cierra

**Pasa si** todo hallazgo que se dé por `resuelto` tiene dos mediciones en la tabla de Mediciones:
la de antes y la de después, mismo motor, misma piel, mismo escenario y misma duración. **Falla
si** se cierra por inspección del código.

Sin esto el agente es un generador de refactors plausibles. Y no es retórica: hay optimizaciones
de canvas que **empeoran** según el navegador —un canvas auxiliar que se vuelca cada frame puede
costar más que las 28 líneas que sustituye si la capa no está acelerada—, y la única forma de
saberlo es el reloj. Un hallazgo cuyo arreglo no mejora el número se anota como `aceptado` con la
medida en `notas`, **y el arreglo se revierte**: complejidad que no paga es deuda.

Cuando el MCP de Chrome no está conectado, **se dice en una línea y se degrada**: la auditoría
estática sigue valiendo, los hallazgos entran con `coste` a `—`, y **ningún motor puede pasar a
`optimizado`** en esa ronda.

### R12 · La jugabilidad no cambia ni un número

**Pasa si** `git diff` sobre el `constants.ts` del motor sale **vacío**, y las tres pieles dibujan
lo mismo que antes. **Falla si** cambió una constante de equilibrio, una velocidad, un tiempo, un
color o el número de entidades que se ven.

Es el límite del oficio y va la última porque es la que se rompe sin darse cuenta. Bajar las
partículas de una explosión de 20 a 8 hace bajar el p95 y **cambia el juego**; eso es una decisión
de equilibrio y le toca a una spec, no a una ronda de rendimiento. Lo mismo con quitar el halo:
apagar `glow` en `neon` arregla R4 de un plumazo y lo que hace es deshacer el trabajo de
`skin-designer`.

La excepción, y es una sola: **R9 introduce un tope donde no había ninguno**, y un tope es una
constante nueva en `constants.ts`. Se declara en el ledger, se elige por encima del peor caso
observado —de forma que en una partida normal no recorte nada— y se dice en el cierre, porque es
lo único de esta ronda que un humano tiene que mirar con sus ojos.

Un motor más rápido que se juega distinto es un motor roto.

---

## Cómo se presenta

Se imprime **la tabla de los cinco motores entera**, aunque esté casi toda en `sin-medir`: es la
respuesta directa a la pregunta que dispara este agente. Debajo, los hallazgos del motor de la
ronda, ordenados por gravedad, cada uno con su regla, su ancla y su coste medido si lo tiene.

Los hallazgos que caen fuera del alcance se presentan **igual de completos** que los demás, con su
ancla y su estado `fuera-de-alcance`. Verlos es la mitad del valor de la ronda: son la lista de lo
que le espera a quien decida ampliar el alcance.

Y las mediciones se presentan siempre en pareja cuando existe la pareja —antes y después, en la
misma línea— porque un número suelto no dice nada. `4,1 ms → 1,6 ms` sí.

## Qué firma esto y qué no

Seis cosas que este agente **no puede firmar**, y por eso `firmado` es un estado del usuario:

1. **Que vaya bien en un teléfono.** Se mide en escritorio, y el margen del presupuesto es una
   traducción, no una medida.
2. **El coste real de `shadowBlur` en otra GPU.** Escala distinto en integrada, en dedicada y en
   móvil.
3. **El jank por GC.** Una medición de veinte segundos no ve la pausa que llega al minuto tres.
4. **La batería y el calor.** Un motor que cabe en el presupuesto puede seguir siendo un motor que
   funde una batería, y eso sólo se ve jugando de verdad.
5. **Que el juego siga sintiéndose igual.** R12 comprueba que los números no cambiaron; que la
   nave responda igual lo dice una mano.
6. **La competencia con React.** El agente mide el motor solo; el usuario juega mientras
   `PlayCabinet` renderiza en cada flanco de tecla.

## El orden de las rondas

Cuando nadie nombre un motor, se propone en este orden, y no se improvisa otro:

1. **El que tenga un hallazgo `critico` abierto.** Un tirón visible gana a todo lo demás.
2. **`tetris`**, mientras siga sin medir: es el peor caso conocido —250 conmutaciones de halo y
   250 cadenas por frame en un tablero medio lleno— y el que más barato tiene el arreglo.
3. **`frogger`**, que es el que más primitivas pinta por frame y el único con arrays por llamada
   en tres caminos distintos.
4. **`asteroids`**, el único cuyo coste depende de cómo juegue el usuario, por las partículas sin
   tope.
5. **`snake` y `arkanoid`** al final: son los que más patrones sanos ya tienen, y sirven de
   contraejemplo mientras tanto.
