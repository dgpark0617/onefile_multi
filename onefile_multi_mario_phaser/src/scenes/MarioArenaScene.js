import { DESIGN_H, DESIGN_W } from "../core/marioConstants.js";
import { createMarioEngine } from "../core/marioEngine.js";
import { gameSession } from "../core/gameSession.js";
import { WwNet } from "../net/WwNet.js";
import { showLobby } from "../ui/lobbyDom.js";

export class MarioArenaScene extends Phaser.Scene {
  constructor() {
    super("MarioArenaScene");
  }

  init(data) {
    this.opts = data;
  }

  create() {
    this.marioCanvas = document.createElement("canvas");
      this.marioCanvas.width = DESIGN_W;
      this.marioCanvas.height = DESIGN_H;
      this.marioCanvas.className = "mario-surface";

      const app = document.getElementById("app");
      if (app) app.appendChild(this.marioCanvas);

      this.engine = createMarioEngine({
        getCanvasContext: () => this.marioCanvas.getContext("2d"),
        getHudEl: (id) => document.getElementById(id),
        netBroadcast: (payload) => WwNet.broadcast(payload),
        WwNetRef: WwNet,
      });
      this.engine.setCtx(this.marioCanvas.getContext("2d"));

      this.mario = new this.engine.MarioGame({
        ...this.opts,
        externalDriver: true,
      });
      this.engine.game = this.mario;
      this.mario.start();
      gameSession.simulation = this.mario;
      gameSession.engine = this.engine;

    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  onShutdown() {
    this.mario?.stop();
    this.engine.game = null;
    gameSession.simulation = null;
    gameSession.engine = null;
    this.marioCanvas?.remove();
    this.marioCanvas = null;
  }

  update(time) {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      showLobby();
      this.scene.stop();
      return;
    }
    if (this.mario?.running) {
      this.mario.loop(time);
    }
  }
}
