// Trạng thái nghi thức của một người: nhang, lạy, chuỗi hạt, mõ, tĩnh tâm,
// hoa đăng, chuỗi ngày. Hàm thuần: nhận state + thời điểm, trả state mới,
// để test được và để main.js lưu/khôi phục qua localStorage.

import { TUNING } from "./tuning.js";

const MIN = 60 * 1000;

/** Khóa ngày theo giờ Việt Nam, dạng "2026-11-02". */
export function dayKey(nowMs) {
  const d = new Date(nowMs + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export function emptyDay(key) {
  return { key, incense: 0, bows: 0, beads: 0, rounds: 0, mo: 0, bells: 0, minutes: 0, lanterns: 0 };
}

/** Trạng thái mới cho người lần đầu vào Am Mây. */
export function createState(nowMs) {
  return {
    version: 1,
    profile: null, // { name, robe, head }
    today: emptyDay(dayKey(nowMs)),
    totals: { minutes: 0, incense: 0, bows: 0, rounds: 0, lanterns: 0, visits: 0 },
    streak: { count: 0, lastDay: null },
    incenseLitAt: null,
    lastIncenseAt: 0,
    lastBellAt: 0,
    lastLanternAt: 0,
    beadIndex: 0,
    wishes: [], // { text, color, at } — chỉ lưu trên máy
  };
}

/** Sang ngày mới (giờ VN) thì làm mới bảng "hôm nay"; giữ tổng cộng. */
export function rollDay(state, nowMs) {
  const key = dayKey(nowMs);
  if (state.today.key === key) return state;
  return { ...state, today: emptyDay(key) };
}

/**
 * Chuỗi ngày tĩnh tâm: tăng khi hôm nay có hoạt động đầu tiên và hôm qua cũng có;
 * về 1 nếu đứt quãng.
 */
export function markPractice(state, nowMs) {
  const key = dayKey(nowMs);
  if (state.streak.lastDay === key) return state;
  const yesterday = dayKey(nowMs - 24 * 3600 * 1000);
  const count = state.streak.lastDay === yesterday ? state.streak.count + 1 : 1;
  return { ...state, streak: { count, lastDay: key } };
}

function bump(state, nowMs, todayField, totalsField, by = 1) {
  let s = rollDay(state, nowMs);
  s = markPractice(s, nowMs);
  const today = { ...s.today, [todayField]: s.today[todayField] + by };
  const totals = totalsField ? { ...s.totals, [totalsField]: s.totals[totalsField] + by } : s.totals;
  return { ...s, today, totals };
}

/** Lượt vào am trong ngày (không tính là "đã tu tập"). */
export function recordVisit(state, nowMs) {
  const s = rollDay(state, nowMs);
  return { ...s, totals: { ...s.totals, visits: s.totals.visits + 1 } };
}

export function canLightIncense(state, nowMs) {
  return nowMs - state.lastIncenseAt >= TUNING.incense.cooldownSeconds * 1000;
}

export function lightIncense(state, nowMs) {
  if (!canLightIncense(state, nowMs)) return { state, ok: false };
  const s = bump(state, nowMs, "incense", "incense", TUNING.incense.sticksPerOffering);
  return { state: { ...s, incenseLitAt: nowMs, lastIncenseAt: nowMs }, ok: true };
}

/** 0..1 phần nhang đã cháy; null nếu chưa thắp hoặc đã tàn. */
export function incenseBurn(state, nowMs) {
  if (state.incenseLitAt == null) return null;
  const p = (nowMs - state.incenseLitAt) / (TUNING.incense.burnMinutes * MIN);
  return p >= 1 ? null : Math.max(0, p);
}

export function recordBows(state, nowMs, count = TUNING.bow.perSet) {
  return bump(state, nowMs, "bows", "bows", count);
}

/** Lần một hạt. Đủ 108 hạt là viên mãn một chuỗi. */
export function advanceBead(state, nowMs) {
  let s = bump(state, nowMs, "beads", null);
  const next = s.beadIndex + 1;
  if (next >= TUNING.beads.perRound) {
    s = bump(s, nowMs, "rounds", "rounds");
    return { state: { ...s, beadIndex: 0 }, completedRound: true };
  }
  return { state: { ...s, beadIndex: next }, completedRound: false };
}

export function recordMo(state, nowMs) {
  return bump(state, nowMs, "mo", null);
}

export function canRingBell(state, nowMs) {
  return nowMs - state.lastBellAt >= TUNING.bell.personalCooldownSeconds * 1000;
}

export function ringBell(state, nowMs) {
  if (!canRingBell(state, nowMs)) return { state, ok: false };
  const s = bump(state, nowMs, "bells", null);
  return { state: { ...s, lastBellAt: nowMs }, ok: true };
}

/** Ghi số phút tĩnh tâm đã ngồi trọn (làm tròn xuống, tối thiểu 1 phút mới tính). */
export function recordMeditation(state, nowMs, seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return state;
  return bump(state, nowMs, "minutes", "minutes", minutes);
}

/** Làm sạch lời nguyện: bỏ ký tự điều khiển, gộp khoảng trắng, cắt độ dài. */
export function cleanWish(text) {
  return String(text ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TUNING.lantern.maxWishChars);
}

export function canReleaseLantern(state, nowMs) {
  return nowMs - state.lastLanternAt >= TUNING.lantern.cooldownSeconds * 1000;
}

export function releaseLantern(state, nowMs, text, color) {
  if (!canReleaseLantern(state, nowMs)) return { state, ok: false };
  const wish = cleanWish(text);
  const safeColor = TUNING.lantern.colors.includes(color) ? color : TUNING.lantern.colors[0];
  const s = bump(state, nowMs, "lanterns", "lanterns");
  const wishes = [{ text: wish, color: safeColor, at: nowMs }, ...s.wishes].slice(0, 200);
  return { state: { ...s, wishes, lastLanternAt: nowMs }, ok: true };
}

/** Khôi phục state đã lưu; dữ liệu hỏng hoặc khác phiên bản thì bắt đầu lại. */
export function restoreState(raw, nowMs) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || parsed.version !== 1 || typeof parsed.today !== "object") {
      return createState(nowMs);
    }
    const base = createState(nowMs);
    return rollDay(
      {
        ...base,
        ...parsed,
        today: { ...emptyDay(parsed.today.key ?? base.today.key), ...parsed.today },
        totals: { ...base.totals, ...parsed.totals },
        streak: { ...base.streak, ...parsed.streak },
        wishes: Array.isArray(parsed.wishes) ? parsed.wishes : [],
      },
      nowMs,
    );
  } catch {
    return createState(nowMs);
  }
}
