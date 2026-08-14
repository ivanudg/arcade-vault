# SPEC 11 — Jugar en un móvil táctil

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 05
> **Fecha:** 2026-08-13
> **Implementada:** 2026-08-13, en `spec-11-jugar-en-movil`. Lo que salió
> distinto de lo planeado está en «Lo que cambió al implementarla», al final.
> **Objetivo:** Hacer `/jugar/[id]` jugable con el dedo en un teléfono, con una maquetación propia en vertical y otra en horizontal, sin scroll ni zoom y sin tocar el contrato de los motores.

## Por qué existe esta spec

El vault ya se ve en un móvil, pero no se juega en uno. El mando táctil existe
desde SPEC 05 —`onPointerDown` inyecta la tecla por `handle.press()`, y el motor
no distingue el dedo del teclado—, así que lo que falta no es la entrada: es la
ventana.

Hoy la pantalla de juego se maqueta como si siempre sobrara alto.
`CABINET_CHROME` reserva 16rem para la cabecera, el HUD, el marco, el mando y la
línea de controles, y el ancho de la pantalla se calcula con
`calc((100svh - 16rem) * ratio)`. En un teléfono en horizontal eso son 390px de
alto menos 256px de reserva: le quedan 134px al tablero. En vertical entra, pero
el HUD envuelve en tres líneas y la página se desplaza mientras se juega.

Y hay tres cosas que un ratón nunca hizo y un dedo hace todo el rato: arrastrar
la página, ampliar con doble toque, y tapar la mitad de la pantalla. Ninguna
está prevista.

Nada de esto es trabajo de los motores. `lib/games/engine.ts` no cambia,
`components/game-canvas.tsx` no cambia, y ningún motor se entera de que se está
jugando en un teléfono: el canvas ya se escala por CSS y su búfer se fija en el
montaje, así que girar el aparato no reinicia la partida. Todo lo que hay aquí
es la caja que rodea al canvas.

## Alcance

**Dentro:**

- Sólo la ruta `/jugar/[id]`: su `page.tsx`, `PlayCabinet`, `PlayHeader` y los
  dos superpuestos. Ningún motor se toca.
- Un `export const viewport` en `app/jugar/[id]/page.tsx` que fija
  `width: "device-width"`, `initialScale: 1`, `maximumScale: 1`,
  `userScalable: false` y `viewportFit: "cover"`. Sólo esa ruta: el resto del
  sitio conserva el pellizco.
- Dos maquetaciones nuevas del gabinete, **las dos por CSS**, sin detección de
  dispositivo en JavaScript y sin estado que hidratar:
  - **Vertical de mano**: HUD en una línea compacta, marco y relleno reducidos,
    el canvas ocupando todo el alto que sobre y, debajo, el mando: las cuatro
    flechas en cruz a la izquierda y `FUEGO` enfrente.
  - **Horizontal de mano**: las cuatro flechas en cruz a la izquierda del
    canvas, `FUEGO` a la derecha, HUD en una sola línea arriba.
- Dos variantes propias en `app/globals.css` que definen qué es «de mano»,
  declaradas con `@custom-variant` de Tailwind v4 y usadas por nombre en el
  marcado.
- `CABINET_CHROME` deja de ser una constante única: cada maquetación reserva lo
  suyo, y la pantalla se sigue calculando con el ratio del `world` del motor.
- Los botones del mando pasan a tener un área táctil de 44px como mínimo en su
  lado corto, también en horizontal.
- La línea de `game.controls` («Flechas ← → giran · ESPACIO dispara») se oculta
  cuando el puntero es grueso.
- La ruta de juego no se desplaza en una pantalla de mano: cabe en `100svh`
  menos lo que ocupa `PlayHeader`, y el canvas lleva `touch-action: none`.
- Relleno por `env(safe-area-inset-*)` en la pantalla de juego, que es lo que
  exige haber pedido `viewportFit: "cover"`.
- Los superpuestos de carga y de fin de partida caben y se manejan en horizontal
  de mano, con desplazamiento propio si el alto no da.
- `PlayHeader` se comprime en horizontal de mano: `SALIR` no desaparece nunca.
  **Corregido por SPEC 12**: con el dedo `SALIR` ya no está en la cabecera, sino
  en el centro del mando y preguntando antes de salir.
