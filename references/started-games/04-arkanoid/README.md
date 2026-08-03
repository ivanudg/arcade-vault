# Juego de Arkanoid

Un juego de Arkanoid/Breakout para navegador construido con HTML, CSS y JavaScript puros — **cero dependencias, sin paso de build, sin framework**. Rompe todos los bloques rompibles de cada nivel con la bola sin dejarla caer.

## Cómo jugar

- **Mover el paddle**: mueve el ratón, o usa las flechas ←/→ (o `A`/`D`).
- **Empezar / reiniciar**: haz clic o pulsa `Enter`/`Espacio`.
- **Pausar**: pulsa `P` o `Escape`. El menú de pausa permite reanudar o saltar a cualquier nivel.

## Características

- 10 niveles con dificultad progresiva (la bola acelera y aparecen bloques más resistentes).
- Bloques de 1 golpe, **multi-golpe** (2 y 3 golpes, con desgaste visible) y **grises irrompibles**.
- Rebote del paddle con ángulo según el punto de impacto.
- Animación de explosión al romper bloques, HUD (puntos, nivel, vidas) y efectos de sonido.
- Escalado responsive: el área de juego se adapta a la ventana sin deformarse.

## Ejecución

No hay herramientas de build. Sirve la carpeta de forma estática y abre `index.html` en el navegador:

```
python3 -m http.server
```

Luego visita `http://localhost:8000`. Sírvelo por `http://` (no abras el archivo con `file://`): el juego se carga como módulo ES y el spritesheet/audio quedan bloqueados bajo `file://`.

## Estructura

- `index.html` · `style.css` — página y estilos.
- `src/` — código del juego en módulos ES (game loop, estado, física, colisiones, niveles, UI).
- `assets/` — spritesheet, capa de renderizado de sprites y efectos de sonido.
- `specs/` — especificaciones de las features (el proyecto sigue un flujo spec-first).

Para más detalle sobre la arquitectura y el flujo de trabajo, ver [`CLAUDE.md`](./CLAUDE.md).
