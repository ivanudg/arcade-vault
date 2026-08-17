/**
 * La política de contraseña del vault, en un solo sitio.
 *
 * La garantía real es Supabase Auth: el mínimo y las cuatro clases de carácter
 * están puestos en el panel del proyecto, y quien los incumple recibe un error
 * del servidor. Esto existe para que un alta no falle por sorpresa y para que el
 * rótulo diga **qué** falta, que es algo que la frase de Supabase no dice.
 *
 * Isomorfo y sin directiva de cliente a propósito: es TypeScript puro, sin React, sin
 * DOM y sin imports —el precedente es `lib/storage.ts`, que sólo funciona en el
 * navegador y tampoco lleva directiva—. Así el día que haya que revalidar la
 * contraseña en una Server Action, como ya hace
 * `app/(vault)/acerca-de/actions.ts` con `LIMITS` de `lib/about.ts`, el módulo
 * se importa tal cual.
 *
 * Si se toca algo de aquí hay que tocar también el panel de Supabase y su espejo
 * en `supabase/config.toml`. Que el cliente sea **más** estricto que el servidor
 * es inofensivo —rechaza lo que el servidor habría aceptado—; lo contrario
 * miente.
 */

/** El mínimo que exige Supabase Auth, espejado en `supabase/config.toml`. */
export const MIN_PASSWORD = 8;

/**
 * Los 32 símbolos que Supabase cuenta como símbolo, copiados de su charset por
 * defecto. La barra invertida es uno de ellos, y de ahí el escape.
 *
 * Se comprueba con `includes()` y **nunca** con una clase de caracteres de
 * expresión regular: dentro hay `\`, `]`, `^` y `-`, y un escape mal puesto
 * cambiaría la regla sin que nada falle.
 */
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

/**
 * Lo que se pinta bajo el campo. Va en Courier Prime, que es lo que se hereda
 * si no se declara `font-display`, así que **lleva sus tildes**.
 */
export const PASSWORD_HINT =
  "Mínimo 8 caracteres, con una minúscula, una mayúscula, una cifra y un símbolo.";

/**
 * El rótulo de «Supabase la rechazó por composición». Lo usan las dos pantallas
 * que piden una contraseña nueva, cada una desde su propio traductor de errores.
 */
export const WEAK_PASSWORD = "ANADE MAYUSCULA, MINUSCULA, CIFRA Y SIMBOLO";

/**
 * Qué le falta a una contraseña, o `null` si no le falta nada.
 *
 * Devuelve **un** rótulo y no una lista, porque el hueco de error de las dos
 * pantallas es un solo `<p role="alert">` de Press Start 2P a 9px y la
 * convención del repo es un rótulo por fallo. El orden es el de Supabase
 * —primero la longitud, después la composición—, así que lo que se dice aquí es
 * lo primero que diría el servidor.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `LA CONTRASENA NECESITA ${MIN_PASSWORD} CARACTERES`;
  }
  if (!/[a-z]/.test(password)) return "LE FALTA UNA MINUSCULA";
  if (!/[A-Z]/.test(password)) return "LE FALTA UNA MAYUSCULA";
  if (!/[0-9]/.test(password)) return "LE FALTA UNA CIFRA";
  if (![...password].some((c) => PASSWORD_SYMBOLS.includes(c))) {
    return "LE FALTA UN SIMBOLO: !@#$%&*";
  }
  return null;
}
