# Ledger del `skin-designer`

Qué máquinas del vault están vestidas y qué skins ha diseñado el agente `skin-designer`, con
las ranuras que cubren y el veredicto que recibieron. **Este archivo lo escribe el agente;
edítalo a mano sólo para corregirlo.**

Se lee de arriba abajo: la tabla **Vestidas** contesta «¿cuáles llevo ya?» de un vistazo, la
de **Skins** lleva el detalle celda a celda y la de **Paletas** guarda los hex.

Existe porque un subagente arranca en frío: no ve el hilo padre, ni lo que se habló la semana
pasada, ni la paleta que ya rechazaste. Sin esta tabla volvería a diseñar lo mismo cada vez, y
con otros hex. Va versionado en git a propósito: es conocimiento del proyecto, como las specs.

**El código manda sobre esta tabla, siempre.** `lib/games/<juego>/constants.ts` y las fugas de
sus `entities.ts` son la fuente de verdad de lo que se pinta hoy; `lib/games/engines.ts` la de
qué máquinas tienen algo que vestir. Aquí sólo se recuerda lo **diseñado**. Cuando las dos
cosas no coincidan, se corrige la tabla, nunca el código.

El **sistema de skins ya existe** desde el 2026-08-13: `lib/games/skins.ts` tiene el
vocabulario, `GameMount.skins` y `GameHandle.setSkin()` son dos campos opcionales del contrato,
`lib/storage.ts` recuerda la elección por máquina y el gabinete pinta su selector. Lo montó la
ronda que vistió `asteroids`, y ese mismo día las otras tres —`tetris`, `arkanoid` y `snake`—
se vistieron en tres rondas paralelas, una por máquina. `frogger` entró después, con SPEC 14, y
se vistió el 2026-08-14 sin tocar ni una línea de la infraestructura: era justo la prueba de que
ser opcional servía para algo. **Las cinco máquinas con motor llevan sus tres pieles
aplicadas**, así que las quince filas están en `aplicada` y ninguna tiene todavía veredicto
humano: aplicada no es aprobada.

**Y desde el 2026-08-15 una piel es color más, si el motor lo pide, un rasgo de dibujo
booleano.** Hay seis en el repo: el `useAtlas` de Snake y **cinco `glow`, uno por máquina** —el de
Tetris, que estrenó la ampliación; el de Asteroids, que la siguió el mismo día; el de Arkanoid,
tercero; el de Snake, cuarto, que deja a esa máquina como la única con **dos** rasgos de dibujo; y
el de Frogger, quinto y último—. La frontera está escrita en `contrato-skin.md` y es la misma del
alfa: la piel dice si hay halo, el motor dice de cuánto.
La ronda de Tetris añadió `glow()` y `noGlow()` a `lib/games.ts`, junto a `tint()`, y las de
Asteroids, Arkanoid, Snake y Frogger los importaron de ahí sin tocarlos; ninguna de las cinco
**cambió ni un hex de ninguna paleta**.

**La serie del halo está cerrada: las cinco máquinas con motor lo tienen.** Se repartió una
máquina por ronda, que es la regla de siempre, y las cinco coinciden en la forma —`glow: false`
en `clasico`, dos radios en el motor, `glowSpread()` eligiendo por la paleta y nunca por el nombre
de la piel— y difieren sólo en el número y en la unidad, que cada motor fija por lo suyo. No queda
ninguna pendiente; una máquina nueva entrará con su halo o sin él según lo pida su motor.

Arkanoid es la primera en la que el halo cae sobre **rellenos** y no sobre trazos ni celdas
sueltas, y por eso trae los dos radios más cortos del repo: lo que los fija es el surco de 6 px
que separa dos bloques contiguos.

Snake es la primera en la que el halo **funde a propósito** lo que separa dos rellenos contiguos:
su cuerpo es una cadena de celdas del mismo color y en `neon` se lee como un tubo continuo. Es la
única decisión de las cinco rondas de halo que no fue conservadora, y se explica en su bloque.

Frogger es la que **más ranuras deja fuera del halo**: nueve de diecisiete, y por tres motivos
distintos —lienzo y fondo activo, recortes del color del fondo, y señalización fija—. Es también
la única en la que el halo tenía que sobrevivir a un velo que **lleva información de juego**: los
0,75 y 0,25 de la tortuga, que se resolvieron dándole al aura el mismo `rgba` que al relleno.

## Cómo se lee la tabla

| Columna     | Qué es                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `juego`     | El `GameId` de la máquina. Sólo entran las que tienen motor en `ENGINES`                                  |
| `skin`      | `clasico`, `neon` o `retro`. Las tres son obligatorias; una cuarta se añade con su nombre                 |
| `estado`    | Uno de los siete de abajo. Vocabulario cerrado                                                            |
| `ranuras`   | Cuántas ranuras de color tiene el motor, según el inventario de la Fase 4. `—` si no se ha inventariado   |
| `cubiertas` | Cuántas cubre esta skin. Si no son todas, S1 falla y el estado no puede pasar de `sin-disenar`. `—` igual |
| `alta`      | Cuándo se dio de alta la fila, que en el modo auditoría es antes de diseñarla                             |
| `revisado`  | Última vez que se reconcilió esta fila contra el código                                                   |
| `motivo`    | Una línea. **Obligatorio** en `rechazada` y `desincronizada`, y en `sin-disenar` sólo si falla una regla  |

Los hex no caben aquí: viven en la tabla de paleta de cada máquina, en su bloque `###` bajo la
tabla grande.

## Los siete estados

| Estado           | Quién lo pone       | ¿Bloquea que se vuelva a diseñar?                                 |
| ---------------- | ------------------- | ----------------------------------------------------------------- |
| `sin-disenar`    | El agente           | No. Es el estado de arranque y el de la que falla una regla       |
| `extraida`       | El agente           | Sí. Sólo para `clasico`: son los colores del código, copiados     |
| `disenada`       | El agente           | Sí, mientras no haya veredicto humano                             |
| `aprobada`       | El usuario          | Sí. Lista para que una spec la recoja                             |
| `rechazada`      | El usuario          | No, pero al rediseñarla el agente cita la fecha y el motivo       |
| `aplicada`       | Derivado del código | Sí. El motor la tiene escrita en su `skins.ts` y se puede elegir  |
| `desincronizada` | El agente           | No, y se reporta siempre: la tabla dice una cosa y el código otra |

`sin-disenar` y `rechazada` no son lo mismo. La primera es un juicio del agente contra las
reglas de `contrato-skin.md`, y se revisa si el contrato cambia —el día que `globals.css`
estrene un neón, o que la rampa de fósforo crezca—. La segunda es voluntad humana sobre una
paleta concreta y no se revisa sola.

## Reglas de escritura

- **Nunca se borra una fila.** Una skin rechazada se queda con su estado y su motivo: eso es
  justamente la memoria.
- **Nunca se reordena la tabla.** Las altas van al final. Es lo que mantiene los conflictos de
  merge en una línea aislada.
- **Un `Edit` por fila**, y `Read` antes de cada uno: el hook de formateo del repo pasa
  Prettier tras cada escritura y realinea las columnas, así que el texto en disco no es
  exactamente el que se escribió.
