# SPEC 18 — Endurecer la seguridad: cabeceras, permisos mínimos y contraseñas de verdad

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06, SPEC 15, SPEC 16, SPEC 17
> **Fecha:** 2026-08-17
> **Objetivo:** Cerrar las cinco medidas de `references/Security/security-checklist.md` que se puedan cerrar hoy —cabeceras de seguridad en Next, permisos mínimos en Supabase y una política de contraseña de verdad, validada en los dos lados—, dejando escrito y fechado lo que el plan gratuito no permite.

## Por qué existe esta spec

El archivo `references/Security/security-checklist.md` es una lista de cinco casillas sin
marcar y el informe del advisor de Supabase. Auditar el repo y la base remota antes de
escribir nada cambió tres de esas casillas, y ése es el motivo por el que la spec no es una
transcripción del checklist.

**La primera casilla ya estaba hecha, y por eso engaña.** «RLS habilitado en ambas tablas»
lleva cierto desde SPEC 06, y desde SPEC 15 también en la tercera, `public.profiles`. Lo que
está abierto es la capa de debajo. Las doce migraciones del repo no tienen **ni un `grant` ni
un `revoke`**, así que `anon` y `authenticated` conservan los permisos de fábrica de Supabase
sobre las tres tablas y las dos vistas: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`,
`REFERENCES` y `TRIGGER`.

Que hoy no se note es mérito de la RLS y no del permiso, y son dos capas distintas de las que
sólo una está puesta. Con una consecuencia que no es teórica: **`truncate` no lo mira la RLS en
absoluto**. No es un `delete` de filas que una política pueda filtrar, es una operación sobre
la tabla, y el permiso que `anon` tiene hoy basta para vaciar el marcador entero con la clave
publicable que viaja al navegador en cada visita. La ausencia de políticas de `update` y
`delete` protege de lo primero; de esto no protege nada.

**La tercera casilla no se puede hacer.** La protección contra contraseñas filtradas es de
plan Pro en adelante y la organización está en `free`. No se disimula: se queda escrita como
línea de bloqueo fechada, porque el advisor va a seguir sacando ese WARN y sin el motivo
apuntado alguien lo va a volver a «arreglar» dos veces.

**Y el endurecimiento de permisos sería una foto y no una regla.** `pg_default_acl` del
esquema `public` concede `arwdDxtm` a `anon` y `authenticated` en toda tabla nueva que cree
`postgres` —o sea, en toda migración futura—, y EXECUTE a `public` en toda función nueva. Sin
tocar eso, la próxima máquina que traiga tabla desanda esta spec en silencio.

Hay además una cuarta cosa que no está en el checklist y que sale sola al subir la exigencia de
las contraseñas: **el código actual bloquearía el acceso a las cuentas que ya existen**. La
comprobación de longitud de `AuthPanel` corre también en el login, así que una cuenta creada
con seis caracteres —que Supabase sigue aceptando— dejaría de poder entrar por culpa de nuestro
propio `if`, antes de preguntar. Y el traductor de errores mentiría sobre por qué. Las dos
cosas se arreglan aquí porque son consecuencia directa del cambio, no mejoras aprovechando el
viaje.

## Alcance

**Dentro:**

- `lib/password.ts`, módulo nuevo e isomorfo: fuente única de `MIN_PASSWORD`, de las cuatro
  clases de carácter y de los rótulos, con `passwordProblem()`.
- Subir la política de contraseña en el panel de Supabase a mínimo **8** y
  `lower_upper_letters_digits_symbols`, y **validar la misma regla en Next** para que un alta
  no falle por sorpresa.
- Bajar `[auth.rate_limit] sign_in_sign_ups` de 30 a **10** por IP cada cinco minutos.
- Espejar esos tres valores en `supabase/config.toml`, **sin** correr `supabase config push`.
- Los tres arreglos de corrección que arrastra lo anterior: la comprobación deja de correr en
  el login, `readable()` gana la rama de composición, y `new-password-form.tsx` discrimina por
  `error.code`.
- Un párrafo de ayuda bajo el campo de contraseña, con `aria-describedby`, en las dos
  pantallas que piden una contraseña nueva.
- `next.config.ts` gana `headers()` con cinco cabeceras de seguridad sobre `/:path*`, y
  `poweredByHeader: false`.
- Una migración que revoca todo de `anon` y `authenticated` y devuelve sólo lo que usa el
  código, revoca `execute` sobre las dos funciones `security definer`, y cambia los
  privilegios por defecto del esquema para que eso sea una regla y no una foto.
- Protexión de rutas con Proxy de Next.js, información sobre proxy aquí: https://nextjs.org/docs/app/getting-started/proxy

Ejemplo: proxy.ts

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/home", request.url));
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: "/about/:path*",
};
```

