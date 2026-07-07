import Phaser from "phaser";
import { gameConfig } from "./config/gameConfig.js";
import { gameSession } from "./core/gameSession.js";
import { initLobby } from "./ui/lobbyDom.js";
import { initMarioInput, setMarioGameRef } from "./ui/marioInput.js";

window.Phaser = Phaser;
window.__MARIO_BUILD_MODE__ = "modular";

const app = document.getElementById("app");
if (!app) throw new Error("#app root element is missing");

const game = new Phaser.Game(gameConfig);
initMarioInput();

initLobby({
  onStartGame: (opts) => {
    if (game.scene.isActive("MarioArenaScene")) game.scene.stop("MarioArenaScene");
    game.scene.start("MarioArenaScene", opts);
    setTimeout(() => setMarioGameRef(gameSession.simulation), 0);
  },
  onStopGame: () => {
    if (game.scene.isActive("MarioArenaScene")) game.scene.stop("MarioArenaScene");
    setMarioGameRef(null);
  },
  onRestartSolo: () => {
    game.scene.stop("MarioArenaScene");
    game.scene.start("MarioArenaScene", {
      solo: true,
      isHost: true,
      myIndex: 0,
      playerCount: 1,
    });
    setTimeout(() => setMarioGameRef(gameSession.simulation), 0);
  },
});
