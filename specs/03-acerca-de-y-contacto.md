# SPEC 03 — Acerca de y formulario de contacto

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-08-01
> **Objetivo:** Portar `references/templates/home-about/about.jsx` a `/acerca-de` y hacer que su formulario envíe un correo real al equipo con Resend desde una Server Action.

## Alcance

**Dentro:**

- Ruta nueva `app/(vault)/acerca-de/page.tsx` con las dos secciones del template: «Acerca de» y «Contacto», separadas por la banda de píxeles parpadeantes.
- Sección «Acerca de»: kicker `>> ACERCA DE`, titular `ACERCA DE ARCADE VAULT`, párrafo de misión y las tres tarjetas destacadas con sus iconos de píxel (`HEART`, `BROWSER`, `PLANT`), en magenta, cian y ámbar.
- Banda divisoria: dos reglas degradadas en magenta con veinticuatro píxeles parpadeando escalonados entre cian, magenta y amarillo.
- Sección «Contacto» a dos columnas: a la izquierda kicker `>> CONTACTO`, titular `CONTACTANOS`, subtítulo y los tres avisos con LED (cian, amarillo y magenta); a la derecha el formulario. En pantallas estrechas se apilan.
- Formulario de tres campos (`NOMBRE`, `CORREO ELECTRONICO`, `MENSAJE`) con el marco punteado interior del template y la sacudida cuando falta algo.
- Campo trampa oculto contra bots, fuera del orden de tabulación y del árbol de accesibilidad.
- Prerelleno editable del campo `NOMBRE` con `user.name` cuando hay sesión.
- Cuatro estados: reposo, enviando (botón deshabilitado con `ENVIANDO...`), éxito y error.
- Terminal de éxito `VAULT-OS // TERMINAL` en cian, con la línea final en amarillo y el botón `ENVIAR OTRO MENSAJE` que vacía el formulario.
- Terminal de error en magenta, con `[ERR] Transmision rechazada` y un botón `REINTENTAR` que devuelve el formulario con lo escrito intacto.
- Server Action `sendContactMessage` en `app/(vault)/acerca-de/actions.ts`: valida los tres campos, el correo y los topes de longitud, y envía con Resend a `ivandg1909@gmail.com` desde `onboarding@resend.dev`, con el correo del visitante en `replyTo`.
- Sin `RESEND_API_KEY`, la acción finge el envío, lo registra en la consola del servidor y devuelve éxito, para que el repo se pueda clonar y construir sin cuenta de Resend.
- Dependencia nueva `resend` en `package.json` y `.env.example` con `RESEND_API_KEY=`.
- Textos y datos en `lib/about.ts`, igual que `lib/landing.ts`.
- Cuarta sección `Acerca de` en la cabecera y en el cajón móvil, subrayada en ámbar.
- Remate propio en `site-footer.tsx` y `metadata` de la pantalla.

**Fuera de alcance (para futuras specs):**

- Correo de acuse al visitante: solo se envía el mensaje al equipo.
- Dominio propio verificado en Resend. Con `onboarding@resend.dev`, Resend solo entrega a la dirección dueña de la cuenta; funciona porque el destino es esa misma dirección, y cambiar de remitente exige verificar un dominio.
- Persistir los mensajes enviados: no hay base de datos ni registro; si el correo no sale, el mensaje se pierde y así se le dice al visitante.
- Límite por IP o cualquier defensa con estado: no sobrevive a un despliegue sin servidor.
- Adjuntos, captcha, plantilla HTML de correo (el mensaje va en texto plano) y biblioteca de validación (`zod` u otra).
- El verde `#00ff88` y los tres colores de las bolitas del terminal (`#ff5f56`, `#ffbd2e`, `#27c93f`): quedan descartados como en SPEC 02.
- Cualquier cambio en `/`, `/biblioteca`, `/salon`, `/cuenta`, `/juego/[id]` y `/jugar/[id]` que no sea añadir el enlace de navegación.

## Modelo de datos

No hay persistencia nueva: nada se guarda ni en el navegador ni en el servidor. Lo que sí aparecen son dos módulos con estructuras propias.

### `lib/about.ts` — textos y acentos de la pantalla

