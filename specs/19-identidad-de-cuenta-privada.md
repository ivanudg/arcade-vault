# SPEC 19 — La identidad de una cuenta deja de ser pública

> **Estado:** Aprobado
> **Depende de:** SPEC 06, SPEC 15, SPEC 16, SPEC 17, SPEC 18
> **Fecha:** 2026-08-17
> **Objetivo:** Que el UUID de `auth.users` deje de salir del servidor y que `public.profiles` deje de poder volcarse entero, sin que el salón pierda el resaltado de «esta marca es mía».

## Por qué existe esta spec

SPEC 18 cerró los permisos de `anon` y `authenticated` a lo que el código usa. Lo que no
miró es **qué usa el código**, y ahí hay dos columnas que no debería usar nadie.

**La primera puerta es `public.profiles`.** Su política de SELECT es `using (true)` para
`anon` y `authenticated`, y el `grant` de SPEC 18 alcanza a las tres columnas de la tabla.
Con la clave publicable —que viaja al navegador en cada visita, por diseño— un `GET
/rest/v1/profiles?select=*` devuelve el censo completo del vault: el **UUID de
`auth.users`**, el nombre de jugador y la fecha de alta de cada cuenta, incluidas las que
nunca han dejado una marca. Está verificado contra el proyecto remoto, no deducido del
archivo.

La migración que abrió esa política escribió su motivo, y hoy sólo se sostiene la mitad.
Decía dos cosas: que el panel comprueba si un nombre está libre antes de `signUp()`, y que
el marcador resuelve el nombre de una cuenta sin sesión iniciada. **Lo segundo dejó de ser
cierto**: `scores.player_name` está denormalizado desde SPEC 06 y ningún lector del marcador
consulta `profiles`. Los cinco consumidores que quedan son `lib/session.tsx:125` y
`app/jugar/[id]/actions.ts:96` —los dos por el `id` propio—, las dos comprobaciones de
nombre de `components/auth-panel.tsx` y el `insert` de `chooseName`. **Ninguno necesita leer
la fila de un tercero.**

**La segunda puerta es el marcador, y es la que el ledger tiene como único `critico`.**
`lib/leaderboard.ts` selecciona `user_id` en cuatro de sus cinco lecturas y lo baja al HTML
de cuatro pantallas públicas, porque el resaltado se resuelve en el navegador: `useMine()`
compara `row.userId` con el `id` de la sesión. Y como `top_scores` y `player_bests` también
nombran esa columna, `anon` puede pedirla directamente por PostgREST sin pasar por el sitio.

**Las dos son la misma fuga vista por dos ventanas, y cerrar una sola no cierra nada.** Con
`profiles` abierto, el `user_id` del marcador se traduce a un nombre; con el marcador
abierto, el UUID que `profiles` ya no da se recoge de la tabla del salón. Por eso van juntas
en una spec y no en dos.

Hay además una tercera cosa que sale sola al tirar del hilo: **`mine` lleva mintiendo desde
SPEC 06**. `toBoardRow()` lo pone siempre a `false` y el cliente lo ignora, así que hoy es
un campo que viaja en cada fila sin significar nada. Al mover el cálculo a la base de datos
pasa a ser el dato de verdad y el UUID deja de hacer falta para nada.

## Alcance

**Dentro:**

- Una migración que cierra `public.profiles`: la política de SELECT pasa a `id = auth.uid()`
  y `anon` pierde el `grant`.
- La función `public.username_libre(text) returns boolean`, `security definer`, que es lo
  único que queda de la comprobación de nombre disponible.
- Las dos llamadas de `components/auth-panel.tsx` que hoy hacen `select username` pasan a
  `rpc("username_libre")`.
- Una migración que quita `user_id` de `public.top_scores` y `public.player_bests`, añade la
  vista `public.public_scores`, y le da a las tres una columna `mine` calculada con
  `auth.uid()`.
- `anon` y `authenticated` pierden el SELECT sobre `public.scores`; conservan el INSERT,
  acotado a las cinco columnas que la Server Action escribe.
- `lib/scores.ts` pierde `userId` de sus tres interfaces y `mine` empieza a significar algo.
- `lib/leaderboard.ts` deja de seleccionar `user_id` y lee `mine` de las vistas.
- `useMine()` de `lib/session.tsx`: con sesión manda el `mine` de la fila; sin ella, el
  `deviceId` como hasta hoy.
- Regenerar `lib/supabase/database.types.ts` y actualizar `CLAUDE.md` y
  `references/Security/security-checklist.md`.

**Fuera de alcance (para specs futuras):**

- El oráculo de existencia de correo del registro (`auth-panel.tsx:189`, H03 del ledger). Es
  una decisión de producto sobre qué se le dice a quien se registra, y merece su veredicto,
  no un arreglo de paso.
