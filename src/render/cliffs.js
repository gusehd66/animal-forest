// 절벽 렌더: 직선 옆면 + 볼록코너 45° 대각면. 각 면에 둥근 잔디 립 + 바닥 AO.
// 코너에서 직선 벽은 짧아지고 대각 벽이 그 사이를 잇는다(동숲풍 둥근 모서리).
import * as THREE from 'three';
import { CONFIG, gridToWorld } from '../config.js';
import { cliffFaces, convexCorners } from '../map/autotile.js';

const BULGE = 0.14, AO_W = 0.9, C = 0.62, S2 = Math.SQRT1_2;
const LIP = [[-0.12, 0.0], [0.05, -0.02], [0.22, 0.06], [0.30, 0.18], [0.24, 0.34]];

function pushWall(o, ax, az, bx, bz, y0, y1, nx, nz) {
  const rows = 3, base = o.pos.length / 3, len = Math.hypot(bx - ax, bz - az);
  for (let r = 0; r <= rows; r++) {
    const t = r / rows, y = y0 + t * (y1 - y0), bl = Math.sin(t * Math.PI) * BULGE;
    o.pos.push(ax + nx * bl, y, az + nz * bl, bx + nx * bl, y, bz + nz * bl);
    o.uv.push(0, t, len / CONFIG.TILE, t);
  }
  for (let r = 0; r < rows; r++) { const a = base + r * 2; o.idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
}
function pushLip(o, ax, az, bx, bz, y1, nx, nz) {
  const base = o.pos.length / 3;
  for (const [off, dh] of LIP) o.pos.push(ax + nx * off, y1 - dh, az + nz * off, bx + nx * off, y1 - dh, bz + nz * off);
  for (let k = 0; k < LIP.length - 1; k++) { const a = base + k * 2; o.idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
}
function pushAO(o, ax, az, bx, bz, ybase, nx, nz) {
  const base = o.pos.length / 3, ay = ybase + 0.02;
  o.pos.push(ax, ay, az, bx, ay, bz, bx + nx * AO_W, ay, bz + nz * AO_W, ax + nx * AO_W, ay, az + nz * AO_W);
  o.uv.push(0, 0, 0, 1, 1, 1, 1, 0);
  o.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function edgeOf(x0, z0, x1, z1, dir) {
  switch (dir) {
    case 0: return { ax: x0, az: z0, bx: x1, bz: z0, nx: 0, nz: -1 }; // N
    case 1: return { ax: x1, az: z0, bx: x1, bz: z1, nx: 1, nz: 0 };  // E
    case 2: return { ax: x1, az: z1, bx: x0, bz: z1, nx: 0, nz: 1 };  // S
    case 3: return { ax: x0, az: z1, bx: x0, bz: z0, nx: -1, nz: 0 }; // W
  }
}

function geom(o, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
  g.setIndex(o.idx); g.computeVertexNormals();
  return g;
}

export function buildCliffs(map, mats) {
  const group = new THREE.Group();
  const T = CONFIG.TILE, H = CONFIG.LEVEL_H;
  const wall = { pos: [], uv: [], idx: [] }, lip = { pos: [], idx: [] }, ao = { pos: [], uv: [], idx: [] };
  const one = (ax, az, bx, bz, y0, y1, nx, nz) => {
    if (Math.hypot(bx - ax, bz - az) < 0.06) return;
    pushWall(wall, ax, az, bx, bz, y0, y1, nx, nz);
    pushLip(lip, ax, az, bx, bz, y1, nx, nz);
    pushAO(ao, ax, az, bx, bz, y0, nx, nz);
  };

  for (let gz = 0; gz < map.G; gz++)
    for (let gx = 0; gx < map.G; gx++) {
      const cl = map.cells[gz][gx];
      const faces = cliffFaces(map, cl);
      if (!faces.length) continue;
      const ctr = gridToWorld(gx, gz);
      const x0 = ctr.x - T / 2, x1 = ctr.x + T / 2, z0 = ctr.z - T / 2, z1 = ctr.z + T / 2;
      const cor = convexCorners(map, cl);
      const yTop = cl.height * H;

      // 직선 옆면(코너에서 짧게)
      for (const f of faces) {
        const e = edgeOf(x0, z0, x1, z1, f.dir);
        if (f.dir === 0) { if (cor.NW) e.ax += C; if (cor.NE) e.bx -= C; }
        else if (f.dir === 1) { if (cor.NE) e.az += C; if (cor.SE) e.bz -= C; }
        else if (f.dir === 2) { if (cor.SE) e.ax -= C; if (cor.SW) e.bx += C; }
        else { if (cor.SW) e.az -= C; if (cor.NW) e.bz += C; }
        one(e.ax, e.az, e.bx, e.bz, f.to * H, yTop, e.nx, e.nz);
      }

      // 45° 대각 코너
      if (cor.NW) one(x0 + C, z0, x0, z0 + C, Math.min(cor.toN, cor.toW) * H, yTop, -S2, -S2);
      if (cor.NE) one(x1 - C, z0, x1, z0 + C, Math.min(cor.toN, cor.toE) * H, yTop, S2, -S2);
      if (cor.SE) one(x1, z1 - C, x1 - C, z1, Math.min(cor.toS, cor.toE) * H, yTop, S2, S2);
      if (cor.SW) one(x0, z1 - C, x0 + C, z1, Math.min(cor.toS, cor.toW) * H, yTop, -S2, S2);
    }

  const wallMesh = new THREE.Mesh(geom(wall, true), mats.cliff); wallMesh.castShadow = wallMesh.receiveShadow = true;
  const lipMesh = new THREE.Mesh(geom(lip, false), mats.lip); lipMesh.castShadow = true;
  const aoMesh = new THREE.Mesh(geom(ao, true), mats.ao); aoMesh.renderOrder = 1;
  group.add(wallMesh, lipMesh, aoMesh);
  return group;
}