```ts
import type { Accent } from "@/lib/landing";

/** Una de las tres tarjetas destacadas de la misión. */
export interface Highlight {
  icon: "HEART" | "BROWSER" | "PLANT";
  /** Press Start 2P: mayúsculas sin tildes. */
  text: string;
  accent: Accent;
}

/** Un aviso con LED de la columna de contacto. */
export interface ContactTip {
  /** Press Start 2P: mayúsculas sin tildes. */
  text: string;
  accent: Accent;
}

export const MISSION: string;
export const HIGHLIGHTS: readonly Highlight[]; // 3
export const CONTACT_TIPS: readonly ContactTip[]; // 3
export const CONTACT_INTRO: string;

/** Las líneas del terminal, en el orden en que se pintan. */
export const TERMINAL_OK: readonly string[]; // 3 lineas [OK]
export const TERMINAL_FAIL: readonly string[]; // [OK] conectando + [ERR]

/** Topes de longitud, compartidos por el `maxLength` del campo y la accion. */
export const LIMITS = { name: 80, email: 120, message: 2000 } as const;
```

`Accent` se reutiliza de `lib/landing.ts`; no se amplía. La regla de SPEC 02 sigue vigente: el acento nunca se interpola en un nombre de clase, cada componente lleva su `Record<Accent, string>` con las clases completas.

### `app/(vault)/acerca-de/actions.ts` — contrato de la Server Action

```ts
"use server";

/** Lo que devuelve la accion; es el estado de `useActionState`. */
export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; field: "name" | "email" | "message" }
  | { status: "sent"; name: string }
  | { status: "error" };

export async function sendContactMessage(
  prev: ContactState,
  data: FormData,
): Promise<ContactState>;
```

Reglas de la acción, en este orden:

1. Si el campo trampa (`website`) llega con algo, devuelve `{ status: "sent" }` sin enviar nada. El bot cree que acertó.
2. Recorta espacios de los tres campos. El primero que quede vacío, o que supere su tope de `LIMITS`, sale como `{ status: "invalid", field }`.
3. El correo se comprueba con una expresión regular simple (`algo@algo.dominio`); si no encaja, `{ status: "invalid", field: "email" }`.
4. Sin `process.env.RESEND_API_KEY`, registra el mensaje en la consola del servidor y devuelve `{ status: "sent" }`.
5. Con clave, envía por Resend: `from: "Arcade Vault <onboarding@resend.dev>"`, `to: "ivandg1909@gmail.com"`, `replyTo` con el correo del visitante, asunto `[Arcade Vault] Mensaje de <nombre>` y cuerpo en texto plano. Si Resend devuelve error o la llamada lanza, `{ status: "error" }`.

El estado `invalid` y el vacío del cliente coexisten: el formulario sacude en cuanto detecta un campo vacío sin llamar al servidor, y la acción vuelve a validar porque es una URL pública que cualquiera puede invocar directamente.

## Plan de implementación

Cada paso deja el sitio navegable y se puede confirmar por separado.

