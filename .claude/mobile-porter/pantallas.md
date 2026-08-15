# Ledger del `mobile-porter`

Qué pantallas del sitio están adaptadas al navegador de un teléfono y qué defectos ha encontrado
el agente `mobile-porter`, con la regla que incumple cada uno y su ancla en el código. **Este
archivo lo escribe el agente; edítalo a mano sólo para corregirlo.**

Se lee de arriba abajo: la tabla **Pantallas** contesta «¿cuáles llevo ya?» de un vistazo, y la
de **Defectos** lleva el detalle, una fila por cosa que hay que arreglar.

Existe porque un subagente arranca en frío: no ve el hilo padre, ni lo que se habló la semana
pasada, ni el arreglo que ya rechazaste. Sin estas tablas volvería a medir lo mismo cada vez, y
sin saber qué se decidió. Va versionado en git a propósito: es conocimiento del proyecto, como
las specs.

**El código manda sobre estas tablas, siempre.** Los archivos de `app/` y `components/` son la
fuente de verdad de lo que se pinta hoy. Aquí sólo se recuerda lo **medido y lo decidido**.
Cuando las dos cosas no coincidan, se corrige la tabla, nunca el código.

**El alcance son nueve piezas**, y `/jugar/[id]` no está entre ellas: la portaron la SPEC 11, la
SPEC 12 y la SPEC 13, y este agente sólo la lee para copiar patrones —desde la SPEC 13, también
`components/game-pad.tsx`, que es el mando de dedo y tampoco se toca—. Tampoco entra nada de PWA,
manifiesto ni service worker: el alcance es el navegador de un teléfono y nada más.

## Cómo se leen las tablas

**Pantallas**, una fila por pieza:

| Columna    | Qué es                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `pantalla` | El nombre humano. Es la clave, y la comparten las dos tablas                                     |
| `ruta`     | La URL, o `(compartida)` para `Cabecera` y `Pie`, que los montan todas                           |
| `estado`   | Uno de los siete de abajo. Vocabulario cerrado                                                   |
| `defectos` | Cuántas filas tiene en la tabla de Defectos. `—` si no se ha medido                              |
| `abiertos` | Cuántos no están `resuelto` ni `aceptado`. **Si es mayor que cero, no puede pasar a `adaptada`** |
| `alta`     | Cuándo se dio de alta la fila                                                                    |
| `adaptada` | Cuándo se cerró el último defecto abierto. `—` mientras queden                                   |
| `revisado` | Última vez que se reconcilió contra el código                                                    |
| `notas`    | Una línea. **Obligatorio** en `rechazada` y `desincronizada`                                     |

**Defectos**, una fila por cosa que arreglar:

| Columna    | Qué es                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `pantalla` | La misma clave de la tabla de arriba                                                                    |
| `regla`    | `M1` a `M12`. La que el arreglo tiene que satisfacer. Si toca dos, la que decide, y la otra en `notas`  |
| `ancla`    | `archivo:linea` **en el momento de `visto`**. Nunca una descripción en prosa                            |
| `cadena`   | El trozo de clase que identifica el defecto. **Es por lo que se reconcilia**, no por el número de línea |
| `gravedad` | `critico`, `serio` o `menor`. Cerrado                                                                   |
| `ancho`    | El ancho más ancho al que todavía falla: `390`, `360`, `<360` o `apaisado`. `—` si no se ha medido      |
| `estado`   | Uno de los cinco de defecto                                                                             |
| `visto`    | La fecha del alta                                                                                       |
| `notas`    | Una línea: cuál fue el arreglo, o por qué se acepta                                                     |

**La columna `cadena` es la decisión de diseño de este ledger**, y sale de una propiedad de este
repo: el hook `PostToolUse` pasa `eslint --fix` y `prettier --write` tras cada escritura, así que
**los números de línea se mueven solos entre rondas**. Un ancla que apunta a la línea equivocada
convierte cada reconciliación en ruido. La regla: **el `ancla` se congela en `visto` y sirve para
ir a mirar; la reconciliación se hace con un `Grep` de la `cadena`.**

