// Socket.IO 클라이언트 래퍼. 서버 없으면 offline() 콜백 → 싱글로 폴백.
export function connectNet(handlers) {
  if (!window.io) { setTimeout(handlers.offline, 0); return null; }
  const socket = window.io({ reconnection: true });
  socket.on('connect', () => handlers.connected());
  socket.on('welcome', (d) => handlers.welcome(d));
  socket.on('playerJoined', (p) => handlers.joined(p));
  socket.on('playerMoved', (d) => handlers.moved(d));
  socket.on('playerLeft', (d) => handlers.left(d));
  socket.on('reseed', (d) => handlers.reseed(d));
  socket.on('placed', (d) => handlers.placed(d));
  socket.on('removed', (d) => handlers.removed(d));
  socket.on('collected', (d) => handlers.collected(d));
  socket.on('planted', (d) => handlers.planted(d));
  socket.on('harvested', (d) => handlers.harvested(d));
  socket.on('time', (d) => handlers.time(d));
  socket.on('chat', (d) => handlers.chat(d));
  socket.on('mailReceived', (d) => handlers.mailReceived(d));
  socket.on('emote', (d) => handlers.emote(d));
  socket.on('terraformed', (d) => handlers.terraformed(d));
  socket.on('villagers', (d) => handlers.villagers(d));
  setTimeout(() => { if (!socket.connected) handlers.offline(); }, 8000); // 오래 못 붙으면 싱글 폴백
  return socket;
}
