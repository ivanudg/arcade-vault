-- SPEC 14 — Frogger: la quinta maquina entra en `public.games`.
--
-- `public.games` existe para que `scores.game_id` tenga una clave ajena real.
-- El catalogo sigue mandandolo `lib/games.ts`: esta fila se siembra desde el, y
-- nunca al reves. La app no lee estas columnas —el titulo de una maquina sale de
-- `getGame()`—, asi que esto no cambia ni un pixel; lo que evita es que guardar
-- la primera marca de Frogger reviente contra la clave ajena. Sin esta fila la
-- maquina se ve, se juega, y solo falla al terminar la partida.
--
-- Ningun `update`: las cuatro filas existentes tienen `sort_order` 0, 1, 2 y 3,
-- asi que el 4 continua la serie sin tocar nada existente.
--
-- No se siembra ninguna marca. SPEC 07 vacio el marcador para que se llene
-- jugando, y el de Frogger arranca vacio como los otros cuatro.

insert into public.games (id, title, cat, playable, sort_order) values
  ('frogger', 'FROGGER', 'REFLEJOS', true, 4);
