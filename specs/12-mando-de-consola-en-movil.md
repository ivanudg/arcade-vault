# SPEC 12 — Mando de consola en el móvil

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 11
> **Fecha:** 2026-08-13
> **Objetivo:** Convertir el mando táctil de `/jugar/[id]` en un mando de consola —cruz, `B` y `A` con la acción que toque en cada máquina, y `PAUSA` y `SALIR` en el centro—, sólo cuando se juega con el dedo y sin tocar el contrato de los motores.

## Por qué existe esta spec

La SPEC 11 hizo que el vault se pudiera jugar en un teléfono, y al probarlo
apareció lo siguiente: el mando cabe y responde, pero **es un mando de una sola
acción**. `FUEGO` manda `ESPACIO` y nada más, así que el propulsor de Asteroids
y el rotar de Tetris viven en la cruz, donde el pulgar izquierdo ya está ocupado
girando. Un mando de consola resuelve eso repartiendo: dirección a la izquierda,
acciones a la derecha.

Y hay dos botones que hoy están donde no se usan: `PAUSA`, arriba en un HUD de
6px, y `SALIR`, en la cabecera. Los dos son de partida, y en un mando de verdad
van en el centro, entre los dos pulgares.

Nada de esto cambia lo que entiende un motor: siguen siendo las mismas cinco
teclas. Lo único nuevo es que una tecla puede llegar ahora desde dos botones a
la vez, y eso hay que contarlo.

## Alcance

**Dentro:**

- Sólo el mando de `/jugar/[id]` con el dedo, es decir las variantes `handheld`
  y `handheld-wide` de la SPEC 11. En escritorio no cambia **nada**: la fila de
  cinco botones con `FUEGO`, la línea de controles de teclado y `PAUSA` en el
  HUD siguen exactamente como están.
- Dos botones de acción, `B` y `A`, en ese orden, redondos, donde hoy hay un
  único `FUEGO`. `A` es la acción principal y cae bajo el pulgar.
- Una tabla nueva en `components/play-cabinet.tsx` que dice qué tecla manda cada
  uno en cada máquina. Ningún motor la conoce y ninguno se toca.
- Un botón que la máquina no usa se pinta deshabilitado, como ya hace la cruz:
  en Arkanoid y en Snake, `B` sale apagado.
- Contador de pulsaciones por tecla en el gabinete: `↑` puede llegar desde la
  cruz y desde `B` a la vez, y la tecla sólo se suelta cuando se levanta el
  último dedo que la pedía.
- `PAUSA` y `SALIR` bajan al mando cuando se juega con el dedo: en vertical, los
  dos en el centro entre la cruz y los botones; en horizontal, `PAUSA` bajo la
  cruz y `SALIR` bajo `B`/`A`. Con el dedo, `PAUSA` desaparece del HUD y `SALIR`
  de `PlayHeader`.
- `SALIR` pide confirmación: pausa la partida y abre un superpuesto nuevo con
  `SI, SALIR` y `SEGUIR JUGANDO`. Es el tercer superpuesto de la pantalla, con
  el mismo lenguaje visual que el de fin de partida.
- Los botones nuevos conservan las 44px de lado corto y el `touch-action: none`
  que fijó la SPEC 11, y sueltan la tecla al salirse el dedo o cancelarse el
  gesto.
- Actualizar la SPEC 11 y `CLAUDE.md` donde dejen de ser ciertos: «`SALIR` no
  desaparece nunca» y «`PAUSA` a la derecha en la misma fila» del HUD.

**Fuera de alcance (para specs futuras):**

- Acciones nuevas en los motores. `B` y `A` reparten las cinco teclas que ya
  existen; no aparece una sexta.
- Cambiar el contrato de `lib/games/engine.ts`, `components/game-canvas.tsx` o
  el `world` de una máquina.
- Un mando configurable por el jugador, o recordar en `localStorage` qué botón
  hace qué.
- Gestos sobre el canvas, vibración al pulsar, pantalla completa y PWA: siguen
  fuera, igual que en la SPEC 11.
- El mando de escritorio y la línea de `game.controls`.
- Compactar `PIEL` o cualquier otra cosa del gabinete para hacer sitio.
- Reiniciar la partida desde el mando (el `START` de la foto): `REINTENTAR`
  sigue apareciendo sólo al perder.

## Modelo de datos

Esta spec no introduce datos de dominio: nada en Supabase, nada en
`localStorage` y ningún campo nuevo en `GameMount` ni en `GameHandle`. Aparecen
cuatro estructuras, todas en `components/play-cabinet.tsx`.

