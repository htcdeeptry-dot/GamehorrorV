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
  var SPK = { 'Minh': 'minh', 'Hà': 'ha', 'Linh': 'linh', 'Tuấn': 'tuan', 'Lý trưởng Khải': 'khai', 'Huyết Thư': 'khai', 'Lệ': 'le', 'Mẹ nàng': 'me', 'Phó Bảy': 'bayHon' };
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
    $('cineSpeaker').textContent = speaker || ''; $('cineText').textContent = text; $('cineSub').className = 'show'; CS.subT = dur;
    if (SPK[speaker]) Ch.say(SPK[speaker], dur, text);
    if (H.Voice) H.Voice.say(text);
  }

  /* ===================== ĐỊNH NGHĨA CẮT CẢNH ===================== */
  var D = {};
  D.intro = function () {
    var c = CFG.POS.cameraItem, cy = W.terrainH(c[0], c[1]) + 0.72;
    return {
      shots: [
        { d: 9, p0: [4.6, Y(4.6, 68.6) + 1.25, 68.6], p1: [3.4, Y(3.4, 70.2) + 1.45, 70.2], l0: [0, 1.35, 74], l1: [0, 1.4, 71.5], f0: 50, f1: 44 },
        { d: 7, p0: [0, 17, 118], p1: [0, 10, 103], l0: [12, 26, 40], l1: [6, 12, 52], f0: 62, f1: 58 },
        { d: 7, p0: [1.7, Y(1.7, 95) + 1.3, 95], p1: [1.0, Y(1.0, 86) + 1.45, 86], l0: [0.3, 1.45, 88], l1: [0.3, 1.5, 79], f0: 56, f1: 52 },
        { d: 6.5, p0: [-3.2, 2.0, 57.5], p1: [-1.2, 3.0, 54.6], l0: [0, 4.0, 50], l1: [0, 4.3, 50], f0: 58, f1: 50 },
        { d: 6, p0: [c[0] - 1.7, cy + 0.8, c[1] + 2.0], p1: [c[0] - 1.0, cy + 0.45, c[1] + 1.2], l0: [c[0], cy, c[1]], l1: [c[0], cy, c[1]], f0: 50, f1: 42 }
      ],
      subs: [[0.7, '', 'Ba giờ trước khi vạt núi sạt xuống.', 2.8], [3.6, 'Hà', 'Chị Linh ơi, bản đồ có vẽ lối này đâu?', 2.6], [6.3, 'Linh', 'Cứ đi đi. Sắp tới rồi.', 2.4],
        [9.8, '', 'Mùa thu năm 1994. Bão số 6 cuốn mất con đường sau lưng chúng tôi.', 5],
        [16.6, 'Minh', 'Linh, Tuấn, Hà... mình lạc cả ba ở đâu đó giữa rừng tre này.', 4.4],
        [23.6, 'Minh', 'Linh bảo trên này có một ngôi làng bỏ hoang đáng để chụp. Bản đồ thì chẳng vẽ gì.', 5],
        [30.2, 'Minh', 'Máy ảnh của ông nội... mình đánh rơi nó khi chạy.', 4.5]],
      ev: [[8.7, function () { CS.white = 1; W.strike(true); Ch.hideAll(); }], [23, function () { W.strike(true); }], [0.2, function () { A.tension = 0.25; }]],
      tick: function (t, dt) {
        if (t < 8.7) { // bốn người trên lối mòn
          var u = M.clamp(t / 8.7, 0.001, 0.999), z = 77.5 - u * 6;
          Ch.walkLine('linh', [-0.5, 77.5 - 2.6], [-0.5, 71.5 - 2.6], u, dt);
          Ch.walkLine('minh', [0.6, 77.5 - 1.2], [0.6, 71.5 - 1.2], u, dt, [-0.5, 1.5, z - 4]);
          Ch.walkLine('tuan', [-0.2, 77.5 + 0.4], [-0.2, 71.5 + 0.4], u, dt);
          Ch.walkLine('ha', [0.5, 77.5 + 1.7], [0.5, 71.5 + 1.7], u, dt, [-0.5, 1.5, z - 2.6]);
        } else if (t > 16 && t < 23) Ch.walkLine('minh', [0.3, 91], [0.3, 81], M.clamp((t - 16) / 7, 0.001, 0.999), dt);
        else if (t >= 23) Ch.hide('minh');
      },
      card: ['CHƯƠNG I', 'Lối Mòn Rừng Tre']
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
      tension: 0.6, card: ['CHƯƠNG II', 'Làng Âm Linh']
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
      tension: 0.6, card: ['CHƯƠNG IV', 'Nghĩa Địa Hoang']
    };
  };
  D.ha = function () {
    var wd = CS.haSpot, dx = wd.front[0] - wd.pos[0], dz = wd.front[1] - wd.pos[2], l = Math.hypot(dx, dz) || 1, y = wd.pos[1] - 1.2; dx /= l; dz /= l;
    return {
      shots: [
        { d: 12.5, p0: [wd.pos[0] + dx * 3.2 - dz * 0.8, y + 1.05, wd.pos[2] + dz * 3.2 + dx * 0.8], p1: [wd.pos[0] + dx * 1.7 - dz * 0.2, y + 0.95, wd.pos[2] + dz * 1.7 + dx * 0.2], l0: [wd.pos[0], y + 0.62, wd.pos[2]], l1: [wd.pos[0], y + 0.66, wd.pos[2]], f0: 54, f1: 40 },
        { d: 15, p0: [wd.pos[0] + dx * 1.3 + dz * 0.9, y + 0.62, wd.pos[2] + dz * 1.3 - dx * 0.9], p1: [wd.pos[0] + dx * 1.1 + dz * 0.5, y + 0.72, wd.pos[2] + dz * 1.1 - dx * 0.5], l0: [wd.pos[0], y + 0.7, wd.pos[2]], l1: [wd.pos[0], y + 0.68, wd.pos[2]], f0: 44, f1: 38 }
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
    var g = CFG.POS.graveGate, x = g[0] - 3.2, z = g[1], y = W.terrainH(x, z);
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
      tension: 0.45, card: ['CHƯƠNG V', 'Đình Làng Cổ']
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
    var p = R.post; p.sepia = 0; p.desat = 0; p.fade = 0; p.white = 0; p.exposure = 1.15;
    if (s.card) CS.card(s.card[0], s.card[1]);
    if (s.done) s.done();
  }
  CS.card = function (a, b) {
    var c = $('chapter'); $('chapNum').textContent = a; $('chapName').textContent = b; c.className = ''; void c.offsetWidth; c.className = 'show';
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
    // máy quay: nội suy vị trí + điểm nhìn, rung tay nhẹ
    var e = ease(u), c = R.cam, px = M.lerp(sh.p0[0], sh.p1[0], e), py = M.lerp(sh.p0[1], sh.p1[1], e), pz = M.lerp(sh.p0[2], sh.p1[2], e);
    var lx = M.lerp(sh.l0[0], sh.l1[0], e) - px, ly = M.lerp(sh.l0[1], sh.l1[1], e) - py, lz = M.lerp(sh.l0[2], sh.l1[2], e) - pz;
    c.pos[0] = px; c.pos[1] = py; c.pos[2] = pz;
    c.yaw = Math.atan2(-lx, -lz) + Math.sin(time * 0.9) * 0.004 + Math.sin(time * 2.3) * 0.002;
    c.pitch = Math.atan2(ly, Math.hypot(lx, lz)) + Math.cos(time * 1.1) * 0.003; c.roll = Math.sin(time * 0.6) * 0.004;
    c.fov = M.lerp(sh.f0, sh.f1, e);
    keyLight.pos[0] = px; keyLight.pos[1] = py + 0.6; keyLight.pos[2] = pz; keyLight.intensity = 1.0;
    // hậu kỳ điện ảnh; hồi ức quá khứ ngả sepia, hạt phim dày
    var past = s.past && !sh.present, p = R.post, cut = Math.min(u * sh.d, (1 - u) * sh.d);
    p.sepia += ((past ? 0.85 : 0) - p.sepia) * Math.min(1, dt * 6); p.desat = 0; p.view = 0; p.scan = 0; p.veins = 0; p.pulse = 0;
    p.vignette = past ? 0.95 : 0.78; p.aberr = past ? 0.009 : 0.004; p.barrel = past ? 0.12 : 0.05; p.grain = past ? 0.16 : 0.07; p.exposure = past ? 1.7 : 1.3;
    CS.white = Math.max(0, CS.white - dt * 1.6); p.white = CS.white;
    p.fade = Math.max(1 - M.smooth(0, 0.5, t), M.smooth(s.total - 0.6, s.total, t), s.shots.length > 1 ? 1 - M.smooth(0, 0.22, cut) : 0);
  };

  /* máy quay cho các kết thúc */
  CS.endCam = function (type, t, time) {
    var b = W.props.temple, r = b.ritual, c = R.cam, fy = b.floorY, px, py, pz, lx, ly, lz;
    if (type === 'bad') {
      px = 2.2 - t * 0.2; py = fy + 1.9; pz = r.pos[2] + 1.5 + t * 0.5; lx = 0; ly = fy + 1.8; lz = b.door.pos[2]; c.fov = 60 - Math.min(18, t * 6);
    } else {
      var a = 0.5 + t * 0.085, rad = 4.6 - Math.min(1.4, t * 0.1);
      px = r.pos[0] + Math.sin(a) * rad; pz = r.pos[2] + Math.cos(a) * rad * 0.8; py = fy + 1.7 + Math.min(1.6, t * 0.12);
      lx = AI.pos[0] * 0.6 + r.pos[0] * 0.4; ly = fy + 1.7 + Math.min(1.2, t * 0.08); lz = AI.pos[2] * 0.6 + r.pos[2] * 0.4; c.fov = 56 - Math.min(12, t);
      if (type === 'best' && t > 2.5) { var ku = M.clamp((t - 2.5) / 6, 0.001, 0.999), kc = Ch.walkLine('khang', [0, b.door.pos[2] - 1.2], [AI.pos[0] - 0.9, AI.pos[2] + 0.9], ku, 0.016, [AI.pos[0], fy + 1.6, AI.pos[2]]); kc.root.pos[1] = fy + 0.06; kc.baseY = fy; }
      var lc = Ch.put('linh', r.pos[0] - 3.4, fy + 0.06, r.pos[2] + 0.6, Math.PI / 2, t > 5 ? 'idle' : 'bound', [AI.pos[0], fy + 1.6, AI.pos[2]]); lc.bind.visible = t <= 5;
    }
    c.pos[0] = px; c.pos[1] = py; c.pos[2] = pz; lx -= px; ly -= py; lz -= pz;
    c.yaw = Math.atan2(-lx, -lz) + Math.sin(time * 0.8) * 0.004; c.pitch = Math.atan2(ly, Math.hypot(lx, lz)); c.roll = 0;
    var e = R.env; e.flCol[0] = e.flCol[1] = e.flCol[2] = 0; e.flHaze = 0; R.post.vignette = 0.8;
  };

  /* ===================== BỐ TRÍ CỐT TRUYỆN MỞ RỘNG ===================== */
  /* gọi từ Puzzles.init: api = { item, diary, add, say, give, setObj } */
  CS.place = function (api) {
    var T = W.terrainH, props = W.props, f = Pz.flags, p, c = CFG.POS.cameraItem;
    var hB = props.houseB, hC = props.houseC, mn = props.manor, tp = props.temple, well = props.well;
    // 6 trang nhật ký mới đặt trong thế giới (2 trang còn lại nhận qua cắt cảnh)
    api.diary(11, c[0] + 0.42, T(c[0], c[1]) + 0.64, c[1] + 0.22);
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
