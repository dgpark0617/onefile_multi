import { COLORS, RULES, WORLD, tierForScore } from "../core/constants.js";
import { hexToPhaserColor } from "../core/colorCache.js";
import { loadDatasetSync } from "../core/chartData.js";
import { ChartQuiz } from "../core/chartQuiz.js";
import { gameSession } from "../core/gameSession.js";
import { burstParticles, floatPop, pulseText, shakeCamera } from "../effects/chartEffects.js";
import { showGameOverlay, showLobby, updateControlState } from "../ui/lobbyDom.js";

const BLOCKED_KEYS = new Set(["ArrowUp", "ArrowDown"]);
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

    this.bgGfx = this.add.graphics().setDepth(0);
    this.graphics = this.add.graphics().setDepth(1);
    this.flashGfx = this.add.graphics().setDepth(2);
    this.overlayGfx = this.add.graphics().setDepth(3);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
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
    this.volLabel = this.add
      .text(0, 0, "VOL", { fontFamily: FONT, fontSize: "9px", color: "#334155" })
      .setDepth(10);

    this.quiz = new ChartQuiz();
    gameSession.quiz = this.quiz;
    this.revealTimer = 0;
    this.resultTimer = 0;
    this.flashAlpha = 0;
    this.flashColor = 0xffffff;
    this.pickFlashAlpha = 0;
    this.pickFlashColor = 0xffffff;
    this.revealBumpAt = 0;
    this.comboGlow = 0;
    this.hudCache = {};
    this.lastScore = 0;
    this.lastCombo = 0;
    this.lastLives = RULES.lives;

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

  chartLayout() {
    const panel = this.chartRect();
    const volH = Math.round(panel.height * RULES.volumeSplit);
    const priceH = panel.height - volH - RULES.volumeGap;
    const price = {
      left: panel.left,
      top: panel.top,
      right: panel.right,
      bottom: panel.top + priceH,
      width: panel.width,
      height: priceH,
    };
    const volume = {
      left: panel.left,
      top: panel.top + priceH + RULES.volumeGap,
      right: panel.right,
      bottom: panel.bottom,
      width: panel.width,
      height: volH,
    };
    return { panel, price, volume };
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

  drawBackground(g) {
    const bands = [
      { y: 0, h: 180, c: "#0a1222", a: 1 },
      { y: 180, h: 200, c: "#070b14", a: 1 },
      { y: 380, h: 180, c: "#050810", a: 1 },
    ];
    for (const b of bands) {
      g.fillStyle(hexToPhaserColor(b.c), b.a);
      g.fillRect(0, b.y, WORLD.width, b.h);
    }

    g.lineStyle(1, hexToPhaserColor("#1e293b"), 0.12);
    for (let y = (this.time.now / 40) % 6; y < WORLD.height; y += 6) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(WORLD.width, y);
      g.strokePath();
    }
  }

  drawVignette(g) {
    const c = hexToPhaserColor(COLORS.vignette);
    g.fillStyle(c, 0.22);
    g.fillRect(0, 0, WORLD.width, 28);
    g.fillRect(0, WORLD.height - 24, WORLD.width, 24);
    g.fillStyle(c, 0.14);
    g.fillRect(0, 0, 36, WORLD.height);
    g.fillRect(WORLD.width - 36, 0, 36, WORLD.height);
  }

  drawChartPanel(g, panel) {
    g.fillStyle(hexToPhaserColor(COLORS.panel), 1);
    g.fillRect(panel.left - 4, panel.top - 4, panel.width + 8, panel.height + 8);
    g.lineStyle(1.5, hexToPhaserColor(COLORS.panelBorder), 0.85);
    g.strokeRect(panel.left - 4, panel.top - 4, panel.width + 8, panel.height + 8);
    g.fillStyle(hexToPhaserColor("#080e1a"), 1);
    g.fillRect(panel.left, panel.top, panel.width, panel.height);
  }

  priceRange(candles) {
    let minP = Infinity;
    let maxP = -Infinity;
    for (const c of candles) {
      minP = Math.min(minP, c.l);
      maxP = Math.max(maxP, c.h);
    }
    const pad = (maxP - minP) * 0.06 || maxP * 0.001;
    return { minP: minP - pad, maxP: maxP + pad };
  }

  maxVolume(candles) {
    let maxV = 0;
    for (const c of candles) maxV = Math.max(maxV, c.v || 0);
    return maxV || 1;
  }

  drawPriceGrid(g, priceRect, minP, maxP) {
    for (let i = 0; i <= 4; i++) {
      const y = priceRect.top + (priceRect.height * i) / 4;
      const price = maxP - ((maxP - minP) * i) / 4;
      this.priceLabels[i].setText(fmtPrice(price));
      this.priceLabels[i].setPosition(10, y - 5);
      g.lineStyle(1, hexToPhaserColor(i % 2 === 0 ? COLORS.gridAccent : COLORS.grid), 0.42);
      g.beginPath();
      g.moveTo(priceRect.left, y);
      g.lineTo(priceRect.right, y);
      g.strokePath();
    }
  }

  drawBaseCloseLine(g, priceRect, minP, maxP) {
    const baseY = this.priceToY(this.quiz.round.baseClose, minP, maxP, priceRect);
    g.lineStyle(1, hexToPhaserColor("#64748b"), 0.45);
    for (let x = priceRect.left; x < priceRect.right; x += 8) {
      g.beginPath();
      g.moveTo(x, baseY);
      g.lineTo(Math.min(x + 4, priceRect.right), baseY);
      g.strokePath();
    }
  }

  drawCandle(g, cx, c, i, barW, bodyW, minP, maxP, priceRect, revealCount) {
    const yHigh = this.priceToY(c.h, minP, maxP, priceRect);
    const yLow = this.priceToY(c.l, minP, maxP, priceRect);
    const yOpen = this.priceToY(c.o, minP, maxP, priceRect);
    const yClose = this.priceToY(c.c, minP, maxP, priceRect);
    const bull = c.c >= c.o;
    const isReveal = i >= RULES.promptBars;
    const color = bull ? COLORS.bull : COLORS.bear;
    const glow = bull ? COLORS.bullGlow : COLORS.bearGlow;

    let pop = 1;
    if (isReveal && i === RULES.promptBars + revealCount - 1 && this.quiz.state === "revealing") {
      const age = this.time.now - this.revealBumpAt;
      pop = Phaser.Math.Clamp(age / 85, 0.25, 1);
    }

    const top = Math.min(yOpen, yClose);
    const rawH = Math.max(2, Math.abs(yClose - yOpen));
    const h = rawH * pop;
    const midY = top + rawH / 2;
    const drawTop = midY - h / 2;

    if (isReveal) {
      g.fillStyle(hexToPhaserColor(glow), 0.14 * pop);
      g.fillRect(cx - bodyW * 0.75, drawTop - 2, bodyW * 1.5, h + 4);
    }

    g.lineStyle(1.2, hexToPhaserColor(COLORS.wick), isReveal ? 0.95 : 0.75);
    g.beginPath();
    g.moveTo(cx, yHigh);
    g.lineTo(cx, yLow);
    g.strokePath();

    g.fillStyle(hexToPhaserColor(color), isReveal ? 1 : 0.88);
    g.fillRect(cx - bodyW / 2, drawTop, bodyW, h);

    if (bull) {
      g.fillStyle(hexToPhaserColor(glow), isReveal ? 0.35 : 0.2);
      g.fillRect(cx - bodyW / 2 + 1, drawTop + 1, Math.max(1, bodyW - 2), Math.max(1, h * 0.35));
    }
  }

  drawVolumeBars(g, candles, barW, bodyW, volRect, maxV, revealCount) {
    g.lineStyle(1, hexToPhaserColor(COLORS.volumeGrid), 0.55);
    g.beginPath();
    g.moveTo(volRect.left, volRect.top);
    g.lineTo(volRect.right, volRect.top);
    g.strokePath();

    this.volLabel.setPosition(volRect.left + 4, volRect.top + 2);

    candles.forEach((c, i) => {
      const cx = volRect.left + i * barW + barW / 2;
      const bull = c.c >= c.o;
      const isReveal = i >= RULES.promptBars;
      const vol = c.v || 0;
      const h = (vol / maxV) * (volRect.height - 6);
      const color = bull ? COLORS.volumeBull : COLORS.volumeBear;

      let pop = 1;
      if (isReveal && i === RULES.promptBars + revealCount - 1 && this.quiz.state === "revealing") {
        const age = this.time.now - this.revealBumpAt;
        pop = Phaser.Math.Clamp(age / 85, 0.2, 1);
      }

      const barH = Math.max(1, h * pop);
      g.fillStyle(hexToPhaserColor(color), isReveal ? 0.82 : 0.55);
      g.fillRect(cx - bodyW / 2, volRect.bottom - barH, bodyW, barH);
    });
  }

  drawRevealZone(g, priceRect, volRect, pivotX, revealCount) {
    if (revealCount <= 0) return;

    const pulse = 0.06 + Math.sin(this.time.now / 220) * 0.025;
    g.fillStyle(hexToPhaserColor(COLORS.revealZone), pulse);
    g.fillRect(pivotX, priceRect.top, priceRect.right - pivotX, priceRect.bottom - priceRect.top);
    g.fillRect(pivotX, volRect.top, volRect.right - pivotX, volRect.height);

    g.lineStyle(2, hexToPhaserColor(COLORS.revealLine), 0.75);
    g.beginPath();
    g.moveTo(pivotX, priceRect.top);
    g.lineTo(pivotX, volRect.bottom);
    g.strokePath();

    const scanX = pivotX + revealCount * ((priceRect.width / (RULES.promptBars + RULES.revealBars)) || 0);
    const flicker = 0.35 + Math.sin(this.time.now / 80) * 0.25;
    g.lineStyle(2, hexToPhaserColor(COLORS.scanLine), flicker);
    g.beginPath();
    g.moveTo(scanX, priceRect.top);
    g.lineTo(scanX, volRect.bottom);
    g.strokePath();
  }

  drawChart(g) {
    const { panel, price, volume } = this.chartLayout();
    const candles = this.visibleCandles();
    const slots = RULES.promptBars + RULES.revealBars;
    const barW = panel.width / slots;
    const bodyW = Math.max(3, barW * 0.52);
    const revealCount = this.quiz.visibleRevealCount();
    const { minP, maxP } = this.priceRange(candles);
    const maxV = this.maxVolume(candles);
    const pivotX = panel.left + RULES.promptBars * barW;

    this.drawChartPanel(g, panel);
    this.drawPriceGrid(g, price, minP, maxP);
    this.drawRevealZone(g, price, volume, pivotX, revealCount);
    this.drawBaseCloseLine(g, price, minP, maxP);

    candles.forEach((c, i) => {
      const cx = panel.left + i * barW + barW / 2;
      this.drawCandle(g, cx, c, i, barW, bodyW, minP, maxP, price, revealCount);
    });

    this.drawVolumeBars(g, candles, barW, bodyW, volume, maxV, revealCount);

    if (this.quiz.pick && this.quiz.state === "prompt") {
      const pickColor = this.quiz.pick === "long" ? COLORS.pickLong : COLORS.pickShort;
      g.lineStyle(2, hexToPhaserColor(pickColor), 0.35);
      g.strokeRect(panel.left, panel.top, panel.width, panel.height);
    }
  }

  triggerPickFlash(direction) {
    this.pickFlashColor =
      direction === "long" ? hexToPhaserColor(COLORS.bull) : hexToPhaserColor(COLORS.bear);
    this.pickFlashAlpha = 0.22;
  }

  onRoundResult() {
    const ok = this.quiz.lastResult?.correct;
    const layout = this.chartLayout();
    const slots = RULES.promptBars + RULES.revealBars;
    const barW = layout.panel.width / slots;
    const cx = layout.panel.left + (RULES.promptBars + RULES.revealBars - 0.5) * barW;
    const cy = layout.panel.top + layout.panel.height * 0.42;

    this.flashColor = ok ? hexToPhaserColor(COLORS.bull) : hexToPhaserColor(COLORS.bear);
    this.flashAlpha = ok ? 0.34 : 0.42;

    burstParticles(this, cx, cy, this.flashColor, ok ? 18 : 12);
    if (ok) {
      floatPop(this, "+SCORE", cx, cy - 20, "#4ade80");
    } else {
      shakeCamera(this, 220, 0.0045);
      floatPop(this, "MISS", cx, cy - 20, "#fb7185");
    }
  }

  commitPick(direction) {
    if (!this.quiz.setPick(direction)) return false;
    gameSession.pick = direction;
    this.triggerPickFlash(direction);
    if (!this.quiz.startReveal()) return false;
    this.revealTimer = 0;
    this.revealBumpAt = this.time.now;
    return true;
  }

  handleInput() {
    if (this.quiz.gameOver) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.commitPick("long");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.commitPick("short");
    }

    if (gameSession.consumeReveal() && this.quiz.state === "prompt" && this.quiz.pick) {
      this.triggerPickFlash(this.quiz.pick === "long" ? "long" : "short");
      if (this.quiz.startReveal()) {
        this.revealTimer = 0;
        this.revealBumpAt = this.time.now;
      }
    }

    updateControlState(this.quiz);
  }

  updateHud() {
    const q = this.quiz;
    const hearts = "♥".repeat(Math.max(0, q.lives)) + "♡".repeat(Math.max(0, RULES.lives - q.lives));
    const scoreStr = `SCORE ${q.score}`;
    const comboStr = q.combo > 1 ? `COMBO ×${q.combo}` : "COMBO —";
    let hintStr = "▲ 상승 · ▼ 하락 — 선택 즉시 결과 공개";
    if (q.state === "revealing") hintStr = "캔들 공개 중…";
    if (q.state === "result" && q.lastResult) {
      hintStr = q.lastResult.correct ? "정답!" : `오답 · ${q.lastResult.actual === "long" ? "상승" : "하락"}`;
    }

    if (this.hudCache.hearts !== hearts) {
      this.hudCache.hearts = hearts;
      this.hud.lives.setText(hearts);
    }
    if (q.lives < this.lastLives) {
      pulseText(this.hud.lives, this);
    }
    this.lastLives = q.lives;

    if (this.hudCache.score !== scoreStr) {
      this.hudCache.score = scoreStr;
      this.hud.score.setText(scoreStr);
      if (q.score > this.lastScore) pulseText(this.hud.score, this);
    }
    this.lastScore = q.score;

    if (this.hudCache.combo !== comboStr) {
      this.hudCache.combo = comboStr;
      this.hud.combo.setText(comboStr);
      if (q.combo > this.lastCombo && q.combo > 1) pulseText(this.hud.combo, this);
    }
    this.lastCombo = q.combo;

    if (q.combo > 1) {
      this.comboGlow = 0.55 + Math.sin(this.time.now / 160) * 0.25;
      this.hud.combo.setColor(`rgba(125, 211, 252, ${this.comboGlow})`);
    } else {
      this.hud.combo.setColor("#7dd3fc");
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
      if (resultStr) pulseText(this.hud.result, this);
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

    this.handleInput();

    if (this.quiz.state === "revealing") {
      this.revealTimer += delta;
      while (this.revealTimer >= RULES.revealMsPerBar && this.quiz.state === "revealing") {
        this.revealTimer -= RULES.revealMsPerBar;
        const done = this.quiz.tickReveal();
        this.revealBumpAt = this.time.now;
        if (done && this.quiz.state === "result") {
          this.resultTimer = 0;
          this.onRoundResult();
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
      this.flashAlpha = Math.max(0, this.flashAlpha - delta * 0.0011);
    }
    if (this.pickFlashAlpha > 0) {
      this.pickFlashAlpha = Math.max(0, this.pickFlashAlpha - delta * 0.0018);
    }

    this.bgGfx.clear();
    this.drawBackground(this.bgGfx);

    this.graphics.clear();
    this.drawChart(this.graphics);

    this.overlayGfx.clear();
    this.drawVignette(this.overlayGfx);

    this.flashGfx.clear();
    if (this.pickFlashAlpha > 0) {
      this.flashGfx.fillStyle(this.pickFlashColor, this.pickFlashAlpha);
      this.flashGfx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    if (this.flashAlpha > 0) {
      this.flashGfx.fillStyle(this.flashColor, this.flashAlpha);
      this.flashGfx.fillRect(0, 0, WORLD.width, WORLD.height);
    }

    this.updateHud();
  }
}