`gravedad`, cerrado: `critico` es información que no se puede leer o un control que no se puede
acertar; `serio` es que funciona pero se ve roto; `menor` es lo que sólo falla por debajo de 360,
sólo en apaisado, o sólo el día que alguien declare `viewportFit: "cover"`.

## Los siete estados de una pantalla

| Estado           | Quién lo pone | ¿Bloquea que se vuelva a portar?                                                |
| ---------------- | ------------- | ------------------------------------------------------------------------------- |
| `sin-auditar`    | El agente     | No. Es el estado de arranque                                                    |
| `auditada`       | El agente     | No. Tiene defectos anotados y ninguno resuelto                                  |
| `en-curso`       | El agente     | No. Se cerraron unos y quedan abiertos                                          |
| `adaptada`       | El agente     | Si, mientras no haya veredicto humano. Cero abiertos y las tres puertas limpias |
| `firmada`        | El usuario    | Si. La miro en un telefono de verdad                                            |
| `rechazada`      | El usuario    | No, pero al volver a portarla el agente cita la fecha y el motivo               |
| `desincronizada` | El agente     | No, y se reporta siempre: la tabla dice una cosa y el codigo otra               |

**`adaptada` y `firmada` no son lo mismo, y esa distancia es la razón de ser de este ledger.**
`adaptada` es un juicio del agente contra las doce reglas, medido en una ventana redimensionada.
`firmada` es un dedo sobre un teléfono. **El agente no puede poner `firmada` nunca**, porque M7
entera y la mitad de M4, M6 y M12 no se pueden medir sin muesca, sin barra de direcciones y sin
teclado en pantalla. Una pantalla puede estar `adaptada` durante meses; eso significa que no le
queda ningún defecto **de los que el agente sabe ver**.

## Los cinco estados de un defecto

| Estado      | Quién lo pone | Qué significa                                                                                  |
| ----------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `abierto`   | El agente     | La `cadena` sigue en el archivo                                                                |
| `resuelto`  | El agente     | Se arreglo. El `ancla` apunta a donde estaba                                                   |
| `aceptado`  | El usuario    | Existe y se deja: cae fuera de los dos umbrales, o el arreglo cuesta mas que el fallo          |
| `reabierto` | El agente     | Estaba `resuelto` y la reconciliacion volvio a encontrar la `cadena`. **La senal mas valiosa** |
| `caducado`  | El agente     | El archivo del `ancla` ya no existe                                                            |

## Señal en el código → Efecto sobre la fila

Se cruza en la Fase 2, y **el código manda siempre**.

| Señal en el código                                                                                      | Efecto sobre la fila                                                                         |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| La `cadena` sigue en el archivo y la fila dice `resuelto`                                               | `reabierto`. **El codigo manda**                                                             |
| La `cadena` ya no esta y la fila dice `abierto`                                                         | `resuelto`, con nota: lo cerro otra ronda                                                    |
| El archivo del `ancla` ya no existe                                                                     | `caducado`. **La fila no se borra**                                                          |
| Una de las nueve piezas sin fila en Pantallas                                                           | Se **anade**, en `sin-auditar`, con `alta` de hoy                                            |
| Un `grid-cols-[` con una pista en `px` en una de las nueve, sin fila                                    | Alta en `abierto`, regla M2                                                                  |
| Un `min-[` o `max-[` nuevo fuera de `acerca-de/page.tsx`                                                | Alta en `abierto`, regla M8                                                                  |
| **Un `handheld` fuera de `app/jugar/`, `components/play-*`, `components/game-pad.tsx` y `globals.css`** | Alta en `abierto`, regla M8. **Es el error mas probable de este agente**                     |
| Un numero de px restado a `100svh`, `100vh` o `100dvh` que no sea variable                              | Alta en `abierto`, regla M6                                                                  |
| Un `export const viewport` nuevo fuera de `app/jugar/[id]/page.tsx`                                     | Todas las filas de M7 a `reabierto`: el `env()` deja de valer cero                           |
| Un componente nuevo bajo `components/` que monta una de las siete                                       | Esa pantalla a `en-curso`, con nota: llego un archivo sin auditar                            |
| Una fila de Pantallas dice `adaptada` y tiene defectos `abierto`                                        | `desincronizada`                                                                             |
| `app/globals.css` estrena una `@custom-variant` o un breakpoint del tema                                | Todas las filas quedan pendientes de revisar: cambio el vocabulario de M8                    |
| **`app/(vault)/layout.tsx` cambia el chrome y `app/not-found.tsx` no**                                  | `404` a `desincronizada`. Monta el chrome por su cuenta y un arreglo del layout no llega ahi |

