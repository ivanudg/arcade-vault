# SPEC 13 — Gamepad MK-II

> **Estado:** Aceptado
> **Depende de:** SPEC 11, SPEC 12
> **Fecha:** 2026-08-14
> **Objetivo:** Vestir el mando táctil de `/jugar/[id]` con el gamepad MK-II de `references/gamepad-assets/` —chasis propio, cruz con flechas SVG y hub, `B`/`A` redondos con relieve y las dos píldoras de partida— sin tocar ninguna tecla ni la maquetación de escritorio.

## Por qué existe esta spec

La SPEC 12 dejó el mando **funcionando** como el de una consola: cruz a la
izquierda, `B` y `A` a la derecha, `PAUSA` y `SALIR` en el centro. Lo que no
tiene es **aspecto** de mando. Son los mismos rectángulos con borde cian de la
fila de cinco de escritorio, sólo que colocados en tres bloques: sin relieve,
sin chasis, y con las flechas dibujadas como caracteres de la fuente.

En `references/gamepad-assets/` hay un prototipo que sí lo tiene —el Gamepad
MK-II— y que resuelve exactamente eso: un chasis con doble borde y trama, cruz
con hub central y flechas SVG, y dos botones redondos con relieve, halo y aro.
Esta spec es un cambio de piel: **ni una tecla nueva, ni un motor tocado, ni un
píxel de escritorio movido**.

Hay una cosa que sí cambia de comportamiento, y es consecuencia del aspecto: si
un botón se dibuja hundido al pulsarlo, tiene que hundirse **cuando la tecla
está pulsada**, no cuando el dedo está encima de ese botón concreto. En
Asteroids `↑` llega desde la cruz y desde `B`; con `:active` de CSS, apretar `B`
deja la flecha de la cruz apagada mientras el propulsor está encendido. El
gabinete ya sabe la verdad —la cuenta de `held` de la SPEC 12—, pero hoy vive en
una `ref` que nadie pinta.

## Alcance

**Dentro:**

- Sólo las dos maquetaciones de dedo, `handheld` y `handheld-wide`. En
  escritorio no cambia **nada**: la fila de cinco botones con `FUEGO`, la línea
  de controles de teclado, `PAUSA` en el HUD y `--av-chrome: 28rem` se quedan
  exactamente como están.
- Componente nuevo `components/game-pad.tsx`, dueño del mando de dedo y de las
  tablas que hoy viven en `play-cabinet.tsx`: `PAD`, `CROSS_CELL`, `ENGINE_KEYS`
  y `ENGINE_PAD`, más el botón base. `play-cabinet.tsx` las importa de ahí para
  su fila de escritorio: una sola fuente.
- Chasis del prototipo: degradado vertical, borde cian, borde interior a 4px,
  trama de puntos de 8px y sombra proyectada. En vertical, un chasis bajo el
  tablero. En horizontal, **dos medio-chasis**, uno por lado, con el redondeo
  hacia fuera del tablero.
- Cruz con la geometría del prototipo —cara en degradado, sombra dura de 4px
  abajo, hundido de 3px al pulsar— a los tamaños de hoy: 44px de celda en
  vertical, 48px en horizontal.
- Flechas SVG triangulares rellenas con `currentColor`, con `drop-shadow` cian
  al encender. Los caracteres `←↑↓→` desaparecen del mando de dedo; siguen en la
  fila de cinco de escritorio.
- Hub central de la cruz, con la gema cian en rombo y su pulso de 2s.
- `B` y `A` redondos de 56px con la piel del prototipo: degradado radial con luz
  alta, borde de 2px del color, relieve de 6px, halo, aro punteado y la letra en
  Press Start 2P con su `text-shadow`. `A` magenta, `B` cian.
- `PAUSA` y `SALIR` rediseñados como dos píldoras pequeñas: en vertical,
  apiladas en el centro del chasis; en horizontal, repartidas como hoy —`PAUSA`
  en el chasis izquierdo, `SALIR` en el derecho—.
- Un botón se dibuja pulsado cuando **su tecla** está pulsada, venga del botón
  que venga. La cuenta de `held` pasa a pintar.
- Estado apagado propio para lo que la máquina no usa —`B` en Arkanoid y Snake,
  las flechas que sobran—: cara hundida, sin relieve, sin aro y sin brillo.
- Tokens nuevos en `@theme inline` de `app/globals.css` para lo que se repite
  —chasis, cara de botón, sombra dura— y la animación de la gema como
  `animate-av-led`, junto al resto de `av-*`.
