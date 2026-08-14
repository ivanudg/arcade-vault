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
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { saveScore } from "@/app/jugar/[id]/actions";
import { GameCanvas } from "@/components/game-canvas";
import { ENGINE_KEYS, GamePad, PAD, PadKey } from "@/components/game-pad";
import type { GameHandle, GameState } from "@/lib/games/engine";
import { ENGINES } from "@/lib/games/engines";
import { DEFAULT_SKIN, SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/games/skins";
import type { Game } from "@/lib/games";
import { formatScore } from "@/lib/scores";
import { useSession } from "@/lib/session";
import { deviceId, persist, read } from "@/lib/storage";

const SAVED_MESSAGE = "PUNTUACION GUARDADA";
/** Lo que enseña el HUD antes del primer `onState`. */
const FRESH_RUN: GameState = { score: 0, lives: 3, level: 1 };
const LOAD_MS = 750;

export function PlayCabinet({ game }: { game: Game }) {
  const { user, ready } = useSession();
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  /** Se ha pedido salir y la pregunta está abierta, con la partida en pausa. */
  const [leaving, setLeaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedText, setSavedText] = useState("");
  /** La marca está en vuelo: el botón se apaga para que no salgan dos filas. */
  const [saving, setSaving] = useState(false);
  /** Lo que devolvió la acción cuando no pudo guardar. */
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Las tres cifras de la partida real. `null` hasta el primer `onState`. */
  const [live, setLive] = useState<GameState | null>(null);
  /** Teclas pulsadas ahora mismo, sea desde el botón que sea. Espeja `held`
      para que el mando pueda dibujarlas hundidas. */
  const [down, setDown] = useState<ReadonlySet<string>>(new Set());
  /** Piel activa de esta máquina. Arranca en la de siempre y no en la guardada:
      `localStorage` no existe en el servidor y leerlo aquí desajustaría la
      hidratación. La guardada se aplica al recibir el handle. */
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);

  const engine = ENGINES[game.id];
  const loadTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typer = useRef<ReturnType<typeof setInterval>>(undefined);
  const handle = useRef<GameHandle | null>(null);
  /**
   * Cuántos botones tienen pulsada cada tecla ahora mismo. Una tecla puede
   * llegar desde dos botones a la vez —`↑` empuja en Asteroids desde la cruz y
   * desde el botón de acción—, y sin contar, soltar uno mataría el propulsor
   * con el otro dedo todavía apretando. Sigue siendo la fuente: es quien
   * cuenta, y `down` sólo la espeja para que el mando pueda pintarla.
   */
  const held = useRef(new Map<string, number>());
  /**
   * Qué tecla tiene tomada cada dedo. Un contador exige que cada `press` tenga
   * exactamente un `release`, y los botones sueltan en tres eventos distintos
   * —al levantar, al salirse y al cancelarse el gesto—: levantar el dedo dentro
   * del botón dispara `pointerup` y `pointerleave` seguidos, que sin esto
   * contarían dos veces y bajarían la tecla que otro pulgar sigue pulsando.
   * Cada dedo es un `pointerId` distinto y sólo puede estar sobre un botón, así
   * que esto es lo que hace simétrica la cuenta.
   */
  const owners = useRef(new Map<number, string>());

  // La puerta hacia el motor: todo botón del mando entra por aquí, también los
  // de escritorio. Van antes que los efectos porque la pausa vacía la cuenta.

  // El espejo se toca sólo cuando una tecla cruza el cero, no en cada dedo:
  // eso son unos pocos renders por segundo, del orden de los que ya provoca
  // `onState`, y nunca uno por frame.

  /** Baja la tecla en el motor con el primer dedo que la pide. */
  function pressKey(code: string) {
    const n = (held.current.get(code) ?? 0) + 1;
    held.current.set(code, n);
    if (n === 1) {
      handle.current?.press(code);
      setDown((d) => new Set(d).add(code));
    }
  }

  /** La suelta con el último que la deja. */
  function releaseKey(code: string) {
    const n = (held.current.get(code) ?? 1) - 1;
    held.current.set(code, Math.max(0, n));
    if (n <= 0) {
      handle.current?.release(code);
      setDown((d) => {
        if (!d.has(code)) return d;
        const next = new Set(d);
        next.delete(code);
        return next;
      });
    }
  }

  /** Un dedo que llega a un botón: sólo cuenta la primera vez. */
  function pressFrom(pointerId: number, code: string) {
    if (owners.current.has(pointerId)) return;
    owners.current.set(pointerId, code);
    pressKey(code);
  }

  /** Y que lo deja: sólo cuenta si era él quien tenía esa tecla. */
  function releaseFrom(pointerId: number, code: string) {
    if (owners.current.get(pointerId) !== code) return;
    owners.current.delete(pointerId);
    releaseKey(code);
  }

  /**
   * Suelta todo lo que quedara pulsado y vacía la cuenta. Un `pointerup` que se
   * pierde deja una tecla colgada; que la partida no arranque nunca con una
   * heredada es lo que hace que ese descuadre no dure más que la partida.
   */
  const clearHeld = useCallback(() => {
    for (const [code, n] of held.current) if (n > 0) handle.current?.release(code);
    held.current.clear();
    owners.current.clear();
    // Y con la cuenta se vacía el espejo: ningún botón se queda dibujado
    // hundido con la partida en pausa o muerta.
    setDown((d) => (d.size ? new Set() : d));
  }, []);

  /**
   * El único camino a la pausa, y por eso soltar lo pulsado vive aquí y no en
   * el efecto que habla con el motor: desde que la cuenta tiene espejo, vaciarla
   * es cambiar estado, y hacerlo en el cuerpo de un efecto encadena renders. Un
   * dedo que siguiera encima al pausar dejaría su tecla contada para siempre,
   * porque ningún `release` volvería a bajarla.
   */
  const pauseRun = useCallback(() => {
    clearHeld();
    setPaused(true);
  }, [clearHeld]);

  /** PAUSA / SEGUIR: al pausar suelta, al reanudar no hay nada que soltar. */
  function togglePause() {
    if (!paused) clearHeld();
    setPaused((p) => !p);
  }

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

  // PAUSA / SEGUIR y las dos pausas automáticas acaban todas aquí: quien pausa
  // sólo mueve `paused` y este efecto se encarga del motor. Lo que ya no hace
  // es soltar las teclas: eso pasó a `pauseRun()` y `togglePause()`.
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
  // El listener es un evento del navegador, no el cuerpo del efecto: aquí
  // `pauseRun()` puede soltar lo pulsado como en los dos botones.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pauseRun();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pauseRun);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pauseRun);
    };
    // `pauseRun` sólo toca refs y setters, así que es estable y esto se
    // suscribe una vez, como cuando el listener era un `setPaused` suelto.
  }, [pauseRun]);

  /** Las tres cifras del HUD, de la partida en curso. */
  const run = live ?? FRESH_RUN;
  const playerName = ready && user ? user.name : "INVITADO";
  /** Teclas vivas del mando: las que no están se pintan deshabilitadas. */
  const padKeys = ENGINE_KEYS[game.id];
  /**
   * Lo que el mando de dedo necesita del gabinete, igual en las tres veces que
   * se monta. La cuenta de teclas se queda aquí: el mando sólo avisa del dedo
   * que llega y del que se va, y quién baja la tecla en el motor lo sigue
   * decidiendo `pressFrom` / `releaseFrom`.
   */
  const padProps = {
    gameId: game.id,
    down,
    onPress: pressFrom,
    onRelease: releaseFrom,
    paused,
    onPause: togglePause,
    onExit: () => {
      pauseRun();
      setLeaving(true);
    },
  };

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

  /**
   * PAUSA / SEGUIR del HUD, el de ratón y teclado. Con el dedo el botón lo
   * pinta el mando, en el centro y con su propia piel, y éste se apaga: es la
   * misma regla que siguen los botones de tecla, y el estado es uno solo, así
   * que los que se ven a la vez dicen lo mismo.
   */
  function pauseButton(className = "") {
    return (
      <button
        type="button"
        onClick={togglePause}
        aria-pressed={paused}
        className={`cursor-pointer border border-av-yellow/45 bg-transparent font-display text-av-yellow active:scale-94 hover:bg-av-yellow/16 hover:text-white ${className}`}
      >
        {paused ? "SEGUIR" : "PAUSA"}
      </button>
    );
  }

  function replay() {
    clearInterval(typer.current);
    // La partida nueva empieza con el mando en reposo: una tecla que se quedó
    // contada al morir no arrastra la nave siguiente.
    clearHeld();
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
      <section className="mx-auto w-full max-w-195 animate-av-fade handheld-wide:flex handheld-wide:h-full handheld-wide:flex-col">
        {/* Con el dedo el HUD va en una sola línea: envolver en tres empuja el
            tablero fuera de la ventana. Press Start 2P es monoespaciada y
            avanza 1em por carácter, así que lo que se recorta es lo que se
            paga por carácter —el cuerpo, el tracking de 1px y los huecos—, no
            ninguna de las cuatro celdas: las tres cifras y el jugador se
            quedan. PAUSA ya no está entre ellas, que desde SPEC 12 baja al
            centro del mando. */}
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

          {/* Con el dedo el HUD se queda sólo con sus cuatro celdas: PAUSA es
              un botón de partida y baja al centro del mando, que es donde lo
              busca el pulgar. En escritorio no molesta donde está y no se
              mueve. */}
          {pauseButton("px-3.5 py-2.75 text-[9px] handheld:hidden")}
        </div>

        {/* El marco del gabinete es aire, y con el dedo el aire es lo primero
            que sobra: sin recortarlo, la fila de cinco botones no cabe a lo
            ancho de un teléfono y el último se va a una segunda línea. */}
        <div className="mx-auto mt-6.5 rounded-[34px] border border-av-cyan/22 bg-[linear-gradient(#15171f,#0b0c12)] p-5.5 shadow-[0_0_46px_rgba(0,245,255,0.12),inset_0_0_0_1px_rgba(255,255,255,0.04)] handheld:mt-3 handheld:rounded-[20px] handheld:p-2.5 handheld-wide:mt-1.5 handheld-wide:flex handheld-wide:min-h-0 handheld-wide:flex-1 handheld-wide:flex-col handheld-wide:rounded-[14px] handheld-wide:p-1.5">
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
              lados.

              El de escritorio son 28rem y están medidos, no estimados: de
              arriba abajo, 67 de cabecera, 34 del relleno de arriba del
              `<main>`, 68 de HUD, 26 de margen, 44 del marco del gabinete, 65
              de la fila de cinco botones, 32 de la línea de controles, 69 de
              PIEL y 32 del relleno de abajo. Salen 437px y el presupuesto
              reserva 448. Los dos clamp que hay ahí —la cabecera y el relleno
              de arriba— ya están en su tope a partir de 1140px de ancho, así
              que 437 es el techo y no crece con la ventana. Estuvo en 16rem
              desde SPEC 05, cuando el gabinete no tenía ni PIEL ni la fila de
              cinco botones de hoy: con ese presupuesto la pantalla se salía de
              la ventana casi 230px y había que desplazarse para ver el tablero
              entero. Encoger es lo correcto —lo que no puede quedar fuera de la
              ventana es el tablero—, y en una ventana holgada no encoge nada,
              porque ahí quien acota sigue siendo el ancho del gabinete.

              El de vertical bajó de 26rem a 24rem al llegar SPEC 12, aunque el
              mando ganara botones: PAUSA se fue del HUD, que adelgaza a la
              altura de sus cifras, y la cruz pasó a 44px para dejarle sitio al
              centro, así que el bloque entero mide menos que antes. La cuenta
              en un teléfono de 390px, de arriba abajo: 44 de cabecera, 10 de
              aire, 23 de HUD, 34 entre el margen y el marco del gabinete, 156
              del mando con su margen, 65 de PIEL y el margen seguro de abajo.
              Salen unos 366px y el presupuesto reserva 384: lo que sobra es el
              margen, y el paso siguiente cuando algo crezca es subirlo, no
              recortar PIEL. */}
          {/* La fila de juego. En todas las maquetaciones menos la horizontal
              de mano es `display: contents`, así que no existe: el marco cuelga
              del gabinete igual que siempre. En horizontal se convierte en la
              fila que reparte el ancho entre el mando de la izquierda, el
              tablero y el de la derecha, y da al marco un alto contra el que
              medirse. */}
          <div className="contents handheld-wide:flex handheld-wide:min-h-0 handheld-wide:flex-1 handheld-wide:items-center handheld-wide:justify-center handheld-wide:gap-2">
            {/* El medio-mando de la izquierda: las cuatro flechas, donde cae el
                pulgar izquierdo, con PAUSA debajo. Sólo existe en horizontal;
                en vertical los tres bloques van juntos bajo el tablero. */}
            <GamePad {...padProps} layout="horizontal" side="left" />

            <div
              style={{ "--av-ratio": aspectRatio } as CSSProperties}
              // En horizontal manda el alto y el ancho lo sigue: el marco llena
              // la fila y el canvas se encarga de no deformarse, apoyado en el
              // `aspect-ratio` que `GameCanvas` ya le pone. El tope calculado
              // sobra ahí, porque quien acota es la altura.
              className="relative mx-auto overflow-hidden rounded-[22px] bg-av-void shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_12px_rgba(0,245,255,0.16)] [--av-chrome:28rem] max-w-[calc((100svh-var(--av-chrome))*var(--av-ratio))] handheld:[--av-chrome:24rem] handheld-wide:h-full handheld-wide:w-auto handheld-wide:max-w-none handheld-wide:rounded-xl handheld-wide:[--av-chrome:7rem]"
            >
              <GameCanvas
                game={engine}
                label={`Partida de ${game.title}`}
                onState={setLive}
                // El motor avisa con la puntuación final; el HUD ya viene
                // cuadrado del `onState` de ese mismo frame. El superpuesto
                // tapa el mando, así que los dedos que estuvieran encima no
                // van a soltar nunca: la cuenta se vacía aquí.
                onGameOver={() => {
                  clearHeld();
                  // Perder ya es salir de la partida: no queda nada que
                  // abandonar, así que la pregunta se cierra en vez de quedarse
                  // encima del fin de partida.
                  setLeaving(false);
                  setOver(true);
                }}
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
                className="block h-auto w-full touch-none handheld-wide:h-full handheld-wide:w-auto"
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

            {/* Y el de la derecha: las dos acciones, donde cae ese pulgar, con
                SALIR debajo. El centro del mando se reparte en horizontal,
                PAUSA a un lado y SALIR al otro, que es el hueco que deja cada
                bloque. */}
            <GamePad {...padProps} layout="horizontal" side="right" />
          </div>

          {/* La fila de cinco de siempre, la de ratón y teclado. Con el dedo se
              apaga en las dos posturas: un pulgar no busca botones en fila. */}
          <div className="mt-4.5 grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-2.5 handheld:hidden">
            {PAD.map((entry) => (
              <PadKey
                key={entry.label}
                label={entry.label}
                code={entry.code}
                aria={entry.aria}
                keys={padKeys}
                down={down}
                onPress={pressFrom}
                onRelease={releaseFrom}
              />
            ))}
          </div>

          {/* El mando de vertical, entero: la misma cruz de horizontal, con las
              dos acciones enfrente y los botones de partida en medio. Cae bajo
              el tablero y a lo ancho del gabinete, así que cada pulgar tiene el
              suyo sin cruzar la mano. En horizontal esto se apaga, porque allí
              los dos bloques están a los lados. */}
          <GamePad {...padProps} layout="vertical" />

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
          <div className="mt-4.5 flex flex-wrap items-center justify-center gap-2.5 border-t border-av-cyan/15 pt-4 handheld-wide:mt-1.5 handheld-wide:gap-1.5 handheld-wide:pt-1.5">
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

      {leaving && (
        <ExitOverlay
          href={`/juego/${game.id}`}
          onCancel={() => {
            setLeaving(false);
            setPaused(false);
          }}
        />
      )}

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
    <div className="fixed inset-0 z-60 grid place-items-center bg-[rgba(5,6,10,0.94)] px-[calc(1.25rem+env(safe-area-inset-left))]">
      <div className="grid justify-items-center gap-4.5 text-center">
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

