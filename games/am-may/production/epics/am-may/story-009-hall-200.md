# Story 009: Chính điện 200 chỗ ngồi

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; real-phone performance check pending
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Player request 2026-11-02: "chùa nào quy mô ngồi được 200 chỗ ngồi"

Search result: no free (CC0 / CC BY) Vietnamese-style temple model with a 200-seat
interior was found (Sketchfab, Meshy, Poly Pizza, OpenGameArt; interior scenes found
were Gothic, Thai or Japanese). The hall is therefore built in code; an external shell
can still replace it through `src/js/assets.js`.

**Engine**: Web (Three.js r128 + Canvas 2D) | **Risk**: MEDIUM (200 animated figures on low-end phones)

---

## Acceptance Criteria

- [x] Một chính điện chứa đúng 200 bồ đoàn: 10 hàng × 20 chỗ, hai khối hai bên lối đi giữa, bệ thờ và bát hương phía trước; `room.capacity` = số bồ đoàn (kiểm tra lúc tải).
- [x] Sân trước có gác chuông và cây bồ đề; hồ sen, vườn, tam quan giữ nguyên; mọi đường đi hợp lệ (test).
- [x] 3D: mái tự mờ khi người chơi vào trong điện để thấy các hàng người ngồi; người chơi khác vẽ bằng InstancedMesh (vài lệnh vẽ cho cả 200 người), bồ đoàn cũng instanced.
- [x] 2D: chính điện vẽ dạng bổ cắt, đủ 200 chỗ, nhân vật thu nhỏ cho vừa lưới.
- [x] Đầy 200 thì người tiếp theo vào điện mới (Điện 2), không xếp hàng; HUD ghi "Điện N · x/200 chỗ"; bồ đoàn ghi "hàng, chỗ".

---

## Files

- `src/js/world.js`, `src/js/tuning.js`, `src/js/render.js`, `src/js/view2d.js`, `src/js/view3d.js`, `src/js/main.js`, `src/js/assets.js`
- `tests/unit/world_meditation.test.mjs`
- `tools/crowd-test.mjs` (real SSE test sessions for load and screenshots), `tools/qa-crowd.mjs`, `tools/qa-screens.mjs`

## Test Evidence

- `production/qa/evidence/story-009-hall-200/` — 150 test sessions seated plus the player: arriving with the roof on, seated inside with the roof faded, the whole hall, the 2D hall, a full-moon night; `notes.txt` has the presence line and frame rate.
- A second run with 300 sessions opened Điện 2 when Điện 1 filled (`crowd-test` log: rooms {"1":200,"2":100} across both runs).
- `node --test tests/unit/*.test.mjs` — 42 pass.
