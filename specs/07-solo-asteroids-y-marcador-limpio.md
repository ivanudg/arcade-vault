# SPEC 07 — Solo asteroids: catálogo de una máquina y marcador limpio

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 05, SPEC 06
> **Fecha:** 2026-08-04
> **Objetivo:** Dejar en el catálogo únicamente la máquina que se juega de verdad, `asteroids`, y vaciar el marcador de marcas inventadas para que se llene jugando.

## Por qué existe esta spec

El vault enseña nueve máquinas y deja jugar una. Las otras ocho son escaparate
desde SPEC 01: escena congelada de `drawPreview()`, HUD de cifras fijas y un
botón que se llama, literalmente, `SIMULAR FIN DE PARTIDA`. Tenía sentido
mientras no había ningún motor. Desde SPEC 05 lo hay, y desde SPEC 06 hay un
marcador compartido de verdad, así que lo que antes era un escaparate ahora es
una promesa que se incumple ocho veces.

Lo mismo pasa con las marcas. SPEC 06 sembró noventa puntuaciones inventadas
para que el salón tuviera algo que enseñar el primer día. Un marcador compartido
cuyas diez primeras filas son mentira no es un marcador; es la misma decoración
de antes, ahora en Postgres.

Dos decisiones de esta spec no se adivinan leyendo el resultado.

La primera: **se borra el andamio pero se conserva el arte**. `lib/demo-run.ts` y
la bifurcación «sin motor» del gabinete se van porque toda máquina que entre a
partir de aquí entra con motor, así que ese camino no vuelve a recorrerse. Las
ocho escenas de `lib/preview-art.ts` se quedan porque las de `caida` y `muro` son
una pantalla de Tetris y otra de Arkanoid dibujadas, y esos dos juegos están
esperando en `references/started-games/`. Uno está muerto; el otro solo está
esperando.

La segunda: **el vacío deja de parecerse a una avería**. En SPEC 06 daba igual,
porque con noventa semillas la tabla vacía solo salía con la base de datos caída
y `MARCADOR NO DISPONIBLE` era siempre verdad. Sin semillas, el vacío es el
estado del día uno, y decirle a quien llega que el marcador no está disponible es
mentirle.

## Alcance

**Dentro:**

- **`lib/games.ts`**: `GAMES` se queda con una entrada, `asteroids`. `GameId` pasa
  a ser `"asteroids"`. `getGame()` y `tint()` no cambian.
- **`lib/demo-run.ts` desaparece.** Con la última máquina de escaparate fuera del
  catálogo, no queda quien lea una partida de ejemplo.
- **`components/play-cabinet.tsx` pierde la bifurcación «sin motor»**: el canvas
  jugable deja de ser una de dos ramas y pasa a ser lo único. Con ella se van
  `DEMO_RUN`, `NO_RUN`, la escena congelada de `GamePreview` y el botón
  `SIMULAR FIN DE PARTIDA`.
- **`lib/preview-art.ts` estrena tipo propio.** `PreviewId` es un superconjunto de
  `GameId` que incluye las ocho escenas huérfanas. Se conservan a propósito: las
  de `caida` y `muro` son una pantalla de Tetris y otra de Arkanoid, y son el
  punto de partida de sus miniaturas cuando entren con su nombre real.
- **`lib/leaderboard.ts` distingue vacío de averiado**: las cinco consultas pasan
  a devolver `null` cuando no se pudo preguntar, y la lista o el mapa vacío
  cuando se preguntó y no hay marcas. Ninguna sigue lanzando.
- **`components/scoreboard-empty.tsx`** es nuevo: `SE EL PRIMERO` y una línea que
  invita a abrir el marcador. Lo pintan el salón y la ficha cuando la consulta
  fue bien y no devolvió filas.
- **Las cinco pantallas pasan a tres estados** —filas, vacío, averiado— en vez de
  dos. La portada sigue escondiendo su sección `03 · ACTIVIDAD EN VIVO` cuando no
  hay actividad, que a partir de aquí es el estado del día uno.
