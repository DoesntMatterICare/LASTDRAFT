// ART MANIFEST — describes the painted art the game will look for.
// Any file that exists replaces the in-code fallback drawing; missing files are simply skipped.
// Paths are relative to index.html:
//   assets/rooms/<roomId>/<layer>.png        layers: sky, far, mid, near, fg, terrain
//   assets/sprites/<set>/<anim>.png          a horizontal strip of equally sized frames
//   assets/ui/title.png
// All art is authored at 2x the game's logical resolution (scale 0.5). See ART_SPEC.md,
// and use tools/art-studio.html to export exact-size paint-over guides and frame templates.
(function () {
  const LD = (window.LD = window.LD || {});

  LD.ArtManifest = {
    roomLayers: {
      // parallax factor: 0 = fixed to the screen, 1 = moves with the terrain
      sky: 0, far: 0.15, mid: 0.4, near: 0.7, fg: 1.15,
      margin: 80, // extra logical px painted on every side of parallax layers
      scale: 0.5,
    },

    // frame: [w, h] of ONE frame in the file (2x px). origin: the ground-contact point
    // (feet, bottom-centre) inside a frame. n: frame count. fps for timed anims; anims
    // driven by attack/dodge progress ignore fps. alias: fallback when a file is missing.
    // A set switches on as soon as its "idle" strip exists; its other missing anims fall
    // back through `alias` (ending at idle), never to the code drawing.
    sprites: {
      sketcher: {
        frame: [256, 256], origin: [128, 240], scale: 0.5,
        anims: {
          idle: { n: 8, fps: 8 }, walk: { n: 8, fps: 10 }, run: { n: 10, fps: 14 },
          jump: { n: 4, fps: 12, once: true }, fall: { n: 4, fps: 10 }, land: { n: 3, fps: 20, once: true },
          dodge: { n: 6, once: true }, guard: { n: 2, fps: 6 }, hurt: { n: 3, fps: 12, once: true },
          death: { n: 10, fps: 10, once: true }, raise: { n: 6, fps: 10, once: true }, fold: { n: 3, fps: 20 },
          attack_nib_1: { n: 5 }, attack_nib_2: { n: 5 },
          attack_blade_1: { n: 6 }, attack_blade_2: { n: 6 }, attack_blade_3: { n: 6 },
          attack_polearm_1: { n: 7 }, attack_polearm_2: { n: 6 },
          attack_heavy_1: { n: 9 },
          attack_up: { n: 6 }, attack_down: { n: 6 },
        },
        alias: {
          walk: "run", run: "idle", fall: "jump", jump: "idle", land: "idle", dodge: "run", guard: "idle",
          hurt: "idle", death: "hurt", raise: "idle", fold: "dodge",
          attack_nib_1: "attack_blade_1", attack_nib_2: "attack_blade_2",
          attack_blade_2: "attack_blade_1", attack_blade_3: "attack_polearm_2", attack_blade_1: "idle",
          attack_polearm_1: "attack_blade_1", attack_polearm_2: "attack_polearm_1",
          attack_heavy_1: "attack_blade_1", attack_up: "attack_blade_1", attack_down: "attack_blade_1",
        },
        // Hand (weapon grip) per frame, in frame px: { anim: [[x,y], ...] }. Pick them with
        // tools/art-studio.html → "Hand anchors". Missing entries use the code skeleton's hand.
        hands: {},
      },
      crawler: { frame: [192, 128], origin: [96, 120], scale: 0.5, anims: { idle: { n: 6, fps: 10 }, rear: { n: 4 }, lunge: { n: 4, fps: 14 }, recover: { n: 4, fps: 8 }, stagger: { n: 2, fps: 6 }, death: { n: 6, fps: 12, once: true } }, alias: { rear: "idle", lunge: "rear", recover: "idle", stagger: "idle", death: "stagger" } },
      wretch: { frame: [192, 192], origin: [96, 184], scale: 0.5, anims: { idle: { n: 8, fps: 12 }, windup: { n: 5 }, slash: { n: 6 }, recover: { n: 4, fps: 8 }, stagger: { n: 2, fps: 6 }, death: { n: 8, fps: 12, once: true } }, alias: { windup: "idle", slash: "windup", recover: "idle", stagger: "idle", death: "stagger" } },
      moth: { frame: [160, 160], origin: [80, 80], scale: 0.5, anims: { idle: { n: 6, fps: 14 }, tele: { n: 4 }, death: { n: 6, fps: 12, once: true } }, alias: { tele: "idle", death: "idle" } },
      guard: { frame: [256, 256], origin: [128, 248], scale: 0.5, anims: { idle: { n: 4, fps: 6 }, walk: { n: 8, fps: 8 }, windup: { n: 4 }, thrust: { n: 3 }, recover: { n: 4 }, stagger: { n: 2, fps: 6 }, death: { n: 8, fps: 10, once: true } }, alias: { walk: "idle", windup: "idle", thrust: "windup", recover: "idle", stagger: "idle", death: "stagger" } },
      leaflet: { frame: [128, 128], origin: [64, 120], scale: 0.5, anims: { idle: { n: 6, fps: 10 }, crouch: { n: 3 }, hop: { n: 4, fps: 10 }, death: { n: 6, fps: 12, once: true } }, alias: { crouch: "idle", hop: "idle", death: "idle" } },
      hart: { frame: [448, 384], origin: [224, 372], scale: 0.5, anims: { dormant: { n: 1 }, idle: { n: 6, fps: 8 }, charge_wind: { n: 4 }, charge: { n: 6, fps: 16 }, stun: { n: 4, fps: 6 }, sweep: { n: 7 }, leap: { n: 6 }, land: { n: 4 }, stagger: { n: 2, fps: 6 }, death: { n: 10, fps: 8, once: true } }, alias: { dormant: "idle", charge_wind: "idle", charge: "idle", stun: "stagger", sweep: "idle", leap: "idle", land: "idle", stagger: "idle", death: "stagger" } },
      marshal: {
        frame: [640, 512], origin: [320, 500], scale: 0.5,
        anims: {
          dormant: { n: 1 }, rise: { n: 8 }, idle: { n: 6, fps: 6 }, walk: { n: 8, fps: 8 },
          cleave: { n: 10 }, sweep: { n: 9 }, lob: { n: 8 }, lunge: { n: 8 }, stomp: { n: 8 },
          roar: { n: 6, fps: 8 }, kneel: { n: 2, fps: 4 }, death: { n: 12, fps: 6, once: true },
        },
        alias: { dormant: "kneel", rise: "idle", walk: "idle", cleave: "idle", sweep: "cleave", lob: "idle", lunge: "cleave", stomp: "cleave", roar: "idle", kneel: "idle", death: "kneel" },
      },
      quillon: { frame: [192, 256], origin: [96, 248], scale: 0.5, anims: { idle: { n: 6, fps: 5 } }, alias: {} },
      lampwick: { frame: [192, 256], origin: [96, 248], scale: 0.5, anims: { idle: { n: 6, fps: 5 } }, alias: {} },
      pell: { frame: [192, 256], origin: [96, 248], scale: 0.5, anims: { idle: { n: 6, fps: 5 } }, alias: {} },
      inkspot: { frame: [320, 640], origin: [160, 620], scale: 0.5, anims: { idle: { n: 8, fps: 8 }, reach: { n: 6 } }, alias: { reach: "idle" } },
    },

    ui: ["title"],
  };
})();