const OVER_BUTTON = "p-3.75 font-display text-[10px] tracking-av handheld-wide:p-2.5";

/**
 * La pregunta de SALIR. Es el tercer superpuesto de la pantalla y habla el
 * mismo idioma que el de fin de partida —panel centrado, título en Press Start
 * 2P y los botones en columna—, con dos diferencias a propósito: el borde es
 * amarillo y no magenta, porque esto es una pregunta y no una avería, y el
 * botón lleno es el de quedarse. Salir de una partida tira su marca, así que la
 * salida se pide, no se roza.
 *
 * Va en `z-56`: por encima del gabinete y del fin de partida, por debajo de la
 * carga del cartucho, que es lo único que tapa la pantalla entera.
 */
function ExitOverlay({ href, onCancel }: { href: string; onCancel: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Salir de la partida"
      className="fixed inset-0 z-56 grid place-items-center bg-[rgba(5,6,10,0.9)] pt-[calc(1.25rem+env(safe-area-inset-top))] pr-[calc(1.25rem+env(safe-area-inset-right))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] pl-[calc(1.25rem+env(safe-area-inset-left))]"
    >
      {/* En horizontal de mano el panel se desplaza por dentro en vez de
          recortarse, igual que el de fin de partida. */}
      <div className="max-h-full w-[min(100%,420px)] overflow-y-auto overscroll-contain border border-av-yellow/45 bg-[#0d0f16] p-[clamp(22px,4vw,32px)] text-center shadow-[0_0_44px_rgba(245,255,0,0.18)] animate-av-fade handheld-wide:p-4">
        <h3 className="font-display text-av-subtitle tracking-av-wider text-av-yellow [text-shadow:0_0_16px_rgba(245,255,0,0.6)]">
          SALIR DE LA PARTIDA?
        </h3>
        <p className="mt-4 mb-5.5 text-[13px] tracking-av text-av-text-muted handheld-wide:mt-2 handheld-wide:mb-3">
          La partida en curso se pierde y su puntuación no llega al marcador.
        </p>

        <div className="flex flex-col gap-3 handheld-wide:gap-2">
          <Link
            href={href}
            className={`${OVER_BUTTON} border border-av-magenta bg-transparent text-av-magenta active:scale-96 hover:bg-av-magenta/18 hover:text-white`}
          >
            SI, SALIR
          </Link>
          <button
            type="button"
            onClick={onCancel}
            className={`${OVER_BUTTON} cursor-pointer border-none bg-av-yellow text-av-bg shadow-[0_0_22px_rgba(245,255,0,0.45)] active:scale-96 hover:bg-av-cyan`}
          >
            SEGUIR JUGANDO
          </button>
        </div>
      </div>
    </div>
  );
}

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
    // El superpuesto respeta la muesca y el indicador de inicio como el resto
    // de la pantalla: es lo que pide haber declarado `viewportFit: "cover"`.
    <div className="fixed inset-0 z-55 grid place-items-center bg-[rgba(5,6,10,0.9)] pt-[calc(1.25rem+env(safe-area-inset-top))] pr-[calc(1.25rem+env(safe-area-inset-right))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] pl-[calc(1.25rem+env(safe-area-inset-left))]">
      {/* En horizontal de mano el panel no cabe de una pieza: en vez de
          recortarlo o encogerlo hasta lo ilegible, se queda con todo el alto
          disponible y se desplaza por dentro. `overscroll-contain` deja el
          rebote aquí y no en la página de debajo. */}
      <div className="max-h-full w-[min(100%,460px)] overflow-y-auto overscroll-contain border border-av-magenta/45 bg-[#0d0f16] p-[clamp(22px,4vw,34px)] text-center shadow-[0_0_48px_rgba(255,0,110,0.22)] animate-av-fade handheld-wide:p-4">
        <h3 className="font-display text-av-subtitle tracking-av-wider text-av-magenta [text-shadow:0_0_16px_rgba(255,0,110,0.7)]">
          FIN DEL JUEGO
        </h3>
        <p className="mt-5 mb-1.5 text-[12px] tracking-av-wider text-av-text-dim handheld-wide:mt-2 handheld-wide:mb-0.5">
          PUNTUACIÓN FINAL
        </p>
        <p className="font-display text-av-title text-av-yellow [text-shadow:0_0_18px_rgba(245,255,0,0.6)]">
          {formatScore(score)}
        </p>
        <p className="mt-3.5 mb-5.5 text-[13px] tracking-av text-av-text-muted handheld-wide:mt-2 handheld-wide:mb-3">
          {note}
        </p>

        <div className="flex flex-col gap-3 handheld-wide:gap-2">
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
