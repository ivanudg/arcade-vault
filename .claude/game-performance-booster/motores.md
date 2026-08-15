# Ledger del `game-performance-booster`

Qué motores del vault están medidos y optimizados, y qué hallazgos de rendimiento ha encontrado el
agente `game-performance-booster`, con la regla que incumple cada uno y su ancla en el código.
**Este archivo lo escribe el agente; edítalo a mano sólo para corregirlo.**

Se lee de arriba abajo: la tabla **Motores** contesta «¿cuáles llevo ya?» de un vistazo, la de
**Hallazgos** lleva el detalle —una fila por cosa que arreglar— y la de **Mediciones** guarda los
números, que son lo único que permite decir que una ronda sirvió para algo.

Existe porque un subagente arranca en frío: no ve el hilo padre, ni lo que se habló la semana
pasada, ni el arreglo que ya rechazaste. Sin estas tablas volvería a medir lo mismo cada vez, y
sin saber qué se decidió. Va versionado en git a propósito: es conocimiento del proyecto, como las
specs.

**El código manda sobre estas tablas, siempre.** Los archivos de `lib/games/` son la fuente de
verdad de lo que cuesta un frame hoy. Aquí sólo se recuerda lo **medido y lo decidido**. Cuando las
dos cosas no coincidan, se corrige la tabla, nunca el código.

**El alcance son los cinco motores**, y `components/` no está entre ellos. Los hallazgos que caen
del otro lado de la frontera —`play-cabinet.tsx`, `game-pad.tsx`, `game-canvas.tsx`— se anotan
igual, con su ancla y estado `fuera-de-alcance`, y nadie los arregla desde aquí. Son la lista de lo
que le espera a quien decida ampliar el alcance.

## Cómo se leen las tablas

**Motores**, una fila por máquina con motor en `ENGINES`:

| Columna       | Qué es                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `motor`       | El `GameId`. Es la clave, y la comparten las tres tablas                                                               |
| `estado`      | Uno de los siete de abajo. Vocabulario cerrado                                                                         |
| `piel`        | La piel de la medición. Se mide **la más cara**, que hoy es `neon` en los cinco                                        |
| `p95 antes`   | El p95 del callback de `rAF` en ms, antes de tocar nada. `—` si no se ha medido                                        |
| `p95 despues` | El mismo número tras la ronda. `—` mientras no haya después                                                            |
| `hallazgos`   | Cuántas filas tiene en la tabla de Hallazgos. `—` si no se ha auditado                                                 |
| `abiertos`    | Cuántos no están `resuelto`, `aceptado` ni `fuera-de-alcance`. **Si es mayor que cero, no puede pasar a `optimizado`** |
| `alta`        | Cuándo se dio de alta la fila                                                                                          |
| `revisado`    | Última vez que se reconcilió contra el código                                                                          |
| `notas`       | Una línea. **Obligatorio** en `regresion` y `desincronizado`                                                           |

**Hallazgos**, una fila por cosa que arreglar:

| Columna    | Qué es                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `motor`    | La misma clave de arriba, o `(gabinete)` para lo que cae fuera del alcance                                |
| `regla`    | `R1` a `R12`. La que el arreglo tiene que satisfacer. Si toca dos, la que decide, y la otra en `notas`    |
| `ancla`    | `archivo:linea` **en el momento de `visto`**. Nunca una descripción en prosa                              |
| `cadena`   | El trozo de código que identifica el hallazgo. **Es por lo que se reconcilia**, no por el número de línea |
| `gravedad` | `critico`, `serio` o `menor`. Cerrado                                                                     |
| `coste`    | Lo que se midió que costaba, o lo que se ganó al arreglarlo. `—` si no se ha medido                       |
| `estado`   | Uno de los cinco de hallazgo                                                                              |
| `visto`    | La fecha del alta                                                                                         |
| `notas`    | Una línea: cuál fue el arreglo, o por qué se acepta                                                       |

