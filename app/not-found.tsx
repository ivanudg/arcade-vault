/**
 * Pantalla 404 de las URLs que no corresponden a ninguna ruta.
 *
 * Monta la cabecera y el pie por su cuenta: vive en la raíz de `app/`, fuera
 * del grupo `(vault)`, porque un `not-found` dentro de un grupo no atiende las
 * URLs que no corresponden a ninguna ruta. Su hermano de `app/(vault)/` sí las
 * hereda del layout del grupo, y por eso el cuerpo vive aparte.
 */

import { NotFoundBody } from "@/components/not-found-body";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundBody />
      <SiteFooter />
    </>
  );
}
