import { DESIGN_H, DESIGN_W } from "../core/marioConstants.js";
import { MarioArenaScene } from "../scenes/MarioArenaScene.js";

export const gameConfig = {
  type: Phaser.CANVAS,
  width: DESIGN_W,
  height: DESIGN_H,
  parent: "app",
  backgroundColor: "#87ceeb",
  scene: [MarioArenaScene],
  fps: { target: 60, forceSetTimeOut: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_W,
    height: DESIGN_H,
  },
};