**Mediciones**, una fila por ventana de medición. **Nunca se sobrescribe una**: una medición vieja
es la única forma de detectar una regresión.

| Columna    | Qué es                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| `fecha`    | El día                                                                      |
| `motor`    | La clave                                                                    |
| `piel`     | `clasico`, `neon` o `retro`                                                 |
| `momento`  | `antes` o `despues`, respecto de la ronda que la produjo                    |
| `p50`      | Mediana del callback de `rAF`, en ms                                        |
| `p95`      | El 5% peor, en ms. **Es el número que decide R1**                           |
| `peor`     | El frame más caro de la ventana, en ms                                      |
| `doblados` | Cuántos intervalos pasaron de 33 ms. **Cero, o R1 falla**                   |
| `frames`   | Cuántos frames entraron en la cuenta, descartados los dos primeros segundos |
| `notas`    | El guion, si se apartó del de `optimizar-motor.md`, y cualquier rareza      |

**La columna `cadena` es la decisión de diseño de este ledger**, y está copiada del ledger de
`mobile-porter` porque sale de una propiedad de este repo: el hook `PostToolUse` pasa
`eslint --fix` y `prettier --write` tras cada escritura, así que **los números de línea se mueven
solos entre rondas**. Un ancla que apunta a la línea equivocada convierte cada reconciliación en
ruido. La regla: **el `ancla` se congela en `visto` y sirve para ir a mirar; la reconciliación se
hace con un `Grep` de la `cadena`.**

`gravedad`, cerrado: `critico` es lo que se paga en cada frame y escala con lo que hay en pantalla
—un halo conmutado por celda, una cadena por partícula—; `serio` es un coste fijo por frame que no
escala; `menor` es lo que se paga una o dos veces por frame, o sólo en una piel.

## Los siete estados de un motor

| Estado           | Quién lo pone | ¿Bloquea que se vuelva a optimizar?                                            |
| ---------------- | ------------- | ------------------------------------------------------------------------------ |
| `sin-medir`      | El agente     | No. Es el estado de arranque                                                   |
| `auditado`       | El agente     | No. Tiene hallazgos leidos en el codigo y ninguna medicion                     |
| `medido`         | El agente     | No. Tiene su fila en Mediciones y ningun hallazgo resuelto                     |
| `en-curso`       | El agente     | No. Se cerraron unos y quedan abiertos                                         |
| `optimizado`     | El agente     | Si, mientras no haya veredicto humano. Cero abiertos y el presupuesto cumplido |
| `firmado`        | El usuario    | Si. Lo jugo en un aparato de verdad y va fino                                  |
| `regresion`      | El agente     | No, y se reporta siempre: una medicion nueva empeoro a la anterior             |
| `desincronizado` | El agente     | No, y se reporta siempre: la tabla dice una cosa y el codigo otra              |

Son ocho contando `desincronizado`, que está en todos los ledgers de la casa y no cuenta como
estado de trabajo: es el aviso de que la tabla mintió.

**`optimizado` y `firmado` no son lo mismo, y esa distancia es la razón de ser de este ledger.**
`optimizado` es un juicio del agente contra las doce reglas, medido en un portátil de desarrollo.
`firmado` es alguien jugando en su teléfono. **El agente no puede poner `firmado` nunca**, porque
las seis cosas de «Qué firma esto y qué no» —el móvil, otra GPU, el GC, la batería, el tacto del
juego y la competencia con React— no se miden desde aquí. Un motor puede estar `optimizado`
durante meses; eso significa que no le queda ningún hallazgo **de los que el agente sabe ver**.

Y `regresion` es el estado más valioso de esta tabla: significa que algo que se dio por bueno se
volvió a medir y salió peor. Sin la tabla de Mediciones no se podría poner nunca.

## Los cinco estados de un hallazgo

