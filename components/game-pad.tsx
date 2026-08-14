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

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
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
 * Los dos botones de partida, los del centro del mando. Píldoras de 48 × 44:
 * 44px es el lado corto y el mínimo que un pulgar acierta sin apuntar, y el
 * ancho va **fijo** para que `PAUSA` y `SEGUIR` no cambien de tamaño al
 * alternar y muevan el bloque de sitio.
 *
 * Los 48 de ancho salen de la cuenta del teléfono estrecho, que es la que manda
 * aquí: en uno de 360px el gabinete deja 328 útiles y el mando pide 322 —144 la
 * cruz, 48 el centro, 120 las dos acciones, 8 de relleno y 2 de bordes—.
 *
 * Llevan el relieve del resto del mando en vez del aro hueco que tenían: son
 * del chasis, no de la pantalla. Y aquí `active:` sí vale, al revés que en las
 * teclas: no hay dos botones que puedan pedir lo mismo a la vez.
 */
const PILL_BASE =
  "flex h-11 w-12 shrink-0 cursor-pointer touch-none items-center justify-center rounded-full border bg-linear-to-b from-av-pad-face-top to-av-pad-face-bottom font-display text-[6px] transition duration-100";

const PILL: Record<"pause" | "exit", string> = {
  pause: `${PILL_BASE} border-av-yellow/45 text-av-yellow shadow-[0_3px_0_var(--av-pad-edge),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-av-yellow hover:text-white active:translate-y-0.5 active:shadow-[0_1px_0_var(--av-pad-edge),inset_0_0_12px_rgba(245,255,0,0.35)]`,
  exit: `${PILL_BASE} border-av-magenta/45 text-av-magenta shadow-[0_3px_0_var(--av-pad-edge),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-av-magenta hover:text-white active:translate-y-0.5 active:shadow-[0_1px_0_var(--av-pad-edge),inset_0_0_12px_rgba(255,0,110,0.35)]`,
};

/**
 * Las pieles de un botón de tecla, cada una con sus cuatro estados. `row` es la
 * fila de cinco de ratón y teclado y no cambia desde SPEC 11; `cross` es la
 * celda de la cruz del mando de dedo y `actionA` / `actionB` sus dos botones
 * redondos, los tres con la geometría del prototipo de
 * `references/gamepad-assets/`.
 *
 * Van escritas enteras y no compuestas porque Tailwind sólo ve las cadenas
 * completas: una clase interpolada no llega a la hoja. Por eso `A` y `B` son
 * dos entradas y no una con el color interpolado, que es la misma regla que ya
 * siguen los cuatro acentos del sitio.
 */
type PadSkinId = "row" | "cross" | "actionA" | "actionB";

type PadSkin = {
  /** Lo de siempre, pulsado o no. */
  base: string;
  /** Usable y en reposo. */
  rest: string;
  /** Su tecla está abajo. */
  on: string;
  /** La máquina no usa esta tecla. */
  dead: string;
};

