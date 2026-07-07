import { COLORS, PLAYER_DEFS, RULES, SPAWN_SPOTS, WORLD } from "./constants.js";
import { mulberry32, randFrom, randIntFrom } from "./rng.js";
import { Worm } from "./wormLogic.js";

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export class WormsSimulation {
  constructor(opts = {}) {
    this.solo = !!opts.solo;
    this.playerCount = opts.playerCount || 1;
    this.myIndex = opts.myIndex ?? 0;
    this.isHost = opts.isHost ?? this.solo;
    this.seed = opts.seed ?? (Date.now() >>> 0);
    this.onEndGame = opts.onEndGame ?? (() => {});
    this.onBroadcastFrame = opts.onBroadcastFrame ?? (() => {});
    this.rng = mulberry32(this.seed);
    this.worms = [];
    this.apples = [];
    this.gameOver = false;
    this.eliminated = false;
    this.won = false;
    this.simTick = 0;
    this.simAccumulator = 0;
    this.inputBuffer = {};
    this.lastSentInputTick = -1;
    this.disconnectedPlayers = new Set();
  }

  myWorm() {
    return this.worms.find((w) => w.playerIndex === this.myIndex);
  }

  spawnApple() {
    this.apples.push({
      x: randFrom(this.rng, 30, WORLD.width - 30),
      y: randFrom(this.rng, 30, WORLD.height - 30),
      r: 7 + randFrom(this.rng, 0, 2),
    });
  }

  initWorld() {
    if (this.solo) this.seed = Date.now() >>> 0;
    this.rng = mulberry32(this.seed);
    Worm.nextId = 1;
    this.worms = [];
    this.apples = [];
    this.gameOver = false;
    this.eliminated = false;
    this.won = false;
    this.simTick = 0;
    this.simAccumulator = 0;
    this.inputBuffer = {};
    this.lastSentInputTick = -1;
    this.disconnectedPlayers = new Set();

    for (let i = 0; i < RULES.appleCount; i++) this.spawnApple();

    const humans = this.solo ? 1 : this.playerCount;
    for (let i = 0; i < humans; i++) {
      const spot = SPAWN_SPOTS[i];
      this.worms.push(
        new Worm(spot.x, spot.y, {
          playerIndex: i,
          color: PLAYER_DEFS[i].color,
          angle: spot.angle,
          rng: this.rng,
        }),
      );
    }
    for (let i = 0; i < RULES.initialAi; i++) {
      const spot = SPAWN_SPOTS[(i + humans) % SPAWN_SPOTS.length];
      this.worms.push(
        new Worm(spot.x + randFrom(this.rng, -40, 40), spot.y + randFrom(this.rng, -40, 40), {
          color: COLORS.worm[i % COLORS.worm.length],
          angle: spot.angle,
          rng: this.rng,
        }),
      );
    }
  }

  spawnNewAI() {
    let x;
    let y;
    let safe = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      x = randFrom(this.rng, 80, WORLD.width - 80);
      y = randFrom(this.rng, 80, WORLD.height - 80);
      safe = true;
      for (const w of this.worms) {
        if (w.alive && dist(x, y, w.head.x, w.head.y) < 120) {
          safe = false;
          break;
        }
      }
      if (safe) break;
    }
    if (!safe) return;
    this.worms.push(
      new Worm(x, y, {
        color: COLORS.worm[randIntFrom(this.rng, 0, COLORS.worm.length - 1)],
        rng: this.rng,
      }),
    );
  }

  storeInput(tick, playerIndex, turn) {
    if (tick < this.simTick) return;
    if (!this.inputBuffer[tick]) this.inputBuffer[tick] = {};
    this.inputBuffer[tick][playerIndex] = turn;
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
      inputs[i] = this.disconnectedPlayers.has(i) ? 0 : (this.inputBuffer[tick]?.[i] ?? 0);
    }
    return inputs;
  }

  simulateTick(inputs) {
    if (this.gameOver) return;
    for (const w of this.worms) {
      const turn = w.isHuman() ? (inputs[w.playerIndex] ?? 0) : 0;
      w.update(turn, this.worms, this.apples, this.rng);
    }
    this.checkCollisions();
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

  onRemoteInput(from, tick, turn) {
    this.storeInput(tick, from, turn);
    if (this.isHost && tick === this.simTick && this.hasAllInputs(tick)) {
      this.sealFrame(tick);
    }
  }

  onFrame(tick, inputs) {
    if (this.solo || this.isHost) return;
    this.applyFrame(tick, inputs);
  }

  onPeerLeft(index) {
    this.disconnectedPlayers.add(index);
    if (this.isHost && this.hasAllInputs(this.simTick)) {
      this.sealFrame(this.simTick);
    }
  }

  checkCollisions() {
    for (const worm of this.worms) {
      if (!worm.alive) continue;
      const head = worm.head;

      for (let i = this.apples.length - 1; i >= 0; i--) {
        const a = this.apples[i];
        if (dist(head.x, head.y, a.x, a.y) < RULES.headRadius + a.r) {
          worm.grow(2);
          worm.applesEaten += 1;
          this.apples.splice(i, 1);
          this.spawnApple();
        }
      }

      for (const other of this.worms) {
        if (other === worm || !other.alive) continue;
        for (let i = 0; i < other.segments.length; i += 2) {
          const seg = other.segments[i];
          const sr = i === 0 ? RULES.headRadius : RULES.bodyRadius;
          const d = dist(head.x, head.y, seg.x, seg.y);
          if (d < RULES.headRadius + sr - 2) {
            if (worm.length > other.length * 1.15) {
              other.die(this.apples, this.rng);
              worm.grow(Math.floor(other.length * 0.5));
            } else if (worm.length < other.length * 0.85) {
              worm.die(this.apples, this.rng);
              this.onWormDied(worm);
            }
            break;
          }
        }
      }
    }

    const me = this.myWorm();
    if (me && !me.alive) this.onWormDied(me);
    if (!this.solo) this.checkMultiWinner();
  }

  onWormDied(worm) {
    if (this.solo && worm.playerIndex === this.myIndex) {
      this.endGame(false);
      return;
    }
    if (!this.solo && worm.playerIndex === this.myIndex && !this.eliminated) {
      this.eliminated = true;
    }
  }

  checkMultiWinner() {
    const aliveHumans = this.worms.filter((w) => w.isHuman() && w.alive);
    if (aliveHumans.length <= 1 && this.playerCount > 1) {
      const winner = aliveHumans[0];
      this.endGame(winner && winner.playerIndex === this.myIndex, winner);
    }
  }

  endGame(won, winnerWorm) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.won = won;
    const me = this.myWorm();
    let title;
    let msg;

    if (this.solo) {
      title = won ? "🎉 승리!" : "💀 게임 오버";
      msg = won
        ? `최종 길이 ${me?.length || 0}, 사과 ${me?.applesEaten || 0}개!`
        : `길이 ${me?.length || 0}, 사과 ${me?.applesEaten || 0}개 먹었습니다.`;
    } else if (won) {
      title = "🏆 승리!";
      msg = `최종 길이 ${winnerWorm?.length || me?.length || 0}`;
    } else if (this.eliminated) {
      title = "💀 탈락";
      msg = `길이 ${me?.length || 0} · 경기가 끝날 때까지 대기`;
    } else {
      title = "경기 종료";
      msg = winnerWorm
        ? `${PLAYER_DEFS[winnerWorm.playerIndex]?.name || "플레이어"} 승리!`
        : "무승부";
    }

    this.onEndGame({ won, title, msg, winnerWorm, solo: this.solo, isHost: this.isHost });
  }

  step(deltaMs, getTurnInput, onSendInput) {
    if (this.gameOver) return;

    this.simAccumulator += Math.min(deltaMs, 50);
    if (this.solo) {
      while (this.simAccumulator >= RULES.tickMs) {
        this.simAccumulator -= RULES.tickMs;
        this.applyFrame(this.simTick, { [this.myIndex]: getTurnInput() });
      }
      return;
    }

    if (this.isHost) {
      while (this.simAccumulator >= RULES.tickMs) {
        this.simAccumulator -= RULES.tickMs;
        const tick = this.simTick;
        this.storeInput(tick, this.myIndex, getTurnInput());
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
        onSendInput({ type: "INP", tick, turn: getTurnInput() });
        this.lastSentInputTick = tick;
      }
    }
  }
}
