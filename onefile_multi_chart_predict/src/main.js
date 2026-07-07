import Phaser from "phaser";
import { gameConfig } from "./config/gameConfig.js";
import { gameSession } from "./core/gameSession.js";
import { initLobby } from "./ui/lobbyDom.js";

window.Phaser = Phaser;

const app = document.getElementById("app");
if (!app) throw new Error("#app root element is missing");

const game = new Phaser.Game(gameConfig);

function refreshGameScale() {
  requestAnimationFrame(() => {
    game.scale.refresh();
  });
}

function startArena() {
  if (game.scene.isActive("ChartArenaScene")) game.scene.stop("ChartArenaScene");
  game.scene.start("ChartArenaScene");
  refreshGameScale();
}

initLobby({
  onStartGame: () => {
    startArena();
  },
  onStopGame: () => {
    if (game.scene.isActive("ChartArenaScene")) game.scene.stop("ChartArenaScene");
  },
  onRestartSolo: () => {
    game.scene.stop("ChartArenaScene");
    gameSession.isInGame = true;
    startArena();
  },
});
