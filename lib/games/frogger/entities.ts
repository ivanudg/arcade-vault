/**
 * Las entidades del tablero de Frogger. Clases tipadas con el `ctx` siempre por
 * parámetro: ninguna lo lee de un módulo, porque el canvas llega a `mount()` y
 * montar dos veces tiene que dar dos partidas independientes.
 *
 * Ninguna guarda posiciones de sus entidades: un carril **calcula** dónde está
 * cada coche en el instante `t` con la fórmula de `positions()`, y por eso el
 * juego entero es una función del tiempo y de la ronda. Lo único que sí es
 * estado es la rana, que la mueve el jugador.
 *
 * La piel llega igual que el `ctx`, **por parámetro** y en cada `draw()`: la
 * activa vive en el closure de `mount()` y ninguna entidad se queda con un color
 * guardado, para que cambiarla se vea en el frame siguiente sin tocar la partida
 * en curso. El alfa no viaja con ella: eso es de `constants.ts`.
 *
 * Desde el 2026-08-15 la piel trae además un rasgo de dibujo, `glow`, y el radio
 * de ese halo lo miden aquí `GLOW_BLUR` y `GLOW_BLUR_TIGHT`: la piel dice si hay
 * halo y el motor dice de cuánto, que es la misma frontera que ya rige el alfa.
 * Cada `draw()` que lo enciende lo suelta **en la misma función**, porque el
 * `shadow*` del contexto es estado global y aquí se encadenan cinco por frame.
 */

import {
  ALPHA_GATOR,
  ALPHA_HOME,
  ALPHA_LOG_GRAIN,
  ALPHA_TRUCK,
  ALPHA_TURTLE,
  ALPHA_TURTLE_DIVING,
  CELL,
  DIVE_CYCLE,
  DIVE_DOWN,
  DIVE_WARN,
  FLY_EVERY,
  FLY_LASTS,
  GATOR_CYCLE,
  GATOR_FROM,
  GATOR_OPEN,
  HIT_PAD,
  HOME_COLS,
  HOMES,
  LADY_EVERY,
  LADY_FROM,
  RIDE_PAD,
  ROW_HOMES,
  ROW_MEDIAN,
  SNAKE_SPEED,
  W,
} from "@/lib/games/frogger/constants";
import { cycleAt, overlap, wrapSpan } from "@/lib/games/frogger/math";
import type { LaneSpec } from "@/lib/games/frogger/lanes";
import type { Palette } from "@/lib/games/frogger/skins";
import { glow, noGlow, tint } from "@/lib/games";

/**
 * El radio del halo, en píxeles: 6.
 *
 * **En píxeles y no en fracción de la celda**, como Asteroids, Arkanoid y Snake y
 * al revés que Tetris: allí la unidad natural era el lado de la celda, que cambia
 * entre el tablero y la banda de la siguiente pieza, y aquí el mundo mide siempre
 * `W × H` y ninguna entidad se escala. Pero el motivo de fondo es otro, y es el
 * mismo de las tres rondas anteriores: lo que el radio tiene que respetar no es
 * el tamaño de la entidad sino **el hueco que el dibujo deja a su alrededor**, y
 * ese hueco está escrito en píxeles sueltos —los `+6` y `CELL - 12` del tronco y
 * la caja del camión, el `CELL / 2 - 6` del caparazón— que no cambiarían aunque
 * `CELL` cambiase.
 *
 * Ese hueco son **6 px** y sale dos veces: es el margen que cada plataforma deja
 * hasta el borde de su fila y, por tanto, la mitad de los 12 px de agua que
 * separan dos carriles de río contiguos; y es también la mitad de los 12 px de
 * surco que quedan entre dos caparazones pegados de una misma balsa —celda de 40
 * contra un diámetro de 28—. Con 6 px el aura se apaga justo al cruzar al carril
 * de al lado, así que la carretera no ilumina la carretera de arriba ni el río el
 * río, que es donde el jugador cuenta huecos para decidir el salto; y la balsa se
 * sigue leyendo como una fila de caparazones en vez de fundirse en una barra, que
 * es información de verdad: cada caparazón es una celda que sostiene.
 *
 * El coche es todavía más holgado —deja 8 px por lado— y no impone nada.
 */