- `CLAUDE.md` y `references/Security/security-checklist.md` al día.

**Fuera de alcance (para specs futuras):**

- **`Content-Security-Policy`.** Es su propia spec: necesita un `nonce` por petición para los
  scripts en línea de Next, y su `connect-src` tiene que admitir el proyecto de Supabase. Es
  además lo que sustituirá a `X-Frame-Options`, con `frame-ancestors 'none'`.
- **Protección contra contraseñas filtradas.** Bloqueada por plan; ver «Riesgos».
- **Usar el `data.weakPassword` del login** para invitar a cambiar la contraseña desde
  `/cuenta`. Es un estado de interfaz nuevo.
- **Tocar `service_role`.** Sus permisos no salen a internet y su clave todavía no tiene
  consumidor.
- **Adoptar `rls_auto_enable()` en el historial de migraciones.** Se le cierra el RPC y nada
  más; ver «Decisiones».
- **`force row level security`.** Descartado con motivo, no aplazado.
- **Tocar `proxy.ts`.** Sigue haciendo sólo el refresco de sesión.
- **Políticas de `update` y `delete`.** Sigue sin haberlas, y desde esta spec tampoco hay
  permiso.
- **SMTP propio** para subir la cuota de dos correos por hora.
- **Rate limiting de la Server Action** que firma la marca. Hoy acepta cualquier POST tantas
  veces como se llame; limitarlo pide infraestructura que el repo no tiene.
- **MFA, captcha y `secure_password_change`.** Tres decisiones distintas, cada una con su
  interfaz.

## Modelo de datos

Esta spec **no crea ni cambia ninguna tabla, columna, vista, política ni tipo de TypeScript**.
Lo que cambia es quién puede hacer qué con lo que ya existe, más un módulo de reglas en el
cliente. Por eso lo que sigue son las tres tablas de permisos y la forma del módulo nuevo, y
no un esquema.

### Los permisos de `anon` y `authenticated`, antes y después

| Relación       | Hoy                                                       | Después                                     |
| -------------- | --------------------------------------------------------- | ------------------------------------------- |
| `games`        | `SELECT INSERT UPDATE DELETE TRUNCATE REFERENCES TRIGGER` | `SELECT`                                    |
| `scores`       | idem                                                      | `SELECT INSERT`                             |
| `profiles`     | idem                                                      | `SELECT`, más `INSERT` sólo `authenticated` |
| `top_scores`   | idem                                                      | `SELECT`                                    |
| `player_bests` | idem                                                      | `SELECT`                                    |

La columna «Después» es la lista de lo que el código hace de verdad, y sale de leerlo:

| Permiso               | Quién lo usa                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `games` select        | `lib/catalog.ts`: `catalog()` y `game()`                                                                                                      |
| `scores` select       | `lib/leaderboard.ts`: `recentScores()`, y las dos vistas por ser `security_invoker`                                                           |
| `scores` insert       | `app/jugar/[id]/actions.ts`: la Server Action que firma la marca, con cuenta y sin ella                                                       |
| `profiles` select     | `components/auth-panel.tsx` (el nombre libre, **sin sesión**: de ahí que lo necesite `anon`), `lib/session.tsx` y `app/jugar/[id]/actions.ts` |
| `profiles` insert     | `components/auth-panel.tsx`: elegir nombre con una cuenta de proveedor                                                                        |
| `top_scores` select   | `lib/leaderboard.ts`: `board()`, `boards()`, `bests()`                                                                                        |
| `player_bests` select | `lib/leaderboard.ts`: `topPlayers()`                                                                                                          |

Dos detalles que la tabla no dice y hay que tener en cuenta al escribirla. Las dos vistas son
`security_invoker = true` desde SPEC 06, así que su `select` se comprueba contra quien
pregunta y **necesita además** el `select` sobre `public.scores`, que es su única tabla base:
el permiso de `scores` no es sólo para `recentScores()`. Y no hay `usage` de secuencia que
devolver, porque `scores.id` es `uuid` con `gen_random_uuid()` y en `public` no hay ni una
secuencia.

`service_role` no se toca.

### Las dos funciones `security definer`

| Función                    | EXECUTE hoy                                                    | EXECUTE después              |
| -------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `public.handle_new_user()` | `public`, `anon`, `authenticated`, `service_role`, propietaria | `service_role` y propietaria |
| `public.rls_auto_enable()` | idem                                                           | idem                         |

El ACL real de las dos es
`{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`.
Ese `=X` sin rol delante es `public`, y es de donde los dos nominales heredan: **revocar sólo
a `anon` y `authenticated` las dejaría expuestas igual**. Por eso el `revoke` nombra a los
tres.