- Se verifican en un teléfono real dos comportamientos que ya existen y nadie ha
  probado con el dedo: pulsar dos botones a la vez, y que tocar el mando no
  dispare la pausa automática por `blur`.

**Fuera de alcance (para specs futuras):**

- Las otras siete pantallas del sitio. Si alguna se rompe en un móvil, es su
  propia spec.
- Gestos sobre el canvas: deslizar para mover, tocar para disparar. El control
  táctil sigue siendo el mando de cinco botones.
- Pantalla completa con la Fullscreen API.
- Bloquear la orientación con la Screen Orientation API, y el aviso de «gira el
  dispositivo»: las dos posturas se juegan.
- Vibración (`navigator.vibrate`) al disparar o al perder una vida.
- Manifiesto PWA, instalación en la pantalla de inicio y modo sin conexión.
- Ocultar `JUGADOR` o el selector de `PIEL` en móvil: los dos se quedan.
- Cambiar qué botones usa cada máquina, el contrato de `lib/games/engine.ts` o
  el tamaño del `world` de un motor.
- Rediseñar el mando por máquina (por ejemplo, separar rotar de bajar en
  Tetris).

## Modelo de datos

Esta spec no introduce datos de dominio: nada nuevo en Supabase, nada nuevo en
`localStorage` y ningún campo nuevo en `GameMount` ni en `GameHandle`. Lo que
aparece son cuatro estructuras de maquetación.

**1. Las dos variantes de Tailwind, en `app/globals.css`.**

```css
/* Un teléfono: puntero grueso y una ventana que no da para el gabinete de
   escritorio. El umbral de 480px separa teléfonos de tabletas — un iPad mini
   mide 744px de ancho en vertical y 744px de alto en horizontal—, así que una
   tableta se queda con la maquetación de siempre. */
@custom-variant handheld (@media (pointer: coarse) and ((max-width: 480px) or (max-height: 480px)));
@custom-variant handheld-wide (@media (pointer: coarse) and (orientation: landscape) and (max-height: 480px));
```

Para ocultar la línea de controles de teclado no hace falta variante propia:
Tailwind 4.3 ya trae `pointer-coarse:`.

**2. El presupuesto de alto, como variable CSS.**

Hoy `CABINET_CHROME` es un `string` que entra en un `style` en línea, y un
`style` en línea no entiende de `@media`. Pasa a ser una variable CSS que cada
maquetación redefine, mientras la proporción sigue viniendo del motor:

```tsx
// El ratio lo sabe JS —sale del `world` del motor—; el presupuesto lo sabe CSS.
style={{ "--av-ratio": aspectRatio } as CSSProperties}
className="[--av-chrome:16rem] handheld:[--av-chrome:26rem] handheld-wide:[--av-chrome:7rem]
           max-w-[calc((100svh-var(--av-chrome))*var(--av-ratio))]"
```

| Maquetación        | `--av-chrome` | Qué resta                                                  |
| ------------------ | ------------- | ---------------------------------------------------------- |
| Escritorio         | `16rem`       | cabecera, HUD, marco, fila de cinco, controles y `PIEL`    |
| Vertical de mano   | `26rem`       | lo mismo con la cruz y `FUEGO` debajo, y sin los controles |
| Horizontal de mano | `7rem`        | sólo cabecera y HUD: el mando se va a los lados            |

El `26rem` de vertical no es el `13rem` que se estimó al escribir esta spec: la
cruz mide 156px de alto donde la fila de cinco medía 44, y el presupuesto es la
suma real de todo lo que no es tablero en un teléfono con indicador de inicio.
Un presupuesto corto ya no desplaza la página —recorta—, así que se calibra por
lo alto y no por lo bajo. **Corregido por SPEC 12**: hoy vertical reserva
`24rem`, porque `PAUSA` se fue del HUD y la cruz bajó a 44px para dejarle sitio
al centro del mando.

En horizontal de mano manda además el alto: el marco pasa a `h-full` y el canvas
a `h-full w-auto`, apoyado en el `aspect-ratio` que `GameCanvas` ya le pone.

**3. El mando gana un lado.** `PAD` sigue siendo un array de cinco, y son las
dos maquetaciones las que lo leen distinto:

```ts
const PAD = [
  { label: "←", code: "ArrowLeft", aria: "Mover ←", side: "dpad" },
  { label: "↑", code: "ArrowUp", aria: "Mover ↑", side: "dpad" },
  { label: "↓", code: "ArrowDown", aria: "Mover ↓", side: "dpad" },
  { label: "→", code: "ArrowRight", aria: "Mover →", side: "dpad" },
  { label: "FUEGO", code: "Space", aria: "Fuego", side: "fire" },
] as const;
```

Los `dpad` van **en cruz** —`↑` arriba en el centro, `←` y `→` a los lados,
`↓` abajo— y el `fire` enfrente. La cruz y no una columna de cuatro: en columna,
`←` y `→` quedan uno encima del otro y el pulgar tiene que buscar; en cruz caen
donde la mano los espera. Ocupa lo mismo.

Dónde cae cada bloque es lo que cambia con la postura: en **horizontal**, la
cruz a la izquierda del tablero y `FUEGO` a la derecha; en **vertical**, los dos
debajo del tablero y a lo ancho del gabinete, la cruz pegada a un borde y
`FUEGO` al otro, para que cada pulgar tenga el suyo sin cruzar la mano. La fila
de cinco botones de siempre se queda **sólo para ratón y teclado**: con el dedo
no se pinta en ninguna de las dos posturas.

Eso hace que los cinco botones existan **tres veces** en el DOM —fila de cinco,
mando de vertical y mando de horizontal—, y que CSS enseñe un juego cada vez.
Los tres salen de la misma función, así que comparten manejadores y el
`disabled` que decide `ENGINE_KEYS`. Lo que **no** se duplica es el canvas: uno
solo, en un único sitio del árbol, que es lo que permite girar el aparato sin
remontar el motor.

