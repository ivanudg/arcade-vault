"use client";

/**
 * Formulario de contacto de `/acerca-de`. Puerto del `<form>` de
 * references/templates/home-about/about.jsx, con el envío conectado a la Server
 * Action `sendContactMessage`.
 *
 * Los tres campos son controlados porque el desenlace decide qué pasa con lo
 * escrito: un envío correcto lo vacía y un error lo conserva para reintentar.
 *
 * Se valida dos veces a propósito. Aquí, para que la negativa sea inmediata y
 * no gaste una petición; y otra vez en la acción, que es una URL pública a la
 * que se puede llamar sin pasar por esta pantalla.
 */

import { useActionState, useEffect, useRef, useState } from "react";
import {
  type ContactState,
  sendContactMessage,
} from "@/app/(vault)/acerca-de/actions";
import { LIMITS } from "@/lib/about";
import { useSession } from "@/lib/session";

const LABEL =
  "font-mono text-[10px] tracking-[0.16em] text-av-text-faint uppercase";
const FIELD =
  "border border-av-line bg-av-bg px-3 font-mono text-av-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-av-text-faint focus:border-av-cyan focus:shadow-[0_0_12px_rgba(0,245,255,0.35)]";

const EMPTY = { name: "", email: "", message: "" };

export function ContactForm() {
  // El estado que devuelve la acción se lee en el paso siguiente de SPEC 03,
  // donde los desenlaces sustituyen el formulario por su terminal.
  const [, action, pending] = useActionState<ContactState, FormData>(
    sendContactMessage,
    { status: "idle" },
  );
  const { user, ready } = useSession();
  const [values, setValues] = useState(EMPTY);
  const [shake, setShake] = useState(false);

  // El prerelleno espera a montar porque la sesión vive en `localStorage`: en
  // el HTML del servidor el campo va vacío y así no hay discrepancia al
  // hidratar. Sólo se rellena una vez, y nunca encima de lo ya escrito.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !ready || !user) return;
    seeded.current = true;
    setValues((prev) => (prev.name ? prev : { ...prev, name: user.name }));
  }, [ready, user]);

  // La sacudida se apaga sola. Si llega otra antes de tiempo, el temporizador
  // anterior se cancela en la limpieza y la animación vuelve a empezar.
  useEffect(() => {
    if (!shake) return;
    const id = setTimeout(() => setShake(false), 400);
    return () => clearTimeout(id);
  }, [shake]);

  /**
   * Corta el envío si falta algo. React ejecuta esto antes que la acción del
   * formulario, así que `preventDefault()` basta para que no salga la petición.
   */
  function guard(e: React.FormEvent<HTMLFormElement>) {
    if (values.name.trim() && values.email.trim() && values.message.trim()) {
      return;
    }
    e.preventDefault();
    setShake(true);
  }

  return (
    <form
      action={action}
      onSubmit={guard}
      className={`relative border border-av-line bg-av-panel-raised p-7 ${shake ? "animate-av-shake" : ""}`}
    >
      {/* El filo interior de puntos del template: sólo adorno, así que ni
          recibe el puntero ni lo anuncia el lector de pantalla. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 border border-dashed border-av-cyan/15"
      />

      {/* El campo trampa. Fuera de la pantalla, fuera del tabulador y fuera
          del árbol de accesibilidad: sólo lo rellena quien no está mirando.
          `autoComplete="off"` evita que el navegador lo complete por su
          cuenta y acuse de bot a una persona. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        className="absolute top-[-9999px] left-[-9999px]"
      />

      <label className="mb-3 flex flex-col gap-1.5">
        <span className={LABEL}>NOMBRE</span>
        <input
          name="name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          maxLength={LIMITS.name}
          placeholder="px_kai"
          className={`h-11 ${FIELD}`}
        />
      </label>

      <label className="mb-3 flex flex-col gap-1.5">
        <span className={LABEL}>CORREO ELECTRONICO</span>
        <input
          name="email"
          type="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          maxLength={LIMITS.email}
          placeholder="jugador@vault.gg"
          className={`h-11 ${FIELD}`}
        />
      </label>

      <label className="mb-3 flex flex-col gap-1.5">
        <span className={LABEL}>MENSAJE</span>
        <textarea
          name="message"
          value={values.message}
          onChange={(e) => setValues({ ...values, message: e.target.value })}
          maxLength={LIMITS.message}
          rows={5}
          placeholder="Cuentanos que tienes en mente..."
          className={`min-h-27.5 resize-y py-3 ${FIELD}`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-1.5 w-full cursor-pointer bg-av-cyan px-8 py-5 font-display text-[12px] tracking-av-wider text-av-bg av-halo-cyan active:translate-y-0.75 disabled:cursor-progress disabled:bg-av-line disabled:shadow-none hover:bg-av-yellow disabled:hover:bg-av-line"
      >
        {pending ? "ENVIANDO..." : <>&gt; ENVIAR MENSAJE</>}
      </button>
    </form>
  );
}