const GLOW_BLUR = 6;

/**
 * El radio corto, para una piel que separa las entidades por brillo: 3 px.
 *
 * En la rampa de fósforo la distinción que decide la partida está a **un solo
 * escalón**: la tortuga a flote es `#33ff33` y la que se ha hundido `#22aa22`, y
 * pisar una hundida mata. Con 6 px el aura viva de un tronco o de una tortuga a
 * flote llega al borde del carril de al lado y empuja hacia arriba la media que
 * haya allí, y ahí sí habría choque de S3, el peor de la serie: el brillo es lo
 * único que separa la plataforma que sostiene de la que te ahoga. Con 3 px el
 * sangrado muere a mitad del margen de 6 y el escalón aguanta entero. Es además
 * lo físicamente cierto y lo que ya cerró las cuatro rondas anteriores: un
 * fósforo verde sangra corto y un letrero de neón sangra amplio.
 */
const GLOW_BLUR_TIGHT = 3;

/**
 * Cuánto halo pide esta piel.
 *
 * El motor mide mirando la paleta que tiene delante y no el nombre de la piel
 * —a `draw()` llega una `Palette` y nunca un `SkinId`, así que ni podría—.
 *
 * Lo que mira son **las cuatro amenazas**: coche, camión, cocodrilo y tortuga
 * sumergida. Es el mismo indicador que usan Tetris con sus siete piezas,
 * Asteroids con sus cinco power-ups, Arkanoid con sus ocho rompibles y Snake con
 * su cabeza y su fruta: una piel que ha tenido que pintar del mismo color todo lo
 * que mata es una piel que se quedó sin tintes libres, o sea una que separa por
 * brillo, y en ella un halo largo funde justo lo que la sostiene. Una cuarta piel
 * monocroma se resolvería sola, sin tocar este archivo.
 */
function glowSpread(p: Palette): number {
  const monochrome = p.truck === p.car && p.gator === p.car && p.turtleDiving === p.car;
  return monochrome ? GLOW_BLUR_TIGHT : GLOW_BLUR;
}

/** Un carril con sus entidades, todas del mismo tipo, largo y velocidad. */
export class Lane {
  readonly spec: LaneSpec;

  constructor(spec: LaneSpec) {
    this.spec = spec;
  }

  /** Alto en píxeles de la fila del carril. */
  get y(): number {
    return this.spec.row * CELL;
  }

  /** Largo de una entidad, en píxeles. */
  get width(): number {
    return this.spec.len * CELL;
  }

  /**
   * Longitud del ciclo: un poco más ancha que la pantalla, para que una entidad
   * termine de salir por un borde antes de volver a entrar por el otro.
   */
  private get span(): number {
    return W + this.width;
  }

