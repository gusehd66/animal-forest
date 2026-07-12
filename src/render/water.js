// 폭포: 고원 위 물(레벨>0) 셀이 더 낮은 이웃과 접한 모서리에서 물이 떨어진다.
// 떨어지는 반투명 물 평면(세로 스트라이프 텍스처 스크롤) + 바닥 물보라(foam).
import * as THREE from 'three';
import { CONFIG, gridToWorld } from '../config.js';

// 세로로 흐르는 물 스트라이프 텍스처(스크롤로 낙하감)
function fallTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(190,230,245,0.55)'; ctx.fillRect(0, 0, 32, 64);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.4})`;
    const x = Math.random() * 30, w = 1.5 + Math.random() * 3;
    ctx.fillRect(x, 0, w, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 물 표면 y(레벨 지면보다 DROP만큼 낮게)
function surfaceY(cell) { return cell.terrain === 'water' ? cell.height * CONFIG.LEVEL_H - CONFIG.WATER_DROP : cell.height * CONFIG.LEVEL_H; }

export function buildWaterfalls(map) {
  const T = CONFIG.TILE, DROP = CONFIG.WATER_DROP;
  const group = new THREE.Group();
  const tex = fallTexture();
  const fallMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  const pos = [], uv = [], idx = [];
  const foamPos = [], foamIdx = [];
  const DIRS = [ // dir: 모서리 두 끝점(a,b) + 바깥 법선(nx,nz)
    { dx: 0, dz: -1, edge: (x0, z0, x1, z1) => ({ ax: x0, az: z0, bx: x1, bz: z0 }), nx: 0, nz: -1 }, // N
    { dx: 1, dz: 0, edge: (x0, z0, x1, z1) => ({ ax: x1, az: z0, bx: x1, bz: z1 }), nx: 1, nz: 0 },  // E
    { dx: 0, dz: 1, edge: (x0, z0, x1, z1) => ({ ax: x1, az: z1, bx: x0, bz: z1 }), nx: 0, nz: 1 },  // S
    { dx: -1, dz: 0, edge: (x0, z0, x1, z1) => ({ ax: x0, az: z1, bx: x0, bz: z0 }), nx: -1, nz: 0 }, // W
  ];

  for (let gz = 0; gz < map.G; gz++)
    for (let gx = 0; gx < map.G; gx++) {
      const cl = map.cells[gz][gx];
      if (cl.terrain !== 'water' || cl.height <= 0) continue;
      const top = surfaceY(cl);
      const ctr = gridToWorld(gx, gz);
      const x0 = ctr.x - T / 2, x1 = ctr.x + T / 2, z0 = ctr.z - T / 2, z1 = ctr.z + T / 2;
      for (const d of DIRS) {
        const nb = map.cell(gx + d.dx, gz + d.dz);
        const base = nb ? surfaceY(nb) : -DROP;      // 맵 밖 = 바다 수면
        if (base >= top - 0.05) continue;             // 낮은 쪽만 폭포
        const e = d.edge(x0, z0, x1, z1);
        const ox = d.nx * 0.06, oz = d.nz * 0.06;     // 절벽면에서 살짝 바깥으로
        const b = pos.length / 3, h = (top - base) / T; // uv v 스케일(타일링)
        pos.push(e.ax + ox, top, e.az + oz, e.bx + ox, top, e.bz + oz, e.bx + ox, base, e.bz + oz, e.ax + ox, base, e.az + oz);
        uv.push(0, h, 1, h, 1, 0, 0, 0);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        // 바닥 물보라(수평 반투명 흰 쿼드)
        const fb = foamPos.length / 3, fo = 0.5;
        foamPos.push(e.ax, base + 0.03, e.az, e.bx, base + 0.03, e.bz, e.bx + d.nx * fo, base + 0.03, e.bz + d.nz * fo, e.ax + d.nx * fo, base + 0.03, e.az + d.nz * fo);
        foamIdx.push(fb, fb + 1, fb + 2, fb, fb + 2, fb + 3);
      }
    }

  if (pos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    group.add(new THREE.Mesh(g, fallMat));
  }
  if (foamPos.length) {
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(foamPos, 3));
    fg.setIndex(foamIdx);
    const fm = new THREE.Mesh(fg, foamMat); fm.renderOrder = 2; group.add(fm);
  }
  group.userData.tex = tex; // 애니메이션(스크롤)용
  return group;
}
