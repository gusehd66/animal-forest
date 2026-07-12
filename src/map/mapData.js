// 맵 = 순수 데이터(Cell 그리드). 렌더/충돌/멀티가 모두 이 데이터를 소스로 삼는다.
// Cell: { gx, gz, height(레벨 정수), terrain, walkable, ramp, rampFrom/To/Dir }
import { CONFIG, gridToWorld, worldToGrid } from '../config.js';
import { mulberry32 } from './rng.js';

export class GameMap {
  constructor(seed = CONFIG.SEED) {
    this.seed = seed;
    this.G = CONFIG.GRID;
    this.cells = [];
    this._generate(seed);
  }

  _generate(seed) {
    const rnd = mulberry32(seed);
    const G = this.G, c = G / 2 - 0.5, R = G * 0.42;
    // 섬 가장자리를 유기적으로 흔드는 각도별 노이즈(그리드 양자화되지만 둥근 섬)
    const wob = Array.from({ length: 16 }, () => (rnd() - 0.5) * 3.2);

    for (let gz = 0; gz < G; gz++) {
      const row = [];
      for (let gx = 0; gx < G; gx++) {
        const dx = gx - c, dz = gz - c, d = Math.hypot(dx, dz);
        const ang = Math.atan2(dz, dx);
        const edge = R + wob[Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 16) % 16];
        let terrain = 'grass', walkable = true;
        if (d > edge) { terrain = 'water'; walkable = false; }
        else if (d > edge - 1.7) terrain = 'sand';
        row.push({ gx, gz, height: 0, terrain, walkable, ramp: false });
      }
      this.cells.push(row);
    }

    // 고원(레벨1): 북쪽 grass 사각 영역
    for (let gz = 6; gz <= 11; gz++)
      for (let gx = 10; gx <= 17; gx++) {
        const cl = this.cells[gz]?.[gx];
        if (cl && cl.terrain === 'grass') cl.height = 1;
      }

    // 램프 1개: 고원 남쪽 한 칸(gx=13, gz=12)을 레벨0→1로 연결(N방향으로 오르막)
    const rc = this.cells[12]?.[13];
    if (rc && rc.terrain === 'grass') {
      rc.ramp = true; rc.rampFrom = 0; rc.rampTo = 1; rc.rampDir = 'N';
    }

    // 고원 위 연못(레벨1) — 서쪽 가장자리(gx10)에서 낮은 지면으로 폭포가 떨어진다
    for (let gz = 7; gz <= 9; gz++)
      for (let gx = 10; gx <= 11; gx++) {
        const cl = this.cells[gz]?.[gx];
        if (cl && cl.terrain === 'grass' && cl.height === 1 && !cl.ramp) { cl.terrain = 'water'; cl.walkable = false; }
      }

    // 길: 스폰 → 램프 입구로 L자(잔디만 path로 전환, walkable 유지)
    const setPath = (gx, gz) => { const c = this.cell(gx, gz); if (c && c.terrain === 'grass' && !c.ramp) c.terrain = 'path'; };
    for (let gz = 22; gz >= 14; gz--) setPath(16, gz);
    for (let gx = 16; gx >= 13; gx--) setPath(gx, 14);
    setPath(13, 13);

    this.spawn = gridToWorld(16, 22); // 남쪽 길 위 스폰
  }

  inBounds(gx, gz) { return gx >= 0 && gz >= 0 && gx < this.G && gz < this.G; }
  cell(gx, gz) { return this.inBounds(gx, gz) ? this.cells[gz][gx] : null; }
  cellAtWorld(x, z) { const { gx, gz } = worldToGrid(x, z); return this.cell(gx, gz); }

  // 셀의 표면 높이(world y). 램프는 셀 안 위치에 따라 선형 보간.
  surfaceHeight(x, z) {
    const cl = this.cellAtWorld(x, z);
    if (!cl) return 0;
    if (cl.ramp) {
      const ctr = gridToWorld(cl.gx, cl.gz), T = CONFIG.TILE;
      // rampDir = 오르막(높은) 방향. 그 방향 끝에서 t=1(rampTo), 반대쪽 t=0(rampFrom).
      let t;
      switch (cl.rampDir) {
        case 'S': t = (z - (ctr.z - T / 2)) / T; break;   // 남(+z)이 높음
        case 'E': t = (x - (ctr.x - T / 2)) / T; break;   // 동(+x)이 높음
        case 'W': t = (ctr.x + T / 2 - x) / T; break;     // 서(-x)이 높음
        default: t = (ctr.z + T / 2 - z) / T;             // 'N': 북(-z)이 높음
      }
      t = Math.min(1, Math.max(0, t));
      return (cl.rampFrom + t * (cl.rampTo - cl.rampFrom)) * CONFIG.LEVEL_H;
    }
    return cl.height * CONFIG.LEVEL_H;
  }

  walkableAtWorld(x, z) { const cl = this.cellAtWorld(x, z); return !!(cl && cl.walkable); }

  // 이동 불가: 지형 non-walkable(물 등) / solid 오브젝트(나무·돌) / 배치 가구.
  blockedAtWorld(x, z) {
    const cl = this.cellAtWorld(x, z);
    if (!cl || !cl.walkable) return true;
    if (cl.object && cl.object.solid) return true;
    return !!(cl.placed && cl.placed.solid);
  }
}
