# Reglas de móvil

Qué es una pantalla adaptada en Arcade Vault, cuáles son los dos umbrales y las doce reglas
con las que el agente `mobile-porter` valida una pantalla antes de darla por buena. **Se lee en
la Fase 0, y sin él la auditoría no tiene contra qué comparar.**

Ninguna regla es una opinión: cada una sale de un archivo del repo que la impone hoy. Si algún
día ese archivo cambia —`globals.css` estrena un breakpoint, la cabecera deja de envolver,
alguien declara `viewportFit: "cover"` en el layout raíz—, cambia la regla, y las pantallas
rechazadas por ella se pueden reabrir.

**El alcance es el navegador de un teléfono y nada más.** Ni PWA, ni manifiesto, ni service
worker, ni envoltorio nativo: eso es otro producto y merece su propia spec.

Y son **nueve piezas**: `/`, `/biblioteca`, `/juego/[id]`, `/salon`, `/cuenta`, `/acerca-de`,
`/not-found`, `SiteHeader` y `SiteFooter`. `/jugar/[id]` **no está**: la portaron la SPEC 11 y
la SPEC 12, y aquí sólo es fuente de patrones, en sólo lectura.

---

## Qué es una pantalla adaptada

Un **defecto** es una discrepancia entre lo que una regla exige y lo que el código hace **a uno
de los dos umbrales**, anclada en un `archivo:linea` concreto. No es una impresión: «se ve
apretado» no es un defecto; «`hall-of-fame.tsx:30` deja la columna JUGADOR en 32px a 390 y en
2px a 360» sí. Un defecto sin ancla no se puede reconciliar en la ronda siguiente, y por eso no
existe.

Una pantalla está **adaptada** cuando no le queda ningún defecto abierto **de los que el agente
sabe ver**. Está **firmada** cuando un dedo la ha tocado en un teléfono de verdad. Los dos
estados no son el mismo y la distancia entre ellos está medida en «Qué firma esto y qué no».

**Un defecto se mide en el navegador, no se deduce del código.** Es la diferencia con una
ranura de color, que se lee con un `Grep`: un ancho es un **valor computado**, y
`@layer base { html { overflow-x: hidden } }` de `app/globals.css:159-161` garantiza que además
es un valor **invisible**. Mirar la pantalla no basta.

## Los dos umbrales

| Umbral    | Qué es               | Por qué ése                                                                                                                                                                                                           |
| --------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **390px** | El ancho de decisión | Es el que ya usa la casa: `CLAUDE.md` y la SPEC 12 escriben «un teléfono de 390px» como unidad de medida. Es el iPhone 12-16 base; el Pixel está en 393. Lo que se diseñe, se diseña mirando este número              |
| **360px** | El suelo             | La mayoría del Android de gama media. Y no es teórico: la columna JUGADOR del salón mide 32px a 390, 17px a 375 y **2px a 360**. El fallo escala de forma no lineal en los últimos treinta píxeles, y por eso hay dos |

**320px no es un umbral: es un nivel de degradación.** Por debajo de 358 la tabla del salón
desborda de verdad, y a 328 lo hace la ficha (`juego/[id]/page.tsx:75`). Diseñar _para_ 320
obligaría a castigar al 99% —tirar la columna FECHA, bajar la rejilla a una tarjeta— por un
aparato que ya casi no existe. La política honesta: **a 320 el sitio no puede romperse**
—nada solapado, nada recortado, nada ilegible— pero puede verse apretado, y ningún defecto cuyo
`ancho` sea `<360` bloquea que una pantalla pase a `adaptada`. Sale gratis: una rejilla
arreglada según M2 aguanta 320 sola.

**El apaisado no es un tercer umbral.** Un teléfono de 390 en horizontal son 844 × 390, o sea
alto 390. Las siete pantallas se desplazan, así que el alto sólo importa donde alguien lo ha
atado a la ventana —M6— y donde la muesca cae a un lado —M7—. Nada más.

---

## Las doce reglas — M1 a M12

Se responden con «sí» o «no». **Un solo «no» deja la pantalla en `auditada` o en `en-curso`,
nunca en `adaptada`**, con el motivo citando la regla y el ancla (`M2: hall-of-fame.tsx:30 deja
JUGADOR en 2px a 360`).

