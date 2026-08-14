---
name: spec-game
description: Diseña la spec de una máquina nueva del vault —motor, catálogo, miniatura, mando y migración— y la guarda en specs/NN-<slug>.md en estado Borrador. Sirve tanto para portar un juego de references/started-games/ como para una máquina descrita desde cero. No escribe código de juego.
disable-model-invocation: true
argument-hint: "<juego de references/started-games/ o descripción de la máquina nueva>"
allowed-tools: Read, Glob, Grep, Write, Bash(ls:*), Bash(cat:*), Bash(grep:*), Bash(wc:*), Bash(echo:*)
---

# /spec-game — Diseñador de specs de máquina nueva

## Session context

Specs que ya existen:
!`ls specs/`

Material de referencia disponible:
!`ls references/started-games/`

El catálogo hoy:
!`grep -n "export type GameId" lib/games.ts`

Motores registrados:
!`cat lib/games/engines.ts`

¿El contrato ya tiene rótulos de HUD?
!`grep -n "hud" lib/games/engine.ts || echo "NO — la extensión del HUD entra como paso 0 si hace falta"`

Migraciones aplicadas:
!`ls supabase/migrations/`

La plantilla canónica de `/spec` **no se resuelve aquí**: vive fuera del repo, y los bloques de
esta sección corren acotados al directorio de trabajo, así que un `ls` a `~` los bloquea y
cancela la invocación entera antes de empezar. Se resuelve en la Fase 5, con `Read`.

---

## Qué hace esta skill, y qué no

Produce **la spec de una sola máquina nueva**: el motor, su entrada en el catálogo, la miniatura,
las teclas del mando y la migración que mete su fila en `public.games`. La guarda en
`specs/NN-<slug>.md` en estado **`Borrador`**.

**No escribe código de juego.** Ni un `constants.ts`, ni el `case` de `drawPreview()`, ni el
`.sql` de la migración. El único archivo que crea es la spec. Implementar es trabajo de
`/spec-impl`, con la spec ya aprobada por un humano.

**No reemplaza a `/spec` ni la ejecuta como comando, pero sí la lee.** `/spec` sigue siendo la
skill general para cualquier feature del vault, y su `template.md` es **la plantilla canónica de
lo que es una spec en este flujo**. Ésta es su especialización para el caso que se repite y que
tiene diez puntos de contacto conocidos, seis de ellos silenciosos. Hereda de `/spec` la
filosofía, el estado `Borrador` por defecto y el «no propongas implementar después de guardar»;
se aparta en que su cuestionario no es genérico y en que su plan se valida contra una tabla de
cobertura. **Antes de redactar nada, en la Fase 5, se leen su `template.md` y su `SKILL.md`.**

**Idioma.** Las specs de este repo están en español, con tildes y ortografía correcta. La spec
generada va en español **aunque el usuario invoque en inglés**. Tus respuestas siguen el idioma
del prompt.

## Archivos de apoyo

Dos propios, en el mismo directorio que esta skill, más la plantilla canónica de `/spec`. **No
los leas antes de tiempo**: cada uno tiene su fase y cargarlos antes es gastar contexto en algo
que todavía no se usa.

- `engine-contract.md` — al empezar la **Fase 2**. El contrato, los ocho patrones no negociables
  y la lente con la que se lee un `game.js` de navegador.
- `contact-points.md` — al empezar la **Fase 4**. Los diez puntos de contacto, quién avisa si
  falta cada uno, y la regla de agrupación del plan.
- **La skill `/spec`** — al empezar la **Fase 5**, antes de redactar. Su `template.md` define qué
  es una spec en este flujo y su `SKILL.md` fija las reglas de redacción. Vive fuera del repo, en
  `~/.claude/skills/spec/`, que puede ser un enlace a `~/.agents/skills/spec/`; se abre con
  `Read`, no con `ls`.

---

## Fase 1 — Situar el juego

El argumento recibido es: `$ARGUMENTS`

Decide el camino con esta tabla:

