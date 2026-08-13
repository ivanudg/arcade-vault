# Cómo se aplica una skin

La receta de la Fase 6: qué archivos se escriben para vestir una máquina y con qué forma
exacta. **Se lee justo antes de tocar código, no antes.**

Existe porque el agente viste **una máquina por invocación** y la infraestructura es de todas.
Si cada ronda improvisara su propia forma, la segunda máquina no encajaría con la primera.
Aquí está decidido de antemano, y por eso la Fase 8 es mecánica.

**Lo que manda es lo que hay en disco.** Si el repo ya tiene la infraestructura, se reconoce y
no se toca. Si no la tiene, la creas tú, en esta ronda, antes de la paleta.

---

## El reparto: qué es de todas y qué es de una

| Alcance  | Archivos                                                                                     | Cuándo se escribe            |
| -------- | -------------------------------------------------------------------------------------------- | ---------------------------- |
| De todas | `lib/games/skins.ts`, `lib/games/engine.ts`, `components/play-cabinet.tsx`, `lib/storage.ts` | **Una sola vez**, la primera |
| De una   | `lib/games/<juego>/skins.ts` y los archivos de dibujo de ese motor                           | Cada vez que vistes una      |

Los cuatro primeros los comparten los cuatro motores: **un error ahí rompe máquinas que no
estabas tocando**. Por eso el cambio de contrato es aditivo y todo lo nuevo es opcional.

**`components/game-canvas.tsx` no se toca. Nunca.** Su efecto de montaje depende sólo de
`[game]` y así se queda: si la skin entrara por sus props, cambiarla remontaría el motor y
reiniciaría la partida. La skin viaja por el `GameHandle`, que el gabinete ya tiene guardado
en una `ref` desde el `onReady` que ese archivo ya expone.

---

## P0 · La infraestructura, una sola vez

Antes de escribirla, comprueba si existe: `Read lib/games/skins.ts`. Si está, salta este
bloque entero y ve a P1.

### P0.1 · `lib/games/skins.ts` — nuevo

El vocabulario, y el único sitio donde vive. Rótulos en MAYÚSCULAS y sin tildes, que se pintan
en Press Start 2P:

```ts
export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS = ["clasico", "neon", "retro"] as const;

/** La que se ve si nadie elige: los colores de siempre de cada motor. */
export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLASICO",
  neon: "NEON",
  retro: "RETRO",
};
```

### P0.2 · `lib/games/engine.ts` — dos añadidos, los dos opcionales

En `GameHandle`, junto a `press`/`release`:

```ts
  /**
   * Cambia la piel en caliente, sin tocar la partida en curso.
   *
   * Opcional a propósito: un motor sin vestir no la tiene, y el gabinete pinta
   * su selector deshabilitado en vez de romper. El día que las cuatro máquinas
   * estén vestidas, deja de tener sentido que sea opcional.
   */
  setSkin?(id: SkinId): void;
```

En `GameMount`, junto a `hud`:

```ts
  /**
   * Las pieles que este motor sabe pintar. Ausente mientras no esté vestido:
   * es lo que el gabinete mira para saber si enciende el selector, y lo mira
   * antes de montar nada, porque `GameMount` es estático.
   */
  skins?: readonly SkinId[];
```

Y el `import type { SkinId } from "./skins";` arriba.

**`mount()` no cambia de firma.** Se pensó pasarle la skin inicial y no hace falta: el
gabinete llama a `setSkin()` en cuanto recibe el handle, y la partida no arranca hasta que
termina el superpuesto de carga, así que no hay ni un frame con el color equivocado. Un
parámetro más en el contrato que nadie necesita es deuda.

### P0.3 · `lib/storage.ts` — un campo

En `VaultData`:

```ts
  /** Piel elegida en cada máquina. La clave es el `GameId`. */
  skins?: Record<string, SkinId>;
```

`Record<string, SkinId>` y no `Record<GameId, SkinId>` a propósito: `lib/storage.ts` no importa
del catálogo hoy y no va a empezar por esto. **No estrenes clave.** `KEY` sigue siendo
`arcadevault:v1`: añadir un campo opcional no invalida lo guardado, y subir a `v2` cerraría la
sesión de todo el mundo por un color.

### P0.4 · `components/play-cabinet.tsx` — el selector

Cuatro cosas, y ninguna toca la lógica de partida:

1. Estado: `const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);`
2. Al recibir el handle en `onReady`, aplicar la guardada: se lee de `read().skins?.[game.id]`,
   y si hay una y el motor la soporta, `h.setSkin(...)` y `setSkin(...)`.
3. Un cambio de skin: `handle.current?.setSkin(id)`, `setSkin(id)` y
   `persist({ skins: { ...read().skins, [game.id]: id } })`.
