// Capa de render: gestiona el canvas, el escalado mundo lógico → canvas real y el resize.
// Único punto de conversión viewport ↔ mundo lógico (ver Riesgos del spec).

import { WORLD } from "./config.js";

let canvas = null;
let ctx = null;

// Estado de escalado (se recalcula en cada resize).
let scale = 1; // factor uniforme mundo lógico → CSS px
let offsetX = 0; // margen (CSS px) para centrar el mundo horizontalmente
let offsetY = 0; // margen (CSS px) para centrar el mundo verticalmente
let dpr = 1; // devicePixelRatio para nitidez en pantallas HiDPI

// Recalcula dimensiones del canvas y el factor de escala. Se llama en cada resize.
function resize() {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  dpr = window.devicePixelRatio || 1;

  // Backing store en píxeles de dispositivo (el CSS ya lo estira a 100vw/100vh).
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // Escalado uniforme: el mundo cabe entero sin deformarse (letterbox).
  scale = Math.min(cssW / WORLD.w, cssH / WORLD.h);
  offsetX = (cssW - WORLD.w * scale) / 2;
  offsetY = (cssH - WORLD.h * scale) / 2;
}

// Inicializa el render: toma el canvas, su contexto 2D y engancha el resize.
export function initRender() {
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");
  window.addEventListener("resize", resize);
  resize();
  return { canvas, ctx };
}

// Limpia el frame: pinta el fondo de toda la ventana y deja el contexto listo
// para dibujar en coordenadas del mundo lógico (transform aplicado).
export function clear() {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;

  // 1) Fondo de toda la ventana (incluye las bandas del letterbox).
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, cssW, cssH);

  // 2) Área de juego (mundo lógico), ligeramente distinta para verse delimitada.
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, offsetX * dpr, offsetY * dpr);
  ctx.fillStyle = "#12122b";
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
}

// Devuelve el contexto 2D (ya con el transform del mundo lógico tras clear()).
export function getCtx() {
  return ctx;
}

// Convierte coordenadas de viewport (clientX/clientY) a coordenadas del mundo lógico.
// Único punto de conversión — usado por el input en el Paso 5.
export function screenToWorld(clientX, clientY) {
  return {
    x: (clientX - offsetX) / scale,
    y: (clientY - offsetY) / scale,
  };
}
