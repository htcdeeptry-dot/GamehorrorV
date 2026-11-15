/* HUYẾT LỆ THÔN — models.js
   Mô hình thủ tục: kiến trúc Việt cổ (mái đao cong, cột tiện, cửa bức bàn song con tiện),
   cây đa đệ quy, tre instancing, giếng cổ, cổng làng, bia mộ, nội thất, vật phẩm
   và bộ rig phân cấp của Lệ Nương. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var Geo = H.Geo, Node = H.Node, M = H.M;
  var Md = H.Models = {};
  var lerp = M.lerp;

  /* khung toạ độ cục bộ: q = số lần xoay 90° quanh Y (0: mặt tiền hướng +z/nam) */
  function Frame(x, y, z, q) {
    var a = q * Math.PI / 2, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
    return {
      x: x, y: y, z: z, a: a, q: q,
      pt: function (lx, lz) { return [x + lx * c + lz * s, z - lx * s + lz * c]; },
      put: function (ctx, mat, geo) { geo.xf(x, y, z, 0, a, 0); ctx.add(mat, geo); return geo; },
      rect: function (ax, az, bx, bz) { var p = this.pt(ax, az), r = this.pt(bx, bz); return [Math.min(p[0], r[0]), Math.min(p[1], r[1]), Math.max(p[0], r[0]), Math.max(p[1], r[1])]; }
    };
  }
  Md.Frame = Frame;
  function swapUV(g) { var uv = g.uv; for (var k = 0; k < uv.length; k += 2) { var t = uv[k]; uv[k] = uv[k + 1]; uv[k + 1] = t; } return g; }
  function bx(w, h, d, x, y, z, s) { return Geo.box(w, h, d).xf(x, y, z).boxUV(s || 0.5); }
  /* xà ngang: thớ gỗ chạy dọc theo chiều dài */
  function beam(w, h, d, x, y, z) { return swapUV(Geo.box(w, h, d).xf(x, y, z).boxUV(0.5)); }

  /* ---------- Mái đao cong vút ---------- */
  Md.roofGeo = function (W, D, Hh, lift) {
    var g = new Geo(), NU = 12, NV = 7, rl = Math.max(0.4, (W - D) / 2 + D * 0.12);
    function yy(tv, tu) { return Hh * Math.pow(1 - tv, 1.75) + lift * Math.pow(Math.abs(tu), 3.2) * tv * tv; }
    var slope = Math.hypot(D / 2, Hh);
    function side(ax, s) {
      var sg = new Geo(), u, v;
      for (v = 0; v <= NV; v++) for (u = 0; u <= NU; u++) {
        var tv = v / NV, tu = u / NU * 2 - 1, e = lerp(rl, W / 2, tv), zz = lerp(0, D / 2, tv), px, pz;
        if (ax === 0) { px = tu * e; pz = s * zz; } else { pz = tu * zz; px = s * e; }
        sg.v(px, yy(tv, tu), pz, 0, 1, 0, (ax === 0 ? px : pz) * 0.5, tv * slope * 0.5);
      }
      for (v = 0; v < NV; v++) for (u = 0; u < NU; u++) { var a = v * (NU + 1) + u, b = a + 1, c = a + NU + 1, d = c + 1; sg.i.push(a, c, d, a, d, b); }
      sg.computeNormals(); g.add(sg);
    }
    side(0, 1); side(0, -1); side(1, 1); side(1, -1);
    // bờ nóc + bờ dải, đầu đao cuộn lên
    var rg = new Geo(), k;
    for (var sx = -1; sx <= 1; sx += 2) for (var sz = -1; sz <= 1; sz += 2) {
      var pts = [];
      for (k = 0; k <= 6; k++) { var t = k / 6; pts.push([sx * lerp(rl, W / 2, t), yy(t, 1) + 0.07, sz * lerp(0, D / 2, t)]); }
      var L = pts[6], dx = sx * 0.707, dz = sz * 0.707;
      pts.push([L[0] + dx * 0.32, L[1] + 0.12, L[2] + dz * 0.32], [L[0] + dx * 0.6, L[1] + 0.3, L[2] + dz * 0.6], [L[0] + dx * 0.78, L[1] + 0.52, L[2] + dz * 0.78]);
      rg.add(Geo.tube(pts, function (t) { return 0.12 - t * 0.085; }, 6, true));
    }
    var rp = [];
    for (k = 0; k <= 8; k++) { var tt = k / 8 * 2 - 1; rp.push([tt * (rl + 0.35), Hh + 0.1 + 0.4 * Math.pow(Math.abs(tt), 3), 0]); }
    rg.add(Geo.tube(rp, 0.16, 6, true));
    rg.color(0.55, 0.5, 0.5, 0);
    g.add(rg);
    return g;
  };

  /* ---------- Cột gỗ tiện trên chân tảng đá ---------- */
  function pillarWood(h, r) {
    return Geo.lathe([[r * 1.08, 0.28], [r * 1.12, h * 0.3], [r * 1.02, h * 0.7], [r * 0.92, h - 0.3], [r * 1.3, h - 0.24], [r * 1.3, h - 0.1], [r * 1.0, h]], 10, 1);
  }
  function pillarBase(r) { return Geo.lathe([[r * 1.7, 0], [r * 1.8, 0.08], [r * 1.65, 0.2], [r * 1.2, 0.3], [0, 0.3]], 10, 1); }

  /* ---------- Vách gỗ / cửa sổ song con tiện ---------- */
  function wallPanel(len, h, lattice) {
    var g = new Geo(), T = 0.09;
    if (!lattice) { g.add(bx(len, h, T, 0, h / 2, 0)); g.add(beam(len, 0.14, T + 0.05, 0, 1.0, 0)); return g; }
    var y0 = 1.0, y1 = h - 0.45;
    g.add(bx(len, y0, T, 0, y0 / 2, 0)); g.add(bx(len, h - y1, T, 0, (h + y1) / 2, 0));
    g.add(beam(len, 0.1, T + 0.05, 0, y0, 0)); g.add(beam(len, 0.1, T + 0.05, 0, y1, 0));
    g.add(beam(len, 0.04, 0.04, 0, (y0 + y1) / 2, 0));
    var n = Math.max(3, Math.round(len / 0.15));
    for (var k = 0; k <= n; k++) g.add(bx(k % 5 === 0 ? 0.06 : 0.028, y1 - y0, 0.035, -len / 2 + k / n * len, (y0 + y1) / 2, 0));
    return g;
  }
  /* cánh cửa bức bàn: bản lề tại x=0, cánh trải theo +x */
  Md.doorLeaf = function (w, h) {
    var g = new Geo(), T = 0.06;
    g.add(bx(0.09, h, T, 0.045, h / 2, 0)); g.add(bx(0.09, h, T, w - 0.045, h / 2, 0));
    g.add(beam(w, 0.1, T, w / 2, 0.05, 0)); g.add(beam(w, 0.1, T, w / 2, h - 0.05, 0)); g.add(beam(w, 0.08, T, w / 2, h * 0.42, 0));
    g.add(bx(w - 0.16, h * 0.42 - 0.12, 0.03, w / 2, h * 0.21 + 0.02, 0));
    var n = Math.max(3, Math.round((w - 0.18) / 0.11));
    for (var k = 1; k < n; k++) g.add(bx(0.024, h * 0.58 - 0.14, 0.03, 0.09 + k / n * (w - 0.18), h * 0.71, 0));
    g.add(beam(w - 0.16, 0.03, 0.03, w / 2, h * 0.62, 0)); g.add(beam(w - 0.16, 0.03, 0.03, w / 2, h * 0.82, 0));
    return g;
  };

  var lanternGeo = null;
  function lanternMeshes() {
    if (lanternGeo) return lanternGeo;
    var body = Geo.lathe([[0.07, -0.62], [0.17, -0.56], [0.22, -0.42], [0.225, -0.3], [0.18, -0.16], [0.08, -0.1]], 12, 2);
    var fr = new Geo();
    fr.add(Geo.lathe([[0.0, -0.66], [0.085, -0.66], [0.085, -0.6], [0.06, -0.6]], 8));
    fr.add(Geo.lathe([[0.06, -0.12], [0.095, -0.12], [0.095, -0.06], [0.0, -0.06]], 8));
    fr.add(Geo.tube([[0, 0, 0], [0, -0.06, 0]], 0.008, 4));
    fr.add(Geo.tube([[0, -0.66, 0], [0.01, -0.8, 0], [0, -0.98, 0.01]], function (t) { return 0.022 - t * 0.015; }, 5, true).color(0.8, 0.1, 0.05, 0));
    fr.color(0.5, 0.42, 0.35, 0);
    lanternGeo = { body: H.R.mesh(body), frame: H.R.mesh(fr) };
    return lanternGeo;
  }
  /* đèn lồng lụa đỏ treo, đung đưa theo gió bão */
  Md.lantern = function (ctx, x, y, z, noLight) {
    var lg = lanternMeshes(), pivot = new Node(); pivot.set(x, y, z);
    var mat = { tex: 'silk', tint: [1, 0.16, 0.07, 1], emis: [1.5, 0.2, 0.04], rough: 0.6 };
    pivot.add(new Node(lg.body, mat)); pivot.add(new Node(lg.frame, { tex: 'wood', rough: 0.7 }));
    ctx.node(pivot);
    var light = noLight ? null : ctx.light([x, y - 0.4, z], [1.0, 0.24, 0.07], 11, 2.3);
    var L = { node: pivot, mat: mat, light: light, phase: x * 1.3 + z * 0.7, blue: 0, base: [x, y, z] };
    ctx.lanterns.push(L);
    return L;
  };

  /* ---------- Nhà cổ / Đình ---------- */
  Md.building = function (ctx, o) {
    var W = o.w, D = o.d, h = o.h || 3.3, P = 0.4, ov = o.overhang || 1.5, by = o.y;
    var F = Frame(o.x, by, o.z, o.q), k, g;
    var nx = Math.max(3, 2 * Math.round((W / 3 - 1) / 2) + 1), nz = Math.max(2, Math.round(D / 3));
    var bw = W / nx, bd = D / nz, dw = Math.min(bw - 0.5, o.doorW || 1.9), dh = 2.35;
    var stone = new Geo(), wood = new Geo(), pr = o.pr || 0.17;
    // nền đá ong + bậc thềm
    stone.add(bx(W + 1.8, P + 1.4, D + 1.8, 0, (P - 1.4) / 2, 0));
    stone.add(bx(bw + 1.4, P * 0.55 + 1.2, 0.6, 0, (P * 0.55 - 1.2) / 2, D / 2 + 1.2));
    stone.add(bx(bw + 2.0, P * 0.2 + 1.2, 0.6, 0, (P * 0.2 - 1.2) / 2, D / 2 + 1.75));
    // sàn gỗ
    wood.add(swapUV(bx(W, 0.06, D, 0, P + 0.03, 0)).color(0.8, 0.78, 0.75, 0));
    // cột
    function col(x, z, hh) { wood.add(pillarWood(hh, pr).xf(x, P, z)); stone.add(pillarBase(pr).xf(x, P, z)); }
    for (k = 0; k <= nx; k++) { col(-W / 2 + k * bw, -D / 2, h); col(-W / 2 + k * bw, D / 2, h); }
    for (k = 1; k < nz; k++) { col(-W / 2, -D / 2 + k * bd, h); col(W / 2, -D / 2 + k * bd, h); }
    if (o.porch) for (k = 0; k <= nx; k++) col(-W / 2 + k * bw, D / 2 + 1.15, h - 0.25);
    if (o.innerCols) [2, nx - 2].forEach(function (kx) {
      for (var kz = 1; kz < nz; kz++) { var ix = -W / 2 + kx * bw, iz = -D / 2 + kz * bd, wp = F.pt(ix, iz); col(ix, iz, h + 0.1); ctx.circle(wp[0], wp[1], 0.3); }
    });
    // vách
    var mid = (nx - 1) / 2;
    for (k = 0; k < nx; k++) {
      var cx = -W / 2 + (k + 0.5) * bw;
      wood.add(wallPanel(bw - 0.2, h - 0.2, false).xf(cx, P, -D / 2));
      if (k !== mid) wood.add(wallPanel(bw - 0.2, h - 0.2, true).xf(cx, P, D / 2));
    }
    for (k = 0; k < nz; k++) {
      var cz = -D / 2 + (k + 0.5) * bd;
      wood.add(wallPanel(bd - 0.2, h - 0.2, k % 2 === 1 || nz < 3).xf(-W / 2, P, cz, 0, Math.PI / 2, 0));
      wood.add(wallPanel(bd - 0.2, h - 0.2, k % 2 === 0).xf(W / 2, P, cz, 0, Math.PI / 2, 0));
    }
    // khung cửa chính
    var fs = (bw - dw) / 2;
    if (fs > 0.12) { wood.add(bx(fs - 0.1, h - 0.2, 0.09, -dw / 2 - fs / 2, P + (h - 0.2) / 2, D / 2)); wood.add(bx(fs - 0.1, h - 0.2, 0.09, dw / 2 + fs / 2, P + (h - 0.2) / 2, D / 2)); }
    wood.add(bx(dw + 0.2, h - 0.2 - dh, 0.09, 0, P + dh + (h - 0.2 - dh) / 2, D / 2));
    wood.add(beam(dw + 0.5, 0.16, 0.2, 0, P + dh + 0.08, D / 2)); wood.add(beam(dw + 0.3, 0.1, 0.24, 0, P + 0.05, D / 2));
    // xà, kèo
    wood.add(beam(W + 0.5, 0.26, 0.24, 0, P + h, -D / 2)); wood.add(beam(W + 0.5, 0.26, 0.24, 0, P + h, D / 2));
    wood.add(beam(0.24, 0.26, D + 0.5, -W / 2, P + h, 0).xf(0, 0, 0)); wood.add(beam(0.24, 0.26, D + 0.5, W / 2, P + h, 0));
    for (k = 1; k < nx; k++) wood.add(beam(0.2, 0.22, D, -W / 2 + k * bw, P + h + 0.02, 0));
    for (k = 0; k <= nx; k++) { // bẩy hiên đỡ mái
      wood.add(Geo.tube([[-W / 2 + k * bw, P + h - 0.1, D / 2], [-W / 2 + k * bw, P + h + 0.02, D / 2 + ov * 0.55], [-W / 2 + k * bw, P + h + 0.22, D / 2 + ov * 0.95]], function (t) { return 0.09 - t * 0.04; }, 5, true));
      wood.add(Geo.tube([[-W / 2 + k * bw, P + h - 0.1, -D / 2], [-W / 2 + k * bw, P + h + 0.02, -D / 2 - ov * 0.55], [-W / 2 + k * bw, P + h + 0.22, -D / 2 - ov * 0.95]], function (t) { return 0.09 - t * 0.04; }, 5, true));
    }
    F.put(ctx, 'stone', stone); F.put(ctx, 'wood', wood);
    // mái
    var rH = o.roofH || D * 0.4;
    F.put(ctx, 'roof', Md.roofGeo(W + 2 * ov, D + 2 * ov, rH, o.lift || 0.9).xf(0, P + h + 0.2, 0));
    if (o.finial) F.put(ctx, 'roof', Geo.lathe([[0.0, 0], [0.22, 0.02], [0.3, 0.2], [0.16, 0.4], [0.24, 0.55], [0.1, 0.75], [0.02, 1.0]], 10).xf(0, P + h + 0.2 + rH + 0.1, 0).color(0.6, 0.5, 0.4, 0));
    // va chạm
    var t = 0.18, r;
    r = F.rect(-W / 2 - t, -D / 2 - t, W / 2 + t, -D / 2 + t); ctx.box(r[0], r[1], r[2], r[3]);
    r = F.rect(-W / 2 - t, -D / 2, -W / 2 + t, D / 2); ctx.box(r[0], r[1], r[2], r[3]);
    r = F.rect(W / 2 - t, -D / 2, W / 2 + t, D / 2); ctx.box(r[0], r[1], r[2], r[3]);
    r = F.rect(-W / 2 - t, D / 2 - t, -dw / 2, D / 2 + t); ctx.box(r[0], r[1], r[2], r[3]);
    r = F.rect(dw / 2, D / 2 - t, W / 2 + t, D / 2 + t); ctx.box(r[0], r[1], r[2], r[3]);
    r = F.rect(-W / 2 - 0.9, -D / 2 - 0.9, W / 2 + 0.9, D / 2 + 2.0); ctx.floor(r[0], r[1], r[2], r[3], by + P, 'wood');
    r = F.rect(-W / 2 - ov, -D / 2 - ov, W / 2 + ov, D / 2 + ov); ctx.roof(r[0], r[1], r[2], r[3]);
    // cửa
    var door = null;
    if (o.door) {
      var lw = dw / 2, mesh = H.R.mesh(Md.doorLeaf(lw, dh)), mat = { tex: 'wood', tint: [0.9, 0.75, 0.7, 1] };
      var pl = F.pt(-dw / 2, D / 2), pR = F.pt(dw / 2, D / 2);
      var nl = new Node(mesh, mat), nr = new Node(mesh, mat);
      nl.set(pl[0], by + P + 0.1, pl[1]); nl.rot[1] = F.a;
      nr.set(pR[0], by + P + 0.1, pR[1]); nr.rot[1] = F.a; nr.scl[0] = -1;
      ctx.node(nl); ctx.node(nr);
      r = F.rect(-dw / 2, D / 2 - t, dw / 2, D / 2 + t);
      var dp = F.pt(0, D / 2);
      door = { l: nl, r: nr, a: F.a, open: 0, target: 0, col: ctx.box(r[0], r[1], r[2], r[3]), pos: [dp[0], by + P + 1.2, dp[1]], out: F.pt(0, D / 2 + 1.2) };
      ctx.doors.push(door);
    }
    // đèn lồng hiên
    if (o.lanterns !== false) {
      var lp = F.pt(-bw * 0.5 - 0.0, D / 2 + ov * 0.75), lq = F.pt(bw * 0.5, D / 2 + ov * 0.75);
      Md.lantern(ctx, lp[0], by + P + h - 0.05, lp[1]); Md.lantern(ctx, lq[0], by + P + h - 0.05, lq[1], true);
    }
    return { F: F, P: P, floorY: by + P, W: W, D: D, h: h, door: door, bw: bw, bd: bd };
  };

  /* ---------- Cây đệ quy (đa cổ thụ / cây khô) ---------- */
  Md.tree = function (ctx, x, z, o) {
    var rnd = H.rng(o.seed || 7), y0 = ctx.h(x, z) - 0.4, levels = o.levels || 3, sc = o.scale || 1, A = H.Assets;
    var wood = new Geo(), leaf = new Geo();
    function norm(d) { var l = Math.hypot(d[0], d[1], d[2]) || 1; d[0] /= l; d[1] /= l; d[2] /= l; return d; }
    function cluster(p, n, rad) {
      for (var k = 0; k < n; k++) {
        var cx = p[0] + (rnd() - 0.5) * 2 * rad, cy = p[1] + (rnd() - 0.5) * rad * 1.2, cz = p[2] + (rnd() - 0.5) * 2 * rad;
        var s = 0.16 + rnd() * 0.2, a = rnd() * 6.28, t = (rnd() - 0.5) * 1.2, dx = Math.cos(a) * s, dz = Math.sin(a) * s;
        var q = Geo.quad([cx - dx, cy, cz - dz], [cx - dz * 0.5, cy + t * s - 0.05, cz + dx * 0.5], [cx + dx, cy - 0.1 * s, cz + dz], [cx + dz * 0.5, cy - t * s + 0.05, cz - dx * 0.5]);
        var g = 0.5 + rnd() * 0.7; q.color(0.03 * g, 0.075 * g, 0.025 * g, 0.35 + rnd() * 0.3); leaf.add(q);
      }
    }
    function branch(p, dir, len, rad, lvl) {
      var pts = [p.slice()], d = dir.slice(), cur = p.slice(), n = lvl === 0 ? 6 : 5, wig = lvl === 0 ? 0.22 : 0.5;
      for (var k = 0; k < n; k++) {
        d[0] += (rnd() - 0.5) * wig; d[1] += (rnd() - 0.5) * wig * 0.6 + (lvl > 0 ? 0.04 : 0); d[2] += (rnd() - 0.5) * wig; norm(d);
        cur = [cur[0] + d[0] * len / n, cur[1] + d[1] * len / n, cur[2] + d[2] * len / n]; pts.push(cur);
      }
      var tb = Geo.tube(pts, function (t) { return rad * (1 - 0.5 * t) * (lvl === 0 ? 1 + 1.3 * Math.pow(1 - t, 6) : 1); }, lvl === 0 ? 12 : (lvl === 1 ? 7 : 5), lvl >= levels);
      if (lvl === 0) tb.displace(function (px, py, pz) { return A.fbm(px * 0.9 + pz * 0.7, py * 0.5 + pz * 0.4, 3) * rad * 0.5; }, true);
      tb.scaleUV(lvl === 0 ? 3 : 1, 0.4);
      wood.add(tb);
      if (lvl < levels) {
        var nb = lvl === 0 ? (o.banyan ? 5 : 3) + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 2);
        for (var b = 0; b < nb; b++) {
          var sp = pts[Math.max(2, n - Math.floor(rnd() * (lvl === 0 ? 2 : 3)))], a = (b / nb + rnd() * 0.25) * 6.283;
          var nd = norm([d[0] * 0.45 + Math.cos(a) * 0.9, d[1] * 0.45 + 0.25 + rnd() * 0.3, d[2] * 0.45 + Math.sin(a) * 0.9]);
          branch(sp.slice(), nd, len * (0.62 + rnd() * 0.2), rad * (lvl === 0 ? 0.42 : 0.55), lvl + 1);
        }
        if (o.banyan && lvl >= 1) { // rễ phụ buông
          var nr = 1 + Math.floor(rnd() * 3);
          for (b = 0; b < nr; b++) {
            var rp = pts[2 + Math.floor(rnd() * (n - 2))], gy = ctx.h(rp[0], rp[2]), free = rnd() < 0.6, end = free ? gy + 1.3 + rnd() * 2.5 : gy - 0.2;
            if (rp[1] - end < 1) continue;
            var r0 = rp[1], rr = 0.025 + rnd() * 0.035, jx = (rnd() - 0.5) * 0.4, jz = (rnd() - 0.5) * 0.4;
            var rt = Geo.tube([[rp[0], r0, rp[2]], [rp[0] + jx * 0.4, lerp(r0, end, 0.35), rp[2] + jz * 0.4], [rp[0] + jx, lerp(r0, end, 0.7), rp[2] + jz * 0.7], [rp[0] + jx * 0.8, end, rp[2] + jz]], rr, 4, true);
            rt.colorFn(function (px, py) { var t = (r0 - py) / (r0 - end); return [0.8, 0.75, 0.7, free ? t * t * 0.5 : Math.sin(t * 3.14) * 0.12]; });
            wood.add(rt);
          }
        }
      }
      if (lvl >= levels - 1 && o.leaves) cluster(cur, Math.round((o.leafN || 50) * (lvl === levels ? 1 : 0.5)), 1.1 * sc);
    }
    branch([x, y0, z], norm([(rnd() - 0.5) * 0.25, 1, (rnd() - 0.5) * 0.25]), (o.trunk || 5) * sc, (o.rad || 0.45) * sc, 0);
    if (o.tint) wood.colorFn(function () { return o.tint; });
    ctx.add('bark', wood); if (leaf.i.length) ctx.add('plain', leaf);
    ctx.circle(x, z, (o.rad || 0.45) * sc * 1.25);
  };

  /* ---------- Tre (instancing) ---------- */
  Md.bambooGeo = function () {
    var g = new Geo(), hgt = 9, pts = [], k, rnd = H.rng(31);
    for (k = 0; k <= 9; k++) pts.push([0, k / 9 * hgt, 0]);
    var st = Geo.tube(pts, function (t) { var nd = Math.abs((t * 9) % 1 - 0.5) > 0.44 ? 1.28 : 1; return 0.055 * (1 - 0.6 * t) * nd; }, 5, true);
    st.colorFn(function (x, y) { var t = y / hgt, n = Math.abs((t * 9) % 1 - 0.5) > 0.42 ? 0.5 : 1; return [0.10 * n + t * 0.05, 0.15 * n + t * 0.06, 0.035 * n, t * t]; });
    g.add(st);
    for (k = 0; k < 16; k++) {
      var y = hgt * (0.35 + rnd() * 0.63), a = rnd() * 6.28, L = 0.55 + rnd() * 0.5, c = Math.cos(a), s = Math.sin(a), w = 0.07;
      var q = Geo.quad([0, y, 0], [c * L * 0.5 - s * w, y - L * 0.12, s * L * 0.5 + c * w], [c * L, y - L * 0.5, s * L], [c * L * 0.5 + s * w, y - L * 0.16, s * L * 0.5 - c * w]);
      var gr = 0.6 + rnd() * 0.6, t = y / hgt; q.color(0.045 * gr, 0.10 * gr, 0.03 * gr, t * t + 0.08);
      g.add(q);
    }
    return g;
  };

  /* ---------- Giếng Cổ Huyết Lệ ---------- */
  Md.well = function (ctx, x, z) {
    var y = ctx.h(x, z), F = Frame(x, y, z, 0);
    F.put(ctx, 'stone', Geo.lathe([[1.75, -0.6], [1.75, 0.0], [1.55, 0.08], [1.5, 0.85], [1.42, 0.96], [1.14, 0.96], [1.08, 0.82], [1.08, -9]], 22, 0.6));
    F.put(ctx, 'stone', Geo.lathe([[2.6, -0.5], [2.6, 0.06], [1.7, 0.1]], 22, 0.5).color(0.75, 0.75, 0.75, 0));
    var wood = new Geo();
    wood.add(pillarWood(2.9, 0.1).xf(-1.85, -0.28, 0)); wood.add(pillarWood(2.9, 0.1).xf(1.85, -0.28, 0));
    wood.add(beam(4.3, 0.16, 0.16, 0, 2.62, 0));
    wood.add(Geo.lathe([[0.03, -1.9], [0.16, -1.85], [0.16, 1.85], [0.03, 1.9]], 10, 1).xf(0, 1.6, 0, 0, 0, Math.PI / 2));
    F.put(ctx, 'wood', wood);
    F.put(ctx, 'roof', Md.roofGeo(4.8, 2.6, 0.75, 0.5).xf(0, 2.72, 0));
    ctx.circle(x, z, 1.75, { low: true }); ctx.circle(x - 1.85, z, 0.2); ctx.circle(x + 1.85, z, 0.2);
    // nước đỏ thẫm dưới đáy
    var water = new Node(H.R.mesh(Geo.lathe([[0, 0], [1.1, 0]], 16)), { tex: 'plain', tint: [0.06, 0.0, 0.0, 1], emis: [0.03, 0, 0], rough: 0.05 });
    water.set(x, y - 5.5, z); ctx.node(water);
    // dây + gàu + tay quay (động)
    var rope = new Node(H.R.mesh(Geo.tube([[0, 0, 0], [0, -0.5, 0], [0, -1, 0]], 0.022, 5)), { tex: 'silk', tint: [0.3, 0.24, 0.16, 1] });
    rope.set(x, y + 1.45, z); rope.scl[1] = 6.0; ctx.node(rope);
    var bg = new Geo();
    bg.add(Geo.lathe([[0, 0], [0.2, 0], [0.24, 0.34], [0.215, 0.34], [0.18, 0.04], [0, 0.04]], 12, 1));
    bg.add(Geo.tube([[-0.22, 0.32, 0], [-0.18, 0.5, 0], [0, 0.6, 0], [0.18, 0.5, 0], [0.22, 0.32, 0]], 0.012, 4).color(0.3, 0.3, 0.32, 0));
    var bucket = new Node(H.R.mesh(bg), { tex: 'wood', tint: [0.7, 0.6, 0.5, 1] }); bucket.set(x, y - 5.1, z); ctx.node(bucket);
    var cg = new Geo();
    cg.add(Geo.tube([[0, 0, 0], [0.22, 0, 0]], 0.03, 6)); cg.add(Geo.tube([[0.2, 0, 0], [0.2, -0.42, 0]], 0.022, 6)); cg.add(Geo.tube([[0.2, -0.42, 0], [0.5, -0.42, 0]], 0.028, 6, true));
    var crank = new Node(H.R.mesh(cg), { tex: 'plain', tint: [0.16, 0.09, 0.06, 1], rough: 0.45 }); crank.set(x + 1.95, y + 1.6, z); crank.visible = false; ctx.node(crank);
    return { x: x, y: y, z: z, rope: rope, bucket: bucket, crank: crank, water: water };
  };

  /* ---------- Tường đá ong bao làng ---------- */
  Md.wall = function (ctx, x0, z0, x1, z1) {
    var len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 8)), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    for (var k = 0; k < n; k++) {
      var ax = lerp(x0, x1, k / n), az = lerp(z0, z1, k / n), bx2 = lerp(x0, x1, (k + 1) / n), bz2 = lerp(z0, z1, (k + 1) / n);
      var cx = (ax + bx2) / 2, cz = (az + bz2) / 2, sl = len / n + 0.02, y = Math.min(ctx.h(ax, az), ctx.h(bx2, bz2));
      var w = alongX ? sl : 0.75, d = alongX ? 0.75 : sl;
      ctx.add('stone', Geo.box(w, 4.2, d).xf(cx, y + 0.9, cz).boxUV(0.5));
      ctx.add('roof', Geo.box(alongX ? sl : 1.05, 0.16, alongX ? 1.05 : sl).xf(cx, y + 3.06, cz).boxUV(0.5));
      ctx.add('roof', Geo.tube(alongX ? [[ax, y + 3.22, cz], [bx2, y + 3.22, cz]] : [[cx, y + 3.22, az], [cx, y + 3.22, bz2]], 0.17, 6).color(0.6, 0.55, 0.55, 0));
    }
    ctx.box(Math.min(x0, x1) - 0.4, Math.min(z0, z1) - 0.4, Math.max(x0, x1) + 0.4, Math.max(z0, z1) + 0.4);
  };

  /* ---------- Cổng làng ---------- */
  Md.gate = function (ctx, x, z) {
    var y = ctx.h(x, z), F = Frame(x, y, z, 0), st = new Geo(), wd = new Geo();
    var prof = [[0.85, -0.6], [0.85, 0.3], [0.7, 0.42], [0.66, 3.5], [0.8, 3.62], [0.8, 3.85], [0.5, 4.0], [0, 4.0]];
    st.add(Geo.lathe(prof, 8, 0.5).xf(-2.7, 0, 0, 0, 0.39, 0)); st.add(Geo.lathe(prof, 8, 0.5).xf(2.7, 0, 0, 0, 0.39, 0));
    st.add(Geo.lathe([[0, 4.0], [0.3, 4.05], [0.36, 4.3], [0.2, 4.5], [0.26, 4.62], [0.0, 4.9]], 8).xf(-2.7, 0, 0)); st.add(Geo.lathe([[0, 4.0], [0.3, 4.05], [0.36, 4.3], [0.2, 4.5], [0.26, 4.62], [0.0, 4.9]], 8).xf(2.7, 0, 0));
    wd.add(beam(6.4, 0.34, 0.4, 0, 3.75, 0)); wd.add(beam(5.2, 0.2, 0.3, 0, 3.3, 0));
    wd.add(bx(2.6, 0.7, 0.08, 0, 4.3, 0.05));
    F.put(ctx, 'stone', st); F.put(ctx, 'wood', wd);
    F.put(ctx, 'roof', Md.roofGeo(7.6, 2.8, 0.95, 0.7).xf(0, 4.7, 0));
    ctx.circle(x - 2.7, z, 0.9); ctx.circle(x + 2.7, z, 0.9);
    // cánh cổng sắt
    var lg = new Geo(), k;
    lg.add(Geo.box(0.07, 3.1, 0.07).xf(0.035, 1.55, 0)); lg.add(Geo.box(0.07, 3.1, 0.07).xf(1.96, 1.55, 0));
    lg.add(Geo.box(2.0, 0.07, 0.07).xf(1.0, 0.25, 0)); lg.add(Geo.box(2.0, 0.07, 0.07).xf(1.0, 2.75, 0)); lg.add(Geo.box(2.0, 0.07, 0.07).xf(1.0, 1.5, 0));
    for (k = 1; k < 10; k++) { lg.add(Geo.tube([[k * 0.2, 0.2, 0], [k * 0.2, 3.0 + (k % 2) * 0.12, 0]], 0.018, 5, true)); }
    var mesh = H.R.mesh(lg), mat = { tex: 'plain', tint: [0.05, 0.045, 0.05, 1], rough: 0.4 };
    var nl = new Node(mesh, mat), nr = new Node(mesh, mat);
    nl.set(x - 2.0, y, z); nr.set(x + 2.0, y, z); nr.scl[0] = -1; ctx.node(nl); ctx.node(nr);
    // xích + ổ khoá số
    var cg = new Geo();
    cg.add(Geo.tube([[-0.5, 1.6, 0.08], [-0.2, 1.42, 0.12], [0.2, 1.42, 0.12], [0.5, 1.6, 0.08], [0.2, 1.3, -0.1], [-0.2, 1.3, -0.1], [-0.5, 1.6, 0.08]], 0.03, 5));
    cg.add(Geo.box(0.22, 0.26, 0.1).xf(0, 1.22, 0.14).color(0.5, 0.4, 0.2, 0));
    var chain = new Node(H.R.mesh(cg), { tex: 'plain', tint: [0.18, 0.16, 0.15, 1], rough: 0.3 }); chain.set(x, y, z); ctx.node(chain);
    var plate = new Node(H.R.mesh(Geo.quad([-1.25, 4.0, 0.1], [1.25, 4.0, 0.1], [1.25, 4.62, 0.1], [-1.25, 4.62, 0.1])), { tex: 'sign', unlit: 0.9, tint: [1, 1, 1, 1], blend: true });
    plate.set(x, y, z); ctx.node(plate);
    var door = { l: nl, r: nr, a: 0, open: 0, target: 0, col: ctx.box(x - 2.0, z - 0.2, x + 2.0, z + 0.2), pos: [x, y + 1.3, z], swing: 1.35, chain: chain };
    ctx.doors.push(door);
    return door;
  };

  /* ---------- Bia đá, mộ, chum vại ---------- */
  function archShape(w, h, n) {
    var s = [[-w / 2, 0], [w / 2, 0], [w / 2, h - w / 2]], k;
    for (k = 1; k < n; k++) { var a = k / n * Math.PI; s.push([Math.cos(a) * w / 2, h - w / 2 + Math.sin(a) * w / 2]); }
    s.push([-w / 2, h - w / 2]);
    return s;
  }
  Md.stele = function (ctx, x, z, ry, w, h) {
    var y = ctx.h(x, z), g = new Geo();
    g.add(Geo.extrude(archShape(w, h, 8), 0.2).xf(0, 0.35, -0.1).boxUV(0.7));
    g.add(Geo.sphere(0.6, 12, 8).xf(0, 0.12, 0.05, 0, 0, 0, w * 0.95, 0.42, 0.9).boxUV(0.7));
    g.add(Geo.sphere(0.2, 8, 6).xf(0, 0.22, w * 0.62).boxUV(0.7));
    g.xf(x, y, z, 0, ry, 0); ctx.add('stone', g);
    ctx.circle(x, z, w * 0.55);
    return y;
  };
  Md.tomb = function (ctx, x, z, rnd) {
    var y = ctx.h(x, z), w = 0.5 + rnd() * 0.25, h = 0.9 + rnd() * 0.6, g = new Geo();
    g.add(Geo.extrude(archShape(w, h, 6), 0.15).xf(0, -0.15, -0.07, (rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.3).boxUV(0.9));
    g.add(Geo.box(w + 0.3, 0.3, 0.5).xf(0, -0.02, 0).boxUV(0.9));
    var gry = 0.55 + rnd() * 0.35; g.color(gry, gry * 0.98, gry * 0.95, 0);
    g.xf(x, y, z, 0, (rnd() - 0.5) * 0.8, 0); ctx.add('stone', g);
    // nấm mộ
    var md = Geo.sphere(1, 10, 6).xf(0, 0, 0, 0, 0, 0, 0.75, 0.38, 1.25);
    md.displace(function (px, py, pz) { return H.Assets.noise(px * 3 + x, pz * 3 + z) * 0.08; }, true);
    md.xf(x, y - 0.05, z + 1.3).boxUV(0.4); md.color(0.75, 0.8, 0.7, 0); ctx.add('mud', md);
    ctx.circle(x, z, 0.42, { low: true });
  };
  Md.jar = function (ctx, x, z, s) {
    var y = ctx.h(x, z);
    ctx.add('stone', Geo.lathe([[0.0, 0], [0.2, 0], [0.34, 0.25], [0.38, 0.5], [0.3, 0.78], [0.2, 0.86], [0.24, 0.92], [0.2, 0.93], [0.17, 0.8]], 12, 1).xf(x, y - 0.03, z, 0, 0, 0, s).color(0.45, 0.3, 0.25, 0));
    ctx.circle(x, z, 0.4 * s, { low: true });
  };
  Md.rock = function (ctx, x, z, s, seed) {
    var y = ctx.h(x, z), A = H.Assets, g = Geo.sphere(1, 9, 7);
    g.displace(function (px, py, pz) { return A.fbm(px * 1.3 + seed, pz * 1.3 + py, 3) * 0.55; }, true);
    g.xf(x, y + s * 0.1, z, 0, seed, 0, s, s * 0.6, s * 0.85).boxUV(0.4); g.color(0.5, 0.52, 0.5, 0);
    ctx.add('stone', g); if (s > 0.5) ctx.circle(x, z, s * 0.8, { low: s < 1.3 });
  };
  Md.lanternPost = function (ctx, x, z, dir) {
    var y = ctx.h(x, z), g = new Geo(), dx = Math.cos(dir), dz = Math.sin(dir);
    g.add(Geo.lathe([[0.12, -0.4], [0.1, 0.3], [0.075, 2.6], [0.1, 2.68], [0.05, 2.9]], 8, 1));
    g.add(Geo.tube([[0, 2.5, 0], [dx * 0.4, 2.72, dz * 0.4], [dx * 0.8, 2.66, dz * 0.8]], 0.035, 5, true));
    g.xf(x, y, z); ctx.add('wood', g); ctx.circle(x, z, 0.16);
    return Md.lantern(ctx, x + dx * 0.78, y + 2.64, z + dz * 0.78);
  };

  /* ---------- Nội thất ---------- */
  Md.wardrobe = function (ctx, x, y, z, q) {
    var F = Frame(x, y, z, q), g = new Geo(), W = 1.5, Hh = 2.15, D = 0.75, k;
    g.add(bx(W, Hh - 0.25, 0.04, 0, 0.2 + (Hh - 0.25) / 2, -D / 2 + 0.02));
    g.add(bx(0.05, Hh - 0.25, D, -W / 2 + 0.025, 0.2 + (Hh - 0.25) / 2, 0)); g.add(bx(0.05, Hh - 0.25, D, W / 2 - 0.025, 0.2 + (Hh - 0.25) / 2, 0));
    g.add(beam(W + 0.16, 0.1, D + 0.12, 0, Hh, 0)); g.add(beam(W + 0.06, 0.06, D + 0.04, 0, Hh - 0.08, 0)); g.add(beam(W + 0.08, 0.1, D + 0.06, 0, 0.22, 0));
    for (k = -1; k <= 1; k += 2) {
      g.add(Geo.lathe([[0.03, 0], [0.055, 0.05], [0.04, 0.12], [0.06, 0.2]], 8).xf(k * (W / 2 - 0.08), 0, D / 2 - 0.08)); g.add(Geo.lathe([[0.03, 0], [0.055, 0.05], [0.04, 0.12], [0.06, 0.2]], 8).xf(k * (W / 2 - 0.08), 0, -D / 2 + 0.08));
      var dx = k * W / 4;
      g.add(bx(W / 2 - 0.07, Hh - 0.42, 0.035, dx, 0.3 + (Hh - 0.42) / 2, D / 2 - 0.02));
      g.add(bx(W / 2 - 0.26, Hh * 0.33, 0.02, dx, 0.52 + Hh * 0.165, D / 2 + 0.005).color(0.7, 0.6, 0.55, 0));
      g.add(bx(W / 2 - 0.26, Hh * 0.33, 0.02, dx, 1.42 + Hh * 0.165 - 0.2, D / 2 + 0.005).color(0.7, 0.6, 0.55, 0));
      g.add(Geo.lathe([[0.0, 0], [0.025, 0.01], [0.03, 0.03], [0.0, 0.045]], 8).xf(k * 0.07, 1.15, D / 2, Math.PI / 2, 0, 0).color(0.9, 0.7, 0.3, 0));
    }
    g.colorFn(function (px, py, pz, i) { var c = g.c; return [c[i * 4] * 0.85, c[i * 4 + 1] * 0.6, c[i * 4 + 2] * 0.55, 0]; });
    F.put(ctx, 'wood', g);
    var r = F.rect(-W / 2, -D / 2, W / 2, D / 2); ctx.box(r[0], r[1], r[2], r[3]);
    var fp = F.pt(0, D / 2 + 0.7);
    return { pos: [x, y + 1.2, z], front: [fp[0], fp[1]], yaw: F.a + Math.PI, hideY: y + 1.25 };
  };
  Md.altarTable = function (ctx, x, y, z, q, big) {
    var F = Frame(x, y, z, q), g = new Geo(), W = big ? 2.6 : 1.9, D = 0.85, T = 1.0, k;
    g.add(beam(W, 0.07, D, 0, T, 0)); g.add(beam(W - 0.1, 0.16, 0.04, 0, T - 0.1, D / 2 - 0.06)); g.add(beam(W - 0.1, 0.16, 0.04, 0, T - 0.1, -D / 2 + 0.06));
    for (k = 0; k < 4; k++) g.add(Geo.lathe([[0.035, 0], [0.06, 0.06], [0.04, 0.2], [0.05, T * 0.6], [0.045, T - 0.03]], 8).xf((k % 2 ? 1 : -1) * (W / 2 - 0.1), 0, (k < 2 ? 1 : -1) * (D / 2 - 0.1)));
    g.colorFn(function () { return [0.9, 0.55, 0.45, 0]; });
    F.put(ctx, 'wood', g);
    var p = new Geo();
    // bát hương (úp ngược), chân nến, bài vị
    p.add(Geo.lathe([[0.0, 0], [0.13, 0.0], [0.15, 0.1], [0.08, 0.17], [0.09, 0.2], [0.0, 0.2]], 12).xf(0, T + 0.035, 0).color(0.13, 0.1, 0.05, 0));
    for (k = -1; k <= 1; k += 2) {
      p.add(Geo.lathe([[0.0, 0], [0.07, 0], [0.025, 0.05], [0.02, 0.26], [0.05, 0.28], [0.0, 0.28]], 8).xf(k * W * 0.36, T + 0.035, 0.05).color(0.3, 0.22, 0.1, 0));
      p.add(Geo.lathe([[0.018, 0], [0.018, 0.16], [0.0, 0.17]], 6).xf(k * W * 0.36, T + 0.31, 0.05).color(0.75, 0.1, 0.08, 0));
    }
    for (k = -1; k <= 1; k++) p.add(Geo.extrude(archShape(0.16, 0.42, 5), 0.04).xf(k * 0.26, T + 0.035, -D / 2 + 0.12).color(0.35, 0.05, 0.04, 0));
    F.put(ctx, 'plain', p);
    // khăn phủ bàn thờ bằng lụa đỏ
    var cl = Geo.plane(W + 0.04, T - 0.08, 10, 5).xf(0, T / 2 + 0.02, D / 2 + 0.02, Math.PI / 2, 0, 0);
    cl.colorFn(function (px, py) { var t = 1 - py / T; return [0.42, 0.03, 0.03, t * t * 0.1]; });
    cl.scaleUV(2, 1); F.put(ctx, 'silk', cl);
    var r = F.rect(-W / 2, -D / 2, W / 2, D / 2); ctx.box(r[0], r[1], r[2], r[3]);
    var fp = F.pt(0, D / 2 + 0.7);
    return { pos: [x, y + 0.9, z], front: [fp[0], fp[1]], yaw: F.a + Math.PI, hideY: y + 0.55, top: y + T + 0.04, F: F };
  };
  Md.bed = function (ctx, x, y, z, q) {
    var F = Frame(x, y, z, q), g = new Geo(), k;
    g.add(beam(2.1, 0.08, 1.5, 0, 0.5, 0)); g.add(beam(2.1, 0.2, 0.05, 0, 0.42, 0.72)); g.add(beam(2.1, 0.2, 0.05, 0, 0.42, -0.72));
    for (k = 0; k < 4; k++) g.add(Geo.lathe([[0.05, 0], [0.07, 0.1], [0.045, 0.25], [0.06, 0.46]], 8).xf((k % 2 ? 1 : -1) * 0.95, 0, (k < 2 ? 1 : -1) * 0.65));
    F.put(ctx, 'wood', g);
    var r = F.rect(-1.05, -0.75, 1.05, 0.75); ctx.box(r[0], r[1], r[2], r[3], { low: true });
  };
  Md.stool = function (ctx, x, y, z) {
    ctx.add('wood', Geo.lathe([[0.0, 0], [0.16, 0], [0.2, 0.12], [0.2, 0.32], [0.17, 0.44], [0.0, 0.44]], 10, 1).xf(x, y, z));
    ctx.circle(x, z, 0.22, { low: true });
  };
  /* két sắt của Lý trưởng */
  Md.safe = function (ctx, x, y, z, q) {
    var F = Frame(x, y, z, q), g = new Geo();
    g.add(Geo.box(0.9, 1.1, 0.04).xf(0, 0.55, -0.38)); g.add(Geo.box(0.04, 1.1, 0.8).xf(-0.43, 0.55, 0)); g.add(Geo.box(0.04, 1.1, 0.8).xf(0.43, 0.55, 0));
    g.add(Geo.box(0.9, 0.04, 0.8).xf(0, 1.08, 0)); g.add(Geo.box(0.9, 0.06, 0.8).xf(0, 0.03, 0)); g.add(Geo.box(0.82, 0.03, 0.7).xf(0, 0.55, 0));
    g.color(0.07, 0.075, 0.08, 0); F.put(ctx, 'plain', g);
    var dg = new Geo();
    dg.add(Geo.box(0.82, 1.0, 0.05).xf(0.41, 0.5, 0).color(0.085, 0.09, 0.095, 0));
    dg.add(Geo.lathe([[0.0, 0], [0.09, 0], [0.09, 0.02], [0.06, 0.035], [0.0, 0.04]], 14).xf(0.41, 0.62, 0.025, Math.PI / 2, 0, 0).color(0.5, 0.42, 0.2, 0));
    dg.add(Geo.tube([[0.62, 0.42, 0.03], [0.62, 0.42, 0.09], [0.62, 0.28, 0.09]], 0.014, 5, true).color(0.5, 0.42, 0.2, 0));
    var dp = F.pt(-0.41, 0.4), door = new Node(H.R.mesh(dg), { tex: 'plain', rough: 0.35 });
    door.set(dp[0], y + 0.06, dp[1]); door.rot[1] = F.a; ctx.node(door);
    var r = F.rect(-0.45, -0.4, 0.45, 0.4); ctx.box(r[0], r[1], r[2], r[3]);
    var ip = F.pt(0, 0.05);
    return { door: door, a: F.a, pos: [x, y + 0.6, z], inside: [ip[0], y + 0.62, ip[1]] };
  };
  /* Đàn Ngũ Hành */
  Md.ritualAltar = function (ctx, x, y, z) {
    ctx.add('stone', Geo.lathe([[2.3, -0.3], [2.3, 0.22], [2.2, 0.26], [1.75, 0.26], [1.75, 0.5], [1.65, 0.54], [1.15, 0.54], [1.15, 0.95], [1.22, 1.0], [0, 1.0]], 8, 0.5).xf(x, y, z, 0, Math.PI / 8, 0));
    var p = new Geo(), k, spots = [];
    p.add(Geo.lathe([[0.0, 0], [0.22, 0], [0.16, 0.12], [0.2, 0.2], [0.46, 0.5], [0.5, 0.62], [0.42, 0.62], [0.3, 0.42], [0.0, 0.36]], 14).xf(0, 1.0, 0).color(0.12, 0.085, 0.035, 0));
    for (k = 0; k < 5; k++) {
      var a = k / 5 * 6.283 + Math.PI / 2, bx2 = Math.cos(a) * 1.42, bz2 = Math.sin(a) * 1.42;
      p.add(Geo.lathe([[0.0, 0], [0.1, 0], [0.16, 0.08], [0.17, 0.1], [0.14, 0.1], [0.08, 0.03], [0, 0.03]], 10).xf(bx2, 0.54, bz2).color(0.12, 0.09, 0.04, 0));
      spots.push([x + bx2, y + 0.66, z + bz2]);
    }
    p.xf(x, y, z); ctx.add('plain', p);
    ctx.circle(x, z, 2.3, { low: true });
    return { pos: [x, y + 1.2, z], spots: spots, fire: [x, y + 1.75, z] };
  };

  /* ---------- Vật phẩm (node động, phát sáng nhẹ để dễ tìm) ---------- */
  var itemCache = {};
  Md.item = function (type) {
    var g = itemCache[type], k;
    if (!g) {
      g = new Geo();
      if (type === 'camera') {
        g.add(Geo.box(0.16, 0.1, 0.07).color(0.05, 0.05, 0.055, 0)); g.add(Geo.box(0.06, 0.035, 0.05).xf(0, 0.065, 0).color(0.2, 0.2, 0.2, 0));
        g.add(Geo.lathe([[0.0, 0], [0.04, 0], [0.042, 0.05], [0.036, 0.06], [0.0, 0.05]], 12).xf(0, 0, 0.035, Math.PI / 2, 0, 0).color(0.1, 0.1, 0.12, 0));
        g.add(Geo.box(0.045, 0.03, 0.02).xf(-0.05, 0.065, 0.02).color(0.9, 0.9, 0.85, 0));
      } else if (type === 'crank') {
        g.add(Geo.tube([[0, 0, 0], [0.22, 0, 0]], 0.03, 6, true)); g.add(Geo.tube([[0.2, 0, 0], [0.2, 0, 0.42]], 0.022, 6)); g.add(Geo.tube([[0.2, 0, 0.42], [0.5, 0, 0.42]], 0.028, 6, true));
        g.color(0.2, 0.11, 0.07, 0);
      } else if (type === 'mirror') {
        g.add(Geo.lathe([[0.0, 0], [0.13, 0], [0.14, 0.012], [0.13, 0.024], [0.11, 0.02], [0.0, 0.026]], 20).color(0.45, 0.33, 0.12, 0));
        g.add(Geo.lathe([[0.0, 0.027], [0.105, 0.022]], 20).color(0.7, 0.62, 0.4, 0));
      } else if (type === 'key') {
        g.add(Geo.tube([[0, 0, 0], [0.11, 0, 0]], 0.008, 5)); g.add(Geo.lathe([[0.012, -0.004], [0.028, -0.004], [0.028, 0.004], [0.012, 0.004]], 10).xf(-0.025, 0, 0, Math.PI / 2, 0, 0));
        g.add(Geo.box(0.02, 0.03, 0.006).xf(0.1, -0.015, 0)); g.color(0.5, 0.36, 0.12, 0);
      } else if (type === 'scroll') {
        g.add(Geo.lathe([[0.0, -0.16], [0.03, -0.16], [0.032, 0.16], [0.0, 0.16]], 10).xf(0, 0, 0, 0, 0, Math.PI / 2).color(0.6, 0.48, 0.3, 0));
        g.add(Geo.lathe([[0.034, -0.03], [0.034, 0.03]], 10).xf(0, 0, 0, 0, 0, Math.PI / 2).color(0.5, 0.02, 0.02, 0));
      } else if (type === 'incense') {
        for (k = 0; k < 7; k++) g.add(Geo.tube([[(k % 3 - 1) * 0.012, 0, (k % 2) * 0.012], [(k % 3 - 1) * 0.014, 0.3, (k % 2) * 0.014]], 0.004, 4, true).color(0.45, 0.25, 0.1, 0));
        g.add(Geo.lathe([[0.022, 0.05], [0.022, 0.09]], 8).color(0.6, 0.05, 0.05, 0));
      } else if (type === 'hairpin') {
        g.add(Geo.tube([[0, 0, 0], [0.19, 0.01, 0]], function (t) { return 0.006 - t * 0.004; }, 5, true).color(0.7, 0.7, 0.65, 0));
        g.add(Geo.sphere(0.018, 8, 6).xf(-0.01, 0, 0).color(0.15, 0.6, 0.35, 0)); g.add(Geo.sphere(0.01, 6, 5).xf(-0.03, 0.012, 0).color(0.2, 0.7, 0.4, 0));
      } else if (type === 'comb') {
        g.add(Geo.extrude([[-0.09, 0], [0.09, 0], [0.085, 0.035], [0.05, 0.05], [-0.05, 0.05], [-0.085, 0.035]], 0.01).color(0.3, 0.17, 0.08, 0));
        for (k = 0; k < 12; k++) g.add(Geo.box(0.006, 0.05, 0.008).xf(-0.08 + k * 0.0145, -0.025, 0.005).color(0.3, 0.17, 0.08, 0));
      } else if (type === 'battery') {
        for (k = 0; k < 2; k++) { g.add(Geo.lathe([[0.0, 0], [0.016, 0], [0.016, 0.055], [0.006, 0.058], [0.006, 0.062], [0, 0.062]], 8).xf(k * 0.036 - 0.018, 0, 0).color(0.75, 0.12, 0.08, 0)); }
      } else if (type === 'film') {
        g.add(Geo.lathe([[0.0, 0], [0.02, 0], [0.02, 0.05], [0.007, 0.052], [0.007, 0.06], [0, 0.06]], 10).color(0.8, 0.6, 0.1, 0));
      } else if (type === 'ring') {
        g.add(Geo.lathe([[0.011, -0.0035], [0.0145, -0.0035], [0.0155, 0], [0.0145, 0.0035], [0.011, 0.0035], [0.0105, 0], [0.011, -0.0035]], 16).xf(0, 0.016, 0, Math.PI / 2, 0, 0).color(0.8, 0.82, 0.86, 0));
      } else { // nhật ký / giấy
        g.add(Geo.box(0.16, 0.012, 0.22).color(1, 1, 1, 0).boxUV(3)); g.add(Geo.box(0.165, 0.004, 0.225).xf(0, -0.008, 0).color(0.3, 0.1, 0.08, 0));
      }
      itemCache[type] = g = H.R.mesh(g);
    }
    var paper = (type === 'note');
    return new Node(g, { tex: paper ? 'paper' : 'plain', rough: 0.45, emis: [0.02, 0.016, 0.01], tint: [1, 1, 1, 1] });
  };

  /* bóng ma ký ức (hiện trường tâm linh) */
  Md.specter = function (pose) {
    var g = new Geo();
    g.add(Geo.lathe([[0.34, 0], [0.28, 0.4], [0.2, 0.9], [0.22, 1.25], [0.17, 1.42], [0.06, 1.48]], 10));
    g.add(Geo.sphere(0.11, 10, 8).xf(0, 1.6, 0));
    if (pose === 'reach') { g.add(Geo.tube([[0.18, 1.35, 0], [0.3, 1.2, 0.3], [0.32, 1.3, 0.62]], 0.04, 5, true)); g.add(Geo.tube([[-0.18, 1.35, 0], [-0.3, 1.2, 0.3], [-0.3, 1.32, 0.6]], 0.04, 5, true)); }
    else if (pose === 'bound') { g.add(Geo.tube([[0.2, 1.35, 0], [0.16, 1.0, -0.15], [0.02, 0.85, -0.2]], 0.04, 5, true)); g.add(Geo.tube([[-0.2, 1.35, 0], [-0.16, 1.0, -0.15], [-0.02, 0.85, -0.2]], 0.04, 5, true)); for (var k = 0; k < 4; k++) g.add(Geo.lathe([[0.25, 0], [0.25, 0.04]], 10).xf(0, 0.85 + k * 0.14, 0)); }
    else { g.add(Geo.tube([[0.2, 1.35, 0], [0.3, 1.0, 0.05], [0.3, 0.7, 0.1]], 0.04, 5, true)); g.add(Geo.tube([[-0.2, 1.35, 0], [-0.4, 1.5, 0.1], [-0.5, 1.85, 0.15]], 0.04, 5, true)); }
    return new Node(H.R.mesh(g), { tex: 'plain', unlit: 0.42, skin: 1, tint: [0.45, 0.7, 1.0, 0], additive: true });
  };

  /* ====================== LỆ NƯƠNG ====================== */
  Md.ghost = function () {
    var R = H.R, rnd = H.rng(1874), k, rig = { mats: [] };
    function mat(m) { rig.mats.push(m); m.zw = !m.additive; return m; }
    var skin = mat({ tex: 'plain', tint: [0.86, 0.84, 0.82, 1], rough: 0.32, skin: 1.0, emis: [0.012, 0.01, 0.01] });
    var red = mat({ tex: 'silk', tint: [0.55, 0.02, 0.02, 1], rough: 0.5, cloth: 1, skin: 0.25, emis: [0.012, 0, 0] });
    var dark = mat({ tex: 'silk', tint: [0.12, 0.01, 0.012, 1], rough: 0.7, cloth: 1.3 });
    var pale = mat({ tex: 'silk', tint: [0.72, 0.66, 0.62, 1], rough: 0.55, cloth: 0.8, skin: 0.3 });
    var hairM = mat({ tex: 'plain', tint: [0.012, 0.012, 0.016, 1], rough: 0.25, cloth: 1.2 });
    var eyeM = mat({ tex: 'plain', tint: [0, 0, 0, 1], unlit: 1, emis: [6.0, 0.12, 0.04] });
    var blackM = mat({ tex: 'plain', tint: [0, 0, 0, 1], unlit: 1, emis: [0, 0, 0] });
    var haloM = mat({ tex: 'plain', tint: [1.0, 0.05, 0.02, 0.35], unlit: 1.4, additive: true });

    var root = new Node(), body = root.add(new Node());
    // váy 3 lớp rách tả tơi
    function skirt(sc, rot, seed) {
      var g = Geo.lathe([[0.58, -0.2], [0.5, 0.15], [0.38, 0.55], [0.24, 0.92], [0.16, 1.1]], 18, 1), r2 = H.rng(seed), tat = [];
      for (k = 0; k <= 18; k++) tat.push((r2() - 0.6) * 0.45); tat[18] = tat[0];
      var p = g.p;
      for (k = 0; k < p.length; k += 3) { var vi = k / 3, ring = Math.floor(vi / 19), col = vi % 19; if (ring === 0) p[k + 1] += tat[col]; else if (ring === 1) p[k + 1] += tat[col] * 0.35; }
      g.xf(0, 0, 0, 0, rot, 0, sc, 1, sc * 0.8);
      g.colorFn(function (x, y) { var t = M.clamp(1 - (y + 0.2) / 1.3, 0, 1), st = 0.6 + 0.4 * H.Assets.fbm(x * 4 + seed, y * 4, 3); return [st, st, st, Math.pow(t, 1.4)]; });
      g.computeNormals();
      return R.mesh(g);
    }
    body.add(new Node(skirt(0.92, 0.4, 3), dark)); body.add(new Node(skirt(1.0, 0, 9), red)); body.add(new Node(skirt(1.1, 1.1, 5), pale));
    // thân: yếm lụa
    var tg = Geo.lathe([[0.15, 1.05], [0.165, 1.2], [0.19, 1.38], [0.2, 1.5], [0.165, 1.6], [0.07, 1.66], [0.052, 1.78]], 14, 1);
    tg.xf(0, 0, 0, 0, 0, 0, 1, 1, 0.66);
    tg.colorFn(function (x, y, z) { var b = M.smooth(0.2, 0.5, H.Assets.fbm(x * 9, y * 7 + z * 5, 3) + 0.25); return y > 1.6 ? [1.5, 1.5, 1.5, 0] : [1 - b * 0.6, 1 - b * 0.9, 1 - b * 0.9, 0]; });
    body.add(new Node(R.mesh(tg), red));
    // lụa điều trói
    var sg = new Geo();
    for (k = 0; k < 6; k++) {
      var a = rnd() * 6.28, y0 = 1.1 + rnd() * 0.4, rr = 0.2, L = 0.9 + rnd() * 0.8;
      var pts = [[Math.cos(a) * rr, y0, Math.sin(a) * rr * 0.7], [Math.cos(a) * (rr + 0.15), y0 - L * 0.3, Math.sin(a) * (rr + 0.15)], [Math.cos(a + 0.4) * (rr + 0.3), y0 - L * 0.7, Math.sin(a + 0.4) * (rr + 0.3)], [Math.cos(a + 0.9) * (rr + 0.4), y0 - L, Math.sin(a + 0.9) * (rr + 0.4)]];
      var tb = Geo.tube(pts, function (t) { return 0.035 - t * 0.02; }, 3, true);
      tb.colorFn(function (x, y) { var t = M.clamp((y0 - y) / L, 0, 1); return [1.3, 0.6, 0.6, t * 1.2]; });
      sg.add(tb);
    }
    body.add(new Node(R.mesh(sg), red));
    // cổ + đầu
    var neck = body.add(new Node()); neck.set(0, 1.78, 0);
    var hg = Geo.sphere(0.115, 22, 16).xf(0, 0, 0, 0, -Math.PI / 2, 0, 1, 1.28, 0.98);
    hg.displace(function (x, y, z) {
      if (z < 0) return 0;
      var e = Math.min(Math.hypot(x - 0.042, y - 0.018), Math.hypot(x + 0.042, y - 0.018)), m = Math.hypot(x * 0.8, y + 0.075);
      return -0.022 * (1 - M.smooth(0.0, 0.034, e)) - 0.02 * (1 - M.smooth(0, 0.04, m)) + 0.012 * (1 - M.smooth(0, 0.03, Math.hypot(x, y + 0.02)));
    }, true);
    hg.colorFn(function (x, y, z) {
      if (z < 0.02) return [1, 1, 1, 0];
      var tear = (1 - M.smooth(0.004, 0.013, Math.min(Math.abs(x - 0.043), Math.abs(x + 0.043)))) * M.smooth(0.02, 0.0, y) * M.smooth(-0.15, -0.09, y);
      var eye = 1 - M.smooth(0.016, 0.04, Math.min(Math.hypot(x - 0.042, y - 0.018), Math.hypot(x + 0.042, y - 0.018)));
      var mo = 1 - M.smooth(0.012, 0.04, Math.hypot(x * 0.75, y + 0.075));
      var d = Math.max(eye, mo);
      return [(1 - d) * (1 - tear * 0.45), (1 - d) * (1 - tear * 0.95), (1 - d) * (1 - tear * 0.95), 0];
    });
    var head = neck.add(new Node(R.mesh(hg), skin)); head.set(0, 0.13, 0.01);
    for (k = -1; k <= 1; k += 2) {
      var ey = head.add(new Node(R.mesh(Geo.sphere(0.011, 8, 6)), eyeM)); ey.set(k * 0.042, 0.018, 0.094);
      var hl = head.add(new Node(R.mesh(Geo.sphere(0.05, 8, 6)), haloM)); hl.set(k * 0.042, 0.018, 0.1);
    }
    var mouth = head.add(new Node(R.mesh(Geo.sphere(0.03, 10, 8)), blackM)); mouth.set(0, -0.078, 0.088); mouth.scl = [1, 0.5, 0.5];
    // tóc: 46 lọn dài
    var hairG = new Geo();
    for (k = 0; k < 46; k++) {
      var front = k >= 40, ang = front ? (rnd() - 0.5) * 1.0 : Math.PI + (rnd() - 0.5) * 4.4, el = 0.35 + rnd() * 0.9;
      var sx = Math.sin(ang) * Math.sin(el), sz = Math.cos(ang) * Math.sin(el), sy = Math.cos(el);
      var p0 = [sx * 0.112, sy * 0.145, sz * 0.11], Ln = (front ? 0.5 : 0.9) + rnd() * 0.75, hp = [p0], out = 0.05 + rnd() * 0.07;
      for (var s = 1; s <= 6; s++) { var t = s / 6; hp.push([p0[0] + sx * out * Math.sqrt(t) + (rnd() - 0.5) * 0.03, p0[1] - Ln * t * t * 0.4 - Ln * t * 0.6, p0[2] + sz * out * Math.sqrt(t) + (rnd() - 0.5) * 0.03 + (front ? 0.03 * t : -0.02 * t)]); }
      var py0 = p0[1], hb = Geo.tube(hp, function (t) { return 0.016 - t * 0.011; }, 3, true);
      (function (py0, Ln) { hb.colorFn(function (x, y) { var t = M.clamp((py0 - y) / Ln, 0, 1); return [1, 1, 1, Math.pow(t, 1.5) * 0.9]; }); })(py0, Ln);
      hairG.add(hb);
    }
    hairG.add(Geo.sphere(0.119, 14, 8).xf(0, 0.012, -0.012, 0, 0, 0, 1, 1.27, 1.0));
    head.add(new Node(R.mesh(hairG), hairM));
    // tay xương dài
    function arm(side) {
      var sh = body.add(new Node()); sh.set(side * 0.2, 1.53, 0);
      var ug = Geo.tube([[0, 0, 0], [side * 0.01, -0.2, 0], [0, -0.4, 0]], function (t) { return 0.036 - t * 0.008; }, 6);
      sh.add(new Node(R.mesh(ug), skin));
      // ống tay áo rách
      var sl = Geo.lathe([[0.13, -0.42], [0.09, -0.2], [0.055, 0.0]], 8, 1);
      sl.colorFn(function (x, y) { var t = -y / 0.42; return [1, 1, 1, t * 0.7]; });
      var slp = sl.p; for (var q = 0; q < 27; q += 3) slp[q + 1] -= rnd() * 0.18;
      sh.add(new Node(R.mesh(sl), pale));
      var el = sh.add(new Node()); el.set(0, -0.4, 0);
      el.add(new Node(R.mesh(Geo.tube([[0, 0, 0], [0, -0.25, 0.01], [0, -0.5, 0]], function (t) { return 0.027 - t * 0.009; }, 6)), skin));
      var hand = el.add(new Node()); hand.set(0, -0.5, 0);
      var fg = new Geo(); fg.add(Geo.sphere(0.03, 8, 6).xf(0, -0.03, 0, 0, 0, 0, 1, 1.3, 0.5));
      for (var f = 0; f < 5; f++) {
        var fx = (f - 2) * 0.014, sp = (f - 2) * 0.22, fl = f === 0 ? 0.11 : 0.17 + (f === 2 ? 0.04 : 0);
        fg.add(Geo.tube([[fx, -0.05, 0], [fx + Math.sin(sp) * fl * 0.5, -0.05 - fl * 0.5, 0.02], [fx + Math.sin(sp) * fl * 0.85, -0.05 - fl * 0.85, 0.055], [fx + Math.sin(sp) * fl, -0.05 - fl, 0.11]], function (t) { return 0.0075 - t * 0.005; }, 4, true));
      }
      hand.add(new Node(R.mesh(fg), skin));
      return { sh: sh, el: el, hand: hand };
    }
    rig.armL = arm(-1); rig.armR = arm(1);
    rig.root = root; rig.body = body; rig.neck = neck; rig.head = head; rig.mouth = mouth; rig.eyeM = eyeM; rig.haloM = haloM;
    rig.setAlpha = function (a) {
      for (var i = 0; i < rig.mats.length; i++) { var m = rig.mats[i]; if (m === haloM) m.tint[3] = 0.35 * a; else m.tint[3] = a; }
    };
    return rig;
  };
})();