1. **Dependencia y entorno.** `npm install resend`, y `.env.example` con `RESEND_API_KEY=` más un comentario que explique que sin ella el formulario finge el envío. Nadie la usa todavía. Comprobación: `npm run build` sigue pasando.
2. **Crear `lib/about.ts`** con `MISSION`, `HIGHLIGHTS`, `CONTACT_TIPS`, `CONTACT_INTRO`, `TERMINAL_OK`, `TERMINAL_FAIL` y `LIMITS`. Sin consumidores aún.
3. **Componente `components/highlight-icon.tsx`.** Los tres SVG de píxel (`HEART`, `BROWSER`, `PLANT`) en `currentColor`, con el halo y el `image-rendering: pixelated` del template, mismo patrón que `feature-icon.tsx`. El fondo recortado del icono `BROWSER` toma `--av-bg` en vez del `#0a0a0f` literal.
4. **Mitad de arriba de `/acerca-de`.** Crear `app/(vault)/acerca-de/page.tsx` con el kicker `>> ACERCA DE`, el titular, la misión, la rejilla de tres tarjetas —que pasa a una columna por debajo de 820 px— y la banda divisoria de veinticuatro píxeles, envuelta en `Reveal`. Añadir su `metadata`. Comprobación: `/acerca-de` responde, las tres tarjetas se elevan al pasar el ratón tomando su acento, y los píxeles de la banda parpadean desfasados.
5. **Navegación y pie.** Cuarta entrada en `SECTIONS` de `site-header.tsx` (`/acerca-de`, `Acerca de`, ámbar) para la barra y el cajón, y remate `ARCADE VAULT · QUIENES SOMOS` en `site-footer.tsx`. Comprobación: la sección se subraya en ámbar al visitarla y el pie cambia de texto.
6. **Server Action.** `app/(vault)/acerca-de/actions.ts` con `ContactState` y `sendContactMessage`: campo trampa, recorte, campos vacíos, topes de `LIMITS`, expresión regular del correo y la rama simulada cuando falta `RESEND_API_KEY`. Todavía no importa `resend`: donde iría el envío, registra en consola y devuelve `sent`. Sin consumidores aún.
7. **Formulario, estados de reposo y envío.** `components/contact-form.tsx`, cliente, con `useActionState(sendContactMessage, { status: "idle" })`. Los tres campos con su `maxLength` de `LIMITS`, el campo trampa oculto (`tabIndex={-1}`, `aria-hidden`, fuera de pantalla), el prerelleno de `NOMBRE` con `user.name` de `useSession()`, la sacudida cuando algo está vacío y el botón que pasa a `ENVIANDO...` deshabilitado mientras `pending`. La sacudida entra como `animate-av-shake` en `globals.css`, junto al resto de animaciones del proyecto. Montarlo en la columna derecha de la sección de contacto, con la columna izquierda —kicker, titular, subtítulo y los tres avisos con LED— a su lado. Comprobación: enviar con el mensaje vacío sacude el marco y no llama al servidor; enviar completo deshabilita el botón y termina sin error en la consola.
8. **Terminales de éxito y error.** Con `status: "sent"`, el formulario se sustituye por el terminal cian: barra con las tres bolitas en magenta, amarillo y cian, rótulo `VAULT-OS // TERMINAL`, las líneas de `TERMINAL_OK`, la línea final en amarillo con el nombre en mayúsculas y su cursor parpadeante, y el botón `ENVIAR OTRO MENSAJE` que vacía los campos. Con `status: "error"`, el mismo terminal en magenta con las líneas de `TERMINAL_FAIL` y `REINTENTAR`, que vuelve al formulario **sin borrar lo escrito**. Con `status: "invalid"`, se sacude y se marca el campo señalado. Comprobación: forzando cada rama de la acción salen los tres desenlaces.
9. **Conectar Resend.** En `actions.ts`, sustituir la rama simulada por la llamada real cuando hay clave: `from`, `to`, `replyTo`, asunto y cuerpo en texto plano; error o excepción de Resend devuelven `error`. Comprobación: con `RESEND_API_KEY` en `.env.local`, el mensaje llega a `ivandg1909@gmail.com` y al responderlo, el destinatario es el correo escrito en el formulario.

El prerelleno del nombre del paso 7 se hace en el cliente, tras montar, porque `useSession()` lee `localStorage`. Es el mismo patrón que evita el aviso de hidratación en el resto del proyecto: el campo arranca vacío en el HTML del servidor.

## Criterios de aceptación

**Ruta y navegación**

- [ ] `/acerca-de` responde y muestra, en este orden: misión, banda divisoria y contacto.
- [ ] La cabecera muestra cuatro enlaces: `Inicio`, `Biblioteca`, `Salón de la Fama` y `Acerca de`.
- [ ] Estando en `/acerca-de`, ese enlace aparece subrayado en ámbar.
- [ ] El cajón lateral en móvil ofrece los mismos cuatro enlaces más `Cuenta`.
- [ ] El pie de `/acerca-de` dice `ARCADE VAULT · QUIENES SOMOS`.
- [ ] La pestaña del navegador muestra un título propio, distinto del de la portada.

**Acabado**

- [ ] Las tres tarjetas destacadas usan magenta, cian y ámbar; no aparece verde en ningún punto de la pantalla.
- [ ] Al pasar el ratón por una tarjeta, sube tres píxeles y su borde toma su acento.
- [ ] Los veinticuatro píxeles de la banda parpadean con retardo escalonado y alternan cian, magenta y amarillo.
- [ ] Ningún texto en Press Start 2P contiene caracteres fuera de ASCII imprimible, salvo `·`; en particular no hay `❤️` ni `▸`.
- [ ] La sección de contacto se apila en una columna por debajo de 900 px, y las tarjetas destacadas por debajo de 820 px.
- [ ] La pantalla no desborda en horizontal a 360 px de ancho.
- [ ] Con `prefers-reduced-motion: reduce`, todo es visible sin animación de aparición.

**Formulario**

- [ ] Enviar con cualquiera de los tres campos vacío sacude el marco y no dispara ninguna petición de red.
- [ ] Con sesión iniciada, `NOMBRE` llega relleno con el usuario y se puede editar; sin sesión, vacío.
- [ ] Los campos no admiten más de 80, 120 y 2000 caracteres.
- [ ] Mientras se envía, el botón está deshabilitado y dice `ENVIANDO...`.
- [ ] La consola no muestra ningún aviso de discrepancia de hidratación al cargar `/acerca-de`.
- [ ] El campo trampa no es visible, no recibe foco con el tabulador y no lo anuncia un lector de pantalla.

