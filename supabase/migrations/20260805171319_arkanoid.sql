-- SPEC 09 — Arkanoid: la tercera maquina entra en `public.games`.
--
-- `public.games` existe para que `scores.game_id` tenga una clave ajena real.
-- El catalogo sigue mandandolo `lib/games.ts`: esta fila se siembra desde el, y
-- nunca al reves. La app no lee estas columnas —el titulo de una maquina sale de
-- `getGame()`—, asi que esto no cambia ni un pixel; lo que evita es que guardar
-- la primera marca de Arkanoid reviente contra la clave ajena. Sin esta fila la
-- maquina se ve, se juega, y solo falla al terminar la partida.
--
-- Ningun `update`: SPEC 08 dejo `asteroids` en 0 y `tetris` en 1, asi que el 2
-- continua la serie sin tocar nada existente.
--
-- No se siembra ninguna marca. SPEC 07 vacio el marcador para que se llene
-- jugando, y el de Arkanoid arranca vacio como los otros dos.

insert into public.games (id, title, cat, playable, sort_order) values
  ('arkanoid', 'ARKANOID', 'ARCADE', true, 2);
