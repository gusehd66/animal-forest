// 전역 상수 + grid↔world 좌표 변환 + 방향 테이블.
// 내부는 그리드(셀), 화면은 world 좌표. 이 파일이 둘의 유일한 다리.

export const CONFIG = {
  GRID: 32,        // 32x32 셀
  TILE: 2,         // 셀 한 변의 world 크기 → 섬 전체 64x64
  LEVEL_H: 1.8,    // 절벽 한 단(레벨) 높이
  WATER_DROP: 0.28, // 물 표면이 같은 레벨 지면보다 낮게 들어간 깊이(바다 y=-0.28과 일치)
  SEED: 20260705,  // 기본 시드(재현/멀티 대비)
  STEP: 0.6,       // 한 프레임에 넘을 수 있는 높이차(절벽 차단, 램프 통과)
  colors: {
    grass: 0x84c65a, grass2: 0x74b64c,
    sand: 0xe7d7a6, water: 0x49a6d6,
    cliff: 0xc7a06e, lip: 0x84c65a,
  },
  camera: { fov: 42, offset: [0, 19, 17] },
};

// 4방향(북,동,남,서). +z가 남쪽(화면 앞). rot = 옆면/엣지 메시 회전각.
export const DIRS = [
  { dx: 0, dz: -1, rot: 0 },            // N
  { dx: 1, dz: 0, rot: -Math.PI / 2 },  // E
  { dx: 0, dz: 1, rot: Math.PI },       // S
  { dx: -1, dz: 0, rot: Math.PI / 2 },  // W
];

const half = () => CONFIG.GRID / 2;

export function gridToWorld(gx, gz) {
  return { x: (gx - half() + 0.5) * CONFIG.TILE, z: (gz - half() + 0.5) * CONFIG.TILE };
}

export function worldToGrid(x, z) {
  return {
    gx: Math.floor(x / CONFIG.TILE + half()),
    gz: Math.floor(z / CONFIG.TILE + half()),
  };
}