- **No alinees las columnas a mano.** Prettier lo hace.
- **Sin tildes dentro de las celdas.** La prosa de fuera de las tablas sí las lleva.
- **`—` y vacío no son lo mismo.** `—` es «no se ha medido» y es lo que va en `ranuras` y
  `cubiertas` mientras no haya inventario. Una celda **vacía** es «no hay nada que decir», y
  sólo la admite `motivo`: un alta sin diseñar no falla ninguna regla, así que no hay motivo
  que citar. Ninguna otra columna se queda en blanco.
- La clave de una fila es el par `juego` + `skin`. No puede haber dos.

---

## Vestidas

**El control de un vistazo: qué máquinas llevan ya sus skins aplicadas al código.** Una fila
por máquina con motor, y se actualiza en cada ronda, aplique o no. Lo de abajo es el detalle;
esto es lo que se mira primero.

| juego     | vestida | skins                | default | aplicada   | notas                                                                                                  |
| --------- | ------- | -------------------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| asteroids | si      | clasico, neon, retro | clasico | 2026-08-13 | La primera vestida; monto la infraestructura comun. El 2026-08-15 gano el halo, en trazo               |
| tetris    | si      | clasico, neon, retro | clasico | 2026-08-13 | Segunda vestida. El 2026-08-15 estreno el halo: primera piel con rasgo de dibujo ademas de color       |
| arkanoid  | si      | clasico, neon, retro | clasico | 2026-08-13 | Block.color paso a Block.kind: el color se resuelve al dibujar. El 2026-08-15 gano el halo, en relleno |
| snake     | si      | clasico, neon, retro | clasico | 2026-08-13 | Sin ninguna fuga de color. El 2026-08-15 gano el halo: unica maquina con dos rasgos de dibujo          |
| frogger   | si      | clasico, neon, retro | clasico | 2026-08-14 | 17 ranuras, la mas vestida. El 2026-08-15 gano el halo y cerro la serie: las cinco lo llevan           |

`vestida` es `si` sólo cuando el motor tiene su `skins.ts` con las tres paletas y su
`setSkin()`; `skins`, cuáles trae; `default`, la que sale sin elegir, que es `clasico` salvo
decisión escrita; `aplicada`, la fecha. **El código manda**: si aquí pone `si` y el archivo no
está, la fila miente y se corrige en la reconciliación.

## Skins

| juego     | skin    | estado   | ranuras | cubiertas | alta       | revisado   | motivo                                                                                                                                               |
| --------- | ------- | -------- | ------- | --------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| asteroids | clasico | aplicada | 11      | 11        | 2026-08-13 | 2026-08-13 | Extraida del codigo: 5 constantes y 6 fugas. Los velos conservan su alfa                                                                             |
| asteroids | neon    | aplicada | 11      | 11        | 2026-08-13 | 2026-08-15 | Los 5 power-ups y el propulsor toman los acentos; nave, balas, rocas y polvo, la rampa de grises. Halo de 8 px                                       |
| asteroids | retro   | aplicada | 11      | 11        | 2026-08-13 | 2026-08-15 | Los 5 power-ups comparten el escalon vivo: se separan por su glifo, no por color. Halo corto de 3 px. Revisable                                      |
| tetris    | clasico | aplicada | 11      | 11        | 2026-08-13 | 2026-08-13 | Extraida del codigo: 2 constantes y 4 fugas. El brillo conserva su 0,12                                                                              |
| tetris    | neon    | aplicada | 11      | 11        | 2026-08-13 | 2026-08-15 | Siete piezas sin repetir color: 4 acentos y 3 escalones de la rampa de texto. Halo de 0,34 del lado desde el 15                                      |
| tetris    | retro   | aplicada | 11      | 11        | 2026-08-13 | 2026-08-15 | Las 7 piezas comparten el escalon vivo: se separan por su forma, no por color. Halo corto de 0,1, o se funden                                        |
| arkanoid  | clasico | aplicada | 12      | 12        | 2026-08-13 | 2026-08-13 | Extraida del codigo: 2 fugas y 10 constantes. Los 9 bloques son nombres CSS, copiados literales                                                      |
| arkanoid  | neon    | aplicada | 12      | 12        | 2026-08-13 | 2026-08-15 | Los acentos van a los bloques; paddle y bola bajan a la rampa de grises y el irrompible a line-strong. Halo de 4 px                                  |
| arkanoid  | retro   | aplicada | 12      | 12        | 2026-08-13 | 2026-08-15 | Rompibles en medio y multi-golpe tambien: la cuenta de golpes la comunica el globalAlpha. Halo corto de 2 px. Revisable                              |
| snake     | clasico | aplicada | 5       | 5         | 2026-08-13 | 2026-08-13 | Extraida del codigo: las 5 ranuras estaban en `constants.ts`, sin una sola fuga. La rejilla conserva su alfa 0,1                                     |
| snake     | neon    | aplicada | 5       | 5         | 2026-08-13 | 2026-08-15 | SPEC 10 ya la pinto con tokens del vault: solo cambia la rejilla, de cian a `--av-amber`. Halo de 8 px: cuerpo en tubo                               |
| snake     | retro   | aplicada | 5       | 5         | 2026-08-13 | 2026-08-15 | Cuerpo medio, cabeza y fruta vivo, rejilla tenue. Sin atlas (S7). Halo corto de 3 px, o el aura se come la cabeza                                    |
| frogger   | clasico | aplicada | 17      | 17        | 2026-08-14 | 2026-08-14 | Extraida del codigo: 15 constantes y 2 fugas. Los nueve velos conservan su alfa, que paso a `── Velos ──`                                            |
| frogger   | neon    | aplicada | 17      | 17        | 2026-08-14 | 2026-08-15 | Reparto por familias: magenta lo que mata, cian lo que sostiene, amarillo lo tuyo y el ambar para la dama-rana. Halo de 6 px, en 8 de las 17 ranuras |
| frogger   | retro   | aplicada | 17      | 17        | 2026-08-14 | 2026-08-15 | Tortuga a flote viva contra sumergida media, separadas tambien por el velo. La dama baja a tenue: se pinta encima. Halo corto de 3 px, o se funden   |

## Paletas

Un bloque `### <juego>` por máquina, con su tabla de ranura × skin. Las escribe el agente en
la Fase 6, con el identificador del código en la primera columna —`COLOR_BODY`,
`entities.ts:57 ENTITY_COLOR`— para que implementarlas luego sea mecánico.

<!--
Formato de cada bloque:

### snake

| ranura      | que pinta            | clasico   | neon      | retro     |
| ----------- | -------------------- | --------- | --------- | --------- |
| `COLOR_BG`  | El fondo del tablero | `#0a0a0f` | `#0a0a0f` | `#001100` |
-->

### asteroids

**Aplicada el 2026-08-13, y ampliada con el halo el 2026-08-15.** Espejo de
`lib/games/asteroids/skins.ts`; si algun dia discrepan, gana el archivo. La primera columna trae el identificador de hoy —la propiedad de `Palette`— y
la segunda, de donde salio el hex de `clasico` antes de vestir la maquina. **Seis de las once
ranuras eran fugas** fuera de `constants.ts`, que es justo lo que una auditoria a ojo se deja.

