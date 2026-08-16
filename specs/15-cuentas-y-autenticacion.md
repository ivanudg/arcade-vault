# SPEC 15 — Cuentas reales: registro, acceso y sesión de Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 04, SPEC 06
> **Fecha:** 2026-08-16
> **Objetivo:** Sustituir la sesión simulada de `localStorage` por cuentas reales de Supabase Auth con correo y contraseña, un `username` único por jugador en `public.profiles`, y marcas firmadas con `user_id`.

## Por qué existe esta spec

Desde SPEC 01 el vault tiene una sesión de mentira: `/cuenta` escribe un nombre
en `localStorage`, la contraseña se descarta sin mirarla y los dos botones de
OAuth llaman a `login("GOOGLE_USER")`. Funcionaba porque no había nada que
proteger.

Desde SPEC 06 sí lo hay. El marcador es **compartido**: una sola tabla para todo
el mundo, donde cualquiera puede firmar con el nombre que quiera. Y el único
dueño que una marca conoce es `device_id`, un UUID de navegador que se pierde al
cambiar de aparato, al vaciar el almacenamiento o al abrir una ventana privada.
Quien juega desde el móvil y desde el portátil son hoy dos personas distintas
para el vault.

Supabase lleva conectado desde SPEC 04 con `@supabase/ssr`, o sea con la sesión
viajando en cookies y compartida entre el navegador y el servidor. Lo único que
falta para que sea autenticación de verdad es usarla: los dos clientes ya están
escritos, tipados y probados contra el proyecto enlazado.

Esta spec trae **el núcleo y nada más**: correo, contraseña, nombre único y la
marca firmada con la cuenta. OAuth y recuperar contraseña dependen de
configuración externa y de pantallas propias, así que van en la SPEC 16. La
feature se pidió entera y se parte aquí porque el objetivo de una sola spec no
puede tocar cinco dominios a la vez.

## Alcance

**Dentro:**

- Tabla `public.profiles` (`id`, `username`, `created_at`) con `username` único,
  su RLS y el trigger que crea la fila al registrarse.
- Columna `public.scores.user_id`, su índice y la política de `insert` que impide
  firmar una marca con la cuenta de otro. `device_id` se conserva tal cual.
- `lib/session.tsx` reescrito sobre Supabase Auth: `getSession()`,
  `onAuthStateChange()` y el `username` leído de `profiles`.
- `lib/storage.ts` deja de declarar y de escribir `user`. La clave sigue siendo
  `arcadevault:v1`.
- `components/auth-panel.tsx` real: registro con usuario, correo y contraseña;
  acceso con correo y contraseña; estados de envío, de error y de «revisa tu
  correo»; y el panel de perfil con `CERRAR SESION`.
- `proxy.ts` en la raíz del repo, que refresca la sesión en cada petición.
- Route Handler `app/auth/confirmar/route.ts`, al que apunta el enlace de
  confirmación del correo.
- `app/jugar/[id]/actions.ts`: con sesión, el nombre y el `user_id` de la marca
  los resuelve el **servidor**, no el cliente.
- `mine` en el marcador: por `user_id` si hay sesión, por `device_id` si no.
- Los botones `GOOGLE` y `GITHUB` se quedan visibles y **deshabilitados**, con el
  rótulo de que llegan en la SPEC 16.

**Fuera de alcance (para specs futuras):**

- **OAuth con Google y GitHub** (SPEC 16). Exige dar de alta dos apps externas y
  una ruta de callback distinta a la de confirmación.
- **Recuperar contraseña** (SPEC 16). Es otra pantalla y otro flujo de correo.
- Cambiar el `username` una vez creado. Las marcas ya firmadas guardan el nombre
  viejo, y decidir qué se ve entonces en el salón es una decisión de producto.
- Estadísticas de perfil («mis mejores marcas»). Es una pantalla de datos con sus
  tres estados de marcador.
- Proteger rutas. Hoy no hay ninguna que lo pida: se juega sin cuenta a propósito.
- Reclamar para una cuenta las marcas firmadas antes como invitado.
- Borrar la cuenta y sus datos.
- Avatar de verdad: el cuadro con la inicial se queda exactamente como está.

## Modelo de datos

**Tabla nueva.** El `username` es lo que firma las marcas, así que hereda las
reglas que ya aplican `login()` de `lib/session.tsx` y `saveScore()`: mayúsculas
y doce caracteres.

```sql
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique,
  created_at timestamptz not null default now(),

  constraint profiles_username_format check (username ~ '^[A-Z0-9_]{3,12}$')
);
```

