// 날씨 이벤트: 비 갠 뒤 무지개 + 맑은 밤 별똥별(소원 빌기). scene에 추가, 매 프레임 update.
import * as THREE from 'three';

const RAINBOW = [0xff5a5a, 0xff9a3c, 0xffe23c, 0x5ecb5e, 0x4aa3ff, 0x5a5ad6, 0x9a5ad6];

export class WeatherEvents {
  constructor(scene) {
    this.scene = scene;
    this.prevWeather = null;
    this.rainbowT = 0;        // 남은 표시 시간
    this.starActive = false;
    this.star = null;
    this.starT = 0;           // 현재 별똥별 진행(0~1)
    this.starCd = 6 + Math.random() * 6; // 다음 별똥별까지
    this._buildRainbow();
    this._buildStar();
  }

  _buildRainbow() {
    const g = new THREE.Group();
    RAINBOW.forEach((c, i) => {
      const r = 34 + i * 1.4;
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.7, 8, 48, Math.PI),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false }));
      g.add(m);
    });
    g.position.set(0, -4, -62); // 멀리 하늘에 큰 아치
    this.rainbow = g; g.visible = false;
    this.scene.add(g);
  }

  _buildStar() {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.95, depthWrite: false }));
    const trail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 4.5, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.6, depthWrite: false }));
    trail.rotation.z = Math.PI / 2; trail.position.x = 2.4; // 꼬리
    g.add(head, trail);
    this.star = g; g.visible = false;
    this.scene.add(g);
  }

  _setRainbowOpacity(a) { this.rainbow.children.forEach((m) => { m.material.opacity = a; }); }

  // 소원 빌기: 별똥별이 떠 있을 때만 성공
  wish() { if (this.starActive) { this.starActive = false; this.star.visible = false; return true; } return false; }
  get starVisible() { return this.starActive; }

  update(dt, st, px, pz) {
    // 무지개: 비 → 맑음 전환 시 등장(페이드 인/홀드/아웃)
    if (this.prevWeather === 'rain' && st.weather === 'clear') this.rainbowT = 45;
    this.prevWeather = st.weather;
    if (this.rainbowT > 0) {
      this.rainbowT -= dt;
      this.rainbow.visible = true;
      const fade = Math.min(1, this.rainbowT / 6, (45 - this.rainbowT) / 4); // 양끝 페이드
      this._setRainbowOpacity(Math.max(0, fade) * 0.55);
      this.rainbow.position.x = px; this.rainbow.position.z = pz - 62; // 플레이어 기준 먼 하늘
      if (this.rainbowT <= 0) this.rainbow.visible = false;
    }

    // 별똥별: 맑은 밤에만
    const night = st.phase === 'night' && st.weather === 'clear';
    if (this.starActive) {
      this.starT += dt / 1.5; // 1.5초에 걸쳐 가로지름
      const t = this.starT;
      this.star.position.set(px - 26 + t * 52, 24 - t * 8, pz - 24);
      if (t >= 1) { this.starActive = false; this.star.visible = false; this.starCd = 8 + Math.random() * 10; }
    } else if (night) {
      this.starCd -= dt;
      if (this.starCd <= 0) { this.starActive = true; this.starT = 0; this.star.visible = true; }
    }
  }
}
