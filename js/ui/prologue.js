// Prologue: an animated, fully procedural cinematic telling how the paper world was drawn,
// how its very first line was scribbled out and thrown into the gutter, how that line became
// Ink Spot, what he wants, and why the Borough must be mended. Nine scenes, ~90 seconds.
// Enter / click skips to the next scene, Esc skips the whole thing.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, I = LD.Input, A = LD.Audio;
  const W = 1280, H = 720, BAR = 54, GY = 540;
  const INK = "#0b0709", clamp = U.clamp, lerp = U.lerp;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eo = (x) => U.easeOut(clamp(x, 0, 1));
  const eio = (x) => U.easeInOut(clamp(x, 0, 1));
  const ein = (x) => { x = clamp(x, 0, 1); return x * x * x; };
  const bump = (x) => (x > 0 && x < 1 ? Math.sin(x * Math.PI) : 0);
  const sfx = (n) => { if (A.ctx && A.sfx[n]) A.sfx[n](); };

  // ---------------------------------------------------------------- path helpers
  function spline(c, seg = 10) {
    const out = [], n = c.length / 2;
    for (let i = 0; i < n - 1; i++) {
      const p0 = Math.max(0, i - 1), p1 = i, p2 = i + 1, p3 = Math.min(n - 1, i + 2);
      for (let s = 0; s < seg; s++) {
        const t = s / seg, t2 = t * t, t3 = t2 * t;
        for (let d = 0; d < 2; d++) {
          const a = c[p0 * 2 + d], b = c[p1 * 2 + d], cc = c[p2 * 2 + d], e = c[p3 * 2 + d];
          out.push(0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - e) * t2 + (-a + 3 * b - 3 * cc + e) * t3));
        }
      }
    }
    out.push(c[(n - 1) * 2], c[(n - 1) * 2 + 1]);
    return out;
  }
  function densify(c, step = 12) {
    const out = [c[0], c[1]];
    for (let i = 2; i < c.length; i += 2) {
      const x0 = c[i - 2], y0 = c[i - 1], x1 = c[i], y1 = c[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
      for (let k = 1; k <= n; k++) out.push(lerp(x0, x1, k / n), lerp(y0, y1, k / n));
    }
    return out;
  }
  function partial(p, f) {
    const n = p.length / 2;
    if (f <= 0 || n < 2) return [];
    if (f >= 1) return p;
    const L = f * (n - 1), i = Math.floor(L), fr = L - i;
    const out = p.slice(0, (i + 1) * 2);
    out.push(lerp(p[i * 2], p[i * 2 + 2], fr), lerp(p[i * 2 + 1], p[i * 2 + 3], fr));
    return out;
  }
  function head(p) {
    const n = p.length / 2;
    if (n < 2) return null;
    return { x: p[n * 2 - 2], y: p[n * 2 - 1], a: Math.atan2(p[n * 2 - 1] - p[n * 2 - 3], p[n * 2 - 2] - p[n * 2 - 4]) };
  }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }

  // Big writing quill: brass nib at (x, y) pointing along `ang`, feather sweeping back.
  function quill(ctx, x, y, s, ang, lift = 0) {
    ctx.save();
    if (lift > 0) { ctx.fillStyle = "rgba(20,10,5," + 0.18 / (1 + lift * 0.02) + ")"; ctx.beginPath(); ctx.ellipse(x + lift * 0.6, y + lift * 0.4, 30 * s + lift * 0.3, 8 * s + lift * 0.1, 0.3, 0, 7); ctx.fill(); }
    ctx.translate(x, y - lift); ctx.rotate(ang); ctx.scale(s, s);
    ctx.fillStyle = "#f3ead8"; ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 1.4; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-44, 0); ctx.bezierCurveTo(-90, -30, -175, -34, -240, -10); ctx.bezierCurveTo(-178, 6, -104, 14, -44, 0); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.9; ctx.beginPath();
    for (let k = 0; k < 16; k++) { const xx = -58 - k * 11; ctx.moveTo(xx, -2 - k * 0.2); ctx.lineTo(xx - 12, -14 - Math.sin(k) * 3); ctx.moveTo(xx, 1); ctx.lineTo(xx - 9, 7 + Math.cos(k) * 2); }
    ctx.stroke();
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-140, -6, -246, -9); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(x, y - lift); ctx.rotate(ang); LD.UIKit.nib(ctx, 0, 0, s, true); ctx.restore();
  }

  // ---------------------------------------------------------------- tiny particle system (screen or scene space)
  class Parts {
    constructor() { this.a = []; }
    add(o) { if (this.a.length < 700) this.a.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1, t: 0, size: 3, color: INK, drag: 0, rot: 0, vr: 0, kind: "dot" }, o)); }
    update(dt) {
      this.a = this.a.filter((p) => {
        p.t += dt; p.vy += p.g * dt; p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        return p.t < p.life;
      });
    }
    draw(ctx) {
      for (const p of this.a) {
        const k = 1 - p.t / p.life;
        ctx.save();
        ctx.globalAlpha *= p.kind === "ember" ? k : Math.min(1, k * 2);
        if (p.kind === "ember" || p.kind === "spark") {
          ctx.globalCompositeOperation = "lighter";
          Art.glow(ctx, p.x, p.y, p.size * 4, p.color, 0.8);
          ctx.fillStyle = "rgba(255,250,235,0.9)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.4, 0, 7); ctx.fill();
        } else if (p.kind === "scrap") {
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
        } else {
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * k), 0, 7); ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------- the cinematic
  class Prologue {
    constructor(G, onDone) {
      this.G = G; this.onDone = onDone; this.pause = true;
      this.T = 0; this.si = 0; this.lt = 0; this.evi = 0; this.shake = 0; this.parts = new Parts();
      this.build();
      this.scenes = this.makeScenes();
      I.clearAll();
      this.enter(0);
    }

    // ---- static art, painted once
    build() {
      const r = U.rng(4401);
      // full ruled page
      const pg = Art.canvas(W, H), px = pg.getContext("2d");
      px.drawImage(Art.parchment(W, H, 4401), 0, 0);
      px.strokeStyle = "rgba(70,90,140,0.12)"; px.lineWidth = 1;
      for (let y = 90; y < H; y += 34) { px.beginPath(); px.moveTo(0, y); px.lineTo(W, y + 1); px.stroke(); }
      px.strokeStyle = "rgba(160,50,40,0.18)"; px.beginPath(); px.moveTo(96, 0); px.lineTo(98, H); px.stroke();
      this.page = pg;
      this.pageSm = Art.parchment(260, 330, 91);
      this.pageSmL = Art.parchment(260, 330, 92);
      const marble = (w, h, seed) => {
        const c = Art.canvas(w, h), x = c.getContext("2d"), rr = U.rng(seed);
        x.fillStyle = "#23304a"; x.fillRect(0, 0, w, h);
        x.lineCap = "round";
        for (let i = 0; i < 70; i++) {
          x.strokeStyle = U.pick(["rgba(184,67,31,0.55)", "rgba(233,220,192,0.5)", "rgba(63,127,192,0.6)", "rgba(201,161,74,0.55)"], rr);
          x.lineWidth = 2 + rr() * 7;
          const y0 = rr() * h;
          x.beginPath(); x.moveTo(-10, y0);
          x.bezierCurveTo(w * 0.3, y0 + (rr() - 0.5) * 120, w * 0.6, y0 + (rr() - 0.5) * 120, w + 10, y0 + (rr() - 0.5) * 60);
          x.stroke();
        }
        x.strokeStyle = "rgba(0,0,0,0.5)"; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
        return c;
      };
      this.endpaper = marble(260, 330, 55);
      this.endpaperBig = marble(276, 350, 56);
      // cover
      const cv = Art.canvas(276, 350), cx = cv.getContext("2d");
      const g = cx.createLinearGradient(0, 0, 276, 350);
      g.addColorStop(0, "#6a3e26"); g.addColorStop(1, "#2e1a10");
      cx.fillStyle = g; cx.beginPath(); cx.roundRect(0, 0, 276, 350, 10); cx.fill();
      for (let i = 0; i < 600; i++) { cx.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.2)" : "rgba(255,210,160,0.05)"; cx.fillRect(r() * 276, r() * 350, 1 + r() * 2, 1 + r() * 2); }
      cx.strokeStyle = "#c9a14a"; cx.lineWidth = 2; cx.beginPath(); cx.roundRect(14, 14, 248, 322, 6); cx.stroke();
      cx.lineWidth = 0.8; cx.beginPath(); cx.roundRect(20, 20, 236, 310, 4); cx.stroke();
      Art.elementGlyph(cx, "water", 138, 150, 34, "#c9a14a");
      Art.text(cx, "THE LIVING", 138, 232, 22, { align: "center", font: "title", color: "#e2c27a" });
      Art.text(cx, "DRAFT", 138, 262, 30, { align: "center", font: "title", color: "#e2c27a" });
      LD.UIKit.fleuron(cx, 138, 288, 1, "#c9a14a");
      this.coverImg = cv;
      // the first line
      this.firstLine = spline([230, 470, 330, 400, 430, 455, 520, 520, 610, 470, 690, 395, 780, 430, 850, 500, 930, 470], 10);
      this.buildCity();
      this.buildCracks();
      // the Sketcher's silhouette, traced by the book
      this.fig = spline([0, -64, 14, -58, 22, -44, 24, -28, 20, -16, 26, -8, 30, 8, 34, 30, 38, 52, 22, 56, 12, 50, 10, 60, 2, 60, 0, 48, -4, 60, -12, 60, -12, 50, -22, 56, -36, 50, -32, 28, -28, 8, -24, -8, -20, -16, -24, -28, -22, -44, -14, -58, 0, -64], 5);
      this.pigments = [
        { el: "water", c: "#3f7fc0", glow: "rgba(110,170,240,0.8)", x: 300, y: 170 },
        { el: "fire", c: "#e0662a", glow: "rgba(255,150,70,0.8)", x: 540, y: 118 },
        { el: "earth", c: "#8a8a3a", glow: "rgba(190,190,90,0.7)", x: 780, y: 150 },
        { el: "air", c: "#cfd8e8", glow: "rgba(230,240,255,0.8)", x: 1010, y: 190 },
      ];
      this.folks = [];
      for (let i = 0; i < 7; i++) this.folks.push({ a: 70 + i * 165 + r() * 40, span: 40 + r() * 70, v: 0.25 + r() * 0.35, ph: r() * 6, hat: r() < 0.5, h: 0.85 + r() * 0.3 });
    }

    buildCity() {
      const r = U.rng(77);
      const B = [[40, 90, 170, "gable"], [135, 70, 230, "gable"], [210, 100, 150, "flat"], [315, 80, 260, "spire"], [400, 110, 190, "gable"], [515, 70, 140, "gable"],
        [590, 130, 300, "cath"], [725, 90, 210, "gable"], [820, 70, 160, "dome"], [895, 100, 240, "gable"], [1000, 80, 180, "spire"], [1085, 110, 150, "gable"], [1200, 70, 200, "gable"]];
      const fills = ["#d9c9e0", "#e4d3bd", "#cdbfd6", "#e8d8c0", "#d6cbb8"];
      const tints = ["#b98fb0", "#d49a6a", "#8fa6c9", "#c9a14a", "#b97a6a"];
      const builds = [], wins = [];
      for (const [x, w, h, kind] of B) {
        let o;
        if (kind === "gable") o = [x, GY, x, GY - h, x + w / 2, GY - h - w * 0.45, x + w, GY - h, x + w, GY];
        else if (kind === "spire") o = [x, GY, x, GY - h, x + w * 0.5, GY - h - w * 1.6, x + w, GY - h, x + w, GY];
        else if (kind === "flat") o = [x, GY, x, GY - h, x + w * 0.7, GY - h, x + w * 0.7, GY - h - 26, x + w * 0.82, GY - h - 26, x + w * 0.82, GY - h, x + w, GY - h, x + w, GY];
        else if (kind === "dome") { o = [x, GY, x, GY - h]; for (let k = 0; k <= 8; k++) { const a = Math.PI + (k / 8) * Math.PI; o.push(x + w / 2 + Math.cos(a) * w / 2, GY - h + Math.sin(a) * w * 0.55); } o.push(x + w, GY); }
        else o = [x, GY, x, GY - h * 0.6, x + w * 0.3, GY - h * 0.6, x + w * 0.3, GY - h, x + w * 0.5, GY - h - 140, x + w * 0.7, GY - h, x + w * 0.7, GY - h * 0.6, x + w, GY - h * 0.6, x + w, GY];
        const t0 = 0.9 + (x / 1280) * 2.6 + r() * 0.3;
        const b = { pts: densify(o), x, w, h, top: GY - h - (kind === "spire" ? w * 1.6 : kind === "cath" ? 140 : w * 0.5), t0, dur: 0.75, fill: U.pick(fills, r), tint: U.pick(tints, r), seed: x * 3.1, kind };
        builds.push(b);
        const cols = Math.max(1, Math.floor((w - 16) / 28)), rows = Math.max(1, Math.floor((kind === "cath" ? h * 0.55 : h - 30) / 52));
        for (let c = 0; c < cols; c++) for (let rw = 0; rw < rows; rw++) {
          if (r() < 0.25) continue;
          const wx = x + 12 + (cols === 1 ? (w - 24) / 2 - 5 : c * (w - 34) / (cols - 1)), wy = GY - 40 - rw * 52;
          wins.push({ x: wx, y: wy - 14, t: t0 + 0.55 + r() * 0.4, lit: 4.8 + r() * 1.4, on: r() < 0.8 });
        }
      }
      const sky = [];
      for (let i = 0; i < 7; i++) sky.push({ x: 90 + i * 190, y: 90 + r() * 140, rx: 220, ry: 120, c: U.pick(["#b98fc4", "#f0a878", "#9fb8e0", "#f2c890"], r), a: 0.28, seed: i * 17 });
      this.city = {
        builds, wins, sky,
        horizon: densify([0, GY, 1280, GY], 20),
        bridge: spline([868, 606, 1030, 548, 1192, 606], 10),
        deck: densify([850, 562, 1210, 562], 20),
        trees: [[190, "#c4452f"], [485, "#d8703a"], [968, "#b83a2c"], [1165, "#d4552f"]],
      };
    }

    buildCracks() {
      const r = U.rng(909), out = [];
      const walk = (x, y, a, len, depth, t0) => {
        const pts = [x, y];
        const n = Math.floor(len / 14);
        for (let i = 0; i < n; i++) {
          a += (r() - 0.5) * 0.9; x += Math.cos(a) * 14; y += Math.sin(a) * 14;
          pts.push(x, y);
          if (depth < 2 && r() < 0.14) walk(x, y, a + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.6), len * 0.5, depth + 1, t0 + (i / n) * 1.2);
        }
        out.push({ pts, t0, w: 3.2 - depth });
      };
      for (const [x, y] of [[640, 380], [240, 300], [1030, 260], [420, 600], [880, 560], [120, 120], [1180, 620]]) {
        const k = 3 + Math.floor(r() * 3);
        for (let i = 0; i < k; i++) walk(x, y, r() * Math.PI * 2, 160 + r() * 260, 0, 0.5 + r() * 1.5 + (x === 640 ? 0 : 1));
      }
      this.cracks = out;
    }

    // ---- reusable drawings
    creaturePts(time, alive) {
      const L = this.firstLine, n = L.length / 2, out = new Array(L.length);
      for (let j = 0; j < n; j++) {
        const u = j / (n - 1);
        let x = L[j * 2], y = L[j * 2 + 1];
        if (alive > 0) {
          y += Math.sin(time * 2.2 + u * 7) * 3 * alive;
          if (u > 0.72) { const w = (u - 0.72) / 0.28; y -= alive * w * w * 120; x -= alive * w * w * 40 - Math.sin(time * 1.3) * alive * w * 8; }
        }
        out[j * 2] = x; out[j * 2 + 1] = y;
      }
      return out;
    }
    drawCreature(ctx, time, o = {}) {
      const alive = o.alive || 0;
      let pts = this.creaturePts(time, alive);
      if (o.draw != null && o.draw < 1) pts = partial(pts, o.draw);
      if (pts.length < 4) return;
      ctx.save();
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      if (o.rim) {
        ctx.save(); ctx.globalAlpha *= o.rim; ctx.fillStyle = "#e9dcc0";
        Art.brush(ctx, pts, (o.width || 14) + 9, { seed: 3, taperStart: 0.06, taperEnd: 0.03, jitter: 0.1 });
        if (alive > 0) { const h = head(pts); ctx.beginPath(); ctx.arc(h.x, h.y, 10 * alive + 4.5, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      ctx.fillStyle = INK;
      Art.brush(ctx, pts, o.width || 14, { seed: 3 + (o.boil ? Art.boil : 0), taperStart: 0.06, taperEnd: alive > 0 ? 0.03 : 0.1, jitter: 0.25 });
      if (alive > 0) {
        const h = head(pts);
        ctx.beginPath(); ctx.arc(h.x, h.y, 10 * alive + 0.1, 0, 7); ctx.fill();
        if ((o.eye || 0) > 0) {
          const blink = (time % 2.7) < 0.12 ? 0.1 : 1, sq = 1 - (o.squint || 0) * 0.85;
          ctx.globalAlpha *= o.eye;
          ctx.fillStyle = "#f4eee2";
          ctx.beginPath(); ctx.ellipse(h.x + 2, h.y - 1, 5.5, 7 * blink * sq + 0.3, 0.2, 0, 7); ctx.fill();
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.arc(h.x + 2 + Math.sin(time * 1.7) * 2 + (o.look || 0), h.y, 2.6 * Math.min(1, blink * sq + 0.3), 0, 7); ctx.fill();
        }
      }
      ctx.restore();
    }
    placeCreature(ctx, x, y, s, rot, time, o) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-570, -450);
      this.drawCreature(ctx, time, o);
      ctx.restore();
    }

    drawCity(ctx, lt) {
      const C = this.city;
      ctx.drawImage(this.page, 0, 0);
      const bloom = eo((lt - 3.6) / 2.2);
      if (bloom > 0) for (const w of C.sky) Art.wash(ctx, w.x, w.y, w.rx * bloom, w.ry * bloom, w.c, w.a, w.seed, 3);
      if (bloom > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 1080, 120, 260 * bloom, "rgba(255,200,130,0.35)"); ctx.restore(); }
      // street & river
      const rv = eo((lt - 4.0) / 1.8);
      if (rv > 0) {
        ctx.save(); ctx.globalAlpha *= rv;
        ctx.fillStyle = "rgba(160,140,120,0.35)"; ctx.fillRect(0, GY, W, 34);
        ctx.restore();
        for (let i = 0; i < 8; i++) Art.wash(ctx, 80 + i * 165, 650, 150 * rv, 70 * rv, "#3f7fc0", 0.55, 300 + i, 3);
        ctx.save(); ctx.globalAlpha *= rv * 0.6; ctx.strokeStyle = "#e6f0fa"; ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) { const x = (i * 97) % W, y = 610 + (i % 4) * 24; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 4, x + 44, y); ctx.stroke(); }
        ctx.restore();
      }
      const hz = partial(C.horizon, eo((lt - 0.5) / 1.5));
      if (hz.length >= 4) Art.sketch(ctx, hz, 2.2, "#2a1a10", 5, 0.8, false, 2);
      // building fills (paper, then colour), hatching
      const ca = sm(4.2, 6.2, lt);
      for (const b of C.builds) {
        const fa = sm(b.t0 + 0.4, b.t0 + 1.3, lt);
        if (fa <= 0) continue;
        ctx.save();
        poly(ctx, b.pts);
        ctx.globalAlpha *= fa; ctx.fillStyle = b.fill; ctx.fill();
        if (ca > 0) { ctx.globalAlpha = fa * ca * 0.55; ctx.fillStyle = b.tint; ctx.fill(); }
        ctx.globalAlpha = fa;
        ctx.clip();
        Art.hatch(ctx, b.x + b.w * 0.62, b.top, b.w * 0.4, GY - b.top, 5, 0.9, "#3a2a1e", 0.3, 1, b.seed);
        ctx.restore();
      }
      for (const b of C.builds) {
        const f = eo((lt - b.t0) / b.dur);
        if (f > 0) Art.sketch(ctx, partial(b.pts, f), 2.4, "#1f1510", b.seed, 0.9, false, 2);
        if (b.kind === "cath" && lt > b.t0 + 0.6) {
          const k = sm(b.t0 + 0.6, b.t0 + 1.1, lt);
          ctx.save(); ctx.strokeStyle = "#1f1510"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(b.x + b.w / 2, GY - b.h * 0.72, 16, 0, Math.PI * 2 * k); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(b.x + b.w / 2 - 16, GY); ctx.lineTo(b.x + b.w / 2 - 16, GY - 40 * k); ctx.arc(b.x + b.w / 2, GY - 40 * k, 16, Math.PI, 0); ctx.lineTo(b.x + b.w / 2 + 16, GY); ctx.stroke();
          if (ca > 0) { ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, b.x + b.w / 2, GY - b.h * 0.72, 40, "rgba(255,190,110,0.7)", ca); }
          ctx.restore();
        }
        if ((b.kind === "spire" || b.kind === "cath") && lt > 5.4) {
          const k = eo((lt - 5.4) / 0.6), tx = b.x + b.w / 2, ty = b.top;
          ctx.save(); ctx.fillStyle = "#b8342a"; ctx.strokeStyle = "#1f1510"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - 26); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tx, ty - 26); ctx.lineTo(tx + 22 * k, ty - 20 + Math.sin(this.T * 4 + tx) * 2); ctx.lineTo(tx, ty - 14); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      // windows
      for (const w of C.wins) {
        const a = sm(w.t, w.t + 0.3, lt);
        if (a <= 0) continue;
        const lit = w.on ? sm(w.lit, w.lit + 0.4, lt) : 0;
        ctx.save(); ctx.globalAlpha *= a;
        if (lit > 0) {
          ctx.fillStyle = "rgba(240,190,90," + lit + ")"; ctx.fillRect(w.x, w.y, 10, 14);
          ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, w.x + 5, w.y + 7, 18, "rgba(255,190,100,0.6)", lit);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.strokeStyle = "#1f1510"; ctx.lineWidth = 1.4; ctx.strokeRect(w.x, w.y, 10, 14);
        ctx.beginPath(); ctx.moveTo(w.x + 5, w.y); ctx.lineTo(w.x + 5, w.y + 14); ctx.stroke();
        ctx.restore();
      }
      // bridge
      const bf = eo((lt - 3.4) / 1.0);
      if (bf > 0) {
        Art.sketch(ctx, partial(C.bridge, bf), 2.6, "#1f1510", 41, 0.8, false, 2);
        Art.sketch(ctx, partial(C.deck, bf), 2.6, "#1f1510", 42, 0.8, false, 2);
        if (bf >= 1) { ctx.save(); ctx.strokeStyle = "#1f1510"; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 1; i < 12; i++) { const x = 850 + i * 30, yb = 606 - Math.sin(((x - 868) / 324) * Math.PI) * 58; ctx.moveTo(x, 562); ctx.lineTo(x, Math.min(606, yb)); } ctx.stroke(); ctx.restore(); }
      }
      // trees
      for (const [x, col] of C.trees) {
        const tf = eo((lt - 3.0 - x / 1280) / 0.8);
        if (tf <= 0) continue;
        Art.sketch(ctx, partial([x, GY, x - 4, GY - 40, x + 2, GY - 76], tf), 4, "#1f1510", x, 0.6, false, 1);
        Art.sketch(ctx, partial([x - 2, GY - 50, x - 26, GY - 78], tf), 2, "#1f1510", x + 1, 0.6, false, 1);
        Art.sketch(ctx, partial([x + 1, GY - 60, x + 24, GY - 90], tf), 2, "#1f1510", x + 2, 0.6, false, 1);
        const cb = eo((lt - 4.3 - x / 3000) / 1.2);
        if (cb > 0) { Art.wash(ctx, x, GY - 96, 52 * cb, 40 * cb, col, 0.8, x, 3); Art.wash(ctx, x - 22, GY - 80, 30 * cb, 24 * cb, col, 0.6, x + 5, 2); }
      }
    }
    getCity() {
      if (this.cityFull) return;
      const c = Art.canvas(W, H), x = c.getContext("2d");
      this.drawCity(x, 99);
      this.cityFull = c;
      const g = Art.canvas(W, H), gx = g.getContext("2d");
      if ("filter" in gx) { gx.filter = "grayscale(1) brightness(0.72) contrast(0.9)"; gx.drawImage(c, 0, 0); gx.filter = "none"; }
      else {
        gx.drawImage(c, 0, 0);
        const im = gx.getImageData(0, 0, W, H), d = im.data;
        for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * 0.72; d[i] = d[i + 1] = d[i + 2] = l; }
        gx.putImageData(im, 0, 0);
      }
      const rr = U.rng(5150);
      for (let i = 0; i < 16; i++) Art.splat(gx, rr() * W, 480 + rr() * 240, 8 + rr() * 22, "rgba(12,8,10,0.7)", i * 7, 7);
      gx.fillStyle = "rgba(12,8,10,0.6)";
      for (let i = 0; i < 26; i++) { const x = rr() * W; Art.brush(gx, [x, H + 5, x + 3, H - 40 - rr() * 120], 6 + rr() * 8, { seed: i, taperStart: 0, taperEnd: 0.9 }); }
      this.cityGrey = g;
    }
    drawLife(ctx, time, o = {}) {
      // paper cranes circling the sky
      for (let i = 0; i < 5; i++) {
        const x = ((time * 110 + i * 290) % 1560) - 140, y = 120 + i * 22 + Math.sin(time * 1.3 + i * 2) * 14;
        const flap = Math.sin(time * 9 + i) * 0.6;
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.birdA == null ? 1 : o.birdA;
        ctx.fillStyle = o.grey ? "#bdb6ab" : "#f5ead3"; ctx.strokeStyle = o.grey ? "#555" : "#b8431f"; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(-14, 2); ctx.lineTo(0, -3); ctx.lineTo(16, -9); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-8, -16 * (1 + flap)); ctx.lineTo(7, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // townsfolk strolling the street
      for (const f of this.folks) {
        const fade = o.erase ? 1 - o.erase : 1;
        if (fade <= 0) continue;
        const ph = time * f.v + f.ph, x = f.a + Math.sin(ph) * f.span, dir = Math.cos(ph) >= 0 ? 1 : -1, sw = o.frozen ? 0.2 : Math.sin(time * 7 + f.ph) * 4;
        ctx.save(); ctx.translate(o.frozen ? f.a + Math.sin(f.ph + o.frozen) * f.span : x, GY + 2); ctx.scale(dir * f.h, f.h);
        ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha) * fade;
        if (o.dashed) { ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(60,60,60,0.8)"; ctx.fillStyle = "rgba(0,0,0,0)"; }
        else { ctx.fillStyle = o.grey ? "#3a3a3a" : "#2a1d18"; ctx.strokeStyle = ctx.fillStyle; }
        ctx.lineWidth = 2.2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-2, -10); ctx.lineTo(-2 - sw, 0); ctx.moveTo(2, -10); ctx.lineTo(2 + sw, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-4, -30); ctx.lineTo(4, -30); ctx.lineTo(7, -10); ctx.closePath(); if (o.dashed) ctx.stroke(); else ctx.fill();
        ctx.beginPath(); ctx.arc(0, -35, 5, 0, 7); if (o.dashed) ctx.stroke(); else ctx.fill();
        if (f.hat) { ctx.beginPath(); ctx.rect(-4, -46, 8, 7); ctx.moveTo(-7, -39); ctx.lineTo(7, -39); if (o.dashed) ctx.stroke(); else { ctx.fill(); ctx.stroke(); } }
        ctx.restore();
      }
    }
    drawOrb(ctx, p, x, y, s, time, a = 1) {
      if (a <= 0 || s <= 0) return;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.globalCompositeOperation = "lighter";
      Art.glow(ctx, x, y, 60 * s, p.glow, 0.8 + Math.sin(time * 3 + x) * 0.2);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = p.c; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(x, y, 30 * s, 9 * s, time * 0.8 + x, 0, 7); ctx.stroke();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y, 15 * s, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(x - 5 * s, y - 5 * s, 4 * s, 0, 7); ctx.fill();
      Art.elementGlyph(ctx, p.el, x, y + 1, 8 * s, "rgba(255,255,255,0.85)", 2);
      ctx.restore();
    }
    drawCracks(ctx, lt, full) {
      if (full) {
        if (!this.cracked) { const c = Art.canvas(W, H); this.drawCracks(c.getContext("2d"), 99, false); this.cracked = c; }
        ctx.drawImage(this.cracked, 0, 0);
        return;
      }
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? "#0c0809" : "rgba(230,225,215,0.3)";
        for (const c of this.cracks) {
          const f = eo((lt - c.t0) / 1.4);
          if (f <= 0) continue;
          const p = partial(c.pts, f);
          if (p.length < 4) continue;
          ctx.lineWidth = c.w * (pass ? 1 : 1.2);
          ctx.beginPath(); ctx.moveTo(p[0] + (pass ? 0 : 1.2), p[1] + (pass ? 0 : 1.5));
          for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] + (pass ? 0 : 1.2), p[i + 1] + (pass ? 0 : 1.5));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // The Sketcher, drawn in local space (feet ~ +60, hood top ~ -64).
    drawFigure(ctx, lt, reveal, fill, time) {
      if (reveal > 0) {
        ctx.save();
        if (fill > 0) {
          ctx.globalAlpha = fill;
          poly(ctx, this.fig); ctx.fillStyle = "#1b1512"; ctx.fill();
          // cloak hem & lining
          ctx.fillStyle = "#6b3526";
          ctx.beginPath(); ctx.moveTo(-36, 50); ctx.quadraticCurveTo(0, 40, 38, 52); ctx.lineTo(34, 30); ctx.quadraticCurveTo(0, 36, -32, 28); ctx.closePath(); ctx.fill();
          // face opening + eyes
          ctx.fillStyle = "#efe4cc"; ctx.beginPath(); ctx.ellipse(2, -32, 11, 12, 0, 0, 7); ctx.fill();
          ctx.fillStyle = "#1b1512";
          const bl = (time % 3.1) < 0.1 ? 0.2 : 1;
          ctx.beginPath(); ctx.ellipse(-2, -32, 1.8, 2.8 * bl, 0, 0, 7); ctx.ellipse(7, -32, 1.8, 2.8 * bl, 0, 0, 7); ctx.fill();
          // scarf streaming
          ctx.fillStyle = "#b8342a";
          const sw = Math.sin(time * 6) * 4;
          Art.brush(ctx, [6, -16, 24, -14 + sw, 44, -20 - sw, 66, -12 + sw, 84, -18 - sw], 8, { seed: 7, taperStart: 0.05, taperEnd: 0.6 });
          ctx.fillStyle = "#e8d3a0";
          for (let i = 0; i < 3; i++) ctx.fillRect(20 + i * 18, -17 + (i % 2 ? sw : -sw) * 0.5, 3, 6);
          // pen in hand
          ctx.strokeStyle = "#c9a14a"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(-30, 10); ctx.lineTo(-48, 34); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        Art.sketch(ctx, partial(this.fig, reveal), 2.6, "#0b0709", Art.boil, 0.7, false, 2);
        ctx.restore();
      }
    }

    // ---------------------------------------------------------------- captions & chrome
    caption(ctx, text, lt, dur, from = 0.8, end) {
      if (!text) return;
      const e = end == null ? dur : end;
      const a = Math.min(sm(from, from + 0.4, lt), 1 - sm(e - 0.7, e - 0.1, lt));
      if (a <= 0) return;
      const n = Math.floor(clamp((lt - from) * 42, 0, text.length));
      const shown = text.slice(0, n);
      ctx.save(); ctx.globalAlpha *= a;
      ctx.font = "27px " + Art.SERIF;
      // wrap
      const words = text.split(" "), lines = [];
      let cur = "";
      for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > 980 && cur) { lines.push(cur); cur = w; } else cur = t; }
      lines.push(cur);
      const y0 = H - BAR - 26 - (lines.length - 1) * 34;
      const g = ctx.createLinearGradient(0, y0 - 60, 0, H);
      g.addColorStop(0, "rgba(6,4,4,0)"); g.addColorStop(0.5, "rgba(6,4,4,0.6)"); g.addColorStop(1, "rgba(6,4,4,0.85)");
      ctx.fillStyle = g; ctx.fillRect(0, y0 - 60, W, H - y0 + 60);
      let left = n;
      lines.forEach((ln, i) => {
        const part = ln.slice(0, Math.max(0, left));
        left -= ln.length + 1;
        if (!part) return;
        const full = ctx.measureText(ln).width;
        Art.text(ctx, part, W / 2 - full / 2, y0 + i * 34, 27, { font: "serif", color: "#efe3c8", outline: 3, outlineColor: "rgba(0,0,0,0.5)" });
      });
      ctx.restore();
      void shown;
    }
    inkCover(ctx, k, color = INK, seed = 0) {
      if (k <= 0) return;
      ctx.save(); ctx.fillStyle = color;
      if (k >= 0.999) { ctx.fillRect(0, 0, W, H); ctx.restore(); return; }
      for (let i = 0; i < 16; i++) {
        const gx = (i % 4) * 360 + 40 + U.hash(i + seed) * 120, gy = Math.floor(i / 4) * 210 + 30 + U.hash(i * 3 + seed) * 90;
        const rr = k * k * 460 * (0.7 + U.hash(i * 7 + seed) * 0.6);
        Art.blobPath(ctx, gx, gy, rr, rr * 0.9, i * 13 + seed, 20, 0.3); ctx.fill();
        for (let d = 0; d < 3; d++) { const a = U.hash(i * 11 + d) * 7; ctx.beginPath(); ctx.arc(gx + Math.cos(a) * rr * 1.25, gy + Math.sin(a) * rr * 1.25, rr * 0.12, 0, 7); ctx.fill(); }
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------- scenes
    makeScenes() {
      const P = this;
      const every = (a, b, step, n) => { const o = []; for (let t = a; t < b; t += step) o.push([t, () => sfx(n)]); return o; };
      return [
        // I ------------------------------------------------------------ the blank page
        {
          num: "I", name: "The Blank Page", dur: 9,
          cap: "Before the Borough, before the bells and the rivers, there was only a blank page — and a hand that longed to make something.",
          ev: [[0.05, () => A.play("prologue")], [2.1, () => sfx("page")], [3.7, () => sfx("flutter")], [4.3, () => sfx("flutter")], [4.9, () => sfx("page")], [5.2, () => sfx("bell")]],
          draw(ctx, lt) {
            ctx.fillStyle = "#0a0706"; ctx.fillRect(0, 0, W, H);
            const zoom = 1 + ein((lt - 6.3) / 2.6) * 6.2;
            ctx.save();
            ctx.translate(770, 370); ctx.scale(zoom, zoom); ctx.translate(-770, -370);
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            Art.glow(ctx, 640, 380, 560, "rgba(255,190,120,0.35)", sm(0.2, 3, lt));
            ctx.restore();
            P.drawBook(ctx, lt);
            // rays pouring out of the pages
            const ra = sm(3.6, 5, lt);
            if (ra > 0) {
              ctx.save(); ctx.globalCompositeOperation = "lighter";
              for (let i = 0; i < 11; i++) {
                const a = -Math.PI / 2 + (i - 5) * 0.2 + Math.sin(P.T * 0.6 + i) * 0.04, L = 520 + (i % 3) * 120;
                ctx.fillStyle = "rgba(255,226,170," + 0.05 * ra + ")";
                ctx.beginPath(); ctx.moveTo(640 + (i - 5) * 16, 330); ctx.lineTo(640 + Math.cos(a - 0.05) * L, 330 + Math.sin(a - 0.05) * L); ctx.lineTo(640 + Math.cos(a + 0.05) * L, 330 + Math.sin(a + 0.05) * L); ctx.closePath(); ctx.fill();
              }
              ctx.restore();
            }
            ctx.restore();
            // rising motes
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < 40; i++) {
              const y = H - ((P.T * (18 + (i % 7) * 6) + i * 53) % (H + 40)), x = (i * 137) % W + Math.sin(P.T + i) * 12;
              Art.glow(ctx, x, y, 5 + (i % 3) * 2, "rgba(255,210,150,0.6)", 0.5 * sm(0.5, 2.5, lt));
            }
            ctx.restore();
          },
        },
        // II ----------------------------------------------------------- the first line
        {
          num: "II", name: "The First Line", dur: 9.5, tin: "paper",
          cap: "Its very first line was crooked and clumsy. But the moment the ink touched the paper… it was alive.",
          ev: [[1.6, () => { sfx("drip"); sfx("land"); P.shake = 0.35; P.splash(230, 470, 40); }], ...every(1.7, 4.6, 0.22, "scratch"), [5.4, () => sfx("heartbeat")], [6.4, () => sfx("chitter")], [7.6, () => sfx("chitter")]],
          tick(dt, lt) {
            if (lt > 1.6 && lt < 4.6 && Math.random() < 0.5) {
              const h = head(partial(P.firstLine, eio((lt - 1.6) / 3.0)));
              if (h) P.parts.add({ x: h.x, y: h.y, vx: U.rand(-80, 80), vy: U.rand(-120, 20), g: 500, life: 0.6, size: U.rand(1.5, 3.5) });
            }
          },
          draw(ctx, lt) {
            ctx.drawImage(P.page, 0, 0);
            const drawF = eio((lt - 1.6) / 3.0);
            const alive = eo((lt - 5.3) / 1.3);
            // touchdown ripple
            if (lt > 1.6 && lt < 2.6) {
              const k = (lt - 1.6) / 1.0;
              ctx.save(); ctx.strokeStyle = "rgba(11,7,9," + (0.5 * (1 - k)) + ")"; ctx.lineWidth = 3 * (1 - k) + 0.5;
              ctx.beginPath(); ctx.ellipse(230, 470, 20 + k * 160, (20 + k * 160) * 0.35, 0, 0, 7); ctx.stroke(); ctx.restore();
            }
            if (lt > 1.6) { Art.splat(ctx, 226, 474, 9, INK, 5, 8); }
            P.drawCreature(ctx, P.T, { draw: drawF, alive, eye: sm(6.1, 6.6, lt), boil: alive > 0 });
            P.parts.draw(ctx);
            // the pen
            let px, py, lift;
            if (lt < 1.6) { const k = eo(lt / 1.6); px = lerp(1150, 230, k); py = lerp(-160, 470, k); lift = (1 - k) * 160; }
            else if (lt < 4.6) { const h = head(partial(P.firstLine, drawF)) || { x: 230, y: 470 }; px = h.x; py = h.y; lift = 0; }
            else { const k = ein((lt - 4.6) / 1.1); const e = head(P.firstLine); px = lerp(e.x, 1400, k); py = lerp(e.y, -260, k); lift = k * 200; }
            if (lt < 5.8) quill(ctx, px, py, 1.3, 2.3, lift);
          },
        },
        // III ---------------------------------------------------------- the borough drawn
        {
          num: "III", name: "The Borough, Drawn", dur: 10.5,
          cap: "Then came streets and rivers, bridges and bells — Looseleaf Borough, painted in every colour the hand could mix.",
          ev: [...every(1.0, 4.2, 0.45, "scribble"), [4.0, () => sfx("splash")], [4.8, () => sfx("inkGain")], [5.6, () => sfx("flutter")], [6.6, () => sfx("pigment")]],
          tick(dt, lt) {
            if (lt > 6.6 && Math.random() < 0.6) { const p = U.pick(P.pigments); P.parts.add({ kind: "spark", x: p.x + U.rand(-30, 30), y: p.y + U.rand(-30, 30), vx: U.rand(-20, 20), vy: U.rand(-40, -10), life: 1.2, size: 2, color: p.glow }); }
          },
          draw(ctx, lt) {
            P.drawCity(ctx, lt);
            // the zipping pen that draws it all
            let cur = null;
            for (const b of P.city.builds) if (lt >= b.t0 && lt < b.t0 + b.dur) cur = b;
            if (cur) { const h = head(partial(cur.pts, eo((lt - cur.t0) / cur.dur))); if (h) quill(ctx, h.x, h.y, 0.55, 2.3, 0); }
            if (lt > 5.4) P.drawLife(ctx, P.T, { alpha: sm(5.8, 6.8, lt), birdA: sm(5.4, 6.2, lt) });
            P.pigments.forEach((p, i) => { const k = U.easeOutBack(clamp((lt - 6.6 - i * 0.18) / 0.6, 0, 1)); P.drawOrb(ctx, p, p.x, p.y + Math.sin(P.T * 1.4 + i) * 6, k, P.T); });
            P.parts.draw(ctx);
            // the first line, shrinking away into the corner, watching
            const k = eio((lt - 0.2) / 1.8);
            P.placeCreature(ctx, lerp(570, 170, k), lerp(450, 598, k), lerp(1, 0.25, k), 0, P.T, { alive: 1, eye: 1, look: k * 2, boil: true });
          },
        },
        // IV ----------------------------------------------------------- crossed out
        {
          num: "IV", name: "Crossed Out", dur: 9.5, tout: "ink",
          cap: "But that first line didn't fit the picture. It was scribbled out, rubbed away… and flicked into the gutter between the pages.",
          enter() { P.getCity(); P.scribble = []; const r = U.rng(31); for (let i = 0; i < 46; i++) P.scribble.push(100 + (i % 2 ? 150 : 0) + r() * 16, 552 + i * 1.3 + r() * 8); },
          ev: [[1.4, () => sfx("chitter")], ...every(2.0, 4.0, 0.25, "scribble"), [2.1, () => { P.shake = 0.3; sfx("playerHurt"); }], ...every(4.0, 6.0, 0.4, "dodge"), [6.0, () => { sfx("tear"); P.shake = 0.4; }], [6.8, () => sfx("dodge")], [7.3, () => sfx("whisper")]],
          tick(dt, lt) {
            if (lt > 4 && lt < 6 && Math.random() < 0.7) P.parts.add({ kind: "scrap", x: P.eraserX || 170, y: 606, vx: U.rand(-120, 120), vy: U.rand(-120, -20), g: 400, life: 1, size: 2, color: "#caa0a0", vr: 8 });
            if (lt > 6.8 && Math.random() < 0.5 && P.fallPos) P.parts.add({ kind: "scrap", x: P.fallPos.x + U.rand(-160, 160), y: P.fallPos.y + 160, vx: U.rand(-20, 20), vy: U.rand(-500, -300), life: 0.9, size: U.rand(2, 5), color: "#d9ccb0", vr: U.rand(-6, 6) });
            if (lt > 6.8 && Math.random() < 0.8) { const c = P.fallPos; if (c) P.parts.add({ x: c.x + U.rand(-10, 10), y: c.y, vx: U.rand(-20, 20), vy: U.rand(-160, -60), life: 0.9, size: U.rand(1.5, 4) }); }
          },
          draw(ctx, lt) {
            ctx.fillStyle = "#050304"; ctx.fillRect(0, 0, W, H);
            const k1 = eio(lt / 1.8), k3 = eio((lt - 6.0) / 2.4);
            const fall = lt > 6.8 ? 0.5 * 1300 * Math.pow(lt - 6.8, 2) : 0;
            const slide = sm(6.0, 6.8, lt);
            const cx = 170 - slide * 40, cy = 598 + slide * 125 + fall;
            P.fallPos = null;
            const z = lerp(1 + 2.2 * k1, 2.5, k3);
            const fxW = 170, fyW = 590 + Math.max(0, cy - 600) * sm(6.0, 7.2, lt);
            const sx = lerp(170, 520, k1), sy = lerp(590, 400, k1);
            ctx.save();
            ctx.translate(sx, sy); ctx.rotate(sm(6.0, 6.6, lt) * 0.12 * (1 - k3 * 0.5)); ctx.scale(z, z); ctx.translate(-fxW, -fyW);
            ctx.drawImage(P.cityFull, 0, 0);
            P.drawLife(ctx, P.T, {});
            // page's bottom edge, and the dark gutter under it
            const eg = ctx.createLinearGradient(0, H - 20, 0, H + 60);
            eg.addColorStop(0, "rgba(0,0,0,0)"); eg.addColorStop(0.3, "rgba(0,0,0,0.6)"); eg.addColorStop(1, "#050304");
            ctx.fillStyle = eg; ctx.fillRect(-400, H - 20, W + 800, 80);
            ctx.fillStyle = "#050304"; ctx.fillRect(-400, H + 60, W + 800, 6000);
            ctx.strokeStyle = "#d8c9a8"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-400, H); ctx.lineTo(W + 400, H); ctx.stroke();
            // the creature: hurt, erased, flicked
            const erase = sm(4, 6, lt);
            const flick = lt > 4 && lt < 6 ? (Math.sin(lt * 40) > 0.3 ? 0.6 : 1) : 1;
            const rot = lt > 6.2 ? (lt - 6.2) * 5 : 0;
            const s = 0.25 / (1 + fall * 0.00015);
            if (lt > 6.6) { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, cx, cy, 150, "rgba(230,210,180,0.35)", sm(6.6, 7.2, lt)); ctx.restore(); }
            P.placeCreature(ctx, cx, cy, s, rot, P.T, { alive: 1, eye: 1, squint: sm(1.9, 2.2, lt) * (1 - sm(6.6, 7, lt) * 0.3), alpha: (1 - erase * 0.45) * flick, look: -3, boil: true, rim: sm(6.4, 7.0, lt) * 0.85 });
            if (lt > 6.8) P.fallPos = { x: cx, y: cy };
            // the scribble crossing it out
            const sf = eo((lt - 2.0) / 2.0);
            if (sf > 0 && lt < 6.6) {
              ctx.save(); ctx.globalAlpha *= (1 - erase * 0.6) * (1 - sm(6.0, 6.5, lt));
              ctx.fillStyle = "#1a0c0a";
              const sp = partial(P.scribble, sf);
              if (sp.length >= 4) Art.brush(ctx, sp, 3.2, { seed: 9, taperStart: 0.02, taperEnd: 0.05, jitter: 0.4 });
              ctx.restore();
              if (lt < 4.0) { const h = head(sp); if (h) quill(ctx, h.x, h.y, 0.3, 2.3, 0); }
            }
            // the eraser
            if (lt > 3.8 && lt < 6.3) {
              const ek = sm(3.8, 4.1, lt) * (1 - sm(6.0, 6.3, lt));
              const ex = 170 + Math.sin((lt - 4) * 10) * 58, ey = 584 + Math.sin((lt - 4) * 5) * 5 - (1 - ek) * 80;
              P.eraserX = ex;
              ctx.save(); ctx.translate(ex, ey); ctx.rotate(-0.25 + Math.sin((lt - 4) * 10) * 0.08);
              ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-26, 8, 58, 10);
              ctx.fillStyle = "#d98f8f"; ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.roundRect(-30, -12, 60, 24, 4); ctx.fill(); ctx.stroke();
              ctx.fillStyle = "#e9e1cf"; ctx.fillRect(-4, -13, 36, 26); ctx.strokeRect(-4, -13, 36, 26);
              ctx.fillStyle = "#3f7fc0"; ctx.fillRect(4, -13, 4, 26);
              ctx.restore();
            }
            P.parts.draw(ctx);
            ctx.restore();
          },
        },
        // V ------------------------------------------------------------ the gutter
        {
          num: "V", name: "The Gutter", dur: 10.5, tout: "ink",
          cap: "Down in the dark it drank every rejected draft, every blot, every crossed-out word. It grew. And it remembered.",
          enter() {
            const r = U.rng(606), words = ["~~wrong~~", "redo", "ugly", "draft 2", "no.", "~~blue~~", "start over", "not this", "?", "smudge", "~~him~~", "again"];
            P.debris = [];
            for (let i = 0; i < 38; i++) P.debris.push({ x0: 250 + r() * 780, y0: -40 - r() * 420, v: 120 + r() * 130, sw: r() * 6, kind: U.pick(["ball", "scrap", "word", "word"], r), word: U.pick(words, r), rot0: r() * 6, vr: (r() - 0.5) * 3, delay: 2.4 + r() * 2.6, a0: r() * 6.28, r0: 170 + r() * 340, rest: 420 + r() * 140, size: 0.8 + r() * 0.6 });
            P.pulses = [];
          },
          ev: [[0.05, () => A.play("void")], [0.9, () => { sfx("splash"); P.shake = 0.3; P.splash(640, 560, 30, "#0b0709"); }], ...[3, 4.2, 5.2, 6, 6.6, 7.1, 7.5].map((t) => [t, () => { sfx("heartbeat"); P.pulses.push(P.lt); P.shake = Math.max(P.shake, 0.18); }]), [6.2, () => { sfx("roar"); P.shake = 0.6; }], [8.6, () => sfx("whisper")]],
          tick(dt, lt) {
            if (lt > 5 && Math.random() < 0.9) P.parts.add({ x: 640 + U.rand(-60, 60), y: 560, vx: U.rand(-40, 40), vy: U.rand(-260, -80), g: 120, life: 1.4, size: U.rand(2, 6), color: "#120b10" });
            if (Math.random() < 0.3) P.parts.add({ kind: "ember", x: U.rand(560, 720), y: U.rand(0, 200), vx: U.rand(-5, 5), vy: U.rand(10, 30), life: 3, size: 1.5, color: "rgba(220,210,240,0.5)" });
          },
          draw(ctx, lt) {
            ctx.fillStyle = "#060405"; ctx.fillRect(0, 0, W, H);
            const z = 1 + eio((lt - 7.4) / 3) * 0.45;
            ctx.save(); ctx.translate(640, 380); ctx.scale(z, z); ctx.translate(-640, -380);
            // light from the world above, far overhead
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, "rgba(240,225,200,0.22)"); bg.addColorStop(1, "rgba(240,225,200,0)");
            ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(624, -20); ctx.lineTo(656, -20); ctx.lineTo(820, H); ctx.lineTo(460, H); ctx.closePath(); ctx.fill();
            Art.glow(ctx, 640, 0, 120, "rgba(255,240,215,0.6)");
            ctx.restore();
            // the pages' inner walls, curving down into the spine
            for (const d of [-1, 1]) {
              const g = ctx.createLinearGradient(640, 0, 640 + d * 640, 0);
              g.addColorStop(0, "rgba(42,28,20,0.9)"); g.addColorStop(0.35, "rgba(26,17,12,0.95)"); g.addColorStop(1, "#040303");
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.moveTo(640 + d * 24, -10); ctx.bezierCurveTo(640 + d * 60, 300, 640 + d * 190, 560, 640 + d * 520, H + 10); ctx.lineTo(640 + d * 700, H + 10); ctx.lineTo(640 + d * 700, -10); ctx.closePath(); ctx.fill();
              ctx.save(); ctx.clip();
              ctx.strokeStyle = "rgba(200,180,150,0.07)"; ctx.lineWidth = 1.5;
              for (let i = 0; i < 26; i++) { const y = i * 30; ctx.beginPath(); ctx.moveTo(640 + d * (60 + y * 0.3), y); ctx.lineTo(640 + d * 700, y + 40); ctx.stroke(); }
              ctx.restore();
            }
            // the first line tumbling down
            if (lt < 0.95) { const k = ein(lt / 0.9); P.placeCreature(ctx, 640, lerp(-80, 560, k), 0.14, lt * 8, P.T, { alive: 1, eye: 1, squint: 1, rim: 0.8 }); }
            // heartbeat rings
            for (const t0 of P.pulses) { const k = (lt - t0) / 1.2; if (k < 0 || k > 1) continue; ctx.save(); ctx.strokeStyle = "rgba(200,170,230," + 0.35 * (1 - k) + ")"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(640, 552, 40 + k * 600, (40 + k * 600) * 0.4, 0, 0, 7); ctx.stroke(); ctx.restore(); }
            // debris spiralling in
            let absorbed = 0;
            for (const d of P.debris) {
              const fx = d.x0 + Math.sin(lt * 1.2 + d.sw) * 30, fy = Math.min(d.y0 + d.v * lt, d.rest);
              const s = eio((lt - d.delay) / 2.2);
              if (s >= 0.97) { absorbed++; continue; }
              let x = fx, y = fy;
              if (s > 0) {
                const ang = d.a0 + (lt - d.delay) * (1.2 + s * 5), rr = d.r0 * (1 - s);
                const b = sm(0, 0.35, s);
                x = lerp(fx, 640 + Math.cos(ang) * rr, b); y = lerp(fy, 554 + Math.sin(ang) * rr * 0.35 - rr * 0.2, b);
              }
              P.debrisItem(ctx, d, x, y, d.rot0 + lt * d.vr * (1 + s * 4), d.size * (1 - s * 0.7), 1 - s * 0.3);
            }
            // pool of gathered ink
            const pr = Math.min(130, 14 + absorbed * 2.4 + Math.max(0, lt - 6) * 12);
            if (lt > 0.9) {
              ctx.save();
              ctx.fillStyle = "rgba(210,190,240,0.18)"; Art.blobPath(ctx, 640, 560, pr + 4, pr * 0.28 + 3, Art.boil, 22, 0.2); ctx.fill();
              ctx.fillStyle = "#07040a"; Art.blobPath(ctx, 640, 560, pr, pr * 0.28, Art.boil, 22, 0.2); ctx.fill();
              ctx.restore();
              // tendrils whipping up from the pool
              const tk = sm(4.5, 6.4, lt);
              if (tk > 0) for (let i = 0; i < 7; i++) {
                const pts = [], L = tk * (140 + (i % 3) * 90);
                for (let k2 = 0; k2 <= 12; k2++) { const u = k2 / 12; pts.push(640 + (i - 3) * 18 + Math.sin(u * 5 + P.T * 3 + i) * 30 * u + (i - 3) * 30 * u, 560 - u * L); }
                ctx.fillStyle = "#0e0810"; Art.brush(ctx, pts, 12 - Math.abs(i - 3), { seed: i + Art.boil, taperStart: 0, taperEnd: 0.9 });
              }
            }
            P.parts.draw(ctx);
            // Ink Spot rises
            if (lt > 6.1) {
              const rise = eo((lt - 6.1) / 2.4);
              LD.drawInkSpot(ctx, 640, 566 + (1 - rise) * 440, 2.05, P.T, Math.min(1, (lt - 6.1) * 1.2), {});
              if (lt > 8.6) { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 646, 263, 90, "rgba(235,215,255,0.8)", bump((lt - 8.6) / 1.4)); ctx.restore(); }
            }
            ctx.restore();
          },
        },
        // VI ----------------------------------------------------------- the promise
        {
          num: "VI", name: "The Promise", dur: 10, tin: "ink", tout: "ink",
          lines: ["Every line you draw will one day be corrected.", "Scratched out. Painted over. Forgotten — like me.", "So I will finish them. Every colour. Every page.", "Nothing will ever change again."],
          ev: [[0.4, () => sfx("whisper")], [2.4, () => sfx("whisper")], [4.4, () => sfx("whisper")], [6.4, () => { sfx("roar"); P.shake = 0.5; }]],
          draw(ctx, lt) {
            ctx.fillStyle = "#050305"; ctx.fillRect(0, 0, W, H);
            const g = ctx.createRadialGradient(640, 360, 100, 640, 360, 760);
            g.addColorStop(0, "rgba(60,20,50,0)"); g.addColorStop(1, "rgba(90,20,40," + (0.35 + Math.sin(P.T * 2) * 0.1) + ")");
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            // his face, enormous and near
            LD.drawInkSpot(ctx, 640 + Math.sin(P.T * 0.4) * 20, 540 + 146 * 5.2 + Math.sin(P.T * 0.7) * 10, 5.2, P.T, 0.6, {});
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            Art.glow(ctx, 656 + Math.sin(P.T * 0.4) * 20, 530, 130, "rgba(235,210,255,0.5)", 0.6 + Math.sin(P.T * 3) * 0.2);
            ctx.restore();
            // ink dripping from the top of the frame
            ctx.fillStyle = "#050305";
            for (let i = 0; i < 16; i++) { const x = i * 84 + 20, L = 40 + eo((lt - i * 0.15) / 4) * (80 + U.hash(i) * 200); Art.brush(ctx, [x, -5, x + 1, L * 0.6, x, L], 16 + U.hash(i * 3) * 18, { seed: i, taperStart: 0, taperEnd: 0.6, jitter: 0.1 }); ctx.beginPath(); ctx.arc(x, L, 6 + U.hash(i * 3) * 6, 0, 7); ctx.fill(); }
            // his words, trembling
            this.lines.forEach((ln, i) => {
              const t0 = 0.4 + i * 2.0;
              if (lt < t0) return;
              const n = Math.floor(clamp((lt - t0) * 30, 0, ln.length));
              const last = i === this.lines.length - 1;
              P.jitterText(ctx, ln.slice(0, n), ln, 640, 170 + i * 70 + (last ? 20 : 0), last ? 46 : 36, last ? "#f3d6dc" : "#e9dff0", i);
            });
          },
        },
        // VII ---------------------------------------------------------- the stealing
        {
          num: "VII", name: "The Stealing", dur: 11.5, tin: "ink",
          cap: "Now it reaches up out of the gutter, draining the Borough of its colours — so that nothing drawn can ever change again.",
          enter() { P.getCity(); },
          ev: [[0.05, () => A.play("boss")], [1.4, () => { sfx("stomp"); P.shake = 0.5; }], ...[0, 1, 2, 3].flatMap((i) => [[2.6 + i * 1.7, () => sfx("inkSpend")], [3.7 + i * 1.7, () => { sfx(i === 0 ? "splash" : i === 1 ? "fireBurst" : "breakWall"); P.shake = 0.45; }]]), [10.3, () => { sfx("roar"); P.shake = 0.7; }]],
          tick(dt, lt) {
            P.pigments.forEach((p, i) => {
              const t0 = 2.6 + i * 1.7, f = (lt - t0) / 1.1;
              if (f > 0 && f < 1) { const q = P.pigPos(p, f); for (let k = 0; k < 2; k++) P.parts.add({ kind: "spark", x: q.x + U.rand(-8, 8), y: q.y + U.rand(-8, 8), vx: U.rand(-40, 40), vy: U.rand(-40, 40), life: 0.8, size: 2.5, color: p.glow }); }
            });
          },
          draw(ctx, lt) {
            ctx.drawImage(P.cityFull, 0, 0);
            if (lt > 3.7 + 2.6) ctx.drawImage(P.cityGrey, 0, 0);
            else P.pigments.forEach((p, i) => {
              const tc = 3.7 + i * 1.7;
              if (lt < tc) return;
              const R = eio((lt - tc) / 2.6) * 1500;
              ctx.save(); Art.blobPath(ctx, p.x, p.y + 200, R, R * 0.8, i * 31, 26, 0.18); ctx.clip(); ctx.drawImage(P.cityGrey, 0, 0); ctx.restore();
            });
            const allGrey = sm(9.2, 10.5, lt);
            P.drawLife(ctx, P.T, { grey: lt > 6, dashed: allGrey > 0.5, erase: sm(10, 11.3, lt) });
            // darkness welling from the bottom
            const dg = ctx.createLinearGradient(0, H, 0, H - 360);
            dg.addColorStop(0, "rgba(6,3,6," + (0.4 + sm(0, 3, lt) * 0.5) + ")"); dg.addColorStop(1, "rgba(6,3,6,0)");
            ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
            // tendrils clawing over the page edge
            for (let i = 0; i < 11; i++) {
              const x0 = 60 + i * 115 + U.hash(i) * 40, L = eo((lt - 0.2 - i * 0.1) / 2.2) * (140 + U.hash(i * 5) * 260);
              if (L <= 1) continue;
              const pts = [];
              for (let k = 0; k <= 14; k++) { const u = k / 14; pts.push(x0 + Math.sin(u * 4 + P.T * 2 + i) * 26 * u, H + 10 - u * L); }
              ctx.fillStyle = "#0b060b"; Art.brush(ctx, pts, 22 - (i % 3) * 5, { seed: i + Art.boil, taperStart: 0, taperEnd: 0.95 });
            }
            // the arm and hand
            const rise = eo((lt - 1.2) / 1.6);
            if (rise > 0) {
              const oy = (1 - rise) * 420, px = 640 + Math.sin(P.T * 0.8) * 10, py = 470 + oy;
              let curl = 0.12;
              P.pigments.forEach((p, i) => { curl = Math.max(curl, bump((lt - (3.55 + i * 1.7)) / 0.7) * 0.9); });
              curl = Math.max(curl, sm(10, 10.8, lt));
              P.drawHand(ctx, px, py, curl, oy);
            }
            // pigments torn from the sky
            P.pigments.forEach((p, i) => {
              const t0 = 2.6 + i * 1.7, f = (lt - t0) / 1.1;
              if (f < 0) { P.drawOrb(ctx, p, p.x, p.y + Math.sin(P.T * 1.4 + i) * 6, 1 + Math.sin(P.T * 8) * 0.04 * sm(t0 - 1, t0, lt), P.T); return; }
              if (f >= 1) { if (f < 1.6) { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 640, 470, 200, p.glow, 1 - (f - 1) / 0.6); ctx.restore(); } return; }
              const pts = [];
              const f0 = Math.max(0, f - 0.4);
              for (let k = 0; k <= 12; k++) { const q = P.pigPos(p, lerp(f0, f, k / 12)); pts.push(q.x, q.y); }
              ctx.save(); ctx.globalAlpha *= 0.65; ctx.fillStyle = p.c;
              Art.brush(ctx, pts, 22, { seed: i, taperStart: 0.9, taperEnd: 0.05 });
              ctx.restore();
              const q = P.pigPos(p, f);
              P.drawOrb(ctx, p, q.x, q.y, 1 - f * 0.4, P.T);
            });
            P.parts.draw(ctx);
          },
        },
        // VIII --------------------------------------------------------- a finished page
        {
          num: "VIII", name: "A Finished Page", dur: 9.5,
          cap: "A page that cannot change is a page that has died. If its colours are never returned, Looseleaf Borough will be finished — forever.",
          enter() { P.getCity(); },
          ev: [[0.05, () => A.play("void")], [0.9, () => sfx("crackle")], [2.3, () => sfx("crackle")], [2.6, () => sfx("breakWall")], [4.2, () => sfx("drip")], [7.6, () => sfx("tear")]],
          tick(dt, lt) {
            if (lt > 1.5 && lt < 5 && Math.random() < 0.7) { const f = U.pick(P.folks); P.parts.add({ x: f.a + U.rand(-10, 10), y: GY - U.rand(0, 40), vx: U.rand(-20, 30), vy: U.rand(-60, -20), life: 2, size: U.rand(1, 3), color: "rgba(120,120,120,0.7)" }); }
          },
          draw(ctx, lt) {
            const z = 1 + lt * 0.01;
            ctx.save(); ctx.translate(640, 360); ctx.scale(z, z); ctx.translate(-640, -360);
            ctx.drawImage(P.cityGrey, 0, 0);
            P.drawLife(ctx, P.T, { grey: true, dashed: true, frozen: 1, erase: 0.5 + sm(1.5, 4.5, lt) * 0.5 });
            P.drawCracks(ctx, lt, false);
            ctx.restore();
            ctx.fillStyle = "rgba(6,4,6," + (0.2 + sm(0, 7, lt) * 0.35) + ")"; ctx.fillRect(0, 0, W, H);
            // brittle hatching creeping in from the edges
            const hk = sm(1, 7, lt);
            ctx.save(); ctx.globalAlpha *= hk;
            Art.hatch(ctx, 0, 0, 220, H, 6, 0.8, "#000", 0.35, 1, 3);
            Art.hatch(ctx, W - 220, 0, 220, H, 6, -0.8, "#000", 0.35, 1, 4);
            ctx.restore();
            // one last drop of blue, still breathing
            const hb = sm(3.8, 5, lt);
            if (hb > 0) {
              const pulse = 1 + Math.sin(P.T * 3) * 0.12;
              ctx.save(); ctx.globalCompositeOperation = "lighter";
              Art.glow(ctx, 640, 300, 90 * pulse, "rgba(90,150,235,0.8)", hb);
              ctx.restore();
              Art.elementGlyph(ctx, "water", 640, 302, 14 * pulse, "rgba(120,180,245," + hb + ")");
            }
            // a seam of light splitting the sky
            const tk = sm(7.4, 9.3, lt);
            if (tk > 0) P.drawTear(ctx, tk * 0.18, lt);
          },
        },
        // IX ----------------------------------------------------------- one more line
        {
          num: "IX", name: "One More Line", dur: 12.5, capEnd: 6.1,
          cap: "So the book did the one thing it still could. It drew one more line. It drew you.",
          enter() { P.getCity(); },
          ev: [[0.05, () => A.play("ending")], [0.3, () => { sfx("tear"); P.shake = 0.4; }], ...every(1.2, 3.0, 0.14, "scratch"), [3.1, () => sfx("fold")], [3.8, () => sfx("bell")], [4.6, () => sfx("dodge")], [6.3, () => { sfx("stomp"); sfx("bell"); sfx("inkGain"); P.shake = 0.9; P.titleBurst(); }], [7.6, () => sfx("save")]],
          tick(dt, lt) {
            if (lt > 0.3 && lt < 6 && Math.random() < 0.8) P.parts.add({ kind: "ember", x: U.rand(480, 800), y: 120 + U.rand(-10, 10), vx: U.rand(-40, 40), vy: U.rand(30, 120), life: 2.4, size: 2, color: "rgba(255,225,160,0.8)" });
            if (lt > 4.6 && lt < 6.3 && Math.random() < 0.9) { const y = P.figY || 330; P.parts.add({ x: 640 + U.rand(-30, 30), y: y - 40, vx: 0, vy: U.rand(-200, -60), life: 0.6, size: U.rand(2, 5) }); }
          },
          draw(ctx, lt) {
            ctx.drawImage(P.cityGrey, 0, 0);
            P.drawCracks(ctx, lt, true);
            ctx.fillStyle = "rgba(6,4,6,0.6)"; ctx.fillRect(0, 0, W, H);
            const open = 0.18 + eo((lt - 0.3) / 1.4) * 0.82;
            P.drawTear(ctx, open * (1 - sm(9, 11, lt) * 0.7), lt);
            // the page draws the mender
            const reveal = eio((lt - 1.2) / 1.8), fill = sm(3.0, 3.6, lt);
            const dive = ein((lt - 4.6) / 1.5);
            const fy = 330 + dive * 760, S = 2.4 * (1 + dive * 0.4);
            P.figY = fy;
            if (reveal > 0 && lt < 6.3) {
              if (dive > 0) { ctx.save(); ctx.fillStyle = "rgba(11,7,9,0.8)"; Art.brush(ctx, [640, 190, 642, (190 + fy) / 2, 640, fy - 90], 10 * dive + 2, { seed: 3, taperStart: 0.9, taperEnd: 0.1 }); ctx.restore(); }
              ctx.save(); ctx.translate(640, fy); ctx.rotate(dive * 0.3); ctx.scale(S, S);
              ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 0, 0, 90, "rgba(255,230,180,0.5)", fill * (1 - dive)); ctx.restore();
              P.drawFigure(ctx, lt, reveal, fill, P.T);
              ctx.restore();
              if (lt < 3.05) { const h = head(partial(P.fig, reveal)); if (h) quill(ctx, 640 + h.x * S, fy + h.y * S, 0.5, 2.3, 0); }
              if (lt > 3.8 && lt < 4.6) { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 640 + 2 * S, fy - 32 * S, 50, "rgba(255,240,210,0.9)", bump((lt - 3.8) / 0.8)); ctx.restore(); }
              if (dive > 0) { ctx.save(); ctx.strokeStyle = "rgba(255,240,220,0.3)"; ctx.lineWidth = 2; for (let i = 0; i < 14; i++) { const x = 520 + U.hash(i) * 240, y = (U.hash(i * 3) * H + P.T * 1600) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 60 + dive * 80); ctx.stroke(); } ctx.restore(); }
            }
            P.parts.draw(ctx);
            // the title slams onto the page
            if (lt > 6.3) {
              const k = U.easeOutBack(clamp((lt - 6.3) / 0.55, 0, 1)), sc = lerp(2.4, 1, k);
              ctx.fillStyle = "rgba(6,4,6," + Math.min(0.55, (lt - 6.3) * 2) + ")"; ctx.fillRect(0, 0, W, H);
              ctx.save(); ctx.translate(640, 380); ctx.scale(sc, sc); ctx.globalAlpha *= clamp((lt - 6.3) * 4, 0, 1);
              Art.text(ctx, "THE", 0, -84, 36, { align: "center", font: "title", color: "#e9dcc0", outline: 4, outlineColor: "rgba(0,0,0,0.6)" });
              Art.text(ctx, "Living Draft", 0, 20, 124, { align: "center", font: "title", color: "#f4e9d2", outline: 7, outlineColor: "rgba(0,0,0,0.7)" });
              ctx.restore();
              const uw = eo((lt - 6.8) / 0.8) * 640;
              if (uw > 0) { ctx.fillStyle = "#b8342a"; Art.brush(ctx, [640 - uw / 2, 426, 640, 420, 640 + uw / 2, 428], 8, { seed: 4, taperStart: 0.1, taperEnd: 0.4 }); }
              Art.text(ctx, "Chapter 1  ·  Looseleaf Borough", 640, 478, 30, { align: "center", font: "title", color: "#e6d9bc", alpha: sm(7.5, 8.2, lt) });
              Art.text(ctx, "Mend what was drawn. Return what was taken.", 640, 520, 24, { align: "center", color: "#cdbfa5", alpha: sm(8.3, 9, lt) });
              const fl = 1 - clamp((lt - 6.3) / 0.6, 0, 1);
              if (fl > 0) { ctx.fillStyle = "rgba(255,248,235," + fl + ")"; ctx.fillRect(0, 0, W, H); }
            }
            if (lt > 11) { ctx.fillStyle = "rgba(0,0,0," + sm(11, 12.4, lt) + ")"; ctx.fillRect(0, 0, W, H); }
          },
        },
      ];
    }

    // ---- scene helpers
    splash(x, y, n, color = INK) {
      for (let i = 0; i < n; i++) { const a = -Math.PI * U.rand(0.05, 0.95); const v = U.rand(80, 420); this.parts.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, life: U.rand(0.5, 1.1), size: U.rand(1.5, 5), color }); }
    }
    titleBurst() {
      for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(200, 900); this.parts.add({ x: 640, y: 380, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, g: 300, drag: 2.5, life: U.rand(0.8, 1.8), size: U.rand(3, 12), color: i % 5 ? INK : "#b8342a" }); }
    }
    pigPos(p, f) {
      const k = eio(f), cx = p.x + (640 - p.x) * 0.2, cy = Math.max(p.y, 470) + 180;
      const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
      return { x: a * p.x + b * cx + c * 640, y: a * p.y + b * cy + c * 470 };
    }
    drawHand(ctx, px, py, curl, oy) {
      ctx.save();
      const arm = [640, H + 60, 600, 700 + oy * 0.2, 660, 580 + oy * 0.6, px, py + 10];
      ctx.fillStyle = "rgba(225,210,245,0.14)";
      Art.brush(ctx, spline(arm, 6), 150, { seed: 2, taperStart: 0, taperEnd: 0.1, jitter: 0.1 });
      ctx.fillStyle = "#0b060b";
      Art.brush(ctx, spline(arm, 6), 136, { seed: 2 + Art.boil, taperStart: 0, taperEnd: 0.1, jitter: 0.12 });
      Art.blobPath(ctx, px, py, 70, 60, Art.boil, 16, 0.18); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const base = -2.75 + i * 0.47, len = (i === 0 ? 70 : 96 - Math.abs(i - 2.5) * 10) * 1.7, dir = i < 2.5 ? 1 : -1;
        const a1 = base + curl * 0.9 * dir, a2 = a1 + curl * 1.3 * dir;
        const bx = px + Math.cos(base) * 52, by = py + Math.sin(base) * 50;
        const mx = bx + Math.cos(a1) * len * 0.55, my = by + Math.sin(a1) * len * 0.55;
        const tx = mx + Math.cos(a2) * len * 0.5, ty = my + Math.sin(a2) * len * 0.5;
        Art.brush(ctx, [bx, by, mx, my, tx, ty], 28, { seed: i + Art.boil, taperStart: 0, taperEnd: 0.8 });
      }
      ctx.restore();
    }
    drawTear(ctx, open, lt) {
      const x0 = 440, x1 = 840, yc = 118, h = open * 90;
      if (h < 0.5) return;
      const top = [], bot = [];
      for (let i = 0; i <= 20; i++) {
        const u = i / 20, x = lerp(x0, x1, u), env = Math.sin(u * Math.PI);
        top.push(x, yc - h * env * (0.6 + U.hash(i) * 0.5));
        bot.push(x, yc + h * env * (0.5 + U.hash(i + 40) * 0.5));
      }
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      // god rays
      for (let i = 0; i < 9; i++) {
        const a = Math.PI / 2 + (i - 4) * 0.16 + Math.sin(this.T * 0.7 + i) * 0.03, L = 800;
        ctx.fillStyle = "rgba(255,230,180," + 0.07 * open + ")";
        ctx.beginPath(); ctx.moveTo(560 + i * 20, yc); ctx.lineTo(640 + Math.cos(a - 0.06) * L, yc + Math.sin(a - 0.06) * L); ctx.lineTo(640 + Math.cos(a + 0.06) * L, yc + Math.sin(a + 0.06) * L); ctx.closePath(); ctx.fill();
      }
      Art.glow(ctx, 640, yc, 260 * open + 40, "rgba(255,225,170,0.6)");
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(top[0], top[1]);
      for (let i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1]);
      for (let i = bot.length - 2; i >= 0; i -= 2) ctx.lineTo(bot[i], bot[i + 1]);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, yc - h, 0, yc + h);
      g.addColorStop(0, "#fff3d6"); g.addColorStop(0.5, "#ffffff"); g.addColorStop(1, "#ffd99a");
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "#e9dcc0"; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      // curled paper flaps at the lips of the tear
      ctx.save(); ctx.fillStyle = "#d8c9a8"; ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 1;
      for (let i = 3; i < 18; i += 4) {
        const tx = top[i * 2], ty = top[i * 2 + 1], bx = bot[i * 2], by = bot[i * 2 + 1];
        ctx.beginPath(); ctx.moveTo(tx - 12, ty); ctx.lineTo(tx + 12, ty); ctx.lineTo(tx + 4, ty - 10 * open); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx - 12, by); ctx.lineTo(bx + 12, by); ctx.lineTo(bx - 2, by + 12 * open); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
    debrisItem(ctx, d, x, y, rot, s, a) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= a;
      if (d.kind === "ball") {
        ctx.fillStyle = "#d9ccb0"; Art.blobPath(ctx, 0, 0, 14, 12, d.x0, 12, 0.35); ctx.fill();
        ctx.strokeStyle = "rgba(60,45,30,0.7)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(2, 1); ctx.lineTo(6, -6); ctx.moveTo(-4, 6); ctx.lineTo(4, 3); ctx.stroke();
      } else if (d.kind === "scrap") {
        ctx.fillStyle = "#e2d6bc"; ctx.beginPath(); ctx.moveTo(-18, -12); ctx.lineTo(16, -14); ctx.lineTo(20, 10); ctx.lineTo(4, 14); ctx.lineTo(-16, 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(40,30,20,0.6)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(12, -5); ctx.moveTo(-12, 3); ctx.lineTo(8, 2); ctx.stroke();
      } else {
        const word = d.word.replace(/~~/g, ""), struck = d.word.startsWith("~~");
        ctx.font = "18px " + Art.HAND;
        const w = ctx.measureText(word).width + 16;
        ctx.fillStyle = "#e6dac0"; ctx.fillRect(-w / 2, -13, w, 24);
        Art.text(ctx, word, 0, 5, 18, { align: "center", color: "#2a1a10" });
        if (struck || d.x0 % 3 < 1) { ctx.fillStyle = "#1a0c0a"; Art.brush(ctx, [-w / 2 + 4, -1, 0, -3, w / 2 - 4, 0], 2.6, { seed: d.x0, taperStart: 0.1, taperEnd: 0.1 }); }
      }
      ctx.restore();
    }
    jitterText(ctx, shown, full, cx, y, size, color, seed) {
      ctx.save();
      ctx.font = size + "px " + Art.HAND;
      const fw = ctx.measureText(full).width;
      let x = cx - fw / 2;
      const glitch = Math.sin(this.T * 13 + seed) > 0.93;
      for (let c = 0; c < shown.length; c++) {
        const ch = shown[c], cw = ctx.measureText(ch).width;
        const jx = (U.hash(c + seed * 50 + Art.boil) - 0.5) * 2.6, jy = (U.hash(c * 3 + seed * 70 + Art.boil) - 0.5) * 2.6;
        if (glitch) { ctx.fillStyle = "rgba(255,60,80,0.5)"; ctx.fillText(ch, x + jx - 3, y + jy); ctx.fillStyle = "rgba(80,200,255,0.4)"; ctx.fillText(ch, x + jx + 3, y + jy); }
        ctx.fillStyle = color; ctx.fillText(ch, x + jx, y + jy);
        x += cw;
      }
      ctx.restore();
    }
    drawBook(ctx, lt) {
      const sx = 640, top = 205, pw = 260, ph = 330;
      const appear = eo((lt - 0.4) / 1.6);
      ctx.save(); ctx.globalAlpha *= appear; ctx.translate(0, (1 - appear) * 50);
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.ellipse(sx, top + ph + 34, 340, 30, 0, 0, 7); ctx.fill();
      const a = eio((lt - 2.1) / 1.5) * Math.PI;
      const board = (x) => { ctx.fillStyle = "#3a2216"; ctx.beginPath(); ctx.roundRect(x, top - 10, pw + 16, ph + 20, 8); ctx.fill(); };
      board(sx);
      if (a >= Math.PI - 0.001) board(sx - pw - 16);
      for (let i = 4; i >= 1; i--) { ctx.fillStyle = i % 2 ? "#cdbb95" : "#ddcca8"; ctx.fillRect(sx + i * 1.5, top + i * 1.2, pw, ph); }
      ctx.drawImage(this.pageSm, sx, top);
      const firstFlipDone = lt > 3.7 + 0.62;
      if (a >= Math.PI - 0.001) {
        for (let i = 4; i >= 1; i--) { ctx.fillStyle = i % 2 ? "#cdbb95" : "#ddcca8"; ctx.fillRect(sx - pw - i * 1.5, top + i * 1.2, pw, ph); }
        ctx.drawImage(firstFlipDone ? this.pageSmL : this.endpaper, sx - pw, top);
      }
      const sg = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
      sg.addColorStop(0, "rgba(40,25,12,0)"); sg.addColorStop(0.5, "rgba(40,25,12,0.5)"); sg.addColorStop(1, "rgba(40,25,12,0)");
      ctx.fillStyle = sg; ctx.fillRect(sx - 30, top, 60, ph);
      for (let i = 0; i < 7; i++) {
        const b = eio((lt - 3.7 - i * 0.26) / 0.62) * Math.PI;
        if (b > 0 && b < Math.PI) this.flipQuad(ctx, sx, top, pw, ph, b, this.pageSm, this.pageSmL);
      }
      if (a <= 0) ctx.drawImage(this.coverImg, sx, top - 10);
      else if (a < Math.PI) this.flipQuad(ctx, sx, top - 10, pw + 16, ph + 20, a, this.coverImg, this.endpaperBig);
      ctx.restore();
    }
    flipQuad(ctx, sx, y, w, h, ang, front, back) {
      const c = Math.cos(ang), s = Math.sin(ang);
      ctx.save();
      ctx.translate(sx, y);
      ctx.transform(c, -s * 0.16, 0, 1 + s * 0.08, 0, -s * h * 0.04);
      ctx.drawImage(c >= 0 ? front : back, 0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0," + (1 - Math.abs(c)) * 0.35 + ")"; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // ---------------------------------------------------------------- flow
    enter(i) {
      this.si = i; this.lt = 0; this.evi = 0; this.parts = new Parts();
      const sc = this.scenes[i];
      if (sc.enter) sc.enter();
    }
    finish() {
      if (this.done) return;
      this.done = true;
      if (this.onDone) this.onDone(this.G);
    }
    update(dt, G) {
      if (this.done) return false;
      this.T += dt; this.lt += dt;
      const sc = this.scenes[this.si];
      while (sc.ev && this.evi < sc.ev.length && sc.ev[this.evi][0] <= this.lt) { sc.ev[this.evi][1].call(sc); this.evi++; }
      if (sc.tick) sc.tick.call(sc, dt, this.lt);
      this.parts.update(dt);
      this.shake = Math.max(0, this.shake - dt * 1.6);
      if (this.T > 0.6) {
        if (I.pressed("back") || I.pressed("pause")) { A.sfx.page(); this.finish(); return false; }
        if ((I.pressed("confirm") || I.pressed("attack") || I.pressed("jump") || I.mouse.pressed) && this.lt > 0.4) { this.next(); return !this.done; }
      }
      if (this.lt >= sc.dur) this.next();
      return !this.done;
    }
    next() {
      if (this.si + 1 >= this.scenes.length) { this.finish(); return; }
      this.enter(this.si + 1);
    }
    draw(ctx) {
      const sc = this.scenes[this.si], lt = this.lt;
      ctx.save();
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake * 22, (Math.random() - 0.5) * this.shake * 22);
      sc.draw.call(sc, ctx, lt);
      ctx.restore();
      // transitions
      if (sc.tin === "ink") this.inkCover(ctx, 1 - clamp(lt / 0.8, 0, 1), INK, this.si * 7);
      if (sc.tin === "paper") { const k = 1 - clamp(lt / 0.5, 0, 1); if (k > 0) { ctx.fillStyle = "rgba(233,220,192," + k + ")"; ctx.fillRect(0, 0, W, H); } }
      if (sc.tout === "ink") this.inkCover(ctx, clamp((lt - (sc.dur - 0.8)) / 0.8, 0, 1), INK, this.si * 7 + 3);
      // film grain, flicker and vignette
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.14;
      ctx.fillStyle = ctx.createPattern(Art.grain(), "repeat");
      ctx.translate((this.T * 97) % 256, (this.T * 61) % 256); ctx.fillRect(-256, -256, W + 512, H + 512);
      ctx.restore();
      if (!this.vig) this.vig = Art.vignette(W, H);
      ctx.drawImage(this.vig, 0, 0);
      ctx.fillStyle = "rgba(255,240,210," + (U.hash(Math.floor(this.T * 24)) * 0.025) + ")"; ctx.fillRect(0, 0, W, H);
      // caption
      this.caption(ctx, sc.cap, lt, sc.dur, 0.8, sc.capEnd);
      // letterbox
      const bar = BAR * eo(this.T / 1.2);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
      const na = Math.min(sm(0.2, 0.8, lt), 1 - sm(sc.dur - 0.8, sc.dur - 0.2, lt));
      if (na > 0) {
        Art.text(ctx, sc.num + "  ·  " + sc.name, 40, 35, 20, { font: "title", color: "rgba(233,220,192,0.75)", alpha: na });
        ctx.save(); ctx.globalAlpha *= na * 0.6; ctx.fillStyle = "#b8342a"; Art.brush(ctx, [40, 42, 120, 41, 200, 43], 2, { seed: this.si }); ctx.restore();
      }
      // progress ticks
      for (let i = 0; i < this.scenes.length; i++) {
        ctx.fillStyle = i < this.si ? "rgba(233,220,192,0.7)" : i === this.si ? "#b8342a" : "rgba(233,220,192,0.2)";
        ctx.beginPath(); ctx.arc(W - 200 + i * 18, 28, i === this.si ? 4 : 3, 0, 7); ctx.fill();
      }
      Art.text(ctx, (I.usingPad ? "A" : "Enter") + " ▸ next scene    ·    " + (I.usingPad ? "B" : "Esc") + " ▸ skip", W - 36, H - 20, 16, { align: "right", color: "rgba(233,220,192,0.4)" });
      ctx.restore();
    }
  }

  LD.Prologue = Prologue;
})();