| Estado             | Quién lo pone | Qué significa                                                                                  |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------- |
| `abierto`          | El agente     | La `cadena` sigue en el archivo                                                                |
| `resuelto`         | El agente     | Se arreglo **y la medicion del despues lo confirma**. Sin dos numeros no se cierra (R11)       |
| `aceptado`         | El usuario    | Existe y se deja: el arreglo no mejoro el numero, o cuesta mas que el fallo                    |
| `fuera-de-alcance` | El agente     | Es real y esta en `components/` o `app/`. Se anota y no se toca                                |
| `reabierto`        | El agente     | Estaba `resuelto` y la reconciliacion volvio a encontrar la `cadena`. **La senal mas valiosa** |

`abierto` y `aceptado` no son lo mismo. El primero es un juicio del agente contra las reglas y se
revisa solo en la ronda siguiente. El segundo es voluntad humana —o un número que no mejoró— y **no
se revisa solo**: rediseñar el arreglo es otra ronda, y el agente cita la fecha y el motivo.

## Señal en el código → Efecto sobre la fila

Se cruza en la Fase 2, y **el código manda siempre**.

| Señal en el código                                                         | Efecto sobre la fila                                                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| La `cadena` sigue en el archivo y la fila dice `resuelto`                  | `reabierto`. **El codigo manda**                                                 |
| La `cadena` ya no esta y la fila dice `abierto`                            | `resuelto`, con nota: lo cerro otra ronda. **Sin medicion no sube el motor**     |
| El archivo del `ancla` ya no existe                                        | `caducado` en `notas` y la fila a `aceptado`. **La fila no se borra**            |
| Una maquina de `ENGINES` sin fila en Motores                               | Se **anade**, en `sin-medir`, con `alta` de hoy                                  |
| Un `glow(` dentro de un bucle de entidades, sin fila                       | Alta en `abierto`, regla R4                                                      |
| Un `tint(` con segundo argumento constante dentro de `draw()` o `update()` | Alta en `abierto`, regla R7                                                      |
| Un `.filter(`, `.map(` o `.concat(` nuevo dentro del bucle                 | Alta en `abierto`, regla R8                                                      |
| Un `glowSpread(` llamado dentro de un bucle                                | Alta en `abierto`, regla R6                                                      |
| Un `setInterval` o un segundo `requestAnimationFrame` dentro de `mount()`  | Alta en `abierto`, regla R3, gravedad `critico`                                  |
| `MAX_DT` desaparecido de un motor, o el orden del bucle cambiado           | Alta en `abierto`, regla R2, gravedad `critico`                                  |
| Un `import` de `react` o `next` bajo `lib/games/`                          | Alta en `abierto`, regla R10, gravedad `critico`                                 |
| `constants.ts` del motor cambio desde la ultima ronda                      | El motor a `desincronizado`: el equilibrio se movio y las mediciones no comparan |
| `skins.ts` del motor cambio, o entro una piel nueva                        | Las mediciones de ese motor quedan pendientes de repetir: cambio lo que se pinta |
| Una fila de Motores dice `optimizado` y tiene hallazgos `abierto`          | `desincronizado`                                                                 |
| Una medicion nueva empeora en mas de un 20% el `p95` de la anterior        | El motor a `regresion`, y se reporta siempre                                     |

Las dos filas de `constants.ts` y `skins.ts` son la trampa real de este ledger: **una medición sólo
compara con otra si entremedias nadie cambió lo que se pinta**. Una ronda de `skin-designer` que
añada un halo invalida el «antes» de este agente sin tocar ni una línea suya.

## Reglas de escritura

- **Nunca se borra una fila.** Un hallazgo `resuelto` se queda con su ancla y su coste: eso es
  justamente la memoria.
- **Nunca se reordena una tabla.** Las altas van al final. Es lo que mantiene los conflictos de
  merge en una línea aislada.
- **Nunca se sobrescribe una medición.** Cada ventana es una fila nueva, con su `momento`. Es lo
  único que permite ver una regresión.
