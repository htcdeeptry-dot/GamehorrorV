/* HUYẾT LỆ THÔN: OÁN LINH — config.js
   Hằng số, cấu hình đồ hoạ, cốt truyện, vật phẩm, lời thoại, đồ thị waypoint. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};

  var CFG = H.CFG = {};

  CFG.VERSION = '1.0';
  CFG.SAVE_KEY = 'HuyetLeThon_save_v1';
  CFG.SET_KEY = 'HuyetLeThon_settings_v2';

  /* ---------- Cấu hình đồ hoạ: máy yếu -> máy mạnh ---------- */
  CFG.QUALITY = {
    low:    { label: 'Thấp',       sharpen: false, ssao: false, scale: 0.6,  tex: 256,  lights: 3,  bloom: false, normal: false, chroma: false, mistNoise: false, rain: 1200, bamboo: 0.25, view: 70,  aniso: 1, dpr: 1 },
    medium: { label: 'Trung bình', sharpen: true, ssao: false, scale: 0.85,  tex: 512,  lights: 5,  bloom: true,  normal: true,  chroma: true,  mistNoise: true,  rain: 3000, bamboo: 0.5,  view: 95,  aniso: 2, dpr: 1 },
    high:   { label: 'Cao',        sharpen: true, ssao: true, scale: 1.0, tex: 1024, lights: 8,  bloom: true,  normal: true,  chroma: true,  mistNoise: true,  rain: 6000, bamboo: 0.75, view: 130, aniso: 4, dpr: 1.5 },
    ultra:  { label: 'Cực cao',    sharpen: true, ssao: true, scale: 1.0,  tex: 1024, lights: 12, bloom: true,  normal: true,  chroma: true,  mistNoise: true,  rain: 9000, bamboo: 1.0,  view: 170, aniso: 8, dpr: 2 }
  };
  CFG.DEFAULT_SETTINGS = {
    preset: 'medium', sharpen: true, ssao: false, scale: 0.85, tex: 512, lights: 5, bloom: true, normal: true, chroma: true, mistNoise: true,
    rain: 3000, bamboo: 0.5, view: 95, aniso: 2, dpr: 1,
    dynRes: true, targetFps: 50, fov: 72, sens: 1.0, volume: 0.8, rainVol: 0.55, musVol: 0.9, voiceVol: 1, compass: true, showFps: false, grain: true
  };

  /* ---------- Người chơi ---------- */
  CFG.PLAYER = {
    eye: 1.65, crouchEye: 1.0, radius: 0.36,
    walk: 3.1, sprint: 5.5, crouch: 1.4,
    staminaMax: 100, staminaDrain: 16, staminaRegen: 11,
    batteryDrain: 100 / 420, // hết pin sau ~7 phút
    flashCooldown: 2.6, filmStart: 8,
    breathMax: 9
  };

  /* ---------- Toạ độ thế giới (bắc = -z) ---------- */
  CFG.POS = {
    spawn: [0, 90], spawnYaw: 0,
    cameraItem: [-2.6, 78.5],
    monument: [5.5, 57.5],
    gate: [0, 50],
    houseA: { x: 26, z: 30, w: 9, d: 7, q: 3 },
    well: [-30, 22],
    banyan: [-6, 6],
    manor: { x: 38, z: -14, w: 16, d: 10, q: 3 },
    houseB: { x: -34, z: -6, w: 8, d: 6, q: 1 },
    houseC: { x: 22, z: -44, w: 8, d: 6, q: 3 },
    temple: { x: 0, z: -62, w: 20, d: 14, q: 0 },
    graveGate: [-22, -45],
    grave: { x0: -60, x1: -22, z0: -74, z1: -28 },
    wall: { x0: -64, x1: 64, z0: -80, z1: 50 },
    offerings: [[-50, -36], [-44, -66], [-29, -57]],
    scenes: [[38.6, -14], [38.5, -19.6], [38.5, -8.4]]
  };

  /* ---------- Waypoint cho Lệ Nương ---------- */
  CFG.WAYPOINTS = [
    [0, 44], [0, 30], [0, 15], [14, 30], [20, 30], [25.5, 30], [-15, 20], [-26, 22], [-30, 27], [15, -5],
    [28, -14], [34.5, -14], [38, -14], [38, -19], [38, -9], [0, 0], [0, -20], [0, -40], [0, -52], [0, -60],
    [-15, -6], [-28, -6], [-34, -6], [-15, -40], [-20, -45], [-35, -45], [-48, -38], [-45, -60], [-30, -62], [15, -40],
    [17, -44], [22, -44], [-40, 5], [30, 12], [30, -32], [-45, 35], [-24, -45], [31.5, -14], [21.5, 30], [-29.5, -6]
  ];

  /* ---------- Vật phẩm ---------- */
  CFG.ITEMS = {
    camera:  { name: 'Máy Ảnh Tâm Linh', desc: 'Chiếc máy ảnh phim Liên Xô ông nội để lại. Ống kính đã ám một lớp sương lạnh. Đèn flash của nó soi được thứ mắt thường không thấy.' },
    crank:   { name: 'Tay Quay Sắt', desc: 'Tay quay tời giếng, han gỉ, còn dính một dải lụa đỏ đã mục.' },
    mirror:  { name: 'Gương Đồng Âm Dương', desc: 'Gương đồng hai mặt. Mặt dương soi người sống, mặt âm soi vật đã bị chôn giấu. Giữ [R] để soi.' },
    key:     { name: 'Chìa Khoá Đồng', desc: 'Chìa khoá khắc chữ "Đoàn". Hẳn là của nhà Lý trưởng.' },
    scroll:  { name: 'Huyết Thư', desc: 'Cuộn giấy dó viết bằng máu: lời thú tội của Lý trưởng Đoàn Văn Khải.' },
    incense: { name: 'Trầm Hương', desc: 'Lễ vật thuộc Hoả — nén trầm mẹ nàng vẫn thắp mỗi rằm.' },
    hairpin: { name: 'Trâm Ngọc', desc: 'Lễ vật thuộc Kim — chiếc trâm cha tặng nàng năm mười sáu tuổi.' },
    comb:    { name: 'Lược Gỗ', desc: 'Lễ vật thuộc Mộc — chiếc lược gỗ mít còn vương vài sợi tóc dài.' },
    film:    { name: 'Cuộn Phim', desc: 'Phim 35mm. Mỗi cuộn chụp được 4 kiểu.' },
    battery: { name: 'Pin Con Thỏ', desc: 'Một đôi pin tiểu. Nạp đầy đèn pin.' }
  };

  /* ---------- 8 trang nhật ký ---------- */
  CFG.DIARIES = [
    { id: 'd1', title: 'Sổ tay của Minh', sub: 'Mùa thu 1994 — đường đèo lên bản Sủng',
      text: 'Ngày 14 tháng 9.\n\nBão số 6 đổ bộ sớm hơn dự báo. Linh nhất định không cho quay xe: "Sắp tới rồi. Ngôi làng bỏ hoang ấy đẹp lắm, chụp xong phóng sự là nổi." Tuấn cầm lái, Hà ôm ba lô, mặt tái mét.\n\nCon đường đèo này không có trên bản đồ quân sự. Tuấn bảo la bàn quay lung tung. Hà khăng khăng nghe có tiếng con gái khóc ngoài cửa xe.\n\nTôi chỉ thấy lạ một điều: mặt trăng. Đêm nay mới mồng chín, sao trăng lại tròn và đỏ như một con mắt thế kia?\n\nNăm nay là năm Giáp Tuất. Bà cụ dưới bản có dặn, giọng run lắm: "Năm Tuất thì đừng lên núi ấy."\n\n(Nét chữ sau, nguệch ngoạc, dính bùn:)\nXe lật. Tỉnh dậy không thấy ai. Dấu chân ba người đi xuống rừng. Mình phải theo.' },
    { id: 'd2', title: 'Mẩu giấy của Hà', sub: 'Viết vội bằng bút chì',
      text: 'Minh ơi,\n\nEm vào được bên trong rồi. Cổng tự khoá lại sau lưng em, xích quấn như có người vừa quấn.\n\nLàng này không có ai, mà nhà nào cũng thắp đèn. Bếp còn ấm. Trên bàn thờ nhà nào cũng có một bát hương bị úp ngược.\n\nEm thấy chị ấy rồi. Áo đỏ, tóc dài chấm đất, đứng sau gốc đa. Em soi đèn pin thì chị ấy biến mất. Đừng tắt đèn, Minh ạ. Chị ấy không thích ánh sáng — nhưng chị ấy THEO tiếng chân.\n\nEm đi về phía cái giếng. Có tiếng anh Tuấn gọi ở đó.' },
    { id: 'd3', title: 'Nhật ký thầy lang Nguyễn Văn Tịnh', sub: 'Năm Giáp Tuất, Tự Đức thứ 27 (1874)',
      text: 'Tháng Bảy.\n\nDịch tả về làng từ mồng hai. Con Lệ nhà ta thức trắng mười đêm sắc thuốc. Nó cứu được hai mươi ba mạng, phần nhiều là trẻ nhỏ. Chỉ có cậu ấm con quan Lý là không qua khỏi — người ta rước về thì đã muộn ba ngày.\n\nTừ hôm ấy quan Lý nhìn con ta bằng con mắt khác. Ông ta nói giữa đình: "Đứa con gái biết giữ mạng người thì cũng biết lấy mạng người."\n\nTa đã giấu tay quay giếng vào trong nhà. Đêm qua có kẻ thả gì đó xuống giếng làng, sáng ra nước đỏ như máu. Chúng sẽ đổ cho con ta. Ta biết.\n\nLệ ơi, nếu cha không còn — con tên là NGUYỄN THỊ LỆ, đừng để ai gọi con bằng cái tên chúng đặt.' },
    { id: 'd4', title: 'Biên bản của Lý trưởng', sub: 'Đoàn Văn Khải lập — niêm phong trong két',
      text: 'Làng Âm Linh, rằm tháng Bảy năm Giáp Tuất.\n\nXét con gái thầy lang Tịnh dùng tà thuật yểm giếng, gây dịch, hại chết ấu chủ. Hội đồng kỳ mục nhất trí:\n\nMột — TRÓI: lấy bảy thước lụa điều trói yêu nữ tại chính đường.\nHai — THIÊU: phóng hoả gia quyến nó trong Đình, không cho một ai thoát.\nBa — DÌM: thả yêu nữ xuống Giếng Cổ, lấp bằng đá ong.\n\nTừ nay cấm gọi tên thật của nó. Sổ sách ghi là "Lệ Nương".\n\n(Dòng chữ nhỏ, viết bằng mực khác, nét run:)\nKho thóc cứu đói là ta bán. Giếng là ta sai người yểm. Còn thằng Khang... điều ấy ta không dám viết ra ở đây. Ta viết vào tờ khác, bằng thứ mực khác. Trời ơi, trăng sao mãi không lặn.' },
    { id: 'd5', title: 'Thư của Tuấn', sub: 'Giấy xé từ sổ đo đạc',
      text: 'Gửi bất cứ ai còn sống.\n\nTôi là Trần Anh Tuấn, kỹ sư địa chất. Tôi ghi lại những gì đo được, vì đó là thứ duy nhất tôi còn tin:\n\n— Đồng hồ của tôi dừng ở 0 giờ 49.\n— La bàn quay về phía cái giếng, không phải phương bắc.\n— Dưới giếng không có đáy. Tôi thả dây ba mươi mét vẫn chưa chạm nước. Nhưng cái gàu thì nặng, như có người ngồi trong.\n\nTay quay không còn trên tời. Ai đó đã tháo nó đi từ rất lâu. Nếu tìm được, ĐỪNG quay một mình. Thứ được kéo lên không chỉ có cái gàu.\n\nLinh nói phải lên Đình. Cô ấy đọc được chữ Nôm trên bia.' },
    { id: 'd6', title: 'Lời khai của người gác đình', sub: 'Khắc bằng dao lên một mảnh ván quan tài',
      text: 'Tôi là Phó Bảy, gác đình ba mươi năm.\n\nĐêm ấy tôi cầm đuốc. Tôi là người chốt cửa Đình từ bên ngoài. Tôi nghe mẹ nó gọi tên nó cho tới khi xà nhà sập.\n\nSáu mươi năm sau, năm Giáp Tuất, trăng lại đỏ. Cả làng thức dậy trong đúng cái đêm ấy và không ai chết được nữa. Lại sáu mươi năm. Lại một vòng.\n\nTôi đã chôn trả nó ba thứ của nó ở nghĩa địa này: nén trầm của mẹ, cây trâm của cha, cái lược của nó. Mắt trần không thấy đâu. Phải soi bằng mặt âm của gương đồng — cái gương quan Lý ném theo nó xuống giếng để trấn.\n\nAi đọc được thì làm nốt việc tôi không dám làm: đem ba thứ ấy lên Đình, đốt tờ huyết thư, và GỌI ĐÚNG TÊN NÓ.' },
    { id: 'd7', title: 'Trang viết của Lệ', sub: 'Giấu dưới ván giường',
      text: 'Đêm mười bốn.\n\nNgười ta đã thôi chào con. Trẻ con con cứu sống bị mẹ chúng kéo vào nhà mỗi khi con đi qua.\n\nCha bảo con trốn đi. Nhưng con đi thì ai sắc thuốc cho bà cụ Mận, ai thay băng cho thằng cu Tí? Con không làm gì sai. Con sẽ không chạy.\n\nNếu ngày mai họ đến, con chỉ xin một điều: đừng gọi con là yêu nữ, đừng gọi con là "nương" nọ "nương" kia. Con có tên. Mẹ đặt tên con là Lệ vì con sinh vào một đêm mưa, mẹ bảo trời khóc mừng con.\n\nCon là Nguyễn Thị Lệ. Xin hãy nhớ lấy.' },
    { id: 'd8', title: 'Băng ghi âm của Linh', sub: 'Chép lại từ cuộn băng cassette',
      text: '(tiếng mưa, tiếng thở gấp)\n\n...Minh, nếu anh nghe được. Em dịch xong tấm bia rồi. Đây không phải lời nguyền của cô ấy. Là lời nguyền của HỌ. Cả làng tự trói mình vào đêm này vì không ai chịu nhận tội.\n\nĐàn Ngũ Hành trong Đình cần đủ ba lễ vật — Hoả, Kim, Mộc — rồi đốt lời thú tội của kẻ chủ mưu làm Thổ, lấy nước mắt làm Thuỷ.\n\nNhưng quan trọng nhất: lúc lửa cháy, cô ấy sẽ hỏi. Phải gọi cô ấy bằng tên thật. Gọi bằng cái tên họ đặt — "Lệ Nương" — là mình đứng về phía họ, và vòng lặp bắt đầu lại.\n\nEm không tìm ra tên thật. Em xin lỗi. Hà với Tuấn... em không...\n\n(tiếng cửa gỗ đóng sầm. Hết băng.)' }
  ];

  CFG.MONUMENT_TEXT = 'BIA TRẤN YỂM\n\n(Chữ Nôm khắc sâu, phía dưới có nét chữ quốc ngữ ai đó đã dịch bằng phấn)\n\n"Giáp Tuất niên, huyết nguyệt thăng.\nLục thập niên nhất luân hồi."\n\nNăm Giáp Tuất, trăng máu mọc.\nSáu mươi năm một vòng.\n\n    Giáp Tuất — 1874\n    Giáp Tuất — 1934\n    Giáp Tuất — ▓▓▓▓\n\nDòng cuối bị một vệt máu còn ướt phủ lên. Ổ khoá số trên cổng có bốn vòng.';

  CFG.NAMES = [
    { label: '“Lệ Nương”', ok: false },
    { label: '“Nguyễn Thị Lệ”', ok: true },
    { label: '“Đoàn Thị Nương”', ok: false }
  ];

  /* ---------- Lời thoại / phụ đề ---------- */
  CFG.LINES = {
    start: 'Minh: Đầu đau như búa bổ... Đèn pin vẫn còn. Máy ảnh của ông — nó văng đâu đó quanh xe.',
    gotCamera: 'Minh: Máy ảnh của ông nội. Vẫn còn phim.',
    gateLocked: 'Minh: Khoá số bốn vòng. Phải có manh mối quanh đây... tấm bia đá kia?',
    gateOpen: 'Minh: Xích tự tuột ra. Như thể nó chỉ chờ mình nói đúng năm.',
    needCrank: 'Minh: Tời giếng mất tay quay. Tuấn có nhắc... ai đó đã giấu nó trong nhà.',
    crankPlaced: 'Minh: Vừa khít. Nào... kéo lên.',
    ambush: 'Minh: Cái gì đang trèo lên theo sợi dây—— CHẠY!',
    stunned: 'Minh: Đèn flash làm nó tan đi... nhưng nó sẽ trở lại.',
    manorLocked: 'Minh: Khoá đồng. Cần chìa khoá của nhà Lý trưởng.',
    manorOpen: 'Minh: Trong này lạnh hơn ngoài mưa. Thử nhìn qua ống ngắm xem...',
    safeHint: 'Minh: Két ba số. Biên bản ghi: TRÓI — THIÊU — DÌM. Ảnh sẽ cho mình thứ tự.',
    photo: ['Ảnh 1/3 — TRÓI: trên vách hiện số 3.', 'Ảnh 2/3 — THIÊU: tro xếp thành số 7.', 'Ảnh 3/3 — DÌM: nước nhỏ giọt thành số 5.'],
    gotScroll: 'Minh: Huyết Thư. Lão ta đã tự thú... rồi khoá nó lại suốt một trăm hai mươi năm.',
    graveyard: 'Minh: Nghĩa địa. Soi gương đồng... vệt sáng sẽ chỉ hướng lễ vật.',
    offering: 'Minh: Còn {n} lễ vật nữa.',
    allOfferings: 'Minh: Đủ ba lễ vật. Lên Đình thôi.',
    templeLocked: 'Minh: Cửa Đình dán kín bùa. Linh nói cần lời thú tội của kẻ chủ mưu...',
    templeOpen: 'Minh: Bùa tự cháy thành tro khi Huyết Thư đến gần.',
    altarNeed: 'Minh: Đàn Ngũ Hành. Còn thiếu lễ vật.',
    lowBattery: 'Minh: Pin sắp hết...',
    noFilm: 'Minh: Hết phim rồi.',
    hide: 'Giữ [Space] để nín thở. [E] để ra ngoài.',
    saved: 'Đã lưu tiến trình.'
  };

  CFG.OBJECTIVES = {
    o1: 'Tìm chiếc máy ảnh văng ra khỏi xe',
    o2: 'Mở cổng làng — tìm manh mối về năm xảy ra thảm kịch',
    o3: 'Tìm Tay Quay Sắt trong ngôi nhà cổ phía đông',
    o4: 'Kéo gàu ở Giếng Cổ Huyết Lệ phía tây',
    o5: 'Sống sót! Chụp ảnh trấn áp Lệ Nương hoặc trốn đi',
    o6: 'Vào nhà Lý trưởng phía đông, chụp 3 hiện trường tâm linh',
    o7: 'Mở két của Lý trưởng (thứ tự: Trói — Thiêu — Dìm)',
    o8: 'Tới Nghĩa Địa Hoang phía tây bắc, soi gương tìm 3 lễ vật',
    o9: 'Mang lễ vật và Huyết Thư lên Đình Làng phía bắc',
    o10: 'Đặt lễ vật lên Đàn Ngũ Hành và đốt Huyết Thư'
  };

  CFG.ENDINGS = {
    true: {
      title: 'SIÊU THOÁT',
      lines: [
        '“Nguyễn Thị Lệ.”',
        'Ngọn lửa trên đàn chuyển từ đỏ sang trắng. Bảy thước lụa điều rơi khỏi cổ tay nàng, từng vòng một.',
        'Lần đầu tiên sau một trăm hai mươi năm, có người gọi nàng bằng cái tên mẹ đặt.',
        'Nàng thôi khóc. Nhưng trước khi tan đi, nàng ngoái nhìn về phía cái giếng — rất lâu.',
        'Trăng lặn. Mưa tạnh. Dưới gốc đa có hai người nằm thiếp đi: Linh và Hà. Còn thở.',
        'Tuấn không có ở đó. Đội cứu hộ tìm ba ngày, chỉ thấy một chiếc đồng hồ dừng ở 0 giờ 49.',
        'Vòng lặp đã đứt. Nhưng dưới giếng vẫn còn một người chưa ai gọi tên.'
      ]
    },
    bad: {
      title: 'VÒNG LẶP VĨNH CỬU',
      lines: [
        'Ngọn lửa tắt phụt.',
        'Nàng nghiêng đầu nhìn bạn — rất lâu — như nhìn thêm một người làng nữa.',
        '“Các người... vẫn gọi ta bằng cái tên ấy.”',
        'Cửa Đình đóng sầm. Bên ngoài có tiếng then cài. Rồi tiếng đuốc.',
        'Đồng hồ chỉ 0 giờ 49.',
        'Mùa thu năm 1994. Cơn bão cuốn trôi con đường sau lưng chúng tôi...',
        'Sáu mươi năm một vòng.'
      ]
    }
  };
})();
