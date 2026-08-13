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
| `encaje`    | Nota de `rubrica.md`, de 0 a 15. `—` si no llegó a puntuarse, `a / b` si dos rondas discrepan                            |
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

| clave             | alias                                          | titulo          | mecanica                                                                         | cat         | glow      | escena    | encaje | veredicto    | alta       | revisado   | motivo                                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------- | --------------- | -------------------------------------------------------------------------------- | ----------- | --------- | --------- | ------ | ------------ | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asteroids`       | rocas / nave / asteroides                      | ASTEROIDS       | Nave con inercia en mundo toroidal; dispara y parte las rocas                    | `DISPAROS`  | `#f5ff00` | propia    | —      | implementada | 2026-08-12 | 2026-08-12 | SPEC 05                                                                                                                                                                                                                                             |
| `tetris`          | caida / tetriminos / piezas                    | TETRIS          | Piezas que caen en rejilla; se rotan y encajan para limpiar lineas               | `PUZZLE`    | `#00f5ff` | propia    | —      | implementada | 2026-08-12 | 2026-08-12 | SPEC 08                                                                                                                                                                                                                                             |
| `arkanoid`        | breakout / muro / rompe-bloques                | ARKANOID        | Pala que rebota una bola contra un muro de bloques                               | `ARCADE`    | `#ff006e` | propia    | —      | implementada | 2026-08-12 | 2026-08-12 | SPEC 09                                                                                                                                                                                                                                             |
| `snake`           | culebra / serpiente / gusano                   | SNAKE           | Cuerpo que crece por la rejilla; la pared y la cola matan                        | `CLASICOS`  | `#00f5ff` | propia    | —      | implementada | 2026-08-12 | 2026-08-12 | SPEC 10                                                                                                                                                                                                                                             |
| `frogger`         | rana / corredor / cruzar                       | FROGGER         | Salta por carriles esquivando trafico y cabalgando troncos hasta las casas       | `REFLEJOS`  | `#ff006e` | corredor  | 12     | propuesta    | 2026-08-12 | 2026-08-12 | Recomendada en la ronda del 2026-08-12: empata a 12 con pacman y gana en coste (C10 3 frente a 0)                                                                                                                                                   |
| `pacman`          | comecocos / come-cocos / puck-man              | PACMAN          | Recorre un laberinto comiendo puntos mientras cuatro perseguidores le cazan      | `LABERINTO` | `#f5ff00` | laberinto | 12     | propuesta    | 2026-08-12 | 2026-08-12 | Segunda de la terna: la mas deseable del catalogo y la mas cara, C10 0 por la IA de cuatro agentes                                                                                                                                                  |
| `space-invaders`  | invasores / galaxian / galaga / marcianitos    | SPACE INVADERS  | Canon fijo en la base contra una formacion que baja y acelera                    | `DISPAROS`  | `#f5ff00` | invasores | 11     | propuesta    | 2026-08-12 | 2026-08-12 | Tercera de la terna: escena lista y numeros conocidos, pero repite categoria y disparo. Alias galaga anadido en la ronda DISPAROS del 2026-08-12                                                                                                    |
| `dig-dug`         | digdug / cavar / bombeo                        | DIG DUG         | Excava tuneles bajo tierra e infla enemigos hasta reventarlos                    | `LABERINTO` | `#f5ff00` | laberinto | 9      | aparcada     | 2026-08-12 | 2026-08-12 | Pasa la eliminatoria pero queda fuera de terna: 9/15, C10 0 por IA doble, rocas y terreno deformable. Reconfirmado en 9 por la ronda LABERINTO del 2026-08-12                                                                                       |
| `qbert`           | q-bert / cubos / piramide                      | QBERT           | Salta en diagonal por una piramide de cubos para cambiarlos de color             | `REFLEJOS`  | `#f5ff00` | nueva     | 8      | aparcada     | 2026-08-12 | 2026-08-12 | Pasa la eliminatoria pero queda fuera de terna: 8/15, escena nueva y varios agentes CPU. Reconfirmado en 8 por la ronda REFLEJOS del 2026-08-12                                                                                                     |
| `pong`            | duelo / palas / tenis                          | PONG            | Dos palas verticales devuelven una bola de un lado a otro                        | `ARCADE`    | `#00f5ff` | duelo     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | F3-2: duplica el rebote con pala de arkanoid; la escena `duelo` sigue archivada y libre                                                                                                                                                             |
| `missile-command` | misiles / defensa / ciudades                   | MISSILE COMMAND | Interceptar misiles apuntando a un punto de la pantalla                          | `DISPAROS`  | `#ff006e` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C2: se apunta con puntero; un cursor movido con flechas no es el juego. C2 reconfirmado por la ronda DISPAROS del 2026-08-12                                                                                                                        |
| `simon`           | secuencia / memoria / colores                  | SIMON           | Repetir una secuencia de colores cada vez mas larga                              | `REFLEJOS`  | `#f5ff00` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C1: solo hay una cifra real, la longitud de la secuencia; vidas y nivel dirian lo mismo                                                                                                                                                             |
| `amidar`          | amidakuji / rejilla / pintor                   | AMIDAR          | Recorre una malla de railes y reclama casillas al cerrar su perimetro            | `LABERINTO` | `#f5ff00` | laberinto | 13     | propuesta    | 2026-08-12 | 2026-08-12 | Ganador por puntos de la franja LABERINTO; su C9 3 depende de una escena que pacman tambien pide                                                                                                                                                    |
| `bomberman`       | bombas / dyna-blaster                          | BOMBERMAN       | Deja bombas de temporizador en rejilla; la llama en cruz abre bloques y mata     | `LABERINTO` | `#ff006e` | laberinto | 11     | propuesta    | 2026-08-12 | 2026-08-12 | Recomendado de la franja LABERINTO pese a no ganar por puntos: el unico que usa los cinco botones de forma natural                                                                                                                                  |
| `pengo`           | pingu / bloques-de-hielo                       | PENGO           | Empuja bloques de hielo por un laberinto para aplastar a los Sno-Bees            | `LABERINTO` | `#00f5ff` | laberinto | 10 / 7 | propuesta    | 2026-08-12 | 2026-08-12 | Horquilla: LABERINTO 10, PUZZLE 7 con C10 0 por el deslizamiento continuo sobre rejilla discreta                                                                                                                                                    |
| `berzerk`         | robots / salas / otto                          | BERZERK         | Limpia salas de paredes electrificadas disparando a robots que disparan          | `LABERINTO` | `#ff006e` | laberinto | 8 / 12 | propuesta    | 2026-08-12 | 2026-08-12 | Horquilla real: LABERINTO 8 (C11 1, repite el verbo disparar), DISPAROS 12 (C8 3 por estrenar LABERINTO y C9 3 por la escena tal cual)                                                                                                              |
| `gorillas`        | artilleria / bananas / scorched-earth          | GORILLAS        | Ajusta angulo y fuerza para acertar con una parabola al rival                    | `DISPAROS`  | `#f5ff00` | nueva     | 10     | propuesta    | 2026-08-12 | 2026-08-12 | De la franja DISPAROS; el rival va como CPU para no romper C5                                                                                                                                                                                       |
| `battle-city`     | battlecity / tanques / tank-1990               | BATTLE CITY     | Tanque en laberinto de ladrillo que defiende su base de oleadas                  | `DISPAROS`  | `#00f5ff` | laberinto | 9      | propuesta    | 2026-08-12 | 2026-08-12 | De la franja DISPAROS; tambien pide la escena `laberinto`                                                                                                                                                                                           |
| `centipede`       | ciempies / hongos                              | CENTIPEDE       | Dispara al ciempies que baja por un campo de hongos y se parte al herirlo        | `DISPAROS`  | `#ff006e` | nueva     | 8      | propuesta    | 2026-08-12 | 2026-08-12 | De la franja DISPAROS                                                                                                                                                                                                                               |
| `tempest`         | tubo / vectores / pozo                         | TEMPEST         | Recorre el borde de un tubo vectorial disparando a lo que sube por los carriles  | `DISPAROS`  | `#00f5ff` | nueva     | 8      | propuesta    | 2026-08-12 | 2026-08-12 | De la franja DISPAROS                                                                                                                                                                                                                               |
| `defender`        | rescate / scroll-lateral                       | DEFENDER        | Nave con scroll lateral que rescata colonos y esquiva secuestradores             | `DISPAROS`  | `#f5ff00` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C2: seis mandos (empuje, invertir, hiperespacio, bomba inteligente, disparo) no caben en cinco botones                                                                                                                                              |
| `robotron`        | robotron-2084                                  | ROBOTRON        | Mover y disparar en direcciones independientes contra hordas                     | `DISPAROS`  | `#ff006e` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C2: dos ejes independientes, mover y apuntar, piden dos mandos                                                                                                                                                                                      |
| `battlezone`      | tanque-vectorial                               | BATTLEZONE      | Tanque en primera persona vectorial contra otros tanques                         | `DISPAROS`  | `#f5ff00` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C2: se conduce con dos orugas independientes                                                                                                                                                                                                        |
| `combat`          | tanques-atari                                  | COMBAT          | Dos tanques se disparan en una arena con obstaculos                              | `ARCADE`    | `#00f5ff` | duelo     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C5: su juego es el 2P en el mismo teclado                                                                                                                                                                                                           |
| `boulder-dash`    | boulderdash / rocas-y-diamantes                | BOULDER DASH    | Excava tierra recogiendo diamantes sin que las rocas le caigan encima            | `PUZZLE`    | `#f5ff00` | laberinto | 10     | propuesta    | 2026-08-12 | 2026-08-12 | De la franja PUZZLE; octavo pretendiente de la escena `laberinto`                                                                                                                                                                                   |
| `sokoban`         | cajas / almacen / boxxle                       | SOKOBAN         | Empuja cajas por un almacen hasta dejarlas sobre sus marcas                      | `PUZZLE`    | `#00f5ff` | nueva     | 10     | aparcada     | 2026-08-12 | 2026-08-12 | Dos lecturas opuestas el 2026-08-12: LABERINTO lo tumbo por C1/C6 (sin vidas, y la partida se resuelve en vez de terminar) y PUZZLE lo paso con 10 reinterpretando `lives` como INTENTOS al modo LINEAS de Tetris; lo decide la spec, no el planner |
| `pipes`           | pipe-mania / pipe-dream / tuberias             | PIPES           | Coloca tramos de tuberia antes de que el agua llegue al final                    | `PUZZLE`    | `#00f5ff` | nueva     | 10     | propuesta    | 2026-08-12 | 2026-08-12 | De la franja PUZZLE                                                                                                                                                                                                                                 |
| `lights-out`      | lightsout / luces / apaga-luces                | LIGHTS OUT      | Pulsa celdas que conmutan a sus vecinas hasta apagar la rejilla entera           | `PUZZLE`    | `#f5ff00` | nueva     | 10     | propuesta    | 2026-08-12 | 2026-08-12 | De la franja PUZZLE                                                                                                                                                                                                                                 |
| `puzzle-bobble`   | puzzlebobble / bust-a-move / burbujas          | PUZZLE BOBBLE   | Lanza burbujas de color contra un techo que baja y agrupa de tres                | `PUZZLE`    | `#ff006e` | nueva     | 7      | propuesta    | 2026-08-12 | 2026-08-12 | De la franja PUZZLE, la nota mas baja de su ronda                                                                                                                                                                                                   |
| `columns`         | dr-mario / puyo-puyo / klax / colores-que-caen | COLUMNS         | Piezas que caen en un pozo y se limpian emparejando colores                      | `PUZZLE`    | `#00f5ff` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | F3-2: los cuatro duplican la mecanica de tetris, piezas que caen en un pozo                                                                                                                                                                         |
| `minesweeper`     | buscaminas                                     | BUSCAMINAS      | Descubre casillas deduciendo donde estan las minas                               | `PUZZLE`    | `#f5ff00` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C2: se juega con puntero y dos botones; C6: lo que mide es tiempo                                                                                                                                                                                   |
| `2048`            | threes / fichas-que-se-fusionan                | 2048            | Desliza fichas que se fusionan al chocar duplicando su valor                     | `PUZZLE`    | `#f5ff00` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C1: una sola cifra real, como simon; vidas y nivel mentirian                                                                                                                                                                                        |
| `moon-patrol`     | moonpatrol / buggy / luna                      | MOON PATROL     | Buggy con scroll lateral que salta crateres y dispara a lo que cae               | `REFLEJOS`  | `#f5ff00` | corredor  | 11     | propuesta    | 2026-08-12 | 2026-08-12 | De la franja REFLEJOS; baja de 11 a 8 si la escena `corredor` se la lleva frogger                                                                                                                                                                   |
| `track-and-field` | trackandfield / atletismo / hyper-olympic      | TRACK AND FIELD | Machaca la tecla para correr y mide el angulo del salto o el lanzamiento         | `REFLEJOS`  | `#ff006e` | nueva     | 11     | propuesta    | 2026-08-12 | 2026-08-12 | De la franja REFLEJOS; empata a 11 con moon-patrol y no depende de ninguna escena archivada                                                                                                                                                         |
| `donkey-kong`     | dk / barriles / mario                          | DONKEY KONG     | Sube andamios esquivando barriles hasta llegar arriba                            | `REFLEJOS`  | `#ff006e` | nueva     | 9      | propuesta    | 2026-08-12 | 2026-08-12 | De la franja REFLEJOS                                                                                                                                                                                                                               |
| `road-fighter`    | roadfighter / carretera / coche                | ROAD FIGHTER    | Coche que adelanta trafico a toda velocidad sin salirse de la carretera          | `REFLEJOS`  | `#00f5ff` | corredor  | 9      | propuesta    | 2026-08-12 | 2026-08-12 | De la franja REFLEJOS; baja de 9 a 8 si la escena `corredor` se la lleva frogger                                                                                                                                                                    |
| `marble-madness`  | canicas / marble                               | MARBLE MADNESS  | Guia una canica por circuitos isometricos contra el reloj                        | `REFLEJOS`  | `#00f5ff` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C2: se juega con trackball; las flechas no dan el control analogico                                                                                                                                                                                 |
| `outrun`          | out-run / hang-on / conduccion-pseudo-3d       | OUTRUN          | Conduccion pseudo-3D por carretera con curvas y tiempo                           | `REFLEJOS`  | `#ff006e` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C3: el pseudo-3D pide un atlas de sprites escalados, no primitivas de canvas                                                                                                                                                                        |
| `pitfall`         | pitfall-harry / jungla                         | PITFALL         | Recorre la jungla saltando lianas, troncos y cocodrilos                          | `ARCADE`    | `#f5ff00` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C6: acaba por cronometro y el marcador decrece con los errores                                                                                                                                                                                      |
| `excitebike`      | motocross / moto                               | EXCITEBIKE      | Moto de motocross que salta rampas controlando la temperatura del motor          | `REFLEJOS`  | `#f5ff00` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C1: la temperatura del motor es una cuarta cifra imprescindible                                                                                                                                                                                     |
| `kaboom`          | bombas-cayendo / avalancha                     | KABOOM          | Cubos que recogen las bombas que suelta un bandido en lo alto                    | `REFLEJOS`  | `#ff006e` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | F3-2: es el rebote con pala de arkanoid sin la bola                                                                                                                                                                                                 |
| `rally-x`         | rallyx / banderas / coche-laberinto            | RALLY X         | Coche que recoge banderas en un laberinto con scroll y suelta humo               | `LABERINTO` | `#f5ff00` | laberinto | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C1: el combustible es una cuarta cifra imprescindible y el HUD son tres                                                                                                                                                                             |
| `lode-runner`     | loderunner / oro / cavar-ladrillo              | LODE RUNNER     | Recoge oro por andamios y cava agujeros donde caen los guardias                  | `LABERINTO` | `#f5ff00` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C2: cavar a izquierda y a derecha son dos acciones distintas encima de las cuatro direcciones                                                                                                                                                       |
| `wizard-of-wor`   | wizardofwor / worlord / mazmorra               | WIZARD OF WOR   | Recorre una mazmorra disparando a monstruos que aparecen y se vuelven invisibles | `LABERINTO` | `#00f5ff` | laberinto | —      | no-encaja    | 2026-08-12 | 2026-08-12 | C5: su juego es el 2P cooperativo en el mismo teclado                                                                                                                                                                                               |
| `tron`            | light-cycles / motos-de-luz / estelas          | TRON            | Motos que dejan estela en una arena cerrada hasta encerrar al rival              | `ARCADE`    | `#00f5ff` | nueva     | —      | no-encaja    | 2026-08-12 | 2026-08-12 | F3-2: duplica el rastro por rejilla de snake                                                                                                                                                                                                        |
| `lady-bug`        | ladybug / crush-roller / make-trax             | LADY BUG        | Laberinto con puertas giratorias donde se comen puntos huyendo de bichos         | `LABERINTO` | `#f5ff00` | laberinto | —      | no-encaja    | 2026-08-12 | 2026-08-12 | F3-2: es pacman con otro nombre, y pacman ya esta propuesto                                                                                                                                                                                         |

