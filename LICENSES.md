# Tài nguyên nhân vật

- **13 nhân vật** (`js/chars/mx_*.js`) và **20 clip chuyển động** (`js/mx_anims.js`): tạo bằng **Meshy AI** từ tài khoản Meshy của chủ dự án (ảnh concept → model 3D → texture PBR 2K → giảm lưới ~30K tam giác → gắn xương Mixamo → clip motion). Quyền sử dụng theo điều khoản gói Meshy của tài khoản đó (gói trả phí: tài sản thuộc về người tạo; gói miễn phí: CC BY 4.0, cần ghi công "Made with Meshy").
- Dữ liệu đã được chuyển từ GLB sang dạng nhúng base64 để game chạy qua `file://`.

# Lồng tiếng

- **96 câu thoại/dẫn truyện** (`js/vo_data.js`, phát bằng `js/voice.js`): tạo bằng **ElevenLabs** (model `eleven_v4`, giọng tiếng Việt trong thư viện giọng ElevenLabs) từ tài khoản ElevenLabs của chủ dự án, gói **miễn phí**.
- Gói miễn phí của ElevenLabs chỉ cho dùng **phi thương mại** và **phải ghi công ElevenLabs** (vd. "Voice by ElevenLabs – elevenlabs.io"). Muốn phát hành thương mại cần nâng lên gói trả phí rồi tạo lại audio.
- Phân vai: Minh – Tuan Khang; Linh – Hiền Anh; Hà – Thanh Vlog; Tuấn – Thieuthattha09; người dẫn truyện – Son; Lý trưởng Khải / Huyết Thư – Tung Anh; Phó Bảy – Dũng Anda; Mẹ nàng – Thanh Nhàn; Lệ – giọng nữ trẻ trong thư viện.
- Audio đã được cắt khoảng lặng, chuẩn hoá âm lượng (-16 LUFS), nén mono 56 kbps và nhúng base64 để chạy qua `file://`.
