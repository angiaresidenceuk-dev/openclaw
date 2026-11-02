import assert from "node:assert/strict";
import { test } from "node:test";
import { createSession, endEarly, formatClock, sessionStatus } from "../../src/js/meditation.js";
import { TUNING } from "../../src/js/tuning.js";
import {
  CUSHIONS,
  LAYOUT,
  clampToWalkable,
  hitTest,
  planRoute,
  stepAlong,
  zoneOf,
} from "../../src/js/world.js";

const T0 = 1_000_000;

test("a meditation session counts down and follows the breath cycle", () => {
  const s = createSession(5, T0);
  const atStart = sessionStatus(s, T0);
  assert.equal(atStart.remainingMs, 5 * 60 * 1000);
  assert.equal(atStart.breath.phase, "in");
  const inhale = TUNING.meditation.inhaleSeconds * 1000;
  assert.equal(sessionStatus(s, T0 + inhale + 1).breath.phase, "out");
  const end = sessionStatus(s, T0 + 6 * 60 * 1000);
  assert.equal(end.done, true);
  assert.equal(end.remainingMs, 0);
  assert.equal(end.elapsedMs, 5 * 60 * 1000, "elapsed never exceeds the chosen length");
});

test("unknown session length falls back to the shortest preset", () => {
  assert.equal(createSession(999, T0).minutes, TUNING.meditation.presetsMinutes[0]);
});

test("ending early freezes elapsed time", () => {
  const s = endEarly(createSession(10, T0), T0 + 90_000);
  assert.equal(sessionStatus(s, T0 + 500_000).elapsedMs, 90_000);
});

test("formatClock rounds up to whole seconds", () => {
  assert.equal(formatClock(600_000), "10:00");
  assert.equal(formatClock(59_001), "01:00");
  assert.equal(formatClock(0), "00:00");
});

test("the spawn point at the gate is walkable and all 200 cushions are inside the hall", () => {
  assert.equal(zoneOf(LAYOUT.spawn), "gate");
  assert.equal(CUSHIONS.length, TUNING.room.capacity);
  assert.equal(CUSHIONS.length, 200);
  for (const c of CUSHIONS) assert.equal(zoneOf(c), "hall", `cushion ${c.index}`);
});

test("cushions keep a central aisle and never overlap", () => {
  const xs = new Set(CUSHIONS.map((c) => c.x));
  for (const x of xs) assert.ok(Math.abs(x - 180) >= 9, `column at x=${x} blocks the aisle`);
  for (let i = 0; i < CUSHIONS.length; i++) {
    for (let j = i + 1; j < CUSHIONS.length; j++) {
      const d = Math.hypot(CUSHIONS[i].x - CUSHIONS[j].x, CUSHIONS[i].y - CUSHIONS[j].y);
      assert.ok(d >= 14, `cushions ${i} and ${j} are ${d.toFixed(1)} apart`);
    }
  }
});

test("walking from the gate to the back row goes up the path, through the courtyard, into the hall", () => {
  const back = CUSHIONS[0];
  const route = planRoute(LAYOUT.spawn, back);
  assert.deepEqual(route.at(-1), { x: back.x, y: back.y });
  const zones = route.map((p) => zoneOf(p));
  for (const [i, z] of zones.entries()) assert.ok(z, `waypoint ${JSON.stringify(route[i])} is walkable`);
  assert.ok(zones.includes("courtyard"), "passes the courtyard");
});

test("walking from the gate to the bell never crosses the pond", () => {
  const route = planRoute(LAYOUT.spawn, { x: 94, y: 440 });
  assert.deepEqual(route.at(-1), { x: 94, y: 440 });
  for (const p of route) assert.ok(zoneOf(p), `waypoint ${JSON.stringify(p)} is walkable`);
});

test("tapping the pond water clamps the walk target to the pond edge", () => {
  const p = clampToWalkable({ x: 80, y: 530 });
  assert.equal(zoneOf(p), "pondEdge");
});

test("stepAlong moves at most the given distance and consumes reached waypoints", () => {
  const { pos, route } = stepAlong({ x: 0, y: 0 }, [{ x: 3, y: 4 }, { x: 3, y: 14 }], 7);
  assert.deepEqual(pos, { x: 3, y: 6 });
  assert.equal(route.length, 1);
});

test("hitTest prefers a free cushion, reports a taken one, then hotspots", () => {
  const c = CUSHIONS[47];
  assert.deepEqual(hitTest({ x: c.x + 3, y: c.y - 2 }), { kind: "cushion", cushion: 47, stand: { x: c.x, y: c.y } });
  assert.equal(hitTest({ x: c.x, y: c.y }, new Set([47])).kind, "taken");
  assert.equal(hitTest({ x: 40, y: 430 }).kind, "bell");
  assert.equal(hitTest({ x: 180, y: 150 }).kind, "altar");
  assert.equal(hitTest({ x: 60, y: 520 }).kind, "pond");
  assert.equal(hitTest({ x: 260, y: 420 }).kind, "walk");
  assert.equal(hitTest({ x: 180, y: 300 }).kind, "walk", "the aisle is free to walk");
});
