# QA evidence — Am Mây MVP

Captured 2026-11-02 by `tools/qa-screens.mjs`: the real game, served by
`server/presence-server.mjs`, driven in Chromium (390×844 @2x, vi-VN,
Asia/Ho_Chi_Minh; one 1440×900 desktop shot), WebGL through SwiftShader.
Shots show the 3D view unless noted. `run-errors.txt` lists page and console
errors from that run (none).

| Story | Evidence | What it shows |
|---|---|---|
| 001 Scene and walk | `story-001-scene-and-walk/01-welcome.png`, `02-courtyard-day.png`, `03-desktop.png` | Welcome sheet, entering the courtyard by day, wide-screen layout with the dock off the pond |
| 002 Rituals | `story-002-rituals/01-altar-incense.png`, `02-bell-ripples.png` | Three sticks lit with smoke; bell swing and ripples |
| 003 Meditation | `story-003-meditation/01..05` | Seated dock, 108-bead ring at 12, length picker, breathing ring, end-of-session summary |
| 004 Lunar calendar | `story-004-lunar-calendar/01-ram-night.png` | Rằm tháng Mười night: badge, full moon, the hermitage's own lanterns |
| 005 Lanterns | `story-005-lanterns/01-wish-sheet.png`, `02-lantern-on-pond.png` | Private wish form; red lantern on the pond |
| 006 Shared presence | `story-006-shared-presence/01-second-visitor-sees-first.png`, `presence.txt` | A second browser sees the others and the shared bell ripple |
| 008 3D view | `story-008-3d-view/01-orbit-dusk.png`, `02-switched-to-2d.png`, `03-2d-fallback-day.png` | Camera dragged and zoomed at dusk; the 2D/3D button; the 2D fallback |
| 009 Hall of 200 | `story-009-hall-200/01..05`, `notes.txt` | 150 test sessions plus the player: roof on, roof faded inside, the whole hall, 2D hall, full-moon night |
| 010 Pháp Chủ statue | `story-010-phap-chu-statue/01..03` | Front view in 3D, 2D altar at night, 3D full-moon night with incense |
| 007 Share card | `story-007-share-card/01-journal.png`, `02-share-sheet.png`, `03-card-1080x1350.png` | Journal with the private wish list; the generated card (no wish text) |

Automated: `node --test tests/unit/*.test.mjs` — 42 tests, 42 pass (lunar
calendar, rituals, meditation, world/pathing, rooms, solo presence). The
single-file bundle was also driven in Chromium (3D, solo mode): no errors.

**Sign-off:** pending. Visual/Feel sign-off needs a human playtest on a real
phone (sound, haptics and the feel of the bell cannot be judged from screenshots).
