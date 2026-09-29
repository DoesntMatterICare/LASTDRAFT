// Detailed drawings for interactive objects: the Bindery door, the weapon-drawing desk,
// the standing-bookmark station, ink wells, hidden ink caches, lore fragments and the
// Water Pigment. Behaviour lives in interactables.js; only the drawing is replaced here.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, P = LD.Particles;
  const INK = Art.INK;
  const O = LD.Objs;

  const grad = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  function paint(ctx, fill, o = {}) {
    ctx.fillStyle = fill; ctx.fill();
    if (o.line !== false) { ctx.strokeStyle = o.line || INK; ctx.lineWidth = o.lw || 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
    if (o.hatch) {
      const [hx, hy, hw, hh, gap, ang, a] = o.hatch;
      ctx.save(); ctx.clip(); Art.hatch(ctx, hx, hy, hw, hh, gap || 3, ang || 0.9, o.hatchCol || INK, a || 0.3, 0.8, hx | 0); ctx.restore();
      ctx.beginPath();
    }
  }
  const rect = (ctx, x, y, w, h, fill, o) => { ctx.beginPath(); ctx.rect(x, y, w, h); paint(ctx, fill, o); };
  const glowAdd = (ctx, x, y, r, col) => { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, y, r, col); ctx.restore(); };
  const rivet = (ctx, x, y, r = 1.4) => { ctx.fillStyle = "#15100d"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(255,240,220,0.35)"; ctx.fillRect(x - r * 0.5, y - r * 0.6, r * 0.6, r * 0.6); };
  function writing(ctx, x, y, w, rows, gap = 4, col = "rgba(21,16,13,0.4)") {
    ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = 0; k < rows; k++) { let px = x; const yy = y + k * gap; while (px < x + w) { const len = 2 + U.hash(px * 3.1 + yy) * 6; ctx.moveTo(px, yy); ctx.lineTo(Math.min(x + w, px + len), yy + (U.hash(px + yy) - 0.5)); px += len + 1.5; } }
    ctx.stroke();
  }
  const PAPER = ["#f5ecda", "#e2d5b8", "#bba98a"];

  // ---------------------------------------------------------------- interior door
  O.Door.prototype.draw = function (ctx) {
    if (!this.d.inner) return;
    const x = this.x, y = this.y;
    // stone surround with voussoirs
    ctx.beginPath(); ctx.moveTo(x - 36, y); ctx.lineTo(x - 36, y - 88); ctx.quadraticCurveTo(x, y - 128, x + 36, y - 88); ctx.lineTo(x + 36, y); ctx.closePath();
    paint(ctx, grad(ctx, 0, y - 128, 0, y, ["#6a5a50", "#3a302c"]), { lw: 2.6 });
    ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1;
    for (let k = 0; k < 11; k++) { const a = Math.PI + (k / 10) * Math.PI; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 28, y - 86 + Math.sin(a) * 30); ctx.lineTo(x + Math.cos(a) * 36, y - 86 + Math.sin(a) * 40); ctx.stroke(); }
    // plank door with iron strap hinges and a ring pull
    ctx.beginPath(); ctx.moveTo(x - 27, y); ctx.lineTo(x - 27, y - 84); ctx.quadraticCurveTo(x, y - 114, x + 27, y - 84); ctx.lineTo(x + 27, y); ctx.closePath();
    paint(ctx, grad(ctx, x - 27, 0, x + 27, 0, ["#2a170e", "#4a2c1a", "#2a170e"]), { lw: 2 });
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1.2;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 10, y - 2); ctx.lineTo(x + k * 10, y - 98 + Math.abs(k) * 6); ctx.stroke(); }
    for (const hy of [y - 70, y - 24]) {
      ctx.fillStyle = "#1a1614"; ctx.beginPath(); ctx.moveTo(x - 27, hy - 3); ctx.lineTo(x + 6, hy - 2); ctx.quadraticCurveTo(x + 12, hy, x + 6, hy + 2); ctx.lineTo(x - 27, hy + 3); ctx.fill();
      rivet(ctx, x - 20, hy); rivet(ctx, x - 8, hy); rivet(ctx, x + 4, hy);
    }
    ctx.strokeStyle = "#c9a14a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 16, y - 44, 4.5, 0, 7); ctx.stroke();
    rivet(ctx, x + 16, y - 49, 1.6);
    // warm light spilling under the door
    glowAdd(ctx, x, y - 2, 34, "rgba(255,190,120,0.3)");
  };

  // ---------------------------------------------------------------- stations
  O.Station.prototype.draw = function (ctx, G) {
    const x = this.x, y = this.y, t = this.t;
    if (this.d.desk) {
      // a heavy scrivener's desk: slanted top, drawers with brass pulls, turned legs
      for (const lx of [-62, 56]) {
        ctx.beginPath(); ctx.moveTo(x + lx, y); ctx.lineTo(x + lx, y - 40); ctx.lineTo(x + lx + 7, y - 40); ctx.lineTo(x + lx + 7, y); ctx.closePath();
        paint(ctx, grad(ctx, x + lx, 0, x + lx + 7, 0, ["#5a3e28", "#2a1a10"]), { lw: 1.6 });
        for (const yy of [y - 30, y - 12]) { ctx.fillStyle = "#1a100a"; ctx.beginPath(); ctx.ellipse(x + lx + 3.5, yy, 5, 2.2, 0, 0, 7); ctx.fill(); }
      }
      rect(ctx, x - 66, y - 44, 132, 22, grad(ctx, 0, y - 44, 0, y - 22, ["#6a4a30", "#3e2a1c"]), { lw: 2.2 });
      for (const dx of [-58, -12, 34]) {
        rect(ctx, x + dx, y - 40, 40, 14, grad(ctx, 0, y - 40, 0, y - 26, ["#5a3e28", "#3a2618"]), { lw: 1.2 });
        ctx.fillStyle = "#c9a14a"; ctx.beginPath(); ctx.ellipse(x + dx + 20, y - 33, 3.5, 1.6, 0, 0, 7); ctx.fill();
      }
      poly(ctx, [x - 72, y - 46, x + 72, y - 58, x + 76, y - 46, x - 74, y - 40]);
      paint(ctx, grad(ctx, 0, y - 58, 0, y - 40, ["#7a5a3c", "#4a3222"]), { lw: 2.4 });
      // the drawing page, weighted down, with the current weapon sketched on it
      ctx.save(); ctx.translate(x - 12, y - 56); ctx.rotate(-0.08);
      rect(ctx, -34, -6, 68, 14, grad(ctx, 0, -6, 0, 8, PAPER), { lw: 1 });
      ctx.strokeStyle = "rgba(90,120,170,0.3)"; ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(-32, -2 + k * 4); ctx.lineTo(32, -2 + k * 4); } ctx.stroke();
      if (G.S.weapon.strokes) { ctx.save(); ctx.translate(-26, 1); ctx.scale(1, 0.28); LD.drawWeaponStrokes(ctx, G.S.weapon.strokes, 50, G.S.weapon.element, Art.boil); ctx.restore(); }
      ctx.restore();
      // stack of books, ink bottle, quill and a candle
      for (let k = 0; k < 3; k++) rect(ctx, x + 38 + k, y - 66 - k * 7, 26 - k * 2, 7, ["#6e2a22", "#3a4a6a", "#7a5a30"][k], { lw: 1.2 });
      ctx.beginPath(); ctx.moveTo(x + 26, y - 57); ctx.lineTo(x + 24, y - 68); ctx.quadraticCurveTo(x + 31, y - 72, x + 38, y - 68); ctx.lineTo(x + 36, y - 58); ctx.closePath();
      paint(ctx, grad(ctx, x + 24, 0, x + 38, 0, ["#0c0f18", "#243048", "#0a0c12"]), { lw: 1.4 });
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(x + 27, y - 67, 1.4, 7);
      ctx.fillStyle = "#efe6d2"; Art.brush(ctx, [x + 31, y - 70, x + 40, y - 92, x + 50, y - 110], 5, { seed: 2, taperStart: 0.2, taperEnd: 0.6 });
      ctx.strokeStyle = "rgba(21,16,13,0.5)"; ctx.lineWidth = 0.7; ctx.beginPath(); for (let k = 0; k < 7; k++) { const px2 = U.lerp(x + 34, x + 49, k / 7), py2 = U.lerp(y - 76, y - 108, k / 7); ctx.moveTo(px2, py2); ctx.lineTo(px2 - 4, py2 + 1); } ctx.stroke();
      rect(ctx, x - 62, y - 62, 6, 12, grad(ctx, x - 62, 0, x - 56, 0, ["#f4ecda", "#cfc0a0"]), { lw: 1 });
      const f = 0.8 + U.noise1(t * 9) * 0.4;
      ctx.fillStyle = "#ffd28a"; ctx.beginPath(); ctx.ellipse(x - 59, y - 66 - f, 2, 4.4 * f, 0, 0, 7); ctx.fill();
      glowAdd(ctx, x - 59, y - 66, 70 * f, "rgba(255,180,100,0.35)");
      glowAdd(ctx, x, y - 60, 90 + Math.sin(t * 2) * 6, "rgba(255,190,110,0.2)");
    } else {
      // a lectern holding an open book, with a giant silk bookmark standing in it
      ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 8, y - 12); ctx.lineTo(x + 8, y - 12); ctx.lineTo(x + 22, y); ctx.closePath();
      paint(ctx, grad(ctx, 0, y - 12, 0, y, ["#4a3222", "#2a1a10"]), { lw: 1.8 });
      rect(ctx, x - 6, y - 58, 12, 48, grad(ctx, x - 6, 0, x + 6, 0, ["#5a3e28", "#2a1a10"]), { lw: 1.8 });
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 2, y - 54); ctx.lineTo(x - 2, y - 14); ctx.stroke();
      poly(ctx, [x - 30, y - 56, x + 30, y - 64, x + 32, y - 58, x - 30, y - 50]);
      paint(ctx, "#3a2618", { lw: 1.6 });
      // open pages with handwriting
      ctx.beginPath(); ctx.moveTo(x - 38, y - 58); ctx.quadraticCurveTo(x - 18, y - 70, x, y - 62); ctx.quadraticCurveTo(x + 18, y - 72, x + 38, y - 64); ctx.lineTo(x + 36, y - 58); ctx.quadraticCurveTo(x + 18, y - 64, x, y - 56); ctx.quadraticCurveTo(x - 18, y - 62, x - 36, y - 52); ctx.closePath();
      paint(ctx, grad(ctx, 0, y - 72, 0, y - 52, PAPER), { lw: 1.8 });
      writing(ctx, x - 32, y - 62, 26, 2, 3.2);
      writing(ctx, x + 6, y - 66, 26, 2, 3.2);
      // the bookmark: a tall ribbon of crimson silk with a tasselled end, swaying
      const sway = Math.sin(t * 1.5) * 3;
      ctx.beginPath(); ctx.moveTo(x - 5, y - 60); ctx.bezierCurveTo(x - 6, y - 100, x - 8 + sway, y - 130, x - 7 + sway, y - 152); ctx.lineTo(x + 7 + sway, y - 152); ctx.bezierCurveTo(x + 8 + sway, y - 130, x + 6, y - 100, x + 5, y - 60); ctx.closePath();
      paint(ctx, grad(ctx, x - 7, 0, x + 7, 0, ["#6a1a16", "#a8302a", "#5a1410"]), { lw: 1.8 });
      ctx.strokeStyle = "rgba(230,190,110,0.7)"; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(x - 3 + sway * 0.5, y - 140); ctx.lineTo(x - 3, y - 70); ctx.moveTo(x + 3 + sway * 0.5, y - 140); ctx.lineTo(x + 3, y - 70); ctx.stroke();
      ctx.fillStyle = "#15100d"; poly(ctx, [x - 7 + sway, y - 152, x + sway, y - 142, x + 7 + sway, y - 152]); ctx.fill();
      ctx.fillStyle = "#c9a14a"; ctx.beginPath(); ctx.arc(x + sway, y - 110, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = "#c9a14a"; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(x + sway, y - 107); ctx.lineTo(x + sway + k * 1.5, y - 96); } ctx.stroke();
      glowAdd(ctx, x, y - 90, 80, "rgba(255,200,120,0.22)");
    }
    if (G.S.station && G.S.station.id === this.d.id) Art.text(ctx, "✓ saved here", x, y + 22, 16, { align: "center", color: "rgba(236,225,201,0.6)" });
  };

  // ---------------------------------------------------------------- ink well
  O.InkWell.prototype.draw = function (ctx) {
    const x = this.x, y = this.y, t = this.t;
    // a carved stone font on a stepped base
    rect(ctx, x - 26, y - 6, 52, 6, grad(ctx, 0, y - 6, 0, y, ["#5a524e", "#2e2826"]), { lw: 1.8 });
    ctx.beginPath(); ctx.moveTo(x - 10, y - 6); ctx.lineTo(x - 7, y - 22); ctx.lineTo(x + 7, y - 22); ctx.lineTo(x + 10, y - 6); ctx.closePath();
    paint(ctx, grad(ctx, x - 10, 0, x + 10, 0, ["#3a3230", "#6a605a", "#2a2422"]), { lw: 1.8 });
    ctx.beginPath(); ctx.moveTo(x - 26, y - 22); ctx.quadraticCurveTo(x - 30, y - 36, x - 18, y - 44); ctx.lineTo(x + 18, y - 44); ctx.quadraticCurveTo(x + 30, y - 36, x + 26, y - 22); ctx.closePath();
    paint(ctx, grad(ctx, 0, y - 44, 0, y - 22, ["#6a605a", "#3a3230"]), { lw: 2.2, hatch: [x - 30, y - 32, 60, 10, 2.6, 0.9, 0.3] });
    // carved scroll band and an engraved quill
    ctx.strokeStyle = "rgba(210,200,190,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(x + k * 9 - 3, y - 33); ctx.quadraticCurveTo(x + k * 9, y - 38, x + k * 9 + 3, y - 33); } ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 45, 19, 5, 0, 0, Math.PI * 2);
    paint(ctx, grad(ctx, 0, y - 50, 0, y - 40, ["#8a807a", "#4a403c"]), { lw: 1.8 });
    if (this.full) {
      ctx.beginPath(); ctx.ellipse(x, y - 45, 14, 3.4, 0, 0, Math.PI * 2);
      paint(ctx, grad(ctx, 0, y - 48, 0, y - 42, ["#1e2a4a", "#070a14"]), { lw: 1 });
      const sh = 0.5 + Math.sin(t * 3) * 0.3;
      ctx.strokeStyle = "rgba(140,170,240," + sh + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x - 3, y - 45.5, 6, 1.2, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      glowAdd(ctx, x, y - 46, 26, "rgba(90,130,230,0.25)");
      if (Math.random() < 0.03) P.add({ kind: "spark", x: x + U.rand(-10, 10), y: y - 48, vy: -30, g: 0, color: "rgba(140,170,240,0.8)", size: 3, life: 0.8 });
    } else {
      ctx.beginPath(); ctx.ellipse(x, y - 45, 14, 3.4, 0, 0, Math.PI * 2); paint(ctx, "#1a1614", { lw: 1 });
      ctx.strokeStyle = "rgba(10,8,8,0.8)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 8, y - 45); ctx.lineTo(x - 2, y - 44); ctx.lineTo(x + 4, y - 46); ctx.lineTo(x + 9, y - 44.5); ctx.stroke();
      Art.text(ctx, "dry", x, y - 12, 13, { align: "center", color: "rgba(236,225,201,0.45)" });
    }
  };

  // ---------------------------------------------------------------- hidden ink cache
  O.Cache.prototype.draw = function (ctx) {
    const x = this.x, y = this.y + Math.sin(this.t * 2) * 1.5;
    glowAdd(ctx, x, y - 16, 48, "rgba(110,150,240,0.35)");
    // a little wooden tray holding corked ink bottles, bound with a red ribbon
    rect(ctx, x - 20, y - 6, 40, 6, grad(ctx, 0, y - 6, 0, y, ["#6a4a30", "#3a2618"]), { lw: 1.6 });
    [[-12, 22, "tall"], [0, 26, "round"], [12, 20, "tall"]].forEach(([dx, h, k], i) => {
      const bx = x + dx;
      ctx.beginPath();
      if (k === "round") { ctx.moveTo(bx - 6, y - 6); ctx.quadraticCurveTo(bx - 8, y - h * 0.7, bx - 2.5, y - h); ctx.lineTo(bx + 2.5, y - h); ctx.quadraticCurveTo(bx + 8, y - h * 0.7, bx + 6, y - 6); }
      else { ctx.moveTo(bx - 5, y - 6); ctx.lineTo(bx - 5, y - h * 0.75); ctx.lineTo(bx - 2.5, y - h); ctx.lineTo(bx + 2.5, y - h); ctx.lineTo(bx + 5, y - h * 0.75); ctx.lineTo(bx + 5, y - 6); }
      ctx.closePath();
      paint(ctx, grad(ctx, bx - 6, 0, bx + 6, 0, ["#0c1226", "#26356a", "#0a0e1c"]), { lw: 1.3 });
      ctx.fillStyle = "rgba(200,220,255,0.5)"; ctx.fillRect(bx - 3, y - h * 0.8, 1.4, h * 0.45);
      rect(ctx, bx - 2.5, y - h - 4, 5, 4.5, "#8a6a44", { lw: 0.8 });
    });
    ctx.strokeStyle = "#a8302a"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x - 18, y - 11); ctx.quadraticCurveTo(x, y - 14, x + 18, y - 11); ctx.stroke();
    ctx.fillStyle = "#a8302a"; ctx.beginPath(); ctx.ellipse(x - 3, y - 13, 3.5, 2, -0.4, 0, 7); ctx.ellipse(x + 3, y - 13, 3.5, 2, 0.4, 0, 7); ctx.fill();
    Art.brush(ctx, [x, y - 12, x - 2, y - 4], 2, { seed: 1, color: "#a8302a" }); Art.brush(ctx, [x, y - 12, x + 3, y - 5], 2, { seed: 2, color: "#a8302a" });
    if (Math.random() < 0.05) P.add({ kind: "spark", x: x + U.rand(-14, 14), y: y - U.rand(10, 40), vy: -20, g: 0, color: "rgba(140,170,240,0.8)", size: 3, life: 1 });
  };

  // ---------------------------------------------------------------- lore fragments
  O.Lore.prototype.draw = function (ctx, G) {
    const x = this.x, y = this.y, read = G.S.lore.includes(this.id);
    ctx.save();
    if (this.kind === "board") {
      // a notice board with a little roof, pinned papers, one torn
      for (const px of [x - 38, x + 33]) rect(ctx, px, y - 84, 5, 84, grad(ctx, px, 0, px + 5, 0, ["#4a3222", "#1a100a"]), { lw: 1.4 });
      rect(ctx, x - 44, y - 104, 88, 58, grad(ctx, 0, y - 104, 0, y - 46, ["#5a4230", "#3a2818"]), { lw: 2.4, hatch: [x - 44, y - 64, 88, 18, 3, 0.9, 0.25] });
      poly(ctx, [x - 52, y - 104, x, y - 122, x + 52, y - 104]); paint(ctx, grad(ctx, 0, y - 122, 0, y - 104, ["#3a2e34", "#1a1418"]), { lw: 2 });
      const papers = [[-36, -98, 26, 34, -0.05], [-6, -96, 22, 22, 0.08], [18, -94, 20, 30, -0.1], [-4, -70, 26, 18, 0.04]];
      papers.forEach(([dx, dy, w, h, rot], i) => {
        ctx.save(); ctx.translate(x + dx + w / 2, y + dy + h / 2); ctx.rotate(rot);
        ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2 - (i === 2 ? 6 : 0)); ctx.lineTo(w / 2 - 6, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath();
        paint(ctx, grad(ctx, 0, -h / 2, 0, h / 2, PAPER), { lw: 1 });
        writing(ctx, -w / 2 + 3, -h / 2 + 5, w - 6, Math.floor(h / 5), 4);
        ctx.fillStyle = "#8e2a22"; ctx.beginPath(); ctx.arc(0, -h / 2 + 2, 1.8, 0, 7); ctx.fill();
        ctx.restore();
      });
      // a struck-through line on the main notice
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 33, y - 80); ctx.lineTo(x - 14, y - 81); ctx.stroke();
    } else if (this.kind === "mural") {
      // a framed river mural; pale ghost when dry, luminous watercolour once the blue returns
      rect(ctx, x - 56, y - 136, 112, 80, "rgba(40,48,58,0.8)", { lw: 3, line: "#141a20" });
      ctx.strokeStyle = "rgba(200,190,160,0.35)"; ctx.lineWidth = 2; ctx.strokeRect(x - 50, y - 130, 100, 68);
      const wet = G.S.flags.pigment_water;
      if (wet) { Art.wash(ctx, x, y - 96, 46, 26, "#4f8cc8", 0.65, 3); Art.wash(ctx, x - 16, y - 88, 22, 10, "#8fc3ea", 0.5, 4); }
      ctx.strokeStyle = wet ? "rgba(225,240,255,0.95)" : "rgba(220,225,230,0.4)"; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) { const fx = x - 26 + k * 26, fy = y - 104 + (k % 2) * 12; ctx.moveTo(fx - 10, fy); ctx.quadraticCurveTo(fx, fy - 7, fx + 10, fy); ctx.quadraticCurveTo(fx, fy + 7, fx - 10, fy); ctx.moveTo(fx - 10, fy); ctx.lineTo(fx - 16, fy - 5); ctx.lineTo(fx - 16, fy + 5); ctx.closePath(); }
      ctx.moveTo(x - 46, y - 80); for (let k = 0; k <= 10; k++) ctx.lineTo(x - 46 + k * 9.2, y - 80 + Math.sin(k + this.t * (wet ? 2 : 0)) * 4);
      ctx.stroke();
      if (wet) glowAdd(ctx, x, y - 96, 90, "rgba(90,160,240,0.25)");
      // a child's handwriting beneath
      writing(ctx, x - 40, y - 48, 80, 2, 5, "rgba(210,215,225,0.4)");
    } else if (this.kind === "prints") {
      // black fingerprints, each with its whorl, and a drip
      for (let k = 0; k < 5; k++) {
        const fx = x - 22 + k * 10, fy = y - 44 - (k % 2) * 7;
        ctx.fillStyle = "rgba(10,8,7,0.9)"; ctx.beginPath(); ctx.ellipse(fx, fy, 3.8, 5.4, 0.25, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(90,100,120,0.35)"; ctx.lineWidth = 0.6;
        for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.ellipse(fx, fy, r * 1.1, r * 1.5, 0.25, 0, 7); ctx.stroke(); }
      }
      Art.splat(ctx, x + 24, y - 40, 5, "rgba(10,8,7,0.85)", 4, 5);
      Art.brush(ctx, [x + 24, y - 36, x + 25, y - 24], 2, { seed: 4, color: "rgba(10,8,7,0.8)", taperStart: 0, taperEnd: 0.9 });
    } else if (this.kind === "smear") {
      ctx.fillStyle = "rgba(10,8,7,0.85)";
      Art.brush(ctx, [x - 44, y - 3, x - 10, y - 8, x + 34, y - 3], 5, { seed: 2 });
      Art.brush(ctx, [x - 38, y - 14, x + 10, y - 19, x + 44, y - 12], 3, { seed: 3 });
      Art.splat(ctx, x + 40, y - 8, 4, "rgba(10,8,7,0.8)", 5, 5);
      for (let k = 0; k < 3; k++) Art.brush(ctx, [x - 30 + k * 26, y - 6, x - 29 + k * 26, y + 2], 1.6, { seed: k, color: "rgba(10,8,7,0.7)", taperStart: 0, taperEnd: 0.9 });
    } else {
      // a pinned, folded note with handwriting and a crossed-out line
      ctx.translate(x, y - 26); ctx.rotate(Math.sin(this.t) * 0.05 - 0.1);
      ctx.beginPath(); ctx.moveTo(-12, -15); ctx.lineTo(12, -16); ctx.lineTo(13, 10); ctx.lineTo(6, 14); ctx.lineTo(-12, 13); ctx.closePath();
      paint(ctx, grad(ctx, 0, -16, 0, 14, PAPER), { lw: 1.4 });
      ctx.fillStyle = "#cbbd9e"; poly(ctx, [13, 10, 6, 14, 7, 9]); ctx.fill();
      ctx.strokeStyle = "rgba(21,16,13,0.25)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-12, -1); ctx.lineTo(13, -2); ctx.stroke();
      writing(ctx, -9, -9, 18, 5, 4);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-9, 3); ctx.lineTo(4, 2.6); ctx.stroke();
      ctx.fillStyle = "#8e2a22"; ctx.beginPath(); ctx.arc(0, -14, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,220,200,0.6)"; ctx.fillRect(-0.8, -15.2, 1, 1);
    }
    ctx.restore();
    if (!read && Math.random() < 0.03) P.add({ kind: "spark", x: x + U.rand(-16, 16), y: y - U.rand(20, 60), vy: -15, g: 0, color: "rgba(255,230,180,0.8)", size: 3, life: 1 });
  };

  // ---------------------------------------------------------------- the Water Pigment
  O.Pigment.prototype.draw = function (ctx, G) {
    if (!this.canInteract(G)) return;
    const x = this.x, t = this.t, y = this.y - 112 + Math.sin(t * 2) * 6;
    glowAdd(ctx, x, y, 130, "rgba(70,140,230,0.45)");
    // orbiting rings of water
    ctx.save(); ctx.translate(x, y);
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.rotate(t * (0.6 + k * 0.3) + k * 2); ctx.scale(1, 0.35);
      ctx.strokeStyle = "rgba(160,210,255," + (0.55 - k * 0.12) + ")"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 26 + k * 7, 0, Math.PI * 1.5); ctx.stroke();
      ctx.restore();
    }
    // a bead of pure blue pigment in a watercolour bloom
    const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 18);
    g.addColorStop(0, "#e6f4ff"); g.addColorStop(0.35, "#6aa8e0"); g.addColorStop(1, "#1f4f86");
    ctx.fillStyle = g; Art.blobPath(ctx, 0, 0, 17, 17, Math.floor(t * 6), 14, 0.14); ctx.fill();
    ctx.strokeStyle = "rgba(15,30,60,0.8)"; ctx.lineWidth = 1.6; ctx.stroke();
    Art.elementGlyph(ctx, "water", 0, 1, 8, "rgba(240,248,255,0.95)");
    ctx.restore();
    if (Math.random() < 0.35) P.add({ kind: "water", x: x + U.rand(-14, 14), y: y + 12, vy: 60, g: 300, color: "#6aa8e0", size: 2, life: 0.6 });
  };
})();
