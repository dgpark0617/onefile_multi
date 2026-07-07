export class LobbyScene extends Phaser.Scene {
  constructor() {
    super("LobbyScene");
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1a1a2e");

    this.add
      .text(width / 2, 120, "Worms Arena (Phaser)", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "42px",
        color: "#4ade80",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 190, "분리 개발 + 원파일 빌드 데모", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "20px",
        color: "#94a3b8",
      })
      .setOrigin(0.5);

    const hint = [
      "조작: Left / Right 또는 A / D",
      "현재 단계: Phaser 싱글 코어 마이그레이션",
      "다음 단계: lockstep 네트워크 모듈 결합",
    ].join("\n");
    this.add
      .text(width / 2, 280, hint, {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "18px",
        color: "#cbd5e1",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const startBtn = this.add
      .rectangle(width / 2, 430, 260, 68, 0x2563eb)
      .setStrokeStyle(2, 0x60a5fa)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, 430, "Start Solo", {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    startBtn.on("pointerdown", () => {
      this.scene.start("WormArenaScene", { seed: Date.now() >>> 0 });
    });
  }
}
