/**
 * FUTBOL ARENA — Server-Authoritative multiplayer server (asos/namuna)
 * ============================================================
 * Bu Node.js server 1v1 PvP uchun professional arxitektura asosini
 * tashkil etadi: matchmaking xonalari, holatlarni tekshirish
 * (anti-cheat), reyting hisoblash va natijalarni xavfsiz saqlash.
 *
 * Ishga tushirish:
 *   npm install ws
 *   node server.js
 *
 * Hozirgi o'yin versiyasi demo transport sifatida ommaviy MQTT
 * brokeridan foydalanadi (net.js). Ishlab chiqarish (production) uchun
 * shu serverni VPS/Redis bilan joylashtiring va net.js dagi
 * BROKERS ni ws://sizning-server:8080 ga almashtiring.
 */
"use strict";
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

/** Kutilayotgan o'yinchilar (matchmaking navbati) */
const queue = [];
/** Faol o'yinlar: id → {host, guest, state, lastInput, startedAt} */
const games = new Map();
/** Reytinglar (namunaviy; real loyihada PostgreSQL/Redis) */
const ratings = new Map();

const send = (ws, obj) => { try { ws.send(JSON.stringify(obj)); } catch (e) {} };

/** Anti-cheat: kirish ma'lumotlarini tekshirish */
function sanitizeInput(inp) {
  if (!inp || typeof inp !== "object") return null;
  const out = {};
  if (typeof inp.mx === "number") out.mx = Math.max(-1, Math.min(1, inp.mx));
  if (typeof inp.mz === "number") out.mz = Math.max(-1, Math.min(1, inp.mz));
  if (typeof inp.btn === "string" && inp.btn.length < 12) out.btn = inp.btn;
  return out;
}

/** Reyting (ELO ko'rinishidagi) */
function eloDelta(a, b, score, K = 32) {
  const ea = 1 / (1 + Math.pow(10, (b - a) / 400));
  return Math.round(K * (score - ea));
}

wss.on("connection", (ws, req) => {
  ws.id = crypto.randomBytes(8).toString("hex");
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    switch (msg.t) {
      case "find": {
        // Matchmaking: reytingi yaqin raqibni izlash
        ws.name = String(msg.name || "O'yinchi").slice(0, 24);
        ws.rating = Number(msg.rating) || 1000;
        ratings.set(ws.id, ws.rating);
        const idx = queue.findIndex(p => p !== ws && Math.abs(p.rating - ws.rating) < 300);
        if (idx >= 0) {
          const peer = queue.splice(idx, 1)[0];
          const gameId = crypto.randomBytes(6).toString("hex");
          const g = { id: gameId, host: peer, guest: ws, startedAt: Date.now() };
          games.set(gameId, g);
          peer.gameId = ws.gameId = gameId;
          send(peer, { t: "match", role: "host", gameId, opp: { name: ws.name, rating: ws.rating } });
          send(ws, { t: "match", role: "guest", gameId, opp: { name: peer.name, rating: peer.rating } });
        } else if (!queue.includes(ws)) {
          queue.push(ws);
          send(ws, { t: "queued" });
        }
        break;
      }
      case "cancel": {
        const i = queue.indexOf(ws);
        if (i >= 0) queue.splice(i, 1);
        break;
      }
      case "state": {
        // MEZBON (host) holat snapshot'i — tekshiruvdan o'tkazib mehmonga uzatish
        const g = games.get(ws.gameId);
        if (!g || ws !== g.host) return;
        if (typeof msg.s === "object" && JSON.stringify(msg.s).length < 8192) {
          send(g.guest, { t: "st", s: msg.s });
        }
        break;
      }
      case "input": {
        // MEHMON kiritishi — tekshirilib mezbonga uzatiladi (anti-cheat)
        const g = games.get(ws.gameId);
        if (!g || ws !== g.guest) return;
        const safe = sanitizeInput(msg.i);
        if (safe) {
          // Tezlik cheklovi: >30 msg/s kiritish rad etiladi
          const now = Date.now();
          if (!ws._lastIn || now - ws._lastIn > 25) {
            ws._lastIn = now;
            send(g.host, { t: "in", id: msg.id, i: safe });
          }
        }
        break;
      }
      case "result": {
        const g = games.get(ws.gameId);
        if (!g) return;
        // Ikkala tomon natijasi mos kelishini tekshirish (basic anti-cheat)
        g["res_" + (ws === g.host ? "h" : "g")] = msg.score;
        if (g.res_h && g.res_g) {
          if (String(g.res_h) === String(g.res_g).split(",").reverse().join(",")) {
            const [hs, gs] = g.res_h;
            const dh = eloDelta(g.host.rating, g.guest.rating, hs > gs ? 1 : 0.5);
            send(g.host, { t: "rating", delta: dh });
            send(g.guest, { t: "rating", delta: -dh });
            // DB'ga yozish shu yerda bo'ladi (namunada konsolga chiqaramiz)
            console.log(`O'yin ${g.id} tugadi: ${g.host.name} ${hs}:${gs} ${g.guest.name}`);
          }
          games.delete(g.id);
        }
        break;
      }
      case "bye": {
        const g = games.get(ws.gameId);
        if (g) {
          const other = ws === g.host ? g.guest : g.host;
          send(other, { t: "bye" });
          games.delete(g.id);
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    const i = queue.indexOf(ws);
    if (i >= 0) queue.splice(i, 1);
    const g = games.get(ws.gameId);
    if (g) {
      const other = ws === g.host ? g.guest : g.host;
      send(other, { t: "drop" }); // qayta ulanish imkonini berish
    }
  });
});

// Har 30 soniyada "o'lik" ulanishlarni tozalash
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 30000);

console.log(`✅ Futbol Arena serveri ${PORT}-portda ishga tushdi`);
console.log("Protocol: find | cancel | state | input | result | bye");
