# Cómo se porta una pantalla

La receta de la Fase 5: con qué patrón se arregla cada defecto y cómo se mide antes y después.
**Se lee justo antes de tocar código, no antes.**

Existe porque el agente porta **una pantalla por invocación** y el chrome es de todas. Si cada
ronda improvisara su propia solución, la segunda pantalla no encajaría con la primera y el repo
acabaría con cinco formas de resolver la misma fila que no cabe. Aquí está decidido de
antemano, y por eso la Fase 5 es mecánica.

**Lo que manda es lo que hay en disco.** Los patrones de abajo no son ideas: son líneas
concretas de este repo que ya funcionan. Se copian.

---

## El reparto: qué es de todas y qué es de una

| Alcance  | Archivos                                                                      | Cuándo se escribe                                      |
| -------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| De todas | `components/site-header.tsx`, `components/site-footer.tsx`, `app/globals.css` | En la ronda de la **primera** pantalla que lo necesite |
| De una   | El `page.tsx` de la pantalla y los componentes que sólo ella monta            | Cada vez que portas una                                |

Las tres primeras las comparten las nueve piezas: **un error ahí rompe pantallas que no estabas
tocando**. Por eso el cambio es aditivo —una variable nueva en `:root`, una variante `sm:` sobre
un valor base que se conserva— y nunca una reescritura.

De `app/globals.css` **sólo se toca `:root`, y sólo para añadir**. Ni las dos `@custom-variant`
de `:195-196`, ni `--av-play-header` de `:59`, ni el `html { overflow-x: hidden }` de
`:176-178`, que está ahí para contener la rejilla del fondo y quitarlo la desnuda.

Y `app/not-found.tsx` es una trampa conocida: **monta `SiteHeader` y `SiteFooter` por su
cuenta** (`:22` y `:46`) porque vive fuera del grupo `(vault)`. Un arreglo de
`app/(vault)/layout.tsx` no llega ahí.

---

## P1 · Los ocho patrones, uno por clase de defecto

Cada fallo tiene su patrón, y **no se improvisa otro**. Si un defecto no encaja en ninguno de
los ocho, es que la receta se queda corta: se para y se cuenta.

### P1.1 · Una fila que no cabe → el reflow de `activity-feed`

Para M2 y M3. Es el patrón más importante de este archivo, porque es el que arregla el único
defecto `critico` del repo.

`components/activity-feed.tsx:59` lo tiene escrito entero:

```tsx
className =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 ... sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]";
```

y sus hijos llevan `order-3` (`:66`) y `order-4` (`:72`) con su `sm:order-none`. Las tres piezas
son inseparables:

1. **La plantilla estrecha es la base**, y la ancha va bajo `sm:`. Al revés sería móvil-último y
   rompería M8.
2. **Las columnas que sobran bajan de línea con `order-N`**, no se esconden. La rejilla las
   coloca en la segunda fila implícita.
3. **`sm:order-none` las devuelve a su sitio**, que es lo que hace que M10 se cumpla sola.

El `gap-y-1` es lo que separa las dos líneas cuando existen y no hace nada cuando no.

### P1.2 · Una rejilla de tarjetas → `auto-fill` con `minmax`

Para M2 sin reflow. `components/library-browser.tsx:73`:

```tsx
grid-cols-[repeat(auto-fill,minmax(268px,1fr))]
```

Aguanta hasta 296px de ventana sin una sola variante, y es la prueba viva de M9: una pantalla
entera de responsividad con cero puntos de corte. El número que se elige es el que hace que
`umbral − relleno ≥ N`; con 268 y el `px-[clamp(14px,3vw,40px)]` del `<main>`, el suelo son 296. `auto-fit` y `auto-fill` no son lo mismo: con una sola tarjeta, `auto-fit` la estira a todo
el ancho y `auto-fill` la deja de su tamaño.

### P1.3 · Un texto que crece sin techo → `minmax(0,1fr)` + `truncate` + `min-w-0`

Para M2. `components/top-players.tsx:63` es el modelo: `grid-cols-[38px_minmax(0,1fr)_auto]`,
con `truncate` en el nombre y `flex-none` en lo que no debe encoger.

