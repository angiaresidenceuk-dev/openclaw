# Am Mây

Chốn tĩnh tâm trực tuyến cho người Việt: một ngôi am nhỏ trên núi mây, mở cửa theo lịch âm.
Thắp ba nén nhang, thỉnh đại hồng chung, ngồi tĩnh tâm có hướng dẫn thở, lần chuỗi 108 hạt,
thả đèn hoa đăng trên hồ sen, cạnh những người lạ mà không ai phải nói một lời.

**Không chat. Không quảng cáo. Không quyên góp. Không bói toán.** Tên và lời nguyện chỉ lưu trên máy người chơi.

**Cảnh 3D tương tác** (Three.js): kéo để xoay quanh am, chụm hai ngón hoặc lăn chuột để gần/xa,
chạm để đi tới. Máy không có WebGL tự chuyển sang cảnh 2D; nút **2D/3D** trên góc phải để đổi qua lại.

Am Mây được thiết kế sau khi phân tích hiện tượng chùa online **Sansa (산사)** của Hàn Quốc
(xem `design/market-analysis-sansa.md`). Đây là một game nguyên bản cùng thể loại, làm lại từ
văn hoá Việt, không sao chép Sansa.

## Chạy thử

Cần Node.js 22+. Không cần cài thư viện.

```bash
node server/presence-server.mjs      # mở http://localhost:8787
```

Mở hai tab (hoặc hai điện thoại cùng mạng) để thấy nhau trong cùng một chính điện. Mỗi điện có
**200 bồ đoàn**; đầy thì người tiếp theo vào điện mới, không phải xếp hàng. Mở `src/index.html`
trực tiếp qua một máy chủ tĩnh bất kỳ thì game chạy ở chế độ "một mình", vẫn đủ mọi nghi thức.

Thử ngày giờ khác (QA): `http://localhost:8787/?t=2026-11-23T21:00:00%2B07:00` (đêm Rằm tháng Mười).

## Kiểm thử

```bash
node --test tests/unit/*.test.mjs    # lịch âm, nghi thức, tĩnh tâm, bản đồ, phòng nhiều người
node tools/qa-screens.mjs            # (máy chủ phải đang chạy) chụp ảnh QA vào production/qa/evidence/
node tools/crowd-test.mjs 150        # mở 150 phiên kiểm thử thật, mỗi phiên ngồi một bồ đoàn
node tools/qa-crowd.mjs              # chụp chính điện đông người (chạy cùng crowd-test)
```

## Đóng gói một tệp

```bash
node tools/build-artifact.mjs dist/am-may.html
```

Tạo một trang HTML duy nhất (~175 KB, tải Three.js từ cdnjs) để đăng lên itch.io, Claude Artifact, hoặc gửi đi. Bản một tệp
không có máy chủ nên chạy chế độ một mình.

## Triển khai có chế độ "cùng tĩnh tâm"

- Một tiến trình Node phục vụ cả trang và luồng hiện diện (`/api/presence` dạng Server-Sent Events).
- Đặt sau nginx/Cloudflare: tắt buffer cho `/api/presence` (`X-Accel-Buffering: no` đã có sẵn).
- Biến môi trường: `PORT`, `HOST`, `ALLOWED_ORIGIN` (khi trang và máy chủ khác tên miền; trang dùng `?server=https://...`).
- Sức chứa: `src/js/tuning.js` → `room.capacity` (200 người/điện, phải bằng số bồ đoàn trong `world.js`), `room.maxRooms` (100 điện).
- Đặt tên miền in trên thiệp: `share.url` trong `src/js/tuning.js`.

Trước khi phát hành công khai tại Việt Nam, đọc mục **Rủi ro và tuân thủ** trong
`design/market-analysis-sansa.md` (Nghị định 147/2024/NĐ-CP về trò chơi điện tử, dữ liệu cá nhân).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `design/market-analysis-sansa.md` | Phân tích Sansa và thị trường Việt Nam |
| `design/game-brief.md` | Brief một trang (tài liệu thiết kế ở mức `minimal`) |
| `production/epics/am-may/` | Epic và 9 story |
| `production/qa/evidence/` | Ảnh chụp game chạy thật cho từng story |
| `src/index.html`, `src/styles.css` | Trang và giao diện |
| `src/js/lunar.js` | Âm lịch Việt Nam (UTC+7), can chi, Rằm/Mùng 1, ngày lễ |
| `src/js/world.js` | Bố cục am, bồ đoàn, điểm nghi thức, tìm đường |
| `src/js/view3d.js` | Cảnh 3D (Three.js): mô hình dựng bằng code, camera xoay/thu phóng, chạm để đi |
| `src/js/view2d.js`, `render.js` | Cảnh 2D (canvas) dự phòng, trời theo giờ, trăng theo pha |
| `src/vendor/three.min.js` | Three.js r128 (MIT) |
| `src/js/rituals.js`, `meditation.js` | Nghi thức, tĩnh tâm, chuỗi ngày (hàm thuần) |
| `src/js/audio.js` | Chuông, mõ, gió, chim, dế tổng hợp bằng Web Audio |
| `src/js/presence.js`, `server/` | Hiện diện nhiều người (SSE), không chat |
| `src/js/share.js` | Thiệp chia sẻ 1080×1350 |
| `src/js/tuning.js` | Mọi con số chỉnh được |

## Quy trình studio

Thư mục này được dựng từ template [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
(MIT, © 2026 Donchitos), ở mức `modes.rigor: minimal`: brief một trang → story → code → ảnh chụp bằng chứng.
Mở Claude Code **ngay trong thư mục này** để dùng các lệnh của studio (`/help`, `/dev-story`, `/story-done`,
`/playtest-report`, `/localize`...). README gốc của template: `docs/CCGS-README.md`.
