// Particles: ink droplets, paper scraps, embers, ash, water, sparkles. Kept deliberately
// sparse so effects never obscure combat.
(function () {
  const LD = window.LD;
  const U = LD.U;
  const Art = LD.Art;

  const P = (LD.Particles = { list: [], max: 340 });

  P.clear = () => { P.list.length = 0; };

  P.add = (o) => {
    if (P.list.length >= P.max) P.list.shift();
    const p = Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, g: 900, drag: 0.5, life: 1, t: 0, size: 4, kind: "ink",
      color: Art.INK, rot: Math.random() * 6.28, vr: U.rand(-6, 6), front: false,
    }, o);
    p.max = p.life;
    P.list.push(p);
    return p;
  };

  P.burst = (x, y, n, kind, o = {}) => {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + U.rand(-(o.spread || 0.8), o.spread || 0.8) : Math.random() * Math.PI * 2;
      const sp = U.rand(o.min || 80, o.max || 320);
      P.add(Object.assign({
        x: x + U.rand(-4, 4), y: y + U.rand(-4, 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift || 0),
        kind, life: U.rand(o.lifeMin || 0.35, o.lifeMax || 0.8), size: U.rand(o.sMin || 2, o.sMax || 5),
      }, o.p || {}));
    }
  };

  P.inkHit = (x, y, dir, color = Art.INK, strong) => {
    P.burst(x, y, strong ? 14 : 8, "ink", { angle: dir > 0 ? 0 : Math.PI, spread: 1.1, min: 120, max: strong ? 520 : 380, lift: 120, p: { color } });
    P.burst(x, y, 3, "scrap", { min: 60, max: 220, lift: 160, p: { color: "#e6d8bb", g: 500, life: 0.9, size: 6 } });
  };

  P.update = (dt) => {
    const L = P.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt;
      if (p.t >= p.life) { L.splice(i, 1); continue; }
      if (p.kind === "ash" || p.kind === "ember" || p.kind === "dust" || p.kind === "mote") {
        p.vx += Math.sin((p.t + p.x * 0.01) * 2) * 30 * dt;
      }
      p.vy += p.g * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy *= -0.2; p.vx *= 0.5; }
    }
  };

  P.draw = (ctx, front) => {
    for (const p of P.list) {
      if (!!p.front !== front) continue;
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = Math.min(1, k * 1.6) * (p.alpha || 1);
      switch (p.kind) {
        case "ink":
        case "water": {
          ctx.fillStyle = p.color;
          const s = p.size * (0.5 + k * 0.5);
          const sp = Math.min(3, Math.hypot(p.vx, p.vy) / 180);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
          ctx.beginPath(); ctx.ellipse(0, 0, s * (1 + sp * 0.6), s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case "scrap":
        case "page": {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color; ctx.strokeStyle = "rgba(20,14,10,0.7)"; ctx.lineWidth = 1;
          const s = p.size;
          ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s, -s * 0.8); ctx.lineTo(s * 0.8, s * 0.7); ctx.lineTo(-s * 0.9, s * 0.5); ctx.closePath();
          ctx.fill(); ctx.stroke();
          if (p.burning) { ctx.fillStyle = Art.EMBER; ctx.globalAlpha *= 0.8; ctx.fillRect(-s, s * 0.3, s * 2, s * 0.3); }
          ctx.restore();
          break;
        }
        case "ember": {
          ctx.globalCompositeOperation = "lighter";
          Art.glow(ctx, p.x, p.y, p.size * 3, "rgba(255,150,60,0.8)", k);
          ctx.fillStyle = "#ffd28a"; ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
          ctx.globalCompositeOperation = "source-over";
          break;
        }
        case "ash":
        case "dust": {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
          break;
        }
        case "mote":
        case "spark": {
          ctx.globalCompositeOperation = "lighter";
          Art.glow(ctx, p.x, p.y, p.size * 2.5, p.color, k);
          ctx.globalCompositeOperation = "source-over";
          break;
        }
        case "ring": {
          ctx.strokeStyle = p.color; ctx.lineWidth = 3 * k;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (1 - k) * p.grow, 0, Math.PI * 2); ctx.stroke();
          break;
        }
        case "text": {
          Art.text(ctx, p.text, p.x, p.y, p.size, { align: "center", color: p.color, outline: 4, outlineColor: "rgba(236,225,201,0.85)" });
          break;
        }
        case "crease": {
          // Foldstep afterimage: a folded-paper silhouette
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.sx || 1, 1);
          ctx.fillStyle = "rgba(236,225,201,0.55)"; ctx.strokeStyle = "rgba(21,16,13,0.6)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-10, -54); ctx.lineTo(8, -50); ctx.lineTo(12, -4); ctx.lineTo(-12, 0); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-1, -52); ctx.lineTo(0, -2); ctx.stroke();
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  };
})();
