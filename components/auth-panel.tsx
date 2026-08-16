"use client";

/**
 * Acceso simulado. Puerto de references/templates/cuenta.dc.html.
 *
 * No hay validación ni autenticación real, igual que en el prototipo: el
 * usuario se pasa a mayúsculas y se recorta a 12 caracteres, y la contraseña
 * se ignora. Con sesión activa el formulario se sustituye por el avatar.
 */

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/lib/session";

const FIELD =
  "border border-av-cyan/30 bg-av-void p-3.25 text-[14px] text-av-text-bright outline-none focus:border-av-cyan focus:shadow-[0_0_18px_rgba(0,245,255,0.45)]";
const LABEL = "flex flex-col gap-2 text-[12px] tracking-av-wide text-av-text-muted";

export function AuthPanel() {
  const { user, ready, logout } = useSession();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isRegister = tab === "register";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Todavía no hay forma de entrar: `login()` salió del contexto con la
    // sesión simulada y quien habla con Supabase Auth es este panel, que se
    // escribe en el paso siguiente de SPEC 15.
  }

  return (
    <div className="w-[min(100%,440px)] border border-av-cyan/28 bg-[rgba(13,15,22,0.92)] p-[clamp(22px,4vw,36px)] shadow-[0_0_44px_rgba(0,245,255,0.12)]">
      <div className="text-center font-display text-[15px] tracking-av text-av-cyan [text-shadow:0_0_12px_rgba(0,245,255,0.8)]">
        ARCADE
        <span className="text-av-magenta [text-shadow:0_0_12px_rgba(255,0,110,0.8)]"> VAULT</span>
      </div>
      <p className="mt-3.5 mb-6 text-center text-[13px] tracking-av text-av-text-dim">
        Guarda tus récords y compite en el salón.
      </p>

      {/* Nada de estado de sesión hasta leer `localStorage`: si no, a quien ya
          tiene sesión le parpadearía el formulario antes del avatar. */}
      {!ready ? null : user ? (
        <div className="flex flex-col gap-4 text-center">
          <div className="grid place-items-center gap-3 border border-av-magenta/35 bg-av-void p-5">
            <div className="grid size-13 place-items-center bg-av-magenta font-display text-[16px] text-av-bg shadow-[0_0_18px_rgba(255,0,110,0.6)]">
              {user.username.slice(0, 1)}
            </div>
            <span className="font-display text-[11px] tracking-av text-av-text-bright">
              {user.username}
            </span>
            <span className="text-[12px] tracking-av text-av-text-dim">
              Sesión activa en este dispositivo
            </span>
          </div>
          <Link
            href="/"
            className="bg-av-cyan p-4 font-display text-[10px] tracking-av text-av-bg shadow-[0_0_22px_rgba(0,245,255,0.5)] hover:bg-av-yellow hover:text-av-bg"
          >
            IR A LA BIBLIOTECA
          </Link>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer border border-av-magenta/50 bg-transparent p-3.75 font-display text-[9px] tracking-av text-av-magenta active:scale-97 hover:bg-av-magenta/16 hover:text-white"
          >
            CERRAR SESION
          </button>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 border border-av-cyan/25">
            <button
              type="button"
              onClick={() => setTab("login")}
              aria-pressed={!isRegister}
              className={`cursor-pointer border-none px-2 py-3.5 font-display text-[9px] tracking-av active:scale-97 ${
                isRegister ? "bg-transparent text-av-text-muted" : "bg-av-cyan text-av-bg"
              }`}
            >
              INICIAR SESION
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              aria-pressed={isRegister}
              className={`cursor-pointer border-none px-2 py-3.5 font-display text-[9px] tracking-av active:scale-97 ${
                isRegister ? "bg-av-magenta text-av-bg" : "bg-transparent text-av-text-muted"
              }`}
            >
              CREAR CUENTA
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <label className={LABEL}>
              Usuario
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="jugador_01"
                className={FIELD}
              />
            </label>

            {isRegister && (
              <label className={LABEL}>
                Correo electrónico
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className={FIELD}
                />
              </label>
            )}

            <label className={LABEL}>
              Contraseña
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                className={FIELD}
              />
            </label>

            <button
              type="submit"
              className="cursor-pointer border-none bg-av-cyan p-4 font-display text-[10px] tracking-av text-av-bg shadow-[0_0_22px_rgba(0,245,255,0.5)] active:scale-97 hover:bg-av-yellow"
            >
              {isRegister ? "CREAR MI CUENTA" : "ENTRAR AL VAULT"}
            </button>

            <Link
              href="/"
              className="border border-av-magenta/50 p-3.75 text-center font-display text-[9px] tracking-av text-av-magenta hover:bg-av-magenta/16 hover:text-white"
            >
              JUGAR COMO INVITADO
            </Link>
            <p className="text-center text-[11px] tracking-av text-av-text-faint">
              Como invitado tus puntuaciones no se guardan en el servidor.
            </p>

            <div className="flex items-center gap-3 text-[11px] tracking-av-wider text-av-line">
              <span className="h-px flex-1 bg-white/10" />O CONTINÚA CON
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                className="cursor-pointer border border-white/14 bg-av-panel px-2 py-3.5 font-display text-[8px] tracking-av text-av-text-soft active:scale-96 hover:border-av-cyan/50 hover:text-av-cyan"
              >
                GOOGLE
              </button>
              <button
                type="button"
                disabled
                className="cursor-pointer border border-white/14 bg-av-panel px-2 py-3.5 font-display text-[8px] tracking-av text-av-text-soft active:scale-96 hover:border-av-cyan/50 hover:text-av-cyan"
              >
                GITHUB
              </button>
            </div>

            <p className="mt-1 text-[11px] tracking-av text-av-line">
              Sesión simulada en este dispositivo. Conectar aquí: POST /api/auth/login · OAuth
              Google/GitHub vía Supabase.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
