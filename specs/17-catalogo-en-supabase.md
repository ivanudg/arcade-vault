# SPEC 17 — El catálogo se muda a Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-08-16
> **Objetivo:** Que `public.games` pase a ser la fuente de verdad de los siete campos del catálogo, para poder editar y retirar máquinas desde el panel de Supabase sin desplegar.

## Por qué existe esta spec

El catálogo está escrito dos veces. `lib/games.ts` tiene las cinco máquinas con sus siete
campos, y `public.games` tiene una copia reducida de cinco columnas que existe sólo para
que `scores.game_id` tenga una clave ajena real. La regla que lo gobierna está en
CLAUDE.md y es tajante: «el catálogo sigue mandándolo `lib/games.ts`: `games` se siembra
desde él y nunca al revés, y la app no lee sus columnas».

Esa regla tenía sentido cuando la tabla era un apéndice de la clave ajena. Hoy cuesta dos
cosas. La primera es que añadir una máquina obliga a escribir su ficha en dos sitios y a
confiar en que no se separen; la migración de Frogger dedica ocho líneas de comentario a
explicar que la fila no cambia nada y que sólo evita que reviente el `insert` de la
primera marca. La segunda es peor: **cambiar una coma de una descripción obliga a
desplegar**. El texto editorial ya salió de la maquetación en su día —de ahí `lib/landing.ts`
y `lib/about.ts`—, pero sigue dentro del repo, y una errata en la línea de una tarjeta
necesita un commit, un build y un despliegue.

Esta spec invierte la dirección. `public.games` gana las cuatro columnas que le faltan y
pasa a mandar; `lib/games.ts` se queda con lo que de verdad es código.

Porque hay una frontera que **no** se mueve, y conviene decirla antes que nada. Tres cosas
de una máquina no caben en una fila:

- **El motor.** `ENGINES` mapea `GameId` a módulos TypeScript. Un `import()` no sale de
  una columna.
- **El mando.** `ENGINE_KEYS` y `ENGINE_PAD`, en `components/game-pad.tsx`, dicen qué
  teclas usa cada máquina y cuál cae bajo qué pulgar.
- **La miniatura.** `lib/preview-art.ts` es un `switch` que dibuja en canvas y acaba en
  `id satisfies never`.

Por eso `GameId` sigue siendo una unión cerrada de literales, y por eso esta spec logra
que **editar** una máquina no necesite desplegar, pero **añadir** una siga necesitándolo.
No es una limitación que se arrastre por pereza: es la consecuencia honesta de que un
juego es código.

## Alcance

**Dentro:**

- Migración que añade cuatro columnas a `public.games` —`glow`, `tagline`, `blurb` y
  `controls`— y las puebla con los valores que hoy tiene `lib/games.ts`.
- Tres `check` en esa tabla: `cat` contra los seis valores de `GameCategory`, `glow`
  contra los tres hex de `GameGlow`, y `title` contra mayúsculas ASCII, porque Press Start
  2P no tiene glifos acentuados.
- La clave ajena `scores_game_id_fkey` pasa a `on delete cascade`.
- `lib/catalog.ts`, módulo nuevo con `import "server-only"`, calcado de
  `lib/leaderboard.ts`: expone `catalog()` y `game(id)`, ninguna lanza, y las dos van
  envueltas en `cache()` de React.
- `lib/games.ts` pierde `GAMES` y `getGame()`, y gana `GAME_IDS: readonly GameId[]`. Los
  cuatro tipos y `tint()` / `glow()` / `noGlow()` se quedan donde están.
- Las siete rutas de servidor que resolvían el catálogo pasan a consultarlo y a bajarlo
  por props.
- Los cinco componentes de cliente que hoy importan `GAMES` o `getGame` dejan de hacerlo.
- `components/catalog-empty.tsx` y `components/catalog-unavailable.tsx`, los dos avisos
  del catálogo.
- `playable = false` estrena significado: retira una máquina de la biblioteca, de la
  portada y de sus dos rutas, conservando su pestaña en el salón.
- `references/implemented-games.md` reescrito y CLAUDE.md actualizado.

**Fuera de alcance (para specs futuras):**