**Una sola pasada, y es eliminatoria.** No hay nota ponderada como en `rubrica.md`, y no es un
olvido: aquella pondera para **ordenar candidatos que compiten**, y su propio archivo lo dice.
Aquí no compite nadie —las nueve piezas hay que adaptarlas todas— y una nota sería además
dañina, porque «`/salon` saca 11 sobre 15» invita a publicar una pantalla que suspende una
regla. **No hay nota parcial para una columna de 32px.** Lo que sustituye a la función de
ordenar es una lista fija, y está al final de este archivo.

Los cinco bloques que siguen sólo ordenan la lectura. No puntúan.

---

### Ancho — M1, M2, M3

### M1 · Ningún elemento se sale de la ventana a 360px

**Pasa si** a 390 y a 360 ningún nodo de la pantalla tiene `getBoundingClientRect().right >
window.innerWidth` ni `.left < 0`, **medido con JavaScript y no mirado en una captura**.
**Falla si** hay uno, aunque la captura salga perfecta.

Ese «aunque» es la regla entera. `app/globals.css:159-161` mete `html { overflow-x: hidden }`
para contener la rejilla en perspectiva del fondo, y el efecto colateral es que **en este repo
un desbordamiento no da scroll lateral: da recorte silencioso**. La insignia `TU MEJOR MARCA`
de `components/hall-of-fame.tsx:116` mide unos 112px con `flex-none` y vive dentro de una celda
de 32px: se sale, y no se ve que se sale.

Por eso M1 se mide y no se mira, y por eso la Fase 4 usa `javascript_tool` y no sólo capturas.

### M2 · Ninguna rejilla lleva más pista fija de la que le cabe

**Pasa si**, en cada `grid-cols-[...]` de la pantalla, a 360px hay al menos una pista
`minmax(0,1fr)` y a esa pista le quedan **doce caracteres de su propia fuente** una vez
restadas las pistas fijas, los huecos, el relleno y los bordes. **Falla si** la suma de lo fijo
deja la pista flexible por debajo de eso, o si no hay pista flexible ninguna.

El caso es `components/hall-of-fame.tsx:30`: `grid-cols-[62px_minmax(0,1fr)_108px_96px]` con
`gap-2.5`, dentro de un panel con `px-4` y borde, dentro de un `<main>` con
`px-[clamp(14px,3vw,40px)]`. La cuenta a 390 es `390 − 28 − 2 − 32 − (266 + 30) = 32px`; a 375,
17px; a 360, **2px**; y por debajo de 358 desborda de verdad y lo caza M1. Con `truncate`
encima, la columna JUGADOR enseña dos caracteres de un nombre.

La misma cuenta pasan `components/score-panel.tsx:71` (`34px_minmax(0,1fr)_auto`) y
`components/top-players.tsx:63` (`38px_minmax(0,1fr)_auto`), y los dos están sanos. **El
defecto no es tener pistas fijas: es tener 266px de ellas.**

Lo mismo con `minmax(Npx,1fr)`: `app/(vault)/juego/[id]/page.tsx:75` usa
`repeat(auto-fit,minmax(300px,1fr))` y desborda por debajo de **328px de ventana**;
`components/library-browser.tsx:73` usa `minmax(268px,1fr)` y aguanta hasta 296. La diferencia
entre esos dos números es la regla.

### M3 · Una fila que no cabe reordena; no encoge, no se recorta y no se borra

**Pasa si** las columnas que no caben a 360 bajan a **una segunda línea de la misma fila**, con
`order-N` y su `sm:order-none`. **Falla si** se resuelve bajando el tamaño de letra, poniendo
`truncate` en más columnas, metiendo `overflow-x-auto` en la tabla, o escondiendo una columna
con `hidden sm:block`.

`components/activity-feed.tsx:59` es **el único componente del repo con reflow de columnas de
verdad**, y es exactamente el patrón: `grid-cols-[minmax(0,1fr)_auto]` que pasa a
`sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]`, con `order-3` en `:66`, `order-4` en `:72` y sus
`sm:order-none`. Se copia; no se reinventa.

Las tres salidas prohibidas, y por qué cada una: **encoger** convierte un problema de ancho en
uno de legibilidad y lo tapa, que es M5; **`overflow-x-auto`** mete un carril horizontal dentro
de una página que se desplaza en vertical, y con un pulgar eso es una trampa —cada intento de
bajar mueve la tabla de lado—; **esconder** pierde datos, y `FECHA` es un dato.

Lo único que sí se puede esconder es lo que ya es adorno declarado: el `DESLIZA` de
`app/(vault)/page.tsx:116-122` lleva `aria-hidden` en su flecha y no informa de nada.

