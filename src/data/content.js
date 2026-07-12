// 아이템/물고기/곤충 데이터 + 조회 헬퍼. 순수 데이터(멀티/저장에 그대로 씀).
export const MATERIALS = [
  { id: 'apple', name: '사과', emoji: '🍎', price: 120 },
  { id: 'orange', name: '오렌지', emoji: '🍊', price: 120 },
  { id: 'cherry', name: '체리', emoji: '🍒', price: 140 },
  { id: 'flower', name: '꽃', emoji: '🌸', price: 80 },
  { id: 'stone', name: '돌', emoji: '🪨', price: 60 },
  { id: 'iron', name: '철광석', emoji: '⚙️', price: 220 },
  { id: 'wood', name: '나무', emoji: '🪵', price: 60 },
  { id: 'seed', name: '꽃씨', emoji: '🌰', price: 20 },
  { id: 'sapling', name: '묘목', emoji: '🌱', price: 60 },
  { id: 'shell', name: '조개', emoji: '🐚', price: 90 },
  { id: 'starfish', name: '불가사리', emoji: '⭐', price: 150 },
  { id: 'star_fragment', name: '별조각', emoji: '🌟', price: 300 },
];

export const BEACH = ['shell', 'starfish']; // 해변에서 줍는 것

export const FRUITS = ['apple', 'orange', 'cherry']; // 나무를 흔들면 나오는 과일

// 화석: 땅파기로 획득 → 판매/기증
export const FOSSILS = [
  { id: 'ammonite', name: '암모나이트', emoji: '🐚', price: 1100 },
  { id: 'trilobite', name: '삼엽충', emoji: '🐛', price: 1300 },
  { id: 'dino_egg', name: '공룡알', emoji: '🥚', price: 2000 },
  { id: 'amber', name: '호박(琥珀)', emoji: '🟠', price: 1200 },
  { id: 'mammoth', name: '매머드 엄니', emoji: '🦣', price: 3000 },
  { id: 'tyranno', name: '티라노 두개골', emoji: '🦖', price: 5000 },
];

// 도구: 제작대에서 제작(비매품 price 0). shovel은 화석 채굴에 필요.
export const TOOLS = [
  { id: 'shovel', name: '삽', emoji: '⛏️', price: 0 },
  { id: 'net', name: '그물', emoji: '🥅', price: 0 },
  { id: 'rod', name: '낚싯대', emoji: '🎣', price: 0 },
];

// 배치 가구: 그리드 셀에 놓음(solid=이동 막음). 제작/판매 가능.
export const FURNITURE = [
  { id: 'chair', name: '의자', emoji: '🪑', price: 200, solid: true },
  { id: 'table', name: '테이블', emoji: '🍽️', price: 260, solid: true },
  { id: 'lamp', name: '가로등', emoji: '🏮', price: 300, solid: true },
  { id: 'campfire', name: '모닥불', emoji: '🔥', price: 350, solid: true },
  { id: 'fence', name: '울타리', emoji: '🚧', price: 90, solid: true },
  { id: 'chest', name: '보관함', emoji: '📦', price: 400, solid: true, storage: true },
  { id: 'flag', name: '디자인 깃발', emoji: '🚩', price: 150, solid: true, design: true },
  { id: 'bench', name: '벤치', emoji: '🪑', price: 240, solid: true },
  { id: 'well', name: '우물', emoji: '⛲', price: 500, solid: true },
  { id: 'bush', name: '관목', emoji: '🌳', price: 120, solid: true },
  { id: 'bed', name: '침대', emoji: '🛏️', price: 480, solid: true },
  { id: 'sofa', name: '소파', emoji: '🛋️', price: 420, solid: true },
  { id: 'bookshelf', name: '책장', emoji: '📚', price: 360, solid: true },
  { id: 'tv', name: 'TV', emoji: '📺', price: 550, solid: true },
  { id: 'rug', name: '러그', emoji: '🟥', price: 160, solid: false },
  { id: 'pottedplant', name: '화분', emoji: '🪴', price: 180, solid: true },
  { id: 'clock', name: '괘종시계', emoji: '🕰️', price: 300, solid: true },
  { id: 'barrel', name: '나무통', emoji: '🛢️', price: 140, solid: true },
  { id: 'stool', name: '스툴', emoji: '🩹', price: 150, solid: true },
  { id: 'easel', name: '이젤', emoji: '🎨', price: 340, solid: true },
  { id: 'streetlamp', name: '가로등(키큰)', emoji: '💡', price: 400, solid: true },
];

// DIY 레시피: result = id, mats = 필요 재료 (도구 + 가구)
export const RECIPES = [
  { id: 'shovel', mats: { wood: 1, stone: 1 } },
  { id: 'net', mats: { wood: 2 } },
  { id: 'rod', mats: { wood: 2, stone: 1 } },
  { id: 'chair', mats: { wood: 2 } },
  { id: 'table', mats: { wood: 3 } },
  { id: 'lamp', mats: { wood: 1, stone: 1 } },
  { id: 'campfire', mats: { wood: 2, stone: 2 } },
  { id: 'fence', mats: { wood: 1 } },
  { id: 'chest', mats: { wood: 4 } },
  { id: 'flag', mats: { wood: 2 } },
  { id: 'bench', mats: { wood: 3, stone: 1 } },
  { id: 'well', mats: { stone: 4, iron: 1 } },
  { id: 'bush', mats: { wood: 1 } },
  { id: 'bed', mats: { wood: 5 } },
  { id: 'sofa', mats: { wood: 4 } },
  { id: 'bookshelf', mats: { wood: 4 } },
  { id: 'tv', mats: { iron: 2, stone: 1 } },
  { id: 'rug', mats: { wood: 1 } },
  { id: 'pottedplant', mats: { wood: 1, flower: 1 } },
  { id: 'clock', mats: { wood: 2, iron: 1 } },
  { id: 'barrel', mats: { wood: 2 } },
  { id: 'stool', mats: { wood: 1 } },
  { id: 'easel', mats: { wood: 3 } },
  { id: 'streetlamp', mats: { iron: 2 } },
];

