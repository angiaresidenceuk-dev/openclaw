# Tệp để chỉnh trong Blender

| Tệp | Nội dung |
|---|---|
| `phap-chu-statue-base.glb` | Tượng Phật trong chính điện Am Mây (khoảng 65 nghìn tam giác, 3 vật liệu thếp vàng), xuất từ `src/js/statue3d.js` bằng `node tools/export-statue.mjs` |

Tượng phỏng theo **mô tả** tượng Phật Pháp Chủ ở chùa Bái Đính (Ninh Bình): ngồi trên toà sen ba
tầng, chỉ lộ bàn chân phải; tay phải giơ ngang tầm đầu cầm nụ sen, tay trái ngửa trên chân trước
bụng; tóc xoắn ốc, nhục kế, tai dài, mắt nhìn xuống; hào quang lá bồ đề gắn nhiều tượng Phật nhỏ.
Đây là cách diễn giải theo hình tượng truyền thống, không phải bản sao đo đạc của pho tượng thật.
Muốn làm bản sao sát pho tượng thật (chụp ảnh dựng 3D, đo đạc), cần xin phép nhà chùa.

## Chỉnh trong Blender

1. *File → Import → glTF 2.0*, chọn tệp `.glb` này. Đơn vị: 1 = khoảng 1 m; tượng nhìn về +Z
   của glTF (trong Blender là −Y).
2. Gộp các phần cần nặn (thân, đầu, tay) bằng *Ctrl+J*, thêm *Remesh* (voxel 0.02–0.03) rồi vào
   *Sculpt Mode* để nặn mặt, nếp áo, ngón tay.
3. Giảm lưới (*Decimate* hoặc retopo) về khoảng 20–40 nghìn tam giác; bake normal map + AO từ bản nặn.
4. *File → Export → glTF 2.0 (.glb)*, bật *Draco compression*; đặt tệp vào `src/assets/models/`
   và thêm một ô trong `src/js/assets.js` để thay tượng dựng bằng code.