| ranura     | de donde salia                   | que pinta                             | clasico   | neon      | retro     |
| ---------- | -------------------------------- | ------------------------------------- | --------- | --------- | --------- |
| `bg`       | fuga `index.ts:338`              | El lienzo, opaco cada frame           | `#000`    | `#0a0a0f` | `#001100` |
| `ship`     | fuga `entities.ts:208`           | La silueta de la nave                 | `#fff`    | `#c9cfdd` | `#33ff33` |
| `bullet`   | fuga `entities.ts:59`            | Sus balas                             | `#fff`    | `#e7ebf5` | `#33ff33` |
| `thruster` | fuga `entities.ts:227`           | La llama del propulsor (velo 0,85)    | `#ff8200` | `#ff9d4d` | `#116611` |
| `asteroid` | fuga `entities.ts:119`           | El poligono de la roca, los 3 tamanos | `#fff`    | `#9aa2b4` | `#22aa22` |
| `particle` | fuga `entities.ts:265`           | El polvo de la explosion (velo vivo)  | `#ffffff` | `#6f7686` | `#116611` |
| `triple`   | `constants.ts:25` `PU_COLOR`     | Rombo con abanico, y su barra del HUD | `#0ff`    | `#00f5ff` | `#33ff33` |
| `shield`   | `constants.ts:30` `SHIELD_COLOR` | Anillo doble, y el que rodea la nave  | `#8cf`    | `#e7ebf5` | `#33ff33` |
| `slow`     | `constants.ts:37` `SLOW_COLOR`   | El reloj con manecillas               | `#fd4`    | `#f5ff00` | `#33ff33` |
| `hyper`    | `constants.ts:50` `HYPER_COLOR`  | El doble chevron                      | `#5f8`    | `#ff9d4d` | `#33ff33` |
| `nova`     | `constants.ts:56` `NOVA_COLOR`   | El estallido radial de ocho rayos     | `#f55`    | `#ff006e` | `#33ff33` |
| `glow`     | nuevo, 2026-08-15                | Si las entidades salen con halo       | `false`   | `true`    | `true`    |

`thruster` y `particle` son **velos**: el 0,85 de la llama y el desvanecido del polvo siguen
siendo del motor, que monta el `rgba` con `tint()`. Por eso esas dos van en `#rrggbb` de seis
digitos, que es lo unico que `tint()` acepta, y por eso `particle` es `#ffffff` y no `#fff`.

`glow` no es un color y no cuenta como ranura, igual que el de Tetris: las ranuras siguen siendo
once y las tres pieles las cubren enteras. **Se anadio el 2026-08-15 y no cambio ni un hex de
esta tabla.** Cae sobre un motor de vectores, asi que lo que se ilumina no son rellenos sino
trazos de 1,5 px —1 en la particula—, y la geometria no se toca: el `shadowBlur` se enciende
antes del trazo y se suelta despues, y nada mas.

**Seis entidades lo llevan y dos cosas del canvas no.** Los cinco `draw()` de `entities.ts`
—bala, asteroide, nave con su llama, particula y power-up— y el anillo del escudo de
`index.ts:325`, que es la sexta porque necesita el `Run` entero y pinta la **misma ranura** que
el icono del power-up: sin el, el escudo activo se veria plano al lado del que aun esta por
recoger. Se quedan fuera el `fillRect` del lienzo, que con halo mancharia el frame entero, y las
cuatro barras de power-up, que son HUD dentro del canvas y no entidades. Ninguno de los dos
necesita apagar nada: **cada entidad suelta su halo en la misma funcion que lo encendio**, asi
que el contexto llega limpio al frame siguiente.

**El radio es del motor, y son dos.** La piel dice si hay halo; cuanto mide lo deciden dos
constantes de `entities.ts`, y van **en pixeles** y no en fraccion de nada —al reves que las de
Tetris—: alli la unidad natural era el lado de la celda, que cambia entre el tablero y la banda,
y aqui el mundo mide siempre `W × H` y ninguna entidad se escala. Lo que manda el radio tampoco
es el tamano de la entidad sino el **grosor del trazo**, que es el mismo para todas.

| Radio             | Valor | Para que                                     |
| ----------------- | ----- | -------------------------------------------- |
| `GLOW_BLUR`       | 8 px  | Pieles que separan las entidades por tinte   |
| `GLOW_BLUR_TIGHT` | 3 px  | Pieles que las separan por escalon de brillo |

`glowSpread()` no elige por el nombre de la piel —a `draw()` llega una `Palette` y nunca un
`SkinId`, asi que ni podria— sino mirando si **los cinco power-ups comparten color**. Es el mismo
indicador que usa Tetris con sus siete piezas: una piel que ha tenido que darles a los cinco el
mismo hex es una piel sin tintes libres, y en ella lo que separa las entidades es el brillo. Una
cuarta piel monocroma se resolveria sola.

Tres decisiones que un humano puede revertir en modo veredicto:

- **`neon`**: la nave no se lleva un acento. Hay cinco power-ups y solo cuatro acentos `--av-*`,
  asi que los acentos son de los items y el jugador baja a la rampa de grises. Es ademas lo mas
  fiel, porque nave y asteroides ya eran los dos `#fff`. El propulsor y la hiperpropulsion
  comparten el ambar a proposito: no son dos cosas que haya que separar, y al recoger el item la
  llama arde de su color.
- **`retro`**: los cinco power-ups comparten el escalon vivo. **No es un choque de S3 sin
  resolver**: el motor dibuja un glifo distinto por tipo —anillo doble, reloj, chevrones,
  estallido, rombo— y cada barra del HUD lleva su rotulo escrito, asi que el color nunca es la
  unica senal. Lo que si queda separado por color es la distincion critica: vivo lo tuyo y lo
  que quieres coger, medio lo que te mata, tenue lo que solo decora.
- **El halo de `retro` es mas corto que el de `neon`, y esa es la decision de la ronda.** Con los
  8 px de `neon`, el aura de un `#33ff33` que pase cerca de un `#22aa22` lo empuja hacia arriba y
  borra el escalon: una roca a punto de tocarte se leeria como parte de tu propia nave, y ahi si
  habria choque de S3, porque en monocromo el brillo es lo unico que las separa. Con 3 px el
  sangrado se apaga pegado al trazo. Es ademas lo fisicamente cierto: un fosforo verde sangra
  corto y un letrero de neon sangra amplio. Y los 8 px de `neon` tienen su propio techo, que es
  la nave: mide 18 px entre las puntas de las alas, asi que con mas radio las auras de sus dos
  bordes se cruzarian por dentro y el triangulo se rellenaria de luz en vez de quedarse hueco.

### tetris

**Aplicada el 2026-08-13, y ampliada con el halo el 2026-08-15.** Espejo de
`lib/games/tetris/skins.ts`; si algun dia discrepan, gana el archivo. La primera columna trae el identificador de hoy —la propiedad de `Palette`— y la
segunda, de donde salio el hex de `clasico` antes de vestir la maquina. **Cuatro de las once
ranuras eran fugas** fuera de `constants.ts`, y una quinta, `GRID_COLOR`, estaba declarada pero
pintaba dos cosas en sitios distintos.

