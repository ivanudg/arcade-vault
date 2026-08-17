-- SPEC 18 — Permisos minimos para `anon` y `authenticated`.
--
-- La RLS esta habilitada en las tres tablas desde SPEC 15, pero la capa de
-- debajo seguia de fabrica: ninguna de las doce migraciones anteriores tiene un
-- `grant` ni un `revoke`, asi que los dos roles que salen a internet conservaban
-- SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES y TRIGGER sobre las tres
-- tablas y las dos vistas.
--
-- Que hoy no se note es merito de la RLS y no del permiso, y son dos capas
-- distintas. Con una consecuencia que no es teorica: **`truncate` no lo mira la
-- RLS en absoluto**. No es un `delete` de filas que una politica pueda filtrar,
-- es una operacion sobre la tabla, y el permiso que `anon` tenia bastaba para
-- vaciar el marcador entero con la clave publicable que viaja al navegador en
-- cada visita.
--
-- OJO: esta migracion **no se deshace con `git revert`**. Devolver el archivo no
-- devuelve los permisos; hace falta una contramigracion con los `grant` de
-- vuelta.

-- ---------------------------------------------------------------------------
-- 1. Revocar todo y devolver solo lo que el codigo usa
-- ---------------------------------------------------------------------------

-- Se revoca todo y se devuelve la lista de lo que la app hace, en vez de revocar
-- `update`, `delete` y `truncate` uno a uno: asi se lee como lo que es —cinco
-- relaciones, seis lineas— y no depende de acordarse de todos los verbos que
-- existen hoy o que existiran manana.
--
-- `service_role` no se toca: su clave no sale a internet y todavia no tiene
-- consumidor.
revoke all on all tables in schema public from anon, authenticated;

-- El catalogo, que desde SPEC 17 es la fuente de verdad de la ficha de cada
-- maquina: lo leen `catalog()` y `game()` de `lib/catalog.ts`.
grant select on public.games to anon, authenticated;

-- Las marcas. El `insert` es de la Server Action de `app/jugar/[id]/actions.ts`,
-- que firma con cuenta y sin ella, asi que lo necesitan los dos roles. El
-- `select` no es solo de `recentScores()`: las dos vistas son
-- `security_invoker = true` desde SPEC 06, asi que su lectura se comprueba
-- contra quien pregunta y necesita ademas el permiso sobre su tabla base.
grant select, insert on public.scores to anon, authenticated;

-- El nombre de jugador. El `select` lo necesita tambien `anon`, porque
-- `components/auth-panel.tsx` comprueba si un nombre esta libre **sin sesion**,
-- antes de registrar. El `insert` es de la politica "crear mi perfil" de
-- SPEC 16 —elegir nombre con una cuenta de proveedor—, y por eso es solo de
-- `authenticated`.
grant select on public.profiles to anon, authenticated;
grant insert on public.profiles to authenticated;

-- Las dos vistas del marcador: `board()`, `boards()` y `bests()` leen la
-- primera, `topPlayers()` la segunda.
grant select on public.top_scores to anon, authenticated;
grant select on public.player_bests to anon, authenticated;

-- No hay `usage` de secuencia que devolver: `scores.id` es `uuid` con
-- `gen_random_uuid()` y en `public` no hay ni una secuencia.

-- ---------------------------------------------------------------------------
-- 2. Las dos funciones `security definer`, fuera de la API
-- ---------------------------------------------------------------------------

-- Las dos estaban publicadas en `/rest/v1/rpc/<nombre>`, que es lo que sacaban
-- los cuatro WARN del advisor. Se nombra tambien a `public` y no solo a los dos
-- roles: su ACL era
-- `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`,
-- y ese `=X` sin rol delante **es** `public`, de donde los dos nominales
-- heredan. Sin esa palabra las funciones seguirian expuestas igual.
--
-- Revocarlo no rompe `on_auth_user_created`: PostgreSQL comprueba el EXECUTE al
-- **crear** el trigger y no cada vez que dispara, quien inserta en `auth.users`
-- es `supabase_auth_admin` —que no hereda de `anon` ni de `authenticated`— y la
-- propietaria conserva el suyo.
--
-- AVISO para el dia que haya que recrear `handle_new_user()`: se hace con
-- `create or replace`, que **conserva** el ACL —como ya hizo
-- `20260817000000_perfil_opcional.sql`—, y nunca con `drop` mas `create`, que lo
-- devolveria al de fabrica y reabriria este agujero en silencio.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- `rls_auto_enable()` es drift: esta en la base remota y en ninguna migracion.
-- No se adopta en el historial —crearla en cada `db reset` significaria un event
-- trigger que se dispara en todo DDL, y nadie en el repo sabe por que se creo—,
-- se le cierra el RPC y nada mas. De ahi la guarda: sin ella un `db reset` desde
-- cero fallaria con `42883 function public.rls_auto_enable() does not exist`.
-- La sentencia va en una cadena para que plpgsql no intente resolver el nombre
-- al compilar el bloque.
do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'rls_auto_enable'
       and p.pronargs = 0
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  else
    raise notice 'public.rls_auto_enable() no existe en esta base: nada que revocar.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Que sea una regla y no una foto
-- ---------------------------------------------------------------------------

-- Sin esto, el bloque 1 seria una foto: `pg_default_acl` del esquema `public`
-- concede `arwdDxtm` a `anon` y `authenticated` en toda tabla que cree
-- `postgres` —o sea, en toda migracion futura—, y EXECUTE en toda funcion nueva.
-- La proxima maquina que traiga tabla desandaria esta migracion sin que nadie lo
-- note.
--
-- A SABIENDAS de lo que eso cambia: una tabla nueva nace **sin ningun permiso**
-- y PostgREST responde `permission denied for table X` en vez de una lista vacia.
-- Es el comportamiento correcto —denegar por defecto— pero es un cambio real de
-- flujo de trabajo: toda spec futura con tabla escribe su `grant select` al lado
-- de su `create policy`. Queda tambien como regla en CLAUDE.md.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
-- Y a `public`, que es de donde heredan los dos: una funcion nueva no nace
-- publicada en la API por el simple hecho de existir.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- 4. Lo que se decidio **no** hacer, y por que
-- ---------------------------------------------------------------------------

-- `force row level security`: descartado con motivo, no aplazado. Hoy es un
-- no-op —solo cambia el comportamiento del **propietario**, que es `postgres`, y
-- `postgres` tiene `rolbypassrls = true`— y manana seria un cepo, porque no hay
-- politica de `update` ni de `delete` en ninguna tabla: editar el catalogo desde
-- el panel, la via que oficializo SPEC 17, empezaria a fallar con «new row
-- violates row-level security policy», y `20260804210500_leaderboard_seed.sql`,
-- que escribe amparandose en que corre como propietaria, tumbaria cualquier
-- `db reset`. Para `anon` y `authenticated`, que es de quien hay que protegerse,
-- la RLS ya esta forzada por definicion.
--
-- Politicas de `update` y `delete`: sigue sin haberlas, y desde esta migracion
-- tampoco hay permiso. Son dos capas y las dos dicen no.
--
-- Y un aviso sobre `scores.game_id`, que desde SPEC 17 es `on delete cascade`:
-- borrar una fila de `public.games` se lleva todas sus marcas. La via de retirada
-- de una maquina es `playable = false`, no borrar la fila.