| `$ARGUMENTS`                                                                                                    | Camino                                                            |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Vacío                                                                                                           | Lista `references/started-games/` y pregunta. **Para.**           |
| Coincide con una carpeta de `references/started-games/` (ignorando el prefijo `NN-`, sin distinguir mayúsculas) | **Camino A — puerto.** Sigue sin preguntar.                       |
| Corresponde a una carpeta por sinónimo (`breakout` → `04-arkanoid`)                                             | **Camino A**, confirmando la equivalencia en una línea. **Para.** |
| Cualquier otra cosa                                                                                             | **Camino B — máquina nueva.** Confírmalo en voz alta. **Para.**   |

Texto exacto del camino B:

```
No hay carpeta en references/started-games/ que corresponda a «$ARGUMENTS».
Lo trato como máquina nueva: el motor se escribe desde cero contra el contrato
de lib/games/engine.ts, sin material de referencia.

¿Es eso, o te referías a uno de estos?
  02-asteroids   (ya portado, es el ejemplo trabajado)
  03-tetris
  04-arkanoid
```

Si el argumento nombra **dos juegos**, para: una spec, una máquina. Propón dos invocaciones.

Antes de pasar a la Fase 2, en los dos caminos, lee:

- `CLAUDE.md`, apartados «Motores de juego» y «El marcador».
- `specs/05-asteroids-motor-de-juego.md` — el ejemplo trabajado de una spec de motor.
- `specs/07-solo-asteroids-y-marcador-limpio.md` — de dónde salen la regla de «la escena se
  mueve, no se copia» y el razonamiento de los pasos indivisibles.

No leas las specs 01–04 ni la 06: cuestan contexto y no aportan al puerto de una máquina.

---

## Fase 2 — Reconocer el material

Lee primero `engine-contract.md` (in the same directory as this skill).

**Camino A.** Mide antes de leer (`wc -l`), luego lee el fuente completo y produce un
**inventario de features**: una lista plana y numerada de todo lo que el original hace, con cada
ítem marcado:

- `base` — es el juego. Sin esto no es ese juego.
- `extra` — se puede recortar sin que deje de serlo.
- `imposible-hoy` — no cabe en el pipeline actual: assets binarios, audio, ratón, `localStorage`
  propio, teclas fuera de las cinco del mando.

Anota también, con número de línea, dónde el original hace las **cuatro cosas que hay que matar**
que lista `engine-contract.md`. Eso es el trabajo real del puerto y sostiene el plan.

**Camino B.** El inventario lo dicta el usuario en el bloque E. Conviértelo al mismo formato de
tres marcas.

Cierra la fase imprimiendo el inventario y esta línea: _«Esto es lo que trae el original. En la
Fase 4 decidimos qué entra.»_ **Para.**

---

## Fase 3 — Cuestionario

Cuatro bloques obligatorios —A, B, C, D— más uno condicional: **E, solo en el camino B, y va
antes que los demás**. Un bloque por mensaje. **Para y espera respuesta tras cada uno.**

No salgas de esta fase hasta poder responder, sin suponer nada:

1. ¿Qué archivos aparecen o cambian?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo verifico que está terminado?
4. **¿Qué tres cifras emite `onState()` y cómo se llaman en el HUD?**

### Bloque E — De dónde sale el juego (solo camino B)

> Esta máquina no viene de `references/started-games/`, así que hay tres cosas que en un puerto
> vendrían resueltas:
>
> 1. **Origen del código.** ¿Se escribe desde cero contra el contrato de `lib/games/engine.ts`, o
>    hay una fuente que quieras portar (un repo, un gist, un archivo que me pases)? Recomendación:
>    si existe una fuente, dámela. Portar es mucho más barato que inventar, y el equilibrio del
>    juego viene hecho.
> 2. **Las reglas, en cinco líneas.** Qué controla quien juega, cómo se puntúa, cómo se muere,
>    cómo sube la dificultad y cuándo se acaba. Si no caben en cinco líneas, la máquina es
>    demasiado grande para una spec y hay que partirla.
> 3. **El mundo.** `GameWorld` es un tamaño lógico fijo; `asteroids` usa 800×600. ¿Qué
>    `width`×`height` propones, y el mundo es toroidal —se sale por un borde y se entra por el
>    opuesto—, con paredes, o con scroll? Recomendación: copia el tamaño de `asteroids` salvo que
>    el juego pida otra proporción; `GameCanvas` lo escala y no se nota la diferencia.

