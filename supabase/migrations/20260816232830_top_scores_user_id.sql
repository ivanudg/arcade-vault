-- SPEC 15 — Cuentas reales: `top_scores` se entera de la columna nueva.
--
-- La vista se escribio con `s.*`, pero Postgres expande esa estrella al crearla
-- y fija la lista de columnas: una columna anadida despues no aparece sola. Asi
-- que la vista de SPEC 06 seguia devolviendo las siete de entonces y el salon
-- no podia saber de quien es cada marca.
--
-- Se corrige hacia delante, como SPEC 07 con la siembra: esta migracion la
-- recrea identica —misma definicion, mismo `security_invoker`, mismo desempate
-- por `created_at` ascendente— sobre la tabla de hoy.

drop view public.top_scores;

create view public.top_scores with (security_invoker = true) as
select * from (
  select s.*,
         row_number() over (partition by s.game_id order by s.score desc, s.created_at) as rank
  from public.scores s
) t
where rank <= 10;
