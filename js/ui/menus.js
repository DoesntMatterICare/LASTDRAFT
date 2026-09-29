// Title screen, pause menu, journal, settings (accessibility), control remapping, end card.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, I = LD.Input, A = LD.Audio, D = LD.Data;

  // Generic vertical list menu used by several screens.
  class ListMenu {
    constructor(items, o = {}) { this.items = items; this.sel = 0; this.x = o.x || 640; this.y = o.y || 300; this.gap = o.gap || 56; this.size = o.size || 34; this.align = o.align || "center"; this.width = o.width || 420; }
    update() {
      const n = this.items.length;
      const enabled = (i) => !this.items[i].disabled || !this.items[i].disabled();
      if (I.pressed("mUp")) { do this.sel = (this.sel + n - 1) % n; while (!enabled(this.sel)); A.sfx.ui(); }
      if (I.pressed("mDown")) { do this.sel = (this.sel + 1) % n; while (!enabled(this.sel)); A.sfx.ui(); }
      const m = I.mouse;
      for (let i = 0; i < n; i++) {
        const y = this.y + i * this.gap;
        const x0 = this.align === "center" ? this.x - this.width / 2 : this.x;
        if (m.x > x0 && m.x < x0 + this.width && m.y > y - this.size && m.y < y + 12 && enabled(i)) {
          if (m.inside && this.sel !== i) this.sel = i;
          if (m.pressed) { this.sel = i; return this.items[i]; }
        }
      }
      const it = this.items[this.sel];
      if (it.adjust) {
        if (I.pressed("mLeft")) { it.adjust(-1); A.sfx.ui(); }
        if (I.pressed("mRight")) { it.adjust(1); A.sfx.ui(); }
      }
      if (I.pressed("confirm")) return it;
      return null;
    }
    draw(ctx, color = "#2a1a10", hi = "#7a1f16") {
      const t = performance.now() / 1000;
      this.items.forEach((it, i) => {
        const y = this.y + i * this.gap, sel = i === this.sel;
        const dis = it.disabled && it.disabled();
        const label = typeof it.label === "function" ? it.label() : it.label;
        ctx.save(); if (dis) ctx.globalAlpha *= 0.35;
        ctx.font = this.size + "px " + (it.font === "title" ? Art.TITLE : Art.HAND);
        const tw = ctx.measureText(label).width;
        if (sel) LD.UIKit.selector(ctx, this.x, y, tw, this.size, hi, t, i * 11 + 3, this.align);
        else {
          // a small inked bullet in the margin
          const bx = this.align === "center" ? this.x - tw / 2 - 16 : this.x - 16;
          ctx.fillStyle = "rgba(74,36,24,0.45)";
          ctx.beginPath(); ctx.arc(bx, y - this.size * 0.28, 2.2, 0, 7); ctx.fill();
        }
        Art.text(ctx, label, this.x, y, this.size, { align: this.align, color: sel ? hi : color, font: it.font });
        if (it.bar) {
          // ink gauge under slider items
          const v = U.clamp(it.bar(), 0, 1), bw = 180, bx = this.align === "center" ? this.x - bw / 2 : this.x, by = y + 12;
          ctx.fillStyle = "rgba(74,36,24,0.18)";
          Art.brush(ctx, [bx, by, bx + bw / 2, by - 0.5, bx + bw, by], 6, { seed: i, taperStart: 0.02, taperEnd: 0.02, jitter: 0 });
          if (v > 0) { ctx.fillStyle = sel ? hi : "#3a2a1e"; Art.brush(ctx, [bx, by, bx + bw * v * 0.5, by - 0.5, bx + bw * v, by], 4.5, { seed: i + 5, taperStart: 0.05, taperEnd: 0.2, jitter: 0.1 }); }
          ctx.strokeStyle = "rgba(74,36,24,0.5)"; ctx.lineWidth = 1;
          ctx.beginPath(); for (let q = 0; q <= 10; q++) { const qx = bx + bw * q / 10; ctx.moveTo(qx, by + 4); ctx.lineTo(qx, by + (q % 5 ? 6 : 8)); } ctx.stroke();
        }
        if (it.check) {
          const on = it.check(), cx = (this.align === "center" ? this.x + tw / 2 : this.x + tw) + 22, cy = y - this.size * 0.3;
          Art.sketch(ctx, [cx - 8, cy - 8, cx + 8, cy - 9, cx + 9, cy + 8, cx - 8, cy + 8], 1.6, "#3a2a1e", i * 5, 0.8, true, 2);
          if (on) { ctx.fillStyle = hi; Art.brush(ctx, [cx - 6, cy, cx - 1, cy + 6, cx + 11, cy - 12], 3.5, { seed: i }); }
        }
        ctx.restore();
      });
    }
  }
  LD.ListMenu = ListMenu;

  const K = LD.UIKit;
  const book = (ctx, k, seedA, seedB) => K.book(ctx, k, seedA, seedB);

  // A little still life for the title page: squat ink bottle, a quill resting in it, a spill.
  function inkwell(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(21,16,13,0.8)";
    Art.blobPath(ctx, -34, 34, 34, 7, 12, 16, 0.3); ctx.fill();
    ctx.fillStyle = "rgba(40,25,15,0.25)"; ctx.beginPath(); ctx.ellipse(6, 36, 50, 8, 0, 0, 7); ctx.fill();
    // quill (behind the neck)
    ctx.save(); ctx.translate(4, -8); ctx.rotate(-0.55);
    ctx.fillStyle = "#efe6d2"; ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 1.3;
    const sway = Math.sin(t * 1.3) * 0.03;
    ctx.rotate(sway);
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.bezierCurveTo(-18, -60, -8, -110, 8, -140); ctx.bezierCurveTo(14, -100, 16, -50, 4, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const yy = -26 - i * 9; ctx.moveTo(2, yy); ctx.lineTo(-8 + (i % 3), yy - 8); ctx.moveTo(3, yy); ctx.lineTo(10, yy - 6); }
    ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(0, -70, 8, -138); ctx.stroke();
    ctx.restore();
    // bottle
    const g = ctx.createLinearGradient(-26, 0, 26, 0);
    g.addColorStop(0, "#0d0f1a"); g.addColorStop(0.35, "#27304a"); g.addColorStop(1, "#07080e");
    ctx.fillStyle = g; ctx.strokeStyle = "#15100d"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-10, -4); ctx.quadraticCurveTo(-28, 0, -28, 16); ctx.lineTo(-26, 34); ctx.lineTo(26, 34); ctx.lineTo(28, 16); ctx.quadraticCurveTo(28, 0, 10, -4); ctx.lineTo(10, -12); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3a2a1e"; ctx.beginPath(); ctx.roundRect(-12, -16, 24, 6, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e3d6b8"; ctx.beginPath(); ctx.moveTo(-20, 12); ctx.lineTo(20, 11); ctx.lineTo(20, 26); ctx.lineTo(-20, 27); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1; ctx.stroke();
    Art.text(ctx, "INK", 0, 23, 12, { align: "center", font: "title", color: "#4a2418" });
    ctx.strokeStyle = "rgba(200,215,255,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, 4); ctx.quadraticCurveTo(-24, 14, -22, 30); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- TITLE
  class Title {
    constructor(G) {
      this.G = G; this.t = 0; this.started = false; this.motes = [];
      for (let i = 0; i < 40; i++) this.motes.push({ x: Math.random() * 1280, y: Math.random() * 720, s: U.rand(1, 3), v: U.rand(8, 30) });
      this.build();
    }
    build() {
      const G = this.G;
      const items = [];
      if (LD.Save.exists()) items.push({ id: "continue", label: "Continue" });
      items.push({ id: "new", label: "New Draft" });
      items.push({ id: "howto", label: "How to Play" });
      items.push({ id: "settings", label: "Settings" });
      this.menu = new ListMenu(items, { x: 250, y: 440, gap: 54, size: 34, align: "left", width: 300 });
    }
    update(dt, G) {
      this.t += dt;
      for (const m of this.motes) { m.y -= m.v * dt; if (m.y < -10) { m.y = 730; m.x = Math.random() * 1280; } }
      if (!this.started) {
        if (this.t > 0.6 && I.anyPressed()) { this.started = true; A.init(); A.play("title"); A.sfx.page(); I.clearAll(); }
        return;
      }
      if (G.overlay) return;
      const it = this.menu.update();
      if (!it) return;
      A.sfx.uiOk();
      if (it.id === "continue") G.continueGame();
      else if (it.id === "new") {
        if (LD.Save.exists() && !this.confirmNew) { this.confirmNew = true; it.label = "New Draft (erases save — confirm)"; return; }
        G.newGame();
      } else if (it.id === "howto") G.pushOverlay(new HowTo());
      else if (it.id === "settings") G.pushOverlay(new Settings(G));
    }
    draw(ctx, G) {
      const t = this.t;
      const painted = LD.Assets.ui("title");
      if (painted) ctx.drawImage(painted, 0, 0, 1280, 720);
      ctx.save();
      if (!painted) {
        // a living painting of Looseleaf Borough, drawn by the same renderer as the game
        if (!this.scene) { this.sceneRoom = LD.buildRoom("streets", {}); this.scene = LD.BG.build(this.sceneRoom, {}, 0); }
        const room = this.sceneRoom, sc = this.scene, T = U.TILE;
        const cam = { x: 700 + Math.sin(t * 0.04) * 600, y: room.h * T - 720 };
        ctx.drawImage(sc.sky, 0, 0, 1280, 720);
        ctx.save(); ctx.translate(-cam.x, -cam.y); LD.BG.draw(ctx, sc, cam); ctx.restore();
        // Ink Spot, faint on a distant rooftop
        LD.drawInkSpot(ctx, 1150, 560, 0.8, t, 0.3 + Math.sin(t * 0.7) * 0.08);
        // near cliff + the Sketcher looking out over the borough
        ctx.fillStyle = "#130e11";
        ctx.beginPath(); ctx.moveTo(620, 720); ctx.lineTo(700, 640); ctx.quadraticCurveTo(900, 612, 1080, 618); ctx.lineTo(1280, 610); ctx.lineTo(1280, 720); ctx.fill();
        ctx.save(); ctx.translate(930, 616);
        ctx.fillStyle = "#130e11";
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-8, -40); ctx.quadraticCurveTo(-4, -64, 6, -66); ctx.quadraticCurveTo(14, -62, 12, -46); ctx.lineTo(14, 0); ctx.fill();
        const flow = Math.sin(t * 1.4) * 6;
        ctx.beginPath(); ctx.moveTo(-6, -56); ctx.quadraticCurveTo(-30 - flow, -40, -48 - flow, -8); ctx.lineTo(-38 - flow, -12); ctx.lineTo(-30, -4); ctx.lineTo(-20, -16); ctx.lineTo(-8, -20); ctx.fill();
        Art.brush(ctx, [12, -40, 22, -30, 30, -12], 3, { seed: 2, color: "#130e11" });
        ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = "soft-light";
        const g = ctx.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, "rgba(70,50,130,0.4)"); g.addColorStop(1, "rgba(255,150,90,0.3)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720); ctx.restore();
        // torn parchment panel for the title, like the concept sheets
        if (!this.panel) this.panel = Art.parchment(720, 620, 778, { torn: true });
        ctx.drawImage(this.panel, 50, 50);
        K.drawFrame(ctx, 60, 60, 700, 600, { inset: 18 });
        for (let i = 0; i < 5; i++) Art.splat(ctx, 70 + i * 140, 60 + (i % 2) * 560, 6 + i, "rgba(21,16,13,0.7)", i * 13, 6);
        inkwell(ctx, 640, 590, t);
        K.pin(ctx, 410, 66);
      }
      ctx.restore();
      for (const m of this.motes) { ctx.fillStyle = "rgba(20,15,12,0.4)"; ctx.fillRect(m.x, m.y, m.s, m.s); }

      // title calligraphy
      const k = U.easeOut(Math.min(1, t / 1.6));
      ctx.save(); ctx.globalAlpha = k;
      Art.text(ctx, "THE", 128, 150, 30, { font: "title", color: "#2a1a10" });
      Art.text(ctx, "Living Draft", 110, 238, 108, { font: "title", color: "#1a0f0a" });
      ctx.fillStyle = "#8e2a22";
      const w = 620 * U.easeOut(Math.min(1, (t - 0.6) / 1.2));
      if (w > 0) Art.brush(ctx, [118, 262, 118 + w * 0.5, 256, 118 + w, 264], 7, { seed: 4, taperStart: 0.1, taperEnd: 0.5 });
      Art.splat(ctx, 700, 150, 10, "rgba(21,16,13,0.85)", 3, 7);
      Art.text(ctx, "Chapter 1  ·  Looseleaf Borough", 124, 310, 32, { font: "title", color: "#4a2418" });
      Art.text(ctx, "A finished thing is not necessarily a perfect thing.", 126, 350, 24, { color: "#5a4a3a" });
      K.divider(ctx, 400, 382, 520, "rgba(74,36,24,0.7)", 7);
      ctx.restore();

      if (!this.started) {
        if (t > 0.8) Art.text(ctx, "— press any key —", 250, 480, 30, { color: "#2a1a10", alpha: 0.5 + Math.sin(t * 3) * 0.4 });
      } else this.menu.draw(ctx);
      Art.text(ctx, "keyboard · mouse · gamepad", 1250, 705, 16, { align: "right", color: "rgba(40,30,20,0.5)" });
    }
  }

  // ---------------------------------------------------------------- HOW TO
  class HowTo {
    constructor() { this.t = 0; this.pause = true; }
    update() { this.t += 1 / 60; if (this.t > 0.2 && (I.pressed("confirm") || I.pressed("back") || I.mouse.pressed)) { A.sfx.page(); return false; } return true; }
    draw(ctx) {
      ctx.save(); book(ctx, Math.min(1, this.t * 4), 501, 502);
      K.heading(ctx, "Controls", 360, 120, 38);
      const rows = [["left", "right"], ["jump"], ["attack"], ["up", "attack"], ["down", "attack"], ["dodge"], ["guard"], ["dash"], ["interact"], ["map"], ["pause"]];
      const names = ["Move", "Jump (hold = higher)", "Attack (combo)", "Upward strike", "Downward strike (air, bounces)", "Dodge — brief invulnerability", "Guard — blocks from the front, costs stamina", "Foldstep (once earned)", "Interact / talk / rest", "Map", "Pause & journal"];
      rows.forEach((r, i) => {
        const y = 178 + i * 40;
        if (i % 2) { ctx.fillStyle = "rgba(120,90,50,0.08)"; ctx.fillRect(118, y - 24, 484, 36); }
        let kx = 132;
        r.forEach((a, j) => {
          if (j) { Art.text(ctx, "+", kx + 2, y + 4, 20, { color: "#6b5a44" }); kx += 16; }
          ctx.font = "20px " + Art.HAND;
          const w = Math.max(28, ctx.measureText(I.label(a)).width + 16);
          K.keycap(ctx, I.label(a), kx + w / 2, y - 4); kx += w + 4;
        });
        Art.text(ctx, names[i], 262, y + 2, 21, { color: "#2a1a10" });
      });
      Art.text(ctx, "gamepad: A jump · X attack · B dodge · LB guard · RB foldstep · Y interact", 360, 612, 16, { align: "center", color: "#6b5a44" });
      K.heading(ctx, "The Book's Rules", 920, 120, 38);
      const rules = [
        "Ink is your only resource. It buys weapons — nothing else.",
        "At a Bindery desk, DRAW a weapon. The book reads its broad shape: long & narrow → Blade (18), a shaft with a head → Polearm (24), big & heavy → Heavy Tool (30).",
        "Redrawing costs ink again. Old weapons are never refunded.",
        "Ink wells (+15) and hidden caches (+25) refill your pen.",
        "Recovered pigments infuse your weapon. Water overpowers Fire.",
        "Every attack has a wind-up and a recovery. Dodging and guarding spend stamina; run dry and you must back off.",
        "Resting at a station heals and saves. Falling in battle returns you there.",
      ];
      let y = 178;
      rules.forEach((r, i) => {
        Art.splat(ctx, 706, y - 6, 3, "#7a1f16", i * 7, 2);
        y += Art.richText(ctx, r, 718, y, 21, 450, { color: "#2a1a10" }) + 8;
      });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- SETTINGS
  class Settings {
    constructor(G) {
      this.G = G; this.t = 0; this.pause = true;
      const s = G.settings, pct = (v) => Math.round(v * 100) + "%";
      const slider = (key, label) => ({ label: () => label + ":  ◂ " + pct(s[key]) + " ▸", bar: () => s[key], adjust: (d) => { s[key] = U.clamp(Math.round((s[key] + d * 0.1) * 10) / 10, 0, 1); G.applySettings(); } });
      const toggle = (key, label) => ({ label: () => label + ":  " + (s[key] ? "on" : "off"), check: () => s[key], act: () => { s[key] = !s[key]; G.applySettings(); }, adjust: () => { s[key] = !s[key]; G.applySettings(); } });
      this.menu = new ListMenu([
        slider("master", "Master volume"), slider("music", "Music"), slider("sfx", "Effects"), slider("shake", "Screen shake"),
        toggle("highContrast", "High contrast"), toggle("damageAssist", "Damage assist"), toggle("reduceFlash", "Reduce flashing"),
        { label: "Remap controls", act: () => G.pushOverlay(new Remap(G)) },
        { label: "Back", act: () => { this.done = true; } },
      ], { x: 910, y: 192, gap: 50, size: 28 });
    }
    update(dt, G) {
      this.t += dt;
      if (this.done) { G.saveSettings(); return false; }
      if (I.pressed("back")) { G.saveSettings(); A.sfx.page(); return false; }
      const it = this.menu.update();
      if (it && it.act) { A.sfx.uiOk(); it.act(); }
      return true;
    }
    draw(ctx) {
      ctx.save(); book(ctx, Math.min(1, this.t * 4), 601, 602);
      K.heading(ctx, "Settings", 360, 130, 40);
      K.heading(ctx, "Options", 920, 124, 30);
      const notes = [
        "High contrast: dims painted backgrounds and outlines characters, hazards stay shape-coded.",
        "Damage assist: you take half damage and deal a little more.",
        "Reduce flashing: softer hit flashes.",
        "All critical signals use shape as well as colour: telegraph marks (!), element glyphs, hatching on stamina.",
        "Use ◂ ▸ to adjust, confirm to toggle.",
      ];
      let y = 196;
      notes.forEach((n, i) => {
        Art.splat(ctx, 128, y - 6, 3, "#7a1f16", i * 5 + 1, 2);
        y += Art.richText(ctx, n, 142, y, 21, 440, { color: "#3a2a1e" }) + 12;
      });
      this.menu.draw(ctx);
      ctx.restore();
    }
  }

  class Remap {
    constructor(G) {
      this.G = G; this.t = 0; this.pause = true; this.waiting = null;
      const items = I.ACTIONS.map((a) => ({ a, label: () => I.ACTION_NAMES[a] + ":   " + (I.binds[a] || []).map(I.keyName).join("  /  ") + (this.waiting === a ? "   … press a key" : "") }));
      items.push({ label: "Reset to defaults", reset: true });
      items.push({ label: "Back", back: true });
      this.menu = new ListMenu(items, { x: 640, y: 150, gap: 38, size: 24, width: 700 });
    }
    update(dt, G) {
      this.t += dt;
      if (this.waiting) return true;
      if (I.pressed("back")) { G.saveSettings(); return false; }
      const it = this.menu.update();
      if (!it) return true;
      if (it.back) { G.saveSettings(); return false; }
      if (it.reset) { I.binds = I.defaults(); G.settings.binds = I.binds; A.sfx.uiOk(); return true; }
      this.waiting = it.a;
      A.sfx.ui();
      setTimeout(() => {
        I.capture = (code) => {
          if (code !== "Escape") {
            const b = I.binds[it.a];
            b[0] = code;
            G.settings.binds = I.binds;
          }
          this.waiting = null;
          I.clearAll();
        };
      }, 120);
      return true;
    }
    draw(ctx) {
      const k = Math.min(1, this.t * 4);
      ctx.save();
      ctx.fillStyle = "rgba(8,5,4," + 0.75 * k + ")"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
      ctx.globalAlpha = k;
      ctx.drawImage(Art.parchment(900, 660, 701, { torn: true }), 190, 30);
      K.drawFrame(ctx, 200, 40, 880, 640, { inset: 14 });
      K.heading(ctx, "Remap controls", 640, 94, 34);
      this.menu.draw(ctx);
      Art.text(ctx, "Select an action, then press the new key (Esc cancels). Menus always accept Enter / Esc / arrows.", 640, 668, 17, { align: "center", color: "#6b5a44" });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- PAUSE + JOURNAL
  class Pause {
    constructor(G) {
      this.G = G; this.t = 0; this.pause = true;
      this.menu = new ListMenu([
        { id: "resume", label: "Resume" }, { id: "journal", label: "Journal" }, { id: "map", label: "Map" },
        { id: "howto", label: "Controls" }, { id: "settings", label: "Settings" }, { id: "quit", label: "Quit to title" },
      ], { x: 900, y: 200, gap: 58, size: 34 });
      A.sfx.page();
    }
    update(dt, G) {
      this.t += dt;
      if (this.t > 0.1 && (I.pressed("pause") || I.pressed("back"))) { A.sfx.page(); return false; }
      const it = this.menu.update();
      if (!it) return true;
      A.sfx.uiOk();
      if (it.id === "resume") return false;
      if (it.id === "journal") G.pushOverlay(new Journal(G));
      if (it.id === "map") G.pushOverlay(new LD.MapView(G));
      if (it.id === "howto") G.pushOverlay(new HowTo());
      if (it.id === "settings") G.pushOverlay(new Settings(G));
      if (it.id === "quit") {
        if (!this.confirmQuit) { this.confirmQuit = true; it.label = "Quit (unsaved progress since your last rest is lost)"; return true; }
        G.toTitle(); return false;
      }
      return true;
    }
    draw(ctx, G) {
      ctx.save(); book(ctx, Math.min(1, this.t * 5), 801, 802);
      K.heading(ctx, "Paused", 360, 128, 44);
      Art.text(ctx, G.world.room.name, 360, 186, 28, { align: "center", color: "#2a1a10" });
      // current aim on a pinned note
      ctx.save(); ctx.translate(360, 262); ctx.rotate(-0.015);
      ctx.drawImage(Art.parchment(440, 90, 811, { torn: true }), -220, -45);
      K.pin(ctx, 0, -32);
      Art.text(ctx, "current aim", -190, -12, 16, { color: "#8e2a22" });
      Art.richText(ctx, LD.Quest.current(G.S), -190, 14, 22, 380, { color: "#2a1a10" });
      ctx.restore();
      const S = G.S, sec = LD.countSecrets(S);
      const lines = [["clock", "Time in the book", U.fmtTime(S.time)], ["drop", "Ink", Math.floor(S.ink) + " / " + D.ink.max], ["quill", "Spent on creation", S.inkSpent],
        ["bottle", "Ink wells & caches", sec.found + " / " + sec.total], ["page", "Fragments read", sec.lore + " / " + sec.loreTotal], ["broken", "Times the line broke", S.deaths]];
      lines.forEach(([ic, a, b], i) => {
        const y = 360 + i * 38;
        K.icon(ctx, ic, 150, y - 7, "#4a2418");
        Art.text(ctx, a, 172, y, 22, { color: "#3a2a1e" });
        ctx.font = "22px " + Art.HAND;
        const aw = ctx.measureText(a).width, bs = String(b), bw = ctx.measureText(bs).width;
        ctx.fillStyle = "rgba(74,36,24,0.4)";
        for (let dx = 172 + aw + 8; dx < 570 - bw - 8; dx += 7) ctx.fillRect(dx, y - 3, 1.6, 1.6);
        Art.text(ctx, bs, 570, y, 22, { align: "right", color: "#2a1a10" });
      });
      this.menu.draw(ctx);
      ctx.restore();
    }
  }

  class Journal {
    constructor(G) {
      this.G = G; this.t = 0; this.pause = true;
      const lore = Object.keys(LD.Lore).filter((id) => G.S.lore.includes(id));
      const items = lore.map((id) => ({ id, label: LD.Lore[id].title }));
      items.push({ id: "_back", label: "Back" });
      this.menu = new ListMenu(items, { x: 730, y: 184, gap: 40, size: 23, align: "left", width: 440 });
    }
    update(dt, G) {
      this.t += dt;
      if (I.pressed("back")) return false;
      const it = this.menu.update();
      if (!it) return true;
      if (it.id === "_back") return false;
      G.pushOverlay(new LD.LoreReader(it.id));
      return true;
    }
    draw(ctx, G) {
      const S = G.S, f = S.flags;
      ctx.save(); book(ctx, Math.min(1, this.t * 5), 901, 902);
      K.heading(ctx, "Journal", 360, 120, 40);
      const steps = [
        ["Arrived in the Margin", true], ["Found the Bindery", !!S.visited.bindery], ["Drew a weapon", S.weapon.cls !== "nib" || S.redraws > 0],
        ["Reached the Dry Canals", !!S.visited.canals], ["Recovered the Water Pigment", !!f.pigment_water], ["Glimpsed the one behind it all", !!f.sawInkSpot],
        ["Defeated the Soot Marshal", !!f.boss_marshal], ["Learned Foldstep", !!f.foldstep], ["Reached the Torn Edge", !!f.chapterDone],
      ];
      steps.forEach(([s, done], i) => {
        const y = 184 + i * 42;
        Art.text(ctx, ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"][i] + ".", 124, y, 16, { align: "right", font: "serif", color: "rgba(74,36,24,0.55)" });
        Art.sketch(ctx, [130, y - 18, 148, y - 19, 149, y, 131, y + 1], 1.6, "#2a1a10", i * 3, 0.7, true, 2);
        if (done) { ctx.fillStyle = "#7a1f16"; Art.brush(ctx, [132, y - 10, 138, y - 3, 152, y - 24], 3.5, { seed: i }); }
        Art.text(ctx, done || i < 2 ? s : "· · ·", 162, y, 24, { color: done ? "#2a1a10" : "#8a7a64" });
        if (i < steps.length - 1) { ctx.strokeStyle = "rgba(74,36,24,0.25)"; ctx.setLineDash([2, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(139, y + 4); ctx.lineTo(139, y + 22); ctx.stroke(); ctx.setLineDash([]); }
      });
      ctx.save(); ctx.translate(360, 588);
      ctx.drawImage(Art.parchment(470, 70, 912, { torn: true }), -235, -40);
      K.pin(ctx, -210, -26);
      Art.richText(ctx, "Now: " + LD.Quest.current(S), -196, -4, 21, 420, { color: "#4a2418" });
      ctx.restore();
      K.heading(ctx, "Fragments", 900, 130, 32);
      if (this.menu.items.length === 1) Art.text(ctx, "Nothing collected yet. Look for notes, boards and murals.", 900, 170, 19, { align: "center", color: "#6b5a44" });
      this.menu.draw(ctx);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- CHAPTER END CARD
  class EndCard {
    constructor(G) {
      this.G = G; this.t = 0; this.pause = true;
      this.menu = new ListMenu([{ id: "stay", label: "Keep exploring Looseleaf Borough" }, { id: "title", label: "Return to the title page" }], { x: 640, y: 590, gap: 42, size: 28, width: 520 });
    }
    update(dt, G) {
      this.t += dt;
      if (this.t < 2.5) return true;
      const it = this.menu.update();
      if (!it) return true;
      A.sfx.uiOk();
      if (it.id === "title") { G.toTitle(); return false; }
      A.play(G.world.room.music);
      return false;
    }
    draw(ctx, G) {
      const S = G.S, k = Math.min(1, this.t / 1.5);
      ctx.save();
      ctx.fillStyle = "rgba(10,7,5," + 0.85 * k + ")"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
      ctx.globalAlpha = k;
      ctx.drawImage(Art.parchment(1000, 640, 999, { torn: true }), 140, 40);
      K.drawFrame(ctx, 152, 52, 976, 616, { inset: 16 });
      K.heading(ctx, "Chapter 1 — Looseleaf Borough", 640, 130, 44);
      Art.text(ctx, "revised, but not finished", 640, 184, 26, { align: "center", color: "#7a1f16" });
      // a wax seal pressed onto the finished chapter
      const sk = U.easeOutBack(U.clamp((this.t - 1.2) / 0.5, 0, 1));
      if (sk > 0) {
        ctx.save(); ctx.translate(1010, 470); ctx.scale(sk, sk); ctx.rotate(-0.2);
        ctx.fillStyle = "#6e1812";
        Art.brush(ctx, [-8, 20, -14, 50, -22, 74], 12, { seed: 3, taperStart: 0, taperEnd: 0.05, jitter: 0 });
        Art.brush(ctx, [8, 20, 14, 48, 24, 70], 12, { seed: 4, taperStart: 0, taperEnd: 0.05, jitter: 0 });
        K.seal(ctx, 0, 0, 40, "#9c2a22", (c) => {
          Art.text(c, "I", 0, 14, 40, { align: "center", font: "title", color: "rgba(40,6,4,0.55)" });
          Art.text(c, "I", -1, 12, 40, { align: "center", font: "title", color: "#e0a898" });
        }, 21);
        ctx.restore();
      }
      const sec = LD.countSecrets(S);
      const rows = [["Time in the book", U.fmtTime(S.time)], ["Times the line broke", S.deaths], ["Weapons drawn", S.redraws], ["Ink spent on creation", S.inkSpent],
        ["Ink wells & caches", sec.found + " / " + sec.total], ["Fragments read", sec.lore + " / " + sec.loreTotal], ["Illustrations quieted", f(S.flags.kills || 0)]];
      function f(x) { return x; }
      const icons = ["clock", "broken", "quill", "drop", "bottle", "page", "quiet"];
      rows.forEach(([a, b], i) => {
        const y = 244 + i * 38;
        K.icon(ctx, icons[i], 400, y - 7, "#4a2418");
        Art.text(ctx, a, 424, y, 24, { color: "#3a2a1e" });
        ctx.font = "24px " + Art.HAND;
        const aw = ctx.measureText(a).width, bs = String(b), bw = ctx.measureText(bs).width;
        ctx.fillStyle = "rgba(74,36,24,0.4)";
        for (let dx = 424 + aw + 10; dx < 860 - bw - 10; dx += 8) ctx.fillRect(dx, y - 3, 1.8, 1.8);
        Art.text(ctx, bs, 860, y, 24, { align: "right", color: "#2a1a10" });
      });
      K.divider(ctx, 640, 508, 420, "rgba(74,36,24,0.6)", 12);
      Art.text(ctx, "“A finished thing is not necessarily a perfect thing.”", 640, 540, 26, { align: "center", font: "serif", color: "#4a2418", alpha: U.clamp(this.t - 1.5, 0, 1) });
      if (this.t > 2.5) this.menu.draw(ctx);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- Ink Spot (shared renderer)
  // Tall, thin, unfinished; scribbled contours re-drawn every frame; ink tendrils rising.
  LD.drawInkSpot = (ctx, x, y, s, t, alpha = 1, o = {}) => {
    if (LD.Sprites.enabled("inkspot")) {
      const an = o.reach ? { name: "reach", p: o.reach } : { name: "idle", t };
      LD.Sprites.draw(ctx, "inkspot", an.name, an, x, y, o.flip ? -1 : 1, { scale: s, alpha, shadow: "rgba(245,238,250,0.5)" });
      return;
    }
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
    ctx.globalAlpha *= alpha;
    // a faint paper-white halo: the one place the page refuses to let him blend in
    ctx.shadowColor = "rgba(245,238,250,0.55)"; ctx.shadowBlur = 10;
    const b = Art.boil, r = U.rng(b * 31 + 7);
    const reach = o.reach || 0;
    // tendrils swirling upward from head & shoulders
    ctx.fillStyle = "#120b10";
    for (let i = 0; i < 5; i++) {
      const pts = [];
      const bx = -10 + i * 5, by = -150;
      for (let k = 0; k <= 10; k++) {
        const tt = k / 10;
        pts.push(bx + Math.sin(tt * 5 + t * 1.3 + i) * 26 * tt + (i - 2) * 14 * tt, by - tt * (70 + i * 12));
      }
      Art.brush(ctx, pts, 5 - i * 0.4, { seed: i + b, taperStart: 0, taperEnd: 0.9 });
    }
    // legs (long, thin, slightly bent)
    Art.brush(ctx, [-8, -70, -12, -36, -14, 0], 6, { seed: b + 1, taperStart: 0, taperEnd: 0.3 });
    Art.brush(ctx, [6, -70, 12, -34, 10, 0], 6, { seed: b + 2, taperStart: 0, taperEnd: 0.3 });
    // torso
    ctx.beginPath(); ctx.moveTo(-14, -70); ctx.quadraticCurveTo(-18, -110, -10, -132); ctx.lineTo(12, -132); ctx.quadraticCurveTo(18, -108, 12, -70); ctx.closePath(); ctx.fill();
    // arms, hanging past the knees (one may reach)
    Art.brush(ctx, [-12, -126, -26, -90, -24 - reach * 20, -44 + reach * -30, -20 - reach * 50, -20 - reach * 60], 5, { seed: b + 3, taperStart: 0, taperEnd: 0.4 });
    Art.brush(ctx, [12, -126, 24, -92, 22, -48, 26, -26], 5, { seed: b + 4, taperStart: 0, taperEnd: 0.4 });
    // head: an ambiguous smear with one pale opening
    ctx.beginPath(); ctx.ellipse(0, -146, 11, 16, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(240,232,245,0.85)";
    ctx.beginPath(); ctx.ellipse(3, -148, 2.2, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
    // chaotic scribbled contours
    ctx.strokeStyle = "rgba(18,11,16,0.8)"; ctx.lineWidth = 1.1;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      const yy = -r() * 160, xx = (r() - 0.5) * 36;
      ctx.moveTo(xx, yy);
      ctx.bezierCurveTo(xx + (r() - 0.5) * 50, yy + (r() - 0.5) * 40, xx + (r() - 0.5) * 50, yy + (r() - 0.5) * 40, xx + (r() - 0.5) * 30, yy + (r() - 0.5) * 30);
      ctx.stroke();
    }
    // ink pooling at the feet
    ctx.fillStyle = "#120b10";
    Art.blobPath(ctx, 0, 0, 34, 5, b, 14, 0.3); ctx.fill();
    ctx.restore();
  };

  LD.Menus = { Title, Pause, Settings, Journal, EndCard, HowTo };
})();
