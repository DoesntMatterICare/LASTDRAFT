// Safe-station menu: rest (heal + save), redraw weapon, infuse pigment, inspect weapon,
// view the map. Presented as an open book.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, I = LD.Input, A = LD.Audio;

  class StationMenu {
    constructor(G, station) {
      this.G = G; this.station = station; this.pause = true; this.t = 0; this.sel = 0; this.view = "card";
      this.items = [
        { id: "redraw", label: () => (station.d.desk ? "Draw a weapon" : "Redraw weapon") },
        { id: "loadout", label: () => "Margin notes & loadout" + (station.d.desk ? "  ·  shop" : "") },
        { id: "pigment", label: () => "Infuse pigment:  " + LD.Elements.name(G.S.weapon.element) },
        { id: "inspect", label: () => (this.view === "card" ? "Inspect the element wheel" : "Inspect weapon") },
        { id: "map", label: () => "View map" },
        { id: "leave", label: () => "Rise and leave" },
      ];
      A.sfx.page();
    }
    choose(id) {
      const G = this.G, S = G.S;
      if (id === "loadout") { A.sfx.uiOk(); G.pushOverlay(new LD.Loadout.Menu(G, this.station)); return; }
      if (id === "redraw") {
        if (!this.station.d.desk) { A.sfx.uiNo(); this.note = "Only the Bindery desk has ink and paper enough to draw a weapon."; this.noteT = 3; return; }
        A.sfx.uiOk();
        G.pushOverlay(new LD.DrawDesk(G, this.station, (GG, formed) => { if (formed) { this.done = true; GG.onWeaponFormed(); } }));
      } else if (id === "pigment") {
        const av = LD.Elements.available(S);
        if (av.length < 2) { A.sfx.uiNo(); this.note = "No pigments recovered yet. The borough's blue is missing."; this.noteT = 3; return; }
        const i = av.indexOf(S.weapon.element || "none");
        S.weapon.element = av[(i + 1) % av.length];
        A.sfx.splash();
        this.note = S.weapon.element === "none" ? "The weapon returns to plain ink." : "The weapon drinks the " + LD.Elements.name(S.weapon.element) + " pigment. (Free to change at any rest.)";
        this.noteT = 3;
        G.saveGame();
      } else if (id === "inspect") { this.view = this.view === "card" ? "wheel" : "card"; A.sfx.page(); }
      else if (id === "map") { A.sfx.page(); G.pushOverlay(new LD.MapView(G)); }
      else if (id === "leave") { this.done = true; A.sfx.page(); }
    }
    update(dt, G) {
      this.t += dt;
      this.noteT = Math.max(0, (this.noteT || 0) - dt);
      if (this.done) return false;
      if (I.pressed("mUp")) { this.sel = (this.sel + this.items.length - 1) % this.items.length; A.sfx.ui(); }
      if (I.pressed("mDown")) { this.sel = (this.sel + 1) % this.items.length; A.sfx.ui(); }
      const m = I.mouse;
      this.items.forEach((it, i) => {
        const y = 210 + i * 56;
        if (m.x > 700 && m.x < 1120 && m.y > y - 34 && m.y < y + 16) { if (this.sel !== i && (m.pressed || m.inside)) this.sel = i; if (m.pressed) this.choose(it.id); }
      });
      if (I.pressed("confirm")) this.choose(this.items[this.sel].id);
      else if (I.pressed("back") || I.pressed("pause")) { this.done = true; A.sfx.page(); }
      return true;
    }
    draw(ctx, G) {
      const S = G.S, k = U.easeOut(Math.min(1, this.t * 4));
      ctx.save();
      ctx.fillStyle = "rgba(8,5,4," + 0.66 * k + ")"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
      ctx.globalAlpha = k;
      ctx.translate(0, (1 - k) * 50);
      ctx.drawImage(LD.UIKit.cover(), 0, 0);
      ctx.drawImage(Art.parchment(560, 600, 201), 80, 60);
      ctx.drawImage(Art.parchment(560, 600, 202), 640, 60);
      ctx.drawImage(LD.UIKit.pageDeco(), 0, 0);

      if (this.view === "card") this.drawCard(ctx, G); else this.drawWheel(ctx, G);

      LD.UIKit.heading(ctx, this.station.d.desk ? "The Bindery Desk" : "A Standing Bookmark", 900, 126, 32);
      Art.text(ctx, "Rested. Health restored. The page remembers you here.", 900, 170, 18, { align: "center", color: "#5a4a3a" });
      this.items.forEach((it, i) => {
        const y = 210 + i * 56, sel = i === this.sel;
        ctx.font = "30px " + Art.HAND;
        if (sel) LD.UIKit.selector(ctx, 750, y, ctx.measureText(it.label()).width, 30, "#7a1f16", G.time, i * 11 + 3, "left");
        else { ctx.fillStyle = "rgba(74,36,24,0.45)"; ctx.beginPath(); ctx.arc(734, y - 9, 2.2, 0, 7); ctx.fill(); }
        Art.text(ctx, it.label(), 750, y, 30, { color: sel ? "#7a1f16" : "#2a1a10" });
      });
      if (this.noteT > 0) Art.text(ctx, this.note, 900, 540, 19, { align: "center", color: "#7a1f16", alpha: Math.min(1, this.noteT) });
      Art.text(ctx, "Ink " + Math.floor(S.ink) + " / " + D.ink.max + "   ·   Health " + Math.round(S.hp) + " / " + D.player.maxHp, 900, 600, 20, { align: "center", color: "#3a2a1e" });
      ctx.restore();
    }
    drawCard(ctx, G) {
      const S = G.S, wd = D.weapons[S.weapon.cls];
      LD.UIKit.heading(ctx, "Your weapon", 360, 126, 32);
      ctx.save(); ctx.translate(360 - 130, 230); ctx.rotate(-0.25);
      LD.drawWeaponStrokes(ctx, S.weapon.strokes || [[0, 0, 0.5, 0.01, 0.8, 0], [0.8, -0.06, 1, 0, 0.8, 0.06]], 260, S.weapon.element, Art.boil, S.weapon.cls === "nib");
      ctx.restore();
      Art.text(ctx, wd.name + (S.weapon.element !== "none" ? "  ·  " + LD.Elements.name(S.weapon.element) : ""), 360, 330, 30, { align: "center", font: "title", color: "#2a1a10" });
      Art.text(ctx, wd.desc, 360, 360, 19, { align: "center", color: "#5a4a3a" });
      const stats = [
        ["Speed", 1 - (wd.windup + wd.recovery) / 0.9],
        ["Reach", wd.reach / 130],
        ["Impact", wd.dmg / 32],
        ["Stagger", wd.stagger / 40],
      ];
      stats.forEach(([n, v], i) => {
        const y = 400 + i * 36;
        Art.text(ctx, n, 150, y + 12, 22, { color: "#3a2a1e" });
        ctx.strokeStyle = "rgba(60,40,25,0.5)"; ctx.lineWidth = 1.2; ctx.strokeRect(250, y, 300, 14);
        Art.hatch(ctx, 250, y, 300 * U.clamp(v, 0.05, 1), 14, 4, 0.8, "#3a2a1e", 0.9, 1.6, i);
      });
      Art.text(ctx, "Drawn " + S.redraws + " time" + (S.redraws === 1 ? "" : "s") + " · " + S.inkSpent + " ink spent on creation", 360, 570, 17, { align: "center", color: "#6b5a44" });
    }
    drawWheel(ctx, G) {
      Art.text(ctx, "The element wheel", 360, 130, 32, { align: "center", font: "title", color: "#4a2418" });
      const cx = 360, cy = 330, R = 120;
      const order = D.elements.order;
      const have = LD.Elements.available(G.S);
      order.forEach((el, i) => {
        const a = -Math.PI / 2 + (i / order.length) * Math.PI * 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        const known = have.includes(el);
        // arrow to the element it overpowers
        const a2 = -Math.PI / 2 + (((i + 1) % 4) / 4) * Math.PI * 2;
        const x2 = cx + Math.cos(a2) * R, y2 = cy + Math.sin(a2) * R;
        const mx = (x + x2) / 2 * 0.8 + cx * 0.2, my = (y + y2) / 2 * 0.8 + cy * 0.2;
        ctx.strokeStyle = "#5a2a1e"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x + (x2 - x) * 0.22, y + (y2 - y) * 0.22); ctx.quadraticCurveTo(mx, my, x + (x2 - x) * 0.78, y + (y2 - y) * 0.78); ctx.stroke();
        const ex = x + (x2 - x) * 0.78, ey = y + (y2 - y) * 0.78, ang = Math.atan2(ey - my, ex - mx);
        ctx.fillStyle = "#5a2a1e"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(ang - 0.4) * 12, ey - Math.sin(ang - 0.4) * 12); ctx.lineTo(ex - Math.cos(ang + 0.4) * 12, ey - Math.sin(ang + 0.4) * 12); ctx.fill();
        ctx.fillStyle = "rgba(236,225,201,0.95)"; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill();
        ctx.strokeStyle = Art.INK; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); ctx.globalAlpha *= known ? 1 : 0.35;
        Art.elementGlyph(ctx, el, x, y, 17, known ? (el === "water" ? "#2f6aa8" : Art.INK) : "#5a4a3a");
        ctx.restore();
        Art.text(ctx, known ? LD.Elements.name(el) : LD.Elements.name(el) + " (lost)", x, y + (i === 2 ? 56 : -42), 20, { align: "center", color: "#2a1a10" });
      });
      Art.richText(ctx, "An arrow points at what an element overpowers: bonus damage and faster stagger. Against the element that overpowers it, it is resisted. Enemies wear their element as a small painted sigil.", 130, 520, 19, 460, { color: "#3a2a1e" });
    }
  }
  LD.StationMenu = StationMenu;
})();
