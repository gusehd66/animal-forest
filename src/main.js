// 부트스트랩: renderer/scene/lights/loop + 맵·지형·플레이어·카메라 조립.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { GameMap } from './map/mapData.js';
import { makeMaterials } from './render/materials.js';
import { buildTerrain } from './render/terrain.js';
import { buildCliffs } from './render/cliffs.js';
import { buildWaterfalls } from './render/water.js';
import { buildDecor } from './render/decor.js';
import { placeObjects } from './map/placement.js';
import { buildObjects, setFoliageColor } from './render/objects.js';
import { GameClock, applySky, WeatherFX, clockText, SEASON_COLORS } from './time.js';
import { WeatherEvents } from './weatherEvents.js';
import { loadSave, writeSave } from './save.js';
import { Player } from './player.js';
import { NPC } from './npc.js';
import { buildVillager, updateFace } from './character.js';
import { Inventory } from './inventory.js';
import { FollowCamera } from './camera.js';
import { createInput } from './input.js';
import { gridToWorld } from './config.js';
import { availableFish, pickWeighted, priceOf, randomFossil, RECIPES, FISH, BUGS, FOSSILS } from './data/content.js';
import { spawnBugs, buildBugs, updateBugs } from './bugs.js';
import { spawnFossils, buildFossils } from './fossils.js';
import { spawnShells, buildShells } from './shells.js';
import { ShopPanel, LogPanel, CraftPanel, MuseumPanel, StoragePanel, NpcPanel, CustomizePanel, DesignPanel, MailPanel, InventoryPanel } from './panels.js';
import { emptyDesign } from './design.js';
import { VILLAGERS, VILLAGER_IDS, villagerById, dialogueLine, requestLine, thankLine, giftReaction, REQUEST_POOL } from './data/villagers.js';
import { buildFurniture, makeGhost } from './furniture.js';
import { buildPlantMesh, PLANT_MAX, FLOWER_COLORS } from './plants.js';
import { connectNet } from './net.js';
import { RemotePlayers, attachBubble } from './remotePlayers.js';
import { audio } from './audio.js';
import { FURNITURE, isFurniture, info, FRUITS, SHOP_STOCK } from './data/content.js';
import { worldToGrid } from './config.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // 필믹 톤매핑 → 부드럽고 따뜻한 색감
renderer.toneMappingExposure = 1.28;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed9f2);
scene.fog = new THREE.Fog(0x9ed9f2, 55, 110);

const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, innerWidth / innerHeight, 0.1, 300);

scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const hemi = new THREE.HemisphereLight(0xdfefff, 0x88b070, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d9, 1.9);
sun.position.set(20, 34, 16); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 4.5; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; // 부드러운 그림자
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 100 });
scene.add(sun);

const mats = makeMaterials();
mats.terrain.map.repeat.set(1, 1); // UV를 world 좌표로 직접 주므로 반복 1
const input = createInput();
const follow = new FollowCamera(camera);

const prompt = document.getElementById('prompt');
let map, world, objGroup, player, npcs, sea, bugs, bugGroup, fossils, fossilGroup, placedGroup, placedList;
let shells, shellGroup; // 해변 채집물
let decorGroup; // 풀 tufts·들꽃 장식
let terrainObj, cliffObj, waterfallObj; // 지형/절벽/폭포 메시(터레이닝 재빌드용)
let plants, plantsGroup;
let shopWorld, benchWorld, museumWorld, houseWorld, spawnCell;
let roster = null; // 현재 거주 주민 id 배열(최대 3)
const placeMode = { id: null, ghost: null };
const storage = { items: {} };
const friendship = {}; // { villagerId: points }
const appearance = { body: 0xff8fb0, skin: 0xffd9b0, hat: 0xf2e3b0 };
let design = emptyDesign();
let lastDay = 0, indoor = false, interior = null, playerInterior = null, exitReturn = null, vhouseGroup = null;
let houseItems = []; // 내 집 꾸미기 배치물 [{id,x,z,design,mesh}]
let gotTestKit = false; // 테스트 가구 세트 지급 여부
let net = null, online = false, started = false, myName = '', myId = null, chatting = false, curRoom = '';
let myCode = (loadSave() && loadSave().mycode) || (Math.random().toString(36).slice(2, 7).toUpperCase());
let sentX = null, sentZ = null, moveT = 0;
const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });

// 상점 가판대
function makeShop() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.9), M(0xcaa06a)); base.position.y = 0.45; base.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 1.2), M(0xe0584f)); roof.position.y = 1.35; roof.castShadow = true;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 6), M(0x9c6b3f));
  post.position.set(0.8, 0.67, 0.5); const post2 = post.clone(); post2.position.x = -0.8;
  g.add(base, roof, post, post2); return g;
}
// DIY 제작대(작업대)
function makeBench() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.8), M(0xb98a5e)); top.position.y = 0.75; top.castShadow = true;
  for (const [x, z] of [[0.55, 0.3], [-0.55, 0.3], [0.55, -0.3], [-0.55, -0.3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.12), M(0x8a6540)); leg.position.set(x, 0.37, z); g.add(leg);
  }
  const tool = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.18), M(0x9aa0a6)); tool.position.set(0, 0.9, 0); tool.rotation.y = 0.5;
  g.add(top, tool); return g;
}
// 박물관 건물
function makeMuseum() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.0), M(0xe8e0d0)); body.position.y = 0.9; body.castShadow = true; body.receiveShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.9, 4), M(0x6b8f9c)); roof.position.y = 2.25; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.1), M(0x7a5b3a)); door.position.set(0, 0.5, 1.0);
  g.add(body, roof, door); return g;
}
// 내 집(입장 가능)
function makeHouse() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.0), M(0xf0dcc0)).translateY(0.8));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.9, 4), M(0xd98a5a)); roof.position.y = 2.05; roof.rotation.y = Math.PI / 4; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.12), M(0x8a5a34)); door.position.set(0, 0.55, 1.0); g.add(door);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// 집 실내(방): 바닥+벽+출구매트+보관함+조명
function buildInterior() {
  const g = new THREE.Group(); g.visible = false;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), M(0xd8b48a)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const wallMat = M(0xefe6d6);
  const mkWall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); g.add(m); };
  mkWall(8, 2.2, 0.2, 0, 1.1, -4); mkWall(0.2, 2.2, 8, -4, 1.1, 0); mkWall(0.2, 2.2, 8, 4, 1.1, 0); mkWall(8, 2.2, 0.2, 0, 1.1, 4);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), M(0x8fd08a)); mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.02, 3.4); g.add(mat); // 출구
  const chest = buildFurniture('chest'); chest.position.set(-2.4, 0, -2.4); g.add(chest);
  const lamp = new THREE.PointLight(0xfff0d0, 0.9, 20); lamp.position.set(0, 3, 0); g.add(lamp);
  const items = new THREE.Group(); g.add(items); g._items = items; // 꾸미기용 배치물
  g._exit = { x: 0, z: 3.4 }; g._chest = { x: -2.4, z: -2.4 };
  return g;
}

// 주민 집 외관(주민 색으로 지붕 칠한 아담한 오두막)
function makeVillagerHouse(v) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.7), M(0xf3e6cf)); body.position.y = 0.65; body.castShadow = true; body.receiveShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.8, 4), M(v.color)); roof.position.y = 1.7; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.1), M(0x8a5a34)); door.position.set(0, 0.48, 0.86);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.08), M(0xbfe6ff)); win.position.set(0.55, 0.8, 0.86);
  g.add(body, roof, door, win); return g;
}
// 주민 집 실내(주민 색 테마 방 + 가구 + 안에 서 있는 주민 + 출구)
function buildVillagerInterior(v) {
  const g = new THREE.Group(); g.visible = false;
  const floorC = new THREE.Color(v.color).lerp(new THREE.Color(0xffffff), 0.55);
  const wallC = new THREE.Color(v.color).lerp(new THREE.Color(0xffffff), 0.78);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), M(floorC.getHex())); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const wallMat = M(wallC.getHex());
  const mkWall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); g.add(m); };
  mkWall(7, 2.2, 0.2, 0, 1.1, -3.5); mkWall(0.2, 2.2, 7, -3.5, 1.1, 0); mkWall(0.2, 2.2, 7, 3.5, 1.1, 0); mkWall(7, 2.2, 0.2, 0, 1.1, 3.5);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), M(0x8fd08a)); mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.02, 3.0); g.add(mat);
  // 가구 몇 점
  for (const [id, x, z] of [['table', -2, -2], ['chair', -2, -1], ['lamp', 2, -2], ['bench', 2, 1.4]]) {
    const f = buildFurniture(id); f.position.set(x, 0, z); deflatten(f); g.add(f);
  }
  // 안에 서 있는 주민
  const char = buildVillager(v); char.position.set(0, 0, -1.6); char.rotation.y = 0; deflatten(char); g.add(char);
  const lamp = new THREE.PointLight(0xfff0d0, 0.8, 20); lamp.position.set(0, 3, 0); g.add(lamp);
  g._exit = { x: 0, z: 3.0 };
  g._char = char;
  g._innpc = { villager: v, id: v.id, name: v.name, group: char, x: 0, z: -1.6, faceTo() {}, wave() {}, startTalk(d) { g._talk = Math.min(2.5, d || 1); } };
  return g;
}

// 스폰 근처 빈 칸에 구조물 배치
function placeStruct(sc, offsets, meshFn) {
  let cell = null;
  for (const [dx, dz] of offsets) { const c = map.cell(sc.gx + dx, sc.gz + dz); if (c && c.walkable && !c.ramp && (c.terrain === 'grass' || c.terrain === 'path')) { c.object = null; cell = c; break; } }
  if (!cell) cell = sc;
  const w = gridToWorld(cell.gx, cell.gz);
  const mesh = meshFn(); mesh.position.set(w.x, map.surfaceHeight(w.x, w.z), w.z); scene.add(mesh);
  return { x: w.x, z: w.z, mesh };
}