Esa última fila es una trampa real: `app/not-found.tsx` vive **fuera** del grupo `(vault)` y
monta `SiteHeader` y `SiteFooter` en `:22` y `:46` por su cuenta.

## Reglas de escritura

- **Nunca se borra una fila.** Un defecto `resuelto` se queda con su ancla: eso es justamente la
  memoria.
- **Nunca se reordena una tabla.** Las altas van al final. Es lo que mantiene los conflictos de
  merge en una línea aislada.
- **Un `Edit` por fila**, y `Read` antes de cada uno: el hook de formateo del repo pasa Prettier
  tras cada escritura y realinea las columnas, así que el texto en disco no es exactamente el que
  se escribió.
- **No alinees las columnas a mano.** Prettier lo hace.
- **Sin tildes dentro de las celdas.** La prosa de fuera de las tablas sí las lleva.
- **`—` es «no se ha medido»**; vacío sólo lo admite `notas`.
- La clave de una fila de Defectos es `pantalla` + `cadena` + `regla`.
- **El `ancla` no se actualiza nunca**; se busca por `cadena`.
- **Un defecto se anota con el ancho más ancho al que falla**, aunque también falle a otros: es
  lo que decide si está dentro del alcance.

## Pantallas

| pantalla   | ruta          | estado      | defectos | abiertos | alta       | adaptada   | revisado   | notas                                                                                                                                                                                                              |
| ---------- | ------------- | ----------- | -------- | -------- | ---------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cabecera   | (compartida)  | en-curso    | 6        | 4        | 2026-08-14 | —          | 2026-08-15 | M7 y M12 cerrados en la ronda de la Ficha. M2 pide decision: ver Notas                                                                                                                                             |
| Pie        | (compartida)  | adaptada    | 1        | 0        | 2026-08-14 | 2026-08-15 | 2026-08-15 | M7 escrito; solo lo firma un telefono con muesca                                                                                                                                                                   |
| Salon      | `/salon`      | auditada    | 3        | 3        | 2026-08-14 | —          | 2026-08-14 | Los dos unicos criticos del repo estan aqui                                                                                                                                                                        |
| Portada    | `/`           | auditada    | 2        | 2        | 2026-08-14 | —          | 2026-08-14 | El M6 depende de que la Cabecera deje de envolver                                                                                                                                                                  |
| Biblioteca | `/biblioteca` | auditada    | 2        | 2        | 2026-08-14 | —          | 2026-08-14 | La rejilla de tarjetas ya es sana; solo fallan las areas tactiles                                                                                                                                                  |
| Ficha      | `/juego/[id]` | adaptada    | 3        | 1        | 2026-08-14 | 2026-08-15 | 2026-08-15 | Medida sobre `/juego/frogger`, el peor caso de descripcion. El abierto es `<360`. Sin firmar: M7 entera, `svh` contra `dvh`, la separacion entre objetivos, el teclado en pantalla, el rebote de iOS y si da gusto |
| Cuenta     | `/cuenta`     | auditada    | 2        | 2        | 2026-08-14 | —          | 2026-08-14 | El M5 de los campos solo se ve en un iPhone                                                                                                                                                                        |
| Acerca de  | `/acerca-de`  | auditada    | 3        | 1        | 2026-08-14 | —          | 2026-08-14 | Dos de sus tres filas son la excepcion registrada de M8                                                                                                                                                            |
| 404        | `/not-found`  | sin-auditar | —        | —        | 2026-08-14 | —          | 2026-08-14 | Monta el chrome por su cuenta, fuera del grupo (vault)                                                                                                                                                             |