4. La botonera: un botón por `SKIN_IDS` con su `SKIN_LABELS`, y **los tres deshabilitados si
   `engine.skins` no existe**. Deshabilitados, no escondidos: es lo mismo que ya hace el mando
   con las teclas que la máquina no usa, y esconderlos descuadraría el chrome.

El selector va **fuera del marco del canvas**, junto al HUD o bajo el mando. No lo metas en el
marco: su ancho está calculado con el ratio del mundo y cualquier cosa dentro lo descuadra.

Léelo de `lib/storage.ts`, no de `localStorage`: ese archivo es el único que lo toca.

---

## P1 · `lib/games/<juego>/skins.ts` — la paleta de esa máquina

Archivo nuevo por motor. Una interfaz con **una propiedad por ranura**, nombrada como la
constante que sustituye, y las tres paletas:

```ts
import type { SkinId } from "@/lib/games/skins";

export interface Palette {
  bg: string;
  body: string;
  // ...una por ranura del inventario de la Fase 4
}

export const PALETTES: Record<SkinId, Palette> = {
  clasico: { bg: "#0a0a0f", body: "#00f5ff" /* ... */ },
  neon: {/* ... */},
  retro: {/* ... */},
};
```

`clasico` es **copia literal** de lo que el motor pintaba antes. Es S2, y aquí se vuelve
verificable de verdad: `git diff` de esa ronda no puede cambiar ni un hex de lo que se veía.

## P2 · Los archivos de dibujo del motor

Cada literal de color se sustituye por su propiedad de la paleta. La paleta llega **por
parámetro**, no por importación:

```ts
export function drawSnake(ctx: CanvasRenderingContext2D, s: Snake, p: Palette): void {
  ctx.fillStyle = p.body;
```

Lo mismo con los velos: **el alfa se queda donde estaba**. Si el motor pintaba
`rgba(0,245,255,0.1)`, la ranura es el color y la transparencia sigue siendo del motor —usa
`tint()` de `lib/games.ts` si necesitas montar el `rgba` desde un hex, que ya existe y sólo
acepta `#rrggbb`—.

Las constantes de color viejas de `constants.ts` **se borran**, no se dejan huérfanas: si se
quedan, el siguiente que lea el motor no sabrá cuál manda. Las que no son color —tamaños,
ritmos, puntuaciones— no se tocan.

## P3 · El `index.ts` del motor

Tres cosas:

```ts
export const snake: GameMount = {
  world: { width: W, height: H },
  hud: ["PUNTOS", "VIDAS", "NIVEL"],
  skins: SKIN_IDS,
  mount(canvas, cb) {
    let palette = PALETTES[DEFAULT_SKIN]; // dentro del closure, siempre
    // ...
    return {
      // ...
      setSkin(id) {
        palette = PALETTES[id];
      },
    };
  },
};
```

**La skin activa vive en el closure de `mount()` y en ningún otro sitio.** En el ámbito de
módulo de un motor no hay ni una variable mutable, y ésta no va a ser la primera: dos partidas
del mismo juego compartirían color. Es la misma regla que ya cumplen la puntuación y las
entidades.

`setSkin()` **sólo cambia el color**. No repinta, no reinicia, no toca el bucle: el siguiente
frame ya sale con la paleta nueva porque el frame lee `palette` cada vez. Si un motor cachea
un color en una entidad al crearla, eso es una ranura mal resuelta y hay que pasarla al
momento de dibujar.

---

## La verificación, y no es opcional

Después de escribir, y antes de responder:

```
npx tsc --noEmit
npm run lint
git status --short
```

Las tres tienen que salir limpias, y `git status` no puede enseñar **ni un archivo que no
estuviera previsto**: los de P0 la primera vez, los del motor que te pidieron y el ledger.
`components/game-canvas.tsx` ahí es un fallo. Otro motor ahí es un fallo.

Si `tsc` falla, lo arreglas tú en esa misma ronda. Dejar el repo sin compilar es peor que no
haber empezado, y el usuario se entera al hacer `npm run build`, no ahora.

## Las cinco reglas de la aplicación

- **Sólo cambia el color.** Ni una constante de ritmo, ni una regla, ni una firma que no sea
  para pasar la paleta. Vestir no es reequilibrar.
- **`clasico` deja la máquina exactamente como estaba.** Si al terminar el juego se ve
  distinto con la skin por defecto, la extracción está mal.
- **Una máquina por ronda.** La que te pidieron. Las otras tres no se abren ni para mirar.
- **La infraestructura se crea una vez y no se rediseña.** Si ya existe y no te gusta, lo dices
  en la respuesta; no la cambias por tu cuenta, que las máquinas ya vestidas dependen de ella.
- **Si algo no cabe en la receta, paras y lo cuentas.** Un motor que necesite otra forma es una
  decisión, y las decisiones no se toman a mitad de un `Edit`.
