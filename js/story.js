/* HUYẾT LỆ THÔN — story.js
   Phần cốt truyện mở rộng: quá khứ 1874, vòng lặp 1934, hiện tại 1994 — nhật ký, vật phẩm ẩn,
   các chương ngoài làng (Đèo Sạt, Rừng Cấm, Sông Âm) và các kết thúc. Nạp ngay sau config.js. */
(function () {
  'use strict';
  var H = window.HuyetLeThon, CFG = H.CFG;

  CFG.DIARIES.push(
    { id: 'd9', title: 'Thư Khang gửi Lệ', sub: 'Giấu trong ống tre, chưa kịp gửi — tháng Bảy 1874',
      text: 'Lệ,\n\nTôi đã xem sổ kho. Ba trăm thạ thóc triều đình phát chẩn, cha tôi bán cho lái buôn dưới xuôi từ tháng Năm. Người làng đói mà chết chứ nào phải chỉ vì dịch.\n\nĐêm mai tôi lên huyện. Tôi mang theo sổ. Tôi biết làm vậy là bất hiếu, nhưng tôi không nhìn mặt lũ trẻ được nữa.\n\nXong việc tôi sẽ về đón Lệ. Chiếc nhẫn bạc mẹ tôi để lại, tôi nhờ chú Bảy gác đình giữ hộ — khi nào về tôi sẽ tự tay đeo cho Lệ, trước mặt cả làng, cho ai nấy thôi xì xào.\n\nNếu ba ngày tôi không về, Lệ đừng tin bất cứ điều gì người ta nói về tôi. Và đừng ra giếng một mình.\n\nKhang.' },
    { id: 'd10', title: 'Sổ kho thóc phát chẩn', sub: 'Trang cuối — có dấu triện Lý trưởng',
      text: 'Tháng Năm, Giáp Tuất.\n\nNhận của quan huyện: thóc phát chẩn 300 thạ.\nPhát cho dân: 40 thạ.\nXuất bán cho lái Tư Hợi (thuyền đậu bến dưới): 260 thạ — thu 780 quan.\n\n(Nét chữ khác, mực đỏ, viết đè lên:)\nCha ơi con đã chép lại trang này. Bản chép con để ở chỗ cha không tìm được.\n\n(Nét chữ thứ ba, run, viết sau đó nhiều năm:)\nNó để bản chép trong áo. Người ta vớt lên cùng nó. Ta đã đốt. Ta đã đốt hết mà sao trăng vẫn đỏ.' },
    { id: 'd11', title: 'Nhật trình đoàn đo đạc Đông Dương', sub: 'Bản dịch tay — tháng 9 năm 1934',
      text: 'Ngày 21 tháng 9.\n\nTrung uý Morel cho dựng trạm trong khu rừng bên sông Âm, gần một ngôi làng không có trên bản đồ của Sở Địa dư. Dân phu bỏ trốn hết từ chiều, chỉ còn thằng bé dẫn đường tên Lộc, người họ Phó.\n\nTrăng đêm nay màu gan lợn. Đồng hồ của cả đoàn đứng lúc 0 giờ 49.\n\nNgày 22.\n\nHai người đi đo bờ sông không về. Morel cho khoá đò ngang ở Bến Dưới, cất chìa vào hòm sắt, để không ai bỏ trốn được nữa.\n\nNgày (không rõ).\n\nThằng Lộc ôm khư khư cái máy ảnh của đoàn. Nó bảo: "Bà áo đỏ sợ thứ ánh sáng này. Bà ấy chỉ đuổi người nào quay lưng chạy."\n\nNó xin tôi cái máy. Tôi cho. Tôi không cần ảnh nữa. Mọi tấm kính đã chụp tôi cất cả trong lều tối. Không ai dám vào đó nữa.' },
    { id: 'd12', title: 'Mảnh giấy trong hộp máy ảnh', sub: 'Giấy học trò, gấp tư, đã ố vàng',
      text: 'Minh,\n\nMáy này ông để lại cho cháu. Đừng bán. Đừng cho ai mượn.\n\nNó chụp cảnh thì xấu lắm, cháu sẽ chê. Nó chỉ chụp đẹp đúng một thứ, và ông mong cả đời cháu không phải chụp thứ ấy.\n\nNhưng nếu có đêm nào trăng đỏ mà không phải nguyệt thực, thì đừng tiếc phim. Chụp thẳng vào mặt. Đừng quay lưng.\n\nVà nếu có ai rủ cháu lên vùng núi Sủng vào năm Tuất — dù là người cháu thương — thì đừng đi.\n\nÔng nội,\nPhó Văn Lộc.' },
    { id: 'd13', title: 'Băng ghi âm thứ hai của Linh', sub: 'Hà đưa — "đừng nghe trước khi tới Đình"',
      text: '(tiếng bật máy)\n\nMinh. Nếu Hà đưa anh cuộn này thì nghĩa là em không tự nói được nữa.\n\nEm không tình cờ tìm ra ngôi làng. Tên khai sinh của em là Đoàn Khánh Linh. Bà nội em mất tháng Ba, trước khi đi bà dúi cho em một tờ gia phả và nói: "Năm nay là năm Tuất. Phải có người họ Đoàn về nhận tội, không thì lại sáu mươi năm."\n\nEm tra ra được hai họ còn lại trên tờ điểm chỉ. Họ Phó — là anh. Họ Trần — là Tuấn. Em rủ hai người đi "chụp phóng sự". Em tưởng chỉ cần ba đứa mình đứng trước Đình thắp nén hương là xong.\n\nEm sai rồi. Làng không cần hương. Làng cần người.\n\nHà không liên quan gì. Hà chỉ đi theo vì thương em. Nếu cô ấy thả ai, thì là thả Hà.\n\nAnh có quyền hận em. Nhưng làm ơn, gọi đúng tên cô ấy.\n\n(tiếng tắt máy)' },
    { id: 'd14', title: 'Lời người mẹ', sub: 'Khắc bằng móng tay lên mặt sau bài vị',
      text: 'Ai đọc được thì nghe tôi.\n\nTôi là mẹ con Lệ. Lửa đang lên tới xà. Ông nhà tôi ngất rồi.\n\nTôi không nguyền ai hết. Người làng này tôi đỡ đẻ cho quá nửa, nguyền thì nguyền vào đâu.\n\nTôi chỉ xin: một người thôi, nhớ lấy tên con tôi. Nguyễn Thị Lệ. Đừng gọi nó bằng cái tên họ đặt.\n\nCòn cái vòng sáu mươi năm kia không phải của tôi, cũng không phải của con tôi. Là của những người đứng ngoài cửa nghe tôi gọi mà không ai rút then. Họ tự trói mình vào đêm nay, vì đêm nay là đêm cuối cùng họ còn có thể làm khác đi.\n\nAi mở được then thì vòng đứt.' },
    { id: 'd15', title: 'Tờ khai của thợ đá Trần Sửu', sub: 'Viết lúc lâm chung, nhờ thầy đồ chép hộ',
      text: 'Tôi là Trần Sửu, thợ đá.\n\nĐêm ấy quan Lý sai tôi với ba người nữa khiêng phiến đá ong lấp miệng Giếng Cổ. Tiền công mỗi người hai quan.\n\nLúc đặt đá tôi nghe dưới ấy có tiếng. Không phải tiếng con bé. Là tiếng đàn ông, yếu lắm, gọi "Lệ ơi". Rồi tiếng con bé đáp lại. Chúng nó gọi nhau một lúc rồi thôi.\n\nTôi về hỏi vợ: cậu Khang đi đâu mà mấy hôm không thấy? Vợ tôi bịt miệng tôi lại.\n\nHai quan tiền ấy tôi không tiêu. Tôi chôn dưới ngưỡng cửa. Con cháu tôi về sau ai đào được thì đem lên Đình mà trả. Nhà họ Trần này nợ cái giếng ấy hai mạng người, không phải một.' },
    { id: 'd16', title: 'Trang cuối sổ tay của Minh', sub: 'Viết vội trong nhà Lý trưởng',
      text: 'Tôi chép lại ba cái tên điểm chỉ dưới Huyết Thư:\n\n— ĐOÀN Văn Khải, Lý trưởng: kẻ chủ mưu.\n— PHÓ Văn Bảy, gác đình: kẻ cài then.\n— TRẦN Sửu, thợ đá: kẻ lấp giếng.\n\nRồi tôi chép tên bốn đứa chúng tôi:\n\n— Đoàn Khánh Linh.\n— Phó Quang Minh.\n— Trần Anh Tuấn.\n— Lê Thu Hà.\n\nBa họ trùng. Chỉ có Hà là không.\n\nĐây không phải tai nạn. Cơn bão, vạt núi sạt, lối mòn không có trên bản đồ — làng đã gọi con cháu về.\n\nCâu hỏi còn lại: ai trong chúng tôi biết trước điều này?\n\nVà dưới giếng có HAI người. Biên bản chỉ ghi một. Người thứ hai tên là Khang.' }
  );

  CFG.ITEMS.ring = { name: 'Nhẫn Bạc của Khang', desc: 'Chiếc nhẫn bạc trơn, mặt trong khắc một chữ "Lệ". Lời hứa chưa kịp giữ của người nằm dưới giếng trước nàng.' };

  CFG.LINES.ringFound = 'Minh: Nhẫn bạc. Mặt trong khắc chữ "Lệ". Người ấy đã định về đón cô.';
  CFG.LINES.tuanAfter = 'Minh: Tuấn còn sống. Nhưng muốn kéo cậu ấy lên thì phải có tay quay.';
  CFG.LINES.haAfter = 'Minh: Hà an toàn — vì Hà không mang họ của ai trong ba người đó.';
  CFG.LINES.ringHint = 'Manh mối mới: soi gương ở miếu nhỏ dưới gốc đa';

  /* kết thúc ẩn "Đoàn Viên" */
  CFG.ENDINGS.best = {
    title: 'ĐOÀN VIÊN',
    lines: [
      '“Nguyễn Thị Lệ.”',
      'Bạn đặt chiếc nhẫn bạc lên Đàn Ngũ Hành. “Khang gửi. Anh ấy không bỏ cô. Anh ấy xuống đó trước cô.”',
      'Ngọn lửa trắng tách làm hai. Từ phía giếng có một bóng người bước vào Đình — ướt sũng, lóng ngóng, như kẻ về muộn một trăm hai mươi năm.',
      'Lần này không ai cài then.',
      'Hai cái bóng đi qua bạn, qua ngưỡng cửa, ra sân. Nàng đeo nhẫn. Nàng cười — bạn chưa từng nghĩ khuôn mặt ấy cười được.',
      'Trăng lặn. Mưa tạnh. Dưới gốc đa có ba người nằm thiếp đi: Linh, Hà, và Tuấn — tay còn nắm sợi dây thừng.',
      'Sáng hôm sau đội cứu hộ tìm thấy bốn người trên một bãi đất trống. Không có ngôi làng nào ở đó. Chỉ có một cái giếng cạn, và dưới đáy, hai bộ hài cốt nằm quay mặt vào nhau.',
      'Người ta chôn họ chung một mộ. Bia chỉ khắc hai cái tên. Không có chữ “nương” nào cả.'
    ]
  };
  /* ===================== MỞ RỘNG: ĐÈO SẠT, RỪNG CẤM, SÔNG ÂM ===================== */
  CFG.SAVE_KEY = 'HuyetLeThon_save_v2';
  CFG.POS.spawn = [-5.5, 403.5]; CFG.POS.spawnYaw = 2.1;
  CFG.POS.cameraItem = [-10.6, 405.4];
  CFG.DIARIES.push(
    { id: 'd17', title: 'Sổ đò Bến Dưới', sub: 'Người lái đò ghi — tháng Năm đến rằm tháng Bảy, năm Giáp Tuất (1874)',
      text: 'Mồng chín tháng Năm.\nChở đêm cho quan Lý mười hai chuyến thóc xuống thuyền lái Tư Hợi. Quan dặn không thắp đèn, không ghi sổ. Tôi vẫn ghi.\n\nHai mươi tháng Năm.\nTrên thuyền Tư Hợi có hai phu nằm ho, nôn ra thứ nước trắng như nước vo gạo. Sáng ra không thấy họ nữa. Quan sai tôi chèo ra giữa dòng, buộc đá vào chân hai cái xác. Quan bảo: "Sông sâu, nước chảy, trôi đi đâu thì đi."\n\nMồng hai tháng Bảy.\nNhà gánh nước ở bến đổ bệnh trước nhất. Rồi tới cả xóm dưới.\n\nMồng năm.\nCô Lệ con thầy lang xuống tận bến, lấy than viết lên cột: ĐỪNG UỐNG NƯỚC SÔNG. Cô bảo cả làng chỉ được uống nước Giếng Cổ. Người ta mắng cô làm rối. Tôi biết cô nói đúng. Tôi không dám nói là tôi biết.\n\nRằm.\nThuyền Tư Hợi chìm ngay trước bến, giữa đêm, không một gợn gió. Tôi khoá đò, bỏ làng mà đi.\n\nAi đọc được thì nhớ: dịch xuống làng từ cái bến này, không phải từ cái giếng.' },
    { id: 'd18', title: 'Trang cuối nhật trình của Morel', sub: 'Trung uý L. Morel — bản dịch tay, nét mực run',
      text: 'Đêm 23 tháng 9 năm 1934.\n\nCó hai người đàn bà trong khu rừng này. Một mặc trắng, luôn đứng xa, như chỉ đường cho chúng tôi ra sông. Một mặc đỏ, bò theo sau, và chỉ lại gần khi có kẻ quay lưng bỏ chạy.\n\nThằng Lộc nói phải đứng yên mà nhìn thẳng vào nó. Tôi đã ra lệnh cho cả trạm: không ai được chạy.\n\nChìa khoá đò tôi khoá trong hòm. Nếu tôi không còn, mã hòm là ngày đoàn đặt chân tới đây — ghi trên mép tấm kính ảnh đầu tiên.\n\nNó đang tới. Tôi nghe thằng bé hét lên bằng thứ tiếng Pháp bập bẹ tôi dạy nó: "Courez!" — chạy đi —\n\n(Dòng mực kéo thành một vệt dài. Bên dưới, nét chữ trẻ con viết bằng than:)\n\nÔng Tây chạy. Con bảo ông ấy chạy. Con đứng yên nên con sống. Con xin lỗi.\n— Lộc' },
    { id: 'd19', title: 'Tấm kính ảnh trong lều tối', sub: 'Hiện ra dưới ánh đèn flash',
      text: 'Tấm kính ảnh 13x18. Mép giấy dán còn dòng mực tím: "Trạm Âm Linh — 21.IX.1934".\n\nTrên kính: một cậu bé đứng giữa trạm, giơ máy ảnh ngang mặt. Sau lưng cậu, một người đàn ông mặc quân phục đang chạy về phía bìa rừng — nơi có một cái bóng đỏ đang bò ra đón.\n\nCậu bé không nhìn theo. Cậu nhìn thẳng vào ống kính, như biết sẽ có người tìm thấy tấm kính này.\n\nKhuôn mặt ấy, Minh đã thấy trong album gia đình. Ông nội. Năm mười bốn tuổi.' }
  );
  CFG.ITEMS.ferryKey = { name: 'Chìa Khoá Đò', desc: 'Chìa sắt đen, buộc sợi dây gai mục. Thẻ gỗ khắc hai chữ "Bến Dưới".' };
  var L = CFG.LINES;
  L.followTracks = 'Minh: Dấu chân ba người đi xuống rừng. Mình phải theo.';
  L.shrineAfter = 'Minh: Cô ấy chỉ về phía đông bắc... nơi có ánh lửa tàn.';
  L.campDark = 'Minh: Lều tối đen kịt, mùi hoá chất rửa ảnh. Thử chụp đèn flash vào trong xem.';
  L.chestLocked = 'Minh: Hòm sắt khoá bốn số. Morel phải ghi mã ở đâu đó trong trạm.';
  L.chestSee = 'Minh: Cái hòm sắt sơn xanh dưới ngọn đèn bão kia... khoá số bốn chữ. Đồ của đoàn đo đạc.';
  L.chestHint0 = 'Minh: Không mở... Bốn con số. Hòm của đoàn đo đạc — mã chắc gắn với chính chuyến đi của họ.';
  L.chestHint1 = 'Minh: Ngày và tháng đoàn tới đây... Đoàn đo đạc nào cũng ghi chép cẩn thận. Phải có giấy tờ gì quanh trạm.';
  L.chestHint2 = 'Minh: Cuốn nhật trình trên bàn gỗ... trang đầu hẳn ghi ngày họ dựng trạm. Còn cái lều tối kia nữa — ông nội từng nói máy ảnh thấy được những gì đã xảy ra.';
  L.chestHint3 = 'Minh: Nhật trình viết "ngày 21 tháng 9". Tấm kính trong lều tối ghi "21.IX" — IX là số La Mã của tháng chín.';
  L.chestHint4 = 'Minh: Ngày 21, tháng 09... vậy là 2 - 1 - 0 - 9.';
  L.chestOpen = 'Minh: Chìa khoá đò... và trang cuối nhật trình của Morel.';
  L.redCamp = 'Minh: Đứng yên. Nhìn thẳng vào nó. Đừng quay lưng...';
  L.redGone = 'Minh: Nó lùi lại rồi. Ông nội nói đúng.';
  L.needFerryKey = 'Minh: Dây đò bị khoá xích. Phải có chìa — nhật trình nhắc tới một cái hòm sắt ở trạm đo đạc.';
  L.ferryReady = 'Minh: Chìa vừa ổ khoá. Kéo dây đò sang bờ bên kia...';
  L.landed = 'Minh: Bờ bắc. Lối mòn rừng tre dẫn lên núi — xa xa có ánh đèn lồng đỏ.';
  L.wreckHint = 'Minh: Xác thuyền buôn còn ngập nửa thân. Thử chụp một kiểu...';
  L.bridgeHint = 'Minh: Cầu đứt cả hai đầu. Phải xuôi bờ sông xuống bến đò.';
  CFG.OBJECTIVES.w2 = 'Theo dấu chân xuống Rừng Cấm, tìm đường tới ngôi làng';
  CFG.OBJECTIVES.w3 = 'Đi theo hướng bóng áo trắng chỉ — tìm trạm đo đạc bỏ hoang';
  CFG.OBJECTIVES.w4 = 'Lục soát trạm đo đạc — mở hòm sắt của trung uý Morel';
  CFG.OBJECTIVES.w5 = 'Tới cầu treo bắc qua sông Âm';
  CFG.OBJECTIVES.w6 = 'Xuôi bờ sông tới Bến Dưới, mở khoá đò ngang';
  CFG.OBJECTIVES.w7 = 'Theo lối mòn rừng tre về ngôi làng';
  /* gợi ý điều khiển: hiện trên màn hình (không lồng tiếng) và lưu lại trong sổ nhiệm vụ [Tab] */
  CFG.HINTS = {
    flash: '[F] Bật / tắt đèn pin',
    look: '[E] Nhặt đồ, tương tác — vật phẩm có ánh sáng mờ',
    tab: '[Tab] Xem nhiệm vụ, gợi ý, túi đồ và nhật ký',
    camera: '[C] Nâng / hạ Máy Ảnh Tâm Linh · [Chuột trái] Chụp ảnh',
    flashSpirit: 'Chụp ảnh ở nơi có ký ức tâm linh để thấy những gì đã xảy ra',
    run: '[Shift] Chạy · [Ctrl]/[X] Cúi người đi khẽ',
    ambush: '[C] rồi [Chuột trái]: chụp thẳng mặt nó để trấn áp · [E] trốn vào tủ, giường',
    hide: 'Giữ [Space] để nín thở · [E] ra ngoài',
    mirror: 'Giữ [R] soi Gương Đồng — vệt sáng trên vành gương chỉ hướng lễ vật',
    sanity: 'Thanh TÂM TRÍ tụt dần trong bóng tối và khi nhìn thấy Lệ Nương. Đứng dưới ánh đèn lồng hoặc bật đèn pin để hồi lại.',
    sanityLow: 'Tâm Trí đang thấp: bạn sẽ thấy ảo giác và Lệ Nương săn bạn thường xuyên hơn. Hãy tìm chỗ có ánh sáng!'
  };
  /* hướng dẫn chi tiết cho từng nhiệm vụ (sổ nhiệm vụ) */
  CFG.OBJ_HINT = {
    o1: 'Chiếc máy ảnh văng ra gần chiếc U-oát lật. Bật đèn pin, soi mặt đất quanh xe — vật phẩm có ánh sáng mờ. Lại gần rồi nhấn [E] để nhặt.',
    w2: 'Từ chỗ xe lật, đi theo con đường đất có cọc tiêu sơn trắng về phía bắc. Biển gỗ “LÀNG ÂM LINH” ở bìa rừng chỉ lối vào Rừng Cấm. Cứ bám theo cọc tiêu sẽ tới Miếu Sơn Thần.',
    w3: 'Qua Miếu Sơn Thần, tiếp tục theo cọc tiêu và biển “TRẠM ĐO ĐẠC” xuống phía đông bắc. Trạm là một khoảng trống có lều bạt, bàn gỗ và đống lửa tàn. Đọc cuốn sổ trên bàn, rồi vào chiếc lều tối và chụp ảnh.',
    w4: 'Hòm sắt của trung uý Morel khoá bằng 4 chữ số: ngày và tháng đoàn đo đạc tới nơi. Tấm kính ảnh vừa hiện ra ghi ngày tháng đó — xem lại trong mục Nhật ký [Tab].',
    w5: 'Từ trạm đo đạc, theo biển “CẦU TREO” đi tiếp về phía bắc tới bờ sông Âm.',
    w6: 'Cầu đã đứt. Theo biển “BẾN DƯỚI” xuôi bờ sông về phía đông. Dùng Chìa khoá đò lấy trong hòm sắt để mở khoá chiếc đò cáp, rồi kéo dây sang bờ bắc.',
    w7: 'Từ bến bờ bắc, theo lối mòn rừng tre đi lên núi về phía ánh đèn lồng đỏ — đó là cổng Làng Âm Linh.',
    o2: 'Xích cổng làng khoá bằng mã số. Xem kỹ bia đá và chữ viết quanh cổng để tìm năm xảy ra thảm kịch.',
    o3: 'Tay Quay Sắt nằm trong ngôi nhà cổ phía đông làng — tìm trên bàn thờ.',
    o4: 'Mang Tay Quay tới Giếng Cổ phía tây làng. Lắp vào tời [E] rồi quay kéo gàu lên.',
    o5: 'Lệ Nương đang săn bạn. Nâng máy ảnh và chụp thẳng mặt nàng để trấn áp, hoặc trốn vào tủ, gầm giường và nín thở.',
    o6: 'Vào nhà Lý trưởng phía đông. Chụp ảnh ở 3 nơi có ký ức tâm linh (những chỗ lạnh, có tiếng thì thầm).',
    o7: 'Két sắt của Lý trưởng khoá 3 chữ số. Thứ tự các hiện trường: Trói — Thiêu — Dìm. Để ý con số trong từng bức ảnh.',
    o8: 'Tới Nghĩa Địa Hoang phía tây bắc làng. Giữ [R] soi Gương Đồng: vệt sáng trên vành gương chỉ hướng 3 lễ vật bị chôn giấu.',
    o9: 'Mang 3 lễ vật và Huyết Thư lên Đình Làng ở cuối làng phía bắc.',
    o10: 'Đặt lễ vật lên Đàn Ngũ Hành [E], rồi đốt Huyết Thư để hoàn tất nghi lễ.'
  };
  CFG.OBJ_ORDER = ['o1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10'];

  /* lựa chọn thứ tư ở nghi lễ: quay lưng bỏ chạy */
  CFG.NAMES.push({ label: '(Quay lưng bỏ chạy)', flee: true });
  CFG.ENDINGS.flee = {
    title: 'KẺ QUAY LƯNG',
    lines: [
      'Bạn quay lưng.',
      'Sau lưng, ngọn lửa trên đàn tắt phụt. Tiếng Linh gọi tên bạn, rồi tiếng Hà, rồi không còn tiếng ai.',
      'Cổng làng mở sẵn. Lối mòn rừng tre, con sông, cánh rừng — tất cả rẽ ra cho bạn đi qua, như thể làng chỉ chờ đúng điều ấy.',
      'Thứ áo đỏ không đuổi theo. Nó không cần. Bạn vừa làm đúng điều ông nội bạn đã làm sáu mươi năm trước.',
      'Năm 2054. Một ông già đặt chiếc máy ảnh Liên Xô vào tay đứa cháu nội, kèm một mảnh giấy gấp tư.',
      '“Đừng quay lưng.”',
      'Ông không kể vì sao. Ông chỉ biết năm ấy lại là năm Giáp Tuất.'
    ]
  };
})();
