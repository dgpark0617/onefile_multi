const FONT = '"Segoe UI", system-ui, sans-serif';

export function burstParticles(scene, x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const size = 2 + Math.random() * 3;
    const p = scene.add.rectangle(x, y, size, size, color).setDepth(16);
    const ang = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 42;
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 320 + Math.random() * 220,
      ease: "Cubic.easeOut",
      onComplete: () => p.destroy(),
    });
  }
}

export function shakeCamera(scene, duration = 180, intensity = 0.0035) {
  scene.cameras.main.shake(duration, intensity);
}

export function floatPop(scene, text, x, y, color, size = "18px") {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: size,
      color,
      stroke: "#000000",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(17);
  scene.tweens.add({
    targets: t,
    y: y - 34,
    alpha: 0,
    scale: 1.15,
    duration: 720,
    ease: "Cubic.easeOut",
    onComplete: () => t.destroy(),
  });
}

export function pulseText(target, scene) {
  scene.tweens.add({
    targets: target,
    scale: 1.12,
    duration: 90,
    yoyo: true,
    ease: "Sine.easeOut",
  });
}