## Notas

Las cuatro filas de arriba son la **semilla**: no las propuso el agente, se copiaron de
`references/implemented-games.md` el 2026-08-12 al crear este archivo. Están para que la
primera invocación no sugiera Breakout con toda naturalidad.

Sus alias incluyen a propósito los identificadores de escena que ya hicieron el viaje de
`ArchivedPreviewId` a `GameId` —`rocas` no, que sigue archivada, pero sí `caida` y `muro`—,
para que nadie proponga una escena archivada como si fuera una máquina distinta.

### Ronda del 2026-08-12 — la primera con candidatos de verdad

Reconciliación sin discrepancias: las cuatro filas de la semilla siguen en `GameId` y no había
candidatos vivos. Ocho candidatos generados, tres caídos en la eliminatoria, cinco puntuados.

Dos de los cinco supervivientes —`dig-dug` y `qbert`— quedaron **fuera de la terna** sin fallar
ningún criterio eliminatorio. Se anotan como `aparcada` y no como `propuesta` a propósito: no
llegaron a llevarse a decisión humana, así que bloquearlos sería perder dos candidatos válidos.
Al reproponerlos, citar esta fecha y su nota.

Escenas de `ArchivedPreviewId` al cerrar la ronda: `invasores`, `rocas`, `duelo`, `corredor` y
`laberinto`, las cinco. Si `frogger` se aprueba, `corredor` es la que viaja.

