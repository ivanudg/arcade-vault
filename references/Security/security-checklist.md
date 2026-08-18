## Checklist de seguridad básico

Estado tras **SPEC 19** (2026-08-17). Este archivo no es material de referencia de sólo
lectura como el resto de `references/`: es el registro de qué medidas están puestas, y se
mantiene al día.

- [x] **RLS habilitado en las tablas.** Ya lo estaba antes de esta spec: en `games` y
      `scores` desde SPEC 06, y en `profiles` desde SPEC 15. **Esta casilla engañaba**,
      porque lo que estaba abierto era la capa de debajo: ninguna de las doce migraciones
      anteriores tenía un `grant` ni un `revoke`, así que `anon` y `authenticated`
      conservaban los siete privilegios de fábrica sobre las tres tablas y las dos vistas.
      Que no se notara era mérito de la RLS y no del permiso.
- [x] **Permisos mínimos**, que es lo que de verdad faltaba.
      `20260817020000_permisos_minimos.sql` revoca todo y devuelve sólo lo que el código
      usa. Lo que cierra en concreto: **`anon` podía hacer `TRUNCATE` de `public.scores`**
      con la clave publicable que viaja al navegador, y `truncate` no lo mira la RLS —no es
      un `delete` que una política pueda filtrar, es una operación sobre la tabla—. **SPEC 19
      recortó esa lista**, porque devolvía permisos que el código no necesitaba; la de hoy
      está tres casillas más abajo.
- [x] **`public.profiles` ya no se puede volcar (SPEC 19).**
      `20260817030000_perfiles_privados.sql` sustituye la política `"perfiles publicos"`
      —`using (true)` para los dos roles— por `"mi perfil"`, `using ((select auth.uid()) =
id)` y sólo de `authenticated`, y le revoca el SELECT a `anon`. Lo que cerró, verificado
      contra el proyecto remoto y no deducido del archivo: con la clave publicable, un
      `GET /rest/v1/profiles?select=*` devolvía el censo del vault —el **UUID de
      `auth.users`**, el nombre y la fecha de alta de cada cuenta, incluidas las que nunca
      han dejado una marca—.
- [x] **El marcador dejó de repartir el UUID (SPEC 19).**
      `20260817040000_marcador_sin_user_id.sql` quita `user_id` de `top_scores` y
      `player_bests`, añade `public_scores` y le da a las tres una columna `mine` calculada
      con `(select auth.uid())`. `anon` y `authenticated` pierden el SELECT sobre
      `public.scores` y conservan el INSERT **acotado por columnas** a las cinco que escribe
      la Server Action. La cadena `user_id` ya no aparece en el HTML de `/`, `/salon`,
      `/biblioteca` ni `/juego/[id]`.
- [x] **La lista de permisos de hoy**, tras las dos migraciones de SPEC 19: `games` SELECT;
      `scores` **sólo INSERT** sobre `game_id, player_name, score, device_id, user_id`;
      `profiles` SELECT + INSERT de `authenticated` y nada de `anon`; SELECT en las **tres**
      vistas; y EXECUTE de `username_libre()` para los dos roles.
- [x] **Los cuatro WARN de `SECURITY DEFINER` ejecutable**, cerrados por la misma
      migración: `handle_new_user()` y `rls_auto_enable()` ya no son llamables desde
      `/rest/v1/rpc/`. El `revoke` nombra también a `public`, porque el `=X` del ACL es de
      donde heredaban los dos roles nominales.
- [x] **El endurecimiento es una regla y no una foto.** `alter default privileges` para el
      rol `postgres` en el esquema `public`, así que una tabla nueva **nace sin ningún
      permiso**. Consecuencia asumida: PostgREST responde `permission denied for table X`
      en vez de una lista vacía, y toda spec futura con tabla escribe su `grant select` al
      lado de su `create policy`. Está también en CLAUDE.md. **SPEC 19 extendió la regla a
      las funciones y a las vistas**: `username_libre()` nace sin EXECUTE y lleva su `grant`
      escrito al lado, y un `drop view` se lleva los `grant` de la vista, así que recrear una
      obliga a volver a escribirlos en la misma migración.
- [x] **Minimum password length — 8 caracteres**, y con las cuatro clases de carácter
      (`password_requirements = lower_upper_letters_digits_symbols`). Puesto en el panel y
      espejado en `supabase/config.toml`. La misma regla se valida en Next con
      `lib/password.ts`, para que un alta no falle por sorpresa; la garantía real es el
      servidor.
- [x] **Max signup rate.** `[auth.rate_limit] sign_in_sign_ups` de 30 a **10** por IP cada
      cinco minutos. A 10 y no a 5: corta el alta masiva sin que una demostración con
      varias personas detrás del mismo NAT se choque contra el límite.
- [x] **Headers de seguridad en Next.js.** Las cinco de abajo en `next.config.ts`, sobre
      `/:path*`, más `poweredByHeader: false`. Van en la configuración y no en `proxy.ts`
      porque `headers()` se resuelve **antes del sistema de ficheros**, así que cubre las
      páginas y lo de `public/`; el `matcher` del proxy excluye justamente eso.
