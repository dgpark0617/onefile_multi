import { CHART_MODES, DEFAULT_MODE_KEY, RULES } from "./constants.js";
import { getDataset, pickRandomRound } from "./chartData.js";
import { mulberry32 } from "./rng.js";

export class ChartQuiz {
  constructor(seed = Date.now() >>> 0, modeKey = DEFAULT_MODE_KEY) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.dataset = getDataset();
    this.candles = this.dataset.candles;
    this.modeKey = CHART_MODES[modeKey] ? modeKey : DEFAULT_MODE_KEY;
    this.mode = CHART_MODES[this.modeKey];
    this.lives = RULES.lives;
    this.score = 0;
    this.combo = 0;
    this.rounds = 0;
    this.correctCount = 0;
    this.gameOver = false;
    this.state = "prompt";
    this.pick = null;
    this.round = null;
    this.revealCount = 0;
    this.lastResult = null;
    this.maxCombo = 0;
    this.stats = {
      attempts: 0,
      correct: 0,
      wrong: 0,
      longCorrect: 0,
      shortCorrect: 0,
      scoreGained: 0,
    };
    this.newRound();
  }

  newRound() {
    this.round = pickRandomRound(this.candles, this.rng, this.mode);
    this.pick = null;
    this.state = "prompt";
    this.revealCount = 0;
    this.lastResult = null;
  }

  setPick(direction) {
    if (this.gameOver || this.state !== "prompt") return false;
    this.pick = direction;
    return true;
  }

  canReveal() {
    return !this.gameOver && this.state === "prompt" && this.pick != null;
  }

  startReveal() {
    if (!this.canReveal()) return false;
    this.state = "revealing";
    this.revealCount = 0;
    return true;
  }

  visibleRevealCount() {
    if (this.state === "prompt") return 0;
    if (this.state === "revealing") return this.revealCount;
    return this.mode.revealBars;
  }

  tickReveal() {
    if (this.state !== "revealing") return false;
    this.revealCount += 1;
    if (this.revealCount >= this.mode.revealBars) {
      this.grade();
      return true;
    }
    return false;
  }

  grade() {
    const correct = this.pick === this.round.actual;
    this.rounds += 1;
    this.stats.attempts += 1;
    this.lastResult = {
      correct,
      actual: this.round.actual,
      pick: this.pick,
    };

    if (correct) {
      this.correctCount += 1;
      this.stats.correct += 1;
      if (this.pick === "long") this.stats.longCorrect += 1;
      else this.stats.shortCorrect += 1;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const bonus = Math.min(this.combo - 1, RULES.maxComboBonus) * RULES.comboBonus;
      const gained = RULES.baseScore + bonus;
      this.score += gained;
      this.stats.scoreGained += gained;
    } else {
      this.combo = 0;
      this.stats.wrong += 1;
      this.lives -= 1;
      if (this.lives <= 0) this.gameOver = true;
    }

    this.state = "result";
    return this.lastResult;
  }

  advanceAfterResult() {
    if (this.state !== "result" || this.gameOver) return;
    this.newRound();
  }
}