// 주민 집(스폰 근처 grass 빈칸) 찾기
function villagerHome(sc, off) {
  const tries = [off, [off[0] + 1, off[1]], [off[0] - 1, off[1]], [off[0], off[1] + 1], [off[0], off[1] - 1], [off[0] + 2, off[1] + 1]];
  for (const [dx, dz] of tries) {
    const c = map.cell(sc.gx + dx, sc.gz + dz);
    if (c && c.terrain === 'grass' && c.walkable && !c.ramp && !c.object && !c.placed) return gridToWorld(c.gx, c.gz);
  }
  return gridToWorld(sc.gx + off[0], sc.gz + off[1]);
}

function buildWorld(seed) {
  if (world) { scene.remove(world); world.traverse(o => o.geometry && o.geometry.dispose()); }
  if (objGroup) scene.remove(objGroup);
  if (bugGroup) scene.remove(bugGroup);
  if (fossilGroup) scene.remove(fossilGroup);
  if (shellGroup) scene.remove(shellGroup);
  if (decorGroup) scene.remove(decorGroup);
  if (placedGroup) scene.remove(placedGroup);
  if (plantsGroup) scene.remove(plantsGroup);
  if (player) scene.remove(player.group);
  if (npcs) for (const n of npcs) scene.remove(n.group);
  for (const s of [shopWorld, benchWorld, museumWorld, houseWorld]) if (s && s.mesh) scene.remove(s.mesh);

  map = new GameMap(seed);
  if (terraEdits) terraEdits.clear(); // 새 섬이면 지형 편집 리셋
  world = new THREE.Group();
  terrainObj = buildTerrain(map, mats); cliffObj = buildCliffs(map, mats); waterfallObj = buildWaterfalls(map);
  world.add(terrainObj, cliffObj, waterfallObj);
  scene.add(world);
  sea = world.getObjectByName('sea');

  placeObjects(map);
  objGroup = buildObjects(map, map.objects);
  scene.add(objGroup);

  bugs = spawnBugs(map);
  bugGroup = buildBugs(map, bugs);
  scene.add(bugGroup);

  fossils = spawnFossils(map);
  fossilGroup = buildFossils(map, fossils);
  scene.add(fossilGroup);

  shells = spawnShells(map);
  shellGroup = buildShells(map, shells);
  scene.add(shellGroup);

  decorGroup = buildDecor(map); // 풀 tufts + 들꽃
  scene.add(decorGroup);

  placedList = [];
  placedGroup = new THREE.Group();
  scene.add(placedGroup);

  plants = [];
  plantsGroup = new THREE.Group();
  scene.add(plantsGroup);

  // 구조물: 스폰 근처 서로 다른 칸에 배치
  const sc = map.cellAtWorld(map.spawn.x, map.spawn.z);
  shopWorld = placeStruct(sc, [[3, 1], [4, 0], [3, 2], [2, 2]], makeShop);
  benchWorld = placeStruct(sc, [[-3, 1], [-4, 0], [-3, 2], [-2, 2]], makeBench);
  museumWorld = placeStruct(sc, [[0, -4], [2, -4], [-2, -4], [0, -5]], makeMuseum);
  houseWorld = placeStruct(sc, [[5, 2], [-5, 2], [5, -2], [-5, -2], [6, 0]], makeHouse);

  player = new Player(map);
  player.setAppearance(appearance);
  scene.add(player.group);

  spawnCell = sc;
  spawnNpcs(roster || VILLAGER_IDS.slice(0, 3)); // 현재 거주 주민만 소환

  deflatten(scene); // 모든 저폴리 메시를 스무스 셰이딩으로(동숲풍)
  follow.snap(player.group.position);
  document.getElementById('seed').textContent = 'seed: ' + seed;
}

// 각진 flatShading을 끄고 부드럽게(스무스). 새 메시가 생기는 곳에서 호출.
function deflatten(root) {
  root.traverse((o) => {
    const m = o.material; if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach((mm) => { if (mm.flatShading) { mm.flatShading = false; mm.needsUpdate = true; } });
  });
}

const NPC_HOMES = [[-6, -5], [7, -6], [-8, 4]];
// 거주 주민 id 목록으로 npc + 집 메시 재소환
function spawnNpcs(ids) {
  if (npcs) for (const n of npcs) scene.remove(n.group);
  if (vhouseGroup) { scene.remove(vhouseGroup); vhouseGroup.traverse(o => o.geometry && o.geometry.dispose()); }
  npcs = []; vhouseGroup = new THREE.Group();
  roster = ids.slice(0, 3);
  roster.forEach((id, i) => {
    const v = villagerById(id); if (!v || !spawnCell) return;
    const h = villagerHome(spawnCell, NPC_HOMES[i] || [0, -6 - i]);
    const n = new NPC(map, h.x, h.z, v);
    // 집: 홈에서 살짝 옆에 배치(집이 홈 중앙을 막지 않게)
    const hx = h.x + 1.6, hz = h.z;
    const house = makeVillagerHouse(v); house.position.set(hx, map.surfaceHeight(hx, hz), hz); deflatten(house); vhouseGroup.add(house);
    n.houseWorld = { x: hx, z: hz };
    npcs.push(n); scene.add(n.group);
  });
  scene.add(vhouseGroup);
}
// 거주자 갱신(입주/퇴거) — 떠난·새 주민 토스트
function applyRoster(ids, announce) {
  const prev = roster || [];
  if (announce) {
    for (const id of prev) if (!ids.includes(id)) { const v = villagerById(id); if (v) inv.toast(`👋 ${v.name}이(가) 섬을 떠났어요`); }
    for (const id of ids) if (!prev.includes(id)) { const v = villagerById(id); if (v) inv.toast(`🎉 ${v.name}이(가) 이사왔어요!`); }
  }
  if (map) spawnNpcs(ids); else roster = ids.slice(0, 3);
}
// 오프라인: 로컬로 한 명 교체(퇴거→입주)
function rotateRosterLocal() {
  if (online || !roster) return;
  const out = roster[0];
  const pool = VILLAGER_IDS.filter((id) => !roster.includes(id));
  if (!pool.length) return;
  const inId = pool[Math.floor(Math.random() * pool.length)];
  applyRoster([...roster.slice(1), inId], true);
  writeSave(snapshot());
}

// ---- 터레이닝(지형 편집) ----
const terra = { on: false, tool: 'raise' }; // raise|lower|path
const terraEdits = new Map(); // 'gx,gz' → {height, terrain} (저장·멀티 동기화용 오버라이드)
function rebuildTerrain() {
  if (terrainObj) { world.remove(terrainObj); terrainObj.traverse(o => o.geometry && o.geometry.dispose()); }
  if (cliffObj) { world.remove(cliffObj); cliffObj.traverse(o => o.geometry && o.geometry.dispose()); }
  if (waterfallObj) { world.remove(waterfallObj); waterfallObj.traverse(o => o.geometry && o.geometry.dispose()); }
  terrainObj = buildTerrain(map, mats); cliffObj = buildCliffs(map, mats); waterfallObj = buildWaterfalls(map);
  world.add(terrainObj, cliffObj, waterfallObj);
  deflatten(world);
  sea = world.getObjectByName('sea');
}
// 한 셀에 지형 오버라이드 적용(렌더 재빌드는 호출측에서). ramp={from,to,dir} 또는 null.
function applyTerraEdit(gx, gz, height, terrain, ramp) {
  const c = map.cell(gx, gz); if (!c) return false;
  c.height = height; c.terrain = terrain; c.walkable = terrain !== 'water'; // 물은 통행 불가
  if (ramp) { c.ramp = true; c.rampFrom = ramp.from; c.rampTo = ramp.to; c.rampDir = ramp.dir; }
  else { c.ramp = false; c.rampFrom = c.rampTo = c.rampDir = undefined; }
  terraEdits.set(gx + ',' + gz, { height, terrain, ramp: ramp || null });
  return true;
}
// 편집 가능한 칸인지(비어있음·주민 없음). 경사로·물 셀도 허용(해제/재편집 위해).
function canTerra(c) {
  if (!c) return false;
  if (c.object || c.placed) return false;
  for (const n of npcs) { const g = worldToGrid(n.x, n.z); if (g.gx === c.gx && g.gz === c.gz) return false; }
  for (const s of [shopWorld, benchWorld, museumWorld, houseWorld]) { if (s) { const g = worldToGrid(s.x, s.z); if (g.gx === c.gx && g.gz === c.gz) return false; } }
  return true;
}
function doTerra(c) {
  if (!canTerra(c)) { inv.toast('여기는 편집할 수 없어요'); return; }
  if (c.terrain === 'water' && terra.tool !== 'water') { inv.toast('물은 💧 물 도구로 메워요'); return; }
  let height = c.height, terrain = c.terrain, ramp = null;
  if (terra.tool === 'water') {
    if (c.ramp) { inv.toast('경사로엔 물을 못 놔요'); return; }
    terrain = c.terrain === 'water' ? 'grass' : 'water'; // 물 ↔ 잔디(메우기)
  } else if (terra.tool === 'ramp') {
    if (c.ramp) { ramp = null; } // 경사로 해제(높이/지형 유지)
    else {
      const DS = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]]; // 오르막(높은 이웃) 방향 탐색
      let dir = null;
      for (const [d, dx, dz] of DS) { const nb = map.cell(c.gx + dx, c.gz + dz); if (nb && !nb.ramp && nb.terrain !== 'water' && nb.height === c.height + 1) { dir = d; break; } }
      if (!dir) { inv.toast('경사로는 옆에 한 단 높은 지형이 있어야 해요'); return; }
      if (terrain === 'path') terrain = 'grass'; // 경사로는 잔디
      ramp = { from: c.height, to: c.height + 1, dir };
    }
  } else if (terra.tool === 'raise') { if (height >= 2) { inv.toast('더 높일 수 없어요'); return; } height++; if (terrain === 'path') terrain = 'grass'; }
  else if (terra.tool === 'lower') { if (height <= 0) { inv.toast('더 낮출 수 없어요'); return; } height--; }
  else if (terra.tool === 'path') { if (c.ramp) { inv.toast('경사로엔 길을 놓을 수 없어요'); return; } if (terrain === 'path') terrain = 'grass'; else if (terrain === 'grass') terrain = 'path'; else { inv.toast('길은 잔디 위에만'); return; } }
  applyTerraEdit(c.gx, c.gz, height, terrain, ramp);
  rebuildTerrain(); audio.place();
  if (online && net) net.emit('terra', { gx: c.gx, gz: c.gz, height, terrain, ramp });
  writeSave(snapshot());
}
// 앞칸 하이라이트(터레이닝 모드에서만 표시)
const terraHi = new THREE.Mesh(
  new THREE.BoxGeometry(CONFIG.TILE * 0.94, 0.25, CONFIG.TILE * 0.94),
  new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.5 }));
