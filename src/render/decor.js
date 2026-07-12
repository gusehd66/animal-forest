// 바닥 장식: 잔디 셀에 시드로 풀 tufts + 가끔 들꽃을 흩뿌린다(merged 1메시, 밀도↑).
import * as THREE from 'three';
import { CONFIG, gridToWorld } from '../config.js';
import { mulberry32 } from '../map/rng.js';

const FLOWER_TINT = [0xff8fb0, 0xffe27a, 0xffffff, 0xc9a6ff]; // 가끔 섞이는 들꽃 색

export function buildDecor(map) {
  const rng = mulberry32((map.seed ^ 0xdec0de) >>> 0);
  const T = CONFIG.TILE, H = CONFIG.LEVEL_H;
  const pos = [], col = [];
  const c = new THREE.Color();
  const addBlade = (x, z, y, ang, h, w, color) => {
    const px = Math.cos(ang + Math.PI / 2) * w, pz = Math.sin(ang + Math.PI / 2) * w;
    const lx = Math.cos(ang) * w * 1.1, lz = Math.sin(ang) * w * 1.1;
    pos.push(x - px, y, z - pz, x + px, y, z + pz, x + lx, y + h, z + lz);
    for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b);
  };
  for (let gz = 0; gz < map.G; gz++)
    for (let gx = 0; gx < map.G; gx++) {
      const cl = map.cell(gx, gz);
      if (!cl || cl.terrain !== 'grass' || cl.ramp) continue;
      const ctr = gridToWorld(gx, gz), yy = cl.height * H;
      const tufts = 2 + (rng() * 3 | 0);
      for (let t = 0; t < tufts; t++) {
        const jx = ctr.x + (rng() - 0.5) * 1.7, jz = ctr.z + (rng() - 0.5) * 1.7;
        const ang = rng() * 6.28;
        if (rng() < 0.07) { // 들꽃: 색 있고 조금 더 큼
          c.set(FLOWER_TINT[rng() * FLOWER_TINT.length | 0]);
          for (let b = 0; b < 4; b++) addBlade(jx, jz, yy, ang + b * 1.57, 0.24 + rng() * 0.08, 0.055, c);
        } else { // 풀 tuft: 초록 3갈래
          c.setHSL(0.27 + rng() * 0.04, 0.5, 0.3 + rng() * 0.12);
          const h = 0.16 + rng() * 0.12;
          for (let b = 0; b < 3; b++) addBlade(jx, jz, yy, ang + b * 2.1, h, 0.05, c);
        }
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, flatShading: false });
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.name = 'decor';
  const group = new THREE.Group(); group.add(mesh);
  return group;
}
