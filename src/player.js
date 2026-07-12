// 플레이어: 저폴리 캐릭터 + 연속 이동 + 그리드 기준 충돌.
// 셀이 평평하므로 표면높이가 정확히 일치 → 파묻힘 없음.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildCharacter, applyCharColors, animateWalk, updateFace } from './character.js';

const POSE_EXPR = { wave: 'happy', up: 'happy', jump: 'happy', ohh: 'surprised', sad: 'sad' };

const SPEED = 6, R = 0.45, SWING = 0.42;

export class Player {
  constructor(map) {
    this.map = map;
    this.group = new THREE.Group();
    this.char = buildCharacter();       // 다리·몸통·팔·머리 갖춘 캐릭터
    this.group.add(this.char);
    this.x = map.spawn.x; this.z = map.spawn.z;
    this.indoor = false; this.bound = 3.4; // 실내 방 반경
    this._apply();
    this.face = 0; this.walk = 0; this.swingT = 0; this.hopT = 0; this.pose = null; this.poseT = 0;
    this.expr = 'neutral'; this.exprT = 0;
  }

  // 도구질/채집 스윙(오른팔 들어올리기) + 작은 점프
  swing() { this.swingT = SWING; this.hopT = 0.32; }
  // 리액션 포즈(이모트): 'wave'|'up'|'jump'|'sad'|'ohh'
  doPose(type) { this.pose = type; this.poseT = 0.9; if (type === 'jump' || type === 'up') this.hopT = 0.4; this.expr = POSE_EXPR[type] || 'happy'; this.exprT = 1.0; }

  _apply() {
    const y = this.indoor ? 0 : this.map.surfaceHeight(this.x, this.z);
    this.group.position.set(this.x, y, this.z);
  }

  // 외형 커스텀: 몸(셔츠)/피부/머리카락 색
  setAppearance(a) { applyCharColors(this.char, a); }

  _canStand(x, z) {
    if (this.indoor) return Math.abs(x) <= this.bound && Math.abs(z) <= this.bound; // 방 안 평지
    const m = this.map;
    for (const [ox, oz] of [[R, 0], [-R, 0], [0, R], [0, -R]])
      if (m.blockedAtWorld(x + ox, z + oz)) return false;
    // 절벽(급한 높이차)은 막고, 램프(완만)는 통과
    if (Math.abs(m.surfaceHeight(x, z) - m.surfaceHeight(this.x, this.z)) > CONFIG.STEP) return false;
    return true;
  }

  update(dt, keys, camYaw = 0) {
    let dx = 0, dz = 0;
    if (keys.has('ArrowUp') || keys.has('KeyW')) dz -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) dz += 1;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
    if (dx || dz) { // 입력을 카메라 yaw만큼 회전 → 항상 "위=화면 위쪽"
      const cc = Math.cos(camYaw), cs = Math.sin(camYaw);
      const rdx = dx * cc - dz * cs, rdz = dx * cs + dz * cc; dx = rdx; dz = rdz;
    }
    const moving = dx || dz;
    if (moving) {
      const l = Math.hypot(dx, dz), vx = (dx / l) * SPEED * dt, vz = (dz / l) * SPEED * dt;
      if (this._canStand(this.x + vx, this.z + vz)) { this.x += vx; this.z += vz; }
      else if (this._canStand(this.x + vx, this.z)) this.x += vx;
      else if (this._canStand(this.x, this.z + vz)) this.z += vz;
      this.face = Math.atan2(dx, dz);
      this.walk += dt * 11;
    }
    this.group.rotation.y += (this.face - this.group.rotation.y) * Math.min(1, 14 * dt);
    animateWalk(this.char, this.walk, moving ? 1 : 0); // 팔다리 스윙 + 통통 걸음
    if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = 'neutral'; }
    updateFace(this.char, dt, this.expr);
    const u = this.char.userData;
    if (this.swingT > 0) { // 채집/도구 스윙: 오른팔 들어 내려치기
      this.swingT -= dt;
      const k = Math.sin((1 - Math.max(0, this.swingT) / SWING) * Math.PI);
      u.armR.rotation.x = -k * 2.2;
    }
    // 리액션 포즈
    if (this.poseT > 0) {
      this.poseT -= dt; const p = this.poseT * 6;
      if (this.pose === 'wave') u.armR.rotation.z = -1.5 + Math.sin(p) * 0.5;
      else if (this.pose === 'up') { u.armL.rotation.z = 1.4; u.armR.rotation.z = -1.4; }
      else if (this.pose === 'jump') { u.armL.rotation.x = -1.2; u.armR.rotation.x = -1.2; }
      else if (this.pose === 'sad') { u.armL.rotation.x = -0.6; u.armR.rotation.x = -0.6; this.char.rotation.x = 0.18; }
      else if (this.pose === 'ohh') { this.char.rotation.x = -0.15; }
      if (this.poseT <= 0) { u.armL.rotation.set(0, 0, 0); u.armR.rotation.set(0, 0, 0); this.char.rotation.x = 0; }
    }
    // 점프(채집·이모트)
    if (this.hopT > 0) { this.hopT -= dt; this.char.position.y += Math.sin((1 - Math.max(0, this.hopT) / 0.4) * Math.PI) * 0.28; }
    this._apply();
  }
}
