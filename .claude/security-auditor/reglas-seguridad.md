# Reglas de seguridad

Qué es una regla conforme en Arcade Vault, cómo se gradúa un hallazgo y las doce reglas con las
que el agente `security-auditor` audita el repo y la base de datos. **Se lee en la Fase 0, y sin
él la auditoría no tiene contra qué comparar.**

Ninguna regla es una opinión: cada una sale de un archivo del repo o de una consulta que la
comprueba hoy. Si algún día ese archivo cambia —llega la spec de CSP, aparece una tabla nueva,
alguien mete `next/image`—, cambia la regla, y los hallazgos cerrados por ella se pueden reabrir.

**El alcance son cinco ejes**: la base de datos, el límite servidor/cliente, las cuentas, el
navegador, y la cadena de suministro. Fuera queda todo lo que no se pueda medir desde aquí o
desde la base: el despliegue, la red, el aparato de quien juega.

**Y hay una frontera que este agente comparte con nadie más de la casa: el panel de Supabase.**
Tres cosas que esta lista quiere comprobar —la política de contraseña real, el allow-list de
Redirect URLs y las plantillas de correo— viven ahí, y el MCP no las expone. No se inventan y no
se dan por buenas: se cierran con **afirmaciones fechadas** en el ledger, que es lo que ya hace
`references/Security/security-checklist.md` con la casilla bloqueada por plan.

**Ojo con las líneas de este archivo.** Las anclas se verificaron el 2026-08-17. El hook
`PostToolUse` del repo pasa Prettier tras cada escritura y **los números se mueven solos**: si un
ancla no cuadra, se busca la `cadena` y se corrige la regla, no al revés. Las reglas de base de
datos no tienen ese problema, y por eso su ancla es **el número de consulta** de
`auditar-seguridad.md`: una consulta no se reformatea.

---

## Qué es un hallazgo

Un **hallazgo** es una discrepancia entre lo que una regla exige y lo que el repo o la base hacen,
anclada en un `archivo:linea` concreto **o** en la consulta que la reproduce. No es una
impresión: «la Server Action parece insegura» no es un hallazgo; «`app/auth/confirmar/route.ts:42`
castea `type` sin lista cerrada y decide destino en `:59`» sí. Un hallazgo sin ancla no se puede
reconciliar en la ronda siguiente, y por eso no existe.

Una regla está **conforme** cuando no le queda ningún hallazgo abierto **de los que el agente
sabe ver**. No está «segura»: está conforme con lo que esta lista sabe preguntar hoy.

**Un hallazgo de base de datos se mide, no se deduce del código.** Es la diferencia con una
cabecera, que se lee con un `Read`: un permiso es un **estado remoto**, y el repo ya tiene la
prueba de que las dos cosas se separan —`rls_auto_enable()` existe en la base y en ninguna
migración—. Leer las migraciones no basta.

## Las tres gravedades

| Gravedad  | Cuándo                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------- |
| `critico` | Alcanzable desde internet con la clave publicable y sin cuenta **y** cambia o expone datos      |
| `serio`   | Necesita una condición previa: una cuenta, un error del servidor, un despliegue concreto        |
| `menor`   | Defensa en profundidad. No hay ruta desde internet hoy, y la fila lleva su condición de ascenso |

**`critico` pide las dos cosas a la vez, y la conjunción es la regla.** Sin ella, `menor` se lo
come todo o `critico` se lo come todo. Un `insert` ilimitado sin cuenta cambia datos pero no
altera ni expone lo ajeno: es `serio`. Un UUID de cuenta legible por `anon` no cambia nada pero
lo expone: es `critico`.

**Gravedad y decisión son columnas distintas.** El WARN de contraseñas filtradas no es «menor»:
es `serio` y **aceptado por plan**. Confundirlas hace que el ledger mienta sobre el riesgo o
esconda la decisión.

---

## Las doce reglas — G1 a G12

Se responden con «sí» o «no». **Un solo «no» deja la regla en `con-hallazgos`, nunca en
`conforme`**, con el motivo citando la regla y el ancla (`G5: lib/leaderboard.ts:115 manda
user_id a anon`).

**Una sola pasada, y es eliminatoria.** No hay nota ponderada como en `rubrica.md`, y no es un
olvido: aquélla pondera para **ordenar candidatos que compiten**, y aquí no compite nadie —las
doce reglas hay que satisfacerlas todas—. Una nota además invitaría a publicar «vamos por el 80%
de seguridad», que no significa nada.

