# Story 004: Lịch âm Việt Nam, Rằm và Mùng 1

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending a human playtest
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md` (minimal tier — the brief is the design record)
**Requirement**: Brief MVP feature 4

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (HTML5 Canvas 2D + Web Audio, ES modules) | **Risk**: MEDIUM
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] Đổi dương → âm theo múi giờ UTC+7, có tháng nhuận; Tết 2024–2027 đúng ngày; Tết 1985 theo lịch Việt (21/1).
- [x] HUD hiện ngày âm, năm can chi, ngày dương, số ngày tới Rằm/Mùng 1, nhãn ngày lễ.
- [x] Đêm Rằm: trăng tròn, am tự thắp đèn trên hồ (trang trí, không giả làm người chơi).

---

## Out of Scope

- Chat, tài khoản, quyên góp, bói toán (brief: Out of scope).

---

## Files

- `src/js/lunar.js`
- `src/js/render.js`
- `src/js/main.js`
- `tests/unit/lunar.test.mjs`

---

## QA Test Cases

N/A — no qa-lead specs at this tier; implemented against the Acceptance Criteria above.

---

## Test Evidence

- `tests/unit/lunar.test.mjs`
- `production/qa/evidence/story-004-lunar-calendar/`

Run: `node --test tests/unit/*.test.mjs` · Screens: `node server/presence-server.mjs` then `node tools/qa-screens.mjs`.
