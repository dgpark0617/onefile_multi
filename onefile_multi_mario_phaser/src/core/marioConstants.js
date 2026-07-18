export const MAX_PLAYERS = 4;
export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;

/** 멀티플레이 네트워크 동기화 (초당 20회) — 물리는 NET_SUBSTEPS로 60Hz 유지 */
export const NET_TICK_HZ = 20;
export const NET_TICK_MS = 1000 / NET_TICK_HZ;
export const NET_SUBSTEPS = 3;
/** 손님 INP 대기 한도(ms) — held가 계속 갱신되므로 짧게 유지 */
export const NET_INPUT_WAIT_MS = 55;

export const DESIGN_W = 900;
export const DESIGN_H = 500;
export const VW = DESIGN_W;
export const VH = DESIGN_H;

export const GRAVITY = 0.55;
export const FRICTION = 0.82;
export const MOVE_SPEED = 0.62;
export const MAX_SPEED = 5.2;
export const JUMP_FORCE = -12.2;
export const DOUBLE_JUMP_FORCE = -10.6;
export const JUMP_CUT = 0.45; // 점프키를 빨리 떼면 상승 속도 절삭 (짧은 점프)
export const WORLD_W = 4800;
export const UNDERGROUND_W = 1400;
export const UNDERWATER_W = 1600;
export const FEATHER_DURATION = 3600;
export const SOAP_BUBBLE_DURATION = 7200; // 진주: ~2분 비눗방울
export const SOAP_BUBBLE_SPEED = 5.4; // 비눗방울 위/아래 홀드 시 수직 속도(px/tick)
export const SOAP_BUBBLE_STEP = 14; // 하위 호환 (속도 폴백)
export const PIPE_COOLDOWN = 50;

/** 스테이지 = 난이도 다이얼(변수 조합). 맵은 seed로 매번 재조립 */
export const LEVEL_DEFS = [
  {
    name: "1-1",
    bossHp: 5,
    enemySpeedMul: 1,
    bossSpeedMul: 1,
    pitCount: 5,
    pitGapMin: 70,
    pitGapMax: 95,
    coinCount: 14,
    blueCoins: 4,
    enemyCount: 10,
    turtleRatio: 0.25,
    airPlatCount: 14,
  },
  {
    name: "1-2",
    bossHp: 5,
    enemySpeedMul: 1.12,
    bossSpeedMul: 1.08,
    pitCount: 6,
    pitGapMin: 80,
    pitGapMax: 115,
    coinCount: 11,
    blueCoins: 3,
    enemyCount: 13,
    turtleRatio: 0.4,
    airPlatCount: 12,
  },
  {
    name: "1-3",
    bossHp: 5,
    enemySpeedMul: 1.25,
    bossSpeedMul: 1.18,
    pitCount: 7,
    pitGapMin: 90,
    pitGapMax: 130,
    coinCount: 9,
    blueCoins: 2,
    enemyCount: 16,
    turtleRatio: 0.5,
    airPlatCount: 11,
  },
];
export const LEVEL_COUNT = LEVEL_DEFS.length;

export function getLevelDef(index) {
  return LEVEL_DEFS[Math.max(0, Math.min(index, LEVEL_DEFS.length - 1))];
}

/**
 * 선택 가능 캐릭터
 * - 기존: 캔버스 드로잉 (마리오/루이지/피치/키노/쿠파)
 * - 추가: 픽셀아트 스프라이트 (셀레스트/셀레스티얼/릴리스/릴리)
 */
export const CHARACTER_DEFS = [
  {
    id: "mario",
    emoji: "🍄",
    name: "마리오",
    hat: "#dc2626",
    overall: "#2563eb",
    style: "hero",
  },
  {
    id: "luigi",
    emoji: "🟢",
    name: "루이지",
    hat: "#16a34a",
    overall: "#1d4ed8",
    style: "hero",
  },
  {
    id: "peach",
    emoji: "👑",
    name: "피치",
    hat: "#fce7f3",
    overall: "#f472b6",
    style: "peach",
    dress: "#fb7185",
    hair: "#fbbf24",
    maxJumps: 3,
  },
  {
    id: "toad",
    emoji: "🔵",
    name: "키노",
    hat: "#ffffff",
    overall: "#2563eb",
    style: "toad",
    capDot: "#dc2626",
  },
  {
    id: "bowser",
    emoji: "🐢",
    name: "쿠파",
    hat: "#ea580c",
    overall: "#16a34a",
    style: "bowser",
    freeFire: true,
    startSizeLevel: 2,
  },
  {
    id: "celeste",
    emoji: "💜",
    name: "셀레스트",
    hat: "#1e293b",
    overall: "#64748b",
    style: "sprite",
    sprite: "celeste",
    freeIce: true,
  },
  {
    id: "celestial",
    emoji: "✨",
    name: "셀레스티얼",
    hat: "#e2e8f0",
    overall: "#4d7c0f",
    style: "sprite",
    sprite: "celestial",
    startPets: 4,
  },
  {
    id: "lilith",
    emoji: "🔮",
    name: "릴리스",
    hat: "#0f172a",
    overall: "#1e293b",
    style: "sprite",
    sprite: "lilith",
  },
  {
    id: "liliya",
    emoji: "🎀",
    name: "릴리",
    hat: "#1e293b",
    overall: "#334155",
    style: "sprite",
    sprite: "liliya",
  },
];

/** 슬롯 기본값 / 하위 호환 */
export const PLAYER_DEFS = CHARACTER_DEFS;

export function getCharacter(id) {
  return CHARACTER_DEFS.find((c) => c.id === id) || CHARACTER_DEFS[0];
}

export function resolveCharacterIds(characterIds, playerCount) {
  const list = Array.isArray(characterIds) ? characterIds : [];
  const out = [];
  for (let i = 0; i < playerCount; i++) {
    out.push(list[i] || CHARACTER_DEFS[i % CHARACTER_DEFS.length].id);
  }
  return out;
}
