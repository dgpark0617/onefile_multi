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
    this.engine = createMarioEngine({
      getCanvasContext: () => this.game.canvas.getContext("2d"),
      getHudEl: (id) => document.getElementById(id),
      netBroadcast: (payload) => WwNet.broadcast(payload),
      WwNetRef: WwNet,
    });
    this.engine.setCtx(this.game.canvas.getContext("2d"));

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
