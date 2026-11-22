// input.js — keyboard state for the heist game. Movement keys are held;
// action keys (coin, jammer, pause, mute) fire once per press and are
// consumed by the game loop through `takePressed`.

/** The keys the game reads. */
export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    pressed: new Set(), // action keys pressed since the last frame
  };
}

const MOVE_KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
};

const ACTION_KEYS = new Set(['KeyQ', 'KeyE', 'KeyP', 'KeyM', 'Enter', 'Space', 'KeyR', 'Escape']);

/** Attach the keyboard listeners to the window; returns a detach function. */
export function attachKeyboard(input) {
  const onKeyDown = (event) => {
    const move = MOVE_KEYS[event.code];
    if (move) {
      input[move] = true;
      event.preventDefault();
      return;
    }
    if (ACTION_KEYS.has(event.code)) {
      input.pressed.add(event.code);
      event.preventDefault();
    }
  };
  const onKeyUp = (event) => {
    const move = MOVE_KEYS[event.code];
    if (move) input[move] = false;
  };
  const onBlur = () => {
    input.up = input.down = input.left = input.right = input.sneak = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}

/** Whether an action key was pressed since the last frame; consumes it. */
export function takePressed(input, code) {
  if (input.pressed.has(code)) {
    input.pressed.delete(code);
    return true;
  }
  return false;
}

/** Clear any queued action keys (used when switching screens). */
export function clearPressed(input) {
  input.pressed.clear();
}