- **Panel de administración propio.** Editar se hace en el panel de Supabase, que ya
  existe, ya tiene autenticación y ya tiene historial. Una pantalla de administración
  dentro del vault es otra spec, con su autorización y sus formularios.
- **Dar de alta una máquina sin desplegar.** Exigiría cargar motores por nombre y mover el
  mando y la miniatura a datos. Es un cambio de otro tamaño.
- **Mover `lib/preview-art.ts` a la base de datos.** La miniatura es una función de
  dibujo, no un dato.
- **Mover `ENGINE_KEYS` y `ENGINE_PAD`.** Qué tecla hace qué es del motor; cuál cae bajo
  qué pulgar es de interfaz. Ninguna de las dos es del catálogo.
- **Caché.** Ni `use cache` ni `cacheComponents` ni `revalidateTag`. Ver «Decisiones».
- **Traducciones del texto editorial.** Una columna por idioma es otra spec.
- **Editar las pieles desde la base de datos.** Los `skins.ts` son de `skin-designer` y
  siguen siendo código.
- **Reordenar máquinas desde el panel** más allá de cambiar `sort_order` a mano.

## Modelo de datos

### La tabla crece de cinco columnas a nueve

```sql
create table public.games (
  id          text primary key,
  title       text not null,      -- gana un check de mayusculas ASCII
  cat         text not null,      -- gana un check de los seis valores
  playable    boolean not null default true,
  sort_order  smallint not null,
  glow        text not null,      -- nueva: check de los tres hex
  tagline     text not null,      -- nueva: es `Game.desc`
  blurb       text not null,      -- nueva: es `Game.long`
  controls    text not null       -- nueva
);
```

Dos de los nombres no coinciden con el campo de TypeScript, y es a propósito. **`desc` es
palabra reservada en PostgreSQL**: usarla obligaría a entrecomillarla en cada consulta, y
una escrita a pelo en el editor SQL fallaría con un mensaje opaco. `long` no es reservada,
pero al lado de `tagline` no dice nada. Así que la tabla usa `tagline` y `blurb`, y
`lib/catalog.ts` los traduce al leer la fila —exactamente como `toBoardRow()` ya traduce
`player_name` a `name` en `lib/leaderboard.ts`—. Ningún `.tsx` se entera del renombrado.

| Columna      | Campo de `Game` | Estado                            |
| ------------ | --------------- | --------------------------------- |
| `id`         | `id`            | Ya existe                         |
| `title`      | `title`         | Ya existe. Gana `check`           |
| `cat`        | `cat`           | Ya existe. Gana `check`           |
| `playable`   | `playable`      | Ya existe. Estrena significado    |
| `sort_order` | —               | Ya existe. Pasa a mandar el orden |
| `glow`       | `glow`          | Nueva                             |
| `tagline`    | `desc`          | Nueva                             |
| `blurb`      | `long`          | Nueva                             |
| `controls`   | `controls`      | Nueva                             |

### Los tres `check`

```sql
alter table public.games
  add constraint games_cat_valida  check (cat in ('ARCADE','CLASICOS','DISPAROS','REFLEJOS','PUZZLE','LABERINTO')),
  add constraint games_glow_valido check (glow in ('#00f5ff','#ff006e','#f5ff00')),
  add constraint games_title_ascii check (title ~ '^[A-Z0-9 ]{1,20}$');
```

Los dos primeros replican `GameCategory` y `GameGlow`. El tercero convierte en restricción
real una regla que CLAUDE.md lleva escrita desde SPEC 01 y que hasta hoy sólo vigilaba la
disciplina de quien escribía el archivo: lo que se pinta en Press Start 2P va en
mayúsculas y sin tildes, porque la fuente no tiene glifos acentuados y el navegador los
sustituye por otra que al lado de un avance de 20px sale como una mota. Escribir
`GALAGÁ` en el panel se rechaza.

### La clave ajena pasa a `cascade`

```sql
alter table public.scores drop constraint scores_game_id_fkey;
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id) on delete cascade;
```

Borrar una máquina se lleva sus marcas. Es una decisión tomada a sabiendas de que va en
dirección contraria a `scores.user_id`, que es `on delete set null` justamente para no
perder puntuaciones; ver «Riesgos». La vía normal de retirada no es borrar, es
`playable = false`.

