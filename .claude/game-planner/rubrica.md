# Rúbrica de encaje

Los doce criterios con los que el agente `game-planner` puntúa una máquina candidata. **Se
lee en la Fase 4, no antes.**

Ninguno es una opinión: cada uno sale de un archivo del repo que lo impone hoy. Si algún día
ese archivo cambia —el contrato gana carga de assets, `input.ts` aprende del ratón—, cambia
el criterio, y los candidatos con veredicto `no-encaja` por él se pueden reabrir.

Dos pasadas. Primero la eliminatoria: **un solo «no» tumba el candidato**, que se anota en
`memoria.md` con veredicto `no-encaja` y el motivo citando el criterio (`C2: necesita raton`).
Los supervivientes pasan a la ponderada.

---

## Pasada eliminatoria — C1 a C7

Se responden con «sí» o «no». No hay medias tintas: un «depende» es un «no» que todavía no se
ha investigado.

### C1 · Las tres cifras del HUD tienen significado real

`GameState` es siempre `{ score, lives, level }` y `GameMount.hud` obliga a nombrarlas
(`lib/games/engine.ts`). Pasa si se pueden escribir los tres rótulos, en MAYÚSCULAS, sin
tildes y de diez caracteres o menos, **sin que ninguno mienta**. `level` fijo en `1` es
respuesta válida si se declara como decisión; `lives` reinterpretado —`LINEAS` en Tetris— también.

Falla si la máquina necesita una cuarta cifra en pantalla para poder jugarse, o si dos de las
tres no significan nada y habría que rotularlas con un guion.

### C2 · Todo cabe en los cinco botones

El mando tiene `←` `↑` `↓` `→` `ESPACIO` y nada más; los que no se usan se pintan
deshabilitados. `lib/games/input.ts` sólo sabe de teclado y sólo hace `preventDefault` de esas
cinco teclas, así que cualquier otra hace scroll de la página al pulsarla.

Pasa si la tabla de cinco filas se rellena entera sin una fila «necesita la tecla X». Falla si
el juego se controla con el puntero, si pide teclas simultáneas fuera de esas cinco, o si
necesita un menú en partida que no sea una pulsación.

### C3 · Se dibuja con primitivas de canvas 2D

`mount()` es **síncrono** y `components/game-canvas.tsx` no tiene estado de «cargando».
Pasa si se puede nombrar la primitiva de cada entidad: `fillRect`, `arc`, `stroke`, `Path2D`,
un degradado.

El techo tolerado es Snake: un atlas opcional (`public/snake/fruits.png`) que el motor sólo
consulta con `ready()` y que, mientras diga que no, se sustituye por un círculo magenta sin
que la partida se entere. Falla cualquier máquina que **no se pueda jugar** hasta que un
archivo termine de cargar: eso pide otro contrato, y eso es otra spec.

### C4 · Cero audio

Ningún motor del vault suena, y meter sonido arrastra la decisión de mute, volumen y
desbloqueo del `AudioContext`. Pasa si el juego se entiende en silencio. Falla si el sonido
es información de juego y no adorno —un ritmo que hay que seguir, un aviso que no se ve—.

### C5 · Un jugador

`public.scores` guarda una marca con un nombre. Pasa si hay un solo jugador local; un rival se
implementa como CPU. Falla si el juego **es** el enfrentamiento entre dos personas en el mismo
teclado, o si necesita red.

### C6 · Puntuación entera y un final que ocurre una sola vez

`onGameOver(score)` se emite una vez por partida y sólo se rearma en `restart()`; la columna
de `public.scores` es un entero.

Pasa si se pueden nombrar **todas** las formas de acabar y todas producen un número entero
comparable. Falla si lo que mide el juego es un tiempo, una fracción o un porcentaje, o si la
partida no termina nunca.

### C7 · Todo el estado cabe en el closure de `mount()`

En el ámbito de módulo de un motor no hay ni una variable mutable, y un frame nunca provoca un
render. Pasa si el estado de partida es entidades en memoria. Falla si el juego necesita
persistir entre partidas por su cuenta —`localStorage` propio, un récord local que
contradiría al marcador compartido—, o esperar a un servidor.

---

## Pasada ponderada — C8 a C12

Cero, uno, dos o tres puntos cada uno. **Máximo 12.** La nota va a la columna `encaje` de
`memoria.md`, y sirve sobre todo para comparar candidatos entre sí dentro de una misma ronda.

### C8 · El hueco del catálogo

`GameCategory` tiene seis valores y hoy se usan cuatro.

| Puntos | Cuándo                                                                 |
| ------ | ---------------------------------------------------------------------- |
| 3      | Cubre `REFLEJOS` o `LABERINTO`, que están sin estrenar                 |
| 2      | Repite categoría pero con una mecánica que esa categoría no representa |
| 0      | Repite una de las cuatro ya usadas sin aportar nada nuevo a ella       |

### C9 · La miniatura

`lib/preview-art.ts` guarda cinco escenas dibujadas y sin máquina. Reutilizar una resuelve de
golpe dos puntos de contacto —el `case` de `drawPreview()` y sacar el id de
`ArchivedPreviewId`— y es la diferencia entre una tarde de trabajo y ninguna.

| Puntos | Cuándo                                                              |
| ------ | ------------------------------------------------------------------- |
| 3      | Reutiliza una escena archivada tal cual, sólo renombrando el `case` |
| 1      | Reutiliza una escena con retoques                                   |
| 0      | Hay que dibujar un `case` desde cero                                |

### C10 · El coste del motor

| Puntos | Cuándo                                                                                      |
| ------ | ------------------------------------------------------------------------------------------- |
| 3      | Cabe en cuatro archivos y una rejilla, como Snake: movimiento por celdas y colisión trivial |
| 2      | Necesita física continua pero con pocas entidades, como Arkanoid                            |
| 1      | Muchas entidades o un `math.ts` propio, como Asteroids                                      |
| 0      | Pide IA de varios agentes, generación de niveles o un editor                                |

### C11 · La distancia a lo que ya hay

Cuatro máquinas y cuatro mecánicas distintas: disparo con inercia, piezas que caen, rebote con
pala, rejilla que crece. Repetir una es la forma más rápida de que el catálogo aburra.

| Puntos | Cuándo                                                   |
| ------ | -------------------------------------------------------- |
| 3      | Mecánica que el vault no tiene                           |
| 1      | Emparentada con una de las cuatro pero se juega distinto |
| 0      | Es una variación de una de las cuatro                    |

### C12 · La claridad del equilibrio

Los números viven en `constants.ts` y no se pueden ajustar sin jugar. Snake demostró que
inventarlos se puede, pero costó que la spec fijara los trece valores uno por uno.

| Puntos | Cuándo                                                                      |
| ------ | --------------------------------------------------------------------------- |
| 3      | Los números salen de un clásico conocido y se copian sin retocar            |
| 2      | Hay tablas públicas de referencia, aunque haya que elegir entre versiones   |
| 0      | Hay que inventar el equilibrio entero sin poder jugarlo antes de escribirlo |

---

## Cómo se presenta

Se imprimen **las dos tablas enteras**, con todos los candidatos de la ronda, incluidos los
que cayeron en la eliminatoria y por qué criterio. Ver los descartes es la mitad del valor de
la ronda: es lo que evita que la siguiente vuelva sobre lo mismo.

Una nota alta **no** obliga a recomendar ese candidato. La rúbrica ordena; la recomendación la
argumenta el agente, y si el ganador por puntos no es el que recomienda, lo dice y explica por
qué.
