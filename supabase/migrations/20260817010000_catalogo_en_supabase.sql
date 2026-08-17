-- SPEC 17 — El catalogo se muda a Supabase.
--
-- Hasta hoy `public.games` era una copia reducida de `lib/games.ts` que existia
-- solo para que `scores.game_id` tuviera una clave ajena real, y la app no leia
-- sus columnas. Esta migracion invierte la direccion: la tabla gana las cuatro
-- columnas que le faltaban y pasa a ser la fuente de verdad de los siete campos
-- del catalogo, para poder editar y retirar maquinas desde el panel sin
-- desplegar.
--
-- Dos nombres no coinciden con el campo de TypeScript, y es a proposito:
-- `desc` es palabra reservada en PostgreSQL —usarla obligaria a entrecomillarla
-- en cada consulta a mano— y `long` al lado de `tagline` no dice nada. La tabla
-- usa `tagline` (es `Game.desc`) y `blurb` (es `Game.long`), y `lib/catalog.ts`
-- los traduce al leer la fila.
--
-- El orden importa: las columnas entran nullable, se pueblan con un `update`
-- por maquina, y solo entonces pasan a `set not null`. Un
-- `add column ... not null` sin `default` sobre una tabla con cinco filas falla.

-- ---------------------------------------------------------------------------
-- 1. Las cuatro columnas nuevas, nullable
-- ---------------------------------------------------------------------------

alter table public.games
  add column glow     text,
  add column tagline  text,
  add column blurb    text,
  add column controls text;

comment on column public.games.glow     is 'Color de acento de la maquina. Uno de los tres neones de globals.css.';
comment on column public.games.tagline  is 'Una linea, para la tarjeta de la biblioteca. Es `Game.desc` en TypeScript.';
comment on column public.games.blurb    is 'Parrafo de la ficha. Es `Game.long` en TypeScript.';
comment on column public.games.controls is 'Linea de controles de la ficha.';

-- ---------------------------------------------------------------------------
-- 2. Se pueblan con los valores exactos que hoy tiene `lib/games.ts`
-- ---------------------------------------------------------------------------

update public.games set
  glow     = '#f5ff00',
  tagline  = 'Pulveriza el campo de asteroides y sobrevive.',
  blurb    = 'El clásico de vectores, entero y jugable de verdad. Inercia real y espacio toroidal: sales por un borde y entras por el opuesto. Los asteroides grandes se parten en medianos y los medianos en pequeños, y cuanto más pequeños, más puntos. Cada nivel suelta dos de los cuatro potenciadores —disparo triple, escudo, cámara lenta e hiperpropulsión— y, con suerte, una bomba nova que limpia la pantalla.',
  controls = 'Flechas ← → giran · ↑ empuja · ESPACIO dispara'
where id = 'asteroids';

update public.games set
  glow     = '#00f5ff',
  tagline  = 'Encaja las piezas, limpia lineas y no llegues al techo.',
  blurb    = 'El clásico de las siete piezas, entero y jugable de verdad. Las piezas caen cada vez más rápido: cada diez líneas sube un nivel y el intervalo de caída baja noventa milisegundos, hasta un suelo de cien. Cuatro líneas de golpe valen ocho veces lo que una. La proyección marca dónde va a aterrizar la pieza y el retardo de bloqueo da medio segundo para encajarla. La partida acaba cuando la pieza siguiente ya no cabe.',
  controls = 'Flechas ← → mueven · ↑ rota · ↓ baja rápido · ESPACIO suelta de golpe'
where id = 'tetris';

update public.games set
  glow     = '#ff006e',
  tagline  = 'Rompe todos los bloques sin dejar caer la bola.',
  blurb    = 'El clásico de la pala y la bola, entero y jugable de verdad. Diez pantallas que van apretando: la bola sale más rápida en cada una y acelera mientras juegas. Los bloques de dos y tres golpes se desgastan a la vista antes de romperse, y los grises no se rompen nunca. El punto de la pala donde golpeas decide el ángulo de salida, hasta sesenta grados. Cada bloque roto vale cien puntos y despejar la decima pantalla acaba la partida.',
  controls = 'Flechas ← → mueven la pala · ESPACIO lanza la bola'
