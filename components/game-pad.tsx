"use client";

/**
 * El mando de dedo de la pantalla de juego, y la única casa de las cuatro
 * tablas que dicen qué botón manda qué tecla.
 *
 * Sale de `components/play-cabinet.tsx`, que orquesta la partida y no tiene por
 * qué saber además cómo se dibuja un mando. Lo que se queda allí es la fila de
 * cinco botones de ratón y teclado, que importa de aquí `PAD`, `ENGINE_KEYS` y
 * el botón base: una sola fuente para las dos pieles, que si no un día dicen
 * cosas distintas.
 *
 * Ningún motor se entera de que esto existe. Aquí no hay teclas nuevas: son las
 * cinco de siempre, repartidas entre la cruz y los dos botones de acción.
 */

import type { PointerEvent as ReactPointerEvent } from "react";
import type { GameId } from "@/lib/games";

/**
 * Las cinco teclas del mando de ratón y teclado, en el orden del prototipo, y
 * la fuente de las cuatro flechas de la cruz: `side` marca cuáles van a ella.
 * Su `FUEGO` sólo se pinta en la fila de cinco, la de escritorio; con el dedo
 * quien manda `ESPACIO` es el botón de acción que diga `ENGINE_PAD`, que no
 * tiene por qué ser el mismo en cada máquina.
 */
export const PAD = [
  { label: "←", code: "ArrowLeft", aria: "Mover ←", side: "dpad" },
  { label: "↑", code: "ArrowUp", aria: "Mover ↑", side: "dpad" },
  { label: "↓", code: "ArrowDown", aria: "Mover ↓", side: "dpad" },
  { label: "→", code: "ArrowRight", aria: "Mover →", side: "dpad" },
  { label: "FUEGO", code: "Space", aria: "Fuego", side: "fire" },
] as const;

/**
 * Dónde cae cada flecha en la cruz: `↑` arriba en el centro, `←` y `→` a los
 * lados y `↓` abajo. En cruz y no en columna de cuatro porque en columna `←` y
 * `→` quedan uno encima del otro y el pulgar tiene que buscar; ocupa lo mismo.
 */
const CROSS_CELL: Record<string, string> = {
  ArrowUp: "col-start-2 row-start-1",
  ArrowLeft: "col-start-1 row-start-2",
  ArrowRight: "col-start-3 row-start-2",
  ArrowDown: "col-start-2 row-start-3",
};

/**
 * Qué botones del mando sirven en cada máquina con motor. Los que no están se
 * pintan deshabilitados: Asteroids no usa `↓`, y esconderlo descuadraría la
 * rejilla de cinco botones del gabinete.
 */
export const ENGINE_KEYS: Partial<Record<GameId, readonly string[]>> = {
  asteroids: ["ArrowLeft", "ArrowUp", "ArrowRight", "Space"],
  tetris: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"],
  arkanoid: ["ArrowLeft", "ArrowRight", "Space"],
  // La primera del vault que usa el mando entero: las cuatro flechas giran y
  // `ESPACIO` arranca la serpiente.
  snake: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"],
};

/** Un botón de acción: la tecla que inyecta y cómo se anuncia. */
type PadAction = { code: string; aria: string };

/**
 * Qué manda cada botón de acción en cada máquina, con el dedo. `A` es la acción
 * principal —la que más se pulsa— y cae a la derecha, bajo el pulgar; `B` es la
 * secundaria, y `null` cuando la máquina no tiene ninguna: entonces se pinta
 * apagado, como ya hace la cruz con las flechas que sobran.
 *
 * Las teclas son las mismas cinco de siempre: aquí sólo se reparten, y por eso
 * la tabla vive junto a `ENGINE_KEYS` y no en `GameMount`. Ningún motor la
 * conoce ni se entera de que existe un mando; lo que hace cada tecla sale de
 * leer su código: en Asteroids `ESPACIO` dispara y `↑` empuja, en Tetris `↑`
 * rota y `ESPACIO` es el `hardDrop`, en Arkanoid `ESPACIO` lanza la bola desde
 * la paleta y en Snake arranca la partida.
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

/**
 * Los botones del centro del mando, los de partida. Redondos y del mínimo que
 * un pulgar acierta, 44px, porque son los tres bloques del mando los que se
 * reparten el ancho de un teléfono: en uno de 360px quedan 328 útiles y la
 * cuenta sale justa —144 la cruz, 44 el centro y 120 las dos acciones—. No se
 * pulsan en caliente, así que aquí el círculo pequeño no cuesta partidas.
 */
const CENTER_KEY = "size-11 touch-none rounded-full px-0 text-[6px]";

/** Las dos posturas de mano. No hay una tercera: escritorio no monta esto. */
export type PadLayout = "vertical" | "horizontal";

