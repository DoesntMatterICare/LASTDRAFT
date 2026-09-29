// Detailed creature art. Replaces the drawing routines of every enemy and boss (AI, timing
// and hitboxes are untouched) with richer ink-and-paper renderings in the manner of the
// concept sheets: shaded paper planes, cross-hatching, crease lines, handwriting, torn
// edges, glowing cores and layered costume detail.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art;
  const INK = Art.INK;

  // ---------------------------------------------------------------- helpers
  const grad = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };
  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }
  // fill the current path, ink its outline, then hatch its shadowed part inside it.
  // (Order matters: hatching replaces the canvas's current path with its own lines.)
  function paint(ctx, fill, o = {}) {
    ctx.fillStyle = fill; ctx.fill();
    if (o.line !== false) { ctx.strokeStyle = o.line || INK; ctx.lineWidth = o.lw || 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
    if (o.hatch) {
      const [hx, hy, hw, hh, gap, ang, a] = o.hatch;
      ctx.save(); ctx.clip(); Art.hatch(ctx, hx, hy, hw, hh, gap || 3, ang || 0.9, o.hatchCol || INK, a || 0.35, 0.8, hx | 0); ctx.restore();
      ctx.beginPath();
    }
  }
  function writing(ctx, x, y, w, rows, gap = 4, col = "rgba(21,16,13,0.35)") {
    ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = 0; k < rows; k++) {
      let px = x;
      const yy = y + k * gap;
      while (px < x + w) { const len = 2 + U.hash(px * 3.1 + yy) * 6; ctx.moveTo(px, yy); ctx.lineTo(Math.min(x + w, px + len), yy + (U.hash(px + yy) - 0.5)); px += len + 1.5; }
    }
    ctx.stroke();
  }
  function groundShadow(ctx, w, a = 0.3) {
    ctx.fillStyle = "rgba(0,0,0," + a + ")";
    ctx.beginPath(); ctx.ellipse(0, 0, w, w * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  }
  function glowAdd(ctx, x, y, r, col) {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, y, r, col); ctx.restore();
  }
  const PAPER = ["#f1e7cf", "#d9cba8", "#a8977a"];

  const T = LD.EnemyTypes, B = LD.BossTypes;

  // ================================================================ TORN PAPER CRAWLER
  T.crawler.prototype.drawBody = function (ctx, G) {
    const x = this.cx(), y = this.y + this.h, f = this.facing, t = this.t, b = Art.boil;
    const rear = this.state === "rear" ? U.easeOut(this.stateT / this.data.rear) : this.state === "lunge" ? 0.6 : 0;
    const walk = this.state === "patrol" ? t * 13 : t * 3;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    groundShadow(ctx, 28);
    const leg = (i, near) => {
      const hipX = -16 + i * 10, hipY = -13 - rear * (i > 1 ? 10 : 2);
      const lift = Math.max(0, Math.sin(walk + i * 1.7 + (near ? 0 : Math.PI))) * 5;
      const out = [-1.2, -0.6, 0.6, 1.3][i];
      const kx = hipX + out * 9, ky = hipY - 13 - lift - (near ? 0 : 3);
      const fx = hipX + out * 17 + (near ? 2 : -2), fy = -lift * 0.4;
      ctx.fillStyle = near ? INK : "#3c322c";
      Art.brush(ctx, [hipX, hipY, kx, ky, fx, fy], near ? 2.8 : 2, { seed: b + i + (near ? 9 : 0), taperStart: 0, taperEnd: 0.8 });
      ctx.fillStyle = near ? "#e6d9bb" : "#9a8c74"; ctx.beginPath(); ctx.arc(kx, ky, near ? 1.3 : 1, 0, 7); ctx.fill();
    };
    for (let i = 0; i < 4; i++) leg(i, false);
    ctx.save(); ctx.translate(8, -12); ctx.rotate(-rear * 0.5); ctx.translate(-8, 12);
    // abdomen: a folded page with a torn rear edge and handwriting
    poly(ctx, [-8, -24, -22, -20, -30, -14, -27, -11, -31, -8, -26, -5, -6, -6]);
    paint(ctx, grad(ctx, 0, -24, 0, -5, PAPER), { hatch: [-32, -14, 28, 10, 2.6, 0.9, 0.4] });
    writing(ctx, -25, -17, 15, 2, 3.5);
    ctx.strokeStyle = "rgba(21,16,13,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(-17, -6); ctx.stroke();
    // thorax plate
    poly(ctx, [-9, -26, 4, -29, 12, -22, 9, -8, -6, -6]);
    paint(ctx, grad(ctx, 0, -29, 0, -6, ["#f6ecd6", "#d7c7a2", "#9f8e71"]), { hatch: [-10, -16, 24, 10, 2.6, -0.9, 0.35] });
    ctx.strokeStyle = "rgba(21,16,13,0.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, -29); ctx.lineTo(1, -7); ctx.stroke();
    // head plate + mandibles
    poly(ctx, [10, -24, 22, -22, 28, -14, 22, -7, 10, -8]);
    paint(ctx, grad(ctx, 10, -24, 26, -8, ["#efe3c8", "#b9a887"]));
    ctx.fillStyle = INK;
    Art.brush(ctx, [24, -10, 31 + rear * 5, -12 - rear * 4, 33, -6, 29, -4], 2.4, { seed: b, taperStart: 0, taperEnd: 0.9 });
    Art.brush(ctx, [22, -8, 28, -3, 31, -1], 2, { seed: b + 1, taperStart: 0, taperEnd: 0.9 });
    // glowing red gem eye
    glowAdd(ctx, 20, -16, 14 + rear * 8, "rgba(220,40,30,0.55)");
    const eg = ctx.createRadialGradient(19.5, -17, 0.5, 20, -16, 4);
    eg.addColorStop(0, "#ffd9c8"); eg.addColorStop(0.35, "#e0352a"); eg.addColorStop(1, "#6a0f0b");
    ctx.fillStyle = eg; ctx.beginPath(); ctx.moveTo(20, -20.5); ctx.lineTo(23.5, -16); ctx.lineTo(20, -11.5); ctx.lineTo(16.5, -16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 4; i++) leg(i, true);
    ctx.restore();
    this.sigil(ctx, x - f * 10, this.y + 2, 4.5);
  };

  // ================================================================ SCRIBBLE WRETCH
  T.wretch.prototype.drawBody = function (ctx, G) {
    const x = this.cx(), y = this.y + this.h, f = this.facing;
    const wind = this.state === "windup" ? this.stateT / this.data.windup : 0;
    const slash = this.state === "slash";
    const r = U.rng(Art.boil * 13 + Math.floor(this.homeX));
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    groundShadow(ctx, 22);
    ctx.translate((r() - 0.5) * wind * 3, 0);
    // hunched silhouette mass
    const hunch = 0.15 + wind * 0.25;
    const pts = [-6, -10, -9, -24, -15, -36, -10, -48, 2 + hunch * 20, -56, 14 + hunch * 14, -50, 16, -40, 10, -26, 7, -10];
    ctx.fillStyle = "#120e10";
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.quadraticCurveTo(pts[i - 2] + (r() - 0.5) * 6, pts[i - 1] + (r() - 0.5) * 6, pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
    // three tones of redrawn scribble strokes
    ctx.lineCap = "round";
    const scrib = (n, col, w0, w1, rx, ry, cy) => {
      ctx.strokeStyle = col;
      for (let i = 0; i < n; i++) {
        ctx.lineWidth = w0 + r() * w1;
        ctx.beginPath();
        let a = r() * 6.28;
        ctx.moveTo(Math.cos(a) * rx * r(), cy + Math.sin(a) * ry * r());
        for (let k = 0; k < 3; k++) {
          a += 1 + r() * 2;
          ctx.quadraticCurveTo(Math.cos(a) * rx * 1.25, cy + Math.sin(a) * ry * 1.15, Math.cos(a + 1) * rx * r(), cy + Math.sin(a + 1) * ry * r());
        }
        ctx.stroke();
      }
    };
    scrib(20, "#2c2428", 1, 2.2, 13 + wind * 5, 22, -34);
    scrib(12, "#4c4146", 0.6, 1.2, 12, 19, -34);
    scrib(8, INK, 1.5, 2, 10, 15, -32);
    // a torn page caught in the tangle
    ctx.save(); ctx.translate(-4, -32); ctx.rotate(-0.3);
    ctx.fillStyle = "#ddd0b2"; ctx.fillRect(-7, -5, 14, 11); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(-7, -5, 14, 11);
    writing(ctx, -5, -2, 10, 3, 3);
    ctx.restore();
    // head: knotted loops with long dripping strands
    const hx = 4 + hunch * 20, hy = -58;
    ctx.strokeStyle = INK;
    for (let i = 0; i < 10; i++) { ctx.lineWidth = 1 + r() * 1.5; ctx.beginPath(); ctx.arc(hx + (r() - 0.5) * 5, hy + (r() - 0.5) * 5, 6 + r() * 5, r() * 6, r() * 6 + 3); ctx.stroke(); }
    ctx.fillStyle = INK;
    for (let k = 0; k < 4; k++) Art.brush(ctx, [hx - 6 + k * 3, hy + 2, hx - 8 + k * 3 + (r() - 0.5) * 4, hy + 12, hx - 7 + k * 3, hy + 18 + r() * 8], 1.6, { seed: k, taperStart: 0, taperEnd: 0.9 });
    // eyes: two pale points, brighter while winding up
    glowAdd(ctx, hx + 5, hy + 1, 10 + wind * 10, "rgba(240,230,210," + (0.25 + wind * 0.4) + ")");
    ctx.fillStyle = "#f5ecd8"; ctx.fillRect(hx + 2, hy - 1, 3, 2.5); ctx.fillRect(hx + 7, hy, 2.5, 2.5);
    // claw arm
    const reachA = slash ? (this.stateT < 0.16 ? -0.6 + this.stateT * 12 : 1.2 - (this.stateT - 0.18) * 10) : wind > 0 ? -1.4 * wind : 0.4;
    const ax = 12, ay = -42, len = 28 + (slash ? 22 : 0);
    const ex = ax + Math.cos(reachA) * len, ey = ay + Math.sin(reachA) * len;
    ctx.fillStyle = INK;
    Art.brush(ctx, [ax, ay, (ax + ex) / 2 + 2, (ay + ey) / 2 - 6, ex, ey], 4.5, { seed: Art.boil, taperStart: 0, taperEnd: 0.2 });
    for (let c = -2; c <= 2; c++) Art.brush(ctx, [ex, ey, ex + Math.cos(reachA + c * 0.35) * 9, ey + Math.sin(reachA + c * 0.35) * 9, ex + Math.cos(reachA + c * 0.45) * 14, ey + Math.sin(reachA + c * 0.45) * 14], 1.8, { seed: c, taperStart: 0, taperEnd: 0.9 });
    ctx.fillStyle = "#2c2428";
    Art.brush(ctx, [-10, -42, -20, -26 + Math.sin(this.t * 5) * 3, -18, -10, -22, -4], 3, { seed: Art.boil + 1, taperStart: 0, taperEnd: 0.8 });
    // scribbled legs
    ctx.fillStyle = INK;
    Art.brush(ctx, [-6, -12, -9 + Math.sin(this.t * 9) * 4, -6, -11, 0], 3.4, { seed: 3 });
    Art.brush(ctx, [6, -12, 8 - Math.sin(this.t * 9) * 4, -6, 11, 0], 3.4, { seed: 4 });
    if (slash) {
      ctx.strokeStyle = "rgba(21,16,13,0.65)"; ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(20, -64 + k * 10); ctx.quadraticCurveTo(40, -60 + k * 10, 20 + this.data.reach * 0.85, -52 + k * 12 + (r() - 0.5) * 6); ctx.stroke(); }
    }
    // ink drips
    ctx.fillStyle = INK;
    for (let k = 0; k < 3; k++) { const dx = -8 + k * 8, dl = 4 + ((this.t * 20 + k * 7) % 10); Art.brush(ctx, [dx, -14, dx + 0.5, -14 + dl], 1.6, { seed: k, taperStart: 0, taperEnd: 0.9 }); }
    ctx.restore();
  };

  // ================================================================ INK MOTH
  T.moth.prototype.drawBody = function (ctx, G) {
    const x = this.cx(), y = this.cy(), f = this.facing, t = this.t;
    const tele = this.state === "tele";
    const flap = Math.sin(t * (tele ? 30 : 16));
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    const wing = (side, back) => {
      ctx.save();
      ctx.scale(1, side * (0.3 + Math.abs(flap) * 0.7) * (tele ? 1.2 : 1));
      if (back) ctx.translate(-4, 2);
      const s = back ? 0.78 : 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-18 * s, -6 * s, -34 * s, -30 * s, -14 * s, -38 * s);
      // torn outer edge
      ctx.lineTo(-6 * s, -34 * s); ctx.lineTo(-2 * s, -39 * s); ctx.lineTo(6 * s, -33 * s); ctx.lineTo(14 * s, -36 * s);
      ctx.bezierCurveTo(26 * s, -30 * s, 24 * s, -12 * s, 8 * s, -3 * s);
      ctx.closePath();
      paint(ctx, grad(ctx, 0, 0, 0, -38 * s, back ? ["#b3a79a", "#8d8177"] : ["#e9dfcb", "#c9bca8", "#9d9083"]), { lw: 1.6, hatch: back ? [-30, -40, 60, 40, 3, 0.8, 0.3] : null });
      if (!back) {
        Art.wash(ctx, -4, -20, 12, 10, "#7a6a8e", 0.3, 5, 2);
        // veins
        ctx.strokeStyle = "rgba(21,16,13,0.55)"; ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (const [vx, vy] of [[-18, -34], [-8, -36], [4, -33], [14, -30], [18, -16]]) { ctx.moveTo(0, 0); ctx.quadraticCurveTo(vx * 0.4, vy * 0.5 - 2, vx, vy); }
        ctx.stroke();
        // eye-spot: concentric ink rings; it "opens" during the telegraph
        const er = tele ? 7 : 5;
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-3, -22, er, 0, 7); ctx.fill();
        ctx.fillStyle = tele ? "#f7eed9" : "#b9ab96"; ctx.beginPath(); ctx.arc(-3, -22, er * 0.62, 0, 7); ctx.fill();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-3, -22, er * 0.3, 0, 7); ctx.fill();
        // dark edge band with pale dots
        ctx.fillStyle = "rgba(21,16,13,0.8)";
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(-14 + k * 7, -33 + Math.abs(k - 2) * 1.5, 1.4, 0, 7); ctx.fill(); }
      }
      ctx.restore();
    };
    wing(-1, true); wing(1, true);
    // body: fuzzy thorax, segmented abdomen
    ctx.fillStyle = "#1a1417";
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(-8 - k * 5, 1 + k * 0.5, 5.5 - k, 4.2 - k * 0.6, 0.1, 0, 7); ctx.fill(); }
    ctx.strokeStyle = "rgba(200,190,180,0.35)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(-8 - k * 5 + 2, -2); ctx.lineTo(-8 - k * 5 + 2, 4); } ctx.stroke();
    ctx.fillStyle = "#231b20"; ctx.beginPath(); ctx.ellipse(2, -1, 7, 5.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#231b20"; ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; ctx.moveTo(2 + Math.cos(a) * 6, -1 + Math.sin(a) * 5); ctx.lineTo(2 + Math.cos(a) * 8.5, -1 + Math.sin(a) * 7); } ctx.stroke();
    ctx.fillStyle = "#15100d"; ctx.beginPath(); ctx.arc(10, -2, 3.4, 0, 7); ctx.fill();
    ctx.fillStyle = tele ? "#ffe8c0" : "#cfc3b0"; ctx.fillRect(11, -3.5, 1.6, 1.6);
    // feathery antennae
    for (const s of [0, 1]) {
      const ax1 = 20 + s * 4, ay1 = -12 + s * 5;
      ctx.fillStyle = INK; Art.brush(ctx, [11, -4, 16, -8 + s * 3, ax1, ay1], 1.3, { seed: s });
      ctx.strokeStyle = "rgba(21,16,13,0.7)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); for (let k = 1; k < 5; k++) { const px = U.lerp(12, ax1, k / 5), py = U.lerp(-5, ay1, k / 5); ctx.moveTo(px, py); ctx.lineTo(px + 1.5, py - 2.5); ctx.moveTo(px, py); ctx.lineTo(px + 2.5, py + 1); } ctx.stroke();
    }
    wing(-1, false); wing(1, false);
    ctx.restore();
    this.sigil(ctx, x, y + 12, 4);
  };

  // ================================================================ LOOSELEAF GUARD
  T.guard.prototype.drawBody = function (ctx, G) {
    // damaged animation: the pose updates at a stuttering, skipping frame rate
    this.frameT -= 1 / 60;
    if (this.frameT <= 0) { this.frame = this.t; this.frameT = Math.random() < 0.15 ? 0.25 : 0.11; this.skip = Math.random() < 0.1 ? (Math.random() - 0.5) * 6 : 0; }
    const t = this.frame, st = this.state, f = this.facing;
    const x = this.cx() + (this.skip || 0), y = this.y + this.h;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    groundShadow(ctx, 22);
    const walk = st === "patrol" || (st === "stance" && Math.abs(this.vx) > 10);
    const ph = walk ? Math.sin(t * 7) : 0;
    // legs & boots
    for (const [s, sd] of [[-1, 1], [1, 2]]) {
      ctx.fillStyle = s < 0 ? "#231c1d" : "#2f2627";
      Art.brush(ctx, [s * 4, -30, s * 6 + ph * 6 * s, -15, s * 7 + ph * 8 * s, -3], 5, { seed: sd, taperStart: 0, taperEnd: 0 });
      ctx.fillStyle = "#1a1210"; poly(ctx, [s * 7 + ph * 8 * s - 4, -5, s * 7 + ph * 8 * s + 7, -3, s * 7 + ph * 8 * s + 7, 0, s * 7 + ph * 8 * s - 4, 0]); ctx.fill();
    }
    // back page of the tabard
    poly(ctx, [-15, -60, 13, -61, 15, -24, 10, -16, 4, -21, -2, -14, -8, -20, -16, -15]);
    paint(ctx, grad(ctx, 0, -60, 0, -14, ["#b9ab8e", "#8a7c63"]), { lw: 1.6 });
    // front page with handwriting and a torn hem
    poly(ctx, [-11, -60, 12, -62, 13, -30, 8, -24, 3, -28, -2, -22, -7, -27, -12, -24]);
    paint(ctx, grad(ctx, 0, -62, 0, -22, ["#f2e8d1", "#d9cba9", "#b3a384"]), { hatch: [-12, -40, 26, 18, 2.6, 0.8, 0.28] });
    writing(ctx, -8, -54, 17, 6, 4);
    // belt & buckle
    ctx.fillStyle = "#3a2618"; ctx.fillRect(-12, -40, 25, 4);
    ctx.fillStyle = "#c9a14a"; ctx.fillRect(-1, -40.5, 4, 5);
    // pauldron: a curled page on the near shoulder
    ctx.beginPath(); ctx.moveTo(4, -60); ctx.quadraticCurveTo(18, -66, 17, -52); ctx.quadraticCurveTo(12, -55, 5, -53); ctx.closePath();
    paint(ctx, grad(ctx, 4, -66, 17, -52, ["#efe4c9", "#a8977a"]), { lw: 1.6 });
    // head: a blank page mask with a single slit eye, and a tall conical hat
    ctx.beginPath(); ctx.ellipse(2, -66, 6.5, 7.5, 0, 0, Math.PI * 2);
    paint(ctx, grad(ctx, -4, -72, 8, -60, ["#f4ead4", "#c8b995"]), { lw: 1.8 });
    ctx.fillStyle = INK; ctx.fillRect(3, -68, 5, 1.6);
    ctx.fillStyle = "rgba(21,16,13,0.35)"; Art.brush(ctx, [6, -66, 6.5, -62, 6, -59], 1, { seed: 2, taperStart: 0 });
    ctx.fillStyle = "#1e1a1c";
    poly(ctx, [-12, -69, 14, -70, 16, -67, -13, -66]); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, -69); ctx.quadraticCurveTo(0, -84, 3, -98); ctx.quadraticCurveTo(6, -96, 5, -93); ctx.quadraticCurveTo(9, -80, 11, -69); ctx.closePath();
    paint(ctx, grad(ctx, -9, -98, 11, -69, ["#3a3236", "#18141a"]), { lw: 1.6 });
    ctx.strokeStyle = "rgba(210,190,160,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -72); ctx.quadraticCurveTo(0, -74, 9, -72); ctx.moveTo(1, -90); ctx.lineTo(-2, -72); ctx.stroke();
    // spear: bound shaft, leaf blade with a fuller, torn red pennant
    const wind = st === "windup" ? U.easeOut(this.stateT / this.data.windup) : 0;
    const thr = st === "thrust" ? U.easeOut(this.stateT / this.data.thrustTime) : st === "recover" ? 1 - U.easeOut(Math.min(1, this.stateT / 0.4)) : 0;
    const sx = 6 - wind * 22 + thr * 40, sy = -44;
    ctx.fillStyle = "#3a2a20";
    Art.brush(ctx, [sx - 40, sy + 2, sx + 30, sy - 1, sx + 70, sy - 2], 3.2, { seed: 3, taperStart: 0, taperEnd: 0 });
    ctx.strokeStyle = "#c9b890"; ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(sx + 58 + k * 2.5, sy - 4); ctx.lineTo(sx + 60 + k * 2.5, sy + 1); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 70, sy - 2); ctx.quadraticCurveTo(sx + 80, sy - 10, sx + 96, sy - 2); ctx.quadraticCurveTo(sx + 80, sy + 6, sx + 70, sy - 2);
    paint(ctx, grad(ctx, sx + 70, sy - 8, sx + 70, sy + 4, ["#e6e2da", "#8a8580"]), { lw: 1.4 });
    ctx.strokeStyle = "rgba(21,16,13,0.6)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx + 73, sy - 2); ctx.lineTo(sx + 92, sy - 2); ctx.stroke();
    ctx.fillStyle = "#8e2a22";
    ctx.beginPath(); ctx.moveTo(sx + 62, sy - 3); ctx.lineTo(sx + 50 - ph * 3, sy + 12); ctx.lineTo(sx + 55, sy + 8); ctx.lineTo(sx + 47 - ph * 3, sy + 18); ctx.lineTo(sx + 66, sy); ctx.closePath(); ctx.fill();
    // arm holding the spear
    ctx.fillStyle = "#cdbf9f"; Art.brush(ctx, [8, -56, 12, -48, sx + 4, sy + 1], 3.5, { seed: 7, taperStart: 0, taperEnd: 0 });
    // page-shield: a bound book cover with brass corners & clasp, lowered while recovering
    const up = this.shielding();
    ctx.save();
    ctx.translate(up ? 15 : 5, up ? -46 : -34); ctx.rotate(up ? 0 : 0.9);
    poly(ctx, [-1, -22, 9, -20, 9, 21, -1, 23]);
    paint(ctx, this.shieldFlash > 0 ? "#fff3dc" : grad(ctx, -1, -22, 9, 23, ["#8a6a44", "#5a4028", "#3a2818"]), { lw: 2.2 });
    ctx.fillStyle = "#c9a14a";
    for (const [cx0, cy0] of [[-1, -22], [9, -20], [9, 21], [-1, 23]]) { ctx.beginPath(); ctx.arc(cx0, cy0, 2, 0, 7); ctx.fill(); }
    ctx.fillRect(7, -2, 4, 5);
    ctx.strokeStyle = "rgba(21,16,13,0.5)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(1.5, -18); ctx.lineTo(1.5, 19); ctx.moveTo(3, -14); ctx.lineTo(7, -14); ctx.moveTo(3, 12); ctx.lineTo(7, 12); ctx.stroke();
    ctx.restore();
    ctx.restore();
    this.sigil(ctx, x - f * 1, this.y + 38, 4);
  };

  // ================================================================ CINDER LEAFLET
  T.leaflet.prototype.drawBody = function (ctx, G) {
    const x = this.cx(), y = this.y + this.h, f = this.facing, t = this.t;
    const cr = this.state === "crouch" ? this.stateT / this.data.crouch : 0;
    glowAdd(ctx, x, this.y + 8, 46, "rgba(255,110,40,0.4)");
    ctx.save(); ctx.translate(x, y); ctx.scale(f * (1 + cr * 0.2), 1 - cr * 0.3);
    groundShadow(ctx, 16, 0.25);
    // back curl
    ctx.beginPath(); ctx.moveTo(-12, -4); ctx.quadraticCurveTo(-20, -18, -10, -28); ctx.quadraticCurveTo(-6, -18, -4, -6); ctx.closePath();
    paint(ctx, grad(ctx, 0, -28, 0, 0, ["#3a2418", "#160c08"]), { lw: 1.5 });
    // main charred page
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-18, -22, -4, -28); ctx.quadraticCurveTo(10, -31, 15, -17); ctx.quadraticCurveTo(19, -4, 10, 0); ctx.closePath();
    paint(ctx, grad(ctx, 0, -30, 0, 0, ["#7a5238", "#4a2e1e", "#1e110b"]), { lw: 2, hatch: [-16, -12, 34, 12, 2.4, 0.9, 0.35] });
    writing(ctx, -8, -16, 14, 2, 4, "rgba(20,10,6,0.5)");
    // glowing cracks
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(255,140,60," + (0.55 + Math.sin(t * 9) * 0.25) + ")"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-2, -12); ctx.lineTo(3, -9); ctx.lineTo(8, -19); ctx.moveTo(-2, -12); ctx.lineTo(-7, -18); ctx.stroke(); ctx.restore();
    // burning edge along the top
    ctx.fillStyle = "#ffb35a";
    ctx.beginPath(); ctx.moveTo(-4, -28);
    for (let i = 0; i < 7; i++) ctx.lineTo(-4 + i * 3.2, -28 - (i % 2 ? 5 + Math.sin(t * 20 + i) * 3 : 0) + i * 1.8);
    ctx.lineTo(15, -17); ctx.quadraticCurveTo(4, -23, -4, -28); ctx.fill();
    ctx.fillStyle = "#e0662a";
    for (let i = 0; i < 3; i++) {
      const fx = -2 + i * 6, fh = 8 + U.noise1(t * 7 + i * 3) * 8;
      ctx.beginPath(); ctx.moveTo(fx - 3, -27 + i * 3); ctx.quadraticCurveTo(fx - 2, -27 + i * 3 - fh * 0.6, fx + Math.sin(t * 11 + i) * 2, -27 + i * 3 - fh); ctx.quadraticCurveTo(fx + 2, -27 + i * 3 - fh * 0.6, fx + 3, -27 + i * 3); ctx.fill();
    }
    // hollow burnt eyes with fire inside
    for (const [ex, ey, er] of [[1, -15, 2.8], [8, -14, 2.3]]) {
      ctx.fillStyle = "#0a0503"; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,170,80,0.9)"; ctx.beginPath(); ctx.arc(ex + 0.4, ey + 0.4, er * 0.4, 0, 7); ctx.fill();
    }
    // smoke wisp
    ctx.strokeStyle = "rgba(60,50,48,0.45)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, -32); ctx.bezierCurveTo(-4 + Math.sin(t * 2) * 4, -42, 10, -48, 2 + Math.sin(t * 2.5) * 5, -58); ctx.stroke();
    ctx.restore();
    this.sigil(ctx, x, this.y - 12, 4);
  };

  // ================================================================ THE FADED HART
  B.hart.prototype.drawBody = function (ctx, G) {
    const x = this.cx(), y = this.y + this.h, f = this.facing, b = Art.boil, st = this.state, t = this.t;
    let alpha = 1;
    if (st === "dormant") alpha = 0.25 + Math.sin(t * 1.5) * 0.08;
    if (st === "wake") alpha = 0.25 + this.appear * 0.75;
    if (this.dead) alpha = Math.max(0, 1 - this.deathT / 2);
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.scale(f, 1);
    const gallop = st === "charge" ? t * 18 : 0;
    const crouch = st === "leapWind" ? this.stateT * 20 : st === "land" ? Math.max(0, 12 - this.stateT * 30) : 0;
    const headLow = st === "chargeWind" || st === "charge" ? 1 : st === "sweepWind" || st === "sprayWind" ? -0.6 : st === "erase" ? 0.5 : 0;
    const flick = this.phase2() && Math.floor(t * 6) % 5 === 0;
    const breathe = Math.sin(t * 2) * 1.2;
    const by = -62 + crouch + breathe * 0.3;
    groundShadow(ctx, 70, 0.28);
    const PALE = ["#f7f1e3", "#e2d8c3", "#b9ad96"];
    // legs: thick upper leg, knee/hock, slender cannon, dark hoof (far legs first)
    const leg = (lx, ph, hind, far) => {
      const s = Math.sin(gallop + ph) * 0.6;
      const hx = lx, hy = by + 8;
      const kx = hx + Math.sin(s) * 18 + (hind ? -6 : 3), ky = hy + 22 - crouch * 0.4;
      const ax = kx + Math.sin(s * 1.3 + (hind ? 0.5 : -0.2)) * 14 + (hind ? 5 : -2), ay = ky + 18;
      const fx = ax + (hind ? 1 : 2), fy = -3;
      ctx.fillStyle = far ? "#9f937d" : "#e8dfca";
      Art.brush(ctx, [hx, hy - 8, kx, ky, ax, ay, fx, fy], far ? 9 : 11, { seed: b + lx, taperStart: 0, taperEnd: 0.6 });
      ctx.fillStyle = INK;
      Art.brush(ctx, [hx + 3, hy - 4, kx + 2, ky, ax + 1, ay, fx + 1, fy], 1.6, { seed: b + lx + 1, taperStart: 0, taperEnd: 0 });
      poly(ctx, [fx - 3, fy - 3, fx + 4, fy - 3, fx + 5, 1, fx - 3, 1]); ctx.fillStyle = "#1a1512"; ctx.fill();
    };
    ctx.save(); if (!flick) ctx.globalAlpha *= 0.55;
    leg(-30, Math.PI * 0.5, true, true);
    ctx.restore();
    leg(22, Math.PI, false, true);
    // body contour: chest, belly, rump, back
    const body = new Path2D();
    body.moveTo(40, by - 16);
    body.bezierCurveTo(54, by - 8, 52, by + 14, 34, by + 18);
    body.bezierCurveTo(10, by + 26, -24, by + 24, -40, by + 16);
    body.bezierCurveTo(-58, by + 10, -60, by - 14, -46, by - 20);
    body.bezierCurveTo(-24, by - 26, 12, by - 26, 40, by - 16);
    body.closePath();
    ctx.fillStyle = grad(ctx, 0, by - 26, 0, by + 26, PALE); ctx.fill(body);
    ctx.save(); ctx.clip(body);
    Art.wash(ctx, -10, by + 4, 42, 16, "#8fb5d6", 0.38, 7);
    Art.hatch(ctx, -50, by + 6, 100, 22, 3, 0.9, INK, 0.28, 0.8, 1);
    // dappled paper spots
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(-30 + k * 9, by - 12 + (k % 3) * 4, 2.4, 1.6, 0, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(body);
    // erased chunks: paper-white patches with dashed ghost outline & eraser crumbs
    const nErase = flick ? 5 : 3;
    for (let i = 0; i < nErase; i++) {
      const ex = -34 + i * 20 + (U.hash(i + (flick ? b : 0)) - 0.5) * 10, ey = by - 14 + (i % 2) * 16;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(0.4);
      ctx.fillStyle = "rgba(244,239,227,0.97)"; ctx.fillRect(-11, -6, 22, 12);
      ctx.setLineDash([2, 3]); ctx.strokeStyle = "rgba(21,16,13,0.45)"; ctx.lineWidth = 1; ctx.strokeRect(-11, -6, 22, 12); ctx.setLineDash([]);
      ctx.restore();
      ctx.fillStyle = "rgba(200,190,175,0.9)";
      for (let k = 0; k < 4; k++) ctx.fillRect(ex + (U.hash(i * 7 + k) - 0.5) * 24, ey + 10 + U.hash(i + k * 3) * 6, 2, 1.4);
    }
    leg(30, 0, false, false);
    leg(-40, Math.PI * 1.5, true, false);
    // muscle masses at the haunch and shoulder, drawn over the near legs' tops
    ctx.beginPath(); ctx.ellipse(-38, by + 2, 17, 20, -0.3, 0, Math.PI * 2);
    paint(ctx, grad(ctx, -50, by - 18, -30, by + 22, PALE), { lw: 1.8, hatch: [-56, by + 4, 34, 20, 2.6, 0.9, 0.3] });
    ctx.beginPath(); ctx.ellipse(28, by + 2, 13, 16, 0.3, 0, Math.PI * 2);
    paint(ctx, grad(ctx, 16, by - 14, 40, by + 18, PALE), { lw: 1.8, hatch: [16, by + 6, 26, 14, 2.6, 0.9, 0.3] });
    // neck with a ruff of fur-strokes on the throat
    const nx = 38, ny = by - 14;
    const hx = 62 + headLow * 14, hy = by - 50 + headLow * 50;
    ctx.beginPath();
    ctx.moveTo(nx - 18, ny - 4);
    ctx.bezierCurveTo(nx - 12, ny - 22, hx - 16, hy + 14, hx - 8, hy - 2);
    ctx.lineTo(hx + 6, hy + 8);
    ctx.bezierCurveTo(hx - 2, hy + 24, nx + 20, ny - 4, nx + 14, ny + 18);
    ctx.closePath();
    paint(ctx, grad(ctx, nx, hy, nx, ny + 16, PALE), { lw: 2.2, hatch: [nx - 4, hy + 6, 30, ny - hy + 14, 2.6, -0.9, 0.22] });
    ctx.strokeStyle = "rgba(21,16,13,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const px = U.lerp(nx + 12, hx + 2, k / 6), py = U.lerp(ny + 14, hy + 12, k / 6); ctx.moveTo(px, py); ctx.lineTo(px + 4, py + 5); } ctx.stroke();
    // head: skull, long muzzle, leaf ear, eye with a pale-blue glint
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.35 + headLow * 0.55); ctx.scale(1.3, 1.3);
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.quadraticCurveTo(4, -11, 14, -5); ctx.lineTo(26, -1); ctx.quadraticCurveTo(30, 2, 26, 5); ctx.lineTo(10, 7); ctx.quadraticCurveTo(-6, 8, -8, -6); ctx.closePath();
    paint(ctx, grad(ctx, 0, -11, 0, 8, PALE), { lw: 2.2, hatch: [-8, 2, 36, 7, 2.4, 0.9, 0.3] });
    ctx.fillStyle = "#1a1512"; ctx.beginPath(); ctx.arc(26, 1, 1.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(-14, -18, -18, -10); ctx.quadraticCurveTo(-12, -6, -4, -3); ctx.closePath();
    paint(ctx, grad(ctx, -18, -18, -4, -3, ["#e2d8c3", "#a89c85"]), { lw: 1.6 });
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(6, -3, 2.6, 2, 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = "#bfe0ff"; ctx.fillRect(6.4, -3.8, 1.4, 1.2);
    glowAdd(ctx, 6, -3, 10, "rgba(140,190,240,0.3)");
    ctx.restore();
    // antlers: many-tined ink branches with a pale highlight line
    const sweepA = st === "sweep" ? Math.sin(Math.min(1, this.stateT / 0.25) * Math.PI) * 0.9 : st === "sweepWind" ? -0.4 : 0;
    ctx.save(); ctx.translate(hx - 2, hy - 6); ctx.rotate(-0.3 + headLow * 0.8 + sweepA);
    const rr = U.rng(77);
    const branch = (x0, y0, a, len, w, d) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      const mx = (x0 + x1) / 2 + Math.cos(a + 1.57) * len * 0.08, my = (y0 + y1) / 2 + Math.sin(a + 1.57) * len * 0.08;
      Art.brush(ctx, [x0, y0, mx, my, x1, y1], w, { seed: d * 5 + x0, taperStart: 0, taperEnd: 0.6, color: "#1f1914" });
      if (w > 2.4) { ctx.strokeStyle = "rgba(230,220,200,0.35)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0, y0 - 1); ctx.quadraticCurveTo(mx, my - 1, x1, y1 - 1); ctx.stroke(); }
      if (d <= 0) return;
      branch(x1, y1, a - 0.42 - rr() * 0.22, len * 0.7, w * 0.68, d - 1);
      branch(x1, y1, a + 0.34 + rr() * 0.2, len * 0.6, w * 0.68, d - 1);
      if (d >= 3 && rr() < 0.6) branch(U.lerp(x0, x1, 0.5), U.lerp(y0, y1, 0.5), a + 0.9, len * 0.45, w * 0.5, 0);
    };
    branch(0, 0, -1.95, 36, 5.5, 4);
    branch(5, 0, -1.2, 32, 5, 4);
    ctx.restore();
    if (st === "sweep") {
      ctx.fillStyle = "rgba(21,16,13,0.5)";
      ctx.beginPath(); ctx.arc(50, -60, 112, -1.2, 0.6); ctx.arc(50, -60, 80, 0.6, -1.2, true); ctx.fill();
    }
    ctx.restore();
  };

  // ================================================================ SOOT MARSHAL
  B.marshal.prototype.drawBody = function (ctx, G) {
    const x = this.cx(), y = this.y + this.h, f = this.facing, b = Art.boil, t = this.t;
    const st = this.state, a = this.atk;
    let alpha = 1;
    if (this.dead) alpha = this.dissolving ? Math.max(0, 1 - this.dissolveT / 2.2) : 1;
    ctx.save(); ctx.globalAlpha *= alpha * 0.9; ctx.globalCompositeOperation = "lighter";
    Art.glow(ctx, x, y - 95, 180, "rgba(255,100,35,0.42)"); ctx.restore();
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.scale(f, 1);
    const kneel = st === "dormant" || st === "stagger" || this.dead;
    const sink = kneel ? 34 : st === "intro" ? 34 * (1 - U.clamp(this.introRise || 0, 0, 1)) : 0;
    const walkPh = st === "walk" ? Math.sin(t * 5) : 0;
    let ha = -1.3, ext = 0, lean = 0;
    if (st === "atk" && a) {
      const k = a.phase === "wind" ? U.easeOut(a.t / a.wind) : a.phase === "act" ? U.easeOut(a.t / Math.max(0.01, a.act)) : 1;
      const K = { cleave: [-1.3, -2.5, 0.9], sweep: [-1.3, 2.7, 0.25], lob: [-1.3, -1.0, -1.1], lunge: [-1.3, -0.1, 0.0], floor: [-1.3, -1.6, 1.4], wave: [-1.3, -2.6, 1.2], collapse: [-1.3, -1.5, 1.5], stoke: [-1.3, 1.25, 1.35] }[a.name] || [-1.3, -1.3, -1.3];
      if (a.phase === "wind") { ha = U.lerp(K[0], K[1], k); lean = a.name === "cleave" || a.name === "wave" ? -0.15 * k : 0.1 * k; }
      else if (a.phase === "act") { ha = U.lerp(K[1], K[2], k); lean = 0.25; ext = a.name === "lunge" ? 20 : 0; }
      else { ha = K[2]; lean = 0.15 * (1 - a.t / a.rec); }
    }
    if (kneel) { ha = 1.25; lean = 0.35; }
    if (st === "roar") { ha = -1.9; lean = -0.25; }
    groundShadow(ctx, 70, 0.4);
    ctx.translate(0, sink);
    const IRON = ["#3a2a24", "#1e1512", "#0f0a08"];
    // tattered burnt-page cape streaming behind
    {
      const flut = t * 2.2;
      ctx.beginPath(); ctx.moveTo(-18, -134);
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const k = i / 8;
        pts.push([-26 - k * 38 - Math.sin(flut + k * 3) * 6 * k, -130 + k * 120 + (i % 2 ? 8 : -4)]);
      }
      pts.forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.lineTo(-10, -8); ctx.lineTo(10, -60); ctx.closePath();
      paint(ctx, grad(ctx, 0, -134, 0, -8, ["#5a3e30", "#3a2820", "#1a100c"]), { lw: 2.2, hatch: [-80, -130, 90, 120, 4, 0.8, 0.3] });
      for (let k = 0; k < 4; k++) {
        const bx = -34 - k * 8 - U.hash(k) * 6, byy = -110 + k * 24 + U.hash(k + 3) * 8, br = 3 + U.hash(k + 7) * 3;
        glowAdd(ctx, bx, byy, br * 4, "rgba(255,120,50,0.5)");
        ctx.fillStyle = "#1a0a05"; Art.blobPath(ctx, bx, byy, br, br * 0.8, k * 11, 10, 0.35); ctx.fill();
        ctx.strokeStyle = "rgba(255,160,80,0.9)"; ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,130,55,0.8)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); pts.slice(3).forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      writing(ctx, -50, -100, 30, 4, 7, "rgba(255,160,90,0.18)");
    }
    // legs / greaves with plated knees
    for (const [s, seed] of [[-1, 0], [1, 1]]) {
      const kx = s * 14 + walkPh * 10 * s, fx = s * 18 + walkPh * 12 * s;
      ctx.fillStyle = s < 0 ? "#150e0c" : "#1f1512";
      Art.brush(ctx, [s * 12, -64, kx, -32, fx, 0], 15, { seed: b + seed, taperStart: 0, taperEnd: 0 });
      ctx.beginPath(); ctx.moveTo(kx - 9, -38); ctx.lineTo(kx + 9, -40); ctx.lineTo(kx + 7, -26); ctx.lineTo(kx - 8, -26); ctx.closePath();
      paint(ctx, grad(ctx, 0, -40, 0, -26, IRON), { lw: 2 });
      poly(ctx, [fx - 10, -8, fx + 14, -6, fx + 16, 1, fx - 10, 1]); paint(ctx, "#120c0a", { lw: 1.6 });
    }
    ctx.rotate(lean * 0.5);
    // layered burnt-page skirt shards with smouldering edges
    const shardLayer = (col, edge, spread, len, seed) => {
      for (let i = 0; i < 7; i++) {
        const ang = (i - 3) * spread;
        const fl = Math.sin(t * 3 + i * 1.3 + seed) * 0.05;
        const L = len * (0.8 + U.hash(i + seed) * 0.3) - (kneel ? 10 : 0);
        const x0 = (i - 3) * 7, y0 = -118;
        const x1 = x0 + Math.sin(ang + fl) * L, y1 = y0 + Math.cos(ang + fl) * L;
        const hw = 12, bw = 9 + U.hash(i * 3 + seed) * 5;
        // a broad panel of charred cloth with a ragged, torn bottom edge
        ctx.beginPath();
        ctx.moveTo(x0 - hw, y0); ctx.lineTo(x0 + hw, y0);
        ctx.lineTo(x1 + bw, y1 - 8); ctx.lineTo(x1 + bw * 0.4, y1 - 2); ctx.lineTo(x1, y1 + 4); ctx.lineTo(x1 - bw * 0.5, y1 - 3); ctx.lineTo(x1 - bw, y1 - 9);
        ctx.closePath();
        ctx.fillStyle = grad(ctx, 0, y0, 0, y1, [col, "#0e0907"]); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 1.2; ctx.stroke();
        // smouldering torn hem
        ctx.strokeStyle = edge; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x1 + bw, y1 - 8); ctx.lineTo(x1 + bw * 0.4, y1 - 2); ctx.lineTo(x1, y1 + 4); ctx.lineTo(x1 - bw * 0.5, y1 - 3); ctx.lineTo(x1 - bw, y1 - 9); ctx.stroke();
        // fold crease down the panel
        ctx.strokeStyle = "rgba(255,150,80,0.12)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0 + 2, y0 + 4); ctx.lineTo(x1 + 1, y1 - 6); ctx.stroke();
      }
    };
    shardLayer("#2c1e19", "rgba(255,120,50,0.85)", 0.16, 112, 1);
    shardLayer("#433027", "rgba(255,150,70,0.7)", 0.11, 90, 2);
    // hanging burnt pages & a chain from the belt
    for (let k = 0; k < 3; k++) {
      const px = -16 + k * 14, sw = Math.sin(t * 2 + k) * 2;
      ctx.save(); ctx.translate(px, -74); ctx.rotate(sw * 0.05);
      poly(ctx, [-5, 0, 5, 0, 6 + sw, 22, 0, 20, -5 + sw, 24]);
      paint(ctx, grad(ctx, 0, 0, 0, 24, ["#8a6a50", "#3a2a22"]), { lw: 1.2 });
      writing(ctx, -3, 5, 7, 3, 4, "rgba(20,10,6,0.5)");
      ctx.restore();
    }
    // cuirass: ribbed plates with ember seams
    ctx.beginPath(); ctx.moveTo(-26, -72); ctx.lineTo(-31, -126); ctx.lineTo(0, -142); ctx.lineTo(31, -126); ctx.lineTo(26, -72); ctx.closePath();
    paint(ctx, grad(ctx, -30, -142, 30, -72, ["#4a3428", "#231915", "#0f0a08"]), { lw: 3, hatch: [-30, -110, 60, 38, 3.5, 0.8, 0.28] });
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-20, -82 - k * 12); ctx.quadraticCurveTo(0, -89 - k * 12, 20, -82 - k * 12); ctx.stroke();
      ctx.strokeStyle = "rgba(255,120,50," + (0.35 + this.phase * 0.15) + ")"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-18, -80 - k * 12); ctx.quadraticCurveTo(0, -87 - k * 12, 18, -80 - k * 12); ctx.stroke();
    }
    ctx.fillStyle = "#3a2618"; ctx.fillRect(-27, -76, 54, 6);
    ctx.fillStyle = "#9a6a2a"; ctx.fillRect(-4, -77, 8, 8);
    // pauldrons: layered curled burnt pages
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        ctx.beginPath(); ctx.moveTo(s * (18 + k * 2), -138 + k * 6); ctx.quadraticCurveTo(s * (52 - k * 4), -152 + k * 8, s * (48 - k * 3), -118 + k * 6); ctx.quadraticCurveTo(s * 36, -120 + k * 6, s * 20, -118 + k * 6); ctx.closePath();
        paint(ctx, grad(ctx, 0, -152, 0, -116, k ? ["#4a3428", "#1e1410"] : ["#5a3e2e", "#2a1c16"]), { lw: 2.2 });
      }
      ctx.strokeStyle = "rgba(255,140,60,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s * 47, -121); ctx.lineTo(s * 40, -128); ctx.stroke();
    }
    // helm with a glowing visor slit & a crown of charred page points
    ctx.beginPath(); ctx.ellipse(2, -153, 15, 18, 0, 0, Math.PI * 2);
    paint(ctx, grad(ctx, -12, -170, 14, -136, ["#3a2a24", "#120c0a"]), { lw: 2.5 });
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 10, -162); ctx.quadraticCurveTo(s * 24, -172, s * 22, -186); ctx.quadraticCurveTo(s * 16, -174, s * 6, -168); ctx.closePath();
      paint(ctx, "#1c1411", { lw: 1.6 });
    }
    for (let i = 0; i < 5; i++) {
      const cx = -12 + i * 6.5, h = 16 + (i === 2 ? 12 : i % 2 ? 4 : 8);
      ctx.beginPath(); ctx.moveTo(cx - 4, -166); ctx.lineTo(cx + Math.sin(t * 4 + i) * 1.5, -166 - h); ctx.lineTo(cx + 4, -166); ctx.closePath();
      paint(ctx, "#2b1d18", { lw: 1.2 });
      if (this.phase >= 2 || st === "roar") { ctx.fillStyle = "rgba(255,130,50,0.95)"; ctx.fillRect(cx - 1, -166 - h, 2, 5); }
    }
    const eyeGlow = st === "dormant" ? 0.3 + Math.sin(t * 2) * 0.2 : 1;
    glowAdd(ctx, 10, -153, 22, "rgba(255,140,60," + 0.6 * eyeGlow + ")");
    ctx.fillStyle = "rgba(255,190,110," + eyeGlow + ")";
    ctx.beginPath(); ctx.moveTo(-2, -155); ctx.lineTo(16, -156); ctx.lineTo(15, -152); ctx.lineTo(-1, -151.5); ctx.closePath(); ctx.fill();
    // halberd: bound shaft, engraved crescent blade with a glowing edge, back spike
    ctx.save();
    ctx.translate(20 + ext, -104); ctx.rotate(ha);
    ctx.fillStyle = "#1a120e";
    Art.brush(ctx, [-60, 0, 40, -1, 150, 0], 6.5, { seed: b + 5, taperStart: 0, taperEnd: 0 });
    ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 1.2;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { ctx.moveTo(100 + k * 3, -4); ctx.lineTo(102 + k * 3, 4); } for (let k = 0; k < 4; k++) { ctx.moveTo(-10 + k * 3, -4); ctx.lineTo(-8 + k * 3, 4); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(118, -4); ctx.quadraticCurveTo(128, -48, 160, -50); ctx.quadraticCurveTo(144, -22, 148, 4); ctx.quadraticCurveTo(144, 28, 162, 48); ctx.quadraticCurveTo(126, 46, 118, 6); ctx.closePath();
    paint(ctx, grad(ctx, 118, -50, 162, 48, ["#4a3a32", "#241a16", "#120c0a"]), { lw: 2.6 });
    ctx.strokeStyle = "rgba(255,150,70,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(126, -20); ctx.quadraticCurveTo(136, -30, 146, -34); ctx.moveTo(126, 20); ctx.quadraticCurveTo(136, 30, 148, 34); ctx.moveTo(128, 0); ctx.arc(134, 0, 5, Math.PI, Math.PI * 3); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255,150,70,0.95)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(160, -48); ctx.quadraticCurveTo(144, -22, 148, 4); ctx.quadraticCurveTo(144, 28, 162, 46); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(150, -4); ctx.lineTo(182, 0); ctx.lineTo(150, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(116, -3); ctx.lineTo(104, -16); ctx.lineTo(112, -2); ctx.fill();
    ctx.restore();
    // arms with gauntlets
    const hx = 20 + ext, hy = -104;
    ctx.fillStyle = "#1a1210";
    Art.brush(ctx, [22, -128, 30, -112, hx, hy], 11, { seed: b + 7, taperStart: 0, taperEnd: 0 });
    ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 7); paint(ctx, grad(ctx, hx - 7, hy - 7, hx + 7, hy + 7, IRON), { lw: 1.8 });
    if (a && a.name === "lob" && a.phase === "wind") {
      Art.brush(ctx, [-22, -128, -30, -150, -24, -176], 10, { seed: b + 8, taperStart: 0, taperEnd: 0 });
      glowAdd(ctx, -24, -184, 46, "rgba(255,130,50,0.95)");
      ctx.fillStyle = "#ffd28a"; ctx.beginPath(); ctx.arc(-24, -184, 5, 0, 7); ctx.fill();
    } else Art.brush(ctx, [-22, -128, -30, -100, -24, -76], 10, { seed: b + 8, taperStart: 0, taperEnd: 0 });
    // flames licking the hem (more in later phases)
    ctx.globalCompositeOperation = "lighter";
    const flames = 3 + this.phase * 2;
    for (let i = 0; i < flames; i++) {
      const fx = -40 + (i / flames) * 80, fh = 14 + U.noise1(t * 6 + i * 2) * 20 * this.phase;
      ctx.fillStyle = "rgba(255,110,40,0.5)";
      ctx.beginPath(); ctx.moveTo(fx - 6, -14); ctx.quadraticCurveTo(fx - 3, -14 - fh * 0.6, fx + Math.sin(t * 9 + i) * 3, -14 - fh); ctx.quadraticCurveTo(fx + 3, -14 - fh * 0.6, fx + 6, -14); ctx.fill();
    }
    Art.glow(ctx, 0, -100, 110, "rgba(255,90,30," + (0.1 + this.phase * 0.06) + ")");
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  };
})();
