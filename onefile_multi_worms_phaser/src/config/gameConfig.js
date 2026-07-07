import { WORLD } from "../core/constants.js";
import { WormArenaScene } from "../scenes/WormArenaScene.js";

export const gameConfig = {
  type: Phaser.CANVAS,
  width: WORLD.width,
  height: WORLD.height,
  parent: "app",
  backgroundColor: "#16213e",
  scene: [WormArenaScene],
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WORLD.width,
    height: WORLD.height,
  },
};
