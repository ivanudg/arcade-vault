/**
 * Las tres pieles de Frogger.
 *
 * Diecisiete ranuras: las quince del bloque `── Colores ──` de `constants.ts` y
 * **dos fugas** que estaban escritas a mano en `entities.ts` —el recorte oscuro
 * de los ojos de la rana, los dientes del cocodrilo y los ojos de la dama-rana,
 * y las vetas del tronco—. Las dos cuentan como ranura igual que las demás: eran
 * ranuras sin nombre, y ahora se llaman `detail` y `grain`.
 *
 * **El alfa no es de la piel.** Nueve de las diecisiete se pintaban con un `rgba`
 * escrito entero —el agua a 0,10, el camión a 0,7, la tortuga a 0,75 contra el
 * 0,25 de la sumergida, el cocodrilo a 0,85, el marco del nicho a 0,45, las
 * vetas a 0,35, las líneas de carril a 0,16— y una décima con `globalAlpha`, el
 * velo de las orillas. Esas transparencias son decisiones de dibujo del motor y
 * siguen siéndolo: viven en el bloque `── Velos ──` de `constants.ts` y el motor
 * monta el `rgba` con `tint()`. Por eso aquí todo va en `#rrggbb` de seis
 * dígitos, que es lo único que `tint()` acepta, y por eso elegir `clasico` da
 * exactamente los mismos `rgba` que había antes, dígito a dígito.
 *
 * **La tortuga es la ranura que manda en `retro`.** Pisar una sumergida mata, así
 * que a flote y hundida tienen que separarse sin tinte: se separan por escalón
 * —vivo contra medio— y encima por el velo que ya ponía el motor, así que la
 * diferencia de brillo en pantalla es la misma que en `clasico`.
 *
 * `clasico` es extracción, no diseño: cada hex se puede señalar en el código que
 * había antes de vestir la máquina, así que la piel por defecto deja la partida
 * exactamente como estaba.
 */

import type { SkinId } from "@/lib/games/skins";

export interface Palette {
  /** El asfalto, y con él el lienzo: se pinta opaco sobre todo el mundo. */
  road: string;
  /** Las marcas discontinuas entre carriles de carretera. Velo del motor. */
  laneLine: string;
  /** La franja del río, encima del asfalto. Velo del motor. */
  water: string;
  /** Las tres franjas seguras: orilla de casas, mediana y acera. Velo y filetes. */
  bank: string;
  /** El coche, y también la cabina del camión. */
  car: string;
  /** La caja del camión. Velo del motor. */
  truck: string;
  /** El tronco del río. */
  log: string;
  /** Las vetas del tronco, una por celda. Velo del motor. */
  grain: string;
  /** La tortuga a flote: la que sostiene. Velo del motor. */
  turtle: string;
  /** La tortuga sumergida y la que avisa de que va a hundirse. Velo del motor. */
  turtleDiving: string;
  /** La rana del jugador, y las ranas ya sentadas en sus nichos. */
  frog: string;
  /** La dama-rana, la mosca del nicho y el punto de escolta sobre la rana. */
  lady: string;
  /** El cocodrilo de las casas y la serpiente de la mediana. Velo del motor. */
  gator: string;
  /** El marco de un nicho vacío. Velo del motor. */
  home: string;
  /** La barra del cronómetro mientras queda tiempo. */
  timer: string;
  /** La barra bajo `TIME_LOW`, y la X que marca la muerte sobre la rana. */
  timerLow: string;
  /** El recorte oscuro dentro de una entidad: ojos y dientes. */
  detail: string;
}