const PAD_SKIN: Record<PadSkinId, PadSkin> = {
  row: {
    base: "min-h-11 border border-av-cyan/30 px-1.5 py-3.75 font-display text-[10px]",
    rest: "cursor-pointer bg-av-panel text-av-cyan",
    on: "cursor-pointer bg-av-cyan text-av-bg",
    dead: "cursor-not-allowed bg-av-panel text-av-cyan opacity-35",
  },
  cross: {
    // El canto duro de abajo es lo que da el relieve, y al pulsar la cara baja
    // 3px y el canto se queda en 1: el botón se hunde contra el chasis en vez
    // de limitarse a cambiar de color.
    //
    // Y lo que la máquina no usa se dibuja metido en el chasis: sin canto, con
    // el degradado del revés —la luz viene de arriba, así que un hueco tiene la
    // parte alta en sombra— y una sombra interior en lugar del relieve. El
    // `opacity-35` a secas dejaba un botón que parecía pulsable pero pálido.
    base: "flex items-center justify-center rounded-[10px] border transition duration-100",
    rest: "cursor-pointer border-white/5 bg-linear-to-b from-av-pad-face-top to-av-pad-face-bottom text-av-text-dim shadow-[0_4px_0_var(--av-pad-edge),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-2px_4px_rgba(0,0,0,0.6)] hover:border-av-cyan/35 hover:text-av-cyan",
    on: "cursor-pointer translate-y-0.75 border-av-cyan bg-linear-to-b from-[#08161e] to-[#030a0e] text-av-cyan shadow-[0_1px_0_var(--av-pad-edge),inset_0_0_16px_rgba(0,245,255,0.45),0_0_16px_rgba(0,245,255,0.5)] [&_svg]:[filter:drop-shadow(0_0_6px_var(--av-cyan))_drop-shadow(0_0_12px_var(--av-cyan))]",
    dead: "cursor-not-allowed translate-y-0.75 border-black/40 bg-linear-to-b from-av-pad-face-bottom to-av-pad-face-top text-av-text-faint opacity-35 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.04)]",
  },
  // Los dos redondos. El color del botón es el del acento —lo llevan el borde
  // de 2px y el aro punteado, los dos por `currentColor`—, y la letra va blanca
  // encima con el halo de ese mismo acento. `A` es magenta y `B` cian, como en
  // el prototipo. El relieve aquí es de 6px y no de 4: son más grandes.
  actionA: {
    base: "relative flex items-center justify-center rounded-full border-2 border-current p-0 font-display text-[13px] text-av-magenta transition duration-100",
    rest: "cursor-pointer bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.25),transparent_50%),radial-gradient(circle_at_50%_55%,rgba(255,0,110,0.7),rgba(110,0,40,0.95)_75%)] shadow-[0_6px_0_var(--av-pad-edge),0_0_22px_rgba(255,0,110,0.4),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-4px_8px_rgba(0,0,0,0.4)] hover:[&>span:first-child]:opacity-45",
    on: "cursor-pointer translate-y-1 scale-97 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.25),transparent_50%),radial-gradient(circle_at_50%_55%,rgba(255,0,110,0.7),rgba(110,0,40,0.95)_75%)] shadow-[0_1px_0_var(--av-pad-edge),0_0_36px_rgba(255,0,110,0.4),inset_0_0_18px_rgba(0,0,0,0.5)] [&>span:first-child]:scale-108 [&>span:first-child]:opacity-100",
    dead: "cursor-not-allowed translate-y-1 border-black/40 bg-linear-to-b from-av-pad-face-bottom to-av-pad-face-top text-av-text-faint opacity-35 shadow-[inset_0_3px_8px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.04)] [&>span:last-child]:text-av-text-faint [&>span:last-child]:[text-shadow:none]",
  },
  actionB: {
    base: "relative flex items-center justify-center rounded-full border-2 border-current p-0 font-display text-[13px] text-av-cyan transition duration-100",
    rest: "cursor-pointer bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.25),transparent_50%),radial-gradient(circle_at_50%_55%,rgba(0,200,230,0.7),rgba(0,50,70,0.95)_75%)] shadow-[0_6px_0_var(--av-pad-edge),0_0_22px_rgba(0,245,255,0.4),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-4px_8px_rgba(0,0,0,0.4)] hover:[&>span:first-child]:opacity-45",
    on: "cursor-pointer translate-y-1 scale-97 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.25),transparent_50%),radial-gradient(circle_at_50%_55%,rgba(0,200,230,0.7),rgba(0,50,70,0.95)_75%)] shadow-[0_1px_0_var(--av-pad-edge),0_0_36px_rgba(0,245,255,0.4),inset_0_0_18px_rgba(0,0,0,0.5)] [&>span:first-child]:scale-108 [&>span:first-child]:opacity-100",
    dead: "cursor-not-allowed translate-y-1 border-black/40 bg-linear-to-b from-av-pad-face-bottom to-av-pad-face-top text-av-text-faint opacity-35 shadow-[inset_0_3px_8px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.04)] [&>span:last-child]:text-av-text-faint [&>span:last-child]:[text-shadow:none]",
  },
};

