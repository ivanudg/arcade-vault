-- SPEC 08 — Tetris: la segunda maquina entra en `public.games`.
--
-- `public.games` existe para que `scores.game_id` tenga una clave ajena real.
-- El catalogo sigue mandandolo `lib/games.ts`: esta fila se siembra desde el, y
-- nunca al reves. La app no lee estas columnas —el titulo de una maquina sale de
-- `getGame()`—, asi que esto no cambia ni un pixel; lo que evita es que guardar
-- la primera marca de Tetris reviente contra la clave ajena.
--
-- No se siembra ninguna marca. SPEC 07 vacio el marcador para que se llene
-- jugando, y sembrar la maquina nueva desharia eso al dia siguiente.

insert into public.games (id, title, cat, playable, sort_order) values
  ('tetris', 'TETRIS', 'PUZZLE', true, 1);

-- `sort_order` se documento como la posicion en `GAMES`, y hoy miente:
-- `asteroids` vale 8, resto de la siembra de nueve maquinas de SPEC 06. Nadie
-- lee la columna, asi que corregirla ahora que entra una maquina nueva son dos
-- lineas sin riesgo y deja las dos filas contando la verdad: 0 y 1.
update public.games set sort_order = 0 where id = 'asteroids';
