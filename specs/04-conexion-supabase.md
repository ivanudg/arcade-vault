# SPEC 04 — Conexión con Supabase

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-08-03
> **Objetivo:** Instalar las dependencias de Supabase y dejar el proyecto conectado —clientes de navegador y de servidor, variables de entorno, CLI enlazado y una ruta de diagnóstico— sin crear ni una sola tabla.

## Por qué existe esta spec

Todo el vault es simulado: las puntuaciones, la sesión y el acceso viven en
`localStorage` bajo la clave `arcadevault:v1`, y `lib/storage.ts` es la única
pieza que los toca. Migrar eso a una base de datos real es un trabajo grande y
arriesgado, así que se parte en dos: esta spec deja el cable puesto y probado,
y las siguientes lo usan.

Aquí no se crea ninguna tabla a propósito. Un esquema decidido a la vez que se
instalan las dependencias sale mal en las dos mitades: se elige el esquema con
prisa y se depura la conexión con ruido de por medio. Cuando llegue la SPEC 05
la pregunta será solo «qué tablas», no «por qué no conecta».

Esta spec rompe un patrón del repo y conviene decirlo: SPEC 03 finge el envío
del correo cuando falta `RESEND_API_KEY`, para que el repo se pueda clonar y
construir sin cuentas. Con Supabase no se finge nada. Un cliente falso de base
de datos devuelve datos que no existen y el fallo aparece tres pantallas más
tarde; sin credenciales, pedir un cliente lanza un error legible y se acabó. El
repo sigue clonándose y construyéndose igual, porque de momento nadie pide un
cliente salvo la ruta de diagnóstico, que responde 503 en vez de reventar.

## Alcance

**Dentro:**

- Dependencias nuevas en `package.json`: `@supabase/supabase-js` y `@supabase/ssr`
  en `dependencies`, y `supabase` (la CLI) en `devDependencies`.
- `lib/supabase/env.ts`: lee y valida las variables de entorno. Exporta una
  función por variable; cada una lanza un `Error` con el nombre exacto de la
  que falta. Nadie más lee `process.env` de Supabase.
- `lib/supabase/client.ts`: `createBrowserClient` de `@supabase/ssr`, tipado con
  `Database`. Para componentes con `"use client"`.
- `lib/supabase/server.ts`: `createServerClient` de `@supabase/ssr`, `async`
  porque `cookies()` es una promesa en Next 16. Puente de cookies con `getAll` /
  `setAll`, y `setAll` envuelto en `try/catch` porque un Server Component no
  puede escribir cookies. Para Server Components, Server Actions y Route
  Handlers.
- `lib/supabase/database.types.ts`: tipos generados por la CLI. Hoy sale sin
  tablas; existe para que `Database` ya esté enchufado en los dos clientes y la
  SPEC 05 solo tenga que regenerarlo.
- `app/api/supabase-health/route.ts`: Route Handler `GET` permanente. Devuelve
  `200 { ok: true, url }` cuando la conexión responde, y `503 { ok: false, reason }`
  cuando faltan variables o el proyecto no contesta. Nunca imprime claves.
- `.env.example` con las tres variables nuevas documentadas y vacías:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y
  `SUPABASE_SECRET_KEY`. `SUPABASE_DB_PASSWORD` se queda exactamente como está.
- `.env.local` con los valores reales del proyecto `nlfwqnmidfdohuyhklqp`.
- Carpeta `supabase/` creada con `npx supabase init` y enlazada al proyecto con
  `npx supabase link --project-ref nlfwqnmidfdohuyhklqp`.
- Script `supabase:types` en `package.json` que regenera
  `lib/supabase/database.types.ts` desde el proyecto enlazado.
- Entradas de la CLI en `.gitignore` (`supabase/.temp/`, `supabase/.branches/`)
  si `supabase init` no las deja ya en su propio `.gitignore`.
- Apartado de Supabase en `CLAUDE.md`: qué cliente se usa dónde y por qué no se
  lee `process.env` fuera de `lib/supabase/env.ts`.

**Fuera de alcance (para futuras specs):**

