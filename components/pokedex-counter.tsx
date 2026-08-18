"use client";

/**
 * El contador de `/contador`, que es a la vez el índice de la Pokédex Nacional.
 *
 * La idea de la pantalla es que el número y el Pokémon **son la misma cosa**:
 * no hay un contador abstracto con una imagen pegada al lado, hay una Pokédex
 * cuyo dial se mueve de uno en uno. Por eso el botón principal dice `+1` y no
 * «siguiente», y por eso el número va en el display y no bajo la ficha.
 *
 * El gesto de la pantalla es la **revelación por silueta**: el artwork entra en
 * negro, aguanta un compás y se revela. Es el «¿quién es ese Pokémon?», y es
 * deliberadamente lo único llamativo de aquí; todo lo demás va disciplinado.
 * Con `prefers-reduced-motion` el compás es cero y la imagen entra revelada.
 *
 * El acento de la pantalla —marco, número, chips y botón— es el color del
 * **tipo primario**, así que cambia con cada entrada. Viaja siempre en `style`
 * y nunca en un nombre de clase: Tailwind sólo ve las cadenas escritas enteras,
 * la misma regla que ya siguen los halos de `game.glow`.
 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  accentOf,
  fetchEntry,
  padId,
  POKEDEX_MAX,
  POKEDEX_MIN,
  TYPE_COLOR,
  TYPE_LABEL,
  type PokedexEntry,
} from "@/lib/pokedex";

/** Lo que aguanta la silueta antes de revelarse. Cero si se pide menos motion. */
const REVEAL_MS = 420;

type Status = "cargando" | "listo" | "error";

/** En qué punto de la revelación está el artwork que se pinta ahora mismo. */
type Phase = "oculta" | "silueta" | "visible";

/** Cómo se dibuja el artwork en cada punto de la revelación. */
const ART_CLASS: Record<Phase, string> = {
  oculta: "scale-95 opacity-0 brightness-0",
  silueta: "scale-95 opacity-100 brightness-0",
  visible: "scale-100 opacity-100 brightness-100",
};

/** Lo que comparten los dos botones laterales; el acento va escrito aparte. */
const SIDE_BUTTON =
  "min-w-[124px] cursor-pointer border border-white/16 px-5 py-4.5 font-display text-[9px] tracking-av text-av-text-muted transition focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-94 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/16 disabled:hover:text-av-text-muted";

