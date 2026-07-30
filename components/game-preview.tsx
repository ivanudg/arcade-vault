"use client";

/**
 * Preview de una máquina: la escena de `drawPreview()` sobre un canvas.
 *
 * La escena se dibuja siempre en el tamaño lógico que use la plantilla
 * correspondiente (300×190 en las tarjetas, 560×360 en la ficha) y es
 * `object-fit: cover` quien la encaja en la caja, recortando igual que en
 * references/templates/. Dibujar directamente al tamaño de la caja cambiaría
 * el encuadre: los trazos se calculan como fracciones de `W`/`H`.
 *
 * El buffer se multiplica por `devicePixelRatio` para no quedar borroso en
 * pantallas densas, e `image-rendering: pixelated` remata el aspecto de
 * máquina vieja cuando el zoom del navegador no es entero.
 */

import { useEffect, useRef } from "react";
import type { GameId } from "@/lib/games";
import { drawPreview } from "@/lib/preview-art";

export function GamePreview({
  id,
  width = 300,
  height = 190,
  className,
}: {
  id: GameId;
  /** Ancho lógico de la escena, el `width` del canvas en la plantilla. */
  width?: number;
  /** Alto lógico de la escena, el `height` del canvas en la plantilla. */
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Asignar width/height ya limpia el canvas y resetea la transformación:
    // se vuelve a poner la escala antes de dibujar en unidades lógicas.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPreview(ctx, id, width, height);
  }, [id, width, height]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`block size-full object-cover [image-rendering:pixelated] ${className ?? ""}`}
    />
  );
}
