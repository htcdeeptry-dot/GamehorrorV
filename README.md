# HUYẾT LỆ THÔN: OÁN LINH

Game kinh dị sinh tồn góc nhìn thứ nhất chạy trực tiếp trong trình duyệt. Bối cảnh: mùa thu 1994, làng Âm Linh ở vùng cao phía Bắc, mắc kẹt trong một đêm trăng máu lặp lại mỗi sáu mươi năm.

## Chạy game

Tải repository về, mở `index.html` bằng Chrome, Edge hoặc Firefox bản mới. Không cần server, không cần mạng, không có thư viện hay tài nguyên ngoài: toàn bộ hình khối, texture, nhân vật và âm thanh được sinh bằng code khi tải game.

Bảng phím và ghi chú nằm trong `DOC_TRUOC.txt` và mục Điều khiển trong menu. Cấu hình đồ hoạ (Thấp / Trung bình / Cao / Cực cao, tự dò theo GPU, độ phân giải động) nằm trong mục Thiết lập.

## Cấu trúc

- `index.html`, `css/style.css`: giao diện, HUD, khung cắt cảnh.
- `js/config.js`, `js/story.js`: hằng số, cấu hình đồ hoạ, 16 trang nhật ký, lời thoại, ba kết thúc.
- `js/engine.js`, `js/shaders.js`: engine WebGL2 tự viết (gộp lưới tĩnh, instancing, skinning và biến hình trên GPU, hậu kỳ).
- `js/procedural_assets.js`: nhiễu Perlin/Worley và texture PBR thủ tục.
- `js/audio.js`: âm thanh tổng hợp bằng Web Audio API, định vị 3D.
- `js/models.js`, `js/world.js`: kiến trúc, cây cối, bản đồ năm khu, va chạm.
- `js/characters.js`: nhân vật người (khung xương, khuôn mặt, khẩu hình, biểu cảm, chuyển động).
- `js/player.js`, `js/ai.js`, `js/puzzles.js`: người chơi, Lệ Nương và đạo diễn nhịp sợ, câu đố.
- `js/cutscenes.js`: hệ cắt cảnh điện ảnh.
- `js/main.js`: vòng lặp, thiết lập, lưu/tải.

## Nhân vật & giấy phép tài nguyên
- `js/mh_assets.js`: lưới thân người, khung xương 163 khớp, quần áo, tóc, giày và texture từ **MakeHuman** (CC0 — https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md), nhúng base64 để chạy được qua `file://`.
- `js/mh_rig.js`: skinning 4 trọng số trên GPU (ma trận xương trong texture float), nắn tư thế A, xương mặt cho khẩu hình / chớp mắt / lông mày / ánh nhìn.
- Bốn nhân vật 1994 dùng trọn bộ MakeHuman; các nhân vật 1874 và linh hồn dùng đầu + tay + tóc MakeHuman trên trang phục cổ dựng bằng mã.