- Re-medir en Chrome, a 390 y a 360 de ancho, los presupuestos `--av-chrome` de
  `handheld` (hoy `24rem`) y `handheld-wide` (hoy `7rem`): el chasis añade alto
  y el margen de 18px que dejó la SPEC 11 no lo cubre.
- Actualizar `CLAUDE.md` donde deje de ser cierto.

**Fuera de alcance (para specs futuras):**

- Escritorio. La fila de cinco no se convierte en gamepad, ni cambia de piel.
- Teclas nuevas, cambios en `ENGINE_PAD` o en `ENGINE_KEYS`, y cualquier línea
  de `lib/games/`. El contrato de `lib/games/engine.ts` no se toca.
- Reflejar el teclado físico en el mando. Se enciende con lo que el mando manda,
  no con lo que llega por `window`.
- Vibración háptica al pulsar.
- Que el mando cambie de color con la piel del juego. El selector `PIEL` viste
  el canvas; el mando es del sitio, no de la máquina.
- Las otras siete pantallas y `SiteHeader`/`SiteFooter`, que son de
  `mobile-porter`.
- JetBrains Mono. El prototipo la usa; aquí las fuentes siguen siendo Press
  Start 2P y Courier Prime.
- Sonido al pulsar.

## Modelo de datos

Esta spec **no introduce datos persistidos**: nada nuevo en `localStorage`, en
Supabase ni en el contrato de `lib/games/engine.ts`. Lo que sí aparece son tres
estructuras de interfaz.

### 1. La cuenta de `held` pasa a pintar

La SPEC 12 dejó `held` en una `ref` porque nadie la miraba. Ahora la mira el
mando, así que junto a la `ref` vive un espejo en estado con las teclas que están
abajo:

```ts
// components/play-cabinet.tsx
/** Teclas pulsadas ahora mismo, sea desde el botón que sea. Espeja `held`
    para que el mando pueda dibujarlas hundidas. */
const [down, setDown] = useState<ReadonlySet<string>>(new Set());
```

`held` sigue siendo la fuente: es quien cuenta. `down` sólo se toca cuando una
tecla **cruza el cero** —de 0 a 1 en `pressKey()`, de 1 a 0 en `releaseKey()`— y
se vacía entero en `clearHeld()`. Eso son unos pocos renders por segundo, del
orden de los que ya provoca `onState`, y nunca uno por frame.

### 2. La interfaz de `components/game-pad.tsx`

```ts
/** Las dos posturas de mano. No hay una tercera: escritorio no monta esto. */
type PadLayout = "vertical" | "horizontal";

type GamePadProps = {
  gameId: GameId;
  layout: PadLayout;
  /** Teclas hundidas ahora mismo. */
  down: ReadonlySet<string>;
  /** El dedo que llega y el que se va. El gabinete sigue llevando la cuenta. */
  onPress: (pointerId: number, code: string) => void;
  onRelease: (pointerId: number, code: string) => void;
  paused: boolean;
  onPause: () => void;
  onExit: () => void;
};
```

En horizontal el componente se monta **dos veces**, una por lado:

```ts
/** Qué medio-chasis se pinta. `full` es el de vertical, entero. */
type PadSide = "full" | "left" | "right";
```

`left` lleva cruz y `PAUSA`; `right`, `B`/`A` y `SALIR`; `full`, los tres
bloques. Las tablas `PAD`, `CROSS_CELL`, `ENGINE_KEYS` y `ENGINE_PAD` se mudan
aquí sin cambiar de forma, y `play-cabinet.tsx` importa las dos que necesita su
fila de escritorio.

### 3. Los tokens nuevos

En `:root` de `app/globals.css`, con el `--color-av-*` correspondiente en
`@theme inline`, siguiendo la convención de los que ya hay:

```css
--av-pad-shell-top: #1c1c28; /* cara alta del chasis */
--av-pad-shell-bottom: #0c0c14; /* cara baja del chasis */
--av-pad-face-top: #1a1a25; /* cara alta de un botón en reposo */
--av-pad-face-bottom: #0a0a12; /* cara baja */
--av-pad-edge: #050507; /* el canto duro de debajo, el relieve */
```

Y la animación de la gema, junto a las otras trece:

```css
--animate-av-led: av-led 2s ease-in-out infinite;
```

con sus `@keyframes av-led` abajo, en el bloque donde ya viven `av-pulse` y
compañía. Los degradados, los halos y los rgba de una sola aparición se quedan
como valor arbitrario dentro de `game-pad.tsx`: un token que se usa una vez es un
nombre que mantener sin nada que unificar.

## Plan de implementación

