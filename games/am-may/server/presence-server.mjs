#!/usr/bin/env node
// Am Mây — máy chủ hiện diện + phục vụ file tĩnh. Không cần thư viện ngoài.
//
//   node server/presence-server.mjs            → http://localhost:8787
//   PORT=9000 ALLOWED_ORIGIN=https://am-may.vn node server/presence-server.mjs
//
// Giao thức: Server-Sent Events (một chiều, qua được proxy/CDN, rẻ hơn WebSocket
// cho kiểu "nhìn thấy nhau, không nói chuyện").
//   GET  /api/presence?robe=lam&head=toc  → luồng SSE: welcome | join | leave | act | full
//   POST /api/act  { token, type, ... }   → 204 | 400 | 401 | 409 | 429
//   GET  /api/stats                        → { online, rooms, capacity }

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { TUNING } from "../src/js/tuning.js";
import { createRooms } from "./rooms.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "";
const STATIC_ROOT = resolve(fileURLToPath(new URL("../src/", import.meta.url)));
const MAX_BODY = 1024;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const rooms = createRooms();
/** token → ServerResponse (the open SSE stream) */
const streams = new Map();

function cors(res) {
  if (ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Vary", "Origin");
  }
}

function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast({ roomNo, event, data }, exceptToken) {
  for (const member of rooms.membersOf(roomNo).values()) {
    if (member.token === exceptToken) continue;
    const res = streams.get(member.token);
    if (res) send(res, event, data);
  }
}

function openStream(req, res, url) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const joined = rooms.join({ robe: url.searchParams.get("robe"), head: url.searchParams.get("head") });
  if (!joined.ok) {
    send(res, "full", { reason: joined.reason });
    res.end();
    return;
  }
  const { token } = joined.member;
  streams.set(token, res);
  send(res, "welcome", joined.welcome);
  broadcast(joined.announce, token);

  const ping = setInterval(() => res.write(": ping\n\n"), TUNING.room.heartbeatSeconds * 1000);
  req.on("close", () => {
    clearInterval(ping);
    streams.delete(token);
    const left = rooms.leave(token);
    if (left) broadcast(left);
  });
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleAct(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const result = rooms.act(String(body?.token ?? ""), body);
  if (result.broadcast) broadcast(result.broadcast, body.token);
  res.writeHead(result.status).end();
}

async function serveStatic(res, pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const file = resolve(join(STATIC_ROOT, rel || "index.html"));
  if (file !== STATIC_ROOT && !file.startsWith(STATIC_ROOT + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, "index.html") : file;
    const type = TYPES[extname(target)] ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": type.startsWith("text/html") ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Không tìm thấy");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/presence") return openStream(req, res, url);
  if (req.method === "POST" && url.pathname === "/api/act") return handleAct(req, res);
  if (req.method === "GET" && url.pathname === "/api/stats") {
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(rooms.stats()));
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(res, url.pathname);
  res.writeHead(405).end();
});

server.listen(PORT, HOST, () => {
  console.log(`Am Mây đang mở cổng tại http://localhost:${PORT}`);
});
