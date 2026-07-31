"use client";

/**
 * Aparición progresiva al bajar. Puerto de `.reveal` / `.reveal.in` y del
 * `useReveal()` de references/templates/home-about/home.jsx, con sus mismos
 * 600ms y su umbral de 0.12.
 *
 * A diferencia del template, el estado oculto **no** se sirve desde el
 * servidor: el HTML llega visible y sólo se oculta lo que queda por debajo del
 * pliegue, ya en el cliente. Así la portada se lee entera sin JavaScript, y
 * nadie ve desaparecer algo que ya estaba en pantalla.
 *
 * Una vez mostrada, la sección no vuelve a ocultarse: el observador se
 * desconecta en cuanto dispara.
 */

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  className = "",
  /** Retardo en ms, para escalonar varias apariciones seguidas. */
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sin observador no hay aparición: la sección se queda visible.
    if (typeof IntersectionObserver === "undefined") return;
    // Quien pide menos movimiento lo ve todo de una vez, sin transición.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Lo que ya está a la vista no se oculta: parpadearía nada más hidratar.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    // El estado oculto es cosa del cliente: el servidor sirve la sección visible.
    setIsHidden(true);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsHidden(false);
        io.disconnect();
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // La transición nombra `translate`, no `transform`: es la propiedad que
  // escribe `translate-y-*` en Tailwind v4, y sin ella el desplazamiento
  // saltaría de golpe mientras la opacidad sí se funde.
  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`transition-[opacity,translate] duration-600 ease-out motion-reduce:transition-none motion-reduce:delay-0 ${
        isHidden ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100"
      } ${className}`}
    >
      {children}
    </div>
  );
}
