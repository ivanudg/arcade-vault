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

**El alcance son nueve piezas**, y `/jugar/[id]` no está entre ellas: la portaron la SPEC 11 y
la SPEC 12, y este agente sólo la lee para copiar patrones. Tampoco entra nada de PWA,
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

| Señal en el código                                                           | Efecto sobre la fila                                                                         |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| La `cadena` sigue en el archivo y la fila dice `resuelto`                    | `reabierto`. **El codigo manda**                                                             |
| La `cadena` ya no esta y la fila dice `abierto`                              | `resuelto`, con nota: lo cerro otra ronda                                                    |
| El archivo del `ancla` ya no existe                                          | `caducado`. **La fila no se borra**                                                          |
| Una de las nueve piezas sin fila en Pantallas                                | Se **anade**, en `sin-auditar`, con `alta` de hoy                                            |
| Un `grid-cols-[` con una pista en `px` en una de las nueve, sin fila         | Alta en `abierto`, regla M2                                                                  |
| Un `min-[` o `max-[` nuevo fuera de `acerca-de/page.tsx`                     | Alta en `abierto`, regla M8                                                                  |
| **Un `handheld` fuera de `app/jugar/`, `components/play-*` y `globals.css`** | Alta en `abierto`, regla M8. **Es el error mas probable de este agente**                     |
| Un numero de px restado a `100svh`, `100vh` o `100dvh` que no sea variable   | Alta en `abierto`, regla M6                                                                  |
| Un `export const viewport` nuevo fuera de `app/jugar/[id]/page.tsx`          | Todas las filas de M7 a `reabierto`: el `env()` deja de valer cero                           |
| Un componente nuevo bajo `components/` que monta una de las siete            | Esa pantalla a `en-curso`, con nota: llego un archivo sin auditar                            |
| Una fila de Pantallas dice `adaptada` y tiene defectos `abierto`             | `desincronizada`                                                                             |
| `app/globals.css` estrena una `@custom-variant` o un breakpoint del tema     | Todas las filas quedan pendientes de revisar: cambio el vocabulario de M8                    |
| **`app/(vault)/layout.tsx` cambia el chrome y `app/not-found.tsx` no**       | `404` a `desincronizada`. Monta el chrome por su cuenta y un arreglo del layout no llega ahi |

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

| pantalla   | ruta          | estado      | defectos | abiertos | alta       | adaptada | revisado   | notas                                                              |
| ---------- | ------------- | ----------- | -------- | -------- | ---------- | -------- | ---------- | ------------------------------------------------------------------ |
| Cabecera   | (compartida)  | auditada    | 4        | 4        | 2026-08-14 | —        | 2026-08-14 | Chrome de las nueve. Se porta en la ronda de la primera que la use |
| Pie        | (compartida)  | auditada    | 1        | 1        | 2026-08-14 | —        | 2026-08-14 | Chrome de las nueve                                                |
| Salon      | `/salon`      | auditada    | 3        | 3        | 2026-08-14 | —        | 2026-08-14 | Los dos unicos criticos del repo estan aqui                        |
| Portada    | `/`           | auditada    | 2        | 2        | 2026-08-14 | —        | 2026-08-14 | El M6 depende de que la Cabecera deje de envolver                  |
| Biblioteca | `/biblioteca` | auditada    | 2        | 2        | 2026-08-14 | —        | 2026-08-14 | La rejilla de tarjetas ya es sana; solo fallan las areas tactiles  |
| Ficha      | `/juego/[id]` | auditada    | 1        | 1        | 2026-08-14 | —        | 2026-08-14 | Solo falla por debajo de 360                                       |
| Cuenta     | `/cuenta`     | auditada    | 2        | 2        | 2026-08-14 | —        | 2026-08-14 | El M5 de los campos solo se ve en un iPhone                        |
| Acerca de  | `/acerca-de`  | auditada    | 3        | 1        | 2026-08-14 | —        | 2026-08-14 | Dos de sus tres filas son la excepcion registrada de M8            |
| 404        | `/not-found`  | sin-auditar | —        | —        | 2026-08-14 | —        | 2026-08-14 | Monta el chrome por su cuenta, fuera del grupo (vault)             |

## Defectos

