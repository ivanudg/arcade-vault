# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-07-29
> **Objetivo:** Portar a Next.js las cinco pantallas de `references/templates/` (biblioteca, detalle, jugar, salón y cuenta) como interfaz navegable, sin implementar ningún juego.

## Alcance

**Dentro:**

- Seis rutas en `app/`: `/` (biblioteca), `/juego/[id]` (detalle), `/jugar/[id]` (pantalla de juego), `/salon`, `/cuenta` y `not-found.tsx`.
- Chrome compartido en `app/layout.tsx`: fondo de rejilla animada, capa de scanlines, cabecera con marca, navegación, estado de sesión y menú lateral en móvil, más el pie de página.
- Cabecera reducida propia para `/jugar/[id]` mediante un layout anidado.
- Capa de datos en `lib/`: catálogo de las 8 máquinas, puntuaciones semilla, lectura y escritura en `localStorage` bajo la clave `arcadevault:v1`.
- Componente `GamePreview`: las 8 escenas de `drawPreview()` portadas a un canvas de cliente.
- Biblioteca: rótulo ARCADE VAULT con parpadeo, buscador y filtros por categoría funcionales, rejilla de tarjetas y mensaje de "sin resultados".
- Detalle: preview grande, metadatos, bloque de controles, botón JUGAR AHORA o PRONTO según `playable`, y panel lateral con las 10 mejores puntuaciones.
- Jugar: HUD con valores de ejemplo, gabinete con la preview congelada, D-pad visual, y los tres superpuestos del template (cargando, pausa, fin de partida).
- Guardar puntuación desde el fin de partida: escribe la marca en `localStorage` y aparece resaltada en salón y detalle.
- Salón: pestañas por máquina, tabla de 10 filas con podio y distintivo "TU MEJOR MARCA".
- Cuenta: pestañas de acceso y registro, formulario simulado, botones sociales y vista de sesión activa.
- `metadata` con título propio por pantalla.
- Retirada del scaffold de `create-next-app` en `app/page.tsx` y de los SVG sin uso de `public/`.

**Fuera de alcance (para futuras specs):**

- Los motores de juego de `arcade-core.js` (`engine()`), el bucle de animación y los controles reales. Ninguna máquina se puede jugar.
- Backend: rutas de API, Supabase, autenticación real y puntuaciones en servidor.
- Validación de formularios, recuperación de contraseña y registro real.
- Perfil de jugador, historial de partidas y avatares.
- Desbloquear las dos máquinas marcadas como "PRONTO" (`caida`, `laberinto`).
- Tema claro, selector de tema e internacionalización.
- Framework de tests.

## Modelo de datos

Todo vive en `lib/`. Los tipos salen de `references/templates/arcade-core.js`; no se inventan campos nuevos.

### `lib/games.ts` — catálogo

```ts
export type GameId =
  | "muro"
  | "serpiente"
  | "invasores"
  | "rocas"
  | "duelo"
  | "corredor"
  | "caida"
  | "laberinto";

export type GameCategory =
  | "ARCADE"
  | "CLASICOS"
  | "DISPAROS"
  | "REFLEJOS"
  | "PUZZLE"
  | "LABERINTO";

export type GameGlow = "#00f5ff" | "#ff006e" | "#f5ff00";

export interface Game {
  id: GameId;
  title: string; // 'MURO NEON'
  cat: GameCategory;
  glow: GameGlow; // color de acento de la máquina
  playable: boolean; // false en 'caida' y 'laberinto'
  desc: string; // una línea, para la tarjeta
  long: string; // párrafo de la ficha
  controls: string; // 'Flechas ← → para mover la pala · ESPACIO para lanzar'
}

export const GAMES: readonly Game[];
export function getGame(id: string): Game | undefined;
```

### `lib/scores.ts` — puntuaciones

