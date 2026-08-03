// Efectos de sonido: dos objetos Audio reutilizables.
// El navegador bloquea el audio hasta un gesto del usuario (ver unlockAudio, Paso 13).

const bounce = new Audio("assets/sounds/ball-bounce.mp3");
const breakSound = new Audio("assets/sounds/break-sound.mp3");

// Reproduce un clon del elemento para permitir instancias solapadas:
// varios bloques rotos en frames seguidos suenan cada uno, sin cortarse entre sí.
// (Un único HTMLAudioElement solo reproduce una instancia a la vez.)
function play(sound) {
  const instance = sound.cloneNode();
  instance.play().catch(() => {});
}

export function playBounce() {
  play(bounce);
}

export function playBreak() {
  play(breakSound);
}

// Desbloquea el audio en respuesta a un gesto del usuario (clic/tecla).
// Reproduce y pausa cada sonido en silencio para habilitarlos.
export function unlockAudio() {
  for (const sound of [bounce, breakSound]) {
    sound.play().then(() => {
      sound.pause();
      sound.currentTime = 0;
    }).catch(() => {});
  }
}
