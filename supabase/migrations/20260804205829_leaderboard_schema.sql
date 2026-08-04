-- SPEC 06 — Marcador en Supabase: esquema.
--
-- Crea las dos tablas del marcador, sus indices, sus CHECK, la RLS y las dos
-- vistas que consume la app. La siembra va en su propia migracion.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Copia reducida del catalogo de `lib/games.ts`, que sigue siendo la fuente de
-- verdad. Existe para que `scores.game_id` tenga una clave ajena real y para
-- que la base de datos se explique sola en el editor SQL. La app no lee sus
-- columnas.
create table public.games (
  id          text primary key,
  title       text not null,
  cat         text not null,
  playable    boolean not null default true,
  sort_order  smallint not null
);

create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id),
  player_name text not null,
  score       integer not null,
  -- `true` solo en las noventa marcas de la migracion de siembra.
  seeded      boolean not null default false,
  -- Quien la guardo. `null` en las semillas. Es lo que pinta `mine`.
  device_id   uuid,
  created_at  timestamptz not null default now(),

  constraint scores_score_range check (score >= 0 and score <= 10000000),
  constraint scores_name_length check (char_length(player_name) between 1 and 12)
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_created_at_idx on public.scores (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "catalogo publico" on public.games for select to anon, authenticated using (true);
create policy "marcador publico" on public.scores for select to anon, authenticated using (true);
create policy "firmar una marca" on public.scores for insert to anon, authenticated with check (seeded = false);

-- No hay politica de `update` ni de `delete`: sin politica, RLS los niega. El
-- `with check (seeded = false)` impide que nadie se cuele una marca disfrazada
-- de semilla. La migracion de siembra corre como propietaria y no pasa por RLS.

-- ---------------------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------------------

-- Existen para que el navegador nunca se traiga la tabla entera. Las dos con
-- `security_invoker = true`, para que la RLS de `scores` siga aplicando.

-- Top 10 de cada maquina. Devuelve 90 filas por muchas marcas que haya.
-- El desempate es la marca mas antigua primero: quien llego antes a esa cifra
-- va delante.
create view public.top_scores with (security_invoker = true) as
select * from (
  select s.*,
         row_number() over (partition by s.game_id order by s.score desc, s.created_at) as rank
  from public.scores s
) t
where rank <= 10;

-- La mejor marca de cada nombre, para el ranking global de la portada.
create view public.player_bests with (security_invoker = true) as
select distinct on (s.player_name) s.player_name, s.score, s.game_id, s.device_id
from public.scores s
order by s.player_name, s.score desc;
