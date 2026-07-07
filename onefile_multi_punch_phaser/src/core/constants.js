export const WORLD = {
  width: 900,
  height: 600,
};

export const MAX_PLAYERS = 4;

export const RULES = {
  tickHz: 30,
  tickMs: 1000 / 30,
  turnSpeed: 0.1,
  baseSpeed: 2.6,
  baseRadius: 14,
  baseHp: 100,
  punchDamage: 18,
  punchKnockback: 3.8,
  punchCooldownTicks: 14,
  punchActiveTicks: 5,
  punchReach: 30,
  punchSideAngle: 0.55,
  knockbackFriction: 0.84,
  orbCount: 20,
  orbRadius: 7,
  scalePerOrb: 0.07,
  hpPerOrb: 10,
  healPerOrb: 14,
  initialAi: 2,
  aiSpawnTicks: 30 * 8,
  arenaRadius: 255,
  arenaCx: 450,
  arenaCy: 300,
  comboWindowTicks: 20,
  comboDamageBonus: 4,
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
  ring: "#4c1d95",
  ringLine: "#a78bfa",
  orb: ["#f472b6", "#60a5fa", "#fbbf24", "#34d399", "#c084fc"],
};

export const SPAWN_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
