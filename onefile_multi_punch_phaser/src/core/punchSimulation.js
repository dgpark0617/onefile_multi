import { COLORS, PLAYER_DEFS, RULES, SPAWN_SPOTS, WORLD } from "./constants.js";
import { mulberry32, randFrom, randIntFrom } from "./rng.js";
import {
  Fighter,
  normalizeInput,
  resolveFighterCollisions,
  spawnOrbsOnDeath,
} from "./fighterLogic.js";

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function randomSpot(rng) {
  const pad = RULES.worldMargin + 40;
  return {
    x: randFrom(rng, pad, WORLD.width - pad),
    y: randFrom(rng, pad, WORLD.height - pad),
    angle: randFrom(rng, 0, Math.PI * 2),
  };
}

export class PunchSimulation {
  constructor(opts = {}) {
    this.solo = !!opts.solo;
    this.playerCount = opts.playerCount || 1;
    this.myIndex = opts.myIndex ?? 0;
    this.isHost = opts.isHost ?? this.solo;
    this.seed = opts.seed ?? (Date.now() >>> 0);
    this.onEndGame = opts.onEndGame ?? (() => {});
    this.onBroadcastFrame = opts.onBroadcastFrame ?? (() => {});
    this.onHit = opts.onHit ?? (() => {});
    this.onOrbCollect = opts.onOrbCollect ?? (() => {});
    this.onFighterKO = opts.onFighterKO ?? (() => {});
    this.rng = mulberry32(this.seed);
    this.fighters = [];
    this.orbs = [];
    this.gameOver = false;
    this.eliminated = false;
    this.won = false;
    this.simTick = 0;
    this.simAccumulator = 0;
    this.inputBuffer = {};
    this.lastSentInputTick = -1;
    this.disconnectedPlayers = new Set();
  }

  myFighter() {
    return this.fighters.find((f) => f.playerIndex === this.myIndex);
  }

  spawnOrb() {
    const pad = RULES.worldMargin + RULES.orbRadius + 8;
    this.orbs.push({
      x: randFrom(this.rng, pad, WORLD.width - pad),
      y: randFrom(this.rng, pad, WORLD.height - pad),
      r: RULES.orbRadius,
      hue: randIntFrom(this.rng, 0, COLORS.orb.length - 1),
    });
  }

  initWorld() {
    if (this.solo) this.seed = Date.now() >>> 0;
    this.rng = mulberry32(this.seed);
    Fighter.nextId = 1;
    this.fighters = [];
    this.orbs = [];
    this.gameOver = false;
    this.eliminated = false;
    this.won = false;
    this.simTick = 0;
    this.simAccumulator = 0;
    this.inputBuffer = {};
    this.lastSentInputTick = -1;
    this.disconnectedPlayers = new Set();

    for (let i = 0; i < RULES.orbCount; i++) this.spawnOrb();

    const humans = this.solo ? 1 : this.playerCount;
    for (let i = 0; i < humans; i++) {
      const spot = SPAWN_SPOTS[i % SPAWN_SPOTS.length];
      this.fighters.push(
        new Fighter(spot.x, spot.y, {
          playerIndex: i,
          color: PLAYER_DEFS[i].color,
          angle: spot.angle,
          rng: this.rng,
        }),
      );
    }
    for (let i = 0; i < RULES.initialAi; i++) {
      const spot = randomSpot(this.rng);
      this.fighters.push(
        new Fighter(spot.x, spot.y, {
          color: COLORS.ai[i % COLORS.ai.length],
          angle: spot.angle,
          rng: this.rng,
        }),
      );
    }
  }

  spawnNewAI() {
    const spot = randomSpot(this.rng);
    let safe = true;
    for (const f of this.fighters) {
      if (f.alive && dist(spot.x, spot.y, f.x, f.y) < 80) {
        safe = false;
        break;
      }
    }
    if (!safe) return;
    this.fighters.push(
      new Fighter(spot.x, spot.y, {
        color: COLORS.ai[randIntFrom(this.rng, 0, COLORS.ai.length - 1)],
        angle: spot.angle,
        rng: this.rng,
      }),
    );
  }

  storeInput(tick, playerIndex, inp) {
    if (tick < this.simTick) return;
    if (!this.inputBuffer[tick]) this.inputBuffer[tick] = {};
    this.inputBuffer[tick][playerIndex] = normalizeInput(inp);
  }

  hasAllInputs(tick) {
    for (let i = 0; i < this.playerCount; i++) {
      if (this.disconnectedPlayers.has(i)) continue;
      if (this.inputBuffer[tick]?.[i] === undefined) return false;
    }
    return true;
  }

  getInputsArray(tick) {
    const inputs = {};
    for (let i = 0; i < this.playerCount; i++) {
      inputs[i] = this.disconnectedPlayers.has(i)
        ? { t: 0, f: 0, p: 0 }
        : normalizeInput(this.inputBuffer[tick]?.[i] ?? { t: 0, f: 0, p: 0 });
    }
    return inputs;
  }

  resolvePunches() {
    for (const attacker of this.fighters) {
      if (!attacker.alive || attacker.punchTimer <= 0 || attacker.punchDealt) continue;
      const glove = attacker.getPunchGlove();
      for (const target of this.fighters) {
        if (target === attacker || !target.alive) continue;
        if (attacker.punchHits(target)) {
          attacker.combo += 1;
          attacker.comboTimer = RULES.comboWindowTicks;
          const knockMult = 1 + Math.min(attacker.combo - 1, 5) * RULES.comboKnockbackBonus;
          const ko = target.takeHit(attacker, knockMult);
          this.onHit({ x: glove.x, y: glove.y, attacker: attacker.id, target: target.id });
          attacker.punchDealt = true;
          if (ko) {
            attacker.kills += 1;
            spawnOrbsOnDeath(target, this.orbs, this.rng);
            this.onFighterKO({ x: target.x, y: target.y, color: target.color });
            if (target.isHuman()) this.onFighterEliminated(target);
          }
        }
      }
    }
  }

