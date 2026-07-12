// 배치 가구 저폴리 메시 + 배치 미리보기(고스트).
import * as THREE from 'three';
import { designTexture } from './design.js';

const M = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: false, ...(o || {}) });
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; return b; };
const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 12) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.position.set(x, y, z); c.castShadow = true; return c; };
const sph = (r, m, x = 0, y = 0, z = 0, seg = 14) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg - 2), m); s.position.set(x, y, z); s.castShadow = true; return s; };

function chair() {
  const g = new THREE.Group(), w = M(0xc98a52);
  g.add(box(0.6, 0.12, 0.6, w, 0, 0.5, 0), box(0.6, 0.55, 0.12, w, 0, 0.8, -0.24));
  for (const [x, z] of [[0.24, 0.24], [-0.24, 0.24], [0.24, -0.24], [-0.24, -0.24]]) g.add(box(0.09, 0.5, 0.09, w, x, 0.25, z));
  return g;
}
function table() {
  const g = new THREE.Group(), w = M(0xb07a45);
  g.add(box(1.0, 0.14, 1.0, w, 0, 0.78, 0));
  for (const [x, z] of [[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]]) g.add(box(0.1, 0.72, 0.1, w, x, 0.36, z));
  return g;
}
function lamp() {
  const g = new THREE.Group();
  g.add(box(0.16, 1.5, 0.16, M(0x6b6b6b), 0, 0.75, 0));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), M(0xfff2b0, { emissive: 0xffd24d, emissiveIntensity: 0.8 }));
  bulb.position.y = 1.6; g.add(bulb);
  return g;
}
function campfire() {
  const g = new THREE.Group(), w = M(0x8a5a34);
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 5), w); l.rotation.z = Math.PI / 2; l.rotation.y = i * 0.8; l.position.y = 0.1; g.add(l); }
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 6), M(0xff7a2a, { emissive: 0xff5a1a, emissiveIntensity: 0.9 }));
  fire.position.y = 0.5; g.add(fire);
  return g;
}
function fence() {
  const g = new THREE.Group(), w = M(0xcaa06a);
  g.add(box(0.12, 0.7, 0.12, w, -0.4, 0.35, 0), box(0.12, 0.7, 0.12, w, 0.4, 0.35, 0),
    box(0.95, 0.1, 0.08, w, 0, 0.5, 0), box(0.95, 0.1, 0.08, w, 0, 0.28, 0));
  return g;
}

function chest() {
  const g = new THREE.Group();
  g.add(box(0.8, 0.5, 0.6, M(0xb07a45), 0, 0.28, 0));
  g.add(box(0.86, 0.16, 0.66, M(0xd9a05a), 0, 0.56, 0));
  g.add(box(0.1, 0.24, 0.1, M(0xffe08a), 0, 0.36, 0.32));
  return g;
}

function flag(design) {
  const g = new THREE.Group();
  g.add(box(0.1, 1.6, 0.1, M(0x9c6b3f), 0, 0.8, 0)); // 깃대
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshStandardMaterial({ map: designTexture(design), roughness: 1, side: THREE.DoubleSide }));
  board.position.set(0.5, 1.15, 0); board.castShadow = true;
  g.add(board);
  return g;
}