| ranura      | de donde salia                   | que pinta                               | clasico   | neon      | retro     |
| ----------- | -------------------------------- | --------------------------------------- | --------- | --------- | --------- |
| `bg`        | fuga `index.ts:393`              | El lienzo, opaco cada frame             | `#000`    | `#0a0a0f` | `#001100` |
| `pieces[1]` | `constants.ts:42` `COLORS[1]`    | Tetromino I                             | `#4dd0e1` | `#00f5ff` | `#33ff33` |
| `pieces[2]` | `constants.ts:43` `COLORS[2]`    | Tetromino O                             | `#ffd54f` | `#f5ff00` | `#33ff33` |
| `pieces[3]` | `constants.ts:44` `COLORS[3]`    | Tetromino T                             | `#ba68c8` | `#ff006e` | `#33ff33` |
| `pieces[4]` | `constants.ts:45` `COLORS[4]`    | Tetromino S                             | `#81c784` | `#e7ebf5` | `#33ff33` |
| `pieces[5]` | `constants.ts:46` `COLORS[5]`    | Tetromino Z                             | `#e57373` | `#9aa2b4` | `#33ff33` |
| `pieces[6]` | `constants.ts:47` `COLORS[6]`    | Tetromino J                             | `#64b5f6` | `#6f7686` | `#33ff33` |
| `pieces[7]` | `constants.ts:48` `COLORS[7]`    | Tetromino L                             | `#ffb74d` | `#ff9d4d` | `#33ff33` |
| `grid`      | `constants.ts:52` `GRID_COLOR`   | Rejilla interior y linea de la banda    | `#22222e` | `#3d4350` | `#116611` |
| `label`     | fuga `index.ts:77` `LABEL_COLOR` | El rotulo `SIG.` de la banda derecha    | `#8b8b99` | `#8f97a8` | `#22aa22` |
| `gloss`     | fuga `board.ts:103`              | Banda de brillo de la celda (velo 0,12) | `#ffffff` | `#e7ebf5` | `#33ff33` |
| `glow`      | nuevo, `game.js:1020`            | Si la celda se pinta con halo           | `false`   | `true`    | `true`    |

`gloss` es un **velo**: el 0,12 sigue siendo del motor, que monta el `rgba` con `tint()`, y por
eso va en `#rrggbb` de seis digitos. El `GHOST_ALPHA` de 0,2 de la proyeccion no es ranura: usa
el color de su propia pieza.

`glow` no es un color y no cuenta como ranura, igual que el `useAtlas` de Snake: las ranuras
siguen siendo once y las tres pieles las cubren enteras. **Se anadio el 2026-08-15 y no cambio
ni un hex de esta tabla.** Sale del `drawBlockNeon` del original —lo unico de su sistema de
skins que el vault no tenia ya con otro nombre—: inset de 2 px en vez de 1, resplandor del
propio color de la pieza y sin banda de brillo. Sus hex (`#18ffff`, `#e040fb`, `#00e676`) se
quedaron fuera a proposito: no son tokens `--av-*` y copiarlos rompia S5. Lo que se copio es el
rasgo, no la paleta.

**Con halo, `gloss` deja de pintarse.** La ranura sigue en las tres columnas —S1 pide la tabla
completa, no que cada celda llegue al canvas— pero solo la usa `clasico`. En `neon` el volumen
lo da el resplandor, y en `retro` esa banda ya estaba de adorno: `gloss` valia `#33ff33`, el
mismo color que la celda.

**El radio es del motor, y son dos.** La piel dice si hay halo; cuanto mide lo decide
`board.ts` en fraccion del lado de la celda, que son 30 px:

| Radio               | Valor | Con `BLOCK` 30 | Para que                                     |
| ------------------- | ----- | -------------- | -------------------------------------------- |
| `GLOW_SPREAD`       | 0,34  | 10,2 px        | Pieles cuyas piezas se distinguen por color  |
| `GLOW_SPREAD_TIGHT` | 0,1   | 3 px           | Pieles cuyas siete piezas comparten un color |

`board.ts` no elige por el nombre de la piel sino mirando la paleta: si las siete piezas son
del mismo color, radio corto. Lo que obliga a acortarlo no es que la piel se llame `retro`, es
que sus piezas sean identicas, asi que una cuarta piel monocroma se resolveria sola.

Tres decisiones que un humano puede revertir en modo veredicto:

- **`neon`**: siete piezas y solo cuatro acentos `--av-*`, asi que las tres restantes bajan a la
  rampa de texto del tema —`#e7ebf5`, `#9aa2b4`, `#6f7686`—, que son tokens igual de legitimos.
  Con eso ninguna pieza repite color. Los cuatro acentos van a las cuatro que ya tiraban a ese
  tono: I al cian, O al amarillo, T al magenta y L al ambar.
- **`retro`**: las siete piezas comparten el escalon vivo. **No es un choque de S3 sin
  resolver**: el color de un tetromino no lleva informacion de juego —no hay combos por tinte ni
  bloques especiales— y se identifica por su forma, que es lo que un tetromino es. Lo que si
  queda separado es lo que decide la partida: celda ocupada contra vacia por el margen —de 2 px
  desde que hay halo, antes 1—, y la proyeccion contra el tablero por su alfa. Efecto colateral
  asumido: la banda de brillo desaparece, porque en la rampa de fosforo no hay blanco y S6 no
  admite inventarlo. Desde el 2026-08-15 ese volumen lo devuelve el halo, que si cabe en la
  rampa: es el color de la propia pieza.
- **El halo de `retro` es mas corto que el de `neon`, y esa es la decision de la ronda.** Con el
  radio de `neon` —10,2 px sobre un surco de 4— dos piezas contiguas se fundirian en una mancha
  verde, y ahi si habria choque de S3: con las siete del mismo `#33ff33`, el surco de fondo es lo
  unico que separa una pieza de la de al lado. Con 3 px cada borde aporta menos de una decima
  parte de su brillo en el centro del surco y la silueta del monton se sigue leyendo. Es ademas
  lo fisicamente cierto: el sangrado de un CRT verde es corto y pegado al trazo, y el de un
  letrero de neon es amplio. Y el inset de 2 px juega a favor, porque ensancha ese surco de 2 px
  a 4: la separacion neta sale mejor que la que habia sin halo.

### arkanoid

**Aplicada el 2026-08-13, y ampliada con el halo el 2026-08-15.** Espejo de
`lib/games/arkanoid/skins.ts`; si algun dia discrepan,
gana el archivo. La primera columna trae el identificador de hoy —la propiedad de `Palette`— y
la segunda, de donde salia el hex de `clasico` antes de vestir la maquina. **Los nueve bloques
eran nombres de color CSS y no hexadecimales**, heredados del original, que guardaba ahi el
nombre del recorte de su spritesheet: se copian tal cual, porque convertirlos seria un rediseno.

