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
  volumeSplit: 0.2,
  volumeGap: 5,
};

export const CHART_MODES = {
  next: {
    key: "next",
    label: "다음 1봉",
    promptBars: 50,
    revealBars: 1,
    revealMsPerBar: 180,
    hint: "바로 다음 1봉 방향 예측",
  },
  current: {
    key: "current",
    label: "현재 단위",
    promptBars: 50,
    revealBars: 10,
    revealMsPerBar: 110,
    hint: "이후 10봉 단기 흐름 예측",
  },
  trend: {
    key: "trend",
    label: "장기 추세",
    promptBars: 80,
    revealBars: 30,
    revealMsPerBar: 70,
    hint: "이후 30봉 장기 흐름 예측",
  },
};

export const DEFAULT_MODE_KEY = "current";

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
  volumeBull: "#059669",
  volumeBear: "#e11d48",
  volumeGrid: "#152033",
  scanLine: "#38bdf8",
  vignette: "#020617",
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

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function letterGrade(v) {
  if (v >= 95) return "S";
  if (v >= 85) return "A";
  if (v >= 75) return "B";
  if (v >= 65) return "C";
  if (v >= 50) return "D";
  return "E";
}

export function buildPerformanceReport(quiz) {
  const attempts = Math.max(1, quiz.stats.attempts || quiz.rounds || 1);
  const accuracy = (quiz.correctCount / attempts) * 100;
  const surviveRate = (quiz.lives / RULES.lives) * 100;
  const comboRate = (quiz.maxCombo / 8) * 100;
  const sideBalance = ((Math.min(quiz.stats.longCorrect, quiz.stats.shortCorrect) * 2) / Math.max(1, quiz.correctCount)) * 100;

  let shortTerm = accuracy * 0.62 + comboRate * 0.25 + sideBalance * 0.13;
  let trend = accuracy * 0.55 + comboRate * 0.2 + (quiz.mode.key === "trend" ? 25 : quiz.mode.key === "current" ? 14 : 6);
  let risk = surviveRate * 0.55 + accuracy * 0.25 + (100 - (quiz.stats.wrong / attempts) * 100) * 0.2;

  if (quiz.mode.key === "next") shortTerm += 8;
  if (quiz.mode.key === "trend") trend += 8;

  shortTerm = Math.min(99, Math.max(0, Math.round(shortTerm)));
  trend = Math.min(99, Math.max(0, Math.round(trend)));
  risk = Math.min(99, Math.max(0, Math.round(risk)));

  const competitive = Math.round(
    1000 *
      clamp01((shortTerm * 0.38 + trend * 0.34 + risk * 0.28 + accuracy * 0.25) / 125),
  );
  const overall = Math.round((shortTerm + trend + risk) / 3);

  return {
    attempts,
    accuracy: Math.round(accuracy * 10) / 10,
    shortTerm,
    trend,
    risk,
    overall,
    competitive,
    grades: {
      shortTerm: letterGrade(shortTerm),
      trend: letterGrade(trend),
      risk: letterGrade(risk),
      overall: letterGrade(overall),
    },
  };
}

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