### Los tipos de TypeScript no cambian

`Game`, `GameId`, `GameCategory` y `GameGlow` se quedan exactamente como están. Lo que
cambia es de dónde salen los valores, no qué forma tienen. `lib/supabase/database.types.ts`
se regenera con `npm run supabase:types`.

### Lo que queda en `lib/games.ts`

```ts
export type GameId = "asteroids" | "tetris" | "arkanoid" | "snake" | "frogger";

/**
 * Los ids que existen, sin sus datos. Es la lista blanca de rutas y la que
 * consultan los sitios que sólo necesitan saber si un id existe y no pueden
 * esperar a una consulta.
 */
export const GAME_IDS: readonly GameId[] = ["asteroids", "tetris", "arkanoid", "snake", "frogger"];
```

Más los cuatro tipos y `tint()`, `glow()` y `noGlow()`, que importan los cinco motores.
`GAMES` y `getGame()` desaparecen.

`GAME_IDS` no es una copia disimulada del catálogo: no tiene ni un dato editable. Existe
porque hay tres sitios que necesitan saber si un id existe **sin** poder consultar:
`generateStaticParams()` de las dos rutas por máquina, que corre en build; el `IDS` de
`lib/leaderboard.ts`, que descarta `game_id` de máquinas que ya no están; y
`components/site-footer.tsx`, que es de cliente y deduce su remate de `usePathname()`.

### `lib/catalog.ts`

```ts
import "server-only";
import { cache } from "react";

/** Todas las máquinas, ordenadas por `sort_order`. `null` si no se pudo preguntar. */
export const catalog: () => Promise<Game[] | null>;

/** Una máquina. `null` si no se pudo preguntar; `undefined` si no existe. */
export const game: (id: string) => Promise<Game | null | undefined>;
```

Copia la estructura de `lib/leaderboard.ts` entera: su `safely()`, su regla de que
ninguna función lanza, y el relanzado de las excepciones de control de flujo de Next que
se reconocen por su `digest`. Ese último detalle no es opcional aquí: un `notFound()`
lanzado dentro de una página que envuelve su consulta acabaría tragado, y la ruta
serviría un aviso de catálogo caído en lugar de un 404.

La distinción de `game()` es la que ya lleva escrita el marcador, con un valor más:
`null` es «no se pudo preguntar», `undefined` es «se preguntó y no está».

Las dos van envueltas en `cache()` de React. `/jugar/[id]` resuelve la máquina **tres
veces** por petición —el layout para `PlayHeader`, `generateMetadata` para el título y la
página para el gabinete— y `/juego/[id]` dos. Sin deduplicar, esta spec triplicaría las
consultas de la pantalla de juego.

### Los tres estados, otra vez

Es la misma tabla que el marcador tiene desde SPEC 07, aplicada al catálogo:

| Lo que llega | Qué se ve                                       |
| ------------ | ----------------------------------------------- |
| `null`       | `CatalogUnavailable` — `CATALOGO NO DISPONIBLE` |
| `[]`         | `CatalogEmpty` — `EL VAULT ESTA VACIO`          |
| Filas        | La rejilla                                      |

Dos componentes y no uno con una prop de texto, por la misma razón que el aviso del
marcador lleva escrita en su propio archivo: un aviso que dice dos cosas distintas según
dónde salga es peor que no decir nada.

### Qué significa `playable = false`

El campo existe desde SPEC 01 y su comentario dice «`false` en una máquina en
mantenimiento. Hoy no hay ninguna». Nunca lo ha usado nadie. Esta spec le da significado,
y es el mecanismo de retirada sin desplegar:

| Pantalla      | Con `playable = false`   |
| ------------- | ------------------------ |
| `/biblioteca` | No aparece               |
| Portada       | No aparece               |
| `/juego/[id]` | 404                      |
| `/jugar/[id]` | 404                      |
| `/salon`      | **Conserva su pestaña**  |
| Server Action | Rechaza guardar la marca |

