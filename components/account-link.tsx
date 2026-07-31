"use client";

/**
 * Botón a `/cuenta` que dice una cosa u otra según haya sesión.
 *
 * La portada tiene dos: el del hero y el de la tarjeta de precios. Ofrecer
 * «crear cuenta» a quien ya entró es un error visible, y el destino no cambia:
 * lo único que cambia es lo que promete el rótulo.
 *
 * Mientras `ready` es falso todavía no se ha leído `localStorage`, así que se
 * pinta el rótulo de invitado: es lo mismo que sirvió el servidor y no hay
 * discrepancia de hidratación. El rótulo de sesión aparece justo después.
 *
 * El aspecto lo pone quien lo usa: aquí no hay ninguna clase propia, porque los
 * dos botones se parecen a su sección, no entre sí.
 */

import Link from "next/link";
import { useSession } from "@/lib/session";

export function AccountLink({
  guest,
  member,
  className,
}: {
  /** Rótulo sin sesión iniciada. */
  guest: string;
  /** Rótulo con sesión iniciada. */
  member: string;
  className?: string;
}) {
  const { user, ready } = useSession();

  return (
    <Link href="/cuenta" className={className}>
      {ready && user ? member : guest}
    </Link>
  );
}
