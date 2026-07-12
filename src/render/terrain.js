// 지형 top 렌더: 셀마다 쿼드(램프는 경사) + 고원 볼록코너는 45°로 깎은 폴리곤.
// grass=텍스처, sand/path=단색, water=애니메이션 평면. map→scene 순수 함수.
import * as THREE from 'three';
import { CONFIG, gridToWorld } from '../config.js';
import { convexCorners } from '../map/autotile.js';

const CHAMFER = 0.62;               // 코너 깎는 길이(<TILE/2)
const SAND = new THREE.Color(CONFIG.colors.sand);
const PATH = new THREE.Color(0xc7a86a);

function pushQuad(o, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, col) {
  const s = o.pos.length / 3;
  o.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
  o.uv.push(ax / 4, az / 4, bx / 4, bz / 4, cx / 4, cz / 4, dx / 4, dz / 4);
  for (let i = 0; i < 4; i++) o.col.push(col.r, col.g, col.b);
  o.idx.push(s, s + 2, s + 1, s, s + 3, s + 2); // 위에서 +y 법선
}

// 볼록코너를 깎은 CCW 폴리곤(평면 y)을 부채꼴로. pts 순서 NW→SW→SE→NE.
function pushPoly(o, pts, y, col) {
  let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; }
  cx /= pts.length; cz /= pts.length;
  const base = o.pos.length / 3;
  o.pos.push(cx, y, cz); o.uv.push(cx / 4, cz / 4); o.col.push(col.r, col.g, col.b);
  for (const p of pts) { o.pos.push(p[0], y, p[1]); o.uv.push(p[0] / 4, p[1] / 4); o.col.push(col.r, col.g, col.b); }
  const n = pts.length;
  for (let i = 0; i < n; i++) o.idx.push(base, base + 1 + i, base + 1 + ((i + 1) % n));
}

function chamferPoly(x0, z0, x1, z1, cor, C) {
  const pts = [];
  if (cor.NW) pts.push([x0 + C, z0], [x0, z0 + C]); else pts.push([x0, z0]);
  if (cor.SW) pts.push([x0, z1 - C], [x0 + C, z1]); else pts.push([x0, z1]);
  if (cor.SE) pts.push([x1 - C, z1], [x1, z1 - C]); else pts.push([x1, z1]);
  if (cor.NE) pts.push([x1, z0 + C], [x1 - C, z0]); else pts.push([x1, z0]);
  return pts;
}

function geomFrom(o) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3));
  g.setIndex(o.idx); g.computeVertexNormals();
  return g;
}

export function buildTerrain(map, mats) {
  const group = new THREE.Group();
  const T = CONFIG.TILE, H = CONFIG.LEVEL_H, DROP = CONFIG.WATER_DROP;
  const grass = { pos: [], uv: [], col: [], idx: [] };
  const bare = { pos: [], uv: [], col: [], idx: [] };  // sand + path
  const ewater = { pos: [], uv: [], col: [], idx: [] }; // 고원 위 물(레벨>0)
  const tint = new THREE.Color();
  const WCOL = new THREE.Color(0xffffff);

  for (let gz = 0; gz < map.G; gz++)
    for (let gx = 0; gx < map.G; gx++) {
      const cl = map.cells[gz][gx];
      if (cl.terrain === 'water') {
        if (cl.height > 0) { // 고원 위 물은 셀별 수면 쿼드(레벨0 바다는 sea 평면이 덮음)
          const ctr = gridToWorld(gx, gz);
          const wx0 = ctr.x - T / 2, wx1 = ctr.x + T / 2, wz0 = ctr.z - T / 2, wz1 = ctr.z + T / 2;
          const wy = cl.height * H - DROP;
          pushQuad(ewater, wx0, wy, wz0, wx1, wy, wz0, wx1, wy, wz1, wx0, wy, wz1, WCOL);
        }
        continue;
      }
      const ctr = gridToWorld(gx, gz);
      const x0 = ctr.x - T / 2, x1 = ctr.x + T / 2, z0 = ctr.z - T / 2, z1 = ctr.z + T / 2;

      if (cl.terrain === 'grass') {
        const v = 0.98 + ((gx * 7 + gz * 13) % 3) * 0.012 + cl.height * 0.05;
        tint.setRGB(v, v, v);
        const cor = convexCorners(map, cl);
        if (cor.NW || cor.NE || cor.SW || cor.SE) {
          pushPoly(grass, chamferPoly(x0, z0, x1, z1, cor, CHAMFER), cl.height * H, tint);
        } else if (cl.ramp) {
          // 경사면: rampDir(오르막 방향) 쪽 두 코너=rampTo, 반대쪽 두 코너=rampFrom.
          const hi = cl.rampTo * H, lo = cl.rampFrom * H;
          let yNW, yNE, ySE, ySW; // 코너: NW(x0,z0) NE(x1,z0) SE(x1,z1) SW(x0,z1)
          if (cl.rampDir === 'S') { yNW = yNE = lo; ySE = ySW = hi; }
          else if (cl.rampDir === 'E') { yNW = ySW = lo; yNE = ySE = hi; }
          else if (cl.rampDir === 'W') { yNE = ySE = lo; yNW = ySW = hi; }
          else { yNW = yNE = hi; ySE = ySW = lo; } // 'N'
          pushQuad(grass, x0, yNW, z0, x1, yNE, z0, x1, ySE, z1, x0, ySW, z1, tint);
        } else {
          const y = cl.height * H;
          pushQuad(grass, x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1, tint);
        }
      } else {
        tint.copy(cl.terrain === 'path' ? PATH : SAND);
        pushQuad(bare, x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1, tint);
      }
    }

  const grassMesh = new THREE.Mesh(geomFrom(grass), mats.terrain); grassMesh.receiveShadow = true;
  const bareMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  const bareMesh = new THREE.Mesh(geomFrom(bare), bareMat); bareMesh.receiveShadow = true;
  group.add(grassMesh, bareMesh);
  if (ewater.pos.length) { const ew = new THREE.Mesh(geomFrom(ewater), mats.water); ew.name = 'ewater'; ew.receiveShadow = true; group.add(ew); } // 고원 위 수면

  // 바다(애니메이션용 분할 평면)
  const seaSize = map.G * T + 16;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(seaSize, seaSize, 24, 24), mats.water);
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.28; sea.name = 'sea'; sea.receiveShadow = true;
  group.add(sea);

  return group;
}
