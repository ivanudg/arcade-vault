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
ronda que vistió `asteroids`, que es la única máquina con sus tres pieles aplicadas. Las nueve
filas de las otras tres siguen en `sin-disenar`, y ahora sí se pueden aplicar de una en una:
la infraestructura está y no se vuelve a tocar.

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

| juego     | vestida | skins                | default | aplicada   | notas                                              |
| --------- | ------- | -------------------- | ------- | ---------- | -------------------------------------------------- |
| asteroids | si      | clasico, neon, retro | clasico | 2026-08-13 | La primera vestida; montó la infraestructura comun |
| tetris    | no      | —                    | —       | —          | Sin `lib/games/tetris/skins.ts`                    |
| arkanoid  | no      | —                    | —       | —          | Sin `lib/games/arkanoid/skins.ts`                  |
| snake     | no      | —                    | —       | —          | Sin `lib/games/snake/skins.ts`                     |

`vestida` es `si` sólo cuando el motor tiene su `skins.ts` con las tres paletas y su
`setSkin()`; `skins`, cuáles trae; `default`, la que sale sin elegir, que es `clasico` salvo
decisión escrita; `aplicada`, la fecha. **El código manda**: si aquí pone `si` y el archivo no
está, la fila miente y se corrige en la reconciliación.

## Skins

| juego     | skin    | estado      | ranuras | cubiertas | alta       | revisado   | motivo                                                                                           |
| --------- | ------- | ----------- | ------- | --------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------ |
| asteroids | clasico | aplicada    | 11      | 11        | 2026-08-13 | 2026-08-13 | Extraida del codigo: 5 constantes y 6 fugas. Los velos conservan su alfa                         |
| asteroids | neon    | aplicada    | 11      | 11        | 2026-08-13 | 2026-08-13 | Los 5 power-ups y el propulsor toman los acentos; nave, balas, rocas y polvo, la rampa de grises |
| asteroids | retro   | aplicada    | 11      | 11        | 2026-08-13 | 2026-08-13 | Los 5 power-ups comparten el escalon vivo: se separan por su glifo, no por color. Revisable      |
| tetris    | clasico | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |
| tetris    | neon    | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |
| tetris    | retro   | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |
| arkanoid  | clasico | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |
| arkanoid  | neon    | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |
| arkanoid  | retro   | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |
| snake     | clasico | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |
| snake     | neon    | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |
| snake     | retro   | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |                                                                                                  |

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
