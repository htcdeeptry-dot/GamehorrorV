/* HUYẾT LỆ THÔN — procedural_assets.js
   Bộ sinh nhiễu Perlin / fBm / Worley lặp liền mạch và xưởng texture PBR thủ tục:
   albedo + roughness (kênh A) và normal map (Sobel từ height) + height (kênh A). */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var A = H.Assets = {};

  /* ---------- nhiễu ---------- */
  var perm = new Uint8Array(512), rnd = H.rng(1994), i;
  for (i = 0; i < 256; i++) perm[i] = i;
  for (i = 255; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (i = 0; i < 256; i++) perm[i + 256] = perm[i];
  var GX = [1, -1, 1, -1, 1, -1, 0, 0], GY = [1, 1, -1, -1, 0, 0, 1, -1];
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function mod(a, n) { return ((a % n) + n) % n; }
  /* Perlin 2D tuần hoàn chu kỳ (px,py) -> [-1,1] */
  function pnoise(x, y, px, py) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var x0 = mod(xi, px), x1 = (x0 + 1) % px, y0 = mod(yi, py), y1 = (y0 + 1) % py;
    var h00 = perm[perm[x0 & 255] + (y0 & 255)] & 7, h10 = perm[perm[x1 & 255] + (y0 & 255)] & 7;
    var h01 = perm[perm[x0 & 255] + (y1 & 255)] & 7, h11 = perm[perm[x1 & 255] + (y1 & 255)] & 7;
    var u = fade(xf), v = fade(yf);
    var a = GX[h00] * xf + GY[h00] * yf, b = GX[h10] * (xf - 1) + GY[h10] * yf;
    var c = GX[h01] * xf + GY[h01] * (yf - 1), d = GX[h11] * (xf - 1) + GY[h11] * (yf - 1);
    return (a + (b - a) * u + ((c + (d - c) * u) - (a + (b - a) * u)) * v) * 1.2;
  }
  function fbm(x, y, oct, px, py) {
    var s = 0, a = 0.5, n = 0;
    for (var o = 0; o < oct; o++) { s += a * pnoise(x, y, px, py); n += a; x *= 2; y *= 2; px *= 2; py *= 2; a *= 0.5; }
    return s / n;
  }
  var W1 = 0, W2 = 0;
  /* Worley tuần hoàn: kết quả ở W1 (F1), W2 (F2) */
  function worley(x, y, p) {
    var xi = Math.floor(x), yi = Math.floor(y), f1 = 9, f2 = 9;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var cx = xi + dx, cy = yi + dy, h = perm[perm[mod(cx, p) & 255] + (mod(cy, p) & 255)];
      var fx = cx + perm[h] / 255, fy = cy + perm[h + 57] / 255;
      var d = (fx - x) * (fx - x) + (fy - y) * (fy - y);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    W1 = Math.sqrt(f1); W2 = Math.sqrt(f2);
    return W1;
  }
  A.noise = function (x, y) { return pnoise(x + 1000, y + 1000, 256, 256); };
  A.fbm = function (x, y, o) { return fbm(x + 1000, y + 1000, o || 4, 256, 256); };
  function sstep(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }

  /* ---------- lõi xưởng texture ---------- */
  var OUT = { h: 0, r: 0, g: 0, b: 0, ro: 0 };
  function bake(S, fn, nStrength) {
    var hgt = new Float32Array(S * S), alb = new Uint8Array(S * S * 4), nrm = new Uint8Array(S * S * 4), x, y, o;
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      fn(x / S, y / S, OUT);
      o = (y * S + x);
      hgt[o] = OUT.h;
      // lưu albedo dạng gamma (sqrt) để shader bình phương lại
      alb[o * 4] = Math.sqrt(Math.max(0, Math.min(1, OUT.r))) * 255;
      alb[o * 4 + 1] = Math.sqrt(Math.max(0, Math.min(1, OUT.g))) * 255;
      alb[o * 4 + 2] = Math.sqrt(Math.max(0, Math.min(1, OUT.b))) * 255;
      alb[o * 4 + 3] = Math.max(0, Math.min(1, OUT.ro)) * 255;
    }
    // Sobel: height -> normal
    var k = nStrength * S / 256;
    for (y = 0; y < S; y++) {
      var ym = ((y - 1 + S) % S) * S, yc = y * S, yp = ((y + 1) % S) * S;
      for (x = 0; x < S; x++) {
        var xm = (x - 1 + S) % S, xp = (x + 1) % S;
        var dx = (hgt[ym + xp] + 2 * hgt[yc + xp] + hgt[yp + xp]) - (hgt[ym + xm] + 2 * hgt[yc + xm] + hgt[yp + xm]);
        var dy = (hgt[yp + xm] + 2 * hgt[yp + x] + hgt[yp + xp]) - (hgt[ym + xm] + 2 * hgt[ym + x] + hgt[ym + xp]);
        var nx = -dx * k, ny = -dy * k, l = Math.sqrt(nx * nx + ny * ny + 1);
        o = (yc + x) * 4;
        nrm[o] = (nx / l * 0.5 + 0.5) * 255; nrm[o + 1] = (ny / l * 0.5 + 0.5) * 255; nrm[o + 2] = (1 / l * 0.5 + 0.5) * 255;
        nrm[o + 3] = Math.max(0, Math.min(1, hgt[yc + x])) * 255;
      }
    }
    return { S: S, alb: alb, nrm: nrm };
  }

  /* 1. Gỗ lim cổ thụ: thớ gỗ, nứt dọc, rêu ẩm */
  function wood(u, v, o) {
    var plank = u * 4, pi = Math.floor(plank), pf = plank - pi;
    var ofs = perm[pi & 255] * 0.37;
    var warp = fbm(u * 3 + ofs, v * 1.0, 3, 3, 1) * 0.35;
    var grain = fbm((u + warp * 0.08) * 48 + ofs, v * 2 + ofs, 4, 48, 2);
    var ring = Math.sin((u * 14 + warp * 3 + fbm(u * 6, v * 1, 2, 6, 1) * 1.5 + ofs) * 6.283) * 0.5 + 0.5;
    var fine = pnoise(u * 180, v * 6, 180, 6);
    var seam = sstep(0.0, 0.035, pf) * sstep(1.0, 0.965, pf);
    var cr = Math.abs(pnoise(u * 10 + ofs, v * 1.5, 10, 3) + 0.35 * pnoise(u * 34, v * 3, 34, 3));
    var crack = 1 - sstep(0.0, 0.035, cr);
    crack *= sstep(0.1, 0.5, fbm(u * 3 + 9, v * 3, 2, 3, 3) * 0.5 + 0.5);
    var moss = sstep(0.12, 0.42, fbm(u * 4 + 3, v * 4 + 7, 4, 4, 4) + (1 - seam) * 0.2);
    var h = 0.55 + grain * 0.16 + ring * 0.06 + fine * 0.03 - crack * 0.4 - (1 - seam) * 0.5;
    var tone = 0.72 + grain * 0.22 + ring * 0.1 + (perm[(pi + 31) & 255] / 255 - 0.5) * 0.25;
    var r = 0.105 * tone, g = 0.068 * tone, b = 0.048 * tone;
    var dark = 1 - crack * 0.75; r *= dark * (0.35 + 0.65 * seam); g *= dark * (0.35 + 0.65 * seam); b *= dark * (0.35 + 0.65 * seam);
    var mn = 0.7 + 0.3 * pnoise(u * 90, v * 90, 90, 90);
    r = mix(r, 0.030 * mn, moss * 0.8); g = mix(g, 0.058 * mn, moss * 0.8); b = mix(b, 0.022 * mn, moss * 0.8);
    o.h = h + moss * 0.06 * mn; o.r = r; o.g = g; o.b = b;
    o.ro = mix(0.7 + grain * 0.12, 0.95, moss);
  }
  /* 2. Đá ong rêu phong: khối xây, lỗ rỗ núi lửa (Worley) */
  function stone(u, v, o) {
    var row = v * 4, ri = Math.floor(row), rf = row - ri;
    var col = u * 2 + (ri & 1) * 0.5, ci = Math.floor(col), cf = col - ci;
    var id = perm[(perm[mod(ci, 2) + ri * 7 & 255] + ri) & 255] / 255;
    var jx = sstep(0.0, 0.03, cf) * sstep(1.0, 0.97, cf), jy = sstep(0.0, 0.06, rf) * sstep(1.0, 0.94, rf);
    var joint = jx * jy;
    var big = fbm(u * 4, v * 4, 4, 4, 4);
    worley(u * 26, v * 26, 26); var pit1 = 1 - sstep(0.06, 0.34, W1);
    worley(u * 58 + 3, v * 58, 58); var pit2 = 1 - sstep(0.08, 0.36, W1);
    var pits = Math.max(pit1 * (0.6 + big * 0.5), pit2 * 0.6);
    var fine = pnoise(u * 120, v * 120, 120, 120);
    var moss = sstep(0.05, 0.38, fbm(u * 3 + 5, v * 3 + 1, 4, 3, 3) + (1 - joint) * 0.35 - 0.05);
    var h = 0.6 + big * 0.12 + fine * 0.03 - pits * 0.32 - (1 - joint) * 0.45;
    var tone = 0.72 + id * 0.4 + big * 0.25;
    var r = 0.20 * tone, g = 0.085 * tone, b = 0.045 * tone;
    var d = (1 - pits * 0.7) * (0.3 + 0.7 * joint); r *= d; g *= d; b *= d;
    var mn = 0.65 + 0.35 * pnoise(u * 80, v * 80, 80, 80);
    r = mix(r, 0.034 * mn, moss * 0.85); g = mix(g, 0.062 * mn, moss * 0.85); b = mix(b, 0.026 * mn, moss * 0.85);
    o.h = h + moss * 0.05 * mn; o.r = r; o.g = g; o.b = b; o.ro = mix(0.82, 0.95, moss) - pits * 0.1;
  }
  /* 3. Sân bùn ướt: vũng nước mưa có roughness cực thấp để phản chiếu đèn lồng */
  function mud(u, v, o) {
    var big = fbm(u * 3, v * 3, 5, 3, 3);
    var med = fbm(u * 11 + 4, v * 11, 4, 11, 11);
    var puddle = sstep(-0.02, -0.16, big + med * 0.12);
    worley(u * 30, v * 30, 30); var peb = (1 - sstep(0.1, 0.3, W1)) * sstep(0.1, 0.3, fbm(u * 6 + 2, v * 6, 2, 6, 6) + 0.2);
    var fine = pnoise(u * 70, v * 70, 70, 70);
    var rut = Math.abs(pnoise(u * 5, v * 14, 5, 14)); rut = 1 - sstep(0.0, 0.12, rut);
    var h = 0.5 + big * 0.25 + med * 0.1 + fine * 0.04 + peb * 0.12 - rut * 0.08;
    h = mix(h, 0.32, puddle);
    var tone = 0.7 + med * 0.4 + fine * 0.15;
    var r = 0.085 * tone, g = 0.058 * tone, b = 0.040 * tone;
    r = mix(r, 0.11, peb * 0.6); g = mix(g, 0.10, peb * 0.6); b = mix(b, 0.09, peb * 0.6);
    r = mix(r, 0.012, puddle); g = mix(g, 0.010, puddle); b = mix(b, 0.012, puddle);
    o.h = h; o.r = r; o.g = g; o.b = b;
    o.ro = mix(0.62 - rut * 0.25 + peb * 0.2, 0.035, puddle);
  }
  /* 4. Ngói âm dương: hàng ngói ống xếp lớp */
  function roof(u, v, o) {
    var cx = u * 8, ci = Math.floor(cx), cf = cx - ci;
    var ridge = Math.pow(Math.abs(Math.sin(cf * Math.PI)), 0.55);
    var rw = v * 6 + (ci & 1) * 0.0, rf = rw - Math.floor(rw);
    var lip = sstep(0.0, 0.08, rf);
    var id = perm[(perm[ci & 255] + Math.floor(rw)) & 255] / 255;
    var big = fbm(u * 4, v * 4, 4, 4, 4), fine = pnoise(u * 100, v * 100, 100, 100);
    var moss = sstep(0.1, 0.45, fbm(u * 5 + 8, v * 5, 3, 5, 5) + (1 - ridge) * 0.35 - 0.1);
    var h = ridge * 0.6 + (1 - rf) * 0.25 * ridge + fine * 0.03 - (1 - lip) * 0.3;
    var tone = 0.6 + id * 0.45 + big * 0.25;
    var r = 0.14 * tone, g = 0.055 * tone, b = 0.040 * tone;
    var d = (0.35 + 0.65 * ridge) * (0.45 + 0.55 * lip); r *= d; g *= d; b *= d;
    var mn = 0.7 + 0.3 * fine;
    r = mix(r, 0.03 * mn, moss * 0.75); g = mix(g, 0.055 * mn, moss * 0.75); b = mix(b, 0.024 * mn, moss * 0.75);
    o.h = h; o.r = r; o.g = g; o.b = b; o.ro = mix(0.38, 0.9, moss);
  }
  /* 5. Lụa: sợi dệt mịn */
  function silk(u, v, o) {
    var wv = Math.sin(u * 6.283 * 64) * Math.sin(v * 6.283 * 64) * 0.5 + 0.5;
    var fold = fbm(u * 3, v * 2, 3, 3, 2), st = fbm(u * 8 + 3, v * 8, 3, 8, 8);
    var t = 0.8 + fold * 0.3 - sstep(0.15, 0.5, st) * 0.35;
    o.h = 0.5 + wv * 0.08 + fold * 0.3; o.r = t; o.g = t; o.b = t; o.ro = 0.42 + wv * 0.1;
  }
  /* 6. Vỏ cây đa / thân gỗ sần */
  function bark(u, v, o) {
    var w = fbm(u * 3, v * 2, 3, 3, 2) * 0.4;
    var rd = Math.abs(pnoise((u + w * 0.1) * 14, v * 3, 14, 3)) + 0.4 * Math.abs(pnoise(u * 40, v * 8, 40, 8));
    var fur = sstep(0.0, 0.5, rd);
    var fine = pnoise(u * 90, v * 30, 90, 30);
    var moss = sstep(0.15, 0.5, fbm(u * 4 + 2, v * 4 + 9, 4, 4, 4));
    var tone = 0.35 + fur * 0.8 + fine * 0.1;
    var r = 0.085 * tone, g = 0.066 * tone, b = 0.05 * tone;
    r = mix(r, 0.03, moss * 0.7); g = mix(g, 0.055, moss * 0.7); b = mix(b, 0.022, moss * 0.7);
    o.h = fur * 0.8 + fine * 0.05; o.r = r; o.g = g; o.b = b; o.ro = 0.88;
  }

  /* 7. Bùa chu sa & giấy dó: Canvas2D — nét bút thư pháp thủ tục + vết máu khô */
  function paperCanvas(S) {
    var c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d'), r = H.rng(4649), k;
    x.fillStyle = '#b89a55'; x.fillRect(0, 0, S, S);
    for (k = 0; k < 2600; k++) {
      var a = r() * 0.10; x.fillStyle = r() > 0.5 ? 'rgba(70,45,15,' + a + ')' : 'rgba(225,200,140,' + a + ')';
      var w = 2 + r() * 26; x.fillRect(r() * S, r() * S, w, 1 + r() * 3);
    }
    for (k = 0; k < 12; k++) { // vết ố nước
      var gx = r() * S, gy = r() * S, gr = 30 + r() * 110, g = x.createRadialGradient(gx, gy, gr * 0.4, gx, gy, gr);
      g.addColorStop(0, 'rgba(90,60,25,0)'); g.addColorStop(0.85, 'rgba(70,45,18,0.22)'); g.addColorStop(1, 'rgba(70,45,18,0)');
      x.fillStyle = g; x.beginPath(); x.arc(gx, gy, gr, 0, 6.3); x.fill();
    }
    // nét bút: mỗi "chữ" gồm vài nét cong có độ dày thay đổi
    function stroke(x0, y0, x1, y1, w0, w1, col) {
      var mx = (x0 + x1) / 2 + (r() - 0.5) * 14, my = (y0 + y1) / 2 + (r() - 0.5) * 14;
      for (var t = 0; t <= 1; t += 0.04) {
        var px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1, py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
        x.fillStyle = col; x.beginPath(); x.arc(px, py, mix(w0, w1, t) * (0.8 + r() * 0.3), 0, 6.3); x.fill();
      }
    }
    function glyph(cx, cy, s, col) {
      var n = 3 + Math.floor(r() * 4);
      for (var q = 0; q < n; q++) {
        var t = r();
        if (t < 0.35) stroke(cx - s * 0.5, cy + (r() - 0.5) * s, cx + s * 0.5, cy + (r() - 0.5) * s * 0.9, s * 0.07, s * 0.03, col);
        else if (t < 0.7) stroke(cx + (r() - 0.5) * s, cy - s * 0.5, cx + (r() - 0.5) * s, cy + s * 0.5, s * 0.07, s * 0.02, col);
        else stroke(cx + (r() - 0.5) * s, cy - s * 0.3, cx + (r() - 0.5) * s * 1.2, cy + s * 0.5, s * 0.08, s * 0.01, col);
      }
    }
    var u = S / 512;
    // khung bùa + ấn
    x.strokeStyle = 'rgba(150,20,12,0.85)'; x.lineWidth = 5 * u; x.strokeRect(150 * u, 18 * u, 212 * u, 476 * u);
    x.lineWidth = 2 * u; x.strokeRect(160 * u, 28 * u, 192 * u, 456 * u);
    x.beginPath(); x.arc(256 * u, 80 * u, 34 * u, 0, 6.3); x.stroke();
    glyph(256 * u, 80 * u, 36 * u, 'rgba(160,22,12,0.9)');
    for (k = 0; k < 6; k++) glyph(256 * u, (160 + k * 56) * u, 54 * u, 'rgba(165,24,14,0.9)');
    for (k = 0; k < 8; k++) { glyph(60 * u + (k % 2) * 50 * u, (40 + Math.floor(k / 2) * 120 + (k % 2) * 30) * u, 34 * u, 'rgba(30,22,16,0.8)'); glyph(420 * u + (k % 2) * 46 * u, (50 + Math.floor(k / 2) * 118) * u, 34 * u, 'rgba(30,22,16,0.8)'); }
    // máu khô văng
    for (k = 0; k < 9; k++) {
      var bx = r() * S, by = r() * S, br = (8 + r() * 30) * u;
      for (var q = 0; q < 26; q++) {
        var an = r() * 6.3, ds = Math.pow(r(), 0.6) * br * 2.2;
        x.fillStyle = 'rgba(' + (60 + r() * 30 | 0) + ',6,4,' + (0.5 + r() * 0.4) + ')';
        x.beginPath(); x.arc(bx + Math.cos(an) * ds, by + Math.sin(an) * ds, Math.max(0.6, br * 0.28 * (1 - ds / (br * 2.4)) * (0.4 + r())), 0, 6.3); x.fill();
      }
    }
    return c;
  }
  function paper(S) {
    var c = paperCanvas(S), d = c.getContext('2d').getImageData(0, 0, S, S).data;
    return bake(S, function (u, v, o) {
      var xx = Math.min(S - 1, Math.floor(u * S)), yy = Math.min(S - 1, Math.floor(v * S)), k = (yy * S + xx) * 4;
      var r = d[k] / 255, g = d[k + 1] / 255, b = d[k + 2] / 255;
      o.r = r * r * 0.75; o.g = g * g * 0.75; o.b = b * b * 0.75;
      o.h = (r + g + b) / 3 + pnoise(u * 60, v * 60, 60, 60) * 0.06; o.ro = 0.85;
    }, 1.2);
  }

  A.list = [
    ['wood', wood, 2.2, 0.5], ['stone', stone, 2.6, 0.5], ['mud', mud, 2.0, 0.25],
    ['roof', roof, 2.4, 0.5], ['bark', bark, 2.4, 0.5], ['silk', silk, 1.0, 1], ['paper', null, 1.2, 1]
  ];
  /* sinh 1 texture theo chỉ số — gọi rải qua nhiều frame để thanh tải mượt */
  A.build = function (index, size) {
    var R = H.R, e = A.list[index], S = size, t;
    if (e[0] === 'silk') S = Math.min(256, size);
    if (e[0] === 'paper') { S = Math.min(512, size); t = paper(S); }
    else t = bake(S, e[1], e[2]);
    R.materials[e[0]] = {
      alb: R.texData(S, S, t.alb), nrm: R.texData(S, S, t.nrm), uv: e[3]
    };
  };
})();
