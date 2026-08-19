# Runbook: migrar Arcade Vault de Dev a produccion

**Este documento lo ejecutas tu, a mano.** Claude no toca el proyecto de produccion:
ni por MCP, ni por CLI, ni por `psql`. El hook `.claude/hooks/guard-prod.sh` aborta
cualquier intento suyo, y `.mcp.json` esta clavado al proyecto de desarrollo. Las
credenciales de produccion no se pegan en el chat.

| Entorno    | Proyecto               | Quien lo toca                          |
| ---------- | ---------------------- | -------------------------------------- |
| Desarrollo | `nlfwqnmidfdohuyhklqp` | tu y Claude (MCP en solo lectura, CLI) |
| Produccion | `<REF_PROD>`           | **solo tu**, siguiendo este documento  |

Sustituye en todo el documento:

- `<REF_PROD>` — el ref del proyecto de produccion (20 letras, sale de la URL del panel).
- `<ORIGEN_PROD>` — el origen publico del despliegue, con esquema y sin barra final
  (p. ej. `https://arcade-vault.example.com`). **Aun no esta decidido**; hasta que lo
  este, las fases 3 y 4 no se pueden cerrar.
- `<PASSWORD>` — la contrasena de la base de datos de produccion.

---

## Que viaja y que no

Verificado contra desarrollo el 2026-08-18:

| Cosa                                                         | Como llega a produccion                               |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| Esquema: 3 tablas, 3 vistas, 3 funciones, event trigger      | Las 15 migraciones de `supabase/migrations/` (fase 1) |
| RLS, politicas, grants minimos, default privileges           | Las mismas migraciones                                |
| Catalogo: las 5 maquinas de `public.games`                   | Las mismas migraciones (van dentro)                   |
| Las 6 marcas de prueba de `public.scores`                    | **No viajan.** Produccion arranca vacia               |
| Las 2 cuentas de prueba (`auth.users`, `profiles`)           | **No viajan.** Produccion arranca sin cuentas         |
| Storage, Edge Functions                                      | No hay ninguno en desarrollo                          |
| Extensiones                                                  | Solo las de fabrica; no hay nada que instalar         |
| Configuracion de Auth (URLs, plantillas, OAuth, contrasenas) | **A mano en el panel** (fase 3)                       |

El historial de migraciones del repo coincide exactamente, una a una, con el aplicado en
desarrollo: no hay deriva, asi que `db push` reproduce desarrollo tal cual.

---

## Fase 0 · Preparativos

- [ ] Anotar el ref, la region y el plan del proyecto de produccion.
- [ ] Comprobar que la base es **PostgreSQL 17** —`show server_version;` en el editor
      SQL del panel—. `supabase/config.toml` declara `major_version = 17` y el CLI se
      queja si no coincide.
- [ ] Copiar del panel la cadena de conexion: **Connect › Direct connection**, o el
      **Session pooler** (puerto **5432**). El transaction pooler (6543) **no sirve**
      para migraciones: no admite sentencias preparadas ni DDL en transaccion larga.
- [ ] Guardar esa cadena y la contrasena en tu gestor de contrasenas o en
      `.env.production.local` (ignorado por git). **No** en `.env.example` ni en el chat.
- [ ] Estar en la raiz del repo, con el arbol limpio y en `main` actualizado.

---

## Fase 1 · Esquema

Una sola orden, y **sin `supabase link`**:

```bash
npx supabase db push --db-url "postgresql://postgres.<REF_PROD>:<PASSWORD>@<HOST>:5432/postgres"
```

Se usa `--db-url` a proposito: `supabase link` reescribe `supabase/.temp/project-ref`, y
con el enlace apuntando a produccion, `npm run supabase:types` —que usa `--linked`—
regeneraria `lib/supabase/database.types.ts` contra produccion sin avisar.

<details>
<summary>Camino alternativo con <code>link</code>, si prefieres no manejar la cadena</summary>

```bash
npx supabase link --project-ref <REF_PROD>
npx supabase db push
npx supabase link --project-ref nlfwqnmidfdohuyhklqp   # OBLIGATORIO: volver a desarrollo
```

El tercer comando no es opcional. Sin el, el repo se queda enlazado a produccion.

</details>

El push aplica las 15 migraciones **en orden**. Lo que deja:

- `public.games`, `public.scores` y `public.profiles`, con sus indices y sus `check`.
- Las tres vistas `top_scores`, `player_bests` y `public_scores`, con
  `security_barrier = true` y su columna `mine` calculada.
