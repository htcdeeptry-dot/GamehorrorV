/* HUYẾT LỆ THÔN — main.js
   Vòng lặp engine, nạp tài nguyên theo bước, bộ chuyển cấu hình đồ hoạ + độ phân giải động,
   HUD/giao diện, nhập liệu, lưu/tải và điều phối sự kiện. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var CFG = H.CFG, R = H.R, M = H.M, W = H.World, P = H.Player, AI = H.AI, Pz = H.Puzzles, A = H.Audio, FX = H.FX;
  var CS = H.Cutscenes;
  var Main = H.Main = { state: 'loading', cinematic: false, time: 0, lastSave: null, locked: false };
  var Input = H.Input = { keys: {}, pressed: {}, dx: 0, dy: 0, fire: false };
  var $ = function (id) { return document.getElementById(id); };
  var ENV0 = JSON.parse(JSON.stringify(R.env));

  /* ===================== THIẾT LẬP ===================== */
  var S = H.Settings = JSON.parse(JSON.stringify(CFG.DEFAULT_SETTINGS)), firstRun = true;
  try { var sv = JSON.parse(localStorage.getItem(CFG.SET_KEY)); if (sv) { for (var kk in sv) if (kk in S) S[kk] = sv[kk]; firstRun = false; } } catch (e) { }
  var bootTex = S.tex;
  function saveSettings() { try { localStorage.setItem(CFG.SET_KEY, JSON.stringify(S)); } catch (e) { } }
  function applyPreset(name) {
    if (name === 'auto') name = detectPreset();
    var q = CFG.QUALITY[name]; for (var k in q) if (k !== 'label') S[k] = q[k];
    S.preset = name; R.dynScale = 1; saveSettings(); buildSettingsUI();
  }
  /* dò cấu hình theo tên GPU */
  function detectPreset() {
    var g = (R.gpuName || '').toLowerCase();
    if (/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(g)) return 'low';
    if (/rtx\s?(30|40|50)[5-9]0|rx\s?(68|69|7[7-9]|9)\d\d|apple m[2-9] (max|ultra)/.test(g)) return 'ultra';
    if (/rtx|gtx\s?(1[06-9]|16)\d\d|rx\s?(5[5-9]|6|7)\d\d|arc|apple m\d/.test(g)) return 'high';
    if (/intel|uhd|iris|hd graphics|mali|adreno|powervr|gt\s?\d{3}|mx\d/.test(g)) return /iris xe|iris\(r\) xe/.test(g) ? 'medium' : 'low';
    return 'medium';
  }
  var OPTS = [
    ['scale', 'Tỉ lệ kết xuất', 'range', 0.4, 1, 0.05, function (v) { return Math.round(v * 100) + '%'; }],
    ['view', 'Tầm nhìn xa', 'range', 60, 180, 5, function (v) { return v + ' m'; }],
    ['rain', 'Mật độ mưa', 'range', 0, 9000, 300, function (v) { return v; }],
    ['bamboo', 'Mật độ rừng tre', 'range', 0.15, 1, 0.05, function (v) { return Math.round(v * 2200); }],
    ['lights', 'Số đèn động', 'range', 2, 12, 1, function (v) { return v; }],
    ['dpr', 'Giới hạn độ nét (DPR)', 'range', 1, 2, 0.25, function (v) { return v + 'x'; }],
    ['tex', 'Texture (cần tải lại)', 'select', [256, 512, 1024]],
    ['aniso', 'Lọc bất đẳng hướng', 'select', [1, 2, 4, 8]],
    ['sharpen', 'Làm nét hình ảnh', 'check'], ['ssao', 'Đổ bóng khe (SSAO)', 'check'],
    ['bloom', 'Bloom (quầng sáng)', 'check'], ['normal', 'Normal map', 'check'], ['chroma', 'Sắc sai / méo ống kính', 'check'],
    ['mistNoise', 'Sương cuộn (noise)', 'check'], ['grain', 'Hạt phim', 'check'], ['dynRes', 'Độ phân giải động', 'check'],
    ['targetFps', 'FPS mục tiêu', 'range', 30, 120, 5, function (v) { return v; }],
    ['fov', 'Góc nhìn (FOV)', 'range', 60, 95, 1, function (v) { return v + '°'; }],
    ['sens', 'Độ nhạy chuột', 'range', 0.3, 2.5, 0.05, function (v) { return v.toFixed(2); }],
    ['volume', 'Âm lượng', 'range', 0, 1, 0.05, function (v) { return Math.round(v * 100) + '%'; }],
    ['showFps', 'Hiện FPS & thống kê', 'check']
  ];
  function buildSettingsUI() {
    var g = $('settingsGrid'); g.innerHTML = '';
    OPTS.forEach(function (o) {
      var row = document.createElement('div'); row.className = 'opt';
      var lab = document.createElement('span'); lab.textContent = o[1]; row.appendChild(lab);
      var inp, out = document.createElement('output');
      if (o[2] === 'range') {
        inp = document.createElement('input'); inp.type = 'range'; inp.min = o[3]; inp.max = o[4]; inp.step = o[5]; inp.value = S[o[0]]; out.textContent = o[6](+S[o[0]]);
        inp.oninput = function () { S[o[0]] = +inp.value; out.textContent = o[6](+inp.value); changed(o[0]); };
      } else if (o[2] === 'check') {
        inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!S[o[0]];
        inp.onchange = function () { S[o[0]] = inp.checked; changed(o[0]); };
      } else {
        inp = document.createElement('select');
        o[3].forEach(function (v) { var op = document.createElement('option'); op.value = v; op.textContent = v; if (S[o[0]] === v) op.selected = true; inp.appendChild(op); });
        inp.onchange = function () { S[o[0]] = +inp.value; changed(o[0]); };
      }
      row.appendChild(inp); row.appendChild(out); g.appendChild(row);
    });
    [].forEach.call($('presets').children, function (b) { b.className = b.dataset.preset === S.preset ? 'on' : ''; });
    $('btnReload').className = S.tex !== bootTex ? '' : 'hidden';
  }
  function changed(key) {
    if (key !== 'fov' && key !== 'sens' && key !== 'volume' && key !== 'showFps' && key !== 'targetFps' && key !== 'dynRes') { S.preset = 'custom'; [].forEach.call($('presets').children, function (b) { b.className = ''; }); }
    if (key === 'volume') A.setVolume(S.volume);
    if (key === 'scale') R.dynScale = 1;
    $('btnReload').className = S.tex !== bootTex ? '' : 'hidden';
    saveSettings();
  }

  /* ===================== GIAO DIỆN ===================== */
  var subT = 0, toastT = 0, saveT = 0, uiOpen = null, kp = null;
  var UI = H.UI = {
    subtitle: function (t, d) { var e = $('subtitle'); e.textContent = t; e.className = 'show'; subT = d || 4; },
    toast: function (t) { var e = $('toast'); e.textContent = t; e.className = 'show'; toastT = 3; },
    objective: function (t) { var e = $('objText'); if (e.textContent === t) return; e.textContent = t; var o = $('objective'); o.className = ''; void o.offsetWidth; o.className = 'flash'; },
    prompt: function (t) { var e = $('prompt'); if (t) { if (e.textContent !== t) e.textContent = t; e.className = 'show'; } else e.className = ''; },
    note: function (title, sub, text) { $('noteTitle').textContent = title; $('noteSub').textContent = sub; $('noteBody').textContent = text; openUI('note'); A.click(0.2); },
    keypad: function (n, title, cb) {
      kp = { n: n, code: '', cb: cb }; $('kpTitle').textContent = title; $('kpDisplay').className = ''; kpShow(); openUI('keypad');
    },
    choice: function (text, opts, cb) {
      $('choiceText').textContent = text; var c = $('choiceBtns'); c.innerHTML = '';
      opts.forEach(function (o, i) { var b = document.createElement('button'); b.textContent = o; b.onclick = function () { closeUI(true); cb(i); }; c.appendChild(b); });
      openUI('choice');
    }
  };
  function kpShow() { var s = ''; for (var i = 0; i < kp.n; i++) s += kp.code[i] || '·'; $('kpDisplay').textContent = s; }
  function kpPress(d) {
    if (!kp) return;
    if (d === 'del') { kp.code = kp.code.slice(0, -1); A.click(0.2); return kpShow(); }
    if (kp.code.length >= kp.n) return;
    kp.code += d; A.beep(520 + (+d) * 40, 0.07); kpShow();
    if (kp.code.length === kp.n) {
      var k = kp;
      setTimeout(function () {
        if (k.cb(k.code)) { A.beep(990, 0.3); closeUI(); }
        else { A.beep(140, 0.35); $('kpDisplay').className = 'bad'; setTimeout(function () { k.code = ''; $('kpDisplay').className = ''; if (kp === k) kpShow(); }, 380); }
      }, 160);
    }
  }
  (function () { var c = $('kpKeys'); ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'].forEach(function (d) { var b = document.createElement('button'); b.textContent = d === 'del' ? '⌫' : d; b.onclick = function () { kpPress(d); }; c.appendChild(b); }); })();
  function show(id, on) { $(id).classList.toggle('hidden', !on); }
  /* mở bảng phủ trong lúc chơi (tạm ngưng mô phỏng) */
  function openUI(id) {
    if (uiOpen) show(uiOpen, false);
    uiOpen = id; show(id, true);
    if (Main.state === 'play') { Main.state = 'ui'; unlock(); }
  }
  function closeUI(keepState) {
    if (!uiOpen) return; show(uiOpen, false); var was = uiOpen; uiOpen = null; kp = was === 'keypad' ? null : kp;
    if (Main.state === 'ui') { Main.state = 'play'; lock(); }
    else if (Main.back) { show(Main.back, true); Main.back = null; }
  }
  function openInventory() {
    var it = $('invItems'), di = $('invDiaries'); it.innerHTML = ''; di.innerHTML = '';
    var list = Pz.inventoryList();
    if (!list.length) it.innerHTML = '<div class="inv-empty">Chưa có gì ngoài chiếc đèn pin.</div>';
    list.forEach(function (o) { var d = document.createElement('div'); d.className = 'inv-item'; var b = document.createElement('b'); b.textContent = o.name; var s = document.createElement('span'); s.textContent = o.desc; d.appendChild(b); d.appendChild(s); it.appendChild(d); });
    var ds = Pz.diaryList(); $('invCount').textContent = '(' + ds.length + '/' + CFG.DIARIES.length + ')';
    if (!ds.length) di.innerHTML = '<div class="inv-empty">Chưa tìm thấy trang nào.</div>';
    ds.forEach(function (o) { var d = document.createElement('div'); d.className = 'inv-item link'; var b = document.createElement('b'); b.textContent = o.title; var s = document.createElement('span'); s.textContent = o.sub; d.appendChild(b); d.appendChild(s); d.onclick = function () { UI.note(o.title, o.sub, o.text); }; di.appendChild(d); });
    openUI('inventory');
  }

  /* ===================== NHẬP LIỆU ===================== */
  var canvas = $('game'), expectUnlock = false;
  function lock() { if (document.pointerLockElement !== canvas && canvas.requestPointerLock) { try { var p = canvas.requestPointerLock(); if (p && p.catch) p.catch(function () { }); } catch (e) { } } }
  function unlock() { if (document.pointerLockElement) { expectUnlock = true; document.exitPointerLock(); } }
  document.addEventListener('pointerlockchange', function () {
    Main.locked = document.pointerLockElement === canvas;
    if (!Main.locked && Main.state === 'play' && !expectUnlock) pause();
    expectUnlock = false;
  });
  canvas.addEventListener('mousedown', function (e) {
    if (Main.state !== 'play') return;
    if (!Main.locked && !Main.noLock) { lock(); return; }
    if (e.button === 0) Input.fire = true;
  });
  document.addEventListener('mousemove', function (e) { if ((Main.locked || Main.noLock) && Main.state === 'play') { Input.dx += e.movementX || 0; Input.dy += e.movementY || 0; } });
  document.addEventListener('keydown', function (e) {
    var c = e.code;
    if (Main.state === 'play' || Main.state === 'ui' || Main.state === 'cutscene') { if (c === 'Tab' || c === 'Space' || c.indexOf('Arrow') === 0 || (e.ctrlKey && /Key[SDAFERPX]/.test(c))) e.preventDefault(); }
    if (Main.state === 'intro') { skipIntro(); return; }
    if (Main.state === 'cutscene') { if (c === 'Enter' || c === 'Space' || c === 'Escape') { e.preventDefault(); CS.skip(); } return; }
    if (Main.state === 'ui') {
      if (e.repeat) return;
      if (uiOpen === 'keypad') { if (/^(Digit|Numpad)\d$/.test(c)) kpPress(c.slice(-1)); else if (c === 'Backspace') { kpPress('del'); e.preventDefault(); } }
      if (c === 'Escape' || (c === 'KeyE' && uiOpen !== 'keypad' && uiOpen !== 'choice') || (c === 'Tab' && uiOpen === 'inventory')) { if (uiOpen !== 'choice') closeUI(); }
      return;
    }
    if (Main.state === 'paused' && (c === 'Escape' || c === 'KeyP') && !uiOpen) { resume(); return; }
    if (Main.state !== 'play') return;
    if (!e.repeat) Input.pressed[c] = true;
    Input.keys[c] = true;
    if (c === 'KeyE' && !e.repeat) Pz.use();
    if (c === 'Tab' && !e.repeat) openInventory();
    if (c === 'KeyP' && !e.repeat) pause();
  });
  document.addEventListener('keyup', function (e) { Input.keys[e.code] = false; });
  window.addEventListener('blur', function () { Input.keys = {}; if (Main.state === 'play') pause(); });
  window.addEventListener('beforeunload', function (e) { if (Main.state === 'play' || Main.state === 'ui' || Main.state === 'cutscene') { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ===================== TRẠNG THÁI TRÒ CHƠI ===================== */
  function pause() { if (Main.state !== 'play') return; Main.state = 'paused'; unlock(); show('pause', true); A.suspend(true); }
  function resume() { show('pause', false); Main.state = 'play'; A.suspend(false); lock(); }
  function resetEnv() { var e = R.env; for (var k in ENV0) e[k] = Array.isArray(ENV0[k]) ? ENV0[k].slice() : ENV0[k]; var p = R.post; p.fade = 0; p.white = 0; p.veins = 0; p.desat = 0; p.view = 0; p.scan = 0; p.exposure = 1.15; A.rainAmt = 1; W.mistMul = 1; W.lanterns.forEach(function (L) { L.blueT = 0; L.off = false; }); AI.calm = false; }
  function hasSave() { try { return !!localStorage.getItem(CFG.SAVE_KEY); } catch (e) { return !!Main.lastSave; } }
  Main.save = function (auto) {
    var d = Pz.serialize(); Main.lastSave = JSON.parse(JSON.stringify(d));
    try { localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(d)); } catch (e) { }
    $('saveIcon').className = 'show'; saveT = 2.5; if (!auto) UI.toast(CFG.LINES.saved);
  };
  function loadSave() { try { var d = JSON.parse(localStorage.getItem(CFG.SAVE_KEY)); if (d && d.v === 1) return d; } catch (e) { } return Main.lastSave; }
  function startGame(data) {
    A.init(); A.setVolume(S.volume); A.suspend(false);
    ['menu', 'death', 'ending', 'pause'].forEach(function (id) { show(id, false); });
    resetEnv(); FX.list.length = 0;
    if (AI.rig && AI.wasCalm) { location.reload(); return; }
    Pz.load(data || {}); Main.lastSave = data ? JSON.parse(JSON.stringify(data)) : null;
    show('hud', true); R.post.fade = 0;
    if (!data) { Main.state = 'play'; R.post.fade = 1; lock(); Main.cutscene('intro', function () { Main.fadeIn = 2; UI.subtitle(CFG.LINES.start, 7); UI.objective(CFG.OBJECTIVES.o1); }); } else { Main.state = 'play'; Main.fadeIn = 1.5; lock(); UI.objective(CFG.OBJECTIVES[Pz.objective]); }
  }
  var introI = 0, introTimer = null;
  function intro() {
    Main.state = 'intro'; show('intro', true); introI = 0;
    var el = $('introText');
    (function next() {
      if (Main.state !== 'intro') return;
      if (introI >= CFG.LINES.intro.length) return skipIntro();
      el.style.opacity = 0;
      introTimer = setTimeout(function () { el.textContent = CFG.LINES.intro[introI++]; el.style.opacity = 1; introTimer = setTimeout(next, 3400); }, 700);
    })();
  }
  function skipIntro() {
    if (Main.state !== 'intro') return; clearTimeout(introTimer); show('intro', false); Main.state = 'play'; Main.fadeIn = 2.5; lock();
    UI.subtitle(CFG.LINES.start, 7); UI.objective(CFG.OBJECTIVES.o1); W.strike(false);
  }
  $('intro').addEventListener('click', skipIntro);
  function die() {
    Main.state = 'dead'; unlock(); P.dead = false; show('death', true); UI.prompt(null); Input.keys = {};
    A.tension = 0; A.hunt = 0;
  }
  function toMenu() {
    ['pause', 'death', 'ending', 'hud', 'intro'].forEach(function (id) { show(id, false); });
    $('cine').className = ''; CS.active = null;
    if (uiOpen) { show(uiOpen, false); uiOpen = null; }
    if (AI.wasCalm) { location.reload(); return; }
    Main.state = 'menu'; Main.cinematic = false; resetEnv(); AI.reset(); A.suspend(false); A.tension = 0; A.hunt = 0;
    R.env.flCol[0] = R.env.flCol[1] = R.env.flCol[2] = 0; R.env.flHaze = 0;
    show('menu', true); show('btnContinue', hasSave());
  }
  /* ---------- cắt cảnh ---------- */
  Main.cutscene = function (id, done, tries) {
    if (Main.state !== 'play') { if ((tries || 0) < 240 && Main.state !== 'menu' && Main.state !== 'dead' && Main.state !== 'ending') setTimeout(function () { Main.cutscene(id, done, (tries || 0) + 1); }, 250); return; }
    Main.state = 'cutscene'; show('hud', false); UI.prompt(null); Input.keys = {}; P.vel[0] = P.vel[1] = 0;
    CS.play(id, function () { Main.state = 'play'; show('hud', true); Input.keys = {}; if (done) done(); });
  };
  /* ---------- kết thúc ---------- */
  var endSeq = null;
  Main.ending = function (type) {
    Main.state = 'ending'; Main.cinematic = true; unlock(); UI.prompt(null);
    endSeq = { type: type, t: 0, shown: -1, lines: CFG.ENDINGS[type].lines }; $('cine').className = 'show'; $('cineSub').className = ''; show('hud', false); $('cineSkip').style.display = 'none';
    if (type !== 'bad') { AI.setCalm(); AI.wasCalm = true; Pz.fireWhite = true; A.bell(null, 196); setTimeout(function () { A.bell(null, 147); }, 2500); W.lanterns.forEach(function (L) { L.blueT = 0; }); }
    else { AI.wasCalm = true; A.slam(null); A.scream(null, true); W.props.temple.door.target = 0; W.lanterns.forEach(function (L) { L.off = true; }); }
  };
  function endingUpdate(dt) {
    var s = endSeq, e = R.env, p = R.post; s.t += dt;
    if (s.type !== 'bad') {
      var k = Math.min(1, s.t / 9);
      e.moonTint[0] = M.lerp(1.0, 0.85, k); e.moonTint[1] = M.lerp(0.16, 0.9, k); e.moonTint[2] = M.lerp(0.1, 1.0, k);
      e.moonCol[0] = M.lerp(0.11, 0.16, k); e.moonCol[1] = M.lerp(0.03, 0.18, k); e.moonCol[2] = M.lerp(0.03, 0.24, k);
      e.rain = 1 - k; A.rainAmt = 1 - k; W.mistMul = 1 - k * 0.7; p.veins *= 0.9; p.desat = 0; A.tension = Math.max(0, 0.4 - k); A.stress = 0;
      p.fade = M.smooth(11, 15, s.t); p.white = M.smooth(6, 8, s.t) * (1 - M.smooth(8, 9, s.t)) * 0.5;
      AI.pos[1] += dt * 0.12 * M.smooth(5, 9, s.t);
    } else {
      W.props.temple.fireLight.intensity *= 0.8; p.fade = M.smooth(1.2, 3.2, s.t); p.veins = Math.min(1, s.t); A.tension = 1;
    }
    var start = s.type !== 'bad' ? 15 : 3.4, idx = Math.floor((s.t - start) / 5.2);
    if (s.t > start && idx !== s.shown && idx <= s.lines.length) {
      s.shown = idx; show('ending', true); show('hud', false);
      var el = $('endText'), ti = $('endTitle');
      if (idx < s.lines.length) { ti.textContent = ''; el.style.opacity = 0; setTimeout(function () { el.textContent = s.lines[idx]; el.style.opacity = 1; }, 600); }
      else { el.style.opacity = 0; setTimeout(function () { el.textContent = ''; ti.textContent = CFG.ENDINGS[s.type].title; ti.className = 'title' + (s.type === 'bad' ? ' red' : ''); show('btnEndQuit', true); }, 700); try { if (s.type !== 'bad') localStorage.removeItem(CFG.SAVE_KEY); } catch (e2) { } }
    }
  }

  /* ===================== HUD ===================== */
  var hudAcc = 0;
  function hud(dt) {
    hudAcc += dt;
    $('viewfinder').className = P.camAnim > 0.5 ? 'show' : '';
    $('hideOverlay').className = P.hidden ? 'show' : '';
    $('mirror').className = P.mirrorUp ? 'show' : '';
    $('crosshair').style.opacity = P.camAnim > 0.5 || P.hidden ? 0 : 1;
    if (P.mirrorUp) {
      var m = Pz.mirror, g = $('mirrorGlow');
      g.style.opacity = m.str; g.style.transform = 'translate(' + (-Math.sin(m.ang) * 70).toFixed(1) + 'px,' + (-Math.cos(m.ang) * 70).toFixed(1) + 'px) scale(' + (0.5 + m.str * 1.2).toFixed(2) + ')';
      $('mirrorTxt').textContent = m.str <= 0 ? 'Mặt gương tối im.' : (m.dist < 16 ? 'Gương rực sáng — lễ vật ở rất gần!' : 'Vệt sáng chỉ hướng lễ vật...');
    }
    var hb = $('bpm').firstElementChild, beat = A.ready && A.beatAt !== undefined ? Math.exp(-Math.max(0, A.ctx.currentTime - A.beatAt) * 9) : 0;
    hb.style.transform = 'scale(' + (1 + beat * 0.5).toFixed(2) + ')';
    if (hudAcc < 0.1) return; hudAcc = 0;
    function bar(id, v, low) { var b = $(id); b.querySelector('i').style.width = Math.max(0, Math.min(100, v)).toFixed(0) + '%'; b.classList.toggle('low', v < low); }
    bar('bSanity', P.sanity, 30); bar('bStamina', P.stamina, 20); bar('bBattery', P.battery, 15);
    $('bpmVal').textContent = Math.round(P.bpm);
    $('vfFilm').textContent = P.film;
    var vf = $('vfFlash'); vf.textContent = P.film <= 0 ? '✕ HẾT PHIM' : (P.flashCD > 0 ? '⚡ ĐANG NẠP...' : '⚡ SẴN SÀNG'); vf.className = P.flashCD > 0 ? 'charging' : '';
    if (P.hidden) $('breath').querySelector('i').style.width = (P.breath / CFG.PLAYER.breathMax * 100).toFixed(0) + '%';
    $('lockHint').className = !Main.locked && Main.state === 'play' && !Main.noLock ? 'show' : '';
  }
  function timers(dt) {
    if (subT > 0) { subT -= dt; if (subT <= 0) $('subtitle').className = ''; }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').className = ''; }
    if (saveT > 0) { saveT -= dt; if (saveT <= 0) $('saveIcon').className = ''; }
  }

  /* ===================== VÒNG LẶP ===================== */
  var last = 0, fpsAcc = 0, fpsN = 0, fps = 60, fw = [0, 0, 0], dynT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) {
      fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
      // độ phân giải động: giữ FPS mục tiêu bằng cách co giãn buffer kết xuất
      if (S.dynRes && (Main.state === 'play' || Main.state === 'menu')) {
        dynT++;
        if (fps < S.targetFps * 0.88) R.dynScale = Math.max(0.65, R.dynScale - (fps < S.targetFps * 0.6 ? 0.12 : 0.06));
        else if (fps > S.targetFps * 1.12 && R.dynScale < 1 && dynT % 4 === 0) R.dynScale = Math.min(1, R.dynScale + 0.05);
      } else if (!S.dynRes) R.dynScale = 1;
      if (S.showFps) $('fps').textContent = fps.toFixed(0) + ' FPS  ' + Math.round(R.sceneRT ? R.sceneRT.w : 0) + 'x' + (R.sceneRT ? R.sceneRT.h : 0) + '\n' + R.stats.draws + ' draw  ' + Math.round(R.stats.tris / 1000) + 'k tri'; else if ($('fps').textContent) $('fps').textContent = '';
    }
    var st = Main.state, e = R.env;
    if (st === 'play') {
      Main.time += dt; e.time = Main.time;
      P.update(dt, Main.time); W.update(dt, Main.time, P.pos); AI.update(dt, Main.time); Pz.update(dt, Main.time); FX.update(dt, e.wind);
      P.forward(fw); A.update(dt, R.cam.pos, fw); hud(dt); timers(dt);
      if (Main.fadeIn > 0) { Main.fadeIn -= dt; R.post.fade = Math.max(0, Main.fadeIn / 2.5); }
      if (P.dead) die();
    } else if (st === 'ending') {
      Main.time += dt; e.time = Main.time; Input.keys = {};
      P.update(dt, Main.time); W.update(dt, Main.time, P.pos); AI.update(dt, Main.time); Pz.update(dt, Main.time); FX.update(dt, e.wind);
      CS.endCam(endSeq.type, endSeq.t, Main.time);
      P.forward(fw); A.update(dt, R.cam.pos, fw); endingUpdate(dt); timers(dt);
    } else if (st === 'cutscene') {
      Main.time += dt; e.time = Main.time;
      CS.update(dt, Main.time); W.update(dt, Main.time, R.cam.pos); if (AI.ritual) AI.update(dt, Main.time); FX.update(dt, e.wind);
      fw[0] = -Math.sin(R.cam.yaw); fw[1] = 0; fw[2] = -Math.cos(R.cam.yaw); A.update(dt, R.cam.pos, fw); timers(dt);
    } else if (st === 'menu' || st === 'intro' || st === 'dead') {
      Main.time += dt; e.time = Main.time;
      if (st !== 'dead') { // camera lượn chậm trước cổng làng
        var t = Main.time * 0.05, c = R.cam;
        c.pos[0] = Math.sin(t) * 3.2; c.pos[2] = 66 + Math.cos(t * 0.7) * 4; c.pos[1] = W.terrainH(c.pos[0], c.pos[2]) + 2.1 + Math.sin(t * 1.3) * 0.25; c.yaw = Math.sin(t * 0.8) * 0.12 - c.pos[0] * 0.02; c.pitch = 0.12; c.roll = 0; c.fov = 62;
        R.post.fade = st === 'intro' ? 1 : 0; R.post.vignette = 0.75; R.post.aberr = 0.003; R.post.barrel = 0.05; R.post.view = 0; R.post.scan = 0; R.post.veins = 0;
      } else R.post.fade = 1;
      W.update(dt, Main.time, c ? c.pos : null); FX.update(dt, e.wind);
      if (A.ready) { fw[0] = 0; fw[1] = 0; fw[2] = -1; A.stress = 0; A.bpm = 60; A.update(dt, R.cam.pos, fw); }
    }
    if (st !== 'loading') R.render();
    Input.pressed = {}; Input.dx = 0; Input.dy = 0; Input.fire = false;
  }

  /* ===================== KHỞI ĐỘNG ===================== */
  function boot() {
    if (!R.init(canvas)) { show('loading', false); show('fatal', true); return; }
    R.q = S;
    if (firstRun) { var pr = detectPreset(), q = CFG.QUALITY[pr]; for (var k in q) if (k !== 'label') S[k] = q[k]; S.preset = pr; bootTex = S.tex; saveSettings(); }
    $('gpuInfo').textContent = 'GPU: ' + R.gpuName + '  ·  Cấu hình: ' + (CFG.QUALITY[S.preset] ? CFG.QUALITY[S.preset].label : 'Tuỳ chỉnh') + '  ·  v' + CFG.VERSION;
    var steps = [], Aset = H.Assets;
    Aset.list.forEach(function (t, i) { steps.push(['Dệt vật liệu: ' + ['gỗ lim cổ thụ', 'đá ong rêu phong', 'sân bùn ướt', 'ngói âm dương', 'vỏ cây đa', 'lụa điều', 'bùa chu sa'][i] + '...', function () { Aset.build(i, S.tex); }]); });
    W.steps.forEach(function (s) { steps.push(s); });
    steps.push(['Đánh thức Lệ Nương...', function () { AI.init(); P.reset(); CS.init(); Pz.init(); AI.reset(); }]);
    var i = 0;
    (function next() {
      if (i >= steps.length) { ready(); return; }
      $('loadText').textContent = steps[i][0]; $('loadFill').style.width = Math.round(i / steps.length * 100) + '%';
      setTimeout(function () { try { steps[i][1](); } catch (err) { console.error('Lỗi bước tải ' + i, err); $('loadText').textContent = 'Lỗi: ' + err.message; throw err; } i++; requestAnimationFrame(next); }, 30);
    })();
  }
  function ready() {
    $('loadFill').style.width = '100%';
    buildSettingsUI();
    Main.state = 'menu'; show('loading', false); show('menu', true); show('btnContinue', hasSave());
    requestAnimationFrame(function (t) { last = t; frame(t); });
  }
  // nút bấm
  $('btnNew').onclick = function () { try { localStorage.removeItem(CFG.SAVE_KEY); } catch (e) { } startGame(null); };
  $('btnContinue').onclick = function () { startGame(loadSave()); };
  $('btnResume').onclick = resume;
  $('btnSave').onclick = function () { Main.save(false); };
  $('btnQuit').onclick = toMenu; $('btnDeathQuit').onclick = toMenu; $('btnEndQuit').onclick = toMenu;
  $('btnRetry').onclick = function () { startGame(Main.lastSave || {}); };
  $('btnReload').onclick = function () { location.reload(); };
  $('btnFull').onclick = function () {
    var d = document.documentElement;
    if (!document.fullscreenElement) { (d.requestFullscreen || d.webkitRequestFullscreen).call(d); try { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape', 'KeyW', 'Tab']).catch(function () { }); } catch (e) { } }
    else document.exitFullscreen();
  };
  [].forEach.call(document.querySelectorAll('[data-open]'), function (b) {
    b.onclick = function () { var from = b.closest('.screen').id; show(from, false); Main.back = from; uiOpen = b.dataset.open; show(uiOpen, true); if (uiOpen === 'settings') buildSettingsUI(); };
  });
  [].forEach.call(document.querySelectorAll('[data-close]'), function (b) { b.onclick = function () { closeUI(); }; });
  [].forEach.call($('presets').children, function (b) { b.onclick = function () { applyPreset(b.dataset.preset); }; });
  document.addEventListener('pointerlockerror', function () { Main.noLock = true; });

  /* công cụ gỡ lỗi / kiểm thử */
  H.debug = {
    tp: function (x, z, yaw) { P.pos[0] = x; P.pos[2] = z; if (yaw !== undefined) P.yaw = yaw; P.gy = W.heightAt(x, z); },
    give: function (id) { Pz.inv[id] = 1; }, flag: function (k) { Pz.flags[k] = 1; Pz.sync(); },
    hunt: function () { AI.enabled = true; AI.forceHunt(P.pos[0] + 8, P.pos[2]); }, state: function () { return Main.state + ' / ' + AI.state; }
  };
  window.addEventListener('load', boot);
})();
