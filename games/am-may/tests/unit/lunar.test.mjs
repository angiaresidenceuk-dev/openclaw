import assert from "node:assert/strict";
import { test } from "node:test";
import {
  describeDay,
  lunarToSolar,
  nextSpecialDay,
  solarToLunar,
  yearCanChi,
} from "../../src/js/lunar.js";

// Tết dates are the anchor: everyone in Vietnam knows them.
const TET = [
  [2024, { day: 10, month: 2, year: 2024 }],
  [2025, { day: 29, month: 1, year: 2025 }],
  [2026, { day: 17, month: 2, year: 2026 }],
  [2027, { day: 6, month: 2, year: 2027 }],
];

test("Tết Nguyên Đán falls on the known solar dates", () => {
  for (const [lunarYear, solar] of TET) {
    assert.deepEqual(solarToLunar(solar.day, solar.month, solar.year), {
      day: 1,
      month: 1,
      year: lunarYear,
      leap: false,
    });
    assert.deepEqual(lunarToSolar(1, 1, lunarYear), solar);
  }
});

test("the day before Tết is still the old lunar year", () => {
  const eve = solarToLunar(16, 2, 2026);
  assert.equal(eve.year, 2025);
  assert.equal(eve.month, 12);
});

test("Tết 1985 uses Vietnam's UTC+7, not China's UTC+8", () => {
  // Vietnam celebrated Tết on 21 Jan 1985; China on 20 Feb 1985.
  assert.deepEqual(solarToLunar(21, 1, 1985), { day: 1, month: 1, year: 1985, leap: false });
  assert.notDeepEqual(solarToLunar(21, 1, 1985, 8), { day: 1, month: 1, year: 1985, leap: false });
});

test("leap months: tháng 2 nhuận 2023 and tháng 6 nhuận 2025", () => {
  assert.deepEqual(solarToLunar(22, 3, 2023), { day: 1, month: 2, year: 2023, leap: true });
  assert.deepEqual(solarToLunar(25, 7, 2025), { day: 1, month: 6, year: 2025, leap: true });
  assert.deepEqual(lunarToSolar(1, 6, 2025, true), { day: 25, month: 7, year: 2025 });
  assert.equal(lunarToSolar(1, 5, 2025, true), null, "2025 has no leap month 5");
});

test("Trung Thu and Vu Lan 2025", () => {
  assert.deepEqual(lunarToSolar(15, 8, 2025), { day: 6, month: 10, year: 2025 });
  assert.deepEqual(lunarToSolar(15, 7, 2025), { day: 6, month: 9, year: 2025 });
});

test("solar → lunar → solar round-trips for every day of 2026", () => {
  const start = Date.UTC(2026, 0, 1);
  for (let i = 0; i < 365; i++) {
    const d = new Date(start + i * 86400000);
    const s = { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
    const l = solarToLunar(s.day, s.month, s.year);
    assert.ok(l.day >= 1 && l.day <= 30, `lunar day in range for ${JSON.stringify(s)}`);
    assert.deepEqual(lunarToSolar(l.day, l.month, l.year, l.leap), s);
  }
});

test("can chi of the year", () => {
  assert.equal(yearCanChi(2026), "Bính Ngọ");
  assert.equal(yearCanChi(2025), "Ất Tỵ");
  assert.equal(yearCanChi(1985), "Ất Sửu");
});

test("describeDay uses Vietnam's date even when the instant is late UTC evening", () => {
  // 2026-02-16T18:30Z is already 01:30 on 17 Feb in Vietnam → Mùng 1 Tết.
  const info = describeDay(new Date("2026-02-16T18:30:00Z"));
  assert.equal(info.lunar.day, 1);
  assert.equal(info.special, "mung1");
  assert.equal(info.festival, "Tết Nguyên Đán");
  assert.equal(info.label, "Mùng 1 tháng Giêng");
  assert.equal(info.year, "năm Bính Ngọ");
});

test("nextSpecialDay finds the coming Rằm or Mùng 1 within a month", () => {
  const next = nextSpecialDay(new Date("2026-02-20T05:00:00Z"));
  assert.ok(next);
  assert.ok(next.inDays > 0 && next.inDays <= 15);
  assert.ok(next.lunar.day === 1 || next.lunar.day === 15);
  const today = nextSpecialDay(new Date("2026-02-17T05:00:00Z"));
  assert.equal(today.inDays, 0);
});