Cada paso deja el repo compilando y la pantalla jugable. Los tres primeros no
cambian ni un píxel: son la infraestructura.

1. **Tokens y animación.** Añadir a `:root` de `app/globals.css` los cinco
   `--av-pad-*`, sus `--color-av-pad-*` en `@theme inline`, el
   `--animate-av-led` y los `@keyframes av-led` en el bloque de abajo.
   Comprobación: `npm run build` pasa y la pantalla de juego se ve igual.

2. **Mudanza a `components/game-pad.tsx`.** Crear el componente con `PAD`,
   `CROSS_CELL`, `ENGINE_KEYS`, `ENGINE_PAD`, el botón base y los dos bloques de
   dedo **copiados tal cual**, con la piel de hoy y la firma de `GamePadProps`.
   `play-cabinet.tsx` lo monta —una vez en vertical, dos en horizontal con
   `side="left"` y `side="right"`— e importa `PAD` y `ENGINE_KEYS` para su fila
   de cinco. Refactor puro. Comprobación: en Chrome a 390 de ancho, vertical y
   horizontal se ven exactamente igual que antes y Asteroids se juega igual.

3. **La cuenta pinta.** Añadir el estado `down` en `play-cabinet.tsx`,
   actualizarlo en `pressKey()`, `releaseKey()` y `clearHeld()` sólo al cruzar el
   cero, y pasarlo al mando. Los botones dejan de depender de `active:` y se
   dibujan hundidos por `down`. Comprobación: en Asteroids, mantener `B` enciende
   **también** la flecha `↑` de la cruz, y soltar uno de los dos con el otro
   apretado no apaga ninguno.

4. **La cruz.** Cara en degradado con `--av-pad-face-*`, canto duro de 4px con
   `--av-pad-edge`, hundido de 3px al pulsar, y las flechas como SVG triangulares
   con `fill="currentColor"` y `drop-shadow` cian al encender. El `aria-label` de
   cada botón no cambia. Comprobación: las cuatro flechas apuntan a donde deben y
   el lector de pantalla sigue diciendo «Mover ←».

5. **El hub.** Celda central de la cruz con su fondo radial, borde cian tenue y
   la gema en rombo por `clip-path`, con `animate-av-led`. `aria-hidden`, que no
   es un botón. Comprobación: la gema late y no se puede pulsar ni tabular.

6. **`B` y `A`.** Redondos de 56px, degradado radial con la luz alta arriba a la
   izquierda, borde de 2px del color, relieve de 6px, halo, aro punteado que
   aparece al pulsar y la letra en Press Start 2P con su `text-shadow`. `A`
   magenta, `B` cian. Comprobación: en Tetris `B` suelta la pieza de golpe y `A`
   rota, como antes.

7. **El estado apagado.** Cara hundida, sin relieve, sin aro y sin brillo, a
   `opacity-35`, y `disabled` como ya estaba. Comprobación: en Arkanoid, `B` y
   las flechas `↑`/`↓` se ven muertas y no responden al dedo.

8. **Chasis de vertical.** Envolver los tres bloques en el panel: degradado,
   borde cian, borde interior a 4px, trama de puntos de 8px y sombra proyectada.
   Comprobación: a 360 de ancho el chasis no desborda y los tres bloques siguen
   en una fila.

9. **Chasis de horizontal.** Los dos medio-chasis, con el redondeo hacia fuera
   del tablero y sin el borde interior por el lado que mira al canvas.
   Comprobación: a 740 × 360 los dos lados y el tablero caben sin recorte.

10. **Las píldoras de partida.** `PAUSA` y `SALIR` como píldoras pequeñas: en
    vertical apiladas en el centro del chasis, en horizontal una en cada lado.
    Mantienen las 44px de lado corto. Comprobación: `PAUSA` alterna a `SEGUIR` y
    `SALIR` abre `ExitOverlay` con la partida en pausa.

11. **Re-medir los presupuestos.** En Chrome a 390 × 844 y a 360 × 640, medir de
    arriba abajo lo que ocupa cada maquetación y ajustar `--av-chrome` de
    `handheld` y de `handheld-wide` a lo medido, con el margen de sobra apuntado
    en el comentario que ya existe en `play-cabinet.tsx`. El de escritorio,
    `28rem`, no se toca. Comprobación: el tablero entra entero sin desplazar la
    página en las dos posturas y en los dos anchos.

12. **Documentación.** Actualizar en `CLAUDE.md` el apartado del mando de dedo
    —hay un componente nuevo y las tablas cambiaron de casa— y la tabla de las
    tres maquetaciones con los presupuestos nuevos. Anotar en la SPEC 12 lo que
    deje de ser cierto de su piel.

