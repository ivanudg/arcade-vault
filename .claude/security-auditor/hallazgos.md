# Ledger del `security-auditor`

Qué reglas de seguridad de Arcade Vault están comprobadas, qué encontró el agente
`security-auditor` en cada ronda y qué se decidió sobre cada cosa. **Este archivo lo escribe el
agente; edítalo a mano sólo para corregirlo.**

Se lee de arriba abajo: la tabla **Reglas** contesta «¿qué llevo comprobado?» de un vistazo, la de
**Hallazgos** lleva el detalle —una fila por cosa que arreglar—, la de **Afirmaciones** guarda lo
que no se puede medir desde aquí, y la de **Rondas** es la serie temporal.

Existe porque un subagente arranca en frío: no ve el hilo padre, ni lo que se habló la semana
pasada, ni el riesgo que ya aceptaste. Sin estas tablas volvería a medir lo mismo cada vez, y sin
saber qué se decidió. Va versionado en git a propósito: es conocimiento del proyecto, como las
specs.

**El repo y la base mandan sobre estas tablas, siempre.** El código de `app/`, `lib/` y
`supabase/migrations/` y el estado real del proyecto remoto son la fuente de verdad. Aquí sólo se
recuerda lo **medido y lo decidido**. Cuando las dos cosas no coincidan, se corrige la tabla, nunca
el código.

**Y una cosa que este ledger no es: no es `references/Security/security-checklist.md`.** Aquél es
el registro que firman las specs y lo escribe un humano; éste lo escribe el agente cada ronda. El
agente **lee** el checklist y avisa si discrepan, pero **nunca lo escribe**: dos escritores sobre
un mismo archivo es como acaban diciendo cosas distintas.

## Cómo se leen las tablas

**Reglas**, una fila por regla de `reglas-seguridad.md`:

| Columna     | Qué es                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `regla`     | `G1` a `G12`. Es la clave, y la comparten las dos primeras tablas                                                                 |
| `eje`       | `base`, `limite`, `cuentas`, `navegador` o `cadena`. Es el bloque de la regla                                                     |
| `estado`    | Uno de los seis de abajo. Vocabulario cerrado                                                                                     |
| `hallazgos` | Cuántas filas tiene en la tabla de Hallazgos. `—` si no se ha auditado                                                            |
| `abiertos`  | Cuántos no están `resuelto`, `aceptado`, `bloqueado` ni `fuera-de-alcance`. **Si es mayor que cero, no puede pasar a `conforme`** |
| `fuente`    | Dónde se comprueba: `repo`, `base`, o `repo+base`. `panel` significa que necesita afirmación                                      |
| `auditada`  | Última vez que se midió de verdad. **No cuenta leer el ledger**                                                                   |
| `revisado`  | Última vez que se reconcilió contra el código                                                                                     |
| `notas`     | Una línea. **Obligatorio** en `no-verificable`, `caducada` y `desincronizada`                                                     |

**Hallazgos**, una fila por cosa que arreglar:

| Columna    | Qué es                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| `id`       | `H01` en adelante. No se reutiliza nunca, ni aunque la fila quede `resuelto`                               |
| `regla`    | La que el arreglo tiene que satisfacer. Si toca dos, la que decide, y la otra en `notas`                   |
| `ancla`    | `archivo:linea` **en el momento de `visto`**, o `SQL n` para lo de la base. Nunca una descripción en prosa |
| `cadena`   | El trozo de texto por el que se reconcilia. **Es por lo que se busca**, no por el número de línea          |
| `gravedad` | `critico`, `serio` o `menor`. Cerrado                                                                      |
| `estado`   | Uno de los siete de hallazgo                                                                               |
| `ascenso`  | La condición que subiría la gravedad. `—` si no la hay                                                     |
| `visto`    | La fecha del alta                                                                                          |
| `notas`    | Una línea: qué lo cierra, o por qué se acepta                                                              |

