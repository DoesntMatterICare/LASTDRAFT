// Detailed NPC art: Old Quillon the bookbinder, Lampwick the lamplighter, and Pell the
// half-drawn painter. Replaces the NPC drawing routine (sprites, if provided, still win).
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art;
  const INK = Art.INK;

  const grad = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };
  // fill, ink, then hatch inside (hatching replaces the current path, so it goes last)
  function paint(ctx, fill, o = {}) {
    ctx.fillStyle = fill; ctx.fill();
    if (o.line !== false) { ctx.strokeStyle = o.line || INK; ctx.lineWidth = o.lw || 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); ctx.setLineDash([]); }
    if (o.hatch) {
      const [hx, hy, hw, hh, gap, ang, a] = o.hatch;
      ctx.save(); ctx.clip(); Art.hatch(ctx, hx, hy, hw, hh, gap || 3, ang || 0.9, o.hatchCol || INK, a || 0.3, 0.8, hx | 0); ctx.restore();
      ctx.beginPath();
    }
  }
  const shadow = (ctx, w) => { ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0, 0, w, w * 0.18, 0, 0, Math.PI * 2); ctx.fill(); };

  // ================================================================ OLD QUILLON
  function quillon(ctx, G, t, br) {
    shadow(ctx, 20);
    // half-erased lower body: the coat fades to bare paper, outlined in a dotted ghost line
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-16, -40); ctx.quadraticCurveTo(-10, -66 + br, 8, -64 + br); ctx.quadraticCurveTo(20, -58, 19, -40); ctx.lineTo(21, 0); ctx.closePath();
    const coat = ctx.createLinearGradient(0, -66, 0, 0);
    coat.addColorStop(0, "#5a4432"); coat.addColorStop(0.55, "#3e2e22"); coat.addColorStop(0.72, "rgba(62,46,34,0.35)"); coat.addColorStop(1, "rgba(236,225,201,0.25)");
    ctx.fillStyle = coat; ctx.fill();
    ctx.save(); ctx.clip(); Art.hatch(ctx, -18, -40, 16, 22, 2.6, 0.9, INK, 0.3, 0.8, 3); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-16, -22); ctx.lineTo(-16, -40); ctx.quadraticCurveTo(-10, -66 + br, 8, -64 + br); ctx.quadraticCurveTo(20, -58, 19, -40); ctx.lineTo(20, -22);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-16, -22); ctx.lineTo(-18, 0); ctx.moveTo(20, -22); ctx.lineTo(21, 0); ctx.moveTo(-18, 0); ctx.lineTo(21, 0); ctx.stroke();
    ctx.setLineDash([]);
    // eraser crumbs where his feet should be
    ctx.fillStyle = "rgba(200,190,170,0.8)";
    for (let k = 0; k < 6; k++) ctx.fillRect(-12 + k * 5 + U.hash(k) * 3, -3 - U.hash(k + 4) * 4, 2, 1.4);
    // leather apron with a pocket of tools
    ctx.beginPath(); ctx.moveTo(-3, -58 + br); ctx.lineTo(12, -57 + br); ctx.lineTo(17, -24); ctx.lineTo(-1, -24); ctx.closePath();
    paint(ctx, grad(ctx, 0, -58, 0, -24, ["#c9b48c", "#9a8462"]), { lw: 1.8, hatch: [-2, -34, 20, 10, 2.4, 0.9, 0.25] });
    ctx.beginPath(); ctx.moveTo(1, -40); ctx.lineTo(14, -40); ctx.lineTo(15, -30); ctx.lineTo(2, -30); ctx.closePath();
    paint(ctx, "#b39c75", { lw: 1.2 });
    ctx.fillStyle = "#efe6d2"; ctx.fillRect(4, -45, 2, 7);
    ctx.fillStyle = "#5a3d26"; ctx.fillRect(8, -44, 1.6, 6);
    ctx.fillStyle = "#8a6a44"; ctx.fillRect(11, -43, 2, 5);
    // stooped shoulders & rolled sleeve, hand holding a bone folder
    ctx.fillStyle = "#4a3828";
    Art.brush(ctx, [10, -60 + br, 20, -52, 24, -44], 6, { seed: 2, taperStart: 0, taperEnd: 0 });
    ctx.fillStyle = "#d9c7a8"; ctx.fillRect(21, -48, 5, 3);
    ctx.fillStyle = "#e0cdb0"; ctx.beginPath(); ctx.arc(25, -42, 2.8, 0, 7); ctx.fill();
    ctx.fillStyle = "#f2eadb"; Art.brush(ctx, [25, -42, 33, -46 + Math.sin(t * 2) * 2], 3, { seed: 7, taperStart: 0, taperEnd: 0.2 });
    // head in profile: bald crown with a wisp of white hair, big nose, brow, spectacles, beard
    const hx = 14, hy = -72 + br;
    ctx.beginPath(); ctx.ellipse(hx, hy, 9, 10, 0.1, 0, Math.PI * 2);
    paint(ctx, grad(ctx, hx - 8, hy - 10, hx + 8, hy + 8, ["#ecdcc0", "#c9ae8c"]), { lw: 2 });
    ctx.fillStyle = "#e0cdb0"; ctx.beginPath(); ctx.moveTo(hx + 7, hy - 2); ctx.quadraticCurveTo(hx + 14, hy + 1, hx + 8, hy + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = "#f4efe5";
    ctx.beginPath(); ctx.moveTo(hx - 8, hy - 2); ctx.quadraticCurveTo(hx - 14, hy - 8, hx - 10, hy - 12); ctx.quadraticCurveTo(hx - 6, hy - 6, hx - 5, hy - 3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 2, hy + 3); ctx.quadraticCurveTo(hx - 4, hy + 16, hx + 3, hy + 22); ctx.quadraticCurveTo(hx + 6, hy + 14, hx + 9, hy + 5); ctx.quadraticCurveTo(hx + 4, hy + 7, hx - 2, hy + 3);
    paint(ctx, grad(ctx, 0, hy, 0, hy + 22, ["#faf6ee", "#cfc6b6"]), { lw: 1.4 });
    ctx.strokeStyle = "rgba(21,16,13,0.35)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(hx + k * 1.5, hy + 7); ctx.quadraticCurveTo(hx + k * 1.5 - 1, hy + 13, hx + 2 + k, hy + 18); } ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + 1, hy - 5); ctx.lineTo(hx + 8, hy - 4); ctx.stroke();
    ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(hx + 5, hy - 1, 3.4, 0, 7); ctx.moveTo(hx + 1.6, hy - 1); ctx.lineTo(hx - 6, hy - 3); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255," + (0.45 + Math.sin(t * 3) * 0.4) + ")"; ctx.fillRect(hx + 5, hy - 3, 1.6, 1.6);
    ctx.strokeStyle = "rgba(21,16,13,0.45)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(hx - 4, hy - 7); ctx.quadraticCurveTo(hx, hy - 8, hx + 3, hy - 7); ctx.moveTo(hx - 5, hy + 1); ctx.lineTo(hx - 3, hy + 3); ctx.stroke();
  }

  // ================================================================ LAMPWICK
  function lampwick(ctx, G, t, br) {
    const lit = G.S.flags.pigment_water;
    shadow(ctx, 15);
    // boots
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 5 - 4, -8); ctx.lineTo(s * 5 + 4, -8); ctx.lineTo(s * 5 + 6, 0); ctx.lineTo(s * 5 - 4, 0); ctx.closePath();
      paint(ctx, "#2a1c14", { lw: 1.4 });
    }
    // long buttoned coat with a scarf
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(-9, -32 + br); ctx.quadraticCurveTo(0, -38 + br, 9, -32 + br); ctx.lineTo(13, -6); ctx.lineTo(6, -3); ctx.lineTo(0, -7); ctx.lineTo(-6, -3); ctx.closePath();
    paint(ctx, grad(ctx, 0, -38, 0, -3, ["#56496a", "#352c44", "#221b2c"]), { lw: 2, hatch: [-12, -20, 26, 16, 2.6, 0.9, 0.28] });
    ctx.fillStyle = "#c9a14a"; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(2, -28 + k * 7, 1.1, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#6b2a22"; Art.brush(ctx, [-7, -32 + br, 2, -30 + br, 8, -32 + br], 4, { seed: 1, taperStart: 0, taperEnd: 0 });
    Art.brush(ctx, [-6, -31 + br, -9, -24, -8, -18], 3, { seed: 2, taperStart: 0, taperEnd: 0.5 });
    // satchel of spare candles
    ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(-6, -21); ctx.lineTo(-6, -11); ctx.lineTo(-14, -11); ctx.closePath();
    paint(ctx, "#5a3d26", { lw: 1.3 });
    ctx.fillStyle = "#efe4cb"; for (let k = 0; k < 3; k++) ctx.fillRect(-13 + k * 2.5, -25 + (k % 2), 1.6, 5);
    // tall pointed hood with a shadowed face
    ctx.beginPath(); ctx.moveTo(-9, -32 + br); ctx.quadraticCurveTo(-9, -52 + br, -3, -64 + br); ctx.quadraticCurveTo(0, -58 + br, 4, -55 + br); ctx.quadraticCurveTo(11, -48 + br, 10, -34 + br); ctx.closePath();
    paint(ctx, grad(ctx, -9, -64, 10, -32, ["#4a3f5a", "#2e2638"]), { lw: 2 });
    ctx.strokeStyle = "rgba(200,190,210,0.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -36 + br); ctx.quadraticCurveTo(-5, -50 + br, -2, -60 + br); ctx.stroke();
    ctx.fillStyle = "#0f0b0d"; ctx.beginPath(); ctx.ellipse(3.5, -42 + br, 4.6, 6.2, 0.1, 0, 7); ctx.fill();
    ctx.fillStyle = "#d4bc9c"; ctx.beginPath(); ctx.moveTo(6.4, -44 + br); ctx.quadraticCurveTo(8.4, -39 + br, 5.4, -36.2 + br); ctx.quadraticCurveTo(6.6, -40 + br, 6.4, -44 + br); ctx.fill();
    ctx.fillStyle = lit ? "rgba(170,215,255,0.95)" : "rgba(240,230,210,0.85)"; ctx.fillRect(4.6, -43 + br, 1.3, 1.1);
    // gloved hand and the long lamplighter's pole with a hook and an ornate lantern
    ctx.fillStyle = "#2a1c14"; ctx.beginPath(); ctx.arc(11, -26, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = "#3a2a20"; Art.brush(ctx, [8, -8, 12, -30, 19, -66], 2.6, { seed: 4, taperStart: 0, taperEnd: 0 });
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(19, -66); ctx.quadraticCurveTo(25, -70, 25, -64); ctx.stroke();
    const sw = Math.sin(t * 1.4) * 0.12;
    ctx.save(); ctx.translate(25, -64); ctx.rotate(sw);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-7, 8); ctx.lineTo(0, 3); ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(6, 8); ctx.lineTo(5, 21); ctx.lineTo(-5, 21); ctx.closePath();
    paint(ctx, lit ? "rgba(170,215,255,0.95)" : "rgba(226,224,214,0.7)", { lw: 1.6 });
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 21); ctx.stroke();
    // the flame: colourless until the blue comes back
    ctx.fillStyle = lit ? "#e8f4ff" : "rgba(250,248,240,0.9)";
    const fl = 1 + Math.sin(t * 12) * 0.12;
    ctx.beginPath(); ctx.moveTo(-2, 18); ctx.quadraticCurveTo(0, 18 - 7 * fl, 2, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = INK; ctx.fillRect(-6, 21, 12, 2.5);
    ctx.restore();
    if (lit) { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 25, -50, 80, "rgba(120,180,255,0.4)"); ctx.restore(); }
  }

  // ================================================================ PELL (a first-draft painter)
  function pell(ctx, G, t, br) {
    const b = Art.boil;
    shadow(ctx, 16);
    // construction lines, as if someone started drawing a person and stopped
    ctx.strokeStyle = "rgba(90,120,170,0.35)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(2, -60 + br, 12, 0, Math.PI * 2); ctx.moveTo(2, -74); ctx.lineTo(2, 0); ctx.moveTo(-14, -44); ctx.lineTo(18, -44); ctx.stroke();
    // paper-white body with smudged pencil shading
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-10, -30); ctx.quadraticCurveTo(-8, -46 + br, 2, -48 + br); ctx.quadraticCurveTo(12, -46 + br, 12, -30); ctx.lineTo(14, 0); ctx.closePath();
    ctx.fillStyle = "rgba(240,232,214,0.85)"; ctx.fill();
    ctx.save(); ctx.clip(); Art.hatch(ctx, -12, -30, 26, 30, 2.4, 0.8, "#4a4038", 0.3, 0.7, 5); ctx.restore();
    // paint splotches on the smock (blue appears once the Marshal falls)
    Art.wash(ctx, -3, -22, 6, 5, "#a3322a", 0.65, 5); Art.wash(ctx, 6, -32, 4, 4, "#a3322a", 0.5, 6); Art.wash(ctx, 4, -12, 3, 3, "#c98a3a", 0.5, 9);
    if (G.S.flags.boss_marshal) Art.wash(ctx, -5, -12, 5, 4, "#3f7fc0", 0.7, 8);
    // doubled, wobbling pencil contours (re-drawn every frame)
    ctx.strokeStyle = "rgba(40,32,28,0.85)"; ctx.lineWidth = 1.3;
    for (let k = 0; k < 2; k++) {
      const j = (n) => (U.hash(b + n + k * 9) - 0.5) * 2;
      ctx.beginPath();
      ctx.moveTo(-12 + j(1), 0); ctx.lineTo(-10 + j(2), -30); ctx.quadraticCurveTo(-8, -46 + br, 2 + j(3), -48 + br); ctx.quadraticCurveTo(12, -46 + br, 12 + j(4), -30); ctx.lineTo(14 + j(5), 0);
      ctx.moveTo(-9 + j(6), -2); ctx.lineTo(13 + j(7), -2);
      ctx.stroke();
    }
    // legs & shoes, only half drawn
    ctx.strokeStyle = "rgba(40,32,28,0.7)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-5, 0); ctx.lineTo(-1, 0); ctx.moveTo(6, -2); ctx.lineTo(7, 0); ctx.lineTo(11, 0); ctx.stroke();
    // head: long hair, soft profile, beret
    const hx = 3, hy = -58 + br;
    ctx.beginPath(); ctx.ellipse(hx, hy, 8, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(242,234,218,0.95)"; ctx.fill();
    ctx.strokeStyle = "rgba(40,32,28,0.85)"; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = "rgba(60,48,40,0.8)";
    Art.brush(ctx, [hx - 6, hy - 7, hx - 10, hy + 2, hx - 8, hy + 14], 4, { seed: b + 1, taperStart: 0, taperEnd: 0.8 });
    Art.brush(ctx, [hx - 3, hy - 8, hx - 6, hy + 4, hx - 4, hy + 12], 2.4, { seed: b + 2, taperStart: 0, taperEnd: 0.8 });
    ctx.fillStyle = "#6a2a3a";
    ctx.beginPath(); ctx.ellipse(hx - 1, hy - 8, 10, 4, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(40,32,28,0.85)"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = "#6a2a3a"; ctx.fillRect(hx - 2, hy - 13, 2, 2);
    ctx.strokeStyle = "rgba(40,32,28,0.8)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx + 4, hy - 1); ctx.lineTo(hx + 7, hy - 1); ctx.moveTo(hx + 8, hy); ctx.lineTo(hx + 9.5, hy + 3); ctx.lineTo(hx + 8, hy + 3.6); ctx.moveTo(hx + 5, hy + 5.5); ctx.lineTo(hx + 7.5, hy + 5.5); ctx.stroke();
    // palette in one hand (paint dabs), brush in the other, flicking
    ctx.save(); ctx.translate(-12, -30); ctx.rotate(-0.4);
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
    paint(ctx, "#c8a878", { lw: 1.2, line: "rgba(40,32,28,0.85)" });
    ctx.fillStyle = "rgba(236,225,201,0.95)"; ctx.beginPath(); ctx.arc(4, 1, 1.8, 0, 7); ctx.fill();
    for (const [dx, dy, c] of [[-5, -2, "#a3322a"], [-1, -3, "#c98a3a"], [-4, 2, "#3a2a24"], [1, 3, G.S.flags.boss_marshal ? "#3f7fc0" : "#8a7a6a"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(dx, dy, 1.6, 0, 7); ctx.fill(); }
    ctx.restore();
    const flick = Math.sin(t * 3) * 3;
    ctx.fillStyle = "#6b4a2a"; Art.brush(ctx, [10, -30, 18, -38 + flick, 22, -42 + flick], 1.8, { seed: 3, taperStart: 0, taperEnd: 0 });
    ctx.fillStyle = "#a3322a"; ctx.beginPath(); ctx.arc(22.5, -42.5 + flick, 1.5, 0, 7); ctx.fill();
  }

  const DRAW = { quillon, lampwick, pell };
  LD.NPC.prototype.draw = function (ctx, G) {
    const x = this.x, y = this.y, f = this.facing, t = this.t;
    const br = Math.sin(t * 1.8) * 1.2;
    if (LD.Sprites.enabled(this.k)) {
      LD.Sprites.draw(ctx, this.k, "idle", { t }, x, y, f, { shadow: Art.highContrast ? "rgba(255,248,230,0.95)" : null });
      this.drawName(ctx, G);
      return;
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    if (Art.highContrast) { ctx.shadowColor = "rgba(255,248,230,0.95)"; ctx.shadowBlur = 5; }
    else { ctx.shadowColor = "rgba(255,214,170,0.25)"; ctx.shadowBlur = 6; }
    (DRAW[this.k] || (() => {}))(ctx, G, t, br);
    ctx.restore();
    this.drawName(ctx, G);
  };
})();
