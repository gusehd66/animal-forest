// 정적 파일 서버 + Socket.IO 멀티플레이. 서버가 섬 시드를 소유(모든 클라 동일 섬).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 8720;
const HOST = process.env.HOST || '0.0.0.0';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json',
};

const httpServer = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
  }
});

const io = new Server(httpServer, { cors: { origin: '*' } });
const REAL_SEC_PER_HOUR = 3.5;
const gameTime = { day: 1, hour: 8 };   // 서버 소유 시각(모든 방 공통)
const rooms = new Map();                // roomId(초대코드) → 방 상태

function hashSeed(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// 주민 풀(클라 villagers.js와 동일 id) + 시드 기반 초기 거주자 3명
const VILLAGER_POOL = ['tori', 'kkuk', 'monge', 'bibi', 'doran', 'poro'];
function pickResidents(seed) {
  const pool = VILLAGER_POOL.slice(); let s = seed >>> 0;
  for (let i = pool.length - 1; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = s % (i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
// 거주자 1명 교체(퇴거→입주): 대기 주민 중 랜덤 입주
function rotateRoom(room) {
  const out = room.residents[0];
  const wait = VILLAGER_POOL.filter((id) => !room.residents.includes(id));
  if (!wait.length) return null;
  const inId = wait[(Math.random() * wait.length) | 0];
  room.residents = [...room.residents.slice(1), inId];
  return { out, inId, residents: room.residents };
}

function getRoom(id) {
  let r = rooms.get(id);
  if (!r) { r = { seed: hashSeed(id), players: new Map(), placed: [], plants: [], edits: new Map(), residents: pickResidents(hashSeed(id)), consumed: { flower: new Set(), bug: new Set(), fossil: new Set(), shell: new Set() } }; rooms.set(id, r); }
  return r;
}

let lastRotateDay = 1;
setInterval(() => {
  gameTime.hour += 1 / REAL_SEC_PER_HOUR;
  while (gameTime.hour >= 24) { gameTime.hour -= 24; gameTime.day++; }
  // 5일마다 각 방에서 주민 1명 이사(퇴거→입주)
  if (gameTime.day % 5 === 0 && gameTime.day !== lastRotateDay) {
    lastRotateDay = gameTime.day;
    for (const [rid, room] of rooms) { if (room.players.size === 0) continue; const r = rotateRoom(room); if (r) io.to(rid).emit('villagers', { residents: r.residents, out: r.out, in: r.inId }); }
  }
}, 1000);
setInterval(() => io.emit('time', gameTime), 2500);

io.on('connection', (socket) => {
  const R = () => rooms.get(socket.data.room);
  const leaveRoom = () => {
    const prev = socket.data.room; if (!prev) return;
    const pr = rooms.get(prev);
    if (pr) { pr.players.delete(socket.id); socket.to(prev).emit('playerLeft', { id: socket.id }); if (pr.players.size === 0) rooms.delete(prev); }
    socket.leave(prev); socket.data.room = null;
  };

  socket.on('joinRoom', (d) => {
    const rid = String((d && d.room) || 'main').slice(0, 16).toUpperCase();
    leaveRoom();
    socket.data.room = rid; socket.join(rid);
    const room = getRoom(rid);
    const p = { id: socket.id, name: (d && d.name) || '여행자', appearance: d && d.appearance, x: (d && d.x) || 0, z: (d && d.z) || 0, face: 0 };
    room.players.set(socket.id, p);
    socket.emit('welcome', {
      room: rid, seed: room.seed, id: socket.id,
      players: [...room.players.values()].filter((x) => x.id !== socket.id),
      placed: room.placed, plants: room.plants, time: gameTime,
      edits: [...room.edits.values()], residents: room.residents,
      consumed: { flower: [...room.consumed.flower], bug: [...room.consumed.bug], fossil: [...room.consumed.fossil], shell: [...room.consumed.shell] },
    });
    socket.to(rid).emit('playerJoined', p);
  });

  socket.on('move', (d) => { const room = R(); if (!room) return; const p = room.players.get(socket.id); if (p) { p.x = d.x; p.z = d.z; p.face = d.face; socket.to(socket.data.room).emit('playerMoved', { id: socket.id, x: d.x, z: d.z, face: d.face }); } });
  socket.on('place', (d) => { const room = R(); if (!room) return; room.placed.push({ gx: d.gx, gz: d.gz, id: d.id, design: d.design }); socket.to(socket.data.room).emit('placed', d); });
  socket.on('pickup', (d) => { const room = R(); if (!room) return; room.placed = room.placed.filter((p) => !(p.gx === d.gx && p.gz === d.gz)); socket.to(socket.data.room).emit('removed', d); });
  socket.on('collect', (d) => { const room = R(); if (!room || !room.consumed[d.kind]) return; room.consumed[d.kind].add(d.key); socket.to(socket.data.room).emit('collected', d); });
  socket.on('plant', (d) => { const room = R(); if (!room) return; room.plants.push({ gx: d.gx, gz: d.gz, day: d.day, kind: d.kind }); socket.to(socket.data.room).emit('planted', { gx: d.gx, gz: d.gz, day: d.day, kind: d.kind }); });
  socket.on('harvest', (d) => { const room = R(); if (!room) return; room.plants = room.plants.filter((p) => !(p.gx === d.gx && p.gz === d.gz)); socket.to(socket.data.room).emit('harvested', { gx: d.gx, gz: d.gz }); });
  socket.on('chat', (d) => { const room = R(); if (!room) return; const p = room.players.get(socket.id); io.to(socket.data.room).emit('chat', { id: socket.id, name: p ? p.name : '?', text: String((d && d.text) || '').slice(0, 80) }); });
  socket.on('mail', (d) => { const room = R(); const p = room && room.players.get(socket.id); io.to(d.to).emit('mailReceived', { from: p ? p.name : '?', item: d.item }); });
  socket.on('emote', (d) => { if (socket.data.room) socket.to(socket.data.room).emit('emote', { id: socket.id, emoji: String((d && d.emoji) || '').slice(0, 4) }); });
  socket.on('terra', (d) => {
    const room = R(); if (!room) return;
    let ramp = null;
    if (d.ramp && typeof d.ramp === 'object') ramp = { from: d.ramp.from | 0, to: d.ramp.to | 0, dir: ['N', 'E', 'S', 'W'].includes(d.ramp.dir) ? d.ramp.dir : 'N' };
    const e = { gx: d.gx | 0, gz: d.gz | 0, height: d.height | 0, terrain: String(d.terrain || 'grass'), ramp };
    room.edits.set(e.gx + ',' + e.gz, e); socket.to(socket.data.room).emit('terraformed', e);
  });
  socket.on('rotateVillagers', () => { const room = R(); if (!room) return; const r = rotateRoom(room); if (r) io.to(socket.data.room).emit('villagers', { residents: r.residents, out: r.out, in: r.inId }); });
  socket.on('regen', () => { const room = R(); if (!room) return; room.seed = (Math.random() * 1e9) | 0; room.placed = []; room.plants = []; room.edits.clear(); room.residents = pickResidents(room.seed); room.consumed.flower.clear(); room.consumed.bug.clear(); room.consumed.fossil.clear(); room.consumed.shell.clear(); io.to(socket.data.room).emit('reseed', { seed: room.seed }); io.to(socket.data.room).emit('villagers', { residents: room.residents }); });
  socket.on('disconnect', leaveRoom);
});

httpServer.listen(PORT, HOST, () => console.log(`🏝️ grid-island(멀티): http://${HOST}:${PORT}`));