### Bloque A — Identidad de la máquina

> Antes de tocar el motor, cierro la identidad. Cinco cosas:
>
> 1. **`id`.** El literal que entra en `GameId`, en la URL `/jugar/<id>`, en la clave de
>    `ENGINES`, en `ENGINE_KEYS` y en la clave ajena de `public.games`. Regla: minúsculas, sin
>    tildes ni guiones, y **no reutilizar** un id de escena archivada (`caida`, `muro`, `rocas`…):
>    ésos son nombres de fantasía, no de máquina.
> 2. **`title`.** El rótulo del catálogo. MAYÚSCULAS y **sin tildes**: Press Start 2P no tiene
>    glifos acentuados y saldrían huecos.
> 3. **`cat`.** Vocabulario cerrado de seis, no se inventa uno nuevo aquí: `ARCADE`, `CLASICOS`,
>    `DISPAROS`, `REFLEJOS`, `PUZZLE`, `LABERINTO`.
> 4. **`glow`.** Solo hay tres neones, los de `app/globals.css`: `#00f5ff` (cian), `#ff006e`
>    (magenta), `#f5ff00` (amarillo). `asteroids` ya usa el amarillo. Recomendación: uno de los
>    otros dos, para que las tarjetas no se confundan de un vistazo.
> 5. **La miniatura.** ¿La escena archivada de `lib/preview-art.ts` **se mueve** a `GameId`, o se
>    dibuja una nueva? Recomendación: moverla si existe —`caida` es una pantalla de Tetris y
>    `muro` una de Arkanoid, ya dibujadas—. Se mueve, no se copia: sale de `ArchivedPreviewId` y
>    entra por `GameId`. Si la máquina no tiene escena archivada, hay que dibujar un `case` desde
>    cero.

### Bloque B — Las tres cifras del HUD

Ninguna pregunta de este bloque es opcional. Es el bloque caro: descubrirlo a mitad del puerto
cuesta reescribir `emitState()`, el HUD y el estado inicial del gabinete.

> El HUD del gabinete tiene **tres cifras y solo tres**: `GameState` es `{ score, lives, level }`.
> Cuatro preguntas:
>
> 1. **`score`.** ¿La puntuación del original tal cual, sin retocar la tabla de puntos, o una
>    escala nueva? Recomendación: la del original sin tocar un número. Está equilibrada y además
>    es la cifra exacta que se guarda en `public.scores`.
> 2. **`lives`.** ¿Qué son las vidas en esta máquina? Si el juego **no tiene vidas** —Tetris no
>    las tiene—, la salida acordada del vault es **extender el contrato**: `GameMount` gana
>    `hud: readonly [string, string, string]`, `asteroids` declara
>    `["PUNTUACION", "VIDAS", "NIVEL"]` sin cambiar un píxel y esta máquina declara los suyos. Es
>    lo que recomiendo. La alternativa —meter otra cifra bajo el rótulo `VIDAS`— deja una etiqueta
>    que miente, y las etiquetas que mienten se quedan para siempre. Si eliges extender, el cambio
>    entra en esta spec como paso 0 y toca `lib/games/engine.ts`,
>    `lib/games/asteroids/index.ts` y el HUD de `components/play-cabinet.tsx`.
> 3. **`level`.** ¿Qué es el nivel aquí: la velocidad del original, el número de pantalla, o
>    siempre `1`? Si es siempre `1`, dilo ahora y lo escribo como decisión, no como olvido.
> 4. **Fin de partida.** ¿Cuándo se llama `onGameOver(score)`, exactamente? Tiene que ser un
>    evento que ocurre **una sola vez** por partida y que solo se rearma en `restart()`. Si el
>    original tiene más de una forma de acabar, nómbralas todas.

Antes de hacer este bloque, mira si el contrato ya trae `hud` (está en el Session context de
arriba). Si ya lo trae, no propongas el paso 0: solo pregunta los tres rótulos.

### Bloque C — El mando y lo que no cabe en él

