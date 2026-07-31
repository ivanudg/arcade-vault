/**
 * Las ocho siluetas de píxel que flotan tras el titular de la portada.
 * Puerto de `FloatingSilhouettes` y de `.home-silos` en
 * references/templates/home-about/, con dos cambios:
 *
 * - Repintadas con los cuatro acentos del vault, dos figuras cada uno. El
 *   template usaba verde, morado, oro y dos rojos que no existen en la paleta.
 * - El color entra por clase (`text-av-*`) y los rectángulos lo heredan con
 *   `currentColor`, que es también lo que ilumina el `drop-shadow`.
 *
 * Es decoración: no captura el puntero y queda fuera del árbol accesible.
 */

function Silo({
  className,
  /** Desfase en segundos; negativo, para que ninguna arranque en reposo. */
  delay,
  viewBox,
  children,
}: {
  className: string;
  delay?: number;
  viewBox: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={viewBox}
      fill="currentColor"
      style={delay ? { animationDelay: `${delay}s` } : undefined}
      className={`absolute animate-av-float filter-[drop-shadow(0_0_10px_currentColor)] motion-reduce:animate-none ${className}`}
    >
      {children}
    </svg>
  );
}

export function HeroSilhouettes() {
  // En móvil las ocho figuras caen sobre el titular: siguen ahí y siguen
  // flotando, pero a un cuarto de opacidad para no disputarle la lectura.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 opacity-25 sm:opacity-55"
    >
      {/* Invasor */}
      <Silo viewBox="0 0 40 32" className="top-[14%] left-[8%] w-20 text-av-cyan">
        <rect x="6" y="4" width="4" height="4" />
        <rect x="30" y="4" width="4" height="4" />
        <rect x="2" y="8" width="36" height="4" />
        <rect x="2" y="12" width="4" height="4" />
        <rect x="14" y="12" width="4" height="4" />
        <rect x="22" y="12" width="4" height="4" />
        <rect x="34" y="12" width="4" height="4" />
        <rect x="2" y="16" width="36" height="4" />
        <rect x="6" y="20" width="4" height="4" />
        <rect x="30" y="20" width="4" height="4" />
      </Silo>

      {/* Nave */}
      <Silo
        viewBox="0 0 32 32"
        delay={-1.5}
        className="top-[22%] right-[10%] w-18 text-av-magenta"
      >
        <rect x="8" y="0" width="16" height="4" />
        <rect x="4" y="4" width="24" height="4" />
        <rect x="0" y="8" width="32" height="12" />
        <rect x="0" y="20" width="6" height="6" />
        <rect x="10" y="20" width="4" height="6" />
        <rect x="18" y="20" width="4" height="6" />
        <rect x="26" y="20" width="6" height="6" />
      </Silo>

      {/* Marciano de patas */}
      <Silo
        viewBox="0 0 32 32"
        delay={-3}
        className="bottom-[18%] left-[12%] w-22 text-av-yellow"
      >
        <rect x="10" y="0" width="12" height="4" />
        <rect x="6" y="4" width="20" height="4" />
        <rect x="4" y="8" width="6" height="6" />
        <rect x="22" y="8" width="6" height="6" />
        <rect x="2" y="14" width="28" height="10" />
        <rect x="6" y="24" width="4" height="4" />
        <rect x="14" y="24" width="4" height="4" />
        <rect x="22" y="24" width="4" height="4" />
      </Silo>

      {/* Mira */}
      <Silo
        viewBox="0 0 24 24"
        delay={-4.5}
        className="right-[14%] bottom-[22%] w-15 text-av-amber"
      >
        <rect x="10" y="0" width="4" height="24" />
        <rect x="0" y="10" width="24" height="4" />
        <rect
          x="6"
          y="6"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </Silo>

      {/* Platillo */}
      <Silo
        viewBox="0 0 36 24"
        delay={-2}
        className="top-[38%] left-[4%] w-17.5 text-av-cyan"
      >
        <rect x="14" y="2" width="8" height="4" />
        <rect x="10" y="6" width="16" height="4" />
        <rect x="4" y="10" width="28" height="4" />
        <rect x="0" y="14" width="36" height="4" />
        <rect x="6" y="18" width="4" height="2" />
        <rect x="16" y="18" width="4" height="2" />
        <rect x="26" y="18" width="4" height="2" />
      </Silo>

      {/* Moneda */}
      <Silo
        viewBox="0 0 20 20"
        delay={-3.5}
        className="top-[9%] left-[27%] w-11 text-av-yellow"
      >
        <rect x="6" y="0" width="8" height="2" />
        <rect x="2" y="2" width="16" height="2" />
        <rect x="0" y="4" width="20" height="12" />
        <rect x="2" y="16" width="16" height="2" />
        <rect x="6" y="18" width="8" height="2" />
        <rect x="8" y="4" width="4" height="12" fill="var(--av-bg)" />
      </Silo>

      {/* Corazón */}
      <Silo
        viewBox="0 0 24 22"
        delay={-1}
        className="bottom-[12%] left-[42%] w-13 text-av-magenta"
      >
        <rect x="2" y="2" width="6" height="2" />
        <rect x="16" y="2" width="6" height="2" />
        <rect x="0" y="4" width="10" height="4" />
        <rect x="14" y="4" width="10" height="4" />
        <rect x="0" y="8" width="24" height="4" />
        <rect x="2" y="12" width="20" height="2" />
        <rect x="4" y="14" width="16" height="2" />
        <rect x="6" y="16" width="12" height="2" />
        <rect x="8" y="18" width="8" height="2" />
        <rect x="10" y="20" width="4" height="2" />
      </Silo>

      {/* Cruceta */}
      <Silo
        viewBox="0 0 24 24"
        delay={-5}
        className="top-[50%] right-[4%] w-15 text-av-amber"
      >
        <rect x="8" y="2" width="8" height="6" />
        <rect x="2" y="8" width="20" height="8" />
        <rect x="8" y="16" width="8" height="6" />
        <rect x="11" y="6" width="2" height="2" fill="var(--av-bg)" />
        <rect x="11" y="16" width="2" height="2" fill="var(--av-bg)" />
        <rect x="4" y="11" width="2" height="2" fill="var(--av-bg)" />
        <rect x="18" y="11" width="2" height="2" fill="var(--av-bg)" />
      </Silo>
    </div>
  );
}