| ranura        | de donde salia                     | que pinta                              | clasico   | neon      | retro     |
| ------------- | ---------------------------------- | -------------------------------------- | --------- | --------- | --------- |
| `bg`          | `constants.ts:32` `BACKGROUND`     | El lienzo, opaco cada frame            | `#12122b` | `#0a0a0f` | `#001100` |
| `paddle`      | fuga `entities.ts:57` (usada :281) | La pala del jugador                    | `#fff`    | `#c9cfdd` | `#33ff33` |
| `ball`        | fuga `entities.ts:57` (usada :286) | La bola                                | `#fff`    | `#e7ebf5` | `#33ff33` |
| `blocks.r`    | `constants.ts:107` `COLOR_MAP.r`   | Bloque de un golpe, rojo               | `red`     | `#ff9d4d` | `#22aa22` |
| `blocks.y`    | `constants.ts:108` `COLOR_MAP.y`   | Bloque de un golpe, amarillo           | `yellow`  | `#f5ff00` | `#22aa22` |
| `blocks.c`    | `constants.ts:109` `COLOR_MAP.c`   | Bloque de un golpe, cian               | `cyan`    | `#00f5ff` | `#22aa22` |
| `blocks.m`    | `constants.ts:110` `COLOR_MAP.m`   | Bloque de un golpe, magenta            | `magenta` | `#ff006e` | `#22aa22` |
| `blocks.h`    | `constants.ts:111` `COLOR_MAP.h`   | Bloque de un golpe, rosa               | `hotpink` | `#9aa2b4` | `#22aa22` |
| `blocks.g`    | `constants.ts:112` `COLOR_MAP.g`   | Bloque de un golpe, verde              | `green`   | `#6f7686` | `#22aa22` |
| `blocks.a`    | `constants.ts:113` `COLOR_MAP.a`   | Gris irrompible: rebota y no cae       | `gray`    | `#4a5160` | `#116611` |
| `blocks["2"]` | `constants.ts:122` `HP_COLOR[2]`   | Bloque de 2 golpes (velo por desgaste) | `cyan`    | `#00f5ff` | `#22aa22` |
| `blocks["3"]` | `constants.ts:123` `HP_COLOR[3]`   | Bloque de 3 golpes (velo por desgaste) | `magenta` | `#ff006e` | `#22aa22` |
| `glow`        | nuevo, 2026-08-15                  | Si rejilla, pala y bola salen con halo | `false`   | `true`    | `true`    |

Los nueve bloques son **velos**: el desgaste se dibuja con
`globalAlpha = 0.4 + 0.6 * (hp / maxHp)` y eso lo sigue decidiendo el motor. La piel solo pone
el color con el que se pinta antes de aplicarlo.

`glow` no es un color y no cuenta como ranura, igual que el de Tetris y el de Asteroids: las
ranuras siguen siendo doce y las tres pieles las cubren enteras. **Se anadio el 2026-08-15 y no
cambio ni un hex de esta tabla.** Es la tercera maquina que lo estrena y la primera en la que el
halo cae sobre **rellenos** y no sobre trazos: el bloque y la pala son `fillRect` y la bola un
`arc` relleno, asi que el aura sale entera hacia fuera del borde en vez de repartirse a los dos
lados de un trazo. La referencia mas cercana era el bloque de Tetris, no la nave de Asteroids.

**Lo llevan las tres cosas que se pintan y el fondo no.** `drawBlocks`, `drawPaddle` y
`drawBall`, que son los tres puntos de dibujo de `entities.ts` y ya recibian la paleta; el
`fillStyle = palette.bg` de `index.ts:259` se queda fuera, porque el halo de un `fillRect` que
cubre el mundo mancharia el frame entero. En `drawBlocks` el halo se enciende **dentro** del
`save()`/`restore()` que ya fijaba el `globalAlpha` del desgaste: sale del mismo estado, asi que
un bloque golpeado tiene el aura igual de apagada que el relleno y se sigue leyendo mas tenue que
uno intacto, y ese mismo `restore()` es quien lo suelta. La pala y la bola no tienen `restore()`,
asi que llaman a `noGlow()` en la misma funcion que lo encendio.

**El radio es del motor, y son dos.** La piel dice si hay halo; cuanto mide lo deciden dos
constantes de `entities.ts`, y van **en pixeles** como las de Asteroids y al reves que las de
Tetris: alli la unidad natural era el lado de la celda, que cambia entre el tablero y la banda de
la siguiente, y aqui el mundo mide siempre 800 × 600 y nada se escala —el bloque es de 66,6 × 24,
la pala de 162 × 14 y la bola de radio 8, y ninguno depende de nada—. Una fraccion del tamano de
la entidad repartiria ademas al reves de lo que conviene: el radio mas largo para el bloque, que
es el unico con vecinos pegados, y el mas corto para la bola, que va suelta.

| Radio             | Valor | Para que                                          |
| ----------------- | ----- | ------------------------------------------------- |
| `GLOW_BLUR`       | 4 px  | Pieles cuya rejilla se distingue por tinte        |
| `GLOW_BLUR_TIGHT` | 2 px  | Pieles cuyos bloques rompibles comparten un color |

Lo que fija los dos numeros es **el surco de 6 px entre dos bloques contiguos**, que son `GAP_X`
y `GAP_Y` de `constants.ts` y es el hueco mas exigente del vault: en Tetris el hueco que habia
que respetar era una celda vacia de 30 px, y aqui la rejilla es continua y de diez columnas. Con
4 px cada bloque aporta menos de un 7% de su brillo en el centro del surco y la cuadricula se
sigue leyendo; con 6 ya son casi dos decimas por lado y las diez columnas se funden en una banda.
Por eso el radio de `neon` es la mitad que el de Asteroids, donde la mitad del aura caia dentro
del propio trazo.

`glowSpread()` no elige por el nombre de la piel —a las funciones de dibujo llega una `Palette` y
nunca un `SkinId`, asi que ni podria— sino mirando si **los ocho tipos rompibles comparten
color**. El irrompible queda fuera de la comparacion a proposito: es contra el que se contrasta,
no uno de los comparados. Es el mismo indicador que usan Tetris con sus siete piezas y Asteroids
con sus cinco power-ups, y una cuarta piel monocroma se resolveria sola. El mismo radio vale para
las tres cosas que se pintan: la pala y la bola no imponen restriccion propia, pero la bola
**cruza la rejilla**, asi que su aura cae en los mismos surcos y no puede ser mas larga que la
que ellos toleran.

**El color se resuelve al dibujar, no al construir el nivel.** `buildLevel()` guardaba el color
ya resuelto dentro de cada `Block`, asi que cambiar de piel habria dejado la rejilla en curso
con los colores viejos hasta el nivel siguiente. `Block.color` paso a ser `Block.kind`, la celda
de la rejilla, y `BLOCK_KINDS` vive en `constants.ts` porque es vocabulario de nivel, no color.

Tres decisiones que un humano puede revertir en modo veredicto:

- **`neon`**: los cuatro acentos van a los bloques y el jugador baja a la rampa de grises, igual
  que la nave de Asteroids. Los dos multi-golpe conservan el cian y el magenta que ya tenian.
  `blocks.c` comparte cian con `blocks["2"]` y `blocks.m` magenta con `blocks["3"]`, y no es un
  choque de S3: las letras `c` y `m` solo salen en los niveles 1-3 y los multi-golpe aparecen a
  partir del 4, asi que nunca coinciden en pantalla. El peor frame real es el nivel 3, con cinco
  tintes de un golpe, y ahi los cinco son distintos.
- **`retro`**: los bloques de un golpe y los multi-golpe comparten el escalon medio. La
  distincion critica —rompible contra gris irrompible— si queda separada por color, y la cuenta
  de golpes la comunica el `globalAlpha` que el motor ya modula al golpear. Subir los multi-golpe
  a vivo los igualaria a la bola, que es lo unico que se solapa con la rejilla.