Las tres piezas, y las tres hacen falta: **`minmax(0,1fr)`** y no `1fr` a secas, porque el
mínimo por defecto de una pista es `auto` y eso impide que encoja; **`min-w-0`** en el hijo, por
lo mismo un nivel más abajo; y **`truncate`** en el que se corta, que sin los dos anteriores no
llega a activarse nunca.

**`flex-none` sobre algo que vive en una pista estrecha es un defecto, no un patrón.** Es
exactamente `hall-of-fame.tsx:116`: la insignia mide 112px y no cede, así que se sale. La salida
es bajarla de línea con P1.1, no quitarle el `flex-none` para que se aplaste.

### P1.4 · Un panel suelto → `w-[min(100%,Npx)]`

Para M2 y M9. `components/auth-panel.tsx:37-39`: `w-[min(100%,440px)]` con
`p-[clamp(22px,4vw,36px)]`. Ancho máximo dentro y relleno que encoge solo. No necesita ninguna
variante y por eso `/cuenta` es la pantalla más sana del repo.

Recuerda la convención de la casa: **el ancho máximo va dentro y el relleno fuera**. Las
plantillas de `references/` miden en `content-box`; con el `border-box` de Tailwind, juntar
ancho y relleno en el mismo elemento encoge la rejilla.

### P1.5 · Un objetivo táctil pequeño → `min-h-11`, y punto

Para M4. Se le añade `min-h-11` al elemento pulsable —y `min-w-11` si es cuadrado, como el
hamburguesa—, **sin `pointer-coarse:` y sin tocar su relleno**.

`min-h-11` no mueve nada que ya pase de 44px, así que en la mayoría de los sitios el `git diff`
es de una clase y el aspecto de escritorio no cambia. Cuando el elemento es un `flex` o un
`grid`, suele hacer falta `items-center` para que el contenido no se quede arriba; cuando es un
`<a>` en línea, `inline-flex items-center`.

El precedente está en `components/game-pad.tsx:335-336` con su comentario —ahí se mudó en la
SPEC 13, ya no está en `play-cabinet.tsx`—, y ya hay uno fuera de la pantalla de juego: los
campos de `contact-form.tsx` llevan `h-11`.

**Y cuando el `min-h-11` deja la fila sin sitio, lo que cede es el hueco.** Es lo que hizo la
SPEC 13 en un teléfono de 360px: `justify-evenly` en vez de `between` y el relleno lateral del
chasis de 22px a 4, con el tamaño de los botones intacto (`game-pad.tsx:513`). El orden es
`gap` → relleno → nunca el objetivo táctil; si con los tres no cabe, es un M3 y se aplica P1.1.

### P1.6 · Una letra por debajo de su suelo → la escala del tema

Para M5. Los seis tokens `--text-av-*` del `@theme inline` (`app/globals.css:103-108`) son el
mecanismo. Un `clamp()` nuevo se escribe **ahí**, no en línea, y sólo si ninguno de los seis
sirve.

El caso concreto de hoy es distinto y más simple: `components/auth-panel.tsx:16` lleva
`text-[14px]` en `FIELD` y **eso hace que iOS Safari amplíe la página al enfocar el campo**. La
salida es dejarlo en 16px, que es lo que `contact-form.tsx:27` hace ya sin declarar nada. No es
una decisión de diseño: por debajo de 16 el navegador amplía y no devuelve.

### P1.7 · Un alto de barra a mano → una variable en `:root`

Para M6. La forma es la de `--av-play-header` en `app/globals.css:59`: la variable se declara en
`:root`, el elemento que la mide se la fija como su altura, y el hermano se la resta.

```css
:root {
  /* Lo que ocupa SiteHeader, que es hermano del <main> de las siete pantallas
     y por eso sólo puede comunicarse con él a través de la raíz. */
  --av-site-header: 3.8125rem;
}
```

```tsx
// La cabecera:  h-[var(--av-site-header)]
// El hero:      min-h-[calc(100svh-var(--av-site-header))]
```

