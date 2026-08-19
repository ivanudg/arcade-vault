# Checklist del panel de produccion

Lo que **no** viaja en las migraciones. Se hace una vez, a mano, en el panel del proyecto
de produccion, y se repite entero por cada origen nuevo desde el que se pruebe.

> **`supabase config push` no se corre nunca en este repo.** `supabase/config.toml` es
> documentacion del panel y no su fuente de verdad: sus `site_url` y
> `additional_redirect_urls` tienen los valores por defecto del CLI, asi que empujarlo
> arrasaria de golpe la Site URL, las dos URLs de redireccion, las dos plantillas de
> correo con `{{ .TokenHash }}` y los dos proveedores con sus secretos. Los valores se
> cambian aqui y se **copian** al archivo para que quede registro.

Sustituye `<REF_PROD>` y `<ORIGEN_PROD>` como en el [runbook](./runbook.md).

---

## 1 · Confirmacion de correo

**Authentication › Sign In / Providers › Email**

- [x] **Confirm email**: activado.

Sin esto, `signUp()` devuelve sesion al momento y el flujo de `/auth/confirmar` deja de
ejercitarse. Con esto activado, el nombre de jugador lo escribe el **trigger**
`handle_new_user()` y no el navegador, que es justo por lo que existe.

## 2 · URLs

**Authentication › URL Configuration**

- [x] **Site URL**: `<ORIGEN_PROD>`
- [x] **Redirect URLs**, las dos y exactas: `<ORIGEN_PROD>/auth/confirmar` y
      `<ORIGEN_PROD>/auth/callback`

Son dos rutas y no una porque son dos canjes distintos: `/auth/confirmar` canjea el
`token_hash` del correo con `verifyOtp()`, y `/auth/callback` canjea el `code` de OAuth
con `exchangeCodeForSession()`.

- [x] Si el host genera **URLs de preview** (Vercel), anadir tambien su patron. Si no
      estan en la lista, el enlace del correo o la vuelta del proveedor apuntan a donde
      no debe.

## 3 · Google y GitHub

**Authentication › Sign In / Providers**

Apps OAuth **nuevas**, distintas de las de desarrollo: un secreto filtrado en desarrollo
no debe tocar produccion.

- [x] **Google**: credencial OAuth de tipo _aplicacion web_ en Google Cloud Console.
- [x] **GitHub**: OAuth App nueva en GitHub › Settings › Developer settings.
- [x] Las dos con la **misma** URL de redireccion, que es la de Supabase y **no** la del
      sitio: `https://<REF_PROD>.supabase.co/auth/v1/callback`

- [x] Pegar cliente y secreto de cada una en el panel y activar los dos proveedores.

El ambito `user:email` de GitHub **no** se pide aqui: lo pide `components/auth-panel.tsx`,
para que quede en el repo el motivo.

Nota sobre identidades: quien se registro con un correo y luego entra con Google usando
**ese mismo** correo cae en la misma cuenta. Con el correo sin verificar del proveedor no
hay enlazado y quedan dos cuentas para la misma persona; no se fuerza, porque unificarlas
seria reclamar marcas ajenas.

## 4 · Las dos plantillas de correo

**Authentication › Emails › Templates**

Es el paso que mas cuesta descubrir. Las plantillas de fabrica usan
`{{ .ConfirmationURL }}`, que apunta a `/auth/v1/verify` y rebota al sitio con un `?code=`
de PKCE; `/auth/confirmar` espera `token_hash`. Con las plantillas sin tocar, **la cuenta
se confirma pero quien pulsa el enlace ve el aviso de enlace caducado**.

| Plantilla          | URL del enlace                                                |
| ------------------ | ------------------------------------------------------------- |
| **Confirm signup** | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup`   |
| **Reset Password** | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` |

- [ ] Las dos, cambiadas.

`.RedirectTo` y no `.SiteURL`: asi el enlace vuelve al origen desde el que se pidio y no
hay que tocarlas al desplegar.

## 5 · Contrasenas y limite de intentos

**Authentication › Sign In / Providers › Email** y **Authentication › Rate Limits**

- [x] `minimum_password_length` = **8**
- [x] `password_requirements` = **`lower_upper_letters_digits_symbols`** (las cuatro
      clases de caracter)
- [x] Rate limit de **sign in / sign ups** = **10** por IP cada cinco minutos

Los tres estan espejados en `supabase/config.toml`, y la misma regla de contrasena la
valida el cliente en `lib/password.ts` para que un alta no falle por sorpresa. La garantia
real es el servidor: si los dos dejan de coincidir, el cliente debe ser **el estricto**.

A 10 y no a 5: corta el alta masiva sin que una demostracion con varias personas detras
del mismo NAT se choque contra el limite.

## 6 · Contrasenas filtradas

**Authentication › Attack Protection**

- [ ] Si el plan lo permite, activar **Leaked password protection** y anotar la fecha.
- [ ] Si no, anotarlo como **bloqueado por plan, con fecha**, en
      `references/Security/security-checklist.md` y en la tabla **Afirmaciones** de
      `.claude/security-auditor/hallazgos.md`, para que nadie lo «arregle» dos veces.

## 7 · Copiar los valores al repo

- [x] Espejar en `supabase/config.toml` los tres valores del punto 5 (los otros no: sus
      campos llevan a proposito los valores por defecto del CLI).
- [x] Marcar las casillas de la fase 6 del runbook.

---

## Dos cosas que no se arreglan aqui

- **La cuota de correo del plan gratuito son dos por hora.** Al agotarla, Supabase
  responde `429: email rate limit exceeded`, y `AuthPanel` lo traduce. Para usuarios
  reales hace falta un SMTP propio, y eso es su propia spec.
- **No crear tablas, vistas ni funciones desde el editor SQL del panel.** El
  `alter default privileges` de `20260817020000_permisos_minimos.sql` solo cubre las
  filas de `pg_default_acl` del rol `postgres`; un objeto creado desde el panel nace
  abierto a `anon` y `authenticated`. Todo objeto nuevo entra por migracion.
