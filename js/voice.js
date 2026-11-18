/* =========================================================================
   HUYẾT LỆ THÔN — PHÁT LỒNG TIẾNG
   Dữ liệu mp3 nhúng sẵn trong vo_data.js (H.VO) nên chạy được qua file://.
   Tra theo đúng câu phụ đề; một kênh thoại, câu mới ngắt câu cũ (trừ khi
   câu cũ sắp hết thì xếp hàng nối tiếp cho khỏi cụt).
   ========================================================================= */
(function (H) {
  'use strict';
  var V = H.Voice = { enabled: true, gain: 1.15 };
  var bufs = {}, pending = {}, cur = null, curEnd = 0, queued = null, el = null;

  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  V.idFor = function (text) {
    var VO = H.VO; if (!VO) return null;
    var t = norm(text), id = VO.t[t];
    if (!id) id = VO.t[t.replace(/^[^:]{1,24}:\s*/, '')];
    if (!id) { var k = 'Minh: ' + t; id = VO.t[k]; }
    return id || null;
  };
  V.dur = function (text) { var id = V.idFor(text); return id ? H.VO.dur[id] || 0 : 0; };

  function b64(s) { var bin = atob(s), n = bin.length, a = new Uint8Array(n); for (var i = 0; i < n; i++) a[i] = bin.charCodeAt(i); return a.buffer; }
  function ctx() { var A = H.Audio; return A && A.ready && A.ctx ? A.ctx : null; }
  function decode(id, cb) {
    if (bufs[id]) return cb(bufs[id]);
    if (pending[id]) { pending[id].push(cb); return; }
    pending[id] = [cb];
    var c = ctx(), done = function (b) { bufs[id] = b; var l = pending[id]; delete pending[id]; l.forEach(function (f) { f(b); }); };
    var p = c.decodeAudioData(b64(H.VO.d[id]), done, function () { delete pending[id]; });
    if (p && p.catch) p.catch(function () { });
  }
  function vol() { var A = H.Audio; return (A && A.volume !== undefined ? A.volume : 0.8) * V.gain; }

  function start(id, when) {
    var c = ctx();
    if (!c) { /* chưa có WebAudio: dùng thẻ audio */
      V.stop(); el = new Audio('data:audio/mpeg;base64,' + H.VO.d[id]); el.volume = Math.min(1, vol()); try { el.play(); } catch (e) { }
      curEnd = 0; return;
    }
    decode(id, function (b) {
      var t0 = Math.max(c.currentTime, when || 0);
      var s = c.createBufferSource(), g = c.createGain(); g.gain.value = vol();
      s.buffer = b; s.connect(g); g.connect(c.destination); s.start(t0);
      if (cur && when) { /* nối tiếp: không dừng câu đang nói */ } else if (cur) { try { cur.stop(); } catch (e) { } }
      cur = s; curEnd = t0 + b.duration;
      s.onended = function () { if (cur === s) cur = null; };
    });
  }

  V.say = function (text) {
    if (!V.enabled || !H.VO) return 0;
    var id = V.idFor(text); if (!id) return 0;
    var c = ctx();
    if (c && cur && curEnd - c.currentTime > 0 && curEnd - c.currentTime < 0.9) start(id, curEnd + 0.05);
    else start(id, 0);
    return H.VO.dur[id] || 0;
  };
  V.stop = function () {
    if (cur) { try { cur.stop(); } catch (e) { } cur = null; }
    if (el) { try { el.pause(); } catch (e) { } el = null; }
    curEnd = 0;
  };
  /* giải mã trước vài câu đầu để câu mở màn không trễ */
  V.warm = function () { var c = ctx(); if (!c || !H.VO) return; ['C00', 'C01', 'C02', 'C03', 'L_start'].forEach(function (id) { if (H.VO.d[id]) decode(id, function () { }); }); };
})(window.HuyetLeThon);
