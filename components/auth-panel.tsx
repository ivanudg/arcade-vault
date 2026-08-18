"use client";

/**
 * Registro y acceso de verdad. Puerto de references/templates/cuenta.dc.html.
 *
 * Hasta SPEC 15 este panel escribía un nombre en `localStorage` y descartaba la
 * contraseña sin mirarla. Ahora habla con Supabase Auth **desde el navegador**:
 * `@supabase/ssr` escribe ahí las cookies que después lee el servidor, y el
 * `onAuthStateChange` de `lib/session.tsx` mantiene el contexto al día sin
 * recargar. Con Server Actions habría que refrescar a mano.
 *
 * Por eso entrar vive aquí y no en el contexto: es una llamada de red que puede
 * fallar de cuatro formas distintas —nombre cogido, correo repetido, contraseña
 * mala, correo sin confirmar— y cada una tiene que poder decirse en pantalla.
 *
 * Con sesión activa el formulario se sustituye por el perfil —o, desde SPEC 16,
 * por el formulario de nombre de jugador, que es como llega una cuenta de Google
 * o de GitHub: sesión de verdad y sin fila en `profiles`—. El orden de los
 * bloques **es** la lógica: «sesión con perfil» va antes que «revisa tu correo»
 * para que quien confirma su correo y vuelve con sesión vea el perfil y no un
 * aviso viejo.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MIN_PASSWORD, PASSWORD_HINT, passwordProblem, WEAK_PASSWORD } from "@/lib/password";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

const FIELD =
  "border border-av-cyan/30 bg-av-void p-3.25 text-[14px] text-av-text-bright outline-none focus:border-av-cyan focus:shadow-[0_0_18px_rgba(0,245,255,0.45)] disabled:opacity-55";
const LABEL = "flex flex-col gap-2 text-[12px] tracking-av-wide text-av-text-muted";

/** Lo que admite `profiles.username_format`: mayúsculas, dígitos y `_`. */
const USERNAME = /^[A-Z0-9_]{3,12}$/;

/** Los dos proveedores de SPEC 16. Cada uno más es otra app externa. */
const PROVIDERS = [
  { id: "google", label: "GOOGLE" },
  { id: "github", label: "GITHUB" },
] as const;

type OAuthProvider = (typeof PROVIDERS)[number]["id"];

/** Los tres bloques que se pintan cuando no hay sesión. */
type PanelMode = "login" | "register" | "recuperar";

/**
 * Traduce el error de Supabase al rótulo que se pinta.
 *
 * Todo lo que llega en inglés y sin acentos: el aviso va en Press Start 2P, que
 * no tiene glifos acentuados. Lo que no se reconoce sale como fallo genérico,
 * porque un mensaje de la librería en pantalla no lo entiende nadie.
 */
function readable(message: string): string {
  const m = message.toLowerCase();
  // El trigger revienta contra el `unique` de `profiles` cuando dos jugadores
  // piden el mismo nombre a la vez. Supabase lo envuelve en un error opaco, y
  // aquí se dice lo mismo que dice la comprobación previa.
  if (m.includes("database error")) return "ESE NOMBRE YA ESTA COGIDO";
  if (m.includes("invalid login credentials")) return "CORREO O CONTRASENA INCORRECTOS";
  if (m.includes("email not confirmed")) return "CONFIRMA TU CORREO ANTES DE ENTRAR";
  if (m.includes("already registered")) return "ESE CORREO YA ESTA REGISTRADO";
  // La cuota va **antes** que las dos de abajo: el mensaje de Supabase es
  // `email rate limit exceeded`, así que la comprobación de `email` lo cazaba
  // primero y salía ESE CORREO NO VALE por un correo que estaba perfecto. Con
  // dos flujos de correo desde SPEC 16 se choca contra ella mucho más.
  if (m.includes("rate limit") || m.includes("too many"))
    return "DEMASIADOS INTENTOS. ESPERA UN POCO";
  // Composición **antes** que longitud, y por el mismo motivo que la cuota: las
  // dos frases que Supabase manda por contraseña débil llevan la palabra
  // `password`, así que la de abajo cazaba también ésta y diría NECESITA 8
  // CARACTERES de una contraseña de doce a la que sólo le falta un símbolo. Se
  // discrimina por este trozo porque es lo único presente en la frase de
  // composición y ausente en la de longitud.
  if (m.includes("at least one character")) return WEAK_PASSWORD;
  if (m.includes("password")) return `LA CONTRASENA NECESITA ${MIN_PASSWORD} CARACTERES`;
  if (m.includes("email")) return "ESE CORREO NO VALE";
  return "NO SE HA PODIDO. INTENTALO OTRA VEZ";
}

