# Cómo se audita

La receta de las Fases 3, 4 y 5 del agente `security-auditor`: qué se mira en el repo, qué se
pregunta a la base de datos, y cómo se verifica lo averiguado. **Se lee justo antes de auditar, no
en la Fase 0.**

Existe porque el agente audita una vez y muere, y porque la mitad de lo que tiene que comprobar
**no está en el repo**: está en un proyecto remoto al que sólo se le puede preguntar. Reconstruir
la consulta correcta cada ronda es la forma segura de que dos rondas midan cosas distintas.

**Lo que manda es lo que hay en disco y en la base.** Las consultas de abajo no son ideas: están
ejecutadas contra `nlfwqnmidfdohuyhklqp` y su salida se conoce. Se copian tal cual.

---

## El reparto: qué se mira dónde

| Alcance       | Dónde vive                                                                                          | Cómo se mira                                 |
| ------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| El repo       | `app/`, `lib/`, `components/`, `proxy.ts`, `next.config.ts`, `supabase/migrations/`, `package.json` | `Read` y `Grep`, más `Bash` para `npm audit` |
| La base       | El proyecto remoto                                                                                  | Las siete consultas y los dos advisors       |
| El panel      | Fuera de todo alcance                                                                               | **Afirmación fechada en el ledger**          |
| El despliegue | No existe todavía                                                                                   | Nada. No se inventa                          |

**La tercera fila es la que distingue a este agente**, y la que más fácil se olvida: cuando algo
sólo vive en el panel de Supabase, la respuesta correcta no es deducirlo del repo ni sondear el
servidor, es **pedir que alguien lo mire y anotarlo con fecha**.

---

## P1 · Lo que se mira en el repo

Ocho `Grep` con su regla. Todos con `-n`, porque el ancla de un hallazgo es `archivo:linea`.

| #   | Qué se busca                                                       | Dónde                                                       | Qué regla caza                                                           |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | `as EmailOtpType\|as [A-Z][A-Za-z]*\|searchParams.get\|params.get` | `app/auth/`                                                 | G9 — casts sobre parámetros de query                                     |
| 2   | `\.select\(`                                                       | `lib/`, `app/`, `components/`                               | G5 — qué columnas viajan, y si hay algún `select("*")`                   |
| 3   | `process\.env`                                                     | `app/`, `lib/`, `components/`, `proxy.ts`, `next.config.ts` | G6 — lecturas fuera del módulo canónico                                  |
| 4   | `getSession\(\)\|getUser\(\)`                                      | `app/`, `proxy.ts`, `lib/`                                  | G4 — que la decisión de servidor use `getUser()`                         |
| 5   | `"use server"` y `route.ts`                                        | `app/`                                                      | G4 — el censo de puntos de entrada, para que no aparezca uno sin auditar |
| 6   | `poweredByHeader\|process\.argv\|Strict-Transport`                 | `next.config.ts`                                            | G10 — las cabeceras y su interruptor                                     |
| 7   | `PROTEGIDAS\|matcher`                                              | `proxy.ts`                                                  | G11 — el pre-filtro y su perímetro                                       |
| 8   | `next/image\|remotePatterns`                                       | `app/`, `components/`, `next.config.ts`                     | G12 — la condición de ascenso de `sharp`                                 |

Y tres comprobaciones de `Bash`, todas de sólo lectura:

```bash
npm audit --json                    # G12: el censo entero
npm audit --omit=dev                # G12: cuáles tienen ruta en producción
git log --all --diff-filter=A --name-only | grep -i "\.env"   # G6: ningún .env versionado nunca
```

**Cuatro cosas que el grep no va a resolver y hay que perseguir a mano:**

- **Si una columna que viaja se usa en pantalla.** El grep dice que `user_id` está en el `select`;
  que nadie lo pinte lo dice leer el componente. Es la diferencia entre G5 y un falso positivo.
- **Si una excepción está declarada.** `player_name` viene del cliente sin sesión y es
  intencionado; el comentario que lo dice está tres líneas más arriba del código que lo hace.
- **Si un `as` es sobre un valor externo.** Un cast sobre una constante del propio archivo no es
  G9. Sólo cuenta lo que entra por la petición.
- **Si una decisión existe pero está en el sitio equivocado.** Un motivo escrito en un comentario
  de `.tsx` no es un registro auditable: es un hallazgo de G8 con nota «decidido, sin registrar».

