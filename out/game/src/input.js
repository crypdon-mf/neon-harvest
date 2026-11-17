// Keyboard + mouse input, kept apart from the simulation: the world only
// reads a plain snapshot { moveX, moveY, pointer, dashPressed }.
export function createInput(canvas) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, inside: false, down: false };
  let dashQueued = false;
  let anyKeyQueued = false;
  let clickQueued = false;

  const keyMap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  function onKeyDown(e) {
    if (e.code === 'Space') {
      dashQueued = true;
      e.preventDefault();
    }
    if (keyMap[e.code]) {
      keys.add(keyMap[e.code]);
      e.preventDefault();
    }
    anyKeyQueued = true;
    if (['Enter', 'KeyR', 'KeyP', 'KeyM'].includes(e.code)) clickQueued = e.code;
  }
  function onKeyUp(e) {
    if (keyMap[e.code]) keys.delete(keyMap[e.code]);
  }
  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
  }
  function onPointerDown(e) {
    onPointerMove(e);
    pointer.down = true;
    dashQueued = true;
    clickQueued = true;
  }
  function onPointerUp() {
    pointer.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; });

  return {
    snapshot(scale) {
      let mx = 0;
      let my = 0;
      if (keys.has('left')) mx -= 1;
      if (keys.has('right')) mx += 1;
      if (keys.has('up')) my -= 1;
      if (keys.has('down')) my += 1;
      const snap = {
        moveX: mx,
        moveY: my,
        pointer: {
          x: pointer.x / scale,
          y: pointer.y / scale,
          inside: pointer.inside,
        },
        dash: dashQueued,
        anyKey: anyKeyQueued,
        click: clickQueued,
      };
      dashQueued = false;
      anyKeyQueued = false;
      clickQueued = false;
      return snap;
    },
  };
}
