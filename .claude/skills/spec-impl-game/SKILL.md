---
name: spec-impl-game
description: Implementa una spec de máquina nueva ya aprobada — valida el estado, crea la rama spec-NN-slug e implementa el plan paso a paso — y al terminar encadena skin-designer y después mobile-porter, uno detrás de otro. Para las specs que no traen máquina nueva remite a /spec-impl.
disable-model-invocation: true
argument-hint: "<NN-slug de la spec de la máquina>"
---

# /spec-impl-game — Implementador de specs de máquina

## Session context

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Configuración de creación de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (por defecto, no hay archivo de configuración)"`

El catálogo hoy:
!`grep -n "export type GameId" lib/games.ts`

Motores registrados:
!`cat lib/games/engines.ts`

Migraciones aplicadas:
!`ls supabase/migrations/`

Los dos ledgers de la cadena de cierre:
!`ls .claude/skin-designer/ .claude/mobile-porter/ 2>/dev/null || echo "OJO — falta alguno de los dos directorios de agente"`

---

## Qué hace esta skill, y qué no

Implementa **una spec de máquina nueva ya aprobada por un humano**, y al terminar
encadena los dos subagentes que hoy se piden a mano y se olvidan: `skin-designer`,
que la viste, y `mobile-porter`, que porta su ficha al teléfono. **Primero uno, y
sólo cuando ha devuelto, el otro.** Nunca los dos a la vez.

**No reemplaza a `/spec-impl`, la especializa.** Las fases 1, 2, 4 y 5 son las suyas:
mismo reconocimiento del argumento, mismo bloqueo si el estado no significa
«Aprobado», misma rama `spec-NN-slug`, mismo ritmo de un paso y una pausa. Lo que
añade son tres fases propias: la comprobación de que la spec **trae máquina** (Fase 3),
la puerta de verificación antes de llamar a nadie (Fase 6) y la cadena de agentes
(Fase 7).

**No implementa specs que no sean de máquina.** Una spec de interfaz como la 13 no
tiene juego que vestir ni ficha nueva que portar; para ésas está `/spec-impl`, y la
Fase 3 remite ahí sin ofrecer alternativas.

**No escribe specs.** Ni las crea, ni las reescribe, ni cambia su estado: eso es de
`/spec-game` al principio y de un humano al final.

**Idioma.** Tus respuestas van en español, con tildes y ortografía correcta, aunque
la invocación venga en inglés.

## Archivos de apoyo

Ninguno propio. Los dos que necesita ya existen en el repo y se leen prestados, **cada
uno en su fase y no antes**:

- `.claude/skills/spec-game/contact-points.md` — al empezar la **Fase 5**. Los diez
  puntos de contacto de una máquina nueva y quién avisa si falta cada uno; seis de los
  diez no los vigila nadie.
- `.claude/skills/spec-game/engine-contract.md` — durante la **Fase 5**, sólo si la
  spec no copia el contrato dentro. Los ocho patrones no negociables del motor.

Los ledgers de los agentes (`.claude/skin-designer/skins.md` y
`.claude/mobile-porter/pantallas.md`) **no los lees ni los escribes tú**: son de ellos.
Los citas después, con lo que te devuelvan.

---

## Fase 1 — Identificar la spec

El argumento recibido es: `$ARGUMENTS`

Si `$ARGUMENTS` viene vacío:

- Lista los archivos de `specs/` (ya los tienes arriba).
- Pide el nombre exacto de la spec.
- **Para.** No continúes.

Si `$ARGUMENTS` trae valor:

- Búscala en `specs/`. El usuario puede haber escrito el nombre entero
  (`14-galaga-formaciones`), sólo el número (`14`) o sólo el slug
  (`galaga-formaciones`). Resuelve los tres casos.
- Si no la encuentras, enseña las specs disponibles y pide que corrijan el nombre.
  **Para.**
- Si la encuentras, sigue a la Fase 2.

Las specs de `specs/game-jam/` **no cuentan**: son borradores de alcance sin número y
por definición no están aprobadas. Si el argumento apunta a una de ellas, dilo y
recuerda que aprobar una es mudarla a `specs/NN-<slug>.md`. **Para.**

---

## Fase 2 — Validar el estado de la spec

Lee el archivo que localizaste en la Fase 1.

Busca la línea del estado, cerca del encabezado. La etiqueta suele ser `**Estado:**`
en este repo, pero puede venir en cualquier idioma (`**Status:**`). Reconócela por
posición y por los valores que la rodean, no por la etiqueta exacta.

**Regla absoluta:** sólo continúas si el estado **significa «Aprobado»**, sea cual sea
el idioma.

