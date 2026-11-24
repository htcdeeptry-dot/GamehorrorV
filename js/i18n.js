/* HUYẾT LỆ THÔN — i18n.js
   Ngôn ngữ hiển thị: tiếng Việt (gốc) hoặc tiếng Anh. Lồng tiếng luôn là tiếng Việt;
   khi chọn tiếng Anh, phụ đề, giao diện, nhật ký, chữ trong thế giới đều được dịch.
   Bản dịch tra theo đúng câu tiếng Việt (js/lang_en.js), kèm vài mẫu cho chuỗi ghép. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {}, L = H.L = H.L || {}, KEY = 'HuyetLeThon_lang';
  var lang = 'en'; try { lang = localStorage.getItem(KEY) || 'en'; } catch (e) { } // mặc định tiếng Anh; người chơi đổi sang tiếng Việt ở menu
  L.lang = lang === 'vi' ? 'vi' : 'en'; try { document.documentElement.lang = L.lang; } catch (e) { }
  var PAT = [
    [/^Nhặt (.+)$/, function (m) { return 'Pick up ' + tr(m[1]); }],
    [/^“(.+)”$/, function (m) { return '“' + tr(m[1]) + '”'; }],
    [/^Nhật ký (\d+)\/(\d+)$/, function (m) { return 'Diaries ' + m[1] + '/' + m[2]; }],
    [/^Nhận được: (.+)$/, function (m) { return 'Obtained: ' + tr(m[1]); }],
    [/^Nhật ký mới: “(.+)”$/, function (m) { return 'New diary: “' + tr(m[1]) + '”'; }],
    [/^Minh: Còn (\d+) lễ vật nữa\.$/, function (m) { return 'Minh: ' + m[1] + (m[1] === '1' ? ' offering' : ' offerings') + ' left.'; }],
    [/^Ảnh hiện trường \((\d+)\/3\)$/, function (m) { return 'Scene photos (' + m[1] + '/3)'; }],
    [/^\[E\] (.+)$/, function (m) { return '[E] ' + tr(m[1]); }],
    [/^Mở (.+)$/, function (m) { return 'Open ' + tr(m[1]); }],
    [/^Đóng (.+)$/, function (m) { return 'Close ' + tr(m[1]); }],
    [/^Dệt vật liệu: (.+)\.\.\.$/, function (m) { return 'Weaving materials: ' + tr(m[1]) + '...'; }],
    [/^GPU: (.*)  ·  Cấu hình: (.*)  ·  v(.*)$/, function (m) { return 'GPU: ' + m[1] + '  ·  Preset: ' + tr(m[2]) + '  ·  v' + m[3]; }]
  ];
  function tr(s) {
    if (L.lang !== 'en' || s === null || s === undefined) return s;
    s = String(s); var E = L.EN || {}; if (E[s] !== undefined) return E[s];
    var t = s.trim(); if (t !== s && E[t] !== undefined) return s.replace(t, E[t]);
    for (var k = 0; k < PAT.length; k++) { var m = s.match(PAT[k][0]); if (m) return PAT[k][1](m); }
    return s;
  }
  H.tr = tr;
  L.set = function (l) { try { localStorage.setItem(KEY, l); } catch (e) { } location.reload(); };
  /* dịch chữ tĩnh trong trang (một lần lúc khởi động) */
  L.applyDOM = function (root) {
    if (L.lang !== 'en') return;
    document.documentElement.lang = 'en';
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (t) { if (t.parentNode && /^(SCRIPT|STYLE)$/.test(t.parentNode.nodeName)) return; var v = t.nodeValue, s = v.trim(); if (!s) return; var r = tr(s); if (r !== s) t.nodeValue = v.replace(s, r); });
    [].forEach.call((root || document.body).querySelectorAll('[title]'), function (e) { e.title = tr(e.title); });
  };
})();
