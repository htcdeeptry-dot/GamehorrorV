/* HUYẾT LỆ THÔN — rb_rig.js
   Nhân vật Microsoft Rocketbox (MIT): khung xương Bip01 80 khớp, skinning 4 trọng số trên GPU,
   175 blendshape gốc được gộp sẵn thành 6 kênh [há, bè, chúm, chớp mắt, mày, cười],
   phát clip motion-capture (js/rb_anims.js) và trộn mượt với tư thế thủ tục của characters.js. */
(function () {
  'use strict';
  var H = window.HuyetLeThon, M = H.M, R = H.R, Node = H.Node, X = H.RBRig = {}, RB = H.RB;
  function bin(b64, T) { var raw = atob(b64), n = raw.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = raw.charCodeAt(i); return new T(u.buffer); }
  /* ---------- quaternion [x,y,z,w] trên mảng phẳng ---------- */
  function qmul(o, oo, a, ao, b, bo) {
    var ax = a[ao], ay = a[ao + 1], az = a[ao + 2], aw = a[ao + 3], bx = b[bo], by = b[bo + 1], bz = b[bo + 2], bw = b[bo + 3];
    o[oo] = aw * bx + ax * bw + ay * bz - az * by; o[oo + 1] = aw * by - ax * bz + ay * bw + az * bx; o[oo + 2] = aw * bz + ax * by - ay * bx + az * bw; o[oo + 3] = aw * bw - ax * bx - ay * by - az * bz;
  }
  function qm(a, b) { var o = [0, 0, 0, 1]; qmul(o, 0, a, 0, b, 0); return o; }
  function qc(a) { return [-a[0], -a[1], -a[2], a[3]]; }
  function qrot(q, qo, x, y, z, o) {
    var qx = q[qo], qy = q[qo + 1], qz = q[qo + 2], qw = q[qo + 3], ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
    o[0] = ix * qw - iw * qx - iy * qz + iz * qy; o[1] = iy * qw - iw * qy - iz * qx + ix * qz; o[2] = iz * qw - iw * qz - ix * qy + iy * qx;
  }
  function qmin(a, b) { // xoay ngắn nhất a -> b (vector đơn vị)
    var x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0], w = 1 + a[0] * b[0] + a[1] * b[1] + a[2] * b[2], l = Math.hypot(x, y, z, w);
    return l < 1e-6 ? [0, 0, 1, 0] : [x / l, y / l, z / l, w / l];
  }
  function qeuler(o, rx, ry, rz) { // = Ry * Rx * Rz (cùng thứ tự với M.compose)
    var cx = Math.cos(rx / 2), sx = Math.sin(rx / 2), cy = Math.cos(ry / 2), sy = Math.sin(ry / 2), cz = Math.cos(rz / 2), sz = Math.sin(rz / 2);
    o[0] = cy * sx * cz + sy * cx * sz; o[1] = sy * cx * cz - cy * sx * sz; o[2] = cy * cx * sz - sy * sx * cz; o[3] = cy * cx * cz + sy * sx * sz;
  }
  function nrm(p, a, b) { var d = [p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]], l = Math.hypot(d[0], d[1], d[2]); return [d[0] / l, d[1] / l, d[2] / l]; }

  /* ---------- khung xương ---------- */
  var RIGS = {}, V3 = [0, 0, 0];
  X.rig = function (id) {
    if (RIGS[id]) return RIGS[id];
    var d = RB.chars[id], B = d.bones, NB = B.names.length, IDX = {}, i, order = [], seen = [], par = B.par, P = B.p, DOWN = [0, -1, 0];
    B.names.forEach(function (n, k) { IDX[n] = k; });
    function visit(b) { if (seen[b]) return; if (par[b] >= 0) visit(par[b]); seen[b] = 1; order.push(b); }
    for (i = 0; i < NB; i++) visit(i);
    function rq(b) { return b < 0 ? d.rootQ : [B.r[b * 4], B.r[b * 4 + 1], B.r[b * 4 + 2], B.r[b * 4 + 3]]; }
    var own = {};
    ['L', 'R'].forEach(function (s) { // tư thế T -> tay buông xuôi
      var ua = IDX[s + ' UpperArm'], fa = IDX[s + ' Forearm'], ha = IDX[s + ' Hand'], f2 = IDX[s + ' Finger2'];
      var C = qmin(nrm(P, ua, fa), DOWN), v = [0, 0, 0], f0 = nrm(P, fa, ha); qrot(C, 0, f0[0], f0[1], f0[2], v); var Gl = qm(qmin(v.slice(), DOWN), C), h0 = nrm(P, ha, f2); qrot(Gl, 0, h0[0], h0[1], h0[2], v); var Gh = qm(qmin(v.slice(), DOWN), Gl);
      own[ua] = C; own[fa] = Gl; own[ha] = Gh;
    });
    var G = [], A = new Float32Array(NB * 4), Bq = new Float32Array(NB * 4), S = new Float32Array(NB * 4), tl = new Float32Array(NB * 3), q = [], ID = [0, 0, 0, 1];
    order.forEach(function (b) {
      var p = par[b], Gp = p >= 0 ? G[p] : ID; G[b] = own[b] || Gp;
      var a = qm(qc(rq(p)), qc(Gp)), bb = qm(G[b], rq(b)), s = qm(a, bb); A.set(a, b * 4); Bq.set(bb, b * 4); S.set(s, b * 4);
      var px = p >= 0 ? P[p * 3] : 0, py = p >= 0 ? P[p * 3 + 1] : 0, pz = p >= 0 ? P[p * 3 + 2] : 0, o = [0, 0, 0];
      qrot(qc(rq(p)), 0, P[b * 3] - px, P[b * 3 + 1] - py, P[b * 3 + 2] - pz, o); tl.set(o, b * 3);
      if (p < 0) q[b] = [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]]; else { qrot(Gp, 0, P[b * 3] - px, P[b * 3 + 1] - py, P[b * 3 + 2] - pz, o); q[b] = [q[p][0] + o[0], q[p][1] + o[1], q[p][2] + o[2]]; }
    });
    var restL = new Float32Array(NB * 4);
    for (i = 0; i < NB; i++) { var pq = par[i] >= 0 ? rq(par[i]) : d.rootQ, lq = [0, 0, 0, 1]; qmul(lq, 0, qc(pq), 0, rq(i), 0); restL.set(lq, i * 4); }
    return (RIGS[id] = { restL: restL, id: id, d: d, NB: NB, IDX: IDX, par: par, P: P, r: B.r, order: order, A: A, B: Bq, S: S, tl: tl, q: q, names: B.names, height: d.height, female: /^(linh|ha|le|me|ghost)$/.test(id) });
  };

  /* ---------- lưới + texture ---------- */
  function buildMesh(pr) {
    var n = pr.n, pos = bin(pr.pos, Int16Array), nr = bin(pr.nrm, Int8Array), uv = bin(pr.uv, Uint16Array), ji = bin(pr.ji, Uint8Array), jw = bin(pr.jw, Uint8Array), mo = pr.morph ? bin(pr.morph, Int16Array) : null;
    var st = mo ? 26 : 8, g = { p: new Float32Array(n * 3), n: new Float32Array(n * 3), uv: new Float32Array(n * 2), c: new Float32Array(n * 4), i: bin(pr.idx, Uint16Array), extra: { data: new Float32Array(n * st), layout: [[6, 4], [13, 4]] } }, v, k, e = g.extra.data;
    if (mo) for (k = 0; k < 6; k++) g.extra.layout.push([7 + k, 3]);
    for (v = 0; v < n; v++) {
      for (k = 0; k < 3; k++) { g.p[v * 3 + k] = pos[v * 3 + k] / 16384; g.n[v * 3 + k] = nr[v * 3 + k] / 127; }
      g.uv[v * 2] = uv[v * 2] / 65535; g.uv[v * 2 + 1] = uv[v * 2 + 1] / 65535; g.c[v * 4] = g.c[v * 4 + 1] = g.c[v * 4 + 2] = 1;
      var ws = (jw[v * 4] + jw[v * 4 + 1] + jw[v * 4 + 2] + jw[v * 4 + 3]) || 1;
      for (k = 0; k < 4; k++) { e[v * st + k] = ji[v * 4 + k]; e[v * st + 4 + k] = jw[v * 4 + k] / ws; }
      if (mo) for (k = 0; k < 18; k++) e[v * st + 8 + k] = mo[v * 18 + k] * (0.08 / 32767);
    }
    return R.mesh(g);
  }
  function tex(id, kind, uri, nuri) {
    var key = 'rb:' + id + ':' + kind, size = Math.max(512, (R.q && R.q.tex) || 1024), m = R.materials[key] = { alb: R.textures.white, nrm: R.textures.flat, uv: 1 };
    R.texFromURI(uri, size, m, 'alb'); if (nuri && R.q && R.q.normal) R.texFromURI(nuri, size, m, 'nrm');
    return key;
  }

  /* ---------- clip motion-capture ---------- */
  var CLIPS = {};
  function clip(name, rig) {
    var mx = !!rig.d.mx, key = (mx ? 'mx:' : 'rb:') + name, c = CLIPS[key];
    if (!c) { var s = mx ? (RB.mxAnims && RB.mxAnims.clips[name]) : (RB.anims && RB.anims[name]); if (!s) return null; c = CLIPS[key] = { nf: s.nf, dt: s.dt, q: bin(s.q, Int16Array), pt: bin(s.pt, Int16Array), names: s.names, nb: s.names.length, dur: s.nf * s.dt, maps: {}, corrs: {}, mx: mx, srcH: mx ? RB.mxAnims.srcHeight : 1.78, yaw: s.yaw || 0 }; }
    if (!c.maps[rig.id]) {
      var mp = new Int16Array(rig.NB).fill(-1); c.names.forEach(function (n, i) { if (rig.IDX[n] !== undefined) mp[rig.IDX[n]] = i; }); c.maps[rig.id] = mp;
      if (mx) { // chuyển clip giữa các khung xương Mixamo khác tư thế nghỉ: q' = restĐích * restNguồn^-1 * q
        var cr = new Float32Array(rig.NB * 4), RS = RB.mxAnims.rest;
        for (var b = 0; b < rig.NB; b++) { var rs = RS[rig.names[b]] || [0, 0, 0, 1], o = [0, 0, 0, 1]; qmul(o, 0, rig.restL, b * 4, qc(rs), 0); cr.set(o, b * 4); }
        c.corrs[rig.id] = cr;
      }
    }
    return c;
  }
  X.hasClip = function (n, mx) { return mx ? !!(RB.mxAnims && RB.mxAnims.clips[n]) : !!(RB.anims && RB.anims[n]); };

  /* ---------- gắn vào nhân vật ---------- */
  var DRV = { hips: 'Pelvis', chest: 'Spine1', neck: 'Neck', head: 'Head' }, LIMB = { sh: 'UpperArm', el: 'Forearm', ha: 'Hand', th: 'Thigh', kn: 'Calf', ft: 'Foot' };
  X.attach = function (c, cfg) {
    var rig = X.rig(cfg.id), NB = rig.NB, inst = { c: c, rig: rig, stamp: -1, data: new Float32Array(NB * 16), bt: R.boneTexture(NB), drv: new Array(NB), kind: new Int8Array(NB), fing: [], nodes: [], mats: [],
      cur: new Float32Array(NB * 4), from: new Float32Array(NB * 4), wq: new Float32Array(NB * 4), wp: new Float32Array(NB * 3), off: [0, 0, 0], fromOff: [0, 0, 0], fade: 1, clip: null, clipT: 0, key: '' };
    inst.update = X.update;
    var k, s, J = c.J, I = rig.IDX;
    for (k in DRV) inst.drv[I[DRV[k]]] = k;
    ['L', 'R'].forEach(function (g) { // 'L' của game ở phía -x = 'R' của Rocketbox
      var rs = g === 'L' ? 'R' : 'L', a, f, j;
      for (a in LIMB) inst.drv[I[rs + ' ' + LIMB[a]]] = a + g;
      for (f = 0; f <= 4; f++) for (j = 0; j < 3; j++) { var b = I[rs + ' Finger' + f + (j ? j : '')]; if (b !== undefined) { inst.kind[b] = 1; inst.fing[b] = { key: 'fi' + g, sg: g === 'L' ? 1 : -1, f: f === 0 ? (j === 0 ? 0 : 0.2) : (j === 0 ? 0.5 : 0.6) }; } }
      inst.kind[I[rs + 'Eye']] = g === 'L' ? 2 : 3;
    });
    inst.kind[I.Neck] = 4; inst.kind[I.Head] = 5;
    var d = rig.d, t = cfg.tint || [1, 1, 1], em = cfg.emis || [0, 0, 0];
    d.prims.forEach(function (pr) {
      var key = tex(cfg.id, pr.kind, d.tex[pr.kind], d.tex[pr.kind + 'N']), mat;
      if (pr.kind === 'head') mat = { tex: key, rough: 0.55, nscale: 0.7, sss: 0.6, rim: 0.25, tint: [t[0], t[1], t[2], 1], emis: em, fade: cfg.fade || 0 };
      else if (pr.kind === 'opacity') mat = { tex: key, rough: 0.95, nscale: 0, rim: 0, cutout: 1, tint: [t[0], t[1], t[2], 1], emis: em, fade: cfg.fade || 0 };
      else mat = { tex: key, rough: 0.82, nscale: 1, sss: 0.25, rim: 0.3, tint: [t[0], t[1], t[2], 1], emis: em, fade: cfg.fade || 0 };
      var n = new Node(pr._mesh || (pr._mesh = buildMesh(pr)), mat); n.skin4 = inst; if (pr.morph) n.morph = c.morph; c.root.add(n); inst.nodes.push(n); inst.mats.push(mat);
    });
    for (k = 0; k < NB; k++) { inst.cur.set(rig.S.subarray(k * 4, k * 4 + 4), k * 4); }
    c.rb = inst; return inst;
  };
  /* đổi clip (null = tư thế thủ tục); chuyển tiếp mượt bằng cách trộn từ tư thế hiện tại */
  X.play = function (inst, name, noFade) {
    var key = name || ''; if (inst.key === key) return; inst.key = key;
    inst.clip = name ? clip(name, inst.rig) : null; inst.clipT = inst.clip ? Math.random() * 0.3 * inst.clip.dur : 0;
    inst.fromYaw = inst.yawNow || 0; inst.from.set(inst.cur); inst.fromOff = inst.off.slice(); inst.fade = noFade ? 1 : 0;
  };

  /* ---------- cập nhật ma trận xương ngay trước khi vẽ ---------- */
  var QE = [0, 0, 0, 1], QT = [0, 0, 0, 1], QL = new Float32Array(4), QC = new Float32Array(4), ROOTM = M.create(), BM = M.create(), OUT = M.create();
  X.update = function (inst) {
    if (inst.stamp === R.frameId) return; inst.stamp = R.frameId;
    var rig = inst.rig, NB = rig.NB, ord = rig.order, par = rig.par, c = inst.c, J = c.J, A = rig.A, Bq = rig.B, S = rig.S, cur = inst.cur, wq = inst.wq, wp = inst.wp, P = rig.P, r = rig.r, tl = rig.tl, n, b, p, o, k;
    var cl = inst.clip, f0 = 0, f1 = 0, fu = 0, mp = null, fd = inst.fade < 1 ? inst.fade * inst.fade * (3 - 2 * inst.fade) : 1, sc = rig.height / (cl ? cl.srcH : 1.78), cor = cl && cl.mx ? cl.corrs[rig.id] : null;
    if (cl) { var t = inst.clipT % cl.dur, ff = t / cl.dt; f0 = Math.floor(ff) % cl.nf; f1 = (f0 + 1) % cl.nf; fu = ff - Math.floor(ff); mp = cl.maps[rig.id]; }
    // độ lệch hông
    var ox = 0, oy = (J.hips.pos[1] - c.hipY), oz = 0;
    if (cl) { ox = (cl.pt[f0 * 3] + (cl.pt[f1 * 3] - cl.pt[f0 * 3]) * fu) / 8192 * sc; oy = (cl.pt[f0 * 3 + 1] + (cl.pt[f1 * 3 + 1] - cl.pt[f0 * 3 + 1]) * fu) / 8192 * sc; oz = (cl.pt[f0 * 3 + 2] + (cl.pt[f1 * 3 + 2] - cl.pt[f0 * 3 + 2]) * fu) / 8192 * sc; if (inst.lockXZ) { ox = oz = 0; } }
    if (fd < 1) { ox = inst.fromOff[0] + (ox - inst.fromOff[0]) * fd; oy = inst.fromOff[1] + (oy - inst.fromOff[1]) * fd; oz = inst.fromOff[2] + (oz - inst.fromOff[2]) * fd; }
    // bù góc xoay hông của clip (clip đứng xéo vẫn quay mặt về hướng nhân vật)
    var yT = cl ? cl.yaw : 0, yN = fd < 1 ? (inst.fromYaw || 0) + (yT - (inst.fromYaw || 0)) * fd : yT; inst.yawNow = yN;
    var ycs = Math.cos(yN), ysn = Math.sin(yN), YQ = [0, Math.sin(yN / 2), 0, Math.cos(yN / 2)];
    if (yN) { var tx = ox * ycs + oz * ysn; oz = -ox * ysn + oz * ycs; ox = tx; }
    inst.off[0] = ox; inst.off[1] = oy; inst.off[2] = oz;
    var rw = c.root.world, lookW = cl ? 1 : 0;
    for (n = 0; n < NB; n++) {
      b = ord[n]; p = par[b]; o = b * 4; var kd = inst.kind[b], dk = inst.drv[b], ci = mp ? mp[b] : -1, useClip = cl && ci >= 0 && kd !== 2 && kd !== 3;
      if (useClip) { // clip: nội suy 2 khung
        var q0 = (f0 * cl.nb + ci) * 4, q1 = (f1 * cl.nb + ci) * 4, Q = cl.q, dt = Q[q0] * Q[q1] + Q[q0 + 1] * Q[q1 + 1] + Q[q0 + 2] * Q[q1 + 2] + Q[q0 + 3] * Q[q1 + 3], sg = dt < 0 ? -fu : fu;
        for (k = 0; k < 4; k++) QL[k] = Q[q0 + k] * (1 - fu) + Q[q1 + k] * sg;
        if (cor) { QC.set(QL); qmul(QL, 0, cor, o, QC, 0); }
        if ((kd === 4 || kd === 5) && (c.lookYaw || c.lookPit)) { // đầu vẫn dõi theo điểm nhìn khi đang phát clip
          qeuler(QE, (c.lookPit || 0) * 0.45, (c.lookYaw || 0) * 0.45, 0); qmul(QC, 0, A, o, QE, 0); QT[0] = -A[o]; QT[1] = -A[o + 1]; QT[2] = -A[o + 2]; QT[3] = A[o + 3]; qmul(QE, 0, QC, 0, QT, 0); QC.set(QL); qmul(QL, 0, QE, 0, QC, 0);
        }
      } else if (dk || kd === 1 || kd === 2 || kd === 3) {
        if (kd === 1) { var fg = inst.fing[b]; qeuler(QE, 0, 0, fg.sg * fg.f * -J[fg.key].rot[0]); }
        else if (kd === 2 || kd === 3) { var e = c.eyes[kd - 2].rot; qeuler(QE, e[0], e[1], 0); }
        else { var jr = J[dk].rot; qeuler(QE, jr[0], jr[1], jr[2]); }
        qmul(QC, 0, A, o, QE, 0); qmul(QL, 0, QC, 0, Bq, o);
      } else { QL[0] = S[o]; QL[1] = S[o + 1]; QL[2] = S[o + 2]; QL[3] = S[o + 3]; }
      if (fd < 1) { var fr = inst.from, d2 = fr[o] * QL[0] + fr[o + 1] * QL[1] + fr[o + 2] * QL[2] + fr[o + 3] * QL[3], s2 = d2 < 0 ? -fd : fd; for (k = 0; k < 4; k++) QL[k] = fr[o + k] * (1 - fd) + QL[k] * s2; }
      var l = Math.hypot(QL[0], QL[1], QL[2], QL[3]) || 1; cur[o] = QL[0] / l; cur[o + 1] = QL[1] / l; cur[o + 2] = QL[2] / l; cur[o + 3] = QL[3] / l;
      if (p < 0) { qmul(wq, o, rig.d.rootQ, 0, cur, o); if (yN) { QC[0] = wq[o]; QC[1] = wq[o + 1]; QC[2] = wq[o + 2]; QC[3] = wq[o + 3]; qmul(wq, o, YQ, 0, QC, 0); } wp[b * 3] = P[b * 3] + ox; wp[b * 3 + 1] = P[b * 3 + 1] + oy; wp[b * 3 + 2] = P[b * 3 + 2] + oz; }
      else { qmul(wq, o, wq, p * 4, cur, o); QT[0] = wq[p * 4]; QT[1] = wq[p * 4 + 1]; QT[2] = wq[p * 4 + 2]; QT[3] = wq[p * 4 + 3]; qrot(QT, 0, tl[b * 3], tl[b * 3 + 1], tl[b * 3 + 2], V3); wp[b * 3] = wp[p * 3] + V3[0]; wp[b * 3 + 1] = wp[p * 3 + 1] + V3[1]; wp[b * 3 + 2] = wp[p * 3 + 2] + V3[2]; }
      // ma trận skin = [Rw | pos] * inverse([r | P])
      QT[0] = -r[o]; QT[1] = -r[o + 1]; QT[2] = -r[o + 2]; QT[3] = r[o + 3]; QC[0] = wq[o]; QC[1] = wq[o + 1]; QC[2] = wq[o + 2]; QC[3] = wq[o + 3]; qmul(QE, 0, QC, 0, QT, 0);
      var x = QE[0], y = QE[1], z = QE[2], w = QE[3];
      BM[0] = 1 - 2 * (y * y + z * z); BM[1] = 2 * (x * y + z * w); BM[2] = 2 * (x * z - y * w); BM[4] = 2 * (x * y - z * w); BM[5] = 1 - 2 * (x * x + z * z); BM[6] = 2 * (y * z + x * w); BM[8] = 2 * (x * z + y * w); BM[9] = 2 * (y * z - x * w); BM[10] = 1 - 2 * (x * x + y * y);
      var px = P[b * 3], py = P[b * 3 + 1], pz = P[b * 3 + 2];
      BM[12] = wp[b * 3] - (BM[0] * px + BM[4] * py + BM[8] * pz); BM[13] = wp[b * 3 + 1] - (BM[1] * px + BM[5] * py + BM[9] * pz); BM[14] = wp[b * 3 + 2] - (BM[2] * px + BM[6] * py + BM[10] * pz);
      M.mul(OUT, rw, BM); inst.data.set(OUT, b * 16);
    }
    R.updateBoneTexture(inst.bt, inst.data);
  };
})();
