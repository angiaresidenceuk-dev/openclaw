// Vẽ Am Mây lên canvas 2D, trong hệ toạ độ cảnh 360×640.
// Lớp tĩnh (núi, chính điện, sân, hồ...) vẽ một lần vào canvas phụ; lớp động
// (người, khói nhang, đèn, chuông, nến) vẽ mỗi khung hình. Bóng tối ban đêm là
// một lớp phủ duy nhất; mọi thứ phát sáng vẽ sau lớp phủ đó.

import { TUNING } from "./tuning.js";
import { CUSHIONS, LAYOUT } from "./world.js";

const { width: W, height: H } = TUNING.world;

// ── Bảng màu theo giờ ─────────────────────────────────────────────────────────
const SKY_KEYS = [
  { h: 0, top: "#070d24", bottom: "#1d2a4f", dark: 0.5 },
  { h: 4.8, top: "#0b1430", bottom: "#27365e", dark: 0.48 },
  { h: 6, top: "#41558a", bottom: "#f2b98e", dark: 0.18 },
  { h: 7.5, top: "#7fb0d6", bottom: "#e6eef0", dark: 0 },
  { h: 16.3, top: "#7aa9d2", bottom: "#e9eadf", dark: 0 },
  { h: 17.8, top: "#45427a", bottom: "#f19a68", dark: 0.16 },
  { h: 19.2, top: "#121a3a", bottom: "#3a3b66", dark: 0.42 },
  { h: 24, top: "#070d24", bottom: "#1d2a4f", dark: 0.5 },
];

