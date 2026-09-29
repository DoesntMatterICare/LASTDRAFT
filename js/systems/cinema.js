// Cinema: screen-space film language for in-game cutscenes. Letterbox bars slide in whenever a
// cutscene runs (and the HUD steps aside), plus flashes, radial ink speed lines, shock rings,
// heartbeat vignette pulses, colour grades (desaturate / tint), slow push-ins and big
// brush-slash boss cards. Cutscenes drive it; gameplay code can also call flash/lines/ring.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art;
  const W = () => U.VIEW_W, H = () => U.VIEW_H;
  const BAR = 62;

  const K = (LD.Cinema = {
    bars: 0, hud: 1, force: 0,
    flashA: 0, flashC: "255,248,235", flashDecay: 3,
    lines: 0, linesAt: null, linesC: "21,16,13",
    rings: [], pulse: 0,
    grey: 0, greyTo: 0, tint: null, tintA: 0, tintTo: 0,
    card: null, caption: null,
  });

  K.reset = () => {
    Object.assign(K, { bars: 0, hud: 1, force: 0, flashA: 0, lines: 0, rings: [], pulse: 0, grey: 0, greyTo: 0, tintA: 0, tintTo: 0, card: null, caption: null });
    LD.Camera.roll = 0; LD.Camera.rollTo = 0; LD.Camera.punch = 0;
  };

  // ---------------------------------------------------------------- controls
  K.flash = (rgb = "255,248,235", a = 1, decay = 3) => {
    if (LD.G && LD.G.settings && LD.G.settings.reduceFlash) a *= 0.35;
    K.flashC = rgb; K.flashA = Math.max(K.flashA, a); K.flashDecay = decay;
  };
  K.speedLines = (wx, wy, amount = 1, rgb = "21,16,13") => { K.lines = Math.max(K.lines, amount); K.linesAt = { x: wx, y: wy }; K.linesC = rgb; };
  K.ring = (wx, wy, rgb = "21,16,13", size = 1) => { K.rings.push({ x: wx, y: wy, t: 0, rgb, size }); };
  K.heartbeat = () => { K.pulse = 1; };
  // the player was struck: a red ink bleed at the screen edges
  K.hurt = () => { K.hurtA = 1; };
  K.desaturate = (a) => { K.greyTo = a; };
  K.grade = (color, a) => { if (color) K.tint = color; K.tintTo = a; };
  K.punch = (a) => { LD.Camera.punch = Math.max(LD.Camera.punch, a); };
  K.roll = (r) => { LD.Camera.rollTo = r; };
  K.bossCard = (name, sub, color = "#b8342a", dur = 3.6) => { K.card = { name, sub, color, t: 0, dur }; };
  // quiet lower-third caption for scene-setting lines (not dialogue)
  K.say = (text, dur = 3) => { K.caption = { text, t: 0, dur }; };
  // hold the letterbox even outside a cutscene (e.g. boss intro frames)
  K.hold = (sec) => { K.force = Math.max(K.force, sec); };

  // ---------------------------------------------------------------- update
  K.update = (dt, G) => {
    const inCut = !!G.cut || K.force > 0;
    K.force = Math.max(0, K.force - dt);
    K.bars = U.damp(K.bars, inCut ? 1 : 0, inCut ? 5 : 4, dt);
    K.hud = U.damp(K.hud, G.cut ? 0 : 1, 6, dt);
    K.flashA = Math.max(0, K.flashA - dt * K.flashDecay);
    K.lines = Math.max(0, K.lines - dt * 1.4);
    K.pulse = Math.max(0, K.pulse - dt * 1.8);
    K.hurtA = Math.max(0, (K.hurtA || 0) - dt * 2.4);
    K.grey = U.damp(K.grey, K.greyTo, 2.5, dt);
    K.tintA = U.damp(K.tintA, K.tintTo, 2.5, dt);
    for (const r of K.rings) r.t += dt;
    K.rings = K.rings.filter((r) => r.t < 1.1);
    if (K.card) { K.card.t += dt; if (K.card.t > K.card.dur) K.card = null; }
    if (K.caption) { K.caption.t += dt; if (K.caption.t > K.caption.dur) K.caption = null; }
    const C = LD.Camera;
    C.roll = U.damp(C.roll || 0, C.rollTo || 0, 2.2, dt);
  };

  const toScreen = (wx, wy) => { const C = LD.Camera; return { x: (wx - C.x) * C.zoom, y: (wy - C.y) * C.zoom }; };

  // ---------------------------------------------------------------- draw: over the world, under the HUD
  K.drawScreen = (ctx, G) => {
    const w = W(), h = H();
    if (K.grey > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha = Math.min(1, K.grey);
      ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
    if (K.tintA > 0.01 && K.tint) {
      ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = Math.min(1, K.tintA);
      ctx.fillStyle = K.tint; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
    // shock rings
    for (const r of K.rings) {
      const s = toScreen(r.x, r.y), k = r.t / 1.1, rad = (40 + U.easeOut(k) * 520) * r.size;
      ctx.save();
      ctx.strokeStyle = "rgba(" + r.rgb + "," + (0.7 * (1 - k)) + ")"; ctx.lineWidth = 10 * (1 - k) + 1;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, rad, rad * 0.62, 0, 0, 7); ctx.stroke();
      ctx.lineWidth = 2; ctx.globalAlpha = 0.6 * (1 - k);
      ctx.beginPath(); ctx.ellipse(s.x, s.y, rad * 0.8, rad * 0.5, 0, 0, 7); ctx.stroke();
      ctx.restore();
    }
    // radial ink speed lines (manga-style focus)
    if (K.lines > 0.01 && K.linesAt) {
      const s = toScreen(K.linesAt.x, K.linesAt.y), b = Art.boil;
      ctx.save();
      ctx.fillStyle = "rgba(" + K.linesC + "," + Math.min(0.85, K.lines) + ")";
      ctx.beginPath();
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2 + U.hash(i + b) * 0.08;
        const r0 = 230 + U.hash(i * 3 + b) * 180, r1 = 1100, wv = 0.006 + U.hash(i * 7) * 0.014;
        ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
        ctx.lineTo(s.x + Math.cos(a - wv) * r1, s.y + Math.sin(a - wv) * r1);
        ctx.lineTo(s.x + Math.cos(a + wv) * r1, s.y + Math.sin(a + wv) * r1);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
    }
    // heartbeat: the page's edges clench
    if (K.pulse > 0.01) {
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, "rgba(20,4,12,0)"); g.addColorStop(1, "rgba(20,4,12," + 0.75 * K.pulse + ")");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    if (K.hurtA > 0.01) {
      const a = K.hurtA * (LD.G && LD.G.settings.reduceFlash ? 0.4 : 1);
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.68);
      g.addColorStop(0, "rgba(120,10,6,0)"); g.addColorStop(1, "rgba(120,10,6," + 0.55 * a + ")");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    if (K.flashA > 0.01) { ctx.fillStyle = "rgba(" + K.flashC + "," + Math.min(1, K.flashA) + ")"; ctx.fillRect(0, 0, w, h); }
  };

  // ---------------------------------------------------------------- draw: letterbox, cards (above HUD, under overlays)
  K.drawTop = (ctx, G) => {
    const w = W(), h = H();
    const b = BAR * U.easeInOut(U.clamp(K.bars, 0, 1));
    if (b > 0.5) {
      ctx.fillStyle = "#050304";
      ctx.fillRect(0, 0, w, b); ctx.fillRect(0, h - b, w, b);
      // torn inner edge of the bars
      ctx.beginPath(); ctx.moveTo(0, b);
      for (let x = 0; x <= w; x += 24) ctx.lineTo(x, b + U.hash(x * 0.3) * 4);
      ctx.lineTo(w, b - 1); ctx.lineTo(0, b - 1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, h - b);
      for (let x = 0; x <= w; x += 24) ctx.lineTo(x, h - b - U.hash(x * 0.7 + 3) * 4);
      ctx.lineTo(w, h - b + 1); ctx.lineTo(0, h - b + 1); ctx.fill();
    }
    if (K.caption) {
      const c = K.caption, a = Math.min(1, c.t * 2, (c.dur - c.t) * 2);
      Art.text(ctx, c.text, w / 2, h - Math.max(b, 20) - 18, 24, { align: "center", font: "serif", color: "#efe3c8", alpha: Math.max(0, a), outline: 4, outlineColor: "rgba(0,0,0,0.6)" });
    }
    if (K.card) drawCard(ctx, K.card, w, h);
  };

  function drawCard(ctx, c, w, h) {
    const t = c.t, inK = U.easeOut(U.clamp(t / 0.45, 0, 1)), outK = U.easeIn(U.clamp((t - (c.dur - 0.5)) / 0.5, 0, 1));
    const cy = h * 0.74;
    ctx.save();
    // ink band sweeping in on a slant
    ctx.translate(w / 2, cy); ctx.rotate(-0.06);
    const bw = w * 1.3 * inK;
    ctx.fillStyle = "rgba(8,5,6,0.88)";
    ctx.beginPath();
    ctx.moveTo(-w * 0.65 + outK * w * 1.4, -62);
    for (let x = -w * 0.65; x <= -w * 0.65 + bw; x += 40) ctx.lineTo(x + outK * w * 1.4, -62 + U.hash(x) * 8);
    ctx.lineTo(-w * 0.65 + bw + outK * w * 1.4, 58);
    for (let x = -w * 0.65 + bw; x >= -w * 0.65; x -= 40) ctx.lineTo(x + outK * w * 1.4, 58 + U.hash(x + 9) * 8);
    ctx.closePath(); ctx.fill();
    // brush slash
    const sk = U.easeOut(U.clamp((t - 0.2) / 0.35, 0, 1));
    if (sk > 0) {
      ctx.fillStyle = c.color;
      const x0 = -w * 0.42 + outK * w * 1.4, x1 = x0 + w * 0.84 * sk;
      Art.brush(ctx, [x0, 30, (x0 + x1) / 2, 22, x1, 34], 10, { seed: 7, taperStart: 0.05, taperEnd: 0.5 });
      if (sk > 0.9) Art.splat(ctx, x1 + 14, 32, 6, c.color, 3, 6);
    }
    ctx.restore();
    // letters dropping in one by one
    ctx.save();
    ctx.translate(w / 2 + outK * w * 1.4, cy); ctx.rotate(-0.06);
    ctx.font = "78px " + Art.TITLE;
    const name = c.name.toUpperCase(), full = ctx.measureText(name).width;
    let x = -full / 2;
    for (let i = 0; i < name.length; i++) {
      const ch = name[i], cw = ctx.measureText(ch).width;
      const k = U.easeOutBack(U.clamp((t - 0.15 - i * 0.035) / 0.35, 0, 1));
      if (k > 0) {
        ctx.save(); ctx.translate(x + cw / 2, 6 - (1 - k) * 40); ctx.scale(k, k);
        Art.text(ctx, ch, 0, 0, 78, { align: "center", font: "title", color: "#f4e9d2", outline: 5, outlineColor: "rgba(0,0,0,0.7)" });
        ctx.restore();
      }
      x += cw;
    }
    Art.text(ctx, c.sub, 0, 56, 22, { align: "center", color: "#e6d9bc", alpha: U.clamp((t - 0.7) * 2.5, 0, 1) });
    ctx.restore();
    if (t < 0.25) { ctx.fillStyle = "rgba(255,248,235," + (1 - t / 0.25) * 0.5 + ")"; ctx.fillRect(0, 0, w, h); }
  }
})();