---

### Dedo y ojo — M4, M5

### M4 · 44px de lado corto en todo lo que se toca

**Pasa si** cada `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>` y `[role="button"]`
visible mide **44px o más en su lado corto**, medido con `getBoundingClientRect()` a 390.
**Falla si** hay uno por debajo. Y no vale deducirlo del relleno: `py-2.5` no dice nada del alto
real, porque el alto es relleno **más** la caja de línea de Press Start 2P.

El 44 no viene de fuera. `components/play-cabinet.tsx:344-346` lo escribe —«44px de lado corto
es el mínimo que un pulgar acierta sin apuntar»— y lo aplica con `min-h-11`; su `CENTER_KEY` es
`size-11`; y la SPEC 12 tiene un criterio firmado que dice «Ningún botón del mando mide menos
de 44px en su lado corto». Ya hay además un precedente **fuera** de la pantalla de juego: los
campos de `components/contact-form.tsx` llevan `h-11`, que son 44 exactos.

Lo que falla hoy, medido: `components/top-players.tsx:44` (`VER SALON`, ~25px),
`components/library-browser.tsx:60` (chips, ~30px), `components/hall-of-fame.tsx:69` (pestañas,
~33px), `components/game-card.tsx:70,76` (`JUGAR` e `INFO`, ~37px) y
`components/site-header.tsx:158` (el hamburguesa, 38 × 40).

**El arreglo es `min-h-11`, no más relleno**, y **sin `pointer-coarse:`**. Tres razones:
`min-h-11` no toca nada que ya pase de 44, mientras que subir el `py` mueve todo lo que hay
alrededor; un enlace de 25px tampoco es bueno con un ratón; y una regla escrita bajo
`pointer-coarse:` **no se puede firmar redimensionando una ventana**, que es justo lo que M8
existe para evitar. Es la excepción (a) de M10, declarada aquí a propósito.

### M5 · La letra nunca encoge para que algo quepa

**Pasa si** ningún tamaño de letra de la pantalla es **menor a 390px de lo que es a 1280px**, y
si el texto que hay que leer de verdad —nombres, marcas, fechas, descripciones, rótulos de
campo— computa 12px o más a 390. **Falla si** un arreglo de esta ronda ha bajado un tamaño para
ganar ancho: eso es M3 por la puerta de atrás.

**Lo que no entra, y va escrito para que nadie lo «arregle»:** los rótulos de Press Start 2P a
7 y 8px —`components/game-card.tsx:47,59`, `hall-of-fame.tsx:69`, `library-browser.tsx:60`,
`juego/[id]/page.tsx:92`— se quedan como están. Son la voz de las plantillas, repiten
información que está al lado, y `--text-av-label: clamp(9px,1.7vw,13px)` de
`app/globals.css:92` fija el suelo del propio tema en 9px. **Gana el archivo.** Cambiarlos es un
rediseño y pide una spec, no un porte.

**Lo que sí entra y hoy falla:** `components/auth-panel.tsx:16`, con `text-[14px]` en los tres
campos de `/cuenta`. Por debajo de 16px **iOS Safari amplía la página al enfocar el campo y no
la devuelve**. `components/contact-form.tsx:27` no declara tamaño, hereda los 16 del `body` y
no amplía: la asimetría entre los dos únicos formularios del sitio es la prueba de que esto es
un defecto y no una preferencia. Y es de los que **ninguna ventana redimensionada enseña**.

---

### Ventana — M6, M7

### M6 · Ningún alto de barra del sistema va escrito a mano

**Pasa si** todo lo que se resta a la altura de la ventana es una variable de `:root` o un
`calc()` sobre una, y si las medidas verticales van en `svh`. **Falla si** aparece un número de
píxeles medido una vez y pegado.

`app/(vault)/page.tsx:69` es el caso: `min-h-[calc(100svh-61px)]`. Los 61px son el alto de
`SiteHeader` **en escritorio**; en un teléfono de 390 la cabecera mide unos 66, y más cuando
marca y botón envuelven a dos líneas, que es lo que hace hoy. El comentario de al lado acierta
con `svh` y falla con el 61.

