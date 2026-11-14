# HUYẾT LỆ THÔN — The Weeping Village

Game kinh dị sinh tồn góc nhìn thứ nhất, xây dựng bằng Three.js và Web Audio API. Phiên bản 0.6.0.

## Chạy game

Tải repository về máy, giải nén và mở `index.html` bằng trình duyệt Chrome hoặc Edge trên máy tính. Không cần cài dependency hay chạy server. Three.js được tải từ CDN và có bản dự phòng nhúng để sử dụng khi mất kết nối.

Nhấn bắt đầu để kích hoạt âm thanh và điều khiển chuột. Các phím điều khiển được hiển thị trong game.

## Cấu trúc

- `index.html`: khởi động và giao diện.
- `css/style.css`: giao diện, hiệu ứng và font tiếng Việt nhúng.
- `js/`: cấu hình, texture, âm thanh, model, bản đồ, điều khiển, AI, giải đố và game loop.

## Tài nguyên và ghi công

- Three.js r128: MIT, thông tin bản quyền được giữ trong bản thư viện nhúng.
- Mesh, trang phục, tóc và texture nhân vật từ MakeHuman system assets (CC0): https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html
- Font Noto Sans: SIL Open Font License; nội dung giấy phép được lưu trong `css/style.css`.
- Lồng tiếng Minh, Lan và Tuấn được tạo bằng ElevenLabs. Hùng hiện dùng phụ đề.

Các model, texture, font và âm thanh cần thiết được nhúng trong mã để hỗ trợ mở trực tiếp bằng `file://`.
