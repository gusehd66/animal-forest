// 규칙 기반(시드) 오브젝트 배치. 맵 셀에 cell.object 기록 + 배치 목록 반환.
// 완전 랜덤이 아니라: 나무=grass·2칸간격, 돌=절벽/물가 가중, 꽃=군집, 램프/스폰 인접 금지.
import { mulberry32 } from './rng.js';

export function placeObjects(map) {
  const rng = mulberry32((map.seed ^ 0x9e3779b9) >>> 0);
  const G = map.G;
  const objects = [];
  const sc = map.cellAtWorld(map.spawn.x, map.spawn.z);

  const grassFree = (gx, gz) => {
    const c = map.cell(gx, gz);
    return c && c.terrain === 'grass' && c.walkable && !c.ramp && !c.object;
  };
  const guarded = (gx, gz) => {
    if (sc && Math.abs(gx - sc.gx) <= 1 && Math.abs(gz - sc.gz) <= 1) return true; // 스폰 보호
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const c = map.cell(gx + dx, gz + dz); if (c && c.ramp) return true;         // 램프 인접 금지
    }
    return false;
  };
  const put = (gx, gz, type, solid, extra = {}) => {
    map.cell(gx, gz).object = { type, solid, ...extra };
    objects.push({ gx, gz, type, ...extra });
  };
  const rc = (n) => 1 + Math.floor(rng() * (G - 2 - (n || 0)));

  // 나무 10: grass, 서로 2칸 이상
  const trees = [];
  for (let t = 0; t < 2000 && trees.length < 10; t++) {
    const gx = rc(), gz = rc();
    if (!grassFree(gx, gz) || guarded(gx, gz)) continue;
    if (trees.some(o => Math.abs(o.gx - gx) < 2 && Math.abs(o.gz - gz) < 2)) continue;
    put(gx, gz, 'tree', true, { v: rng() }); trees.push({ gx, gz });
  }

  // 돌 5: 절벽/물가 인접이면 통과율↑
  let stones = 0;
  for (let t = 0; t < 2000 && stones < 5; t++) {
    const gx = rc(), gz = rc(), c = map.cell(gx, gz);
    if (!c || !(c.terrain === 'grass' || c.terrain === 'sand') || !c.walkable || c.ramp || c.object || guarded(gx, gz)) continue;
    let bonus = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = map.cell(gx + dx, gz + dz);
      if (!n || n.terrain === 'water' || n.height < c.height) bonus += 0.35;
    }
    if (rng() > 0.15 + bonus) continue;
    put(gx, gz, 'stone', true, { v: rng() }); stones++;
  }

  // 꽃 5군집(각 2~5개, 같은 색)
  let clusters = 0;
  for (let t = 0; t < 500 && clusters < 5; t++) {
    const cx = 2 + Math.floor(rng() * (G - 4)), cz = 2 + Math.floor(rng() * (G - 4));
    if (!grassFree(cx, cz) || guarded(cx, cz)) continue;
    const want = 2 + Math.floor(rng() * 4), hue = Math.floor(rng() * 5);
    let placed = 0;
    for (let a = 0; a < 14 && placed < want; a++) {
      const gx = cx + Math.floor(rng() * 3) - 1, gz = cz + Math.floor(rng() * 3) - 1;
      if (!grassFree(gx, gz)) continue;
      put(gx, gz, 'flower', false, { hue, v: rng() }); placed++;
    }
    if (placed) clusters++;
  }

  // 풀 장식(비충돌) 30
  for (let t = 0, n = 0; t < 800 && n < 30; t++) {
    const gx = rc(), gz = rc();
    if (!grassFree(gx, gz)) continue;
    put(gx, gz, 'tuft', false, { v: rng() }); n++;
  }

  map.objects = objects;
  return objects;
}
