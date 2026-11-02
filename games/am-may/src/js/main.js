// Am Mây — vòng lặp chính: nối cảnh, nghi thức, tĩnh tâm, hiện diện và giao diện.

import { createAudio } from "./audio.js";
import { describeDay } from "./lunar.js";
import { createSession, endEarly, formatClock, sessionStatus } from "./meditation.js";
import { connectPresence } from "./presence.js";
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
  lanternPosition,
  skyAt,
  viewTransform,
  vnHour,
} from "./render.js";
import {
  advanceBead,
  canRingBell,
  createState,
  incenseBurn,
  lightIncense,
  recordBows,
  recordMeditation,
  recordMo,
  recordVisit,
  releaseLantern,
  restoreState,
  ringBell,
} from "./rituals.js";
import { renderCard, shareCard, summaryLines } from "./share.js";
import { TUNING } from "./tuning.js";
import { CUSHIONS, LAYOUT, hitTest, planRoute, stepAlong } from "./world.js";

// ── Thời gian (cho phép ?t=... để chụp ảnh QA ở giờ/ngày bất kỳ) ─────────────
const params = new URLSearchParams(globalThis.location?.search ?? "");
const timeOffset = (() => {
  const t = params.get("t");
  const parsed = t ? Date.parse(t) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed - Date.now();
})();
const now = () => Date.now() + timeOffset;

// ── Lưu trữ trên máy (có thể bị chặn: luôn bọc try/catch) ────────────────────
const KEY = "am-may:v1";
function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage: the visit still works, it just is not remembered */
  }
}

// ── DOM ─────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const canvas = $("scene");
const ctx = canvas.getContext("2d");
const ui = {
  day: $("date-day"),
  sub: $("date-sub"),
  next: $("date-next"),
  badge: $("date-badge"),
  presence: $("presence"),
  presenceText: $("presence-text"),
  sound: $("btn-sound"),
  journal: $("btn-journal"),
  dock: $("dock"),
  dockTitle: $("dock-title"),
  dockHint: $("dock-hint"),
  dockCounter: $("dock-counter"),
  dockActions: $("dock-actions"),
  meditate: $("meditate"),
  breath: $("breath"),
  breathWord: $("breath-word"),
  medClock: $("med-clock"),
  medStop: $("med-stop"),
  sheet: $("sheet"),
  sheetBody: $("sheet-body"),
  toast: $("toast"),
  status: $("scene-status"),
};

// ── Trạng thái ──────────────────────────────────────────────────────────────
let game = restoreState(load(KEY), now());
let dayInfo = describeDay(new Date(now()));
let audio = null;
let presence = { mode: "solo", send: async () => ({ ok: false }), close() {} };
let room = { no: null, count: 0 };
let entered = false;
let enteredAt = 0;
let restReminded = false;
let session = null;
let wakeLock = null;
let lastMoSent = 0;
const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const me = {
  x: LAYOUT.spawn.x,
  y: LAYOUT.spawn.y,
  route: [],
  pose: "stand",
  facing: "up",
  seat: null,
  place: "gate",
  pending: null, // hitTest result we are walking toward
  bows: 0, // bows left in the current set
  bowT: 0,
  poseUntil: 0,
};
/** @type {Map<string, any>} */
const peers = new Map();
const roomIncense = []; // timestamps of other people's offerings in this courtyard
let lanterns = []; // { id, color, at }
const ripples = [];
const smoke = [];
const fallen = [];
let bellSwing = { t: -10 };

function persist() {
  save(KEY, JSON.stringify(game));
}

// ── Canvas & khung nhìn ─────────────────────────────────────────────────────
let view = { s: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };
let staticLayer = null;
let staticKey = "";

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const v = viewTransform(rect.width, rect.height);
  // Lean the scene toward the top so the action dock sits over ground, not the pond.
  const free = rect.height - 640 * v.s;
  view = { s: v.s, ox: v.ox, oy: free > 0 ? free * 0.15 : v.oy, w: rect.width, h: rect.height, dpr };
  staticKey = "";
}

function envNow() {
  const hour = vnHour(new Date(now()));
  return { hour, sky: skyAt(hour), day: dayInfo };
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

function setWorldTransform(c) {
  const k = view.s * view.dpr;
  c.setTransform(k, 0, 0, k, view.ox * view.dpr, view.oy * view.dpr);
}

function toWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return { x: (clientX - rect.left - view.ox) / view.s, y: (clientY - rect.top - view.oy) / view.s };
}

// ── Vòng lặp ────────────────────────────────────────────────────────────────
let lastFrame = performance.now();

function frame(ts) {
  const dt = Math.min(0.1, (ts - lastFrame) / 1000);
  lastFrame = ts;
  const t = ts / 1000;
  update(dt, t);
  draw(t);
  requestAnimationFrame(frame);
}