terraHi.visible = false; scene.add(terraHi);

const saved = loadSave();
// 월드 생성은 서버 연결(또는 오프라인 폴백) 후 startGame()에서 수행.

document.getElementById('regen').addEventListener('click', () => {
  if (online && net) { net.emit('regen'); return; }        // 멀티: 서버가 재시드 후 전체 브로드캐스트
  buildWorld((Math.random() * 1e9) | 0); writeSave(snapshot());
});

const inv = new Inventory();
const clock2 = new GameClock(1, 8); // 맑은 봄 아침으로 시작
const weatherFX = new WeatherFX(scene);
const weatherEvents = new WeatherEvents(scene);
const clockEl = document.getElementById('clock');
let lastSeason = null, lastPhase = null;

function applySeason(s) {
  const c = SEASON_COLORS[s];
  mats.terrain.color.setHex(c.grass);
  mats.lip.color.setHex(c.edge);
  mats.water.color.setHex(c.water);
  setFoliageColor(c.leaf);
}
const WEA = { clear: '☀️', rain: '🌧️', snow: '❄️' };
document.getElementById('ff').addEventListener('click', () => clock2.advance(3));

// 경제 + 도감 + 기증 상태
let money = 0;
const collection = { fish: new Set(), bug: new Set(), fossil: new Set(), donated: { fish: new Set(), bug: new Set(), fossil: new Set() } };
const moneyEl = document.getElementById('money');
function updateMoney() { moneyEl.textContent = `💰 ${money.toLocaleString()} 벨`; }

// 제작: 재료 확인 → 소비 → 도구 지급
function craft(id) {
  const r = RECIPES.find(x => x.id === id); if (!r) return;
  if (!Object.entries(r.mats).every(([m, q]) => (inv.items[m] || 0) >= q)) return;
  for (const [m, q] of Object.entries(r.mats)) inv.remove(m, q);
  inv.add(id); if (isFurniture(id)) renderPlaceBar(); writeSave(snapshot());
}
// 기증 가능한 종 id 목록(가방에 있고 아직 미기증)
function donatable() {
  const out = [];
  for (const [cat, list] of [['fish', FISH], ['bug', BUGS], ['fossil', FOSSILS]])
    for (const sp of list) if ((inv.items[sp.id] || 0) > 0 && !collection.donated[cat].has(sp.id)) out.push(sp.id);
  return out;
}
function donate() {
  let n = 0;
  for (const [cat, list] of [['fish', FISH], ['bug', BUGS], ['fossil', FOSSILS]])
    for (const sp of list) if ((inv.items[sp.id] || 0) > 0 && !collection.donated[cat].has(sp.id)) {
      inv.remove(sp.id, 1); collection.donated[cat].add(sp.id); collection[cat].add(sp.id); n++;
    }
  if (n) { inv.toast(`🏛️ ${n}점 기증!`); writeSave(snapshot()); } else inv.toast('기증할 새로운 것이 없어요');
}

function sellId(id) {
  const n = inv.items[id] || 0; if (!n) return;
  money += priceOf(id) * n; inv.remove(id, n);
  updateMoney(); audio.coin(); inv.toast(`💰 +${priceOf(id) * n} 벨`); writeSave(snapshot());
}
function sellAll() {
  let g = 0;
  for (const id of Object.keys(inv.items)) { const p = priceOf(id); if (p > 0) { g += p * inv.items[id]; inv.remove(id, inv.items[id]); } }
  if (g) { money += g; updateMoney(); audio.coin(); inv.toast(`💰 +${g} 벨`); writeSave(snapshot()); }
}

function buyItem(id) {
  const s = SHOP_STOCK.find(x => x.id === id); if (!s || money < s.price) return;
  money -= s.price; inv.add(id, 1); updateMoney(); audio.coin(); renderPlaceBar(); writeSave(snapshot());
}
const shopPanel = new ShopPanel({ inventory: () => inv.items, money: () => money, sell: sellId, sellAll, buy: buyItem });
const logPanel = new LogPanel({ collection: () => collection });
const craftPanel = new CraftPanel({ inventory: () => inv.items, craft });
const museumPanel = new MuseumPanel({ collection: () => collection, donatable, donate });
const invPanel = new InventoryPanel({
  inventory: () => inv.items,
  placeable: (id) => isFurniture(id) || id === 'seed' || id === 'sapling',
  place: (id) => { startPlacing(id); if (indoor) inv.toast('앞에 놓을 자리를 보고 Space'); },
});
const panels = [shopPanel, logPanel, craftPanel, museumPanel, invPanel];
const uiOpen = () => panels.some(p => p.open);
document.getElementById('logbtn').addEventListener('click', () => logPanel.toggle());
const _invbtn = document.getElementById('invbtn'); if (_invbtn) _invbtn.addEventListener('click', () => invPanel.toggle());

// ---- 가구 배치 ----
const placeBar = document.getElementById('placebar');
// 배치 바 = "놓는 중" 표시(배치 모드일 때만). 가구 선택은 가방(🎒)에서.
function renderPlaceBar() {
  if (!placeMode.id) { placeBar.classList.add('hidden'); return; }
  const i = info(placeMode.id);
  placeBar.classList.remove('hidden');
  placeBar.innerHTML = `<span class="pbtitle">🔨 놓는 중: ${i ? i.emoji : ''} ${i ? i.name : placeMode.id} (${inv.items[placeMode.id] || 0})</span>` +
    `<span class="pbhint">Space ${placeMode.id === 'seed' || placeMode.id === 'sapling' ? '심기' : '놓기'} · Esc 취소</span>`;
}
function startPlacing(id) {
  if (!(inv.items[id] > 0)) return;
  cancelPlacing();
  placeMode.id = id;
  placeMode.ghost = (id === 'seed' || id === 'sapling') ? buildPlantMesh(0, id === 'sapling' ? 'tree' : 'flower') : makeGhost(id, design);
  scene.add(placeMode.ghost);
  renderPlaceBar();
}
function cancelPlacing() {
  if (placeMode.ghost) { scene.remove(placeMode.ghost); placeMode.ghost = null; }
  placeMode.id = null; renderPlaceBar();
}
function frontCell() {
  const fx = player.x + Math.sin(player.face) * 1.4, fz = player.z + Math.cos(player.face) * 1.4;
  const g = worldToGrid(fx, fz); return map.cell(g.gx, g.gz);
}
function canPlace(c) {
  if (!c || !c.walkable || c.terrain === 'water' || c.ramp || c.object || c.placed) return false;
  for (const s of [shopWorld, benchWorld, museumWorld]) { const g = worldToGrid(s.x, s.z); if (g.gx === c.gx && g.gz === c.gz) return false; }
  return true;
}
function placeFurniture(c, id, dz) {
  const w = gridToWorld(c.gx, c.gz);
  const mesh = buildFurniture(id, dz); mesh.position.set(w.x, map.surfaceHeight(w.x, w.z), w.z);
  mesh.userData.pop = 0.34; deflatten(mesh); placedGroup.add(mesh);
  const f = FURNITURE.find(x => x.id === id);
  c.placed = { id, solid: !!(f && f.solid) };
  placedList.push({ gx: c.gx, gz: c.gz, id, design: id === 'flag' ? dz : undefined, mesh });
}
function applyPlaced(list) {
  for (const p of list || []) { const c = map.cell(p.gx, p.gz); if (c && !c.placed) placeFurniture(c, p.id, p.design); }
}

// ---- 보관함 ----
const storagePanel = new StoragePanel({
  inventory: () => inv.items, storage: () => storage.items,
  deposit: (id) => { if (inv.items[id] > 0) { inv.remove(id, 1); storage.items[id] = (storage.items[id] || 0) + 1; writeSave(snapshot()); } },
  withdraw: (id) => { if (storage.items[id] > 0) { storage.items[id]--; if (!storage.items[id]) delete storage.items[id]; inv.add(id, 1); renderPlaceBar(); writeSave(snapshot()); } },
});
panels.push(storagePanel);

