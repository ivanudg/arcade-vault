"use client";

/**
 * Gabinete y superpuestos de la pantalla de juego. Puerto de
 * references/templates/jugar.dc.html.
 *
 * El canvas es el juego: se monta el motor de `ENGINES`, el HUD lee la partida
 * por `onState` y el fin de partida lo dispara el motor. Hasta SPEC 07 esto era
 * una de dos ramas, y la otra enseñaba la escena congelada de `drawPreview()`
 * con un HUD de cifras fijas y un botón que simulaba morir. Ese camino no
 * vuelve: toda máquina que entre al catálogo entra con motor.
 *
 * PAUSA, el superpuesto de carga y el de fin de partida son interfaz de verdad,
 * y GUARDAR PUNTUACION manda la marca al marcador compartido por la Server
 * Action de `app/jugar/[id]/actions.ts`.
 */

import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { saveScore } from "@/app/jugar/[id]/actions";
import { GameCanvas } from "@/components/game-canvas";
import type { GameHandle, GameState } from "@/lib/games/engine";
import { ENGINES } from "@/lib/games/engines";
import { DEFAULT_SKIN, SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/games/skins";
import type { Game, GameId } from "@/lib/games";
import { formatScore } from "@/lib/scores";
import { useSession } from "@/lib/session";
import { deviceId, persist, read } from "@/lib/storage";

/** Las cinco teclas del mando, en el orden del prototipo. */
const PAD = [
  { label: "←", code: "ArrowLeft", aria: "Mover ←" },
  { label: "↑", code: "ArrowUp", aria: "Mover ↑" },
  { label: "↓", code: "ArrowDown", aria: "Mover ↓" },
  { label: "→", code: "ArrowRight", aria: "Mover →" },
  { label: "FUEGO", code: "Space", aria: "Fuego" },
] as const;

/**
 * Qué botones del mando sirven en cada máquina con motor. Los que no están se
 * pintan deshabilitados: Asteroids no usa `↓`, y esconderlo descuadraría la
 * rejilla de cinco botones del gabinete.
 */
const ENGINE_KEYS: Partial<Record<GameId, readonly string[]>> = {
  asteroids: ["ArrowLeft", "ArrowUp", "ArrowRight", "Space"],
  tetris: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"],
  arkanoid: ["ArrowLeft", "ArrowRight", "Space"],
  // La primera del vault que usa el mando entero: las cuatro flechas giran y
  // `ESPACIO` arranca la serpiente.
  snake: ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Space"],
};

const SAVED_MESSAGE = "PUNTUACION GUARDADA";
/** Lo que enseña el HUD antes del primer `onState`. */
const FRESH_RUN: GameState = { score: 0, lives: 3, level: 1 };
const LOAD_MS = 750;

export function PlayCabinet({ game }: { game: Game }) {
  const { user, ready } = useSession();
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedText, setSavedText] = useState("");
  /** La marca está en vuelo: el botón se apaga para que no salgan dos filas. */
  const [saving, setSaving] = useState(false);
  /** Lo que devolvió la acción cuando no pudo guardar. */
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Las tres cifras de la partida real. `null` hasta el primer `onState`. */
  const [live, setLive] = useState<GameState | null>(null);
  /** Piel activa de esta máquina. Arranca en la de siempre y no en la guardada:
      `localStorage` no existe en el servidor y leerlo aquí desajustaría la
      hidratación. La guardada se aplica al recibir el handle. */
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);

  const engine = ENGINES[game.id];
  const loadTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typer = useRef<ReturnType<typeof setInterval>>(undefined);
  const handle = useRef<GameHandle | null>(null);

  useEffect(() => {
    // `loading` ya arranca en `true`, así que aquí sólo se programa su final.
    loadTimer.current = setTimeout(() => setLoading(false), LOAD_MS);
    return () => {
      clearTimeout(loadTimer.current);
      clearInterval(typer.current);
    };
  }, []);

  // La partida arranca cuando el cartucho termina de cargar, no al montar: el
  // superpuesto tapa la pantalla y el juego correría a ciegas debajo.
  useEffect(() => {
    if (loading) return;
    handle.current?.start();
  }, [loading]);

  // PAUSA / SEGUIR y las dos pausas automáticas acaban todas aquí: el botón
  // sólo mueve `paused` y este efecto se encarga del motor.
  useEffect(() => {
    if (loading) return;
    const h = handle.current;
    if (!h) return;
    if (paused) h.pause();
    // Terminada la partida el bucle está parado a propósito: reanudarlo aquí
    // resucitaría una nave muerta detrás del superpuesto.
    else if (!over) h.resume();
  }, [loading, paused, over]);

  // Volver a la pestaña con quince segundos de asteroides encima no es jugar.
  useEffect(() => {
    const pause = () => setPaused(true);
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
    };
  }, []);

  /** Las tres cifras del HUD, de la partida en curso. */
  const run = live ?? FRESH_RUN;
  const playerName = ready && user ? user.name : "INVITADO";
  /** Teclas vivas del mando: las que no están se pintan deshabilitadas. */
  const padKeys = ENGINE_KEYS[game.id];

  async function save() {
    setSaving(true);
    setSaveError(null);

    // El `deviceId` viaja con la marca para poder resaltarla luego. Puede no
    // haberlo —`crypto.randomUUID()` sólo existe en contexto seguro— y entonces
    // la marca se guarda igual, sin dueño.
    const result = await saveScore(game.id, playerName, run.score, deviceId());

    setSaving(false);
    if (!result.ok) {
      // Una marca que se traga la red es peor que una que avisa.
      setSaveError(result.error);
      return;
    }

    setSaved(true);
    setSavedText("");
    // El mensaje se teclea carácter a carácter, como en el prototipo.
    let i = 0;
    clearInterval(typer.current);
    typer.current = setInterval(() => {
      i++;
      setSavedText(SAVED_MESSAGE.slice(0, i));
      if (i >= SAVED_MESSAGE.length) clearInterval(typer.current);
    }, 55);
  }

  /**
   * Cambia la piel en caliente. No toca la partida: `setSkin()` sólo cambia el
   * color con el que se pinta el frame siguiente, y por eso esto no pasa por
   * `GameCanvas` —su efecto de montaje depende sólo del motor, y meter la piel
   * ahí remontaría el juego y reiniciaría la partida en curso—.
   */
  function chooseSkin(id: SkinId) {
    handle.current?.setSkin?.(id);
    setSkin(id);
    persist({ skins: { ...read().skins, [game.id]: id } });
  }

  function replay() {
    clearInterval(typer.current);
    setOver(false);
    setSaved(false);
    setSavedText("");
    setSaveError(null);
    setPaused(false);
    // La partida empieza de cero aquí mismo, sin recargar nada: CARGANDO
    // CARTUCHO sólo tenía sentido cuando no había nada que reiniciar de verdad.
    handle.current?.restart();
  }

  // Sin motor no hay pantalla que enseñar. Desde SPEC 07 toda máquina del
  // catálogo tiene el suyo, así que esto es una guarda de tipos —`ENGINES` es
  // parcial— y no la vieja bifurcación.
  if (!engine) return null;

  /** Proporción del mundo del motor: 1,33 en Asteroids y 0,70 en Tetris. */
  const aspectRatio = engine.world.width / engine.world.height;

  return (
    <>
      {/* La sección envuelve sólo el gabinete, y los superpuestos quedan fuera,
          igual que en la plantilla. `animate-av-fade` deja un `transform` en su
          elemento, y un ancestro con transform se convierte en bloque
          contenedor de los hijos `fixed`: dentro, un `inset-0` cubriría la
          sección en vez de la ventana. */}
      <section className="mx-auto w-full max-w-195 animate-av-fade">
        {/* Con el dedo el HUD va en una sola línea: envolver en tres empuja el
            tablero fuera de la ventana. Press Start 2P es monoespaciada y
            avanza 1em por carácter, así que lo que se recorta es lo que se
            paga por carácter —el cuerpo, el tracking de 1px y los huecos—, no
            ninguna de las cuatro celdas: las tres cifras y el jugador se
            quedan, y PAUSA con ellas en la misma fila. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border border-av-cyan/30 bg-[rgba(13,15,22,0.9)] px-4 py-3.5 handheld:flex-nowrap handheld:gap-1.5 handheld:px-1.5 handheld:py-1.5">
          <div className="flex flex-wrap gap-5.5 font-display text-[9px] tracking-av handheld:min-w-0 handheld:flex-nowrap handheld:gap-1.5 handheld:text-[6px] handheld:tracking-normal">
            {/* Los rótulos los pone el motor: las tres cifras son siempre las
                mismas, pero la del medio son vidas en Asteroids y líneas en
                Tetris. */}
            <span className="whitespace-nowrap text-av-text-dim">
              {engine.hud[0]}{" "}
              <span className="text-av-cyan [text-shadow:0_0_10px_rgba(0,245,255,0.6)]">
                {formatScore(run.score)}
              </span>
            </span>
            <span className="whitespace-nowrap text-av-text-dim">
              {engine.hud[1]}{" "}
              <span className="text-av-magenta [text-shadow:0_0_10px_rgba(255,0,110,0.6)]">
                {run.lives}
              </span>
            </span>
            <span className="whitespace-nowrap text-av-text-dim">
              {engine.hud[2]}{" "}
              <span className="text-av-yellow [text-shadow:0_0_10px_rgba(245,255,0,0.6)]">
                {run.level}
              </span>
            </span>
            {/* La única celda que puede crecer sin techo es ésta: la puntuación
                sube de dígito en dígito y el nombre admite doce caracteres. Es
                la que cede si la línea no da, cortando el nombre por el final
                en vez de empujar el resto del HUD a una segunda fila. */}
            <span className="min-w-0 truncate whitespace-nowrap text-av-text-dim">
              JUGADOR{" "}
              {/* Hasta leer `localStorage` se muestra INVITADO, que es también el
                  valor definitivo de quien no tiene sesión. */}
              <span className="text-av-text-bright">{playerName}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            // Encoge con el HUD, pero nunca cede su sitio: `shrink-0` lo deja
            // entero a la derecha de la fila aunque las cifras crezcan.
            className="cursor-pointer border border-av-yellow/45 bg-transparent px-3.5 py-2.75 font-display text-[9px] text-av-yellow active:scale-94 hover:bg-av-yellow/16 hover:text-white handheld:shrink-0 handheld:px-2 handheld:py-2 handheld:text-[7px]"
          >
            {paused ? "SEGUIR" : "PAUSA"}
          </button>
        </div>

        <div className="mx-auto mt-6.5 rounded-[34px] border border-av-cyan/22 bg-[linear-gradient(#15171f,#0b0c12)] p-5.5 shadow-[0_0_46px_rgba(0,245,255,0.12),inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          {/* La pantalla llena el ancho del gabinete, salvo que su alto no
              quepa: entonces manda la altura y el ancho la sigue, para que el
              mundo del motor nunca se deforme. Sin esto, un mundo apaisado como
              el de Asteroids cabe, y uno vertical como el de Tetris se estira
              hasta obligar a hacer scroll para ver los dos extremos del
              tablero.

              El reparto es a medias: el ratio lo sabe JavaScript, porque sale
              del `world` del motor, y el presupuesto lo sabe CSS, porque
              cambia con la maquetación y un `style` en línea no entiende de
              `@media`. `--av-chrome` es lo que ocupa todo lo demás de la
              pantalla de juego, y cada maquetación reserva lo suyo: en
              escritorio, cabecera, HUD, marco, mando, controles y PIEL; en
              vertical de mano, lo mismo sin la línea de controles; en
              horizontal, sólo cabecera y HUD, porque el mando se va a los
              lados. El de escritorio está calibrado por lo bajo a propósito:
              con más presupuesto cabría también el mando, pero un mundo
              apaisado como el de Asteroids empezaría a encogerse en pantallas
              normales. Lo que no puede quedar fuera de la ventana es el
              tablero. */}
          <div
            style={{ "--av-ratio": aspectRatio } as CSSProperties}
            className="relative mx-auto overflow-hidden rounded-[22px] bg-av-void shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_12px_rgba(0,245,255,0.16)] [--av-chrome:16rem] max-w-[calc((100svh-var(--av-chrome))*var(--av-ratio))] handheld:[--av-chrome:13rem] handheld-wide:[--av-chrome:7rem]"
          >
            <GameCanvas
              game={engine}
              label={`Partida de ${game.title}`}
              onState={setLive}
              // El motor avisa con la puntuación final; el HUD ya viene
              // cuadrado del `onState` de ese mismo frame.
              onGameOver={() => setOver(true)}
              onReady={(h) => {
                handle.current = h;
                // Al desmontar llega `null`, y entonces no hay nada que vestir.
                if (!h) return;
                // La piel guardada de esta máquina se aplica aquí, con el motor
                // ya montado y antes de que `start()` pinte el primer frame: no
                // hay ni un fotograma con el color equivocado.
                const saved = read().skins?.[game.id];
                if (saved && engine.skins?.includes(saved)) {
                  h.setSkin?.(saved);
                  setSkin(saved);
                }
              }}
              // El dedo sobre el tablero es juego, no desplazamiento: sin
              // esto, arrastrar para girar la nave arrastra la página.
              className="block h-auto w-full touch-none"
            />

            {/* Viñeta del tubo y barrido de brillo que recorre la pantalla. */}
            <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(115%_115%_at_50%_50%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.72)_100%)]" />
            <div className="pointer-events-none absolute inset-0 h-[34%] bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,0.045)_55%,rgba(255,255,255,0)_100%)] animate-av-sweep" />

            {paused && (
              <div className="absolute inset-0 grid place-items-center bg-[rgba(5,6,10,0.78)]">
                <span className="font-display text-[clamp(14px,3vw,22px)] tracking-av-wider text-av-yellow [text-shadow:0_0_18px_rgba(245,255,0,0.6)]">
                  EN PAUSA
                </span>
              </div>
            )}
          </div>

          <div className="mt-4.5 grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-2.5">
            {PAD.map(({ label, code, aria }) => {
              const usable = padKeys ? padKeys.includes(code) : true;
              const inert = !!padKeys && !usable;
              // `pointerup` fuera del botón nunca llega, así que soltar también
              // al salir el puntero o al cancelarse el gesto: si no, la nave se
              // queda girando sola.
              const release = () => handle.current?.release(code);
              return (
                <button
                  key={label}
                  type="button"
                  aria-label={aria}
                  disabled={inert}
                  onPointerDown={
                    padKeys && usable
                      ? (e) => {
                          // Sin foco en el botón, `ESPACIO` no lo re-dispara.
                          e.preventDefault();
                          handle.current?.press(code);
                        }
                      : undefined
                  }
                  onPointerUp={padKeys && usable ? release : undefined}
                  onPointerCancel={padKeys && usable ? release : undefined}
                  onPointerLeave={padKeys && usable ? release : undefined}
                  className={`touch-none border border-av-cyan/30 bg-av-panel px-1.5 py-3.75 font-display text-[10px] text-av-cyan ${
                    inert
                      ? "cursor-not-allowed opacity-35"
                      : "cursor-pointer active:bg-av-cyan active:text-av-bg"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Los controles que describe esta línea son los del teclado, y con
              el dedo no hay teclado: en un puntero grueso sobra. */}
          <p className="mt-3.5 text-center text-[12px] tracking-av text-av-text-faint pointer-coarse:hidden">
            {game.controls}
          </p>

          {/* Selector de piel. Va aquí y no dentro del marco de la pantalla:
              el ancho de ese marco está calculado con el ratio del mundo del
              motor y cualquier cosa dentro lo descuadra. Los tres botones se
              pintan deshabilitados si la máquina aún no está vestida, igual que
              hace el mando con las teclas que no usa. */}
          <div className="mt-4.5 flex flex-wrap items-center justify-center gap-2.5 border-t border-av-cyan/15 pt-4">
            <span className="font-display text-[9px] tracking-av text-av-text-faint">PIEL</span>
            {SKIN_IDS.map((id) => {
              const dressed = !!engine.skins?.includes(id);
              const active = dressed && skin === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  disabled={!dressed}
                  onClick={dressed ? () => chooseSkin(id) : undefined}
                  className={`border px-3 py-2.25 font-display text-[9px] tracking-av ${
                    !dressed
                      ? "cursor-not-allowed border-av-line/40 text-av-text-faint opacity-35"
                      : active
                        ? "cursor-pointer border-av-yellow bg-av-yellow/16 text-av-yellow"
                        : "cursor-pointer border-av-cyan/30 text-av-cyan hover:bg-av-cyan/14 hover:text-white"
                  }`}
                >
                  {SKIN_LABELS[id]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {loading && <LoadingOverlay />}

      {over && (
        <GameOverOverlay
          score={run.score}
          note={
            user
              ? `Sesión de ${user.name}: tu marca entra en el salón.`
              : "Modo invitado: la marca entra en el salón firmada como INVITADO."
          }
          canSave={!saved}
          saved={saved}
          savedText={savedText}
          saving={saving}
          error={saveError}
          onSave={save}
          onReplay={replay}
        />
      )}
    </>
  );
}

/** CARGANDO CARTUCHO: cuatro cuadrados de neón girando a saltos. */
function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-60 grid place-items-center bg-[rgba(5,6,10,0.94)]">
      <div className="grid justify-items-center gap-4.5">
        <div aria-hidden className="grid size-13.5 grid-cols-2 gap-1.5 animate-av-spin">
          <span className="bg-av-cyan shadow-[0_0_12px_#00f5ff]" />
          <span className="bg-av-magenta shadow-[0_0_12px_#ff006e]" />
          <span className="bg-av-yellow shadow-[0_0_12px_#f5ff00]" />
          <span className="bg-av-cyan shadow-[0_0_12px_#00f5ff]" />
        </div>
        <span role="status" className="font-display text-[10px] tracking-av-wider text-av-cyan">
          CARGANDO CARTUCHO...
        </span>
      </div>
    </div>
  );
}

const OVER_BUTTON = "p-3.75 font-display text-[10px] tracking-av";

function GameOverOverlay({
  score,
  note,
  canSave,
  saved,
  savedText,
  saving,
  error,
  onSave,
  onReplay,
}: {
  score: number;
  note: string;
  canSave: boolean;
  saved: boolean;
  savedText: string;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onReplay: () => void;
}) {
  return (
    <div className="fixed inset-0 z-55 grid place-items-center bg-[rgba(5,6,10,0.9)] p-5">
      <div className="w-[min(100%,460px)] border border-av-magenta/45 bg-[#0d0f16] p-[clamp(22px,4vw,34px)] text-center shadow-[0_0_48px_rgba(255,0,110,0.22)] animate-av-fade">
        <h3 className="font-display text-av-subtitle tracking-av-wider text-av-magenta [text-shadow:0_0_16px_rgba(255,0,110,0.7)]">
          FIN DEL JUEGO
        </h3>
        <p className="mt-5 mb-1.5 text-[12px] tracking-av-wider text-av-text-dim">
          PUNTUACIÓN FINAL
        </p>
        <p className="font-display text-av-title text-av-yellow [text-shadow:0_0_18px_rgba(245,255,0,0.6)]">
          {formatScore(score)}
        </p>
        <p className="mt-3.5 mb-5.5 text-[13px] tracking-av text-av-text-muted">{note}</p>

        <div className="flex flex-col gap-3">
          {canSave && (
            <button
              type="button"
              onClick={onSave}
              // Sin esto, dos pulsaciones nerviosas son dos filas idénticas en
              // un marcador compartido.
              disabled={saving}
              className={`${OVER_BUTTON} border-none bg-av-yellow text-av-bg shadow-[0_0_22px_rgba(245,255,0,0.45)] ${
                saving
                  ? "cursor-wait opacity-60"
                  : "cursor-pointer active:scale-96 hover:bg-av-cyan"
              }`}
            >
              {saving ? "GUARDANDO..." : "GUARDAR PUNTUACION"}
            </button>
          )}

          {error && (
            <p
              role="alert"
              className="font-display text-[9px] leading-[1.7] tracking-av text-av-magenta av-glow-magenta"
            >
              {error}
            </p>
          )}

          {saved && (
            <p
              role="status"
              className="font-display text-[10px] tracking-av text-av-cyan [text-shadow:0_0_12px_rgba(0,245,255,0.6)]"
            >
              {savedText}
              <span className="animate-[av-caret_0.9s_steps(1)_infinite]">_</span>
            </p>
          )}

          <button
            type="button"
            onClick={onReplay}
            className={`${OVER_BUTTON} cursor-pointer border border-av-magenta bg-transparent text-av-magenta active:scale-96 hover:bg-av-magenta/18 hover:text-white`}
          >
            JUGAR DE NUEVO
          </button>
          <Link
            href="/"
            className={`${OVER_BUTTON} border border-av-cyan/50 text-av-cyan hover:bg-av-cyan/14 hover:text-white`}
          >
            VOLVER AL VAULT
          </Link>
        </div>
      </div>
    </div>
  );
}
