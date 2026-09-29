// MapSystem: a manuscript diagram of Looseleaf Borough, sketched in as rooms are visited.
// Adjacent-but-unvisited rooms appear as dotted "glimpses"; locks are drawn as glyphs.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, I = LD.Input, A = LD.Audio;
  const CW = 105, CH = 72, OX = 175, OY = 330;

  const rectOf = (d) => ({ x: OX + d.map.x * CW, y: OY + d.map.y * CH, w: d.map.w * CW, h: d.map.h * CH });
  const tileToMap = (d, tx, ty) => ({ x: OX + d.map.x * CW + (tx / 32) * CW, y: OY + d.map.y * CH + (ty / 18) * CH });

  // Special markers: [roomId, tx, ty, kind, visibleIf(S)]
  const MARKS = [
    ["bindery", 15, 15, "bindery"],
    ["ashway", 33, 14, "station"],
    ["cistern", 16, 15, "hart"],
    ["arena", 28, 15, "boss"],
    ["margin", 3, 12, "veil", (S) => !S.flags.trig_ending],
    ["canals", 87, 4, "veil", (S) => !S.collected.canals_shelf],
    ["gardens", 14, 7, "veil", (S) => !S.collected.gardens_pocket],
    ["bridge", 32, 5, "fold", (S) => !S.collected.bridge_frag],
    ["bridge", 63, 10, "gate", (S) => !S.flags.pigment_water],
    ["gardens", 31, 13, "latch", (S) => !S.flags.ash_door],
    ["streets", 18.5, 16, "grate", (S) => !S.flags.hatch_open],
    ["arena", 44, 15, "fold", (S) => !S.flags.boss_marshal],
  ];

  class MapView {
    constructor(G) { this.G = G; this.t = 0; this.pause = true; A.sfx.page(); }
    update(dt) {
      this.t += dt;
      if (this.t > 0.2 && (I.pressed("map") || I.pressed("back") || I.pressed("pause") || I.pressed("confirm") || I.mouse.pressed)) { A.sfx.page(); return false; }
      return true;
    }
    draw(ctx, G) {
      const S = G.S, k = U.easeOut(Math.min(1, this.t * 4));
      ctx.save();
      ctx.fillStyle = "rgba(8,5,4," + 0.7 * k + ")"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
      ctx.globalAlpha = k;
      ctx.drawImage(Art.parchment(1180, 640, 303, { torn: true }), 50, 40);
      const K = LD.UIKit;
      K.drawFrame(ctx, 62, 52, 1156, 616, { inset: 14, fleurons: false });
      // title cartouche
      ctx.save();
      ctx.strokeStyle = "rgba(74,36,24,0.7)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(96, 78, 420, 90, 14); ctx.stroke();
      ctx.lineWidth = 0.8; ctx.beginPath(); ctx.roundRect(102, 84, 408, 78, 10); ctx.stroke();
      for (const d of [-1, 1]) K.fleuron(ctx, 306 + d * 225, 123, 0.6, "rgba(74,36,24,0.7)");
      ctx.restore();
      Art.text(ctx, "Looseleaf Borough", 116, 124, 44, { font: "title", color: "#4a2418" });
      Art.text(ctx, "sketched from memory — chapter the first", 118, 148, 20, { color: "#6b5a44" });
      K.compass(ctx, 1090, 540, 38);
      // faint survey grid under the rooms
      ctx.save(); ctx.strokeStyle = "rgba(90,70,50,0.08)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = OX - CW; gx <= OX + 7 * CW; gx += CW / 2) { ctx.moveTo(gx, 175); ctx.lineTo(gx, 490); }
      for (let gy = OY - 2 * CH; gy <= OY + 2 * CH; gy += CH / 2) { ctx.moveTo(OX - CW, gy); ctx.lineTo(OX + 7 * CW, gy); }
      ctx.stroke(); ctx.restore();
      const defs = LD.RoomDefs;
      const visited = (id) => S.visited[id];
      const glimpsed = new Set();
      for (const id in defs) {
        if (!visited(id)) continue;
        const r = LD.buildRoom(id, S.flags);
        for (const e of r.exits) if (!visited(e.to)) glimpsed.add(e.to);
        for (const en of r.ents) if (en.t === "door" && !visited(en.to)) glimpsed.add(en.to);
      }
      // rooms
      for (const id in defs) {
        const d = defs[id], R = rectOf(d);
        if (visited(id)) {
          ctx.fillStyle = id === "bindery" ? "rgba(160,110,60,0.25)" : "rgba(90,70,50,0.12)";
          ctx.fillRect(R.x + 3, R.y + 3, R.w - 6, R.h - 6);
          Art.hatch(ctx, R.x + 3, R.y + 3, R.w - 6, R.h - 6, 9, -0.7, "#5a4a3a", 0.25, 1, R.x);
          Art.sketch(ctx, [R.x + 3, R.y + 3, R.x + R.w - 3, R.y + 4, R.x + R.w - 4, R.y + R.h - 3, R.x + 4, R.y + R.h - 4], 2.4, "#2a1a10", R.x + R.y, 1, true, 2);
          Art.text(ctx, d.name, R.x + R.w / 2, R.y + R.h / 2 + 6, d.map.w > 1 ? 18 : 15, { align: "center", color: "#2a1a10" });
        } else if (glimpsed.has(id)) {
          ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = "rgba(60,40,25,0.55)"; ctx.lineWidth = 1.5;
          ctx.strokeRect(R.x + 4, R.y + 4, R.w - 8, R.h - 8); ctx.restore();
          Art.text(ctx, "?", R.x + R.w / 2, R.y + R.h / 2 + 8, 24, { align: "center", color: "rgba(60,40,25,0.55)" });
        }
      }
      // connections between visited rooms
      ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 3;
      for (const id in defs) {
        if (!visited(id)) continue;
        const d = defs[id];
        const r = LD.buildRoom(id, S.flags);
        for (const e of r.exits) {
          if (!visited(e.to) && !glimpsed.has(e.to)) continue;
          let tx, ty;
          if (e.side === "L") { tx = 0; ty = (e.a + e.b) / 2; } else if (e.side === "R") { tx = d.w; ty = (e.a + e.b) / 2; }
          else if (e.side === "T") { tx = (e.a + e.b) / 2; ty = 0; } else { tx = (e.a + e.b) / 2; ty = d.h; }
          const p = tileToMap(d, tx, ty);
          ctx.beginPath();
          if (e.side === "L" || e.side === "R") { ctx.moveTo(p.x - 6, p.y); ctx.lineTo(p.x + 6, p.y); }
          else { ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x, p.y + 6); }
          ctx.stroke();
        }
      }
      if (visited("bindery") || visited("streets")) {
        const p = tileToMap(defs.streets, 10, 12), q = rectOf(defs.bindery);
        ctx.save(); ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, q.y + q.h - 4); ctx.stroke(); ctx.restore();
      }
      // markers
      for (const [id, tx, ty, kind, vis] of MARKS) {
        if (!visited(id) || (vis && !vis(S))) continue;
        const p = tileToMap(defs[id], tx, ty);
        this.icon(ctx, kind, p.x, p.y, S);
      }
      // you are here
      const cur = defs[G.world.room.id], pp = G.player;
      const here = tileToMap(cur, pp.cx() / U.TILE, pp.feet() / U.TILE);
      const pulse = 1 + Math.sin(this.t * 5) * 0.15;
      ctx.save(); ctx.translate(here.x, here.y - 6); ctx.scale(pulse, pulse);
      ctx.fillStyle = "#7a1f16"; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 6); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#f1e6cf"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();

      // legend
      const lx = 1010, ly = 150;
      ctx.save(); ctx.strokeStyle = "rgba(74,36,24,0.45)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(lx - 16, ly - 34, 190, 348, 8); ctx.stroke(); ctx.restore();
      Art.text(ctx, "Legend", lx, ly, 26, { font: "title", color: "#4a2418" });
      const leg = [["here", "You are here"], ["bindery", "The Bindery"], ["station", "Safe station"], ["boss", "Keeper"], ["hart", "Guardian"], ["gate", "Locked gate"], ["veil", "Creased veil"], ["fold", "Out of reach"], ["latch", "Latched door"], ["grate", "Rusted grate"]];
      leg.forEach(([k2, label], i) => {
        const y = ly + 34 + i * 30;
        if (k2 === "here") { ctx.fillStyle = "#7a1f16"; ctx.beginPath(); ctx.moveTo(lx + 10, y - 16); ctx.lineTo(lx + 18, y); ctx.lineTo(lx + 2, y); ctx.fill(); }
        else this.icon(ctx, k2, lx + 10, y - 6, S);
        Art.text(ctx, label, lx + 30, y, 19, { color: "#2a1a10" });
      });
      Art.text(ctx, "Current aim: " + LD.Quest.current(S), 110, 640, 22, { color: "#4a2418" });
      const sec = LD.countSecrets(S);
      Art.text(ctx, "Ink found " + sec.found + "/" + sec.total + "   ·   Fragments read " + sec.lore + "/" + sec.loreTotal, 1160, 640, 18, { align: "right", color: "#6b5a44" });
      ctx.restore();
    }
    icon(ctx, kind, x, y, S) {
      ctx.save(); ctx.translate(x, y);
      ctx.strokeStyle = "#2a1a10"; ctx.fillStyle = "#2a1a10"; ctx.lineWidth = 2;
      switch (kind) {
        case "bindery": ctx.fillStyle = "#7a4a22"; ctx.fillRect(-9, -7, 18, 14); ctx.strokeRect(-9, -7, 18, 14); ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke(); break;
        case "station": ctx.fillStyle = "#8e2a22"; ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(5, -10); ctx.lineTo(5, 9); ctx.lineTo(0, 4); ctx.lineTo(-5, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
        case "boss": Art.elementGlyph(ctx, "fire", 0, 0, 10, S.flags.boss_marshal ? "rgba(42,26,16,0.35)" : "#b8431f"); if (S.flags.boss_marshal) { ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.stroke(); } break;
        case "hart": for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(s * 6, -6); ctx.lineTo(s * 10, -2); ctx.moveTo(s * 6, -6); ctx.lineTo(s * 4, -11); ctx.stroke(); } if (S.flags.boss_hart) { ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.stroke(); } break;
        case "gate": for (let i = -1; i <= 1; i++) ctx.fillRect(i * 5 - 1, -9, 2.5, 18); ctx.fillRect(-8, -3, 16, 2.5); break;
        case "veil": ctx.fillStyle = "rgba(236,225,201,0.9)"; ctx.fillRect(-7, -9, 14, 18); ctx.strokeRect(-7, -9, 14, 18); ctx.fillStyle = "#2a1a10"; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(1, -9); ctx.lineTo(-7, -1); ctx.fill(); break;
        case "fold": ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-2, -4); ctx.lineTo(2, 2); ctx.lineTo(9, -6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(9, -6); ctx.lineTo(4, -6); ctx.moveTo(9, -6); ctx.lineTo(9, -1); ctx.stroke(); break;
        case "latch": ctx.beginPath(); ctx.arc(0, -3, 4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, 9); ctx.lineTo(3, 0); ctx.fill(); break;
        case "grate": ctx.strokeRect(-8, -6, 16, 12); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 4, -6); ctx.lineTo(i * 4, 6); ctx.stroke(); } break;
      }
      ctx.restore();
    }
  }
  LD.MapView = MapView;
})();
