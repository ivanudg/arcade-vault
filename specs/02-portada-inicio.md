# SPEC 02 — Portada de inicio y mudanza de la biblioteca

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-07-31
> **Objetivo:** Portar la landing de `references/templates/home-about/home.jsx` a `/` con los tokens, colores y animaciones que ya usa el vault, moviendo la biblioteca a `/biblioteca`.

## Alcance

**Dentro:**

- `/` deja de ser la biblioteca y pasa a ser la portada: las siete secciones de `home.jsx` (hero, «¿por qué Arcade Vault?», rail de juegos, franja de cifras, actividad en vivo, precios y llamada final).
- La biblioteca se muda a `/biblioteca` con el mismo buscador, filtros y rejilla de SPEC 01; sólo cambia su encabezado, que pasa del rótulo gigante `ARCADE / VAULT` a un titular de sección `BIBLIOTECA`.
- Hero: eyebrow `>> INSERTA UNA MONEDA` con cursor parpadeante, titular de tres líneas `EL ARCADE / CLASICO ESTA / DE VUELTA` en blanco, cian y magenta, subtítulo, dos botones y el indicador `DESLIZA ▼`.
- Siluetas flotantes del hero: las ocho figuras de píxel de `FloatingSilhouettes`, repintadas con cian, magenta, amarillo y ámbar.
- Cuatro tarjetas de ventajas con sus iconos SVG de píxel (`GAMEPAD`, `FREE`, `TROPHY`, `ROCKET`), en cian, amarillo, magenta y ámbar.
- Rail de seis máquinas con portada cuadrada animada, título y categoría, más el botón `VER TODOS LOS JUEGOS →`.
- Franja de cifras: la primera derivada de `GAMES.length`; las otras dos, texto del template.
- Actividad en vivo: dos paneles derivados de `lib/scores.ts` — últimas siete marcas por fecha y los cinco mejores jugadores globales con su barra de progreso.
- Precios: tarjeta de plan único gratuito con sus seis ventajas y sello `FREE PLAY`, más las tres preguntas del FAQ.
- Aparición progresiva al hacer scroll (`.reveal` del template) como componente de cliente, anulada bajo `prefers-reduced-motion`.
- Navegación: `Inicio · Biblioteca · Salón de la Fama` en la cabecera y en el cajón móvil; el logo lleva a `/`.
- Contador `CREDITOS · 03` del `nav.jsx` del template: moneda con halo y cifra fija en la barra (oculta por debajo de `lg`) y su rótulo al fondo del cajón móvil.
- Botones que apuntan a `/cuenta` cambian de texto cuando hay sesión activa.
- Enlaces de `site-footer.tsx` y `not-found.tsx` reapuntados a las rutas nuevas.
- `metadata` propio de la portada y de `/biblioteca`.

**Fuera de alcance (para futuras specs):**

- La página «Acerca de» (`references/templates/home-about/about.jsx`) y su entrada en el menú.
- Actividad realmente en vivo: los paneles leen las semillas y `localStorage`, no hay sondeo ni servidor.
- Los degradados recortados sobre texto del template (`line-2`, `line-3`, `final-title`, `pc-amount-n`): se sustituyen por los neones con `text-shadow`.
- Los cinco colores del template ajenos a la paleta (`#00ff88`, `#aa00ff`, `#ffcf3a`, `#ff3060`, `#00d4ff`).
- Motores de juego, backend, autenticación real y puntuaciones de servidor, igual que en SPEC 01.
- Cualquier cambio en `/salon`, `/cuenta`, `/juego/[id]` y `/jugar/[id]` que no sea reapuntar un enlace.

## Modelo de datos

La portada no crea persistencia nueva: lee lo que ya guarda SPEC 01 bajo `arcadevault:v1`. Añade dos consultas derivadas en `lib/scores.ts` y un módulo de textos.

### `lib/scores.ts` — dos vistas nuevas sobre las mismas marcas

