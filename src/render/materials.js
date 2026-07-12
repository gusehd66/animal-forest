// 저폴리/귀여운 톤을 위한 재질·텍스처 팩토리. 캔버스로 가볍게 생성.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

function noiseCanvas(base, spots, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  for (const s of spots) {
    ctx.fillStyle = s.color;
    for (let i = 0; i < s.n; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = s.r * (0.5 + Math.random());
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 잔디: 밝은 초록 + 옅은 점무늬
export function grassTexture() {
  return noiseCanvas('#84c65a', [
    { color: 'rgba(120,190,90,0.6)', n: 60, r: 2.2 },
    { color: 'rgba(180,215,120,0.5)', n: 30, r: 1.6 },
  ]);
}

// 절벽: 따뜻한 황토 + 세로 결(컬럼) + 가로 밴딩
export function cliffTexture() {
  const w = 64, h = 64;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#d8b585'); g.addColorStop(1, '#b98a5e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 세로 결
  for (let x = 0; x < w; x += 8) {
    ctx.fillStyle = 'rgba(120,85,55,0.18)'; ctx.fillRect(x, 0, 2, h);
    ctx.fillStyle = 'rgba(255,235,200,0.12)'; ctx.fillRect(x + 3, 0, 1, h);
  }
  // 가로 밴딩
  for (let y = 12; y < h; y += 18) { ctx.fillStyle = 'rgba(120,85,55,0.15)'; ctx.fillRect(0, y, w, 2); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// 바닥 접지 그림자(AO): 가로 그라데이션(검정→투명)
export function aoTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 1;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.32)'); g.addColorStop(0.5, 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 1);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function makeMaterials() {
  // 바닥: 절차적 텍스처를 먼저 넣고, textures/grass.png 가 있으면 교체(기존 프로젝트 타일).
  const terrainMat = new THREE.MeshStandardMaterial({ map: grassTexture(), vertexColors: true, roughness: 1, flatShading: true });
  new THREE.TextureLoader().load('textures/grass.png',
    (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; terrainMat.map = t; terrainMat.needsUpdate = true; },
    undefined, () => {});

  return {
    terrain: terrainMat,
    cliff: new THREE.MeshStandardMaterial({ map: cliffTexture(), roughness: 1, side: THREE.DoubleSide }),
    lip: new THREE.MeshStandardMaterial({ color: CONFIG.colors.lip, roughness: 1, side: THREE.DoubleSide }),
    ao: new THREE.MeshBasicMaterial({ map: aoTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ color: CONFIG.colors.water, roughness: 0.4, transparent: true, opacity: 0.85 }),
  };
}
