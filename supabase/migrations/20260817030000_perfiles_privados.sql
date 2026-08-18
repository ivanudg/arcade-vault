-- SPEC 19 — `public.profiles` deja de ser publica.
--
-- SPEC 15 abrio el SELECT de esta tabla a `anon` y `authenticated` con
-- `using (true)`, y escribio su motivo: que el panel comprueba si un nombre esta
-- libre antes de `signUp()`, y que el marcador resuelve el nombre de una cuenta
-- sin sesion iniciada. **Lo segundo dejo de ser cierto**: `scores.player_name`
-- esta denormalizado desde SPEC 06 y ningun lector del marcador consulta
-- `profiles`.
--
-- Lo que queda es una puerta abierta al censo del vault: con la clave publicable
-- —que viaja al navegador en cada visita, por diseno— un
-- `GET /rest/v1/profiles?select=*` devuelve el **UUID de `auth.users`**, el
-- nombre de jugador y la fecha de alta de cada cuenta, incluidas las que nunca
-- han dejado una marca.
--
-- Lo unico que sigue necesitando mirar la fila de un tercero es la comprobacion
-- de nombre disponible, y para eso no hace falta entregar la tabla: basta un
-- booleano por candidato. De ahi la funcion de abajo.
--
-- OJO: esta migracion **no se deshace con `git revert`**, igual que la de
-- SPEC 18. Devolver el archivo no devuelve la politica ni el `grant`.

-- ---------------------------------------------------------------------------
-- 1. La disponibilidad del nombre, como funcion y no como lectura de la tabla
-- ---------------------------------------------------------------------------

-- `security definer` porque quien pregunta —`anon` en el registro,
-- `authenticated` al elegir nombre con una cuenta de proveedor— ya no tiene
-- SELECT sobre `public.profiles`. `stable` porque no escribe y se puede
-- optimizar dentro de la consulta. `search_path` vacio y el nombre calificado,
-- por la misma razon que `handle_new_user()`: una funcion `security definer`
-- corre con los permisos de la propietaria, y un `search_path` heredado seria un
-- camino para resolver `profiles` a otra tabla.
--
-- El `upper()` replica lo que hace el trigger al escribir y lo que hace el panel
-- antes de llamar: la comparacion es sobre el nombre normalizado, no sobre lo
-- que se teclee.
--
-- Sigue siendo un oraculo de disponibilidad, y eso es inevitable si el
-- formulario ha de poder decir «cogido». Lo que cambia es el precio: un booleano
-- por candidato en vez del listado entero con su UUID y su fecha de alta.
create function public.username_libre(candidato text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = upper(candidato)
  );
$$;

-- El `alter default privileges` de SPEC 18 revoca EXECUTE de `public` sobre las
-- funciones nuevas, asi que esta nace cerrada y el `grant` va escrito. Se revoca
-- primero a `public` de todas formas: es de donde heredan los dos roles, y
-- dejarlo al azar de que la regla por defecto siga en su sitio seria confiar en
-- otra migracion para cerrar esta.
revoke execute on function public.username_libre(text) from public;
grant execute on function public.username_libre(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. La tabla se cierra a su propio dueno
-- ---------------------------------------------------------------------------

drop policy "perfiles publicos" on public.profiles;

-- `authenticated` y no `anon`: sin sesion no hay fila propia que leer, y con la
-- politica acotada a `auth.uid()` un `anon` solo obtendria una lista vacia.
-- Mejor que no tenga ni el permiso.
--
-- `(select auth.uid())` envuelto y no `auth.uid()` suelto: asi se evalua una vez
-- por consulta en vez de una por fila, que es lo que el advisor de Supabase
-- venia avisando como `auth_rls_initplan`.
create policy "mi perfil" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- La politica sola no basta: el `grant` de SPEC 18 es la otra capa, y son dos.
-- `authenticated` conserva el suyo porque `lib/session.tsx` lee la fila propia
-- con `.eq("id", ...)`, y ese filtro necesita SELECT sobre la columna por la que
-- filtra.
revoke select on public.profiles from anon;

-- El `insert` de "crear mi perfil" (SPEC 16) no se toca: sigue siendo de
-- `authenticated` y sigue acotado a `id = auth.uid()`. Y sigue sin haber
-- politica de `update` ni de `delete`.