```ts
export interface ScoreEntry {
  name: string; // 'NEOKID'
  score: number; // 18420
  date: string; // '12/04/26'
}

export interface BoardRow extends ScoreEntry {
  mine: boolean; // true si la marca la guardó este dispositivo
}

// 10 marcas semilla por máquina, copiadas de SEED y DATES.
const SEED: Record<GameId, ScoreEntry[]>;

export function board(id: GameId): BoardRow[]; // semilla + guardadas, orden desc, 10 filas
export function best(id: GameId): string; // mejor marca ya formateada, o '—'
export function addScore(id: GameId, name: string, score: number): void;
export function formatScore(n: number): string; // 18420 → '18.420' (es-ES)
```

### `lib/storage.ts` — persistencia

```ts
const KEY = "arcadevault:v1"; // misma clave que el template

export interface VaultUser {
  name: string;
  guest: boolean;
}

export interface VaultData {
  user?: VaultUser | null;
  scores?: Partial<Record<GameId, ScoreEntry[]>>;
}

export function read(): VaultData; // {} si falla el parseo o no hay localStorage
export function persist(patch: Partial<VaultData>): void;
```

### `lib/session.ts` — sesión simulada

```ts
// Contexto de cliente montado en el layout: la cabecera, /cuenta y /jugar
// leen el mismo usuario sin volver a tocar localStorage cada una.
export function useSession(): {
  user: VaultUser | null;
  ready: boolean; // false hasta leer localStorage tras hidratar
  login: (name: string) => void; // mayúsculas, máx. 12 caracteres
  logout: () => void;
};
```

### `lib/demo-run.ts` — partida de ejemplo de `/jugar`

```ts
// Valores fijos por máquina: el HUD y el fin de partida necesitan cifras
// creíbles y deterministas. Nada de aleatorio: rompería la hidratación.
export const DEMO_RUN: Record<
  GameId,
  { score: number; lives: number; level: number }
>;
```

Convenciones:

- Colores, tipografías y animaciones no se declaran aquí: ya están en `app/globals.css` como tokens `--av-*` y utilidades `av-*`.
- Las fechas se guardan como texto `dd/mm/aa`; `addScore` las genera en el cliente en el momento de guardar.
- `board()` recorta a 10 filas: una marca propia baja del top 10 simplemente deja de verse.

## Plan de implementación

Cada paso deja la aplicación arrancando con `npm run dev` y es commiteable por sí solo.

1. **Limpiar el scaffold.** `app/page.tsx` pasa a ser un marcador mínimo con el rótulo ARCADE VAULT; se borran `public/next.svg`, `vercel.svg`, `file.svg`, `globe.svg` y `window.svg`. Verificación: `/` carga en negro sin restos de `create-next-app`.

2. **Catálogo.** `lib/games.ts` con los tipos, las 8 entradas de `GAMES` y `getGame()`. Textos copiados literalmente de `arcade-core.js`. Verificación: `npx tsc --noEmit` sin errores.

3. **Persistencia y puntuaciones.** `lib/storage.ts` (`read`, `persist`, clave `arcadevault:v1`) y `lib/scores.ts` (`SEED`, `DATES`, `board`, `best`, `addScore`, `formatScore`). Verificación: desde la consola del navegador, `board('muro')` devuelve 10 filas ordenadas de mayor a menor.

4. **Fondo.** `components/vault-backdrop.tsx`: rejilla en perspectiva con `av-grid-floor`, viñeta con `av-vignette` y capa `av-scanlines`. Se monta en `app/layout.tsx`. Verificación: la rejilla se desplaza y las scanlines cubren la pantalla.

5. **Sesión.** `lib/session.ts` con `SessionProvider` y `useSession()`, montado en el layout. Verificación: `persist({ user: { name: 'TEST', guest: false } })` en consola y, tras recargar, el hook expone ese usuario.

6. **Cabecera y pie.** `components/site-header.tsx` (marca, navegación con `usePathname` para la ruta activa, bloque de sesión o botón INICIAR SESION, botón hamburguesa y menú lateral con `animate-av-slide`) y `components/site-footer.tsx` con el texto por pantalla vía prop. Verificación: a menos de `md` aparece el hamburguesa y el panel entra deslizándose.

7. **Arte de las previews.** `lib/preview-art.ts` con `drawPreview(ctx, id, w, h)`: las 8 escenas portadas de `arcade-core.js`, sin dependencias de React. Verificación: función pura, se comprueba con el componente del paso siguiente.