### `lib/password.ts`

```ts
/** El mínimo que exige Supabase Auth, espejado en supabase/config.toml. */
export const MIN_PASSWORD = 8;

/** Los 32 símbolos que Supabase cuenta como símbolo. El `\` es uno de ellos. */
export const PASSWORD_SYMBOLS: string;

/** Lo que se pinta bajo el campo, en Courier Prime y con acentos. */
export const PASSWORD_HINT: string;

/** El rótulo de «Supabase la rechazó por composición». Lo usan las dos pantallas. */
export const WEAK_PASSWORD: string;

/** Qué le falta a una contraseña, o `null` si no le falta nada. */
export function passwordProblem(password: string): string | null;
```

Va en `lib/` y no en `lib/supabase/`, donde sólo viven las piezas que hablan con
`@supabase/ssr` o con `process.env`. **Isomorfo y sin `"use client"`**: es TypeScript puro, sin
React, sin DOM y sin imports. El precedente es `lib/storage.ts`, que sólo funciona en el
navegador y tampoco lleva directiva; la lleva `lib/session.tsx` porque es React. Dejarlo
isomorfo importa por un caso previsible: el día que haya que revalidar la contraseña en una
Server Action —como ya hace `app/(vault)/acerca-de/actions.ts` con `LIMITS` de
`lib/about.ts`—, el módulo se importa tal cual.

`passwordProblem()` devuelve **un** rótulo y no una lista, porque el hueco de error de las dos
pantallas es un solo `<p role="alert">` de Press Start 2P a 9px, y la convención del repo es un
rótulo por fallo. El orden de las comprobaciones es el de Supabase —primero la longitud,
después la composición—, así que lo que se dice aquí es lo primero que diría el servidor.

Las cuatro clases se comprueban con `some(...includes())` sobre `PASSWORD_SYMBOLS` y **no** con
una clase de caracteres de expresión regular: esa cadena lleva `\`, `]`, `^` y `-` dentro, y un
escape mal puesto cambia la regla sin que nada falle.

### Los rótulos

Todos en mayúsculas y ASCII puro, que es lo que exige Press Start 2P. El primero reutiliza el
literal que ya existe interpolando `MIN_PASSWORD`, así que sólo cambia el número.

| Regla que falla     | Rótulo                                        |
| ------------------- | --------------------------------------------- |
| `length < 8`        | `LA CONTRASENA NECESITA 8 CARACTERES`         |
| sin `[a-z]`         | `LE FALTA UNA MINUSCULA`                      |
| sin `[A-Z]`         | `LE FALTA UNA MAYUSCULA`                      |
| sin `[0-9]`         | `LE FALTA UNA CIFRA`                          |
| sin símbolo         | `LE FALTA UN SIMBOLO: !@#$%&*`                |
| Supabase la rechaza | `ANADE MAYUSCULA, MINUSCULA, CIFRA Y SIMBOLO` |

`PASSWORD_HINT` es lo contrario: va en Courier Prime, que es lo que se hereda si no se declara
`font-display`, así que **lleva sus tildes**: «Mínimo 8 caracteres, con una minúscula, una
mayúscula, una cifra y un símbolo.»

### Las cinco cabeceras

