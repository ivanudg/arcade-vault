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
se vistieron en tres rondas paralelas, una por máquina. **Las cuatro máquinas con motor llevan
sus tres pieles aplicadas**, así que las doce filas están en `aplicada` y ninguna tiene todavía
veredicto humano: aplicada no es aprobada.

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

| juego     | vestida | skins                | default | aplicada   | notas                                                                    |
| --------- | ------- | -------------------- | ------- | ---------- | ------------------------------------------------------------------------ |
| asteroids | si      | clasico, neon, retro | clasico | 2026-08-13 | La primera vestida; montó la infraestructura comun                       |
| tetris    | si      | clasico, neon, retro | clasico | 2026-08-13 | Segunda vestida; la infraestructura ya estaba y no se toco               |
| arkanoid  | si      | clasico, neon, retro | clasico | 2026-08-13 | Block.color paso a Block.kind: el color se resuelve al dibujar           |
| snake     | si      | clasico, neon, retro | clasico | 2026-08-13 | Sin ninguna fuga de color. `neon` y `retro` renuncian al atlas de frutas |

`vestida` es `si` sólo cuando el motor tiene su `skins.ts` con las tres paletas y su
`setSkin()`; `skins`, cuáles trae; `default`, la que sale sin elegir, que es `clasico` salvo
decisión escrita; `aplicada`, la fecha. **El código manda**: si aquí pone `si` y el archivo no
está, la fila miente y se corrige en la reconciliación.

## Skins

| juego     | skin    | estado   | ranuras | cubiertas | alta       | revisado   | motivo                                                                                                           |
| --------- | ------- | -------- | ------- | --------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| asteroids | clasico | aplicada | 11      | 11        | 2026-08-13 | 2026-08-13 | Extraida del codigo: 5 constantes y 6 fugas. Los velos conservan su alfa                                         |
| asteroids | neon    | aplicada | 11      | 11        | 2026-08-13 | 2026-08-13 | Los 5 power-ups y el propulsor toman los acentos; nave, balas, rocas y polvo, la rampa de grises                 |
| asteroids | retro   | aplicada | 11      | 11        | 2026-08-13 | 2026-08-13 | Los 5 power-ups comparten el escalon vivo: se separan por su glifo, no por color. Revisable                      |
| tetris    | clasico | aplicada | 11      | 11        | 2026-08-13 | 2026-08-13 | Extraida del codigo: 2 constantes y 4 fugas. El brillo conserva su 0,12                                          |
| tetris    | neon    | aplicada | 11      | 11        | 2026-08-13 | 2026-08-13 | Siete piezas sin repetir color: 4 acentos y 3 escalones de la rampa de texto                                     |
| tetris    | retro   | aplicada | 11      | 11        | 2026-08-13 | 2026-08-13 | Las 7 piezas comparten el escalon vivo: se separan por su forma, no por color. Revisable                         |
| arkanoid  | clasico | aplicada | 12      | 12        | 2026-08-13 | 2026-08-13 | Extraida del codigo: 2 fugas y 10 constantes. Los 9 bloques son nombres CSS, copiados literales                  |
| arkanoid  | neon    | aplicada | 12      | 12        | 2026-08-13 | 2026-08-13 | Los acentos van a los bloques; paddle y bola bajan a la rampa de grises y el irrompible a line-strong            |
| arkanoid  | retro   | aplicada | 12      | 12        | 2026-08-13 | 2026-08-13 | Rompibles en medio y multi-golpe tambien: la cuenta de golpes la comunica el globalAlpha. Revisable              |
| snake     | clasico | aplicada | 5       | 5         | 2026-08-13 | 2026-08-13 | Extraida del codigo: las 5 ranuras estaban en `constants.ts`, sin una sola fuga. La rejilla conserva su alfa 0,1 |
| snake     | neon    | aplicada | 5       | 5         | 2026-08-13 | 2026-08-13 | SPEC 10 ya la pinto con tokens del vault: solo cambia la rejilla, que pasa de cian a `--av-amber`. Sin atlas     |
| snake     | retro   | aplicada | 5       | 5         | 2026-08-13 | 2026-08-13 | Cuerpo medio, cabeza y fruta vivo, rejilla tenue. La fruta cae al circulo plano: el atlas no se recolorea (S7)   |

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

**Aplicada el 2026-08-13.** Espejo de `lib/games/asteroids/skins.ts`; si algun dia discrepan,
gana el archivo. La primera columna trae el identificador de hoy —la propiedad de `Palette`— y
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

