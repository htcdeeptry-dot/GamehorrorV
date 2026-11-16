/* HUYẾT LỆ THÔN — engine.js
   Engine WebGL2 thuần, không phụ thuộc thư viện ngoài (chạy offline 100% qua file://).
   Gồm: toán ma trận, bộ dựng hình học (lathe / tube / extrude / sphere...), renderer forward
   có gộp lưới tĩnh, instancing, cây node phân cấp, hạt, mưa GPU và chuỗi hậu kỳ. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};

  /* ===================== TOÁN ===================== */
  var M = H.M = {
    create: function () { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    identity: function (m) { m.fill(0); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    mul: function (o, a, b) {
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      for (var c = 0; c < 4; c++) {
        var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
        o[c * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
        o[c * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
        o[c * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
        o[c * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
      }
      return o;
    },
    perspective: function (o, fovy, aspect, n, f) {
      var t = 1 / Math.tan(fovy / 2); o.fill(0);
      o[0] = t / aspect; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f);
      return o;
    },
    /* T * Ry * Rx * Rz * S */
    compose: function (o, px, py, pz, rx, ry, rz, sx, sy, sz) {
      var cx = Math.cos(rx), s1 = Math.sin(rx), cy = Math.cos(ry), s2 = Math.sin(ry), cz = Math.cos(rz), s3 = Math.sin(rz);
      o[0] = (cy * cz + s2 * s1 * s3) * sx; o[1] = (cx * s3) * sx; o[2] = (-s2 * cz + cy * s1 * s3) * sx; o[3] = 0;
      o[4] = (-cy * s3 + s2 * s1 * cz) * sy; o[5] = (cx * cz) * sy; o[6] = (s2 * s3 + cy * s1 * cz) * sy; o[7] = 0;
      o[8] = (s2 * cx) * sz; o[9] = (-s1) * sz; o[10] = (cy * cx) * sz; o[11] = 0;
      o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
      return o;
    },
    invert: function (o, a) {
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      var b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return M.identity(o);
      det = 1 / det;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return o;
    },
    tp: function (m, x, y, z, out) {
      out = out || [0, 0, 0];
      out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
      out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      return out;
    },
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    smooth: function (a, b, x) { var t = M.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
    angDiff: function (a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  };

  /* bộ sinh số ngẫu nhiên có hạt giống */
  H.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  };

  /* ===================== HÌNH HỌC ===================== */
  function Geo() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }
  H.Geo = Geo;
  Geo.prototype.v = function (x, y, z, nx, ny, nz, u, v) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u || 0, v || 0); this.c.push(1, 1, 1, 0);
    return this.p.length / 3 - 1;
  };
  Geo.prototype.count = function () { return this.p.length / 3; };
  Geo.prototype.add = function (g) {
    var base = this.p.length / 3, k;
    for (k = 0; k < g.p.length; k++) this.p.push(g.p[k]);
    for (k = 0; k < g.n.length; k++) this.n.push(g.n[k]);
    for (k = 0; k < g.uv.length; k++) this.uv.push(g.uv[k]);
    for (k = 0; k < g.c.length; k++) this.c.push(g.c[k]);
    for (k = 0; k < g.i.length; k++) this.i.push(g.i[k] + base);
    return this;
  };
  var _tm = M.create();
  Geo.prototype.applyMatrix = function (m) {
    var p = this.p, n = this.n;
    for (var k = 0; k < p.length; k += 3) {
      var x = p[k], y = p[k + 1], z = p[k + 2];
      p[k] = m[0] * x + m[4] * y + m[8] * z + m[12];
      p[k + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      p[k + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      x = n[k]; y = n[k + 1]; z = n[k + 2];
      var nx = m[0] * x + m[4] * y + m[8] * z, ny = m[1] * x + m[5] * y + m[9] * z, nz = m[2] * x + m[6] * y + m[10] * z;
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      n[k] = nx / l; n[k + 1] = ny / l; n[k + 2] = nz / l;
    }
    return this;
  };
  /* dịch chuyển + xoay (rx,ry,rz) + tỉ lệ tại chỗ */
  Geo.prototype.xf = function (px, py, pz, rx, ry, rz, sx, sy, sz) {
    if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (sz === undefined) sz = sx;
    M.compose(_tm, px || 0, py || 0, pz || 0, rx || 0, ry || 0, rz || 0, sx, sy, sz);
    return this.applyMatrix(_tm);
  };
  Geo.prototype.color = function (r, g, b, a) {
    var c = this.c;
    for (var k = 0; k < c.length; k += 4) { c[k] = r; c[k + 1] = g; c[k + 2] = b; if (a !== undefined) c[k + 3] = a; }
    return this;
  };
  /* gán màu/alpha theo hàm fn(x,y,z,i) -> [r,g,b,a] */
  Geo.prototype.colorFn = function (fn) {
    var c = this.c, p = this.p;
    for (var k = 0, j = 0; k < c.length; k += 4, j += 3) {
      var r = fn(p[j], p[j + 1], p[j + 2], k / 4);
      c[k] = r[0]; c[k + 1] = r[1]; c[k + 2] = r[2]; c[k + 3] = r[3];
    }
    return this;
  };
  /* UV chiếu hộp theo trục pháp tuyến trội — không cần UV thủ công cho kiến trúc */
  Geo.prototype.boxUV = function (s) {
    var p = this.p, n = this.n, uv = this.uv; s = s || 1;
    for (var k = 0, j = 0; k < p.length; k += 3, j += 2) {
      var ax = Math.abs(n[k]), ay = Math.abs(n[k + 1]), az = Math.abs(n[k + 2]);
      if (ay >= ax && ay >= az) { uv[j] = p[k] * s; uv[j + 1] = p[k + 2] * s; }
      else if (ax >= az) { uv[j] = p[k + 2] * s; uv[j + 1] = p[k + 1] * s; }
      else { uv[j] = p[k] * s; uv[j + 1] = p[k + 1] * s; }
    }
    return this;
  };
  Geo.prototype.scaleUV = function (su, sv) {
    var uv = this.uv; for (var j = 0; j < uv.length; j += 2) { uv[j] *= su; uv[j + 1] *= (sv === undefined ? su : sv); } return this;
  };
  Geo.prototype.computeNormals = function () {
    var p = this.p, n = this.n, ix = this.i, k;
    for (k = 0; k < n.length; k++) n[k] = 0;
    for (k = 0; k < ix.length; k += 3) {
      var a = ix[k] * 3, b = ix[k + 1] * 3, c = ix[k + 2] * 3;
      var ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      var vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      n[a] += nx; n[a + 1] += ny; n[a + 2] += nz; n[b] += nx; n[b + 1] += ny; n[b + 2] += nz; n[c] += nx; n[c + 1] += ny; n[c + 2] += nz;
    }
    for (k = 0; k < n.length; k += 3) {
      var l = Math.sqrt(n[k] * n[k] + n[k + 1] * n[k + 1] + n[k + 2] * n[k + 2]) || 1;
      n[k] /= l; n[k + 1] /= l; n[k + 2] /= l;
    }
    return this;
  };
  /* đẩy đỉnh theo pháp tuyến: fn(x,y,z) -> độ dời */
  Geo.prototype.displace = function (fn, recompute) {
    var p = this.p, n = this.n;
    for (var k = 0; k < p.length; k += 3) {
      var d = fn(p[k], p[k + 1], p[k + 2]);
      p[k] += n[k] * d; p[k + 1] += n[k + 1] * d; p[k + 2] += n[k + 2] * d;
    }
    if (recompute) this.computeNormals();
    return this;
  };
  Geo.prototype.centroid = function () {
    var p = this.p, x = 0, y = 0, z = 0, c = p.length / 3 || 1;
    for (var k = 0; k < p.length; k += 3) { x += p[k]; y += p[k + 1]; z += p[k + 2]; }
    return [x / c, y / c, z / c];
  };

  Geo.box = function (w, h, d) {
    var g = new Geo(), x = w / 2, y = h / 2, z = d / 2;
    var F = [
      [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
      [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1]],
      [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0]],
      [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0]],
      [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], [0, 1, 0]],
      [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [0, -1, 0]]
    ];
    for (var f = 0; f < 6; f++) {
      var q = F[f], nn = q[4];
      var a = g.v(q[0][0], q[0][1], q[0][2], nn[0], nn[1], nn[2], 0, 0);
      g.v(q[1][0], q[1][1], q[1][2], nn[0], nn[1], nn[2], 1, 0);
      g.v(q[2][0], q[2][1], q[2][2], nn[0], nn[1], nn[2], 1, 1);
      g.v(q[3][0], q[3][1], q[3][2], nn[0], nn[1], nn[2], 0, 1);
      g.i.push(a, a + 1, a + 2, a, a + 2, a + 3);
    }
    return g;
  };
  /* tấm phẳng XZ có chia lưới */
  Geo.plane = function (w, d, sx, sz) {
    var g = new Geo(); sx = sx || 1; sz = sz || 1;
    for (var j = 0; j <= sz; j++) for (var i = 0; i <= sx; i++) g.v((i / sx - 0.5) * w, 0, (j / sz - 0.5) * d, 0, 1, 0, i / sx, j / sz);
    for (j = 0; j < sz; j++) for (i = 0; i < sx; i++) {
      var a = j * (sx + 1) + i, b = a + 1, c = a + sx + 1, e = c + 1;
      g.i.push(a, c, e, a, e, b);
    }
    return g;
  };
  /* tứ giác tự do 4 đỉnh */
  Geo.quad = function (a, b, c, d) {
    var g = new Geo();
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= l; ny /= l; nz /= l;
    g.v(a[0], a[1], a[2], nx, ny, nz, 0, 0); g.v(b[0], b[1], b[2], nx, ny, nz, 1, 0);
    g.v(c[0], c[1], c[2], nx, ny, nz, 1, 1); g.v(d[0], d[1], d[2], nx, ny, nz, 0, 1);
    g.i.push(0, 1, 2, 0, 2, 3);
    return g;
  };
  /* tiện tròn: profile [[r,y],...] từ dưới lên */
  Geo.lathe = function (prof, segs, uvV) {
    var g = new Geo(), n = prof.length; segs = segs || 12; uvV = uvV || 1;
    var len = [0];
    for (var j = 1; j < n; j++) len.push(len[j - 1] + Math.hypot(prof[j][0] - prof[j - 1][0], prof[j][1] - prof[j - 1][1]));
    for (j = 0; j < n; j++) {
      var a = prof[Math.max(0, j - 1)], b = prof[Math.min(n - 1, j + 1)];
      var dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1, nr = dy / l, ny = -dr / l;
      for (var i = 0; i <= segs; i++) {
        var t = i / segs * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        g.v(prof[j][0] * c, prof[j][1], prof[j][0] * s, nr * c, ny, nr * s, i / segs * Math.max(1, Math.round(prof[j][0] * 4)), len[j] * uvV);
      }
    }
    for (j = 0; j < n - 1; j++) for (i = 0; i < segs; i++) {
      var p0 = j * (segs + 1) + i, p1 = p0 + 1, p2 = p0 + segs + 1, p3 = p2 + 1;
      g.i.push(p0, p2, p3, p0, p3, p1);
    }
    return g;
  };
  /* ống theo đường cong: pts [[x,y,z]], bán kính số hoặc fn(t) */
  Geo.tube = function (pts, rad, radial, cap) {
    var g = new Geo(), n = pts.length; radial = radial || 6;
    var rf = typeof rad === 'function' ? rad : function () { return rad; };
    var nx = 0, ny = 0, nz = 0, acc = 0, k;
    var t0 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]];
    if (Math.abs(t0[1]) > Math.abs(t0[0]) && Math.abs(t0[1]) > Math.abs(t0[2])) { nx = 1; } else { ny = 1; }
    for (k = 0; k < n; k++) {
      var a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2], tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      var d = nx * tx + ny * ty + nz * tz; nx -= tx * d; ny -= ty * d; nz -= tz * d;
      var nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-5) { nx = ty; ny = -tx; nz = 0; nl = Math.hypot(nx, ny, nz) || 1; }
      nx /= nl; ny /= nl; nz /= nl;
      var bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      if (k > 0) acc += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1], pts[k][2] - pts[k - 1][2]);
      var r = rf(k / (n - 1));
      for (var i = 0; i <= radial; i++) {
        var th = i / radial * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        var ox = nx * c + bx * s, oy = ny * c + by * s, oz = nz * c + bz * s;
        g.v(pts[k][0] + ox * r, pts[k][1] + oy * r, pts[k][2] + oz * r, ox, oy, oz, i / radial, acc);
      }
    }
    for (k = 0; k < n - 1; k++) for (i = 0; i < radial; i++) {
      var p0 = k * (radial + 1) + i, p1 = p0 + 1, p2 = p0 + radial + 1, p3 = p2 + 1;
      g.i.push(p0, p2, p3, p0, p3, p1);
    }
    if (cap) {
      var last = pts[n - 1], prev = pts[n - 2];
      var cx = last[0] - prev[0], cy = last[1] - prev[1], cz = last[2] - prev[2], cl = Math.hypot(cx, cy, cz) || 1;
      var ci = g.v(last[0], last[1], last[2], cx / cl, cy / cl, cz / cl, 0.5, acc);
      var base = (n - 1) * (radial + 1);
      for (i = 0; i < radial; i++) g.i.push(ci, base + i, base + i + 1);
    }
    return g;
  };
  /* cắt tai tam giác hoá đa giác đơn */
  function triangulate(pts) {
    var n = pts.length, V = [], idx = [], k, area = 0;
    for (k = 0; k < n; k++) { V.push(k); var q = pts[(k + 1) % n]; area += pts[k][0] * q[1] - q[0] * pts[k][1]; }
    if (area < 0) V.reverse();
    function cr(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
    var guard = 0;
    while (V.length > 3 && guard++ < 10000) {
      var found = false;
      for (var i = 0; i < V.length; i++) {
        var a = V[(i + V.length - 1) % V.length], b = V[i], c = V[(i + 1) % V.length];
        if (cr(pts[a], pts[b], pts[c]) <= 1e-10) continue;
        var inside = false;
        for (var j = 0; j < V.length; j++) {
          var v = V[j]; if (v === a || v === b || v === c) continue;
          var P = pts[v];
          if (cr(pts[a], pts[b], P) >= 0 && cr(pts[b], pts[c], P) >= 0 && cr(pts[c], pts[a], P) >= 0) { inside = true; break; }
        }
        if (inside) continue;
        idx.push(a, b, c); V.splice(i, 1); found = true; break;
      }
      if (!found) break;
    }
    if (V.length === 3) idx.push(V[0], V[1], V[2]);
    return idx;
  }
  /* đùn khối: shape [[x,y]] trong mặt XY, dày theo Z (0..depth) */
  Geo.extrude = function (shape, depth) {
    var g = new Geo(), n = shape.length, tri = triangulate(shape), k;
    for (k = 0; k < n; k++) g.v(shape[k][0], shape[k][1], depth, 0, 0, 1, shape[k][0], shape[k][1]);
    for (k = 0; k < n; k++) g.v(shape[k][0], shape[k][1], 0, 0, 0, -1, shape[k][0], shape[k][1]);
    for (k = 0; k < tri.length; k += 3) { g.i.push(tri[k], tri[k + 1], tri[k + 2]); g.i.push(n + tri[k], n + tri[k + 2], n + tri[k + 1]); }
    var acc = 0;
    for (k = 0; k < n; k++) {
      var a = shape[k], b = shape[(k + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      var nx = dy / l, ny = -dx / l;
      var s = g.v(a[0], a[1], 0, nx, ny, 0, acc, 0); g.v(b[0], b[1], 0, nx, ny, 0, acc + l, 0);
      g.v(b[0], b[1], depth, nx, ny, 0, acc + l, depth); g.v(a[0], a[1], depth, nx, ny, 0, acc, depth);
      g.i.push(s, s + 1, s + 2, s, s + 2, s + 3); acc += l;
    }
    return g;
  };
  Geo.sphere = function (r, ws, hs) {
    var g = new Geo(); ws = ws || 12; hs = hs || 8;
    for (var j = 0; j <= hs; j++) {
      var ph = j / hs * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
      for (var i = 0; i <= ws; i++) {
        var th = i / ws * Math.PI * 2, x = Math.cos(th) * sp, z = Math.sin(th) * sp;
        g.v(x * r, cp * r, z * r, x, cp, z, i / ws, j / hs);
      }
    }
    for (j = 0; j < hs; j++) for (i = 0; i < ws; i++) {
      var a = j * (ws + 1) + i, b = a + 1, c = a + ws + 1, d = c + 1;
      g.i.push(a, b, d, a, d, c);
    }
    return g;
  };

  /* ===================== NODE PHÂN CẤP ===================== */
  function Node(mesh, mat) {
    this.pos = [0, 0, 0]; this.rot = [0, 0, 0]; this.scl = [1, 1, 1];
    this.children = []; this.mesh = mesh || null; this.mat = mat || null; this.visible = true;
    this.local = M.create(); this.world = M.create();
  }
  H.Node = Node;
  Node.prototype.add = function (c) { this.children.push(c); return c; };
  Node.prototype.set = function (x, y, z) { this.pos[0] = x; this.pos[1] = y; this.pos[2] = z; return this; };
  Node.prototype.update = function (parent) {
    var p = this.pos, r = this.rot, s = this.scl;
    M.compose(this.local, p[0], p[1], p[2], r[0], r[1], r[2], s[0], s[1], s[2]);
    if (parent) M.mul(this.world, parent, this.local); else this.world.set(this.local);
    for (var k = 0; k < this.children.length; k++) this.children[k].update(this.world);
  };

  /* ===================== RENDERER ===================== */
  var R = H.R = {
    gl: null, canvas: null, q: null,
    statics: [], nodes: [], instGroups: [], lights: [], roofs: [],
    materials: {}, textures: {},
    cam: { pos: [0, 1.7, 0], yaw: 0, pitch: 0, roll: 0, fov: 72 },
    env: {
      time: 0, ambSky: [0.03, 0.022, 0.03], ambGnd: [0.016, 0.01, 0.01],
      moonDir: [0.35, 0.55, -0.75], moonCol: [0.11, 0.03, 0.03], moonTint: [1.0, 0.16, 0.1],
      flPos: [0, 0, 0], flDir: [0, 0, -1], flCol: [0, 0, 0], flCone: [0.86, 0.965], flScreen: [0.5, 0.5], flHaze: 0,
      xenon: [0, 0, 0], wind: [0.8, 0.6, 0.35, 0], lightning: 0,
      fogCol: [0.028, 0.02, 0.026], fogDen: 0.016, mistBase: 0, mistFall: 0.55, mistDen: 0.05, rain: 1
    },
    post: { aberr: 0, barrel: 0, grain: 0.05, vignette: 0.55, veins: 0, pulse: 0, view: 0, exposure: 1.15, fade: 0, white: 0, desat: 0, scan: 0, sepia: 0 },
    stats: { draws: 0, tris: 0 },
    particles: null
  };
  var gl, progs = {};
  var proj = M.create(), camW = M.create(), view = M.create(), VP = M.create(), invVP = M.create(), ident = M.create();
  var planes = new Float32Array(24);

  R.init = function (canvas) {
    R.canvas = canvas;
    gl = R.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) return false;
    R.floatRT = !!gl.getExtension('EXT_color_buffer_float');
    R.anisoExt = gl.getExtension('EXT_texture_filter_anisotropic');
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    R.gpuName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'unknown';
    R.emptyVAO = gl.createVertexArray();
    R.textures.white = R.texData(1, 1, new Uint8Array([255, 255, 255, 255]), { mips: false });
    R.textures.flat = R.texData(1, 1, new Uint8Array([128, 128, 255, 128]), { mips: false });
    R.materials.plain = { alb: R.textures.white, nrm: R.textures.flat, uv: 1 };
    // mưa
    var MAXR = 9000, seeds = new Float32Array(MAXR * 16), idx = new Uint32Array(MAXR * 6), rnd = H.rng(777);
    for (var k = 0; k < MAXR; k++) {
      var a = rnd(), b = rnd(), c = rnd();
      for (var j = 0; j < 4; j++) { var o = (k * 4 + j) * 4; seeds[o] = a; seeds[o + 1] = b; seeds[o + 2] = c; seeds[o + 3] = j; }
      idx.set([k * 4, k * 4 + 1, k * 4 + 2, k * 4 + 1, k * 4 + 3, k * 4 + 2], k * 6);
    }
    R.rainVAO = gl.createVertexArray(); gl.bindVertexArray(R.rainVAO);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    // hạt
    var PM = 600;
    R.particles = { max: PM, data: new Float32Array(PM * 8), count: 0 };
    R.partVAO = gl.createVertexArray(); gl.bindVertexArray(R.partVAO);
    R.partVBO = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, R.partVBO); gl.bufferData(gl.ARRAY_BUFFER, R.particles.data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    gl.bindVertexArray(null);
    return true;
  };

  function prog(name, vs, fs, defs) {
    var key = name + '|' + defs;
    if (progs[key]) return progs[key];
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, '#version 300 es\n' + defs + src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('[shader ' + name + '] ' + gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error('[link ' + name + '] ' + gl.getProgramInfoLog(p));
    return (progs[key] = { p: p, u: {} });
  }
  function U(pr, n) { var u = pr.u; if (!(n in u)) u[n] = gl.getUniformLocation(pr.p, n); return u[n]; }

  R.texData = function (w, h, data, o) {
    o = o || {};
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !(data instanceof Uint8Array));
    if (data instanceof Uint8Array) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    var mips = o.mips !== false;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var wrap = o.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (mips) {
      gl.generateMipmap(gl.TEXTURE_2D);
      if (R.anisoExt && R.q && R.q.aniso > 1) gl.texParameterf(gl.TEXTURE_2D, R.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(R.q.aniso, gl.getParameter(R.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    }
    return t;
  };

  R.mesh = function (geo) {
    var n = geo.p.length / 3, d = new Float32Array(n * 12), p = geo.p, nn = geo.n, uv = geo.uv, c = geo.c;
    var x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (var k = 0; k < n; k++) {
      var o = k * 12, x = p[k * 3], y = p[k * 3 + 1], z = p[k * 3 + 2];
      d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = nn[k * 3]; d[o + 4] = nn[k * 3 + 1]; d[o + 5] = nn[k * 3 + 2];
      d[o + 6] = uv[k * 2]; d[o + 7] = uv[k * 2 + 1];
      d[o + 8] = c[k * 4]; d[o + 9] = c[k * 4 + 1]; d[o + 10] = c[k * 4 + 2]; d[o + 11] = c[k * 4 + 3];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 48, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 48, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 48, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 32);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, n > 65535 ? new Uint32Array(geo.i) : new Uint16Array(geo.i), gl.STATIC_DRAW);
    if (geo.extra) { // thuộc tính bổ sung: trọng số xương (skin) hoặc mục tiêu biến hình (morph)
      var xb = gl.createBuffer(), st = 0, off = 0; gl.bindBuffer(gl.ARRAY_BUFFER, xb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.extra.data), gl.STATIC_DRAW);
      geo.extra.layout.forEach(function (l) { st += l[1]; });
      geo.extra.layout.forEach(function (l) { gl.enableVertexAttribArray(l[0]); gl.vertexAttribPointer(l[0], l[1], gl.FLOAT, false, st * 4, off * 4); off += l[1]; });
    }
    gl.bindVertexArray(null);
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    return { vao: vao, count: geo.i.length, type: n > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, center: [cx, cy, cz], radius: Math.hypot(x1 - cx, y1 - cy, z1 - cz) };
  };
  /* inst: Float32Array 8 số/instance: x,y,z,scale, rotY,phase,lean,tint */
  R.addInstanced = function (geo, inst, count, mat, center, radius, maxDist) {
    var m = R.mesh(geo);
    gl.bindVertexArray(m.vao);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, inst, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(4, 1);
    gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(5, 1);
    gl.bindVertexArray(null);
    R.instGroups.push({ mesh: m, count: count, mat: mat, center: center, radius: radius, maxDist: maxDist || 0 });
  };
  R.addStatic = function (geo, matName) {
    if (!geo.i.length) return;
    var m = R.mesh(geo);
    R.statics.push({ mesh: m, mat: matName, center: m.center, radius: m.radius });
    R.statics.sort(function (a, b) { return a.mat < b.mat ? -1 : (a.mat > b.mat ? 1 : 0); });
  };

  function target(w, h, float, depth) {
    var t = { w: w, h: h, fbo: gl.createFramebuffer(), tex: gl.createTexture(), depth: null };
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    if (depth) {
      t.depth = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t.depth);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t.depth, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return t;
  }
  function freeTarget(t) { if (!t) return; gl.deleteFramebuffer(t.fbo); gl.deleteTexture(t.tex); if (t.depth) gl.deleteTexture(t.depth); }

  R.dynScale = 1;
  R.resize = function () {
    var q = R.q, c = R.canvas;
    var dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
    var w = Math.max(320, Math.floor(c.clientWidth * dpr)), h = Math.max(200, Math.floor(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    var s = q.scale * R.dynScale;
    var sw = Math.max(160, Math.round(w * s / 2) * 2), sh = Math.max(90, Math.round(h * s / 2) * 2);
    if (!R.sceneRT || R.sceneRT.w !== sw || R.sceneRT.h !== sh) {
      freeTarget(R.sceneRT); freeTarget(R.bloomA); freeTarget(R.bloomB);
      R.sceneRT = target(sw, sh, R.floatRT, true);
      var bw = Math.max(32, sw >> 2), bh = Math.max(18, sh >> 2);
      R.bloomA = target(bw, bh, R.floatRT, false); R.bloomB = target(bw, bh, R.floatRT, false);
    }
  };

  function extractPlanes(m) {
    var rows = [[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]], [m[2], m[6], m[10], m[14]], [m[3], m[7], m[11], m[15]]];
    var k = 0;
    for (var a = 0; a < 3; a++) for (var s = -1; s <= 1; s += 2) {
      var x = rows[3][0] + s * rows[a][0], y = rows[3][1] + s * rows[a][1], z = rows[3][2] + s * rows[a][2], w = rows[3][3] + s * rows[a][3];
      var l = Math.hypot(x, y, z) || 1;
      planes[k++] = x / l; planes[k++] = y / l; planes[k++] = z / l; planes[k++] = w / l;
    }
  }
  function visible(c, r) {
    for (var k = 0; k < 24; k += 4) if (planes[k] * c[0] + planes[k + 1] * c[1] + planes[k + 2] * c[2] + planes[k + 3] < -r) return false;
    return true;
  }
  R.project = function (x, y, z) {
    var w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
    return [(VP[0] * x + VP[4] * y + VP[8] * z + VP[12]) / w * 0.5 + 0.5, (VP[1] * x + VP[5] * y + VP[9] * z + VP[13]) / w * 0.5 + 0.5, w];
  };

  var lightPos = new Float32Array(16 * 4), lightCol = new Float32Array(16 * 3), lightN = 0, roofU = new Float32Array(24);
  var _c = [0, 0, 0], opaque = [], transp = [], opSkin = [], opMorph = [], _bm = M.create();

  function setFrame(pr) {
    var e = R.env, cam = R.cam;
    gl.uniformMatrix4fv(U(pr, 'uViewProj'), false, VP);
    gl.uniform1f(U(pr, 'uTime'), e.time);
    gl.uniform4f(U(pr, 'uWind'), e.wind[0], e.wind[1], e.wind[2], e.wind[3]);
    gl.uniform3fv(U(pr, 'uCam'), cam.pos);
    gl.uniform3fv(U(pr, 'uAmbSky'), e.ambSky); gl.uniform3fv(U(pr, 'uAmbGnd'), e.ambGnd);
    gl.uniform3fv(U(pr, 'uMoonDir'), e.moonDir);
    var L = 1 + e.lightning * 14;
    gl.uniform3f(U(pr, 'uMoonCol'), e.moonCol[0] * L + e.lightning * 0.5, e.moonCol[1] * L + e.lightning * 0.55, e.moonCol[2] * L + e.lightning * 0.7);
    gl.uniform3fv(U(pr, 'uFlPos'), e.flPos); gl.uniform3fv(U(pr, 'uFlDir'), e.flDir); gl.uniform3fv(U(pr, 'uFlCol'), e.flCol);
    gl.uniform2f(U(pr, 'uFlCone'), e.flCone[0], e.flCone[1]);
    gl.uniform4fv(U(pr, 'uLP'), lightPos); gl.uniform3fv(U(pr, 'uLC'), lightCol); gl.uniform1i(U(pr, 'uLN'), lightN);
    gl.uniform3fv(U(pr, 'uXenon'), e.xenon);
    gl.uniform1i(U(pr, 'uAlb'), 0); gl.uniform1i(U(pr, 'uNrm'), 1);
  }
  var DEF_TINT = [1, 1, 1, 1], DEF_EMIS = [0, 0, 0];
  function setMat(pr, mat) {
    var tm = R.materials[mat.tex || 'plain'] || R.materials.plain;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tm.alb);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tm.nrm || R.textures.flat);
    gl.uniform4fv(U(pr, 'uTint'), mat.tint || DEF_TINT);
    gl.uniform3fv(U(pr, 'uEmis'), mat.emis || DEF_EMIS);
    gl.uniform4f(U(pr, 'uMat'), mat.rough === undefined ? 1 : mat.rough, mat.nscale === undefined ? 1 : mat.nscale, mat.skin || 0, mat.unlit || 0);
    gl.uniform1f(U(pr, 'uUVScale'), (mat.uv || 1) * (tm.uv || 1));
    gl.uniform1f(U(pr, 'uCloth'), mat.cloth || 0);
    gl.uniform4f(U(pr, 'uMat2'), mat.sss || 0, mat.rim || 0, mat.cutout ? 1 : 0, 0);
  }
  var STATIC_MATS = {};
  R.defineStaticMat = function (name, m) { STATIC_MATS[name] = m; };
  R.staticMat = function (name) { return STATIC_MATS[name] || (STATIC_MATS[name] = { tex: name }); };

  function collect(n) {
    if (!n.visible) return;
    if (n.mesh && n.mat) {
      M.tp(n.world, n.mesh.center[0], n.mesh.center[1], n.mesh.center[2], _c);
      var sc = Math.max(Math.abs(n.scl[0]), Math.abs(n.scl[1]), Math.abs(n.scl[2]));
      if (visible(_c, n.mesh.radius * sc * 1.5 + 0.5)) {
        var m = n.mat;
        if (m.additive || m.blend || (m.tint && m.tint[3] < 0.995)) transp.push(n); else if (n.skin) opSkin.push(n); else if (n.morph) opMorph.push(n); else opaque.push(n);
      }
    }
    for (var k = 0; k < n.children.length; k++) collect(n.children[k]);
  }
  function drawMesh(m) { gl.bindVertexArray(m.vao); gl.drawElements(gl.TRIANGLES, m.count, m.type, 0); R.stats.draws++; R.stats.tris += m.count / 3; }

  R.render = function () {
    var S = H.Shaders, q = R.q, e = R.env, cam = R.cam, po = R.post, k;
    R.resize();
    R.stats.draws = 0; R.stats.tris = 0;
    var rt = R.sceneRT, far = q.view * 1.4 + 60;
    M.perspective(proj, cam.fov * Math.PI / 180, R.canvas.width / R.canvas.height, 0.07, far);
    M.compose(camW, cam.pos[0], cam.pos[1], cam.pos[2], cam.pitch, cam.yaw, cam.roll, 1, 1, 1);
    M.invert(view, camW); M.mul(VP, proj, view); M.invert(invVP, VP);
    extractPlanes(VP);
    for (k = 0; k < R.nodes.length; k++) R.nodes[k].update(null);

    // chọn đèn gần nhất
    var ls = R.lights, cand = [];
    for (k = 0; k < ls.length; k++) {
      var l = ls[k]; if (!l.on || l.intensity <= 0.001) continue;
      var dx = l.pos[0] - cam.pos[0], dy = l.pos[1] - cam.pos[1], dz = l.pos[2] - cam.pos[2];
      l._d = dx * dx + dy * dy + dz * dz;
      if (l._d < (q.view + l.radius) * (q.view + l.radius)) cand.push(l);
    }
    cand.sort(function (a, b) { return a._d - b._d; });
    lightN = Math.min(cand.length, q.lights);
    for (k = 0; k < lightN; k++) {
      l = cand[k];
      lightPos[k * 4] = l.pos[0]; lightPos[k * 4 + 1] = l.pos[1]; lightPos[k * 4 + 2] = l.pos[2]; lightPos[k * 4 + 3] = l.radius;
      lightCol[k * 3] = l.color[0] * l.intensity; lightCol[k * 3 + 1] = l.color[1] * l.intensity; lightCol[k * 3 + 2] = l.color[2] * l.intensity;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo); gl.viewport(0, 0, rt.w, rt.h);
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.depthMask(true); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);

    // ---- bầu trời
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    var ps = prog('sky', S.fullVS, S.skyFS, '');
    gl.useProgram(ps.p); gl.bindVertexArray(R.emptyVAO);
    gl.uniformMatrix4fv(U(ps, 'uInvVP'), false, invVP); gl.uniform3fv(U(ps, 'uCam'), cam.pos);
    gl.uniform3fv(U(ps, 'uMoonDir'), e.moonDir); gl.uniform3fv(U(ps, 'uMoonTint'), e.moonTint);
    gl.uniform1f(U(ps, 'uTime'), e.time); gl.uniform1f(U(ps, 'uLightning'), e.lightning);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);

    // ---- lưới tĩnh
    var defs = '#define MAXL ' + Math.max(1, q.lights) + '\n' + (q.normal ? '#define NORMALMAP\n' : '');
    var pl = prog('lit', S.litVS, S.litFS, defs);
    gl.useProgram(pl.p); setFrame(pl);
    gl.uniformMatrix4fv(U(pl, 'uModel'), false, ident);
    var vd = q.view, cur = null;
    for (k = 0; k < R.statics.length; k++) {
      var s = R.statics[k];
      var ddx = s.center[0] - cam.pos[0], ddz = s.center[2] - cam.pos[2];
      if (ddx * ddx + ddz * ddz > (vd + s.radius) * (vd + s.radius)) continue;
      if (!visible(s.center, s.radius)) continue;
      if (cur !== s.mat) { cur = s.mat; setMat(pl, R.staticMat(cur)); }
      drawMesh(s.mesh);
    }
    // ---- node động
    opaque.length = 0; transp.length = 0; opSkin.length = 0; opMorph.length = 0;
    for (k = 0; k < R.nodes.length; k++) collect(R.nodes[k]);
    for (k = 0; k < opaque.length; k++) {
      var n = opaque[k]; setMat(pl, n.mat); gl.uniformMatrix4fv(U(pl, 'uModel'), false, n.world); drawMesh(n.mesh);
    }
    if (opSkin.length) { // thân nhân vật: linear blend skinning trên GPU
      var pk = prog('lit', S.litVS, S.litFS, defs + '#define SKIN\n'); gl.useProgram(pk.p); setFrame(pk);
      for (k = 0; k < opSkin.length; k++) {
        n = opSkin[k]; var sk = n.skin;
        for (var b = 0; b < sk.joints.length; b++) { M.mul(_bm, sk.joints[b].world, sk.inv[b]); sk.data.set(_bm, b * 16); }
        gl.uniformMatrix4fv(U(pk, 'uBones[0]'), false, sk.data); setMat(pk, n.mat); drawMesh(n.mesh);
      }
    }
    if (opMorph.length) { // khuôn mặt: 6 mục tiêu biến hình (khẩu hình + biểu cảm)
      var pm = prog('lit', S.litVS, S.litFS, defs + '#define MORPH\n'); gl.useProgram(pm.p); setFrame(pm);
      for (k = 0; k < opMorph.length; k++) { n = opMorph[k]; gl.uniform1fv(U(pm, 'uMorph[0]'), n.morph); setMat(pm, n.mat); gl.uniformMatrix4fv(U(pm, 'uModel'), false, n.world); drawMesh(n.mesh); }
    }
    // ---- instancing (tre)
    if (R.instGroups.length) {
      var pi = prog('lit', S.litVS, S.litFS, defs + '#define INSTANCED\n');
      gl.useProgram(pi.p); setFrame(pi);
      for (k = 0; k < R.instGroups.length; k++) {
        var g = R.instGroups[k];
        ddx = g.center[0] - cam.pos[0]; ddz = g.center[2] - cam.pos[2];
        var dd = Math.sqrt(ddx * ddx + ddz * ddz);
        if (dd > vd + g.radius || (g.maxDist && dd > g.maxDist + g.radius) || !visible(g.center, g.radius)) continue;
        var cnt = Math.max(1, Math.floor(g.count * q.bamboo * (dd > 60 ? 0.6 : 1)));
        setMat(pi, g.mat);
        gl.bindVertexArray(g.mesh.vao); gl.drawElementsInstanced(gl.TRIANGLES, g.mesh.count, g.mesh.type, 0, cnt);
        R.stats.draws++; R.stats.tris += g.mesh.count / 3 * cnt;
      }
    }
    // ---- trong suốt
    gl.enable(gl.BLEND); gl.depthMask(false);
    if (transp.length) {
      gl.useProgram(pl.p);
      for (k = 0; k < transp.length; k++) {
        n = transp[k];
        if (n.mat.additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(!!n.mat.zw);
        setMat(pl, n.mat); gl.uniformMatrix4fv(U(pl, 'uModel'), false, n.world); drawMesh(n.mesh);
      }
      gl.depthMask(false);
    }
    // mưa
    var rc = Math.min(9000, Math.floor(q.rain * e.rain));
    if (rc > 0) {
      var pr = prog('rain', S.rainVS, S.rainFS, '');
      gl.useProgram(pr.p); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.uniformMatrix4fv(U(pr, 'uViewProj'), false, VP); gl.uniform3fv(U(pr, 'uCam'), cam.pos);
      gl.uniform1f(U(pr, 'uTime'), e.time); gl.uniform3f(U(pr, 'uWindV'), e.wind[0] * 3.5, 0, e.wind[1] * 3.5);
      gl.uniform3fv(U(pr, 'uFlPos'), e.flPos); gl.uniform3fv(U(pr, 'uFlDir'), e.flDir);
      gl.uniform1f(U(pr, 'uFlOn'), (e.flCol[0] + e.flCol[1] + e.flCol[2]) > 0.01 ? 1 : 0);
      gl.uniform1f(U(pr, 'uLit'), 0.05 + e.lightning * 1.2 + e.xenon[0] * 0.05);
      var rf = R.roofs, nr = 0;
      for (k = 0; k < rf.length && nr < 6; k++) {
        var r = rf[k], rx = (r[0] + r[2]) / 2 - cam.pos[0], rz = (r[1] + r[3]) / 2 - cam.pos[2];
        if (rx * rx + rz * rz < 45 * 45) { roofU[nr * 4] = r[0]; roofU[nr * 4 + 1] = r[1]; roofU[nr * 4 + 2] = r[2]; roofU[nr * 4 + 3] = r[3]; nr++; }
      }
      gl.uniform4fv(U(pr, 'uRoof'), roofU); gl.uniform1i(U(pr, 'uRoofN'), nr);
      gl.bindVertexArray(R.rainVAO); gl.drawElements(gl.TRIANGLES, rc * 6, gl.UNSIGNED_INT, 0); R.stats.draws++;
    }
    // hạt tro / tàn lửa
    var pt = R.particles;
    if (pt.count > 0) {
      var pp = prog('part', S.partVS, S.partFS, '');
      gl.useProgram(pp.p); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(U(pp, 'uViewProj'), false, VP); gl.uniform1f(U(pp, 'uScale'), rt.h * 0.9);
      gl.bindVertexArray(R.partVAO); gl.bindBuffer(gl.ARRAY_BUFFER, R.partVBO);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pt.data, 0, pt.count * 8);
      gl.drawArrays(gl.POINTS, 0, pt.count); R.stats.draws++;
    }
    gl.disable(gl.BLEND); gl.depthMask(true); gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(R.emptyVAO);

    // ---- bloom
    if (q.bloom) {
      var pb = prog('bright', S.fullVS, S.brightFS, '');
      gl.bindFramebuffer(gl.FRAMEBUFFER, R.bloomA.fbo); gl.viewport(0, 0, R.bloomA.w, R.bloomA.h);
      gl.useProgram(pb.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rt.tex);
      gl.uniform1i(U(pb, 'uTex'), 0); gl.uniform2f(U(pb, 'uPx'), 1 / rt.w, 1 / rt.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      var pbl = prog('blur', S.fullVS, S.blurFS, '');
      gl.useProgram(pbl.p); gl.uniform1i(U(pbl, 'uTex'), 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, R.bloomB.fbo); gl.bindTexture(gl.TEXTURE_2D, R.bloomA.tex);
      gl.uniform2f(U(pbl, 'uDir'), 1.3 / R.bloomA.w, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, R.bloomA.fbo); gl.bindTexture(gl.TEXTURE_2D, R.bloomB.tex);
      gl.uniform2f(U(pbl, 'uDir'), 0, 1.3 / R.bloomA.h); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // ---- uber-shader hậu kỳ
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, R.canvas.width, R.canvas.height);
    var pd = (q.bloom ? '#define BLOOM\n' : '') + (q.chroma ? '#define CHROMA\n' : '') + (q.mistNoise ? '#define MISTNOISE\n' : '') + (q.sharpen ? '#define SHARP\n' : '') + (q.ssao ? '#define SSAO\n' : '');
    var pf = prog('post', S.fullVS, S.postFS, pd);
    gl.useProgram(pf.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rt.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, rt.depth);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, R.bloomA.tex);
    gl.uniform1i(U(pf, 'uScene'), 0); gl.uniform1i(U(pf, 'uDepth'), 1); gl.uniform1i(U(pf, 'uBloom'), 2);
    gl.uniform2f(U(pf, 'uRes'), R.canvas.width, R.canvas.height); gl.uniform1f(U(pf, 'uTime'), e.time);
    gl.uniformMatrix4fv(U(pf, 'uInvVP'), false, invVP); gl.uniform3fv(U(pf, 'uCam'), cam.pos);
    var fl = 1 + e.lightning * 9;
    gl.uniform4f(U(pf, 'uFogA'), e.fogCol[0] * fl, e.fogCol[1] * fl, e.fogCol[2] * fl, e.fogDen * (95 / Math.max(60, q.view)) + 0.004);
    gl.uniform4f(U(pf, 'uFogB'), e.mistBase, e.mistFall, e.mistDen, 0.75);
    gl.uniform4f(U(pf, 'uFx'), po.aberr, po.barrel, q.grain === false ? po.grain * 0.3 : po.grain, po.vignette);
    gl.uniform4f(U(pf, 'uFx2'), po.veins, po.pulse, po.view, po.exposure);
    gl.uniform4f(U(pf, 'uFx3'), e.flHaze, e.flScreen[0], e.flScreen[1], e.xenon[0]);
    gl.uniform4f(U(pf, 'uFx4'), po.fade, po.desat, po.white, po.scan);
    gl.uniform4f(U(pf, 'uFx5'), po.sepia || 0, 0, 0, 0);
    gl.uniform4f(U(pf, 'uPx'), 1 / rt.w, 1 / rt.h, 0.07, far);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  /* texture chữ (bùa máu, bia, biển tên) từ Canvas2D */
  R.textTexture = function (lines, o) {
    o = o || {};
    var c = document.createElement('canvas'); c.width = o.w || 512; c.height = o.h || 256;
    var x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, c.width, c.height); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    var fs = o.size || 64; x.font = (o.bold ? 'bold ' : '') + fs + 'px "Times New Roman", "Noto Serif", serif';
    var lh = fs * 1.2, y0 = c.height / 2 - (lines.length - 1) * lh / 2, rnd = H.rng(o.seed || 5);
    for (var p = 0; p < 2; p++) {
      x.shadowColor = o.glow || 'rgba(255,20,10,0.9)'; x.shadowBlur = p === 0 ? fs * 0.4 : 0;
      x.fillStyle = o.color || '#c8140c';
      for (var k = 0; k < lines.length; k++) x.fillText(lines[k], c.width / 2, y0 + k * lh);
    }
    if (o.drip) {
      x.shadowBlur = 0; x.strokeStyle = o.color || '#a0100a'; x.lineCap = 'round';
      for (k = 0; k < 14; k++) { var dx = c.width * (0.15 + rnd() * 0.7), dy = y0 + (lines.length - 1) * lh * rnd(); x.lineWidth = 2 + rnd() * 4; x.beginPath(); x.moveTo(dx, dy); x.lineTo(dx + rnd() * 4 - 2, dy + 20 + rnd() * 70); x.stroke(); }
    }
    return R.texData(c.width, c.height, c, { clamp: true });
  };
})();