- **El halo de `retro` es la mitad que el de `neon`, y esa es la decision de la ronda.** En
  monocromo el irrompible esta a un solo escalon de los rompibles —`#116611` contra `#22aa22`— y
  esos dos se tocan de verdad: el nivel 9 alterna `3a3a3a3a3a`, asi que cada irrompible lleva un
  rompible pegado a cada lado, y el nivel 7 hace lo mismo con `22aa22aa22`. Con los 4 px de `neon`
  el aura del vecino invade el borde del gris y lo empuja hacia el escalon medio, y ahi si habria
  choque de S3: **rompible contra irrompible es la distincion que decide la partida**, porque de
  ella depende si una pantalla se puede despejar. Con 2 px el sangrado muere dentro del surco. Es
  ademas lo fisicamente cierto, que es el mismo motivo que ya cerro las rondas de Tetris y
  Asteroids: un fosforo verde sangra corto y un letrero de neon sangra amplio.

### snake

**Aplicada el 2026-08-13, y ampliada con el halo el 2026-08-15.** Espejo de
`lib/games/snake/skins.ts`; si algun dia discrepan, gana
el archivo. La primera columna trae el identificador de hoy —la propiedad de `Palette`— y la
segunda, de donde salio el hex de `clasico` antes de vestir la maquina. **Las cinco ranuras
estaban en `constants.ts`**: Snake es el unico de los cuatro motores sin una sola fuga.

| ranura     | de donde salia                           | que pinta                           | clasico   | neon      | retro     |
| ---------- | ---------------------------------------- | ----------------------------------- | --------- | --------- | --------- |
| `bg`       | `constants.ts:57` `COLOR_BG`             | El lienzo, opaco cada frame         | `#0a0a0f` | `#0a0a0f` | `#001100` |
| `grid`     | `constants.ts:69` `COLOR_GRID`           | Las lineas de la rejilla (velo 0,1) | `#00f5ff` | `#ff9d4d` | `#116611` |
| `body`     | `constants.ts:59` `COLOR_BODY`           | Los segmentos, menos la cabeza      | `#00f5ff` | `#00f5ff` | `#22aa22` |
| `head`     | `constants.ts:60` `COLOR_HEAD`           | La cabeza, que es `cells[0]`        | `#f5ff00` | `#f5ff00` | `#33ff33` |
| `fruit`    | `constants.ts:67` `COLOR_FRUIT_FALLBACK` | La fruta como circulo plano         | `#ff006e` | `#ff006e` | `#33ff33` |
| `useAtlas` | `index.ts:266` `atlas.ready()`           | Si la fruta usa `fruits.png`        | `true`    | `false`   | `false`   |
| `glow`     | nuevo, 2026-08-15                        | Si serpiente y fruta salen con halo | `false`   | `true`    | `true`    |

`grid` es un **velo**: el 0,1 sigue siendo del motor, que monta el `rgba` con `tint()` y por eso
va en `#rrggbb` de seis digitos. Con `clasico` sale exactamente el `rgba(0,245,255,0.1)` de
SPEC 10, hex a hex.

`useAtlas` no es un color y es la unica desviacion de la receta: **el atlas no se recolorea
nunca** (S7), asi que `neon` y `retro` se caen al circulo plano de `fruit`, que es el camino que
el motor ya tenia escrito para cuando la imagen no carga. Sin eso `retro` ensenaria una manzana
roja sobre fosforo verde (S6) y `neon` traeria 22 hex fuera de `--av-*` (S5). No cambia la
celda, el tamano ni la hitbox de la fruta.

`glow` es el **segundo** rasgo de dibujo de esta maquina, y con el Snake es la unica que tiene
dos. Tampoco es un color y tampoco cuenta como ranura: siguen siendo cinco y las tres pieles las
cubren enteras. **Se anadio el 2026-08-15 y no cambio ni un hex de esta tabla.** Lo llevan las dos
entidades que se pintan —los segmentos de `Snake.draw()` y el circulo de `Fruit.draw()`— y no lo
llevan el lienzo, que con halo mancharia el frame entero, ni la rejilla, que es fondo activo bajo
un velo 0,1 y cuyo cometido es quedarse detras. Cada `draw()` suelta su halo antes de devolver,
asi que el contexto llega limpio al siguiente y ninguna piel contamina la rejilla del frame que
viene.

**El atlas nunca lleva halo, y se comprobo.** `drawImage` hereda el `shadowBlur` del contexto
igual que un `fillRect`, asi que un aura encendida al llegar ahi saldria pegada al recorte y eso
seria anadirle algo al asset (S7). Hoy no puede pasar —`clasico` es la unica piel con `useAtlas`
y es la unica sin `glow`—, pero la proteccion no depende de esa coincidencia: la rama del atlas de
`Fruit.draw()` **no enciende nada**, y el contexto le llega limpio porque nadie deja el halo
encendido entre funciones. Una cuarta piel que juntara `useAtlas: true` y `glow: true` pintaria su
fruta del atlas sin aura, que es lo correcto, y su circulo de respaldo con ella.

**El radio es del motor, y son dos.** La piel dice si hay halo; cuanto mide lo deciden dos
constantes de `entities.ts`, y van **en pixeles** como las de Asteroids y Arkanoid y al reves que
las de Tetris. Aqui `CELL` son 32 px fijos y nada se escala —no hay banda de la siguiente pieza
que cambie de tamano—, pero el motivo de fondo es otro: lo que el radio tiene que medir no es la
celda sino el **surco entre dos segmentos contiguos**, que son los 4 px de `INSET * 2`. Ese numero
no depende de `CELL` —si el inset subiera a 3, el surco cambiaria con la celda intacta—, asi que
escribirlo como fraccion de la celda seria atarlo a lo que no manda.

| Radio             | Valor | Para que                                     |
| ----------------- | ----- | -------------------------------------------- |
| `GLOW_BLUR`       | 8 px  | Pieles que separan cabeza y cuerpo por tinte |
| `GLOW_BLUR_TIGHT` | 3 px  | Pieles que las separan por escalon de brillo |

`glowSpread()` no elige por el nombre de la piel —a `draw()` llega una `Palette` y nunca un
`SkinId`— sino mirando si **la cabeza y la fruta comparten color**. Es el mismo indicador que usan
Tetris con sus siete piezas, Asteroids con sus cinco power-ups y Arkanoid con sus ocho rompibles:
Snake solo tiene tres entidades de color, y una piel que ha tenido que darle el mismo hex a las
dos que el jugador persigue es una piel sin tintes libres, o sea una que separa por brillo. La
limitacion conocida queda escrita en el codigo: una cuarta piel que separase cabeza y fruta por
tinte pero dejase la cabeza a un escalon del cuerpo se llevaria el radio largo y habria que
revisarla a mano.

Tres decisiones que un humano puede revertir en modo veredicto:

- **`neon` cambia una sola ranura.** SPEC 10 ya pinto Snake con tokens del vault, asi que su
  `clasico` era casi esta piel; el contrato lo avisa y no es un error. Lo que se corrige es la
  rejilla, que era el mismo cian del cuerpo separado solo por el alfa: aqui toma el `--av-amber`,
  el cuarto acento y el unico que la maquina no usaba.
