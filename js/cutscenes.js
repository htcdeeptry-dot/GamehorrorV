/* HUYẾT LỆ THÔN — cutscenes.js
   Hệ thống cắt cảnh điện ảnh dựng ngay trong engine: máy quay theo khung hình khoá,
   thanh letterbox, phụ đề có tên nhân vật, sự kiện theo dòng thời gian, hồi ức quá khứ
   (tông sepia + bóng ký ức) và thẻ chương. Kèm phần bố trí vật phẩm / nhân vật của
   cốt truyện mở rộng. Mọi cắt cảnh đều bỏ qua được bằng [Enter]. */
(function () {
  'use strict';
  var H = window.HuyetLeThon, M = H.M, R = H.R, CFG = H.CFG, Geo = H.Geo, Node = H.Node;
  var CS = H.Cutscenes = { active: null, t: 0, actors: [], white: 0 };
  var W, P, AI, A, Pz, UI, FX, memLight, Ch, keyLight;
  var SPK = { 'Minh': 'minh', 'Hà': 'ha', 'Linh': 'linh', 'Tuấn': 'tuan', 'Lý trưởng Khải': 'khai', 'Huyết Thư': 'khai', 'Lệ': 'le', 'Mẹ nàng': 'me', 'Phó Bảy': 'bayHon', 'Bóng áo trắng': 'leHon', 'Lộc': 'loc', 'Morel': 'morel' };
  function face(x, z, tx, tz) { return Math.atan2(tx - x, tz - z); }
  function put(n, x, z, ry, anim, look, y) { return Ch.put(n, x, y === undefined ? W.heightAt(x, z) : y, z, ry, anim, look); }
  var $ = function (id) { return document.getElementById(id); };
  function Y(x, z) { return W.heightAt(x, z); }
  function ease(u) { return u * u * (3 - 2 * u); }

  CS.init = function () {
    W = H.World; P = H.Player; AI = H.AI; A = H.Audio; Pz = H.Puzzles; UI = H.UI; FX = H.FX;
    ['bound', 'reach', 'reach', 'raise', 'raise', 'raise'].forEach(function (p) { var n = H.Models.specter(p); n.visible = false; R.nodes.push(n); CS.actors.push(n); });
    memLight = W.ctx.light([0, -60, 0], [1.0, 0.72, 0.45], 10, 0); memLight.base = 0;
    Ch = H.Chars; Ch.init(); keyLight = W.ctx.light([0, -60, 0], [1.0, 0.9, 0.8], 7.5, 0); keyLight.base = 0;
    var hC = W.props.houseC, hp = hC.F.pt(3.2, -2.2), hc = hC.F.pt(0.6, 0), hy = hC.floorY + 0.06, hl = Math.hypot(hc[0] - hp[0], hc[1] - hp[1]);
    CS.haSpot = { x: hp[0], y: hy, z: hp[1], ry: Math.atan2(hc[0] - hp[0], hc[1] - hp[1]), pos: [hp[0], hy + 1.2, hp[1]], front: [hp[0] + (hc[0] - hp[0]) / hl * 0.7, hp[1] + (hc[1] - hp[1]) / hl * 0.7] };
  };
  /* đặt một bóng ký ức: i = chỉ số diễn viên */
  function act(i, x, y, z, ry, alpha, sc, warm) {
    var n = CS.actors[i]; n.set(x, y, z); n.rot[1] = ry || 0; n.rot[0] = 0; n.scl = [sc || 1, sc || 1, sc || 1]; n.visible = alpha > 0.01; n.mat.tint[3] = alpha;
    n.mat.tint[0] = warm ? 1.0 : 0.45; n.mat.tint[1] = warm ? 0.8 : 0.7; n.mat.tint[2] = warm ? 0.55 : 1.0;
  }
  function hideActors() { if (Ch) Ch.hideAll(); CS.actors.forEach(function (n) { n.visible = false; n.mat.tint[3] = 0; }); memLight.intensity = 0; }
  function light(x, y, z, i, r) { memLight.pos[0] = x; memLight.pos[1] = y; memLight.pos[2] = z; memLight.intensity = i; memLight.radius = r || 10; }
  function sub(speaker, text, dur) {
    $('cineSpeaker').textContent = H.tr(speaker || ''); $('cineText').textContent = H.tr(text); $('cineSub').className = 'show'; CS.subT = dur;
    if (SPK[speaker]) Ch.say(SPK[speaker], dur, text);
    if (H.Voice) H.Voice.say(text);
  }

  /* ===================== ĐỊNH NGHĨA CẮT CẢNH ===================== */
  var D = {};
  D.intro = function () {
    var J = H.Wild.props.jeep, c = CFG.POS.cameraItem, cy = Y(c[0], c[1]) + 0.1, mx = -8.6, mz = 404.4, my = Y(mx, mz);
    var a0 = [34, 431], a1 = [26, 424], G = { x: a0[0], z: a0[1] }, fx = (a1[0] - a0[0]) / 10.63, fz = (a1[1] - a0[1]) / 10.63; // tâm nhóm + hướng đi
    var tx = -12, tz = 390, dx = tx - mx, dz = tz - mz, dl = Math.hypot(dx, dz); dx /= dl; dz /= dl; // Minh nhìn xuống bìa rừng
    function gy(x, z) { return Y(x, z); }
    return {
      shots: [
        // 1. ống kính dài đón đầu: bốn người đội mưa đi về phía máy quay, mưa nén lại thành màn trắng
        { d: 4.2, hand: 0.6, key: [0, 1.5, -3, 0.0], cam: function (u) { var px = 19.2 + u * 0.5 - fz * 2.2, pz = 416.2 + u * 0.4 + fx * 2.2; return { p: [px, gy(px, pz) + 1.25, pz], l: [G.x, gy(G.x, G.z) + 1.35, G.z] }; }, f0: 30, f1: 25 },
        // 2. máy quay bám ngang nhóm người, chậm dần — rồi sét đánh
        { d: 4.5, hand: 1.6, key: [0, 1.0, 0, 0.35], cam: function (u) { var px = G.x - fz * 3.3 + fx * 1.4, pz = G.z + fx * 3.3 + fz * 1.4; return { p: [px, gy(px, pz) + 1.45, pz], l: [G.x + fx * 1.2, gy(G.x, G.z) + 1.3, G.z + fz * 1.2] }; }, f0: 46, f1: 42 },
        // 3. sau tia sét: cần cẩu hạ dần từ trên lối đường đèo xuống xác xe, đèn pha còn chập chờn
        { d: 7.5, hand: 0.4, dof: 0.5, key: [0, 2, 0, 0.0], p0: [-4.2, my + 8, 415.5], p1: [J.x + 4.4, J.y + 1.5, J.z + 3.6], l0: [J.x + 0.6, J.y, J.z + 0.5], l1: [J.x - 0.2, J.y + 0.75, J.z], f0: 40, f1: 44 },
        // 4. góc thấp sát mặt đất: Minh gượng dậy trong bùn
        { d: 7.2, hand: 1.1, roll: -0.03, key: [1.2, 0.8, 0.6, 0.55], p0: [mx + 2.9, my + 0.4, mz - 1.9], p1: [mx + 2.2, my + 0.55, mz - 1.4], l0: [mx, my + 0.95, mz], l1: [mx, my + 1.45, mz], f0: 42, f1: 36 },
        // 5. qua vai Minh: bìa rừng tối, biển gỗ chỉ lối — lấy nét xa
        { d: 6.8, hand: 1.0, key: [-0.6, 0.6, 0.3, 0.42], p0: [mx - dx * 1.25 + dz * 0.5, my + 1.72, mz - dz * 1.25 - dx * 0.5], p1: [mx - dx * 0.95 + dz * 0.42, my + 1.68, mz - dz * 0.95 - dx * 0.42], l0: [mx + dx * 12, my + 1.2, mz + dz * 12], l1: [mx + dx * 14, my + 1.0, mz + dz * 14], focus: 13, dof: 1.2, f0: 44, f1: 38 },
        // 6. trượt sát mặt đất tới chiếc máy ảnh nằm trong bùn
        { d: 6, hand: 0.5, key: [0.5, 0.7, 0.4, 0.5], dof: 1.4, p0: [c[0] + 1.9, cy + 0.32, c[1] - 1.8], p1: [c[0] + 0.85, cy + 0.22, c[1] - 0.75], l0: [c[0], cy + 0.03, c[1]], l1: [c[0], cy + 0.02, c[1]], f0: 36, f1: 30 }
      ],
      subs: [[0.7, '', 'Ba giờ trước khi vạt núi sạt xuống.', 2.8], [3.6, 'Hà', 'Chị Linh ơi, bản đồ có vẽ lối này đâu?', 2.6], [6.3, 'Linh', 'Cứ đi đi. Sắp tới rồi.', 2.4],
        [9.8, '', 'Mùa thu năm 1994. Bão số 6 cuốn mất con đường sau lưng chúng tôi.', 5],
        [16.6, 'Minh', 'Linh... Tuấn... Hà... mọi người đâu cả rồi?', 4.4],
        [23.6, 'Minh', 'Dấu chân ba người, đi xuống rừng. Sao lại bỏ mình lại?', 5],
        [30.2, 'Minh', 'Máy ảnh của ông nội... nó văng đâu quanh xe.', 4.5]],
      ev: [[0.2, function () { A.tension = 0.25; }], [8.7, function () { CS.white = 1; W.strike(true); Ch.hideAll(); memLight.intensity = 0; P.shake = 0.08; }],
        [12.4, function () { W.strike(false); }], [23, function () { W.strike(false); }]],
      tick: function (t, dt) {
        if (t < 8.7) { // bốn người trên đường đèo, đèn pin của Linh soi lối
          var u = M.clamp(t / 8.7, 0.001, 0.999), lk = [M.lerp(a0[0], a1[0], u) - 6, 1.5, M.lerp(a0[1], a1[1], u) - 5];
          G.x = M.lerp(a0[0], a1[0], u); G.z = M.lerp(a0[1], a1[1], u);
          function wl(n, ox, oz, look) { Ch.walkLine(n, [a0[0] + ox, a0[1] + oz], [a1[0] + ox, a1[1] + oz], u, dt, look); }
          wl('linh', -1.6, -1.8); wl('minh', -0.4, -0.2, lk); wl('tuan', 0.6, 0.9); wl('ha', 1.5, 2.2, lk);
          light(G.x + fx * 2.6, gy(G.x, G.z) + 1.9, G.z + fz * 2.6, 1.5 + Math.sin(t * 13) * 0.05, 8);
        } else if (t > 16 && t < 30.2) { put('minh', mx, mz, face(mx, mz, tx, tz), t < 19.6 ? 'cower' : 'idle', [tx, my + 1.0, tz]); memLight.intensity = 0; }
        else Ch.hide('minh');
      },
      card: ['MỞ ĐẦU', 'Đèo Sạt']
    };
  };
  /* ---------- Rừng Cấm: bóng áo trắng ở Miếu Sơn Thần ---------- */
  D.shrine = function () {
    var S = H.Wild.props.shrine, lx = -39.4, lz = 350.4, ly = Y(lx, lz), mx = -31.6, mz = 356.4, my = Y(mx, mz);
    return {
      shots: [
        { d: 6.6, p0: [mx + 1.4, my + 1.6, mz + 1.6], p1: [mx + 0.7, my + 1.6, mz + 0.9], l0: [S.x, S.y + 1.4, S.z], l1: [S.x - 0.6, S.y + 1.45, S.z - 2.2], f0: 55, f1: 48 },
        { d: 8, p0: [lx + 3.2, ly + 1.55, lz + 2.2], p1: [lx + 2.4, ly + 1.55, lz + 1.5], l0: [lx, ly + 1.45, lz], l1: [lx, ly + 1.5, lz], f0: 46, f1: 34 },
        { d: 6, p0: [mx + 0.6, my + 1.6, mz + 0.6], p1: [mx + 0.3, my + 1.6, mz + 0.2], l0: [lx, ly + 1.4, lz], l1: [lx + 14, ly + 2.5, lz - 12], f0: 52, f1: 58 }
      ],
      subs: [[0.6, 'Minh', 'Miếu Sơn Thần... ai còn thắp nến ở đây?', 3.6], [4.6, 'Minh', '...Linh? Hà?', 2.2], [7.2, 'Bóng áo trắng', 'Đừng theo ánh đèn đỏ.', 3.2],
        [10.8, 'Bóng áo trắng', 'Qua sông... trước khi trăng đứng đỉnh đầu.', 4], [15.4, 'Minh', 'Áo trắng... Hà tả một người áo đỏ cơ mà.', 3.4]],
      ev: [[6.5, function () { A.weep([lx, ly + 1.5, lz], 4, 0.35); light(lx, ly + 2.2, lz, 1.2, 6); }], [18.6, function () { CS.white = 0.4; A.glitch(null); Ch.hide('leHon'); memLight.intensity = 0; }]],
      tick: function (t) {
        put('minh', mx, mz, face(mx, mz, t > 6.5 ? lx : S.x, t > 6.5 ? lz : S.z), t > 6.5 && t < 9 ? 'recoil' : 'idle', [t > 6.5 ? lx : S.x, ly + 1.5, t > 6.5 ? lz : S.z]);
        if (t > 6.5 && t < 18.6) Ch.put('leHon', lx, ly, lz, t > 14 ? face(lx, lz, 20, 290) : face(lx, lz, mx, mz), t > 14 ? 'point' : 'idle', t > 14 ? [20, ly + 2, 290] : [mx, my + 1.6, mz]);
      },
      tension: 0.35, card: ['CHƯƠNG I', 'Rừng Cấm']
    };
  };
  /* ---------- tấm kính ảnh 1934: Lộc bảo Morel chạy ---------- */
  D.camp1934 = function () {
    var cx = 19.5, cz = 290.5, cy = Y(cx, cz), ex = 33, ez = 282.5, ey = Y(ex, ez), dr = H.Wild.props.darkroom;
    return {
      past: true,
      shots: [
        { d: 8.2, p0: [cx - 3.4, cy + 1.5, cz + 4.2], p1: [cx - 2.4, cy + 1.4, cz + 3.1], l0: [cx, cy + 1.3, cz], l1: [cx + 0.5, cy + 1.3, cz - 0.3], f0: 52, f1: 44 },
        { d: 9.6, p0: [cx - 1.6, cy + 1.25, cz + 2.4], p1: [cx - 1.1, cy + 1.3, cz + 1.6], l0: [ex, ey + 1, ez], l1: [ex - 1, ey + 0.9, ez + 0.5], f0: 48, f1: 40 },
        { d: 5.8, p0: [dr.x - 3.0, dr.y + 1.6, dr.z + 2.6], p1: [dr.x - 2.2, dr.y + 1.5, dr.z + 1.8], l0: [dr.x, dr.y + 0.9, dr.z], l1: [dr.x, dr.y + 0.9, dr.z], f0: 50, f1: 42, present: true, key: [0.8, 1.2, 0.6, 1.3] }
      ],
      subs: [[0.6, '', 'Trạm đo đạc bên sông Âm, đêm 23 tháng 9 năm 1934.', 3.8], [4.8, 'Morel', 'Nó tới rồi! Lộc, đứng sau lưng tôi!', 3.2], [8.4, 'Lộc', 'Courez! Chạy đi, ông ơi, chạy đi!', 3.4],
        [12.2, '', 'Người lính Pháp quay lưng bỏ chạy. Thứ áo đỏ lướt qua cậu bé như không hề thấy cậu.', 5.4], [18.4, 'Minh', 'Ông nội... ông đã bảo ông ấy chạy.', 3.6]],
      ev: [[0, function () { light(cx, cy + 2.4, cz, 1.5, 10); A.bell(null, 110); }], [11.4, function () { CS.white = 0.8; A.click(0.9); AI.puppet(ex + 1.5, ez - 1.5, 'hunt', [cx, cz], 0.95); }], [17.6, function () { hideActors(); AI.puppetEnd(12); CS.white = 0.4; A.sting(); }]],
      tick: function (t, dt) {
        if (t >= 17.6) return;
        Ch.put('loc', cx, cy, cz, face(cx, cz, cx - 3, cz + 4), 'point', [cx - 3, cy + 1.4, cz + 4]);
        if (t < 8.6) Ch.put('morel', cx + 0.9, cy, cz - 0.4, face(cx + 0.9, cz - 0.4, ex, ez), t > 4.8 ? 'recoil' : 'idle', [ex, ey + 1, ez]);
        else Ch.walkLine('morel', [cx + 0.9, cz - 0.4], [ex - 0.5, ez + 0.6], M.clamp((t - 8.6) / 6, 0.001, 0.999), dt, [ex, ey + 1, ez]);
        if (t > 11.4) AI.pos[0] += (cx + 3 - AI.pos[0]) * dt * 0.25;
      },
      tension: 0.7
    };
  };
  /* ---------- sông Âm: bóng áo đỏ bên kia cầu đứt ---------- */
  D.bridge = function () {
    var B = H.Wild.props.bridge, y = B.y, rx = 10.6, rz = 213.2, ry = Y(rx, rz);
    return {
      shots: [
        { d: 6, p0: [11.8, y + 1.75, B.z + 3.6], p1: [11.1, y + 1.65, B.z + 2.2], l0: [10, y + 0.4, B.z - 6], l1: [10, y + 0.1, B.z - 9], f0: 58, f1: 50 },
        { d: 8, p0: [9.3, y + 1.65, B.z + 0.4], p1: [9.6, y + 1.6, B.z - 0.3], l0: [rx, ry + 1.5, rz], l1: [rx, ry + 1.5, rz], f0: 44, f1: 28 },
        { d: 5.6, p0: [12.4, y + 1.7, B.z + 2.2], p1: [13.6, y + 1.7, B.z + 2.8], l0: [40, y, B.z - 8], l1: [72, y, B.z - 14], f0: 55, f1: 60 }
      ],
      subs: [[0.5, 'Minh', 'Cầu treo đứt rồi. Cả hai đầu.', 3], [6.6, 'Minh', 'Bên kia sông... có người đứng.', 3], [10.2, 'Minh', 'Áo đỏ. Tóc dài chấm đất. Đúng như Hà tả.', 3.8], [14.6, 'Minh', 'Phải xuôi bờ sông. Có bến đò thì phải có thuyền.', 4]],
      ev: [[6, function () { AI.puppet(rx, rz, 'stalk', [10, B.z], 0.95); A.weep([rx, ry + 1.5, rz], 5, 0.6); light(rx + 0.8, ry + 2.6, rz - 1.6, 1.6, 7); }], [13.8, function () { W.strike(true); CS.white = 0.35; AI.puppetEnd(10); memLight.intensity = 0; }]],
      tick: function (t) { if (t < 14) put('minh', 10.2, B.z + 1.1, Math.PI, 'idle', [rx, ry + 1.5, rz]); else Ch.hide('minh'); },
      tension: 0.6, card: ['CHƯƠNG II', 'Sông Âm']
    };
  };
  /* ---------- hồi ức Bến Dưới 1874: xác phu thuyền bị thả xuống sông ---------- */
  D.wharf = function () {
    var dy = 0.38, kx = 81.9, kz = 232.6;
    return {
      past: true,
      shots: [
        { d: 10, p0: [86.2, 1.9, 240.5], p1: [85.4, 1.75, 238.6], l0: [82, 0.9, 228.5], l1: [82, 0.8, 227.5], f0: 52, f1: 44 },
        { d: 10.4, p0: [80.2, 1.4, 224.0], p1: [80.6, 1.45, 224.9], l0: [kx, 1.6, kz], l1: [kx, 1.65, kz], f0: 46, f1: 38 },
        { d: 4.6, p0: [85.8, 1.8, 239.4], p1: [85.2, 1.7, 238.2], l0: [72, -0.5, 227.5], l1: [71, -0.8, 227.5], f0: 50, f1: 44, present: true }
      ],
      subs: [[0.6, '', 'Bến Dưới, tháng Năm năm Giáp Tuất — 1874.', 3.6], [4.8, 'Lý trưởng Khải', 'Buộc đá vào chân. Sông sâu, nước chảy, trôi đi đâu thì đi.', 4.6],
        [10, 'Phó Bảy', 'Bẩm quan... nước sông này cả làng gánh về uống.', 4], [14.6, 'Lý trưởng Khải', 'Thì bảo chúng nó uống nước giếng. Đứa nào hé răng, ta cho xuống theo.', 4.8],
        [20.6, 'Minh', 'Dịch không đến từ cái giếng. Nó đến từ chính cái bến này.', 4.2]],
      ev: [[0, function () { light(82, 2.6, 229, 2.4, 11); A.bell(null, 98); }], [20.4, function () { hideActors(); CS.white = 0.35; }]],
      tick: function () {
        if (CS.t >= 20.4) return;
        Ch.put('khai', kx, dy, kz, Math.PI, 'point', [81.9, 0.6, 226.6]);
        Ch.put('bay', 81.2, dy, 227.6, face(81.2, 227.6, 81.9, 226.4), 'idle', [kx, 1.6, kz]);
        Ch.put('tran', 82.7, dy, 227.3, face(82.7, 227.3, 81.9, 226.4), 'idle', [81.9, 0.5, 226.4]);
        act(0, 81.9, dy + 0.15, 226.4, 0.3, 0.55, 1, true); CS.actors[0].rot[0] = 1.5;
      },
      tension: 0.5
    };
  };
  /* ---------- đò ngang: tấm ảnh hai người đàn bà ---------- */
  D.ferry = function () {
    var F = H.Wild.props.ferry, fy = F.a[1] + 0.18, dz = F.b[2] - F.a[2], dx = F.b[0] - F.a[0], dl = Math.hypot(dx, dz), fx = dx / dl, fz = dz / dl;
    function rp() { return [F.node.pos[0], F.node.pos[2]]; }
    return {
      shots: [
        { d: 6, p0: [84.6, 1.3, 228.2], p1: [84.0, 1.2, 227.0], l0: [81.6, -0.6, 221.8], l1: [81.3, -0.6, 220.6], f0: 50, f1: 44 },
        { d: 7, rel: 'back', f0: 52, f1: 46 },
        { d: 5.4, rel: 'front', f0: 46, f1: 40 },
        { d: 5.4, p0: [78.4, 1.5, 207.2], p1: [78.9, 1.4, 208.2], l0: [80.8, -0.6, 216], l1: [80.6, -0.7, 215], f0: 50, f1: 44 }
      ],
      subs: [[0.6, '', 'Sợi cáp rên lên từng hồi. Con đò trôi vào màn sương.', 4], [7.6, 'Minh', 'Có ai... đứng trên mặt nước.', 3], [13.5, 'Minh', 'Áo trắng phía trước... vậy cái thứ đang thở sau gáy mình là—', 4],
        [19, '', 'Tấm ảnh hiện dần trong đầu Minh: hai người đàn bà. Một đứng chắn trước mũi đò. Một đứng sát sau lưng anh.', 5]],
      ev: [[0.3, function () { H.Wild.ferryBusy = true; A.creak([82, 1, 225], 0.6, 2); }], [11.6, function () { A.click(0.9); CS.white = 0.85; var p = rp(); AI.puppet(p[0] - fx * 1.1, p[1] - fz * 1.1, 'stalk', [p[0], p[1]], 0.95); }],
        [17.6, function () { W.strike(true); CS.white = 0.6; AI.puppetEnd(20); Ch.hide('leHon'); }]],
      tick: function (t, dt) {
        H.Wild.setFerry(M.clamp((t - 1) / 17, 0, 1) * M.clamp((t - 1) / 17, 0, 1) * (3 - 2 * M.clamp((t - 1) / 17, 0, 1)));
        var p = rp(); F.node.pos[1] = F.a[1] + Math.sin(t * 1.3) * 0.04;
        if (t < 18.4) Ch.put('minh', p[0], fy, p[1], Math.atan2(fx, fz), t > 10.6 && t < 13 ? 'point' : 'idle', t > 6.5 ? [p[0] + fx * 6, fy + 1.4, p[1] + fz * 6] : null); else Ch.hide('minh');
        if (t > 7 && t < 17.6) Ch.put('leHon', p[0] + fx * 5.5, F.a[1] - 0.05, p[1] + fz * 5.5, Math.atan2(-fx, -fz), 'idle', [p[0], fy + 1.5, p[1]]);
        if (t > 11.6 && t < 17.6) { AI.pos[0] = p[0] - fx * 1.0; AI.pos[2] = p[1] - fz * 1.0; AI.pos[1] = fy - 0.1; }
      },
      cam: function (sh, u) {
        var p = rp();
        if (sh.rel === 'back') return { p: [p[0] - fx * 2.2 + fz * 1.5, fy + 1.7, p[1] - fz * 2.2 - fx * 1.5], l: [p[0] + fx * 7, fy + 0.9, p[1] + fz * 7] };
        if (sh.rel === 'front') return { p: [p[0] + fx * 2.1 - fz * 1.1, fy + 1.55, p[1] + fz * 2.1 + fx * 1.1], l: [p[0] - fx * 0.6, fy + 1.45, p[1] - fz * 0.6] };
        return null;
      },
      end: function () { H.Wild.ferryBusy = false; H.Wild.setFerry(1); },
      tension: 0.75, card: ['CHƯƠNG III', 'Lối Mòn Rừng Tre']
    };
  };
  D.gate = function () {
    return {
      shots: [
        { d: 4.6, p0: [0.9, Y(0.9, 45) + 0.9, 45], p1: [0.3, Y(0.3, 46.5) + 1.3, 46.5], l0: [0, 2.2, 50], l1: [0, 2.4, 50], f0: 62, f1: 58 },
        { d: 4.2, p0: [1.5, 2.0, 53.6], p1: [1.0, 1.9, 52.2], l0: [0, 1.6, 32], l1: [0, 1.6, 27], f0: 55, f1: 46 },
        { d: 5, p0: [0.5, 1.6, 37], p1: [0.2, 1.65, 30.6], l0: [0, 1.75, 27], l1: [0, 1.85, 27], f0: 46, f1: 38 }
      ],
      subs: [[0.5, '', 'Sợi xích tự tuột khỏi cổng, như thể chỉ chờ đúng con số ấy.', 3.8], [5.2, 'Minh', '...Hà? Hà, phải em không?', 3], [9.2, 'Hà (vọng lại)', 'Đừng tắt đèn, Minh ạ... chị ấy đi theo tiếng chân...', 4.2]],
      ev: [
        [4.4, function () { AI.puppet(0, 27, 'stalk', [0, 50], 0.95); A.weep([0, 1.6, 27], 5, 0.7); W.lanterns.forEach(function (L) { if (Math.hypot(L.base[0], L.base[2] - 30) < 22) L.blueT = H.Main.time + 9; }); }],
        [13.2, function () { A.glitch(null); A.sting(); CS.white = 0.5; AI.puppetEnd(8); }]
      ],
      tick: function (t) { if (t < 8.8) put('minh', 0.5, 52.4, Math.PI, t > 5.4 ? 'recoil' : 'idle', [0, 1.7, 27]); else Ch.hide('minh'); },
      tension: 0.6, card: ['CHƯƠNG IV', 'Làng Âm Linh']
    };
  };
  D.tuan = function () {
    var w = W.props.well;
    return {
      shots: [
        { d: 5.2, p0: [w.x + 3.4, w.y + 0.9, w.z + 2.8], p1: [w.x + 2.8, w.y + 1.1, w.z + 2.2], l0: [w.x + 1.7, w.y + 0.3, w.z + 1.0], l1: [w.x + 1.6, w.y + 0.5, w.z + 0.9], f0: 52, f1: 46 },
        { d: 9.5, p0: [w.x - 0.25, w.y + 2.45, w.z + 0.9], p1: [w.x - 0.1, w.y + 2.15, w.z + 0.55], l0: [w.x, w.y - 4, w.z], l1: [w.x, w.y - 5, w.z], f0: 60, f1: 48 }
      ],
      subs: [[0.6, 'Minh', 'Ba lô của Tuấn. Đồng hồ đeo tay dừng ở 0 giờ 49.', 4], [5.4, 'Minh', 'Dây thừng thả xuống giếng... TUẤN!', 3],
        [9, 'Tuấn (từ đáy giếng)', '...đừng kéo tao lên vội... dưới này có hai người, Minh ạ... họ nắm tay nhau...', 5.4]],
      ev: [[8.4, function () { A.weep([w.x, w.y - 4, w.z], 4, 0.5); }]],
      tick: function (t) { if (t < 5.2) put('minh', w.x + 2.25, w.z + 1.75, face(w.x + 2.25, w.z + 1.75, w.x + 1.7, w.z + 1.05), 'crouch', [w.x + 1.7, w.y + 0.3, w.z + 1.0]); else Ch.hide('minh'); },
      tension: 0.5
    };
  };
  D.well = function () {
    var w = W.props.well;
    return {
      shots: [
        { d: 4, p0: [w.x - 0.3, w.y + 2.4, w.z + 0.6], p1: [w.x - 0.15, w.y + 2.0, w.z + 0.35], l0: [w.x, w.y - 5, w.z], l1: [w.x, w.y - 4, w.z], f0: 58, f1: 46 },
        { d: 6.6, p0: [w.x + 3.9, w.y + 1.45, w.z + 3.2], p1: [w.x + 3.2, w.y + 1.55, w.z + 2.6], l0: [w.x, w.y + 1.2, w.z], l1: [w.x, w.y + 1.9, w.z], f0: 52, f1: 40 }
      ],
      subs: [[0.5, 'Minh', 'Gương đồng... và một chiếc chìa khoá.', 3], [4.4, '', 'Sợi dây tời bỗng căng lên. Có thứ gì đó đang trèo theo.', 3.8], [8.6, 'Minh', 'CHẠY!', 1.8]],
      ev: [[3.7, function () { W.strike(true); AI.puppet(w.x, w.z, 'exo', [w.x + 4, w.z + 3], 1.0); }], [7.4, function () { A.scream([w.x, w.y + 1.5, w.z], false); H.Player.shake = 0.05; }]],
      tick: function (t) { if (t > 3.7) AI.pos[1] = w.y + M.lerp(-2.7, -0.15, ease(M.clamp((t - 3.7) / 5.5, 0, 1)));
        if (t > 4) put('minh', w.x + 2.1, w.z + 1.75, face(w.x + 2.1, w.z + 1.75, w.x, w.z), t > 5.2 ? 'recoil' : 'idle', [w.x, w.y + 1.6, w.z]); },
      end: function () { AI.puppetEnd(0); },
      tension: 1
    };
  };
  function memory(k, cam0, cam1, lines, digit) {
    return function () {
      var b = W.props.manor, s = Pz.scenes[k], fy = b.floorY, a = b.F.pt(cam0[0], cam0[1]), c = b.F.pt(cam1[0], cam1[1]), t = 0.6, subs = [];
      lines.forEach(function (l) { var dd = Math.max(l[2], (H.Voice ? H.Voice.dur(l[1]) : 0) + 0.3); subs.push([t, l[0], l[1], dd]); t += dd + 0.5; });
      return {
        past: true,
        shots: [{ d: t + 0.4, p0: [a[0], fy + 1.55, a[1]], p1: [c[0], fy + 1.35, c[1]], l0: [s.pos[0], fy + 1.2, s.pos[2]], l1: [s.pos[0], fy + 1.35, s.pos[2]], f0: 56, f1: 44 }],
        subs: subs,
        ev: [[0, function () { light(s.pos[0], fy + 2.4, s.pos[2], 2.6, 9); A.bell(null, 110); }]],
        tick: function (tt) {
          s.nodes.forEach(function (n) { n.visible = false; }); s.digit.visible = false;
          var ce = [[0, 0.4], [-5.6, -0.4], [5.6, 0.2]][k], a2 = b.F.a, yy = fy + 0.06;
          function at(n, ox, oz, anim, tgt, bind) {
            var q = b.F.pt(ce[0] + ox, ce[1] + oz), tg = tgt ? b.F.pt(ce[0] + tgt[0], ce[1] + tgt[1]) : null;
            var c2 = Ch.put(n, q[0], yy, q[1], tg ? face(q[0], q[1], tg[0], tg[1]) : a2, anim, tg ? [tg[0], yy + (tgt[2] || 1.3), tg[1]] : null); c2.bind.visible = !!bind; return c2;
          }
          if (k === 0) { at('le', 0, 0, 'bound', null, true); at('khai', 1.3, -0.5, 'point', [0, 0, 1.0]); at('bay', -1.25, -0.2, 'idle', [0, 0, 1.0]); at('tran', -0.5, -1.35, 'idle', [0, 0, 1.0]); }
          else if (k === 1) { at('me', 0, 0, tt > 4 ? 'plead' : 'kneel', [0, 3, 1.6]); at('cha', 0.95, -0.4, 'bound', null, true); at('bay', -1.3, -0.7, 'idle', [-1.0, 0.3, 0.2]); at('tran', 1.9, -1.0, 'point', [0, 0, 1.0]); }
          else { at('le', 0, 0, 'boundStand', null, true); at('khai', 1.25, -0.4, 'point', [0, 0, 1.4]); at('tran', -1.2, -0.3, 'idle', [0, 0, 1.4]); at('bay', -0.4, -1.4, 'idle', [0, -0.6, 0.3]); }
        },
        tension: 0.55
      };
    };
  }
  D.memory0 = memory(0, [-2.4, 3.7], [2.0, 3.9], [['', 'Rằm tháng Bảy, năm Giáp Tuất — 1874. Chính đường nhà Lý trưởng.', 4], ['Lý trưởng Khải', 'Trói nó lại. Bảy thước lụa điều, cho nó khỏi hoá về.', 4.4], ['Lệ', 'Con sắc thuốc cho con các người... sao không ai nhìn con?', 4.4], ['Minh', 'Trên vách hiện một con số: 3.', 2.6]]);
  D.memory1 = memory(1, [-3.9, 3.5], [-7.0, 3.2], [['', 'Cũng đêm ấy, họ dồn cha mẹ nàng vào trong Đình.', 3.8], ['Mẹ nàng', 'Lệ ơi! Đừng nhận! Con không làm gì sai cả!', 4], ['', 'Người gác đình cài then từ bên ngoài. Tay ông ta run tới mức phải cài hai lần.', 5], ['Minh', 'Tro xếp thành con số 7.', 2.6]]);
  D.memory2 = memory(2, [3.9, 3.5], [7.0, 3.0], [['', 'Họ thả nàng xuống Giếng Cổ lúc 0 giờ 49.', 3.8], ['Lý trưởng Khải', 'Lấp đá lại. Từ nay cấm nhắc tên hai đứa nó.', 4.2], ['Minh', '“Hai đứa”...? Biên bản chỉ ghi có một người.', 4], ['Minh', 'Nước nhỏ giọt thành con số 5.', 2.6]]);
  D.scroll = function () {
    var b = W.props.manor, fy = b.floorY, ch = b.F.pt(-0.6, -3.3), a = b.F.pt(2.0, 2.8), c = b.F.pt(0.5, 0.0), s0 = b.F.pt(2.2, -1.6), s1 = b.F.pt(2.3, -2.9);
    return {
      past: true,
      shots: [
        { d: 18.5, p0: [a[0], fy + 1.6, a[1]], p1: [c[0], fy + 1.5, c[1]], l0: [ch[0], fy + 1.4, ch[1]], l1: [ch[0], fy + 1.5, ch[1]], f0: 56, f1: 42 },
        { d: 16.5, p0: [s0[0], fy + 1.5, s0[1]], p1: [s1[0], fy + 1.2, s1[1]], l0: [b.safe.pos[0], b.safe.pos[1], b.safe.pos[2]], l1: [b.safe.pos[0], b.safe.pos[1], b.safe.pos[2]], f0: 50, f1: 40, present: true }
      ],
      subs: [[0.6, 'Huyết Thư', 'Ta, Đoàn Văn Khải, viết bằng máu mình vì mực không chịu ăn giấy nữa.', 5],
        [6.2, 'Huyết Thư', 'Thằng Khang con ta không chết vì dịch. Nó định lên huyện tố cha nó bán thóc phát chẩn.', 5.6],
        [12.4, 'Huyết Thư', 'Ta chỉ sai tuần đinh giam nó. Chúng nặng tay. Trước lúc trời sáng, ta thả con ta xuống giếng.', 5.6],
        [19, 'Huyết Thư', 'Rồi ta cần một con yêu nữ, để cả làng khỏi hỏi vì sao nước giếng đỏ.', 5],
        [24.8, 'Minh', 'Người làm chứng điểm chỉ: Phó Văn Bảy... Trần Sửu.', 4], [29.4, 'Minh', 'Họ Đoàn. Họ Phó. Họ Trần. ...Linh. Mình. Tuấn.', 5]],
      ev: [[0, function () { light(ch[0], fy + 2.2, ch[1] , 2.4, 8); }], [18.4, function () { hideActors(); CS.white = 0.4; A.sting(); }]],
      tick: function (t) { if (t < 18.4) Ch.put('khai', ch[0], fy + 0.06, ch[1], b.F.a + Math.PI, 'write'); else { var mp = b.F.pt(1.2, -3.5); Ch.put('minh', mp[0], fy + 0.06, mp[1], face(mp[0], mp[1], b.safe.pos[0], b.safe.pos[2]), 'crouch', b.safe.pos); } },
      tension: 0.6, card: ['CHƯƠNG VI', 'Nghĩa Địa Hoang']
    };
  };
  D.ha = function () {
    var wd = CS.haSpot, dx = wd.front[0] - wd.pos[0], dz = wd.front[1] - wd.pos[2], l = Math.hypot(dx, dz) || 1, y = wd.pos[1] - 1.2; dx /= l; dz /= l;
    return {
      shots: [
        { d: 12.5, p0: [wd.pos[0] + dx * 3.4 - dz * 0.8, y + 1.4, wd.pos[2] + dz * 3.4 + dx * 0.8], p1: [wd.pos[0] + dx * 2.2 - dz * 0.3, y + 1.35, wd.pos[2] + dz * 2.2 + dx * 0.3], l0: [wd.pos[0], y + 1.1, wd.pos[2]], l1: [wd.pos[0], y + 1.3, wd.pos[2]], f0: 50, f1: 40, key: [0.7, 0.6, 0.4, 0.75] },
        { d: 15, p0: [wd.pos[0] + dx * 1.7 + dz * 0.9, y + 1.2, wd.pos[2] + dz * 1.7 - dx * 0.9], p1: [wd.pos[0] + dx * 1.45 + dz * 0.55, y + 1.3, wd.pos[2] + dz * 1.45 - dx * 0.55], l0: [wd.pos[0], y + 1.45, wd.pos[2]], l1: [wd.pos[0], y + 1.5, wd.pos[2]], f0: 40, f1: 32, key: [0.6, 0.5, 0.3, 0.8] }
      ],
      subs: [[0.6, 'Hà', 'Đừng lại gần! ...Minh? Là anh thật à?', 3.6], [4.8, 'Hà', 'Chị ấy không hại em. Chị ấy đứng ngoài cửa suốt, mỗi lần mấy cái bóng cầm đuốc đi qua.', 6],
        [11.4, 'Hà', 'Chị ấy chỉ đuổi anh, anh Tuấn... và chị Linh. Sao lại đúng ba người?', 5],
        [17, 'Hà', 'Em không ra đâu. Cầm lấy cuộn băng này — của chị Linh. Chị ấy dặn đừng cho anh nghe trước khi tới Đình.', 6],
        [23.6, 'Minh', '...Em nghe rồi, phải không Hà?', 3]],
      ev: [[0.1, function () { A.creak([wd.pos[0], y + 1, wd.pos[2]], 0.5, 1.2); }], [16.6, function () { A.creak([wd.pos[0], y + 1, wd.pos[2]], 0.35, 0.8); }]],
      tick: function () { light(wd.pos[0] + dx * 1.4, y + 1.6, wd.pos[2] + dz * 1.4, 1.5, 5);
        var mx = wd.pos[0] + dx * 1.2 - dz * 0.95, mz = wd.pos[2] + dz * 1.2 + dx * 0.95;
        Ch.put('ha', wd.x, wd.y, wd.z, wd.ry, 'cower', [mx, y + 1.0, mz]); Ch.put('minh', mx, y, mz, face(mx, mz, wd.x, wd.z), 'crouch', [wd.x, y + 0.7, wd.z]); },
      tension: 0.3
    };
  };
  D.grave = function () {
    var g = CFG.POS.graveGate, x = g[0] - 3.2, z = g[1], y = W.groundAt(x, z);
    return {
      shots: [
        { d: 13, p0: [x - 3.4, y + 1.7, z + 3.0], p1: [x - 2.2, y + 1.55, z + 2.0], l0: [x, y + 1.4, z], l1: [x, y + 1.5, z], f0: 54, f1: 44 },
        { d: 15.5, p0: [x + 1.6, y + 1.3, z - 2.2], p1: [x + 1.1, y + 1.45, z - 1.5], l0: [x, y + 1.5, z], l1: [x, y + 1.55, z], f0: 44, f1: 36 }
      ],
      subs: [[0.8, 'Phó Bảy', 'Cậu có đôi mắt của thằng Lộc cháu tôi.', 3.8],
        [5.2, 'Phó Bảy', 'Sáu mươi năm trước nó dẫn đường cho đoàn đo đạc Tây lên đây. Chỉ mình nó ra được — vì nó dám chụp thẳng mặt nàng.', 7],
        [12.8, 'Phó Bảy', 'Cái máy ảnh ấy giờ đeo trên cổ cậu. Làng không gọi bừa đâu. Làng gọi con cháu về trả nợ.', 6],
        [19.4, 'Phó Bảy', 'Còn một thứ tôi không dám chôn: nhẫn bạc của cậu Khang. Tôi giấu ở miếu nhỏ dưới gốc đa. Soi gương mà tìm.', 6.4],
        [26.2, 'Phó Bảy', 'Gọi đúng tên thì nàng đi. Nhưng dưới giếng có hai người.', 4]],
      ev: [[0.2, function () { A.bell(null, 98); }]],
      tick: function (t) { var mx = x - 1.5, mz = z + 1.25; light(x - 0.6, y + 2.2, z + 0.6, 1.3, 6);
        if (t > 0.5 && t < 30) Ch.put('bayHon', x, y, z, face(x, z, mx, mz), 'idle', [mx, y + 1.6, mz]); else Ch.hide('bayHon');
        put('minh', mx, mz, face(mx, mz, x, z), 'idle', [x, y + 1.55, z]); },
      tension: 0.45, card: ['CHƯƠNG VII', 'Đình Làng Cổ']
    };
  };
  D.temple = function () {
    var b = W.props.temple, fy = b.floorY, r = b.ritual, dz = b.door.pos[2];
    return {
      past: true,
      shots: [
        { d: 11, p0: [-5.2, fy + 1.3, dz - 8.6], p1: [-3.4, fy + 1.5, dz - 6.0], l0: [0, fy + 1.5, dz - 1.4], l1: [0, fy + 1.7, dz - 1.2], f0: 58, f1: 48 },
        { d: 9, p0: [0.4, fy + 3.3, dz - 10.6], p1: [0.2, fy + 2.3, dz - 8.4], l0: [0, fy + 1.4, dz - 1], l1: [0, fy + 1.5, dz - 1], f0: 50, f1: 40 },
        { d: 6, p0: [0.6, fy + 1.6, dz + 4.4], p1: [0.3, fy + 1.6, dz + 2.6], l0: [0, fy + 1.6, dz - 6], l1: [0, fy + 1.4, dz - 8], f0: 52, f1: 46, present: true }
      ],
      subs: [[0.6, '', 'Đình làng, đêm rằm tháng Bảy. Then cửa đã cài — từ bên ngoài.', 4.4],
        [5.6, 'Mẹ nàng', 'Lệ ơi... mẹ không oán ai. Mẹ chỉ xin một người — một người thôi — nhớ lấy tên con.', 6],
        [12.4, '', 'Bà không nguyền rủa ai cả. Lời nguyền là của những kẻ đứng ngoài, nghe hết, và không rút then.', 6.4],
        [20.6, 'Linh (trong Đình)', 'Minh... đừng vào. Chính em đưa mọi người tới đây.', 4.6]],
      ev: [[0, function () { A.fire(19); }], [3, function () { A.weep([0, fy + 1.5, dz - 1.5], 6, 0.8); }], [19.9, function () { hideActors(); b.fireLight.intensity = 0; CS.white = 0.5; A.slam(null); }]],
      tick: function (t, dt) {
        if (t >= 19.9) return;
        var fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7.7);
        b.fireLight.intensity = 4.2 * fl; b.fireLight.pos[0] = 0; b.fireLight.pos[1] = fy + 2.6; b.fireLight.pos[2] = dz - 4;
        Ch.put('me', -0.75, fy + 0.06, dz - 0.95, 0.08, t > 12 ? 'plead' : 'pound'); Ch.put('cha', 0.8, fy + 0.06, dz - 1.0, -0.1, 'pound');
        if (Math.random() < dt * 50) FX.emit((Math.random() - 0.5) * 14, fy + 3.5 + Math.random(), dz - 2 - Math.random() * 9, 2, { spread: 0.6, vel: 0.6, up: -0.5, life: 1.6, size: 0.05, ember: true });
      },
      end: function () { b.fireLight.intensity = 0; b.fireLight.pos[0] = r.fire[0]; b.fireLight.pos[1] = r.fire[1]; b.fireLight.pos[2] = r.fire[2]; },
      tension: 0.7
    };
  };

  /* ===================== BỘ MÁY ===================== */
  CS.play = function (id, done) {
    var def = D[id]; if (!def) { if (done) done(); return; }
    var s = def(); s.id = id; s.done = done; s.total = 0; s.shots.forEach(function (sh) { s.total += sh.d; }); s.si = 0; s.fired = 0; s.sub = 0;
    s.ev = (s.ev || []).slice().sort(function (a, b) { return a[0] - b[0]; });
    CS.active = s; CS.t = 0; CS.white = 0; CS.subT = 0; Ch.hideAll();
    if (!AI.ritual) AI.banish(14);
    $('cine').className = 'show'; $('cineSub').className = ''; $('cineSkip').style.display = '';
    var e = R.env; e.flCol[0] = e.flCol[1] = e.flCol[2] = 0; e.flHaze = 0; e.xenon[0] = e.xenon[1] = e.xenon[2] = 0;
    if (s.tension !== undefined) A.tension = s.tension;
    A.hunt = 0; A.stress = 0.15;
  };
  CS.skip = function () { if (CS.active && CS.t > 0.4) { if (H.Voice) H.Voice.stop(); finish(); } };
  function finish() {
    var s = CS.active; if (!s) return; CS.active = null;
    hideActors(); keyLight.intensity = 0; if (s.end) s.end();
    if (AI.ritual && s.id !== 'well') AI.puppetEnd(8);
    $('cine').className = ''; $('cineSub').className = '';
    var p = R.post; p.sepia = 0; p.desat = 0; p.fade = 0; p.white = 0; p.exposure = 1.15; p.dof = 0; p.grade = 0;
    if (s.card) CS.card(s.card[0], s.card[1]);
    if (s.done) s.done();
  }
  CS.card = function (a, b) {
    var c = $('chapter'); $('chapNum').textContent = H.tr(a); $('chapName').textContent = H.tr(b); c.className = ''; void c.offsetWidth; c.className = 'show';
    if (A.ready) A.bell(null, 131);
  };
  CS.update = function (dt, time) {
    var s = CS.active; if (!s) return;
    var t = (CS.t += dt), acc = 0, k, sh = s.shots[s.shots.length - 1], u = 1;
    for (k = 0; k < s.shots.length; k++) { if (t < acc + s.shots[k].d) { sh = s.shots[k]; u = (t - acc) / sh.d; break; } acc += s.shots[k].d; }
    if (t >= s.total) return finish();
    while (s.fired < s.ev.length && s.ev[s.fired][0] <= t) s.ev[s.fired++][1]();
    while (s.sub < s.subs.length && s.subs[s.sub][0] <= t) { var q = s.subs[s.sub++]; sub(q[1], q[2], q[3]); }
    if (CS.subT > 0) { CS.subT -= dt; if (CS.subT <= 0) $('cineSub').className = ''; }
    if (s.tick) s.tick(t, dt);
    // máy quay: nội suy vị trí + điểm nhìn (hoặc hàm máy quay riêng của từng cảnh), rung tay
    var e = sh.ease === 'lin' ? u : (sh.ease === 'out' ? 1 - (1 - u) * (1 - u) : M.lerp(u, ease(u), 0.45)), c = R.cam, rc = sh.cam ? sh.cam(u, t, dt) : (s.cam ? s.cam(sh, u) : null), px, py, pz, lx, ly, lz;
    if (rc) { px = rc.p[0]; py = rc.p[1]; pz = rc.p[2]; lx = rc.l[0] - px; ly = rc.l[1] - py; lz = rc.l[2] - pz; }
    else {
      px = M.lerp(sh.p0[0], sh.p1[0], e); py = M.lerp(sh.p0[1], sh.p1[1], e); pz = M.lerp(sh.p0[2], sh.p1[2], e);
      lx = M.lerp(sh.l0[0], sh.l1[0], e) - px; ly = M.lerp(sh.l0[1], sh.l1[1], e) - py; lz = M.lerp(sh.l0[2], sh.l1[2], e) - pz;
    }
    var hd = sh.hand === undefined ? 1 : sh.hand;
    c.pos[0] = px; c.pos[1] = py; c.pos[2] = pz;
    c.yaw = Math.atan2(-lx, -lz) + (Math.sin(time * 0.9) * 0.004 + Math.sin(time * 2.3) * 0.002 + Math.sin(time * 5.1) * 0.0006) * hd;
    c.pitch = Math.atan2(ly, Math.hypot(lx, lz)) + (Math.cos(time * 1.1) * 0.003 + Math.sin(time * 3.7) * 0.0008) * hd; c.roll = Math.sin(time * 0.6) * 0.004 * hd + (sh.roll || 0);
    c.fov = M.lerp(sh.f0, sh.f1, e);
    // đèn chính đặt lệch máy quay (trên-phải) cho khối hình có sáng tối, thay vì rọi thẳng làm phẳng hình
    var kd = sh.key || [0.9, 1.1, 0.2, 0.62], cy2 = Math.cos(c.yaw), sy2 = Math.sin(c.yaw);
    keyLight.pos[0] = px + cy2 * kd[0] - sy2 * kd[2]; keyLight.pos[1] = py + kd[1]; keyLight.pos[2] = pz - sy2 * kd[0] - cy2 * kd[2]; keyLight.intensity = kd[3];
    // lấy nét: mặc định vào điểm nhìn
    R.post.focus = sh.focus || Math.hypot(lx, ly, lz); R.post.dof = sh.dof === undefined ? 0.9 : sh.dof; R.post.grade = 1;
    // hậu kỳ điện ảnh; hồi ức quá khứ ngả sepia, hạt phim dày
    var past = s.past && !sh.present, p = R.post, cut = Math.min(u * sh.d, (1 - u) * sh.d);
    p.sepia += ((past ? 0.85 : 0) - p.sepia) * Math.min(1, dt * 6); p.desat = 0; p.view = 0; p.scan = 0; p.veins = 0; p.pulse = 0;
    p.vignette = past ? 0.95 : 0.78; p.aberr = past ? 0.009 : 0.004; p.barrel = past ? 0.12 : 0.05; p.grain = past ? 0.16 : 0.07; p.exposure = past ? 1.5 : 1.3;
    CS.white = Math.max(0, CS.white - dt * 1.6); p.white = CS.white;
    p.fade = Math.max(1 - M.smooth(0, 0.7, t), M.smooth(s.total - 0.6, s.total, t), sh.dip ? 1 - M.smooth(0, 0.3, cut) : 0); // mặc định cắt cảnh dứt khoát; dip = mờ qua đen
  };

  /* máy quay cho các kết thúc */
  CS.endCam = function (type, t, time) {
    var b = W.props.temple, r = b.ritual, c = R.cam, fy = b.floorY, px, py, pz, lx, ly, lz;
    if (type === 'bad') {
      px = 2.2 - t * 0.2; py = fy + 1.9; pz = r.pos[2] + 1.5 + t * 0.5; lx = 0; ly = fy + 1.8; lz = b.door.pos[2]; c.fov = 60 - Math.min(18, t * 6);
    } else if (type === 'flee') { // nhìn lại cửa Đình từ ngoài sân, lùi dần ra xa
      px = 1.4 + Math.sin(t * 0.2) * 0.3; py = fy + 1.65; pz = b.door.pos[2] + 3 + t * 0.9; lx = 0; ly = fy + 1.6; lz = b.door.pos[2]; c.fov = 52 + Math.min(14, t * 2);
    } else {
      var a = 0.5 + t * 0.085, rad = 4.6 - Math.min(1.4, t * 0.1);
      px = r.pos[0] + Math.sin(a) * rad; pz = r.pos[2] + Math.cos(a) * rad * 0.8; py = fy + 1.7 + Math.min(1.6, t * 0.12);
      lx = AI.pos[0] * 0.6 + r.pos[0] * 0.4; ly = fy + 1.7 + Math.min(1.2, t * 0.08); lz = AI.pos[2] * 0.6 + r.pos[2] * 0.4; c.fov = 56 - Math.min(12, t);
      if (type === 'best' && t > 2.5) { var ku = M.clamp((t - 2.5) / 6, 0.001, 0.999), kc = Ch.walkLine('khang', [0, b.door.pos[2] - 1.2], [AI.pos[0] - 0.9, AI.pos[2] + 0.9], ku, 0.016, [AI.pos[0], fy + 1.6, AI.pos[2]]); kc.root.pos[1] = fy + 0.06; kc.baseY = fy; }
      var lc = Ch.put('linh', r.pos[0] - 3.4, fy + 0.06, r.pos[2] + 0.6, Math.PI / 2, t > 5 ? 'idle' : 'bound', [AI.pos[0], fy + 1.6, AI.pos[2]]); lc.bind.visible = t <= 5;
    }
    c.pos[0] = px; c.pos[1] = py; c.pos[2] = pz; lx -= px; ly -= py; lz -= pz;
    c.yaw = Math.atan2(-lx, -lz) + Math.sin(time * 0.8) * 0.004; c.pitch = Math.atan2(ly, Math.hypot(lx, lz)); c.roll = 0;
    var e = R.env; e.flCol[0] = e.flCol[1] = e.flCol[2] = 0; e.flHaze = 0; R.post.vignette = 0.8; R.post.grade = 1; R.post.dof = 0;
  };

  /* ===================== BỐ TRÍ CỐT TRUYỆN MỞ RỘNG ===================== */
  /* gọi từ Puzzles.init: api = { item, diary, add, say, give, setObj } */
  CS.place = function (api) {
    var T = W.groundAt, props = W.props, f = Pz.flags, p, c = CFG.POS.cameraItem;
    var hB = props.houseB, hC = props.houseC, mn = props.manor, tp = props.temple, well = props.well;
    // 6 trang nhật ký mới đặt trong thế giới (2 trang còn lại nhận qua cắt cảnh)
    p = hB.F.pt(-1.0, 1.7); api.diary(8, p[0], hB.floorY + 0.1, p[1]);
    p = mn.F.pt(6.2, -1.0); api.diary(9, p[0], mn.floorY + 0.1, p[1]);
    api.diary(10, -46.2, T(-46.2, -62.5) + 0.06, -62.5);
    p = tp.altar.F.pt(-0.85, 0.15); api.diary(13, p[0], tp.altar.top + 0.02, p[1]);
    p = hC.F.pt(-2.6, 1.5); api.diary(14, p[0], hC.floorY + 0.54, p[1]);
    // ba lô + dây thừng của Tuấn bên giếng
    var g = new Geo(), bx = well.x + 1.7, bz = well.z + 1.05, by = T(bx, bz) + 0.08;
    g.add(Geo.sphere(0.26, 10, 8).xf(0, 0.2, 0, 0, 0, 0, 1, 0.85, 0.7).color(0.2, 0.26, 0.12, 0));
    g.add(Geo.box(0.3, 0.16, 0.1).xf(0, 0.16, 0.2).color(0.14, 0.18, 0.09, 0));
    g.add(Geo.tube([[-0.1, 0.25, -0.05], [-0.5, 0.5, -0.25], [-0.75, 1.0, -0.45], [-0.95, 0.95, -0.6], [-1.2, 0.2, -0.75]], 0.018, 5).color(0.6, 0.5, 0.3, 0));
    var pack = new Node(R.mesh(g), { tex: 'silk', rough: 0.8, tint: [1, 1, 1, 1], emis: [0.012, 0.012, 0.008] }); pack.set(bx, by, bz); pack.rot[1] = 0.4; R.nodes.push(pack);
    api.add({ pos: [bx, by + 0.35, bz], r: 2.5, wide: true, enabled: function () { return !f.sawTuan; }, label: 'Xem chiếc ba lô bên giếng', use: function () {
      f.sawTuan = 1; H.Main.cutscene('tuan', function () { api.say(CFG.LINES.tuanAfter, 5); });
    } });
    // Hà trốn trong tủ nhà đông bắc
    var wd = CS.haSpot;
    api.add({ pos: [wd.x, wd.y + 0.6, wd.z], r: 2.6, wide: true, enabled: function () { return f.gotMirror && !f.metHa; }, label: 'Lại gần người đang ngồi co ro', use: function () {
      f.metHa = 1; H.Main.cutscene('ha', function () { Pz.addDiary('d13', true); api.say(CFG.LINES.haAfter, 6); Pz.checkpoint(); });
    } });
    // nhẫn bạc của Khang: chỉ thấy bằng gương, sau khi Phó Bảy chỉ chỗ
    var rx = CFG.POS.banyan[0] + 1.75, rz = CFG.POS.banyan[1] + 1.55;
    var ring = api.item('ring', 'ring', rx, T(rx, rz) + 0.3, rz, 'Nhẫn Bạc của Khang', function () { api.give('ring'); api.say(CFG.LINES.ringFound, 6); A.bell(null, 523); Pz.checkpoint(); }, 3.2);
    ring.node.mat = { tex: 'plain', tint: [1, 1, 1, 1], emis: [0.45, 0.5, 0.6], rough: 0.2 };
    ring.hint = function () { return !!f.ringHint; };
    ring.enabled = function () { return f.ringHint && P.mirrorUp && Math.hypot(P.pos[0] - rx, P.pos[2] - rz) < 16; };
    ring.offering = true; Pz.offer.push(ring);
  };
})();