- **Un `Edit` por fila**, y `Read` antes de cada uno: el hook de formateo del repo pasa Prettier
  tras cada escritura y realinea las columnas, así que el texto en disco no es exactamente el que
  se escribió.
- **No alinees las columnas a mano.** Prettier lo hace.
- **Sin tildes dentro de las celdas.** La prosa de fuera de las tablas sí las lleva.
- **`—` es «no se ha medido»**; vacío sólo lo admite `notas`.
- **Los números van con coma decimal y en ms**, sin unidad en la celda: `4,12`, no `4.12ms`.
- La clave de una fila de Hallazgos es `motor` + `cadena` + `regla`.
- **El `ancla` no se actualiza nunca**; se busca por `cadena`.
- **Un hallazgo se cierra con dos mediciones o no se cierra.** Es R11, y es la regla que separa
  este ledger de una lista de buenas intenciones.

## Motores

| motor     | estado   | piel | p95 antes | p95 despues | hallazgos | abiertos | alta       | revisado   | notas                                                                                                 |
| --------- | -------- | ---- | --------- | ----------- | --------- | -------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| asteroids | auditado | —    | —         | —           | 6         | 6        | 2026-08-15 | 2026-08-15 | El unico cuyo coste depende de como juegue el usuario: particulas sin tope                            |
| tetris    | auditado | —    | —         | —           | 5         | 5        | 2026-08-15 | 2026-08-15 | El peor caso conocido: ~250 conmutaciones de halo y ~250 cadenas por frame con el tablero medio lleno |
| arkanoid  | auditado | —    | —         | —           | 2         | 2        | 2026-08-15 | 2026-08-15 | El mas sano de los cinco: ya iza el blur para los bloques en entities.ts:350                          |
| snake     | auditado | —    | —         | —           | 2         | 2        | 2026-08-15 | 2026-08-15 | Tiene los dos contraejemplos buenos del repo: rejilla de un solo path y blur izado                    |
| frogger   | auditado | —    | —         | —           | 4         | 4        | 2026-08-15 | 2026-08-15 | El que mas primitivas pinta por frame, y el unico con arrays por llamada en tres caminos              |

## Hallazgos

