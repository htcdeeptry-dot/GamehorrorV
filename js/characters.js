/* HUYẾT LỆ THÔN — characters.js
   Hệ nhân vật người: khung xương phân cấp 17 khớp, đầu điêu khắc thủ tục (hốc mắt, sống mũi,
   môi, gò má, cằm, lông mày, mắt có mống mắt + chớp mắt), tóc theo kiểu, trang phục theo vai
   (1994 và 1874). Thân là MỘT lưới liền được skinning trên GPU (15 xương, không lộ khớp);
   khuôn mặt 9.400 đỉnh có 6 mục tiêu biến hình: há hàm, bè môi, chúm môi, nhắm mắt, nhướn/cau mày,
   cười — dùng cho biểu cảm và khẩu hình đồng bộ theo từng âm của câu thoại. Hệ chuyển động pha trộn tư thế: đứng thở, đi, nói + cử chỉ tay, quỳ, bị trói,
   van xin, đập cửa, co ro, chỉ tay, viết, giật lùi, ngồi một gối; đầu và mắt dõi theo mục tiêu. */
(function () {
  'use strict';
  var H = window.HuyetLeThon, Geo = H.Geo, Node = H.Node, M = H.M, R = H.R;
  var Ch = H.Chars = { list: [], byName: {} };
  var PI = Math.PI;
  function sq(x) { return x * x; }
  function G(dx, dy, sx, sy) { return Math.exp(-(dx * dx / (sx * sx) + dy * dy / (sy * sy))); }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /* lưới cầu tham số hoá theo chiều cao, dồn mật độ đỉnh về phía mặt */
  function headGrid(NU, NV, fn, keep) {
    var g = new Geo(), ok = [], i, j;
    for (j = 0; j <= NV; j++) {
      var cy = 1 - 2 * j / NV, sr = Math.sqrt(Math.max(0, 1 - cy * cy));
      for (i = 0; i <= NU; i++) {
        var u = i / NU * 2 - 1, lam = PI + (u < 0 ? -1 : 1) * PI * Math.pow(Math.abs(u), 1.45);
        var o = fn(sr * Math.sin(lam), cy, -sr * Math.cos(lam), lam);
        var v = g.v(o[0], o[1], o[2], 0, 1, 0, i / NU, j / NV);
        g.c[v * 4] = o[3]; g.c[v * 4 + 1] = o[4]; g.c[v * 4 + 2] = o[5]; g.c[v * 4 + 3] = o[6] || 0; ok.push(keep ? keep(o[0], o[1], o[2]) : true);
      }
    }
    for (j = 0; j < NV; j++) for (i = 0; i < NU; i++) {
      var a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      if (ok[a] && ok[c] && ok[d]) g.i.push(a, c, d); if (ok[a] && ok[d] && ok[b]) g.i.push(a, d, b);
    }
    g.computeNormals(); return g;
  }
  function skull(dx, cy, dz, p) {
    var X = dx * 0.074 * (p.male ? 1.03 : 0.97), Y = cy * 0.118, Z = dz * (dz > 0 ? 0.09 : 0.098);
    if (cy < 0) { var t = -cy; X *= 1 - 0.30 * t * t * (2 - p.jaw); Z *= dz > 0 ? 1 - 0.10 * t * t : 1 - 0.38 * t * t; }
    return [X, Y, Z];
  }
  /* ---------- ĐẦU: điêu khắc bằng trường dịch chuyển ---------- */
  Ch.headGeo = function (q) {
    var p = { male: 0, jaw: 1, nose: 1, lip: 1, age: 0, brow: 1, blush: 0.25, tone: [0.5, 0.33, 0.245], lipCol: [0.36, 0.12, 0.11], hair: [0.02, 0.016, 0.014] }, k;
    for (k in q) p[k] = q[k];
    if (p.ghost) { p.tone = [0.86, 0.84, 0.82]; p.blush = 0; p.lipCol = [0.2, 0.02, 0.02]; }
    var hg = headGrid(96, 96, function (dx, cy, dz) {
      var s = skull(dx, cy, dz, p), X = s[0], Y = s[1], Z = s[2], col = p.tone.slice(), ax = Math.abs(X);
      if (dz > 0) {
        var f = M.smooth(0.0, 0.35, dz), d = 0, ex = ax - 0.031, lw = Math.exp(-Math.pow(X / 0.021, 4));
        d -= (p.ghost ? 0.017 : 0.011) * G(ex, Y - 0.022, 0.016, 0.011);                         // hốc mắt
        d += (p.male ? 0.0045 : 0.002) * G(ax - 0.03, Y - 0.043, 0.026, 0.007);                  // gờ mày
        var nt = M.clamp((0.036 - Y) / 0.056, 0, 1);
        if (Y < 0.04 && Y > -0.034) d += p.nose * (0.004 + 0.016 * nt * nt) * Math.exp(-X * X / (sq(0.0075) * (1 + nt))) * M.smooth(-0.034, -0.02, Y); // sống mũi
        d += p.nose * 0.008 * G(X, Y + 0.021, 0.011, 0.009) + p.nose * 0.004 * G(ax - 0.0125, Y + 0.026, 0.006, 0.006);                           // chóp + cánh mũi
        d += p.lip * 0.0055 * lw * Math.exp(-sq((Y + 0.050) / 0.0055)) + p.lip * 0.0065 * lw * Math.exp(-sq((Y + 0.0635) / 0.0065));               // môi
        d -= (p.ghost ? 0.009 : 0.0035) * Math.exp(-Math.pow(X / 0.024, 4)) * Math.exp(-sq((Y + 0.0565) / (p.ghost ? 0.008 : 0.0022)));           // khe miệng
        d += 0.004 * lw * Math.exp(-sq((Y + 0.056) / 0.02)) + 0.007 * G(X, Y + 0.098, 0.022, 0.016);                                               // mõm + cằm
        d += 0.004 * G(ax - 0.048, Y + 0.002, 0.02, 0.016) - 0.004 * p.age * G(ax - 0.042, Y + 0.045, 0.018, 0.022);                              // gò má / má hóp
        Z += d * f;
        if (dz > 0.25) {
          var sock = G(ex, Y - 0.022, 0.02, 0.013);
          if (p.ghost) {
            var dark = Math.max(M.smooth(0.35, 0.8, G(ex, Y - 0.022, 0.019, 0.015)), M.smooth(0.3, 0.8, G(X, Y + 0.058, 0.02, 0.012)));
            var tear = (1 - M.smooth(0.003, 0.009, Math.abs(ax - 0.032))) * M.smooth(0.012, -0.002, Y) * M.smooth(-0.115, -0.07, Y);
            col = [col[0] * (1 - dark) * (1 - tear * 0.45), col[1] * (1 - dark) * (1 - tear * 0.95), col[2] * (1 - dark) * (1 - tear * 0.95)];
          } else {
            var sh = 1 - 0.28 * sock - 0.45 * G(ax - 0.008, Y + 0.031, 0.004, 0.003);
            col = [col[0] * sh, col[1] * sh, col[2] * sh];
            var bl = p.blush * G(ax - 0.045, Y + 0.02, 0.02, 0.016); col[0] += 0.10 * bl; col[1] -= 0.02 * bl;
            col = mix3(col, p.lipCol, M.clamp(lw * Math.exp(-sq((Y + 0.057) / 0.0105)) * (p.male ? 0.55 : 0.95), 0, 1));
            col = mix3(col, [0.035, 0.008, 0.008], M.clamp(Math.exp(-Math.pow(X / 0.0225, 4)) * Math.exp(-sq((Y + 0.0566) / 0.0017)) * 1.3, 0, 1));
            var yb = 0.0475 + 0.004 * Math.sin(M.clamp((ax - 0.012) / 0.04, 0, 1) * PI);
            var bm = M.smooth(0.009, 0.014, ax) * M.smooth(0.056, 0.048, ax) * Math.exp(-sq((Y - yb) / (0.0036 * p.brow)));
            col = mix3(col, p.hair, M.clamp(bm * 1.2, 0, 1));
            var lash = Math.exp(-sq((Y - 0.0295) / 0.0019)) * M.smooth(0.016, 0.011, Math.abs(ex)) * (p.male ? 0.45 : 0.85);
            col = mix3(col, [0.02, 0.015, 0.015], M.clamp(lash, 0, 1));
            if (p.male && p.age > 0.3) { var st = p.age * 0.5 * M.smooth(-0.03, -0.07, Y) * M.smooth(0.07, 0.03, ax); col = mix3(col, [0.2, 0.17, 0.16], st); }
          }
        }
      }
      if (cy < -0.75) { col[0] *= 0.82; col[1] *= 0.8; col[2] *= 0.8; }
      return [X, Y, Z, col[0], col[1], col[2]];
    });
    // 6 mục tiêu biến hình: [há hàm, bè môi, chúm môi, nhắm mắt, mày, cười]
    var P = hg.p, ex = [], n = P.length / 3;
    for (var i = 0; i < n; i++) {
      var X = P[i * 3], Y = P[i * 3 + 1], Z = P[i * 3 + 2], ax = Math.abs(X), sg = X < 0 ? -1 : 1, fr = M.smooth(0.02, 0.05, Z);
      var a = M.smooth(-0.0555, -0.066, Y) * M.smooth(0.07, 0.035, ax) * fr, u = G(X, Y + 0.049, 0.022, 0.005) * fr;
      ex.push(0, -0.0165 * a + 0.0018 * u, -0.004 * a);
      var cr = G(ax - 0.024, Y + 0.057, 0.011, 0.011) * fr; ex.push(sg * 0.0065 * cr, 0.0008 * cr, -0.0025 * cr);
      var L = G(X, Y + 0.057, 0.03, 0.013) * fr; ex.push(-X * 0.3 * L, 0, 0.0055 * L);
      var E = M.smooth(0.0138, 0.0095, Math.hypot(ax - 0.031, (Y - 0.0215) * 1.25)) * fr; ex.push(0, -0.0015 * E, Math.max(0, 0.0725 - Z) * E);
      var B = M.smooth(0.034, 0.04, Y) * M.smooth(0.066, 0.056, Y) * M.smooth(0.062, 0.05, ax) * fr; ex.push(-sg * 0.0012 * B * M.smooth(0.03, 0.01, ax), 0.0045 * B, 0);
      var c2 = G(ax - 0.027, Y + 0.056, 0.014, 0.012) * fr, ck = G(ax - 0.045, Y + 0.02, 0.02, 0.015) * fr; ex.push(sg * 0.004 * c2, 0.0055 * c2 + 0.002 * ck, -0.0015 * c2 + 0.0015 * ck);
    }
    hg.extra = { data: ex, layout: [[7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3]] };
    return hg;
  };
  /* ---------- TÓC ---------- */
  function hairGeo(p, st) {
    var A = H.Assets, g = headGrid(56, 44, function (dx, cy, dz, lam) {
      var s = skull(dx, cy, dz, p), n = A.fbm(lam * 5 + 3, cy * 2.5, 3), k = 1.075 + st.vol * 0.05 + n * 0.035;
      var X = s[0] * k, Y = s[1] * (k + 0.01) + 0.006, Z = s[2] * k - 0.006;
      if (st.long && cy < -0.1 && dz < 0.2) { var t = M.smooth(-0.1, -1, cy); X *= 1 + t * 0.9; Z = Z * (1 + t * 0.5) - t * 0.02; Y -= t * 0.03; }
      var str = 0.65 + 0.7 * (A.noise(lam * 26, cy * 1.5) * 0.5 + 0.5);
      return [X, Y, Z, p.hair[0] * str, p.hair[1] * str, p.hair[2] * str];
    }, function (X, Y, Z) {
      if (Z > 0.012) return Y > 0.068 - st.fringe * 0.03 + 0.012 * Math.cos(X / 0.05) - (Math.abs(X) > 0.055 ? (st.side || 0.03) : 0);
      return Y > (st.long ? -0.125 : -0.062) + (Math.abs(X) > 0.06 && Z > -0.03 ? 0.05 : 0);
    });
    var k, pts;
    if (st.long) { // suối tóc sau lưng
      var NC = 12, NR = 8, sh = new Geo(), L = st.long;
      for (var r = 0; r <= NR; r++) for (k = 0; k <= NC; k++) {
        var t = r / NR, a = (k / NC - 0.5) * 2.5, rad = M.lerp(0.082, 0.068, t), wv = A.noise(k * 1.7, r * 0.6) * 0.008;
        var v = sh.v(Math.sin(a) * (rad + wv), -0.07 - t * L, -Math.cos(a) * (rad * 0.95 + wv) - 0.012 - t * 0.02, 0, 0, -1, k / NC, t);
        var c2 = 0.6 + 0.7 * (A.noise(k * 3.1, 0.3) * 0.5 + 0.5); sh.c[v * 4] = p.hair[0] * c2; sh.c[v * 4 + 1] = p.hair[1] * c2; sh.c[v * 4 + 2] = p.hair[2] * c2; sh.c[v * 4 + 3] = t * t * 0.14;
      }
      for (r = 0; r < NR; r++) for (k = 0; k < NC; k++) { var a0 = r * (NC + 1) + k; sh.i.push(a0, a0 + NC + 1, a0 + NC + 2, a0, a0 + NC + 2, a0 + 1); }
      sh.computeNormals(); g.add(sh);
    }
    // lọn tóc rời phủ lên khối tóc: mái, tóc mai, đuôi tóc — phá đường viền "mũ bảo hiểm"
    var r2 = H.rng(Math.round((p.jaw || 1) * 977 + (st.long || 0) * 313 + 5)), ns = st.long ? 84 : 72;
    for (k = 0; k < ns; k++) {
      var fr = k < 16, lam2 = fr ? Math.PI + (r2() - 0.5) * 1.3 : (r2() < 0.5 ? 1 : -1) * (0.1 + r2() * (st.long ? 1.55 : 2.0)), cy2 = fr ? 0.64 + r2() * 0.2 : (st.long ? -0.2 + r2() * 1.0 : 0.3 + r2() * 0.65);
      if (!fr) lam2 = lam2 < 0 ? lam2 + 2 * Math.PI : lam2;
      if (fr && st.fringe < 0.05 && !st.long) continue;
      var sr2 = Math.sqrt(Math.max(0, 1 - cy2 * cy2)), dxx = sr2 * Math.sin(lam2), dzz = -sr2 * Math.cos(lam2), b0 = skull(dxx, cy2, dzz, p), kk = 1.1 + st.vol * 0.05;
      var P0 = [b0[0] * kk, b0[1] * kk + 0.008, b0[2] * kk - 0.006], ol = Math.hypot(b0[0], b0[2]) || 1, ox = b0[0] / ol, oz = b0[2] / ol;
      var Ls = fr ? 0.012 + st.fringe * 0.022 * (0.6 + r2() * 0.6) : (st.long ? (st.long + 0.05) * (0.5 + r2() * 0.55) : 0.018 + r2() * 0.02);
      pts = []; for (var q = 0; q <= 4; q++) { var t4 = q / 4, out = (fr ? 0.012 : 0.02) * Math.sqrt(t4); pts.push([P0[0] + ox * out + (fr ? (r2() - 0.5) * 0.004 : 0), P0[1] - Ls * t4 * (0.55 + 0.45 * t4), P0[2] + oz * out + (fr ? 0.004 * t4 : -0.01 * t4 * (st.long ? 1 : 0))]); }
      var cs = 0.8 + r2() * 0.4, y0s = P0[1], sway = st.long && !fr ? 0.12 : 0;
      (function (cs, y0s, Ls, sway) { g.add(Geo.tube(pts, function (t) { return 0.0058 - t * 0.0042; }, 3, true).colorFn(function (x, y) { return [p.hair[0] * cs, p.hair[1] * cs, p.hair[2] * cs, sq(M.clamp((y0s - y) / Ls, 0, 1)) * sway]; })); })(cs, y0s, Ls, sway);
    }
    if (st.bun) g.add(Geo.sphere(0.04, 10, 8).xf(0, st.bun > 1 ? 0.118 : 0.05, st.bun > 1 ? -0.03 : -0.105, 0, 0, 0, 1, 0.9, 1).color(p.hair[0], p.hair[1], p.hair[2], 0));
    if (st.braid) { pts = []; for (k = 0; k <= 8; k++) pts.push([0.02 * Math.sin(k * 0.9), -0.06 - k * 0.045, -0.095 - 0.012 * Math.cos(k * 0.9) - k * 0.004]); g.add(Geo.tube(pts, function (t) { return 0.02 - t * 0.008; }, 6, true).colorFn(function (x, y) { var q = 0.7 + 0.5 * Math.sin(y * 150); return [p.hair[0] * q, p.hair[1] * q, p.hair[2] * q, sq(M.clamp((-0.06 - y) / 0.36, 0, 1)) * 0.12]; })); }
    return g;
  }
  /* thân/chi: dựng bằng các vòng elip [y, rx, rz, cz] */
  function loft(rings, col, segs, capBottom, capTop) {
    var g = new Geo(), n = rings.length, i, j; segs = segs || 14;
    for (j = 0; j < n; j++) for (i = 0; i <= segs; i++) {
      var a = i / segs * 2 * PI - PI / 2, r = rings[j], c = Math.cos(a), s = Math.sin(a);
      g.v((r[4] || 0) + r[1] * c, r[0], (r[3] || 0) + r[2] * s, c, 0, s, i / segs * 2, r[0] * 5);
    }
    for (j = 0; j < n - 1; j++) for (i = 0; i < segs; i++) { var p0 = j * (segs + 1) + i; g.i.push(p0, p0 + segs + 1, p0 + segs + 2, p0, p0 + segs + 2, p0 + 1); }
    function cap(j) { var r = rings[j], ci = g.v(r[4] || 0, r[0], r[3] || 0, 0, 1, 0, 0.5, 0.5), b = j * (segs + 1); for (i = 0; i < segs; i++) g.i.push(ci, b + i, b + i + 1); }
    if (capBottom) cap(0); if (capTop) cap(n - 1);
    g.computeNormals(); if (col) g.color(col[0], col[1], col[2], 0);
    return g;
  }
  function handGeo(skin) {
    var g = new Geo(), f;
    g.add(Geo.sphere(1, 8, 6).xf(0, -0.045, 0, 0, 0, 0, 0.04, 0.05, 0.017));
    for (f = 0; f < 4; f++) { var x = (f - 1.5) * 0.017, L = 0.062 + (f === 1 || f === 2 ? 0.01 : 0) - (f === 3 ? 0.008 : 0); g.add(Geo.tube([[x, -0.085, 0], [x * 1.1, -0.085 - L * 0.5, 0.008], [x * 1.15, -0.085 - L * 0.85, 0.022], [x * 1.15, -0.085 - L, 0.036]], function (t) { return 0.0085 - t * 0.003; }, 5, true)); }
    g.add(Geo.tube([[0.034, -0.03, 0.004], [0.05, -0.058, 0.014], [0.054, -0.085, 0.024]], function (t) { return 0.0095 - t * 0.003; }, 5, true));
    return g.color(skin[0], skin[1], skin[2], 0);
  }
  var SHARED = null;
  function mats(spirit) {
    if (!spirit && SHARED) return SHARED;
    var t = spirit ? [0.62, 0.8, 1.0, 1] : [1, 1, 1, 1], e = spirit ? [0.035, 0.055, 0.09] : [0, 0, 0];
    var m = { skin: { tex: 'plain', rough: 0.5, tint: t.slice(), emis: e, sss: 0.8, rim: 0.4 }, body: { tex: 'fabric', rough: 0.88, nscale: 0.7, tint: t.slice(), emis: e, rim: 0.45 },
      cloth: { tex: 'fabric', rough: 0.9, nscale: 0.7, tint: t.slice(), emis: e, rim: 0.5 }, hair: { tex: 'plain', rough: 0.5, tint: t.slice(), emis: e, rim: 0.9 },
      eye: { tex: 'plain', rough: 0.05, tint: t.slice(), emis: spirit ? [0.1, 0.14, 0.2] : [0.006, 0.006, 0.006] }, shadow: { tex: 'blob', unlit: 1, tint: [0, 0, 0, 0.7], blend: true } };
    if (!spirit) SHARED = m; return m;
  }
  var BONES = ['hips', 'chest', 'neck', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'thL', 'knL', 'ftL', 'thR', 'knR', 'ftR', 'fiL', 'fiR'];

  /* ===================== DỰNG NHÂN VẬT ===================== */
  /* nhân vật Rocketbox: khung điều khiển 17 khớp đặt đúng vị trí khớp Bip01 (tư thế tay buông) */
  function createRB(name, sp) {
    var XR = H.RBRig, rg = XR.rig(sp.rb), q = rg.q, I = rg.IDX, J = {}, k;
    var c = { name: name, sp: sp, J: J, anim: 'idle', talkT: 0, look: null, ph: Math.random() * 9, walk: 0, blink: 2, T: {}, visible: false, morph: new Float32Array(6), speech: null, expr: null, manual: !!sp.manual };
    function N(parent, id, o, geo, mat) { var n = new Node(geo ? R.mesh(geo) : null, mat || null); n.set(o[0], o[1], o[2]); parent.add(n); if (id) J[id] = n; return n; }
    function d3(a, b) { a = q[I[a]]; b = q[I[b]]; return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    var root = c.root = new Node(); root.visible = false; var s = (sp.h || 1.68) / rg.height; root.scl = [s, s, s]; c.hipY = q[I.Pelvis][1];
    var hips = N(root, 'hips', q[I.Pelvis]), chest = N(hips, 'chest', d3('Spine1', 'Pelvis')), neck = N(chest, 'neck', d3('Neck', 'Spine1')); N(neck, 'head', d3('Head', 'Neck'));
    [-1, 1].forEach(function (sd) {
      var S = sd < 0 ? 'L' : 'R', rs = sd < 0 ? 'R ' : 'L ';
      var sh = N(chest, 'sh' + S, d3(rs + 'UpperArm', 'Spine1')), el = N(sh, 'el' + S, d3(rs + 'Forearm', rs + 'UpperArm')), hn = N(el, 'ha' + S, d3(rs + 'Hand', rs + 'Forearm')); N(hn, 'fi' + S, [0, -0.08, 0]);
      var th = N(hips, 'th' + S, d3(rs + 'Thigh', 'Pelvis')), kn = N(th, 'kn' + S, d3(rs + 'Calf', rs + 'Thigh')); N(kn, 'ft' + S, d3(rs + 'Foot', rs + 'Calf'));
    });
    c.eyes = [{ rot: [0, 0, 0] }, { rot: [0, 0, 0] }];
    var m = mats(false);
    if (!sp.spirit) N(root, null, [0, 0.03, 0.02], Geo.quad([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]), m.shadow);
    var bg = new Geo(); for (k = 0; k < 4; k++) bg.add(Geo.lathe([[0.168, 0], [0.173, 0.016], [0.168, 0.03]], 14).xf(0, 0.0 + k * 0.07, 0, (k % 2) * 0.14 - 0.07, 0, 0, 1.18, 1, 0.8));
    c.bind = N(chest, null, [0, 0, 0.01], bg.color(0.5, 0.02, 0.02, 0), m.cloth); c.bind.visible = false;
    XR.attach(c, { id: sp.rb, tint: sp.tint, emis: sp.emis, fade: sp.fade });
    for (k in J) c.T[k] = [0, 0, 0];
    R.nodes.push(root); Ch.list.push(c); Ch.byName[name] = c;
    return c;
  }
  function clipFor(c) {
    if (c.manual) return null;
    var fem = c.rb.rig.female, a = c.anim, talk = c.talkT > 0, sp = c.sp; c.rb.lockXZ = false;
    if (a === 'idle') return talk ? (fem ? (sp.stress || c.expr === 'fear' ? 'f_gestic_talk_femalestressed_01' : 'f_gestic_talk_sad_01') : 'm_gestic_listen_angry_01') : (fem ? 'f_idle_' + (sp.idle === 'angry_01' ? 'breathe_01' : (sp.idle || 'breathe_01')) : 'm_idle_' + (sp.idle || 'breathe_01'));
    if (a === 'cower' || a === 'crouch') return fem ? (talk ? 'f_crouch_gestic' : 'f_crouch_idle') : 'm_crouch_idle';
    if (a === 'pound' && !fem) { c.rb.lockXZ = true; return 'm_knock_door'; }
    return null;
  }
  /* oán linh Lệ Nương: AI điều khiển trực tiếp tư thế */
  Ch.ghostSync = function (rig, ps, alpha, vis, calm) {
    var c = Ch.byName.ghost; if (!c) return false;
    c.visible = c.root.visible = vis; if (!vis) return true;
    var J = c.J, rp = rig.root.pos, t = c.sp.tint, k;
    c.root.set(rp[0], rp[1] + rig.body.pos[1] - 0.14, rp[2]); c.root.rot[1] = rig.root.rot[1];
    J.chest.rot[0] = ps.lean; J.hips.rot[0] = ps.lean * 0.3; J.neck.rot[0] = rig.neck.rot[0]; J.neck.rot[1] = rig.neck.rot[1]; J.neck.rot[2] = rig.neck.rot[2] * 0.6; J.head.rot[2] = rig.neck.rot[2] * 0.5;
    J.shL.rot[0] = rig.armL.sh.rot[0]; J.shR.rot[0] = rig.armR.sh.rot[0]; J.shL.rot[2] = -ps.spread - 0.08; J.shR.rot[2] = ps.spread + 0.08; J.elL.rot[0] = rig.armL.el.rot[0]; J.elR.rot[0] = rig.armR.el.rot[0];
    J.haL.rot[0] = rig.armL.hand.rot[0]; J.haR.rot[0] = rig.armR.hand.rot[0]; J.fiL.rot[0] = J.fiR.rot[0] = calm ? -0.3 : -0.75;
    J.thL.rot[0] = J.thR.rot[0] = 0.06 - ps.lean * 0.5; J.knL.rot[0] = 0.12; J.knR.rot[0] = 0.2; J.ftL.rot[0] = J.ftR.rot[0] = 0.75;
    var open = M.clamp((ps.mouth - 0.45) / 2.3, 0, 1); c.morph[0] = open; c.morph[1] = open * 0.25; c.morph[2] = 0; c.morph[3] = 0; c.morph[4] = calm ? 0.3 : -1; c.morph[5] = calm ? 0.2 : -0.8;
    for (k = 0; k < c.rb.mats.length; k++) { var mt = c.rb.mats[k]; mt.fade = alpha >= 0.999 ? 0 : Math.max(0.02, alpha); mt.tint[0] = calm ? 0.8 : t[0]; mt.tint[1] = calm ? 0.85 : t[1]; mt.tint[2] = calm ? 1 : t[2]; mt.emis = calm ? [0.03, 0.04, 0.07] : c.sp.emis; }
    return true;
  };
  Ch.create = function (name, sp) {
    if (sp.rb && H.RBRig && H.RB && H.RB.chars[sp.rb]) return createRB(name, sp);
    var m = mats(sp.spirit), J = {}, c = { name: name, sp: sp, J: J, anim: 'idle', talkT: 0, look: null, ph: Math.random() * 9, walk: 0, blink: 2, T: {}, visible: false, morph: new Float32Array(6), speech: null, expr: null };
    var skin = sp.tone || [0.5, 0.33, 0.245], fem = !sp.male, k, top = sp.top, bot = sp.bot || top, sleeve = sp.sleeve || top, sx = fem ? 0.152 : 0.17;
    function N(parent, id, x, y, z, geo, mat) { var n = new Node(geo ? R.mesh(geo) : null, mat || null); n.set(x, y, z); parent.add(n); if (id) J[id] = n; return n; }
    var root = c.root = new Node(); root.visible = false; var s = (sp.h || 1.68) / 1.70; root.scl = [s, s, s];
    // ----- khung xương
    var mh = sp.mh && H.MHRig ? sp.mh : null, rg = mh ? H.MHRig.rig(mh.sex) : null, full = !!(mh && mh.full), hips, chest, neck, cA, hA; c.hipY = 0.95;
    if (full) { // khung điều khiển đặt đúng vị trí khớp MakeHuman (tư thế tay buông)
      var q = rg.q, I = H.MHRig.IDX, d3 = function (a, b) { return [q[I[a]][0] - q[I[b]][0], q[I[a]][1] - q[I[b]][1], q[I[a]][2] - q[I[b]][2]]; }, NN = function (par, id, o) { return N(par, id, o[0], o[1], o[2]); };
      s = (sp.h || 1.68) / (fem ? 1.7 : 1.775); root.scl = [s, s, s]; c.hipY = q[I.root][1];
      hips = NN(root, 'hips', q[I.root]); chest = NN(hips, 'chest', d3('spine03', 'root')); neck = NN(chest, 'neck', d3('neck01', 'spine03'));
      [-1, 1].forEach(function (sd) {
        var S = sd < 0 ? 'L' : 'R', ms = sd < 0 ? '.R' : '.L';
        var sh = NN(chest, 'sh' + S, d3('upperarm01' + ms, 'spine03')), el = NN(sh, 'el' + S, d3('lowerarm01' + ms, 'upperarm01' + ms)), hn = NN(el, 'ha' + S, d3('wrist' + ms, 'lowerarm01' + ms)); N(hn, 'fi' + S, 0, -0.08, 0);
        var th = NN(hips, 'th' + S, d3('upperleg01' + ms, 'root')), kn = NN(th, 'kn' + S, d3('lowerleg01' + ms, 'upperleg01' + ms)); NN(kn, 'ft' + S, d3('foot' + ms, 'lowerleg01' + ms));
      });
      var cn = d3('neck01', 'spine03'); cA = N(chest, null, cn[0], cn[1] - 0.335, cn[2] + 0.005 + (mh.chestZ || 0));
    } else {
    hips = N(root, 'hips', 0, 0.95, 0); chest = N(hips, 'chest', 0, 0.13, 0); neck = N(chest, 'neck', 0, 0.335, -0.005); cA = chest;
    var bp = { hips: [0, 0.95, 0], chest: [0, 1.08, 0], neck: [0, 1.415, -0.005] };
    [-1, 1].forEach(function (sd) {
      var S = sd < 0 ? 'L' : 'R', sh = N(chest, 'sh' + S, sd * sx, 0.258, 0), el = N(sh, 'el' + S, 0, -0.275, 0), hn = N(el, 'ha' + S, 0, -0.25, 0); N(hn, 'fi' + S, 0, -0.087, 0); bp['fi' + S] = [sd * sx, 0.726, 0];
      bp['sh' + S] = [sd * sx, 1.338, 0]; bp['el' + S] = [sd * sx, 1.063, 0]; bp['ha' + S] = [sd * sx, 0.813, 0];
      if (!sp.skirt) { var th = N(hips, 'th' + S, sd * 0.088, -0.06, 0), kn = N(th, 'kn' + S, 0, -0.42, 0); N(kn, 'ft' + S, 0, -0.41, 0); bp['th' + S] = [sd * 0.088, 0.89, 0]; bp['kn' + S] = [sd * 0.088, 0.47, 0]; bp['ft' + S] = [sd * 0.088, 0.06, 0]; }
    });
    // ----- thân: một lưới liền, mỗi đỉnh gắn 2 xương
    var body = new Geo(), skw = [], B = {}; BONES.forEach(function (b, i) { B[b] = J[b] ? i : 0; });
    function add(g, fn) { var n0 = g.p.length / 3; for (var i = 0; i < n0; i++) { var w = fn(g.p[i * 3], g.p[i * 3 + 1], g.p[i * 3 + 2]); skw.push(w[0], w[1], 1 - w[2], w[2]); } body.add(g); }
    var hem = sp.jacket ? 0.965 : 1.0, tc = sp.jacket || top;
    var tr = fem ? [[0.8, 0.06, 0.06], [0.86, 0.15, 0.104], [0.93, 0.166, 0.11], [0.97, 0.15, 0.1], [1.03, 0.118, 0.088], [1.1, 0.122, 0.092], [1.17, 0.134, 0.1, 0.004], [1.265, 0.15, 0.12, 0.016], [1.34, 0.158, 0.094], [1.385, 0.105, 0.072], [1.418, 0.056, 0.052]]
      : [[0.8, 0.065, 0.065], [0.86, 0.148, 0.103], [0.93, 0.152, 0.106], [0.97, 0.147, 0.102], [1.02, 0.14, 0.098], [1.09, 0.144, 0.1], [1.17, 0.156, 0.108], [1.27, 0.172, 0.114, 0.004], [1.345, 0.176, 0.1], [1.388, 0.12, 0.08], [1.418, 0.064, 0.058]];
    if (sp.jacket) tr.forEach(function (r) { if (r[0] > 0.96 && r[0] < 1.36) { r[1] *= 1.07; r[2] *= 1.1; } });
    var tg = loft(tr, null, 20, true, false);
    tg.colorFn(function (x, y, z) {
      var cc = y < hem ? bot : tc, f = 1;
      if (sp.jacket && z > 0 && Math.abs(x) < 0.007 && y > hem) f = 0.4;                 // khoá kéo
      if (y > 1.372) cc = sp.collar || cc;
      return [cc[0] * f, cc[1] * f, cc[2] * f, 0];
    });
    add(tg, function (x, y) { return [0, 1, M.smooth(1.0, 1.15, y)]; });
    if (!mh) add(loft([[1.4, 0.052, 0.05], [1.46, 0.044, 0.046], [1.515, 0.047, 0.05, 0.004]], [skin[0] * 0.92, skin[1] * 0.9, skin[2] * 0.9], 12), function (x, y) { return [1, 2, M.smooth(1.4, 1.47, y)]; });
    var dk = function (c0, f) { return [c0[0] * f, c0[1] * f, c0[2] * f]; }, fz = fem ? 0.1 : 0.106;
    if (sp.jacket) { // cổ áo dựng, gấu áo, túi ngực có nắp, khuy kéo
      add(loft([[1.385, 0.083, 0.078, -0.004], [1.415, 0.076, 0.072, -0.006], [1.447, 0.07, 0.068, -0.01]], dk(tc, 0.8), 16), function () { return [1, 2, 0.25]; });
      add(loft([[0.948, 0.166, fem ? 0.118 : 0.121], [0.965, 0.17, fem ? 0.121 : 0.124], [0.985, 0.165, fem ? 0.117 : 0.12]], dk(tc, 0.72), 20), function () { return [0, 1, 0.1]; });
      [-1, 1].forEach(function (sd) {
        add(Geo.box(0.075, 0.085, 0.012).xf(sd * 0.085, 1.215, fz + (fem ? 0.022 : 0.012), -0.06, 0, 0).color(tc[0] * 0.86, tc[1] * 0.86, tc[2] * 0.86, 0), function () { return [1, 1, 1]; });
        add(Geo.box(0.08, 0.028, 0.016).xf(sd * 0.085, 1.262, fz + (fem ? 0.026 : 0.015), -0.06, 0, 0).color(tc[0] * 0.7, tc[1] * 0.7, tc[2] * 0.7, 0), function () { return [1, 1, 1]; });
      });
      add(Geo.box(0.014, 0.022, 0.012).xf(0, 1.34, fz + 0.012).color(0.35, 0.33, 0.3, 0), function () { return [1, 1, 1]; });
    } else if (!sp.skirt) { // thắt lưng + khoá
      add(loft([[0.985, 0.147, 0.104], [1.0, 0.149, 0.106], [1.016, 0.146, 0.103]], [0.035, 0.028, 0.02], 20), function () { return [0, 1, 0.2]; });
      add(Geo.box(0.04, 0.03, 0.012).xf(0, 1.0, 0.108).color(0.3, 0.26, 0.14, 0), function () { return [0, 1, 0.2]; });
    }
    if (sp.skirt) { // áo dài/áo the: hàng khuy vải chéo vạt, dải thắt lưng có nút và tua
      for (var bq = 0; bq < 5; bq++) add(Geo.sphere(0.008, 6, 5).xf(0.012 + bq * 0.019, 1.36 - bq * 0.042, (fem ? 0.092 : 0.1) + bq * 0.004).color(0.02, 0.02, 0.02, 0), function () { return [1, 1, 1]; });
      var sash = sp.sash || (fem ? [0.42, 0.05, 0.05] : [0.12, 0.1, 0.07]);
      add(loft([[1.04, fem ? 0.125 : 0.142, 0.096], [1.07, fem ? 0.128 : 0.145, 0.099], [1.1, fem ? 0.125 : 0.142, 0.096]], sash, 20), function () { return [0, 1, 0.45]; });
      add(Geo.sphere(0.022, 8, 6).xf(-0.06, 1.07, 0.1).color(sash[0], sash[1], sash[2], 0), function () { return [0, 1, 0.45]; });
      var tails = Geo.box(0.035, 0.34, 0.008).xf(-0.072, 0.89, 0.108, 0, 0, 0.06); tails.add(Geo.box(0.035, 0.28, 0.008).xf(-0.045, 0.92, 0.112, 0, 0, -0.05));
      tails.colorFn(function (x, y) { return [sash[0], sash[1], sash[2], sq(M.clamp((1.06 - y) / 0.34, 0, 1)) * 0.1]; }); add(tails, function () { return [0, 0, 1]; });
    } else [-1, 1].forEach(function (sd) { // gấu quần
      add(loft([[0.105, 0.041, 0.043, 0, sd * 0.088], [0.085, 0.043, 0.045, 0, sd * 0.088], [0.07, 0.041, 0.043, 0, sd * 0.088]], dk(bot, 0.75), 12), function () { return [B['kn' + (sd < 0 ? 'L' : 'R')], 0, 0]; });
    });
    [-1, 1].forEach(function (sd) {
      var x0 = sd * sx, S = sd < 0 ? 'L' : 'R', sh = B['sh' + S], el = B['el' + S], ha = B['ha' + S];
      var ag = loft([[1.392, 0.018, 0.03, 0, x0 - sd * 0.02], [1.37, 0.044, 0.05, 0, x0 - sd * 0.004], [1.33, 0.051, 0.056, 0, x0 + sd * 0.006], [1.25, 0.046, 0.052, 0.002, x0 + sd * 0.004], [1.15, 0.041, 0.045, 0, x0], [1.075, 0.039, 0.042, -0.002, x0], [1.02, 0.041, 0.043, 0, x0], [0.93, 0.035, 0.036, 0, x0], [0.835, 0.027, 0.028, 0, x0]], null, 14, false, true);
      ag.colorFn(function (x, y) { var cl = (sp.shortSleeve ? y > 1.2 : y > 0.855) ? sleeve : skin; return [cl[0], cl[1], cl[2], 0]; });
      add(ag, function (x, y) { return y > 1.3 ? [1, sh, M.smooth(1.395, 1.315, y)] : [sh, el, M.smooth(1.11, 1.02, y)]; });
      var fi = B['fi' + S];
      if (!mh) add(handGeo(skin).xf(x0, 0.815, 0, 0, 0, 0, -sd, 1, 1), function (x, y) { return [ha, fi, Math.abs(x - x0) > 0.046 ? 0 : M.smooth(0.74, 0.712, y)]; });
      // cổ tay áo / măng-sét
      if (!sp.shortSleeve) add(loft([[0.875, 0.034, 0.035, 0, x0], [0.86, 0.036, 0.037, 0, x0], [0.842, 0.035, 0.036, 0, x0]], [sleeve[0] * 0.7, sleeve[1] * 0.7, sleeve[2] * 0.7], 12), function () { return [el, el, 1]; });
      if (!sp.skirt) {
        var lx = sd * 0.088, th = B['th' + S], kn = B['kn' + S], ft = B['ft' + S], shoe = sp.shoe || [0.03, 0.03, 0.035];
        add(loft([[0.97, 0.06, 0.07, 0, lx * 0.8], [0.9, 0.088, 0.094, 0, lx], [0.8, 0.085, 0.092, 0, lx], [0.65, 0.07, 0.076, 0, lx], [0.53, 0.058, 0.061, 0, lx], [0.47, 0.056, 0.058, 0.004, lx], [0.4, 0.052, 0.057, -0.006, lx], [0.32, 0.054, 0.062, -0.011, lx], [0.2, 0.043, 0.046, -0.004, lx], [0.085, 0.037, 0.039, 0, lx]], bot, 14, false, true),
          function (x, y) { return y > 0.8 ? [0, th, M.smooth(0.96, 0.85, y)] : [th, kn, M.smooth(0.52, 0.43, y)]; });
        var sg = Geo.sphere(1, 12, 8).xf(lx, 0.042, 0.052, 0, 0, 0, 0.047, 0.042, 0.128).color(shoe[0], shoe[1], shoe[2], 0);
        sg.add(Geo.box(0.086, 0.016, 0.25).xf(lx, 0.008, 0.052).color(shoe[0] * 0.4, shoe[1] * 0.4, shoe[2] * 0.4, 0));
        add(sg, function () { return [ft, ft, 1]; });
      }
    });
    if (sp.skirt) {
      var sc = sp.skirt, w = sp.male ? 0.86 : 1;
      var kg = loft([[0.05, 0.235 * w, 0.2 * w], [0.35, 0.2 * w, 0.165 * w], [0.7, 0.172 * w, 0.132], [0.95, 0.158, 0.112], [1.08, fem ? 0.123 : 0.14, 0.094]], null, 24);
      kg.colorFn(function (x, y, z) { var t = M.clamp((1.08 - y) / 1.03, 0, 1), f = 0.78 + 0.22 * Math.cos(Math.atan2(x, z) * 11) * t; return [sc[0] * f, sc[1] * f, sc[2] * f, t * t * 0.07]; });
      add(kg, function () { return [0, 0, 1]; });
      [-1, 1].forEach(function (sd) { add(Geo.sphere(1, 8, 6).xf(sd * 0.075, 0.035, 0.07, 0, 0, 0, 0.042, 0.03, 0.1).color(0.03, 0.025, 0.02, 0), function () { return [0, 0, 1]; }); });
    }
    body.extra = { data: skw, layout: [[6, 4]] };
    var bn = new Node(R.mesh(body), m.body); root.add(bn);
    bn.skin = { joints: BONES.map(function (b) { return J[b] || hips; }), inv: BONES.map(function (b) { var q = bp[b] || bp.hips, mm = M.create(); mm[12] = -q[0]; mm[13] = -q[1]; mm[14] = -q[2]; return mm; }), data: new Float32Array(16 * BONES.length) };
    }
    if (!sp.spirit) N(root, null, 0, 0.03, 0.02, Geo.quad([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]), m.shadow);
    // đầu, mắt, mí, miệng, tai, tóc
    var hp = { male: sp.male, jaw: sp.jaw || 1, nose: sp.nose || 1, lip: sp.lip || 1, age: sp.age || 0, brow: sp.brow || 1, blush: sp.blush === undefined ? (fem ? 0.5 : 0.15) : sp.blush, tone: skin, hair: sp.hair || [0.02, 0.016, 0.014] };
    if (sp.lipCol) hp.lipCol = sp.lipCol;
    var head;
    if (mh) {
      if (full) { var hq = d3('head', 'neck01'), ey = rg.eye, hp0 = rg.q[I.head]; head = N(neck, 'head', hq[0], hq[1], hq[2]); hA = N(head, null, 0, ey[1] - hp0[1] - 0.0215, ey[2] - hp0[2] - 0.0585); }
      else head = hA = N(neck, 'head', 0, 0.105, 0.012);
      c.eyes = [{ rot: [0, 0, 0] }, { rot: [0, 0, 0] }];
    } else {
    head = hA = N(neck, 'head', 0, 0.105, 0.012, Ch.headGeo(hp), m.skin); head.morph = c.morph;
    var eg = Geo.sphere(0.0116, 14, 10).xf(0, 0, 0, PI / 2, 0, 0);
    eg.colorFn(function (x, y, z) { var a = Math.acos(M.clamp(z / 0.0116, -1, 1)); return a < 0.2 ? [0, 0, 0, 0] : (a < 0.5 ? [0.09 * (1 - a), 0.045 * (1 - a), 0.02, 0] : [0.72, 0.7, 0.68, 0]); });
    var em = R.mesh(eg), lm = R.mesh(Geo.sphere(0.0136, 8, 6).color(skin[0] * 0.8, skin[1] * 0.78, skin[2] * 0.78, 0));
    c.eyes = [N(head, null, -0.031, 0.0215, 0.0585, null, null), N(head, null, 0.031, 0.0215, 0.0585, null, null)];
    var ul = R.mesh(Geo.sphere(0.0128, 10, 8).color(skin[0] * 0.86, skin[1] * 0.83, skin[2] * 0.83, 0)), ll = R.mesh(Geo.sphere(0.0122, 8, 6).color(skin[0] * 0.92, skin[1] * 0.9, skin[2] * 0.9, 0));
    [-1, 1].forEach(function (sd) { var u = N(head, null, sd * 0.031, 0.0285, 0.0575, null, null); u.mesh = ul; u.mat = m.skin; var l = N(head, null, sd * 0.031, 0.0125, 0.0565, null, null); l.mesh = ll; l.mat = m.skin; });
    c.eyes.forEach(function (e) { e.mesh = em; e.mat = m.eye; });
    var ear = Geo.sphere(1, 8, 6).xf(0, 0, 0, 0, 0, 0, 0.008, 0.026, 0.015).color(skin[0] * 0.95, skin[1] * 0.9, skin[2] * 0.9, 0);
    N(head, null, -0.074, 0.008, -0.006, ear, m.skin); N(head, null, 0.074, 0.008, -0.006, ear, m.skin);
    }
    var hs = sp.hairStyle || {}; hs.vol = hs.vol || 0; hs.fringe = hs.fringe || 0;
    if (!sp.bald && !mh) N(head, null, 0, 0, 0, hairGeo(hp, hs), m.hair);
    if (sp.turban) N(hA, null, 0, 0.062, -0.006, Geo.lathe([[0.07, -0.022], [0.092, -0.012], [0.097, 0.006], [0.088, 0.024], [0.07, 0.03], [0.05, 0.034], [0, 0.036]], 18, 2).xf(0, 0, 0, -0.16, 0, 0, 1, 1, 1.12).color(sp.turban[0], sp.turban[1], sp.turban[2], 0), m.cloth);
    if (sp.scarfHead && !mh) N(hA, null, 0, 0, 0, headGrid(28, 22, function (dx, cy, dz) { var q = skull(dx, cy, dz, hp); return [q[0] * 1.13, q[1] * 1.1 + 0.012 + (dz > 0.3 && cy > 0.5 ? 0.018 * (1 - Math.abs(dx) * 3) : 0), q[2] * 1.13 - 0.008, sp.scarfHead[0], sp.scarfHead[1], sp.scarfHead[2]]; }, function (X, Y, Z) { return Z > 0.02 ? Y > 0.07 - Math.abs(X) * 0.5 : Y > -0.13; }), m.cloth);
    if (sp.beard) N(hA, null, 0, 0, 0, Geo.lathe([[0.004, -0.19], [0.016, -0.16], [0.024, -0.125], [0.02, -0.105]], 8).xf(0, 0, 0.068, 0.25, 0, 0, 1, 1, 0.6).color(sp.beard[0], sp.beard[1], sp.beard[2], 0), m.hair);
    if (sp.glasses) { var gg = new Geo(); for (k = -1; k <= 1; k += 2) { var ring = []; for (var q = 0; q <= 12; q++) ring.push([k * 0.031 + Math.cos(q / 12 * 2 * PI) * 0.0175, 0.022 + Math.sin(q / 12 * 2 * PI) * 0.014, 0.079]); gg.add(Geo.tube(ring, 0.0016, 4)); gg.add(Geo.tube([[k * 0.049, 0.024, 0.078], [k * 0.076, 0.026, 0.0]], 0.0014, 4)); } gg.add(Geo.tube([[-0.0135, 0.025, 0.08], [0.0135, 0.025, 0.08]], 0.0015, 4)); N(hA, null, 0, 0, 0, gg.color(0.03, 0.03, 0.035, 0), m.hair); }
    // phụ kiện theo vai
    if (sp.camera) { var cg = new Geo(); cg.add(Geo.box(0.13, 0.085, 0.06).xf(0, 0.1, 0.135).color(0.04, 0.04, 0.045, 0)); cg.add(Geo.lathe([[0, 0], [0.034, 0], [0.036, 0.05], [0, 0.045]], 10).xf(0, 0.1, 0.16, PI / 2, 0, 0).color(0.08, 0.08, 0.1, 0)); cg.add(Geo.tube([[-0.06, 0.13, 0.12], [-0.1, 0.3, 0.04], [-0.05, 0.345, -0.05], [0.05, 0.345, -0.05], [0.1, 0.3, 0.04], [0.06, 0.13, 0.12]], 0.006, 4).color(0.1, 0.07, 0.04, 0)); N(cA, null, 0, 0, 0, cg, m.hair); }
    if (sp.pack) N(cA, null, 0, 0.12, -0.15, Geo.sphere(1, 10, 8).xf(0, 0, 0, 0, 0, 0, 0.15, 0.2, 0.09).color(sp.pack[0], sp.pack[1], sp.pack[2], 0), m.cloth);
    if (sp.scarf) N(cA, null, 0, 0.33, 0.005, Geo.lathe([[0.06, -0.03], [0.085, -0.015], [0.088, 0.012], [0.068, 0.03], [0.05, 0.028]], 14).xf(0, 0, 0, 0.12, 0, 0, 1, 1, 0.95).color(sp.scarf[0], sp.scarf[1], sp.scarf[2], 0), m.cloth);
    if (sp.yem) N(cA, null, 0, 0, 0, loft([[-0.02, 0.1, 0.02, 0.085], [0.14, 0.11, 0.03, 0.105], [0.27, 0.06, 0.02, 0.085]], sp.yem, 8, true, true), m.cloth);
    // dải lụa điều trói (ẩn mặc định)
    var bg = new Geo(); for (k = 0; k < 4; k++) bg.add(Geo.lathe([[0.168, 0], [0.173, 0.016], [0.168, 0.03]], 14).xf(0, 0.03 + k * 0.07, 0, (k % 2) * 0.14 - 0.07, 0, 0, 1.12, 1, 0.74));
    c.bind = N(cA, null, 0, 0, 0, bg.color(0.5, 0.02, 0.02, 0), m.cloth); c.bind.visible = false;
    if (mh) {
      var XR = H.MHRig, tm = function (a, b2) { return [a[0] * b2[0], a[1] * b2[1], a[2] * b2[2], 1]; }, st = mh.skinTint || [Math.min(1, skin[0] / 0.56) * 0.86, Math.min(1, skin[1] / 0.39) * 0.72, Math.min(1, skin[2] / 0.3) * 0.62], ht = mh.hairTint || (sp.hair ? [sp.hair[0] * 9, sp.hair[1] * 9, sp.hair[2] * 9] : [0.2, 0.17, 0.16]), ct = mh.clothTint || [1, 1, 1];
      var skinMat = { tex: XR.tex(fem ? 'young_lightskinned_female' : 'young_lightskinned_male'), rough: 0.56, nscale: 0, sss: 0.8, rim: 0.3, tint: tm(m.skin.tint, st), emis: m.skin.emis };
      var cfg = { sex: mh.sex, full: full, browCol: mh.browCol, body: mh.body, longSleeves: mh.longSleeves, skinMat: skinMat, eyeMat: m.eye, mouthMat: { tex: 'plain', rough: 0.35, tint: m.skin.tint.slice(), emis: m.skin.emis }, parts: [], iris: mh.iris };
      if (full) {
        cfg.parts.push({ mesh: mh.cloth, mat: { tex: XR.tex(mh.clothTex), rough: 0.9, nscale: 0.9, rim: 0.4, tint: tm(m.cloth.tint, ct), emis: m.cloth.emis } });
        cfg.parts.push({ mesh: fem ? 'female_shoes01' : 'male_shoes01', mat: { tex: XR.tex('shoes01'), rough: 0.7, nscale: 0.8, tint: tm(m.cloth.tint, mh.shoeTint || [1, 1, 1]), emis: m.cloth.emis } });
      } else {
        var kk = mh.k || 1, ex = rg.eye; cfg.k = kk; cfg.kh = mh.kh || 1; cfg.rest = { head: [0, 1.52, 0.007], neck: [0, 1.415, -0.005], chest: [0, 1.08, 0] };
        cfg.t = [0, 1.52 + 0.0215 - kk * ex[1], 0.007 + 0.0585 - kk * ex[2]]; cfg.neckCut = rg.P[XR.IDX.neck01][1] - 0.03;
      }
      if (mh.hair) cfg.parts.push({ mesh: mh.hair, mat: { tex: XR.tex(mh.hairTex, false), rough: 0.45, nscale: 0, rim: 0.5, cutout: 1, tint: tm(m.hair.tint, ht), emis: m.hair.emis } });
      XR.attach(c, cfg);
    }
    for (k in J) c.T[k] = [0, 0, 0];
    R.nodes.push(root); Ch.list.push(c); Ch.byName[name] = c;
    return c;
  };

  /* ===================== CHUYỂN ĐỘNG ===================== */
  function arm(T, S, rx, rz, el, ry) { var sd = S === 'L' ? -1 : 1; T['sh' + S][0] = rx; T['sh' + S][2] = sd * rz; T['sh' + S][1] = (ry || 0) * sd; T['el' + S][0] = el; }
  function leg(T, S, th, kn, ft) { if (!T['th' + S]) return; T['th' + S][0] = th; T['kn' + S][0] = kn; T['ft' + S][0] = ft || 0; }
  var FING = { plead: 0.12, pound: -1.35, recoil: 0.1, cower: -0.9, bound: -1.2, boundStand: -1.2, point: 0.05, write: -1.0, crouch: -0.2 };
  var ANIM = {
    idle: function (c, T, t) {
      var ws = Math.sin(t * 0.42), sh2 = M.smooth(-0.6, 0.6, Math.sin(t * 0.21 + c.ph)) * 2 - 1;       // dồn trọng tâm qua lại giữa hai chân
      T.hips[2] = ws * 0.03 + sh2 * 0.035; T.chest[2] = -ws * 0.03 - sh2 * 0.03; T.hips[1] = sh2 * 0.05; T.chest[1] = -sh2 * 0.04 + Math.sin(t * 0.33) * 0.03;
      arm(T, 'L', 0.03 + Math.sin(t * 0.8) * 0.035, 0.05 + sh2 * 0.015, -0.17 + Math.sin(t * 0.9 + 1) * 0.03); arm(T, 'R', 0.03 - Math.sin(t * 0.8) * 0.035, 0.05 - sh2 * 0.015, -0.19 + Math.sin(t * 0.7) * 0.03);
      leg(T, 'L', -0.02 - sh2 * 0.03, 0.05 + Math.max(0, sh2) * 0.12); leg(T, 'R', -0.02 + sh2 * 0.03, 0.05 + Math.max(0, -sh2) * 0.12);
      if (T.thL) { T.thL[2] = -T.hips[2]; T.thR[2] = -T.hips[2]; }
      if (!c.look) { T.neck[1] = Math.sin(t * 0.27 + c.ph * 2) * 0.22 * M.smooth(0.2, 0.9, Math.sin(t * 0.11 + c.ph)); T.neck[0] = Math.sin(t * 0.19) * 0.04; }  // thỉnh thoảng nhìn quanh
    },
    walk: function (c, T, t) {
      var p = c.walk, s = Math.sin(p), co = Math.cos(p);
      leg(T, 'L', -s * 0.56 - 0.1, 0.1 + Math.max(0, co) * 0.85 + Math.max(0, -s) * 0.12, Math.max(0, -s) * 0.28 - Math.max(0, s) * 0.22);     // nhấc gót, đặt gót
      leg(T, 'R', s * 0.56 - 0.1, 0.1 + Math.max(0, -co) * 0.85 + Math.max(0, s) * 0.12, Math.max(0, s) * 0.28 - Math.max(0, -s) * 0.22);
      var al = Math.sin(p - 0.35), ar = Math.sin(p + Math.PI - 0.35);                                                                    // tay vung trễ pha so với chân
      arm(T, 'L', al * 0.46, 0.06, -0.3 - Math.max(0, al) * 0.32); arm(T, 'R', ar * 0.46, 0.06, -0.3 - Math.max(0, ar) * 0.32);
      T.hips[1] = -s * 0.09; T.hips[2] = co * 0.035; T.chest[1] = s * 0.13; T.chest[2] = -co * 0.03; T.chest[0] = 0.07; T.neck[1] += -s * 0.05; T.neck[2] = co * 0.012;
      if (T.thL) { T.thL[2] = -T.hips[2]; T.thR[2] = -T.hips[2]; }
      c.dy = -Math.abs(co) * 0.026 - 0.008;
    },
    kneel: function (c, T, t) { c.dy = -0.43; leg(T, 'L', -0.12, 1.72, 0.7); leg(T, 'R', -0.12, 1.72, 0.7); T.chest[0] = 0.08; arm(T, 'L', -0.25, 0.05, -0.5); arm(T, 'R', -0.25, 0.05, -0.5); },
    bound: function (c, T, t) { ANIM.kneel(c, T, t); arm(T, 'L', 0.55, -0.12, -0.75); arm(T, 'R', 0.55, -0.12, -0.75); T.chest[0] = 0.2 + Math.sin(t * 2.2) * 0.03; T.neck[0] = 0.32; T.chest[2] = Math.sin(t * 1.3) * 0.04; },
    boundStand: function (c, T, t) { arm(T, 'L', 0.5, -0.12, -0.7); arm(T, 'R', 0.5, -0.12, -0.7); T.chest[0] = 0.12; T.neck[0] = 0.28; T.hips[2] = Math.sin(t * 0.9) * 0.03; leg(T, 'L', 0, 0.05); leg(T, 'R', 0, 0.05); },
    plead: function (c, T, t) { ANIM.kneel(c, T, t); arm(T, 'L', -2.1 + Math.sin(t * 3.1) * 0.12, 0.3, -0.5); arm(T, 'R', -2.0 + Math.cos(t * 2.7) * 0.12, 0.3, -0.55); T.chest[0] = -0.12; T.neck[0] = -0.25; },
    pound: function (c, T, t) { var a = Math.sin(t * 8 + c.ph), b = Math.sin(t * 8 + c.ph + 2.4); arm(T, 'L', -2.35 + a * 0.45, 0.2, -0.75 - a * 0.4); arm(T, 'R', -2.3 + b * 0.45, 0.2, -0.75 - b * 0.4); T.chest[0] = 0.16 + a * 0.04; T.neck[0] = -0.1; leg(T, 'L', -0.2, 0.3); leg(T, 'R', 0.15, 0.1); },
    cower: function (c, T, t) { c.dy = -0.68; leg(T, 'L', -1.95, 2.3, 0.2); leg(T, 'R', -1.9, 2.25, 0.2); T.chest[0] = 0.5 + Math.sin(t * 5) * 0.012; arm(T, 'L', -1.15, -0.32, -1.25); arm(T, 'R', -1.2, -0.3, -1.3); T.neck[0] = c.look ? -0.2 : 0.38; },
    point: function (c, T, t) { ANIM.idle(c, T, t); arm(T, 'R', -1.42 + Math.sin(t * 1.7) * 0.03, 0.1, -0.08); T.chest[1] = -0.12; },
    write: function (c, T, t) { T.chest[0] = 0.42; T.neck[0] = 0.3; arm(T, 'R', -0.95 + Math.sin(t * 6) * 0.03, -0.1, -1.05 + Math.sin(t * 9) * 0.05); arm(T, 'L', -0.7, 0.15, -0.9); leg(T, 'L', 0, 0.05); leg(T, 'R', 0, 0.05); },
    recoil: function (c, T, t) { T.chest[0] = -0.22; arm(T, 'L', -1.0, 0.5, -1.5); arm(T, 'R', -1.1, 0.45, -1.4); leg(T, 'L', 0.25, 0.3); leg(T, 'R', -0.3, 0.45); T.neck[0] = -0.1; c.dy = -0.05; },
    crouch: function (c, T, t) { c.dy = -0.4; leg(T, 'L', -1.5, 1.62, 0); leg(T, 'R', 0.12, 1.75, 0.8); T.chest[0] = 0.25; arm(T, 'L', -0.9, 0.1, -0.6); arm(T, 'R', -0.3, 0.1, -0.7); },
    carry: function (c, T, t) { ANIM.walk(c, T, t); arm(T, 'R', -1.1, 0.15, -0.9); }
  };
  Ch.update = function (dt, time) {
    for (var n = 0; n < Ch.list.length; n++) {
      var c = Ch.list[n]; if (!c.visible) continue;
      if (c.manual) { if (!H.AI || !(H.AI.alpha > 0.02)) c.visible = c.root.visible = false; continue; }
      var T = c.T, J = c.J, k, t = time + c.ph;
      for (k in T) { T[k][0] = T[k][1] = T[k][2] = 0; }
      c.dy = 0; T.fiL[0] = T.fiR[0] = -0.45 + Math.sin(t * 0.6) * 0.06; (ANIM[c.anim] || ANIM.idle)(c, T, t);
      var fh = FING[c.anim]; if (fh !== undefined) { T.fiL[0] = fh; T.fiR[0] = c.anim === 'point' ? -0.4 : fh; }
      T.chest[0] += Math.sin(t * 1.5) * 0.012;                                    // nhịp thở
      if (c.talkT > 0) {                                                           // nói: gật đầu, đưa tay, mấp máy môi
        c.talkT -= dt; T.neck[0] += Math.sin(t * 5.3) * 0.035; T.head[1] += Math.sin(t * 2.1) * 0.07;
        if (c.anim === 'idle' || c.anim === 'point') { T.shR[0] = -0.55 + Math.sin(t * 2.9) * 0.18; T.elR[0] = -1.05 + Math.sin(t * 4.3) * 0.28; T.shR[2] = 0.12; T.shL[0] = -0.2 + Math.sin(t * 2.3) * 0.1; T.elL[0] = -0.6; }
      }
      if (c.look) {                                                                // đầu + mắt dõi theo
        var px = c.root.pos[0], pz = c.root.pos[2], py = c.root.pos[1] + (c.hipY + c.dy + 0.57) * c.root.scl[1];
        var dx = c.look[0] - px, dz = c.look[2] - pz, yaw = M.clamp(M.angDiff(c.root.rot[1], Math.atan2(dx, dz)), -1.1, 1.1), pit = M.clamp(-Math.atan2(c.look[1] - py, Math.hypot(dx, dz)), -0.6, 0.6);
        T.neck[1] += yaw * 0.4; T.head[1] += yaw * 0.45; T.neck[0] += pit * 0.4; T.head[0] += pit * 0.45; T.chest[1] += yaw * 0.12;
        c.eyes[0].rot[1] = c.eyes[1].rot[1] = yaw * 0.25; c.eyes[0].rot[0] = c.eyes[1].rot[0] = pit * 0.3; c.lookYaw = yaw; c.lookPit = pit;
      } else { c.lookYaw = c.lookPit = 0; c.sacT = (c.sacT || 0) - dt; if (c.sacT <= 0) { c.sacT = 0.5 + Math.random() * 1.8; c.sacX = (Math.random() - 0.5) * 0.3; c.sacY = (Math.random() - 0.5) * 0.12; } c.eyes[0].rot[1] = c.eyes[1].rot[1] = c.sacX; c.eyes[0].rot[0] = c.eyes[1].rot[0] = c.sacY; }
      c.blink -= dt; var bl = c.blink < 0.13 ? 1 : 0; if (c.blink < 0) c.blink = 1.8 + Math.random() * 3.5;
      // biểu cảm + khẩu hình -> trọng số biến hình [há, bè, chúm, nhắm mắt, mày, cười]
      var ex = EXPR[c.expr || AEX[c.anim] || 'neutral'], mo = [ex[0], ex[1], ex[2], bl, ex[3], ex[4]], sp2 = c.speech;
      if (sp2) { sp2.t += dt; if (sp2.t >= sp2.dur) c.speech = null; else { var v = sp2.v[Math.min(sp2.v.length - 1, Math.floor(sp2.t / sp2.dur * sp2.v.length))]; mo[0] = Math.max(mo[0] * 0.4, v[0]); mo[1] += v[1]; mo[2] += v[2]; } }
      for (k = 0; k < 6; k++) c.morph[k] += (mo[k] - c.morph[k]) * Math.min(1, dt * (k === 3 ? 30 : 19));
      // khớp bám theo tư thế đích bằng lò xo giảm chấn -> có đà, có trễ, không giật cục
      var V = c.V || (c.V = {}), h = Math.min(dt, 0.033), a3;
      for (k in T) {
        var jr = J[k].rot, tr = T[k], vv = V[k] || (V[k] = [0, 0, 0]), kS = k.charAt(0) === 'f' ? 90 : (k === 'head' || k === 'neck' ? 70 : 120), dS = 2 * Math.sqrt(kS) * 0.78;
        for (a3 = 0; a3 < 3; a3++) { vv[a3] += (kS * (tr[a3] - jr[a3]) - dS * vv[a3]) * h; jr[a3] += vv[a3] * h; }
      }
      J.hips.pos[1] += (c.hipY + c.dy - J.hips.pos[1]) * Math.min(1, dt * 6);
      if (c.rb) { H.RBRig.play(c.rb, clipFor(c)); c.rb.clipT += dt; c.rb.fade = Math.min(1, c.rb.fade + dt / 0.38); }
      if (c.sp.spirit) c.root.pos[1] = c.baseY + 0.06 + Math.sin(t * 1.1) * 0.035;
    }
    if (Ch.worldTick) Ch.worldTick(dt, time);
  };
  /* đặt nhân vật: toạ độ, hướng mặt (ry), tư thế, điểm nhìn */
  Ch.put = function (name, x, y, z, ry, anim, look) {
    var c = Ch.byName[name]; if (!c) return null;
    if (!c.visible) { c.visible = c.root.visible = true; for (var k in c.T) { c.J[k].rot[0] = c.J[k].rot[1] = c.J[k].rot[2] = 0; } c.snap = true; }
    c.root.set(x, y, z); c.baseY = y; c.root.rot[1] = ry; c.anim = anim || 'idle'; c.look = look || null;
    if (c.snap && c.rb) { H.RBRig.play(c.rb, clipFor(c), true); c.rb.fade = 1; }
    if (c.snap) { c.snap = false; c.V = {}; c.dy = 0; var T = c.T; for (k in T) T[k][0] = T[k][1] = T[k][2] = 0; (ANIM[c.anim] || ANIM.idle)(c, T, 0); for (k in T) { c.J[k].rot[0] = T[k][0]; c.J[k].rot[1] = T[k][1]; c.J[k].rot[2] = T[k][2]; } c.J.hips.pos[1] = c.hipY + c.dy; }
    return c;
  };
  /* đi bộ theo đoạn thẳng trong khoảng thời gian u = 0..1 */
  Ch.walkLine = function (name, a, b, u, dt, look) {
    var x = M.lerp(a[0], b[0], u), z = M.lerp(a[1], b[1], u), moving = u > 0 && u < 1;
    var c = Ch.put(name, x, H.World.heightAt(x, z), z, Math.atan2(b[0] - a[0], b[1] - a[1]), moving ? 'walk' : 'idle', look);
    if (c && moving) c.walk += dt * 6.2; return c;
  };
  Ch.hide = function (name) { var c = Ch.byName[name]; if (c) { c.visible = c.root.visible = false; c.bind.visible = false; c.talkT = 0; c.speech = null; c.expr = null; } };
  Ch.hideAll = function () { for (var k in Ch.byName) if (!Ch.byName[k].manual) Ch.hide(k); };
  /* khẩu hình: mỗi chữ cái của câu thoại -> [há, bè, chúm] */
  var VIS = { a: [0.85, 0.1, 0], e: [0.5, 0.55, 0], i: [0.2, 0.85, 0], y: [0.2, 0.85, 0], o: [0.6, 0, 0.75], u: [0.25, 0, 1], m: [0, 0, 0.1], b: [0, 0, 0.1], p: [0, 0, 0.1], v: [0.08, 0.25, 0], f: [0.08, 0.25, 0], ' ': [0.06, 0, 0] };
  var REST = [0, 0, 0], CONS = [0.18, 0.12, 0];
  function visemes(text) {
    var s = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), out = [];
    for (var i = 0; i < s.length; i++) { var ch = s[i]; if (/[.,!?…—:;"“”]/.test(ch)) out.push(REST, REST, REST); else out.push(VIS[ch] || CONS); }
    return out;
  }
  var EXPR = { neutral: [0, 0, 0, 0, 0], fear: [0.28, 0.15, 0, 0.9, -0.2], anger: [0.05, 0.3, 0, -1, -0.3], sad: [0, 0, 0, 0.55, -0.55], calm: [0, 0, 0, 0.1, 0.4] };
  var AEX = { recoil: 'fear', cower: 'fear', plead: 'fear', pound: 'fear', point: 'anger', bound: 'sad', boundStand: 'sad', kneel: 'sad', write: 'sad' };
  Ch.say = function (name, dur, text) {
    var c = Ch.byName[name]; if (!c || !c.visible) return; c.talkT = dur;
    if (text) { var v = visemes(text); c.speech = { v: v, t: 0, dur: Math.min(dur, v.length / 14) }; }
  };
  Ch.expr = function (name, e) { var c = Ch.byName[name]; if (c) c.expr = e; };

  /* ===================== DÀN NHÂN VẬT ===================== */
  var BLK = [0.018, 0.015, 0.014], TAN = [0.43, 0.28, 0.2], PALE = [0.56, 0.39, 0.3];
  Ch.CAST = {
    // --- 1994 ---
    minh: { rb: 'minh', idle: 'nervous_03', male: 1, h: 1.75, jaw: 1.02, nose: 1.05, age: 0.12, tone: [0.47, 0.31, 0.23], hairStyle: { fringe: 0.5, vol: 0.4 }, top: [0.11, 0.13, 0.07], jacket: [0.13, 0.15, 0.08], collar: [0.09, 0.105, 0.06], bot: [0.035, 0.045, 0.075], shoe: [0.05, 0.035, 0.025], camera: 1 },
    linh: { rb: 'linh', h: 1.64, jaw: 0.92, nose: 0.9, lip: 1.1, tone: PALE, hairStyle: { long: 0.3, fringe: 0.25, vol: 0.2 }, top: [0.3, 0.025, 0.03], jacket: [0.33, 0.03, 0.035], collar: [0.25, 0.02, 0.025], bot: [0.03, 0.03, 0.035], shoe: [0.04, 0.03, 0.03] },
    tuan: { rb: 'tuan', idle: 'look_around_01', male: 1, h: 1.79, jaw: 1.08, nose: 1.1, age: 0.2, tone: TAN, hairStyle: { fringe: 0.15, vol: 0.1 }, top: [0.05, 0.11, 0.2], jacket: [0.055, 0.12, 0.22], bot: [0.09, 0.08, 0.06], pack: [0.16, 0.2, 0.09], glasses: 1 },
    ha: { rb: 'ha', idle: 'nervous_03', stress: 1, h: 1.57, jaw: 0.88, nose: 0.85, lip: 1.05, blush: 0.7, tone: [0.58, 0.4, 0.31], hairStyle: { fringe: 0.8, vol: 0.3, braid: 1 }, top: [0.5, 0.36, 0.05], jacket: [0.55, 0.4, 0.06], bot: [0.05, 0.06, 0.1], scarf: [0.5, 0.08, 0.08], shoe: [0.5, 0.45, 0.4] },
    // --- 1874 ---
    le: { rb: 'le', tint: [0.82, 0.76, 0.7], stress: 1, h: 1.6, jaw: 0.9, nose: 0.88, lip: 1.12, blush: 0.55, tone: [0.6, 0.42, 0.33], hairStyle: { long: 0.42, fringe: 0.1, vol: 0.15, side: 0.045 }, top: [0.055, 0.03, 0.034], sleeve: [0.055, 0.03, 0.034], collar: [0.3, 0.27, 0.2], yem: [0.5, 0.04, 0.04], skirt: [0.05, 0.035, 0.03], bot: [0.05, 0.035, 0.03] },
    khai: { rb: 'khai', tint: [0.8, 0.74, 0.68], idle: 'angry_01', male: 1, h: 1.67, jaw: 1.1, nose: 1.15, age: 0.85, brow: 1.4, tone: [0.44, 0.3, 0.22], hair: [0.12, 0.12, 0.12], hairStyle: { fringe: 0 }, turban: [0.02, 0.02, 0.045], beard: [0.2, 0.2, 0.2], top: [0.022, 0.022, 0.03], skirt: [0.022, 0.022, 0.03], collar: [0.5, 0.48, 0.42], bot: [0.02, 0.02, 0.03] },
    me: { rb: 'me', tint: [0.8, 0.74, 0.68], stress: 1, h: 1.52, jaw: 0.95, age: 0.6, blush: 0.1, tone: [0.5, 0.35, 0.27], hair: [0.1, 0.1, 0.1], hairStyle: { fringe: 0 }, scarfHead: [0.025, 0.022, 0.022], top: [0.075, 0.05, 0.035], yem: [0.25, 0.22, 0.17], skirt: [0.04, 0.03, 0.025], bot: [0.04, 0.03, 0.025] },
    cha: { rb: 'cha', tint: [0.8, 0.74, 0.68], male: 1, h: 1.63, age: 0.7, tone: TAN, hair: [0.1, 0.1, 0.1], hairStyle: { bun: 2 }, beard: [0.25, 0.25, 0.25], top: [0.07, 0.055, 0.04], skirt: [0.06, 0.047, 0.035], bot: [0.06, 0.047, 0.035] },
    bay: { rb: 'bay', tint: [0.8, 0.74, 0.68], idle: 'look_around_01', male: 1, h: 1.66, jaw: 1.05, age: 0.5, tone: TAN, hairStyle: { bun: 2 }, turban: [0.14, 0.1, 0.06], top: [0.1, 0.08, 0.05], shortSleeve: 1, bot: [0.06, 0.05, 0.04], shoe: TAN },
    tran: { rb: 'tran', tint: [0.8, 0.74, 0.68], idle: 'look_around_01', male: 1, h: 1.72, jaw: 1.12, nose: 1.12, age: 0.4, tone: [0.38, 0.25, 0.18], hairStyle: { bun: 2 }, top: [0.07, 0.06, 0.05], shortSleeve: 1, bot: [0.05, 0.045, 0.04], shoe: [0.38, 0.25, 0.18] },
    // --- linh hồn ---
    bayHon: { rb: 'bayHon', tint: [0.5, 0.72, 1.0], emis: [0.03, 0.06, 0.1], fade: 0.8, male: 1, h: 1.66, jaw: 1.05, age: 0.9, tone: TAN, hair: [0.3, 0.3, 0.3], hairStyle: { bun: 2 }, turban: [0.14, 0.1, 0.06], top: [0.1, 0.08, 0.05], skirt: [0.08, 0.065, 0.05], bot: [0.06, 0.05, 0.04], spirit: 1 },
    ghost: { rb: 'ghost', h: 1.66, tint: [0.6, 0.6, 0.68], emis: [0.014, 0.006, 0.008], manual: 1, spirit: 1 },
    khang: { rb: 'khang', tint: [0.9, 0.95, 0.85], emis: [0.05, 0.06, 0.04], fade: 0.86, male: 1, h: 1.73, jaw: 0.98, nose: 1.0, tone: PALE, hairStyle: { bun: 2, fringe: 0.1 }, top: [0.42, 0.42, 0.4], skirt: [0.4, 0.4, 0.38], collar: [0.5, 0.5, 0.48], bot: [0.4, 0.4, 0.38], spirit: 1 }
  };
  Ch.init = function () {
    R.materials.fabric = { alb: R.textures.white, nrm: R.materials.silk ? R.materials.silk.nrm : R.textures.flat, uv: 7 };
    var cv = document.createElement('canvas'); cv.width = cv.height = 64; var x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    R.materials.blob = { alb: R.texData(64, 64, cv, { clamp: true }), uv: 1 };
    for (var k in Ch.CAST) Ch.create(k, Ch.CAST[k]);
  };

  /* nhân vật thường trực trong thế giới (ngoài cắt cảnh) */
  Ch.worldTick = function () {
    var Mn = H.Main, Pz = H.Puzzles, W = H.World, P = H.Player; if (!Mn || Mn.state !== 'play' || !Pz || !W.props.houseC) return;
    var f = Pz.flags, cam = R.cam.pos, s = H.Cutscenes && H.Cutscenes.haSpot;
    if (f.gotMirror && s) Ch.put('ha', s.x, s.y, s.z, s.ry, 'cower', Math.hypot(P.pos[0] - s.x, P.pos[2] - s.z) < 7 ? cam : null); else Ch.hide('ha');
    var t = W.props.temple, r = t.ritual;
    if (f.templeOpen) { var c = Ch.put('linh', r.pos[0] - 3.4, t.floorY + 0.06, r.pos[2] + 0.6, Math.PI / 2, 'bound', Math.hypot(P.pos[0] - r.pos[0], P.pos[2] - r.pos[2]) < 9 ? cam : null); c.bind.visible = true; } else Ch.hide('linh');
  };
  // cập nhật nhân vật cùng nhịp với thế giới
  var wu = H.World.update;
  H.World.update = function (dt, time, pos) { wu(dt, time, pos); Ch.update(dt, time); };
})();
