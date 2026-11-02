#!/usr/bin/env node
// Chạy game thật trong Chromium và chụp ảnh bằng chứng QA cho từng story.
//   node server/presence-server.mjs &   (cổng 8787)
//   node tools/qa-screens.mjs [baseUrl]
// Ảnh lưu ở production/qa/evidence/<story-slug>/.

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://localhost:8787";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE = join(ROOT, "production/qa/evidence");
const DAY = "2026-11-02T09:30:00+07:00"; // 24 tháng Chín, buổi sáng
const RAM_NIGHT = "2026-11-23T21:00:00+07:00"; // Rằm tháng Mười, buổi tối
const errors = [];

function out(slug, name) {
  const dir = join(EVIDENCE, slug);
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

/** World (360×640) → CSS pixels, mirroring main.js resize(). */
function toScreen(vw, vh, x, y) {
  const s = Math.min(vw / 360, vh / 640);
  const free = vh - 640 * s;
  const ox = (vw - 360 * s) / 2;
  const oy = free > 0 ? free * 0.15 : (vh - 640 * s) / 2;
  return { x: ox + x * s, y: oy + y * s };
}

async function newPage(browser, { w = 390, h = 844, t = DAY } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/fonts\.g/.test(m.text()) && errors.push(`console: ${m.text()}`));
  await page.goto(`${BASE}/?t=${encodeURIComponent(t)}`);
  await page.waitForTimeout(800);
  return { page, ctx, w, h };
}

async function enter(p, name = "Minh An", robe = "lam", head = "toc") {
  await p.page.fill("#name", name);
  await p.page.click(`label[for="robe-${robe}"]`);
  await p.page.click(`label[for="head-${head}"]`);
  await p.page.click("#enter");
  await p.page.waitForTimeout(3800); // walk in from the gate
}

async function tapWorld(p, x, y, wait = 3000) {
  const pt = toScreen(p.w, p.h, x, y);
  await p.page.mouse.click(pt.x, pt.y);
  await p.page.waitForTimeout(wait);
}

const clickText = (p, text) => p.page.getByRole("button", { name: text, exact: true }).click();

const browser = await chromium.launch();
try {
  // Story 001 + 007: welcome, entering, the scene by day
  const a = await newPage(browser);
  await a.page.screenshot({ path: out("story-001-scene-and-walk", "01-welcome.png") });
  await enter(a);
  await a.page.screenshot({ path: out("story-001-scene-and-walk", "02-courtyard-day.png") });

  // Story 002: rituals at the altar and the bell
  await tapWorld(a, 180, 230, 4000);
  await clickText(a, "Thắp nhang");
  await a.page.waitForTimeout(2500);
  await a.page.screenshot({ path: out("story-002-rituals", "01-altar-incense.png") });
  await tapWorld(a, 40, 240, 4500);
  await clickText(a, "Thỉnh chuông");
  await a.page.waitForTimeout(900);
  await a.page.screenshot({ path: out("story-002-rituals", "02-bell-ripples.png") });

  // Story 003: cushion, beads, meditation
  await tapWorld(a, 156, 368, 4000);
  await a.page.screenshot({ path: out("story-003-meditation", "01-seated-dock.png") });
  await clickText(a, "Lần chuỗi");
  for (let i = 0; i < 12; i++) await a.page.click("#beads-canvas");
  await a.page.screenshot({ path: out("story-003-meditation", "02-beads.png") });
  await clickText(a, "Xong");
  await clickText(a, "Tĩnh tâm");
  await a.page.waitForTimeout(300);
  await a.page.screenshot({ path: out("story-003-meditation", "03-picker.png") });
  await clickText(a, "3 phút");
  await a.page.waitForTimeout(2600);
  await a.page.screenshot({ path: out("story-003-meditation", "04-breathing.png") });
  await a.page.click("#med-stop");
  await a.page.waitForTimeout(500);
  await a.page.screenshot({ path: out("story-003-meditation", "05-summary.png") });
  await clickText(a, "Ngồi tiếp");

  // Story 005: lantern with a private wish
  await tapWorld(a, 70, 520, 4500);
  await clickText(a, "Thả đèn hoa đăng");
  await a.page.fill("#wish", "Mong cả nhà bình an qua mùa mưa bão");
  await a.page.click('label[for="lc-do"]');
  await a.page.screenshot({ path: out("story-005-lanterns", "01-wish-sheet.png") });
  await a.page.getByRole("button", { name: "Thả đèn", exact: true }).click();
  await a.page.waitForTimeout(2500);
  await a.page.screenshot({ path: out("story-005-lanterns", "02-lantern-on-pond.png") });

  // Story 007: journal and share card
  await a.page.click("#btn-journal");
  await a.page.waitForTimeout(300);
  await a.page.screenshot({ path: out("story-007-share-card", "01-journal.png") });
  await clickText(a, "Tạo thiệp hôm nay");
  await a.page.waitForTimeout(1200);
  await a.page.screenshot({ path: out("story-007-share-card", "02-share-sheet.png") });
  const src = await a.page.getAttribute(".card-preview", "src");
  writeFileSync(out("story-007-share-card", "03-card-1080x1350.png"), Buffer.from(src.split(",")[1], "base64"));

  // Story 004: lunar calendar on a full-moon night
  const night = await newPage(browser, { t: RAM_NIGHT });
  await enter(night, "Lan", "nau", "troc");
  await night.page.waitForTimeout(800);
  await night.page.screenshot({ path: out("story-004-lunar-calendar", "01-ram-night.png") });
  await night.ctx.close();

  // Story 006: two people in the same courtyard
  const p1 = await newPage(browser);
  await enter(p1, "Một", "trang", "troc");
  const p2 = await newPage(browser);
  await enter(p2, "Hai", "nau", "toc");
  await tapWorld(p1, 108, 368, 3500);
  await tapWorld(p1, 40, 240, 4500);
  await clickText(p1, "Thỉnh chuông");
  await p2.page.waitForTimeout(1200);
  await p2.page.screenshot({ path: out("story-006-shared-presence", "01-second-visitor-sees-first.png") });
  const presenceText = await p2.page.textContent("#presence-text");
  writeFileSync(out("story-006-shared-presence", "presence.txt"), `${presenceText}\n`);

  // Wide screen layout
  const wide = await newPage(browser, { w: 1440, h: 900 });
  await enter(wide);
  await wide.page.screenshot({ path: out("story-001-scene-and-walk", "03-desktop.png") });
} finally {
  await browser.close();
}

writeFileSync(join(EVIDENCE, "run-errors.txt"), errors.length ? `${errors.join("\n")}\n` : "none\n");
console.log(errors.length ? `Errors:\n${errors.join("\n")}` : "No page errors.");