- Tablas, columnas, migraciones, índices y políticas RLS. Ni una sentencia SQL.
- Autenticación real: nada de `signIn`, `signUp`, `proxy.ts` ni refresco de
  sesión. `proxy.ts` entra cuando haya sesiones que refrescar, no antes.
- Migrar `lib/storage.ts`, `lib/session.tsx` y `lib/scores.ts`. Siguen en
  `localStorage` con la clave `arcadevault:v1`, sin tocar una línea.
- Cliente administrador con `SUPABASE_SECRET_KEY`: la variable se declara y se
  valida, pero en esta spec ningún cliente la consume.
- Realtime, Storage, Edge Functions y branching de Supabase.
- Entorno local con Docker (`supabase start`), datos de siembra y migraciones
  locales. La CLI se instala y se enlaza; no se levanta nada.
- Variables de entorno en el despliegue (Vercel u otro): esta spec solo cubre la
  máquina de desarrollo.
- Cualquier cambio visual: ninguna pantalla existente cambia de aspecto ni de
  comportamiento.
- Tests: el repo no tiene framework de tests y esta spec no lo introduce.

## Modelo de datos

Esta spec **no crea ninguna tabla**, así que no hay esquema de base de datos que
describir. Lo que sí aparecen son tres estructuras nuevas en el repo: las
variables de entorno, el tipo `Database` y la respuesta de la ruta de
diagnóstico.

### Variables de entorno

| Variable                               | Visible en el navegador | Para qué                                                                       |
| -------------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sí                      | URL del proyecto `nlfwqnmidfdohuyhklqp`.                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí                      | Clave pública, formato `sb_publishable_...`.                                   |
| `SUPABASE_SECRET_KEY`                  | **No**                  | Clave de servidor, formato `sb_secret_...`. Declarada, sin consumidor todavía. |
| `SUPABASE_DB_PASSWORD`                 | **No**                  | Ya existía. La spec no la toca ni la usa.                                      |

Se usan las claves nuevas (`sb_publishable_` / `sb_secret_`), no las `anon` y
`service_role` heredadas en formato JWT.

### `lib/supabase/env.ts` — acceso único a las variables

```ts
/** Devuelve la URL del proyecto. Lanza si falta. */
export function supabaseUrl(): string;

/** Devuelve la clave pública. Lanza si falta. */
export function supabasePublishableKey(): string;

/** Devuelve la clave secreta de servidor. Lanza si falta. Sin consumidor aún. */
export function supabaseSecretKey(): string;

/** `true` si están la URL y la clave pública. No lanza: la usa la ruta de salud. */
export function isSupabaseConfigured(): boolean;
```

El mensaje de error es siempre el mismo molde, con el nombre exacto de la
variable: `Falta NEXT_PUBLIC_SUPABASE_URL. Cópiala de .env.example a .env.local.`

### `lib/supabase/database.types.ts` — tipos generados

Generado por `npm run supabase:types`. Sin tablas, la CLI emite un `Database`
con los esquemas vacíos:

```ts
export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    // ...
  };
};
```

Los dos clientes se tipan con él desde el primer día
(`createBrowserClient<Database>(...)`), así que cuando la SPEC 05 cree tablas
basta con regenerar el archivo para que el tipado aparezca solo.

### Respuesta de `GET /api/supabase-health`

```ts
type HealthResponse =
  | { ok: true; url: string } // 200
  | { ok: false; reason: string }; // 503
```

`url` es la URL del proyecto, que ya es pública. `reason` es texto legible
(`"faltan variables de entorno"`, `"el proyecto no responde"`). **Ninguna clave
aparece en la respuesta, ni la pública.**

## Plan de implementación

Cada paso deja el repo compilando y es commiteable por separado.

1. **Instalar las dependencias.**
   `npm install @supabase/supabase-js @supabase/ssr` y
   `npm install -D supabase`.
   Verificación: `npm run build` sigue pasando y `package.json` lista los tres
   paquetes.

2. **Declarar las variables.**
   Añadir a `.env.example`, vacías y con un comentario cada una:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y
   `SUPABASE_SECRET_KEY`. Rellenar `.env.local` con los valores reales del
   proyecto `nlfwqnmidfdohuyhklqp`. `SUPABASE_DB_PASSWORD` se queda igual.
   Verificación: `.env.example` no contiene ningún valor y `git status` no ve
   `.env.local` (`.gitignore` ya lo cubre).

