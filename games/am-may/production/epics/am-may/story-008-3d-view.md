# Story 008: Giao diện 3D tương tác

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending a human playtest on real phones
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md` (Art & audio direction)
**Requirement**: Player request 2026-11-02: "giao diện 3D tương tác như Sansa"

**ADR Governing Implementation**: N/A (minimal — no ADRs). Decision: Three.js r128 UMD (MIT),
vendored at `src/vendor/three.min.js`, loaded from cdnjs in single-file builds. All models are
built from primitives in code; no 3D asset files.
**Engine**: Web (WebGL via Three.js r128) | **Risk**: MEDIUM (low-end Android, in-app webviews)

---

## Acceptance Criteria

- [x] Cảnh 3D low-poly của Am Mây: chính điện mái chồng diêm đầu đao, gác chuông có chuông đồng đung đưa, đỉnh hương với nhang và khói, sân gạch 24 bồ đoàn, hồ sen có đèn hoa đăng, tam quan, tường bao, cây bồ đề, cây đại, bảo tháp, lũy tre, núi xa và mây.
- [x] Kéo để xoay quanh am, chụm hai ngón hoặc lăn chuột để gần/xa, phím mũi tên và +/− trên bàn phím; chạm vào bồ đoàn, bát hương, gác chuông, hồ sen hoặc mặt sân để đi tới.
- [x] Trời, ánh nắng, trăng, sao, đom đóm theo giờ Việt Nam; đêm Rằm trăng tròn; khi tĩnh tâm camera từ từ lại gần.
- [x] Người chơi khác hiện thành nhân vật 3D (màu áo, dáng), có hoạt cảnh đi, ngồi, chắp tay, lạy.
- [x] Nút đi nhanh (Ngồi xuống, Bát hương, Gác chuông, Hồ sen) để không lạc khi điểm đến nằm ngoài khung hình.
- [x] Không có WebGL hoặc không tải được thư viện 3D: tự dùng cảnh 2D; nút 2D/3D để đổi qua lại, ghi nhớ lựa chọn.

---

## Files

- `src/js/view3d.js`, `src/js/view2d.js`, `src/js/main.js`, `src/index.html`, `src/styles.css`
- `src/vendor/three.min.js`, `src/vendor/README.md`
- `tools/build-artifact.mjs`, `tools/qa-screens.mjs`
- `tests/unit/presence.test.mjs` (regression found while testing the 3D bundle)

## Test Evidence

- `production/qa/evidence/story-008-3d-view/` (orbit at dusk, switch to 2D, 2D fallback)
- Every other story folder in `production/qa/evidence/` now shows the 3D view.