8. **Componente de preview.** `components/game-preview.tsx` (cliente): canvas con `ref`, `useEffect` que llama a `drawPreview`, y `image-rendering: pixelated`. Verificación: montado suelto en `/`, dibuja las 8 escenas distintas.

9. **Tarjeta de juego.** `components/game-card.tsx`: preview, distintivo de categoría, título, descripción, franja de mejor puntuación, botón JUGAR o PRONTO e INFO. Hover con elevación y `animate-av-cabinet`. Verificación: la tarjeta de `muro` enlaza a `/jugar/muro` y la de `caida` a `/juego/caida`.

10. **Biblioteca.** `components/library-browser.tsx` (cliente: buscador, filtros por categoría y rejilla) y `app/page.tsx` con el rótulo, el subtítulo parpadeante y ese componente. Verificación: buscar "neon" deja 2 máquinas; el filtro PUZZLE deja 1; una búsqueda sin coincidencias muestra el mensaje en magenta.

11. **Panel de puntuaciones.** `components/score-panel.tsx`: las 10 filas del lateral de la ficha, con medallas en las tres primeras y entrada escalonada `animate-av-row`. Verificación: las filas propias aparecen con fondo cian.

12. **Ficha de máquina.** `app/juego/[id]/page.tsx` con `await params`, `getGame()`, `notFound()` si no existe, `generateStaticParams()` con las 8 máquinas y `metadata` por juego. Verificación: `/juego/rocas` muestra su ficha y `/juego/tetris` devuelve 404.

13. **Pantalla 404.** `app/not-found.tsx` con MAQUINA NO ENCONTRADA y el enlace de vuelta al vault. Verificación: `/juego/tetris` y `/ruta-inventada` la muestran.

14. **Salón de la fama.** `app/salon/page.tsx` y `components/hall-of-fame.tsx` (cliente): pestañas por máquina, cabecera de tabla, 10 filas, distintivo TU MEJOR MARCA y botón BATIR ESTE RECORD. La pestaña inicial sale de `?juego=`. Verificación: `/salon?juego=duelo` abre con esa pestaña activa.

15. **Cuenta.** `app/cuenta/page.tsx` y `components/auth-panel.tsx` (cliente): pestañas de acceso y registro, campos, botones sociales y vista de sesión activa. Verificación: entrar como `jugador_01` deja la cabecera mostrando JUGADOR_01 en todas las pantallas.

16. **Chrome de juego.** `app/jugar/[id]/layout.tsx` con `components/play-header.tsx` (marca, título de la máquina, botón SALIR). Verificación: `/jugar/muro` ya no muestra la cabecera general ni el pie.

17. **Gabinete.** `components/play-cabinet.tsx` (cliente): HUD con `DEMO_RUN`, marco del gabinete con la preview congelada, barrido `animate-av-sweep`, D-pad y botón de pausa. Verificación: pulsar PAUSA muestra y oculta el rótulo EN PAUSA.

18. **Superpuestos de partida.** Cargando (750 ms al entrar), fin de partida con la puntuación, GUARDAR PUNTUACION que llama a `addScore` con el texto tecleado, JUGAR DE NUEVO y VOLVER AL VAULT. El fin de partida se dispara con un botón de demo en el gabinete. Verificación: guardar en `/jugar/muro` y ver la marca resaltada en `/salon?juego=muro`.

19. **Repaso final.** Títulos de `metadata` en las cinco pantallas, textos de pie por sección y revisión de las cinco rutas contra sus `.dc.html`. Verificación: `npm run lint` y `npm run build` sin errores ni avisos.

## Criterios de aceptación

### General

- [ ] `npm run build` termina sin errores y `npm run lint` no reporta avisos.
- [ ] Las rutas `/`, `/juego/muro`, `/jugar/muro`, `/salon` y `/cuenta` cargan sin errores en la consola del navegador.
- [ ] No queda ningún rastro del scaffold: `app/page.tsx` no importa `next/image` y `public/` no contiene los cinco SVG de `create-next-app`.
- [ ] La rejilla del fondo se desplaza y la capa de scanlines es visible en las cinco pantallas.
- [ ] Con `prefers-reduced-motion: reduce` activo, la rejilla y el parpadeo del rótulo se detienen.
- [ ] Ninguna pantalla produce desbordamiento horizontal a 360 px de ancho.
- [ ] Cada pantalla tiene su propio título de pestaña; el de la ficha incluye el nombre de la máquina.

