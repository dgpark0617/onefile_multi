import { WORLD } from "../core/constants.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.scale.resize(WORLD.width, WORLD.height);
    this.scene.start("LobbyScene");
  }
}
