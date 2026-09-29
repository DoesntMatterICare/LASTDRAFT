// Cutscene runner: story beats are generator functions that yield
//   a number (seconds to wait), a function (wait until it returns true),
//   or { say: lines } (wait for a dialogue box to close).
(function () {
  const LD = window.LD;

  LD.Cutscene = {
    start(G, gen) {
      G.cut = { it: gen, wait: 0, until: null, waitingDialog: false };
      G.player.control = false;
      LD.Cutscene.step(G, 0);
    },
    step(G, dt) {
      const c = G.cut;
      if (!c) return;
      if (c.waitingDialog) { if (G.overlays.length) return; c.waitingDialog = false; }
      if (c.wait > 0) { c.wait -= dt; if (c.wait > 0) return; }
      if (c.until) { if (!c.until()) return; c.until = null; }
      for (;;) {
        const r = c.it.next();
        if (r.done) { G.cut = null; if (!G.player.dead) G.player.control = true; return; }
        const v = r.value;
        if (typeof v === "number") { c.wait = v; return; }
        if (typeof v === "function") { if (!v()) { c.until = v; return; } continue; }
        if (v && v.say) { G.pushOverlay(new LD.DialogueBox(v.say)); c.waitingDialog = true; return; }
      }
    },
  };
})();
