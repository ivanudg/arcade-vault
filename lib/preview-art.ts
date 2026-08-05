/**
 * Las escenas de las previews, portadas de `drawPreview()` en
 * references/templates/arcade-core.js.
 *
 * Es dibujo, no juego: ni bucle de animación ni entrada de teclado. Función
 * pura sobre un contexto 2D, sin dependencias de React, para que el componente
 * del paso 8 sólo tenga que pasarle el canvas.
 *
 * La aritmética se copia literal, incluidos los números mágicos: cualquier
 * "limpieza" cambiaría la escena. Todo se mide en fracciones de `W`/`H` y en
 * `u = W / 100`, así que las escenas escalan con el canvas.
 *
 * **Aquí hay arte sin máquina.** SPEC 07 vació el catálogo y dejó archivadas
 * las ocho escenas de las máquinas que salieron. Una de ellas era una pantalla
 * de Tetris esperando a su juego: en SPEC 08 llegó, y esa escena **se movió**
 * —no se copió— al `case "tetris"` de abajo. Quedan siete, y `muro` es la
 * siguiente con dueño a la vista: es una pantalla de Arkanoid, que espera en
 * `references/started-games/` a entrar con su motor. Cuando entre, su escena
 * hace el mismo viaje: sale de `ArchivedPreviewId` y entra por `GameId`.
 */

import type { GameId } from "@/lib/games";

/** Escenas que quedaron sin máquina cuando SPEC 07 vació el catálogo. */
type ArchivedPreviewId =
  "muro" | "serpiente" | "invasores" | "rocas" | "duelo" | "corredor" | "laberinto";

/** Toda máquina del catálogo tiene escena, y además hay escena sin máquina. */
export type PreviewId = GameId | ArchivedPreviewId;