- El `as EmailOtpType` sin lista cerrada de `app/auth/confirmar/route.ts:42` (H04) y el
  `NOTICES[error]` que alcanza el prototipo en `app/(vault)/cuenta/page.tsx:31`. Los dos son
  de una línea y ninguno es esta fuga.
- `device_id` sigue viajando al navegador. Es un UUID que genera el propio navegador y no
  identifica una cuenta; sin él no hay resaltado para quien juega sin sesión.
- La `Content-Security-Policy`, que SPEC 18 dejó escrita como spec propia.
- Cambiar el `username` una vez elegido. Sigue fuera de alcance desde SPEC 15.
- Límite de frecuencia sobre `saveScore()` (H05). Pide infraestructura que el repo no tiene.

## Modelo de datos

No hay tablas nuevas ni columnas nuevas. Lo que cambia es **qué se puede leer** y **qué
forma tiene lo que sale**.

Las tres vistas devuelven `mine` y ninguna devuelve `user_id`:

```sql
-- El patrón, igual en las tres. `(select auth.uid())` y no `auth.uid()` a secas:
-- así se evalúa una vez por consulta y no una vez por fila.
(s.user_id is not null and s.user_id = (select auth.uid())) as mine
```

`public.public_scores` es nueva y es la puerta de lectura de la tabla cruda, que hoy usa
`recentScores()`:

```sql
create view public.public_scores with (security_barrier = true) as
select s.game_id, s.player_name, s.score, s.device_id, s.created_at,
       (s.user_id is not null and s.user_id = (select auth.uid())) as mine
from public.scores s;
```

Los tipos de `lib/scores.ts` pierden un campo en las tres interfaces:

```ts
// Antes                        // Después
deviceId: string | null;
deviceId: string | null;
userId: string | null; // fuera
mine: boolean; // siempre false mine: boolean; // lo dice la base de datos
```

`Signed`, en `lib/session.tsx`, deja de necesitar el `userId`:

```ts
interface Signed {
  deviceId: string | null;
  mine: boolean;
}
```

## Plan de implementación

1. **Migración `perfiles_privados.sql`.** Crear `public.username_libre(candidato text)`,
   `language sql`, `security definer`, `stable` y `set search_path = ''`, que devuelve
   `not exists (select 1 from public.profiles where username = upper(candidato))`. Revocarle
   el EXECUTE a `public` y dárselo a `anon` y `authenticated` —el `alter default privileges`
   de SPEC 18 no cubre funciones nuevas, así que el `grant` va escrito—. Después,
   `drop policy "perfiles publicos"`, crear `"mi perfil"` para `authenticated` con
   `using ((select auth.uid()) = id)`, y `revoke select on public.profiles from anon`.
   Aplicar con `npx supabase db push`. Verificación manual: `select` sobre `/rest/v1/profiles`
   con la clave publicable y sin sesión devuelve `[]` o error de permiso, y la RPC contesta.

2. **`components/auth-panel.tsx`.** Sustituir los dos bloques `.from("profiles").select(...)`
   —el de `submit()` en `:159` y el de `chooseName()` en `:300`— por
   `supabase.rpc("username_libre", { candidato: username })`. La forma del error y los dos
   rótulos no cambian: `ESE NOMBRE YA ESTA COGIDO` cuando devuelve `false`, y `readable()`
   cuando la llamada falla. El `insert` de `:314` se queda como está. Prueba manual:
   registrar con un nombre cogido sigue diciendo lo mismo, y elegir nombre desde una cuenta
   de proveedor también.

3. **Migración `marcador_sin_user_id.sql`, primera mitad.** Crear `public.public_scores` con
   la definición de arriba. Recrear `public.top_scores` y `public.player_bests` con las
   mismas columnas que hoy salvo `user_id`, que se sustituye por `mine`; `top_scores`
   conserva su `rank` y su desempate por `created_at` ascendente, y `player_bests` su
   `distinct on (s.player_name)`. Las tres con `security_barrier = true` y **sin**
   `security_invoker` (ver Decisiones).

4. **Migración `marcador_sin_user_id.sql`, segunda mitad.** `revoke select on public.scores
from anon, authenticated`, `grant insert (game_id, player_name, score, device_id, user_id)
on public.scores to anon, authenticated`, y `grant select` sobre las tres vistas —un
   `drop view` se lleva por delante los `grant` de SPEC 18, así que hay que volver a
   escribirlos—. Aplicar con `npx supabase db push`. Verificación manual: `GET
/rest/v1/scores` con la clave publicable falla, `GET /rest/v1/top_scores?select=user_id`
   falla, y la partida sigue guardando su marca.

5. **`lib/scores.ts`.** Quitar `userId` de `BoardRow`, `RecentScore` y `PlayerRank`. El
   archivo es isomorfo y no gana imports.