| Cabecera                    | Valor                                      | Dónde      |
| --------------------------- | ------------------------------------------ | ---------- |
| `X-Content-Type-Options`    | `nosniff`                                  | siempre    |
| `X-Frame-Options`           | `DENY`                                     | siempre    |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`          | siempre    |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()` | siempre    |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains`      | producción |

### Los tres ajustes del panel

| Ajuste                    | Hoy  | Después                              |
| ------------------------- | ---- | ------------------------------------ |
| `minimum_password_length` | `6`  | `8`                                  |
| `password_requirements`   | `""` | `lower_upper_letters_digits_symbols` |
| `sign_in_sign_ups`        | `30` | `10`                                 |

## Plan de implementación

Cada paso deja el repo con `npx tsc --noEmit`, `npm run lint` y `npm run build` en verde, y es
commiteable por separado.

**El orden entre el cliente y el panel no es arbitrario.** Si se sube el mínimo en el panel
primero, todo registro entre ese momento y el paso 2 falla con el mensaje que miente, que es
justo el defecto que esta spec arregla. Si se sube en el cliente primero, el cliente es más
estricto que el servidor durante un rato, y eso no rompe nada: rechaza contraseñas que Supabase
habría aceptado. **Cliente primero.**

1. **`lib/password.ts`.** El módulo entero. Todavía no lo importa nadie, así que el paso no
   puede romper una pantalla.
2. **`components/auth-panel.tsx`.** Importa el módulo y borra su `const MIN_PASSWORD = 6`.
   Mueve la comprobación de contraseña **dentro** del `if (isRegister)`, junto a la del nombre,
   para que «esto no corre al entrar» sea estructural y no un detalle de una condición. Añade
   la rama de composición a `readable()`, antes de la genérica. Añade el párrafo de ayuda con
   su `aria-describedby`, sólo con `isRegister`.
3. **`components/new-password-form.tsx`.** Importa el módulo y borra su `const MIN_PASSWORD =
6`. Sustituye la comprobación de longitud por `passwordProblem()`. Cambia el bloque de error
   para discriminar por `error.code` —`same_password` y `weak_password`— en vez de por la
   palabra `different`. Añade el párrafo de ayuda, aquí sin condición.
4. **`next.config.ts`.** Las cinco cabeceras sobre `/:path*` y `poweredByHeader: false`. El
   interruptor de HSTS es `process.env.NODE_ENV`. Ojo: el archivo no se recarga en caliente,
   hay que reiniciar el servidor.
5. **La migración** y `npx supabase db push`. Los cuatro bloques de una vez: los `revoke`/`grant`
   por relación, los dos `revoke execute`, los `alter default privileges` y el comentario de lo
   que se decidió no hacer. Después, `get_advisors` para ver caer los cuatro WARN.
6. **Los tres ajustes**, a mano en el panel de Supabase, y espejados en `supabase/config.toml`.
   **Sin `supabase config push`.**
7. Protección de rutas con Next.js
8. **La documentación**: `CLAUDE.md` y `references/Security/security-checklist.md`.

**Reversibilidad, que aquí no es simétrica.** Los pasos 1 a 4 y el 7 se deshacen con `git
revert`. El **5 no**: revertir el archivo de migración no devuelve los permisos, hace falta una
contramigración con los `grant` de vuelta. El **6 tampoco**, que se deshace a mano en el panel.
Van al final por eso.

## Criterios de aceptación

### El módulo y el cliente

- [x] `lib/password.ts` existe, no contiene `"use client"` y no importa nada.
- [x] `grep -rn "MIN_PASSWORD = " components/ lib/` devuelve **una** línea, y es la de
      `lib/password.ts`, con el valor `8`.
- [x] `PASSWORD_SYMBOLS` tiene **32** caracteres e incluye la barra invertida.
- [x] En `components/auth-panel.tsx`, la llamada a `passwordProblem()` está **dentro** del
      bloque `if (isRegister)`.
- [x] En `readable()`, la línea que casa `at least one character` va **antes** que la que casa
      `password`.
- [x] `components/new-password-form.tsx` no importa `readable` y contiene
      `error.code === "weak_password"`.
- [x] El párrafo de ayuda es hermano del `<label>` y el `<input>` lo referencia con
      `aria-describedby`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan después de **cada** paso.

### En pantalla

- [ ] Registro con `abc12345` da `LE FALTA UNA MAYUSCULA`, y no se hace ninguna petición de red.
- [ ] Registro con `Abc12345` da `LE FALTA UN SIMBOLO: !@#$%&*`.
- [ ] Registro con `Abc1234!` llega a «REVISA TU CORREO».
- [ ] **Entrar con la cuenta que ya existe, cuya contraseña tiene seis caracteres, funciona.**
- [ ] Entrar con una contraseña incorrecta sigue dando `CORREO O CONTRASENA INCORRECTOS`.
- [ ] `/cuenta/nueva-contrasena` con `abcdefgh` da `LE FALTA UNA MAYUSCULA`, y con la
      contraseña actual da `ESA YA ERA TU CONTRASENA. ESCRIBE OTRA`.
- [ ] Entrar con Google y con GitHub sigue funcionando.

### Las cabeceras

- [x] Con `npm run build && npm run start`, las **cinco** cabeceras están con su valor exacto
      en `/`, `/biblioteca`, `/cuenta`, `/jugar/snake`, `/api/supabase-health` y
      `/snake/fruits.png`.
- [x] Con `npm run dev` y el servidor reiniciado, las mismas rutas llevan **cuatro** y no
      `Strict-Transport-Security`.
- [x] `grep -c "process.argv" next.config.ts` devuelve `0`.
- [x] Ninguna respuesta lleva `X-Powered-By`.

### La base de datos

- [x] `information_schema.role_table_grants` para `anon` y `authenticated` devuelve **diez**
      filas y ninguna con `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` ni `TRIGGER`.
- [x] `has_function_privilege('anon','public.handle_new_user()','execute')` es `false`, y lo
      mismo para `rls_auto_enable()` y para `authenticated`.
- [x] `has_function_privilege('postgres','public.handle_new_user()','execute')` sigue siendo
      `true`.
