// Bố cục Am Mây trên mặt bằng 360×640 (dọc, hợp điện thoại) và đường đi.
// Từ trên xuống: chính điện lớn (bệ thờ, bát hương, 200 bồ đoàn chia hai
// khối, lối đi giữa) → sân trước (gác chuông bên trái, cây bồ đề bên phải)
// → lối đi lát đá (hồ sen bên trái, vườn đá bên phải) → cổng tam quan.
// view3d.js dựng cùng bố cục này với 1 đơn vị 3D = 10 điểm mặt bằng.

import { TUNING } from "./tuning.js";

export const LAYOUT = Object.freeze({
  hall: { x: 16, y: 96, w: 328, h: 292 }, // nền chính điện (mặt trước để ngỏ ở y = 388)
  dais: { x: 110, y: 104, w: 140, h: 74 }, // bệ thờ
  incense: { x: 180, y: 190 },
  bellTower: { x: 12, y: 392, w: 72, h: 74 },
  tree: { trunkX: 334, trunkY: 452, canopyR: 50 },
  courtyard: { x: 20, y: 389, w: 320, h: 78 },
  pond: { x: 12, y: 472, w: 140, h: 112 },
  garden: { x: 212, y: 474, w: 140, h: 110 },
  path: { x: 160, y: 466, w: 40, h: 142 },
  gate: { x: 112, y: 590, w: 136, h: 50 },
  spawn: { x: 180, y: 618 },
});