/**
 * `neon` reparte los cuatro acentos por familias, que es lo que SPEC 14 no podía
 * hacer con tres: **magenta lo que mata, cian lo que sostiene, amarillo lo tuyo y
 * ámbar el premio.** Eso arregla dos coincidencias de `clasico` que hoy sí
 * confunden:
 *
 * - El cocodrilo y la serpiente eran del **mismo amarillo que la rana**. Aquí
 *   bajan al magenta de los coches: lo que te mata se lee igual esté en la
 *   carretera, en la mediana o asomando en un nicho.
 * - La dama-rana, la mosca y el punto de escolta eran del **mismo magenta que
 *   los coches**. Aquí toman el `--av-amber`, el cuarto acento y el único que la
 *   máquina no usaba, que además es el token que `globals.css` reserva para el
 *   aviso suave. Y el punto de escolta deja de ser invisible sobre una rana
 *   amarilla.
 *
 * Las tres franjas seguras bajan a `--av-text-dim`: son refugio, no amenaza, y
 * teñirlas del magenta de la carretera era la tercera coincidencia. El resto de
 * la piel es lo que ya había, porque SPEC 14 pintó Frogger con tokens del vault
 * —igual que SPEC 10 hizo con Snake— y el contrato avisa de que eso no es un
 * error.
 *
 * `retro` separa por brillo, y el reparto sale de la rampa tal cual: **vivo** lo
 * que controlas o pisas —la rana y las plataformas del río—; **medio** lo que
 * amenaza —coches, camión, agua, cocodrilo, serpiente y la tortuga que se
 * hunde—; **tenue** el fondo activo —las orillas, las marcas de carril, el marco
 * del nicho vacío—; y el **fondo** para los recortes, que es lo que ojos,
 * dientes y vetas son de verdad: huecos, no entidades.
 *
 * `lady` es la excepción y no es un descuido. Es la única ranura que se pinta
 * **encima de otra entidad viva**: la dama-rana viaja sobre su plataforma y el
 * punto de escolta se dibuja sobre el lomo de la rana, así que en vivo se habría
 * borrado contra las dos. Se lleva el tenue, que es el escalón que no usa nada
 * de lo que hay debajo, y de paso queda separada del cocodrilo —esa confusión sí
 * cuesta una vida: los dos asoman en la fila de casas y uno premia y el otro
 * mata—. Contra el marco del nicho, que también es tenue, la separan el velo
 * 0,45 del marco y su parpadeo.
 *
 * El cronómetro va al revés que en las otras dos pieles y es a propósito:
 * `timer` es tenue y `timerLow` sube a medio, así que la barra **se enciende**
 * al entrar en los últimos `TIME_LOW` segundos. En monocromo una alarma no puede
 * cambiar de tinte, así que cambia de brillo, y hacia arriba. Ese mismo medio es
 * el de la X de la muerte, que se pinta encima de la rana: en vivo habría
 * desaparecido sobre ella.
 */
export const PALETTES: Record<SkinId, Palette> = {
  clasico: {
    road: "#0a0a0f",
    laneLine: "#ff006e",
    water: "#00f5ff",
    bank: "#ff006e",
    car: "#ff006e",
    truck: "#ff006e",
    log: "#00f5ff",
    grain: "#0a0a0f",
    turtle: "#00f5ff",
    turtleDiving: "#00f5ff",
    frog: "#f5ff00",
    lady: "#ff006e",
    gator: "#f5ff00",
    home: "#00f5ff",
    timer: "#f5ff00",
    timerLow: "#ff006e",
    detail: "#0a0a0f",
  },
  neon: {
    road: "#0a0a0f",
    laneLine: "#ff006e",
    water: "#00f5ff",
    bank: "#6f7686",
    car: "#ff006e",
    truck: "#ff006e",
    log: "#00f5ff",
    grain: "#0a0a0f",
    turtle: "#00f5ff",
    turtleDiving: "#00f5ff",
    frog: "#f5ff00",
    lady: "#ff9d4d",
    gator: "#ff006e",
    home: "#00f5ff",
    timer: "#f5ff00",
    timerLow: "#ff006e",
    detail: "#0a0a0f",
  },
  retro: {
    road: "#001100",
    laneLine: "#116611",
    water: "#22aa22",
    bank: "#116611",
    car: "#22aa22",
    truck: "#22aa22",
    log: "#33ff33",
    grain: "#001100",
    turtle: "#33ff33",
    turtleDiving: "#22aa22",
    frog: "#33ff33",
    lady: "#116611",
    gator: "#22aa22",
    home: "#116611",
    timer: "#116611",
    timerLow: "#22aa22",
    detail: "#001100",
  },
};