## Defectos

| pantalla   | regla | ancla                                | cadena                                   | gravedad | ancho    | estado   | visto      | notas                                                                                                                                                                                                                |
| ---------- | ----- | ------------------------------------ | ---------------------------------------- | -------- | -------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Salon      | M2    | `components/hall-of-fame.tsx:30`     | `grid-cols-[62px_`                       | critico  | 390      | abierto  | 2026-08-14 | 266px de pista fija dejan JUGADOR en 32px a 390 y en 2px a 360                                                                                                                                                       |
| Salon      | M1    | `components/hall-of-fame.tsx:116`    | `flex-none bg-av-cyan px-1.75`           | critico  | 390      | abierto  | 2026-08-14 | La insignia TU MEJOR MARCA mide ~112px dentro de esa celda de 32px                                                                                                                                                   |
| Salon      | M4    | `components/hall-of-fame.tsx:69`     | `px-3.25 py-2.75`                        | serio    | 390      | abierto  | 2026-08-14 | Las pestanas de maquina miden ~33px de alto                                                                                                                                                                          |
| Cabecera   | M2    | `components/site-header.tsx:84`      | `justify-between gap-4.5`                | serio    | 390      | abierto  | 2026-08-14 | Medido sin sesion: la cabecera pasa de 67 a 78px y el hamburguesa se aplasta de 40 a 37.4 (390) y a 33.5 (360). Con sesion no envuelve. Pide decision: ver Notas                                                     |
| Cabecera   | M4    | `components/site-header.tsx:158`     | `h-9.5 w-10`                             | serio    | 390      | abierto  | 2026-08-14 | Peor que en la siembra: 38 de alto, y el flex lo aplasta a 37.4 de ancho a 390 y a 33.5 a 360. No sube a `min-h-11` hasta que se resuelva el M2 de arriba, o desborda                                                |
| Cabecera   | M12   | `components/site-header.tsx:168`     | `fixed inset-0 z-45`                     | serio    | 390      | resuelto | 2026-08-14 | Efecto que congela `<html>` mientras el cajon esta abierto, restaurado al cerrar y al desmontar, mas `overflow-y-auto overscroll-contain` en el cajon. Se congela html y no body: ver Notas                          |
| Cabecera   | M7    | `components/site-header.tsx:84`      | `py-3.5 backdrop-blur-sm`                | menor    | apaisado | resuelto | 2026-08-14 | Los cuatro lados declarados enteros con `calc(... + env(safe-area-inset-*))`, sin restar sobre `px`/`py`. Hoy env() vale 0 y a 1280 no cambia nada                                                                   |
| Pie        | M7    | `components/site-footer.tsx:49`      | `pt-5.5 pb-8.5`                          | menor    | 390      | resuelto | 2026-08-14 | `pb-[calc(2.125rem+env(safe-area-inset-bottom))]` y los dos lados con su inset; los 34px de siempre se conservan dentro del calc                                                                                     |
| Portada    | M6    | `app/(vault)/page.tsx:69`            | `100svh-61px`                            | serio    | 390      | abierto  | 2026-08-14 | 61px es el alto de la cabecera de escritorio, escrito a mano                                                                                                                                                         |
| Portada    | M4    | `components/top-players.tsx:44`      | `px-2.5 py-1.75`                         | serio    | 390      | abierto  | 2026-08-14 | VER SALON mide ~25px de alto. El resto del componente esta sano                                                                                                                                                      |
| Biblioteca | M4    | `components/library-browser.tsx:60`  | `px-3 py-2.5`                            | serio    | 390      | abierto  | 2026-08-14 | Los chips de categoria miden ~30px de alto                                                                                                                                                                           |
| Biblioteca | M4    | `components/game-card.tsx:69`        | `px-2.5 py-3.25`                         | serio    | 390      | abierto  | 2026-08-14 | JUGAR e INFO miden ~37px. La segunda cadena es `px-3 py-3.25` en :75                                                                                                                                                 |
| Ficha      | M2    | `app/(vault)/juego/[id]/page.tsx:75` | `minmax(300px,1fr)`                      | menor    | <360     | abierto  | 2026-08-14 | Confirmado en navegador: a 390 y a 360 resuelve a una sola pista (362px y 332px) y no desborda. Sigue abierto por debajo de 328. No se toca: cambiar el 300 moveria donde pasa a dos columnas (excepcion (b) de M10) |
| Cuenta     | M5    | `components/auth-panel.tsx:16`       | `p-3.25 text-[14px]`                     | serio    | 390      | abierto  | 2026-08-14 | iOS amplia al enfocar un campo de menos de 16px y no devuelve la pagina                                                                                                                                              |
| Cuenta     | M4    | `components/auth-panel.tsx:87`       | `px-2 py-3.5`                            | serio    | 390      | abierto  | 2026-08-14 | Los botones del panel miden ~37px de alto                                                                                                                                                                            |
| Acerca de  | M4    | `app/(vault)/acerca-de/page.tsx:147` | `gap-2.5 font-display text-[9px]`        | menor    | 390      | abierto  | 2026-08-14 | Por confirmar con el valor computado: es una lista, no un control                                                                                                                                                    |
| Acerca de  | M8    | `app/(vault)/acerca-de/page.tsx:84`  | `min-[820px]:grid-cols-3`                | menor    | —        | aceptado | 2026-08-14 | Excepcion registrada: apila por debajo de 820 y migrarlo romperia M10                                                                                                                                                |
| Acerca de  | M8    | `app/(vault)/acerca-de/page.tsx:129` | `min-[900px]:grid-cols-`                 | menor    | —        | aceptado | 2026-08-14 | Excepcion registrada: lo mismo entre 900 y 1024. No se anaden nuevos                                                                                                                                                 |
| Ficha      | M4    | `app/(vault)/juego/[id]/page.tsx:70` | `mb-6.5 inline-block border`             | serio    | 390      | resuelto | 2026-08-15 | El breadcrumb VOLVER AL VAULT medido en 37.5px de alto. `inline-flex min-h-11 items-center`; a 1280 sube a 44 por la excepcion (a) de M10                                                                            |
| Ficha      | M4    | `components/score-panel.tsx:84`      | `mt-4.5 block text-center`               | serio    | 390      | resuelto | 2026-08-15 | El enlace al Salon medido en 18px de alto a 390 y 36 a 360 (dos lineas). `flex min-h-11 items-center justify-center`; el `aside` crece 26px a 1280                                                                   |
| Cabecera   | M4    | `components/site-header.tsx:87`      | `text-av-brand tracking-av text-av-cyan` | serio    | 390      | abierto  | 2026-08-15 | La marca ARCADE VAULT mide 16.5px de alto con sesion y 33 sin ella. Subirla a 44 crece la cabecera en 1280 y mueve el `100svh-61px` de la Portada: va con el M2                                                      |
| Cabecera   | M4    | `components/site-header.tsx:137`     | `text-left text-[10px] tracking-av`      | serio    | 390      | abierto  | 2026-08-15 | El boton SALIR de la sesion mide 15x35. Solo se ve con sesion iniciada; mismo bloque que la marca                                                                                                                    |

