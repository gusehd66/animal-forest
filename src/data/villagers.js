// 주민 데이터: 성격/외형/좋아하는 선물/친밀도별 인사말.
export const PERSON_EMOJI = { 명랑: '😄', 무뚝뚝: '😑', 느긋: '😌' };

export const VILLAGERS = [
  {
    id: 'tori', name: '토리', personality: '명랑', color: 0x6cc3e0, ear: 0xf7c98f, likes: 'flower', catch: '룰루~',
    greet: {
      low: ['안녕! 이 섬에 온 걸 환영해 🐰', '난 토리야. 잘 지내보자!'],
      mid: ['또 왔구나! 반가워 😊', '오늘 날씨 좋다, 그치?'],
      high: ['제일 친한 친구가 왔네! 💕', '너랑 얘기하는 게 제일 즐거워!'],
    },
  },
  {
    id: 'kkuk', name: '꾹이', personality: '무뚝뚝', color: 0x8a8f98, ear: 0x8a8f98, likes: 'stone', catch: '흥.',
    greet: {
      low: ['...왜.', '용건 있어?'],
      mid: ['또 너냐. 뭐, 나쁘진 않아.', '흠.'],
      high: ['너라면… 뭐, 얘기해도 좋아.', '의외로 네가 편하네.'],
    },
  },
  {
    id: 'monge', name: '몽이', personality: '느긋', color: 0xf0a05a, ear: 0xf0a05a, likes: 'apple', catch: '…냥',
    greet: {
      low: ['하암~ 안녕...', '천천히 쉬다 가~'],
      mid: ['같이 낮잠 잘래~?', '급할 거 없잖아~'],
      high: ['너랑 있으면 진짜 편해~ 💛', '우리 완전 친하지~'],
    },
  },
  {
    id: 'bibi', name: '비비', personality: '명랑', color: 0xf58fb0, ear: 0xffe0ec, likes: 'cherry', catch: '꺄항!',
    greet: {
      low: ['우와, 새 얼굴! 반가워~ 🌸', '난 비비! 친하게 지내자!'],
      mid: ['오늘도 신난다~ 같이 놀자!', '너 보면 기분 좋아져 😆'],
      high: ['베프한테만 하는 얘긴데~ 💖', '너 없으면 심심해 죽어!'],
    },
  },
  {
    id: 'doran', name: '도란', personality: '무뚝뚝', color: 0x7a9e6b, ear: 0x5f7d54, likes: 'iron', catch: '쯧.',
    greet: {
      low: ['새로 왔군. ...적당히 해.', '난 도란. 그뿐이야.'],
      mid: ['왔나. 뭐, 앉든가.', '너 은근 끈질기네.'],
      high: ['너한테만은 솔직해질 수 있어.', '…친구, 라고 해두지.'],
    },
  },
  {
    id: 'poro', name: '포로', personality: '느긋', color: 0xc9a6e0, ear: 0xc9a6e0, likes: 'fish', catch: '음냐~',
    greet: {
      low: ['음냐… 누구세요~', '느긋하게~ 잘 부탁해~'],
      mid: ['구름 보러 안 갈래~?', '서두르면 지는 거야~'],
      high: ['너랑 있는 시간이 젤 좋아~ 💜', '우린 찰떡궁합이지~'],
    },
  },
];

// 성격별 화제(날씨·잡담) — 대화에 다양성을 준다
const WEATHER = {
  rain: ['비 오는 날은 좀 나른해.', '우산 챙겼어? 비 와.', '빗소리 듣는 거 좋아하네.'],
  snow: ['눈이다! 예쁘지 않아?', '추워… 손이 시려.', '눈사람 만들래?'],
  night: ['별이 잘 보이는 밤이야.', '밤엔 조용해서 좋아.', '이 시간까지 안 자고 뭐 해~?'],
};
const SEASON_CLEAR = {
  '봄': ['벚꽃 피는 계절이야~', '봄바람이 살랑살랑 좋다.'],
  '여름': ['더워 죽겠어~ 물놀이나 할까?', '여름엔 곤충이 많아!'],
  '가을': ['단풍이 참 곱네.', '가을엔 낚시가 잘 돼.'],
  '겨울': ['공기가 맑고 상쾌해.', '따뜻한 거 마시고 싶다~'],
};
const HOBBY = {
  명랑: ['오늘 뭐 재밌는 일 없나~?', '같이 놀 사람 어디 없나!', '몸이 근질근질해~'],
  무뚝뚝: ['혼자가 편해. …가끔은.', '운동이나 하러 갈까.', '쓸데없는 잡담은 싫어.'],
  느긋: ['낮잠이 최고야~', '차 한 잔 하고 싶다~', '뭐든 천천히 하면 돼.'],
};

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function greetPool(v, level) { return level >= 4 ? v.greet.high : level >= 2 ? v.greet.mid : v.greet.low; }
function withCatch(v, line) { return v.catch && Math.random() < 0.5 ? `${line} ${v.catch}` : line; }

export function greetLine(v, level) { return withCatch(v, pick(greetPool(v, level))); }

// 화제 섞은 대화 한 줄. ctx = { season, phase('day'|'night'), weather, other(다른 주민 이름) }
export function dialogueLine(v, level, ctx = {}) {
  const pools = [greetPool(v, level), HOBBY[v.personality] || []];
  if (ctx.weather === 'rain' || ctx.weather === 'snow') pools.push(WEATHER[ctx.weather]);
  else if (ctx.phase === 'night') pools.push(WEATHER.night);
  else if (ctx.season && SEASON_CLEAR[ctx.season]) pools.push(SEASON_CLEAR[ctx.season]);
  if (ctx.other) pools.push([`${ctx.other} 요즘 봤어? 기분 좋아 보이더라.`, `${ctx.other}랑 얘기해봤어? 재밌는 애야.`, `${ctx.other}이(가) 네 얘기 하던데?`]);
  const pool = pools[Math.floor(Math.random() * pools.length)];
  return withCatch(v, pick(pool.length ? pool : greetPool(v, level)));
}

// 부탁 요청 대상 아이템 풀
export const REQUEST_POOL = ['apple', 'orange', 'cherry', 'wood', 'stone', 'flower', 'shell'];
export function requestLine(v, emoji) { return withCatch(v, pick([`혹시 ${emoji} 하나 있어? 필요해서 그래~`, `${emoji} 좀 구해줄 수 있어? 부탁할게!`, `${emoji}가 급하게 필요한데… 도와줄래?`])); }
export function thankLine(v, emoji) { return withCatch(v, pick([`${emoji} 고마워! 이 은혜 잊지 않을게 💖`, `우와, 정말 고마워! 너밖에 없다~`, `역시 믿을 건 너뿐이야. 고마워!`])); }

// 선물 반응(성격·호불호 반영)
export function giftReaction(v, liked, emoji) {
  if (liked) return withCatch(v, pick([`우와, ${emoji} 완전 내 취향이야! 고마워 💖`, `이건 내가 제일 좋아하는 거잖아! 최고야~`]));
  const byP = {
    명랑: [`${emoji} 고마워! 잘 쓸게~`, `오, 선물이다! 신난다!`],
    무뚝뚝: [`${emoji}… 뭐, 받아둘게.`, `굳이 이런 걸. …고맙다.`],
    느긋: [`${emoji} 고마워~ 천천히 쓸게.`, `친절하기도 하지~ 고마워.`],
  };
  return withCatch(v, pick(byP[v.personality] || byP['명랑']));
}

export const VILLAGER_IDS = VILLAGERS.map((v) => v.id);
export function villagerById(id) { return VILLAGERS.find((v) => v.id === id); }