- **`app/(vault)/salon/page.tsx`**: la pestaña por defecto pasa de `muro` a
  `asteroids`.
- **Los cuatro textos que quedarían mintiendo**: `FEATURES` en `lib/landing.ts`
  deja de prometer Arkanoid y Tetris; `STATS` cambia `9 JUEGOS Y CONTANDO`;
  `components/site-footer.tsx` y `app/not-found.tsx` dejan de contar máquinas, y
  `app/(vault)/biblioteca/page.tsx` deja de escribir «Las 1 máquinas».
- **`supabase/migrations/<sello>_solo_asteroids.sql`**: borra todas las filas de
  `public.scores` y las ocho máquinas de `public.games`. La tabla queda con una
  fila, espejo exacto de `GAMES`.
- **Apartado en `CLAUDE.md`**: que el vault tiene una máquina y toda la que entre
  entra con motor, que `lib/preview-art.ts` guarda arte sin máquina, y que una
  consulta del marcador devuelve `null` cuando falla.

**Fuera de alcance (para futuras specs):**

- **Tetris y Arkanoid.** Siguen esperando en `references/started-games/`; cada uno
  entrará con su spec, su motor y su fila en `games`.
- **Simplificar la biblioteca, el salón o la portada.** El buscador, los filtros
  por categoría, la barra de pestañas y la rejilla de seis columnas se quedan tal
  cual, operando sobre una máquina. Vuelven a tener sentido en dos specs.
- **Borrar las ocho escenas de `lib/preview-art.ts`.** Se quedan archivadas.
- **Tocar el motor.** `lib/games/`, `lib/games/engines.ts` y
  `components/game-canvas.tsx` no cambian ni una línea.
- **Revertir la migración de siembra de SPEC 06.** El historial se queda como
  está; lo que hay se borra con una migración nueva hacia delante.
- **Autenticación, moderación, antitrampas, realtime, paginación y caché.** Igual
  que en SPEC 06, cada una en la suya.
- **Tests.** El repo sigue sin framework y esta spec no lo introduce.

## Modelo de datos

El esquema de SPEC 06 no cambia: mismas dos tablas, mismos índices, mismas
políticas, mismas dos vistas. Lo que cambia son tipos del código y filas de la
base de datos.

### El catálogo encoge

```ts
// lib/games.ts
export type GameId = "asteroids";

export const GAMES: readonly Game[] = [
  {
    id: "asteroids",
    title: "ASTEROIDS",
    cat: "DISPAROS",
    glow: "#f5ff00",
    playable: true /* … */,
  },
];
```

`Game`, `GameCategory` y `GameGlow` no cambian. `GameCategory` conserva sus seis
valores aunque solo se use `DISPAROS`: es un vocabulario cerrado, no un índice de
lo que hay hoy. `playable` tampoco se toca, aunque hoy nadie valga `false`.

### El arte se desacopla del catálogo

```ts
// lib/preview-art.ts
/** Toda máquina del catálogo tiene escena, y además hay escena sin máquina. */
export type PreviewId = GameId | ArchivedPreviewId;

/** Escenas de las ocho máquinas que salieron del catálogo en SPEC 07. */
type ArchivedPreviewId =
  "muro" | "serpiente" | "invasores" | "rocas" | "duelo" | "corredor" | "caida" | "laberinto";

export function drawPreview(
  id: PreviewId,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void;
```

`GameId | ArchivedPreviewId` y no `string`: así una máquina nueva sin escena
sigue siendo un error de compilación, que es lo que el tipo estaba comprando.

### Las consultas del marcador ganan un `null`

```ts
// lib/leaderboard.ts — `null` es "no se pudo preguntar"; vacío es "no hay marcas".
export async function board(id: GameId): Promise<BoardRow[] | null>;
export async function boards(): Promise<Partial<Record<GameId, BoardRow[]>> | null>;
export async function bests(): Promise<Partial<Record<GameId, number>> | null>;
export async function recentScores(limit?: number): Promise<RecentScore[] | null>;
export async function topPlayers(limit?: number): Promise<PlayerRank[] | null>;
```

