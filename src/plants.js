// 원예: 꽃씨/묘목이 날짜가 지나며 성장. 꽃=수확 시 사라짐, 나무=다 자라면 과일 채집(유지).
import * as THREE from 'three';

const green = new THREE.MeshStandardMaterial({ color: 0x4fa83e, roughness: 0.85, flatShading: false });
const green2 = new THREE.MeshStandardMaterial({ color: 0x3f9a34, roughness: 0.85, flatShading: false });
const trunk = new THREE.MeshStandardMaterial({ color: 0x9c6b3f, roughness: 0.9, flatShading: false });

export const PLANT_MAX = 2; // 0=새싹 1=중간 2=완성
export const FLOWER_COLORS = [0xff6b8a, 0xff4d4d, 0xffd24d, 0xffffff, 0x9d7bff, 0xff9a4d, 0x5ab0ff]; // 분홍/빨강/노랑/흰/보라/주황/파랑
const flowerMats = new Map();
function flowerMat(color) { if (!flowerMats.has(color)) flowerMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })); return flowerMats.get(color); }

function flowerMesh(stage, color = 0xff6b8a) {
  const g = new THREE.Group();
  if (stage <= 0) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 4), green); s.position.y = 0.13; g.add(s); }
  else if (stage === 1) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 4), green); st.position.y = 0.2; const bud = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), green); bud.position.y = 0.44; g.add(st, bud); }
  else { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 4), green); st.position.y = 0.21; const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), flowerMat(color)); fl.position.y = 0.52; g.add(st, fl); }
  return g;
}
function treeMesh(stage) {
  const g = new THREE.Group();
  if (stage <= 0) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 5), green); s.position.y = 0.18; s.castShadow = true; g.add(s); }
  else if (stage === 1) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.6, 6), trunk); t.position.y = 0.3;
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), green); f.position.y = 0.85; f.castShadow = true; g.add(t, f);
  } else {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.95, 12), trunk); t.position.y = 0.47; t.castShadow = true;
    const main = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 14), green); main.position.y = 1.42; main.scale.set(1, 0.9, 1); main.castShadow = true;
    const pa = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), green2); pa.position.set(0.5, 1.55, 0.05); pa.castShadow = true;
    const pb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 12), green); pb.position.set(-0.46, 1.5, -0.1);
    const pc = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), green2); pc.position.set(0.08, 1.98, -0.05);
    g.add(t, main, pa, pb, pc);
  }
  return g;
}

export function buildPlantMesh(stage, kind, color) { return kind === 'tree' ? treeMesh(stage) : flowerMesh(stage, color); }
