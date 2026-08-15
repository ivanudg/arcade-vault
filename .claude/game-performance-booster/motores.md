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

| motor     | estado     | piel | p95 antes | p95 despues | hallazgos | abiertos | alta       | revisado   | notas                                                                                                                                                                                                                                                                        |
| --------- | ---------- | ---- | --------- | ----------- | --------- | -------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| asteroids | auditado   | —    | —         | —           | 7         | 7        | 2026-08-15 | 2026-08-15 | Peor caso acotado: ~250 particulas vivas (15 balas/s x 15 por asteroide grande x 1,1 s de TTL). El pico de nova NO se pinta: nextLevel() vacia particles en el mismo update(). Unico con Math.random() en su generacion: sus ventanas no son reproducibles                   |
| tetris    | optimizado | neon | 0,70      | 0,60        | 6         | 0        | 2026-08-15 | 2026-08-15 | Optimizado con cuatro ventanas (neon y clasico, antes y despues). Sin firmar por un humano: movil, otra GPU, jank por GC, bateria, tacto del juego y competencia con React. R4 se resolvio SIN agrupar por color: agrupar mueve el 9,14% de los pixeles en neon y eso es R12 |
| arkanoid  | auditado   | —    | —         | —           | 3         | 3        | 2026-08-15 | 2026-08-15 | El mas sano de los cinco: cero tint(), cero allocs en el camino caliente y el blur izado en entities.ts:350. Peor caso acotado y conocido: 60 bloques en LEVELS[9], y decreciente durante la partida                                                                         |
| snake     | auditado   | —    | —         | —           | 4         | 4        | 2026-08-15 | 2026-08-15 | Contado sin medir: 2N asignaciones shadow por frame con N = longitud, N=48 al nivel 10 y techo 500. Unico de los cinco que pasa R5 limpio, y unico donde una sola piel no cubre el codigo de dibujo                                                                          |
| frogger   | auditado   | —    | —         | —           | 6         | 6        | 2026-08-15 | 2026-08-15 | Satura en la ronda 3 y luego es plano: lanesForRound no toca count, asi que son 31 entidades de carril siempre. Peor caso 80 conmutaciones, 27 cadenas y 13 arrays por frame. Sin Math.random(): sus ventanas si son reproducibles                                           |

## Hallazgos