**Y el orden importa**: la variable no se puede escribir hasta que la cabecera deje de envolver
a dos líneas, porque hasta entonces su altura no es un número. Primero M2 sobre `SiteHeader`,
después M6 sobre el hero.

Unidades: `svh` sí, `vh` no, `dvh` no para un `min-h`. Está razonado en M6.

### P1.8 · Un borde de pantalla → sumar el inset, nunca sustituir

Para M7. La forma es la de `app/jugar/[id]/page.tsx:69`:

```tsx
pb-[calc(2rem+env(safe-area-inset-bottom))]
px-[calc(clamp(14px,3vw,40px)+env(safe-area-inset-left))]
```

El relleno que ya había **se conserva dentro del `calc()`**. En Android y en escritorio el inset
vale 0 y la diferencia es exactamente ninguna, que es lo que hace este cambio seguro.

Los tres sitios que hoy lo necesitan: `site-header.tsx:84` (arriba y los dos lados, por
`sticky top-0`), `site-footer.tsx:49` (abajo, hoy `pb-8.5` a secas) y el cajón de
`site-header.tsx:176` (los cuatro, por `inset-y-0 right-0`).

---

## P2 · Las ocho reglas de la aplicación

1. **Una pantalla por ronda.** Con una excepción: `SiteHeader` y `SiteFooter` se arreglan en la
   ronda de la primera pantalla que los necesite, porque son el chrome de todas y aplazarlos
   deja una pantalla adaptada con la cabecera rota encima. Esa ronda toca tres filas del ledger
   y lo dice.
2. **Un `Edit` por defecto, y nunca dos reglas en el mismo `Edit`.** Un `git diff` donde M2 y M4
   se pisan no se puede revisar ni revertir por separado.
3. **Nunca se interpola un nombre de clase.** Tailwind sólo ve las cadenas escritas enteras, y
   por eso cada componente declara su `Record<Accent, string>` con las clases completas. Una
   variante construida con una plantilla no existe en el CSS generado.
4. **Una utilidad no se anula con otra puesta después: quien decide es el orden de la hoja de
   Tailwind, no el del `className`.** Lo pagó la SPEC 13 en su repaso final —`before:border-r-0`
   no le gana a `before:border`, y el borde interior del chasis se quedó cerrado por el lado que
   no debía— y lo dice también el comentario de `game-pad.tsx:337-339`. **Se declara lo que se
   quiere, no se resta lo que sobra**: `before:border-y before:border-l` en vez de
   `before:border before:border-r-0`; `px-3 pt-2 pb-0` en vez de `p-3 pb-0`. Y si dos ramas son
   excluyentes, son un ternario, no dos clases superpuestas.
5. **El texto editorial no se toca.** Vive en `lib/landing.ts`, `lib/about.ts` y `lib/games.ts`.
   Acortar una etiqueta para que quepa es editar copia, y eso es otra decisión y otra persona.
6. **MAYÚSCULAS y sin tildes** en lo que se pinte en Press Start 2P; los cuerpos en Courier
   Prime sí llevan su acentuación. El único no-ASCII admitido es `·`.
7. **El ancho máximo va dentro y el relleno fuera.**
8. **Si un defecto no cabe en las doce reglas ni en los ocho patrones, paras y lo cuentas.** Una
   forma nueva es una decisión, y las decisiones no se toman a mitad de un `Edit`.

---

## P3 · La verificación, y no es opcional

Ocho pasos. Los tres primeros van **antes** de tocar nada, para que exista un «antes» contra el
que comparar; sin eso M10 no se puede comprobar.

**V0 · El servidor.** `npm run dev`. Si ya hay uno en el 3000, se reutiliza; nunca se levanta un
segundo.

**V1 · Las tres puertas.** `npx tsc --noEmit`, `npm run lint` y `npm run build`, en ese orden y
antes de mirar nada en el navegador: **una captura de una página que no compila es una mentira
bien encuadrada.**

