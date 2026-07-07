import { COLORS, PLAYER_DEFS, RULES, WORLD } from "../core/constants.js";
import { hexToPhaserColor } from "../core/colorCache.js";
import { gameSession } from "../core/gameSession.js";
import { WormsSimulation } from "../core/wormSimulation.js";
import { WwNet } from "../net/WwNet.js";
import { showGameOverlay, showLobby } from "../ui/lobbyDom.js";

const BLOCKED_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "]);

function preventGameKeys(e) {
  if (BLOCKED_KEYS.has(e.key)) e.preventDefault();
}

export class WormArenaScene extends Phaser.Scene {
  constructor() {
    super("WormArenaScene");
  }

  init(data) {
    this.opts = data;
  }

  create() {
    this.bgGraphics = this.add.graphics().setDepth(0);
    this.paintStaticBackground(this.bgGraphics);

    this.graphics = this.add.graphics().setDepth(1);
    this.wormLabels = new Map();
    this.hudCache = { length: -1, apples: -1, alive: -1 };

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    window.addEventListener("keydown", preventGameKeys, { passive: false });
    window.addEventListener("keyup", preventGameKeys, { passive: false });

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
    const style = {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
    };
    this.lengthText = this.add.text(14, 10, "", { ...style, color: "#4ade80" }).setDepth(200);
    this.appleText = this.add.text(14, 36, "", { ...style, color: "#fbbf24" }).setDepth(200);
    this.aliveText = this.add.text(14, 62, "", { ...style, color: "#93c5fd" }).setDepth(200);
    this.hintText = this.add
      .text(WORLD.width - 14, 12, "ESC: 로비", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#94a3b8",
      })
      .setOrigin(1, 0)
      .setDepth(200);
  }

  paintStaticBackground(g) {
    g.fillStyle(hexToPhaserColor(COLORS.bg), 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.lineStyle(1, hexToPhaserColor("#23314f"), 0.45);
    for (let x = 0; x < WORLD.width; x += 40) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, WORLD.height);
      g.strokePath();
    }
    for (let y = 0; y < WORLD.height; y += 40) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(WORLD.width, y);
      g.strokePath();
    }
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
    window.removeEventListener("keydown", preventGameKeys);
    window.removeEventListener("keyup", preventGameKeys);
    for (const label of this.wormLabels.values()) label.destroy();
    this.wormLabels.clear();
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

    const appleColor = hexToPhaserColor(COLORS.apple);
    const leafColor = hexToPhaserColor(COLORS.appleLeaf);
    for (const a of sim.apples) {
      this.graphics.fillStyle(appleColor, 1);
      this.graphics.fillCircle(a.x, a.y, a.r);
      this.graphics.fillStyle(leafColor, 1);
      this.graphics.fillTriangle(a.x, a.y - a.r, a.x + 5, a.y - a.r - 8, a.x + 3, a.y - a.r - 4);
    }

    const sorted = [...sim.worms].sort((a, b) => a.length - b.length);
    for (const worm of sorted) this.drawWorm(worm);
    this.syncWormLabels(sim);

    const me = sim.myWorm();
    const len = me ? me.length : 0;
    const apples = me ? me.applesEaten : 0;
    const alive = sim.worms.filter((w) => w.alive).length;
    if (this.hudCache.length !== len) {
      this.hudCache.length = len;
      this.lengthText.setText(`길이: ${len}`);
    }
    if (this.hudCache.apples !== apples) {
      this.hudCache.apples = apples;
      this.appleText.setText(`사과: ${apples}`);
    }
    if (this.hudCache.alive !== alive) {
      this.hudCache.alive = alive;
      this.aliveText.setText(`생존: ${alive}`);
    }
  }

  syncWormLabels(sim) {
    if (sim.solo) {
      for (const label of this.wormLabels.values()) label.destroy();
      this.wormLabels.clear();
      return;
    }

    const aliveIds = new Set();
    for (const worm of sim.worms) {
      if (!worm.alive || !worm.isHuman()) continue;
      aliveIds.add(worm.id);
      const head = worm.head;
      const tag = worm.playerIndex === sim.myIndex ? "나" : PLAYER_DEFS[worm.playerIndex]?.emoji || "";
      const text = `${tag} ${worm.length}`;
      let label = this.wormLabels.get(worm.id);
      if (!label) {
        label = this.add
          .text(head.x, head.y - RULES.headRadius - 6, text, {
            fontFamily: "Segoe UI, sans-serif",
            fontSize: "11px",
            color: "#ffffff",
            fontStyle: "bold",
          })
          .setOrigin(0.5, 1)
          .setDepth(150);
        this.wormLabels.set(worm.id, label);
      } else {
        if (label.text !== text) label.setText(text);
        label.setPosition(head.x, head.y - RULES.headRadius - 6);
      }
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
      this.graphics.fillStyle(hexToPhaserColor(worm.getSegmentColor(i, myIdx)), 1);
      this.graphics.fillCircle(seg.x, seg.y, RULES.bodyRadius);
    }

    const head = worm.head;
    this.graphics.fillStyle(hexToPhaserColor(worm.getSegmentColor(0, myIdx)), 1);
    this.graphics.fillCircle(head.x, head.y, RULES.headRadius);
    this.graphics.lineStyle(2, 0xffffff, 0.35);
    this.graphics.strokeCircle(head.x, head.y, RULES.headRadius);
  }
}
