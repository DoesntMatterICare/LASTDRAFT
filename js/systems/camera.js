// CameraSystem: smooth follow with look-ahead, room clamping, optional lock box for
// boss arenas, cinematic zoom/focus, and trauma-based (adjustable) screen shake.
(function () {
  const LD = window.LD;
  const U = LD.U;

  const C = (LD.Camera = {
    x: 0, y: 0, zoom: 1.22, targetZoom: 1, base: 1.22, trauma: 0, shakeScale: 1,
    look: 0, focus: null, lock: null, ox: 0, oy: 0,
  });

  C.viewW = () => U.VIEW_W / C.zoom;
  C.viewH = () => U.VIEW_H / C.zoom;

  C.snap = (px, py, room) => {
    C.look = 0;
    C.zoom = C.targetZoom * C.base;
    C.x = px - C.viewW() / 2; C.y = py - C.viewH() * 0.55;
    clamp(room);
  };

  C.shake = (amount) => { C.trauma = Math.min(1, C.trauma + amount); };

  function clamp(room) {
    const T = U.TILE;
    let minX = 0, minY = 0, maxX = room.w * T, maxY = room.h * T;
    if (C.lock) { minX = C.lock.x0; maxX = C.lock.x1; }
    const vw = C.viewW(), vh = C.viewH();
    if (maxX - minX <= vw) C.x = (minX + maxX) / 2 - vw / 2;
    else C.x = U.clamp(C.x, minX, maxX - vw);
    if (maxY - minY <= vh) C.y = (minY + maxY) / 2 - vh / 2;
    else C.y = U.clamp(C.y, minY, maxY - vh);
  }

  C.update = (dt, player, room) => {
    C.zoom = U.damp(C.zoom, C.targetZoom * C.base, 3, dt);
    let tx, ty;
    if (C.focus) {
      tx = C.focus.x - C.viewW() / 2; ty = C.focus.y - C.viewH() / 2;
      C.x = U.damp(C.x, tx, C.focus.rate || 3, dt);
      C.y = U.damp(C.y, ty, C.focus.rate || 3, dt);
    } else if (player) {
      const want = player.facing * 90 + U.clamp(player.vx * 0.12, -40, 40);
      C.look = U.damp(C.look, want, 2.2, dt);
      tx = player.cx() + C.look - C.viewW() / 2;
      ty = player.y + player.h / 2 - C.viewH() * 0.56 + (player.lookDir || 0) * 110;
      C.x = U.damp(C.x, tx, 7, dt);
      // vertical: tighter when falling, looser when rising, so jumps don't jerk the frame
      const rate = player.vy > 300 ? 9 : 4.5;
      C.y = U.damp(C.y, ty, rate, dt);
    }
    clamp(room);
    C.trauma = Math.max(0, C.trauma - dt * 1.6);
    const s = C.trauma * C.trauma * 10 * C.shakeScale;
    const t = performance.now() / 1000;
    C.ox = (U.noise1(t * 22) - 0.5) * 2 * s;
    C.oy = (U.noise1(t * 22 + 50) - 0.5) * 2 * s;
  };
})();
