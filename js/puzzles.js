/* HUYẾT LỆ THÔN — puzzles.js
   Máy trạng thái câu đố 5 khu vực, túi đồ, vật tương tác, hiện trường tâm linh,
   nghi lễ Đàn Ngũ Hành và hai kết thúc. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var M = H.M, R = H.R, CFG = H.CFG, Node = H.Node, Geo = H.Geo;
  var Pz = H.Puzzles = { flags: {}, inv: {}, read: {}, list: [], objective: 'o1', scenes: [], offer: [], cranking: 0, ritualT: -1, mirror: { ang: 0, str: 0 } };
  var L = CFG.LINES, items = {}, W, props, UI, A, P, AI;

  Pz.has = function (id) { return !!Pz.inv[id]; };
  Pz.stage = function () { var f = Pz.flags; return f.allOff ? 4 : (f.gotScroll ? 3 : (f.gotMirror ? 2 : (f.gateOpen ? 1 : 0))); };
  function setObj(o) { Pz.objective = o; UI.objective(CFG.OBJECTIVES[o]); }
  function add(o) { Pz.list.push(o); return o; }
  function say(t, d) { UI.subtitle(t, d || 4.5); }

  function item(id, type, x, y, z, label, onPick, scale, ry) {
    var n = H.Models.item(type), s = scale || 1.7; n.set(x, y, z); n.scl = [s, s, s]; n.rot[1] = ry === undefined ? (x * 7 + z * 3) % 6.28 : ry; R.nodes.push(n);
    var o = add({ id: id, pos: [x, y, z], r: 2.3, node: n, item: true, label: 'Nhặt ' + label, use: function () {
      o.gone = true; n.visible = false; Pz.flags['got_' + id] = 1; A.pickup(); onPick(o);
    } });
    items[id] = o; return o;
  }
  function diary(idx, x, y, z) {
    var d = CFG.DIARIES[idx];
    item(d.id, 'note', x, y, z, '“' + d.title + '”', function () { Pz.read[d.id] = 1; UI.note(d.title, d.sub, d.text); UI.toast('Nhật ký ' + Object.keys(Pz.read).length + '/' + CFG.DIARIES.length); }, 1.5);
  }
  function supply(id, type, x, y, z) {
    item(id, type, x, y, z, CFG.ITEMS[type].name, function () {
      if (type === 'battery') { P.battery = 100; UI.toast('Đèn pin đã nạp đầy'); } else { P.film += 4; UI.toast('+4 kiểu phim'); }
    }, 2.0);
  }
  function give(id) { Pz.inv[id] = 1; UI.toast('Nhận được: ' + CFG.ITEMS[id].name); }
  function doorUse(door, name) {
    return add({ pos: door.pos, r: 2.7, wide: true, label: function () { return (door.target ? 'Đóng ' : 'Mở ') + name; }, use: function () { door.target = door.target ? 0 : 1; A.creak(door.pos, 0.6, 1.1); if (!door.target) setTimeout(function () { A.slam(door.pos); }, 650); } });
  }
  function hideSpot(spot, label) { add({ pos: spot.pos, r: 2.2, wide: true, label: label, use: function () { P.hide(spot); } }); }

  Pz.init = function () {
    W = H.World; props = W.props; UI = H.UI; A = H.Audio; P = H.Player; AI = H.AI;
    var T = W.terrainH, k, p, b, POS = CFG.POS, f = Pz.flags;
    Pz.list.length = 0;
    // ---------- KHU 1: Cổng làng & rừng tre
    diary(0, 0.9, T(0.9, 86.5) + 0.06, 86.5);
    item('camera', 'camera', POS.cameraItem[0], T(POS.cameraItem[0], POS.cameraItem[1]) + 0.66, POS.cameraItem[1], 'Máy Ảnh Tâm Linh', function () { give('camera'); say(L.gotCamera, 6); setObj('o2'); }, 1.5);
    add({ pos: [POS.monument[0] - 0.3, T(POS.monument[0], POS.monument[1]) + 1.3, POS.monument[1]], r: 3, wide: true, label: 'Xem bia đá', use: function () { UI.note('Bia Trấn Yểm', 'Dựng trước cổng làng Âm Linh', CFG.MONUMENT_TEXT); f.sawMonument = 1; } });
    var gate = props.gate;
    add({ pos: gate.pos, r: 2.8, wide: true, enabled: function () { return !f.gateOpen; }, label: 'Mở khoá số trên xích', use: function () {
      if (!f.sawMonument) say(L.gateLocked, 4);
      UI.keypad(4, 'Ổ KHOÁ SỐ — NĂM XẢY RA THẢM KỊCH', function (code) {
        if (code !== '1994') return false;
        f.gateOpen = 1; gate.target = 1; gate.chain.visible = false; A.chain(gate.pos); A.creak(gate.pos, 0.9, 2.2); say(L.gateOpen, 5);
        setObj('o3'); AI.enabled = true; AI.cooldown = 7; W.strike(true); Pz.checkpoint(); H.Main.cutscene('gate'); return true;
      });
    } });
    diary(1, 2.2, T(2.2, 44.5) + 0.06, 44.5);
    // ---------- Nhà thầy lang: tay quay
    var hA = props.houseA; doorUse(hA.door, 'cửa nhà cổ');
    p = hA.altar.F.pt(0.62, 0.12); item('crank', 'crank', p[0], hA.altar.top + 0.04, p[1], 'Tay Quay Sắt', function () { give('crank'); setObj('o4'); Pz.checkpoint(); }, 1.0, hA.F.a);
    p = hA.altar.F.pt(-0.62, 0.15); diary(2, p[0], hA.altar.top + 0.02, p[1]);
    p = hA.F.pt(-3.0, -1.5); supply('b1', 'battery', p[0], hA.floorY + 0.62, p[1]);
    p = hA.F.pt(2.6, 1.6); supply('f1', 'film', p[0], hA.floorY + 0.52, p[1]);
    hideSpot(hA.wardrobe, 'Trốn vào tủ gỗ cổ'); hideSpot(hA.altar, 'Chui xuống gầm bàn thờ');
    // ---------- KHU 2: Giếng Cổ Huyết Lệ
    var well = props.well;
    add({ pos: [well.x, well.y + 1.2, well.z], r: 3.3, wide: true, enabled: function () { return !f.gotMirror && !Pz.cranking; },
      label: function () { return !f.crankPlaced ? (Pz.has('crank') ? 'Lắp Tay Quay Sắt vào tời' : 'Xem tời giếng') : (!f.bucketUp ? 'Quay tời kéo gàu lên' : 'Lấy vật trong gàu'); },
      use: function () {
        if (!f.crankPlaced) {
          if (!Pz.has('crank')) return say(L.needCrank);
          f.crankPlaced = 1; delete Pz.inv.crank; well.crank.visible = true; A.click(0.7); say(L.crankPlaced, 3); return;
        }
        if (!f.bucketUp) { Pz.cranking = 4.6; A.ratchet([well.x + 1.9, well.y + 1.6, well.z], 20); A.weep([well.x, well.y - 3, well.z], 5, 0.8); return; }
        give('mirror'); give('key'); f.gotMirror = 1; setObj('o5'); A.sting();
        var dx = well.x - P.pos[0], dz = well.z - P.pos[2], dl = Math.hypot(dx, dz) || 1; Pz.ambushT = 1e9; H.Main.cutscene('well', function () { Pz.ambushT = 0.6; say(L.ambush, 8); }); Pz.ambushPos = [well.x + dx / dl * 2.6, well.z + dz / dl * 2.6];
        AI.enabled = true; AI.cooldown = 99;
      } });
    diary(4, -27.4, T(-27.4, 24.8) + 0.1, 24.8);
    // ---------- KHU 3: Nhà Lý trưởng
    var mn = props.manor;
    add({ pos: mn.door.pos, r: 2.8, wide: true, label: function () { return f.manorOpen ? (mn.door.target ? 'Đóng cửa' : 'Mở cửa') : 'Mở cửa nhà Lý trưởng'; }, use: function () {
      if (!f.manorOpen) { if (!Pz.has('key')) return say(L.manorLocked); f.manorOpen = 1; A.click(0.7); say(L.manorOpen, 5); }
      mn.door.target = mn.door.target ? 0 : 1; A.creak(mn.door.pos, 0.7, 1.4);
    } });
    var poses = [['bound', 'reach', 'reach'], ['raise', 'raise', 'raise'], ['bound', 'reach']], offs = [[[0, 0, 0], [-1.1, 0.5, 2.0], [1.1, 0.6, -2.0]], [[0, 0, 0.4], [0.5, 0.3, -0.5], [-0.5, -0.4, 2.6]], [[0, 0.2, 0], [0.9, -0.5, -1.2]]];
    var digits = ['3', '7', '5'];
    for (k = 0; k < 3; k++) {
      var sp = mn.scenes[k], sc = { pos: [sp[0], mn.floorY + 1.3, sp[1]], nodes: [], reveal: 0, done: false };
      for (var q = 0; q < poses[k].length; q++) {
        var n = H.Models.specter(poses[k][q]), o = offs[k][q];
        n.set(sp[0] + o[0], mn.floorY + 0.06, sp[1] + o[1]); n.rot[1] = o[2] + mn.F.a; if (k === 1 && q === 2) n.scl = [0.7, 0.7, 0.7]; if (k === 2 && q === 0) { n.rot[0] = 1.2; n.pos[1] += 0.3; }
        R.nodes.push(n); sc.nodes.push(n);
      }
      R.materials['digit' + k] = { alb: R.textTexture([digits[k]], { w: 128, h: 128, size: 110, bold: true, drip: false }), uv: 1 };
      var dn = new Node(R.mesh(Geo.quad([-0.3, -0.3, 0], [0.3, -0.3, 0], [0.3, 0.3, 0], [-0.3, 0.3, 0])), { tex: 'digit' + k, unlit: 1.8, tint: [1, 0.3, 0.25, 0], additive: true });
      dn.set(sp[0], mn.floorY + 2.5, sp[1]); R.nodes.push(dn); sc.digit = dn;
      Pz.scenes.push(sc);
    }
    add({ pos: mn.safe.pos, r: 2.4, wide: true, enabled: function () { return !f.safeOpen; }, label: 'Mở két sắt', use: function () {
      if (!(f.photo0 && f.photo1 && f.photo2)) say(L.safeHint, 5);
      UI.keypad(3, 'KÉT SẮT CỦA LÝ TRƯỞNG', function (code) { if (code !== '375') return false; f.safeOpen = 1; A.click(0.8); A.creak(mn.safe.pos, 0.6, 1.2); return true; });
    } });
    var scr = item('scroll', 'scroll', mn.safe.inside[0], mn.safe.inside[1], mn.safe.inside[2], 'Huyết Thư', function () {
      give('scroll'); f.gotScroll = 1; setObj('o8'); AI.cooldown = Math.min(AI.cooldown, 8);
      H.Main.cutscene('scroll', function () { Pz.addDiary('d16', false); say(L.gotScroll, 6); Pz.checkpoint(); });
    }, 1.2, mn.F.a);
    scr.enabled = function () { return !!f.safeOpen; };
    p = mn.altar.F.pt(0.85, 0.15); diary(3, p[0], mn.altar.top + 0.02, p[1]);
    p = mn.F.pt(5.6, -3.9); supply('f2', 'film', p[0], mn.floorY + 0.64, p[1]);
    p = mn.F.pt(-1.4, 1.4); supply('b2', 'battery', p[0], mn.floorY + 0.52, p[1]);
    hideSpot(mn.wardrobe, 'Trốn vào tủ gỗ cổ'); hideSpot(mn.wardrobe2, 'Trốn vào tủ gỗ cổ'); hideSpot(mn.altar, 'Chui xuống gầm bàn thờ');
    // ---------- Nhà của Lệ & nhà đông bắc
    var hB = props.houseB; doorUse(hB.door, 'cửa');
    diary(6, hB.bed[0], hB.bed[1], hB.bed[2]);
    p = hB.altar.F.pt(0.6, 0.12); supply('f3', 'film', p[0], hB.altar.top + 0.02, p[1]);
    hideSpot(hB.wardrobe, 'Trốn vào tủ gỗ cổ'); hideSpot(hB.altar, 'Chui xuống gầm bàn thờ');
    var hC = props.houseC; doorUse(hC.door, 'cửa');
    p = hC.altar.F.pt(0.6, 0.12); supply('b3', 'battery', p[0], hC.altar.top + 0.02, p[1]);
    p = hC.altar.F.pt(-0.6, 0.12); supply('f4', 'film', p[0], hC.altar.top + 0.02, p[1]);
    hideSpot(hC.altar, 'Chui xuống gầm bàn thờ');
    // ---------- KHU 4: Nghĩa Địa Hoang
    diary(5, -25.5, T(-25.5, -44.2) + 0.06, -44.2);
    var types = ['incense', 'hairpin', 'comb'];
    for (k = 0; k < 3; k++) (function (k) {
      var op = POS.offerings[k], it = item('off' + k, types[k], op[0], T(op[0], op[1]) + 0.46, op[1], CFG.ITEMS[types[k]].name, function () {
        give(types[k]); var left = 3 - Pz.offer.slice(0, 3).filter(function (o) { return o.gone; }).length;
        if (left > 0) say(L.offering.replace('{n}', left), 3.5); else { f.allOff = 1; setObj('o9'); H.Main.cutscene('grave', function () { f.ringHint = 1; say(L.allOfferings, 5); UI.toast(L.ringHint); Pz.checkpoint(); }); }
        A.bell(null, 392); Pz.checkpoint();
      }, 2.2);
      it.node.mat = { tex: 'plain', tint: [1, 1, 1, 1], emis: [0.5, 0.42, 0.2], rough: 0.4 };
      it.enabled = function () { return P.mirrorUp && Math.hypot(P.pos[0] - op[0], P.pos[2] - op[1]) < 16; };
      it.offering = true; Pz.offer.push(it);
    })(k);
    // ---------- KHU 5: Đình Làng Cổ
    var tp = props.temple;
    add({ pos: tp.door.pos, r: 3.2, wide: true, enabled: function () { return !f.templeOpen; }, label: 'Chạm vào cửa Đình', use: function () {
      if (!Pz.has('scroll')) return say(L.templeLocked, 5);
      f.templeOpen = 1; tp.door.target = 1; A.creak(tp.door.pos, 0.9, 2.4); setObj('o10'); H.Main.cutscene('temple', function () { say(L.templeOpen, 5); });
      tp.door.seals.forEach(function (s) { s.visible = false; });
      H.FX.emit(tp.door.pos[0], tp.door.pos[1] + 0.3, tp.door.pos[2] + 0.3, 70, { spread: 1.6, vel: 0.8, up: 1.4, life: 1.6, size: 0.035, ember: true });
      Pz.checkpoint();
    } });
    diary(7, 1.5, T(1.5, -46.6) + 0.1, -46.6);
    supply('b4', 'battery', -1.6, T(-1.6, -47.2) + 0.1, -47.2);
    hideSpot(tp.altar, 'Chui xuống gầm bàn thờ');
    add({ pos: tp.ritual.pos, r: 3.4, wide: true, enabled: function () { return f.templeOpen && Pz.ritualT < 0; }, label: 'Đặt lễ vật lên Đàn Ngũ Hành', use: function () {
      if (!f.allOff || !Pz.has('scroll')) return say(L.altarNeed);
      Pz.ritualT = 0; Pz.ritualStep = 0; H.Main.cinematic = true; AI.reset(); AI.enabled = false;
    } });
    if (H.Cutscenes) H.Cutscenes.place({ item: item, diary: diary, add: add, say: say, give: give, setObj: setObj });
    Pz.sync();
  };
  Pz.addDiary = function (id, open) {
    if (Pz.read[id]) return; Pz.read[id] = 1; var d = CFG.DIARIES.filter(function (x) { return x.id === id; })[0];
    UI.toast('Nhật ký mới: “' + d.title + '”'); if (open) UI.note(d.title, d.sub, d.text);
  };

  Pz.ambushSurvived = function () { var f = Pz.flags; if (f.ambushDone) return; f.ambushDone = 1; setObj('o6'); Pz.checkpoint(); if (H.Cutscenes) H.Cutscenes.card('CHƯƠNG III', 'Nhà Lý Trưởng'); };

  /* đồng bộ thế giới theo cờ trạng thái (sau khi tải / hồi sinh) */
  Pz.sync = function () {
    var f = Pz.flags, k, well = props.well, b;
    for (k = 0; k < Pz.list.length; k++) { var o = Pz.list[k]; if (o.item) { o.gone = !!f['got_' + o.id]; o.node.visible = !o.gone; } }
    Pz.offer.forEach(function (o) { o.offering = true; o.node.set(o.pos[0], o.pos[1], o.pos[2]); o.node.mat.emis = [0.5, 0.42, 0.2]; });
    var g = props.gate; g.open = g.target = f.gateOpen ? 1 : 0; g.chain.visible = !f.gateOpen;
    well.crank.visible = !!f.crankPlaced; Pz.cranking = 0; setBucket(f.bucketUp ? 1 : 0);
    b = props.manor; b.safe.door.rot[1] = b.safe.a - (f.safeOpen ? 1.9 : 0); Pz.safeK = f.safeOpen ? 1 : 0;
    for (k = 0; k < 3; k++) { Pz.scenes[k].done = !!f['photo' + k]; Pz.scenes[k].reveal = 0; }
    b = props.temple; b.door.open = b.door.target = f.templeOpen ? 1 : 0; b.door.seals.forEach(function (s) { s.visible = !f.templeOpen; });
    b.fireLight.intensity = 0; Pz.ritualT = -1; Pz.ambushT = 0;
    [props.houseA, props.manor, props.houseB, props.houseC].forEach(function (h) { h.door.open = h.door.target = 0; });
    AI.enabled = !!f.gateOpen; UI.objective(CFG.OBJECTIVES[Pz.objective]);
    if (f.gotMirror && !f.ambushDone) { f.ambushDone = 1; if (Pz.objective === 'o5') setObj('o6'); }
  };
  function setBucket(t) {
    var w = props.well, by = M.lerp(w.y - 5.1, w.y + 0.5, t); w.bucket.pos[1] = by; w.rope.scl[1] = Math.max(0.05, (w.y + 1.45) - (by + 0.6));
  }

  /* đèn flash: lộ bùa máu, chụp hiện trường tâm linh */
  Pz.onFlash = function () {
    var f = Pz.flags, k, c = R.cam.pos;
    for (k = 0; k < W.runes.length; k++) { var r = W.runes[k]; if (Math.hypot(r.pos[0] - c[0], r.pos[2] - c[2]) < 15 && P.lookDot(r.pos[0], r.pos[1], r.pos[2]) > 0.45) r.t = 10; }
    if (!f.manorOpen) return;
    for (k = 0; k < 3; k++) {
      var s = Pz.scenes[k], d = Math.hypot(s.pos[0] - c[0], s.pos[2] - c[2]);
      if (d < 9 && P.lookDot(s.pos[0], s.pos[1], s.pos[2]) > 0.7) {
        s.reveal = 1;
        if (!s.done) {
          s.done = true; f['photo' + k] = 1; say(L.photo[k], 5); A.bell(null, 233);
          (function (k) { setTimeout(function () { H.Main.cutscene('memory' + k); }, 900); })(k);
          if (f.photo0 && f.photo1 && f.photo2) { setObj('o7'); setTimeout(function () { say(L.safeHint, 6); }, 5200); }
        }
      }
    }
  };

  var target = null;
  Pz.update = function (dt, time) {
    var f = Pz.flags, k, c = R.cam.pos, best = null, bd = -1;
    // tìm vật tương tác đang nhìn vào
    if (!P.hidden && !P.locked) for (k = 0; k < Pz.list.length; k++) {
      var o = Pz.list[k]; if (o.gone || (o.enabled && !o.enabled())) continue;
      var dx = o.pos[0] - c[0], dy = o.pos[1] - c[1], dz = o.pos[2] - c[2], d = Math.hypot(dx, dy, dz);
      if (d > o.r) continue;
      var dot = P.lookDot(o.pos[0], o.pos[1], o.pos[2]); if (dot < (o.wide ? 0.35 : 0.8)) continue;
      var sc = dot - d * 0.08 + (o.item ? 0.25 : 0); if (sc > bd) { bd = sc; best = o; }
    }
    target = best;
    if (P.hidden) UI.prompt('[E] Ra ngoài   ·   giữ [Space] nín thở');
    else UI.prompt(best ? '[E] ' + (typeof best.label === 'function' ? best.label() : best.label) : null);
    // vật phẩm lấp lánh nhẹ
    for (k = 0; k < Pz.list.length; k++) {
      o = Pz.list[k]; if (!o.item || o.gone) continue;
      if (o.offering) { var en = o.enabled(); o.node.visible = en; o.node.rot[1] += dt * 1.5; o.node.pos[1] = o.pos[1] + Math.sin(time * 2 + k) * 0.05; continue; }
      if (o.enabled) o.node.visible = o.enabled();
      var pu = 0.03 + 0.03 * (0.5 + 0.5 * Math.sin(time * 3 + k)); o.node.mat.emis[0] = pu * 1.2; o.node.mat.emis[1] = pu; o.node.mat.emis[2] = pu * 0.6;
    }
    // quay tời
    if (Pz.cranking > 0) {
      Pz.cranking -= dt; var w = props.well, t = M.clamp(1 - Pz.cranking / 4.6, 0, 1);
      w.crank.rot[0] = -t * 26; setBucket(t * t * (3 - 2 * t));
      if (Pz.cranking <= 0) { f.bucketUp = 1; Pz.cranking = 0; A.slam([w.x, w.y + 1, w.z]); }
    }
    if (Pz.ambushT > 0) { Pz.ambushT -= dt; if (Pz.ambushT <= 0) { AI.forceHunt(Pz.ambushPos[0], Pz.ambushPos[1], 2.8); Pz.huntSince = time; } }
    if (f.gotMirror && !f.ambushDone && Pz.ambushT <= 0 && AI.state === 'DORMANT' && time - (Pz.huntSince || time) > 4) Pz.ambushSurvived();
    // két sắt
    var sk = f.safeOpen ? 1 : 0; if (Pz.safeK !== sk) { Pz.safeK += (sk - Pz.safeK) * Math.min(1, dt * 2.5); props.manor.safe.door.rot[1] = props.manor.safe.a - Pz.safeK * 1.9; }
    // bóng ma ký ức: chỉ thấy qua ống ngắm hoặc ngay sau flash
    for (k = 0; k < 3; k++) {
      var s = Pz.scenes[k], ds = Math.hypot(s.pos[0] - c[0], s.pos[2] - c[2]);
      s.reveal = Math.max(0, s.reveal - dt / 5);
      var a = f.manorOpen && ds < 16 ? Math.max(P.camAnim * (s.done ? 0.12 : 0.26) * (0.7 + 0.3 * Math.sin(time * 7 + k)), s.reveal * 0.9) : 0;
      for (var q = 0; q < s.nodes.length; q++) { s.nodes[q].mat.tint[3] = a; s.nodes[q].visible = a > 0.01; }
      var da = s.done && ds < 16 ? 0.45 + 0.25 * Math.sin(time * 3) + s.reveal : 0;
      s.digit.mat.tint[3] = da; s.digit.visible = da > 0.01; s.digit.rot[1] = Math.atan2(c[0] - s.digit.pos[0], c[2] - s.digit.pos[2]);
    }
    for (k = 0; k < W.runes.length; k++) W.runes[k].faint = P.camAnim * 0.07;
    // gương đồng: vệt sáng chỉ hướng lễ vật gần nhất
    var mi = Pz.mirror; mi.str = 0;
    if (P.mirrorUp) {
      var nd = 1e9, no = null; for (k = 0; k < Pz.offer.length; k++) { var of = Pz.offer[k]; if (of.gone || (of.hint && !of.hint())) continue; var dd = Math.hypot(of.pos[0] - P.pos[0], of.pos[2] - P.pos[2]); if (dd < nd) { nd = dd; no = of; } }
      if (no) { mi.ang = M.angDiff(P.yaw, Math.atan2(-(no.pos[0] - P.pos[0]), -(no.pos[2] - P.pos[2]))); mi.str = M.clamp(1.15 - nd / 70, 0.15, 1); mi.dist = nd; }
    }
    if (W.inGrave && Pz.has('mirror') && !f.graveMsg) { f.graveMsg = 1; say(L.graveyard, 7); }
    if (Pz.ritualT >= 0) ritual(dt, time);
  };
  Pz.use = function () {
    if (P.hidden) return P.unhide();
    if (target && !P.locked) target.use();
  };

  /* ---------- nghi lễ & kết thúc ---------- */
  function ritual(dt, time) {
    var b = props.temple, r = b.ritual, t = (Pz.ritualT += dt), k;
    if (Pz.ritualStep === 0) {
      for (k = 0; k < 3; k++) { var n = Pz.offer[k].node, s = r.spots[k]; n.visible = true; n.set(s[0], s[1], s[2]); n.rot[1] = 0; Pz.offer[k].gone = true; Pz.offer[k].offering = false; Pz.offer[k].node.mat.emis = [0.2, 0.16, 0.08]; }
      A.pickup(); Pz.ritualStep = 1; UI.subtitle('Trầm Hương — Trâm Ngọc — Lược Gỗ. Hoả, Kim, Mộc đã về chỗ.', 4);
    } else if (Pz.ritualStep === 1 && t > 2.2) {
      A.fire(40); Pz.ritualStep = 2; delete Pz.inv.scroll; UI.subtitle('Bạn châm lửa vào Huyết Thư. Lời thú tội cháy lên — Thổ. Và mưa ngoài kia — Thuỷ.', 5);
      W.lanterns.forEach(function (L2) { L2.blueT = 1e9; });
    } else if (Pz.ritualStep === 2 && t > 5) {
      AI.appearRitual(r.pos[0] + 2.4, r.pos[2] - 2.4); A.weep([r.pos[0] + 2.4, 2, r.pos[2] - 2.4], 6, 0.9); W.strike(true); Pz.ritualStep = 3;
    } else if (Pz.ritualStep === 3 && t > 10.5) {
      Pz.ritualStep = 4;
      UI.choice('Ngọn lửa dựng đứng. Nàng nhìn bạn qua làn tro, và chờ.\nBạn gọi nàng là:', CFG.NAMES.map(function (n) { return n.label; }), function (i) { H.Main.ending(CFG.NAMES[i].ok ? (Pz.has('ring') ? 'best' : 'true') : 'bad'); });
    }
    if (Pz.ritualStep >= 2) {
      var fl = 0.8 + 0.2 * Math.sin(time * 13) * Math.sin(time * 7.7);
      b.fireLight.intensity += ((Pz.fireWhite ? 5 : 3.4) * fl - b.fireLight.intensity) * Math.min(1, dt * 2);
      if (Pz.fireWhite) { b.fireLight.color[0] = 0.9; b.fireLight.color[1] = 0.95; b.fireLight.color[2] = 1.0; }
      if (Math.random() < dt * 60) H.FX.emit(r.fire[0], r.fire[1] - 0.1, r.fire[2], 2, { spread: 0.5, vel: 0.5, up: 1.8, life: 1.1, size: 0.05, ember: true, col: Pz.fireWhite ? [1.6, 1.8, 2.4] : [2.6, 0.7, 0.1] });
    }
  }

  /* ---------- lưu / tải ---------- */
  Pz.serialize = function () {
    return { v: 1, flags: Pz.flags, inv: Pz.inv, read: Pz.read, objective: Pz.objective, player: { x: P.pos[0], z: P.pos[2], yaw: P.yaw, battery: P.battery, film: P.film, sanity: P.sanity } };
  };
  Pz.load = function (d) {
    var k, src = [d.flags || {}, d.inv || {}, d.read || {}], dst = [Pz.flags, Pz.inv, Pz.read];
    for (var n = 0; n < 3; n++) { for (k in dst[n]) delete dst[n][k]; for (k in src[n]) dst[n][k] = src[n][k]; }
    Pz.objective = d.objective || 'o1';
    P.reset();
    if (d.player) { P.pos[0] = d.player.x; P.pos[2] = d.player.z; P.yaw = d.player.yaw; P.battery = Math.max(35, d.player.battery); P.film = Math.max(3, d.player.film); P.sanity = Math.max(60, d.player.sanity); P.gy = W.heightAt(P.pos[0], P.pos[2]); }
    Pz.fireWhite = false; H.Main.cinematic = false;
    AI.reset(); Pz.sync();
  };
  Pz.checkpoint = function () { H.Main.save(true); };
  Pz.inventoryList = function () {
    var out = [], k;
    for (k in Pz.inv) out.push({ name: CFG.ITEMS[k].name, desc: CFG.ITEMS[k].desc });
    var ph = []; for (k = 0; k < 3; k++) if (Pz.flags['photo' + k]) ph.push(['TRÓI — 3', 'THIÊU — 7', 'DÌM — 5'][k]);
    if (ph.length) out.push({ name: 'Ảnh hiện trường (' + ph.length + '/3)', desc: ph.join('   ·   ') });
    return out;
  };
  Pz.diaryList = function () { return CFG.DIARIES.filter(function (d) { return Pz.read[d.id]; }); };
})();
