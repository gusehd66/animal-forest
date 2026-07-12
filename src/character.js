// 공용 캐릭터 모델(로컬 플레이어 + 원격 플레이어). 발바닥 y=0, 정면 +Z.
// animal-forest 스타일: 다리·몸통·팔(어깨 피벗 스윙)·머리·머리카락·눈·입.
import * as THREE from 'three';

const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, flatShading: false }); // 스무스 셰이딩(동숲풍)
const cyl = (rt, rb, h, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg);
const sph = (r, seg = 16) => new THREE.SphereGeometry(r, seg, Math.max(8, seg - 2));

// 부드러운 원형(블롭) 그림자 — 장난감 같은 접지감. 한 번 만들어 공유.
let _blobTex = null;
function blobTexture() {
  if (_blobTex) return _blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  _blobTex = new THREE.CanvasTexture(c);
  return _blobTex;
}
function blobShadow(r = 0.55) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = -1;
  return m;
}

// app = { body(셔츠), skin(피부/머리), hat(머리카락) }
export function buildCharacter(app = {}) {
  const bodyC = app.body != null ? app.body : 0x7fd8c8;
  const skinC = app.skin != null ? app.skin : 0xffd9b3;
  const hairC = app.hat != null ? app.hat : 0x6b4531;
  const legC = 0x9a7b4f;
  const g = new THREE.Group();

  // 치비 비율: 머리 크고, 몸·팔·다리는 짧고 통통
  const legL = new THREE.Mesh(cyl(0.11, 0.12, 0.18), mat(legC)); legL.position.set(-0.13, 0.1, 0); legL.name = 'legL'; legL.castShadow = true;
  const legR = legL.clone(); legR.position.x = 0.13; legR.name = 'legR';

  const bodyMat = mat(bodyC); // 몸통+팔이 공유 → 색 하나로 갱신
  const body = new THREE.Mesh(cyl(0.28, 0.34, 0.42, 14), bodyMat); body.position.y = 0.42; body.castShadow = true;

  const armGroup = (side) => {
    const grp = new THREE.Group(); grp.position.set(0.32 * side, 0.6, 0);
    const arm = new THREE.Mesh(cyl(0.085, 0.095, 0.3), bodyMat); arm.position.y = -0.14; arm.castShadow = true;
    grp.add(arm); grp.name = side < 0 ? 'armL' : 'armR'; return grp;
  };
  const armL = armGroup(-1), armR = armGroup(1);

  const headMat = mat(skinC);
  const head = new THREE.Mesh(sph(0.44), headMat); head.position.y = 1.02; head.castShadow = true;
  const hairMat = mat(hairC);
  const hair = new THREE.Mesh(sph(0.46), hairMat); hair.position.set(0, 1.12, -0.04); hair.scale.set(1, 0.82, 1);
  const eyeL = new THREE.Mesh(sph(0.055, 10), mat(0x2b2320)); eyeL.position.set(-0.15, 1.06, 0.41); eyeL.scale.set(0.85, 1.15, 0.7);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.15;
  const cheekL = new THREE.Mesh(sph(0.06, 10), mat(0xff9db0)); cheekL.position.set(-0.25, 0.94, 0.35); cheekL.scale.set(1, 0.7, 0.5);
  const cheekR = cheekL.clone(); cheekR.position.x = 0.25;
  const mouth = new THREE.Mesh(sph(0.035, 8), mat(0xc96f5a)); mouth.position.set(0, 0.9, 0.44); mouth.scale.set(1.4, 0.7, 0.7); mouth.name = 'mouth';

  g.add(blobShadow(0.55), legL, legR, body, armL, armR, head, hair, eyeL, eyeR, cheekL, cheekR, mouth);
  g.userData = { legL, legR, armL, armR, body, head, hair, bodyMat, headMat, hairMat, eyeL, eyeR, mouth, blinkT: 2 + Math.random() * 3, blink: 0 };
  return g;
}

