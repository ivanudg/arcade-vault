"use client";

/**
 * El canvas donde corre un motor de verdad.
 *
 * Es deliberadamente fino: crea el `<canvas>`, lo escala por
 * `devicePixelRatio`, monta el motor al aparecer y lo destruye al irse. No
 * tiene estado propio, así que el bucle a 60 fps nunca provoca un render aquí;
 * lo que sube al padre son los dos callbacks del contrato, guardados en una
 * `ref` para que un re-render suyo no remonte el juego —y con él, reinicie la
 * partida—.
 */

import { useEffect, useRef } from "react";
import type { GameHandle, GameMount, GameState } from "@/lib/games/engine";

/**
 * Tope del multiplicador de resolución. Con `devicePixelRatio` 3 el buffer de
 * un mundo de 800×600 sería de 2400×1800 y el relleno de fondo por frame se
 * come el presupuesto; por encima de 2 no se distingue nada en un canvas
 * vectorial y sí se nota en fotogramas.
 */
const MAX_DPR = 2;

export function GameCanvas({
  game,
  onState,
  onGameOver,
  onReady,
  label = "Pantalla de juego",
  className,
}: {
  /** El motor. Es una constante de módulo: cambiarlo remonta la partida. */
  game: GameMount;
  onState?: (state: GameState) => void;
  onGameOver?: (score: number) => void;
  /** Recibe el mando del motor al montar, y `null` al desmontar. */
  onReady?: (handle: GameHandle | null) => void;
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onState, onGameOver, onReady });

  // El efecto que monta no depende de los callbacks, así que aquí se guarda la
  // versión de este render para que el motor llame siempre a la última.
  useEffect(() => {
    callbacks.current = { onState, onGameOver, onReady };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = game.world.width * dpr;
    canvas.height = game.world.height * dpr;

    // Fijar `width`/`height` reinicia el contexto, así que la escala se aplica
    // después: el motor dibuja en coordenadas lógicas y no sabe del `dpr`.
    canvas.getContext("2d")?.scale(dpr, dpr);

    const handle = game.mount(canvas, {
      onState: (state) => callbacks.current.onState?.(state),
      onGameOver: (score) => callbacks.current.onGameOver?.(score),
    });

    callbacks.current.onReady?.(handle);

    return () => {
      callbacks.current.onReady?.(null);
      handle.destroy();
    };
  }, [game]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      style={{ aspectRatio: `${game.world.width} / ${game.world.height}` }}
      className={className}
    />
  );
}