### Cabecera y navegación

- [ ] A 1280 px se ve la navegación con Biblioteca y Salón de la Fama; a 375 px se ve el botón hamburguesa en su lugar.
- [ ] El enlace de la sección actual aparece subrayado en su color (cian en biblioteca, amarillo en salón).
- [ ] El menú lateral entra deslizándose y se cierra al pulsar fuera.
- [ ] Sin sesión, la cabecera muestra el botón INICIAR SESION; con sesión, la inicial en un cuadro magenta, el nombre y SALIR.
- [ ] Pulsar SALIR devuelve la cabecera al estado sin sesión y `localStorage` deja de tener usuario.
- [ ] `/jugar/muro` no muestra la cabecera general ni el pie; muestra la marca, el título de la máquina y el botón SALIR.

### Biblioteca

- [ ] Se listan las 8 máquinas, cada una con su preview dibujada en canvas y distinta de las demás.
- [ ] Escribir "neon" en el buscador deja visibles MURO NEON y CORREDOR DE NEON.
- [ ] Pulsar la categoría PUZZLE deja visible solo CAIDA VERTICAL.
- [ ] Una búsqueda sin coincidencias muestra NO HAY JUEGOS PARA ESA BUSQUEDA y ninguna tarjeta.
- [ ] Las 6 máquinas jugables muestran el botón JUGAR y las 2 en mantenimiento muestran PRONTO.
- [ ] El botón JUGAR de MURO NEON lleva a `/jugar/muro`; el de CAIDA VERTICAL lleva a `/juego/caida`.
- [ ] Cada tarjeta muestra la mejor puntuación de su máquina con separador de miles (`18.420`).

### Ficha de máquina

- [ ] `/juego/rocas` muestra título, categoría, "1 JUGADOR", récord, descripción larga y la línea de controles.
- [ ] El acento de la ficha (título, borde de la preview) usa el color de la máquina.
- [ ] Las máquinas jugables muestran JUGAR AHORA con pulso magenta; `caida` y `laberinto` muestran PRONTO deshabilitado.
- [ ] El panel lateral lista 10 marcas, con las tres primeras en oro, plata y bronce.
- [ ] El enlace del panel lleva a `/salon?juego=rocas` con esa pestaña ya activa.
- [ ] `/juego/tetris` devuelve 404 y muestra la pantalla MAQUINA NO ENCONTRADA.

### Salón de la fama

- [ ] Hay 8 pestañas, una por máquina, y la activa se pinta con el color de esa máquina.
- [ ] La tabla muestra 10 filas con rango de dos dígitos, jugador, puntuación y fecha.
- [ ] Las filas entran escalonadas de izquierda a derecha al cargar.
- [ ] `/salon` sin parámetros abre en MURO NEON.
- [ ] El botón BATIR ESTE RECORD lleva a `/jugar/<máquina>` si es jugable y a `/juego/<máquina>` si no lo es.

### Cuenta

- [ ] Sin sesión se ven las pestañas INICIAR SESION y CREAR CUENTA, y la activa cambia de color al pulsarla.
- [ ] La pestaña CREAR CUENTA añade el campo de correo; la de acceso no lo muestra.
- [ ] Enviar el formulario con `jugador_01` crea la sesión y la pantalla pasa a mostrar el avatar con la inicial J y el nombre JUGADOR_01.
- [ ] Enviar el formulario con el usuario vacío crea la sesión como JUGADOR.
- [ ] Los botones GOOGLE y GITHUB crean las sesiones GOOGLE_USER y GITHUB_USER.
- [ ] Con sesión activa, la pantalla muestra IR A LA BIBLIOTECA y CERRAR SESION en lugar del formulario.
- [ ] La sesión sobrevive a recargar la página y se refleja en las otras cuatro pantallas.

### Pantalla de juego

