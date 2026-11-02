import assert from "node:assert/strict";
import { test } from "node:test";
import { createRooms } from "../../server/rooms.mjs";
import { TUNING } from "../../src/js/tuning.js";

function fixture({ capacity = 3, maxRooms = 2 } = {}) {
  let clock = 1_000_000;
  let n = 0;
  const rooms = createRooms({
    now: () => clock,
    randomId: (bytes) => `id${++n}`.padEnd(bytes, "x"),
    room: { ...TUNING.room, capacity, maxRooms },
  });
  return { rooms, tick: (ms) => (clock += ms) };
}

test("people fill the same courtyard before a new one opens", () => {
  const { rooms } = fixture({ capacity: 2 });
  const a = rooms.join({ robe: "lam" });
  const b = rooms.join({ robe: "nau" });
  const c = rooms.join({});
  assert.equal(a.welcome.you.room, 1);
  assert.equal(b.welcome.you.room, 1);
  assert.equal(c.welcome.you.room, 2);
  assert.equal(b.welcome.peers.length, 1, "the second visitor sees the first");
});

test("when every courtyard is full, joining fails instead of queueing", () => {
  const { rooms } = fixture({ capacity: 1, maxRooms: 1 });
  assert.equal(rooms.join({}).ok, true);
  assert.deepEqual(rooms.join({}), { ok: false, reason: "full" });
});

test("only public, non-identifying fields are shared with peers", () => {
  const { rooms } = fixture();
  rooms.join({ robe: "trang", head: "troc", name: "Nguyễn Văn A" });
  const b = rooms.join({});
  assert.deepEqual(Object.keys(b.welcome.peers[0]).sort(), ["head", "id", "pose", "robe", "seat", "x", "y"]);
  assert.equal(b.welcome.peers[0].robe, "trang");
});

test("invalid robe/head values fall back to defaults", () => {
  const { rooms } = fixture();
  const a = rooms.join({ robe: "<script>", head: 42 });
  assert.equal(a.member.robe, "lam");
  assert.equal(a.member.head, "toc");
});

test("actions need a valid token, type and coordinates", () => {
  const { rooms } = fixture();
  const a = rooms.join({});
  assert.equal(rooms.act("nope", { type: "move", x: 1, y: 1 }).status, 401);
  assert.equal(rooms.act(a.member.token, { type: "chat", text: "hi" }).status, 400);
  assert.equal(rooms.act(a.member.token, { type: "move", x: -5, y: 1 }).status, 400);
  const ok = rooms.act(a.member.token, { type: "move", x: 100.4, y: 300.6 });
  assert.equal(ok.status, 204);
  assert.deepEqual(ok.broadcast.data, { id: a.member.id, type: "move", x: 100, y: 301 });
});

test("two people cannot sit on the same cushion", () => {
  const { rooms } = fixture();
  const a = rooms.join({});
  const b = rooms.join({});
  assert.equal(rooms.act(a.member.token, { type: "sit", seat: 2 }).status, 204);
  assert.equal(rooms.act(b.member.token, { type: "sit", seat: 2 }).status, 409);
  assert.equal(rooms.act(b.member.token, { type: "sit", seat: 99 }).status, 400);
  rooms.act(a.member.token, { type: "stand" });
  assert.equal(rooms.act(b.member.token, { type: "sit", seat: 2 }).status, 204);
});

test("the shared bell rings at most once per room cooldown", () => {
  const { rooms, tick } = fixture();
  const a = rooms.join({});
  const b = rooms.join({});
  assert.equal(rooms.act(a.member.token, { type: "bell" }).status, 204);
  assert.equal(rooms.act(b.member.token, { type: "bell" }).status, 429);
  tick(TUNING.bell.roomCooldownSeconds * 1000);
  assert.equal(rooms.act(b.member.token, { type: "bell" }).status, 204);
});

test("rate limit: a burst beyond the window allowance is refused", () => {
  const { rooms, tick } = fixture();
  const a = rooms.join({});
  for (let i = 0; i < TUNING.room.actionsPerWindow; i++) {
    assert.equal(rooms.act(a.member.token, { type: "mo" }).status, 204);
  }
  assert.equal(rooms.act(a.member.token, { type: "mo" }).status, 429);
  tick(TUNING.room.windowSeconds * 1000);
  assert.equal(rooms.act(a.member.token, { type: "mo" }).status, 204);
});

test("lantern broadcasts carry a color but never wish text", () => {
  const { rooms } = fixture();
  const a = rooms.join({});
  const r = rooms.act(a.member.token, { type: "lantern", color: "do", text: "bí mật" });
  assert.equal(r.broadcast.data.lantern.color, "do");
  assert.equal(JSON.stringify(r.broadcast).includes("bí mật"), false);
  const late = rooms.join({});
  assert.equal(late.welcome.lanterns.length, 1, "newcomers see lanterns already on the pond");
});

test("incense and lanterns expire; empty rooms are closed", () => {
  const { rooms, tick } = fixture({ capacity: 5 });
  const a = rooms.join({});
  rooms.act(a.member.token, { type: "incense" });
  const b = rooms.join({});
  assert.equal(b.welcome.incense, 1);
  tick(TUNING.incense.burnMinutes * 60_000);
  const c = rooms.join({});
  assert.equal(c.welcome.incense, 0);
  for (const m of [a, b, c]) rooms.leave(m.member.token);
  assert.deepEqual(rooms.stats(), { online: 0, rooms: 0, capacity: 5 });
});
