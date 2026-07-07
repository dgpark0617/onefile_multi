/** 가벼운 파티클·카메라 연출 (에셋 없음) */
export class GameEffects {
  constructor(scene) {
    this.scene = scene;
    this._ensureTexture();
    this.eatEmitter = scene.add.particles(0, 0, "fx-dot", {
      lifespan: 380,
      speed: { min: 50, max: 130 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xef4444,
      emitting: false,
      blendMode: "ADD",
    });
    this.deathEmitter = scene.add.particles(0, 0, "fx-dot", {
      lifespan: 520,
      speed: { min: 30, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.95, end: 0 },
      emitting: false,
      blendMode: "ADD",
    });
    this.eatEmitter.setDepth(100);
    this.deathEmitter.setDepth(100);
  }

  _ensureTexture() {
    if (this.scene.textures.exists("fx-dot")) return;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("fx-dot", 8, 8);
    g.destroy();
  }

  eatBurst(x, y) {
    this.eatEmitter.setPosition(x, y);
    this.eatEmitter.explode(10, x, y);
    this.shake(0.0025);
  }

  deathBurst(x, y, colorHex) {
    const tint = Phaser.Display.Color.HexStringToColor(colorHex || "#f472b6").color;
    this.deathEmitter.setParticleTint(tint);
    this.deathEmitter.explode(18, x, y);
    this.shake(0.006);
  }

  shake(intensity = 0.004) {
    this.scene.cameras.main.shake(120, intensity);
  }

  destroy() {
    this.eatEmitter?.destroy();
    this.deathEmitter?.destroy();
  }
}