3. **Escribir `lib/supabase/env.ts`.**
   Las cuatro funciones de la sección anterior. Nadie lo importa todavía.
   Verificación: `npm run build` pasa.

4. **Enlazar la CLI.**
   `npx supabase init` y `npx supabase link --project-ref nlfwqnmidfdohuyhklqp`.
   El `link` pide autenticación (`npx supabase login`) y la contraseña de la base
   de datos: son pasos interactivos que ejecuta la persona, no el agente.
   Revisar `.gitignore` y añadir `supabase/.temp/` y `supabase/.branches/` si
   `supabase init` no los dejó en su propio `.gitignore`.
   Verificación: existe `supabase/config.toml` y `npx supabase projects list`
   marca el proyecto como enlazado.

5. **Generar los tipos.**
   Añadir el script `"supabase:types": "supabase gen types typescript --linked > lib/supabase/database.types.ts"`
   y ejecutarlo.
   Verificación: `lib/supabase/database.types.ts` existe, exporta `Database` y
   `npx tsc --noEmit` no se queja.

6. **Escribir `lib/supabase/client.ts`.**
   `createBrowserClient<Database>` alimentado por `env.ts`.
   Verificación: `npm run build` pasa.

7. **Escribir `lib/supabase/server.ts`.**
   `createServerClient<Database>` con `await cookies()`, el puente `getAll` /
   `setAll` y el `try/catch` en `setAll` con un comentario que explique por qué
   se traga el error (un Server Component no puede escribir cookies).
   Verificación: `npm run build` pasa.

8. **Escribir `app/api/supabase-health/route.ts`.**
   El `GET` comprueba `isSupabaseConfigured()`; si falta algo devuelve
   `503 { ok: false, reason }`. Si no, construye el cliente de servidor —eso ya
   prueba que el módulo y el puente de cookies funcionan— y hace una petición a
   `${supabaseUrl()}/auth/v1/health` con la clave pública en la cabecera
   `apikey`, que es la única forma de tocar la red sin tablas ni sesión.
   Respuesta buena: `200 { ok: true, url }`.
   Verificación: `npm run dev` y `curl -i localhost:3000/api/supabase-health`
   devuelve `200` con `{"ok":true,...}`.

9. **Probar el caso degradado.**
   Renombrar `.env.local` a `.env.local.bak`, reiniciar `npm run dev` y
   comprobar que `/api/supabase-health` responde `503` con un `reason` legible y
   que ninguna otra pantalla se rompe. Restaurar el archivo.
   Verificación: la portada, `/biblioteca` y `/acerca-de` siguen cargando sin
   credenciales de Supabase.

10. **Documentar en `CLAUDE.md`.**
    Apartado corto: qué cliente se usa en cada contexto, que `env.ts` es el
    único sitio que lee `process.env` de Supabase, y que los tipos se regeneran
    con `npm run supabase:types`.
    Verificación: el apartado existe y nombra los tres archivos de
    `lib/supabase/`.

## Criterios de aceptación

**Dependencias y CLI**

- [ ] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr` en
      `dependencies`, y `supabase` en `devDependencies`.
- [ ] Existe `supabase/config.toml` y `npx supabase projects list` marca
      `nlfwqnmidfdohuyhklqp` como enlazado.
- [ ] `git status` no muestra archivos temporales de la CLI sin ignorar.
- [ ] `npm run supabase:types` termina sin error y reescribe
      `lib/supabase/database.types.ts`.

**Variables de entorno**

- [ ] `.env.example` incluye `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`, las tres
      vacías y con comentario.
- [ ] `.env.example` conserva `RESEND_API_KEY` y `SUPABASE_DB_PASSWORD` tal como
      estaban.
- [ ] `git status` no muestra `.env.local`.
- [ ] `grep -rn "NEXT_PUBLIC_SUPABASE\|SUPABASE_SECRET_KEY" app lib` solo
      encuentra coincidencias en `lib/supabase/env.ts`.

**Módulos**

- [ ] Existen `lib/supabase/env.ts`, `client.ts`, `server.ts` y
      `database.types.ts`.
- [ ] `database.types.ts` exporta un tipo `Database`.
- [ ] `client.ts` y `server.ts` construyen sus clientes tipados con `Database`.
- [ ] `server.ts` exporta una función `async` y hace `await cookies()`.
- [ ] Llamar a `supabaseUrl()` sin la variable definida lanza un `Error` cuyo
      mensaje contiene `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] `isSupabaseConfigured()` devuelve `false` en vez de lanzar cuando faltan
      variables.

