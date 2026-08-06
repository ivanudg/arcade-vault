-- SPEC 10 — Snake: la cuarta maquina entra en `public.games`.
--
-- `public.games` existe para que `scores.game_id` tenga una clave ajena real.
-- El catalogo sigue mandandolo `lib/games.ts`: esta fila se siembra desde el, y
-- nunca al reves. La app no lee estas columnas —el titulo de una maquina sale de
-- `getGame()`—, asi que esto no cambia ni un pixel; lo que evita es que guardar
-- la primera marca de Snake reviente contra la clave ajena. Sin esta fila la
-- maquina se ve, se juega, y solo falla al terminar la partida.
--
-- Ningun `update`: SPEC 09 dejo `asteroids` en 0, `tetris` en 1 y `arkanoid` en
-- 2, asi que el 3 continua la serie sin tocar nada existente.
--
-- No se siembra ninguna marca. SPEC 07 vacio el marcador para que se llene
-- jugando, y el de Snake arranca vacio como los otros tres.

insert into public.games (id, title, cat, playable, sort_order) values
  ('snake', 'SNAKE', 'CLASICOS', true, 3);
