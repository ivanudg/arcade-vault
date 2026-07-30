/**
 * Chrome de las cuatro pantallas del vault: biblioteca, ficha, salón y cuenta.
 *
 * El grupo `(vault)` no aparece en las URLs; existe sólo para que `/jugar/[id]`
 * quede fuera y pueda montar su cabecera reducida sin heredar esta ni el pie.
 */

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function VaultLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
