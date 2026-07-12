// NPC: 저폴리 캐릭터 + 홈 반경 안 가벼운 배회. 대화 중엔 정지 + 플레이어 응시.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildVillager, updateFace } from './character.js';

const SPEED = 1.7, R = 0.4, HOME_R = 9; // 홈 주변을 넓게 배회(동숲처럼 마을을 돌아다님)

export class NPC {
  constructor(map, x, z, villager) {
    this.map = map;
    this.id = villager.id; this.name = villager.name; this.villager = villager;
    this.homeX = x; this.homeZ = z; this.x = x; this.z = z;
    this.group = new THREE.Group();
    this.char = buildVillager(villager);   // 동물풍 주민
    this.group.add(this.char);
    this.t = 0; this.tx = x; this.tz = z; this.face = 0; this.phase = 0; this.waveT = 0; this.talkT = 0;
    this.expr = 'neutral'; this.exprT = 0; this.idleExprT = 3 + Math.random() * 5;
    this.atHome = false; // 집에 있으면 밖에서 안 보임(중복 방지)
    this._apply();
  }

  // 반가운 손 흔들기(대화 시작 등)
  wave() { this.waveT = 1.1; }
  // 말하는 입(주둥이 오르내림) — 대사 길이만큼
  startTalk(dur) { this.talkT = Math.min(2.5, dur || 1); }
  // 표정 지정(잠깐 유지 후 중립 복귀)
  express(type, dur = 2) { this.expr = type; this.exprT = dur; }

  _apply() { this.group.position.set(this.x, this.map.surfaceHeight(this.x, this.z), this.z); }

  _canStand(x, z) {
    const m = this.map;
    if (Math.hypot(x - this.homeX, z - this.homeZ) > HOME_R) return false;
    for (const [ox, oz] of [[R, 0], [-R, 0], [0, R], [0, -R]]) if (m.blockedAtWorld(x + ox, z + oz)) return false;
    if (Math.abs(m.surfaceHeight(x, z) - m.surfaceHeight(this.x, this.z)) > CONFIG.STEP) return false;
    return true;
  }

  faceTo(x, z) { this.face = Math.atan2(x - this.x, z - this.z); }

  update(dt, frozen) {
    if (this.atHome) return; // 집에 있음(밖에 안 보임) → 배회/애니 정지
    let moving = false;
    if (!frozen) {
      this.t -= dt;
      if (this.t <= 0) {
        this.t = 1.6 + Math.random() * 2.8;
        const a = Math.random() * 6.28, r = Math.random() * HOME_R * 0.8;
        this.tx = this.homeX + Math.cos(a) * r; this.tz = this.homeZ + Math.sin(a) * r;
      }
      const dx = this.tx - this.x, dz = this.tz - this.z, d = Math.hypot(dx, dz);
      if (d > 0.12) {
        const vx = (dx / d) * SPEED * dt, vz = (dz / d) * SPEED * dt;
        if (this._canStand(this.x + vx, this.z + vz)) { this.x += vx; this.z += vz; this.face = Math.atan2(dx, dz); moving = true; }
        else this.t = 0;
      }
    }
    this.group.rotation.y += (this.face - this.group.rotation.y) * Math.min(1, 10 * dt);
    // 가벼운 애니메이션: 걸을 때 통통, 멈추면 숨쉬듯 살짝
    this.phase += dt * (moving ? 9 : 2.2);
    const u = this.char.userData;
    if (moving) { this.char.position.y = Math.abs(Math.sin(this.phase)) * 0.06; const sw = Math.sin(this.phase) * 0.4; if (u.armL) u.armL.rotation.x = sw; if (u.armR) u.armR.rotation.x = -sw; }
    else { this.char.position.y = Math.sin(this.phase) * 0.015; if (u.armL) u.armL.rotation.x *= 0.85; if (u.armR) u.armR.rotation.x *= 0.85; }
    if (this.waveT > 0) { // 손 흔들기: 오른팔 들어 좌우로
      this.waveT -= dt;
      if (u.armR) u.armR.rotation.z = -1.4 + Math.sin(this.waveT * 22) * 0.4;
    } else if (u.armR) u.armR.rotation.z *= 0.8;
    if (this.talkT > 0 && u.muzzle) { // 말하는 입: 주둥이 위아래로
      this.talkT -= dt;
      u.muzzle.scale.y = 0.8 + Math.abs(Math.sin(this.phase * 3.2)) * 0.35;
    } else if (u.muzzle) u.muzzle.scale.y += (0.8 - u.muzzle.scale.y) * 0.3;
    // 표정: 지정된 게 있으면 유지, 없으면 이따금 랜덤 표정(성격 반영)으로 다양화
    if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = 'neutral'; }
    else { this.idleExprT -= dt; if (this.idleExprT <= 0) { this.idleExprT = 4 + Math.random() * 6; const pool = this.villager.personality === '무뚝뚝' ? ['neutral', 'neutral', 'angry'] : this.villager.personality === '느긋' ? ['neutral', 'happy', 'neutral'] : ['happy', 'surprised', 'neutral']; this.express(pool[Math.random() * pool.length | 0], 1.6 + Math.random() * 1.4); } }
    updateFace(this.char, dt, this.expr);
    this._apply();
  }
}
