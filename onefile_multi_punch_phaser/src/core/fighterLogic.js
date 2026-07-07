import { COLORS, RULES, WORLD } from "./constants.js";
import { randFrom, randIntFrom } from "./rng.js";

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function clampInWorld(f) {
  const m = RULES.worldMargin + f.radius;
  if (f.x < m) {
    f.x = m;
    f.vx = Math.abs(f.vx) * 0.4;
  }
  if (f.x > WORLD.width - m) {
    f.x = WORLD.width - m;
    f.vx = -Math.abs(f.vx) * 0.4;
  }
  if (f.y < m) {
    f.y = m;
    f.vy = Math.abs(f.vy) * 0.4;
  }
  if (f.y > WORLD.height - m) {
    f.y = WORLD.height - m;
    f.vy = -Math.abs(f.vy) * 0.4;
  }
}

export class Fighter {
  static nextId = 1;

  constructor(x, y, opts = {}) {
    const rng = opts.rng || Math.random;
    this.id = opts.id ?? Fighter.nextId++;
    this.playerIndex = opts.playerIndex ?? -1;
    this.color =
      opts.color ??
      COLORS.ai[randIntFrom(rng, 0, COLORS.ai.length - 1)];
    this.angle = opts.angle ?? randFrom(rng, 0, Math.PI * 2);
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.forwardOn = false;
    this.alive = true;
    this.hearts = RULES.baseHearts;
    this.maxHearts = RULES.baseHearts;
    this.scale = 1;
    this.orbsEaten = 0;
    this.kills = 0;
    this.punchSide = "left";
    this.punchHand = "left";
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.punchDealt = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.invincible = 0;
    this.hitFlash = 0;
    this.aiTimer = 0;
    this.aiTarget = null;
  }

  get radius() {
    return RULES.baseRadius * this.scale;
  }

  isHuman() {
    return this.playerIndex >= 0;
  }

  growFromOrb() {
    this.orbsEaten += 1;
    this.scale = Math.min(2.2, 1 + this.orbsEaten * RULES.scalePerOrb);
    this.maxHearts += RULES.heartsPerOrb;
    this.hearts = Math.min(this.maxHearts, this.hearts + RULES.heartsPerOrb);
  }

  startPunch() {
    if (this.punchCooldown > 0 || this.punchTimer > 0) return false;
    this.punchHand = this.punchSide;
    this.punchSide = this.punchSide === "left" ? "right" : "left";
    this.punchTimer = RULES.punchActiveTicks;
    this.punchCooldown = RULES.punchCooldownTicks;
    this.punchDealt = false;
    return true;
  }

  /** 장갑 위치: 어깨에서 시작해 정면 중앙 쪽으로 수렴하며 뻗음 */
  getPunchGlove() {
    const reach = RULES.punchReach * this.scale;
    const progress =
      RULES.punchActiveTicks > 0
        ? 1 - this.punchTimer / RULES.punchActiveTicks
        : 0;
    const extend = this.radius + reach * (0.35 + progress * 0.65);
    const perp = this.angle + Math.PI / 2;
    const shoulderSign = this.punchHand === "left" ? -1 : 1;
    const shoulderOff =
      shoulderSign * this.radius * RULES.punchShoulderRatio * (1 - progress * RULES.punchConverge);
    return {
      x: this.x + Math.cos(this.angle) * extend + Math.cos(perp) * shoulderOff,
      y: this.y + Math.sin(this.angle) * extend + Math.sin(perp) * shoulderOff,
      r: this.radius * 0.48,
    };
  }

  /** 정면 부채꼴 판정 — 바라보는 방향 앞쪽만 */
  punchHits(target) {
    if (target.invincible > 0) return false;
    const reach = RULES.punchReach * this.scale;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const along = dx * Math.cos(this.angle) + dy * Math.sin(this.angle);
    if (along < this.radius * 0.2 || along > this.radius + reach + target.radius * 0.45) {
      return false;
    }
    const perp = Math.abs(-dx * Math.sin(this.angle) + dy * Math.cos(this.angle));
    const halfWidth = this.radius * 0.65 + reach * 0.38;
    return perp < halfWidth + target.radius * 0.55;
  }

