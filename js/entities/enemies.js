// EnemySystem: corrupted illustrations. Each family has its own silhouette, movement,
// telegraph (shape + motion + "!" mark, never color alone), voice and element.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, P = LD.Particles, W = LD.World;
  const T = U.TILE;

  class Enemy {
    constructor(kind, x, y, data) {
      this.k = kind; this.data = data;
      this.w = data.w; this.h = data.h;
      this.x = x * T - this.w / 2; this.y = y * T - this.h;
      this.homeX = this.x; this.homeY = this.y;
      this.hp = this.maxHp = data.hp; this.element = data.element;
      this.facing = -1; this.vx = 0; this.vy = 0;
      this.state = "idle"; this.stateT = 0; this.t = Math.random() * 10;
      this.poise = data.poise; this.hurtT = 0; this.invuln = 0; this.cd = 0;
      this.dead = false; this.deathT = 0; this.isEnemy = true; this.flying = !!data.flying;
      this.onGround = false; this.oneWay = !this.flying;
    }
    cx() { return this.x + this.w / 2; }
    cy() { return this.y + this.h / 2; }
    hitbox() { return this.dead ? null : { x: this.x, y: this.y, w: this.w, h: this.h }; }
    setState(s) { this.state = s; this.stateT = 0; }
    toPlayer(G) { const p = G.player; return { dx: p.cx() - this.cx(), dy: p.feet() - (this.y + this.h), p }; }
    telegraphing() { return false; }
    // Painted-sprite hooks: which strip to play (see assets/manifest.js) and where the feet are.
    // `durs` maps a state to its length so wind-ups/strikes play by progress, in sync with hitboxes.
    spriteY() { return this.y + this.h; }
    anim() {
      const name = (this.spriteMap && this.spriteMap[this.state]) || this.state;
      const d = this.durs && this.durs[this.state];
      if (d) return { name, p: this.stateT / d };
      if (name === "idle" || name === "walk") return { name, t: this.t };
      return { name, t: this.stateT };
    }

    takeHit(G, h) {
      this.hp -= h.dmg;
      this.hurtT = 0.16;
      this.poise -= h.stagger;
      this.vx = h.dir * h.knock / (this.data.weight || 1);
      if (!this.flying) this.vy = Math.min(this.vy, -120);
      LD.Audio.sfx.enemyHurt();
      if (this.hp <= 0) { this.die(G); return "hit"; }
      if (this.poise <= 0) { this.poise = this.data.poise; this.setState("stagger"); this.onStagger && this.onStagger(G); }
      return "hit";
    }

    die(G) {
      this.dead = true; this.deathT = 0;
      this.vx *= 0.3;
      LD.Audio.sfx.tear();
      P.burst(this.cx(), this.cy(), 22, "ink", { min: 80, max: 420, lift: 150, p: { color: Art.INK } });
      P.burst(this.cx(), this.cy(), 10, "scrap", { min: 60, max: 260, lift: 200, p: { color: "#e2d4b6", g: 400, life: 1.2, size: 7 } });
      if (Math.random() < D.pickups.mendChance) W.objs.push(new LD.Mend(this.cx(), this.cy()));
      G.S.flags.kills = (G.S.flags.kills || 0) + 1;
    }

    physics(dt) {
      if (this.flying) { W.moveBody(this, dt); return; }
      this.vy = Math.min(1000, this.vy + 2000 * dt);
      W.moveBody(this, dt);
    }

    ledgeAhead() {
      const fx = this.facing > 0 ? this.x + this.w + 4 : this.x - 4;
      return !W.groundAt(fx, this.y + this.h + 6) || W.pointSolid(fx, this.y + this.h - 10) ||
        W.hazardIn({ x: fx - 2, y: this.y + this.h - 4, w: 4, h: 20 });
    }

    contact(G) {
      if (!this.data.contact || this.state === "stagger" || this.dead) return;
      const hb = { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 6 };
      LD.Combat.enemyStrike(G, hb, this.data.dmg, this.cx());
    }

    update(dt, G) {
      this.t += dt; this.stateT += dt;
      this.hurtT = Math.max(0, this.hurtT - dt);
      this.cd = Math.max(0, this.cd - dt);
      if (this.dead) { this.deathT += dt; this.vx *= 0.9; if (!this.flying) this.physics(dt); return this.deathT < 0.6; }
      if (this.state === "stagger") {
        this.vx = U.approach(this.vx, 0, 900 * dt);
        if (this.stateT > (this.data.staggerTime || 0.9)) this.setState("idle");
      } else this.ai(dt, G);
      this.physics(dt);
      if (!this.flying && W.hazardIn({ x: this.x, y: this.y, w: this.w, h: this.h }) === "~") this.die(G);
      this.contact(G);
      if (this.cy() > W.h * T + 200) this.dead = true;
      return true;
    }

    draw(ctx, G) {
      ctx.save();
      const fade = this.dead && !this.isBoss ? Math.max(0, 1 - this.deathT / 0.6) : 1;
      ctx.globalAlpha = fade;
      if (Art.highContrast) { ctx.shadowColor = "rgba(255,248,230,0.95)"; ctx.shadowBlur = 6; }
      let painted = null;
      if (LD.Sprites.enabled(this.k)) {
        const a = this.dead ? { name: "death", t: this.deathT } : this.anim();
        painted = LD.Sprites.draw(ctx, this.k, a.name, a, this.cx(), this.spriteY(), this.facing, {
          alpha: this.spriteAlpha ? this.spriteAlpha() : 1,
          shadow: Art.highContrast ? "rgba(255,248,230,0.95)" : this.spriteShadow || null,
        });
      }
      if (!painted) this.drawBody(ctx, G);
      ctx.restore();
      if (this.hurtT > 0 && !this.dead) {
        ctx.save(); ctx.globalAlpha = (this.hurtT / 0.16) * (G.settings.reduceFlash ? 0.25 : 0.6);
        ctx.fillStyle = "#f5ecd8"; Art.blobPath(ctx, this.cx(), this.cy(), this.w * 0.55, this.h * 0.55, this.t, 12, 0.3); ctx.fill(); ctx.restore();
      }
      if (this.telegraphing() && !this.dead) Art.telegraph(ctx, this.cx(), this.y - 18, this.t);
      if (this.state === "stagger" && !this.dead) {
        for (let i = 0; i < 3; i++) {
          const a = this.t * 4 + i * 2.1;
          Art.text(ctx, "*", this.cx() + Math.cos(a) * 16, this.y - 6 + Math.sin(a) * 5, 22, { align: "center", color: Art.INK });
        }
      }
    }
    // small element sigil painted onto a body
    sigil(ctx, x, y, r = 6) {
      if (this.element === "none") return;
      ctx.save(); ctx.globalAlpha *= 0.85;
      ctx.fillStyle = "rgba(236,225,201,0.8)"; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 7); ctx.fill();
      Art.elementGlyph(ctx, this.element, x, y, r, LD.Elements.color(this.element) === Art.INK ? Art.INK : "#2a1d16", 1.6);
      ctx.restore();
    }
  }

  // =============================================================== Torn Paper Crawler
  class Crawler extends Enemy {
    constructor(x, y) { super("crawler", x, y, D.enemies.crawler); this.setState("patrol"); const d = this.data; this.spriteMap = { patrol: "idle" }; this.durs = { rear: d.rear, lunge: d.lungeTime }; }
    telegraphing() { return this.state === "rear"; }
    ai(dt, G) {
      const d = this.data, { dx, dy } = this.toPlayer(G);
      const see = Math.abs(dx) < d.aggro && Math.abs(dy) < 70 && !G.player.dead;
      switch (this.state) {
        case "idle": case "patrol":
          this.state = "patrol";
          this.vx = U.approach(this.vx, this.facing * d.speed, 600 * dt);
          if (this.onGround && (this.ledgeAhead() || this.hitWall)) { this.facing *= -1; this.vx = 0; }
          if (see && this.cd <= 0 && (Math.sign(dx) === this.facing || Math.abs(dx) < 120)) {
            this.facing = Math.sign(dx) || this.facing; this.setState("rear"); LD.Audio.sfx.chitter();
          }
          if (Math.random() < dt * 0.3) LD.Audio.sfx.chitter();
          break;
        case "rear":
          this.vx = U.approach(this.vx, 0, 1200 * dt);
          if (this.stateT > d.rear) { this.setState("lunge"); this.vx = this.facing * d.lungeSpeed; this.vy = -180; LD.Audio.sfx.swing(); }
          break;
        case "lunge":
          if (this.onGround && this.ledgeAhead()) this.vx = 0;
          LD.Combat.enemyStrike(G, { x: this.x - 4, y: this.y - 4, w: this.w + 8, h: this.h + 4 }, d.dmg, this.cx());
          if (this.stateT > d.lungeTime) this.setState("recover");
          break;
        case "recover":
          this.vx = U.approach(this.vx, 0, 900 * dt);
          if (this.stateT > d.recover) { this.setState("patrol"); this.cd = 0.8; }
          break;
      }
    }
    drawBody(ctx, G) {
      const x = this.cx(), y = this.y + this.h, f = this.facing, b = Art.boil;
      const rear = this.state === "rear" ? U.easeOut(this.stateT / this.data.rear) : this.state === "lunge" ? 0.6 : 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      // legs
      ctx.fillStyle = Art.INK;
      for (let i = 0; i < 6; i++) {
        const lx = -18 + i * 7, ph = this.t * (this.state === "patrol" ? 12 : 3) + i * 1.7;
        const lift = Math.max(0, Math.sin(ph)) * 5;
        const kx = lx + (i < 3 ? -4 : 4), ky = -14 - rear * (i > 3 ? 12 : 2);
        Art.brush(ctx, [lx, -10 - rear * (i > 3 ? 8 : 0), kx, ky - lift, kx + (i < 3 ? -5 : 6), -lift * 0.5], 2.4, { seed: b + i, taperStart: 0, taperEnd: 0.5 });
      }
      // folded-paper body
      ctx.rotate(-rear * 0.45);
      const shade = "#cbbb9a";
      const pts = [[-24, -10], [-10, -26], [6, -24], [24, -14], [20, -6], [-20, -4]];
      ctx.fillStyle = "#e0d2b3";
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + (U.hash(b + i) - 0.5), p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade;
      ctx.beginPath(); ctx.moveTo(-10, -26); ctx.lineTo(-2, -8); ctx.lineTo(-20, -4); ctx.lineTo(-24, -10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-10, -26); ctx.lineTo(-2, -8); ctx.moveTo(6, -24); ctx.lineTo(4, -6); ctx.stroke();
      // scribbled text on the paper
      ctx.strokeStyle = "rgba(21,16,13,0.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(-18 + k * 3, -12 + k * 3); ctx.lineTo(-6 + k * 2, -16 + k * 3); } ctx.stroke();
      // red eye
      ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(18, -14, 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffd9c0"; ctx.fillRect(18.5, -15.5, 1.2, 1.2);
      // mandibles
      ctx.fillStyle = Art.INK;
      Art.brush(ctx, [22, -10, 30 + rear * 4, -12 - rear * 3, 28, -6], 2.2, { seed: b });
      ctx.restore();
      this.sigil(ctx, x - f * 4, this.y + 8, 4.5);
    }
  }

  // =============================================================== Scribble Wretch
  class Wretch extends Enemy {
    constructor(x, y) { super("wretch", x, y, D.enemies.wretch); this.setState("wander"); this.hits = [false, false]; this.spriteMap = { wander: "idle" }; this.durs = { windup: this.data.windup, slash: this.data.slashTime }; }
    telegraphing() { return this.state === "windup"; }
    ai(dt, G) {
      const d = this.data, { dx, dy } = this.toPlayer(G);
      const see = Math.abs(dx) < d.aggro && Math.abs(dy) < 90 && !G.player.dead;
      switch (this.state) {
        case "idle": case "wander":
          this.state = "wander";
          if (see) {
            this.facing = Math.sign(dx) || this.facing;
            const jitter = Math.sin(this.t * 7) * 0.4 + 0.8;
            this.vx = U.approach(this.vx, this.facing * d.speed * jitter, 700 * dt);
            if (this.onGround && this.ledgeAhead()) this.vx = 0;
            if (Math.abs(dx) < d.reach + 6 && Math.abs(dy) < 50 && this.cd <= 0) { this.setState("windup"); LD.Audio.sfx.scribble(); }
          } else {
            this.vx = U.approach(this.vx, this.facing * 30, 300 * dt);
            if (this.onGround && (this.ledgeAhead() || this.hitWall || Math.abs(this.x - this.homeX) > 120)) this.facing *= -1;
          }
          break;
        case "windup":
          this.vx = U.approach(this.vx, 0, 1500 * dt);
          if (this.stateT > d.windup) { this.setState("slash"); this.hits = [false, false]; this.vx = this.facing * 160; }
          break;
        case "slash": {
          const w = this.stateT < 0.13 ? 0 : this.stateT > 0.18 && this.stateT < 0.32 ? 1 : -1;
          if (w >= 0 && !this.hits[w]) {
            if (this.stateT < 0.02 || (w === 1 && this.stateT < 0.2)) LD.Audio.sfx.swing();
            const box = { x: this.facing > 0 ? this.cx() : this.cx() - d.reach, y: this.y, w: d.reach, h: this.h };
            if (LD.Combat.enemyStrike(G, box, d.dmg, this.cx())) this.hits[w] = true;
          }
          this.vx = U.approach(this.vx, 0, 600 * dt);
          if (this.stateT > d.slashTime) this.setState("recover");
          break;
        }
        case "recover":
          this.vx = U.approach(this.vx, 0, 900 * dt);
          if (this.stateT > d.recover) { this.setState("wander"); this.cd = 0.5; }
          break;
      }
    }
    drawBody(ctx, G) {
      const x = this.cx(), y = this.y + this.h, f = this.facing;
      const wind = this.state === "windup" ? this.stateT / this.data.windup : 0;
      const slash = this.state === "slash";
      const r = U.rng(Art.boil * 13 + Math.floor(this.homeX));
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      const shake = wind * 3;
      ctx.translate((r() - 0.5) * shake, 0);
      ctx.strokeStyle = Art.INK; ctx.lineCap = "round";
      // body: tangled scribble loops, redrawn every frame
      const cyB = -30, rx = 16 + wind * 5, ry = 24 + wind * 3;
      for (let i = 0; i < 22; i++) {
        ctx.lineWidth = 0.8 + r() * 1.8;
        ctx.beginPath();
        let a = r() * 6.28;
        ctx.moveTo(Math.cos(a) * rx * r(), cyB + Math.sin(a) * ry * r());
        for (let k = 0; k < 4; k++) {
          a += 1 + r() * 2;
          ctx.quadraticCurveTo(Math.cos(a) * rx * 1.3, cyB + Math.sin(a) * ry * 1.2, Math.cos(a + 1) * rx * r(), cyB + Math.sin(a + 1) * ry * r());
        }
        ctx.stroke();
      }
      // head scribble
      for (let i = 0; i < 8; i++) { ctx.lineWidth = 1 + r(); ctx.beginPath(); ctx.arc(4 + (r() - 0.5) * 4, -58 + (r() - 0.5) * 4, 7 + r() * 4, r() * 6, r() * 6 + 3); ctx.stroke(); }
      ctx.fillStyle = "#f2e8d4"; ctx.fillRect(6, -60, 3, 2.5); ctx.fillRect(11, -59, 2.5, 2.5);
      // claw arms
      const reachA = slash ? (this.stateT < 0.16 ? -0.6 + this.stateT * 12 : 1.2 - (this.stateT - 0.18) * 10) : wind > 0 ? -1.4 * wind : 0.3;
      ctx.fillStyle = Art.INK;
      const ax = 10, ay = -40, len = 26 + (slash ? 20 : 0);
      const ex = ax + Math.cos(reachA) * len, ey = ay + Math.sin(reachA) * len;
      Art.brush(ctx, [ax, ay, (ax + ex) / 2, (ay + ey) / 2 - 4, ex, ey], 4, { seed: Art.boil });
      for (let c = -1; c <= 1; c++) Art.brush(ctx, [ex, ey, ex + Math.cos(reachA + c * 0.5) * 10, ey + Math.sin(reachA + c * 0.5) * 10], 2, { seed: c });
      Art.brush(ctx, [-8, -40, -18, -24 + Math.sin(this.t * 5) * 3, -16, -12], 3, { seed: Art.boil + 1 });
      // scribble legs
      Art.brush(ctx, [-6, -12, -8 + Math.sin(this.t * 9) * 4, -6, -10, 0], 3, { seed: 3 });
      Art.brush(ctx, [6, -12, 8 - Math.sin(this.t * 9) * 4, -6, 10, 0], 3, { seed: 4 });
      if (slash) {
        ctx.strokeStyle = "rgba(21,16,13,0.6)"; ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(20, -60 + k * 10); ctx.lineTo(20 + this.data.reach * 0.8, -50 + k * 12 + (r() - 0.5) * 6); ctx.stroke(); }
      }
      ctx.restore();
    }
  }

  // =============================================================== Ink Moth
  class Moth extends Enemy {
    constructor(x, y) {
      super("moth", x, y, D.enemies.moth);
      this.y = y * T - this.h / 2; this.homeY = this.y; this.homeX = this.x;
      this.setState("hover"); this.cd = 1 + Math.random();
      this.spriteMap = { hover: "idle" }; this.durs = { tele: this.data.telegraph };
    }
    spriteY() { return this.cy(); }
    telegraphing() { return this.state === "tele"; }
    ai(dt, G) {
      const d = this.data, { dx, p } = this.toPlayer(G);
      const dist = Math.hypot(dx, p.cy() - this.cy());
      switch (this.state) {
        case "idle": case "hover": {
          this.state = "hover";
          let tx = this.homeX, ty = this.homeY + Math.sin(this.t * 1.7) * 18;
          if (dist < d.aggro && !p.dead) {
            tx = p.cx() - Math.sign(dx || 1) * 150 - this.w / 2;
            ty = p.y - 110 + Math.sin(this.t * 2.3) * 22;
            this.facing = Math.sign(dx) || 1;
            if (this.cd <= 0) { this.setState("tele"); LD.Audio.sfx.flutter(); }
          }
          this.vx = U.approach(this.vx, U.clamp((tx - this.x) * 2, -d.speed, d.speed), 400 * dt);
          this.vy = U.approach(this.vy, U.clamp((ty - this.y) * 2, -d.speed, d.speed), 400 * dt);
          if (Math.random() < dt * 0.4) LD.Audio.sfx.flutter();
          break;
        }
        case "tele":
          this.vx *= 0.9; this.vy *= 0.9;
          if (this.stateT > d.telegraph) {
            const ang = Math.atan2(p.cy() - this.cy(), p.cx() - this.cx());
            W.projectiles.push(new Projectile(this.cx(), this.cy(), Math.cos(ang) * d.shotSpeed, Math.sin(ang) * d.shotSpeed, { dmg: d.dmg, g: 120, kind: "ink" }));
            LD.Audio.sfx.drip();
            this.vx = -Math.cos(ang) * 80; this.vy = -Math.sin(ang) * 80;
            this.cd = d.shootEvery; this.setState("hover");
          }
          break;
      }
      if (Math.random() < dt * 3) P.add({ kind: "ink", x: this.cx(), y: this.cy() + 6, vx: 0, vy: 20, g: 400, color: Art.INK, size: 1.6, life: 0.6 });
    }
    physics(dt) { W.moveBody(this, dt); }
    drawBody(ctx, G) {
      const x = this.cx(), y = this.cy(), f = this.facing;
      const tele = this.state === "tele";
      const flap = Math.sin(this.t * (tele ? 30 : 16));
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(1, s * (0.35 + Math.abs(flap) * 0.65) * (tele ? 1.2 : 1));
        ctx.fillStyle = "#d9cdb3"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-26, -34, -8, -30); ctx.quadraticCurveTo(12, -34, 22, -20); ctx.quadraticCurveTo(10, -6, 0, 0); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -26); ctx.moveTo(0, 0); ctx.lineTo(8, -24); ctx.stroke();
        // eye-spot: an ink ring that opens during the telegraph
        ctx.fillStyle = Art.INK; ctx.beginPath(); ctx.arc(-2, -20, tele ? 6 : 3.5, 0, 7); ctx.fill();
        if (tele) { ctx.fillStyle = "#f3e9d2"; ctx.beginPath(); ctx.arc(-2, -20, 2.5, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      ctx.fillStyle = Art.INK;
      Art.brush(ctx, [-12, 0, 0, -2, 12, 1], 6, { seed: Art.boil });
      Art.brush(ctx, [12, -1, 20, -10, 24, -12], 1.4, { seed: 1 });
      Art.brush(ctx, [12, -1, 22, -6, 27, -6], 1.4, { seed: 2 });
      ctx.restore();
      this.sigil(ctx, x, y + 10, 4);
    }
  }

  // =============================================================== Looseleaf Guard
  class Guard extends Enemy {
    constructor(x, y) { super("guard", x, y, D.enemies.guard); this.setState("patrol"); this.frame = 0; this.frameT = 0; this.hitDone = false; this.spriteMap = { patrol: "walk", stance: "idle" }; this.durs = { windup: this.data.windup, thrust: this.data.thrustTime }; }
    anim() { if (this.state === "stance" && Math.abs(this.vx) > 10) return { name: "walk", t: this.t }; return super.anim(); }
    telegraphing() { return this.state === "windup"; }
    shielding() { return this.state === "patrol" || this.state === "stance" || this.state === "idle"; }
    takeHit(G, h) {
      if (this.shielding() && !h.breaksGuard && Math.sign(G.player.cx() - this.cx()) === this.facing) {
        this.vx = -Math.sign(G.player.cx() - this.cx()) * 40;
        this.shieldFlash = 0.2;
        if (!G.S.flags.hintGuard) { G.S.flags.hintGuard = true; LD.HUD.thought("Its page-shield turns the blow. Strike after its thrust, from behind — or with something heavy."); }
        return "blocked";
      }
      const r = super.takeHit(G, h);
      if (h.breaksGuard && this.shielding() && !this.dead) this.setState("stagger");
      return r;
    }
    ai(dt, G) {
      const d = this.data, { dx, dy } = this.toPlayer(G);
      const see = Math.abs(dx) < d.aggro && Math.abs(dy) < 80 && !G.player.dead;
      this.shieldFlash = Math.max(0, (this.shieldFlash || 0) - dt);
      switch (this.state) {
        case "idle": case "patrol":
          this.state = "patrol";
          this.vx = U.approach(this.vx, this.facing * d.speed, 300 * dt);
          if (this.onGround && (this.ledgeAhead() || this.hitWall || Math.abs(this.x - this.homeX) > 140)) this.facing *= -1;
          if (see) { this.setState("stance"); this.facing = Math.sign(dx) || this.facing; LD.Audio.sfx.creak(); }
          break;
        case "stance":
          this.facing = Math.sign(dx) || this.facing;
          if (Math.abs(dx) > d.reach - 10) { this.vx = U.approach(this.vx, this.facing * d.speed * 1.4, 400 * dt); if (this.onGround && this.ledgeAhead()) this.vx = 0; }
          else this.vx = U.approach(this.vx, 0, 600 * dt);
          if (!see && this.stateT > 1.5) this.setState("patrol");
          if (Math.abs(dx) < d.reach + 10 && this.cd <= 0 && Math.abs(dy) < 60) { this.setState("windup"); LD.Audio.sfx.creak(); }
          break;
        case "windup":
          this.vx = U.approach(this.vx, 0, 900 * dt);
          if (this.stateT > d.windup) { this.setState("thrust"); this.hitDone = false; this.vx = this.facing * 260; LD.Audio.sfx.swing(); }
          break;
        case "thrust": {
          const box = { x: this.facing > 0 ? this.cx() : this.cx() - d.reach - 10, y: this.y + 18, w: d.reach + 10, h: 22 };
          if (!this.hitDone && LD.Combat.enemyStrike(G, box, d.dmg, this.cx())) this.hitDone = true;
          this.vx = U.approach(this.vx, 0, 900 * dt);
          if (this.stateT > d.thrustTime) this.setState("recover");
          break;
        }
        case "recover":
          this.vx = U.approach(this.vx, 0, 900 * dt);
          if (this.stateT > d.recover) { this.setState("stance"); this.cd = 1.0; }
          break;
      }
    }
    drawBody(ctx, G) {
      // damaged animation: the pose only updates at a stuttering, skipping frame rate
      this.frameT -= 1 / 60;
      if (this.frameT <= 0) { this.frame = this.t; this.frameT = Math.random() < 0.15 ? 0.25 : 0.11; this.skip = Math.random() < 0.1 ? (Math.random() - 0.5) * 6 : 0; }
      const t = this.frame;
      const x = this.cx() + (this.skip || 0), y = this.y + this.h, f = this.facing;
      const st = this.state;
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      const walk = st === "patrol" || (st === "stance" && Math.abs(this.vx) > 10);
      const ph = walk ? Math.sin(t * 7) : 0;
      ctx.fillStyle = Art.INK;
      Art.brush(ctx, [-4, -30, -6 - ph * 6, -14, -8 - ph * 8, 0], 4, { seed: 1, taperStart: 0 });
      Art.brush(ctx, [4, -30, 6 + ph * 6, -14, 8 + ph * 8, 0], 4, { seed: 2, taperStart: 0 });
      // paper-page body
      ctx.fillStyle = "#ddd0b2"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-13, -30); ctx.lineTo(-11, -58); ctx.lineTo(12, -60); ctx.lineTo(14, -28); ctx.lineTo(0, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(21,16,13,0.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); for (let k = 0; k < 5; k++) { ctx.moveTo(-8, -52 + k * 5); ctx.lineTo(8, -53 + k * 5); } ctx.stroke();
      // head + tall conical hat
      ctx.fillStyle = "#ddd0b2"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(1, -64, 6, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#2c2622";
      ctx.beginPath(); ctx.moveTo(-9, -66); ctx.lineTo(2, -92); ctx.lineTo(11, -65); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f1e6cf"; ctx.fillRect(3, -65, 2, 2);
      // spear
      const wind = st === "windup" ? U.easeOut(this.stateT / this.data.windup) : 0;
      const thr = st === "thrust" ? U.easeOut(this.stateT / this.data.thrustTime) : st === "recover" ? 1 - U.easeOut(this.stateT / 0.4) : 0;
      const sx = 6 - wind * 22 + thr * 40, sy = -42;
      ctx.fillStyle = Art.INK;
      Art.brush(ctx, [sx - 40, sy + 2, sx + 30, sy - 1, sx + 70, sy - 2], 3, { seed: 3, taperStart: 0, taperEnd: 0 });
      ctx.beginPath(); ctx.moveTo(sx + 70, sy - 7); ctx.lineTo(sx + 92, sy - 2); ctx.lineTo(sx + 70, sy + 3); ctx.closePath(); ctx.fill();
      // page-shield (a bound book cover), lowered while recovering
      const shieldUp = this.shielding();
      ctx.save();
      ctx.translate(shieldUp ? 14 : 4, shieldUp ? -46 : -34); ctx.rotate(shieldUp ? 0 : 0.9);
      ctx.fillStyle = this.shieldFlash > 0 ? "#fff3dc" : "#6e5a40"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(8, -18); ctx.lineTo(8, 20); ctx.lineTo(0, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#c9b890"; ctx.fillRect(1.5, -14, 5, 30);
      ctx.restore();
      ctx.restore();
      this.sigil(ctx, x - f * 1, this.y + 36, 4);
    }
  }

  // =============================================================== Cinder Leaflet
  class Leaflet extends Enemy {
    constructor(x, y) { super("leaflet", x, y, D.enemies.leaflet); this.setState("wait"); this.cd = Math.random(); this.spriteMap = { wait: "idle" }; this.durs = { crouch: this.data.crouch }; }
    telegraphing() { return this.state === "crouch"; }
    ai(dt, G) {
      const d = this.data, { dx, dy } = this.toPlayer(G);
      const see = Math.abs(dx) < d.aggro && Math.abs(dy) < 120 && !G.player.dead;
      switch (this.state) {
        case "idle": case "wait":
          this.state = "wait";
          if (this.onGround) this.vx = U.approach(this.vx, 0, 800 * dt);
          if (see && this.cd <= 0 && this.onGround) { this.facing = Math.sign(dx) || 1; this.setState("crouch"); }
          if (Math.random() < dt * 0.5) LD.Audio.sfx.crackle();
          break;
        case "crouch":
          if (this.stateT > d.crouch) {
            this.setState("hop");
            this.vx = this.facing * U.clamp(Math.abs(dx) * 1.3, 120, 260); this.vy = -560;
          }
          break;
        case "hop":
          if (this.onGround && this.stateT > 0.1) {
            W.effects.push(new FirePatch(this.cx(), this.y + this.h, 56, 1.6, 0.35));
            this.vx = 0; this.cd = d.hopEvery; this.setState("wait");
          }
          break;
      }
      if (Math.random() < dt * 8) P.add({ kind: "ember", x: this.cx() + U.rand(-10, 10), y: this.y + 6, vx: U.rand(-20, 20), vy: -U.rand(30, 70), g: -20, size: 2, life: 0.8 });
    }
    drawBody(ctx, G) {
      const x = this.cx(), y = this.y + this.h, f = this.facing;
      const cr = this.state === "crouch" ? this.stateT / this.data.crouch : 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(f * (1 + cr * 0.2), 1 - cr * 0.3);
      ctx.fillStyle = "#6a4a36"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-18, -22, -4, -28); ctx.quadraticCurveTo(10, -30, 14, -16); ctx.quadraticCurveTo(18, -4, 10, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      // burning curled edge
      ctx.fillStyle = Art.FIRE;
      ctx.beginPath(); ctx.moveTo(-4, -28);
      for (let i = 0; i < 6; i++) ctx.lineTo(-4 + i * 3.6, -28 - (i % 2 ? 6 + Math.sin(this.t * 20 + i) * 3 : 0) + i * 2);
      ctx.lineTo(14, -16); ctx.quadraticCurveTo(4, -22, -4, -28); ctx.fill();
      ctx.fillStyle = "#ffd28a"; ctx.fillRect(2, -24, 2, 2);
      ctx.fillStyle = "#140c08"; ctx.beginPath(); ctx.arc(2, -14, 2.4, 0, 7); ctx.arc(8, -13, 2, 0, 7); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, this.y + 6, 40, "rgba(255,120,40,0.35)"); ctx.restore();
      this.sigil(ctx, x, this.y - 8, 4);
    }
  }

  // =============================================================== Projectiles & effects
  class Projectile {
    constructor(x, y, vx, vy, o = {}) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.r = o.r || 7; this.dmg = o.dmg || 20; this.g = o.g || 0; this.kind = o.kind || "ink";
      this.life = o.life || 4; this.hostile = true; this.dead = false; this.t = 0; this.onLand = o.onLand;
    }
    box() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
    update(dt, G) {
      this.t += dt; this.vy += this.g * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.t > this.life) this.dead = true;
      if (W.pointSolid(this.x, this.y)) {
        this.dead = true;
        if (this.onLand) this.onLand(G, this);
        P.burst(this.x, this.y, 6, this.kind === "ember" ? "ember" : "ink", { min: 40, max: 160, p: { color: Art.INK } });
      }
      if (!this.dead && LD.Combat.enemyStrike(G, this.box(), this.dmg, this.x - this.vx)) this.dead = true;
      if (Math.random() < 0.6) P.add({ kind: this.kind === "ember" ? "ember" : "ink", x: this.x, y: this.y, vx: 0, vy: 0, g: this.kind === "ember" ? -30 : 200, color: Art.INK, size: this.kind === "ember" ? 2 : 2.2, life: 0.4 });
      return !this.dead;
    }
    draw(ctx) {
      if (this.kind === "ember") {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        Art.glow(ctx, this.x, this.y, 26, "rgba(255,140,50,0.8)");
        ctx.restore();
        ctx.fillStyle = "#2a130a"; ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.8, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffcf85"; ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.4, 0, 7); ctx.fill();
        return;
      }
      ctx.fillStyle = Art.INK;
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.vy, this.vx));
      ctx.beginPath(); ctx.ellipse(0, 0, this.r * 1.4, this.r * 0.9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(236,225,201,0.6)"; ctx.fillRect(this.r * 0.2, -this.r * 0.4, 3, 2);
      ctx.restore();
    }
  }

  // A burning strip of page: warns (smoke + cracks), then burns.
  class FirePatch {
    constructor(x, y, w, dur, warn = 0.9, o = {}) {
      this.x = x; this.y = y; this.w = w; this.dur = dur; this.warn = warn; this.t = 0; this.dmg = o.dmg || 20; this.h = o.h || 46;
    }
    active() { return this.t > this.warn && this.t < this.warn + this.dur; }
    update(dt, G) {
      this.t += dt;
      if (this.active()) {
        LD.Combat.enemyStrike(G, { x: this.x - this.w / 2 + 4, y: this.y - this.h, w: this.w - 8, h: this.h }, this.dmg, this.x);
        if (Math.random() < 0.5) P.add({ kind: "ember", x: this.x + U.rand(-this.w / 2, this.w / 2), y: this.y - 10, vx: U.rand(-20, 20), vy: -U.rand(60, 160), g: -40, size: 2.2, life: 0.9 });
        if (Math.random() < dt * 4) LD.Audio.sfx.crackle();
      } else if (this.t < this.warn && Math.random() < 0.3) {
        P.add({ kind: "dust", x: this.x + U.rand(-this.w / 2, this.w / 2), y: this.y - 4, vx: 0, vy: -U.rand(20, 50), g: -10, color: "rgba(60,50,45,0.5)", size: 4, life: 0.8 });
      }
      return this.t < this.warn + this.dur + 0.3;
    }
    draw(ctx) {
      const x0 = this.x - this.w / 2;
      if (this.t < this.warn) {
        // warning: glowing crack lines in the page + hatch marks (shape cue)
        const k = this.t / this.warn;
        ctx.save();
        ctx.strokeStyle = "rgba(255,150,70," + (0.3 + k * 0.6) + ")"; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) { const cx = x0 + (i + 0.5) * (this.w / 5); ctx.moveTo(cx - 6, this.y - 2); ctx.lineTo(cx, this.y - 6 - k * 6); ctx.lineTo(cx + 6, this.y - 2); }
        ctx.stroke();
        ctx.fillStyle = "rgba(21,16,13," + 0.25 * k + ")"; ctx.fillRect(x0, this.y - 3, this.w, 3);
        ctx.restore();
        return;
      }
      const k = this.t - this.warn;
      const fade = k > this.dur ? 1 - (k - this.dur) / 0.3 : Math.min(1, k * 8);
      ctx.save(); ctx.globalAlpha = Math.max(0, fade);
      ctx.globalCompositeOperation = "lighter";
      Art.glow(ctx, this.x, this.y - 18, this.w * 0.8, "rgba(255,110,40,0.5)");
      ctx.globalCompositeOperation = "source-over";
      const n = Math.max(3, Math.round(this.w / 12));
      for (let i = 0; i < n; i++) {
        const fx = x0 + (i + 0.5) * (this.w / n), h = this.h * (0.55 + 0.45 * U.noise1(this.t * 8 + i * 3));
        ctx.fillStyle = "#e0662a";
        ctx.beginPath(); ctx.moveTo(fx - 7, this.y); ctx.quadraticCurveTo(fx - 6, this.y - h * 0.5, fx + Math.sin(this.t * 12 + i) * 3, this.y - h); ctx.quadraticCurveTo(fx + 6, this.y - h * 0.5, fx + 7, this.y); ctx.fill();
        ctx.fillStyle = "#ffcf7a";
        ctx.beginPath(); ctx.moveTo(fx - 3, this.y); ctx.quadraticCurveTo(fx - 2, this.y - h * 0.3, fx, this.y - h * 0.55); ctx.quadraticCurveTo(fx + 2, this.y - h * 0.3, fx + 3, this.y); ctx.fill();
      }
      ctx.fillStyle = Art.INK;
      ctx.fillRect(x0, this.y - 2, this.w, 3);
      ctx.restore();
    }
  }

  LD.Enemy = Enemy;
  LD.Projectile = Projectile;
  LD.FirePatch = FirePatch;
  LD.EnemyTypes = { crawler: Crawler, wretch: Wretch, moth: Moth, guard: Guard, leaflet: Leaflet };
})();