- **`retro`: cabeza y fruta comparten el escalon vivo.** No es un choque de S3 sin resolver: son
  un cuadrado con inset y un circulo de radio 0,35, nunca coinciden en la misma celda —comerla la
  muda— y confundirlas no cuesta una vida. Lo separado por color es lo que mata: el cuerpo va en
  medio y la cabeza en vivo. La rejilla en tenue bajo el velo 0,1 queda muy discreta; subirla a
  `#33ff33` es un cambio de una linea.
- **En `neon` el cuerpo se lee como un tubo y en `retro` como una cadena, y esa es la decision de
  la ronda del halo.** El caso critico de esta maquina no se parece a los de las otras tres: los
  segmentos son celdas contiguas **del mismo color**, y lo unico que los separa son los 4 px de
  surco que deja el `INSET` de 2. Con los 8 px de `neon` ese surco se llena y la serpiente sale de
  una pieza. **Se decidio fundirlo a proposito**, y por dos motivos: el surco no es hueco jugable
  —dos celdas contiguas ocupadas matan las dos y no dejan paso entre ellas, al reves que la celda
  vacia de Tetris o el surco de Arkanoid, por donde pasa la bola—, y el hueco que un jugador de
  Snake si lee es el de una celda libre, 36 px de luz entre los dos rellenos que la rodean, que con
  8 px por lado conserva 20 px de fondo intacto en el centro. En `neon` la cabeza es amarilla sobre
  un cuerpo cian, asi que el tubo no se traga la unica senal de direccion que hay. En `retro` si se
  la tragaria: cabeza y cuerpo estan a un solo escalon —`#33ff33` sobre `#22aa22`— y siempre se
  tocan, porque el segundo eslabon nace pegado. Por eso alli el radio baja a 3 px, muere dentro del
  surco y la cadena aguanta. Quien prefiera la cadena tambien en `neon` solo tiene que bajar
  `GLOW_BLUR`; con 3 px se comporta como las otras tres maquinas.

### frogger

**Aplicada el 2026-08-14, y ampliada con el halo el 2026-08-15.** Espejo de
`lib/games/frogger/skins.ts`; si algun dia discrepan, gana
el archivo. La primera columna trae el identificador de hoy —la propiedad de `Palette`— y la
segunda, de donde salio el hex de `clasico` antes de vestir la maquina. **Diecisiete ranuras: la
maquina mas vestida del vault**, y dos de ellas eran fugas escritas a mano en `entities.ts`.

| ranura         | de donde salia                           | que pinta                                 | clasico   | neon      | retro     |
| -------------- | ---------------------------------------- | ----------------------------------------- | --------- | --------- | --------- |
| `road`         | `constants.ts:141` `COLOR_ROAD`          | El asfalto, y con el el lienzo            | `#0a0a0f` | `#0a0a0f` | `#001100` |
| `laneLine`     | `constants.ts:142` `COLOR_LANE_LINE`     | Marcas entre carriles (velo 0,16)         | `#ff006e` | `#ff006e` | `#116611` |
| `water`        | `constants.ts:143` `COLOR_WATER`         | La franja del rio (velo 0,10)             | `#00f5ff` | `#00f5ff` | `#22aa22` |
| `bank`         | `constants.ts:144` `COLOR_BANK`          | Orilla, mediana y acera (velo 0,16)       | `#ff006e` | `#6f7686` | `#116611` |
| `car`          | `constants.ts:145` `COLOR_CAR`           | El coche, y la cabina del camion          | `#ff006e` | `#ff006e` | `#22aa22` |
| `truck`        | `constants.ts:146` `COLOR_TRUCK`         | La caja del camion (velo 0,7)             | `#ff006e` | `#ff006e` | `#22aa22` |
| `log`          | `constants.ts:147` `COLOR_LOG`           | El tronco del rio                         | `#00f5ff` | `#00f5ff` | `#33ff33` |
| `grain`        | fuga `entities.ts:195`                   | Vetas del tronco (velo 0,35)              | `#0a0a0f` | `#0a0a0f` | `#001100` |
| `turtle`       | `constants.ts:148` `COLOR_TURTLE`        | Tortuga a flote: sostiene (velo 0,75)     | `#00f5ff` | `#00f5ff` | `#33ff33` |
| `turtleDiving` | `constants.ts:149` `COLOR_TURTLE_DIVING` | Tortuga sumergida y su aviso (velo 0,25)  | `#00f5ff` | `#00f5ff` | `#22aa22` |
| `frog`         | `constants.ts:150` `COLOR_FROG`          | La rana, y las ya sentadas en su nicho    | `#f5ff00` | `#f5ff00` | `#33ff33` |
| `lady`         | `constants.ts:151` `COLOR_LADY`          | Dama-rana, mosca y punto de escolta       | `#ff006e` | `#ff9d4d` | `#116611` |
| `gator`        | `constants.ts:152` `COLOR_GATOR`         | Cocodrilo y serpiente (velo 0,85)         | `#f5ff00` | `#ff006e` | `#22aa22` |
| `home`         | `constants.ts:153` `COLOR_HOME`          | Marco del nicho vacio (velo 0,45)         | `#00f5ff` | `#00f5ff` | `#116611` |
| `timer`        | `constants.ts:154` `COLOR_TIMER`         | La barra del cronometro                   | `#f5ff00` | `#f5ff00` | `#116611` |
| `timerLow`     | `constants.ts:155` `COLOR_TIMER_LOW`     | La barra bajo `TIME_LOW`, y la X de morir | `#ff006e` | `#ff006e` | `#22aa22` |
| `detail`       | fuga `entities.ts:289`, `:411`, `:555`   | Ojos de las ranas y dientes del cocodrilo | `#0a0a0f` | `#0a0a0f` | `#001100` |
| `glow`         | nuevo, 2026-08-15                        | Si las entidades salen con halo           | `false`   | `true`    | `true`    |

**Nueve de las diecisiete son velos**, y ninguno es de la piel: se escribian dentro de un `rgba`
entero o como un `globalAlpha`, y hoy viven en el bloque `── Velos ──` de `constants.ts` mientras
el motor monta el `rgba` con `tint()`. Por eso la tabla va en `#rrggbb` de seis digitos y por eso
`clasico` reproduce los mismos strings que habia antes, digito a digito
—`tint("#00f5ff", 0.1)` es `rgba(0,245,255,0.1)`—.

Los dos velos de la tortuga, 0,75 y 0,25, llevan **informacion de juego** y no adorno: pisar una
sumergida mata. Por eso siguen intactos en las tres pieles y `retro` no depende solo de ellos:
tambien separa por escalon.

`glow` no es un color y no cuenta como ranura, igual que en las otras cuatro maquinas: las ranuras
siguen siendo diecisiete y las tres pieles las cubren enteras. **Se anadio el 2026-08-15 y no
cambio ni un hex de esta tabla.** Es la quinta y ultima ronda de halo del repo, y la que mas
ranuras deja fuera: **ocho lo llevan y nueve no**.