El salón es la excepción, y es deliberada: las marcas ya firmadas siguen siendo verdad, y
esconderlas al retirar la máquina sería reescribir la historia del marcador. Como la ficha
también responde 404, `HallOfFame` deja de enlazar a `/juego/[id]` en las máquinas
retiradas: hoy lo hace (`playHref = game?.playable ? ... : /juego/${tab}`) y esa rama
acabaría en un 404.

## Plan de implementación

Cada paso deja el repo con `npx tsc --noEmit`, `npm run lint` y `npm run build` en verde,
y es commiteable por separado.

1. **La migración.** Las cuatro columnas se añaden nullable, se pueblan con un `update`
   por máquina con los valores exactos de `lib/games.ts`, y sólo entonces pasan a
   `set not null` —el orden importa: `add column ... not null` sobre una tabla con cinco
   filas y sin `default` falla—. Después los tres `check` y la clave ajena en `cascade`.
   `npx supabase db push` y `npm run supabase:types`. **Sin tocar código**: el repo
   funciona exactamente igual, porque todavía no lee esas columnas.
2. **`lib/catalog.ts`.** El módulo entero, con `catalog()`, `game()`, el mapeo de
   `tagline` y `blurb`, y el descarte de filas cuyo `id` no esté en `GAME_IDS`. Todavía no
   lo importa nadie.
3. **`GAME_IDS` entra en `lib/games.ts`** y `lib/leaderboard.ts` cambia su `IDS` para
   usarlo. `GAMES` y `getGame()` siguen ahí. Paso mecánico.
4. **Los dos avisos**: `components/catalog-empty.tsx` y
   `components/catalog-unavailable.tsx`, hermanos de los dos del marcador y con su misma
   forma —el vacío sin alarma ni movimiento, el caído en magenta pulsante—.
5. **`/biblioteca`.** La página consulta `catalog()`, resuelve los tres estados y baja
   `games` a `LibraryBrowser`, que deja de importar `GAMES` y de derivar `CATEGORIES` por
   su cuenta.
6. **La portada.** `GAMES.slice(0, 6)` pasa a ser las seis primeras jugables del catálogo.
   Su sección de máquinas colapsa `null` y `[]`, como ya hace con la de actividad.
   `ActivityFeed` y `TopPlayers` reciben el catálogo por props.
7. **`/salon`.** `boards()` y `catalog()` en la misma página. La pestaña por defecto pasa
   a ser la primera por `sort_order` en vez del `"asteroids"` escrito a mano, y
   `HallOfFame` recibe `games` y deja de enlazar la ficha de una retirada.
8. **`/juego/[id]`.** `generateStaticParams()` pasa a `GAME_IDS`; la página y
   `generateMetadata` pasan a `game(id)`. `undefined` o `playable = false` es `notFound()`;
   `null` es el aviso.
9. **`/jugar/[id]`.** Las tres piezas —layout, `generateMetadata` y página— pasan a
   `game(id)`, y la ruta gana `dynamic = "force-dynamic"`, que hoy no tiene. La Server
   Action de `actions.ts` comprueba contra la base de datos que la máquina existe y es
   jugable, en vez de contra `getGame()`.
10. **`components/site-footer.tsx`** pasa a `GAME_IDS`, que es lo único que necesita.
11. **`GAMES` y `getGame()` se borran** de `lib/games.ts`. Si algo se hubiera quedado
    atrás, `tsc` lo dice aquí y no en producción.
12. **Documentación.** `references/implemented-games.md` reescrito apuntando a
    `public.games`, y CLAUDE.md al día: los «cuatro sitios que toca una máquina nueva»
    cambian de forma, la sección «El marcador» deja de poder decir que la app no lee las
    columnas de `games`, y la regla de que el catálogo lo manda `lib/games.ts` se invierte.

## Criterios de aceptación

- [ ] Cambiar `tagline` de una fila en el panel de Supabase y recargar `/biblioteca`
      muestra el texto nuevo, sin desplegar ni reiniciar el servidor.
- [ ] Cambiar `glow` de una fila cambia el color de su tarjeta y el de su ficha.
- [ ] `update public.games set playable = false where id = 'frogger'` la saca de
      `/biblioteca` y de la portada, y `/juego/frogger` y `/jugar/frogger` responden 404.
