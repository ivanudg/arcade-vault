-- SPEC 16 — El perfil deja de ser obligatorio en el alta.
--
-- SPEC 15 dio por hecho que toda cuenta nace de un formulario con un campo de
-- nombre de jugador. Con OAuth eso deja de ser cierto: ni Google ni GitHub
-- mandan un `username`, asi que `upper(null)` seria `null`, chocaria contra el
-- `not null` de `profiles.username` y **tumbaria el alta entera** —ni cuenta, ni
-- sesion, ni forma de entrar—.
--
-- La salida no es hacer nulable la columna, que obligaria a comprobar el nulo en
-- cada consulta, sino que el trigger **no escriba** cuando no hay nombre que
-- escribir. Aparece un estado nuevo, «cuenta sin perfil», que la app resuelve
-- pidiendo el nombre en `/cuenta`. «Tener perfil» sigue significando «tiene
-- nombre».

-- ---------------------------------------------------------------------------
-- El trigger deja de escribir siempre
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Sin nombre en el alta no hay perfil: es una cuenta de proveedor, y su
  -- nombre lo elige la persona despues, en `/cuenta`.
  if new.raw_user_meta_data ->> 'username' is null then
    return new;
  end if;

  insert into public.profiles (id, username)
  values (new.id, upper(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Una politica de `insert`, acotada a uno mismo
-- ---------------------------------------------------------------------------

-- Hasta ahora `profiles` no tenia ninguna politica de escritura: la unica fila
-- la ponia el trigger, que corre como `security definer` y no pasa por RLS. Con
-- una cuenta de proveedor el nombre lo elige el navegador, asi que hace falta
-- poder crear **la propia** fila y nada mas.
--
-- Sigue sin haber politica de `update` ni de `delete`: el nombre se elige una
-- vez y cambiarlo esta fuera de alcance.
create policy "crear mi perfil" on public.profiles for insert to authenticated
  with check (id = auth.uid());