- [ ] Al entrar en `/jugar/muro` aparece durante unos 750 ms el superpuesto CARGANDO CARTUCHO con el cuadrado giratorio.
- [ ] El HUD muestra puntuación, vidas, nivel y el nombre del jugador (INVITADO si no hay sesión).
- [ ] El canvas muestra la escena de la máquina correspondiente, congelada.
- [ ] Pulsar PAUSA muestra EN PAUSA sobre el canvas y cambia la etiqueta del botón a SEGUIR.
- [ ] El D-pad y el botón FUEGO responden visualmente al pulsarlos y no alteran el canvas.
- [ ] El superpuesto de fin de partida muestra la puntuación final y el aviso correcto según haya sesión o no.
- [ ] GUARDAR PUNTUACION escribe la marca y muestra PUNTUACION GUARDADA tecleándose carácter a carácter.
- [ ] Tras guardar en `/jugar/muro`, la marca aparece en `/salon?juego=muro` y en `/juego/muro` con el distintivo TU MEJOR MARCA.
- [ ] JUGAR DE NUEVO vuelve a mostrar el superpuesto de carga y devuelve el HUD a su estado inicial.

## Decisiones

### Rutas

- **Sí:** rutas en español con la máquina como segmento (`/juego/[id]`, `/jugar/[id]`). Coherentes con el idioma del producto y aprovechan los params dinámicos de Next 16.
- **No:** calcar `?juego=` en todas las pantallas como el template. Era una limitación de un prototipo de archivos sueltos, no una decisión de diseño.
- **Sí:** `?juego=` se conserva solo en `/salon`, donde selecciona pestaña y no identifica el recurso.
- **Sí:** `generateStaticParams()` en `/juego/[id]` y `/jugar/[id]`. El catálogo es fijo y conocido en build; las 8 rutas se prerenderizan y cualquier otra es 404 sin ejecutar código.
- **No:** devolver la primera máquina cuando el id no existe, como hace `game()` en el template. Un URL roto respondería 200 con contenido equivocado.
- **Sí:** `app/not-found.tsx` propia. Es la única pantalla que no está en `references/templates/`; se diseña con los tokens existentes y sin elementos nuevos.

### Arquitectura

- **Sí:** chrome (fondo, cabecera, pie) en `app/layout.tsx` y layout anidado para `/jugar/[id]`. Las páginas quedan como Server Components y solo lo interactivo baja a cliente.
- **No:** una página cliente por pantalla replicando su propia cabecera, como hace cada `.dc.html`. Duplicaría el mismo bloque en cuatro archivos.
- **Sí:** `components/` y `lib/` en la raíz. El alias `@/*` ya apunta ahí y en este MVP casi todo se comparte entre pantallas.
- **No:** co-locar componentes por ruta. El panel de puntuaciones, la preview y la tarjeta se usan desde dos o tres pantallas cada uno.
- **Sí:** `lib/storage.ts` aislado del resto. Es lo único que hay que sustituir cuando llegue el backend.
- **Sí:** la sesión como contexto de React con un flag `ready`. Evita que cabecera y `/cuenta` discrepen y que se pinte INICIAR SESION durante un instante a quien ya tiene sesión.

### Responsive y estilos

- **Sí:** breakpoints de Tailwind (`hidden md:flex`, `md:hidden`) para alternar navegación y menú.
- **No:** medir `window.innerWidth` con un umbral de 780 px como el template. En el primer render no se conoce el ancho: provoca parpadeo o salto de maquetación al hidratar.
- **Sí:** clases de Tailwind sobre los tokens `--av-*` y las utilidades `av-*` que ya existen en `app/globals.css`.
- **No:** estilos en línea calcados del template. El tema ya está extraído; volver a incrustar colores lo dejaría sin usar.

### Datos y comportamiento