## Notas

### 2026-08-14 · La siembra

Las nueve filas de Pantallas y las dieciocho de Defectos se dieron de alta el día que se creó
el agente, a partir de la auditoría que justificó su existencia.

**Los defectos de esta siembra se midieron por aritmética sobre el código, no en un navegador**:
ancho de ventana menos rellenos, menos pistas fijas, menos huecos. Es una medida válida para
saber que el defecto existe, y no lo es para darlo por cerrado. Por eso todas las pantallas
arrancan en `auditada` y **ninguna puede pasar a `adaptada` sin repetir los pasos V2 a V6 de
`portar-pantalla.md`** en la ronda que la porte.

Dos altas de la siembra piden confirmación en la primera ronda que toque su pantalla: la de
`acerca-de/page.tsx:147`, que puede no ser un control y entonces M4 no le aplica, y la segunda
cadena de `game-card.tsx`, que es el mismo defecto en dos botones y se resuelve en un `Edit`.

`404` entra en `sin-auditar` a propósito: no se le ha medido nada. Lo que sí se sabe de ella es
que monta `SiteHeader` y `SiteFooter` por su cuenta, así que hereda lo que se arregle del chrome
sin heredar lo que se arregle de `app/(vault)/layout.tsx`.

### 2026-08-14 · La SPEC 13 y el reanclado

