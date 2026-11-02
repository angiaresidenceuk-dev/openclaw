# Story 006: Cùng tĩnh tâm: thấy nhau, không chat

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending a human playtest
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md` (minimal tier — the brief is the design record)
**Requirement**: Brief MVP feature 6

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (HTML5 Canvas 2D + Web Audio, ES modules) | **Risk**: MEDIUM
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] Mỗi sân tối đa 24 người (= số bồ đoàn); người mới vào sân đông nhất còn chỗ. *(Story 009 nâng lên 200 chỗ mỗi chính điện.)*
- [x] Chỉ chia sẻ mã ngẫu nhiên, màu áo, dáng, vị trí, tư thế, bồ đoàn; không tên, không chữ.
- [x] Hai người không ngồi cùng một bồ đoàn; giới hạn 8 hành động/5 giây; hết chỗ thì báo và chơi riêng, không xếp hàng.
- [x] Không có máy chủ (file tĩnh, artifact): ghi rõ "Một mình, yên tĩnh", không giả lập người ảo.

---

## Out of Scope

- Chat, tài khoản, quyên góp, bói toán (brief: Out of scope).

---

## Files

- `server/rooms.mjs`
- `server/presence-server.mjs`
- `src/js/presence.js`
- `src/js/main.js`
- `tests/unit/rooms.test.mjs`

---

## QA Test Cases

N/A — no qa-lead specs at this tier; implemented against the Acceptance Criteria above.

---

## Test Evidence

- `tests/unit/rooms.test.mjs`
- `production/qa/evidence/story-006-shared-presence/`

Run: `node --test tests/unit/*.test.mjs` · Screens: `node server/presence-server.mjs` then `node tools/qa-screens.mjs`.
