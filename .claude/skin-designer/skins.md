# Ledger del `skin-designer`

Las skins que el agente `skin-designer` ha diseñado alguna vez, con las ranuras que cubren y
el veredicto que recibieron. **Este archivo lo escribe el agente; edítalo a mano sólo para
corregirlo.**

Existe porque un subagente arranca en frío: no ve el hilo padre, ni lo que se habló la semana
pasada, ni la paleta que ya rechazaste. Sin esta tabla volvería a diseñar lo mismo cada vez, y
con otros hex. Va versionado en git a propósito: es conocimiento del proyecto, como las specs.

**El código manda sobre esta tabla, siempre.** `lib/games/<juego>/constants.ts` y las fugas de
sus `entities.ts` son la fuente de verdad de lo que se pinta hoy; `lib/games/engines.ts` la de
qué máquinas tienen algo que vestir. Aquí sólo se recuerda lo **diseñado**. Cuando las dos
cosas no coincidan, se corrige la tabla, nunca el código.

Las doce filas de hoy están todas en `sin-disenar`, y no es un descuido: **el sistema de skins
no existe todavía** —`mount()` no recibe tema y no hay selector—, así que la primera ronda del
agente sólo pudo dar de alta lo que falta. Extraer las cuatro `clasico` del código y diseñar
las ocho restantes es el trabajo siguiente.

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
| `implementada`   | Derivado del código | Sí. El motor la tiene de verdad                                   |
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

## Skins

| juego     | skin    | estado      | ranuras | cubiertas | alta       | revisado   | motivo |
| --------- | ------- | ----------- | ------- | --------- | ---------- | ---------- | ------ |
| asteroids | clasico | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| asteroids | neon    | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| asteroids | retro   | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| tetris    | clasico | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| tetris    | neon    | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| tetris    | retro   | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| arkanoid  | clasico | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| arkanoid  | neon    | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| arkanoid  | retro   | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| snake     | clasico | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| snake     | neon    | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |
| snake     | retro   | sin-disenar | —       | —         | 2026-08-13 | 2026-08-13 |        |

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
