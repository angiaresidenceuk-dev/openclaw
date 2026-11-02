#!/usr/bin/env node
// Ảnh QA cho chính điện 200 chỗ: chạy cùng tools/crowd-test.mjs (máy chủ phải đang chạy).
//   node tools/crowd-test.mjs 150 & node tools/qa-crowd.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.argv[2] ?? "http://localhost:8787";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../production/qa/evidence/story-009-hall-200");
mkdirSync(OUT, { recursive: true });
const errors = [];

async function open(browser, { w = 390, h = 844, t = "2026-11-02T09:30:00+07:00", mode = "3d" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/?t=${encodeURIComponent(t)}&mode=${mode}`, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.fill("#name", "Minh An");
  await page.click("#enter");
  await page.waitForTimeout(4000);
  return { page, ctx };
}
const btn = (p, name) => p.page.getByRole("button", { name, exact: true }).click();

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  const a = await open(browser);
  await a.page.screenshot({ path: join(OUT, "01-arrive-roof-on.png") });
  await btn(a, "Ngồi xuống");
  await a.page.waitForTimeout(9000);
  await a.page.screenshot({ path: join(OUT, "02-seated-inside-roof-faded.png") });
  const presence = await a.page.textContent("#presence-text");
  const dock = await a.page.textContent("#dock-title");
  // Rough frame rate in software WebGL (not representative of phones; logged for comparison).
  const fps = await a.page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => (performance.now() - t0 < 3000 ? (n++, requestAnimationFrame(tick)) : res(n / 3));
        requestAnimationFrame(tick);
      }),
  );
  await a.page.mouse.move(195, 420);
  await a.page.mouse.wheel(0, 900);
  await a.page.waitForTimeout(1500);
  await a.page.screenshot({ path: join(OUT, "03-zoomed-out-whole-hall.png") });
  await a.page.click("#btn-mode");
  await a.page.waitForTimeout(1500);
  await a.page.screenshot({ path: join(OUT, "04-2d-hall.png") });
  await a.ctx.close();
  const n = await open(browser, { t: "2026-11-23T20:30:00+07:00" });
  await btn(n, "Ngồi xuống");
  await n.page.waitForTimeout(9000);
  await n.page.screenshot({ path: join(OUT, "05-ram-night-inside.png") });
  await n.ctx.close();
  writeFileSync(join(OUT, "notes.txt"), `presence: ${presence}\ndock: ${dock}\nfps (SwiftShader, CI box): ${fps.toFixed(1)}\nerrors: ${errors.length ? errors.join(" | ") : "none"}\n`);
  console.log({ presence, dock, fps: fps.toFixed(1), errors });
} finally {
  await browser.close();
}