6. **`lib/leaderboard.ts`.** Cambiar las cuatro listas de columnas: fuera `user_id`, dentro
   `mine`. `recentScores()` pasa a leer `public_scores` en vez de `scores`. `toBoardRow()`
   deja de escribir `mine: false` y copia el de la fila. Reescribir el comentario de la
   función, que hoy explica justo lo contrario de lo que hará.

7. **`lib/session.tsx`.** `Signed` cambia `userId` por `mine`, y `useMine()` pasa a
   `if (user) return row.mine`. La regla de la casa no se toca: con sesión manda la cuenta,
   sin ella el dispositivo, nunca las dos. Los tres consumidores —`hall-of-fame.tsx`,
   `activity-feed.tsx` y `score-panel.tsx`— no cambian ni una línea, porque los tres llaman
   a `useMine()` y ninguno lee `userId` por su cuenta.

8. **`npm run supabase:types`**, y después la puerta de verificación: `npx tsc --noEmit`,
   `npm run lint` y `npm run build`.

9. **Documentación.** En `CLAUDE.md`, los tres apartados que quedan desactualizados: «El
   marcador» (las dos vistas, que ya no llevan `user_id` ni `security_invoker`), «Sesión y
   cuentas» (`useMine()` y el perfil que ya no es público) y «Supabase» (la regla de que una
   tabla nueva escribe su `grant` al lado de su `create policy`, que ahora vale también para
   las funciones). Marcar en `references/Security/security-checklist.md` lo que esta spec
   cierra. El ledger de `.claude/security-auditor/hallazgos.md` **no se toca**: es del
   agente, y lo reconcilia en su próxima ronda.

## Criterios de aceptación

- [x] `GET /rest/v1/profiles?select=*` con la clave publicable y sin sesión no devuelve
      ninguna fila ajena.
- [x] Con sesión iniciada, esa misma petición devuelve exactamente una fila: la propia.
- [x] `GET /rest/v1/scores?select=user_id` con la clave publicable responde error de permiso.
- [x] `GET /rest/v1/top_scores?select=user_id` y `player_bests?select=user_id` responden
      error de permiso.
- [x] La cadena `user_id` no aparece en el HTML servido por `/`, `/salon`, `/biblioteca` ni
      `/juego/[id]`.
- [x] Registrarse con un nombre ya cogido sigue diciendo `ESE NOMBRE YA ESTA COGIDO` antes de
      llamar a `signUp()`.
- [x] Una cuenta de Google o GitHub puede elegir su nombre en `/cuenta` y la cabecera deja de
      decir `ELIGE NOMBRE` sin recargar.
- [x] Con sesión, las marcas propias siguen resaltadas en el salón, en la ficha y en la
      actividad de la portada.
- [x] Sin sesión, las marcas de este navegador siguen resaltadas en las tres.
- [ ] Terminar una partida con sesión guarda la marca firmada con el `username` del perfil.
- [x] Terminar una partida sin sesión guarda la marca con el nombre escrito y sin dueño.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin avisos nuevos.

### Cómo se verificaron (2026-08-17)

Ocho de los doce están firmados contra el proyecto remoto y contra `npm start` en local.
Los cuatro primeros se probaron con `curl` y la clave publicable de `.env.local`:
`profiles` y `scores` responden `401 42501 permission denied`, y las dos vistas responden
`400 42703 column ... does not exist` —no es el error de permiso que decía el criterio, sino
uno más fuerte: la columna ya no está en la vista—. El de la sesión iniciada se comprobó en
la base con `begin` / `set local role authenticated` con el `sub` de una cuenta real /
`rollback`: de los dos perfiles de la tabla, la sesión ve **uno**. El del HTML es
`grep user_id` sobre las cuatro rutas servidas por el build de producción: cero coincidencias
en las cuatro, con el salón y la portada trayendo filas de verdad. El del nombre cogido se
probó en `/cuenta`: el panel pintó `ESE NOMBRE YA ESTA COGIDO` y `auth.users` no ganó ninguna
fila, así que la RPC cortó antes de `signUp()`. Los dos de invitado se firmaron terminando
una partida de Snake sin sesión: la marca entró como `INVITADO` con `user_id` nulo y
`device_id` puesto, y quedó resaltada en el salón, en la ficha y en la actividad de la
portada —y sólo ella, que es lo que prueba que el `deviceId` sigue mandando sin sesión—.

**Los tres que quedan piden un humano con cuenta**, y no son de código: los dos del resaltado
y la firma con sesión necesitan una marca guardada desde una cuenta —hoy las seis de
`public.scores` tienen `user_id` nulo—, y el de elegir nombre necesita entrar con Google o
GitHub. Los tres son de recorrido manual y ninguno tiene sustituto automático.

## Decisiones tomadas y descartadas

