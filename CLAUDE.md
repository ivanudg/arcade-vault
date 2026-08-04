# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

**Arcade Vault**: plataforma para jugar online y competir por la mayor cantidad de puntos. Actualmente el repo es el scaffold inicial de `create-next-app` (solo `app/layout.tsx` + `app/page.tsx`); la mayor parte del producto está por construirse.

El flujo de trabajo del proyecto es **Spec Driven Design** vía las skills `/spec` y `/spec-impl` de [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Antes de implementar una feature nueva, espera/produce la spec correspondiente en lugar de escribir código directamente.

No hay framework de tests configurado. Si se añade uno, documenta aquí cómo correr un test individual.

## Stack y convenciones

- **Next.js 16.2.12 (App Router) + React 19.2 + TypeScript strict + Tailwind CSS v4.**
- Alias de imports: `@/*` apunta a la raíz del repo (`@/app/...`, no hay `src/`).
- Tailwind v4 se configura **en CSS**, no en `tailwind.config.js`: los tokens viven en el bloque `@theme inline` de `app/globals.css`, alimentados por variables CSS de `:root`. Para añadir colores/fuentes del tema, edítalo ahí. PostCSS solo carga `@tailwindcss/postcss`.
- Las fuentes se cargan con `next/font/google` en `app/layout.tsx` y se exponen como variables CSS (`--font-press-start` para Press Start 2P, `--font-courier-prime` para Courier Prime) enlazadas al tema de Tailwind (`font-display`, `font-mono`/`font-sans`).
- El tema es **dark-only**: los tokens `--av-*` de `app/globals.css` derivan de `references/templates/` (paleta neón `#00f5ff` / `#ff006e` / `#f5ff00` sobre `#0a0a0f`). No hay variante clara ni theme switcher; no uses variantes `dark:`.
- Los efectos CRT del template son utilidades propias en `globals.css`: `av-glow-*`, `av-halo-*`, `av-grid-floor`, `av-scanlines`, `av-vignette`, y las animaciones `animate-av-*` (fade, slide, row, caret, spin, sweep, cabinet, pulse, flicker, grid).
- `next.config.ts` está vacío: cualquier flag (p. ej. `cacheComponents`) es una decisión nueva, no algo ya asumido.

## Motores de juego

Desde SPEC 05 hay **una** máquina que se juega de verdad, `asteroids`. Las otras
ocho siguen siendo escaparate: escena congelada de `drawPreview()` y HUD leído de
`lib/demo-run.ts`, que por eso es un `Partial<Record<GameId, DemoRun>>`.

- **El contrato vive en `lib/games/engine.ts`**: `GameMount` (un `world` estático
  con el tamaño lógico y `mount(canvas, callbacks)`) y el `GameHandle` que
  devuelve, con `start`, `pause`, `resume`, `restart`, `destroy` y el
  `press`/`release` que usa el mando táctil. Los callbacks son `onState`, que
  solo se emite cuando cambia alguna de las tres cifras del HUD, y `onGameOver`.
- **`lib/games/engines.ts` es el registro**: `ENGINES[game.id]` es lo que consulta
  `PlayCabinet` para decidir entre jugar y enseñar la escena congelada.
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
- **Para añadir un motor**: implementar `GameMount` en `lib/games/<juego>/` y
  añadir una línea a `ENGINES`. El teclado se coge de `lib/games/input.ts`
  (`createInput()`), que engancha `window` solo mientras hay partida y limita el
  `preventDefault` a las flechas y `Space`. Si la máquina estrena motor, quita su
  entrada de `DEMO_RUN` y declara sus teclas vivas en `ENGINE_KEYS`, dentro de
  `components/play-cabinet.tsx`.
- `references/started-games/` es material de referencia: se lee, no se edita.

## Supabase

El proyecto está conectado a Supabase (`nlfwqnmidfdohuyhklqp`) desde SPEC 04, pero **todavía no hay ni una tabla**: la persistencia sigue en `localStorage` a través de `lib/storage.ts`. No inventes esquema; eso llega en su propia spec.

- **Qué cliente usar.** `@/lib/supabase/client` (`createBrowserClient`) en componentes con `"use client"`. `@/lib/supabase/server` (`createServerClient`) en Server Components, Server Actions y Route Handlers; su `createClient()` es **`async`** porque `cookies()` es una promesa en Next 16. El de servidor nunca se guarda en una variable de módulo: cada petición trae sus cookies.
- **Nadie lee `process.env` de Supabase fuera de `lib/supabase/env.ts`.** Ahí están `supabaseUrl()`, `supabasePublishableKey()`, `supabaseSecretKey()` —sin consumidor aún— e `isSupabaseConfigured()`, la única que no lanza. Ojo: Next solo sustituye `process.env.NEXT_PUBLIC_*` si la lectura es **literal**, así que un `process.env[nombre]` dinámico llegaría `undefined` al navegador.
- **Sin credenciales se falla, no se finge.** Al contrario que Resend en SPEC 03, pedir un cliente sin variables lanza un error que nombra la que falta. El repo sigue construyendo igual.
- **`lib/supabase/database.types.ts` es generado; no se edita a mano.** Se regenera con `npm run supabase:types` contra el proyecto enlazado.
- **`/api/supabase-health`** dice si hay conexión: `200 {ok:true}` o `503 {ok:false, reason}`. Nunca imprime claves.
- **No existe `proxy.ts`** y no hay autenticación real. Entra en la spec que traiga el login.

# Skills

Usa sempre /frontend-design para diseñar interfaces de usuario

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
