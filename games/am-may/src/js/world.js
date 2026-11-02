// Bố cục Am Mây trong hệ toạ độ cảnh 360×640 (dọc, hợp điện thoại) và
// đường đi. Từ dưới lên: cổng tam quan → lối đi lát gạch (hồ sen bên trái,
// vườn đá bên phải) → sân gạch có 24 bồ đoàn → bát hương → chính điện.
// Gác chuông ở góc trái sân, cây bồ đề ở mép phải.

export const LAYOUT = Object.freeze({
  hall: { x: 70, y: 118, w: 220, h: 144 }, // mái tới bậc thềm
  incense: { x: 180, y: 284 },
  bellTower: { x: 10, y: 186, w: 70, h: 118 },
  tree: { trunkX: 338, trunkY: 300, canopyR: 58 },
  courtyard: { x: 20, y: 268, w: 320, h: 190 },
  pond: { x: 12, y: 472, w: 140, h: 112 },
  garden: { x: 212, y: 474, w: 140, h: 110 },
  path: { x: 160, y: 458, w: 40, h: 150 },
  gate: { x: 112, y: 590, w: 136, h: 50 },
  spawn: { x: 180, y: 618 },
});

// Vùng đi được: hình chữ nhật lồi, nối nhau qua các điểm giao.
const ZONES = [
  { id: "courtyard", x: 22, y: 296, w: 316, h: 162 },
  { id: "path", x: 164, y: 456, w: 32, h: 150 },
  { id: "gate", x: 128, y: 604, w: 104, h: 26 },
  { id: "pondEdge", x: 40, y: 456, w: 120, h: 14 },
];

const LINKS = [
  ["courtyard", "path", { x: 180, y: 457 }],
  ["path", "gate", { x: 180, y: 605 }],
  ["courtyard", "pondEdge", null], // chung cạnh dài: điểm giao lấy theo x của điểm đến
];

/** 24 bồ đoàn: 6 cột × 4 hàng trước chính điện. */
export const CUSHIONS = Object.freeze(
  Array.from({ length: 24 }, (_, i) => ({
    index: i,
    x: 60 + (i % 6) * 48,
    y: 336 + Math.floor(i / 6) * 32,
  })),
);

export const HOTSPOTS = Object.freeze([
  { kind: "altar", rect: { x: 118, y: 150, w: 124, h: 148 }, stand: { x: 180, y: 304 } },
  { kind: "bell", rect: { x: 6, y: 180, w: 84, h: 128 }, stand: { x: 58, y: 312 } },
  { kind: "pond", rect: { x: 10, y: 472, w: 146, h: 114 }, stand: { x: 104, y: 464 } },
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
    const q = {
      x: Math.min(Math.max(p.x, z.x), z.x + z.w),
      y: Math.min(Math.max(p.y, z.y), z.y + z.h),
    };
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

function neighbors(id) {
  return LINKS.filter(([a, b]) => a === id || b === id).map(([a, b, at]) => ({
    to: a === id ? b : a,
    at,
  }));
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
  // BFS over the zone graph; it has four nodes, so this is trivially cheap.
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
  const points = hops.map((h) => h.at ?? { x: Math.min(Math.max(goal.x, 44), 156), y: 457 });
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

/**
 * Người chơi chạm vào điểm p trên cảnh. Ưu tiên bồ đoàn trống, rồi các điểm nghi thức,
 * rồi tới chỗ đứng bất kỳ. `taken` là tập chỉ số bồ đoàn đã có người ngồi.
 */
export function hitTest(p, taken = new Set()) {
  for (const c of CUSHIONS) {
    if (Math.hypot(p.x - c.x, p.y - c.y) <= 17) {
      return taken.has(c.index)
        ? { kind: "taken", cushion: c.index }
        : { kind: "cushion", cushion: c.index, stand: { x: c.x, y: c.y } };
    }
  }
  for (const h of HOTSPOTS) {
    if (inRect(p, h.rect)) return { kind: h.kind, stand: h.stand };
  }
  return { kind: "walk", stand: clampToWalkable(p) };
}