/** El halo de la letra de `A` y `B`: blanca, con el acento alrededor. */
const ACTION_LETTER: Record<"a" | "b", string> = {
  a: "relative text-white [text-shadow:0_0_8px_var(--av-magenta),0_0_18px_var(--av-magenta),0_1px_0_rgba(0,0,0,0.6)]",
  b: "relative text-white [text-shadow:0_0_8px_var(--av-cyan),0_0_18px_var(--av-cyan),0_1px_0_rgba(0,0,0,0.6)]",
};

/**
 * Las cuatro flechas de la cruz, copiadas del prototipo: triángulos rellenos
 * con `currentColor`, para que el color y el `drop-shadow` de encender los
 * ponga la piel del botón. Los caracteres `←↑↓→` se quedan en la fila de cinco
 * de escritorio, donde no hay relieve al que acompañar.
 */
const ARROW_PATH: Record<string, string> = {
  ArrowUp: "M12 4 L20 16 L4 16 Z",
  ArrowRight: "M8 4 L20 12 L8 20 Z",
  ArrowDown: "M4 8 L20 8 L12 20 Z",
  ArrowLeft: "M16 4 L16 20 L4 12 Z",
};

/** El triángulo de una flecha. `aria-hidden`: quien lo dice es el `aria-label`. */
function Arrow({ code }: { code: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 transition duration-100">
      <path d={ARROW_PATH[code]} fill="currentColor" />
    </svg>
  );
}

/** Las dos posturas de mano. No hay una tercera: escritorio no monta esto. */
export type PadLayout = "vertical" | "horizontal";

/** Qué medio-chasis se pinta. `full` es el de vertical, entero. */
export type PadSide = "full" | "left" | "right";

/**
 * El chasis, lo que convierte tres bloques sueltos en un mando: cara en
 * degradado con los dos tokens de carcasa, borde cian, la sombra proyectada del
 * prototipo, un borde interior a 4px (`::before`) y la trama de puntos de 8px
 * (`::after`, al 60% como en el original).
 */
const PAD_SHELL_BASE =
  "relative border border-av-cyan/18 bg-linear-to-b from-av-pad-shell-top to-av-pad-shell-bottom shadow-[0_30px_80px_-30px_rgba(0,245,255,0.4),0_0_0_1px_rgba(255,255,255,0.02),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-2px_0_rgba(0,0,0,0.6)] before:pointer-events-none before:absolute before:border before:border-av-cyan/14 before:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] after:bg-[length:8px_8px] after:opacity-60 after:content-['']";

/**
 * El remate de cada postura. En vertical el chasis es uno y va entero; en
 * horizontal son dos, uno por lado del tablero, porque el tablero va en medio
 * y un panel único es imposible —y envolver la fila entera metería el marco
 * calculado del gabinete dentro de otro marco—. De ahí que cada medio se
 * redondee **hacia fuera** y deje recto el canto que mira al canvas, con el
 * borde interior abierto por ese lado: los dos se leen como un mando partido y
 * no como dos cajas sueltas.
 *
 * El relleno lateral de `full` es de 4px y no los 22 del prototipo porque el
 * ancho ahí está contado: en un teléfono de 360px el gabinete deja 328 útiles y
 * los tres bloques ya suman 312. En horizontal sobra ancho y lo que escasea es
 * el alto, así que el relleno es parejo y corto.
 */