Los cinco bloques que siguen sólo ordenan la lectura. No puntúan.

---

### La base de datos — G1, G2, G3

### G1 · Toda tabla de `public` tiene RLS y cada política dice a quién deja hacer qué

**Pasa si** las tres tablas de `public` dan `relrowsecurity = true` en SQL 1, y cada política de
SQL 2 nombra sus roles y trae `qual` o `with_check` explícito. **Falla si** hay una tabla con RLS
apagada, o una política `to public` sin acotar, o una tabla con RLS y **cero** políticas, que es
una tabla muda: deniega todo y nadie sabe si era la intención.

Lo impone `supabase/migrations/20260804205829_leaderboard_schema.sql:44-49` para `games` y
`scores`, y `20260816232343_auth_profiles.sql:30` para `profiles`.

**Dos excepciones que van escritas aquí, o se redescubren cada ronda.**

La primera: **una vista da `relrowsecurity = false` y no es un fallo.** `top_scores` y
`player_bests` no llevan RLS propia —ninguna vista la lleva—; lo que las cubre es
`security_invoker = true`, que hace que su lectura se compruebe contra quien pregunta y contra la
RLS de `scores`, su tabla base. Eso se lee en **SQL 6**, no en SQL 1. Sin esta excepción, G1
produce dos falsos positivos garantizados en cada ronda.

La segunda: **`force row level security` no se pide.** Está descartado con motivo en
`20260817020000_permisos_minimos.sql:136-144`, y el motivo es bueno: hoy es un no-op —sólo cambia
el comportamiento del propietario, que es `postgres`, y `postgres` tiene `rolbypassrls`— y mañana
sería un cepo, porque sin políticas de `update` rompería a la vez la edición del catálogo desde el
panel y cualquier `db reset`. Proponerlo es desandar una decisión escrita.

### G2 · Los permisos son la lista de lo que usa el código, y una tabla nueva nace sin ninguno

**Pasa si** SQL 3 devuelve exactamente los diez pares rol/relación que el código necesita —`games`
SELECT, `scores` SELECT + INSERT, `profiles` SELECT más INSERT de `authenticated`, y SELECT en las
dos vistas— y ni un `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` o `TRIGGER` para `anon` o
`authenticated`. **Falla si** aparece un verbo de más, una relación de más, o una relación con
política y sin `grant`, que responde `permission denied` en vez de una lista vacía.

Lo impone `20260817020000_permisos_minimos.sql:31` —el `revoke all`— y sus seis `grant` de
`:35-55`. La segunda mitad de la regla, «nace sin ninguno», la impone `:121-130` con
`alter default privileges`.

**La trampa está en `pg_default_acl`, y es la razón de que SQL 5 exista.** Esa tabla tiene **dos
filas por tipo de objeto**, una por rol creador. La migración cerró las de `postgres`, que es
quien corre las migraciones. Las de **`supabase_admin` siguen concediendo `arwdDxtm` a `anon` y
`authenticated`**, así que un objeto creado desde el panel de Supabase —no por migración— nace
abierto a los dos roles que salen a internet.

La regla, por tanto: **filtra por `defaclrole = 'postgres'` para decidir si pasa**, y la fila de
`supabase_admin` va como hallazgo con su ancla en SQL 5, una sola vez, y después como nota
permanente. Anotarla cada ronda sería ruido; ignorarla sería esconder la excepción exacta que
SPEC 18 creía haber cerrado.

**Y la regla de flujo que esto deja escrita**, que ya está en `CLAUDE.md`: toda spec futura con
tabla escribe su `grant select` al lado de su `create policy`. Una tabla sin `grant` no es un
descuido de esta lista, es el comportamiento correcto funcionando.

### G3 · Ninguna `security definer` es llamable desde `/rest/v1/rpc/`, y todas fijan `search_path`

**Pasa si**, en SQL 4, toda función de `public` con `prosecdef = true` da `false` en
`has_function_privilege()` para `anon` y para `authenticated`, y trae un `search_path` en su
`proconfig`. **Falla si** una da `true`, o si su `proconfig` es nulo.

