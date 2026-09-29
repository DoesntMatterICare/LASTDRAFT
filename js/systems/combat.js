// CombatSystem: resolves hits between the player's drawn weapon and corrupted
// illustrations, applying the element wheel, stagger (poise), knockback and hit-stop.
(function () {
  const LD = window.LD;
  const U = LD.U;
  const Art = LD.Art;
  const P = LD.Particles;

  const C = (LD.Combat = {});

  // Player weapon -> enemy
  C.hitEnemy = (G, e, atk) => {
    if (e.dead || e.invuln > 0) return false;
    const m = LD.Elements.mult(atk.element, e.element);
    let dmg = atk.dmg * m.dmg * (G.settings.damageAssist ? 1.35 : 1);
    let stagger = atk.stagger * m.stagger;
    const res = e.takeHit ? e.takeHit(G, { dmg, stagger, knock: atk.knock, dir: atk.dir, heavy: atk.heavy, breaksGuard: atk.breaksGuard, rel: m.rel, fromY: atk.fromY }) : "hit";
    if (res === "blocked") {
      LD.Audio.sfx.block();
      P.burst(e.cx(), e.cy(), 6, "scrap", { min: 80, max: 200, p: { color: "#e6d8bb", g: 500 } });
      G.hitstop = Math.max(G.hitstop, 0.05);
      return "blocked";
    }
    LD.Audio.sfx.hit(atk.heavy);
    const col = atk.element === "water" ? Art.WATER : Art.INK;
    P.inkHit(e.cx(), e.cy(), atk.dir, col, atk.heavy || m.rel === "strong");
    if (atk.element === "water") P.burst(e.cx(), e.cy(), 6, "water", { angle: atk.dir > 0 ? 0 : Math.PI, spread: 1, min: 100, max: 300, p: { color: "#7ab4e8" } });
    if (m.rel === "strong") {
      LD.Audio.sfx.strong();
      P.add({ kind: "text", x: e.cx(), y: e.y - 14, vy: -50, g: 0, text: "✶ strong", size: 24, life: 0.9, color: "#1c3f73", front: true });
    } else if (m.rel === "resist") {
      LD.Audio.sfx.weak();
      P.add({ kind: "text", x: e.cx(), y: e.y - 14, vy: -50, g: 0, text: "◌ resisted", size: 22, life: 0.9, color: "#5a4a3a", front: true });
    }
    G.hitstop = Math.max(G.hitstop, atk.hitstop || 0.05);
    LD.Camera.shake(atk.heavy ? 0.28 : 0.12);
    return "hit";
  };

  // Anything -> player
  C.hurtPlayer = (G, dmg, srcX, o = {}) => G.player.hurt(G, dmg, srcX, o);

  // A telegraphed attack hitbox owned by an enemy
  C.enemyStrike = (G, box, dmg, srcX, o) => {
    const p = G.player;
    if (!p || p.dead) return false;
    if (U.overlap(box, p.hurtbox())) return C.hurtPlayer(G, dmg, srcX, o);
    return false;
  };
})();