- [x] `begin; set local role anon; truncate public.scores;` falla con `42501`. Antes de la
      migración **no fallaba**.
- [x] Con `set local role anon`, `select` sobre `games`, `top_scores` y `player_bests` sigue
      funcionando.
- [x] **El trigger de alta sigue funcionando**: un `insert` en `auth.users` con
      `raw_user_meta_data = '{"username":"TRIGGER_18"}'` dentro de una transacción que se
      deshace deja una fila en `public.profiles` con ese nombre.
- [x] La rama sin nombre de SPEC 16 sigue funcionando: el mismo `insert` con
      `raw_user_meta_data = '{}'` tiene éxito y `profiles` no gana fila.
- [ ] Firmar una marca desde `/jugar/[id]` sigue funcionando, con cuenta y como invitado.
- [ ] Editar una fila de `public.games` desde el panel de Supabase sigue funcionando.
- [x] `get_advisors type=security` no devuelve ninguno de los cuatro
      `*_security_definer_function_executable`.
- [x] `get_advisors type=security` **sí** sigue devolviendo `auth_leaked_password_protection`,
      a propósito.
- [x] `pg_default_acl` del esquema `public` para el rol `postgres` ya no menciona `anon` ni
      `authenticated`.
- [x] `npx supabase db reset` contra el stack local aplica las trece migraciones sin error e
      imprime el aviso de que `rls_auto_enable()` no existe en esa base.
- [x] Aplicar la migración dos veces sobre la base remota tampoco falla.

### La configuración de Auth

- [x] `supabase/config.toml` dice `minimum_password_length = 8`,
      `password_requirements = "lower_upper_letters_digits_symbols"` y
      `sign_in_sign_ups = 10`, y esos tres valores coinciden con lo que muestra el panel.
- [x] El historial de la rama no contiene ni un `supabase config push`, y `config.toml`
      conserva su `site_url` y sus `additional_redirect_urls` sin tocar.

## Decisiones tomadas y descartadas

- **Sí:** la primera casilla del checklist se declara cumplida y se sustituye por lo que de
  verdad falta. RLS está habilitado en las tres tablas desde SPEC 15; lo que no está es el
  permiso revocado, y son dos capas distintas.
- **Sí:** revocar todo y devolver lo que el código usa, en vez de revocar `update`, `delete` y
  `truncate`. Se lee como la lista de lo que la app hace —cinco relaciones, seis líneas— y no
  depende de acordarse de todos los verbos que existen hoy o que existirán mañana.
- **Sí:** `revoke execute` también de `public` y no sólo de los dos roles nominales. El `=X`
  del ACL es de donde heredan, y sin esa línea las funciones seguirían publicadas.
- **No:** `force row level security`. Y no es cautela, es que hoy es un no-op y mañana sería un
  cepo. Sólo cambia el comportamiento del **propietario** de la tabla, que es `postgres`, y
  `postgres` tiene `rolbypassrls = true`: ponerlo no cambiaría ni una consulta. Para `anon` y
  `authenticated`, que es de quien hay que protegerse, la RLS ya está forzada por definición.
  Y el día que el propietario cambiara, o que `postgres` perdiera `bypassrls`, rompería dos
  cosas a la vez, porque **no hay política de `update` ni de `delete` en ninguna tabla**:
  editar el catálogo desde el panel —la vía que oficializó SPEC 17— empezaría a fallar con «new
  row violates row-level security policy», y `20260804210500_leaderboard_seed.sql`, que escribe
  `seeded = true` amparándose en que corre como propietaria, tumbaría cualquier `db reset`.
- **Sí:** `alter default privileges` para que el endurecimiento sea una regla. `pg_default_acl`
  concede hoy `arwdDxtm` a los dos roles en toda tabla nueva creada por `postgres`, así que sin
  esto la próxima migración con tabla desanda el primer bloque sin que nadie lo note.
- **Sí, a sabiendas:** eso significa que **una tabla nueva nace sin ningún permiso** y PostgREST
  responde `permission denied for table X` en vez de una lista vacía. Es el comportamiento
  correcto —denegar por defecto—, pero es un cambio real de flujo de trabajo: toda spec futura
  con tabla escribe su `grant select` al lado de su `create policy`. Queda como regla en
  CLAUDE.md y no sólo en el comentario de la migración.
- **No:** adoptar `rls_auto_enable()` y su event trigger `ensure_rls` en el historial de
  migraciones. Están en la base remota y en ninguna migración —es drift, y se ve en el
  propietario: los otros seis event triggers del proyecto son de `supabase_admin`, o sea de
  fábrica, y éste es de `postgres`—. Meterlos en el historial significaría crear en cada
  `supabase db reset` un event trigger que se dispara en todo DDL, y nadie en el repo sabe por
  qué se creó ni si se quiere. Se le cierra el RPC y nada más.