```ts
/** Una marca junto a la máquina donde se logró. */
export interface RecentScore extends ScoreEntry {
  game: GameId;
  mine: boolean;
}

/** Las marcas más recientes de todas las máquinas, de nueva a vieja. */
export function recentScores(limit?: number): RecentScore[];
export function seedRecentScores(limit?: number): RecentScore[];

/** Un jugador y su mejor marca en cualquier máquina. */
export interface PlayerRank {
  rank: number; // 1 es el primero
  name: string;
  score: number;
  game: GameId; // dónde logró esa marca
  mine: boolean;
}

/** Ranking global por la mejor marca de cada nombre. */
export function topPlayers(limit?: number): PlayerRank[];
export function seedTopPlayers(limit?: number): PlayerRank[];
```

Convenciones:

- El par `seedX()` / `X()` repite el patrón de `seedBoard()` / `board()`: la variante `seed*` es lo único que puede pintar el servidor, y el componente pasa a la otra tras montar.
- El orden por fecha parsea el `dd/mm/aa` de `ScoreEntry`; el siglo se asume `20xx`. A igualdad de fecha manda la puntuación más alta.
- `topPlayers()` agrupa por `name` exacto y se queda con la marca mayor de cada uno.

### `lib/landing.ts` — textos y acentos de la portada

```ts
/** Los cuatro acentos permitidos; no hay verde ni morado. */
export type Accent = "cyan" | "magenta" | "yellow" | "amber";

export interface Feature {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  accent: Accent;
}

export interface Stat {
  value: string; // '8', 'MILES', 'GLOBAL'
  unit: string; // 'JUEGOS'
  note: string; // 'Y CONTANDO'
}

export interface FaqItem {
  q: string;
  a: string;
}

export const FEATURES: readonly Feature[]; // 4
export const STATS: readonly Stat[]; // 3, la primera con GAMES.length
export const FAQ: readonly FaqItem[]; // 3
export const PLAN: {
  label: string;
  name: string;
  amount: string;
  unit: string;
  tag: string;
  perks: readonly string[]; // 6
  foot: string;
};
```

Convención de color: `Accent` nunca se interpola en un nombre de clase. Cada componente tiene un objeto literal `Record<Accent, string>` con las clases completas, porque Tailwind sólo ve las cadenas escritas enteras en el código.

## Plan de implementación

Cada paso deja el sitio navegable y se puede confirmar por separado.