**La columna `cadena` es la decisión de diseño de este ledger**, y viene prestada de
`.claude/mobile-porter/pantallas.md`: el hook `PostToolUse` pasa `eslint --fix` y `prettier
--write` tras cada escritura, así que **los números de línea se mueven solos entre rondas**. La
regla: **el `ancla` se congela en `visto` y sirve para ir a mirar; la reconciliación se hace con un
`Grep` de la `cadena`.** Para los hallazgos de base de datos la `cadena` es el número de consulta,
que no caduca nunca.

**La columna `ascenso` es propia de aquí**, y existe porque en seguridad la gravedad no es del
hallazgo sino de la **ruta**: la misma vulnerabilidad de `sharp` es `menor` sin `next/image` y
`serio` con él. Una fila sin `ascenso` es una fila que nadie va a volver a mirar.

## Los seis estados de una regla

| Estado           | Quién lo pone | ¿Qué significa?                                                         |
| ---------------- | ------------- | ----------------------------------------------------------------------- |
| `sin-auditar`    | El agente     | Estado de arranque. Nunca se ha medido                                  |
| `conforme`       | El agente     | Cero hallazgos abiertos **de los que el agente sabe ver**               |
| `con-hallazgos`  | El agente     | Tiene al menos uno abierto                                              |
| `no-verificable` | El agente     | Falto el MCP, o depende del panel y no hay afirmacion vigente           |
| `caducada`       | El agente     | Su ultima auditoria es anterior al ultimo cambio de lo que vigila       |
| `desincronizada` | El agente     | La tabla dice una cosa y el repo o la base otra. **Se reporta siempre** |

**`conforme` no es «seguro»**, y esa distancia es la razón de ser de este ledger. `conforme` es un
juicio del agente contra doce reglas escritas. Lo que queda fuera está enumerado en «Qué firma esto
y qué no» de `reglas-seguridad.md`: el panel, el despliegue, la lógica de negocio, lo que estas
reglas no preguntan, lo que hace un paquete de terceros, y un atacante de verdad.

## Los siete estados de un hallazgo

| Estado             | Quién lo pone  | Qué significa                                                                        |
| ------------------ | -------------- | ------------------------------------------------------------------------------------ |
| `abierto`          | El agente      | La `cadena` sigue ahi, o la consulta lo vuelve a devolver                            |
| `resuelto`         | El agente      | Se arreglo. El `ancla` apunta a donde estaba                                         |
| `en-spec`          | El agente      | Hay una spec escrita que lo ataca. Sigue existiendo                                  |
| `reabierto`        | El agente      | Estaba `resuelto` y la reconciliacion volvio a encontrarlo. **La senal mas valiosa** |
| `fuera-de-alcance` | El agente      | Existe, se miro, y no es de estas doce reglas                                        |
| `aceptado`         | **El usuario** | Existe y se deja: el riesgo se asume a sabiendas                                     |
| `bloqueado`        | **El usuario** | No se puede cerrar hoy: plan, infraestructura o dependencia externa                  |

**`aceptado` y `bloqueado` los pone el usuario y el agente no puede ponerlos nunca.** Son juicios
sobre riesgo asumido, y el agente sólo mide. Es la misma frontera que `firmada` en
`pantallas.md` y `firmado` en `motores.md`.

## Señal → Efecto sobre la fila

Se cruza en la Fase 2, y **el repo y la base mandan siempre**.

