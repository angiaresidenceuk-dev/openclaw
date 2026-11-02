// Kết nối "cùng tĩnh tâm" với máy chủ hiện diện (SSE + POST).
// Không có máy chủ (ví dụ mở file tĩnh) thì chạy chế độ một mình, nói rõ cho
// người chơi biết — không bao giờ giả lập người ảo.

/** Chế độ một mình: send() vẫn trả về kết quả như bản có máy chủ, để nơi gọi không phải rẽ nhánh. */
export function soloPresence() {
  return { mode: "solo", send: async () => ({ ok: false, status: 0 }), close() {} };
}

/**
 * @param {object} o
 * @param {string|null} o.base  gốc URL máy chủ, null = một mình
 * @param {{robe:string, head:string}} o.profile
 * @param {(e:{type:string, data?:any}) => void} o.onEvent
 */
export async function connectPresence({ base, profile, onEvent }) {
  const solo = soloPresence();
  if (!base || typeof EventSource === "undefined" || typeof fetch === "undefined") return solo;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${base}/api/stats`, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return solo;
  } catch {
    return solo;
  }

  let token = null;
  const qs = new URLSearchParams({ robe: profile.robe, head: profile.head });
  const es = new EventSource(`${base}/api/presence?${qs}`);
  const relay = (type) => (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (type === "welcome") token = data.you.token;
      onEvent({ type, data });
    } catch {
      /* ignore malformed frames */
    }
  };
  for (const type of ["welcome", "join", "leave", "act", "full"]) es.addEventListener(type, relay(type));
  es.onerror = () => onEvent({ type: "status", data: es.readyState === 2 ? "closed" : "reconnecting" });

  return {
    mode: "shared",
    /** Gửi một hành động; lỗi mạng bị bỏ qua (chế độ chung chỉ là "thấy nhau"). */
    async send(action) {
      if (!token) return { ok: false, status: 0 };
      try {
        const r = await fetch(`${base}/api/act`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, ...action }),
          keepalive: true,
        });
        return { ok: r.ok, status: r.status };
      } catch {
        return { ok: false, status: 0 };
      }
    },
    close() {
      es.close();
    },
  };
}