  applyInput(inp, fighters, orbs, rng) {
    if (!this.alive) return;

    if (this.isHuman()) {
      if (inp.t) this.angle += inp.t * RULES.turnSpeed;
      if (inp.f) this.forwardOn = !this.forwardOn;
      if (inp.p) this.startPunch();
    } else {
      this.updateAI(fighters, orbs, rng);
    }

    if (this.punchCooldown > 0) this.punchCooldown -= 1;
    if (this.punchTimer > 0) this.punchTimer -= 1;
    if (this.invincible > 0) this.invincible -= 1;
    if (this.hitFlash > 0) this.hitFlash -= 1;
    if (this.comboTimer > 0) {
      this.comboTimer -= 1;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    const speed = RULES.baseSpeed / Math.sqrt(this.scale);
    if (this.forwardOn) {
      this.vx += Math.cos(this.angle) * speed * 0.35;
      this.vy += Math.sin(this.angle) * speed * 0.35;
    }

    this.vx *= RULES.knockbackFriction;
    this.vy *= RULES.knockbackFriction;
    this.x += this.vx;
    this.y += this.vy;
    clampInWorld(this);
  }

  takeHit(from, knockMult = 1) {
    if (this.invincible > 0) return false;
    this.hearts -= 1;
    this.invincible = RULES.hitInvincibleTicks;
    this.hitFlash = RULES.hitInvincibleTicks;
    const dx = this.x - from.x;
    const dy = this.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    const kb = (RULES.punchKnockback * knockMult) / Math.sqrt(this.scale);
    this.vx += (dx / d) * kb;
    this.vy += (dy / d) * kb;
    if (this.hearts <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  updateAI(fighters, orbs, rng) {
    const pad = RULES.worldMargin + 60;
    this.aiTimer -= 1;
    if (this.aiTimer <= 0 || !this.aiTarget) {
      this.aiTimer = randIntFrom(rng, 40, 120);
      let best = null;
      let bestScore = -Infinity;
      for (const o of orbs) {
        const d = dist(this.x, this.y, o.x, o.y);
        const score = 200 - d;
        if (score > bestScore) {
          bestScore = score;
          best = o;
        }
      }
      for (const f of fighters) {
        if (f === this || !f.alive) continue;
        const d = dist(this.x, this.y, f.x, f.y);
        if (this.scale > f.scale * 1.05 && d < 160) {
          this.aiTarget = f;
          this.aiTimer = 25;
          if (d < this.radius + f.radius + RULES.punchReach * this.scale) {
            this.forwardOn = false;
            this.startPunch();
          }
          return;
        }
      }
      this.aiTarget = best || {
        x: randFrom(rng, pad, WORLD.width - pad),
        y: randFrom(rng, pad, WORLD.height - pad),
      };
    }

    const tx = this.aiTarget.x ?? WORLD.width / 2;
    const ty = this.aiTarget.y ?? WORLD.height / 2;
    const targetAngle = Math.atan2(ty - this.y, tx - this.x);
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += Math.sign(diff) * Math.min(Math.abs(diff), RULES.turnSpeed * 0.9);

    const d = dist(this.x, this.y, tx, ty);
    this.forwardOn = d > 40;
    if (this.aiTarget.alive && d < this.radius + this.aiTarget.radius + RULES.punchReach * this.scale) {
      this.forwardOn = false;
      this.startPunch();
    }
  }
}

export function spawnOrbsOnDeath(fighter, orbsOut, rng) {
  const n = Math.max(3, Math.floor(fighter.orbsEaten * 0.5) + 2);
  for (let i = 0; i < n; i++) {
    const a = randFrom(rng, 0, Math.PI * 2);
    const r = randFrom(rng, 8, 28);
    orbsOut.push({
      x: fighter.x + Math.cos(a) * r,
      y: fighter.y + Math.sin(a) * r,
      r: RULES.orbRadius,
      hue: randIntFrom(rng, 0, COLORS.orb.length - 1),
    });
  }
}

export function normalizeInput(inp) {
  if (typeof inp === "number") return { t: inp, f: 0, p: 0 };
  return {
    t: inp?.t ?? 0,
    f: inp?.f ? 1 : 0,
    p: inp?.p ? 1 : 0,
  };
}
