# SPEC 16 — OAuth con Google y GitHub, nombre de jugador y recuperar contraseña

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06, SPEC 15
> **Fecha:** 2026-08-17
> **Objetivo:** Completar las cuentas de SPEC 15 con acceso por Google y GitHub —incluida la pantalla de nombre de jugador que OAuth no puede pedir en el formulario— y con el flujo de recuperar la contraseña por correo.

## Por qué existe esta spec

SPEC 15 dejó dos botones en pantalla que no hacen nada. `GOOGLE` y `GITHUB` están
ahí, deshabilitados, con un rótulo que promete esta spec. Y dejó fuera recuperar
la contraseña, que es la única forma de volver a entrar cuando se olvida: hoy una
cuenta perdida es una cuenta perdida.

Lo que no se veía venir en la 15 es que OAuth **no cabe** sin resolver antes un
problema de datos. `public.profiles.username` es `not null`, único y con formato,
y quien lo escribe es un trigger que lo saca del formulario de registro. Google no
manda nombres de jugador y GitHub tampoco. Así que entrar con un proveedor, hoy,
haría fallar el alta entera: ni cuenta, ni sesión, ni forma de entrar.

De ahí que esta spec traiga tres cosas y no dos. La tercera —la pantalla donde se
elige el nombre— no es un adorno de OAuth: es lo que lo hace posible.

## Alcance

**Dentro:**

- Los dos botones `GOOGLE` y `GITHUB` del panel dejan de estar deshabilitados y
  llaman a `signInWithOAuth()` con `redirectTo` a la ruta de callback.
- Route Handler `app/auth/callback/route.ts`, que canjea el `code` de OAuth con
  `exchangeCodeForSession()`. Es una ruta **distinta** de `/auth/confirmar`, que
  canjea `token_hash` con `verifyOtp()`.
- Migración que cambia `handle_new_user()`: crea el perfil **sólo** si el alta
  trae `raw_user_meta_data->>'username'`. Una cuenta de Google o de GitHub nace
  sin fila en `public.profiles`.
- Política de `insert` en `public.profiles` —hoy no existe ninguna— para que quien
  tiene sesión pueda crear **su** fila: `with check (id = auth.uid())`.
- Cuarto estado del `AuthPanel`: con sesión y sin perfil, el panel enseña el
  formulario de nombre de jugador en vez del perfil. Sin ruta nueva.
- `VaultUser.username` pasa a `string | null`. `SiteHeader` enseña `ELIGE NOMBRE`
  enlazando a `/cuenta` mientras sea nulo.
- `app/jugar/[id]/actions.ts`: con sesión pero sin perfil, la marca entra como
  `INVITADO` con `user_id` nulo, en vez de rechazarse.
- Recuperar contraseña: enlace en el panel, `resetPasswordForEmail()`, el reparto
  por `type` en `/auth/confirmar`, y la pantalla nueva
  `/cuenta/nueva-contrasena`.
- Enlazado de identidades por correo: quien se registró con correo y luego entra
  con Google usando ese mismo correo cae en la **misma** cuenta.
- La documentación del alta de las dos apps externas —Google Cloud y GitHub— y de
  lo que hay que tocar en el panel de Supabase.

**Fuera de alcance (para specs futuras):**

- **Cambiar el `username`** una vez elegido. Sigue fuera desde SPEC 15: las
  marcas ya firmadas guardan el nombre viejo y el salón enseñaría los dos.
- Más proveedores (Discord, Twitch, Apple). Cada uno es otra app externa.
- Desvincular una identidad de una cuenta ya enlazada.
- Cambiar el correo de la cuenta.
- Cerrar la sesión en todos los dispositivos a la vez.
- Verificación en dos pasos.
- Avatar del proveedor: el cuadro con la inicial se queda exactamente como está.
- Sigue fuera lo que la 15 ya dejó fuera: estadísticas de perfil, rutas
  protegidas, reclamar marcas de invitado y borrar la cuenta.

## Modelo de datos

**No hay tablas nuevas ni columnas nuevas.** `public.profiles` y `public.scores`
se quedan como las dejó SPEC 15. Lo que cambia es **quién** escribe en `profiles`
y **cuándo**.

### El trigger deja de escribir siempre