  collectOrbs() {
    for (const f of this.fighters) {
      if (!f.alive) continue;
      for (let i = this.orbs.length - 1; i >= 0; i--) {
        const o = this.orbs[i];
        if (dist(f.x, f.y, o.x, o.y) < f.radius + o.r) {
          f.growFromOrb();
          this.onOrbCollect({ x: o.x, y: o.y });
          this.orbs.splice(i, 1);
          this.spawnOrb();
        }
      }
    }
  }

  onFighterEliminated(fighter) {
    if (this.solo && fighter.playerIndex === this.myIndex) {
      this.endGame(false);
      return;
    }
    if (!this.solo && fighter.playerIndex === this.myIndex && !this.eliminated) {
      this.eliminated = true;
    }
  }

  checkMultiWinner() {
    const aliveHumans = this.fighters.filter((f) => f.isHuman() && f.alive);
    if (aliveHumans.length <= 1 && this.playerCount > 1) {
      const winner = aliveHumans[0];
      this.endGame(winner && winner.playerIndex === this.myIndex, winner);
    }
  }

  simulateTick(inputs) {
    if (this.gameOver) return;

    for (const f of this.fighters) {
      const inp = f.isHuman() ? normalizeInput(inputs[f.playerIndex]) : { t: 0, f: 0, p: 0 };
      f.applyInput(inp, this.fighters, this.orbs, this.rng);
    }
    resolveFighterCollisions(this.fighters);
    this.resolvePunches();
    this.collectOrbs();
    this.checkMultiWinner();
  }

  applyFrame(tick, inputs) {
    if (tick !== this.simTick || this.gameOver) return;
    this.simulateTick(inputs);
    this.simTick += 1;
    if (this.simTick % RULES.aiSpawnTicks === 0) this.spawnNewAI();
    delete this.inputBuffer[tick];
  }

  sealFrame(tick) {
    if (tick !== this.simTick || this.gameOver) return;
    const inputs = this.getInputsArray(tick);
    if (!this.solo && this.isHost) {
      this.onBroadcastFrame({ type: "FRAME", tick, inputs });
    }
    this.applyFrame(tick, inputs);
  }

  onRemoteInput(from, tick, inp) {
    this.storeInput(tick, from, inp);
    if (this.isHost && tick === this.simTick && this.hasAllInputs(tick)) {
      this.sealFrame(tick);
    }
  }

  onFrame(tick, inputs) {
    if (this.solo || this.isHost) return;
    const norm = {};
    for (const k of Object.keys(inputs)) {
      norm[k] = normalizeInput(inputs[k]);
    }
    this.applyFrame(tick, norm);
  }

  onPeerLeft(index) {
    this.disconnectedPlayers.add(index);
    const f = this.fighters.find((x) => x.playerIndex === index);
    if (f && f.alive) {
      f.alive = false;
      spawnOrbsOnDeath(f, this.orbs, this.rng);
    }
    if (this.isHost && this.hasAllInputs(this.simTick)) {
      this.sealFrame(this.simTick);
    }
  }

  endGame(won, winner) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.won = won;
    const me = this.myFighter();
    let title;
    let msg;

    if (this.solo) {
      title = won ? "🏆 챔피언!" : "💀 KO";
      msg = won
        ? `KO ${me?.kills || 0} · 오브 ${me?.orbsEaten || 0}`
        : `KO ${me?.kills || 0} · 오브 ${me?.orbsEaten || 0} · 다시 도전!`;
    } else if (won) {
      title = "🏆 승리!";
      msg = `KO ${winner?.kills || me?.kills || 0}`;
    } else if (this.eliminated) {
      title = "💀 KO 탈락";
      msg = `KO ${me?.kills || 0} · 경기 종료까지 대기`;
    } else {
      title = "경기 종료";
      msg = winner
        ? `${PLAYER_DEFS[winner.playerIndex]?.name || "플레이어"} 승리!`
        : "무승부";
    }

    this.onEndGame({ won, title, msg, winner, solo: this.solo, isHost: this.isHost });
  }

  step(deltaMs, getPlayerInput, onSendInput) {
    if (this.gameOver) return;

    this.simAccumulator += Math.min(deltaMs, 50);
    if (this.solo) {
      while (this.simAccumulator >= RULES.tickMs) {
        this.simAccumulator -= RULES.tickMs;
        this.applyFrame(this.simTick, { [this.myIndex]: getPlayerInput() });
      }
      return;
    }

    if (this.isHost) {
      while (this.simAccumulator >= RULES.tickMs) {
        this.simAccumulator -= RULES.tickMs;
        const tick = this.simTick;
        this.storeInput(tick, this.myIndex, getPlayerInput());
        if (this.hasAllInputs(tick)) {
          this.sealFrame(tick);
        } else {
          break;
        }
      }
      return;
    }

    if (this.simAccumulator >= RULES.tickMs) {
      this.simAccumulator -= RULES.tickMs;
      const tick = this.simTick;
      if (this.lastSentInputTick < tick) {
        onSendInput({ type: "INP", tick, input: getPlayerInput() });
        this.lastSentInputTick = tick;
      }
    }
  }
}