  /**
   * Extremo izquierdo de cada entidad en el instante `t`, en píxeles.
   *
   * Las entidades se reparten el ciclo a partes iguales, así que un carril de
   * tres deja siempre dos huecos del mismo tamaño. El envolvimiento va por
   * `wrapSpan()` porque los carriles con `speed < 0` producen dividendo
   * negativo desde el primer segundo.
   */
  positions(t: number): number[] {
    const { count, offset, speed } = this.spec;
    const step = this.span / count;
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(wrapSpan(offset + i * step + speed * t, this.span) - this.width);
    }
    return out;
  }

  /**
   * ¿Está sumergida la entidad `i` en el instante `t`?
   *
   * Los grupos de un mismo carril desfasan su ciclo, porque si se sumergieran a
   * la vez el carril entero sería intransitable durante `DIVE_DOWN` segundos.
   */
  submerged(t: number, i: number): boolean {
    if (this.spec.kind !== "turtle" || !this.spec.dives) return false;
    return this.phase(t, i) > DIVE_CYCLE - DIVE_DOWN;
  }

  /** ¿Está a punto de sumergirse? Es el aviso que la convierte en decisión. */
  diving(t: number, i: number): boolean {
    if (this.spec.kind !== "turtle" || !this.spec.dives) return false;
    const phase = this.phase(t, i);
    return phase > DIVE_CYCLE - DIVE_DOWN - DIVE_WARN && phase <= DIVE_CYCLE - DIVE_DOWN;
  }

  private phase(t: number, i: number): number {
    return cycleAt(t + (i * DIVE_CYCLE) / this.spec.count, DIVE_CYCLE);
  }

  /**
   * ¿Atropella alguna entidad a una rana cuyo borde izquierdo está en `x`?
   *
   * Con `HIT_PAD` de margen a cada lado: rozar la esquina de un coche no mata.
   */
  hits(t: number, x: number): boolean {
    const body = CELL - 2 * HIT_PAD;
    return this.positions(t).some((pos) => overlap(x + HIT_PAD, body, pos, this.width));
  }

  /**
   * Extremo izquierdo de la plataforma **sólida** que sostiene a la rana, o
   * `null` si ahí no hay nada que la sostenga.
   *
   * Se apoya mientras la plataforma cubra algo de su franja central —`RIDE_PAD`
   * a cada lado—, que es la indulgencia simétrica a la que `hits()` da en la
   * carretera. Las dos existen porque el error que produce cada una es distinto:
   * en carretera la injusticia es morir sin tocar; en el río, ahogarse
   * pareciendo estar encima. Y aquí pasaba de verdad: entre que el salto dura
   * `HOP_MS` y que la plataforma deriva mientras la rana vuela, aterrizar con
   * medio cuerpo sobre el tronco dejaba el centro un píxel fuera.
   *
   * Una tortuga sumergida no cuenta, pero tampoco descarta al resto: se sigue
   * mirando por si hay otra plataforma debajo.
   */
  carrier(t: number, x: number): number | null {
    const positions = this.positions(t);
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (!overlap(x + RIDE_PAD, CELL - 2 * RIDE_PAD, pos, this.width)) continue;
      if (this.spec.kind === "turtle" && this.submerged(t, i)) continue;
      return pos;
    }
    return null;
  }

  draw(ctx: CanvasRenderingContext2D, t: number, p: Palette): void {
    const positions = this.positions(t);
    for (let i = 0; i < positions.length; i++) {
      const x = positions[i];
      switch (this.spec.kind) {
        case "car":
          this.drawCar(ctx, x, p);
          break;
        case "truck":
          this.drawTruck(ctx, x, p);
          break;
        case "log":
          this.drawLog(ctx, x, p);
          break;
        case "turtle":
          this.drawTurtles(ctx, x, t, i, p);
          break;
      }
    }
  }

  private drawCar(ctx: CanvasRenderingContext2D, x: number, p: Palette): void {
    const y = this.y;
    ctx.fillStyle = p.car;
    if (p.glow) glow(ctx, p.car, glowSpread(p));
    ctx.fillRect(x + 3, y + 8, this.width - 6, CELL - 16);
    // Morro, para que se vea hacia dónde va.
    const nose = this.spec.speed >= 0 ? x + this.width - 8 : x + 3;
    ctx.fillRect(nose, y + 13, 5, CELL - 26);
    if (p.glow) noGlow(ctx);
  }

  private drawTruck(ctx: CanvasRenderingContext2D, x: number, p: Palette): void {
    const y = this.y;
    const forward = this.spec.speed >= 0;
    // El 0,7 es del dibujo, no de la piel: la caja siempre va translúcida. El
    // aura toma ese mismo `rgba`, así que el velo del motor la atraviesa entera
    // en vez de quedarse opaca detrás de una caja que sí se ve el fondo.
    const box = tint(p.truck, ALPHA_TRUCK);
    ctx.fillStyle = box;
    if (p.glow) glow(ctx, box, glowSpread(p));
    const boxX = forward ? x + 3 : x + CELL - 3;
    ctx.fillRect(boxX, y + 6, this.width - CELL, CELL - 12);
    // Cabina, un poco más baja. Es otra ranura: reengancha el halo con su color,
    // o ardería del de la caja.
    const cabX = forward ? x + this.width - CELL + 2 : x + 4;
    ctx.fillStyle = p.car;
    if (p.glow) glow(ctx, p.car, glowSpread(p));
    ctx.fillRect(cabX, y + 10, CELL - 6, CELL - 20);
    if (p.glow) noGlow(ctx);
  }

  private drawLog(ctx: CanvasRenderingContext2D, x: number, p: Palette): void {
    const y = this.y;
    ctx.fillStyle = p.log;
    if (p.glow) glow(ctx, p.log, glowSpread(p));
    ctx.fillRect(x, y + 6, this.width, CELL - 12);
    // Vetas: una raya por celda, para que se lea el arrastre. Van sin halo y el
    // tronco lo suelta antes de pintarlas: la veta es un **recorte** del color
    // del fondo, y un aura suya sólo serviría para comerse el tronco por dentro.
    if (p.glow) noGlow(ctx);
    ctx.fillStyle = tint(p.grain, ALPHA_LOG_GRAIN);
    for (let c = 1; c < this.spec.len; c++) {
      ctx.fillRect(x + c * CELL - 1, y + 8, 2, CELL - 16);
    }
  }

  private drawTurtles(
    ctx: CanvasRenderingContext2D,
    x: number,
    t: number,
    i: number,
    p: Palette,
  ): void {
    const y = this.y;
    const down = this.submerged(t, i);
    const warning = this.diving(t, i);
    // **La ranura que manda en esta máquina.** El halo toma el mismo `rgba` que
    // el relleno, no el hex opaco, y eso es lo que conserva la única señal que
    // avisa de que pisar aquí mata: el aura de la hundida se pinta a 0,25 y la de
    // la que flota a 0,75, así que la distancia entre las dos es exactamente la
    // misma que sin halo. Con el hex opaco, la hundida habría ganado un aura
    // sólida alrededor de un cuerpo translúcido y habría subido de brillo justo
    // en el frame en el que tiene que apagarse.
    const fill =
      down || warning ? tint(p.turtleDiving, ALPHA_TURTLE_DIVING) : tint(p.turtle, ALPHA_TURTLE);
    ctx.fillStyle = fill;
    if (p.glow) glow(ctx, fill, glowSpread(p));
    for (let c = 0; c < this.spec.len; c++) {
      const cx = x + c * CELL + CELL / 2;
      const cy = y + CELL / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL / 2 - 6, 0, Math.PI * 2);
      ctx.fill();
      if (down) continue;
      // Cabeza, sólo mientras sostiene: es la señal de que se puede pisar.
      ctx.beginPath();
      ctx.arc(cx + (this.spec.speed >= 0 ? 11 : -11), cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.glow) noGlow(ctx);
  }
}

