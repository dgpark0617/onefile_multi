export const WORLD = {
  width: 900,
  height: 560,
};

export const RULES = {
  promptBars: 50,
  revealBars: 10,
  revealMsPerBar: 110,
  resultHoldMs: 1400,
  lives: 5,
  baseScore: 100,
  comboBonus: 20,
  maxComboBonus: 5,
  chartPad: { left: 64, right: 24, top: 92, bottom: 36 },
};

export const COLORS = {
  bg: "#070b14",
  bgGlow: "#0f1a2e",
  panel: "#0c1220",
  panelBorder: "#1e3a5f",
  grid: "#1a2744",
  gridAccent: "#243352",
  axis: "#64748b",
  bull: "#10b981",
  bullGlow: "#34d399",
  bear: "#f43f5e",
  bearGlow: "#fb7185",
  wick: "#64748b",
  pickLong: "#4ade80",
  pickShort: "#fb7185",
  revealLine: "#fbbf24",
  revealZone: "#fbbf24",
  hudBg: "#0f172a",
  gold: "#fbbf24",
};

export const TIERS = [
  { min: 2000, label: "차트 신", emoji: "👑" },
  { min: 1200, label: "워렌 버핏", emoji: "🧓" },
  { min: 700, label: "주식 유튜버", emoji: "📺" },
  { min: 300, label: "개미", emoji: "🐜" },
  { min: 0, label: "주린이", emoji: "🌱" },
];

export function tierForScore(score) {
  for (const t of TIERS) {
    if (score >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

export function fmtPrice(price) {
  if (price >= 100_000_000) return `${(price / 100_000_000).toFixed(1)}억`;
  if (price >= 10_000) return `${Math.round(price / 10_000)}만`;
  return `${Math.round(price).toLocaleString()}`;
}