El `_` entra en el patrón porque el marcador de posición del formulario es
`jugador_01` desde SPEC 01. El mínimo de tres caracteres es nuevo: la tabla
`scores` admite nombres de uno, pero un nombre de cuenta de una letra es un
nombre que otro querrá y no podrá tener.

**Columna nueva en `public.scores`:**

```sql
alter table public.scores
  add column user_id uuid references auth.users (id) on delete set null;

create index scores_user_id_idx on public.scores (user_id);
```

`on delete set null` y no `cascade`: si una cuenta desaparece, su marca sigue en
el marcador con el nombre con el que se firmó. Se pierde el dueño, no la
puntuación — la misma regla que `deviceId()` ya aplica hoy cuando devuelve
`undefined`.

**El usuario en el cliente.** `lib/session.tsx` deja de importar `VaultUser` de
`lib/storage.ts` y pasa a declarar el suyo:

```ts
interface VaultUser {
  id: string; // auth.users.id
  username: string; // profiles.username, ya normalizado
  email: string;
}

interface Session {
  user: VaultUser | null;
  ready: boolean; // false hasta la primera respuesta de Supabase
  logout: () => Promise<void>;
}
```

`login(name)` **desaparece del contexto**. Entrar deja de ser escribir un string
y pasa a ser una llamada de red que puede fallar de cuatro formas distintas, así
que vive en `AuthPanel` con sus estados, no en un contexto que sólo puede
devolver `void`.

**Lo que cambia en `lib/scores.ts`:** `BoardRow`, `RecentScore` y `PlayerRank`
ganan `userId: string | null` junto al `deviceId` que ya tienen. `mine` se sigue
resolviendo en el cliente.

**Lo que cambia en `lib/storage.ts`:** `VaultData` pierde el campo `user` y el
tipo `VaultUser` sale de ahí. `deviceId` y `skins` no se tocan y **la clave sigue
en `arcadevault:v1`**: lo que tenga guardado un navegador viejo en `user` se
queda ahí sin que lo lea nadie, exactamente como pasó con `scores` en SPEC 06.

## Plan de implementación

1. **Migración `profiles`.** Crear `supabase/migrations/<ts>_auth_profiles.sql`
   con la tabla, su `check`, la RLS —`select` público para `anon` y
   `authenticated`, y ninguna política de `insert`, `update` ni `delete`— y la
   función `handle_new_user()` `security definer` con su trigger `after insert`
   sobre `auth.users`, que toma el nombre de `new.raw_user_meta_data->>'username'`.
   Aplicar con `npx supabase db push` y regenerar tipos con
   `npm run supabase:types`. Comprobación: crear un usuario desde el panel de
   Supabase con ese metadato crea su fila en `profiles`, y repetir el `username`
   falla.

2. **Migración `scores.user_id`.** Crear `<ts>_scores_user_id.sql` con la
   columna, el índice y la sustitución de la política de `insert` por
   `seeded = false and (user_id is null or user_id = auth.uid())`. Aplicar y
   regenerar tipos. Comprobación: el vault sigue guardando marcas de invitado
   igual que antes de la migración.

3. **`proxy.ts` en la raíz.** Refresca la sesión con `createServerClient` y
   `auth.getUser()`, y devuelve la respuesta con las cookies actualizadas. Lee
   las credenciales de `lib/supabase/env.ts` y **nunca** de `process.env`. Si
   `isSupabaseConfigured()` es falso, deja pasar la petición sin tocarla.
   `matcher` que excluye `_next/static`, `_next/image`, `favicon.ico` y
   `snake/fruits.png`. Comprobación: `npm run dev` y el sitio entero sigue
   funcionando, con y sin variables de entorno.

4. **Reescribir `lib/session.tsx`** sobre el cliente de navegador: `getSession()`
   al montar, `onAuthStateChange()` suscrito y dado de baja al desmontar, y el
   `username` traído de `profiles` con el `id` de la sesión. `ready` se sigue
   deduciendo de `undefined`, como hoy. Quitar `user` y `VaultUser` de
   `lib/storage.ts` y ajustar los cinco consumidores —`site-header.tsx`,
   `account-link.tsx`, `play-cabinet.tsx`, `contact-form.tsx` y
   `auth-panel.tsx`— para que lean `user.username` en vez de `user.name`.
   Comprobación: el sitio compila y todo el mundo aparece como invitado, que es
   lo correcto porque aún no hay forma de entrar.

