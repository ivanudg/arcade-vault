/**
 * Variables de entorno de Supabase.
 *
 * Es el único módulo que lee `process.env` de Supabase: un `process.env.X!`
 * repartido por el código convierte una variable ausente en un fallo silencioso
 * a mitad de una petición. Aquí falta la variable o no falta, y si falta el
 * error dice cuál.
 *
 * A diferencia de Resend en SPEC 03, sin credenciales no se finge nada: una
 * base de datos falsa devuelve datos inventados y el error asoma tres pantallas
 * más tarde.
 */

/**
 * Next sustituye `process.env.NEXT_PUBLIC_*` por su valor al compilar, y sólo
 * si la lectura es literal. Por eso cada función nombra su variable a mano en
 * vez de indexar `process.env[nombre]`: con un índice dinámico, en el navegador
 * llegaría `undefined`.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta ${name}. Cópiala de .env.example a .env.local.`);
  }
  return value;
}

/** Devuelve la URL del proyecto. Lanza si falta. */
export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Devuelve la clave pública (`sb_publishable_...`). Lanza si falta. */
export function supabasePublishableKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/**
 * Devuelve la clave secreta de servidor (`sb_secret_...`). Lanza si falta.
 *
 * Todavía no la consume nadie: se declara aquí para que el primer cliente de
 * servidor que la necesite no tenga que volver a tocar `.env.example`. Sin
 * prefijo `NEXT_PUBLIC_`, así que en el navegador siempre valdría `undefined`.
 */
export function supabaseSecretKey(): string {
  return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
}

/**
 * `true` si están la URL y la clave pública.
 *
 * La única función del módulo que no lanza: la ruta de diagnóstico necesita
 * preguntar sin explotar. No mira la clave secreta, que nadie usa aún.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
