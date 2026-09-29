// Loadout: Marginalia (equippable margin notes that tweak how you fight), the two-weapon
// loadout, dog-ear checkpoints, and the station screen where all of it is arranged.
//
// Marginalia are data: `apply()` folds the equipped notes into the live tuning numbers
// (LD.Data) from a saved copy of the base values, plus a few flags in `Loadout.mods` that
// the player/combat code reads directly. Notches: 3, +1 per Keeper defeated.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, I = LD.Input, A = LD.Audio, P = LD.Particles;
  const T = U.TILE;

  const NOTES = {
    quick_quill: { name: "Quick Quill", cost: 1, icon: "quill", desc: "Your swings recover 20% faster, so combos flow and you can dodge out sooner.", where: "Quillon's gift" },
    deep_well: { name: "Deep Well", cost: 2, icon: "drop", desc: "Hold a fourth bead of Flow — one more Ink Art or Mend in reserve.", price: 35 },
    blot_guard: { name: "Blot Guard", cost: 1, icon: "shield", desc: "The parry window is half again as wide.", price: 25 },
    close_shave: { name: "Close Shave", cost: 1, icon: "broken", desc: "A close call fills a whole bead of Flow and slows time a little longer.", price: 25 },
    thick_paper: { name: "Thick Paper", cost: 2, icon: "page", desc: "Your line is drawn on heavier stock: one more drop of health.", price: 40 },
    second_wind: { name: "Second Wind", cost: 1, icon: "wind", desc: "Stamina returns 40% faster.", price: 20 },
    swift_mend: { name: "Swift Mend", cost: 2, icon: "clock", desc: "Mending takes half the time — heal between blows.", where: "the Faded Hart" },
    splash_nib: { name: "Splash Nib", cost: 2, icon: "wave", desc: "Combo finishers (and every Heavy Tool swing) send a wave of ink along the floor.", where: "the Dry Canals" },
    heavy_hand: { name: "Heavy Hand", cost: 1, icon: "hand", desc: "Charged strikes are ready 40% sooner.", where: "the Margin" },
    inkstained: { name: "Inkstained", cost: 1, icon: "bottle", desc: "Every illustration you quiet leaves 3 ink behind.", where: "the Faded Gardens" },
    last_line: { name: "Last Line", cost: 2, icon: "flame", desc: "On your final drop of health, you strike 40% harder.", where: "the Soot Marshal" },
  };
  const ORDER = Object.keys(NOTES);

  // base values captured once, before any note modifies them
  const BASE = {
    maxHp: D.player.maxHp, flowMax: D.flow.max, parry: D.player.guard.parry, cc: D.flow.gain.closeCall,
    ccDur: D.player.closeCall.dur, mend: D.flow.mend.channel, charge: D.charge.time, regen: D.player.stamina.regen,
  };

  const L = (LD.Loadout = { NOTES, ORDER, mods: {} });

  L.state = (S) => { if (!S.marg) S.marg = { owned: [], equipped: [] }; return S.marg; };
  L.owned = (S, id) => L.state(S).owned.includes(id);
  L.has = (S, id) => L.state(S).equipped.includes(id);
  L.notches = (S) => 3 + (S.flags.boss_hart ? 1 : 0) + (S.flags.boss_marshal ? 1 : 0);
  L.used = (S) => L.state(S).equipped.reduce((a, id) => a + (NOTES[id] ? NOTES[id].cost : 0), 0);

  L.apply = (S) => {
    const h = (id) => L.has(S, id);
    D.player.maxHp = BASE.maxHp + (h("thick_paper") ? D.player.hpPerPip : 0);
    D.flow.max = BASE.flowMax + (h("deep_well") ? D.flow.pip : 0);
    D.player.guard.parry = BASE.parry * (h("blot_guard") ? 1.5 : 1);
    D.flow.gain.closeCall = h("close_shave") ? D.flow.pip : BASE.cc;
    D.player.closeCall.dur = BASE.ccDur + (h("close_shave") ? 0.2 : 0);
    D.flow.mend.channel = BASE.mend * (h("swift_mend") ? 0.5 : 1);
    D.charge.time = BASE.charge * (h("heavy_hand") ? 0.6 : 1);
    D.player.stamina.regen = BASE.regen * (h("second_wind") ? 1.4 : 1);
    L.mods = { recoveryMult: h("quick_quill") ? 0.8 : 1, splash: h("splash_nib"), lastLine: h("last_line"), inkOnKill: h("inkstained") ? 3 : 0 };
    S.hp = Math.min(S.hp, D.player.maxHp);
    S.flow = Math.min(S.flow || 0, D.flow.max);
  };

  L.toggle = (S, id) => {
    const st = L.state(S);
    if (L.has(S, id)) { st.equipped = st.equipped.filter((x) => x !== id); L.apply(S); return "off"; }
    if (L.used(S) + NOTES[id].cost > L.notches(S)) return "full";
    st.equipped.push(id); L.apply(S); return "on";
  };

  // a new note is found: fanfare, and it's worn at once if there's room
  L.give = (G, id, o = {}) => {
    const S = G.S, st = L.state(S);
    if (st.owned.includes(id)) return;
    st.owned.push(id);
    const n = NOTES[id];
    const worn = L.used(S) + n.cost <= L.notches(S);
    if (worn) { st.equipped.push(id); L.apply(S); }
    A.sfx.pigment();
    if (LD.Cinema) LD.Cinema.flash("255,240,210", 0.25, 4);
    LD.HUD.thought("Marginalia — " + n.name + ": " + n.desc + (worn ? "" : "  (No room to wear it — rearrange at a rest.)"));
    if (!S.flags.hintMarg) { S.flags.hintMarg = true; setTimeout(() => LD.HUD.thought("Margin notes are worn in notches. Arrange them at any rest station."), 4200); }
    if (o.notch) setTimeout(() => LD.HUD.thought("A new notch opens in your margin."), o.delay || 2200);
  };

  // two drawn weapons: the one in hand, and one kept in reserve
  L.onNewWeapon = (S, prev) => {
    // the first real drawing keeps nothing (the bare nib isn't worth keeping); after that, a
    // new drawing takes the hand and the old one is kept in reserve if the reserve is empty
    if (!S.spare && prev && prev.cls !== "nib") S.spare = prev;
  };

  // ------------------------------------------------------------------ icons
  L.icon = (ctx, kind, x, y, s = 1, color = "#2a1a10") => {
    const K = LD.UIKit;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round";
    switch (kind) {
      case "shield": ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, -6); ctx.lineTo(7, 4); ctx.quadraticCurveTo(0, 11, -7, 4); ctx.lineTo(-8, -6); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke(); break;
      case "wind": for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-9, -5 + i * 5); ctx.quadraticCurveTo(4, -8 + i * 5, 6, -4 + i * 5); ctx.stroke(); } break;
      case "wave": Art.elementGlyph(ctx, "water", -3, 0, 7, color); ctx.beginPath(); ctx.moveTo(-10, 8); ctx.quadraticCurveTo(0, 3, 10, 8); ctx.stroke(); break;
      case "hand": ctx.beginPath(); ctx.moveTo(-6, 9); ctx.lineTo(-6, -2); for (let i = 0; i < 4; i++) { ctx.moveTo(-5 + i * 4, -1); ctx.lineTo(-5 + i * 4, -9 + Math.abs(i - 1.5) * 1.5); } ctx.moveTo(7, 9); ctx.lineTo(8, 0); ctx.stroke(); break;
      case "flame": Art.elementGlyph(ctx, "fire", 0, 0, 9, color); break;
      default: K.icon(ctx, kind, 0, 0, color); break;
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ world: margin-note pickup
  class MarginPickup {
    constructor(d) { this.d = d; this.id = d.id; this.x = d.x * T; this.y = d.y * T; this.t = Math.random() * 5; }
    update(dt, G) {
      this.t += dt;
      if (U.dist(G.player.cx(), G.player.cy(), this.x, this.y - 30) < 40) {
        G.S.collected["marg_" + this.id] = true;
        L.give(G, this.id);
        P.burst(this.x, this.y - 30, 24, "spark", { min: 60, max: 220, p: { color: "rgba(255,225,160,0.9)", g: -40, size: 4 } });
        return false;
      }
      if (Math.random() < 0.06) P.add({ kind: "spark", x: this.x + U.rand(-16, 16), y: this.y - U.rand(14, 50), vy: -16, g: 0, color: "rgba(255,225,160,0.8)", size: 3, life: 1 });
      return true;
    }
    draw(ctx) {
      const x = this.x, y = this.y - 34 + Math.sin(this.t * 2) * 4;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, y, 46, "rgba(255,210,140,0.4)"); ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(this.t * 1.3) * 0.12);
      ctx.fillStyle = "#f1e6cf"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(10, -16); ctx.lineTo(14, -12); ctx.lineTo(14, 16); ctx.lineTo(-14, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#d8c9a8"; ctx.beginPath(); ctx.moveTo(10, -16); ctx.lineTo(14, -12); ctx.lineTo(10, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      L.icon(ctx, NOTES[this.id].icon, x, y, 1, "#7a1f16");
    }
  }

  // ------------------------------------------------------------------ world: dog-ear checkpoint
  class Checkpoint {
    constructor(d) { this.d = d; this.id = d.id; this.x = d.x * T; this.y = d.y * T; this.t = 0; this.fold = 0; }
    active(G) { return G.S.checkpoint === this.id; }
    update(dt, G) {
      this.t += dt;
      const p = G.player, on = this.active(G);
      this.fold = U.approach(this.fold, on ? 1 : 0, dt * 3);
      const near = !p.dead && Math.abs(p.cx() - this.x) < 34 && Math.abs(p.feet() - this.y) < 60;
      if (!near && Math.abs(p.cx() - this.x) > 160) this.armed = true;
      // passing an active page again quietly re-saves (keeps anything picked up since)
      if (on && near && this.armed) { this.armed = false; const S = G.S; S.room = LD.World.room.id; S.px = this.d.x; S.py = this.d.y; LD.Save.save(S); }
      if (!on && near) {
        this.armed = false;
        const S = G.S;
        S.checkpoint = this.id; S.room = LD.World.room.id; S.px = this.d.x; S.py = this.d.y;
        LD.Save.save(S);
        A.sfx.page(); A.sfx.bell();
        P.burst(this.x, this.y - 60, 16, "spark", { min: 40, max: 160, p: { color: "rgba(255,225,170,0.9)", g: -40, size: 3 } });
        P.add({ kind: "text", x: this.x, y: this.y - 110, vy: -30, g: 0, text: "page dog-eared", size: 20, life: 1.3, color: "#7a1f16", front: true });
        if (!S.flags.hintCheckpoint) { S.flags.hintCheckpoint = true; LD.HUD.thought("A dog-eared page: if your line breaks, you'll start again from here."); }
      }
      return true;
    }
    draw(ctx, G) {
      const x = this.x, y = this.y, k = this.fold;
      // a slim post with a pinned page; activated, its corner folds down and a ribbon hangs
      ctx.save();
      ctx.fillStyle = "#3a2a1e"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2;
      ctx.fillRect(x - 3, y - 84, 6, 84); ctx.strokeRect(x - 3, y - 84, 6, 84);
      ctx.translate(x, y - 90); ctx.rotate(Math.sin(this.t * 1.5) * 0.04);
      if (k > 0.05) { ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 0, 10, 50, "rgba(255,210,140,0.45)", k); ctx.restore(); }
      ctx.fillStyle = k > 0.5 ? "#f1e6cf" : "#d6cbb4";
      ctx.beginPath(); ctx.moveTo(-16, -8); ctx.lineTo(16 - 10 * k, -8); ctx.lineTo(16, -8 + 10 * k); ctx.lineTo(16, 26); ctx.lineTo(-16, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (k > 0.05) { ctx.fillStyle = "#c7b793"; ctx.beginPath(); ctx.moveTo(16 - 10 * k, -8); ctx.lineTo(16, -8 + 10 * k); ctx.lineTo(16 - 10 * k, -8 + 10 * k); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = "rgba(21,16,13,0.45)"; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-11, 0 + i * 6); ctx.lineTo(9, 0 + i * 6); } ctx.stroke();
      if (k > 0.3) { ctx.fillStyle = "#8e2a22"; ctx.globalAlpha *= k; Art.brush(ctx, [4, -8, 6, 14, 3, 34 + Math.sin(this.t * 3) * 2], 4, { seed: 2, taperStart: 0, taperEnd: 0.2 }); }
      ctx.restore();
    }
  }
  L.MarginPickup = MarginPickup;
  L.Checkpoint = Checkpoint;

  // ------------------------------------------------------------------ the loadout screen (at a rest)
  class LoadoutMenu {
    constructor(G, station) {
      this.G = G; this.pause = true; this.t = 0; this.sel = 0; this.noteT = 0;
      this.atDesk = !!(station && station.d.desk);
      A.sfx.page();
    }
    rows() {
      const S = this.G.S, out = [];
      for (const id of ORDER) {
        if (L.owned(S, id)) out.push({ id, owned: true });
        else if (this.atDesk && NOTES[id].price) out.push({ id, owned: false });
      }
      return out;
    }
    say(t) { this.note = t; this.noteT = 2.6; }
    choose(r) {
      const G = this.G, S = G.S, n = NOTES[r.id];
      if (!r.owned) {
        if (!LD.Ink.canAfford(S, n.price)) { A.sfx.uiNo(); this.say("Quillon wants " + n.price + " ink for that. You have " + Math.floor(S.ink) + "."); return; }
        LD.Ink.spend(S, n.price); L.state(S).owned.push(r.id);
        A.sfx.inkSpend(); A.sfx.uiOk();
        if (L.used(S) + n.cost <= L.notches(S)) L.toggle(S, r.id);
        this.say("Quillon copies " + n.name + " into your margin.");
        G.saveGame(); return;
      }
      const res = L.toggle(S, r.id);
      if (res === "full") { A.sfx.uiNo(); this.say("Not enough notches — take something off first."); return; }
      A.sfx[res === "on" ? "uiOk" : "page"]();
      G.saveGame();
    }
    update(dt, G) {
      this.t += dt; this.noteT = Math.max(0, this.noteT - dt);
      const rows = this.rows();
      if (I.pressed("back") || I.pressed("pause")) { A.sfx.page(); G.saveGame(); return false; }
      if (!rows.length) { if (I.pressed("confirm")) return false; return true; }
      if (I.pressed("mUp")) { this.sel = (this.sel + rows.length - 1) % rows.length; A.sfx.ui(); }
      if (I.pressed("mDown")) { this.sel = (this.sel + 1) % rows.length; A.sfx.ui(); }
      this.sel = Math.min(this.sel, rows.length - 1);
      const m = I.mouse;
      rows.forEach((r, i) => { const y = 212 + i * 34; if (m.x > 110 && m.x < 610 && m.y > y - 24 && m.y < y + 8) { if (m.inside) this.sel = i; if (m.pressed) this.choose(r); } });
      if (I.pressed("confirm")) this.choose(rows[this.sel]);
      return true;
    }
    draw(ctx, G) {
      const S = G.S, K = LD.UIKit, k = U.easeOut(Math.min(1, this.t * 4));
      ctx.save(); K.book(ctx, k, 611, 612);
      K.heading(ctx, "Margin Notes", 360, 118, 34);
      // notch meter
      const tot = L.notches(S), used = L.used(S);
      Art.text(ctx, "notches", 150, 172, 17, { color: "#6b5a44" });
      for (let i = 0; i < tot; i++) {
        const nx = 222 + i * 26;
        ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(nx, 166, 8, 0, 7); ctx.stroke();
        if (i < used) { ctx.fillStyle = "#7a1f16"; ctx.beginPath(); ctx.arc(nx, 166, 5.5, 0, 7); ctx.fill(); }
      }
      Art.text(ctx, used + " / " + tot, 560, 172, 18, { align: "right", color: "#3a2a1e" });
      const rows = this.rows();
      if (!rows.length) Art.richText(ctx, "No margin notes yet. They're found in hidden corners of the borough, won from its Keepers — and Quillon sells a few at the Bindery desk.", 130, 230, 20, 450, { color: "#5a4a3a" });
      rows.forEach((r, i) => {
        const y = 212 + i * 34, n = NOTES[r.id], sel = i === this.sel, worn = L.has(S, r.id);
        if (sel) { ctx.fillStyle = "rgba(122,31,22,0.08)"; ctx.fillRect(118, y - 24, 484, 32); }
        L.icon(ctx, n.icon, 142, y - 8, 0.95, r.owned ? "#2a1a10" : "#8a7a64");
        Art.text(ctx, n.name, 166, y, 21, { color: sel ? "#7a1f16" : r.owned ? "#2a1a10" : "#8a7a64" });
        for (let c = 0; c < n.cost; c++) { ctx.fillStyle = r.owned ? "#2a1a10" : "#8a7a64"; ctx.beginPath(); ctx.arc(390 + c * 12, y - 7, 3.5, 0, 7); ctx.fill(); }
        if (!r.owned) Art.text(ctx, "buy · " + n.price + " ink", 590, y, 18, { align: "right", color: LD.Ink.canAfford(S, n.price) ? "#1c2f55" : "#8a7a64" });
        else {
          Art.sketch(ctx, [560, y - 18, 576, y - 19, 577, y - 2, 561, y - 1], 1.6, "#3a2a1e", i * 3, 0.7, true, 2);
          if (worn) { ctx.fillStyle = "#7a1f16"; Art.brush(ctx, [562, y - 10, 567, y - 4, 580, y - 22], 3.4, { seed: i }); }
        }
      });
      // right page: the selected note, and the weapon loadout
      const r = rows[this.sel];
      if (r) {
        const n = NOTES[r.id];
        L.icon(ctx, n.icon, 920, 150, 2.6, "#7a1f16");
        Art.text(ctx, n.name, 920, 214, 30, { align: "center", font: "title", color: "#4a2418" });
        Art.richText(ctx, n.desc, 720, 252, 21, 400, { color: "#2a1a10" });
        Art.text(ctx, "costs " + n.cost + " notch" + (n.cost > 1 ? "es" : "") + (r.owned ? "" : "  ·  sold by Quillon"), 920, 340, 17, { align: "center", color: "#6b5a44" });
      }
      K.divider(ctx, 920, 372, 380, "rgba(74,36,24,0.6)", 5);
      Art.text(ctx, "Loadout", 920, 406, 26, { align: "center", font: "title", color: "#4a2418" });
      const slot = (w, x, label) => {
        ctx.strokeStyle = "rgba(60,40,25,0.5)"; ctx.lineWidth = 1.2; ctx.strokeRect(x - 105, 426, 210, 110);
        Art.text(ctx, label, x, 446, 15, { align: "center", color: "#6b5a44" });
        if (!w) { Art.text(ctx, "— empty —", x, 494, 19, { align: "center", color: "#8a7a64" }); return; }
        ctx.save(); ctx.translate(x - 80, 478); ctx.rotate(-0.15);
        LD.drawWeaponStrokes(ctx, w.strokes || [[0, 0, 0.5, 0.01, 0.8, 0], [0.8, -0.06, 1, 0, 0.8, 0.06]], 150, w.element, Art.boil, w.cls === "nib");
        ctx.restore();
        Art.text(ctx, D.weapons[w.cls].name + (w.element && w.element !== "none" ? " · " + LD.Elements.name(w.element) : ""), x, 526, 18, { align: "center", color: "#2a1a10" });
      };
      slot(S.weapon, 805, "in hand"); slot(S.spare, 1035, "in reserve");
      Art.richText(ctx, "Draw a new weapon and your old one is kept in reserve. Swap with [" + I.label("swap") + "] at any time — swapping out of a swing makes the next blow a switch strike.", 700, 566, 17, 440, { color: "#5a4a3a" });
      if (this.noteT > 0) Art.text(ctx, this.note, 360, 620, 18, { align: "center", color: "#7a1f16", alpha: Math.min(1, this.noteT) });
      ctx.restore();
    }
  }
  L.Menu = LoadoutMenu;
})();
