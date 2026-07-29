"use client";

/**
 * Cabecera compartida por las cuatro pantallas con chrome completo.
 * `/jugar/[id]` usa la suya, reducida, vía layout anidado.
 *
 * Puerto del `<header>` de references/templates/: marca, navegación con la
 * sección activa subrayada en su color, bloque de sesión y, en móvil, el
 * hamburguesa con su cajón lateral.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";

/**
 * Las dos secciones de la navegación. `/juego/[id]` cuenta como biblioteca,
 * igual que en `detalle.dc.html`, donde Biblioteca sale subrayada en cian.
 */
const SECTIONS = [
  {
    href: "/",
    label: "Biblioteca",
    isActive: (path: string) => path === "/" || path.startsWith("/juego"),
    navOn: "border-av-cyan text-av-cyan",
    drawerOn: "text-av-cyan",
  },
  {
    href: "/salon",
    label: "Salón de la Fama",
    isActive: (path: string) => path.startsWith("/salon"),
    navOn: "border-av-yellow text-av-yellow",
    drawerOn: "text-av-yellow",
  },
] as const;

const NAV_OFF = "border-transparent text-av-text-muted";
const DRAWER_OFF = "text-av-text-bright";

export function SiteHeader() {
  const pathname = usePathname();
  const { user, ready, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // El cajón se cierra al navegar: si no, seguiría abierto sobre la pantalla nueva.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Cerrar con Escape: el velo sólo responde al ratón.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4.5 border-b border-av-cyan/24 bg-(--av-header-bg) px-[clamp(14px,3vw,40px)] py-3.5 backdrop-blur-sm">
        <Link
          href="/"
          className="font-display text-av-brand tracking-av text-av-cyan av-glow-cyan"
        >
          ARCADE
          <span className="text-av-magenta av-glow-magenta"> VAULT</span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] tracking-[1.6px] md:flex">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={s.isActive(pathname) ? "page" : undefined}
              className={`border-b-2 pb-1.25 ${s.isActive(pathname) ? s.navOn : NAV_OFF}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Hasta que `ready` es true no se pinta nada: evita mostrar
              INICIAR SESION un instante a quien ya tiene sesión. */}
          {ready &&
            (user ? (
              <div className="flex items-center gap-2.5">
                <div className="grid size-8.5 place-items-center bg-av-magenta font-display text-[11px] text-av-bg av-halo-magenta">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] tracking-av text-av-text-bright">
                    {user.name}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="cursor-pointer text-left text-[10px] tracking-av text-av-text-dim hover:text-av-magenta"
                  >
                    SALIR
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/cuenta"
                className="bg-av-cyan px-3.5 py-2.75 font-display text-[9px] tracking-av text-av-bg av-halo-cyan hover:bg-av-yellow"
              >
                INICIAR SESION
              </Link>
            ))}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir el menú"
            aria-expanded={menuOpen}
            aria-controls="av-menu"
            className="grid h-9.5 w-10 cursor-pointer place-content-center gap-1.25 border border-av-cyan/40 active:scale-94 md:hidden"
          >
            <span className="block h-0.5 w-5 bg-av-cyan" />
            <span className="block h-0.5 w-5 bg-av-cyan" />
            <span className="block h-0.5 w-5 bg-av-cyan" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-45 bg-(--av-scrim) md:hidden"
        >
          <div
            id="av-menu"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 right-0 flex w-[min(78vw,300px)] animate-av-slide flex-col gap-5.5 border-l border-av-cyan/30 bg-[#0d0e16] px-5.5 py-6.5 shadow-[-18px_0_50px_rgba(0,245,255,0.12)]"
          >
            <div className="font-display text-[10px] tracking-av text-av-line-strong">
              MENU
            </div>
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`text-[15px] tracking-av-wide ${s.isActive(pathname) ? s.drawerOn : DRAWER_OFF}`}
              >
                {s.label}
              </Link>
            ))}
            <Link
              href="/cuenta"
              className="text-[15px] tracking-av-wide text-av-magenta"
            >
              Cuenta
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