export function AuthPanel({
  /** Aviso con el que se llega de fuera, hoy sólo el del enlace caducado. */
  notice,
}: {
  notice?: string;
}) {
  const { user, ready, logout, refreshProfile } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<PanelMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [sending, setSending] = useState(false);
  // El aviso de fuera es el primer error de la pantalla, y el primer intento
  // propio lo sustituye: quien vuelve a probar ya no necesita que le repitan
  // que el enlace anterior no valía.
  const [error, setError] = useState<string | null>(notice ?? null);
  /** Correo al que se acaba de mandar un enlace. `null` mientras no. */
  const [sent, setSent] = useState<string | null>(null);

  const isRegister = mode === "register";
  const isRecover = mode === "recuperar";

  /** Cambiar de bloque no arrastra el error ni el aviso del anterior. */
  function pick(next: PanelMode) {
    setMode(next);
    setError(null);
    setSent(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);

    const username = name.toUpperCase().slice(0, 12);

    // Las dos comprobaciones son **del registro y sólo del registro**, y van
    // juntas para que eso sea estructural y no un detalle de una condición. Una
    // cuenta anterior a SPEC 18 tiene seis caracteres y sigue siendo válida para
    // Supabase, que la deja entrar y avisa por separado con `data.weakPassword`:
    // exigirle aquí la regla nueva la dejaría fuera de su propia cuenta, y la
    // dejaría fuera nuestro `if` antes de preguntar.
    if (isRegister) {
      if (!USERNAME.test(username)) {
        setError("EL NOMBRE VA DE 3 A 12: LETRAS, CIFRAS Y _");
        return;
      }
      const problem = passwordProblem(password);
      if (problem) {
        setError(problem);
        return;
      }
    }

    setSending(true);
    try {
      const supabase = createClient();

      if (!isRegister) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(readable(error.message));
          return;
        }
        // Los Server Components que leen el marcador se pintaron como invitado;
        // sin esto habría que recargar a mano para que vean la sesión.
        router.refresh();
        return;
      }

      // Cortesía antes de `signUp()`: la garantía real es el `unique` de
      // `profiles`, pero un error del trigger llega ilegible y esto cubre todo
      // menos una carrera de milisegundos.
      //
      // Desde SPEC 19 se pregunta por RPC y no leyendo la tabla: `profiles` ya
      // no es pública, y un booleano por candidato dice lo mismo sin entregar el
      // censo del vault.
      const { data: libre, error: lookup } = await supabase.rpc("username_libre", {
        candidato: username,
      });
      if (lookup) {
        setError(readable(lookup.message));
        return;
      }
      if (!libre) {
        setError("ESE NOMBRE YA ESTA COGIDO");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // De aquí lo saca el trigger `handle_new_user()` para crear el perfil.
          data: { username },
          emailRedirectTo: `${window.location.origin}/auth/confirmar`,
        },
      });
      if (error) {
        setError(readable(error.message));
        return;
      }
      // Con un correo ya registrado, Supabase responde éxito con la lista de
      // identidades vacía —no confirma ni desmiente que exista—. Aquí sí se
      // dice, porque quien lo escribió es quien tiene la cuenta.
      if (data.user && data.user.identities?.length === 0) {
        setError("ESE CORREO YA ESTA REGISTRADO");
        return;
      }

      setSent(email);
      setName("");
      setPassword("");
    } catch (cause) {
      // Credenciales ausentes o red caída: `createClient()` lanza, y el panel no
      // puede quedarse colgado en el estado de envío.
      console.error("[cuenta] el envío falló:", cause);
      setError("NO SE HA PODIDO. INTENTALO OTRA VEZ");
    } finally {
      setSending(false);
    }
  }

  /**
   * Pedir el enlace para escribir una contraseña nueva.
   *
   * Sale al mismo `/auth/confirmar` que el correo de registro, porque el canje
   * **es** el mismo `verifyOtp()`; lo que cambia es a dónde se sale después, y
   * eso lo decide el `type` del enlace.
   *
   * El aviso es el mismo exista o no ese correo, y no por descuido:
   * `resetPasswordForEmail()` responde igual a propósito, y distinguirlo aquí
   * convertiría el formulario en un detector de qué direcciones tienen cuenta.
   */
  async function sendRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirmar`,
      });
      if (error) {
        setError(readable(error.message));
        return;
      }
      setSent(email);
    } catch (cause) {
      console.error("[cuenta] el enlace de recuperación no salió:", cause);
      setError("NO SE HA PODIDO. INTENTALO OTRA VEZ");
    } finally {
      setSending(false);
    }
  }

  /**
   * Salir hacia Google o GitHub.
   *
   * No hay nada que esperar aquí: si la llamada sale bien, el navegador se va a
   * la pantalla del proveedor y vuelve a `/auth/callback`, que es quien canjea
   * el código. `sending` se queda puesto a propósito —la pestaña está a punto de
   * navegar— y sólo se suelta si la llamada falla, que es cuando el panel sigue
   * en pantalla y tiene que poder decirlo.
   */
  async function enterWith(provider: OAuthProvider) {
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // GitHub no da el correo de quien lo tiene en privado si no se pide.
          // Se pide desde aquí y no en el panel de Supabase para que quede en el
          // repo, que es donde se lee por qué.
          scopes: provider === "github" ? "user:email" : undefined,
        },
      });
      if (error) {
        setError(readable(error.message));
        setSending(false);
      }
    } catch (cause) {
      console.error("[cuenta] no se pudo salir hacia el proveedor:", cause);
      setError("NO SE HA PODIDO. INTENTALO OTRA VEZ");
      setSending(false);
    }
  }

  /**
   * Elegir el nombre de una cuenta que todavía no lo tiene.
   *
   * Es el `insert` que la política `"crear mi perfil"` permite, y el único que
   * la app hace sobre `profiles`. La comprobación previa es cortesía, igual que
   * en el registro: quien decide de verdad es el `unique` de la columna.
   */
  async function chooseName(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !user) return;
    setError(null);

    const username = name.toUpperCase().slice(0, 12);

    if (!USERNAME.test(username)) {
      setError("EL NOMBRE VA DE 3 A 12: LETRAS, CIFRAS Y _");
      return;
    }

    setSending(true);
    try {
      const supabase = createClient();

      const { data: libre, error: lookup } = await supabase.rpc("username_libre", {
        candidato: username,
      });
      if (lookup) {
        setError(readable(lookup.message));
        return;
      }
      if (!libre) {
        setError("ESE NOMBRE YA ESTA COGIDO");
        return;
      }

      const { error } = await supabase.from("profiles").insert({ id: user.id, username });
      if (error) {
        // `23505` es el choque contra el `unique`: dos personas eligiendo el
        // mismo nombre en la misma fracción de segundo, que es lo que la
        // comprobación de arriba no puede cubrir.
        setError(error.code === "23505" ? "ESE NOMBRE YA ESTA COGIDO" : readable(error.message));
        return;
      }

      // La fila la ha escrito el navegador, así que Supabase no emite ningún
      // evento de auth: el contexto hay que avisarlo a mano. `router.refresh()`
      // es para los Server Components, que pintaron esta pantalla sin nombre.
      await refreshProfile();
      router.refresh();
      setName("");
    } catch (cause) {
      console.error("[cuenta] el nombre no se pudo guardar:", cause);
      setError("NO SE HA PODIDO. INTENTALO OTRA VEZ");
    } finally {
      setSending(false);
    }
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

      {/* Nada de estado de sesión hasta que conteste Supabase: si no, a quien ya
          tiene sesión le parpadearía el formulario antes del perfil. */}
      {!ready ? null : user?.username ? (
        <div className="flex flex-col gap-4 text-center">
          <div className="grid place-items-center gap-3 border border-av-magenta/35 bg-av-void p-5">
            <div className="grid size-13 place-items-center bg-av-magenta font-display text-[16px] text-av-bg shadow-[0_0_18px_rgba(255,0,110,0.6)]">
              {user.username.slice(0, 1)}
            </div>
            <span className="font-display text-[11px] tracking-av text-av-text-bright">
              {user.username}
            </span>
            <span className="text-[12px] tracking-av text-av-text-dim">{user.email}</span>
            <span className="text-[12px] tracking-av text-av-text-faint">
              Tus marcas se firman con este nombre en cualquier dispositivo.
            </span>
          </div>
          <Link
            href="/biblioteca"
            className="bg-av-cyan p-4 font-display text-[10px] tracking-av text-av-bg shadow-[0_0_22px_rgba(0,245,255,0.5)] hover:bg-av-yellow hover:text-av-bg"
          >
            IR A LA BIBLIOTECA
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="cursor-pointer border border-av-magenta/50 bg-transparent p-3.75 font-display text-[9px] tracking-av text-av-magenta active:scale-97 hover:bg-av-magenta/16 hover:text-white"
          >
            CERRAR SESION
          </button>
        </div>
      ) : user ? (
        /* Hay sesión de verdad y lo que falta es el nombre: así nace una cuenta
           de Google o de GitHub, que no traen ninguno. El acento es el amarillo
           con el que la cabecera dice ELIGE NOMBRE —queda algo por hacer—, y no
           el magenta de los errores: aquí no ha fallado nada. */
        <form onSubmit={chooseName} className="flex flex-col gap-4">
          <div className="grid place-items-center gap-3 border border-av-yellow/35 bg-av-void p-5 text-center">
            <span className="font-display text-[11px] tracking-av text-av-yellow [text-shadow:0_0_12px_rgba(245,255,0,0.7)]">
              ELIGE TU NOMBRE
            </span>
            <span className="text-[12px] tracking-av text-av-text-dim">
              Es con el que firmas tus marcas en el salón. Se elige una vez y no se puede cambiar.
            </span>
          </div>

          <label className={LABEL}>
            Nombre de jugador
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="jugador_01"
              autoComplete="username"
              maxLength={12}
              autoFocus
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
            {sending ? "GUARDANDO..." : "GUARDAR NOMBRE"}
          </button>

          <p className="text-center text-[11px] tracking-av text-av-text-faint">
            Hasta que lo elijas, tus marcas entran firmadas como INVITADO.
          </p>
        </form>
      ) : sent ? (
        <div className="flex flex-col gap-4 text-center">
          <div className="grid place-items-center gap-3 border border-av-cyan/35 bg-av-void p-5">
            <span className="font-display text-[11px] tracking-av text-av-cyan [text-shadow:0_0_12px_rgba(0,245,255,0.7)]">
              REVISA TU CORREO
            </span>
            <span className="text-[12px] tracking-av text-av-text-dim">
              {isRecover
                ? `Si ${sent} tiene cuenta aquí, le hemos enviado un enlace para escribir una contraseña nueva.`
                : `Hemos enviado el enlace de confirmación a ${sent}. La cuenta no entra hasta que lo pulses.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => pick("login")}
            className="cursor-pointer border border-av-cyan/45 bg-transparent p-3.75 font-display text-[9px] tracking-av text-av-cyan active:scale-97 hover:bg-av-cyan/16 hover:text-white"
          >
            VOLVER AL ACCESO
          </button>
        </div>
      ) : isRecover ? (
        <form onSubmit={sendRecovery} className="flex flex-col gap-4">
          <div className="grid place-items-center gap-3 border border-av-cyan/35 bg-av-void p-5 text-center">
            <span className="font-display text-[11px] tracking-av text-av-cyan [text-shadow:0_0_12px_rgba(0,245,255,0.7)]">
              RECUPERAR ACCESO
            </span>
            <span className="text-[12px] tracking-av text-av-text-dim">
              Escribe tu correo y te enviamos un enlace para poner una contraseña nueva.
            </span>
          </div>

          <label className={LABEL}>
            Correo electrónico
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              type="email"
              autoComplete="email"
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
            {sending ? "ENVIANDO..." : "ENVIAR ENLACE"}
          </button>

          <button
            type="button"
            onClick={() => pick("login")}
            className="cursor-pointer border border-av-magenta/50 bg-transparent p-3.75 font-display text-[9px] tracking-av text-av-magenta active:scale-97 hover:bg-av-magenta/16 hover:text-white"
          >
            VOLVER AL ACCESO
          </button>
        </form>
      ) : (
        <div>
          <div className="grid grid-cols-2 border border-av-cyan/25">
            <button
              type="button"
              onClick={() => pick("login")}
              aria-pressed={!isRegister}
              className={`cursor-pointer border-none px-2 py-3.5 font-display text-[9px] tracking-av active:scale-97 ${
                isRegister ? "bg-transparent text-av-text-muted" : "bg-av-cyan text-av-bg"
              }`}
            >
              INICIAR SESION
            </button>
            <button
              type="button"
              onClick={() => pick("register")}
              aria-pressed={isRegister}
              className={`cursor-pointer border-none px-2 py-3.5 font-display text-[9px] tracking-av active:scale-97 ${
                isRegister ? "bg-av-magenta text-av-bg" : "bg-transparent text-av-text-muted"
              }`}
            >
              CREAR CUENTA
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {isRegister && (
              <label className={LABEL}>
                Usuario
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="jugador_01"
                  autoComplete="username"
                  maxLength={12}
                  disabled={sending}
                  className={FIELD}
                />
              </label>
            )}

            <label className={LABEL}>
              Correo electrónico
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                type="email"
                autoComplete="email"
                required
                disabled={sending}
                className={FIELD}
              />
            </label>

            <label className={LABEL}>
              Contraseña
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
                aria-describedby={isRegister ? "password-hint" : undefined}
                required
                disabled={sending}
                className={FIELD}
              />
            </label>

            {/* Hermano del `<label>` y no hijo: dentro pasaría a formar parte del
                nombre accesible del campo y un lector de pantalla anunciaría
                «Contraseña Mínimo 8 caracteres con una minúscula…». Sólo en el
                registro, porque al entrar la regla no se aplica. */}
            {isRegister && (
              <p
                id="password-hint"
                className="-mt-2 text-[11px] leading-relaxed text-av-text-faint"
              >
                {PASSWORD_HINT}
              </p>
            )}

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
              {sending ? "ENVIANDO..." : isRegister ? "CREAR MI CUENTA" : "ENTRAR AL VAULT"}
            </button>

            {/* Sólo bajo el acceso: en el registro no hay contraseña que haber
                olvidado todavía. */}
            {!isRegister && (
              <button
                type="button"
                onClick={() => pick("recuperar")}
                className="cursor-pointer bg-transparent font-display text-[9px] tracking-av text-av-text-muted underline underline-offset-4 hover:text-av-cyan"
              >
                OLVIDASTE TU CONTRASENA?
              </button>
            )}

            <Link
              href="/"
              className="border border-av-magenta/50 p-3.75 text-center font-display text-[9px] tracking-av text-av-magenta hover:bg-av-magenta/16 hover:text-white"
            >
              JUGAR COMO INVITADO
            </Link>
            <p className="text-center text-[11px] tracking-av text-av-text-faint">
              Como invitado tus marcas se firman como INVITADO y sólo se reconocen en este
              navegador.
            </p>

            <div className="flex items-center gap-3 text-[11px] tracking-av-wider text-av-line">
              <span className="h-px flex-1 bg-white/10" />O CONTINÚA CON
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void enterWith(p.id)}
                  disabled={sending}
                  className="cursor-pointer border border-white/14 bg-av-panel px-2 py-3.5 font-display text-[8px] tracking-av text-av-text-soft active:scale-97 hover:border-av-cyan/60 hover:text-av-cyan disabled:cursor-wait disabled:opacity-45"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <p className="mt-1 text-center text-[11px] tracking-av text-av-line">
              Con Google o GitHub eliges tu nombre de jugador al entrar.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
