import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advanceBead,
  cleanWish,
  createState,
  dayKey,
  incenseBurn,
  lightIncense,
  markPractice,
  recordMeditation,
  releaseLantern,
  restoreState,
  ringBell,
} from "../../src/js/rituals.js";
import { TUNING } from "../../src/js/tuning.js";

const T0 = Date.parse("2026-11-02T03:00:00Z"); // 10:00 sáng giờ VN
const SEC = 1000;
const DAY = 24 * 3600 * SEC;

test("dayKey follows Vietnam time, not UTC", () => {
  assert.equal(dayKey(Date.parse("2026-11-01T17:30:00Z")), "2026-11-02");
  assert.equal(dayKey(Date.parse("2026-11-01T16:30:00Z")), "2026-11-01");
});

test("lighting incense offers three sticks and enforces the cooldown", () => {
  const first = lightIncense(createState(T0), T0);
  assert.equal(first.ok, true);
  assert.equal(first.state.today.incense, TUNING.incense.sticksPerOffering);
  const tooSoon = lightIncense(first.state, T0 + 5 * SEC);
  assert.equal(tooSoon.ok, false);
  const later = lightIncense(first.state, T0 + TUNING.incense.cooldownSeconds * SEC);
  assert.equal(later.ok, true);
  assert.equal(later.state.today.incense, 2 * TUNING.incense.sticksPerOffering);
});

test("incense burns down over the configured minutes, then is gone", () => {
  const { state } = lightIncense(createState(T0), T0);
  assert.equal(incenseBurn(state, T0), 0);
  const half = incenseBurn(state, T0 + (TUNING.incense.burnMinutes * 60 * SEC) / 2);
  assert.ok(Math.abs(half - 0.5) < 1e-9);
  assert.equal(incenseBurn(state, T0 + TUNING.incense.burnMinutes * 60 * SEC), null);
});

test("the 108th bead completes a round and resets the counter", () => {
  let s = createState(T0);
  let completed = 0;
  for (let i = 0; i < TUNING.beads.perRound; i++) {
    const r = advanceBead(s, T0 + i);
    s = r.state;
    if (r.completedRound) completed++;
  }
  assert.equal(completed, 1);
  assert.equal(s.beadIndex, 0);
  assert.equal(s.today.rounds, 1);
  assert.equal(s.today.beads, TUNING.beads.perRound);
});

test("bell has a personal cooldown", () => {
  const a = ringBell(createState(T0), T0);
  assert.equal(a.ok, true);
  assert.equal(ringBell(a.state, T0 + SEC).ok, false);
  assert.equal(ringBell(a.state, T0 + TUNING.bell.personalCooldownSeconds * SEC).ok, true);
});

test("meditation counts whole minutes only", () => {
  const s = createState(T0);
  assert.equal(recordMeditation(s, T0, 59).today.minutes, 0);
  const s2 = recordMeditation(s, T0, 10 * 60 + 30);
  assert.equal(s2.today.minutes, 10);
  assert.equal(s2.totals.minutes, 10);
});

test("streak grows on consecutive days and resets after a gap", () => {
  let s = markPractice(createState(T0), T0);
  assert.equal(s.streak.count, 1);
  s = markPractice(s, T0 + 3600 * SEC); // same day
  assert.equal(s.streak.count, 1);
  s = markPractice(s, T0 + DAY);
  assert.equal(s.streak.count, 2);
  s = markPractice(s, T0 + 3 * DAY);
  assert.equal(s.streak.count, 1);
});

test("today's counters reset on a new Vietnam day, totals do not", () => {
  const s = recordMeditation(createState(T0), T0, 300);
  const next = recordMeditation(s, T0 + DAY, 120);
  assert.equal(next.today.minutes, 2);
  assert.equal(next.totals.minutes, 7);
});

test("wishes are cleaned, length-capped and kept on the device only", () => {
  assert.equal(cleanWish("  Cầu   bình\nan \u0007 "), "Cầu bình an");
  const long = "a".repeat(500);
  assert.equal(cleanWish(long).length, TUNING.lantern.maxWishChars);
  const r = releaseLantern(createState(T0), T0, "Mong mẹ khỏe", "hack");
  assert.equal(r.ok, true);
  assert.equal(r.state.wishes[0].text, "Mong mẹ khỏe");
  assert.equal(r.state.wishes[0].color, TUNING.lantern.colors[0], "unknown color falls back");
  assert.equal(releaseLantern(r.state, T0 + SEC, "lần nữa", "do").ok, false);
});

test("restoreState survives corrupt or foreign data", () => {
  assert.equal(restoreState("{not json", T0).version, 1);
  assert.equal(restoreState(JSON.stringify({ version: 99 }), T0).totals.minutes, 0);
  const saved = recordMeditation(createState(T0), T0, 180);
  const back = restoreState(JSON.stringify(saved), T0 + 60 * SEC);
  assert.equal(back.totals.minutes, 3);
  assert.equal(back.today.minutes, 3);
});