| motor      | regla | ancla                                 | cadena                              | gravedad | coste | estado           | visto      | notas                                                                                                       |
| ---------- | ----- | ------------------------------------- | ----------------------------------- | -------- | ----- | ---------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| tetris     | R4    | `lib/games/tetris/board.ts:157`       | `glow(ctx, color, size *`           | critico  | —     | abierto          | 2026-08-15 | Dentro de drawCell: ~250 pares glow/noGlow por frame con el tablero medio lleno. Agrupar por color de pieza |
| tetris     | R6    | `lib/games/tetris/board.ts:157`       | `size * glowSpread(p)`              | serio    | —     | abierto          | 2026-08-15 | glowSpread recorre 6 comparaciones en board.ts:118 y solo depende de la piel. Izar como en arkanoid:350     |
| tetris     | R7    | `lib/games/tetris/board.ts:162`       | `tint(p.gloss, 0.12)`               | critico  | —     | abierto          | 2026-08-15 | Cadena rgba constante fabricada por celda: hasta 250 identicas por frame                                    |
| tetris     | R5    | `lib/games/tetris/index.ts:333`       | `function drawGrid()`               | serio    | —     | abierto          | 2026-08-15 | 28 beginPath+stroke por frame para una rejilla estatica. Snake lo hace con un solo path en index.ts:264     |
| tetris     | R6    | `lib/games/tetris/index.ts:380`       | `ctx.font = "12px monospace"`       | menor    | —     | abierto          | 2026-08-15 | Una asignacion por frame para el rotulo SIG., que no cambia nunca                                           |
| asteroids  | R7    | `lib/games/asteroids/entities.ts:341` | `Number(alpha.toFixed(2))`          | critico  | —     | abierto          | 2026-08-15 | Dos cadenas por particula y por frame: el toFixed fabrica una para tirarla. Tabla por alfa cuantizado       |
| asteroids  | R4    | `lib/games/asteroids/entities.ts:346` | `glow(ctx, dust,`                   | critico  | —     | abierto          | 2026-08-15 | Una conmutacion por particula viva, y las particulas no tienen tope. Va con el R9 de abajo                  |
| asteroids  | R6    | `lib/games/asteroids/entities.ts:87`  | `export function glowSpread`        | serio    | —     | abierto          | 2026-08-15 | Llamado en los diez sitios de dibujo del motor, ninguno izado                                               |
| asteroids  | R9    | `lib/games/asteroids/index.ts:166`    | `function explode(`                 | critico  | —     | abierto          | 2026-08-15 | Sin MAX_PARTICLES. El power-up nova detona todos los asteroides a la vez: picos de cientos en un frame      |
| asteroids  | R8    | `lib/games/asteroids/index.ts:261`    | `r.bullets.filter((b) => !b.dead)`  | serio    | —     | abierto          | 2026-08-15 | Cinco filter por frame en el update: :234, :261, :262 y :279. Compactar en el sitio                         |
| asteroids  | R6    | `lib/games/asteroids/index.ts:321`    | `ctx.font = "15px monospace"`       | menor    | —     | abierto          | 2026-08-15 | drawPowerBar se llama hasta 4 veces por frame y escribe la misma fuente cada vez                            |
| frogger    | R8    | `lib/games/frogger/entities.ts:150`   | `positions(t: number): number[]`    | serio    | —     | abierto          | 2026-08-15 | Array nuevo por llamada, y se llama desde hits(), carrier() y draw(). Buffer por carril                     |
| frogger    | R4    | `lib/games/frogger/entities.ts:242`   | `glow(ctx, p.car,`                  | serio    | —     | abierto          | 2026-08-15 | Doce sitios de conmutacion por entidad en el archivo: coches, troncos, tortugas, casas, caiman              |
| frogger    | R7    | `lib/games/frogger/entities.ts:256`   | `tint(p.truck, ALPHA_TRUCK)`        | serio    | —     | abierto          | 2026-08-15 | Seis tint() con alfa constante en el archivo, mas dos por frame en index.ts:458 y :462                      |
| frogger    | R5    | `lib/games/frogger/index.ts:456`      | `tint(palette.laneLine`             | serio    | —     | abierto          | 2026-08-15 | ~125 fillRect de linea de carril, mas agua, asfalto y bancos: todo funcion de constantes                    |
| snake      | R4    | `lib/games/snake/entities.ts:197`     | `if (p.glow) glow(ctx, color, blur` | menor    | —     | abierto          | 2026-08-15 | Una conmutacion por segmento. El blur ya esta izado en :192, que es el patron correcto                      |
| snake      | R7    | `lib/games/snake/index.ts:266`        | `tint(palette.grid, GRID_ALPHA)`    | menor    | —     | abierto          | 2026-08-15 | Una cadena constante por frame. El resto del draw de Snake es el mas limpio del repo                        |
| arkanoid   | R4    | `lib/games/arkanoid/entities.ts:357`  | `if (p.glow) glow(ctx, color, blur` | menor    | —     | abierto          | 2026-08-15 | Una conmutacion por bloque, hasta ~100. El blur si esta izado en :350                                       |
| arkanoid   | R6    | `lib/games/arkanoid/entities.ts:367`  | `glowSpread(p));`                   | menor    | —     | abierto          | 2026-08-15 | Izado para los bloques en :350 pero no para el paddle ni la bola. Inconsistencia dentro del mismo archivo   |
| (gabinete) | R10   | `components/play-cabinet.tsx:217`     | `const padProps = {`                | serio    | —     | fuera-de-alcance | 2026-08-15 | Objeto literal recreado en cada render, con closures nuevas. Los tres GamePad se rerenderizan enteros       |
| (gabinete) | R10   | `components/game-pad.tsx:358`         | `export function GamePad({`         | menor    | —     | fuera-de-alcance | 2026-08-15 | Sin memo, y define cross() y action() por render. Cada flanco de tecla rerenderiza el arbol                 |
| (gabinete) | R10   | `components/game-canvas.tsx:56`       | `canvas.width = game.world.width`   | serio    | —     | fuera-de-alcance | 2026-08-15 | Sin ResizeObserver: el buffer se fija al montar. En un movil se rellenan ~4x los pixeles visibles           |

