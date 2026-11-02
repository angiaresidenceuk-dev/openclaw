// Âm lịch Việt Nam (múi giờ UTC+7).
// Thuật toán thiên văn công khai của Hồ Ngọc Đức (tuần trăng mới + kinh độ
// mặt trời), viết lại cho Am Mây. Múi giờ +7 là điều làm lịch Việt khác lịch
// Trung Quốc (+8) ở một số năm, ví dụ Tết 1985.

const VN_TZ = 7;
const INT = Math.floor;
const DR = Math.PI / 180;

export const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
export const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const MONTH_NAMES = ["Giêng", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười", "Một", "Chạp"];

export function jdFromDate(dd, mm, yy) {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

export function jdToDate(jd) {
  let b;
  let c;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  const day = e - INT((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * INT(m / 10);
  const year = b * 100 + d - 4800 + INT(m / 10);
  return { day, month, year };
}

// Julian day (fractional) of the k-th new moon after 1900-01-01.
function newMoon(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * DR);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * DR) + 0.0021 * Math.sin(2 * DR * M);
  c1 = c1 - 0.4068 * Math.sin(Mpr * DR) + 0.0161 * Math.sin(DR * 2 * Mpr);
  c1 -= 0.0004 * Math.sin(DR * 3 * Mpr);
  c1 = c1 + 0.0104 * Math.sin(DR * 2 * F) - 0.0051 * Math.sin(DR * (M + Mpr));
  c1 = c1 - 0.0074 * Math.sin(DR * (M - Mpr)) + 0.0004 * Math.sin(DR * (2 * F + M));
  c1 = c1 - 0.0004 * Math.sin(DR * (2 * F - M)) - 0.0006 * Math.sin(DR * (2 * F + Mpr));
  c1 = c1 + 0.001 * Math.sin(DR * (2 * F - Mpr)) + 0.0005 * Math.sin(DR * (2 * Mpr + M));
  const deltaT =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + c1 - deltaT;
}

// Sun longitude in radians, normalized to [0, 2π).
function sunLongitude(jdn) {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DR * M);
  dl += (0.019993 - 0.000101 * T) * Math.sin(DR * 2 * M) + 0.00029 * Math.sin(DR * 3 * M);
  let L = (L0 + dl) * DR;
  L -= Math.PI * 2 * INT(L / (Math.PI * 2));
  return L;
}

// Which of the 12 solar-term sectors (0..11) the sun is in at local midnight.
function sunSector(dayNumber, tz) {
  return INT((sunLongitude(dayNumber - 0.5 - tz / 24) / Math.PI) * 6);
}

function newMoonDay(k, tz) {
  return INT(newMoon(k) + 0.5 + tz / 24);
}

// Day number of the start of lunar month 11 (the month holding the winter solstice).
function lunarMonth11(yy, tz) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = newMoonDay(k, tz);
  if (sunSector(nm, tz) >= 9) nm = newMoonDay(k - 1, tz);
  return nm;
}

// Offset (in months after month 11) of the leap month: the first month with no major solar term.
function leapMonthOffset(a11, tz) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last;
  let i = 1;
  let arc = sunSector(newMoonDay(k + i, tz), tz);
  do {
    last = arc;
    i++;
    arc = sunSector(newMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}

/** Solar (Gregorian) date → { day, month, year, leap } in the Vietnamese lunar calendar. */
export function solarToLunar(dd, mm, yy, tz = VN_TZ) {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1, tz);
  if (monthStart > dayNumber) monthStart = newMoonDay(k, tz);
  let a11 = lunarMonth11(yy, tz);
  let b11 = a11;
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = lunarMonth11(yy - 1, tz);
  } else {
    lunarYear = yy + 1;
    b11 = lunarMonth11(yy + 1, tz);
  }
  const day = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let leap = false;
  let month = diff + 11;
  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11, tz);
    if (diff >= leapDiff) {
      month = diff + 10;
      if (diff === leapDiff) leap = true;
    }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) lunarYear -= 1;
  return { day, month, year: lunarYear, leap };
}

