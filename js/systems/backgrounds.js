// Painterly parallax backgrounds, generated per room from a seeded RNG and baked once.
// Each theme is a "painting recipe" in the manner of the concept sheets: a graded dusk sky
// with light rays, cathedral skylines dissolving into lilac haze, a crooked timber town,
// near ink-black architecture caught by rim light, lanterns, crimson trees and banners.
// Every layer is painted at a higher internal resolution and receives atmospheric
// perspective (colour gradient + fog at its base) so depth reads like layered watercolor.
(function () {
  const LD = window.LD;
  const U = LD.U;
  const Art = LD.Art;
  const T = U.TILE;

  // Terrain palettes per theme (used by World when baking tiles).
  // solid: mass colour · top: sky-lit surface tint · deep: shadowed depth · hatch/rim/fringe: detail
  const PAL = {
    margin: { solid: "#3b322d", top: "#6b5a4e", deep: "#1c1614", hatch: "#56483f", rim: "#f3e7cc", fringe: "#d9cbb0", wood: "#4a3a2e" },
    dusk: { solid: "#2e2530", top: "#6e5566", deep: "#140f15", hatch: "#46384a", rim: "#f6cdb4", fringe: "#c9a996", wood: "#3d2c28" },
    gardens: { solid: "#302628", top: "#735a58", deep: "#161012", hatch: "#4a3b3a", rim: "#f6d6bd", fringe: "#b98a7c", wood: "#40302a" },
    bridge: { solid: "#2c2530", top: "#6a5670", deep: "#141017", hatch: "#43374a", rim: "#f0c9b5", fringe: "#b29aa8", wood: "#3a2c2a" },
    spire: { solid: "#282233", top: "#5e5374", deep: "#120f18", hatch: "#3f3650", rim: "#dcc1c9", fringe: "#9a8aa6", wood: "#342a32" },
    ash: { solid: "#261c18", top: "#6b4030", deep: "#120b09", hatch: "#3f2c22", rim: "#f0a877", fringe: "#6b4c3c", wood: "#3a261c" },
    archive: { solid: "#221713", top: "#7a3d22", deep: "#100907", hatch: "#3f261b", rim: "#ffa45e", fringe: "#5a3a2a", wood: "#34211a" },
    canal: { solid: "#222830", top: "#4a5866", deep: "#0f1216", hatch: "#35404c", rim: "#b3c6d6", fringe: "#5e6c78", wood: "#2d2a2a" },
    cistern: { solid: "#1d242d", top: "#435770", deep: "#0c1015", hatch: "#303c4a", rim: "#a6c2dc", fringe: "#51637a", wood: "#2a2a2e" },
    bindery: { solid: "#2e2119", top: "#6e4c32", deep: "#150e0a", hatch: "#4a372b", rim: "#f2cf9c", fringe: "#8a6a4e", wood: "#4a3222" },
    void: { solid: "#2d2723", top: "#6a5d52", deep: "#151210", hatch: "#4a413b", rim: "#fbf5e8", fringe: "#d9d0c0", wood: "#3a302a" },
  };
  LD.Palette = PAL;

  // Scene recipes. Colours are [top, bottom] gradients per layer (atmospheric perspective).
  const DUSK = {
    sky: ["#4f4a70", "#8f82a8", "#d9b3ae", "#f6d4b8"], sun: [0.72, 0.66], sunCol: "rgba(255,226,190,", clouds: "#7d6f98", cloudLit: "#f7c9ae",
    far: ["#b3a4c7", "#e4c8c3"], far2: ["#8e7fa6", "#c5a9b4"], mid: ["#43365a", "#6a566f"], near: ["#221a27", "#150f18"],
    haze: "rgba(238,200,190,", rim: "rgba(255,196,160,", leaves: ["#b3372c", "#8e2822", "#cf5a3e", "#a02e28"], banner: "#8a231d", lamp: "rgba(255,176,96,",
  };
  const SCENES = {
    dusk: DUSK,
    gardens: Object.assign({}, DUSK, { sky: ["#5b5074", "#a391ae", "#e7bdb0", "#f7dcc2"], leaves: ["#c9776c", "#b3574f", "#e0a092", "#9e4a44"], banner: "#9a5a54", trees: 3 }),
    bridge: Object.assign({}, DUSK, { sky: ["#4a4670", "#8a80ab", "#d7aeb0", "#f3cdb5"], bridges: 2 }),
    spire: Object.assign({}, DUSK, { sky: ["#3c3a5e", "#6f6891", "#c09fb0", "#e8c3b4"], far: ["#9f93ba", "#d2b9c0"], far2: ["#7b6f98", "#b097ab"], mid: ["#4f4666", "#76657e"], near: ["#231d2b", "#16121b"], tall: true }),
    margin: { pencil: true, sky: ["#efe6d2", "#ebe0c9", "#e3d5ba", "#dccdb0"], haze: "rgba(239,230,210," },
  };
  const INTERIOR = {
    canal: { sky: ["#0b0f14", "#141b23", "#1e2731"], far: ["#0e1319", "#18202a"], mid: ["#2c3642", "#384350"], near: ["#141a21", "#0d1116"], glow: "rgba(150,180,210,", haze: "rgba(60,80,100,", water: "rgba(80,150,230," },
    cistern: { sky: ["#090d12", "#111a24", "#1b2835"], far: ["#0f1720", "#1a2635"], mid: ["#27364a", "#33445a"], near: ["#10161e", "#0a0e13"], glow: "rgba(140,180,220,", haze: "rgba(50,80,110,", water: "rgba(80,160,240," },
    bindery: { sky: ["#1f150f", "#35251a", "#4a3222"], far: ["#2e2119", "#3e2c20"], mid: ["#4a3526", "#5a4130"], near: ["#1b120d", "#110b08"], glow: "rgba(255,190,120,", haze: "rgba(120,80,50," },
    ash: { sky: ["#1f1512", "#3a2620", "#5e3a2a"], far: ["#2e1f1a", "#4a2e22"], mid: ["#3e2a22", "#5a3828"], near: ["#1a110d", "#100a08"], glow: "rgba(255,130,60,", haze: "rgba(140,70,40," },
    archive: { sky: ["#170f0c", "#2e1a13", "#5a2c18"], far: ["#281812", "#40241a"], mid: ["#35211a", "#4e2c1f"], near: ["#150d0a", "#0d0806"], glow: "rgba(255,120,50,", haze: "rgba(150,60,25," },
  };

  const BG = (LD.BG = { scale: 1 });

  // ---------------------------------------------------------------- helpers
  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }
  function vgrad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / Math.max(1, stops.length - 1), c));
    return g;
  }
  function grain(ctx, W, H, a) {
    ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = a;
    ctx.fillStyle = ctx.createPattern(Art.grain(), "repeat"); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // Paint over already-drawn pixels only (lighting passes).
  function lightPass(ctx, W, H, fill, op = "source-atop", a = 1) {
    ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = a; ctx.fillStyle = fill; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  function fogBand(ctx, W, y, h, col, a) {
    const g = ctx.createLinearGradient(0, y - h, 0, y + h * 0.4);
    g.addColorStop(0, col + "0)"); g.addColorStop(0.7, col + (a * 0.8) + ")"); g.addColorStop(1, col + a + ")");
    ctx.fillStyle = g; ctx.fillRect(0, y - h, W, h * 1.4 + 2000);
  }

  // A lancet (pointed-arch) window
  function lancet(ctx, x, y, w, h) {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h * 0.62);
    ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h); ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h * 0.62);
    ctx.lineTo(x + w / 2, y); ctx.closePath();
  }

  // Gothic tower: stacked tiers, corner pinnacles, lancets, crocketed spire, finial.
  function tower(ctx, x, base, w, h, spireH, r, o) {
    const tiers = 2 + Math.floor(r() * 2);
    let y = base, tw = w;
    const th = h / tiers;
    for (let i = 0; i < tiers; i++) {
      ctx.fillStyle = o.fill;
      ctx.fillRect(x - tw / 2, y - th, tw, th + 1);
      // buttress steps
      ctx.fillRect(x - tw / 2 - tw * 0.12, y - th * 0.55, tw * 0.12, th * 0.55);
      ctx.fillRect(x + tw / 2, y - th * 0.55, tw * 0.12, th * 0.55);
      // pinnacles at tier corners
      for (const s of [-1, 1]) {
        const px = x + s * (tw / 2 - tw * 0.06);
        poly(ctx, [px - tw * 0.07, y - th, px, y - th - th * 0.45, px + tw * 0.07, y - th]); ctx.fill();
      }
      // windows
      const nwin = tw > 26 ? 2 : 1;
      for (let k = 0; k < nwin; k++) {
        const wx = x + (nwin === 1 ? 0 : (k - 0.5) * tw * 0.42), wy = y - th * 0.18;
        lancet(ctx, wx, wy, tw * 0.2, th * 0.55);
        const lit = o.lit && r() < o.lit;
        ctx.fillStyle = lit ? o.winLit : o.win; ctx.fill();
        if (lit && o.lights) o.lights.push([wx, wy - th * 0.3, tw * 0.9]);
        ctx.fillStyle = o.fill;
      }
      y -= th; tw *= 0.84;
    }
    // spire with crockets
    ctx.fillStyle = o.fill;
    poly(ctx, [x - tw / 2, y, x, y - spireH, x + tw / 2, y]); ctx.fill();
    for (let k = 1; k < 6; k++) {
      const t = k / 6, cy = y - spireH * t, half = (tw / 2) * (1 - t);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * half, cy, Math.max(0.8, tw * 0.05), 0, 7); ctx.fill(); }
    }
    ctx.fillRect(x - 0.7, y - spireH - spireH * 0.08, 1.4, spireH * 0.08);
    ctx.fillRect(x - 3, y - spireH - spireH * 0.06, 6, 1.2);
  }

  // A cathedral: nave with flying buttresses, twin front towers, crossing spire, rose window.
  function cathedral(ctx, cx, base, s, r, o) {
    const nw = 180 * s, nh = 120 * s;
    ctx.fillStyle = o.fill;
    ctx.fillRect(cx - nw / 2, base - nh, nw, nh + 2);
    poly(ctx, [cx - nw / 2 - 4 * s, base - nh, cx, base - nh - 55 * s, cx + nw / 2 + 4 * s, base - nh]); ctx.fill();
    // flying buttresses
    ctx.strokeStyle = o.fill; ctx.lineWidth = 5 * s;
    for (let k = 0; k < 4; k++) for (const side of [-1, 1]) {
      const px = cx + side * (nw / 2 + 28 * s), py = base - nh * (0.35 + k * 0.02);
      ctx.fillRect(px - 5 * s, py, 10 * s, base - py);
      poly(ctx, [px - 6 * s, py, px, py - 26 * s, px + 6 * s, py]); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px, py + 6 * s); ctx.quadraticCurveTo(cx + side * (nw / 2 + 8 * s), py - 20 * s, cx + side * (nw / 2 - 4 * s), base - nh * 0.8); ctx.stroke();
    }
    // nave lancets
    for (let k = 0; k < 5; k++) {
      const wx = cx - nw / 2 + (k + 0.5) * (nw / 5);
      lancet(ctx, wx, base - nh * 0.2, 9 * s, nh * 0.5);
      const lit = r() < (o.lit || 0);
      ctx.fillStyle = lit ? o.winLit : o.win; ctx.fill();
      if (lit && o.lights) o.lights.push([wx, base - nh * 0.45, 30 * s]);
      ctx.fillStyle = o.fill;
    }
    // towers
    for (const side of [-1, 1]) tower(ctx, cx + side * (nw / 2 - 6 * s), base, 44 * s, 250 * s, 170 * s, r, o);
    tower(ctx, cx, base - nh - 30 * s, 30 * s, 70 * s, 230 * s, r, o);
    // rose window
    const ry = base - nh * 0.62;
    ctx.fillStyle = o.lit ? o.winLit : o.win;
    ctx.beginPath(); ctx.arc(cx, ry, 20 * s, 0, 7); ctx.fill();
    ctx.strokeStyle = o.fill; ctx.lineWidth = 1.6 * s;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, ry); ctx.lineTo(cx + Math.cos(a) * 20 * s, ry + Math.sin(a) * 20 * s); ctx.stroke(); }
    if (o.lit && o.lights) o.lights.push([cx, ry, 60 * s]);
  }

  // Crooked jettied townhouse with timber framing, balcony, sign, lit windows.
  function house(ctx, x, base, w, h, r, o) {
    const lean = (r() - 0.5) * 6;
    const floors = Math.max(2, Math.round(h / 55));
    const fh = h / floors;
    for (let f = 0; f < floors; f++) {
      const jut = f * 5;
      const x0 = x - jut + lean * f * 0.3, fw = w + jut * 2;
      const y0 = base - (f + 1) * fh;
      ctx.fillStyle = o.fill;
      ctx.fillRect(x0, y0, fw, fh + 1);
      if (o.outline) { ctx.strokeStyle = o.outline; ctx.lineWidth = (o.lw || 1.6) + 0.8; ctx.strokeRect(x0, y0, fw, fh); }
      if (o.frame) {
        ctx.strokeStyle = o.frame; ctx.lineWidth = o.lw || 1.6;
        ctx.strokeRect(x0 + 1, y0 + 1, fw - 2, fh - 2);
        ctx.beginPath();
        for (let k = 1; k < 3; k++) { ctx.moveTo(x0 + (fw * k) / 3, y0); ctx.lineTo(x0 + (fw * k) / 3, y0 + fh); }
        if (r() < 0.6) { ctx.moveTo(x0, y0 + fh); ctx.lineTo(x0 + fw / 3, y0); ctx.moveTo(x0 + fw, y0 + fh); ctx.lineTo(x0 + (fw * 2) / 3, y0); }
        ctx.stroke();
      }
      // windows with mullions
      const nw = Math.max(1, Math.floor(fw / 30));
      for (let k = 0; k < nw; k++) {
        if (r() < (o.winSkip || 0.25)) continue;
        const wx = x0 + ((k + 0.5) * fw) / nw, wy = y0 + fh * 0.28, ww = Math.min(14, fw / nw * 0.45), wh = fh * 0.46;
        const lit = r() < (o.lit || 0);
        ctx.fillStyle = lit ? o.winLit : o.win;
        lancet(ctx, wx, wy + wh, ww, wh); ctx.fill();
        if (lit) {
          if (o.lights) o.lights.push([wx, wy + wh * 0.5, 34]);
          ctx.strokeStyle = o.fill; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy + wh); ctx.moveTo(wx - ww / 2, wy + wh * 0.55); ctx.lineTo(wx + ww / 2, wy + wh * 0.55); ctx.stroke();
        }
      }
      // balcony
      if (f > 0 && r() < 0.25 && o.frame) {
        ctx.fillStyle = o.fill; ctx.fillRect(x0 - 8, y0 + fh - 4, fw * 0.5, 4);
        ctx.strokeStyle = o.fill; ctx.lineWidth = 1.2;
        ctx.beginPath(); for (let k = 0; k <= 6; k++) { ctx.moveTo(x0 - 8 + k * fw * 0.08, y0 + fh - 4); ctx.lineTo(x0 - 8 + k * fw * 0.08, y0 + fh - 16); } ctx.moveTo(x0 - 8, y0 + fh - 16); ctx.lineTo(x0 - 8 + fw * 0.5, y0 + fh - 16); ctx.stroke();
      }
    }
    // steep roof, possibly with a dormer and chimney
    const topY = base - h, jutT = (floors - 1) * 5, x0 = x - jutT + lean * (floors - 1) * 0.3, fw = w + jutT * 2;
    const rh = fw * (0.55 + r() * 0.45);
    ctx.fillStyle = o.fill;
    poly(ctx, [x0 - 7, topY, x0 + fw / 2 + lean, topY - rh, x0 + fw + 7, topY]); ctx.fill();
    if (o.outline) { ctx.strokeStyle = o.outline; ctx.lineWidth = (o.lw || 1.6) + 0.8; ctx.stroke(); }
    if (o.lanterns && r() < 0.7) {
      // a lantern on an iron bracket beside the door
      const lx = x0 + fw + 4, ly = base - 70 - r() * 40;
      ctx.strokeStyle = o.outline || o.fill; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 + fw, ly - 8); ctx.lineTo(lx + 6, ly - 8); ctx.stroke();
      lantern(ctx, lx + 6, ly - 6, o.outline || "#111", "rgba(255,196,110,1)", o);
    }
    if (r() < 0.6) ctx.fillRect(x0 + fw * 0.68, topY - rh * 0.75, fw * 0.1, rh * 0.55);
    if (r() < 0.4) { poly(ctx, [x0 + fw * 0.2, topY - rh * 0.25, x0 + fw * 0.3, topY - rh * 0.55, x0 + fw * 0.4, topY - rh * 0.25]); ctx.fill(); }
    if (o.frame) {
      ctx.strokeStyle = o.frame; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 1; k < 6; k++) { const t = k / 6; ctx.moveTo(x0 + fw / 2 + lean - (fw / 2) * t, topY - rh + rh * t); ctx.lineTo(x0 + fw / 2 + lean + (fw / 2) * t, topY - rh + rh * t); }
      ctx.stroke();
    }
    return { x: x0, w: fw, top: topY - rh };
  }

  // Stone arched bridge with voussoirs, parapet and lamp posts.
  function archBridge(ctx, x0, x1, y, h, archW, o) {
    ctx.fillStyle = o.fill;
    ctx.fillRect(x0, y, x1 - x0, h * 0.2);
    for (let x = x0; x < x1; x += archW) {
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + archW * 0.16, y + h);
      ctx.lineTo(x + archW * 0.16, y + h * 0.55);
      ctx.arc(x + archW / 2, y + h * 0.55, archW * 0.34, Math.PI, 0);
      ctx.lineTo(x + archW * 0.84, y + h); ctx.lineTo(x + archW, y + h); ctx.lineTo(x + archW, y);
      ctx.closePath(); ctx.fill();
      if (o.frame) {
        ctx.strokeStyle = o.frame; ctx.lineWidth = 1;
        for (let k = 0; k <= 8; k++) {
          const a = Math.PI + (k / 8) * Math.PI, cx = x + archW / 2, cy = y + h * 0.55, r0 = archW * 0.34;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + 8), cy + Math.sin(a) * (r0 + 8)); ctx.stroke();
        }
      }
    }
    ctx.fillRect(x0, y - 12, x1 - x0, 4);
    for (let x = x0; x < x1; x += 16) ctx.fillRect(x, y - 12, 3, 12);
    if (o.lamps) for (let x = x0 + archW / 2; x < x1; x += archW * 2) {
      ctx.fillRect(x - 1.5, y - 40, 3, 30);
      ctx.fillStyle = o.lampCol; ctx.fillRect(x - 3, y - 46, 6, 7); ctx.fillStyle = o.fill;
      if (o.lights) o.lights.push([x, y - 42, 40]);
    }
  }

  // Rope bridge with hanging planks and a banner or two.
  function ropeBridge(ctx, x0, y0, x1, y1, sag, o, r) {
    ctx.strokeStyle = o.fill; ctx.lineWidth = 2;
    const pt = (t) => [U.lerp(x0, x1, t), U.lerp(y0, y1, t) + Math.sin(t * Math.PI) * sag];
    for (const dy of [0, -16]) {
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const [px, py] = pt(i / 24); if (i === 0) ctx.moveTo(px, py + dy); else ctx.lineTo(px, py + dy); }
      ctx.stroke();
    }
    ctx.fillStyle = o.fill;
    for (let i = 1; i < 24; i++) { const [px, py] = pt(i / 24); ctx.fillRect(px - 5, py, 10, 4); ctx.fillRect(px - 0.6, py - 16, 1.2, 16); }
    if (o.banner) for (let k = 0; k < 2; k++) {
      const [bx, by] = pt(0.3 + k * 0.4 + (r() - 0.5) * 0.1);
      banner(ctx, bx - 9, by + 4, 18, 50 + r() * 40, o.banner, r);
    }
  }

  function banner(ctx, x, y, w, h, col, r) {
    ctx.fillStyle = col;
    const pts = [x, y, x + w, y];
    const n = 4;
    for (let i = n; i >= 0; i--) pts.push(x + (w * i) / n + (r() - 0.5) * 2, y + h * (0.72 + r() * 0.32) - (i % 2 ? h * 0.14 : 0));
    poly(ctx, pts); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(x + w * 0.2, y + 3, w * 0.15, h * 0.6);
  }

  function chain(ctx, x, y0, len, col, lw = 1.4) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    for (let i = 0; i < len / 7; i++) { ctx.beginPath(); ctx.ellipse(x, y0 + i * 7, i % 2 ? 1.4 : 2.8, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
  }

  function lantern(ctx, x, y, col, glass, o) {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.fillRect(x - 5, y - 2, 10, 3);
    ctx.beginPath(); ctx.moveTo(x - 6, y + 1); ctx.lineTo(x - 4, y + 14); ctx.lineTo(x + 4, y + 14); ctx.lineTo(x + 6, y + 1); ctx.closePath();
    ctx.fillStyle = glass; ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(x - 5, y + 14, 10, 3);
    if (o && o.lights) o.lights.push([x, y + 8, 60]);
  }

  // Gnarled tree: ink trunk + layered watercolor foliage clusters (dark underside, lit top).
  function tree(ctx, x, base, h, trunk, leaves, r, a = 0.75) {
    const tips = [];
    const grow = (x0, y0, ang, len, w, d) => {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      const mx = (x0 + x1) / 2 + (r() - 0.5) * len * 0.25, my = (y0 + y1) / 2 + (r() - 0.5) * len * 0.1;
      Art.brush(ctx, [x0, y0, mx, my, x1, y1], w, { seed: r() * 99, taperStart: 0, taperEnd: 0.55, color: trunk });
      if (d <= 0 || len < 7) { tips.push([x1, y1]); return; }
      const n = 2 + (r() < 0.45 ? 1 : 0);
      for (let i = 0; i < n; i++) grow(x1, y1, ang + (r() - 0.5) * 1.2 - (x1 > x ? -0.08 : 0.08), len * (0.62 + r() * 0.16), w * 0.64, d - 1);
    };
    // roots
    for (let k = 0; k < 3; k++) Art.brush(ctx, [x, base - 4, x + (k - 1) * h * 0.08, base + 2], h * 0.03, { seed: k, taperStart: 0, taperEnd: 0.8, color: trunk });
    grow(x, base, -Math.PI / 2 + (r() - 0.5) * 0.25, h * 0.34, h * 0.075, 5);
    if (!leaves) return;
    // three passes: shadow mass, mid, highlights
    const passes = [[leaves[1] || leaves[0], 1.15, a * 0.85, 4], [leaves[0], 1, a, 0], [leaves[2] || leaves[0], 0.55, a * 0.8, -5]];
    for (const [col, sz, al, dy] of passes) {
      for (const [bx, by] of tips) {
        if (r() < 0.12) continue;
        Art.wash(ctx, bx + (r() - 0.5) * 18, by + dy + (r() - 0.5) * 10, h * (0.06 + r() * 0.07) * sz, h * (0.045 + r() * 0.05) * sz, col, al, r() * 999, 2);
      }
    }
    // stray leaves
    ctx.fillStyle = leaves[0];
    for (let i = 0; i < 14; i++) { ctx.globalAlpha = 0.6; ctx.fillRect(x + (r() - 0.5) * h * 0.8, base - r() * h * 0.7, 3, 2); }
    ctx.globalAlpha = 1;
  }

  function scaffold(ctx, x, base, w, h, col, r) {
    ctx.fillStyle = col; ctx.strokeStyle = col;
    ctx.fillRect(x, base - h, 7, h); ctx.fillRect(x + w - 7, base - h, 7, h);
    ctx.lineWidth = 3;
    for (let y = base - h; y < base; y += 64) {
      ctx.fillRect(x - 6, y, w + 12, 6);
      ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + w - 6, y + 60); ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- canvases
  function layerCanvas(room, factor) {
    const RW = room.w * T, RH = room.h * T;
    const M = 170;
    const w = U.VIEW_W + Math.max(0, RW - U.VIEW_W) * factor + M * 2;
    const h = U.VIEW_H + Math.max(0, RH - U.VIEW_H) * factor + M * 2;
    const s = BG.scale;
    const c = Art.canvas(w * s, h * s);
    const x = c.getContext("2d");
    x.scale(s, s);
    return { c, x, w, h, M, factor };
  }

  // ---------------------------------------------------------------- sky
  function makeSky(theme, r, o) {
    const W = U.VIEW_W, H = U.VIEW_H, s = BG.scale;
    const c = Art.canvas(W * s, H * s), x = c.getContext("2d");
    x.scale(s, s);
    const sc = SCENES[theme] || INTERIOR[theme];
    if (theme === "void") {
      x.fillStyle = vgrad(x, 0, H, ["#fbf7ee", "#f1e9da", "#d9cfbd"]); x.fillRect(0, 0, W, H);
      Art.glow(x, W * 0.3, H * 0.4, 600, "rgba(255,255,255,0.9)");
      for (let i = 0; i < 10; i++) Art.wash(x, r() * W, r() * H * 0.7, 140 + r() * 200, 30 + r() * 40, "#cfc4b0", 0.2, r() * 999);
      grain(x, W, H, 0.2);
      return c;
    }
    x.fillStyle = vgrad(x, 0, H, sc.sky); x.fillRect(0, 0, W, H);
    if (SCENES[theme] && !sc.pencil) {
      const [sx, sy] = sc.sun;
      Art.glow(x, W * sx, H * sy, 520, sc.sunCol + "0.85)");
      Art.glow(x, W * sx, H * sy, 160, "rgba(255,244,225,0.9)");
      // layered cloud banks: shadowed bodies with sunlit undersides
      for (let i = 0; i < 12; i++) {
        const cx = r() * W, cy = H * (0.08 + r() * 0.5), rx = 140 + r() * 260, ry = 16 + r() * 34;
        Art.wash(x, cx, cy, rx, ry, sc.clouds, 0.28, r() * 999, 3);
        Art.wash(x, cx + 10, cy + ry * 0.6, rx * 0.8, ry * 0.4, sc.cloudLit, 0.3, r() * 999, 2);
      }
      // light rays fanning from the sun
      x.save(); x.globalCompositeOperation = "screen";
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * (0.55 + r() * 0.9), len = 1400, spread = 0.03 + r() * 0.05;
        const g = x.createLinearGradient(W * sx, H * sy, W * sx + Math.cos(a) * len, H * sy + Math.sin(a) * len);
        g.addColorStop(0, "rgba(255,230,200,0.22)"); g.addColorStop(1, "rgba(255,230,200,0)");
        x.fillStyle = g;
        x.beginPath(); x.moveTo(W * sx, H * sy);
        x.lineTo(W * sx + Math.cos(a - spread) * len, H * sy + Math.sin(a - spread) * len);
        x.lineTo(W * sx + Math.cos(a + spread) * len, H * sy + Math.sin(a + spread) * len); x.fill();
      }
      x.restore();
      // distant birds
      x.strokeStyle = "rgba(40,30,45,0.45)"; x.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) { const bx = W * (0.3 + r() * 0.5), by = H * (0.15 + r() * 0.2), bs = 4 + r() * 4; x.beginPath(); x.moveTo(bx - bs, by); x.quadraticCurveTo(bx - bs / 2, by - bs * 0.6, bx, by); x.quadraticCurveTo(bx + bs / 2, by - bs * 0.6, bx + bs, by); x.stroke(); }
    } else if (sc.pencil) {
      x.strokeStyle = "rgba(80,120,170,0.16)"; x.lineWidth = 1.2;
      for (let y = 40; y < H; y += 34) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y + (r() - 0.5) * 2); x.stroke(); }
      x.strokeStyle = "rgba(170,60,50,0.3)"; x.lineWidth = 2; x.beginPath(); x.moveTo(90, 0); x.lineTo(92, H); x.stroke();
      for (let i = 0; i < 6; i++) Art.wash(x, r() * W, r() * H, 100 + r() * 200, 60 + r() * 120, "#b99a6a", 0.1, r() * 999);
    } else {
      for (let i = 0; i < 8; i++) Art.wash(x, r() * W, r() * H, 150 + r() * 220, 80 + r() * 140, "#000", 0.16, r() * 999);
      if (theme === "archive" || theme === "ash") Art.glow(x, W * 0.5, H * 0.95, 700, "rgba(240,100,40,0.4)");
      if ((theme === "canal" || theme === "cistern") && o.water) Art.glow(x, W * 0.5, H * 0.7, 700, "rgba(70,140,230,0.3)");
      if (theme === "bindery") Art.glow(x, W * 0.5, H * 0.3, 600, "rgba(255,190,120," + (0.18 + o.stage * 0.08) + ")");
    }
    grain(x, W, H, 0.18);
    return c;
  }

  // ---------------------------------------------------------------- outdoor layers
  function outdoorLayers(room, theme, r, o) {
    const sc = SCENES[theme];
    const out = [];
    const tall = !!sc.tall;
    const lightsOf = [];
    const glowLights = (L, list, col, k = 1) => {
      L.x.save(); L.x.globalCompositeOperation = "lighter";
      for (const [lx, ly, lr] of list) { Art.glow(L.x, lx, ly, lr * 1.6 * k, col + "0.35)"); Art.glow(L.x, lx, ly, lr * 0.35 * k, col + "0.6)"); }
      L.x.restore();
    };

    // FAR: cathedral skyline dissolving into haze
    {
      const L = layerCanvas(room, 0.1), x = L.x, lights = [];
      const base = L.h - L.M - 170;
      const fill = vgrad(x, base - 700, base + 60, sc.far);
      const o2 = { fill, win: "rgba(120,100,140,0.55)", winLit: "rgba(255,210,150,0.85)", lit: 0.25, lights };
      let px = -80;
      while (px < L.w + 100) {
        if (r() < 0.35) { cathedral(x, px + 120, base + 10, 0.7 + r() * 0.5, r, o2); px += 300 + r() * 120; }
        else { tower(x, px, base + 20, 18 + r() * 26, 120 + r() * (tall ? 380 : 220), 90 + r() * 160, r, o2); px += 40 + r() * 70; }
      }
      x.fillStyle = fill; x.fillRect(0, base + 10, L.w, L.h);
      glowLights(L, lights, "rgba(255,190,130,", 0.8);
      fogBand(x, L.w, base + 50, 180, sc.haze, 0.85);
      grain(x, L.w, L.h, 0.12);
      out.push(L);
    }
    // FAR2: second skyline, bridges & aqueducts, a little crisper
    {
      const L = layerCanvas(room, 0.24), x = L.x, lights = [];
      const base = L.h - L.M - 130;
      const fill = vgrad(x, base - 600, base + 40, sc.far2);
      const o2 = { fill, win: "rgba(70,55,85,0.6)", winLit: "rgba(255,196,130,0.9)", lit: 0.3, lights, lamps: true, lampCol: "rgba(255,200,130,0.9)" };
      archBridge(x, -50, L.w + 50, base - 150 - r() * 60, 170, 110 + r() * 40, o2);
      let px = -60;
      while (px < L.w + 80) {
        const k = r();
        if (k < 0.2) { cathedral(x, px + 100, base, 0.55 + r() * 0.3, r, o2); px += 250; }
        else if (k < 0.55) { tower(x, px, base, 20 + r() * 20, 110 + r() * (tall ? 300 : 160), 80 + r() * 110, r, o2); px += 50 + r() * 50; }
        else { const hh = house(x, px, base, 44 + r() * 50, 80 + r() * (tall ? 260 : 120), r, o2); px = hh.x + hh.w + r() * 20; }
      }
      x.fillStyle = fill; x.fillRect(0, base, L.w, L.h);
      glowLights(L, lights, "rgba(255,180,110,", 0.9);
      fogBand(x, L.w, base + 30, 150, sc.haze, 0.75);
      grain(x, L.w, L.h, 0.15);
      out.push(L);
    }
    // MID: crooked timber town, rope bridges, banners, trees
    {
      const L = layerCanvas(room, 0.45), x = L.x, lights = [];
      const base = L.h - L.M - 80;
      const fill = vgrad(x, base - 500, base + 40, sc.mid);
      const o2 = { fill, frame: "rgba(18,12,22,0.7)", lw: 1.6, outline: "rgba(14,9,18,0.85)", win: "rgba(20,14,26,0.75)", winLit: "rgba(255,190,110,1)", lit: 0.4, lights };
      const tops = [];
      let px = -50;
      while (px < L.w + 60) {
        const k = r();
        if (k < 0.12) { tower(x, px + 20, base, 30 + r() * 16, 160 + r() * (tall ? 380 : 180), 110 + r() * 80, r, o2); tops.push([px + 20, base - 250]); px += 90; }
        else if (k < 0.22) { tree(x, px + 40, base, 170 + r() * 90, "#2a2030", sc.leaves, r, 0.6); px += 90 + r() * 50; }
        else { const hh = house(x, px, base, 56 + r() * 60, 110 + r() * (tall ? 340 : 150), r, o2); tops.push([hh.x + hh.w / 2, hh.top + 20]); px = hh.x + hh.w + r() * 16 - 4; }
      }
      // rope bridges strung between rooftops
      for (let i = 0; i + 1 < tops.length; i += 2 + Math.floor(r() * 2)) {
        const [ax, ay] = tops[i], [bx, by] = tops[i + 1];
        if (bx - ax > 60 && bx - ax < 420) ropeBridge(x, ax, ay + 40, bx, by + 40, 18 + r() * 20, { fill: "rgba(35,26,38,0.9)", banner: sc.banner }, r);
      }
      x.fillStyle = fill; x.fillRect(0, base, L.w, L.h);
      // sun-side rim light on the silhouettes (only over painted pixels)
      lightPass(x, L.w, L.h, vgrad(x, base - 420, base, [sc.rim + "0.28)", sc.rim + "0.0)"]), "source-atop");
      glowLights(L, lights, "rgba(255,170,90,");
      fogBand(x, L.w, base + 10, 110, sc.haze, 0.55);
      grain(x, L.w, L.h, 0.2);
      out.push(L);
    }
    // NEAR: big ink-dark architecture, scaffolds, chains & lanterns, crimson trees and banners
    {
      const L = layerCanvas(room, 0.72), x = L.x, lights = [];
      const base = L.h - L.M + 30;
      const fill = vgrad(x, base - 700, base, sc.near);
      const o2 = { fill, frame: "rgba(0,0,0,0.6)", lw: 2.2, outline: "rgba(0,0,0,0.9)", win: "rgba(8,6,10,0.85)", winLit: "rgba(255,186,100,1)", lit: 0.3, winSkip: 0.55, lights, lanterns: true };
      let px = -80;
      while (px < L.w + 80) {
        const k = r();
        if (k < 0.34) {
          const hh = house(x, px, base, 70 + r() * 90, 240 + r() * (tall ? 560 : 220), r, o2);
          if (r() < 0.7) banner(x, hh.x + hh.w * (0.2 + r() * 0.5), hh.top + 90 + r() * 60, 20 + r() * 12, 70 + r() * 70, sc.banner, r);
          px = hh.x + hh.w + 20 + r() * 90;
        } else if (k < 0.6) { scaffold(x, px, base, 70 + r() * 60, 220 + r() * (tall ? 500 : 200), "#1f1822", r); px += 180 + r() * 120; }
        else if (k < 0.82) { tree(x, px + 60, base, 240 + r() * 150, "#171219", sc.leaves, r, 0.75); px += 200 + r() * 150; }
        else { tower(x, px + 30, base, 50 + r() * 20, 260 + r() * (tall ? 500 : 200), 140 + r() * 80, r, o2); px += 160 + r() * 100; }
      }
      // hanging chains with lanterns from the top of the layer
      for (let i = 0; i < 5; i++) {
        const cx = r() * L.w, len = 60 + r() * 160;
        chain(x, cx, L.M - 40, len, "#1a141c", 1.8);
        lantern(x, cx, L.M - 40 + len, "#1a141c", "rgba(255,190,110,0.95)", { lights });
      }
      x.fillStyle = fill; x.fillRect(0, base, L.w, L.h);
      lightPass(x, L.w, L.h, vgrad(x, base - 600, base - 100, [sc.rim + "0.18)", sc.rim + "0.0)"]), "source-atop");
      glowLights(L, lights, "rgba(255,160,80,", 1.1);
      grain(x, L.w, L.h, 0.25);
      out.push(L);
    }
    return out;
  }

  // Margin: an unfinished page — pencil & ink sketches of the borough that aren't done yet.
  function marginLayers(room, r) {
    const out = [];
    {
      const L = layerCanvas(room, 0.15), x = L.x;
      const base = L.h - L.M - 160;
      x.strokeStyle = "rgba(90,80,75,0.45)"; x.lineWidth = 1.3;
      // construction lines
      for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(0, base - i * 60 + (r() - 0.5) * 8); x.lineTo(L.w, base - i * 60 + (r() - 0.5) * 8); x.globalAlpha = 0.25; x.stroke(); }
      x.globalAlpha = 1;
      // sketched cathedral outlines (stroke-only rendering of the same architecture)
      const sketch = { fill: "rgba(0,0,0,0)" };
      let px = 40;
      while (px < L.w) {
        const s = 0.6 + r() * 0.5;
        x.save();
        x.fillStyle = "rgba(120,105,95,0.12)";
        const tmp = { fill: "rgba(120,105,95,0.13)", win: "rgba(90,80,75,0.2)", winLit: "rgba(90,80,75,0.2)", lit: 0 };
        if (r() < 0.4) cathedral(x, px + 100, base, s, r, tmp); else tower(x, px, base, 26 * s + 10, 180 * s + 60, 120 * s + 40, r, tmp);
        x.restore();
        // pencil hatching over the shapes
        Art.hatch(x, px - 40, base - 380, 260, 380, 7, -0.8, "rgba(90,80,75,1)", 0.12, 1, px);
        px += 240 + r() * 160;
      }
      out.push(L);
    }
    {
      const L = layerCanvas(room, 0.55), x = L.x;
      const notes = ["and then the colours left", "revise?", "the borough — draft 3", "(do not erase)", "blue → ???", "who drew this", "finish later", "the gutter hums", "lamps: exactly as before", "not finished. not finished."];
      for (let i = 0; i < 18; i++) {
        const nx = r() * L.w, ny = L.M + 60 + r() * (L.h - L.M * 2 - 220);
        x.save(); x.translate(nx, ny); x.rotate((r() - 0.5) * 0.3);
        Art.text(x, U.pick(notes, r), 0, 0, 24 + r() * 12, { color: "rgba(40,30,25,0.38)" });
        if (r() < 0.35) { x.fillStyle = "rgba(40,30,25,0.45)"; Art.brush(x, [-10, -8, 60, -12, 150, -6], 3, { seed: i }); }
        x.restore();
      }
      for (let i = 0; i < 12; i++) Art.splat(x, r() * L.w, L.M + r() * (L.h - L.M * 2), 5 + r() * 16, "rgba(20,15,12,0.4)", r() * 99, 6);
      // half-drawn lamp posts and a crooked fence, inked but unshaded
      x.strokeStyle = "rgba(30,24,20,0.5)"; x.lineWidth = 2;
      const gy = L.h - L.M - 60;
      for (let px = 60; px < L.w; px += 220 + r() * 200) {
        x.beginPath(); x.moveTo(px, gy); x.lineTo(px + 1, gy - 120); x.quadraticCurveTo(px + 14, gy - 130, px + 22, gy - 118); x.stroke();
        x.strokeRect(px + 16, gy - 118, 12, 16);
      }
      out.push(L);
    }
    return out;
  }

  // ---------------------------------------------------------------- interiors
  function interiorLayers(room, theme, r, o) {
    const sc = INTERIOR[theme];
    const out = [];
    const water = o.water && (theme === "canal" || theme === "cistern");
    // FAR: receding vaults / stacks, with depth fog and light
    {
      const L = layerCanvas(room, 0.3), x = L.x, lights = [];
      const fill = vgrad(x, 0, L.h, sc.far);
      x.fillStyle = fill;
      if (theme === "bindery" || theme === "archive") {
        for (let bx = -30; bx < L.w; bx += 150 + r() * 40) {
          x.fillStyle = fill; x.fillRect(bx, L.M - 80, 120, L.h);
          for (let sy = L.M - 60; sy < L.h; sy += 46) {
            let kx = bx + 5;
            while (kx < bx + 112) { const bw = 5 + r() * 7, bh = 22 + r() * 16; x.fillStyle = "rgba(0,0,0," + (0.15 + r() * 0.25) + ")"; x.fillRect(kx, sy + 40 - bh, bw, bh); kx += bw + 1; }
            x.fillStyle = "rgba(0,0,0,0.35)"; x.fillRect(bx, sy + 40, 120, 4);
          }
          if (theme === "archive" && r() < 0.6) lights.push([bx + 60, L.M + 200 + r() * 300, 80]);
        }
        if (theme === "bindery") for (let i = 0; i < 6; i++) lights.push([r() * L.w, L.M + 80 + r() * 200, 50]);
      } else {
        // vault arches receding: three rows at decreasing contrast
        for (let row = 0; row < 3; row++) {
          const aw = 150 + row * 60, top = L.M + 40 + row * 30;
          x.fillStyle = vgrad(x, top, L.h, [sc.far[0], sc.far[1]]);
          x.globalAlpha = 0.5 + row * 0.25;
          for (let ax = -aw + row * 40; ax < L.w + aw; ax += aw) {
            x.fillRect(ax, top, aw * 0.16, L.h);
            x.beginPath(); x.moveTo(ax, top + 160); x.quadraticCurveTo(ax + aw / 2, top - 40, ax + aw, top + 160); x.lineTo(ax + aw, top); x.lineTo(ax, top); x.fill();
          }
          x.globalAlpha = 1;
        }
        if (theme === "ash") for (let i = 0; i < 9; i++) lights.push([r() * L.w, L.M + 180 + r() * 240, 60]);
        if (water) for (let i = 0; i < 8; i++) lights.push([r() * L.w, L.M + 300 + r() * 200, 70]);
      }
      x.save(); x.globalCompositeOperation = "lighter";
      for (const [lx, ly, lr] of lights) Art.glow(x, lx, ly, lr * 2, (water ? sc.water : sc.glow) + "0.35)");
      x.restore();
      fogBand(x, L.w, L.h - L.M - 60, 240, sc.haze, 0.5);
      grain(x, L.w, L.h, 0.25);
      out.push(L);
    }
    // MID: the detailed back wall
    {
      const L = layerCanvas(room, 0.78), x = L.x, lights = [];
      const W = L.w, H = L.h;
      x.fillStyle = vgrad(x, 0, H, sc.mid); x.fillRect(0, 0, W, H);
      // ashlar stonework with lit top edges
      for (let yy = 0; yy < H; yy += 26) {
        const off = (yy / 26) % 2 ? 0 : 30;
        for (let xx = -off; xx < W; xx += 60) {
          const shade = (r() - 0.5) * 0.12;
          x.fillStyle = shade > 0 ? "rgba(255,255,255," + shade * 0.4 + ")" : "rgba(0,0,0," + -shade + ")";
          x.fillRect(xx + 1, yy + 1, 58, 24);
          x.fillStyle = "rgba(255,240,220,0.05)"; x.fillRect(xx + 1, yy + 1, 58, 2);
          x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(xx, yy + 24, 60, 2); x.fillRect(xx + 58, yy, 2, 26);
        }
      }
      for (let i = 0; i < 16; i++) Art.wash(x, r() * W, r() * H, 80 + r() * 180, 60 + r() * 140, "#000", 0.16, r() * 999);
      // pillars & arches framing bays
      const bay = theme === "bindery" ? 420 : 340;
      for (let bx = 60; bx < W; bx += bay) {
        x.fillStyle = "rgba(0,0,0,0.35)"; x.fillRect(bx - 22, 0, 44, H);
        x.fillStyle = "rgba(255,230,200,0.06)"; x.fillRect(bx - 22, 0, 6, H);
        x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(bx - 30, L.M + 120, 60, 14);
      }
      if (theme === "canal" || theme === "cistern" || theme === "ash") {
        // arched openings in alternate bays reveal the receding vaults behind
        for (let k = 2; 60 + k * bay < W + bay; k += 2) {
          const ax = 60 + (k - 0.5) * bay, aw = bay * 0.55, top = L.M + 70, bot = H;
          x.save(); x.globalCompositeOperation = "destination-out";
          x.beginPath(); x.moveTo(ax - aw / 2, bot); x.lineTo(ax - aw / 2, top + aw * 0.55); x.quadraticCurveTo(ax - aw / 2, top, ax, top - aw * 0.12); x.quadraticCurveTo(ax + aw / 2, top, ax + aw / 2, top + aw * 0.55); x.lineTo(ax + aw / 2, bot); x.closePath(); x.fill();
          x.restore();
          // voussoirs & jambs around the opening
          x.strokeStyle = "rgba(0,0,0,0.55)"; x.lineWidth = 3;
          x.beginPath(); x.moveTo(ax - aw / 2, bot); x.lineTo(ax - aw / 2, top + aw * 0.55); x.quadraticCurveTo(ax - aw / 2, top, ax, top - aw * 0.12); x.quadraticCurveTo(ax + aw / 2, top, ax + aw / 2, top + aw * 0.55); x.lineTo(ax + aw / 2, bot); x.stroke();
          x.strokeStyle = "rgba(255,235,210,0.08)"; x.lineWidth = 8; x.stroke();
          for (let j = 0; j < 9; j++) {
            const t = j / 8, cx = ax + (t - 0.5) * aw, cy = top + aw * 0.55 - Math.sin(t * Math.PI) * aw * 0.62;
            x.strokeStyle = "rgba(0,0,0,0.45)"; x.lineWidth = 1.5;
            x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + (t - 0.5) * 22, cy - 16); x.stroke();
          }
          // a hanging chain in the opening
          chain(x, ax + (r() - 0.5) * aw * 0.5, top - 10, 80 + r() * 120, "rgba(10,10,14,0.9)", 1.6);
        }
      }
      if (theme === "canal" || theme === "cistern") {
        // river murals (in the solid bays): pale ghosts when dry, luminous blue watercolor when restored
        for (let i = 0; i < Math.floor(W / 340); i += 2) {
          const mx = 60 + (i + 0.5) * bay, my = L.M + 200 + r() * 60;
          x.strokeStyle = "rgba(0,0,0,0.4)"; x.lineWidth = 4; x.strokeRect(mx - 120, my - 50, 240, 120);
          if (water) { Art.wash(x, mx, my + 10, 120, 55, "#3f7fc0", 0.6, r() * 99); Art.wash(x, mx - 30, my + 30, 60, 20, "#8fc3ea", 0.5, r() * 99); }
          x.strokeStyle = water ? "rgba(200,232,255,0.9)" : "rgba(210,215,220,0.28)"; x.lineWidth = 2;
          x.beginPath();
          for (let k = 0; k < 4; k++) {
            const fx = mx - 90 + k * 55, fy = my + (k % 2) * 18;
            x.moveTo(fx - 16, fy); x.quadraticCurveTo(fx, fy - 11, fx + 16, fy); x.quadraticCurveTo(fx, fy + 11, fx - 16, fy);
            x.moveTo(fx - 16, fy); x.lineTo(fx - 25, fy - 7); x.lineTo(fx - 25, fy + 7); x.closePath();
          }
          x.moveTo(mx - 115, my + 50); for (let k = 0; k <= 12; k++) x.lineTo(mx - 115 + k * 19, my + 50 + Math.sin(k) * 5);
          x.stroke();
          if (water) lights.push([mx, my, 140]);
        }
        // pipes & grates
        for (let i = 0; i < W / 300; i++) {
          const px = r() * W;
          x.fillStyle = "rgba(15,18,22,0.85)"; x.fillRect(px, 0, 18, L.M + 150 + r() * 120);
          x.fillStyle = "rgba(160,180,200,0.12)"; x.fillRect(px + 2, 0, 3, L.M + 150);
        }
      }
      if (theme === "bindery") bindery(x, L, r, o.stage, lights);
      if (theme === "archive" || theme === "ash") {
        for (let sx = 40; sx < W; sx += 280 + r() * 100) {
          x.fillStyle = "#170d09"; x.fillRect(sx, L.M + 40, 170, H);
          for (let sy = L.M + 70; sy < H; sy += 60) {
            let bx = sx + 8;
            while (bx < sx + 160) { const bw = 6 + r() * 10, bh = 26 + r() * 26; x.fillStyle = U.pick(["#3a1d14", "#2a1a14", "#5a2a1a", "#241612", "#4a2012"], r); x.fillRect(bx, sy + 52 - bh, bw, bh); if (r() < 0.12) { x.fillStyle = "rgba(255,120,50,0.8)"; x.fillRect(bx, sy + 52 - bh, bw, 3); } bx += bw + 1 + (r() < 0.2 ? 12 : 0); }
            x.fillStyle = "#0e0806"; x.fillRect(sx, sy + 52, 170, 6);
          }
          lights.push([sx + 85, L.M + 300 + r() * 200, 120]);
        }
        if (theme === "archive") {
          const cx = W * 0.3, cy = L.M + 200;
          x.save(); x.globalCompositeOperation = "lighter"; Art.glow(x, cx, cy, 300, "rgba(255,120,50,0.6)"); x.restore();
          x.strokeStyle = "#120806"; x.lineWidth = 12; x.beginPath(); x.arc(cx, cy, 160, 0, Math.PI * 2); x.stroke();
          x.lineWidth = 5; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 160, cy + Math.sin(a) * 160); x.stroke(); }
          x.beginPath(); x.arc(cx, cy, 60, 0, Math.PI * 2); x.stroke();
        }
      }
      x.save(); x.globalCompositeOperation = "lighter";
      for (const [lx, ly, lr] of lights) Art.glow(x, lx, ly, lr, (water ? sc.water : sc.glow) + "0.3)");
      x.restore();
      fogBand(x, W, H - L.M - 30, 200, sc.haze, 0.35);
      grain(x, W, H, 0.3);
      out.push(L);
    }
    return out;
  }

  function bindery(x, L, r, st, lights) {
    const W = L.w;
    // tall arched window pouring warm light
    const wx = W * 0.5, wy = L.M + 120;
    x.save(); x.globalCompositeOperation = "lighter";
    const g = x.createLinearGradient(wx, wy, wx + 260, wy + 520);
    g.addColorStop(0, "rgba(255,210,150," + (0.25 + st * 0.08) + ")"); g.addColorStop(1, "rgba(255,210,150,0)");
    x.fillStyle = g; x.beginPath(); x.moveTo(wx - 90, wy + 40); x.lineTo(wx + 90, wy + 40); x.lineTo(wx + 380, wy + 620); x.lineTo(wx + 40, wy + 620); x.fill();
    x.restore();
    x.fillStyle = "rgba(255,214,160," + (0.35 + st * 0.12) + ")";
    x.beginPath(); x.moveTo(wx - 100, wy + 300); x.lineTo(wx - 100, wy + 40); x.quadraticCurveTo(wx, wy - 100, wx + 100, wy + 40); x.lineTo(wx + 100, wy + 300); x.fill();
    x.strokeStyle = "#1a110c"; x.lineWidth = 8; x.stroke();
    x.lineWidth = 3; x.beginPath(); x.moveTo(wx, wy - 50); x.lineTo(wx, wy + 300);
    for (let k = 0; k < 5; k++) { x.moveTo(wx - 100, wy + 40 + k * 55); x.lineTo(wx + 100, wy + 40 + k * 55); }
    x.stroke();
    lights.push([wx, wy + 120, 260]);
    // heavy curtains
    for (const s of [-1, 1]) {
      x.fillStyle = "#5a1f18";
      x.beginPath(); x.moveTo(wx + s * 100, wy - 60); x.quadraticCurveTo(wx + s * 150, wy + 150, wx + s * 120, wy + 340); x.lineTo(wx + s * 170, wy + 340); x.lineTo(wx + s * 170, wy - 60); x.fill();
      x.strokeStyle = "rgba(0,0,0,0.35)"; x.lineWidth = 2; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(wx + s * (115 + k * 13), wy - 50); x.quadraticCurveTo(wx + s * (150 + k * 6), wy + 150, wx + s * (130 + k * 10), wy + 330); x.stroke(); }
    }
    // bookshelves floor to ceiling
    for (const sx of [40, W * 0.5 + 200, W - 330]) {
      x.fillStyle = "#24170f"; x.fillRect(sx, L.M + 40, 260, 520);
      x.fillStyle = "rgba(255,210,160,0.08)"; x.fillRect(sx, L.M + 40, 260, 6);
      for (let sy = L.M + 60; sy < L.M + 540; sy += 64) {
        let bx = sx + 10;
        while (bx < sx + 245) {
          const bw = 7 + r() * 11, bh = 36 + r() * 20;
          if (!(st < 1 && r() < 0.3)) {
            const blue = st >= 2 && r() < 0.4;
            x.fillStyle = blue ? U.pick(["#2d5d8f", "#3a70a8", "#24476f"], r) : U.pick(["#6e2a22", "#5a4a36", "#7a5a30", "#3e3a30", "#8a7a5a", "#4a2a24"], r);
            x.globalAlpha = st === 0 ? 0.55 : 1;
            if (r() < 0.1) { x.save(); x.translate(bx, sy + 56); x.rotate(-0.25); x.fillRect(0, -bh, bw, bh); x.restore(); }
            else x.fillRect(bx, sy + 56 - bh, bw, bh);
            x.fillStyle = "rgba(255,230,180,0.25)"; x.fillRect(bx + 1, sy + 56 - bh + 6, bw - 2, 2);
            x.globalAlpha = 1;
          }
          bx += bw + 1;
        }
        x.fillStyle = "#120b07"; x.fillRect(sx, sy + 56, 260, 8);
      }
      // library ladder
      x.strokeStyle = "#3a2618"; x.lineWidth = 4;
      x.beginPath(); x.moveTo(sx + 200, L.M + 40); x.lineTo(sx + 230, L.M + 560); x.moveTo(sx + 225, L.M + 40); x.lineTo(sx + 255, L.M + 560); x.stroke();
      x.lineWidth = 3; for (let k = 0; k < 12; k++) { const t = k / 12; x.beginPath(); x.moveTo(sx + 200 + 30 * t, L.M + 40 + 520 * t); x.lineTo(sx + 225 + 30 * t, L.M + 40 + 520 * t); x.stroke(); }
    }
    // hanging lamps
    for (let i = 0; i < 3 + st; i++) {
      const lx = 160 + ((i + 0.5) * (W - 320)) / (3 + st), len = 60 + r() * 60;
      chain(x, lx, L.M - 60, len, "#140c08", 1.6);
      lantern(x, lx, L.M - 60 + len, "#140c08", "rgba(255,200,120,0.95)");
      lights.push([lx, L.M - 60 + len + 8, 90]);
    }
    // strings of drying pages
    x.strokeStyle = "rgba(20,14,10,0.6)"; x.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) {
      const y0 = L.M + 30 + k * 40;
      x.beginPath(); x.moveTo(0, y0); x.quadraticCurveTo(W / 2, y0 + 50, W, y0); x.stroke();
      const n = 8 + st * 5;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, px = t * W, py = y0 + 4 * 50 * t * (1 - t);
        x.save(); x.translate(px, py); x.rotate((r() - 0.5) * 0.3);
        x.fillStyle = st >= 2 && r() < 0.3 ? "#cfe0ee" : "#e8dcc2"; x.fillRect(-10, 0, 20, 26);
        x.strokeStyle = "rgba(20,14,10,0.5)"; x.strokeRect(-10, 0, 20, 26);
        x.restore();
      }
    }
    if (st >= 3) for (let i = 0; i < 6; i++) Art.wash(x, r() * W, L.M + r() * 300, 70, 40, U.pick(["#3a70a8", "#b0453a", "#d9a441"], r), 0.25, r() * 99);
  }

  function voidLayers(room, r) {
    const out = [];
    {
      const L = layerCanvas(room, 0.12), x = L.x;
      for (let i = 0; i < 16; i++) {
        const px = r() * L.w, py = L.M + r() * (L.h - L.M * 2 - 200), w = 90 + r() * 240, h = w * 1.3;
        x.save(); x.translate(px, py); x.rotate((r() - 0.5) * 0.9);
        x.fillStyle = "rgba(0,0,0,0.08)"; x.fillRect(-w / 2 + 12, -h / 2 + 14, w, h);
        x.fillStyle = "rgba(236,227,208,0.95)"; x.fillRect(-w / 2, -h / 2, w, h);
        x.strokeStyle = "rgba(60,50,45,0.35)"; x.lineWidth = 1;
        for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(-w / 2 + 12, -h / 2 + 22 + (k * h) / 11); x.lineTo(w / 2 - 12 - r() * 40, -h / 2 + 22 + (k * h) / 11); x.stroke(); }
        if (r() < 0.5) Art.splat(x, (r() - 0.5) * w * 0.5, (r() - 0.5) * h * 0.5, 10 + r() * 20, "rgba(18,13,11,0.6)", r() * 99, 6);
        x.restore();
      }
      const g = x.createLinearGradient(0, L.h - L.M - 280, 0, L.h - L.M);
      g.addColorStop(0, "rgba(18,13,11,0)"); g.addColorStop(1, "rgba(18,13,11,0.85)");
      x.fillStyle = g; x.fillRect(0, L.h - L.M - 280, L.w, 280 + L.M);
      x.fillStyle = "#120d0b";
      for (let i = 0; i < 26; i++) { Art.blobPath(x, r() * L.w, L.h - L.M + 40 - r() * 60, 60 + r() * 110, 30 + r() * 50, r() * 99, 16, 0.4); x.fill(); }
      for (let i = 0; i < 12; i++) {
        const bx = r() * L.w, by = L.h - L.M;
        Art.brush(x, [bx, by, bx + (r() - 0.5) * 50, by - 90 - r() * 90, bx + (r() - 0.5) * 90, by - 160 - r() * 160], 4 + r() * 6, { seed: i, taperStart: 0, color: "#120d0b" });
      }
      out.push(L);
    }
    return out;
  }

  // Foreground: hanging tatters, chains and branches in front of the play space.
  function foreground(room, theme, r) {
    if (!["dusk", "bridge", "spire", "gardens", "archive", "ash", "canal", "bindery"].includes(theme)) return null;
    const L = layerCanvas(room, 1.12), x = L.x;
    x.translate(0, L.M);
    const dark = theme === "archive" || theme === "ash" ? "rgba(16,9,6,0.95)" : theme === "canal" ? "rgba(10,13,17,0.95)" : "rgba(22,16,20,0.94)";
    // ragged ceiling cloth / torn paper
    x.fillStyle = dark;
    for (let px = -20; px < L.w; px += 40 + r() * 120) {
      const w = 26 + r() * 70, h = 26 + r() * 100;
      const pts = [px, -5, px + w, -5];
      const n = 4 + Math.floor(r() * 3);
      for (let i = n; i >= 0; i--) pts.push(px + (w * i) / n + (r() - 0.5) * 8, h * (0.45 + r() * 0.55));
      poly(x, pts); x.fill();
      if (r() < 0.35) x.fillRect(px + w * r(), 0, 1.5, h * (1 + r()));
    }
    if (theme !== "canal") {
      const col = theme === "gardens" ? "rgba(150,95,90,0.95)" : theme === "archive" || theme === "ash" ? "rgba(60,20,12,0.95)" : "rgba(112,26,22,0.95)";
      for (let i = 0; i < 5; i++) banner(x, r() * L.w, -5, 28 + r() * 22, 130 + r() * 130, col, r);
    }
    for (let i = 0; i < 4; i++) chain(x, r() * L.w, -5, 80 + r() * 160, dark, 2.4);
    return L;
  }

  // tree painter shared with world props (crimson by default, faded in the gardens)
  BG.tree = (ctx, x, base, h, faded, seed) => {
    const r = U.rng(seed);
    const leaves = faded ? SCENES.gardens.leaves : DUSK.leaves;
    tree(ctx, x, base, h, "#16111a", leaves, r, faded ? 0.6 : 0.78);
  };
  BG.banner = banner;
  BG.lantern = lantern;

  BG.build = (room, flags, stage) => {
    const theme = room.theme;
    const r = U.rng(U.strSeed(room.id + ":" + theme));
    const o = { water: !!flags.pigment_water, stage, lights: [] };
    const sky = makeSky(theme, r, o);
    let layers;
    if (theme === "void") layers = voidLayers(room, r);
    else if (theme === "margin") layers = marginLayers(room, r);
    else if (INTERIOR[theme]) layers = interiorLayers(room, theme, r, o);
    else layers = outdoorLayers(room, theme, r, o);
    const fg = foreground(room, theme, r);
    return { sky, layers, fg, lights: o.lights };
  };

  BG.draw = (ctx, bg, cam) => {
    for (const L of bg.layers) ctx.drawImage(L.c, cam.x * (1 - L.factor) - L.M, cam.y * (1 - L.factor) - L.M, L.w, L.h);
  };
  BG.drawFg = (ctx, bg, cam) => {
    const L = bg.fg;
    if (!L) return;
    ctx.drawImage(L.c, cam.x * (1 - L.factor) - L.M, cam.y * (1 - L.factor) - L.M, L.w, L.h);
  };
})();