- **Sí:** portar `arcade-core.js` a TypeScript con `localStorage` bajo la misma clave `arcadevault:v1`. Reproduce el comportamiento del template sin backend.
- **No:** datos estáticos sin persistencia. La sesión se perdería al navegar entre pantallas y el circuito jugar → salón no se podría enseñar.
- **Sí:** buscador y filtros funcionales con estado de cliente.
- **No:** llevar la búsqueda a `searchParams`. Un MVP visual no necesita filtros compartibles por enlace, y el estado local evita una navegación por pulsación.
- **Sí:** GUARDAR PUNTUACION escribe de verdad. Cierra el circuito entre jugar, salón y ficha, y demuestra que la capa de datos funciona.
- **Sí:** acceso sin validación, tal como el template: usuario en mayúsculas recortado a 12 caracteres, contraseña ignorada.
- **No:** validación de campos y estados de error. Serían pantallas que nadie ha diseñado; entran con la autenticación real.
- **Sí:** `DEMO_RUN` con cifras fijas por máquina. Valores aleatorios romperían la hidratación y harían los criterios de aceptación no verificables.
- **Sí:** un botón de demo dispara el fin de partida. Sin juego no hay forma de llegar a ese superpuesto, y es la pieza con más interfaz de la pantalla.

### Contenidos

- **Sí:** copia literal de todos los textos, incluidas las notas que anuncian el backend (`GET /api/scores/:juego`, `POST /api/auth/login · OAuth vía Supabase`). Hacen la spec verificable frase a frase y dejan escrito dónde se enchufará la siguiente.
- **Sí:** respetar las mayúsculas sin tilde del template (`SALON DE LA FAMA`, `INICIAR SESION`, `PUNTUACION`): Press Start 2P no tiene glifos acentuados en mayúscula. Los textos en minúscula sí llevan sus tildes.
- **Sí:** portar las 8 escenas de `drawPreview()` a un canvas de cliente. Es lo que da personalidad a la biblioteca y es dibujo, no juego.
- **No:** sustituirlas por un mosaico CSS teñido. Las 8 tarjetas quedarían casi iguales.
- **Sí:** las máquinas `caida` y `laberinto` se quedan en PRONTO, con ficha y puntuaciones visibles.

## Riesgos

| Riesgo                                                                                                                      | Mitigación                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localStorage` bloqueado (modo privado, cookies de terceros) hace fallar `read()`/`persist()`                               | Ambas funciones envuelven el acceso en `try/catch`; `read()` devuelve `{}`. La interfaz funciona completa, solo no persiste.                               |
| La sesión se lee tras hidratar: la cabecera podría pintar INICIAR SESION un instante a quien ya tiene sesión                | El contexto expone `ready`; el bloque de sesión no se renderiza hasta que es `true`.                                                                       |
| Las puntuaciones guardadas viven en el cliente, así que `/salon` y la ficha no pueden prerenderizarse con ellas             | La tabla y el panel son componentes de cliente que leen `board()` después de montar. Las semillas se ven siempre; las marcas propias aparecen al hidratar. |
| El canvas de `drawPreview()` se dibuja una sola vez y queda borroso en pantallas de alta densidad                           | El componente escala el canvas por `devicePixelRatio` en el `useEffect` y mantiene `image-rendering: pixelated`.                                           |
| Portar a mano 8 escenas de canvas es propenso a errores silenciosos: un dibujo mal calculado no rompe nada, solo se ve raro | El paso 8 del plan las revisa las 8 en pantalla contra `biblioteca.dc.html`, y hay un criterio de aceptación que exige que sean distintas entre sí.        |
| El formato de miles con `toLocaleString('es-ES')` puede diferir entre servidor y cliente y provocar un aviso de hidratación | `formatScore()` se usa solo en componentes de cliente, o con locale fijo, nunca en render de servidor.                                                     |
| Un cambio futuro de esquema rompería los datos guardados con este formato                                                   | La clave incluye la versión (`arcadevault:v1`); una versión nueva usa otra clave y los datos viejos se ignoran.                                            |

## Lo que **no** entra en esta spec

- Los motores de juego: ninguna de las 8 máquinas se puede jugar.
- Backend de cualquier tipo: API, Supabase, autenticación real, puntuaciones en servidor.
- Validación de formularios y recuperación de contraseña.
- Perfil de jugador, historial de partidas y avatares.
- Desbloquear `caida` y `laberinto`.
- Tema claro, selector de tema e internacionalización.
- Framework de tests.

Cada uno de ellos, si llega, va en su propia spec.
