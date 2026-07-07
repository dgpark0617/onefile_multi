import Phaser from "phaser";
import { gameConfig } from "./config/gameConfig.js";
import { gameSession } from "./core/gameSession.js";
import { initLobby } from "./ui/lobbyDom.js";

window.Phaser = Phaser;
window.__PUNCH_BUILD_MODE__ = "modular";

const app = document.getElementById("app");
if (!app) throw new Error("#app root element is missing");

const game = new Phaser.Game(gameConfig);

initLobby({
  onStartGame: (opts) => {
    if (game.scene.isActive("PunchArenaScene")) game.scene.stop("PunchArenaScene");
    game.scene.start("PunchArenaScene", opts);
  },
  onStopGame: () => {
    if (game.scene.isActive("PunchArenaScene")) game.scene.stop("PunchArenaScene");
  },
  onRestartSolo: () => {
    game.scene.stop("PunchArenaScene");
    gameSession.isInGame = true;
    game.scene.start("PunchArenaScene", {
      solo: true,
      isHost: true,
      myIndex: 0,
      playerCount: 1,
    });
  },
});