/** El salto en curso: de dónde sale, a dónde va y cuánto lleva recorrido. */
export interface Hop {
  fromX: number;
  fromRow: number;
  toX: number;
  toRow: number;
  /** Progreso de 0 a 1. */
  k: number;
}

export class Frog {
  /** Píxel continuo del borde izquierdo: la plataforma la arrastra. */
  x: number;
  row: number;
  /** Fila más alta alcanzada en esta travesía; base de los puntos por avance. */
  best: number;
  /** Salto en curso, o `null` si está quieta. */
  hop: Hop | null = null;
  /** ¿Lleva la dama-rana encima? Vale `POINTS_LADY` al llegar a casa. */
  escorting = false;

  constructor(x: number, row: number) {
    this.x = x;
    this.row = row;
    this.best = row;
  }

  /**
   * Cuadra la rana a la celda más cercana, sin salirse del tablero.
   *
   * Hace falta porque en el río la arrastra la plataforma y su `x` deja de ser
   * múltiplo de `CELL`: un salto que partiera de ahí heredaría el desfase para
   * el resto de la travesía.
   */
  snap(): void {
    const col = Math.round(this.x / CELL);
    this.x = Math.min(Math.max(col, 0), W / CELL - 1) * CELL;
  }

  /** Dónde se pinta ahora mismo: durante un salto, entre origen y destino. */
  viewX(): number {
    if (!this.hop) return this.x;
    return this.hop.fromX + (this.hop.toX - this.hop.fromX) * this.hop.k;
  }

