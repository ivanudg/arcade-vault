# Memoria del `game-planner`

Lo que el agente `game-planner` ha propuesto alguna vez, con su nota de encaje y el veredicto
que recibió. **Este archivo lo escribe el agente; edítalo a mano sólo para corregirlo.**

Existe porque un subagente arranca en frío: no ve el hilo padre, ni lo que se habló la semana
pasada, ni la propuesta que ya rechazaste. Sin esta tabla volvería a sugerir lo mismo cada
vez. Va versionado en git a propósito: es conocimiento del proyecto, como las specs.

**El repo manda sobre esta tabla, siempre.** `lib/games.ts` es la fuente de verdad del
catálogo y `specs/` la de lo especificado. Aquí sólo se recuerda lo **sugerido**. Cuando las
dos cosas no coincidan, se corrige la tabla, nunca el repo.

## Cómo se lee la tabla

| Columna     | Qué es                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `clave`     | Identificador de deduplicación, en kebab-case. **Es la mecánica, no el título**: `arkanoid` y `breakout` comparten clave |
| `alias`     | Otros nombres que deduplican contra la misma clave, separados por `/`                                                    |
| `titulo`    | Cómo se llamaría en el catálogo: MAYÚSCULAS y sin tildes (Press Start 2P no tiene acentos)                               |
| `mecanica`  | Qué hace quien juega, en una línea. Es lo que impide que «otro rompe-bloques» pase el filtro                             |
| `cat`       | Uno de los seis de `GameCategory`                                                                                        |
| `glow`      | Uno de los tres de `GameGlow`                                                                                            |
| `escena`    | Escena de `ArchivedPreviewId` que reutilizaría, `nueva` si hay que dibujarla, `propia` si ya tiene la suya               |
| `encaje`    | Nota de `rubrica.md`, de 0 a 12. `—` si no llegó a puntuarse                                                             |
| `veredicto` | Uno de los ocho de abajo. Vocabulario cerrado                                                                            |
| `alta`      | Cuándo se propuso por primera vez                                                                                        |
| `revisado`  | Última vez que se reconcilió esta fila contra el repo                                                                    |
| `motivo`    | Una línea. **Obligatorio** si el veredicto es `no-encaja`, `descartada` o `aparcada`                                     |

## Los ocho veredictos

| Estado           | Quién lo pone             | ¿Bloquea que se vuelva a proponer?                                    |
| ---------------- | ------------------------- | --------------------------------------------------------------------- |
| `propuesta`      | El agente                 | Sí, mientras no haya veredicto humano                                 |
| `no-encaja`      | El agente, por la rúbrica | Sí. El motivo cita el criterio que falló, p. ej. `C2: necesita raton` |
| `descartada`     | El usuario                | Sí. Sólo se reabre si el usuario lo pide explícitamente               |
| `aparcada`       | El usuario                | No, pero al reproponerla el agente cita la fecha y el motivo          |
| `elegida`        | El usuario                | Sí. El handoff a `/spec-game` ya se hizo                              |
| `en-spec`        | Derivado del repo         | Sí. Hay un `specs/NN-*.md` que la cubre                               |
| `implementada`   | Derivado del repo         | Sí. Su clave está en `GameId`                                         |
| `desincronizada` | El agente                 | No, pero se reporta siempre: la tabla dice una cosa y el repo otra    |

`no-encaja` y `descartada` no son lo mismo. La primera es un juicio del agente contra el
contrato de `lib/games/engine.ts`, y se revisa si el contrato cambia —el día que haya audio o
carga de assets bloqueante—. La segunda es voluntad humana y no se revisa sola.

## Reglas de escritura

- **Nunca se borra una fila.** Un candidato muerto se queda con su veredicto y su motivo: eso
  es justamente la memoria.
- **Nunca se reordena la tabla.** Las altas van al final. Es lo que mantiene los conflictos de
  merge en una línea aislada.
- **Un `Edit` por fila**, y `Read` antes de cada uno: el hook de formateo del repo pasa
  Prettier tras cada escritura y realinea las columnas, así que el texto en disco no es
  exactamente el que se escribió.
- **No alinees las columnas a mano.** Prettier lo hace.
- La deduplicación compara `clave` **y** `alias`, normalizados: minúsculas, sin tildes y sin
  guiones. Comparar por `titulo` fallaría con «BREAKOUT» contra «ARKANOID».

---

## Candidatos

| clave       | alias                           | titulo    | mecanica                                                           | cat        | glow      | escena | encaje | veredicto    | alta       | revisado   | motivo  |
| ----------- | ------------------------------- | --------- | ------------------------------------------------------------------ | ---------- | --------- | ------ | ------ | ------------ | ---------- | ---------- | ------- |
| `asteroids` | rocas / nave / asteroides       | ASTEROIDS | Nave con inercia en mundo toroidal; dispara y parte las rocas      | `DISPAROS` | `#f5ff00` | propia | —      | implementada | 2026-08-12 | 2026-08-12 | SPEC 05 |
| `tetris`    | caida / tetriminos / piezas     | TETRIS    | Piezas que caen en rejilla; se rotan y encajan para limpiar lineas | `PUZZLE`   | `#00f5ff` | propia | —      | implementada | 2026-08-12 | 2026-08-12 | SPEC 08 |
| `arkanoid`  | breakout / muro / rompe-bloques | ARKANOID  | Pala que rebota una bola contra un muro de bloques                 | `ARCADE`   | `#ff006e` | propia | —      | implementada | 2026-08-12 | 2026-08-12 | SPEC 09 |
| `snake`     | culebra / serpiente / gusano    | SNAKE     | Cuerpo que crece por la rejilla; la pared y la cola matan          | `CLASICOS` | `#00f5ff` | propia | —      | implementada | 2026-08-12 | 2026-08-12 | SPEC 10 |

## Notas

Las cuatro filas de arriba son la **semilla**: no las propuso el agente, se copiaron de
`references/implemented-games.md` el 2026-08-12 al crear este archivo. Están para que la
primera invocación no sugiera Breakout con toda naturalidad.

Sus alias incluyen a propósito los identificadores de escena que ya hicieron el viaje de
`ArchivedPreviewId` a `GameId` —`rocas` no, que sigue archivada, pero sí `caida` y `muro`—,
para que nadie proponga una escena archivada como si fuera una máquina distinta.

<!-- A partir de aquí, un bloque por candidato cuyo motivo no quepa en una línea de la tabla.
     Encabezado de nivel 3 con la clave, y debajo lo que haga falta. -->
