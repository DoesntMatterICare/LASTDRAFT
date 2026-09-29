// World / Scene management: room loading, tile collision, terrain + prop baking,
// live environmental features (veils, gates, ink pools, water, lamps) and exits.
(function () {
  const LD = window.LD;
  const U = LD.U;
  const Art = LD.Art;
  const T = U.TILE;

  const W = (LD.World = {
    room: null, grid: null, w: 0, h: 0,
    enemies: [], objs: [], projectiles: [], effects: [],
    temp: new Map(), bakeScale: 1, bg: null, terrain: null,
    veilFx: new Map(), // veil tiles recently folded (x,y -> t)
  });

  const SOLID = new Set(["#", "B", "H", "D", "G"]);
  // every progress flag that reshapes a room (used to find tiles that change during play)
  W.ALL_FLAGS = { pigment_water: 1, boss_marshal: 1, boss_hart: 1, hatch_open: 1, ash_door: 1, foldstep: 1, broke_margin: 1, broke_gardens: 1, metPell: 1 };

  // ---------------------------------------------------------------- tiles
  W.tileAt = (tx, ty) => {
    const k = tx + "," + ty;
    if (W.temp.has(k)) return W.temp.get(k);
    if (tx >= 0 && ty >= 0 && tx < W.w && ty < W.h) return W.grid[ty][tx];
    for (const e of W.room.exits) {
      if (e.side === "L" && tx < 0 && ty >= e.a && ty <= e.b) return ".";
      if (e.side === "R" && tx >= W.w && ty >= e.a && ty <= e.b) return ".";
      if (e.side === "T" && ty < 0 && tx >= e.a && tx <= e.b) return ".";
      if (e.side === "B" && ty >= W.h && tx >= e.a && tx <= e.b) return ".";
    }
    if (ty >= W.h && tx >= 0 && tx < W.w) return "X"; // falling out of the page
    return "#";
  };
  W.solid = (tx, ty, b) => {
    const c = W.tileAt(tx, ty);
    if (SOLID.has(c)) return true;
    if (c === "V") return !(b && b.folding);
    return false;
  };
  W.oneWay = (tx, ty) => W.tileAt(tx, ty) === "=";
  W.pointSolid = (px, py) => W.solid(Math.floor(px / T), Math.floor(py / T), null);

  function moveX(b, dx) {
    b.x += dx;
    const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
    if (dx > 0) {
      const tx = Math.floor((b.x + b.w - 0.01) / T);
      for (let ty = y0; ty <= y1; ty++) if (W.solid(tx, ty, b)) { b.x = tx * T - b.w; b.vx = 0; b.hitWall = 1; return; }
    } else if (dx < 0) {
      const tx = Math.floor(b.x / T);
      for (let ty = y0; ty <= y1; ty++) if (W.solid(tx, ty, b)) { b.x = (tx + 1) * T; b.vx = 0; b.hitWall = -1; return; }
    }
  }
  function moveY(b, dy) {
    const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
    if (dy > 0) {
      const oldBottom = b.y + b.h;
      b.y += dy;
      const ty = Math.floor((b.y + b.h - 0.01) / T);
      for (let tx = x0; tx <= x1; tx++) {
        const s = W.solid(tx, ty, b);
        const ow = !s && b.oneWay !== false && !(b.dropT > 0) && W.oneWay(tx, ty) && oldBottom <= ty * T + 0.5;
        if (s || ow) { b.y = ty * T - b.h; b.vy = 0; b.onGround = true; b.groundTile = W.tileAt(tx, ty); return; }
      }
    } else if (dy < 0) {
      b.y += dy;
      const ty = Math.floor(b.y / T);
      for (let tx = x0; tx <= x1; tx++) if (W.solid(tx, ty, b)) { b.y = (ty + 1) * T; b.vy = 0; b.hitCeil = true; return; }
    }
  }
  W.moveBody = (b, dt) => {
    const dx = b.vx * dt, dy = b.vy * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 10));
    b.hitWall = 0; b.hitCeil = false; b.onGround = false;
    for (let i = 0; i < steps; i++) { moveX(b, dx / steps); moveY(b, dy / steps); }
  };
  // Is there ground under a point (for enemy ledge detection)?
  W.groundAt = (px, py) => {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    return W.solid(tx, ty, null) || W.oneWay(tx, ty);
  };

  W.hiddenAt = (px, py) => (W.room.covers || []).some((c) => px > c.x * T && px < (c.x + c.w) * T && py > c.y * T && py <= (c.y + c.h) * T + 2);

  W.hazardIn = (r) => {
    const x0 = Math.floor((r.x + 4) / T), x1 = Math.floor((r.x + r.w - 4) / T);
    const y0 = Math.floor((r.y + 6) / T), y1 = Math.floor((r.y + r.h - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = W.tileAt(tx, ty);
      if (c === "^" || c === "~" || c === "X") return c;
    }
    return null;
  };
  W.rectTouches = (r, ch) => {
    const x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w) / T);
    const y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - 1) / T);
    const out = [];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (W.tileAt(tx, ty) === ch) out.push([tx, ty]);
    return out;
  };

  // ---------------------------------------------------------------- loading
  W.load = (id, S, opts = {}) => {
    const room = LD.buildRoom(id, S.flags);
    W.room = room; W.grid = room.grid; W.w = room.w; W.h = room.h;
    W.enemies = []; W.objs = []; W.projectiles = []; W.effects = [];
    W.temp.clear(); W.veilFx.clear();
    LD.Particles.clear();
    W.bake(S);
    for (const d of room.ents) {
      const e = LD.spawnEntity(d, S);
      if (!e) continue;
      if (e.isEnemy) W.enemies.push(e); else W.objs.push(e);
    }
    S.visited[id] = true;
    S.flags["visited_" + id] = true;
    return room;
  };

  // Called when flags change while standing in the room: reshape tiles, keep entities.
  W.refresh = (S) => {
    const room = LD.buildRoom(W.room.id, S.flags);
    W.room.grid = room.grid; W.room.exits = room.exits; W.room.props = room.props; W.room.breaks = room.breaks; W.room.covers = room.covers;
    W.grid = room.grid;
    W.bake(S);
  };

  W.bake = (S) => {
    const stage = LD.binderyStage(S);
    const key = W.room.id + "|" + !!S.flags.pigment_water + "|" + (W.room.theme === "bindery" ? stage : "");
    if (!W.bg || W.bg.key !== key) { W.bg = LD.BG.build(W.room, S.flags, stage); W.bg.key = key; }
    W.painted = !!LD.Assets.room(W.room.id, "terrain");
    W.terrain = bakeTerrain(W.room, S, W.painted);
  };

  // ---------------------------------------------------------------- terrain baking
  // Every tile corner / edge-midpoint is displaced by a hash of its coordinates, so
  // neighbouring tiles share points: the union reads as one organic, hand-cut shape.
  function vtx(vx, vy) {
    const j = 7;
    return [vx * T + (U.hash2(vx * 1.7, vy * 3.1) - 0.5) * j * 2, vy * T + (U.hash2(vx * 5.3, vy * 0.7) - 0.5) * j * 2];
  }
  function mid(vx2, vy2) {
    // vx2, vy2 are doubled coordinates of an edge midpoint
    const j = 5;
    return [(vx2 / 2) * T + (U.hash2(vx2 * 2.3, vy2 * 1.9) - 0.5) * j * 2, (vy2 / 2) * T + (U.hash2(vx2 * 0.9, vy2 * 4.1) - 0.5) * j * 2];
  }
  function tilePoly(tx, ty) {
    const a = vtx(tx, ty), b = mid(tx * 2 + 1, ty * 2), c = vtx(tx + 1, ty), d = mid(tx * 2 + 2, ty * 2 + 1);
    const e = vtx(tx + 1, ty + 1), f = mid(tx * 2 + 1, ty * 2 + 2), g = vtx(tx, ty + 1), h = mid(tx * 2, ty * 2 + 1);
    return [a, b, c, d, e, f, g, h];
  }

  // painted: a terrain.png exists for this room. Then only the tiles that CHANGE during play
  // (grates, gates, doors, breakable walls, planks that appear) are drawn here, on top of it.
  function vgradW(ctx, y0, y1, cols) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
    return g;
  }
  function bakeTerrain(room, S, painted) {
    const s = W.bakeScale;
    const pal = LD.Palette[room.theme];
    const c = Art.canvas(room.w * T * s, room.h * T * s), x = c.getContext("2d");
    x.scale(s, s);
    const r = U.rng(U.strSeed(room.id));
    const real = room.grid;
    let grid = real;
    if (painted) {
      // a tile is "dynamic" if it can differ between the start of the chapter and the end;
      // tools/art-studio.html marks exactly these tiles as "leave empty" on the paint guide
      const base = LD.buildRoom(room.id, {}).grid;
      const all = LD.buildRoom(room.id, W.ALL_FLAGS).grid;
      grid = real.map((row, y) => row.map((ch, xx) => {
        const b = base[y][xx], a = all[y][xx];
        return b !== a || "BHDGV".includes(b) || "BHDGV".includes(a) ? ch : ".";
      }));
    }

    // props behind terrain (painted terrain already contains them)
    if (!painted) for (const p of room.props) drawProp(x, p, room, S, r, false);

    const isSolid = (tx, ty) => { const ch = tx < 0 || ty < 0 || tx >= room.w || ty >= room.h ? "?" : real[ty][tx]; return ch === "#" || ch === "B" || ch === "H" || ch === "D"; };
    const inGrid = (tx, ty) => tx >= 0 && ty >= 0 && tx < room.w && ty < room.h;

    // 1) solid mass
    const path = new Path2D();
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
      if (grid[ty][tx] !== "#") continue;
      const P = tilePoly(tx, ty);
      // extend out-of-bounds borders so edges of the page are covered
      const ex = (tx === 0 ? -30 : 0), ex2 = (tx === room.w - 1 ? 30 : 0), ey2 = (ty === room.h - 1 ? 30 : 0), ey = (ty === 0 ? -30 : 0);
      path.moveTo(P[0][0] + ex, P[0][1] + ey);
      for (let i = 1; i < 8; i++) {
        let px = P[i][0], py = P[i][1];
        if (i >= 6 || i === 0) px += ex; if (i >= 2 && i <= 4) px += ex2;
        if (i >= 4 && i <= 6) py += ey2; if (i <= 2) py += ey;
        path.lineTo(px, py);
      }
      path.closePath();
    }
    // soft contact shadow so the terrain sits in front of the painted backdrop
    x.save(); x.shadowColor = "rgba(0,0,0,0.55)"; x.shadowBlur = 22; x.fillStyle = pal.solid; x.fill(path); x.restore();
    x.fillStyle = pal.solid;
    x.fill(path);
    x.save();
    x.clip(path);
    const theme = room.theme;
    const stoneLike = !["bindery", "margin", "void"].includes(theme);
    // depth: how far below an open tile each solid tile lies (0 = the lit surface)
    const depthAt = (tx, ty) => { for (let d = 0; d < 5; d++) if (!isSolid(tx, ty - d - 1) && inGrid(tx, ty - d - 1)) return d; return 5; };
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
      if (grid[ty][tx] !== "#") continue;
      const px = tx * T, py = ty * T, d = depthAt(tx, ty), hsh = U.hash2(tx, ty);
      if (d === 0) { x.fillStyle = vgradW(x, py, py + T, [pal.top, pal.solid]); x.fillRect(px - 1, py - 8, T + 2, T + 8); }
      else { x.fillStyle = "rgba(0,0,0," + Math.min(0.6, d * 0.13) + ")"; x.fillRect(px - 1, py, T + 2, T + 1); }
      if (d >= 4) { x.fillStyle = pal.deep; x.globalAlpha = 0.5; x.fillRect(px - 1, py, T + 2, T + 1); x.globalAlpha = 1; }
      // side faces catch a little light
      if (!isSolid(tx - 1, ty) && inGrid(tx - 1, ty)) { x.fillStyle = "rgba(255,235,210,0.07)"; x.fillRect(px, py, 7, T); }
      if (!isSolid(tx + 1, ty) && inGrid(tx + 1, ty)) { x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(px + T - 8, py, 8, T); }
      if (d > 3) continue;
      // masonry / timber structure near the surface
      x.lineWidth = 1.3;
      if (stoneLike) {
        const rows = 2;
        for (let k = 0; k < rows; k++) {
          const by = py + k * (T / rows), off = ((ty * rows + k) % 2) * 14 + Math.floor(hsh * 6);
          x.strokeStyle = "rgba(0,0,0,0.42)";
          x.beginPath(); x.moveTo(px, by + T / rows); x.lineTo(px + T, by + T / rows + (hsh - 0.5) * 2); x.stroke();
          for (let bx = px - off; bx < px + T; bx += 26 + hsh * 6) {
            if (bx <= px) continue;
            x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + 1, by + T / rows); x.stroke();
          }
          x.strokeStyle = "rgba(255,238,215," + Math.max(0.02, 0.09 - d * 0.02) + ")";
          x.beginPath(); x.moveTo(px + 2, by + 2); x.lineTo(px + T - 2, by + 2); x.stroke();
        }
        if (hsh > 0.82) { x.strokeStyle = "rgba(0,0,0,0.5)"; x.beginPath(); x.moveTo(px + 8, py + 4); x.lineTo(px + 16, py + 18); x.lineTo(px + 12, py + 30); x.stroke(); }
      } else if (theme === "bindery") {
        x.strokeStyle = "rgba(0,0,0,0.45)";
        x.beginPath(); for (let k = 1; k < 4; k++) { x.moveTo(px, py + k * 10); x.lineTo(px + T, py + k * 10); } x.stroke();
        x.strokeStyle = "rgba(255,220,170,0.08)"; x.beginPath(); x.moveTo(px, py + 2); x.lineTo(px + T, py + 2); x.stroke();
        if (hsh > 0.7) { x.fillStyle = "rgba(0,0,0,0.5)"; x.beginPath(); x.arc(px + hsh * 30 + 5, py + 15, 1.5, 0, 7); x.fill(); }
      } else {
        x.strokeStyle = "rgba(60,45,35,0.35)";
        x.beginPath(); for (let k = 0; k < 4; k++) { x.moveTo(px + 4 + k * 9, py + 34); x.lineTo(px + 12 + k * 9, py + 8); } x.stroke();
      }
    }
    // grime, moss and ink stains
    for (let i = 0; i < room.w * room.h * 0.03; i++) Art.wash(x, r() * room.w * T, r() * room.h * T, 25 + r() * 60, 15 + r() * 40, "#000", 0.2, r() * 999, 2);
    if (["dusk", "gardens", "bridge", "spire"].includes(theme)) for (let i = 0; i < room.w * 0.4; i++) Art.wash(x, r() * room.w * T, r() * room.h * T, 14 + r() * 26, 6 + r() * 10, theme === "gardens" ? "#6d5a3a" : "#4a4a3a", 0.25, r() * 999, 2);
    x.globalCompositeOperation = "multiply"; x.globalAlpha = 0.35;
    x.fillStyle = x.createPattern(Art.grain(), "repeat"); x.fillRect(0, 0, room.w * T, room.h * T);
    x.restore();

    // 2) ink edges
    x.fillStyle = Art.INK;
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
      if (grid[ty][tx] !== "#") continue;
      const P = tilePoly(tx, ty);
      const up = !isSolid(tx, ty - 1) && inGrid(tx, ty - 1), dn = !isSolid(tx, ty + 1) && inGrid(tx, ty + 1);
      const lf = !isSolid(tx - 1, ty) && inGrid(tx - 1, ty), rt = !isSolid(tx + 1, ty) && inGrid(tx + 1, ty);
      const seed = tx * 13 + ty * 7;
      if (up) {
        x.fillStyle = Art.INK;
        Art.brush(x, [P[0][0] - 2, P[0][1], P[1][0], P[1][1], P[2][0] + 2, P[2][1]], 5, { seed, taperStart: 0, taperEnd: 0 });
        // rim light: the page catching light on its top edge
        x.fillStyle = pal.rim; x.globalAlpha = 0.18;
        Art.brush(x, [P[0][0], P[0][1] + 7, P[1][0], P[1][1] + 7, P[2][0], P[2][1] + 7], 9, { seed: seed + 2, taperStart: 0, taperEnd: 0 });
        x.globalAlpha = 0.75;
        Art.brush(x, [P[0][0], P[0][1] + 3.5, P[1][0], P[1][1] + 3.5, P[2][0], P[2][1] + 3.5], 2.4, { seed: seed + 1, taperStart: 0.2, taperEnd: 0.2 });
        x.globalAlpha = 1;
        // tufts of pale grass-paper on outdoor ledges
        if (["dusk", "gardens", "bridge", "spire", "margin"].includes(room.theme) && U.hash2(tx, ty + 51) < 0.45) {
          x.strokeStyle = room.theme === "gardens" ? "rgba(190,140,120,0.8)" : "rgba(170,160,140,0.7)"; x.lineWidth = 1.2;
          const gx = tx * T + U.hash2(tx, ty + 5) * 30;
          for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(gx + k * 2, P[1][1] + 1); x.quadraticCurveTo(gx + k * 2 - 2, P[1][1] - 5, gx + k * 2 + (k - 2) * 1.5, P[1][1] - 7 - U.hash(seed + k) * 5); x.stroke(); }
        }
        // loose paper curls lying on top (soft, rounded — never spike-shaped, so they can't read as thorns)
        x.fillStyle = pal.fringe; x.globalAlpha = 0.7;
        const n = Math.floor(U.hash2(tx, ty + 99) * 2.4);
        for (let k = 0; k < n; k++) {
          const fx = tx * T + 5 + U.hash2(tx + k, ty) * 30, fy = P[1][1] + 1;
          x.beginPath(); x.ellipse(fx, fy - 1.5, 4 + U.hash(seed + k) * 4, 1.8, (U.hash(seed + k * 3) - 0.5) * 0.4, 0, Math.PI * 2); x.fill();
        }
        x.globalAlpha = 1;
      }
      x.fillStyle = Art.INK;
      if (lf) Art.brush(x, [P[6][0], P[6][1] + 2, P[7][0], P[7][1], P[0][0], P[0][1] - 2], 3.2, { seed: seed + 3, taperStart: 0, taperEnd: 0 });
      if (rt) Art.brush(x, [P[2][0], P[2][1] - 2, P[3][0], P[3][1], P[4][0], P[4][1] + 2], 3.2, { seed: seed + 4, taperStart: 0, taperEnd: 0 });
      if (dn) {
        Art.brush(x, [P[4][0] + 1, P[4][1], P[5][0], P[5][1], P[6][0] - 1, P[6][1]], 3, { seed: seed + 5, taperStart: 0, taperEnd: 0 });
        // hanging torn paper / ink drips underneath
        x.fillStyle = pal.solid;
        const hh = 6 + U.hash2(tx, ty + 7) * 16;
        x.beginPath(); x.moveTo(P[6][0], P[6][1] - 1); x.lineTo(P[5][0] - 6, P[5][1] + hh); x.lineTo(P[5][0] + 4, P[5][1] + hh * 0.4); x.lineTo(P[4][0], P[4][1] - 1); x.fill();
        if (U.hash2(tx, ty + 3) < 0.3) { x.fillStyle = Art.INK; Art.brush(x, [P[5][0], P[5][1], P[5][0] + 1, P[5][1] + 10 + hh], 3, { seed, taperStart: 0, taperEnd: 0.8 }); }
        if (U.hash2(tx, ty + 11) < 0.22) {
          // dangling roots / threads of torn paper
          x.strokeStyle = "rgba(20,14,12,0.85)"; x.lineWidth = 1.3;
          const rx0 = tx * T + U.hash2(tx, ty) * 30, len = 20 + U.hash2(tx, ty + 2) * 50;
          x.beginPath(); x.moveTo(rx0, P[5][1]); x.bezierCurveTo(rx0 + 6, P[5][1] + len * 0.3, rx0 - 6, P[5][1] + len * 0.6, rx0 + 2, P[5][1] + len); x.stroke();
        }
      }
    }

    // hidden rooms stay painted over until their wall is torn open
    for (const cv of (painted && LD.Assets.room(room.id, "secret") ? [] : room.covers || [])) {
      x.fillStyle = pal.solid;
      x.fillRect(cv.x * T - 5, cv.y * T - 5, cv.w * T + 10, cv.h * T + 10);
      Art.hatch(x, cv.x * T, cv.y * T, cv.w * T, cv.h * T, 14, 0.9, pal.hatch, 0.6, 1.4, cv.x);
    }

    // 3) special tiles
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
      const ch = grid[ty][tx], px = tx * T, py = ty * T, seed = tx * 31 + ty * 17;
      if (ch === "=") {
        const left = tx === 0 || grid[ty][tx - 1] !== "=", right = tx === room.w - 1 || grid[ty][tx + 1] !== "=";
        const x0 = px - (left ? 3 : 0), w0 = T + (left ? 3 : 0) + (right ? 3 : 0);
        x.fillStyle = "rgba(0,0,0,0.35)"; x.fillRect(x0, py + 12, w0, 6);
        // two planks per tile with a gap, grain, nails and a lit top
        for (let k = 0; k < 2; k++) {
          const bx2 = k === 0 && left ? px - 3 : px + k * 21, bw = 19 + (k === 0 && left ? 3 : 0) + (k === 1 && right ? 3 : 0);
          const jy = (U.hash(seed + k) - 0.5) * 1.5;
          x.fillStyle = pal.wood; x.fillRect(bx2, py + 1 + jy, bw, 12);
          x.fillStyle = "rgba(255,225,190,0.22)"; x.fillRect(bx2, py + 1 + jy, bw, 2);
          x.strokeStyle = "rgba(0,0,0,0.4)"; x.lineWidth = 0.8; x.beginPath(); x.moveTo(bx2 + 2, py + 7 + jy); x.lineTo(bx2 + bw - 3, py + 6.5 + jy); x.stroke();
          x.fillStyle = "rgba(0,0,0,0.6)"; x.fillRect(bx2 + 2, py + 4 + jy, 1.6, 1.6); x.fillRect(bx2 + bw - 4, py + 4 + jy, 1.6, 1.6);
        }
        x.fillStyle = Art.INK;
        Art.brush(x, [x0, py + 1, px + T / 2, py + (U.hash(seed) - 0.5) * 1.5, x0 + w0, py + 1], 2.6, { seed, taperStart: left ? 0.2 : 0, taperEnd: right ? 0.2 : 0 });
        Art.brush(x, [px, py + 13, px + T, py + 13], 2, { seed: seed + 1, taperStart: 0, taperEnd: 0 });
        x.fillStyle = pal.rim; x.globalAlpha = 0.5; x.fillRect(px, py + 3, T, 1.5); x.globalAlpha = 1;
        if (left || right) {
          // support bracket + rope lashing at each end
          const bx = left ? px + 6 : px + T - 6;
          x.fillStyle = pal.wood; Art.brush(x, [bx, py + 12, bx + (left ? 12 : -12), py + 34], 5, { seed: seed + 2, taperStart: 0, taperEnd: 0 });
          x.fillStyle = Art.INK; Art.brush(x, [bx, py + 12, bx + (left ? 12 : -12), py + 34], 1.6, { seed: seed + 3 });
          x.strokeStyle = "rgba(200,170,120,0.8)"; x.lineWidth = 1.2;
          for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(bx - 3, py + 2 + k * 3); x.lineTo(bx + 3, py + 4 + k * 3); x.stroke(); }
        }
      } else if (ch === "^") {
        const fire = room.theme === "ash" || room.theme === "archive";
        for (let k = 0; k < 4; k++) {
          const sx = px + 4 + k * 10, h = 16 + U.hash(seed + k) * 14;
          x.fillStyle = Art.INK;
          x.beginPath(); x.moveTo(sx - 5, py + T); x.lineTo(sx + (U.hash(seed + k * 2) - 0.5) * 6, py + T - h); x.lineTo(sx + 5, py + T); x.fill();
          if (fire) { x.fillStyle = Art.FIRE; x.globalAlpha = 0.8; x.beginPath(); x.moveTo(sx - 2, py + T - h * 0.55); x.lineTo(sx, py + T - h); x.lineTo(sx + 2, py + T - h * 0.55); x.fill(); x.globalAlpha = 1; }
          else { x.fillStyle = "#e9dcc0"; x.fillRect(sx - 0.6, py + T - h + 3, 1.2, h * 0.4); }
        }
      } else if (ch === "~") {
        x.fillStyle = "#0e0a09"; x.fillRect(px, py + 8, T, T - 8);
      } else if ((ch === "B" || ch === "H" || ch === "D") && LD.TileArt && LD.TileArt[ch]) {
        LD.TileArt[ch](x, px, py, pal, grid, tx, ty);
      } else if (ch === "B") {
        // breakable: a thinner, cracked paper wall patched with scraps (a subtle tell)
        x.fillStyle = pal.solid; x.fillRect(px, py, T, T);
        x.fillStyle = "rgba(236,225,201,0.13)"; x.fillRect(px + 3, py + 3, T - 6, T - 6);
        x.strokeStyle = "rgba(236,225,201,0.35)"; x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(px + 8, py + 4); x.lineTo(px + 18, py + 18); x.lineTo(px + 12, py + 30); x.moveTo(px + 18, py + 18); x.lineTo(px + 32, py + 22); x.stroke();
        x.strokeStyle = Art.INK; x.lineWidth = 2.5; x.strokeRect(px + 1, py + 1, T - 2, T - 2);
      } else if (ch === "H") {
        x.fillStyle = "#15120f"; x.fillRect(px, py, T, T);
        x.fillStyle = "#4d4a45";
        for (let k = 0; k < 4; k++) x.fillRect(px + 4 + k * 10, py, 4, T);
        x.fillRect(px, py + 4, T, 4); x.fillRect(px, py + T - 8, T, 4);
        x.fillStyle = "rgba(170,110,60,0.5)"; x.fillRect(px + 6, py + 12, 3, 6); x.fillRect(px + 26, py + 22, 3, 9);
      } else if (ch === "D") {
        x.fillStyle = "#3a2618"; x.fillRect(px + 2, py, T - 4, T);
        x.strokeStyle = Art.INK; x.lineWidth = 2.5; x.strokeRect(px + 2, py, T - 4, T);
        x.strokeStyle = "rgba(0,0,0,0.45)"; x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(px + 14, py); x.lineTo(px + 14, py + T); x.moveTo(px + 26, py); x.lineTo(px + 26, py + T); x.stroke();
        if (ty > 0 && grid[ty - 1][tx] !== "D") { x.fillStyle = "#6b5a44"; x.fillRect(px + 4, py + 8, T - 8, 6); }
      }
    }
    return c;
  }

  // ---------------------------------------------------------------- props (baked)
  function drawProp(x, p, room, S, r, live) {
    const px = p.x * T, py = p.y * T;
    x.save();
    // detailed prop painters (js/systems/prop-art.js) take precedence
    if (LD.PropArt && LD.PropArt[p.type]) { LD.PropArt[p.type](x, px, py, p, room, S); x.restore(); return; }
    switch (p.type) {
      case "lamp": {
        // ornate iron lamp post: stepped plinth, twisted shaft, scroll arm, caged lantern
        x.fillStyle = "#1a1416"; x.strokeStyle = Art.INK; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(px - 10, py); x.lineTo(px - 7, py - 10); x.lineTo(px + 7, py - 10); x.lineTo(px + 10, py); x.closePath(); x.fill(); x.stroke();
        x.fillRect(px - 5, py - 16, 10, 7);
        x.fillStyle = Art.INK;
        Art.brush(x, [px - 1.5, py - 14, px - 0.5, py - 55, px - 1.5, py - 98], 4.5, { seed: px, taperStart: 0, taperEnd: 0.1 });
        x.strokeStyle = "rgba(90,80,90,0.5)"; x.lineWidth = 1;
        x.beginPath(); for (let k = 0; k < 9; k++) { x.moveTo(px - 3, py - 20 - k * 9); x.lineTo(px + 2, py - 24 - k * 9); } x.stroke();
        x.fillRect(px - 5, py - 60, 10, 4);
        // scroll arm
        x.strokeStyle = Art.INK; x.lineWidth = 3;
        x.beginPath(); x.moveTo(px - 1, py - 96); x.bezierCurveTo(px + 8, py - 108, px + 20, py - 104, px + 22, py - 96); x.stroke();
        x.lineWidth = 1.6; x.beginPath(); x.arc(px + 6, py - 99, 3.5, 0, Math.PI * 1.6); x.stroke();
        // lantern cage with a pointed cap
        const gl = p.unlit ? "rgba(205,205,195,0.45)" : "rgba(255,206,130,0.95)";
        x.fillStyle = gl;
        x.beginPath(); x.moveTo(px + 14, py - 90); x.lineTo(px + 30, py - 90); x.lineTo(px + 27, py - 72); x.lineTo(px + 17, py - 72); x.closePath(); x.fill();
        if (!p.unlit) { x.fillStyle = "rgba(255,245,210,0.95)"; x.fillRect(px + 20, py - 86, 4, 9); }
        x.strokeStyle = Art.INK; x.lineWidth = 2; x.stroke();
        x.lineWidth = 1.2; x.beginPath(); x.moveTo(px + 22, py - 90); x.lineTo(px + 22, py - 72); x.stroke();
        x.fillStyle = Art.INK;
        x.beginPath(); x.moveTo(px + 12, py - 90); x.lineTo(px + 22, py - 100); x.lineTo(px + 32, py - 90); x.closePath(); x.fill();
        x.fillRect(px + 16, py - 72, 12, 3); x.beginPath(); x.arc(px + 22, py - 101, 1.8, 0, 7); x.fill();
        break;
      }
      case "tree": {
        LD.BG.tree(x, px, py + 2, 230 * (p.s || 1), !!p.faded, U.strSeed(room.id + p.x));
        break;
      }
      case "silhouette": {
        // an erased townsperson: paper-blank body with a dashed, broken outline
        const h = [92, 78, 100][p.v || 0];
        x.fillStyle = "rgba(236,225,201,0.55)";
        x.beginPath();
        x.ellipse(px, py - h + 12, 11, 13, 0, 0, Math.PI * 2);
        x.moveTo(px - 16, py); x.lineTo(px - 12, py - h + 34); x.quadraticCurveTo(px, py - h + 22, px + 12, py - h + 34); x.lineTo(px + 18, py);
        x.fill();
        x.setLineDash([6, 5]); x.strokeStyle = "rgba(21,16,13,0.6)"; x.lineWidth = 1.6; x.stroke(); x.setLineDash([]);
        x.fillStyle = "rgba(21,16,13,0.25)";
        Art.brush(x, [px - 20, py - h * 0.5, px + 22, py - h * 0.55], 3, { seed: px });
        break;
      }
      case "sign": {
        x.fillStyle = Art.INK;
        Art.brush(x, [px, py, px, py - 70], 5, { seed: 1, taperStart: 0, taperEnd: 0 });
        x.fillStyle = "#5b4630"; x.fillRect(px - 60, py - 76, 120, 26);
        x.strokeStyle = Art.INK; x.lineWidth = 2.5; x.strokeRect(px - 60, py - 76, 120, 26);
        Art.text(x, p.text, px, py - 57, 19, { align: "center", color: "#efe2c6" });
        break;
      }
      case "banner": {
        const rr = U.rng(U.strSeed(room.id + p.x + p.y));
        x.fillStyle = Art.INK; x.fillRect(px - 26, py - 2, 52, 4);
        LD.BG_banner(x, px - 16, py + 2, 32, p.hang ? 90 : 110, room.theme === "gardens" ? "#9c6a64" : "#7a231e", rr);
        break;
      }
      case "fountain": {
        // two-tier stone fountain with carved rims and a leaping stone fish
        const stone = x.createLinearGradient(0, py - 130, 0, py);
        stone.addColorStop(0, "#6d6168"); stone.addColorStop(1, "#322a2f");
        x.fillStyle = stone; x.strokeStyle = Art.INK; x.lineWidth = 2.5;
        x.beginPath(); x.moveTo(px - 66, py); x.lineTo(px - 60, py - 26); x.quadraticCurveTo(px, py - 34, px + 60, py - 26); x.lineTo(px + 66, py); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(px, py - 27, 60, 8, 0, 0, Math.PI * 2); x.fillStyle = p.flowing ? "#3f7fc0" : "#241c20"; x.fill(); x.stroke();
        x.strokeStyle = "rgba(255,230,210,0.2)"; x.lineWidth = 1.5;
        x.beginPath(); for (let k = -3; k <= 3; k++) { x.moveTo(px + k * 16, py - 20); x.lineTo(px + k * 17, py - 4); } x.stroke();
        x.fillStyle = stone; x.strokeStyle = Art.INK; x.lineWidth = 2.5;
        x.beginPath(); x.moveTo(px - 9, py - 27); x.lineTo(px - 6, py - 84); x.lineTo(px + 6, py - 84); x.lineTo(px + 9, py - 27); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(px - 32, py - 84); x.quadraticCurveTo(px, py - 70, px + 32, py - 84); x.lineTo(px + 28, py - 92); x.lineTo(px - 28, py - 92); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(px, py - 92, 28, 5, 0, 0, Math.PI * 2); x.fillStyle = p.flowing ? "#4f8fd0" : "#241c20"; x.fill(); x.stroke();
        // fish
        x.fillStyle = "#57494f";
        x.beginPath(); x.moveTo(px - 4, py - 94); x.quadraticCurveTo(px - 16, py - 112, px - 2, py - 126); x.quadraticCurveTo(px + 12, py - 116, px + 3, py - 94); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(px - 2, py - 126); x.lineTo(px - 10, py - 136); x.lineTo(px + 6, py - 134); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = Art.INK; x.beginPath(); x.arc(px - 1, py - 116, 1.6, 0, 7); x.fill();
        x.strokeStyle = "rgba(0,0,0,0.4)"; x.lineWidth = 1; x.beginPath(); for (let k = 0; k < 3; k++) { x.arc(px - 2, py - 108 + k * 5, 4, 0.2, 2.8); } x.stroke();
        if (!p.flowing) Art.text(x, "dry", px + 40, py - 6, 15, { align: "center", color: "rgba(236,225,201,0.45)" });
        break;
      }
      case "wheel": {
        x.fillStyle = Art.INK;
        Art.brush(x, [px - 70, py, px - 20, py - 140], 8, { seed: 3, taperStart: 0, taperEnd: 0 });
        Art.brush(x, [px + 70, py, px + 20, py - 140], 8, { seed: 4, taperStart: 0, taperEnd: 0 });
        // dry chute feeding the wheel
        x.fillStyle = "#3a302a"; x.fillRect(px - 150, py - 250, 120, 14);
        x.strokeStyle = Art.INK; x.lineWidth = 2; x.strokeRect(px - 150, py - 250, 120, 14);
        break;
      }
      case "crate": {
        x.fillStyle = "#4a3828"; x.fillRect(px, py, 80, 40);
        x.strokeStyle = Art.INK; x.lineWidth = 2.5; x.strokeRect(px, py, 80, 40);
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + 40, py + 40); x.moveTo(px + 40, py); x.lineTo(px + 80, py + 40); x.stroke();
        break;
      }
      case "pages": {
        const rr = U.rng(U.strSeed(room.id + p.x));
        for (let i = 0; i < 7; i++) {
          x.save(); x.translate(px + (rr() - 0.5) * 90, py - 2); x.rotate((rr() - 0.5) * 0.8);
          x.fillStyle = p.burnt ? U.pick(["#6a5446", "#3a2a22", "#8a6a50"], rr) : "#e6d9bc";
          x.fillRect(-12, -5, 24, 7);
          x.strokeStyle = "rgba(20,14,10,0.6)"; x.lineWidth = 1; x.strokeRect(-12, -5, 24, 7);
          if (p.burnt) { x.fillStyle = "#1a100b"; x.fillRect(6, -5, 6, 7); }
          x.restore();
        }
        break;
      }
      case "bindery": {
        // the Bindery's street front: a crooked tall house with a sign
        const w = 200, h = 300;
        x.fillStyle = "#3c2c26"; x.strokeStyle = Art.INK; x.lineWidth = 3;
        x.beginPath(); x.moveTo(px - w / 2, py); x.lineTo(px - w / 2 + 6, py - h); x.lineTo(px, py - h - 90); x.lineTo(px + w / 2 + 4, py - h + 6); x.lineTo(px + w / 2, py); x.closePath();
        x.fill(); x.stroke();
        x.fillStyle = "#1a120e";
        x.beginPath(); x.moveTo(px - 26, py); x.lineTo(px - 26, py - 70); x.quadraticCurveTo(px, py - 100, px + 26, py - 70); x.lineTo(px + 26, py); x.fill();
        x.fillStyle = "rgba(255,190,110,0.5)";
        for (const wx of [-60, 50]) { x.fillRect(px + wx, py - 200, 22, 34); x.strokeRect(px + wx, py - 200, 22, 34); }
        x.fillStyle = "#6b5236"; x.fillRect(px - 70, py - 150, 140, 30); x.strokeRect(px - 70, py - 150, 140, 30);
        Art.text(x, "THE BINDERY", px, py - 128, 20, { align: "center", color: "#f0e2c4", font: "title" });
        break;
      }
      case "press": {
        x.fillStyle = "#3d2b1f"; x.strokeStyle = Art.INK; x.lineWidth = 3;
        x.fillRect(px - 40, py - 20, 80, 20); x.strokeRect(px - 40, py - 20, 80, 20);
        x.fillRect(px - 34, py - 110, 10, 90); x.fillRect(px + 24, py - 110, 10, 90);
        x.strokeRect(px - 34, py - 110, 10, 90); x.strokeRect(px + 24, py - 110, 10, 90);
        x.fillRect(px - 40, py - 118, 80, 12); x.strokeRect(px - 40, py - 118, 80, 12);
        x.fillStyle = Art.INK; x.fillRect(px - 2, py - 106, 4, 60);
        Art.brush(x, [px - 30, py - 124, px + 30, py - 130], 4, { seed: 9 });
        break;
      }
      case "jars": {
        for (let i = 0; i < 4; i++) {
          const jx = px - 24 + i * 16, jh = 16 + (i % 2) * 8;
          x.fillStyle = i === 2 && S.flags.pigment_water ? "#3f7fc0" : "#1b1512";
          x.beginPath(); x.moveTo(jx - 6, py); x.lineTo(jx - 7, py - jh); x.lineTo(jx + 7, py - jh); x.lineTo(jx + 6, py); x.fill();
          x.strokeStyle = "#cfbf9f"; x.lineWidth = 1; x.stroke();
          x.fillStyle = "#6b5236"; x.fillRect(jx - 5, py - jh - 4, 10, 4);
        }
        break;
      }
      case "candle": {
        x.fillStyle = "#e8dcc0"; x.fillRect(px - 3, py - 16, 6, 16);
        x.strokeStyle = Art.INK; x.lineWidth = 1.5; x.strokeRect(px - 3, py - 16, 6, 16);
        break;
      }
      case "easel": {
        x.fillStyle = Art.INK;
        Art.brush(x, [px - 24, py, px, py - 90], 4, { seed: 1 }); Art.brush(x, [px + 24, py, px, py - 90], 4, { seed: 2 });
        x.fillStyle = "#e9dcc0"; x.fillRect(px - 28, py - 80, 56, 44);
        x.strokeStyle = Art.INK; x.lineWidth = 2; x.strokeRect(px - 28, py - 80, 56, 44);
        Art.wash(x, px - 6, py - 60, 16, 12, "#a3322a", 0.6, 3); Art.wash(x, px + 10, py - 54, 12, 10, "#a3322a", 0.5, 4);
        break;
      }
      case "bench": {
        x.fillStyle = "#3b2d24"; x.strokeStyle = Art.INK; x.lineWidth = 2.5;
        x.fillRect(px - 40, py - 22, 80, 7); x.strokeRect(px - 40, py - 22, 80, 7);
        x.fillRect(px - 36, py - 15, 5, 15); x.fillRect(px + 31, py - 15, 5, 15);
        x.fillRect(px - 40, py - 44, 80, 5); x.strokeRect(px - 40, py - 44, 80, 5);
        break;
      }
      case "chain": {
        x.strokeStyle = Art.INK; x.lineWidth = 2;
        for (let i = 0; i < (p.len || 6) * 4; i++) { x.beginPath(); x.ellipse(px, py + 8 + i * 10, i % 2 ? 2 : 4, 5, 0, 0, Math.PI * 2); x.stroke(); }
        break;
      }
      case "pipe": {
        x.fillStyle = "#2a2f36"; x.strokeStyle = Art.INK; x.lineWidth = 2.5;
        x.fillRect(px - 10, py + T * 2 - 4, 20, 70); x.strokeRect(px - 10, py + T * 2 - 4, 20, 70);
        x.fillRect(px - 14, py + T * 2 + 60, 28, 10); x.strokeRect(px - 14, py + T * 2 + 60, 28, 10);
        break;
      }
      case "basin": {
        x.fillStyle = "#394452"; x.strokeStyle = Art.INK; x.lineWidth = 3;
        x.beginPath(); x.moveTo(px - 90, py); x.lineTo(px - 80, py - 40); x.lineTo(px + 80, py - 40); x.lineTo(px + 90, py); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(px, py - 40, 80, 10, 0, 0, Math.PI * 2); x.fillStyle = p.full ? "#3f7fc0" : "#20262e"; x.fill(); x.stroke();
        break;
      }
      case "grate": {
        const w = p.wide ? 120 : 80;
        if (p.open) break;
        x.fillStyle = "rgba(10,8,7,0.85)"; x.fillRect(px - w / 2 + (p.wide ? 20 : 0), py - 2, w - (p.wide ? 0 : 0), 8);
        x.fillStyle = "#5c5750";
        for (let i = 0; i < 6; i++) x.fillRect(px - w / 2 + (p.wide ? 20 : 0) + 6 + i * (w - 12) / 6, py - 3, 4, 9);
        break;
      }
      case "tornEdge": {
        // the page edge: jagged paper tearing into the void
        x.fillStyle = "#e6dac1";
        const h = p.big ? 260 : 120;
        x.beginPath(); x.moveTo(px + 6, py - 4);
        for (let i = 0; i <= 12; i++) x.lineTo(px - 8 + (i % 2) * 12 + U.hash(i + px) * 6, py + (i / 12) * h);
        x.lineTo(px + 20, py + h); x.closePath(); x.fill();
        x.strokeStyle = Art.INK; x.lineWidth = 2; x.stroke();
        break;
      }
    }
    x.restore();
  }
  // expose a couple of BG helpers for props
  LD.BG_tree = (x, px, py, h, trunk, leaf, r, a) => {
    // same recipe as background trees but with ink trunk
    const branches = [];
    const grow = (x0, y0, ang, len, w, depth) => {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      x.fillStyle = trunk;
      Art.brush(x, [x0, y0, (x0 + x1) / 2 + (r() - 0.5) * 6, (y0 + y1) / 2, x1, y1], w, { seed: r() * 99, taperStart: 0, taperEnd: 0.6 });
      if (depth <= 0 || len < 8) { branches.push([x1, y1]); return; }
      const n = 2 + (r() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) grow(x1, y1, ang + (r() - 0.5) * 1.3, len * (0.64 + r() * 0.15), w * 0.62, depth - 1);
    };
    grow(px, py, -Math.PI / 2 + (r() - 0.5) * 0.2, h * 0.36, h * 0.075, 4);
    for (const [bx, by] of branches) if (r() < 0.8) Art.wash(x, bx + (r() - 0.5) * 16, by + (r() - 0.5) * 10, h * (0.07 + r() * 0.08), h * (0.05 + r() * 0.06), leaf, a, r() * 999, 2);
  };
  LD.BG_banner = (x, px, py, w, h, col, r) => {
    x.fillStyle = col;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + w, py);
    const n = 4;
    for (let i = n; i >= 0; i--) x.lineTo(px + (w * i) / n, py + h * (0.75 + r() * 0.3) - (i % 2 ? h * 0.12 : 0));
    x.closePath(); x.fill();
    x.strokeStyle = "rgba(0,0,0,0.5)"; x.lineWidth = 1.5; x.stroke();
  };

  // ---------------------------------------------------------------- live features
  W.drawLiveBack = (ctx, S, t) => {
    const room = W.room;
    for (const p of room.props) {
      const px = p.x * T, py = p.y * T;
      if (p.type === "wheel" && !W.painted && LD.PropArt && LD.PropArt.wheelLive) {
        LD.PropArt.wheelLive(ctx, px, py, p, t);
      } else if (p.type === "wheel" && !W.painted) {
        const a = p.turning ? t * 0.8 : 0.2;
        ctx.save(); ctx.translate(px, py - 140);
        ctx.strokeStyle = Art.INK; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(0, 0, 118, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const aa = a + (i / 12) * Math.PI * 2;
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(aa) * 118, Math.sin(aa) * 118); ctx.stroke();
          ctx.fillStyle = "#3a2d24";
          ctx.save(); ctx.rotate(aa); ctx.fillRect(104, -10, 26, 20); ctx.strokeRect(104, -10, 26, 20); ctx.restore();
        }
        ctx.fillStyle = Art.INK; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (p.turning) {
          // water pouring from the chute
          ctx.save();
          ctx.globalAlpha = 0.75;
          const g = ctx.createLinearGradient(0, py - 250, 0, py - 20);
          g.addColorStop(0, "rgba(90,150,210,0.9)"); g.addColorStop(1, "rgba(90,150,210,0.2)");
          ctx.fillStyle = g;
          for (let k = 0; k < 3; k++) {
            const wx = px - 36 + k * 6 + Math.sin(t * 7 + k) * 2;
            ctx.fillRect(wx, py - 238, 5, 200);
          }
          ctx.restore();
        }
      } else if (p.type === "fountain" && p.flowing) {
        ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle = "#5a9ad6"; ctx.lineWidth = 3;
        for (let k = -1; k <= 1; k += 2) {
          ctx.beginPath(); ctx.moveTo(px + k * 6, py - 112);
          ctx.quadraticCurveTo(px + k * 34, py - 140 + Math.sin(t * 5) * 3, px + k * 50, py - 34); ctx.stroke();
        }
        ctx.fillStyle = "rgba(80,140,200,0.7)"; ctx.fillRect(px - 52, py - 36, 104, 8);
        ctx.restore();
        if (Math.random() < 0.2) LD.Particles.add({ kind: "water", x: px + U.rand(-50, 50), y: py - 34, vy: -U.rand(40, 120), vx: U.rand(-30, 30), color: "#6aa8e0", size: 2, life: 0.5 });
      } else if (p.type === "lightshaft") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createLinearGradient(px, py, px, py + 560);
        const c = S.flags.pigment_water && room.theme !== "archive" ? "rgba(140,190,240," : "rgba(240,210,160,";
        g.addColorStop(0, c + (p.thin ? 0.12 : 0.22) + ")"); g.addColorStop(1, c + "0)");
        ctx.fillStyle = g;
        const w = p.thin ? 30 : 110;
        ctx.beginPath(); ctx.moveTo(px - w / 2, py); ctx.lineTo(px + w / 2, py); ctx.lineTo(px + w * 1.1, py + 560); ctx.lineTo(px - w * 0.5, py + 560); ctx.fill();
        ctx.restore();
        if (Math.random() < 0.05) LD.Particles.add({ kind: "dust", x: px + U.rand(-w / 2, w / 2), y: py + U.rand(0, 400), vx: U.rand(-5, 5), vy: U.rand(-5, 5), g: 0, color: "rgba(255,240,210,0.6)", size: 2, life: 3 });
      }
    }
  };

  W.drawLiveFront = (ctx, S, t) => {
    // restored water: a shallow watercolor sheet lying on the canal bed
    for (const p of W.room.props) {
      if (p.type !== "water" || !p.on) continue;
      const wx = p.x * T, wy = p.y * T - 14, ww = p.w * T;
      ctx.save();
      ctx.fillStyle = p.ink ? "rgba(40,70,120,0.6)" : "rgba(70,130,200,0.5)";
      ctx.beginPath(); ctx.moveTo(wx, wy + 18);
      for (let i = 0; i <= 24; i++) ctx.lineTo(wx + (ww * i) / 24, wy + Math.sin(t * 2 + i * 0.8) * 2);
      ctx.lineTo(wx + ww, wy + 18); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(200,230,255,0.75)"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) ctx.lineTo(wx + (ww * i) / 24, wy + Math.sin(t * 2 + i * 0.8) * 2);
      ctx.stroke();
      ctx.restore();
    }
    // ink pools: glossy animated surface
    for (let ty = 0; ty < W.h; ty++) for (let tx = 0; tx < W.w; tx++) {
      const ch = W.grid[ty][tx];
      if (ch === "~" && (ty === 0 || W.grid[ty - 1][tx] !== "~")) {
        const px = tx * T, py = ty * T + 8;
        ctx.fillStyle = "#0e0a09";
        ctx.beginPath(); ctx.moveTo(px, py + 6);
        for (let i = 0; i <= 4; i++) ctx.lineTo(px + i * 10, py + Math.sin(t * 2.4 + tx * 1.3 + i) * 2.5);
        ctx.lineTo(px + T, py + 6); ctx.fill();
        ctx.strokeStyle = "rgba(120,140,190,0.35)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px + 6, py + 3 + Math.sin(t * 3 + tx) * 1.5); ctx.lineTo(px + 24, py + 3 + Math.sin(t * 3 + tx + 1) * 1.5); ctx.stroke();
        if (Math.random() < 0.004) LD.Particles.add({ kind: "ink", x: px + U.rand(0, T), y: py, vy: -U.rand(60, 160), color: "#0e0a09", size: 3, life: 0.6 });
      } else if (ch === "V") drawVeil(ctx, tx, ty, t);
      else if (ch === "G") drawGate(ctx, tx, ty);
    }
  };

  function drawVeil(ctx, tx, ty, t) {
    if (LD.TileArt && LD.TileArt.V) return LD.TileArt.V(ctx, tx, ty, t, W);
    const px = tx * T, py = ty * T;
    const fx = W.veilFx.get(tx + "," + ty);
    const open = fx ? U.clamp(1 - (t - fx) / 0.9, 0, 1) : 0;
    const top = ty === 0 || W.grid[ty - 1][tx] !== "V";
    ctx.save();
    const sq = 1 - open * 0.85;
    ctx.translate(px + T / 2, py); ctx.scale(sq, 1); ctx.translate(-(px + T / 2), -py);
    ctx.fillStyle = "rgba(240,232,214,0.78)";
    ctx.fillRect(px + 4, py, T - 8, T);
    // zig-zag creases
    ctx.strokeStyle = "rgba(21,16,13,0.65)"; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) ctx.lineTo(px + 4 + (i % 2) * (T - 8), py + (i / 4) * T);
    ctx.stroke();
    ctx.strokeStyle = "rgba(21,16,13,0.9)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px + 4, py); ctx.lineTo(px + 4, py + T); ctx.moveTo(px + T - 4, py); ctx.lineTo(px + T - 4, py + T); ctx.stroke();
    // shimmering fold glyph (shape cue: a folded corner)
    if (top) {
      const s = 0.6 + Math.sin(t * 3) * 0.15;
      ctx.fillStyle = "rgba(21,16,13," + s + ")";
      ctx.beginPath(); ctx.moveTo(px + 10, py + 10); ctx.lineTo(px + 30, py + 10); ctx.lineTo(px + 10, py + 30); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawGate(ctx, tx, ty) {
    if (LD.TileArt && LD.TileArt.G) return LD.TileArt.G(ctx, tx, ty, W);
    const px = tx * T, py = ty * T;
    ctx.fillStyle = "#1a1512";
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 4 + i * 12, py, 6, T);
    ctx.fillRect(px, py + 16, T, 5);
    if (ty === 0 || W.grid[ty - 1][tx] !== "G") { ctx.fillStyle = "#3a302a"; ctx.fillRect(px - 6, py - 8, T + 12, 10); }
  }

  // Lamp glow & other light sources (drawn with additive blending)
  W.drawLights = (ctx, S, t) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of W.room.props) {
      const px = p.x * T, py = p.y * T;
      if (p.type === "lamp" && !p.unlit) {
        const f = 0.8 + U.noise1(t * 6 + px) * 0.35;
        Art.glow(ctx, px + 22, py - 82, 120 * f, "rgba(255,170,80,0.35)");
        Art.glow(ctx, px + 22, py - 82, 26, "rgba(255,220,160,0.8)");
      } else if (p.type === "lamp" && p.unlit) {
        Art.glow(ctx, px + 22, py - 82, 30, "rgba(220,220,210,0.18)");
      } else if (p.type === "candle") {
        const f = 0.8 + U.noise1(t * 9 + px) * 0.4;
        Art.glow(ctx, px, py - 22, 70 * f * (0.7 + LD.binderyStage(S) * 0.15), "rgba(255,170,80,0.4)");
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#ffd28a"; ctx.beginPath(); ctx.ellipse(px, py - 22 - f * 2, 2.5, 5 * f, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "lighter";
      } else if (p.type === "basin" && p.full) {
        Art.glow(ctx, px, py - 40, 180, "rgba(80,150,230,0.3)");
      }
    }
    ctx.restore();
  };

  // The room's color grade: sets mood per theme.
  // Colour grade: a soft-light gradient (cool shadows above, warm light below) per theme,
  // plus a gentle darkening at the top and bottom of frame — the look of lit concept paintings.
  const GRADES = {
    margin: ["rgba(120,100,80,0.10)", "rgba(250,230,200,0.10)"],
    dusk: ["rgba(70,50,130,0.38)", "rgba(255,150,90,0.30)"],
    gardens: ["rgba(110,60,120,0.32)", "rgba(255,160,110,0.30)"],
    bridge: ["rgba(60,50,130,0.38)", "rgba(255,150,100,0.28)"],
    spire: ["rgba(50,40,120,0.42)", "rgba(240,140,120,0.26)"],
    canal: ["rgba(20,50,100,0.45)", "rgba(80,130,190,0.22)"],
    cistern: ["rgba(20,50,110,0.45)", "rgba(80,150,220,0.25)"],
    bindery: ["rgba(80,40,20,0.35)", "rgba(255,170,90,0.30)"],
    ash: ["rgba(60,20,10,0.40)", "rgba(255,110,50,0.32)"],
    archive: ["rgba(60,15,5,0.45)", "rgba(255,110,40,0.38)"],
    void: ["rgba(200,190,170,0.10)", "rgba(40,30,30,0.18)"],
  };
  W.grade = (ctx, S, t) => {
    const th = W.room.theme, gcol = GRADES[th];
    if (!gcol) return;
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    let top = gcol[0], bot = gcol[1];
    if ((th === "canal" || th === "cistern") && S.flags.pigment_water) bot = "rgba(90,170,255,0.32)";
    const g = ctx.createLinearGradient(0, 0, 0, U.VIEW_H);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
    ctx.restore();
    // letterbox-style shading at the top & bottom of frame
    const g2 = ctx.createLinearGradient(0, 0, 0, U.VIEW_H);
    g2.addColorStop(0, "rgba(10,6,12,0.28)"); g2.addColorStop(0.18, "rgba(10,6,12,0)");
    g2.addColorStop(0.85, "rgba(10,6,12,0)"); g2.addColorStop(1, "rgba(10,6,12,0.35)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, U.VIEW_W, U.VIEW_H);
  };
})();
