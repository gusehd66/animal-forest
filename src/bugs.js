// 곤충: 시드로 잔디에 스폰 + 저폴리 렌더 + 호버 애니. 근처서 Space로 채집.
import * as THREE from 'three';
import { gridToWorld } from './config.js';
import { BUGS } from './data/content.js';
import { mulberry32 } from './map/rng.js';

const COLOR = { butterfly: 0xffe14d, beetle: 0x5a7d3c, ladybug: 0xe23b3b, dragonfly: 0x67d0e0, mantis: 0x6fbf5a };

export function spawnBugs(map, count = 5) {
  const rng = mulberry32((map.seed ^ 0x1234abcd) >>> 0);
  const list = [];
  for (let t = 0; t < 500 && list.length < count; t++) {
    const gx = 2 + Math.floor(rng() * (map.G - 4)), gz = 2 + Math.floor(rng() * (map.G - 4));
    const c = map.cell(gx, gz);
    if (!c || c.terrain !== 'grass' || !c.walkable || c.ramp) continue;
    const sp = BUGS[Math.floor(rng() * BUGS.length)];
    const w = gridToWorld(gx, gz);
    list.push({ id: sp.id, x: w.x, z: w.z, idx: list.length });
  }
  return list;
}

export function buildBugs(map, list) {
  const group = new THREE.Group();
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (const b of list) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0),
      new THREE.MeshStandardMaterial({ color: COLOR[b.id] || 0xffffff, roughness: 1, flatShading: true }));
    const w1 = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), wingMat); w1.position.x = 0.12; w1.rotation.y = Math.PI / 2;
    const w2 = w1.clone(); w2.position.x = -0.12;
    g.add(body, w1, w2);
    b.baseY = map.surfaceHeight(b.x, b.z) + 0.7;
    g.position.set(b.x, b.baseY, b.z);
    b.mesh = g;
    group.add(g);
  }
  return group;
}

export function updateBugs(list, t, dt) {
  for (const b of list) {
    if (!b.mesh) continue;
    b.mesh.position.y = b.baseY + Math.sin(t * 3 + b.x) * 0.12;
    b.mesh.rotation.y += dt * 1.6;
  }
}
