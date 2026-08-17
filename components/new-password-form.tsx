"use client";

/**
 * Escribir una contraseña nueva.
 *
 * Aquí deja el enlace de recuperación, que llega a `/auth/confirmar` con
 * `type=recovery` y abre sesión de verdad antes de rebotar a esta pantalla. Por
 * eso **no se pide la contraseña anterior**: quien la olvidó no puede
 * escribirla, y quien llega hasta aquí ya tiene una sesión válida en este
 * navegador. Es lo que hace `updateUser()`.
 *
 * Y por eso mismo sirve igual con una sesión normal: de hecho ésta **es** la
 * pantalla de cambiar la contraseña, y no tenerla obligaría a pedirse un correo
 * a uno mismo para poder cambiarla.
 *
 * Habla con Supabase desde el navegador, como `AuthPanel` y por lo mismo:
 * `@supabase/ssr` escribe ahí las cookies que después lee el servidor.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PASSWORD_HINT, passwordProblem, WEAK_PASSWORD } from "@/lib/password";
import { createClient } from "@/lib/supabase/client";

const FIELD =
  "border border-av-cyan/30 bg-av-void p-3.25 text-[14px] text-av-text-bright outline-none focus:border-av-cyan focus:shadow-[0_0_18px_rgba(0,245,255,0.45)] disabled:opacity-55";
const LABEL = "flex flex-col gap-2 text-[12px] tracking-av text-av-text-muted";

export function NewPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);

    // Las dos comprobaciones se hacen aquí y no al volver: son de forma, y
    // gastar una llamada de red para que Supabase diga lo mismo es peor. La
    // primera es la misma regla que aplica el registro, y sale del mismo módulo:
    // aquí no hay login que proteger, así que corre siempre.
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== repeat) {
      setError("LAS DOS CONTRASENAS NO COINCIDEN");
      return;
    }

    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        // Se discrimina por `error.code` y no por la frase: aquí el error viene
        // siempre de `updateUser()`, así que siempre es un `AuthError` y trae
        // código. Mirar si el mensaje incluye `different` funcionaba hasta el
        // día que Supabase reescriba la frase.
        //
        // No se comparte el `readable()` de `AuthPanel` a propósito: esa función
        // no es un diccionario sino un **orden** calibrado para los flujos del
        // acceso, y aquí seis de sus ramas son inalcanzables. Lo que las dos
        // pantallas comparten es el vocabulario, que sale de `lib/password.ts`.
        if (error.code === "same_password") {
          setError("ESA YA ERA TU CONTRASENA. ESCRIBE OTRA");
        } else if (error.code === "weak_password") {
          setError(WEAK_PASSWORD);
        } else {
          setError("NO SE HA PODIDO. INTENTALO OTRA VEZ");
        }
        return;
      }

      // Se sale a `/cuenta` y con la sesión abierta: ya es válida, y echarla
      // para pedir la contraseña recién escrita es trabajo sin ganancia.
      // `replace` y no `push`: volver atrás a este formulario no lleva a nada.
      router.replace("/cuenta");
      router.refresh();
    } catch (cause) {
      console.error("[cuenta] la contraseña no se pudo cambiar:", cause);
      setError("NO SE HA PODIDO. INTENTALO OTRA VEZ");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-[min(100%,440px)] flex-col gap-4 border border-av-cyan/28 bg-[rgba(13,15,22,0.92)] p-[clamp(22px,4vw,36px)] shadow-[0_0_44px_rgba(0,245,255,0.12)]"
    >
      <div className="text-center font-display text-[15px] tracking-av text-av-cyan [text-shadow:0_0_12px_rgba(0,245,255,0.8)]">
        ARCADE
        <span className="text-av-magenta [text-shadow:0_0_12px_rgba(255,0,110,0.8)]"> VAULT</span>
      </div>

      <div className="grid place-items-center gap-3 border border-av-cyan/35 bg-av-void p-5 text-center">
        <span className="font-display text-[11px] tracking-av text-av-cyan [text-shadow:0_0_12px_rgba(0,245,255,0.7)]">
          CONTRASENA NUEVA
        </span>
        <span className="text-[12px] tracking-av text-av-text-dim">
          Escríbela dos veces. La sesión se queda abierta al terminar.
        </span>
      </div>

      <label className={LABEL}>
        Contraseña nueva
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-describedby="password-hint"
          required
          autoFocus
          disabled={sending}
          className={FIELD}
        />
      </label>

      {/* Hermano del `<label>` y no hijo: dentro pasaría a formar parte del
          nombre accesible del campo. Aquí sin condición, que las dos veces que
          se llega a esta pantalla es para escribir una contraseña nueva. */}
      <p id="password-hint" className="-mt-2 text-[11px] leading-relaxed text-av-text-faint">
        {PASSWORD_HINT}
      </p>

      <label className={LABEL}>
        Repite la contraseña
        <input
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          disabled={sending}
          className={FIELD}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="border border-av-magenta/45 bg-av-magenta/10 p-3 text-center font-display text-[9px] leading-relaxed tracking-av text-av-magenta"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="cursor-pointer border-none bg-av-cyan p-4 font-display text-[10px] tracking-av text-av-bg shadow-[0_0_22px_rgba(0,245,255,0.5)] active:scale-97 hover:bg-av-yellow disabled:cursor-wait disabled:opacity-60"
      >
        {sending ? "GUARDANDO..." : "GUARDAR CONTRASENA"}
      </button>
    </form>
  );
}
