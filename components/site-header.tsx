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
 * Las cuatro secciones de la navegación, una por acento del vault: los tres
 * neones y el ámbar que fijó SPEC 02. `/juego/[id]` cuenta como biblioteca,
 * igual que en `detalle.dc.html`, donde Biblioteca sale subrayada en cian.
 */
const SECTIONS = [
  {
    href: "/",
    label: "Inicio",
    isActive: (path: string) => path === "/",
    navOn: "border-av-magenta text-av-magenta",
    drawerOn: "text-av-magenta",
  },
  {
    href: "/biblioteca",
    label: "Biblioteca",
    isActive: (path: string) => path.startsWith("/biblioteca") || path.startsWith("/juego"),
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
  {
    href: "/acerca-de",
    label: "Acerca de",
    isActive: (path: string) => path.startsWith("/acerca-de"),
    navOn: "border-av-amber text-av-amber",
    drawerOn: "text-av-amber",
  },
] as const;

const NAV_OFF = "border-transparent text-av-text-muted";
const DRAWER_OFF = "text-av-text-bright";

/**
 * Los créditos del `nav.jsx` del template. Son atrezzo: el vault no cobra ni
 * lleva cuenta de partidas, así que la cifra es fija y nada la consume.
 *
 * Va sin tilde (`CREDITOS`) porque Press Start 2P no tiene É y el navegador la
 * sustituiría por un glifo de otra fuente, como pasaba con la Ñ del lema.
 */
const CREDITS = 3;
const CREDITS_LABEL = `CREDITOS · ${String(CREDITS).padStart(2, "0")}`;

export function SiteHeader() {
  const pathname = usePathname();
  const { user, ready, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Cerrar con Escape: el velo sólo responde al ratón.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Con el cajón abierto, empujar el pulgar sobre el velo movía el artículo de
  // detrás, que con el dedo es lo que hace que un menú parezca roto.
  //
  // Se congela `<html>` y no `<body>`, y eso es propio de este repo: el
  // `html { overflow-x: hidden }` de globals.css hace que `<html>` compute
  // (hidden, auto), y como deja de ser `visible` en los dos ejes, el `<body>`
  // ya no propaga su overflow al viewport. Medido: con `overflow:hidden` sólo
  // en el body, quien desplaza sigue siendo `document.scrollingElement`, que es
  // `<html>`, y la página se mueve igual.
  //
  // Se restaura al cerrar **y al desmontar**: navegar desde un enlace del cajón
  // desmonta esto con el menú aún abierto, y dejaría el sitio sin scroll.
  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <>
      {/* Los cuatro lados se declaran enteros en vez de restar sobre `px`/`py`:
          una utilidad no se anula con otra puesta después. El relleno de siempre
          se conserva dentro del `calc()` y el inset se suma; en Android y en
          escritorio `env()` vale 0 y no cambia ni un píxel. */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4.5 border-b border-av-cyan/24 bg-(--av-header-bg) pt-[calc(0.875rem+env(safe-area-inset-top))] pr-[calc(clamp(14px,3vw,40px)+env(safe-area-inset-right))] pb-3.5 pl-[calc(clamp(14px,3vw,40px)+env(safe-area-inset-left))] backdrop-blur-sm">
        <Link href="/" className="font-display text-av-brand tracking-av text-av-cyan av-glow-cyan">
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

        {/* Créditos y sesión comparten el extremo derecho: si el contador
            colgara del `justify-between` de la cabecera, empujaría la
            navegación fuera del centro. */}
        <div className="flex items-center gap-4.5">
          {/* La moneda y su cuenta, como en la barra del template. Desaparece
              antes que la navegación: en cuanto la cabecera se aprieta, lo
              primero que sobra es el adorno. */}
          <p className="hidden items-center gap-2 font-display text-[9px] tracking-[0.16em] text-av-yellow lg:flex">
            <span
              aria-hidden="true"
              className="size-3.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff8b0,#f5ff00_60%,#b0b800)] shadow-[0_0_8px_var(--av-yellow)]"
            />
            {CREDITS_LABEL}
          </p>

          <div className="flex items-center gap-3">
            {/* Hasta que `ready` es true no se pinta nada: evita mostrar
              INICIAR SESION un instante a quien ya tiene sesión. */}
            {ready &&
              (user ? (
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8.5 place-items-center bg-av-magenta font-display text-[11px] text-av-bg av-halo-magenta">
                    {user.username.slice(0, 1)}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] tracking-av text-av-text-bright">
                      {user.username}
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
            className="absolute inset-y-0 right-0 flex w-[min(78vw,300px)] animate-av-slide flex-col gap-5.5 overflow-y-auto overscroll-contain border-l border-av-cyan/30 bg-[#0d0e16] pt-[calc(1.625rem+env(safe-area-inset-top))] pr-[calc(1.375rem+env(safe-area-inset-right))] pb-[calc(1.625rem+env(safe-area-inset-bottom))] pl-5.5 shadow-[-18px_0_50px_rgba(0,245,255,0.12)]"
          >
            <div className="font-display text-[10px] tracking-av text-av-line-strong">MENU</div>
            {/* Cada enlace cierra el cajón al navegar: si no, seguiría abierto
                sobre la pantalla nueva. */}
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                onClick={() => setMenuOpen(false)}
                className={`text-[15px] tracking-av-wide ${s.isActive(pathname) ? s.drawerOn : DRAWER_OFF}`}
              >
                {s.label}
              </Link>
            ))}
            <Link
              href="/cuenta"
              onClick={() => setMenuOpen(false)}
              className="text-[15px] tracking-av-wide text-av-magenta"
            >
              Cuenta
            </Link>

            {/* Al fondo del cajón y sin moneda, igual que en el template: aquí
                el contador es la firma de la máquina, no un dato que consultar. */}
            <p className="mt-auto font-display text-[9px] tracking-[0.16em] text-av-text-faint">
              {CREDITS_LABEL}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