Observación sobre `rubrica.md`, para quien la mantenga: decía «máximo 12» en la pasada ponderada,
pero C8 a C12 son cinco criterios de hasta 3 puntos, o sea 15. Las notas de esta ronda se
sumaron tal cual (`pacman` y `frogger` empatan a 12 **con** un cero en C10). **Corregido el
2026-08-12**: el tope de `rubrica.md` pasó a 15 y los pesos se dejaron intactos, porque bajar
alguno habría invalidado todas las notas ya anotadas aquí. Las notas de esta ronda y de la
siguiente son comparables entre sí; ninguna se recalculó.

### Ronda del 2026-08-12 — cuatro franjas en paralelo (LABERINTO, DISPAROS, PUZZLE, REFLEJOS)

Reconciliación sin discrepancias: las cuatro filas de `GameId` siguen en su sitio, las cinco
escenas de `ArchivedPreviewId` (`invasores`, `rocas`, `duelo`, `corredor`, `laberinto`) siguen
archivadas, y `specs/` sigue en 10. `sort_order` libre: **4**.

**Aviso 1 — la escena `laberinto` sólo puede viajar una vez.** La piden ocho candidatos:
`pacman`, `dig-dug`, `berzerk`, `battle-city`, `amidar`, `bomberman`, `pengo` y `boulder-dash`.
Sus notas de C9 están todas infladas por la misma escena, así que **no son comparables entre
sí**: en cuanto una se la lleve, las otras siete bajan. Al comparar candidatos de esta lista,
réstales el C9 antes de decidir.