- RLS y politicas (SPEC 06, 15, 19) y los **grants minimos** (SPEC 18 y 19).
- El `alter default privileges` que hace que una tabla nueva nazca **sin ningun permiso**.
- Las funciones `handle_new_user()`, `rls_auto_enable()` y `username_libre()`, con el
  trigger sobre `auth.users` y el event trigger `ensure_rls`.
- El catalogo: las cinco maquinas con sus nueve columnas.

**Las 90 marcas sembradas por `20260804210500_leaderboard_seed.sql` se insertan y las
borra `20260805034110_solo_asteroids.sql` dentro del mismo push.** No hay que hacer nada:
produccion acaba con `scores` vacia.

---

## Fase 2 · Datos

No hay nada que copiar. Solo comprobar, en el editor SQL del panel de produccion:

```sql
select
  (select count(*) from public.games)    as games,     -- esperado: 5
  (select count(*) from public.scores)   as scores,    -- esperado: 0
  (select count(*) from public.profiles) as profiles;  -- esperado: 0
```

Y que el catalogo es el correcto:

```sql
select id, title, cat, playable, sort_order from public.games order by sort_order;
-- asteroids / tetris / arkanoid / snake / frogger, los cinco playable, 0..4
```

---

## Fase 3 · Configuracion del panel

Toda la configuracion de Auth vive en el panel y **no** en el repo. Sigue
[`panel-checklist.md`](./panel-checklist.md), que trae los valores literales.

**`supabase config push` no se corre nunca**, ni contra desarrollo ni contra produccion:
`supabase/config.toml` tiene los valores por defecto del CLI en `site_url` y
`additional_redirect_urls`, asi que empujarlo arrasaria la Site URL, las dos URLs de
redireccion, las dos plantillas de correo y los dos proveedores con sus secretos.

---

## Fase 4 · Variables del despliegue

En el host (Vercel, o el que sea), como variables de entorno de produccion:

```
NEXT_PUBLIC_SUPABASE_URL=https://<REF_PROD>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
RESEND_API_KEY=re_...
```

Las tres de Supabase salen de **Project Settings › API Keys** del proyecto de produccion.
La plantilla vacia esta en `.env.production.example`.

Dos avisos:

- **`SUPABASE_DB_PASSWORD` no se sube al host.** Es solo para el CLI, y el runtime no la
  usa.
- **Sin `RESEND_API_KEY` el formulario de `/acerca-de` finge el envio**: valida, registra
  el mensaje en la consola del servidor y devuelve exito. En produccion eso significa que
  los mensajes se pierden en silencio y solo lo delata ese registro.
- El origen que pongas aqui tiene que ser **el mismo** que la Site URL de la fase 3. Con
  una Site URL equivocada la cuenta se confirma igual, pero el enlace del correo no
  vuelve al sitio.

---

## Fase 5 · Verificacion

### 5.1 · Conexion

```
GET <ORIGEN_PROD>/api/supabase-health   ->   200 {"ok":true}
```

Un `503 {"ok":false, reason}` nombra que falta. Nunca imprime claves.

### 5.2 · Permisos, en el editor SQL del panel (solo lectura)

Los grants de `anon` y `authenticated`. Es lo que dejaron SPEC 18 y SPEC 19, y cualquier
fila de mas es un hallazgo:

```sql
select table_name, grantee, privilege_type, column_name
from information_schema.role_column_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
union all
select table_name, grantee, privilege_type, null
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;
```

Lo esperado, y nada mas:

| Objeto          | `anon`                                                      | `authenticated` |
| --------------- | ----------------------------------------------------------- | --------------- |
| `games`         | SELECT                                                      | SELECT          |
| `scores`        | INSERT en `game_id, player_name, score, device_id, user_id` | lo mismo        |
| `profiles`      | **nada**                                                    | SELECT, INSERT  |
| `top_scores`    | SELECT                                                      | SELECT          |
| `player_bests`  | SELECT                                                      | SELECT          |
| `public_scores` | SELECT                                                      | SELECT          |

Que `public.scores` **no** tiene SELECT para esos dos roles:

```sql
select count(*) as debe_ser_cero
from information_schema.role_table_grants
where table_schema='public' and table_name='scores'
  and grantee in ('anon','authenticated') and privilege_type='SELECT';
```

Que ninguna vista devuelve `user_id`:

```sql
select table_name, column_name
from information_schema.columns
where table_schema='public'
  and table_name in ('top_scores','player_bests','public_scores')
  and column_name = 'user_id';   -- esperado: cero filas
```

Que el ACL por defecto no reparte nada a los dos roles publicos:

```sql
select defaclrole::regrole, defaclobjtype, defaclacl
from pg_default_acl
where array_to_string(defaclacl, ',') like '%anon%'
   or array_to_string(defaclacl, ',') like '%authenticated%';
-- esperado: cero filas
```

Que la RLS esta activa en las tres tablas:

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relkind='r';
-- games, scores, profiles: relrowsecurity = true
```

Que estan las tres funciones, el trigger y el event trigger:

```sql
select proname, prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by 1;
-- handle_new_user, rls_auto_enable, username_libre; los tres security definer

select tgname from pg_trigger where not tgisinternal;
select evtname from pg_event_trigger where evtname = 'ensure_rls';
```

### 5.3 · Prueba de humo, en este orden

Cada paso depende del anterior:

- [ ] Alta con correo y contrasena desde `<ORIGEN_PROD>/cuenta`.
- [ ] Llega el correo y **el enlace no dice «enlace caducado»** (si lo dice, la plantilla
      del punto 4 del checklist esta sin tocar).
- [ ] Confirmar, volver al sitio y ver el perfil con su nombre.
- [ ] Jugar una partida y firmar la marca. Aparece en `/salon` y en `/juego/[id]`.
- [ ] Cerrar sesion y entrar con **Google**. Vuelve a `/cuenta` y pide elegir nombre.
- [ ] Cerrar sesion y entrar con **GitHub**. Igual.
- [ ] Recuperar contrasena: pedirla, seguir el enlace, escribir una nueva y entrar.
- [ ] Con la sesion cerrada, comprobar en las herramientas del navegador que el HTML de
      `/`, `/salon`, `/biblioteca` y `/juego/[id]` **no contiene la cadena `user_id`**.

**Ojo con la cuota de correo**: el plan gratuito son **dos correos por hora**, y esta
prueba gasta dos (alta y recuperacion). Al agotarla, Supabase responde
`429: email rate limit exceeded`.

### 5.4 · Security Advisor

Panel › Advisors › Security. El unico aviso esperado es el de **contraseñas filtradas**
si el plan no permite activarlo. Cualquier otro se investiga antes de abrir el sitio.

---

## Fase 6 · Registro

- [ ] Anotar en `references/Security/security-checklist.md` el estado del proyecto de
      produccion, con fecha.
- [ ] Anadir a la tabla **Afirmaciones** de `.claude/security-auditor/hallazgos.md` lo
      que se configuro en el panel de produccion y no se puede medir desde el repo: los
      tres ajustes de Auth, la Site URL, las dos Redirect URLs, las dos plantillas de
      correo y el veredicto sobre contraseñas filtradas. Sin esa fila, el agente
      propondria «arreglarlo» en cada ronda.
- [ ] Guardar el ref de produccion en `.claude/prod-ref.txt` (ignorado por git) para que
      el hook `guard-prod.sh` lo bloquee por nombre ademas de por patron.

---

## Despues: como se aplica un cambio a produccion

El mismo camino, siempre:

1. La migracion se escribe y se aplica **primero en desarrollo** con
   `npx supabase db push`.
2. Se verifica ahi.
3. Se aplica en produccion repitiendo la **fase 1** de este documento.

Nunca al reves, y nunca con `apply_migration` por MCP: iria al proyecto remoto sin dejar
rastro en `supabase/migrations/`.

**Y no se crean tablas, vistas ni funciones desde el editor SQL del panel.** El
`alter default privileges` de `20260817020000_permisos_minimos.sql` solo cubre las filas
de `pg_default_acl` del rol `postgres`; un objeto creado desde el panel lo crea otro rol
y **nace abierto a `anon` y `authenticated`**. Es el hallazgo `serio` que el
`security-auditor` dejo abierto, y en produccion cuesta mas caro. Todo objeto nuevo entra
por migracion.

## Lo que este runbook deja pendiente

- **SMTP propio.** Dos correos por hora no dan para usuarios reales. Es su propia spec.
- **`Content-Security-Policy`.** No esta en `next.config.ts` porque necesita un `nonce`
  por peticion para los scripts en linea de Next. Tambien es su propia spec, y es la que
  sustituira el `X-Frame-Options: DENY` por `frame-ancestors 'none'`.
