# Story 010: Tượng Phật phỏng theo tượng Pháp Chủ, chùa Bái Đính

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**Requirement**: Player request 2026-11-02: "dựng 3D tượng Phật chùa Bái Đính điện Pháp Chủ"

Source of the description (posture, hands, throne, halo): published visitor guides and
encyclopedia entries about Điện Pháp Chủ (see the chat answer for links). Built entirely from
primitives in `src/js/statue3d.js` as an interpretation of the traditional iconography; it is not
a measured copy of the statue. An exact replica would need the pagoda's permission.

## Acceptance Criteria

- [x] Tượng ngồi trên toà sen ba tầng (hai tầng cánh ngửa so le, một tầng cánh rủ), chỉ lộ bàn chân phải.
- [x] Tay phải giơ ngang tầm đầu cầm nụ sen; tay trái ngửa trên chân, trước bụng.
- [x] Đầu tóc xoắn ốc (instanced), nhục kế, tai dài, mắt nhìn xuống, miệng hơi cười, bạch hào; cà sa vắt chéo.
- [x] Hào quang lá bồ đề thếp vàng có viền, gân lá, vòng hào quang sau đầu và hơn trăm tượng Phật nhỏ.
- [x] Đồng thếp vàng có phản chiếu (env map), chính điện nâng cao cho vừa tượng; bản 2D có hào quang lá bồ đề, tay cầm sen, toà sen ba tầng.
- [x] Xuất được GLB để chỉnh trong Blender: `assets/blender/phap-chu-statue-base.glb` (`node tools/export-statue.mjs`).

## Files

- `src/js/statue3d.js`, `src/js/view3d.js`, `src/js/render.js`, `src/js/main.js`
- `tools/export-statue.mjs`, `tools/vendor/GLTFExporter.js`, `assets/blender/`

## Test Evidence

- `production/qa/evidence/story-010-phap-chu-statue/01-3d-front.png`, `02-2d-altar-ram-night.png`, `03-3d-ram-night-incense.png`