1. **Consultas nuevas en `lib/scores.ts`.** Añadir `RecentScore`, `PlayerRank` y las cuatro funciones (`recentScores`, `seedRecentScores`, `topPlayers`, `seedTopPlayers`) con el parseo de `dd/mm/aa`. No las usa nadie todavía. Comprobación: en la consola del navegador, `topPlayers(5)` devuelve cinco nombres distintos ordenados de mayor a menor.
2. **Crear `lib/landing.ts`** con `FEATURES`, `STATS` (la primera cifra tomada de `GAMES.length`), `FAQ` y `PLAN`. Sin consumidores aún.
3. **Mudar la biblioteca.** Crear `app/(vault)/biblioteca/page.tsx` con el contenido actual de la portada y su `metadata`, cambiando el rótulo gigante por un encabezado `BIBLIOTECA` con línea de apoyo. Dejar `app/(vault)/page.tsx` como portada mínima: sólo el titular del hero. Comprobación: `/biblioteca` lista las ocho máquinas y `/` ya no.
4. **Reapuntar la navegación.** En `components/site-header.tsx`: logo a `/`, y tres secciones `Inicio`, `Biblioteca` (activa también en `/juego/*`) y `Salón de la Fama`, tanto en la barra como en el cajón móvil. Comprobación: cada sección se subraya en su color al visitarla.
5. **Reapuntar pie y 404.** En `components/site-footer.tsx`, añadir el remate de la portada y el de la biblioteca. En `app/not-found.tsx`, el botón `VOLVER AL VAULT` pasa a `/biblioteca`.
6. **Componente `components/reveal.tsx`.** Cliente, envuelve una sección y le añade la clase visible cuando entra en viewport con `IntersectionObserver`, desconectándose después. Comprobación: una sección de prueba aparece al bajar y no vuelve a ocultarse.
7. **Componente `components/section-head.tsx`.** Kicker numerado (`// 01`) en su acento, título y la regla que se degrada hacia la derecha. Es la cabecera de cuatro de las secciones.
8. **Hero.** `components/hero-silhouettes.tsx` con las ocho figuras repintadas y su flotación, y el hero completo en `app/(vault)/page.tsx`: eyebrow, titular de tres líneas con `av-glow-*` y `animate-av-flicker` en las tres, desfasado con retardos negativos, subtítulo, los dos botones y el `DESLIZA ▼`. Comprobación: el hero ocupa el alto de la ventana y los botones llevan a `/biblioteca` y `/cuenta`.
9. **Sección de ventajas.** `components/feature-icon.tsx` con los cuatro SVG de píxel, y la rejilla de cuatro tarjetas que pasa a dos columnas y luego a una. Comprobación: al pasar el ratón, la tarjeta se eleva y su borde toma su acento.
10. **Rail de juegos.** `components/mini-game-card.tsx` con `<GamePreview>` en cuadrado, título y categoría, enlazando a `/juego/[id]`; la sección muestra las seis primeras máquinas y el botón a `/biblioteca`. Comprobación: seis portadas animadas en una fila, tres en tableta, dos en móvil.
11. **Franja de cifras.** Bloque a ancho completo con las tres cifras separadas por línea vertical, con su velo amarillo de fondo.
12. **Actividad en vivo.** `components/activity-feed.tsx` (últimas siete marcas, con máquina, puntuación y fecha) y `components/top-players.tsx` (cinco jugadores con barra proporcional y podio en oro, plata y bronce, más el botón `VER SALÓN →`). Ambos arrancan con la variante `seed*` y pasan a la real tras montar. Comprobación: una marca guardada al terminar una partida aparece la primera en el panel izquierdo.
13. **Precios.** Tarjeta del plan gratuito con sus seis ventajas, sello `FREE PLAY` girado y el botón a `/cuenta`, junto a las tres preguntas del FAQ. Comprobación: en móvil la tarjeta y el FAQ se apilan.
14. **Llamada final.** Titular, botón grande a `/biblioteca` y línea de remate, con las dos reglas cian arriba y abajo.
15. **Botones sensibles a sesión.** Los dos que apuntan a `/cuenta` leen `useSession()`: sin sesión dicen `* CREAR CUENTA` y `EMPEZAR GRATIS →`; con sesión, `* MI CUENTA` y `IR A MI CUENTA →`. Comprobación: tras entrar en `/cuenta`, la portada refleja el cambio.
16. **Metadatos.** `title` y `description` propios de la portada, y los de `/biblioteca` heredados de la página anterior.
17. **Contador de créditos.** En `components/site-header.tsx`, la moneda con halo amarillo y `CREDITOS · 03` junto al bloque de sesión, más el mismo rótulo al fondo del cajón móvil. Comprobación: a 1440 px se ve en la barra; a 500 px desaparece de ella y aparece al abrir el cajón.

## Criterios de aceptación

**Rutas y navegación**

- [ ] `/` muestra la portada y no contiene la rejilla de tarjetas de la biblioteca.
- [ ] `/biblioteca` lista las ocho máquinas, con el buscador y los filtros por categoría funcionando igual que antes.
- [ ] La cabecera muestra exactamente tres enlaces: `Inicio`, `Biblioteca` y `Salón de la Fama`.
- [ ] Estando en `/juego/muro`, el enlace `Biblioteca` aparece subrayado en cian.
- [ ] Pulsar el logo `ARCADE VAULT` desde cualquier pantalla lleva a `/`.
- [ ] El botón `VOLVER AL VAULT` de una URL inexistente lleva a `/biblioteca`.
- [ ] El cajón lateral en móvil ofrece los mismos tres enlaces más `Cuenta`, y `CREDITOS · 03` al fondo.
- [ ] En pantallas de 1024 px o más, la cabecera muestra la moneda y `CREDITOS · 03` a la izquierda del bloque de sesión; por debajo, no.
- [ ] Ningún texto en Press Start 2P contiene caracteres fuera de ASCII imprimible, salvo `·`.

**Portada**