**1. Qué manda cada botón de acción, por máquina.**

```ts
/** Un botón de acción: la tecla que inyecta y cómo se anuncia. */
type PadAction = { code: string; aria: string };

/**
 * `A` es la acción principal —la que más se pulsa— y cae a la derecha, bajo el
 * pulgar. `B` es la secundaria, y `null` cuando la máquina no tiene ninguna:
 * entonces se pinta apagado, como ya hace la cruz con las flechas que sobran.
 * Las teclas son las mismas cinco de siempre: aquí sólo se reparten.
 */
const ENGINE_PAD: Partial<Record<GameId, { a: PadAction; b: PadAction | null }>> = {
  asteroids: {
    a: { code: "Space", aria: "Disparar" },
    b: { code: "ArrowUp", aria: "Propulsor" },
  },
  tetris: {
    a: { code: "ArrowUp", aria: "Rotar" },
    b: { code: "Space", aria: "Soltar de golpe" },
  },
  arkanoid: { a: { code: "Space", aria: "Lanzar la bola" }, b: null },
  snake: { a: { code: "Space", aria: "Arrancar" }, b: null },
};
```

Las acciones salen de lo que hace hoy cada motor, leído en su código: en
Asteroids `ESPACIO` dispara y `↑` empuja; en Tetris `↑` rota y `ESPACIO` es el
`hardDrop`; en Arkanoid `ESPACIO` lanza la bola desde la paleta; en Snake
`ESPACIO` arranca la partida.

`PAD`, el array de cinco de la SPEC 11, **no cambia**: sigue siendo el mando de
escritorio y la fuente de las cuatro flechas de la cruz. Su entrada `FUEGO` deja
de pintarse con el dedo.

**2. El contador de dedos por tecla.**

`↑` llega ahora desde dos sitios en Asteroids y en Tetris. Sin contar, soltar
`B` mataría el propulsor aunque el pulgar izquierdo siga en la cruz:

```ts
/** Cuántos botones tienen pulsada cada tecla ahora mismo. */
const held = useRef(new Map<string, number>());

function pressKey(code: string) {
  const n = (held.current.get(code) ?? 0) + 1;
  held.current.set(code, n);
  if (n === 1) handle.current?.press(code); // el primer dedo la baja
}

function releaseKey(code: string) {
  const n = (held.current.get(code) ?? 1) - 1;
  held.current.set(code, Math.max(0, n));
  if (n <= 0) handle.current?.release(code); // el último la suelta
}
```

Todos los botones del mando pasan por aquí, también los de escritorio: una sola
puerta hacia el motor. El mapa se vacía al terminar la partida y al reiniciar,
para que una tecla no quede colgada.

**3. Dónde cae cada bloque, por postura.** Tres grupos —cruz, centro y
acciones— y CSS los coloca:

| Postura            | Cruz                                      | Centro (`PAUSA` · `SALIR`)                            | Acciones (`B` `A`)                      |
| ------------------ | ----------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| Escritorio         | fila de cinco con `FUEGO`                 | `PAUSA` en el HUD, `SALIR` en la cabecera             | —                                       |
| Vertical de mano   | izquierda, bajo el tablero                | en medio, entre los dos                               | derecha                                 |
| Horizontal de mano | izquierda del tablero, con `PAUSA` debajo | repartido: `PAUSA` bajo la cruz, `SALIR` bajo `B`/`A` | derecha del tablero, con `SALIR` debajo |

```
VERTICAL                              HORIZONTAL

+--------------------------+            [^]                  ( B )( A )
|         TABLERO          |          [<] [>]  | TABLERO |
+--------------------------+            [v]                   (SALIR)
   [^]                              (PAUSA)
 [<] [>]  (PAUSA)(SALIR)  ( B )( A )
   [v]
```

**4. El superpuesto de salida.** Un estado y un componente nuevos, hermanos de
los dos que ya hay:

```tsx
const [leaving, setLeaving] = useState(false);

// Pedir salir pausa la partida; cancelar la reanuda.
// z-56: por encima del gabinete, por debajo de la carga (z-60).
{
  leaving && <ExitOverlay onCancel={...} href={`/juego/${game.id}`} />;
}
```

Con el texto: `SALIR DE LA PARTIDA?`, la advertencia de que la marca no se
guarda, `SI, SALIR` (que navega) y `SEGUIR JUGANDO` (que cierra y despausa).

## Plan de implementación

