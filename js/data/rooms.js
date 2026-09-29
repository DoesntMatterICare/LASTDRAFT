// Looseleaf Borough — the Chapter 1 region, authored with a tiny room-builder.
// Tile legend:  #  solid page-stone      =  one-way plank       ^  thorns / embers (hazard)
//               ~  ink pool (hazard)      X  void (hazard)       B  breakable paper wall
//               H  grate (breaks only from below)                 V  creased veil (Foldstep only)
//               G  wheel gate (opens when water returns)          D  latched door
// Coordinates are tiles (40px). Entity y = the row the entity stands ON (its feet touch row y's top).
// Rooms rebuild whenever progress flags change, so restoration visibly reshapes the world.
(function () {
  const LD = window.LD;
  const defs = (LD.RoomDefs = {});
  const def = (id, meta, build) => (defs[id] = Object.assign({ id, build }, meta));

  LD.buildRoom = (id, F) => {
    const d = defs[id];
    const grid = [];
    for (let y = 0; y < d.h; y++) grid.push(new Array(d.w).fill("."));
    const put = (x, y, ch) => { if (x >= 0 && y >= 0 && x < d.w && y < d.h) grid[y][x] = ch; };
    const r = {
      grid, exits: [], ents: [], props: [], breaks: [], covers: [],
      // a hidden room: drawn as solid page until its breakable wall is torn open
      cover(id, x, y, w, h) { if (!F["broke_" + id]) this.covers.push({ x, y, w, h }); },
      rect(x, y, w, h, ch = "#") { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, ch); },
      clear(x, y, w, h) { this.rect(x, y, w, h, "."); },
      plat(x, y, len) { this.rect(x, y, len, 1, "="); },
      breakable(id, x, y, w, h) {
        if (F["broke_" + id]) this.clear(x, y, w, h);
        else { this.rect(x, y, w, h, "B"); this.breaks.push({ id, x, y, w, h }); }
      },
      exit(side, a, b, to, sx, sy, o = {}) { this.exits.push(Object.assign({ side, a, b, to, sx, sy }, o)); },
      ent(o) { this.ents.push(o); },
      prop(type, x, y, o = {}) { this.props.push(Object.assign({ type, x, y }, o)); },
    };
    d.build(r, F);
    return Object.assign({}, d, r, { w: d.w, h: d.h });
  };

  // ------------------------------------------------------------------ THE MARGIN
  def("margin", { name: "The Margin", w: 64, h: 18, theme: "margin", music: "margin", amb: "wind", map: { x: 0, y: 0, w: 2, h: 1 } }, (r, F) => {
    r.rect(0, 15, 4, 3);            // the far lip, past the tear
    r.rect(4, 16, 6, 2, "~");        // ink pooling in the torn gutter
    r.rect(3, 10, 1, 5, "V");        // creased veil — Foldstep gate seen at the very start
    r.rect(10, 15, 18, 3);
    r.rect(28, 17, 4, 1, "^");
    r.rect(32, 15, 32, 3);
    r.rect(20, 14, 3, 1);
    r.rect(40, 12, 7, 3);
    r.clear(41, 13, 4, 2);
    r.breakable("margin", 40, 13, 1, 2);
    r.cover("margin", 41, 13, 4, 2);

    r.exit("L", 9, 14, "edge", 30.5, 15, { face: -1 });
    r.exit("R", 9, 14, "streets", 1.5, 15, { face: 1 });

    r.ent({ t: "hint", x: 15, w: 6, text: "{left} {right}  walk" });
    r.ent({ t: "hint", x: 25, w: 6, text: "{jump}  jump — hold it to jump higher" });
    r.ent({ t: "hint", x: 50, w: 7, text: "{attack}  strike    {dodge}  dodge    {guard}  guard" });
    r.ent({ t: "hint", x: 7, w: 9, text: F.foldstep ? "Run, {jump}, then {dash}  — Foldstep through the creased page" : "The page is creased shut. Walking feet can't unfold it.", sticky: true });
    r.ent({ t: "lore", id: "margin_note", x: 43, y: 15, kind: "note" });
    r.ent({ t: "enemy", k: "crawler", x: 55, y: 15 });

    r.prop("pages", 13, 15); r.prop("silhouette", 24, 15, { v: 0 }); r.prop("silhouette", 36, 15, { v: 1 });
    r.prop("lamp", 49, 15, { unlit: !F.pigment_water }); r.prop("sign", 60, 15, { text: "Looseleaf Borough →" });
    r.prop("pages", 45, 12); r.prop("tornEdge", 2, 15);
  });

  // ------------------------------------------------------------------ STREETS
  def("streets", { name: "Looseleaf Streets", w: 64, h: 18, theme: "dusk", music: "borough", amb: "wind", map: { x: 2, y: 0, w: 2, h: 1 } }, (r, F) => {
    r.rect(0, 15, 64, 3);
    r.clear(44, 15, 4, 3); r.plat(44, 15, 4);
    if (!F.hatch_open) r.rect(18, 15, 2, 3, "H");
    else { r.clear(18, 15, 2, 3); r.plat(18, 15, 2); }
    r.rect(33, 14, 2, 1);
    r.plat(50, 12, 4); r.plat(55, 9, 4); r.plat(50, 6, 4); r.plat(55, 3, 5);

    r.exit("L", 9, 14, "margin", 62.5, 15, { face: -1 });
    r.exit("R", 9, 14, "bridge", 1.5, 15, { face: 1 });
    r.exit("B", 44, 47, "canals", 45.5, 3);
    r.exit("B", 18, 19, "canals", 18.5, 3);
    r.exit("T", 55, 59, "gardens", 25.5, 17.9, { vy: -1150 });

    r.ent({ t: "door", x: 10, y: 15, to: "bindery", sx: 4.5, sy: 15, label: "Enter the Bindery" });
    if (!F.pigment_water) r.ent({ t: "npc", k: "lampwick", x: 30, y: 15 });
    r.ent({ t: "lore", id: "notice", x: 37, y: 15, kind: "board" });
    r.ent({ t: "inkwell", id: "streets_well", x: 61, y: 15 });
    r.ent({ t: "enemy", k: "crawler", x: 39, y: 15 });
    r.ent({ t: "enemy", k: "wretch", x: 57, y: 15 });
    r.ent({ t: "hint", x: 45.5, w: 3, text: "{down} + {jump}  drop through" });
    r.ent({ t: "hint", x: 18.5, w: 2, text: F.hatch_open ? "{down} + {jump}  drop through" : "A rusted grate. It won't budge from above.", sticky: !F.hatch_open });

    r.prop("bindery", 10, 15); r.prop("lamp", 7, 15, { unlit: !F.pigment_water }); r.prop("lamp", 23, 15, { unlit: !F.pigment_water });
    r.prop("lamp", 41, 15, { unlit: !F.pigment_water }); r.prop("lamp", 57, 15, { unlit: !F.pigment_water });
    r.prop("fountain", 26, 15, { flowing: !!F.pigment_water }); r.prop("tree", 3, 15, { s: 1.1 }); r.prop("tree", 49, 15, { s: 0.9 });
    r.prop("silhouette", 14, 15, { v: 2 }); r.prop("silhouette", 32, 15, { v: 0 }); r.prop("crate", 33, 14);
    r.prop("banner", 21, 6); r.prop("banner", 37, 5); r.prop("grate", 18, 15, { open: !!F.hatch_open });
  });

  // ------------------------------------------------------------------ THE BINDERY
  def("bindery", { name: "The Bindery", w: 32, h: 18, theme: "bindery", music: "bindery", amb: "interior", safe: true, map: { x: 2, y: -1, w: 1, h: 1 } }, (r, F) => {
    r.rect(0, 0, 32, 2); r.rect(0, 2, 1, 13); r.rect(31, 2, 1, 13); r.rect(0, 15, 32, 3);
    r.plat(23, 11, 7);
    r.ent({ t: "door", x: 4, y: 15, to: "streets", sx: 10.5, sy: 15, label: "Out to the streets", inner: true });
    r.ent({ t: "station", id: "bindery", x: 15, y: 15, desk: true });
    r.ent({ t: "npc", k: "quillon", x: 21, y: 15 });
    if (F.pigment_water) r.ent({ t: "npc", k: "lampwick", x: 9, y: 15 });
    if (F.boss_marshal && F.metPell) r.ent({ t: "npc", k: "pell", x: 27, y: 15 });
    r.ent({ t: "lore", id: "ledger", x: 27, y: 11, kind: "note" });
    r.prop("press", 7, 15); r.prop("jars", 11, 15); r.prop("candle", 13, 15); r.prop("candle", 18.5, 15);
    r.prop("jars", 25, 11); r.prop("pages", 20, 15);
  });

  // ------------------------------------------------------------------ FADED GARDENS (optional)
  def("gardens", { name: "Faded Gardens", w: 32, h: 18, theme: "gardens", music: "borough", amb: "wind", map: { x: 3, y: -1, w: 1, h: 1 } }, (r, F) => {
    r.rect(0, 15, 32, 3); r.clear(24, 15, 4, 3); r.plat(24, 15, 4);
    r.rect(31, 0, 1, 11);
    if (!F.ash_door) r.rect(31, 11, 1, 4, "D");
    r.rect(0, 11, 6, 1);
    r.breakable("gardens", 5, 12, 1, 3);
    r.cover("gardens", 0, 12, 5, 3);
    r.rect(8, 5, 7, 1); r.rect(8, 6, 1, 3); r.rect(8, 9, 6, 1); r.rect(14, 6, 1, 3, "V");
    r.plat(19, 12, 4); r.plat(14, 9, 5);

    r.exit("B", 24, 27, "streets", 57, 2);
    r.exit("R", 11, 14, "ashway", 1.5, 14, { face: 1 });

    r.ent({ t: "npc", k: "pell", x: 11, y: 15 });
    r.ent({ t: "lore", id: "pell_sketch", x: 15.5, y: 15, kind: "note" });
    r.ent({ t: "cache", id: "gardens_hut", x: 2.5, y: 15 });
    r.ent({ t: "cache", id: "gardens_pocket", x: 11, y: 9 });
    if (!F.ash_door) r.ent({ t: "latch", x: 30.2, y: 15, side: "back" });
    r.ent({ t: "enemy", k: "moth", x: 18, y: 7 });
    r.ent({ t: "enemy", k: "moth", x: 27, y: 9 });
    r.ent({ t: "hint", x: 26, w: 3, text: "{down} + {jump}  drop through" });

    r.prop("tree", 17, 15, { s: 1.3, faded: true }); r.prop("tree", 29, 15, { s: 1.0, faded: true }); r.prop("tree", 6.5, 11, { s: 0.7, faded: true });
    r.prop("easel", 13, 15); r.prop("bench", 21.5, 15);
  });

  // ------------------------------------------------------------------ DRY CANALS
  def("canals", { name: "Dry Canals", w: 96, h: 18, theme: "canal", music: "underground", amb: "canal", map: { x: 2, y: 1, w: 3, h: 1 } }, (r, F) => {
    r.rect(0, 0, 96, 2); r.rect(0, 15, 96, 3); r.rect(0, 2, 1, 13);
    r.clear(44, 0, 4, 2);
    if (!F.hatch_open) r.rect(18, 0, 2, 2, "H"); else r.clear(18, 0, 2, 2);
    r.plat(14, 12, 3); r.plat(19, 9, 4); r.plat(16, 6, 6);
    r.clear(24, 15, 16, 1);
    r.rect(30, 12, 4, 4);
    r.clear(52, 15, 4, 3); r.rect(52, 17, 4, 1, "~");
    r.plat(43, 12, 3); r.plat(46, 9, 3); r.plat(43, 6, 3); r.plat(45, 3, 3);
    r.plat(60, 11, 5); r.rect(66, 12, 4, 3);
    r.plat(76, 12, 4); r.plat(81, 9, 4);
    r.rect(87, 6, 9, 1); r.rect(87, 2, 1, 4, "V");

    r.exit("T", 44, 47, "streets", 45.5, 17.9, { vy: -1150 });
    r.exit("T", 18, 19, "streets", 18.5, 17.9, { vy: -1150 });
    r.exit("R", 11, 14, "cistern", 1.5, 15, { face: 1 });

    r.ent({ t: "inkwell", id: "canals_well", x: 4, y: 15 });
    r.ent({ t: "lore", id: "mural", x: 9, y: 15, kind: "mural" });
    r.ent({ t: "cache", id: "canals_shelf", x: 92, y: 6 });
    r.ent({ t: "enemy", k: "crawler", x: 27, y: 16 });
    r.ent({ t: "enemy", k: "moth", x: 36, y: 8 });
    r.ent({ t: "enemy", k: "crawler", x: 60, y: 15 });
    r.ent({ t: "enemy", k: "moth", x: 63, y: 7 });
    r.ent({ t: "enemy", k: "crawler", x: 68, y: 12 });
    r.ent({ t: "enemy", k: "wretch", x: 84, y: 15 });
    if (!F.hatch_open) r.ent({ t: "hint", x: 18.5, w: 5, text: "Light leaks through a rusted grate above. Strike it from below.", sticky: true });
    r.ent({ t: "hint", x: 88, w: 6, text: F.foldstep ? "" : "A creased veil seals the alcove.", sticky: true });

    r.prop("pipe", 12, 2); r.prop("pipe", 58, 2); r.prop("pipe", 78, 2);
    r.prop("lightshaft", 45.5, 0); if (!F.hatch_open) r.prop("lightshaft", 18.5, 0, { thin: true }); else r.prop("lightshaft", 18.5, 0);
    r.prop("water", 24, 16, { w: 16, on: !!F.pigment_water }); r.prop("water", 52, 17, { w: 4, on: !!F.pigment_water, ink: true });
  });

  // ------------------------------------------------------------------ DRY CISTERN (mini-boss + Water Pigment)
  def("cistern", { name: "The Dry Cistern", w: 32, h: 18, theme: "cistern", music: "underground", amb: "canal", map: { x: 5, y: 1, w: 1, h: 1 } }, (r, F) => {
    r.rect(0, 0, 32, 2); r.rect(0, 2, 1, 9); r.rect(31, 0, 1, 18); r.rect(0, 15, 32, 3);
    r.plat(4, 10, 5); r.plat(23, 10, 5);
    if (F.pigment_water) { r.clear(26, 0, 3, 2); r.plat(27, 12, 3); r.plat(27, 7, 3); r.plat(25, 4, 4); }
    r.exit("L", 11, 14, "canals", 94.5, 15, { face: -1 });
    r.exit("T", 26, 28, "bridge", 59.5, 17.9, { vy: -1250 });
    if (!F.boss_hart) r.ent({ t: "boss", k: "hart", x: 22, y: 15 });
    r.ent({ t: "pigment", x: 16, y: 15 });
    if (F.pigment_water) r.ent({ t: "lore", id: "fingerprints", x: 12.5, y: 15, kind: "prints" });
    r.prop("basin", 16, 15, { full: !!F.pigment_water }); r.prop("pipe", 6, 2); r.prop("pipe", 20, 2);
    if (F.pigment_water) r.prop("lightshaft", 27, 0);
  });

  // ------------------------------------------------------------------ COLLAPSED BRIDGE
  def("bridge", { name: "Collapsed Bridge", w: 64, h: 18, theme: "bridge", music: "borough", amb: "wind", map: { x: 4, y: 0, w: 2, h: 1 } }, (r, F) => {
    r.rect(0, 15, 11, 3); r.rect(6, 14, 5, 1); r.rect(8, 13, 3, 1);
    r.rect(11, 16, 45, 2, "~");
    r.rect(10, 12, 14, 1); r.rect(28, 12, 12, 1); r.rect(43, 12, 13, 1);
    r.rect(15, 13, 2, 3); r.rect(33, 13, 2, 3); r.rect(48, 13, 2, 3);
    r.rect(56, 12, 8, 6);
    if (F.pigment_water) { r.clear(58, 12, 3, 6); r.plat(58, 12, 3); }
    if (!F.pigment_water) r.rect(63, 8, 1, 4, "G");
    r.rect(30, 6, 4, 1);

    r.exit("L", 10, 14, "streets", 62.5, 15, { face: -1 });
    r.exit("R", 8, 11, "spire", 1.5, 30, { face: 1 });
    r.exit("B", 58, 60, "cistern", 26.5, 2);

    r.ent({ t: "inkwell", id: "bridge_well", x: 4, y: 15 });
    r.ent({ t: "cache", id: "bridge_frag", x: 32, y: 6 });
    r.ent({ t: "enemy", k: "guard", x: 35, y: 12 });
    r.ent({ t: "enemy", k: "moth", x: 41, y: 8 });
    r.ent({ t: "enemy", k: "crawler", x: 51, y: 12 });
    r.ent({ t: "enemy", k: "wretch", x: 19, y: 12 });
    if (!F.pigment_water) r.ent({ t: "hint", x: 61, w: 5, text: "The wheel is dry. Without water, the gate won't lift.", sticky: true });
    else r.ent({ t: "hint", x: 59, w: 3, text: "{down} + {jump}  drop through" });

    r.prop("wheel", 60, 12, { turning: !!F.pigment_water }); r.prop("lamp", 12, 12, { unlit: !F.pigment_water }); r.prop("lamp", 45, 12, { unlit: !F.pigment_water });
    r.prop("banner", 20, 12, { hang: true }); r.prop("banner", 37, 12, { hang: true }); r.prop("banner", 52, 12, { hang: true });
    r.prop("grate", 58.5, 12, { open: !!F.pigment_water, wide: true });
  });

  // ------------------------------------------------------------------ VERTICAL DISTRICT
  def("spire", { name: "The Vertical District", w: 32, h: 36, theme: "spire", music: "borough", amb: "wind", map: { x: 6, y: -1, w: 1, h: 2 } }, (r, F) => {
    r.rect(31, 0, 1, 36); r.rect(0, 0, 1, 10); r.rect(0, 14, 7, 1); r.rect(0, 15, 1, 11); r.rect(0, 30, 32, 6);
    r.plat(18, 27, 5); r.plat(24, 24, 5); r.plat(17, 21, 4); r.rect(9, 19, 6, 2); r.plat(7, 17, 4);
    r.plat(8, 11, 4); r.plat(14, 8, 3); r.rect(19, 8, 12, 1);

    r.exit("L", 26, 29, "bridge", 62.5, 12, { face: -1 });
    r.exit("L", 10, 13, "ashway", 62.5, 14, { face: -1 });

    r.ent({ t: "inkwell", id: "spire_well", x: 4, y: 30 });
    r.ent({ t: "enemy", k: "guard", x: 24, y: 30 });
    r.ent({ t: "enemy", k: "moth", x: 14, y: 24 });
    r.ent({ t: "enemy", k: "wretch", x: 12, y: 19 });
    r.ent({ t: "enemy", k: "moth", x: 22, y: 12 });
    r.ent({ t: "lore", id: "rooftop", x: 23, y: 8, kind: "smear" });
    if (!F.sawInkSpot) r.ent({ t: "trigger", id: "sighting", x: 6, y: 9, w: 12, h: 7 });

    r.prop("lamp", 20, 30, { unlit: !F.pigment_water }); r.prop("lamp", 11, 19, { unlit: !F.pigment_water }); r.prop("lamp", 29, 8, { unlit: !F.pigment_water });
    r.prop("chain", 16, 0, { len: 9 }); r.prop("chain", 27, 0, { len: 5 }); r.prop("banner", 5, 15, { hang: true });
    r.prop("silhouette", 14, 30, { v: 1 });
  });

  // ------------------------------------------------------------------ ASHEN STAIR
  def("ashway", { name: "The Ashen Stair", w: 64, h: 18, theme: "ash", music: "margin", amb: "fire", map: { x: 4, y: -1, w: 2, h: 1 } }, (r, F) => {
    r.rect(0, 0, 64, 2); r.rect(0, 14, 64, 4);
    if (!F.boss_marshal) r.clear(40, 0, 4, 2);
    if (!F.ash_door) r.rect(0, 10, 1, 4, "D");
    r.clear(50, 14, 3, 4); r.rect(50, 17, 3, 1, "^");
    r.rect(46, 13, 2, 1, "^");
    r.plat(38, 11, 3); r.plat(42, 8, 3); r.plat(39, 5, 3);

    r.exit("L", 10, 13, "gardens", 29.5, 15, { face: -1 });
    r.exit("R", 10, 13, "spire", 2.5, 14, { face: 1 });
    r.exit("T", 40, 43, "arena", 9.5, 17.9, { vy: -1150 });

    r.ent({ t: "station", id: "ashway", x: 33, y: 14 });
    r.ent({ t: "lore", id: "burnt_letter", x: 28, y: 14, kind: "note" });
    if (!F.ash_door) r.ent({ t: "latch", x: 1.2, y: 14, side: "front" });
    r.ent({ t: "enemy", k: "leaflet", x: 44, y: 14 });
    r.ent({ t: "enemy", k: "guard", x: 56, y: 14 });
    r.ent({ t: "enemy", k: "leaflet", x: 60, y: 14 });
    r.ent({ t: "enemy", k: "moth", x: 48, y: 8 });
    r.ent({ t: "enemy", k: "wretch", x: 18, y: 14 });

    r.prop("lamp", 36, 14, { unlit: false }); r.prop("pages", 25, 14, { burnt: true }); r.prop("pages", 54, 14, { burnt: true });
    r.prop("chain", 12, 0, { len: 6 }); r.prop("chain", 58, 0, { len: 4 });
  });

  // ------------------------------------------------------------------ BURNT ARCHIVE (Soot Marshal)
  def("arena", { name: "The Burnt Archive", w: 64, h: 18, theme: "archive", music: "margin", amb: "fire", map: { x: 5, y: -2, w: 2, h: 1 } }, (r, F) => {
    r.rect(0, 0, 64, 2); r.rect(0, 2, 2, 16); r.rect(0, 15, 40, 3);
    if (!F.boss_marshal) { r.clear(8, 15, 4, 3); r.plat(8, 15, 4); }
    r.rect(40, 17, 8, 1, "^");
    r.rect(48, 15, 16, 3); r.clear(56, 15, 4, 3);
    r.rect(63, 2, 1, 13);
    r.exit("B", 8, 11, "ashway", 41.5, 3);
    r.exit("B", 56, 59, "spire", 25.5, 1);
    if (!F.boss_marshal) r.ent({ t: "boss", k: "marshal", x: 28, y: 15 });
    r.ent({ t: "hint", x: 37, w: 4, text: F.foldstep ? "{jump}, then {dash} + →  Foldstep across" : "The floor has burned away.", sticky: true });
    r.prop("pages", 20, 15, { burnt: true }); r.prop("pages", 52, 15, { burnt: true });
  });

  // ------------------------------------------------------------------ THE TORN EDGE (hidden / ending)
  def("edge", { name: "The Torn Edge", w: 32, h: 18, theme: "void", music: "void", amb: "void", map: { x: -1, y: 0, w: 1, h: 1 } }, (r, F) => {
    r.rect(10, 15, 22, 3);
    r.rect(0, 17, 10, 1, "X");
    r.exit("R", 9, 14, "margin", 1.2, 15, { face: 1 });
    r.ent({ t: "trigger", id: "ending", x: 12, y: 8, w: 9, h: 8 });
    r.prop("tornEdge", 10, 15, { big: true });
  });
})();