**Estados de respuesta**

- [ ] Un envío correcto sustituye el formulario por el terminal cian, con el nombre en mayúsculas en la línea final.
- [ ] `ENVIAR OTRO MENSAJE` devuelve el formulario con los tres campos vacíos.
- [ ] Un fallo del envío muestra el terminal magenta con `[ERR] Transmision rechazada`.
- [ ] `REINTENTAR` devuelve el formulario conservando lo que estaba escrito.

**Server Action**

- [ ] Invocada con el campo trampa relleno, devuelve éxito y no envía ningún correo.
- [ ] Invocada con un correo sin `@` o sin dominio, devuelve `invalid` señalando `email`, aunque el navegador se saltara la validación del cliente.
- [ ] Invocada con un mensaje de 2001 caracteres, devuelve `invalid` señalando `message`.
- [ ] Sin `RESEND_API_KEY`, devuelve éxito, no llama a Resend y deja el mensaje en la consola del servidor.
- [ ] Con `RESEND_API_KEY`, el correo llega a `ivandg1909@gmail.com` con asunto `[Arcade Vault] Mensaje de <nombre>`.
- [ ] Al responder ese correo, el destinatario es la dirección escrita en el formulario, no `onboarding@resend.dev`.

**Cierre**

- [ ] `npm run build` y `npx tsc --noEmit` terminan sin errores **sin** `.env.local` presente.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] `RESEND_API_KEY` no aparece en ningún archivo versionado; `.env.example` solo lleva la clave vacía.

## Decisiones tomadas y descartadas

**Envío del correo**

- **Sí:** Server Action en lugar de Route Handler. Es lo idiomático en Next 16, evita inventar un contrato JSON y da el estado de envío con `useActionState` sin escribir `fetch` a mano. Un Route Handler solo habría ganado si algo ajeno a la web fuera a llamarlo.
- **Sí:** `onboarding@resend.dev` como remitente. No hay dominio verificado; Resend solo entrega desde ese remitente a la dirección dueña de la cuenta, que es justo el destino. En cuanto haya dominio propio, es cambiar una constante.
- **Sí:** el correo del visitante va en `replyTo`, no en `from`. Resend rechaza remitentes de dominio ajeno, y así responder desde Gmail llega a quien escribió.
- **Sí:** cuerpo en texto plano. Una plantilla HTML de correo es otro lenguaje visual que mantener para un mensaje que solo lee el equipo.
- **Sí:** sin clave, el envío se finge y sale el terminal de éxito. Todo el proyecto es simulado —sesión, puntuaciones, acceso—, y así la pantalla se demuestra recién clonado el repo. Se descartó fallar el build por falta de variable: dejaría el repo roto para cualquiera que no tenga cuenta de Resend.
- **No:** correo de acuse al visitante. Duplica plantillas y con `onboarding@resend.dev` ni siquiera se entregaría a un tercero.
- **No:** guardar los mensajes. No hay base de datos, y un registro en `localStorage` no lo lee nadie del equipo.

**Validación y abuso**

- **Sí:** validar dos veces, en el cliente y en la acción. La sacudida es respuesta inmediata; la acción es una URL pública que cualquiera puede invocar sin pasar por el formulario.
- **Sí:** expresión regular simple para el correo, sin biblioteca. Tres campos no justifican una dependencia; la verificación de verdad es que llegue la respuesta.
- **Sí:** campo trampa con respuesta de éxito falsa. Un bot que recibe error reintenta; uno que recibe éxito, no.
- **No:** límite por IP ni captcha. El primero no sobrevive a un despliegue sin servidor y el segundo mete un tercero en una pantalla de tres campos.
- **Sí:** `invalid` señala solo el primer campo que falla. Con el cliente validando antes, acumular los tres errores complica el estado sin que se vea la diferencia.

**Acabado visual**

