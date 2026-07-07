import { COLORS, RULES, WORLD, tierForScore } from "../core/constants.js";
import { hexToPhaserColor } from "../core/colorCache.js";
import { loadDatasetSync } from "../core/chartData.js";
import { ChartQuiz } from "../core/chartQuiz.js";
import { gameSession } from "../core/gameSession.js";
import { showGameOverlay, showLobby, updateControlState } from "../ui/lobbyDom.js";

const BLOCKED_KEYS = new Set(["ArrowUp", "ArrowDown", " ", "Enter"]);
const FONT = '"Segoe UI", system-ui, sans-serif';

function preventGameKeys(e) {
  if (BLOCKED_KEYS.has(e.key)) e.preventDefault();
}

function fmtPrice(price) {
  if (price >= 100_000_000) return `${(price / 100_000_000).toFixed(1)}억`;
  if (price >= 10_000) return `${Math.round(price / 10_000)}만`;
  return `${Math.round(price).toLocaleString()}`;
}

export class ChartArenaScene extends Phaser.Scene {
  constructor() {
    super("ChartArenaScene");
  }

  create() {
    loadDatasetSync();

    this.graphics = this.add.graphics().setDepth(1);
    this.flashGfx = this.add.graphics().setDepth(2);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    window.addEventListener("keydown", preventGameKeys, { passive: false });

    this.hud = {
      badge: this.add
        .text(14, 8, "BTC/KRW · 1H", { fontFamily: FONT, fontSize: "11px", color: "#64748b" })
        .setDepth(10),
      lives: this.add.text(14, 26, "", { fontFamily: FONT, fontSize: "19px", color: "#fb7185" }).setDepth(10),
      score: this.add.text(14, 50, "", { fontFamily: FONT, fontSize: "16px", color: "#fbbf24" }).setDepth(10),
      combo: this.add.text(14, 72, "", { fontFamily: FONT, fontSize: "13px", color: "#7dd3fc" }).setDepth(10),
      hint: this.add
        .text(WORLD.width / 2, 10, "", { fontFamily: FONT, fontSize: "13px", color: "#94a3b8" })
        .setOrigin(0.5, 0)
        .setDepth(10),
      pickTag: this.add
        .text(WORLD.width / 2, 32, "", { fontFamily: FONT, fontSize: "14px", color: "#f8fafc" })
        .setOrigin(0.5, 0)
        .setDepth(10)
        .setVisible(false),
      result: this.add
        .text(WORLD.width / 2, 56, "", {
          fontFamily: FONT,
          fontSize: "22px",
          color: "#f8fafc",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setDepth(10),
      esc: this.add
        .text(WORLD.width - 14, 10, "ESC: 로비", { fontFamily: FONT, fontSize: "12px", color: "#64748b" })
        .setOrigin(1, 0)
        .setDepth(10),
    };

    this.priceLabels = [];
    for (let i = 0; i < 5; i++) {
      this.priceLabels.push(
        this.add.text(8, 0, "", { fontFamily: FONT, fontSize: "10px", color: "#475569" }).setDepth(10),
      );
    }

    this.quiz = new ChartQuiz();
    gameSession.quiz = this.quiz;
    this.revealTimer = 0;
    this.resultTimer = 0;
    this.flashAlpha = 0;
    this.flashColor = 0xffffff;
    this.hudCache = {};

    updateControlState(this.quiz);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  onShutdown() {
    window.removeEventListener("keydown", preventGameKeys);
    gameSession.quiz = null;
  }

  chartRect() {
    const p = RULES.chartPad;
    return {
      left: p.left,
      top: p.top,
      right: WORLD.width - p.right,
      bottom: WORLD.height - p.bottom,
      width: WORLD.width - p.left - p.right,
      height: WORLD.height - p.top - p.bottom,
    };
  }

  visibleCandles() {
    const { prompt, reveal } = this.quiz.round;
    const n = this.quiz.visibleRevealCount();
    return [...prompt, ...reveal.slice(0, n)];
  }

  priceToY(price, minP, maxP, rect) {
    const span = maxP - minP || 1;
    return rect.bottom - ((price - minP) / span) * rect.height;
  }

  drawChart(g) {
    const rect = this.chartRect();
    const candles = this.visibleCandles();
    const slots = RULES.promptBars + RULES.revealBars;
    const barW = rect.width / slots;
    const bodyW = Math.max(4, barW * 0.58);
    const revealCount = this.quiz.visibleRevealCount();

    let minP = Infinity;
    let maxP = -Infinity;
    for (const c of candles) {
      minP = Math.min(minP, c.l);
      maxP = Math.max(maxP, c.h);
    }
    const pad = (maxP - minP) * 0.06 || maxP * 0.001;
    minP -= pad;
    maxP += pad;

    g.fillStyle(hexToPhaserColor(COLORS.bg), 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);

    g.fillStyle(hexToPhaserColor(COLORS.panel), 1);
    g.fillRect(rect.left - 4, rect.top - 4, rect.width + 8, rect.height + 8);
    g.lineStyle(1.5, hexToPhaserColor(COLORS.panelBorder), 0.8);
    g.strokeRect(rect.left - 4, rect.top - 4, rect.width + 8, rect.height + 8);

    g.fillStyle(hexToPhaserColor("#080e1a"), 1);
    g.fillRect(rect.left, rect.top, rect.width, rect.height);

    const pivotX = rect.left + RULES.promptBars * barW;
    if (revealCount > 0) {
      g.fillStyle(hexToPhaserColor(COLORS.revealZone), 0.07);
      g.fillRect(pivotX, rect.top, rect.right - pivotX, rect.height);
      g.lineStyle(2, hexToPhaserColor(COLORS.revealLine), 0.7);
      g.beginPath();
      g.moveTo(pivotX, rect.top);
      g.lineTo(pivotX, rect.bottom);
      g.strokePath();
    }

    for (let i = 0; i <= 4; i++) {
      const y = rect.top + (rect.height * i) / 4;
      const price = maxP - ((maxP - minP) * i) / 4;
      this.priceLabels[i].setText(fmtPrice(price));
      this.priceLabels[i].setPosition(10, y - 5);
      g.lineStyle(1, hexToPhaserColor(COLORS.grid), 0.45);
      g.beginPath();
      g.moveTo(rect.left, y);
      g.lineTo(rect.right, y);
      g.strokePath();
    }

    const baseY = this.priceToY(this.quiz.round.baseClose, minP, maxP, rect);
    g.lineStyle(1, hexToPhaserColor("#64748b"), 0.4);
    for (let x = rect.left; x < rect.right; x += 8) {
      g.beginPath();
      g.moveTo(x, baseY);
      g.lineTo(Math.min(x + 4, rect.right), baseY);
      g.strokePath();
    }

    candles.forEach((c, i) => {
      const cx = rect.left + i * barW + barW / 2;
      const yHigh = this.priceToY(c.h, minP, maxP, rect);
      const yLow = this.priceToY(c.l, minP, maxP, rect);
      const yOpen = this.priceToY(c.o, minP, maxP, rect);
      const yClose = this.priceToY(c.c, minP, maxP, rect);
      const bull = c.c >= c.o;
      const isReveal = i >= RULES.promptBars;
      const color = bull ? COLORS.bull : COLORS.bear;

      g.lineStyle(1, hexToPhaserColor(COLORS.wick), 0.85);
      g.beginPath();
      g.moveTo(cx, yHigh);
      g.lineTo(cx, yLow);
      g.strokePath();

      const top = Math.min(yOpen, yClose);
      const h = Math.max(2, Math.abs(yClose - yOpen));
      g.fillStyle(hexToPhaserColor(color), isReveal ? 1 : 0.92);
      g.fillRect(cx - bodyW / 2, top, bodyW, h);
    });

    if (this.quiz.pick && this.quiz.state === "prompt") {
      const pickColor = this.quiz.pick === "long" ? COLORS.pickLong : COLORS.pickShort;
      g.lineStyle(2, hexToPhaserColor(pickColor), 0.3);
      g.strokeRect(rect.left, rect.top, rect.width, rect.height);
    }
  }

  syncPickFromSession() {
    if (gameSession.pick && this.quiz.state === "prompt") {
      this.quiz.setPick(gameSession.pick);
    }
  }

  handleInput() {
    if (this.quiz.gameOver) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.quiz.setPick("long");
      gameSession.pick = "long";
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.quiz.setPick("short");
      gameSession.pick = "short";
    }

    const revealKey =
      Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter);
    if (revealKey || gameSession.consumeReveal()) {
      if (this.quiz.startReveal()) {
        this.revealTimer = 0;
      }
    }

    updateControlState(this.quiz);
  }

  updateHud() {
    const q = this.quiz;
    const hearts = "♥".repeat(Math.max(0, q.lives)) + "♡".repeat(Math.max(0, RULES.lives - q.lives));
    const scoreStr = `SCORE ${q.score}`;
    const comboStr = q.combo > 1 ? `COMBO ×${q.combo}` : "COMBO —";
    let hintStr = "방향 선택 후 결과보기";
    if (q.state === "revealing") hintStr = "캔들 공개 중…";
    if (q.state === "result" && q.lastResult) {
      hintStr = q.lastResult.correct ? "정답!" : `오답 · ${q.lastResult.actual === "long" ? "상승" : "하락"}`;
    }

    if (this.hudCache.hearts !== hearts) {
      this.hudCache.hearts = hearts;
      this.hud.lives.setText(hearts);
    }
    if (this.hudCache.score !== scoreStr) {
      this.hudCache.score = scoreStr;
      this.hud.score.setText(scoreStr);
    }
    if (this.hudCache.combo !== comboStr) {
      this.hudCache.combo = comboStr;
      this.hud.combo.setText(comboStr);
    }
    if (this.hudCache.hint !== hintStr) {
      this.hudCache.hint = hintStr;
      this.hud.hint.setText(hintStr);
    }

    if (q.pick && q.state === "prompt") {
      const isLong = q.pick === "long";
      this.hud.pickTag.setText(isLong ? "▲ LONG" : "▼ SHORT");
      this.hud.pickTag.setColor(isLong ? "#4ade80" : "#fb7185");
      this.hud.pickTag.setVisible(true);
    } else {
      this.hud.pickTag.setVisible(false);
    }

    let resultStr = "";
    let resultColor = "#f8fafc";
    if (q.state === "result" && q.lastResult) {
      resultStr = q.lastResult.correct ? "✓ HIT" : "✗ MISS";
      resultColor = q.lastResult.correct ? "#4ade80" : "#fb7185";
    }
    if (this.hudCache.result !== resultStr) {
      this.hudCache.result = resultStr;
      this.hud.result.setText(resultStr);
      this.hud.result.setColor(resultColor);
    }
  }

  endGame() {
    const tier = tierForScore(this.quiz.score);
    const msg = `정답 ${this.quiz.correctCount}/${this.quiz.rounds} · ${tier.emoji} ${tier.label}`;
    showGameOverlay({
      title: `게임 오버 · ${this.quiz.score}점`,
      msg,
      shareText: `차트 예측 ${this.quiz.score}점 · ${tier.emoji}${tier.label} 달성!`,
    });
  }

  update(_, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      showLobby();
      this.scene.stop();
      return;
    }

    this.syncPickFromSession();
    this.handleInput();

    if (this.quiz.state === "revealing") {
      this.revealTimer += delta;
      while (this.revealTimer >= RULES.revealMsPerBar && this.quiz.state === "revealing") {
        this.revealTimer -= RULES.revealMsPerBar;
        const done = this.quiz.tickReveal();
        if (done && this.quiz.state === "result") {
          this.resultTimer = 0;
          const ok = this.quiz.lastResult?.correct;
          this.flashColor = ok ? hexToPhaserColor(COLORS.bull) : hexToPhaserColor(COLORS.bear);
          this.flashAlpha = 0.3;
          if (this.quiz.gameOver) {
            this.time.delayedCall(RULES.resultHoldMs, () => this.endGame());
          }
        }
      }
    }

    if (this.quiz.state === "result" && !this.quiz.gameOver) {
      this.resultTimer += delta;
      if (this.resultTimer >= RULES.resultHoldMs) {
        this.quiz.advanceAfterResult();
        gameSession.pick = null;
        updateControlState(this.quiz);
      }
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - delta * 0.0012);
    }

    this.graphics.clear();
    this.drawChart(this.graphics);

    this.flashGfx.clear();
    if (this.flashAlpha > 0) {
      this.flashGfx.fillStyle(this.flashColor, this.flashAlpha);
      this.flashGfx.fillRect(0, 0, WORLD.width, WORLD.height);
    }

    this.updateHud();
  }
}
