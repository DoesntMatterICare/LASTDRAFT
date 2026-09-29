// DialogueSystem UI: a torn parchment strip with a hand-written typewriter effect.
// Ink Spot speaks on black ink instead of paper, with letters that won't sit still.
// Also the lore reader (notes, boards, murals).
(function () {
  const LD = window.LD;
  const U = LD.U, Art = LD.Art, I = LD.Input, A = LD.Audio;

  class DialogueBox {
    constructor(lines, onDone) {
      this.lines = lines.map((l) => (typeof l === "string" ? { who: "", text: l } : l));
      this.i = 0; this.chars = 0; this.t = 0; this.onDone = onDone; this.pause = true; this.alpha = 0;
      this.scratchT = 0;
      if (this.lines[0] && this.lines[0].ink) A.sfx.whisper();
    }
    cur() { return this.lines[this.i]; }
    update(dt, G) {
      this.t += dt;
      this.alpha = Math.min(1, this.alpha + dt * 5);
      const line = this.cur();
      if (!line) return false;
      const speed = line.ink ? 34 : 52;
      const before = Math.floor(this.chars);
      this.chars = Math.min(line.text.length, this.chars + dt * speed);
      if (Math.floor(this.chars) > before) {
        this.scratchT -= dt;
        if (this.scratchT <= 0 && !line.ink) { A.sfx.scratch(); this.scratchT = 0.06; }
      }
      const adv = I.pressed("confirm") || I.pressed("interact") || I.pressed("attack") || I.mouse.pressed;
      if (adv && this.t > 0.15) {
        if (this.chars < line.text.length) this.chars = line.text.length;
        else {
          this.i++; this.chars = 0; this.t = 0;
          A.sfx.page();
          if (this.i >= this.lines.length) { if (this.onDone) this.onDone(G); return false; }
          if (this.cur().ink) A.sfx.whisper();
        }
      }
      return true;
    }
    draw(ctx, G) {
      const line = this.cur();
      if (!line) return;
      const W = 980, Hh = 178, x = (U.VIEW_W - W) / 2, y = U.VIEW_H - Hh - 26;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      if (line.ink) {
        ctx.fillStyle = "rgba(8,5,6,0.93)";
        Art.blobPath(ctx, x + W / 2, y + Hh / 2, W / 2 + 10, Hh / 2 + 8, Math.floor(G.time * 6), 30, 0.06); ctx.fill();
        for (let k = 0; k < 6; k++) { ctx.fillStyle = "rgba(8,5,6,0.9)"; Art.brush(ctx, [x + 60 + k * 160, y + Hh, x + 62 + k * 160, y + Hh + 20 + (k % 3) * 10], 6, { seed: k }); }
      } else {
        ctx.drawImage(Art.parchment(W, Hh, 5, { torn: true }), x, y);
        LD.UIKit.drawFrame(ctx, x + 8, y + 8, W - 16, Hh - 16, { inset: 8, fleurons: false });
      }
      if (line.who && !line.ink) {
        // speaker's name on a small ribbon tab
        ctx.font = "28px " + Art.TITLE;
        const nw = ctx.measureText(line.who).width;
        LD.UIKit.ribbon(ctx, x + 44 + nw / 2, y + 2, nw + 30, 32, "#6e1812", "#3e0c08");
        Art.text(ctx, line.who, x + 44, y + 12, 28, { font: "title", color: "#f1e6cf" });
      } else if (line.who) Art.text(ctx, line.who, x + 44, y + 44, 28, { font: "title", color: "#b9a3c6" });
      const shown = line.text.slice(0, Math.floor(this.chars));
      if (line.ink) {
        // jittering, unsettled letters
        ctx.font = "28px " + Art.HAND;
        let cx = x + 46, cy = y + (line.who ? 88 : 70);
        const words = shown.split(" ");
        for (const w of words) {
          const ww = ctx.measureText(w + " ").width;
          if (cx + ww > x + W - 40) { cx = x + 46; cy += 32; }
          for (let c = 0; c < w.length; c++) {
            const jx = (U.hash(c + cx + Art.boil) - 0.5) * 2.2, jy = (U.hash(c * 3 + cy + Art.boil) - 0.5) * 2.2;
            ctx.fillStyle = "#e9dff0"; ctx.fillText(w[c], cx + jx, cy + jy);
            cx += ctx.measureText(w[c]).width;
          }
          cx += ctx.measureText(" ").width;
        }
      } else {
        Art.richText(ctx, shown, x + 46, y + (line.who ? 88 : 70), 27, W - 92, { color: "#21170f" });
      }
      if (this.chars >= line.text.length) {
        if (line.ink) { if (Math.floor(G.time * 2) % 2 === 0) Art.text(ctx, "▸", x + W - 44, y + Hh - 22, 26, { color: "#e9dff0" }); }
        else LD.UIKit.nib(ctx, x + W - 34 + Math.sin(G.time * 5) * 3, y + Hh - 30, 0.7);
      }
      ctx.restore();
    }
  }

  class LoreReader {
    constructor(id) { this.lore = LD.Lore[id]; this.t = 0; this.pause = true; A.sfx.page(); }
    update(dt) {
      this.t += dt;
      if (this.t > 0.25 && (I.pressed("confirm") || I.pressed("back") || I.pressed("interact") || I.mouse.pressed)) { A.sfx.page(); return false; }
      return true;
    }
    draw(ctx, G) {
      const k = U.easeOut(Math.min(1, this.t * 4));
      ctx.save();
      ctx.fillStyle = "rgba(10,7,5," + 0.5 * k + ")"; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
      const W = 640, Hh = 460, x = (U.VIEW_W - W) / 2, y = (U.VIEW_H - Hh) / 2 + (1 - k) * 40;
      ctx.globalAlpha = k;
      ctx.translate(x + W / 2, y + Hh / 2); ctx.rotate(-0.012); ctx.translate(-W / 2, -Hh / 2);
      ctx.drawImage(Art.parchment(W, Hh, 77, { torn: true }), 0, 0);
      LD.UIKit.drawFrame(ctx, 10, 10, W - 20, Hh - 20, { inset: 12, fleurons: false });
      LD.UIKit.pin(ctx, W / 2, 26);
      Art.text(ctx, this.lore.title, W / 2, 68, 30, { align: "center", font: "title", color: "#4a2418" });
      LD.UIKit.divider(ctx, W / 2, 86, W - 220, "rgba(74,36,24,0.75)", 4);
      let yy = 130;
      for (const para of this.lore.text.split("\n")) yy += Art.richText(ctx, para, 60, yy, 29, W - 120, { color: "#21170f" }) + 8;
      Art.text(ctx, "— press any key —", W / 2, Hh - 30, 18, { align: "center", color: "rgba(60,40,25,0.6)" });
      ctx.restore();
    }
  }

  LD.DialogueBox = DialogueBox;
  LD.LoreReader = LoreReader;
})();