| Señal                                                                     | Efecto sobre la fila                                                 |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| La `cadena` sigue en el archivo y la fila dice `resuelto`                 | `reabierto`. **El codigo manda**                                     |
| La `cadena` ya no esta y la fila dice `abierto`                           | `resuelto`, con nota: lo cerro otra ronda                            |
| El archivo del `ancla` ya no existe                                       | `caducada` en su regla. **La fila no se borra**                      |
| Una migracion nueva en `supabase/migrations/`                             | G1, G2 y G3 a `caducada`: hay que volver a medir la base             |
| Un `create table` sin su `grant` al lado                                  | Alta en `abierto`, regla G2                                          |
| Un `drop function` sobre una `security definer`                           | G3 a `caducada`. El ACL vuelve al de fabrica y el `revoke` se pierde |
| Un `route.ts` o un `"use server"` nuevo bajo `app/`                       | G4 a `caducada`, con nota: llego un punto de entrada sin auditar     |
| Un `.select(` nuevo que nombre `user_id`, `id` o un correo                | Alta en `abierto`, regla G5                                          |
| Un `process.env` nuevo fuera de las dos excepciones                       | Alta en `abierto`, regla G6                                          |
| `lib/password.ts` cambia y no hay afirmacion del panel posterior          | G7 a `no-verificable`                                                |
| **Un `as` sobre un `searchParams.get()` o `params.get()` en `app/auth/`** | Alta en `abierto`, regla G9                                          |
| `next.config.ts` cambia sus cabeceras, su `source` o su interruptor       | G10 a `caducada`                                                     |
| `PROTEGIDAS` gana una ruta y la pagina no comprueba sesion                | Alta en `abierto`, regla G11                                         |
| **Aparece `next/image` o `images.remotePatterns`**                        | H11 sube de `menor` a `serio` por su `ascenso`                       |
| `package-lock.json` cambia                                                | G12 a `caducada`                                                     |
| Una regla dice `conforme` y tiene hallazgos `abierto`                     | `desincronizada`                                                     |
| El advisor devuelve un lint sin fila en Afirmaciones ni en Hallazgos      | Alta en `abierto`, con la regla que le toque                         |

Esa penúltima fila es la trampa que más se repite: `npm install` cambia el lock sin que nadie
piense en seguridad, y G12 se queda diciendo lo de hace tres meses.

## Reglas de escritura

- **Nunca se borra una fila.** Un hallazgo `resuelto` se queda con su ancla: eso es justamente la
  memoria.
- **Nunca se reordena una tabla.** Las altas van al final. Es lo que mantiene los conflictos de
  merge en una línea aislada.
- **Un `Edit` por fila**, y `Read` antes de cada uno: el hook de formateo del repo pasa Prettier
  tras cada escritura y realinea las columnas, así que el texto en disco no es exactamente el que
  se escribió.
- **No alinees las columnas a mano.** Prettier lo hace.
- **Sin tildes dentro de las celdas.** La prosa de fuera de las tablas sí las lleva.
- **`—` es «no se ha medido»**; vacío sólo lo admite `notas`.
- **Ninguna celda contiene un valor de la base de datos.** Ni un UUID, ni un correo, ni un nombre
  de jugador. Se cuenta, se agrega o se enmascara. **Este archivo va en git.**
- La clave de una fila de Hallazgos es su `id`, y un `id` no se reutiliza jamás.
- **El `ancla` no se actualiza nunca**; se busca por `cadena`.
- Una regla no pasa a `conforme` con `abiertos` mayor que cero, y no pasa a `conforme` **por
  haberla leído aquí**: hay que volver a medirla.

## Reglas