// ---- 주민 친밀도 + 선물 ----
function friendLevel(n) { return Math.min(5, Math.floor((friendship[n.id] || 0) / 5)); }
function giftableIds() { return Object.keys(inv.items).filter(id => inv.items[id] > 0 && priceOf(id) > 0 && !isFurniture(id) && id !== 'seed' && id !== 'sapling'); }
function giftTo(n, id) {
  if (!(inv.items[id] > 0)) return '음?';
  inv.remove(id, 1);
  const liked = id === n.villager.likes;
  friendship[n.id] = (friendship[n.id] || 0) + (liked ? 3 : 1);
  audio.emote(); attachBubble(n.group, liked ? '💖' : '😊'); if (n.express) n.express(liked ? 'happy' : (n.villager.personality === '무뚝뚝' ? 'neutral' : 'happy'), 2.2); renderPlaceBar(); writeSave(snapshot());
  return giftReaction(n.villager, liked, info(id).emoji);
}
// 대화: 계절·낮밤·날씨·다른 주민 이름을 섞은 화제. 말 걸 때/더 얘기할 때 호출.
function npcTalk(n) {
  const st = clock2.state();
  const others = npcs.filter(x => x !== n);
  const other = others.length ? others[Math.floor(Math.random() * others.length)].name : null;
  return dialogueLine(n.villager, friendLevel(n), { season: st.season, phase: st.phase, weather: st.weather, other });
}
// 말 걸면 가끔 부탁 생성(친밀도 1↑, 부탁 없을 때, 30%). 좋아하는 것 우선.
function npcArrive(n) {
  if (n.request || friendLevel(n) < 1 || Math.random() > 0.3) return;
  const pool = Math.random() < 0.5 ? [n.villager.likes] : REQUEST_POOL;
  n.request = { item: pool[Math.floor(Math.random() * pool.length)] };
}
// 부탁 들어주기: 아이템 주면 친밀도+벨 보상
function fulfillRequest(n) {
  const req = n.request; if (!req || !(inv.items[req.item] > 0)) return '아직 그건 없구나…';
  inv.remove(req.item, 1);
  friendship[n.id] = (friendship[n.id] || 0) + 4;
  money += 250; updateMoney(); audio.coin(); attachBubble(n.group, '✨'); if (n.express) n.express('happy', 2.5);
  n.request = null; renderPlaceBar(); writeSave(snapshot());
  return thankLine(n.villager, info(req.item).emoji) + ' (+250벨)';
}
function voiceOf(n) { let h = 0; for (const c of n.id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 0.8 + (h % 6) * 0.13; } // 주민별 음높이
const npcPanel = new NpcPanel({
  level: friendLevel, giftables: giftableIds, gift: giftTo,
  talk: npcTalk, arrive: npcArrive, request: (n) => n.request || null, hasItem: (id) => inv.items[id] > 0, fulfill: fulfillRequest,
  say: (line, n) => { audio.speak(line, voiceOf(n)); if (n.startTalk) n.startTalk(line.length * 0.052); },
});
panels.push(npcPanel);

const customizePanel = new CustomizePanel({
  get: () => appearance,
  set: (part, color) => { appearance[part] = color; player.setAppearance(appearance); writeSave(snapshot()); },
});
panels.push(customizePanel);
document.getElementById('wardrobe').addEventListener('click', () => customizePanel.toggle());

const designPanel = new DesignPanel({
  get: () => design,
  set: (i, c) => { design[i] = c; writeSave(snapshot()); },
  clear: () => { design.fill(0); writeSave(snapshot()); },
});
panels.push(designPanel);
document.getElementById('designbtn').addEventListener('click', () => designPanel.toggle());

const mailPanel = new MailPanel({
  recipients: () => remotes.list(),
  giftables: giftableIds,
  send: (to, item) => {
    if (inv.items[item] > 0 && net) { inv.remove(item, 1); net.emit('mail', { to, item }); inv.toast('📬 우편을 보냈어요'); renderPlaceBar(); writeSave(snapshot()); }
  },
});
panels.push(mailPanel);
document.getElementById('mailbtn').addEventListener('click', () => mailPanel.toggle());

// ---- 원예 (성장은 "심은 날"로부터 경과일로 계산 → 서버 시각과 자동 동기) ----
function stageOf(day) { return Math.min(PLANT_MAX, Math.max(0, Math.floor(clock2.day - day))); }
// 꽃 색은 위치로 결정론적(멀티 동기화 불필요·모든 클라 동일)
function flowerColorAt(gx, gz) { const h = ((gx * 73856093) ^ (gz * 19349663)) >>> 0; return FLOWER_COLORS[h % FLOWER_COLORS.length]; }
function plantSeed(c, day = clock2.day, kind = 'flower') {
  const st = stageOf(day);
  const w = gridToWorld(c.gx, c.gz);
  const color = kind === 'flower' ? flowerColorAt(c.gx, c.gz) : undefined;
  const mesh = buildPlantMesh(st, kind, color); mesh.position.set(w.x, map.surfaceHeight(w.x, w.z), w.z);
  mesh.userData.pop = 0.34; mesh.userData.sway = kind === 'flower'; // 생성 팝 + 꽃 산들바람
  plantsGroup.add(mesh);
  c.plant = true;
  plants.push({ gx: c.gx, gz: c.gz, day, kind, stage: st, color, mesh });
}
function canPlant(c) {
  return c && c.walkable && c.terrain === 'grass' && !c.ramp && !c.object && !c.placed && !c.plant;
}
function regrowMesh(p) {
  plantsGroup.remove(p.mesh);
  const w = gridToWorld(p.gx, p.gz);
  p.mesh = buildPlantMesh(p.stage, p.kind, p.color); p.mesh.position.set(w.x, map.surfaceHeight(w.x, w.z), w.z);
  p.mesh.userData.pop = 0.34; p.mesh.userData.sway = p.kind === 'flower'; // 성장 팝
  plantsGroup.add(p.mesh);
}
function growPlants() { // 날짜 변화 시 모든 식물 단계 재계산
  for (const p of plants) { const st = stageOf(p.day); if (st !== p.stage) { p.stage = st; regrowMesh(p); } }
}
// 꽃 교배(오프라인 전용): 다 자란 꽃 둘이 인접하면 옆 빈 잔디칸에 새 꽃 번식
function breedFlowers() { if (online) return; runBreeding(); } // 멀티는 분기(divergence) 방지 위해 스킵
function runBreeding() {
  const mature = plants.filter((p) => p.kind === 'flower' && p.stage >= PLANT_MAX);
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const born = [];
  for (const p of mature) {
    const hasPartner = N.some(([dx, dz]) => mature.some((q) => q !== p && q.gx === p.gx + dx && q.gz === p.gz + dz));
    if (!hasPartner || Math.random() > 0.25) continue;
    const empties = N.map(([dx, dz]) => map.cell(p.gx + dx, p.gz + dz)).filter((c) => canPlant(c) && !born.some((b) => b === c));
    if (!empties.length) continue;
    const c = empties[Math.floor(Math.random() * empties.length)];
    born.push(c); plantSeed(c, clock2.day, 'flower');
  }
  if (born.length) writeSave(snapshot());
}
function plantAt(gx, gz, day, kind) { const c = map.cell(gx, gz); if (c && !c.plant) plantSeed(c, day, kind || 'flower'); }
function removePlantAt(gx, gz) {
  const p = plants.find((x) => x.gx === gx && x.gz === gz); if (!p) return;
  plantsGroup.remove(p.mesh); const c = map.cell(gx, gz); if (c) c.plant = false;
  plants = plants.filter((x) => x !== p);
}
function applyPlants(list) { for (const p of list || []) plantAt(p.gx, p.gz, p.day || 0, p.kind); }

// 원격/초기 채집 반영(월드에서 제거만; 인벤토리는 채집한 사람만)
function applyCollected(kind, key) {
  if (kind === 'flower') removeFlowerAt(key);
  else if (kind === 'fossil') { const [gx, gz] = String(key).split(',').map(Number); const f = fossils.find((x) => x.mesh && x.gx === gx && x.gz === gz); if (f) { fossilGroup.remove(f.mesh); f.mesh = null; } }
  else if (kind === 'bug') { const b = bugs.find((x) => x.mesh && x.idx === key); if (b) { bugGroup.remove(b.mesh); b.mesh = null; } }
  else if (kind === 'shell') { const [gx, gz] = String(key).split(',').map(Number); const s = shells.find((x) => x.mesh && x.gx === gx && x.gz === gz); if (s) { shellGroup.remove(s.mesh); s.mesh = null; } }
}

// ---- 집 실내(입장/퇴장) ----
function setOutdoorVisible(v) {
  for (const g of [world, objGroup, bugGroup, fossilGroup, shellGroup, decorGroup, placedGroup, plantsGroup, vhouseGroup]) if (g) g.visible = v;
  for (const n of npcs) n.group.visible = v;
  for (const s of [shopWorld, benchWorld, museumWorld, houseWorld]) if (s && s.mesh) s.mesh.visible = v;
  if (weatherFX) weatherFX.pts.visible = v && weatherFX.pts.visible;
}
// 실내 진입 공통(room=실내 그룹, ret=나갈 때 위치, temp=나가며 폐기 여부)
function enterIndoor(room, ret, temp) {
  indoor = true; player.indoor = true;
  cancelPlacing(); panels.forEach(p => p.close());
  if (interior && interior !== room) interior.visible = false;
  interior = room; interior._temp = temp; exitReturn = ret;
  setOutdoorVisible(false); room.visible = true;
  scene.background.setHex(0x2a2233); if (scene.fog) scene.fog.color.setHex(0x2a2233);
  hemi.intensity = 0.7; sun.intensity = 0.3;
  player.x = 0; player.z = 2.6; player.face = Math.PI; player.update(0, new Set()); follow.snap(player.group.position);
  placeBar.classList.add('hidden');
}
// 실내 앞칸(0.5 격자 스냅)
function frontSpot() {
  const fx = player.x + Math.sin(player.face) * 1.1, fz = player.z + Math.cos(player.face) * 1.1;
  const sn = (v) => Math.round(v * 2) / 2;
  return { x: sn(fx), z: sn(fz) };
}
function spawnHouseItemMesh(h) {
  const mesh = buildFurniture(h.id, h.design); mesh.position.set(h.x, 0, h.z); mesh.userData.pop = 0.34; deflatten(mesh);
  playerInterior._items.add(mesh); h.mesh = mesh;
}
function enterHouse() {
  if (!playerInterior) { playerInterior = buildInterior(); scene.add(playerInterior); for (const h of houseItems) spawnHouseItemMesh(h); }
  enterIndoor(playerInterior, { x: houseWorld.x, z: houseWorld.z + 1.6 }, false);
  renderPlaceBar(); // 실내 꾸미기: 배치바 표시
}
function enterVillagerHouse(n) {
  const room = buildVillagerInterior(n.villager); scene.add(room);
  enterIndoor(room, { x: n.houseWorld.x, z: n.houseWorld.z + 1.6 }, true);
}
function exitHouse() {
  indoor = false; player.indoor = false;
  if (interior) { interior.visible = false; if (interior._temp) { scene.remove(interior); interior.traverse(o => o.geometry && o.geometry.dispose()); } }
  interior = null;
  setOutdoorVisible(true);
  const ret = exitReturn || { x: houseWorld.x, z: houseWorld.z + 1.6 };
  player.x = ret.x; player.z = ret.z; player.update(0, new Set()); follow.snap(player.group.position);
  renderPlaceBar();
}

// 낚시
let fishing = false;
function startFishing() {
  if (fishing) return;
  fishing = true; player.swing(); inv.toast('🎣 낚시 중...');
  setTimeout(() => {
    fishing = false;
    const st = clock2.state();
    const f = pickWeighted(availableFish(st.season, st.phase), Math.random);
    if (f) { inv.add(f.id); collection.fish.add(f.id); audio.catchGet(); writeSave(snapshot()); }
    else inv.toast('아무것도 없네…');
  }, 1200);
}
function nearWater(x, z) {
  for (const [dx, dz] of [[1.1, 0], [-1.1, 0], [0, 1.1], [0, -1.1], [0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]]) {
    const c = map.cellAtWorld(x + dx, z + dz); if (c && c.terrain === 'water') return true;
  }
  return false;
}

// 저장된 꽃 하나 제거(복원용)
function removeFlowerAt(key) {
  const o = map.objects.find(o => o.type === 'flower' && o.mesh && (o.gx + ',' + o.gz) === key);
  if (o) { objGroup.remove(o.mesh); o.mesh = null; const c = map.cell(o.gx, o.gz); if (c) c.object = null; }
}

// 저장 복원. 섬 독립 데이터(가방·돈·도감·친밀도·외형·보관함)는 항상,
// 섬 의존 데이터(위치·배치·식물·주운꽃)는 시드가 같을 때만 복원.
function restoreSave(seed) {
  if (saved) {
    if (saved.day != null) clock2.day = saved.day;
    if (saved.hour != null) clock2.hour = saved.hour;
    if (saved.inventory) inv.setItems(saved.inventory);
    if (saved.money != null) money = saved.money;
    if (saved.collection) {
      const c = saved.collection;
      collection.fish = new Set(c.fish || []); collection.bug = new Set(c.bug || []); collection.fossil = new Set(c.fossil || []);
      if (c.donated) collection.donated = { fish: new Set(c.donated.fish || []), bug: new Set(c.donated.bug || []), fossil: new Set(c.donated.fossil || []) };
    }
    if (saved.storage) storage.items = saved.storage;
    if (Array.isArray(saved.houseItems)) houseItems = saved.houseItems.map(h => ({ id: h.id, x: h.x, z: h.z, design: h.design })); // 집 꾸미기 복원(메시는 입장 시 생성)
    if (saved.gotTestKit) gotTestKit = true;
    if (saved.friendship) Object.assign(friendship, saved.friendship);
    if (saved.appearance) { Object.assign(appearance, saved.appearance); player.setAppearance(appearance); }
    if (Array.isArray(saved.design) && saved.design.length === design.length) design = saved.design;
    if (saved.seed === seed) {
      if (saved.player) { player.x = saved.player.x; player.z = saved.player.z; player.update(0, new Set()); follow.snap(player.group.position); }
      if (saved.picked) for (const k of saved.picked) removeFlowerAt(k);
      if (saved.plants) applyPlants(saved.plants);
      if (!online && Array.isArray(saved.edits) && saved.edits.length) { // 지형 편집 복원(오프라인; 멀티는 서버가 관리)
        for (const e of saved.edits) applyTerraEdit(e.gx, e.gz, e.height, e.terrain, e.ramp);
        rebuildTerrain();
      }
      if (!online && saved.placed) applyPlaced(saved.placed); // 멀티에선 배치는 서버가 관리
    }
  }
  lastDay = clock2.day;
  updateMoney();
  renderPlaceBar();
}

// 테스트/시작 선물: 가구 한 벌 + 재료 + 벨 (최초 1회)
function grantTestKit() {
  for (const id of ['chair', 'table', 'lamp', 'bed', 'sofa', 'bookshelf', 'tv', 'rug', 'pottedplant', 'clock', 'barrel', 'stool', 'easel', 'streetlamp', 'bench', 'fence', 'well', 'bush', 'campfire', 'flag']) inv.add(id, 2);
  inv.add('wood', 40); inv.add('stone', 25); inv.add('iron', 12); inv.add('flower', 12);
  money += 5000; updateMoney(); renderPlaceBar();
  inv.toast('🎁 테스트용 가구 세트 지급!');
}
// 게임 시작(서버 시드 또는 오프라인 시드로 월드 생성 + 복원)
function startGame(seed, isOnline) {
  online = isOnline;
  if (!isOnline && saved && Array.isArray(saved.roster) && saved.roster.length) roster = saved.roster; // 오프라인 거주자 복원
  buildWorld(seed);
  restoreSave(seed);
  if (!gotTestKit) { grantTestKit(); gotTestKit = true; writeSave(snapshot()); }
  started = true;
}

// 현재 상태 스냅샷(직렬화)
function snapshot() {
  if (!map || !player) return null; // 게임 시작(월드 생성) 전엔 저장 스킵
  return {
    seed: map.seed, day: clock2.day, hour: clock2.hour,
    player: { x: player.x, z: player.z },
    inventory: inv.items, money,
    collection: {
      fish: [...collection.fish], bug: [...collection.bug], fossil: [...collection.fossil],
      donated: { fish: [...collection.donated.fish], bug: [...collection.donated.bug], fossil: [...collection.donated.fossil] },
    },
    picked: map.objects.filter(o => o.type === 'flower' && !o.mesh).map(o => o.gx + ',' + o.gz),
    placed: placedList.map(p => ({ gx: p.gx, gz: p.gz, id: p.id, design: p.design })),
    design,
    plants: plants.map(p => ({ gx: p.gx, gz: p.gz, day: p.day, kind: p.kind })),
    edits: [...terraEdits.entries()].map(([k, v]) => ({ gx: +k.split(',')[0], gz: +k.split(',')[1], height: v.height, terrain: v.terrain, ramp: v.ramp || null })),
    roster, storage: storage.items, friendship, appearance, name: myName, mycode: myCode,
    houseItems: houseItems.map(h => ({ id: h.id, x: h.x, z: h.z, design: h.design })),
    gotTestKit,
  };
}
addEventListener('beforeunload', () => writeSave(snapshot()));
document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(snapshot()); });
let saveT = 0;