## Criterios de aceptación

**Escritorio no se entera**

- [ ] A 1280 de ancho, `/jugar/asteroids` enseña la fila de cinco botones con
      `←`, `↑`, `↓`, `→` y `FUEGO`, la línea de controles de teclado y `PAUSA` en
      el HUD, sin chasis ni botones redondos.
- [ ] `--av-chrome` de escritorio sigue en `28rem`.
- [ ] Ningún botón de la fila de cinco cambia de tamaño, color ni tipografía.

**El mando se ve como el prototipo**

- [ ] Con puntero grueso y ventana por debajo de 480px, el mando va dentro de un
      chasis con borde redondeado, borde cian, borde interior y trama de puntos.
- [ ] Las cuatro flechas son triángulos SVG, no caracteres de la fuente.
- [ ] La celda central de la cruz tiene el hub con la gema en rombo, y la gema
      late.
- [ ] `B` es cian y `A` es magenta, los dos redondos, con relieve y letra en
      Press Start 2P.
- [ ] `A` está a la derecha de `B` en las dos posturas.
- [ ] En horizontal hay dos medio-chasis, uno a cada lado del tablero, y ningún
      chasis alrededor del canvas.

**El mando dice la verdad**

- [ ] En Asteroids, mantener `B` dibuja hundida también la flecha `↑` de la cruz.
- [ ] Con `↑` pulsada desde la cruz y desde `B` a la vez, soltar uno de los dos
      deja los dos botones hundidos y el propulsor encendido.
- [ ] Al soltar el último de los dos, los dos botones vuelven a reposo y el
      propulsor se apaga.
- [ ] Pulsar `PAUSA` con un dedo encima de la cruz deja todos los botones en
      reposo al reanudar.
- [ ] En Arkanoid, `B` y las flechas `↑` y `↓` se ven apagadas —sin relieve ni
      aro— y no responden al dedo.

**Nada se rompió**

- [ ] Las cinco teclas siguen siendo las mismas: `npx tsc --noEmit` pasa y
      `lib/games/` no tiene ni una línea cambiada.
- [ ] `PAUSA` alterna a `SEGUIR` y `SALIR` abre `ExitOverlay` con la partida ya
      en pausa.
- [ ] Girar el teléfono de vertical a horizontal no reinicia la partida: la
      puntuación del HUD sigue donde estaba.
- [ ] Todo botón del mando mide 44px o más en su lado corto, incluidas las dos
      píldoras de partida.
- [ ] A 390 × 844 y a 360 × 640, en las dos posturas y con las cuatro máquinas,
      el tablero entra entero y la página no se desplaza en ningún eje.
- [ ] `npm run lint` y `npm run build` pasan.

## Decisiones

**Alcance**

- **Sí:** la piel nueva sólo en `handheld` y `handheld-wide`. Escritorio se queda
  con su fila de cinco. El prototipo es un mando ancho de dos pulgares y eso es
  lo que hay con el dedo; con ratón, una fila de botones se pulsa igual de bien y
  cambiarla obligaría a re-medir el presupuesto de escritorio, que costó una
  medición entera en la SPEC 11.
- **No:** teclas nuevas. `B` y `A` siguen repartiendo las cinco de siempre por
  `ENGINE_PAD`. Una sexta tecla es una spec de motores, no de piel.
- **No:** que el mando cambie con la piel del juego. `PIEL` viste el canvas; el
  mando es del sitio.

**Forma**

- **Sí:** chasis completo, con su trama y su sombra. Es lo que convierte tres
  bloques sueltos en un mando; sin él sólo quedaba el relieve de los botones, que
  a 44px se nota poco.
- **Sí:** dos medio-chasis en horizontal. El tablero va en medio, así que un
  panel único es imposible, y envolver la fila entera —canvas incluido— metería
  el marco calculado del gabinete dentro de otro marco.
- **Sí:** hub central con la gema y su pulso. La celda central estaba vacía y es
  lo que hace que las cuatro flechas se lean como una cruz.
- **Sí:** flechas SVG. El `aria-label` ya lleva la dirección, así que el glifo no
  aportaba nada, y el `drop-shadow` cian del prototipo no se puede hacer con un
  carácter sin repintar la sombra del texto.
- **Sí:** mantener los tamaños de hoy, 44px de celda y 56px de acción, con la
  geometría del prototipo. En un teléfono de 360px los tres bloques ya suman 308
  de 328 útiles; los 50px y 74px del prototipo no caben y empujarían el centro a
  otra fila.