| regla | eje       | estado        | hallazgos | abiertos | fuente     | auditada   | revisado   | notas                                                                                                 |
| ----- | --------- | ------------- | --------- | -------- | ---------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| G1    | base      | con-hallazgos | 1         | 1        | base       | 2026-08-17 | 2026-08-17 | Las tres tablas con RLS y cinco politicas sanas. El unico hallazgo es el drift de `ensure_rls`        |
| G2    | base      | con-hallazgos | 1         | 1        | base       | 2026-08-17 | 2026-08-17 | Los diez grants son exactos. Falla la segunda mitad: `pg_default_acl` de `supabase_admin`             |
| G3    | base      | conforme      | 0         | 0        | base       | 2026-08-17 | 2026-08-17 | Las dos `security definer` cerradas y con `search_path` fijo. Verificado con `has_function_privilege` |
| G4    | limite    | con-hallazgos | 2         | 2        | repo       | 2026-08-17 | 2026-08-17 | La identidad la pone `getUser()` en los dos sitios que deciden. Falta el limite de frecuencia         |
| G5    | limite    | con-hallazgos | 1         | 1        | repo+base  | 2026-08-17 | 2026-08-17 | El unico `critico` del repo. Ninguna consulta usa `select("*")`                                       |
| G6    | limite    | con-hallazgos | 2         | 2        | repo       | 2026-08-17 | 2026-08-17 | Sin secretos en git ni en el bundle. Los dos hallazgos son de higiene, no de exposicion               |
| G7    | cuentas   | conforme      | 0         | 0        | repo+panel | 2026-08-17 | 2026-08-17 | Los dos verificables coinciden y hay afirmacion del panel de hoy                                      |
| G8    | cuentas   | con-hallazgos | 2         | 2        | repo       | 2026-08-17 | 2026-08-17 | Dos filtraciones: una decidida en un comentario, otra sin decidir                                     |
| G9    | cuentas   | con-hallazgos | 1         | 1        | repo+panel | 2026-08-17 | 2026-08-17 | La primera mitad falla. La segunda descansa en la afirmacion del allow-list                           |
| G10   | navegador | conforme      | 0         | 0        | repo       | 2026-08-17 | 2026-08-17 | Las cinco con su valor exacto, `poweredByHeader: false`, y cero `process.argv`                        |
| G11   | navegador | conforme      | 0         | 0        | repo       | 2026-08-17 | 2026-08-17 | Una ruta protegida, comprobada tambien en la pagina, coincidencia exacta                              |
| G12   | cadena    | con-hallazgos | 1         | 1        | repo       | 2026-08-17 | 2026-08-17 | Seis avisos `high` de npm, ninguno con decision escrita todavia                                       |

## Hallazgos

