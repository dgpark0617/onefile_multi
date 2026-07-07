const cache = new Map();

export function hexToPhaserColor(hex) {
  let c = cache.get(hex);
  if (c === undefined) {
    c = Phaser.Display.Color.HexStringToColor(hex).color;
    cache.set(hex, c);
  }
  return c;
}