- [ ] La portada tiene siete secciones en este orden: hero, ventajas, rail de juegos, cifras, actividad, precios y llamada final.
- [ ] El titular del hero dice `EL ARCADE / CLASICO ESTA / DE VUELTA`, sin tildes, en tres líneas.
- [ ] Las tres líneas del titular parpadean con `animate-av-flicker`, desfasadas entre sí; la segunda es cian y la tercera magenta, ambas con halo.
- [ ] Ningún color fuera de `--av-cyan`, `--av-magenta`, `--av-yellow`, `--av-amber` y la escala de grises `--av-*` aparece en el código de la portada, salvo el oro, plata y bronce del podio que ya usa el salón.
- [ ] Las siluetas del hero son ocho, flotan y no capturan el puntero (`aria-hidden`).
- [ ] La cuarta tarjeta de ventajas usa `--av-amber`, no verde.
- [ ] El rail muestra seis máquinas con su portada animada, y cada una lleva a su ficha.
- [ ] La primera cifra de la franja coincide con `GAMES.length`.
- [ ] Al bajar, cada sección aparece con desplazamiento y opacidad, y no vuelve a ocultarse al subir.
- [ ] Con `prefers-reduced-motion: reduce` activo, todas las secciones son visibles sin animación.

**Actividad**

- [ ] El panel de últimas puntuaciones muestra siete filas con jugador, máquina, puntuación y fecha `dd/mm/aa`.
- [ ] Las siete filas están ordenadas de fecha más reciente a más antigua.
- [ ] El panel de mejores jugadores muestra cinco nombres distintos, ordenados de mayor a menor puntuación.
- [ ] Las tres primeras filas del ranking se pintan en oro, plata y bronce.
- [ ] La barra de cada fila es más corta que la de la fila anterior.
- [ ] Tras guardar una marca de 999.999 puntos en cualquier máquina, esa marca encabeza ambos paneles al recargar `/`.
- [ ] La consola no muestra ningún aviso de discrepancia de hidratación al cargar `/`.
- [ ] `VER SALÓN →` lleva a `/salon`.

**Sesión y destinos**

- [ ] Sin sesión, el hero ofrece `* CREAR CUENTA` y la tarjeta de precios `EMPEZAR GRATIS →`.
- [ ] Con sesión iniciada, esos dos botones dicen `* MI CUENTA` e `IR A MI CUENTA →`.
- [ ] `> EXPLORAR JUEGOS`, `VER TODOS LOS JUEGOS →` e `INSERTAR MONEDA →` llevan a `/biblioteca`.

**Cierre**

- [ ] `npm run build` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] La portada no desborda en horizontal a 360 px de ancho.

## Decisiones tomadas y descartadas

**Rutas**

- **Sí:** `/` es la portada y la biblioteca se muda a `/biblioteca`. Es lo que asume el `nav.jsx` del template y deja cada URL con un significado propio.
- **No:** dejar la portada en `/inicio` conservando la biblioteca en `/`. Habría dado un sitio que arranca en el catálogo, sin puerta de entrada.
- **Sí:** el logo lleva a `/`, como en el template.
- **Sí:** la biblioteca pierde el rótulo gigante `ARCADE / VAULT` y usa un encabezado de sección. Con el hero delante, ese rótulo salía dos veces en dos pantallas seguidas.

**Acabado visual**

- **Sí:** los tres neones del proyecto más `--av-amber` como cuarto acento. Es token existente y evita inventar color para la cuarta tarjeta.
- **No:** los cinco colores del template ajenos a la paleta (`#00ff88`, `#aa00ff`, `#ffcf3a`, `#ff3060`, `#00d4ff`). Habrían duplicado el sistema de color por una sola pantalla.
- **Sí:** titulares con `text-shadow` neón y `animate-av-flicker`, igual que el rótulo de SPEC 01.
- **No:** los degradados recortados sobre texto del template. Producen otro lenguaje visual y pierden el halo que caracteriza al sitio.
- **Sí:** titulares sin tildes en Press Start 2P (`CLASICO ESTA`). La fuente no tiene glifos acentuados; es la misma regla que ya sigue `lib/games.ts`.
- **Sí:** sólo ASCII (33–126) y `·` en lo que se pinte con Press Start 2P. Es todo lo que cubre la fuente: `▸ ▶ ✦ ✔ Ñ É` los dibuja una fuente de respaldo, a tamaño de cuerpo, y al lado de un glifo de 20 px de avance salen como una mota. De ahí el eyebrow `>>`, los botones de cuenta con `*`, las cabeceras de panel con `>` y el lema `SIN PAGOS OCULTOS` en vez de `SIN LETRA PEQUEÑA`.
- **No:** cambiar `→`, `▼` y el `✔` de las ventajas. También son de la fuente de respaldo, pero acompañan a texto de cuerpo o a un rótulo corto y salen proporcionados.
- **Sí:** portar `.reveal` con `IntersectionObserver`. Es la mitad del ritmo del template y el bloque `prefers-reduced-motion` de `globals.css` ya lo neutraliza donde toca.

