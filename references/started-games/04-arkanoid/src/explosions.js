// Explosiones de bloques: animación puramente visual de 4 frames reproducida
// sobre la posición de un bloque roto. Desacoplada del array de bloques para que
// la animación nunca pueda re-disparar física ni colisión.
//
// Usa los globales de assets/spritesheet.js (cargado como script clásico):
// EXPLOSION_FRAMES, EXPLOSION_DURATION (ms) y drawFrame — sin importarlos.

// Una explosión activa: animación de 4 frames reproduciéndose en la posición de un bloque roto.
// {
//   x, y, w, h,   // rectángulo YA escalado y centrado donde se dibuja (mundo lógico)
//   color,        // nombre de color del spritesheet (clave de EXPLOSION_FRAMES)
//   elapsed,      // tiempo acumulado en segundos desde que nació
// }
export const explosions = [];

// Factor de agrandado respecto al rectángulo del bloque ("un poco más grande y centrada").
const EXPLOSION_SCALE = 1.3;

// Genera una explosión escalada y centrada sobre el rectángulo de un bloque roto.
export function spawnExplosion(x, y, w, h, color) {
  const ew = w * EXPLOSION_SCALE;
  const eh = h * EXPLOSION_SCALE;
  explosions.push({
    x: x - (ew - w) / 2,
    y: y - (eh - h) / 2,
    w: ew,
    h: eh,
    color,
    elapsed: 0,
  });
}

// Avanza el tiempo de cada explosión y elimina las que superan su duración.
export function updateExplosions(dt) {
  const total = EXPLOSION_DURATION / 1000; // duración total en segundos
  // Recorrer hacia atrás para poder hacer splice sin saltarse elementos.
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].elapsed += dt;
    if (explosions[i].elapsed >= total) {
      explosions.splice(i, 1);
    }
  }
}

// Dibuja el frame actual de cada explosión activa.
export function drawExplosions(ctx) {
  // EXPLOSION_DURATION está en ms; el loop trabaja en s → duración total en segundos.
  const frameDur = EXPLOSION_DURATION / 1000 / 4; // 4 frames por explosión
  for (const e of explosions) {
    const frameIndex = Math.min(Math.floor(e.elapsed / frameDur), 3);
    drawFrame(ctx, EXPLOSION_FRAMES[e.color][frameIndex], e.x, e.y, e.w, e.h);
  }
}

// Vacía todas las explosiones activas (transición de nivel / reinicio de partida).
export function clearExplosions() {
  explosions.length = 0;
}
