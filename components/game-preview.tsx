"use client";

/**
 * Preview de una máquina: la escena de `drawPreview()` sobre un canvas.
 *
 * El canvas se dimensiona por `devicePixelRatio` para no quedar borroso en
 * pantallas densas, y se sigue dibujando en píxeles lógicos para que la escena
 * conserve las proporciones del prototipo. `image-rendering: pixelated` remata
 * el aspecto de máquina vieja cuando el zoom del navegador no es entero.
 */

import { useEffect, useRef } from "react";
import type { GameId } from "@/lib/games";
import { drawPreview } from "@/lib/preview-art";

export function GamePreview({
  id,
  className,
}: {
  id: GameId;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const paint = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Asignar width/height ya limpia el canvas y resetea la transformación:
      // se vuelve a poner la escala antes de dibujar en unidades lógicas.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPreview(ctx, id, width, height);
    };

    paint();

    // La rejilla de la biblioteca refluye al cambiar el ancho: sin esto, el
    // bitmap viejo se estiraría por CSS y la escena saldría deformada.
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [id]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`block size-full [image-rendering:pixelated] ${className ?? ""}`}
    />
  );
}
