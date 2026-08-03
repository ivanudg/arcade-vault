"use server";

/**
 * Envío del formulario de contacto de `/acerca-de`.
 *
 * La acción vuelve a validar lo que el formulario ya comprobó, y no por
 * desconfianza del cliente: una Server Action es una URL pública que responde
 * a cualquier POST, se llame o no desde la pantalla.
 *
 * Sin `RESEND_API_KEY` el envío se finge: se registra en la consola del
 * servidor con un aviso explícito y se devuelve éxito, para que el repo se
 * pueda clonar y demostrar sin cuenta de Resend. Es una decisión consciente de
 * SPEC 03: si en producción falta la variable, el mensaje se pierde en
 * silencio y sólo lo delata este registro.
 */

import { LIMITS } from "@/lib/about";

/** Lo que devuelve la acción; es el estado de `useActionState`. */
export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; field: "name" | "email" | "message" }
  | { status: "sent"; name: string }
  | { status: "error" };

/**
 * `algo@algo.dominio`, sin biblioteca de esquemas: tres campos no justifican
 * una dependencia. De paso cierra la inyección de cabeceras, porque `\s`
 * descarta espacios y saltos de línea antes de que el correo llegue a
 * `replyTo`.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lo que llega de un `FormData` puede ser un archivo o no venir; aquí no. */
function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendContactMessage(
  prev: ContactState,
  data: FormData,
): Promise<ContactState> {
  const name = field(data, "name");

  // El campo trampa: invisible y fuera del tabulador, así que sólo lo rellena
  // quien no mira la pantalla. Se responde éxito a propósito —un bot que
  // recibe error reintenta; uno que se cree atendido, no.
  if (field(data, "website")) {
    return { status: "sent", name };
  }

  const email = field(data, "email");
  const message = field(data, "message");

  // Sale el primero que falla, en el orden en que se leen los campos.
  if (!name || name.length > LIMITS.name) {
    return { status: "invalid", field: "name" };
  }
  if (!email || email.length > LIMITS.email || !EMAIL.test(email)) {
    return { status: "invalid", field: "email" };
  }
  if (!message || message.length > LIMITS.message) {
    return { status: "invalid", field: "message" };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[acerca-de] Sin RESEND_API_KEY: el mensaje NO se envió.\n` +
        `  De: ${name} <${email}>\n` +
        `  Mensaje: ${message}`,
    );
    return { status: "sent", name };
  }

  // Paso 9 de SPEC 03: aquí entra la llamada a Resend. Hasta entonces tener
  // clave se comporta igual que no tenerla, sólo que el aviso lo dice.
  console.warn(
    `[acerca-de] Envío todavía sin conectar: el mensaje NO salió.\n` +
      `  De: ${name} <${email}>\n` +
      `  Mensaje: ${message}`,
  );

  return { status: "sent", name };
}