El precedente correcto está a la vista: `--av-play-header` vive en `app/globals.css:49` **y no
en un `className`**, y el comentario de ahí explica por qué —`PlayHeader` y el `<main>` de
`/jugar/[id]` son hermanos y sólo comparten lo que herede la raíz—. Aquí pasa lo mismo:
`SiteHeader` y el `<main>` de `/` son hermanos en `app/(vault)/layout.tsx:16-17`. La salida es
una `--av-site-header` en `:root`. **Antes hay que arreglar que la cabecera no envuelva**, o la
variable miente igual que el 61.

Y las tres unidades, decididas: **`svh` sí**, que es lo que ya hay escrito y es lo correcto;
**`vh` no**, que en un teléfono es siempre el alto sin barra y corta; **`dvh` tampoco para un
`min-h`**, porque cambia mientras la barra se retrae y hace que la sección crezca y encoja bajo
el pulgar mientras se desplaza.

### M7 · Lo que toca el borde de la pantalla suma `env(safe-area-inset-*)`

**Pasa si** cada elemento que llega a un borde de la ventana suma el inset con `calc()`:
`SiteHeader` —arriba, izquierda y derecha, porque es `sticky top-0` en `site-header.tsx:84`—,
`SiteFooter` —abajo, hoy `pb-8.5` a secas en `site-footer.tsx:49`— y el cajón de
`site-header.tsx:176`, que es `inset-y-0 right-0` y necesita los cuatro. **Falla si** falta
alguno.

El patrón está escrito cuatro veces en el repo: `components/play-header.tsx:18` y
`components/play-cabinet.tsx:731,766,822`. Se suma al relleno existente, nunca lo sustituye.

**Y aquí va la advertencia sin la cual la regla es un engaño:** las siete pantallas **no
declaran `viewportFit: "cover"`** —el único `export const viewport` del repo está en
`app/jugar/[id]/page.tsx:23-30`, y `app/layout.tsx` no exporta ninguno—, así que hoy el
navegador inserta el área segura por su cuenta y **`env()` resuelve a `0`**. Escribir el
`calc()` hoy no arregla nada visible: es gratis, es inofensivo, y es lo correcto el día que
alguien ponga `cover`. La regla se cumple escribiéndola; **no se puede firmar sin un teléfono
con muesca, y en las dos posturas**.

---

### Método — M8, M9, M10

### M8 · Un solo sistema de puntos de corte: los de fábrica, y de menor a mayor

**Pasa si** la pantalla usa sólo `sm:` (640), `md:` (768), `lg:` (1024) y `xl:` (1280), siempre
en sentido móvil-primero: el valor base es el estrecho y el prefijo añade el ancho. **Falla si**
aparece un `min-[Npx]:` o un `max-[Npx]:` nuevo, o si un `max-*:` se usa para deshacer un valor
base escrito pensando en escritorio.

**`handheld` y `handheld-wide` no entran aquí, y no es por gusto.** Las dos llevan
`(pointer: coarse)` (`app/globals.css:178-179`), que un Chrome de escritorio no cumple nunca. La
SPEC 12 lo pagó y lo dejó escrito en su «Validación»: «las variantes `handheld` piden
`(pointer: coarse)`, que un Chrome de escritorio no cumple, así que la maquetación de mano no
llegó a pintarse ni una vez». Una regla escrita bajo `handheld` es una regla que **este agente
no puede verificar con el procedimiento que tiene**, y se publicaría sin haberse pintado jamás.

Y el 480 es además el umbral equivocado para estas pantallas: la tabla del salón y la rejilla de
la ficha empiezan a doler a 640, no a 480, así que `handheld` dejaría roto todo el tramo
481-639. Las dos variantes se quedan donde `globals.css:174-176` ya dice que están: **sólo en la
pantalla de juego**.

En una frase: **las siete pantallas se maquetan por ancho, con los breakpoints de fábrica; la
pantalla de juego se maqueta por puntero, con `handheld`. No se cruzan.**

`pointer-coarse:` sí se admite, y **para una sola cosa**: esconder una pista que sólo tiene
sentido con ratón. El único precedente es `components/play-cabinet.tsx:658`. Nunca para cambiar
una maquetación, y nunca para un área táctil, que es M4.

Los dos arbitrarios de `app/(vault)/acerca-de/page.tsx:84,129` **se quedan, y no son deuda**. No
fallan a 360 ni a 390 —por debajo de 820 y de 900 apilan, que es lo correcto— y moverlos a
`md:`/`lg:` cambiaría la página entre 768-820 y entre 900-1024, o sea rompería M10 a cambio de
nada. Van registrados en el ledger como excepción. Lo que hay que recordar no es migrarlos: es
**por qué no**, o la ronda siguiente los «ordena» y rompe el escritorio con la mejor intención.

