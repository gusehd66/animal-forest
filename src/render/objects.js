// 오브젝트 렌더: 저폴리 나무/돌/꽃/풀. map.objects → THREE.Group.
import * as THREE from 'three';
import { gridToWorld } from '../config.js';

const M = {
  trunk: new THREE.MeshStandardMaterial({ color: 0x9c6b3f, roughness: 0.9, flatShading: false }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4fa83e, roughness: 0.85, flatShading: false }),
  leaf2: new THREE.MeshStandardMaterial({ color: 0x5fbd4a, roughness: 0.85, flatShading: false }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.9, flatShading: false }),
  stem: new THREE.MeshStandardMaterial({ color: 0x3f9a4a, roughness: 0.85, flatShading: false }),
};
const FLOWER = [0xff6b8a, 0xffd93b, 0xff9f43, 0xa66bff, 0xffffff].map(c =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: false }));
const sph = (r, seg = 16) => new THREE.SphereGeometry(r, seg, Math.max(10, seg - 2));

// 계절에 따라 나뭇잎 색 변경(모든 나무 공용 재질)
export function setFoliageColor(hex) {
  M.leaf.color.setHex(hex);
  M.leaf2.color.setHex(hex).offsetHSL(0, 0, 0.06);
}

function tree(v) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.95, 12), M.trunk); trunk.position.y = 0.47; trunk.castShadow = true;
  // 둥글고 풍성한 캐노피(부드러운 구 여러 개 겹침 — 동숲 막대사탕형)
  const main = new THREE.Mesh(sph(0.78), M.leaf); main.position.y = 1.42; main.scale.set(1, 0.9, 1); main.castShadow = true;
  const pa = new THREE.Mesh(sph(0.52), M.leaf2); pa.position.set(0.5, 1.55, 0.05); pa.castShadow = true;
  const pb = new THREE.Mesh(sph(0.5), M.leaf); pb.position.set(-0.46, 1.5, -0.1); pb.castShadow = true;
  const pc = new THREE.Mesh(sph(0.46), M.leaf2); pc.position.set(0.08, 1.98, -0.05);
  g.add(trunk, main, pa, pb, pc);
  g.rotation.y = v * 6.28; g.scale.setScalar(0.92 + v * 0.28);
  return g;
}
function stone(v) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), M.stone); // 둥근 바위
  m.position.y = 0.28; m.rotation.set(v * 3, v * 6, v * 2); m.scale.set(1 + v * 0.4, 0.82 + v * 0.3, 1 + v * 0.3);
  m.castShadow = true; return m;
}
function flower(hue, v) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 4), M.stem); stem.position.y = 0.17;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), FLOWER[hue % 5]); head.position.y = 0.38;
  g.add(stem, head); g.rotation.y = v * 6.28; return g;
}
function tuft(v) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), M.stem);
    b.position.set((i - 1) * 0.09, 0.15, (v - 0.5) * 0.1); b.rotation.z = (i - 1) * 0.2;
    g.add(b);
  }
  g.rotation.y = v * 6.28; return g;
}

export function buildObjects(map, list) {
  const group = new THREE.Group();
  for (const o of list) {
    let mesh;
    if (o.type === 'tree') mesh = tree(o.v);
    else if (o.type === 'stone') mesh = stone(o.v);
    else if (o.type === 'flower') mesh = flower(o.hue, o.v);
    else if (o.type === 'tuft') mesh = tuft(o.v);
    else continue;
    const w = gridToWorld(o.gx, o.gz);
    mesh.position.set(w.x, map.surfaceHeight(w.x, w.z), w.z);
    mesh.userData.shake = 0;
    o.mesh = mesh;           // 채집 시 제거/흔들기용 참조
    group.add(mesh);
  }
  return group;
}
