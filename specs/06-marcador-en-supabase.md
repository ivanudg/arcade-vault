# SPEC 06 — Marcador en Supabase: tablas `games` y `scores`

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 04
> **Fecha:** 2026-08-04
> **Objetivo:** Crear en Supabase las tablas `games` y `scores` con RLS y semillas, y pasar todas las lecturas y escrituras de puntuación de `localStorage` a la base de datos, sin tocar el catálogo de `lib/games.ts`.

## Por qué existe esta spec

SPEC 04 dejó el cable puesto a propósito: clientes, variables, CLI enlazada y una
ruta de salud, y ni una tabla. Escribió literalmente que el esquema entraba en su
propia spec para no elegirlo con prisa mientras se depuraba la conexión. Esta es
esa spec.

Lo que cambia no es dónde se guardan unos números. Hoy el marcador es **privado
por dispositivo**: `addScore()` escribe en tu `localStorage` y nadie más ve tus
marcas. Las diez filas que enseña el salón son noventa puntuaciones inventadas en
`lib/scores.ts` más lo que hayas hecho tú en ese navegador. A partir de aquí el
marcador es **uno solo y compartido**, que es lo que un vault que promete
«competir por la mayor cantidad de puntos» necesita para significar algo.

Ese cambio arrastra dos consecuencias que la spec asume de frente. La primera:
sin autenticación, cualquiera puede insertar cualquier cifra con cualquier
nombre. Se acepta, se acota con `CHECK` y RLS, y la validación de verdad llega
con el login. La segunda: el proyecto es de plan gratuito y se pausa por
inactividad, así que las cinco pantallas que leen marcas tienen que sobrevivir a
que la base de datos no conteste.

Y una cosa que parece de esquema y es de arquitectura: el catálogo **no** se
mueve. `lib/games.ts` sigue mandando. La tabla `games` existe para que
`scores.game_id` tenga una clave ajena real y para que la base de datos se pueda
consultar por SQL sin tener el repo delante. Si algún día el catálogo se edita
sin desplegar, será en otra spec.

## Alcance

**Dentro:**

- **`supabase/migrations/<sello>_leaderboard_schema.sql`**: crea `public.games` y
  `public.scores`, sus índices, sus `CHECK`, sus políticas RLS y las dos vistas.
  Una sola migración para todo el esquema.
- **`supabase/migrations/<sello>_leaderboard_seed.sql`**: las nueve filas de
  `games` y las noventa marcas semilla de `scores`, con `seeded = true` y las
  fechas de `DATES`. Migración aparte de la del esquema.
- **`lib/supabase/database.types.ts`**: regenerado con `npm run supabase:types`.
  Deja de estar vacío; `Database` gana las dos tablas y las dos vistas, y los dos
  clientes se tipan solos.
- **`lib/scores.ts` adelgaza**: se queda con los tipos `ScoreEntry`, `BoardRow`,
  `RecentScore` y `PlayerRank`, y con `formatScore()`. Es isomorfo: lo puede
  importar un componente de cliente. Desaparecen `SEED_ROWS`, `DATES`, `SEED`,
  `board()`, `seedBoard()`, `best()`, `seedBest()`, `recentScores()`,
  `seedRecentScores()`, `topPlayers()`, `seedTopPlayers()` y `addScore()`.
- **`lib/leaderboard.ts`** es nuevo y sólo de servidor (`import "server-only"`).
  Contiene las cinco consultas `async`: `board(id)`, `boards()` —las nueve tablas
  de una consulta—, `bests()`, `recentScores(limit)` y `topPlayers(limit)`.
- **`app/jugar/[id]/actions.ts`**: Server Action
  `saveScore(gameId, name, score, deviceId)`. Valida antes de insertar, llama a
  `revalidatePath()` de las rutas que pintan marcas y devuelve un resultado que
  `PlayCabinet` pueda enseñar. Mismo patrón que `app/(vault)/acerca-de/actions.ts`.
- **`lib/storage.ts`**: `VaultData` pierde `scores` y gana `deviceId`. Función
  nueva `deviceId()`, que lee el identificador o lo crea con
  `crypto.randomUUID()` la primera vez. La clave sigue siendo `arcadevault:v1` y
  el `user` guardado sobrevive.