- **Sí:** el `revoke` de esa función va dentro de un `do $$ ... if exists ... $$` con la
  sentencia en una cadena para el `execute`. Sin la guarda, un `supabase db reset` desde cero
  fallaría con `42883 function public.rls_auto_enable() does not exist`; con ella la migración
  vale para las dos bases. La cadena hace falta para que plpgsql no intente resolver el nombre
  al compilar el bloque.
- **Sí:** revocar EXECUTE de `handle_new_user()`, con la certeza de que no rompe
  `on_auth_user_created`. PostgreSQL comprueba ese privilegio al **crear** el trigger y no cada
  vez que dispara; quien inserta en `auth.users` es `supabase_auth_admin`, que no hereda de
  `anon` ni de `authenticated`; y la propietaria conserva su EXECUTE. Aun así se verifica
  empíricamente, porque de esto depende que se pueda crear una cuenta.
- **Sí:** un aviso escrito en la migración de que si algún día hay que recrear esa función se
  hace con `create or replace` —que **conserva** el ACL, como ya hace
  `20260817000000_perfil_opcional.sql`— y nunca con `drop` más `create`, que lo devolvería al
  de fábrica y reabriría el agujero en silencio.
- **No:** tocar `service_role`. Su clave no sale a internet y todavía no tiene consumidor.
- **Sí:** las cabeceras en `next.config.ts` y no en `proxy.ts`. Dos razones que la
  documentación empaquetada deja claras: `headers()` se resuelve **antes del sistema de
  ficheros**, así que cubre también las páginas y lo de `public/`; y el `matcher` de `proxy.ts`
  excluye `_next/static`, `_next/image`, `favicon.ico` y `snake/fruits.png`, que se quedarían
  desnudos. Además ese archivo construye tres `NextResponse` distintos —uno dentro de
  `setAll()`—, así que habría que pegarlas tres veces.
- **Sí:** el interruptor de HSTS es `process.env.NODE_ENV === "development"`. En Next 16 el
  archivo de configuración ya no lo carga el comando `next dev`, así que el
  `process.argv.includes("dev")` de los ejemplos de Next 14 y 15 devuelve `false` en desarrollo
  y colaría HSTS **sin que nada avise**. Lo dice
  `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`, sección «`next dev`
  config load», y recomienda esto mismo.
- **Sí:** HSTS sólo en producción, aunque hoy sea inofensivo. Sobre `http://` el navegador debe
  ignorar la cabecera, así que en `localhost` y en la IP de la LAN es un no-op. Pero HSTS se
  guarda por **host** y no por puerto: el día que cualquier cosa en esa máquina sirva
  `localhost` sobre https, un `max-age` de dos años con `includeSubDomains` anclado a
  `localhost` fuerza todos los demás proyectos a https, y quitarlo se hace a mano en las
  entrañas del navegador.
- **No:** `preload` en HSTS. Es un compromiso separado —hay que enviar el dominio a la lista de
  precarga de Chrome y salir de ella es lento— y hoy no hay dominio propio: `config.toml` sigue
  con `site_url = "http://127.0.0.1:3000"`.
- **Sí:** `X-Frame-Options: DENY` y no `SAMEORIGIN`. `grep` de `iframe`, `window.top` y
  `window.parent` en `app`, `components` y `lib` da cero: no hay marco propio ni ajeno. Lo
  único que `DENY` rompe y `SAMEORIGIN` no es que una pantalla del vault se embeba en otra, y
  nada lo hace. Es temporal por diseño: lo sustituirá `frame-ancestors 'none'` cuando llegue la
  spec de CSP.
- **No:** CSP en esta spec. Necesita `nonce` por petición para los scripts en línea de Next, y
  es donde está el riesgo real de romper la pantalla de juego o el acceso.
- **Sí:** `poweredByHeader: false`. Un `X-Powered-By: Next.js` en cada respuesta es información
  que no hace falta dar y quitarlo es una línea.
- **Sí:** un único `lib/password.ts` isomorfo. Hoy `MIN_PASSWORD = 6` está escrito dos veces,
  en dos archivos, de forma independiente, y ésa es la clase de duplicación que un día empieza
  a decir cosas distintas.
- **Sí:** la misma regla se valida en Next y en Supabase. La garantía real es el servidor; el
  cliente existe para que un alta no falle por sorpresa, que es lo que se pidió. Si los dos
  dejan de coincidir, que el cliente sea el estricto es inofensivo —rechaza lo que el servidor
  habría aceptado— y lo contrario miente.