function bench() {
  const g = new THREE.Group(), w = M(0xc08a4e);
  g.add(box(1.3, 0.12, 0.5, w, 0, 0.45, 0), box(1.3, 0.5, 0.1, w, 0, 0.7, -0.2));
  for (const x of [0.55, -0.55]) { g.add(box(0.1, 0.45, 0.1, w, x, 0.22, 0.18), box(0.1, 0.45, 0.1, w, x, 0.22, -0.18)); }
  return g;
}
function well() {
  const g = new THREE.Group();
  g.add(cyl(0.5, 0.55, 0.7, M(0x9aa0a6), 0, 0.35, 0), cyl(0.45, 0.45, 0.15, M(0x49a6d6, { roughness: 0.4 }), 0, 0.62, 0));
  for (const x of [0.42, -0.42]) g.add(box(0.09, 1.0, 0.09, M(0x8a5a34), x, 1.0, 0));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.4, 4), M(0xc0603a)); roof.position.y = 1.65; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  return g;
}
function bush() {
  const g = new THREE.Group(), l = M(0x4c9e4f), l2 = M(0x5fbd4a);
  g.add(sph(0.42, l, 0, 0.35, 0), sph(0.3, l2, 0.3, 0.3, 0.1), sph(0.28, l, -0.28, 0.32, -0.05));
  return g;
}
function bed() {
  const g = new THREE.Group();
  g.add(box(1.0, 0.3, 1.7, M(0x9c6b3f), 0, 0.2, 0), box(1.0, 0.22, 1.5, M(0xffe9ef), 0, 0.42, 0.05));
  g.add(box(1.0, 0.5, 0.14, M(0x9c6b3f), 0, 0.4, -0.85), box(0.7, 0.18, 0.4, M(0xfff6fb), 0, 0.55, -0.55));
  return g;
}
function sofa() {
  const g = new THREE.Group();
  const col = M(0x6b8fd6);
  g.add(box(1.4, 0.35, 0.7, col, 0, 0.3, 0), box(1.4, 0.5, 0.18, col, 0, 0.6, -0.26));
  for (const x of [0.68, -0.68]) g.add(box(0.16, 0.45, 0.7, col, x, 0.45, 0));
  return g;
}
function bookshelf() {
  const g = new THREE.Group(), w = M(0x8a5a34);
  g.add(box(1.0, 1.6, 0.35, w, 0, 0.8, 0));
  const books = [0xd85a5a, 0x5ab0d8, 0xf0c04a, 0x6bbf59, 0xb07ad8];
  for (let s = 0; s < 3; s++) for (let i = 0; i < 4; i++) g.add(box(0.16, 0.32, 0.24, M(books[(s * 4 + i) % books.length]), -0.36 + i * 0.24, 0.45 + s * 0.5, 0.04));
  return g;
}
function tv() {
  const g = new THREE.Group();
  g.add(box(1.2, 0.1, 0.5, M(0x6b5540), 0, 0.4, 0)); // 받침
  for (const x of [0.5, -0.5]) g.add(box(0.1, 0.4, 0.1, M(0x6b5540), x, 0.2, 0));
  g.add(box(1.1, 0.7, 0.1, M(0x222222), 0, 0.9, 0), box(0.98, 0.58, 0.04, M(0x6fd0ff, { emissive: 0x3a8fd0, emissiveIntensity: 0.6 }), 0, 0.9, 0.06));
  return g;
}
function rug() { // 평평한 러그(비고체)
  const g = new THREE.Group();
  const r = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), M(0xe0668a, { side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = 0.02; g.add(r);
  const r2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.66), M(0xffd8e4, { side: THREE.DoubleSide })); r2.rotation.x = -Math.PI / 2; r2.position.y = 0.03; g.add(r2);
  return g;
}
function pottedplant() {
  const g = new THREE.Group();
  g.add(cyl(0.28, 0.22, 0.35, M(0xd08a5a), 0, 0.18, 0));
  g.add(sph(0.34, M(0x4c9e4f), 0, 0.6, 0), sph(0.24, M(0x5fbd4a), 0.2, 0.75, 0.05));
  return g;
}
function clock() {
  const g = new THREE.Group();
  g.add(box(0.5, 1.4, 0.3, M(0x8a5a34), 0, 0.7, 0));
  g.add(cyl(0.2, 0.2, 0.06, M(0xfff6e0), 0, 1.15, 0.16).rotateX(Math.PI / 2));
  return g;
}
function barrel() {
  const g = new THREE.Group(), w = M(0xb07a45), r = M(0x6b6b6b);
  g.add(cyl(0.34, 0.34, 0.8, w, 0, 0.4, 0), cyl(0.36, 0.36, 0.06, r, 0, 0.6, 0), cyl(0.36, 0.36, 0.06, r, 0, 0.2, 0));
  return g;
}
function stool() {
  const g = new THREE.Group(), w = M(0xc98a52);
  g.add(cyl(0.28, 0.28, 0.1, w, 0, 0.5, 0));
  for (const [x, z] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]]) g.add(box(0.07, 0.5, 0.07, w, x, 0.25, z));
  return g;
}
function easel() {
  const g = new THREE.Group(), w = M(0x8a5a34);
  g.add(box(0.7, 0.9, 0.06, M(0xf5f0e0), 0, 0.9, 0)); // 캔버스
  g.add(box(0.08, 1.5, 0.08, w, 0, 0.75, -0.1).rotateX(0.15));
  for (const x of [0.28, -0.28]) g.add(box(0.07, 1.4, 0.07, w, x, 0.7, 0.05).rotateZ(x > 0 ? -0.15 : 0.15));
  return g;
}
function streetlamp() {
  const g = new THREE.Group();
  g.add(cyl(0.09, 0.12, 2.0, M(0x44484d), 0, 1.0, 0));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), M(0xfff2b0, { emissive: 0xffd24d, emissiveIntensity: 0.9 })); head.position.y = 2.05; g.add(head);
  return g;
}

const BUILDERS = { chair, table, lamp, campfire, fence, chest, bench, well, bush, bed, sofa, bookshelf, tv, rug, pottedplant, clock, barrel, stool, easel, streetlamp };

export function buildFurniture(id, design) {
  if (id === 'flag') return flag(design);
  return (BUILDERS[id] || chair)();
}

export function makeGhost(id, design) {
  const g = buildFurniture(id, design);
  g.traverse(o => {
    if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; o.material.emissive && o.material.emissive.setHex(0x000000); }
    o.castShadow = false;
  });
  return g;
}