- **Las cinco pantallas pasan a leer en el servidor y bajar las filas por props:**
  - `app/(vault)/page.tsx` → `TopPlayers` y `ActivityFeed` reciben sus filas ya
    resueltas.
  - `app/(vault)/biblioteca/page.tsx` → resuelve el mapa de mejores marcas y lo
    baja por `LibraryBrowser` hasta `GameCard`.
  - `app/(vault)/juego/[id]/page.tsx` → la mejor marca y la tabla de `ScorePanel`.
  - `app/(vault)/salon/page.tsx` → las nueve tablas de una consulta, para que
    `HallOfFame` siga cambiando de pestaña sin volver a preguntar.
  - `app/jugar/[id]/page.tsx` → no lee marcas; aquí sólo cambia la escritura.
- **Los seis componentes que hoy consultan solos:** `hall-of-fame.tsx`,
  `score-panel.tsx`, `game-card.tsx`, `top-players.tsx`, `activity-feed.tsx` y
  `play-cabinet.tsx` dejan de importar de `lib/scores.ts` todo salvo
  `formatScore` y los tipos. Pierden el `useEffect` que hoy repinta tras hidratar;
  el único efecto que queda es el que marca las filas propias comparando
  `device_id`.
- **Estado degradado:** una consulta que falle devuelve lista vacía, nunca lanza.
  La tabla del salón y la de la ficha pintan `MARCADOR NO DISPONIBLE` en lugar de
  filas; la portada esconde sus dos bloques de marcas. El resto de cada pantalla
  se ve igual.
- **Apartado en `CLAUDE.md`**: qué vive en la base de datos y qué sigue en código,
  que `lib/leaderboard.ts` es sólo de servidor y `lib/scores.ts` isomorfo, que las
  marcas se guardan con la Server Action y no con `addScore()`, y que las
  migraciones se aplican con `npx supabase db push`.

**Fuera de alcance (para futuras specs):**

- **Autenticación.** La sesión sigue siendo un nombre en `localStorage`. Sin
  login, `INSERT` es anónimo y cualquiera puede firmar con el nombre que quiera.
- **Mover el catálogo a la base de datos.** `lib/games.ts` sigue siendo la fuente
  de verdad; `games` se siembra desde él y no al revés.
- **Cualquier medida antitrampas.** Ni límite de frecuencia, ni firma de la
  partida, ni validación de que la puntuación sea alcanzable. Los `CHECK` de la
  tabla son de forma, no de honestidad.
- **Moderación:** borrar marcas, renombrar jugadores, banear un `device_id`. No
  hay `UPDATE` ni `DELETE` para nadie.
- **Realtime.** El salón se refresca con `revalidatePath`, no solo.
- **Paginación y filtros del salón.** Siguen siendo diez filas por máquina.
- **Perfiles de jugador**, historial propio y pantalla de estadísticas.
- **Migrar las marcas que alguien tenga hoy en `localStorage`.** Dejan de leerse y
  se quedan ahí hasta que el navegador las tire.
- **`use cache`, `cacheComponents` y cualquier estrategia de caché.** Las páginas
  que leen marcas pasan a ser dinámicas y punto.
- **Entorno local con Docker (`supabase start`).** Las migraciones se aplican
  contra el proyecto enlazado.
- **Tests:** el repo no tiene framework y esta spec no lo introduce.
- **Cambios visuales.** Ninguna pantalla cambia de aspecto salvo el aviso nuevo de
  marcador no disponible.

## Modelo de datos

Dos tablas, dos vistas y un cambio pequeño en `localStorage`.

La app **no** saca el título de la máquina de la base de datos. Si el título
viajara en la vista y en `lib/games.ts` a la vez, habría dos sitios diciendo lo
mismo y el de la base de datos se quedaría viejo en cuanto alguien editara el
catálogo. El título sale de `getGame()`. Lo que justifica la tabla `games` es la
clave ajena —una marca no puede apuntar a una máquina que no existe— y que la
base de datos se explique sola en el editor SQL.

### `public.games`

```sql
create table public.games (
  id          text primary key,
  title       text not null,
  cat         text not null,
  playable    boolean not null default true,
  sort_order  smallint not null
);
```

Se siembra desde `lib/games.ts` y nunca al revés. La app no lee sus columnas.

### `public.scores`

```sql
create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id),
  player_name text not null,
  score       integer not null,
  -- `true` sólo en las noventa marcas de la migración de siembra.
  seeded      boolean not null default false,
  -- Quién la guardó. `null` en las semillas. Es lo que pinta `mine`.
  device_id   uuid,
  created_at  timestamptz not null default now(),

  constraint scores_score_range check (score >= 0 and score <= 10000000),
  constraint scores_name_length check (char_length(player_name) between 1 and 12)
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_created_at_idx on public.scores (created_at desc);
```

