# Story 001: Cảnh Am Mây và đi lại

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending a human playtest
> **Layer**: Foundation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md` (minimal tier — the brief is the design record)
**Requirement**: Brief MVP feature 1

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (HTML5 Canvas 2D + Web Audio, ES modules) | **Risk**: LOW
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] Cảnh dọc 360×640 có cổng tam quan, lối đi, hồ sen, vườn đá, sân gạch 24 bồ đoàn, bát hương, gác chuông, chính điện, cây bồ đề.
- [x] Chạm vào cảnh: người chơi đi theo đường hợp lệ (không lội qua hồ), tới bồ đoàn/điểm nghi thức thì bảng hành động đổi theo chỗ.
- [x] Trời, mây, độ tối đổi theo giờ Việt Nam; màn hình dọc điện thoại và màn hình rộng đều không che hồ sen.

---

## Out of Scope

- Chat, tài khoản, quyên góp, bói toán (brief: Out of scope).

---

## Files

- `src/js/world.js`
- `src/js/render.js`
- `src/js/main.js`
- `src/index.html`
- `src/styles.css`
- `tests/unit/world_meditation.test.mjs`

---

## QA Test Cases

N/A — no qa-lead specs at this tier; implemented against the Acceptance Criteria above.

---

## Test Evidence

- `tests/unit/world_meditation.test.mjs`
- `production/qa/evidence/story-001-scene-and-walk/`

Run: `node --test tests/unit/*.test.mjs` · Screens: `node server/presence-server.mjs` then `node tools/qa-screens.mjs`.