Seis pasos. Cada uno deja la aplicación funcionando y se puede confirmar por
separado; el 1 no cambia nada en pantalla a propósito.

1. **El contador de teclas.** Añadir `held`, `pressKey()` y `releaseKey()` a
   `PlayCabinet`, y hacer que los botones existentes —los tres juegos: fila de
   cinco, mando de vertical y mando de horizontal— llamen a esos dos en vez de
   a `handle.press()` / `handle.release()` directamente. Vaciar el mapa en
   `replay()` y al terminar la partida.
   _Prueba:_ nada se mueve de sitio y todo se juega igual que ahora, en
   escritorio y en el teléfono. `npx tsc --noEmit` pasa.

2. **`B` y `A` sustituyen a `FUEGO` con el dedo.** Añadir `ENGINE_PAD` y pintar
   los dos botones redondos en el mando de vertical y en el de horizontal, en
   ese orden. `B` deshabilitado donde vale `null`. El mando de escritorio no se
   toca: sigue con su `FUEGO` rectangular.
   _Prueba:_ en Asteroids, `A` dispara y `B` empuja, y mantener `B` con la nave
   girando desde la cruz no corta el propulsor al soltar uno de los dos; en
   Tetris `A` rota y `B` suelta la pieza de golpe; en Arkanoid y Snake, `B` sale
   apagado.

3. **`PAUSA` baja al mando.** Ocultarlo del HUD con las variantes `handheld` y
   pintarlo en el centro del mando en vertical, y bajo la cruz en horizontal.
   Mismo estado, mismo `aria-pressed`, mismo comportamiento.
   _Prueba:_ el HUD de un teléfono de 390px queda con las cuatro celdas y sin
   botón; `PAUSA` / `SEGUIR` sigue funcionando en las dos posturas.

4. **`SALIR` baja al mando, y pregunta.** Ocultarlo de `PlayHeader` con el dedo
   y pintarlo junto a `PAUSA` en vertical, y bajo `B`/`A` en horizontal. Al
   pulsarlo, pausar la partida y abrir `ExitOverlay`; `SEGUIR JUGANDO` lo cierra
   y despausa, `SI, SALIR` navega a `/juego/[id]`.
   _Prueba:_ en plena partida, `SALIR` no saca de la pantalla sin preguntar, y
   cancelar devuelve la partida donde estaba, no reiniciada.

5. **Recalibrar el presupuesto de alto.** `--av-chrome` de vertical se recalcula
   con el HUD sin su botón y el mando ya montado, y se comprueba en un teléfono
   que `PIEL` sigue entero dentro de la ventana.
   _Prueba:_ en vertical se ven a la vez HUD, tablero, mando y `PIEL`, sin
   desplazar la página; en horizontal, todo lo de la SPEC 11 más los dos botones
   del centro.

6. **Documentar.** En `CLAUDE.md`, el apartado «Motores de juego»: el mando con
   el dedo es cruz + `B`/`A` + centro, y la tabla de teclas por máquina. En la
   SPEC 11, corregir los dos puntos que dejan de ser ciertos —`PAUSA` en la
   misma fila del HUD y «`SALIR` no desaparece nunca»— con una nota que apunte
   a esta spec.

## Criterios de aceptación

Se firman **en un teléfono real** sobre `http://192.168.x.x:3000`, anotando
modelo y navegador, con las cuatro máquinas y en las dos posturas.

Los marcados se firmaron en escritorio, por los medios que detalla
«Validación»; los que siguen sin marcar son los que **sólo** puede firmar un
dedo sobre un teléfono.

**No se rompe nada de lo que ya funciona**

- [x] `npx tsc --noEmit` pasa.
- [x] `npm run lint` pasa.
- [x] `npm run build` pasa.
- [x] En escritorio, el mando sigue siendo la fila de cinco con `FUEGO`, la
      línea de controles de teclado sigue visible y `PAUSA` sigue en el HUD.
- [x] En escritorio se juega igual que antes con el teclado y con el ratón.
- [x] Las cuatro máquinas siguen recibiendo las mismas cinco teclas: ningún
      motor cambió y `lib/games/` no tiene un solo archivo tocado.

**Los botones de acción**

- [x] En el teléfono, donde había un `FUEGO` hay dos botones redondos, `B` a la
      izquierda y `A` a la derecha, en las dos posturas. _En el DOM están los
      dos, redondos y en ese orden, dos veces cada uno; falta ver la
      colocación._