**Ruta de diagnóstico**

- [ ] Con `.env.local` puesto, `GET /api/supabase-health` responde `200` y
      `{"ok":true}`.
- [ ] Sin `.env.local`, responde `503` y `{"ok":false}` con un `reason` legible,
      y el servidor no vuelca ninguna excepción sin capturar.
- [ ] El cuerpo de la respuesta no contiene ninguna clave, ni la pública ni la
      secreta.

**Nada más se ha movido**

- [ ] `npm run build` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npm run lint` no añade avisos nuevos.
- [ ] `lib/storage.ts`, `lib/session.tsx` y `lib/scores.ts` no tienen ni una
      línea modificada.
- [ ] No existe `proxy.ts` en el repo.
- [ ] No hay ningún archivo `.sql` ni ninguna migración en `supabase/migrations/`.
- [ ] `/`, `/biblioteca`, `/salon`, `/cuenta`, `/acerca-de`, `/juego/[id]` y
      `/jugar/[id]` cargan igual que antes, con y sin credenciales de Supabase.

**Documentación**

- [ ] `CLAUDE.md` tiene un apartado de Supabase que nombra los tres módulos de
      `lib/supabase/` y el script `supabase:types`.

## Decisiones tomadas y descartadas

**Paquetes**

- **Sí:** `@supabase/supabase-js` y `@supabase/ssr` juntos. Sin `ssr` no hay
  cliente de servidor con cookies, y toda pantalla escrita con el cliente de
  navegador habría que reescribirla cuando llegue la autenticación.
- **No:** `@supabase/auth-helpers-nextjs`. Está obsoleto; `@supabase/ssr` es su
  sustituto oficial.
- **Sí:** la CLI como `devDependency`. Queda fijada en el repo, así que todos
  generan los tipos con la misma versión. Instalarla global deja la versión al
  azar de cada máquina.

**Claves y entorno**

- **Sí:** claves nuevas `sb_publishable_` y `sb_secret_`. Se rotan por separado y
  son las recomendadas para proyectos nuevos. Se descartan `anon` y
  `service_role` en formato JWT, que son las heredadas.
- **Sí:** declarar `SUPABASE_SECRET_KEY` aunque nadie la use todavía. Su sitio
  natural es el mismo commit que el resto del cableado, y así la SPEC 05 no tiene
  que volver a tocar `.env.example`.
- **Sí:** `lib/supabase/env.ts` como único lector de `process.env`. Un
  `process.env.X!` esparcido por el código convierte una variable ausente en un
  fallo silencioso a mitad de una petición.
- **Sí:** dejar `SUPABASE_DB_PASSWORD` intacta. La usa la CLI al enlazar; no es
  asunto de esta spec.

**Comportamiento sin credenciales**

- **Sí:** fallar rápido. Pedir un cliente sin variables lanza un error que nombra
  la variable que falta.
- **No:** fingir la conexión como hace SPEC 03 con Resend. Un correo fingido no
  engaña a nadie: no llega y ya está. Una base de datos fingida devuelve datos
  inventados y el error aparece tres pantallas más tarde.
- **Sí:** el repo sigue construyendo sin `.env.local`. No hay validación al
  arrancar ni al construir, solo al pedir un cliente, y hoy solo lo pide la ruta
  de diagnóstico.

**Clientes**

- **Sí:** dos archivos separados, `client.ts` y `server.ts`. Es lo que hace la
  documentación oficial y evita que un import de servidor acabe en un bundle de
  navegador.
- **No:** `proxy.ts` con refresco de sesión. Correría en cada petición para no
  hacer nada mientras no exista autenticación. Entra en la spec que traiga el
  login, que es cuando su ausencia empieza a doler.
- **Sí:** tipar los dos clientes con `Database` desde ya, aunque hoy esté vacío.
  Cuando existan tablas, el tipado aparece regenerando un archivo.
- **Sí:** `setAll` con `try/catch` mudo en el cliente de servidor, con comentario
  del porqué. Es el patrón oficial: un Server Component no puede escribir
  cookies y ese error concreto es esperado.

**Diagnóstico**

- **Sí:** Route Handler permanente en `/api/supabase-health`. Verificable desde
  el navegador, no expone claves y sirve igual dentro de seis meses. Se descartó
  un script de terminal, que solo prueba Node y no la app.
- **Sí:** la comprobación es una petición a `/auth/v1/health` del proyecto. Sin
  tablas no hay `select` posible, y `auth.getUser()` sin sesión responde sin
  tocar la red, así que no probaría nada.
- **No:** limitar la ruta a desarrollo. No devuelve ningún dato sensible y en
  producción es justo donde interesa preguntar si hay conexión.
- **Sí:** que la ruta construya el cliente de servidor antes de la petición.
  Así el diagnóstico también cubre que `server.ts` y el puente de cookies
  funcionan, no solo que la red llega.

**Reparto del trabajo**

- **Sí:** esta spec no crea ni una tabla. Elegir el esquema y depurar la conexión
  a la vez sale mal en las dos mitades.
- **No:** migrar `lib/storage.ts` ahora. `localStorage` sigue siendo la única
  persistencia hasta que exista un esquema al que migrar.

## Riesgos

| Riesgo                                                                                                                              | Mitigación                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `supabase link` falla o pide credenciales que el agente no tiene (token de acceso, contraseña de la base).                          | El paso 4 es interactivo por diseño: lo ejecuta la persona. Si el enlace no sale, `supabase gen types` acepta `--project-id nlfwqnmidfdohuyhklqp` en lugar de `--linked`, y el resto de la spec no depende de la CLI.                                                                |
| Alguien importa `lib/supabase/env.ts` desde un componente de cliente y arrastra `supabaseSecretKey()` al bundle del navegador.      | La clave secreta no lleva prefijo `NEXT_PUBLIC_`, así que Next la sustituye por `undefined` en el navegador: el error saltaría en desarrollo, no filtraría nada. Si más adelante aparece un consumidor real, ese archivo se parte y la mitad de servidor se marca con `server-only`. |
| La clave pública viaja al navegador y, cuando existan tablas, cualquiera podría leerlas.                                            | Es su diseño: la clave pública solo vale lo que permita RLS. La SPEC 05 no puede crear ninguna tabla sin RLS activo; queda escrito aquí para que no se olvide.                                                                                                                       |
| Las claves reales de `.env.local` acaban en un commit.                                                                              | `.gitignore` ya ignora `.env*` salvo `.env.example`, y hay un criterio de aceptación que lo comprueba con `git status`.                                                                                                                                                              |
| El proyecto de Supabase se pausa por inactividad y la ruta de salud devuelve `503` como si el código estuviera roto.                | El `reason` distingue los dos casos: `"faltan variables de entorno"` frente a `"el proyecto no responde"`. Con el segundo, el sitio donde mirar es el panel de Supabase, no el repo.                                                                                                 |
| `supabase gen types` sobrescribe `lib/supabase/database.types.ts` con un archivo vacío si se ejecuta contra el proyecto equivocado. | El archivo es generado y desechable: se regenera con `npm run supabase:types`. Nunca se edita a mano, y así lo dirá el apartado de `CLAUDE.md`.                                                                                                                                      |

## Lo que **no** entra en esta spec

- Tablas, migraciones y políticas RLS.
- Autenticación real y `proxy.ts`.
- Migrar `localStorage` a la base de datos.
- Cliente administrador con la clave secreta.
- Realtime, Storage y Edge Functions.
- Entorno local con Docker (`supabase start`).
- Variables de entorno en el despliegue.

Cada una de esas, si llega, va en su propia spec.