> El gabinete tiene **cinco botones fijos** —`←` `↑` `↓` `→` `ESPACIO`— y los que la máquina no
> use se pintan **deshabilitados, no escondidos**: esconderlos descuadra la rejilla. Cuatro
> preguntas:
>
> 1. **Teclas vivas.** ¿Cuáles de los cinco usa la máquina y para qué? Tu respuesta es
>    literalmente la línea de `ENGINE_KEYS` y la línea `controls` de la ficha.
> 2. **Teclas que no están en el mando.** El original usa otras (`Z`, `C`, `P`, `Shift`…).
>    ¿Recortamos esas funciones a los cinco botones, o el motor acepta teclas extra que solo
>    funcionan con teclado físico? Recomendación: **recortar**. Una tecla sin botón es invisible
>    en el gabinete y en móvil no existe; además `createInput()` solo hace `preventDefault` de
>    las cinco, así que cualquier otra hará scroll de la página al pulsarla.
> 3. **Ratón.** ¿Hay algo que el original controle con el puntero? `lib/games/input.ts` solo sabe
>    de teclado. Recomendación: convertirlo a `←`/`→`; no toca el contrato, ni `input.ts`, ni el
>    mando. Añadir soporte de puntero es media spec extra y conviene decirlo ahora.
> 4. **Assets binarios.** ¿El original carga imágenes o sonidos? Hoy no hay pipeline para eso:
>    ningún motor carga archivos, todo se dibuja con primitivas de canvas y `GameCanvas` no tiene
>    estado de «cargando». Recomendación: redibujar con primitivas.

### Bloque D — El recorte y la fila de la base de datos

> El material trae más de lo que cabe. Cinco preguntas de alcance:
>
> 1. **Qué entra del original.** [pega aquí el inventario de la Fase 2, numerado]. ¿Cuáles van
>    dentro y cuáles a «Fuera de alcance»? Recomendación: el juego base entero y nada más. Los
>    extras entran después, con el motor ya en producción y sin riesgo.
> 2. **Persistencia local.** Si el original guarda algo en `localStorage` —tema, récord,
>    preferencias—, en el vault el récord vive en Supabase y en `localStorage` solo quedan la
>    sesión y el `device_id`. Recomendación: tirar esa parte entera. Un segundo récord local
>    contradiría al marcador compartido.
> 3. **Sonido.** Ningún motor del vault suena hoy. Recomendación: silencio. Meter audio arrastra
>    la decisión de mute, volumen y desbloqueo del `AudioContext`.
> 4. **Los números.** ¿`constants.ts` es copia literal del original, **sin retocar ni uno**, o hay
>    reequilibrio en esta spec? Recomendación: copia literal. El juego ya está equilibrado y
>    reajustarlo sin jugarlo es adivinar.
> 5. **La fila de `public.games`.** ¿Con qué `sort_order` entra? (Consulta antes el de las filas
>    que ya hay.) Y confirma que la migración se escribe en
>    `supabase/migrations/<sello>_<algo>.sql` y se aplica con `npx supabase db push` —**nunca**
>    con `apply_migration` por MCP: eso iría al proyecto remoto sin dejar rastro en git.

---

## Fase 4 — Recorte y cobertura

Lee `contact-points.md` (in the same directory as this skill).

Aquí propones tú y aprueba el usuario. Imprime **cuatro tablas** y **para** tras las tres
primeras juntas y otra vez tras la cuarta.

**Tabla 1 — El triplete del HUD.** Filas `score`, `lives`, `level`. Columnas: `Cifra del contrato`
| `Qué es en esta máquina` | `Rótulo` | `¿El rótulo dice la verdad?`. Si alguna casilla de la
última columna es «no», la spec **tiene que** llevar escrita la salida elegida y su coste.

**Tabla 2 — El mando.** Cinco filas fijas: `←`, `↑`, `↓`, `→`, `ESPACIO`. Columnas: `Botón` |
`Qué hace` | `¿Vivo?`. Debajo, la lista de funciones del original que **se pierden** por no tener
botón.

**Tabla 3 — El recorte.** El inventario de la Fase 2 repartido en tres columnas: `Dentro` |
`Fuera de alcance (futuras specs)` | `Descartado con razón técnica`.

Si el recorte deja fuera más de la mitad del inventario, dilo: _«Esta máquina cabe, pero entra
recortada al hueso. La alternativa es partirla en dos specs: motor base primero, extras
después.»_ Recomendación: recortar, no partir — el motor base ya es una spec grande.

