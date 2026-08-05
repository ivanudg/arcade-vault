-- SPEC 07 — Solo asteroids: el catalogo encoge y el marcador arranca limpio.
--
-- Deja las dos tablas como espejo de `lib/games.ts` despues de SPEC 07: una
-- maquina, `asteroids`, y cero marcas.
--
-- Las noventa marcas de la siembra de SPEC 06 se van enteras. Un marcador
-- compartido cuyas diez primeras filas son inventadas no es un marcador; es
-- decoracion en Postgres. Se llena jugando.
--
-- El esquema no cambia: mismas tablas, mismos indices, mismas politicas y las
-- mismas dos vistas. `top_scores` y `player_bests` devuelven cero filas sobre
-- una tabla vacia, que es exactamente lo que deben decir.
--
-- La siembra de SPEC 06 no se revierte: el historial cuenta lo que paso y esto
-- se borra hacia delante.

-- `delete from public.scores` sin `where`: hoy no hay ni una marca real, y una
-- condicion sobre `seeded` dejaria el resultado a merced de lo que alguien
-- guarde entre que se escribe esta migracion y el dia en que se aplica.
delete from public.scores;

-- Va despues del delete de `scores` a proposito: `scores.game_id` tiene clave
-- ajena contra `games`, y al reves esto fallaria con las marcas apuntando aqui.
delete from public.games where id <> 'asteroids';
