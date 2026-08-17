/**
 * Escribir una contraseña nueva. Aquí deja el enlace de recuperación.
 *
 * La comprobación de sesión se hace en el servidor y no en el formulario: sin
 * ella `updateUser()` no tiene a quién actualizar, y enseñar unos campos que no
 * pueden llevar a nada es peor que decirlo de vuelta en `/cuenta`.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/new-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "CONTRASENA NUEVA",
  description: "Escribe una contraseña nueva para tu cuenta del vault.",
};

/** Lee las cookies de la sesión, así que no se puede prerenderizar. */
export const dynamic = "force-dynamic";

export default async function NewPasswordPage() {
  // Sin credenciales el sitio sigue construyendo, como en todas las demás: se
  // sale a `/cuenta`, donde el panel ya cuenta lo que pasa.
  if (!isSupabaseConfigured()) redirect("/cuenta?error=recuperacion");

  const supabase = await createClient();
  // `getUser()` y no `getSession()`: valida el token contra Supabase en vez de
  // creerse la cookie, que es lo que hay que hacer antes de dejar cambiar algo.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/cuenta?error=recuperacion");

  return (
    <main className="flex-1 px-[clamp(14px,3vw,40px)] pt-[clamp(22px,4vw,44px)] pb-22.5">
      <section className="mx-auto grid w-full max-w-310 place-items-center py-[clamp(10px,4vw,40px)] animate-av-fade">
        <NewPasswordForm />
      </section>
    </main>
  );
}
