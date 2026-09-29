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
      coyote: 0.12, jumpBuffer: 0.15,
      apexHang: 0.55, apexBand: 140, fastFall: 1.3, cornerNudge: 10, ledgeAssist: 14,
      maxHp: 100, hpPerPip: 20,
      stamina: { max: 100, regen: 48, delay: 0.55, exhaustedUntil: 40 },
      dodge: { dur: 0.3, speed: 560, iStart: 0.02, iEnd: 0.24, cost: 22 },
      guard: { cost: 1.1, reduce: 0.25, moveSpeed: 70, parry: 0.16, parryPoise: 70 },
      closeCall: { slow: 0.35, dur: 0.4, stamina: 20 },
      hurtInvuln: 1.0,
    },

    ink: { start: 70, max: 100, refill: 15, cache: 25 },

    // Flow: wet ink gathered on the nib by fighting well. Spent on Ink Arts and on Mending.
    flow: {
      max: 99, pip: 33,
      gain: { hit: 7, heavyHit: 12, strong: 4, crit: 10, kill: 6, parry: 33, closeCall: 20, charged: 6 },
      mend: { cost: 33, heal: 20, channel: 0.85 },
    },
    // Hits on a staggered (reeling) foe, and the counter right after a parry.
    crit: { mult: 1.5, riposteMult: 2, riposteWindow: 0.9, riposteStagger: 30 },
    charge: { time: 0.5 },

    // Weapon archetypes. The drawing desk classifies a drawing into one of these.
    weapons: {
      nib: {
        name: "Bare Nib", cost: 0, desc: "The empty pen. A desperate little jab.",
        dmg: 8, windup: 0.07, active: 0.08, recovery: 0.2, reach: 46, height: 34, stamina: 4,
        knock: 110, stagger: 3, combo: 2, comboWindow: 0.3, moveMult: 0.7, lunge: 60, length: 30, hitstop: 0.04,
        charged: { name: "Quill Jab", dmg: 16, stagger: 10, knock: 220, reach: 96, height: 30, dash: 120, dur: 0.18 },
        art: { name: "Blot", kind: "blot", dmg: 22, stagger: 14, speed: 620 },
      },
      blade: {
        name: "Blade", cost: 18, desc: "Fast. Agile. Short reach, quick recovery.",
        dmg: 11, windup: 0.07, active: 0.09, recovery: 0.15, reach: 82, height: 52, stamina: 7,
        knock: 170, stagger: 9, combo: 3, comboWindow: 0.3, moveMult: 0.6, lunge: 140, length: 66, hitstop: 0.05,
        // Draw-Cut: dash straight through the enemy, invulnerable, cutting everything passed
        charged: { name: "Draw-Cut", dmg: 26, stagger: 22, knock: 120, reach: 60, height: 56, dash: 260, dur: 0.17, pierce: true, iframes: true },
        // Flurry: a storm of quick cuts in front
        art: { name: "Flurry", kind: "flurry", dmg: 8, stagger: 5, hits: 7, dur: 0.56, reach: 96, height: 60 },
      },
      polearm: {
        name: "Polearm", cost: 24, desc: "Balanced. Long reach, measured swings.",
        dmg: 15, windup: 0.15, active: 0.11, recovery: 0.25, reach: 128, height: 40, stamina: 12,
        knock: 230, stagger: 16, combo: 2, comboWindow: 0.34, moveMult: 0.35, lunge: 70, length: 108, hitstop: 0.06,
        // Pierce: a long lunging impale that skewers a line of foes
        charged: { name: "Pierce", dmg: 34, stagger: 40, knock: 380, reach: 196, height: 34, dash: 150, dur: 0.2, pierce: true },
        // Whirl: a full spin that strikes both sides twice and bats away shots
        art: { name: "Whirl", kind: "whirl", dmg: 17, stagger: 16, hits: 2, dur: 0.46, reach: 136, height: 70 },
      },
      heavy: {
        name: "Heavy Tool", cost: 30, desc: "Slow. Crushing. Breaks guards and staggers.",
        dmg: 31, windup: 0.38, active: 0.13, recovery: 0.44, reach: 100, height: 78, stamina: 22,
        knock: 400, stagger: 40, combo: 1, comboWindow: 0, moveMult: 0.12, lunge: 40, length: 86, hitstop: 0.1,
        breaksGuard: true, armorDuringSwing: true,
        // Earthsplitter: an overhead slam that sends ink waves along the floor both ways
        charged: { name: "Earthsplitter", dmg: 46, stagger: 60, knock: 460, reach: 120, height: 90, dash: 30, dur: 0.22, waves: { dmg: 18, speed: 520, life: 0.6 } },
        // Rift: leap, then crash down — a wide shock that knocks everything flat
        art: { name: "Rift", kind: "rift", dmg: 40, stagger: 70, radius: 190 },
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
        // burrows under the page and erupts beneath you; a full-size one tears into two when killed
        burrowChance: 0.4, tunnelSpeed: 250, tunnelMax: 1.6, erupt: 0.34, smallHp: 10, splits: 2,
      },
      wretch: {
        name: "Scribble Wretch", element: "none", hp: 46, w: 38, h: 54, dmg: 20, contact: false,
        speed: 85, aggro: 300, windup: 0.5, slashTime: 0.36, recover: 0.7, reach: 72, poise: 16, weight: 1,
        comboChance: 0.45, comboWindup: 0.3, hopBack: 0.35,
        // closes distance with a dash-slash; frenzied below 40% health
        dashWind: 0.4, dashSpeed: 560, dashTime: 0.3, frenzyAt: 0.4, frenzyTempo: 0.7,
      },
      moth: {
        name: "Ink Moth", element: "air", hp: 18, w: 34, h: 26, dmg: 20, contact: true, flying: true,
        speed: 120, aggro: 400, shootEvery: 2.6, telegraph: 0.6, shotSpeed: 280, poise: 4, weight: 0.5,
        // dive-bombs in a straight line when you're close enough
        diveChance: 0.55, diveRange: 320, diveWind: 0.55, diveSpeed: 560, diveTime: 0.55,
      },
      guard: {
        name: "Looseleaf Guard", element: "earth", hp: 80, w: 34, h: 70, dmg: 20, contact: false,
        speed: 45, aggro: 280, windup: 0.72, thrustTime: 0.22, recover: 0.85, reach: 124, poise: 30, weight: 2,
        shield: true, bashAfter: 2, bashWind: 0.38, bashTime: 0.2, bashDmg: 15, bashStamina: 30,
        // throws its spear if you hang back out of reach
        throwWind: 0.6, throwSpeed: 640, throwCd: 3,
      },
      leaflet: {
        name: "Cinder Leaflet", element: "fire", hp: 24, w: 30, h: 26, dmg: 20, contact: true,
        speed: 0, aggro: 360, hopEvery: 1.1, crouch: 0.35, poise: 6, weight: 0.7,
        // wounded, it flares and leaps at you to burst; killed by fire it bursts anyway, water puts it out
        flareAt: 0.6, flare: 0.65, burstRadius: 80, burstDmg: 20,
      },
    },

    bosses: {
      hart: {
        name: "The Faded Hart", title: "a ruined illustration", element: "none",
        hp: 300, poise: 130, w: 120, h: 96, dmg: 20, chargeDmg: 30, waveSpeed: 370,
        // phase 2 (below half): erased echoes gallop after its charges; it sprays ink
        echo: { delay: 0.55, speed: 640, dmg: 20, second: 0.25 },   // `second`: hp fraction below which two echoes follow
        spray: { wind: 0.6, drops: 5, dmg: 20, chance: 0.28 },
      },
      marshal: {
        name: "Soot Marshal", title: "Keeper of the Burnt Archive", element: "fire",
        hp: 560, poise: 200, w: 70, h: 150, dmg: 20, heavyDmg: 40,
        phases: [1, 0.66, 0.33],
        walk: [95, 140, 175],
        tempo: [1, 0.85, 0.72], // wind-up multipliers per phase
        floorBurn: 1.5,          // seconds the floor-fire patches burn (+0.2 per phase)
        // Stoke: he feeds the flames; douse him (water, or heavy pressure) or the Inferno erupts
        stoke: { douse: 45, radius: 300, dmg: 40, cooldown: 12, lastStand: 0.15 },
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