where id = 'arkanoid';

update public.games set
  glow     = '#00f5ff',
  tagline  = 'Come fruta, crece y no te muerdas la cola.',
  blurb    = 'El clásico de la serpiente, con veintidós frutas de verdad en vez de un cuadrado. Cada fruta que comes te hace un segmento más largo y vale diez puntos por nivel, así que la misma manzana renta diez veces más en el nivel diez que en el primero. Cada cinco frutas el juego acelera, de ciento cincuenta milisegundos por celda a sesenta. La pared mata y tu propia cola también. Tres vidas: al perder una vuelves al centro con la puntuación y la velocidad intactas.',
  controls = 'Flechas ← ↑ → ↓ giran · ESPACIO arranca'
where id = 'snake';

update public.games set
  glow     = '#ff006e',
  tagline  = 'Cruza el trafico y el rio y llena las casas ronda tras ronda.',
  blurb    = 'El clásico de la rana, con todo lo que traía el salón. Abajo, cinco carriles de coches y camiones; arriba, cinco de río donde el agua mata y las plataformas te arrastran, y donde una de cada dos tortugas se sumerge justo cuando te has subido. Treinta segundos por travesía, y cada segundo que sobra vale diez puntos. Llenar los cinco nichos empieza otra ronda: todo va un doce por ciento más rápido y hay dos segundos menos, hasta más del doble de velocidad. Desde la tercera ronda un cocodrilo asoma en las casas y una serpiente patrulla la mediana. La mosca vale doscientos, y escoltar a la dama-rana hasta casa, otros doscientos.',
  controls = 'Flechas ← ↑ → ↓ saltan · ESPACIO sale de la orilla'
where id = 'frogger';

-- ---------------------------------------------------------------------------
-- 3. Ahora que estan pobladas, pasan a obligatorias
-- ---------------------------------------------------------------------------

alter table public.games
  alter column glow     set not null,
  alter column tagline  set not null,
  alter column blurb    set not null,
  alter column controls set not null;

-- ---------------------------------------------------------------------------
-- 4. Los tres CHECK
-- ---------------------------------------------------------------------------

-- Los dos primeros replican `GameCategory` y `GameGlow` de `lib/games.ts`: son
-- dos sitios, pero los dos fallan ruidosamente —`tsc` uno y la base de datos el
-- otro—. El tercero convierte en restriccion real la regla que CLAUDE.md lleva
-- escrita desde SPEC 01: lo que se pinta en Press Start 2P va en mayusculas y
-- sin tildes, porque la fuente no tiene glifos acentuados y el navegador los
-- sustituye por otra que al lado de un avance de 20px sale como una mota.
-- Escribir `GALAGÁ` en el panel se rechaza.
alter table public.games
  add constraint games_cat_valida  check (cat in ('ARCADE','CLASICOS','DISPAROS','REFLEJOS','PUZZLE','LABERINTO')),
  add constraint games_glow_valido check (glow in ('#00f5ff','#ff006e','#f5ff00')),
  add constraint games_title_ascii check (title ~ '^[A-Z0-9 ]{1,20}$');

-- ---------------------------------------------------------------------------
-- 5. La clave ajena pasa a `cascade`
-- ---------------------------------------------------------------------------

-- Borrar una maquina se lleva sus marcas. Va en direccion contraria a
-- `scores.user_id`, que es `on delete set null` justamente para no perder
-- puntuaciones, y se toma a sabiendas: la via normal de retirada no es borrar
-- la fila, es `playable = false`.
alter table public.scores drop constraint scores_game_id_fkey;
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id) on delete cascade;