### RLS

```sql
alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "catalogo publico"  on public.games  for select to anon, authenticated using (true);
create policy "marcador publico"  on public.scores for select to anon, authenticated using (true);
create policy "firmar una marca"  on public.scores for insert to anon, authenticated with check (seeded = false);
```

No hay política de `UPDATE` ni de `DELETE`: sin política, RLS los niega. El
`with check (seeded = false)` impide que nadie se cuele una marca disfrazada de
semilla. La migración de siembra corre como propietaria y no pasa por RLS.

### Las dos vistas

Existen para que el navegador nunca se traiga la tabla entera. Las dos con
`security_invoker = true`, para que la RLS de `scores` siga aplicando.

```sql
-- Top 10 de cada máquina. Devuelve 90 filas por muchas marcas que haya.
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
```

El desempate de `top_scores` es la marca más antigua primero: quien llegó antes a
esa cifra va delante.

### La API nueva

Los tipos que consumen los componentes sobreviven en `lib/scores.ts`; `BoardRow`
gana un campo.

```ts
export interface ScoreEntry {
  name: string;
  score: number;
  /** `dd/mm/aa`, formateado en UTC desde `created_at` para que no haya desfase. */
  date: string;
}

export interface BoardRow extends ScoreEntry {
  /** Del dispositivo que la guardó. `null` en las semillas. */
  deviceId: string | null;
  /** Lo pone el cliente tras montar; el servidor siempre manda `false`. */
  mine: boolean;
}
```

Las consultas viven en `lib/leaderboard.ts`. Todas leen desde el servidor y un
fallo devuelve vacío, nunca lanza.

```ts
export async function board(id: GameId): Promise<BoardRow[]>;
export async function boards(): Promise<Partial<Record<GameId, BoardRow[]>>>;
export async function bests(): Promise<Partial<Record<GameId, number>>>;
export async function recentScores(limit?: number): Promise<RecentScore[]>;
export async function topPlayers(limit?: number): Promise<PlayerRank[]>;
```

`mine` se resuelve donde único se puede: en el cliente, tras montar, comparando
`deviceId` de cada fila con el de `localStorage`. Es el mismo efecto que ya existe
en cinco componentes, pero ahora sólo repinta un color en vez de volver a pedir
los datos.

### Lo que queda en `localStorage`

```ts
export interface VaultData {
  user?: VaultUser | null;
  /** UUID de este navegador. Lo crea `deviceId()` la primera vez. */
  deviceId?: string;
}
```

La clave sigue siendo `arcadevault:v1`. El campo `scores` desaparece del tipo; lo
que hubiera guardado se queda en el navegador sin que nadie lo lea.

## Plan de implementación

Cada paso deja el repo compilando y es commiteable por separado. El reparto entre
`lib/scores.ts` y `lib/leaderboard.ts` existe justamente para eso: si las
consultas `async` reemplazaran a las síncronas en el mismo archivo, sus once
consumidores tendrían que cambiar en el mismo commit.

1. **Migración del esquema.** `supabase/migrations/<sello>_leaderboard_schema.sql`
   con `games`, `scores`, los dos índices, las tres políticas y las dos vistas.
   Aplicar con `npx supabase db push`.
   Verificación: `npx supabase migration list` la marca aplicada y
   `select count(*) from public.scores` devuelve `0`.

2. **Migración de siembra.** `supabase/migrations/<sello>_leaderboard_seed.sql`:
   las nueve filas de `games` copiadas de `lib/games.ts` con su `sort_order`, y
   las noventa marcas de `SEED_ROWS` con `seeded = true`, `device_id null` y el
   `created_at` que sale de su fecha en `DATES`.
   Verificación: `games` tiene 9 filas, `scores` tiene 90, y
   `select * from public.top_scores` devuelve exactamente 90.

3. **Regenerar los tipos.** `npm run supabase:types`.
   Verificación: `lib/supabase/database.types.ts` nombra `games`, `scores`,
   `top_scores` y `player_bests`, y `npx tsc --noEmit` pasa. Nadie los usa
   todavía.

4. **Identificador de dispositivo.** En `lib/storage.ts`, `VaultData` gana
   `deviceId?: string` y aparece la función `deviceId()`, que lo lee o lo crea con
   `crypto.randomUUID()` y lo persiste. `scores` **no** se toca aún: lo que hay
   sigue funcionando.
   Verificación: `npm run build` pasa; llamar dos veces a `deviceId()` devuelve el
   mismo UUID.

