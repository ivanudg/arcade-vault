# Los diez puntos de contacto de una máquina nueva

Archivo de apoyo de `/spec-game`. Se lee **al empezar la Fase 4**, para construir la tabla de
cobertura y, después, el plan de implementación.

`CLAUDE.md` dice que añadir una máquina son «cuatro sitios». Son diez, y **seis de ellos no los
vigila nadie**: compilan, pasan el lint y fallan en producción o en silencio. Esa columna es la
razón de existir de este archivo.

---

## La tabla

| ID      | Dónde                                              | Qué se escribe                                                                        | Quién avisa si falta                                                | Verificación                                                     |
| ------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **P1**  | `lib/games.ts` — `export type GameId`              | Un literal más a la unión                                                             | — (es el disparador de P2 y P7)                                     | `npx tsc --noEmit`                                               |
| **P2**  | `lib/games.ts` — `GAMES`                           | La entrada del catálogo, al final del array                                           | `tsc`: P1 la exige                                                  | La tarjeta sale en `/biblioteca`                                 |
| **P3**  | `lib/games/<id>/`                                  | `constants.ts`, `math.ts`, `entities.ts`, `index.ts` exportando `<id>Game: GameMount` | `tsc`, vía P4                                                       | `npm run build`                                                  |
| **P4**  | `lib/games/engines.ts` — `ENGINES`                 | Una línea: `<id>: <id>Game`                                                           | **Nadie.** `ENGINES` es `Partial`, así que compila                  | `/jugar/<id>` monta el canvas en vez de salir vacío              |
| **P5**  | `components/play-cabinet.tsx` — `ENGINE_KEYS`      | Una línea con las teclas **vivas** del mando                                          | **Nadie.** También es `Partial`                                     | Los botones que la máquina usa responden; los demás, atenuados   |
| **P6**  | `lib/preview-art.ts` — `ArchivedPreviewId`         | Sacar el id de la unión archivada, si la escena ya existía                            | **Nadie.** Dejarlo en los dos sitios compila igual                  | El id aparece una sola vez en el archivo                         |
| **P7**  | `lib/preview-art.ts` — `switch` de `drawPreview()` | Un `case "<id>":` con la escena                                                       | **`tsc`, rompe el build.** El `default: id satisfies never` lo caza | La miniatura es propia, no la del `default`                      |
| **P8**  | `supabase/migrations/<sello>_<algo>.sql`           | `insert into public.games (id, title, cat, playable, sort_order)`                     | **Nadie hasta jugar.** Revienta la clave ajena al guardar la marca  | `npx supabase migration list` la marca aplicada; guardar inserta |
| **P9**  | `app/(vault)/salon/page.tsx` — `initialTab`        | Nada, **si el fallback sigue valiendo**                                               | **Nadie.** Es un literal escrito a mano                             | `/salon` sin `?juego=` abre en la pestaña correcta               |
| **P10** | `lib/landing.ts` — `STATS` y `FEATURES`            | La cifra de máquinas y el texto que las nombra                                        | **Nadie.** La cifra ya no deriva de `GAMES.length`                  | La portada no dice `1 MAQUINA` con dos en el catálogo            |

---

## Notas por punto

**P1 · El literal.** `GameId` es una unión de un miembro **a propósito**: la máquina siguiente
entra añadiendo un literal, no reescribiendo el tipo. Añadirlo es lo que rompe el build en P2 y
P7, y eso es exactamente lo que se busca.

**P2 · La entrada del catálogo.** Ocho campos, y cuatro tienen vocabulario cerrado:

- `title` — MAYÚSCULAS y **sin tildes**. Press Start 2P no tiene glifos acentuados: saldrían
  huecos.
- `cat` — uno de seis: `ARCADE`, `CLASICOS`, `DISPAROS`, `REFLEJOS`, `PUZZLE`, `LABERINTO`.
- `glow` — uno de tres: `#00f5ff` (cian), `#ff006e` (magenta), `#f5ff00` (amarillo). Son los
  neones de `app/globals.css` y `asteroids` ya usa el amarillo.
- `desc` una línea para la tarjeta, `long` un párrafo para la ficha, `controls` la línea que
  pinta el gabinete bajo el mando — y esa línea tiene que decir lo mismo que P5.

Va **al final** del array: añadir al final no reordena ninguna tarjeta existente.

**P3 · El motor.** Ver `engine-contract.md`.

**P4 y P5 · Los dos registros paralelos.** `ENGINES` dice qué motor monta la máquina;
`ENGINE_KEYS` dice qué botones del mando están vivos. Los dos son `Partial<Record<GameId, …>>`,
así que **olvidar cualquiera de los dos compila**. El síntoma de P4 es una pantalla de juego en
blanco; el de P5, cinco botones que no hacen nada. El mando tiene cinco botones fijos —`←` `↑`
`↓` `→` `ESPACIO`— y los que no se usen se pintan **deshabilitados, nunca escondidos**:
esconderlos descuadra la rejilla.

