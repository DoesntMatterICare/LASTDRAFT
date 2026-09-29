// UI: a minimalist HUD drawn "onto the page" — an animated ink reservoir (not a mana bar),
// red ink health blots, a pen-stroke stamina line, element badge, the player's own weapon
// sketch as its label, plus title cards, thoughts, barks and a brush-stroke boss bar.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, I = LD.Input;

  const H = (LD.HUD = {
    inkShown: 70, inkFlash: 0, hpFlash: 0, thoughts: [], card: null, barkQ: null, area: null,
    objText: "", objT: 0, boss: null, bossShown: 1, bossLag: 1, bossLagF: 1, bossLagT: 0,
  });

  H.reset = (S) => { H.inkShown = S.ink; H.thoughts = []; H.card = null; H.barkQ = null; H.area = null; H.boss = null; };
  H.inkPulse = (n) => { H.inkFlash = 1; };
  H.hpPulse = () => { H.hpFlash = 1; };
  H.thought = (text) => { if (H.thoughts.some((t) => t.text === text)) return; H.thoughts.push({ text, t: 0, dur: Math.max(3.2, text.length * 0.055) }); };
  H.titleCard = (name, sub) => { H.card = { name, sub, t: 0, dur: 3.4 }; };
  H.bark = (who, text) => { H.barkQ = { who, text, t: 0, dur: 3.2 }; };
  H.areaName = (name) => { H.area = { name, t: 0, dur: 3 }; };
  H.objective = (text) => { if (text !== H.objText) { H.objText = text; H.objT = 6.5; } };

  H.update = (dt, G) => {
    H.inkShown = U.damp(H.inkShown, G.S.ink, 6, dt);
    H.inkFlash = Math.max(0, H.inkFlash - dt * 1.5);
    H.hpFlash = Math.max(0, H.hpFlash - dt * 2);
    H.objT = Math.max(0, H.objT - dt);
    if (H.thoughts.length) { const t = H.thoughts[0]; t.t += dt; if (t.t > t.dur) H.thoughts.shift(); }
    if (H.card) { H.card.t += dt; if (H.card.t > H.card.dur) H.card = null; }
    if (H.barkQ) { H.barkQ.t += dt; if (H.barkQ.t > H.barkQ.dur) H.barkQ = null; }
    if (H.area) { H.area.t += dt; if (H.area.t > H.area.dur) H.area = null; }
    if (H.boss) {
      const f = H.boss.hp / H.boss.maxHp;
      H.bossShown = U.damp(H.bossShown, f, 5, dt);
      H.bossLagT = f < H.bossLagF ? 0.7 : Math.max(0, H.bossLagT - dt);
      H.bossLagF = f;
      if (H.bossLag < f) H.bossLag = f;
      else if (H.bossLagT <= 0) H.bossLag = U.damp(H.bossLag, f, 3, dt);
    }
  };

  // ---------------------------------------------------------------- pieces
  function reservoir(ctx, x, y, S, t) {
    const frac = U.clamp(H.inkShown / D.ink.max, 0, 1);
    // swirling ink emblem behind the flask
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.25);
    ctx.fillStyle = Art.INK;
    for (let k = 0; k < 3; k++) {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const a = k * 2.1 + i * 0.3, r = 22 + i * 1.8;
        pts.push(Math.cos(a) * r, Math.sin(a) * r);
      }
      Art.brush(ctx, pts, 7, { seed: k * 9 + Art.boil * 0.2, taperStart: 0.6, taperEnd: 0.1 });
    }
    ctx.restore();
    // flask body, held in a riveted brass gauge ring
    ctx.save();
    ctx.translate(x, y);
    const R = 30;
    ctx.strokeStyle = "#241609"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(0, 4, R + 5, 0, Math.PI * 2); ctx.stroke();
    const bg = ctx.createLinearGradient(-R, -R, R, R);
    bg.addColorStop(0, "#f0d58e"); bg.addColorStop(0.45, "#b8903f"); bg.addColorStop(1, "#5e4316");
    ctx.strokeStyle = bg; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 4, R + 5, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8, rx = Math.cos(a) * (R + 5), ry = 4 + Math.sin(a) * (R + 5);
      ctx.fillStyle = "#3a2710"; ctx.beginPath(); ctx.arc(rx, ry, 1.9, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,240,200,0.8)"; ctx.beginPath(); ctx.arc(rx - 0.6, ry - 0.6, 0.8, 0, 7); ctx.fill();
    }
    // neck, lip and a twine-wrapped cork
    ctx.fillStyle = "rgba(214,204,184,0.95)"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-8, -R + 4); ctx.lineTo(-7, -R - 9); ctx.lineTo(7, -R - 9); ctx.lineTo(8, -R + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#cfc2a6"; ctx.beginPath(); ctx.roundRect(-10, -R - 13, 20, 5, 2); ctx.fill(); ctx.stroke();
    const cg = ctx.createLinearGradient(-8, 0, 8, 0);
    cg.addColorStop(0, "#6b5236"); cg.addColorStop(0.5, "#a07c52"); cg.addColorStop(1, "#5a4128");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(-7, -R - 13); ctx.lineTo(-9, -R - 25); ctx.quadraticCurveTo(0, -R - 28, 9, -R - 25); ctx.lineTo(7, -R - 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(40,25,12,0.6)";
    for (const [cx0, cy0] of [[-4, -R - 20], [3, -R - 22], [1, -R - 16], [-2, -R - 24]]) ctx.fillRect(cx0, cy0, 1.5, 1.5);
    ctx.strokeStyle = "#d9c79c"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-8, -R - 17); ctx.lineTo(8, -R - 18); ctx.moveTo(-8, -R - 15); ctx.lineTo(8, -R - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -R - 17); ctx.quadraticCurveTo(18, -R - 14, 16, -R - 4); ctx.quadraticCurveTo(14, -R + 2, 20, -R + 4); ctx.stroke();
    // glass
    ctx.fillStyle = "rgba(226,216,196,0.94)";
    ctx.beginPath(); ctx.arc(0, 4, R, 0, Math.PI * 2); ctx.fill();
    // ink level with a sloshing surface, rising bubbles and graduations
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 4, R - 3, 0, Math.PI * 2); ctx.clip();
    const top = 4 + R - 3 - frac * (2 * (R - 3)), bot = 4 + R - 3;
    const ig = ctx.createLinearGradient(0, top, 0, bot);
    ig.addColorStop(0, "#1b2238"); ig.addColorStop(1, "#07080f");
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.moveTo(-R, R + 10);
    for (let i = 0; i <= 12; i++) ctx.lineTo(-R + (i / 12) * 2 * R, top + Math.sin(t * 3 + i * 0.9) * 2);
    ctx.lineTo(R, R + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(90,130,210,0.5)";
    ctx.fillRect(-R, top - 1, 2 * R, 3);
    if (S.weapon.element === "water") { ctx.fillStyle = "rgba(63,127,192,0.35)"; ctx.fillRect(-R, top, 2 * R, 2 * R); }
    ctx.strokeStyle = "rgba(150,180,235,0.55)"; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const ph = (t * (0.3 + i * 0.07) + i * 0.23) % 1, by = bot - ph * (bot - top);
      if (by < top + 4) continue;
      ctx.beginPath(); ctx.arc(Math.sin(i * 2.3 + t) * R * 0.45, by, 1.2 + (i % 2), 0, 7); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(21,16,13,0.6)"; ctx.lineWidth = 1.2;
    for (const gq of [0.25, 0.5, 0.75]) {
      const gy = bot - gq * (bot - (4 - R + 3));
      ctx.beginPath(); ctx.moveTo(R - (gq === 0.5 ? 14 : 10), gy); ctx.lineTo(R - 3, gy); ctx.stroke();
    }
    ctx.restore();
    if (frac < 0.2) {
      ctx.strokeStyle = "rgba(156,42,34," + (0.45 + Math.sin(t * 6) * 0.35) + ")"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 4, R + 1, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = Art.INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 4, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(-3, 2, R - 8, 3.5, 4.5); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(2, 6, R - 7, 0.3, 0.9); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(-14, -10, 2, 0, 7); ctx.fill();
    if (H.inkFlash > 0) { ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 0, 4, 60, "rgba(110,150,240,0.6)", H.inkFlash); }
    ctx.restore();
    const num = Math.round(H.inkShown) + "";
    ctx.font = "700 30px " + Art.HAND;
    const nw = ctx.measureText(num).width;
    Art.text(ctx, num, x + 52, y + 16, 30, { color: "#f1e6cf", outline: 4, outlineColor: "rgba(21,16,13,0.8)", weight: "700" });
    Art.text(ctx, "/ " + D.ink.max + " ink", x + 58 + nw, y + 16, 18, { color: "#e6d9bc", outline: 3, outlineColor: "rgba(21,16,13,0.7)" });
  }

  // Teardrop path (point up), centred on the round belly.
  function drop(cx, cy, r) {
    const p = new Path2D();
    p.moveTo(cx, cy - r * 1.45);
    p.bezierCurveTo(cx + r * 0.45, cy - r * 0.8, cx + r, cy - r * 0.35, cx + r, cy + r * 0.1);
    p.arc(cx, cy + r * 0.1, r, 0, Math.PI);
    p.bezierCurveTo(cx - r, cy - r * 0.35, cx - r * 0.45, cy - r * 0.8, cx, cy - r * 1.45);
    p.closePath();
    return p;
  }

  function health(ctx, x, y, S, t) {
    const per = D.player.hpPerPip, n = D.player.maxHp / per;
    // a pen line threading the drops together, with a curl at the end
    ctx.fillStyle = "rgba(21,16,13,0.75)";
    Art.brush(ctx, [x - 16, y + 12, x + (n - 1) * 15, y + 14, x + (n - 1) * 30 + 16, y + 12], 2.2, { seed: 17, taperStart: 0.2, taperEnd: 0.4, jitter: 0 });
    ctx.strokeStyle = "rgba(21,16,13,0.75)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x + (n - 1) * 30 + 20, y + 8, 4, 1.8, 5.8); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const cx = x + i * 30, cy = y;
      const fill = U.clamp((S.hp - i * per) / per, 0, 1);
      const shake = H.hpFlash > 0 && fill < 1 && S.hp <= (i + 1) * per ? (Math.random() - 0.5) * 3 * H.hpFlash : 0;
      const dx = cx + shake;
      const outer = drop(dx, cy + 2, 10.5), inner = drop(dx, cy + 2, 8.5);
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.save(); ctx.translate(1.5, 2); ctx.fill(outer); ctx.restore();
      ctx.fillStyle = fill > 0 ? "rgba(236,225,201,0.92)" : "rgba(196,184,160,0.8)"; ctx.fill(outer);
      if (fill > 0) {
        ctx.save();
        ctx.clip(inner);
        const g = ctx.createLinearGradient(0, cy - 12, 0, cy + 12);
        g.addColorStop(0, "#c2392c"); g.addColorStop(1, "#6a1510");
        ctx.fillStyle = g;
        const lvl = cy + 12 - fill * 26;
        ctx.beginPath(); ctx.moveTo(dx - 12, cy + 14);
        for (let k = 0; k <= 6; k++) ctx.lineTo(dx - 12 + k * 4, lvl + (fill < 1 ? Math.sin(t * 4 + k + i) * 1.2 : 0));
        ctx.lineTo(dx + 12, cy + 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,210,190,0.75)";
        ctx.beginPath(); ctx.ellipse(dx - 3.5, cy + 1, 1.8, 3.2, 0.4, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(dx + 3, cy + 8, 1, 0, 7); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.stroke(outer);
      if (fill <= 0) {
        // dried and cracked
        ctx.lineWidth = 1.1; ctx.strokeStyle = "rgba(21,16,13,0.7)";
        ctx.beginPath(); ctx.moveTo(dx - 1, cy - 8); ctx.lineTo(dx + 1, cy - 2); ctx.lineTo(dx - 3, cy + 3); ctx.lineTo(dx - 1, cy + 9); ctx.moveTo(dx + 1, cy - 2); ctx.lineTo(dx + 5, cy + 2); ctx.stroke();
        ctx.fillStyle = "rgba(106,21,16,0.55)"; ctx.fillRect(dx + 3, cy + 7, 2, 2); ctx.fillRect(dx - 6, cy + 5, 1.5, 1.5);
      }
    }
  }

  function stamina(ctx, x, y, p, t) {
    const w = 150, frac = U.clamp(p.stamina / D.player.stamina.max, 0, 1);
    ctx.save();
    // a strip of ruled paper as the trough
    ctx.fillStyle = "rgba(21,16,13,0.55)";
    Art.brush(ctx, [x - 4, y + 1, x + w * 0.5, y, x + w + 4, y + 1], 13, { seed: 5, taperStart: 0.02, taperEnd: 0.06, jitter: 0 });
    ctx.fillStyle = "rgba(236,225,201,0.62)";
    Art.brush(ctx, [x, y, x + w * 0.5, y - 1, x + w, y], 8, { seed: 5, taperStart: 0.05, taperEnd: 0.4, jitter: 0 });
    if (frac > 0) {
      ctx.fillStyle = p.exhausted ? "#7a6e62" : "#1c2f55";
      Art.brush(ctx, [x, y, x + w * frac * 0.5, y - 1, x + w * frac, y], 6, { seed: 6, taperStart: 0.05, taperEnd: 0.3, jitter: 0.1 });
      ctx.fillStyle = "rgba(140,170,230,0.45)";
      ctx.fillRect(x + 4, y - 2, Math.max(0, w * frac - 10), 1);
    }
    ctx.strokeStyle = "rgba(21,16,13,0.7)"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const q of [0.25, 0.5, 0.75]) { ctx.moveTo(x + w * q, y + 5); ctx.lineTo(x + w * q, y + 8); }
    ctx.stroke();
    if (p.exhausted) {
      // shape cue: hatching over the stroke when out of breath
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.2;
      ctx.beginPath(); for (let i = 0; i < 12; i++) { ctx.moveTo(x + i * 13, y + 5); ctx.lineTo(x + i * 13 + 7, y - 5); } ctx.stroke();
    }
    // the quill writing the stroke: brass nib + a feather sweeping back
    const nx = x + w * frac;
    ctx.save(); ctx.translate(nx + 6, y); ctx.rotate(0.55);
    ctx.fillStyle = "rgba(236,225,201,0.92)"; ctx.strokeStyle = "rgba(21,16,13,0.85)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-24, 0); ctx.quadraticCurveTo(-40, -9, -58, -3); ctx.quadraticCurveTo(-44, 2, -24, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-42, 8, -54, 4); ctx.quadraticCurveTo(-40, 1, -26, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 5; k++) { ctx.moveTo(-30 - k * 5, 0); ctx.lineTo(-34 - k * 5, -5 + k * 0.4); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-60, -1); ctx.stroke();
    LD.UIKit.nib(ctx, 0, 0, 0.5, frac > 0.02);
    ctx.restore();
    ctx.restore();
    Art.text(ctx, "stamina", x + w + 36, y + 5, 15, { color: "#e6d9bc", outline: 3, outlineColor: "rgba(21,16,13,0.6)" });
  }

  function weaponTag(ctx, x, y, S) {
    const wd = D.weapons[S.weapon.cls];
    const el = S.weapon.element || "none";
    // weapon label: the player's own drawing on a pinned slip with a folded corner
    const tx = x + 28;
    ctx.save();
    const img = Art.parchment(170, 40, 31);
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.drawImage(img, tx, y - 20);
    ctx.restore();
    ctx.fillStyle = "#c4b08a"; ctx.strokeStyle = "rgba(60,40,25,0.6)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx + 170, y + 8); ctx.lineTo(tx + 158, y + 20); ctx.lineTo(tx + 158, y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(20,12,8,0.55)"; ctx.beginPath(); ctx.moveTo(tx + 170, y + 8); ctx.lineTo(tx + 170, y + 20); ctx.lineTo(tx + 158, y + 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(74,36,24,0.35)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(tx + 62, y + 12); ctx.lineTo(tx + 150, y + 12); ctx.stroke();
    ctx.save();
    ctx.translate(tx + 10, y - 2);
    if (S.weapon.strokes || S.weapon.cls === "nib") LD.drawWeaponStrokes(ctx, S.weapon.strokes || [[0, 0, 0.5, 0.01, 0.8, 0], [0.8, -0.06, 1, 0, 0.8, 0.06]], 50, el, Art.boil, S.weapon.cls === "nib");
    ctx.restore();
    ctx.restore();
    Art.text(ctx, wd.name + (el !== "none" ? " · " + LD.Elements.name(el) : ""), tx + 68, y + 6, 18, { color: Art.INK });
    LD.UIKit.pin(ctx, tx + 164, y - 13, "#7a5a2a");
    // element badge: a wax seal stamped with the element's glyph, trailing a ribbon
    ctx.fillStyle = el === "water" ? "#1f4f86" : "#7a1f16";
    Art.brush(ctx, [x - 4, y + 10, x - 8, y + 26, x - 12, y + 36], 7, { seed: 8, taperStart: 0, taperEnd: 0.1, jitter: 0 });
    Art.brush(ctx, [x + 4, y + 10, x + 7, y + 24, x + 12, y + 34], 7, { seed: 9, taperStart: 0, taperEnd: 0.1, jitter: 0 });
    const wax = el === "water" ? "#2c64a4" : "#9c2a22";
    LD.UIKit.seal(ctx, x, y, 19, wax, (c) => {
      Art.elementGlyph(c, el, 0.6, 1.6, 10, "rgba(0,0,0,0.35)");
      Art.elementGlyph(c, el, 0, 1, 10, el === "water" ? "#cfe4f7" : "#f0c9b8");
    }, 9);
  }

  // ---------------------------------------------------------------- main draw
  H.draw = (ctx, G) => {
    const S = G.S, p = G.player, t = G.time;
    if (!G.hudHidden) {
      reservoir(ctx, 58, 62, S, t);
      health(ctx, 124, 36, S, t);
      if (p) stamina(ctx, 112, 100, p, t);
      weaponTag(ctx, 60, 140, S);
      if (H.objT > 0) {
        const a = Math.min(1, H.objT, (6.5 - H.objT) * 3);
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = "22px " + Art.HAND;
        const w = Math.min(560, ctx.measureText(H.objText).width + 60);
        const img = Art.parchment(Math.ceil(w / 10) * 10 + 20, 78, 44, { torn: true });
        const ox = U.VIEW_W - img.width - 16, cx = U.VIEW_W - img.width / 2 - 16;
        ctx.drawImage(img, ox, 14);
        ctx.strokeStyle = "rgba(74,36,24,0.35)"; ctx.lineWidth = 1;
        ctx.strokeRect(ox + 16, 24, img.width - 32, 58);
        Art.text(ctx, "objective", cx, 42, 15, { align: "center", color: "#6b5a44" });
        ctx.fillStyle = "rgba(74,36,24,0.6)";
        for (const d of [-1, 1]) {
          Art.brush(ctx, [cx + d * 36, 38, cx + d * 70, 37, cx + d * 100, 38], 1.8, { seed: 30 + d, taperStart: d < 0 ? 0.6 : 0.05, taperEnd: d < 0 ? 0.05 : 0.6, jitter: 0 });
          LD.UIKit.fleuron(ctx, cx + d * 108, 38, 0.35, "rgba(74,36,24,0.6)");
        }
        Art.text(ctx, H.objText, cx, 70, 22, { align: "center", color: Art.INK });
        LD.UIKit.pin(ctx, ox + 24, 28);
        ctx.restore();
      }
    }
    // boss bar
    if (H.boss && !H.boss.dead) {
      const bw = 560, bx = U.VIEW_W / 2 - bw / 2, by = U.VIEW_H - 50;
      const fire = H.boss.k === "marshal";
      ctx.save();
      // name on a ribbon banner
      ctx.font = "26px " + Art.TITLE;
      const nw = ctx.measureText(H.boss.name).width;
      LD.UIKit.ribbon(ctx, U.VIEW_W / 2, by - 30, nw + 56, 30, fire ? "#6e1812" : "#3a3440", fire ? "#360a06" : "#1c1820");
      Art.text(ctx, H.boss.name, U.VIEW_W / 2, by - 21, 26, { align: "center", font: "title", color: "#f1e6cf", outline: 3, outlineColor: "rgba(21,16,13,0.6)" });
      // trough
      ctx.fillStyle = "rgba(21,16,13,0.85)";
      Art.brush(ctx, [bx - 10, by + 4, bx + bw / 2, by + 2, bx + bw + 10, by + 4], 20, { seed: 3, taperStart: 0.03, taperEnd: 0.03, jitter: 0 });
      ctx.fillStyle = "rgba(236,225,201,0.08)";
      ctx.fillRect(bx, by - 2, bw, 11);
      // recent damage lingers as a pale smear before the ink catches up
      const f = U.clamp(H.bossShown, 0, 1), lag = U.clamp(H.bossLag, 0, 1);
      if (lag > f) {
        ctx.fillStyle = "rgba(241,230,207,0.55)";
        Art.brush(ctx, [bx + bw * f, by + 4, bx + bw * lag, by + 4], 9, { seed: 5, taperStart: 0, taperEnd: 0.1, jitter: 0 });
      }
      if (f > 0) {
        const g = ctx.createLinearGradient(0, by - 3, 0, by + 10);
        if (fire) { g.addColorStop(0, "#f08a4a"); g.addColorStop(0.5, "#b8431f"); g.addColorStop(1, "#6a1c0c"); }
        else { g.addColorStop(0, "#f3ede0"); g.addColorStop(0.5, "#cfc6b3"); g.addColorStop(1, "#8d8474"); }
        ctx.fillStyle = g;
        Art.brush(ctx, [bx, by + 4, bx + bw * f * 0.5, by + 3, bx + bw * f, by + 4], 11, { seed: 4, taperStart: 0.02, taperEnd: 0.05, jitter: 0.05 });
        if (fire) { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, bx + bw * f, by + 4, 16, "rgba(255,150,70,0.5)", 0.6 + Math.sin(G.time * 9) * 0.3); ctx.restore(); }
      }
      // engraved end caps
      for (const d of [-1, 1]) {
        const ex = d < 0 ? bx - 14 : bx + bw + 14;
        ctx.save(); ctx.translate(ex, by + 4); ctx.scale(d, 1);
        ctx.fillStyle = "#1a120e"; ctx.strokeStyle = "#c9a14a"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(8, 0); ctx.lineTo(-6, 12); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.bezierCurveTo(18, -12, 28, -4, 22, 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.bezierCurveTo(18, 12, 28, 4, 22, -2); ctx.stroke();
        ctx.fillStyle = "#c9a14a"; ctx.beginPath(); ctx.arc(-8, 0, 2.2, 0, 7); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = "rgba(201,161,74,0.55)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx - 4, by - 7); ctx.lineTo(bx + bw + 4, by - 7); ctx.moveTo(bx - 4, by + 15); ctx.lineTo(bx + bw + 4, by + 15); ctx.stroke();
      if (fire) {
        // phase marks, shaped as small flames
        for (const m of [0.66, 0.33]) {
          const mx = bx + bw * m;
          ctx.fillStyle = "#f1e6cf"; ctx.fillRect(mx - 1, by - 5, 2.5, 18);
          Art.elementGlyph(ctx, "fire", mx, by + 25, 6, f > m ? "#ffb35a" : "rgba(241,230,207,0.5)");
        }
      }
      ctx.restore();
    }
    // area name
    if (H.area) {
      const k = H.area.t, a = Math.min(1, k * 2, (H.area.dur - k) * 1.5);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      // soft ink wash behind the lettering
      ctx.save(); ctx.globalAlpha *= 0.5;
      Art.wash(ctx, 250, U.VIEW_H - 80, 250, 55, "#0c0806", 0.9, 21, 3);
      ctx.restore();
      Art.text(ctx, H.area.name, 70, U.VIEW_H - 90, 46, { font: "title", color: "#f1e6cf", outline: 6, outlineColor: "rgba(21,16,13,0.8)" });
      const w = Math.min(1, k * 1.2) * 320;
      ctx.fillStyle = "rgba(21,16,13,0.7)";
      Art.brush(ctx, [71, U.VIEW_H - 74, 71 + w * 0.5, U.VIEW_H - 77, 71 + w, U.VIEW_H - 73], 6, { seed: 2 });
      ctx.fillStyle = "#f1e6cf";
      Art.brush(ctx, [70, U.VIEW_H - 76, 70 + w * 0.5, U.VIEW_H - 79, 70 + w, U.VIEW_H - 75], 4, { seed: 2 });
      if (w > 30) {
        LD.UIKit.fleuron(ctx, 70 + w + 16, U.VIEW_H - 76, 0.7, "#f1e6cf");
        ctx.fillStyle = "#f1e6cf"; ctx.beginPath(); ctx.arc(58, U.VIEW_H - 76, 3, 0, 7); ctx.fill();
      }
      Art.text(ctx, "Looseleaf Borough · Chapter 1", 72, U.VIEW_H - 52, 20, { color: "#e6d9bc", outline: 3, outlineColor: "rgba(21,16,13,0.7)" });
      ctx.restore();
    }
    // title card (bosses, abilities)
    if (H.card) {
      const k = H.card.t, a = Math.min(1, k * 1.5, (H.card.dur - k) * 1.5);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      const cx = U.VIEW_W / 2, cy = U.VIEW_H / 2;
      // a brushed ink band with ragged ends and engraved rules
      const bg = ctx.createLinearGradient(0, 0, U.VIEW_W, 0);
      bg.addColorStop(0, "rgba(12,8,6,0.2)"); bg.addColorStop(0.25, "rgba(12,8,6,0.62)"); bg.addColorStop(0.75, "rgba(12,8,6,0.62)"); bg.addColorStop(1, "rgba(12,8,6,0.2)");
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(0, cy - 84);
      for (let xx = 0; xx <= U.VIEW_W; xx += 32) ctx.lineTo(xx, cy - 84 + (U.hash(xx * 0.37) - 0.5) * 8);
      for (let xx = U.VIEW_W; xx >= 0; xx -= 32) ctx.lineTo(xx, cy + 86 + (U.hash(xx * 0.53 + 7) - 0.5) * 8);
      ctx.closePath(); ctx.fill();
      const rw = Math.min(1, k * 1.1) * 720;
      ctx.strokeStyle = "rgba(201,161,74,0.6)"; ctx.lineWidth = 1.2;
      for (const yy of [cy - 70, cy - 64, cy + 66, cy + 72]) { ctx.beginPath(); ctx.moveTo(cx - rw / 2, yy); ctx.lineTo(cx + rw / 2, yy); ctx.stroke(); }
      if (rw > 100) { LD.UIKit.fleuron(ctx, cx, cy - 67, 0.8, "#c9a14a"); LD.UIKit.fleuron(ctx, cx, cy + 69, 0.8, "#c9a14a"); }
      Art.text(ctx, H.card.name, cx, cy, 64, { align: "center", font: "title", color: "#f4e9d2", outline: 4, outlineColor: "rgba(0,0,0,0.5)" });
      const w = Math.min(1, k * 1.4) * 460;
      ctx.fillStyle = "#b8431f";
      Art.brush(ctx, [cx - w / 2, cy + 16, cx, cy + 12, cx + w / 2, cy + 17], 5, { seed: 9 });
      if (w > 40) for (const d of [-1, 1]) Art.splat(ctx, cx + d * (w / 2 + 8), cy + 15, 3, "#b8431f", 9 + d, 3);
      Art.text(ctx, H.card.sub, cx, cy + 50, 28, { align: "center", color: "#e6d9bc" });
      ctx.restore();
    }
    // bark (short boss line during combat)
    if (H.barkQ) {
      const k = H.barkQ.t, a = Math.min(1, k * 3, (H.barkQ.dur - k) * 2);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      Art.text(ctx, "“" + H.barkQ.text + "”", U.VIEW_W / 2, 150, 30, { align: "center", color: "#ffd7a8", outline: 5, outlineColor: "rgba(21,16,13,0.85)" });
      ctx.restore();
    }
    // thought toast
    if (H.thoughts.length) {
      const th = H.thoughts[0], k = th.t, a = Math.min(1, k * 3, (th.dur - k) * 2);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ctx.font = "23px " + Art.SERIF;
      const w = Math.min(1180, ctx.measureText(th.text).width + 80);
      const img = Art.parchment(Math.ceil(w / 20) * 20, 60, 12, { torn: true });
      const y0 = H.boss ? U.VIEW_H - 170 : U.VIEW_H - 96;
      ctx.drawImage(img, U.VIEW_W / 2 - img.width / 2, y0);
      ctx.save(); ctx.globalAlpha *= 0.6;
      for (const d of [-1, 1]) LD.UIKit.fleuron(ctx, U.VIEW_W / 2 + d * (img.width / 2 - 22), y0 + 30, 0.4, "#4a2418");
      ctx.restore();
      Art.text(ctx, th.text, U.VIEW_W / 2, y0 + 37, 23, { align: "center", font: "serif", color: Art.INK });
      ctx.restore();
    }
  };

  // Prompts drawn in world space above the interact target
  H.drawWorld = (ctx, G) => {
    const p = G.player;
    if (!p || !p.interactTarget || G.overlay || G.cut) return;
    const o = p.interactTarget;
    const y = o.y - (o.promptY || 120) + Math.sin(G.time * 3) * 3;
    const label = o.prompt ? o.prompt() : "Interact";
    const key = I.usingPad ? "Y" : I.label("interact");
    ctx.save();
    ctx.font = "20px " + Art.HAND;
    const tw = ctx.measureText(label).width;
    ctx.save(); ctx.globalAlpha *= 0.55;
    Art.wash(ctx, o.x + 14, y, tw / 2 + 44, 22, "#0c0806", 0.9, 5, 2);
    ctx.restore();
    const kw = Art.keycap(ctx, key, o.x - tw / 2 - 10, y);
    Art.text(ctx, label, o.x - tw / 2 + kw / 2, y + 7, 20, { color: "#f1e6cf", outline: 4, outlineColor: "rgba(21,16,13,0.8)" });
    ctx.restore();
  };
})();