export function PokedexCounter() {
  const [count, setCount] = useState(POKEDEX_MIN);
  const [entry, setEntry] = useState<PokedexEntry | null>(null);
  const [status, setStatus] = useState<Status>("cargando");
  /**
   * En qué punto de la revelación está la imagen, y **de qué entrada**.
   *
   * Lleva el `id` dentro a propósito: así cambiar de entrada devuelve la
   * pantalla a oscuras por derivación —`shown.id` deja de coincidir— en vez de
   * por un efecto que resetee dos booleanos. Un `setState` en el cuerpo de un
   * efecto encadena renders, y aquí ni siquiera hace falta.
   */
  const [shown, setShown] = useState<{ id: number; phase: "silueta" | "visible" } | null>(null);
  /** Sube cada vez que se pide reintentar, para volver a disparar el efecto. */
  const [attempt, setAttempt] = useState(0);

  /**
   * Las entradas ya vistas. En una `ref` y no en el ámbito de módulo: una caché
   * de módulo sobreviviría al desmontaje y sería estado mutable fuera del
   * componente, que es justo lo que este repo evita en los motores.
   */
  const cache = useRef(new Map<number, PokedexEntry>());

  /**
   * Trae la entrada y, en cuanto está en pantalla, calienta la siguiente: eso
   * es lo que hace que el `+1` se sienta instantáneo a partir del segundo clic.
   * Un fallo de la que viene no se le cuenta a nadie, que es trabajo adelantado
   * y no la pantalla.
   */
  useEffect(() => {
    const ctrl = new AbortController();

    const load = async (id: number) => {
      const hit = cache.current.get(id);
      if (hit) return hit;
      const got = await fetchEntry(id, ctrl.signal);
      cache.current.set(id, got);
      return got;
    };

    const cached = cache.current.get(count);
    setEntry(cached ?? null);
    setStatus(cached ? "listo" : "cargando");

    load(count)
      .then((got) => {
        // Abortar es cambiar de entrada, no fallar: la petición nueva manda.
        if (ctrl.signal.aborted) return;
        setEntry(got);
        setStatus("listo");
        if (count < POKEDEX_MAX) load(count + 1).catch(() => {});
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus("error");
      });

    return () => ctrl.abort();
  }, [count, attempt]);

  /**
   * El compás de la silueta. Sólo programa el reloj: quien decide si hay
   * compás o no es el `onLoad` de la imagen, que es un evento y puede mirar
   * `prefers-reduced-motion` sin encadenar renders.
   */
  useEffect(() => {
    if (shown?.phase !== "silueta") return;
    const id = window.setTimeout(() => setShown({ id: shown.id, phase: "visible" }), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [shown]);

  const step = (delta: number) =>
    setCount((n) => Math.min(POKEDEX_MAX, Math.max(POKEDEX_MIN, n + delta)));

  const accent = accentOf(entry);
  /**
   * En qué punto va la entrada que se está pintando ahora mismo. Es derivado y
   * no estado, de modo que cambiar de entrada devuelve la pantalla a oscuras
   * sola. Una entrada **sin artwork** no dispara `onLoad`, así que se da por
   * revelada de entrada: si no, su ficha no aparecería nunca.
   */
  const phase: Phase = !entry
    ? "oculta"
    : !entry.art
      ? "visible"
      : shown?.id === entry.id
        ? shown.phase
        : "oculta";
  /** La entrada ya revelada, o `null` mientras la silueta aguanta. */
  const card = phase === "visible" ? entry : null;
  const atStart = count === POKEDEX_MIN;
  const atEnd = count === POKEDEX_MAX;

  return (
    <div className="mt-12">
      {/* El visor va a ancho fijo y no a fracción: con `1fr` sobre un contenedor
          de 1200px el cuadrado se iba a 570px de alto y echaba la botonera
          fuera de la ventana, que es justo lo que aquí hay que tener a mano. */}
      <div className="grid items-start gap-8 min-[880px]:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------------
            El display. Cuadrado, con el marco teñido del tipo y las mismas
            líneas de barrido que el resto del sitio.
            --------------------------------------------------------------- */}
        <div
          className="relative mx-auto aspect-square w-full max-w-[380px] overflow-hidden border bg-av-void transition-colors duration-500"
          style={{
            borderColor: accent,
            boxShadow: `0 0 34px -14px ${accent}, inset 0 0 60px -30px ${accent}`,
          }}
        >
          {/* El velo del tipo, que es lo único que tiñe el fondo del tubo. */}
          <div
            aria-hidden
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              background: `radial-gradient(70% 70% at 50% 46%, ${accent}26, transparent 72%)`,
            }}
          />

          {entry?.art && (
            <Image
              key={entry.id}
              src={entry.art}
              // El nombre, aunque la imagen esté todavía en silueta: el gesto
              // es visual y quien navega con lector no tiene por qué pagarlo.
              alt={entry.name}
              fill
              sizes="380px"
              priority={entry.id === POKEDEX_MIN}
              onLoad={() => {
                const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                setShown({ id: entry.id, phase: quiet ? "visible" : "silueta" });
              }}
              // Si el artwork no carga, se salta el gesto entero: una silueta
              // que no se revela nunca es peor que no tener silueta.
              onError={() => setShown({ id: entry.id, phase: "visible" })}
              className={`object-contain p-[12%] transition-[filter,opacity,transform] duration-500 ease-out motion-reduce:transition-none ${ART_CLASS[phase]}`}
            />
          )}

          {status === "cargando" && (
            <p className="absolute inset-0 flex items-center justify-center font-display text-[10px] tracking-av-wider text-av-cyan animate-av-pulse">
              ESCANEANDO
            </p>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="font-display text-[11px] leading-[1.6] tracking-av text-av-magenta av-glow-magenta">
                SIN SEÑAL
              </p>
              <p className="max-w-[34ch] text-[12px] leading-[1.7] tracking-av text-av-text-dim">
                La Pokédex no contesta. El contador sigue donde estaba.
              </p>
              <button
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
                className="cursor-pointer border border-av-magenta px-4 py-2.5 font-display text-[9px] tracking-av text-av-magenta transition hover:bg-av-magenta hover:text-av-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-av-magenta active:scale-94"
              >
                REINTENTAR
              </button>
            </div>
          )}

          {/* Las cuatro esquinas del visor y el barrido, sobre todo lo demás. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 av-scanlines opacity-70"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-3 left-3 size-4 border-t border-l"
            style={{ borderColor: accent }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 bottom-3 size-4 border-r border-b"
            style={{ borderColor: accent }}
          />
        </div>

        {/* ---------------------------------------------------------------
            La ficha. El número grande es el contador: no se repite en
            ningún otro sitio de la pantalla.
            --------------------------------------------------------------- */}
        {/* La altura va reservada al alto del visor: sin eso, el hueco de la
            ficha colapsa entre entrada y entrada y la botonera da un salto
            justo debajo del dedo que acaba de pulsarla. */}
        <div aria-live="polite" aria-atomic="true" className="min-h-70 min-[880px]:min-h-95">
          <p className="font-display text-[9px] tracking-[0.24em] text-av-text-muted">
            ENTRADA NACIONAL
          </p>

          <p
            className="mt-3 font-display text-[clamp(40px,10vw,76px)] leading-none tracking-av-wider tabular-nums transition-colors duration-500"
            style={{ color: accent, textShadow: `0 0 22px ${accent}80` }}
          >
            {padId(count)}
          </p>

          {/* El nombre entra **con** la revelación y no con los datos: escrito
              al lado de una silueta, la silueta sobraría. Lo que sí responde al
              instante es el número, que es lo que se acaba de pulsar. */}
          <h2 className="mt-5 min-h-6 font-display text-[clamp(13px,3vw,20px)] leading-[1.5] tracking-av-wide text-av-text-bright">
            {card?.name ?? " "}
          </h2>

          {card && (
            <div className="animate-av-fade">
              <ul className="mt-4 flex flex-wrap gap-2">
                {card.types.map((type) => (
                  <li
                    key={type}
                    className="border px-3 py-2 font-display text-[8px] tracking-av"
                    style={{
                      color: TYPE_COLOR[type],
                      borderColor: `${TYPE_COLOR[type]}66`,
                      backgroundColor: `${TYPE_COLOR[type]}14`,
                    }}
                  >
                    {TYPE_LABEL[type]}
                  </li>
                ))}
              </ul>

              <dl className="mt-6 flex gap-8 border-t border-av-line pt-5 text-[13px] tracking-av">
                <div>
                  <dt className="font-display text-[8px] tracking-[0.2em] text-av-text-faint">
                    ALTURA
                  </dt>
                  <dd className="mt-2 text-av-text">{card.height.toFixed(1)} m</dd>
                </div>
                <div>
                  <dt className="font-display text-[8px] tracking-[0.2em] text-av-text-faint">
                    PESO
                  </dt>
                  <dd className="mt-2 text-av-text">{card.weight.toFixed(1)} kg</dd>
                </div>
              </dl>

              {card.flavor && (
                <p className="mt-5 max-w-[52ch] text-[14px] leading-[1.8] tracking-av text-pretty text-av-text-dim">
                  {card.flavor}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -----------------------------------------------------------------
          La botonera. `+1` es el protagonista y toma el color del tipo;
          los otros dos se quedan neutros para no competir con él.
          ----------------------------------------------------------------- */}
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={atStart}
          className={`${SIDE_BUTTON} hover:border-av-yellow hover:text-av-yellow focus-visible:outline-av-yellow`}
        >
          -1
        </button>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={atEnd}
          className="cursor-pointer px-10 py-4.5 font-display text-[15px] tracking-av-wider text-av-bg transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-3 active:scale-96 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: accent,
            boxShadow: `0 0 24px -4px ${accent}`,
            outlineColor: accent,
          }}
        >
          +1
        </button>

        <button
          type="button"
          onClick={() => setCount(POKEDEX_MIN)}
          disabled={atStart}
          className={`${SIDE_BUTTON} hover:border-av-magenta hover:text-av-magenta focus-visible:outline-av-magenta`}
        >
          VOLVER AL 1
        </button>
      </div>

      <p className="mt-5 text-center text-[13px] tracking-av text-av-text-faint">
        {atEnd
          ? `${POKEDEX_MAX} es la última entrada registrada.`
          : `Quedan ${POKEDEX_MAX - count} entradas por delante.`}
      </p>
    </div>
  );
}
