/** 스테이지별 랜덤 맵 테마 + 적 풀 */
export const MAP_THEMES = [
  {
    id: "grass",
    label: "초원",
    sky: ["#5c94fc", "#94c5ff"],
    deco: "clouds",
    ground: { body: "#c84c0c", top: "#22c55e", stripe: "grass" },
    pitDefault: "void",
    enemyPool: [
      { type: "mushroom", weight: 5 },
      { type: "turtle", weight: 2 },
    ],
  },
  {
    id: "forest",
    label: "숲속",
    sky: ["#14532d", "#4ade80"],
    deco: "trees",
    ground: { body: "#3f2e1f", top: "#166534", stripe: "moss" },
    pitDefault: "void",
    enemyPool: [
      { type: "slime", weight: 5 },
      { type: "bat", weight: 3 },
      { type: "mushroom", weight: 2 },
    ],
  },
  {
    id: "lava",
    label: "용암",
    sky: ["#450a0a", "#991b1b"],
    deco: "lava",
    ground: { body: "#292524", top: "#44403c", stripe: "rock" },
    pitDefault: "lava",
    enemyPool: [
      { type: "ember", weight: 5 },
      { type: "rock", weight: 3 },
      { type: "turtle", weight: 1 },
    ],
  },
  {
    id: "city",
    label: "도시",
    sky: ["#334155", "#64748b"],
    deco: "buildings",
    ground: { body: "#475569", top: "#94a3b8", stripe: "concrete" },
    pitDefault: "void",
    enemyPool: [
      { type: "robot", weight: 5 },
      { type: "drone", weight: 3 },
    ],
  },
  {
    id: "sewer",
    label: "하수구",
    sky: ["#1e1b4b", "#312e81"],
    deco: "sewer",
    ground: { body: "#57534e", top: "#78716c", stripe: "brick" },
    pitDefault: "water",
    enemyPool: [
      { type: "rat", weight: 4 },
      { type: "slime", weight: 3 },
      { type: "bat", weight: 2 },
    ],
  },
  {
    id: "beach",
    label: "해변",
    sky: ["#0284c7", "#7dd3fc"],
    deco: "waves",
    ground: { body: "#eab308", top: "#fde68a", stripe: "sand" },
    pitDefault: "water",
    enemyPool: [
      { type: "crab", weight: 5 },
      { type: "seagull", weight: 3 },
      { type: "turtle", weight: 1 },
    ],
  },
];

export const THEME_BY_ID = Object.fromEntries(MAP_THEMES.map((t) => [t.id, t]));

export function pickMapTheme(rng, levelIndex = 0) {
  // 스테이지마다 다른 테마, seed와 함께 결정적
  const idx = Math.floor(rng() * MAP_THEMES.length);
  return MAP_THEMES[(idx + levelIndex) % MAP_THEMES.length];
}

export function pickThemeEnemyType(rng, theme, level = {}) {
  const pool = theme?.enemyPool || THEME_BY_ID.grass.enemyPool;
  const turtleBias = level.turtleRatio ?? 0.3;
  let list = pool.slice();
  if (list.some((e) => e.type === "turtle") && rng() > turtleBias) {
    list = list.filter((e) => e.type !== "turtle");
  }
  const total = list.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of list) {
    r -= e.weight;
    if (r <= 0) return e.type;
  }
  return list[0].type;
}

export function pickThemeBoss(rng, themeId) {
  const pool = BOSS_POOLS[themeId] || BOSS_POOLS.grass;
  return pool[Math.floor(rng() * pool.length)];
}

/** 테마별 보스 (2종 중 랜덤) */
export const BOSS_POOLS = {
  grass: [
    { kind: "mushroom", label: "버섯킹" },
    { kind: "bowser", label: "쿠파" },
  ],
  city: [
    { kind: "mushroom", label: "버섯킹" },
    { kind: "bowser", label: "쿠파" },
  ],
  beach: [
    { kind: "megaFish", label: "거대물고기" },
    { kind: "mermaid", label: "거대인어" },
  ],
  forest: [
    { kind: "megaWolf", label: "거대늑대" },
    { kind: "megaBear", label: "거대곰" },
  ],
  sewer: [
    { kind: "megaRat", label: "거대쥐" },
    { kind: "megaTurtle", label: "거대거북" },
  ],
  lava: [
    { kind: "superBowser", label: "초거대쿠파" },
    { kind: "dokkaebi", label: "초거대도깨비" },
  ],
};

/** 테마별 탈것 (10% 확률 스폰) */
export const VEHICLE_BY_THEME = {
  grass: { id: "kart", label: "마차", w: 58, h: 34, emoji: "🛞" },
  city: { id: "car", label: "자동차", w: 64, h: 32, emoji: "🚗" },
  beach: { id: "boat", label: "보트", w: 62, h: 30, emoji: "🚤" },
  forest: { id: "dino", label: "공룡", w: 72, h: 48, emoji: "🦕" },
  lava: { id: "boulder", label: "바위", w: 56, h: 56, emoji: "🪨" },
  sewer: { id: "minecart", label: "광산수레", w: 56, h: 34, emoji: "🛤️" },
  underwater: { id: "submarine", label: "잠수함", w: 68, h: 36, emoji: "🔱" },
};

export function getThemeVehicle(themeId) {
  return VEHICLE_BY_THEME[themeId] || VEHICLE_BY_THEME.grass;
}

export function getThemeForWorld(world, overworldTheme) {
  if (world === "underwater") {
    return {
      id: "underwater",
      label: "물속",
      sky: ["#0c4a6e", "#0369a1", "#075985"],
      deco: "bubbles",
      ground: { body: "#0f766e", top: "#14b8a6", stripe: "coral" },
      pitDefault: "water",
      enemyPool: [],
    };
  }
  if (world === "underground") return THEME_BY_ID.sewer;
  if (world === "bonus") return {
    id: "bonus",
    label: "보너스",
    sky: ["#422006", "#713f12"],
    deco: "coins",
    ground: { body: "#a16207", top: "#fbbf24", stripe: "gold" },
    pitDefault: "void",
    enemyPool: [],
  };
  return THEME_BY_ID[overworldTheme?.id] || THEME_BY_ID.grass;
}
