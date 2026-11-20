/* HUYẾT LỆ THÔN — wilds.js
   Vùng hoang dã ngoài làng (khoảng 500m x 600m):
   Đèo Sạt nơi chiếc U-oát gặp nạn → Rừng Cấm (Miếu Sơn Thần, trạm đo đạc 1934) → sông Âm
   (cầu treo đứt, Bến Dưới, đò ngang) → lối mòn rừng tre về cổng làng.
   Gồm: hành lang đi được, khắc lòng sông, mặt nước, rừng cây instancing hai mức chi tiết (LOD),
   cỏ dương xỉ, lau sậy, đá, gỗ đổ và toàn bộ đạo cụ của các khu mới. */
(function () {
  'use strict';
  var H = window.HuyetLeThon, M = H.M, Geo = H.Geo, Node = H.Node, R = H.R, Md = H.Models, W = H.World;
  var WD = H.Wild = { props: {} };

  /* ---------- mạng lối đi (toạ độ thế giới, bắc = -z) ---------- */
  var PATHS = [
    { id: 'road', hw: 5.0, pts: [[58, 449], [40, 435], [18, 418], [0, 406], [-8, 400]] },
    { id: 'forest', hw: 3.6, pts: [[-8, 400], [-12, 388], [-10, 378], [-18, 366], [-30, 355], [-26, 340], [-14, 328], [-10, 318], [4, 302], [20, 290], [22, 276], [16, 262], [10, 250]] },
    { id: 'bank', hw: 4.2, pts: [[10, 250], [26, 247], [46, 245], [64, 243], [80, 241]] },
    { id: 'north', hw: 3.8, pts: [[80, 209], [66, 206], [52, 204], [38, 193], [30, 185], [20, 170], [14, 160], [8, 145], [4, 130], [2, 114], [0, 98]] }
  ];
  var CLEAR = [[-7, 405, 12], [-33, 355, 9], [20, 290, 13], [10, 249, 6], [90, 244, 11], [80, 209, 6.5]];
  var RIVER = WD.river = { hw: 8, bed: -3.1, y: -1.6, pts: [[-270, 270], [-180, 258], [-120, 250], [-60, 242], [-20, 236], [10, 232], [40, 227], [60, 224], [80, 222], [110, 217], [140, 212], [190, 207], [270, 203]] };
  WD.paths = PATHS; WD.clear = CLEAR;
  var SEG = [], RSEG = [];
  PATHS.forEach(function (p) { for (var k = 0; k < p.pts.length - 1; k++) SEG.push([p.pts[k][0], p.pts[k][1], p.pts[k + 1][0], p.pts[k + 1][1], p.hw, p.id]); });
  for (var k0 = 0; k0 < RIVER.pts.length - 1; k0++) RSEG.push([RIVER.pts[k0][0], RIVER.pts[k0][1], RIVER.pts[k0 + 1][0], RIVER.pts[k0 + 1][1]]);
  function segD(x, z, s) {
    var dx = s[2] - s[0], dz = s[3] - s[1], t = M.clamp(((x - s[0]) * dx + (z - s[1]) * dz) / (dx * dx + dz * dz), 0, 1);
    return Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t);
  }
  /* khoảng cách có dấu tới vùng đi được (<= 0 là bên trong) */
  WD.corr = function (x, z) {
    if (z < 60) return 1e3;
    var best = 1e9, k, d;
    for (k = 0; k < SEG.length; k++) { d = segD(x, z, SEG[k]) - SEG[k][4]; if (d < best) best = d; }
    for (k = 0; k < CLEAR.length; k++) { d = Math.hypot(x - CLEAR[k][0], z - CLEAR[k][1]) - CLEAR[k][2]; if (d < best) best = d; }
    return best;
  };
  WD.nearPath = function (x, z) { var best = 1e9, id = null; for (var k = 0; k < SEG.length; k++) { var d = segD(x, z, SEG[k]) - SEG[k][4]; if (d < best) { best = d; id = SEG[k][5]; } } return id; };
  WD.riverD = function (x, z) {
    if (z < 175 || z > 300) return 1e3;
    var best = 1e9; for (var k = 0; k < RSEG.length; k++) { var d = segD(x, z, RSEG[k]); if (d < best) best = d; }
    return best;
  };
  /* dốc đèo phía nam + gò đất sạt chắn đường */
  WD.lift = function (x, z) {
    var dx = x - 68, dz = z - 457;
    return M.smooth(250, 410, z) * 7 + Math.exp(-(dx * dx + dz * dz) / 260) * 7;
  };
  WD.carve = function (x, z, h) {
    var rd = WD.riverD(x, z); if (rd > RIVER.hw + 7) return h;
    var t = M.smooth(RIVER.hw + 7, RIVER.hw - 1, rd), bed = RIVER.bed + H.Assets.noise(x * 0.15, z * 0.15) * 0.5;
    return M.lerp(h, bed, t);
  };
  /* độ "lối mòn" cho màu đất: đường đèo rộng, lối rừng hẹp, khoảng trống nhạt */
  WD.pathness = function (x, z) {
    if (z < 90) return 0;
    var A = H.Assets, n = A.noise(x * 0.4, z * 0.4) * 0.8, best = 0, k;
    for (k = 0; k < SEG.length; k++) {
      var s = SEG[k], d = segD(x, z, s) + n, v = s[5] === 'road' ? 1 - M.smooth(2.6, 4.6, d) : 1 - M.smooth(1.25, 2.75, d);
      if (v > best) best = v;
    }
    for (k = 0; k < CLEAR.length; k++) { var c = CLEAR[k], dc = Math.hypot(x - c[0], z - c[1]) + n * 2; best = Math.max(best, 0.45 * (1 - M.smooth(c[2] * 0.3, c[2] * 0.85, dc))); }
    return best;
  };
  WD.inRiverZone = function (x, z) { return WD.riverD(x, z) < 34; };

  var ctx, T, rnd;
  function metalMats() {
    if (!R.materials.metal) { R.materials.metal = { alb: R.textures.white, nrm: R.textures.flat, uv: 1 }; R.defineStaticMat('metal', { tex: 'metal', rough: 0.42 }); }
    R.defineStaticMat('canvas', { tex: 'plain', rough: 0.95, cloth: 0.6 });
  }
  function box(w, h, d, x, y, z) { return Geo.box(w, h, d).xf(x, y, z).boxUV(0.5); }
  function wheel(r, w) { return Geo.lathe([[0.02, -w / 2], [r * 0.92, -w / 2], [r, -w * 0.3], [r, w * 0.3], [r * 0.92, w / 2], [0.02, w / 2]], 14, 1); }

  /* ===================== ĐÈO SẠT: xe U-oát lật, vạt núi sạt ===================== */
  /* UAZ-469 (dài 4.0m, rộng 1.8m, cao 2.0m) dựng chi tiết theo hệ toạ độ xe: x ngang, y lên, z mũi xe */
  function side(prof, w, x0) { return Geo.extrude(prof, w).xf(0, 0, 0, 0, -Math.PI / 2, 0).xf(x0 === undefined ? w / 2 : x0, 0, 0); }
  function arch(pts, zc, yc, r, n) { for (var i = 0; i <= n; i++) { var a = Math.PI - i / n * Math.PI; pts.push([zc + Math.cos(a) * r, yc + Math.sin(a) * r]); } }
  function uaz() {
    var body = new Geo(), dark = new Geo(), canv = new Geo(), glass = new Geo(), chrome = new Geo(), rub = new Geo(), red = new Geo(), k, sgn;
    var OL = [0.13, 0.155, 0.085];
    // thân dưới: biên dạng hông có hốc bánh xe
    var pr = [[-1.98, 0.46], [-1.71, 0.46]]; arch(pr, -1.19, 0.44, 0.52, 8); pr.push([0.67, 0.46]); arch(pr, 1.19, 0.44, 0.52, 8);
    pr.push([1.74, 0.46], [1.99, 0.6], [2.02, 0.98], [1.93, 1.13], [0.62, 1.23], [-1.98, 1.19]);
    body.add(side(pr, 1.76).colorFn(function (x, y, z) { // bùn bắn lên nửa dưới thân
      var m = M.clamp((0.85 - y) / 0.4 + H.Assets.noise(x * 3 + z * 2.3, y * 4) * 0.6, 0, 1); return [M.lerp(OL[0], 0.12, m), M.lerp(OL[1], 0.095, m), M.lerp(OL[2], 0.06, m), 0]; }));
    // ca-pô nhô, gân giữa, viền chắn bùn loe
    body.add(Geo.box(1.5, 0.05, 1.28).xf(0, 1.2, 1.28, -0.07, 0, 0).boxUV(0.5).color(OL[0] * 1.08, OL[1] * 1.08, OL[2] * 1.08, 0));
    body.add(Geo.box(0.06, 0.03, 1.2).xf(0, 1.24, 1.28, -0.07, 0, 0).color(OL[0] * 0.9, OL[1] * 0.9, OL[2] * 0.9, 0));
    for (sgn = -1; sgn <= 1; sgn += 2) for (k = -1; k <= 1; k += 2) {
      var fp = []; for (var i = 0; i <= 10; i++) { var aa = Math.PI - i / 10 * Math.PI; fp.push([sgn * 0.9, 0.44 + Math.sin(aa) * 0.55, k * 1.19 + Math.cos(aa) * 0.55]); }
      body.add(Geo.tube(fp, 0.045, 5).color(OL[0] * 0.8, OL[1] * 0.8, OL[2] * 0.8, 0));
    }
    // khung kính chắn gió nghiêng + kính vỡ
    var wsT = -0.16;
    [[-0.85, 0], [0.85, 0], [0, 1]].forEach(function (f) {
      if (f[1]) { body.add(Geo.box(1.72, 0.06, 0.06).xf(0, 1.86, 0.64, wsT, 0, 0).color(OL[0], OL[1], OL[2], 0)); body.add(Geo.box(1.72, 0.06, 0.06).xf(0, 1.25, 0.64).color(OL[0], OL[1], OL[2], 0)); }
      else body.add(Geo.box(0.06, 0.64, 0.06).xf(f[0], 1.56, 0.6, wsT, 0, 0).color(OL[0], OL[1], OL[2], 0));
    });
    glass.add(Geo.box(0.78, 0.56, 0.012).xf(-0.41, 1.56, 0.6, wsT, 0, 0)); // nửa trái còn nguyên
    glass.add(Geo.extrude([[0, 0], [0.78, 0], [0.78, 0.22], [0.5, 0.4], [0.3, 0.18], [0.12, 0.5], [0, 0.56]], 0.012).xf(0.02, 1.28, 0.6, wsT, 0, 0)); // nửa phải vỡ lởm chởm
    // mui bạt có sườn
    var cp = [[-1.98, 1.19], [0.56, 1.19], [0.52, 1.9], [0.38, 1.98], [-1.86, 1.98], [-1.98, 1.88]];
    canv.add(side(cp, 1.74).color(0.15, 0.15, 0.095, 0).colorFn(function (x, y, z) { var n = H.Assets.noise(x * 1.7 + z * 0.9, y * 2.1 + z * 1.3); return [0.15 + n * 0.03, 0.15 + n * 0.03, 0.095 + n * 0.015, 0]; }));
    for (k = 0; k < 4; k++) { var rz = 0.3 - k * 0.72; canv.add(Geo.box(1.76, 0.03, 0.05).xf(0, 1.99, rz).color(0.22, 0.22, 0.14, 0)); }
    for (sgn = -1; sgn <= 1; sgn += 2) { // cửa sổ mica hông, đường cửa, tay nắm, gương
      glass.add(Geo.box(0.012, 0.42, 0.72).xf(sgn * 0.875, 1.6, 0.05)); glass.add(Geo.box(0.012, 0.4, 0.8).xf(sgn * 0.875, 1.6, -1.05));
      [0.58, -0.38, -1.25].forEach(function (z) { dark.add(Geo.box(0.012, 0.72, 0.015).xf(sgn * 0.886, 0.84, z)); });
      dark.add(Geo.box(0.012, 0.015, 1.83).xf(sgn * 0.886, 0.5, -0.33));
      chrome.add(Geo.box(0.03, 0.03, 0.14).xf(sgn * 0.9, 1.05, 0.38)); chrome.add(Geo.box(0.03, 0.03, 0.14).xf(sgn * 0.9, 1.05, -0.6));
      chrome.add(Geo.tube([[sgn * 0.88, 1.24, 0.66], [sgn * 1.02, 1.36, 0.7]], 0.012, 4)); chrome.add(Geo.box(0.05, 0.16, 0.12).xf(sgn * 1.04, 1.42, 0.7));
      // đèn pha tròn, xi-nhan
      var hx = sgn * 0.6; chrome.add(Geo.lathe([[0.0, 0], [0.11, 0], [0.12, 0.05], [0.1, 0.07]], 14).xf(hx, 0.93, 2.0, Math.PI / 2, 0, 0));
      glass.add(Geo.lathe([[0.0, 0.07], [0.098, 0.068]], 14).xf(hx, 0.93, 2.0, Math.PI / 2, 0, 0));
      red.add(Geo.box(0.07, 0.12, 0.03).xf(sgn * 0.78, 0.82, -1.99));
    }
    // lưới tản nhiệt khe đứng, cản trước/sau, móc kéo
    dark.add(Geo.box(0.86, 0.36, 0.03).xf(0, 0.88, 2.015));
    for (k = 0; k < 8; k++) body.add(Geo.box(0.045, 0.34, 0.04).xf(-0.33 + k * 0.094, 0.88, 2.03).color(OL[0] * 1.1, OL[1] * 1.1, OL[2] * 1.1, 0));
    dark.add(Geo.box(1.86, 0.15, 0.14).xf(0, 0.5, 2.1)); dark.add(Geo.box(1.86, 0.15, 0.14).xf(0, 0.5, -2.06));
    for (sgn = -1; sgn <= 1; sgn += 2) { dark.add(Geo.tube([[sgn * 0.5, 0.5, 2.17], [sgn * 0.5, 0.42, 2.26], [sgn * 0.5, 0.52, 2.3]], 0.025, 5)); }
    // gầm xe (lộ ra vì xe lật nghiêng): khung, cầu, các-đăng, nhíp, bình xăng, ống xả
    for (sgn = -1; sgn <= 1; sgn += 2) { dark.add(Geo.box(0.08, 0.14, 3.7).xf(sgn * 0.42, 0.4, 0)); dark.add(Geo.box(0.07, 0.06, 1.0).xf(sgn * 0.62, 0.33, 1.19)); dark.add(Geo.box(0.07, 0.06, 1.0).xf(sgn * 0.62, 0.33, -1.19)); }
    for (k = -1; k <= 1; k += 2) { dark.add(Geo.tube([[-0.7, 0.38, k * 1.19], [0.7, 0.38, k * 1.19]], 0.055, 8, true)); dark.add(Geo.sphere(0.15, 10, 8).xf(0.12, 0.38, k * 1.19)); }
    dark.add(Geo.tube([[0.1, 0.38, -1.05], [0.06, 0.42, 0], [0.1, 0.38, 1.05]], 0.035, 6, true));
    dark.add(Geo.box(0.6, 0.24, 0.5).xf(-0.25, 0.45, -0.6)); dark.add(Geo.tube([[0.3, 0.35, 0.8], [0.32, 0.33, -1.0], [0.36, 0.33, -2.05]], 0.03, 6, true));
    // bánh xe: lốp có gai + vành thép + bánh dự phòng sau
    function wheelAt(cx, cy, cz, rx, ry, rz) {
      var t = Geo.lathe([[0.2, -0.125], [0.33, -0.125], [0.375, -0.1], [0.385, 0], [0.375, 0.1], [0.33, 0.125], [0.2, 0.125]], 20, 1);
      t.displace(function (px, py, pz) { var a = Math.atan2(pz, px); return Math.hypot(px, pz) > 0.36 ? (Math.sin(a * 22) > 0.2 ? 0.012 : -0.006) : 0; });
      rub.add(t.xf(0, 0, 0, Math.PI / 2, 0, 0).xf(0, 0, 0, 0, Math.PI / 2, 0).xf(cx, cy, cz, rx || 0, ry || 0, rz || 0));
      var rim = Geo.lathe([[0.0, 0.11], [0.12, 0.11], [0.2, 0.09], [0.21, 0.0]], 14);
      chrome.add(rim.xf(0, 0, 0, Math.PI / 2, 0, 0).xf(0, 0, 0, 0, Math.PI / 2, 0).xf(cx, cy, cz, rx || 0, ry || 0, rz || 0));
    }
    wheelAt(0.74, 0.38, 1.19); wheelAt(-0.74, 0.38, 1.19); wheelAt(0.74, 0.38, -1.19); wheelAt(-0.72, 0.36, -1.19, 0, 0.12, 0.06);
    wheelAt(0, 1.0, -2.12, 0, Math.PI / 2, 0);
    // can xăng hông xe
    body.add(Geo.box(0.12, 0.45, 0.32).xf(-0.95, 1.0, -1.6).boxUV(0.4).color(0.17, 0.2, 0.11, 0));
    return { body: body, dark: dark.color(0.035, 0.035, 0.035, 0), canv: canv, glass: glass.color(0.07, 0.09, 0.1, 0), chrome: chrome.color(0.45, 0.46, 0.44, 0), rub: rub.color(0.03, 0.03, 0.03, 0), red: red.color(0.45, 0.05, 0.03, 0) };
  }
  function buildCrash() {
    metalMats();
    R.defineStaticMat('rubber', { tex: 'plain', rough: 0.88 }); R.defineStaticMat('paint', { tex: 'metal', rough: 0.62 }); R.defineStaticMat('glass', { tex: 'metal', rough: 0.12 });
    var P = WD.props, jx = -14.5, jz = 409, jy = T(jx, jz), k, SC = 1.12;
    var J = uaz(), roll = -1.42, ry = 0.55, parts = [[J.body, 'paint'], [J.dark, 'metal'], [J.canv, 'canvas'], [J.glass, 'glass'], [J.chrome, 'metal'], [J.rub, 'rubber'], [J.red, 'metal']];
    // lật nghiêng sang phải, mui bạt tì xuống đất; tính độ cao để thân chạm mặt đường
    var minY = 1e9;
    parts.forEach(function (e) { e[0].xf(0, 0, 0, 0, 0, roll, SC, SC, SC); for (var q = 1; q < e[0].p.length; q += 3) minY = Math.min(minY, e[0].p[q]); });
    var sy = jy - minY - 0.06;
    parts.forEach(function (e) { e[0].xf(jx, sy, jz, 0, ry, 0); ctx.add(e[1], e[0]); });
    function wp(lx, ly, lz) { var g = new Geo(); g.v(lx, ly, lz, 0, 1, 0, 0, 0); g.xf(0, 0, 0, 0, 0, roll, SC, SC, SC).xf(jx, sy, jz, 0, ry, 0); return [g.p[0], g.p[1], g.p[2]]; }
    for (k = -1; k <= 1; k++) { var cc = wp(-0.2, 1.0, k * 1.5); ctx.circle(cc[0], cc[2], 1.45); }
    // đèn pha trái còn chập chờn (sau khi lật nằm phía trên)
    var hp = wp(-0.6, 0.93, 2.09);
    var hl = new Node(R.mesh(Geo.sphere(0.1, 10, 8)), { tex: 'plain', unlit: 1, tint: [1, 0.92, 0.7, 1], emis: [2.5, 2.2, 1.6] }); hl.set(hp[0], hp[1], hp[2]); ctx.node(hl);
    P.headLight = ctx.light([hp[0] + Math.sin(ry) * 1.4, hp[1] + 0.1, hp[2] + Math.cos(ry) * 1.4], [1.0, 0.86, 0.6], 13, 1.7); P.headNode = hl;
    P.jeep = { x: jx, z: jz, y: jy };
    // vệt trượt bánh xe từ mặt đường tới chỗ xe nằm
    for (k = 0; k < 2; k++) {
      var off = k ? 0.8 : -0.8, sk = new Geo();
      for (var t = 0; t < 14; t++) { var u = t / 13, sx = M.lerp(14, jx + 2.4, u) + off * 0.5, sz = M.lerp(418, jz + 1.8, u) + off; sk.add(Geo.box(0.32, 0.02, 1.15).xf(sx, T(sx, sz) + 0.025, sz, 0, Math.atan2(jx - 14, jz - 418), 0).color(0.33, 0.3, 0.27, 0)); }
      ctx.add('mud', sk);
    }
    // đồ đạc văng ra: ba lô, va li, giấy tờ ướt, mảnh kính
    var bag = new Geo(); bag.add(Geo.box(0.36, 0.48, 0.22).boxUV(0.4)); bag.add(Geo.box(0.3, 0.2, 0.08).xf(0, -0.08, 0.14).boxUV(0.4)); bag.color(0.3, 0.27, 0.16, 0);
    ctx.add('canvas', bag.xf(0, 0, 0, 1.45, 0, 0.3).xf(jx + 3.1, T(jx + 3.1, jz + 2.2) + 0.12, jz + 2.2, 0, 0.9, 0));
    var sc2 = new Geo(); sc2.add(Geo.box(0.62, 0.42, 0.2).boxUV(0.4).color(0.28, 0.17, 0.09, 0)); sc2.add(Geo.box(0.16, 0.04, 0.04).xf(0, 0.23, 0).color(0.1, 0.07, 0.05, 0));
    ctx.add('bark', sc2.xf(0, 0, 0, Math.PI / 2 - 0.05, 0, 0).xf(jx + 1.2, T(jx + 1.2, jz + 3.6) + 0.1, jz + 3.6, 0, -0.4, 0));
    for (k = 0; k < 9; k++) { var px = jx + 1.5 + rnd() * 4, pz = jz - 1.5 + rnd() * 5; ctx.add('paper', Geo.box(0.21, 0.004, 0.29).boxUV(1).xf(px, T(px, pz) + 0.012, pz, (rnd() - 0.5) * 0.1, rnd() * 6.28, 0).color(0.75, 0.72, 0.62, 0)); }
    for (k = 0; k < 26; k++) { var gx = jx + 0.5 + rnd() * 3.2, gz = jz + 1.6 + rnd() * 2.2, gs = 0.03 + rnd() * 0.06; ctx.add('glass', Geo.box(gs, 0.006, gs * 0.8).xf(gx, T(gx, gz) + 0.01, gz, 0, rnd() * 6.28, 0).color(0.35, 0.4, 0.42, 0)); }
    // cành cây gãy đè lên xe
    var by = sy + 1.9 * SC; ctx.add('bark', Geo.tube([[jx - 2.6, T(jx - 2.6, jz - 2.2) + 0.1, jz - 2.2], [jx - 0.6, by - 0.15, jz - 0.4], [jx + 1.6, by + 0.2, jz + 1.4]], function (t) { return 0.2 - t * 0.12; }, 7, true).scaleUV(2, 0.4));
    // gò sạt: đá tảng + cây gãy chắn đường đèo
    for (k = 0; k < 46; k++) {
      var a = rnd() * 6.28, rr = Math.sqrt(rnd()) * 15, rx = 66 + Math.cos(a) * rr, rz = 455 + Math.sin(a) * rr * 0.8;
      Md.rock(ctx, rx, rz, 0.9 + rnd() * 2.6 * (1 - rr / 18), k * 1.7);
    }
    for (k = 0; k < 6; k++) { var lx = 50 + rnd() * 26, lz = 444 + rnd() * 18, la = rnd() * 3.14, ll = 5 + rnd() * 5, ly = T(lx, lz) + 0.3;
      ctx.add('bark', Geo.tube([[lx - Math.cos(la) * ll / 2, ly, lz - Math.sin(la) * ll / 2], [lx, ly + 0.3, lz], [lx + Math.cos(la) * ll / 2, ly + 0.1, lz + Math.sin(la) * ll / 2]], function (t) { return 0.32 - t * 0.14; }, 8, true).scaleUV(2, 0.4)); }
    // cột cây số đổ
    var mk = new Geo(); mk.add(box(0.36, 0.8, 0.14, 0, 0.4, 0).color(0.85, 0.85, 0.82, 0)); mk.add(Geo.lathe([[0.18, 0], [0.18, 0.1]], 10).xf(0, 0.8, 0, Math.PI / 2, 0, 0).color(0.7, 0.1, 0.08, 0));
    mk.xf(0, 0, 0, 0, 0, 1.2).xf(9, T(9, 418) + 0.12, 418, 0, 0.4, 0); ctx.add('stone', mk);
  }

  /* ===================== RỪNG CẤM: Miếu Sơn Thần ===================== */
  function buildShrine() {
    var F = Md.Frame(-37.5, T(-37.5, 355), 355, 1), y0 = F.y, st = new Geo(), wd = new Geo(), k;
    st.add(box(3.2, 0.9, 3.0, 0, -0.2, 0)); st.add(box(1.4, 0.3, 0.6, 0, 0.1, 1.8)); st.add(box(1.4, 0.18, 0.5, 0, -0.05, 2.25));
    st.add(box(1.4, 0.75, 0.8, 0, 0.62, -0.7)); // bệ thờ
    [[-1.2, -1.15], [1.2, -1.15], [-1.2, 1.15], [1.2, 1.15]].forEach(function (p) { wd.add(Geo.lathe([[0.1, 0], [0.085, 2.1], [0.11, 2.2]], 8).xf(p[0], 0.25, p[1])); });
    wd.add(box(2.7, 0.14, 0.16, 0, 2.38, -1.15)); wd.add(box(2.7, 0.14, 0.16, 0, 2.38, 1.15));
    F.put(ctx, 'stone', st); F.put(ctx, 'wood', wd);
    F.put(ctx, 'roof', Md.roofGeo(3.8, 3.5, 1.15, 0.55).xf(0, 2.45, 0));
    // bài vị đá "SƠN THẦN", bát hương, nến
    W.textMat('shrineT', ['SƠN', 'THẦN'], { w: 128, h: 256, size: 70, bold: true, color: '#5a1a10', glow: 'rgba(0,0,0,0.6)', bg: 'rgba(120,110,95,1)' });
    var pl = F.pt(0, -0.95); F.put(ctx, 'stone', box(0.46, 0.8, 0.08, 0, 1.4, -0.95).color(0.5, 0.46, 0.4, 0)); var tp2 = F.pt(0, -0.905), tab = new Node(R.mesh(Geo.quad([-0.2, -0.36, 0], [0.2, -0.36, 0], [0.2, 0.36, 0], [-0.2, 0.36, 0])), { tex: 'shrineT', rough: 0.8 }); tab.set(tp2[0], y0 + 1.4, tp2[1]); tab.rot[1] = F.a; ctx.node(tab);
    var bw = F.pt(0, -0.5); ctx.add('stone', Geo.lathe([[0, 0], [0.16, 0.02], [0.2, 0.12], [0.17, 0.2], [0, 0.18]], 12).xf(bw[0], y0 + 1.0, bw[1]).color(0.45, 0.4, 0.35, 0));
    for (k = 0; k < 5; k++) { var ip = F.pt(-0.08 + k * 0.04, -0.5); ctx.add('plain', Geo.tube([[ip[0], y0 + 1.15, ip[1]], [ip[0] + (k - 2) * 0.01, y0 + 1.42, ip[1]]], 0.006, 3).color(0.45, 0.12, 0.08, 0)); }
    var cp = [F.pt(-0.5, -0.6), F.pt(0.5, -0.6)], cm = { tex: 'plain', unlit: 1, tint: [1, 0.85, 0.6, 1], emis: [3, 1.5, 0.4] };
    cp.forEach(function (c) { ctx.add('plain', Geo.lathe([[0.03, 0], [0.03, 0.16]], 8).xf(c[0], y0 + 1.0, c[1]).color(0.9, 0.85, 0.75, 0)); var fl = new Node(R.mesh(Geo.sphere(0.018, 6, 5).xf(0, 0, 0, 0, 0, 0, 1, 2.2, 1)), cm); fl.set(c[0], y0 + 1.2, c[1]); ctx.node(fl); });
    WD.props.shrineLight = ctx.light([F.pt(0, 0.2)[0], y0 + 1.6, F.pt(0, 0.2)[1]], [1.0, 0.6, 0.3], 7, 0.9);
    WD.props.shrine = { x: -37.5, z: 355, y: y0, front: F.pt(0, 2.6), back: F.pt(0, -3.4), F: F };
    // tượng đá ngựa ông, đá rêu quanh miếu
    for (k = 0; k < 9; k++) { var a = k / 9 * 6.28, rp = F.pt(Math.cos(a) * 3.6, Math.sin(a) * 3.4); if (Math.sin(a) > 0.6 && Math.abs(Math.cos(a)) < 0.5) continue; Md.rock(ctx, rp[0], rp[1], 0.4 + rnd() * 0.5, k * 2.3); }
    ctx.box(F.rect(-1.6, -1.5, 1.6, 1.5)[0], F.rect(-1.6, -1.5, 1.6, 1.5)[1], F.rect(-1.6, -1.5, 1.6, 1.5)[2], F.rect(-1.6, -1.5, 1.6, 1.5)[3]);
  }

  /* ===================== TRẠM ĐO ĐẠC 1934 ===================== */
  function tent(x, z, ry, L, w, h, col, closed, torn) {
    var g = new Geo(), y = T(x, z) - 0.05, hw = w / 2;
    function q(a, b, c, d) { var qq = Geo.quad(a, b, c, d); g.add(qq); }
    var n = 4;
    for (var k = 0; k < n; k++) {
      var z0 = -L / 2 + k * L / n, z1 = z0 + L / n, r = torn && k === n - 1 ? 0.5 : 1;
      q([-hw, 0, z0], [-hw, 0, z1], [0, h, z1], [0, h, z0]);
      q([hw * r, h * (1 - r), z1], [hw * r, h * (1 - r), z0], [0, h, z0], [0, h, z1]);
    }
    q([-hw, 0, -L / 2], [0, h, -L / 2], [0, h, -L / 2], [hw, 0, -L / 2]);
    if (closed) q([-hw, 0, L / 2], [hw, 0, L / 2], [0, h, L / 2], [0, h, L / 2]);
    else { q([-hw, 0, L / 2], [-hw * 0.2, 0, L / 2 + 0.6], [0, h, L / 2], [0, h, L / 2]); }
    g.colorFn(function (px, py) { return [col[0], col[1], col[2], 0.12 * (1 - py / h)]; });
    g.computeNormals(); g.xf(x, y, z, 0, ry, 0); ctx.add('canvas', g);
    ctx.circle(x, z, Math.min(L, w) * 0.5);
    var p = Md.Frame(x, y, z, 0); return { x: x, z: z, y: y, door: [x + Math.sin(ry) * (L / 2 + 0.9), z + Math.cos(ry) * (L / 2 + 0.9)] };
  }
  function buildCamp() {
    metalMats();
    var P = WD.props, k, g;
    P.tentA = tent(13.5, 295, 0.4, 3.2, 2.4, 1.8, [0.42, 0.4, 0.28], false, true);
    P.tentB = tent(27, 297, -0.5, 3.0, 2.2, 1.7, [0.4, 0.38, 0.27], false, false);
    P.darkroom = tent(25.5, 283.5, -2.2, 2.0, 1.8, 1.75, [0.06, 0.055, 0.05], true, false);
    // bàn gấp + nhật trình
    var tx = 18.5, tz = 287.5, ty = T(tx, tz); g = new Geo();
    g.add(box(1.5, 0.05, 0.8, 0, 0.78, 0)); [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]].forEach(function (p) { g.add(box(0.05, 0.78, 0.05, p[0], 0.39, p[1])); });
    g.xf(tx, ty, tz, 0, 0.2, 0); ctx.add('wood', g); ctx.circle(tx, tz, 0.7, { low: true });
    P.table = [tx, ty + 0.83, tz];
    // kinh vĩ trên giá ba chân
    var vx = 12, vz = 286.5, vy = T(vx, vz), tr = new Geo();
    for (k = 0; k < 3; k++) { var a = k / 3 * 6.28; tr.add(Geo.tube([[0, 1.35, 0], [Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55]], 0.022, 5)); }
    tr.color(0.5, 0.38, 0.22, 0); tr.xf(vx, vy, vz); ctx.add('wood', tr);
    var th = new Geo(); th.add(Geo.lathe([[0.06, 0], [0.06, 0.32]], 10).xf(0, 0, 0, Math.PI / 2, 0, 0).xf(0, 1.5, 0.15)); th.add(box(0.16, 0.16, 0.12, 0, 1.43, 0)); th.color(0.55, 0.45, 0.2, 0);
    th.xf(vx, vy, vz, 0, 1.2, 0); ctx.add('metal', th);
    // hòm sắt của đoàn
    var cx = 28.5, cz = 290.5, cy = T(cx, cz), ch = new Geo();
    ch.add(box(1.0, 0.5, 0.62, 0, 0.25, 0)); ch.add(box(1.04, 0.06, 0.66, 0, 0.08, 0)); ch.add(box(1.04, 0.06, 0.66, 0, 0.44, 0)); ch.color(0.16, 0.17, 0.16, 0);
    ch.xf(cx, cy, cz, 0, -0.3, 0); ctx.add('metal', ch); ctx.circle(cx, cz, 0.6, { low: true });
    var lid = new Node(R.mesh(box(1.02, 0.1, 0.64, 0, 0.05, 0.32).color(0.17, 0.18, 0.17, 0)), { tex: 'metal', rough: 0.4 });
    lid.set(cx - Math.sin(-0.3) * 0.31, cy + 0.5, cz - Math.cos(-0.3) * 0.31); lid.rot[1] = -0.3; ctx.node(lid);
    P.chest = { pos: [cx, cy + 0.6, cz], lid: lid, x: cx, z: cz, y: cy };
    // thùng gỗ, bếp lửa nguội, mộ chữ thập
    for (k = 0; k < 5; k++) { var bx2 = 15 + rnd() * 3 + (k > 2 ? 9 : 0), bz2 = 298 - rnd() * 3 - (k > 2 ? 2 : 0), s = 0.45 + rnd() * 0.25; ctx.add('wood', box(s, s, s * 1.3, bx2, T(bx2, bz2) + s / 2, bz2).xf(0, 0, 0).color(0.7, 0.62, 0.5, 0)); ctx.circle(bx2, bz2, s * 0.7, { low: true }); }
    var fx = 19.5, fz = 292, fy = T(fx, fz);
    for (k = 0; k < 9; k++) { var a2 = k / 9 * 6.28; Md.rock(ctx, fx + Math.cos(a2) * 0.7, fz + Math.sin(a2) * 0.7, 0.18 + rnd() * 0.08, k); }
    for (k = 0; k < 4; k++) { var a3 = k * 0.8; ctx.add('bark', Geo.tube([[fx - Math.cos(a3) * 0.5, fy + 0.08, fz - Math.sin(a3) * 0.5], [fx + Math.cos(a3) * 0.5, fy + 0.12, fz + Math.sin(a3) * 0.5]], 0.06, 6, true).color(0.15, 0.12, 0.1, 0)); }
    var gx = 30.5, gz = 284, gy = T(gx, gz), cr = new Geo();
    cr.add(box(0.1, 1.3, 0.08, 0, 0.65, 0)); cr.add(box(0.7, 0.09, 0.08, 0, 1.0, 0)); cr.xf(gx, gy, gz, 0.12, 0.3, 0.05); ctx.add('wood', cr);
    ctx.add('mud', Geo.sphere(1, 10, 6).xf(gx - 0.2, gy - 0.25, gz + 1.0, 0, 0.3, 0, 0.6, 0.35, 1.2).color(0.6, 0.5, 0.42, 0));
    W.textMat('morelT', ['L. MOREL', '† 1934'], { w: 256, h: 128, size: 40, bold: true, color: '#d8d0c0', glow: 'rgba(0,0,0,0.8)', bg: 'rgba(40,30,22,1)' });
    var pq = new Node(R.mesh(Geo.quad([-0.2, -0.1, 0], [0.2, -0.1, 0], [0.2, 0.1, 0], [-0.2, 0.1, 0])), { tex: 'morelT', rough: 0.8 }); pq.set(gx + Math.sin(0.3) * 0.05, gy + 1.05, gz + Math.cos(0.3) * 0.05); pq.rot[1] = 0.3; ctx.node(pq);
    P.grave = [gx, gy, gz];
    // đèn bão treo trên cọc (tắt, chỉ còn tàn hồng)
    ctx.add('wood', Geo.lathe([[0.06, 0], [0.05, 2.4]], 6).xf(22.5, T(22.5, 293.5), 293.5)); ctx.circle(22.5, 293.5, 0.15);
    P.campLight = ctx.light([22.5, T(22.5, 293.5) + 2.0, 293.5], [1.0, 0.45, 0.2], 9, 0.55);
    // bản đồ dây thép: dây căng giữa các cọc
    ctx.add('plain', Geo.tube([[13.5, T(13.5, 297) + 1.8, 296.5], [20, T(20, 297) + 1.5, 297], [27, T(27, 298) + 1.7, 298.6]], 0.008, 3).color(0.3, 0.28, 0.24, 0));
  }

  /* ===================== SÔNG ÂM: nước, cầu treo đứt, Bến Dưới, đò ngang ===================== */
  function buildWater() {
    var pts = RIVER.pts, samp = [], k, i, Wd = RIVER.hw + 6.5, NA = 8;
    for (k = 0; k < pts.length - 1; k++) {
      var a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 4);
      for (i = 0; i < n; i++) samp.push([M.lerp(a[0], b[0], i / n), M.lerp(a[1], b[1], i / n)]);
    }
    samp.push(pts[pts.length - 1].slice());
    var SS = [0], NN = [];
    for (k = 0; k < samp.length; k++) {
      var q = samp[Math.min(samp.length - 1, k + 1)], o = samp[Math.max(0, k - 1)], tx = q[0] - o[0], tz = q[1] - o[1], tl = Math.hypot(tx, tz) || 1;
      NN.push([-tz / tl, tx / tl]); if (k > 0) SS.push(SS[k - 1] + Math.hypot(samp[k][0] - samp[k - 1][0], samp[k][1] - samp[k - 1][1]));
    }
    for (var c0 = 0; c0 < samp.length - 1; c0 += 10) {
      var c1 = Math.min(samp.length - 1, c0 + 10), geo = new Geo();
      for (k = c0; k <= c1; k++) for (i = 0; i <= NA; i++) {
        var t = i / NA * 2 - 1, vi = geo.v(samp[k][0] + NN[k][0] * t * Wd, RIVER.y, samp[k][1] + NN[k][1] * t * Wd, 0, 1, 0, SS[k], t * Wd);
        geo.c[vi * 4] = geo.c[vi * 4 + 1] = geo.c[vi * 4 + 2] = 1; geo.c[vi * 4 + 3] = Math.abs(t);
      }
      for (k = 0; k < c1 - c0; k++) { var r0 = k * (NA + 1), r1 = r0 + NA + 1; for (i = 0; i < NA; i++) geo.i.push(r0 + i, r1 + i, r1 + i + 1, r0 + i, r1 + i + 1, r0 + i + 1); }
      R.addWater(geo);
    }
    // đá giữa dòng, sóng vỗ
    for (k = 0; k < 30; k++) {
      var sg = RSEG[Math.floor(rnd() * RSEG.length)], u = rnd(), sx = M.lerp(sg[0], sg[2], u), sz = M.lerp(sg[1], sg[3], u), off = (rnd() - 0.5) * 2 * (RIVER.hw + 2);
      var dx = sg[2] - sg[0], dz = sg[3] - sg[1], dl = Math.hypot(dx, dz); sx += -dz / dl * off; sz += dx / dl * off;
      if (Math.abs(sx - 80) < 8 && sz < 226 && sz > 208) continue; // luồng đò
      Md.rock(ctx, sx, sz, 0.9 + rnd() * 1.6, k * 3.7);
    }
  }
  function rope(a, b, sag, r) { var pts = [], n = 10; for (var i = 0; i <= n; i++) { var t = i / n; pts.push([M.lerp(a[0], b[0], t), M.lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * sag, M.lerp(a[2], b[2], t)]); } return Geo.tube(pts, r || 0.025, 4).color(0.55, 0.45, 0.3, 0.15); }
  function buildBridge() {
    var g = new Geo(), pl = new Geo(), k, ys = T(10, 244.5), yn = T(10, 219.5), S = 244.5, N = 219.5;
    [[8.7, S], [11.3, S], [8.7, N], [11.3, N]].forEach(function (p) { var y = T(p[0], p[1]); g.add(Geo.lathe([[0.16, -0.6], [0.14, 2.2], [0.17, 2.3]], 8).xf(p[0], y, p[1])); ctx.circle(p[0], p[1], 0.2); });
    // dây cáp đứt: một đoạn rủ xuống nước từ bờ nam, một đoạn từ bờ bắc
    [8.7, 11.3].forEach(function (x, si) {
      g.add(rope([x, ys + 2.15, S], [x + (si ? 0.4 : -0.2), RIVER.y - 0.2, S - 9.5], 0.9, 0.03));
      g.add(rope([x, ys + 1.2, S], [x + (si ? 0.3 : -0.3), RIVER.y - 0.1, S - 8.5], 0.6, 0.025));
      g.add(rope([x, yn + 2.15, N], [x + (si ? -0.5 : 0.2), RIVER.y - 0.3, N + 7.5], 0.8, 0.03));
    });
    for (k = 0; k < 12; k++) { // ván cầu buông thõng
      var t = k / 12, z = S - 0.4 - t * 8.5, y = M.lerp(ys + 1.15, RIVER.y + 0.2, Math.pow(t, 1.4)), ang = 0.4 + t * 0.9;
      pl.add(box(2.4, 0.06, 0.28, 10, 0, 0).xf(0, 0, 0, ang, 0, (rnd() - 0.5) * 0.3).xf(0, y, z));
    }
    for (k = 0; k < 7; k++) { var t2 = k / 7, z2 = N + 0.4 + t2 * 6.5, y2 = M.lerp(yn + 1.1, RIVER.y + 0.3, Math.pow(t2, 1.3)); pl.add(box(2.4, 0.06, 0.28, 10, 0, 0).xf(0, 0, 0, -0.5 - t2 * 0.8, 0, (rnd() - 0.5) * 0.4).xf(0, y2, z2)); }
    pl.add(box(2.4, 0.08, 1.6, 10, ys + 0.12, S - 0.2)); // bậc ván đầu cầu còn lại
    ctx.add('wood', g); ctx.add('wood', pl);
    ctx.floor(8.8, S - 1.0, 11.2, S + 0.6, ys + 0.16, 'wood');
    ctx.box(8.5, S - 1.4, 11.5, S - 1.0); // mép ván gãy
    W.textMat('bridgeT', ['CẦU TREO', 'SÔNG ÂM'], { w: 256, h: 128, size: 44, bold: true, color: '#c8b890', glow: 'rgba(0,0,0,0.8)', bg: 'rgba(36,26,18,1)' });
    var sg = new Geo(); sg.add(Geo.box(0.94, 0.48, 0.04).boxUV(0.5).color(0.45, 0.36, 0.28, 0)); sg.xf(0, 0, 0, 0, 0, 0.12).xf(12.6, ys + 1.5, S + 0.78, 0, 0.15, 0); ctx.add('wood', sg);
    var sign = new Node(R.mesh(Geo.quad([-0.44, -0.22, 0], [0.44, -0.22, 0], [0.44, 0.22, 0], [-0.44, 0.22, 0])), { tex: 'bridgeT', rough: 0.8 }); sign.set(12.6, ys + 1.5, S + 0.805); sign.rot[1] = 0.15; sign.rot[2] = 0.12; ctx.node(sign);
    ctx.add('wood', Geo.lathe([[0.06, 0], [0.05, 1.3]], 6).xf(12.6, ys, S + 0.75)); ctx.circle(12.6, S + 0.75, 0.12);
    WD.props.bridge = { x: 10, z: S, y: ys, nz: N };
  }
  function buildWharf() {
    var P = WD.props, g = new Geo(), pil = new Geo(), k, dy = 0.32, x0 = 80.4, x1 = 83.4, z0 = 225.2, z1 = 237.8;
    for (k = 0; z1 - k * 0.32 > z0; k++) { var z = z1 - k * 0.32 - 0.16; if (rnd() < 0.05) continue; g.add(box(x1 - x0 + (rnd() - 0.5) * 0.2, 0.06, 0.28, (x0 + x1) / 2 + (rnd() - 0.5) * 0.08, dy - 0.03 + (rnd() - 0.5) * 0.02, z).color(0.7 + rnd() * 0.2, 0.62 + rnd() * 0.15, 0.55, 0)); }
    for (k = 0; k < 5; k++) { var pz = z0 + 0.2 + k * 3.0; [x0 + 0.1, x1 - 0.1].forEach(function (px) { pil.add(Geo.lathe([[0.13, -3.4], [0.12, dy + (k === 0 ? 1.0 : 0.25)]], 7).xf(px, 0, pz)); }); }
    g.add(box(0.08, 0.08, z1 - z0, x0 + 0.04, dy + 0.55, (z0 + z1) / 2)); g.add(box(0.08, 0.08, z1 - z0, x1 - 0.04, dy + 0.55, (z0 + z1) / 2));
    ctx.add('wood', g); ctx.add('wood', pil);
    ctx.floor(x0, z0, x1, z1 + 0.6, dy, 'wood');
    ctx.box(x0 - 0.25, z0, x0, z1, { low: true }); ctx.box(x1, z0, x1 + 0.25, z1, { low: true }); ctx.box(x0, z0 - 0.25, x1, z0, { low: true });
    // cột bến có chữ Lệ cảnh báo (lộ ra khi chụp đèn flash)
    var cy = T(85.6, 237.2); ctx.add('wood', Geo.lathe([[0.17, -0.5], [0.15, 3.4], [0.11, 3.6]], 8).xf(85.6, cy, 237.2)); ctx.circle(85.6, 237.2, 0.22);
    W.rune(['ĐỪNG UỐNG', 'NƯỚC SÔNG'], 85.6, cy + 2.0, 237.4, 0, 0.75, 1.1, { size: 54, bold: true, drip: true });
    P.wharfPost = [85.6, cy + 2.0, 237.4];
    // lều người lái đò
    var hy = T(96, 246);
    P.hut = Md.building(ctx, { x: 96.5, z: 246, w: 5.2, d: 4.2, q: 3, y: hy, h: 2.5, door: true, lanterns: false, overhang: 0.9, roofH: 1.5, doorW: 1.3 });
    var tb = P.hut.F, tp = tb.pt(-1.2, -0.9), tt = new Geo(); tt.add(box(1.1, 0.05, 0.6, 0, 0.72, 0)); [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]].forEach(function (p) { tt.add(box(0.05, 0.72, 0.05, p[0], 0.36, p[1])); });
    tt.xf(tp[0], P.hut.floorY, tp[1], 0, tb.a, 0); ctx.add('wood', tt);
    P.hutTable = [tp[0], P.hut.floorY + 0.77, tp[1]];
    var bp = tb.pt(1.5, -1.2); ctx.add('wood', box(1.6, 0.4, 0.8, 0, 0.2, 0).xf(bp[0], P.hut.floorY, bp[1], 0, tb.a, 0).color(0.6, 0.5, 0.42, 0));
    P.hutHide = { pos: [tb.pt(1.5, -0.6)[0], P.hut.floorY + 0.6, tb.pt(1.5, -0.6)[1]] };
    Md.lantern(ctx, tb.pt(0.9, 2.7)[0], P.hut.floorY + 2.3, tb.pt(0.9, 2.7)[1]);
    Md.lanternPost(ctx, 86.6, 239.5, Math.PI * 0.8);
    // thuyền buôn chìm của Tư Hợi: thân lộ một nửa, cột buồm gãy
    var sb = new Geo(), sx = 70.5, sz = 227.5;
    sb.add(Geo.sphere(1, 16, 8).xf(0, 0, 0, 0, 0, 0, 2.1, 0.95, 6.2)); sb.add(box(3.6, 0.08, 9, 0, 0.55, 0));
    for (k = 0; k < 7; k++) sb.add(box(0.12, 0.9, 0.12, (k % 2 ? 1 : -1) * 1.85, 0.3, -3.6 + k * 1.2));
    sb.add(Geo.tube([[0, 0.5, -0.5], [0.3, 3.0, -0.7], [0.5, 4.2, -0.6]], 0.11, 6, true)); sb.color(0.42, 0.36, 0.3, 0);
    sb.xf(0, 0, 0, 0.12, 0, 0.32).xf(sx, RIVER.y - 0.15, sz, 0, 1.25, 0); ctx.add('wood', sb);
    for (k = 0; k < 6; k++) ctx.add('canvas', Geo.sphere(0.32, 8, 6).xf(sx - 2 + k * 0.8 + rnd() * 0.3, RIVER.y + 0.05 + rnd() * 0.2, sz + 1.5 - k * 0.5, 0, rnd() * 3, 0, 1.2, 0.6, 0.9).color(0.6, 0.52, 0.36, 0));
    P.wreck = [sx, RIVER.y + 0.5, sz];
    // đò ngang + dây cáp qua sông
    var pa = [82.9, 0, 225.6], pb = [80.4, 0, 214.4]; pa[1] = dy; pb[1] = 0.3;
    ctx.add('wood', Geo.lathe([[0.14, -3.2], [0.12, 2.8], [0.16, 2.9]], 8).xf(pa[0], 0, pa[2])); ctx.add('wood', Geo.lathe([[0.14, -3.2], [0.12, 2.8], [0.16, 2.9]], 8).xf(pb[0], 0, pb[2]));
    ctx.add('wood', rope([pa[0], 2.6, pa[2]], [pb[0], 2.6, pb[2]], 1.1, 0.03));
    var raft = new Geo();
    raft.add(box(1.7, 0.32, 4.0, 0, 0, 0)); raft.add(Geo.quad([-0.85, 0.16, 2.0], [0.85, 0.16, 2.0], [0.5, 0.28, 2.9], [-0.5, 0.28, 2.9])); raft.add(Geo.quad([0.85, 0.16, -2.0], [-0.85, 0.16, -2.0], [-0.5, 0.28, -2.9], [0.5, 0.28, -2.9]));
    raft.add(box(0.1, 0.25, 4.6, 0.86, 0.22, 0)); raft.add(box(0.1, 0.25, 4.6, -0.86, 0.22, 0)); raft.add(Geo.lathe([[0.04, 0], [0.035, 2.0]], 6).xf(0.6, 0.16, 1.4));
    raft.computeNormals(); raft.color(0.55, 0.45, 0.36, 0);
    var rn = new Node(R.mesh(raft), { tex: 'wood', rough: 0.8 }); ctx.node(rn);
    var rl = Md.lantern(ctx, 0, 0, 0, true); rl.mat.tint = [1, 0.16, 0.07, 1];
    P.ferry = { node: rn, lantern: rl, a: [81.9, RIVER.y + 0.28, 223.0], b: [80.9, RIVER.y + 0.28, 216.6], t: 0, ry: -0.2 };
    WD.setFerry(0);
    // bến bắc: cầu ván nhỏ + đèn
    var g2 = new Geo(), nx0 = 78.8, nx1 = 81.6, nz0 = 208.6, nz1 = 215.6;
    for (k = 0; nz0 + k * 0.32 < nz1; k++) g2.add(box(nx1 - nx0, 0.06, 0.28, (nx0 + nx1) / 2, 0.28, nz0 + k * 0.32 + 0.16).color(0.68 + rnd() * 0.2, 0.6, 0.52, 0));
    for (k = 0; k < 3; k++) [nx0 + 0.1, nx1 - 0.1].forEach(function (px) { g2.add(Geo.lathe([[0.12, -3.2], [0.11, 0.55]], 7).xf(px, 0, nz0 + 1 + k * 2.6)); });
    ctx.add('wood', g2); ctx.floor(nx0, nz0 - 0.6, nx1, nz1, 0.32, 'wood');
    ctx.box(nx0 - 0.25, nz0, nx0, nz1, { low: true }); ctx.box(nx1, nz0, nx1 + 0.25, nz1, { low: true }); ctx.box(nx0, nz1, nx1, nz1 + 0.25, { low: true });
    Md.lanternPost(ctx, 77.3, 209.8, 0.2);
    P.landing = [80.2, 0.32, 209.4];
  }
  WD.setFerry = function (t) {
    var f = WD.props.ferry; if (!f) return; f.t = t;
    var x = M.lerp(f.a[0], f.b[0], t), z = M.lerp(f.a[2], f.b[2], t);
    f.node.set(x, f.a[1], z); f.node.rot[1] = f.ry; f.lantern.node.set(x + 0.6 * Math.cos(f.ry) + 1.4 * Math.sin(f.ry), f.a[1] + 2.05, z + 1.4 * Math.cos(f.ry) - 0.6 * Math.sin(f.ry)); f.lantern.base = f.lantern.node.pos.slice();
  };

  /* ===================== LỐI MÒN RỪNG TRE: gạo khô, mộ hoang, bia chỉ đường ===================== */
  function buildNorth() {
    var k;
    Md.tree(ctx, 36.5, 182, { seed: 1874, scale: 1.9, levels: 3, leaves: false, trunk: 7, rad: 0.62 }); // cây gạo chết
    W.textMat('markT', ['ÂM LINH', '↑ 3 DẶM'], { w: 128, h: 256, size: 34, bold: true, color: '#3a1810', glow: 'rgba(0,0,0,0.5)', bg: 'rgba(110,104,92,1)' });
    var my = Md.stele(ctx, 6.6, 138, -Math.PI / 2 + 0.2, 0.7, 1.3);
    var mp = new Node(R.mesh(Geo.quad([-0.25, 0, 0], [0.25, 0, 0], [0.25, 0.9, 0], [-0.25, 0.9, 0])), { tex: 'markT', unlit: 0.4, tint: [1, 1, 1, 1], blend: true });
    mp.set(6.6 - 0.12, my + 0.4, 138); mp.rot[1] = -Math.PI / 2 + 0.2; ctx.node(mp);
    for (k = 0; k < 7; k++) { var gx = 22 + rnd() * 9, gz = 158 + rnd() * 10; if (H.Wild.corr(gx, gz) < 0.8) continue; Md.tomb(ctx, gx, gz, rnd); }
    Md.lanternPost(ctx, 3.8, 104, Math.PI);
    W.rune(['ĐỪNG', 'QUAY LƯNG'], -2.4, T(-2.4, 120) + 1.6, 120, Math.PI / 2, 1.6, 1.0);
  }

  /* ===================== RỪNG: cây instancing 2 LOD, tre, cỏ, sậy, đá, gỗ đổ ===================== */
  function buildForest() {
    var k, i, j;
    var V = [
      { seed: 11, trunk: 7.5, rad: 0.42, leafN: 46, scale: 1 }, { seed: 23, trunk: 5.5, rad: 0.5, leafN: 52, scale: 1 },
      { seed: 37, trunk: 9.5, rad: 0.33, leafN: 38, scale: 1 }, { seed: 53, trunk: 6.5, rad: 0.38, leafN: 0, scale: 1, dead: 1 }
    ].map(function (v) {
      var near = Md.treeGeo(0, 0, { seed: v.seed, levels: 2, leaves: !v.dead, leafN: v.leafN, trunk: v.trunk, rad: v.rad, scale: 1 });
      var far = Md.treeGeo(0, 0, { seed: v.seed, levels: 2, lowpoly: 1, leaves: !v.dead, leafN: v.leafN, leafSize: 1.38, trunk: v.trunk, rad: v.rad, scale: 1 }); // cùng dáng cây, ít đa giác hơn → không "nhảy hình" khi đổi LOD
      return { near: near, far: far, dead: v.dead, list: {} };
    });
    var bam = {}, CELL = 32;
    function cellKey(x, z) { return Math.floor(x / CELL) + '|' + Math.floor(z / CELL); }
    for (var gz = 96; gz < 480; gz += 4.4) for (var gx = -150; gx < 175; gx += 4.4) {
      var x = gx + (rnd() - 0.5) * 3.6, z = gz + (rnd() - 0.5) * 3.6, c = WD.corr(x, z);
      if (c < 2.4) continue; // chừa lề đường: gốc cây không lấn vào lối đi
      if (z < 104 && Math.abs(x) < 70) continue;
      var rd = WD.riverD(x, z); if (rd < RIVER.hw + 5.5) continue;
      var p = c < 10 ? 0.9 : (c < 30 ? 0.62 : (c < 70 ? 0.36 : 0.14)); if (rnd() > p) continue;
      var y = W.groundAt(x, z), slope = Math.max(Math.abs(W.groundAt(x + 1.2, z) - W.groundAt(x - 1.2, z)), Math.abs(W.groundAt(x, z + 1.2) - W.groundAt(x, z - 1.2))) / 2.4;
      if (slope > 1.25) continue; // vách quá dốc: không mọc cây
      y = Math.min(y, W.groundAt(x + 0.5, z), W.groundAt(x - 0.5, z), W.groundAt(x, z + 0.5), W.groundAt(x, z - 0.5)) - 0.1 - slope * 0.25; // cắm gốc theo điểm thấp nhất
      var bamboo = z < 205 && x > -45 && x < 100 && rnd() < 0.72;
      if (bamboo) { for (i = 0; i < 4 + Math.floor(rnd() * 5); i++) { var bx = x + (rnd() - 0.5) * 2.4, bz = z + (rnd() - 0.5) * 2.4; if (WD.corr(bx, bz) < 1.5) continue; var a = bam[cellKey(bx, bz)] || (bam[cellKey(bx, bz)] = []); a.push(bx, W.groundAt(bx, bz) - 0.25, bz, 0.65 + rnd() * 0.8, rnd() * 6.28, rnd() * 6.28, (rnd() - 0.5) * 2, 0.6 + rnd() * 0.7); } continue; }
      var vi = rnd() < 0.07 ? 3 : Math.floor(rnd() * 3), v = V[vi], key = cellKey(x, z), arr = v.list[key] || (v.list[key] = []);
      arr.push(x, y, z, (vi === 3 ? 1.0 : 1.05) + rnd() * 0.75 + (c > 25 ? 0.3 : 0), rnd() * 6.28, rnd() * 6.28, (rnd() - 0.5) * 0.12, 0.7 + rnd() * 0.45);
    }
    function emit(geo, arr, mat, lod, maxD, padY) {
      var cnt = arr.length / 8, cx = 0, cy = 0, cz = 0, rad = 0, order = [], q;
      for (q = 0; q < cnt; q++) { order.push(q); cx += arr[q * 8]; cy += arr[q * 8 + 1]; cz += arr[q * 8 + 2]; } cx /= cnt; cy /= cnt; cz /= cnt;
      for (q = cnt - 1; q > 0; q--) { var j2 = Math.floor(rnd() * (q + 1)), tt = order[q]; order[q] = order[j2]; order[j2] = tt; }
      var inst = new Float32Array(cnt * 8);
      for (q = 0; q < cnt; q++) { for (var e = 0; e < 8; e++) inst[q * 8 + e] = arr[order[q] * 8 + e]; rad = Math.max(rad, Math.hypot(arr[q * 8] - cx, arr[q * 8 + 2] - cz)); }
      R.addInstanced(geo, inst, cnt, mat, [cx, cy + padY, cz], rad + padY + 4, maxD, lod);
    }
    var barkM = { tex: 'bark', rough: 0.9, tint: [1, 1, 1, 1] }, leafM = { tex: 'leaf', cutout: 1, rough: 0.55, tint: [0.92, 1, 0.88, 1] }, LOD = 52;
    V.forEach(function (v) {
      for (var key in v.list) {
        var arr = v.list[key];
        emit(v.near.wood, arr, barkM, [0, LOD], 0, 6); if (!v.dead) emit(v.near.leaf, arr, leafM, [0, LOD], 0, 6);
        emit(v.far.wood, arr, barkM, [LOD, 1e9], 0, 6); if (!v.dead) emit(v.far.leaf, arr, leafM, [LOD, 1e9], 0, 6);
      }
    });
    var bg = Md.bambooGeo(), bm = { tex: 'bamboo', cutout: 1, rough: 0.5, tint: [1, 1, 1, 1] };
    for (var kb in bam) emit(bg, bam[kb], bm, null, 0, 5);
    // ---- cỏ, dương xỉ, bụi rậm, lau sậy dọc lối đi
    var gg = Md.grassGeo();
    function scatter(n, mat, maxD, sMin, sMax, pick) {
      var gs = {}, made = 0, tries = 0;
      while (made < n && tries++ < n * 6) {
        var q = pick(); if (!q) continue; var x = q[0], z = q[1], bad = false;
        for (i = 0; i < W.floors.length && !bad; i++) { var f = W.floors[i]; bad = x > f[0] - 0.3 && x < f[2] + 0.3 && z > f[1] - 0.3 && z < f[3] + 0.3; }
        for (i = 0; i < W.circles.length && !bad; i++) { var ci = W.circles[i]; if (Math.abs(ci.x - x) < 4 && Math.abs(ci.z - z) < 4) bad = Math.hypot(x - ci.x, z - ci.z) < ci.r + 0.1; }
        if (bad) continue;
        var y = W.groundAt(x, z); if (y < RIVER.y + 0.25) continue;
        var key = Math.floor(x / 30) + '|' + Math.floor(z / 30), a = gs[key] || (gs[key] = []);
        a.push(x, y - 0.03, z, sMin + rnd() * (sMax - sMin), rnd() * 6.28, rnd() * 6.28, (rnd() - 0.5) * 1.5, 0.7 + rnd() * 0.55); made++;
      }
      for (var key2 in gs) emit(gg, gs[key2], mat, null, maxD, 0.5);
    }
    function onPath(spread) {
      var s = SEG[Math.floor(rnd() * SEG.length)], t = rnd(), x = M.lerp(s[0], s[2], t), z = M.lerp(s[1], s[3], t), dx = s[2] - s[0], dz = s[3] - s[1], dl = Math.hypot(dx, dz);
      var off = (rnd() < 0.5 ? -1 : 1) * (s[4] * spread[0] + rnd() * spread[1]); x += -dz / dl * off; z += dx / dl * off; return [x, z, s];
    }
    scatter(9000, { tex: 'grass', cutout: 1, rough: 0.7, tint: [0.95, 1, 0.9, 1] }, 42, 0.7, 1.6, function () {
      var q = rnd() < 0.8 ? onPath([0.25, 6]) : (function () { var c = CLEAR[Math.floor(rnd() * CLEAR.length)], a = rnd() * 6.28, r = c[2] * (0.35 + rnd() * 0.75); return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; })();
      return WD.pathness(q[0], q[1]) > 0.35 || Math.hypot(q[0] - 10, q[1] - 247) < 4.5 ? null : q;
    });
    scatter(1500, { tex: 'leaf', cutout: 1, rough: 0.55, tint: [0.85, 0.95, 0.8, 1] }, 72, 1.6, 3.4, function () { var q = onPath([0.8, 4]); return WD.corr(q[0], q[1]) > -0.4 ? q : null; });
    scatter(2600, { tex: 'grass', cutout: 1, rough: 0.6, tint: [1.15, 1.05, 0.6, 1] }, 55, 1.4, 2.6, function () { // lau sậy ven sông
      var sg = RSEG[2 + Math.floor(rnd() * 6)], u = rnd(), x = M.lerp(sg[0], sg[2], u), z = M.lerp(sg[1], sg[3], u), dx = sg[2] - sg[0], dz = sg[3] - sg[1], dl = Math.hypot(dx, dz), off = (rnd() < 0.5 ? -1 : 1) * (RIVER.hw + 2.2 + rnd() * 4.5);
      return [x - dz / dl * off, z + dx / dl * off];
    });
    // ---- đá và gỗ mục ven lối
    for (k = 0; k < 170; k++) { var q2 = onPath([1.05, 3.5]); Md.rock(ctx, q2[0], q2[1], 0.35 + Math.pow(rnd(), 2) * 1.6, k * 2.9); }
    for (k = 0; k < 34; k++) {
      var q3 = onPath([1.2, 4]), a3 = rnd() * 6.28, L3 = 3 + rnd() * 5, y3 = W.groundAt(q3[0], q3[1]) + 0.15;
      var e0 = [q3[0] - Math.cos(a3) * L3 / 2, 0, q3[1] - Math.sin(a3) * L3 / 2], e1 = [q3[0] + Math.cos(a3) * L3 / 2, 0, q3[1] + Math.sin(a3) * L3 / 2];
      if (WD.corr(e0[0], e0[2]) < 0.2 || WD.corr(e1[0], e1[2]) < 0.2) continue;
      e0[1] = W.groundAt(e0[0], e0[2]) + 0.2; e1[1] = W.groundAt(e1[0], e1[2]) + 0.2;
      ctx.add('bark', Geo.tube([e0, [q3[0], y3 + 0.1, q3[1]], e1], function (t) { return 0.3 - t * 0.12; }, 7, true).scaleUV(2, 0.4).color(0.75, 0.75, 0.65, 0));
    }
  }

  /* ===================== BIỂN CHỈ DẪN + CỌC TIÊU DỌC LỐI MÒN ===================== */
  var signN = 0;
  /* đẩy vị trí ra sát mép lối đi (không đứng chắn giữa đường) */
  function toEdge(x, z) {
    var best = 1e9, bs = null, bt = 0;
    SEG.forEach(function (sg) { var dx = sg[2] - sg[0], dz = sg[3] - sg[1], t = M.clamp(((x - sg[0]) * dx + (z - sg[1]) * dz) / (dx * dx + dz * dz), 0, 1), d = Math.hypot(x - sg[0] - dx * t, z - sg[1] - dz * t); if (d < best) { best = d; bs = sg; bt = t; } });
    var cx = M.lerp(bs[0], bs[2], bt), cz = M.lerp(bs[1], bs[3], bt), want = bs[4] - 0.35;
    if (best >= want) return [x, z];
    var ux = (x - cx) / (best || 1), uz = (z - cz) / (best || 1); return [cx + ux * want, cz + uz * want];
  }
  function signpost(x, z, boards, lean) {
    var e = toEdge(x, z); x = e[0]; z = e[1];
    var y = T(x, z), post = new Geo();
    post.add(Geo.lathe([[0.075, -0.3], [0.07, 2.25], [0.0, 2.32]], 7).xf(0, 0, 0, lean || 0.03, 0, (lean || 0.03) * 0.6).color(0.42, 0.33, 0.24, 0));
    ctx.add('wood', post.xf(x, y, z)); ctx.circle(x, z, 0.14);
    boards.forEach(function (b, i) {
      var tx = b[1][0] - x, tz = b[1][1] - z, ry = Math.atan2(-tz, tx), two = b[0].length > 1, bh = two ? 0.36 : 0.24, by = y + 2.0 - i * 0.42 - (two ? 0.06 : 0), L = 1.12;
      var shape = [[-0.08, -bh / 2], [L - 0.22, -bh / 2], [L, 0], [L - 0.22, bh / 2], [-0.08, bh / 2]];
      var bd = Geo.extrude(shape, 0.045).xf(0, 0, -0.0225).color(0.36, 0.27, 0.19, 0);
      bd.xf(0, 0, 0, 0, 0, (i % 2 ? -1 : 1) * 0.035).xf(x, by, z, 0, ry, 0); ctx.add('wood', bd);
      var nm = 'signT' + (signN++);
      W.textMat(nm, b[0], { w: 512, h: two ? 160 : 112, size: two ? 46 : 58, bold: true, color: '#e4d6b8', glow: 'rgba(0,0,0,0.85)', bg: 'rgba(46,32,22,1)' });
      var qw = L - 0.32, qh = bh - 0.05, cx0 = qw / 2 + 0.0;
      [1, -1].forEach(function (sd) {
        var q = new Node(R.mesh(Geo.quad([-qw / 2, -qh / 2, 0], [qw / 2, -qh / 2, 0], [qw / 2, qh / 2, 0], [-qw / 2, qh / 2, 0])), { tex: nm, rough: 0.85 });
        // toạ độ tâm chữ trên tấm biển (trong hệ biển), xoay theo hướng biển
        var lx = cx0, lz = sd * 0.0245, c = Math.cos(ry), sn = Math.sin(ry);
        q.set(x + lx * c + lz * sn, by, z - lx * sn + lz * c); q.rot[1] = ry + (sd < 0 ? Math.PI : 0); q.rot[2] = (i % 2 ? -1 : 1) * 0.035 * sd; ctx.node(q);
      });
    });
  }
  function buildSigns() {
    // bảng gỗ “CẤM VÀO RỪNG” kiểu kiểm lâm ở bìa rừng
    signpost(-3.6, 398.6, [[['LÀNG ÂM LINH'], [-12, 388]], [['ĐÈO SẠT', 'ĐƯỜNG ĐÃ SẠT LỞ'], [40, 435]]]);
    signpost(-15.2, 372.5, [[['MIẾU SƠN THẦN'], [-32, 356]], [['ĐÈO SẠT'], [-10, 390]]]);
    signpost(-20.6, 334.2, [[['TRẠM ĐO ĐẠC'], [-4, 316]], [['MIẾU SƠN THẦN'], [-30, 352]]]);
    signpost(25.6, 272.5, [[['CẦU TREO', 'SÔNG ÂM'], [12, 252]], [['TRẠM ĐO ĐẠC'], [20, 290]]]);
    signpost(15.6, 251.8, [[['BẾN DƯỚI', 'ĐÒ NGANG'], [46, 245]], [['CẦU TREO'], [10, 248]]]);
    signpost(63.5, 210.2, [[['LÀNG ÂM LINH'], [40, 194]], [['BẾN ĐÒ'], [80, 209]]]);
    signpost(24.5, 165.5, [[['LÀNG ÂM LINH'], [8, 143]]]);
    var rg = new Geo(); rg.add(Geo.box(1.25, 0.62, 0.05).boxUV(0.6).color(0.4, 0.31, 0.22, 0));
    rg.add(Geo.box(0.07, 1.6, 0.07).xf(-0.5, -0.55, -0.05).color(0.38, 0.3, 0.22, 0)); rg.add(Geo.box(0.07, 1.6, 0.07).xf(0.5, -0.55, -0.05).color(0.38, 0.3, 0.22, 0));
    var wx = -14.6, wz = 394.7, wy = T(wx, wz) + 1.5, wr = 0.89; rg.xf(0, 0, 0, 0.04, 0, -0.06).xf(wx, wy, wz, 0, wr, 0); ctx.add('wood', rg); ctx.circle(wx, wz, 0.6);
    W.textMat('signForest', ['RỪNG CẤM', 'Cấm chặt cây · Cấm săn bắn'], { w: 512, h: 256, size: 64, bold: true, color: '#a8291c', glow: 'rgba(0,0,0,0.7)', bg: 'rgba(196,184,160,1)' });
    var fq = new Node(R.mesh(Geo.quad([-0.56, -0.27, 0], [0.56, -0.27, 0], [0.56, 0.27, 0], [-0.56, 0.27, 0])), { tex: 'signForest', rough: 0.8 });
    fq.set(wx + Math.sin(wr) * 0.03, wy, wz + Math.cos(wr) * 0.03); fq.rot[1] = wr; fq.rot[0] = 0.04; fq.rot[2] = -0.06; ctx.node(fq);
    // cọc tiêu đo đạc (đầu sơn trắng, vạch đỏ) cách nhau ~12m, so le hai bên lối — bắt sáng đèn pin, dễ lần theo trong đêm
    var side = 1, acc = 6;
    PATHS.forEach(function (pth) {
      if (pth.id === 'road') return;
      for (var k = 0; k < pth.pts.length - 1; k++) {
        var a = pth.pts[k], b = pth.pts[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
        for (var d = acc; d < L; d += 12) {
          var off = pth.hw * 0.62 + 0.25, px = a[0] + dx * d / L + nx * off * side, pz = a[1] + dz * d / L + nz * off * side; side = -side;
          if (WD.riverD(px, pz) < RIVER.hw + 1.5) continue;
          var py = T(px, pz), tilt = (rnd() - 0.5) * 0.14, g = new Geo();
          g.add(Geo.box(0.07, 0.72, 0.07).xf(0, 0.36, 0).color(0.4, 0.31, 0.22, 0));
          g.add(Geo.box(0.075, 0.2, 0.075).xf(0, 0.82, 0).color(0.92, 0.9, 0.84, 0)); g.add(Geo.box(0.078, 0.06, 0.078).xf(0, 0.68, 0).color(0.62, 0.08, 0.05, 0));
          g.add(Geo.box(0.04, 0.04, 0.04).xf(0, 0.94, 0).color(0.85, 0.83, 0.78, 0));
          ctx.add('paint2', g.xf(0, 0, 0, tilt, rnd() * 3, tilt * 0.7).xf(px, py - 0.05, pz));
        }
        acc = d - L;
      }
    });
    R.defineStaticMat('paint2', { tex: 'plain', rough: 0.55 });
  }

  function wildInit() { ctx = W.ctx; T = W.groundAt; rnd = H.rng(9419); }
  /* chèn các bước dựng vào trước bước hoàn tất của world.js */
  var fin = W.steps.pop();
  W.steps.push(['Mở đường đèo, lật chiếc U-oát...', function () { wildInit(); buildCrash(); }]);
  W.steps.push(['Dựng Miếu Sơn Thần, trạm đo đạc 1934...', function () { buildShrine(); buildCamp(); }]);
  W.steps.push(['Khơi dòng sông Âm, dựng Bến Dưới...', function () { buildWater(); buildBridge(); buildWharf(); buildNorth(); }]);
  W.steps.push(['Trồng Rừng Cấm...', buildForest]);
  W.steps.push(['Cắm biển chỉ đường, cọc tiêu...', buildSigns]);
  W.steps.push(fin);

  /* ---------- cập nhật động ---------- */
  WD.update = function (dt, time, ppos) {
    var P = WD.props, k;
    if (P.headLight) { var fl = Math.sin(time * 23) * Math.sin(time * 7.1) > 0.82 ? 0.1 : (0.85 + 0.15 * Math.sin(time * 31)); P.headLight.intensity = 1.7 * fl; P.headNode.mat.emis[0] = 2.5 * fl; P.headNode.mat.emis[1] = 2.2 * fl; P.headNode.mat.emis[2] = 1.6 * fl; }
    if (P.shrineLight) P.shrineLight.intensity = 0.9 * (0.8 + 0.2 * Math.sin(time * 9) * Math.sin(time * 5.3));
    if (P.campLight) P.campLight.intensity = 0.5 * (0.7 + 0.3 * Math.sin(time * 1.7));
    if (P.ferry && !WD.ferryBusy) { var f = P.ferry; f.node.pos[1] = f.a[1] + Math.sin(time * 1.3) * 0.04; f.node.rot[2] = Math.sin(time * 0.9) * 0.02; }
  };
})();
