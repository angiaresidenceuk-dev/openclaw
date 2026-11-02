# Mô hình 3D tải ngoài

Game tự nạp các tệp ở đây theo `src/js/assets.js` (`MODEL_SLOTS`). Thiếu tệp thì
game dùng phần dựng bằng code, không lỗi.

| Tệp | Mô hình | Tác giả | Giấy phép | Thay cho |
|---|---|---|---|---|
| `temple-enviroment.glb` | [temple enviroment](https://sketchfab.com/3d-models/temple-enviroment-3a4d5b2bed164fe29cf4da0b96f1adf1) | Phuong Yen (kienvtcacademy2004), modeling by trungkienvtca | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | chính điện |

## Thêm tệp

1. Đăng nhập Sketchfab (tài khoản miễn phí), mở trang mô hình, bấm **Download 3D Model**, chọn **GLB**.
2. Đổi tên thành `temple-enviroment.glb`, đặt vào thư mục này (trên GitHub: *Add file → Upload files*).
3. Chạy `node server/presence-server.mjs`, mở `http://localhost:8787`. Nếu vị trí hoặc kích thước
   chưa khớp, chỉnh `center`, `width`, `depth`, `yaw`, `hides` của ô trong `src/js/assets.js`.

CC BY 4.0 yêu cầu ghi công tác giả, tên tác phẩm, đường dẫn, giấy phép và nói rõ nếu có chỉnh sửa
(game co giãn và đặt lại vị trí). Game đã hiện các thông tin này trong **Sổ tay → Về Am Mây → Ghi công**.
