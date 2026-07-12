// 게임 시계 + 낮밤 하늘/조명 + 계절 + 날씨. 싱글은 클라에서 진행(멀티는 P10에서 서버로).
import * as THREE from 'three';
import { mulberry32 } from './map/rng.js';

const SEASONS = ['봄', '여름', '가을', '겨울'];
const SEASON_DAYS = 4;                 // 계절당 일수(데모용)
export const REAL_SEC_PER_HOUR = 3.5;  // 1게임시간=3.5실초 → 하루 ≈ 84초

// 계절별 색: grass=잔디텍스처 곱, edge=절벽 립, leaf=나뭇잎, water=물
export const SEASON_COLORS = {
  '봄': { grass: 0xffffff, edge: 0x86c65a, leaf: 0x6bcb57, water: 0x49a6d6 },
  '여름': { grass: 0xdcf2c2, edge: 0x6fb84a, leaf: 0x3f9a34, water: 0x33b2da },
  '가을': { grass: 0xf2d79c, edge: 0xc9a94e, leaf: 0xe0863a, water: 0x4a9ec8 },
  '겨울': { grass: 0xeef4fb, edge: 0xdbe7f0, leaf: 0xbcd4e2, water: 0x8fc2dd },
};

// 시각별 하늘 키프레임
const SKY = [
  { h: 0, bg: 0x0b1030, fog: 0x0b1030, sun: 0x4a5a8a, sunI: 0.12, hemiI: 0.28, elev: 0.02 },
  { h: 5, bg: 0x2a2f52, fog: 0x2a2f52, sun: 0x8a7aa0, sunI: 0.3, hemiI: 0.42, elev: 0.06 },
  { h: 7, bg: 0xf6bd8e, fog: 0xf7caa2, sun: 0xffd0a0, sunI: 1.2, hemiI: 0.7, elev: 0.2 },
  { h: 12, bg: 0x9ed9f2, fog: 0x9ed9f2, sun: 0xfff2d9, sunI: 2.0, hemiI: 0.9, elev: 0.9 },
  { h: 17, bg: 0x9bd6ee, fog: 0x9ed9f2, sun: 0xfff0d0, sunI: 1.8, hemiI: 0.85, elev: 0.45 },
  { h: 19, bg: 0xf29a5a, fog: 0xf0b080, sun: 0xff9a5a, sunI: 1.2, hemiI: 0.58, elev: 0.14 },
  { h: 21, bg: 0x171c40, fog: 0x171c40, sun: 0x5a5a8a, sunI: 0.28, hemiI: 0.34, elev: 0.05 },
  { h: 24, bg: 0x0b1030, fog: 0x0b1030, sun: 0x4a5a8a, sunI: 0.12, hemiI: 0.28, elev: 0.02 },
];

export class GameClock {
  constructor(day = 0, hour = 8, seed = 12345) { this.day = day; this.hour = hour; this.seed = seed; }
  update(dt) { this.hour += dt / REAL_SEC_PER_HOUR; while (this.hour >= 24) { this.hour -= 24; this.day++; } }
  advance(h) { this.hour += h; while (this.hour >= 24) { this.hour -= 24; this.day++; } }
  get season() { return SEASONS[Math.floor(this.day / SEASON_DAYS) % 4]; }
  get dayOfSeason() { return this.day % SEASON_DAYS; }
  get weather() {
    const r = mulberry32((this.seed ^ ((this.day + 1) * 2654435761)) >>> 0)();
    return this.season === '겨울' ? (r < 0.4 ? 'snow' : 'clear') : (r < 0.3 ? 'rain' : 'clear');
  }
  get phase() { const h = this.hour; return (h < 5 || h >= 20) ? 'night' : h < 7 ? 'dawn' : h < 18 ? 'day' : 'dusk'; }
  state() { return { hour: this.hour, day: this.day, season: this.season, dayOfSeason: this.dayOfSeason, weather: this.weather, phase: this.phase }; }
}

export function clockText(h) {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  const ap = hh < 12 ? '오전' : '오후'; let d = hh % 12; if (d === 0) d = 12;
  return `${ap} ${d}:${String(mm).padStart(2, '0')}`;
}

const _b = new THREE.Color(), _f = new THREE.Color(), _s = new THREE.Color(), _t = new THREE.Color();
const _gray = new THREE.Color(0x8a95a2), _snowSky = new THREE.Color(0xcdd8e2);

export function applySky(scene, sun, hemi, st) {
  const h = st.hour; let i = 0; while (i < SKY.length - 1 && h >= SKY[i + 1].h) i++;
  const a = SKY[i], b = SKY[Math.min(i + 1, SKY.length - 1)];
  const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
  _b.setHex(a.bg).lerp(_t.setHex(b.bg), t);
  _f.setHex(a.fog).lerp(_t.setHex(b.fog), t);
  _s.setHex(a.sun).lerp(_t.setHex(b.sun), t);
  let sunI = a.sunI + (b.sunI - a.sunI) * t;
  let hemiI = a.hemiI + (b.hemiI - a.hemiI) * t;
  const elev = a.elev + (b.elev - a.elev) * t;
  if (st.weather === 'rain') { _b.lerp(_gray, 0.5); _f.lerp(_gray, 0.5); sunI *= 0.45; }
  else if (st.weather === 'snow') { _b.lerp(_snowSky, 0.4); _f.lerp(_snowSky, 0.4); sunI *= 0.7; }
  scene.background.copy(_b); if (scene.fog) scene.fog.color.copy(_f);
  sun.color.copy(_s); sun.intensity = sunI; hemi.intensity = hemiI;
  sun.position.set(18, 4 + elev * 36, 14);
}

// 비/눈 파티클(플레이어를 따라다니는 박스)
export class WeatherFX {
  constructor(scene) {
    this.n = 500;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(this.n * 3);
    for (let i = 0; i < this.n; i++) { pos[i * 3] = (Math.random() - 0.5) * 44; pos[i * 3 + 1] = Math.random() * 26; pos[i * 3 + 2] = (Math.random() - 0.5) * 44; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMat = new THREE.PointsMaterial({ color: 0xaccdea, size: 0.14, transparent: true, opacity: 0.7 });
    this.snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.24, transparent: true, opacity: 0.95 });
    this.pts = new THREE.Points(g, this.rainMat); this.pts.visible = false; scene.add(this.pts);
    this.mode = 'clear';
  }
  update(dt, cx, cz, weather) {
    if (weather !== this.mode) {
      this.mode = weather;
      this.pts.visible = weather === 'rain' || weather === 'snow';
      this.pts.material = weather === 'snow' ? this.snowMat : this.rainMat;
    }
    if (!this.pts.visible) return;
    this.pts.position.set(cx, 0, cz);
    const p = this.pts.geometry.attributes.position, speed = weather === 'snow' ? 4 : 22;
    for (let i = 0; i < this.n; i++) {
      let y = p.getY(i) - speed * dt; if (y < 0) y += 26;
      p.setY(i, y);
      if (weather === 'snow') p.setX(i, p.getX(i) + Math.sin((y + i) * 0.5) * dt * 0.6);
    }
    p.needsUpdate = true;
  }
}
