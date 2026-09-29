// Shared math / random helpers. Everything hangs off the global LD namespace so the
// game runs straight from file:// without a bundler or module server.
(function () {
  const LD = (window.LD = window.LD || {});
  const U = (LD.U = {});

  U.TILE = 40;
  U.VIEW_W = 1280;
  U.VIEW_H = 720;

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  U.approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
  U.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.inv = (t) => U.clamp(t, 0, 1);

  // Deterministic hashes, used for "boiling" hand-drawn line jitter and baked art.
  U.hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };
  U.hash2 = (x, y) => {
    const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  U.noise1 = (x) => {
    const i = Math.floor(x), f = x - i;
    const t = f * f * (3 - 2 * f);
    return U.lerp(U.hash(i), U.hash(i + 1), t);
  };
  U.rng = (seed) => {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.strSeed = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

  U.easeOut = (t) => 1 - Math.pow(1 - U.inv(t), 3);
  U.easeIn = (t) => Math.pow(U.inv(t), 3);
  U.easeInOut = (t) => { t = U.inv(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  U.easeOutBack = (t) => { t = U.inv(t); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  U.smooth = (t) => { t = U.inv(t); return t * t * (3 - 2 * t); };

  U.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  U.fmtTime = (s) => {
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(sec).padStart(2, "0");
  };

  U.deepCopy = (o) => JSON.parse(JSON.stringify(o));
})();
