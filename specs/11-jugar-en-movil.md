# SPEC 11 — Jugar en un móvil táctil

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 05
> **Fecha:** 2026-08-13
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
    y el canvas ocupando todo el alto que sobre.
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
- La ruta de juego no se desplaza en una pantalla de mano: cabe en `100svh` y
  el canvas lleva `touch-action: none`.
- Relleno por `env(safe-area-inset-*)` en la pantalla de juego, que es lo que
  exige haber pedido `viewportFit: "cover"`.
- Los superpuestos de carga y de fin de partida caben y se manejan en horizontal
  de mano, con desplazamiento propio si el alto no da.
- `PlayHeader` se comprime en horizontal de mano: `SALIR` no desaparece nunca.
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
className="[--av-chrome:16rem] handheld:[--av-chrome:13rem] handheld-wide:[--av-chrome:7rem]
           max-w-[calc((100svh-var(--av-chrome))*var(--av-ratio))]"
```

| Maquetación        | `--av-chrome` | Qué resta                                               |
| ------------------ | ------------- | ------------------------------------------------------- |
| Escritorio         | `16rem`       | cabecera, HUD, marco, mando, controles y `PIEL`         |
| Vertical de mano   | `13rem`       | lo mismo sin la línea de controles y con marco reducido |
| Horizontal de mano | `7rem`        | sólo cabecera y HUD: el mando se va a los lados         |

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

En vertical se pintan los cinco en una fila, como hoy. En horizontal, los `dpad`
van a la izquierda **en cruz** —`↑` arriba en el centro, `←` y `→` a los lados,
`↓` abajo— y el `fire` a la derecha. La cruz y no una columna de cuatro: en
columna, `←` y `→` quedan uno encima del otro y el pulgar tiene que buscar; en
cruz caen donde la mano los espera. Ocupa lo mismo.

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
   `handheld:h-[100svh]` y `handheld:overflow-hidden`, y bajar el `pb-20` a
   `handheld:pb-0`. Poner `touch-none` en el `className` del `GameCanvas`.
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
   envolver, con `PAUSA` a la derecha en la misma fila.
   _Prueba:_ en un teléfono de 390px el bloque del HUD ocupa una sola línea y
   `PAUSA` sigue pulsándose sin apuntar.

6. **El mando gana `side` y área táctil.** Añadir el campo `side` a las cinco
   entradas de `PAD` y una altura mínima de 44px a los botones. La rejilla de
   cinco en fila no cambia: en vertical se sigue pintando igual.
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

**No se rompe nada de lo que ya funciona**

- [ ] `npx tsc --noEmit` pasa.
- [ ] `npm run lint` pasa.
- [ ] `npm run build` pasa.
- [ ] En un escritorio de 1440×900, las cuatro máquinas se ven idénticas a como
      se veían antes de esta spec.
- [ ] En escritorio se sigue jugando con el teclado y con el mando en pantalla.

**La ventana**

- [ ] En vertical, la pantalla de juego entra entera en la ventana: HUD, tablero
      y los cinco botones se ven a la vez, sin desplazar la página.
- [ ] En horizontal, lo mismo: cabecera, HUD, tablero, cruz y `FUEGO` a la vez.
- [ ] Arrastrar el dedo sobre el tablero no desplaza la página en ninguna de las
      dos posturas.
- [ ] El doble toque sobre el tablero no amplía.
- [ ] El pellizco no amplía dentro de `/jugar/[id]`, y **sí** amplía en `/salon`.
- [ ] En un teléfono con indicador de inicio o muesca, ningún botón queda debajo
      de ellos.

**El tablero**

- [ ] En horizontal, el tablero de Asteroids llena el alto disponible y no está
      deformado: un asteroide sigue siendo redondo.
- [ ] En horizontal, el tablero de Tetris (mundo 420×600) se ve entero, con la
      fila de arriba y la de abajo a la vez.
- [ ] Girar el teléfono con una partida en curso no la reinicia: la puntuación,
      las vidas y el nivel siguen donde estaban.

**El mando**

- [ ] En horizontal, las cuatro flechas están a la izquierda del tablero en cruz
      y `FUEGO` a la derecha.
- [ ] Mantener `←` con el pulgar izquierdo y pulsar `FUEGO` con el derecho gira
      y dispara a la vez en Asteroids.
- [ ] Soltar un botón deslizando el dedo fuera de él suelta la tecla: la nave no
      se queda girando sola.
- [ ] Tocar cualquier botón del mando no dispara la pausa automática.
- [ ] Ningún botón del mando mide menos de 44px en su lado corto, en ninguna de
      las dos posturas.
- [ ] En Arkanoid, `↑` y `↓` se pintan deshabilitados también en horizontal.
- [ ] En Snake, los cinco botones responden en las dos posturas.

**El resto de la pantalla**

- [ ] La línea «Flechas ← → giran · ESPACIO dispara» no aparece en el teléfono y
      sí en escritorio.
- [ ] `JUGADOR` y el nombre siguen visibles en el HUD en las dos posturas.
- [ ] Los tres botones de `PIEL` siguen visibles y pulsables en las dos
      posturas, y cambiar de piel no reinicia la partida.
- [ ] El HUD ocupa una sola línea en un teléfono de 390px de ancho.
- [ ] `PAUSA` / `SEGUIR` funciona en las dos posturas.
- [ ] `SALIR` es visible y pulsable en las dos posturas.
- [ ] Cambiar de aplicación y volver deja la partida en pausa, no muerta.
- [ ] `CARGANDO CARTUCHO...` se ve entero en horizontal.
- [ ] Al perder, el superpuesto de fin de partida se lee entero en horizontal y
      sus cuatro elementos son alcanzables.
- [ ] `GUARDAR PUNTUACION` desde el teléfono mete la marca en el salón. La marca
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