Lo impone `20260817020000_permisos_minimos.sql:80` para `handle_new_user()` y `:89-104` para
`rls_auto_enable()`, con la guarda `do $$ ... if exists` que hace que la migración valga también
para una base desde cero. El `search_path = ''` lo fijan `20260816232343_auth_profiles.sql:59` y
`20260817000000_perfil_opcional.sql:23`.

**La precisión que hace falta: `proacl` a `NULL` no significa «sin permisos».** Significa «ACL de
fábrica», y la de fábrica de una función es **`PUBLIC EXECUTE`**. Una función nueva con ACL nulo
está publicada en la API, y leyendo `proacl` a ojo pasaría por buena. Por eso la regla se
verifica con `has_function_privilege()` y **nunca** leyendo la columna.

**El aviso que la migración deja escrito y esta regla repite**: si algún día hay que recrear
`handle_new_user()`, se hace con `create or replace` —que **conserva** el ACL— y nunca con `drop`
más `create`, que lo devolvería al de fábrica y reabriría el agujero en silencio. Un `drop
function` en una migración nueva es motivo suficiente para reabrir G3.

---

### El límite servidor/cliente — G4, G5, G6

### G4 · Ningún punto de entrada se fía de su parámetro, y la identidad la pone `getUser()`

**Pasa si** cada Server Action y cada Route Handler revalida lo que recibe —rango, formato,
existencia— y, cuando hay sesión, saca la identidad de `supabase.auth.getUser()` y no de lo que
llegó por parámetro. **Falla si** un valor del cliente decide a quién se atribuye algo, o si se
usa `getSession()` en servidor para tomar una decisión: ése se cree la cookie en vez de validar el
token contra Supabase.

Lo impone `app/jugar/[id]/actions.ts:86-88` —`getUser()` con su comentario— y `:110-111`, donde
`signer` sale del perfil y nunca del parámetro. La validación de forma está en `:61-69`
(la máquina contra `public.games`), `:71-73` (el rango) y `:79` (el `device_id` contra el regex
UUID).

**Dos excepciones declaradas, o el agente las marca como fallo cada ronda.** Sin sesión, el
`player_name` **sí** viene del cliente: se normaliza en `:115` y lo acota el `CHECK
scores_name_length` de la tabla. Y la puntuación **no se comprueba que sea alcanzable**; lo dice
`app/jugar/[id]/actions.ts:27-29` con todas las letras: el marcador es falsificable y se acepta.
Las dos son decisiones escritas, no descuidos.

**Lo que sí falla hoy** es que ese mismo punto de entrada no tiene **ningún límite de frecuencia**,
y `anon` tiene INSERT sobre `scores` (SQL 3). Está declarado fuera de alcance en
`specs/18-endurecer-seguridad.md`, así que entra al ledger como hallazgo con decisión, no como
sorpresa.

### G5 · Al navegador sólo viaja lo que hace falta ver

**Pasa si** ninguna consulta usa `select("*")`, todas nombran sus columnas, y ninguna columna que
viaja al cliente es un identificador interno sin uso en pantalla. **Falla si** una fila que llega
al navegador lleva un identificador de cuenta, un correo o cualquier dato que la pantalla no
pinta.

Y tiene una segunda mitad que es la que de verdad muerde: **la columna no viaja sólo en el
bundle, viaja en PostgREST.** Un `grant select` es de tabla entera y una política `using (true)`
no filtra columnas, así que cualquiera con la clave publicable puede pedirla directamente. Por eso
la regla se comprueba con el `Grep` de `.select(` **y** con SQL 6 y SQL 7: lo primero dice qué
pide el código, lo segundo qué se puede pedir.

**Hoy falla.** `lib/leaderboard.ts:115`, `:137`, `:177` y `:203` seleccionan `user_id`;
`:104` y `:218` lo pasan al DTO; `lib/scores.ts:27`, `:41` y `:56` lo declaran en tres tipos
isomorfos que consumen componentes de cliente. Es el UUID de `auth.users` de cada jugador firmado,
serializado en el HTML de cuatro pantallas públicas. Y `top_scores` republica las nueve columnas
de `scores` (SQL 6), así que también se pide directo.

Está ahí por un motivo real: `lib/session.tsx:218` lo usa para resaltar «esta marca es mía». La
regla no dice cómo arreglarlo —eso es una spec—, dice que hoy no pasa.

### G6 · La clave secreta no cruza al navegador ni al repo, y `process.env` se lee en un solo sitio