5. **`AuthPanel` real.** Registro: usuario, correo y contraseña; comprueba
   primero que el `username` esté libre contra `profiles` y avisa con
   `ESE NOMBRE YA ESTA COGIDO` si no lo está; después `signUp()` con el
   `username` en `options.data` y
   `emailRedirectTo: ${window.location.origin}/auth/confirmar`. Acceso:
   `signInWithPassword()`. Los dos con estado de envío, con estado de error y
   —el registro— con el aviso de `REVISA TU CORREO`. El panel con sesión enseña
   el `username`, el correo y `CERRAR SESION` (`signOut()` más
   `router.refresh()`). Los botones `GOOGLE` y `GITHUB` quedan `disabled`.

6. **`app/auth/confirmar/route.ts`.** Lee `token_hash` y `type` de la query,
   llama a `auth.verifyOtp()` y redirige a `/cuenta`; si falla, a
   `/cuenta?error=confirmacion`, que el panel traduce a un aviso. Comprobación:
   registrarse, pulsar el enlace del correo y acabar dentro.

7. **Firmar la marca con la cuenta.** En `app/jugar/[id]/actions.ts`, resolver la
   sesión con `supabase.auth.getUser()`: si hay usuario, el `player_name` sale de
   su `profiles.username` y el `user_id` de su `id`, **ignorando el nombre que
   mande el cliente**; si no hay usuario, se conserva el camino de hoy con el
   nombre recibido, sus tres validaciones y `user_id` nulo.

8. **`mine` por cuenta.** `lib/leaderboard.ts` devuelve `user_id` en sus
   lecturas, `lib/scores.ts` lo declara en sus tres interfaces, y
   `score-panel.tsx`, `hall-of-fame.tsx` y `activity-feed.tsx` comparan contra el
   `user.id` de `useSession()` cuando hay sesión y contra `deviceId()` cuando no.

9. **Documentación.** Actualizar `CLAUDE.md`: «Sesión y `localStorage`» deja de
   decir que no hay autenticación real, «Supabase» deja de decir que no existe
   `proxy.ts`, y se anota la configuración manual que hay que hacer una vez en el
   panel de Supabase —Site URL, URLs de redirección y confirmación de correo
   activada—. `.env.example` **no cambia**: la autenticación usa las mismas tres
   variables que ya están declaradas.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.
- [ ] Registrarse con usuario libre, correo y contraseña crea la fila en
      `auth.users` y su fila en `public.profiles` con el `username` en mayúsculas.
- [ ] Registrarse con un `username` ya existente no crea ninguna cuenta y el panel
      enseña `ESE NOMBRE YA ESTA COGIDO`.
- [ ] Registrarse con un correo ya existente enseña un error y no deja el panel
      colgado en el estado de envío.
- [ ] Hasta pulsar el enlace del correo, el panel enseña `REVISA TU CORREO` y no
      hay sesión iniciada.
- [ ] Pulsar el enlace del correo lleva a `/cuenta` con la sesión abierta.
- [ ] Un enlace de confirmación caducado o ya usado lleva a `/cuenta` con un aviso
      y sin sesión.
- [ ] Con contraseña incorrecta, el acceso enseña un error y no abre sesión.
- [ ] Con sesión abierta, `SiteHeader` y `/cuenta` muestran el `username`, no el
      correo.
- [ ] Recargar la página con sesión abierta la mantiene: el servidor la ve, no
      sólo el navegador.
- [ ] `CERRAR SESION` deja el sitio como invitado sin recargar a mano.
- [ ] Jugar sin cuenta sigue siendo posible y la marca entra firmada como
      `INVITADO` con `user_id` nulo.
- [ ] Jugar con cuenta guarda la marca con `user_id` y con el `username` del
      perfil, aunque el cliente mande otro nombre.
- [ ] En `/salon`, con sesión abierta, mis marcas salen resaltadas en un navegador
      distinto de aquel en el que las hice.
- [ ] `localStorage` deja de escribir el campo `user`; `deviceId` y `skins` siguen
      ahí y la clave sigue siendo `arcadevault:v1`.
- [ ] Los botones `GOOGLE` y `GITHUB` se ven deshabilitados y no hacen nada.
- [ ] Con las variables de Supabase ausentes, el sitio sigue construyendo y
      `proxy.ts` no rompe ninguna ruta.

## Decisiones

- **Sí:** partir la feature en dos specs. Correo, contraseña, perfil y marcador ya
  es bastante; OAuth depende de dos apps externas y recuperar contraseña es otra
  pantalla con otro flujo de correo.
- **Sí:** tabla `profiles` con `username` único. Es lo único que garantiza que dos
  jugadores no firmen el marcador con el mismo nombre, y `raw_user_meta_data` no
  tiene restricción de unicidad.
- **No:** derivar el nombre del correo. Colisiona entre usuarios y no se puede
  elegir.
