/**
 * El atlas de frutas de Snake y su cargador.
 *
 * Snake es la primera máquina del vault que carga un archivo. Las otras tres
 * dibujan todo con primitivas —Arkanoid entró en SPEC 09 explícitamente
 * redibujado sin su spritesheet—, pero aquí las 22 frutas distintas solo existen
 * si se carga la imagen: en una celda de 32 píxeles, una fruta dibujada a mano
 * es un punto de color, y 22 puntos de color son tres neones repetidos.
 *
 * Las 22 entradas de `FRUITS` son copia literal de
 * `references/source-assets/snake-assets/sprites.js`, sin recalcular ni una
 * coordenada: el PNG se sirve entero, así que los recortes siguen valiendo.
 *
 * Lo que este archivo **no** hace es contagiar al contrato. `mount()` sigue
 * siendo síncrono y `GameCanvas` no aprende a esperar assets: el motor pregunta
 * `ready()` en cada frame y, mientras diga que no, pinta la fruta como un
 * círculo magenta.
 */

/** El atlas servido desde `public/`. Es el único archivo que hay ahí. */
export const ATLAS_SRC = "/snake/fruits.png";

/** Un recorte dentro del atlas, en píxeles del PNG. */
export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Las 22 frutas de la fila `y = 136–295` del atlas (hoja de 3790 × 442).
 * Copiadas literales de `sprites.js`.
 *
 * Los recortes son verticales —110 × 160 la manzana, 170 × 160 el kiwi— y la
 * celda del tablero es cuadrada: quien los dibuje conserva la proporción.
 */
export const FRUITS: Readonly<Record<string, SpriteRect>> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

/** Las claves de `FRUITS`, para sortear una fruta por índice. */
export const FRUIT_KEYS: readonly string[] = Object.keys(FRUITS);

/** Lo que el motor necesita saber del atlas: la imagen y si ya sirve. */
export interface FruitAtlas {
  image: HTMLImageElement;
  ready(): boolean;
}

/**
 * Pide el atlas y devuelve un cargador **nuevo por cada montaje**.
 *
 * Una caché de módulo sería estado mutable fuera del closure de `mount()` y
 * rompería el primer patrón del contrato; el navegador ya cachea la petición,
 * así que el segundo montaje no vuelve a descargar nada.
 *
 * `ready()` empieza en `false`, pasa a `true` al cargar y **se queda en `false`
 * para siempre** si salta `error`. El motor solo pregunta eso: no sabe de
 * promesas ni de reintentos.
 */
export function loadFruitAtlas(): FruitAtlas {
  const image = new Image();
  let loaded = false;

  image.addEventListener("load", () => {
    loaded = true;
  });
  image.addEventListener("error", () => {
    loaded = false;
  });

  image.src = ATLAS_SRC;

  return {
    image,
    ready: () => loaded,
  };
}
