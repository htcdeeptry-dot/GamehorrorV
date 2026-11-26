/* HUYẾT LỆ THÔN — chapters.js
   Lối chơi ba chương mới ngoài làng: Đèo Sạt → Rừng Cấm (Miếu Sơn Thần, trạm đo đạc 1934)
   → Sông Âm (cầu đứt, Bến Dưới, đò ngang). Vật phẩm, câu đố hòm sắt, chụp ảnh lộ hồi ức,
   cảnh bóng áo đỏ đuổi theo kẻ quay lưng. Gọi từ Puzzles: place / sync / onFlash / update. */
(function () {
  'use strict';
  var H = window.HuyetLeThon, CFG = H.CFG, M = H.M;
  var C = H.Chapters = { scare: null };
  var api, f, WD, P, UI, A, AI, Pz, Wd, L = CFG.LINES;
  function di(id) { for (var k = 0; k < CFG.DIARIES.length; k++) if (CFG.DIARIES[k].id === id) return k; return -1; }
  function near(x, z, r) { return Math.hypot(P.pos[0] - x, P.pos[2] - z) < r; }
  function play(id, done) { H.Main.cutscene(id, done); }

  C.place = function (a) {
    api = a; Pz = H.Puzzles; f = Pz.flags; WD = H.Wild; P = H.Player; UI = H.UI; A = H.Audio; AI = H.AI; Wd = H.World;
    var T = Wd.groundAt, Pp = WD.props, p;
    // ---------- Đèo Sạt
    api.supply('wb1', 'battery', -9.0, T(-9.0, 408.2) + 0.08, 408.2);
    // ---------- Miếu Sơn Thần: đồ cúng có cuộn phim ai bỏ lại
    var sh = Pp.shrine; p = sh.F.pt(0.45, -0.35); api.supply('wf1', 'film', p[0], sh.y + 1.02, p[1]);
    // ---------- trạm đo đạc
    api.diary(di('d11'), Pp.table[0] - 0.2, Pp.table[1], Pp.table[2]);
    api.supply('wb2', 'battery', Pp.table[0] + 0.45, Pp.table[1] + 0.02, Pp.table[2] + 0.1);
    var dr = Pp.darkroom;
    api.add({ pos: [dr.door[0], dr.y + 1.0, dr.door[1]], r: 2.8, wide: true, enabled: function () { return !f.plate; }, label: 'Vén cửa lều tối', use: function () { api.say(L.campDark, 5); H.UI.hint('flashSpirit', 0.5); f.darkHint = 1; } });
    var ch = Pp.chest;
    api.add({ pos: ch.pos, r: 3.0, wide: true, enabled: function () { return !f.chestOpen; }, label: 'Mở hòm sắt', use: function () {
      if (!f.plate) api.say(L.chestLocked, 5);
      UI.keypad(4, 'HÒM SẮT — NGÀY + THÁNG ĐOÀN TỚI (NN TT)', function (code) {
        if (code !== '2109') { // gợi ý tăng dần sau mỗi lần sai
          f.chestTry = (f.chestTry || 0) + 1;
          // gợi ý chậm rãi: mỗi 2 lần sai mới lộ thêm một bước, lần thứ 8 mới nói thẳng mã
          var tn = f.chestTry, hk = tn >= 8 ? 'chestHint4' : tn >= 6 ? 'chestHint3' : tn >= 4 ? 'chestHint2' : tn >= 2 ? 'chestHint1' : 'chestHint0';
          setTimeout(function () { api.say(L[hk], 6); }, 600);
          return false;
        }
        f.chestOpen = 1; A.click(0.8); A.creak(ch.pos, 0.6, 1.3); api.give('ferryKey'); api.say(L.chestOpen, 5);
        setTimeout(function () { Pz.addDiary('d18', true); }, 900);
        api.setObj('w5'); Pz.checkpoint(); C.scare = { t: 0, x: 37, z: 279.5, on: false, from: 'camp' };
        return true;
      });
    } });
    // ---------- Bến Dưới
    api.doorUse(Pp.hut.door, 'cửa lều');
    api.diary(di('d17'), Pp.hutTable[0], Pp.hutTable[1], Pp.hutTable[2]);
    p = Pp.hut.F.pt(1.5, -1.2); api.supply('wf2', 'film', p[0], Pp.hut.floorY + 0.44, p[1]);
    api.add({ pos: [82.0, 0.95, 226.4], r: 3.0, wide: true, enabled: function () { return !f.ferryDone; },
      label: function () { return Pz.has('ferryKey') ? 'Tháo xích, kéo đò sang sông' : 'Xem dây đò'; },
      use: function () {
        if (!Pz.has('ferryKey')) return api.say(L.needFerryKey, 6);
        delete Pz.inv.ferryKey; A.chain([82, 1, 226]); api.say(L.ferryReady, 3);
        play('ferry', function () {
          f.ferryDone = 1; var ld = Pp.landing; H.debug.tp(ld[0], ld[2] - 1.0, 1.36); P.vel[0] = P.vel[1] = 0;
          api.setObj('w7'); api.say(L.landed, 6); Pz.checkpoint();
        });
      } });
  };

  C.sync = function () {
    if (!WD) return;
    WD.setFerry(f.ferryDone ? 1 : 0); WD.ferryBusy = false;
    var ch = WD.props.chest; ch.lid.rot[0] = f.chestOpen ? -1.25 : 0;
    C.scare = null;
  };

  /* đèn flash: lộ tấm kính ảnh trong lều tối, hồi ức xác thuyền, xua bóng áo đỏ */
  C.onFlash = function () {
    var c = H.R.cam.pos, dr = WD.props.darkroom, wr = WD.props.wreck;
    if (!f.plate && Math.hypot(dr.x - c[0], dr.z - c[2]) < 9 && P.lookDot(dr.x, dr.y + 0.9, dr.z) > 0.4) {
      f.plate = 1; A.bell(null, 220);
      setTimeout(function () { play('camp1934', function () { Pz.addDiary('d19', true); api.setObj('w4'); Pz.checkpoint(); }); }, 700);
    }
    if (!f.wreckMem && Math.hypot(wr[0] - c[0], wr[2] - c[2]) < 18 && P.lookDot(wr[0], wr[1], wr[2]) > 0.6) {
      f.wreckMem = 1; A.bell(null, 147); setTimeout(function () { play('wharf'); }, 700);
    }
    var s = C.scare;
    if (s && s.on && Math.hypot(AI.pos[0] - c[0], AI.pos[2] - c[2]) < 26 && P.lookDot(AI.pos[0], AI.pos[1] + 1.2, AI.pos[2]) > 0.75) {
      AI.puppetEnd(30); A.glitch(AI.pos); C.scare = null; api.say(L.redGone, 4); f.redBanished = 1;
    }
  };

  C.update = function (dt, time) {
    if (!api || H.Main.state !== 'play') return;
    var Pp = WD.props;
    // kịch bản theo vị trí
    if (!f.shrineSeen && Pz.has('camera') && near(Pp.shrine.front[0], Pp.shrine.front[1], 10)) {
      f.shrineSeen = 1; play('shrine', function () { api.say(L.shrineAfter, 5); api.setObj('w3'); Pz.checkpoint(); });
    }
    if (!f.bridgeSeen && near(10, 247.5, 5.5)) {
      f.bridgeSeen = 1; play('bridge', function () { api.say(L.bridgeHint, 5); api.setObj('w6'); Pz.checkpoint(); });
    }
    if (!f.chestSeen && !f.chestOpen && near(Pp.chest.x, Pp.chest.z, 11)) { f.chestSeen = 1; api.say(L.chestSee, 6); }
    if (!f.wharfHint && near(86, 241, 9)) { f.wharfHint = 1; api.say(L.wreckHint, 5); }
    // bóng áo đỏ: đứng yên nhìn thẳng thì nó chậm lại, quay lưng chạy thì nó lao tới
    var s = C.scare;
    if (s) {
      s.t += dt;
      if (!s.on && s.t > 1.6) { s.on = true; AI.puppet(s.x, s.z, 'hunt', [P.pos[0], P.pos[2]], 0.92); A.weep([s.x, 1.5, s.z], 6, 0.8); A.sting(); api.say(L.redCamp, 6); }
      if (s.on) {
        var dx = P.pos[0] - AI.pos[0], dz = P.pos[2] - AI.pos[2], d = Math.hypot(dx, dz) || 1, look = P.lookDot(AI.pos[0], AI.pos[1] + 1.2, AI.pos[2]);
        var sp = look > 0.6 ? 0.35 : (P.sprinting ? 5.2 : 1.8);
        AI.pos[0] += dx / d * sp * dt; AI.pos[2] += dz / d * sp * dt; AI.pos[1] = Wd.heightAt(AI.pos[0], AI.pos[2]); AI.faceT = [P.pos[0], P.pos[2]];
        A.stress = Math.max(A.stress || 0, M.clamp(1 - d / 25, 0, 1));
        if (d < 1.8) { P.sanity = Math.max(25, P.sanity - 20); P.shake = 0.12; A.scream(AI.pos, false); AI.puppetEnd(30); C.scare = null; }
        else if (s.t > 30) { AI.puppetEnd(20); C.scare = null; }
      }
    }
  };
})();