5. **Escribir `lib/leaderboard.ts`.** `import "server-only"` y las cinco consultas
   contra el cliente de servidor: `board`, `boards`, `bests`, `recentScores` y
   `topPlayers`. Cada una con su `try/catch` que devuelve vacío y registra el
   error en consola de servidor. Ninguna lanza.
   Verificación: `npm run build` pasa. Nadie lo importa.

6. **Migrar `/salon`.** La página llama `boards()` y baja el `Record` a
   `HallOfFame` por props. `HallOfFame` pierde el `useEffect` que hoy pasa de
   `seedBoard` a `board`, conserva las pestañas como estado de cliente y gana un
   efecto que marca `mine` comparando `deviceId`. Si el `Record` llega vacío, la
   tabla pinta `MARCADOR NO DISPONIBLE`.
   Verificación: `/salon` muestra las diez marcas de cada máquina leídas de la
   base de datos, cambiar de pestaña no dispara ninguna petición, y con la base
   caída la pantalla carga con el aviso.

7. **Migrar `/juego/[id]`.** La página resuelve la tabla con `board(id)` y la
   mejor marca, y las baja a `ScorePanel`. Fuera `seedBest` de la página y
   `board`/`seedBoard` del componente.
   Verificación: `/juego/asteroids` muestra la misma tabla que su pestaña del
   salón, y la cifra de mejor marca coincide con la primera fila.

8. **Migrar `/biblioteca`.** La página llama `bests()` una vez y pasa el mapa por
   `LibraryBrowser` hasta `GameCard`. Buscador y filtros siguen siendo estado de
   cliente.
   Verificación: las nueve tarjetas muestran su mejor marca sin parpadeo al
   hidratar; filtrar y buscar no vuelve a consultar.

9. **Migrar la portada.** `topPlayers()` y `recentScores()` se resuelven en
   `app/(vault)/page.tsx` y bajan a `TopPlayers` y `ActivityFeed`. Los dos bloques
   se esconden cuando la lista llega vacía.
   Verificación: la portada pinta el ranking y la actividad desde la base de
   datos, y con la base caída el resto de la portada se ve intacta.

10. **La Server Action.** `app/jugar/[id]/actions.ts` con
    `saveScore(gameId, name, score, deviceId)`: normaliza el nombre a mayúsculas y
    12 caracteres como hace la sesión, comprueba que el `gameId` existe en `GAMES`
    y que la puntuación es un entero en rango, inserta y llama a `revalidatePath`
    de `/`, `/salon`, `/biblioteca` y la ficha del juego. Devuelve `{ ok: true }` o
    `{ ok: false, error }`.
    Verificación: invocada con datos válidos, la fila aparece en `/salon` sin
    recargar a mano; con un nombre vacío o una puntuación negativa devuelve
    `ok: false` y no inserta nada.

11. **Conectar el gabinete.** `PlayCabinet` sustituye `addScore(...)` por la
    llamada a `saveScore(...)` con el `deviceId()` de este navegador. El botón
    `GUARDAR PUNTUACION` se deshabilita mientras la acción está en vuelo y muestra
    el error si vuelve `ok: false`. Las ocho máquinas simuladas guardan por la
    misma vía.
    Verificación: terminar una partida de `asteroids` y guardar mete la marca en
    `/salon` y en `/juego/asteroids`; `SIMULAR FIN DE PARTIDA` en `/jugar/rocas`
    hace lo mismo.

12. **Limpieza.** De `lib/scores.ts` se borran `SEED_ROWS`, `DATES`, `SEED`,
    `rows`, `dateKey`, `allScores`, `recent`, `ranking` y las funciones públicas
    `board`, `seedBoard`, `best`, `seedBest`, `recentScores`, `seedRecentScores`,
    `topPlayers`, `seedTopPlayers` y `addScore`. De `lib/storage.ts` se borra
    `scores` de `VaultData`. Quedan los tipos y `formatScore()`.
    Verificación: `grep -rn "seedBoard\|seedBest\|addScore\|SEED_ROWS" app components lib`
    no devuelve nada, y `npx tsc --noEmit` pasa.

13. **Probar el degradado a mano.** Renombrar `.env.local` a `.env.local.bak`,
    reiniciar `npm run dev` y recorrer `/`, `/biblioteca`, `/salon`,
    `/juego/asteroids` y `/jugar/asteroids`. Restaurar el archivo.
    Verificación: las cinco cargan, el salón y la ficha muestran el aviso, la
    portada esconde sus dos bloques, y `/jugar/asteroids` se juega igual aunque
    guardar falle.