- [ ] **Leaked password protection — BLOQUEADO POR PLAN (2026-08-17).** No se puede
      activar: es de plan Pro en adelante y la organización está en `free`. **El advisor va
      a seguir sacando ese WARN, y es a propósito**: no se «arregla», se revisa el día que
      la organización suba de plan. Tampoco se sustituye por una comprobación propia contra
      HaveIBeenPwned desde el cliente —viable con k-anonymity, pero mete una dependencia
      externa en el camino del registro y un `connect-src` que la spec de CSP heredaría—.
      Si algún día se quiere, es su decisión y no un sucedáneo.

### Las cinco cabeceras que hay puestas

| Cabecera                    | Valor                                      | Dónde      |
| --------------------------- | ------------------------------------------ | ---------- |
| `X-Content-Type-Options`    | `nosniff`                                  | siempre    |
| `X-Frame-Options`           | `DENY`                                     | siempre    |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`          | siempre    |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()` | siempre    |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains`      | producción |

HSTS sólo en producción, y el interruptor es `process.env.NODE_ENV` y **no** los argumentos
del proceso: en Next 16 el archivo de configuración ya no lo carga el comando `next dev`, así
que buscar `dev` ahí devuelve `false` en desarrollo y colaría la cabecera sin que nada avise.
Sin `preload`, que es un compromiso separado y hoy no hay dominio propio.

### Lo que queda pendiente, cada uno con su propia spec

- **`Content-Security-Policy`.** Necesita un `nonce` por petición para los scripts en línea
  de Next y un `connect-src` que admita el proyecto de Supabase. Es también lo que
  sustituirá a `X-Frame-Options`, con `frame-ancestors 'none'`.
- **Rate limiting de la Server Action** que firma la marca. Hoy acepta cualquier POST tantas
  veces como se llame; su cabecera ya dice que el marcador es falsificable y se acepta.
- **SMTP propio**, para subir la cuota de dos correos por hora del plan gratuito.
- **MFA, captcha y `secure_password_change`.** Tres decisiones distintas, cada una con su
  interfaz.
- **Políticas de `update` y `delete`.** Sigue sin haberlas, y desde SPEC 18 tampoco hay
  permiso: son dos capas y las dos dicen no.
- **`force row level security`.** Descartado con motivo y no aplazado: hoy es un no-op
  —sólo cambia el comportamiento del propietario, que es `postgres`, y `postgres` tiene
  `rolbypassrls`— y mañana sería un cepo, porque sin políticas de `update` rompería a la vez
  la edición del catálogo desde el panel y cualquier `db reset`.

### El informe del advisor, antes y después

Antes de SPEC 18 el `get_advisors type=security` devolvía **cinco** WARN: los cuatro de
`SECURITY DEFINER` ejecutable —`handle_new_user()` y `rls_auto_enable()`, cada una para
`anon` y para `authenticated`— y el de contraseñas filtradas. Tras SPEC 18 quedó **uno**, el
de contraseñas filtradas.

**Tras SPEC 19 son seis, y cinco son el precio anotado de sus decisiones.** El informe sube
de ruido y baja de superficie expuesta, que no es lo mismo: la lista de abajo hay que leerla
sabiendo qué se cambió por qué, y **ninguna de las cinco se «arregla»** sin deshacer la spec.

| name                                                | level | qué es y por qué está                                                                                                                                                                          |
| --------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security_definer_view` × 3 (las tres vistas)       | ERROR | Decidido en SPEC 19: con el invocador ya sin SELECT sobre `public.scores`, una vista `security_invoker` no podría leer su tabla base y las tres dejarían de funcionar. Ver la nota de abajo. |
| `anon_security_definer_function_executable`         | WARN  | Es `username_libre()`, y que `anon` la pueda llamar **es su motivo de existir**: la comprobación de nombre libre ocurre en el registro, sin sesión.                                             |
| `authenticated_security_definer_function_executable` | WARN  | La misma función desde una cuenta de proveedor que elige nombre en `/cuenta`.                                                                                                                  |
| `auth_leaked_password_protection`                   | WARN  | El bloqueado por plan de SPEC 18, sin cambios.                                                                                                                                                 |

Sobre los tres ERROR, que es lo que más llama la atención: **hoy no se pierde ninguna
restricción**, porque la política de SELECT de `scores` es `using (true)` para los dos roles.
Lo que se pierde es la herencia automática, y por eso queda escrito aquí y en CLAUDE.md:
**acotar la lectura de `scores` obliga a repetir el filtro en las tres vistas**. Las tres
llevan `security_barrier = true`, ninguna devuelve `user_id`, y lo que sale por ellas es
menos de lo que salía antes.

Sobre los dos WARN de la función: la alternativa es no tener comprobación previa y fiarlo
todo al `unique`, que SPEC 19 descartó con motivo —el choque llegaría desde el trigger como
`database error` y el mensaje empeoraría para todo el mundo—. Sigue siendo un oráculo de
disponibilidad, inevitable si el formulario ha de poder decir «cogido»; lo que ya no hace es
entregar el listado, el UUID y la fecha de alta.

Remediación oficial del de contraseñas filtradas, para cuando se pueda:
<https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>
