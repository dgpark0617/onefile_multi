import { WORLD } from "../core/constants.js";
import { PunchArenaScene } from "../scenes/PunchArenaScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  width: WORLD.width,
  height: WORLD.height,
  parent: "app",
  backgroundColor: "#1a1030",
  scene: [PunchArenaScene],
  fps: { target: 60 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WORLD.width,
    height: WORLD.height,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
};
