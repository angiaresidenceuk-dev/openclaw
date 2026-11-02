# Story 005: Đèn hoa đăng và lời nguyện riêng tư

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending a human playtest
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md` (minimal tier — the brief is the design record)
**Requirement**: Brief MVP feature 5

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (HTML5 Canvas 2D + Web Audio, ES modules) | **Risk**: MEDIUM
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] Viết lời nguyện ≤80 ký tự, chọn màu (hồng sen, đỏ, vàng), thả đèn; đèn trôi 10 phút trên hồ.
- [x] Lời nguyện chỉ lưu trên máy (sổ nguyện); máy chủ chỉ nhận màu đèn, không bao giờ nhận chữ.
- [x] Chờ 30 giây giữa hai lần thả.

---

## Out of Scope

- Chat, tài khoản, quyên góp, bói toán (brief: Out of scope).

---

## Files

- `src/js/rituals.js`
- `src/js/render.js`
- `src/js/main.js`
- `server/rooms.mjs`
- `tests/unit/rituals.test.mjs`
- `tests/unit/rooms.test.mjs`

---

## QA Test Cases

N/A — no qa-lead specs at this tier; implemented against the Acceptance Criteria above.

---

## Test Evidence

- `tests/unit/rituals.test.mjs`
- `tests/unit/rooms.test.mjs`
- `production/qa/evidence/story-005-lanterns/`

Run: `node --test tests/unit/*.test.mjs` · Screens: `node server/presence-server.mjs` then `node tools/qa-screens.mjs`.
