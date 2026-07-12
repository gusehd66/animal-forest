// 해변 채집물: 시드로 모래(sand) 셀에 조개/불가사리 스폰. 주우면 판매 아이템.
import * as THREE from 'three';
import { gridToWorld } from './config.js';
import { mulberry32 } from './map/rng.js';

const shellMat = new THREE.MeshStandardMaterial({ color: 0xffd9e0, roughness: 0.7, flatShading: true });
const shellMat2 = new THREE.MeshStandardMaterial({ color: 0xffe8c0, roughness: 0.7, flatShading: true });
const starMat = new THREE.MeshStandardMaterial({ color: 0xff8a5a, roughness: 0.8, flatShading: true });

export function spawnShells(map, count = 8) {
  const rng = mulberry32((map.seed ^ 0x5ea5be11) >>> 0);
  const list = [];
  for (let t = 0; t < 800 && list.length < count; t++) {
    const gx = 1 + Math.floor(rng() * (map.G - 2)), gz = 1 + Math.floor(rng() * (map.G - 2));
    const c = map.cell(gx, gz);
    if (!c || c.terrain !== 'sand' || !c.walkable || c.object || c.placed) continue;
    if (list.some((s) => s.gx === gx && s.gz === gz)) continue;
    const w = gridToWorld(gx, gz);
    const kind = rng() < 0.35 ? 'starfish' : 'shell';
    list.push({ gx, gz, x: w.x, z: w.z, kind });
  }
  return list;
}

function shellMesh(kind, r) {
  const g = new THREE.Group();
  if (kind === 'starfish') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.16, 0.06, 5), starMat);
    body.rotation.x = Math.PI; body.position.y = 0.03; body.castShadow = true; g.add(body);
  } else {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), r < 0.5 ? shellMat : shellMat2);
    shell.position.y = 0.02; shell.castShadow = true;
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.18), r < 0.5 ? shellMat : shellMat2); ridge.position.y = 0.05;
    g.add(shell, ridge);
  }
  return g;
}

export function buildShells(map, list) {
  const group = new THREE.Group();
  const rng = mulberry32((map.seed ^ 0x1234) >>> 0);
  for (const s of list) {
    const g = shellMesh(s.kind, rng());
    g.rotation.y = rng() * 6.28;
    g.position.set(s.x, map.surfaceHeight(s.x, s.z), s.z);
    s.mesh = g;
    group.add(g);
  }
  return group;
}