`thruster` y `particle` son **velos**: el 0,85 de la llama y el desvanecido del polvo siguen
siendo del motor, que monta el `rgba` con `tint()`. Por eso esas dos van en `#rrggbb` de seis
digitos, que es lo unico que `tint()` acepta, y por eso `particle` es `#ffffff` y no `#fff`.

Dos decisiones que un humano puede revertir en modo veredicto:

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

### tetris

**Aplicada el 2026-08-13.** Espejo de `lib/games/tetris/skins.ts`; si algun dia discrepan, gana
el archivo. La primera columna trae el identificador de hoy —la propiedad de `Palette`— y la
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

`gloss` es un **velo**: el 0,12 sigue siendo del motor, que monta el `rgba` con `tint()`, y por
eso va en `#rrggbb` de seis digitos. El `GHOST_ALPHA` de 0,2 de la proyeccion no es ranura: usa
el color de su propia pieza.

Dos decisiones que un humano puede revertir en modo veredicto:

- **`neon`**: siete piezas y solo cuatro acentos `--av-*`, asi que las tres restantes bajan a la
  rampa de texto del tema —`#e7ebf5`, `#9aa2b4`, `#6f7686`—, que son tokens igual de legitimos.
  Con eso ninguna pieza repite color. Los cuatro acentos van a las cuatro que ya tiraban a ese
  tono: I al cian, O al amarillo, T al magenta y L al ambar.
- **`retro`**: las siete piezas comparten el escalon vivo. **No es un choque de S3 sin
  resolver**: el color de un tetromino no lleva informacion de juego —no hay combos por tinte ni
  bloques especiales— y se identifica por su forma, que es lo que un tetromino es. Lo que si
  queda separado es lo que decide la partida: celda ocupada contra vacia por el margen de 1 px, y
  la proyeccion contra el tablero por su alfa. Efecto colateral asumido: el brillo de la celda
  desaparece, porque en la rampa de fosforo no hay blanco y S6 no admite inventarlo.

### arkanoid

**Aplicada el 2026-08-13.** Espejo de `lib/games/arkanoid/skins.ts`; si algun dia discrepan,
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

Los nueve bloques son **velos**: el desgaste se dibuja con
`globalAlpha = 0.4 + 0.6 * (hp / maxHp)` y eso lo sigue decidiendo el motor. La piel solo pone
el color con el que se pinta antes de aplicarlo.

**El color se resuelve al dibujar, no al construir el nivel.** `buildLevel()` guardaba el color
ya resuelto dentro de cada `Block`, asi que cambiar de piel habria dejado la rejilla en curso
con los colores viejos hasta el nivel siguiente. `Block.color` paso a ser `Block.kind`, la celda
de la rejilla, y `BLOCK_KINDS` vive en `constants.ts` porque es vocabulario de nivel, no color.

Dos decisiones que un humano puede revertir en modo veredicto:

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

### snake

**Aplicada el 2026-08-13.** Espejo de `lib/games/snake/skins.ts`; si algun dia discrepan, gana
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

`grid` es un **velo**: el 0,1 sigue siendo del motor, que monta el `rgba` con `tint()` y por eso
va en `#rrggbb` de seis digitos. Con `clasico` sale exactamente el `rgba(0,245,255,0.1)` de
SPEC 10, hex a hex.

`useAtlas` no es un color y es la unica desviacion de la receta: **el atlas no se recolorea
nunca** (S7), asi que `neon` y `retro` se caen al circulo plano de `fruit`, que es el camino que
el motor ya tenia escrito para cuando la imagen no carga. Sin eso `retro` ensenaria una manzana
roja sobre fosforo verde (S6) y `neon` traeria 22 hex fuera de `--av-*` (S5). No cambia la
celda, el tamano ni la hitbox de la fruta.

Dos decisiones que un humano puede revertir en modo veredicto:

- **`neon` cambia una sola ranura.** SPEC 10 ya pinto Snake con tokens del vault, asi que su
  `clasico` era casi esta piel; el contrato lo avisa y no es un error. Lo que se corrige es la
  rejilla, que era el mismo cian del cuerpo separado solo por el alfa: aqui toma el `--av-amber`,
  el cuarto acento y el unico que la maquina no usaba.
- **`retro`: cabeza y fruta comparten el escalon vivo.** No es un choque de S3 sin resolver: son
  un cuadrado con inset y un circulo de radio 0,35, nunca coinciden en la misma celda —comerla la
  muda— y confundirlas no cuesta una vida. Lo separado por color es lo que mata: el cuerpo va en
  medio y la cabeza en vivo. La rejilla en tenue bajo el velo 0,1 queda muy discreta; subirla a
  `#33ff33` es un cambio de una linea.
