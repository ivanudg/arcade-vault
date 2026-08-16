-- SPEC 15 — Cuentas reales: la marca sabe de quien es.
--
-- Desde SPEC 06 el unico dueno que una marca conoce es `device_id`, un UUID de
-- navegador que se pierde al cambiar de aparato, al vaciar el almacenamiento o
-- al abrir una ventana privada. Quien juega desde el movil y desde el portatil
-- son hoy dos personas distintas para el vault.
--
-- `device_id` no se toca: quien juega sin cuenta sigue viendo sus marcas
-- resaltadas, que es como funciona el vault desde SPEC 06. `user_id` se suma al
-- lado, y es `null` en toda marca de invitado.

-- ---------------------------------------------------------------------------
-- Columna
-- ---------------------------------------------------------------------------

-- `on delete set null` y no `cascade`: si una cuenta desaparece, su marca sigue
-- en el marcador con el nombre con el que se firmo. Se pierde el dueno, no la
-- puntuacion — la misma regla que `deviceId()` ya aplica cuando devuelve
-- `undefined`.
alter table public.scores
  add column user_id uuid references auth.users (id) on delete set null;

create index scores_user_id_idx on public.scores (user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- La politica de `insert` de SPEC 06 solo comprobaba que la marca no se colara
-- disfrazada de semilla. Ahora tambien impide firmar con la cuenta de otro:
-- `user_id` nulo es una marca de invitado y se admite igual que hasta hoy, pero
-- si viene con dueno tiene que ser quien esta autenticado.
--
-- No sustituye a la validacion del servidor: la Server Action resuelve el
-- `user_id` con `auth.getUser()` e ignora lo que mande el cliente. Esto es la
-- red de debajo.
drop policy "firmar una marca" on public.scores;

create policy "firmar una marca" on public.scores for insert to anon, authenticated
  with check (seeded = false and (user_id is null or user_id = auth.uid()));

-- Sigue sin haber politica de `update` ni de `delete`: sin politica, RLS los
-- niega. Una marca firmada no se puede reasignar despues.

-- ---------------------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------------------

-- `top_scores` selecciona `s.*`, asi que se entera sola de la columna nueva.
-- `player_bests` nombra las suyas una a una, y el ranking global de la portada
-- tambien tiene que poder decir cuales son mis marcas cuando hay sesion. Se
-- recrea con `user_id`, que es el de la mejor marca de cada nombre.
drop view public.player_bests;

create view public.player_bests with (security_invoker = true) as
select distinct on (s.player_name) s.player_name, s.score, s.game_id, s.device_id, s.user_id
from public.scores s
order by s.player_name, s.score desc;
