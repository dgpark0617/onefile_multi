import { COLORS, PLAYER_DEFS, RULES, WORLD } from "../core/constants.js";
import { gameSession } from "../core/gameSession.js";
import { WormsSimulation } from "../core/wormSimulation.js";
import { GameEffects } from "../effects/gameEffects.js";
import { WwNet } from "../net/WwNet.js";
import { showGameOverlay, showLobby } from "../ui/lobbyDom.js";

export class WormArenaScene extends Phaser.Scene {
  constructor() {
    super("WormArenaScene");
  }

  init(data) {
    this.opts = data;
  }

  create() {
    this.graphics = this.add.graphics();
    this.wormLabels = new Map();
    this.fx = new GameEffects(this);

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.sim = new WormsSimulation({
      ...this.opts,
      onBroadcastFrame: (payload) => WwNet.broadcast(payload),
      onAppleEaten: ({ x, y }) => this.fx.eatBurst(x, y),
      onWormDeath: ({ x, y, color }) => this.fx.deathBurst(x, y, color),
      onEndGame: (result) => {
        showGameOverlay({ title: result.title, msg: result.msg });
        if (!result.solo && result.isHost) {
          WwNet.broadcast({
            type: "END",
            won: result.won ? this.sim.myIndex : (result.winnerWorm?.playerIndex ?? -1),
            msg: result.msg,
          });
        }
      },
    });
    this.sim.initWorld();
    gameSession.simulation = this.sim;

    this.createHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  createHud() {
    this.lengthText = this.add.text(14, 10, "", {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
      color: "#4ade80",
    });
    this.appleText = this.add.text(14, 36, "", {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
      color: "#fbbf24",
    });
    this.aliveText = this.add.text(14, 62, "", {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
      color: "#93c5fd",
    });
    this.hintText = this.add.text(WORLD.width - 14, 12, "ESC: 로비", {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "16px",
      color: "#94a3b8",
    });
    this.hintText.setOrigin(1, 0);
    this.lengthText.setDepth(200);
    this.appleText.setDepth(200);
    this.aliveText.setDepth(200);
    this.hintText.setDepth(200);
  }

  getTurnInput() {
    const kbLeft = this.keys.left.isDown || this.keys.a.isDown;
    const kbRight = this.keys.right.isDown || this.keys.d.isDown;
    const touch = gameSession.getTurnInput();
    if (kbLeft && !kbRight) return -1;
    if (kbRight && !kbLeft) return 1;
    return touch;
  }

  onShutdown() {
    for (const label of this.wormLabels.values()) label.destroy();
    this.wormLabels.clear();
    this.fx?.destroy();
    gameSession.simulation = null;
  }

  update(_, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      showLobby();
      this.scene.stop();
      return;
    }

    this.sim.step(
      delta,
      () => this.getTurnInput(),
      (payload) => WwNet.sendToHost(payload),
    );

    this.draw();
  }

  drawBackground() {
    this.graphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x16213e, 0x1a2744, 1);
    this.graphics.fillRect(0, 0, WORLD.width, WORLD.height);