14. **Documentar en `CLAUDE.md`.** Apartado corto: qué vive en la base de datos y
    qué sigue en `lib/games.ts`, que `lib/leaderboard.ts` es sólo de servidor y
    `lib/scores.ts` isomorfo, que las marcas se guardan con la Server Action, y
    que las migraciones se aplican con `npx supabase db push`.
    Verificación: el apartado existe y nombra `lib/leaderboard.ts`,
    `app/jugar/[id]/actions.ts` y las dos tablas.

## Criterios de aceptación

**Esquema y migraciones**

- [ ] `supabase/migrations/` contiene dos archivos nuevos, esquema y siembra, y
      `npx supabase migration list` los marca aplicados.
- [ ] `public.games` tiene 9 filas y sus `id` son exactamente los nueve de `GAMES`.
- [ ] `public.scores` arranca con 90 filas, todas con `seeded = true` y
      `device_id null`.
- [ ] `select * from public.top_scores` devuelve 90 filas: diez por máquina.
- [ ] `insert into public.scores (game_id, ...) values ('inexistente', ...)` falla
      por la clave ajena.
- [ ] `insert` con `score = -1`, con `score = 20000000` o con `player_name = ''`
      falla por `CHECK`.
- [ ] `lib/supabase/database.types.ts` nombra `games`, `scores`, `top_scores` y
      `player_bests`.

**RLS**

- [ ] Con la clave publicable, un `select` sobre `games` y sobre `scores` devuelve
      filas.
- [ ] Con la clave publicable, un `insert` en `scores` con `seeded` sin
      especificar tiene éxito.
- [ ] Con la clave publicable, un `insert` con `seeded = true` es rechazado por la
      política.
- [ ] Con la clave publicable, `update` y `delete` sobre `scores` no afectan a
      ninguna fila.
- [ ] Con la clave publicable, un `insert` en `games` es rechazado.

**Lectura**

- [ ] `/salon` muestra diez marcas por máquina, y coinciden con lo que devuelve
      `select * from public.top_scores` para esa máquina.
- [ ] Cambiar de pestaña en `/salon` no dispara ninguna petición de red.
- [ ] La tabla de `/juego/asteroids` es idéntica a la pestaña `ASTEROIDS` del
      salón.
- [ ] La mejor marca de cada tarjeta de `/biblioteca` es la primera fila de la
      tabla de esa máquina.
- [ ] Las tarjetas de `/biblioteca` pintan su cifra ya en el HTML del servidor: no
      hay parpadeo de valor al hidratar.
- [ ] La portada pinta ranking y actividad reciente desde la base de datos.
- [ ] `grep -rn "leaderboard" components` no devuelve nada: ningún componente
      consulta por su cuenta.

**Escritura**

- [ ] Terminar una partida de `asteroids` y pulsar `GUARDAR PUNTUACION` inserta
      una fila con `seeded = false` y el `device_id` de este navegador.
- [ ] Esa marca aparece en `/salon` y en `/juego/asteroids` sin recargar la página
      a mano.
- [ ] `SIMULAR FIN DE PARTIDA` en `/jugar/rocas` guarda por la misma vía.
- [ ] Un nombre en minúsculas se guarda en mayúsculas y recortado a 12 caracteres.
- [ ] `saveScore` con un `gameId` que no está en `GAMES` devuelve `ok: false` y no
      inserta.
- [ ] `saveScore` con una puntuación negativa, no entera o fuera de rango devuelve
      `ok: false` y no inserta.
- [ ] Mientras la acción está en vuelo el botón está deshabilitado; no se puede
      guardar dos veces la misma marca con dos pulsaciones seguidas.

**Marcas propias**

- [ ] Una marca guardada por este navegador se pinta como propia en `/salon` y en
      la ficha de su máquina.
- [ ] Recargar la página la sigue pintando como propia.
- [ ] Abrir el sitio en una ventana privada muestra esa misma marca sin marcar
      como propia.
- [ ] `localStorage` guarda un `deviceId` bajo `arcadevault:v1` y no cambia entre
      recargas.
- [ ] El usuario guardado antes de esta spec sigue en sesión: `arcadevault:v1`
      conserva su `user`.

**Estado degradado**

- [ ] Sin `.env.local`, `/`, `/biblioteca`, `/salon`, `/juego/asteroids` y
      `/jugar/asteroids` responden 200.
- [ ] Sin `.env.local`, `/salon` y la ficha muestran `MARCADOR NO DISPONIBLE` en
      lugar de la tabla.