| Categoría del estado                         | Ejemplos                                  | Qué haces                                                 |
| -------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| Aprobado                                     | `Aprobado`, `Approved`, `Approuvé`, …     | Sigues a la Fase 3.                                       |
| Borrador                                     | `Borrador`, `Draft`, `Borrador de jam`, … | **Paras.** Mensaje de abajo.                              |
| En revisión                                  | `En revisión`, `In review`, …             | **Paras.** Mensaje de abajo.                              |
| Implementado                                 | `Implementado`, `Implemented`, …          | **Paras.** Mensaje de abajo.                              |
| Obsoleto                                     | `Obsoleto`, `Obsolete`, …                 | **Paras.** Mensaje de abajo.                              |
| No hay línea de estado / valor irreconocible | —                                         | **Paras.** El archivo no sigue el formato esperado; dilo. |

Si dudas de si un valor significa «aprobado», **no asumas**. Para y pide que lo
aclaren o que dejen el estado con la palabra canónica.

**Mensaje de error cuando el estado no significa Aprobado:**

```
❌ No puedo implementar esta spec.

Estado actual: [ESTADO ENCONTRADO]
Sólo trabajo con specs cuyo estado significa "Aprobado".

Para continuar tienes dos opciones:
  1. Si la spec está lista, ábrela y cambia el estado a "Aprobado" a mano.
     Ese cambio lo hace el humano, no el agente.
  2. Si a la spec le falta trabajo, usa /spec [nombre] para retomarla.
```

No ofrezcas alternativas, no sugieras «puedo empezar igual si quieres». El bloqueo es
intencionado.

---

## Fase 3 — ¿Esta spec trae una máquina?

Esta fase es la que distingue este comando de `/spec-impl`, y existe porque su cierre
llama a dos agentes que **necesitan un juego**: `skin-designer` viste una máquina y
`mobile-porter` porta su ficha. Sin máquina, la cadena no tiene sujeto.

Busca en el cuerpo de la spec **tres señales**, y hacen falta las tres:

1. **Motor propio** — un directorio nuevo `lib/games/<id>/` con los archivos del motor.
2. **Registro** — una línea nueva en `ENGINES`, de `lib/games/engines.ts`.
3. **Migración** — un `.sql` que meta la fila de la máquina en `public.games`.

De paso extrae el **`<game-id>`**: el literal que la spec añade a `GameId` en
`lib/games.ts` y que da nombre al directorio del motor. Es el argumento de la Fase 7,
así que tiene que salir sin ambigüedad. Si la spec nombra más de un candidato o el id
no se deduce con seguridad, **pregunta cuál es aquí mismo** en vez de arrastrar la duda
hasta el final.

Si falta alguna de las tres señales, imprime la tabla con lo que encontraste y **para**:

```
❌ Esta spec no trae una máquina nueva.

  Motor en lib/games/<id>/ : [sí|no]
  Línea en ENGINES         : [sí|no]
  Migración a public.games : [sí|no]

/spec-impl-game sólo implementa specs de máquina, porque su cierre invoca a
skin-designer (necesita un juego) y a mobile-porter (necesita su ficha).
Para esta spec usa /spec-impl NN-slug.
```

Igual que la Fase 2: sin alternativas y sin «puedo intentarlo igual».

---

## Fase 4 — Crear la rama y enseñar la spec

Con el estado confirmado y la máquina identificada:

1. Deriva el nombre de la rama del nombre del archivo sin extensión, en formato
   `spec-NN-slug`. `14-galaga-formaciones.md` → rama `spec-14-galaga-formaciones`.

2. Lee `AutoCreateBranch` de la configuración que tienes en el Session context.

   - Si no hay archivo, falta el valor o no se reconoce → vale `true`, que es el
     defecto. Sólo un `false` explícito desactiva la creación automática.

   **Con `AutoCreateBranch: true`:** adelante sin preguntar.

   - Si la rama **no existe**: `git checkout -b spec-NN-slug`.
   - Si **ya existe**: avisa de que existía —puede significar que se retoma trabajo
     anterior—.
   - En los dos casos, `git checkout spec-NN-slug` y confirma el cambio antes de seguir.

   **Con `AutoCreateBranch: false`:** pregunta antes de tocar git:

   ```
   AutoCreateBranch está en false.
   ¿Creo la rama spec-NN-slug y me cambio a ella? [s/N]
   ```

   Si dicen que no, implementas en la rama actual, pero **pide confirmación explícita**
   de que se trabaja ahí. No improvises: espera la respuesta.

3. Confirma en pantalla:

   ```
   ✅ Listo para implementar.

   Spec:    specs/NN-slug.md
   Máquina: <game-id>
   Rama:    spec-NN-slug  (activa)
   Estado:  Aprobado   (← el valor real encontrado en la spec)
   ```

4. **No empieces a implementar todavía.** Antes enseña el resumen de la spec, para que
   esté fresco: el **objetivo** (la línea del encabezado), el **alcance** —lo que entra
   y lo que se queda fuera—, el **plan de implementación** con sus pasos numerados y los
   **criterios de aceptación**. Reconoce las secciones por su significado, no por su
   título exacto.

