/* HUYẾT LỆ THÔN — audio.js
   Engine âm thanh 100% tổng hợp bằng Web Audio API: HRTF 3D, reverb convolver sinh
   thủ tục, mưa bão, sấm, bước chân theo vật liệu, tiếng khóc, thì thầm đảo ngược,
   nhạc drone căng thẳng và bộ gõ khi bị săn đuổi. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var Au = H.Audio = { ready: false, tension: 0, hunt: 0, indoor: 0, bpm: 65, stress: 0 };
  var ctx, master, verb, dry, noiseBuf, nodes = {};

  function noiseBuffer(sec) {
    var b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  /* impulse response thủ tục: thung lũng/đình vắng */
  function impulse(sec, decay) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c), lp = 0;
      for (var i = 0; i < n; i++) {
        var t = i / n, e = Math.pow(1 - t, decay);
        var w = Math.random() * 2 - 1; lp += (w - lp) * (0.6 - t * 0.5);
        d[i] = lp * e * (i < 400 ? i / 400 : 1);
        if (i % 3571 === (c ? 900 : 0) && t < 0.25) d[i] += (Math.random() - 0.5) * 1.6 * e; // phản xạ sớm
      }
    }
    return b;
  }
  function gain(v, to) { var g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; }
  function filt(type, f, q, to) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; if (to) b.connect(to); return b; }
  function osc(type, f, to) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (to) o.connect(to); return o; }
  function noiseSrc(to, loop) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = loop !== false; if (to) s.connect(to); return s; }
  /* bus ra: khô + gửi reverb */
  function out(send) { var g = gain(1, dry); if (send) { var s = gain(send, verb); g.connect(s); } return g; }
  function panner(x, y, z, send) {
    var p = ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2.5; p.maxDistance = 80; p.rolloffFactor = 1.3;
    setPos(p, x, y, z); p.connect(dry);
    if (send) { var s = gain(send, verb); p.connect(s); }
    return p;
  }
  function setPos(p, x, y, z) { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); }
  function env(g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }

  Au.init = function () {
    if (Au.ready) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = Au.ctx = new AC();
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.connect(ctx.destination);
    master = gain(0.8, comp); dry = gain(1, master);
    var cv = ctx.createConvolver(); cv.buffer = impulse(3.6, 2.4); verb = gain(1, cv); cv.connect(gain(0.6, master));
    noiseBuf = noiseBuffer(3);

    // --- mưa
    var rg = nodes.rain = gain(0, dry), rlp = nodes.rainLP = filt('lowpass', 7500, 0.5, rg), rhp = filt('highpass', 700, 0.5, rlp);
    noiseSrc(rhp).start();
    var rg2 = nodes.rainLow = gain(0, dry); var r2 = filt('lowpass', 420, 0.6, rg2); noiseSrc(r2).start(0, 1.1);
    // tiếng mưa gõ mái khi ở trong nhà
    var rp = nodes.roofG = gain(0, dry); var rpf = filt('bandpass', 2300, 1.6, rp); noiseSrc(rpf).start(0, 0.5);
    // --- gió núi hú
    var wg = nodes.wind = gain(0, dry), wb = nodes.windBP = filt('bandpass', 380, 2.2, wg); noiseSrc(wb).start(0, 2.0);
    var wg2 = nodes.wind2 = gain(0, dry), wb2 = nodes.windBP2 = filt('bandpass', 900, 6, wg2); noiseSrc(wb2).start(0, 0.3);
    wg2.connect(gain(0.4, verb));
    // --- drone căng thẳng
    var dg = nodes.drone = gain(0, dry), dlp = nodes.droneLP = filt('lowpass', 240, 1.2, dg);
    [36.7, 36.95, 51.9, 73.9].forEach(function (f, i) { var o = osc(i < 2 ? 'sawtooth' : 'triangle', f, gain(i < 2 ? 0.5 : 0.3, dlp)); o.start(); });
    dg.connect(gain(0.5, verb));
    // --- cụm dây nghịch tai
    var sg = nodes.strings = gain(0, dry), slp = filt('lowpass', 1500, 0.8, sg); nodes.strOsc = [];
    [311.1, 329.6, 349.2, 466.2, 493.9].forEach(function (f, i) {
      var g = gain(0.12, slp), o = osc('sawtooth', f, g), l = osc('sine', 0.07 + i * 0.043, null), lg = gain(0.1, g.gain);
      l.connect(lg); l.start(); o.start();
      var vib = osc('sine', 4.5 + i * 0.6, null), vg = gain(f * 0.006, o.frequency); vib.connect(vg); vib.start();
      nodes.strOsc.push(o);
    });
    sg.connect(gain(0.9, verb));
    // --- nhịp tim
    nodes.heart = gain(0, dry);
    Au.ready = true; Au.nextBeat = 0; Au.nextPerc = 0; Au.percStep = 0; Au.windT = 0; Au.setVolume(Au.volume === undefined ? 0.8 : Au.volume);
  };
  Au.setVolume = function (v) { Au.volume = v; if (master) master.gain.value = v; };
  Au.suspend = function (s) { if (!ctx) return; if (s) ctx.suspend(); else ctx.resume(); };

  /* cập nhật mỗi frame: listener, lớp nền, nhịp tim, bộ gõ */
  Au.update = function (dt, cam, fwd) {
    if (!Au.ready) return;
    var t = ctx.currentTime, L = ctx.listener;
    if (L.positionX) {
      L.positionX.value = cam[0]; L.positionY.value = cam[1]; L.positionZ.value = cam[2];
      L.forwardX.value = fwd[0]; L.forwardY.value = fwd[1]; L.forwardZ.value = fwd[2]; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(cam[0], cam[1], cam[2]); L.setOrientation(fwd[0], fwd[1], fwd[2], 0, 1, 0); }
    var k = 0.08, ind = Au.indoor, rainAmt = Au.rainAmt === undefined ? 1 : Au.rainAmt;
    nodes.rain.gain.setTargetAtTime(0.16 * rainAmt * (1 - ind * 0.72), t, k);
    nodes.rainLP.frequency.setTargetAtTime(7500 - ind * 6100, t, k);
    nodes.rainLow.gain.setTargetAtTime(0.22 * rainAmt, t, k);
    nodes.roofG.gain.setTargetAtTime(0.10 * ind * rainAmt, t, k);
    Au.windT += dt;
    var gust = 0.5 + 0.5 * Math.sin(Au.windT * 0.31) * Math.sin(Au.windT * 0.13 + 1.3);
    Au.gust = gust;
    nodes.wind.gain.setTargetAtTime((0.05 + gust * 0.12) * rainAmt * (1 - ind * 0.5), t, 0.3);
    nodes.windBP.frequency.setTargetAtTime(260 + gust * 420, t, 0.4);
    nodes.wind2.gain.setTargetAtTime(Math.max(0, gust - 0.55) * 0.09 * rainAmt, t, 0.4);
    nodes.windBP2.frequency.setTargetAtTime(700 + gust * 700 + Math.sin(Au.windT * 1.7) * 120, t, 0.3);
    var ten = Au.tension, hunt = Au.hunt;
    nodes.drone.gain.setTargetAtTime(0.05 + ten * 0.16 + hunt * 0.1, t, 0.6);
    nodes.droneLP.frequency.setTargetAtTime(160 + ten * 260 + hunt * 500, t, 0.6);
    nodes.strings.gain.setTargetAtTime(Math.max(0, ten - 0.25) * 0.085 + hunt * 0.05, t, 0.8);
    // nhịp tim
    var st = Au.stress;
    nodes.heart.gain.setTargetAtTime(Math.min(1, 0.05 + st * 1.1), t, 0.2);
    if (t >= Au.nextBeat) {
      thump(t, 62, 0.5); thump(t + Math.min(0.28, 18 / Au.bpm), 50, 0.33);
      Au.nextBeat = Math.max(t, Au.nextBeat) + 60 / Au.bpm; Au.beatAt = t;
    }
    // bộ gõ săn đuổi
    if (hunt > 0.05 && t >= Au.nextPerc) {
      var s = Au.percStep++ % 16, o = out(0.25); o.gain.value = hunt;
      if (s % 4 === 0 || s === 10 || s === 15) kick(t, o, s === 0 ? 1 : 0.7);
      if (s % 2 === 1 || Math.random() < 0.25) tick(t, o, 0.12 + Math.random() * 0.1);
      if (s === 6 || s === 14) clang(t, o);
      Au.nextPerc = Math.max(t, Au.nextPerc) + 0.105;
    }
  };
  function thump(t, f, v) {
    var g = gain(0, nodes.heart), o = osc('sine', f, g);
    o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.11);
    env(g, t, 0.008, v, 0.16); o.start(t); o.stop(t + 0.25);
  }
  function kick(t, to, v) {
    var g = gain(0, to), o = osc('sine', 110, g); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    env(g, t, 0.003, 0.7 * v, 0.22); o.start(t); o.stop(t + 0.3);
  }
  function tick(t, to, v) {
    var g = gain(0, to), f = filt('bandpass', 3000 + Math.random() * 3000, 3, g), s = noiseSrc(f, true);
    env(g, t, 0.002, v, 0.05); s.start(t, Math.random() * 2); s.stop(t + 0.08);
  }
  function clang(t, to) {
    var g = gain(0, to), c = osc('square', 233, g), m = osc('sine', 233 * 2.76, null), mg = gain(400, c.frequency);
    m.connect(mg); env(g, t, 0.002, 0.13, 0.35); c.start(t); m.start(t); c.stop(t + 0.4); m.stop(t + 0.4);
  }

  /* ---------- hiệu ứng một lần ---------- */
  Au.thunder = function (near) {
    if (!Au.ready) return; var t = ctx.currentTime, o = out(0.9);
    var g = gain(0, o), f = filt('lowpass', near ? 900 : 260, 0.6, g), s = noiseSrc(f);
    f.frequency.setValueAtTime(near ? 1400 : 300, t); f.frequency.exponentialRampToValueAtTime(55, t + 4.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(near ? 1.1 : 0.5, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.5); g.gain.linearRampToValueAtTime(0.4, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);
    s.start(t, Math.random()); s.stop(t + 6);
    if (near) { var g2 = gain(0, o), f2 = filt('highpass', 1800, 0.7, g2), s2 = noiseSrc(f2); env(g2, t, 0.002, 0.7, 0.18); s2.start(t); s2.stop(t + 0.3); }
  };
  Au.step = function (mat, loud, pos) {
    if (!Au.ready) return; var t = ctx.currentTime, o = pos ? panner(pos[0], pos[1], pos[2], 0.2) : out(0.08), v = loud;
    var g = gain(0, o), s, f;
    if (mat === 'wood') {
      var og = gain(0, o), ob = osc('sine', 95 + Math.random() * 25, og); ob.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      env(og, t, 0.004, 0.5 * v, 0.14); ob.start(t); ob.stop(t + 0.2);
      f = filt('bandpass', 420 + Math.random() * 200, 4, g); s = noiseSrc(f); env(g, t, 0.003, 0.5 * v, 0.07);
      if (Math.random() < 0.3) Au.creak(null, 0.05 * v, 0.25);
    } else if (mat === 'stone') {
      f = filt('bandpass', 2400 + Math.random() * 900, 1.6, g); s = noiseSrc(f); env(g, t, 0.002, 0.42 * v, 0.06);
    } else { // bùn nhão
      f = filt('lowpass', 700, 1, g); s = noiseSrc(f); env(g, t, 0.01, 0.55 * v, 0.12);
      var g3 = gain(0, o), f3 = filt('bandpass', 350, 5, g3), s3 = noiseSrc(f3);
      f3.frequency.setValueAtTime(300, t + 0.03); f3.frequency.exponentialRampToValueAtTime(1300, t + 0.17);
      g3.gain.setValueAtTime(0.0001, t); g3.gain.linearRampToValueAtTime(0.35 * v, t + 0.07); g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      s3.start(t, Math.random() * 2); s3.stop(t + 0.25);
    }
    s.start(t, Math.random() * 2); s.stop(t + 0.25);
  };
  Au.creak = function (pos, vol, dur) {
    if (!Au.ready) return; var t = ctx.currentTime, d = dur || 1.4, o = pos ? panner(pos[0], pos[1], pos[2], 0.5) : out(0.2);
    var g = gain(0, o), f = filt('bandpass', 1100, 9, g), c = osc('sawtooth', 70, f);
    c.frequency.setValueAtTime(55 + Math.random() * 20, t); c.frequency.linearRampToValueAtTime(120 + Math.random() * 60, t + d * 0.6); c.frequency.linearRampToValueAtTime(80, t + d);
    f.frequency.setValueAtTime(800, t); f.frequency.linearRampToValueAtTime(1900, t + d * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol === undefined ? 0.5 : vol, t + d * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    c.start(t); c.stop(t + d + 0.05);
  };
  Au.slam = function (pos) {
    if (!Au.ready) return; var t = ctx.currentTime, o = pos ? panner(pos[0], pos[1], pos[2], 0.9) : out(0.6);
    var g = gain(0, o), b = osc('sine', 80, g); b.frequency.exponentialRampToValueAtTime(40, t + 0.2); env(g, t, 0.003, 1.0, 0.35); b.start(t); b.stop(t + 0.5);
    var g2 = gain(0, o), f = filt('lowpass', 1800, 0.7, g2), s = noiseSrc(f); env(g2, t, 0.002, 0.7, 0.14); s.start(t); s.stop(t + 0.2);
  };
  /* tiếng khóc nữ: sóng răng cưa qua 3 formant, ngắt quãng theo tiếng nấc */
  Au.weep = function (pos, dur, vol) {
    if (!Au.ready) return; var t = ctx.currentTime, d = dur || 5, o = pos ? panner(pos[0], pos[1], pos[2], 1.2) : out(1.0);
    var g = gain(0, o), mix = gain(1, g);
    var c = osc('sawtooth', 430, null), vib = osc('sine', 5.6, null), vg = gain(9, c.frequency); vib.connect(vg);
    var bs = []; [[820, 9, 1], [1180, 10, 0.6], [2850, 12, 0.25]].forEach(function (fm) { var gg = gain(fm[2], mix), b = filt('bandpass', fm[0], fm[1], gg); c.connect(b); bs.push(b); });
    var tt = t, v = vol === undefined ? 0.5 : vol;
    g.gain.setValueAtTime(0.0001, t);
    while (tt < t + d) {
      var sob = 0.18 + Math.random() * 0.5, f0 = 380 + Math.random() * 160;
      c.frequency.setValueAtTime(f0 * 1.12, tt); c.frequency.exponentialRampToValueAtTime(f0 * (0.78 + Math.random() * 0.1), tt + sob);
      g.gain.linearRampToValueAtTime(v * (0.5 + Math.random() * 0.5), tt + 0.05); g.gain.linearRampToValueAtTime(0.0001, tt + sob);
      tt += sob + 0.06 + Math.random() * (Math.random() < 0.25 ? 0.9 : 0.14);
    }
    c.start(t); vib.start(t); c.stop(t + d + 0.3); vib.stop(t + d + 0.3);
  };
  /* thì thầm đảo ngược, bay vòng quanh đầu người chơi */
  Au.whisper = function (center, dur) {
    if (!Au.ready) return; var t = ctx.currentTime, d = dur || 5, p = panner(center[0], center[1], center[2], 0.7);
    p.refDistance = 1.2;
    var a0 = Math.random() * 6.28, steps = 24, cx = new Float32Array(steps), cz = new Float32Array(steps);
    for (var i = 0; i < steps; i++) { var a = a0 + i / steps * Math.PI * 3.2; cx[i] = center[0] + Math.cos(a) * 1.4; cz[i] = center[2] + Math.sin(a) * 1.4; }
    if (p.positionX) { try { p.positionX.setValueCurveAtTime(cx, t, d); p.positionZ.setValueCurveAtTime(cz, t, d); } catch (e) { } }
    var g = gain(0, p), f1 = filt('bandpass', 1900, 5, g), f2 = filt('bandpass', 3400, 7, g), hp = filt('highpass', 900, 0.7, null);
    hp.connect(f1); hp.connect(f2); var s = noiseSrc(hp);
    var tt = t; g.gain.setValueAtTime(0.0001, t);
    while (tt < t + d) {
      var syl = 0.09 + Math.random() * 0.22;
      // bao đảo ngược: lên chậm, cắt đột ngột
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.5 + Math.random() * 0.5, tt + syl); g.gain.setValueAtTime(0.0001, tt + syl + 0.005);
      f1.frequency.setValueAtTime(900 + Math.random() * 1600, tt); f1.frequency.linearRampToValueAtTime(1200 + Math.random() * 1800, tt + syl);
      f2.frequency.setValueAtTime(2600 + Math.random() * 1800, tt);
      tt += syl + 0.03 + (Math.random() < 0.2 ? 0.3 : 0.04);
    }
    s.start(t, Math.random() * 2); s.stop(t + d + 0.1);
  };
  /* tiếng thét nhiều lớp */
  Au.scream = function (pos, long) {
    if (!Au.ready) return; var t = ctx.currentTime, d = long ? 2.2 : 1.1, o = pos ? panner(pos[0], pos[1], pos[2], 1.0) : out(0.8);
    var ws = ctx.createWaveShaper(), cv = new Float32Array(256);
    for (var i = 0; i < 256; i++) { var x = i / 128 - 1; cv[i] = Math.tanh(x * 5); }
    ws.curve = cv; var g = gain(0, o); ws.connect(g);
    [720, 1090, 1460, 2210].forEach(function (f, k) {
      var c = osc('sawtooth', f, gain(0.3, ws)), m = osc('sine', 31 + k * 13, null), mg = gain(f * 0.09, c.frequency); m.connect(mg);
      c.frequency.setValueAtTime(f * 0.6, t); c.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.12); c.frequency.linearRampToValueAtTime(f * (0.9 + Math.random() * 0.2), t + d);
      c.start(t); m.start(t); c.stop(t + d + 0.1); m.stop(t + d + 0.1);
    });
    var ng = gain(0.5, ws), nf = filt('bandpass', 3200, 1.2, ng), s = noiseSrc(nf); s.start(t); s.stop(t + d + 0.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(long ? 0.85 : 0.6, t + 0.05); g.gain.setValueAtTime(long ? 0.8 : 0.55, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  };
  /* tiếng rên rút lui khi bị trấn áp */
  Au.wail = function (pos) {
    if (!Au.ready) return; var t = ctx.currentTime, o = pos ? panner(pos[0], pos[1], pos[2], 1.3) : out(1);
    var g = gain(0, o), f = filt('bandpass', 1300, 4, g);
    [520, 783].forEach(function (fr) { var c = osc('sawtooth', fr, f); c.frequency.setValueAtTime(fr * 1.6, t); c.frequency.exponentialRampToValueAtTime(fr * 0.35, t + 2.4); c.start(t); c.stop(t + 2.6); });
    f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(500, t + 2.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
  };
  Au.shutter = function () {
    if (!Au.ready) return; var t = ctx.currentTime, o = out(0.15);
    tick(t, o, 0.5); tick(t + 0.07, o, 0.35);
    var g = gain(0, o), c = osc('sine', 2400, g); c.frequency.exponentialRampToValueAtTime(600, t + 0.1); env(g, t, 0.002, 0.25, 0.1); c.start(t); c.stop(t + 0.15);
    var g2 = gain(0, o), w = osc('sine', 1800, g2); w.frequency.setValueAtTime(1800, t + 0.15); w.frequency.exponentialRampToValueAtTime(9500, t + 2.4);
    g2.gain.setValueAtTime(0.0001, t + 0.15); g2.gain.linearRampToValueAtTime(0.03, t + 0.4); g2.gain.linearRampToValueAtTime(0.0001, t + 2.5); w.start(t + 0.15); w.stop(t + 2.6);
  };
  Au.click = function (v) { if (!Au.ready) return; tick(ctx.currentTime, out(0), v || 0.3); };
  Au.beep = function (f, d) {
    if (!Au.ready) return; var t = ctx.currentTime, g = gain(0, out(0.2)), c = osc('triangle', f || 660, g); env(g, t, 0.004, 0.2, d || 0.12); c.start(t); c.stop(t + (d || 0.12) + 0.05);
  };
  Au.pickup = function () {
    if (!Au.ready) return; var t = ctx.currentTime, o = out(0.5);
    [880, 1318.5, 1760].forEach(function (f, i) { var g = gain(0, o), c = osc('sine', f, g); env(g, t + i * 0.07, 0.005, 0.16, 0.7); c.start(t + i * 0.07); c.stop(t + i * 0.07 + 0.8); });
  };
  Au.ratchet = function (pos, n) {
    if (!Au.ready) return; var t = ctx.currentTime, o = pos ? panner(pos[0], pos[1], pos[2], 0.4) : out(0.2);
    for (var i = 0; i < (n || 14); i++) { tick(t + i * 0.22, o, 0.45); kick(t + i * 0.22 + 0.02, o, 0.25); }
    Au.creak(pos, 0.35, (n || 14) * 0.22);
  };
  Au.chain = function (pos) {
    if (!Au.ready) return; var t = ctx.currentTime, o = pos ? panner(pos[0], pos[1], pos[2], 0.5) : out(0.3);
    for (var i = 0; i < 22; i++) { var tt = t + i * 0.05 + Math.random() * 0.04; var g = gain(0, o), f = filt('bandpass', 2500 + Math.random() * 4500, 12, g), s = noiseSrc(f); env(g, tt, 0.001, 0.5 * (1 - i / 26), 0.06); s.start(tt, Math.random() * 2); s.stop(tt + 0.1); }
  };
  Au.bell = function (pos, f0) {
    if (!Au.ready) return; var t = ctx.currentTime, o = pos ? panner(pos[0], pos[1], pos[2], 1.5) : out(1.2), f = f0 || 196;
    [1, 2.01, 2.76, 4.07, 5.4].forEach(function (r, i) { var g = gain(0, o), c = osc('sine', f * r, g); env(g, t, 0.004, 0.35 / (i + 1), 5 / (i * 0.7 + 1)); c.start(t); c.stop(t + 6); });
  };
  Au.fire = function (dur) {
    if (!Au.ready) return; var t = ctx.currentTime, o = out(0.4), g = gain(0.0001, o), f = filt('bandpass', 900, 0.8, g), s = noiseSrc(f);
    g.gain.linearRampToValueAtTime(0.25, t + 1); g.gain.setValueAtTime(0.25, t + dur - 1); g.gain.linearRampToValueAtTime(0.0001, t + dur); s.start(t); s.stop(t + dur);
    for (var i = 0; i < dur * 7; i++) tick(t + Math.random() * dur, o, 0.1 + Math.random() * 0.25);
  };
  Au.breath = function (inhale) {
    if (!Au.ready) return; var t = ctx.currentTime, g = gain(0, out(0.05)), f = filt('bandpass', inhale ? 1500 : 800, 1.4, g), s = noiseSrc(f);
    f.frequency.linearRampToValueAtTime(inhale ? 2600 : 500, t + 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + 0.8); s.start(t, Math.random()); s.stop(t + 0.9);
  };
  /* tiếng "giật hình" khi Lệ Nương dịch chuyển */
  Au.glitch = function (pos) {
    if (!Au.ready) return; var t = ctx.currentTime, o = pos ? panner(pos[0], pos[1], pos[2], 0.4) : out(0.3);
    for (var i = 0; i < 5; i++) { var g = gain(0, o), c = osc('square', 90 + Math.random() * 1400, g), tt = t + i * 0.03; env(g, tt, 0.001, 0.2, 0.03); c.start(tt); c.stop(tt + 0.05); }
  };
  /* chuỗi bước chân ma sau lưng */
  Au.phantomSteps = function (from, to, mat) {
    if (!Au.ready) return;
    for (var i = 0; i < 7; i++) (function (k) {
      setTimeout(function () { var u = k / 7; Au.step(mat || 'mud', 0.9, [from[0] + (to[0] - from[0]) * u, 0.2, from[2] + (to[2] - from[2]) * u]); }, k * 420);
    })(i);
  };
  Au.sting = function () {
    if (!Au.ready) return; var t = ctx.currentTime, o = out(1.0);
    [185, 196, 277, 415, 440].forEach(function (f) { var g = gain(0, o), c = osc('sawtooth', f, filt('lowpass', 2600, 0.7, g)); env(g, t, 0.01, 0.16, 2.2); c.start(t); c.stop(t + 2.5); });
    kick(t, o, 1.4);
  };
})();
