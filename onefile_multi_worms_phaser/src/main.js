import Phaser from "phaser";
import { gameConfig } from "./config/gameConfig.js";
import { gameSession } from "./core/gameSession.js";
import { initLobby } from "./ui/lobbyDom.js";

window.Phaser = Phaser;
window.__WORMS_BUILD_MODE__ = "modular";

const app = document.getElementById("app");
if (!app) {
  throw new Error("#app root element is missing");
}

const game = new Phaser.Game(gameConfig);

initLobby({
  onStartGame: (opts) => {
    if (game.scene.isActive("WormArenaScene")) {
      game.scene.stop("WormArenaScene");
    }
    game.scene.start("WormArenaScene", opts);
  },
  onStopGame: () => {
    if (game.scene.isActive("WormArenaScene")) {
      game.scene.stop("WormArenaScene");
    }
  },
  onRestartSolo: () => {
    game.scene.stop("WormArenaScene");
    gameSession.isInGame = true;
    game.scene.start("WormArenaScene", {
      solo: true,
      isHost: true,
      myIndex: 0,
      playerCount: 1,
    });
  },
});