- **Sí:** `passwordProblem()` devuelve un rótulo y no una lista. El hueco de error es un solo
  párrafo de Press Start 2P a 9px.
- **No:** clase de caracteres de expresión regular para los símbolos. La cadena lleva `\`,
  `]`, `^` y `-` dentro, y un escape mal puesto cambia la regla sin fallar.
- **Sí:** la comprobación deja de correr en el login, y esto no es una mejora aprovechando el
  viaje sino la consecuencia de subir el mínimo. Una cuenta anterior a esta spec tiene seis
  caracteres y **sigue siendo válida para Supabase**: su documentación lo dice y
  `signInWithPassword()` devuelve sesión, adjuntando un aviso `data.weakPassword`. Aplicar la
  exigencia nueva al login bloquearía justo las cuentas que no se pueden arreglar, y las
  bloquearía nuestro código antes de preguntar.
- **Sí:** la rama de composición en `readable()`, discriminando por `at least one character`.
  Las dos frases que Supabase manda por contraseña débil llevan la palabra `password`, así que
  la rama genérica las cazaba las dos y diría `NECESITA 8 CARACTERES` de una contraseña de doce
  a la que le falta un símbolo. Se discrimina por ese trozo y no por `weak` ni por `password`,
  porque es lo único presente en la frase de composición y ausente en la de longitud, que ya
  está bien atendida.
- **No:** cambiar `readable(message: string)` por `readable(error: AuthError)` para mirar
  `error.code`. Sería mejor, pero de sus ocho llamadas varias reciben un `PostgrestError` o una
  cadena, y un `PostgrestError` no tiene `code: "weak_password"`. Cambiar la firma por un caso
  obligaría a un `readable` doble o a un `unknown` con guardas.
- **No:** que `new-password-form.tsx` pase a usar `readable()`. Esa función no es un
  diccionario, es un **orden** calibrado para los flujos de `AuthPanel` —el comentario de la
  cuota existe porque desde SPEC 16 hay dos flujos de correo—, y en `/cuenta/nueva-contrasena`
  seis de sus nueve ramas son inalcanzables: compartirla significaría que un ajuste hecho para
  el acceso cambie en silencio lo que dice la pantalla de contraseña. Además allí sí se pueden
  usar códigos, porque el error viene siempre de `updateUser()` y por tanto siempre es un
  `AuthError`, lo que además arregla el `includes("different")` de hoy, que se rompe el día que
  Supabase reescriba la frase. Lo que las dos pantallas comparten es el **vocabulario**, que
  sale de `lib/password.ts`.
- **Sí:** un párrafo de ayuda, hermano del `<label>` y referenciado con `aria-describedby`.
  Dentro del `<label>` pasaría a formar parte del nombre accesible del campo, y un lector de
  pantalla anunciaría «Contraseña Mínimo 8 caracteres con una minúscula…».
- **No:** medidor de fuerza. Mide algo que no es la regla y sugiere que un 60% podría valer.
- **No:** lista de cuatro reglas con marcas actualizándose al teclear. En Press Start 2P a 9px
  son cuatro filas que empujan el botón fuera de la pantalla en un móvil de 360px, que es la
  anchura a la que `mobile-porter` mide.
- **No:** `minLength` ni `pattern` en el `<input>`. Dispararían el globo nativo del navegador,
  en su idioma y sin estilo, **antes** de nuestro `submit()`; y en el acceso `minLength`
  volvería a bloquear a la cuenta antigua por otra puerta, que es el defecto que esta spec
  arregla.
- **No:** deshabilitar el botón mientras la contraseña no valga. El patrón del repo es error al
  enviar, y un botón muerto que no dice por qué es peor que un rótulo.
- **Sí:** los tres ajustes de Auth a mano en el panel y espejados en `config.toml`.
- **No:** `supabase config push`. Y no es prudencia: ese archivo tiene los valores por defecto
  del CLI en `site_url` y `additional_redirect_urls`, así que empujarlo arrasaría la Site URL
  del despliegue, las dos URLs de redirección de `/auth/confirmar` y `/auth/callback`, las dos
  plantillas de correo con `{{ .TokenHash }}` —lo que CLAUDE.md llama «lo que más cuesta
  descubrir»— y los proveedores Google y GitHub con sus secretos. `config.toml` aquí es
  documentación del panel, no su fuente de verdad, y esa asimetría no se deduce del archivo:
  hay que escribirla.
- **No:** reconciliar `config.toml` entero con el estado remoto para poder usar `config push`.
  Es un trabajo del tamaño de su propia spec y metería el manejo de los secretos de OAuth en el
  flujo del repo.
- **Sí:** `password_requirements` en su valor más fuerte, que es el que el panel recomienda.
  Con dos cuentas en la base y una con contraseña, el coste de dejar fuera a alguien es
  mínimo, y es el momento de hacerlo.
- **Sí:** `sign_in_sign_ups` a 10 y no a 5. Corta el alta masiva sin estorbar a un uso normal;
  a 5, una demostración con varias personas detrás del mismo NAT se choca contra el límite
  enseguida.
- **No:** protección contra contraseñas filtradas. Es de plan Pro y la organización está en
  `free`. Se queda como línea de bloqueo fechada en el checklist, porque el advisor va a seguir
  sacando ese WARN.
- **No:** una comprobación propia contra HaveIBeenPwned desde el cliente. Es viable con
  k-anonymity y sin que la contraseña salga del navegador, pero añade una dependencia externa
  en el camino del registro y un `connect-src` que la spec de CSP tendría que heredar. Si algún
  día se quiere, es su decisión y no un sucedáneo colado aquí.
- **No:** rate limiting de la Server Action que firma la marca. Su cabecera ya dice que el
  marcador es falsificable y se acepta; limitarlo pide infraestructura que el repo no tiene.

## Riesgos

| Riesgo                                                                                                                    | Mitigación                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El advisor va a seguir sacando `auth_leaked_password_protection` y alguien lo «arreglará» dos veces                       | Línea de bloqueo fechada en el checklist con el motivo —plan Pro, organización en free— y la condición de revisión: el día que la organización suba de plan                             |
| El paso 5 no se deshace con `git revert`: el archivo vuelve, los permisos no                                              | Queda escrito aquí y en la migración. Si hay que deshacerlo, es una contramigración con los `grant` de vuelta                                                                           |
| Revocar EXECUTE de `handle_new_user()` deja sin poder crear cuentas si la premisa es falsa                                | La premisa está verificada por tres vías independientes, y hay un criterio de aceptación que lo comprueba empíricamente **dentro de una transacción que se deshace**, sin gastar correo |
| `alter default privileges` sorprende a una spec futura con un `permission denied` en vez de una lista vacía               | Se acepta a sabiendas y se convierte en regla escrita en CLAUDE.md: toda tabla nueva lleva su `grant` al lado de su `create policy`                                                     |
| `config.toml` pasa a decir cosas que nadie empuja, y parece la fuente de verdad sin serlo                                 | Ninguna técnica. Se escribe en CLAUDE.md que `config push` no se corre en este repo y por qué, en la misma viñeta que ya enumera la configuración que sólo vive en el panel             |
| La cuota de dos correos por hora del plan gratuito, ahora con `sign_in_sign_ups` a 10, limita las pruebas a mano del alta | Los criterios que gastan correo están marcados como de una sola pasada. La comprobación del trigger se hace por SQL en una transacción que se deshace, que no gasta nada                |
| Sólo hay una cuenta con contraseña, así que el criterio de que la cuenta antigua entra se prueba una vez                  | Tomar la línea base **antes** del paso 6 y repetir después. Si algo saliera mal, el paso 6 se deshace a mano en el panel                                                                |
| `X-Frame-Options: DENY` no tiene lista de orígenes                                                                        | Ninguna en esta spec: es la decisión. El día que se quiera un `/jugar/[id]` embebible hay que pasarse a `frame-ancestors` de CSP, que es la spec que ya viene                           |
| HSTS con `max-age` de dos años anclado a un host de desarrollo                                                            | No se manda en desarrollo, y el interruptor es `NODE_ENV` y no `process.argv`, que en Next 16 no sirve. Los criterios lo comprueban en las dos direcciones                              |
| Subir la exigencia de contraseña deja fuera a cuentas existentes al **entrar**                                            | No pasa: Supabase deja entrar con una contraseña débil y avisa por separado, y el paso 2 quita la comprobación del login. Es un criterio de aceptación y no una suposición              |

## Lo que **no** entra en esta spec

- `Content-Security-Policy`, con o sin `nonce`.
- Protección contra contraseñas filtradas, ni la de Supabase ni una propia.
- Aprovechar el `data.weakPassword` del acceso para invitar a cambiar la contraseña.
- Tocar `service_role`, `proxy.ts` o `lib/games/`.
- Adoptar `rls_auto_enable()` y su event trigger en el historial de migraciones.
- `force row level security`.
- Políticas de `update` y `delete` en ninguna tabla.
- MFA, captcha, `secure_password_change` y timebox de sesión.
- SMTP propio para subir la cuota de correo.
- Rate limiting de la Server Action que firma la marca.
- Cambiar el aspecto de ninguna pantalla más allá del párrafo de ayuda bajo el campo de
  contraseña.

Cada una de esas, si llega, va en su propia spec.