| Lo llevan (8)                                                            | No lo llevan (9)                    | Por que                                            |
| ------------------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------- |
| `car`, `truck`, `log`, `turtle`, `turtleDiving`, `frog`, `lady`, `gator` | `road`, `water`, `laneLine`, `bank` | Lienzo y fondo activo: un halo ahi mancha el frame |
|                                                                          | `grain`, `detail`                   | Recortes del color del fondo, no entidades         |
|                                                                          | `home`, `timer`, `timerLow`         | Senalizacion fija, como las barras de Asteroids    |

Los tres motivos son distintos y ninguno es estetico. El **lienzo** ya lo tenian prohibido las
cuatro rondas anteriores, y aqui el asfalto `road` es ademas el fondo de todo el mundo; el agua es
un `fillRect` de cinco filas. Los **recortes** —vetas del tronco, ojos de las dos ranas, dientes
del cocodrilo— valen el mismo hex que el fondo en las tres pieles, asi que su aura solo serviria
para comerse por dentro el relleno que los rodea. Y la **senalizacion fija** repite el precedente
de Asteroids, que dejo fuera sus cuatro barras de potenciador por ser HUD dentro del canvas: aqui
son el marco del nicho, la barra del cronometro y la X de la muerte.

**El halo de un velo toma el mismo `rgba` que el relleno, nunca el hex opaco.** Es el precedente
de la llama y el polvo de Asteroids, y aqui deja de ser un detalle: de los nueve velos, cuatro
llevan halo —`truck` 0,7, `turtle` 0,75, `turtleDiving` 0,25 y `gator` 0,85— y su aura se pinta
con la misma transparencia que el cuerpo.

**La comprobacion de la ronda son las dos tortugas, y sale limpia.** El aura de la hundida se
pinta a 0,25 y la de la que flota a 0,75, asi que la distancia entre las dos es exactamente la que
habia sin halo: en `retro`, ademas, la hundida es media y la que flota viva, o sea que el aura
hereda tambien el escalon. Con el hex opaco habria pasado lo contrario —un aura solida alrededor
de un cuerpo translucido— y la sumergida habria **subido** de brillo justo en el frame en el que
tiene que apagarse: el peor choque de S3 de la serie. Hay dos protecciones mas que ya estaban: la
cabeza solo se dibuja mientras sostiene, y las celdas de una misma balsa comparten estado, asi que
una hundida nunca tiene una a flote pegada —dos entidades del mismo carril las separan unos 90 px
de agua, no los 12 del surco entre caparazones—.

**El radio es del motor, y son dos.** La piel dice si hay halo; cuanto mide lo deciden dos
constantes de `entities.ts`, y van **en pixeles** como las de Asteroids, Arkanoid y Snake y al
reves que las de Tetris. El mundo mide siempre 600 × 520 y nada se escala, pero el motivo de fondo
es el de siempre: lo que el radio tiene que respetar no es el tamano de la entidad sino **el hueco
que el dibujo deja a su alrededor**, y ese hueco esta escrito en pixeles sueltos —los `+6` y
`CELL - 12` del tronco y de la caja del camion, el `CELL / 2 - 6` del caparazon— que no cambiarian
aunque `CELL` cambiase.

| Radio             | Valor | Para que                                     |
| ----------------- | ----- | -------------------------------------------- |
| `GLOW_BLUR`       | 6 px  | Pieles que separan las amenazas por tinte    |
| `GLOW_BLUR_TIGHT` | 3 px  | Pieles que las separan por escalon de brillo |

Lo que fija los 6 px es un hueco que sale dos veces: es el margen que cada plataforma deja hasta el
borde de su fila —y por tanto la mitad de los 12 px de agua entre dos carriles de rio contiguos— y
es tambien la mitad de los 12 px de surco entre dos caparazones pegados de una misma balsa, celda
de 40 contra diametro de 28. Con 6 px el aura se apaga justo al cruzar al carril de al lado, asi
que ni la carretera ilumina la carretera de arriba ni el rio el rio, que es donde el jugador cuenta
huecos para decidir el salto; y la balsa se sigue leyendo como una fila de caparazones en vez de
fundirse en una barra, que es informacion de verdad porque cada caparazon es una celda que
sostiene. El coche es mas holgado —8 px por lado— y no impone nada.

`glowSpread()` no elige por el nombre de la piel —a `draw()` llega una `Palette` y nunca un
`SkinId`— sino mirando si **las cuatro amenazas comparten color**: coche, camion, cocodrilo y
tortuga sumergida. Es el mismo indicador que usan Tetris con sus siete piezas, Asteroids con sus
cinco power-ups, Arkanoid con sus ocho rompibles y Snake con su cabeza y su fruta, y una cuarta
piel monocroma se resolveria sola.

Cuatro decisiones que un humano puede revertir en modo veredicto:

- **`neon` arregla tres coincidencias de `clasico`.** SPEC 14 pinto Frogger con tokens del vault,
  como SPEC 10 hizo con Snake, asi que las dos pieles se parecen; lo que cambia es el reparto por
  familias —magenta lo que mata, cian lo que sostiene, amarillo lo tuyo, ambar el premio—. Con el:
  el cocodrilo y la serpiente dejan de ser del **mismo amarillo que la rana**; la dama-rana, la
  mosca y el punto de escolta dejan de ser del **mismo magenta que los coches** y toman el
  `--av-amber`, el cuarto acento que la maquina no usaba; y las tres franjas seguras bajan a
  `--av-text-dim`, porque tenirlas del magenta de la carretera decia lo contrario de lo que son.
- **`retro`: la dama-rana va en tenue, no en vivo.** Es la unica ranura que se pinta **encima de
  otra entidad viva** —la dama sobre su plataforma y el punto de escolta sobre el lomo de la
  rana—, asi que en vivo se habria borrado contra las dos. En tenue queda ademas separada del
  cocodrilo, que es la confusion que si cuesta una vida: los dos asoman en la fila de casas y uno
  premia y el otro mata. Contra el marco del nicho, tambien tenue, la separan el velo 0,45 del
  marco y su parpadeo.
- **`retro`: el cronometro se enciende al agotarse**, al reves que en las otras dos pieles.
  `timer` es tenue y `timerLow` sube a medio: en monocromo una alarma no puede cambiar de tinte,
  asi que cambia de brillo, y hacia arriba. Ese mismo medio es el de la X de la muerte, que se
  pinta sobre la rana: en vivo habria desaparecido encima de ella.
- **El halo de `retro` es la mitad que el de `neon`, y esa es la decision de la ronda.** En la
  rampa de fosforo la distincion que decide la partida esta a **un solo escalon**: la tortuga a
  flote es `#33ff33` y la hundida `#22aa22`. Con los 6 px de `neon`, el aura viva de un tronco o de
  una tortuga a flote llega al borde del carril de al lado y empuja hacia arriba la media que haya
  alli; con 3 px muere a mitad del margen de 6 y el escalon aguanta entero. Las **tres decisiones
  de arriba se comprobaron una a una y ninguna se toco**: la dama-rana sigue en tenue y su aura es
  del color del punto, no del cuerpo vivo que hay debajo, asi que no puede aclararlo; el cronometro
  se quedo **sin halo** por ser senalizacion fija, asi que su salto tenue → medio sigue siendo un
  cambio de brillo limpio y no un engorde de la barra; y la X de la muerte tampoco lo lleva, por lo
  mismo, asi que se pinta sobre la rana igual que antes. `retro` acabo exactamente donde estaba,
  solo que con 3 px de sangrado.