**Pasa si** ninguna variable con prefijo `NEXT_PUBLIC_` contiene un secreto, ninguna lectura de
`process.env` de Supabase vive fuera de `lib/supabase/env.ts`, `.gitignore` excluye `.env*` salvo
el ejemplo, y el historial de git no tiene ni un `.env` ni una clave. **Falla si** aparece una
lectura nueva fuera del módulo canónico, o un secreto en un archivo versionado.

Lo impone `lib/supabase/env.ts:48` —`SUPABASE_SECRET_KEY`, sin prefijo público y hoy sin
consumidor— y `.gitignore:34-35`.

**Las dos excepciones cerradas**, que no son fallo: `next.config.ts:18` lee `NODE_ENV`, que no es
un secreto, y `app/(vault)/acerca-de/actions.ts:76` lee `RESEND_API_KEY` **dentro** de la acción y
no a nivel de módulo, que es lo correcto —su constructor exige la clave y reventaría el arranque
de quien no la tiene—. Cualquier tercera lectura es un hallazgo hasta que se justifique.

Y el motivo de que la regla pida lectura **literal**: Next sólo sustituye
`process.env.NEXT_PUBLIC_*` si la lectura es literal, así que un `process.env[nombre]` dinámico
llegaría `undefined` al navegador. Está escrito en `lib/supabase/env.ts:14-19`.

---

### Las cuentas — G7, G8, G9

### G7 · La política de contraseña dice lo mismo en los tres sitios

**Pasa si** `lib/password.ts` y `supabase/config.toml` coinciden valor a valor, **y** el ledger
tiene una afirmación fechada del panel posterior al último cambio de `lib/password.ts`. **Falla
si** los dos verificables difieren, o si la afirmación del panel no existe o es más vieja que el
código.

Verificable hoy: `lib/password.ts:23` (`MIN_PASSWORD = 8`) y `:33` (los 32 símbolos) contra
`supabase/config.toml:183` y `:188`. Coinciden.

**El tercer sitio no se puede leer desde aquí, y ésa es la mitad interesante de la regla.**
`supabase/config.toml` es configuración local y `specs/18-endurecer-seguridad.md` dice
expresamente que **no** se corrió `supabase config push`: el archivo es documentación del panel,
no su fuente de verdad. El MCP no expone la configuración de Auth. Un agente que afirme «los tres
coinciden» estaría inventando el tercero.

La salida es la de la casa: **una afirmación fechada** en el ledger, con quién la verificó y
cuándo caduca. Convierte lo no comprobable en algo auditable, que es exactamente lo que hace la
casilla bloqueada de `references/Security/security-checklist.md`.

**Y una cosa que la regla prohíbe**: sondear el panel mandando altas contra `/auth/v1/signup` para
leer la política desde fuera. Funciona —el 422 trae la frase exacta— y consume el cubo de
`sign_in_sign_ups`, que está en 10 por IP cada cinco minutos (`supabase/config.toml`). Un agente
que lo repita deja al usuario sin poder entrar en su propio sitio.

### G8 · Ningún formulario delata qué cuentas existen, o está decidido y escrito

**Pasa si** ninguna respuesta visible distingue entre «esa cuenta existe» y «no existe», o si la
que lo hace tiene su decisión **en el ledger** y no sólo en un comentario. **Falla si** hay una
filtración sin decisión registrada.

El contraste está dentro del mismo archivo, y por eso la regla es demostrable:
`components/auth-panel.tsx:225` usa `resetPasswordForEmail()`, que responde igual exista o no la
cuenta a propósito —distinguirlo convertiría el formulario en un detector de direcciones—, y
`:189` lee `data.user.identities?.length === 0` para decir «ESE CORREO YA ESTA REGISTRADO».

**Hoy falla, y por dos sitios y no uno.** El primero es ése: `signUp` confirma la existencia de un
correo. Está justificado en su comentario, pero un comentario en un `.tsx` no es un registro
auditable. El segundo no está declarado en ninguna parte: `components/auth-panel.tsx:160` consulta
`profiles` por `username` **sin sesión** —lo permite el `grant select` de
`20260817020000_permisos_minimos.sql`, y es deliberado, porque la comprobación de nombre libre
corre antes de registrarse—, así que es un oráculo de nombres de jugador gratuito para cualquiera.