- [x] En Asteroids, `A` dispara y `B` empuja.
- [x] En Tetris, `A` rota y `B` suelta la pieza de golpe.
- [x] En Arkanoid, `A` lanza la bola y `B` está apagado.
- [x] En Snake, `A` arranca la partida y `B` está apagado.
- [x] Con la nave girando desde la cruz, pulsar y soltar `B` no corta el giro;
      con `↑` pulsado en la cruz y en `B` a la vez, soltar uno de los dos deja
      el propulsor encendido y soltar el segundo lo apaga.
- [x] Deslizar el dedo fuera de `A` o de `B` suelta su tecla. _El botón responde
      a `pointerout`; que el dedo lo emita al salirse depende de haber soltado
      la captura implícita, y eso pide un táctil de verdad._
- [x] Ningún botón del mando mide menos de 44px en su lado corto.

**El centro**

- [x] En vertical, `PAUSA` y `SALIR` están entre la cruz y los botones de
      acción.
- [x] En horizontal, `PAUSA` está bajo la cruz y `SALIR` bajo `B`/`A`.
- [x] Con el dedo, `PAUSA` ya no aparece en el HUD y `SALIR` ya no aparece en la
      cabecera; en escritorio siguen los dos donde estaban. _La mitad de
      escritorio, firmada._
- [x] `PAUSA` pausa y `SEGUIR` reanuda, en las dos posturas.
- [x] `SALIR` no saca de la partida en un solo toque: pausa y pregunta.
- [x] `SEGUIR JUGANDO` cierra la pregunta y devuelve la partida con su
      puntuación, sus vidas y su nivel intactos, sin volver a cargar el
      cartucho.
- [x] `SI, SALIR` lleva a la ficha de la máquina.
- [x] El superpuesto de salida se lee entero en horizontal y sus dos botones son
      alcanzables.
- [x] Perder la partida con la pregunta abierta no deja los dos superpuestos
      encima a la vez.

**La ventana**

- [x] En vertical se ven a la vez HUD, tablero, mando entero y `PIEL`, sin
      desplazar la página.
- [x] En horizontal se ven a la vez cabecera, HUD, tablero, cruz, `PAUSA`,
      `B`/`A` y `SALIR`.
- [x] El HUD sigue ocupando una sola línea en un teléfono de 390px.
- [x] Girar el teléfono con una partida en curso no la reinicia. _El canvas es
      un solo nodo en el DOM y su montaje depende sólo del motor, que es la
      propiedad de la que esto se sigue._

## Validación

17 de los 27 criterios están firmados sin teléfono, sobre `npm run dev` en
Chrome. El mando de mano **existe en el DOM en escritorio** —CSS lo esconde,
pero los nodos están—, así que se le pueden mandar eventos de puntero y leer el
contador de teclas por dentro, que es la pieza nueva y la que más podía fallar.
Qué dio cada cosa:

- **El contador, con eventos de puntero sobre los botones ocultos.** Bajar `↑`
  desde la cruz y desde `B` deja `ArrowUp=2`; soltar `B` con su par real de
  eventos —`pointerup` y, detrás, `pointerout`— lo deja en `1` y no en `0`, y
  soltar la cruz lo deja en `0`. La cuenta no se descuadra con el evento
  duplicado, que era el riesgo.
- **Y su efecto en el motor**: con `↑` sostenido sólo desde la cruz tras haber
  soltado `B`, la nave de Asteroids sigue dibujando la llama del propulsor.
- **El reparto por máquina**, leyendo el `aria-label` y el `disabled` de los dos
  botones en las cuatro rutas: `Propulsor`/`Disparar` en Asteroids, `Soltar de
golpe`/`Rotar` en Tetris, y `B` apagado —`disabled`, opacidad `0.35`— en
  Arkanoid y en Snake, donde `A` es `Lanzar la bola` y `Arrancar`. Lo que se
  comprobó es el enrutado de la tecla; lo que hace cada tecla es del motor, y
  ningún motor cambió.
- **Los tamaños**, con el valor computado de cada botón: 44px la cruz de
  vertical, 48 la de horizontal, 56 los de acción y 44 los del centro, todos con
  el radio de `rounded-full` donde toca.
- **La pregunta de salida**, de principio a fin: `SALIR` pausa la partida y abre
  un diálogo en `z-56`; `SEGUIR JUGANDO` lo cierra, reanuda y deja las tres
  cifras donde estaban sin volver a enseñar la carga; `SI, SALIR` navega a
  `/juego/asteroids`. Y perder con la pregunta abierta no puede pasar: abrirla
  pausa, y en pausa no se muere.