### M9 · Antes de una variante, un `clamp()`; antes de un `clamp()`, un `minmax(0,1fr)`

**Pasa si**, para cada cambio, se puede decir por qué el mecanismo más barato no servía. El
orden no se altera:

1. **Una maquetación sin anchos dentro**: `minmax(0,1fr)`, `auto-fill`, `flex-wrap`, `min-w-0`,
   `w-[min(100%,Npx)]`. `components/library-browser.tsx:73` y `components/auth-panel.tsx:39` son
   dos pantallas enteras de responsividad con **cero** puntos de corte.
2. **`clamp()`, para una medida continua**: un tamaño de letra, un relleno, un ancho máximo.
   Para eso está la escala del `@theme inline` en `app/globals.css:87-92`, y el
   `p-[clamp(22px,4vw,36px)]` de `auth-panel.tsx:39`.
3. **Una variante `sm:`/`md:`, y sólo para un cambio discontinuo**: una pista que aparece, un
   `order` que se resetea, una dirección que gira. `components/activity-feed.tsx:59` es el caso
   legítimo, porque **entre dos plantillas de rejilla no se puede interpolar**.

**Falla si** aparece un `sm:text-[13px]` donde bastaba un `clamp()`, o un `md:grid-cols-2` donde
bastaba un `auto-fill`. Es la regla que impide que este porte deje el repo lleno de puntos de
corte, que es su riesgo principal: hoy sólo 4 de 31 componentes usan variantes, y el resto se
apoya en `clamp()` y `minmax`.

### M10 · A 1280px no cambia ni un píxel

**Pasa si** la pantalla se pinta a 1280 × 900 exactamente igual que antes del cambio: mismo
número de columnas, mismos tamaños de letra, mismo espaciado, mismos saltos de línea. **Falla
si** un valor base se movió sin devolverlo bajo su `sm:`/`md:`/`lg:` —el error clásico de
móvil-primero— o si se «ordenó» un punto de corte y con ello se movió dónde reflowea.

**Dos excepciones declaradas, y sólo dos.** (a) **M4**: un objetivo táctil que sube a 44px sube
también para el ratón, y es a propósito. (b) **`app/(vault)/juego/[id]/page.tsx:75`**: sustituir
`auto-fit,minmax(300px,1fr)` por una variante explícita tiene que reproducir el punto donde hoy
pasa a dos columnas; si no se puede clavar, se declara la diferencia y se enseña la captura.

M10 es lo que hace que el modo portar no necesite aprobación previa: **el único que ve el cambio
es el que ya estaba viendo una pantalla rota.** Es la misma función que cumple `clasico` en
`contrato-skin.md`, y por eso es regla dura y no preferencia.

---

### Perímetro — M11, M12

### M11 · `lib/games/` no se toca, y `/jugar/[id]` tampoco

**Pasa si** al terminar, `git status --short` sólo enseña archivos de las nueve piezas, sus
componentes, `app/globals.css` y el ledger. **Falla si** hay uno solo bajo `lib/games/`,
`app/jugar/`, `components/play-*.tsx`, `components/game-canvas.tsx`, `specs/`, `supabase/` o
`references/`.

La SPEC 11 y la SPEC 12 ya portaron la pantalla de juego, y su presupuesto de `--av-chrome`
sigue siendo, en palabras de su propia «Validación», «una cuenta y no una medida»: **diez de sus
veintisiete criterios están sin firmar y sólo los firma un dedo**. Tocar `PlayHeader` o las dos
`@custom-variant` «para que quede consistente» reabre un porte que aún no ha terminado de
verificarse.

`app/globals.css` **sí** es escribible, y para dos cosas: añadir una variable de maquetación a
`:root` —M6— y nada más. Ni las dos `@custom-variant` de `:178-179`, ni `--av-play-header` de
`:49`, ni el `html { overflow-x: hidden }` de `:159-161`: quitarlo desnudaría la rejilla del
fondo, que es justo para lo que está.

### M12 · Un panel que tapa la pantalla no deja correr lo de debajo

**Pasa si**, con el cajón de `components/site-header.tsx:168-208` abierto, el `body` no se
desplaza —`overflow: hidden` mientras está abierto, restaurado al cerrar **y al desmontar**— y
el propio cajón lleva `overscroll-contain` si puede desplazarse. **Falla si** empujar el pulgar
sobre el velo mueve el artículo de detrás, que en un teléfono es lo que hace que un menú parezca
roto.

