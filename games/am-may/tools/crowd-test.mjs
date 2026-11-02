#!/usr/bin/env node
// Kiểm thử tải: mở N kết nối "cùng tĩnh tâm" thật tới máy chủ, mỗi kết nối ngồi
// vào một bồ đoàn trống (vài người lạy, vài người chắp tay). Chỉ dùng để QA:
// đây là các phiên kiểm thử, không phải người giả trong sản phẩm.
//   node tools/crowd-test.mjs [N=150] [baseUrl=http://localhost:8787] [seconds=60]

const N = Number(process.argv[2] ?? 150);
const BASE = process.argv[3] ?? "http://localhost:8787";
const SECONDS = Number(process.argv[4] ?? 60);
const ROBES = ["lam", "nau", "trang"];
const HEADS = ["toc", "troc"];
const CAPACITY = 200;

/** Open one SSE presence stream and resolve with its token once `welcome` arrives. */
async function join(i, ctrl) {
  const qs = new URLSearchParams({ robe: ROBES[i % 3], head: HEADS[(i >> 1) % 2] });
  const res = await fetch(`${BASE}/api/presence?${qs}`, { signal: ctrl.signal });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) throw new Error("stream closed before welcome");
    buf += dec.decode(value, { stream: true });
    const m = buf.match(/event: (welcome|full)\ndata: (.*)\n\n/);
    if (m) {
      if (m[1] === "full") throw new Error("hall full");
      // Keep draining so the server never blocks on this socket.
      (async () => {
        try {
          while (!(await reader.read()).done);
        } catch {}
      })();
      return JSON.parse(m[2]).you;
    }
  }
}

const act = (token, body) =>
  fetch(`${BASE}/api/act`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, ...body }) }).then((r) => r.status);

const ctrl = new AbortController();
const seats = [...Array(CAPACITY).keys()].sort(() => Math.random() - 0.5);
let seated = 0;
const rooms = new Map();
const t0 = Date.now();
await Promise.all(
  Array.from({ length: N }, async (_, i) => {
    const you = await join(i, ctrl);
    rooms.set(you.room, (rooms.get(you.room) ?? 0) + 1);
    for (;;) {
      const seat = seats.pop();
      if (seat === undefined) return;
      const st = await act(you.token, { type: "sit", seat });
      if (st === 204) {
        seated++;
        if (i % 9 === 0) await act(you.token, { type: "pose", pose: "bow" });
        else if (i % 7 === 0) await act(you.token, { type: "pose", pose: "join" });
        return;
      }
      if (st !== 409) return;
    }
  }),
);
console.log(`${seated}/${N} test sessions seated in ${Date.now() - t0} ms; rooms: ${JSON.stringify(Object.fromEntries(rooms))}`);
setTimeout(() => {
  ctrl.abort();
  console.log("crowd test closed");
  process.exit(0);
}, SECONDS * 1000);