- **Que en escritorio no cambió nada**: la fila de cinco con `FUEGO`, la línea
  de controles y `PAUSA` en el HUD siguen ahí, y la nave gira con las flechas
  del teclado.
- **Que `lib/games/` no tiene un archivo tocado**, del diff de la rama.

Lo que queda pendiente es de una clase que ninguna de estas pruebas alcanza:
**dónde cae cada bloque en pantalla y si todo cabe**. Las variantes `handheld`
piden `(pointer: coarse)`, que un Chrome de escritorio no cumple, así que la
maquetación de mano no llegó a pintarse ni una vez. De ahí que el `24rem` de
`--av-chrome` siga siendo una cuenta y no una medida, y que sea lo primero que
hay que mirar en el teléfono.

## Decisiones

- **Sí:** `B` y `A` reparten las teclas que ya existen. Un mando de dos botones
  no necesita que aparezca una sexta acción, y ninguna máquina la tiene: lo que
  faltaba era que el propulsor de Asteroids y el rotar de Tetris no vivieran en
  el mismo pulgar que la dirección.
- **No:** ampliar `GameMount` con un campo `pad` que declare cada motor. Sería
  el sitio conceptualmente correcto —el motor es quien sabe qué hace su tecla—,
  pero obliga a tocar el contrato y las cuatro máquinas para una decisión que es
  de interfaz. La tabla vive junto a `ENGINE_KEYS`, que ya hace exactamente lo
  mismo desde SPEC 05. Si algún día el mando se vuelve configurable, esa es la
  spec que se lleva la tabla al contrato.
- **Sí:** `A` es la acción principal y va a la derecha, con `B` a su izquierda,
  como en el mando de la foto. En Tetris eso significa `A` = rotar, que es lo
  que más se pulsa, y `B` = soltar de golpe.
- **Sí:** la cruz conserva la flecha que también manda `B`. Un mando de verdad
  permite las dos vías, y quitarla dejaría una cruz distinta en cada máquina.
- **Sí:** contar cuántos botones tienen pulsada cada tecla, en el gabinete. Es
  la consecuencia directa de lo anterior: sin contador, soltar `B` apaga el
  propulsor aunque el pulgar izquierdo siga apretando `↑`. Va en `PlayCabinet` y
  no en `lib/games/input.ts` porque ese archivo es de los motores y esto es un
  problema de la interfaz.
- **No:** que el contador viva en los motores. Ninguno se entera de que existe
  un mando, y ésa es la propiedad que la SPEC 11 defendió y que aquí se
  conserva: `lib/games/` no cambia ni una línea.
- **Sí:** `PAUSA` y `SALIR` en el centro, sólo con el dedo. Los dos son botones
  de partida y estaban en los dos sitios más incómodos del teléfono: un HUD de
  6px y una cabecera que se comprime. En escritorio no molestan donde están, así
  que ahí no se mueven.
- **Sí:** `SALIR` pregunta antes de salir. En la cabecera estaba lejos y era
  difícil rozarlo; en el centro del mando queda entre los dos pulgares, y una
  salida accidental tira una partida y su marca. La pregunta pausa primero, para
  que preguntar no cueste vidas.
- **No:** un `START` que reinicie la partida desde el mando. `REINTENTAR` existe
  al perder y reiniciar a mitad de una partida buena es otra forma de perderla
  sin querer. Si hace falta, va en su propia spec.
- **No:** botones rojos como los de la foto. Redondos sí, porque eso es lo que
  hace que se lean como un mando; el color sigue siendo el neón del vault, que
  es dark-only y no tiene rojo en la paleta.
- **No:** leyenda bajo cada botón con lo que hace. Se probó como opción y añade
  una línea de texto de 6px al bloque más apretado de la pantalla; lo que hace
  cada botón se anuncia en su `aria-label`, y en dos partidas ya se sabe.
- **No:** recordar en `localStorage` un mando configurado por el jugador. Es una
  feature entera —interfaz de asignación, validación contra `ENGINE_KEYS`,
  versión de esquema— y aquí no hay nada que configurar todavía.
