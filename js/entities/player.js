// PlayerController + StaminaSystem + HealthSystem + the Sketcher's hand-drawn animation.
// The body is a small skeleton posed per state; the cloak & scarf are verlet chains so the
// fabric trails and settles. Lines re-jitter ("boil") ~10x per second like drawn frames.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, P = LD.Particles, W = LD.World, I = LD.Input;
  const PD = D.player;

  // The empty pen, in weapon-space (x: 0 = grip .. 1 = tip)
  const NIB_STROKES = [[0, 0, 0.5, 0.01, 0.8, 0], [0.8, -0.06, 1, 0, 0.8, 0.06]];

  // Swing arcs per weapon & direction. Angles in facing-space: 0 = forward, -PI/2 = up.
  // a0 wind-up pose, a1->a2 active sweep, a3 rest; e0/e2 = hand extension (thrusts).
  const SWINGS = {
    nib: { 1: { a0: -0.4, a1: -0.2, a2: 0.1, a3: 0.3, e0: -12, e2: 14 }, 2: { a0: -1.2, a1: -1.0, a2: 0.9, a3: 1.0 } },
    blade: {
      1: { a0: -2.3, a1: -1.8, a2: 1.0, a3: 1.2 },
      2: { a0: 1.3, a1: 1.1, a2: -1.5, a3: -1.3 },
      3: { a0: -0.2, a1: -0.1, a2: 0.05, a3: 0.25, e0: -16, e2: 20 },
    },
    polearm: { 1: { a0: -2.1, a1: -1.6, a2: 0.75, a3: 0.9 }, 2: { a0: -0.08, a1: -0.05, a2: 0.02, a3: 0.2, e0: -24, e2: 30 } },
    heavy: { 1: { a0: -2.9, a1: -2.5, a2: 1.35, a3: 1.45 } },
    up: { a0: 1.1, a1: 0.7, a2: -2.6, a3: -2.4 },
    down: { a0: -1.0, a1: -0.6, a2: 2.3, a3: 2.0 },
  };
  const IDLE_ANGLE = { nib: 0.7, blade: 0.95, polearm: -1.25, heavy: -2.35 };

  const limb = (x, y, a, len) => [x + Math.sin(a) * len, y + Math.cos(a) * len];

  class Player {
    constructor(x, y) {
      this.w = PD.w; this.h = PD.h;
      this.x = x - this.w / 2; this.y = y - this.h;
      this.vx = 0; this.vy = 0; this.facing = 1; this.visFacing = 1;
      this.state = "normal"; this.stateT = 0; this.t = 0;
      this.stamina = PD.stamina.max; this.stamDelay = 0; this.exhausted = false;
      this.invuln = 0; this.coyote = 0; this.jumpBuf = 0; this.jumping = false; this.dropT = 0;
      this.comboIdx = 0; this.comboT = 0; this.atkBuf = 0; this.atk = null; this.trail = null;
      this.airDashes = 1; this.dashCD = 0; this.folding = false;
      this.runPhase = 0; this.landT = 0; this.lookT = 0; this.lookDir = 0;
      this.control = true; this.auto = null; this.dead = false; this.hurtT = 0;
      this.lastSafe = { x: this.x, y: this.y }; this.safeT = 0;
      this.interactTarget = null; this.stepT = 0; this.flash = 0;
      this.cloak = []; this.scarf = [];
      for (let i = 0; i < 6; i++) this.cloak.push({ x: this.cx() - i * 6, y: this.y + 16 + i * 6, px: this.cx() - i * 6, py: this.y + 16 + i * 6 });
      for (let i = 0; i < 4; i++) this.scarf.push({ x: this.cx() - i * 5, y: this.y + 12, px: this.cx() - i * 5, py: this.y + 12 });
    }
    cx() { return this.x + this.w / 2; }
    cy() { return this.y + this.h / 2; }
    feet() { return this.y + this.h; }
    hurtbox() { return { x: this.x + 3, y: this.y + 6, w: this.w - 6, h: this.h - 6 }; }
    setPos(fx, fy) { this.x = fx - this.w / 2; this.y = fy - this.h; this.resetCloth(); }
    resetCloth() {
      this.cloak.forEach((c, i) => { c.x = c.px = this.cx() - this.facing * i * 6; c.y = c.py = this.y + 16 + i * 6; });
      this.scarf.forEach((c, i) => { c.x = c.px = this.cx() - this.facing * i * 5; c.y = c.py = this.y + 12; });
    }
    iframes() { return this.invuln > 0 || (this.state === "dodge" && this.stateT >= PD.dodge.iStart && this.stateT <= PD.dodge.iEnd) || this.state === "fold" || this.state === "dead"; }
    weaponData(S) { return D.weapons[S.weapon.cls] || D.weapons.nib; }

    setState(s) { this.state = s; this.stateT = 0; }

    useStamina(n) {
      this.stamina -= n; this.stamDelay = PD.stamina.delay;
      if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true; }
    }

    // ---------------------------------------------------------------- update
    update(dt, G) {
      const S = G.S;
      this.t += dt; this.stateT += dt;
      this.invuln = Math.max(0, this.invuln - dt);
      this.dashCD = Math.max(0, this.dashCD - dt);
      this.comboT = Math.max(0, this.comboT - dt);
      this.landT = Math.max(0, this.landT - dt);
      this.dropT = Math.max(0, this.dropT - dt);
      this.jumpBuf = Math.max(0, this.jumpBuf - dt);
      this.atkBuf = Math.max(0, this.atkBuf - dt);
      this.flash = Math.max(0, this.flash - dt);
      if (this.trail) { this.trail.life -= dt; if (this.trail.life <= 0) this.trail = null; }

      if (this.state === "dead") {
        this.vy += PD.gravity * dt; this.vx *= 0.9;
        W.moveBody(this, dt);
        if (Math.random() < 0.5) P.add({ kind: "ink", x: this.cx() + U.rand(-16, 16), y: this.feet() - U.rand(0, 20), vy: -U.rand(30, 90), vx: U.rand(-20, 20), g: -60, color: Art.INK, size: U.rand(2, 4), life: 1 });
        this.updateCloth(dt);
        return;
      }
      if (this.state === "hazard") {
        if (this.stateT > 0.45) this.respawnSafe(G);
        return;
      }

      // --- input
      let ax = 0, ay = 0, jumpP = false, jumpH = false, atkP = false, dodgeP = false, dashP = false, guardH = false, interactP = false;
      if (this.control && !G.inputLocked) {
        ax = I.axisX(); ay = I.axisY();
        jumpP = I.pressed("jump"); jumpH = I.down("jump");
        atkP = I.pressed("attack"); dodgeP = I.pressed("dodge"); dashP = I.pressed("dash");
        guardH = I.down("guard"); interactP = I.pressed("interact") || (I.pressed("up") && this.interactTarget && this.onGround);
      } else if (this.auto) {
        ax = this.auto.dir || 0;
        if (this.auto.x != null && Math.abs(this.cx() - this.auto.x) < 6) { ax = 0; this.auto = null; }
      }
      if (jumpP) this.jumpBuf = PD.jumpBuffer;
      if (atkP) this.atkBuf = 0.18;

      // --- stamina
      if (this.stamDelay > 0) this.stamDelay -= dt;
      else if (this.state !== "guard") this.stamina = Math.min(PD.stamina.max, this.stamina + PD.stamina.regen * (this.exhausted ? 0.8 : 1) * dt);
      if (this.exhausted && this.stamina >= PD.stamina.exhaustedUntil) this.exhausted = false;

      if (this.onGround) { this.coyote = PD.coyote; this.airDashes = D.abilities.foldstep.airUses; }
      else this.coyote -= dt;

      const wd = this.weaponData(S);
      let gravity = true;

      switch (this.state) {
        case "normal": {
          this.move(ax, 1, dt);
          if (ax !== 0) this.facing = Math.sign(ax);
          // look up/down when standing still
          if (this.onGround && ax === 0 && ay !== 0 && Math.abs(this.vx) < 10) { this.lookT += dt; if (this.lookT > 0.45) this.lookDir = ay; }
          else { this.lookT = 0; this.lookDir = 0; }
          if (this.jumpBuf > 0 && (this.coyote > 0)) {
            if (ay > 0 && this.onGround && this.groundTile === "=") { this.dropT = 0.28; this.y += 2; this.jumpBuf = 0; }
            else this.doJump();
          }
          if (this.jumping && !jumpH && this.vy < 0) { this.vy *= PD.jumpCut; this.jumping = false; }
          if (this.atkBuf > 0) this.startAttack(G, ay);
          else if (dashP && S.flags.foldstep) this.startFold(G, ax, ay);
          else if (dashP && !S.flags.foldstep && !this._foldHintT) { this._foldHintT = 1; }
          else if (dodgeP && this.onGround) this.startDodge(G, ax);
          else if (guardH && this.onGround && !this.exhausted) { this.setState("guard"); }
          else if (interactP && this.interactTarget) { this.interactTarget.interact(G, this); this.vx = 0; }
          break;
        }
        case "attack": {
          this.updateAttack(G, dt, ax, ay, wd);
          if (this.state === "attack" && this.atk && this.atk.phase === "recovery") {
            if (dodgeP && this.onGround && !this.exhausted) { this.atk = null; this.startDodge(G, ax); }
            else if (dashP && S.flags.foldstep) { this.atk = null; this.startFold(G, ax, ay); }
          }
          if (this.jumping && !jumpH && this.vy < 0) { this.vy *= PD.jumpCut; this.jumping = false; }
          break;
        }
        case "dodge": {
          const d = PD.dodge, k = this.stateT / d.dur;
          this.vx = this.dodgeDir * d.speed * (1 - k * k * 0.85);
          if (this.stateT > d.dur) { this.setState("normal"); if (this.atkBuf > 0) this.startAttack(G, ay); }
          if (Math.random() < 0.5) P.add({ kind: "dust", x: this.cx() - this.dodgeDir * 10, y: this.feet() - 3, vx: -this.dodgeDir * 40, vy: -20, g: 0, color: "rgba(60,45,35,0.5)", size: 3, life: 0.4 });
          break;
        }
        case "fold": {
          gravity = false;
          const a = D.abilities.foldstep;
          this.vx = this.foldDir.x * a.speed; this.vy = this.foldDir.y * a.speed;
          if (Math.random() < 0.9) P.add({ kind: "crease", x: this.cx(), y: this.feet(), vx: 0, vy: 0, g: 0, life: 0.25, sx: this.facing * 0.7 });
          // fold any veil we pass through
          for (const [tx, ty] of W.rectTouches({ x: this.x - 4, y: this.y, w: this.w + 8, h: this.h }, "V")) {
            const k = tx + "," + ty;
            if (!W.veilFx.has(k) || G.time - W.veilFx.get(k) > 0.9) { W.veilFx.set(k, G.time); if (!this._veilSnd) { LD.Audio.sfx.veil(); this._veilSnd = 0.3; } }
          }
          if (this.stateT > a.dur) {
            this.folding = false;
            this.vx *= 0.4; this.vy = this.foldDir.y < 0 ? this.vy * 0.35 : Math.min(this.vy, 200) * 0.5;
            this.setState("normal");
            // must not end inside a veil
            if (W.rectTouches(this, "V").length) { this.folding = true; this.state = "fold"; this.stateT = a.dur - 0.02; }
          }
          break;
        }
        case "guard": {
          this.move(ax, 0, dt);
          this.vx = U.approach(this.vx, ax * PD.guard.moveSpeed, 2000 * dt);
          if (!guardH || !this.onGround || this.exhausted) this.setState("normal");
          if (this.atkBuf > 0) { this.setState("normal"); this.startAttack(G, ay); }
          break;
        }
        case "hurt": {
          this.vx = U.approach(this.vx, 0, 900 * dt);
          if (this.stateT > 0.32) this.setState("normal");
          break;
        }
        case "stagger": {
          this.vx = U.approach(this.vx, 0, 1200 * dt);
          if (this.stateT > 0.7) this.setState("normal");
          break;
        }
        case "raise":
        case "still": {
          this.vx = U.approach(this.vx, 0, 2000 * dt);
          if (this.state === "raise" && this.stateT > 1.1) this.setState("normal");
          break;
        }
      }
      if (this._veilSnd) this._veilSnd = Math.max(0, this._veilSnd - dt);

      // --- physics
      if (gravity) this.vy = Math.min(PD.maxFall, this.vy + PD.gravity * dt * (this.vy > 0 ? 1.12 : 1));
      const wasGround = this.onGround, fallV = this.vy;
      W.moveBody(this, dt);
      if (this.onGround && !wasGround && fallV > 250) {
        this.landT = 0.13; LD.Audio.sfx.land();
        P.burst(this.cx(), this.feet(), 6, "dust", { angle: -Math.PI / 2, spread: 1.4, min: 40, max: 140, p: { g: 200, color: "rgba(70,55,45,0.5)", size: 3, life: 0.4 } });
        this.jumping = false;
      }
      if (this.hitCeil) this.jumping = false;

      // footsteps
      if (this.onGround && Math.abs(this.vx) > 60) {
        this.runPhase += dt * Math.abs(this.vx) / 30;
        this.stepT -= dt;
        if (this.stepT <= 0) { this.stepT = 0.29 * (PD.runSpeed / Math.max(120, Math.abs(this.vx))); LD.Audio.sfx.step(); if (Math.random() < 0.25) this.inkDrip(); }
      } else if (this.onGround) this.runPhase = U.lerp(this.runPhase, Math.round(this.runPhase / Math.PI) * Math.PI, 0.2);

      // hazards
      const hz = W.hazardIn(this.hurtbox());
      if (hz && this.state !== "hazard") this.hitHazard(G, hz);

      // remember safe ground
      this.safeT -= dt;
      if (this.onGround && this.safeT <= 0 && this.state === "normal") {
        const fx = this.cx(), fy = this.feet() + 4, T = U.TILE;
        const near = W.hazardIn({ x: fx - T * 1.4, y: fy - T, w: T * 2.8, h: T * 1.5 });
        const edgeL = W.groundAt(fx - 14, fy), edgeR = W.groundAt(fx + 14, fy);
        if (!near && edgeL && edgeR && !(G.boss && G.boss.collapseAt && G.boss.collapseAt(fx))) { this.lastSafe = { x: this.x, y: this.y }; this.safeT = 0.2; }
      }

      this.visFacing = U.approach(this.visFacing, this.facing, dt * 14);
      this.updateCloth(dt);
      this.findInteract(G);
    }

    move(ax, mult, dt) {
      const target = ax * PD.runSpeed * mult;
      const accel = this.onGround ? (ax !== 0 ? PD.accelGround : PD.friction) : PD.accelAir;
      this.vx = U.approach(this.vx, target, accel * dt);
    }

    doJump() {
      this.vy = -PD.jumpVel; this.jumping = true; this.onGround = false;
      this.coyote = 0; this.jumpBuf = 0;
      LD.Audio.sfx.jump();
      P.burst(this.cx(), this.feet(), 4, "dust", { angle: -Math.PI / 2, spread: 1.2, min: 30, max: 90, p: { g: 100, color: "rgba(70,55,45,0.45)", size: 3, life: 0.35 } });
    }

    inkDrip() {
      const fx = this.cx() + this.visFacing * 10;
      P.add({ kind: "ink", x: fx, y: this.y + 34, vx: -this.vx * 0.1, vy: 40, g: 900, color: Art.INK, size: 1.8, life: 0.5, floor: this.feet() });
    }

    startDodge(G, ax) {
      if (this.exhausted || this.stamina <= 0) { LD.Audio.sfx.uiNo(); return; }
      this.useStamina(PD.dodge.cost);
      this.dodgeDir = ax !== 0 ? Math.sign(ax) : this.facing;
      this.setState("dodge");
      LD.Audio.sfx.dodge();
    }

    startFold(G, ax, ay) {
      if (this.dashCD > 0 || (!this.onGround && this.airDashes <= 0)) return;
      let dx = ax, dy = ay;
      if (dx === 0 && dy === 0) dx = this.facing;
      if (this.onGround && dy > 0) dy = 0;
      const l = Math.hypot(dx, dy); dx /= l; dy /= l;
      this.foldDir = { x: dx, y: dy };
      if (dx !== 0) this.facing = Math.sign(dx);
      if (!this.onGround) this.airDashes--;
      this.dashCD = D.abilities.foldstep.cooldown;
      this.folding = true; this.jumping = false;
      this.setState("fold");
      LD.Audio.sfx.fold();
      G.S.flags.usedFoldstep = true;
    }

    // ---------------------------------------------------------------- combat
    startAttack(G, ay) {
      const S = G.S, wd = this.weaponData(S);
      this.atkBuf = 0;
      let dir = "fwd";
      if (ay < 0) dir = "up"; else if (ay > 0 && !this.onGround) dir = "down";
      let idx = 1;
      if (dir === "fwd") { idx = this.comboT > 0 && this.comboIdx < wd.combo ? this.comboIdx + 1 : 1; this.comboIdx = idx; }
      const sw = dir === "fwd" ? (SWINGS[S.weapon.cls] || SWINGS.nib)[idx] : SWINGS[dir];
      const isFinisher = dir === "fwd" && idx === wd.combo && wd.combo > 1;
      this.atk = { wd, dir, idx, sw, phase: "windup", t: 0, hit: new Set(), finisher: isFinisher, swung: false,
        windup: wd.windup * (isFinisher ? 1.25 : 1), active: wd.active, recovery: wd.recovery * (isFinisher ? 1.3 : 1) };
      this.useStamina(wd.stamina);
      this.setState("attack");
    }

    atkAngle() {
      const a = this.atk; if (!a) return 0;
      const s = a.sw;
      if (a.phase === "windup") return U.lerp(a.lastA != null ? a.lastA : s.a0, s.a0, U.easeOut(a.t / a.windup));
      if (a.phase === "active") return U.lerp(s.a1, s.a2, U.easeOut(a.t / a.active));
      return U.lerp(s.a2, s.a3, U.easeOut(a.t / a.recovery));
    }
    atkExt() {
      const a = this.atk; if (!a) return 0;
      const s = a.sw; if (s.e0 == null) return 0;
      if (a.phase === "windup") return U.lerp(0, s.e0, U.easeOut(a.t / a.windup));
      if (a.phase === "active") return U.lerp(s.e0, s.e2, U.easeOut(a.t / a.active));
      return U.lerp(s.e2, 0, U.easeOut(a.t / a.recovery));
    }

    atkBox() {
      const a = this.atk, wd = a.wd;
      const cx = this.cx(), cy = this.y + 24;
      if (a.dir === "up") return { x: cx - 38, y: this.y - wd.reach * 0.85, w: 76, h: wd.reach * 0.85 + 14 };
      if (a.dir === "down") return { x: cx - 32, y: this.feet() - 16, w: 64, h: wd.reach * 0.8 + 16 };
      const reach = wd.reach * (a.finisher ? 1.1 : 1);
      return { x: this.facing > 0 ? cx - 6 : cx - reach + 6, y: cy - wd.height / 2, w: reach, h: wd.height };
    }

    updateAttack(G, dt, ax, ay, wd) {
      const a = this.atk;
      if (!a) { this.setState("normal"); return; }
      a.t += dt;
      const mm = a.phase === "active" ? wd.moveMult * 0.5 : wd.moveMult;
      if (this.onGround) this.vx = U.approach(this.vx, ax * PD.runSpeed * mm, PD.friction * dt);
      else this.move(ax, 0.8, dt);

      if (a.phase === "windup" && a.t >= a.windup) {
        a.phase = "active"; a.t = 0;
        LD.Audio.sfx.swing(G.S.weapon.cls === "heavy");
        if (a.dir === "fwd" && this.onGround) this.vx += this.facing * wd.lunge * (a.finisher ? 1.3 : 1);
        this.trail = { a1: a.sw.a1, a2: a.sw.a1, life: 0.22, max: 0.22, len: wd.length, el: G.S.weapon.element, dir: a.dir };
        if (G.S.weapon.cls === "heavy" && this.onGround) { LD.Camera.shake(0.12); }
      }
      if (a.phase === "active") {
        if (this.trail) { this.trail.a2 = this.atkAngle(); this.trail.life = this.trail.max; }
        this.resolveHits(G, a);
        if (a.t >= a.active) { a.phase = "recovery"; a.t = 0; }
      } else if (a.phase === "recovery") {
        if (a.t >= a.recovery) {
          this.comboT = wd.comboWindow;
          this.atk = null;
          this.setState("normal");
          if (this.atkBuf > 0 && this.comboIdx < wd.combo) this.startAttack(G, ay);
          return;
        }
        // chaining into the next combo swing late in recovery feels responsive
        if (this.atkBuf > 0 && a.dir === "fwd" && this.comboIdx < wd.combo && a.t > a.recovery * 0.45) {
          this.atk = null; this.comboT = wd.comboWindow; this.startAttack(G, ay); return;
        }
      }
    }

    resolveHits(G, a) {
      const S = G.S, box = this.atkBox(), wd = a.wd;
      const atk = {
        dmg: wd.dmg * (a.finisher ? 1.3 : 1), stagger: wd.stagger * (a.finisher ? 1.4 : 1), knock: wd.knock,
        dir: a.dir === "fwd" ? this.facing : 0, heavy: S.weapon.cls === "heavy", hitstop: wd.hitstop,
        breaksGuard: !!wd.breaksGuard, element: S.weapon.element, fromY: this.cy(),
      };
      let bounced = false;
      for (const e of W.enemies) {
        if (a.hit.has(e) || e.dead || !e.hitbox) continue;
        const hb = e.hitbox();
        if (hb && U.overlap(box, hb)) {
          a.hit.add(e);
          if (atk.dir === 0) atk.dir = Math.sign(e.cx() - this.cx()) || this.facing;
          const r = LD.Combat.hitEnemy(G, e, atk);
          if (r === "blocked") { this.vx = -this.facing * 260; }
          if (a.dir === "down") bounced = true;
          else if (r === "hit" && this.onGround) this.vx -= this.facing * 60;
        }
      }
      // projectiles can be batted away
      for (const pr of W.projectiles) if (!pr.dead && pr.hostile && U.overlap(box, pr.box())) { pr.dead = true; P.inkHit(pr.x, pr.y, this.facing, Art.INK); LD.Audio.sfx.block(); if (a.dir === "down") bounced = true; }
      // breakable walls & grates
      if (!a.brokeChecked) {
        const hitB = W.rectTouches(box, "B");
        if (hitB.length) {
          a.brokeChecked = true;
          const [tx, ty] = hitB[0];
          const grp = W.room.breaks.find((b) => tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h);
          if (grp) G.breakWall(grp);
        }
        const hitH = W.rectTouches(box, "H");
        if (hitH.length) {
          a.brokeChecked = true;
          const [tx, ty] = hitH[0];
          if (this.y > (ty + 1) * U.TILE - 4) G.openHatch(tx, ty);
          else { LD.Audio.sfx.block(); this.say(G, "Rusted shut from this side."); }
        }
      }
      if (bounced) { this.vy = -620; this.airDashes = D.abilities.foldstep.airUses; this.jumping = false; }
    }

    say(G, text) { if (!this._sayT || G.time - this._sayT > 1.5) { this._sayT = G.time; LD.HUD.thought(text); } }

    hurt(G, dmg, srcX, o = {}) {
      if (this.state === "dead" || this.state === "hazard") return false;
      if (G.cut) return false; // never punish the player while a cutscene holds the controls
      if (this.iframes() && !o.ignoreIframes) return false;
      const dir = Math.sign(this.cx() - srcX) || -this.facing;
      // guard: only against attacks from the front
      if (this.state === "guard" && Math.sign(srcX - this.cx()) === this.facing && !o.unblockable) {
        const cost = dmg * PD.guard.cost;
        if (this.stamina >= cost) {
          this.useStamina(cost);
          dmg *= PD.guard.reduce;
          LD.Audio.sfx.block();
          P.burst(this.cx() + this.facing * 16, this.cy(), 8, "scrap", { angle: this.facing > 0 ? 0 : Math.PI, spread: 0.9, min: 80, max: 260, p: { color: "#e6d8bb", g: 500 } });
          this.vx = dir * 240;
          G.hitstop = Math.max(G.hitstop, 0.05);
          if (this.stamina <= 0) this.exhausted = true;
          this.applyDamage(G, dmg, true);
          return "blocked";
        }
        // guard broken
        this.stamina = 0; this.exhausted = true;
        LD.Audio.sfx.guardBreak();
        this.setState("stagger");
        this.vx = dir * 320;
        this.applyDamage(G, dmg);
        return true;
      }
      this.applyDamage(G, dmg);
      if (this.dead) return true;
      this.setState("hurt");
      this.atk = null;
      this.vx = dir * 330; this.vy = -360; this.jumping = false;
      this.invuln = PD.hurtInvuln;
      LD.Audio.sfx.playerHurt();
      P.inkHit(this.cx(), this.cy(), dir, Art.INK, true);
      G.hitstop = Math.max(G.hitstop, 0.09);
      LD.Camera.shake(0.35);
      this.flash = 0.25;
      return true;
    }

    applyDamage(G, dmg, chip) {
      if (G.settings.damageAssist) dmg *= 0.5;
      G.S.hp = Math.max(0, G.S.hp - dmg);
      LD.HUD.hpPulse();
      if (G.S.hp <= 0) this.die(G);
    }

    hitHazard(G, kind) {
      G.S.hp = Math.max(0, G.S.hp - (G.settings.damageAssist ? 10 : 20));
      LD.HUD.hpPulse();
      LD.Audio.sfx.playerHurt();
      P.burst(this.cx(), this.feet(), 12, "ink", { angle: -Math.PI / 2, spread: 1, min: 100, max: 300, p: { color: "#0e0a09" } });
      if (G.S.hp <= 0) { this.die(G); return; }
      this.setState("hazard");
      this.vx = 0; this.vy = 0;
      G.fade(0.2, 0.25);
    }

    respawnSafe(G) {
      this.x = this.lastSafe.x; this.y = this.lastSafe.y;
      this.vx = 0; this.vy = 0;
      this.invuln = 0.8;
      this.resetCloth();
      this.setState("normal");
    }

    die(G) {
      if (this.state === "dead") return;
      this.setState("dead");
      this.dead = true; this.atk = null;
      this.vx = -this.facing * 120; this.vy = -200;
      LD.Audio.sfx.death();
      G.onPlayerDeath();
    }

    findInteract(G) {
      this.interactTarget = null;
      if (this.state !== "normal" || !this.onGround) return;
      let best = null, bd = 1e9;
      for (const o of W.objs) {
        if (!o.interact || (o.canInteract && !o.canInteract(G))) continue;
        const d = Math.abs(o.x - this.cx());
        const dy = Math.abs(o.y - this.feet());
        if (d < (o.range || 44) && dy < 60 && d < bd) { best = o; bd = d; }
      }
      this.interactTarget = best;
    }

    // ---------------------------------------------------------------- cloth
    updateCloth(dt) {
      const f = this.facing;
      const neckX = this.cx() - f * 3, neckY = this.y + 14;
      const sim = (chain, seg, grav, anchorX, anchorY, drag) => {
        chain[0].x = anchorX; chain[0].y = anchorY;
        for (let i = 1; i < chain.length; i++) {
          const c = chain[i];
          const vx = (c.x - c.px) * drag, vy = (c.y - c.py) * drag;
          c.px = c.x; c.py = c.y;
          c.x += vx - f * 18 * dt * (1 + Math.sin(this.t * 3 + i) * 0.3); // slight breeze / trailing
          c.y += vy + grav * dt * dt;
        }
        for (let k = 0; k < 3; k++) for (let i = 1; i < chain.length; i++) {
          const a = chain[i - 1], b = chain[i];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
          const diff = (d - seg) / d;
          b.x -= dx * diff; b.y -= dy * diff;
        }
      };
      sim(this.cloak, 7, 1400, neckX, neckY, 0.9);
      sim(this.scarf, 6, 500, this.cx() - f * 1, this.y + 13, 0.92);
    }

    // ---------------------------------------------------------------- pose
    pose(G) {
      const t = this.t, s = this.state;
      const p = { lean: 0, hipDY: 0, fT: 0.1, fS: 0.05, bT: -0.1, bS: -0.1, fU: 0.15, fF: 0.35, bU: -0.1, bF: 0.1, head: 0, sy: 1, sx: 1 };
      const speed = Math.abs(this.vx);
      if (s === "dead") {
        const k = U.easeOut(Math.min(1, this.stateT / 0.6));
        Object.assign(p, { lean: -1.3 * k, hipDY: 18 * k, fT: 1.2 * k, fS: 0.2, bT: 1.0 * k, bS: 0.6 * k, fU: 2.2 * k, fF: 2.4 * k, bU: 1.8 * k, bF: 2 * k, head: -0.3 * k });
        return p;
      }
      if (!this.onGround && s !== "fold") {
        if (this.vy < 0) Object.assign(p, { lean: 0.1, fT: 0.8, fS: 0.2, bT: -0.25, bS: -0.9, fU: -0.6, fF: -0.2, bU: -1.1, bF: -0.8, hipDY: 0 });
        else Object.assign(p, { lean: 0.05, fT: 0.35, fS: 0.1, bT: -0.3, bS: -0.35, fU: -1.8, fF: -2.2, bU: -2.2, bF: -2.5 });
      } else if (s === "dodge") {
        Object.assign(p, { lean: 0.8, hipDY: 12, fT: 1.3, fS: -0.3, bT: -0.9, bS: -1.2, fU: 1.2, fF: 1.6, bU: -0.9, bF: -0.6, head: 0.3 });
      } else if (s === "guard") {
        Object.assign(p, { lean: 0.15, hipDY: 5, fT: 0.45, fS: -0.1, bT: -0.35, bS: -0.35, fU: 1.4, fF: 2.6, bU: 1.0, bF: 2.4 });
      } else if (s === "hurt" || s === "stagger") {
        Object.assign(p, { lean: -0.45, hipDY: 3, fT: -0.2, fS: -0.4, bT: 0.3, bS: 0.1, fU: -1.8, fF: -1.2, bU: -2.3, bF: -1.8, head: -0.4 });
      } else if (s === "raise") {
        const k = U.easeOut(Math.min(1, this.stateT / 0.3));
        Object.assign(p, { lean: -0.1, fT: 0.2, fS: 0.1, bT: -0.2, bS: -0.1, fU: U.lerp(0.2, 3.0, k), fF: U.lerp(0.4, 3.1, k), bU: -0.4, bF: 0.3, head: -0.25 * k });
      } else if (speed > 30) {
        const ph = this.runPhase;
        const run = U.clamp(speed / 330, 0.25, 1);
        const sw = Math.sin(ph), sw2 = Math.sin(ph + Math.PI);
        p.lean = 0.2 * run;
        p.hipDY = -Math.abs(Math.cos(ph)) * 2.5 * run + 1;
        p.fT = sw * 0.85 * run; p.fS = p.fT - (0.5 + 0.5 * Math.cos(ph)) * 1.2 * run;
        p.bT = sw2 * 0.85 * run; p.bS = p.bT - (0.5 + 0.5 * Math.cos(ph + Math.PI)) * 1.2 * run;
        p.fU = -sw * 0.7 * run + 0.2; p.fF = p.fU + 0.9;
        p.bU = sw * 0.7 * run; p.bF = p.bU + 0.8;
        p.head = -0.1 * run;
      } else {
        // idle breathing
        const br = Math.sin(t * 2.2);
        p.hipDY = br * 0.7; p.lean = 0.02 + br * 0.015;
        p.fU = 0.2 + br * 0.03; p.fF = 0.45; p.bU = -0.08; p.bF = 0.15;
        if (this.lookDir) p.head = this.lookDir * 0.35;
      }
      if (this.landT > 0) { const k = this.landT / 0.13; p.hipDY += 6 * k; p.sy = 1 - 0.1 * k; p.sx = 1 + 0.08 * k; p.fT += 0.4 * k; p.bT -= 0.2 * k; p.fS -= 0.6 * k; p.bS -= 0.6 * k; }
      if (s === "attack" && this.atk) {
        const a = this.atk, ang = this.atkAngle();
        const armA = Math.PI / 2 - ang;
        p.fU = armA; p.fF = armA;
        p.lean = a.phase === "windup" ? -0.12 : a.phase === "active" ? 0.3 : 0.2;
        if (a.dir === "up") p.lean = -0.1;
        if (a.dir === "down") p.lean = 0.25;
        if (this.onGround) { p.fT = 0.55; p.fS = 0.1; p.bT = -0.45; p.bS = -0.5; p.hipDY = G.S.weapon.cls === "heavy" && a.phase !== "windup" ? 7 : 3; }
        p.bU = -0.6; p.bF = -0.1;
      }
      return p;
    }

    // ---------------------------------------------------------------- draw
    draw(ctx, G) {
      const S = G.S;
      if (this.state === "hazard" && this.stateT > 0.1) return;
      const fx = this.cx(), fy = this.feet();
      const flick = this.invuln > 0 && this.state !== "hurt" && Math.floor(this.t * 16) % 2 === 0;
      const pose = this.pose(G);
      const f = this.facing, vf = this.visFacing;
      const boil = Art.boil;
      const deadK = this.state === "dead" ? U.clamp((this.stateT - 0.7) / 1.1, 0, 1) : 0;

      ctx.save();
      ctx.translate(fx, fy);
      if (deadK > 0) ctx.globalAlpha = 1 - deadK;
      if (flick) ctx.globalAlpha *= 0.45;
      if (LD.Sprites.enabled("sketcher")) { ctx.restore(); this.drawSprite(ctx, G, pose, deadK, flick); return; }
      if (this.state === "fold") {
        // folded into a flat crease of paper
        ctx.scale(0.35 * f, 1.08);
        ctx.fillStyle = "#e8dcc0"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-14, -60); ctx.lineTo(12, -54); ctx.lineTo(16, 0); ctx.lineTo(-16, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-1, -58); ctx.lineTo(1, 0); ctx.stroke();
        ctx.fillStyle = Art.INK; ctx.fillRect(-4, -54, 8, 10);
        ctx.restore();
        return;
      }
      ctx.scale(Math.abs(vf) < 0.2 ? 0.2 * Math.sign(vf || 1) : vf * pose.sx, pose.sy);
      if (Art.highContrast) { ctx.shadowColor = "rgba(255,248,230,0.95)"; ctx.shadowBlur = 5; }
      else { ctx.shadowColor = "rgba(255,214,170,0.3)"; ctx.shadowBlur = 7; }

      // skeleton (local space, forward = +x)
      const hip = [pose.lean * 3, -27 + pose.hipDY];
      const neck = [hip[0] + Math.sin(pose.lean) * 18, hip[1] - Math.cos(pose.lean) * 18];
      const head = [neck[0] + Math.sin(pose.lean + pose.head) * 9, neck[1] - Math.cos(pose.lean + pose.head) * 9];
      const sh = [neck[0] - Math.sin(pose.lean) * 3, neck[1] + 3];
      const fK = limb(hip[0] + 2, hip[1], pose.fT, 13), fFt = limb(fK[0], fK[1], pose.fS, 14);
      const bK = limb(hip[0] - 2, hip[1], pose.bT, 13), bFt = limb(bK[0], bK[1], pose.bS, 14);
      const ext = this.atk ? this.atkExt() : 0;
      const fE = limb(sh[0], sh[1], pose.fU, 11), fH0 = limb(fE[0], fE[1], pose.fF, 10);
      const aDir = Math.PI / 2 - pose.fF;
      const fH = [fH0[0] + Math.cos(aDir) * ext, fH0[1] + Math.sin(aDir) * ext];
      const bE = limb(sh[0] - 3, sh[1], pose.bU, 11), bH = limb(bE[0], bE[1], pose.bF, 10);

      const LEG = "#2b3150", SLEEVE = "#cdbf9f", CLOAK = "#dccfb2", LINING = "#9d8d70";
      const j = (n) => (U.hash(boil * 7.1 + n) - 0.5) * 1.1;

      // back arm & leg (in shadow)
      ctx.fillStyle = "#6d6150";
      Art.brush(ctx, [sh[0] - 3, sh[1], bE[0] + j(1), bE[1], bH[0], bH[1]], 5, { seed: boil, taperStart: 0, taperEnd: 0.3 });
      ctx.fillStyle = "#3a2b25"; ctx.beginPath(); ctx.arc(bH[0], bH[1], 2.2, 0, 7); ctx.fill();
      this.drawLeg(ctx, hip[0] - 2, hip[1], bK, bFt, pose.bS, true, j, boil + 1);

      // torso
      ctx.fillStyle = "#3a3346";
      Art.brush(ctx, [hip[0], hip[1] + 2, (hip[0] + neck[0]) / 2 + j(3), (hip[1] + neck[1]) / 2, neck[0], neck[1]], 13, { seed: boil + 2, taperStart: 0, taperEnd: 0.4 });

      // front leg
      this.drawLeg(ctx, hip[0] + 2, hip[1], fK, fFt, pose.fS, false, j, boil + 3);

      // belt, satchel on the back hip, and the glass ink reservoir clipped to the belt
      ctx.fillStyle = "#3a2618";
      ctx.fillRect(hip[0] - 7, hip[1] - 3, 14, 3.5);
      ctx.fillStyle = "#5a3d26"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(hip[0] - 13, hip[1] - 2); ctx.lineTo(hip[0] - 4, hip[1] - 3); ctx.lineTo(hip[0] - 5, hip[1] + 8); ctx.lineTo(hip[0] - 12, hip[1] + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#c9a14a"; ctx.fillRect(hip[0] - 9.5, hip[1] + 1, 2, 2);
      const inkK = U.clamp(S.ink / D.ink.max, 0, 1);
      ctx.fillStyle = "rgba(225,230,235,0.8)"; ctx.fillRect(hip[0] + 4, hip[1] - 1, 4, 6);
      ctx.fillStyle = S.weapon.element === "water" ? "#2f6aa8" : "#141a2a"; ctx.fillRect(hip[0] + 4.5, hip[1] - 1 + (1 - inkK) * 5, 3, 6 - (1 - inkK) * 5);
      ctx.fillStyle = "#6b4a2a"; ctx.fillRect(hip[0] + 4.6, hip[1] - 2.6, 2.8, 1.8);

      // cloak (verlet chain -> local)
      const loc = (c) => [(c.x - fx) * Math.sign(vf || 1) / Math.max(0.2, Math.abs(vf)) / pose.sx, (c.y - fy) / pose.sy];
      const ch = this.cloak.map(loc);
      if (this.state === "dead") for (let i = 0; i < ch.length; i++) { ch[i][1] = Math.min(ch[i][1], 0); }
      const frontHem = [hip[0] + 9 + Math.max(0, pose.fT) * 5, hip[1] + 14];
      {
        const t2 = ch[ch.length - 1];
        ctx.fillStyle = "#3b332e";
        ctx.beginPath(); ctx.moveTo(neck[0] - 4, neck[1] + 2);
        for (let i = 1; i < ch.length; i++) ctx.lineTo(ch[i][0] - 2, ch[i][1] + 5);
        ctx.lineTo(t2[0] + 4, t2[1] + 9); ctx.lineTo(hip[0] + 2, hip[1] + 18); ctx.lineTo(hip[0] + 4, hip[1]); ctx.closePath(); ctx.fill();
      }
      const cp = new Path2D(); // the cloak's outline, reused for fill, clip and ink
      cp.moveTo(neck[0] + 6, neck[1] + 1);
      cp.quadraticCurveTo(hip[0] + 11, hip[1] - 6, frontHem[0], frontHem[1]);
      const tip = ch[ch.length - 1];
      const nH = 7;
      for (let i = 1; i <= nH; i++) {
        const k = i / nH;
        const hx = U.lerp(frontHem[0], tip[0], k), hy = U.lerp(frontHem[1], tip[1], k);
        cp.lineTo(hx + j(10 + i) * 2, hy + (i % 2 ? 6 : -2) + j(20 + i));
      }
      for (let i = ch.length - 2; i >= 1; i--) cp.lineTo(ch[i][0] + j(30 + i), ch[i][1]);
      cp.lineTo(neck[0] - 5, neck[1] - 1);
      cp.closePath();
      const cg = ctx.createLinearGradient(neck[0] + 6, neck[1] - 4, tip[0], tip[1] + 6);
      cg.addColorStop(0, "#eee4cc"); cg.addColorStop(0.55, CLOAK); cg.addColorStop(1, "#b4a384");
      ctx.fillStyle = cg; ctx.fill(cp);
      ctx.save(); ctx.clip(cp);
      ctx.fillStyle = LINING; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(neck[0] - 6, neck[1]);
      for (let i = 1; i < ch.length; i++) ctx.lineTo(ch[i][0] + 6, ch[i][1]);
      ctx.lineTo(tip[0] - 20, tip[1] + 10); ctx.lineTo(neck[0] - 20, neck[1]); ctx.fill();
      ctx.globalAlpha = 1;
      // cross-hatched shade on the trailing half, like the sheets' ink shading
      {
        const bx0 = Math.min(tip[0], neck[0]) - 12, by0 = neck[1];
        Art.hatch(ctx, bx0, by0, Math.abs(neck[0] - tip[0]) * 0.6 + 8, Math.max(10, tip[1] - by0 + 12), 3.2, 0.9, "#2a2018", 0.35, 0.8, 3);
      }
      // fold lines & ink stains on the cloak
      ctx.strokeStyle = "rgba(40,30,22,0.55)"; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(neck[0] + 1, neck[1] + 6); ctx.lineTo(U.lerp(frontHem[0], tip[0], 0.35), U.lerp(frontHem[1], tip[1], 0.35) + 2);
      ctx.moveTo(neck[0] - 2, neck[1] + 6); ctx.lineTo(U.lerp(frontHem[0], tip[0], 0.65), U.lerp(frontHem[1], tip[1], 0.65) + 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(21,16,13,0.5)";
      ctx.beginPath(); ctx.arc(U.lerp(frontHem[0], tip[0], 0.5), U.lerp(frontHem[1], tip[1], 0.5) - 3, 3, 0, 7); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.stroke(cp);
      {
        const sway = U.clamp((ch[ch.length - 1][0] - ch[ch.length - 2][0]) * 0.4, -6, 6);
        for (let k = 0; k < 3; k++) {
          const t = 0.45 + k * 0.25;
          const sx = U.lerp(frontHem[0], tip[0], t), sy = U.lerp(frontHem[1], tip[1], t) + 3;
          const len = 5 + U.hash(k * 7.3) * 7;
          const pts = [sx, sy - 2, sx + sway * 0.4 + j(50 + k), sy + len * 0.5, sx + sway + j(60 + k) * 2, sy + len];
          ctx.fillStyle = Art.INK; Art.brush(ctx, pts, 4, { seed: k + boil, taperStart: 0, taperEnd: 0.9 });
          ctx.fillStyle = "#bcae90"; Art.brush(ctx, pts, 2.2, { seed: k + boil, taperStart: 0, taperEnd: 0.9 });
        }
      }

      // leather satchel strap across the chest, with a brass buckle
      ctx.fillStyle = "#3a2618";
      Art.brush(ctx, [neck[0] + 5, neck[1] + 2, (neck[0] + hip[0]) / 2 + 2, (neck[1] + hip[1]) / 2 + 1, hip[0] - 8, hip[1] - 1], 2.8, { seed: 11, taperStart: 0, taperEnd: 0 });
      ctx.fillStyle = "#c9a14a"; ctx.fillRect((neck[0] + hip[0]) / 2 + 0.5, (neck[1] + hip[1]) / 2 - 1, 2.6, 2.6);

      // scarf (colored by pigment): striped, with a frayed end
      const sc = this.scarf.map(loc);
      const scarfCol = S.weapon.element === "water" ? "#3f7fc0" : "#8e2a22";
      const scarfPts = [neck[0] + 4, neck[1] + 1, sc[1][0], sc[1][1], sc[2][0], sc[2][1] + 2, sc[3][0], sc[3][1] + 3];
      ctx.fillStyle = Art.INK;
      Art.brush(ctx, scarfPts, 7.6, { seed: boil + 9, taperStart: 0, taperEnd: 0.5 });
      ctx.fillStyle = scarfCol;
      Art.brush(ctx, scarfPts, 6, { seed: boil + 9, taperStart: 0, taperEnd: 0.6 });
      ctx.strokeStyle = "rgba(245,235,215,0.55)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 1; k <= 2; k++) { const px = U.lerp(sc[1][0], sc[2][0], k / 3), py = U.lerp(sc[1][1], sc[2][1] + 2, k / 3); ctx.moveTo(px, py - 2.4); ctx.lineTo(px + 0.6, py + 2.4); }
      ctx.stroke();
      ctx.strokeStyle = scarfCol; ctx.lineWidth = 1;
      ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(sc[3][0], sc[3][1] + 3 + k * 1.6); ctx.lineTo(sc[3][0] - 3 + j(70 + k), sc[3][1] + 4 + k * 2.2); } ctx.stroke();

      // hood & head
      this.drawHead(ctx, head, pose, j);

      // front arm + weapon
      this.drawWeapon(ctx, G, fH, pose);
      // sleeve: parchment linen with a shaded underside, a rolled cuff, and an ink-stained hand
      ctx.fillStyle = Art.INK;
      Art.brush(ctx, [sh[0] + 1, sh[1], fE[0] + j(5), fE[1], fH[0], fH[1]], 7.4, { seed: boil + 4, taperStart: 0, taperEnd: 0.25 });
      ctx.fillStyle = SLEEVE;
      Art.brush(ctx, [sh[0] + 1, sh[1], fE[0] + j(5), fE[1], fH[0], fH[1]], 5.5, { seed: boil + 4, taperStart: 0, taperEnd: 0.25 });
      ctx.fillStyle = "rgba(90,74,56,0.45)";
      Art.brush(ctx, [sh[0] + 1, sh[1] + 1.5, fE[0], fE[1] + 1.5, fH[0], fH[1] + 1], 2, { seed: boil + 6, taperStart: 0, taperEnd: 0.3 });
      {
        const cx = U.lerp(fE[0], fH[0], 0.72), cy = U.lerp(fE[1], fH[1], 0.72);
        const ang = Math.atan2(fH[1] - fE[1], fH[0] - fE[0]);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.fillStyle = "#e8dcc0"; ctx.fillRect(-1.6, -3.4, 3.2, 6.8);
        ctx.strokeStyle = Art.INK; ctx.lineWidth = 0.9; ctx.strokeRect(-1.6, -3.4, 3.2, 6.8);
        ctx.restore();
      }
      ctx.fillStyle = "#3a2b25"; // ink-stained hand, knuckles and a stained thumb
      ctx.beginPath(); ctx.arc(fH[0], fH[1], 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c9b391"; ctx.beginPath(); ctx.arc(fH[0] - 0.8, fH[1] - 1, 1.1, 0, 7); ctx.fill();
      ctx.fillStyle = "#101626"; ctx.fillRect(fH[0] + 0.6, fH[1] - 2.4, 1.6, 1.6);

      // guard: a page-shield sketch in front
      if (this.state === "guard") {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(this.t * 10) * 0.1;
        ctx.fillStyle = "rgba(236,225,201,0.6)"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(18, -58); ctx.quadraticCurveTo(30, -34, 20, -6); ctx.lineTo(14, -8); ctx.quadraticCurveTo(22, -34, 12, -56); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      if (this.flash > 0 && !G.settings.reduceFlash) {
        ctx.globalCompositeOperation = "source-atop";
      }
      ctx.restore();

      // swing trail (world space)
      this.drawTrail(ctx, G);

      if (this.state === "dead" && deadK > 0) {
        ctx.save(); ctx.fillStyle = Art.INK; ctx.globalAlpha = Math.min(1, deadK * 1.5);
        Art.blobPath(ctx, fx, fy - 2, 18 + deadK * 26, 4 + deadK * 3, 5, 14, 0.3); ctx.fill(); ctx.restore();
      }
      if (this.exhausted && Math.floor(this.t * 4) % 2 === 0) {
        Art.text(ctx, "~ out of breath ~", fx, this.y - 18, 16, { align: "center", color: "rgba(21,16,13,0.8)", outline: 3 });
      }
    }

    // ---------------------------------------------------------------- painted sprites
    // Which painted animation plays, and either its time in state or its progress 0..1.
    // Attacks/dodges are progress-driven so the painted frames stay locked to the hitboxes.
    spriteAnim(G) {
      const s = this.state;
      if (s === "dead") return { name: "death", t: this.stateT };
      if (s === "fold") return { name: "fold", t: this.stateT };
      if (s === "attack" && this.atk) {
        const a = this.atk, tot = a.windup + a.active + a.recovery;
        const done = a.phase === "windup" ? a.t : a.phase === "active" ? a.windup + a.t : a.windup + a.active + a.t;
        const name = a.dir === "up" ? "attack_up" : a.dir === "down" ? "attack_down" : "attack_" + G.S.weapon.cls + "_" + a.idx;
        return { name, p: done / tot };
      }
      if (s === "dodge") return { name: "dodge", p: this.stateT / D.player.dodge.dur };
      if (s === "guard") return { name: "guard", t: this.stateT };
      if (s === "hurt" || s === "stagger") return { name: "hurt", t: this.stateT };
      if (s === "raise") return { name: "raise", t: this.stateT };
      if (!this.onGround) return { name: this.vy < 0 ? "jump" : "fall", t: this.stateT };
      if (this.landT > 0) return { name: "land", p: 1 - this.landT / 0.13 };
      const sp = Math.abs(this.vx);
      if (sp > 30) return { name: sp < 200 ? "walk" : "run", p: ((this.runPhase / (Math.PI * 2)) % 1 + 1) % 1 };
      return { name: "idle", t: this.t };
    }

    handLocal(pose) {
      const hip = [pose.lean * 3, -27 + pose.hipDY];
      const neck = [hip[0] + Math.sin(pose.lean) * 18, hip[1] - Math.cos(pose.lean) * 18];
      const sh = [neck[0] - Math.sin(pose.lean) * 3, neck[1] + 3];
      const ext = this.atk ? this.atkExt() : 0;
      const fE = limb(sh[0], sh[1], pose.fU, 11), fH0 = limb(fE[0], fE[1], pose.fF, 10);
      const aDir = Math.PI / 2 - pose.fF;
      return [fH0[0] + Math.cos(aDir) * ext, fH0[1] + Math.sin(aDir) * ext];
    }

    drawSprite(ctx, G, pose, deadK, flick) {
      const fx = this.cx(), fy = this.feet(), dir = this.visFacing < 0 ? -1 : 1;
      const an = this.spriteAnim(G);
      const alpha = (1 - deadK) * (flick ? 0.45 : 1);
      if (this.state === "fold") for (let i = 1; i <= 2; i++) LD.Sprites.draw(ctx, "sketcher", "fold", an, fx - this.foldDir.x * i * 18, fy - this.foldDir.y * i * 18, dir, { alpha: 0.25 / i });
      const info = LD.Sprites.draw(ctx, "sketcher", an.name, an, fx, fy, dir, { alpha, shadow: Art.highContrast ? "rgba(255,248,230,0.95)" : null });
      const hand = LD.Sprites.hand("sketcher", info) || this.handLocal(pose);
      if (this.state !== "fold" && this.state !== "dead") {
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(fx, fy); ctx.scale(dir, 1);
        this.drawWeapon(ctx, G, hand, pose);
        if (this.state === "guard") {
          ctx.globalAlpha *= 0.5 + Math.sin(this.t * 10) * 0.1;
          ctx.fillStyle = "rgba(236,225,201,0.6)"; ctx.strokeStyle = Art.INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(18, -58); ctx.quadraticCurveTo(30, -34, 20, -6); ctx.lineTo(14, -8); ctx.quadraticCurveTo(22, -34, 12, -56); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
      this.drawTrail(ctx, G);
      if (this.exhausted && Math.floor(this.t * 4) % 2 === 0) Art.text(ctx, "~ out of breath ~", fx, this.y - 18, 16, { align: "center", color: "rgba(21,16,13,0.8)", outline: 3 });
    }

    // Trouser leg (with fold lines and a knee patch) ending in a cuffed, strapped boot.
    drawLeg(ctx, hx, hy, K, F, ang, back, j, seed) {
      const cloth = back ? "#1b1d2e" : "#2b3150", shade = back ? "#10111c" : "#1a1e33";
      ctx.fillStyle = Art.INK;
      Art.brush(ctx, [hx, hy, K[0] + j(seed), K[1], F[0], F[1] - 4], back ? 7.8 : 8.6, { seed, taperStart: 0, taperEnd: 0.1 });
      ctx.fillStyle = cloth;
      Art.brush(ctx, [hx, hy, K[0] + j(seed), K[1], F[0], F[1] - 4], back ? 6.2 : 7, { seed, taperStart: 0, taperEnd: 0.15 });
      ctx.fillStyle = shade;
      Art.brush(ctx, [hx - 1.5, hy + 1, K[0] - 1.5, K[1], F[0] - 1, F[1] - 5], 2.2, { seed: seed + 2, taperStart: 0, taperEnd: 0.2 });
      if (!back) {
        ctx.fillStyle = "#3d4668"; ctx.beginPath(); ctx.ellipse(K[0] + 0.5, K[1], 2.6, 2, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(10,10,20,0.7)"; ctx.lineWidth = 0.6; ctx.setLineDash([1, 1]); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(U.lerp(hx, K[0], 0.5) - 2, U.lerp(hy, K[1], 0.5)); ctx.lineTo(U.lerp(hx, K[0], 0.5) + 2, U.lerp(hy, K[1], 0.5) + 1.5); ctx.stroke();
      // boot shaft rising up the shin, turned-down cuff, strap
      const bx = U.lerp(K[0], F[0], 0.45), by = U.lerp(K[1], F[1], 0.45);
      const boot = back ? "#150f0c" : "#2a1d15";
      ctx.fillStyle = Art.INK; Art.brush(ctx, [bx, by, F[0], F[1] - 2], back ? 7.6 : 8.4, { seed: seed + 4, taperStart: 0, taperEnd: 0 });
      ctx.fillStyle = boot; Art.brush(ctx, [bx, by, F[0], F[1] - 2], back ? 6 : 6.8, { seed: seed + 4, taperStart: 0, taperEnd: 0 });
      ctx.fillStyle = back ? "#2a1e16" : "#5a3d26"; Art.brush(ctx, [bx - 0.5, by - 1, bx + 0.5, by + 2], 8, { seed: seed + 5, taperStart: 0, taperEnd: 0 });
      if (!back) { ctx.fillStyle = "#c9a14a"; ctx.fillRect(U.lerp(bx, F[0], 0.55) - 1, U.lerp(by, F[1], 0.55) - 1, 2, 2); }
      this.drawBoot(ctx, F, ang, boot);
    }

    drawBoot(ctx, ft, ang, col) {
      ctx.fillStyle = col;
      ctx.save(); ctx.translate(ft[0], ft[1]); ctx.rotate(-ang * 0.4);
      ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(4, -4.5); ctx.quadraticCurveTo(8.5, -3, 8.5, 0.5); ctx.lineTo(-4.5, 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "#0c0806"; ctx.fillRect(-4.5, -0.6, 13, 1.8); ctx.fillRect(-4.5, -1.6, 3.2, 2.6);
      ctx.fillStyle = "rgba(255,230,200,0.18)"; ctx.fillRect(0, -4.4, 4, 1.2);
      ctx.restore();
    }

    drawHead(ctx, head, pose, j) {
      const [hx, hy] = head;
      const back = U.clamp(-this.vx * 0.012 * Math.sign(this.visFacing || 1), -3, 6);
      const hood = new Path2D();
      hood.moveTo(hx + 10, hy - 1);
      hood.quadraticCurveTo(hx + 8, hy - 13 + j(40), hx - 2, hy - 12);
      hood.quadraticCurveTo(hx - 12, hy - 10, hx - 16 - back, hy + 4 + j(41));
      hood.quadraticCurveTo(hx - 10, hy + 6, hx - 7, hy + 12);
      hood.lineTo(hx + 6, hy + 11);
      hood.quadraticCurveTo(hx + 11, hy + 6, hx + 10, hy - 1);
      const hg = ctx.createLinearGradient(hx + 6, hy - 12, hx - 12, hy + 10);
      hg.addColorStop(0, "#efe5ce"); hg.addColorStop(0.6, "#dccdb0"); hg.addColorStop(1, "#b3a283");
      ctx.fillStyle = hg; ctx.fill(hood);
      ctx.save(); ctx.clip(hood);
      Art.hatch(ctx, hx - 17, hy - 2, 14, 14, 2.4, 0.9, "#3a2c20", 0.35, 0.7, 2);
      // a sewn-on patch at the back of the hood
      ctx.fillStyle = "#c7b48f"; ctx.fillRect(hx - 11, hy - 6, 6, 5);
      ctx.strokeStyle = "rgba(40,30,22,0.7)"; ctx.lineWidth = 0.7; ctx.setLineDash([1.2, 1.2]); ctx.strokeRect(hx - 11, hy - 6, 6, 5);
      // running stitch following the hood's edge
      ctx.beginPath(); ctx.moveTo(hx + 7, hy - 3); ctx.quadraticCurveTo(hx + 5, hy - 10, hx - 2, hy - 9.5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 2.2; ctx.stroke(hood);
      // darker lining visible around the face opening
      ctx.fillStyle = "#6e604c";
      ctx.beginPath(); ctx.ellipse(hx + 4.5, hy + 2.5, 6.8, 8.8, 0.1, 0, Math.PI * 2); ctx.fill();
      // shadowed face
      // face deep in the hood's shadow: a sliver of pale cheek & jaw on the lit side, hair, a glint
      const fg = ctx.createLinearGradient(hx - 2, hy, hx + 10, hy);
      fg.addColorStop(0, "#0f0b09"); fg.addColorStop(1, "#2b211b");
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.ellipse(hx + 4.5, hy + 2.5, 5.4, 7.4, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#cdb596";
      ctx.beginPath(); ctx.moveTo(hx + 8.6, hy - 1); ctx.quadraticCurveTo(hx + 10.2, hy + 4, hx + 7.4, hy + 8.6);
      ctx.quadraticCurveTo(hx + 5.2, hy + 9.6, hx + 4.2, hy + 8.2); ctx.quadraticCurveTo(hx + 7, hy + 6.5, hx + 8.6, hy - 1); ctx.fill();
      ctx.fillStyle = "#1b1512";
      Art.brush(ctx, [hx + 1, hy - 5, hx + 5, hy - 2, hx + 8.5, hy + 1], 2.2, { seed: 5, taperStart: 0, taperEnd: 0.8 });
      Art.brush(ctx, [hx + 3, hy - 6, hx + 6.5, hy - 3.5, hx + 9, hy - 3], 1.6, { seed: 6, taperStart: 0, taperEnd: 0.8 });
      const blink = (this.t % 4) > 3.85;
      if (!blink) { ctx.fillStyle = "rgba(240,230,210,0.85)"; ctx.fillRect(hx + 6.6, hy + 1.2, 1.2, 1); }
      // hood fold line
      ctx.strokeStyle = "rgba(40,30,22,0.6)"; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(hx - 2, hy - 11); ctx.quadraticCurveTo(hx - 4, hy, hx - 8, hy + 9); ctx.stroke();
    }

    weaponAngle(G) {
      if (this.atk) return this.atkAngle();
      if (this.state === "raise") return -Math.PI / 2 - 0.1;
      if (this.state === "guard") return -1.45;
      const base = IDLE_ANGLE[G.S.weapon.cls] || 0.8;
      return base + Math.sin(this.t * 2.2) * 0.03 + (this.onGround ? 0 : -0.3) + U.clamp(this.vx * 0.0006, -0.2, 0.2);
    }

    drawWeapon(ctx, G, hand, pose) {
      const S = G.S;
      const cls = S.weapon.cls;
      const len = (D.weapons[cls] || D.weapons.nib).length;
      const strokes = S.weapon.strokes || NIB_STROKES;
      const a = this.weaponAngle(G);
      const grip = cls === "polearm" ? 0.3 : cls === "heavy" ? 0.12 : 0.05;
      ctx.save();
      ctx.translate(hand[0], hand[1]);
      ctx.rotate(a);
      ctx.translate(-grip * len, 0);
      LD.drawWeaponStrokes(ctx, strokes, len, S.weapon.element, Art.boil, cls === "nib");
      ctx.restore();
    }

    drawTrail(ctx, G) {
      const tr = this.trail;
      if (!tr || Math.abs(tr.a2 - tr.a1) < 0.05) return;
      const k = tr.life / tr.max;
      const f = this.facing;
      const ox = this.cx() + f * 2, oy = this.y + 22;
      const r0 = 18 + tr.len * 0.35, r1 = 24 + tr.len * 1.02;
      const n = 14;
      const col = tr.el === "water" ? "rgba(70,140,220," : "rgba(21,16,13,";
      ctx.save();
      ctx.translate(ox, oy); ctx.scale(f, 1);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const t = i / n, a = U.lerp(tr.a1, tr.a2, t), w = t; ctx.lineTo(Math.cos(a) * U.lerp(r1 - 4, r1, w), Math.sin(a) * U.lerp(r1 - 4, r1, w)); }
      for (let i = n; i >= 0; i--) { const t = i / n, a = U.lerp(tr.a1, tr.a2, t); ctx.lineTo(Math.cos(a) * U.lerp(r1 - 3, r0, t), Math.sin(a) * U.lerp(r1 - 3, r0, t)); }
      ctx.closePath();
      ctx.fillStyle = col + (0.8 * k) + ")"; ctx.fill();
      if (tr.el === "water") { ctx.strokeStyle = "rgba(200,230,255," + 0.8 * k + ")"; ctx.lineWidth = 1.5; ctx.stroke(); }
      // a crisp inked leading edge along the outer arc
      ctx.strokeStyle = tr.el === "water" ? "rgba(30,70,130," + k + ")" : "rgba(21,16,13," + k + ")";
      ctx.lineWidth = 2.5 * k + 0.5; ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const t = i / n, a = U.lerp(tr.a1, tr.a2, t); if (t < 0.35) continue; ctx.lineTo(Math.cos(a) * (r1 + 1), Math.sin(a) * (r1 + 1)); }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Draws normalized weapon strokes (the player's own drawing!) along +x.
  LD.drawWeaponStrokes = (ctx, strokes, len, element, boil, isNib) => {
    const el = element || "none";
    if (el === "water") {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#4a8ad0";
      Art.blobPath(ctx, len * 0.6, 0, len * 0.5, 9, boil, 12, 0.3); ctx.fill(); ctx.restore();
    }
    for (let si = 0; si < strokes.length; si++) {
      const s = strokes[si];
      const pts = [];
      for (let i = 0; i < s.length; i += 2) pts.push(s[i] * len + (U.hash(boil + i + si * 17) - 0.5) * 0.8, s[i + 1] * len + (U.hash(boil + i * 3 + si) - 0.5) * 0.8);
      if (pts.length < 4) continue;
      ctx.fillStyle = "rgba(236,225,201,0.85)";
      Art.brush(ctx, pts, isNib ? 5.5 : 6.5, { seed: si * 11, taperStart: 0.05, taperEnd: 0.05, jitter: 0.1 });
      ctx.fillStyle = el === "water" ? "#173a66" : Art.INK;
      Art.brush(ctx, pts, isNib ? 3 : 3.6, { seed: si * 11 + boil, taperStart: 0.1, taperEnd: 0.15 });
    }
    if (isNib) { ctx.fillStyle = "#c9a14a"; ctx.beginPath(); ctx.moveTo(len * 0.8, -2); ctx.lineTo(len, 0); ctx.lineTo(len * 0.8, 2); ctx.fill(); }
  };

  LD.Player = Player;
})();