La SPEC 13 vistió el mando de dedo de `/jugar/[id]`. **No tocó ninguna de las nueve piezas ni
`:root`**, así que las dieciocho filas de Defectos siguen exactamente donde estaban: ni una se
reconcilia por esto.

Lo que sí cambió es el **perímetro y las anclas de las reglas**, y va aquí para que la próxima
ronda no lo redescubra:

- **`components/game-pad.tsx` es nuevo y es intocable**, como `play-cabinet.tsx`. Salió de él
  —896 líneas pasaron a 770— y **el comodín `play-*` no lo caza**, así que está nombrado aparte
  en M11, en las hard rules y en la tabla de señales de arriba.
- **`app/globals.css` creció por arriba**: cinco tokens `--av-pad-*` en `:49-53` y una animación.
  Todo lo que estaba por debajo se movió unas dieciséis líneas, y las anclas de
  `reglas-movil.md` y `portar-pantalla.md` se reanclaron en bloque. Los `--av-pad-*` **no son de
  este agente**.
- **Los 44px se mudaron con el mando**: el comentario que los justifica está ahora en
  `game-pad.tsx:335-336` y `:92-95`, no en `play-cabinet.tsx`. Con él llegó la mitad que le
  faltaba a M4: **lo que cede es el hueco, después el relleno, y el objetivo táctil nunca.**
- **Dos hallazgos de método que valen para tus nueve piezas**: una altura escrita no es una
  altura aplicada si un `flex-1` de más arriba le gana (M6, y ahora se mide en V3), y una
  utilidad no se anula con otra puesta después, porque decide el orden de la hoja de Tailwind
  (P2.4).
- **`handheld` sí se puede medir** desde que la SPEC 13 inventó cómo. M8 sigue prohibiéndolo en
  tus pantallas, pero **por la razón de fondo y no por imposibilidad**: tus nueve se maquetan por
  ancho.

### 2026-08-15 · La Ficha, medida sobre Frogger

Primera ronda de porte del agente. La pantalla fue `/juego/[id]`, medida sobre `/juego/frogger`,
que es la quinta máquina del vault y **el peor caso del bloque de descripción**: su `long` son
632 caracteres frente a los ~400 de las otras cuatro, y ocupa 498px de alto a 390 y 577 a 360. La
plantilla los absorbe sin desbordar y el texto se lee entero a los dos anchos: **la descripción
larga no es un defecto**, y queda dicho para que otra ronda no lo «arregle».