---

## Fase 5 — Implementar paso a paso

Lee `.claude/skills/spec-game/contact-points.md` al empezar esta fase: son los diez
sitios que toca una máquina nueva y la nota de cuáles fallan en silencio. Si la spec no
copia el contrato del motor dentro, lee también `engine-contract.md`.

Después, anuncia:

```
Voy a implementar la spec siguiendo su plan al pie de la letra.
Paro después de cada paso para que revises el diff.

¿Empezamos por el Paso 1?
```

Espera confirmación explícita. No arranques sin ella.

**Una regla por encima de todas:** implementa lo que dice la spec. Si algo te parece
mejorable, dilo como observación e implementa lo acordado. Los cambios a la spec van a
la spec, no al código por sorpresa.

**Ritmo:**

- Implementas un paso del plan.
- Resumes qué archivos tocaste y qué hiciste.
- Dices: `Paso N completado. ¿Revisas el diff y sigo con el Paso N+1?`
- Esperas confirmación.

**Las cinco reglas del vault que esta fase añade:**

- **Los diez puntos de contacto se cierran todos.** Seis de ellos —`ENGINES`,
  `ENGINE_KEYS`, `ArchivedPreviewId`, la migración, la pestaña del salón y las cifras de
  `lib/landing.ts`— compilan igual si te los dejas, y el fallo aparece en pantalla o en
  producción. La tabla de `contact-points.md` es la lista de comprobación.
- **Las migraciones se aplican con `npx supabase db push`** y quedan en
  `supabase/migrations/`. **Nunca `apply_migration` por MCP**: iría al proyecto remoto
  sin dejar rastro en el repo.
- **El archivo en disco no es el que acabas de escribir.** El hook `PostToolUse` de
  `.claude/settings.json` pasa `eslint --fix` y `prettier --write` tras cada
  `Write`/`Edit`. Haz `Read` antes de cualquier `Edit` posterior sobre un archivo que ya
  tocaste.
- **Ni una línea fuera de la spec.** No toques el motor de otra máquina, no aproveches
  para refactorizar y no añadas lo que no está en el plan.
- **Nada de color todavía.** Las paletas y las skins son de la Fase 7; si la spec no las
  pide explícitamente, el motor entra con los colores que la spec le dé y se viste
  después.

**Si aparece una ambigüedad** que la spec no resuelve: para, descríbela exacta, propón
dos o tres opciones concretas y espera la decisión. No improvises.

**Si te piden algo fuera del alcance de la spec:** recuérdalo, sugiere anotarlo para la
siguiente y no lo implementes en esta rama.

---

## Fase 6 — Verificar antes de llamar a nadie

Al terminar el último paso del plan, **no llames a ningún agente todavía**.

1. Repasa **los criterios de aceptación uno a uno** contra el código real, no contra tu
   recuerdo de haberlos escrito. Enseña la lista con su marca.
2. Corre las tres comprobaciones, en este orden:

   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```

3. Enseña el resultado.

**Si falla un criterio o cualquiera de las tres comprobaciones, paras ahí.** No se
invoca a nadie sobre código roto: `skin-designer` escribe dentro de `lib/games/<id>/` y
heredaría el desastre; `mobile-porter` mide en un Chrome real y necesita que el sitio
construya. Arregla lo que falle —dentro del alcance de la spec— y vuelve a verificar.

Con todo en verde, pregunta y espera:

```
✅ Todos los pasos del plan están implementados y verificados.

Ahora viene la cadena de cierre, en dos rondas y por este orden:
  1. skin-designer  → viste <game-id> con clasico, neon y retro
  2. mobile-porter  → porta /juego/<game-id> al teléfono