**Tabla 4 — Cobertura de los diez puntos.** Se aprueba antes de escribir nada:

```
Cobertura de los diez puntos de contacto. Cada uno va a un paso del plan
o queda fuera con razón escrita. No hay tercera opción.

| ID  | Punto                                    | Paso | Nota                                    |
| --- | ---------------------------------------- | ---- | --------------------------------------- |
| P1  | literal en GameId                        | 6    |                                         |
| ... |                                          |      |                                         |
| P6  | mover la escena de ArchivedPreviewId     | —    | no aplica: esta máquina no tiene escena archivada |
```

**Una spec cuya tabla de cobertura tenga una casilla vacía no se guarda.** «No aplica» es una
respuesta válida —P6 y P9 lo son a menudo— pero exige razón escrita, y esa razón acaba en
«Decisiones tomadas y descartadas».

---

## Fase 5 — Escribir la spec

**Antes de redactar una sola línea, lee la skill `/spec`.** Es la dueña de la plantilla; esta
skill solo la especializa. Dos archivos, en este orden:

1. `template.md` — la forma canónica de una spec: qué va en cada sección, las reglas del
   encabezado, los antipatrones de los criterios de aceptación y las reglas globales del
   documento.
2. `SKILL.md` — sus reglas de redacción y su filosofía, que esta skill hereda.

Está fuera del repo, así que **ábrela con `Read`, nunca con `ls` ni con otro comando de shell**:
un `ls` a `~` sale del directorio de trabajo y queda bloqueado. Prueba estas rutas por orden y
quédate con la primera que abra:

```
~/.claude/skills/spec/template.md
~/.agents/skills/spec/template.md
```

Si ninguna de las dos abre —la skill no está instalada en esta máquina—, **dilo en una
línea y sigue**: `specs/05-asteroids-motor-de-juego.md` es la plantilla viva del repo y basta
para redactar. No inventes una estructura propia ni des la fase por bloqueada.

Cuando haya discrepancia entre el `template.md` y el apartado «La forma de la spec» de más abajo,
**manda `template.md` en lo estructural** —qué secciones existen y qué va en cada una— y manda
este archivo en lo específico del vault: las secciones obligatorias, los subtítulos de los
criterios de aceptación y el orden del plan. No son reglas que choquen: lo de abajo es el mismo
esqueleto con las casillas de una máquina nueva ya rellenas.

Con las dos lecturas hechas, escribe la spec **entera, de una vez**, en el chat, con todas las
secciones y en el orden de «La forma de la spec». No la guardes todavía. Al terminar pregunta qué
ajustar, y aplica los cambios sobre el documento completo.

---

## Fase 6 — Guardar y parar

1. Número correlativo mirando `specs/`.
2. Slug corto desde el objetivo. **Confirma el nombre de archivo antes de escribirlo.**
3. Escribe `specs/NN-slug.md`. Estado `Borrador`, nunca `Aprobado`.
4. Confirma: ruta del archivo, recordatorio de que está en `Borrador` y que aprobarlo es un acto
   humano, y el siguiente paso literal: `/spec-impl NN-slug`.
5. **Para ahí.** No propongas implementar, no crees ramas, no toques `specs/.spec-config.yml`
   —de eso ya se ocupa `/spec`—.

---

## La forma de la spec

Esto **no sustituye al `template.md` de `/spec`**, que se lee en la Fase 5: es ese mismo esqueleto
con las casillas de una máquina nueva ya rellenas. Lo estructural manda allí; lo de aquí es lo
específico del vault.

Encabezado en blockquote, sin tablas:

```markdown
# SPEC NN — Título corto y descriptivo

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 07
> **Fecha:** YYYY-MM-DD
> **Objetivo:** Una sola frase. Si necesitas dos, la máquina es demasiado grande.
```

`Depende de:` lleva como mínimo SPEC 05 —el contrato de motor— y SPEC 07 —«toda máquina que entre
entra con motor»—. Añade SPEC 06 si la spec toca el marcador más allá de la fila de `games`.

Secciones, en este orden:

1. `## Por qué existe esta spec` — **obligatoria aquí**, aunque en `/spec` sea opcional. Toda
   máquina nueva toma al menos dos decisiones no obvias: el recorte y el triplete del HUD.
