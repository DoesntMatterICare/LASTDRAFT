// WeaponDrawingSystem: the player draws a freeform silhouette; the book reads its BROAD
// shape (principal axis, length/breadth, where the mass sits) and classifies it as
// Blade / Polearm / Heavy Tool. No artistic skill needed. The drawing itself becomes the
// weapon: it is inked, lifts off the page and materialises in the Sketcher's hand.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, I = LD.Input, A = LD.Audio;

  const sig = (x) => 1 / (1 + Math.exp(-x));
  const CLASSES = ["blade", "polearm", "heavy"];

  // ---------------------------------------------------------------- shape analysis
  function resample(strokes, step = 4) {
    const out = [];
    for (const s of strokes) {
      if (!s.length) continue;
      out.push(s[0]);
      for (let i = 1; i < s.length; i++) {
        const a = s[i - 1], b = s[i];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.floor(d / step);
        for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / (n + 1), y: a.y + ((b.y - a.y) * k) / (n + 1) });
        out.push(b);
      }
    }
    return out;
  }

  function analyze(strokes) {
    const pts = resample(strokes);
    if (pts.length < 8) return { ok: false, why: "Draw a little more — the book can't read a dot." };
    let mx = 0, my = 0;
    for (const p of pts) { mx += p.x; my += p.y; }
    mx /= pts.length; my /= pts.length;
    let cxx = 0, cyy = 0, cxy = 0;
    for (const p of pts) { const dx = p.x - mx, dy = p.y - my; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
    const th = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    const ax = Math.cos(th), ay = Math.sin(th), nx = -ay, ny = ax;
    const us = [], vs = [];
    let uMin = 1e9, uMax = -1e9, vMin = 1e9, vMax = -1e9;
    for (const p of pts) {
      const dx = p.x - mx, dy = p.y - my, u = dx * ax + dy * ay, v = dx * nx + dy * ny;
      us.push(u); vs.push(v);
      uMin = Math.min(uMin, u); uMax = Math.max(uMax, u); vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
    }
    const L = uMax - uMin, Wd = vMax - vMin;
    if (L < 60) return { ok: false, why: "Draw it bigger — the book reads broad shapes." };
    const NB = 12, bmin = new Array(NB).fill(1e9), bmax = new Array(NB).fill(-1e9), cnt = new Array(NB).fill(0);
    for (let i = 0; i < us.length; i++) {
      const b = Math.min(NB - 1, Math.floor(((us[i] - uMin) / L) * NB));
      bmin[b] = Math.min(bmin[b], vs[i]); bmax[b] = Math.max(bmax[b], vs[i]); cnt[b]++;
    }
    const w = bmin.map((m, i) => (cnt[i] >= 2 ? bmax[i] - m : 0));
    const endMin = Math.max(w[0], w[1]), endMax = Math.max(w[NB - 1], w[NB - 2]);
    const headAtMax = endMax >= endMin;
    const head = Math.max(endMin, endMax);
    const midArr = w.slice(3, NB - 3).filter((x) => x > 0).sort((a, b) => a - b);
    const mid = midArr.length ? midArr[Math.floor(midArr.length / 2)] : 0;
    let inkLen = 0;
    for (const s of strokes) for (let i = 1; i < s.length; i++) inkLen += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
    const aspect = L / Math.max(Wd, 1);
    const headRel = head / L, midRel = mid / L;
    const headRatio = head / Math.max(mid, L * 0.02);
    const thr = Math.max(0.08 * L, 0.4 * head);
    const headSpan = w.filter((x) => x > thr).length;
    const density = inkLen / L;

    // A crossguard: a short, straight stroke lying ACROSS the axis, set in from one end.
    // It separates "sword with a guard" from "shaft with a head".
    let hasGuard = false;
    if (aspect > 2.6) {
      for (const s of strokes) {
        if (s.length < 2) continue;
        let plen = 0;
        for (let i = 1; i < s.length; i++) plen += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
        const a = s[0], b = s[s.length - 1];
        const ex = b.x - a.x, ey = b.y - a.y, el = Math.hypot(ex, ey);
        if (el < 0.08 * L || el > 0.45 * L || el / Math.max(plen, 1) < 0.8) continue;
        if (Math.abs((ex * ax + ey * ay) / el) > 0.45) continue;
        const cxm = (a.x + b.x) / 2 - mx, cym = (a.y + b.y) / 2 - my;
        const cu = cxm * ax + cym * ay, cv = cxm * nx + cym * ny;
        const fromEnd = Math.min(cu - uMin, uMax - cu) / L;
        if (!(fromEnd > 0.05 && fromEnd < 0.4 && Math.abs(cv) < el * 0.35)) continue;
        // beyond a sword's guard there is only a narrow hilt (a trident's crossbar has prongs)
        const gb = Math.min(NB - 1, Math.floor(((cu - uMin) / L) * NB));
        const nearMin = cu - uMin < uMax - cu;
        let beyond = 0;
        for (let i = nearMin ? 0 : gb + 2; i < (nearMin ? gb - 1 : NB); i++) if (i >= 0 && i < NB) beyond = Math.max(beyond, w[i]);
        if (beyond < el * 0.5) hasGuard = true;
      }
    }

    // clubs & maces: a solid body that swells toward one end
    const tail = Math.min(endMin, endMax);
    const taper = hasGuard ? 0 : 1.1 * sig((head / Math.max(tail, 2) - 2.2) * 3) * sig((midRel - 0.05) * 40) * sig((headRel - 0.18) * 20);
    const heavy = sig((headRel - 0.26) * 16) + sig((2.4 - aspect) * 3) * 0.8 + (headRel > 0.22 && density > 4 ? 0.3 : 0) + taper;
    const polearm = sig((aspect - 3.2) * 2.5) * sig((headRatio - 2.0) * 2.5) * sig((0.26 - headRel) * 16) * (headSpan >= 2 ? 1 : 0.7) * (hasGuard ? 0.3 : 1) * 1.4;
    const blade = sig((aspect - 2.6) * 2.5) * (1 - 0.75 * sig((headRatio - 2.6) * 2) * (hasGuard ? 0.1 : 1)) + 0.15 + (hasGuard ? 0.9 : 0);
    const sum = heavy + polearm + blade;
    const probs = { blade: blade / sum, polearm: polearm / sum, heavy: heavy / sum };
    const cls = CLASSES.reduce((a, b) => (probs[b] > probs[a] ? b : a));
    return {
      ok: true, cls, probs, th, mx, my, ax, ay, nx, ny, uMin, uMax, vMin, vMax, L, Wd, aspect, headRel, midRel, headRatio, headAtMax, w,
      read: cls === "blade" ? "long & narrow" : cls === "polearm" ? "a long shaft with a head" : "broad, with its weight at one end",
    };
  }

  // Convert the drawing into weapon-space: x 0 (grip) .. 1 (tip), y scaled equally.
  function normalize(strokes, an, cls) {
    // blades are gripped at their wider end (hilt / guard); hafted weapons at the narrow end
    const flip = cls === "blade" ? an.headAtMax : !an.headAtMax;
    const out = [];
    const sorted = strokes.slice().sort((a, b) => b.length - a.length).slice(0, 14);
    for (const s of sorted) {
      if (s.length < 2) continue;
      const step = Math.max(1, Math.ceil(s.length / 30));
      const arr = [];
      for (let i = 0; i < s.length; i += step) push(s[i]);
      push(s[s.length - 1]);
      function push(p) {
        const dx = p.x - an.mx, dy = p.y - an.my;
        let u = dx * an.ax + dy * an.ay, v = dx * an.nx + dy * an.ny;
        u = flip ? (an.uMax - u) / an.L : (u - an.uMin) / an.L;
        v = (flip ? -v : v) / an.L;
        arr.push(+u.toFixed(3), +U.clamp(v, -0.6, 0.6).toFixed(3));
      }
      out.push(arr);
    }
    return out;
  }

  // Stencils for players who can't (or don't want to) draw freehand — still "drawn" by the pen.
  const STENCILS = {
    blade: [[{ x: 135, y: 285 }, { x: 340, y: 80 }], [{ x: 150, y: 300 }, { x: 340, y: 80 }], [{ x: 112, y: 262 }, { x: 172, y: 322 }], [{ x: 140, y: 292 }, { x: 96, y: 336 }]],
    polearm: [[{ x: 60, y: 362 }, { x: 322, y: 96 }], [{ x: 306, y: 92 }, { x: 374, y: 36 }, { x: 350, y: 114 }, { x: 306, y: 92 }]],
    heavy: [[{ x: 110, y: 350 }, { x: 262, y: 160 }], [{ x: 192, y: 125 }, { x: 309, y: 218 }, { x: 358, y: 155 }, { x: 241, y: 62 }, { x: 192, y: 125 }], [{ x: 220, y: 118 }, { x: 320, y: 196 }], [{ x: 236, y: 92 }, { x: 336, y: 172 }]],
  };

  LD.WeaponDraw = { analyze, normalize, STENCILS };

  // ---------------------------------------------------------------- the desk overlay
  const CA = { x: 150, y: 170, w: 440, h: 400 };

  class DrawDesk {
    constructor(G, station, onClose) {
      this.G = G; this.station = station; this.onClose = onClose;
      this.pause = true; this.t = 0; this.open = 0;
      this.strokes = []; this.cur = null; this.an = null; this.mode = "draw";
      this.cursor = { x: CA.x + CA.w / 2, y: CA.y + CA.h / 2 };
      this.trace = null; this.msg = ""; this.msgT = 0; this.hover = null; this.scratchT = 0;
      this.buttons = [
        { id: "accept", x: 700, y: 548, w: 400, h: 50 },
        { id: "clear", x: 700, y: 606, w: 190, h: 40, label: "Clear page  [Bksp]" },
        { id: "cancel", x: 910, y: 606, w: 190, h: 40, label: "Close desk  [Esc]" },
        { id: "trace_blade", x: 700, y: 492, w: 125, h: 40, label: "Trace Blade [1]" },
        { id: "trace_polearm", x: 837, y: 492, w: 125, h: 40, label: "Trace Pole [2]" },
        { id: "trace_heavy", x: 974, y: 492, w: 126, h: 40, label: "Trace Heavy [3]" },
      ];
      A.sfx.page();
    }

    cost() { return this.an && this.an.ok ? D.weapons[this.an.cls].cost : 0; }
    canAccept() { return this.an && this.an.ok && LD.Ink.canAfford(this.G.S, this.cost()); }
    say(m) { this.msg = m; this.msgT = 3; }

    reanalyze() { this.an = this.strokes.length ? analyze(this.strokes) : null; }

    press(id) {
      if (this.mode !== "draw") return;
      if (id === "accept") {
        if (!this.an) { this.say("Draw a weapon's silhouette first."); A.sfx.uiNo(); return; }
        if (!this.an.ok) { this.say(this.an.why); A.sfx.uiNo(); return; }
        if (!this.canAccept()) { this.say("Not enough ink. You need " + this.cost() + ", you have " + Math.floor(this.G.S.ink) + "."); A.sfx.uiNo(); return; }
        this.commit();
      } else if (id === "clear") { this.strokes = []; this.an = null; this.trace = null; A.sfx.page(); }
      else if (id === "cancel") { this.closing = true; A.sfx.page(); }
      else if (id.startsWith("trace_")) {
        this.strokes = []; this.an = null;
        this.trace = { strokes: STENCILS[id.slice(6)], si: 0, t: 0 };
        A.sfx.uiOk();
      }
    }

    commit() {
      const S = this.G.S, an = this.an, cls = an.cls;
      LD.Ink.spend(S, D.weapons[cls].cost);
      S.redraws++;
      S.weapon = { cls, strokes: normalize(this.strokes, an, cls), element: S.weapon.element || "none" };
      this.mode = "materialize"; this.mt = 0;
      A.sfx.inkSpend();
      setTimeout(() => A.sfx.page(), 900);
      setTimeout(() => A.sfx.bell(), 1500);
      // ink motes stream from the HUD reservoir into the drawing
      this.motes = [];
      for (let i = 0; i < 70; i++) this.motes.push({ d: Math.random() * 0.8, s: U.rand(0.6, 1.2), tx: Math.random(), si: Math.floor(Math.random() * this.strokes.length) });
    }

    update(dt, G) {
      this.t += dt;
      this.open = Math.min(1, this.open + dt * 4);
      this.msgT = Math.max(0, this.msgT - dt);
      if (this.closing) { this.open -= dt * 8; if (this.open <= 0) { if (this.onClose) this.onClose(G, false); return false; } return true; }
      if (this.mode === "materialize") {
        this.mt += dt;
        if (this.mt > 2.7) {
          const b = this.bounds();
          G.weaponFly = { x: b.cx, y: b.cy, t: 0 };
          if (this.onClose) this.onClose(G, true);
          return false;
        }
        return true;
      }
      const m = I.mouse;
      const raw = (k) => I.pressedSet.has(k);
      // buttons
      this.hover = null;
      for (const b of this.buttons) if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) this.hover = b.id;
      if (m.pressed && this.hover) { this.press(this.hover); return true; }
      if (raw("Enter") || raw("Pad3")) this.press("accept");
      if (raw("Backspace") || raw("Delete") || raw("Pad2")) this.press("clear");
      if (raw("Escape") || raw("Pad1")) this.press("cancel");
      if (raw("Digit1")) this.press("trace_blade");
      if (raw("Digit2")) this.press("trace_polearm");
      if (raw("Digit3")) this.press("trace_heavy");

      // stencil tracing animates the pen along the template
      if (this.trace) {
        const tr = this.trace;
        tr.t += dt * 3.2;
        const s = tr.strokes[tr.si];
        if (!this.cur) { this.cur = [Object.assign({}, s[0])]; this.strokes.push(this.cur); }
        const segs = s.length - 1;
        const k = Math.min(segs, tr.t);
        const i = Math.min(segs - 1, Math.floor(k)), f = k - i;
        const a = s[i], b = s[i + 1];
        const p = { x: CA.x + a.x + (b.x - a.x) * f, y: CA.y + a.y + (b.y - a.y) * f };
        this.cur.length = 0;
        this.cur.push({ x: CA.x + s[0].x, y: CA.y + s[0].y });
        for (let j = 1; j <= i; j++) this.cur.push({ x: CA.x + s[j].x, y: CA.y + s[j].y });
        this.cur.push(p);
        this.cursor = { x: p.x, y: p.y };
        this.scratch(dt);
        if (tr.t >= segs) { tr.si++; tr.t = 0; this.cur = null; this.reanalyze(); if (tr.si >= tr.strokes.length) this.trace = null; }
        return true;
      }

      // freehand: pointer
      const inside = (p) => p.x > CA.x && p.x < CA.x + CA.w && p.y > CA.y && p.y < CA.y + CA.h;
      const mp = { x: m.x, y: m.y };
      if (m.pressed && inside(mp)) { this.cur = [mp]; this.strokes.push(this.cur); this.penSource = "mouse"; }
      if (this.cur && this.penSource === "mouse") {
        if (m.down) {
          const last = this.cur[this.cur.length - 1];
          const q = { x: U.clamp(mp.x, CA.x, CA.x + CA.w), y: U.clamp(mp.y, CA.y, CA.y + CA.h) };
          if (Math.hypot(q.x - last.x, q.y - last.y) > 3) { this.cur.push(q); this.scratch(dt); }
          this.cursor = q;
        } else { this.endStroke(); }
      }
      // freehand: keyboard / gamepad pen
      const kx = (I.held.has("ArrowRight") || I.held.has("KeyD") || I.held.has("PadRight") ? 1 : 0) - (I.held.has("ArrowLeft") || I.held.has("KeyA") || I.held.has("PadLeft") ? 1 : 0);
      const ky = (I.held.has("ArrowDown") || I.held.has("KeyS") || I.held.has("PadDown") ? 1 : 0) - (I.held.has("ArrowUp") || I.held.has("KeyW") || I.held.has("PadUp") ? 1 : 0);
      const penKey = I.held.has("Space") || I.held.has("KeyJ") || I.held.has("Pad0");
      if (kx || ky) {
        this.cursor.x = U.clamp(this.cursor.x + kx * 330 * dt, CA.x, CA.x + CA.w);
        this.cursor.y = U.clamp(this.cursor.y + ky * 330 * dt, CA.y, CA.y + CA.h);
      }
      if (penKey && this.penSource !== "mouse") {
        if (!this.cur) { this.cur = [{ x: this.cursor.x, y: this.cursor.y }]; this.strokes.push(this.cur); this.penSource = "keys"; }
        const last = this.cur[this.cur.length - 1];
        if (Math.hypot(this.cursor.x - last.x, this.cursor.y - last.y) > 3) { this.cur.push({ x: this.cursor.x, y: this.cursor.y }); this.scratch(dt); }
      } else if (this.cur && this.penSource === "keys") this.endStroke();
      return true;
    }

    endStroke() {
      if (this.cur && this.cur.length < 2) this.strokes.pop();
      this.cur = null; this.penSource = null;
      this.reanalyze();
    }
    scratch(dt) {
      this.scratchT -= dt;
      if (this.scratchT <= 0) { A.sfx.scratch(); this.scratchT = 0.05; }
    }

    bounds() {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const s of this.strokes) for (const p of s) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
      if (x0 > x1) return { cx: CA.x + CA.w / 2, cy: CA.y + CA.h / 2 };
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, x0, y0, x1, y1 };
    }

    // ---------------------------------------------------------------- draw
    draw(ctx, G) {
      const S = G.S, t = this.t;
      const k = U.easeOut(this.open);
      ctx.save();
      ctx.fillStyle = "rgba(8,5,4," + 0.72 * k + ")"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
      ctx.globalAlpha = k;
      ctx.translate(0, (1 - k) * 60);
      // open book spread
      ctx.save(); ctx.translate(0, 10);
      ctx.drawImage(LD.UIKit.cover(), 0, 0);
      ctx.drawImage(Art.parchment(560, 600, 101), 80, 60);
      ctx.drawImage(Art.parchment(560, 600, 102), 640, 60);
      ctx.drawImage(LD.UIKit.pageDeco(), 0, 0);
      ctx.restore();

      // left page: drawing area
      Art.text(ctx, "Draw a weapon", 360, 122, 36, { align: "center", font: "title", color: "#4a2418" });
      Art.text(ctx, "Only its broad silhouette matters — the book does the rest.", 360, 152, 20, { align: "center", color: "#5a4a3a" });
      ctx.save();
      ctx.strokeStyle = "rgba(90,60,40,0.35)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
      ctx.strokeRect(CA.x, CA.y, CA.w, CA.h); ctx.setLineDash([]);
      ctx.restore();
      if (!this.strokes.length && this.mode === "draw") {
        Art.text(ctx, "hold the mouse (or " + I.keyName("KeyJ") + " / Space + arrows) to draw", CA.x + CA.w / 2, CA.y + CA.h / 2, 21, { align: "center", color: "rgba(90,60,40,0.55)" });
      }
      this.drawStrokes(ctx, t);
      if (this.an && this.an.ok && this.mode === "draw") this.drawMeasure(ctx, this.an, 1);
      if (this.mode === "materialize") this.drawMaterialize(ctx, G);
      if (this.mode === "draw" && (I.usingPad || (!this.cur && this.penSource !== "mouse"))) {
        ctx.fillStyle = "rgba(21,16,13,0.7)";
        ctx.beginPath(); ctx.moveTo(this.cursor.x, this.cursor.y); ctx.lineTo(this.cursor.x + 6, this.cursor.y - 16); ctx.lineTo(this.cursor.x + 12, this.cursor.y - 12); ctx.closePath(); ctx.fill();
      }

      if (this.mode === "materialize") {
        const lines = ["The book measures your line…", "Ink gathers along it…", "…and the drawing rises from the page."];
        lines.forEach((l, i) => Art.text(ctx, l, 900, 250 + i * 60, 30, { align: "center", font: "serif", color: "#4a2418", alpha: U.clamp((this.mt - i * 0.7) * 2, 0, 1) }));
        ctx.restore();
        return;
      }
      // right page: the book's reading
      const rx = 700;
      Art.text(ctx, "The book reads your line", 900, 122, 30, { align: "center", font: "title", color: "#4a2418" });
      let yy = 170;
      for (const c of CLASSES) {
        const wd = D.weapons[c];
        const p = this.an && this.an.ok ? this.an.probs[c] : 0;
        const sel = this.an && this.an.ok && this.an.cls === c;
        // archetype mini-sketch
        ctx.save(); ctx.translate(rx + 6, yy + 20); ctx.rotate(-0.5);
        LD.drawWeaponStrokes(ctx, MINI[c], 58, "none", Art.boil);
        ctx.restore();
        Art.text(ctx, wd.name, rx + 80, yy + 18, 28, { font: "title", color: sel ? "#7a1f16" : "#3a2a1e" });
        Art.text(ctx, wd.cost + " ink", rx + 400, yy + 18, 22, { align: "right", color: sel ? "#7a1f16" : "#5a4a3a" });
        Art.text(ctx, wd.desc, rx + 80, yy + 44, 18, { color: "#5a4a3a" });
        // likelihood bar (hatched, so it reads without color)
        ctx.strokeStyle = "rgba(60,40,25,0.5)"; ctx.lineWidth = 1.2; ctx.strokeRect(rx + 80, yy + 54, 320, 10);
        if (p > 0) { Art.hatch(ctx, rx + 80, yy + 54, 320 * p, 10, 4, 0.8, sel ? "#7a1f16" : "#3a2a1e", 0.9, 1.6, 3); }
        if (sel) { ctx.fillStyle = "#7a1f16"; Art.brush(ctx, [rx + 60, yy + 4, rx + 66, yy + 12, rx + 74, yy - 4], 3, { seed: 1 }); }
        yy += 88;
      }
      // verdict
      const an = this.an;
      let verdict = "Waiting for a line…";
      if (an && !an.ok) verdict = an.why;
      else if (an && an.ok) verdict = "“" + an.read + "” → " + D.weapons[an.cls].name.toUpperCase();
      Art.text(ctx, verdict, 900, 450, 23, { align: "center", color: an && an.ok ? "#7a1f16" : "#5a4a3a" });
      const curW = D.weapons[S.weapon.cls];
      Art.text(ctx, "Carrying: " + curW.name + (S.weapon.cls !== "nib" ? " — it will dissolve, no ink returned" : ""), 900, 476, 16, { align: "center", color: "#6b5a44" });

      // buttons
      for (const b of this.buttons) {
        const hov = this.hover === b.id;
        let label = b.label, enabled = true;
        if (b.id === "accept") {
          const c = this.cost();
          enabled = this.canAccept();
          label = an && an.ok ? "Ink it into being  —  " + c + " ink  (" + Math.floor(S.ink) + " → " + Math.floor(S.ink - c) + ")  [Enter]" : "Ink it into being  [Enter]";
        }
        ctx.save();
        ctx.globalAlpha *= enabled || b.id !== "accept" ? 1 : 0.5;
        ctx.fillStyle = hov ? "rgba(122,31,22,0.16)" : "rgba(60,40,25,0.07)";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = hov ? "#7a1f16" : "rgba(60,40,25,0.55)"; ctx.lineWidth = hov ? 2.5 : 1.5;
        Art.sketch(ctx, [b.x, b.y, b.x + b.w, b.y + 1, b.x + b.w - 1, b.y + b.h, b.x + 1, b.y + b.h - 1], hov ? 2.5 : 1.5, ctx.strokeStyle, b.x, 0.8, true, 1);
        Art.text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 7, b.id === "accept" ? 21 : 18, { align: "center", color: "#2a1a10" });
        ctx.restore();
      }
      if (this.msgT > 0) Art.text(ctx, this.msg, 360, 612, 21, { align: "center", color: "#7a1f16", alpha: Math.min(1, this.msgT) });
      Art.text(ctx, "Ink left: " + Math.floor(S.ink) + " / " + D.ink.max, 360, 640, 20, { align: "center", color: "#3a2a1e" });
      ctx.restore();
    }

    drawStrokes(ctx, t) {
      const mat = this.mode === "materialize";
      if (mat && this.mt > 1.45) return; // the lifted drawing is rendered by drawMaterialize
      for (let si = 0; si < this.strokes.length; si++) {
        const s = this.strokes[si];
        if (s.length < 2) continue;
        const pts = [];
        for (const p of s) pts.push(p.x, p.y);
        const fill = mat ? U.clamp((this.mt - 0.6) / 0.8, 0, 1) : 0;
        ctx.fillStyle = mat ? "rgba(21,16,13,1)" : "#1d1712";
        Art.brush(ctx, pts, 4 + fill * 4, { seed: si * 7 + (mat ? Art.boil : 0), taperStart: 0.05, taperEnd: 0.12, jitter: 0.2 });
      }
    }

    drawMeasure(ctx, an, a) {
      // red-pencil annotations: principal axis, length, head breadth
      ctx.save();
      ctx.globalAlpha *= 0.8 * a;
      ctx.strokeStyle = "#b0392c"; ctx.lineWidth = 1.5; ctx.setLineDash([7, 5]);
      const e = 20;
      const p0 = { x: an.mx + an.ax * (an.uMin - e), y: an.my + an.ay * (an.uMin - e) };
      const p1 = { x: an.mx + an.ax * (an.uMax + e), y: an.my + an.ay * (an.uMax + e) };
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      ctx.setLineDash([]);
      // head bracket
      const hu = an.headAtMax ? an.uMax - an.L * 0.08 : an.uMin + an.L * 0.08;
      const hb = an.headAtMax ? an.w[11] || an.w[10] : an.w[0] || an.w[1];
      const hc = { x: an.mx + an.ax * hu, y: an.my + an.ay * hu };
      const half = Math.max(8, hb / 2 + 6);
      ctx.beginPath(); ctx.moveTo(hc.x - an.nx * half, hc.y - an.ny * half); ctx.lineTo(hc.x + an.nx * half, hc.y + an.ny * half); ctx.stroke();
      Art.text(ctx, "length " + Math.round(an.L), p1.x + 6, p1.y, 17, { color: "#b0392c" });
      Art.text(ctx, an.cls === "blade" ? "narrow" : "head", hc.x + an.nx * (half + 6), hc.y + an.ny * (half + 6), 17, { color: "#b0392c" });
      ctx.restore();
    }

    drawMaterialize(ctx, G) {
      const t = this.mt, b = this.bounds();
      // 1. analysis marks linger
      if (t < 0.9) this.drawMeasure(ctx, this.an, 1 - t / 0.9);
      // 2. ink streams in from the reservoir (top-left of the HUD)
      if (t < 1.5 && this.motes) {
        for (const m of this.motes) {
          const k = U.clamp((t - m.d * 0.6) / 0.7, 0, 1);
          if (k <= 0 || k >= 1) continue;
          const s = this.strokes[m.si] || this.strokes[0];
          const q = s[Math.floor(m.tx * (s.length - 1))];
          const sx = 58, sy = 62;
          const x = U.lerp(sx, q.x, U.easeInOut(k)) + Math.sin(k * 9 + m.tx * 20) * 30 * (1 - k);
          const y = U.lerp(sy, q.y, U.easeInOut(k)) - Math.sin(k * Math.PI) * 120;
          ctx.fillStyle = "#15100d"; ctx.beginPath(); ctx.arc(x, y, 3 * m.s, 0, 7); ctx.fill();
        }
      }
      // 3. the drawing lifts off the page and turns into an object
      if (t > 1.45) {
        const k = U.easeOut((t - 1.45) / 1.0);
        const cls = G.S.weapon.cls, len = 240;
        ctx.save();
        // the pale ghost of the line left behind where the drawing peeled off the page
        ctx.fillStyle = "rgba(90,60,35,0.28)";
        this.strokes.forEach((s, si) => {
          if (s.length < 2) return;
          const pts = [];
          for (const p of s) pts.push(p.x, p.y);
          Art.brush(ctx, pts, 12, { seed: si * 3, taperStart: 0.05, taperEnd: 0.05, jitter: 0.3 });
        });
        const cx = U.lerp(b.cx, 360, k), cy = U.lerp(b.cy, 360, k) - k * 30;
        ctx.translate(cx + 14 * k, cy + 24 * k);
        ctx.rotate(-0.35 * k);
        ctx.globalAlpha *= 0.35 * k;
        ctx.translate(-len / 2, 0);
        ctx.fillStyle = "#000";
        LD.drawWeaponStrokes(ctx, G.S.weapon.strokes, len, "none", Art.boil);
        ctx.restore();
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.35 * k);
        ctx.scale(1 + k * 0.15, 1 + k * 0.15);
        ctx.translate(-len / 2, 0);
        LD.drawWeaponStrokes(ctx, G.S.weapon.strokes, len, G.S.weapon.element, Art.boil);
        ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        Art.glow(ctx, cx, cy, 140 * k, "rgba(255,220,160,0.35)");
        ctx.restore();
        Art.text(ctx, D.weapons[cls].name.toUpperCase(), 360, 560, 44, { align: "center", font: "title", color: "#4a2418", alpha: U.clamp((t - 1.8) * 3, 0, 1) });
        Art.text(ctx, "−" + D.weapons[cls].cost + " ink", 360, 598, 24, { align: "center", color: "#7a1f16", alpha: U.clamp((t - 1.9) * 3, 0, 1) });
      }
    }
  }

  // mini archetype sketches (weapon space)
  const MINI = {
    blade: [[0, 0, 0.2, 0, 1, 0], [0.2, -0.16, 0.2, 0.16]],
    polearm: [[0, 0, 0.8, 0], [0.78, -0.08, 1, 0, 0.78, 0.08, 0.78, -0.08]],
    heavy: [[0, 0, 0.62, 0], [0.62, -0.3, 1, -0.3, 1, 0.3, 0.62, 0.3, 0.62, -0.3]],
  };

  LD.DrawDesk = DrawDesk;
})();