function update(dt, t) {
  const n = now();
  // Me: walking
  if (me.route.length) {
    const prevY = me.y;
    const r = stepAlong(me, me.route, TUNING.walkSpeed * dt);
    me.x = r.pos.x;
    me.y = r.pos.y;
    me.route = r.route;
    me.facing = me.y > prevY + 0.01 ? "down" : "up";
    me.pose = "walk";
    if (!me.route.length) arrive();
  }
  // Me: bowing
  if (me.bows > 0) {
    me.bowT += dt / TUNING.bow.secondsPerBow;
    if (me.bowT >= 1) {
      me.bowT = 0;
      me.bows--;
      if (me.bows === 0) {
        me.pose = me.seat != null ? "sit" : "stand";
        presence.send({ type: "pose", pose: "stand" });
        if (me.seat != null) presence.send({ type: "sit", seat: me.seat });
      }
    }
  }
  if (me.poseUntil && n > me.poseUntil) {
    me.poseUntil = 0;
    if (me.pose === "join") me.pose = me.seat != null ? "sit" : "stand";
  }
  // Peers: walk toward their latest destination
  for (const p of peers.values()) {
    if (p.route.length) {
      const r = stepAlong(p, p.route, TUNING.walkSpeed * dt);
      p.facing = r.pos.y > p.y + 0.01 ? "down" : "up";
      p.x = r.pos.x;
      p.y = r.pos.y;
      p.route = r.route;
      p.walking = p.route.length > 0;
    } else p.walking = false;
    if (p.pose === "bow") p.bowT = (p.bowT + dt / TUNING.bow.secondsPerBow) % 1;
    if (p.pulse > 0) p.pulse -= dt;
  }
  // Meditation clock
  if (session) tickMeditation(n);
  // Gentle rest reminder (Vietnam asks game services to watch play time; we just care)
  if (entered && !restReminded && n - enteredAt > TUNING.rest.remindAfterMinutes * 60000) {
    restReminded = true;
    toast("Bạn đã ở Am Mây một giờ. Nghỉ mắt và vươn vai một chút nhé.");
  }
}

function incenseSticks(n) {
  const sticks = [];
  const burn = incenseBurn(game, n);
  if (burn != null) for (let i = 0; i < TUNING.incense.sticksPerOffering; i++) sticks.push({ burn });
  const life = TUNING.incense.burnMinutes * 60000;
  while (roomIncense.length && n - roomIncense[0] > life) roomIncense.shift();
  for (const at of roomIncense) {
    const b = (n - at) / life;
    for (let i = 0; i < TUNING.incense.sticksPerOffering; i++) sticks.push({ burn: b });
  }
  return sticks;
}

function visibleLanterns(n) {
  const list = [];
  lanterns = lanterns.filter((l) => {
    const pos = lanternPosition(l, n);
    if (pos) list.push({ pos, color: l.color });
    return pos != null;
  });
  if (dayInfo.special === "ram") {
    // The hermitage's own lanterns on full-moon nights: decoration, never shown as people.
    const life = TUNING.lantern.driftMinutes * 60000;
    for (let i = 0; i < TUNING.ramLanterns; i++) {
      const at = n - ((n / 1000 + i * 71) % (life / 1000)) * 1000;
      const pos = lanternPosition({ id: `am-${i}`, at }, n);
      if (pos) list.push({ pos, color: TUNING.lantern.colors[i % 3] });
    }
  }
  return list;
}