**La lista de hallazgos la cierra el agente, no el grep.**

**Lo que no se lee:** `references/started-games/`, `references/templates/`, `lib/games/` y
`demos/`. Los motores no hablan con la red, no leen `process.env`, no tocan la base y no montan
React: no tienen superficie que auditar, y son miles de líneas de aritmética que sólo queman
contexto.

**La excepción, y es una sola:** si un motor estrenara una carga de archivo o una llamada de red,
entra por G6. Hoy el único que carga algo es `snake`, y es un PNG del propio `public/`.

---

## P2 · Las siete consultas

Todas con `mcp__supabase__execute_sql`. Todas `select` puro, salvo SQL 7, que es el trío
`begin` / `set local role` / `select` / `rollback`. **Ninguna necesita un permiso que el MCP no
tenga.**

### SQL 1 · RLS y número de políticas por objeto → **G1**

```sql
select c.relname as objeto,
       c.relkind as tipo,
       c.relrowsecurity as rls_habilitada,
       c.relforcerowsecurity as rls_forzada,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as n_politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p','v','m','f')
order by c.relkind, c.relname;
```

Salida conocida: `games`, `profiles` y `scores` con `rls_habilitada = true` y 1, 2 y 2 políticas;
`player_bests` y `top_scores` con `false` y cero. **Las dos vistas en `false` no son un hallazgo**:
lo que las cubre es `security_invoker`, que se lee en SQL 6. `rls_forzada` en `false` en las cinco
es lo esperado y está decidido.