function hex(c) {
  return [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
}
function mix(a, b, t) {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const f = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${f(r1, r2)},${f(g1, g2)},${f(b1, b2)})`;
}

/** Màu trời và độ tối ở một giờ (0..24, giờ Việt Nam). */
export function skyAt(hour) {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].h <= hour) i++;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h)));
  return {
    top: mix(a.top, b.top, t),
    bottom: mix(a.bottom, b.bottom, t),
    dark: a.dark + (b.dark - a.dark) * t,
    night: hour < 5.6 || hour >= 18.6,
  };
}

/** Giờ hiện tại theo múi giờ Việt Nam, dạng số thực. */
export function vnHour(date = new Date()) {
  const ms = date.getTime() + 7 * 3600 * 1000;
  const d = new Date(ms);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Lớp tĩnh ─────────────────────────────────────────────────────────────────

/** Vẽ toàn bộ cảnh tĩnh (không có lớp phủ tối) vào ctx đã đặt sẵn phép biến đổi. */
export function drawStatic(ctx, env) {
  const sky = env.sky;
  // Sky reaches far beyond the world box so letterboxing on tall phones looks natural.
  const g = ctx.createLinearGradient(0, -260, 0, 176);
  g.addColorStop(0, sky.top);
  g.addColorStop(1, sky.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(-1000, -2000, W + 2000, 2176);
  if (!sky.night) drawSun(ctx, env.hour);
  drawMountains(ctx, sky);
  // Ground, extended downward for letterboxing.
  ctx.fillStyle = "#5d6b4c";
  ctx.fillRect(-1000, 170, W + 2000, 3000);
  drawGrass(ctx);
  drawCourtyard(ctx);
  drawPond(ctx);
  drawGarden(ctx);
  drawPath(ctx);
  drawGate(ctx);
  drawBellTower(ctx);
  drawHall(ctx, env);
  drawTree(ctx);
  drawCushions(ctx);
}

function drawSun(ctx, hour) {
  // Sun arcs from left (6h) to right (18h).
  const t = Math.min(1, Math.max(0, (hour - 6) / 12));
  const x = 30 + t * 300;
  const y = 92 - Math.sin(t * Math.PI) * 60;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 40);
  g.addColorStop(0, "rgba(255,244,214,0.95)");
  g.addColorStop(0.3, "rgba(255,226,170,0.45)");
  g.addColorStop(1, "rgba(255,226,170,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();
}

function ridge(ctx, base, amp, seed, color) {
  const r = rng(seed);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-1000, 200);
  ctx.lineTo(-1000, base);
  ctx.lineTo(-460, base);
  let x = -460;
  while (x < W + 460) {
    const nx = x + 24 + r() * 30;
    const peak = base - amp * (0.4 + r() * 0.6);
    ctx.quadraticCurveTo((x + nx) / 2, peak, nx, base - r() * amp * 0.3);
    x = nx;
  }
  ctx.lineTo(W + 1000, 200);
  ctx.closePath();
  ctx.fill();
}

function drawMountains(ctx, sky) {
  const far = sky.night ? "#24305a" : mix("#9db4c9", "#6f7f9c", 0.3);
  const mid = sky.night ? "#1a2546" : "#6d849a";
  const near = sky.night ? "#152038" : "#4f6a63";
  ridge(ctx, 128, 46, 7, far);
  ridge(ctx, 150, 40, 19, mid);
  // Mây: the low mist band that names the place.
  const mist = ctx.createLinearGradient(0, 132, 0, 172);
  mist.addColorStop(0, "rgba(255,255,255,0)");
  mist.addColorStop(0.55, sky.night ? "rgba(170,180,220,0.22)" : "rgba(255,255,255,0.55)");
  mist.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(-1000, 128, W + 2000, 46);
  ridge(ctx, 172, 22, 31, near);
}

function drawGrass(ctx) {
  const r = rng(3);
  ctx.fillStyle = "#6f7d55";
  for (let i = 0; i < 420; i++) {
    const x = -440 + r() * (W + 880);
    const y = 172 + r() * 470;
    ctx.fillRect(x, y, 1.2, 3);
  }
  // Lũy tre: bamboo groves, only seen on wide screens.
  for (const [x, y] of [
    [-40, 300],
    [-150, 420],
    [-90, 560],
    [400, 290],
    [470, 450],
    [420, 600],
  ]) {
    bamboo(ctx, x, y, rng(x * 7 + y));
  }
}

function bamboo(ctx, x, y, r) {
  for (let i = 0; i < 7; i++) {
    const sx = x + (r() - 0.5) * 40;
    const h = 90 + r() * 70;
    const bend = (r() - 0.5) * 24;
    ctx.strokeStyle = r() < 0.5 ? "#5f7a3c" : "#6d8a45";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.quadraticCurveTo(sx + bend * 0.3, y - h / 2, sx + bend, y - h);
    ctx.stroke();
    ctx.fillStyle = "#4f6b34";
    for (let k = 0; k < 6; k++) {
      const t = 0.35 + (k / 6) * 0.65;
      const lx = sx + bend * t * t;
      const ly = y - h * t;
      ctx.beginPath();
      ctx.ellipse(lx + (k % 2 ? 6 : -6), ly, 7, 1.8, k % 2 ? 0.4 : -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCourtyard(ctx) {
  const c = LAYOUT.courtyard;
  ctx.fillStyle = "#8d6b55";
  ctx.fillRect(c.x - 4, c.y - 4, c.w + 8, c.h + 8);
  // Gạch Bát Tràng: square terracotta tiles with pale grout.
  const r = rng(11);
  const size = 16;
  for (let y = c.y; y < c.y + c.h; y += size) {
    for (let x = c.x; x < c.x + c.w; x += size) {
      const v = r();
      ctx.fillStyle = v < 0.33 ? "#b8714f" : v < 0.66 ? "#ad6849" : "#c07a57";
      ctx.fillRect(x + 0.6, y + 0.6, Math.min(size, c.x + c.w - x) - 1.2, Math.min(size, c.y + c.h - y) - 1.2);
    }
  }
}

function lotusFlower(ctx, x, y, s) {
  ctx.fillStyle = "#f2b3c2";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(x + i * 2.2 * s, y - Math.abs(i) * -0.6 * s, 1.8 * s, 4 * s, i * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f8d7df";
  ctx.beginPath();
  ctx.ellipse(x, y - 1.5 * s, 1.6 * s, 3.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPond(ctx) {
  const p = LAYOUT.pond;
  ctx.fillStyle = "#8f8a7a";
  roundRect(ctx, p.x - 4, p.y - 4, p.w + 8, p.h + 8, 22);
  ctx.fill();
  const water = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  water.addColorStop(0, "#3c6b6e");
  water.addColorStop(1, "#22474f");
  ctx.fillStyle = water;
  roundRect(ctx, p.x, p.y, p.w, p.h, 18);
  ctx.fill();
  const r = rng(5);
  for (let i = 0; i < 16; i++) {
    const x = p.x + 12 + r() * (p.w - 24);
    const y = p.y + 12 + r() * (p.h - 24);
    const rad = 6 + r() * 6;
    ctx.fillStyle = r() < 0.5 ? "#4f7f45" : "#5d8f4f";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, rad, 0.3, Math.PI * 2 - 0.1);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 6; i++) lotusFlower(ctx, p.x + 16 + r() * (p.w - 32), p.y + 16 + r() * (p.h - 32), 1);
}

function drawGarden(ctx) {
  const gd = LAYOUT.garden;
  // Bảo tháp: a small stone stupa, the garden's anchor.
  const cx = gd.x + 98;
  const base = gd.y + 102;
  ctx.fillStyle = "#9a958a";
  for (let i = 0; i < 5; i++) {
    const w = 30 - i * 5;
    const h = 11 - i;
    const y = base - i * 13 - h;
    ctx.fillRect(cx - w / 2, y, w, h);
    ctx.fillStyle = "#7b766c";
    ctx.fillRect(cx - w / 2 - 3, y - 2, w + 6, 2.5);
    ctx.fillStyle = "#9a958a";
  }
  ctx.fillStyle = "#c9a24a";
  ctx.beginPath();
  ctx.arc(cx, base - 70, 3, 0, Math.PI * 2);
  ctx.fill();
  // Cây đại (frangipani): twisted trunk, white flowers. Common in Vietnamese pagoda yards.
  const tx = gd.x + 34;
  const ty = gd.y + 98;
  ctx.strokeStyle = "#7d6a57";
  ctx.lineCap = "round";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.bezierCurveTo(tx - 8, ty - 20, tx + 10, ty - 34, tx + 2, ty - 52);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (const [dx, dy] of [
    [-20, -62],
    [22, -64],
    [6, -74],
  ]) {
    ctx.beginPath();
    ctx.moveTo(tx + 2, ty - 50);
    ctx.quadraticCurveTo(tx + dx / 2, ty + dy + 8, tx + dx, ty + dy);
    ctx.stroke();
  }
  const r = rng(21);
  for (const [dx, dy] of [
    [-20, -62],
    [22, -64],
    [6, -74],
  ]) {
    ctx.fillStyle = "#5f7f45";
    ctx.beginPath();
    ctx.ellipse(tx + dx, ty + dy - 4, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#fbf6ea";
      ctx.beginPath();
      ctx.arc(tx + dx - 8 + r() * 16, ty + dy - 8 + r() * 7, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f2cf5b";
      ctx.fillRect(tx + dx - 8 + r() * 16, ty + dy - 6 + r() * 5, 0.9, 0.9);
    }
  }
  ctx.fillStyle = "#7f7a70";
  for (const [x, y, rx] of [
    [gd.x + 60, gd.y + 100, 8],
    [gd.x + 128, gd.y + 104, 6],
    [gd.x + 12, gd.y + 104, 5],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPath(ctx) {
  const p = LAYOUT.path;
  ctx.fillStyle = "#a59c8a";
  for (let y = p.y; y < p.y + p.h; y += 15) {
    ctx.fillRect(p.x + 2, y + 1, p.w - 4, 12.5);
  }
}

/** Mái cong đầu đao: a trapezoid roof whose eave corners curl upward. */
function curvedRoof(ctx, x0, x1, yEave, yRidge, inset, curl, fill, edge) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x0 + inset, yRidge);
  ctx.lineTo(x1 - inset, yRidge);
  ctx.quadraticCurveTo(x1 - 2, yEave - 2, x1 + curl, yEave - curl * 1.3);
  ctx.quadraticCurveTo(x1 - 4, yEave + 4, x1 - 14, yEave + 2);
  ctx.lineTo(x0 + 14, yEave + 2);
  ctx.quadraticCurveTo(x0 + 4, yEave + 4, x0 - curl, yEave - curl * 1.3);
  ctx.quadraticCurveTo(x0 + 2, yEave - 2, x0 + inset, yRidge);
  ctx.closePath();
  ctx.fill();
  // tile rows
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 4; i++) {
    const y = yRidge + ((yEave - yRidge) * i) / 4;
    const k = i / 4;
    ctx.beginPath();
    ctx.moveTo(x0 + inset * (1 - k) + 6 * k, y);
    ctx.lineTo(x1 - inset * (1 - k) - 6 * k, y);
    ctx.stroke();
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + inset - 2, yRidge);
  ctx.lineTo(x1 - inset + 2, yRidge);
  ctx.stroke();
}

function drawHall(ctx) {
  const tile = "#6b3326";
  const edge = "#4a2219";
  // Stone platform and steps
  ctx.fillStyle = "#a39d8f";
  ctx.fillRect(74, 240, 212, 22);
  ctx.fillStyle = "#8d877a";
  for (let i = 0; i < 3; i++) ctx.fillRect(146 - i * 4, 252 + i * 5, 68 + i * 8, 5);
  // Walls: dark lacquered wood
  ctx.fillStyle = "#4e2618";
  ctx.fillRect(84, 182, 192, 60);
  // Doorway with warm interior
  const door = ctx.createLinearGradient(0, 192, 0, 242);
  door.addColorStop(0, "#2a120b");
  door.addColorStop(1, "#4a2412");
  ctx.fillStyle = door;
  ctx.fillRect(148, 198, 64, 44);
  // Side lattice doors (cửa bức bàn)
  ctx.strokeStyle = "#6e3a22";
  ctx.lineWidth = 1;
  for (const x0 of [96, 222]) {
    for (let i = 0; i < 3; i++) {
      ctx.strokeRect(x0 + i * 14, 196, 12, 44);
      ctx.beginPath();
      ctx.moveTo(x0 + i * 14, 212);
      ctx.lineTo(x0 + i * 14 + 12, 212);
      ctx.stroke();
    }
  }
  // Altar figure: a seated silhouette with halo, deliberately simple and still.
  const halo = ctx.createRadialGradient(180, 210, 2, 180, 210, 20);
  halo.addColorStop(0, "rgba(240,200,110,0.9)");
  halo.addColorStop(1, "rgba(240,200,110,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(180, 210, 20, 0, Math.PI * 2);
  ctx.fill();
  const gold = ctx.createLinearGradient(166, 204, 194, 240);
  gold.addColorStop(0, "#e6c26a");
  gold.addColorStop(1, "#a07a2c");
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(165, 238);
  ctx.quadraticCurveTo(164, 222, 172, 218);
  ctx.lineTo(188, 218);
  ctx.quadraticCurveTo(196, 222, 195, 238);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(180, 211, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c98f9b";
  ctx.beginPath();
  ctx.ellipse(180, 240, 18, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pillars: son đỏ (cinnabar)
  ctx.fillStyle = "#8c2f1e";
  for (const x of [88, 140, 212, 264]) ctx.fillRect(x, 184, 8, 58);
  // Two-tier roof (chồng diêm)
  curvedRoof(ctx, 64, 296, 184, 156, 30, 12, tile, edge);
  ctx.fillStyle = "#4e2618";
  ctx.fillRect(112, 146, 136, 12);
  curvedRoof(ctx, 96, 264, 150, 126, 26, 10, tile, edge);
  // Lưỡng long chầu nguyệt, abstracted: a pearl with two flame curls on the ridge.
  ctx.fillStyle = "#c9a24a";
  ctx.beginPath();
  ctx.arc(180, 119, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7c8a6a";
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(180 + s * 8, 125);
    ctx.bezierCurveTo(180 + s * 14, 114, 180 + s * 24, 128, 180 + s * 30, 118);
    ctx.stroke();
  }
  // Hoành phi: the name board sits just under the lower eave.
  ctx.fillStyle = "#b8903c";
  ctx.fillRect(150, 186.5, 60, 10.5);
  ctx.fillStyle = "#5a1e12";
  ctx.font = "600 5.6px 'Be Vietnam Pro', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("AM MÂY", 180, 194.6);
}

function drawBellTower(ctx) {
  const t = LAYOUT.bellTower;
  ctx.fillStyle = "#a39d8f";
  ctx.fillRect(t.x + 2, t.y + 108, t.w - 4, 10);
  ctx.fillStyle = "#7a2a1a";
  ctx.fillRect(t.x + 8, t.y + 30, 6, 80);
  ctx.fillRect(t.x + t.w - 14, t.y + 30, 6, 80);
  ctx.fillStyle = "#4e2618";
  ctx.fillRect(t.x + 8, t.y + 30, t.w - 16, 6);
  curvedRoof(ctx, t.x + 4, t.x + t.w - 4, t.y + 30, t.y + 12, 14, 7, "#6b3326", "#4a2219");
  curvedRoof(ctx, t.x + 14, t.x + t.w - 14, t.y + 12, t.y, 8, 5, "#6b3326", "#4a2219");
}

function drawTree(ctx) {
  const { trunkX: x, trunkY: y, canopyR: r } = LAYOUT.tree;
  ctx.strokeStyle = "#5b4636";
  ctx.lineCap = "round";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.bezierCurveTo(x - 6, y - 30, x + 6, y - 50, x - 8, y - 70);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 40);
  ctx.quadraticCurveTo(x - 24, y - 50, x - 34, y - 72);
  ctx.stroke();
  const rr = rng(13);
  // Lá bồ đề: canopy as clusters of heart-ish leaves.
  for (let i = 0; i < 70; i++) {
    const a = rr() * Math.PI * 2;
    const d = Math.sqrt(rr()) * r;
    const lx = x - 10 + Math.cos(a) * d;
    const ly = y - 92 + Math.sin(a) * d * 0.7;
    ctx.fillStyle = rr() < 0.5 ? "#355d3a" : rr() < 0.5 ? "#41703f" : "#2c4f33";
    leaf(ctx, lx, ly, 5 + rr() * 3, rr() * Math.PI);
  }
}

function leaf(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.bezierCurveTo(-s, s * 0.2, -s * 0.8, -s * 0.8, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.8, -s * 0.8, s, s * 0.2, 0, s);
  ctx.fill();
  ctx.restore();
}

function drawGate(ctx) {
  const g = LAYOUT.gate;
  ctx.fillStyle = "#cfc5ad";
  ctx.fillRect(g.x, g.y + 14, g.w, g.h);
  ctx.fillStyle = "#3f3a33";
  // Tam quan: three openings, the center one tallest.
  roundTop(ctx, 162, g.y + 22, 36, 40);
  roundTop(ctx, 124, g.y + 30, 22, 30);
  roundTop(ctx, 214, g.y + 30, 22, 30);
  curvedRoof(ctx, g.x - 2, g.x + g.w + 2, g.y + 16, g.y + 4, 10, 6, "#6b3326", "#4a2219");
  curvedRoof(ctx, 150, 210, g.y + 4, g.y - 8, 8, 5, "#6b3326", "#4a2219");
}

function roundTop(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

function drawCushions(ctx) {
  for (const c of CUSHIONS) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 2, 12.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9b5a28";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 12, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6f3f1c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 8, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Lớp động ─────────────────────────────────────────────────────────────────

const ROBE = { lam: "#6f86a0", nau: "#7b5236", trang: "#e8e2d4" };
const SKIN = "#efc7a2";

/**
 * Vẽ một người. `p` = { x, y, robe, head, pose, facing, bowT, walkT, self, alpha }.
 * pose: stand | walk | join | bow | sit.
 */
export function drawPerson(ctx, p, t) {
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 1;
  ctx.translate(p.x, p.y);
  const robe = ROBE[p.robe] ?? ROBE.lam;
  if (p.self) {
    ctx.strokeStyle = "rgba(240,206,120,0.85)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 1, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 1, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  let bodyH = 15;
  let lean = 0;
  let bob = 0;
  if (p.pose === "walk") bob = Math.abs(Math.sin(t * 9 + p.x)) * 1.2;
  if (p.pose === "sit") bodyH = 10;
  if (p.pose === "bow") {
    // One bow: kneel (0–0.35), forehead to the floor (0.35–0.7), rise (0.7–1).
    const k = p.bowT ?? 0;
    const down = k < 0.35 ? k / 0.35 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    bodyH = 15 - 6 * down;
    lean = down * 7;
  }
  ctx.translate(0, -bob);
  // Robe (áo tràng): a long flared shape.
  ctx.fillStyle = robe;
  ctx.beginPath();
  if (p.pose === "sit") {
    ctx.ellipse(0, -2, 10, 4, 0, 0, Math.PI * 2); // crossed legs
    ctx.fill();
    ctx.beginPath();
  }
  ctx.moveTo(-6.5, -1);
  ctx.quadraticCurveTo(-5, -bodyH + 2, -3.5 + lean * 0.3, -bodyH - 0.5 + lean * 0.4);
  ctx.lineTo(3.5 + lean * 0.3, -bodyH - 0.5 + lean * 0.4);
  ctx.quadraticCurveTo(5, -bodyH + 2, 6.5, -1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(lean * 0.3, -bodyH + lean * 0.4);
  ctx.lineTo(0, -1);
  ctx.stroke();
  // Head
  const hx = lean * 0.6;
  const hy = -bodyH - 5 + lean * 0.9;
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(hx, hy, 5, 0, Math.PI * 2);
  ctx.fill();
  if (p.head === "toc") {
    ctx.fillStyle = "#2b2220";
    ctx.beginPath();
    if (p.facing === "down") ctx.arc(hx, hy - 1, 5.2, Math.PI * 1.05, Math.PI * 1.95);
    else ctx.arc(hx, hy, 5.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // chú tiểu: shaved head with a tiny tuft at the front
    ctx.fillStyle = "#2b2220";
    ctx.beginPath();
    ctx.arc(hx, hy - 4.6, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.facing === "down") {
    ctx.strokeStyle = "#5a3a2a";
    ctx.lineWidth = 0.7;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + s * 2, hy + 0.6, 1, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
  }
  if (p.pose === "join" || p.pose === "sit") {
    // Chắp tay: palms together at the chest.
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.ellipse(lean * 0.4, -bodyH + 5, 1.4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Chuông đồng treo dưới mái gác chuông, đung đưa khi được thỉnh. */
export function drawBell(ctx, swing) {
  const t = LAYOUT.bellTower;
  const cx = t.x + t.w / 2;
  const top = t.y + 36;
  ctx.save();
  ctx.translate(cx, top);
  ctx.rotate(swing);
  const g = ctx.createLinearGradient(-11, 0, 11, 0);
  g.addColorStop(0, "#5a4a24");
  g.addColorStop(0.45, "#a88a46");
  g.addColorStop(1, "#4a3c1e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.quadraticCurveTo(-8, 0, 0, 0);
  ctx.quadraticCurveTo(8, 0, 7, 4);
  ctx.lineTo(10, 30);
  ctx.quadraticCurveTo(0, 33, -10, 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 0.8;
  for (const y of [10, 20]) {
    ctx.beginPath();
    ctx.moveTo(-8.5, y);
    ctx.lineTo(8.5, y);
    ctx.stroke();
  }
  ctx.restore();
  // Chày kình: the hanging wooden striker
  ctx.fillStyle = "#7d5a3a";
  ctx.fillRect(cx + 12 - Math.max(0, swing) * 20, top + 16, 16, 4);
}

/** Bát hương (đỉnh) trước chính điện, với số nén nhang đang cháy. */
export function drawIncenseBowl(ctx, sticks, t, smoke) {
  const { x, y } = LAYOUT.incense;
  ctx.fillStyle = "#6d5a2e";
  ctx.fillRect(x - 9, y + 2, 3, 6);
  ctx.fillRect(x + 6, y + 2, 3, 6);
  const g = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
  g.addColorStop(0, "#5a4a24");
  g.addColorStop(0.5, "#b0924c");
  g.addColorStop(1, "#4a3c1e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 7, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = "#3a2e16";
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const n = Math.min(sticks.length, TUNING.incense.maxDrawnSticks);
  for (let i = 0; i < n; i++) {
    const s = sticks[i];
    const sx = x - 8 + ((i * 5.3) % 16);
    const h = 16 * (1 - s.burn * 0.75);
    ctx.strokeStyle = "#a3402c";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(sx, y - 1);
    ctx.lineTo(sx + (i % 3) - 1, y - 1 - h);
    ctx.stroke();
    s.tip = { x: sx + (i % 3) - 1, y: y - 1 - h };
    if (smoke && Math.random() < 0.05) smoke.push({ x: s.tip.x, y: s.tip.y, born: t, seed: Math.random() * 10 });
  }
}

/** Khói nhang: hạt bay lên, uốn lượn, mờ dần. */
export function drawSmoke(ctx, smoke, t) {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i];
    const age = t - p.born;
    if (age > 4) {
      smoke.splice(i, 1);
      continue;
    }
    const x = p.x + Math.sin(age * 1.6 + p.seed) * (2 + age * 3);
    const y = p.y - age * 14;
    ctx.fillStyle = `rgba(220,220,225,${0.28 * (1 - age / 4)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + age * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Lớp phủ tối cho đêm/chạng vạng. */
export function drawDarkness(ctx, dark) {
  if (dark <= 0.01) return;
  ctx.fillStyle = `rgba(6,10,30,${dark})`;
  ctx.fillRect(-1000, -2000, W + 2000, 5000);
}

/** Sao và trăng. `phase` 0..1 (0.5 = trăng rằm). */
export function drawNightSky(ctx, phase, t, isRam) {
  const r = rng(99);
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = -60 + r() * 170;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + r()) + i));
    ctx.fillStyle = `rgba(255,250,235,${0.55 * tw})`;
    ctx.fillRect(x, y, 1.1, 1.1);
  }
  drawMoon(ctx, 236, 58, isRam ? 16 : 12, phase, isRam);
}

