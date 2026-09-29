// Asset pipeline: loads painted art listed by assets/manifest.js. Everything is optional —
// a missing file leaves the in-code drawing in place — so art can be added piece by piece.
(function () {
  const LD = window.LD;
  const U = LD.U;
  const M = () => LD.ArtManifest || { roomLayers: {}, sprites: {}, ui: [] };

  const A = (LD.Assets = { images: new Map(), ready: false });

  function load(key, src) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => { A.images.set(key, img); res(); };
      img.onerror = () => res();
      img.src = src;
    });
  }

  A.loadAll = () => {
    const m = M(), jobs = [];
    const layers = ["sky", "far", "mid", "near", "fg", "terrain", "secret"];
    // optional story variants: <layer>@water.png once the Water Pigment is back,
    // <layer>@restored.png once the Soot Marshal falls (e.g. a livelier Bindery)
    // (variants are only probed when the base layer exists, other anims only when "idle"
    // exists — so a project with no art yet makes very few requests)
    for (const id in LD.RoomDefs || {}) for (const l of layers) {
      const key = "room:" + id + ":" + l, dir = "assets/rooms/" + id + "/" + l;
      jobs.push(load(key, dir + ".png").then(() => A.images.has(key) &&
        Promise.all(["@water", "@restored"].map((v) => load(key + v, dir + v + ".png")))));
    }
    for (const set in m.sprites) {
      const dir = "assets/sprites/" + set + "/";
      jobs.push(load("sprite:" + set + ":idle", dir + "idle.png").then(() => A.images.has("sprite:" + set + ":idle") &&
        Promise.all(Object.keys(m.sprites[set].anims).filter((a) => a !== "idle").map((a) => load("sprite:" + set + ":" + a, dir + a + ".png")))));
    }
    for (const u of m.ui || []) jobs.push(load("ui:" + u, "assets/ui/" + u + ".png"));
    return Promise.all(jobs).then(() => {
      A.ready = true;
      if (A.images.size) console.info("[art] loaded " + A.images.size + " painted image(s)");
    });
  };

  A.room = (id, layer) => {
    const f = (LD.G && LD.G.S && LD.G.S.flags) || {};
    const get = (v) => A.images.get("room:" + id + ":" + layer + v);
    return (f.boss_marshal && get("@restored")) || (f.pigment_water && get("@water")) || get("") || null;
  };
  A.ui = (k) => A.images.get("ui:" + k) || null;
  A.hasPaintedBackdrop = (id) => !!(A.room(id, "far") || A.room(id, "mid") || A.room(id, "near"));

  // Draw a painted parallax layer sized to cover this room's scroll range at factor f.
  A.drawLayer = (ctx, img, f, room, cam) => {
    const m = LD.ArtManifest.roomLayers.margin || 80, T = U.TILE;
    const RW = room.w * T, RH = room.h * T;
    const lw = U.VIEW_W + Math.max(0, RW - U.VIEW_W) * f + 2 * m;
    const lh = U.VIEW_H + Math.max(0, RH - U.VIEW_H) * f + 2 * m;
    ctx.drawImage(img, cam.x * (1 - f) - m, cam.y * (1 - f) - m, lw, lh);
  };
  A.layerSize = (room, f) => {
    const m = LD.ArtManifest.roomLayers.margin || 80, T = U.TILE;
    return [Math.round(U.VIEW_W + Math.max(0, room.w * T - U.VIEW_W) * f + 2 * m), Math.round(U.VIEW_H + Math.max(0, room.h * T - U.VIEW_H) * f + 2 * m)];
  };

  // ---------------------------------------------------------------- sprites
  const S = (LD.Sprites = {});
  S.enabled = (set) => A.images.has("sprite:" + set + ":idle");

  // Resolve an animation through the alias chain to a loaded strip.
  S.resolve = (set, anim) => {
    const def = M().sprites[set];
    if (!def || !S.enabled(set)) return null;
    let name = anim;
    for (let i = 0; i < 8 && name; i++) {
      const img = A.images.get("sprite:" + set + ":" + name);
      if (img) return { name, img, a: def.anims[name] || { n: 1, fps: 8 }, def };
      name = (def.alias || {})[name] || (name !== "idle" ? "idle" : null);
    }
    return null;
  };

  // st: { t: seconds in state } or { p: progress 0..1 }. Returns draw info or null.
  S.frameOf = (r, st) => {
    const n = Math.max(1, r.a.n || Math.round(r.img.width / r.def.frame[0]));
    let f;
    if (st.p != null) f = Math.min(n - 1, Math.floor(U.clamp(st.p, 0, 0.9999) * n));
    else {
      const k = Math.floor((st.t || 0) * (r.a.fps || 8));
      f = r.a.once ? Math.min(n - 1, k) : ((k % n) + n) % n;
    }
    return { f, n };
  };

  S.draw = (ctx, set, anim, st, x, y, facing, o = {}) => {
    const r = S.resolve(set, anim);
    if (!r) return null;
    const { f, n } = S.frameOf(r, st);
    const fw = r.img.width / n, fh = r.img.height;
    const k = fw / r.def.frame[0]; // tolerate files exported at a different size
    const sc = (r.def.scale || 0.5) * (o.scale || 1) / k;
    const ox = r.def.origin[0] * k, oy = r.def.origin[1] * k;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y);
    ctx.scale(facing < 0 ? -sc : sc, sc);
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = 12 / sc; }
    ctx.drawImage(r.img, f * fw, 0, fw, fh, -ox, -oy, fw, fh);
    ctx.restore();
    return { name: r.name, frame: f, n, sc, k, def: r.def };
  };

  // Hand anchor for the drawn weapon, in logical px relative to the feet (facing right).
  S.hand = (set, info) => {
    if (!info) return null;
    const hands = (info.def.hands || {})[info.name];
    if (!hands || !hands[info.frame]) return null;
    const [hx, hy] = hands[info.frame];
    const s = info.def.scale || 0.5;
    return [(hx - info.def.origin[0]) * s, (hy - info.def.origin[1]) * s];
  };
})();