La regla no dice que haya que cerrarlos: dice que **estén decididos por escrito**. Un nombre de
jugador se elige para verse en el salón; que sea enumerable puede ser perfectamente aceptable. Lo
que no puede es no estar dicho.

### G9 · Los canjes de `/auth/*` validan lo que reciben, y ningún `redirectTo` sale de la URL

**Pasa si** todo parámetro de query de `app/auth/**` que decida un destino o entre en una llamada
de Supabase se valida contra una lista literal antes de usarse, y ningún `redirectTo` del cliente
se construye con un valor que venga de la URL. **Falla si** hay un `as` sobre un
`searchParams.get()`, o un `redirectTo` alimentado por un parámetro.

**La primera mitad falla hoy.** `app/auth/confirmar/route.ts:42` hace
`params.get("type") as EmailOtpType | null`: un cast, no una comprobación. Cualquier cadena llega
a `verifyOtp()`, y en `:59` ese mismo valor sin validar **decide el destino**
(`type === "recovery"`). El daño está acotado porque Supabase rechaza los tipos que no conoce,
pero una decisión de destino sobre un valor no validado es exactamente la clase de cosa que se
vuelve grave cuando el proveedor añade un tipo nuevo. El contraste correcto está al lado:
`app/auth/callback/route.ts` sólo lee `code` y no ramifica sobre él.

**La segunda mitad no es comprobable desde aquí.** `components/auth-panel.tsx` construye sus tres
`redirectTo` con `window.location.origin`, que es lo correcto —no viene de la URL—, pero quien
decide si ese origen vale es el allow-list de Redirect URLs del panel, que el MCP no expone. Va a
afirmación fechada, como G7.

---

### El navegador — G10, G11

### G10 · Las cinco cabeceras con su valor exacto, y HSTS sólo en producción

**Pasa si** `next.config.ts` declara las cinco con su valor literal sobre `source: "/:path*"`,
`Strict-Transport-Security` está condicionado a que no sea desarrollo, el interruptor es
`process.env.NODE_ENV`, y existe `poweredByHeader: false`. **Falla si** falta una, si el valor
cambió, si HSTS es incondicional, o si el interruptor pasa a mirar los argumentos del proceso.

Lo impone `next.config.ts:35-47`, con el interruptor en `:18`, `poweredByHeader: false` en `:58` y
el `source` en `:61`. Ese `source` no es decorativo: es lo que hace que las cabeceras cubran
también las páginas y lo de `public/` —`snake/fruits.png` incluido—, porque `headers()` se
resuelve antes del sistema de ficheros mientras el `matcher` de `proxy.ts` excluye justamente eso.

**Tres precisiones que evitan tres falsos positivos.**

Son **cinco** y no seis. `Content-Security-Policy` está fuera por decisión escrita
(`next.config.ts:31-33`): necesita un `nonce` por petición para los scripts en línea de Next y es
su propia spec, la misma que sustituirá `X-Frame-Options: DENY` por `frame-ancestors 'none'`.
Marcar su ausencia como fallo es proponer una spec ya prevista, cada ronda.

El «Pasa si» pide **`poweredByHeader: false`**, no la ausencia de la cadena `X-Powered-By`. La
ausencia se cumpliría igual con la cabecera puesta por defecto: lo que hay que comprobar es el
interruptor, no el síntoma.

Y el interruptor es `NODE_ENV` **y no `process.argv`**, porque en Next 16 el archivo de
configuración ya no lo carga el comando `next dev`, así que buscar `dev` en los argumentos
devuelve `false` en desarrollo y colaría HSTS sin que nada avise. Un `process.argv` en este archivo
es un hallazgo por sí solo.

**Y un aviso de método**: `next.config.ts` **no se recarga en caliente** (`:59-60`). Verificar con
`curl -sI` contra un servidor arrancado antes del último cambio devuelve las cabeceras viejas, que
es un falso negativo silencioso. O se reinicia, o se lee el archivo.

### G11 · El proxy pre-filtra, pero nunca autoriza

**Pasa si** toda ruta de `PROTEGIDAS` tiene además su comprobación real abajo —en la página, en la
Server Action o en la RLS—, la coincidencia del proxy es exacta y no por prefijo, y sólo se rebota
cuando Supabase **contestó**. **Falla si** una ruta se protege sólo en el proxy, si la coincidencia
pasa a ser por prefijo, o si un fallo de red empieza a rebotar.