- [ ] Con `frogger` en `playable = false`, su pestaña sigue en `/salon` y su tabla se ve.
- [ ] Con `frogger` en `playable = false`, la Server Action rechaza guardar una marca suya.
- [ ] `insert` con `cat = 'INVENTADA'` lo rechaza la base de datos.
- [ ] `insert` con `glow = '#123456'` lo rechaza la base de datos.
- [ ] `update` de `title` a `GALAGÁ` lo rechaza la base de datos.
- [ ] `insert` de una fila con `id = 'pong'` no rompe nada: no aparece en el catálogo y
      queda un aviso en la consola del servidor.
- [ ] Con las variables de Supabase borradas de `.env.local`, `/biblioteca` enseña
      `CATALOGO NO DISPONIBLE`, y `npm run build` sigue pasando.
- [ ] Con `public.games` vacía, `/biblioteca` enseña `EL VAULT ESTA VACIO` y no el aviso
      de avería.
- [ ] Sin `?juego=`, `/salon` abre en la máquina de menor `sort_order`, sea cual sea.
- [ ] `grep -rn "\bGAMES\b\|getGame" app components lib` no devuelve ninguna coincidencia.
- [ ] Una visita a `/jugar/asteroids` hace **una** consulta a `games`, no tres.
- [ ] Las cinco máquinas se juegan igual que antes: `lib/games/` no tiene ni una línea de
      diferencia en `git diff`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `GameId` sigue siendo una unión cerrada de literales. El motor, el mando y la
  miniatura son código, y abrirlo a `string` obligaría a cambiar el `id satisfies never`
  de `drawPreview()` por una guarda en tiempo de ejecución, a renunciar a
  `dynamicParams = false` y a que `ENGINES` dejara de ser exhaustivo por tipo. Sería el
  cambio más grande del repo desde SPEC 07 y no hace falta para editar sin desplegar.
- **No:** generar `GameId` desde la base de datos con un script. Seguiría exigiendo
  regenerar y desplegar para añadir una máquina —que es justo lo que ya pasa— y a cambio
  metería un paso más en el flujo.
- **Sí:** los siete campos se mudan. Dejar `cat` y `glow` en código habría partido la ficha
  de una máquina en dos sitios otra vez, que es el problema que esta spec viene a quitar.
- **Sí:** `null` es «no se pudo preguntar» y se avisa. Es la regla que `lib/leaderboard.ts`
  lleva desde SPEC 06 y no hay motivo para que el catálogo tenga otra.
- **No:** dejar `lib/games.ts` como red de seguridad con los datos de fábrica. Un fallback
  conserva la duplicación entera y añade algo peor: dos catálogos que pueden discrepar sin
  que nadie se entere, porque el respaldo sólo se ve cuando algo ya ha fallado.
- **Sí:** frescura inmediata, sin caché. Editar en el panel y no ver el cambio al recargar
  desconcierta y es difícil de depurar.
- **No:** `use cache`. Y no es una preferencia, es que **no cabe**:
  `lib/supabase/server.ts` hace `await cookies()`, y una función marcada `'use cache'` que
  lo invoque directa o indirectamente falla con `next-request-in-use-cache`
  (`node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`).
  Además, activar `cacheComponents` elimina `dynamic`, `dynamicParams`, `revalidate` y
  `fetchCache`, que este repo usa en seis sitios. Es su propia spec.
- **Sí:** `cache()` de React para deduplicar dentro de la petición. Es lo contrario de lo
  anterior: no cachea entre visitas, sólo evita que la misma consulta se repita tres veces
  en el mismo render.
- **Sí:** la base de datos manda qué se ve. Una fila con un `id` que no está en `GAME_IDS`
  se ignora con un aviso en la consola; un `GameId` sin fila desaparece del catálogo y su
  ruta responde 404 aunque su motor exista. Es el mismo criterio que `asGameId()`.
- **Sí:** `playable = false` es la retirada. El campo ya existía sin usar y significa
  exactamente esto.
- **Sí:** `check` en la tabla. La validación tiene que estar donde se escribe el dato, que
  desde esta spec es el panel de Supabase y no el editor.
