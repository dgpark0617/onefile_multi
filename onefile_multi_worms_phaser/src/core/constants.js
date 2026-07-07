export const WORLD = {
  width: 900,
  height: 600,
};

export const MAX_PLAYERS = 4;

export const RULES = {
  segmentDistance: 10,
  headRadius: 9,
  bodyRadius: 7,
  baseSpeed: 2.2,
  turnSpeed: 0.08,
  appleCount: 22,
  initialAi: 2,
  tickHz: 30,
  tickMs: 1000 / 30,
  aiSpawnTicks: 30 * 5,
};

export const PLAYER_DEFS = [
  { emoji: "🐛", name: "초록", color: "#4ade80" },
  { emoji: "🪱", name: "핑크", color: "#f472b6" },
  { emoji: "🐍", name: "블루", color: "#60a5fa" },
  { emoji: "🦎", name: "골드", color: "#fbbf24" },
];

export const COLORS = {
  worm: ["#f472b6", "#60a5fa", "#fbbf24", "#a78bfa", "#fb923c", "#2dd4bf"],
  rainbow: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"],
  player: "#4ade80",
  bg: "#16213e",
  grid: "rgba(255,255,255,0.03)",
  apple: "#ef4444",
  appleLeaf: "#22c55e",
};

export const SPAWN_SPOTS = [
  { x: 140, y: WORLD.height - 140, angle: -Math.PI / 2 },
  { x: WORLD.width - 140, y: WORLD.height - 140, angle: Math.PI },
  { x: WORLD.width - 140, y: 140, angle: Math.PI / 2 },
  { x: 140, y: 140, angle: 0 },
];