/** Lunar date → solar { day, month, year }, or null if the leap month does not exist. */
export function lunarToSolar(lDay, lMonth, lYear, leap = false, tz = VN_TZ) {
  let a11;
  let b11;
  if (lMonth < 11) {
    a11 = lunarMonth11(lYear - 1, tz);
    b11 = lunarMonth11(lYear, tz);
  } else {
    a11 = lunarMonth11(lYear, tz);
    b11 = lunarMonth11(lYear + 1, tz);
  }
  let off = lMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = leapMonthOffset(a11, tz);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (leap && lMonth !== leapMonth) return null;
    if (leap || off >= leapOff) off += 1;
  } else if (leap) {
    return null;
  }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  const monthStart = newMoonDay(k + off, tz);
  return jdToDate(monthStart + lDay - 1);
}

export function yearCanChi(lunarYear) {
  return `${CAN[(lunarYear + 6) % 10]} ${CHI[(lunarYear + 8) % 12]}`;
}

export function dayCanChi(dd, mm, yy) {
  const jd = jdFromDate(dd, mm, yy);
  return `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;
}

export function lunarDayName(day) {
  if (day === 15) return "Rằm";
  if (day <= 10) return `Mùng ${day}`;
  return `${day}`;
}

export function lunarMonthName(month, leap = false) {
  return `tháng ${MONTH_NAMES[month - 1]}${leap ? " nhuận" : ""}`;
}

// Ngày lễ âm lịch người Việt hay đi chùa / quan tâm. Khóa: "tháng-ngày".
const FESTIVALS = {
  "1-1": "Tết Nguyên Đán",
  "1-15": "Rằm tháng Giêng",
  "4-15": "Lễ Phật Đản",
  "7-15": "Lễ Vu Lan",
  "8-15": "Tết Trung Thu",
  "10-15": "Rằm tháng Mười",
  "12-23": "Ông Công Ông Táo",
};

export function festivalOf(lunar) {
  if (lunar.leap) return null;
  return FESTIVALS[`${lunar.month}-${lunar.day}`] ?? null;
}

/** Local calendar day in Vietnam (UTC+7) for a JS Date, independent of the device time zone. */
export function vnCalendarDay(date = new Date()) {
  const shifted = new Date(date.getTime() + VN_TZ * 3600 * 1000);
  return { day: shifted.getUTCDate(), month: shifted.getUTCMonth() + 1, year: shifted.getUTCFullYear() };
}

/**
 * Everything the HUD needs about "today" in Am Mây.
 * `special`: "ram" | "mung1" | null — days when Vietnamese families traditionally visit the pagoda.
 */
export function describeDay(date = new Date()) {
  const s = vnCalendarDay(date);
  const lunar = solarToLunar(s.day, s.month, s.year);
  const special = lunar.day === 15 ? "ram" : lunar.day === 1 ? "mung1" : null;
  const next = nextSpecialDay(date);
  return {
    solar: s,
    lunar,
    label: `${lunarDayName(lunar.day)} ${lunarMonthName(lunar.month, lunar.leap)}`,
    year: `năm ${yearCanChi(lunar.year)}`,
    dayCanChi: dayCanChi(s.day, s.month, s.year),
    festival: festivalOf(lunar),
    special,
    next,
    moonPhase: moonPhase(lunar.day),
  };
}

/** Days until the next Mùng 1 or Rằm (0 when today is one). */
export function nextSpecialDay(date = new Date()) {
  const base = vnCalendarDay(date);
  const jd0 = jdFromDate(base.day, base.month, base.year);
  for (let i = 0; i <= 31; i++) {
    const d = jdToDate(jd0 + i);
    const l = solarToLunar(d.day, d.month, d.year);
    if (l.day === 1 || l.day === 15) {
      return { inDays: i, kind: l.day === 15 ? "ram" : "mung1", lunar: l, solar: d };
    }
  }
  return null;
}

/** 0 = trăng non (new), 0.5 = trăng tròn (full), approaching 1 = trăng khuyết cuối tháng. */
export function moonPhase(lunarDay) {
  return ((lunarDay - 1) / 29.53) % 1;
}