function drawMoon(ctx, x, y, rad, phase, glowBig) {
  // illumination fraction: 0 new, 1 full
  const illum = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  if (illum < 0.03) return;
  const glow = ctx.createRadialGradient(x, y, rad * 0.8, x, y, rad * (glowBig ? 4 : 2.6));
  glow.addColorStop(0, `rgba(255,240,200,${0.35 * illum})`);
  glow.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, rad * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#fbf1d6";
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  // Shadow: a second disc offset along x; waxing lights the right side first.
  const waxing = phase < 0.5;
  const off = rad * 2 * illum * (waxing ? -1 : 1);
  ctx.fillStyle = "rgba(14,20,48,0.92)";
  ctx.beginPath();
  ctx.arc(x + off, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Ánh sáng chính điện + nến bập bùng (vẽ sau lớp tối). */
export function drawAltarLight(ctx, t, dark) {
  const flick = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
  const g = ctx.createRadialGradient(180, 222, 4, 180, 222, 46 + dark * 30);
  g.addColorStop(0, `rgba(255,196,110,${(0.25 + dark * 0.6) * flick})`);
  g.addColorStop(1, "rgba(255,196,110,0)");
  ctx.fillStyle = g;
  ctx.fillRect(120, 170, 120, 100);
  for (const x of [158, 202]) {
    ctx.fillStyle = "#e9dcc0";
    ctx.fillRect(x - 1, 228, 2, 10);
    ctx.fillStyle = `rgba(255,${190 + flick * 40},120,0.95)`;
    ctx.beginPath();
    ctx.ellipse(x, 225 - flick, 1.4, 3 * flick, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Đầu nhang đỏ hồng trong bóng tối. */
export function drawIncenseTips(ctx, sticks, t) {
  for (const s of sticks) {
    if (!s.tip) continue;
    ctx.fillStyle = `rgba(255,120,60,${0.7 + 0.3 * Math.sin(t * 5 + s.tip.x)})`;
    ctx.beginPath();
    ctx.arc(s.tip.x, s.tip.y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

const LANTERN_TINT = { sen: "#f3a6b9", do: "#e2574a", vang: "#f2c35b" };

/**
 * Đèn hoa đăng trôi trên hồ. lantern = { id, color, at } ; vị trí tính từ id + tuổi.
 * Trả về false khi đèn đã trôi hết thời gian.
 */
export function lanternPosition(lantern, nowMs) {
  const p = LAYOUT.pond;
  const age = (nowMs - lantern.at) / 1000;
  const life = TUNING.lantern.driftMinutes * 60;
  if (age > life) return null;
  let h = 0;
  for (const ch of String(lantern.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const ph = (h % 1000) / 1000;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const x = cx + Math.sin(age / 37 + ph * 6.28) * (p.w / 2 - 18) * 0.9;
  const y = cy + Math.sin(age / 53 + ph * 3.1) * (p.h / 2 - 16) * 0.85;
  const fade = Math.min(1, age / 2, (life - age) / 20);
  return { x, y, fade };
}

export function drawLantern(ctx, pos, color, t) {
  const tint = LANTERN_TINT[color] ?? LANTERN_TINT.sen;
  const flick = 0.8 + 0.2 * Math.sin(t * 9 + pos.x);
  const g = ctx.createRadialGradient(pos.x, pos.y - 2, 1, pos.x, pos.y - 2, 16);
  g.addColorStop(0, `rgba(255,220,150,${0.55 * flick * pos.fade})`);
  g.addColorStop(1, "rgba(255,220,150,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = pos.fade;
  ctx.fillStyle = tint;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(pos.x + i * 2.2, pos.y - 1, 1.8, 4, i * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgba(255,236,170,${flick})`;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y - 4, 1, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // reflection
  ctx.fillStyle = `rgba(255,220,150,${0.18 * flick})`;
  ctx.fillRect(pos.x - 3, pos.y + 3, 6, 1);
  ctx.restore();
}

/** Sóng âm chuông lan khắp sân. */
export function drawRipples(ctx, ripples, t) {
  const t0 = LAYOUT.bellTower;
  const cx = t0.x + t0.w / 2;
  const cy = t0.y + 52;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const age = t - ripples[i];
    if (age > 5) {
      ripples.splice(i, 1);
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const a = age - k * 0.5;
      if (a < 0) continue;
      ctx.strokeStyle = `rgba(240,206,120,${0.35 * (1 - a / 5)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + a * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Mây trôi chậm trên núi. */
export function drawClouds(ctx, t, night) {
  const r = rng(41);
  for (let i = 0; i < 5; i++) {
    const speed = 2 + r() * 3;
    const w = 50 + r() * 50;
    const x = ((r() * (W + 200) + t * speed) % (W + 200)) - 100;
    const y = 20 + r() * 90;
    ctx.fillStyle = night ? "rgba(150,160,200,0.12)" : "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(x - w / 5, y - 5, w / 4, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w / 6, y - 6, w / 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Đom đóm ven hồ ban đêm. */
export function drawFireflies(ctx, t) {
  const r = rng(77);
  const p = LAYOUT.pond;
  for (let i = 0; i < 9; i++) {
    const bx = p.x + r() * (p.w + 60);
    const by = p.y - 30 + r() * 80;
    const x = bx + Math.sin(t * (0.3 + r()) + i) * 12;
    const y = by + Math.cos(t * (0.4 + r()) + i * 2) * 8;
    const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 1.7 + i * 1.3));
    ctx.fillStyle = `rgba(220,255,150,${a * 0.8})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Lá bồ đề rơi chậm. leaves: mảng {x,y,born,seed}. */
export function drawFallingLeaves(ctx, leaves, t) {
  if (leaves.length < 3 && Math.random() < 0.004) {
    leaves.push({ x: LAYOUT.tree.trunkX - 40 + Math.random() * 60, y: LAYOUT.tree.trunkY - 90, born: t, seed: Math.random() * 6 });
  }
  for (let i = leaves.length - 1; i >= 0; i--) {
    const l = leaves[i];
    const age = t - l.born;
    const y = l.y + age * 12;
    if (y > 470) {
      leaves.splice(i, 1);
      continue;
    }
    ctx.fillStyle = "#6d8a3e";
    leaf(ctx, l.x + Math.sin(age * 1.4 + l.seed) * 14 - age * 3, y, 3.2, age * 2 + l.seed);
  }
}

/** Đặt phép biến đổi để vẽ cảnh 360×640 vừa khung (contain). */
export function viewTransform(cssW, cssH) {
  const s = Math.min(cssW / W, cssH / H);
  return { s, ox: (cssW - W * s) / 2, oy: (cssH - H * s) / 2 };
}

export const WORLD = { W, H };