// 상점 구매 목록: 벨로 살 수 있는 것 { id, price(구매가) }
export const SHOP_STOCK = [
  { id: 'seed', price: 40 },
  { id: 'sapling', price: 120 },
  { id: 'shovel', price: 500 },
  { id: 'net', price: 500 },
  { id: 'rod', price: 500 },
  { id: 'chair', price: 400 },
  { id: 'table', price: 520 },
  { id: 'lamp', price: 600 },
  { id: 'flag', price: 300 },
  { id: 'bush', price: 240 },
  { id: 'bed', price: 900 },
  { id: 'sofa', price: 800 },
  { id: 'bookshelf', price: 700 },
  { id: 'tv', price: 1100 },
  { id: 'rug', price: 320 },
  { id: 'pottedplant', price: 360 },
  { id: 'clock', price: 600 },
  { id: 'barrel', price: 280 },
  { id: 'easel', price: 680 },
];

// time: any | day | night, weight: 흔할수록 큼
export const FISH = [
  { id: 'crucian', name: '붕어', emoji: '🐟', price: 160, seasons: ['봄', '여름', '가을', '겨울'], time: 'any', weight: 10 },
  { id: 'koi', name: '잉어', emoji: '🎏', price: 300, seasons: ['봄', '여름', '가을'], time: 'day', weight: 6 },
  { id: 'bass', name: '배스', emoji: '🐟', price: 400, seasons: ['봄', '여름', '가을'], time: 'any', weight: 5 },
  { id: 'catfish', name: '메기', emoji: '🐡', price: 800, seasons: ['여름', '가을'], time: 'night', weight: 3 },
  { id: 'killifish', name: '송사리', emoji: '🐟', price: 90, seasons: ['봄', '여름', '가을', '겨울'], time: 'any', weight: 10 },
  { id: 'eel', name: '뱀장어', emoji: '🐍', price: 2000, seasons: ['여름', '가을'], time: 'night', weight: 2 },
  { id: 'snapper', name: '도미', emoji: '🐠', price: 3000, seasons: ['여름'], time: 'any', weight: 1 },
  { id: 'sunfish', name: '개복치', emoji: '🐋', price: 4000, seasons: ['여름'], time: 'day', weight: 1 },
];

export const BUGS = [
  { id: 'butterfly', name: '노랑나비', emoji: '🦋', price: 160, seasons: ['봄', '여름'], weight: 10 },
  { id: 'ladybug', name: '무당벌레', emoji: '🐞', price: 200, seasons: ['봄', '여름', '가을'], weight: 8 },
  { id: 'dragonfly', name: '잠자리', emoji: '🪰', price: 180, seasons: ['여름', '가을'], weight: 6 },
  { id: 'mantis', name: '사마귀', emoji: '🦗', price: 430, seasons: ['가을'], weight: 4 },
  { id: 'cicada', name: '매미', emoji: '🐝', price: 300, seasons: ['여름'], weight: 7 },
  { id: 'firefly', name: '반딧불이', emoji: '✨', price: 300, seasons: ['봄', '여름'], weight: 4 },
  { id: 'beetle', name: '장수풍뎅이', emoji: '🪲', price: 1350, seasons: ['여름'], weight: 2 },
  { id: 'butterfly_m', name: '제왕나비', emoji: '🦋', price: 2000, seasons: ['가을'], weight: 1 },
];

const ALL = {};
[...MATERIALS, ...FISH, ...BUGS, ...FOSSILS, ...TOOLS, ...FURNITURE].forEach(x => { ALL[x.id] = x; });
const FURN_IDS = new Set(FURNITURE.map(f => f.id));
export function isFurniture(id) { return FURN_IDS.has(id); }

export function randomFossil(rnd) { return FOSSILS[Math.floor(rnd() * FOSSILS.length)]; }
export function info(id) { return ALL[id]; }
export function priceOf(id) { return (ALL[id] && ALL[id].price) || 0; }

export function availableFish(season, phase) {
  const night = phase === 'night';
  return FISH.filter(f => f.seasons.includes(season) &&
    (f.time === 'any' || (f.time === 'day' && !night) || (f.time === 'night' && night)));
}
export function availableBugs(season) { return BUGS.filter(b => b.seasons.includes(season)); }

export function pickWeighted(list, rnd) {
  if (!list.length) return null;
  const tot = list.reduce((s, x) => s + (x.weight || 1), 0);
  let r = rnd() * tot;
  for (const x of list) { r -= (x.weight || 1); if (r <= 0) return x; }
  return list[list.length - 1];
}