¿Lanzo skin-designer sobre <game-id>?
```

---

## Fase 7 — La cadena de cierre, uno detrás de otro

**Regla dura: una sola llamada de subagente por mensaje.** Los dos agentes escriben en
el repo —`skin-designer` en `lib/games/`, `mobile-porter` en `app/` y `components/`— y
lanzarlos a la vez es dos escrituras concurrentes sobre el mismo árbol y sobre el mismo
hook de formateo. **Nunca los pongas en el mismo bloque de herramientas.** El segundo
arranca cuando el primero ha devuelto, y no antes.

### Ronda 1 — `skin-designer`

Invócalo con la máquina nombrada, que es lo único que acepta: una por invocación.

> Aplícale los skins a `<game-id>`. Es una máquina recién implementada por la
> spec `specs/NN-slug.md`; su motor está en `lib/games/<game-id>/` y ya pasa
> `tsc`, `lint` y `build`.

Cuando devuelva, resume qué hizo: qué paletas escribió, en qué archivos y cómo quedó su
ledger `.claude/skin-designer/skins.md`. Si es la primera máquina que se viste en el
repo, habrá montado además la infraestructura común —`lib/games/skins.ts`, el `setSkin()`
del contrato y el selector del gabinete—; dilo, porque eso toca archivos compartidos.

Si vuelve sin haber escrito código, no sigas por inercia: cuenta lo que dijo y pregunta
antes de pasar a la ronda 2.

### Ronda 2 — `mobile-porter`

**Sólo cuando la ronda 1 haya terminado.** Invócalo con la pantalla nombrada, que es lo
único que acepta: una por invocación.

> Porta a móvil `/juego/<game-id>`, la ficha del juego. Es una máquina nueva
> que acaba de entrar al catálogo con la spec `specs/NN-slug.md`.

La ficha es la pantalla correcta: es la que estrena contenido con la máquina —miniatura,
controles y su top 10— y sí está en su alcance. **`/jugar/[id]` lo tiene prohibido** y ya
está portada desde las SPEC 11 y 12; no se la pidas.

Cuando devuelva, resume qué tocó y cómo quedó `.claude/mobile-porter/pantallas.md`.

**Dos avisos que hay que dar y no confundir con un fallo:**

- Si `/juego/[id]` ya figuraba `adaptada` en su ledger, esa ronda es una auditoría y no
  escribirá código. Es correcto.
- El estado `firmada` no lo pone el agente nunca: llega hasta `adaptada`, y firmar es de
  un dedo sobre un teléfono de verdad.

---

## Fase 8 — Cerrar

```
✅ Máquina implementada, vestida y su ficha portada.

  Spec:     specs/NN-slug.md
  Máquina:  <game-id>
  Rama:     spec-NN-slug
  Skins:    [lo que devolvió skin-designer]
  Móvil:    [lo que devolvió mobile-porter]

Quedan tres cosas, y las tres son de humano:
  1. Cambiar el estado de la spec a "Implementado".
  2. El commit final de la rama, antes de fusionarla.
  3. Firmar la pantalla en un teléfono de verdad: mobile-porter la deja
     en "adaptada", y "firmada" no la pone ningún agente.
```

Para ahí. No fusiones la rama, no cambies el estado de la spec por tu cuenta y no
propongas la siguiente máquina —eso es de `game-planner`—.

---

## Hard rules

- **Nunca implementes una spec cuyo estado no signifique «Aprobado».** El bloqueo de la
  Fase 2 no tiene excepción.
- **Nunca implementes una spec sin máquina.** Si falla la Fase 3, remite a `/spec-impl` y
  para.
- **Nunca lances los dos agentes en el mismo mensaje.** Primero `skin-designer`, y
  `mobile-porter` cuando el primero haya devuelto.
- **Nunca invoques a un agente con el código en rojo.** La Fase 6 es una puerta, no un
  trámite.
- **Nunca le pidas a `mobile-porter` la pantalla `/jugar/[id]`**, ni `components/play-*`,
  ni `components/game-pad.tsx`: los tiene prohibidos.
- **Nunca le pidas a `skin-designer` dos máquinas en una ronda.** No lo hace.
- **Nunca escribas tú en `.claude/skin-designer/skins.md` ni en
  `.claude/mobile-porter/pantallas.md`.** Los ledgers son de sus agentes.
- **Nunca cambies el estado de la spec ni la reescribas.** Ni al empezar ni al terminar.
- **Nunca uses `apply_migration` por MCP.** Las migraciones van por
  `npx supabase db push` y quedan en el repo.
- **Nunca implementes fuera del plan de la spec**, ni siquiera si te lo piden a mitad.
- **Nunca sigas sin la confirmación** que pide cada parada: son paradas, no formalidades.

---

## Resumen del comportamiento esperado

```
/spec-impl-game 14-galaga-formaciones

  Fase 1  →  Encuentra specs/14-galaga-formaciones.md
  Fase 2  →  Estado "Aprobado" → ✅ sigue
  Fase 3  →  Motor + ENGINES + migración → ✅ máquina = "galaga"
  Fase 4  →  git checkout -b spec-14-galaga-formaciones
             Enseña objetivo, alcance, plan y criterios
  Fase 5  →  Implementa paso a paso, con pausa en cada uno
  Fase 6  →  Criterios uno a uno + tsc + lint + build → ✅ pregunta
  Fase 7  →  skin-designer("galaga")     … espera … resume
             mobile-porter("/juego/galaga") … espera … resume
  Fase 8  →  Recuerda las tres cosas de humano

/spec-impl-game 13-gamepad-mk-ii   (estado: Implementado)

  Fase 2  →  ❌ para. No crea rama, no toca código.

/spec-impl-game 02-portada-inicio  (estado: Aprobado, sin máquina)

  Fase 3  →  ❌ para. Remite a /spec-impl.
```