**4. El viewport de la ruta de juego**, en `app/jugar/[id]/page.tsx`:

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Pedirlo obliga a rellenar con env(safe-area-inset-*): sin eso, el mando
  // se mete debajo del indicador de inicio.
  viewportFit: "cover",
};
```

## Plan de implementación

Cada paso deja la aplicación funcionando y se puede confirmar por separado. Los
pasos 1 a 6 mejoran también el vertical de mano; el 7 y el 8 son el horizontal,
que hoy no existe.

1. **Las dos variantes y la línea de controles.** Añadir a `app/globals.css` los
   dos `@custom-variant` de la sección anterior, junto al bloque de utilidades
   `av-*`. Colgar `pointer-coarse:hidden` del `<p>` de `game.controls` en
   `PlayCabinet`.
   _Prueba:_ en escritorio se sigue leyendo «Flechas ← → giran · ESPACIO
   dispara»; en el teléfono ya no aparece.

2. **El viewport de la ruta y el margen seguro.** Exportar `viewport` desde
   `app/jugar/[id]/page.tsx` con los cinco campos, y rellenar el `<main>` con
   `env(safe-area-inset-left/right/bottom)` además de su relleno actual.
   _Prueba:_ el doble toque sobre el gabinete ya no amplía, y en un teléfono con
   indicador de inicio el mando queda por encima de él.

3. **La pantalla de juego cabe.** En el `<main>` de esa página,
   `handheld:h-[calc(100svh-var(--av-play-header))]` y
   `handheld:overflow-hidden`, y bajar el `pb-20` a
   `handheld:pb-[env(safe-area-inset-bottom)]`. Poner `touch-none` en el
   `className` del `GameCanvas`. `--av-play-header` es una variable nueva en
   `:root` —`3.5rem`, y `2.75rem` en horizontal— que `PlayHeader` fija como su
   altura con el dedo: la cabecera es un hermano anterior del `<main>`, así que
   sin restarla la página se desplaza justo su alto. El relleno inferior no baja
   a cero del todo porque el margen seguro del paso 2 tiene que quedarse.
   _Prueba:_ arrastrar el dedo por el tablero ya no desplaza la página, y no hay
   nada que se salga por abajo.

4. **El presupuesto de alto pasa a CSS.** Sustituir la constante
   `CABINET_CHROME` por `--av-chrome` con sus tres valores y `--av-ratio` con la
   proporción del `world`, tal y como quedó en el modelo de datos. Borrar la
   constante y su comentario, que ya no describe lo que pasa.
   _Prueba:_ en el teléfono en vertical el tablero es visiblemente más alto que
   antes; en escritorio, Asteroids y Tetris se ven exactamente igual que hoy.

5. **HUD en una línea.** En `handheld`, bajar el `gap-5.5` y el tamaño de las
   cuatro celdas para que `PUNTUACION`, `VIDAS`, `NIVEL` y `JUGADOR` quepan sin
   envolver, con `PAUSA` a la derecha en la misma fila. Sale `text-[6px]` sin
   tracking: Press Start 2P avanza 1em por carácter y las cuatro celdas suman
   más de cuarenta. La de `JUGADOR` lleva `truncate` —es la única que crece sin
   techo, entre los dígitos de la puntuación y los doce caracteres del nombre—,
   así que si la línea no da se corta el nombre por el final en vez de mandar el
   HUD a una segunda fila.
   _Prueba:_ en un teléfono de 390px el bloque del HUD ocupa una sola línea y
   `PAUSA` sigue pulsándose sin apuntar.
   **Corregido por SPEC 12**: con el dedo el HUD se queda con sus cuatro celdas
   y `PAUSA` baja al centro del mando. En escritorio sigue en la misma fila.

6. **El mando gana `side` y área táctil.** Añadir el campo `side` a las cinco
   entradas de `PAD` y una altura mínima de 44px a los botones. La rejilla de
   cinco en fila no cambia todavía.
   _Prueba:_ nada se mueve de sitio; los botones son más altos y
   `npx tsc --noEmit` pasa.

7. **Horizontal: el gabinete en fila.** En `handheld-wide`, el contenedor del
   gabinete pasa a `flex` en fila con el marco de la pantalla en medio: el marco
   a `h-full`, el canvas a `h-full w-auto`, y el relleno y el borde redondeado
   del gabinete reducidos. El mando sigue debajo por ahora.
   _Prueba:_ girar el teléfono con una partida en curso: el tablero llena el
   alto de la ventana, no se deforma, y la partida **no** se reinicia.

8. **Horizontal: la cruz y el fuego.** Repartir `PAD` por `side`: los cuatro
   `dpad` a la izquierda del canvas en cruz de 3×3, el `fire` a la derecha,
   centrados verticalmente. Los botones que la máquina no usa se siguen pintando
   deshabilitados, también aquí.
   _Prueba:_ en Asteroids se gira con el pulgar izquierdo y se dispara con el
   derecho sin soltar; en Arkanoid, `↑` y `↓` salen apagados.

   Y el mismo mando en vertical, que es lo que se decidió al probarlo en un
   teléfono: la cruz y `FUEGO` bajan enteros bajo el tablero y la fila de cinco
   se apaga con el dedo. Sube con ello `--av-chrome` de vertical, porque la cruz
   ocupa 112px más de alto que la fila.

9. **La cabecera se comprime.** En `handheld-wide`, bajar el relleno vertical de
   `PlayHeader` y ocultar el título de la máquina, que ya está en la ficha.
   `ARCADE VAULT` y `SALIR` se quedan.
   _Prueba:_ en horizontal la cabecera ocupa una línea corta y `SALIR` sigue
   siendo pulsable.

10. **Los superpuestos caben.** Dar a `GameOverOverlay` un `max-h` con
    desplazamiento propio y relleno de margen seguro, y comprobar que
    `LoadingOverlay` no se sale.
    _Prueba:_ perder una partida en horizontal: se leen la puntuación, `GUARDAR
PUNTUACION`, `JUGAR DE NUEVO` y `VOLVER AL VAULT` sin que nada quede fuera.

11. **Documentar.** Actualizar en `CLAUDE.md` el apartado «Motores de juego»:
    `CABINET_CHROME` ya no existe con ese nombre y la pantalla de juego tiene
    tres maquetaciones. Añadir las dos variantes al apartado del tema, junto a
    las utilidades `av-*`.

## Criterios de aceptación

Se firman **en un teléfono real** sobre `http://192.168.x.x:3000`, anotando
modelo y navegador. Las cuatro máquinas —`asteroids`, `tetris`, `arkanoid` y
`snake`— se comprueban en las dos posturas.

Firmados el 13/08/2026. La verificación en aparato se hizo en un **iPhone con
Safari** sobre `http://192.168.100.39:3000`, en vertical y en horizontal; de ahí
salió el cambio del mando de vertical, que esta spec ya recoge. Cada casilla se
comprobó por una de estas tres vías:

| Vía         | Qué significa                                                                       |
| ----------- | ----------------------------------------------------------------------------------- |
| Herramienta | `tsc`, `lint` y `build` corridos en el repo                                         |
| Salida      | leído en el HTML y el CSS que produce `npm run build`, o en el código que lo genera |
| Aparato     | mirado y jugado en el teléfono                                                      |

Lo comprobado en la salida del build, que es lo que sostiene la mitad de la
lista: el `meta` de `viewport` sale con `viewport-fit=cover` y escala fija en las
cuatro rutas de `/jugar/`, y con la escala por defecto en el resto del sitio;
`--av-ratio` vale `1.333` en Asteroids, Arkanoid y Snake y `0.7` en Tetris, con
el `aspect-ratio` del canvas en `420 / 600`; el canvas lleva `touch-none`; los
botones del mando salen tres veces cada uno —fila de cinco, mando de vertical y
mando de horizontal— con `min-height: 44px` y celdas de 48px; en Arkanoid las
tres copias de `↑` y `↓` salen `disabled` y en Snake ninguna; y
`env(safe-area-inset-*)` aparece en los cuatro lados, repartido entre `<main>`,
cabecera y los dos superpuestos.

**No se rompe nada de lo que ya funciona**

- [x] `npx tsc --noEmit` pasa.
- [x] `npm run lint` pasa.
- [x] `npm run build` pasa.
- [x] En un escritorio de 1440×900, las cuatro máquinas se ven idénticas a como
      se veían antes de esta spec.
- [x] En escritorio se sigue jugando con el teclado y con el mando en pantalla.

**La ventana**

- [x] En vertical, la pantalla de juego entra entera en la ventana: HUD, tablero,
      la cruz, `FUEGO` y `PIEL` se ven a la vez, sin desplazar la página.
- [x] En horizontal, lo mismo: cabecera, HUD, tablero, cruz y `FUEGO` a la vez.
- [x] Arrastrar el dedo sobre el tablero no desplaza la página en ninguna de las
      dos posturas.
- [x] El doble toque sobre el tablero no amplía.
- [x] El pellizco no amplía dentro de `/jugar/[id]`, y **sí** amplía en `/salon`.
- [x] En un teléfono con indicador de inicio o muesca, ningún botón queda debajo
      de ellos.

**El tablero**

- [x] En horizontal, el tablero de Asteroids llena el alto disponible y no está
      deformado: un asteroide sigue siendo redondo.
- [x] En horizontal, el tablero de Tetris (mundo 420×600) se ve entero, con la
      fila de arriba y la de abajo a la vez.
- [x] Girar el teléfono con una partida en curso no la reinicia: la puntuación,
      las vidas y el nivel siguen donde estaban.

**El mando**

- [x] En horizontal, las cuatro flechas están a la izquierda del tablero en cruz
      y `FUEGO` a la derecha.
- [x] En vertical, la cruz y `FUEGO` están debajo del tablero, uno a cada lado
      del gabinete.
- [x] Mantener `←` con el pulgar izquierdo y pulsar `FUEGO` con el derecho gira
      y dispara a la vez en Asteroids.
- [x] Soltar un botón deslizando el dedo fuera de él suelta la tecla: la nave no
      se queda girando sola.
- [x] Tocar cualquier botón del mando no dispara la pausa automática.
- [x] Ningún botón del mando mide menos de 44px en su lado corto, en ninguna de
      las dos posturas.
- [x] En Arkanoid, `↑` y `↓` se pintan deshabilitados también en horizontal.
- [x] En Snake, los cinco botones responden en las dos posturas.

**El resto de la pantalla**

- [x] La línea «Flechas ← → giran · ESPACIO dispara» no aparece en el teléfono y
      sí en escritorio.
- [x] `JUGADOR` y el nombre siguen visibles en el HUD en las dos posturas.
- [x] Los tres botones de `PIEL` siguen visibles y pulsables en las dos
      posturas, y cambiar de piel no reinicia la partida.
- [x] El HUD ocupa una sola línea en un teléfono de 390px de ancho.
- [x] `PAUSA` / `SEGUIR` funciona en las dos posturas.
- [x] `SALIR` es visible y pulsable en las dos posturas. _Firmado con `SALIR` en
      la cabecera; desde SPEC 12 está en el centro del mando._