Se tocaron **tres piezas**, y es la excepción declarada de P2.1: la Ficha, más `SiteHeader` y
`SiteFooter`, que son de las nueve y son la primera vez que se portan.

**Dos cosas de método que costaron una ronda cada una y no hay que volver a descubrir:**

- **`resize_window` no siempre puede.** Con la ventana de Chrome en pantalla completa de macOS,
  las tres llamadas devuelven éxito y `window.innerWidth` **se queda en 1710**. No es un fallo
  del MCP y no se arregla insistiendo. La salida fue la de la SPEC 13: **un iframe del tamaño
  exacto**, que evalúa media queries, `svh`, `clamp(vw)` y `getBoundingClientRect()` contra su
  propio viewport, y dio 390 y 360 exactos. Se comprueba siempre leyendo `innerWidth` **dentro**
  del iframe antes de creerse una cifra.
- **Congelar el `body` no congela esta página, y es culpa de `html { overflow-x: hidden }`.** Al
  no ser `visible` en los dos ejes, `<html>` computa `hidden/auto`, deja de heredar el overflow
  del `<body>` y se queda como `document.scrollingElement`. Medido: con `overflow:hidden` sólo en
  el body, la página seguía desplazándose con el cajón abierto. M12 se cumple congelando
  **`document.documentElement`**. Es la misma línea de `globals.css` que obliga a medir M1, y
  ahora también manda en M12.

**Lo que se dejó sin arreglar a propósito**, con su motivo:

- **El M2 de la cabecera pide una decisión y por eso se para.** Medido sin sesión: a 390 el
  contenido son ~426px en 390 disponibles, la cabecera crece de 67 a 78px porque la marca envuelve
  a dos líneas, y el hamburguesa —declarado `w-10`— se aplasta a 37.4px, y a 33.5 a 360. Con
  sesión iniciada no envuelve, porque el avatar ocupa menos que `INICIAR SESION`. Ninguno de los
  ocho patrones lo resuelve: el `gap` y el relleno no dan los 36px que faltan, y las tres salidas
  que quedan —bajar el bloque de sesión a una segunda línea con P1.1, mandar `INICIAR SESION` al
  cajón (que ya tiene su enlace `Cuenta`), o dejar la marca en dos líneas a propósito— **son tres
  aspectos distintos de la cabecera del sitio, y eso es una decisión de diseño, no un porte.**
- **Los tres M4 de la cabecera van detrás de ese M2**, y no al revés: subir el hamburguesa a
  `min-w-11` cuando hoy es lo que cede convertiría un aplastamiento en un desbordamiento real, y
  subir la marca a 44px crecería la cabecera **en 1280** y movería el `100svh-61px` de la Portada,
  que es el M6 que espera a que la cabecera tenga una altura fija de verdad. El orden de
  `portar-pantalla.md` acierta: **M2 sobre `SiteHeader`, luego M4, luego M6 en el hero.**
- **El `minmax(300px,1fr)` de la Ficha se queda.** A 390 y a 360 resuelve a una sola pista y no
  desborda; sólo falla por debajo de 328, que está fuera de los dos umbrales. Bajarlo a 268 movería
  el punto donde pasa a dos columnas, que es la excepción (b) de M10.

**Una pista para la ronda de la Portada, medida de refilón al comprobar que el chrome no había
roto nada**: `/` es la única de las nueve con desbordamiento **real** a 390 —`scrollWidth` 394
contra 390—, con doce nodos culpables en el bloque de actividad. No se dan de alta aquí porque no
era la pantalla de la ronda y sus archivos no se han leído; se miden en su ronda.

**M10 verificado con números, no con la vista**: a 1280 no cambió ni un ancho, ni el número de
columnas (`588.6px 588.6px 0px` antes y después), ni un tamaño de letra. Lo único que se movió son
los dos objetivos táctiles que subieron a 44px —37.5 y 18— y los 6.5px que eso empuja hacia abajo
al resto de la columna. Es la excepción (a), y es a propósito.