- **Sí:** crear el perfil con un **trigger** sobre `auth.users`. Si el `username`
  está cogido, el trigger falla, el `insert` en `auth.users` se deshace y no queda
  una cuenta huérfana sin perfil.
- **No:** crear el perfil desde el cliente después de `signUp()`. Con la
  confirmación de correo activada, `signUp()` no devuelve sesión, así que ese
  `insert` no tendría permiso.
- **Sí:** comprobar el `username` **antes** de `signUp()`, para poder dar un error
  legible. La restricción `unique` sigue siendo la garantía real; la comprobación
  previa es cortesía y cubre todo menos una carrera de milisegundos.
- **Sí:** llamar a Supabase Auth desde el **navegador** (`createBrowserClient`) y
  no desde Server Actions. `@supabase/ssr` escribe ahí las cookies que después lee
  el servidor, y `onAuthStateChange` mantiene el contexto al día sin recargar. Con
  Server Actions habría que refrescar a mano y el proveedor se quedaría con estado
  viejo.
- **Sí:** `router.refresh()` después de entrar y de salir, para que los Server
  Components que leen el marcador se vuelvan a pintar con la sesión nueva.
- **Sí:** conservar `device_id` junto a `user_id`. Quien juega sin cuenta sigue
  viendo sus marcas resaltadas, que es como funciona el vault desde SPEC 06.
- **Sí:** que el servidor resuelva el nombre y el `user_id` de una marca con
  sesión. Una Server Action es una URL pública que responde a cualquier POST; si
  el nombre viniera del cliente, cualquiera firmaría con el de otro.
- **No:** exigir cuenta para jugar. El vault se juega desde el primer clic y eso
  no cambia aquí.
- **Sí:** `proxy.ts` sólo de refresco, sin rutas protegidas. Hoy no hay ninguna
  que proteger, y la documentación de Next avisa de que el proxy no es el sitio
  para la autorización.
- **Sí:** que `proxy.ts` deje pasar la petición si faltan las credenciales. Es lo
  contrario de lo que hace `lib/supabase/env.ts`, y a propósito: lanzar ahí
  tumbaría el sitio entero, incluidas las pantallas que no hablan con Supabase. No
  finge una sesión: simplemente no la refresca.
- **Sí:** dejar la clave de `localStorage` en `v1`. Subir a `v2` no aporta nada:
  lo que se quita es un campo que deja de leerse, y `deviceId` y `skins` deben
  sobrevivir.
- **No:** limpiar el campo `user` viejo del almacenamiento. Es código de migración
  que habría que mantener para siempre por un string muerto.
- **No:** cambiar el `username` desde el perfil. Las marcas ya firmadas guardan el
  nombre antiguo y el salón enseñaría los dos; merece su propia decisión.
- **No:** sugerir un `username` alternativo cuando el elegido está cogido. Un
  nombre que el jugador no eligió es un nombre que va a querer cambiar, y cambiar
  el nombre está fuera de alcance.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                                    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| El enlace de confirmación apunta a `localhost` en producción               | La Site URL y las URLs de redirección se configuran en el panel de Supabase; el paso queda escrito en `CLAUDE.md`.            |
| El correo de confirmación de Supabase tiene cuota baja en el plan gratuito | Basta para desarrollo y demo. Un proveedor SMTP propio, si hace falta, es otra spec.                                          |
| El trigger falla y el usuario ve un error opaco de Supabase                | La comprobación previa del `username` cubre el caso normal; el error del trigger se traduce al mismo mensaje.                 |
| `proxy.ts` corre en rutas que no lo necesitan y añade latencia             | El `matcher` excluye `_next/*`, el favicon y `snake/fruits.png`.                                                              |
| Quien tenía nombre guardado en `localStorage` lo pierde                    | Nunca fue una cuenta: sigue jugando como `INVITADO` y puede registrarse con ese mismo nombre si está libre.                   |
| Dos jugadores compiten por el mismo `username` a la vez                    | La restricción `unique` decide; el segundo recibe error y vuelve a elegir.                                                    |
| El marcador queda con nombres duplicados de antes de las cuentas           | `scores.player_name` es texto libre por diseño. Las marcas viejas se quedan como están; sólo las nuevas se firman con perfil. |

## Lo que **no** entra en esta spec

- OAuth con Google y GitHub.
- Recuperar contraseña.
- Cambiar el `username`.
- Estadísticas de perfil.
- Rutas protegidas.
- Reclamar marcas de invitado.
- Borrar la cuenta.

Cada una de ellas, si entra, entra en su propia spec. Las dos primeras están ya
apalabradas como SPEC 16.