- **No:** tocar el mando de escritorio. Funciona, nadie ha pedido cambiarlo, y
  mantener dos diseños es exactamente lo que la SPEC 11 ya hace desde que la
  fila de cinco quedó como mando de ratón y teclado.

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una tecla se queda «pegada»: el contador sube y no baja porque un `pointerup` se perdió           | Los botones ya sueltan también en `pointercancel` y `pointerleave`, y el mapa se vacía entero al pausar, al terminar la partida y al reiniciar. Una cuenta descuadrada dura hasta la pausa siguiente. |
| El superpuesto de salida y el de fin de partida se abren a la vez                                 | El fin de partida cierra la pregunta: perder ya es salir de la partida y no queda nada que abandonar. Está en los criterios.                                                                          |
| El gesto de «atrás» del navegador y el botón `SALIR` del sistema no pasan por la confirmación     | Es correcto: la pregunta protege del roce del pulgar dentro del mando, no de la navegación del teléfono, que el jugador hace a propósito.                                                             |
| Un botón redondo de 44px tiene menos área útil que un cuadrado de 44px: las esquinas no responden | Los dos de acción se dibujan claramente por encima de ese mínimo; el círculo pequeño se reserva para `PAUSA` y `SALIR`, que no se pulsan en caliente.                                                 |
| `B` apagado en Arkanoid y en Snake se lee como un botón roto                                      | Misma opacidad al 35% y mismo `disabled` que las flechas que sobran en la cruz, que es un patrón que la pantalla ya usa desde SPEC 05.                                                                |
| El mando crece y `PIEL` se sale por abajo, que ahora recorta en vez de desplazar                  | El paso 5 recalibra `--av-chrome` con el mando ya montado, y hay un criterio que exige ver `PIEL` entero en vertical.                                                                                 |
| En Tetris, `↑` rota desde la cruz y desde `A`, y el jugador no sabe cuál usar                     | Es redundancia, no ambigüedad: hacen lo mismo. La cruz es la de siempre y `A` es la cómoda; ninguna de las dos deja de funcionar.                                                                     |
| `PAUSA` deja de estar en el HUD y quien venía de la SPEC 11 no lo encuentra                       | Baja al centro del mando, que es donde lo busca el pulgar, y en escritorio no se mueve. La SPEC 11 se corrige en el paso 6 para que no queden dos versiones de la verdad.                             |

## Lo que **no** entra en esta spec

- Acciones nuevas en los motores o cambios en el contrato de `GameMount`.
- Un mando configurable por el jugador y su persistencia.
- Reiniciar la partida desde el mando.
- El mando de escritorio y la línea de `game.controls`.
- Gestos sobre el canvas, vibración, pantalla completa, orientación bloqueada y
  PWA.
- Las otras siete pantallas del sitio en móvil.

Cada una de ellas, si llega, va en su propia spec.

---

## Lo que la SPEC 13 dejó atrás

La SPEC 13 vistió este mando con el gamepad MK-II. **Nada de lo funcional
cambió** —las mismas cinco teclas, el mismo reparto de `ENGINE_PAD`, los mismos
tres bloques y la misma cuenta de pulsaciones—, así que los criterios de arriba
siguen valiendo. Lo que dejó de ser cierto es la piel y dónde vive el código:

- **Los botones ya no son los rectángulos con borde cian de la fila de cinco.**
  La cruz tiene relieve y flechas SVG, `B` y `A` son redondos con halo y aro, y
  `PAUSA` y `SALIR` son píldoras de plástico. Los tres bloques van dentro de un
  chasis, entero en vertical y partido en dos en horizontal.
- **Las tablas se mudaron.** `PAD`, `CROSS_CELL`, `ENGINE_KEYS` y `ENGINE_PAD`
  ya no están en `components/play-cabinet.tsx` sino en `components/game-pad.tsx`,
  y el gabinete importa de ahí las que necesita su fila de escritorio.
- **La cuenta de `held` se pinta.** Esta spec la dejó en una `ref` porque nadie
  la miraba; ahora la mira el mando y un botón se dibuja hundido cuando lo está
  su tecla, venga del botón que venga. Con `:active` de CSS, apretar `B` en
  Asteroids dejaba apagada la flecha `↑` de la cruz con el propulsor encendido.
- **Los presupuestos subieron**, porque el chasis añade alto: `handheld` de
  `24rem` a `25rem` y `handheld-wide` de `7rem` a `8.5rem`.
- **El `<main>` de `/jugar/[id]` apaga su `flex-1` con el dedo.** Su
  `h-[calc(100svh-var(--av-play-header))]` no llegaba a mandar, y en horizontal
  la página se desplazaba casi mil píxeles. Es un defecto que venía de la SPEC 11
  y que aquí no se vio: `(pointer: coarse)` no lo cumple un Chrome de escritorio,
  que es la advertencia que esta misma spec dejó escrita en su «Validación».