// Vùng đi được: hình chữ nhật lồi, nối nhau qua điểm giao.
const ZONES = [
  { id: "hall", x: 24, y: 188, w: 312, h: 201 },
  { id: "courtyard", x: 22, y: 389, w: 316, h: 77 },
  { id: "path", x: 164, y: 464, w: 32, h: 142 },
  { id: "gate", x: 128, y: 604, w: 104, h: 26 },
  { id: "pondEdge", x: 40, y: 466, w: 116, h: 5 },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// at(goal): điểm giao giữa hai vùng; vùng chung một cạnh dài thì lấy theo x của đích.
const LINKS = [
  ["hall", "courtyard", (goal) => ({ x: clamp(goal.x, 40, 320), y: 389 })],
  ["courtyard", "path", () => ({ x: 180, y: 465 })],
  ["path", "gate", () => ({ x: 180, y: 605 })],
  ["courtyard", "pondEdge", (goal) => ({ x: clamp(goal.x, 44, 152), y: 466 })],
];

/**
 * 200 bồ đoàn (= sức chứa mỗi điện): 10 hàng, mỗi hàng 20 chỗ chia hai khối
 * 10 chỗ hai bên lối đi giữa. Chỉ số tăng từ hàng đầu (gần bệ thờ), trái sang phải.
 */
export const CUSHION_GRID = Object.freeze({ rows: 10, perSide: 10, pitchX: 14.5, pitchY: 15, aisle: 18, firstRowY: 214 });
export const CUSHIONS = Object.freeze(
  Array.from({ length: CUSHION_GRID.rows * CUSHION_GRID.perSide * 2 }, (_, i) => {
    const g = CUSHION_GRID;
    const row = Math.floor(i / (g.perSide * 2));
    const col = i % (g.perSide * 2); // 0..19, left to right
    const half = g.aisle / 2 + g.pitchX / 2;
    const x = col < g.perSide ? 180 - half - (g.perSide - 1 - col) * g.pitchX : 180 + half + (col - g.perSide) * g.pitchX;
    return { index: i, row, col, x, y: g.firstRowY + row * g.pitchY };
  }),
);
if (CUSHIONS.length !== TUNING.room.capacity) {
  throw new Error(`CUSHIONS (${CUSHIONS.length}) must equal room.capacity (${TUNING.room.capacity})`);
}
export const CUSHION_HIT_RADIUS = 7;

export const HOTSPOTS = Object.freeze([
  { kind: "altar", rect: { x: 100, y: 96, w: 160, h: 108 }, stand: { x: 180, y: 203 } },
  { kind: "bell", rect: { x: 6, y: 380, w: 82, h: 90 }, stand: { x: 94, y: 440 } },
  { kind: "pond", rect: { x: 10, y: 472, w: 146, h: 114 }, stand: { x: 104, y: 468 } },
]);

function inRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function zoneOf(p) {
  return ZONES.find((z) => inRect(p, z))?.id ?? null;
}

/** Điểm đi được gần nhất với p. */
export function clampToWalkable(p) {
  if (zoneOf(p)) return { x: p.x, y: p.y };
  let best = null;
  let bestD = Infinity;
  for (const z of ZONES) {
    const q = { x: clamp(p.x, z.x, z.x + z.w), y: clamp(p.y, z.y, z.y + z.h) };
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

function neighbors(id) {
  return LINKS.filter(([a, b]) => a === id || b === id).map(([a, b, at]) => ({ to: a === id ? b : a, at }));
}

/**
 * Đường đi từ `from` tới `to` qua các điểm giao giữa các vùng.
 * Trả về danh sách điểm (không gồm `from`), điểm cuối là đích đã kẹp vào vùng đi được.
 */
export function planRoute(from, to) {
  const start = clampToWalkable(from);
  const goal = clampToWalkable(to);
  const z0 = zoneOf(start);
  const z1 = zoneOf(goal);
  if (!z0 || !z1 || z0 === z1) return [goal];
  // BFS over the zone graph (five nodes).
  const prev = new Map([[z0, null]]);
  const queue = [z0];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === z1) break;
    for (const n of neighbors(cur)) {
      if (!prev.has(n.to)) {
        prev.set(n.to, { from: cur, at: n.at });
        queue.push(n.to);
      }
    }
  }
  const hops = [];
  for (let z = z1; prev.get(z); z = prev.get(z).from) hops.unshift(prev.get(z));
  const points = hops.map((h) => h.at(goal));
  points.push(goal);
  return points;
}

/** Đi dọc `route` một quãng `dist`. Trả về vị trí mới và phần đường còn lại. */
export function stepAlong(pos, route, dist) {
  let p = { ...pos };
  const rest = [...route];
  let left = dist;
  while (rest.length && left > 0) {
    const t = rest[0];
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= left) {
      p = { x: t.x, y: t.y };
      left -= d;
      rest.shift();
    } else {
      p = { x: p.x + (dx / d) * left, y: p.y + (dy / d) * left };
      left = 0;
    }
  }
  return { pos: p, route: rest };
}

/** Bồ đoàn gần điểm p nhất trong bán kính chạm, hoặc null. */
export function cushionAt(p) {
  const g = CUSHION_GRID;
  // Grid lookup instead of scanning 200 cushions.
  const row = Math.round((p.y - g.firstRowY) / g.pitchY);
  if (row < 0 || row >= g.rows) return null;
  let best = null;
  let bestD = CUSHION_HIT_RADIUS;
  for (let col = 0; col < g.perSide * 2; col++) {
    const c = CUSHIONS[row * g.perSide * 2 + col];
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d <= bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Người chơi chạm vào điểm p trên mặt bằng. Ưu tiên bồ đoàn, rồi các điểm nghi
 * thức, rồi chỗ đứng bất kỳ. `taken` là tập chỉ số bồ đoàn đã có người ngồi.
 */
export function hitTest(p, taken = new Set()) {
  const c = cushionAt(p);
  if (c) {
    return taken.has(c.index) ? { kind: "taken", cushion: c.index } : { kind: "cushion", cushion: c.index, stand: { x: c.x, y: c.y } };
  }
  for (const h of HOTSPOTS) {
    if (inRect(p, h.rect)) return { kind: h.kind, stand: h.stand };
  }
  return { kind: "walk", stand: clampToWalkable(p) };
}