**V2 · Los tres anchos, y el «antes».** `resize_window` a 1280×900, 390×844 y 360×780, en ese
orden, con una captura de cada uno. Y la advertencia sin la cual esto no vale: **`resize_window`
mide la ventana, no la vista.** Se lee `window.innerWidth` con `javascript_tool` y se corrige
hasta que dé **exactamente 390 y exactamente 360**. A 32px de diferencia, la columna JUGADOR del
salón pasa de 32px a 2px: el error de medida se come el hallazgo.

**V3 · El desbordamiento, medido y no mirado.** El paso más importante, y el que una captura no
puede dar porque `globals.css:176-178` lo esconde. Un `javascript_tool` por ancho que recorra el
DOM y devuelva cada nodo con `getBoundingClientRect().right > innerWidth` o `.left < 0`, con su
etiqueta, sus clases y su rect. **Esa lista es la evidencia de M1 y M2. No hay otra.**

En el mismo paso, `documentElement.scrollWidth` contra `clientWidth` —el desbordamiento del
conjunto, que a veces no tiene un nodo culpable— y, si la pantalla ató algo a `100svh`,
`scrollHeight` contra `innerHeight`. Lo segundo lo enseñó la SPEC 13: el `<main>` de
`/jugar/[id]` declaraba su altura y **se desplazaba casi mil píxeles igual**, porque un `flex-1`
por encima la ganaba. Una altura escrita no es una altura aplicada, y la diferencia sólo la dice
el número.

**V4 · Los objetivos táctiles, computados.** Otro `javascript_tool`: `a, button, input, select,
textarea, [role=button]`, visibles, filtrados por `Math.min(width, height) < 44`, imprimiendo el
lado corto y el texto. Es método de la casa: la SPEC 12 firmó su criterio de 44px exactamente
así.

**V5 · La letra, computada.** `getComputedStyle().fontSize` de todo lo que lleve `font-display`,
y de todo `input` y `textarea` —éstos para cazar los que estén por debajo de 16px, que es el
defecto de `auth-panel.tsx:16`—.

**V6 · El reflow, a ojo.** Ahora sí: capturas a 390 y a 360, más `get_page_text` a los dos
anchos para comprobar que **no ha desaparecido texto** entre uno y otro, que es como se caza un
`hidden` colado (M3). Lo que una captura sí sabe decir es si la segunda línea de una fila se lee
como una segunda línea o como un amasijo.

**V7 · El cajón.** A 390, pulsar el hamburguesa; captura; leer
`getComputedStyle(document.body).overflow`, que tiene que ser `hidden`; desplazar sobre el velo
y releer `window.scrollY`, que tiene que ser el mismo; Escape; y releer el `overflow` del
`body`, que tiene que haber vuelto. M12 entera, sin teléfono.

**V8 · El después de escritorio.** Volver a 1280×900 y comparar contra la captura de V2. Y leer
el `git diff` buscando clases base que hayan perdido su variante. M10.

### Si el navegador no está

`resize_window` y `javascript_tool` son del MCP de Chrome. Si no está conectado, **se dice en
una línea y se degrada**: la aritmética sobre el código —ancho de ventana menos rellenos menos
pistas fijas menos huecos— llega a un número igual de válido, y es como se levantó el inventario
inicial de este ledger. Lo que se pierde es V3, V4 y V5 como **medida**, y eso se anota: los
defectos entran con `ancho` a `—` y la pantalla **no puede pasar a `adaptada`** con una
verificación así.

### El teléfono, cuando lo haya

Probar desde el aparato exige que su IP de la red local esté en `allowedDevOrigins` de
`next.config.ts`. Cambia de red en red. **El agente no la edita**: lo dice y lo hace quien tiene
el teléfono delante.

---

## Tres cosas que no son negociables

- **Si `tsc`, `lint` o `build` fallan, se arregla en esta misma ronda.** No se reporta para
  luego. Dejar el repo sin compilar es peor que no haber empezado: el usuario se entera al hacer
  `npm run build`, no leyéndote.
- **A 1280px la pantalla queda exactamente igual**, salvo las dos excepciones de M10. Si se ve
  distinta, lo que se ha hecho es un rediseño a escondidas.
- **`git status --short` no enseña ni un archivo que no estuviera previsto.** Es M11, y se mira
  siempre.