| id  | regla | ancla                                 | cadena                            | gravedad | estado           | ascenso                                              | visto      | notas                                                                                                                                                                                                                                                           |
| --- | ----- | ------------------------------------- | --------------------------------- | -------- | ---------------- | ---------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H01 | G5    | `lib/leaderboard.ts:115`              | `device_id, user_id, created_at`  | critico  | abierto          | —                                                    | 2026-08-17 | El UUID de `auth.users` viaja al HTML de cuatro pantallas publicas y `anon` lo pide directo por PostgREST. Las otras cadenas estan en `:137`, `:177`, `:203`                                                                                                    |
| H02 | G8    | `components/auth-panel.tsx:160`       | `.from("profiles")`               | serio    | abierto          | —                                                    | 2026-08-17 | Comprobar si un nombre esta libre corre **sin sesion**, asi que cualquiera enumera nombres de jugador. Es deliberado y no esta escrito en ningun sitio                                                                                                          |
| H03 | G8    | `components/auth-panel.tsx:189`       | `identities?.length === 0`        | serio    | abierto          | —                                                    | 2026-08-17 | `signUp` confirma si un correo ya tiene cuenta. Hay motivo escrito en el comentario de al lado, pero un comentario no es un registro. Pide veredicto                                                                                                            |
| H04 | G9    | `app/auth/confirmar/route.ts:42`      | `as EmailOtpType`                 | serio    | abierto          | Que Supabase anada un `type` nuevo                   | 2026-08-17 | Cast sin lista cerrada, y en `:59` ese mismo valor decide el destino. `callback/route.ts` hace lo correcto al lado: lee `code` y no ramifica                                                                                                                    |
| H05 | G4    | `app/jugar/[id]/actions.ts:49`        | `export async function saveScore` | serio    | abierto          | —                                                    | 2026-08-17 | Sin limite de frecuencia, y `anon` tiene INSERT sobre `scores` (SQL 3). Declarado fuera de alcance en SPEC 18: pide infraestructura que el repo no tiene                                                                                                        |
| H06 | G6    | `app/(vault)/acerca-de/actions.ts:78` | `if (!apiKey)`                    | menor    | abierto          | Un despliegue en produccion sin la variable          | 2026-08-17 | Sin `RESEND_API_KEY` se devuelve exito y el mensaje se pierde en un `console.warn`. Es integridad, no exposicion. Decidido en SPEC 03                                                                                                                           |
| H07 | G2    | `SQL 5`                               | `SQL 5`                           | serio    | abierto          | —                                                    | 2026-08-17 | Las tres filas de `supabase_admin` siguen concediendo `arwdDxtm` a los dos roles: un objeto creado desde el panel nace abierto. SPEC 18 cerro solo las de `postgres`                                                                                            |
| H08 | G1    | `SQL apoyo · event triggers`          | `ensure_rls`                      | menor    | abierto          | Que alguien lo adopte en una migracion sin decidirlo | 2026-08-17 | El disparador de `rls_auto_enable` es drift y **no lo nombra ninguna spec**: el repo escribe sobre la funcion y calla el trigger. Hoy solo anade seguridad                                                                                                      |
| H09 | G4    | `app/api/supabase-health/route.ts:31` | `/auth/v1/health`                 | menor    | abierto          | —                                                    | 2026-08-17 | Ruta publica sin autenticar: cada GET dispara un `fetch` saliente al proyecto, con 5 s de espera. No filtra claves; es amplificacion gratuita                                                                                                                   |
| H10 | G6    | `app/(vault)/acerca-de/actions.ts:26` | `const TO =`                      | menor    | abierto          | —                                                    | 2026-08-17 | Correo personal a fuego en un archivo versionado. `FROM` es el de pruebas de Resend y no cuenta                                                                                                                                                                 |
| H11 | G12   | `package.json:16`                     | `"next": "16.2.12"`               | menor    | abierto          | Que aparezca `next/image` o `images.remotePatterns`  | 2026-08-17 | Seis avisos `high`: next, postcss, nanoid, sharp, js-yaml y brace-expansion. **Corregido 2026-08-17**: `--omit=dev` da **cuatro** con ruta de produccion (next, postcss, nanoid, sharp) y solo dos de desarrollo. `npm audit fix --force` saca `next` de su pin |
| H12 | —     | `components/auth-panel.tsx:61`        | `database error`                  | menor    | fuera-de-alcance | —                                                    | 2026-08-17 | El `CHECK` de formato y el choque de `unique` dan el mismo error, asi que un nombre mal formado dice ESE NOMBRE YA ESTA COGIDO. Es un mensaje enganoso, no seguridad                                                                                            |

## Afirmaciones

Lo que no se puede medir desde aquí. **Cada fila es una promesa fechada, no una deducción.** Una
afirmación caducada deja su regla en `no-verificable`, no en `conforme`.

| afirmacion                                  | valor                                  | verificado | quien   | caduca     | notas                                                                                                   |
| ------------------------------------------- | -------------------------------------- | ---------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| Panel · `minimum_password_length`           | `8`                                    | 2026-08-17 | SPEC 18 | 2027-02-17 | Espejado en `supabase/config.toml` y en `lib/password.ts`. Sostiene G7                                  |
| Panel · `password_requirements`             | `lower_upper_letters_digits_symbols`   | 2026-08-17 | SPEC 18 | 2027-02-17 | El valor mas fuerte que ofrece el panel. Sostiene G7                                                    |
| Panel · `sign_in_sign_ups`                  | `10` por IP cada 5 min                 | 2026-08-17 | SPEC 18 | 2027-02-17 | A 10 y no a 5, para que una demo tras el mismo NAT no choque                                            |
| Panel · Redirect URLs                       | `/auth/confirmar` y `/auth/callback`   | 2026-08-17 | SPEC 16 | 2027-02-17 | Por cada origen desde el que se pruebe. Sostiene la segunda mitad de G9                                 |
| Panel · plantillas de correo                | con `{{ .TokenHash }}` y `.RedirectTo` | 2026-08-17 | SPEC 16 | 2027-02-17 | Sin esto el enlace del correo dice «caducado» aunque la cuenta se confirme                              |
| Advisor · `auth_leaked_password_protection` | WARN, **bloqueado por plan**           | 2026-08-17 | SPEC 18 | —          | Es de plan Pro y la organizacion esta en `free`. **No se propone arreglar**: se revisa si sube de plan  |
| Advisor · `auth_rls_initplan` x2            | WARN, rendimiento                      | 2026-08-17 | agente  | —          | `auth.uid()` por fila en las politicas de `scores` y `profiles`. No es de estas doce reglas             |
| Advisor · `unused_index`                    | INFO, `scores_user_id_idx`             | 2026-08-17 | agente  | —          | Sin usar porque hoy no hay ni una marca firmada con cuenta (SQL 7). Se justificara con la primera       |
| Repo · sin `next/image`                     | cero apariciones                       | 2026-08-17 | agente  | —          | Es lo que mantiene H11 en `menor`. Su `ascenso` vigila esto                                             |
| Despliegue                                  | no existe                              | 2026-08-17 | agente  | —          | No hay dominio propio: `config.toml` sigue con `site_url` local. HSTS y CSP no se pueden probar en vivo |

