# Story 003: Tĩnh tâm có hẹn giờ và chuỗi 108 hạt

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending a human playtest
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md` (minimal tier — the brief is the design record)
**Requirement**: Brief MVP feature 3

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (HTML5 Canvas 2D + Web Audio, ES modules) | **Risk**: MEDIUM
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] Chọn 3/5/10/15/20 phút; vòng tròn thở 4 giây vào, 6 giây ra; chuông nhỏ lúc bắt đầu, 3 tiếng lúc xả thiền.
- [x] Kết thúc sớm vẫn ghi số phút trọn; dưới 1 phút không tính; chuỗi ngày liên tiếp theo giờ Việt Nam.
- [x] Chuỗi 108 hạt: chạm hoặc phím cách để lần; hạt thứ 108 báo viên mãn và về 0.

---

## Out of Scope

- Chat, tài khoản, quyên góp, bói toán (brief: Out of scope).

---

## Files

- `src/js/meditation.js`
- `src/js/rituals.js`
- `src/js/main.js`
- `tests/unit/world_meditation.test.mjs`
- `tests/unit/rituals.test.mjs`

---

## QA Test Cases

N/A — no qa-lead specs at this tier; implemented against the Acceptance Criteria above.

---

## Test Evidence

- `tests/unit/world_meditation.test.mjs`
- `production/qa/evidence/story-003-meditation/`

Run: `node --test tests/unit/*.test.mjs` · Screens: `node server/presence-server.mjs` then `node tools/qa-screens.mjs`.