- **Sí:** una RPC `security definer` para la disponibilidad del nombre. Sigue siendo un
  oráculo de disponibilidad —inevitable si el formulario ha de poder decir «cogido»— pero
  responde un booleano por candidato en vez de entregar el listado, el UUID y la fecha de
  alta.
- **No:** quitar la comprobación previa y fiarlo todo al `unique`. Cierra más superficie, pero
  en el registro el choque llega desde el trigger como `database error` y el mensaje empeora
  para todo el mundo por un ataque que la RPC ya encarece.
- **No:** acotar el `grant select` de `profiles` a la columna `username`. Cierra el UUID y la
  fecha, pero deja el listado de nombres volcable y rompería el `.eq("id", …)` de
  `lib/session.tsx`, que necesita SELECT sobre la columna por la que filtra.
- **Sí:** calcular `mine` en la base de datos con `auth.uid()`. Es lo que permite que el UUID
  no salga sin gastar ni una llamada de red nueva: la alternativa era resolver el visor en
  Next con un `getUser()` por consulta.
- **Sí:** `(select auth.uid())` envuelto, y no `auth.uid()` suelto. Se evalúa una vez por
  consulta en vez de una por fila, y de paso atiende el `auth_rls_initplan` que el advisor de
  Supabase ya venía avisando.
- **Sí:** las tres vistas pasan a `security_barrier = true` y dejan `security_invoker`. Es un
  cambio consciente sobre lo que SPEC 06 escribió: con el invocador ya sin SELECT sobre
  `public.scores`, una vista `security_invoker` no podría leer la tabla y las tres dejarían de
  funcionar. **Hoy no se pierde ninguna restricción**: la política de SELECT de `scores` es
  `using (true)` para los dos roles, verificado en el proyecto remoto. Lo que se pierde es la
  herencia automática si algún día esa política se acota, y por eso queda escrito aquí y en
  `CLAUDE.md`: **acotar la lectura de `scores` obliga a repetir el filtro en las tres
  vistas**.
- **No:** un cliente de servidor con `supabaseSecretKey()` que lea `user_id` y calcule `mine`
  en Next. Estrenaría esa clave para esto y saltaría la RLS entera para resolver un
  resaltado.
- **No:** dejar de mandar `device_id`. Es del navegador y no de la cuenta, y sin él quien
  juega sin sesión pierde el resaltado que tiene desde SPEC 06.
- **Sí:** `mine` como nombre del campo, reutilizando el que ya existe en las tres interfaces.
  Hoy es un `false` fijo que nadie lee; a partir de aquí dice la verdad y no hay ningún
  consumidor que actualizar.
- **Definición rápida:** las tres decisiones de partida —alcance, forma de la comprobación de
  nombre y estado del archivo— se cerraron en un único bloque de preguntas, no en las cuatro
  fases largas de `/spec`.

## Riesgos

| Riesgo                                                                                                                        | Mitigación                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El `with check` de `"firmar una marca"` nombra `seeded` y `user_id`, y el INSERT pasa a estar acotado por columnas            | Es lo primero que se prueba en el paso 4: terminar una partida con sesión y sin ella. Si Postgres exigiera privilegio sobre `seeded`, se añade a la lista del `grant insert`               |
| Un `.insert()` que algún día encadene `.select()` necesitaría SELECT sobre `scores`, que esta spec revoca                     | `app/jugar/[id]/actions.ts:123` no lo encadena y no debe empezar a hacerlo. Queda escrito en `CLAUDE.md` junto a la regla del `grant`                                                      |
| `drop view` se lleva los `grant` de SPEC 18 y las vistas quedarían ilegibles en producción                                    | Los tres `grant select` van en la misma migración, inmediatamente después del `create view`. El criterio de aceptación del resaltado los cubre                                             |
| Una cuenta con sesión abierta durante el despliegue consulta una vista recreada a mitad                                       | Las dos migraciones son transaccionales por archivo; en el peor caso una lectura devuelve `null` y la pantalla pinta `MARCADOR NO DISPONIBLE`, que es un estado ya soportado desde SPEC 07 |
| `database.types.ts` sin regenerar deja `mine` sin tipo y `tsc` señala `lib/leaderboard.ts` en un sitio que no es el del fallo | El paso 8 va antes de la puerta de verificación, y es lo primero que se mira si `tsc` protesta por las vistas                                                                              |

## Lo que **no** entra en esta spec

- El oráculo de correo del registro (H03) y su veredicto.
- El `as EmailOtpType` de `/auth/confirmar` (H04) y el `NOTICES[error]` de `/cuenta`.
- La `Content-Security-Policy`.
- El límite de frecuencia de `saveScore()` (H05).
- Cambiar el nombre de jugador una vez elegido.
- Las tres filas de `supabase_admin` en `pg_default_acl` (H07), que son de SPEC 18 y siguen
  abiertas.

Cada una, si entra, entra en su propia spec.
