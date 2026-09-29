// Telemetry: a local, private playtest log. Records what hurts you, where you die, how long
// rooms and boss fights take, and how often you parry / close-call — so tuning can be based
// on real sessions. Nothing leaves the browser; F9 opens the report (with a copy button).
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, I = LD.Input;
  const KEY = "livingdraft.telemetry";

  const T = (LD.Telemetry = { d: null, bossRun: null });

  function blank() { return { v: 1, started: Date.now(), playTime: 0, rooms: {}, hurts: {}, deaths: [], bosses: [], counts: {} }; }
  T.load = () => { try { T.d = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { T.d = blank(); } };
  T.save = () => { if (T.muted) return; try { localStorage.setItem(KEY, JSON.stringify(T.d)); } catch (e) {} };
  T.clear = () => { T.d = blank(); T.save(); };
  T.load();

  // Who hit us? The nearest living enemy to the blow's source, plus what it was doing.
  T.cause = (G, srcX, o = {}) => {
    if (o.cause) return o.cause;
    const W = LD.World, p = G.player;
    let best = null, bd = 420;
    for (const e of W.enemies) {
      if (e.dead) continue;
      const d = Math.abs(e.cx() - srcX) + Math.abs(e.cy() - p.cy()) * 0.3;
      if (d < bd) { bd = d; best = e; }
    }
    for (const pr of W.projectiles) if (!pr.dead && Math.abs(pr.x - srcX) < 60) return pr.kind || (pr.constructor && pr.constructor.name !== "Object" ? pr.constructor.name : "projectile");
    for (const ef of W.effects) if (!ef.dead && ef.x != null && Math.abs(ef.x - srcX) < 40 && ef.constructor && ef.constructor.name !== "SlashFx") return ef.constructor.name;
    if (!best) return "unknown";
    const act = best.atk && best.atk.name ? best.atk.name : best.state;
    return best.k + " · " + act;
  };

  T.hurt = (G, dmg, srcX, o) => {
    const c = T.cause(G, srcX, o), h = (T.d.hurts[c] = T.d.hurts[c] || { n: 0, dmg: 0 });
    h.n++; h.dmg += dmg;
    T.lastCause = c;
  };
  T.hazard = (G, kind) => { const c = "hazard · " + (kind === "^" ? "spikes" : kind === "~" ? "ink" : "fire"); const h = (T.d.hurts[c] = T.d.hurts[c] || { n: 0, dmg: 0 }); h.n++; h.dmg += 20; T.lastCause = c; };
  T.death = (G) => {
    const p = G.player;
    T.d.deaths.push({ room: LD.World.room.id, x: Math.round(p.cx() / U.TILE), y: Math.round(p.feet() / U.TILE), cause: T.lastCause || "unknown", at: Math.round(G.S.time) });
    if (T.bossRun) T.bossEnd(G, "death");
    T.save();
  };
  T.count = (k) => { T.d.counts[k] = (T.d.counts[k] || 0) + 1; };
  T.bossStart = (G, boss) => { T.bossRun = { boss: boss.k, t0: G.S.time, hp0: G.S.hp }; };
  T.bossEnd = (G, result) => {
    const r = T.bossRun; if (!r) return;
    const b = G.boss || LD.World.enemies.find((e) => e.isBoss);
    T.d.bosses.push({ boss: r.boss, result, secs: Math.round(G.S.time - r.t0), bossLeft: b ? Math.round((b.hp / b.maxHp) * 100) : 0, hpLeft: Math.round(G.S.hp) });
    T.bossRun = null; T.save();
  };
  let acc = 0;
  T.tick = (G, dt) => {
    const id = LD.World.room && LD.World.room.id;
    if (!id) return;
    T.d.playTime += dt;
    T.d.rooms[id] = (T.d.rooms[id] || 0) + dt;
    acc += dt; if (acc > 10) { acc = 0; T.save(); }
  };

  T.summary = () => {
    const d = T.d, lines = [];
    const hurts = Object.entries(d.hurts).sort((a, b) => b[1].dmg - a[1].dmg);
    lines.push(["Play time", U.fmtTime(d.playTime)]);
    lines.push(["Deaths", d.deaths.length]);
    lines.push(["Parries · close calls", (d.counts.parry || 0) + " · " + (d.counts.closeCall || 0)]);
    return { lines, hurts: hurts.slice(0, 8), deaths: d.deaths.slice(-6).reverse(), bosses: d.bosses.slice(-6).reverse(), rooms: Object.entries(d.rooms).sort((a, b) => b[1] - a[1]).slice(0, 8) };
  };

  // ---------------------------------------------------------------- report overlay (F9)
  class Report {
    constructor() { this.t = 0; this.pause = true; this.copied = 0; }
    update(dt) {
      this.t += dt; this.copied = Math.max(0, this.copied - dt);
      if (this.t > 0.2 && (I.pressed("back") || I.pressed("pause") || I.keyPressed("F9"))) return false;
      if (I.keyPressed("KeyC")) { try { navigator.clipboard.writeText(JSON.stringify(T.d, null, 1)); this.copied = 2; } catch (e) {} }
      if (I.keyPressed("Delete")) { T.clear(); }
      return true;
    }
    draw(ctx) {
      const K = LD.UIKit, s = T.summary();
      ctx.save();
      ctx.fillStyle = "rgba(8,5,4,0.75)"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
      ctx.drawImage(Art.parchment(1100, 640, 4545, { torn: true }), 90, 40);
      K.heading(ctx, "Playtest report", 640, 104, 36);
      Art.text(ctx, "recorded locally while you play · C: copy as JSON · Del: reset · Esc: close", 640, 150, 17, { align: "center", color: "#6b5a44" });
      let y = 196;
      for (const [a, b] of s.lines) { Art.text(ctx, a, 150, y, 21, { color: "#3a2a1e" }); Art.text(ctx, String(b), 480, y, 21, { align: "right", color: "#2a1a10" }); y += 30; }
      y += 10; Art.text(ctx, "What hurts most", 150, y, 24, { font: "title", color: "#4a2418" }); y += 30;
      for (const [c, h] of s.hurts) { Art.text(ctx, c, 150, y, 19, { color: "#3a2a1e" }); Art.text(ctx, h.n + "× · " + Math.round(h.dmg), 480, y, 19, { align: "right", color: "#7a1f16" }); y += 26; }
      let x2 = 560; y = 196;
      Art.text(ctx, "Recent deaths", x2, y, 24, { font: "title", color: "#4a2418" }); y += 30;
      if (!s.deaths.length) { Art.text(ctx, "none yet", x2, y, 19, { color: "#8a7a64" }); y += 26; }
      for (const dd of s.deaths) { Art.text(ctx, dd.room + " (" + dd.x + "," + dd.y + ") — " + dd.cause, x2, y, 18, { color: "#3a2a1e" }); y += 24; }
      y += 12; Art.text(ctx, "Boss attempts", x2, y, 24, { font: "title", color: "#4a2418" }); y += 30;
      if (!s.bosses.length) { Art.text(ctx, "none yet", x2, y, 19, { color: "#8a7a64" }); y += 26; }
      for (const b of s.bosses) { Art.text(ctx, b.boss + " — " + b.result + " in " + b.secs + "s · boss " + b.bossLeft + "% · you " + b.hpLeft + "hp", x2, y, 18, { color: b.result === "win" ? "#2a4a2a" : "#7a1f16" }); y += 24; }
      y += 12; Art.text(ctx, "Time per room", x2, y, 24, { font: "title", color: "#4a2418" }); y += 30;
      Art.text(ctx, s.rooms.map(([r, t]) => r + " " + U.fmtTime(t)).join("   ·   "), x2, y, 17, { color: "#3a2a1e" });
      if (this.copied > 0) Art.text(ctx, "copied to clipboard", 640, 640, 20, { align: "center", color: "#2a4a2a" });
      ctx.restore();
    }
  }
  T.Report = Report;
})();
