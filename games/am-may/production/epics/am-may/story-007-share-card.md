# Story 007: Sổ tay hôm nay và thiệp chia sẻ

> **Epic**: Am Mây MVP
> **Status**: Complete — implemented 2026-11-02; visual sign-off pending a human playtest
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-02

## Context

**GDD**: `design/game-brief.md` (minimal tier — the brief is the design record)
**Requirement**: Brief MVP feature 7

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A
**ADR Version**: N/A

**Engine**: Web (HTML5 Canvas 2D + Web Audio, ES modules) | **Risk**: LOW
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] Sổ tay: phút tĩnh tâm, nhang, lạy, chuỗi hạt, đèn, chuỗi ngày, tổng cộng, sổ nguyện; xoá dữ liệu có bước xác nhận ngay trong trang.
- [x] Thiệp 1080×1350 có cảnh am, ngày âm lịch, thành quả hôm nay; không có lời nguyện.
- [x] Chia sẻ ảnh qua Web Share nếu máy hỗ trợ; nếu không, hướng dẫn nhấn giữ ảnh để lưu.

---

## Out of Scope

- Chat, tài khoản, quyên góp, bói toán (brief: Out of scope).

---

## Files

- `src/js/share.js`
- `src/js/main.js`
- `src/styles.css`

---

## QA Test Cases

N/A — no qa-lead specs at this tier; implemented against the Acceptance Criteria above.

---

## Test Evidence

- `production/qa/evidence/story-007-share-card/`

Run: `node --test tests/unit/*.test.mjs` · Screens: `node server/presence-server.mjs` then `node tools/qa-screens.mjs`.
