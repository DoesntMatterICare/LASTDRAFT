// Game: main loop, render pipeline, scene/area management, overlays, story beats,
// save/death flow. Chapter-specific beats live here; systems stay chapter-agnostic.
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, D = LD.Data, I = LD.Input, A = LD.Audio, W = LD.World, P = LD.Particles, C = LD.Camera, HUD = LD.HUD;
  const T = U.TILE;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const G = (LD.G = {
    S: LD.newState(), settings: LD.Save.loadSettings(), player: null, world: W,
    time: 0, hitstop: 0, timeScale: 1, overlays: [], cut: null, mode: "boot",
    transition: null, fadeA: 0, fadeQ: null, boss: null, arenaBurn: 0, weaponFly: null,
    freezePlayer: false, dying: null, storyText: null, inkSpotShow: null, crane: null, pageStair: null, pigmentWave: null,
  });
  G.overlay = null;

  // ---------------------------------------------------------------- setup
  let view = { s: 1, ox: 0, oy: 0, dpr: 1 };
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    const s = Math.min(canvas.width / U.VIEW_W, canvas.height / U.VIEW_H);
    view = { s, ox: (canvas.width - U.VIEW_W * s) / 2, oy: (canvas.height - U.VIEW_H * s) / 2, dpr };
    I.viewTransform = { s, ox: view.ox, oy: view.oy };
  }
  window.addEventListener("resize", resize);
  resize();
  // bake terrain & paint backgrounds at the resolution they'll actually be shown at
  W.bakeScale = U.clamp(Math.round(view.s * LD.Camera.base * 2) / 2, 1, 2);
  LD.BG.scale = U.clamp(view.s * LD.Camera.base * 0.85, 1, 1.5);

  const vignette = Art.vignette(U.VIEW_W, U.VIEW_H);

  G.applySettings = () => {
    const s = G.settings;
    A.vol.master = s.master; A.vol.music = s.music; A.vol.sfx = s.sfx; A.applyVolumes();
    C.shakeScale = s.shake;
    Art.highContrast = !!s.highContrast;
    I.setBinds(s.binds);
  };
  G.saveSettings = () => { G.settings.binds = I.binds; LD.Save.saveSettings(G.settings); };
  G.applySettings();

  G.pushOverlay = (o) => { G.overlays.push(o); };

  // ---------------------------------------------------------------- flow
  G.toTitle = () => {
    G.mode = "title"; G.overlays = []; G.cut = null; G.boss = null; HUD.boss = null; C.lock = null; C.focus = null;
    G.title = new LD.Menus.Title(G); G.title.started = true; G.title.t = 2;
    A.play("title"); A.setAmbience(null);
  };

  G.newGame = () => {
    LD.Save.clear();
    G.S = LD.newState();
    G.startPlay();
    G.loadRoom("margin", 14, 15);
    LD.Save.save(G.S);
    G.runIntro();
  };

  G.continueGame = () => {
    const s = LD.Save.load();
    if (!s) return G.newGame();
    G.S = Object.assign(LD.newState(), s);
    G.S.hp = D.player.maxHp;
    G.startPlay();
    G.loadRoom(G.S.room, G.S.px, G.S.py);
    HUD.areaName(W.room.name);
  };

  G.startPlay = () => {
    G.mode = "play"; G.overlays = []; G.cut = null; G.dying = null; G.boss = null; HUD.boss = null;
    G.arenaBurn = 0; G.inkSpotShow = null; G.crane = null; G.pageStair = null; G.pigmentWave = null; G.weaponFly = null;
    C.lock = null; C.focus = null; C.targetZoom = 1; G.timeScale = 1; G.freezePlayer = false;
    HUD.reset(G.S);
    G.updateLayers();
  };

  G.updateLayers = () => { A.layers = (G.S.flags.pigment_water ? 1 : 0) + (G.S.flags.boss_marshal ? 1 : 0); };

  G.loadRoom = (id, fx, fy, o = {}) => {
    const first = !G.S.visited[id];
    W.load(id, G.S);
    const hp = G.S.hp;
    const p = new LD.Player(fx * T, fy * T);
    if (G.player) { p.facing = o.face || G.player.facing; p.stamina = G.player.stamina; p.exhausted = G.player.exhausted; p.comboIdx = 0; }
    else if (o.face) p.facing = o.face;
    p.visFacing = p.facing;
    p.resetCloth();
    if (o.vy != null) p.vy = o.vy;
    if (o.vx != null) p.vx = o.vx;
    G.player = p;
    G.S.hp = hp;
    C.lock = null; C.focus = null;
    C.snap(p.cx(), p.cy(), W.room);
    if (!G.boss) A.play(W.room.music);
    A.setAmbience(W.room.amb);
    if (first) HUD.areaName(W.room.name);
    G.onEnterRoom(id, first);
  };

  G.changeRoom = (to, sx, sy, o = {}) => {
    if (G.transition) return;
    G.transition = { phase: "out", t: 0, to, sx, sy, o };
    A.sfx.page();
  };
  G.goDoor = (to, sx, sy) => G.changeRoom(to, sx, sy, { face: G.player.facing });

  G.checkpoint = () => {
    const p = G.player;
    G.S.room = W.room.id; G.S.px = p.cx() / T; G.S.py = Math.round(p.feet() / T);
    LD.Save.save(G.S);
  };
  G.saveGame = () => LD.Save.save(G.S);

  G.setFlag = (f, v = true) => {
    G.S.flags[f] = v;
    W.refresh(G.S);
    G.updateLayers();
  };
  G.reloadRoomKeepPlayer = () => {
    const p = G.player;
    const keep = { x: p.x, y: p.y, facing: p.facing, stamina: p.stamina };
    W.load(W.room.id, G.S);
    Object.assign(p, { x: keep.x, y: keep.y, facing: keep.facing });
    p.lastSafe = { x: p.x, y: p.y };
  };

  // ---------------------------------------------------------------- interactions
  G.openStation = (st) => {
    const S = G.S;
    S.hp = D.player.maxHp;
    S.station = { id: st.d.id, room: W.room.id };
    S.room = W.room.id; S.px = st.d.x; S.py = st.d.y;
    G.player.stamina = D.player.stamina.max; G.player.exhausted = false;
    LD.Save.save(S);
    A.sfx.save();
    HUD.hpPulse();
    P.burst(st.x, st.y - 50, 16, "spark", { min: 30, max: 120, p: { color: "rgba(255,210,150,0.8)", g: -40, size: 3 } });
    G.pushOverlay(new LD.StationMenu(G, st));
  };

  G.onWeaponFormed = () => {
    const S = G.S;
    LD.Save.save(S);
    if (!S.flags.firstWeapon) {
      S.flags.firstWeapon = true;
      setTimeout(() => HUD.thought("The book read your line and gave it weight. It is yours now — and the ink is spent."), 1400);
    }
  };

  G.talk = (k, npc) => {
    const S = G.S;
    const conv = LD.Lines[k].find((c) => c.when(S));
    if (!conv) return;
    const lines = conv.lines.map((t) => ({ who: conv.name, text: t }));
    G.pushOverlay(new LD.DialogueBox(lines, (GG) => {
      (conv.set || []).forEach((f) => (S.flags[f] = true));
      if (conv.give === "cache" && !S.collected.pell_gift) {
        S.collected.pell_gift = true;
        LD.Ink.add(S, D.ink.cache, G.player.cx(), G.player.y);
        A.sfx.inkGain();
      }
    }));
  };

  G.readLore = (id) => {
    if (!G.S.lore.includes(id)) G.S.lore.push(id);
    G.pushOverlay(new LD.LoreReader(id));
  };

  G.breakWall = (grp) => {
    A.sfx.breakWall();
    LD.Camera.shake(0.3);
    for (let y = grp.y; y < grp.y + grp.h; y++) for (let x = grp.x; x < grp.x + grp.w; x++)
      P.burst((x + 0.5) * T, (y + 0.5) * T, 10, "scrap", { min: 80, max: 300, p: { color: "#d8c9aa", g: 700, size: 7, life: 1.2 } });
    G.setFlag("broke_" + grp.id);
    HUD.thought("The paper wall tears away — a hidden room.");
  };

  G.openHatch = (tx, ty) => {
    A.sfx.breakWall();
    LD.Camera.shake(0.3);
    P.burst((tx + 1) * T, (ty + 1) * T, 20, "scrap", { min: 60, max: 260, p: { color: "#5c5750", g: 900, size: 5 } });
    G.setFlag("hatch_open");
    HUD.thought("The grate gives way. A shortcut up to the streets, near the Bindery.");
  };

  G.trigger = (id) => {
    G.S.flags["trig_" + id] = true;
    if (id === "sighting") G.runSighting();
    if (id === "ending") G.runEnding();
  };

  // ---------------------------------------------------------------- bosses
  G.startBoss = (boss, music, lock) => {
    G.boss = boss; HUD.boss = boss; HUD.bossShown = 1; HUD.bossLag = 1; HUD.bossLagF = 1;
    A.play(music);
    C.lock = lock;
  };
  G.endBoss = () => {
    G.boss = null; HUD.boss = null; C.lock = null;
    A.intensity = 0;
    A.play(W.room.music);
  };

  G.onHartDefeated = (hart) => {
    HUD.thought("The half-erased hart settles into the dry basin. Something blue glimmers there.");
    A.sfx.hart();
  };

  G.claimPigment = (altar) => {
    const p = G.player;
    LD.Cutscene.start(G, (function* () {
      p.auto = { dir: Math.sign(altar.x - p.cx()), x: altar.x };
      yield () => !p.auto || Math.abs(p.cx() - altar.x) < 8;
      p.auto = null; p.vx = 0;
      p.setState("raise");
      A.sfx.pigment();
      G.pigmentWave = { t: 0 };
      LD.Camera.shake(0.2);
      yield 1.4;
      G.S.flags.pigment_water = true;
      G.updateLayers();
      G.reloadRoomKeepPlayer();
      A.play("underground");
      HUD.titleCard("Water Pigment", "the lost blue returns to Looseleaf Borough");
      yield 3.2;
      HUD.thought("Black fingerprints on the basin. Someone reached it first — and left it.");
      yield 1.5;
      HUD.thought("Rest at a station to infuse your weapon with Water. Far above, a wheel begins to turn.");
      G.checkpoint();
    })());
  };

  G.runMarshalIntro = (boss) => {
    const p = G.player;
    LD.Cutscene.start(G, (function* () {
      p.vx = 0; p.auto = null;
      A.play("silence");
      C.focus = { x: boss.cx(), y: boss.y + 40, rate: 2.2 };
      C.targetZoom = 1.25;
      yield 1.3;
      boss.introRise = 0;
      yield () => { boss.introRise = Math.min(1, boss.introRise + 1 / 60); return boss.introRise >= 1; };
      A.sfx.roar(); C.shake(0.4);
      P.burst(boss.cx(), boss.cy(), 30, "ember", { min: 80, max: 300, p: { g: 50, size: 3, life: 1.3 } });
      yield 0.5;
      yield { say: LD.Speech.marshalIntro };
      C.focus = null; C.targetZoom = 1;
      boss.beginFight(G);
      HUD.titleCard(boss.name, boss.title);
    })());
  };

  G.runMarshalDefeat = (boss) => {
    const p = G.player, S = G.S;
    S.flags.boss_marshal = true;
    HUD.boss = null;
    LD.Cutscene.start(G, (function* () {
      p.atk = null; p.setState("normal"); p.vx = 0;
      A.play("silence");
      G.timeScale = 0.25;
      C.shake(0.6);
      yield 1.0;
      G.timeScale = 1;
      C.focus = { x: boss.cx(), y: boss.y + 60, rate: 2 };
      C.targetZoom = 1.2;
      yield 0.8;
      yield { say: LD.Speech.marshalDefeat };
      boss.dissolving = true;
      A.sfx.tear();
      yield 2.4;
      G.crane = { x: boss.cx(), y: boss.y + 50, t: 0, done: false };
      A.sfx.bell();
      C.focus = { x: p.cx(), y: p.cy(), rate: 1.5 };
      yield () => G.crane && G.crane.done;
      G.crane = null;
      S.flags.foldstep = true;
      G.updateLayers();
      A.sfx.pigment();
      P.burst(p.cx(), p.cy(), 40, "spark", { min: 60, max: 260, p: { color: "rgba(255,200,140,0.9)", g: -30, size: 4 } });
      p.setState("raise");
      HUD.titleCard("FOLDSTEP", "the Fire Keeper's gift — fold through creases, gaps and blows");
      yield 2.2;
      // perform it once, immediately
      p.facing = 1; p.setState("normal");
      p.startFold(G, 1, 0);
      yield 0.6;
      C.focus = null; C.targetZoom = 1;
      yield { say: LD.Speech.inkSpotAfterBoss };
      G.endBoss();
      G.reloadRoomKeepPlayer();
      A.play("margin");
      G.checkpoint();
      HUD.thought("Foldstep: [" + I.label("dash") + "] + a direction. Jump over the burned floor, then fold across.");
    })());
  };

  G.runSighting = () => {
    const p = G.player, S = G.S;
    LD.Cutscene.start(G, (function* () {
      p.vx = 0;
      yield () => p.onGround;
      G.inkSpotShow = { x: 28 * T, y: 8 * T, s: 0.8, a: 0, flip: true, state: "appear", t: 0 };
      C.focus = { x: 24 * T, y: 6 * T, rate: 2 };
      A.sfx.whisper();
      yield 2.2;
      G.inkSpotShow.state = "turn";
      A.sfx.heartbeat();
      yield 1.0;
      G.inkSpotShow.state = "dissolve";
      A.sfx.tear();
      yield 1.3;
      G.inkSpotShow = null;
      C.focus = null;
      S.flags.sawInkSpot = true;
      HUD.thought("Someone was watching from the rooftops. Someone drawn in a hurry.");
    })());
  };

  G.runEnding = () => {
    const p = G.player, S = G.S;
    LD.Cutscene.start(G, (function* () {
      A.play("void");
      p.auto = { dir: -1, x: 15 * T };
      yield () => !p.auto;
      p.vx = 0; p.facing = -1;
      C.focus = { x: 9 * T, y: 9 * T, rate: 1.1 };
      C.targetZoom = 0.9;
      yield 2.2;
      G.inkSpotShow = { x: 5 * T, y: 17.5 * T, s: 1.9, a: 0, flip: false, state: "rise", t: 0, rise: 0 };
      A.sfx.whisper(); A.sfx.heartbeat();
      yield 2.6;
      yield { say: LD.Speech.ending };
      G.inkSpotShow.state = "reach";
      yield 1.2;
      G.inkSpotShow.state = "sink";
      A.sfx.tear();
      yield 2.0;
      G.inkSpotShow = null;
      G.pageStair = { t: 0 };
      A.sfx.page();
      yield 2.2;
      S.flags.chapterDone = true;
      G.checkpoint();
      A.play("ending");
      HUD.titleCard("Chapter 1 complete", "the corruption runs far deeper than Looseleaf Borough");
      yield 3.6;
      C.focus = null; C.targetZoom = 1;
      G.pushOverlay(new LD.Menus.EndCard(G));
    })());
  };

  G.runIntro = () => {
    const p = G.player;
    G.freezePlayer = true;
    p.setPos(14 * T, 3 * T);
    G.fadeA = 1;
    G.storyText = { lines: ["Once, this book was full of colour.", "Now its pages fade, and its ink bleeds loose.", "Something has been taking what was drawn.", "A page-mender has been sent to fix it."], t: 0 };
    LD.Cutscene.start(G, (function* () {
      yield () => !G.storyText;
      G.tearFx = { t: 0 };
      A.sfx.tear();
      yield 0.9;
      G.freezePlayer = false;
      yield () => p.onGround;
      C.shake(0.3);
      A.sfx.land();
      P.burst(p.cx(), p.feet(), 20, "scrap", { angle: -Math.PI / 2, spread: 1.4, min: 60, max: 260, p: { color: "#e2d4b6", g: 500, size: 6 } });
      yield 1.0;
      HUD.areaName("The Margin");
      yield 0.6;
    })());
  };

  G.onEnterRoom = (id, first) => {
    const S = G.S;
    if (id === "bindery" && !S.flags.metQuillon) {
      LD.Cutscene.start(G, (function* () { yield 0.8; G.talk("quillon"); yield () => !G.overlays.length; })());
    }
    if (id === "canals" && first) setTimeout(() => HUD.thought("The canals are bone dry. The river painted on the walls has gone pale."), 1200);
    if (id === "cistern" && !S.flags.boss_hart && first) setTimeout(() => HUD.thought("Something half-erased stirs in the dry basin."), 800);
    if (id === "arena" && S.flags.boss_marshal) A.play("margin");
    if (id === "edge" && first) setTimeout(() => HUD.thought("The edge of the page. Beyond it, only the gutter — and something moving in it."), 800);
  };

  G.onPlayerDeath = () => {
    G.S.deaths++;
    G.dying = { t: 0 };
    HUD.boss = null;
  };

  function finishDeath() {
    const deaths = G.S.deaths, time = G.S.time, visited = G.S.visited, lore = G.S.lore;
    const saved = LD.Save.load() || LD.newState();
    G.S = Object.assign(LD.newState(), saved);
    G.S.deaths = deaths; G.S.time = time;
    Object.assign(G.S.visited, visited);
    for (const l of lore) if (!G.S.lore.includes(l)) G.S.lore.push(l);
    G.S.hp = D.player.maxHp;
    LD.Save.save(G.S);
    G.player = null;
    G.startPlay();
    G.loadRoom(G.S.room, G.S.px, G.S.py);
    G.fadeA = 1;
    HUD.thought("The line breaks… and is redrawn where you last rested.");
  }

  G.fade = (outT, inT) => { G.fadeQ = { out: outT, in: inT, t: 0 }; };

  // ---------------------------------------------------------------- update
  function checkExits() {
    const p = G.player;
    if (p.dead || p.state === "hazard") return;
    const cx = p.cx(), cy = p.cy();
    let side = null;
    if (cx < 2) side = "L"; else if (cx > W.w * T - 2) side = "R";
    else if (p.y < 8 && p.vy < 0) side = "T"; else if (p.y > W.h * T) side = "B";
    if (!side) return;
    for (const e of W.room.exits) {
      if (e.side !== side) continue;
      const inRange = side === "L" || side === "R" ? (cy / T >= e.a - 1 && cy / T <= e.b + 1.5) : (cx / T >= e.a - 1 && cx / T <= e.b + 2);
      if (!inRange) continue;
      const o = { face: e.face || p.facing };
      if (e.vy != null) o.vy = e.vy; else if (side === "B") o.vy = Math.max(p.vy, 200);
      if (side === "L" || side === "R") o.vx = p.vx;
      G.changeRoom(e.to, e.sx, e.sy, o);
      return;
    }
  }

  function ambient(dt) {
    const th = W.room.theme, cx = C.x, cy = C.y, vw = C.viewW(), vh = C.viewH();
    const rate = { margin: 1.5, dusk: 2, gardens: 3, bridge: 1.5, spire: 1.5, ash: 6, archive: 10, canal: 1.5, cistern: 2, bindery: 2, void: 3 }[th] || 1;
    let n = rate * dt * (1 + G.arenaBurn);
    while (Math.random() < n) {
      n -= 1;
      const x = cx + Math.random() * vw, y = cy + Math.random() * vh;
      if (th === "dusk" || th === "gardens" || th === "bridge") P.add({ kind: "scrap", x, y: cy - 10, vx: U.rand(-40, 10), vy: U.rand(20, 50), g: 10, drag: 0.2, color: th === "gardens" ? "#b98f86" : "#a8453a", size: 3, life: 7 });
      else if (th === "ash" || th === "archive") P.add({ kind: Math.random() < 0.4 ? "ember" : "ash", x, y: cy + vh + 10, vx: U.rand(-20, 20), vy: -U.rand(60, 120), g: -5, drag: 0.1, color: "rgba(80,70,65,0.7)", size: 2.5, life: 5 });
      else if (th === "void") P.add({ kind: "page", x, y: cy + vh + 20, vx: U.rand(-20, 20), vy: -U.rand(20, 50), g: -2, drag: 0.1, color: "#e6dac1", size: 5, life: 12 });
      else if (th === "margin") P.add({ kind: "dust", x, y, vx: U.rand(-8, 8), vy: U.rand(-8, 8), g: 0, color: "rgba(60,45,35,0.35)", size: 2, life: 4 });
      else if ((th === "canal" || th === "cistern") && G.S.flags.pigment_water) P.add({ kind: "mote", x, y, vx: 0, vy: -U.rand(5, 20), g: 0, color: "rgba(110,170,240,0.6)", size: 3, life: 3 });
      else P.add({ kind: "dust", x, y, vx: U.rand(-5, 5), vy: U.rand(-5, 5), g: 0, color: "rgba(200,190,170,0.35)", size: 2, life: 4 });
    }
  }

  G.update = (dt) => {
    G.time += dt;
    Art.tick(G.time);
    A.update(dt);
    canvas.style.cursor = G.mode === "title" || G.overlays.length ? "default" : "none";

    if (G.mode === "title") {
      if (G.overlays.length) { const top = G.overlays[G.overlays.length - 1]; if (!top.update(dt, G)) G.overlays.pop(); }
      else G.title.update(dt, G);
      return;
    }
    if (G.mode !== "play") return;

    HUD.update(dt, G);
    HUD.objective(LD.Quest.current(G.S));
    G.overlay = G.overlays[G.overlays.length - 1] || null;
    if (G.fadeQ) {
      const q = G.fadeQ; q.t += dt;
      G.fadeA = q.t < q.out ? q.t / q.out : Math.max(0, 1 - (q.t - q.out) / q.in);
      if (q.t > q.out + q.in) { G.fadeQ = null; G.fadeA = 0; }
    } else if (!G.dying && !G.storyText && G.fadeA > 0) G.fadeA = Math.max(0, G.fadeA - dt * 1.5);

    if (G.storyText) {
      G.storyText.t += dt;
      if (G.storyText.t > G.storyText.lines.length * 2.1 + 0.9 || (G.storyText.t > 0.5 && (I.pressed("confirm") || I.pressed("pause")))) G.storyText = null;
      return;
    }

    if (G.overlay) {
      if (!G.overlay.update(dt, G)) G.overlays.splice(G.overlays.indexOf(G.overlay), 1);
      if (G.overlay && G.overlay.pause) { if (G.cut) LD.Cutscene.step(G, 0); return; }
    }

    if (G.transition) {
      const tr = G.transition;
      tr.t += dt;
      if (tr.phase === "out" && tr.t >= 0.32) {
        G.loadRoom(tr.to, tr.sx, tr.sy, tr.o);
        tr.phase = "in"; tr.t = 0;
      } else if (tr.phase === "in" && tr.t >= 0.36) G.transition = null;
      if (tr.phase === "out") return;
    }

    if (G.dying) {
      G.dying.t += dt;
      G.fadeA = U.clamp((G.dying.t - 1.4) / 1.0, 0, 1);
      if (G.dying.t > 3.2) { G.dying = null; finishDeath(); return; }
    } else if (!G.cut && !G.transition) {
      if (I.pressed("pause")) { G.pushOverlay(new LD.Menus.Pause(G)); return; }
      if (I.pressed("map")) { G.pushOverlay(new LD.MapView(G)); return; }
    }

    if (!G.dying) G.S.time += dt;
    G.inputLocked = !!G.transition;
    LD.Cutscene.step(G, dt);

    let wdt = dt * G.timeScale;
    if (G.hitstop > 0) { G.hitstop -= dt; wdt = 0; }
    if (wdt > 0) {
      if (!G.freezePlayer) G.player.update(wdt, G);
      W.enemies = W.enemies.filter((e) => e.update(wdt, G) !== false && !(e.dead && e.deathT > 3 && !e.isBoss));
      W.objs = W.objs.filter((o) => o.update(wdt, G) !== false);
      W.projectiles = W.projectiles.filter((pr) => pr.update(wdt, G));
      W.effects = W.effects.filter((ef) => ef.update(wdt, G));
      P.update(wdt);
      ambient(wdt);
      if (G.crane) updateCrane(wdt);
      if (G.inkSpotShow) updateInkSpot(wdt);
      if (G.pageStair) G.pageStair.t += wdt;
      if (G.pigmentWave) { G.pigmentWave.t += wdt; if (G.pigmentWave.t > 2.6) G.pigmentWave = null; }
      if (G.tearFx) { G.tearFx.t += wdt; if (G.tearFx.t > 3) G.tearFx = null; }
    }
    C.update(dt, G.freezePlayer ? null : G.player, W.room);
    if (!G.transition && !G.cut && !G.dying) checkExits();
    else if (G.cut && !G.transition && !G.dying) checkExits();
    if (G.weaponFly) {
      G.weaponFly.t += dt;
      if (G.weaponFly.t > 0.5) {
        G.weaponFly = null;
        const p = G.player;
        p.setState("raise");
        A.sfx.bell();
        P.burst(p.cx() + p.facing * 10, p.y + 10, 24, "ink", { min: 80, max: 320, lift: 100, p: { color: G.S.weapon.element === "water" ? Art.WATER : Art.INK } });
        C.shake(0.2);
      }
    }
  };

  function updateCrane(dt) {
    const c = G.crane, p = G.player;
    c.t += dt;
    const tx = p.cx(), ty = p.y + 10;
    const k = U.clamp((c.t - 0.6) / 1.6, 0, 1);
    c.dx = U.lerp(c.x, tx, U.easeInOut(k)); c.dy = U.lerp(c.y, ty, U.easeInOut(k)) - Math.sin(k * Math.PI) * 140 - (c.t < 0.6 ? c.t * 60 : 0);
    if (Math.random() < 0.8) P.add({ kind: "ember", x: c.dx, y: c.dy, vx: U.rand(-20, 20), vy: U.rand(-20, 20), g: 0, size: 2.5, life: 0.8 });
    if (k >= 1) c.done = true;
  }
  function updateInkSpot(dt) {
    const s = G.inkSpotShow;
    s.t += dt;
    if (s.state === "appear") s.a = Math.min(1, s.a + dt * 0.8);
    if (s.state === "turn") s.flip = false;
    if (s.state === "rise") { s.a = Math.min(1, s.a + dt * 0.7); s.rise = Math.min(1, s.rise + dt * 0.45); }
    if (s.state === "reach") s.reach = Math.min(1, (s.reach || 0) + dt * 1.2);
    if (s.state === "dissolve" || s.state === "sink") {
      s.a = Math.max(0, s.a - dt * 0.8);
      if (s.state === "sink") s.rise = Math.max(0, s.rise - dt * 0.5);
      for (let i = 0; i < 4; i++) P.add({ kind: "ink", x: s.x + U.rand(-20, 20) * s.s, y: s.y - U.rand(0, 150) * s.s, vx: s.state === "dissolve" ? U.rand(100, 400) : U.rand(-40, 40), vy: U.rand(-60, 40), g: s.state === "dissolve" ? 50 : 300, color: "#120b10", size: U.rand(2, 5), life: 1.2 });
    }
  }

  // ---------------------------------------------------------------- draw
  function drawWorld() {
    const S = G.S, t = G.time;
    const z = C.zoom;
    // sky (screen space)
    const AS = LD.Assets, RL = LD.ArtManifest.roomLayers, rid = W.room.id;
    ctx.drawImage(AS.room(rid, "sky") || W.bg.sky, 0, 0, U.VIEW_W, U.VIEW_H);
    ctx.save();
    ctx.scale(z, z);
    ctx.translate(-Math.round((C.x + C.ox) * 10) / 10, -Math.round((C.y + C.oy) * 10) / 10);
    if (AS.hasPaintedBackdrop(rid)) { for (const l of ["far", "mid", "near"]) { const im = AS.room(rid, l); if (im) AS.drawLayer(ctx, im, RL[l], W.room, C); } }
    else LD.BG.draw(ctx, W.bg, C);
    if (Art.highContrast) { ctx.fillStyle = "rgba(236,225,201,0.5)"; ctx.fillRect(C.x - 50, C.y - 50, C.viewW() + 100, C.viewH() + 100); }
    W.drawLiveBack(ctx, S, t);
    // terrain: draw only the visible part of the baked canvas
    const s = W.bakeScale, vx = Math.max(0, C.x - 40), vy = Math.max(0, C.y - 40);
    const vw = Math.min(W.w * T - vx, C.viewW() + 80), vh = Math.min(W.h * T - vy, C.viewH() + 80);
    const pt = AS.room(rid, "terrain");
    if (pt) {
      ctx.drawImage(pt, 0, 0, W.w * T, W.h * T);
      const sec = AS.room(rid, "secret");
      if (sec && (W.room.covers || []).length) ctx.drawImage(sec, 0, 0, W.w * T, W.h * T);
    }
    if (vw > 0 && vh > 0) ctx.drawImage(W.terrain, vx * s, vy * s, vw * s, vh * s, vx, vy, vw, vh);
    W.drawLiveFront(ctx, S, t);
    if (G.pageStair) drawPageStair(ctx, t);
    for (const o of W.objs) if (!W.hiddenAt(o.x, o.y)) o.draw(ctx, G);
    for (const e of W.effects) e.draw(ctx, G);
    for (const e of W.enemies) e.draw(ctx, G);
    P.draw(ctx, false);
    if (G.inkSpotShow) { const s2 = G.inkSpotShow; LD.drawInkSpot(ctx, s2.x, s2.y + (s2.rise != null ? (1 - s2.rise) * 260 : 0), s2.s, t, s2.a, { flip: s2.flip, reach: s2.reach }); }
    if (!G.freezePlayer || (G.storyText == null && G.tearFx)) { if (!G.freezePlayer) G.player.draw(ctx, G); }
    for (const pr of W.projectiles) pr.draw(ctx, G);
    if (G.crane) drawCrane(ctx, G.crane, t);
    if (G.tearFx) drawTear(ctx, G.tearFx.t);
    P.draw(ctx, true);
    W.drawLights(ctx, S, t);
    HUD.drawWorld(ctx, G);
    const pfg = AS.room(rid, "fg");
    if (pfg) AS.drawLayer(ctx, pfg, RL.fg, W.room, C); else if (!AS.hasPaintedBackdrop(rid)) LD.BG.drawFg(ctx, W.bg, C);
    ctx.restore();
    W.grade(ctx, S, t);
    if (W.room.theme === "archive" && G.arenaBurn > 0) {
      const f = 0.8 + U.noise1(t * 5) * 0.3;
      const g = ctx.createLinearGradient(0, U.VIEW_H, 0, U.VIEW_H * 0.3);
      g.addColorStop(0, "rgba(255,90,30," + 0.22 * G.arenaBurn * f + ")"); g.addColorStop(1, "rgba(255,90,30,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
      if (G.arenaBurn >= 2) { ctx.fillStyle = "rgba(20,8,4,0.18)"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H); }
    }
    if (G.pigmentWave) {
      const k = G.pigmentWave.t / 2.6;
      ctx.save();
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.55;
      ctx.fillStyle = "#3f7fc0";
      Art.blobPath(ctx, U.VIEW_W / 2, U.VIEW_H / 2, 100 + k * 1100, 80 + k * 800, 5, 24, 0.25); ctx.fill();
      ctx.restore();
    }
  }

  function drawCrane(ctx, c, t) {
    const x = c.dx, y = c.dy;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; Art.glow(ctx, x, y, 70, "rgba(255,150,60,0.6)"); ctx.restore();
    ctx.save(); ctx.translate(x, y);
    const flap = Math.sin(t * 10) * 0.5;
    ctx.fillStyle = "#f3e2c0"; ctx.strokeStyle = "#b8431f"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(0, -4); ctx.lineTo(18, -10); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(-10, -18 * (1 + flap)); ctx.lineTo(8, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawTear(ctx, t) {
    // the page tearing open above the Margin as the Sketcher arrives
    const k = U.clamp(t / 0.5, 0, 1) * U.clamp((3 - t) / 1, 0, 1);
    const x = 14 * T, y = 60;
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = "#0e0a09";
    ctx.beginPath(); ctx.moveTo(x - 70, y);
    for (let i = 0; i <= 10; i++) ctx.lineTo(x - 70 + i * 14, y + (i % 2 ? 18 : -6) + Math.sin(t * 20 + i) * 2);
    for (let i = 10; i >= 0; i--) ctx.lineTo(x - 70 + i * 14, y + 40 + (i % 2 ? 10 : 30));
    ctx.fill();
    ctx.strokeStyle = "#e6dac1"; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  function drawPageStair(ctx, t) {
    // floating pages settling into a stair that descends into the gutter: the deeper route
    const n = 9;
    for (let i = 0; i < n; i++) {
      const k = U.clamp(t * 1.4 - i * 0.25, 0, 1);
      if (k <= 0) continue;
      const x = 9 * T - i * 46, y = 15 * T + 20 + i * 34 + (1 - U.easeOut(k)) * 200 + Math.sin(t * 1.5 + i) * 3;
      ctx.save(); ctx.globalAlpha = k; ctx.translate(x, y); ctx.rotate(Math.sin(i * 1.7) * 0.08);
      ctx.fillStyle = "#e6dac1"; ctx.fillRect(-26, -5, 52, 10);
      ctx.strokeStyle = "#15100d"; ctx.lineWidth = 2; ctx.strokeRect(-26, -5, 52, 10);
      ctx.restore();
    }
  }

  function drawTransition() {
    const tr = G.transition;
    if (!tr) return;
    const k = tr.phase === "out" ? U.easeInOut(tr.t / 0.32) : U.easeInOut(tr.t / 0.36);
    const Wd = U.VIEW_W, Hh = U.VIEW_H;
    const sheet = Art.parchment(Wd, Hh, 1234);
    ctx.save();
    let x0, x1;
    if (tr.phase === "out") { x0 = Wd * (1 - k); x1 = Wd + 60; } else { x0 = -60; x1 = Wd * (1 - k); }
    ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, Hh); ctx.clip();
    ctx.drawImage(sheet, 0, 0);
    ctx.restore();
    // curling edge shadow & highlight
    const ex = tr.phase === "out" ? x0 : x1;
    const g = ctx.createLinearGradient(ex - 70, 0, ex + 10, 0);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.8, "rgba(20,12,6,0.35)"); g.addColorStop(1, "rgba(255,245,225,0.6)");
    ctx.fillStyle = g;
    ctx.fillRect(ex - 70, 0, 80, Hh);
  }

  function drawStory() {
    const st = G.storyText;
    ctx.fillStyle = "#0e0a08"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
    st.lines.forEach((l, i) => {
      const t0 = i * 2.1;
      const a = U.clamp((st.t - t0) / 0.8, 0, 1);
      if (a <= 0) return;
      Art.text(ctx, l, U.VIEW_W / 2, 250 + i * 60, 34, { align: "center", font: "serif", color: "#e6d9bc", alpha: a });
    });
    Art.text(ctx, "press " + (I.usingPad ? "A" : "Enter") + " to skip", U.VIEW_W - 30, U.VIEW_H - 24, 16, { align: "right", color: "rgba(230,217,188,0.35)" });
  }

  G.draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0c0907"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.s, 0, 0, view.s, view.ox, view.oy);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, U.VIEW_W, U.VIEW_H); ctx.clip();
    ctx.imageSmoothingQuality = "high";
    if (G.mode === "title") {
      G.title.draw(ctx, G);
      for (const o of G.overlays) o.draw(ctx, G);
    } else if (G.mode === "play") {
      drawWorld();
      ctx.drawImage(vignette, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.16; ctx.fillStyle = ctx.createPattern(Art.grain(), "repeat"); ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H); ctx.restore();
      HUD.draw(ctx, G);
      if (G.weaponFly) {
        const f = G.weaponFly, p = G.player, k = U.easeIn(f.t / 0.5);
        const hx = (p.cx() + p.facing * 12 - C.x) * C.zoom, hy = (p.y + 30 - C.y) * C.zoom;
        const x = U.lerp(f.x, hx, k), y = U.lerp(f.y, hy, k) - Math.sin(k * Math.PI) * 80;
        const len = U.lerp(240, D.weapons[G.S.weapon.cls].length, k);
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35 - k * 1.2); ctx.translate(-len / 2, 0);
        LD.drawWeaponStrokes(ctx, G.S.weapon.strokes, len, G.S.weapon.element, Art.boil);
        ctx.restore();
      }
      for (const o of G.overlays) o.draw(ctx, G);
      if (G.fadeA > 0) { ctx.fillStyle = "rgba(12,8,6," + G.fadeA + ")"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H); }
      if (G.dying && G.dying.t > 1.6) Art.text(ctx, "The line breaks…", U.VIEW_W / 2, U.VIEW_H / 2, 44, { align: "center", font: "serif", color: "#e6d9bc", alpha: U.clamp((G.dying.t - 1.6) / 0.6, 0, 1) });
      if (G.storyText) drawStory();
      drawTransition();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- boot
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    I.pollPad();
    try {
      if (!G.debugHold) { G.update(dt); G.draw(); }
    } catch (e) {
      console.error(e);
    }
    I.endFrame();
    requestAnimationFrame(frame);
  }

  function boot() {
    const bootEl = document.getElementById("boot");
    if (bootEl) { bootEl.style.opacity = 0; setTimeout(() => bootEl.remove(), 700); }
    G.mode = "title";
    G.title = new LD.Menus.Title(G);
    requestAnimationFrame(frame);
  }
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all(['32px "Caveat"', '32px "IM Fell English SC"', '32px "IM Fell English"'].map((f) => document.fonts.load(f).catch(() => null)))
    : Promise.resolve();
  Promise.all([
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]),
    Promise.race([LD.Assets.loadAll(), new Promise((r) => setTimeout(r, 8000))]),
  ]).then(boot);

  // expose for debugging
  window.G = G;
})();
