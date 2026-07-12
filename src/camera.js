// 위에서 살짝 내려다보는 추적 카메라(약한 Perspective — 절벽 입체감 유지).
// yaw로 수평 회전(Q/E), dist로 줌(휠). 오프셋을 매 프레임 회전·스케일해 계산.
import * as THREE from 'three';
import { CONFIG } from './config.js';

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.base = new THREE.Vector3(...CONFIG.camera.offset); // 기준 오프셋(yaw 0, dist 1)
    this.offset = this.base.clone();
    this.yaw = 0;        // 수평 회전각(라디안)
    this.dist = 1;       // 줌 배율(0.6~1.8)
    this._tmp = new THREE.Vector3();
  }
  // 현재 yaw·dist로 오프셋 재계산(수평 성분만 회전, 전체를 dist로 스케일)
  _recalc() {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    const bx = this.base.x, by = this.base.y, bz = this.base.z;
    this.offset.set((bx * c - bz * s) * this.dist, by * this.dist, (bx * s + bz * c) * this.dist);
  }
  rotate(delta) { this.yaw += delta; }
  zoom(factor) { this.dist = Math.min(1.8, Math.max(0.6, this.dist * factor)); }
  snap(target) { this._recalc(); this.camera.position.copy(target).add(this.offset); this.camera.lookAt(target.x, target.y + 1, target.z); }
  update(dt, target) {
    this._recalc();
    this._tmp.copy(target).add(this.offset);
    this.camera.position.lerp(this._tmp, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(target.x, target.y + 1, target.z);
  }
}
