// AudioSystem: everything is synthesized with WebAudio — a sparse piano + string score,
// paper/ink foley, enemy voices and room ambience. No audio files are needed.
(function () {
  const LD = window.LD;
  const U = LD.U;

  const A = (LD.Audio = {
    ctx: null,
    vol: { master: 0.8, music: 0.65, sfx: 0.8 },
    track: null,
    pendingTrack: "title",
    intensity: 0,
    layers: 0, // extra richness as the borough is restored
    ambience: null,
  });

  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

  A.init = () => {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (A.ctx = new AC());
    A.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    A.master.connect(comp).connect(ctx.destination);
    A.musicBus = ctx.createGain(); A.musicBus.connect(A.master);
    A.musicFade = ctx.createGain(); A.musicFade.connect(A.musicBus);
    A.sfxBus = ctx.createGain(); A.sfxBus.connect(A.master);
    A.ambBus = ctx.createGain(); A.ambBus.connect(A.sfxBus); A.ambBus.gain.value = 0.7;

    // Reverb: generated impulse (a dusty library hall).
    const len = ctx.sampleRate * 3.2;
    const imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = imp.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    A.reverb = ctx.createConvolver(); A.reverb.buffer = imp;
    A.revSend = ctx.createGain(); A.revSend.gain.value = 0.45;
    A.revSend.connect(A.reverb).connect(A.master);

    const nlen = ctx.sampleRate * 2;
    A.noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = A.noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    // brown-ish noise for rumbles and wind
    A.brownBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const bd = A.brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < nlen; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }

    A.applyVolumes();
    A.nextTime = ctx.currentTime + 0.1;
    A.step = 0;
    setInterval(schedule, 40);
    if (A.pendingTrack) A.play(A.pendingTrack, true);
    if (A.pendingAmb) A.setAmbience(A.pendingAmb);
  };

  A.applyVolumes = () => {
    if (!A.ctx) return;
    A.master.gain.value = A.vol.master;
    A.musicBus.gain.value = A.vol.music * 0.55;
    A.sfxBus.gain.value = A.vol.sfx;
  };

  // ---------------------------------------------------------------- instruments
  function env(g, t, a, peak, decay, sustain = 0.0001) {
    peak = Math.max(peak, 0.0002);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + decay);
  }
  function piano(midi, t, vel = 0.5, len = 2.6) {
    const ctx = A.ctx, f = NOTE(midi);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400 + vel * 2400;
    g.connect(lp); lp.connect(A.musicFade); lp.connect(A.revSend);
    const parts = [[1, "triangle", 1], [2, "sine", 0.35], [3, "sine", 0.12], [1.002, "sine", 0.5]];
    for (const [m, type, amp] of parts) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * m;
      const og = ctx.createGain(); og.gain.value = amp;
      o.connect(og).connect(g); o.start(t); o.stop(t + len + 0.1);
    }
    env(g, t, 0.006, 0.22 * vel, len);
  }
  function bell(midi, t, vel = 0.4) {
    const ctx = A.ctx, f = NOTE(midi);
    const g = ctx.createGain(); g.connect(A.musicFade); g.connect(A.revSend);
    [[1, 1], [2.76, 0.4], [5.4, 0.2], [8.93, 0.08]].forEach(([m, a]) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * m;
      const og = ctx.createGain(); og.gain.value = a; o.connect(og).connect(g); o.start(t); o.stop(t + 4);
    });
    env(g, t, 0.004, 0.18 * vel, 3.6);
  }
  function pad(midis, t, dur, vel = 0.3, bright = 900) {
    const ctx = A.ctx;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = bright; lp.Q.value = 0.4;
    g.connect(lp); lp.connect(A.musicFade); lp.connect(A.revSend);
    for (const m of midis) {
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = NOTE(m); o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = 0.5 / midis.length;
        o.connect(og).connect(g); o.start(t); o.stop(t + dur + 2.2);
      }
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09 * vel, t + Math.min(1.4, dur * 0.4));
    g.gain.setValueAtTime(0.09 * vel, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 2);
  }
  function bass(midi, t, dur, vel = 0.5) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = NOTE(midi);
    const g = ctx.createGain(); o.connect(g).connect(A.musicFade);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.1);
  }
  function drum(t, kind, vel = 1) {
    const ctx = A.ctx;
    if (kind === "taiko" || kind === "kick") {
      const o = ctx.createOscillator(); o.type = "sine";
      const base = kind === "taiko" ? 70 : 55;
      o.frequency.setValueAtTime(base * 2.2, t); o.frequency.exponentialRampToValueAtTime(base, t + 0.12);
      const g = ctx.createGain(); o.connect(g).connect(A.musicFade); g.connect(A.revSend);
      env(g, t, 0.003, 0.5 * vel, kind === "taiko" ? 0.7 : 0.35);
      o.start(t); o.stop(t + 0.9);
    }
    const n = ctx.createBufferSource(); n.buffer = A.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = kind === "hat" ? "highpass" : "bandpass";
    bp.frequency.value = kind === "hat" ? 6000 : kind === "taiko" ? 180 : 900;
    const g = ctx.createGain(); n.connect(bp).connect(g).connect(A.musicFade);
    env(g, t, 0.002, (kind === "hat" ? 0.05 : 0.14) * vel, kind === "hat" ? 0.05 : 0.25);
    n.start(t, Math.random()); n.stop(t + 0.5);
  }

  // ---------------------------------------------------------------- score
  // Each track is data: root, scale, chord roots (scale degrees), tempo, and which voices play.
  const MINOR = [0, 2, 3, 5, 7, 8, 10], MAJOR = [0, 2, 4, 5, 7, 9, 11], DORIAN = [0, 2, 3, 5, 7, 9, 10], LYD = [0, 2, 4, 6, 7, 9, 11];
  const TRACKS = {
    title: { root: 50, scale: MINOR, prog: [0, 5, 2, 6], bpm: 54, pad: 0.7, piano: 0.28, bright: 700 },
    margin: { root: 57, scale: MINOR, prog: [0, 3, 5, 4], bpm: 60, pad: 0.35, piano: 0.16, bright: 600 },
    borough: { root: 57, scale: DORIAN, prog: [0, 3, 5, 4, 0, 6, 3, 4], bpm: 64, pad: 0.5, piano: 0.24, bright: 800, richer: true },
    underground: { root: 52, scale: MINOR, prog: [0, 5, 3, 4], bpm: 50, pad: 0.55, piano: 0.14, bright: 500, low: true, richer: true },
    bindery: { root: 53, scale: LYD, prog: [0, 4, 5, 3], bpm: 58, pad: 0.55, piano: 0.34, arp: true, bright: 1100, richer: true },
    miniboss: { root: 50, scale: MINOR, prog: [0, 0, 5, 4], bpm: 100, pad: 0.4, piano: 0.0, ostinato: true, perc: "light", bright: 900 },
    boss: { root: 48, scale: MINOR, prog: [0, 0, 5, 6, 0, 0, 3, 4], bpm: 112, pad: 0.5, piano: 0.0, ostinato: true, perc: "heavy", bright: 1300 },
    ending: { root: 58, scale: MAJOR, prog: [0, 5, 3, 4], bpm: 50, pad: 0.6, piano: 0.32, arp: true, bells: true, bright: 900 },
    void: { root: 46, scale: MINOR, prog: [0, 6, 5, 6], bpm: 44, pad: 0.7, piano: 0.1, bright: 450, low: true },
    silence: null,
  };
  let melody = 0;

  A.play = (name, instant) => {
    A.pendingTrack = name;
    if (!A.ctx || A.trackName === name) return;
    const ctx = A.ctx;
    const now = ctx.currentTime;
    A.musicFade.gain.cancelScheduledValues(now);
    A.musicFade.gain.setValueAtTime(A.musicFade.gain.value, now);
    if (instant || !A.track) {
      A.musicFade.gain.linearRampToValueAtTime(1, now + 0.8);
      A.track = TRACKS[name]; A.trackName = name; A.step = 0; A.nextTime = now + 0.15;
    } else {
      A.musicFade.gain.linearRampToValueAtTime(0.0001, now + 1.1);
      A.trackName = name;
      clearTimeout(A._swap);
      A._swap = setTimeout(() => {
        A.track = TRACKS[name]; A.step = 0; A.nextTime = A.ctx.currentTime + 0.1;
        A.musicFade.gain.cancelScheduledValues(A.ctx.currentTime);
        A.musicFade.gain.setValueAtTime(0.0001, A.ctx.currentTime);
        A.musicFade.gain.linearRampToValueAtTime(1, A.ctx.currentTime + 1.4);
      }, 1150);
    }
  };

  function chordNotes(tr, degree, octave = 0) {
    const sc = tr.scale, n = sc.length;
    return [0, 2, 4].map((k) => {
      const d = degree + k;
      return tr.root + sc[d % n] + 12 * Math.floor(d / n) + 12 * octave;
    });
  }
  function scaleNote(tr, idx) {
    const sc = tr.scale, n = sc.length;
    const o = Math.floor(idx / n), d = ((idx % n) + n) % n;
    return tr.root + 12 + sc[d] + 12 * o;
  }

  function schedule() {
    if (!A.ctx) return;
    const ctx = A.ctx;
    while (A.nextTime < ctx.currentTime + 0.25) {
      const tr = A.track;
      const bpm = tr ? tr.bpm * (1 + A.intensity * 0.06) : 60;
      const stepDur = 60 / bpm / 4;
      if (tr) playStep(tr, A.step, A.nextTime, stepDur);
      A.nextTime += stepDur;
      A.step++;
    }
  }

  function playStep(tr, i, t, sd) {
    const s = i % 16, bar = Math.floor(i / 16);
    const deg = tr.prog[bar % tr.prog.length];
    const rich = tr.richer ? A.layers : 1;
    const chord = chordNotes(tr, deg, tr.low ? -1 : 0);
    if (s === 0) {
      if (tr.pad) pad(chord, t, sd * 16, tr.pad * (0.6 + 0.2 * rich), tr.bright + 250 * rich);
      bass(chord[0] - 12, t, sd * 14, 0.7);
      if (tr.bells && bar % 2 === 0) bell(chord[2] + 12, t + sd * 8, 0.5);
    }
    if (tr.arp && tr.piano) {
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      if (s % 2 === 0 && Math.random() < 0.55 + 0.12 * rich) {
        const n = chord[pat[(s / 2) % 8]] + 12;
        piano(n, t, tr.piano * U.rand(0.7, 1.1));
      }
    } else if (tr.piano) {
      if (s % 2 === 0 && Math.random() < tr.piano * (0.9 + 0.35 * rich)) {
        melody += U.pick([-2, -1, -1, 0, 1, 1, 2, 3, -3]);
        melody = U.clamp(melody, -2, 10);
        piano(scaleNote(tr, melody), t, U.rand(0.35, 0.8));
        if (Math.random() < 0.2) piano(scaleNote(tr, melody - 7), t, 0.3);
      }
    }
    if (tr.richer && rich >= 2 && s === 8 && Math.random() < 0.5) bell(chord[1] + 24, t, 0.25);
    if (tr.ostinato) {
      const hi = A.intensity;
      if (s % 2 === 0) {
        const pat = [0, 0, 2, 0, 1, 0, 2, 1];
        const n = chord[pat[(s / 2) % 8]] - (s % 4 === 0 ? 12 : 0);
        piano(n, t, 0.35 + hi * 0.12, 0.35);
      }
      if (hi > 0 && s % 4 === 2) piano(chord[2] + 12, t, 0.18 + hi * 0.1, 0.3);
    }
    if (tr.perc === "heavy") {
      const k = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0];
      const tk = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0];
      if (k[s]) drum(t, "taiko", 1);
      if (tk[s]) drum(t, "kick", 0.7 + 0.2 * A.intensity);
      if (A.intensity >= 1 && s % 2 === 1) drum(t, "hat", 0.6);
      if (A.intensity >= 2 && s % 4 === 3) drum(t, "taiko", 0.5);
    } else if (tr.perc === "light") {
      if (s === 0 || s === 10) drum(t, "taiko", 0.6);
      if (s % 4 === 2) drum(t, "hat", 0.4);
    }
  }

  // ---------------------------------------------------------------- sfx
  function noise(dur, o = {}) {
    if (!A.ctx) return;
    const ctx = A.ctx, t = ctx.currentTime + (o.delay || 0);
    const n = ctx.createBufferSource(); n.buffer = o.brown ? A.brownBuf : A.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.type || "bandpass";
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    n.connect(f).connect(g).connect(o.bus || A.sfxBus);
    if (o.verb) g.connect(A.revSend);
    env(g, t, o.a || 0.005, o.gain || 0.3, dur);
    n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.1);
  }
  function tone(freq, dur, o = {}) {
    if (!A.ctx) return;
    const ctx = A.ctx, t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(); osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ctx.createGain();
    osc.connect(g).connect(o.bus || A.sfxBus);
    if (o.verb) g.connect(A.revSend);
    env(g, t, o.a || 0.004, o.gain || 0.2, dur);
    osc.start(t); osc.stop(t + dur + 0.1);
  }
  A.noise = noise; A.tone = tone;

  const S = (A.sfx = {
    step: () => noise(0.07, { f: U.rand(500, 900), q: 0.8, gain: 0.06, type: "lowpass" }),
    jump: () => { noise(0.12, { f: 1800, f2: 700, gain: 0.08 }); },
    land: () => noise(0.14, { f: 300, type: "lowpass", gain: 0.18, brown: true }),
    swing: (heavy) => noise(heavy ? 0.3 : 0.16, { f: heavy ? 500 : 1500, f2: heavy ? 180 : 500, q: 1.5, gain: heavy ? 0.25 : 0.16 }),
    hit: (heavy) => {
      tone(heavy ? 90 : 140, 0.18, { f2: 50, gain: 0.35 });
      noise(0.16, { f: 2400, q: 0.7, gain: 0.22 });
      noise(0.08, { f: 5000, type: "highpass", gain: 0.1 });
    },
    strong: () => { tone(880, 0.25, { f2: 1320, gain: 0.08, verb: true }); },
    weak: () => { tone(220, 0.2, { f2: 180, gain: 0.08, type: "triangle" }); },
    enemyHurt: () => noise(0.18, { f: 1400, f2: 400, q: 2, gain: 0.18 }),
    playerHurt: () => { tone(200, 0.35, { f2: 70, gain: 0.3, type: "triangle" }); noise(0.3, { f: 900, f2: 200, gain: 0.25 }); },
    dodge: () => noise(0.22, { f: 3000, f2: 900, q: 0.6, gain: 0.12 }),
    block: () => { tone(160, 0.15, { gain: 0.25, type: "square", f2: 100 }); noise(0.12, { f: 700, gain: 0.25 }); },
    guardBreak: () => { noise(0.4, { f: 1600, f2: 200, gain: 0.35 }); tone(110, 0.4, { f2: 55, gain: 0.3 }); },
    page: () => { noise(0.35, { f: 2500, f2: 800, q: 0.5, gain: 0.18 }); noise(0.2, { f: 5000, type: "highpass", gain: 0.05, delay: 0.12 }); },
    scratch: () => noise(0.05, { f: U.rand(3000, 5200), q: 3, gain: 0.05 }),
    drip: () => { tone(U.rand(700, 1100), 0.18, { f2: 250, gain: 0.08, verb: true }); },
    inkGain: () => { [0, 0.08, 0.16].forEach((d, i) => tone(500 + i * 180, 0.2, { f2: 300, gain: 0.08, delay: d, verb: true })); },
    inkSpend: () => { tone(420, 0.5, { f2: 120, gain: 0.12, verb: true }); noise(0.4, { f: 600, gain: 0.1 }); },
    tear: () => { noise(0.45, { f: 2000, f2: 600, q: 3, gain: 0.25 }); noise(0.3, { f: 4500, q: 2, gain: 0.1, delay: 0.05 }); },
    breakWall: () => { noise(0.6, { f: 900, f2: 200, gain: 0.35 }); tone(80, 0.4, { f2: 40, gain: 0.3 }); },
    chitter: () => { for (let i = 0; i < 4; i++) noise(0.03, { f: 3200, q: 6, gain: 0.07, delay: i * 0.04 }); },
    scribble: () => { for (let i = 0; i < 6; i++) noise(0.04, { f: U.rand(2000, 4000), q: 4, gain: 0.07, delay: i * 0.035 }); },
    flutter: () => { for (let i = 0; i < 5; i++) noise(0.03, { f: 900, q: 2, gain: 0.06, delay: i * 0.05 }); },
    creak: () => tone(U.rand(90, 130), 0.4, { type: "sawtooth", f2: 70, gain: 0.05 }),
    crackle: () => { for (let i = 0; i < 5; i++) noise(0.02, { f: U.rand(1500, 5000), q: 1, gain: 0.08, delay: Math.random() * 0.3 }); },
    fireBurst: () => { noise(0.6, { f: 800, f2: 2500, q: 0.4, gain: 0.22, brown: true }); S.crackle(); },
    roar: () => { tone(70, 1.2, { type: "sawtooth", f2: 45, gain: 0.2 }); noise(1.1, { f: 400, f2: 150, gain: 0.3, brown: true }); },
    hart: () => { tone(300, 0.7, { type: "triangle", f2: 150, gain: 0.12, verb: true }); tone(450, 0.6, { type: "sine", f2: 200, gain: 0.06, verb: true }); },
    stomp: () => { tone(60, 0.5, { f2: 30, gain: 0.45 }); noise(0.5, { f: 200, type: "lowpass", gain: 0.3, brown: true }); },
    bell: () => { if (A.ctx) bell(79, A.ctx.currentTime, 0.9); },
    pigment: () => { if (!A.ctx) return; const t = A.ctx.currentTime; [67, 71, 74, 79, 83].forEach((m, i) => bell(m, t + i * 0.18, 0.8)); },
    save: () => { if (!A.ctx) return; const t = A.ctx.currentTime; [62, 66, 69].forEach((m, i) => piano(m + 12, t + i * 0.1, 0.5)); },
    fold: () => { noise(0.1, { f: 4000, f2: 1500, q: 1, gain: 0.18 }); tone(600, 0.12, { f2: 1400, gain: 0.07 }); },
    veil: () => { noise(0.3, { f: 2200, f2: 5000, q: 1.2, gain: 0.14 }); },
    ui: () => tone(1200, 0.05, { gain: 0.05, type: "triangle" }),
    uiOk: () => { tone(900, 0.08, { gain: 0.06, type: "triangle" }); tone(1350, 0.1, { gain: 0.05, type: "triangle", delay: 0.06 }); },
    uiNo: () => tone(260, 0.15, { gain: 0.07, type: "triangle", f2: 200 }),
    death: () => { tone(300, 2, { f2: 60, gain: 0.2, type: "triangle", verb: true }); noise(1.5, { f: 900, f2: 100, gain: 0.2 }); },
    whisper: () => { noise(1.4, { f: 1800, f2: 900, q: 8, gain: 0.12, verb: true }); noise(1.2, { f: 700, q: 10, gain: 0.08, verb: true, delay: 0.2 }); },
    heartbeat: () => { tone(55, 0.2, { gain: 0.3 }); tone(55, 0.2, { gain: 0.2, delay: 0.25 }); },
    splash: () => { noise(0.5, { f: 1200, f2: 300, gain: 0.2, verb: true }); S.drip(); },
    lever: () => { tone(180, 0.25, { type: "square", gain: 0.06, f2: 120 }); noise(0.3, { f: 500, gain: 0.15 }); },
  });

  // ---------------------------------------------------------------- ambience
  A.setAmbience = (kind) => {
    A.pendingAmb = kind;
    if (!A.ctx || A.ambKind === kind) return;
    A.ambKind = kind;
    const ctx = A.ctx;
    if (A.ambience) {
      const old = A.ambience;
      old.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1);
      setTimeout(() => { try { old.src.stop(); } catch (e) {} }, 1200);
      A.ambience = null;
    }
    const cfg = {
      wind: { f: 380, gain: 0.08, type: "lowpass" },
      interior: { f: 220, gain: 0.05, type: "lowpass" },
      canal: { f: 300, gain: 0.07, type: "lowpass" },
      fire: { f: 500, gain: 0.1, type: "lowpass" },
      void: { f: 160, gain: 0.12, type: "lowpass" },
    }[kind];
    if (!cfg) return;
    const src = ctx.createBufferSource(); src.buffer = A.brownBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = cfg.type; f.frequency.value = cfg.f;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = ctx.createGain(); lg.gain.value = cfg.f * 0.4; lfo.connect(lg).connect(f.frequency); lfo.start();
    const g = ctx.createGain(); g.gain.value = 0.0001;
    src.connect(f).connect(g).connect(A.ambBus);
    g.gain.linearRampToValueAtTime(cfg.gain, ctx.currentTime + 1.5);
    src.start();
    A.ambience = { src, g };
  };

  // random environmental one-shots
  let ambT = 2;
  A.update = (dt) => {
    if (!A.ctx) return;
    ambT -= dt;
    if (ambT > 0) return;
    ambT = U.rand(1.5, 5);
    const k = A.ambKind;
    if (k === "canal") { S.drip(); if (Math.random() < 0.3) setTimeout(S.drip, 300); }
    else if (k === "fire") S.crackle();
    else if (k === "wind" && Math.random() < 0.4) noise(0.8, { f: 2500, f2: 1200, q: 0.6, gain: 0.03 });
    else if (k === "interior" && Math.random() < 0.5) (Math.random() < 0.5 ? S.creak : () => noise(0.5, { f: 3000, q: 0.5, gain: 0.03 }))();
    else if (k === "void" && Math.random() < 0.3) S.whisper();
  };
})();