**Datos**

- **Sí:** los dos paneles de actividad derivan de `lib/scores.ts`. La portada reacciona a lo que juegas y no contradice al salón.
- **No:** copiar las filas inventadas del template (`Ranaria`, `Bloque Buster`). Nombran máquinas que no existen en el catálogo.
- **Sí:** fecha `dd/mm/aa` en lugar del `hace 2 min` del template. No hay marca de tiempo real; fingirla sería mentir en la única columna verificable.
- **Sí:** rótulo `TOP JUGADORES · GLOBAL` en vez de `· HOY`, y ranking por la mejor marca de cada nombre en cualquier máquina. No existe noción de día ni de jugador global en el modelo.
- **Sí:** primera cifra de la franja tomada de `GAMES.length`. El `12+` del template no se corresponde con las ocho máquinas reales.
- **Sí:** el par `seed*()` / `*()` para todo lo que lee `localStorage`, como en SPEC 01. Evita el aviso de hidratación.
- **Sí:** textos editoriales en `lib/landing.ts`. Se retocan sin abrir la maquetación.

**Alcance**

- **Sí:** conservar la sección de precios pese a ser un producto gratuito. Es donde el template afirma el «100% gratis» con más fuerza.
- **No:** la página «Acerca de». Va en su propia spec; hasta entonces no aparece en el menú, para no dejar un enlace muerto.
- **Sí:** el contador de créditos del `nav.jsx`, aunque sea atrezzo. Se descartó al aprobar la spec por no haber economía de créditos en el producto, y se retomó después a petición del autor: la cifra es una constante y nada la consume. Va como `CREDITOS · 03`, sin tilde.
- **Sí:** cambiar el texto de los botones de cuenta cuando hay sesión. `useSession()` ya existe y ofrecer «crear cuenta» a quien ya entró es un error visible.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                      | Mitigación                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las diez fechas semilla son las mismas para las ocho máquinas, así que hay ocho marcas con fecha `12/04/26`: el panel de últimas puntuaciones podría salir con siete filas de la misma fecha y aspecto de lista arbitraria. | Desempate documentado y estable: primero fecha, luego puntuación mayor, luego orden de `GAMES`. El panel muestra la máquina en cada fila, que es lo que las distingue.                         |
| Sin JavaScript o antes de hidratar, las secciones envueltas en `Reveal` quedarían invisibles si el HTML del servidor ya lleva el estado oculto.                                                                             | `Reveal` sirve el contenido visible y sólo aplica el estado inicial oculto después de montar en el cliente.                                                                                    |
| La portada monta seis lienzos de `GamePreview` además de las siluetas animadas, la rejilla del fondo y el observador de scroll: riesgo de tirones en móvil.                                                                 | La biblioteca ya monta ocho lienzos con la misma implementación, así que no se introduce una carga mayor a la existente. Si aparece tirón, el rail baja a tres máquinas en pantallas pequeñas. |
| Los dos paneles de actividad leen `localStorage`, que no existe en el servidor: riesgo de discrepancia de hidratación.                                                                                                      | Patrón `seed*()` / `*()` de SPEC 01: se pinta la semilla y se sustituye tras montar. Hay criterio de aceptación que lo verifica en consola.                                                    |
| Enlaces o marcadores existentes a `/` esperando el catálogo.                                                                                                                                                                | Siguen funcionando: llegan a la portada, cuyo primer botón lleva a `/biblioteca`. No se añade redirección.                                                                                     |

## Lo que **no** está en esta spec

- La página «Acerca de» de `references/templates/home-about/about.jsx` y su enlace en el menú.
- Actividad realmente en vivo: no hay sondeo, servidor ni marcas de tiempo relativas.
- Los degradados sobre texto y los cinco colores del template ajenos a la paleta.
- Motores de juego, backend, autenticación real y puntuaciones de servidor.
- Framework de tests.

Cada uno de ellos, si entra, va en su propia spec.
