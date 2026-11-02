// Khung nhìn 2D (canvas): dùng khi máy không có WebGL hoặc người chơi chọn 2D.
// Cùng giao diện với view3d.js: resize, render, onTap, worldToScreen, dispose.

import {
  drawAltarLight,
  drawBell,
  drawClouds,
  drawDarkness,
  drawFallingLeaves,
  drawFireflies,
  drawIncenseBowl,
  drawIncenseTips,
  drawLantern,
  drawNightSky,
  drawPerson,
  drawRipples,
  drawSmoke,
  drawStatic,
  viewTransform,
} from "./render.js";
import { hitTest } from "./world.js";

/** @param {HTMLCanvasElement} canvas */
export function createView2D(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  let view = { s: 1, ox: 0, oy: 0, dpr: 1 };
  let staticLayer = null;
  let staticKey = "";
  const smoke = [];
  const fallen = [];
  const listeners = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const v = viewTransform(rect.width, rect.height);
    // Lean the scene toward the top so the action dock sits over ground, not the pond.
    const free = rect.height - 640 * v.s;
    view = { s: v.s, ox: v.ox, oy: free > 0 ? free * 0.15 : v.oy, dpr };
    staticKey = "";
  }

  function setWorldTransform(c) {
    const k = view.s * view.dpr;
    c.setTransform(k, 0, 0, k, view.ox * view.dpr, view.oy * view.dpr);
  }

  function ensureStatic(env) {
    const key = `${canvas.width}x${canvas.height}:${Math.floor(env.hour * 6)}`;
    if (key === staticKey && staticLayer) return;
    staticLayer ??= document.createElement("canvas");
    staticLayer.width = canvas.width;
    staticLayer.height = canvas.height;
    const sctx = staticLayer.getContext("2d");
    setWorldTransform(sctx);
    drawStatic(sctx, env);
    staticKey = key;
  }

  /** Vẽ một khung hình từ trạng thái game (xem main.js frameState). */
  function render(st) {
    const { t, env } = st;
    ensureStatic(env);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(staticLayer, 0, 0);
    setWorldTransform(ctx);
    if (!st.reduceMotion) drawClouds(ctx, t, env.sky.night);
    const a = t - st.bellSwing;
    drawBell(ctx, a > 0 && a < 4 ? Math.sin(a * 6) * 0.22 * Math.exp(-a * 1.2) : 0);
    drawIncenseBowl(ctx, st.sticks, t, st.reduceMotion ? null : smoke);
    if (!st.reduceMotion) drawFallingLeaves(ctx, fallen, t);
    if (st.entered) {
      // Small figures so 200 people fit the hall's cushion grid.
      const people = st.peers.map((p) => ({ ...p, pose: p.walking ? "walk" : p.pose, alpha: 0.92, scale: 0.6 }));
      people.push({ ...st.me, self: true, scale: 0.68 });
      people.sort((p, q) => p.y - q.y);
      for (const p of people) drawPerson(ctx, p, t);
    }
    drawSmoke(ctx, smoke, t);
    drawDarkness(ctx, env.sky.dark);
    if (env.sky.night) drawNightSky(ctx, st.dayInfo.moonPhase, t, st.dayInfo.special === "ram");
    drawAltarLight(ctx, t, env.sky.dark);
    drawIncenseTips(ctx, st.sticks, t);
    for (const l of st.lanterns) drawLantern(ctx, l.pos, l.color, t);
    if (env.sky.night && !st.reduceMotion) drawFireflies(ctx, t);
    drawRipples(ctx, st.ripples, t);
    for (const p of st.peers) {
      if (p.pulse > 0) {
        ctx.strokeStyle = `rgba(240,206,120,${p.pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 8, 9 - p.pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left - view.ox) / view.s, y: (clientY - rect.top - view.oy) / view.s };
  }

  /** Gọi `handler(hit)` khi người chơi chạm vào cảnh. */
  function onTap(handler, takenSeats) {
    const fn = (ev) => handler(hitTest(toWorld(ev.clientX, ev.clientY), takenSeats()));
    canvas.addEventListener("pointerup", fn);
    listeners.push(["pointerup", fn]);
  }

  /** Toạ độ màn hình (CSS px) của một điểm cảnh; dùng cho kiểm thử tự động. */
  function worldToScreen(x, y) {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + view.ox + x * view.s, y: rect.top + view.oy + y * view.s };
  }

  function dispose() {
    for (const [type, fn] of listeners) canvas.removeEventListener(type, fn);
  }

  resize();
  return { kind: "2d", resize, render, onTap, worldToScreen, invalidate: () => (staticKey = ""), dispose };
}
