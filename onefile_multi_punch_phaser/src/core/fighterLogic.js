import { COLORS, PLAYER_DEFS, RULES } from "./constants.js";
import { randFrom, randIntFrom } from "./rng.js";

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function clampInArena(f) {
  const dx = f.x - RULES.arenaCx;
  const dy = f.y - RULES.arenaCy;
  const d = Math.hypot(dx, dy);
  const maxD = RULES.arenaRadius - f.radius;
  if (d > maxD && d > 0) {
    f.x = RULES.arenaCx + (dx / d) * maxD;
    f.y = RULES.arenaCy + (dy / d) * maxD;
    f.vx *= 0.3;
    f.vy *= 0.3;
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
    this.hp = RULES.baseHp;
    this.maxHp = RULES.baseHp;
    this.scale = 1;
    this.orbsEaten = 0;
    this.kills = 0;
    this.punchSide = "left";
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.punchDealt = false;
    this.combo = 0;
    this.comboTimer = 0;
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
    this.maxHp = RULES.baseHp + this.orbsEaten * RULES.hpPerOrb;
    this.hp = Math.min(this.maxHp, this.hp + RULES.healPerOrb);
  }

  startPunch() {
    if (this.punchCooldown > 0 || this.punchTimer > 0) return false;
    this.punchTimer = RULES.punchActiveTicks;
    this.punchCooldown = RULES.punchCooldownTicks;
    this.punchDealt = false;
    return true;
  }

  punchHitPoint() {
    const side = this.punchSide === "left" ? -RULES.punchSideAngle : RULES.punchSideAngle;
    const a = this.angle + side;
    const reach = RULES.punchReach * this.scale;
    return {
      x: this.x + Math.cos(a) * (this.radius + reach * 0.65),
      y: this.y + Math.sin(a) * (this.radius + reach * 0.65),
      reach: reach * 0.55,
      side: this.punchSide,
    };
  }

  applyInput(inp, fighters, orbs, rng) {
    if (!this.alive) return;

    if (this.isHuman()) {
      if (inp.t) this.angle += inp.t * RULES.turnSpeed;
      if (inp.f) this.forwardOn = !this.forwardOn;
      if (inp.p && this.startPunch()) {
        this.punchSide = this.punchSide === "left" ? "right" : "left";
      }
    } else {
      this.updateAI(fighters, orbs, rng);
    }

    if (this.punchCooldown > 0) this.punchCooldown -= 1;
    if (this.punchTimer > 0) this.punchTimer -= 1;
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
    clampInArena(this);
  }

  takeHit(from, damage, knockMult = 1) {
    this.hp -= damage;
    const dx = this.x - from.x;
    const dy = this.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    const kb = RULES.punchKnockback * knockMult / Math.sqrt(this.scale);
    this.vx += (dx / d) * kb;
    this.vy += (dy / d) * kb;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  updateAI(fighters, orbs, rng) {
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
          if (d < this.radius + f.radius + RULES.punchReach) {
            this.forwardOn = false;
            if (this.startPunch()) {
              this.punchSide = this.punchSide === "left" ? "right" : "left";
            }
          }
          return;
        }
      }
      this.aiTarget = best || {
        x: randFrom(rng, RULES.arenaCx - 120, RULES.arenaCx + 120),
        y: randFrom(rng, RULES.arenaCy - 120, RULES.arenaCy + 120),
      };
    }

    const tx = this.aiTarget.x ?? RULES.arenaCx;
    const ty = this.aiTarget.y ?? RULES.arenaCy;
    const targetAngle = Math.atan2(ty - this.y, tx - this.x);
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += Math.sign(diff) * Math.min(Math.abs(diff), RULES.turnSpeed * 0.9);

    const d = dist(this.x, this.y, tx, ty);
    this.forwardOn = d > 40;
    if (this.aiTarget.alive && d < this.radius + this.aiTarget.radius + RULES.punchReach * 0.9) {
      this.forwardOn = false;
      if (this.startPunch()) {
        this.punchSide = this.punchSide === "left" ? "right" : "left";
      }
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