Lo impone `proxy.ts:40` —`PROTEGIDAS`, hoy una sola ruta— y `:90`, con su
`PROTEGIDAS.includes(...)`, que es coincidencia exacta a propósito: `/cuenta` es pública y lo
seguirá siendo. La comprobación de verdad está en
`app/(vault)/cuenta/nueva-contrasena/page.tsx`, con su `getUser()` y su `redirect()`.

La doctrina está escrita en `proxy.ts:15-24` y viene de la documentación de Next, que admite el
proxy para redirecciones por permiso y avisa **en la misma frase** de que no es una solución de
autorización. Un proxy que autoriza es un proxy que alguien puede saltarse llamando a la Server
Action directamente.

Y el detalle que la regla protege y es fácil de «mejorar» por error: se rebota **sólo** cuando la
llamada contestó que no hay nadie (`proxy.ts:77-85`). Si falla la red no se sabe si hay sesión,
así que pasa y decide la página. Rebotar ahí echaría de su propia cuenta a quien la tiene.

---

### La cadena de suministro — G12

### G12 · Ninguna dependencia con vulnerabilidad conocida sin decisión escrita

**Pasa si** toda entrada de `npm audit` tiene fila en el ledger con una decisión —`arreglar`,
`aceptado` o `bloqueado`— y su fecha. **Falla si** aparece una entrada sin fila, o si una
`aceptado` lleva más de noventa días sin revisar.

La regla **no** exige cero vulnerabilidades, y es deliberado: exigirlo empuja a `npm audit fix
--force`, que aquí sube `next` fuera del rango fijado en `package.json` —donde `next` y
`eslint-config-next` están pineados y deben moverse juntos— y convierte un cambio de dependencia
mayor en un «arreglo de seguridad». Este agente no escribe código; lo que puede hacer es que
ninguna quede sin decidir.

**La gravedad del ledger no es la de npm.** npm gradúa el CVE; aquí se gradúa la **ruta real**.
Una vulnerabilidad de una dependencia de desarrollo no tiene ruta desde internet y es `menor`
aunque npm la marque `high`.

**Y por eso la fila lleva `ascenso`**, que es la columna propia de este ledger: la condición que
subiría la gravedad. El caso vivo es `sharp`, que arrastra CVE de libvips y hoy no tiene
superficie porque el repo **no usa `next/image` en ninguna parte** y no hay `images.remotePatterns`
configurado; sube a `serio` el día que aparezca cualquiera de las dos cosas. Una fila sin
`ascenso` es una fila que nadie va a volver a mirar.

---

## Qué firma esto y qué no

Este agente llega a `conforme`. **No llega a «seguro»**, y la distancia son seis cosas que no
puede ver:

1. **El panel de Supabase.** La política de contraseña real, el allow-list de Redirect URLs, las
   plantillas de correo, los secretos de los proveedores. Todo por afirmación fechada.
2. **El despliegue.** Las cabeceras se leen del archivo; que lleguen al navegador en producción lo
   dice un `curl` contra el dominio, y hoy no hay dominio.
3. **La lógica de negocio.** Que la RLS permita exactamente lo que el producto quiere permitir es
   un juicio, no una consulta.
4. **Lo que no se pregunta.** Estas doce reglas son las que hay, y una vulnerabilidad fuera de
   ellas sale `conforme`.
5. **El código de terceros.** `npm audit` sabe de CVE publicados, no de lo que hace un paquete.
6. **Un atacante.** Nadie ha intentado entrar. Esto es una auditoría de configuración, no una
   prueba de penetración.

Por eso `aceptado` y `bloqueado` **los pone el usuario y no el agente**: son juicios sobre riesgo
asumido, y el agente sólo mide.

## El orden de las rondas

Cuando no se pida un eje concreto, se propone siempre en este orden, y es por daño y no por
comodidad:

1. **La base de datos (G1–G3).** Es lo único que está expuesto a internet sin pasar por nuestro
   código, y lo único que no se deshace con `git revert`.
2. **El límite servidor/cliente (G4–G6).** Es donde vive el hallazgo `critico` de hoy.
3. **Las cuentas (G7–G9).** Afecta a personas concretas y arrastra afirmaciones del panel.
4. **El navegador (G10–G11).** Está conforme; se revisa para detectar regresiones.
5. **La cadena (G12).** Cambia sola con cada `npm install` y es la más barata de repasar.
