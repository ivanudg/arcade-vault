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
import { type ContactState, sendContactMessage } from "@/app/(vault)/acerca-de/actions";
import { LIMITS, TERMINAL_FAIL, TERMINAL_OK } from "@/lib/about";
import { useSession } from "@/lib/session";

const LABEL = "font-mono text-[10px] tracking-[0.16em] text-av-text-faint uppercase";
const FIELD =
  "border border-av-line bg-av-bg px-3 font-mono text-av-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-av-text-faint focus:border-av-cyan focus:shadow-[0_0_12px_rgba(0,245,255,0.35)]";
/** El campo que la acción señaló: se marca en magenta hasta el próximo envío. */
const FIELD_INVALID = "border-av-magenta shadow-[0_0_12px_rgba(255,0,110,0.35)]";

const EMPTY = { name: "", email: "", message: "" };

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, {
    status: "idle",
  });
  const { user, ready } = useSession();
  const [values, setValues] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  /**
   * El desenlace que el visitante ya ha cerrado. Se guarda el objeto de estado
   * en sí: `useActionState` devuelve uno nuevo en cada envío, así que el
   * terminal siguiente vuelve a aparecer sin necesidad de limpiar nada.
   */
  const [closed, setClosed] = useState<ContactState | null>(null);

  // El prerelleno espera a montar porque la sesión vive en `localStorage`: en
  // el HTML del servidor el campo va vacío y así no hay discrepancia al
  // hidratar. Sólo se rellena una vez, y nunca encima de lo ya escrito.
  const seeded = useRef(false);
  useEffect(() => {
    // Con sesión pero sin nombre elegido no hay nada que prerrellenar: el campo
    // se queda vacío, como para un invitado.
    if (seeded.current || !ready || !user?.username) return;
    seeded.current = true;
    const username = user.username;
    setValues((prev) => (prev.name ? prev : { ...prev, name: username }));
  }, [ready, user]);

  // Lo que el cliente dejó pasar y la acción sí rechazó: misma respuesta que
  // un campo vacío, para que la negativa se lea igual venga de donde venga.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacción a la respuesta del servidor, no a un cambio de props
    if (state.status === "invalid") setShake(true);
  }, [state]);

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

  if (state.status === "sent" && closed !== state) {
    return (
      <Terminal
        tone="ok"
        lines={TERMINAL_OK}
        tail={
          <>
            &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
            <span className="animate-av-caret">_</span>
          </>
        }
        label="ENVIAR OTRO MENSAJE"
        // Se vacía todo, también el nombre de la sesión: el mensaje anterior ya
        // salió y el siguiente empieza en blanco.
        onClose={() => {
          setValues(EMPTY);
          setClosed(state);
        }}
      />
    );
  }

  if (state.status === "error" && closed !== state) {
    return (
      <Terminal
        tone="fail"
        lines={TERMINAL_FAIL.slice(0, -1)}
        tail={TERMINAL_FAIL[TERMINAL_FAIL.length - 1]}
        label="REINTENTAR"
        // Sin tocar `values`: lo escrito sigue en el formulario, que es lo
        // único que queda del mensaje cuando el envío falla.
        onClose={() => setClosed(state)}
      />
    );
  }

  const invalidField = state.status === "invalid" ? state.field : null;

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
          aria-invalid={invalidField === "name"}
          className={`h-11 ${FIELD} ${invalidField === "name" ? FIELD_INVALID : ""}`}
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
          aria-invalid={invalidField === "email"}
          className={`h-11 ${FIELD} ${invalidField === "email" ? FIELD_INVALID : ""}`}
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
          aria-invalid={invalidField === "message"}
          className={`min-h-27.5 resize-y py-3 ${FIELD} ${invalidField === "message" ? FIELD_INVALID : ""}`}
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

/**
 * El desenlace, en forma de consola. Ocupa el sitio del formulario: lo que se
 * escribió ya no se puede corregir, sólo repetir.
 *
 * Las tres bolitas del template son las de macOS (rojo, ámbar, verde); aquí van
 * en los tres neones del vault, que es de lo que está hecho el resto.
 */
function Terminal({
  tone,
  lines,
  tail,
  label,
  onClose,
}: {
  tone: "ok" | "fail";
  /** Las líneas de registro, en gris. */
  lines: readonly string[];
  /** El remate: el que dice cómo acabó. */
  tail: React.ReactNode;
  label: string;
  onClose: () => void;
}) {
  const ok = tone === "ok";

  return (
    <div
      className={`overflow-hidden border bg-black ${
        ok
          ? "border-av-cyan shadow-[0_0_22px_rgba(0,245,255,0.25)]"
          : "border-av-magenta shadow-[0_0_22px_rgba(255,0,110,0.25)]"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-av-line bg-av-bg px-3 py-2">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-av-magenta" />
        <span aria-hidden="true" className="size-2.5 rounded-full bg-av-yellow" />
        <span aria-hidden="true" className="size-2.5 rounded-full bg-av-cyan" />
        <span className="ml-2 font-display text-[9px] tracking-[0.14em] text-av-text-faint">
          VAULT-OS // TERMINAL
        </span>
      </div>

      {/* `aria-live`: el terminal sustituye al formulario sin mover el foco,
          así que quien no ve la pantalla se entera igual de cómo acabó. */}
      <div
        aria-live="polite"
        className="px-4.5 pt-4.5 pb-5.5 text-[13px] leading-[1.8] wrap-break-word"
      >
        <p>
          <span className="mr-2 text-av-cyan">vault@arcade:~$</span>
          ./send_message --to=team
        </p>

        {lines.map((line) => (
          <p key={line} className="text-av-text-dim">
            {line}
          </p>
        ))}

        <p
          className={`mt-3 font-bold ${
            ok
              ? "text-av-yellow [text-shadow:0_0_6px_rgba(245,255,0,0.45)]"
              : "text-av-magenta [text-shadow:0_0_6px_rgba(255,0,110,0.45)]"
          }`}
        >
          {tail}
        </p>

        <button
          type="button"
          onClick={onClose}
          className={`mt-4.5 cursor-pointer border px-7 py-4 font-display text-[10px] tracking-av active:scale-97 ${
            ok
              ? "border-av-cyan/50 text-av-cyan hover:bg-av-cyan/12 hover:text-white"
              : "border-av-magenta/50 text-av-magenta hover:bg-av-magenta/16 hover:text-white"
          }`}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