  viewY(): number {
    if (!this.hop) return this.row * CELL;
    return (this.hop.fromRow + (this.hop.toRow - this.hop.fromRow) * this.hop.k) * CELL;
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    const x = this.viewX();
    const y = this.viewY();
    // A media zancada la rana se agranda: es lo que da lectura al salto.
    const lift = this.hop ? Math.sin(this.hop.k * Math.PI) * 3 : 0;
    const pad = 7 - lift;

    ctx.fillStyle = p.frog;
    if (p.glow) glow(ctx, p.frog, glowSpread(p));
    ctx.beginPath();
    ctx.ellipse(x + CELL / 2, y + CELL / 2, CELL / 2 - pad, CELL / 2 - pad - 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Patas traseras, abiertas mientras salta.
    const legs = 4 + lift * 2;
    ctx.fillRect(x + 4, y + CELL / 2 + legs - 2, 6, 3);
    ctx.fillRect(x + CELL - 10, y + CELL / 2 + legs - 2, 6, 3);

    // Ojos. Sin halo, y se suelta antes de pintarlos: son un recorte del color
    // del fondo, así que su aura sólo comería el cuerpo desde dentro.
    if (p.glow) noGlow(ctx);
    ctx.fillStyle = p.detail;
    ctx.beginPath();
    ctx.arc(x + CELL / 2 - 5, y + CELL / 2 - 5, 2.5, 0, Math.PI * 2);
    ctx.arc(x + CELL / 2 + 5, y + CELL / 2 - 5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // La dama-rana viaja como un punto encima, no como una entidad que sigue.
    // Es otra ranura y reengancha su propio halo: en `neon` el ámbar despega del
    // amarillo de la rana, y en `retro` va en tenue sobre un cuerpo vivo, así que
    // su aura no puede aclararlo —el color del aura es el del punto, no el del
    // cuerpo—.
    if (this.escorting) {
      ctx.fillStyle = p.lady;
      if (p.glow) glow(ctx, p.lady, glowSpread(p));
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + 7, 4, 0, Math.PI * 2);
      ctx.fill();
      if (p.glow) noGlow(ctx);
    }
  }
}

/**
 * Los cinco nichos de la orilla de arriba, con el cocodrilo y la mosca.
 *
 * Cuál de los cinco toca no se sortea: sale del número de ciclo y de la ronda,
 * así que dos partidas de la misma ronda ven lo mismo en el mismo segundo. Una
 * casa que se cerrara sin motivo aparente parecería un bug, y es justo el sitio
 * donde el azar tentaría más.
 */
export class Homes {
  /** Los cinco nichos: `true` si ya tienen rana. */
  filled: boolean[] = Array.from({ length: HOMES }, () => false);

  /** Píxel del borde izquierdo del nicho `i`. */
  static x(i: number): number {
    return HOME_COLS[i] * CELL;
  }

  get y(): number {
    return ROW_HOMES * CELL;
  }

  /** ¿En qué nicho cae el centro de una rana con el borde izquierdo en `x`? */
  indexAt(x: number): number | null {
    const center = x + CELL / 2;
    for (let i = 0; i < HOMES; i++) {
      const left = Homes.x(i);
      if (center >= left && center < left + CELL) return i;
    }
    return null;
  }

  /** ¿Están los cinco ocupados? */
  get complete(): boolean {
    return this.filled.every(Boolean);
  }

  reset(): void {
    this.filled = this.filled.map(() => false);
  }

  /**
   * Índice del nicho con cocodrilo ahora mismo, o `null`.
   *
   * Asoma los `GATOR_OPEN` primeros segundos de cada ciclo de `GATOR_CYCLE`, y
   * nunca en un nicho que ya tiene rana: ahí no cabe.
   */
  gatorAt(t: number, round: number): number | null {
    if (round < GATOR_FROM) return null;
    if (cycleAt(t, GATOR_CYCLE) > GATOR_OPEN) return null;
    const i = (Math.floor(t / GATOR_CYCLE) + round) % HOMES;
    return this.filled[i] ? null : i;
  }