- **No:** validar sólo al leer. El error aparecería al recargar el sitio y no al guardar,
  que es cuando se puede corregir.
- **Sí:** `lib/catalog.ts` con `server-only`, separado de `lib/games.ts`. Meterlo dentro
  habría roto los cinco motores y los cuatro componentes de cliente que importan de ahí
  `tint()`, `glow()` y `noGlow()`.
- **Sí:** los componentes de cliente reciben el catálogo por props. Es la regla que el
  repo ya tiene escrita: ningún componente consulta por su cuenta.
- **No:** un `CatalogProvider` en el layout. Un contexto para datos que no cambian durante
  la visita, y que además ya viajan en el HTML del servidor, es maquinaria de más.
- **Sí:** `tagline` y `blurb` en la tabla, con mapeo. `desc` es reservada en PostgreSQL.
- **No:** entrecomillar `"desc"` en el SQL. Funciona, pero convierte cada consulta a mano
  en una trampa.
- **Sí:** dos avisos, `CatalogEmpty` y `CatalogUnavailable`. La distinción entre vacío y
  roto es de la casa desde SPEC 07.
- **Sí:** la pestaña por defecto del salón sale del catálogo. Un `"asteroids"` escrito a
  mano en una página es justo el acoplamiento que esta spec quita.
- **Sí:** `on delete cascade` en `scores.game_id`, confirmado tras plantear el precedente
  contrario de `scores.user_id`. Ver «Riesgos».
- **Sí:** `references/implemented-games.md` sigue existiendo, apuntando a `public.games` y
  avisando de que puede quedar desfasado. Se conserva porque lo leen los agentes del repo
  y les ahorra abrir Supabase.
- **No:** un script que lo regenere. Un comando más que mantener para un archivo que sólo
  leen los agentes.

## Riesgos

| Riesgo                                                                                                             | Mitigación                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `on delete cascade` borra el marcador entero de una máquina al borrar su fila, sin confirmación y sin vuelta atrás | Ninguna técnica: es la decisión tomada. Queda escrito aquí y en CLAUDE.md que la vía de retirada es `playable = false`, y que borrar la fila es la excepción. Va en dirección contraria a `scores.user_id`, que es `on delete set null` para que una cuenta borrada no se lleve sus puntuaciones |
| Una consulta más por visita en cinco pantallas                                                                     | `cache()` de React deduplica dentro de la petición. Aun así el catálogo deja de ser gratis: es el precio de la frescura inmediata                                                                                                                                                                |
| El texto editorial sale del repo: un cambio de descripción deja de tener commit, revisión e historial              | Es exactamente lo que se pide. El panel de Supabase conserva su propio registro, y los `check` impiden lo que rompería la pantalla                                                                                                                                                               |
| El `check` de `cat` y el tipo `GameCategory` pueden divergir                                                       | Añadir una categoría exige tocar los dos. Son dos sitios, pero los dos fallan ruidosamente: `tsc` uno y la base de datos el otro                                                                                                                                                                 |
| Alguien escribe una descripción larguísima y descuadra la rejilla de la biblioteca                                 | Sin mitigación en esta spec: el `check` de longitud sólo cubre `title`. La tarjeta trunca lo que no cabe                                                                                                                                                                                         |
| `/jugar/[id]` deja de poder prerenderizarse                                                                        | Es inevitable con frescura inmediata, y `generateStaticParams` sigue actuando como lista blanca: un id inventado es 404 sin ejecutar código                                                                                                                                                      |
| Una máquina sin fila desaparece del salón y sus marcas quedan sin pestaña                                          | No puede pasar por accidente mientras tenga marcas y no se borre la fila a mano; con `cascade`, borrarla se las lleva                                                                                                                                                                            |

## Lo que **no** entra en esta spec

- Panel de administración dentro del vault.
- Dar de alta una máquina sin desplegar.
- Mover la miniatura, el mando o las pieles a la base de datos.
- Caché de ningún tipo, ni `cacheComponents`.
- Traducciones del texto editorial.
- Cambiar el aspecto de ninguna pantalla: esta spec mueve de dónde salen los datos, no
  qué se ve con ellos.

Cada una de esas, si llega, va en su propia spec.
