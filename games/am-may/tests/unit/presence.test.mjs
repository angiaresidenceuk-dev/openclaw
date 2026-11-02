import assert from "node:assert/strict";
import { test } from "node:test";
import { connectPresence, soloPresence } from "../../src/js/presence.js";

// Regression: in solo mode send() returned undefined, and main.js read `.status`
// from it when ringing the bell or sitting on a cushion (TypeError, no server).
test("solo presence answers send() with a status object", async () => {
  const r = await soloPresence().send({ type: "bell" });
  assert.deepEqual(r, { ok: false, status: 0 });
});

test("with no server URL, connectPresence falls back to solo and send() still resolves", async () => {
  const p = await connectPresence({ base: null, profile: { robe: "lam", head: "toc" }, onEvent() {} });
  assert.equal(p.mode, "solo");
  const r = await p.send({ type: "sit", seat: 3 });
  assert.equal(r.status, 0);
});
