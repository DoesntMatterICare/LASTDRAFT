// Detailed environment props & special tiles, baked into each room's terrain layer
// (live ones — the water wheel, gates and creased veils — are drawn every frame).
// Painters are looked up by prop type from World; anything missing falls back to the
// simpler drawing in world.js.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art;
  const INK = Art.INK;
  const T = U.TILE;

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
  // fill, ink the outline, then hatch inside (hatching replaces the current path)
  function paint(ctx, fill, o = {}) {
    ctx.fillStyle = fill; ctx.fill();
    if (o.line !== false) { ctx.strokeStyle = o.line || INK; ctx.lineWidth = o.lw || 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
    if (o.hatch) {
      const [hx, hy, hw, hh, gap, ang, a] = o.hatch;
      ctx.save(); ctx.clip(); Art.hatch(ctx, hx, hy, hw, hh, gap || 3, ang || 0.9, o.hatchCol || INK, a || 0.3, 0.8, hx | 0); ctx.restore();
      ctx.beginPath();
    }
  }
  function rect(ctx, x, y, w, h, fill, o) { ctx.beginPath(); ctx.rect(x, y, w, h); paint(ctx, fill, o); }
  // wooden board with grain lines and nail heads
  function board(ctx, x, y, w, h, col, seed, o = {}) {
    rect(ctx, x, y, w, h, grad(ctx, x, y, x, y + h, [o.light || "#6a5038", col, o.dark || "#2a1c13"]), { lw: o.lw || 1.6 });
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 0.8;
    const r = U.rng(seed);
    ctx.beginPath();
    const horiz = w >= h;
    for (let k = 1; k < 4; k++) {
      if (horiz) { const yy = y + (h * k) / 4 + (r() - 0.5); ctx.moveTo(x + 2, yy); ctx.bezierCurveTo(x + w * 0.3, yy + (r() - 0.5) * 2, x + w * 0.7, yy + (r() - 0.5) * 2, x + w - 2, yy); }
      else { const xx = x + (w * k) / 4 + (r() - 0.5); ctx.moveTo(xx, y + 2); ctx.bezierCurveTo(xx + (r() - 0.5) * 2, y + h * 0.3, xx + (r() - 0.5) * 2, y + h * 0.7, xx, y + h - 2); }
    }
    ctx.stroke();
    if (r() < 0.6) { ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); const kx = x + w * (0.2 + r() * 0.6), ky = y + h * (0.2 + r() * 0.6); ctx.ellipse(kx, ky, horiz ? 3 : 1.5, horiz ? 1.5 : 3, 0, 0, 7); ctx.stroke(); }
    if (o.nails !== false) {
      ctx.fillStyle = "#15100d";
      const n = horiz ? [[x + 3, y + h / 2], [x + w - 3, y + h / 2]] : [[x + w / 2, y + 3], [x + w / 2, y + h - 3]];
      for (const [nx, ny] of n) { ctx.beginPath(); ctx.arc(nx, ny, 1.1, 0, 7); ctx.fill(); }
    }
  }
  function writing(ctx, x, y, w, rows, gap = 4, col = "rgba(21,16,13,0.4)") {
    ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = 0; k < rows; k++) {
      let px = x; const yy = y + k * gap;
      while (px < x + w) { const len = 2 + U.hash(px * 3.1 + yy) * 6; ctx.moveTo(px, yy); ctx.lineTo(Math.min(x + w, px + len), yy + (U.hash(px + yy) - 0.5)); px += len + 1.5; }
    }
    ctx.stroke();
  }
  const rivet = (ctx, x, y, r = 1.4) => { ctx.fillStyle = "#15100d"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(255,240,220,0.35)"; ctx.fillRect(x - r * 0.5, y - r * 0.6, r * 0.6, r * 0.6); };
  const glowAdd = (ctx, x, y, r, col) => { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, y, r, col); ctx.restore(); };
  const PAPER = ["#f3eada", "#ded1b4", "#b3a283"];

  const P = (LD.PropArt = {});

  // ---------------------------------------------------------------- erased townsfolk
  P.silhouette = (x, px, py, p) => {
    const v = p.v || 0, h = [92, 78, 100][v];
    const r = U.rng(px + v);
    // the ghost of a person: paper-blank, with an unsteady dashed outline and pencil ghost-lines
    const body = new Path2D();
    const hy = py - h + 12;
    body.ellipse(px, hy, v === 1 ? 9 : 11, v === 1 ? 11 : 13, 0, 0, Math.PI * 2);
    if (v === 0) { body.moveTo(px - 18, py); body.lineTo(px - 14, py - h + 36); body.quadraticCurveTo(px, py - h + 20, px + 14, py - h + 36); body.lineTo(px + 20, py); body.closePath(); }
    else if (v === 1) { body.moveTo(px - 11, py); body.lineTo(px - 9, py - h + 30); body.quadraticCurveTo(px, py - h + 22, px + 9, py - h + 30); body.lineTo(px + 12, py); body.closePath(); }
    else { body.moveTo(px - 14, py); body.lineTo(px - 13, py - h + 34); body.quadraticCurveTo(px, py - h + 24, px + 13, py - h + 34); body.lineTo(px + 15, py); body.closePath(); }
    x.fillStyle = grad(x, px, py - h, px, py, ["rgba(248,242,228,0.75)", "rgba(236,225,201,0.35)"]); x.fill(body);
    x.save(); x.clip(body);
    x.strokeStyle = "rgba(120,110,100,0.35)"; x.lineWidth = 1;
    for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(px - 20, py - h * (0.2 + k * 0.1)); x.lineTo(px + 20, py - h * (0.25 + k * 0.1) + 6); x.stroke(); }
    x.restore();
    x.setLineDash([5, 4]); x.strokeStyle = "rgba(21,16,13,0.6)"; x.lineWidth = 1.5; x.stroke(body); x.setLineDash([]);
    // half-remembered costume details
    x.strokeStyle = "rgba(60,50,45,0.5)"; x.lineWidth = 1.1;
    x.beginPath();
    if (v === 0) { x.moveTo(px - 12, py - h + 40); x.quadraticCurveTo(px, py - h + 48, px + 12, py - h + 40); x.moveTo(px - 8, hy - 8); x.quadraticCurveTo(px, hy - 18, px + 10, hy - 6); }
    if (v === 2) { x.moveTo(px - 16, hy - 10); x.lineTo(px + 16, hy - 10); x.moveTo(px - 9, hy - 10); x.lineTo(px - 8, hy - 24); x.lineTo(px + 8, hy - 24); x.lineTo(px + 9, hy - 10); x.moveTo(px - 3, py - h + 40); x.lineTo(px - 3, py - 20); }
    if (v === 1) { x.moveTo(px - 6, py - h + 36); x.lineTo(px + 6, py - h + 36); x.arc(px + 12, py - h + 44, 4, 0, 6.3); }
    x.stroke();
    // eraser streaks and crumbs
    x.fillStyle = "rgba(250,246,238,0.7)";
    for (let k = 0; k < 3; k++) { x.save(); x.translate(px + (r() - 0.5) * 16, py - h * (0.3 + r() * 0.5)); x.rotate(-0.5); x.fillRect(-12, -3, 24, 6); x.restore(); }
    x.fillStyle = "rgba(190,180,165,0.8)";
    for (let k = 0; k < 8; k++) x.fillRect(px - 16 + r() * 32, py - 3 - r() * 5, 2, 1.4);
  };

  // ---------------------------------------------------------------- signpost
  P.sign = (x, px, py, p) => {
    board(x, px - 4, py - 96, 8, 96, "#4a3626", 11, { nails: false });
    x.fillStyle = "#2a1c13"; poly(x, [px - 5, py - 100, px, py - 106, px + 5, py - 100]); x.fill();
    // an arrow board pointing onward, and a smaller crooked one below
    x.save(); x.translate(px, py - 78); x.rotate(-0.03);
    x.beginPath(); x.moveTo(-60, -13); x.lineTo(46, -13); x.lineTo(62, 0); x.lineTo(46, 13); x.lineTo(-60, 13); x.closePath();
    paint(x, grad(x, 0, -13, 0, 13, ["#7a5a3c", "#5b4630", "#3a2a1c"]), { lw: 2.2 });
    x.strokeStyle = "rgba(0,0,0,0.3)"; x.lineWidth = 0.8; x.beginPath(); x.moveTo(-56, -4); x.bezierCurveTo(-20, -6, 10, -2, 44, -5); x.moveTo(-56, 6); x.bezierCurveTo(-20, 4, 10, 8, 44, 5); x.stroke();
    rivet(x, -54, 0); rivet(x, 40, 0);
    Art.text(x, p.text, -4, 6, 18, { align: "center", color: "#f1e2c2" });
    x.restore();
    x.save(); x.translate(px, py - 48); x.rotate(0.12);
    x.beginPath(); x.moveTo(20, -8); x.lineTo(-30, -8); x.lineTo(-40, 0); x.lineTo(-30, 8); x.lineTo(20, 8); x.closePath();
    paint(x, grad(x, 0, -8, 0, 8, ["#6a4e34", "#3a2a1c"]), { lw: 1.8 });
    Art.text(x, "Margin", -10, 5, 13, { align: "center", color: "rgba(241,226,194,0.8)" });
    x.restore();
    // weeds at the foot
    x.strokeStyle = "rgba(90,85,60,0.8)"; x.lineWidth = 1;
    for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(px - 8 + k * 2.5, py); x.quadraticCurveTo(px - 10 + k * 2.5, py - 8, px - 8 + k * 3 + (k - 3), py - 12 - (k % 3) * 3); x.stroke(); }
  };

  // ---------------------------------------------------------------- hanging banner
  P.banner = (x, px, py, p, room) => {
    const col = room.theme === "gardens" ? ["#b07870", "#8c524c", "#5a302c"] : ["#a3322a", "#7a231e", "#4a130f"];
    const len = p.hang ? 92 : 112, w = 34;
    // iron rod with finials
    x.fillStyle = "#1a1412"; x.fillRect(px - 26, py - 3, 52, 4);
    for (const s of [-1, 1]) { x.beginPath(); x.arc(px + s * 27, py - 1, 3, 0, 7); x.fill(); }
    // cloth: gradient with vertical folds and a torn swallow-tail hem
    const cx = px - w / 2, top = py + 1;
    x.beginPath(); x.moveTo(cx, top); x.lineTo(cx + w, top);
    x.lineTo(cx + w + 1, top + len * 0.85); x.lineTo(cx + w * 0.78, top + len * 0.72); x.lineTo(cx + w * 0.62, top + len * 0.96);
    x.lineTo(cx + w * 0.5, top + len * 0.8); x.lineTo(cx + w * 0.34, top + len); x.lineTo(cx + w * 0.2, top + len * 0.78); x.lineTo(cx - 1, top + len * 0.9);
    x.closePath();
    paint(x, grad(x, cx, top, cx + w, top, [col[2], col[0], col[1], col[2]]), { lw: 1.6 });
    x.strokeStyle = "rgba(0,0,0,0.3)"; x.lineWidth = 1.2;
    x.beginPath(); for (let k = 1; k < 4; k++) { x.moveTo(cx + (w * k) / 4, top + 4); x.lineTo(cx + (w * k) / 4 + (k - 2), top + len * 0.7); } x.stroke();
    // embroidered emblem: an open book with a quill
    const ey = top + len * 0.32;
    x.strokeStyle = "rgba(230,190,110,0.85)"; x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(px - 9, ey); x.quadraticCurveTo(px - 4, ey - 3, px, ey); x.quadraticCurveTo(px + 4, ey - 3, px + 9, ey); x.moveTo(px - 9, ey); x.lineTo(px - 9, ey + 7); x.quadraticCurveTo(px - 4, ey + 4, px, ey + 7); x.quadraticCurveTo(px + 4, ey + 4, px + 9, ey + 7); x.lineTo(px + 9, ey); x.moveTo(px + 2, ey - 2); x.lineTo(px + 8, ey - 12); x.stroke();
    x.fillStyle = "rgba(230,190,110,0.8)"; x.fillRect(cx + 3, top + 3, w - 6, 1.4);
  };

  // ---------------------------------------------------------------- crate
  P.crate = (x, px, py) => {
    for (let k = 0; k < 2; k++) board(x, px, py + k * 20, 80, 20, "#4a3828", px * 3 + k);
    x.strokeStyle = INK; x.lineWidth = 2.4; x.strokeRect(px, py, 80, 40);
    // corner braces & diagonal
    x.fillStyle = "#2a1c13";
    for (const bx of [px, px + 72]) x.fillRect(bx, py, 8, 40);
    x.strokeStyle = "#2a1c13"; x.lineWidth = 5; x.beginPath(); x.moveTo(px + 8, py + 36); x.lineTo(px + 72, py + 4); x.stroke();
    x.strokeStyle = INK; x.lineWidth = 1.2; x.stroke();
    for (const [rx, ry] of [[px + 4, py + 4], [px + 4, py + 36], [px + 76, py + 4], [px + 76, py + 36]]) rivet(x, rx, ry, 1.3);
    // stencilled mark and a coil of rope
    x.fillStyle = "rgba(230,215,180,0.35)"; Art.text(x, "INK", px + 40, py + 26, 12, { align: "center", font: "title", color: "rgba(230,215,180,0.45)" });
    x.strokeStyle = "#8a6a44"; x.lineWidth = 2;
    for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(px + 62, py - 3 - k * 2, 10 - k, 3, 0, 0, Math.PI * 2); x.stroke(); }
  };

  // ---------------------------------------------------------------- scattered pages
  P.pages = (x, px, py, p, room) => {
    const r = U.rng(U.strSeed(room.id + p.x));
    for (let i = 0; i < 8; i++) {
      x.save(); x.translate(px + (r() - 0.5) * 100, py - 2 - r() * 2); x.rotate((r() - 0.5) * 0.7);
      const w = 22 + r() * 8, h = 7 + r() * 3;
      x.beginPath(); x.moveTo(-w / 2, -h / 2); x.lineTo(w / 2, -h / 2 - 1.5); x.quadraticCurveTo(w / 2 + 3, 0, w / 2, h / 2); x.lineTo(-w / 2, h / 2); x.closePath();
      if (p.burnt) {
        paint(x, grad(x, -w / 2, 0, w / 2, 0, ["#8a6a50", "#4a3426", "#1a100b"]), { lw: 1 });
        glowAdd(x, w / 2 - 2, 0, 6, "rgba(255,120,50,0.6)");
        x.fillStyle = "rgba(255,150,70,0.9)"; x.fillRect(w / 2 - 3, -2, 1.5, 3);
      } else {
        paint(x, grad(x, 0, -h / 2, 0, h / 2, PAPER), { lw: 1 });
        writing(x, -w / 2 + 3, -h / 2 + 3, w - 6, 2, 2.4, "rgba(21,16,13,0.35)");
      }
      x.restore();
    }
    // a crumpled ball of paper
    const bx = px + (r() - 0.5) * 60;
    x.beginPath(); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rr = 5 + r() * 2.5; x.lineTo(bx + Math.cos(a) * rr, py - 5 + Math.sin(a) * rr * 0.85); } x.closePath();
    paint(x, p.burnt ? "#3a2a22" : "#e6d9bc", { lw: 1.2 });
    x.strokeStyle = "rgba(21,16,13,0.4)"; x.lineWidth = 0.7; x.beginPath(); x.moveTo(bx - 3, py - 7); x.lineTo(bx + 1, py - 4); x.lineTo(bx - 1, py - 2); x.stroke();
  };

  // ---------------------------------------------------------------- the Bindery's street front
  P.bindery = (x, px, py) => {
    const w = 210, h = 300, L = px - w / 2;
    // stone ground floor
    x.beginPath(); x.rect(L, py - 110, w, 110);
    paint(x, grad(x, 0, py - 110, 0, py, ["#5a4c48", "#3a302e"]), { lw: 2.5 });
    x.strokeStyle = "rgba(0,0,0,0.4)"; x.lineWidth = 1;
    for (let yy = py - 110; yy < py; yy += 14) { x.beginPath(); x.moveTo(L, yy); x.lineTo(L + w, yy); x.stroke(); for (let xx = L + ((yy / 14) % 2 ? 0 : 12); xx < L + w; xx += 24) { x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + 14); x.stroke(); } }
    // jettied timber upper storeys
    for (let f = 0; f < 2; f++) {
      const y0 = py - 110 - (f + 1) * 95, jut = (f + 1) * 8;
      x.beginPath(); x.rect(L - jut, y0, w + jut * 2, 95);
      paint(x, grad(x, 0, y0, 0, y0 + 95, ["#d8c8a6", "#b8a684"]), { lw: 2.5 });
      x.fillStyle = "#3a261a";
      for (let k = 0; k <= 6; k++) x.fillRect(L - jut + (k * (w + jut * 2)) / 6 - 3, y0, 6, 95);
      x.fillRect(L - jut, y0, w + jut * 2, 7); x.fillRect(L - jut, y0 + 88, w + jut * 2, 7);
      x.strokeStyle = "#3a261a"; x.lineWidth = 5;
      x.beginPath(); for (let k = 0; k < 6; k += 2) { const a = L - jut + (k * (w + jut * 2)) / 6, b = L - jut + ((k + 1) * (w + jut * 2)) / 6; x.moveTo(a, y0 + 88); x.lineTo(b, y0 + 7); } x.stroke();
      // leaded windows glowing warm, with books on the sill
      for (const wx of [L + 30, L + w - 60]) {
        x.beginPath(); x.moveTo(wx, y0 + 78); x.lineTo(wx, y0 + 34); x.quadraticCurveTo(wx + 15, y0 + 16, wx + 30, y0 + 34); x.lineTo(wx + 30, y0 + 78); x.closePath();
        paint(x, grad(x, 0, y0 + 20, 0, y0 + 78, ["#ffe0a8", "#e8a860", "#b06a30"]), { lw: 2.5 });
        x.strokeStyle = "rgba(40,24,14,0.8)"; x.lineWidth = 1;
        x.beginPath(); for (let k = 1; k < 3; k++) { x.moveTo(wx + k * 10, y0 + 24); x.lineTo(wx + k * 10, y0 + 78); } for (let k = 1; k < 4; k++) { x.moveTo(wx, y0 + 34 + k * 11); x.lineTo(wx + 30, y0 + 34 + k * 11); } x.stroke();
        for (let k = 0; k < 5; k++) { x.fillStyle = ["#6e2a22", "#2d5d8f", "#7a5a30", "#3e3a30", "#8a7a5a"][k]; x.fillRect(wx + 3 + k * 5, y0 + 68 - (k % 2) * 3, 4, 10 + (k % 2) * 3); }
        glowAdd(x, wx + 15, y0 + 50, 60, "rgba(255,180,100,0.35)");
      }
    }
    // steep tiled roof with a dormer & chimney
    const ry = py - 300, jutR = 20;
    x.beginPath(); x.moveTo(L - jutR, ry); x.lineTo(px + 6, ry - 120); x.lineTo(L + w + jutR, ry); x.closePath();
    paint(x, grad(x, 0, ry - 120, 0, ry, ["#4a3a40", "#2a2026"]), { lw: 2.5, hatch: [L - jutR, ry - 120, w + jutR * 2, 120, 5, 0, 0.35] });
    x.strokeStyle = "rgba(0,0,0,0.45)"; x.lineWidth = 1;
    for (let k = 1; k < 8; k++) { const t = k / 8; x.beginPath(); x.moveTo(U.lerp(px + 6, L - jutR, t), ry - 120 + 120 * t); x.lineTo(U.lerp(px + 6, L + w + jutR, t), ry - 120 + 120 * t); x.stroke(); }
    x.beginPath(); x.rect(px + 40, ry - 90, 16, 60); paint(x, grad(x, px + 40, 0, px + 56, 0, ["#6a4c40", "#3a2a24"]), { lw: 2 });
    x.fillStyle = "#1a1210"; x.fillRect(px + 37, ry - 94, 22, 6);
    x.beginPath(); x.moveTo(px - 30, ry - 20); x.lineTo(px - 10, ry - 58); x.lineTo(px + 10, ry - 20); x.closePath(); paint(x, "#3a2e34", { lw: 2 });
    x.beginPath(); x.rect(px - 18, ry - 40, 16, 18); paint(x, "#e8a860", { lw: 1.6 });
    // arched door with voussoirs, steps and a carved sign
    x.beginPath(); x.moveTo(px - 30, py); x.lineTo(px - 30, py - 70); x.quadraticCurveTo(px, py - 108, px + 30, py - 70); x.lineTo(px + 30, py); x.closePath();
    paint(x, "#2a2020", { lw: 3 });
    x.beginPath(); x.moveTo(px - 24, py); x.lineTo(px - 24, py - 68); x.quadraticCurveTo(px, py - 98, px + 24, py - 68); x.lineTo(px + 24, py); x.closePath();
    paint(x, grad(x, 0, py - 98, 0, py, ["#3a1e12", "#150c08"]), { lw: 1.6 });
    x.strokeStyle = "rgba(0,0,0,0.5)"; x.lineWidth = 1;
    for (let k = 0; k < 9; k++) { const t = k / 8, a = Math.PI + t * Math.PI; x.beginPath(); x.moveTo(px + Math.cos(a) * 26, py - 70 + Math.sin(a) * 30); x.lineTo(px + Math.cos(a) * 33, py - 70 + Math.sin(a) * 38); x.stroke(); }
    rect(x, px - 40, py - 6, 80, 6, "#4a3e3a", { lw: 1.5 });
    const sy = py - 152;
    x.fillStyle = "#1a1412"; x.fillRect(px - 2, sy - 22, 4, 10);
    x.beginPath(); x.moveTo(px - 74, sy - 12); x.lineTo(px + 74, sy - 12); x.lineTo(px + 80, sy + 5); x.lineTo(px + 74, sy + 22); x.lineTo(px - 74, sy + 22); x.lineTo(px - 80, sy + 5); x.closePath();
    paint(x, grad(x, 0, sy - 12, 0, sy + 22, ["#8a6a44", "#5b4630", "#3a2a1c"]), { lw: 2.5 });
    x.strokeStyle = "rgba(230,190,110,0.6)"; x.lineWidth = 1; x.strokeRect(px - 68, sy - 7, 136, 24);
    Art.text(x, "THE BINDERY", px, sy + 12, 20, { align: "center", color: "#f3dca0", font: "title" });
    // a lantern beside the door
    x.strokeStyle = "#1a1412"; x.lineWidth = 3; x.beginPath(); x.moveTo(px + 34, py - 84); x.lineTo(px + 50, py - 84); x.stroke();
    x.beginPath(); x.rect(px + 44, py - 82, 12, 16); paint(x, "rgba(255,200,120,0.95)", { lw: 1.6 });
    glowAdd(x, px + 50, py - 74, 50, "rgba(255,170,90,0.45)");
  };

  // ---------------------------------------------------------------- book press
  P.press = (x, px, py) => {
    // stacked books beneath
    const books = [["#6e2a22", 60, 8], ["#3a4a6a", 54, 7], ["#7a5a30", 58, 9]];
    let by = py - 20;
    for (const [c, w, h] of books) { by -= h; rect(x, px - w / 2, by, w, h, grad(x, 0, by, 0, by + h, [c, "#1a1210"]), { lw: 1.2 }); x.fillStyle = "rgba(240,230,210,0.5)"; x.fillRect(px + w / 2 - 4, by + 1, 3, h - 2); }
    board(x, px - 44, py - 20, 88, 20, "#3d2b1f", 3);
    board(x, px - 38, py - 116, 12, 96, "#3d2b1f", 4, { nails: false });
    board(x, px + 26, py - 116, 12, 96, "#3d2b1f", 5, { nails: false });
    board(x, px - 44, py - 128, 88, 14, "#3d2b1f", 6);
    // iron screw with a spoked wheel and the platen
    x.fillStyle = "#2a2624"; x.fillRect(px - 3, py - 114, 6, 64);
    x.strokeStyle = "rgba(200,190,180,0.35)"; x.lineWidth = 1; x.beginPath(); for (let k = 0; k < 10; k++) { x.moveTo(px - 3, py - 110 + k * 6); x.lineTo(px + 3, py - 107 + k * 6); } x.stroke();
    rect(x, px - 30, py - 52, 60, 7, grad(x, 0, py - 52, 0, py - 45, ["#5a524c", "#2a2624"]), { lw: 1.6 });
    x.strokeStyle = "#2a2624"; x.lineWidth = 3; x.beginPath(); x.ellipse(px, py - 136, 26, 6, 0, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 2; x.beginPath(); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; x.moveTo(px, py - 136); x.lineTo(px + Math.cos(a) * 26, py - 136 + Math.sin(a) * 6); } x.stroke();
    for (const s of [-1, 1]) rivet(x, px + s * 32, py - 121, 1.8);
  };

  // ---------------------------------------------------------------- ink jars
  P.jars = (x, px, py, p, room, S) => {
    const shapes = [[-26, 14, 20, "round"], [-10, 10, 28, "tall"], [4, 14, 18, "round"], [18, 9, 24, "tall"]];
    shapes.forEach(([dx, w, h, kind], i) => {
      const jx = px + dx, blue = i === 2 && S.flags.pigment_water;
      x.beginPath();
      if (kind === "round") { x.moveTo(jx - w / 2, py); x.quadraticCurveTo(jx - w / 2 - 2, py - h * 0.8, jx - w * 0.2, py - h); x.lineTo(jx + w * 0.2, py - h); x.quadraticCurveTo(jx + w / 2 + 2, py - h * 0.8, jx + w / 2, py); }
      else { x.moveTo(jx - w / 2, py); x.lineTo(jx - w / 2, py - h * 0.7); x.lineTo(jx - w * 0.2, py - h); x.lineTo(jx + w * 0.2, py - h); x.lineTo(jx + w / 2, py - h * 0.7); x.lineTo(jx + w / 2, py); }
      x.closePath();
      paint(x, grad(x, jx - w / 2, 0, jx + w / 2, 0, blue ? ["#1f4f86", "#3f7fc0", "#16345a"] : ["#0c0f18", "#1e2436", "#0a0c12"]), { lw: 1.4 });
      x.fillStyle = "rgba(255,255,255,0.35)"; x.fillRect(jx - w * 0.3, py - h * 0.75, 1.6, h * 0.5);
      // label & cork
      rect(x, jx - w * 0.36, py - h * 0.55, w * 0.72, h * 0.28, "#e6d9bc", { lw: 0.8 });
      writing(x, jx - w * 0.3, py - h * 0.48, w * 0.6, 1, 3, "rgba(21,16,13,0.5)");
      rect(x, jx - w * 0.18, py - h - 4, w * 0.36, 5, "#8a6a44", { lw: 0.8 });
    });
    // a tipped bottle and its spilled ink
    x.fillStyle = INK; Art.blobPath(x, px + 34, py - 1, 12, 2.5, 3, 12, 0.3); x.fill();
    x.save(); x.translate(px + 28, py - 5); x.rotate(1.35);
    rect(x, -4, -8, 8, 14, "#141a2a", { lw: 1.2 }); x.restore();
  };

  // ---------------------------------------------------------------- candle in a brass holder
  P.candle = (x, px, py) => {
    x.beginPath(); x.ellipse(px, py - 2, 8, 2.5, 0, 0, Math.PI * 2); paint(x, grad(x, px - 8, 0, px + 8, 0, ["#8a6a2a", "#e0b860", "#6a4a1a"]), { lw: 1.2 });
    x.strokeStyle = "#8a6a2a"; x.lineWidth = 1.6; x.beginPath(); x.arc(px + 9, py - 5, 3, -1.5, 1.5); x.stroke();
    x.beginPath(); x.rect(px - 3.5, py - 18, 7, 16); paint(x, grad(x, px - 3.5, 0, px + 3.5, 0, ["#f4ecda", "#d8cbb0"]), { lw: 1.2 });
    x.fillStyle = "#f4ecda";
    x.beginPath(); x.moveTo(px - 3.5, py - 18); x.quadraticCurveTo(px - 5, py - 12, px - 4, py - 9); x.lineTo(px - 3, py - 14); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(px + 3.5, py - 17); x.quadraticCurveTo(px + 5, py - 13, px + 4.2, py - 11); x.lineTo(px + 3, py - 15); x.closePath(); x.fill();
    x.fillStyle = INK; x.fillRect(px - 0.5, py - 21, 1, 3);
  };

  // ---------------------------------------------------------------- painter's easel
  P.easel = (x, px, py) => {
    x.fillStyle = "#4a3222";
    Art.brush(x, [px - 24, py, px - 2, py - 96], 4.5, { seed: 1, taperStart: 0, taperEnd: 0 });
    Art.brush(x, [px + 24, py, px + 2, py - 96], 4.5, { seed: 2, taperStart: 0, taperEnd: 0 });
    Art.brush(x, [px, py - 90, px + 6, py], 3.5, { seed: 3, taperStart: 0, taperEnd: 0 });
    board(x, px - 30, py - 38, 60, 5, "#4a3222", 9, { nails: false });
    // the canvas: a half-finished painting of the gardens, trees red where they were once blue
    x.beginPath(); x.rect(px - 30, py - 84, 60, 46); paint(x, "#efe4cb", { lw: 2 });
    x.save(); x.beginPath(); x.rect(px - 28, py - 82, 56, 42); x.clip();
    Art.wash(x, px, py - 70, 34, 14, "#d9b6a0", 0.5, 3);
    Art.wash(x, px - 12, py - 60, 12, 10, "#a3322a", 0.7, 4); Art.wash(x, px + 10, py - 58, 10, 9, "#a3322a", 0.6, 5);
    Art.wash(x, px - 4, py - 66, 7, 6, "#5a7fb0", 0.35, 6);
    x.strokeStyle = "rgba(40,28,20,0.8)"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px - 12, py - 42); x.lineTo(px - 12, py - 56); x.moveTo(px + 10, py - 42); x.lineTo(px + 10, py - 52); x.stroke();
    x.strokeStyle = "rgba(90,120,170,0.5)"; x.lineWidth = 0.8; x.beginPath(); x.moveTo(px - 28, py - 48); x.lineTo(px + 28, py - 48); x.stroke();
    x.restore();
    // paint pots & a rag at the foot
    for (const [dx, c] of [[-40, "#a3322a"], [-30, "#c98a3a"], [34, "#3a2a24"]]) { rect(x, px + dx - 4, py - 9, 8, 9, "#8a7a6a", { lw: 1 }); x.fillStyle = c; x.fillRect(px + dx - 3, py - 9, 6, 2.5); }
    x.fillStyle = "#d8c9aa"; Art.blobPath(x, px + 16, py - 3, 7, 3, 7, 10, 0.4); x.fill();
    Art.wash(x, px + 16, py - 3, 4, 2, "#a3322a", 0.6, 8);
  };

  // ---------------------------------------------------------------- garden bench
  P.bench = (x, px, py) => {
    x.strokeStyle = "#1a1412"; x.lineWidth = 3;
    for (const s of [-1, 1]) {
      x.beginPath(); x.moveTo(px + s * 34, py); x.quadraticCurveTo(px + s * 30, py - 12, px + s * 38, py - 20); x.quadraticCurveTo(px + s * 44, py - 32, px + s * 38, py - 48); x.stroke();
      x.lineWidth = 2; x.beginPath(); x.arc(px + s * 40, py - 50, 3, 0, 5.5); x.stroke(); x.lineWidth = 3;
    }
    for (let k = 0; k < 2; k++) board(x, px - 42, py - 24 + k * 5, 84, 4.5, "#5a3e28", k + 20, { nails: false, lw: 1.2 });
    for (let k = 0; k < 2; k++) board(x, px - 40, py - 46 + k * 8, 80, 5, "#5a3e28", k + 30, { nails: false, lw: 1.2 });
  };

  // ---------------------------------------------------------------- forged chain
  P.chain = (x, px, py, p) => {
    const n = (p.len || 6) * 4;
    for (let i = 0; i < n; i++) {
      const cy = py + 8 + i * 10;
      x.strokeStyle = "#0f0b0a"; x.lineWidth = 3;
      x.beginPath(); x.ellipse(px, cy, i % 2 ? 2 : 4.5, 6, 0, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = "rgba(200,190,180,0.3)"; x.lineWidth = 1;
      x.beginPath(); x.ellipse(px - 0.8, cy - 0.8, i % 2 ? 1.4 : 3.6, 5, 0, Math.PI * 1.1, Math.PI * 1.6); x.stroke();
    }
    // a hook at the end
    const ey = py + 8 + n * 10;
    x.strokeStyle = "#0f0b0a"; x.lineWidth = 3; x.beginPath(); x.moveTo(px, ey - 4); x.lineTo(px, ey + 4); x.arc(px + 5, ey + 4, 5, Math.PI, Math.PI * 0.1, true); x.stroke();
  };

  // ---------------------------------------------------------------- iron pipe
  P.pipe = (x, px, py) => {
    const top = py + T * 2 - 4;
    x.beginPath(); x.rect(px - 10, top, 20, 72);
    paint(x, grad(x, px - 10, 0, px + 10, 0, ["#1a1e24", "#4a525c", "#262b32", "#12151a"]), { lw: 2 });
    for (const fy of [top + 20, top + 60]) {
      x.beginPath(); x.rect(px - 14, fy, 28, 8); paint(x, grad(x, 0, fy, 0, fy + 8, ["#4a525c", "#1a1e24"]), { lw: 1.6 });
      rivet(x, px - 10, fy + 4, 1.3); rivet(x, px + 10, fy + 4, 1.3);
    }
    // rust streaks & a slow drip
    Art.wash(x, px + 3, top + 40, 4, 16, "#8a4a26", 0.35, px);
    x.fillStyle = "rgba(120,160,200,0.7)"; x.beginPath(); x.ellipse(px, top + 76, 1.8, 2.6, 0, 0, 7); x.fill();
  };

  // ---------------------------------------------------------------- the cistern basin
  P.basin = (x, px, py, p) => {
    x.beginPath(); x.moveTo(px - 92, py); x.lineTo(px - 84, py - 36); x.lineTo(px + 84, py - 36); x.lineTo(px + 92, py); x.closePath();
    paint(x, grad(x, 0, py - 40, 0, py, ["#5a6878", "#2c3642"]), { lw: 2.8, hatch: [px - 92, py - 20, 184, 20, 3, 0.9, 0.3] });
    // carved river-fish frieze
    x.strokeStyle = "rgba(200,220,240,0.35)"; x.lineWidth = 1.2;
    x.beginPath();
    for (let k = -2; k <= 2; k++) { const fx = px + k * 30, fy = py - 18; x.moveTo(fx - 10, fy); x.quadraticCurveTo(fx, fy - 6, fx + 10, fy); x.quadraticCurveTo(fx, fy + 6, fx - 10, fy); x.moveTo(fx - 10, fy); x.lineTo(fx - 15, fy - 4); x.lineTo(fx - 15, fy + 4); x.closePath(); }
    x.stroke();
    x.strokeStyle = "rgba(0,0,0,0.5)"; x.beginPath(); x.moveTo(px + 50, py - 36); x.lineTo(px + 44, py - 20); x.lineTo(px + 52, py - 8); x.stroke();
    // rim molding and the water (or the dry crack)
    x.beginPath(); x.ellipse(px, py - 38, 88, 11, 0, 0, Math.PI * 2);
    paint(x, grad(x, 0, py - 49, 0, py - 27, ["#8a98a8", "#4a5868"]), { lw: 2.4 });
    x.beginPath(); x.ellipse(px, py - 38, 78, 8, 0, 0, Math.PI * 2);
    if (p.full) {
      paint(x, grad(x, 0, py - 46, 0, py - 30, ["#8fc3ea", "#3f7fc0", "#1f4f86"]), { lw: 1.2 });
      x.strokeStyle = "rgba(230,245,255,0.8)"; x.lineWidth = 1; x.beginPath(); x.ellipse(px - 20, py - 40, 24, 2.5, 0, 0, Math.PI); x.stroke();
    } else {
      paint(x, "#1b2129", { lw: 1.2 });
      x.strokeStyle = "rgba(160,170,180,0.35)"; x.lineWidth = 1; x.beginPath(); x.moveTo(px - 40, py - 38); x.lineTo(px - 10, py - 36); x.lineTo(px + 6, py - 40); x.lineTo(px + 36, py - 37); x.stroke();
    }
  };

  // ---------------------------------------------------------------- floor grate (closed)
  P.grate = (x, px, py, p) => {
    if (p.open) return;
    const w = p.wide ? 120 : 80, x0 = px - w / 2 + (p.wide ? 20 : 0);
    glowAdd(x, x0 + w / 2, py + 6, w * 0.5, "rgba(255,210,150,0.18)");
    x.beginPath(); x.rect(x0, py - 3, w, 10); paint(x, "#0c0a09", { lw: 1.5 });
    x.beginPath(); x.rect(x0 + 2, py - 3, w - 4, 3); paint(x, grad(x, 0, py - 3, 0, py, ["#7a726a", "#3a3530"]), { lw: 1 });
    for (let i = 0; i < 7; i++) {
      const bx = x0 + 6 + (i * (w - 12)) / 6;
      x.beginPath(); x.rect(bx - 2, py - 3, 4, 10); paint(x, grad(x, bx - 2, 0, bx + 2, 0, ["#6a625a", "#2a2622"]), { lw: 0.8 });
    }
    rivet(x, x0 + 3, py - 1.5, 1.2); rivet(x, x0 + w - 3, py - 1.5, 1.2);
    Art.wash(x, x0 + w * 0.3, py + 2, 8, 3, "#8a4a26", 0.4, px);
  };

  // ---------------------------------------------------------------- the torn edge of the page
  P.tornEdge = (x, px, py, p) => {
    const h = p.big ? 280 : 130;
    const r = U.rng(px + 5);
    for (let layer = 0; layer < 3; layer++) {
      const off = layer * 5;
      x.beginPath(); x.moveTo(px + 22, py - 4);
      for (let i = 0; i <= 16; i++) x.lineTo(px - 10 - off + (i % 2) * 12 + r() * 7, py + (i / 16) * h);
      x.lineTo(px + 22, py + h); x.closePath();
      paint(x, layer === 0 ? grad(x, px - 20, 0, px + 22, 0, ["#cfc2a6", "#ece0c6"]) : layer === 1 ? "#dccfb3" : "#bfb194", { lw: layer === 0 ? 2 : 1, line: layer === 0 ? INK : "rgba(21,16,13,0.35)" });
    }
    // paper fibres at the tear
    x.strokeStyle = "rgba(236,225,201,0.9)"; x.lineWidth = 0.8;
    for (let i = 0; i < 26; i++) { const fy = py + r() * h, fx = px - 12 + r() * 10; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx - 4 - r() * 7, fy + (r() - 0.5) * 6); x.stroke(); }
    x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(px + 14, py, 8, h);
  };

  // ---------------------------------------------------------------- water wheel (baked frame + live wheel)
  P.wheel = (x, px, py) => {
    for (const s of [-1, 1]) {
      x.fillStyle = "#2a1c14";
      Art.brush(x, [px + s * 74, py, px + s * 22, py - 142], 11, { seed: 3 + s, taperStart: 0, taperEnd: 0 });
      x.strokeStyle = INK; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(px + s * 74 + 5, py); x.lineTo(px + s * 22 + 5, py - 142); x.stroke();
      board(x, px + s * 48 - 20, py - 70, 40, 8, "#3a2a1e", 40 + s);
    }
    rect(x, px - 14, py - 154, 28, 24, grad(x, 0, py - 154, 0, py - 130, ["#5a4230", "#2a1c14"]), { lw: 2 });
    // the chute that should carry water to the wheel
    x.save(); x.translate(px - 150, py - 252);
    board(x, 0, 0, 124, 14, "#3a302a", 77);
    x.fillStyle = "#1a1210"; for (let k = 0; k < 4; k++) x.fillRect(10 + k * 34, 14, 5, 40 + k * 6);
    x.restore();
  };
  P.wheelLive = (ctx, px, py, p, t) => {
    const a = p.turning ? t * 0.8 : 0.2;
    const cx = px, cy = py - 140;
    ctx.save(); ctx.translate(cx, cy);
    // outer iron-bound rims
    for (const [rr, lw, col] of [[120, 9, "#1a1210"], [120, 3, "#5a4230"], [98, 6, "#1a1210"], [98, 2, "#5a4230"]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 12; i++) {
      const aa = a + (i / 12) * Math.PI * 2;
      // spoke
      ctx.save(); ctx.rotate(aa);
      ctx.fillStyle = "#2a1c14"; ctx.fillRect(14, -3.5, 90, 7);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(14, -3.5, 90, 7);
      ctx.fillStyle = "rgba(255,230,200,0.12)"; ctx.fillRect(14, -3.5, 90, 1.5);
      // paddle board
      ctx.fillStyle = "#4a3624"; ctx.fillRect(100, -12, 30, 24);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.strokeRect(100, -12, 30, 24);
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(100, -4); ctx.lineTo(130, -4); ctx.moveTo(100, 4); ctx.lineTo(130, 4); ctx.stroke();
      if (p.turning) { ctx.fillStyle = "rgba(120,180,240,0.55)"; ctx.fillRect(126, -12, 4, 24); }
      ctx.restore();
    }
    // hub with bolts
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fillStyle = "#2a2220"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    for (let k = 0; k < 6; k++) { const ba = a + (k / 6) * Math.PI * 2; rivet(ctx, Math.cos(ba) * 11, Math.sin(ba) * 11, 1.8); }
    ctx.restore();
    if (p.turning) {
      ctx.save(); ctx.globalAlpha = 0.8;
      const g = ctx.createLinearGradient(0, py - 250, 0, py - 20);
      g.addColorStop(0, "rgba(110,170,230,0.95)"); g.addColorStop(1, "rgba(110,170,230,0.15)");
      ctx.fillStyle = g;
      for (let k = 0; k < 4; k++) { const wx = px - 40 + k * 5 + Math.sin(t * 7 + k) * 2; ctx.fillRect(wx, py - 238, 4, 210); }
      ctx.fillStyle = "rgba(220,240,255,0.7)";
      for (let k = 0; k < 6; k++) { const yy = py - 238 + ((t * 300 + k * 37) % 200); ctx.fillRect(px - 38 + (k % 4) * 5, yy, 1.5, 8); }
      ctx.restore();
      if (Math.random() < 0.4) LD.Particles.add({ kind: "water", x: px - 30 + U.rand(-10, 10), y: py - 30, vx: U.rand(-60, 60), vy: -U.rand(40, 140), color: "#8fc3ea", size: 2, life: 0.6 });
    }
  };

  // ================================================================ special tiles
  const TA = (LD.TileArt = {});
  // breakable wall: a plastered paper patch between timbers — cracked, a subtle tell
  TA.B = (x, px, py, pal) => {
    rect(x, px, py, T, T, grad(x, 0, py, 0, py + T, [pal.top || pal.solid, pal.solid]), { line: false });
    x.fillStyle = "rgba(236,225,201,0.16)"; x.fillRect(px + 3, py + 3, T - 6, T - 6);
    x.strokeStyle = "rgba(0,0,0,0.35)"; x.lineWidth = 1; x.strokeRect(px + 3, py + 3, T - 6, T - 6);
    // paper patches pasted over a hole
    x.fillStyle = "rgba(236,225,201,0.28)";
    x.save(); x.translate(px + 20, py + 18); x.rotate(0.2); x.fillRect(-9, -6, 18, 12); x.restore();
    writing(x, px + 12, py + 15, 14, 2, 3, "rgba(236,225,201,0.3)");
    x.strokeStyle = "rgba(236,225,201,0.45)"; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(px + 6, py + 4); x.lineTo(px + 16, py + 16); x.lineTo(px + 11, py + 26); x.lineTo(px + 15, py + 36); x.moveTo(px + 16, py + 16); x.lineTo(px + 30, py + 20); x.lineTo(px + 36, py + 14); x.stroke();
    x.strokeStyle = INK; x.lineWidth = 2.4; x.strokeRect(px + 1, py + 1, T - 2, T - 2);
  };
  // grate that only yields from below: framed iron bars, rivets, rust and light seeping through
  TA.H = (x, px, py) => {
    rect(x, px, py, T, T, "#0e0c0b", { line: false });
    glowAdd(x, px + T / 2, py + T / 2, 30, "rgba(255,210,150,0.2)");
    for (let k = 0; k < 4; k++) {
      const bx = px + 4 + k * 10;
      x.beginPath(); x.rect(bx, py, 4, T); paint(x, grad(x, bx, 0, bx + 4, 0, ["#7a726a", "#3a3530"]), { lw: 0.8 });
    }
    for (const by of [py + 3, py + T - 8]) { x.beginPath(); x.rect(px, by, T, 5); paint(x, grad(x, 0, by, 0, by + 5, ["#6a625a", "#2a2622"]), { lw: 1 }); for (let k = 0; k < 4; k++) rivet(x, px + 6 + k * 10, by + 2.5, 1.1); }
    Art.wash(x, px + 10, py + 16, 4, 6, "#8a4a26", 0.45, px);
    Art.wash(x, px + 30, py + 26, 3, 7, "#8a4a26", 0.4, py);
  };
  // latched door: planks, iron bands with rivets, a heavy latch on the top tile
  TA.D = (x, px, py, pal, grid, tx, ty) => {
    for (let k = 0; k < 3; k++) board(x, px + 2 + k * 12, py, 12, T, "#3a2618", tx * 7 + ty + k, { nails: false, lw: 1.2 });
    x.strokeStyle = INK; x.lineWidth = 2.4; x.strokeRect(px + 2, py, T - 4, T);
    x.beginPath(); x.rect(px + 2, py + 14, T - 4, 6); paint(x, grad(x, 0, py + 14, 0, py + 20, ["#5a524c", "#1a1816"]), { lw: 1 });
    for (let k = 0; k < 3; k++) rivet(x, px + 8 + k * 12, py + 17, 1.2);
    if (ty > 0 && grid[ty - 1][tx] !== "D") {
      x.beginPath(); x.rect(px + 6, py + 26, 26, 6); paint(x, "#2a2622", { lw: 1.2 });
      x.strokeStyle = "#2a2622"; x.lineWidth = 3; x.beginPath(); x.arc(px + 30, py + 29, 5, -1.2, 1.2); x.stroke();
    }
  };
  // wheel gate (live): an iron portcullis with spiked teeth
  TA.G = (ctx, tx, ty, W) => {
    const px = tx * T, py = ty * T;
    const top = ty === 0 || W.grid[ty - 1][tx] !== "G";
    const bottom = ty === W.h - 1 || W.grid[ty + 1][tx] !== "G";
    for (let i = 0; i < 3; i++) {
      const bx = px + 5 + i * 12;
      ctx.fillStyle = grad(ctx, bx, 0, bx + 6, 0, ["#4a4440", "#1a1614"]); ctx.fillRect(bx, py, 6, T);
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(bx, py, 6, T);
      if (bottom) { ctx.fillStyle = "#1a1614"; ctx.beginPath(); ctx.moveTo(bx, py + T); ctx.lineTo(bx + 3, py + T + 8); ctx.lineTo(bx + 6, py + T); ctx.fill(); }
    }
    ctx.fillStyle = grad(ctx, 0, py + 16, 0, py + 22, ["#5a524c", "#1a1816"]); ctx.fillRect(px, py + 16, T, 6);
    for (let k = 0; k < 3; k++) rivet(ctx, px + 8 + k * 12, py + 19, 1.2);
    if (top) {
      ctx.fillStyle = "#3a302a"; ctx.fillRect(px - 6, py - 10, T + 12, 12);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(px - 6, py - 10, T + 12, 12);
      ctx.strokeStyle = "#1a1614"; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(px + T / 2, py - 14 - i * 7, i % 2 ? 1.5 : 3, 4, 0, 0, 7); ctx.stroke(); }
    }
  };
  // creased veil (live): a pale membrane folded into facets, with a folded-corner glyph
  TA.V = (ctx, tx, ty, t, W) => {
    const px = tx * T, py = ty * T;
    const fx = W.veilFx.get(tx + "," + ty);
    const open = fx ? U.clamp(1 - (t - fx) / 0.9, 0, 1) : 0;
    const top = ty === 0 || W.grid[ty - 1][tx] !== "V";
    ctx.save();
    const sq = 1 - open * 0.85;
    ctx.translate(px + T / 2, py); ctx.scale(sq, 1); ctx.translate(-(px + T / 2), -py);
    // accordion facets: alternating lit and shaded panels
    const n = 4;
    for (let i = 0; i < n; i++) {
      const y0 = py + (i * T) / n, y1 = py + ((i + 1) * T) / n, lit = i % 2 === 0;
      ctx.beginPath(); ctx.moveTo(px + 4, y0); ctx.lineTo(px + T - 4, lit ? y0 + 3 : y0); ctx.lineTo(px + T - 4, lit ? y1 : y1 + 0); ctx.lineTo(px + 4, lit ? y1 - 3 : y1); ctx.closePath();
      ctx.fillStyle = lit ? "rgba(246,239,222,0.88)" : "rgba(214,202,176,0.88)"; ctx.fill();
      ctx.strokeStyle = "rgba(21,16,13,0.45)"; ctx.lineWidth = 1; ctx.stroke();
    }
    // faint handwriting bleeding through the paper
    ctx.globalAlpha *= 0.6; writing(ctx, px + 8, py + 8, T - 16, 4, 8, "rgba(21,16,13,0.35)"); ctx.globalAlpha /= 0.6;
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px + 4, py); ctx.lineTo(px + 4, py + T); ctx.moveTo(px + T - 4, py); ctx.lineTo(px + T - 4, py + T); ctx.stroke();
    if (top) {
      const s = 0.6 + Math.sin(t * 3) * 0.2;
      glowAdd(ctx, px + T / 2, py + 14, 26, "rgba(255,245,220," + 0.3 * s + ")");
      ctx.fillStyle = "rgba(246,239,222,0.95)"; poly(ctx, [px + 10, py + 8, px + 30, py + 8, px + 30, py + 28]); ctx.fill();
      ctx.fillStyle = "rgba(21,16,13," + s + ")"; poly(ctx, [px + 10, py + 8, px + 30, py + 28, px + 10, py + 28]); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(px + 10, py + 8, 20, 20);
    }
    ctx.restore();
  };
})();
