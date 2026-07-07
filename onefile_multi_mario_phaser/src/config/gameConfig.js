import { DESIGN_H, DESIGN_W } from "../core/marioConstants.js";
import { MarioArenaScene } from "../scenes/MarioArenaScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  width: DESIGN_W,
  height: DESIGN_H,
  parent: "app",
  backgroundColor: "#1a1a2e",
  scene: [MarioArenaScene],
  fps: { target: 60 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_W,
    height: DESIGN_H,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
};
