// InteractionSystem: stations, NPCs, ink wells & caches, lore, doors, latches,
// the Water Pigment altar, cutscene triggers and diegetic tutorial hints.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, P = LD.Particles, W = LD.World, I = LD.Input;
  const T = U.TILE;

  const fillKeys = (s) => s.replace(/\{(\w+)\}/g, (m, a) => "[" + I.label(a) + "]");

  class Obj {
    constructor(d) { this.d = d; this.x = d.x * T; this.y = d.y * T; this.t = Math.random() * 5; this.range = 46; }
    update(dt) { this.t += dt; return !this.dead; }
    draw() {}
    prompt() { return this.label || "Interact"; }
  }

  // ---------------------------------------------------------------- hint
  class Hint extends Obj {
    constructor(d) { super(d); this.alpha = 0; this.text = d.text; }
    update(dt, G) {
      this.t += dt;
      if (!this.text) return true;
      const near = Math.abs(G.player.cx() - this.x) < (this.d.w || 4) * T * 0.5 + 30 && Math.abs(G.player.feet() - (this.d.y || G.player.feet() / T) * T) < 400;
      this.alpha = U.approach(this.alpha, near ? 1 : 0, dt * 2.5);
      return true;
    }
    draw(ctx, G) {
      if (this.alpha <= 0.01 || !this.text) return;
      const txt = fillKeys(this.text);
      const y = G.player.feet() - 120;
      ctx.save(); ctx.globalAlpha = this.alpha * 0.95;
      ctx.font = "24px " + Art.HAND;
      const w = ctx.measureText(txt).width + 30;
      const cx = U.clamp(this.x, LD.Camera.x + w / 2 + 10, LD.Camera.x + LD.Camera.viewW() - w / 2 - 10);
      ctx.fillStyle = "rgba(236,225,201,0.82)";
      Art.blobPath(ctx, cx, y - 8, w / 2, 20, 3, 18, 0.08); ctx.fill();
      Art.text(ctx, txt, cx, y, 24, { align: "center", color: "#2a1d16" });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- door
  class Door extends Obj {
    constructor(d) { super(d); this.label = d.label; this.promptY = d.inner ? 130 : 102; }
    interact(G) { G.goDoor(this.d.to, this.d.sx, this.d.sy); }
    draw(ctx) {
      if (!this.d.inner) return;
      const x = this.x, y = this.y;
      ctx.fillStyle = "#24170f"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x - 28, y - 86); ctx.quadraticCurveTo(x, y - 116, x + 28, y - 86); ctx.lineTo(x + 28, y); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,200,140,0.18)"; ctx.fillRect(x - 22, y - 80, 44, 80);
      ctx.fillStyle = "#c9a14a"; ctx.beginPath(); ctx.arc(x + 16, y - 44, 3, 0, 7); ctx.fill();
    }
  }

  // ---------------------------------------------------------------- station
  class Station extends Obj {
    constructor(d) { super(d); this.label = d.desk ? "Sit at the drawing desk" : "Rest at the bookmark"; this.range = 56; }
    interact(G) { G.openStation(this); }
    draw(ctx, G) {
      const x = this.x, y = this.y, t = this.t;
      if (this.d.desk) {
        // the weapon-drawing desk
        ctx.fillStyle = "#3e2a1c"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - 70, y - 50); ctx.lineTo(x + 70, y - 58); ctx.lineTo(x + 74, y - 44); ctx.lineTo(x - 72, y - 38); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (const lx of [-60, 60]) { ctx.fillRect(x + lx - 4, y - 42, 8, 42); ctx.strokeRect(x + lx - 4, y - 42, 8, 42); }
        ctx.save(); ctx.translate(x - 10, y - 56); ctx.rotate(-0.06);
        ctx.fillStyle = "#efe4cb"; ctx.fillRect(-36, -4, 70, 12);
        ctx.strokeStyle = "rgba(21,16,13,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(-36, -4, 70, 12);
        if (G.S.weapon.strokes) { ctx.save(); ctx.translate(-26, 2); ctx.scale(1, 0.25); LD.drawWeaponStrokes(ctx, G.S.weapon.strokes, 50, G.S.weapon.element, Art.boil); ctx.restore(); }
        ctx.restore();
        // ink bottle & quill
        ctx.fillStyle = "#15100d"; ctx.beginPath(); ctx.moveTo(x + 36, y - 56); ctx.lineTo(x + 34, y - 72); ctx.lineTo(x + 50, y - 72); ctx.lineTo(x + 48, y - 57); ctx.fill();
        ctx.fillStyle = "#e9dcc0"; Art.brush(ctx, [x + 42, y - 72, x + 52, y - 96, x + 62, y - 112], 5, { seed: 2 });
        ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, y - 60, 90 + Math.sin(t * 2) * 6, "rgba(255,190,110,0.25)"); ctx.restore();
      } else {
        // a giant bookmark standing in an open book on a lectern
        ctx.fillStyle = "#2b1d15"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 3;
        ctx.fillRect(x - 6, y - 56, 12, 56); ctx.strokeRect(x - 6, y - 56, 12, 56);
        ctx.fillStyle = "#e7dbc1";
        ctx.beginPath(); ctx.moveTo(x - 40, y - 56); ctx.quadraticCurveTo(x - 20, y - 66, x, y - 58); ctx.quadraticCurveTo(x + 20, y - 66, x + 40, y - 56); ctx.lineTo(x + 38, y - 50); ctx.lineTo(x - 38, y - 50); ctx.closePath(); ctx.fill(); ctx.stroke();
        const sway = Math.sin(t * 1.5) * 3;
        ctx.fillStyle = "#8e2a22";
        ctx.beginPath(); ctx.moveTo(x - 5, y - 60); ctx.lineTo(x - 7 + sway, y - 150); ctx.lineTo(x + 7 + sway, y - 150); ctx.lineTo(x + 5, y - 60); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#15100d"; ctx.beginPath(); ctx.moveTo(x - 7 + sway, y - 150); ctx.lineTo(x + sway, y - 140); ctx.lineTo(x + 7 + sway, y - 150); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, y - 90, 80, "rgba(255,200,120,0.2)"); ctx.restore();
      }
      if (G.S.station && G.S.station.id === this.d.id) Art.text(ctx, "✓ saved here", x, y + 22, 16, { align: "center", color: "rgba(236,225,201,0.6)" });
    }
  }

  // ---------------------------------------------------------------- NPCs
  class NPC extends Obj {
    constructor(d) { super(d); this.k = d.k; this.facing = -1; this.label = "Talk"; this.range = 64; }
    interact(G) { G.talk(this.k, this); }
    update(dt, G) {
      this.t += dt;
      const dx = G.player.cx() - this.x;
      if (Math.abs(dx) < 220) this.facing = Math.sign(dx) || this.facing;
      return true;
    }
    draw(ctx, G) {
      const x = this.x, y = this.y, f = this.facing, t = this.t, b = Art.boil;
      const br = Math.sin(t * 1.8) * 1.2;
      if (LD.Sprites.enabled(this.k)) {
        LD.Sprites.draw(ctx, this.k, "idle", { t }, x, y, f, { shadow: Art.highContrast ? "rgba(255,248,230,0.95)" : null });
        this.drawName(ctx, G);
        return;
      }
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      if (Art.highContrast) { ctx.shadowColor = "rgba(255,248,230,0.95)"; ctx.shadowBlur = 5; }
      if (this.k === "quillon") {
        // stooped old bookbinder, lower half fading into dotted lines (half-erased)
        ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.4;
        ctx.fillStyle = "#4e3b2c";
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-16, -44); ctx.quadraticCurveTo(-8, -70 + br, 10, -66 + br); ctx.lineTo(18, -40); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = "rgba(236,225,201,0.85)"; ctx.fillRect(-30, -24, 60, 30); ctx.restore();
        ctx.stroke();
        ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-17, -24); ctx.moveTo(20, 0); ctx.lineTo(19, -24); ctx.stroke(); ctx.setLineDash([]);
        // apron
        ctx.fillStyle = "#b8a684"; ctx.beginPath(); ctx.moveTo(-4, -60 + br); ctx.lineTo(12, -58 + br); ctx.lineTo(16, -26); ctx.lineTo(-2, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
        // head
        ctx.fillStyle = "#e3d2b6"; ctx.beginPath(); ctx.arc(14, -74 + br, 10, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f2ece0"; ctx.beginPath(); ctx.moveTo(8, -70 + br); ctx.quadraticCurveTo(16, -52 + br, 24, -68 + br); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(19, -76 + br, 3.5, 0, 7); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255," + (0.5 + Math.sin(t * 3) * 0.4) + ")"; ctx.fillRect(19, -78 + br, 1.5, 1.5);
        ctx.fillStyle = "#6a5236"; ctx.beginPath(); ctx.ellipse(12, -83 + br, 11, 4, 0, 0, 7); ctx.fill();
        // bone folder in hand
        ctx.fillStyle = "#efe6d2"; Art.brush(ctx, [16, -42, 28, -46 + Math.sin(t * 2) * 2], 3, { seed: b });
      } else if (this.k === "lampwick") {
        const lit = G.S.flags.pigment_water;
        const coat = ctx.createLinearGradient(0, -40, 0, 0); coat.addColorStop(0, "#4a4058"); coat.addColorStop(1, "#2a2334");
        ctx.fillStyle = coat; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-9, -32 + br); ctx.quadraticCurveTo(0, -38 + br, 9, -32 + br); ctx.lineTo(13, 0); ctx.quadraticCurveTo(0, 3, -12, 0); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(-5, -2); ctx.moveTo(4, -30); ctx.lineTo(6, -2); ctx.stroke();
        // tall pointed hood with a shadowed face
        ctx.fillStyle = "#3a3146"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-9, -32 + br); ctx.quadraticCurveTo(-8, -52 + br, -2, -62 + br); ctx.quadraticCurveTo(10, -52 + br, 10, -34 + br); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#120d10"; ctx.beginPath(); ctx.ellipse(3, -42 + br, 4.5, 6, 0.1, 0, 7); ctx.fill();
        ctx.fillStyle = "#d4bc9c"; ctx.beginPath(); ctx.moveTo(6, -44 + br); ctx.quadraticCurveTo(8, -39 + br, 5, -36.5 + br); ctx.quadraticCurveTo(6.5, -40 + br, 6, -44 + br); ctx.fill();
        ctx.fillStyle = lit ? "rgba(170,215,255,0.95)" : "rgba(240,230,210,0.85)"; ctx.fillRect(4.5, -43 + br, 1.3, 1.1);
        // lantern pole
        const sw = Math.sin(t * 1.4) * 0.12;
        Art.brush(ctx, [10, -24, 18, -60], 2.5, { seed: 4, color: Art.INK });
        ctx.save(); ctx.translate(18, -60); ctx.rotate(sw);
        ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 8); ctx.stroke();
        ctx.fillStyle = lit ? "rgba(170,215,255,0.95)" : "rgba(230,230,225,0.7)";
        ctx.fillRect(-6, 8, 12, 14); ctx.strokeRect(-6, 8, 12, 14);
        ctx.restore();
        if (lit) { ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 18, -45, 70, "rgba(120,180,255,0.35)"); ctx.globalCompositeOperation = "source-over"; }
      } else if (this.k === "pell") {
        // a painter sketched in pencil — only the first draft of a person
        ctx.globalAlpha *= 0.9;
        ctx.strokeStyle = "rgba(40,32,28,0.8)"; ctx.lineWidth = 1.4;
        for (let k = 0; k < 2; k++) {
          const j = (n) => (U.hash(b + n + k * 9) - 0.5) * 2;
          ctx.beginPath();
          ctx.moveTo(-12 + j(1), 0); ctx.lineTo(-10 + j(2), -40 + br); ctx.lineTo(10 + j(3), -42 + br); ctx.lineTo(13 + j(4), 0);
          ctx.moveTo(8, -58 + br); ctx.arc(1, -52 + br, 9 + j(5) * 0.3, 0, 6.2);
          ctx.moveTo(-10, -60 + br); ctx.quadraticCurveTo(0, -70 + br, 12, -60 + br);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(236,225,201,0.6)"; ctx.fillRect(-9, -38 + br, 19, 36);
        Art.wash(ctx, -2, -22, 6, 5, "#a3322a", 0.6, 5); Art.wash(ctx, 5, -30, 4, 4, "#a3322a", 0.5, 6);
        if (G.S.flags.boss_marshal) Art.wash(ctx, -4, -14, 5, 4, "#3f7fc0", 0.6, 8);
        ctx.fillStyle = Art.INK; Art.brush(ctx, [10, -30, 22, -40 + Math.sin(t * 3) * 3], 2, { seed: 3 });
      }
      ctx.restore();
      this.drawName(ctx, G);
    }
    drawName(ctx, G) {
      const x = this.x, y = this.y;
      if (G.player.interactTarget === this) {
        Art.text(ctx, LD.Lines[this.k][0].name.split(",")[0], x, y - 100, 18, { align: "center", color: "rgba(236,225,201,0.9)", outline: 3, outlineColor: "rgba(21,16,13,0.7)" });
      }
    }
  }

  LD.NPC = NPC;

  // ---------------------------------------------------------------- ink well (+15)
  class InkWell extends Obj {
    constructor(d, S) { super(d); this.id = d.id; this.full = !S.collected[d.id]; this.label = "Draw ink from the well"; }
    canInteract() { return this.full; }
    interact(G) {
      this.full = false;
      G.S.collected[this.id] = true;
      LD.Ink.add(G.S, D.ink.refill, this.x, this.y - 40);
      LD.Audio.sfx.inkGain();
      P.burst(this.x, this.y - 30, 14, "ink", { angle: -Math.PI / 2, spread: 0.6, min: 100, max: 260, p: { color: "#1b2a4a", g: 700 } });
      if (!G.S.flags.hintInkWell) { G.S.flags.hintInkWell = true; LD.HUD.thought("Ink wells refill the pen. The book never refunds a drawing, so every drop is a choice."); }
    }
    draw(ctx) {
      const x = this.x, y = this.y;
      ctx.fillStyle = "#2c2622"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.quadraticCurveTo(x - 30, y - 30, x - 14, y - 40); ctx.lineTo(x + 14, y - 40); ctx.quadraticCurveTo(x + 30, y - 30, x + 24, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#3a322c"; ctx.fillRect(x - 16, y - 46, 32, 8); ctx.strokeRect(x - 16, y - 46, 32, 8);
      if (this.full) {
        ctx.fillStyle = "#0c0f1a"; ctx.beginPath(); ctx.ellipse(x, y - 42, 12, 3, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(120,160,230," + (0.5 + Math.sin(this.t * 3) * 0.3) + ")"; ctx.fillRect(x - 4, y - 43, 5, 1.5);
        if (Math.random() < 0.03) P.add({ kind: "spark", x: x + U.rand(-10, 10), y: y - 46, vy: -30, g: 0, color: "rgba(140,170,240,0.8)", size: 3, life: 0.8 });
      } else Art.text(ctx, "dry", x, y - 14, 14, { align: "center", color: "rgba(236,225,201,0.4)" });
    }
  }

  // ---------------------------------------------------------------- hidden ink cache (+25)
  class Cache extends Obj {
    constructor(d) { super(d); this.id = d.id; }
    update(dt, G) {
      this.t += dt;
      if (U.dist(G.player.cx(), G.player.cy(), this.x, this.y - 18) < 40) {
        G.S.collected[this.id] = true;
        LD.Ink.add(G.S, D.ink.cache, this.x, this.y - 40);
        LD.Audio.sfx.inkGain(); LD.Audio.sfx.bell();
        P.burst(this.x, this.y - 20, 20, "spark", { min: 60, max: 200, p: { color: "rgba(120,160,240,0.8)", g: -50, size: 4 } });
        LD.HUD.thought("A hidden ink cache. Someone saved this for a rainy page.");
        return false;
      }
      if (Math.random() < 0.05) P.add({ kind: "spark", x: this.x + U.rand(-14, 14), y: this.y - U.rand(10, 40), vy: -20, g: 0, color: "rgba(140,170,240,0.8)", size: 3, life: 1 });
      return true;
    }
    draw(ctx) {
      const x = this.x, y = this.y + Math.sin(this.t * 2) * 2;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, y - 16, 44, "rgba(110,150,240,0.35)"); ctx.restore();
      for (let i = 0; i < 3; i++) {
        const bx = x - 12 + i * 12, h = 20 + (i % 2) * 6;
        ctx.fillStyle = "#101626"; ctx.strokeStyle = "#d9cdb3"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bx - 5, y); ctx.lineTo(bx - 5, y - h); ctx.lineTo(bx + 5, y - h); ctx.lineTo(bx + 5, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#8e2a22"; ctx.fillRect(bx - 3, y - h - 4, 6, 4);
      }
      ctx.strokeStyle = "#8e2a22"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 18, y - 10); ctx.lineTo(x + 18, y - 12); ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- lore
  class Lore extends Obj {
    constructor(d, S) { super(d); this.id = d.id; this.kind = d.kind; this.label = "Read"; }
    interact(G) { G.readLore(this.id); }
    draw(ctx, G) {
      const x = this.x, y = this.y, read = G.S.lore.includes(this.id);
      ctx.save();
      if (this.kind === "board") {
        ctx.fillStyle = Art.INK; ctx.fillRect(x - 36, y - 80, 5, 80); ctx.fillRect(x + 31, y - 80, 5, 80);
        ctx.fillStyle = "#4b3828"; ctx.fillRect(x - 40, y - 96, 80, 50); ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.5; ctx.strokeRect(x - 40, y - 96, 80, 50);
        ctx.fillStyle = "#e6d9bc"; ctx.fillRect(x - 30, y - 90, 26, 34); ctx.fillRect(x + 2, y - 88, 28, 22);
        ctx.strokeStyle = "rgba(21,16,13,0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(x - 27, y - 84 + k * 7); ctx.lineTo(x - 8, y - 84 + k * 7); } ctx.stroke();
      } else if (this.kind === "mural") {
        ctx.strokeStyle = "rgba(236,225,201,0.6)"; ctx.lineWidth = 2; ctx.strokeRect(x - 50, y - 130, 100, 70);
        if (G.S.flags.pigment_water) Art.wash(ctx, x, y - 95, 44, 24, "#4f8cc8", 0.6, 3);
        ctx.beginPath(); ctx.moveTo(x - 44, y - 90); for (let k = 0; k < 9; k++) ctx.lineTo(x - 44 + k * 11, y - 90 + Math.sin(k) * 5); ctx.stroke();
      } else if (this.kind === "prints") {
        ctx.fillStyle = "rgba(10,8,7,0.85)";
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x - 20 + k * 9, y - 44 - (k % 2) * 6, 3.5, 5, 0.2, 0, 7); ctx.fill(); }
        Art.splat(ctx, x + 22, y - 40, 5, "rgba(10,8,7,0.8)", 4, 4);
      } else if (this.kind === "smear") {
        ctx.fillStyle = "rgba(10,8,7,0.8)";
        Art.brush(ctx, [x - 40, y - 4, x - 10, y - 8, x + 30, y - 3], 5, { seed: 2 });
        Art.brush(ctx, [x - 36, y - 14, x + 10, y - 18, x + 40, y - 12], 3, { seed: 3 });
      } else {
        // a pinned note
        ctx.translate(x, y - 24); ctx.rotate(Math.sin(this.t) * 0.05 - 0.1);
        ctx.fillStyle = "#efe4cb"; ctx.fillRect(-11, -14, 22, 26); ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.5; ctx.strokeRect(-11, -14, 22, 26);
        ctx.strokeStyle = "rgba(21,16,13,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(-7, -8 + k * 5); ctx.lineTo(7, -8 + k * 5); } ctx.stroke();
        ctx.fillStyle = "#8e2a22"; ctx.beginPath(); ctx.arc(0, -14, 2.5, 0, 7); ctx.fill();
      }
      ctx.restore();
      if (!read && Math.random() < 0.03) P.add({ kind: "spark", x: x + U.rand(-16, 16), y: y - U.rand(20, 60), vy: -15, g: 0, color: "rgba(255,230,180,0.8)", size: 3, life: 1 });
    }
  }

  // ---------------------------------------------------------------- latch (shortcut door)
  class Latch extends Obj {
    constructor(d) { super(d); this.label = d.side === "front" ? "Lift the latch" : "Try the door"; }
    interact(G) {
      if (this.d.side === "front") {
        LD.Audio.sfx.lever();
        G.setFlag("ash_door");
        LD.HUD.thought("The latch lifts. A shortcut back to the Faded Gardens.");
        this.dead = true;
      } else {
        LD.Audio.sfx.block();
        LD.HUD.thought("Latched from the other side.");
      }
    }
  }

  // ---------------------------------------------------------------- Water Pigment altar
  class Pigment extends Obj {
    constructor(d) { super(d); this.label = "Take the Water Pigment"; this.range = 70; }
    canInteract(G) { return G.S.flags.boss_hart && !G.S.flags.pigment_water; }
    interact(G) { G.claimPigment(this); }
    draw(ctx, G) {
      if (!this.canInteract(G)) return;
      const x = this.x, y = this.y - 110 + Math.sin(this.t * 2) * 6;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      Art.glow(ctx, x, y, 110, "rgba(70,140,230,0.45)");
      ctx.restore();
      ctx.fillStyle = "#3f7fc0";
      Art.blobPath(ctx, x, y, 16, 16, Math.floor(this.t * 6), 12, 0.2); ctx.fill();
      Art.elementGlyph(ctx, "water", x, y, 9, "#e6f2ff");
      if (Math.random() < 0.3) P.add({ kind: "water", x: x + U.rand(-14, 14), y: y + 10, vy: 60, g: 300, color: "#6aa8e0", size: 2, life: 0.6 });
    }
  }

  // ---------------------------------------------------------------- trigger
  class Trigger extends Obj {
    constructor(d) { super(d); this.rect = { x: d.x * T, y: d.y * T, w: d.w * T, h: d.h * T }; this.id = d.id; }
    update(dt, G) {
      if (!G.player.dead && U.overlap(this.rect, G.player.hurtbox())) { G.trigger(this.id); return false; }
      return true;
    }
  }

  // ---------------------------------------------------------------- mend pickup (drops)
  class Mend {
    constructor(x, y) { this.x = x; this.y = y; this.vx = U.rand(-60, 60); this.vy = -260; this.t = 0; this.w = 14; this.h = 14; }
    update(dt, G) {
      this.t += dt;
      const b = { x: this.x - 7, y: this.y - 7, w: 14, h: 14, vx: this.vx, vy: this.vy + 1200 * dt };
      W.moveBody(b, dt);
      this.x = b.x + 7; this.y = b.y + 7; this.vx = b.vx * 0.98; this.vy = b.vy;
      if (this.t > 0.3 && U.dist(G.player.cx(), G.player.cy(), this.x, this.y) < 36) {
        if (G.S.hp < D.player.maxHp) {
          G.S.hp = Math.min(D.player.maxHp, G.S.hp + D.pickups.mendAmount);
          LD.HUD.hpPulse(); LD.Audio.sfx.save();
          P.add({ kind: "text", x: this.x, y: this.y - 20, vy: -40, g: 0, text: "mended", size: 20, life: 1, color: "#8e2a22", front: true });
          return false;
        }
      }
      return this.t < 12;
    }
    draw(ctx) {
      const a = this.t > 10 ? (Math.floor(this.t * 8) % 2 ? 0.4 : 1) : 1;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(this.x, this.y); ctx.rotate(Math.sin(this.t * 3) * 0.2);
      ctx.fillStyle = "#efe4cb"; ctx.fillRect(-8, -6, 16, 12); ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.5; ctx.strokeRect(-8, -6, 16, 12);
      ctx.strokeStyle = "#a3322a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 0); for (let k = 0; k < 4; k++) ctx.lineTo(-6 + k * 4, k % 2 ? -3 : 3); ctx.stroke();
      ctx.restore();
    }
  }
  LD.Mend = Mend;
  // exported so js/entities/object-art.js can give them detailed drawings
  LD.Objs = { Door, Station, InkWell, Cache, Lore, Pigment };

  // ---------------------------------------------------------------- factory
  LD.spawnEntity = (d, S) => {
    switch (d.t) {
      case "enemy": return new LD.EnemyTypes[d.k](d.x, d.y);
      case "boss": return new LD.BossTypes[d.k](d.x, d.y);
      case "hint": return new Hint(d);
      case "door": return new Door(d);
      case "station": return new Station(d);
      case "npc": return new NPC(d);
      case "inkwell": return new InkWell(d, S);
      case "cache": return S.collected[d.id] ? null : new Cache(d);
      case "lore": return new Lore(d, S);
      case "latch": return new Latch(d);
      case "pigment": return new Pigment(d);
      case "trigger": return S.flags["trig_" + d.id] ? null : new Trigger(d);
    }
    return null;
  };
  LD.fillKeys = fillKeys;
})();
