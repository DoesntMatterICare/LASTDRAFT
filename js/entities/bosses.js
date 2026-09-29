// BossSystem: the Faded Hart (mini-boss, guards the Water Pigment) and the Soot Marshal
// (Fire Keeper, three phases that burn and collapse the arena around the player).
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, P = LD.Particles, W = LD.World;
  const T = U.TILE;

  // Temporarily seal an exit with an ink wall (tiles become solid, drawn by the boss).
  function seal(tiles) { for (const [x, y] of tiles) W.temp.set(x + "," + y, "#"); }
  function unseal(tiles) { for (const [x, y] of tiles) W.temp.delete(x + "," + y); }
  function drawSeal(ctx, tiles, t, k = 1) {
    for (const [x, y] of tiles) {
      const px = x * T, py = y * T;
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = "#0f0b09";
      Art.blobPath(ctx, px + T / 2, py + T / 2, T * 0.62, T * 0.62, x * 7 + y * 3 + Math.floor(t * 8), 10, 0.3); ctx.fill();
      ctx.restore();
      if (Math.random() < 0.05) P.add({ kind: "ink", x: px + U.rand(0, T), y: py + T, vy: 30, g: 400, color: Art.INK, size: 2, life: 0.6 });
    }
  }

  // ================================================================ THE FADED HART
  class Hart extends LD.Enemy {
    constructor(x, y) {
      const d = D.bosses.hart;
      super("hart", x, y, Object.assign({ weight: 6, poise: d.poise, contact: false, staggerTime: 1.2 }, d));
      this.isBoss = true; this.name = d.name; this.title = d.title;
      this.setState("dormant"); this.facing = -1; this.sealTiles = [[0, 11], [0, 12], [0, 13], [0, 14]];
      this.charges = 0; this.appear = 0;
    }
    hitbox() { return this.dead || this.state === "dormant" ? null : { x: this.x + 10, y: this.y + 10, w: this.w - 20, h: this.h - 10 }; }
    telegraphing() { return /Wind$/.test(this.state); }
    phase2() { return this.hp < this.maxHp * 0.5; }
    tempo() { return this.phase2() ? 0.78 : 1; }

    startFight(G) {
      this.setState("wake");
      seal(this.sealTiles);
      G.runHartIntro(this);
    }

    ai(dt, G) {
      const { dx } = this.toPlayer(G), p = G.player;
      const dist = Math.abs(dx);
      switch (this.state) {
        case "dormant":
          if (p.cx() > 7 * T && !p.dead) this.startFight(G);
          return;
        case "wake":
          this.appear = Math.min(1, this.stateT / 1.6);
          if (this.stateT > 2.9) this.setState("idle");
          return;
        case "erase":
          // the erasure spreads: it stands flickering, untouchable, then comes back faster
          this.vx = U.approach(this.vx, 0, 1200 * dt);
          if (Math.random() < 0.5) P.add({ kind: "scrap", x: this.x + U.rand(0, this.w), y: this.y + U.rand(0, this.h), vx: U.rand(-60, 60), vy: -U.rand(20, 90), g: -20, color: "#ece4d2", size: 4, life: 1 });
          if (this.stateT > 1.3) this.setState("idle");
          return;
        case "sprayWind":
          this.facing = Math.sign(dx) || this.facing;
          this.vx = U.approach(this.vx, 0, 1200 * dt);
          if (this.stateT > D.bosses.hart.spray.wind * this.tempo()) {
            const S2 = D.bosses.hart.spray;
            for (let i = 0; i < S2.drops; i++) {
              const vx = this.facing * U.lerp(170, 560, i / (S2.drops - 1)) + U.rand(-30, 30), vy = -U.rand(380, 560);
              W.projectiles.push(new LD.Projectile(this.cx() + this.facing * 60, this.y + 10, vx, vy, { dmg: S2.dmg, g: 1100, kind: "ink", r: 9, cause: "hart · ink spray" }));
            }
            LD.Audio.sfx.splash(); LD.Audio.sfx.hart();
            this.setState("land");
          }
          return;
        case "idle": {
          this.facing = Math.sign(dx) || this.facing;
          this.vx = U.approach(this.vx, 0, 900 * dt);
          if (this.stateT < 0.45 * this.tempo()) return;
          if (this.phase2() && Math.random() < D.bosses.hart.spray.chance && dist > 120) { this.setState("sprayWind"); LD.Audio.sfx.stomp(); return; }
          const r = Math.random();
          if (dist > 280) this.setState(r < 0.6 ? "chargeWind" : "leapWind");
          else if (dist < 200) this.setState(r < 0.6 ? "sweepWind" : r < 0.8 ? "leapWind" : "chargeWind");
          else this.setState(r < 0.5 ? "leapWind" : "chargeWind");
          if (this.state === "chargeWind") this.charges = this.phase2() ? 2 : 1;
          LD.Audio.sfx.stomp();
          return;
        }
        case "chargeWind":
          this.facing = Math.sign(dx) || this.facing;
          if (this.stateT > 0.8 * this.tempo()) {
            this.setState("charge"); LD.Audio.sfx.hart();
            // erased echoes follow the same line a beat later
            if (this.phase2()) {
              const E = D.bosses.hart.echo, n = this.hp < this.maxHp * E.second ? 2 : 1;
              for (let i = 1; i <= n; i++) W.projectiles.push(new EchoHart(this, this.x, this.facing, E.delay * i));
            }
          }
          if (Math.random() < 0.3) P.add({ kind: "dust", x: this.cx() - this.facing * 40, y: this.y + this.h, vx: -this.facing * 100, vy: -40, g: 100, color: "rgba(160,170,180,0.6)", size: 4, life: 0.5 });
          return;
        case "charge":
          this.vx = this.facing * 640;
          LD.Combat.enemyStrike(G, { x: this.x, y: this.y + 20, w: this.w, h: this.h - 20 }, D.bosses.hart.chargeDmg, this.cx());
          if (Math.random() < 0.5) P.add({ kind: "dust", x: this.cx(), y: this.y + this.h, vx: -this.vx * 0.2, vy: -60, g: 100, color: "rgba(160,170,180,0.5)", size: 5, life: 0.5 });
          if (this.hitWall) {
            LD.Camera.shake(0.5); LD.Audio.sfx.stomp();
            P.burst(this.cx() + this.facing * 60, this.cy(), 14, "scrap", { min: 100, max: 300, p: { color: "#e2d4b6", g: 500 } });
            this.charges--;
            if (this.charges > 0) { this.facing *= -1; this.setState("chargeWind"); this.stateT = 0.4; }
            else this.setState("stun");
          }
          return;
        case "stun":
          this.vx = U.approach(this.vx, 0, 2000 * dt);
          if (this.stateT > (this.phase2() ? 1.1 : 1.4)) this.setState("idle");
          return;
        case "sweepWind":
          this.facing = Math.sign(dx) || this.facing;
          if (this.stateT > 0.55 * this.tempo()) { this.setState("sweep"); this.hitDone = false; LD.Audio.sfx.swing(true); this.vx = this.facing * 150; }
          return;
        case "sweep": {
          const box = { x: this.facing > 0 ? this.cx() : this.cx() - 170, y: this.y - 20, w: 170, h: 90 };
          if (!this.hitDone && this.stateT > 0.05 && this.stateT < 0.25 && LD.Combat.enemyStrike(G, box, D.bosses.hart.dmg, this.cx())) this.hitDone = true;
          this.vx = U.approach(this.vx, 0, 900 * dt);
          if (this.stateT > 0.85) this.setState("idle");
          return;
        }
        case "leapWind":
          this.facing = Math.sign(dx) || this.facing;
          this.targetX = U.clamp(p.cx(), 3 * T, (W.w - 3) * T);
          if (this.stateT > 0.55 * this.tempo()) {
            this.setState("leap");
            const tAir = 0.8;
            this.vy = -2000 * tAir / 2;
            this.vx = (this.targetX - this.cx()) / tAir;
          }
          return;
        case "leap":
          if (this.onGround && this.stateT > 0.15) {
            this.vx = 0; this.setState("land");
            LD.Camera.shake(0.55); LD.Audio.sfx.stomp();
            for (const s of [-1, 1]) W.projectiles.push(new Shockwave(this.cx() + s * 50, this.y + this.h, s * D.bosses.hart.waveSpeed, D.bosses.hart.dmg));
            P.burst(this.cx(), this.y + this.h, 16, "dust", { angle: -Math.PI / 2, spread: 1.4, min: 80, max: 260, p: { color: "rgba(150,160,170,0.6)", size: 5, g: 300 } });
          }
          return;
        case "land":
          if (this.stateT > 0.75) this.setState("idle");
          return;
      }
    }
    physics(dt) {
      this.vy = Math.min(1400, this.vy + 2000 * dt);
      W.moveBody(this, dt);
    }
    takeHit(G, h) {
      if (this.state === "dormant" || this.state === "wake" || this.state === "erase") return "blocked";
      const wasP2 = this.phase2();
      const r = super.takeHit(G, h);
      this.vx = 0;
      if (!wasP2 && this.phase2() && !this.dead) {
        this.setState("erase"); this.poise = this.data.poise;
        LD.Audio.sfx.hart(); LD.Audio.sfx.tear();
        G.bossPhaseBeat(this, "236,225,201");
        LD.HUD.bark("", "Its outline tears — erased echoes spill from it.");
      }
      return r;
    }
    die(G) {
      this.dead = true; this.deathT = 0;
      unseal(this.sealTiles);
      G.endBoss(this);
      LD.Audio.sfx.tear();
      P.burst(this.cx(), this.cy(), 40, "scrap", { min: 60, max: 360, lift: 200, p: { color: "#ece2cc", g: 200, life: 2, size: 8 } });
      G.S.flags.boss_hart = true;
      G.onHartDefeated(this);
    }
    update(dt, G) {
      if (this.dead) { this.deathT += dt; return this.deathT < 2; }
      return super.update(dt, G);
    }
    draw(ctx, G) {
      // where the leap will come down: an ink shadow that darkens as it falls
      if ((this.state === "leapWind" || this.state === "leap") && !this.dead && this.targetX != null) {
        const k = this.state === "leapWind" ? 0.3 : 0.4 + 0.6 * U.clamp(this.stateT / 0.8, 0, 1);
        const gy = this.state === "leap" ? this.groundY || (this.y + this.h) : this.y + this.h;
        if (this.state === "leapWind") this.groundY = this.y + this.h;
        ctx.save();
        ctx.fillStyle = "rgba(21,16,13," + 0.35 * k + ")";
        Art.blobPath(ctx, this.targetX, gy - 2, 70 * (1.2 - k * 0.4), 9, 7, 16, 0.2); ctx.fill();
        ctx.strokeStyle = "rgba(156,42,34," + 0.7 * k + ")"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.ellipse(this.targetX, gy - 2, 120, 12, 0, 0, 7); ctx.stroke();
        ctx.restore();
      }
      if (this.state === "dormant" || this.state === "wake" || !this.dead) {
        if (!this.dead && this.state !== "dormant") drawSeal(ctx, this.sealTiles, G.time);
      }
      super.draw(ctx, G);
      if (this.state === "leapWind" || this.state === "leap") {
        // landing marker: an ink ring on the floor where it will land
        ctx.save(); ctx.strokeStyle = "rgba(21,16,13,0.6)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.ellipse(this.targetX, 15 * T - 2, 60, 8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    }
    spriteAlpha() {
      if (this.state === "dormant") return 0.25 + Math.sin(this.t * 1.5) * 0.08;
      if (this.state === "wake") return 0.25 + this.appear * 0.75;
      return this.dead ? Math.max(0, 1 - this.deathT / 2) : 1;
    }
    anim() {
      const st = this.state, t = this.stateT, k = this.tempo();
      switch (st) {
        case "dormant": return { name: "dormant", t: this.t };
        case "wake": case "idle": return { name: "idle", t: this.t };
        case "chargeWind": return { name: "charge_wind", p: t / (0.8 * k) };
        case "charge": return { name: "charge", t };
        case "stun": return { name: "stun", t };
        case "erase": return { name: "stun", t };
        case "sprayWind": return { name: "sweep", p: 0.3 * t / (0.6 * k) };
        case "sweepWind": return { name: "sweep", p: 0.45 * t / (0.55 * k) };
        case "sweep": return { name: "sweep", p: 0.45 + 0.55 * t / 0.85 };
        case "leapWind": return { name: "leap", p: 0.3 * t / (0.55 * k) };
        case "leap": return { name: "leap", p: 0.3 + Math.min(0.7, 0.7 * t / 0.8) };
        case "land": return { name: "land", p: t / 0.75 };
        default: return { name: st, t };
      }
    }
    drawBody(ctx, G) {
      const x = this.cx(), y = this.y + this.h, f = this.facing, b = Art.boil, st = this.state;
      let alpha = 1;
      if (st === "dormant") alpha = 0.25 + Math.sin(this.t * 1.5) * 0.08;
      if (st === "wake") alpha = 0.25 + this.appear * 0.75;
      if (this.dead) alpha = Math.max(0, 1 - this.deathT / 2);
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.translate(x, y); ctx.scale(f, 1);
      const gallop = st === "charge" ? this.t * 18 : st === "idle" ? 0 : 0;
      const crouch = st === "leapWind" ? this.stateT * 20 : st === "land" ? Math.max(0, 12 - this.stateT * 30) : 0;
      const headLow = st === "chargeWind" || st === "charge" ? 1 : st === "sweepWind" ? -0.6 : 0;
      const flick = this.phase2() && Math.floor(this.t * 6) % 5 === 0;
      const bodyY = -60 + crouch;
      // legs
      ctx.fillStyle = Art.INK;
      const legs = [[30, 0], [22, Math.PI], [-30, Math.PI * 0.5], [-38, Math.PI * 1.5]];
      legs.forEach(([lx, ph], i) => {
        const s = Math.sin(gallop + ph) * 0.6;
        const hx = lx, hy = bodyY + 12;
        const kx = hx + Math.sin(s) * 22, ky = hy + 24 - crouch * 0.5;
        const fx2 = kx + Math.sin(s * 1.4 - 0.2) * 20, fy2 = 0;
        const dashed = i === 2 && !flick;
        if (dashed) { ctx.save(); ctx.globalAlpha *= 0.4; }
        Art.brush(ctx, [hx, hy, kx, ky, fx2, fy2], 5, { seed: b + i, taperStart: 0, taperEnd: 0.3 });
        if (dashed) ctx.restore();
      });
      // body: faded paper illustration with pale-blue watercolor ghost
      ctx.fillStyle = "#ece4d2";
      ctx.beginPath(); ctx.ellipse(0, bodyY, 54, 25, -0.05, 0, Math.PI * 2); ctx.fill();
      Art.wash(ctx, -8, bodyY + 4, 40, 16, "#8fb5d6", 0.35, 7);
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, bodyY, 54, 25, -0.05, Math.PI * 0.9, Math.PI * 2.25); ctx.stroke();
      ctx.setLineDash([5, 6]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, bodyY, 54, 25, -0.05, Math.PI * 0.25, Math.PI * 0.9); ctx.stroke();
      ctx.setLineDash([]);
      // eraser smudges: missing chunks of the drawing
      ctx.fillStyle = "rgba(240,234,220,0.95)";
      for (let i = 0; i < (flick ? 5 : 3); i++) {
        const ex = -30 + i * 22 + (U.hash(i + (flick ? b : 0)) - 0.5) * 10, ey = bodyY - 10 + (i % 2) * 14;
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(0.4); ctx.fillRect(-10, -5, 20, 10); ctx.restore();
      }
      ctx.strokeStyle = "rgba(21,16,13,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { ctx.moveTo(-40 + k * 12, bodyY - 12); ctx.lineTo(-34 + k * 12, bodyY + 10); } ctx.stroke();
      // neck & head
      const nx = 42, ny = bodyY - 10;
      const hx = 64 + headLow * 14, hy = bodyY - 48 + headLow * 50;
      ctx.fillStyle = "#ece4d2"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(nx - 10, ny + 6); ctx.quadraticCurveTo(nx + 6, ny - 20, hx - 6, hy + 6); ctx.lineTo(hx + 4, hy + 12); ctx.quadraticCurveTo(nx + 16, ny, nx + 10, ny + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx + 6, hy + 4, 18, 9, 0.35 + headLow * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = Art.INK; ctx.beginPath(); ctx.arc(hx + 4, hy, 2.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#bfe0ff"; ctx.fillRect(hx + 4, hy - 1, 1.5, 1.5);
      // antlers: branching ink
      const sweepA = st === "sweep" ? Math.sin(Math.min(1, this.stateT / 0.25) * Math.PI) * 0.9 : st === "sweepWind" ? -0.4 : 0;
      ctx.save(); ctx.translate(hx, hy - 4); ctx.rotate(-0.3 + headLow * 0.8 + sweepA);
      const rr = U.rng(77);
      const branch = (x0, y0, a, len, w, d) => {
        const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
        Art.brush(ctx, [x0, y0, x1, y1], w, { seed: d * 5 + x0, taperStart: 0, taperEnd: 0.5, color: Art.INK });
        if (d <= 0) return;
        branch(x1, y1, a - 0.45 - rr() * 0.2, len * 0.72, w * 0.7, d - 1);
        branch(x1, y1, a + 0.35 + rr() * 0.2, len * 0.62, w * 0.7, d - 1);
      };
      branch(0, 0, -1.9, 34, 5, 3);
      branch(4, 0, -1.2, 30, 4.5, 3);
      ctx.restore();
      if (st === "sweep") {
        ctx.fillStyle = "rgba(21,16,13,0.5)";
        ctx.beginPath(); ctx.arc(50, -60, 110, -1.2, 0.6); ctx.arc(50, -60, 80, 0.6, -1.2, true); ctx.fill();
      }
      ctx.restore();
    }
  }

  // A half-erased afterimage that re-runs the Hart's charge line. It can be struck away.
  class EchoHart {
    constructor(hart, x, dir, delay) {
      this.hart = hart; this.x = x; this.y = hart.y; this.w = hart.w; this.h = hart.h; this.dir = dir; this.delay = delay;
      this.t = 0; this.dead = false; this.hostile = true; this.cause = "hart · echo";
    }
    box() { return this.t < this.delay ? { x: -9999, y: -9999, w: 0, h: 0 } : { x: this.x + 14, y: this.y + 24, w: this.w - 28, h: this.h - 24 }; }
    update(dt, G) {
      this.t += dt;
      if (this.t < this.delay) return !this.dead;
      if (!this.launched) { this.launched = true; LD.Audio.sfx.tele(); }
      this.x += this.dir * D.bosses.hart.echo.speed * dt;
      const front = this.dir > 0 ? this.x + this.w + 4 : this.x - 4;
      if (W.pointSolid(front, this.y + this.h - 20) || this.t > this.delay + 3) { this.dead = true; P.burst(this.x + this.w / 2, this.y + this.h / 2, 14, "scrap", { min: 60, max: 220, p: { color: "#dfe8f2", g: 300, size: 5 } }); }
      if (!this.dead && LD.Combat.enemyStrike(G, this.box(), D.bosses.hart.echo.dmg, this.x + this.w / 2 - this.dir * 40, { cause: this.cause })) this.dead = true;
      if (Math.random() < 0.6) P.add({ kind: "scrap", x: this.x + U.rand(0, this.w), y: this.y + U.rand(10, this.h), vx: -this.dir * 60, vy: -20, g: 0, color: "rgba(210,225,240,0.7)", size: 3, life: 0.5 });
      return !this.dead;
    }
    draw(ctx, G) {
      const h = this.hart, launched = this.t >= this.delay;
      // a pale outline appears where it will run from, then it gallops as a ghost
      const a = launched ? 0.42 : 0.12 + 0.25 * (this.t / this.delay);
      const sv = { x: h.x, facing: h.facing, state: h.state, stateT: h.stateT };
      h.x = this.x; h.facing = this.dir; h.state = launched ? "charge" : "chargeWind"; h.stateT = launched ? this.t - this.delay : this.t;
      ctx.save(); ctx.globalAlpha = a;
      if (LD.Sprites.enabled("hart")) LD.Sprites.draw(ctx, "hart", "charge", { name: "charge", t: this.t }, h.cx(), h.y + h.h, this.dir, { alpha: a });
      else h.drawBody(ctx, G);
      ctx.restore();
      Object.assign(h, sv);
      if (!launched) Art.telegraph(ctx, this.x + this.w / 2, this.y - 14, this.t);
    }
  }

  class Shockwave {
    constructor(x, y, vx, dmg) { this.x = x; this.y = y; this.vx = vx; this.dmg = dmg; this.t = 0; this.dead = false; this.hostile = true; this.h = 34; }
    box() { return { x: this.x - 16, y: this.y - this.h, w: 32, h: this.h }; }
    update(dt, G) {
      this.t += dt; this.x += this.vx * dt;
      if (W.pointSolid(this.x + Math.sign(this.vx) * 16, this.y - 10) || this.t > 3) this.dead = true;
      if (!this.dead && LD.Combat.enemyStrike(G, this.box(), this.dmg, this.x - this.vx, { cause: this.cause || "hart · shockwave" })) this.dead = true;
      if (Math.random() < 0.6) P.add({ kind: this.fire ? "ember" : "dust", x: this.x, y: this.y - 6, vx: -this.vx * 0.1, vy: -U.rand(40, 120), g: 200, color: "rgba(80,70,60,0.6)", size: 3, life: 0.5 });
      return !this.dead;
    }
    draw(ctx) {
      ctx.save();
      const s = Math.sign(this.vx);
      ctx.translate(this.x, this.y); ctx.scale(s, 1);
      if (this.fire) { ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, 0, -16, 40, "rgba(255,120,40,0.6)"); ctx.globalCompositeOperation = "source-over"; }
      ctx.fillStyle = this.fire ? "#e0662a" : Art.INK;
      ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(-6, -this.h * 1.1, 14, -this.h * 0.6 + Math.sin(this.t * 30) * 3); ctx.quadraticCurveTo(8, -10, 18, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  // ================================================================ SOOT MARSHAL
  const MARSHAL_ATTACKS = {
    cleave: { wind: 0.78, act: 0.2, rec: 0.85, range: [0, 200], phase: 1, w: 3 },
    sweep: { wind: 0.62, act: 0.24, rec: 0.65, range: [0, 240], phase: 1, w: 3 },
    lob: { wind: 0.65, act: 0.1, rec: 0.75, range: [180, 2000], phase: 1, w: 2 },
    lunge: { wind: 0.6, act: 0.45, rec: 0.7, range: [260, 2000], phase: 2, w: 3 },
    floor: { wind: 0.55, act: 0.1, rec: 0.8, range: [0, 2000], phase: 2, w: 2 },
    wave: { wind: 0.72, act: 0.15, rec: 0.75, range: [120, 2000], phase: 2, w: 2 },
    collapse: { wind: 0.7, act: 0.1, rec: 0.6, range: [0, 2000], phase: 3, w: 2 },
    // feeds the fire: a long, readable channel that can be interrupted (doused)
    stoke: { wind: 1.9, act: 0.3, rec: 0.9, range: [0, 2000], phase: 2, w: 2 },
  };

  class Marshal extends LD.Enemy {
    constructor(x, y) {
      const d = D.bosses.marshal;
      super("marshal", x, y, Object.assign({ weight: 8, contact: false, staggerTime: 2.1 }, d));
      this.isBoss = true; this.name = d.name; this.title = d.title;
      this.setState("dormant"); this.facing = -1;
      this.phase = 1; this.atk = null; this.cdPages = 3; this.collapses = [];
      this.sealTiles = [[8, 15], [9, 15], [10, 15], [11, 15]];
      this.lastAtk = null; this.combo = 0;
      this.spriteShadow = "rgba(255,110,40,0.55)";
    }
    hitbox() { return this.dead || this.state === "dormant" || this.state === "intro" ? null : { x: this.x + 6, y: this.y + 20, w: this.w - 12, h: this.h - 20 }; }
    telegraphing() { return this.state === "atk" && this.atk && this.atk.phase === "wind"; }
    tempo() { return D.bosses.marshal.tempo[this.phase - 1]; }
    collapseAt(x) { return this.collapses.some((c) => x > c.x0 - 30 && x < c.x1 + 30); }

    startIntro(G) {
      this.setState("intro");
      seal(this.sealTiles);
      G.S.flags.enteredArena = true;
      G.runMarshalIntro(this);
    }
    beginFight(G) {
      this.setState("idle");
      G.startBoss(this, "boss", { x0: 0, x1: 40 * T });
      LD.Audio.intensity = 0;
    }

    pickAttack(G) {
      const { dx } = this.toPlayer(G), dist = Math.abs(dx);
      const opts = [];
      for (const [name, a] of Object.entries(MARSHAL_ATTACKS)) {
        if (a.phase > this.phase) continue;
        if (dist < a.range[0] || dist > a.range[1]) continue;
        if (name === this.lastAtk && Math.random() < 0.7) continue;
        if (name === "collapse" && this.collapses.length) continue;
        if (name === "stoke" && (this.stokeCD || 0) > 0) continue;
        let w = a.w;
        if (this.phase >= 2 && (name === "cleave" || name === "sweep")) w -= 1;
        for (let i = 0; i < w; i++) opts.push(name);
      }
      if (!opts.length) return null;
      return U.pick(opts);
    }

    startAtk(name, G) {
      const a = MARSHAL_ATTACKS[name];
      this.atk = { name, def: a, phase: "wind", t: 0, hit: false, wind: a.wind * this.tempo(), act: a.act, rec: a.rec * (0.6 + 0.4 * this.tempo()) };
      this.lastAtk = name;
      this.setState("atk");
      if (name === "stoke") {
        this.stokeCD = D.bosses.marshal.stoke.cooldown; this.atk.pressure = 0;
        LD.Audio.sfx.fireBurst(); LD.Audio.sfx.creak();
        LD.HUD.bark(this.name, this.lastStand ? "If I burn, the Archive burns with me!" : U.pick(["Feed the fire.", "Burn brighter.", "Every page, kindling."]));
        if (!G.S.flags.hintStoke) { G.S.flags.hintStoke = true; setTimeout(() => LD.HUD.thought("He's stoking the flames — douse him with water or strike hard before it erupts, or get clear!"), 300); }
      }
      this.facing = Math.sign(G.player.cx() - this.cx()) || this.facing;
      if (name === "cleave" || name === "wave") LD.Audio.sfx.creak();
      if (name === "lob" || name === "floor") LD.Audio.sfx.crackle();
      if (name === "collapse") LD.Audio.sfx.roar();
    }

    ai(dt, G) {
      const { dx } = this.toPlayer(G), p = G.player, d = D.bosses.marshal;
      const dist = Math.abs(dx);
      // ambient embers scale with phase
      if (Math.random() < dt * (6 + this.phase * 6)) P.add({ kind: "ember", x: this.x + U.rand(0, this.w), y: this.y + U.rand(20, this.h), vx: U.rand(-30, 30), vy: -U.rand(40, 120), g: -30, size: 2.4, life: 1.1 });
      // falling burning pages in phase 3
      if (this.phase >= 3 && this.state !== "dormant" && this.state !== "roar") {
        this.cdPages -= dt;
        if (this.cdPages <= 0) {
          this.cdPages = U.rand(2.6, 3.8);
          for (let i = 0; i < 3; i++) {
            const x = U.clamp(p.cx() + (i - 1) * U.rand(130, 200) + U.rand(-30, 30), 3 * T, 38 * T);
            W.projectiles.push(new FallingPage(x, 2 * T, 15 * T));
          }
        }
      }
      this.updateCollapses(dt, G);
      this.stokeCD = Math.max(0, (this.stokeCD || 0) - dt);
      // last stand: near death he always stokes one final time
      if (this.lastStand === 1 && this.state === "idle") { this.lastStand = 2; this.stokeCD = 0; this.startAtk("stoke", G); return; }

      switch (this.state) {
        case "dormant":
          if (p.cx() > 14 * T && !p.dead && p.onGround) this.startIntro(G);
          return;
        case "intro":
          return;
        case "roar":
          this.vx = 0;
          if (this.stateT > 1.6) this.setState("idle");
          return;
        case "idle":
        case "walk": {
          this.facing = Math.sign(dx) || this.facing;
          const want = dist > 150 ? this.facing * d.walk[this.phase - 1] : 0;
          this.vx = U.approach(this.vx, want, 600 * dt);
          this.state = Math.abs(this.vx) > 10 ? "walk" : "idle";
          if (this.stateT > 0.5 * this.tempo()) {
            if (this.stateT > 1.1 * this.tempo() || dist < 200 || Math.random() < dt * 2) {
              const n = this.pickAttack(G);
              if (n) this.startAtk(n, G);
            }
          }
          if (this.onGround && Math.abs(this.vx) > 10) { this.stepT = (this.stepT || 0) - dt; if (this.stepT <= 0) { this.stepT = 0.55; LD.Audio.sfx.stomp(); LD.Camera.shake(0.06); } }
          return;
        }
        case "atk":
          this.runAtk(dt, G);
          return;
        case "stagger":
          return;
      }
    }

    runAtk(dt, G) {
      const a = this.atk, p = G.player, d = D.bosses.marshal;
      a.t += dt;
      this.vx = U.approach(this.vx, 0, 900 * dt);
      const front = (w, h, y0 = 0) => ({ x: this.facing > 0 ? this.cx() - 10 : this.cx() - w + 10, y: this.y + this.h - h - y0, w, h });
      if (a.phase === "wind") {
        if (a.name === "lunge") this.vx = -this.facing * 40;
        if (a.name === "stoke") {
          // embers are drawn in towards him as the fire builds
          const k = a.t / a.wind, r = D.bosses.marshal.stoke.radius * (1 - k * 0.6);
          for (let i = 0; i < 2; i++) { const ang = Math.random() * Math.PI * 2; P.add({ kind: "ember", x: this.cx() + Math.cos(ang) * r, y: this.cy() + Math.sin(ang) * r * 0.5, vx: -Math.cos(ang) * r * 1.2, vy: -Math.sin(ang) * r * 0.6, g: 0, size: 3, life: 0.7 }); }
          if (Math.random() < dt * 3) LD.Audio.sfx.crackle();
        }
        if (a.t >= a.wind) {
          a.phase = "act"; a.t = 0;
          switch (a.name) {
            case "cleave":
              LD.Audio.sfx.swing(true); this.vx = this.facing * 180;
              break;
            case "sweep": LD.Audio.sfx.swing(true); break;
            case "lob":
              for (let i = -1; i <= 1; i++) {
                const tx = p.cx() + i * 110, tAir = 0.9;
                const vx = (tx - this.cx()) / tAir, vy = -(2 * 900 * tAir) / 2 * 0.95;
                W.projectiles.push(new LD.Projectile(this.cx() + this.facing * 20, this.y + 30, vx, vy, {
                  dmg: d.dmg, g: 900, kind: "ember", r: 9, cause: "marshal · ember lob",
                  onLand: (GG, pr) => { W.effects.push(new LD.FirePatch(pr.x, 15 * T, 60, 1.3, 0.3, { cause: "marshal · ember patch" })); LD.Audio.sfx.fireBurst(); },
                }));
              }
              LD.Audio.sfx.fireBurst();
              break;
            case "lunge": this.vx = this.facing * 760; LD.Audio.sfx.swing(true); break;
            case "floor": {
              LD.Audio.sfx.stomp(); LD.Camera.shake(0.3);
              // one patch under you, one to a side, one behind him — the space in front of the
              // Marshal stays fightable, so melee isn't locked out for the whole burn
              const xs = [p.cx(), p.cx() + U.pick([-1, 1]) * U.rand(220, 300), this.cx() - this.facing * 160];
              for (const x of xs) W.effects.push(new LD.FirePatch(U.clamp(x, 3 * T, 38 * T), 15 * T, 120, D.bosses.marshal.floorBurn + this.phase * 0.2, 1.15 * this.tempo() + 0.25, { dmg: d.dmg, h: 70, cause: "marshal · floor fire" }));
              break;
            }
            case "wave": {
              LD.Audio.sfx.stomp(); LD.Camera.shake(0.45); LD.Audio.sfx.fireBurst();
              for (const s of [-1, 1]) { const w = new Shockwave(this.cx() + s * 70, this.y + this.h, s * 460, d.dmg); w.fire = true; w.cause = "marshal · fire wave"; W.projectiles.push(w); }
              break;
            }
            case "stoke": {
              // the Inferno: a burst around him, fire waves along the floor, the ground left burning
              const St = D.bosses.marshal.stoke, cx = this.cx(), fy = this.y + this.h;
              LD.Combat.enemyStrike(G, { x: cx - St.radius, y: fy - 170, w: St.radius * 2, h: 170 }, St.dmg, cx, { cause: "marshal · inferno" });
              for (const s of [-1, 1]) { const w = new Shockwave(cx + s * St.radius * 0.6, fy, s * 520, d.dmg); w.fire = true; w.cause = "marshal · inferno wave"; W.projectiles.push(w); }
              for (const s of [-1, 1]) W.effects.push(new LD.FirePatch(U.clamp(cx + s * U.rand(120, 240), 3 * T, 38 * T), 15 * T, 110, 1.6, 0.35, { dmg: d.dmg, h: 60, cause: "marshal · inferno embers" }));
              LD.Audio.sfx.fireBurst(); LD.Audio.sfx.roar();
              LD.Camera.shake(0.8);
              if (LD.Cinema) { LD.Cinema.flash("255,150,60", 0.7, 2); LD.Cinema.ring(cx, fy - 40, "255,120,40", 1.6); LD.Cinema.punch(0.1); }
              P.burst(cx, fy - 60, 60, "ember", { min: 150, max: 600, p: { g: 100, size: 4, life: 1.3 } });
              break;
            }
            case "collapse": {
              LD.Camera.shake(0.5);
              const spots = [];
              for (let tries = 0; tries < 30 && spots.length < (this.phase >= 3 ? 2 : 1); tries++) {
                const tx = U.randi(4, 34);
                const cx = (tx + 1.5) * T;
                if (Math.abs(cx - this.cx()) < 170) continue;
                if (tx >= 7 && tx <= 12) continue;
                if (spots.some((s) => Math.abs(s - tx) < 6)) continue;
                spots.push(tx);
              }
              for (const tx of spots) this.collapses.push({ tx, x0: tx * T, x1: (tx + 3) * T, t: 0, warn: 1.25, open: 4.5, state: "warn" });
              break;
            }
          }
        }
      } else if (a.phase === "act") {
        let box = null, dmg = d.dmg;
        if (a.name === "cleave") { box = front(170, 150); dmg = this.phase >= 3 ? d.heavyDmg : d.dmg; }
        if (a.name === "sweep") box = front(220, 56);
        if (a.name === "lunge") { box = { x: this.x - 10, y: this.y + 30, w: this.w + 20, h: this.h - 30 }; this.vx = this.facing * 760; if (this.hitWall) a.t = a.act; }
        if (box && !a.hit && LD.Combat.enemyStrike(G, box, dmg, this.cx(), { unblockable: a.name === "cleave" && this.phase >= 3 })) a.hit = true;
        if (a.t >= a.act) {
          a.phase = "rec"; a.t = 0;
          if (a.name === "cleave") {
            LD.Camera.shake(0.4); LD.Audio.sfx.stomp();
            P.burst(this.cx() + this.facing * 120, 15 * T, 14, "ember", { angle: -Math.PI / 2, spread: 1.2, min: 80, max: 300, p: { g: 300, size: 3 } });
            if (this.phase >= 2) W.effects.push(new LD.FirePatch(this.cx() + this.facing * 120, 15 * T, 80, 1.2, 0.45, { cause: "marshal · cleave afterburn" }));
          }
          if (a.name === "lunge" && this.phase >= 3) { this.startAtk("cleave", G); this.atk.wind *= 0.6; return; }
        }
      } else if (a.t >= a.rec) {
        this.atk = null;
        this.setState("idle");
        // phase-3 combos: sweep follows cleave
        if (this.phase >= 3 && a.name === "cleave" && Math.random() < 0.6) this.startAtk("sweep", G);
      }
    }

    updateCollapses(dt, G) {
      for (let i = this.collapses.length - 1; i >= 0; i--) {
        const c = this.collapses[i];
        c.t += dt;
        if (c.state === "warn" && c.t > c.warn) {
          c.state = "open"; c.t = 0;
          for (let x = c.tx; x < c.tx + 3; x++) { W.temp.set(x + ",15", "."); W.temp.set(x + ",16", "."); W.temp.set(x + ",17", "^"); }
          LD.Audio.sfx.tear(); LD.Camera.shake(0.3);
          P.burst((c.tx + 1.5) * T, 15 * T, 20, "scrap", { min: 60, max: 240, p: { color: "#3a2a22", g: 900, size: 8, burning: true } });
        } else if (c.state === "open" && c.t > c.open) {
          c.state = "close"; c.t = 0;
          for (let x = c.tx; x < c.tx + 3; x++) { W.temp.delete(x + ",15"); W.temp.delete(x + ",16"); W.temp.delete(x + ",17"); }
          // don't trap the player inside re-knitting paper
          const p = G.player;
          if (p.cx() > c.x0 && p.cx() < c.x1 && p.feet() > 15 * T) p.respawnSafe(G);
          LD.Audio.sfx.page();
        } else if (c.state === "close" && c.t > 0.4) this.collapses.splice(i, 1);
      }
    }

    takeHit(G, h) {
      if (this.state === "dormant" || this.state === "intro" || this.state === "roar") return "blocked";
      const armor = this.state === "atk" && this.atk && this.atk.phase !== "wind";
      const kneel = this.state === "stagger";
      // a blow while he stokes: water, or enough force, drowns the fire and drops him to a knee
      if (this.state === "atk" && this.atk && this.atk.name === "stoke" && this.atk.phase === "wind") {
        this.atk.pressure += h.stagger + (h.rel === "strong" ? 25 : 0);   // water counts double-ish
        if (this.atk.pressure >= D.bosses.marshal.stoke.douse) {
          this.hp -= h.dmg; this.hurtT = 0.16;
          this.douse(G);
          if (this.hp <= 0) { this.hp = 0; this.die(G); }
          return "hit";
        }
      }
      this.hp -= h.dmg * (kneel ? 1.25 : 1);
      this.hurtT = 0.16;
      if (!armor) this.poise -= h.stagger;
      else this.poise -= h.stagger * 0.4;
      LD.Audio.sfx.enemyHurt();
      if (this.hp <= 0) { this.hp = 0; this.die(G); return "hit"; }
      const frac = this.hp / this.maxHp;
      if (this.phase >= 3 && !this.lastStand && frac <= D.bosses.marshal.stoke.lastStand) this.lastStand = 1;
      const want = frac <= D.bosses.marshal.phases[2] ? 3 : frac <= D.bosses.marshal.phases[1] ? 2 : 1;
      if (want > this.phase) { this.phase = want; this.enterPhase(G); return "hit"; }
      if (this.poise <= 0 && !kneel) {
        this.poise = this.data.poise; this.atk = null;
        this.setState("stagger");
        LD.Audio.sfx.guardBreak();
        LD.HUD.thought("The Marshal kneels — strike now!");
      }
      return "hit";
    }

    // doused mid-stoke: steam, a long kneel, and every hit on him is critical
    douse(G) {
      this.atk = null; this.poise = this.data.poise;
      this.setState("stagger"); this.stateT = -0.9;   // a longer kneel than a normal stagger
      LD.Audio.sfx.splash(); LD.Audio.sfx.guardBreak();
      P.burst(this.cx(), this.y + 40, 40, "mote", { angle: -Math.PI / 2, spread: 1.4, min: 60, max: 260, p: { color: "rgba(235,240,245,0.85)", g: -80, size: 6, life: 1.4 } });
      P.add({ kind: "text", x: this.cx(), y: this.y - 20, vy: -50, g: 0, text: "✶ doused!", size: 30, life: 1.2, color: "#1c3f73", front: true });
      LD.HUD.bark(this.name, "The damp… no—!");
      G.hitstop = Math.max(G.hitstop, 0.14);
      if (LD.Cinema) { LD.Cinema.flash("200,225,245", 0.5, 2.5); LD.Cinema.ring(this.cx(), this.cy(), "63,127,192", 1.2); LD.Cinema.punch(0.06); }
      LD.Input.rumble(0.6, 200);
      if (LD.Telemetry) LD.Telemetry.count("douse");
    }

    enterPhase(G) {
      this.atk = null;
      this.setState("roar");
      this.poise = this.data.poise;
      LD.Audio.sfx.roar();
      LD.Audio.intensity = this.phase - 1;
      LD.Camera.shake(0.6);
      const p = G.player;
      p.vx = Math.sign(p.cx() - this.cx()) * 520; p.vy = -300;
      const line = this.phase === 2 ? LD.Speech.marshalPhase2 : LD.Speech.marshalPhase3;
      LD.HUD.bark(line.who, line.text);
      G.arenaBurn = this.phase - 1;
      P.burst(this.cx(), this.cy(), 40, "ember", { min: 100, max: 500, p: { g: 100, size: 3, life: 1.4 } });
      G.bossPhaseBeat(this);
    }

    die(G) {
      this.dead = true; this.deathT = 0; this.atk = null;
      for (const c of this.collapses) for (let x = c.tx; x < c.tx + 3; x++) { W.temp.delete(x + ",15"); W.temp.delete(x + ",16"); W.temp.delete(x + ",17"); }
      this.collapses = [];
      W.effects = []; W.projectiles = [];
      G.runMarshalDefeat(this);
    }

    update(dt, G) {
      if (this.dead) {
        this.deathT += dt;
        if (this.dissolving) { this.dissolveT = (this.dissolveT || 0) + dt; if (this.dissolveT > 2.4) this.gone = true; }
        if (this.dissolving && !this.gone && Math.random() < 0.9) P.add({ kind: Math.random() < 0.5 ? "ash" : "ember", x: this.x + U.rand(0, this.w), y: this.y + U.rand(0, this.h), vx: U.rand(-30, 30), vy: -U.rand(30, 120), g: -40, color: "rgba(70,60,55,0.8)", size: 3, life: 2 });
        return !this.gone;
      }
      return super.update(dt, G);
    }
    physics(dt) {
      this.vy = Math.min(1400, this.vy + 2200 * dt);
      W.moveBody(this, dt);
    }

    drawArena(ctx, G) {
      // collapse warnings / pits
      for (const c of this.collapses) {
        const x0 = c.x0, w = c.x1 - c.x0, y = 15 * T;
        if (c.state === "warn") {
          const k = c.t / c.warn;
          ctx.save();
          ctx.strokeStyle = "rgba(255,140,60," + (0.4 + k * 0.6) + ")"; ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) { const cx = x0 + (i + 0.5) * (w / 6); ctx.moveTo(cx - 8, y + 2); ctx.lineTo(cx + (U.hash(i + c.tx) - 0.5) * 10, y + 18); ctx.lineTo(cx + 9, y + 4); }
          ctx.stroke();
          // shape cue: jagged "tear" brackets
          ctx.fillStyle = Art.INK;
          ctx.fillRect(x0, y - 4, 4, 10); ctx.fillRect(x0 + w - 4, y - 4, 4, 10);
          ctx.restore();
          if (Math.random() < 0.3) P.add({ kind: "scrap", x: x0 + U.rand(0, w), y: y, vx: 0, vy: 30, g: 500, color: "#3a2a22", size: 3, life: 0.5 });
        } else if (c.state === "open" || c.state === "close") {
          const k = c.state === "close" ? 1 - c.t / 0.4 : 1;
          ctx.save();
          ctx.fillStyle = "#0b0706";
          ctx.fillRect(x0, y - 2, w, (3 * T + 4) * k);
          ctx.globalCompositeOperation = "lighter";
          Art.glow(ctx, x0 + w / 2, y + 90, 90, "rgba(255,100,30,0.6)", k);
          ctx.restore();
          if (Math.random() < 0.4) P.add({ kind: "ember", x: x0 + U.rand(0, w), y: y + 80, vx: 0, vy: -U.rand(80, 200), g: -20, size: 2.4, life: 1 });
        }
      }
    }

    draw(ctx, G) {
      if (!this.dead && this.state !== "dormant") drawSeal(ctx, this.sealTiles, G.time);
      this.drawArena(ctx, G);
      if (this.gone) return;
      const a = this.atk, stoking = !this.dead && this.state === "atk" && a && a.name === "stoke" && a.phase === "wind";
      if (stoking) {
        // the Inferno's reach: a flame ring on the floor that fills as the fire builds
        const St = D.bosses.marshal.stoke, k = U.clamp(a.t / a.wind, 0, 1), cx = this.cx(), fy = this.y + this.h;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        Art.glow(ctx, cx, fy - 90, 140 + k * 160, "rgba(255,110,40,0.55)", 0.4 + k * 0.6);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(255,90,30," + (0.08 + k * 0.22) + ")";
        ctx.beginPath(); ctx.ellipse(cx, fy - 2, St.radius * k, 16 * k + 2, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(255,150,70," + (0.5 + k * 0.5) + ")"; ctx.lineWidth = 3; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -G.time * 60;
        ctx.beginPath(); ctx.ellipse(cx, fy - 2, St.radius, 18, 0, 0, 7); ctx.stroke();
        ctx.restore();
      }
      super.draw(ctx, G);
      if (stoking && Math.floor(G.time * 4) % 2 === 0) {
        // shape cue: a water drop over his head means "douse me"
        ctx.save(); ctx.fillStyle = "rgba(236,225,201,0.9)"; ctx.beginPath(); ctx.arc(this.cx(), this.y - 36, 15, 0, 7); ctx.fill();
        ctx.strokeStyle = Art.INK; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        Art.elementGlyph(ctx, "water", this.cx(), this.y - 35, 9, "#2f6aa8");
      }
    }

    spriteAlpha() { return this.dead && this.dissolving ? Math.max(0, 1 - (this.dissolveT || 0) / 2.2) : 1; }
    anim() {
      const st = this.state, a = this.atk;
      if (this.dead) return { name: this.dissolving ? "death" : "kneel", t: this.dissolveT || this.deathT };
      if (st === "dormant") return { name: "dormant", t: this.t };
      if (st === "intro") return { name: "rise", p: this.introRise || 0 };
      if (st === "stagger") return { name: "kneel", t: this.stateT };
      if (st === "roar") return { name: "roar", t: this.stateT };
      if (st === "atk" && a) {
        const tot = a.wind + a.act + a.rec;
        const done = a.phase === "wind" ? a.t : a.phase === "act" ? a.wind + a.t : a.wind + a.act + a.t;
        const name = { floor: "stomp", wave: "stomp", collapse: "stomp", stoke: "stomp" }[a.name] || a.name;
        return { name, p: done / tot };
      }
      return { name: Math.abs(this.vx) > 10 ? "walk" : "idle", t: this.t };
    }
    drawBody(ctx, G) {
      const x = this.cx(), y = this.y + this.h, f = this.facing, b = Art.boil, t = this.t;
      const st = this.state, a = this.atk;
      let alpha = 1;
      if (this.dead) alpha = this.dissolving ? Math.max(0, 1 - this.dissolveT / 2.2) : 1;
      // a hot glow BEHIND the dark silhouette keeps it readable against the burnt archive
      ctx.save(); ctx.globalAlpha *= alpha * 0.9; ctx.globalCompositeOperation = "lighter";
      Art.glow(ctx, x, y - 95, 170, "rgba(255,100,35,0.4)"); ctx.restore();
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.translate(x, y); ctx.scale(f, 1);
      const kneel = st === "dormant" || st === "stagger" || (this.dead && !this.dissolving) || (this.dead && this.dissolving);
      const sink = kneel ? 34 : st === "intro" ? 34 * (1 - U.clamp(this.introRise || 0, 0, 1)) : 0;
      const walkPh = st === "walk" ? Math.sin(t * 5) : 0;
      // halberd angle keyframes (facing-space)
      let ha = -1.3, ext = 0, lean = 0;
      if (st === "atk" && a) {
        const k = a.phase === "wind" ? U.easeOut(a.t / a.wind) : a.phase === "act" ? U.easeOut(a.t / Math.max(0.01, a.act)) : 1;
        const K = {
          cleave: [-1.3, -2.5, 0.9], sweep: [-1.3, 2.7, 0.25], lob: [-1.3, -1.0, -1.1], lunge: [-1.3, -0.1, 0.0],
          floor: [-1.3, -1.6, 1.4], wave: [-1.3, -2.6, 1.2], collapse: [-1.3, -1.5, 1.5], stoke: [-1.3, 1.25, 1.35],
        }[a.name] || [-1.3, -1.3, -1.3];
        if (a.phase === "wind") { ha = U.lerp(K[0], K[1], k); lean = a.name === "cleave" || a.name === "wave" ? -0.15 * k : 0.1 * k; }
        else if (a.phase === "act") { ha = U.lerp(K[1], K[2], k); lean = 0.25; ext = a.name === "lunge" ? 20 : 0; }
        else { ha = K[2]; lean = 0.15 * (1 - a.t / a.rec); }
      }
      if (kneel) { ha = 1.25; lean = 0.35; }
      if (st === "roar") { ha = -1.9; lean = -0.25; }
      ctx.translate(0, sink);
      // legs / greaves
      ctx.fillStyle = "#1a1210";
      Art.brush(ctx, [-12, -62, -16 - walkPh * 10, -30, -20 - walkPh * 12, 0], 14, { seed: b, taperStart: 0, taperEnd: 0 });
      Art.brush(ctx, [12, -62, 14 + walkPh * 10, -30, 18 + walkPh * 12, 0], 14, { seed: b + 1, taperStart: 0, taperEnd: 0 });
      ctx.rotate(lean * 0.5);
      // burnt-page cloak: layered jagged shards with ember edges
      const shardLayer = (col, edge, spread, len, seed) => {
        for (let i = 0; i < 9; i++) {
          const ang = -0.1 + (i - 4) * spread;
          const flut = Math.sin(t * 3 + i * 1.3 + seed) * 0.05;
          const L = len * (0.75 + U.hash(i + seed) * 0.35) - (kneel ? 10 : 0);
          const x0 = (i - 4) * 5, y0 = -120;
          const x1 = x0 + Math.sin(ang + flut) * L, y1 = y0 + Math.cos(ang + flut) * L;
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(x0 - 11, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0 + 11, y0); ctx.closePath(); ctx.fill();
          // smouldering edge along one side of the shard, ember at the tip
          ctx.strokeStyle = edge; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(U.lerp(x0 + 11, x1, 0.55), U.lerp(y0, y1, 0.55)); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.fillStyle = "rgba(255,170,90,0.9)"; ctx.fillRect(x1 - 1, y1 - 2, 2, 2);
        }
      };
      shardLayer("#231816", "rgba(255,120,50,0.75)", 0.2, 118, 1);
      shardLayer("#35241e", "rgba(255,150,70,0.6)", 0.15, 96, 2);
      // torso
      ctx.fillStyle = "#1e1512"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-26, -70); ctx.lineTo(-30, -126); ctx.lineTo(0, -140); ctx.lineTo(30, -126); ctx.lineTo(26, -70); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(255,120,50,0.5)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(-18, -80 - k * 12); ctx.quadraticCurveTo(0, -86 - k * 12, 18, -80 - k * 12); } ctx.stroke();
      // pauldrons: curled burnt pages
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#3a2820"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(s * 18, -136); ctx.quadraticCurveTo(s * 50, -150, s * 46, -118); ctx.quadraticCurveTo(s * 36, -120, s * 20, -118); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,140,60,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s * 46, -120); ctx.lineTo(s * 40, -126); ctx.stroke();
      }
      // helm + crown of burnt page points
      ctx.fillStyle = "#15100e"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(2, -152, 15, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#2b1d18";
      for (let i = 0; i < 5; i++) {
        const cx = -12 + i * 6.5, h = 16 + (i === 2 ? 10 : i % 2 ? 4 : 8);
        ctx.beginPath(); ctx.moveTo(cx - 4, -164); ctx.lineTo(cx + Math.sin(t * 4 + i) * 1.5, -164 - h); ctx.lineTo(cx + 4, -164); ctx.fill();
        if (this.phase >= 2 || st === "roar") { ctx.fillStyle = "rgba(255,130,50,0.9)"; ctx.fillRect(cx - 1, -164 - h, 2, 4); ctx.fillStyle = "#2b1d18"; }
      }
      // ember eyes
      const eyeGlow = st === "dormant" ? 0.3 + Math.sin(t * 2) * 0.2 : 1;
      ctx.fillStyle = "rgba(255,170,80," + eyeGlow + ")";
      ctx.fillRect(4, -154, 6, 2.5); ctx.fillRect(12, -153, 4, 2.2);
      // halberd
      ctx.save();
      ctx.translate(20 + ext, -104);
      ctx.rotate(ha);
      ctx.fillStyle = Art.INK;
      Art.brush(ctx, [-60, 0, 40, -1, 150, 0], 6, { seed: b + 5, taperStart: 0, taperEnd: 0 });
      // crescent axe head
      ctx.fillStyle = "#2d211c"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(118, -4); ctx.quadraticCurveTo(128, -44, 156, -46); ctx.quadraticCurveTo(142, -20, 146, 4); ctx.quadraticCurveTo(142, 26, 158, 44); ctx.quadraticCurveTo(126, 42, 118, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(255,140,60,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(156, -44); ctx.quadraticCurveTo(142, -20, 146, 4); ctx.quadraticCurveTo(142, 26, 158, 42); ctx.stroke();
      ctx.fillStyle = Art.INK; ctx.beginPath(); ctx.moveTo(150, -3); ctx.lineTo(176, 0); ctx.lineTo(150, 3); ctx.fill();
      ctx.restore();
      // arms
      ctx.fillStyle = "#1a1210";
      const hx = 20 + ext + Math.cos(ha) * 0, hy = -104;
      Art.brush(ctx, [22, -128, 30, -112, hx, hy], 10, { seed: b + 7, taperStart: 0, taperEnd: 0 });
      if (a && a.name === "lob" && a.phase === "wind") {
        Art.brush(ctx, [-22, -128, -30, -150, -24, -176], 9, { seed: b + 8, taperStart: 0, taperEnd: 0 });
        ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, -24, -182, 40, "rgba(255,130,50,0.9)"); ctx.restore();
      } else Art.brush(ctx, [-22, -128, -30, -100, -24, -76], 9, { seed: b + 8, taperStart: 0, taperEnd: 0 });
      // flames licking the hem (more in later phases)
      ctx.globalCompositeOperation = "lighter";
      const flames = 3 + this.phase * 2;
      for (let i = 0; i < flames; i++) {
        const fx = -40 + (i / flames) * 80, fh = 14 + U.noise1(t * 6 + i * 2) * 20 * this.phase;
        ctx.fillStyle = "rgba(255,110,40,0.5)";
        ctx.beginPath(); ctx.moveTo(fx - 6, -14); ctx.quadraticCurveTo(fx, -14 - fh, fx + 6, -14); ctx.fill();
      }
      Art.glow(ctx, 0, -100, 110, "rgba(255,90,30," + (0.1 + this.phase * 0.06) + ")");
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
  }

  // Burning pages falling from the Archive ceiling (phase 3). Telegraphed by a shadow.
  class FallingPage {
    constructor(x, y, floorY) { this.x = x; this.y = y - 60; this.floorY = floorY; this.t = 0; this.warn = 0.95; this.vy = 0; this.dead = false; this.hostile = true; this.rot = Math.random() * 6; }
    box() { return { x: this.x - 20, y: this.y - 14, w: 40, h: 28 }; }
    update(dt, G) {
      this.t += dt;
      if (this.t > this.warn) {
        this.vy += 1600 * dt; this.y += this.vy * dt; this.rot += dt * 6;
        if (LD.Combat.enemyStrike(G, this.box(), 20, this.x, { cause: "marshal · falling page" })) this.dead = true;
        if (this.y > this.floorY - 10) {
          this.dead = true;
          W.effects.push(new LD.FirePatch(this.x, this.floorY, 50, 0.9, 0.02));
          P.burst(this.x, this.floorY, 8, "ember", { angle: -Math.PI / 2, spread: 1, min: 60, max: 200 });
        }
      }
      return !this.dead;
    }
    draw(ctx) {
      // shadow marker grows on the floor
      const k = U.clamp(this.t / this.warn, 0, 1);
      ctx.save();
      ctx.fillStyle = "rgba(15,8,5," + (0.25 + 0.35 * k) + ")";
      ctx.beginPath(); ctx.ellipse(this.x, this.floorY - 1, 10 + 18 * k, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,140,60," + 0.6 * k + ")"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      if (this.t > this.warn * 0.4) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.fillStyle = "#6a4a36"; ctx.fillRect(-16, -11, 32, 22);
        ctx.strokeStyle = Art.INK; ctx.lineWidth = 2; ctx.strokeRect(-16, -11, 32, 22);
        ctx.fillStyle = Art.FIRE; ctx.fillRect(-16, 6, 32, 5);
        ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, this.x, this.y, 36, "rgba(255,120,40,0.5)"); ctx.restore();
      }
    }
  }

  LD.BossTypes = { hart: Hart, marshal: Marshal };
  LD.drawSeal = drawSeal;
})();