| motor      | regla | ancla                                 | cadena                                           | gravedad | coste | estado           | visto      | notas                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ----- | ------------------------------------- | ------------------------------------------------ | -------- | ----- | ---------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tetris     | R4    | `lib/games/tetris/board.ts:157`       | `glow(ctx, color, size *`                        | critico  | 0,04  | resuelto         | 2026-08-15 | Resuelto SIN agrupar por color. drawCell se parte en drawBoard y drawPiece: el halo se conmuta al cambiar de color y se suelta con un noGlow al salir del bucle. 328 -> 75 escrituras de estado con 82 celdas, y el tablero neon de 0,201 a 0,158 ms en banco aislado. Agrupar por color dejaba 23 escrituras pero movia el 9,14% de los pixeles (max 98 de 765): eso es R12, y R12 manda |
| tetris     | R6    | `lib/games/tetris/board.ts:157`       | `size * glowSpread(p)`                           | serio    | —     | resuelto         | 2026-08-15 | Izado: glowSpread pasa a exportada y el motor la resuelve al fijar la piel (let spread, recalculado en setSkin); drawBoard y drawPiece la reciben por parametro y sacan el radio una vez por lote. Se arreglo el PRIMERO pese a ser serio, porque sin el radio fuera del bucle R4 no se puede tocar y es un Edit por hallazgo                                                             |
| tetris     | R7    | `lib/games/tetris/board.ts:162`       | `tint(p.gloss, 0.12)`                            | critico  | 0,02  | resuelto         | 2026-08-15 | Precomputado: board.ts exporta glossFill(p) con su GLOSS_ALPHA y el motor guarda la cadena junto a la paleta, recalculada en setSkin. Cero cadenas por frame donde habia ~112 medio lleno; el tablero clasico de 0,078 a 0,057 ms en banco aislado. La ganancia de verdad es GC y no p95, como avisa R7: cerrado con las dos ventanas de clasico                                          |
| tetris     | R5    | `lib/games/tetris/index.ts:333`       | `function drawGrid()`                            | serio    | 0,01  | resuelto         | 2026-08-15 | Un solo beginPath y un solo stroke para las 28 lineas, como snake/index.ts:264, y SIN su +0.5, que aqui movia el dibujo. De 0,030 a 0,019 ms en banco aislado. No hizo falta el canvas auxiliar: el primer escalon de P3.3 basto y no hay capa que invalidar en setSkin                                                                                                                   |
| tetris     | R6    | `lib/games/tetris/index.ts:380`       | `ctx.font = "12px monospace"`                    | menor    | —     | resuelto         | 2026-08-15 | Izadas las dos que se pueden izar, font y textAlign, al cuerpo de mount(): son constantes y nada mas en el motor las toca. Las otras cinco se quedan y NO incumplen R6: drawBoard y drawGrid pisan fillStyle, strokeStyle y lineWidth dentro del mismo frame, asi que cada una se asigna una sola vez por lote. Su coste esta por debajo del ruido del reloj                              |
| asteroids  | R7    | `lib/games/asteroids/entities.ts:341` | `Number(alpha.toFixed(2))`                       | critico  | —     | abierto          | 2026-08-15 | Contado: 2 cadenas por particula y frame, 500 por frame y ~30.000 por segundo con ~250 particulas vivas. Tabla de ~20 alfas cuantizados al fijar la paleta                                                                                                                                                                                                                                |
| asteroids  | R4    | `lib/games/asteroids/entities.ts:346` | `glow(ctx, dust,`                                | critico  | —     | abierto          | 2026-08-15 | Contado: 250 pares glow/noGlow = ~1.000 asignaciones shadow por frame. NO se agrupa por color (cada particula lleva su alfa): el arreglo es un shadowBlur para el lote, solo shadowColor por particula y un noGlow al final                                                                                                                                                               |
| asteroids  | R6    | `lib/games/asteroids/entities.ts:87`  | `export function glowSpread`                     | serio    | —     | abierto          | 2026-08-15 | Contado: 304 llamadas por frame en el peor caso, ~1.216 comparaciones. Se queda en serio pese a escalar con la pantalla: su coste unitario esta dos ordenes por debajo de un rgba o de un shadowBlur. El criterio del ledger mira escala y no coste unitario                                                                                                                              |
| asteroids  | R9    | `lib/games/asteroids/index.ts:166`    | `function explode(`                              | serio    | —     | abierto          | 2026-08-15 | Baja de critico: el pico de nova no llega a draw() porque nextLevel() vacia r.particles en el mismo update (index.ts:201 tras :314). Techo real ~250 por cadencia de fuego. Propuesta: MAX_PARTICLES 400, descarte de las mas viejas                                                                                                                                                      |
| asteroids  | R8    | `lib/games/asteroids/index.ts:261`    | `r.bullets.filter((b) => !b.dead)`               | serio    | —     | abierto          | 2026-08-15 | Correccion de la cuenta: 7 arrays y 9 closures por frame en fase playing (:261, :262, :265, :278 x2, :279, :293). El :234 solo corre en fase dead. Compactar en el sitio                                                                                                                                                                                                                  |
| asteroids  | R6    | `lib/games/asteroids/index.ts:321`    | `ctx.font = "15px monospace"`                    | menor    | —     | abierto          | 2026-08-15 | drawPowerBar se llama hasta 4 veces por frame y escribe la misma fuente cada vez                                                                                                                                                                                                                                                                                                          |
| frogger    | R8    | `lib/games/frogger/entities.ts:150`   | `positions(t: number): number[]`                 | serio    | —     | abierto          | 2026-08-15 | 13 arrays por frame: 10 en draw, uno por carril, y hasta 3 en update. En el rio carrier() se calcula dos veces con la misma t y la misma x                                                                                                                                                                                                                                                |
| frogger    | R4    | `lib/games/frogger/entities.ts:242`   | `glow(ctx, p.car,`                               | critico  | —     | abierto          | 2026-08-15 | 80 escrituras de shadow por frame en neon con la ronda 3: 41 encendidos y 39 apagados sobre 31 entidades de carril. Sube de serio a critico al contarlo                                                                                                                                                                                                                                   |
| frogger    | R7    | `lib/games/frogger/entities.ts:256`   | `tint(p.truck, ALPHA_TRUCK)`                     | serio    | —     | abierto          | 2026-08-15 | 27 cadenas rgba por frame, 22 dentro de bucles: 9 troncos, 7 tortugas, 5 marcos de nicho, 2 camiones, gator y serpiente. 1.620 por segundo                                                                                                                                                                                                                                                |
| frogger    | R5    | `lib/games/frogger/index.ts:456`      | `tint(palette.laneLine`                          | serio    | —     | abierto          | 2026-08-15 | Son 100 fillRect de linea, no ~125: 4 filas x 25 columnas. Con fondos y bancos, 111 primitivas estaticas por frame de 177 totales                                                                                                                                                                                                                                                         |
| snake      | R4    | `lib/games/snake/entities.ts:197`     | `if (p.glow) glow(ctx, color, blur`              | serio    | —     | abierto          | 2026-08-15 | Sube de menor a serio tras contar: 2N asignaciones shadow por frame, N crece toda la partida (3 al nacer, 48 al nivel 10, techo 500 del tablero). Con N=100 el area desenfocada es el 40% del canvas. No es critico porque N<20 en el primer minuto: es la constante mas lenta de los cinco                                                                                               |
| snake      | R7    | `lib/games/snake/index.ts:266`        | `tint(palette.grid, GRID_ALPHA)`                 | menor    | —     | abierto          | 2026-08-15 | Confirmado menor: 1 llamada por frame que fabrica 2 cadenas (el slice y el template), 120 por segundo. No escala. Izar al fijar la paleta y recalcular en setSkin()                                                                                                                                                                                                                       |
| arkanoid   | R4    | `lib/games/arkanoid/entities.ts:357`  | `if (p.glow) glow(ctx, color, blur`              | serio    | —     | abierto          | 2026-08-15 | 60 conmutaciones por frame en el peor caso (LEVELS[9], nivel 10), no ~100. Techo declarado y decreciente: por eso serio y no critico. El blur si esta izado en :350                                                                                                                                                                                                                       |
| arkanoid   | R6    | `lib/games/arkanoid/entities.ts:367`  | `glow(ctx, p.paddle, glowSpread(p))`             | menor    | —     | abierto          | 2026-08-15 | Cadena corregida: la vieja (`glowSpread(p));`) daba 26 coincidencias en cuatro motores y no reconciliaba nada. Izado para los bloques en :350 pero no en :367 ni :374. Son 2 llamadas por frame: coste nulo, se arregla por consistencia del contraejemplo                                                                                                                                |
| (gabinete) | R10   | `components/play-cabinet.tsx:217`     | `const padProps = {`                             | serio    | —     | fuera-de-alcance | 2026-08-15 | Objeto literal recreado en cada render, con closures nuevas. Los tres GamePad se rerenderizan enteros                                                                                                                                                                                                                                                                                     |
| (gabinete) | R10   | `components/game-pad.tsx:358`         | `export function GamePad({`                      | menor    | —     | fuera-de-alcance | 2026-08-15 | Sin memo, y define cross() y action() por render. Cada flanco de tecla rerenderiza el arbol                                                                                                                                                                                                                                                                                               |
| (gabinete) | R10   | `components/game-canvas.tsx:56`       | `canvas.width = game.world.width`                | serio    | —     | fuera-de-alcance | 2026-08-15 | Sin ResizeObserver: el buffer se fija al montar. En un movil se rellenan ~4x los pixeles visibles                                                                                                                                                                                                                                                                                         |
| tetris     | R6    | `lib/games/tetris/board.ts:152`       | `ctx.globalAlpha = alpha`                        | serio    | —     | resuelto         | 2026-08-15 | drawBoard ya no toca globalAlpha y drawPiece solo lo escribe si alpha != 1: de ~224 escrituras por frame a 2, las de la proyeccion de aterrizaje, que es la unica que pide un alfa distinto de 1. El resto del dibujo puede asumir 1 porque quien lo cambia lo devuelve                                                                                                                   |
| asteroids  | R6    | `lib/games/asteroids/entities.ts:186` | `ctx.lineJoin = "round";`                        | menor    | —     | abierto          | 2026-08-15 | Alta de la ronda de profundizacion: lineWidth y lineJoin reasignados por entidad en :185, :276, :347 y :389, ~300 asignaciones por frame para dos valores fijos. Van con los 34 pares save/restore de :180, :271 y :386                                                                                                                                                                   |
| frogger    | R6    | `lib/games/frogger/entities.ts:111`   | `glowSpread(p));`                                | serio    | —     | abierto          | 2026-08-15 | Alta de la ronda de profundizacion: doce llamadas sin izar, 41 ejecuciones por frame de un valor que solo cambia en setSkin(). Faltaba en la siembra; tetris, asteroids y arkanoid si tienen su R6                                                                                                                                                                                        |
| frogger    | R8    | `lib/games/frogger/index.ts:193`      | `lanes.find((lane) =>`                           | menor    | —     | abierto          | 2026-08-15 | Alta de la ronda de profundizacion: hasta 3 closures y 3 barridos de 10 carriles por frame. El grep de R8 no lo ve porque .find( no esta en el patron                                                                                                                                                                                                                                     |
| snake      | R6    | `lib/games/snake/entities.ts:248`     | `glow(ctx, p.fruit, glowSpread(p))`              | menor    | —     | abierto          | 2026-08-15 | Alta de la ronda de profundizacion: glowSpread sin izar en Fruit.draw, 1 vez por frame. Misma inconsistencia intra-archivo que arkanoid:367, izado en Snake.draw:192 y no aqui                                                                                                                                                                                                            |
| snake      | R8    | `lib/games/snake/entities.ts:174`     | `this.cells.some((cell, i)`                      | menor    | —     | abierto          | 2026-08-15 | Alta de la ronda de profundizacion: closure nuevo en hitsSelf, dentro del arbol de update(). Corre por tick y no por frame, 6,7 a 16,7 veces por segundo. Candidato a aceptado si la medicion no lo ve                                                                                                                                                                                    |
| arkanoid   | R6    | `lib/games/arkanoid/entities.ts:355`  | `ctx.globalAlpha = 0.4 + 0.6 * (b.hp / b.maxHp)` | serio    | —     | abierto          | 2026-08-15 | Alta de la ronda de profundizacion: save/restore y globalAlpha por bloque, 60 pares por frame, y con la rejilla intacta los 60 alfas valen 1. Fijar por lote sin save/restore, cerrando con noGlow explicito                                                                                                                                                                              |

## Mediciones

| fecha      | motor  | piel    | momento | p50 | p95 | peor | doblados | frames | notas                                                                                                                                                                                                                             |
| ---------- | ------ | ------- | ------- | --- | --- | ---- | -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-15 | tetris | neon    | antes   | 0,5 | 0,7 | 1,7  | 0        | 1081   | 1280x900, 60 fps. Guion apartado del escrito: llenado con Space a ~11 filas de monton FUERA de la ventana, y dentro solo laterales alternos cada 150 ms. ArrowDown mantenido acaba en topout y la ventana contaria frames muertos |
| 2026-08-15 | tetris | clasico | antes   | 0,5 | 0,8 | 2,9  | 0        | 1079   | Segunda piel obligatoria en Tetris: las dos ramas de drawCell son excluyentes y R7 solo se ejerce aqui. Mismo guion. Tablero de 48 celdas                                                                                         |
| 2026-08-15 | tetris | neon    | despues | 0,4 | 0,6 | 1,5  | 0        | 1085   | Mismo escenario y mismo llenado que su antes (10 piezas, 48 celdas). Una ventana previa con el agrupado por color dio 0,4/0,6/1,4: identica, y por eso se descarto agrupar, que ademas rompia R12                                 |
| 2026-08-15 | tetris | clasico | despues | 0,5 | 0,7 | 1,0  | 0        | 1081   | Mismo llenado exacto que su antes, 10 piezas y 48 celdas. Se descarto entera una ventana anterior por topout al arrancar (frames 0, con la pestana visible): no se parchea, se repite                                             |

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

### 2026-08-15 · La profundización, cinco motores en paralelo

Cinco rondas de auditoría lanzadas a la vez, una por motor, **sin navegador y sin escribir**: cada
una devolvió sus filas y se consolidaron aquí en una sola escritura. El paralelismo se pudo hacer
porque la Fase 3 sólo lee; **la Fase 4 no se paraleliza** —un solo Chrome, y cinco partidas
compitiendo por la CPU dan números falsos— y por eso la tabla de Mediciones **sigue vacía** y
ningún motor pasó de `auditado`. Es R11.

Lo que aporta sobre la siembra es la segunda columna del inventario: **cuántas veces por frame**,
que no sale de ningún grep. Con ella, 22 hallazgos pasaron a **29** (26 en alcance y los 3 de
`(gabinete)`), y cuatro cambiaron de gravedad.

**Tres notas de la siembra resultaron falsas al contarlas, y ése es el valor de la ronda:**

- **El pico de nova de Asteroids no existe.** `detonateNova()` vacía `r.asteroids`, así que
  `nextLevel()` entra en el mismo `update()` y hace `r.particles = []` (`index.ts:201` tras `:314`):
  las partículas que la nova crea **se descartan antes de que `draw()` las vea**. R9 baja a `serio`
  y el techo real, ~250 partículas, lo pone la cadencia de fuego: 15 balas/s × 15 partículas × 1,1 s
  de TTL.
- **Arkanoid no llega a ~100 conmutaciones, llega a 60**, y salen de `LEVELS[9]`. El array `blocks`
  no se compacta, así que las cuentas de recorrido son 60 se rompan o no.
- **Frogger no pinta ~125 líneas de carril, pinta 100** exactas: 4 filas × 25 columnas.

**Y una regla de medición nueva que sólo se ve contando: Tetris necesita dos ventanas por
momento.** Las dos ramas de `drawCell` son excluyentes y las decide `p.glow`: con `neon`/`retro` se
pagan R4 y R6 y **R7 cuesta cero**; con `clasico` se paga R7 y se pintan el doble de `fillRect`, y
R4 cuesta cero. Como `clasico` es `DEFAULT_SKIN`, medir sólo la piel más cara **no vería R7 nunca**
y ese hallazgo no se podría cerrar jamás. Snake tiene el mismo problema por otra vía: `clasico` es
la única piel con atlas y la única sin halo, así que **ninguna piel cubre sola su código de
dibujo**.

**Reproducibilidad, que no es igual en los cinco.** Frogger no tiene ni un `Math.random()`: dos
ventanas tomadas en el mismo `r.t` dibujan lo mismo y su antes/después es comparable de verdad.
Asteroids está en el extremo contrario —forma y velocidad de cada roca, cada partícula y cada drop
salen de `Math.random()`—: pide ventanas de 30 s y tratar como ruido cualquier diferencia por
debajo del 15%.

**El segundo contraejemplo estaba mal atribuido.** Arkanoid iza el radio igual de bien
(`entities.ts:350`), pero suelta el halo con el `restore()` de un `save()`/`restore()` **por
bloque**. **Snake (`entities.ts:191-200`) es el único de los cinco que hace las dos mitades del
patrón**: iza el radio antes del bucle _y_ apaga con un solo `noGlow()` al salir. Si hay que citar
uno, es ése.

**Tres cosas contadas que NO son hallazgo**, escritas para que la ronda siguiente no las
redescubra: el `ghostY()` de Tetris se recalcula por frame (~90-300 comparaciones) y su peor caso
es el **tablero vacío**, al revés que todo lo demás del motor; la colisión de Asteroids es
O(balas × asteroides) con `Math.hypot` (~36.500 por segundo) y ninguna de las doce reglas habla de
coste algorítmico; y la serpiente de Snake **no es un hallazgo R9** —su tope es el tablero, y
ponerle un `MAX_LENGTH` sería cambiar la mecánica, que es R12—.

**El orden de la cola sale confirmado, y por sus números: `tetris` primero.** Arkanoid y Snake son
los dos últimos, y en el caso de Snake hay un motivo de método además del número: **mientras esté
sin tocar es el contraejemplo vivo del repo**, y optimizarlo el primero le quitaría a las otras
cuatro rondas dónde mirar el patrón correcto en código real.

### 2026-08-15 · Tetris optimizado, y la primera vez que R12 gana a un patrón

Primera ronda de este agente que escribe código y la primera con números en la tabla de
Mediciones. Seis hallazgos cerrados, cuatro ventanas de veinte segundos y dos archivos tocados:
`lib/games/tetris/board.ts` y `lib/games/tetris/index.ts`. `constants.ts` y `skins.ts` salen sin
diff, y las tres puertas —`tsc`, `lint`, `build`— pasaron antes de medir y después de escribir.

**Lo importante de esta ronda no es el milisegundo, es una decisión: el patrón P3.4 no se pudo
aplicar entero.** «Ordenar por color» deja el halo de Tetris en siete conmutaciones por frame, y es
lo que la receta manda. Pero cambia **el orden de pintado**, y con `shadowBlur` de 10,2 px sobre
celdas de 30 los halos de dos celdas vecinas se solapan. Se midió en vez de opinar, dibujando el
mismo tablero dos veces en un canvas fuera de pantalla con la paleta `neon` real:

| Variante                         | Escrituras de estado (82 celdas) | Píxeles distintos | Desviación máxima |
| -------------------------------- | -------------------------------- | ----------------- | ----------------- |
| La de antes, halo por celda      | 328                              | —                 | —                 |
| Agrupada por color (P3.4 entero) | 23                               | **9,14%**         | 98 de 765         |
| Conmutando al cambiar de color   | 75                               | **0%**            | 0                 |

La tercera es la que está en el código. Cuesta 52 escrituras más por frame que agrupar y **dibuja
exactamente lo mismo**; y cuando se midió en partida, la variante agrupada daba `0,4 / 0,6 / 1,4`
contra `0,4 / 0,6 / 1,5` de la conservadora: dentro del ruido. O sea que el reordenamiento **no
pagaba ni el píxel que costaba**. R12 no es una preferencia y aquí decidió el código.

**Lo que Tetris ya no hace por frame**, con el tablero medio lleno: ~200 pares `glow`/`noGlow`,
~200 llamadas a `glowSpread()`, ~112 cadenas `rgba` idénticas, ~224 escrituras de `globalAlpha`,
27 `beginPath`/`stroke` de rejilla y dos asignaciones de `font`/`textAlign`.

**Y la ganancia medida en escritorio es pequeña, que también hay que decirlo.** El p95 baja de 0,70
a 0,60 ms en `neon` y de 0,80 a 0,70 en `clasico`, con el peor frame de 2,9 a 1,0. Son décimas, y
las décimas son ruido salvo que apunten todas en la misma dirección —aquí lo hacen, en ocho
métricas de dos pieles—. **El motivo de que sea pequeña es que Tetris ya cabía holgadísimo**: 0,7
ms sobre un presupuesto de 8. El número honesto del ahorro sale del banco aislado, no de la
partida: **0,054 ms por frame en `neon` y 0,032 en `clasico`**. Eso en un teléfono, donde
`shadowBlur` escala peor y el hilo se comparte con React, es donde se cobra.

**Tres cosas de método para la ronda siguiente:**

- **El guion de `optimizar-motor.md` no llega al caso peor en Tetris, y con `ArrowDown` mantenido
  llega al topout.** Lo que funciona: llenar con `Space` **fuera** de la ventana hasta un montón de
  ~11 filas, y dentro de la ventana sólo laterales alternos. Con el montón por encima de la fila 8
  la partida topea dentro de los 20 s y el resumen sale con `frames: 0`.
- **`frames: 0` no siempre es la pestaña oculta.** Aquí salió con `visibilityState` en `visible`:
  era `halt()` por topout. La comprobación de visibilidad no cubre ese caso, así que la ventana se
  cierra mirando también `FIN DEL JUEGO`.
- **El llenado se cuenta muestreando el canvas**, no adivinando: el estado vive en el closure y no
  se puede leer desde la consola, pero el centro de cada celda sí. Las cuatro ventanas se tomaron
  con 48 celdas para que compararan de verdad.