function draw(t) {
  const n = now();
  const env = envNow();
  ensureStatic(env);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(staticLayer, 0, 0);
  setWorldTransform(ctx);
  if (!reduceMotion) drawClouds(ctx, t, env.sky.night);
  const swing = (() => {
    const a = t - bellSwing.t;
    return a > 0 && a < 4 ? Math.sin(a * 6) * 0.22 * Math.exp(-a * 1.2) : 0;
  })();
  drawBell(ctx, swing);
  const sticks = incenseSticks(n);
  drawIncenseBowl(ctx, sticks, t, reduceMotion ? null : smoke);
  if (!reduceMotion) drawFallingLeaves(ctx, fallen, t);
  // People, back to front
  const people = [...peers.values()].map((p) => ({
    ...p,
    pose: p.walking ? "walk" : p.pose,
    alpha: 0.9,
  }));
  people.push({ ...me, robe: game.profile?.robe ?? "lam", head: game.profile?.head ?? "toc", self: true });
  people.sort((a, b) => a.y - b.y);
  if (entered) for (const p of people) drawPerson(ctx, p, t);
  drawSmoke(ctx, smoke, t);
  // Night
  drawDarkness(ctx, env.sky.dark);
  if (env.sky.night) drawNightSky(ctx, dayInfo.moonPhase, t, dayInfo.special === "ram");
  drawAltarLight(ctx, t, env.sky.dark);
  drawIncenseTips(ctx, sticks, t);
  for (const l of visibleLanterns(n)) drawLantern(ctx, l.pos, l.color, t);
  if (env.sky.night && !reduceMotion) drawFireflies(ctx, t);
  drawRipples(ctx, ripples, t);
  // Peer pulses (mõ / chuỗi hạt): a soft gold ring, no text
  for (const p of peers.values()) {
    if (p.pulse > 0) {
      ctx.strokeStyle = `rgba(240,206,120,${p.pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 12, 14 - p.pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ── Đi lại & chạm ───────────────────────────────────────────────────────────
function takenSeats() {
  const s = new Set();
  for (const p of peers.values()) if (p.seat != null) s.add(p.seat);
  return s;
}

function onTap(ev) {
  if (!entered || session || !ui.sheet.hidden) return;
  audio?.resume();
  const p = toWorld(ev.clientX, ev.clientY);
  const hit = hitTest(p, takenSeats());
  if (hit.kind === "taken") {
    toast("Bồ đoàn này đã có người ngồi. Mời bạn chọn chỗ khác.");
    return;
  }
  goTo(hit);
}

function goTo(hit) {
  if (me.seat != null) {
    me.seat = null;
    presence.send({ type: "stand" });
  }
  me.bows = 0;
  me.pending = hit;
  me.route = planRoute(me, hit.stand);
  me.place = "walking";
  presence.send({ type: "move", x: Math.round(hit.stand.x), y: Math.round(hit.stand.y) });
  renderDock();
}

async function arrive() {
  const hit = me.pending;
  me.pending = null;
  me.pose = "stand";
  me.facing = "up";
  if (!hit) return;
  if (hit.kind === "cushion") {
    me.seat = hit.cushion;
    me.pose = "sit";
    me.place = "cushion";
    renderDock();
    const r = await presence.send({ type: "sit", seat: hit.cushion });
    if (r.status === 409) {
      me.seat = null;
      me.pose = "stand";
      me.place = "courtyard";
      toast("Có người vừa ngồi vào bồ đoàn này. Mời bạn chọn chỗ khác.");
      renderDock();
    }
    return;
  }
  me.place = hit.kind === "walk" ? "courtyard" : hit.kind;
  renderDock();
}

// ── Nghi thức ───────────────────────────────────────────────────────────────
function joinHands() {
  me.pose = "join";
  me.poseUntil = now() + 3000;
  presence.send({ type: "pose", pose: "join" });
  say("Bạn chắp tay.");
}

function startBows() {
  if (me.bows > 0) return;
  me.bows = TUNING.bow.perSet;
  me.bowT = 0;
  me.pose = "bow";
  game = recordBows(game, now());
  persist();
  presence.send({ type: "pose", pose: "bow" });
  renderDock();
  say(`Bạn lạy ${TUNING.bow.perSet} lạy.`);
}

function offerIncense() {
  const r = lightIncense(game, now());
  if (!r.ok) {
    toast("Nhang vừa thắp. Hãy để khói lan một lúc rồi thắp tiếp.");
    return;
  }
  game = r.state;
  persist();
  me.pose = "join";
  me.poseUntil = now() + 2500;
  audio?.bead();
  presence.send({ type: "incense" });
  renderDock();
  say("Ba nén nhang đã được thắp.");
}

async function ringTheBell() {
  if (!canRingBell(game, now())) {
    toast("Tiếng chuông còn đang ngân. Đợi một chút rồi thỉnh tiếp.");
    return;
  }
  game = ringBell(game, now()).state;
  persist();
  bellSwing = { t: performance.now() / 1000 };
  if (!reduceMotion) ripples.push(performance.now() / 1000);
  audio?.bigBell();
  renderDock();
  say("Chuông đã thỉnh.");
  const r = await presence.send({ type: "bell" });
  if (r.status === 429) toast("Chuông chung vừa ngân. Tiếng chuông này chỉ vang trên máy bạn.");
}

function knockMo() {
  game = recordMo(game, now());
  persist();
  audio?.mo();
  vibrate(10);
  if (now() - lastMoSent > 2000) {
    lastMoSent = now();
    presence.send({ type: "mo" });
  }
  renderDock();
}

function vibrate(ms) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not available */
  }
}

// ── Bảng hành động ──────────────────────────────────────────────────────────
const PLACES = {
  gate: { title: "Cổng tam quan", hint: "Chạm vào sân để bước vào." },
  walking: { title: "Đang bước", hint: "Đi chậm thôi, không vội." },
  courtyard: {
    title: "Sân chùa",
    hint: "Chạm bồ đoàn để ngồi, bát hương để thắp nhang, gác chuông để thỉnh chuông, hồ sen để thả đèn.",
  },
  altar: { title: "Trước chính điện", hint: "Thắp ba nén nhang, chắp tay, hoặc lạy ba lạy." },
  bell: { title: "Gác chuông", hint: "Tiếng chuông vang khắp sân. Mời bạn thỉnh chậm rãi." },
  pond: {
    title: "Hồ sen",
    hint: "Viết một lời nguyện rồi thả đèn. Lời nguyện chỉ lưu trên máy bạn; người khác chỉ thấy ánh đèn.",
  },
  cushion: { title: "Bồ đoàn", hint: "Ngồi yên. Chọn tĩnh tâm, gõ mõ hoặc lần chuỗi hạt." },
};

function button(label, onClick, primary = false, disabled = false) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = primary ? "btn primary" : "btn";
  b.textContent = label;
  b.disabled = disabled;
  b.addEventListener("click", onClick);
  return b;
}

function renderDock() {
  if (!entered) return;
  const place = PLACES[me.place] ?? PLACES.courtyard;
  ui.dock.hidden = false;
  ui.dockTitle.textContent = me.place === "cushion" ? `Bồ đoàn số ${me.seat + 1}` : place.title;
  ui.dockHint.textContent = place.hint;
  ui.dockActions.replaceChildren();
  let counter = "";
  const add = (...args) => ui.dockActions.append(button(...args));
  switch (me.place) {
    case "altar":
      add("Thắp nhang", offerIncense, true);
      add("Lạy 3 lạy", startBows, false, me.bows > 0);
      add("Chắp tay", joinHands);
      counter = `${game.today.incense} nén hôm nay`;
      break;
    case "bell":
      add("Thỉnh chuông", ringTheBell, true);
      counter = `${game.today.bells} tiếng hôm nay`;
      break;
    case "pond":
      add("Thả đèn hoa đăng", openWishSheet, true);
      add("Sổ nguyện", openJournal);
      counter = `${game.today.lanterns} đèn hôm nay`;
      break;
    case "cushion":
      add("Tĩnh tâm", openMeditationPicker, true);
      add("Gõ mõ", knockMo);
      add("Lần chuỗi", openBeads);
      add("Lạy", startBows, false, me.bows > 0);
      add("Đứng dậy", () => goTo({ kind: "walk", stand: { x: me.x, y: me.y + 18 } }));
      counter = game.today.mo ? `${game.today.mo} tiếng mõ` : "";
      break;
    case "walking":
      break;
    default:
      add("Chắp tay", joinHands);
      add("Ngồi xuống", () => {
        const free = CUSHIONS.find((c) => !takenSeats().has(c.index));
        if (free) goTo({ kind: "cushion", cushion: free.index, stand: { x: free.x, y: free.y } });
        else toast("Các bồ đoàn đều có người. Bạn có thể đứng tĩnh tâm ngay tại sân.");
      });
      break;
  }
  ui.dockCounter.textContent = counter;
}

// ── Tấm phủ ─────────────────────────────────────────────────────────────────
function openSheet(build) {
  ui.sheetBody.replaceChildren();
  build(ui.sheetBody);
  ui.sheet.hidden = false;
  ui.sheetBody.querySelector("[autofocus], input, button")?.focus({ preventScroll: true });
}
function closeSheet() {
  ui.sheet.hidden = true;
  ui.sheetBody.replaceChildren();
}
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  e.append(...kids);
  return e;
}

const ROBES = [
  { id: "lam", label: "Áo tràng lam", color: "#6f86a0" },
  { id: "nau", label: "Áo tràng nâu", color: "#7b5236" },
  { id: "trang", label: "Áo trắng", color: "#e8e2d4" },
];
const HEADS = [
  { id: "toc", label: "Để tóc" },
  { id: "troc", label: "Chú tiểu" },
];

function welcomeSheet() {
  const profile = game.profile;
  openSheet((root) => {
    root.append(
      el("div", { class: "eyebrow", text: `${dayInfo.label} · ${dayInfo.year}` }),
      el("h2", { id: "sheet-title", text: profile?.name ? `Chào ${profile.name}, mời vào am` : "Am Mây" }),
      el("p", { text: "Một ngôi am nhỏ trên núi mây. Không cần đến chùa xa, không cần nói gì: chỉ cần ngồi yên một lúc." }),
      el(
        "ul",
        { class: "vows" },
        el("li", { text: "Không chat, không quảng cáo, không quyên góp." }),
        el("li", { text: "Tên và lời nguyện chỉ lưu trên máy bạn." }),
        el("li", { text: "Người cùng sân thấy bạn qua màu áo, không thấy tên." }),
      ),
    );
    const form = el("form", { id: "welcome-form", novalidate: "" });
    const nameField = el(
      "div",
      { class: "field" },
      el("label", { for: "name", text: "Tên gọi (chỉ hiện trên thiệp của bạn)" }),
      el("input", { id: "name", name: "name", maxlength: "24", autocomplete: "nickname", placeholder: "Ví dụ: Minh An" }),
    );
    form.append(nameField);
    nameField.querySelector("input").value = profile?.name ?? "";
    const robeSet = el("fieldset", { class: "field" }, el("legend", { text: "Áo" }));
    const robeWrap = el("div", { class: "swatches" });
    for (const r of ROBES) {
      const input = el("input", { type: "radio", name: "robe", value: r.id, id: `robe-${r.id}` });
      input.checked = (profile?.robe ?? "lam") === r.id;
      robeWrap.append(
        el("label", { class: "swatch", for: `robe-${r.id}` }, input, el("span", { class: "dot", style: `background:${r.color}` }), r.label),
      );
    }
    robeSet.append(robeWrap);
    const headSet = el("fieldset", { class: "field" }, el("legend", { text: "Dáng" }));
    const headWrap = el("div", { class: "swatches" });
    for (const h of HEADS) {
      const input = el("input", { type: "radio", name: "head", value: h.id, id: `head-${h.id}` });
      input.checked = (profile?.head ?? "toc") === h.id;
      headWrap.append(el("label", { class: "swatch", for: `head-${h.id}` }, input, h.label));
    }
    headSet.append(headWrap);
    form.append(
      robeSet,
      headSet,
      el(
        "div",
        { class: "sheet-actions" },
        el("button", { class: "btn primary", type: "submit", id: "enter", text: "Bước qua cổng tam quan" }),
      ),
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      game = {
        ...game,
        profile: {
          name: String(data.get("name") ?? "").trim().slice(0, 24),
          robe: String(data.get("robe") ?? "lam"),
          head: String(data.get("head") ?? "toc"),
        },
      };
      persist();
      closeSheet();
      enter();
    });
    root.append(form);
  });
}

function openMeditationPicker() {
  openSheet((root) => {
    root.append(
      el("div", { class: "eyebrow", text: "Tĩnh tâm" }),
      el("h2", { id: "sheet-title", text: "Ngồi bao lâu?" }),
      el("p", { text: `Theo vòng tròn: hít vào ${TUNING.meditation.inhaleSeconds} giây, thở ra ${TUNING.meditation.exhaleSeconds} giây. Chuông nhỏ báo lúc bắt đầu và kết thúc.` }),
    );
    const row = el("div", { class: "sheet-actions" });
    for (const m of TUNING.meditation.presetsMinutes) {
      row.append(button(`${m} phút`, () => startMeditation(m), m === 5));
    }
    root.append(row, el("div", { class: "sheet-actions" }, button("Để sau", closeSheet)));
  });
}

async function startMeditation(minutes) {
  closeSheet();
  session = createSession(minutes, now());
  ui.meditate.hidden = false;
  ui.dock.hidden = true;
  audio?.smallBell();
  try {
    wakeLock = await navigator.wakeLock?.request("screen");
  } catch {
    wakeLock = null;
  }
}

function tickMeditation(n) {
  const st = sessionStatus(session, n);
  const scale = st.breath.phase === "in" ? 0.7 + 0.3 * st.breath.progress : 1 - 0.3 * st.breath.progress;
  ui.breath.style.setProperty("--breath", reduceMotion ? "0.85" : scale.toFixed(3));
  ui.breathWord.textContent = st.breath.phase === "in" ? "Hít vào" : "Thở ra";
  ui.medClock.textContent = formatClock(st.remainingMs);
  if (st.done || session.endedEarlyMs) finishMeditation(st);
}

function finishMeditation(st) {
  const seconds = st.elapsedMs / 1000;
  session = null;
  ui.meditate.hidden = true;
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  if (st.done) for (let i = 0; i < TUNING.meditation.endBells; i++) audio?.smallBell(i * 2.2);
  game = recordMeditation(game, now(), seconds);
  persist();
  renderDock();
  const minutes = Math.floor(seconds / 60);
  openSheet((root) => {
    root.append(
      el("div", { class: "eyebrow", text: "Xả thiền" }),
      el("h2", { id: "sheet-title", text: minutes ? `Bạn đã ngồi yên ${minutes} phút` : "Một khoảnh khắc yên" }),
      el("p", {
        text:
          game.streak.count > 1
            ? `Hôm nay tổng cộng ${game.today.minutes} phút. Chuỗi ${game.streak.count} ngày liền.`
            : `Hôm nay tổng cộng ${game.today.minutes} phút tĩnh tâm.`,
      }),
      el("div", { class: "sheet-actions" }, button("Tạo thiệp chia sẻ", openShare, true), button("Ngồi tiếp", closeSheet)),
    );
  });
}

function openWishSheet() {
  openSheet((root) => {
    root.append(
      el("div", { class: "eyebrow", text: "Hồ sen" }),
      el("h2", { id: "sheet-title", text: "Thả một ngọn đèn" }),
      el("p", { text: "Lời nguyện chỉ lưu trên máy bạn. Người cùng sân chỉ thấy ánh đèn trôi trên hồ." }),
    );
    const form = el("form", { novalidate: "" });
    const area = el("textarea", { id: "wish", name: "wish", maxlength: String(TUNING.lantern.maxWishChars), placeholder: "Ví dụ: Mong cả nhà bình an qua mùa mưa bão" });
    const count = el("span", { class: "small", text: `0/${TUNING.lantern.maxWishChars}` });
    area.addEventListener("input", () => (count.textContent = `${area.value.length}/${TUNING.lantern.maxWishChars}`));
    form.append(el("div", { class: "field" }, el("label", { for: "wish", text: "Lời nguyện" }), area, count));
    const colorSet = el("fieldset", { class: "field" }, el("legend", { text: "Màu đèn" }));
    const wrap = el("div", { class: "swatches" });
    const COLORS = { sen: ["Hồng sen", "#f3a6b9"], do: ["Đỏ", "#e2574a"], vang: ["Vàng", "#f2c35b"] };
    for (const c of TUNING.lantern.colors) {
      const input = el("input", { type: "radio", name: "color", value: c, id: `lc-${c}` });
      input.checked = c === TUNING.lantern.colors[0];
      wrap.append(el("label", { class: "swatch", for: `lc-${c}` }, input, el("span", { class: "dot", style: `background:${COLORS[c][1]}` }), COLORS[c][0]));
    }
    colorSet.append(wrap);
    form.append(
      colorSet,
      el("div", { class: "sheet-actions" }, el("button", { class: "btn primary", type: "submit", text: "Thả đèn" }), button("Để sau", closeSheet)),
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const color = String(data.get("color"));
      const r = releaseLantern(game, now(), String(data.get("wish") ?? ""), color);
      if (!r.ok) {
        toast("Đèn trước vẫn đang trôi. Đợi một chút rồi thả tiếp.");
        return;
      }
      game = r.state;
      persist();
      lanterns.push({ id: `me-${now()}`, color: game.wishes[0].color, at: now() });
      presence.send({ type: "lantern", color: game.wishes[0].color });
      closeSheet();
      renderDock();
      toast("Đèn đã xuống hồ.");
    });
    root.append(form);
  });
}

function openBeads() {
  openSheet((root) => {
    root.append(el("div", { class: "eyebrow", text: "Chuỗi 108 hạt" }), el("h2", { id: "sheet-title", text: "Lần chuỗi" }));
    const c = el("canvas", { id: "beads-canvas", width: "440", height: "440", role: "button", tabindex: "0", "aria-label": "Lần một hạt" });
    const count = el("div", { class: "big-count" });
    const note = el("p", { class: "small", text: "Chạm vào chuỗi hoặc nhấn phím cách để lần một hạt." });
    const drawBeads = () => {
      const g = c.getContext("2d");
      g.clearRect(0, 0, 440, 440);
      const n = TUNING.beads.perRound;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const x = 220 + Math.cos(a) * 180;
        const y = 220 + Math.sin(a) * 180;
        g.fillStyle = i < game.beadIndex ? "#6b4a2a" : i === game.beadIndex ? "#d4b062" : "#a07a4a";
        g.beginPath();
        g.arc(x, y, i === game.beadIndex ? 9 : 6.5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#b23a2a";
      g.beginPath();
      g.arc(220, 22, 11, 0, Math.PI * 2);
      g.fill();
      count.textContent = `${game.beadIndex} / ${n}`;
    };
    const step = () => {
      const r = advanceBead(game, now());
      game = r.state;
      persist();
      audio?.bead();
      vibrate(6);
      if (r.completedRound) {
        audio?.smallBell();
        toast("Viên mãn một chuỗi 108 hạt.");
      }
      if (now() - lastMoSent > 3000) {
        lastMoSent = now();
        presence.send({ type: "bead" });
      }
      drawBeads();
    };
    c.addEventListener("click", step);
    c.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        step();
      }
    });
    drawBeads();
    root.append(el("div", { class: "beads-wrap" }, c, count, note), el("div", { class: "sheet-actions" }, button("Xong", () => (closeSheet(), renderDock()))));
    queueMicrotask(() => c.focus({ preventScroll: true }));
  });
}

function openJournal() {
  openSheet((root) => {
    const t = game.today;
    const stat = (value, label) => el("div", { class: "stat" }, el("b", { text: String(value) }), el("span", { text: label }));
    root.append(
      el("div", { class: "eyebrow", text: `${dayInfo.label} · ${dayInfo.year}` }),
      el("h2", { id: "sheet-title", text: "Sổ tay tĩnh tâm" }),
      el("h3", { text: "Hôm nay" }),
      el(
        "div",
        { class: "stats" },
        stat(t.minutes, "phút tĩnh tâm"),
        stat(t.incense, "nén nhang"),
        stat(t.bows, "lạy"),
        stat(t.rounds, "chuỗi 108 hạt"),
        stat(t.lanterns, "đèn hoa đăng"),
        stat(game.streak.count, "ngày liền"),
      ),
      el("p", { class: "small", text: `Tổng cộng: ${game.totals.minutes} phút tĩnh tâm, ${game.totals.visits} lần ghé am.` }),
      el("h3", { text: "Sổ nguyện (chỉ trên máy bạn)" }),
    );
    if (game.wishes.length) {
      const list = el("ul", { class: "wishes" });
      for (const w of game.wishes.slice(0, 30)) {
        const when = new Date(w.at).toLocaleDateString("vi-VN");
        list.append(el("li", {}, el("time", { text: when }), w.text || "(một ngọn đèn không lời)"));
      }
      root.append(list);
    } else {
      root.append(el("p", { class: "small", text: "Chưa có lời nguyện nào. Ra hồ sen để thả ngọn đèn đầu tiên." }));
    }
    const confirmRow = el("div", { class: "sheet-actions" });
    const wipe = button("Xoá dữ liệu trên máy", () => {
      confirmRow.replaceChildren(
        el("p", { class: "small", text: "Xoá tên, số liệu và mọi lời nguyện trên máy này? Không khôi phục được." }),
        button("Xoá hẳn", () => {
          game = createState(now());
          persist();
          closeSheet();
          location.reload();
        }, true),
        button("Giữ lại", () => (closeSheet(), openJournal())),
      );
    });
    confirmRow.append(button("Tạo thiệp hôm nay", openShare, true), button("Về Am Mây", openAbout), wipe, button("Đóng", closeSheet));
    root.append(confirmRow);
  });
}

function openAbout() {
  openSheet((root) => {
    root.append(
      el("div", { class: "eyebrow", text: "Về Am Mây" }),
      el("h2", { id: "sheet-title", text: "Một chỗ để ngồi yên" }),
      el("p", { text: "Am Mây là không gian tĩnh tâm trực tuyến, không thay thế việc đến chùa và không đại diện cho ngôi chùa hay giáo hội nào." }),
      el(
        "ul",
        { class: "vows" },
        el("li", { text: "Không chat: sự im lặng là điều quý nhất ở đây." }),
        el("li", { text: "Không quyên góp, không công đức trực tuyến, không bói toán, xin xăm." }),
        el("li", { text: "Không thu thập dữ liệu cá nhân. Tên và lời nguyện nằm trên máy bạn." }),
        el("li", { text: "Âm thanh chuông, mõ được tổng hợp bằng máy, không dùng bản ghi tụng kinh." }),
      ),
      el("p", { class: "small", text: "Lịch âm tính theo múi giờ Việt Nam (UTC+7)." }),
      el("div", { class: "sheet-actions" }, button("Quay lại", () => (closeSheet(), openJournal())), button("Đóng", closeSheet, true)),
    );
  });
}

async function openShare() {
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts are optional */
  }
  const card = renderCard({ env: envNow(), today: game.today, streak: game.streak, dayInfo, profile: game.profile, url: TUNING.share.url });
  const lines = summaryLines(game.today, game.streak);
  openSheet((root) => {
    const img = el("img", { class: "card-preview", alt: `Thiệp Am Mây: ${lines.headline}. ${lines.detail}` });
    img.src = card.toDataURL("image/png");
    const hint = el("p", { class: "small", text: "Nhấn giữ ảnh để lưu, rồi đăng lên Zalo, Facebook hay TikTok." });
    root.append(
      el("div", { class: "eyebrow", text: "Thiệp hôm nay" }),
      el("h2", { id: "sheet-title", text: lines.headline }),
      img,
      hint,
      el(
        "div",
        { class: "sheet-actions" },
        button("Chia sẻ ảnh", async () => {
          const r = await shareCard(card, `${lines.headline} · Am Mây`);
          if (r === "unsupported") hint.textContent = "Máy này chưa hỗ trợ chia sẻ trực tiếp. Nhấn giữ ảnh để lưu rồi đăng nhé.";
        }, true),
        button("Đóng", closeSheet),
      ),
    );
  });
}

// ── HUD ─────────────────────────────────────────────────────────────────────
function renderHud() {
  dayInfo = describeDay(new Date(now()));
  const s = dayInfo.solar;
  ui.day.textContent = dayInfo.label;
  ui.sub.textContent = `${dayInfo.year} · ${s.day}/${s.month}/${s.year}`;
  const next = dayInfo.next;
  ui.next.textContent =
    next && next.inDays > 0 ? `Còn ${next.inDays} ngày đến ${next.kind === "ram" ? "Rằm" : "Mùng 1"}` : "";
  const badge = dayInfo.festival ?? (dayInfo.special === "ram" ? "Ngày Rằm" : dayInfo.special === "mung1" ? "Mùng 1" : null);
  ui.badge.hidden = !badge;
  ui.badge.textContent = badge ?? "";
}

function renderPresence() {
  if (presence.mode === "shared" && room.no) {
    ui.presence.classList.remove("solo");
    const line = room.count > 1 ? `${room.count} người cùng tĩnh tâm` : "Chỉ có bạn ở sân này";
    ui.presenceText.replaceChildren(line, el("span", { class: "presence-room", text: `Sân ${room.no}` }));
  } else {
    ui.presence.classList.add("solo");
    ui.presenceText.textContent = entered ? "Một mình, yên tĩnh" : "Am Mây";
  }
}

let toastTimer = 0;
function toast(text) {
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (ui.toast.hidden = true), 3200);
}
function say(text) {
  ui.status.textContent = text;
}

// ── Hiện diện ───────────────────────────────────────────────────────────────
function addPeer(p) {
  const seat = p.seat != null ? CUSHIONS[p.seat] : null;
  peers.set(p.id, {
    id: p.id,
    robe: p.robe,
    head: p.head,
    x: seat ? seat.x : p.x,
    y: seat ? seat.y : p.y,
    pose: p.pose,
    seat: p.seat,
    route: [],
    facing: "up",
    bowT: 0,
    pulse: 0,
  });
}

function onPresence({ type, data }) {
  switch (type) {
    case "welcome":
      peers.clear();
      for (const p of data.peers) addPeer(p);
      roomIncense.length = 0;
      for (let i = 0; i < data.incense; i++) roomIncense.push(now());
      lanterns = lanterns.filter((l) => l.id.startsWith("me-")).concat(data.lanterns);
      room = { no: data.you.room, count: data.peers.length + 1 };
      presence.send({ type: "move", x: Math.round(me.x), y: Math.round(me.y) });
      break;
    case "join":
      addPeer(data);
      room.count = peers.size + 1;
      break;
    case "leave":
      peers.delete(data.id);
      room.count = peers.size + 1;
      break;
    case "act": {
      const p = peers.get(data.id);
      if (data.type === "bell") {
        bellSwing = { t: performance.now() / 1000 };
        if (!reduceMotion) ripples.push(performance.now() / 1000);
        audio?.bigBell();
      }
      if (data.type === "incense") roomIncense.push(now());
      if (data.type === "lantern" && data.lantern) lanterns.push(data.lantern);
      if (!p) break;
      if (data.type === "move") {
        p.seat = null;
        p.pose = "stand";
        p.route = planRoute(p, { x: data.x, y: data.y });
      } else if (data.type === "sit") {
        const c = CUSHIONS[data.seat];
        p.seat = data.seat;
        p.pose = "sit";
        p.route = planRoute(p, c);
      } else if (data.type === "stand") {
        p.seat = null;
        p.pose = "stand";
      } else if (data.type === "pose") {
        p.pose = data.pose === "stand" && p.seat != null ? "sit" : data.pose;
      } else if (data.type === "mo" || data.type === "bead" || data.type === "incense") {
        p.pulse = 1;
      }
      break;
    }
    case "full":
      toast("Các sân đều đang kín chỗ. Bạn đang tĩnh tâm riêng, vẫn đầy đủ mọi nghi thức.");
      presence = { mode: "solo", send: async () => ({ ok: false }), close() {} };
      break;
    case "status":
      if (data === "closed") presence.mode = "solo";
      break;
    default:
      break;
  }
  renderPresence();
}

function presenceBase() {
  const q = params.get("server");
  if (q) return q.replace(/\/$/, "");
  if (globalThis.AM_MAY_SERVER) return String(globalThis.AM_MAY_SERVER);
  if (/^https?:$/.test(location.protocol)) return location.origin;
  return null;
}

// ── Vào am ──────────────────────────────────────────────────────────────────
async function enter() {
  entered = true;
  enteredAt = now();
  game = recordVisit(game, now());
  persist();
  audio ??= createAudio();
  const soundPref = load("am-may:sound");
  const soundOn = soundPref !== "off";
  audio.setEnabled(soundOn, envNow().sky.night);
  setSoundButton(soundOn);
  // Walk in from the gate to the front of the courtyard.
  me.x = LAYOUT.spawn.x;
  me.y = LAYOUT.spawn.y;
  goTo({ kind: "walk", stand: { x: 180, y: 446 } });
  renderPresence();
  presence = await connectPresence({ base: presenceBase(), profile: game.profile, onEvent: onPresence });
  renderPresence();
}

function setSoundButton(on) {
  ui.sound.setAttribute("aria-pressed", String(on));
  ui.sound.setAttribute("aria-label", on ? "Tắt âm thanh" : "Bật âm thanh");
  document.getElementById("snd-wave")?.setAttribute("opacity", on ? "1" : "0.15");
}

function start() {
  resize();
  renderHud();
  renderPresence();
  globalThis.addEventListener("resize", resize);
  canvas.addEventListener("pointerup", onTap);
  ui.medStop.addEventListener("click", () => {
    if (session) session = endEarly(session, now());
  });
  ui.journal.addEventListener("click", () => (entered ? openJournal() : null));
  ui.sound.addEventListener("click", () => {
    if (!audio) return;
    const on = !audio.enabled;
    audio.setEnabled(on, envNow().sky.night);
    save("am-may:sound", on ? "on" : "off");
    setSoundButton(on);
  });
  ui.sheet.addEventListener("click", (e) => {
    if (e.target === ui.sheet && entered) closeSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !ui.sheet.hidden && entered) closeSheet();
  });
  setInterval(renderHud, 60_000);
  // The hall's name board is drawn into the cached layer; redraw once web fonts arrive.
  document.fonts?.ready.then(() => (staticKey = "")).catch(() => {});
  persist();
  requestAnimationFrame(frame);
  welcomeSheet();
}

start();