`ScoreEntry`, `BoardRow`, `RecentScore` y `PlayerRank` no cambian.

Los tres estados de una pantalla que pinta marcas:

| Lo que llega | Qué se ve                |
| ------------ | ------------------------ |
| `null`       | `MARCADOR NO DISPONIBLE` |
| `[]` o `{}`  | `SE EL PRIMERO`          |
| Filas        | La tabla                 |

### Lo que desaparece

```ts
// lib/demo-run.ts — archivo entero
export interface DemoRun {
  score: number;
  lives: number;
  level: number;
}
export const DEMO_RUN: Partial<Record<GameId, DemoRun>>;
```

### Las dos tablas después de la migración

| Tabla           | Antes | Después |
| --------------- | ----- | ------- |
| `public.games`  | 9     | 1       |
| `public.scores` | 90    | 0       |

Las vistas `top_scores` y `player_bests` no se tocan: con `scores` vacía
devuelven cero filas, que es exactamente lo que deben decir.

`ENGINE_KEYS` en `components/play-cabinet.tsx` sobrevive. Sigue habiendo máquinas
cuyo mando no usa todas las teclas —Asteroids no usa `↓`—, así que ese mapa no es
de la bifurcación que se borra.

## Plan de implementación

1. **Desacoplar el arte del catálogo.** `lib/preview-art.ts` estrena `PreviewId`
   y `ArchivedPreviewId`, y su cabecera explica que las ocho escenas sobrantes
   esperan a su máquina. `GAMES` no se toca todavía.
   Verificación: `npx tsc --noEmit` pasa y las nueve tarjetas de `/biblioteca`
   siguen dibujando su escena.

2. **El catálogo encoge, y con él se va lo que existía para enseñar máquinas sin
   motor.** `GAMES` se queda con `asteroids` y `GameId` pasa a ser `"asteroids"`.
   Se borra `lib/demo-run.ts`. `components/play-cabinet.tsx` pierde la
   bifurcación: fuera `DEMO_RUN`, `NO_RUN`, la escena congelada y
   `SIMULAR FIN DE PARTIDA`. `app/(vault)/salon/page.tsx` abre en `asteroids`.
   Va todo en un paso porque separarlo deja el repo roto: borrar el andamio con
   las ocho máquinas dentro deja `/jugar/muro` sin canvas, y encogerlas antes deja
   `DEMO_RUN` con ocho claves que ya no existen.
   Verificación: `/biblioteca` muestra una tarjeta, `/salon` una pestaña,
   `/juego/rocas` responde 404 y `/jugar/asteroids` se juega igual.

3. **Migración `<sello>_solo_asteroids.sql`.** Borra todas las filas de
   `public.scores` y las ocho máquinas de `public.games`. Aplicar con
   `npx supabase db push`.
   Verificación: `games` tiene 1 fila y `scores` 0; `select * from
public.top_scores` devuelve 0 filas.

4. **`lib/leaderboard.ts` devuelve `null` cuando no puede preguntar.** Las cinco
   consultas cambian de firma y los cinco consumidores absorben el cambio con
   `?? []` o `?? {}`. Nadie distingue nada todavía: la pantalla se ve igual que
   antes del paso.
   Verificación: `npm run build` pasa y las cinco pantallas se ven idénticas.

5. **`components/scoreboard-empty.tsx` y los tres estados.**
   `app/(vault)/salon/page.tsx` y `app/(vault)/juego/[id]/page.tsx` dejan de
   colapsar `null` con vacío y bajan la diferencia a `HallOfFame` y `ScorePanel`.
   Verificación: con la base viva y `scores` vacía se ve `SE EL PRIMERO`; sin
   `.env.local` se ve `MARCADOR NO DISPONIBLE`. Guardar una marca hace aparecer
   la tabla.

