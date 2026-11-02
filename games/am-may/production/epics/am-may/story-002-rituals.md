# Story 002: Nghi thức: nhang, lạy, chắp tay, chuông, mõ

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending a human playtest
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md` (minimal tier — the brief is the design record)
**Requirement**: Brief MVP feature 2

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (HTML5 Canvas 2D + Web Audio, ES modules) | **Risk**: MEDIUM
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] Thắp nhang = 3 nén, cháy 5 phút, chờ 20 giây mới thắp tiếp; bát hương hiện cả nhang của người cùng sân.
- [x] Lạy 3 lạy có hoạt cảnh quỳ, cúi, đứng; chắp tay giữ 3 giây.
- [x] Thỉnh chuông: chuông đung đưa, sóng âm lan khắp sân, chờ 15 giây/người; máy chủ chỉ phát chuông chung mỗi 10 giây.
- [x] Gõ mõ có âm thanh và rung nhẹ; số đếm vào sổ tay hôm nay.

---

## Out of Scope

- Chat, tài khoản, quyên góp, bói toán (brief: Out of scope).

---

## Files

- `src/js/rituals.js`
- `src/js/audio.js`
- `src/js/render.js`
- `tests/unit/rituals.test.mjs`

---

## QA Test Cases

N/A — no qa-lead specs at this tier; implemented against the Acceptance Criteria above.

---

## Test Evidence

- `tests/unit/rituals.test.mjs`
- `production/qa/evidence/story-002-rituals/`

Run: `node --test tests/unit/*.test.mjs` · Screens: `node server/presence-server.mjs` then `node tools/qa-screens.mjs`.