    this.graphics.lineStyle(1, Phaser.Display.Color.HexStringToColor("#23314f").color, 0.45);
    for (let x = 0; x < WORLD.width; x += 40) {
      this.graphics.beginPath();
      this.graphics.moveTo(x, 0);
      this.graphics.lineTo(x, WORLD.height);
      this.graphics.strokePath();
    }
    for (let y = 0; y < WORLD.height; y += 40) {
      this.graphics.beginPath();
      this.graphics.moveTo(0, y);
      this.graphics.lineTo(WORLD.width, y);
      this.graphics.strokePath();
    }
  }

  draw() {
    const sim = this.sim;
    this.graphics.clear();
    this.drawBackground();

    for (const a of sim.apples) {
      this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(COLORS.apple).color, 1);
      this.graphics.fillCircle(a.x, a.y, a.r);
      this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(COLORS.appleLeaf).color, 1);
      this.graphics.fillTriangle(a.x, a.y - a.r, a.x + 5, a.y - a.r - 8, a.x + 3, a.y - a.r - 4);
    }

    const sorted = [...sim.worms].sort((a, b) => a.length - b.length);
    for (const worm of sorted) this.drawWorm(worm);
    this.syncWormLabels(sim);

    const me = sim.myWorm();
    this.lengthText.setText(`길이: ${me ? me.length : 0}`);
    this.appleText.setText(`사과: ${me ? me.applesEaten : 0}`);
    this.aliveText.setText(`생존: ${sim.worms.filter((w) => w.alive).length}`);

    if (!sim.solo && me) {
      const rank = [...sim.worms]
        .filter((w) => w.isHuman())
        .sort((a, b) => b.length - a.length)
        .findIndex((w) => w.playerIndex === sim.myIndex);
      if (rank >= 0 && !this.rankText) {
        this.rankText = this.add.text(WORLD.width / 2, WORLD.height - 16, "", {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "14px",
          color: "#94a3b8",
        });
        this.rankText.setOrigin(0.5, 1);
        this.rankText.setDepth(200);
      }
      if (this.rankText) {
        this.rankText.setText(
          sim.eliminated
            ? "탈락 — 관전 중"
            : `${PLAYER_DEFS[sim.myIndex]?.emoji || ""} 순위 ${rank + 1}`,
        );
      }
    }
  }

  syncWormLabels(sim) {
    const aliveIds = new Set();
    for (const worm of sim.worms) {
      if (!worm.alive || !worm.isHuman()) continue;
      aliveIds.add(worm.id);
      const head = worm.head;
      const tag = worm.playerIndex === sim.myIndex ? "나" : PLAYER_DEFS[worm.playerIndex]?.emoji || "";
      let label = this.wormLabels.get(worm.id);
      if (!label) {
        label = this.add.text(head.x, head.y - RULES.headRadius - 6, "", {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "11px",
          color: "#ffffff",
          fontStyle: "bold",
        });
        label.setOrigin(0.5, 1);
        label.setDepth(150);
        this.wormLabels.set(worm.id, label);
      }
      label.setText(`${tag} ${worm.length}`);
      label.setPosition(head.x, head.y - RULES.headRadius - 6);
    }
    for (const [id, label] of this.wormLabels) {
      if (!aliveIds.has(id)) {
        label.destroy();
        this.wormLabels.delete(id);
      }
    }
  }

  drawWorm(worm) {
    if (!worm.alive) return;
    const myIdx = this.sim.myIndex;

    for (let i = worm.segments.length - 1; i >= 1; i--) {
      const seg = worm.segments[i];
      const hex = worm.getSegmentColor(i, myIdx);
      this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(hex).color, 1);
      this.graphics.fillCircle(seg.x, seg.y, RULES.bodyRadius);
    }

    if (worm.segments.length > 1) {
      for (let i = worm.segments.length - 1; i >= 2; i--) {
        const hex = worm.getSegmentColor(i, myIdx);
        this.graphics.lineStyle(RULES.bodyRadius * 2, Phaser.Display.Color.HexStringToColor(hex).color, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(worm.segments[i].x, worm.segments[i].y);
        this.graphics.lineTo(worm.segments[i - 1].x, worm.segments[i - 1].y);
        this.graphics.strokePath();
      }
    }

    const head = worm.head;
    const headHex = worm.getSegmentColor(0, myIdx);
    this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(headHex).color, 1);
    this.graphics.fillCircle(head.x, head.y, RULES.headRadius);
    this.graphics.lineStyle(2, 0xffffff, 0.35);
    this.graphics.strokeCircle(head.x, head.y, RULES.headRadius);

    const eyeOff = RULES.headRadius * 0.4;
    const ex1 = head.x + Math.cos(worm.angle - 0.5) * eyeOff;
    const ey1 = head.y + Math.sin(worm.angle - 0.5) * eyeOff;
    const ex2 = head.x + Math.cos(worm.angle + 0.5) * eyeOff;
    const ey2 = head.y + Math.sin(worm.angle + 0.5) * eyeOff;
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(ex1, ey1, 3);
    this.graphics.fillCircle(ex2, ey2, 3);
    this.graphics.fillStyle(0x1a1a2e, 1);
    this.graphics.fillCircle(ex1 + Math.cos(worm.angle) * 1.5, ey1 + Math.sin(worm.angle) * 1.5, 1.5);
    this.graphics.fillCircle(ex2 + Math.cos(worm.angle) * 1.5, ey2 + Math.sin(worm.angle) * 1.5, 1.5);
  }
}