El patrón ya está en el repo: `components/play-cabinet.tsx:770,827` llevan `overflow-y-auto
overscroll-contain` en sus superpuestos. Y el cajón ya hace bien todo lo demás —Escape en
`:73-80`, velo en `:169-171`, `aria-expanded` y `aria-controls` en `:156-157`—, así que lo que
falta es exactamente esto y sólo esto.

**Lo que no entra en esta regla, dicho para que nadie lo cuele:** la trampa de foco. Que el
tabulador no se escape del cajón abierto es accesibilidad, es correcta, y **no es móvil**: pide
su propia spec y su propia auditoría del sitio entero. Meterla aquí convierte un porte acotado
en un rediseño.

---

## Qué firma esto y qué no

De las doce reglas, **ocho se firman enteras sin teléfono** —M1, M2, M3, M5, M8, M9, M10,
M11—, **tres a medias** —M4 sin la separación entre objetivos, M6 sin la barra de direcciones,
M12 sin el rebote de iOS— y **una no se firma en absoluto**, que es M7.

Eso es lo que hay que escribir en `notas` cada vez que una pantalla pasa a `adaptada`. Y es una
mejora sobre la SPEC 12, no un empate: allí la maquetación de mano no llegó a pintarse ni una
vez porque dependía de `(pointer: coarse)`. **Aquí M8 prohíbe depender del puntero a propósito,
así que todo lo que este agente escribe se pinta estrechando una ventana.** Ése es el
rendimiento de la política de breakpoints.

Las seis cosas que sólo puede firmar un teléfono real:

1. **M7 entera.** Un Chrome de escritorio resuelve `env(safe-area-inset-*)` a `0`, y las siete
   pantallas no declaran `viewportFit: "cover"`, así que hoy vale cero por dos motivos
   distintos. En el navegador sólo se firma que el `calc()` **está escrito**.
2. **`svh` contra `dvh`.** En una ventana sin barra de direcciones, `svh`, `lvh` y `dvh` valen
   lo mismo. Que el hero de `/` quede bien con la barra fuera **y** retraída es de teléfono.
3. **La separación entre objetivos.** Los 44px son geometría y se firman en escritorio; que dos
   chips separados por `gap-2` no se confundan al primer toque, no.
4. **El teclado en pantalla.** Que `auth-panel.tsx:16` amplíe al enfocar por llevar 14px sólo se
   ve en un iPhone. Y con el teclado fuera, si el botón de envío sigue siendo alcanzable.
5. **El rebote y el encadenado de scroll.** Que el `overflow: hidden` esté puesto se firma en
   escritorio; que iOS deje de rebotar el cajón, no.
6. **Si además da gusto.** No es criterio, y decirlo evita que se cuele como uno.

---

## Cómo se presenta

Se imprime **la tabla de las nueve piezas entera** —una fila por pantalla, con su estado y su
cuenta de defectos abiertos—, aunque la mayoría estén en `sin-auditar`. Es la respuesta directa
a la pregunta que dispara este agente.

Y luego **la tabla de defectos de la pantalla de la ronda**, con todos, incluidos los que ya
estaban resueltos. Media pantalla no se puede revisar: lo que se juzga es el conjunto.

Las pantallas que suspenden una regla se presentan igual, con la regla, el ancla y qué haría
falta para desbloquearlas. Un `M3` sin resolver es una decisión pendiente para un humano, y
esconderla sólo la retrasa.

## El orden de las rondas

No es una regla, pero se propone en cada Fase 3 y conviene que se proponga siempre igual:

1. **`SiteHeader` y `SiteFooter`** — están en las nueve, y `--av-site-header` (M6) no se puede
   escribir hasta que la cabecera deje de envolver.
2. **`/salon`** — los dos únicos defectos `critico` del repo están ahí,
   `hall-of-fame.tsx:30` y `:116`.
3. **`/`** — depende de que 1 esté hecho, por el `61px` de `page.tsx:69`.
4. **`/biblioteca`** y **`/juego/[id]`** — M4 en las tarjetas, y el `minmax(300px,1fr)`.
5. **`/cuenta`** — sólo M4 y los 14px de `auth-panel.tsx:16`. Barata.
6. **`/acerca-de`** y **`/not-found`** — casi limpias; `/acerca-de` sólo por M4 y por dejar
   registrada la excepción de sus dos breakpoints.