- [x] Cambiar de aplicación y volver deja la partida en pausa, no muerta.
- [x] `CARGANDO CARTUCHO...` se ve entero en horizontal.
- [x] Al perder, el superpuesto de fin de partida se lee entero en horizontal y
      sus cuatro elementos son alcanzables.
- [x] `GUARDAR PUNTUACION` desde el teléfono mete la marca en el salón. La marca
      puede quedarse sin dueño: por `http://` no hay `crypto.randomUUID()` y
      `deviceId()` devuelve `undefined`, que es el comportamiento ya documentado.

## Decisiones

- **Sí:** dos maquetaciones nuevas, resueltas **sólo con CSS**. Detectar el
  dispositivo en JavaScript obligaría a un estado que el servidor no puede
  conocer, y eso es un desajuste de hidratación o un parpadeo en la primera
  pintura.
- **No:** un `useMediaQuery`. Por lo mismo, y porque no hay ni un
  comportamiento que cambie: cambia dónde está cada cosa, no lo que hace.
- **Sí:** `(pointer: coarse)` en las dos variantes. Una ventana estrecha en un
  portátil no necesita el mando repartido a los lados; un teléfono sí.
- **Sí:** 480px como frontera entre teléfono y tableta. Un iPad mini mide 744px
  por su lado corto, así que las tabletas se quedan con la maquetación de
  escritorio, que en ellas ya funciona.
- **Sí:** la cruz de cuatro flechas en horizontal. En columna, `←` y `→` quedan
  uno encima del otro y el pulgar tiene que buscar.
- **No:** gestos sobre el canvas. Deslizar encaja en Snake y no encaja en
  Tetris, donde hay que rotar, bajar rápido y soltar de golpe. Un mando explícito
  vale para las cuatro máquinas y para las que vengan.
- **Sí:** bloquear el zoom sólo en `/jugar/[id]`, con un `viewport` de ruta. El
  pellizco es una ayuda de accesibilidad real en las pantallas de texto y en las
  tablas del salón; en un tablero de juego no ayuda a nadie y estorba a todos.
- **No:** declarar el `viewport` en `app/layout.tsx`. Quitaría el pellizco del
  sitio entero para arreglar una pantalla.
- **Sí:** `viewportFit: "cover"` con relleno por `env(safe-area-inset-*)`. Las
  dos cosas van juntas: pedir la primera sin la segunda mete el mando debajo del
  indicador de inicio.
- **Sí:** el presupuesto de alto como variable CSS. Un `style` en línea no
  entiende de `@media`, y el ratio del motor tiene que llegar desde JavaScript
  igualmente.
- **No:** tocar `components/game-canvas.tsx`. Su efecto de montaje depende sólo
  del motor, y todo lo que se meta ahí acaba remontando la partida. Es la misma
  razón por la que la piel viaja por el `GameHandle` y no por el canvas.
- **No:** tocar `lib/games/engine.ts` ni ningún motor. Ninguna máquina se entera
  de que se está jugando con el dedo, y ésa es la propiedad que se quiere
  conservar.
- **No:** el aviso de «gira el dispositivo». Prohibir la postura en la que mejor
  se juega para ahorrarse una maquetación es cambiar trabajo por producto.
- **No:** pantalla completa, orientación bloqueada, vibración y PWA. Cada una es
  una decisión con su propio coste; ninguna hace falta para que el juego se
  pueda jugar.

## Riesgos