  /**
   * Índice del nicho con mosca ahora mismo, o `null`. Sale desde la ronda 1: es
   * la recompensa, no el castigo, y no hay ninguna `*_FROM` que la retrase.
   */
  flyAt(t: number, round: number): number | null {
    if (cycleAt(t, FLY_EVERY) > FLY_LASTS) return null;
    const i = (Math.floor(t / FLY_EVERY) + round) % HOMES;
    if (this.filled[i]) return null;
    // Nunca en el mismo nicho que el cocodrilo: sería un cebo imposible.
    return this.gatorAt(t, round) === i ? null : i;
  }

  draw(ctx: CanvasRenderingContext2D, t: number, round: number, p: Palette): void {
    const gator = this.gatorAt(t, round);
    const fly = this.flyAt(t, round);
    const y = this.y;

    for (let i = 0; i < HOMES; i++) {
      const x = Homes.x(i);

      // El marco es señalización fija del tablero y va sin halo. En `retro` está
      // en el escalón tenue a propósito, y un aura lo empujaría hacia el medio,
      // que es donde asoma el cocodrilo **dentro de este mismo nicho**: ésa es la
      // confusión que cuesta una vida, porque uno premia y el otro mata.
      ctx.strokeStyle = tint(p.home, ALPHA_HOME);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 4, CELL - 4, CELL - 8);

      if (this.filled[i]) {
        // Misma ranura que la rana del jugador, así que mismo halo: un nicho
        // ocupado se lee encendido, que es justo lo que ya no hay que volver a
        // mirar.
        ctx.fillStyle = p.frog;
        if (p.glow) glow(ctx, p.frog, glowSpread(p));
        ctx.beginPath();
        ctx.ellipse(x + CELL / 2, y + CELL / 2, CELL / 2 - 9, CELL / 2 - 11, 0, 0, Math.PI * 2);
        ctx.fill();
        if (p.glow) noGlow(ctx);
        continue;
      }

      if (gator === i) this.drawGator(ctx, x, y, p);
      if (fly === i) this.drawFly(ctx, x, y, t, p);
    }
  }

  private drawGator(ctx: CanvasRenderingContext2D, x: number, y: number, p: Palette): void {
    // El 0,85 es del dibujo y el aura toma ese mismo `rgba`: el cocodrilo asoma
    // translúcido y su resplandor asoma con él.
    const hide = tint(p.gator, ALPHA_GATOR);
    ctx.fillStyle = hide;
    if (p.glow) glow(ctx, hide, glowSpread(p));
    // Dos triángulos: el hocico abierto asomando por el fondo del nicho.
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 14);
    ctx.lineTo(x + CELL - 7, y + 18);
    ctx.lineTo(x + 7, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 26);
    ctx.lineTo(x + CELL - 7, y + 24);
    ctx.lineTo(x + 7, y + 32);
    ctx.closePath();
    ctx.fill();
    // Dientes: recorte del color del fondo, igual que los ojos, así que el halo
    // se suelta antes de pintarlos.
    if (p.glow) noGlow(ctx);
    ctx.fillStyle = p.detail;
    for (let d = 0; d < 4; d++) {
      ctx.fillRect(x + 10 + d * 6, y + 20, 2, 4);
    }
  }

  private drawFly(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    t: number,
    p: Palette,
  ): void {
    // Parpadea: es lo que la distingue de un adorno del nicho.
    if (cycleAt(t, 0.6) > 0.4) return;
    // La mosca sí lleva halo y el marco del nicho no, así que en `retro` —donde
    // los dos están en tenue— gana una separación que antes sólo daban la forma y
    // el parpadeo.
    ctx.fillStyle = p.lady;
    if (p.glow) glow(ctx, p.lady, glowSpread(p));
    ctx.beginPath();
    ctx.arc(x + CELL / 2, y + CELL / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + CELL / 2 - 8, y + CELL / 2 - 5, 5, 2);
    ctx.fillRect(x + CELL / 2 + 3, y + CELL / 2 - 5, 5, 2);
    if (p.glow) noGlow(ctx);
  }
}

/**
 * La serpiente que patrulla la mediana desde `SNAKE_FROM`.
 *
 * Es la única entidad del tablero con estado propio en vez de una función del
 * tiempo: rebota, y un rebote depende de dónde venía.
 */
export class Snake {
  x: number;
  dir: 1 | -1 = 1;

  constructor(x: number) {
    this.x = x;
  }

