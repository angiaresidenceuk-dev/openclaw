// Phiên tĩnh tâm: hẹn giờ + nhịp thở. Hàm thuần theo thời gian trôi qua.

import { TUNING } from "./tuning.js";

/** Tạo phiên mới. `minutes` phải là một trong các mốc cho sẵn. */
export function createSession(minutes, startMs) {
  const allowed = TUNING.meditation.presetsMinutes;
  const m = allowed.includes(minutes) ? minutes : allowed[0];
  return { minutes: m, startMs, durationMs: m * 60 * 1000, endedEarlyMs: null };
}

/**
 * Trạng thái phiên tại thời điểm `nowMs`.
 * breath.phase: "in" | "out"; breath.progress 0..1 trong pha hiện tại.
 */
export function sessionStatus(session, nowMs) {
  const end = session.endedEarlyMs ?? nowMs;
  const elapsedMs = Math.max(0, Math.min(end, session.startMs + session.durationMs) - session.startMs);
  const remainingMs = Math.max(0, session.durationMs - elapsedMs);
  const done = remainingMs === 0;
  const inhale = TUNING.meditation.inhaleSeconds * 1000;
  const exhale = TUNING.meditation.exhaleSeconds * 1000;
  const cycle = inhale + exhale;
  const t = elapsedMs % cycle;
  const breath =
    t < inhale ? { phase: "in", progress: t / inhale } : { phase: "out", progress: (t - inhale) / exhale };
  return {
    elapsedMs,
    remainingMs,
    done,
    breaths: Math.floor(elapsedMs / cycle),
    breath,
  };
}

export function endEarly(session, nowMs) {
  return { ...session, endedEarlyMs: nowMs };
}

/** "09:58" */
export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
