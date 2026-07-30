/**
 * Fondo CRT compartido por todas las pantallas.
 *
 * Tres capas decorativas, en el mismo orden y con los mismos z-index que las
 * plantillas de references/templates/: la rejilla que se desplaza y la viñeta
 * por debajo del contenido, y las líneas de barrido por encima de todo.
 * Es puro adorno: `aria-hidden` y sin capturar el puntero.
 */
export function VaultBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {/* Suelo de rejilla: se sale por los lados y por abajo para que el
            desplazamiento no deje ver dónde empieza el patrón. */}
        <div className="av-grid-floor absolute bottom-[-10%] left-[-20%] right-[-20%] h-[70%]" />
        <div className="av-vignette absolute inset-0" />
      </div>

      <div
        aria-hidden
        className="av-scanlines pointer-events-none fixed inset-0 z-50"
      />
    </>
  );
}