2. `## Alcance` — con `**Dentro:**` y `**Fuera de alcance (para futuras specs):**`. Las dos.
3. `## Modelo de datos` — con cuatro sub-bloques: `### El motor — lib/games/<id>/`,
   `### La máquina nueva — entrada en GAMES`, `### El HUD y las tres cifras`,
   `### La fila de public.games`.
4. `## Plan de implementación` — pasos numerados, cada uno commiteable por separado y con su
   línea `Verificación:`. Respeta la regla de agrupación de `contact-points.md`.
5. `## Criterios de aceptación` — checkboxes `- [ ]`, agrupados bajo estos subtítulos en negrita:
   **El motor**, **El catálogo y las rutas**, **El mando y el HUD**, **La miniatura**,
   **El marcador**, **Nada más se ha movido**, **Documentación**.
6. `## Decisiones tomadas y descartadas` — agrupadas por tema. Cada una empieza con `**Sí:**` o
   `**No:**` y explica **qué se pierde**, no solo qué se eligió.
7. `## Riesgos` — tabla de dos columnas, `Riesgo` | `Mitigación`.
8. `## Lo que **no** entra en esta spec` — lista final de refuerzo.

Reglas de prosa, calcadas de las specs que ya existen:

- Una idea por frase. Si una frase lleva dos comas y un punto y coma, pártela.
- **Nombres concretos con ruta.** `lib/games/tetris/index.ts`, no «el módulo del motor».
- **Cero TODOs.** Un TODO en una spec es una decisión que no se tomó.
- Nada de código ejecutable largo: fragmentos que ilustran estructuras, no funciones enteras.
- Tono seco. Sin marketing.

El hook de este repo pasa Prettier al guardar, así que no hace falta alinear las tablas a mano.

## Tono al preguntar

Directo y concreto. No te disculpes por preguntar: el usuario invocó esta skill precisamente para
que preguntes. Preguntas cerradas con 2–4 opciones, numeradas, una por línea, y **marca cuál
recomiendas y por qué**. Nada de «si no te importa» ni «¿quizás podrías…?».

---

## Hard rules

- **Nunca escribas código de juego.** Ni `constants.ts`, ni el `case` de `drawPreview()`, ni el
  `.sql`. El único archivo que creas es `specs/NN-slug.md`.
- **Nunca toques `references/started-games/`.** Es material de referencia: se lee, no se edita.
- **Nunca ejecutes nada contra Supabase.** Ni `db push`, ni `apply_migration`, ni `execute_sql`.
  La spec _describe_ la migración; la aplica `/spec-impl` cuando llegue su paso.
- **Nunca marques la spec como `Aprobado`.** Se guarda en `Borrador`. Aprobar es humano, y es lo
  único que desbloquea `/spec-impl`: su Fase 2 bloquea cualquier otro estado.
- **Nunca propongas implementar después de guardar.** Ni ramas, ni git, ni «¿empiezo?».
- **Una spec, una máquina.** Dos juegos son dos invocaciones.
- **Nunca inventes vocabulario.** `cat` es uno de seis, `glow` uno de tres, el título va sin
  tildes. Si el usuario quiere una categoría o un neón nuevo, eso es un cambio de `lib/games.ts`
  y de `app/globals.css` que merece su propia decisión escrita, no un valor colado.
- **Nunca cierres el triplete del HUD por defecto.** Una spec que no menciona qué son las vidas
  en esa máquina está incompleta.
- **Nunca guardes con la tabla de cobertura incompleta.**
- **Nunca redactes la spec sin haber leído antes el `template.md` de `/spec`.** Es la dueña de la
  plantilla; esta skill solo la especializa. La única excusa para saltárselo es que no esté
  instalada, y en ese caso se dice en voz alta y se usa `specs/05-asteroids-motor-de-juego.md`.
- **Si el usuario quiere saltarse el cuestionario**, recuérdaselo una vez: _«Las preguntas de
  ahora son las que evitan reescribir el motor a mitad del paso 4. ¿Seguro?»_. Si insiste,
  respétalo y déjalo escrito en las decisiones: «Definición rápida sin clarificación detallada».