| pantalla   | regla | ancla                                | cadena                            | gravedad | ancho    | estado   | visto      | notas                                                                   |
| ---------- | ----- | ------------------------------------ | --------------------------------- | -------- | -------- | -------- | ---------- | ----------------------------------------------------------------------- |
| Salon      | M2    | `components/hall-of-fame.tsx:30`     | `grid-cols-[62px_`                | critico  | 390      | abierto  | 2026-08-14 | 266px de pista fija dejan JUGADOR en 32px a 390 y en 2px a 360          |
| Salon      | M1    | `components/hall-of-fame.tsx:116`    | `flex-none bg-av-cyan px-1.75`    | critico  | 390      | abierto  | 2026-08-14 | La insignia TU MEJOR MARCA mide ~112px dentro de esa celda de 32px      |
| Salon      | M4    | `components/hall-of-fame.tsx:69`     | `px-3.25 py-2.75`                 | serio    | 390      | abierto  | 2026-08-14 | Las pestanas de maquina miden ~33px de alto                             |
| Cabecera   | M2    | `components/site-header.tsx:84`      | `justify-between gap-4.5`         | serio    | 390      | abierto  | 2026-08-14 | ~410px de contenido en 390: marca y boton envuelven a dos lineas        |
| Cabecera   | M4    | `components/site-header.tsx:158`     | `h-9.5 w-10`                      | serio    | 390      | abierto  | 2026-08-14 | El hamburguesa mide 38x40                                               |
| Cabecera   | M12   | `components/site-header.tsx:168`     | `fixed inset-0 z-45`              | serio    | 390      | abierto  | 2026-08-14 | El cajon no bloquea el scroll del body ni contiene el overscroll        |
| Cabecera   | M7    | `components/site-header.tsx:84`      | `py-3.5 backdrop-blur-sm`         | menor    | apaisado | abierto  | 2026-08-14 | sticky top-0 sin inset arriba ni a los lados. Hoy env() vale 0          |
| Pie        | M7    | `components/site-footer.tsx:49`      | `pt-5.5 pb-8.5`                   | menor    | 390      | abierto  | 2026-08-14 | Relleno inferior fijo, sin sumar el inset. Hoy env() vale 0             |
| Portada    | M6    | `app/(vault)/page.tsx:69`            | `100svh-61px`                     | serio    | 390      | abierto  | 2026-08-14 | 61px es el alto de la cabecera de escritorio, escrito a mano            |
| Portada    | M4    | `components/top-players.tsx:44`      | `px-2.5 py-1.75`                  | serio    | 390      | abierto  | 2026-08-14 | VER SALON mide ~25px de alto. El resto del componente esta sano         |
| Biblioteca | M4    | `components/library-browser.tsx:60`  | `px-3 py-2.5`                     | serio    | 390      | abierto  | 2026-08-14 | Los chips de categoria miden ~30px de alto                              |
| Biblioteca | M4    | `components/game-card.tsx:69`        | `px-2.5 py-3.25`                  | serio    | 390      | abierto  | 2026-08-14 | JUGAR e INFO miden ~37px. La segunda cadena es `px-3 py-3.25` en :75    |
| Ficha      | M2    | `app/(vault)/juego/[id]/page.tsx:75` | `minmax(300px,1fr)`               | menor    | <360     | abierto  | 2026-08-14 | Desborda por debajo de 328px de ventana. Fuera de los dos umbrales      |
| Cuenta     | M5    | `components/auth-panel.tsx:16`       | `p-3.25 text-[14px]`              | serio    | 390      | abierto  | 2026-08-14 | iOS amplia al enfocar un campo de menos de 16px y no devuelve la pagina |
| Cuenta     | M4    | `components/auth-panel.tsx:87`       | `px-2 py-3.5`                     | serio    | 390      | abierto  | 2026-08-14 | Los botones del panel miden ~37px de alto                               |
| Acerca de  | M4    | `app/(vault)/acerca-de/page.tsx:147` | `gap-2.5 font-display text-[9px]` | menor    | 390      | abierto  | 2026-08-14 | Por confirmar con el valor computado: es una lista, no un control       |
| Acerca de  | M8    | `app/(vault)/acerca-de/page.tsx:84`  | `min-[820px]:grid-cols-3`         | menor    | —        | aceptado | 2026-08-14 | Excepcion registrada: apila por debajo de 820 y migrarlo romperia M10   |
| Acerca de  | M8    | `app/(vault)/acerca-de/page.tsx:129` | `min-[900px]:grid-cols-`          | menor    | —        | aceptado | 2026-08-14 | Excepcion registrada: lo mismo entre 900 y 1024. No se anaden nuevos    |

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
