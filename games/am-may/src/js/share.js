// Thiệp chia sẻ 1080×1350 (4:5, hợp Facebook/Instagram/Zalo): ảnh Am Mây +
// thành quả hôm nay + ngày âm lịch. Lời nguyện không bao giờ nằm trên thiệp.

import { drawStatic, drawAltarLight, drawDarkness, drawNightSky, drawPerson } from "./render.js";

const CARD_W = 1080;
const CARD_H = 1350;

/** Câu tóm tắt "hôm nay" cho thiệp. */
export function summaryLines(today, streak) {
  const parts = [];
  if (today.minutes) parts.push(`${today.minutes} phút tĩnh tâm`);
  if (today.incense) parts.push(`${today.incense} nén nhang`);
  if (today.bows) parts.push(`${today.bows} lạy`);
  if (today.rounds) parts.push(`${today.rounds} chuỗi 108 hạt`);
  if (today.lanterns) parts.push(`${today.lanterns} đèn hoa đăng`);
  const headline = today.minutes
    ? `Hôm nay mình đã tĩnh tâm ${today.minutes} phút`
    : parts.length
      ? "Hôm nay mình ghé Am Mây"
      : "Một chốn để ngồi yên";
  return {
    headline,
    detail: parts.join(" · ") || "Không chat, không quảng cáo, chỉ có yên tĩnh.",
    streak: streak.count > 1 ? `${streak.count} ngày liền` : null,
  };
}

/** Vẽ thiệp lên một canvas mới và trả về canvas đó. */
export function renderCard({ env, today, streak, dayInfo, profile, url }) {
  const c = document.createElement("canvas");
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext("2d");
  // Scene crop: sky to courtyard, 3× scale.
  const s = 3;
  ctx.setTransform(s, 0, 0, s, 0, -70 * s);
  drawStatic(ctx, env);
  if (env.sky.night) drawNightSky(ctx, dayInfo.moonPhase, 0, dayInfo.special === "ram");
  if (profile) drawPerson(ctx, { x: 180, y: 368, robe: profile.robe, head: profile.head, pose: "sit" }, 0);
  drawDarkness(ctx, env.sky.dark);
  drawAltarLight(ctx, 0, env.sky.dark);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const fade = ctx.createLinearGradient(0, CARD_H * 0.5, 0, CARD_H);
  fade.addColorStop(0, "rgba(23,17,13,0)");
  fade.addColorStop(0.35, "rgba(23,17,13,0.82)");
  fade.addColorStop(1, "rgba(23,17,13,0.97)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, CARD_H * 0.5, CARD_W, CARD_H * 0.5);

  const lines = summaryLines(today, streak);
  const pad = 84;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#c9a24a";
  ctx.font = "600 34px 'Be Vietnam Pro', system-ui, sans-serif";
  ctx.fillText(`${dayInfo.label.toUpperCase()} · ${dayInfo.year.toUpperCase()}`, pad, 960);
  ctx.fillStyle = "#f3ead6";
  ctx.font = "600 74px 'Cormorant Garamond', 'Noto Serif', Georgia, serif";
  wrapText(ctx, lines.headline, pad, 1050, CARD_W - pad * 2, 80);
  ctx.font = "400 36px 'Be Vietnam Pro', system-ui, sans-serif";
  ctx.fillStyle = "#e3d6b8";
  wrapText(ctx, lines.detail, pad, 1180, CARD_W - pad * 2, 46);
  ctx.fillStyle = "#b23a2a";
  ctx.fillRect(pad, 1262, 56, 4);
  ctx.fillStyle = "#c9a24a";
  ctx.font = "600 30px 'Be Vietnam Pro', system-ui, sans-serif";
  ctx.fillText(`Am Mây${lines.streak ? ` · ${lines.streak}` : ""}`, pad, 1306);
  if (url) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#a89a7c";
    ctx.font = "400 28px 'Be Vietnam Pro', system-ui, sans-serif";
    ctx.fillText(url, CARD_W - pad, 1306);
  }
  return c;
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

/**
 * Chia sẻ ảnh qua Web Share (Zalo/Messenger/TikTok trên điện thoại).
 * Trả về "shared" | "unsupported" | "cancelled".
 */
export async function shareCard(canvas, text) {
  try {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const file = new File([blob], "am-may.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch (err) {
    if (err?.name === "AbortError") return "cancelled";
  }
  return "unsupported";
}
