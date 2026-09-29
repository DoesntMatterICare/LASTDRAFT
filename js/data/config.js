// All gameplay tuning is data. Systems read from LD.Data so weapons, enemies, bosses,
// abilities and elemental relationships can be changed (or extended for Chapter 2)
// without touching the systems that use them.
(function () {
  const LD = window.LD;

  LD.Data = {
    player: {
      w: 24, h: 56,
      runSpeed: 330, accelGround: 3200, accelAir: 2200, friction: 3600,
      gravity: 2250, maxFall: 1050, jumpVel: 820, jumpCut: 0.42,
      coyote: 0.1, jumpBuffer: 0.13,
      maxHp: 100, hpPerPip: 20,
      stamina: { max: 100, regen: 48, delay: 0.55, exhaustedUntil: 40 },
      dodge: { dur: 0.3, speed: 560, iStart: 0.02, iEnd: 0.24, cost: 22 },
      guard: { cost: 1.1, reduce: 0.25, moveSpeed: 70 },
      hurtInvuln: 1.0,
    },

    ink: { start: 70, max: 100, refill: 15, cache: 25 },

    // Weapon archetypes. The drawing desk classifies a drawing into one of these.
    weapons: {
      nib: {
        name: "Bare Nib", cost: 0, desc: "The empty pen. A desperate little jab.",
        dmg: 8, windup: 0.07, active: 0.08, recovery: 0.2, reach: 46, height: 34, stamina: 4,
        knock: 110, stagger: 3, combo: 2, comboWindow: 0.3, moveMult: 0.7, lunge: 60, length: 30, hitstop: 0.04,
      },
      blade: {
        name: "Blade", cost: 18, desc: "Fast. Agile. Short reach, quick recovery.",
        dmg: 11, windup: 0.07, active: 0.09, recovery: 0.15, reach: 82, height: 52, stamina: 7,
        knock: 170, stagger: 9, combo: 3, comboWindow: 0.3, moveMult: 0.6, lunge: 140, length: 66, hitstop: 0.05,
      },
      polearm: {
        name: "Polearm", cost: 24, desc: "Balanced. Long reach, measured swings.",
        dmg: 15, windup: 0.15, active: 0.11, recovery: 0.25, reach: 128, height: 40, stamina: 12,
        knock: 230, stagger: 16, combo: 2, comboWindow: 0.34, moveMult: 0.35, lunge: 70, length: 108, hitstop: 0.06,
      },
      heavy: {
        name: "Heavy Tool", cost: 30, desc: "Slow. Crushing. Breaks guards and staggers.",
        dmg: 31, windup: 0.38, active: 0.13, recovery: 0.44, reach: 100, height: 78, stamina: 22,
        knock: 400, stagger: 40, combo: 1, comboWindow: 0, moveMult: 0.12, lunge: 40, length: 86, hitstop: 0.1,
        breaksGuard: true, armorDuringSwing: true,
      },
    },

    // Circular element wheel: each element overpowers the next.
    //   water → fire → air → earth → water
    elements: {
      order: ["water", "fire", "air", "earth"],
      names: { none: "Plain Ink", water: "Water", fire: "Fire", air: "Air", earth: "Earth" },
      colors: { none: "#15100d", water: "#3f7fc0", fire: "#e0662a", air: "#9fb8a8", earth: "#8a6a3a" },
      strong: { dmg: 1.5, stagger: 1.8 },
      resist: { dmg: 0.5, stagger: 0.4 },
    },

    // Enemy families (Chapter 1).
    enemies: {
      crawler: {
        name: "Torn Paper Crawler", element: "earth", hp: 32, w: 46, h: 26, dmg: 20, contact: true,
        speed: 55, aggro: 240, rear: 0.55, lungeSpeed: 430, lungeTime: 0.34, recover: 0.65, poise: 10, weight: 1,
      },
      wretch: {
        name: "Scribble Wretch", element: "none", hp: 46, w: 38, h: 54, dmg: 20, contact: false,
        speed: 85, aggro: 300, windup: 0.5, slashTime: 0.36, recover: 0.7, reach: 72, poise: 16, weight: 1,
      },
      moth: {
        name: "Ink Moth", element: "air", hp: 18, w: 34, h: 26, dmg: 20, contact: true, flying: true,
        speed: 120, aggro: 400, shootEvery: 2.6, telegraph: 0.6, shotSpeed: 280, poise: 4, weight: 0.5,
      },
      guard: {
        name: "Looseleaf Guard", element: "earth", hp: 80, w: 34, h: 70, dmg: 20, contact: false,
        speed: 45, aggro: 280, windup: 0.72, thrustTime: 0.22, recover: 0.85, reach: 124, poise: 30, weight: 2,
        shield: true,
      },
      leaflet: {
        name: "Cinder Leaflet", element: "fire", hp: 24, w: 30, h: 26, dmg: 20, contact: true,
        speed: 0, aggro: 360, hopEvery: 1.1, crouch: 0.35, poise: 6, weight: 0.7,
      },
    },

    bosses: {
      hart: {
        name: "The Faded Hart", title: "a ruined illustration", element: "none",
        hp: 300, poise: 110, w: 120, h: 96, dmg: 20, chargeDmg: 40,
      },
      marshal: {
        name: "Soot Marshal", title: "Keeper of the Burnt Archive", element: "fire",
        hp: 640, poise: 200, w: 70, h: 150, dmg: 20, heavyDmg: 40,
        phases: [1, 0.66, 0.33],
        walk: [95, 140, 175],
        tempo: [1, 0.85, 0.72], // wind-up multipliers per phase
      },
    },

    // Movement abilities granted by Keepers. Only Foldstep exists in Chapter 1.
    abilities: {
      foldstep: {
        name: "Foldstep", desc: "A short directional dash. Pass through creased pages and cross gaps.",
        dur: 0.15, speed: 1400, cooldown: 0.35, airUses: 1,
      },
    },

    pickups: { mendChance: 0.18, mendAmount: 20 },
  };
})();