// 가장 가까운 상호작용 대상: NPC > 상점 > 곤충 > 채집물 > 낚시(물가)
function nearestInteract() {
  if (indoor) {
    if (interior._exit && Math.hypot(player.x - interior._exit.x, player.z - interior._exit.z) < 1.4) return { kind: 'exit' };
    if (interior._chest && Math.hypot(player.x - interior._chest.x, player.z - interior._chest.z) < 1.5) return { kind: 'chest_i' };
    if (interior._innpc && Math.hypot(player.x - interior._innpc.x, player.z - interior._innpc.z) < 1.6) return { kind: 'npc', obj: interior._innpc };
    if (interior._items) { for (const h of houseItems) if (h.mesh && Math.hypot(player.x - h.x, player.z - h.z) < 1.0) return { kind: 'hitem', obj: h }; }
    return null;
  }
  for (const n of npcs) if (n.houseWorld && Math.hypot(player.x - n.houseWorld.x, player.z - n.houseWorld.z) < 1.5) return { kind: 'vhouse', obj: n }; // 문 앞이면 방문 우선
  let nn = null, nd = 2.4;
  for (const n of npcs) { const d = Math.hypot(player.x - n.x, player.z - n.z); if (d < nd) { nn = n; nd = d; } }
  if (nn) return { kind: 'npc', obj: nn };
  if (houseWorld && Math.hypot(player.x - houseWorld.x, player.z - houseWorld.z) < 2.6) return { kind: 'house' };
  if (shopWorld && Math.hypot(player.x - shopWorld.x, player.z - shopWorld.z) < 2.3) return { kind: 'shop' };
  if (benchWorld && Math.hypot(player.x - benchWorld.x, player.z - benchWorld.z) < 2.1) return { kind: 'bench' };
  if (museumWorld && Math.hypot(player.x - museumWorld.x, player.z - museumWorld.z) < 2.6) return { kind: 'museum' };
  let pp = null, pd = 1.3;
  for (const p of placedList) { if (!p.mesh) continue; const w = gridToWorld(p.gx, p.gz); const d = Math.hypot(player.x - w.x, player.z - w.z); if (d < pd) { pp = p; pd = d; } }
  if (pp) return { kind: 'placed', obj: pp };
  let plp = null, pld = 1.2;
  for (const p of plants) { if (!p.mesh) continue; const w = gridToWorld(p.gx, p.gz); const d = Math.hypot(player.x - w.x, player.z - w.z); if (d < pld) { plp = p; pld = d; } }
  if (plp) return { kind: 'plant', obj: plp };
  let bb = null, bd = 1.3;
  for (const b of bugs) { if (!b.mesh) continue; const d = Math.hypot(player.x - b.x, player.z - b.z); if (d < bd) { bb = b; bd = d; } }
  if (bb) return { kind: 'bug', obj: bb };
  let ff = null, fd = 1.3;
  for (const f of fossils) { if (!f.mesh) continue; const d = Math.hypot(player.x - f.x, player.z - f.z); if (d < fd) { ff = f; fd = d; } }
  if (ff) return { kind: 'fossil', obj: ff };
  let sh = null, shd = 1.2;
  for (const s of shells) { if (!s.mesh) continue; const d = Math.hypot(player.x - s.x, player.z - s.z); if (d < shd) { sh = s; shd = d; } }
  if (sh) return { kind: 'shell', obj: sh };
  let best = null, gd = 1.9;
  for (const o of map.objects) {
    if (!o.mesh || (o.type !== 'tree' && o.type !== 'flower' && o.type !== 'stone')) continue;
    const w = gridToWorld(o.gx, o.gz);
    const d = Math.hypot(player.x - w.x, player.z - w.z);
    if (d < gd) { best = { kind: o.type, obj: o }; gd = d; }
  }
  if (best) return best;
  if (nearWater(player.x, player.z)) return { kind: 'fish' };
  return null;
}

