/**
 * Pantalla 404 de los `notFound()` que lanzan las páginas del grupo.
 *
 * Hace falta desde SPEC 17, y no antes: hasta entonces esa rama era
 * inalcanzable. `/juego/[id]` declara `dynamicParams = false` sobre una lista
 * cerrada, así que un id inventado lo rechazaba el enrutador sin ejecutar la
 * página, y un id de la lista siempre tenía máquina. Ahora que el catálogo lo
 * manda `public.games`, un id que existe en el código puede no tener fila —o
 * tenerla en `playable = false`— y la página sí llama a `notFound()`.
 *
 * Sin este archivo, ese 404 subiría al `not-found` de la raíz, que monta
 * `SiteHeader` y `SiteFooter` por su cuenta, y se pintarían **dos veces**:
 * una las del layout de `(vault)` y otra las suyas. Aquí sólo va el cuerpo,
 * porque la cabecera y el pie ya los pone el layout del grupo.
 */

import { NotFoundBody } from "@/components/not-found-body";

export default function VaultNotFound() {
  return <NotFoundBody />;
}
