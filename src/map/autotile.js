// 오토타일: 현재 셀과 이웃을 비교해 엣지/모서리/절벽면을 자동 선택.
// 핵심 아이디어 — 메시 종류를 늘리지 않고 "1종 + 회전"으로 방향을 처리한다.
import { DIRS } from '../config.js';

// 4방향(N,E,S,W) 이웃이 조건(pred)을 만족하는지 비트마스크로. bit0=N,1=E,2=S,3=W.
export function edgeMask(map, gx, gz, pred) {
  let m = 0;
  DIRS.forEach((d, i) => { if (pred(map.cell(gx + d.dx, gz + d.dz))) m |= (1 << i); });
  return m;
}

// 8방향 마스크(모서리 판정용). 0..7 = N,NE,E,SE,S,SW,W,NW.
const D8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
export function mask8(map, gx, gz, pred) {
  let m = 0;
  D8.forEach(([dx, dz], i) => { if (pred(map.cell(gx + dx, gz + dz))) m |= (1 << i); });
  return m;
}

// 절벽 옆면 위치 계산: 셀(height h)의 어떤 방향 이웃이 더 낮으면 그쪽에 옆면이 필요.
// 반환: [{ dir, rot, from, to, drop }] (from=위 높이, to=아래 높이)
export function cliffFaces(map, cell) {
  const faces = [];
  const h = cell.height;
  if (h <= 0) return faces;
  DIRS.forEach((d, i) => {
    const n = map.cell(cell.gx + d.dx, cell.gz + d.dz);
    // 램프로 연결된 방향은 벽 없음
    if (cell.ramp || (n && n.ramp)) return;
    const nh = n ? n.height : 0;   // 맵 밖/물 = 0(바다 레벨)
    if (nh < h) faces.push({ dir: i, rot: d.rot, dx: d.dx, dz: d.dz, from: h, to: nh, drop: h - nh });
  });
  return faces;
}

// 이웃 높이(램프는 같은 높이로 취급 → 그쪽은 깎지 않음). 맵 밖/물 = 0.
function nh(map, cell, dx, dz) {
  const n = map.cell(cell.gx + dx, cell.gz + dz);
  if (!n) return 0;
  return n.ramp ? cell.height : n.height;
}

// 볼록 코너(45°로 둥글게 깎을 곳): 두 직교 이웃이 모두 낮을 때.
// 반환: { NW, NE, SW, SE: bool, toLevel } — toLevel = 코너가 내려가는 낮은 레벨.
export function convexCorners(map, cell) {
  const h = cell.height;
  const r = { NW: false, NE: false, SW: false, SE: false, toN: 0, toE: 0, toS: 0, toW: 0 };
  if (h <= 0 || cell.ramp) return r;
  const N = nh(map, cell, 0, -1), S = nh(map, cell, 0, 1), E = nh(map, cell, 1, 0), W = nh(map, cell, -1, 0);
  r.NW = N < h && W < h; r.NE = N < h && E < h; r.SW = S < h && W < h; r.SE = S < h && E < h;
  r.toN = N; r.toE = E; r.toS = S; r.toW = W;
  return r;
}