## Rondas

Nunca se sobrescribe una fila. Es lo único que deja ver una regresión.

| fecha      | alcance  | reglas | nuevos | criticos | advisor        | notas                                                                                                                            |
| ---------- | -------- | ------ | ------ | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-17 | completo | 12     | 12     | 1        | 1 sec · 3 perf | La siembra. Ocho reglas conformes o con hallazgos menores, tres con hallazgos serios, un critico                                 |
| 2026-08-17 | completo | 12     | 0      | 1        | 1 sec · 3 perf | Segunda ronda, contra la siembra. Cero altas, cero cierres: las doce `cadena` siguen en su sitio. Solo se corrige la nota de H11 |

## Notas

### 2026-08-17 · La siembra

Las doce filas de Reglas, las doce de Hallazgos y las diez de Afirmaciones se dieron de alta el día
que se creó el agente, a partir de la auditoría que justificó su existencia.

**Esta siembra sí se midió de verdad**, y en las dos mitades: los hallazgos del repo salen de
`Grep` y `Read` sobre los archivos, y los de la base de las siete consultas ejecutadas contra
`nlfwqnmidfdohuyhklqp`. Es la diferencia con la siembra de `pantallas.md`, que se calculó por
aritmética y por eso dejó todas las pantallas en `auditada`. Aquí las tres reglas que salen
`conforme` —G3, G10 y G11— lo salen con su medición hecha.

**El único `critico` es H01**, y conviene entender por qué lo es y por qué hoy no se nota. `anon`
puede pedir `user_id` de `public.scores` con la clave publicable que viaja en cada visita, porque
el `grant` es de tabla entera y la política es `using (true)`. Que SQL 7 devuelva **cero**
`user_id` distintos no es una defensa: es que todavía ninguna marca se ha firmado con cuenta. La
primera que se firme llena ese hueco sola. Y por la otra puerta ya está lleno: `public.profiles`
entrega **dos** UUID de cuenta a `anon` hoy mismo.

**H07 es el hallazgo que más sorprende, porque contradice una spec cerrada.**
`20260817020000_permisos_minimos.sql` puso `alter default privileges` para que el endurecimiento
fuera «una regla y no una foto», y lo consiguió a medias: `pg_default_acl` tiene dos filas por tipo
de objeto, una por rol creador, y la migración sólo pudo cerrar las suyas —las de `postgres`—. Las
de `supabase_admin` siguen abiertas, así que la regla vale para todo lo que cree una migración y no
para lo que se cree desde el panel. No es un error de aquella spec: es un caso que no se vio.

**Dos hallazgos están decididos pero mal guardados**, y ésa es exactamente la clase de cosa que
este ledger viene a arreglar. H03 tiene su motivo escrito en un comentario de `auth-panel.tsx` y
H05 en el alcance de SPEC 18. Un motivo en un comentario no sobrevive a un refactor y un motivo en
una spec cerrada no se busca. Los dos piden veredicto para pasar a `aceptado`, que es un estado que
el agente no puede poner.

