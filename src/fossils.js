// 화석 발굴 지점: 시드로 잔디에 스폰 + 흙더미/X 표시. 삽으로 파면 랜덤 화석.
import * as THREE from 'three';
import { gridToWorld } from './config.js';
import { mulberry32 } from './map/rng.js';

const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1, flatShading: true });
const crackMat = new THREE.MeshStandardMaterial({ color: 0x5c4326, roughness: 1 });

export function spawnFossils(map, count = 4) {
  const rng = mulberry32((map.seed ^ 0x5eed0055) >>> 0);
  const list = [];
  for (let t = 0; t < 500 && list.length < count; t++) {
    const gx = 2 + Math.floor(rng() * (map.G - 4)), gz = 2 + Math.floor(rng() * (map.G - 4));
    const c = map.cell(gx, gz);
    if (!c || c.terrain !== 'grass' || !c.walkable || c.ramp || c.object) continue;
    const w = gridToWorld(gx, gz);
    list.push({ gx, gz, x: w.x, z: w.z });
  }
  return list;
}

export function buildFossils(map, list) {
  const group = new THREE.Group();
  for (const f of list) {
    const g = new THREE.Group();
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), dirtMat);
    mound.scale.y = 0.4; mound.position.y = 0.08; mound.castShadow = true;
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.06), crackMat); c1.position.y = 0.22;
    const c2 = c1.clone(); c2.rotation.y = Math.PI / 2;
    g.add(mound, c1, c2);
    g.position.set(f.x, map.surfaceHeight(f.x, f.z), f.z);
    f.mesh = g;
    group.add(g);
  }
  return group;
}
