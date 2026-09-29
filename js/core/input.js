// Input: remappable keyboard actions, gamepad, and a pointer (used by the drawing desk).
(function () {
  const LD = window.LD;
  const U = LD.U;

  const DEFAULT_BINDS = {
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    jump: ["Space", "KeyZ"],
    attack: ["KeyJ", "KeyX"],
    dodge: ["KeyK", "KeyC"],
    guard: ["KeyL", "KeyV"],
    dash: ["ShiftLeft", "ShiftRight"],
    interact: ["KeyE", "KeyF"],
    map: ["KeyM", "Tab"],
    pause: ["Escape", "KeyP"],
  };
  // Menu actions are fixed so that a bad remap can never lock the player out of menus.
  const MENU_BINDS = {
    confirm: ["Enter", "Space", "KeyJ", "KeyE", "Pad0"],
    back: ["Escape", "Backspace", "KeyK", "Pad1"],
    mUp: ["ArrowUp", "KeyW", "PadUp"],
    mDown: ["ArrowDown", "KeyS", "PadDown"],
    mLeft: ["ArrowLeft", "KeyA", "PadLeft"],
    mRight: ["ArrowRight", "KeyD", "PadRight"],
  };
  const PAD_BINDS = {
    left: ["PadLeft"], right: ["PadRight"], up: ["PadUp"], down: ["PadDown"],
    jump: ["Pad0"], attack: ["Pad2"], dodge: ["Pad1"], guard: ["Pad4", "Pad6"],
    dash: ["Pad5", "Pad7"], interact: ["Pad3"], map: ["Pad8"], pause: ["Pad9"],
  };

  const I = (LD.Input = {
    ACTIONS: Object.keys(DEFAULT_BINDS),
    ACTION_NAMES: {
      left: "Move left", right: "Move right", up: "Look / aim up", down: "Crouch / aim down",
      jump: "Jump", attack: "Attack", dodge: "Dodge", guard: "Guard", dash: "Foldstep",
      interact: "Interact", map: "Map", pause: "Pause",
    },
    binds: U.deepCopy(DEFAULT_BINDS),
    held: new Set(),
    pressedSet: new Set(),
    releasedSet: new Set(),
    lastKey: null,
    capture: null, // remap capture callback
    mouse: { x: 0, y: 0, down: false, pressed: false, released: false, inside: false },
    usingPad: false,
    viewTransform: { s: 1, ox: 0, oy: 0 },
  });

  I.defaults = () => U.deepCopy(DEFAULT_BINDS);
  I.setBinds = (b) => {
    I.binds = U.deepCopy(DEFAULT_BINDS);
    if (b) for (const k in b) if (I.binds[k] && Array.isArray(b[k])) I.binds[k] = b[k].slice(0, 2);
  };

  function keyList(action) {
    return (I.binds[action] || []).concat(PAD_BINDS[action] || [], MENU_BINDS[action] || []);
  }
  I.down = (a) => keyList(a).some((k) => I.held.has(k));
  I.pressed = (a) => keyList(a).some((k) => I.pressedSet.has(k));
  I.released = (a) => keyList(a).some((k) => I.releasedSet.has(k));
  I.anyPressed = () => I.pressedSet.size > 0 || I.mouse.pressed;
  I.axisX = () => (I.down("right") ? 1 : 0) - (I.down("left") ? 1 : 0);
  I.axisY = () => (I.down("down") ? 1 : 0) - (I.down("up") ? 1 : 0);

  I.keyName = (code) => {
    if (!code) return "—";
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    const map = {
      Space: "Space", ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓",
      ShiftLeft: "Shift", ShiftRight: "R-Shift", Escape: "Esc", Enter: "Enter", Tab: "Tab",
      ControlLeft: "Ctrl", ControlRight: "R-Ctrl", AltLeft: "Alt", Backspace: "Bksp",
    };
    return map[code] || code;
  };
  I.label = (action) => I.keyName((I.binds[action] || [])[0]);

  function press(code) {
    I.lastKey = code;
    if (I.capture) { const cb = I.capture; I.capture = null; cb(code); return; }
    if (!I.held.has(code)) I.pressedSet.add(code);
    I.held.add(code);
  }
  function release(code) {
    if (I.held.has(code)) I.releasedSet.add(code);
    I.held.delete(code);
  }

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    I.usingPad = false;
    press(e.code);
    if (LD.Audio) LD.Audio.init();
  });
  window.addEventListener("keyup", (e) => release(e.code));
  window.addEventListener("blur", () => { for (const k of [...I.held]) release(k); });

  // Pointer (mouse / pen / touch) mapped to logical 1280x720 space.
  function toLogical(e) {
    const t = I.viewTransform, dpr = window.devicePixelRatio || 1;
    I.mouse.x = (e.clientX * dpr - t.ox) / t.s;
    I.mouse.y = (e.clientY * dpr - t.oy) / t.s;
  }
  window.addEventListener("pointerdown", (e) => {
    toLogical(e);
    I.mouse.down = true; I.mouse.pressed = true;
    if (LD.Audio) LD.Audio.init();
  });
  window.addEventListener("pointermove", (e) => { toLogical(e); I.mouse.inside = true; });
  window.addEventListener("pointerup", (e) => { toLogical(e); I.mouse.down = false; I.mouse.released = true; });
  window.addEventListener("contextmenu", (e) => e.preventDefault());

  // Gamepad polling -> virtual keys "Pad<n>", "PadLeft" etc.
  const padHeld = new Set();
  I.pollPad = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => { if (b.pressed) now.add("Pad" + i); });
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (ax < -0.45 || now.has("Pad14")) now.add("PadLeft");
      if (ax > 0.45 || now.has("Pad15")) now.add("PadRight");
      if (ay < -0.5 || now.has("Pad12")) now.add("PadUp");
      if (ay > 0.5 || now.has("Pad13")) now.add("PadDown");
      break;
    }
    for (const k of now) if (!padHeld.has(k)) { I.usingPad = true; press(k); if (LD.Audio) LD.Audio.init(); }
    for (const k of padHeld) if (!now.has(k)) release(k);
    padHeld.clear();
    now.forEach((k) => padHeld.add(k));
  };

  I.endFrame = () => {
    I.pressedSet.clear();
    I.releasedSet.clear();
    I.mouse.pressed = false;
    I.mouse.released = false;
  };
  I.clearAll = () => { I.pressedSet.clear(); I.releasedSet.clear(); };
})();
