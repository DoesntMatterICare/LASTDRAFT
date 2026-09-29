// CombatSystem: resolves hits between the player's drawn weapon and corrupted
// illustrations, applying the element wheel, stagger (poise), knockback and hit-stop.
(function () {
  const LD = window.LD;
  const U = LD.U;
  const Art = LD.Art;
  const P = LD.Particles;

  const C = (LD.Combat = {});

  // A crisp ink slash left across whatever was struck: white core, element-coloured edge.
  class SlashFx {
    constructor(x, y, dir, heavy, color) {
      this.x = x; this.y = y; this.t = 0; this.dur = heavy ? 0.18 : 0.13;
      this.a = (dir >= 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.1;
      this.L = heavy ? 88 : 62; this.wd = heavy ? 11 : 7; this.color = color;
    }
    update(dt) { this.t += dt; return this.t < this.dur; }
    draw(ctx) {
      const k = this.t / this.dur, L = this.L * (0.6 + 0.4 * Math.min(1, k * 4));
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.a); ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = this.color;
      Art.brush(ctx, [-L, 1, 0, -2, L, 1], this.wd * (1 - k * 0.5) + 3, { seed: 5, jitter: 0, taperStart: 0.5, taperEnd: 0.5 });
      ctx.fillStyle = "#fffaf0";
      Art.brush(ctx, [-L * 0.9, 0, 0, -2, L * 0.9, 0], this.wd * (1 - k * 0.6), { seed: 6, jitter: 0, taperStart: 0.5, taperEnd: 0.5 });
      ctx.restore();
    }
  }
  C.SlashFx = SlashFx;

  // Player weapon -> enemy
  C.hitEnemy = (G, e, atk) => {
    if (e.dead || e.invuln > 0) return false;
    const m = LD.Elements.mult(atk.element, e.element);
    const CR = LD.Data.crit;
    // a reeling foe takes critical hits; the counter right after a parry is a riposte
    const reeling = (e.state === "stagger" || e.state === "stun") && !atk.noCrit;
    const riposte = !!atk.riposte;
    let dmg = atk.dmg * m.dmg * (G.settings.damageAssist ? 1.35 : 1) * (riposte ? CR.riposteMult : reeling ? CR.mult : 1);
    let stagger = atk.stagger * m.stagger + (riposte ? CR.riposteStagger : 0);
    const res = e.takeHit ? e.takeHit(G, { dmg, stagger, knock: atk.knock, dir: atk.dir, heavy: atk.heavy, breaksGuard: atk.breaksGuard, rel: m.rel, fromY: atk.fromY }) : "hit";
    if (res === "blocked") {
      LD.Audio.sfx.block();
      P.burst(e.cx(), e.cy(), 6, "scrap", { min: 80, max: 200, p: { color: "#e6d8bb", g: 500 } });
      G.hitstop = Math.max(G.hitstop, 0.05);
      return "blocked";
    }
    LD.Audio.sfx.hit(atk.heavy);
    const FG = LD.Data.flow.gain, pl = G.player;
    if (pl && !atk.noFlow) pl.gainFlow(G, (atk.heavy ? FG.heavyHit : FG.hit) + (m.rel === "strong" ? FG.strong : 0) + (reeling || riposte ? FG.crit : 0) + (atk.charged ? FG.charged : 0));
    if (riposte || reeling) {
      LD.Audio.sfx.strong();
      P.add({ kind: "text", x: e.cx(), y: e.y - 34, vy: -60, g: 0, text: riposte ? "✶ riposte" : "✶ critical", size: 24, life: 0.9, color: "#7a1f16", front: true });
      G.hitstop = Math.max(G.hitstop, 0.11);
      if (LD.Cinema) LD.Cinema.punch(0.03);
    }
    const col = atk.element === "water" ? Art.WATER : Art.INK;
    P.inkHit(e.cx(), e.cy(), atk.dir, col, atk.heavy || m.rel === "strong");
    if (atk.element === "water") P.burst(e.cx(), e.cy(), 6, "water", { angle: atk.dir > 0 ? 0 : Math.PI, spread: 1, min: 100, max: 300, p: { color: "#7ab4e8" } });
    if (m.rel === "strong") {
      LD.Audio.sfx.strong();
      P.add({ kind: "text", x: e.cx(), y: e.y - 14, vy: -50, g: 0, text: "✶ strong", size: 24, life: 0.9, color: "#1c3f73", front: true });
    } else if (m.rel === "resist") {
      LD.Audio.sfx.weak();
      P.add({ kind: "text", x: e.cx(), y: e.y - 14, vy: -50, g: 0, text: "◌ resisted", size: 22, life: 0.9, color: "#5a4a3a", front: true });
    }
    G.hitstop = Math.max(G.hitstop, atk.hitstop || 0.05);
    LD.Camera.shake(atk.heavy ? 0.28 : 0.12);
    LD.World.effects.push(new SlashFx(e.cx(), e.cy() - 4, atk.dir, atk.heavy, col));
    LD.Input.rumble(atk.heavy ? 0.45 : 0.2, atk.heavy ? 110 : 60);
    if (e.dead && !e.isBoss && pl && !atk.noFlow) pl.gainFlow(G, FG.kill);
    if (e.dead && !e.isBoss && LD.Loadout.mods.inkOnKill) LD.Ink.add(G.S, LD.Loadout.mods.inkOnKill, e.cx(), e.y);
    if (e.dead && !e.isBoss) {
      // a kill lands a touch heavier than a hit
      G.hitstop = Math.max(G.hitstop, 0.1);
      G.slowMo(0.5, 0.12);
      LD.Audio.sfx.kill();
      if (LD.Cinema) LD.Cinema.punch(0.025);
    }
    return "hit";
  };

  // Water puts out fire: any burning patch the blow touches is doused in a puff of steam.
  C.douse = (G, box) => {
    let n = 0;
    for (const ef of LD.World.effects) {
      if (!(ef instanceof LD.FirePatch) || ef.t >= ef.warn + ef.dur) continue;
      const fb = { x: ef.x - ef.w / 2, y: ef.y - ef.h, w: ef.w, h: ef.h };
      if (!U.overlap(box, fb)) continue;
      ef.t = ef.warn + ef.dur; ef.doused = true; n++;
      P.burst(ef.x, ef.y - 10, 16, "mote", { angle: -Math.PI / 2, spread: 1.2, min: 40, max: 160, p: { color: "rgba(235,240,245,0.8)", g: -60, size: 5, life: 1 } });
    }
    if (n) { LD.Audio.sfx.splash(); if (!G.S.flags.hintDouse) { G.S.flags.hintDouse = true; LD.HUD.thought("Water drowns the fire — the burning floor hisses out."); } }
    return n;
  };

  // Strike every enemy inside a box (charged strikes, Ink Arts). `hitSet` stops double hits
  // within one move; `o.bat` also knocks hostile shots out of the air.
  C.strikeBox = (G, box, atk, hitSet, o = {}) => {
    let n = 0;
    if (atk.element === "water") C.douse(G, box);
    for (const e of LD.World.enemies) {
      if (e.dead || hitSet.has(e) || !e.hitbox) continue;
      const hb = e.hitbox();
      if (!hb || !U.overlap(box, hb)) continue;
      hitSet.add(e);
      const a = Object.assign({}, atk);
      if (!a.dir) a.dir = Math.sign(e.cx() - (box.x + box.w / 2)) || 1;
      if (C.hitEnemy(G, e, a) === "hit") n++;
    }
    if (o.bat) for (const pr of LD.World.projectiles) if (!pr.dead && pr.hostile && U.overlap(box, pr.box())) { pr.dead = true; P.inkHit(pr.x, pr.y, 1, Art.INK); }
    if (o.walls) {
      const W = LD.World, hitB = W.rectTouches(box, "B");
      if (hitB.length) { const [tx, ty] = hitB[0]; const grp = W.room.breaks.find((b) => tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h); if (grp) G.breakWall(grp); }
    }
    return n;
  };

  // Friendly moving hitboxes: the Heavy Tool's floor waves and the Bare Nib's thrown blot.
  class InkShot {
    constructor(x, y, vx, vy, atk, o = {}) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.atk = atk; this.t = 0;
      this.life = o.life || 1; this.w = o.w || 26; this.h = o.h || 26; this.floor = !!o.floor; this.g = o.g || 0;
      this.hit = new Set(); this.color = o.color || Art.INK;
    }
    box() { return this.floor ? { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h } : { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
    update(dt, G) {
      this.t += dt; this.vy += this.g * dt; this.x += this.vx * dt; this.y += this.vy * dt;
      const W = LD.World;
      if (this.floor) {
        if (!W.groundAt(this.x, this.y + 4) || W.pointSolid(this.x + Math.sign(this.vx) * 14, this.y - 10)) return false;
        if (Math.random() < 0.7) P.add({ kind: "ink", x: this.x, y: this.y - 4, vx: -this.vx * 0.1, vy: -U.rand(60, 180), g: 700, color: this.color, size: U.rand(2, 4), life: 0.5 });
      } else if (W.pointSolid(this.x, this.y)) { P.inkHit(this.x, this.y, Math.sign(this.vx), this.color, true); return false; }
      const n = C.strikeBox(G, this.box(), this.atk, this.hit, { bat: !this.floor });
      if (n && !this.floor) { P.inkHit(this.x, this.y, Math.sign(this.vx), this.color, true); return false; }
      return this.t < this.life;
    }
    draw(ctx) {
      const b = this.box();
      ctx.save(); ctx.fillStyle = this.color;
      if (this.floor) {
        const k = 1 - this.t / this.life;
        Art.brush(ctx, [b.x, b.y + b.h, b.x + b.w * 0.35, b.y + b.h * 0.2, b.x + b.w * 0.7, b.y + b.h * 0.5, b.x + b.w, b.y + b.h], 10 * k + 4, { seed: Art.boil, taperStart: 0.3, taperEnd: 0.3 });
      } else {
        Art.blobPath(ctx, this.x, this.y, 11, 9, Art.boil, 12, 0.35); ctx.fill();
        ctx.globalAlpha = 0.5; Art.brush(ctx, [this.x - this.vx * 0.05, this.y, this.x, this.y], 8, { seed: 3 });
      }
      ctx.restore();
    }
  }
  C.InkShot = InkShot;

  // Anything -> player
  C.hurtPlayer = (G, dmg, srcX, o = {}) => G.player.hurt(G, dmg, srcX, o);

  // A telegraphed attack hitbox owned by an enemy
  C.enemyStrike = (G, box, dmg, srcX, o) => {
    const p = G.player;
    if (!p || p.dead) return false;
    if (U.overlap(box, p.hurtbox())) return C.hurtPlayer(G, dmg, srcX, o);
    return false;
  };
})();
