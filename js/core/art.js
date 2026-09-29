// Art toolkit: every visual in the game is produced from these ink / watercolor / paper
// primitives. Lines "boil" (re-jitter ~10 times a second) to feel frame-by-frame hand drawn.
(function () {
  const LD = window.LD;
  const U = LD.U;

  const Art = (LD.Art = {
    INK: "#15100d",
    INK2: "#2a211c",
    PAPER: "#ece1c9",
    PAPER_D: "#d6c7a6",
    BLOOD: "#9c2a22",
    WATER: "#3f7fc0",
    WATER_L: "#8fc3ea",
    FIRE: "#e0662a",
    EMBER: "#ffb35a",
    HAND: '"Caveat", "Segoe Print", "Bradley Hand", cursive',
    TITLE: '"IM Fell English SC", "IM Fell English", Georgia, serif',
    SERIF: '"IM Fell English", Georgia, serif',
    time: 0,
    boil: 0,
    highContrast: false,
  });

  Art.tick = (t) => { Art.time = t; Art.boil = Math.floor(t * 10); };

  Art.canvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  // Variable-width tapered brush stroke along a polyline (flat array x0,y0,x1,y1…).
  Art.brush = (ctx, p, width, o = {}) => {
    const n = p.length / 2;
    if (n < 2) return;
    const seed = o.seed || 0, jit = o.jitter == null ? 0.35 : o.jitter;
    const t0 = o.taperStart == null ? 0.25 : o.taperStart, t1 = o.taperEnd == null ? 0.3 : o.taperEnd;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      let tx = p[b * 2] - p[a * 2], ty = p[b * 2 + 1] - p[a * 2 + 1];
      const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
      const t = i / (n - 1);
      let taper = 1;
      if (t0 > 0 && t < t0) taper = 0.25 + 0.75 * (t / t0);
      if (t1 > 0 && t > 1 - t1) taper = Math.min(taper, 0.2 + 0.8 * ((1 - t) / t1));
      const w = width * taper * (1 + (U.hash(i * 3.1 + seed) - 0.5) * jit) * 0.5;
      L.push(p[i * 2] - ty * w, p[i * 2 + 1] + tx * w);
      R.push(p[i * 2] + ty * w, p[i * 2 + 1] - tx * w);
    }
    ctx.beginPath();
    ctx.moveTo(L[0], L[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i * 2], L[i * 2 + 1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i * 2], R[i * 2 + 1]);
    ctx.closePath();
    if (o.color) ctx.fillStyle = o.color;
    ctx.fill();
  };

  // Simple two-point ink line.
  Art.line = (ctx, x1, y1, x2, y2, w, seed = 0, color) => {
    const mx = (x1 + x2) / 2 + (U.hash(seed + 1) - 0.5) * w * 1.5;
    const my = (y1 + y2) / 2 + (U.hash(seed + 2) - 0.5) * w * 1.5;
    Art.brush(ctx, [x1, y1, mx, my, x2, y2], w, { seed, color });
  };

  // Rough stroked polyline (two passes, like a quick pen sketch).
  Art.sketch = (ctx, p, lw, color, seed = 0, amp = 1.2, closed = false, passes = 2) => {
    ctx.strokeStyle = color;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let k = 0; k < passes; k++) {
      ctx.lineWidth = k === 0 ? lw : lw * 0.55;
      ctx.globalAlpha *= k === 0 ? 1 : 0.6;
      ctx.beginPath();
      const n = p.length / 2;
      for (let i = 0; i < n; i++) {
        const jx = (U.hash(seed + i * 7.3 + k * 91) - 0.5) * amp * 2;
        const jy = (U.hash(seed + i * 3.7 + k * 57) - 0.5) * amp * 2;
        if (i === 0) ctx.moveTo(p[0] + jx, p[1] + jy); else ctx.lineTo(p[i * 2] + jx, p[i * 2 + 1] + jy);
      }
      if (closed) ctx.closePath();
      ctx.stroke();
      if (k > 0) ctx.globalAlpha /= 0.6;
    }
  };

  // Irregular blob path (not filled) — the base of watercolor washes and ink pools.
  Art.blobPath = (ctx, cx, cy, rx, ry, seed = 0, verts = 18, irr = 0.25) => {
    ctx.beginPath();
    for (let i = 0; i <= verts; i++) {
      const a = (i / verts) * Math.PI * 2;
      const r = 1 + (U.noise1(seed + i * 0.9) - 0.5) * irr * 2;
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // Watercolor wash: layered translucent blobs with a darker pigment rim.
  Art.wash = (ctx, x, y, rx, ry, color, alpha = 0.3, seed = 0, layers = 3) => {
    ctx.save();
    ctx.fillStyle = color;
    for (let l = 0; l < layers; l++) {
      ctx.globalAlpha = alpha / layers * (1 + l * 0.3);
      const s = 1 - l * 0.18;
      Art.blobPath(ctx, x + (U.hash(seed + l) - 0.5) * rx * 0.2, y + (U.hash(seed + l + 9) - 0.5) * ry * 0.2, rx * s, ry * s, seed + l * 13, 22, 0.22);
      ctx.fill();
    }
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    Art.blobPath(ctx, x, y, rx, ry, seed, 22, 0.22);
    ctx.stroke();
    ctx.restore();
  };

  Art.splat = (ctx, x, y, r, color, seed = 0, drops = 6) => {
    ctx.fillStyle = color;
    Art.blobPath(ctx, x, y, r, r * 0.85, seed, 16, 0.35); ctx.fill();
    for (let i = 0; i < drops; i++) {
      const a = U.hash(seed + i * 5) * Math.PI * 2, d = r * (1.1 + U.hash(seed + i * 9) * 1.2);
      const rr = r * (0.08 + U.hash(seed + i * 3) * 0.18);
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, Math.PI * 2); ctx.fill();
    }
  };

  Art.hatch = (ctx, x, y, w, h, gap, angle, color, alpha = 0.3, lw = 1, seed = 0) => {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = color; ctx.globalAlpha *= alpha; ctx.lineWidth = lw; ctx.lineCap = "round";
    const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2 + 4;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    ctx.beginPath();
    let i = 0;
    for (let d = -R; d <= R; d += gap, i++) {
      const j = (U.hash(seed + i) - 0.5) * gap * 0.5;
      const l0 = -R * (0.7 + U.hash(seed + i * 2) * 0.3), l1 = R * (0.7 + U.hash(seed + i * 3) * 0.3);
      ctx.moveTo(cx + ca * l0 - sa * (d + j), cy + sa * l0 + ca * (d + j));
      ctx.lineTo(cx + ca * l1 - sa * (d + j), cy + sa * l1 + ca * (d + j));
    }
    ctx.stroke();
    ctx.restore();
  };

  // Soft light: a cached radial sprite per color, scaled on draw (cheap enough for many embers).
  const glowCache = new Map();
  function glowSprite(color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = Art.canvas(64, 64);
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    if (glowCache.size > 300) glowCache.clear();
    glowCache.set(color, c);
    return c;
  }
  Art.glow = (ctx, x, y, r, color, alpha = 1) => {
    if (r <= 0 || alpha <= 0) return;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = prev;
  };

  Art.text = (ctx, str, x, y, size, o = {}) => {
    ctx.save();
    ctx.font = (o.weight || "") + " " + size + "px " + (o.font === "title" ? Art.TITLE : o.font === "serif" ? Art.SERIF : Art.HAND);
    ctx.textAlign = o.align || "left";
    ctx.textBaseline = o.baseline || "alphabetic";
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.outline) { ctx.lineWidth = o.outline; ctx.strokeStyle = o.outlineColor || Art.PAPER; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || Art.INK;
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  // Text with ~~strikethrough~~ spans, wrapped to width. Returns height used.
  Art.richText = (ctx, str, x, y, size, maxW, o = {}) => {
    ctx.save();
    ctx.font = size + "px " + (o.font === "serif" ? Art.SERIF : Art.HAND);
    ctx.fillStyle = o.color || Art.INK;
    ctx.textBaseline = "alphabetic";
    const tokens = [];
    str.split(/(~~[^~]+~~)/).forEach((part) => {
      const struck = part.startsWith("~~");
      const txt = struck ? part.slice(2, -2) : part;
      txt.split(/(\s+)/).forEach((w) => { if (w) tokens.push({ w, struck }); });
    });
    const lh = size * 1.18;
    let cx = x, cy = y;
    for (const t of tokens) {
      if (t.w === "\n") { cx = x; cy += lh; continue; }
      const ww = ctx.measureText(t.w).width;
      if (/^\s+$/.test(t.w)) { if (cx > x) cx += ww; continue; }
      if (cx + ww > x + maxW && cx > x) { cx = x; cy += lh; }
      ctx.fillText(t.w, cx, cy);
      if (t.struck) {
        ctx.save();
        ctx.fillStyle = o.color || Art.INK;
        Art.brush(ctx, [cx - 2, cy - size * 0.3, cx + ww / 2, cy - size * 0.36, cx + ww + 2, cy - size * 0.28], 3, { seed: cx, taperStart: 0.1, taperEnd: 0.1 });
        ctx.restore();
      }
      cx += ww;
    }
    ctx.restore();
    return cy - y + lh;
  };

  // ---------------------------------------------------------------- paper
  let grain = null;
  Art.grain = () => {
    if (grain) return grain;
    const s = 256, c = Art.canvas(s, s), x = c.getContext("2d");
    const img = x.createImageData(s, s), d = img.data;
    for (let i = 0; i < s * s; i++) {
      const v = 200 + Math.random() * 55;
      d[i * 4] = v; d[i * 4 + 1] = v * 0.96; d[i * 4 + 2] = v * 0.88; d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.globalAlpha = 0.25; x.strokeStyle = "#8a7656"; x.lineWidth = 0.6;
    const r = U.rng(7);
    for (let i = 0; i < 90; i++) {
      const px = r() * s, py = r() * s, a = r() * Math.PI, l = 4 + r() * 16;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + 2, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    grain = c;
    return c;
  };

  // A parchment sheet with watercolor stains, used for UI panels and title screens.
  const panelCache = new Map();
  Art.parchment = (w, h, seed = 1, o = {}) => {
    const key = w + "x" + h + ":" + seed + ":" + (o.torn ? 1 : 0) + (o.dark ? 1 : 0);
    if (panelCache.has(key)) return panelCache.get(key);
    const c = Art.canvas(w, h), x = c.getContext("2d");
    const r = U.rng(seed);
    const pad = o.torn ? 10 : 0;
    // torn outline
    x.beginPath();
    const pts = [];
    const edge = (x0, y0, x1, y1, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const j = o.torn ? (r() - 0.5) * 7 + (r() < 0.08 ? (r() - 0.5) * 12 : 0) : 0;
        const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny);
        pts.push(U.lerp(x0, x1, t) + (nx / nl) * j, U.lerp(y0, y1, t) + (ny / nl) * j);
      }
    };
    edge(pad, pad, w - pad, pad, Math.ceil(w / 14));
    edge(w - pad, pad, w - pad, h - pad, Math.ceil(h / 14));
    edge(w - pad, h - pad, pad, h - pad, Math.ceil(w / 14));
    edge(pad, h - pad, pad, pad, Math.ceil(h / 14));
    const outline = new Path2D();
    outline.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) outline.lineTo(pts[i], pts[i + 1]);
    outline.closePath();
    x.save();
    x.shadowColor = "rgba(0,0,0,0.35)"; x.shadowBlur = o.torn ? 10 : 0;
    x.fillStyle = o.dark ? "#2b231d" : "#e9dcc0";
    x.fill(outline);
    x.restore();
    x.save();
    x.clip(outline);
    x.globalCompositeOperation = "multiply";
    x.fillStyle = x.createPattern(Art.grain(), "repeat");
    x.globalAlpha = o.dark ? 0.5 : 0.55;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "source-over";
    for (let i = 0; i < 6; i++) {
      Art.wash(x, r() * w, r() * h, 40 + r() * w * 0.25, 30 + r() * h * 0.25, o.dark ? "#000" : U.pick(["#b99a6a", "#a88d62", "#c7a978", "#9f8f7a"], r), 0.12, r() * 999);
    }
    // edge burn
    const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, o.dark ? "rgba(0,0,0,0.5)" : "rgba(90,60,30,0.35)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.restore();
    x.strokeStyle = o.dark ? "rgba(0,0,0,0.6)" : "rgba(60,40,25,0.55)"; x.lineWidth = 1.5;
    x.stroke(outline);
    panelCache.set(key, c);
    return c;
  };

  Art.vignette = (w, h) => {
    const c = Art.canvas(w, h), x = c.getContext("2d");
    const g = x.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.75);
    g.addColorStop(0, "rgba(20,12,6,0)");
    g.addColorStop(0.7, "rgba(20,12,6,0.18)");
    g.addColorStop(1, "rgba(10,6,3,0.62)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // ink-bleed corners
    const r = U.rng(99);
    x.fillStyle = "rgba(15,10,8,0.5)";
    for (let i = 0; i < 18; i++) {
      const corner = i % 4, cx = corner % 2 ? w : 0, cy = corner > 1 ? h : 0;
      Art.blobPath(x, cx + (r() - 0.5) * 160, cy + (r() - 0.5) * 120, 40 + r() * 70, 30 + r() * 50, r() * 99, 14, 0.4);
      x.fill();
    }
    return c;
  };

  // ---------------------------------------------------------------- glyphs
  // Element glyphs are distinct SHAPES (drop / flame / stone / spiral) so they never rely on color.
  Art.elementGlyph = (ctx, el, x, y, r, color, lw = 2.5) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (el === "water") {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.3, -r * 0.4, r * 0.8, 0, r * 0.75, r * 0.35);
      ctx.arc(0, r * 0.35, r * 0.75, 0, Math.PI);
      ctx.bezierCurveTo(-r * 0.8, 0, -r * 0.3, -r * 0.4, 0, -r);
      ctx.fill();
    } else if (el === "fire") {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.9, -r * 0.1, r * 0.55, r * 0.6);
      ctx.quadraticCurveTo(0, r * 1.1, -r * 0.55, r * 0.6);
      ctx.quadraticCurveTo(-r * 0.7, 0, -r * 0.15, -r * 0.35);
      ctx.quadraticCurveTo(-r * 0.05, 0, 0, -r);
      ctx.fill();
    } else if (el === "earth") {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.6); ctx.lineTo(-r * 0.5, -r * 0.5); ctx.lineTo(r * 0.3, -r * 0.8); ctx.lineTo(r * 0.85, r * 0.1); ctx.lineTo(r * 0.4, r * 0.75);
      ctx.closePath(); ctx.fill();
    } else if (el === "air") {
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const a = i * 0.32, rr = r * (0.1 + i / 40 * 0.9);
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else {
      // plain ink: a small blot ring
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.1, r * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  Art.keycap = (ctx, label, x, y, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = "20px " + Art.HAND;
    const w = Math.max(26, ctx.measureText(label).width + 14);
    ctx.fillStyle = "rgba(236,225,201,0.92)";
    ctx.strokeStyle = Art.INK; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 3, y - 14); ctx.lineTo(x + w / 2 - 1, y - 15); ctx.lineTo(x + w / 2 + 1, y + 12); ctx.lineTo(x - w / 2, y + 13); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = Art.INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x, y + 1);
    ctx.restore();
    return w;
  };

  // Ink "!" telegraph mark, shape-coded (not color coded).
  Art.telegraph = (ctx, x, y, t, color = Art.BLOOD) => {
    ctx.save();
    const s = 1 + Math.sin(t * 30) * 0.08;
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "rgba(236,225,201,0.9)";
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(12, 6); ctx.lineTo(-12, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = color;
    Art.brush(ctx, [0, -15, 0.5, -8, 0, -3], 4, { seed: 3 });
    ctx.beginPath(); ctx.arc(0, 1.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
})();