## Mediciones

| fecha | motor | piel | momento | p50 | p95 | peor | doblados | frames | notas |
| ----- | ----- | ---- | ------- | --- | --- | ---- | -------- | ------ | ----- |

## Notas

### 2026-08-15 · La siembra

El inventario inicial se levantó **leyendo el código, sin navegador**: son 22 hallazgos, todos con
su ancla verificada con `grep` el mismo día. Por eso los cinco motores nacen en `auditado` y no en
`medido`, y por eso la tabla de Mediciones está vacía: **ni un número de esta tabla está medido
todavía**, y hasta que lo esté ningún hallazgo se puede cerrar. Es R11, y aplica también a la
siembra.

Tres cosas de método que conviene no volver a descubrir:

**Los cinco motores comparten esqueleto de bucle, copiado a mano.** Eso significa que un patrón
que arregla uno casi siempre arregla los otros cuatro, y es la mayor tentación de este agente. **Se
hace un motor por ronda igualmente**: cinco motores en un `git diff` es lo que convierte un fallo
pequeño en un cambio que nadie quiere revisar.

**El halo es un rasgo de piel, no de motor.** `clasico` deja `glow` en `false` en varios motores, y
ahí R4 no se ejerce: medir sólo `clasico` es medir el caso fácil y concluir que no hay nada que
hacer. Por eso la piel va en la fila de la medición y por eso V3 mide la segunda.

**Dos contraejemplos sanos viven en este repo y son el patrón a copiar**, no algo que haya que
inventar: `snake/index.ts:264-277` dibuja 43 líneas de rejilla con un solo `beginPath`/`stroke`, y
`arkanoid/entities.ts:350` iza el radio del halo fuera del bucle de bloques con
`const blur = p.glow ? glowSpread(p) : 0;`. Las dos formas correctas ya están escritas; lo que
falta es aplicarlas en los otros doce sitios.

**El instrumento quedó comprobado a medias, y conviene saber hasta dónde.** El parche de
`requestAnimationFrame` de `optimizar-motor.md` se probó el mismo día sobre `/jugar/tetris` con el
dev server en el 3000: **engancha bien y acumula muestras** —recogió diez frames mientras la
pestaña estuvo visible— y el resumen calcula sus percentiles. Lo que **no** se pudo cerrar es una
ventana de veinte segundos, porque la pestaña que abre el MCP se queda en `visibilityState:
"hidden"` en cuanto Chrome deja de ser la aplicación de delante, y ahí ni hay `rAF` ni hay partida
—`PlayCabinet` pausa con `visibilitychange`—. Traerla al frente por AppleScript tampoco salió:
Chrome agotó el tiempo del evento Apple (`-1712`). La salida está escrita en la receta y es pedirlo
en una línea. **Por eso la tabla de Mediciones sigue vacía**, y no por olvido.

**Lo que se dejó fuera a propósito**, con su motivo: los tres hallazgos de `(gabinete)`. Son
reales, están anclados y no son de este agente —el alcance se decidió como `lib/games/` y nada
más—. `padProps` y `GamePad` cuestan un re-render del árbol en cada flanco de tecla, que compite
con el frame del motor en el mismo hilo; el `ResizeObserver` que falta en `GameCanvas` hace que en
un teléfono se rellenen del orden de cuatro veces los píxeles visibles, que es probablemente el
mayor coste de rendimiento de la pantalla de juego entera **y no se puede arreglar desde aquí**. Si
alguien decide ampliar el alcance, la lista ya está hecha.
