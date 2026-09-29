// UI ornament kit: the decorative pieces shared by the HUD and every menu — engraved rules,
// corner flourishes, a leather-bound book spread, a quill-nib selector, wax seals, pins,
// ribbon banners and small stat icons. Static pieces are painted once into cached canvases.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art;
  const K = (LD.UIKit = {});
  const BROWN = "rgba(74,36,24,0.8)";

  const cache = new Map();
  function cached(key, w, h, paint) {
    let c = cache.get(key);
    if (!c) { c = Art.canvas(w, h); paint(c.getContext("2d"), w, h); cache.set(key, c); }
    return c;
  }
  K.cached = cached;

  // ---------------------------------------------------------------- flourishes
  // Corner ornament at the origin, growing into +x/+y (flip with sx/sy).
  function corner(x, px, py, sx, sy, color, size = 1) {
    x.save();
    x.translate(px, py); x.scale(sx * size, sy * size);
    x.strokeStyle = color; x.fillStyle = color; x.lineCap = "round"; x.lineJoin = "round";
    // double bracket
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, 46); x.lineTo(0, 8); x.quadraticCurveTo(0, 0, 8, 0); x.lineTo(46, 0); x.stroke();
    x.lineWidth = 0.9;
    x.beginPath(); x.moveTo(5, 34); x.lineTo(5, 10); x.quadraticCurveTo(5, 5, 10, 5); x.lineTo(34, 5); x.stroke();
    // spiral
    x.lineWidth = 1.3;
    x.beginPath();
    for (let i = 0; i <= 26; i++) {
      const a = i * 0.36 + 3.6, r = 1 + i * 0.3;
      const X = 17 + Math.cos(a) * r, Y = 17 + Math.sin(a) * r;
      if (i === 0) x.moveTo(X, Y); else x.lineTo(X, Y);
    }
    x.stroke();
    // tendrils along both edges, with leaves
    x.beginPath(); x.moveTo(22, 12); x.quadraticCurveTo(38, 6, 60, 10); x.stroke();
    x.beginPath(); x.moveTo(12, 22); x.quadraticCurveTo(6, 38, 10, 60); x.stroke();
    for (const [lx, ly, a] of [[40, 8, -0.4], [8, 40, 2.0], [54, 10, 0.3], [10, 54, 1.3]]) {
      x.save(); x.translate(lx, ly); x.rotate(a);
      x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(4, -4, 8, 0); x.quadraticCurveTo(4, 4, 0, 0); x.fill();
      x.restore();
    }
    x.beginPath(); x.arc(62, 10.5, 1.6, 0, 7); x.fill();
    x.beginPath(); x.arc(10.5, 62, 1.6, 0, 7); x.fill();
    x.beginPath(); x.arc(3, 3, 2.4, 0, 7); x.fill();
    x.restore();
  }
  K.corner = corner;

  // Small fleuron: diamond with two curling tails (centred at origin, horizontal).
  function fleuron(x, cx, cy, s, color) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    x.fillStyle = color; x.strokeStyle = color; x.lineCap = "round"; x.lineWidth = 1.3 / s;
    x.beginPath(); x.moveTo(0, -6); x.lineTo(5, 0); x.lineTo(0, 6); x.lineTo(-5, 0); x.closePath(); x.fill();
    for (const d of [-1, 1]) {
      x.beginPath(); x.moveTo(d * 6, 0); x.bezierCurveTo(d * 14, -7, d * 22, 2, d * 16, 5); x.bezierCurveTo(d * 12, 7, d * 11, 2, d * 14, 1); x.stroke();
      x.beginPath(); x.arc(d * 26, 0, 1.6, 0, 7); x.fill();
    }
    x.restore();
  }
  K.fleuron = fleuron;

  // Engraved rule with a fleuron at the centre and fading tapered arms.
  K.divider = (ctx, cx, y, w, color = BROWN, seed = 1) => {
    ctx.save();
    ctx.fillStyle = color;
    Art.brush(ctx, [cx - w / 2, y, cx - w / 4, y - 0.6, cx - 30, y], 2.4, { seed, taperStart: 0.9, taperEnd: 0.05, jitter: 0 });
    Art.brush(ctx, [cx + 30, y, cx + w / 4, y - 0.6, cx + w / 2, y], 2.4, { seed: seed + 1, taperStart: 0.05, taperEnd: 0.9, jitter: 0 });
    ctx.globalAlpha *= 0.6;
    Art.brush(ctx, [cx - w * 0.36, y + 4, cx - 34, y + 4], 1, { seed, taperStart: 0.8, taperEnd: 0.1, jitter: 0 });
    Art.brush(ctx, [cx + 34, y + 4, cx + w * 0.36, y + 4], 1, { seed, taperStart: 0.1, taperEnd: 0.8, jitter: 0 });
    ctx.globalAlpha /= 0.6;
    fleuron(ctx, cx, y, 0.9, color);
    ctx.restore();
  };

  // Title-font heading with a divider under it.
  K.heading = (ctx, text, cx, y, size, color = "#4a2418") => {
    ctx.save(); ctx.font = size + "px " + Art.TITLE;
    const w = ctx.measureText(text).width;
    ctx.restore();
    Art.text(ctx, text, cx, y, size, { align: "center", font: "title", color });
    K.divider(ctx, cx, y + size * 0.42, Math.max(160, w + 90), "rgba(74,36,24,0.7)", size);
  };

  // Ornamental frame over a panel: double inked rule, corner flourishes, edge fleurons.
  K.frame = (w, h, o = {}) => {
    const ins = o.inset == null ? 26 : o.inset, color = o.color || "rgba(74,36,24,0.72)";
    return cached("frame:" + w + "x" + h + ":" + ins + color, w, h, (x) => {
      const r = U.rng(w * 7 + h);
      x.strokeStyle = color; x.lineCap = "round";
      const rule = (d, lw) => {
        x.lineWidth = lw;
        x.beginPath();
        const pts = [[ins + d + 40, ins + d], [w - ins - d - 40, ins + d], null, [w - ins - d, ins + d + 40], [w - ins - d, h - ins - d - 40], null,
          [w - ins - d - 40, h - ins - d], [ins + d + 40, h - ins - d], null, [ins + d, h - ins - d - 40], [ins + d, ins + d + 40]];
        let start = true;
        for (const p of pts) {
          if (!p) { start = true; continue; }
          const jx = (r() - 0.5) * 1.2, jy = (r() - 0.5) * 1.2;
          if (start) { x.moveTo(p[0] + jx, p[1] + jy); start = false; } else x.lineTo(p[0] + jx, p[1] + jy);
        }
        x.stroke();
      };
      rule(0, 2); rule(6, 0.8);
      corner(x, ins, ins, 1, 1, color);
      corner(x, w - ins, ins, -1, 1, color);
      corner(x, ins, h - ins, 1, -1, color);
      corner(x, w - ins, h - ins, -1, -1, color);
      if (o.fleurons !== false) { fleuron(x, w / 2, ins + 3, 1, color); fleuron(x, w / 2, h - ins - 3, 1, color); }
    });
  };
  K.drawFrame = (ctx, x, y, w, h, o) => ctx.drawImage(K.frame(w, h, o), x, y);

  // ---------------------------------------------------------------- the book
  // Leather cover with tooled border, brass corners and a page stack; pages drawn on top.
  K.cover = () => cached("cover", U.VIEW_W, U.VIEW_H, (x) => {
    const X0 = 52, Y0 = 34, X1 = 1228, Y1 = 690;
    x.save();
    x.shadowColor = "rgba(0,0,0,0.6)"; x.shadowBlur = 30; x.shadowOffsetY = 10;
    x.fillStyle = "#3a2216";
    x.beginPath(); x.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 18); x.fill();
    x.restore();
    const cl = new Path2D(); cl.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 18);
    x.save(); x.clip(cl);
    const g = x.createLinearGradient(0, Y0, 0, Y1);
    g.addColorStop(0, "#5a3522"); g.addColorStop(0.5, "#442818"); g.addColorStop(1, "#2c1a10");
    x.fillStyle = g; x.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    // leather grain
    const r = U.rng(4242);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.18)" : "rgba(255,210,160,0.05)";
      x.fillRect(X0 + r() * (X1 - X0), Y0 + r() * (Y1 - Y0), 1 + r() * 3, 1 + r() * 2);
    }
    Art.hatch(x, X0, Y0, X1 - X0, Y1 - Y0, 7, 0.6, "#000", 0.12, 1, 11);
    // spine
    const sg = x.createLinearGradient(610, 0, 670, 0);
    sg.addColorStop(0, "rgba(0,0,0,0)"); sg.addColorStop(0.5, "rgba(0,0,0,0.45)"); sg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = sg; x.fillRect(600, Y0, 80, Y1 - Y0);
    x.restore();
    // tooled gold border + stitching
    x.strokeStyle = "rgba(201,161,74,0.55)"; x.lineWidth = 1.5;
    x.beginPath(); x.roundRect(X0 + 9, Y0 + 9, X1 - X0 - 18, Y1 - Y0 - 18, 12); x.stroke();
    x.setLineDash([6, 5]); x.strokeStyle = "rgba(230,200,150,0.35)"; x.lineWidth = 1.2;
    x.beginPath(); x.roundRect(X0 + 15, Y0 + 15, X1 - X0 - 30, Y1 - Y0 - 30, 9); x.stroke();
    x.setLineDash([]);
    // brass corner caps with rivets
    for (const [cx, cy, sx, sy] of [[X0, Y0, 1, 1], [X1, Y0, -1, 1], [X0, Y1, 1, -1], [X1, Y1, -1, -1]]) {
      x.save(); x.translate(cx, cy); x.scale(sx, sy);
      const bg = x.createLinearGradient(0, 0, 50, 50);
      bg.addColorStop(0, "#e2c27a"); bg.addColorStop(0.5, "#a9812f"); bg.addColorStop(1, "#6d4f1a");
      x.fillStyle = bg; x.strokeStyle = "#2a1a0c"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, 18); x.quadraticCurveTo(0, 0, 18, 0); x.lineTo(56, 0); x.quadraticCurveTo(40, 10, 30, 14); x.quadraticCurveTo(14, 20, 12, 30); x.quadraticCurveTo(10, 42, 0, 56); x.closePath();
      x.fill(); x.stroke();
      x.strokeStyle = "rgba(60,40,10,0.7)"; x.lineWidth = 1;
      x.beginPath(); x.moveTo(8, 34); x.quadraticCurveTo(10, 12, 34, 8); x.stroke();
      for (const [rx, ry] of [[12, 12], [34, 5], [5, 34]]) {
        x.fillStyle = "#3a2710"; x.beginPath(); x.arc(rx, ry, 2.6, 0, 7); x.fill();
        x.fillStyle = "rgba(255,240,200,0.8)"; x.beginPath(); x.arc(rx - 0.8, ry - 0.8, 1, 0, 7); x.fill();
      }
      x.restore();
    }
    // page stack under both leaves
    for (let i = 5; i >= 1; i--) {
      x.fillStyle = i % 2 ? "#cdbb95" : "#ddcca8";
      x.strokeStyle = "rgba(80,60,40,0.45)"; x.lineWidth = 0.8;
      x.beginPath(); x.rect(80 - i * 2.2, 60 + i * 1.2, 560, 600); x.fill(); x.stroke();
      x.beginPath(); x.rect(640 + i * 2.2, 60 + i * 1.2, 560, 600); x.fill(); x.stroke();
    }
  });

  // Gutter shade, page borders, ribbon marker — drawn over the two parchment leaves.
  K.pageDeco = () => cached("pagedeco", U.VIEW_W, U.VIEW_H, (x) => {
    const g = x.createLinearGradient(596, 0, 684, 0);
    g.addColorStop(0, "rgba(60,40,20,0)"); g.addColorStop(0.42, "rgba(60,40,20,0.5)"); g.addColorStop(0.5, "rgba(40,25,12,0.7)");
    g.addColorStop(0.58, "rgba(60,40,20,0.5)"); g.addColorStop(1, "rgba(60,40,20,0)");
    x.fillStyle = g; x.fillRect(596, 60, 88, 600);
    // page curl highlights at the outer edges
    for (const [x0, d] of [[80, 1], [1200, -1]]) {
      const hg = x.createLinearGradient(x0, 0, x0 + d * 26, 0);
      hg.addColorStop(0, "rgba(40,25,10,0.28)"); hg.addColorStop(1, "rgba(40,25,10,0)");
      x.fillStyle = hg; x.fillRect(Math.min(x0, x0 + d * 26), 60, 26, 600);
    }
    x.drawImage(K.frame(540, 580, { inset: 14 }), 90, 70);
    x.drawImage(K.frame(540, 580, { inset: 14 }), 650, 70);
    // ribbon marker
    x.save();
    x.shadowColor = "rgba(0,0,0,0.35)"; x.shadowBlur = 4; x.shadowOffsetX = 2;
    const rg = x.createLinearGradient(652, 0, 672, 0);
    rg.addColorStop(0, "#6e1812"); rg.addColorStop(0.5, "#a3291e"); rg.addColorStop(1, "#6e1812");
    x.fillStyle = rg;
    x.beginPath(); x.moveTo(652, 50); x.lineTo(672, 50); x.quadraticCurveTo(676, 400, 670, 700); x.lineTo(661, 690); x.lineTo(652, 702); x.quadraticCurveTo(656, 400, 652, 50); x.fill();
    x.restore();
    x.strokeStyle = "rgba(255,200,170,0.25)"; x.lineWidth = 1;
    x.beginPath(); x.moveTo(656, 52); x.quadraticCurveTo(660, 400, 656, 694); x.stroke();
  });

  // Full spread: dimmer, cover, both leaves, decorations, folio numbers.
  K.book = (ctx, k, seedA = 401, seedB = 402) => {
    ctx.fillStyle = "rgba(8,5,4," + 0.72 * k + ")"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
    ctx.globalAlpha = k;
    const lift = (1 - k) * 24;
    ctx.save(); ctx.translate(0, lift);
    ctx.drawImage(K.cover(), 0, 0);
    ctx.drawImage(Art.parchment(560, 600, seedA), 80, 60);
    ctx.drawImage(Art.parchment(560, 600, seedB), 640, 60);
    ctx.drawImage(K.pageDeco(), 0, 0);
    const folio = 10 + (seedA % 90);
    Art.text(ctx, "— " + folio + " —", 360, 646, 16, { align: "center", font: "serif", color: "rgba(74,36,24,0.6)" });
    Art.text(ctx, "— " + (folio + 1) + " —", 920, 646, 16, { align: "center", font: "serif", color: "rgba(74,36,24,0.6)" });
    ctx.restore();
    ctx.translate(0, lift);
  };

  // ---------------------------------------------------------------- small pieces
  // Brass pen nib pointing right, tip at (x, y).
  K.nib = (ctx, x, y, s = 1, ink = true) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#2a1a10";
    ctx.beginPath(); ctx.roundRect(-46, -4.5, 22, 9, 3); ctx.fill();
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, "#f0d58e"); g.addColorStop(0.5, "#b8903f"); g.addColorStop(1, "#6d4f1a");
    ctx.fillStyle = g; ctx.strokeStyle = "#1a100a"; ctx.lineWidth = 1.4 / s; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-9, -7, -20, -7.5); ctx.lineTo(-26, -5.5); ctx.lineTo(-26, 5.5); ctx.lineTo(-20, 7.5); ctx.quadraticCurveTo(-9, 7, 0, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, 0); ctx.stroke();
    ctx.fillStyle = "#1a100a"; ctx.beginPath(); ctx.arc(-13.5, 0, 1.8, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(255,245,210,0.7)"; ctx.lineWidth = 1 / s;
    ctx.beginPath(); ctx.moveTo(-22, -4); ctx.quadraticCurveTo(-12, -4.5, -5, -2); ctx.stroke();
    if (ink) { ctx.fillStyle = Art.INK; ctx.beginPath(); ctx.arc(2, 1.5, 1.6, 0, 7); ctx.fill(); }
    ctx.restore();
  };

  // Selection mark for list menus: bobbing nib + a translucent ink swash under the label.
  K.selector = (ctx, x0, y, textW, size, color, t, seed, align) => {
    const tx = align === "center" ? x0 - textW / 2 : x0;
    ctx.save();
    ctx.fillStyle = color; ctx.globalAlpha *= 0.22;
    Art.brush(ctx, [tx - 8, y + 5, tx + textW * 0.5, y + 2, tx + textW + 10, y + 6], size * 0.36, { seed, taperStart: 0.15, taperEnd: 0.35 });
    ctx.globalAlpha /= 0.22;
    ctx.globalAlpha *= 0.85;
    Art.brush(ctx, [tx - 2, y + 7, tx + textW * 0.5, y + 5, tx + textW + 4, y + 8], 2.2, { seed: seed + 3, taperStart: 0.1, taperEnd: 0.6 });
    ctx.restore();
    const bob = Math.sin(t * 4) * 3;
    K.nib(ctx, tx - 14 + bob, y - size * 0.3, Math.max(0.7, size / 34));
    Art.splat(ctx, tx + textW + 18, y - size * 0.25, 2.6, color, seed * 7, 3);
  };

  // Wax seal with lumpy rim; `inner` draws the impressed glyph at the origin.
  K.seal = (ctx, x, y, r, wax, inner, seed = 3) => {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    Art.blobPath(ctx, 1.5, 2.5, r * 1.1, r * 1.05, seed, 16, 0.14); ctx.fill();
    ctx.fillStyle = wax;
    Art.blobPath(ctx, 0, 0, r * 1.1, r * 1.05, seed, 16, 0.14); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, 7); ctx.fill();
    ctx.fillStyle = wax;
    ctx.beginPath(); ctx.arc(-r * 0.05, -r * 0.06, r * 0.72, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 7); ctx.stroke();
    ctx.strokeStyle = "rgba(255,230,210,0.45)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 3.5, 4.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 3.7, 4.3); ctx.stroke();
    if (inner) inner(ctx);
    ctx.restore();
  };

  // Thumbtack with shadow.
  K.pin = (ctx, x, y, color = "#8e2a22") => {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, 6, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = color; ctx.strokeStyle = "rgba(20,10,5,0.8)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,230,210,0.7)"; ctx.beginPath(); ctx.arc(x - 1.8, y - 1.8, 1.8, 0, 7); ctx.fill();
    ctx.restore();
  };

  // Ribbon banner centred at (cx, cy) with folded, notched tails.
  K.ribbon = (ctx, cx, cy, w, h, fill = "#6e1812", shade = "#3e0c08") => {
    ctx.save();
    ctx.strokeStyle = "rgba(15,8,5,0.85)"; ctx.lineWidth = 1.6; ctx.lineJoin = "round";
    for (const d of [-1, 1]) {
      const ex = cx + d * (w / 2 + 26), ix = cx + d * (w / 2 - 6);
      ctx.fillStyle = shade;
      ctx.beginPath(); ctx.moveTo(ix, cy - h / 2 + 8); ctx.lineTo(ex, cy - h / 2 + 8); ctx.lineTo(ex - d * 12, cy + 4 + 4); ctx.lineTo(ex, cy + h / 2 + 8); ctx.lineTo(ix, cy + h / 2 + 8); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath(); ctx.moveTo(cx + d * w / 2, cy + h / 2); ctx.lineTo(ix, cy + h / 2 + 8); ctx.lineTo(cx + d * w / 2, cy + h / 2 + 8); ctx.closePath(); ctx.fill();
    }
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    g.addColorStop(0, fill); g.addColorStop(1, shade);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, cy - h / 2); ctx.quadraticCurveTo(cx, cy - h / 2 - 5, cx + w / 2, cy - h / 2); ctx.lineTo(cx + w / 2, cy + h / 2); ctx.quadraticCurveTo(cx, cy + h / 2 - 5, cx - w / 2, cy + h / 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,220,180,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cx - w / 2 + 6, cy - h / 2 + 4); ctx.quadraticCurveTo(cx, cy - h / 2 - 1, cx + w / 2 - 6, cy - h / 2 + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w / 2 + 6, cy + h / 2 - 4); ctx.quadraticCurveTo(cx, cy + h / 2 - 9, cx + w / 2 - 6, cy + h / 2 - 4); ctx.stroke();
    ctx.restore();
  };

  // Tiny hand-drawn stat icons (clock, drop, bottle, page, broken line, quill, skull-less "quiet" mark).
  K.icon = (ctx, kind, x, y, color = "#4a2418") => {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.lineJoin = "round";
    switch (kind) {
      case "clock":
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -5); ctx.moveTo(0, 0); ctx.lineTo(4, 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -10, 1.6, 0, 7); ctx.fill();
        break;
      case "drop":
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.bezierCurveTo(4, -4, 7, 0, 7, 3); ctx.arc(0, 3, 7, 0, Math.PI); ctx.bezierCurveTo(-7, 0, -4, -4, 0, -9); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(-2.5, 2, 1.6, 0, 7); ctx.fill();
        break;
      case "bottle":
        ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(3, -9); ctx.lineTo(3, -4); ctx.quadraticCurveTo(7, -2, 7, 3); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.lineTo(-7, 3); ctx.quadraticCurveTo(-7, -2, -3, -4); ctx.closePath(); ctx.stroke();
        ctx.fillRect(-7, 2, 14, 6);
        break;
      case "page":
        ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(3, -9); ctx.lineTo(7, -5); ctx.lineTo(7, 9); ctx.lineTo(-6, 9); ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(-3, -3 + i * 4); ctx.lineTo(4, -3 + i * 4); } ctx.stroke();
        break;
      case "broken":
        ctx.beginPath(); ctx.moveTo(-10, 3); ctx.quadraticCurveTo(-5, -4, -1, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, -2); ctx.quadraticCurveTo(6, 3, 10, -3); ctx.stroke();
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(1, -3); ctx.moveTo(3, 3); ctx.lineTo(1, 6); ctx.stroke();
        break;
      case "quill":
        ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(8, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -8); ctx.quadraticCurveTo(-2, -6, -3, 3); ctx.quadraticCurveTo(4, 2, 8, -8); ctx.fill();
        break;
      case "quiet":
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(5, -5); ctx.stroke();
        break;
    }
    ctx.restore();
  };

  // Keycap with a raised face and a darker base lip, used by prompts and the controls page.
  K.keycap = (ctx, label, x, y, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = "20px " + Art.HAND;
    const w = Math.max(28, ctx.measureText(label).width + 16);
    ctx.strokeStyle = Art.INK; ctx.lineWidth = 2; ctx.lineJoin = "round";
    ctx.fillStyle = "#a8957a";
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - 12); ctx.lineTo(x + w / 2 + 1, y - 13); ctx.lineTo(x + w / 2 + 2, y + 16); ctx.lineTo(x - w / 2 - 1, y + 17); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const g = ctx.createLinearGradient(0, y - 16, 0, y + 11);
    g.addColorStop(0, "#f5ecd6"); g.addColorStop(1, "#dccdae");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, y - 16); ctx.lineTo(x + w / 2 - 1, y - 17); ctx.lineTo(x + w / 2 - 1, y + 10); ctx.lineTo(x - w / 2 + 2, y + 11); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = Art.INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x, y - 2);
    ctx.restore();
    return w;
  };
  Art.keycap = K.keycap;

  // Compass rose for the map.
  K.compass = (ctx, x, y, r, color = "#4a2418") => {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, 7); ctx.stroke();
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2, l = i % 4 ? 3 : 6;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * (r - l), Math.sin(a) * (r - l)); ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2, L = i % 2 ? r * 0.5 : r * 0.92, wv = i % 2 ? 4 : 7;
      for (const side of [-1, 1]) {
        ctx.fillStyle = side < 0 ? color : "rgba(236,225,201,0.9)";
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
        ctx.lineTo(Math.cos(a + side * Math.PI / 2) * wv, Math.sin(a + side * Math.PI / 2) * wv);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill();
    ctx.restore();
    Art.text(ctx, "N", x, y - r - 6, 18, { align: "center", font: "title", color });
  };
})();
