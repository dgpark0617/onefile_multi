export const WORLD = {
  width: 900,
  height: 600,
};

export const MAX_PLAYERS = 4;

export const RULES = {
  tickHz: 30,
  tickMs: 1000 / 30,
  turnSpeed: 0.1,
  baseSpeed: 1.3,
  baseRadius: 14,
  baseHearts: 3,
  heartsPerOrb: 1,
  punchKnockback: 3.8,
  punchCooldownTicks: 14,
  punchActiveTicks: 6,
  punchReach: 32,
  punchShoulderRatio: 0.58,
  punchConverge: 0.58,
  knockbackFriction: 0.84,
  hitInvincibleTicks: 18,
  orbCount: 20,
  orbRadius: 7,
  scalePerOrb: 0.07,
  initialAi: 2,
  aiSpawnTicks: 30 * 8,
  worldMargin: 24,
  comboWindowTicks: 20,
  comboKnockbackBonus: 0.08,
};

export const PLAYER_DEFS = [
  { emoji: "🥊", name: "레드", color: "#ef4444" },
  { emoji: "🥋", name: "블루", color: "#3b82f6" },
  { emoji: "🟡", name: "골드", color: "#eab308" },
  { emoji: "🟣", name: "퍼플", color: "#a855f7" },
];

export const COLORS = {
  ai: ["#f472b6", "#fb923c", "#2dd4bf", "#94a3b8"],
  bg: "#1a1030",
  grid: "#23314f",
  orb: ["#f472b6", "#60a5fa", "#fbbf24", "#34d399", "#c084fc"],
};

export const SPAWN_SPOTS = [
  { x: 140, y: WORLD.height - 140, angle: -Math.PI / 2 },
  { x: WORLD.width - 140, y: WORLD.height - 140, angle: Math.PI },
  { x: WORLD.width - 140, y: 140, angle: Math.PI / 2 },
  { x: 140, y: 140, angle: 0 },
];
