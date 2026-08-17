# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

**Arcade Vault**: plataforma para jugar online y competir por la mayor cantidad de
puntos. Ya no es el scaffold de `create-next-app`: hoy son **siete pantallas**, cinco
máquinas jugables con motor propio —las cinco vestidas con sus tres pieles— y un
marcador compartido en Supabase. Lo construido por spec llega hasta **SPEC 14**; lo que
ha entrado después no lleva número, porque lo escriben los agentes (ver «Lo que ha
pasado sin spec»).

El flujo de trabajo del proyecto es **Spec Driven Design** vía las skills `/spec` y `/spec-impl` de [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Antes de implementar una feature nueva, espera/produce la spec correspondiente en lugar de escribir código directamente.

Para las máquinas del vault ese flujo tiene un eslabón más, y va **antes** que la spec:
el subagente **`game-planner`** (`.claude/agents/game-planner.md`), que decide **cuál** entra.
Con el material de `references/started-games/` agotado, elegir la siguiente máquina dejó de
ser obvio, así que el agente puntúa candidatos contra el contrato del motor, recomienda uno y
para. Recuerda lo que ya propuso en `.claude/game-planner/memoria.md`, porque arranca en frío
en cada invocación. La cadena completa es **`game-planner` → `/spec-game` → `/spec-impl-game`**,
y el último eslabón encadena a su vez `skin-designer` y `mobile-porter`; los detalles, en
«Herramientas del repo».

Las specs viven en `specs/NN-<slug>.md` y llevan su estado en la segunda línea. El
historial cuenta el producto mejor que el código:

| Spec | Qué trajo                                                                                     |
| ---- | --------------------------------------------------------------------------------------------- |
| 01   | MVP visual: biblioteca, ficha, salón, cuenta y gabinete, puerto de `references/templates/`    |
| 02   | Portada en `/` y mudanza del catálogo a `/biblioteca`                                         |
| 03   | `/acerca-de` y el formulario de contacto con Resend                                           |
| 04   | Conexión con Supabase (clientes, `env.ts`, `/api/supabase-health`)                            |
| 05   | Asteroids: el primer motor real y el contrato `GameMount`                                     |
| 06   | El marcador se muda a Supabase: `public.games` y `public.scores`                              |
| 07   | El catálogo encoge a una máquina y el marcador arranca vacío                                  |
| 08   | Tetris y los rótulos de HUD por motor                                                         |
| 09   | Arkanoid, puerto sin spritesheet                                                              |
| 10   | Snake, escrita desde cero, con `public/snake/fruits.png`                                      |
| 11   | `/jugar/[id]` jugable con el dedo: maquetación vertical y horizontal de mano                  |
| 12   | El mando de mano se vuelve de consola: cruz, `B`/`A` y `PAUSA`/`SALIR` en el centro           |
| 13   | El mando se viste: chasis, cruz con flechas SVG y hub, `B`/`A` con relieve; `game-pad.tsx`    |
| 14   | Frogger: rondas infinitas, cronómetro en el canvas y la fauna del río; estrena `REFLEJOS`     |
| 15   | Cuentas reales: Supabase Auth, `public.profiles`, `proxy.ts` y la marca firmada con `user_id` |

Ojo: **el estado del encabezado no siempre se actualiza al cerrar**. La spec 02 sigue
marcada como `Aprobado` con la portada implementada, y la 14 como `Aprobada` con Frogger
ya jugable en el catálogo. La verdad de qué hay implementado la dicen `lib/games.ts` y
`references/implemented-games.md`, no la línea de estado.

### Lo que ha pasado sin spec

Desde SPEC 14 el repo se mueve por **rondas de subagente**, y ésas no numeran: cada una
deja su rastro en el ledger de su agente y no en `specs/`. Lo hecho hasta hoy:

| Agente                     | Qué dejó                                                                                                                 | Ledger                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `skin-designer`            | Las cinco máquinas vestidas con `clasico`/`neon`/`retro`, el selector `PIEL` y el halo como rasgo de piel; una por ronda | `.claude/skin-designer/skins.md`              |
| `mobile-porter`            | `Pie` y `Ficha` en `adaptada`; `Cabecera` en `en-curso` con dos defectos abiertos que piden una decisión                 | `.claude/mobile-porter/pantallas.md`          |
| `game-performance-booster` | Los cinco motores auditados y `tetris` **optimizado**, con cuatro mediciones                                             | `.claude/game-performance-booster/motores.md` |

Y hay una decisión **pendiente de humano**: `game-jam` dejó las dos specs de Amidar en
`specs/game-jam/amidar/` —`spec-minima.md` y `spec-completa.md`, las dos en `Borrador de
jam`—. Aprobar una es mudarla a `specs/15-<slug>.md` y cerrar la hermana. Junto a ellas
está `specs/game-jam/frogger/`, que es el registro de la jam que sí se cerró: su
`spec-minima.md` quedó `Descartada` y la completa se mudó a `specs/14-*`; el
`01-frogger-core.md` que la acompaña también está `Descartada`, y se conserva sólo como
registro de una spec que no era de este repo.

No hay framework de tests configurado. Si se añade uno, documenta aquí cómo correr un test individual.

## Comandos

```bash
npm run dev            # Turbopack, por defecto en Next 16
npm run build          # build de producción (hace el type-check)
npm run lint           # ESLint flat config (core-web-vitals + typescript)
npm run format         # Prettier sobre todo el repo
npm run supabase:types # regenera lib/supabase/database.types.ts contra el proyecto enlazado
npx tsc --noEmit       # type-check aislado
npx supabase db push   # aplica las migraciones de supabase/migrations/
```

## Stack y convenciones

- **Next.js 16.2.12 (App Router) + React 19.2 + TypeScript strict + Tailwind CSS v4.**
- Alias de imports: `@/*` apunta a la raíz del repo (`@/app/...`, no hay `src/`).
- Tailwind v4 se configura **en CSS**, no en `tailwind.config.js`: los tokens viven en el bloque `@theme inline` de `app/globals.css`, alimentados por variables CSS de `:root`. Para añadir colores/fuentes del tema, edítalo ahí. PostCSS solo carga `@tailwindcss/postcss`.
- Las fuentes se cargan con `next/font/google` en `app/layout.tsx` y se exponen como variables CSS (`--font-press-start` para Press Start 2P, `--font-courier-prime` para Courier Prime) enlazadas al tema de Tailwind (`font-display`, `font-mono`/`font-sans`).
- El tema es **dark-only**: los tokens `--av-*` de `app/globals.css` derivan de `references/templates/` (paleta neón `#00f5ff` / `#ff006e` / `#f5ff00` sobre `#0a0a0f`). No hay variante clara ni theme switcher; no uses variantes `dark:`. Ojo: las **skins** de las que habla `skin-designer` son otra cosa —la paleta del canvas de un motor, que no hereda nada del tema del sitio—, y no contradicen esto: el sitio sigue siendo dark-only.
- Los efectos CRT del template son utilidades propias en `globals.css`: `av-glow-*`, `av-halo-*`, `av-grid-floor`, `av-scanlines`, `av-vignette`, y las animaciones `animate-av-*` (fade, slide, row, caret, spin, sweep, cabinet, pulse, flicker, grid, led).
- **Dos variantes propias, también en `globals.css`**, declaradas con `@custom-variant` de Tailwind v4 y usadas por nombre en el marcado: `handheld` es puntero grueso con la ventana por debajo de 480px de ancho **o** de alto, y `handheld-wide` es lo mismo en horizontal. Las dos llevan `(pointer: coarse)` acompañado siempre del umbral, para que un portátil táctil no cumpla ninguna y una tableta —un iPad mini mide 744px por su lado corto— se quede con la maquetación de escritorio. Sólo las usa la pantalla de juego, y desde que existe `mobile-porter` eso es **una regla y no una observación** (M8 de `.claude/mobile-porter/reglas-movil.md`): las otras siete pantallas se maquetan por **ancho**, con los breakpoints de fábrica de Tailwind, porque lo único que les cambia es cuánto sitio hay; la de juego se maqueta por **puntero**, porque lo que le cambia es con qué se juega. Y hay un motivo práctico además del conceptual: `(pointer: coarse)` no lo cumple un Chrome de escritorio, así que una regla escrita bajo `handheld` no se puede ver ni verificar estrechando una ventana —la SPEC 12 lo pagó y lo dejó escrito en su «Validación»—. Para ocultar algo con el dedo sin cambiar de maquetación está `pointer-coarse:`, que ya trae Tailwind. Junto a ellas vive `--av-play-header`, el alto de `PlayHeader` con el dedo: la cabecera lo fija y el `<main>` de `/jugar/[id]` se lo resta a `100svh`, y va en `:root` porque son hermanos y sólo comparten lo que herede la raíz.
- `next.config.ts` sólo declara `turbopack.root = import.meta.dirname`, porque hay un `package-lock.json` suelto por encima del repo y sin eso Turbopack lo toma como raíz del workspace y avisa en cada build. Cualquier otro flag (p. ej. `cacheComponents`) es una decisión nueva, no algo ya asumido.
- **Lo que se pinta en Press Start 2P va en mayúsculas y sin tildes.** La fuente no tiene glifos acentuados y el navegador los sustituye por otra, que al lado de un avance de 20px sale como una mota. Lo mismo con los símbolos del template (`▸ ▶ ✦ …`): se dibujan con ASCII. El único no-ASCII admitido es `·`. Los cuerpos de texto van en Courier Prime y **sí** llevan su acentuación.
- **El texto editorial no vive en la maquetación**: los literales de la portada están en `lib/landing.ts` (`FEATURES`, `STATS`, `PLAN`, `FAQ`), los de «Acerca de» en `lib/about.ts` (`MISSION`, `HIGHLIGHTS`, `CONTACT_TIPS`, `TERMINAL_*`, `LIMITS`) y los de las máquinas en `lib/games.ts`. Un retoque de copia no abre un `.tsx`.
- **Los acentos son cuatro** —`Accent = "cyan" | "magenta" | "yellow" | "amber"`, definido en `lib/landing.ts`— y **nunca se interpolan en un nombre de clase**: Tailwind sólo ve las cadenas escritas enteras, así que cada componente declara su `Record<Accent, string>` con las clases completas. El color de una máquina (`game.glow`) sí es dinámico y se resuelve en `style`, con `tint()` de `lib/games.ts` para los velos y halos.
- **Prettier y ESLint corren solos.** `.claude/settings.json` engancha un hook `PostToolUse` a `Write|Edit|MultiEdit|NotebookEdit` que ejecuta `.claude/hooks/format-file.sh`: pasa el archivo tocado por `eslint --fix` y `prettier --write`, salta lo que esté en `node_modules/`, `.next/` o `references/`, y devuelve por stderr lo que ESLint no pudo auto-corregir. No hace falta formatear a mano; sí hace falta contar con que el archivo cambie después de escribirlo.

## Rutas y pantallas

Siete pantallas y dos rutas sin pintura: el diagnóstico de conexión y la
confirmación del correo. El grupo `app/(vault)/` **no aparece en la
URL**: existe para que `/jugar/[id]` quede fuera y monte su cabecera reducida
(`PlayHeader`) sin heredar el `SiteHeader` ni el `SiteFooter` de `app/(vault)/layout.tsx`.

| Ruta                   | Archivo                            | Qué es                                                 |
| ---------------------- | ---------------------------------- | ------------------------------------------------------ |
| `/`                    | `app/(vault)/page.tsx`             | Portada: hero, ventajas, cifras, plan, FAQ y actividad |
| `/biblioteca`          | `app/(vault)/biblioteca/page.tsx`  | Catálogo con buscador y filtros                        |
| `/juego/[id]`          | `app/(vault)/juego/[id]/page.tsx`  | Ficha: miniatura, descripción, controles y top 10      |
| `/salon`               | `app/(vault)/salon/page.tsx`       | Salón de la fama, una pestaña por máquina              |
| `/cuenta`              | `app/(vault)/cuenta/page.tsx`      | `AuthPanel`: registro, acceso y perfil                 |
| `/acerca-de`           | `app/(vault)/acerca-de/page.tsx`   | Misión y formulario de contacto                        |
| `/jugar/[id]`          | `app/jugar/[id]/page.tsx`          | El gabinete: HUD, canvas y mando                       |
| `/api/supabase-health` | `app/api/supabase-health/route.ts` | Diagnóstico de conexión                                |
| `/auth/confirmar`      | `app/auth/confirmar/route.ts`      | Canjea el enlace del correo y redirige a `/cuenta`     |

- **`app/layout.tsx` es de todas**: fuentes, `metadata` con plantilla `"%s · Arcade Vault"`, `VaultBackdrop` y `SessionProvider`. Su contenedor no lleva `z-index` a propósito, para no crear contexto de apilamiento: los z de dentro compiten con los del fondo (rejilla 0, cabecera 40, scanlines 50, superpuestos 55 y 60).
- **`app/not-found.tsx` vive en la raíz, fuera del grupo**, y monta cabecera y pie por su cuenta: un `not-found` dentro de un grupo de rutas no atiende las URLs que no corresponden a ninguna ruta.
- **Las dos rutas por máquina son cerradas**: `/juego/[id]` y `/jugar/[id]` declaran `generateStaticParams()` sobre `GAMES` y `dynamicParams = false`, así que un id inventado es 404 sin ejecutar código. `getGame()` devuelve `undefined` —no la primera máquina— justamente para eso.
- **`?juego=` sólo existe en `/salon`** y sólo elige la pestaña inicial; un valor inventado abre en `asteroids` en vez de dar 404. A partir de ahí las pestañas son estado de cliente y la URL no cambia. Lo mismo con el buscador y los filtros de `/biblioteca`: estado de cliente, no `searchParams`, para no navegar en cada pulsación.
- **El ancho máximo va dentro y el relleno fuera.** Las plantillas de `references/templates/` miden en `content-box`; con el `border-box` de Tailwind, juntar ancho y relleno en el mismo elemento encoge la rejilla.
- **`SiteHeader` y `SiteFooter` ya no son sólo de escritorio.** Las rondas de `mobile-porter` les escribieron el relleno de muesca —los cuatro lados declarados enteros con `calc(... + env(safe-area-inset-*))`, sin restar sobre el `px`/`py`, así que hoy, con `env()` a 0, a 1280 no cambia ni un píxel—, y el cajón del móvil **congela `<html>`** mientras está abierto, restaurándolo al cerrar y al desmontar. Se congela `<html>` y no `<body>` porque el `html { overflow-x: hidden }` de `globals.css` le quita a `body` la propagación de su overflow al viewport. Ojo: el relleno de `env()` ya no es exclusivo de `/jugar/[id]`; lo que sigue siendo sólo suyo es el `viewport` propio con escala fija.

## Motores de juego

El vault tiene **cinco** máquinas, `asteroids`, `tetris`, `arkanoid`, `snake` y
`frogger`, y **toda la que entre a partir de aquí entra con motor**. Hasta SPEC 07 el catálogo enseñaba
nueve y dejaba jugar una: las otras ocho eran escaparate —escena congelada de
`drawPreview()`, HUD de cifras fijas y un botón que simulaba morir—. Ese camino
se borró entero (`lib/demo-run.ts` y la bifurcación «sin motor» de
`PlayCabinet`), así que `GAMES` sin entrada correspondiente en `ENGINES` no es un
estado que se soporte.

**Para saber qué máquinas hay hoy, consulta `references/implemented-games.md`**: una
tabla con el id, el título, la categoría, el color y la descripción de cada una. Es un
resumen derivado de `lib/games.ts`, que sigue siendo la fuente de verdad; al añadir una
máquina, se actualiza también esa tabla.

- `tetris` entró en SPEC 08 y es la primera que ejerce la regla; su motor vive en
  `lib/games/tetris/` —`constants.ts`, `pieces.ts`, `board.ts`, `skins.ts` e
  `index.ts`— y es el Tetris clásico de `references/started-games/03-tetris/`,
  sin la capa moderna de puntuación, los power-ups, las habilidades ni los modos,
  que esperan a su propia spec. Es también el **único motor optimizado** hasta
  hoy: la ronda de `game-performance-booster` partió su `drawCell` en `drawBoard`
  y `drawPiece`, izó `glowSpread()` y precomputó `glossFill()` fuera del bucle.
- `arkanoid` entró en SPEC 09 y es la primera que **no toca el contrato**: tiene
  puntuación, vidas y niveles de verdad, así que declara los mismos tres rótulos
  que Asteroids y no pide nada más. Su motor vive en `lib/games/arkanoid/`
  —`constants.ts`, `levels.ts`, `entities.ts`, `skins.ts` e `index.ts`— y es el Arkanoid de
  `references/started-games/04-arkanoid/` **redibujado sin su spritesheet**:
  paddle y bloques son `fillRect`, la bola es un `arc`, y los siete nombres de
  `COLOR_MAP` resultaron ser nombres de color CSS válidos, así que la tabla se
  copió literal. Con el PNG se cayó la explosión de cuatro frames, que eran
  recortes suyos. También quedan fuera el audio, el control con ratón —el paddle
  se mueve con `←`/`→`— y el menú de pausa con su selector de nivel. Y gana algo
  que el original no tiene en juego: `ESPACIO` lanza la bola, que empieza cada
  vida apoyada sobre el paddle en vez de auto-relanzarse.
- `snake` entró en SPEC 10 y es la primera **escrita desde cero**: las otras tres
  son puertos, pero de Snake el material era `fruits.png` y un `sprites.js` de 46
  líneas con las coordenadas de sus recortes y ni una de lógica. Como no había
  original del que copiar el equilibrio, lo fija la spec y vive junto en
  `lib/games/snake/constants.ts` —150 ms por celda que bajan a 60, cinco frutas
  por nivel, `10 × nivel` por fruta, tres vidas, celda de 32 en una rejilla de
  25 × 20—: se ajusta ahí sin tocar el motor. Su directorio son seis archivos,
  `constants.ts`, `sprites.ts`, `math.ts`, `entities.ts`, `skins.ts` e `index.ts`, y declara
  los mismos tres rótulos que Asteroids y Arkanoid, así que es la **tercera
  seguida que no toca el contrato**. La pared mata y la cola también; al perder
  una vida se vuelve al centro conservando puntuación y nivel, y se arranca con
  `ESPACIO`, que la deja como la primera máquina que usa los **cinco** botones
  del mando. Fuera quedaron los obstáculos por nivel, las frutas especiales, el
  modo toroidal y el sonido.
- `frogger` entró en SPEC 14 y es la **primera de `REFLEJOS`**: de los seis
  valores de `GameCategory` sólo queda `LABERINTO` sin estrenar. Es la **segunda
  escrita desde cero** y esta vez sin ni un archivo de partida —Snake al menos
  traía su atlas—, así que el equilibrio entero lo fija la spec y vive en dos
  sitios: `lib/games/frogger/constants.ts` los números —celda de 40 en una
  rejilla de 15 × 13, tres vidas, cinco casas, 30 s por travesía que bajan a 20,
  y las seis constantes de puntuación— y `lanes.ts` la progresión, en
  `lanesForRound(round)`, que es una **función pura de la ronda**: multiplica la
  velocidad por 1,12 con tope en ×2,2, y decide desde qué ronda hay camiones y
  qué tortugas se sumergen. Ajustar la dificultad es cambiar un número en uno de
  esos dos archivos; el motor no se toca. Su directorio son seis archivos
  —`constants.ts`, `lanes.ts`, `math.ts`, `entities.ts`, `skins.ts` e `index.ts`—, y es la
  **segunda que usa los cinco botones** del mando, porque `ESPACIO` saca a la
  rana de la orilla al empezar y después de cada vida. **No hay ni un
  `Math.random()`**: carriles, tortugas, cocodrilo, mosca y dama-rana son
  funciones de `run.t` y de la ronda, así que dos partidas de la misma ronda se
  juegan igual y una posición se reproduce en la consola sin montar el juego; la
  única entidad con estado propio es la serpiente de la mediana, porque rebota.
  Fuera quedaron los sonidos, los assets —no carga ni un archivo—, las
  disposiciones de carriles por ronda y la segunda pantalla del arcade.
- **El cronómetro de Frogger se pinta en el canvas, no en el HUD.** Frogger da 30
  segundos por travesía y paga por cada uno que sobra, así que el tiempo es
  información de juego permanente; pero `GameState` son tres cifras y ya están
  dichas. La salida no fue extender el contrato sino la novena regla de
  `engine-contract.md`: el motor no pinta el HUD, pero **sí** pinta lo que no
  tiene equivalente fuera, como las barras de potenciador de Asteroids. Es una
  barra bajo la fila de casas que se vacía de izquierda a derecha y cambia de
  color en los últimos cinco segundos. Por eso `frogger` declara los mismos tres
  rótulos que Asteroids, Arkanoid y Snake y es la **cuarta seguida que no toca el
  contrato**, y por eso el cronómetro corriendo **no** provoca renders: `onState`
  sigue emitiendo por diferencia sobre las tres cifras de siempre.

- **El vault sirve un binario, y el contrato no se enteró.** `snake` es el único
  motor que carga un archivo: `public/snake/fruits.png`, el atlas del que salen
  sus 22 frutas, copiado sin tocar un píxel desde `references/source-assets/` y
  servido entero —recortarlo invalidaría las 22 coordenadas de
  `lib/games/snake/sprites.ts`, que son copia literal—. **`public/` nació con él
  y no contiene nada más.** Lo que ese pipeline **no** hizo es cambiar nada:
  `lib/games/engine.ts` y `components/game-canvas.tsx` siguen igual y `mount()`
  sigue siendo síncrono. `loadFruitAtlas()` devuelve un cargador nuevo por
  montaje —una caché de módulo sería estado mutable fuera del closure— y el motor
  solo le pregunta `ready()`, que es `false` hasta que la imagen carga y se queda
  en `false` para siempre si salta `error`: mientras diga que no, la fruta es un
  círculo magenta y la partida ni se entera. Una máquina que necesitara **esperar
  de verdad** a sus assets pediría otro contrato, y eso es otra spec.
- **El contrato vive en `lib/games/engine.ts`**: `GameMount` (un `world` estático
  con el tamaño lógico, los rótulos `hud` y `mount(canvas, callbacks)`) y el
  `GameHandle` que devuelve, con `start`, `pause`, `resume`, `restart`, `destroy`
  y el `press`/`release` que usa el mando táctil. Los callbacks son `onState`,
  que solo se emite cuando cambia alguna de las tres cifras del HUD, y
  `onGameOver`.
- **Las tres cifras del HUD son fijas; sus rótulos no.** `GameState` es siempre
  `score`/`lives`/`level`, pero cada motor declara cómo se llaman en su
  `hud: readonly [string, string, string]` —`VIDAS` en Asteroids, Arkanoid y
  Snake, `LINEAS` en Tetris, que no tiene vidas—, y `PlayCabinet` los lee de ahí en vez de
  escribirlos a mano. El campo es **requerido y sin valor por defecto**: un
  motor nuevo no hereda en silencio unos rótulos que podrían mentir en pantalla,
  `tsc` le obliga a decidir. Y `mount()` **emite el estado inicial antes de
  devolver el `GameHandle`**, para que el `FRESH_RUN` de `PlayCabinet` —escrito
  para Asteroids— no se vea durante la pantalla de carga.
- **`lib/games/engines.ts` es el registro**: `ENGINES[game.id]` es de donde
  `PlayCabinet` saca el motor que monta. Sigue siendo `Partial` por tipo, y por
  eso el gabinete conserva una guarda que devuelve `null` si faltara: es una
  guarda de tipos, no la vieja bifurcación.
- **Las cinco máquinas están vestidas**, cada una con su `skins.ts` y sus tres
  pieles obligatorias —`clasico`, `neon` y `retro`—, aplicadas por
  `skin-designer` a razón de una máquina por ronda. El vocabulario está en
  `lib/games/skins.ts` (`SkinId`, `SKIN_IDS`, `DEFAULT_SKIN`, `SKIN_LABELS`) y el
  contrato lo lleva en dos campos **opcionales**, `GameMount.skins` y
  `GameHandle.setSkin()`; siguen siendo opcionales aunque ya no falte nadie,
  porque son lo que permite que una máquina nueva entre sin vestir. `clasico` es
  **extracción y no diseño**: son los hex que el motor ya pintaba, así que
  elegirla deja la partida como estaba.
- **El selector `PIEL` es del gabinete, no del motor.** Vive en
  `components/play-cabinet.tsx`, bajo el marco y nunca dentro —el ancho de ese
  marco lo calcula el ratio del mundo y cualquier cosa dentro lo descuadra—, y
  pinta deshabilitados los ids que la máquina no declara, igual que el mando con
  las teclas que no usa. La elección **se recuerda por máquina** en
  `localStorage` (`skins` de `VaultData`) y se aplica en cuanto llega el
  `GameHandle`, antes de que termine el superpuesto de carga: no hay ni un frame
  con el color equivocado. Cambiar de piel **no toca la partida**: `setSkin()`
  cambia lo que se dibuja, no lo que se juega, y `GameCanvas` ni se entera porque
  su efecto de montaje depende sólo del `GameMount`.
- **Una piel es color y, si el motor lo pide, un rasgo de dibujo booleano.** Hay
  seis en el repo: el `useAtlas` de Snake —que dice si las frutas salen del atlas
  o se dibujan— y **cinco `glow`, uno por máquina**, que dicen si las entidades
  llevan halo. La frontera es la misma que con el alfa: **la piel dice si hay
  halo, el motor dice de cuánto**, y el radio lo resuelve en cada motor una
  `glowSpread(p)` que elige **por la paleta y nunca por el nombre de la piel**.
  Para eso `lib/games.ts` tiene ahora `glow()` y `noGlow()` al lado de `tint()`,
  y los cinco motores los importan de ahí. Ninguna de las rondas del halo cambió
  ni un hex de ninguna paleta.
- **El bucle no vive en React.** `requestAnimationFrame`, el estado de partida y
  las entidades están dentro del closure de `mount()`; en el ámbito de módulo de
  un motor no hay ni una variable mutable. Un motor no importa `react` ni `next`.
  Un frame **nunca** provoca un render: lo único que sube es `onState`, unas
  pocas veces por segundo.
- **`components/game-canvas.tsx`** es la frontera: crea el `<canvas>`, lo escala
  por `devicePixelRatio` (tope 2), monta el motor en un efecto que solo depende
  del `GameMount` y llama a `destroy()` al limpiar. Los callbacks viven en una
  `ref`, así que un re-render del padre no remonta el juego ni reinicia la
  partida.
- **`components/play-cabinet.tsx` es quien orquesta la partida.** El HUD lee sus
  rótulos del motor; la partida arranca cuando acaba el superpuesto de carga
  (`LOAD_MS = 750`) y no al montar, porque debajo del superpuesto correría a
  ciegas. `PAUSA` y las dos pausas automáticas —`visibilitychange` y `blur`—
  mueven un solo `paused` y un efecto se lo pasa al motor; terminada la partida
  no se reanuda nada, que resucitaría una nave muerta detrás del superpuesto.
  `REINTENTAR` llama a `restart()` sin volver a enseñar la carga. El nombre que
  firma la marca es el de la sesión o `INVITADO`, y el mando pinta deshabilitados
  los botones que la máquina no usa, en vez de esconderlos y descuadrar la
  rejilla de cinco.
- **Qué máquina entra lo decide `game-planner`**, el subagente de
  `.claude/agents/game-planner.md`. Es quien lee este apartado convertido en
  rúbrica: los siete criterios eliminatorios de
  `.claude/game-planner/rubrica.md` son el contrato de aquí —tres cifras de HUD,
  cinco botones, primitivas de canvas sin espera de assets, sin audio, un
  jugador, puntuación entera, todo dentro del closure de `mount()`—. Si un
  candidato falla uno, no entra. Y como cada categoría de `GameCategory` sin
  estrenar y cada escena libre de `lib/preview-art.ts` puntúan, el agente empuja
  hacia donde el catálogo tiene hueco.
- **Para añadir una máquina** son cuatro sitios: implementar `GameMount` en
  `lib/games/<juego>/`, añadir una línea a `ENGINES`, un literal a `GameId` con
  su entrada en `GAMES`, y una migración que la meta en `public.games`. Son
  **cinco** si hay escena archivada que mover en `lib/preview-art.ts`, que es
  como entraron `tetris`, `arkanoid` y `snake`. El
  teclado se coge de `lib/games/input.ts`
  (`createInput()`), que engancha `window` solo mientras hay partida y limita el
  `preventDefault` a las flechas y `Space`. Declara sus teclas vivas en
  `ENGINE_KEYS`, dentro de `components/game-pad.tsx`, y reparte sus dos botones
  de acción en `ENGINE_PAD`, que está al lado. Y añade su fila a
  `references/implemented-games.md`, que es la tabla que se consulta para saber
  qué hay implementado. **La piel no es uno de esos sitios**: la máquina entra
  con los colores que le dé la spec y la viste `skin-designer` después, que es lo
  que hace `/spec-impl-game` al cerrar.
- **`lib/preview-art.ts` guarda arte sin máquina.** Su `PreviewId` es
  `GameId | ArchivedPreviewId`, y `ArchivedPreviewId` son las escenas de las
  máquinas que salieron del catálogo en SPEC 07: eran ocho y hoy son **cuatro**,
  porque cuatro **se movieron** —salieron de `ArchivedPreviewId` y entraron por
  `GameId`, no se copiaron—: la que era una pantalla de Tetris al llegar
  SPEC 08; `muro` al llegar SPEC 09, que era una pantalla de Arkanoid y hoy es
  el `case "arkanoid"`; `serpiente` al llegar SPEC 10, hoy el `case "snake"`; y
  `corredor` al llegar SPEC 14, seis bandas horizontales que ya eran una
  travesía de carriles y hoy son el `case "frogger"`, con su aritmética intacta
  —el `case` sólo se renombró—. Ninguna de las cuatro
  que quedan tiene material en `references/started-games/`, pero eso ya no las
  descarta: Snake tampoco lo tenía y su motor se escribió entero. El `switch` de
  `drawPreview()` acaba en `id satisfies never`, así que una máquina nueva sin
  escena rompe `npx tsc --noEmit` en vez de dibujar otra cosa.
- **La pantalla nunca se sale de la ventana.** El marco de `PlayCabinet` limita
  su ancho a `calc((100svh - var(--av-chrome)) * var(--av-ratio))`: normalmente
  manda el ancho del gabinete, y cuando el alto no cabe manda la altura y el
  ancho la sigue, sin deformar nada. Sin eso, un mundo vertical como el de
  Tetris (420 × 600) obliga a hacer scroll para ver los dos extremos del
  tablero. El reparto es a medias y desde SPEC 11: el ratio lo sabe JavaScript,
  porque sale del `world` del motor y viaja en un `style` en línea; el
  presupuesto lo sabe CSS, porque cambia con la maquetación y un `style` en
  línea no entiende de `@media`. La constante `CABINET_CHROME` ya no existe.
  Los tres presupuestos están **medidos** contra la pantalla real, no
  estimados: el de escritorio arrastraba desde SPEC 05 los 16rem de cuando el
  gabinete no tenía ni `PIEL` ni fila de cinco botones, y con eso la pantalla
  se salía de la ventana unos 230px. Al cambiar algo de alto en esa columna
  —una fila más en el HUD, otro bloque bajo el gabinete, el relleno del
  `<main>` de `/jugar/[id]`— se vuelve a medir el presupuesto de la
  maquetación que lo tenga. Ojo con el relleno de abajo en escritorio: en una
  pantalla que ya no se desplaza, el aire del final no se ve pero lo paga el
  tablero, y por eso son 2rem y no los 5rem del resto del sitio.
- **La pantalla de juego tiene tres maquetaciones**, y las tres son sólo CSS:
  no hay detección de dispositivo en JavaScript ni estado que hidratar, y
  ningún motor se entera de que se está jugando con el dedo. `--av-chrome` es
  lo que cada una le resta a la ventana.

  | Maquetación                          | `--av-chrome` | Qué cambia                                                                                  |
  | ------------------------------------ | ------------- | ------------------------------------------------------------------------------------------- |
  | Escritorio                           | `28rem`       | la de siempre: HUD con `PAUSA`, gabinete, fila de cinco botones, controles y `PIEL`         |
  | Vertical de mano (`handheld`)        | `25rem`       | HUD en una línea y sin `PAUSA`, mando de consola bajo el tablero, sin los controles         |
  | Horizontal de mano (`handheld-wide`) | `8.5rem`      | gabinete en fila: cruz con `PAUSA`, tablero a `h-full`, `B`/`A` con `SALIR`; cabecera corta |

  Sólo `/jugar/[id]` declara `viewport` propio —escala fija y `viewportFit:
"cover"`—, así que el pellizco se pierde ahí y se conserva en las otras siete
  pantallas; a cambio, esa ruta rellena con `env(safe-area-inset-*)`. El
  `<main>` mide `100svh` menos `--av-play-header`, que es lo que ocupa
  `PlayHeader` con el dedo, y no se desplaza. Esa altura sólo manda porque con
  el dedo el `<main>` apaga su `flex-1` (`handheld:flex-none`, SPEC 13): `body`
  declara `min-h-full` sobre un `html` de altura automática, así que la cadena
  llega ahí indefinida y `flex-basis: 0%` se resuelve por contenido, con lo que
  crecer le ganaba al `height`. En vertical no se notaba —al tablero lo acota su
  `max-w`, que lee `100svh` directamente—, pero en horizontal el marco se
  quedaba sin nada contra lo que medir su `h-full` y la página se desplazaba casi
  mil píxeles. La fila de cinco botones es sólo de ratón y
  teclado: con el dedo, en las dos posturas, el mando es el de una consola. Los
  botones se pintan por eso **tres veces** en el DOM y CSS
  enseña un juego cada vez; el canvas, en cambio, se pinta una sola vez, y por
  eso girar el aparato no remonta el motor ni reinicia la partida.

- **Con el dedo el mando tiene tres bloques y ningún motor se entera**, que es
  lo que trajo SPEC 12: la cruz de cuatro flechas a la izquierda, `B` y `A`
  redondos a la derecha —`A` es la principal y va la última, bajo el pulgar— y
  en medio los dos botones de partida, `PAUSA` y `SALIR`, que con el dedo dejan
  de estar en el HUD y en `PlayHeader`. En vertical el centro va entre los otros
  dos bloques; en horizontal se reparte, `PAUSA` bajo la cruz y `SALIR` bajo
  `B`/`A`. `SALIR` no es un enlace ahí: pausa y abre `ExitOverlay`, el tercer
  superpuesto de la pantalla, porque en el centro del mando una salida
  accidental tira una partida y su marca.

- **El mando vive en `components/game-pad.tsx`**, y con él las cuatro tablas que
  dicen qué botón manda qué tecla: `PAD`, `CROSS_CELL`, `ENGINE_KEYS` y
  `ENGINE_PAD`, más el botón base `PadKey`. Salió del gabinete en SPEC 13, que
  son 900 líneas y orquestan la partida, no dibujan un mando. `play-cabinet.tsx`
  importa de ahí `PAD`, `ENGINE_KEYS` y `PadKey` para su fila de cinco de
  escritorio: una sola fuente, que duplicarlas es la forma segura de que un día
  digan cosas distintas. `GamePad` se monta una vez en vertical y **dos** en
  horizontal, con `side="left"` y `side="right"`.

- **Y desde SPEC 13 tiene aspecto de mando**, con la piel del prototipo de
  `references/gamepad-assets/`: chasis con doble borde y trama de puntos, cruz
  con relieve y flechas SVG, hub central con una gema que late (`animate-av-led`)
  y `B`/`A` redondos con halo y aro punteado. Cinco tokens `--av-pad-*` en
  `globals.css` para lo que se repite —las caras del chasis, la de un botón y el
  canto duro del relieve—; los degradados y halos de una sola aparición se
  quedan como valor arbitrario, que un token de un solo uso es un nombre que
  mantener sin nada que unificar. Las pieles viven en `PAD_SKIN`, con cuatro
  estados cada una (`base`, `rest`, `on`, `dead`) y escritas enteras: `A` y `B`
  son dos entradas y no una con el color interpolado, igual que los cuatro
  acentos del sitio. `row`, la de la fila de cinco de escritorio, no cambió.
  El chasis se parte en horizontal —`PAD_SHELL` es un `Record<PadSide, string>`—
  porque el tablero va en medio: cada mitad se redondea hacia fuera y deja recto
  el canto que mira al canvas. En vertical el ancho está contado y por eso el
  relleno lateral es de 4px y no los 22 del prototipo: en un teléfono de 360px el
  gabinete deja 328 útiles y los tres bloques piden 312. El hueco entre bloques
  lo reparte `justify-evenly`, que es lo que cede cuando algo aprieta; 44px de
  lado corto es suelo y no se toca.

  Qué manda cada botón de acción lo dice **`ENGINE_PAD`**, junto a `ENGINE_KEYS`
  y en el mismo archivo. No hay teclas nuevas: son las cinco de siempre,
  repartidas.

  | Máquina     | `B`                       | `A`                          |
  | ----------- | ------------------------- | ---------------------------- |
  | `asteroids` | `↑` propulsor             | `ESPACIO` disparar           |
  | `tetris`    | `ESPACIO` soltar de golpe | `↑` rotar                    |
  | `arkanoid`  | — apagado                 | `ESPACIO` lanzar la bola     |
  | `snake`     | — apagado                 | `ESPACIO` arrancar           |
  | `frogger`   | — apagado                 | `ESPACIO` salir de la orilla |

  La tabla vive en el mando y **no en `GameMount`** a propósito: qué hace cada
  tecla es del motor, pero cuál cae bajo qué pulgar es de interfaz, y llevarla al
  contrato obligaría a tocar las cinco máquinas. `lib/games/` no cambió ni una
  línea, ni en SPEC 12 ni en SPEC 13.

  Que la cruz conserve la flecha que también manda `B` es lo que obliga a
  **contar pulsaciones por tecla** en `PlayCabinet`: `↑` llega desde dos sitios
  a la vez y sólo se suelta cuando se levanta el último dedo. La cuenta se vacía
  al pausar, al terminar la partida y al reiniciar, para que ninguna tecla se
  quede pegada. Por eso todos los botones del mando —también los de
  escritorio— entran por `pressKey()` / `releaseKey()` y ninguno llama al
  `GameHandle` directamente.

  Y desde SPEC 13 **esa cuenta se pinta**: junto a la `ref` que cuenta vive un
  espejo en estado, `down`, con las teclas que están abajo, y un botón se dibuja
  hundido cuando lo está **su tecla**, venga del botón que venga. Con el
  `:active` de CSS, apretar `B` en Asteroids dejaba apagada la flecha `↑` de la
  cruz mientras el propulsor estaba encendido, y un mando que no dice la verdad
  es peor que uno feo. El espejo sólo se toca cuando una tecla cruza el cero, así
  que cuesta unos pocos renders por segundo —del orden de los que ya provoca
  `onState`— y nunca uno por frame; el canvas no se entera, porque `GameCanvas`
  monta en un efecto que depende sólo del `GameMount`. Vaciar la cuenta pasó por
  eso a `pauseRun()` y `togglePause()`, los puntos de origen de la pausa, y salió
  del efecto que habla con el motor: desde que vaciarla es cambiar estado,
  hacerlo en el cuerpo de un efecto encadena renders.

- `references/started-games/`, `references/source-assets/` y
  `references/templates/` son material de referencia: se leen, no se editan. Lo
  que sale de ahí se **copia** al repo —`public/snake/fruits.png` es el único
  caso hasta hoy—. La excepción es `references/implemented-games.md`, que no es
  material de origen sino un resumen del repo, y sí se mantiene al día. Ojo:
  `.prettierignore` excluye `references/` entera, así que ese archivo no pasa
  por el formateador y sus columnas se alinean a mano.

## Supabase

El proyecto está conectado a Supabase (`nlfwqnmidfdohuyhklqp`) desde SPEC 04, y desde SPEC 06 hay dos tablas: el marcador vive ahí. Desde SPEC 15 hay una tercera, `public.profiles`, y la sesión también es suya: en `localStorage` sólo quedan el identificador del navegador y la piel de cada máquina.

- **Qué cliente usar.** `@/lib/supabase/client` (`createBrowserClient`) en componentes con `"use client"`. `@/lib/supabase/server` (`createServerClient`) en Server Components, Server Actions y Route Handlers; su `createClient()` es **`async`** porque `cookies()` es una promesa en Next 16. El de servidor nunca se guarda en una variable de módulo: cada petición trae sus cookies.
- **Nadie lee `process.env` de Supabase fuera de `lib/supabase/env.ts`.** Ahí están `supabaseUrl()`, `supabasePublishableKey()`, `supabaseSecretKey()` —sin consumidor aún— e `isSupabaseConfigured()`, la única que no lanza. Ojo: Next solo sustituye `process.env.NEXT_PUBLIC_*` si la lectura es **literal**, así que un `process.env[nombre]` dinámico llegaría `undefined` al navegador.
- **Sin credenciales se falla, no se finge.** Al contrario que Resend en SPEC 03, pedir un cliente sin variables lanza un error que nombra la que falta. El repo sigue construyendo igual.
- **`lib/supabase/database.types.ts` es generado; no se edita a mano.** Se regenera con `npm run supabase:types` contra el proyecto enlazado.
- **`/api/supabase-health`** dice si hay conexión: `200 {ok:true}` o `503 {ok:false, reason}`. Nunca imprime claves.
- **`proxy.ts` está en la raíz y sólo refresca la sesión.** Llama a `auth.getUser()` y devuelve la respuesta con las cookies actualizadas; sin eso el token caducaría y el servidor acabaría viendo a un invitado donde hay una cuenta. **No protege rutas**: hoy no hay ninguna que lo pida y la documentación de Next avisa de que el proxy no es el sitio para la autorización. Su `matcher` excluye `_next/static`, `_next/image`, `favicon.ico` y `snake/fruits.png`, y si faltan las credenciales deja pasar la petición sin tocarla —lo contrario que `env.ts`, y a propósito: lanzar ahí tumbaría el sitio entero—.
- **Hay configuración que no está en el repo.** La autenticación por correo necesita, una vez, en el panel de Supabase: la confirmación de correo activada, la **Site URL** del despliegue y, en las **URLs de redirección**, `<origen>/auth/confirmar` para cada origen desde el que se pruebe (`http://localhost:3000` incluido). Sin eso el enlace del correo apunta a donde no debe. `.env.example` no cambia: la autenticación usa las tres variables de siempre.

## El marcador

Desde SPEC 06 las puntuaciones son **una sola tabla compartida**, no una copia por
navegador. `addScore()` ya no existe. Desde SPEC 07 **arranca vacío**: las noventa
marcas sembradas se borraron y se llena jugando. Ninguna máquina nueva se siembra:
SPEC 08 metió la fila de `tetris` en `public.games`, SPEC 09 la de `arkanoid` y
SPEC 10 la de `snake` y SPEC 14 la de `frogger` —la tabla tiene **cinco**, con
`sort_order` 0, 1, 2, 3 y 4—, y ni una marca en `public.scores`.

- **Qué vive en la base de datos y qué no.** `public.scores` son las marcas y
  `public.games` existe para que `scores.game_id` tenga una clave ajena real. El
  **catálogo sigue mandándolo `lib/games.ts`**: `games` se siembra desde él y
  nunca al revés, y la app no lee sus columnas —el título de una máquina sale de
  `getGame()`—. De los cuatro sitios que toca una máquina nueva, dos son éstos:
  el catálogo y una migración que la meta en `games` (ver «Motores de juego»).
- **Dos vistas acotan lo que viaja**: `top_scores` (top 10 por máquina, desempate
  por `created_at` ascendente) y `player_bests` (la mejor marca de cada nombre).
  Las dos con `security_invoker = true`, para que la RLS de `scores` siga
  aplicando.
- **`lib/leaderboard.ts` es sólo de servidor** (`import "server-only"`): ahí están
  `board`, `boards`, `bests`, `recentScores` y `topPlayers`. **Ninguna lanza**: un
  fallo devuelve **`null`** y el error se queda en la consola del servidor. Lo que
  sí vuelve a subir son las excepciones de control de flujo de Next, que se
  reconocen por su `digest`; tragárselas dejaría una página prerenderizada con el
  aviso de marcador no disponible pegado dentro.
- **`null` no es vacío.** `null` es «no se pudo preguntar»; la lista o el mapa
  vacíos son «se preguntó y no hay marcas». Con el marcador arrancando de cero, el
  vacío es el estado del día uno y enseñar ahí un aviso de avería sería mentir.
  Las pantallas que pintan tablas tienen **tres** estados:

  | Lo que llega | Qué se ve                                          |
  | ------------ | -------------------------------------------------- |
  | `null`       | `ScoreboardUnavailable` — `MARCADOR NO DISPONIBLE` |
  | `[]` o `{}`  | `ScoreboardEmpty` — `SE EL PRIMERO`                |
  | Filas        | La tabla                                           |

  Los dos avisos viven en `components/scoreboard-unavailable.tsx` y
  `components/scoreboard-empty.tsx`, y no comparten color ni movimiento a
  propósito: el magenta que pulsa es alarma, y el vacío no lo es. La portada y la
  biblioteca sí colapsan los dos casos, porque esconder la sección de actividad o
  pintar `—` vale igual en ambos.

- **`lib/scores.ts` es isomorfo**: sólo tipos y `formatScore()`. Lo importan tanto
  el servidor como los componentes de cliente.
- **Ningún componente consulta por su cuenta.** Las páginas resuelven las filas y
  las bajan por props con `mine: false`. Quién es el dueño lo decide el
  navegador, con el `useMine()` de `lib/session.tsx` (ver «Sesión y cuentas»):
  el servidor podría saberlo cuando hay cuenta, pero sin ella hace falta
  `localStorage`, y una marca no puede resaltarse de dos maneras según quién
  mire.
- **Escribir es la Server Action `app/jugar/[id]/actions.ts`**, no un `insert`
  desde el navegador: ahí se comprueba el `gameId` contra `GAMES` y se llama a
  `revalidatePath` de `/`, `/salon`, `/biblioteca` y la ruta concreta del juego.
  Desde SPEC 15, **con sesión el nombre no lo pone el cliente**: el
  `player_name` sale del `profiles.username` y el `user_id` de
  `auth.getUser()`, ignorando lo que llegue por parámetro —una Server Action es
  una URL pública que responde a cualquier POST—. Sin sesión se conserva el
  camino de siempre: nombre recibido, normalizado y validado, y `user_id` nulo.
- **`scores.user_id` se suma a `device_id`, no lo sustituye.** Es
  `on delete set null` y no `cascade`: si una cuenta desaparece, su marca sigue
  en el marcador con el nombre con el que se firmó —se pierde el dueño, no la
  puntuación—. La política de `insert` admite `user_id` nulo o el de quien esté
  autenticado, así que nadie firma con la cuenta de otro ni desde el navegador.
  Ojo con las vistas: `top_scores` se escribió con `s.*`, pero Postgres expande
  esa estrella al crearla, así que hubo que **recrearla** para que se enterara
  de la columna nueva; `player_bests`, que nombra las suyas, también.
- **Las cuatro pantallas que leen marcas se renderizan en cada visita**: la
  portada, la biblioteca y la ficha lo declaran con `dynamic = "force-dynamic"`;
  `/salon` no hace falta que lo declare, porque su `searchParams` ya la hace
  dinámica. Decirlo a las claras ahorra el intento de prerenderizar y abortar
  —el cliente de Supabase mira las cookies— y deja escrito por qué. Vacío con
  aviso; nunca marcas inventadas.
- **Las migraciones se aplican con `npx supabase db push`** y quedan en
  `supabase/migrations/`. Nada de `apply_migration` por MCP: iría al proyecto
  remoto sin dejar rastro en el repo. Se corrige hacia delante: SPEC 07 no
  revirtió la siembra de SPEC 06, añadió una migración que la borra.

## Sesión y cuentas

**Desde SPEC 15 la autenticación es real**: correo y contraseña de Supabase Auth,
con la sesión en cookies —`@supabase/ssr`—, así que el servidor ve lo mismo que el
navegador. Lo que **no** entra hasta la SPEC 16 es OAuth con Google y GitHub
—sus dos botones se quedan visibles y deshabilitados— y recuperar la contraseña.

- **El nombre de jugador es `public.profiles.username` y es único.** Lo crea un
  **trigger** sobre `auth.users` (`handle_new_user()`, `security definer`) desde
  `raw_user_meta_data->>'username'`, en mayúsculas y con formato
  `^[A-Z0-9_]{3,12}$`. Se crea ahí y no desde el cliente porque con la
  confirmación de correo activada `signUp()` no devuelve sesión y ese `insert` no
  tendría permiso; y porque si el nombre está cogido el trigger falla, el
  `insert` en `auth.users` se deshace y no queda una cuenta huérfana sin perfil.
  La tabla sólo tiene política de `select`: nadie escribe en ella desde la app.
- **Entrar y registrarse pasa por el navegador**, en `components/auth-panel.tsx`
  y no en una Server Action: `@supabase/ssr` escribe ahí las cookies que después
  lee el servidor, y `onAuthStateChange` mantiene el contexto al día sin
  recargar. `login()` **ya no está en el contexto**: entrar es una llamada de red
  que falla de cuatro maneras distintas y necesita dónde contarlo. El panel
  comprueba que el `username` esté libre **antes** de `signUp()` —cortesía, la
  garantía real es el `unique`— y traduce los errores de Supabase a rótulos del
  vault; el del trigger acaba en el mismo `ESE NOMBRE YA ESTA COGIDO`.
- **`app/auth/confirmar/route.ts`** es a donde apunta el enlace del correo: canjea
  `token_hash` con `verifyOtp()` y acaba en `/cuenta`, o en
  `/cuenta?error=confirmacion` si el enlace caducó o ya se usó. Es un Route
  Handler porque hay que escribir cookies, y el aviso lo resuelve la **página** y
  lo baja por props: el panel no lee la URL por su cuenta.
- **Un solo contexto**, `SessionProvider` de `lib/session.tsx`, montado en el layout raíz: la cabecera, `/cuenta` y `/jugar` leen el mismo usuario. `useSession()` lanza si no hay proveedor por encima. Dentro hay **dos estados y no uno**: `authUser` es lo que dice Supabase y `user` es lo que se pinta, que además necesita el `username` de `profiles`. Separarlos es lo que permite que el callback de `onAuthStateChange` sea síncrono —consultar la base de datos ahí dentro puede bloquearse contra el candado de auth— y que un refresco de token no vuelva a pedir el perfil.
- **`ready` se deduce, no se guarda**: el estado es `VaultUser | null | undefined` y `undefined` significa «aún no ha contestado Supabase». Hasta que `ready` sea `true` nadie pinta estado de sesión —el servidor no lo tiene y pintarlo antes sería un desajuste de hidratación—.
- **`useMine()` vive en `lib/session.tsx` y es la única regla de «esta marca es mía»**: con sesión manda la **cuenta** (`userId`), sin ella manda el **dispositivo** (`deviceId`), nunca las dos a la vez. La usan las tres tablas del marcador; estaba escrita tres veces y tres copias de una regla son tres sitios donde puede empezar a decir cosas distintas.
- **`lib/storage.ts` es el único que toca `localStorage`.** La clave sigue siendo `arcadevault:v1` y dentro ya sólo hay dos campos, `deviceId` y `skins`: SPEC 06 se llevó `scores` a Supabase y SPEC 15 se lleva `user`. Ninguna de las dos subió a `v2`, y a propósito: lo que se quita es un campo que deja de leerse, y estrenar clave habría borrado las pieles y el identificador de todo el mundo. Lo que un navegador viejo tenga guardado ahí se queda sin que lo lea nadie. `skins` se teclea `Record<string, SkinId>` y no `Record<GameId, SkinId>` para que este archivo no importe del catálogo. Todo va envuelto en `try/catch`: en modo privado la interfaz funciona igual, sólo que no persiste.
- **El nombre se normaliza igual en los tres sitios**: mayúsculas y 12 caracteres, en el registro del panel, en el `check` de la tabla y en la Server Action que guarda la marca de un invitado.
- **`deviceId()` puede devolver `undefined`.** `crypto.randomUUID()` sólo existe en contexto seguro, así que probando desde el móvil por `http://192.168.x.x` no está. La marca se guarda igual, sin dueño: se pierde un color en la tabla, no una puntuación. Con cuenta ya no importa, porque el dueño lo pone `user_id`.

## Contacto y Resend

El formulario de `/acerca-de` envía por la Server Action `app/(vault)/acerca-de/actions.ts`.

- **Sin `RESEND_API_KEY` el envío se finge**: se registra en la consola del servidor con un aviso explícito y se devuelve éxito, para que el repo se pueda clonar y demostrar sin cuenta de Resend. Es lo contrario de lo que hace Supabase, que lanza. En producción, si falta la variable el mensaje se pierde en silencio y sólo lo delata ese registro.
- **La acción revalida lo que el formulario ya comprobó**, porque una Server Action es una URL pública que responde a cualquier POST. Los topes son `LIMITS` de `lib/about.ts`, compartidos con el `maxLength` de los campos.
- **Hay un campo trampa** (`website`), invisible y fuera del tabulador: si viene relleno se responde éxito a propósito —un bot que recibe error reintenta; uno que se cree atendido, no—.
- El cliente de Resend se construye dentro de la acción, no en el módulo: su constructor exige la clave y a nivel de módulo reventaría el arranque de quien no la tiene. El remitente es el de pruebas (`onboarding@resend.dev`) y el correo del visitante viaja en `replyTo`, no en `from`.

## Herramientas del repo

- **`.claude/agents/game-planner.md`** es el eslabón de **antes** de la spec: un subagente que decide **qué** máquina entra. Reconstruye el catálogo desde `lib/games.ts`, puntúa entre cinco y ocho candidatos con los doce criterios de `.claude/game-planner/rubrica.md` —siete eliminatorios contra el contrato del motor, cinco ponderados— y devuelve una terna con un ganador y su ficha. **Para ahí**: no escribe specs ni código, y cierra con un `/spec-game <juego>` literal.
- **`.claude/game-planner/memoria.md`** es lo que hace que ese agente no se repita. Un subagente arranca en frío —no ve el hilo que lo llamó ni lo que se habló ayer—, así que cada candidato queda escrito ahí con su nota y su veredicto (`propuesta`, `no-encaja`, `descartada`, `aparcada`, `elegida`, `en-spec`, `implementada`, `desincronizada`). Se versiona en git a propósito, es el único archivo que el agente escribe, y **el repo manda sobre él**: si la tabla y `lib/games.ts` no coinciden, se corrige la tabla. Para que anote un veredicto tuyo, pásaselo literal («descarta Pong porque…»): entonces sólo reconcilia y escribe. Hoy la tabla **está desincronizada y lo estará hasta la próxima ronda**: `frogger` sigue como `propuesta` aunque su clave lleve en `GameId` desde SPEC 14, y `amidar` como `propuesta` con dos specs de jam escritas. Se corrige la tabla, nunca el repo. Nota: el CLI trae una memoria nativa de agente (`memory: project`); se descartó a propósito por ser de forma libre y de índice truncable, pero podría sumarse encima del ledger, nunca en su lugar.
- **`.claude/agents/game-jam.md`** es el subagente que desarrolla **la decisión de alcance**, una vez la máquina ya está decidida. **Se le da el juego** —«haz una jam de Galaga»— y escribe **dos specs alternativas de él**, `specs/game-jam/<game-id>/spec-minima.md` y `spec-completa.md`. **No elige la máquina**: eso es de `game-planner`, y sin argumento para y lo pide. De la máquina dada sólo comprueba que **cabe**, con la pasada eliminatoria C1-C7 de `.claude/game-planner/rubrica.md`; si falla un criterio en sus dos versiones, para y cita cuál. Antes de separar fija lo que las dos comparten —`id`, `title`, `cat`, `glow`, miniatura y `sort_order`—, así que lo único que varía es el alcance y se pueden comparar. Detecta solo si hay material en `references/started-games/` o `source-assets/`: con él las constantes se copian, sin él se fijan en cada spec como hizo SPEC 10. Las dos salen enteras, al nivel de las specs 09 y 10: ocho secciones, plan por pasos, criterios de aceptación sin marcar y riesgos. Va **del tirón**, sin preguntar. Es la decisión que más se pelea aquí —SPEC 08 dejó fuera 31 de las 45 features de su original— y hasta ahora se tomaba antes de saber qué costaba cada camino. **Las dos son excluyentes**: se implementa una, y sus dos `insert` llevan el mismo `id`. Sus specs **no llevan número** —la numeración de `specs/NN-*.md` está reservada para lo que sí se implementa— y salen en estado `Borrador de jam`; aprobar una significa mudarla a `specs/NN-<slug>.md`, y cerrar la hermana, antes de `/spec-impl-game`. Ha corrido dos veces: la jam de Frogger, que acabó en SPEC 14 con la versión completa, y la de Amidar, cuyas dos specs **siguen en borrador y esperan decisión**. **Lee `.claude/game-planner/memoria.md` para avisar de veredictos anteriores y nunca escribe en él**: el ledger es de `game-planner`.
- **`.claude/skills/spec-game/`** es una skill local del proyecto: `/spec-game` diseña la spec de una máquina nueva —motor, catálogo, miniatura, mando y migración— y la guarda en `specs/NN-<slug>.md` en estado `Borrador`. **No escribe código de juego**; implementar sigue siendo trabajo de `/spec-impl-game` con la spec ya aprobada por un humano. Sus dos apoyos son `contact-points.md` (los sitios que toca una máquina nueva) y `engine-contract.md`.
- **`.claude/skills/spec-impl-game/`** es la otra skill local, y es la que hoy cierra la cadena: `/spec-impl-game NN-slug` **no reemplaza a `/spec-impl`, lo especializa** para las specs que traen máquina. Sus fases 1, 2, 4 y 5 son las de `/spec-impl` —mismo bloqueo si el estado no significa «Aprobado», misma rama `spec-NN-slug`, mismo ritmo de un paso y una pausa—; lo que añade son tres: comprueba que la spec **trae máquina** (motor en `lib/games/<id>/`, línea en `ENGINES` y migración a `public.games`, las tres o para y remite a `/spec-impl`), pone una **puerta de verificación** con `tsc`, `lint` y `build` antes de llamar a nadie, y **encadena los dos subagentes que hasta ahora se pedían a mano y se olvidaban**: `skin-designer` sobre la máquina y después `mobile-porter` sobre `/juego/<id>`. **Uno detrás de otro y nunca en el mismo mensaje**: los dos escriben en el árbol y comparten el hook de formateo. Al terminar recuerda las tres cosas que son de humano —cambiar el estado de la spec, el commit final y firmar la pantalla en un teléfono de verdad—. Es la skill donde está escrito, además, que las specs de `specs/game-jam/` **no cuentan**: no llevan número y por definición no están aprobadas.
- **`.claude/agents/skin-designer.md`** es el subagente que se ocupa del **vestido** de las máquinas, y es transversal a la cadena anterior: no decide qué máquina entra ni con qué alcance, sino que comprueba que cada motor de `ENGINES` tenga sus **tres skins obligatorias** —`clasico` (la paleta que el motor ya tiene hoy, extraída del código y no rediseñada), `neon` (sólo tokens `--av-*`) y `retro` (fósforo verde monocromo, donde las entidades se distinguen por brillo y no por tinte)—, diseña hex por hex las que falten y **las aplica al código de la máquina que se le diga**. Es el único agente del repo que escribe en `lib/` y `components/`, y por eso va acotado: **una máquina por invocación**, y verifica con `tsc` y `lint` antes de responder. Lo que lo hace fiable es que **inventaria las ranuras de color leyendo el código**, incluidas las que no están en `constants.ts` —los literales sueltos de `asteroids/entities.ts`, el `"#000"` de fondo, el brillo de `tetris/board.ts`—, que una auditoría a ojo se deja. Sus tres apoyos son `contrato-skin.md` (qué es una skin y las ocho reglas S1-S8), `aplicar-skins.md` (la receta de la aplicación: qué archivos, con qué forma) y el ledger `skins.md`, que lleva el control de qué máquina está vestida y se versiona como la memoria de `game-planner`. **Su trabajo de fondo está hecho**: las quince filas —cinco máquinas por tres pieles— están en `aplicada`, y la serie del halo se cerró con Frogger; lo que queda es veredicto humano, porque `aplicada` no es aprobada. Ojo con lo que **no** toca: `components/game-canvas.tsx`, nunca, porque su efecto de montaje depende sólo de `[game]` y meter ahí la skin reiniciaría la partida al cambiarla; la skin viaja por el `GameHandle` que el gabinete ya guarda.
- **El sistema de skins es aditivo y opcional a propósito**, y hoy lo usan las cinco máquinas (los detalles, en «Motores de juego»). `lib/games/skins.ts` tiene el vocabulario y el contrato gana dos campos **opcionales**: `GameMount.skins` y `GameHandle.setSkin()`. Que sean opcionales es lo que permitió vestirlas de una en una, y lo que permitirá que la sexta entre sin vestir; `mount()` nunca cambió de firma. La skin activa vive en el closure de `mount()` —en el ámbito de módulo de un motor sigue sin haber una variable mutable— y el default es `clasico`, así que estrenar el sistema no cambió el aspecto de ninguna partida.
- **`.claude/agents/mobile-porter.md`** es el que se ocupa de que el sitio **se vea y se toque en un teléfono**, y es el **segundo agente que escribe en `app/` y `components/`** —`skin-designer` escribe en `lib/`—. Su alcance son las **nueve piezas** que las SPEC 11 y 12 dejaron fuera: las siete pantallas que no son `/jugar/[id]`, más `SiteHeader` y `SiteFooter`. La pantalla de juego **no es suya**: ya está portada, sigue con diez criterios sin firmar, y sólo la lee para copiar patrones. Audita, **mide en Chrome a 390 y a 360** —que no es un lujo: `html { overflow-x: hidden }` de `globals.css` hace que un desbordamiento no dé scroll lateral sino recorte silencioso, así que a ojo no se ve—, escribe el arreglo de **una pantalla por invocación** y verifica con `tsc`, `lint` y `build`. Sus tres apoyos son `reglas-movil.md` (las doce reglas M1-M12, eliminatorias y sin nota ponderada), `portar-pantalla.md` (los ocho patrones y los ocho pasos de verificación) y el ledger `pantallas.md`, con dos tablas —Pantallas y Defectos— y una columna `cadena` en vez de fiarse del número de línea, porque el hook de Prettier los mueve. **Va por la mitad**: `Pie` y `Ficha` están en `adaptada`, `Cabecera` en `en-curso` —con un M2 y un M4 que se bloquean entre sí y piden una decisión humana, porque subir la marca a 44px crecería la cabecera en escritorio y movería el `100svh-61px` escrito a mano en la Portada—, cinco pantallas siguen sólo `auditada` y el 404 sin auditar. Los dos únicos defectos `critico` del repo están en el Salón. Lo que **no** toca: `lib/games/`, `/jugar/[id]`, `components/play-*.tsx`, el texto editorial, y nada de PWA, manifiesto ni service worker —el alcance es el navegador de un teléfono y nada más—. Y hay un estado que **no puede poner nunca**: `firmada`, que es de un dedo sobre un aparato; él llega a `adaptada`.
- **`.claude/agents/game-performance-booster.md`** es el que se ocupa de **lo que cuesta un frame**, y es el **tercer agente que escribe código** —`skin-designer` en `lib/games/<juego>/`, `mobile-porter` en `app/` y `components/`, y éste otra vez en `lib/games/<juego>/`, pero en su bucle y no en su paleta—. Su alcance son los **cinco motores** y nada más. Audita el código, **mide el frame time en Chrome con la partida corriendo** —inyectando un parche de `requestAnimationFrame` desde la consola, que no entra en el repo: un contador de FPS dentro de `lib/games/` acabaría emitiendo por frame hacia el HUD y costaría más que lo que se gana—, escribe la optimización de **un motor por invocación** y verifica con `tsc`, `lint`, `build` y **una segunda medición**. Sus tres apoyos son `reglas-rendimiento.md` (las doce reglas R1-R12, eliminatorias y con el presupuesto de frame en una tabla), `optimizar-motor.md` (el instrumento, el escenario de medición con su guion de teclas por máquina, los cinco patrones y los ocho pasos de verificación) y el ledger `motores.md`, con **tres** tablas —Motores, Hallazgos y Mediciones—, la misma columna `cadena` que `mobile-porter` y una regla propia: **una medición nunca se sobrescribe**, porque es lo único que deja ver una regresión. **Los cinco están auditados y sólo `tetris` está `optimizado`**: seis hallazgos cerrados, cuatro ventanas de veinte segundos y un p95 de 0,70 a 0,60 ms en `neon`. De ahí salieron dos cosas que valen para las rondas siguientes: que la ganancia honesta se mide en banco aislado y no en partida —Tetris ya cabía holgadísimo en su presupuesto—, y que **R12 gana a un patrón de la receta**: agrupar el halo por color dejaba 23 escrituras de estado en vez de 75, pero movía el 9,14% de los píxeles, así que se descartó. Los otros cuatro motores tienen 20 hallazgos abiertos, tres de ellos `critico`. Lo que **no** toca: `lib/games/engine.ts`, `lib/games.ts` —donde viven `tint()`, `glow()` y `noGlow()`, que llaman los cinco motores desde su bucle—, los `skins.ts` de las máquinas, `components/`, `app/`, y ni una constante de equilibrio: `git diff` de `constants.ts` sale vacío, con la única excepción de un tope nuevo donde no había ninguno. Y hay un estado que **no puede poner nunca**: `firmado`, que es de alguien jugando en un aparato de verdad; él llega a `optimizado`.
- **`.mcp.json`** declara el servidor MCP de Supabase apuntando al proyecto `nlfwqnmidfdohuyhklqp`. Sirve para consultar e inspeccionar; las migraciones siguen yendo por `npx supabase db push` (ver «El marcador»).
- **`.env.example`** documenta las cinco variables: `RESEND_API_KEY`, `SUPABASE_DB_PASSWORD` y las tres de Supabase. Al añadir una variable nueva, se añade ahí.
- **`demos/demo.tsx`** no forma parte de la app: nadie lo importa y no cuelga de ninguna ruta.

# Skills

Usa siempre `/frontend-design` para diseñar interfaces de usuario.

Para una máquina nueva del vault la cadena son tres eslabones, y ninguno se salta
(ver «Herramientas del repo»): el subagente `game-planner` decide **cuál**, la skill
local `/spec-game` escribe su spec y `/spec-impl-game` la implementa y, al terminar,
llama a `skin-designer` y después a `mobile-porter`. Si el juego ya está elegido, se
entra por `/spec-game`; escribir el motor directamente, nunca. `/spec-impl` se queda
para las specs que **no** traen máquina, como la 11, la 12 y la 13.

Al margen de esa cadena está el subagente `game-jam`, que entra **entre el primer y
el segundo eslabón**: con la máquina ya decidida, se le da el juego y deja dos specs
de borrador de esa misma máquina —`spec-minima.md` y `spec-completa.md`, en
`specs/game-jam/<game-id>/`— para leer y elegir el alcance. No elige la máquina, no
implementa ninguna, y la que se apruebe vuelve al flujo normal mudándose a
`specs/NN-<slug>.md`.

Y fuera de la cadena entera está el subagente `skin-designer`, que no mira **qué** máquina
entra sino **cómo va vestida**: se invoca cuando hay que saber qué skins tiene una máquina,
cuando entra una nueva y hay que comprobar que trae sus tres —`clasico`, `neon` y `retro`— o
cuando hay que vestir una máquina concreta: «aplícale los skins a Snake». Audita, diseña,
**escribe el código** de esa máquina y lleva el control en `.claude/skin-designer/skins.md`.
Es la excepción a que el código entre por `/spec-impl`, y está acotada a lo que es: color, una
máquina por ronda y con el type-check pasado.

Y también fuera de la cadena, el subagente `mobile-porter`, que no mira las máquinas sino **el
sitio que las rodea**: se invoca cuando algo se ve mal en un teléfono, cuando se pregunta qué
pantallas quedan por adaptar, o cuando hay que arreglar una concreta —«el salón se ve fatal en el
móvil», «pasa la biblioteca a móvil»—. Audita, mide en Chrome a 390 y a 360, **escribe el
arreglo** de esa pantalla y lleva el control en `.claude/mobile-porter/pantallas.md`. Es la
segunda excepción a que el código entre por `/spec-impl`, y va igual de acotada que la primera:
una pantalla por ronda, contra reglas escritas, sin tocar `/jugar/[id]` ni `lib/games/`, y con
`tsc`, `lint` y `build` pasados.

Y el tercero fuera de la cadena, el subagente `game-performance-booster`, que no mira **qué**
máquina entra ni **cómo va vestida** sino **lo que cuesta pintarla**: se invoca cuando un juego va
a tirones, cuando se pregunta qué motor consume más o cuál falta por medir, o cuando hay que
acelerar uno concreto —«Tetris va lento en el móvil», «optimiza Frogger»—. Audita el código, mide
el frame time en Chrome con la partida corriendo, **escribe la optimización** de ese motor y lleva
el control en `.claude/game-performance-booster/motores.md`. Es la tercera excepción a que el
código entre por `/spec-impl`, y va igual de acotada que las dos primeras: un motor por ronda,
contra reglas escritas, sin tocar `engine.ts`, `lib/games.ts`, los `skins.ts` ni `components/`, y
con `tsc`, `lint`, `build` y **una segunda medición** pasados. Su límite es el de su oficio: la
partida se juega con los mismos números que antes, así que lo único que cambia es lo que cuesta un
frame.

## Next.js 16: diferencias que rompen suposiciones previas

`AGENTS.md` lo exige y va en serio — consulta `node_modules/next/dist/docs/` antes de escribir código. Puntos que más suelen fallar por memoria desactualizada:

- **Middleware ya no existe con ese nombre**: es `proxy.ts` (misma funcionalidad). Ver `01-app/01-getting-started/16-proxy.md`.
- **`params` y `searchParams` son Promises** en `page`/`layout`/`route`: hay que hacer `await` (Server Components) o `use()` (Client Components).
- Existen helpers de tipos globales generados por ruta: `PageProps<'/blog/[slug]'>`, en lugar de tipar props a mano.
- Directivas de caché nuevas: `use cache`, `use cache: private`, `use cache: remote` (`01-app/03-api-reference/01-directives/`).

Rutas útiles de la documentación local:

- `01-app/01-getting-started/` — tutoriales por tema (layouts, data fetching, caching, route handlers, metadata).
- `01-app/03-api-reference/03-file-conventions/` — semántica exacta de `page`, `layout`, `route`, `error`, `loading`, rutas dinámicas/paralelas/interceptadas.
- `01-app/03-api-reference/05-config/01-next-config-js/` — un archivo por opción de `next.config.ts`.
