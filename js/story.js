/* HUYẾT LỆ THÔN — story.js
   Phần cốt truyện mở rộng: tầng bí ẩn thứ hai (quá khứ 1874, vòng lặp 1934, hiện tại 1994),
   8 trang nhật ký mới, vật phẩm ẩn và kết thúc thứ ba. Nạp ngay sau config.js. */
(function () {
  'use strict';
  var H = window.HuyetLeThon, CFG = H.CFG;

  /* biên bản của Lý trưởng: dòng chữ nhỏ giờ che giấu thêm một điều */
  CFG.DIARIES[3].text = CFG.DIARIES[3].text.replace('Thằng bé chết vì ta rước thầy chậm.', 'Còn thằng Khang... điều ấy ta không dám viết ra ở đây. Ta viết vào tờ khác, bằng thứ mực khác.');

  CFG.DIARIES.push(
    { id: 'd9', title: 'Thư Khang gửi Lệ', sub: 'Giấu trong ống tre, chưa kịp gửi — tháng Bảy 1874',
      text: 'Lệ,\n\nTôi đã xem sổ kho. Ba trăm thạ thóc triều đình phát chẩn, cha tôi bán cho lái buôn dưới xuôi từ tháng Năm. Người làng đói mà chết chứ nào phải chỉ vì dịch.\n\nĐêm mai tôi lên huyện. Tôi mang theo sổ. Tôi biết làm vậy là bất hiếu, nhưng tôi không nhìn mặt lũ trẻ được nữa.\n\nXong việc tôi sẽ về đón Lệ. Chiếc nhẫn bạc mẹ tôi để lại, tôi nhờ chú Bảy gác đình giữ hộ — khi nào về tôi sẽ tự tay đeo cho Lệ, trước mặt cả làng, cho ai nấy thôi xì xào.\n\nNếu ba ngày tôi không về, Lệ đừng tin bất cứ điều gì người ta nói về tôi. Và đừng ra giếng một mình.\n\nKhang.' },
    { id: 'd10', title: 'Sổ kho thóc phát chẩn', sub: 'Trang cuối — có dấu triện Lý trưởng',
      text: 'Tháng Năm, Giáp Tuất.\n\nNhận của quan huyện: thóc phát chẩn 300 thạ.\nPhát cho dân: 40 thạ.\nXuất bán cho lái Tư Hợi (thuyền đậu bến dưới): 260 thạ — thu 780 quan.\n\n(Nét chữ khác, mực đỏ, viết đè lên:)\nCha ơi con đã chép lại trang này. Bản chép con để ở chỗ cha không tìm được.\n\n(Nét chữ thứ ba, run, viết sau đó nhiều năm:)\nNó để bản chép trong áo. Người ta vớt lên cùng nó. Ta đã đốt. Ta đã đốt hết mà sao trăng vẫn đỏ.' },
    { id: 'd11', title: 'Nhật trình đoàn đo đạc Đông Dương', sub: 'Bản dịch tay — tháng 9 năm 1934',
      text: 'Ngày 21 tháng 9.\n\nTrung uý Morel cho dựng trạm ở một ngôi làng không có trên bản đồ của Sở Địa dư. Dân phu bỏ trốn hết từ chiều, chỉ còn thằng bé dẫn đường tên Lộc, người họ Phó.\n\nTrăng đêm nay màu gan lợn. Đồng hồ của cả đoàn đứng lúc 0 giờ 49.\n\nNgày (không rõ).\n\nMorel xuống giếng đo mực nước, không lên. Hai người nữa đi tìm, không về. Thằng Lộc cứ ôm khư khư cái máy ảnh của đoàn. Nó bảo: "Bà ấy sợ thứ ánh sáng này. Bà ấy chỉ đuổi người nào quay lưng chạy."\n\nNó xin tôi cái máy. Tôi cho. Tôi không cần ảnh nữa.\n\nNếu có ai đọc: thằng bé ra được. Tôi thấy nó chạy qua cổng lúc xích tự tuột. Cổng chỉ mở cho người họ Phó. Tôi không hiểu vì sao.' },
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

  /* kết thúc: bản "Siêu Thoát" giờ còn dang dở; thêm kết thúc ẩn "Đoàn Viên" */
  CFG.ENDINGS.true.lines = [
    '“Nguyễn Thị Lệ.”',
    'Ngọn lửa trên đàn chuyển từ đỏ sang trắng. Bảy thước lụa điều rơi khỏi cổ tay nàng, từng vòng một.',
    'Lần đầu tiên sau một trăm hai mươi năm, có người gọi nàng bằng cái tên mẹ đặt.',
    'Nàng thôi khóc. Nhưng trước khi tan đi, nàng ngoái nhìn về phía cái giếng — rất lâu.',
    'Trăng lặn. Mưa tạnh. Dưới gốc đa có hai người nằm thiếp đi: Linh và Hà. Còn thở.',
    'Tuấn không có ở đó. Đội cứu hộ tìm ba ngày, chỉ thấy một chiếc đồng hồ dừng ở 0 giờ 49.',
    'Vòng lặp đã đứt. Nhưng dưới giếng vẫn còn một người chưa ai gọi tên.'
  ];
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
})();
