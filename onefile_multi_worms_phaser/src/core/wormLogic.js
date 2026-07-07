import { COLORS, RULES, WORLD } from "./constants.js";
import { randFrom, randIntFrom } from "./rng.js";

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export class Worm {
  static nextId = 1;

  constructor(x, y, opts = {}) {
    const rng = opts.rng || Math.random;
    this.id = opts.id ?? Worm.nextId++;
    this.playerIndex = opts.playerIndex ?? -1;
    this.color = opts.color ?? COLORS.worm[randIntFrom(rng, 0, COLORS.worm.length - 1)];
    this.angle = opts.angle ?? randFrom(rng, 0, Math.PI * 2);
    this.speed = RULES.baseSpeed;
    this.alive = true;
    this.applesEaten = 0;
    this.aiTarget = null;
    this.aiTimer = 0;
    this.pendingGrowth = 0;
    this.rainbowOffset = 0;
    this.segments = [];
    for (let i = 0; i < 3; i++) {
      this.segments.push({
        x: x - Math.cos(this.angle) * i * RULES.segmentDistance,
        y: y - Math.sin(this.angle) * i * RULES.segmentDistance,
      });
    }
  }

  get length() {
    return this.segments.length;
  }

  get head() {
    return this.segments[0];
  }

  isHuman() {
    return this.playerIndex >= 0;
  }

  getSegmentColor(index, myIdx) {
    if (this.playerIndex === myIdx && myIdx >= 0) {
      return COLORS.rainbow[(index + Math.floor(this.rainbowOffset)) % COLORS.rainbow.length];
    }
    return this.color;
  }

  grow(n = 1) {
    this.pendingGrowth += n;
  }

  update(turnInput, worms, apples, rng) {
    if (!this.alive) return;

    if (this.isHuman()) {
      if (turnInput) this.angle += turnInput * RULES.turnSpeed;
      this.rainbowOffset += 0.08;
    } else {
      this.updateAI(worms, apples, rng);
    }

    const head = this.head;
    const nx = head.x + Math.cos(this.angle) * this.speed;
    const ny = head.y + Math.sin(this.angle) * this.speed;
    const margin = RULES.headRadius;
    if (nx < margin || nx > WORLD.width - margin || ny < margin || ny > WORLD.height - margin) {
      this.angle += Math.PI;
    }

    const newHead = {
      x: Math.max(margin, Math.min(WORLD.width - margin, nx)),
      y: Math.max(margin, Math.min(WORLD.height - margin, ny)),
    };
    this.segments.unshift(newHead);

    for (let i = 1; i < this.segments.length; i++) {
      const prev = this.segments[i - 1];
      const curr = this.segments[i];
      const d = dist(prev.x, prev.y, curr.x, curr.y);
      if (d > RULES.segmentDistance) {
        const ratio = (d - RULES.segmentDistance) / d;
        curr.x += (prev.x - curr.x) * ratio;
        curr.y += (prev.y - curr.y) * ratio;
      }
    }

    if (this.pendingGrowth > 0) this.pendingGrowth -= 1;
    else if (this.segments.length > 3) this.segments.pop();
  }

  die(applesOut, rng) {
    this.alive = false;
    const count = Math.max(3, Math.floor(this.length * 0.6));
    for (let i = 0; i < count; i++) {
      const seg = this.segments[Math.floor((i * this.segments.length) / count)] || this.head;
      applesOut.push({
        x: seg.x + randFrom(rng, -15, 15),
        y: seg.y + randFrom(rng, -15, 15),
        r: 7,
      });
    }
  }

  updateAI(worms, apples, rng) {
    this.aiTimer -= 1;
    if (this.aiTimer <= 0 || !this.aiTarget) {
      this.aiTimer = randIntFrom(rng, 60, 180);
      if (apples.length > 0 && rng() < 0.7) {
        this.aiTarget = apples[randIntFrom(rng, 0, apples.length - 1)];
      } else {
        this.aiTarget = {
          x: randFrom(rng, 50, WORLD.width - 50),
          y: randFrom(rng, 50, WORLD.height - 50),
        };
      }
    }
    const head = this.head;
    const tx = this.aiTarget.x ?? WORLD.width / 2;
    const ty = this.aiTarget.y ?? WORLD.height / 2;
    const targetAngle = Math.atan2(ty - head.y, tx - head.x);
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += Math.sign(diff) * Math.min(Math.abs(diff), RULES.turnSpeed * 0.8);

    for (const other of worms) {
      if (other === this || !other.alive) continue;
      if (this.length > other.length * 1.1) {
        const d = dist(head.x, head.y, other.head.x, other.head.y);
        if (d < 200) {
          this.aiTarget = other;
          this.aiTimer = 30;
          break;
        }
      }
    }
  }
}