// 상호작용(Space): 대화 / 상점 / 낚시 / 곤충 / 채집
addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  if (chatting) return;
  e.preventDefault();
  if (uiOpen()) return;
  if (terra.on) { doTerra(frontCell()); return; } // 터레이닝 모드: 앞칸 편집
  if (placeMode.id && indoor) { // 내 집 실내 꾸미기
    if (interior !== playerInterior) { inv.toast('여기선 꾸밀 수 없어요'); return; }
    const pid = placeMode.id;
    if (pid === 'seed' || pid === 'sapling') { inv.toast('실내엔 심을 수 없어요'); return; }
    const s = frontSpot();
    if (Math.abs(s.x) > 2.8 || Math.abs(s.z) > 2.8) { inv.toast('벽에 너무 가까워요'); return; }
    if (Math.hypot(s.x + 2.4, s.z + 2.4) < 0.9) { inv.toast('보관함 자리예요'); return; }
    if (houseItems.some(h => Math.hypot(h.x - s.x, h.z - s.z) < 0.7)) { inv.toast('여기엔 이미 있어요'); return; }
    const h = { id: pid, x: s.x, z: s.z, design: pid === 'flag' ? design.slice() : undefined };
    houseItems.push(h); spawnHouseItemMesh(h); inv.remove(pid, 1); audio.place();
    if (!(inv.items[pid] > 0)) cancelPlacing(); else renderPlaceBar();
    writeSave(snapshot()); return;
  }
  if (placeMode.id) {
    const c = frontCell();
    if (placeMode.id === 'seed' || placeMode.id === 'sapling') {
      const kind = placeMode.id === 'sapling' ? 'tree' : 'flower';
      const item = placeMode.id;
      if (canPlant(c)) {
        plantSeed(c, clock2.day, kind); inv.remove(item, 1); audio.place();
        if (online && net) net.emit('plant', { gx: c.gx, gz: c.gz, day: clock2.day, kind }); // 심기 공유
        if (!(inv.items[item] > 0)) cancelPlacing(); else renderPlaceBar(); writeSave(snapshot());
      } else inv.toast('여기엔 심을 수 없어요');
    } else if (canPlace(c)) {
      const pid = placeMode.id;
      const dz = pid === 'flag' ? design.slice() : undefined;   // 깃발은 현재 디자인을 굽는다
      placeFurniture(c, pid, dz); inv.remove(pid, 1); audio.place();
      if (online && net) net.emit('place', { gx: c.gx, gz: c.gz, id: pid, design: dz }); // 배치 공유
      if (!(inv.items[pid] > 0)) cancelPlacing(); else renderPlaceBar();
      writeSave(snapshot());
    } else inv.toast('여기엔 놓을 수 없어요');
    return;
  }
  if (fishing) return;
  const it = nearestInteract();
  if (!it) return;
  if (it.kind === 'placed') {
    const p = it.obj;
    if (p.id === 'chest') { storagePanel.show(); return; } // 보관함은 열기
    placedGroup.remove(p.mesh); p.mesh = null;
    const c = map.cell(p.gx, p.gz); if (c) c.placed = null;
    placedList = placedList.filter(x => x !== p);
    if (online && net) net.emit('pickup', { gx: p.gx, gz: p.gz }); // 회수 공유
    inv.add(p.id); renderPlaceBar(); writeSave(snapshot()); return;
  }
  if (it.kind === 'plant') {
    const p = it.obj;
    if (p.stage < PLANT_MAX) { inv.toast('🌱 아직 자라는 중이에요'); return; }
    if (p.kind === 'tree') { // 다 자란 나무: 흔들면 과일(유지, 쿨다운)
      const nowT = clock.elapsedTime; if ((p.cd || 0) > nowT) return; p.cd = nowT + 1.6;
      p.mesh.userData.shake = 0.45; const fr = FRUITS[Math.floor(Math.random() * FRUITS.length)];
      inv.add(fr); if (Math.random() < 0.4) inv.add('wood'); audio.pick(); player.swing(); renderPlaceBar(); writeSave(snapshot()); return;
    }
    removePlantAt(p.gx, p.gz); // 꽃: 수확 시 제거
    if (online && net) net.emit('harvest', { gx: p.gx, gz: p.gz });
    inv.add('flower', 2); inv.add('seed', 1); audio.pick(); player.swing(); renderPlaceBar(); writeSave(snapshot()); return;
  }
  if (it.kind === 'npc') {
    const n = it.obj;
    n.faceTo(player.x, player.z);
    player.face = Math.atan2(n.x - player.x, n.z - player.z);
    n.wave(); if (n.express) n.express('happy', 1.8); npcPanel.show(n);
    return;
  }
  if (it.kind === 'house') { enterHouse(); return; }
  if (it.kind === 'vhouse') { audio.ui(); enterVillagerHouse(it.obj); return; }
  if (it.kind === 'hitem') { // 실내 배치물 회수
    const h = it.obj; playerInterior._items.remove(h.mesh); houseItems = houseItems.filter(x => x !== h);
    inv.add(h.id); audio.pick(); renderPlaceBar(); writeSave(snapshot()); return;
  }
  if (it.kind === 'exit') { exitHouse(); return; }
  if (it.kind === 'chest_i') { storagePanel.show(); return; }
  if (it.kind === 'shop') { audio.ui(); shopPanel.show(); return; }
  if (it.kind === 'bench') { audio.ui(); craftPanel.show(); return; }
  if (it.kind === 'museum') { audio.ui(); museumPanel.show(); return; }
  if (it.kind === 'fish') { startFishing(); return; }
  if (it.kind === 'bug') {
    const b = it.obj; bugGroup.remove(b.mesh); b.mesh = null;
    inv.add(b.id); collection.bug.add(b.id); audio.catchGet(); player.swing();
    if (online && net) net.emit('collect', { kind: 'bug', key: b.idx });
    writeSave(snapshot()); return;
  }
  if (it.kind === 'fossil') {
    if (!(inv.items.shovel > 0)) { inv.toast('⛏️ 삽이 필요해요 (제작대에서 제작)'); return; }
    const f = it.obj; fossilGroup.remove(f.mesh); f.mesh = null;
    const fo = randomFossil(Math.random); inv.add(fo.id); collection.fossil.add(fo.id); audio.catchGet(); player.swing();
    if (online && net) net.emit('collect', { kind: 'fossil', key: f.gx + ',' + f.gz });
    writeSave(snapshot()); return;
  }
  if (it.kind === 'shell') {
    const s = it.obj; shellGroup.remove(s.mesh); s.mesh = null;
    inv.add(s.kind); audio.pick(); player.swing();
    if (online && net) net.emit('collect', { kind: 'shell', key: s.gx + ',' + s.gz });
    renderPlaceBar(); writeSave(snapshot()); return;
  }
  const o = it.obj, now = clock.elapsedTime;
  if (it.kind === 'flower') {
    objGroup.remove(o.mesh); o.mesh = null;
    const c = map.cell(o.gx, o.gz); if (c) c.object = null;
    if (online && net) net.emit('collect', { kind: 'flower', key: o.gx + ',' + o.gz });
    inv.add('flower'); if (Math.random() < 0.5) inv.add('seed'); audio.pick(); renderPlaceBar();
  } else if (it.kind === 'tree') {
    if ((o.cd || 0) > now) return; o.cd = now + 1.6; o.mesh.userData.shake = 0.45;
    inv.add(FRUITS[Math.floor(Math.random() * FRUITS.length)]); if (Math.random() < 0.5) inv.add('wood'); audio.pick();
  } else if (it.kind === 'stone') {
    if ((o.cd || 0) > now) return; o.cd = now + 1.6; o.mesh.userData.shake = 0.3;
    inv.add('stone'); if (Math.random() < 0.35) inv.add('iron'); audio.pick(); // 돌에서 가끔 철광석
  }
  player.swing();
  writeSave(snapshot());
});

// 패널 단축키: Esc 닫기, L 도감
addEventListener('keydown', (e) => {
  if (e.code === 'Escape') { panels.forEach(p => p.close()); cancelPlacing(); if (terra.on) setTerra(false); if (chatting) closeChat(); }
  else if (e.code === 'KeyL' && !uiOpen() && !chatting) logPanel.toggle();
  else if (e.code === 'KeyI' && !chatting && (!uiOpen() || invPanel.open)) invPanel.toggle(); // 가방 열기/닫기
  else if (e.code === 'KeyF' && !chatting && !uiOpen() && !indoor && weatherEvents.starVisible) { // 별똥별 소원 빌기
    if (weatherEvents.wish()) { inv.add('star_fragment'); audio.catchGet(); attachBubble(player.group, '🌟'); inv.toast('🌠 소원을 빌었어요! 별조각 +1'); renderPlaceBar(); writeSave(snapshot()); }
  }
});