- [ ] Sin `.env.local`, la portada oculta el ranking y la actividad, y el resto de
      la pantalla se ve igual.
- [ ] Sin `.env.local`, `/jugar/asteroids` se juega con normalidad y guardar
      devuelve un error visible en vez de romper la pantalla.
- [ ] Ninguna consulta de `lib/leaderboard.ts` propaga una excepción: el servidor
      no vuelca ningún error sin capturar.

**Nada más se ha movido**

- [ ] `npm run build` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npm run lint` no añade avisos nuevos.
- [ ] `lib/games.ts` no tiene ni una línea modificada.
- [ ] `lib/games/`, `components/game-canvas.tsx` y `lib/preview-art.ts` no tienen
      ni una línea modificada: el motor de Asteroids se juega igual.
- [ ] `lib/supabase/env.ts`, `client.ts` y `server.ts` no cambian, y
      `/api/supabase-health` sigue respondiendo 200.
- [ ] `grep -rn "NEXT_PUBLIC_SUPABASE\|SUPABASE_SECRET_KEY" app lib` sólo
      encuentra coincidencias en `lib/supabase/env.ts`.
- [ ] No existe `proxy.ts` en el repo.
- [ ] Ninguna pantalla cambia de aspecto salvo el aviso de marcador no disponible.

**Documentación**

- [ ] `CLAUDE.md` tiene un apartado que nombra `lib/leaderboard.ts`,
      `lib/scores.ts`, `app/jugar/[id]/actions.ts` y las tablas `games` y `scores`.
- [ ] Ese apartado dice que `lib/games.ts` sigue siendo la fuente de verdad del
      catálogo.

## Decisiones tomadas y descartadas

**Reparto del trabajo**

- **Sí:** dos tablas y la migración de todas las lecturas en una sola spec. Es un
  cambio de origen de datos: dejar la mitad de las pantallas leyendo
  `localStorage` y la otra mitad la base de datos es peor que cualquiera de los
  dos extremos.
- **No:** mover el catálogo a la base de datos. Se consideró y se descartó con los
  números delante: `GAMES` se consume en tiempo de módulo en `lib/landing.ts`,
  `components/site-footer.tsx` y `components/library-browser.tsx`;
  `generateStaticParams` pasaría a necesitar credenciales para construir; y con el
  proyecto pausado se caería el sitio entero en vez de sólo el marcador. Encima
  entrega la promesa a medias, porque `lib/preview-art.ts` y
  `lib/games/engines.ts` seguirían indexados por id en código.
- **No:** autenticación. Sin login el marcador es falsificable, y se acepta. Meter
  Auth aquí serían tres specs disfrazadas de una.

**Esquema**

- **Sí:** `games` como tabla real aunque la app no lea sus columnas. La clave ajena
  impide que una marca apunte a una máquina inexistente, y la tabla hace que la
  base de datos se explique sola en el editor SQL.
- **No:** que el título de la máquina viaje en la vista y se pinte desde ahí. Era
  la idea inicial y se cayó al escribir el esquema: el título estaría en
  `lib/games.ts` y en la base de datos a la vez, y el segundo se quedaría viejo.
- **No:** réplica completa del catálogo en `games`, con `desc`, `long`, `controls`
  y `glow`. Lo que se duplica se desincroniza; se copian sólo las cinco columnas
  que describen la máquina de un vistazo.
- **Sí:** `game_id` es `text` y no un entero. El id ya es un texto estable en las
  URLs (`/juego/asteroids`); traducirlo a un número obligaría a un `join` para
  cualquier consulta a mano.
- **Sí:** columna `seeded`. Distingue las noventa marcas inventadas de las reales
  sin mirar el `device_id`, y es lo que la política de `INSERT` usa para que nadie
  se cuele una semilla falsa.
- **Sí:** `created_at timestamptz` en vez del texto `dd/mm/aa` de hoy. La fecha se
  formatea al pintar, en UTC, para que servidor y cliente no discrepen.
- **Sí:** dos vistas, `top_scores` y `player_bests`. Sin ellas, pintar el salón
  significa traerse la tabla entera y recortarla en JavaScript, que funciona con
  noventa filas y deja de funcionar mucho antes de lo que parece.
- **Sí:** `security_invoker = true` en las dos vistas. Por defecto una vista corre
  como su propietaria y se salta la RLS de la tabla de debajo; hoy daría igual
  porque el `select` es público, pero el día que deje de serlo el agujero ya
  estaría abierto.
- **Sí:** desempate por `created_at` ascendente. Ante la misma cifra va delante
  quien llegó antes.

**RLS y confianza**

- **Sí:** `select` público en las dos tablas. Un marcador que no se puede leer sin
  sesión no es un marcador.
- **Sí:** `insert` anónimo en `scores`, y sólo ahí. Es la única escritura que
  existe y no hay usuarios que la firmen.
- **Sí:** nada de `update` ni `delete`, ni siquiera para el dispositivo que guardó
  la marca. Una marca es un hecho; corregirla es moderación y la moderación
  necesita identidad.
- **Sí:** `CHECK` de rango y de longitud. No impiden hacer trampas, impiden que una
  fila rompa la tabla al pintarla.
- **No:** límite de frecuencia por `device_id`. El `device_id` lo pone el cliente y
  se puede inventar en cada petición, así que el límite frenaría al curioso y no
  al que quiera ensuciar el marcador. Cuando haya sesión real, el límite va sobre
  el usuario.
- **Sí:** el techo de `10000000` puntos. Es un absurdo alcanzable por nadie que
  deja fuera el `999999999999` de la consola.

**Lectura**

- **Sí:** todas las consultas en el servidor y las filas por props. Los datos ya no
  son locales; ocultárselos al servidor era la única razón del patrón actual.
- **Sí:** se van `seedBoard`, `seedBest`, `seedRecentScores` y `seedTopPlayers`.
  Existían para pintar algo sin `localStorage`; ahora el servidor pinta el dato de
  verdad.
- **Sí:** `lib/leaderboard.ts` separado de `lib/scores.ts`, con `server-only`. Un
  componente de cliente que importe las consultas rompe al construir en vez de
  arrastrar el cliente de servidor al navegador.
- **Sí:** el salón pide las nueve tablas de una vez. Son 90 filas; una consulta por
  pestaña serían nueve viajes para enseñar lo mismo.
- **No:** `use cache` ni `cacheComponents`. Las pantallas pasan a ser dinámicas. La
  caché es una decisión con su propia spec y `next.config.ts` sigue vacío a
  propósito.
- **No:** Realtime en el salón. Suma una conexión abierta por visita para un
  marcador que cambia cada varios minutos.

**Escritura**

- **Sí:** Server Action en vez de `insert` desde el navegador. Es donde vive la
  normalización del nombre y la comprobación del `gameId`, y es el sitio natural
  del `revalidatePath`.
- **Sí:** `revalidatePath` de las cuatro rutas que pintan marcas. Guardar y no ver
  tu marca en el salón parece que no se guardó.
- **Sí:** `SIMULAR FIN DE PARTIDA` sigue guardando en las ocho máquinas sin motor.
  El vault es una demo, las noventa semillas también son inventadas y quitar el
  botón habría dejado ocho máquinas sin forma de probar el circuito completo.
- **Sí:** el botón se deshabilita mientras la acción está en vuelo. Sin eso, dos
  pulsaciones nerviosas son dos filas idénticas en un marcador compartido.

**Identidad y `localStorage`**

- **Sí:** `device_id` en la fila para conservar el `mine`. El resalte de tus marcas
  existe en cinco componentes y quitarlo era rediseñar, no simplificar.
- **Sí:** `mine` se resuelve en el cliente tras montar. El servidor no puede leer
  `localStorage`, así que manda `false` y el navegador repinta un color.
- **No:** cookie con el `device_id` para que el servidor pudiera marcarlas. Se gana
  una pintada y se pierde: la cookie viaja en cada petición y convierte en dinámico
  lo que ya lo es, sin ganar nada visible.
- **Sí:** la clave sigue siendo `arcadevault:v1`. Estrenar `v2` habría cerrado la
  sesión a todo el mundo para tirar un campo que nadie va a leer.
- **No:** migrar las marcas locales a la base de datos al primer arranque. Son
  puntuaciones de prueba de un vault sin usuarios, y la migración habría que
  escribirla, probarla y mantenerla para un caso que no le importa a nadie.

**Migraciones**

- **Sí:** archivos en `supabase/migrations/` aplicados con `db push`. Quedan en git
  y el esquema se reproduce en otro proyecto.
- **No:** `apply_migration` por MCP. Va directo al proyecto remoto y no deja rastro
  en el repo: el esquema existiría sin que el código lo cuente.
- **Sí:** esquema y siembra en migraciones separadas. Un proyecto nuevo puede
  querer las tablas sin las noventa marcas inventadas.

**Comportamiento sin base de datos**

- **Sí:** las consultas devuelven vacío y las pantallas avisan. Esto contradice el
  «sin credenciales se falla, no se finge» de SPEC 04, y es a propósito: allí el
  único consumidor era una ruta de diagnóstico, aquí son cinco pantallas de las
  que sólo una parte depende del marcador.
- **No:** inventar marcas cuando la base no responde. Esa es la línea que no se
  cruza: vacío con aviso es honesto, semillas de repuesto serían el cliente falso
  que SPEC 04 rechazó.
- **Sí:** guardar falla con un error visible en vez de en silencio. Una marca que
  se traga la red es peor que una que avisa.

## Riesgos

| Riesgo                                                                                                                                                                     | Mitigación                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crypto.randomUUID()` sólo existe en contexto seguro. Probando desde el móvil por `http://192.168.x.x` lanza, y con él se cae el guardado entero.                          | `deviceId()` lo envuelve en `try/catch` y devuelve `undefined` si no está disponible. La marca se guarda igual, sin dueño: se ve en el salón pero no resaltada. Se pierde un color, no una puntuación.            |
| El proyecto es de plan gratuito y se pausa por inactividad. El salón aparece vacío y parece un fallo del código.                                                           | El aviso `MARCADOR NO DISPONIBLE` distingue vacío de roto, y `/api/supabase-health` de SPEC 04 dice cuál de los dos es sin salir del navegador.                                                                   |
| El marcador es compartido, anónimo y falsificable: cualquiera puede insertar cifras absurdas o nombres ofensivos, y la app no tiene forma de borrarlos.                    | Aceptado y acotado: `CHECK` de rango y longitud, y sin `update` ni `delete` para nadie. Borrar se hace por SQL desde el panel de Supabase. La moderación de verdad necesita identidad y va con la spec del login. |
| Añadir una máquina a `lib/games.ts` sin añadir su fila a `games` deja una máquina que se ve, se juega y revienta al guardar la primera marca por la clave ajena.           | La Server Action valida el `gameId` contra `GAMES` antes de insertar, así que el fallo es un error legible y no un 500. `CLAUDE.md` dirá que una máquina nueva son dos sitios: el catálogo y una migración.       |
| Las cinco pantallas pasan a ser dinámicas: cada visita a la portada o a la biblioteca es una consulta a Supabase.                                                          | Son consultas a vistas acotadas y con índice: 90 filas el salón, 5 el ranking, 7 la actividad. Si el coste aparece, la respuesta es caché, y la caché es una spec con su propia decisión sobre `cacheComponents`. |
| El `device_id` viaja al navegador en cada fila, así que se pueden agrupar todas las marcas de un mismo dispositivo.                                                        | Es un UUID aleatorio sin relación con nada más: agruparlas no dice quién es. Se acepta. Si algún día molesta, la vista deja de exponerlo y `mine` se resuelve con una cookie.                                     |
| Olvidar `security_invoker = true` en una vista la deja corriendo como su propietaria, saltándose la RLS de `scores`.                                                       | Va escrito en el `create view` de la migración y hay un criterio de aceptación que comprueba que `update` y `delete` con la clave publicable no afectan a ninguna fila.                                           |
| Dos pulsaciones seguidas de `GUARDAR PUNTUACION`, o guardar y recargar, meten la misma marca dos veces. No hay restricción de unicidad que lo impida.                      | El botón se deshabilita mientras la acción está en vuelo. No se añade índice único a propósito: dos partidas distintas con la misma cifra son legítimas y una restricción rechazaría la segunda.                  |
| `revalidatePath("/juego/[id]")` con la ruta dinámica mal escrita revalida otra cosa, o nada, y la marca recién guardada no aparece hasta la siguiente navegación completa. | Se revalida la ruta concreta del juego que se acaba de jugar, y hay un criterio de aceptación que exige ver la marca en `/salon` y en la ficha sin recargar a mano.                                               |

## Lo que **no** entra en esta spec

- Autenticación real. La sesión sigue siendo un nombre en `localStorage`.
- El catálogo en la base de datos. `lib/games.ts` manda.
- Antitrampas, límite de frecuencia y validación de que la puntuación sea
  alcanzable.
- Moderación: borrar marcas, renombrar jugadores, banear un dispositivo.
- Realtime, paginación y filtros del salón.
- Perfiles de jugador e historial propio.
- Caché: `use cache`, `cacheComponents` y cualquier revalidación que no sea
  `revalidatePath`.
- Entorno local con Docker y datos de siembra locales.
- Migrar a la base de datos las marcas que alguien tenga hoy en `localStorage`.
- Tests.

Cada una de esas, si llega, va en su propia spec.