// 동물풍 주민 모델(둥근 몸 + 팔·발 + 머리 + 귀 + 주둥이 + 눈·볼 + 꼬리). 발바닥 y=0, 정면 +Z.
export function buildVillager(v) {
  const c = v.color, earC = v.ear != null ? v.ear : v.color;
  const g = new THREE.Group();

  const body = new THREE.Mesh(sph(0.4, 14), mat(c)); body.position.y = 0.46; body.scale.set(1, 1.08, 0.95); body.castShadow = true;
  const footL = new THREE.Mesh(sph(0.12, 8), mat(c)); footL.position.set(-0.17, 0.09, 0.12); footL.scale.set(1, 0.7, 1.3);
  const footR = footL.clone(); footR.position.x = 0.17;
  const armL = new THREE.Mesh(sph(0.11, 8), mat(c)); armL.position.set(-0.38, 0.52, 0.05); armL.name = 'armL';
  const armR = armL.clone(); armR.position.x = 0.38; armR.name = 'armR';

  const head = new THREE.Mesh(sph(0.36, 14), mat(c)); head.position.y = 1.02; head.castShadow = true;
  const earMk = (side) => { const e = new THREE.Mesh(sph(0.14, 10), mat(earC)); e.position.set(0.17 * side, 1.4, -0.02); e.scale.set(0.7, 1.15, 0.6); return e; };
  const earL = earMk(-1), earR = earMk(1);
  const muzzle = new THREE.Mesh(sph(0.16, 10), mat(0xfff2e0)); muzzle.position.set(0, 0.96, 0.28); muzzle.scale.set(1.1, 0.8, 0.7);
  const nose = new THREE.Mesh(sph(0.045, 8), mat(0x5a4636)); nose.position.set(0, 0.99, 0.42);
  const eyeL = new THREE.Mesh(sph(0.05, 8), mat(0x2b2320)); eyeL.position.set(-0.14, 1.08, 0.3);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.14;
  const cheekL = new THREE.Mesh(sph(0.055, 8), mat(0xff9db0)); cheekL.position.set(-0.22, 0.98, 0.24); cheekL.scale.set(1, 0.7, 0.5);
  const cheekR = cheekL.clone(); cheekR.position.x = 0.22;
  const tail = new THREE.Mesh(sph(0.13, 10), mat(earC)); tail.position.set(0, 0.5, -0.4);

  g.add(blobShadow(0.5), body, footL, footR, armL, armR, head, earL, earR, muzzle, nose, eyeL, eyeR, cheekL, cheekR, tail);
  g.userData = { armL, armR, eyeL, eyeR, muzzle, blinkT: 2 + Math.random() * 3, blink: 0 };
  return g;
}

// 외형 색 적용(로컬/원격 공용)
export function applyCharColors(g, app) {
  const u = g && g.userData; if (!u || !app) return;
  if (app.body != null && u.bodyMat) u.bodyMat.color.set(app.body);
  if (app.skin != null && u.headMat) u.headMat.color.set(app.skin);
  if (app.hat != null && u.hairMat) u.hairMat.color.set(app.hat);
}

// 표정 프리셋: 눈 세로배율(sy)·가로배율(sx)·기울기(rz, 좌우 대칭)
const EXPR = {
  neutral: { sx: 1, sy: 1, rz: 0 },
  happy: { sx: 1, sy: 0.35, rz: 0.4 },     // ^^ 웃는 눈
  surprised: { sx: 1.25, sy: 1.4, rz: 0 }, // 놀란 눈
  sad: { sx: 1, sy: 0.8, rz: -0.35 },      // 처진 눈
  angry: { sx: 1, sy: 0.7, rz: 0.55 },     // 치켜뜬 눈
};
// 눈 깜빡임 + 표정. expr = 'neutral'|'happy'|'surprised'|'sad'|'angry'
export function updateFace(g, dt, expr = 'neutral') {
  const u = g && g.userData; if (!u || !u.eyeL) return;
  if (!u._eb) u._eb = [u.eyeL.scale.clone(), u.eyeR.scale.clone()]; // 기준 눈 크기
  u.blinkT -= dt;
  if (u.blinkT <= 0) { u.blink = 0.12; u.blinkT = 2.5 + Math.random() * 3.5; }
  if (u.blink > 0) u.blink -= dt;
  const e = EXPR[expr] || EXPR.neutral;
  const sy = u.blink > 0 ? 0.1 : e.sy;
  u.eyeL.scale.set(u._eb[0].x * e.sx, u._eb[0].y * sy, u._eb[0].z); u.eyeL.rotation.z = e.rz;
  u.eyeR.scale.set(u._eb[1].x * e.sx, u._eb[1].y * sy, u._eb[1].z); u.eyeR.rotation.z = -e.rz;
}
// 하위호환: 깜빡임만(중립 표정)
export function updateBlink(g, dt) { updateFace(g, dt, 'neutral'); }

// 걷기 애니메이션(팔다리 스윙 + 통통 튀는 걸음). phase=누적 위상, amp=이동 중 1.
export function animateWalk(g, phase, amp) {
  const u = g && g.userData; if (!u) return;
  const swing = Math.sin(phase) * 0.55 * amp;
  if (u.armL) u.armL.rotation.x = swing;
  if (u.armR) u.armR.rotation.x = -swing;
  if (u.legL) u.legL.rotation.x = -swing * 0.7;
  if (u.legR) u.legR.rotation.x = swing * 0.7;
  g.position.y = Math.abs(Math.sin(phase)) * 0.06 * amp;
}