  get y(): number {
    return ROW_MEDIAN * CELL;
  }

  update(dt: number, mult: number): void {
    this.x += SNAKE_SPEED * mult * this.dir * dt;
    if (this.x <= 0) {
      this.x = 0;
      this.dir = 1;
    } else if (this.x >= W - CELL) {
      this.x = W - CELL;
      this.dir = -1;
    }
  }

  /** Con la misma indulgencia que un coche: rozarla no mata. */
  hits(x: number): boolean {
    return overlap(x + HIT_PAD, CELL - 2 * HIT_PAD, this.x, CELL);
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    const y = this.y;
    // Misma ranura y mismo velo que el cocodrilo, así que mismo halo: las dos son
    // la misma amenaza con dos formas.
    const body = tint(p.gator, ALPHA_GATOR);
    ctx.fillStyle = body;
    if (p.glow) glow(ctx, body, glowSpread(p));
    // Cuerpo ondulado: cuatro tramos que alternan de altura.
    for (let s = 0; s < 4; s++) {
      const sx = this.x + s * 10;
      const sy = y + (s % 2 === 0 ? 15 : 20);
      ctx.fillRect(sx, sy, 10, 6);
    }
    // Cabeza, en el sentido de la marcha.
    const hx = this.dir === 1 ? this.x + CELL - 6 : this.x;
    ctx.fillRect(hx, y + 14, 6, 8);
    if (p.glow) noGlow(ctx);
  }
}

/**
 * La dama-rana, esperando sobre una plataforma del río.
 *
 * Se implementa como una bandera en la rana —`escorting`— y no como una entidad
 * que la sigue: es una línea de estado en vez de un sistema, y visualmente basta
 * con un punto encima.
 */
export class Bonus {
  /** ¿Está ahora mismo en el tablero? */
  active = false;
  /** Píxel del borde izquierdo, ya centrado sobre su plataforma. */
  laneX = 0;
  /** Fila del carril que la lleva, en píxeles. */
  laneY = 0;

  /** Ciclo de `LADY_EVERY` que se está sirviendo, y si ya se gastó. */
  private cycle = -1;
  private spent = false;

  /**
   * Sigue a la plataforma que le tocó este ciclo.
   *
   * Aparece cuando esa plataforma entra entera en pantalla y se va con ella:
   * una sola aparición por ciclo, sin más temporizador que la geometría del
   * carril.
   */
  update(t: number, round: number, lane: Lane): void {
    if (round < LADY_FROM) {
      this.active = false;
      return;
    }

    const cycle = Math.floor(t / LADY_EVERY);
    if (cycle !== this.cycle) {
      this.cycle = cycle;
      this.spent = false;
      this.active = false;
    }
    if (this.spent) return;

    const i = (cycle + round) % lane.spec.count;
    const x = lane.positions(t)[i];
    const visible = x >= 0 && x + lane.width <= W;

    if (visible) {
      this.active = true;
      this.laneX = x + lane.width / 2 - CELL / 2;
      this.laneY = lane.y;
    } else if (this.active) {
      // Se fue montada en su plataforma: hasta el ciclo siguiente.
      this.active = false;
      this.spent = true;
    }
  }

  /** La recoge la rana: se apaga hasta el ciclo siguiente. */
  take(): void {
    this.active = false;
    this.spent = true;
  }

  reset(): void {
    this.active = false;
    this.spent = false;
    this.cycle = -1;
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    if (!this.active) return;
    const x = this.laneX;
    const y = this.laneY;

    ctx.fillStyle = p.lady;
    if (p.glow) glow(ctx, p.lady, glowSpread(p));
    ctx.beginPath();
    ctx.ellipse(x + CELL / 2, y + CELL / 2, CELL / 2 - 9, CELL / 2 - 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ojos: recorte, sin halo, y el de la dama se suelta antes.
    if (p.glow) noGlow(ctx);
    ctx.fillStyle = p.detail;
    ctx.beginPath();
    ctx.arc(x + CELL / 2 - 4, y + CELL / 2 - 4, 2, 0, Math.PI * 2);
    ctx.arc(x + CELL / 2 + 4, y + CELL / 2 - 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