// ---- 채팅 (멀티) ----
const chatInput = document.getElementById('chatinput');
const chatLog = document.getElementById('chatlog');
function openChat() { chatting = true; chatInput.style.display = 'block'; chatInput.value = ''; chatInput.focus(); }
function closeChat() { chatting = false; chatInput.style.display = 'none'; chatInput.blur(); }
function sendChat() { const t = chatInput.value.trim(); if (t && net) net.emit('chat', { text: t }); closeChat(); }
function addChatLog(name, text) {
  const d = document.createElement('div'); d.className = 'cmsg'; d.textContent = `${name}: ${text}`;
  chatLog.appendChild(d); while (chatLog.children.length > 6) chatLog.removeChild(chatLog.firstChild);
  setTimeout(() => d.classList.add('fade'), 6000);
}
function onChat(d) {
  addChatLog(d.name, d.text);
  if (d.id === myId) attachBubble(player.group, d.text);
  else remotes.bubble(d.id, d.text);
}
addEventListener('keydown', (e) => {
  if (e.code === 'Enter') { if (chatting) sendChat(); else if (online && !uiOpen() && !placeMode.id) openChat(); }
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
// 휠 줌
addEventListener('wheel', (e) => { if (!started) return; follow.zoom(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: true });

// ---- 미니맵 (북쪽 고정, 셀 색 + 플레이어/주민/원격 점) ----
const miniCv = document.getElementById('minimap');
const miniCx = miniCv && miniCv.getContext('2d');
const MINI_COL = { grass: '#84c65a', grass2: '#74b64c', sand: '#e7d7a6', water: '#49a6d6', path: '#c9a86b' };
let miniT = 0;
function drawMinimap() {
  if (!miniCx || !map) return;
  const G = CONFIG.GRID, S = miniCv.width / G;
  miniCx.clearRect(0, 0, miniCv.width, miniCv.height);
  for (let gz = 0; gz < G; gz++) for (let gx = 0; gx < G; gx++) {
    const c = map.cells[gz][gx];
    miniCx.fillStyle = MINI_COL[c.terrain] || '#84c65a';
    miniCx.fillRect(gx * S, gz * S, S + 0.5, S + 0.5);
    if (c.height > 0 && c.terrain !== 'water') { miniCx.fillStyle = `rgba(0,0,0,${0.12 * c.height})`; miniCx.fillRect(gx * S, gz * S, S + 0.5, S + 0.5); } // 고도 음영
  }
  const dot = (x, z, col, r) => { const g = worldToGrid(x, z); miniCx.fillStyle = col; miniCx.beginPath(); miniCx.arc((g.gx + 0.5) * S, (g.gz + 0.5) * S, r, 0, 7); miniCx.fill(); };
  for (const o of map.objects) if (o.mesh && o.type === 'tree') dot(gridToWorld(o.gx, o.gz).x, gridToWorld(o.gx, o.gz).z, 'rgba(40,90,40,0.8)', 1.3);
  for (const n of npcs) dot(n.x, n.z, '#ff9d3c', 2.2);
  if (online) for (const p of remotes.dots()) dot(p.x, p.z, '#43c7ff', 2.2);
  dot(player.x, player.z, '#fff', 2.6); miniCx.strokeStyle = '#2b3a2b'; miniCx.lineWidth = 1; miniCx.stroke();
}

const clock = new THREE.Clock();
let stepAcc = 0, lastPX = 0, lastPZ = 0; // 발소리 누적 거리
let lastRosterDay = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!started) { renderer.render(scene, camera); return; } // 연결/시작 전엔 빈 렌더
  // 시간·계절·낮밤·날씨
  clock2.update(dt);
  const st = clock2.state();
  if (st.day !== lastDay) { // 날짜 바뀌면 식물 성장 재계산 + 꽃 교배 + (오프라인) 5일마다 주민 이사
    growPlants(); breedFlowers(); lastDay = st.day;
    if (!online && st.day > 1 && st.day % 5 === 0 && st.day !== lastRosterDay) { lastRosterDay = st.day; rotateRosterLocal(); }
  }
  if (st.season !== lastSeason) { applySeason(st.season); lastSeason = st.season; }
  if (st.phase !== lastPhase) { audio.setMood(st.phase); lastPhase = st.phase; } // 시간대별 BGM 분위기
  if (!indoor) { applySky(scene, sun, hemi, st); weatherFX.update(dt, player.x, player.z, st.weather); weatherEvents.update(dt, st, player.x, player.z); }
  clockEl.textContent = `${st.season} ${st.dayOfSeason + 1}일 · ${clockText(st.hour)} ${st.weather === 'clear' && st.phase === 'night' ? '🌙' : WEA[st.weather]}`;

  // 카메라 수평 회전(Q/E)
  if (!chatting) { if (input.has('KeyQ')) follow.rotate(1.8 * dt); if (input.has('KeyE')) follow.rotate(-1.8 * dt); }
  const frozen = fishing || uiOpen() || chatting;
  if (!frozen) player.update(dt, input, follow.yaw);
  { const dm = Math.hypot(player.x - lastPX, player.z - lastPZ); if (dm > 0.0005) { stepAcc += dm; if (stepAcc > 0.85) { audio.step(); stepAcc = 0; } } lastPX = player.x; lastPZ = player.z; }
  for (const n of npcs) n.update(dt, frozen);
  if (indoor && interior && interior._char) { // 실내 주민: 표정 + 말하는 입
    updateFace(interior._char, dt, interior._talk > 0 ? 'happy' : 'neutral');
    const mz = interior._char.userData.muzzle;
    if (mz) { if (interior._talk > 0) { interior._talk -= dt; mz.scale.y = 0.8 + Math.abs(Math.sin(clock.elapsedTime * 10)) * 0.35; } else mz.scale.y += (0.8 - mz.scale.y) * 0.3; }
  }
  updateBugs(bugs, clock.elapsedTime, dt);
  if (placeMode.id && placeMode.ghost) { // 배치 미리보기를 앞 칸으로
    if (indoor) { const s = frontSpot(); placeMode.ghost.visible = Math.abs(s.x) <= 2.8 && Math.abs(s.z) <= 2.8; placeMode.ghost.position.set(s.x, 0, s.z); }
    else { const c = frontCell(); if (c) { const w = gridToWorld(c.gx, c.gz); placeMode.ghost.visible = true; placeMode.ghost.position.set(w.x, map.surfaceHeight(w.x, w.z), w.z); } else placeMode.ghost.visible = false; }
  }
  if (terra.on) { // 터레이닝 앞칸 하이라이트
    const c = frontCell();
    if (c) { const w = gridToWorld(c.gx, c.gz); terraHi.visible = true; terraHi.position.set(w.x, c.height * CONFIG.LEVEL_H + 0.14, w.z); }
    else terraHi.visible = false;
  } else terraHi.visible = false;
  if (sea) { // 물결 애니메이션(로컬 z가 월드 y)
    const t = clock.elapsedTime, p = sea.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.25 + t) * 0.12 + Math.cos(p.getY(i) * 0.3 + t * 0.9) * 0.12);
    p.needsUpdate = true;
  }
  if (waterfallObj && waterfallObj.userData.tex) waterfallObj.userData.tex.offset.y = (clock.elapsedTime * 1.6) % 1; // 폭포 낙하 스크롤
  // 채집 흔들기 + 스폰 팝 + 산들바람 흔들림(juice)
  const et = clock.elapsedTime;
  for (const grp of [objGroup, plantsGroup]) for (const m of grp.children) {
    if (m.userData.shake > 0) {
      m.userData.shake -= dt;
      m.rotation.z = Math.sin(et * 40) * Math.max(0, m.userData.shake) * 0.4;
      if (m.userData.shake <= 0) m.rotation.z = 0;
    } else if (m.userData.sway) { // 꽃·풀 산들바람
      m.rotation.z = Math.sin(et * 1.6 + m.position.x * 0.5) * 0.06;
    }
  }
  for (const grp of [plantsGroup, placedGroup, (indoor && interior && interior._items)].filter(Boolean)) for (const m of grp.children) {
    if (m.userData.pop > 0) { // 생성 팝(오버슈트)
      m.userData.pop -= dt; const t = 1 - Math.max(0, m.userData.pop) / 0.34;
      const c1 = 1.70158, c3 = c1 + 1, s = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      m.scale.setScalar(Math.max(0.01, s));
      if (m.userData.pop <= 0) m.scale.setScalar(1);
    }
  }
  follow.update(dt, player.group.position);
  remotes.update(dt);
  if (online && net && !frozen && (player.x !== sentX || player.z !== sentZ)) {
    moveT += dt;
    if (moveT > 0.06) { net.emit('move', { x: player.x, z: player.z, face: player.face }); sentX = player.x; sentZ = player.z; moveT = 0; }
  }
  const it = frozen ? null : nearestInteract();
  const PT = { npc: '대화하기', house: '집 들어가기', vhouse: '집 방문하기', hitem: '가구 회수', exit: '밖으로 나가기', chest_i: '보관함 열기', shop: '상점 열기', bench: '제작하기', museum: '기증하기', placed: (it && it.obj && it.obj.id === 'chest') ? '보관함 열기' : '가구 회수', plant: '수확하기', fish: '낚시하기', bug: '곤충 잡기', fossil: '땅 파기', shell: '조개 줍기', tree: '나무 흔들기', flower: '꽃 줍기', stone: '돌 캐기' };
  if (it) { prompt.textContent = 'Space : ' + PT[it.kind]; prompt.style.display = 'block'; }
  else if (!indoor && weatherEvents.starVisible) { prompt.textContent = '🌠 별똥별!  F : 소원 빌기'; prompt.style.display = 'block'; }
  else prompt.style.display = 'none';
  saveT += dt; if (saveT > 3) { writeSave(snapshot()); saveT = 0; } // 3초마다 자동저장
  miniT += dt; if (miniT > 0.2) { drawMinimap(); miniT = 0; } // 미니맵 5fps
  renderer.render(scene, camera);
}
loop();

