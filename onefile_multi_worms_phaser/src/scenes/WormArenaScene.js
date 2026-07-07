import { COLORS, PLAYER_DEFS, RULES, WORLD } from "../core/constants.js";
import { gameSession } from "../core/gameSession.js";
import { WormsSimulation } from "../core/wormSimulation.js";
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

  draw() {
    const sim = this.sim;
    this.graphics.clear();

    this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(COLORS.bg).color, 1);
    this.graphics.fillRect(0, 0, WORLD.width, WORLD.height);

    this.graphics.lineStyle(1, Phaser.Display.Color.HexStringToColor("#23314f").color, 0.6);
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

    for (const a of sim.apples) {
      this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(COLORS.apple).color, 1);
      this.graphics.fillCircle(a.x, a.y, a.r);
      this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(COLORS.appleLeaf).color, 1);
      this.graphics.fillTriangle(a.x, a.y - a.r, a.x + 5, a.y - a.r - 8, a.x + 3, a.y - a.r - 4);
    }

    const sorted = [...sim.worms].sort((a, b) => a.length - b.length);
    for (const worm of sorted) this.drawWorm(worm);

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

  drawWorm(worm) {
    if (!worm.alive) return;
    const myIdx = this.sim.myIndex;

    for (let i = worm.segments.length - 1; i >= 1; i--) {
      const seg = worm.segments[i];
      const hex = worm.getSegmentColor(i, myIdx);
      this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(hex).color, 1);
      this.graphics.fillCircle(seg.x, seg.y, RULES.bodyRadius);
    }

    const head = worm.head;
    this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(worm.getSegmentColor(0, myIdx)).color, 1);
    this.graphics.fillCircle(head.x, head.y, RULES.headRadius);
    this.graphics.lineStyle(2, 0xffffff, 0.35);
    this.graphics.strokeCircle(head.x, head.y, RULES.headRadius);
  }
}
