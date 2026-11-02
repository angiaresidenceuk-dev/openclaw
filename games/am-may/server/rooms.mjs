// Quản lý "sân" (phòng) cho chế độ nhiều người, thuần logic để test được.
// Nguyên tắc: không chat, không tên, không lời nguyện đi qua server.
// Mỗi người chỉ là { id công khai, màu áo, kiểu tóc, vị trí, tư thế, bồ đoàn }.

import { randomBytes } from "node:crypto";
import { TUNING } from "../src/js/tuning.js";

const ROBES = new Set(["lam", "nau", "trang"]);
const HEADS = new Set(["toc", "troc"]);
const POSES = new Set(["stand", "join", "bow", "sit"]);
const ACTIONS = new Set(["move", "pose", "sit", "stand", "bell", "incense", "lantern", "mo", "bead"]);
const { width: W, height: H } = TUNING.world;

const defaultId = (bytes) => randomBytes(bytes).toString("hex");

/**
 * @param {object} [opts]
 * @param {() => number} [opts.now] clock, injectable for tests
 * @param {(bytes:number) => string} [opts.randomId] id source, injectable for tests
 */
export function createRooms({ now = Date.now, randomId = defaultId, room = TUNING.room } = {}) {
  /** @type {Map<number, Map<string, any>>} */
  const rooms = new Map();
  /** @type {Map<string, any>} token → member */
  const byToken = new Map();
  /** room-level shared state: incense offerings and lanterns on the pond */
  const shared = new Map();

  function sharedOf(roomNo) {
    if (!shared.has(roomNo)) shared.set(roomNo, { incense: [], lanterns: [], lastBell: 0 });
    const s = shared.get(roomNo);
    const t = now();
    s.incense = s.incense.filter((at) => t - at < TUNING.incense.burnMinutes * 60_000);
    s.lanterns = s.lanterns.filter((l) => t - l.at < TUNING.lantern.driftMinutes * 60_000);
    return s;
  }

  function pickRoom() {
    // Pack the fullest room that still has space: a crowded courtyard is the point.
    let best = null;
    for (const [no, members] of rooms) {
      if (members.size < room.capacity && (best === null || members.size > rooms.get(best).size)) {
        best = no;
      }
    }
    if (best !== null) return best;
    if (rooms.size >= room.maxRooms) return null;
    let no = 1;
    while (rooms.has(no)) no++;
    rooms.set(no, new Map());
    return no;
  }

  function publicView(m) {
    return { id: m.id, robe: m.robe, head: m.head, x: m.x, y: m.y, pose: m.pose, seat: m.seat };
  }

  function join({ robe, head } = {}) {
    const roomNo = pickRoom();
    if (roomNo === null) return { ok: false, reason: "full" };
    const member = {
      id: randomId(6),
      token: randomId(18),
      roomNo,
      robe: ROBES.has(robe) ? robe : "lam",
      head: HEADS.has(head) ? head : "toc",
      x: 180,
      y: 618,
      pose: "stand",
      seat: null,
      acts: [],
    };
    rooms.get(roomNo).set(member.id, member);
    byToken.set(member.token, member);
    const s = sharedOf(roomNo);
    return {
      ok: true,
      member,
      welcome: {
        you: { id: member.id, token: member.token, room: roomNo },
        capacity: room.capacity,
        peers: [...rooms.get(roomNo).values()].filter((m) => m !== member).map(publicView),
        incense: s.incense.length,
        lanterns: s.lanterns.map((l) => ({ id: l.id, color: l.color, at: l.at })),
      },
      announce: { roomNo, event: "join", data: publicView(member) },
    };
  }

  function leave(token) {
    const m = byToken.get(token);
    if (!m) return null;
    byToken.delete(token);
    const members = rooms.get(m.roomNo);
    members?.delete(m.id);
    if (members && members.size === 0) {
      rooms.delete(m.roomNo);
      shared.delete(m.roomNo);
    }
    return { roomNo: m.roomNo, event: "leave", data: { id: m.id } };
  }

  function rateLimited(m) {
    const t = now();
    m.acts = m.acts.filter((at) => t - at < room.windowSeconds * 1000);
    if (m.acts.length >= room.actionsPerWindow) return true;
    m.acts.push(t);
    return false;
  }

  const coord = (v, max) => Number.isFinite(v) && v >= 0 && v <= max;

  /**
   * Apply one action. Returns { ok, status, broadcast? } where broadcast is
   * { roomNo, event, data } for everyone else in the room.
   */
  function act(token, action) {
    const m = byToken.get(token);
    if (!m) return { ok: false, status: 401, reason: "unknown token" };
    if (!action || !ACTIONS.has(action.type)) return { ok: false, status: 400, reason: "bad type" };
    if (rateLimited(m)) return { ok: false, status: 429, reason: "slow down" };
    const members = rooms.get(m.roomNo);
    const s = sharedOf(m.roomNo);
    const out = { id: m.id, type: action.type };

    switch (action.type) {
      case "move": {
        if (!coord(action.x, W) || !coord(action.y, H)) return { ok: false, status: 400, reason: "bad coords" };
        m.x = Math.round(action.x);
        m.y = Math.round(action.y);
        m.seat = null;
        m.pose = "stand";
        Object.assign(out, { x: m.x, y: m.y });
        break;
      }
      case "pose": {
        if (!POSES.has(action.pose) || action.pose === "sit") return { ok: false, status: 400, reason: "bad pose" };
        m.pose = action.pose;
        out.pose = m.pose;
        break;
      }
      case "sit": {
        const seat = action.seat;
        if (!Number.isInteger(seat) || seat < 0 || seat >= room.capacity) {
          return { ok: false, status: 400, reason: "bad seat" };
        }
        for (const other of members.values()) {
          if (other !== m && other.seat === seat) return { ok: false, status: 409, reason: "seat taken" };
        }
        m.seat = seat;
        m.pose = "sit";
        out.seat = seat;
        break;
      }
      case "stand": {
        m.seat = null;
        m.pose = "stand";
        break;
      }
      case "bell": {
        const t = now();
        if (t - s.lastBell < TUNING.bell.roomCooldownSeconds * 1000) {
          return { ok: false, status: 429, reason: "bell still ringing" };
        }
        s.lastBell = t;
        break;
      }
      case "incense": {
        s.incense.push(now());
        out.count = s.incense.length;
        break;
      }
      case "lantern": {
        const color = TUNING.lantern.colors.includes(action.color) ? action.color : TUNING.lantern.colors[0];
        const lantern = { id: randomId(4), color, at: now() };
        s.lanterns.push(lantern);
        s.lanterns = s.lanterns.slice(-40);
        Object.assign(out, { lantern: { id: lantern.id, color, at: lantern.at } });
        break;
      }
      default:
        // mo, bead: a soft visual pulse for neighbors, nothing stored
        break;
    }
    return { ok: true, status: 204, broadcast: { roomNo: m.roomNo, event: "act", data: out } };
  }

  function membersOf(roomNo) {
    return rooms.get(roomNo) ?? new Map();
  }

  function stats() {
    let online = 0;
    for (const members of rooms.values()) online += members.size;
    return { online, rooms: rooms.size, capacity: room.capacity };
  }

  return { join, leave, act, membersOf, stats };
}
