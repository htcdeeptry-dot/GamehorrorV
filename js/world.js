/* HUYẾT LỆ THÔN — world.js
   Dựng bản đồ 200m x 200m liền mạch gồm 5 khu, ánh sáng, sấm chớp, va chạm,
   tầm nhìn (LOS) và đồ thị waypoint. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var Geo = H.Geo, Node = H.Node, M = H.M, R = H.R, Md = H.Models, CFG = H.CFG;
  var W = H.World = { boxes: [], circles: [], floors: [], doors: [], lanterns: [], props: {}, runes: [], paving: [] };
  var batches = {}, grid = {}, CELL = 8;

  /* ---------- địa hình ---------- */
  W.terrainH = function (x, z) {
    var A = H.Assets;
    var dv = Math.max(Math.abs(x) - 66, z - 52, -82 - z);
    var dt = Math.max(Math.abs(x) - 10, 50 - z, z - 99);
    var d = Math.max(0, Math.min(dv, dt)), rise = M.smooth(0, 34, d);
    var base = A.noise(x * 0.045, z * 0.045) * 0.22 + A.noise(x * 0.13 + 7, z * 0.13) * 0.07;
    return base * (1 - rise * 0.5) + rise * (1.5 + (A.fbm(x * 0.02 + 3, z * 0.02, 3) * 0.5 + 0.5) * 10);
  };
  W.heightAt = function (x, z) {
    for (var k = 0; k < W.floors.length; k++) { var f = W.floors[k]; if (x > f[0] && x < f[2] && z > f[1] && z < f[3]) { W.groundMat = f[5]; return f[4]; } }
    W.groundMat = 'mud';
    for (k = 0; k < W.paving.length; k++) { var p = W.paving[k]; if (x > p[0] && x < p[2] && z > p[1] && z < p[3]) { W.groundMat = 'stone'; break; } }
    return W.terrainH(x, z);
  };
  W.underRoof = function (x, z) { for (var k = 0; k < R.roofs.length; k++) { var r = R.roofs[k]; if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) return true; } return false; };

  /* ---------- ngữ cảnh dựng hình cho Models ---------- */
  var ctx = W.ctx = {
    doors: W.doors, lanterns: W.lanterns,
    h: W.terrainH,
    add: function (mat, geo) {
      if (!geo.i.length) return;
      var c = geo.centroid(), key = mat + '|' + Math.floor((c[0] + 200) / 40) + '|' + Math.floor((c[2] + 200) / 40);
      (batches[key] || (batches[key] = { mat: mat, geo: new Geo() })).geo.add(geo);
    },
    box: function (x0, z0, x1, z1, o) { var b = { x0: x0, z0: z0, x1: x1, z1: z1, on: true, low: !!(o && o.low) }; W.boxes.push(b); return b; },
    circle: function (x, z, r, o) { var c = { x: x, z: z, r: r, on: true, low: !!(o && o.low) }; W.circles.push(c); return c; },
    floor: function (x0, z0, x1, z1, y, mat) { W.floors.push([x0, z0, x1, z1, y, mat]); },
    roof: function (x0, z0, x1, z1) { R.roofs.push([x0, z0, x1, z1]); },
    light: function (pos, color, radius, intensity) { var l = { pos: pos, color: color.slice(), radius: radius, intensity: intensity, base: intensity, on: true }; R.lights.push(l); return l; },
    node: function (n) { R.nodes.push(n); return n; }
  };
  function textMat(name, lines, o) { R.materials[name] = { alb: R.textTexture(lines, o), nrm: null, uv: 1 }; return name; }
  function rune(lines, x, y, z, ry, w, h, o) {
    var name = textMat('rune' + W.runes.length, lines, o || { size: 64, bold: true, drip: true });
    var n = new Node(R.mesh(Geo.quad([-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0])), { tex: name, unlit: 1.6, tint: [1, 0.25, 0.2, 0], additive: true });
    n.set(x, y, z); n.rot[1] = ry; ctx.node(n);
    W.runes.push({ node: n, pos: [x, y, z], t: 0 });
  }

  /* ---------- các bước dựng (rải qua nhiều frame cho thanh tải) ---------- */
  var P = CFG.POS;
  function buildTerrain() {
    var A = H.Assets, CH = 25, N = 16, cx, cz, i, j;
    var paths = [[0, 96, 0, -54], [0, 30, 21, 30], [0, 22, -27, 22], [0, -14, 32, -14], [0, -6, -30, -6], [0, -44, 18, -44], [0, -45, -24, -45]];
    function pathness(x, z) {
      var best = 99;
      for (var k = 0; k < paths.length; k++) {
        var p = paths[k], dx = p[2] - p[0], dz = p[3] - p[1], t = M.clamp(((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz), 0, 1);
        var d = Math.hypot(x - p[0] - dx * t, z - p[1] - dz * t); if (d < best) best = d;
      }
      return 1 - M.smooth(1.2, 3.2, best + A.noise(x * 0.4, z * 0.4) * 0.8);
    }
    for (cz = -4; cz < 4; cz++) for (cx = -4; cx < 4; cx++) {
      var g = new Geo();
      for (j = 0; j <= N; j++) for (i = 0; i <= N; i++) {
        var x = cx * CH + i / N * CH, z = cz * CH + j / N * CH, y = W.terrainH(x, z);
        var e = 0.8, nx = W.terrainH(x - e, z) - W.terrainH(x + e, z), nz = W.terrainH(x, z - e) - W.terrainH(x, z + e), l = Math.hypot(nx, 2 * e, nz);
        var v = g.v(x, y, z, nx / l, 2 * e / l, nz / l, x, z);
        var pth = pathness(x, z), gr = M.smooth(0.2, 0.7, A.fbm(x * 0.06 + 9, z * 0.06, 3) * 0.5 + 0.5 + (y > 1 ? 0.3 : 0)) * (1 - pth);
        g.c[v * 4] = M.lerp(0.95, 0.62, gr) + pth * 0.5; g.c[v * 4 + 1] = M.lerp(0.95, 0.95, gr) + pth * 0.42; g.c[v * 4 + 2] = M.lerp(0.95, 0.55, gr) + pth * 0.3;
      }
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; g.i.push(a, c, d, a, d, b); }
      ctx.add('mud', g);
    }
  }
  function pave(x0, z0, x1, z1) {
    var nx = Math.max(1, Math.round((x1 - x0) / 1.6)), nz = Math.max(1, Math.round((z1 - z0) / 1.6)), rnd = H.rng(Math.abs(x0 * 31 + z0 * 7) + 3);
    for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
      if (rnd() < 0.08) continue;
      var x = M.lerp(x0, x1, (i + 0.5) / nx), z = M.lerp(z0, z1, (j + 0.5) / nz), g = 0.6 + rnd() * 0.3;
      ctx.add('stone', Geo.box((x1 - x0) / nx - 0.08, 0.5, (z1 - z0) / nz - 0.08).xf(x, W.terrainH(x, z) - 0.19 + rnd() * 0.03, z, (rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.03).boxUV(0.5).color(g, g, g, 0));
    }
    W.paving.push([x0, z0, x1, z1]);
  }
  function buildEntrance() {
    var w = P.wall, k, rnd = H.rng(42);
    Md.wall(ctx, w.x0, w.z1, -3.5, w.z1); Md.wall(ctx, 3.5, w.z1, w.x1, w.z1);
    Md.wall(ctx, w.x0, w.z0, w.x1, w.z0); Md.wall(ctx, w.x0, w.z0, w.x0, w.z1); Md.wall(ctx, w.x1, w.z0, w.x1, w.z1);
    textMat('sign', ['LÀNG ÂM LINH'], { w: 512, h: 128, size: 60, bold: true, color: '#b08a3a', glow: 'rgba(0,0,0,0.9)', bg: 'rgba(22,10,6,0.96)' });
    W.props.gate = Md.gate(ctx, P.gate[0], P.gate[1]);
    // hàng rào tre vô hình hai bên lối mòn
    ctx.box(-9.4, 50.6, -8.7, 98.5); ctx.box(8.7, 50.6, 9.4, 98.5); ctx.box(-9.4, 97.6, 9.4, 98.5);
    // bia trấn yểm
    var my = Md.stele(ctx, P.monument[0], P.monument[1], -Math.PI / 2, 1.0, 2.0);
    textMat('mon', ['GIÁP TUẤT', 'HUYẾT NGUYỆT', '1874 · 1934 · ▓▓▓▓'], { w: 512, h: 512, size: 54, bold: true, color: '#7a1410', glow: 'rgba(0,0,0,0.7)' });
    var mp = new Node(R.mesh(Geo.quad([-0.42, 0, 0], [0.42, 0, 0], [0.42, 1.4, 0], [-0.42, 1.4, 0])), { tex: 'mon', unlit: 0.55, tint: [1, 1, 1, 1], blend: true });
    mp.set(P.monument[0] - 0.115, my + 0.75, P.monument[1]); mp.rot[1] = -Math.PI / 2; ctx.node(mp);
    Md.lanternPost(ctx, 7.4, 60.5, Math.PI);
    // đá dọc lối mòn
    for (k = 0; k < 26; k++) { var side = rnd() < 0.5 ? -1 : 1; Md.rock(ctx, side * (5.5 + rnd() * 2.8), 53 + rnd() * 43, 0.3 + rnd() * 0.9, k * 3.1); }
    Md.rock(ctx, P.cameraItem[0], P.cameraItem[1], 0.75, 5.5);
    Md.lanternPost(ctx, -6.5, 86, 0); Md.lanternPost(ctx, 6.5, 70, Math.PI);
    rune(['NĂM NAY', '1994'], 7.5, W.terrainH(7.5, 50) + 1.7, 50.42, 0, 2.6, 1.3);
  }
  function partition(b, lx, z0, z1) {
    var F = b.F, g = Geo.box(0.1, b.h - 0.2, z1 - z0).xf(lx, b.P + (b.h - 0.2) / 2, (z0 + z1) / 2).boxUV(0.5);
    F.put(ctx, 'wood', g); var r = F.rect(lx - 0.15, z0, lx + 0.15, z1); ctx.box(r[0], r[1], r[2], r[3]);
  }
  function buildHouses() {
    var a = P.houseA, b, p, fy, k;
    // --- Nhà cổ (nhà thầy lang): tay quay
    b = W.props.houseA = Md.building(ctx, { x: a.x, z: a.z, w: a.w, d: a.d, q: a.q, y: W.terrainH(a.x, a.z) + 0.15, door: true });
    fy = b.floorY + 0.06;
    p = b.F.pt(0, -a.d / 2 + 0.75); b.altar = Md.altarTable(ctx, p[0], fy, p[1], a.q);
    p = b.F.pt(-3.2, -1.6); Md.bed(ctx, p[0], fy, p[1], a.q + 1);
    p = b.F.pt(4.0, -2.0); b.wardrobe = Md.wardrobe(ctx, p[0], fy, p[1], (a.q + 3) % 4);
    p = b.F.pt(2.6, 1.6); Md.stool(ctx, p[0], fy, p[1]); p = b.F.pt(3.3, 1.9); Md.stool(ctx, p[0], fy, p[1]);
    p = b.F.pt(-5.6, 3.2); Md.jar(ctx, p[0], p[1], 1.2); p = b.F.pt(-6.4, 2.4); Md.jar(ctx, p[0], p[1], 0.9);
    // --- Nhà Lý trưởng
    a = P.manor;
    b = W.props.manor = Md.building(ctx, { x: a.x, z: a.z, w: a.w, d: a.d, q: a.q, y: W.terrainH(a.x, a.z) + 0.2, door: true, porch: true, h: 3.7, roofH: 4.6, lift: 1.2, finial: true, pr: 0.2 });
    fy = b.floorY + 0.06;
    partition(b, -3.2, -a.d / 2, -0.95); partition(b, -3.2, 0.95, a.d / 2); partition(b, 3.2, -a.d / 2, -0.95); partition(b, 3.2, 0.95, a.d / 2);
    p = b.F.pt(-0.6, -a.d / 2 + 0.75); b.altar = Md.altarTable(ctx, p[0], fy, p[1], a.q, true);
    p = b.F.pt(2.35, -a.d / 2 + 0.62); b.safe = Md.safe(ctx, p[0], fy, p[1], a.q);
    p = b.F.pt(-7.5, -3.2); b.wardrobe = Md.wardrobe(ctx, p[0], fy, p[1], (a.q + 1) % 4);
    p = b.F.pt(-5.6, 3.6); Md.bed(ctx, p[0], fy, p[1], a.q);
    p = b.F.pt(7.5, 3.0); b.wardrobe2 = Md.wardrobe(ctx, p[0], fy, p[1], (a.q + 3) % 4);
    p = b.F.pt(5.6, -3.9); Md.bed(ctx, p[0], fy, p[1], a.q);
    for (k = 0; k < 4; k++) { p = b.F.pt(-1.4 + (k % 2) * 2.8, 1.4 + (k > 1 ? 1.5 : 0)); Md.stool(ctx, p[0], fy, p[1]); }
    b.scenes = [b.F.pt(0, 0.4), b.F.pt(-5.6, -0.4), b.F.pt(5.6, 0.2)];
    p = b.F.pt(3.08, -3.4); rune(['TRÓI → THIÊU → DÌM'], p[0], fy + 1.9, p[1], b.F.a - Math.PI / 2, 2.4, 0.6, { size: 44, bold: true, drip: true });
    p = b.F.pt(-9.4, 6.4); Md.jar(ctx, p[0], p[1], 1.3); p = b.F.pt(9.2, 6.6); Md.jar(ctx, p[0], p[1], 1.1);
    // --- Nhà hoang (phòng của Lệ)
    a = P.houseB;
    b = W.props.houseB = Md.building(ctx, { x: a.x, z: a.z, w: a.w, d: a.d, q: a.q, y: W.terrainH(a.x, a.z) + 0.15, door: true });
    fy = b.floorY + 0.06;
    p = b.F.pt(-2.7, -1.9); Md.bed(ctx, p[0], fy, p[1], a.q); b.bed = [p[0], fy + 0.6, p[1]];
    p = b.F.pt(3.5, -1.2); b.wardrobe = Md.wardrobe(ctx, p[0], fy, p[1], (a.q + 3) % 4);
    p = b.F.pt(0.5, -a.d / 2 + 0.75); b.altar = Md.altarTable(ctx, p[0], fy, p[1], a.q);
    p = b.F.pt(-3.86, 0.5); rune(['TA CÓ TÊN'], p[0], fy + 1.8, p[1], b.F.a + Math.PI / 2, 2.2, 0.7);
    // --- Nhà phía đông bắc
    a = P.houseC;
    b = W.props.houseC = Md.building(ctx, { x: a.x, z: a.z, w: a.w, d: a.d, q: a.q, y: W.terrainH(a.x, a.z) + 0.15, door: true });
    fy = b.floorY + 0.06;
    p = b.F.pt(0, -a.d / 2 + 0.75); b.altar = Md.altarTable(ctx, p[0], fy, p[1], a.q);
    p = b.F.pt(3.5, 1.2); b.wardrobe = Md.wardrobe(ctx, p[0], fy, p[1], (a.q + 3) % 4);
    p = b.F.pt(-2.6, 1.5); Md.stool(ctx, p[0], fy, p[1]);
  }
  function buildCourtyard() {
    var k, rnd = H.rng(11);
    W.props.well = Md.well(ctx, P.well[0], P.well[1]);
    pave(P.well[0] - 4, P.well[1] - 4, P.well[0] + 4, P.well[1] + 4);
    rune(['ĐỪNG QUAY'], P.well[0], W.terrainH(P.well[0], P.well[1]) + 0.5, P.well[1] + 1.54, 0, 1.5, 0.5, { size: 60, bold: true, drip: true });
    Md.tree(ctx, P.banyan[0], P.banyan[1], { seed: 1874, scale: 1.55, levels: 3, banyan: true, leaves: true, leafN: 56, trunk: 5.2, rad: 0.95 });
    // miếu nhỏ dưới gốc đa
    var sx = P.banyan[0] + 2.6, sz = P.banyan[1] + 1.2, sy = W.terrainH(sx, sz);
    ctx.add('stone', Geo.lathe([[0.5, -0.3], [0.5, 0.5], [0.42, 0.58], [0.3, 0.6], [0.3, 1.0], [0.4, 1.05], [0.0, 1.05]], 4, 0.6).xf(sx, sy, sz, 0, 0.78, 0));
    ctx.add('roof', Md.roofGeo(1.5, 1.2, 0.45, 0.3).xf(sx, sy + 1.05, sz));
    ctx.circle(sx, sz, 0.55, { low: true });
    Md.lantern(ctx, sx, sy + 1.02, sz + 0.62);
    var posts = [[3, 40, Math.PI], [-3, 24, 0], [3, 8, Math.PI], [-3, -10, 0], [3, -28, Math.PI], [-3, -44, 0], [-16, 19, Math.PI / 2], [20, -11, -Math.PI / 2], [-18, -42, Math.PI / 2], [-14, -3, -Math.PI / 2], [12, 27, Math.PI / 2], [14, -41, Math.PI / 2]];
    for (k = 0; k < posts.length; k++) Md.lanternPost(ctx, posts[k][0], posts[k][1], posts[k][2]);
    for (k = 0; k < 16; k++) Md.jar(ctx, (rnd() - 0.5) * 100, -70 + rnd() * 110, 0.8 + rnd() * 0.6);
    for (k = 0; k < 30; k++) Md.rock(ctx, (rnd() - 0.5) * 120, -78 + rnd() * 124, 0.25 + rnd() * 0.7, k * 1.7);
    // vài cây khô trong làng
    var tr = [[-48, 30, 3], [48, 34, 5], [50, -30, 8], [-14, -24, 13], [12, 46, 2], [-52, 8, 21], [30, 8, 17]];
    for (k = 0; k < tr.length; k++) Md.tree(ctx, tr[k][0], tr[k][1], { seed: tr[k][2] * 7 + 1, scale: 1.0 + (k % 3) * 0.2, levels: 3, leaves: k % 2 === 0, leafN: 30, trunk: 4.4, rad: 0.38 });
  }
  function buildGraveyard() {
    var g = P.grave, rnd = H.rng(1934), k, n = 0, guard = 0, of = P.offerings;
    function fence(x0, z0, x1, z1) {
      var len = Math.hypot(x1 - x0, z1 - z0), m = Math.max(1, Math.round(len / 6)), ax = Math.abs(x1 - x0) > 0.1;
      for (var q = 0; q < m; q++) {
        var cx = M.lerp(x0, x1, (q + 0.5) / m), cz = M.lerp(z0, z1, (q + 0.5) / m);
        ctx.add('stone', Geo.box(ax ? len / m : 0.5, 1.9, ax ? 0.5 : len / m).xf(cx, W.terrainH(cx, cz) + 0.15, cz, 0, 0, (rnd() - 0.5) * 0.04).boxUV(0.5).color(0.7, 0.72, 0.68, 0));
      }
      ctx.box(Math.min(x0, x1) - 0.3, Math.min(z0, z1) - 0.3, Math.max(x0, x1) + 0.3, Math.max(z0, z1) + 0.3, { low: true });
    }
    fence(g.x0, g.z0, g.x1, g.z0); fence(g.x0, g.z1, g.x1, g.z1); fence(g.x0, g.z0, g.x0, g.z1);
    fence(g.x1, g.z0, g.x1, P.graveGate[1] - 1.6); fence(g.x1, P.graveGate[1] + 1.6, g.x1, g.z1);
    // cổng nghĩa địa
    var gx = P.graveGate[0], gz = P.graveGate[1], gy = W.terrainH(gx, gz), pr = [[0.42, -0.4], [0.42, 0.2], [0.3, 0.3], [0.28, 2.6], [0.4, 2.7], [0.4, 2.9], [0.0, 3.1]];
    ctx.add('stone', Geo.lathe(pr, 6, 0.6).xf(gx, gy, gz - 1.7)); ctx.add('stone', Geo.lathe(pr, 6, 0.6).xf(gx, gy, gz + 1.7));
    ctx.add('wood', Geo.box(0.22, 0.24, 4.2).xf(gx, gy + 2.75, gz).boxUV(0.5));
    ctx.circle(gx, gz - 1.7, 0.45); ctx.circle(gx, gz + 1.7, 0.45);
    var bl = Md.lantern(ctx, gx, gy + 2.6, gz); bl.blueAlways = true;
    while (n < 44 && guard++ < 600) {
      var x = g.x0 + 2.5 + rnd() * (g.x1 - g.x0 - 5), z = g.z0 + 2.5 + rnd() * (g.z1 - g.z0 - 5), ok = Math.abs(z - gz) > 2.2 || x < g.x1 - 9;
      for (k = 0; k < of.length; k++) if (Math.hypot(x - of[k][0], z - of[k][1]) < 3.2) ok = false;
      for (k = 0; k < W.circles.length; k++) { var c = W.circles[k]; if (Math.hypot(x - c.x, z - c.z) < 2.4) { ok = false; break; } }
      if (!ok) continue;
      Md.tomb(ctx, x, z, rnd); n++;
    }
    // ba ngôi mộ chôn lễ vật
    for (k = 0; k < of.length; k++) {
      var ox = of[k][0], oz = of[k][1], oy = W.terrainH(ox, oz);
      Md.stele(ctx, ox, oz - 0.9, 0, 0.8, 1.5);
      ctx.add('stone', Geo.lathe([[0.0, 0], [0.34, 0], [0.4, 0.12], [0.36, 0.3], [0.24, 0.36], [0.26, 0.4], [0.0, 0.4]], 10, 1).xf(ox, oy - 0.05, oz));
    }
    var dead = [[-55, -30, 2], [-38, -70, 6], [-26, -33, 9], [-57, -68, 4], [-47, -52, 12], [-33, -48, 15]];
    for (k = 0; k < dead.length; k++) Md.tree(ctx, dead[k][0], dead[k][1], { seed: dead[k][2] * 13 + 5, scale: 0.9 + (k % 3) * 0.25, levels: 3, trunk: 3.6, rad: 0.36, tint: [0.55, 0.55, 0.6, 0] });
  }
  function buildTemple() {
    var a = P.temple, b, p, fy, k;
    b = W.props.temple = Md.building(ctx, { x: a.x, z: a.z, w: a.w, d: a.d, q: a.q, y: W.terrainH(a.x, a.z) + 0.3, door: true, porch: true, innerCols: true, h: 4.5, roofH: 6.0, lift: 1.7, overhang: 2.0, finial: true, doorW: 2.3, pr: 0.24 });
    fy = b.floorY + 0.06;
    b.ritual = Md.ritualAltar(ctx, a.x, fy, a.z - 1.0);
    p = b.F.pt(0, -a.d / 2 + 0.85); b.altar = Md.altarTable(ctx, p[0], fy, p[1], a.q, true);
    b.fireLight = ctx.light([b.ritual.fire[0], b.ritual.fire[1], b.ritual.fire[2]], [1.0, 0.4, 0.1], 16, 0); b.fireLight.base = 0;
    Md.lantern(ctx, a.x - 6, fy + 3.9, a.z + 2); Md.lantern(ctx, a.x + 6, fy + 3.9, a.z + 2); Md.lantern(ctx, a.x, fy + 3.9, a.z - 4.5, true);
    // bùa niêm phong trên cửa đình
    var seals = [], qm = R.mesh(Geo.quad([0, 0, 0.045], [0.34, 0, 0.045], [0.34, 1.0, 0.045], [0, 1.0, 0.045]));
    for (k = 0; k < 4; k++) {
      var s = new Node(qm, { tex: 'paper', tint: [1.6, 1.5, 1.3, 1], rough: 0.8, emis: [0.03, 0.02, 0.0] });
      s.set(0.12 + (k % 2) * 0.55, 0.9 + (k > 1 ? 0.25 : 0), 0); s.rot[2] = (k - 1.5) * 0.09;
      (k < 2 ? b.door.l : b.door.r).add(s); seals.push(s);
    }
    b.door.seals = seals;
    pave(-9, a.z + a.d / 2 + 2.6, 9, a.z + a.d / 2 + 13);
    // lư hương lớn giữa sân đình
    var ux = 0, uz = a.z + a.d / 2 + 8, uy = W.terrainH(ux, uz);
    ctx.add('stone', Geo.lathe([[0.0, 0], [0.5, 0], [0.42, 0.25], [0.3, 0.35], [0.55, 0.75], [0.7, 1.0], [0.72, 1.12], [0.6, 1.12], [0.45, 0.85], [0.0, 0.8]], 14, 1).xf(ux, uy, uz).color(0.5, 0.5, 0.52, 0));
    ctx.circle(ux, uz, 0.75, { low: true });
    p = b.F.pt(-9.86, 0); rune(['GỌI ĐÚNG TÊN NÀNG'], p[0], fy + 2.2, p[1], Math.PI / 2, 3.6, 0.8, { size: 46, bold: true, drip: true });
  }
  function buildVegetation() {
    var rnd = H.rng(2024), groups = {}, k, w = P.wall, total = 2200, n = 0, guard = 0;
    function put(x, z) {
      var key = Math.floor((x + 200) / 32) + '|' + Math.floor((z + 200) / 32), g = groups[key] || (groups[key] = []);
      g.push(x, W.terrainH(x, z) - 0.25, z, 0.65 + rnd() * 0.75, rnd() * 6.28, rnd() * 6.28, (rnd() - 0.5) * 2, 0.6 + rnd() * 0.7);
    }
    while (n < total && guard++ < 60000) {
      var x, z;
      if (n < total * 0.5) { // rừng tre hai bên lối mòn — mọc thành khóm
        var cxs = (rnd() < 0.5 ? -1 : 1) * (10.2 + Math.pow(rnd(), 1.6) * 26), czs = 49 + rnd() * 50;
        x = cxs + (rnd() - 0.5) * 2.2; z = czs + (rnd() - 0.5) * 2.2;
        if (Math.abs(x) < 9.8) continue;
      } else { // vành đai tre quanh tường làng
        var t = rnd(), d = 3 + Math.pow(rnd(), 1.5) * 20, side = Math.floor(rnd() * 3);
        if (side === 0) { x = w.x0 - d; z = M.lerp(w.z0 - 10, w.z1, t); } else if (side === 1) { x = w.x1 + d; z = M.lerp(w.z0 - 10, w.z1, t); } else { x = M.lerp(w.x0 - 10, w.x1 + 10, t); z = w.z0 - d; }
        x += (rnd() - 0.5) * 2; z += (rnd() - 0.5) * 2;
      }
      put(x, z); n++;
    }
    var geo = Md.bambooGeo(), mat = { tex: 'plain', rough: 0.45, tint: [1, 1, 1, 1] };
    for (var key in groups) {
      var arr = groups[key], cnt = arr.length / 8, order = [], cx = 0, cz = 0, cy = 0, rad = 0;
      for (k = 0; k < cnt; k++) { order.push(k); cx += arr[k * 8]; cy += arr[k * 8 + 1]; cz += arr[k * 8 + 2]; }
      cx /= cnt; cy /= cnt; cz /= cnt;
      for (k = cnt - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)), tmp = order[k]; order[k] = order[j]; order[j] = tmp; }
      var inst = new Float32Array(cnt * 8);
      for (k = 0; k < cnt; k++) { for (var q = 0; q < 8; q++) inst[k * 8 + q] = arr[order[k] * 8 + q]; rad = Math.max(rad, Math.hypot(arr[k * 8] - cx, arr[k * 8 + 2] - cz)); }
      R.addInstanced(geo, inst, cnt, mat, [cx, cy + 5, cz], rad + 12);
    }
    // cây rừng ngoài tường
    for (k = 0; k < 34; k++) {
      var a = k / 34 * 6.283 + rnd() * 0.15, rr = 1.0 + rnd() * 0.22, tx = Math.cos(a) * 82 * rr, tz = -15 + Math.sin(a) * 84 * rr;
      if (Math.abs(tx) < 14 && tz > 40) continue;
      if (tx > w.x0 - 3 && tx < w.x1 + 3 && tz > w.z0 - 3 && tz < w.z1 + 3) continue;
      Md.tree(ctx, tx, tz, { seed: k * 17 + 3, scale: 1.3 + rnd() * 0.8, levels: 2, leaves: true, leafN: 46, trunk: 6, rad: 0.42 });
    }
    for (k = 0; k < 14; k++) { var side2 = k % 2 ? 1 : -1, bz = 52 + rnd() * 44, bx = side2 * (13 + rnd() * 20); Md.tree(ctx, bx, bz, { seed: k * 29 + 11, scale: 1.2 + rnd() * 0.6, levels: 2, leaves: true, leafN: 40, trunk: 6.5, rad: 0.4 }); }
  }
  function finalize() {
    for (var key in batches) R.addStatic(batches[key].geo, batches[key].mat);
    batches = {};
    // lưới băm va chạm
    grid = {};
    function ins(o, x0, z0, x1, z1) {
      for (var gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++) for (var gz = Math.floor(z0 / CELL); gz <= Math.floor(z1 / CELL); gz++) { var k = gx + ',' + gz; (grid[k] || (grid[k] = [])).push(o); }
    }
    W.boxes.forEach(function (b) { b.box = true; ins(b, b.x0 - 1, b.z0 - 1, b.x1 + 1, b.z1 + 1); });
    W.circles.forEach(function (c) { ins(c, c.x - c.r - 1, c.z - c.r - 1, c.x + c.r + 1, c.z + c.r + 1); });
    W.doors.forEach(function (d) { d.col.door = true; });
    // đồ thị waypoint
    var wp = CFG.WAYPOINTS, adj = [], i, j;
    for (i = 0; i < wp.length; i++) adj.push([]);
    for (i = 0; i < wp.length; i++) for (j = i + 1; j < wp.length; j++) {
      var d = Math.hypot(wp[i][0] - wp[j][0], wp[i][1] - wp[j][1]);
      if (d < 27 && W.los(wp[i][0], wp[i][1], wp[j][0], wp[j][1], true, 0.3)) { adj[i].push(j); adj[j].push(i); }
    }
    W.graph = { pts: wp, adj: adj };
  }
  W.steps = [
    ['Đắp đất, vạch lối mòn...', buildTerrain], ['Dựng cổng làng và bia trấn yểm...', buildEntrance], ['Dựng nhà cổ, nhà Lý trưởng...', buildHouses],
    ['Đào Giếng Cổ, trồng cây đa...', buildCourtyard], ['Chôn mộ ở Nghĩa Địa Hoang...', buildGraveyard], ['Dựng Đình Làng Cổ...', buildTemple],
    ['Trồng rừng tre...', buildVegetation], ['Thắp đèn lồng, gọi mưa...', finalize]
  ];

  /* ---------- va chạm & tầm nhìn ---------- */
  function near(x, z) { return grid[Math.floor(x / CELL) + ',' + Math.floor(z / CELL)]; }
  /* đẩy hình tròn (pos[0],pos[2]) ra khỏi vật cản; trả về true nếu có va chạm */
  W.collide = function (pos, r) {
    var hit = false;
    for (var it = 0; it < 2; it++) {
      var list = near(pos[0], pos[2]); if (!list) return hit;
      for (var k = 0; k < list.length; k++) {
        var o = list[k]; if (!o.on) continue;
        if (o.box) {
          var cx = M.clamp(pos[0], o.x0, o.x1), cz = M.clamp(pos[2], o.z0, o.z1), dx = pos[0] - cx, dz = pos[2] - cz, d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          hit = true;
          if (d2 > 1e-8) { var d = Math.sqrt(d2); pos[0] = cx + dx / d * r; pos[2] = cz + dz / d * r; }
          else { // tâm nằm trong hộp: đẩy theo trục gần nhất
            var l = pos[0] - o.x0, rr = o.x1 - pos[0], t = pos[2] - o.z0, b = o.z1 - pos[2], m = Math.min(l, rr, t, b);
            if (m === l) pos[0] = o.x0 - r; else if (m === rr) pos[0] = o.x1 + r; else if (m === t) pos[2] = o.z0 - r; else pos[2] = o.z1 + r;
          }
        } else {
          dx = pos[0] - o.x; dz = pos[2] - o.z; d2 = dx * dx + dz * dz; var R2 = o.r + r;
          if (d2 >= R2 * R2) continue;
          hit = true; d = Math.sqrt(d2) || 0.001; pos[0] = o.x + dx / d * R2; pos[2] = o.z + dz / d * R2;
        }
      }
    }
    return hit;
  };
  W.pointBlocked = function (x, z, ignoreDoors, pad) {
    var list = near(x, z); if (!list) return false; pad = pad || 0;
    for (var k = 0; k < list.length; k++) {
      var o = list[k]; if (!o.on || o.low) continue; if (ignoreDoors && o.door) continue;
      if (o.box) { if (x > o.x0 - pad && x < o.x1 + pad && z > o.z0 - pad && z < o.z1 + pad) return true; }
      else if ((x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) < (o.r + pad) * (o.r + pad)) return true;
    }
    return false;
  };
  W.los = function (ax, az, bx, bz, ignoreDoors, pad) {
    var d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.5));
    for (var k = 1; k < n; k++) { var t = k / n; if (W.pointBlocked(ax + (bx - ax) * t, az + (bz - az) * t, ignoreDoors, pad)) return false; }
    return true;
  };
  /* A* trên đồ thị waypoint */
  W.nearestWP = function (x, z, needLos) {
    var pts = W.graph.pts, best = -1, bd = 1e9;
    for (var k = 0; k < pts.length; k++) { var d = Math.hypot(pts[k][0] - x, pts[k][1] - z); if (d < bd && (!needLos || d < 1 || W.los(x, z, pts[k][0], pts[k][1], true))) { bd = d; best = k; } }
    return best < 0 && needLos ? W.nearestWP(x, z, false) : best;
  };
  W.path = function (ax, az, bx, bz) {
    var g = W.graph, s = W.nearestWP(ax, az, true), e = W.nearestWP(bx, bz, true), n = g.pts.length, k;
    var dist = new Float32Array(n).fill(1e9), prev = new Int16Array(n).fill(-1), done = new Uint8Array(n);
    dist[s] = 0;
    for (var it = 0; it < n; it++) {
      var u = -1, best = 1e9;
      for (k = 0; k < n; k++) if (!done[k] && dist[k] < best) { best = dist[k]; u = k; }
      if (u < 0 || u === e) break; done[u] = 1;
      for (k = 0; k < g.adj[u].length; k++) { var v = g.adj[u][k], nd = dist[u] + Math.hypot(g.pts[u][0] - g.pts[v][0], g.pts[u][1] - g.pts[v][1]); if (nd < dist[v]) { dist[v] = nd; prev[v] = u; } }
    }
    var out = [[bx, bz]];
    for (k = e; k >= 0; k = prev[k]) { out.push(g.pts[k]); if (k === s) break; }
    return out.reverse();
  };

  /* ---------- cập nhật động: gió, đèn lồng, cửa, sấm chớp ---------- */
  var ltg = { next: 9, seq: [], t: 0 };
  W.strike = function (near) {
    ltg.seq = [[0, 1.0], [0.09, 0.15], [0.16, 0.8], [0.3, 0.1], [0.42, 0.45]]; ltg.t = 0; ltg.on = true;
    var A = H.Audio; setTimeout(function () { A.thunder(near); }, near ? 180 : 900 + Math.random() * 1500);
  };
  W.update = function (dt, time, ppos) {
    var e = R.env, A = H.Audio, k;
    var gust = A.gust === undefined ? 0.5 + 0.5 * Math.sin(time * 0.3) : A.gust;
    e.wind[3] = gust; e.wind[2] = 0.3 + gust * 0.22;
    for (k = 0; k < W.lanterns.length; k++) {
      var L = W.lanterns[k], n = L.node, sw = (0.12 + gust * 0.3);
      n.rot[2] = Math.sin(time * 1.9 + L.phase) * sw; n.rot[0] = Math.cos(time * 1.5 + L.phase * 1.3) * sw * 0.7;
      var tb = L.blueAlways ? 1 : (L.blueT > time ? 1 : 0); L.blue += (tb - L.blue) * Math.min(1, dt * 3);
      var b = L.blue, fl = 0.86 + 0.14 * Math.sin(time * 11 + L.phase * 5) * Math.sin(time * 7.3 + L.phase);
      L.mat.tint[0] = M.lerp(1, 0.15, b); L.mat.tint[1] = M.lerp(0.16, 0.45, b); L.mat.tint[2] = M.lerp(0.07, 1, b);
      L.mat.emis[0] = M.lerp(1.5, 0.1, b) * fl; L.mat.emis[1] = M.lerp(0.2, 0.6, b) * fl; L.mat.emis[2] = M.lerp(0.04, 1.8, b) * fl;
      if (L.light) {
        L.light.pos[0] = L.base[0] - Math.sin(n.rot[2]) * 0.45; L.light.pos[2] = L.base[2] + Math.sin(n.rot[0]) * 0.45;
        L.light.color[0] = M.lerp(1.0, 0.12, b); L.light.color[1] = M.lerp(0.24, 0.4, b); L.light.color[2] = M.lerp(0.07, 1.0, b);
        L.light.intensity = L.light.base * fl * (L.off ? 0 : 1);
      }
      if (L.off) { L.mat.emis[0] = L.mat.emis[1] = L.mat.emis[2] = 0; }
    }
    for (k = 0; k < W.doors.length; k++) {
      var d = W.doors[k];
      if (d.open !== d.target) { var s = dt * 1.5; d.open = d.open < d.target ? Math.min(d.target, d.open + s) : Math.max(d.target, d.open - s); }
      var ang = d.open * (d.swing || 1.5); d.l.rot[1] = d.a + ang; d.r.rot[1] = d.a - ang; d.col.on = d.open < 0.55;
    }
    // sấm chớp
    ltg.next -= dt;
    if (ltg.next <= 0 && e.rain > 0.3) { ltg.next = 9 + Math.random() * 22; W.strike(Math.random() < 0.25); }
    var target = 0;
    if (ltg.on) {
      ltg.t += dt; var sq = ltg.seq; target = 0;
      for (k = 0; k < sq.length; k++) if (ltg.t >= sq[k][0]) target = sq[k][1];
      if (ltg.t > 0.6) ltg.on = false;
    }
    e.lightning += (target - e.lightning) * Math.min(1, dt * (target > e.lightning ? 60 : 9));
    // sương dày hơn ở nghĩa địa
    var g = P.grave, inG = ppos && ppos[0] > g.x0 - 4 && ppos[0] < g.x1 + 4 && ppos[2] > g.z0 - 4 && ppos[2] < g.z1 + 4;
    W.inGrave = !!inG;
    e.mistDen += ((inG ? 0.115 : 0.055) * (W.mistMul === undefined ? 1 : W.mistMul) - e.mistDen) * Math.min(1, dt * 0.6);
    // bùa máu lộ ra sau flash rồi mờ dần
    for (k = 0; k < W.runes.length; k++) { var rn = W.runes[k]; if (rn.t > 0) rn.t = Math.max(0, rn.t - dt); rn.node.mat.tint[3] = Math.min(1, rn.t / 3) * (0.8 + 0.2 * Math.sin(time * 9 + k)) + (rn.faint || 0); rn.node.visible = rn.node.mat.tint[3] > 0.004; }
  };
})();