- **No:** píldoras inclinadas estilo NES. La inclinación cuesta área táctil real
  en la esquina y aquí el ancho está contado.

**Comportamiento**

- **Sí:** el botón se hunde por `held` y no por `:active`. Con `:active`, en
  Asteroids apretar `B` deja la flecha `↑` apagada mientras el propulsor está
  encendido, y un mando que no dice la verdad es peor que uno feo.
- **No:** reflejar el teclado físico. El prototipo lo hace, pero con puntero
  grueso no hay teclado, y engancharse a `window` duplicaría lo que ya hace
  `createInput()`.
- **Sí:** un espejo en estado de la `ref`. Cuesta un render por transición de
  tecla, unas pocas por segundo; pintar por DOM directo desde la `ref` evitaría
  ese render pero mete manipulación imperativa en un componente que hoy no la
  tiene.
- **Sí:** estado apagado propio, cara hundida y sin relieve. El `opacity-35`
  sobre la cara completa deja un botón que parece pulsable pero pálido; hundido
  se lee como muerto.

**Casa del código**

- **Sí:** `components/game-pad.tsx`. `play-cabinet.tsx` son 896 líneas y el
  chasis suma marcado y SVG; el gabinete orquesta la partida y el mando es otra
  cosa.
- **Sí:** las cuatro tablas se mudan con él y el gabinete las importa. Duplicar
  `ENGINE_KEYS` para que cada uno tenga la suya es la forma segura de que un día
  digan cosas distintas.
- **Sí:** tokens sólo para lo que se repite. Un token de un solo uso es un nombre
  que mantener sin nada que unificar; los `@keyframes`, en cambio, no tienen
  dónde ir salvo `globals.css`.

**Método**

- **Sí:** los presupuestos `--av-chrome` se re-miden en Chrome, no se estiman. Es
  la regla que dejó escrita la SPEC 11 y la que descubrió que el de escritorio
  llevaba mal desde la SPEC 05.

## Riesgos

| Riesgo                                                                                        | Mitigación                                                                                                                                                               |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El relleno del chasis roba ancho y a 360px los tres bloques no caben en una fila              | El hueco entre bloques cede antes que el tamaño de un botón: 44px es suelo. Si aun así no cabe, el chasis va a relleno lateral 0 y sólo conserva el borde                |
| `html { overflow-x: hidden }` convierte un desbordamiento en recorte silencioso, no en scroll | Se mide en Chrome a 390 y a 360 comparando `scrollWidth` con `clientWidth`, como fijó `mobile-porter`. A ojo no se ve                                                    |
| El chasis añade alto y el tablero encoge                                                      | Paso 11: se re-mide `--av-chrome`. Si hay que recortar, se recorta el relleno del chasis, nunca `PIEL` ni el tablero                                                     |
| La sombra proyectada del chasis (`0 30px 80px -30px`) se recorta contra el marco del gabinete | El gabinete no lleva `overflow: hidden`; si apareciera recorte, la sombra baja a un halo interior                                                                        |
| La trama de puntos de 8px del chasis bate con las `av-scanlines` del sitio y produce muaré    | Se mira en pantalla real antes de cerrar. La trama va a `opacity: 0.6` como en el prototipo, y si bate, baja                                                             |
| `handheld` exige `(pointer: coarse)`, que un Chrome de escritorio no cumple                   | Se verifica con la emulación táctil del device toolbar, no redimensionando. Lo pagó la SPEC 12 y lo dejó escrito en su «Validación»                                      |
| Un `pointerup` perdido deja un botón dibujado hundido para siempre                            | `down` se vacía en `clearHeld()`, que ya corre al pausar, al morir y al reiniciar. El descuadre no dura más que la partida                                               |
| El espejo `down` re-renderiza el gabinete y con él el canvas                                  | `GameCanvas` monta en un efecto que sólo depende del `GameMount` y guarda los callbacks en una `ref`: un render del padre no remonta el motor. Se comprueba en el paso 3 |

## Lo que **no** entra en esta spec

- Escritorio: la fila de cinco botones, la línea de controles y `PAUSA` en el HUD
  se quedan como están.
- Teclas nuevas, cambios en `ENGINE_PAD`/`ENGINE_KEYS` y cualquier línea de
  `lib/games/`.
- Que el mando se encienda con el teclado físico.
- Vibración háptica y sonido al pulsar.
- Que el mando cambie de color con la piel del juego.
- Las otras siete pantallas, `SiteHeader` y `SiteFooter`, que son de
  `mobile-porter`.
- JetBrains Mono.

Cada una de ellas, si entra, entra en su propia spec.