**P6 y P7 · El arte.** `lib/preview-art.ts` guarda ocho escenas de máquinas que ya no existen,
en `ArchivedPreviewId`. Dos de ellas son juegos que esperan: **`caida` es una pantalla de Tetris
y `muro` una de Arkanoid**. Cuando uno de esos entre, su escena **se mueve**: sale de
`ArchivedPreviewId`, entra por `GameId` y el `case` se renombra. **No se copia** — duplicarla
compila y deja dos escenas divergiendo. Está escrito en la cabecera del propio archivo y en
`CLAUDE.md`.

Si la máquina no tiene escena archivada, P6 no aplica y P7 es una escena nueva desde cero. Las
convenciones del archivo: todo medido en `u = W / 100` y fracciones de `W`/`H` para que escale;
formas con radios **dados**, nunca `Math.random()`, para que la miniatura sea idéntica en cada
render; y todo dentro de la banda `~[0.2H, 0.8H]`, porque la ficha dibuja 560×360 y luego recorta
con `object-cover`.

**P8 · La migración.** `scores.game_id` tiene una clave ajena real contra `public.games`. Sin la
fila, la máquina se ve, se juega y **revienta al guardar la primera marca**. Hoy `asteroids`
tiene `sort_order = 8`; consúltalo antes de proponer el siguiente:

```
grep -rn "sort_order" supabase/migrations/
```

Se aplica con `npx supabase db push` y el archivo queda en `supabase/migrations/`. **Nunca con
`apply_migration` por MCP**: iría al proyecto remoto sin dejar rastro en git. Y se corrige hacia
delante: no se edita una migración ya aplicada, se añade otra.

**P9 · El fallback del salón.** `app/(vault)/salon/page.tsx` resuelve la pestaña inicial con
`requested?.id ?? "asteroids"`, un literal a mano. Con una máquina nueva sigue siendo válido
—`asteroids` no se va—, así que **normalmente P9 no aplica**. Hay que mirarlo igual y decirlo:
aplica si la spec quiere que el salón abra en la máquina nueva, y aplicaría de golpe el día que
`asteroids` saliera del catálogo.

**P10 · Los textos que cuentan máquinas.** SPEC 07 sustituyó `GAMES.length` por cifras a mano
porque «Las 1 máquinas» quedaba absurdo. Eso significa que **ahora hay que actualizarlas a
mano**:

- `lib/landing.ts` → `STATS` tiene `{ value: "1", unit: "MAQUINA", … }`.
- `lib/landing.ts` → `FEATURES` tiene una entrada cuyo `desc` nombra Asteroids en singular.

`components/site-footer.tsx` y `app/not-found.tsx` ya no cuentan máquinas, así que no hace falta
tocarlos. Compruébalo antes de darlo por hecho:

```
grep -rn "MAQUINA\|máquinas\|JUEGOS" lib/landing.ts components/site-footer.tsx app/not-found.tsx
```

---

## Lo que **no** se toca

Estos archivos son genéricos y una máquina nueva no los cambia. Si el plan propone tocar alguno,
eso es una decisión que va escrita en la spec, no un detalle de implementación:

- `lib/games/engine.ts` — salvo la extensión del HUD, y solo si aún no está.
- `lib/games/input.ts` — la entrada de teclado ya sirve para los tres juegos.
- `components/game-canvas.tsx` y `components/game-preview.tsx` — genéricos.
- `lib/leaderboard.ts` — deriva del catálogo por su `Set` de ids; se entera solo.
- `lib/scores.ts`, `lib/storage.ts`, `app/jugar/[id]/actions.ts` — la Server Action valida contra
  `GAMES`, así que acepta la máquina nueva sin cambios.
- Las rutas: `generateStaticParams()` de `/juego/[id]` y `/jugar/[id]` sale de `GAMES`.
- `lib/games/asteroids/` — salvo la línea de `hud`, si entra la extensión.
- `references/started-games/` — **se lee, no se edita.**

---

## La regla de agrupación del plan

Un paso del plan puede dejar el repo compilando, pero **no puede dejar una ruta pública rota**.
De ahí sale un reparto que no es negociable:

> **P1, P2, P4, P5, P6, P7 y P9 van en un único paso indivisible.** El literal nuevo en `GameId`
> no compila sin la entrada de `GAMES`, ni sin el `case` de `drawPreview()` —el
> `id satisfies never` rompe el build—, y `/jugar/<id>` respondería en blanco sin la línea de
> `ENGINES`. Es el mismo razonamiento del paso 2 de SPEC 07, y hay que escribirlo en el plan para
> que nadie lo trocee «para que sea más granular».

El motor (**P3**) sí se trocea, y en ese orden, porque cada trozo compila solo sin que nadie lo
importe: constantes y utilidades → entidades → esqueleto de `mount()` con el bucle vacío →
`update()` → `draw()`.

**P8** va después del paso indivisible: la máquina ya se juega, solo falta poder guardar.

**P10** y la documentación cierran.