/** Qué medio-chasis se pinta. `full` es el de vertical, entero. */
export type PadSide = "full" | "left" | "right";

type GamePadProps = {
  gameId: GameId;
  layout: PadLayout;
  /** `left` lleva cruz y PAUSA; `right`, `B`/`A` y SALIR; `full`, los tres. */
  side?: PadSide;
  /** Teclas hundidas ahora mismo. */
  down: ReadonlySet<string>;
  /** El dedo que llega y el que se va. El gabinete sigue llevando la cuenta. */
  onPress: (pointerId: number, code: string) => void;
  onRelease: (pointerId: number, code: string) => void;
  paused: boolean;
  onPause: () => void;
  onExit: () => void;
};

type PadKeyProps = {
  label: string;
  code: string;
  aria: string;
  className?: string;
  forceInert?: boolean;
  /** Las teclas vivas de esta máquina, de `ENGINE_KEYS`. */
  keys: readonly string[] | undefined;
  /** Teclas hundidas ahora mismo. */
  down: ReadonlySet<string>;
  onPress: (pointerId: number, code: string) => void;
  onRelease: (pointerId: number, code: string) => void;
};

/**
 * Un botón del mando. Se pinta en tres sitios —la fila de cinco de siempre y
 * el mando repartido de las dos posturas de mano—, y CSS enseña uno solo: nunca
 * dos a la vez, así que no hay dos botones `FUEGO` que un lector de pantalla
 * pueda anunciar. Duplicar aquí es barato; lo que no se puede duplicar es el
 * canvas, que remontaría la partida al girar el teléfono.
 */
export function PadKey({
  label,
  code,
  aria,
  className = "",
  forceInert = false,
  keys,
  down,
  onPress,
  onRelease,
}: PadKeyProps) {
  const usable = !forceInert && (keys ? keys.includes(code) : true);
  const inert = forceInert || (!!keys && !usable);
  // Hundido cuando lo está **su tecla**, no cuando el dedo cae encima de este
  // botón concreto: en Asteroids `↑` llega desde la cruz y desde `B`, y con el
  // `:active` de CSS apretar `B` dejaba la flecha apagada con el propulsor
  // encendido. Un mando que no dice la verdad es peor que uno feo.
  const on = !inert && down.has(code);
  // `pointerup` fuera del botón nunca llega, así que soltar también al salir
  // el puntero o al cancelarse el gesto: si no, la nave se queda girando
  // sola. Los tres pasan por `onRelease`, que sólo atiende al dedo que
  // tenía esta tecla: llegan más de una vez y la cuenta baja una sola.
  const release = (e: ReactPointerEvent) => onRelease(e.pointerId, code);
  return (
    <button
      type="button"
      aria-label={aria}
      disabled={inert}
      onPointerDown={
        keys && usable
          ? (e) => {
              // Sin foco en el botón, `ESPACIO` no lo re-dispara.
              e.preventDefault();
              // El dedo que nace en un botón se queda capturado en él, y con
              // la captura puesta salirse no dispara `pointerleave`: la tecla
              // seguiría abajo hasta levantar el dedo, aunque el pulgar ya
              // esté fuera. Soltarla devuelve los eventos de frontera. Con
              // ratón no hay captura que soltar y esto no hace nada.
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
              onPress(e.pointerId, code);
            }
          : undefined
      }
      onPointerUp={keys && usable ? release : undefined}
      onPointerCancel={keys && usable ? release : undefined}
      onPointerLeave={keys && usable ? release : undefined}
      // 44px de lado corto es el mínimo que un pulgar acierta sin apuntar;
      // con el relleno de siempre se quedaban en 40.
      // El color de pulsado va en la misma rama que el de reposo y no encima:
      // dos utilidades de fondo en el mismo atributo las resuelve el orden de
      // la hoja de Tailwind, no el que se escriban aquí.
      className={`min-h-11 touch-none border border-av-cyan/30 px-1.5 py-3.75 font-display text-[10px] ${
        inert ? "cursor-not-allowed opacity-35" : "cursor-pointer"
      } ${on ? "bg-av-cyan text-av-bg" : "bg-av-panel text-av-cyan"} ${className}`}
    >
      {label}
    </button>
  );
}

/**
 * El mando de dedo. En vertical se monta una vez y lleva los tres bloques; en
 * horizontal, dos veces, una por lado del tablero, porque el tablero va en
 * medio y un mando de una pieza ahí es imposible.
 */