6. **Los cuatro textos.** `FEATURES` y `STATS` en `lib/landing.ts`,
   `components/site-footer.tsx`, `app/not-found.tsx` y el encabezado de
   `app/(vault)/biblioteca/page.tsx`.
   Verificación: `grep -rn "máquinas\|MAQUINAS" app components lib` no deja
   ninguna frase que cuente mal, y ninguna pantalla escribe «Las 1 máquinas».

7. **Documentar en `CLAUDE.md`.** Que el vault tiene una máquina y que toda la
   que entre entra con motor —el apartado «Motores de juego» dice hoy lo
   contrario—, que `lib/preview-art.ts` guarda arte sin máquina, y que una
   consulta del marcador devuelve `null` cuando falla y vacío cuando no hay
   marcas.
   Verificación: el apartado existe y nombra `lib/preview-art.ts`,
   `lib/leaderboard.ts` y `components/scoreboard-empty.tsx`.

## Criterios de aceptación

**Catálogo**

- [ ] `GAMES` tiene exactamente una entrada y su `id` es `asteroids`.
- [ ] `/biblioteca` muestra una tarjeta.
- [ ] `/salon` muestra una pestaña, `ASTEROIDS`, y abre en ella sin `?juego=`.
- [ ] La sección `02` de la portada muestra una mini-tarjeta.
- [ ] `/juego/rocas` y las otras siete fichas responden 404.
- [ ] `/jugar/muro` y las otras siete pantallas de juego responden 404.
- [ ] `grep -rn "DEMO_RUN\|SIMULAR FIN DE PARTIDA" app components lib` no devuelve
      nada, y `lib/demo-run.ts` no existe.

**El motor se juega igual**

- [ ] `/jugar/asteroids` carga el canvas, el HUD arranca en `0 / 3 / 1` y el mando
      responde.
- [ ] Terminar una partida abre el superpuesto de fin de partida.
- [ ] `lib/games/`, `components/game-canvas.tsx` y `lib/games/engines.ts` no tienen
      ni una línea modificada.

**El arte archivado**

- [ ] `lib/preview-art.ts` conserva las ocho escenas y exporta `PreviewId`.
- [ ] Añadir a `GAMES` una máquina sin escena es un error de `npx tsc --noEmit`.
- [ ] La miniatura de `asteroids` se dibuja en `/biblioteca` y en
      `/juego/asteroids`.

**El marcador arranca limpio**

- [ ] `public.games` tiene 1 fila y su `id` es `asteroids`.
- [ ] `public.scores` tiene 0 filas.
- [ ] `select * from public.top_scores` y `select * from public.player_bests`
      devuelven 0 filas.
- [ ] `npx supabase migration list` marca aplicada la migración nueva.

**Los tres estados**

- [ ] Con la base viva y `scores` vacía, `/salon` y `/juego/asteroids` muestran
      `SE EL PRIMERO`, no `MARCADOR NO DISPONIBLE`.
- [ ] Sin `.env.local`, esas dos pantallas muestran `MARCADOR NO DISPONIBLE`.
- [ ] Con `scores` vacía, la portada no pinta la sección `03 · ACTIVIDAD EN VIVO`.
- [ ] Con `scores` vacía, la tarjeta de `/biblioteca` muestra `—` y el rótulo de la
      ficha muestra `RECORD —`.
- [ ] Guardar una partida hace que las cuatro pantallas pasen de vacío a tabla sin
      recargar a mano.
- [ ] Las cinco funciones de `lib/leaderboard.ts` devuelven `null` con la base
      caída y lista o mapa vacío con la base viva y sin marcas.
- [ ] Ninguna consulta de `lib/leaderboard.ts` propaga una excepción.

**Los textos**

- [ ] Ninguna pantalla escribe «Las 1 máquinas» ni «1 MÁQUINAS».
- [ ] `FEATURES` no promete Arkanoid ni Tetris.
- [ ] La franja de cifras de la portada no dice `9 JUEGOS`.
- [ ] El pie y `app/not-found.tsx` no cuentan mal las máquinas.

**Nada más se ha movido**

