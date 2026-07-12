// 원격 플레이어 렌더 + 위치 보간 + 이름표.
import * as THREE from 'three';
import { buildCharacter, animateWalk } from './character.js';

function nameSprite(name) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 14, 256, 36);
  ctx.font = 'bold 30px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.fillText(name || '여행자', 128, 33);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  spr.scale.set(2.4, 0.6, 1); spr.position.y = 2.3; return spr;
}

function makeAvatar(app, name) {
  const g = new THREE.Group();
  const char = buildCharacter(app || {}); // 로컬 플레이어와 동일한 캐릭터
  g.add(char, nameSprite(name));
  g.userData.char = char;
  return g;
}

// 말풍선 스프라이트(잠시 떴다 사라짐). group에 붙임.
export function attachBubble(group, text) {
  if (group.userData._bubble) { group.remove(group.userData._bubble); }
  const c = document.createElement('canvas'); c.width = 256; c.height = 72;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.roundRect(6, 6, 244, 52, 14); ctx.fill();
  ctx.font = 'bold 26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2b3a2b'; ctx.fillText(text.slice(0, 14), 128, 32);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  spr.scale.set(2.8, 0.8, 1); spr.position.y = 2.9;
  group.add(spr); group.userData._bubble = spr;
  clearTimeout(group.userData._bubbleT);
  group.userData._bubbleT = setTimeout(() => { group.remove(spr); if (group.userData._bubble === spr) group.userData._bubble = null; }, 3500);
}

export class RemotePlayers {
  constructor(scene, map) { this.scene = scene; this.map = map; this.players = new Map(); }
  setMap(map) { this.map = map; }
  add(p) {
    if (!p || this.players.has(p.id)) return;
    const m = makeAvatar(p.appearance, p.name);
    m.position.set(p.x || 0, this.map ? this.map.surfaceHeight(p.x || 0, p.z || 0) : 0, p.z || 0);
    this.scene.add(m);
    this.players.set(p.id, { mesh: m, tx: p.x || 0, tz: p.z || 0, face: p.face || 0, name: p.name || '여행자', phase: 0 });
  }
  list() { return [...this.players.entries()].map(([id, r]) => ({ id, name: r.name })); }
  dots() { return [...this.players.values()].map((r) => ({ x: r.tx, z: r.tz })); } // 미니맵용 위치
  move(d) { const r = this.players.get(d.id); if (r) { r.tx = d.x; r.tz = d.z; r.face = d.face; } }
  bubble(id, text) { const r = this.players.get(id); if (r) attachBubble(r.mesh, text); }
  remove(id) { const r = this.players.get(id); if (r) { this.scene.remove(r.mesh); this.players.delete(id); } }
  clear() { for (const id of [...this.players.keys()]) this.remove(id); }
  update(dt) {
    const k = Math.min(1, 10 * dt);
    for (const r of this.players.values()) {
      const m = r.mesh;
      const moving = Math.hypot(r.tx - m.position.x, r.tz - m.position.z) > 0.02;
      m.position.x += (r.tx - m.position.x) * k;
      m.position.z += (r.tz - m.position.z) * k;
      m.position.y = this.map ? this.map.surfaceHeight(m.position.x, m.position.z) : 0;
      m.rotation.y += (r.face - m.rotation.y) * k;
      if (moving) r.phase += dt * 11;
      if (m.userData.char) animateWalk(m.userData.char, r.phase, moving ? 1 : 0); // 원격도 걷기 애니메이션
    }
  }
}