// ---- 멀티플레이 연결 + 방(초대코드) ----
const remotes = new RemotePlayers(scene, null);
const lobby = document.getElementById('lobby');
const nickInput = document.getElementById('nick');
const codeInput = document.getElementById('joincode');
const roomHud = document.getElementById('roomcode');
function updateRoomHud() { if (roomHud) roomHud.textContent = curRoom ? (curRoom === myCode ? '🏠 내 섬 · ' + curRoom : '✈️ ' + curRoom) : ''; }

// 방 입장(내 코드 or 친구 코드)
function joinRoom(code) {
  audio.init();
  myName = (nickInput && nickInput.value.trim()) || myName || ('여행자' + (100 + Math.floor(Math.random() * 900)));
  curRoom = String(code || myCode).toUpperCase();
  if (lobby) lobby.classList.add('hidden');
  net.emit('joinRoom', { room: curRoom, name: myName, appearance, x: player ? player.x : 0, z: player ? player.z : 0 });
  writeSave(snapshot());
}
// 방 진입/전환 처리(welcome)
function enterRoom(d) {
  myId = d.id; curRoom = d.room;
  if (!started) { startGame(d.seed, true); } else { buildWorld(d.seed); online = true; } // 첫 입장=복원, 전환=섬만 교체
  remotes.setMap(map); remotes.clear();
  if (d.time) { clock2.day = d.time.day; clock2.hour = d.time.hour; lastDay = clock2.day; }
  if (Array.isArray(d.edits) && d.edits.length) { for (const e of d.edits) applyTerraEdit(e.gx, e.gz, e.height, e.terrain, e.ramp); rebuildTerrain(); } // 서버 지형 편집 반영
  if (Array.isArray(d.residents) && d.residents.length) applyRoster(d.residents, false); // 서버 거주 주민 반영(입장 시 토스트 없음)
  (d.players || []).forEach((p) => remotes.add(p));
  (d.placed || []).forEach((p) => { const c = map.cell(p.gx, p.gz); if (c && !c.placed) placeFurniture(c, p.id, p.design); });
  (d.plants || []).forEach((p) => plantAt(p.gx, p.gz, p.day, p.kind));
  if (d.consumed) for (const kind of ['flower', 'bug', 'fossil', 'shell']) (d.consumed[kind] || []).forEach((k) => applyCollected(kind, k));
  renderPlaceBar(); updateRoomHud();
}

net = connectNet({
  connected: () => {
    if (started) net.emit('joinRoom', { room: curRoom, name: myName, appearance, x: player.x, z: player.z }); // 재연결 시 방 복귀
    else { if (nickInput && saved && saved.name) nickInput.value = saved.name; const el = document.getElementById('mycode'); if (el) el.textContent = myCode; if (lobby) lobby.classList.remove('hidden'); }
  },
  welcome: (d) => enterRoom(d),
  offline: () => {
    if (started) return;
    myName = (saved && saved.name) || '여행자';
    if (lobby) lobby.classList.add('hidden');
    startGame(saved && saved.seed != null ? saved.seed : CONFIG.SEED, false);
    addEventListener('pointerdown', () => audio.init(), { once: true }); // 오프라인: 첫 클릭에 오디오 시작
  },
  joined: (p) => remotes.add(p),
  moved: (d) => remotes.move(d),
  left: (d) => remotes.remove(d.id),
  reseed: (d) => { buildWorld(d.seed); remotes.setMap(map); lastDay = clock2.day; renderPlaceBar(); writeSave(snapshot()); },
  placed: (d) => { const c = map.cell(d.gx, d.gz); if (c && !c.placed) placeFurniture(c, d.id, d.design); },
  removed: (d) => {
    const p = placedList.find((x) => x.gx === d.gx && x.gz === d.gz);
    if (p) { placedGroup.remove(p.mesh); const c = map.cell(d.gx, d.gz); if (c) c.placed = null; placedList = placedList.filter((x) => x !== p); }
  },
  collected: (d) => applyCollected(d.kind, d.key),
  planted: (d) => plantAt(d.gx, d.gz, d.day, d.kind),
  harvested: (d) => removePlantAt(d.gx, d.gz),
  time: (d) => { if (online) { clock2.day = d.day; clock2.hour = d.hour; } },
  chat: (d) => onChat(d),
  mailReceived: (d) => { inv.add(d.item, 1); const i = info(d.item); inv.toast(`📬 ${d.from}: ${i ? i.emoji + i.name : d.item}`); renderPlaceBar(); writeSave(snapshot()); },
  emote: (d) => { audio.emote(); remotes.bubble(d.id, d.emoji); },
  terraformed: (d) => { applyTerraEdit(d.gx, d.gz, d.height, d.terrain, d.ramp); rebuildTerrain(); },
  villagers: (d) => { if (Array.isArray(d.residents)) applyRoster(d.residents, true); },
});

// 로비 & 방 이동 버튼
const onClick = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
onClick('lobby-home', () => joinRoom(myCode));
onClick('lobby-visit', () => { const c = (codeInput && codeInput.value || '').trim(); if (c) joinRoom(c); });
onClick('gohome', () => joinRoom(myCode));
onClick('govisit', () => { const c = window.prompt('방문할 초대코드:'); if (c && c.trim()) joinRoom(c.trim()); });

// ---- 리액션(이모트) + 접속자 목록 + 음소거 ----
const EMOTES = ['👋', '❤️', '😆', '😮', '😢', '👍'];
const EMOTE_POSE = { '👋': 'wave', '❤️': 'up', '😆': 'jump', '😮': 'ohh', '😢': 'sad', '👍': 'up' };
function doEmote(emoji) {
  if (!emoji || chatting) return;
  audio.emote();
  attachBubble(player.group, emoji);
  if (player.doPose) player.doPose(EMOTE_POSE[emoji] || 'up'); // 전신 리액션 포즈
  if (online && net) net.emit('emote', { emoji });
}
const reactBar = document.getElementById('reactbar');
if (reactBar) EMOTES.forEach((em, i) => {
  const b = document.createElement('button'); b.textContent = em; b.title = `리액션 (${i + 1})`;
  b.onclick = () => doEmote(em); reactBar.appendChild(b);
});
addEventListener('keydown', (e) => { // 숫자키 1~6 = 리액션
  if (chatting || uiOpen()) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= EMOTES.length) doEmote(EMOTES[n - 1]);
});

const plEl = document.getElementById('playerlist');
let plOpen = false;
function renderPlayerList() {
  if (!plEl) return;
  const others = online ? remotes.list() : [];
  const rows = [`<div class="plrow me">🏠 ${myName || '나'} (나)</div>`]
    .concat(others.map((p) => `<div class="plrow">🙂 ${p.name}</div>`));
  plEl.innerHTML = `<div class="pltitle">접속자 ${1 + others.length}</div>` + rows.join('');
}
function togglePlayerList() { plOpen = !plOpen; if (plEl) plEl.style.display = plOpen ? 'block' : 'none'; if (plOpen) renderPlayerList(); }
onClick('playersbtn', () => { audio.ui(); togglePlayerList(); });
setInterval(() => { if (plOpen) renderPlayerList(); }, 1500); // 열려있는 동안 입퇴장 반영

onClick('mutebtn', () => {
  audio.init();
  const muted = audio.toggleMute();
  const el = document.getElementById('mutebtn'); if (el) el.textContent = muted ? '🔇' : '🔊';
});

// 터레이닝 토글 + 툴 선택
const terraBar = document.getElementById('terrabar');
const terraBtn = document.getElementById('terrabtn');
function setTerra(on) {
  terra.on = on;
  if (terraBar) terraBar.classList.toggle('hidden', !on);
  if (terraBtn) terraBtn.classList.toggle('on', on);
  if (on) cancelPlacing(); // 배치모드와 동시 사용 금지
  if (terraHi) terraHi.visible = false;
}
onClick('terrabtn', () => { audio.ui(); setTerra(!terra.on); });
if (terraBar) terraBar.querySelectorAll('button').forEach((b) => b.onclick = () => {
  terra.tool = b.dataset.tool; audio.ui();
  terraBar.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
});

window.__game = {
  get map() { return map; }, get player() { return player; }, get npcs() { return npcs; }, get friendship() { return friendship; },
  get bugs() { return bugs; }, get fossils() { return fossils; }, get money() { return money; },
  get shop() { return shopWorld; }, get bench() { return benchWorld; }, get museum() { return museumWorld; },
  get collection() { return collection; }, get inv() { return inv; },
  get placed() { return placedList; }, get placeMode() { return placeMode; },
  get plants() { return plants; }, get storage() { return storage; }, get shells() { return shells; },
  get roster() { return roster; }, rotateVillagers: () => { if (online && net) net.emit('rotateVillagers'); else rotateRosterLocal(); }, runBreeding, weatherEvents,
  get indoor() { return indoor; }, get house() { return houseWorld; },
  get online() { return online; }, get remotes() { return remotes; }, get net() { return net; }, get design() { return design; }, mailPanel, designPanel,
  shopPanel, logPanel, craftPanel, museumPanel, storagePanel, craft, donate, startFishing, startPlacing, growPlants, plantSeed, enterHouse, exitHouse, camera, follow, clock: clock2,
};
