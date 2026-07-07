import { COLORS, PLAYER_DEFS, RULES, WORLD } from "../core/constants.js";
import { hexToPhaserColor } from "../core/colorCache.js";
import { gameSession } from "../core/gameSession.js";
import { PunchSimulation } from "../core/punchSimulation.js";
import { WwNet } from "../net/WwNet.js";
import { showGameOverlay, showLobby } from "../ui/lobbyDom.js";

const BLOCKED_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", " ", "w", "W"]);

function preventGameKeys(e) {
  if (BLOCKED_KEYS.has(e.key)) e.preventDefault();
}

export class PunchArenaScene extends Phaser.Scene {
  constructor() {
    super("PunchArenaScene");
  }

  init(data) {
    this.opts = data;
  }

  create() {
    this.bgGraphics = this.add.graphics().setDepth(0);
    this.paintArena(this.bgGraphics);

    this.graphics = this.add.graphics().setDepth(1);
    this.hudCache = { hp: -1, kills: -1, scale: -1, fwd: null };

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    window.addEventListener("keydown", preventGameKeys, { passive: false });
    window.addEventListener("keyup", preventGameKeys, { passive: false });

    this.sim = new PunchSimulation({
      ...this.opts,
      onBroadcastFrame: (payload) => WwNet.broadcast(payload),
      onEndGame: (result) => {
        showGameOverlay({ title: result.title, msg: result.msg });
        if (!result.solo && result.isHost) {
          WwNet.broadcast({
            type: "END",
            won: result.won ? this.sim.myIndex : (result.winner?.playerIndex ?? -1),
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
    const style = { fontFamily: "Segoe UI, sans-serif", fontSize: "18px" };
    this.hpText = this.add.text(14, 10, "", { ...style, color: "#f87171" }).setDepth(200);
    this.killText = this.add.text(14, 34, "", { ...style, color: "#fbbf24" }).setDepth(200);
    this.sizeText = this.add.text(14, 58, "", { ...style, color: "#93c5fd" }).setDepth(200);
    this.fwdText = this.add.text(14, 82, "", { ...style, color: "#a78bfa" }).setDepth(200);
    this.add
      .text(WORLD.width - 14, 12, "ESC: 로비", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "16px",
        color: "#94a3b8",
      })
      .setOrigin(1, 0)
      .setDepth(200);
  }

  paintArena(g) {
    g.fillStyle(hexToPhaserColor(COLORS.bg), 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.fillStyle(hexToPhaserColor("#2e1065"), 0.5);
    g.fillCircle(RULES.arenaCx, RULES.arenaCy, RULES.arenaRadius + 8);
    g.fillStyle(hexToPhaserColor("#3b0764"), 1);
    g.fillCircle(RULES.arenaCx, RULES.arenaCy, RULES.arenaRadius);
    g.lineStyle(4, hexToPhaserColor(COLORS.ringLine), 0.9);
    g.strokeCircle(RULES.arenaCx, RULES.arenaCy, RULES.arenaRadius);
    g.lineStyle(2, hexToPhaserColor("#6d28d9"), 0.35);
    g.strokeCircle(RULES.arenaCx, RULES.arenaCy, RULES.arenaRadius * 0.55);
  }

  getPlayerInput() {
    const touch = gameSession.consumePlayerInput();
    const kbLeft = this.keys.left.isDown || this.keys.a.isDown;
    const kbRight = this.keys.right.isDown || this.keys.d.isDown;
    let t = touch.t;
    if (kbLeft && !kbRight) t = -1;
    else if (kbRight && !kbLeft) t = 1;

    const inp = { t, f: touch.f, p: touch.p };
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      inp.f = 1;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      inp.p = 1;
    }
    return inp;
  }

  onShutdown() {
    window.removeEventListener("keydown", preventGameKeys);
    window.removeEventListener("keyup", preventGameKeys);
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
      () => this.getPlayerInput(),
      (payload) => WwNet.sendToHost(payload),
    );
    this.draw();
  }

  draw() {
    const sim = this.sim;
    this.graphics.clear();

    for (const o of sim.orbs) {
      this.graphics.fillStyle(hexToPhaserColor(COLORS.orb[o.hue % COLORS.orb.length]), 1);
      this.graphics.fillCircle(o.x, o.y, o.r);
      this.graphics.fillStyle(0xffffff, 0.35);
      this.graphics.fillCircle(o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.35);
    }

    const sorted = [...sim.fighters].sort((a, b) => a.scale - b.scale);
    for (const f of sorted) this.drawFighter(f);

    const me = sim.myFighter();
    if (me) {
      const hpStr = `HP ${Math.max(0, Math.ceil(me.hp))}/${me.maxHp}`;
      const killStr = `KO ${me.kills}`;
      const sizeStr = `크기 x${me.scale.toFixed(2)}`;
      const fwdStr = `전진 ${me.forwardOn ? "ON" : "off"}`;
      if (this.hudCache.hp !== hpStr) {
        this.hudCache.hp = hpStr;
        this.hpText.setText(hpStr);
      }
      if (this.hudCache.kills !== killStr) {
        this.hudCache.kills = killStr;
        this.killText.setText(killStr);
      }
      if (this.hudCache.scale !== sizeStr) {
        this.hudCache.scale = sizeStr;
        this.sizeText.setText(sizeStr);
      }
      if (this.hudCache.fwd !== fwdStr) {
        this.hudCache.fwd = fwdStr;
        this.fwdText.setText(fwdStr);
      }
    }
  }

  drawFighter(f) {
    if (!f.alive) return;
    const r = f.radius;
    const myIdx = this.sim.myIndex;

    this.graphics.fillStyle(hexToPhaserColor(f.color), 1);
    this.graphics.fillCircle(f.x, f.y, r);
    this.graphics.lineStyle(2, 0xffffff, f.playerIndex === myIdx ? 0.55 : 0.25);
    this.graphics.strokeCircle(f.x, f.y, r);

    const eyeOff = r * 0.35;
    const ex1 = f.x + Math.cos(f.angle - 0.45) * eyeOff;
    const ey1 = f.y + Math.sin(f.angle - 0.45) * eyeOff;
    const ex2 = f.x + Math.cos(f.angle + 0.45) * eyeOff;
    const ey2 = f.y + Math.sin(f.angle + 0.45) * eyeOff;
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(ex1, ey1, Math.max(2, r * 0.18));
    this.graphics.fillCircle(ex2, ey2, Math.max(2, r * 0.18));

    if (f.punchTimer > 0) {
      const side = f.punchSide === "left" ? -RULES.punchSideAngle : RULES.punchSideAngle;
      const a = f.angle + side;
      const reach = RULES.punchReach * f.scale;
      const gx = f.x + Math.cos(a) * (r + reach * 0.5);
      const gy = f.y + Math.sin(a) * (r + reach * 0.5);
      this.graphics.fillStyle(hexToPhaserColor("#fde047"), 0.85);
      this.graphics.fillCircle(gx, gy, r * 0.55);
      this.graphics.lineStyle(2, 0xffffff, 0.6);
      this.graphics.strokeCircle(gx, gy, r * 0.55);
    }

    if (f.isHuman() && !this.sim.solo) {
      const tag = f.playerIndex === myIdx ? "나" : PLAYER_DEFS[f.playerIndex]?.emoji || "";
      this.graphics.fillStyle(0xffffff, 0.9);
    }

    const hpPct = Math.max(0, f.hp / f.maxHp);
    const barW = r * 2;
    this.graphics.fillStyle(0x000000, 0.45);
    this.graphics.fillRect(f.x - barW / 2, f.y - r - 10, barW, 5);
    this.graphics.fillStyle(hexToPhaserColor(hpPct > 0.35 ? "#22c55e" : "#ef4444"), 1);
    this.graphics.fillRect(f.x - barW / 2, f.y - r - 10, barW * hpPct, 5);

    if (f.forwardOn) {
      const fx = f.x + Math.cos(f.angle) * (r + 6);
      const fy = f.y + Math.sin(f.angle) * (r + 6);
      this.graphics.fillStyle(hexToPhaserColor("#a78bfa"), 0.9);
      this.graphics.fillTriangle(
        fx,
        fy,
        fx + Math.cos(f.angle + 2.4) * 8,
        fy + Math.sin(f.angle + 2.4) * 8,
        fx + Math.cos(f.angle - 2.4) * 8,
        fy + Math.sin(f.angle - 2.4) * 8,
      );
    }
  }
}