| Riesgo                                                                                 | Mitigación                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| iOS Safari ignora `maximum-scale` y `user-scalable=no` desde iOS 10                    | El zoom por pellizco seguirá disponible ahí. Lo que sí se corta es el desplazamiento y el doble toque, que es lo que estorba jugando. Se anota, no se pelea. |
| `100svh` deja una franja cuando la barra de direcciones se retrae                      | Es lo correcto para esta pantalla: `svh` es el alto mínimo garantizado y con la página sin desplazamiento la barra no se retrae. La franja no tapa nada.     |
| `(pointer: coarse)` es cierto en un portátil con pantalla táctil                       | Va acompañado siempre del umbral de 480px: un portátil táctil no cumple ninguno de los dos.                                                                  |
| Un teléfono muy corto en horizontal (menos de 300px de alto) deja el tablero minúsculo | El tablero manda sobre el resto: cabecera y HUD se comprimen primero. Por debajo de eso, la máquina sigue siendo jugable aunque pequeña.                     |
| El botón `FUEGO` a la derecha tapa el tablero si el ancho no da                        | En horizontal el canvas se dimensiona por el alto y el ancho lo sigue, así que el sobrante horizontal es siempre de los mandos, nunca al revés.              |
| `env(safe-area-inset-*)` vale 0 en Android y en escritorio                             | Es el comportamiento correcto: se suma al relleno existente, no lo sustituye.                                                                                |
| La verificación es manual y depende del teléfono que haya                              | Los criterios anotan modelo y navegador. Una regresión futura se detecta repitiendo la lista, que es lo que hay hasta que exista un framework de tests.      |

## Lo que **no** entra en esta spec

- Las otras siete pantallas del sitio en móvil.
- Gestos sobre el canvas.
- Pantalla completa, bloqueo de orientación y vibración.
- Manifiesto PWA e instalación en la pantalla de inicio.
- Ocultar `JUGADOR` o el selector de `PIEL`.
- Cualquier cambio en el contrato de los motores o en el mundo de una máquina.

Cada una de ellas, si llega, va en su propia spec.

## Lo que cambió al implementarla

Ocho cosas salieron distintas de lo escrito arriba. El cuerpo de la spec ya está
corregido; aquí queda por qué, para que se lea como decisiones y no como
descuidos.

1. **El mando de vertical es la cruz, no la fila de cinco.** Era lo único que la
   spec dejaba igual con el dedo, y al probarlo en un teléfono se vio que cinco
   rectángulos en fila no se juegan: el pulgar los busca. La cruz ya existía
   para horizontal, así que vertical la reaprovecha con `FUEGO` enfrente. La
   fila de cinco no se borra —es la de ratón y teclado— pero se apaga en las dos
   posturas de mano. Con esto, los botones se pintan tres veces en el DOM y no
   dos.
2. **`--av-chrome` de vertical es `26rem`, no `13rem`.** Consecuencia de lo
   anterior: la cruz mide 156px de alto donde la fila medía 44.
3. **El `<main>` mide `100svh` menos la cabecera**, no `100svh`. `PlayHeader` es
   un hermano anterior y `sticky` ocupa sitio en el flujo, así que con `100svh`
   la página seguía desplazándose justo su alto. Se resuelve con
   `--av-play-header`, una variable en `:root` que la cabecera fija como altura
   y el `<main>` resta: van en la raíz porque son hermanos y sólo comparten lo
   que herede de arriba. En horizontal esa misma variable baja de `3.5rem` a
   `2.75rem`, que es como se comprime la cabecera del paso 9.
4. **El relleno inferior no baja a `pb-0`** sino al margen seguro. Bajarlo del
   todo metía el último control debajo del indicador de inicio, contra el
   criterio y contra la decisión de esta misma spec de que `viewportFit` y
   `env(safe-area-inset-*)` van juntos. En Android y en escritorio la diferencia
   es cero.
5. **El margen seguro llega también a `PlayHeader` y a los dos superpuestos.**
   El paso 2 sólo lo ponía en el `<main>`, pero en horizontal la muesca cae a un
   lado y sin esto `ARCADE VAULT` o `SALIR` acaban debajo.
6. **La fila de juego es un `<div>` nuevo con `display: contents`.** En
   escritorio y en vertical no existe para el layout —el marco cuelga del
   gabinete igual que siempre— y en horizontal es la fila que reparte el ancho.
   La alternativa era duplicar el marcado del marco por postura, que remontaría
   el canvas al girar y reiniciaría la partida.
7. **Se recortaron rellenos que la spec no nombraba**: los laterales del
   `<main>` en vertical, y el margen, el radio y el relleno del gabinete. Sin
   eso la fila de cinco no cabía a lo ancho de un teléfono de 390px, que era
   justo lo que el paso 6 quería evitar.
8. **Se tocó un comentario de `lib/games/snake/constants.ts`**, que nombraba
   `CABINET_CHROME`. Es la única línea de un motor que cambió, no es código, y
   dejarla habría contradicho lo que ahora dice `CLAUDE.md`.