const PAD_SHELL: Record<PadSide, string> = {
  full: `${PAD_SHELL_BASE} rounded-[22px] px-1 pt-2.5 pb-2 before:inset-1 before:rounded-[18px]`,
  left: `${PAD_SHELL_BASE} rounded-l-[22px] px-2 py-2 before:inset-y-1 before:right-0 before:left-1 before:rounded-l-[18px] before:border-r-0`,
  right: `${PAD_SHELL_BASE} rounded-r-[22px] px-2 py-2 before:inset-y-1 before:right-1 before:left-0 before:rounded-r-[18px] before:border-l-0`,
};

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
  /** Qué piel viste este botón. Por defecto la fila de cinco de escritorio. */
  skin?: PadSkinId;
  /** Lo que se pinta dentro. Sin esto, el rótulo. */
  children?: ReactNode;
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
  skin = "row",
  children,
  keys,
  down,
  onPress,
  onRelease,
}: PadKeyProps) {
  const face = PAD_SKIN[skin];
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
      // Los tres estados son ramas excluyentes de la piel y no capas que se
      // pisan: dos utilidades de fondo en el mismo atributo las resuelve el
      // orden de la hoja de Tailwind, no el que se escriban aquí.
      className={`touch-none ${face.base} ${
        inert ? face.dead : on ? face.on : face.rest
      } ${className}`}
    >
      {children ?? label}
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
            skin="cross"
            className={`${cell} ${CROSS_CELL[entry.code]}`}
            keys={keys}
            down={down}
            onPress={onPress}
            onRelease={onRelease}
          >
            <Arrow code={entry.code} />
          </PadKey>
        ))}
        {/* La celda del medio, que estaba vacía: es lo que hace que las cuatro
            flechas se lean como una cruz y no como cuatro botones sueltos. No
            es un botón —no manda ninguna tecla—, así que ni se tabula ni se
            anuncia. */}
        <div
          aria-hidden
          className={`${cell} col-start-2 row-start-2 flex items-center justify-center rounded-md border border-av-cyan/15 bg-[radial-gradient(circle_at_50%_50%,#181822_0%,#08080d_80%)] shadow-[inset_0_0_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)]`}
        >
          {/* La gema: un rombo recortado del cuadrado, latiendo como un LED. */}
          <span className="size-3 bg-av-cyan shadow-[0_0_10px_var(--av-cyan),inset_0_0_4px_rgba(0,0,0,0.5)] [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] animate-av-led" />
        </div>
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
    return (
      <PadKey
        key={label}
        label={label}
        code={entry ? entry.code : ""}
        aria={entry ? entry.aria : `${label}, sin acción en esta máquina`}
        skin={slot === "a" ? "actionA" : "actionB"}
        className="size-14"
        forceInert={!entry}
        keys={keys}
        down={down}
        onPress={onPress}
        onRelease={onRelease}
      >
        {/* El aro punteado. Va primero para que la piel lo alcance por
            `:first-child`: aparece al pulsar y se abre un poco, y es lo que
            hace que el toque se vea sin mover el botón de sitio. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-full border border-dashed border-current opacity-0 transition duration-200"
        />
        <span className={ACTION_LETTER[slot]}>{label}</span>
      </PadKey>
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
        className={PILL.pause}
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
        className={PILL.exit}
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
      <div className={`hidden shrink-0 ${PAD_SHELL.left} handheld-wide:block`}>
        <div className="relative z-1 flex flex-col items-center gap-2">
          {cross("grid grid-cols-3 grid-rows-3 gap-1.5")}
          {pauseKey()}
        </div>
      </div>
    );
  }

  // Y las dos acciones, donde cae el derecho, con SALIR debajo.
  if (side === "right") {
    return (
      <div className={`hidden shrink-0 ${PAD_SHELL.right} handheld-wide:block`}>
        <div className="relative z-1 flex flex-col items-center gap-2">
          {actions("flex items-center gap-2")}
          {exitKey()}
        </div>
      </div>
    );
  }

  // El mando de vertical: la misma cruz, con las dos acciones enfrente y los
  // botones de partida en medio, todo dentro del chasis. Cae bajo el tablero y
  // a lo ancho del gabinete, así que cada pulgar tiene el suyo sin cruzar la
  // mano. En horizontal esto se apaga, porque allí los bloques están a los
  // lados y el chasis se parte en dos.
  return (
    <div className={`mt-3 hidden ${PAD_SHELL.full} handheld:block handheld-wide:hidden`}>
      {/* Los tres bloques, por encima de la trama del chasis, como el `.gp-body`
          del prototipo. Sin hueco propio: a 360px de ancho los tres suman 312
          de los 318 que deja el chasis, y lo que sobra lo reparte
          `justify-between`. El hueco es lo que cede; 44px de botón es suelo. */}
      <div className="relative z-1 flex items-center justify-between">
        {cross("grid shrink-0 grid-cols-3 grid-rows-3 gap-1.5")}
        {/* El centro, entre los dos pulgares: los botones de partida. */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          {pauseKey()}
          {exitKey()}
        </div>
        {actions("flex shrink-0 items-center gap-2")}
      </div>
    </div>
  );
}
