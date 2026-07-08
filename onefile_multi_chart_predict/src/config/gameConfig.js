import Phaser from "phaser";
import { WORLD } from "../core/constants.js";
import { ChartArenaScene } from "../scenes/ChartArenaScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  width: WORLD.width,
  height: WORLD.height,
  parent: "app",
  backgroundColor: "#070b14",
  scene: [ChartArenaScene],
  fps: { target: 60 },
  scale: {
    mode: Phaser.Scale.NONE,
    width: WORLD.width,
    height: WORLD.height,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
};