Hoy `handle_new_user()` escribe el perfil en toda alta de `auth.users`. Con
Google o GitHub no hay metadato `username` que leer, así que `upper(null)` sería
`null`, chocaría contra el `not null` y **tumbaría el alta entera**: no habría
cuenta, ni sesión, ni forma de entrar.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Sin nombre en el alta no hay perfil: es una cuenta de proveedor, y su
  -- nombre lo elige la persona después, en `/cuenta`.
  if new.raw_user_meta_data ->> 'username' is null then
    return new;
  end if;

  insert into public.profiles (id, username)
  values (new.id, upper(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;
```

`profiles.username` sigue siendo `not null`, único y con el mismo
`^[A-Z0-9_]{3,12}$`. «Tener perfil» sigue significando «tiene nombre»; lo que
aparece es un estado nuevo, **cuenta sin perfil**, que antes no existía.

### Una política de `insert`, acotada a uno mismo

```sql
create policy "crear mi perfil" on public.profiles for insert to authenticated
  with check (id = auth.uid());
```

Es la única escritura que la app hace sobre `profiles`. Sigue sin haber política
de `update` ni de `delete`: el nombre se elige una vez y cambiarlo está fuera de
alcance.

### El usuario en el cliente

```ts
interface VaultUser {
  id: string;
  /** `null` mientras la cuenta no tenga fila en `profiles`. */
  username: string | null;
  email: string;
}
```

`username` nulo es el estado nuevo y no un error: hay sesión de verdad, y lo que
falta es el nombre. Desaparece el `FALLBACK_NAME` de SPEC 15, que inventaba
`JUGADOR` cuando el perfil no se podía leer — inventarlo aquí sería firmar marcas
con un nombre que nadie eligió.

### Los estados del panel

```ts
type PanelMode = "login" | "register" | "recuperar";
```

`AuthPanel` pinta uno de cinco bloques, en este orden:

| Cuándo                                    | Qué se ve                            |
| ----------------------------------------- | ------------------------------------ |
| Sesión con perfil                         | El perfil y `CERRAR SESION`          |
| Sesión sin perfil                         | El formulario de nombre de jugador   |
| Acaba de registrarse o de pedir el enlace | `REVISA TU CORREO`                   |
| `mode` es `recuperar`                     | El campo de correo y `ENVIAR ENLACE` |
| Resto                                     | Las pestañas de acceso y registro    |

El orden **es** la lógica: «sesión con perfil» va antes que «revisa tu correo»
para que quien confirma su correo y vuelve con sesión vea el perfil y no un aviso
viejo.

### Las dos rutas de canje

| Ruta              | Qué canjea             | Con qué                    | A dónde va                                                   |
| ----------------- | ---------------------- | -------------------------- | ------------------------------------------------------------ |
| `/auth/callback`  | `code` de OAuth        | `exchangeCodeForSession()` | `/cuenta`, o `/cuenta?error=oauth`                           |
| `/auth/confirmar` | `token_hash` de correo | `verifyOtp()`              | `/cuenta`; con `type=recovery`, a `/cuenta/nueva-contrasena` |

## Plan de implementación

1. **Migración del trigger y la política.** Crear
   `supabase/migrations/<ts>_perfil_opcional.sql` con el `create or replace` de
   `handle_new_user()` que devuelve `new` sin escribir cuando no hay metadato
   `username`, y la política `"crear mi perfil"` de `insert` sobre
   `public.profiles` con `with check (id = auth.uid())`. Aplicar con
   `npx supabase db push` y regenerar tipos con `npm run supabase:types`.
   Comprobación: registrarse por correo sigue creando la fila; un alta sin ese
   metadato crea la cuenta y **no** crea perfil, en vez de fallar.

2. **`username` pasa a admitir nulo en el cliente.** En `lib/session.tsx`,
   `VaultUser.username` es `string | null` y desaparece `FALLBACK_NAME`. Ajustar
   los cuatro sitios que lo leen: `site-header.tsx` enseña `ELIGE NOMBRE`
   enlazando a `/cuenta`, `auth-panel.tsx` y `play-cabinet.tsx` tratan el nulo
   como invitado, y `contact-form.tsx` no prerrellena nada. Comprobación: con una
   cuenta de correo el sitio se ve exactamente igual que antes.

3. **La marca de quien no tiene nombre.** En `app/jugar/[id]/actions.ts`, con
   sesión y sin fila en `profiles` la marca entra como `INVITADO` con `user_id`
   nulo, en vez de devolver `No se pudo leer tu perfil.`. El fallo de lectura
   —error de la consulta, no ausencia de fila— sigue rechazando la marca.
   Comprobación: borrando a mano la fila de `profiles` de una cuenta, la partida
   se guarda como `INVITADO`.

4. **El formulario de nombre en `AuthPanel`.** Con sesión y `username` nulo, el
   panel enseña un campo, valida el formato contra `^[A-Z0-9_]{3,12}$`, comprueba
   que esté libre, hace el `insert` en `profiles` y llama a `router.refresh()`.
   El choque contra el `unique` se traduce al mismo `ESE NOMBRE YA ESTA COGIDO`.
   Comprobación: borrando tu fila de `profiles` y recargando `/cuenta`, el panel
   pide nombre y al elegirlo aparece el perfil.

5. **Alta de las dos apps externas.** En Google Cloud, una credencial OAuth de
   tipo aplicación web; en GitHub, una OAuth App. En las dos, la URL de
   redirección es la que da Supabase
   (`https://nlfwqnmidfdohuyhklqp.supabase.co/auth/v1/callback`). Pegar cliente y
   secreto en los proveedores del panel de Supabase y activarlos. Añadir
   `<origen>/auth/callback` a las URLs de redirección. **No toca el repo**, y sin
   él el paso 6 no se puede probar. Comprobación: los dos proveedores salen
   activados en el panel.

6. **OAuth vivo.** Crear `app/auth/callback/route.ts`, que canjea el `code` con
   `exchangeCodeForSession()` y acaba en `/cuenta`, o en `/cuenta?error=oauth` si
   falta el código o el canje falla. Quitar el `disabled` de los dos botones del
   panel y llamar a `signInWithOAuth()` con
   `redirectTo: ${window.location.origin}/auth/callback`. Comprobación: entrar con
   Google acaba en `/cuenta` con sesión y con el formulario de nombre.

7. **Pedir el enlace de recuperación.** Añadir el modo `recuperar` al panel: un
   enlace `¿OLVIDASTE TU CONTRASENA?` bajo el formulario de acceso, un campo de
   correo y `resetPasswordForEmail()` con
   `redirectTo: ${window.location.origin}/auth/confirmar`. Reutiliza el aviso
   `REVISA TU CORREO`. Comprobación: pedirlo con un correo dado de alta hace que
   llegue el mensaje.

8. **Escribir la contraseña nueva.** En `/auth/confirmar`, cuando el `type` es
   `recovery`, redirigir a `/cuenta/nueva-contrasena` en vez de a `/cuenta`.
   Crear esa pantalla en `app/(vault)/cuenta/nueva-contrasena/page.tsx` con un
   componente de cliente que pide la contraseña dos veces y llama a
   `updateUser()`. Sin sesión, redirige a `/cuenta?error=recuperacion`.
   Comprobación: el enlace del correo lleva a la pantalla, la contraseña cambia,
   se acaba en `/cuenta` con la sesión abierta, y la nueva contraseña sirve para
   entrar.

9. **Documentación.** En `CLAUDE.md`: «Sesión y cuentas» gana el estado de cuenta
   sin nombre y las dos rutas de canje; la lista de configuración manual del panel
   de Supabase gana los dos proveedores y sus URLs; y la tabla de rutas gana
   `/auth/callback` y `/cuenta/nueva-contrasena`. `.env.example` **no cambia**: el
   cliente y el secreto de cada proveedor viven en el panel de Supabase, no en el
   repo.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.
- [ ] Registrarse con correo y contraseña sigue creando la fila de `profiles` con
      el `username` en mayúsculas.
- [ ] Un alta sin metadato `username` crea la cuenta en `auth.users` y **no** crea
      fila en `profiles`, en vez de fallar.
- [ ] Entrar con `GOOGLE` por primera vez acaba en `/cuenta` con sesión abierta y
      con el panel pidiendo el nombre de jugador.
- [ ] Entrar con `GITHUB` por primera vez hace lo mismo.
- [ ] Cancelar en la pantalla del proveedor acaba en `/cuenta` con un aviso y sin
      sesión.
- [ ] Elegir un nombre libre crea la fila en `profiles` y el panel pasa a enseñar
      el perfil sin recargar a mano.
- [ ] Elegir un nombre ya cogido no crea ninguna fila y el panel enseña
      `ESE NOMBRE YA ESTA COGIDO`.
- [ ] Elegir un nombre con formato inválido enseña el aviso sin llegar a consultar
      la base de datos.
- [ ] Mientras la cuenta no tiene nombre, `SiteHeader` enseña `ELIGE NOMBRE` y
      lleva a `/cuenta`.
- [ ] Mientras la cuenta no tiene nombre, terminar una partida y guardar mete la
      marca como `INVITADO` con `user_id` nulo.
- [ ] Con el nombre ya elegido, la marca entra con `user_id` y con ese `username`.
- [ ] Quien se registró con un correo y después entra con Google usando ese mismo
      correo cae en la **misma** cuenta: una sola fila en `auth.users` y el mismo
      `username`.
- [ ] Entrar con un proveedor y recargar mantiene la sesión: el servidor la ve.
- [ ] Pedir el enlace de recuperación con un correo dado de alta enseña
      `REVISA TU CORREO` y el mensaje llega.
- [ ] Pedir el enlace con un correo que no existe enseña el **mismo** aviso, sin
      dejar saber si esa cuenta existe.
- [ ] El enlace del correo de recuperación lleva a `/cuenta/nueva-contrasena`, no
      a `/cuenta`.
- [ ] Las dos contraseñas de esa pantalla tienen que coincidir; si no, el aviso
      sale sin llamar a Supabase.
- [ ] Cambiar la contraseña acaba en `/cuenta` con la sesión abierta.
- [ ] La contraseña nueva sirve para entrar y la anterior deja de servir.
- [ ] Abrir `/cuenta/nueva-contrasena` sin sesión redirige a `/cuenta` con un
      aviso.
- [ ] Abrir `/cuenta/nueva-contrasena` con una sesión normal —sin venir del
      correo— deja cambiar la contraseña igualmente.
- [ ] Un enlace de recuperación caducado o ya usado lleva a `/cuenta` con un aviso
      y sin sesión.
- [ ] Con las variables de Supabase ausentes, el sitio sigue construyendo y
      ninguna de las dos rutas de canje rompe.

## Decisiones

- **Sí:** una sola spec para OAuth y para recuperar contraseña. Se valoró
  partirlas —OAuth se lleva pantalla, trigger y dos apps externas— y se decidió
  juntarlas porque SPEC 15 ya las apalabró como una y el plan por pasos deja cada
  trozo commitable por separado.
- **Sí:** pedir el nombre de jugador en una pantalla, después del primer acceso
  con proveedor. Es lo único que respeta que el nombre lo elige quien juega.
- **No:** derivarlo del proveedor con un sufijo si está cogido. Te asigna un
  nombre que no elegiste, y cambiarlo está fuera de alcance desde SPEC 15.
- **No:** derivarlo y además permitir cambiarlo. Mete «cambiar `username`» en esta
  spec, que arrastra qué hacer con las marcas ya firmadas con el nombre viejo.
- **Sí:** que el trigger **no** cree perfil cuando el alta no trae `username`.
  Deja `not null` intacto, así que «tener perfil» sigue significando «tiene
  nombre».
- **No:** `profiles.username` nulable. Un perfil a medias obliga a comprobar el
  nulo en cada consulta, y el estado nuevo se expresa igual de bien con la
  ausencia de fila.
- **No:** un nombre provisional del tipo `JUGADOR_7F2A`. Es un nombre real que
  ocupa sitio en la tabla de únicos y que alguien acabará firmando sin querer.
- **Sí:** una política de `insert` en `profiles` acotada a `id = auth.uid()`.
  Alguien tiene que poder crear su fila desde el navegador, y ése es el único
  `insert` que la app hace sobre esa tabla.
- **Sí:** el formulario de nombre vive en `AuthPanel`. Es donde te deja el
  callback y donde ya están los otros cuatro estados; una ruta nueva sería una
  pantalla más para lo mismo.
- **No:** una ruta `/cuenta/nombre` propia.
- **Sí:** `VaultUser.username` a `string | null`. El nulo **es** el estado, y un
  tipo que lo dice obliga a `tsc` a que nadie se lo salte.
- **No:** un `needsUsername: boolean` junto a un nombre inventado. Dos campos que
  pueden contradecirse para decir una sola cosa.
- **Sí:** que la cabecera enseñe `ELIGE NOMBRE` mientras el nombre falte. Lo
  contrario —enseñar el correo— pone una dirección en pantalla sin que nadie lo
  haya pedido.
- **Sí:** que la marca de quien todavía no tiene nombre entre como `INVITADO` con
  `user_id` nulo. El nombre lo sigue poniendo el servidor, como manda SPEC 15;
  simplemente todavía no hay ninguno que poner, y perder la partida sería peor.
- **No:** llevar a la fuerza a elegir nombre en cuanto hay sesión sin perfil. El
  vault se juega desde el primer clic y una redirección global rompe eso.
- **Sí:** una ruta de callback propia, `/auth/callback`. OAuth vuelve con un
  `code` y `exchangeCodeForSession()`; el correo vuelve con un `token_hash` y
  `verifyOtp()`. Son dos canjes distintos y meterlos en una ruta la convierte en
  un `if` sobre qué parámetro llegó.
- **Sí:** repartir por `type` dentro de `/auth/confirmar` para la recuperación.
  Ahí el canje **es** el mismo `verifyOtp()`; lo único que cambia es a dónde se
  sale.
- **Sí:** una pantalla propia para escribir la contraseña nueva. El enlace de
  `recovery` abre sesión de verdad, así que reutilizar `/cuenta` enseñaría el
  perfil justo cuando hace falta un formulario.
- **Sí:** que esa pantalla funcione también con una sesión normal. Es de hecho la
  pantalla de «cambiar contraseña», y no tenerla obligaría a pedirse un correo a
  uno mismo para cambiarla.
- **Sí:** quedarse dentro después de cambiarla. Ya hay sesión válida; echarla para
  pedir la contraseña recién escrita es trabajo sin ganancia.
- **Sí:** enlazar identidades cuando el correo coincide. Quien entra con Google
  usando el correo con el que se registró espera su cuenta, no una segunda.
- **Sí:** el mismo aviso exista o no el correo al pedir la recuperación.
  Distinguirlo convierte el formulario en un detector de qué direcciones tienen
  cuenta aquí.
- **Sí:** `CERRAR SESION` sigue cerrando sólo este navegador. Cerrar en todos es
  otra cosa y va en otra spec.
- **Sí:** documentar el alta de las dos apps externas paso a paso. No están dadas
  de alta, y sin ellas el paso 6 no se puede ni probar.
- **No:** guardar cliente y secreto de los proveedores en `.env`. Viven en el
  panel de Supabase, que es quien habla con Google y con GitHub; el repo no los
  ve nunca.

## Riesgos

| Riesgo                                                                                         | Mitigación                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las URLs de redirección no incluyen el origen desde el que se prueba y el callback falla       | La lista del panel de Supabase admite varias; el paso 5 la deja escrita, `localhost` incluido.                                                                    |
| GitHub no devuelve el correo si quien entra lo tiene en privado                                | Se pide el ámbito `user:email` al activar el proveedor. Sin correo, la cuenta entra igual y el perfil enseña sólo el nombre.                                      |
| Sin correo verificado del proveedor no hay enlazado y quedan dos cuentas para la misma persona | Es el comportamiento de Supabase y no se fuerza: dos cuentas son dos nombres distintos, y unificarlas sería reclamar marcas ajenas, que está fuera de alcance.    |
| Cuentas de proveedor que nunca eligen nombre                                                   | Se quedan así y sus marcas entran como `INVITADO`. La cabecera insiste con `ELIGE NOMBRE` en cada pantalla; no se borra ninguna cuenta.                           |
| Con el trigger nuevo, un `signUp()` sin metadato crea una cuenta sin perfil en silencio        | El panel siempre manda el `username` en el registro por correo, y hay un criterio de aceptación que lo comprueba.                                                 |
| La pantalla de contraseña nueva no pide la anterior                                            | Es lo que hace `updateUser()`, y pedirla rompería la recuperación —quien la olvidó no puede escribirla—. Quien llega ahí ya tiene sesión válida en ese navegador. |
| Dos personas eligen el mismo nombre a la vez                                                   | La restricción `unique` decide; la segunda recibe `ESE NOMBRE YA ESTA COGIDO` y vuelve a elegir, igual que en el registro de SPEC 15.                             |
| Los correos de Supabase tienen cuota baja en el plan gratuito, y ahora son dos flujos          | Basta para desarrollo y demo. Un proveedor SMTP propio, si hace falta, es otra spec.                                                                              |

## Lo que **no** entra en esta spec

- Cambiar el `username` una vez elegido.
- Proveedores más allá de Google y GitHub.
- Desvincular una identidad o cambiar el correo de la cuenta.
- Cerrar la sesión en todos los dispositivos.
- Verificación en dos pasos.
- Avatar del proveedor.
- Lo que la 15 ya dejó fuera: estadísticas de perfil, rutas protegidas, reclamar
  marcas de invitado y borrar la cuenta.

Cada una de ellas, si entra, entra en su propia spec.