**Aviso 2 — la escena `corredor` igual.** La piden `frogger` (recomendado vigente),
`moon-patrol` y `road-fighter`. Si `frogger` se aprueba, `moon-patrol` baja de 11 a 8 y
`road-fighter` de 9 a 8. Y una observación de la ronda REFLEJOS que puede cambiar a quién se le
asigna: por su rastro horizontal, `corredor` describe mejor un **scroll lateral** que el ascenso
vertical de Frogger.

**Tres horquillas entre rondas, anotadas para no volver a discutirlas a ciegas:**

- `berzerk` — LABERINTO le da **8** (C11 1: repite el verbo disparar que ya tienen Asteroids y
  la propuesta viva de Space Invaders) y DISPAROS le da **12** (C8 3 por estrenar `LABERINTO`,
  C9 3 por reutilizar la escena tal cual). Una sola fila, con las dos notas. La horquilla es de
  criterio, no de dato: depende de si se cuenta como máquina de laberinto o de disparo.
- `sokoban` — LABERINTO lo tumbó en la eliminatoria por C1 y C6 (sin vidas y sin final: la
  partida se resuelve, no termina) y PUZZLE lo pasó con 10 reinterpretando `lives` como
  `INTENTOS`, al modo del `LINEAS` de Tetris. Queda **`aparcada`, no `propuesta`**: la
  reinterpretación del HUD es una decisión de spec, no del planner.
- `pengo` — LABERINTO 10, PUZZLE 7 (C10 0 por el deslizamiento continuo del bloque sobre una
  rejilla discreta). La columna `encaje` lleva la horquilla `10 / 7`.

Nota de método: esta ronda se lanzó como cuatro invocaciones en paralelo, una por franja, con la
escritura de esta memoria inhibida en las cuatro y consolidada después en una sola pasada. Si se
repite el patrón, mantenerlo: cuatro agentes escribiendo aquí a la vez se pisan.

<!-- A partir de aquí, un bloque por candidato cuyo motivo no quepa en una línea de la tabla.
     Encabezado de nivel 3 con la clave, y debajo lo que haga falta. -->
