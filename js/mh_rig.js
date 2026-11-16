/* HUYẾT LỆ THÔN — mh_rig.js
   Dựng nhân vật từ tài nguyên MakeHuman (CC0) trong mh_assets.js:
   - khung xương 163 khớp, skinning 4 trọng số trên GPU (ma trận xương nằm trong texture float)
   - khung "điều khiển" 17 khớp của characters.js lái khung MakeHuman (tư thế A được nắn về tư thế tay buông)
   - mặt: xương hàm, môi, mí mắt, lông mày, nhãn cầu -> khẩu hình + biểu cảm + chớp mắt + liếc nhìn */
(function () {
  'use strict';
  var H = window.HuyetLeThon, M = H.M, R = H.R, Geo = H.Geo, Node = H.Node, X = H.MHRig = {};
  var MH = H.MH, NB = MH.rig.boneNames.length, NAMES = MH.rig.boneNames, PAR = MH.rig.parents, IDX = {};
  NAMES.forEach(function (n, i) { IDX[n] = i; });
  X.IDX = IDX;
  function unpack(b64, T) { var raw = atob(b64), n = raw.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = raw.charCodeAt(i); return new T(u.buffer); }
  var BIN = {};
  function meshData(name) {
    if (BIN[name]) return BIN[name];
    var m = MH.assets.meshes[name];
    return (BIN[name] = { p: unpack(m.position, Float32Array), uv: unpack(m.uv, Float32Array), i: unpack(m.index, Uint32Array), si: unpack(m.skinIndex, Uint16Array), sw: unpack(m.skinWeight, Float32Array) });
  }
  /* ---------- toán xoay ---------- */
  function rotMin(a, b) { // ma trận xoay ngắn nhất đưa vector đơn vị a về b
    var ax = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], s = Math.hypot(ax[0], ax[1], ax[2]), c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], m = M.create();
    if (s < 1e-6) return m; var x = ax[0] / s, y = ax[1] / s, z = ax[2] / s, t = 1 - c;
    m[0] = t * x * x + c; m[1] = t * x * y + s * z; m[2] = t * x * z - s * y; m[4] = t * x * y - s * z; m[5] = t * y * y + c; m[6] = t * y * z + s * x; m[8] = t * x * z + s * y; m[9] = t * y * z - s * x; m[10] = t * z * z + c; return m;
  }
  function rv(m, v) { return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]]; }
  function tr3(m) { var o = M.create(); o[0] = m[0]; o[1] = m[4]; o[2] = m[8]; o[4] = m[1]; o[5] = m[5]; o[6] = m[9]; o[8] = m[2]; o[9] = m[6]; o[10] = m[10]; return o; }
  function mul(a, b) { var o = M.create(); M.mul(o, a, b); return o; }
  function nrm(a, b) { var d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(d[0], d[1], d[2]); return [d[0] / l, d[1] / l, d[2] / l]; }
  function isId(m) { return Math.abs(m[0] - 1) < 1e-6 && Math.abs(m[5] - 1) < 1e-6 && Math.abs(m[10] - 1) < 1e-6; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

  /* ---------- khung xương theo giới ---------- */
  var RIGS = {};
  X.rig = function (sex) {
    if (RIGS[sex]) return RIGS[sex];
    var d = MH.rig[sex], P = d.bones, order = [], seen = [], i, DOWN = [0, -1, 0];
    function visit(b) { if (seen[b]) return; if (PAR[b] >= 0) visit(PAR[b]); seen[b] = 1; order.push(b); }
    for (i = 0; i < NB; i++) visit(i);
    var own = {};
    ['.L', '.R'].forEach(function (s) { // nắn tư thế A: bắp tay, cẳng tay, bàn tay cùng buông thẳng xuống
      var ua = IDX['upperarm01' + s], la = IDX['lowerarm01' + s], wr = IDX['wrist' + s], f3 = IDX['finger3-1' + s];
      var C = rotMin(nrm(P[ua], P[la]), DOWN), Gl = mul(rotMin(rv(C, nrm(P[la], P[wr])), DOWN), C), Gh = mul(rotMin(rv(Gl, nrm(P[wr], P[f3])), DOWN), Gl);
      own[ua] = C; own[la] = Gl; own[wr] = Gh;
    });
    var G = [], pre = [], stat = [], q = [], ID = M.create();
    order.forEach(function (b) {
      var p = PAR[b]; G[b] = own[b] || (p >= 0 ? G[p] : ID);
      pre[b] = p >= 0 ? tr3(G[p]) : ID;
      stat[b] = (p >= 0 && G[b] !== G[p]) ? mul(pre[b], G[b]) : null;
      if (p < 0) q[b] = P[b].slice(); else { var o = rv(G[p], [P[b][0] - P[p][0], P[b][1] - P[p][1], P[b][2] - P[p][2]]); q[b] = [q[p][0] + o[0], q[p][1] + o[1], q[p][2] + o[2]]; }
    });
    var eye = [(P[IDX['eye.L']][0] + P[IDX['eye.R']][0]) / 2, P[IDX['eye.L']][1], P[IDX['eye.L']][2]];
    return (RIGS[sex] = { sex: sex, P: P, order: order, G: G, pre: pre, stat: stat, q: q, eye: eye, eyeX: P[IDX['eye.L']][0] });
  };
  function subtree(root) { var s = new Uint8Array(NB); for (var i = 0; i < NB; i++) { var b = i; while (b >= 0) { if (b === root) { s[i] = 1; break; } b = PAR[b]; } } return s; }
  var SUB = {}; function sub(name) { return SUB[name] || (SUB[name] = subtree(IDX[name])); }

  /* ---------- lưới: lọc đỉnh, đổi xương, tính pháp tuyến ---------- */
  var MESHES = {};
  /* keep(v, x, y, z, dominantBone) -> giữ đỉnh?; remap(bone) -> bone */
  X.mesh = function (name, key, keep, remap, col) {
    var ck = name + '|' + (key || '');
    if (MESHES[ck]) return MESHES[ck];
    var d = meshData(name), n = d.p.length / 3, ok = new Uint8Array(n), v, k, map = new Int32Array(n), cnt = 0;
    for (v = 0; v < n; v++) {
      var bw = -1, bb = 0; for (k = 0; k < 4; k++) if (d.sw[v * 4 + k] > bw) { bw = d.sw[v * 4 + k]; bb = d.si[v * 4 + k]; }
      ok[v] = !keep || keep(v, d.p[v * 3], d.p[v * 3 + 1], d.p[v * 3 + 2], bb) ? 1 : 0;
    }
    var idx = [], used = new Uint8Array(n);
    for (k = 0; k < d.i.length; k += 3) { var a = d.i[k], b = d.i[k + 1], c = d.i[k + 2]; if (ok[a] && ok[b] && ok[c]) { idx.push(a, b, c); used[a] = used[b] = used[c] = 1; } }
    // pháp tuyến mượt: gộp các đỉnh trùng vị trí (đường nối UV)
    var acc = {}, keyOf = new Array(n), nx = new Float32Array(n * 3);
    for (v = 0; v < n; v++) if (used[v]) keyOf[v] = Math.round(d.p[v * 3] * 20000) + '_' + Math.round(d.p[v * 3 + 1] * 20000) + '_' + Math.round(d.p[v * 3 + 2] * 20000);
    for (k = 0; k < idx.length; k += 3) {
      var i0 = idx[k] * 3, i1 = idx[k + 1] * 3, i2 = idx[k + 2] * 3, p = d.p;
      var ux = p[i1] - p[i0], uy = p[i1 + 1] - p[i0 + 1], uz = p[i1 + 2] - p[i0 + 2], wx = p[i2] - p[i0], wy = p[i2 + 1] - p[i0 + 1], wz = p[i2 + 2] - p[i0 + 2];
      var fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
      for (var e = 0; e < 3; e++) { var kk = keyOf[idx[k + e]], t = acc[kk] || (acc[kk] = [0, 0, 0]); t[0] += fx; t[1] += fy; t[2] += fz; }
    }
    var g = { p: [], n: [], uv: [], c: [], i: [], extra: { data: [], layout: [[6, 4], [13, 4]] } };
    for (v = 0; v < n; v++) if (used[v]) {
      map[v] = cnt++; var t2 = acc[keyOf[v]], l = Math.hypot(t2[0], t2[1], t2[2]) || 1;
      g.p.push(d.p[v * 3], d.p[v * 3 + 1], d.p[v * 3 + 2]); g.n.push(t2[0] / l, t2[1] / l, t2[2] / l); g.uv.push(d.uv[v * 2], d.uv[v * 2 + 1]);
      if (col) g.c.push(col[0], col[1], col[2], 0); else g.c.push(1, 1, 1, 0);
      var ws = 0, bi = [], bwv = []; for (k = 0; k < 4; k++) { bi.push(remap ? remap(d.si[v * 4 + k]) : d.si[v * 4 + k]); bwv.push(d.sw[v * 4 + k]); ws += d.sw[v * 4 + k]; }
      ws = ws || 1; g.extra.data.push(bi[0], bi[1], bi[2], bi[3], bwv[0] / ws, bwv[1] / ws, bwv[2] / ws, bwv[3] / ws);
    }
    for (k = 0; k < idx.length; k++) g.i.push(map[idx[k]]);
    return (MESHES[ck] = R.mesh(g));
  };
  /* lưới thủ tục (Geo) gắn cứng vào 1 xương */
  function rigid(geo, bone) { var n = geo.p.length / 3, d = []; for (var i = 0; i < n; i++) d.push(bone, 0, 0, 0, 1, 0, 0, 0); geo.extra = { data: d, layout: [[6, 4], [13, 4]] }; return geo; }

  /* ---------- texture ---------- */
  var TEXDONE = {};
  X.tex = function (file, withNormal) {
    var key = 'mh:' + file; if (TEXDONE[key]) return key; TEXDONE[key] = 1;
    var T = MH.assets.textures, dk = null, nk = null, k, size = Math.max(512, (R.q && R.q.tex) || 1024);
    for (k in T) { var base = k.split(/[\\/]/).pop(); if (base.indexOf(file) === 0 && base.indexOf('diffuse') > 0) dk = k; if (base.indexOf(file + '_normal') === 0) nk = k; }
    var m = R.materials[key] = { alb: R.textures.white, nrm: R.textures.flat, uv: 1 };
    if (dk) R.texFromURI(T[dk], /skin/.test(file) ? Math.max(1024, size) : size, m, 'alb');
    if (nk && withNormal !== false) R.texFromURI(T[nk], size, m, 'nrm');
    return key;
  };

  /* ---------- nhãn cầu + răng ---------- */
  function eyeGeo(rig, s, iris) {
    var r = 0.0142, g = Geo.sphere(r, 18, 14).xf(0, 0, 0, Math.PI / 2, 0, 0);
    g.colorFn(function (x, y, z) { var a = Math.acos(M.clamp(z / r, -1, 1)); if (a < 0.16) return [0.004, 0.004, 0.004, 0]; if (a < 0.46) { var f = 0.55 + 0.45 * (a - 0.17) / 0.3; return [iris[0] * f, iris[1] * f, iris[2] * f, 0]; } return a < 0.5 ? [0.08, 0.05, 0.04, 0] : [0.6, 0.57, 0.54, 0]; });
    var e = rig.P[IDX['eye' + s]]; g.xf(e[0], e[1], e[2] - 0.0005);
    return rigid(g, IDX['eye' + s]);
  }
  function mouthGeo(rig) { // khoang miệng tối + hai hàm răng
    var P = rig.P, up = P[IDX.oris05], lo = P[IDX.oris01], y = (up[1] + lo[1]) / 2, z = up[2] - 0.019, g = new Geo(), k;
    var bag = Geo.sphere(1, 10, 8).xf(0, y - 0.004, z - 0.012, 0, 0, 0, 0.021, 0.016, 0.022).color(0.05, 0.012, 0.012, 0); g.add(rigid(bag, IDX.head)); var d = bag.extra.data.slice();
    function arc(yy, bone, hgt) { var a = new Geo(); for (k = -4; k <= 4; k++) { var an = k * 0.2; a.add(Geo.box(0.0052, hgt, 0.003).xf(Math.sin(an) * 0.02, yy, z - 0.02 + Math.cos(an) * 0.02, 0, an, 0)); } a.color(0.62, 0.6, 0.55, 0); rigid(a, bone); d = d.concat(a.extra.data); g.add(a); }
    arc(y + 0.0035, IDX.head, 0.007); arc(y - 0.0045, IDX.jaw, 0.006);
    g.extra = { data: d, layout: [[6, 4], [13, 4]] }; return g;
  }

  /* lông mày: dải mảnh ôm sát bề mặt trán, bám theo hai xương mày để nhíu/nhướn */
  var BROWS = {};
  function browMesh(rig, body, male, col) {
    var ck = body + col.join(); if (BROWS[ck]) return BROWS[ck];
    var d = meshData(body), g = new Geo(), ex = [], ey = rig.eye[1], NS = 9, s, i;
    function surf(x, y) { var best = 1e9, z = 0; for (var v = 0; v < d.p.length; v += 3) { if (d.p[v + 2] < 0.07) continue; var dd = (d.p[v] - x) * (d.p[v] - x) + (d.p[v + 1] - y) * (d.p[v + 1] - y); if (dd < best) { best = dd; z = d.p[v + 2]; } } return z; }
    for (s = -1; s <= 1; s += 2) {
      var ms = s > 0 ? '.L' : '.R', b1 = IDX['oculi01' + ms], b2 = IDX['oculi02' + ms], base = g.p.length / 3;
      for (i = 0; i <= NS; i++) {
        var u = i / NS, x = s * (0.009 + 0.047 * u), yc = ey + (male ? 0.0185 : 0.0205) + Math.sin(Math.PI * (u * 0.85 + 0.08)) * (male ? 0.003 : 0.0048) - u * 0.003;
        var th = (male ? 0.0038 : 0.0024) * (0.45 + 0.9 * Math.sin(Math.PI * Math.min(1, u * 1.5 + 0.18)) * (1 - 0.55 * u)), z = Math.max(surf(x, yc + th), surf(x, yc - th), surf(x, yc)) + 0.0006;
        g.v(x, yc + th, z, 0, 0.2, 1, u, 1); g.v(x, yc - th, z, 0, -0.2, 1, u, 0);
        var w2 = M.smooth(0.3, 0.9, u); ex.push(b1, b2, 0, 0, 1 - w2, w2, 0, 0, b1, b2, 0, 0, 1 - w2, w2, 0, 0);
        if (i) { var o = base + i * 2; g.i.push(o - 2, o - 1, o, o, o - 1, o + 1); }
      }
    }
    g.color(col[0], col[1], col[2], 0); g.extra = { data: ex, layout: [[6, 4], [13, 4]] };
    return (BROWS[ck] = R.mesh(g));
  }

  /* ---------- gắn vào nhân vật ---------- */
  var SCR = [], TMP = M.create(), LM = M.create(), LM2 = M.create(), k0;
  for (k0 = 0; k0 < NB; k0++) SCR.push(M.create());
  R.frameId = R.frameId || 0;
  var ARM = { sh: 'upperarm01', el: 'lowerarm01', ha: 'wrist', th: 'upperleg01', kn: 'lowerleg01', ft: 'foot' };
  /* cfg: { sex, full, k, t:[x,y,z], body, bodyKeep, parts:[{mesh,tex,mat}], hair, iris } */
  X.attach = function (c, cfg) {
    var rig = X.rig(cfg.sex), P = rig.P, inst = { c: c, rig: rig, stamp: -1, data: new Float32Array(NB * 16), bt: R.boneTexture(NB), drv: [], anchor: [], face: [], full: !!cfg.full, nodes: [] };
    var J = c.J, i, S;
    // lái xương thân
    function drive(bone, key, sc) { if (J[key]) inst.drv[IDX[bone]] = { key: key, sc: sc || 1 }; }
    if (cfg.full) { drive('root', 'hips'); drive('spine03', 'chest'); drive('neck01', 'neck'); drive('head', 'head'); }
    ['L', 'R'].forEach(function (s) {
      var ms = s === 'L' ? '.R' : '.L', sg = s === 'L' ? 1 : -1, f, j; // 'L' của game = phía -x = '.R' của MakeHuman
      if (cfg.full) for (var a in ARM) drive(ARM[a] + ms, a + s);
      for (f = 1; f <= 5; f++) for (j = 1; j <= 3; j++) inst.face[IDX['finger' + f + '-' + j + ms]] = { kind: 'finger', key: 'fi' + s, sg: sg, f: f === 1 ? (j === 1 ? 0 : 0.22) : (j === 1 ? 0.5 : 0.62) };
      var es = s === 'L' ? '.R' : '.L', ei = s === 'L' ? 0 : 1;
      inst.face[IDX['eye' + es]] = { kind: 'eye', e: ei };
      inst.face[IDX['orbicularis03' + es]] = { kind: 'lid', a: 0.62 }; inst.face[IDX['orbicularis04' + es]] = { kind: 'lid', a: -0.16 };
      inst.face[IDX['oculi01' + es]] = { kind: 'brow', a: 0.0055 }; inst.face[IDX['oculi02' + es]] = { kind: 'brow', a: 0.002 };
      inst.face[IDX['levator05' + es]] = { kind: 'corner', sx: s === 'L' ? -1 : 1 };
    });
    inst.face[IDX.jaw] = { kind: 'jaw' }; inst.face[IDX.oris05] = { kind: 'pucker', a: 0.004 }; inst.face[IDX.oris01] = { kind: 'pucker', a: 0.0045 };
    // neo (chế độ ghép đầu + tay vào thân thủ tục)
    var k = cfg.k || 1, t = cfg.t || [0, 0, 0];
    if (!cfg.full) {
      var hs = sub('head'), rest = cfg.rest, wl = sub('wrist.L'), wrr = sub('wrist.R');
      for (i = 0; i < NB; i++) {
        if (wl[i] || wrr[i]) continue;
        var nd = null, rp = null;
        if (i === IDX.head) { nd = J.head; rp = rest.head; } else if (hs[i]) continue;
        else if (/^neck/.test(NAMES[i])) { nd = J.neck; rp = rest.neck; } else { nd = J.chest; rp = rest.chest; }
        var m = M.create(); M.compose(m, k * P[i][0] + t[0] - rp[0], k * P[i][1] + t[1] - rp[1], k * P[i][2] + t[2] - rp[2], 0, 0, 0, k, k, k); inst.anchor[i] = { node: nd, m: m };
      }
      ['L', 'R'].forEach(function (s) { // bàn tay: cổ tay đặt vào khớp 'ha', đã nắn về hướng buông xuống
        var wi = IDX['wrist' + (s === 'L' ? '.R' : '.L')], kh = cfg.kh || 1, m = M.create(), sc = M.create(); M.compose(sc, 0, cfg.handDy || 0, 0, 0, 0, 0, kh, kh, kh); M.mul(m, sc, rig.G[wi]); inst.anchor[wi] = { node: J['ha' + s], m: m };
      });
    }
    function add(mesh, mat) { var n = new Node(mesh, mat); n.skin4 = inst; c.root.add(n); inst.nodes.push(n); return n; }
    // da
    var hd = sub('head'), handL = sub('wrist.L'), handR = sub('wrist.R'), cut = cfg.neckCut || 1.43, sp01 = IDX.spine01;
    if (cfg.full) add(X.mesh(cfg.body, 'full' + (cfg.longSleeves ? 1 : 0), function (v, x, y, z) {
      var ax = Math.abs(x); if (ax < 0.36 && y < 0.93) return false; if (y >= 0.93 && y < 1.31 && ax < 0.16 && (z < 0.04 || y < 1.25)) return false;
      if (cfg.longSleeves && ax > 0.18 && ax < 0.43 && y < 1.44) return false; return true;
    }), cfg.skinMat);
    else {
      add(X.mesh(cfg.body, 'head' + cut, function (v, x, y, z) { return y > cut && Math.abs(x) < 0.16; }, function (b) { return hd[b] || /^neck/.test(NAMES[b]) ? b : sp01; }), cfg.skinMat);
      add(X.mesh(cfg.body, 'hands', function (v, x, y, z, b) { return handL[b] || handR[b]; }, function (b) { return handL[b] || handR[b] ? b : (P[b][0] > 0 ? IDX['wrist.L'] : IDX['wrist.R']); }), cfg.skinMat);
    }
    (cfg.parts || []).forEach(function (p) { add(X.mesh(p.mesh, p.key || '', p.keep, p.remap), p.mat); });
    var iris = cfg.iris || [0.2, 0.1, 0.045], eg = eyeGeo(rig, '.L', iris); eg.add(eyeGeo(rig, '.R', iris)); eg.extra.data = eyeGeo(rig, '.L', iris).extra.data.concat(eyeGeo(rig, '.R', iris).extra.data);
    add(R.mesh(eg), cfg.eyeMat); add(R.mesh(mouthGeo(rig)), cfg.mouthMat);
    add(browMesh(rig, cfg.body, cfg.sex === 'male', cfg.browCol || [0.04, 0.03, 0.026]), { tex: 'plain', rough: 1, tint: cfg.mouthMat.tint, emis: cfg.mouthMat.emis });
    c.mh = inst; return inst;
  };

  /* ---------- cập nhật ma trận xương (gọi ngay trước khi vẽ, khi ma trận thế giới của node đã mới) ---------- */
  function setRot(o, rx, ry, rz) { M.compose(o, 0, 0, 0, rx, ry, rz, 1, 1, 1); }
  X.update = function (inst) {
    if (inst.stamp === R.frameId) return; inst.stamp = R.frameId;
    var rig = inst.rig, P = rig.P, ord = rig.order, c = inst.c, J = c.J, mo = c.morph, data = inst.data, n, b, p, w, L, d, f, pm, tx, ty, tz;
    for (n = 0; n < NB; n++) {
      b = ord[n]; p = PAR[b]; w = SCR[b];
      var an = inst.anchor[b];
      if (an) M.mul(w, an.node.world, an.m);
      else {
        L = null; d = inst.drv[b]; f = inst.face[b];
        if (d) { var r = J[d.key].rot; setRot(LM, r[0] * d.sc, r[1] * d.sc, r[2] * d.sc); if (rig.pre[b] !== rig.G[b] && (!isId(rig.pre[b]) || !isId(rig.G[b]))) { M.mul(LM2, rig.pre[b], LM); M.mul(LM, LM2, rig.G[b]); } L = LM; }
        else if (f) {
          L = LM;
          if (f.kind === 'finger') { setRot(LM2, 0, 0, f.sg * f.f * -(J[f.key] ? J[f.key].rot[0] : -0.4)); M.mul(TMP, rig.pre[b], LM2); M.mul(LM, TMP, rig.G[b]); }
          else if (f.kind === 'jaw') setRot(LM, mo[0] * 0.2 + mo[2] * 0.03, 0, 0);
          else if (f.kind === 'eye') { var e = c.eyes[f.e].rot; setRot(LM, e[0], e[1], 0); }
          else if (f.kind === 'lid') setRot(LM, f.a > 0 ? -0.16 + (f.a + 0.16) * mo[3] - 0.07 * Math.max(0, mo[4]) : 0.05 + (f.a - 0.05) * mo[3], 0, 0);
          else if (f.kind === 'brow') M.compose(LM, 0, f.a * mo[4], 0, 0, 0, 0, 1, 1, 1);
          else if (f.kind === 'corner') M.compose(LM, f.sx * (mo[1] * 0.0045 - mo[2] * 0.006 + Math.max(0, mo[5]) * 0.003), mo[5] * 0.004 - mo[0] * 0.003, -mo[1] * 0.002, 0, 0, 0, 1, 1, 1);
          else M.compose(LM, 0, 0, f.a * mo[2], 0, 0, 0, 1, 1, 1);
        } else if (rig.stat[b]) L = rig.stat[b];
        if (p < 0) { pm = c.root.world; tx = P[b][0]; ty = P[b][1] + (J.hips.pos[1] - c.hipY); tz = P[b][2]; } else { pm = SCR[p]; tx = P[b][0] - P[p][0]; ty = P[b][1] - P[p][1]; tz = P[b][2] - P[p][2]; }
        if (L) { TMP.set(pm); TMP[12] += pm[0] * tx + pm[4] * ty + pm[8] * tz; TMP[13] += pm[1] * tx + pm[5] * ty + pm[9] * tz; TMP[14] += pm[2] * tx + pm[6] * ty + pm[10] * tz; M.mul(w, TMP, L); }
        else { w.set(pm); w[12] += pm[0] * tx + pm[4] * ty + pm[8] * tz; w[13] += pm[1] * tx + pm[5] * ty + pm[9] * tz; w[14] += pm[2] * tx + pm[6] * ty + pm[10] * tz; }
      }
      var o = b * 16, q = P[b]; data.set(w, o);
      data[o + 12] -= w[0] * q[0] + w[4] * q[1] + w[8] * q[2]; data[o + 13] -= w[1] * q[0] + w[5] * q[1] + w[9] * q[2]; data[o + 14] -= w[2] * q[0] + w[6] * q[1] + w[10] * q[2];
    }
    R.updateBoneTexture(inst.bt, data);
  };
})();