### SQL 2 · Todas las políticas, con roles y predicados → **G1**

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
```

Salida conocida: cinco filas, todas `PERMISSIVE`. `catalogo publico` (games, SELECT, `true`),
`marcador publico` (scores, SELECT, `true`), `firmar una marca` (scores, INSERT, con el
`with_check` de `seeded = false` y `user_id` nulo o propio), `perfiles publicos` (profiles,
SELECT, `true`) y `crear mi perfil` (profiles, INSERT, `id = auth.uid()`). **Ni una de UPDATE o
DELETE en todo `public`**, y es intencionado.

### SQL 3 · Privilegios de `anon` y `authenticated`, agregados → **G2**

```sql
select grantee,
       table_name,
       string_agg(distinct privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated','service_role','public')
group by grantee, table_name
order by grantee, table_name;
```

Salida conocida: **diez filas** entre los dos roles. `anon` → games SELECT, player_bests SELECT,
profiles SELECT, scores INSERT + SELECT, top_scores SELECT. `authenticated` → lo mismo más
profiles INSERT. `service_role` con los siete verbos, que no se toca. **Cero filas para `public`.**

### SQL 4 · Funciones `security definer` → **G3**

```sql
select p.proname as funcion,
       pg_get_userbyid(p.proowner) as duenio,
       p.prosecdef as security_definer,
       p.proconfig as config,
       coalesce(array_to_string(p.proacl, ' | '), 'NULL (hereda PUBLIC EXECUTE)') as acl,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.prosecdef desc, p.proname;
```

Salida conocida: dos filas, `handle_new_user` (`search_path=""`) y `rls_auto_enable`
(`search_path=pg_catalog`), las dos con ACL `postgres=X | service_role=X` y **`false` en las dos
columnas de `has_function_privilege`**.

**El `coalesce` y las dos últimas columnas son lo que hace útil esta consulta.** Un `proacl` nulo
significa «ACL de fábrica», y la de fábrica de una función es `PUBLIC EXECUTE`: leyendo la columna
a ojo, una función publicada pasaría por cerrada. **G3 se decide con `has_function_privilege`, no
con `proacl`.**

### SQL 5 · `pg_default_acl` del esquema `public` → **G2, segunda mitad**

```sql
select n.nspname as esquema,
       coalesce(pg_get_userbyid(d.defaclrole), '-') as rol_creador,
       case d.defaclobjtype when 'r' then 'tabla' when 'S' then 'secuencia'
            when 'f' then 'funcion' when 'T' then 'tipo' when 'n' then 'esquema' end as tipo_objeto,
       coalesce(array_to_string(d.defaclacl, ' | '), 'sin acl') as acl_por_defecto
from pg_default_acl d
join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'public'
order by rol_creador, tipo_objeto;
```

Salida conocida: **seis filas**. Las tres de `postgres` ya sólo listan `postgres` y
`service_role` —la migración funcionó—. Las **tres de `supabase_admin` siguen concediendo
`arwdDxtm`, `rwU` y `X` a `anon` y `authenticated`**.

**G2 se decide con las filas de `postgres`.** Las de `supabase_admin` son el hallazgo de la fuga:
un objeto creado desde el panel, y no por migración, nace abierto. Se anota una vez y después es
nota permanente.

### SQL 6 · Columnas y opciones de las vistas → **G5, y desactiva el falso positivo de G1**

```sql
select c.relname as vista,
       (select string_agg(a.attname, ', ' order by a.attnum)
          from pg_attribute a
         where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as columnas,
       coalesce(c.reloptions::text, 'sin opciones') as opciones
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('v','m')
order by c.relname;
```

Salida conocida: `player_bests` con cinco columnas y `top_scores` con **nueve** —las de `scores`
más `rank`—, las dos con `{security_invoker=true}`.

Sirve para dos cosas a la vez, y por eso va siempre: **delata G5**, porque `top_scores` republica
`user_id` y `anon` tiene SELECT sobre ella; y **cierra G1**, porque ese `security_invoker=true` es
lo que hace que el `rls_habilitada = false` de SQL 1 no sea un hallazgo.

### SQL 7 · El acceso efectivo **como `anon`** → **G5, G2**

```sql
begin;
set local role anon;
select current_user as rol,
       count(*) as filas_visibles,
       count(distinct user_id) as user_ids_distintos,
       count(distinct device_id) as device_ids_distintos
from public.scores;
rollback;
```

```sql
begin;
set local role anon;
select current_user as rol,
       count(*) as perfiles_visibles,
       count(distinct id) as uuids_de_cuenta_visibles,
       has_table_privilege('public.scores','UPDATE') as puede_update_scores,
       has_table_privilege('public.scores','DELETE') as puede_delete_scores,
       has_table_privilege('public.scores','TRUNCATE') as puede_truncate_scores,
       has_table_privilege('public.games','INSERT') as puede_insert_games
from public.profiles;
rollback;
```

Salida conocida: 6 marcas visibles con **0 `user_id`** y 3 `device_id`; **2 perfiles y 2 UUID de
cuenta visibles**; y `false` en los cuatro privilegios.

**Ésta es la consulta que separa auditar la configuración de auditar el resultado.** Las seis
primeras leen el catálogo, que es lo que _debería_ pasar; ésta mide lo que _pasa_, con el mismo rol
que hay al otro lado de la clave publicable. Es la lección que `reglas-movil.md` ya tiene escrita
para las pantallas: se mide, no se mira.

Y una advertencia que va con ella: que `user_ids_distintos` sea 0 hoy **no es una defensa**, es que
todavía ninguna marca se ha firmado con cuenta. La primera que se firme llena ese hueco sola.

### Las tres de apoyo, para el drift

```sql
select e.evtname as nombre, 'event_trigger: ' || e.evtevent as ambito, e.evtenabled::text as estado, p.proname as funcion
from pg_event_trigger e join pg_proc p on p.oid = e.evtfoid
union all
select t.tgname, 'tabla: ' || n.nspname || '.' || c.relname, t.tgenabled::text, p.proname
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and n.nspname in ('public','auth')
order by 1;
```

**El `::text` de las dos ramas no es adorno**: `tgenabled` y `evtenabled` son `"char"`, y sin él el
`union` falla con `42804 UNION types "char" and text cannot be matched`.

Salida conocida: el event trigger **`ensure_rls`** (que dispara `rls_auto_enable`) y
`on_auth_user_created` sobre `auth.users`, más seis event triggers de la plataforma
—`issue_graphql_placeholder`, `issue_pg_cron_access`, `issue_pg_graphql_access`,
`issue_pg_net_access`, `pgrst_ddl_watch`, `pgrst_drop_watch`— que **no son drift**.

```sql
select n.nspname as esquema, string_agg(e.extname, ', ' order by e.extname) as extensiones
from pg_extension e join pg_namespace n on n.oid = e.extnamespace
group by n.nspname order by 1;
```

Salida conocida: `extensions`, `pg_catalog` y `vault`. **Ninguna en `public`**, así que el lint
`extension_in_public` no aplica aquí y no hace falta volver a mirarlo cada ronda.

Y `mcp__supabase__list_migrations` contra `Glob supabase/migrations/*.sql`: las trece coinciden en
`version` y `name`. Lo que hay que buscar es lo contrario —objetos en la base que ninguna migración
crea—, y hoy son **dos y son el mismo par**: `rls_auto_enable()` y su event trigger `ensure_rls`.
De los dos, el documentado es la función; **el disparador no lo nombra ni una spec**.

### Los dos advisors

```
mcp__supabase__get_advisors  type: "security"
mcp__supabase__get_advisors  type: "performance"
```

Salida conocida: en seguridad, **uno solo**, `auth_leaked_password_protection`, que es el bloqueado
por plan. En rendimiento, tres: dos `auth_rls_initplan` —sobre las políticas de `scores` y
`profiles`— y un `unused_index` sobre `scores_user_id_idx`.

**Los cuatro se contrastan contra la tabla de Afirmaciones antes de anotarlos.** El de contraseñas
filtradas ya está aceptado y fechado: proponerlo otra vez es el error que
`references/Security/security-checklist.md` avisa por escrito que alguien va a cometer dos veces.
Los tres de rendimiento no son de este agente y van a la línea base, no a hallazgos.

---

## P3 · Verificación — siete pasos

Los tres primeros van **antes** de anotar nada.

**V0 · El contexto.** Fecha de hoy, rama actual, y `git status --short` para saber si el árbol
está limpio. Un hallazgo anclado sobre trabajo sin commitear caduca en cuanto alguien descarte el
cambio.

**V1 · El MCP contesta.** Una llamada barata —`list_migrations`— antes de las siete consultas. Si
no contesta, se salta a «Si el MCP no está».

**V2 · La línea base.** Leer el ledger y las Afirmaciones. Lo que ya está decidido no se vuelve a
proponer.

**V3 · Cada hallazgo tiene ancla y reproductor.** Un `archivo:linea` **o** un número de consulta.
Si no se puede escribir ninguno de los dos, no es un hallazgo: es una impresión.

**V4 · Cada hallazgo tiene su `cadena`.** El trozo de texto por el que la próxima ronda lo va a
encontrar cuando Prettier haya movido las líneas. Para los de base, la `cadena` es `SQL n`.

**V5 · Cada gravedad se justifica con la conjunción.** «¿Hace falta cuenta?» y «¿cambia o expone
datos?». Si las dos respuestas no están claras, la gravedad no está decidida.

**V6 · Ninguna fila lleva un dato de la base.** Se cuenta o se enmascara. El ledger va versionado
en git, y lo que se escriba ahí sale del proyecto con el repo.

### Si el MCP no está

Se degrada y se dice en la primera línea de la respuesta. **G1, G2, G3 y la mitad de G5 quedan en
`no-verificable`**, y ninguna regla de base pasa a `conforme`: leer las migraciones no es
auditar la base, que es justamente lo que el drift de `ensure_rls` demuestra. Las reglas del repo
—G4, G6 a G12— se auditan igual, y la ronda vale para eso.

### Si hay que ver las cabeceras en vivo

`curl -sI http://localhost:3000/` sobre un servidor **recién reiniciado**. `next.config.ts` no se
recarga en caliente, así que contra un servidor viejo devuelve las cabeceras anteriores, y eso es
un falso negativo silencioso. Si no consta que se haya reiniciado, se lee el archivo y no se
`curl`ea.

---

## Tres cosas que no son negociables

**No se arregla nada.** Este agente audita. Un `Edit` sobre `lib/`, `app/`, `supabase/` o
`next.config.ts` no es celo, es salirse del oficio: el arreglo entra por una spec, que es donde se
discute el coste y las alternativas. Lo único que se escribe es el ledger.

**No se escribe en la base.** `execute_sql` acepta `select`, y el trío con `set local role` dentro
de `begin` … `rollback`. Nada más — un `do $$ … $$` es DDL aunque parezca un bloque inocente, y el
repo tiene uno como ejemplo a imitar en `20260817020000_permisos_minimos.sql`. Aquí no hay `git
revert`: lo dice la propia migración en su cabecera.

**No se sacan datos.** Ni al informe ni al ledger. Se cuenta, se agrega o se enmascara. Auditar la
privacidad de los UUID de cuenta y volcar esos mismos UUID en un archivo versionado sería el
chiste más caro de la casa.