export function drawPreview(
  ctx: CanvasRenderingContext2D,
  id: PreviewId,
  W: number,
  H: number,
): void {
  /** Rectángulo de neón: el pincel de casi todas las escenas. */
  const px = (c: string, x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.shadowBlur = W / 24;
    ctx.shadowColor = c;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  /** Circunferencia de neón: sólo la usan los asteroides de `rocas`. */
  const ring = (c: string, x: number, y: number, r: number) => {
    ctx.save();
    ctx.shadowBlur = W / 24;
    ctx.shadowColor = c;
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1.5, W / 130);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  /**
   * Roca facetada: el trazo irregular que dibuja el motor de `asteroids`. Los
   * radios vienen dados, no salen de `Math.random()`: la miniatura tiene que
   * ser la misma en cada render.
   */
  const rock = (
    c: string,
    x: number,
    y: number,
    r: number,
    radii: readonly number[],
    rot: number,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.shadowBlur = W / 24;
    ctx.shadowColor = c;
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1.5, W / 130);
    ctx.lineJoin = "round";
    ctx.beginPath();
    radii.forEach((k, i) => {
      const a = (i / radii.length) * Math.PI * 2;
      const vx = Math.cos(a) * r * k;
      const vy = Math.sin(a) * r * k;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0a0c14");
  bg.addColorStop(1, "#05060a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const u = W / 100;

  switch (id) {
    case "muro": {
      const cols = 8;
      const rows = 3;
      const bw = W / cols;
      const bh = H * 0.11;
      const cs = ["#00f5ff", "#ff006e", "#f5ff00"];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Los dos huecos de la fila de abajo: el muro ya está empezado.
          if (r === 2 && (c === 2 || c === 5)) continue;
          px(cs[r], c * bw + u, H * 0.12 + r * bh + u * 0.6, bw - u * 2, bh - u * 1.4);
        }
      }
      px("#00f5ff", W * 0.36, H * 0.86, W * 0.28, H * 0.05); // pala
      px("#f5ff00", W * 0.56, H * 0.7, u * 3, u * 3); // bola
      break;
    }

    case "serpiente": {
      const N = 10;
      const C = Math.min(W, H) / N;
      const ox = (W - C * N) / 2;
      const oy = (H - C * N) / 2;
      ctx.strokeStyle = "rgba(0,245,255,0.1)";
      for (let i = 0; i <= N; i++) {
        ctx.beginPath();
        ctx.moveTo(ox + i * C, oy);
        ctx.lineTo(ox + i * C, oy + C * N);
        ctx.moveTo(ox, oy + i * C);
        ctx.lineTo(ox + C * N, oy + i * C);
        ctx.stroke();
      }
      // Cuerpo en L; el primer segmento es la cabeza, en amarillo.
      const body: [number, number][] = [
        [3, 6],
        [3, 5],
        [3, 4],
        [4, 4],
        [5, 4],
        [5, 5],
      ];
      body.forEach((p, k) => {
        px(k === 0 ? "#f5ff00" : "#00f5ff", ox + p[0] * C + 1.5, oy + p[1] * C + 1.5, C - 3, C - 3);
      });
      px("#ff006e", ox + 7 * C + C * 0.25, oy + 2 * C + C * 0.25, C * 0.5, C * 0.5); // fruta
      break;
    }

    case "invasores": {
      for (let ir = 0; ir < 3; ir++) {
        for (let ic = 0; ic < 6; ic++) {
          const c0 = ir < 2 ? "#ff006e" : "#00f5ff";
          const ix = W * 0.12 + ic * W * 0.14;
          const iy = H * 0.16 + ir * H * 0.16;
          px(c0, ix - u * 3.4, iy - u * 2, u * 6.8, u * 3.6); // cuerpo
          px(c0, ix - u * 2.2, iy + u * 2, u * 1.6, u * 1.4); // patas
          px(c0, ix + u * 0.6, iy + u * 2, u * 1.6, u * 1.4);
        }
      }
      px("#f5ff00", W * 0.44, H * 0.86, u * 12, u * 2.6); // base de la nave
      px("#f5ff00", W * 0.48, H * 0.8, u * 3, u * 3); // torreta
      px("#f5ff00", W * 0.495, H * 0.6, u * 1.4, u * 5); // disparo
      break;
    }

    case "rocas": {
      ring("#00f5ff", W * 0.22, H * 0.3, W * 0.11);
      ring("#00f5ff", W * 0.78, H * 0.24, W * 0.07);
      ring("#00f5ff", W * 0.7, H * 0.72, W * 0.13);
      px("#f5ff00", W * 0.45, H * 0.44, u * 1.6, u * 1.6); // bala
      // La nave es el único trazo rotado: se dibuja en su propio sistema.
      ctx.save();
      ctx.translate(W * 0.36, H * 0.62);
      ctx.rotate(-0.5);
      ctx.shadowBlur = W / 20;
      ctx.shadowColor = "#ff006e";
      ctx.strokeStyle = "#ff006e";
      ctx.lineWidth = Math.max(1.6, W / 110);
      ctx.beginPath();
      ctx.moveTo(u * 7, 0);
      ctx.lineTo(-u * 5, u * 4.5);
      ctx.lineTo(-u * 2.4, 0);
      ctx.lineTo(-u * 5, -u * 4.5);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      break;
    }

    // La única máquina con motor: la escena es la que sale de su canvas, no la
    // de neón del prototipo. Rocas facetadas en el amarillo de la máquina —
    // `rocas` ya se quedó los anillos cian— y nave y balas en blanco de arcade.
    // Los tres tamaños cuentan la fragmentación: grande, mediana y pequeña.
    case "asteroids": {
      // Radios contra el lado corto y todo dentro de la banda central: la ficha
      // dibuja 560×360 y luego recorta con `object-cover`, así que lo que quede
      // fuera de ~[0.2H, 0.8H] no se ve ahí.
      const ar = Math.min(W, H);
      rock(
        "#f5ff00",
        W * 0.26,
        H * 0.38,
        ar * 0.15,
        [1, 0.72, 0.94, 0.66, 0.88, 0.75, 1, 0.8],
        -0.4,
      );
      rock("#f5ff00", W * 0.76, H * 0.33, ar * 0.1, [0.8, 1, 0.7, 0.92, 0.68, 0.96, 0.78], 0.7);
      rock("#f5ff00", W * 0.66, H * 0.68, ar * 0.07, [1, 0.66, 0.9, 0.72, 0.98, 0.7], -1.1);

      px("#ffffff", W * 0.5, H * 0.53, u * 1.5, u * 1.5); // balas en vuelo
      px("#ffffff", W * 0.58, H * 0.46, u * 1.3, u * 1.3);

      // La nave, con la muesca trasera del motor. Único trazo rotado.
      ctx.save();
      ctx.translate(W * 0.36, H * 0.63);
      ctx.rotate(-0.72);
      ctx.shadowBlur = W / 22;
      ctx.shadowColor = "#ffffff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.6, W / 120);
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(u * 7.5, 0); // nariz
      ctx.lineTo(-u * 4.5, -u * 3.4); // ala
      ctx.lineTo(-u * 2.6, 0); // muesca
      ctx.lineTo(-u * 4.5, u * 3.4); // ala
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case "duelo": {
      ctx.strokeStyle = "rgba(245,255,0,0.22)";
      ctx.setLineDash([u * 2, u * 2.4]);
      ctx.lineWidth = Math.max(1, W / 150);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      px("#f5ff00", W * 0.06, H * 0.32, u * 2.6, H * 0.26); // pala izquierda
      px("#00f5ff", W * 0.91, H * 0.5, u * 2.6, H * 0.26); // pala derecha
      // Bola con dos ecos cada vez más tenues: la estela del intercambio.
      px("#ffffff", W * 0.46, H * 0.55, u * 2.8, u * 2.8);
      px("rgba(255,255,255,0.28)", W * 0.53, H * 0.5, u * 2, u * 2);
      px("rgba(255,255,255,0.14)", W * 0.6, H * 0.45, u * 1.4, u * 1.4);
      break;
    }

    case "corredor": {
      for (let li = 1; li < 7; li++) {
        px("rgba(255,0,110,0.16)", 0, H * (0.55 + li * 0.06), W, 1); // autopista
      }
      px("#ff006e", 0, H * 0.84, W, u * 1.2); // suelo
      px("#00f5ff", W * 0.5, H * 0.62, u * 6, u * 12); // bloques
      px("#00f5ff", W * 0.74, H * 0.68, u * 5, u * 10);
      px("#f5ff00", W * 0.16, H * 0.5, u * 8, u * 8); // corredor
      px("rgba(245,255,0,0.35)", W * 0.06, H * 0.56, u * 6, u * 2); // rastro
      break;
    }

    case "tetris": {
      const CC = W / 10;
      ctx.strokeStyle = "rgba(255,0,110,0.1)";
      for (let ci = 1; ci < 10; ci++) {
        ctx.beginPath();
        ctx.moveTo(ci * CC, 0);
        ctx.lineTo(ci * CC, H);
        ctx.stroke();
      }
      // Pila del fondo: columna, altura. Los dos huecos son las líneas por hacer.
      const stack: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 0],
        [3, 0],
        [3, 1],
        [4, 0],
        [6, 0],
        [7, 0],
        [7, 1],
        [8, 0],
        [9, 0],
      ];
      stack.forEach((p, k) => {
        px(
          k % 3 === 0 ? "#00f5ff" : k % 3 === 1 ? "#ff006e" : "#f5ff00",
          p[0] * CC + 1.5,
          H - (p[1] + 1) * CC + 1.5,
          CC - 3,
          CC - 3,
        );
      });
      // La pieza en caída: una S de tres bloques.
      px("#f5ff00", 4 * CC + 1.5, H * 0.18, CC - 3, CC - 3);
      px("#f5ff00", 5 * CC + 1.5, H * 0.18, CC - 3, CC - 3);
      px("#f5ff00", 5 * CC + 1.5, H * 0.18 + CC, CC - 3, CC - 3);
      break;
    }

    // 'laberinto' era el `else` final del prototipo; aquí es un caso más para
    // que el `default` pueda comprobar que no falta ninguna escena.
    case "laberinto": {
      const LC = Math.min(W, H) / 8;
      const lx = (W - LC * 8) / 2;
      const ly = (H - LC * 6) / 2;
      ctx.save();
      ctx.shadowBlur = W / 26;
      ctx.shadowColor = "#00f5ff";
      ctx.strokeStyle = "rgba(0,245,255,0.75)";
      ctx.lineWidth = Math.max(1.5, W / 140);
      ctx.strokeRect(lx + LC * 0.4, ly + LC * 0.4, LC * 7.2, LC * 5.2); // muro exterior
      ctx.strokeRect(lx + LC * 2, ly + LC * 2, LC * 1.6, LC * 1.2); // bloques interiores
      ctx.strokeRect(lx + LC * 4.4, ly + LC * 2, LC * 1.6, LC * 1.2);
      ctx.restore();
      for (let dc = 0; dc < 7; dc++) {
        px("#f5ff00", lx + LC * (0.9 + dc) - u * 0.7, ly + LC * 4.4, u * 1.5, u * 1.5); // puntos
      }
      px("#f5ff00", lx + LC * 1.1, ly + LC * 1.1, LC * 0.8, LC * 0.8); // glotón
      px("#ff006e", lx + LC * 5.6, ly + LC * 4.1, LC * 0.85, LC * 0.9); // guardián
      break;
    }

    // Una máquina nueva en `GAMES` sin escena aquí deja de estrechar `id` a
    // `never` y rompe la compilación, que es lo que este tipo estaba comprando.
    default:
      id satisfies never;
  }

  // Barrido del monitor sobre la escena, no sobre el canvas entero: cada
  // preview lleva sus propias líneas, como en el prototipo.
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let sy = 0; sy < H; sy += 3) {
    ctx.fillRect(0, sy, W, 1);
  }
}
