-- SPEC 15 — Cuentas reales: la tabla de perfiles.
--
-- `auth.users` guarda el correo y la contrasena, pero no un nombre de jugador
-- unico: `raw_user_meta_data` es un JSON sin restricciones. Y el nombre es lo
-- que firma el marcador desde SPEC 06, asi que dos jugadores no pueden tener el
-- mismo. De ahi esta tabla: una fila por cuenta, con el `username` unico.
--
-- El `username` hereda las reglas que ya aplican `login()` de `lib/session.tsx`
-- y `saveScore()`: mayusculas y doce caracteres. El `_` entra en el patron
-- porque el marcador de posicion del formulario es `jugador_01` desde SPEC 01.
-- El minimo de tres es nuevo: `scores` admite nombres de un caracter, pero un
-- nombre de cuenta de una letra es un nombre que otro querra y no podra tener.

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique,
  created_at timestamptz not null default now(),

  constraint profiles_username_format check (username ~ '^[A-Z0-9_]{3,12}$')
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- `select` publico porque el panel de registro comprueba si un nombre esta
-- libre antes de llamar a `signUp()`, y porque el marcador resuelve el nombre
-- de una cuenta sin sesion iniciada.
create policy "perfiles publicos" on public.profiles for select to anon, authenticated using (true);

-- Sin politica de `insert`, `update` ni `delete`: sin politica, RLS los niega.
-- La unica fila que se escribe la escribe el trigger de abajo, que corre como
-- `security definer` y no pasa por RLS. Cambiar el `username` esta fuera de
-- alcance en esta spec, asi que nadie necesita `update`.

-- ---------------------------------------------------------------------------
-- Alta automatica del perfil
-- ---------------------------------------------------------------------------

-- El perfil lo crea un trigger sobre `auth.users` y no el cliente despues de
-- `signUp()`: con la confirmacion de correo activada, `signUp()` no devuelve
-- sesion, asi que ese `insert` no tendria permiso. Ademas, si el `username`
-- esta cogido el trigger falla, el `insert` en `auth.users` se deshace, y no
-- queda una cuenta huerfana sin perfil.
--
-- `search_path` vacio y nombres calificados: una funcion `security definer`
-- corre con los permisos del propietario, y un `search_path` heredado seria un
-- camino para resolver `profiles` a otra tabla.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, upper(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