- **Sí:** terminal de éxito en cian con la línea final en amarillo. El cian es el color de sistema del vault y el amarillo ya significa logro en el salón.
- **No:** el verde `#00ff88` del template, ni en el terminal, ni en la tercera tarjeta, ni en el LED de `RESPUESTA EN 24-48H`. Es la misma regla de SPEC 02: no se duplica el sistema de color por una pantalla.
- **No:** las bolitas de macOS del terminal (`#ff5f56`, `#ffbd2e`, `#27c93f`). Pasan a magenta, amarillo y cian; son tres puntos de seis píxeles y nadie los lee como semáforo.
- **Sí:** terminal de error en magenta. Es el color de alarma del proyecto y distingue el desenlace de un vistazo, sin leer.
- **Sí:** `>>` en lugar de `▸` en los dos kickers, y `CONTACTANOS` sin tilde. Regla ASCII de SPEC 02: Press Start 2P no tiene esos glifos y el navegador los sustituye por una fuente de respaldo que sale como una mota.
- **Sí:** quitar el `❤️` de `HECHO POR JUGADORES, PARA JUGADORES`. El icono de esa fila ya es un corazón de píxeles; el emoji repetía el mensaje y rompía la regla de la fuente.
- **Sí:** kicker propio (`>> ACERCA DE`) en vez del `// 01` numerado de `SectionHead`. Es lo que hace el template, y la numeración de la portada cuenta secciones de un recorrido que aquí no existe.
- **Sí:** ámbar para `Acerca de` en la navegación. Los otros tres ya tienen magenta, cian y amarillo; ámbar es el cuarto acento que fijó SPEC 02.

**Alcance**

- **Sí:** prerellenar `NOMBRE` con la sesión. SPEC 02 ya cambia botones según la sesión, y pedir el nombre a quien acaba de identificarse es fricción gratuita. El correo no se prerellena porque `lib/session.tsx` no lo guarda.
- **Sí:** textos en `lib/about.ts`. Mismo criterio que `lib/landing.ts`: un retoque editorial no debería abrir la maquetación.
- **Sí:** reutilizar `Accent` de `lib/landing.ts` sin ampliarlo. Cuatro acentos siguen bastando.

## Riesgos identificados

| Riesgo                                                                                                                                                                                   | Mitigación                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding@resend.dev` es un remitente compartido de pruebas: Resend limita su uso, solo entrega a la dirección dueña de la cuenta y el correo tiene alta probabilidad de caer en spam. | El destino es esa misma dirección, así que la entrega está dentro de lo que el remitente permite. Queda escrito en la spec que pasar a producción real exige verificar un dominio, y es cambiar una constante. Primera comprobación tras el paso 9: revisar también la carpeta de spam.                  |
| El modo simulado sin clave devuelve éxito. Si en producción falta la variable de entorno, los mensajes se pierden en silencio y el visitante ve un terminal que le miente.               | La rama simulada registra en la consola del servidor con un aviso explícito de que no se envió nada. Es una decisión consciente: el precio de que el repo funcione recién clonado. Se descartó la alternativa —error visible sin clave— por dejar la pantalla rota para cualquiera sin cuenta de Resend. |
| La Server Action es un endpoint público sin autenticación ni límite de peticiones: un bot puede llamarla en bucle y agotar la cuota de Resend o llenar la bandeja.                       | Campo trampa, topes de longitud y validación de correo filtran lo automatizado más básico. Contra un ataque dirigido no hay defensa aquí; si aparece, la respuesta es rotar la clave y añadir límite en la capa de despliegue, no en el código.                                                          |
| El formulario es un componente de cliente que lee `useSession()` para el prerelleno: riesgo de discrepancia de hidratación, como pasó con los paneles de la portada.                     | El campo arranca vacío en el HTML del servidor y se rellena tras montar, mismo patrón `seed*()` / `*()` de SPEC 01 y 02. Hay criterio de aceptación que lo verifica en consola.                                                                                                                          |
| El error de red pierde el mensaje: si el visitante cierra la pestaña tras ver el terminal magenta, lo escrito desaparece.                                                                | `REINTENTAR` conserva el texto en el estado del formulario, así que el reintento es inmediato. No se persiste en `localStorage` porque el mensaje ya no es recuperable desde otra pestaña ni otro día.                                                                                                   |
| El correo del visitante viaja a `replyTo` sin escapar: cabecera inyectable si llegara con saltos de línea.                                                                               | La validación del correo con la expresión regular rechaza cualquier cosa con espacios o saltos antes de llegar a Resend, y el SDK envía JSON, no cabeceras SMTP a mano.                                                                                                                                  |

## Lo que **no** está en esta spec

- Correo de acuse automático al visitante.
- Dominio propio verificado en Resend y remitente con marca.
- Persistencia de los mensajes enviados: no hay base de datos ni panel de bandeja.
- Límite de peticiones por IP, captcha y plantilla HTML de correo.
- Biblioteca de validación de esquemas.
- Motores de juego, backend, autenticación real y puntuaciones de servidor.
- Framework de tests.

Cada uno de ellos, si entra, va en su propia spec.