- [ ] `npm run build`, `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] La biblioteca conserva buscador y filtros por categoría, y filtrar por
      `DISPAROS` sigue mostrando la tarjeta.
- [ ] `app/jugar/[id]/actions.ts`, `lib/scores.ts` y `lib/storage.ts` no cambian.
- [ ] `lib/supabase/` no cambia y `/api/supabase-health` sigue respondiendo 200.
- [ ] El esquema de SPEC 06 no cambia: mismas tablas, mismos índices, mismas tres
      políticas, mismas dos vistas.
- [ ] `references/started-games/` no cambia.

**Documentación**

- [ ] `CLAUDE.md` dice que el vault tiene una máquina y que toda la que entre
      entra con motor.
- [ ] `CLAUDE.md` nombra `lib/preview-art.ts` como arte sin máquina y explica el
      `null` de `lib/leaderboard.ts`.
- [ ] `CLAUDE.md` ya no describe ocho máquinas de escaparate ni `lib/demo-run.ts`.

## Decisiones tomadas y descartadas

**El catálogo**

- **Sí:** las ocho máquinas de escaparate salen de `GAMES`. Un vault que enseña
  nueve máquinas y solo deja jugar una promete ocho veces más de lo que da.
- **No:** ocultarlas con un campo `hidden` en vez de sacarlas. Añade un concepto
  nuevo al catálogo para no borrar ocho entradas que están en git.
- **No:** dejar `asteroids` y quitar solo las que tienen `playable: false`. El
  problema no es que dos estén en mantenimiento; es que seis se anuncian jugables
  y no lo son.
- **Sí:** `GameId` pasa a ser `"asteroids"`, una unión de un miembro. Sigue siendo
  una unión, así que Tetris entra añadiendo un literal y no reescribiendo el tipo.
- **Sí:** `GameCategory` conserva sus seis valores aunque solo se use `DISPAROS`.
  Es un vocabulario cerrado, no un inventario de lo que hay hoy.

**El arte y el andamio**

- **Sí:** `lib/preview-art.ts` conserva las ocho escenas. Las de `caida` y `muro`
  son una pantalla de Tetris y otra de Arkanoid, y esas dos máquinas están
  esperando en `references/started-games/`. Borrarlas hoy es tirar el trabajo que
  se rehace en dos specs.
- **Sí:** `PreviewId` como tipo propio, superconjunto de `GameId`. Así el arte
  deja de estar acoplado al catálogo sin perder el chequeo de que toda máquina
  tiene escena.
- **No:** `drawPreview(id: string)`. Es la solución de una línea y desactiva
  justo lo que el tipo estaba comprando.
- **Sí:** `lib/demo-run.ts` y la bifurcación «sin motor» de `PlayCabinet` se
  borran. Toda máquina que entre a partir de aquí entra con motor, así que ese
  camino no vuelve a recorrerse. Es la diferencia con el arte: uno está muerto,
  el otro solo está esperando.
- **Sí:** `SIMULAR FIN DE PARTIDA` desaparece. Existía porque sin motor no había
  forma de llegar al fin de partida; ahora se llega jugando.

**El marcador vacío**

- **Sí:** las noventa semillas se van. Un marcador compartido cuyas diez primeras
  filas son inventadas no es un marcador, es una decoración.
- **Sí:** la migración borra `scores` entera y no solo `seeded = true`. Hoy no hay
  ni una marca real; una condición sobre `seeded` dejaría el resultado a merced de
  lo que alguien guarde entre hoy y el día de la implementación.
- **Sí:** vacío y averiado dejan de verse igual. En SPEC 06 daba lo mismo porque
  con noventa semillas la tabla vacía solo salía con la base caída. Sin semillas,
  el vacío es el estado del día uno y decirle «no disponible» a quien llega es
  mentirle.
- **Sí:** `null` para el fallo y lista vacía para el vacío. Cambio de una firma,
  se lee de un vistazo y las pantallas deciden con un `=== null`.
- **No:** un resultado etiquetado `{ ok, rows }`. Más explícito y más ceremonia en
  los cinco sitios que lo consumen.
- **Sí:** el vacío invita a jugar en vez de constatar. Una pantalla vacía es una
  invitación a actuar; `AUN NO HAY MARCAS` describe el problema y no ofrece salida.
- **Sí:** la portada sigue escondiendo su sección de actividad. Una cabecera de
  actividad sobre dos invitaciones a jugar es ruido en la pantalla que ya tiene
  dos llamadas a jugar.
- **No:** revertir la migración de siembra de SPEC 06. El historial cuenta lo que
  pasó; se borra hacia delante.

**Las pantallas se quedan como están**

- **Sí:** la biblioteca conserva buscador y filtros, el salón su barra de pestañas
  y la portada su rejilla de seis columnas, todo operando sobre una máquina.
  Tetris y Arkanoid entran en las próximas specs y simplificar ahora es trabajo
  que se deshace.
- **No:** esconder buscador, filtros y pestañas cuando solo hay una máquina.
  Suena a que se escribe una vez y vale para siempre, pero es una condición nueva
  en tres componentes para tapar algo que dura dos specs.
- **Sí:** los cuatro textos que contaban máquinas se reescriben. Tres salen de
  `GAMES.length` y habrían quedado en «Las 1 máquinas»; `FEATURES` prometía
  Arkanoid y Tetris, que es exactamente lo que esta spec deja de haber.

## Riesgos

| Riesgo                                                                                                                                                                                               | Mitigación                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La migración borra filas de `public.games` que todavía tienen marcas apuntando a ellas, y falla por la clave ajena.                                                                                  | El `delete` de `scores` va primero y el de `games` después, en esa migración y en ese orden. Los criterios comprueban las dos tablas por separado.                                                      |
| El día uno el vault enseña menos que nunca: la portada esconde la actividad, la biblioteca dice `—` y el salón dice `SE EL PRIMERO`. Tres pantallas con menos contenido a la vez parecen una avería. | Es exactamente lo que el aviso nuevo existe para desmentir, y `/api/supabase-health` de SPEC 04 dice si hay conexión sin salir del navegador. La primera partida guardada llena las cuatro pantallas.   |
| El arte archivado no lo renderiza nadie, así que puede pudrirse sin que ningún error lo delate: sigue compilando aunque ya no se parezca a lo que Tetris necesite.                                   | La cabecera de `lib/preview-art.ts` dice qué son esas ocho escenas y a qué esperan. Si al llegar Tetris no sirven, se borran entonces con el caso delante.                                              |
| Cuando Tetris entre como máquina nueva, su escena podría acabar duplicada: una en `GameId` y la archivada de `caida` intacta.                                                                        | La spec de Tetris mueve la escena, no la copia: sale de `ArchivedPreviewId` y entra por `GameId`. Queda escrito en `CLAUDE.md` en el paso 7.                                                            |
| `GameId` con un solo miembro hace que TypeScript estreche comparaciones como `tab === g.id` a un literal y avise de código inalcanzable donde antes no avisaba.                                      | Sale en `npx tsc --noEmit` del paso 2, que es donde se arregla. La unión sigue siendo unión, así que el problema desaparece con la segunda máquina.                                                     |
| Entre el paso 2 y el 3 el código tiene una máquina y la base de datos nueve.                                                                                                                         | No rompe nada: `saveScore` valida contra `GAMES` y `asGameId` descarta lo que no está en el catálogo, así que las ocho sobrantes son invisibles aunque sus filas sigan ahí. Son dos pasos consecutivos. |

## Lo que **no** entra en esta spec

- Tetris y Arkanoid. Siguen esperando en `references/started-games/`.
- Simplificar la biblioteca, el salón o la portada por tener una sola máquina.
- Borrar las ocho escenas de `lib/preview-art.ts`.
- Tocar el motor de Asteroids ni el contrato de `lib/games/engine.ts`.
- Revertir la migración de siembra de SPEC 06.
- Autenticación, moderación, antitrampas, realtime, paginación y caché.
- Tests.

Cada una de esas, si llega, va en su propia spec.
