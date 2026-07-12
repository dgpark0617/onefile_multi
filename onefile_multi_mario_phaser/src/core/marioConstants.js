export const MAX_PLAYERS = 4;
export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;

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
export const FEATHER_DURATION = 3600;
export const PIPE_COOLDOWN = 50;

export const PLAYER_DEFS = [
  { emoji: "🍄", name: "레드", hat: "#dc2626", overall: "#2563eb" },
  { emoji: "🔵", name: "블루", hat: "#1d4ed8", overall: "#0369a1" },
  { emoji: "🟡", name: "옐로", hat: "#ca8a04", overall: "#b45309" },
  { emoji: "🟣", name: "퍼플", hat: "#7c3aed", overall: "#5b21b6" },
];
