// 픽셀 디자인: 16x16 팔레트 인덱스 배열 → 캔버스 텍스처.
import * as THREE from 'three';

export const DESIGN_N = 16;
// 인덱스 0 = 빈칸(흰색). 1~ = 색.
export const PIXEL_PALETTE = [null, 0xff6b8a, 0xffd93b, 0x6cc3e0, 0x84c65a, 0xa66bff, 0xff9f43, 0x2b2b2b, 0xffffff];

export function emptyDesign() { return new Array(DESIGN_N * DESIGN_N).fill(0); }

export function designTexture(design) {
  const c = document.createElement('canvas'); c.width = c.height = DESIGN_N;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, DESIGN_N, DESIGN_N);
  const d = design || emptyDesign();
  for (let i = 0; i < d.length; i++) {
    const p = PIXEL_PALETTE[d[i]];
    if (p == null) continue;
    ctx.fillStyle = '#' + p.toString(16).padStart(6, '0');
    ctx.fillRect(i % DESIGN_N, Math.floor(i / DESIGN_N), 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