**Lo que se miró y salió limpio**, para que ninguna ronda lo vuelva a mirar desde cero: sin
`dangerouslySetInnerHTML` ni `eval` en todo el repo; sin `select("*")` en ninguna de las diez
consultas; ninguna extensión instalada en `public`; ni un `.env` en la historia de git —sólo
`.env.example`—; el honeypot de contacto bien resuelto, que responde éxito a propósito;
`lib/catalog.ts` y `lib/leaderboard.ts` con `server-only` de verdad; y `lib/supabase/server.ts`
sin cliente en variable de módulo, que es lo que evitaría mezclar sesiones entre visitantes.

**H12 entra `fuera-de-alcance` a propósito y no se borra.** Es un mensaje engañoso —un nombre con
formato inválido dice «ESE NOMBRE YA ESTA COGIDO»—, es un fallo real, y **no es de seguridad**: no
expone nada ni deja hacer nada. Está aquí para que G8 no lo reclame en la próxima ronda creyendo
que es una filtración de enumeración.

**Y una nota sobre el contexto de las trece migraciones**: `list_migrations` y
`supabase/migrations/` coinciden en las trece, en `version` y en `name`. El único drift en la otra
dirección es el par `rls_auto_enable()` + `ensure_rls`, y de los dos el que nadie ha escrito nunca
es el disparador. Las migraciones no bastan para saber qué hay en la base, y ese par es la prueba.

### 2026-08-17 · Segunda ronda, completa

Ronda de los cinco ejes contra la siembra del mismo día, sobre la rama `spec-18-endurecer-seguridad`
con el árbol limpio salvo `CLAUDE.md` y este propio directorio. **Cero altas y cero cierres**: las
doce `cadena` se buscaron una a una y las doce siguen en su archivo, así que ninguna fila cambia de
estado y las doce reglas conservan el suyo. Las filas de Reglas no se reescriben porque su
`auditada` y su `revisado` ya son de hoy; lo que sí queda es la fila nueva de Rondas, que es lo que
deja ver que se volvió a medir y no sólo a leer.

**Se midió de verdad, en las dos mitades.** Las siete consultas se ejecutaron otra vez contra
`nlfwqnmidfdohuyhklqp` y devuelven lo mismo que la siembra: cinco objetos en `public` con las tres
tablas en RLS y cinco políticas, los **diez** pares rol/relación exactos y cero filas para `public`,
las dos `security definer` con `has_function_privilege` en `false` para los dos roles y su
`search_path` fijo, las dos vistas con `security_invoker=true`, y SQL 7 con los cuatro privilegios
peligrosos en `false`. Los dos advisors también repiten: un WARN de seguridad —el bloqueado por
plan, que **no se propone**— y los tres de rendimiento ya afirmados.

**Lo único que se movió fue la nota de H11, y se movió sin que nadie tocara el repo.**
`package-lock.json` no cambia desde el 3 de agosto y `package.json` sigue con `next` pineado, pero
`npm audit --omit=dev` da hoy **cuatro** paquetes con ruta de producción —`next`, `postcss`,
`nanoid` y `sharp`— donde la siembra anotó que cuatro de los seis eran sólo de desarrollo. Hoy los
de desarrollo son **dos**, `brace-expansion` y `js-yaml`. Es la deriva propia de G12: la base de
avisos del registro cambia sola, sin `npm install` de por medio, y por eso la regla se vuelve a
correr cada ronda en vez de fiarse de la fila. La gravedad de H11 **no** sube: sigue sin haber
`next/image` ni `images.remotePatterns` en el repo, que es su `ascenso`.

**Lo que sigue esperando veredicto humano son los mismos tres de la siembra**: H03 y H05, que
tienen su motivo escrito pero fuera del ledger, y H07, que es el que contradice a SPEC 18. Ninguno
puede pasar a `aceptado` desde aquí.
