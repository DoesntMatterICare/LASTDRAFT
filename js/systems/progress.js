// Progress / Quest / Ink / Element systems — the rules that tie the chapter together.
(function () {
  const LD = window.LD;
  const U = LD.U;
  const D = LD.Data;

  // ---------------------------------------------------------------- state
  LD.newState = () => ({
    version: 1,
    room: "margin", px: 14, py: 15,
    hp: D.player.maxHp,
    ink: D.ink.start,
    weapon: { cls: "nib", strokes: null, element: "none" },
    flags: {},
    collected: {},
    visited: {},
    lore: [],
    deaths: 0,
    time: 0,
    station: null,
    inkSpent: 0,
    redraws: 0,
  });

  // ---------------------------------------------------------------- ink
  // Ink is the single currency of creation: it only ever buys weapons.
  LD.Ink = {
    add(S, n, x, y) {
      const before = S.ink;
      S.ink = Math.min(D.ink.max, S.ink + n);
      const got = S.ink - before;
      if (LD.HUD) LD.HUD.inkPulse(got > 0 ? got : 0);
      if (x != null && LD.Particles) {
        LD.Particles.add({ kind: "text", x, y: y - 20, vy: -40, g: 0, text: got > 0 ? "+" + got + " Ink" : "Ink full", size: 26, life: 1.4, color: "#1c2f55", front: true });
      }
      return got;
    },
    canAfford: (S, n) => S.ink >= n,
    spend(S, n) {
      if (S.ink < n) return false;
      S.ink -= n;
      S.inkSpent += n;
      return true;
    },
  };

  // ---------------------------------------------------------------- elements
  LD.Elements = {
    relation(att, def) {
      if (!att || att === "none" || !def || def === "none") return "neutral";
      const o = D.elements.order, i = o.indexOf(att), j = o.indexOf(def);
      if (i < 0 || j < 0) return "neutral";
      if ((i + 1) % o.length === j) return "strong";
      if ((j + 1) % o.length === i) return "resist";
      return "neutral";
    },
    mult(att, def) {
      const r = LD.Elements.relation(att, def);
      if (r === "strong") return { rel: r, dmg: D.elements.strong.dmg, stagger: D.elements.strong.stagger };
      if (r === "resist") return { rel: r, dmg: D.elements.resist.dmg, stagger: D.elements.resist.stagger };
      return { rel: r, dmg: 1, stagger: 1 };
    },
    color: (el) => D.elements.colors[el || "none"],
    name: (el) => D.elements.names[el || "none"],
    available: (S) => ["none"].concat(S.flags.pigment_water ? ["water"] : []),
  };

  // ---------------------------------------------------------------- quest
  // Objectives are derived from flags, so they are always consistent with the world.
  LD.Quest = {
    current(S) {
      const f = S.flags;
      if (f.chapterDone) return "Chapter complete. The book goes deeper than this page.";
      if (f.boss_marshal) return "Foldstep through the creased veil at the western Margin.";
      if (f.enteredArena) return "Defeat the Soot Marshal.";
      if (f.pigment_water && f.sawInkSpot) return "Climb to the Burnt Archive above the Ashen Stair.";
      if (f.pigment_water) return "Follow the returning water to the old bridge's wheel.";
      if (f.boss_hart === true && !f.pigment_water) return "Claim the Water Pigment from the cistern basin.";
      if (f.visited_canals) return "Find the source of the missing blue — the Dry Cistern.";
      if (S.weapon && S.weapon.cls !== "nib") return "Search beneath the streets for the missing blue.";
      if (f.metQuillon) return "Draw a weapon at the Bindery desk.";
      if (f.visited_streets) return "Find shelter in the Bindery.";
      return "Follow the Margin into Looseleaf Borough.";
    },
  };

  // Bindery restoration stage (0 = dim & abandoned, 3 = alive).
  LD.binderyStage = (S) => {
    const f = S.flags;
    return (S.weapon && S.weapon.cls !== "nib" ? 1 : 0) + (f.pigment_water ? 1 : 0) + (f.boss_marshal ? 1 : 0);
  };

  LD.countSecrets = (S) => {
    const all = ["streets_well", "canals_well", "bridge_well", "spire_well", "gardens_hut", "gardens_pocket", "canals_shelf", "bridge_frag", "pell_gift"];
    const found = all.filter((k) => S.collected[k]).length;
    return { found, total: all.length, lore: S.lore.length, loreTotal: Object.keys(LD.Lore).length };
  };
})();
