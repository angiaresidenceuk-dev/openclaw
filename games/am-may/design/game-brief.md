# Game Brief: Am Mây

**One-sentence pitch:** Một ngôi am nhỏ trên núi mây mở cửa theo lịch âm Việt Nam, nơi bạn thắp nhang, thỉnh chuông, ngồi yên và thả đèn hoa đăng cạnh những người lạ mà không ai phải nói một lời.

## Core loop
- Bước qua cổng tam quan → chọn một chỗ trong sân (bồ đoàn, bát hương, gác chuông, hồ sen).
- Làm một nghi thức nhỏ (thắp nhang, lạy, thỉnh chuông, gõ mõ, lần chuỗi) hoặc ngồi tĩnh tâm có hẹn giờ.
- Nhận lại sự yên: khói nhang, tiếng chuông lan khắp sân, những người khác đang ngồi cạnh; ghi vào sổ tay, tạo thiệp.
- Quay lại vào Mùng 1, ngày Rằm (HUD đếm ngày; đêm Rằm có trăng tròn và đèn hoa đăng).

## Player goal & fail state — what "working" looks like
- Một lượt ghé trọn vẹn khi người chơi đã ngồi yên ít nhất một phiên tĩnh tâm (≥1 phút) hoặc làm xong một nghi thức, và rời đi thấy nhẹ hơn. Không có thua; "hỏng" là khi có gì phá sự yên: phải chờ, bị làm phiền, bị đòi tiền, hoặc lộ lời nguyện.

## MVP — what must exist to be the game
1. Cảnh Am Mây (chùa Việt) trên một màn hình dọc, chạm để đi tới, ngày đêm theo giờ Việt Nam.
2. Nghi thức: thắp 3 nén nhang, lạy 3 lạy, chắp tay, thỉnh đại hồng chung, gõ mõ.
3. Tĩnh tâm có hẹn giờ + hướng dẫn thở, và chuỗi 108 hạt.
4. Lịch âm Việt Nam: ngày âm, can chi, Rằm/Mùng 1, ngày lễ, pha trăng.
5. Thả đèn hoa đăng với lời nguyện chỉ lưu trên máy.
6. Cùng tĩnh tâm: thấy người khác trong cùng sân, không chat, không tên; hết chỗ thì chơi riêng, không xếp hàng.
7. Sổ tay hôm nay + thiệp chia sẻ 1080×1350.

## Out of scope — not building this
- Chat, bình luận, danh sách bạn bè, tài khoản/đăng nhập.
- Quyên góp, công đức online, quảng cáo, vật phẩm trả phí.
- Bói toán, xin xăm, giải hạn.
- Tụng kinh ghi âm, livestream, ứng dụng native.
- Chùa có thật, tượng chi tiết, nhân vật tôn giáo có tên.

## Build order
1. Lịch âm Việt Nam (logic rủi ro nhất: sai một ngày là mất niềm tin).
2. Bố cục cảnh + đường đi + vẽ cảnh (chứng minh "cảm giác yên" có thật).
3. Nghi thức và âm thanh tổng hợp.
4. Tĩnh tâm + chuỗi hạt.
5. Máy chủ hiện diện (SSE) + chế độ một mình.
6. Hoa đăng, sổ tay, thiệp chia sẻ.

---
**Who it's for / what they feel:** Người Việt 18–35 tuổi mệt mỏi, ở xa chùa hoặc bận vào ngày Rằm; muốn mười phút yên tĩnh có người bên cạnh mà không phải giao tiếp.

**Art & audio direction:** Sa bàn 3D low-poly (Three.js) xoay được, màu sơn mài (đỏ son, vàng thếp, nâu gỗ, xanh rêu), mây núi và trăng theo giờ thật; có bản 2D cho máy yếu; chuông, mõ, gió, chim, dế tổng hợp bằng Web Audio.

**Reference game:** Sansa (산사, web Hàn Quốc 2026): giữ ý "ngồi cạnh nhau không chat"; bỏ hàng chờ, bỏ cúng tiền, thêm lịch âm, hoa đăng, tĩnh tâm có hướng dẫn. Phân tích đầy đủ: `design/market-analysis-sansa.md`.