export function GamePad({
  gameId,
  layout,
  side = "full",
  down,
  onPress,
  onRelease,
  paused,
  onPause,
  onExit,
}: GamePadProps) {
  const keys = ENGINE_KEYS[gameId];
  // La celda de la cruz crece en horizontal, que es donde sobra ancho.
  const cell = layout === "horizontal" ? "size-12" : "size-11";

  /** Las cuatro flechas. La rejilla la trae la postura, que es quien sabe si
      este bloque compite por el ancho con otros dos o va solo a un lado. */
  function cross(wrapper: string) {
    return (
      <div className={wrapper}>
        {PAD.filter((k) => k.side === "dpad").map((entry) => (
          <PadKey
            key={entry.label}
            label={entry.label}
            code={entry.code}
            aria={entry.aria}
            className={`${cell} px-0 py-0 ${CROSS_CELL[entry.code]}`}
            keys={keys}
            down={down}
            onPress={onPress}
            onRelease={onRelease}
          />
        ))}
      </div>
    );
  }

  /**
   * Uno de los dos botones de acción, `B` o `A`, redondo porque eso es lo que
   * hace que el bloque se lea como un mando. Es el mismo botón de siempre con
   * la tecla que le toca a esta máquina; cuando no le toca ninguna se pinta
   * apagado en vez de esconderse, como ya hace la cruz con las flechas que
   * sobran, para que el mando no cambie de forma según la máquina.
   */
  function action(slot: "a" | "b") {
    const label = slot.toUpperCase();
    const entry = ENGINE_PAD[gameId]?.[slot] ?? null;
    const round = "size-14 rounded-full px-0 py-0 text-[13px]";
    return (
      <PadKey
        key={label}
        label={label}
        code={entry ? entry.code : ""}
        aria={entry ? entry.aria : `${label}, sin acción en esta máquina`}
        className={round}
        forceInert={!entry}
        keys={keys}
        down={down}
        onPress={onPress}
        onRelease={onRelease}
      />
    );
  }

  /** Las dos acciones en su orden: `A` la principal, la última bajo el pulgar. */
  function actions(wrapper: string) {
    return (
      <div className={wrapper}>
        {action("b")}
        {action("a")}
      </div>
    );
  }

  /**
   * PAUSA / SEGUIR. Con el dedo vive aquí y no en el HUD, que es donde lo busca
   * el pulgar; en escritorio no se mueve de donde estaba.
   */
  function pauseKey() {
    return (
      <button
        type="button"
        onClick={onPause}
        aria-pressed={paused}
        className={`cursor-pointer border border-av-yellow/45 bg-transparent font-display text-av-yellow active:scale-94 hover:bg-av-yellow/16 hover:text-white ${CENTER_KEY}`}
      >
        {paused ? "SEGUIR" : "PAUSA"}
      </button>
    );
  }

  /**
   * SALIR, sólo del mando de mano. Es un botón y no el enlace de la cabecera
   * porque aquí queda entre los dos pulgares: no saca de la partida de un
   * toque, pausa y pregunta. Pausar primero es lo que hace que preguntar no
   * cueste vidas.
   */
  function exitKey() {
    return (
      <button
        type="button"
        onClick={onExit}
        className={`cursor-pointer border border-av-magenta/45 bg-transparent font-display text-av-magenta active:scale-94 hover:bg-av-magenta/16 hover:text-white ${CENTER_KEY}`}
      >
        SALIR
      </button>
    );
  }

  // Las cuatro flechas, donde cae el pulgar izquierdo, con PAUSA debajo. El
  // centro del mando se reparte en horizontal: PAUSA bajo la cruz y SALIR bajo
  // las acciones, que es el hueco que deja cada bloque.
  if (side === "left") {
    return (
      <div className="hidden shrink-0 flex-col items-center gap-2 handheld-wide:flex">
        {cross("grid grid-cols-3 grid-rows-3 gap-1.5")}
        {pauseKey()}
      </div>
    );
  }

  // Y las dos acciones, donde cae el derecho, con SALIR debajo.
  if (side === "right") {
    return (
      <div className="hidden shrink-0 flex-col items-center gap-2 handheld-wide:flex">
        {actions("flex items-center gap-2")}
        {exitKey()}
      </div>
    );
  }

  // El mando de vertical: la misma cruz, con las dos acciones enfrente y los
  // botones de partida en medio. Cae bajo el tablero y a lo ancho del gabinete,
  // así que cada pulgar tiene el suyo sin cruzar la mano. En horizontal esto se
  // apaga, porque allí los dos bloques están a los lados.
  return (
    <div className="mt-3 hidden items-center justify-between gap-2 handheld:flex handheld-wide:hidden">
      {cross("grid shrink-0 grid-cols-3 grid-rows-3 gap-1.5")}
      {/* El centro, entre los dos pulgares: los botones de partida. */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        {pauseKey()}
        {exitKey()}
      </div>
      {actions("flex shrink-0 items-center gap-2")}
    </div>
  );
}
