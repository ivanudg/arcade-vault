-- SPEC 19 — El marcador deja de repartir el UUID de `auth.users`.
--
-- `lib/leaderboard.ts` selecciona `user_id` en cuatro de sus cinco lecturas y lo
-- baja al HTML de cuatro pantallas publicas, porque el resaltado de «esta marca
-- es mia» se resuelve en el navegador: `useMine()` compara `row.userId` con el
-- `id` de la sesion. Y como `top_scores` y `player_bests` tambien nombran esa
-- columna, `anon` puede pedirla directamente por PostgREST sin pasar por el
-- sitio.
--
-- La salida no es dejar de resaltar, sino **calcular el resaltado aqui**: cada
-- vista compara `user_id` con `auth.uid()` y devuelve un booleano. El UUID no
-- sale, el resaltado no se pierde, y no cuesta ni una llamada de red nueva.
--
-- De paso, `mine` deja de mentir: existe en las tres interfaces de
-- `lib/scores.ts` desde SPEC 06, `toBoardRow()` lo pone siempre a `false` y el
-- cliente lo ignora. A partir de aqui dice la verdad.
--
-- OJO: como la de SPEC 18 y la hermana de esta spec, **no se deshace con
-- `git revert`**.

-- ---------------------------------------------------------------------------
-- 1. Las tres vistas
-- ---------------------------------------------------------------------------

-- Dos notas que valen para las tres:
--
-- `(select auth.uid())` envuelto y no `auth.uid()` suelto: asi se evalua una vez
-- por consulta en vez de una por fila.
--
-- `security_barrier = true` y **sin** `security_invoker`, que es un cambio
-- consciente sobre lo que escribio SPEC 06: el bloque 2 le quita al invocador el
-- SELECT sobre `public.scores`, y una vista `security_invoker` no podria leer su
-- tabla base —las tres dejarian de funcionar—. Hoy no se pierde ninguna
-- restriccion, porque la politica de SELECT de `scores` es `using (true)` para
-- los dos roles. Lo que se pierde es la herencia automatica si algun dia esa
-- politica se acota, y por eso queda escrito aqui y en CLAUDE.md: **acotar la
-- lectura de `scores` obliga a repetir el filtro en las tres vistas**.

-- La puerta de lectura de la tabla cruda, que es lo que usa `recentScores()`
-- para la actividad de la portada. Es nueva: hasta hoy esa funcion leia
-- `public.scores` directamente, y a partir del bloque 2 ya no puede.
--
-- No lleva `id` ni `seeded`: ningun lector los usa, y una columna que no se pide
-- es una columna que no se puede filtrar por PostgREST.
create view public.public_scores with (security_barrier = true) as
select s.game_id,
       s.player_name,
       s.score,
       s.device_id,
       s.created_at,
       (s.user_id is not null and s.user_id = (select auth.uid())) as mine
from public.scores s;

-- Top 10 de cada maquina. Se recrea con las mismas columnas que tenia —el `s.*`
-- de SPEC 06 quedo expandido al crearla— salvo `user_id`, que se sustituye por
-- `mine` en su sitio. El `rank` y el desempate por `created_at` ascendente no
-- cambian: quien llego antes a esa cifra va delante.
drop view public.top_scores;

create view public.top_scores with (security_barrier = true) as
select * from (
  select s.id,
         s.game_id,
         s.player_name,
         s.score,
         s.seeded,
         s.device_id,
         s.created_at,
         (s.user_id is not null and s.user_id = (select auth.uid())) as mine,
         row_number() over (partition by s.game_id order by s.score desc, s.created_at) as rank
  from public.scores s
) t
where rank <= 10;

-- La mejor marca de cada nombre, para el ranking global de la portada. Conserva
-- su `distinct on (s.player_name)` y su orden.
drop view public.player_bests;

create view public.player_bests with (security_barrier = true) as
select distinct on (s.player_name)
       s.player_name,
       s.score,
       s.game_id,
       s.device_id,
       (s.user_id is not null and s.user_id = (select auth.uid())) as mine
from public.scores s
order by s.player_name, s.score desc;
