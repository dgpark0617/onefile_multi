import { mulberry32 } from "./rng.js";
import { generateOverworld, generateUnderground, generateUnderwater } from "./levelGen.js";
import { getThemeForWorld, getThemeVehicle, pickThemeBoss } from "./mapThemes.js";
import { getCharSprite, preloadCharSprites } from "../assets/charSprites.js";
import {
  DOUBLE_JUMP_FORCE,
  FEATHER_DURATION,
  FRICTION,
  getCharacter,
  getLevelDef,
  GRAVITY,
  SOAP_BUBBLE_DURATION,
  SOAP_BUBBLE_SPEED,
  SOAP_BUBBLE_STEP,
  JUMP_CUT,
  JUMP_FORCE,
  LEVEL_COUNT,
  MAX_SPEED,
  MOVE_SPEED,
  NET_SUBSTEPS,
  NET_TICK_MS,
  NET_INPUT_WAIT_MS,
  PIPE_COOLDOWN,
  resolveCharacterIds,
  TICK_MS,
  UNDERGROUND_W,
  UNDERWATER_W,
  VH,
  VW,
  WORLD_W,
} from "./marioConstants.js";

preloadCharSprites();

export function createMarioEngine(env) {
  const { getCanvasContext, getHudEl, netBroadcastGame, netBroadcastCtrl, WwNetRef } = env;

  let ctx = null;
  let game = null;
  let cameraX = 0;

  function getWorldW() {
    if (!game) return WORLD_W;
    if (game.world === "underground" || game.world === "bonus") return UNDERGROUND_W;
    if (game.world === "underwater") return UNDERWATER_W;
    return WORLD_W;
  }

let overworldPlatforms = [
      { x: 0, y: 440, w: 730, h: 60 },
      { x: 815, y: 440, w: 370, h: 60 },
      { x: 1270, y: 440, w: 420, h: 60 },
      { x: 1775, y: 440, w: 310, h: 60 },
      { x: 2170, y: 440, w: 380, h: 60 },
      { x: 2635, y: 440, w: 330, h: 60 },
      { x: 3135, y: 440, w: 420, h: 60 },
      { x: 3645, y: 440, w: 1155, h: 60 },
      { x: 200, y: 350, w: 100, h: 18 },
      { x: 380, y: 310, w: 80, h: 18 },
      { x: 500, y: 300, w: 90, h: 18 },
      { x: 700, y: 340, w: 80, h: 18 },
      { x: 900, y: 340, w: 110, h: 18 },
      { x: 1080, y: 300, w: 80, h: 18 },
      { x: 1200, y: 290, w: 90, h: 18 },
      { x: 1500, y: 320, w: 100, h: 18 },
      { x: 1650, y: 290, w: 80, h: 18 },
      { x: 1800, y: 290, w: 90, h: 18 },
      { x: 2100, y: 340, w: 110, h: 18 },
      { x: 2350, y: 310, w: 80, h: 18 },
      { x: 2500, y: 300, w: 100, h: 18 },
      { x: 2750, y: 340, w: 80, h: 18 },
      { x: 2900, y: 300, w: 90, h: 18 },
      { x: 3200, y: 320, w: 100, h: 18 },
      { x: 3350, y: 290, w: 80, h: 18 },
      { x: 3500, y: 290, w: 90, h: 18 },
      { x: 4000, y: 350, w: 200, h: 18 },
      { x: 4200, y: 320, w: 80, h: 18 },
      { x: 4300, y: 300, w: 180, h: 18 }
    ];

    let undergroundPlatforms = [
      { x: 0, y: 440, w: UNDERGROUND_W, h: 60 },
    ];
    let bonusPlatforms = [
      { x: 0, y: 440, w: UNDERGROUND_W, h: 60 },
    ];
    let underwaterPlatforms = [
      { x: 0, y: 440, w: UNDERWATER_W, h: 60 },
    ];

    let platforms = overworldPlatforms;
    const PIPE_LIP = 10;

    const pipeDefs = {
      overworld: [
        { id: 'ow1', x: 700, y: 388, w: 52, h: 64, to: 'ug1', toWorld: 'underground', kind: 'jump' },
        { id: 'ow2', x: 2180, y: 388, w: 52, h: 64, to: 'bg1', toWorld: 'bonus', kind: 'bonus' }
      ],
      underground: [
        { id: 'ug1', x: 100, y: 388, w: 52, h: 64, to: 'ow1', toWorld: 'overworld' },
        { id: 'ug1b', x: UNDERGROUND_W - 160, y: 388, w: 52, h: 64, to: 'ow1', toWorld: 'overworld' }
      ],
      bonus: [
        { id: 'bg1', x: 100, y: 388, w: 52, h: 64, to: 'ow2', toWorld: 'overworld' },
        { id: 'bg1b', x: UNDERGROUND_W - 160, y: 388, w: 52, h: 64, to: 'ow2', toWorld: 'overworld' }
      ],
      underwater: [
        { id: 'uw1', x: UNDERWATER_W - 150, y: 388, w: 52, h: 64, to: 'owWater', toWorld: 'overworld' }
      ]
    };

    function pipeTopY(pipe) {
      return pipe.y - PIPE_LIP;
    }

    function pipeSolid(pipe) {
      return {
        x: pipe.x - 4,
        y: pipeTopY(pipe),
        w: pipe.w + 8,
        h: pipe.h + PIPE_LIP,
        pipeId: pipe.id,
      };
    }

    function rebuildPlatforms(world) {
      let base = overworldPlatforms;
      if (world === 'underground') base = undergroundPlatforms;
      else if (world === 'bonus') base = bonusPlatforms;
      else if (world === 'underwater') base = underwaterPlatforms;
      const solids = (pipeDefs[world] || []).map(pipeSolid);
      platforms = base.concat(solids);
    }
    rebuildPlatforms('overworld');

    let pits = [
      { x: 730, w: 85 },
      { x: 1185, w: 85 },
      { x: 1690, w: 85 },
      { x: 2085, w: 85 },
      { x: 2550, w: 85 },
      { x: 2965, w: 85 },
      { x: 3555, w: 85 }
    ];

    function getPlatformUnder(x, w, maxY = 500) {
      let best = null;
      for (const p of platforms) {
        if (x + w > p.x + 4 && x < p.x + p.w - 4 && p.y <= maxY) {
          if (!best || p.y < best.y) best = p;
        }
      }
      return best;
    }

    function hasGroundAhead(entity, dir) {
      const checkX = dir > 0 ? entity.x + entity.w + 8 : entity.x - 8;
      const plat = getPlatformUnder(checkX, entity.w, entity.y + entity.h + 80);
      const current = getPlatformUnder(entity.x, entity.w, entity.y + entity.h + 80);
      return plat && current && Math.abs(plat.y - current.y) < 5;
    }

    function snapToGround(entity) {
      const plat = getPlatformUnder(entity.x, entity.w, entity.y + entity.h + 60);
      if (plat) {
        entity.y = plat.y - entity.h;
        entity.onGround = true;
        entity.groundPlat = plat;
        return true;
      }
      entity.onGround = false;
      return false;
    }

    function inPit(x, w) {
      const cx = x + w / 2;
      return pits.some(p => !p.water && cx > p.x && cx < p.x + p.w);
    }

    function getWaterPit(x, w) {
      const cx = x + w / 2;
      return pits.find(p => p.water && cx > p.x && cx < p.x + p.w) || null;
    }

    function placePipeExit(dest, player, xOffset = 0) {
      if (dest.id === 'owWater' && player.game?.waterReturnX != null) {
        player.x = player.game.waterReturnX + 20 + xOffset;
      } else if ((dest.id || '').startsWith('ow')) {
        player.x = dest.x + dest.w + 14 + xOffset;
      } else {
        const safeX = {
          ug1: 108,
          ug1b: UNDERGROUND_W - 200,
          bg1: 108,
          bg1b: UNDERGROUND_W - 200,
          uw1: UNDERWATER_W - 200,
        };
        player.x = (safeX[dest.id] != null ? safeX[dest.id] : dest.x + 8) + xOffset;
      }
      player.y = dest.y - player.h - 8;
      player.vx = 0;
      player.vy = 0;
      let grounded = snapToGround(player);
      if (!grounded) {
        const floor = getPlatformUnder(player.x, player.w, player.y + player.h + 80);
        if (floor) {
          player.x = Math.max(floor.x + 8, Math.min(player.x, floor.x + floor.w - player.w - 8));
          player.y = floor.y - player.h;
          grounded = true;
        }
      }
      if (player.game && player.game.world === 'overworld' && inPit(player.x, player.w)) {
        const pit = pits.find(p => player.cx > p.x && player.cx < p.x + p.w);
        if (pit) player.x = pit.x + pit.w + 12;
        grounded = snapToGround(player) || grounded;
      }
      player.onGround = grounded;
      if (grounded) player.jumpsLeft = player.maxJumps;
      player.invincible = Math.max(player.invincible, 45);
    }

    function isPlayerOnPipe(player) {
      const list = pipeDefs[player.game?.world || 'overworld'] || [];
      for (const pipe of list) {
        const top = pipeTopY(pipe);
        // 파이프 '윗면'에 서 있을 때만 인정 (옆에서 몸만 스쳤을 때는 제외)
        if (player.cx > pipe.x + 4 && player.cx < pipe.x + pipe.w - 4 &&
            Math.abs(player.bottom - top) <= 8) {
          return true;
        }
      }
      return false;
    }

    class Player {
      constructor(g, index, charId) {
        this.game = g;
        this.index = index;
        this.def = getCharacter(charId);
        this.input = { left: false, right: false, jumpPressed: false, jumpHeld: false, downPressed: false, downHeld: false };
        this.alive = true;
        this.reset();
      }

      reset() {
        this.x = 80 + this.index * 48;
        this.y = 408;
        this.vx = 0;
        this.vy = 0;
        this.sizeLevel = this.def?.startSizeLevel || 0; // 0작음 1큼 2거대
        this.onGround = false;
        this.facing = 1;
        this.invincible = 0;
        this.w = 28;
        this.h = 32;
        this.jumpsLeft = this.maxJumps;
        this.jumpCutApplied = false;
        this.alive = true;
        this.fireCooldown = 0;
        this.featherTimer = 0;
        this.soapBubbleTimer = 0;
        this.inBubble = null;
        this.ridingVehicle = null;
        this.updateSize();
        if (this.sizeLevel >= 1) this.y -= 20;
        if (this.sizeLevel >= 2) this.y -= 16;
        snapToGround(this);
      }

      get big() { return this.sizeLevel >= 1; }
      get maxJumps() { return this.def?.maxJumps || 2; }
      get flying() { return this.featherTimer > 0; }
      get inSoapBubble() { return this.soapBubbleTimer > 0; }

      updateSize() {
        if (this.sizeLevel >= 2) {
          this.w = 44;
          this.h = 68;
        } else if (this.sizeLevel >= 1) {
          this.w = 36;
          this.h = 52;
        } else {
          this.w = 28;
          this.h = 32;
        }
      }

      grow() {
        if (this.sizeLevel < 2) {
          const prevH = this.h;
          this.sizeLevel++;
          this.updateSize();
          this.y -= (this.h - prevH);
          if (this.sizeLevel >= 2) popup('🍄🍄 거대화!');
          else popup('🍄 커짐!');
        }
        this.invincible = 60;
      }

      respawnAtStart(power = {}) {
        this.x = 80 + this.index * 48;
        this.y = 408;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.jumpsLeft = this.maxJumps;
        this.jumpCutApplied = false;
        this.fireCooldown = 0;
        this.alive = power.alive !== false;
        this.sizeLevel = power.sizeLevel != null ? power.sizeLevel : (power.big ? 1 : 0);
        this.featherTimer = power.featherTimer || 0;
        this.soapBubbleTimer = power.soapBubbleTimer || power.heliTimer || 0;
        this.inBubble = null;
        this.ridingVehicle = null;
        this.invincible = 90;
        this.updateSize();
        if (this.sizeLevel >= 1) this.y -= 20;
        if (this.sizeLevel >= 2) this.y -= 16;
        snapToGround(this);
      }

      shrink() {
        if (this.sizeLevel > 0) {
          const prevH = this.h;
          this.sizeLevel--;
          this.updateSize();
          this.y += (prevH - this.h);
          this.invincible = 60;
          return false;
        }
        return true;
      }

      get cx() { return this.x + this.w / 2; }
      get cy() { return this.y + this.h / 2; }
      get bottom() { return this.y + this.h; }
      get top() { return this.y; }

      update(opts = {}) {
        if (!this.alive) return;
        const predictive = !!opts.predictive;

        // 탈것 탑승 중 — 이동은 탈것이 처리
        if (this.ridingVehicle) {
          if (!predictive) this.input.jumpPressed = false;
          if (this.invincible > 0) this.invincible--;
          return;
        }

        const input = this.input;
        if (this.fireCooldown > 0) this.fireCooldown--;
        const soapBubble = this.soapBubbleTimer > 0;
        if (!predictive && !soapBubble && input.downPressed && this.fireCooldown <= 0 && !isPlayerOnPipe(this)) {
          const freeIce = !!(this.def && this.def.freeIce);
          if (freeIce || this.game.iceAmmo > 0) this.game.shootIce(this.index);
          else this.game.shootFireball(this.index);
          this.fireCooldown = 18;
        }
        if (input.left) { this.vx -= MOVE_SPEED; this.facing = -1; }
        if (input.right) { this.vx += MOVE_SPEED; this.facing = 1; }
        if (this.featherTimer > 0) this.featherTimer--;
        if (this.soapBubbleTimer > 0) this.soapBubbleTimer--;

        // 물속 공기방울 탑승 — 방울이 캐릭터를 감싸고 상승
        if (this.inBubble && !this.inBubble.popped) {
          const b = this.inBubble;
          b.fitTo(this);
          this.x = b.x - this.w / 2;
          this.y = b.y - this.h / 2;
          this.vx = 0;
          this.vy = 0;
          if (input.jumpPressed || input.left || input.right) {
            // 방향키/점프로 방울에서 탈출
            this.inBubble = null;
            b.occupied = false;
            b.popped = false;
            b.y = 430 + Math.random() * 40;
            b.x = 80 + Math.random() * (getWorldW() - 160);
            this.vy = JUMP_FORCE * 0.35;
            this.jumpsLeft = Math.max(this.jumpsLeft, 1);
          }
          if (!predictive) input.jumpPressed = false;
          if (this.invincible > 0) this.invincible--;
          return;
        }

        const underwater = this.game?.world === 'underwater';

        if (soapBubble) {
          // 비눗방울: 중력 없음, 위/아래 홀드 시 연속 이동
          const speed = SOAP_BUBBLE_SPEED || Math.max(3.5, SOAP_BUBBLE_STEP * 0.4);
          if (input.jumpHeld) this.vy = -speed;
          else if (input.downHeld || input.downPressed) this.vy = speed;
          else this.vy = 0;
          this.onGround = false;
        } else if (this.featherTimer > 0 && input.jumpHeld && !this.onGround) {
          this.vy -= 0.42;
          this.vy = Math.max(this.vy, -7.2);
        }

        if (input.jumpPressed && this.jumpsLeft > 0 && !soapBubble) {
          this.vy = this.jumpsLeft === this.maxJumps ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
          this.jumpsLeft--;
          this.onGround = false;
          this.jumpCutApplied = false;
        }
        if (!soapBubble && !input.jumpHeld && this.vy < 0 && !this.jumpCutApplied) {
          this.vy *= JUMP_CUT;
          this.jumpCutApplied = true;
        }
        if (!predictive) input.jumpPressed = false;

        this.vx *= underwater || soapBubble ? 0.9 : FRICTION;
        const maxSp = soapBubble ? MAX_SPEED * 1.1 : MAX_SPEED;
        this.vx = Math.max(-maxSp, Math.min(maxSp, this.vx));
        if (!soapBubble) {
          if (underwater) {
            this.vy += this.vy > 0 ? GRAVITY * 0.35 : GRAVITY * 0.28;
            this.vy = Math.max(-6, Math.min(5, this.vy));
          } else {
            this.vy += this.vy > 0 ? GRAVITY * 1.12 : GRAVITY;
          }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.onGround = false;

        if (this.x < 0) { this.x = 0; this.vx = 0; }
        if (this.x + this.w > getWorldW()) { this.x = getWorldW() - this.w; this.vx = 0; }

        for (const p of platforms) {
          if (this.x + this.w > p.x && this.x < p.x + p.w &&
              this.y + this.h > p.y && this.y < p.y + p.h) {
            const overlapL = (this.x + this.w) - p.x;
            const overlapR = (p.x + p.w) - this.x;
            const overlapT = (this.y + this.h) - p.y;
            const overlapB = (p.y + p.h) - this.y;
            const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);

            if (minOverlap === overlapT && this.vy >= 0) {
              this.y = p.y - this.h;
              this.vy = 0;
              this.onGround = true;
              this.jumpsLeft = this.maxJumps;
              this.jumpCutApplied = false;
              break;
            } else if (minOverlap === overlapB && this.vy < 0) {
              this.y = p.y + p.h;
              this.vy = 0;
            } else if (minOverlap === overlapL) {
              this.x = p.x - this.w;
              this.vx = 0;
            } else if (minOverlap === overlapR) {
              this.x = p.x + p.w;
              this.vx = 0;
            }
          }
        }

        // 물웅덩이 → 물속 세상 / 일반 구덩이 → 사망
        if (this.game.world === 'overworld' && this.bottom > 441) {
          const wp = getWaterPit(this.x, this.w);
          if (wp) {
            this.game.enterUnderwater(this, wp);
            return;
          }
          if (inPit(this.x, this.w)) {
            this.game.playerDie(this);
            return;
          }
        }
        // 비눗방울: ↓가 이동키라 하수구 탈출 불가 → 수면(화면 위)으로 나가면 지상 복귀
        if (underwater && soapBubble && this.y < -16) {
          this.game.exitUnderwaterSurface(this);
          return;
        }
        if (this.y > VH + 50) {
          this.game.playerDie(this);
        }

        if (this.invincible > 0) this.invincible--;
        if (Math.abs(this.vx) > 0.2 && this.onGround) {
          this.animPhase = (this.animPhase || 0) + 0.25;
        } else {
          this.animPhase = 0;
        }
      }

      draw() {
        if (!this.alive) return;
        const sx = this.x - cameraX;
        if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return;
        if (this.inSoapBubble) drawSoapBubble(sx + this.w / 2, this.y + this.h / 2, this.w, this.h);
        drawHero(sx, this.y, this.w, this.h, this.facing, this.sizeLevel, this.animPhase || 0, this.onGround, this.def, this.flying);
        if (this.inSoapBubble) drawSoapBubbleShine(sx + this.w / 2, this.y + this.h / 2, this.w, this.h);
        if (this.game && this.index === this.game.myIndex) {
          ctx.strokeStyle = 'rgba(251,191,36,0.85)';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx - 2, this.y - 2, this.w + 4, this.h + 4);
        }
      }

      toNet() {
        return {
          x: this.x, y: this.y, vx: this.vx, vy: this.vy,
          sizeLevel: this.sizeLevel, big: this.big, facing: this.facing,
          invincible: this.invincible, w: this.w, h: this.h, jumpsLeft: this.jumpsLeft,
          alive: this.alive, animPhase: this.animPhase || 0,
          featherTimer: this.featherTimer, soapBubbleTimer: this.soapBubbleTimer,
        };
      }

      applyNet(s) {
        this.x = s.x; this.y = s.y; this.vx = s.vx; this.vy = s.vy;
        this.sizeLevel = s.sizeLevel != null ? s.sizeLevel : (s.big ? 1 : 0);
        this.facing = s.facing; this.invincible = s.invincible;
        this.w = s.w; this.h = s.h; this.jumpsLeft = s.jumpsLeft;
        this.alive = s.alive; this.animPhase = s.animPhase || 0;
        if (s.featherTimer !== undefined) this.featherTimer = s.featherTimer;
        if (s.soapBubbleTimer !== undefined) this.soapBubbleTimer = s.soapBubbleTimer;
        else if (s.heliTimer !== undefined) this.soapBubbleTimer = s.heliTimer;
      }
    }

    function soapBubbleRadius(w, h) {
      return Math.max(w, h) * 0.62 + 8;
    }

    function drawSoapBubble(cx, cy, w, h) {
      const r = soapBubbleRadius(w, h);
      const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.05, cx, cy, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.35)');
      grad.addColorStop(0.35, 'rgba(186,230,253,0.22)');
      grad.addColorStop(0.7, 'rgba(167,139,250,0.12)');
      grad.addColorStop(1, 'rgba(56,189,248,0.08)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function drawSoapBubbleShine(cx, cy, w, h) {
      const r = soapBubbleRadius(w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(cx - r * 0.28, cy - r * 0.32, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawHeroWings(w, h, anim, flying) {
      if (!flying) return;
      const flap = Math.sin(anim * 2.4) * 0.22;
      const midY = h * 0.38;

      function angelWing(side) {
        const s = side; // -1 left, +1 right
        const ox = s < 0 ? -2 : w + 2;
        const oy = midY + s * flap * 4;
        const tilt = s * (0.35 + flap);

        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(tilt);

        // soft outer feathers
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeStyle = 'rgba(186,210,240,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * 22, -10, s * 28, 4);
        ctx.quadraticCurveTo(s * 24, 14, s * 10, 16);
        ctx.quadraticCurveTo(s * 4, 10, 0, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // mid layer
        ctx.fillStyle = 'rgba(248,250,255,0.92)';
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.quadraticCurveTo(s * 16, -4, s * 20, 6);
        ctx.quadraticCurveTo(s * 14, 12, s * 4, 12);
        ctx.closePath();
        ctx.fill();

        // inner soft glow
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.ellipse(s * 8, 4, 7, 4.5, s * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // feather lines
        ctx.strokeStyle = 'rgba(200,220,245,0.75)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(s * 2, 2);
        ctx.quadraticCurveTo(s * 14, 0, s * 22, 6);
        ctx.moveTo(s * 3, 6);
        ctx.quadraticCurveTo(s * 12, 8, s * 18, 12);
        ctx.stroke();

        ctx.restore();
      }

      angelWing(-1);
      angelWing(1);
    }

    /** 공통: 치비 얼굴 (피치와 같은 눈 비율) */
    function drawChibiFace(headCx, headCy, headR, opts = {}) {
      const eyeY = headCy + headR * (opts.eyeY ?? 0.06);
      const eyeHalfGap = headR * (opts.eyeGap ?? 0.3);
      const eyeW = headR * (opts.eyeW ?? 0.22);
      const eyeH = headR * (opts.eyeH ?? 0.26);
      const iris = opts.iris || '#1e293b';
      for (const side of [-1, 1]) {
        const ex = headCx + side * eyeHalfGap;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = iris;
        ctx.beginPath();
        ctx.arc(ex, eyeY + eyeH * 0.08, eyeW * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ex, eyeY + eyeH * 0.1, eyeW * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex + eyeW * 0.22, eyeY - eyeH * 0.15, eyeW * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      if (opts.blush) {
        ctx.fillStyle = 'rgba(251,113,133,0.45)';
        ctx.beginPath();
        ctx.arc(headCx - headR * 0.55, headCy + headR * 0.28, headR * 0.11, 0, Math.PI * 2);
        ctx.arc(headCx + headR * 0.55, headCy + headR * 0.28, headR * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      if (opts.brows) {
        ctx.strokeStyle = opts.browColor || '#3f2a1a';
        ctx.lineWidth = Math.max(1.2, headR * 0.08);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(headCx - eyeHalfGap - eyeW, eyeY - eyeH * 1.15);
        ctx.lineTo(headCx - eyeHalfGap + eyeW * 0.6, eyeY - eyeH * 0.95);
        ctx.moveTo(headCx + eyeHalfGap - eyeW * 0.6, eyeY - eyeH * 0.95);
        ctx.lineTo(headCx + eyeHalfGap + eyeW, eyeY - eyeH * 1.15);
        ctx.stroke();
      }
    }

    /** 피치 — 비율 유지 + 얼굴 디테일 통일 */
    function drawPeach(w, h, big, walk) {
      const scale = big ? 1.28 : 1;
      const headR = (big ? 13 : 10) * scale;
      const headCx = w / 2;
      const headCy = headR + (big ? 4 : 2);
      const bodyTop = headCy + headR - 2;
      const bodyH = (big ? 22 : 14) * scale;
      const legH = h - (headCy + headR) - bodyH + 4;
      const legSwing = walk * 4;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(w * 0.35 - legSwing, h - 3, 5 * scale, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.65 + legSwing, h - 3, 5 * scale, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f9a8d4';
      ctx.beginPath();
      ctx.moveTo(w * 0.24, bodyTop);
      ctx.lineTo(w * 0.76, bodyTop);
      ctx.lineTo(w * 0.86, bodyTop + bodyH + legH - 2);
      ctx.lineTo(w * 0.14, bodyTop + bodyH + legH - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#db2777';
      ctx.fillRect(w * 0.14, bodyTop + bodyH + legH - 5, w * 0.72, 2.5);

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(w * 0.16, bodyTop + bodyH * 0.12, headR * 0.3, headR * 0.22, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.84, bodyTop + bodyH * 0.12, headR * 0.3, headR * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(headCx, headCy - headR * 0.08, headR * 1.05, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(headCx - headR * 0.85, headCy + headR * 0.05, headR * 0.34, headR * 0.52, -0.12, 0, Math.PI * 2);
      ctx.ellipse(headCx + headR * 0.85, headCy + headR * 0.05, headR * 0.34, headR * 0.52, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffcba4';
      ctx.beginPath();
      ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(headCx, headCy - headR * 0.32, headR * 0.98, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(headCx - headR, headCy - headR * 0.3, headR * 2, headR * 0.22);

      const crownY = headCy - headR * 0.85;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(headCx - headR * 0.36, crownY + headR * 0.16);
      ctx.lineTo(headCx - headR * 0.36, crownY + headR * 0.02);
      ctx.lineTo(headCx - headR * 0.18, crownY + headR * 0.1);
      ctx.lineTo(headCx, crownY - headR * 0.08);
      ctx.lineTo(headCx + headR * 0.18, crownY + headR * 0.1);
      ctx.lineTo(headCx + headR * 0.36, crownY + headR * 0.02);
      ctx.lineTo(headCx + headR * 0.36, crownY + headR * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(headCx, crownY + headR * 0.06, headR * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(headCx - headR * 0.18, crownY + headR * 0.1, headR * 0.045, 0, Math.PI * 2);
      ctx.arc(headCx + headR * 0.18, crownY + headR * 0.1, headR * 0.045, 0, Math.PI * 2);
      ctx.fill();

      drawChibiFace(headCx, headCy, headR, { iris: '#3b82f6', blush: true });

      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(headCx, headCy + headR * 0.42, headR * 0.17, 0.25, Math.PI - 0.25);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(headCx - headR * 0.92, headCy + headR * 0.12, headR * 0.08, 0, Math.PI * 2);
      ctx.arc(headCx + headR * 0.92, headCy + headR * 0.12, headR * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff8fb';
      ctx.beginPath();
      ctx.ellipse(headCx, bodyTop + headR * 0.05, headR * 0.55, headR * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(headCx, bodyTop + headR * 0.1, headR * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(headCx, bodyTop + headR * 0.1, headR * 0.1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(w * 0.08, bodyTop + bodyH * 0.45, headR * 0.22, headR * 0.15, 0.1, 0, Math.PI * 2);
      ctx.ellipse(w * 0.92, bodyTop + bodyH * 0.45, headR * 0.22, headR * 0.15, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    /** 마리오 / 루이지 */
    function drawPlumber(w, h, big, walk, colors) {
      const scale = big ? 1.28 : 1;
      const headR = (big ? 13 : 10) * scale;
      const headCx = w / 2;
      const headCy = headR + (big ? 4 : 2);
      const bodyTop = headCy + headR - 2;
      const bodyH = (big ? 22 : 14) * scale;
      const legH = Math.max(4, h - (headCy + headR) - bodyH + 4);
      const legSwing = walk * 4;
      const shirt = colors.shirt;
      const overall = colors.overall;
      const hat = colors.hat;
      const emblem = colors.emblem || 'M';

      // 신발
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(w * 0.32 - legSwing, h - 2, 6.5 * scale, 3.8, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.68 + legSwing, h - 2, 6.5 * scale, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 바지/다리
      ctx.fillStyle = overall;
      ctx.fillRect(w * 0.28, bodyTop + bodyH - 1, w * 0.18, legH);
      ctx.fillRect(w * 0.54, bodyTop + bodyH - 1, w * 0.18, legH);

      // 상체 셔츠
      ctx.fillStyle = shirt;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(w * 0.2, bodyTop, w * 0.6, bodyH * 0.55, 3);
      else ctx.rect(w * 0.2, bodyTop, w * 0.6, bodyH * 0.55);
      ctx.fill();

      // 멜빵 오버올
      ctx.fillStyle = overall;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(w * 0.22, bodyTop + bodyH * 0.35, w * 0.56, bodyH * 0.65, 4);
      else ctx.rect(w * 0.22, bodyTop + bodyH * 0.35, w * 0.56, bodyH * 0.65);
      ctx.fill();
      ctx.fillRect(w * 0.28, bodyTop + 2, w * 0.12, bodyH * 0.4);
      ctx.fillRect(w * 0.6, bodyTop + 2, w * 0.12, bodyH * 0.4);

      // 노란 단추
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(w * 0.4, bodyTop + bodyH * 0.55, 2.4 * scale, 0, Math.PI * 2);
      ctx.arc(w * 0.6, bodyTop + bodyH * 0.55, 2.4 * scale, 0, Math.PI * 2);
      ctx.fill();

      // 장갑
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(w * 0.08, bodyTop + bodyH * 0.35, headR * 0.22, headR * 0.16, 0.15, 0, Math.PI * 2);
      ctx.ellipse(w * 0.92, bodyTop + bodyH * 0.35, headR * 0.22, headR * 0.16, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // 얼굴
      ctx.fillStyle = '#ffcba4';
      ctx.beginPath();
      ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
      ctx.fill();

      // 귀
      ctx.beginPath();
      ctx.ellipse(headCx - headR * 0.95, headCy + headR * 0.05, headR * 0.18, headR * 0.22, 0, 0, Math.PI * 2);
      ctx.ellipse(headCx + headR * 0.95, headCy + headR * 0.05, headR * 0.18, headR * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // 옆머리 (모자 아래)
      ctx.fillStyle = '#5c3d1e';
      ctx.beginPath();
      ctx.ellipse(headCx - headR * 0.78, headCy - headR * 0.05, headR * 0.28, headR * 0.4, -0.2, 0, Math.PI * 2);
      ctx.ellipse(headCx + headR * 0.78, headCy - headR * 0.05, headR * 0.28, headR * 0.4, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // 모자 (캡 + 챙)
      ctx.fillStyle = hat;
      ctx.beginPath();
      ctx.ellipse(headCx, headCy - headR * 0.42, headR * 1.02, headR * 0.72, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(headCx - headR * 1.02, headCy - headR * 0.35, headR * 2.04, headR * 0.36);
      // 챙 하이라이트
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(headCx - headR * 0.25, headCy - headR * 0.55, headR * 0.45, headR * 0.22, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hat;
      ctx.beginPath();
      ctx.ellipse(headCx, headCy - headR * 0.08, headR * 1.22, headR * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 모자 엠블럼
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(15,23,42,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(headCx, headCy - headR * 0.58, headR * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = hat;
      ctx.font = `bold ${Math.max(7, headR * 0.58)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emblem, headCx, headCy - headR * 0.55);

      drawChibiFace(headCx, headCy + headR * 0.02, headR, {
        iris: '#1e3a5f',
        blush: true,
        eyeY: 0.08,
      });

      // 코 (수염 위)
      ctx.fillStyle = '#f0a888';
      ctx.beginPath();
      ctx.ellipse(headCx, headCy + headR * 0.2, headR * 0.17, headR * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();

      // 콧수염 (둥근 쿠션형)
      ctx.fillStyle = '#4a2f16';
      ctx.beginPath();
      ctx.ellipse(headCx, headCy + headR * 0.4, headR * 0.58, headR * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(headCx - headR * 0.48, headCy + headR * 0.38, headR * 0.22, headR * 0.13, -0.35, 0, Math.PI * 2);
      ctx.ellipse(headCx + headR * 0.48, headCy + headR * 0.38, headR * 0.22, headR * 0.13, 0.35, 0, Math.PI * 2);
      ctx.fill();

      // 미소
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(headCx, headCy + headR * 0.52, headR * 0.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    /** 키노피오 */
    function drawToadHero(w, h, big, walk, def) {
      const scale = big ? 1.28 : 1;
      const headR = (big ? 11 : 8.5) * scale;
      const headCx = w / 2;
      const headCy = headR + (big ? 10 : 8);
      const bodyTop = headCy + headR - 2;
      const bodyH = (big ? 18 : 12) * scale;
      const legH = Math.max(4, h - (headCy + headR) - bodyH + 4);
      const legSwing = walk * 3;
      const spot = def?.capDot || '#dc2626';

      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.ellipse(w * 0.34 - legSwing, h - 2, 5.5 * scale, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.66 + legSwing, h - 2, 5.5 * scale, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(w * 0.3, bodyTop + bodyH - 1, w * 0.16, legH);
      ctx.fillRect(w * 0.54, bodyTop + bodyH - 1, w * 0.16, legH);

      // 조끼
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(w * 0.22, bodyTop, w * 0.56, bodyH, 4);
      else ctx.rect(w * 0.22, bodyTop, w * 0.56, bodyH);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(w * 0.42, bodyTop + 2, w * 0.16, bodyH * 0.7);

      // 얼굴 (작게, 버섯 아래)
      ctx.fillStyle = '#ffcba4';
      ctx.beginPath();
      ctx.arc(headCx, headCy + headR * 0.15, headR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // 거대 버섯 모자
      const capCy = headCy - headR * 0.55;
      ctx.fillStyle = '#fff8f0';
      ctx.beginPath();
      ctx.ellipse(headCx, capCy, headR * 1.5, headR * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // 캡 하이라이트
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(headCx - headR * 0.35, capCy - headR * 0.35, headR * 0.55, headR * 0.35, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(headCx, capCy - headR * 0.12, headR * 0.58, headR * 0.44, 0, 0, Math.PI * 2);
      ctx.arc(headCx - headR * 0.9, capCy + headR * 0.08, headR * 0.3, 0, Math.PI * 2);
      ctx.arc(headCx + headR * 0.9, capCy + headR * 0.08, headR * 0.3, 0, Math.PI * 2);
      ctx.arc(headCx - headR * 0.38, capCy + headR * 0.48, headR * 0.22, 0, Math.PI * 2);
      ctx.arc(headCx + headR * 0.42, capCy + headR * 0.45, headR * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // 흰 밑단 + 그림자
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(headCx, capCy + headR * 0.52, headR * 1.2, headR * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(headCx, capCy + headR * 0.48, headR * 1.12, headR * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      drawChibiFace(headCx, headCy + headR * 0.2, headR * 0.85, {
        iris: '#1e293b',
        blush: true,
        eyeY: 0.05,
        eyeGap: 0.28,
      });

      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(headCx, headCy + headR * 0.55, headR * 0.14, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }

    /** 쿠파 — 초록 얼굴·주둥이·등껍질 (도깨비 X) */
    function drawBowserHero(w, h, big, walk) {
      const scale = big ? 1.28 : 1;
      const headR = (big ? 11 : 9) * scale;
      const headCx = w / 2;
      const headCy = headR + (big ? 6 : 4);
      const bodyTop = headCy + headR * 0.55;
      const bodyH = (big ? 20 : 13) * scale;
      const legSwing = walk * 3;

      // 발(+발톱)
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(w * 0.3 - legSwing, h - 2, 7 * scale, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.7 + legSwing, h - 2, 7 * scale, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      for (const fx of [0.22, 0.3, 0.38, 0.62, 0.7, 0.78]) {
        const swing = fx < 0.5 ? -legSwing : legSwing;
        ctx.beginPath();
        ctx.moveTo(w * fx + swing, h - 5);
        ctx.lineTo(w * fx + swing - 2, h);
        ctx.lineTo(w * fx + swing + 2, h);
        ctx.fill();
      }

      // 등껍질 (몸 뒤) — 테두리·판
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(headCx, bodyTop + bodyH * 0.45, w * 0.44, bodyH * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(headCx, bodyTop + bodyH * 0.45, w * 0.4, bodyH * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      for (const [ox, oy, r] of [[-0.22, 0.25, 0.1], [0.05, 0.15, 0.12], [0.28, 0.28, 0.1], [-0.05, 0.55, 0.1], [0.2, 0.55, 0.09]]) {
        ctx.beginPath();
        ctx.arc(headCx + w * ox, bodyTop + bodyH * oy, w * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.2;
      for (const [ox, oy, r] of [[-0.22, 0.25, 0.1], [0.05, 0.15, 0.12], [0.28, 0.28, 0.1], [-0.05, 0.55, 0.1], [0.2, 0.55, 0.09]]) {
        ctx.beginPath();
        ctx.arc(headCx + w * ox, bodyTop + bodyH * oy, w * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 등 가시
      ctx.fillStyle = '#fef3c7';
      for (const ox of [-0.28, 0, 0.28]) {
        ctx.beginPath();
        ctx.moveTo(headCx + w * ox, bodyTop - 2);
        ctx.lineTo(headCx + w * ox - 5, bodyTop + bodyH * 0.28);
        ctx.lineTo(headCx + w * ox + 5, bodyTop + bodyH * 0.28);
        ctx.closePath();
        ctx.fill();
      }

      // 배
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(headCx, bodyTop + bodyH * 0.55, w * 0.28, bodyH * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(headCx - w * 0.12, bodyTop + bodyH * 0.4);
      ctx.lineTo(headCx + w * 0.12, bodyTop + bodyH * 0.4);
      ctx.moveTo(headCx - w * 0.14, bodyTop + bodyH * 0.55);
      ctx.lineTo(headCx + w * 0.14, bodyTop + bodyH * 0.55);
      ctx.stroke();

      // 팔
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(w * 0.12, bodyTop + bodyH * 0.35, headR * 0.28, headR * 0.35, 0.25, 0, Math.PI * 2);
      ctx.ellipse(w * 0.88, bodyTop + bodyH * 0.35, headR * 0.28, headR * 0.35, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(w * 0.08, bodyTop + bodyH * 0.55, headR * 0.2, headR * 0.16, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.92, bodyTop + bodyH * 0.55, headR * 0.2, headR * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      // 머리 (초록 — 파충류)
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(headCx, headCy, headR * 1.05, headR * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      // 빨간 머리숱
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(headCx - headR * 0.35, headCy - headR * 0.55);
      ctx.quadraticCurveTo(headCx, headCy - headR * 1.25, headCx + headR * 0.35, headCy - headR * 0.55);
      ctx.quadraticCurveTo(headCx, headCy - headR * 0.7, headCx - headR * 0.35, headCy - headR * 0.55);
      ctx.fill();

      // 뿔 (크림색, 뒤로 기울지 않게 위로)
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 1;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(headCx + side * headR * 0.55, headCy - headR * 0.35);
        ctx.lineTo(headCx + side * headR * 0.85, headCy - headR * 1.15);
        ctx.lineTo(headCx + side * headR * 0.25, headCy - headR * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 주둥이 (쿠파 시그니처)
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.ellipse(headCx + headR * 0.15, headCy + headR * 0.35, headR * 0.7, headR * 0.42, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.ellipse(headCx + headR * 0.2, headCy + headR * 0.38, headR * 0.5, headR * 0.28, 0.05, 0, Math.PI * 2);
      ctx.fill();
      // 이빨
      ctx.fillStyle = '#fff';
      for (const ox of [-0.25, -0.05, 0.15, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(headCx + headR * ox, headCy + headR * 0.22);
        ctx.lineTo(headCx + headR * (ox + 0.06), headCy + headR * 0.4);
        ctx.lineTo(headCx + headR * (ox + 0.12), headCy + headR * 0.22);
        ctx.fill();
      }

      // 눈 (红色 홍채, 눈썹 사나움 but 치비)
      drawChibiFace(headCx - headR * 0.05, headCy - headR * 0.05, headR * 0.95, {
        iris: '#dc2626',
        eyeY: 0.0,
        eyeGap: 0.34,
        eyeW: 0.2,
        eyeH: 0.24,
        brows: true,
        browColor: '#14532d',
      });

      // 팔찌/팔링
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(w * 0.1, bodyTop + bodyH * 0.42, headR * 0.22, headR * 0.12, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.9, bodyTop + bodyH * 0.42, headR * 0.22, headR * 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawSpriteHero(sx, y, w, h, facing, sizeLevel, anim, onGround, def, flying) {
      const img = getCharSprite(def?.sprite || def?.id);
      const dir = facing > 0 ? 1 : -1;
      const walk = onGround ? Math.sin(anim) : 0;
      const bob = walk * -1.5;
      const wingAnim = flying ? (anim || Date.now() / 80) : anim;
      const cx = sx + w / 2;
      const footY = y + h + bob;
      const big = sizeLevel >= 1;
      const huge = sizeLevel >= 2;

      const drawH = huge ? Math.max(h * 1.25, 88) : big ? Math.max(h * 1.35, 70) : Math.max(h * 1.55, 48);
      const aspect = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.72;
      const drawW = drawH * aspect;

      ctx.save();
      ctx.translate(cx, footY);
      ctx.scale(dir, 1);
      ctx.translate(-w / 2, -h);
      drawHeroWings(w, h, wingAnim, flying);
      ctx.restore();

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.translate(cx, footY);
        ctx.scale(dir, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
        ctx.restore();
      } else {
        ctx.fillStyle = def?.overall || '#2563eb';
        ctx.fillRect(sx, y + bob, w, h);
      }
    }

    function drawHero(sx, y, w, h, facing, sizeLevel, anim, onGround, def, flying) {
      const style = def?.style || 'hero';
      const level = typeof sizeLevel === 'number' ? sizeLevel : (sizeLevel ? 1 : 0);
      if (style === 'sprite' || def?.sprite) {
        drawSpriteHero(sx, y, w, h, facing, level, anim, onGround, def, flying);
        return;
      }
      const big = level >= 1;
      const dir = facing > 0 ? 1 : -1;
      const walk = onGround ? Math.sin(anim) : 0;
      const cx = sx + w / 2;
      const baseY = y + h;
      const wingAnim = flying ? (anim || Date.now() / 80) : anim;

      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(dir, 1);
      ctx.translate(-w / 2, -h + walk * -1.5);
      if (level >= 2) {
        ctx.translate(w / 2, h);
        ctx.scale(1.12, 1.12);
        ctx.translate(-w / 2, -h);
      }

      drawHeroWings(w, h, wingAnim, flying);

      if (style === 'peach') {
        drawPeach(w, h, big, walk);
      } else if (style === 'bowser') {
        drawBowserHero(w, h, big, walk);
      } else if (style === 'toad') {
        drawToadHero(w, h, big, walk, def);
      } else {
        const isLuigi = (def?.id === 'luigi') || (def?.hat === '#16a34a');
        drawPlumber(w, h, big, walk, {
          shirt: isLuigi ? '#16a34a' : '#dc2626',
          overall: isLuigi ? '#1d4ed8' : '#2563eb',
          hat: isLuigi ? '#16a34a' : '#dc2626',
          emblem: isLuigi ? 'L' : 'M',
        });
      }

      ctx.restore();
    }

    class Coin {
      constructor(x, y, kind = 'gold', rng) {
        this.x = x; this.y = y; this.r = 10; this.collected = false;
        this.kind = kind;
        this.bob = (rng ? rng() : Math.random()) * Math.PI * 2;
      }
      update() { this.bob += 0.08; }
      draw() {
        if (this.collected) return;
        const y = this.y + Math.sin(this.bob) * 3;
        const sx = this.x - cameraX;
        ctx.beginPath();
        ctx.arc(sx, y, this.r, 0, Math.PI * 2);
        if (this.kind === 'blue') {
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#e0f2fe';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('❄', sx, y + 4);
        } else {
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fde68a';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('C', sx, y + 4);
        }
      }
    }

    class PowerFeather {
      constructor(x, y, rng) {
        this.x = x; this.y = y; this.w = 30; this.h = 28;
        this.vy = 0; this.collected = false;
        this.bob = (rng ? rng() : Math.random()) * Math.PI * 2;
      }
      update() {
        if (this.collected) return;
        this.bob += 0.06;
        this.y += Math.sin(this.bob) * 0.15;
      }
      draw() {
        if (this.collected) return;
        const sx = this.x - cameraX;
        const cy = this.y + Math.sin(this.bob) * 4;
        const flap = Math.sin(this.bob * 2) * 0.18;
        const midX = sx + this.w / 2;
        const midY = cy + this.h * 0.55;

        function drawItemWing(side) {
          const s = side;
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(s * (0.4 + flap));

          ctx.fillStyle = 'rgba(255,255,255,0.98)';
          ctx.strokeStyle = 'rgba(186,210,240,0.95)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(s * 20, -12, s * 26, 2);
          ctx.quadraticCurveTo(s * 22, 12, s * 8, 14);
          ctx.quadraticCurveTo(s * 3, 8, 0, 1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = 'rgba(248,250,255,0.95)';
          ctx.beginPath();
          ctx.moveTo(0, 1);
          ctx.quadraticCurveTo(s * 14, -3, s * 18, 5);
          ctx.quadraticCurveTo(s * 12, 11, s * 3, 10);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(200,220,245,0.85)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(s * 2, 2);
          ctx.quadraticCurveTo(s * 12, 0, s * 20, 5);
          ctx.moveTo(s * 3, 6);
          ctx.quadraticCurveTo(s * 10, 7, s * 16, 11);
          ctx.stroke();
          ctx.restore();
        }

        drawItemWing(-1);
        drawItemWing(1);

        // 중앙 깃털 촉
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.ellipse(midX, midY + 2, 3, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(midX, midY, 1.2, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('날개', midX, cy + 4);
      }
    }

    class PowerMushroom {
      constructor(x, y) {
        this.x = x; this.y = y; this.w = 28; this.h = 28;
        this.vx = 0; this.vy = 0; this.collected = false;
        this.onGround = false;
      }
      update() {
        if (this.collected) return;
        this.vy += GRAVITY;
        this.y += this.vy;
        this.onGround = false;

        for (const p of platforms) {
          if (this.x + this.w > p.x && this.x < p.x + p.w &&
              this.y + this.h > p.y && this.y < p.y + p.h) {
            const overlapT = (this.y + this.h) - p.y;
            const overlapB = (p.y + p.h) - this.y;
            if (overlapT < overlapB && this.vy >= 0) {
              this.y = p.y - this.h;
              this.vy = 0;
              this.onGround = true;
            }
          }
        }
      }
      draw() {
        if (this.collected) return;
        const sx = this.x - cameraX;
        drawEnemyMushroom(sx + this.w / 2, this.y + this.h, 14, '#ef4444', false);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, this.y + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', sx + this.w / 2, this.y + 7);
      }
    }

    class MushroomEnemy {
      constructor(x, y, range = 100, speed = 1.8) {
        this.x = x; this.y = y; this.w = 30; this.h = 30;
        this.vx = -speed; this.startX = x; this.range = range;
        this.speed = speed;
        this.alive = true; this.squished = false; this.squishTimer = 0;
        this.vy = 0;
        this.frozen = false; this.frozenTimer = 0;
        snapToGround(this);
      }
      update() {
        if (!this.alive) {
          if (this.squished) { this.squishTimer--; if (this.squishTimer <= 0) this.alive = false; }
          return;
        }
        if (this.frozen) {
          this.frozenTimer--;
          if (this.frozenTimer <= 0) this.frozen = false;
          return;
        }

        if (!hasGroundAhead(this, this.vx > 0 ? 1 : -1)) this.vx *= -1;

        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < this.startX - this.range || this.x > this.startX + this.range) this.vx *= -1;

        if (!snapToGround(this)) {
          if (this.y > VH + 50) this.alive = false;
        } else {
          this.vy = 0;
        }
      }
      stomp() {
        this.squished = true;
        this.squishTimer = 20;
        this.h = 10;
        this.y += 20;
        snapToGround(this);
        addParticles(this.x + this.w / 2, this.y, '#a16207');
      }
      draw() {
        if (!this.alive && !this.squished) return;
        const sx = this.x - cameraX;
        if (this.squished) {
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.ellipse(sx + this.w / 2, this.y + this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        drawEnemyMushroom(sx + this.w / 2, this.y + this.h - 4, 15, this.frozen ? '#7dd3fc' : '#a16207', true);
      }
    }

    /** 테마별 지상 적 (슬라임·로봇·게 등) */
    class ThemedEnemy {
      constructor(x, y, range = 100, speed = 1.8, enemyType = "mushroom") {
        this.enemyType = enemyType;
        const tall = enemyType === "rock" || enemyType === "robot";
        this.x = x;
        this.y = y;
        this.w = enemyType === "crab" ? 32 : enemyType === "rock" ? 36 : 30;
        this.h = tall ? 34 : enemyType === "crab" ? 22 : 30;
        this.vx = -speed;
        this.startX = x;
        this.range = range;
        this.speed = speed;
        this.alive = true;
        this.squished = false;
        this.squishTimer = 0;
        this.vy = 0;
        this.frozen = false;
        this.frozenTimer = 0;
        this.anim = Math.random() * Math.PI * 2;
        snapToGround(this);
      }
      update() {
        if (!this.alive) {
          if (this.squished) { this.squishTimer--; if (this.squishTimer <= 0) this.alive = false; }
          return;
        }
        if (this.frozen) {
          this.frozenTimer--;
          if (this.frozenTimer <= 0) this.frozen = false;
          return;
        }
        this.anim += 0.14;
        if (!hasGroundAhead(this, this.vx > 0 ? 1 : -1)) this.vx *= -1;
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < this.startX - this.range || this.x > this.startX + this.range) this.vx *= -1;
        if (!snapToGround(this)) {
          if (this.y > VH + 50) this.alive = false;
        } else {
          this.vy = 0;
        }
      }
      stomp() {
        this.squished = true;
        this.squishTimer = 20;
        this.h = Math.max(8, this.h * 0.35);
        this.y += 20;
        snapToGround(this);
        addParticles(this.x + this.w / 2, this.y, '#94a3b8', 6);
      }
      draw() {
        if (!this.alive && !this.squished) return;
        const sx = this.x - cameraX;
        if (this.squished) {
          ctx.fillStyle = 'rgba(71,85,105,0.7)';
          ctx.beginPath();
          ctx.ellipse(sx + this.w / 2, this.y + this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        drawThemedEnemy(this.enemyType, sx, this.y, this.w, this.h, this.frozen, this.anim, this.vx > 0 ? 1 : -1);
      }
    }

    function drawThemedEnemy(type, sx, y, w, h, frozen, anim, dir) {
      const cx = sx + w / 2;
      const foot = y + h;
      const chill = frozen ? '#7dd3fc' : null;
      ctx.save();
      if (chill) {
        ctx.globalAlpha = 0.85;
      }
      switch (type) {
        case "slime": {
          const bob = Math.sin(anim) * 2;
          ctx.fillStyle = chill || '#22c55e';
          ctx.beginPath();
          ctx.ellipse(cx, foot - h * 0.35 + bob, w * 0.48, h * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath();
          ctx.ellipse(cx - w * 0.12, foot - h * 0.55 + bob, w * 0.14, h * 0.1, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(cx - 5, foot - h * 0.42 + bob, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + 5, foot - h * 0.42 + bob, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "bat": {
          const flap = Math.sin(anim * 3) * 0.5;
          ctx.fillStyle = chill || '#4c1d95';
          ctx.beginPath();
          ctx.ellipse(cx, y + h * 0.45, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = chill || '#6d28d9';
          ctx.beginPath();
          ctx.moveTo(cx, y + h * 0.4);
          ctx.quadraticCurveTo(cx - w * 0.55, y + h * (0.1 - flap), cx - w * 0.65, y + h * 0.55);
          ctx.quadraticCurveTo(cx - w * 0.2, y + h * 0.35, cx, y + h * 0.45);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(cx, y + h * 0.4);
          ctx.quadraticCurveTo(cx + w * 0.55, y + h * (0.1 - flap), cx + w * 0.65, y + h * 0.55);
          ctx.quadraticCurveTo(cx + w * 0.2, y + h * 0.35, cx, y + h * 0.45);
          ctx.fill();
          ctx.fillStyle = '#fde68a';
          ctx.beginPath();
          ctx.arc(cx - 4, y + h * 0.42, 2, 0, Math.PI * 2);
          ctx.arc(cx + 4, y + h * 0.42, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "ember": {
          const pulse = 1 + Math.sin(anim * 2) * 0.08;
          const g = ctx.createRadialGradient(cx, y + h * 0.45, 2, cx, y + h * 0.45, w * 0.5);
          g.addColorStop(0, chill || '#fde68a');
          g.addColorStop(0.45, chill || '#f97316');
          g.addColorStop(1, chill || '#dc2626');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(cx, y + h * 0.45, w * 0.42 * pulse, h * 0.4 * pulse, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.arc(cx - 4, y + h * 0.35, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "rock": {
          ctx.fillStyle = chill || '#57534e';
          ctx.beginPath();
          ctx.moveTo(cx - w * 0.4, foot);
          ctx.lineTo(cx - w * 0.35, y + h * 0.15);
          ctx.lineTo(cx + w * 0.1, y);
          ctx.lineTo(cx + w * 0.42, y + h * 0.2);
          ctx.lineTo(cx + w * 0.38, foot);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#78716c';
          ctx.fillRect(cx - 8, y + h * 0.35, 16, 4);
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(cx - 4, y + h * 0.38, 2, 0, Math.PI * 2);
          ctx.arc(cx + 4, y + h * 0.38, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "robot": {
          ctx.fillStyle = chill || '#64748b';
          ctx.fillRect(sx + 4, y + 6, w - 8, h - 10);
          ctx.fillStyle = chill || '#94a3b8';
          ctx.fillRect(sx + 7, y + 2, w - 14, 10);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(cx - 4, y + 5, 8, 4);
          ctx.fillStyle = '#334155';
          ctx.fillRect(sx + 2, foot - 6, 7, 6);
          ctx.fillRect(sx + w - 9, foot - 6, 7, 6);
          break;
        }
        case "drone": {
          const hover = Math.sin(anim * 2) * 3;
          ctx.fillStyle = chill || '#475569';
          ctx.beginPath();
          ctx.ellipse(cx, y + h * 0.55 + hover, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, y + h * 0.5 + hover);
          ctx.lineTo(sx + w, y + h * 0.5 + hover);
          ctx.stroke();
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(cx, y + h * 0.55 + hover, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "rat": {
          ctx.fillStyle = chill || '#78716c';
          ctx.beginPath();
          ctx.ellipse(cx, y + h * 0.55, w * 0.42, h * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#a8a29e';
          ctx.beginPath();
          ctx.arc(sx + (dir > 0 ? w * 0.78 : w * 0.22), y + h * 0.45, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fca5a5';
          ctx.beginPath();
          ctx.arc(sx + (dir > 0 ? w * 0.15 : w * 0.85), y + h * 0.35, 3, 0, Math.PI * 2);
          ctx.arc(sx + (dir > 0 ? w * 0.22 : w * 0.78), y + h * 0.35, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(sx + (dir > 0 ? w * 0.72 : w * 0.28), y + h * 0.42, 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "crab": {
          ctx.fillStyle = chill || '#ef4444';
          ctx.beginPath();
          ctx.ellipse(cx, y + h * 0.55, w * 0.45, h * 0.38, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = chill || '#b91c1c';
          ctx.lineWidth = 2;
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + side * w * 0.2, y + h * 0.5);
            ctx.lineTo(cx + side * w * 0.55, y + h * 0.2 + Math.sin(anim * 2) * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + side * w * 0.15, y + h * 0.65);
            ctx.lineTo(cx + side * w * 0.5, y + h * 0.85);
            ctx.stroke();
          }
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(cx - 4, y + h * 0.45, 2, 0, Math.PI * 2);
          ctx.arc(cx + 4, y + h * 0.45, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "seagull": {
          const wing = Math.sin(anim * 3) * 4;
          ctx.fillStyle = chill || '#f8fafc';
          ctx.beginPath();
          ctx.ellipse(cx, y + h * 0.55, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = chill || '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, y + h * 0.5);
          ctx.lineTo(cx - w * 0.4, y + h * 0.35 - wing);
          ctx.moveTo(cx, y + h * 0.5);
          ctx.lineTo(cx + w * 0.4, y + h * 0.35 + wing);
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(cx + dir * 8, y + h * 0.5);
          ctx.lineTo(cx + dir * 14, y + h * 0.52);
          ctx.lineTo(cx + dir * 8, y + h * 0.56);
          ctx.fill();
          break;
        }
        default:
          drawEnemyMushroom(cx, foot, 15, chill || '#a16207', true);
      }
      if (frozen) {
        ctx.fillStyle = 'rgba(125,211,252,0.25)';
        ctx.fillRect(sx, y, w, h);
      }
      ctx.restore();
    }

    class TurtleEnemy {
      constructor(x, y, range = 120, speed = 1.6) {
        this.x = x; this.y = y; this.w = 34; this.h = 38;
        this.vx = -speed; this.startX = x; this.range = range;
        this.speed = speed;
        this.alive = true; this.shell = false; this.shellTimer = 0;
        this.shellVx = 0; this.vy = 0;
        this.frozen = false; this.frozenTimer = 0;
        snapToGround(this);
      }
      update() {
        if (!this.alive) return;
        if (this.frozen) {
          this.frozenTimer--;
          if (this.frozenTimer <= 0) this.frozen = false;
          return;
        }
        if (this.shell) {
          this.shellTimer--;
          if (this.shellTimer <= 0) {
            this.shell = false;
            this.h = 38;
            snapToGround(this);
            this.vx = -this.speed;
          }
          return;
        }

        if (!hasGroundAhead(this, this.vx > 0 ? 1 : -1)) this.vx *= -1;

        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < this.startX - this.range || this.x > this.startX + this.range) this.vx *= -1;

        if (!snapToGround(this)) {
          if (this.y > VH + 50) this.alive = false;
        } else {
          this.vy = 0;
        }
      }
      stomp(stomper) {
        if (!this.shell) {
          this.shell = true;
          this.shellTimer = 240;
          this.h = 20;
          this.y += 18;
          snapToGround(this);
          this.vx = 0;
          addParticles(this.x + this.w / 2, this.y, '#22c55e');
        } else if (stomper) {
          this.shellVx = stomper.facing * 9;
          this.alive = false;
          addParticles(this.x + this.w / 2, this.y, '#22c55e', 12);
        }
      }
      draw() {
        if (!this.alive) return;
        const sx = this.x - cameraX;
        if (this.shell) {
          drawTurtleShell(sx + this.w / 2, this.y + 12, 17);
          return;
        }
        drawTurtleBody(sx, this.y, this.w, this.h, this.vx > 0 ? 1 : -1);
        if (this.frozen) {
          ctx.fillStyle = 'rgba(125,211,252,0.35)';
          ctx.fillRect(sx, this.y, this.w, this.h);
        }
      }
    }

    function freezeEnemy(e) {
      e.frozen = true;
      e.frozenTimer = 240;
      e.vx = 0;
      if (e.shellVx !== undefined) e.shellVx = 0;
    }

    class BossProjectile {
      constructor(x, y, vx, vy, w, h, color, opts = {}) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.w = w; this.h = h; this.color = color;
        this.alive = true;
        this.gravity = opts.gravity ?? 0;
        this.bounce = opts.bounce ?? 0;
        this.shape = opts.shape || 'circle';
      }
      update() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        if (this.bounce > 0 && this.y + this.h > 440) {
          this.y = 440 - this.h;
          this.vy = -this.vy * 0.55;
          this.bounce--;
          this.vx *= 0.85;
        }
        if (this.x < -60 || this.x > getWorldW() + 60 || this.y > VH + 40 || this.y < -60) {
          this.alive = false;
        }
      }
      draw() {
        if (!this.alive) return;
        const sx = this.x - cameraX;
        ctx.fillStyle = this.color;
        if (this.shape === 'bubble') {
          ctx.strokeStyle = 'rgba(186,230,253,0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(125,211,252,0.25)';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(sx + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const BOSS_SIZES = {
      mushroom: [100, 105], bowser: [110, 100], megaFish: [120, 72], mermaid: [88, 112],
      megaWolf: [108, 88], megaBear: [125, 102], megaRat: [78, 68], megaTurtle: [108, 82],
      superBowser: [130, 118], dokkaebi: [100, 108],
    };

    class Boss {
      constructor(x, y, opts = {}) {
        this.x = x; this.y = y;
        this.kind = opts.kind || 'mushroom';
        this.label = opts.label || '보스';
        const [bw, bh] = BOSS_SIZES[this.kind] || [100, 100];
        this.w = bw; this.h = bh;
        this.baseSpeed = (this.kind === 'megaBear' ? 1.6 : 2.1) * (opts.speedMul ?? 1);
        if (this.kind === 'superBowser') this.baseSpeed *= 1.1;
        this.vx = this.baseSpeed;
        this.vy = 0;
        this.hp = opts.hp ?? 5;
        this.maxHp = this.hp;
        this.alive = true;
        this.hurtTimer = 0;
        this.bob = 0;
        this.startX = x;
        this.range = this.kind === 'megaFish' ? 180 : 220;
        this.stompInvincible = 0;
        this.onGround = true;
        this.rage = 0;
        this.spawnTimer = 240;
        this.attackTimer = 120;
        this.attackWindup = 0;
        this.lungeTimer = 0;
        this.lungeDir = 1;
        this.frozen = false;
        this.frozenTimer = 0;
        this.facing = 1;
        snapToGround(this);
      }
      shootProj(px, py, vx, vy, w, h, color, opts) {
        if (!game) return;
        game.bossProjectiles.push(new BossProjectile(px, py, vx, vy, w, h, color, opts));
      }
      spawnMinion() {
        if (!game) return;
        const rng = game.rng || Math.random;
        const mx = this.x + (rng() > 0.5 ? this.w + 16 : -40);
        if (this.kind === 'mushroom') {
          const m = new MushroomEnemy(mx, 0, 60, 2.0 + this.rage * 0.06);
          snapToGround(m);
          game.bossMinions.push(m);
        } else if (this.kind === 'megaRat') {
          const m = spawnThemedEnemy('rat', mx, 50, 2.2 + this.rage * 0.05);
          if (m) game.bossMinions.push(m);
        } else if (this.kind === 'megaFish' || this.kind === 'mermaid') {
          const m = spawnThemedEnemy('crab', mx, 44, 1.9);
          if (m) game.bossMinions.push(m);
        }
      }
      doAttack() {
        const dir = this.facing || Math.sign(this.vx) || 1;
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h * 0.45;
        switch (this.kind) {
          case 'mushroom':
            this.shootProj(cx - 8, this.y + 20, 0, 2.2, 14, 14, '#a855f7');
            break;
          case 'bowser':
          case 'superBowser': {
            const spd = this.kind === 'superBowser' ? 5.5 : 4.5;
            this.shootProj(cx + dir * 40, cy, dir * spd, -0.5, 16, 16, '#ef4444');
            if (this.kind === 'superBowser') {
              this.shootProj(cx + dir * 40, cy + 12, dir * spd * 0.85, 0.8, 14, 14, '#f97316');
            }
            break;
          }
          case 'megaFish':
            this.shootProj(cx, cy, dir * 5, 0, 22, 12, '#38bdf8');
            break;
          case 'mermaid':
            this.shootProj(cx, cy - 10, dir * 2.5, -1.2, 18, 18, '#7dd3fc', { shape: 'bubble' });
            this.shootProj(cx, cy + 6, -dir * 2, -1, 14, 14, '#bae6fd', { shape: 'bubble' });
            break;
          case 'megaWolf':
            this.attackWindup = 35;
            this.lungeDir = dir;
            this.vx = 0;
            break;
          case 'megaBear':
            this.shootProj(cx - 30, this.y + this.h - 8, dir * 3.5, 0, 28, 10, '#78716c');
            addParticles(cx, this.y + this.h, '#a8a29e', 8);
            break;
          case 'megaRat':
            this.shootProj(cx, cy, dir * 4, -2, 12, 12, '#78716c', { gravity: 0.15 });
            break;
          case 'megaTurtle':
            this.shootProj(cx - dir * 20, cy, -dir * 4.5, 0, 20, 14, '#22c55e');
            break;
          case 'dokkaebi':
            this.shootProj(cx, cy - 20, dir * 3.8, -3, 18, 18, '#fbbf24', { gravity: 0.12, bounce: 1 });
            break;
          default: break;
        }
      }
      update() {
        if (!this.alive) return;
        if (this.frozen) {
          this.frozenTimer--;
          if (this.frozenTimer <= 0) this.frozen = false;
          return;
        }
        this.bob += 0.1;
        this.spawnTimer--;
        this.attackTimer--;
        this.facing = Math.sign(this.vx) || this.facing;

        if (this.attackWindup > 0) {
          this.attackWindup--;
          if (this.attackWindup === 0) {
            this.lungeTimer = 28;
            this.vx = this.lungeDir * (this.baseSpeed * 2.8);
          }
        } else if (this.lungeTimer > 0) {
          this.lungeTimer--;
          if (this.lungeTimer === 0) {
            this.vx = this.lungeDir * this.baseSpeed;
          }
        }

        if (this.stompInvincible > 0) this.stompInvincible--;
        if (this.hurtTimer > 0) this.hurtTimer--;

        if (this.kind === 'megaFish') {
          this.y += Math.sin(this.bob * 0.8) * 0.35;
        }

        this.x += this.vx;
        this.vy = 0;
        if (!snapToGround(this)) {
          this.y += GRAVITY * 4;
          snapToGround(this);
        }

        if (this.x < this.startX - this.range || this.x > this.startX + this.range) {
          this.vx *= -1;
          this.facing = Math.sign(this.vx);
          this.vx = Math.sign(this.vx) * (this.baseSpeed + this.rage * 0.12);
        }

        if (this.attackTimer <= 0 && this.attackWindup <= 0 && this.lungeTimer <= 0) {
          this.attackTimer = Math.max(100, 170 - this.rage * 6);
          this.doAttack();
        }

        if (this.spawnTimer <= 0) {
          this.spawnTimer = Math.max(160, 280 - this.rage * 7);
          if (['mushroom', 'megaRat', 'megaFish', 'mermaid'].includes(this.kind)) {
            this.spawnMinion();
          }
        }
      }
      get headZone() {
        return { x: this.x, y: this.y - 8, w: this.w, h: Math.max(40, this.h * 0.55) };
      }
      stomp() {
        if (this.stompInvincible > 0) return false;
        this.hp--;
        this.hurtTimer = 16;
        this.stompInvincible = 12;
        this.rage++;
        this.vx = Math.sign(this.vx || 1) * (this.baseSpeed + this.rage * 0.12);
        addParticles(this.x + this.w / 2, this.y + 16, '#ef4444', 12);
        if (this.hp <= 0) {
          this.alive = false;
          addParticles(this.x + this.w / 2, this.y + this.h / 2, '#fbbf24', 36);
          win();
        }
        return true;
      }
      drawBowser(sx, bobY, hurt, scale = 1) {
        const cx = sx + this.w / 2;
        const y = this.y + bobY;
        ctx.fillStyle = hurt ? '#86efac' : '#16a34a';
        ctx.beginPath();
        ctx.ellipse(cx, y + this.h * 0.62, this.w * 0.38, this.h * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hurt ? '#fdba74' : '#ea580c';
        ctx.beginPath();
        ctx.ellipse(cx, y + this.h * 0.48, this.w * 0.42, this.h * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef3c7';
        for (const ox of [-28 * scale, -10, 10, 28 * scale]) {
          ctx.beginPath();
          ctx.moveTo(cx + ox, y + this.h * 0.28);
          ctx.lineTo(cx + ox - 5, y + this.h * 0.48);
          ctx.lineTo(cx + ox + 5, y + this.h * 0.48);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = hurt ? '#fdba74' : '#f97316';
        ctx.beginPath();
        ctx.ellipse(cx + 8, y + this.h * 0.28, 28 * scale, 24 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 4, y + 16, 14, 3);
        ctx.fillRect(cx + 14, y + 14, 14, 3);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + 4, y + 28, 6, 0, Math.PI * 2);
        ctx.arc(cx + 22, y + 26, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      drawMegaFish(sx, bobY, hurt) {
        const cx = sx + this.w / 2;
        const y = this.y + bobY;
        ctx.fillStyle = hurt ? '#fca5a5' : '#0369a1';
        ctx.beginPath();
        ctx.ellipse(cx, y + this.h * 0.55, this.w * 0.42, this.h * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        const dir = this.facing;
        ctx.beginPath();
        ctx.moveTo(cx - dir * this.w * 0.42, y + this.h * 0.5);
        ctx.lineTo(cx - dir * this.w * 0.62, y + this.h * 0.35);
        ctx.lineTo(cx - dir * this.w * 0.62, y + this.h * 0.65);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx + dir * 12, y + this.h * 0.45, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      drawMermaid(sx, bobY, hurt) {
        const cx = sx + this.w / 2;
        const y = this.y + bobY;
        ctx.fillStyle = hurt ? '#fda4af' : '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(cx - 20, y + this.h * 0.35);
        ctx.quadraticCurveTo(cx, y + this.h * 0.15, cx + 20, y + this.h * 0.35);
        ctx.lineTo(cx + 14, y + this.h * 0.55);
        ctx.lineTo(cx - 14, y + this.h * 0.55);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(cx, y + this.h * 0.28, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hurt ? '#f472b6' : '#ec4899';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + (i - 2) * 6, y + this.h * 0.32);
          ctx.quadraticCurveTo(cx + (i - 2) * 10, y + this.h * 0.7, cx + (i - 2) * 4, y + this.h * 0.88);
          ctx.stroke();
        }
      }
      drawMegaWolf(sx, bobY, hurt) {
        const cx = sx + this.w / 2;
        const y = this.y + bobY;
        ctx.fillStyle = hurt ? '#cbd5e1' : '#475569';
        ctx.beginPath();
        ctx.ellipse(cx, y + this.h * 0.55, this.w * 0.4, this.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + this.facing * 18, y + this.h * 0.38, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx + this.facing * 24, y + this.h * 0.35, 3, 0, Math.PI * 2);
        ctx.fill();
        if (this.attackWindup > 0) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, y + this.h * 0.4, 24 + (35 - this.attackWindup), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      drawMegaBear(sx, bobY, hurt) {
        const cx = sx + this.w / 2;
        const y = this.y + bobY;
        ctx.fillStyle = hurt ? '#d6d3d1' : '#78350f';
        ctx.beginPath();
        ctx.ellipse(cx, y + this.h * 0.58, this.w * 0.42, this.h * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - 22, y + this.h * 0.22, 14, 0, Math.PI * 2);
        ctx.arc(cx + 22, y + this.h * 0.22, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.ellipse(cx, y + this.h * 0.32, 20, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawMegaRat(sx, bobY, hurt) {
        const cx = sx + this.w / 2;
        const y = this.y + bobY;
        ctx.fillStyle = hurt ? '#a8a29e' : '#57534e';
        ctx.beginPath();
        ctx.ellipse(cx, y + this.h * 0.6, this.w * 0.42, this.h * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(sx + (this.facing > 0 ? this.w * 0.82 : this.w * 0.18), y + this.h * 0.45, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + (this.facing > 0 ? this.w * 0.12 : this.w * 0.88), y + this.h * 0.35, 4, 0, Math.PI * 2);
        ctx.arc(sx + (this.facing > 0 ? this.w * 0.2 : this.w * 0.8), y + this.h * 0.35, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      drawMegaTurtle(sx, bobY, hurt) {
        drawTurtleShell(sx + this.w / 2, this.y + this.h * 0.45 + bobY, 34);
        ctx.fillStyle = hurt ? '#86efac' : '#15803d';
        ctx.beginPath();
        ctx.ellipse(sx + this.w / 2 - 18, this.y + this.h * 0.55 + bobY, 10, 8, 0, 0, Math.PI * 2);
        ctx.ellipse(sx + this.w / 2 + 18, this.y + this.h * 0.55 + bobY, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawDokkaebi(sx, bobY, hurt) {
        const cx = sx + this.w / 2;
        const y = this.y + bobY;
        ctx.fillStyle = hurt ? '#fca5a5' : '#dc2626';
        ctx.beginPath();
        ctx.ellipse(cx, y + this.h * 0.55, this.w * 0.35, this.h * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hurt ? '#fde68a' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx, y + this.h * 0.28, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + this.facing * 28, y + this.h * 0.4);
        ctx.lineTo(cx + this.facing * 55, y + this.h * 0.15);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx - 6, y + this.h * 0.26, 4, 0, Math.PI * 2);
        ctx.arc(cx + 6, y + this.h * 0.26, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      draw() {
        if (!this.alive) return;
        const sx = this.x - cameraX;
        const bobY = Math.sin(this.bob) * 1.5;
        const hurt = this.hurtTimer > 0 && Math.floor(this.hurtTimer / 3) % 2 === 0;
        const cx = sx + this.w / 2;
        const drawers = {
          bowser: () => this.drawBowser(sx, bobY, hurt),
          superBowser: () => this.drawBowser(sx, bobY, hurt, 1.15),
          mushroom: () => {
            drawEnemyMushroom(cx, this.y + this.h + bobY, 44, hurt ? '#f87171' : '#991b1b', true);
          },
          megaFish: () => this.drawMegaFish(sx, bobY, hurt),
          mermaid: () => this.drawMermaid(sx, bobY, hurt),
          megaWolf: () => this.drawMegaWolf(sx, bobY, hurt),
          megaBear: () => this.drawMegaBear(sx, bobY, hurt),
          megaRat: () => this.drawMegaRat(sx, bobY, hurt),
          megaTurtle: () => this.drawMegaTurtle(sx, bobY, hurt),
          dokkaebi: () => this.drawDokkaebi(sx, bobY, hurt),
        };
        (drawers[this.kind] || drawers.mushroom)();

        const barW = this.w - 10;
        ctx.fillStyle = '#334155';
        if (ctx.roundRect) ctx.roundRect(sx + 5, this.y - 18 + bobY, barW, 8, 3);
        else ctx.rect(sx + 5, this.y - 18 + bobY, barW, 8);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        if (ctx.roundRect) ctx.roundRect(sx + 5, this.y - 18 + bobY, barW * (this.hp / this.maxHp), 8, 3);
        else ctx.rect(sx + 5, this.y - 18 + bobY, barW * (this.hp / this.maxHp), 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.label, cx, this.y - 10 + bobY);
      }
    }

    function drawEnemyMushroom(cx, footY, r, capColor, angry) {
      const cy = footY - r * 0.9;
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(cx, footY - 4, r * 0.55, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = capColor;
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0);
      ctx.lineTo(cx + r, cy + r * 0.35);
      ctx.quadraticCurveTo(cx, cy + r * 0.55, cx - r, cy + r * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      [[-0.35, -0.45], [0.25, -0.5]].forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(cx + r * ox, cy + r * oy, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      });

      if (angry) {
        ctx.strokeStyle = '#3b1f0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.45, cy + r * 0.05);
        ctx.lineTo(cx - r * 0.15, cy + r * 0.15);
        ctx.moveTo(cx + r * 0.45, cy + r * 0.05);
        ctx.lineTo(cx + r * 0.15, cy + r * 0.15);
        ctx.stroke();
        ctx.fillStyle = '#3b1f0b';
        ctx.beginPath();
        ctx.arc(cx - r * 0.25, cy + r * 0.3, 3, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.25, cy + r * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawTurtleShell(cx, cy, r) {
      const grad = ctx.createRadialGradient(cx, cy - 2, 2, cx, cy, r);
      grad.addColorStop(0, '#4ade80');
      grad.addColorStop(1, '#15803d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.55);
      ctx.lineTo(cx, cy + r * 0.55);
      ctx.moveTo(cx - r * 0.55, cy);
      ctx.lineTo(cx + r * 0.55, cy);
      ctx.stroke();
    }

    function drawTurtleBody(sx, y, w, h, dir) {
      const cx = sx + w / 2;
      ctx.save();
      ctx.translate(cx, y + h);
      ctx.scale(dir, 1);
      ctx.translate(-cx, -(y + h));

      drawTurtleShell(cx, y + 14, 15);

      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.ellipse(cx - 10, y + 28, 5, 7, -0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + 10, y + 28, 5, 7, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffcba4';
      ctx.beginPath();
      ctx.arc(cx + 12 * dir, y + 22, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + 15 * dir, y + 20, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx + 16 * dir, y + 21, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawMushroomShape(cx, cy, r, capColor, spotColor, spots) {
      ctx.fillStyle = capColor;
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.2, r, Math.PI, 0);
      ctx.lineTo(cx + r, cy + r * 0.3);
      ctx.lineTo(cx - r, cy + r * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - r * 0.55, cy + r * 0.1, r * 1.1, r * 0.65);

      if (spots) {
        ctx.fillStyle = spotColor;
        [[-0.4, -0.5], [0.3, -0.55], [0, -0.75], [-0.55, -0.2], [0.5, -0.25]].forEach(([ox, oy]) => {
          ctx.beginPath();
          ctx.arc(cx + r * ox, cy + r * oy, r * 0.18, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    function addParticles(x, y, color, count = 8) {
      if (!game) return;
      const rng = game.rng || Math.random;
      for (let i = 0; i < count; i++) {
        game.particles.push({
          x, y,
          vx: (rng() - 0.5) * 6,
          vy: (rng() - 0.5) * 6 - 2,
          life: 30 + rng() * 20,
          color,
          r: 3 + rng() * 3
        });
      }
    }

    const popups = [];
    function popup(text) {
      popups.push({ text, life: 90 });
    }

    function drawPopups() {
      if (!popups.length) return;
      ctx.save();
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.life--;
        if (p.life <= 0) { popups.splice(i, 1); continue; }
        const alpha = Math.min(1, p.life / 30);
        const y = 70 + (90 - p.life) * 0.4;
        ctx.fillStyle = `rgba(15,23,42,${0.75 * alpha})`;
        ctx.fillRect(VW / 2 - 110, y - 22, 220, 36);
        ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(VW / 2 - 110, y - 22, 220, 36);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillText(p.text, VW / 2, y + 4);
      }
      ctx.restore();
    }

    class Fireball {
      constructor(x, y, vx, vy, ownerIdx) {
        this.x = x;
        this.y = y;
        this.w = 14;
        this.h = 14;
        this.vx = vx;
        this.vy = vy;
        this.ownerIdx = ownerIdx;
        this.alive = true;
      }
      update() {
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > getWorldW() || this.y > VH + 50) {
          this.alive = false;
          return;
        }

        for (const p of platforms) {
          if (this.x + this.w > p.x && this.x < p.x + p.w &&
              this.y + this.h > p.y && this.y < p.y + p.h) {
            const overlapL = (this.x + this.w) - p.x;
            const overlapR = (p.x + p.w) - this.x;
            const overlapT = (this.y + this.h) - p.y;
            const overlapB = (p.y + p.h) - this.y;
            const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);

            if (minOverlap === overlapT && this.vy >= 0) {
              this.y = p.y - this.h;
              this.vy = -5.8;
            } else if (minOverlap === overlapL || minOverlap === overlapR) {
              this.alive = false;
            }
          }
        }
      }
      draw() {
        const sx = this.x - cameraX;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, this.y + this.h / 2, this.w / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Iceball {
      constructor(x, y, vx, vy, ownerIdx, opts = {}) {
        this.x = x;
        this.y = y;
        this.w = opts.arrow ? 30 : 14;
        this.h = opts.arrow ? 12 : 14;
        this.vx = vx;
        this.vy = vy;
        this.ownerIdx = ownerIdx;
        this.alive = true;
        this.arrow = !!opts.arrow;
        this.dir = opts.dir || Math.sign(vx) || 1;
        this.phase = Math.random() * Math.PI * 2;
      }
      update() {
        this.phase += 0.18;
        if (this.arrow) {
          this.x += this.vx;
          // 직선 비행 — 중력·포물선 없음
        } else {
          this.vy += GRAVITY * 0.35;
          this.x += this.vx;
          this.y += this.vy;
        }
        if (this.x < -40 || this.x > getWorldW() + 40 || this.y < -40 || this.y > VH + 50) {
          this.alive = false;
          return;
        }
        for (const p of platforms) {
          if (this.x + this.w > p.x && this.x < p.x + p.w &&
              this.y + this.h > p.y && this.y < p.y + p.h) {
            this.alive = false;
            break;
          }
        }
      }
      draw() {
        if (this.arrow) {
          drawIceArrow(this.x - cameraX, this.y, this.w, this.h, this.dir, this.phase);
          return;
        }
        const sx = this.x - cameraX;
        ctx.fillStyle = 'rgba(56,189,248,0.85)';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2 - 2, this.y + this.h / 2 - 2, this.w / 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /** 얼음 결정 화살 — 앞으로 쭉 직선 비행 */
    function drawIceArrow(sx, sy, w, h, dir, phase) {
      const cx = sx + w / 2;
      const cy = sy + h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dir, 1);

      const len = w * 0.95;
      const halfH = h * 0.42;
      const shimmer = 0.65 + Math.sin(phase) * 0.35;

      // 꼬리 서리
      ctx.fillStyle = `rgba(186,230,253,${0.25 + shimmer * 0.2})`;
      for (let i = 0; i < 3; i++) {
        const tx = -len * (0.45 + i * 0.12);
        const ty = Math.sin(phase + i * 1.4) * halfH * 0.35;
        ctx.beginPath();
        ctx.arc(tx, ty, 1.5 + i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      const bodyGrad = ctx.createLinearGradient(-len * 0.4, 0, len * 0.75, 0);
      bodyGrad.addColorStop(0, 'rgba(224,242,254,0.55)');
      bodyGrad.addColorStop(0.35, 'rgba(125,211,252,0.92)');
      bodyGrad.addColorStop(0.7, 'rgba(56,189,248,0.95)');
      bodyGrad.addColorStop(1, 'rgba(14,165,233,0.88)');

      // 화살대 (얇은 얼음 기둥)
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-len * 0.42, -halfH * 0.32);
      ctx.lineTo(len * 0.08, -halfH * 0.28);
      ctx.lineTo(len * 0.08, halfH * 0.28);
      ctx.lineTo(-len * 0.42, halfH * 0.32);
      ctx.closePath();
      ctx.fill();

      // 화살촉 (결정형 3각)
      ctx.beginPath();
      ctx.moveTo(len * 0.08, 0);
      ctx.lineTo(len * 0.72, -halfH * 0.95);
      ctx.lineTo(len * 0.88, 0);
      ctx.lineTo(len * 0.72, halfH * 0.95);
      ctx.closePath();
      ctx.fill();

      // 측면 결정면
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(len * 0.12, -halfH * 0.05);
      ctx.lineTo(len * 0.55, -halfH * 0.55);
      ctx.lineTo(len * 0.55, halfH * 0.05);
      ctx.closePath();
      ctx.fill();

      // 하이라이트
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + shimmer * 0.35})`;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-len * 0.28, -halfH * 0.12);
      ctx.lineTo(len * 0.35, -halfH * 0.08);
      ctx.stroke();

      // 외곽선
      ctx.strokeStyle = 'rgba(14,116,144,0.55)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-len * 0.42, 0);
      ctx.lineTo(len * 0.88, 0);
      ctx.stroke();

      ctx.restore();
    }

    class WaterFish {
      constructor(d) {
        this.x = d.x; this.y = d.y; this.baseY = d.y;
        this.w = 28; this.h = 16;
        this.dir = d.dir; this.speed = d.speed;
        this.amp = d.amp; this.phase = d.phase;
        this.color = d.color; this.alive = true;
      }
      update() {
        this.phase += 0.04;
        this.x += this.dir * this.speed;
        this.y = this.baseY + Math.sin(this.phase) * this.amp;
        if (this.x < 40 || this.x > getWorldW() - 40) this.dir *= -1;
      }
      draw() {
        if (!this.alive) return;
        const sx = this.x - cameraX;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(sx + this.w / 2, this.y + this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        const tx = this.dir > 0 ? sx : sx + this.w;
        ctx.moveTo(tx, this.y + this.h / 2);
        ctx.lineTo(tx - this.dir * 10, this.y);
        ctx.lineTo(tx - this.dir * 10, this.y + this.h);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2 + this.dir * 6, this.y + this.h / 2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class WaterClam {
      constructor(d) {
        this.x = d.x; this.y = d.y; this.w = 34; this.h = 22;
        this.hasPearl = !!d.hasPearl;
        this.open = false;
        this.pearlTaken = false;
        this.bob = Math.random() * Math.PI * 2;
      }
      update() { this.bob += 0.03; }
      tryOpen(player, game) {
        if (this.open) return;
        this.open = true;
        addParticles(this.x + this.w / 2, this.y, '#fde68a', 10);
        if (this.hasPearl && !this.pearlTaken) {
          this.pearlTaken = true;
          player.soapBubbleTimer = SOAP_BUBBLE_DURATION;
          player.featherTimer = 0;
          player.vy = 0;
          player.vx = 0;
          popup('진주! 비눗방울 모드!');
          addParticles(player.cx, player.cy, '#f8fafc', 20);
        } else {
          game.coinsCount++;
          popup('조개 +1');
        }
      }
      draw() {
        const sx = this.x - cameraX;
        const cy = this.y + Math.sin(this.bob) * 1;
        ctx.fillStyle = '#a8a29e';
        ctx.beginPath();
        ctx.ellipse(sx + this.w / 2, cy + this.h * 0.65, this.w / 2, this.h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        if (this.open) {
          ctx.fillStyle = '#fda4af';
          ctx.beginPath();
          ctx.ellipse(sx + this.w / 2, cy + 4, this.w * 0.35, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          if (this.hasPearl && !this.pearlTaken) {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(sx + this.w / 2, cy + 2, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.ellipse(sx + this.w / 2, cy + this.h * 0.35, this.w / 2, this.h * 0.4, 0, Math.PI, 0);
          ctx.fill();
        }
      }
    }

    class AirBubble {
      constructor(d) {
        this.x = d.x; this.y = d.y;
        this.baseR = d.r;
        this.r = d.r;
        this.speed = d.speed;
        this.phase = d.phase;
        this.popped = false;
        this.occupied = false;
      }
      fitTo(player) {
        this.r = Math.max(this.baseR, Math.max(player.w, player.h) * 0.62 + 6);
      }
      update() {
        if (this.popped) return;
        this.phase += 0.05;
        this.y -= this.speed;
        this.x += Math.sin(this.phase) * 0.4;
        if (this.y < 40) {
          this.y = 430;
          this.x = 80 + Math.random() * (getWorldW() - 160);
          this.occupied = false;
        }
      }
      draw() {
        if (this.popped) return;
        const sx = this.x - cameraX;
        ctx.strokeStyle = 'rgba(186,230,253,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, this.y, this.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(125,211,252,0.12)';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(sx - this.r * 0.3, this.y - this.r * 0.35, this.r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawKelp(k) {
      const sx = k.x - cameraX;
      if (sx < -40 || sx > VW + 40) return;
      k.sway += 0.03;
      const sway = Math.sin(k.sway) * 8;
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, k.y);
      ctx.quadraticCurveTo(sx + sway, k.y - k.h * 0.5, sx + sway * 0.4, k.y - k.h);
      ctx.stroke();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 3, k.y);
      ctx.quadraticCurveTo(sx + sway + 4, k.y - k.h * 0.5, sx + sway * 0.4 + 2, k.y - k.h + 6);
      ctx.stroke();
    }

    /** 감옥에 갇힌 요정 — 불/얼음/점프로 부숨 */
    class FairyCage {
      constructor(x, y, hue = 200) {
        this.x = x;
        this.y = y;
        this.w = 36;
        this.h = 40;
        this.hue = hue;
        this.broken = false;
        this.bob = Math.random() * Math.PI * 2;
      }
      get cx() { return this.x + this.w / 2; }
      get cy() { return this.y + this.h / 2; }
      update() {
        if (this.broken) return;
        this.bob += 0.05;
      }
      breakOpen(ownerIdx, game) {
        if (this.broken) return;
        this.broken = true;
        addParticles(this.cx, this.cy, '#fbbf24', 16);
        addParticles(this.cx, this.cy, `hsl(${this.hue},80%,70%)`, 10);
        const pet = new FairyPet(this.cx, this.cy, ownerIdx, this.hue);
        game.pets.push(pet);
        popup('✨ 요정 구출!');
      }
      draw() {
        if (this.broken) return;
        const sx = this.x - cameraX;
        const by = this.y + Math.sin(this.bob) * 1.5;
        // 철창
        ctx.fillStyle = 'rgba(30,41,59,0.55)';
        ctx.fillRect(sx, by, this.w, this.h);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, by, this.w, this.h);
        for (let i = 1; i < 4; i++) {
          const gx = sx + (this.w / 4) * i;
          ctx.beginPath();
          ctx.moveTo(gx, by);
          ctx.lineTo(gx, by + this.h);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(sx, by + this.h / 2);
        ctx.lineTo(sx + this.w, by + this.h / 2);
        ctx.stroke();
        // 안에 요정 (작게)
        const fx = sx + this.w / 2;
        const fy = by + this.h / 2 + Math.sin(this.bob * 2) * 2;
        drawFairySprite(fx, fy, 12, this.hue, this.bob);
      }
    }

    function drawFairySprite(cx, cy, size, hue, anim) {
      const s = Math.max(8, size);
      const flap = Math.sin(anim * 4.2) * 0.42;
      const bob = Math.sin(anim * 2.1) * s * 0.04;
      ctx.save();
      ctx.translate(cx, cy + bob);

      // 소프트 글로우
      const glow = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 1.15);
      glow.addColorStop(0, `hsla(${hue},95%,88%,0.55)`);
      glow.addColorStop(0.45, `hsla(${hue},80%,75%,0.2)`);
      glow.addColorStop(1, `hsla(${hue},70%,70%,0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // 반짝이 파티클
      for (let i = 0; i < 4; i++) {
        const a = anim * 1.4 + i * 1.6;
        const px = Math.cos(a) * s * (0.7 + (i % 2) * 0.2);
        const py = Math.sin(a * 1.3) * s * 0.55 - s * 0.1;
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(anim * 3 + i));
        ctx.fillStyle = `hsla(${(hue + i * 25) % 360},90%,92%,${0.35 + tw * 0.5})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + tw * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 날개 (앞쪽 레이어보다 뒤에)
      function wing(side) {
        const ox = side * s * 0.22;
        const oy = -s * 0.05;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(side * (0.55 + flap * 0.55));
        // 큰 날개
        const wg = ctx.createRadialGradient(side * s * 0.15, 0, 0, side * s * 0.2, 0, s * 0.7);
        wg.addColorStop(0, `hsla(${hue},90%,96%,0.95)`);
        wg.addColorStop(0.4, `hsla(${(hue + 40) % 360},85%,85%,0.7)`);
        wg.addColorStop(1, `hsla(${hue},70%,78%,0.15)`);
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * s * 0.55, -s * 0.55, side * s * 0.85, -s * 0.05);
        ctx.quadraticCurveTo(side * s * 0.7, s * 0.35, side * s * 0.15, s * 0.25);
        ctx.quadraticCurveTo(side * s * 0.05, s * 0.1, 0, 0);
        ctx.fill();
        // 작은 아랫날개
        ctx.beginPath();
        ctx.moveTo(0, s * 0.05);
        ctx.quadraticCurveTo(side * s * 0.4, s * 0.15, side * s * 0.5, s * 0.4);
        ctx.quadraticCurveTo(side * s * 0.25, s * 0.35, 0, s * 0.15);
        ctx.fill();
        // 날개 맥
        ctx.strokeStyle = `hsla(${hue},60%,95%,0.55)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * s * 0.4, -s * 0.25, side * s * 0.7, -s * 0.08);
        ctx.stroke();
        ctx.restore();
      }
      wing(-1);
      wing(1);

      // 드레스 / 몸 (치비: 작은 몸)
      const dress = ctx.createLinearGradient(0, -s * 0.05, 0, s * 0.55);
      dress.addColorStop(0, `hsl(${hue},85%,78%)`);
      dress.addColorStop(1, `hsl(${(hue + 20) % 360},75%,62%)`);
      ctx.fillStyle = dress;
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, -s * 0.02);
      ctx.quadraticCurveTo(-s * 0.38, s * 0.35, -s * 0.28, s * 0.52);
      ctx.quadraticCurveTo(0, s * 0.58, s * 0.28, s * 0.52);
      ctx.quadraticCurveTo(s * 0.38, s * 0.35, s * 0.12, -s * 0.02);
      ctx.closePath();
      ctx.fill();
      // 허리 리본
      ctx.fillStyle = `hsl(${(hue + 180) % 360},70%,88%)`;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.08, s * 0.1, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      // 머리 (큰 치비 비율)
      const headR = s * 0.42;
      const hy = -s * 0.32;
      const skin = '#ffe8d6';
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(0, hy, headR, 0, Math.PI * 2);
      ctx.fill();

      // 머리 하이라이트
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(-headR * 0.25, hy - headR * 0.35, headR * 0.28, headR * 0.18, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // 머리 숱 / 앞머리
      ctx.fillStyle = `hsl(${hue},70%,72%)`;
      ctx.beginPath();
      ctx.ellipse(0, hy - headR * 0.55, headR * 0.55, headR * 0.32, 0, Math.PI, 0);
      ctx.fill();
      // 양옆 곱슬
      ctx.beginPath();
      ctx.ellipse(-headR * 0.75, hy + headR * 0.05, headR * 0.22, headR * 0.28, -0.3, 0, Math.PI * 2);
      ctx.ellipse(headR * 0.75, hy + headR * 0.05, headR * 0.22, headR * 0.28, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // 정수리 하트/리본
      ctx.fillStyle = `hsl(${(hue + 330) % 360},85%,78%)`;
      ctx.beginPath();
      const bx = 0;
      const by2 = hy - headR * 0.85;
      ctx.moveTo(bx, by2 + s * 0.06);
      ctx.quadraticCurveTo(bx - s * 0.12, by2 - s * 0.02, bx - s * 0.02, by2 - s * 0.08);
      ctx.quadraticCurveTo(bx, by2 - s * 0.02, bx, by2 + s * 0.06);
      ctx.quadraticCurveTo(bx, by2 - s * 0.02, bx + s * 0.02, by2 - s * 0.08);
      ctx.quadraticCurveTo(bx + s * 0.12, by2 - s * 0.02, bx, by2 + s * 0.06);
      ctx.fill();

      // 볼터치
      ctx.fillStyle = 'rgba(255,140,170,0.45)';
      ctx.beginPath();
      ctx.ellipse(-headR * 0.48, hy + headR * 0.18, headR * 0.16, headR * 0.1, 0, 0, Math.PI * 2);
      ctx.ellipse(headR * 0.48, hy + headR * 0.18, headR * 0.16, headR * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // 눈 (초롱초롱)
      const eyeY = hy + headR * 0.02;
      const eyeDx = headR * 0.28;
      const eyeR = Math.max(1.6, headR * 0.16);
      ctx.fillStyle = '#3b2f2f';
      ctx.beginPath();
      ctx.ellipse(-eyeDx, eyeY, eyeR * 0.85, eyeR * 1.15, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeDx, eyeY, eyeR * 0.85, eyeR * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      // 눈동자 하이라이트
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-eyeDx - eyeR * 0.15, eyeY - eyeR * 0.35, eyeR * 0.38, 0, Math.PI * 2);
      ctx.arc(eyeDx - eyeR * 0.15, eyeY - eyeR * 0.35, eyeR * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-eyeDx + eyeR * 0.25, eyeY + eyeR * 0.25, eyeR * 0.18, 0, Math.PI * 2);
      ctx.arc(eyeDx + eyeR * 0.25, eyeY + eyeR * 0.25, eyeR * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // 작은 미소
      ctx.strokeStyle = 'rgba(180,100,120,0.65)';
      ctx.lineWidth = Math.max(0.8, s * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, hy + headR * 0.32, headR * 0.18, 0.15, Math.PI - 0.15);
      ctx.stroke();

      ctx.restore();
    }

    /** 구출된 요정 펫 — 주인 주변을 따라다님 (캐릭터 절반보다 작음) */
    class FairyPet {
      constructor(x, y, ownerIdx, hue = 200) {
        this.x = x;
        this.y = y;
        this.ownerIdx = ownerIdx;
        this.hue = hue;
        this.anim = Math.random() * Math.PI * 2;
        this.slot = 0;
      }
      update(game) {
        const owner = game.players[this.ownerIdx];
        if (!owner || !owner.alive) return;
        this.anim += 0.12;
        const pets = game.pets.filter((p) => p.ownerIdx === this.ownerIdx);
        this.slot = pets.indexOf(this);
        const maxDim = Math.max(owner.w, owner.h);
        const size = Math.max(10, Math.min(maxDim * 0.48, maxDim / 2));
        this.size = size;
        const orbit = 22 + this.slot * 14;
        const ang = this.anim * 0.7 + this.slot * 1.7;
        const targetX = owner.cx + Math.cos(ang) * orbit * (owner.facing || 1) * 0.35
          - owner.facing * (18 + this.slot * 10);
        const targetY = owner.cy - 12 - Math.sin(this.anim) * 7 - this.slot * 4;
        this.x += (targetX - this.x) * 0.14;
        this.y += (targetY - this.y) * 0.14;
      }
      draw(game) {
        const owner = game.players[this.ownerIdx];
        if (!owner) return;
        const maxDim = Math.max(owner.w, owner.h);
        const size = this.size || Math.max(10, Math.min(maxDim * 0.48, maxDim / 2));
        drawFairySprite(this.x - cameraX, this.y, size, this.hue, this.anim);
      }
    }

    function spawnEnemy(EnemyClass, x, range, speed) {
      const temp = { x, w: 34, y: 0, h: EnemyClass === TurtleEnemy ? 38 : 30 };
      const plat = getPlatformUnder(x, temp.w);
      if (!plat) return null;
      const y = plat.y - temp.h;
      return new EnemyClass(x, y, range, speed);
    }

    function spawnThemedEnemy(type, x, range, speed) {
      if (type === "turtle") return spawnEnemy(TurtleEnemy, x, range, speed);
      if (type === "mushroom") return spawnEnemy(MushroomEnemy, x, range, speed);
      const w = type === "crab" ? 32 : type === "rock" ? 36 : 30;
      const h = type === "rock" || type === "robot" ? 34 : type === "crab" ? 22 : 30;
      const plat = getPlatformUnder(x, w);
      if (!plat) return null;
      return new ThemedEnemy(x, plat.y - h, range, speed, type);
    }

    class ThemeVehicle {
      constructor(x, y, themeId, def) {
        this.x = x;
        this.y = y;
        this.themeId = themeId;
        this.id = def.id;
        this.label = def.label;
        this.emoji = def.emoji;
        this.w = def.w;
        this.h = def.h;
        this.vx = 0;
        this.riderIdx = -1;
      }
      get occupied() { return this.riderIdx >= 0; }
      draw() {
        const sx = this.x - cameraX;
        const body = {
          car: '#ef4444',
          submarine: '#0ea5e9',
          dino: '#22c55e',
          boulder: '#78716c',
          minecart: '#64748b',
          boat: '#f59e0b',
          kart: '#b45309',
        }[this.id] || '#64748b';
        ctx.fillStyle = body;
        if (this.id === 'boulder') {
          ctx.beginPath();
          ctx.arc(sx + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(sx, this.y, this.w, this.h);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(sx + 4, this.y + 4, this.w - 8, Math.max(4, this.h * 0.25));
        }
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.emoji, sx + this.w / 2, this.y + this.h * 0.7);
      }
    }

    class MarioGame {
      constructor(opts) {
        this.solo = opts.solo;
        this.isHost = opts.isHost;
        this.myIndex = opts.myIndex;
        this.playerCount = opts.playerCount || 1;
        this.characterIds = resolveCharacterIds(opts.characterIds, this.playerCount);
        this.seed = opts.seed ?? (Date.now() >>> 0);
        this.rng = mulberry32(this.seed);
        this.running = false;
        this.gameOver = false;
        this.gameWon = false;
        this.players = [];
        this.coins = [];
        this.items = [];
        this.enemies = [];
        this.boss = null;
        this.bossMinions = [];
        this.bossProjectiles = [];
        this.particles = [];
        this.fireballs = [];
        this.iceballs = [];
        this.cages = [];
        this.pets = [];
        this.fish = [];
        this.clams = [];
        this.bubbles = [];
        this.kelp = [];
        this.underwaterCoins = [];
        this.waterReturnX = 0;
        this.coinsCount = 0;
        this.iceAmmo = 0;
        this.world = 'overworld';
        this.undergroundCoins = [];
        this.bonusCoins = [];
        this.vehicles = [];
        this.pipeCooldown = 0;
        this.simTick = 0;
        this.simAccumulator = 0;
        this.inputBuffer = {};
        this.lastSentInputTick = -1;
        this.lastKnownInputs = {};
        this.inputWaitStartedAt = 0;
        this.pendingGuestInput = null;
        this.lastFrameT = 0;
        this.disconnectedPlayers = new Set();
        this.rafId = 0;
        this.externalDriver = !!opts.externalDriver;
        this.levelIndex = 0;
        this.levelTransition = 0;
        this.predAccumulator = 0;
      }

      me() { return this.players[this.myIndex] || this.players[0]; }

      tickMs() {
        return this.solo ? TICK_MS : NET_TICK_MS;
      }

      substeps() {
        return this.solo ? 1 : NET_SUBSTEPS;
      }

      predStepMs() {
        return TICK_MS / this.substeps();
      }

      resetSimState() {
        this.simTick = 0;
        this.simAccumulator = 0;
        this.inputBuffer = {};
        this.lastSentInputTick = -1;
        this.lastKnownInputs = {};
        this.inputWaitStartedAt = 0;
        this.pendingGuestInput = null;
        this.disconnectedPlayers = new Set();
        popups.length = 0;
      }

      loadLevelWorld() {
        const level = getLevelDef(this.levelIndex);
        const layout = generateOverworld(this.rng, { ...level, levelIndex: this.levelIndex });
        this.mapTheme = layout.theme || null;
        overworldPlatforms = layout.platforms;
        pits = layout.pits;
        if (layout.pipes?.length >= 2) {
          pipeDefs.overworld[0] = { ...pipeDefs.overworld[0], ...layout.pipes[0] };
          pipeDefs.overworld[1] = { ...pipeDefs.overworld[1], ...layout.pipes[1] };
        }

        const ugJump = generateUnderground(this.rng, 'jump');
        const ugBonus = generateUnderground(this.rng, 'bonus');
        undergroundPlatforms = ugJump.platforms;
        bonusPlatforms = ugBonus.platforms;
        if (ugJump.entryPipe) {
          pipeDefs.underground[0] = { ...pipeDefs.underground[0], ...ugJump.entryPipe, id: 'ug1', to: 'ow1', toWorld: 'overworld' };
        }
        if (ugJump.exitPipe) {
          pipeDefs.underground[1] = { ...pipeDefs.underground[1], ...ugJump.exitPipe, id: 'ug1b', to: 'ow1', toWorld: 'overworld' };
        }
        if (ugBonus.entryPipe) {
          pipeDefs.bonus[0] = { ...pipeDefs.bonus[0], ...ugBonus.entryPipe, id: 'bg1', to: 'ow2', toWorld: 'overworld' };
        }
        if (ugBonus.exitPipe) {
          pipeDefs.bonus[1] = { ...pipeDefs.bonus[1], ...ugBonus.exitPipe, id: 'bg1b', to: 'ow2', toWorld: 'overworld' };
        }

        const uw = generateUnderwater(this.rng);
        underwaterPlatforms = uw.platforms;
        if (uw.exitPipe) {
          pipeDefs.underwater[0] = {
            ...pipeDefs.underwater[0],
            ...uw.exitPipe,
            id: 'uw1',
            to: 'owWater',
            toWorld: 'overworld',
          };
        }
        this.kelp = uw.kelp || [];
        this.fish = (uw.fish || []).map((d) => new WaterFish(d));
        this.clams = (uw.clams || []).map((d) => new WaterClam(d));
        this.bubbles = (uw.bubbles || []).map((d) => new AirBubble(d));
        this.underwaterCoins = (uw.coins || []).map(([x, y]) => new Coin(x, y, 'gold', this.rng));
        this.waterReturnX = layout.waterPitX != null ? layout.waterPitX - 40 : 800;
        // 귀환용 가상 파이프 (물웅덩이 옆)
        pipeDefs.overworld = pipeDefs.overworld.filter((p) => p.id !== 'owWater');
        pipeDefs.overworld.push({
          id: 'owWater',
          x: this.waterReturnX + 60,
          y: 388,
          w: 52,
          h: 64,
          to: 'uw1',
          toWorld: 'underwater',
          kind: 'water',
        });

        this.particles = [];
        this.fireballs = [];
        this.iceballs = [];
        this.bossMinions = [];
        this.bossProjectiles = [];
        this.vehicles = [];
        this.world = 'overworld';
        this.pipeCooldown = 0;
        rebuildPlatforms('overworld');

        const rng = this.rng;
        this.coins = layout.coins.map((c) =>
          c.length === 3 ? new Coin(c[0], c[1], c[2], rng) : new Coin(c[0], c[1], 'gold', rng)
        );

        this.undergroundCoins = (ugJump.coins || []).map(([x, y]) => new Coin(x, y, 'gold', rng));
        this.bonusCoins = (ugBonus.coins || []).map(([x, y]) => new Coin(x, y, 'gold', rng));

        const mushXs = layout.mushroomXs?.length
          ? layout.mushroomXs.slice(0, 2)
          : [layout.mushroomX || 400, (layout.mushroomX || 400) + 900];
        this.items = mushXs.map((mx) => {
          const plat = getPlatformUnder(mx, 28);
          return new PowerMushroom(mx, plat ? plat.y - 60 : 350);
        });
        this.items.push(new PowerFeather(layout.featherX, layout.featherY, rng));

        this.cages = (layout.cages || []).map(
          (c) => new FairyCage(c.x - 18, c.y, c.hue ?? Math.floor(rng() * 360))
        );
        // 펫은 스테이지 넘어가도 유지

        this.enemies = layout.enemies
          .map((e) => spawnThemedEnemy(e.type, e.x, e.range, e.speed))
          .filter(Boolean);

        const bossPlat = getPlatformUnder(layout.bossX, 200);
        const bossDef = pickThemeBoss(this.rng, this.mapTheme?.id || 'grass');
        this.boss = new Boss(
          layout.bossX,
          bossPlat ? bossPlat.y - 105 : 335,
          {
            hp: level.bossHp,
            speedMul: level.bossSpeedMul,
            kind: bossDef.kind,
            label: bossDef.label,
          }
        );
        snapToGround(this.boss);

        // 10% 확률 테마 탈것
        if (this.rng() < 0.1 && this.mapTheme?.id) {
          const vDef = getThemeVehicle(this.mapTheme.id);
          const flat = layout.platforms.find((p) => p.y === 440 && p.x > 700 && p.x < 2200 && p.w > vDef.w + 30)
            || layout.platforms.find((p) => p.y === 440 && p.w > vDef.w + 30);
          if (flat) {
            const vx = Math.min(flat.x + flat.w - vDef.w - 12, flat.x + Math.max(18, (flat.w - vDef.w) * 0.45));
            this.vehicles.push(new ThemeVehicle(vx, flat.y - vDef.h, this.mapTheme.id, vDef));
            popup(`${vDef.emoji} ${vDef.label} 등장!`);
          }
        }
        cameraX = 0;
      }

      initLevel() {
        if (this.solo) this.seed = Date.now() >>> 0;
        this.rng = mulberry32(this.seed);
        this.resetSimState();
        this.players = [];
        for (let i = 0; i < this.playerCount; i++) {
          this.players.push(new Player(this, i, this.characterIds[i]));
        }
        this.coinsCount = 0;
        this.iceAmmo = 0;
        this.pets = [];
        this.loadLevelWorld();
        this.grantStartingPets();
        this.gameOver = false;
        this.gameWon = false;
        this.levelTransition = 0;
        getHudEl('overlay').classList.remove('show');
        this.updateHUD();
        this.updatePlayerTags();
      }

      /** 캐릭터별 시작 요정 (셀레스트 등) */
      grantStartingPets() {
        const hues = [280, 200, 320, 160, 40, 120];
        for (const p of this.players) {
          const n = p.def?.startPets | 0;
          if (n <= 0) continue;
          for (let i = 0; i < n; i++) {
            const pet = new FairyPet(
              p.cx + (i - 1.5) * 12,
              p.cy - 16 - i * 4,
              p.index,
              hues[i % hues.length]
            );
            this.pets.push(pet);
          }
        }
      }

      advanceLevel() {
        const power = this.players.map(p => ({
          sizeLevel: p.sizeLevel,
          big: p.big,
          featherTimer: p.featherTimer,
          soapBubbleTimer: p.soapBubbleTimer,
          alive: p.alive,
        }));
        this.levelIndex++;
        this.seed = (this.seed + 7919 + this.levelIndex) >>> 0;
        this.rng = mulberry32(this.seed);
        this.resetSimState();
        this.players.forEach((p, i) => p.respawnAtStart(power[i]));
        this.loadLevelWorld();
        this.gameOver = false;
        this.gameWon = false;
        this.levelTransition = 0;
        popup(`▶ ${getLevelDef(this.levelIndex).name}`);
        getHudEl('overlay').classList.remove('show');
        this.updateHUD();
        this.updatePlayerTags();
        if (!this.solo && this.isHost) {
          netBroadcastCtrl({
            type: 'LEVEL',
            proto: 2,
            levelIndex: this.levelIndex,
            seed: this.seed,
          });
        }
      }

      applyLevelAdvance(levelIndex, seed) {
        const power = this.players.map(p => ({
          sizeLevel: p.sizeLevel,
          big: p.big,
          featherTimer: p.featherTimer,
          soapBubbleTimer: p.soapBubbleTimer,
          alive: p.alive,
        }));
        this.levelIndex = levelIndex;
        this.seed = seed >>> 0;
        this.rng = mulberry32(this.seed);
        this.resetSimState();
        this.players.forEach((p, i) => p.respawnAtStart(power[i]));
        this.loadLevelWorld();
        this.gameOver = false;
        this.gameWon = false;
        this.levelTransition = 0;
        popup(`▶ ${getLevelDef(this.levelIndex).name}`);
        getHudEl('overlay').classList.remove('show');
        this.updateHUD();
        this.updatePlayerTags();
      }

      activeCoins() {
        if (this.world === 'underground') return this.undergroundCoins;
        if (this.world === 'bonus') return this.bonusCoins;
        if (this.world === 'underwater') return this.underwaterCoins;
        return this.coins;
      }

      totalCoinsCollected() {
        return this.coins.filter(c => c.collected).length +
          this.undergroundCoins.filter(c => c.collected).length +
          this.bonusCoins.filter(c => c.collected).length +
          this.underwaterCoins.filter(c => c.collected).length;
      }

      enterUnderwater(player, wp) {
        if (this.world === 'underwater') return;
        this.waterReturnX = wp.x;
        const retPipe = pipeDefs.overworld.find((p) => p.id === 'owWater');
        if (retPipe) {
          retPipe.x = wp.x + wp.w + 24;
          retPipe.y = 388;
        }
        this.world = 'underwater';
        rebuildPlatforms('underwater');
        let slot = 0;
        for (const p of this.players) {
          if (!p.alive) continue;
          p.inBubble = null;
          p.x = 70 + slot * 40;
          p.y = 180;
          p.vx = 0;
          p.vy = 0;
          snapToGround(p);
          if (!p.onGround) {
            p.y = 300;
            snapToGround(p);
          }
          slot++;
        }
        this.pipeCooldown = PIPE_COOLDOWN;
        cameraX = 0;
        addParticles(player.cx, player.cy, '#38bdf8', 18);
        popup('🌊 물속 세상!');
      }

      /** 비눗방울로 수면(화면 위) 돌파 → 지상 복귀 (↓ 하수구 대체 출구) */
      exitUnderwaterSurface(player) {
        if (this.world !== 'underwater') return;
        const pipe =
          (pipeDefs.underwater || []).find((p) => p.toWorld === 'overworld') ||
          pipeDefs.underwater?.[0];
        if (!pipe) return;
        this.usePipe(pipe, player);
        addParticles(player.cx, Math.max(20, player.cy), '#bae6fd', 16);
        popup('🫧 수면으로 탈출!');
      }

      checkPipeWarp(player) {
        if (this.pipeCooldown > 0) return;
        const soap = player.soapBubbleTimer > 0;
        // 비눗방울: ↓가 이동키라 하수구 근처만 가도 워프 / 일반: 착지 후 ↓
        if (!soap && (!player.onGround || !player.input.downPressed)) return;
        const list = pipeDefs[this.world] || [];
        for (const pipe of list) {
          const top = pipeTopY(pipe);
          const midX = pipe.x + pipe.w / 2;
          if (soap) {
            const nearX = Math.abs(player.cx - midX) <= pipe.w * 0.95 + 18;
            const nearY =
              player.bottom >= top - 56 &&
              player.y <= pipe.y + pipe.h + 12;
            if (nearX && nearY) {
              this.usePipe(pipe, player);
              return;
            }
            continue;
          }
          // 반드시 파이프 위에 착지한 상태에서 ↓
          if (player.cx > pipe.x + 6 && player.cx < pipe.x + pipe.w - 6 &&
              Math.abs(player.bottom - top) <= 8) {
            this.usePipe(pipe, player);
            player.input.downPressed = false;
            return;
          }
        }
      }

      usePipe(pipe, player) {
        const destList = pipeDefs[pipe.toWorld] || [];
        const dest = destList.find(p => p.id === pipe.to);
        if (!dest) return;
        this.world = pipe.toWorld;
        rebuildPlatforms(this.world);
        let slot = 0;
        for (const p of this.players) {
          if (!p.alive) continue;
          placePipeExit(dest, p, slot * 36);
          p.input.downPressed = false;
          slot++;
        }
        this.pipeCooldown = PIPE_COOLDOWN;
        addParticles(player.cx, player.cy, '#22c55e', 14);
        const msg =
          this.world === 'underground' ? '🕳️ 점프 하수구' :
          this.world === 'bonus' ? '💰 보너스 하수구' :
          this.world === 'underwater' ? '🌊 물속 세상' : '☀️ 지상';
        popup(msg);
      }

      consumeFairyShield(player, source) {
        const idx = this.pets.findIndex((pet) => pet.ownerIdx === player.index);
        if (idx < 0) return false;
        const [pet] = this.pets.splice(idx, 1);
        addParticles(pet.x, pet.y, `hsl(${pet.hue},90%,75%)`, 18);
        addParticles(player.cx, player.cy, '#e0f2fe', 10);
        player.invincible = Math.max(player.invincible, 60);
        if (source) {
          const sourceCx = source.x + (source.w || 0) / 2;
          player.vx = player.cx < sourceCx ? -5.5 : 5.5;
          player.vy = Math.min(player.vy, JUMP_FORCE * 0.25);
        }
        popup('🧚 요정 방패!');
        return true;
      }

      checkCollisions() {
        for (const player of this.players) {
          if (!player.alive) continue;
          this.checkPipeWarp(player);
          if (this.world === 'overworld') {
            for (const v of this.vehicles) {
              if (v.occupied) continue;
              if (!rectOverlap(player, v)) continue;
              const fromTop = player.vy >= 0 && player.bottom - player.vy <= v.y + 10;
              if (!fromTop) continue;
              v.riderIdx = player.index;
              player.ridingVehicle = v;
              player.vx = 0;
              player.vy = 0;
              player.y = v.y - player.h + 2;
              player.jumpsLeft = player.maxJumps;
              popup(`${v.emoji} 탑승!`);
            }
          }
          for (const coin of this.activeCoins()) {
            if (coin.collected) continue;
            if (Math.hypot(player.cx - coin.x, player.cy - coin.y) < coin.r + 16) {
              coin.collected = true;
              if (coin.kind === 'blue') {
                this.iceAmmo++;
                this.shootIce(player.index);
                addParticles(coin.x, coin.y, '#38bdf8', 10);
              } else {
                this.coinsCount++;
                addParticles(coin.x, coin.y, '#fbbf24', 6);
              }
            }
          }
          if (this.world === 'overworld') {
          for (const item of this.items) {
            if (item.collected) continue;
            if (player.x + player.w > item.x && player.x < item.x + item.w &&
                player.y + player.h > item.y && player.y < item.y + item.h) {
              item.collected = true;
              if (item instanceof PowerFeather) {
                player.featherTimer = FEATHER_DURATION;
                addParticles(item.x + item.w / 2, item.y, '#fde68a', 14);
                popup('🪶 비행 60초!');
              } else {
                player.grow();
                addParticles(item.x + item.w / 2, item.y, '#ef4444', 10);
              }
            }
          }
          for (const e of [...this.enemies, ...this.bossMinions]) {
            if (!e.alive && !e.squished) continue;
            if (e.squished) continue;
            if (!rectOverlap(player, e)) continue;
            if (player.ridingVehicle) {
              e.stomp(player);
              addParticles(e.x + e.w / 2, e.y + e.h / 2, '#f59e0b', 8);
              continue;
            }
            if (player.vy > 0 && player.bottom - player.vy <= e.y + 12) {
              e.stomp(player);
              player.vy = JUMP_FORCE * 0.45;
            } else if (player.invincible <= 0) {
              if (!this.consumeFairyShield(player, e) && player.shrink()) this.playerDie(player);
            }
          }
          // 요정 감옥 — 점프(내려찍기)로 부수기
          for (const cage of this.cages) {
            if (cage.broken) continue;
            if (!rectOverlap(player, cage)) continue;
            if (player.vy > 0 && player.bottom - player.vy <= cage.y + 14) {
              cage.breakOpen(player.index, this);
              player.vy = JUMP_FORCE * 0.4;
              player.jumpsLeft = Math.max(player.jumpsLeft, 1);
            }
          }
          if (this.world === 'overworld' && this.boss && this.boss.alive && rectOverlap(player, this.boss)) {
            const b = this.boss;
            // 머리 위(상위 ~55%)에서 내려오고 있으면 밟기 — 연속 콩콩 콤보
            const topBand = Math.max(28, b.h * 0.55);
            const feetNearTop = player.bottom <= b.y + topBand;
            const comingDown = player.vy >= 0;
            const aboveCenter = player.cy < b.y + b.h * 0.5;
            const onHead = comingDown && feetNearTop && aboveCenter &&
              player.cx > b.x - 10 &&
              player.cx < b.x + b.w + 10;
            if (onHead) {
              const hit = b.stomp();
              // 머리 위에 붙잡고 짧게 튕겨 다시 착지 → 콩콩콩
              player.y = b.y - player.h + 1;
              player.vy = hit ? JUMP_FORCE * 0.34 : JUMP_FORCE * 0.28;
              // 보스가 걸어도 머리에 남도록 살짝 따라가기
              const bossCx = b.x + b.w / 2;
              const pull = Math.max(-3.5, Math.min(3.5, bossCx - player.cx));
              player.x += pull * 0.35;
              player.onGround = false;
              player.jumpsLeft = Math.max(player.jumpsLeft, 1);
              // 연속 밟는 동안 옆구리 피해 방지
              player.invincible = Math.max(player.invincible, 18);
            } else if (player.invincible <= 0) {
              if (!this.consumeFairyShield(player, b) && player.shrink()) this.playerDie(player);
              player.vx = (player.cx < b.x + b.w / 2 ? -6 : 6);
              player.invincible = Math.max(player.invincible, 40);
            }
          }
          }
          if (this.world === 'underwater') {
            for (const fish of this.fish) {
              if (!fish.alive) continue;
              if (!rectOverlap(player, fish)) continue;
              if (player.invincible <= 0) {
                if (!this.consumeFairyShield(player, fish) && player.shrink()) this.playerDie(player);
                player.vx = player.cx < fish.x + fish.w / 2 ? -4 : 4;
                player.invincible = Math.max(player.invincible, 40);
              }
            }
            for (const clam of this.clams) {
              if (!rectOverlap(player, clam)) continue;
              if (!clam.open && (player.vy > 0.5 || player.onGround)) {
                clam.tryOpen(player, this);
              }
            }
            if (!player.inBubble) {
              for (const b of this.bubbles) {
                if (b.popped || b.occupied) continue;
                const dist = Math.hypot(player.cx - b.x, player.cy - b.y);
                if (dist < b.r + Math.max(player.w, player.h) * 0.25) {
                  b.occupied = true;
                  b.fitTo(player);
                  b.x = player.cx;
                  b.y = player.cy;
                  player.inBubble = b;
                  player.vx = 0;
                  player.vy = 0;
                  popup('🫧 공기방울!');
                  break;
                }
              }
            }
          }
          if (this.world === 'overworld') {
            for (const proj of this.bossProjectiles) {
              if (!proj.alive) continue;
              if (!rectOverlap(player, proj)) continue;
              proj.alive = false;
              addParticles(proj.x + proj.w / 2, proj.y + proj.h / 2, proj.color, 6);
              if (player.invincible <= 0) {
                if (!this.consumeFairyShield(player, proj) && player.shrink()) this.playerDie(player);
                player.invincible = Math.max(player.invincible, 45);
                player.vx = player.cx < proj.x ? -4 : 4;
              }
            }
          }
        }
      }

      playerDie(player) {
        if (player.ridingVehicle) {
          player.ridingVehicle.riderIdx = -1;
          player.ridingVehicle = null;
        }
        player.alive = false;
        player.vx = 0; player.vy = 0;
        addParticles(player.cx, player.cy, '#ef4444', 16);
        this.updatePlayerTags();
        if (!this.players.some(p => p.alive)) {
          this.endGame(false, `코인 ${this.totalCoinsCollected()}개 수집`);
        }
      }

      win() {
        if (this.gameWon || this.levelTransition > 0) return;
        const level = getLevelDef(this.levelIndex);
        if (this.levelIndex < LEVEL_COUNT - 1) {
          popup(`🎉 ${level.name} 클리어!`);
          this.levelTransition = 120;
          return;
        }
        this.gameWon = true;
        this.gameOver = true;
        this.endGame(true, `전체 클리어! (${LEVEL_COUNT}스테이지) · 코인 ${this.totalCoinsCollected()}개`);
      }

      endGame(won, msg) {
        this.gameOver = true;
        getHudEl('overlayTitle').textContent = won ? '🎉 클리어!' : '💀 게임 오버';
        getHudEl('overlayMsg').textContent = msg;
        if (typeof window.refreshEndgameAd === 'function') window.refreshEndgameAd();
        getHudEl('overlay').classList.add('show');
        if (!this.solo && this.isHost) {
          netBroadcastCtrl({ type: 'END', proto: 2, won, msg });
        }
      }

      shootFireball(playerIdx) {
        const p = this.players[playerIdx];
        if (!p || !p.alive) return;
        const freeFire = !!(p.def && p.def.freeFire);
        if (!freeFire && this.coinsCount <= 0) return;
        if (!freeFire) this.coinsCount--;
        this.updateHUD();
        const f = new Fireball(p.x + p.w / 2, p.y + p.h / 2 - 4, p.facing * 6.5, -2, playerIdx);
        this.fireballs.push(f);
        addParticles(p.cx, p.cy, '#ef4444', 5);
      }

      shootIce(playerIdx) {
        const p = this.players[playerIdx];
        if (!p || !p.alive) return;
        const freeIce = !!(p.def && p.def.freeIce);
        if (!freeIce && this.iceAmmo <= 0) return;
        if (!freeIce) this.iceAmmo--;
        this.updateHUD();
        const dir = p.facing || 1;
        const speed = freeIce ? 11.5 : 9.5;
        const ice = new Iceball(
          p.x + (dir > 0 ? p.w * 0.55 : -6),
          p.y + p.h * 0.38,
          dir * speed,
          0,
          playerIdx,
          { arrow: true, dir }
        );
        this.iceballs.push(ice);
        addParticles(p.cx + dir * 10, p.cy, '#38bdf8', 6);
      }

      updateHUD() {
        const me = this.me();
        const collected = this.totalCoinsCollected();
        getHudEl('coins').textContent = collected;
        const freeFire = !!(me && me.def && me.def.freeFire);
        const freeIce = !!(me && me.def && me.def.freeIce);
        getHudEl('fireballsAmmo').textContent = freeFire ? '∞' : this.coinsCount;
        getHudEl('iceAmmo').textContent = freeIce ? '∞' : this.iceAmmo;
        let status = '전멸';
        if (me && me.alive) {
          status = me.sizeLevel >= 2 ? '거대' : me.sizeLevel >= 1 ? '큼' : '작음';
        }
        if (me && me.featherTimer > 0) status += ' · 날개';
        if (me && me.soapBubbleTimer > 0) status += ' · 비눗방울';
        if (freeFire) status += ' · 무한불';
        if (freeIce) status += ' · 무한얼음';
        getHudEl('status').textContent = status;
        getHudEl('featherTime').textContent =
          me && me.soapBubbleTimer > 0 ? '🫧' + Math.ceil(me.soapBubbleTimer / 60) + 's' :
          me && me.featherTimer > 0 ? Math.ceil(me.featherTimer / 60) + 's' : '-';
        getHudEl('bossHp').textContent =
          this.world === 'underground' ? '점프하수구' :
          this.world === 'bonus' ? '보너하수구' :
          this.world === 'underwater' ? '물속세상' :
          (this.boss && this.boss.alive ? `${this.boss.label} ${this.boss.hp}` : '처치!');
        const stageEl = getHudEl('stage');
        if (stageEl) {
          const themeLabel = this.world === 'overworld' && this.mapTheme?.label
            ? ` · ${this.mapTheme.label}` : '';
          stageEl.textContent = `${getLevelDef(this.levelIndex).name} (${this.levelIndex + 1}/${LEVEL_COUNT})${themeLabel}`;
        }
        const netEl = getHudEl('netStatus');
        if (netEl && !this.solo) {
          netEl.textContent = WwNetRef.getNetStatusLabel?.() || '-';
        }
      }

      updatePlayerTags() {
        if (this.solo) { getHudEl('playerTags').innerHTML = ''; return; }
        getHudEl('playerTags').innerHTML = this.players.map((p, i) => {
          const cls = 'ptag' + (i === this.myIndex ? ' me' : '') + (p.alive ? '' : ' dead');
          return `<span class="${cls}">${p.def.emoji} ${p.def.name}${i === this.myIndex ? ' (나)' : ''}</span>`;
        }).join('');
      }

      hostTick() {
        if (this.gameOver) return;
        if (this.pipeCooldown > 0) this.pipeCooldown--;
        this.players.forEach(p => { if (p.alive) p.update(); });
        if (this.world === 'overworld') {
          for (const v of this.vehicles) {
            if (!v.occupied) continue;
            const rider = this.players[v.riderIdx];
            if (!rider || !rider.alive || rider.ridingVehicle !== v) {
              v.riderIdx = -1;
              continue;
            }
            const accel = rider.input.left ? -0.48 : rider.input.right ? 0.48 : 0;
            v.vx += accel;
            v.vx *= 0.86;
            v.vx = Math.max(-6, Math.min(6, v.vx));
            v.x += v.vx;
            v.x = Math.max(0, Math.min(getWorldW() - v.w, v.x));
            rider.x = v.x + (v.w - rider.w) / 2;
            rider.y = v.y - rider.h + 2;
            rider.vx = v.vx;
            rider.vy = 0;
            rider.onGround = true;
            rider.jumpsLeft = rider.maxJumps;
          }
        }
        this.activeCoins().forEach(c => c.update());
        if (this.world === 'overworld') {
          this.items.forEach(i => i.update());
          this.cages.forEach(c => c.update());
          this.enemies.forEach(e => e.update());
          this.bossMinions.forEach(e => e.update());
          this.bossMinions = this.bossMinions.filter(e => e.alive || e.squished);
          if (this.boss) this.boss.update();
          this.bossProjectiles.forEach((p) => p.update());
          this.bossProjectiles = this.bossProjectiles.filter((p) => p.alive);
        }
        if (this.world === 'underwater') {
          this.fish.forEach((f) => f.update());
          this.clams.forEach((c) => c.update());
          this.bubbles.forEach((b) => b.update());
        }
        this.pets.forEach(p => p.update(this));

        this.fireballs.forEach(f => f.update());
        this.iceballs.forEach(f => f.update());
        this.fireballs.forEach(f => {
          if (!f.alive) return;
          if (this.world === 'overworld') {
            for (const cage of this.cages) {
              if (cage.broken) continue;
              if (f.x + f.w > cage.x && f.x < cage.x + cage.w &&
                  f.y + f.h > cage.y && f.y < cage.y + cage.h) {
                cage.breakOpen(f.ownerIdx, this);
                f.alive = false;
                break;
              }
            }
          }
          if (!f.alive) return;
          for (const e of [...this.enemies, ...this.bossMinions]) {
            if (!e.alive || e.squished) continue;
            if (f.x + f.w > e.x && f.x < e.x + e.w &&
                f.y + f.h > e.y && f.y < e.y + e.h) {
              e.stomp();
              f.alive = false;
              addParticles(e.x + e.w / 2, e.y + e.h / 2, '#ef4444', 8);
              break;
            }
          }
          if (f.alive && this.boss && this.boss.alive && this.world === 'overworld') {
            const b = this.boss;
            if (f.x + f.w > b.x && f.x < b.x + b.w &&
                f.y + f.h > b.y && f.y < b.y + b.h) {
              b.stomp();
              f.alive = false;
              addParticles(b.x + b.w / 2, b.y + b.h / 2, '#ef4444', 12);
            }
          }
        });
        this.fireballs = this.fireballs.filter(f => f.alive);

        this.iceballs.forEach(f => {
          if (!f.alive) return;
          if (this.world === 'overworld') {
            for (const cage of this.cages) {
              if (cage.broken) continue;
              if (f.x + f.w > cage.x && f.x < cage.x + cage.w &&
                  f.y + f.h > cage.y && f.y < cage.y + cage.h) {
                cage.breakOpen(f.ownerIdx, this);
                f.alive = false;
                break;
              }
            }
          }
          if (!f.alive) return;
          for (const e of [...this.enemies, ...this.bossMinions]) {
            if (!e.alive || e.squished) continue;
            if (f.x + f.w > e.x && f.x < e.x + e.w &&
                f.y + f.h > e.y && f.y < e.y + e.h) {
              freezeEnemy(e);
              f.alive = false;
              addParticles(e.x + e.w / 2, e.y + e.h / 2, '#38bdf8', 10);
              break;
            }
          }
          if (f.alive && this.boss && this.boss.alive && this.world === 'overworld') {
            const b = this.boss;
            if (f.x + f.w > b.x && f.x < b.x + b.w &&
                f.y + f.h > b.y && f.y < b.y + b.h) {
              b.frozen = true;
              b.frozenTimer = 120;
              b.vx = 0;
              f.alive = false;
              addParticles(b.x + b.w / 2, b.y + b.h / 2, '#38bdf8', 12);
            }
          }
        });
        this.iceballs = this.iceballs.filter(f => f.alive);

        this.checkCollisions();
        this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--; });
        this.particles = this.particles.filter(p => p.life > 0);
      }

      sampleLocalInput() {
        const me = this.me();
        if (!me) return { l: 0, r: 0, j: 0, jh: 0, d: 0, dh: 0 };
        const inp = {
          l: me.input.left ? 1 : 0,
          r: me.input.right ? 1 : 0,
          j: me.input.jumpPressed ? 1 : 0,
          jh: me.input.jumpHeld ? 1 : 0,
          d: me.input.downPressed ? 1 : 0,
          dh: me.input.downHeld ? 1 : 0,
        };
        me.input.jumpPressed = false;
        me.input.downPressed = false;
        return inp;
      }

      applyInputsForTick(inputs) {
        for (let i = 0; i < this.playerCount; i++) {
          const inp = inputs[i];
          if (!inp) continue;
          const p = this.players[i];
          if (!p) continue;
          p.input.left = !!inp.l;
          p.input.right = !!inp.r;
          p.input.jumpHeld = !!inp.jh;
          p.input.downHeld = !!inp.dh;
          if (inp.j) p.input.jumpPressed = true;
          if (inp.d) p.input.downPressed = true;
        }
      }

      storeInput(tick, playerIndex, inp) {
        if (tick < this.simTick) return;
        if (!this.inputBuffer[tick]) this.inputBuffer[tick] = {};
        this.inputBuffer[tick][playerIndex] = inp;
        this.lastKnownInputs[playerIndex] = inp;
      }

      idleInput() {
        return { l: 0, r: 0, j: 0, jh: 0, d: 0, dh: 0 };
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
          if (this.disconnectedPlayers.has(i)) {
            inputs[i] = this.idleInput();
            continue;
          }
          inputs[i] =
            this.inputBuffer[tick]?.[i] ??
            this.lastKnownInputs[i] ??
            this.idleInput();
        }
        return inputs;
      }

      /** 호스트 입력: held는 최신값, jump/down 엣지는 tick 확정 전까지 OR 유지 */
      captureHostInputForTick(tick) {
        const me = this.me();
        if (!me) {
          this.storeInput(tick, this.myIndex, this.idleInput());
          return;
        }
        const existing = this.inputBuffer[tick]?.[this.myIndex];
        if (!existing) {
          this.storeInput(tick, this.myIndex, this.sampleLocalInput());
          return;
        }
        existing.l = me.input.left ? 1 : 0;
        existing.r = me.input.right ? 1 : 0;
        existing.jh = me.input.jumpHeld ? 1 : 0;
        existing.dh = me.input.downHeld ? 1 : 0;
        if (me.input.jumpPressed) existing.j = 1;
        if (me.input.downPressed) existing.d = 1;
        me.input.jumpPressed = false;
        me.input.downPressed = false;
        this.lastKnownInputs[this.myIndex] = existing;
      }

      /** 늦게 온 INP를 무한정 기다리지 않음 — 유실/고RTT에서도 진행 */
      trySealCurrentTick(now = performance.now()) {
        const tick = this.simTick;
        this.captureHostInputForTick(tick);
        if (this.hasAllInputs(tick)) {
          this.inputWaitStartedAt = 0;
          this.sealFrame(tick);
          return true;
        }
        if (!this.inputWaitStartedAt) this.inputWaitStartedAt = now;
        if (now - this.inputWaitStartedAt >= NET_INPUT_WAIT_MS) {
          this.inputWaitStartedAt = 0;
          this.sealFrame(tick);
          return true;
        }
        return false;
      }

      simulateTick(inputs) {
        this.applyInputsForTick(inputs);
        this.hostTick();
      }

      applyFrame(tick, inputs) {
        if (tick !== this.simTick || this.gameOver) return;
        for (let s = 0; s < this.substeps(); s++) {
          this.simulateTick(inputs);
        }
        this.simTick++;
        this.predAccumulator = 0;
        this.inputWaitStartedAt = 0;
        delete this.inputBuffer[tick];
      }

      sealFrame(tick) {
        if (tick !== this.simTick || this.gameOver) return;
        const inputs = this.getInputsArray(tick);
        if (!this.solo && this.isHost) {
          netBroadcastGame({ type: 'FRAME', proto: 2, tick, inputs });
        }
        this.applyFrame(tick, inputs);
      }

      runGuestPrediction(dt) {
        // 로컬 예측은 FRAME 확정 위치와 어긋나 고무줄/끊김을 만듦.
        // 같은 WiFi(수 ms)에서는 예측 없이 권위 프레임만 적용하는 편이 조작감이 낫다.
        if (this.solo || this.isHost || this.gameOver || this.levelTransition > 0) return;
        if (WwNetRef?.lanMode) {
          this.predAccumulator = 0;
          return;
        }
        const me = this.me();
        if (!me?.alive) return;
        const step = this.predStepMs();
        this.predAccumulator += dt;
        // 원격일 때만 짧게 예측 (과예측 고무줄 완화)
        const maxPredSteps = 2;
        let steps = 0;
        while (this.predAccumulator >= step && steps < maxPredSteps) {
          this.predAccumulator -= step;
          me.update({ predictive: true });
          steps++;
        }
        if (steps >= maxPredSteps) this.predAccumulator = 0;
      }

      onRemoteInput(from, tick, inp) {
        this.storeInput(tick, from, inp);
        if (this.isHost && tick === this.simTick) {
          this.trySealCurrentTick();
        }
      }

      onFrame(tick, inputs) {
        if (this.solo || this.isHost) return;
        this.applyFrame(tick, inputs);
        if (this.pendingGuestInput?.tick === tick) this.pendingGuestInput = null;
      }

      onPeerLeft(index) {
        this.disconnectedPlayers.add(index);
        const p = this.players[index];
        if (p && p.alive) this.playerDie(p);
        if (this.isHost) this.trySealCurrentTick();
      }

      draw() {
        const ww = getWorldW();
        const me = this.me();
        if (me && me.alive) {
          cameraX = Math.max(0, Math.min(ww - VW, me.cx - VW * 0.38));
        } else if (this.players.length) {
          const live = this.players.find(p => p.alive) || this.players[0];
          cameraX = Math.max(0, Math.min(ww - VW, live.cx - VW * 0.38));
        }

        drawBackground();
        if (this.world === 'underwater') {
          this.kelp.forEach((k) => drawKelp(k));
          this.clams.forEach((c) => c.draw());
          this.fish.forEach((f) => f.draw());
          this.bubbles.forEach((b) => b.draw());
        }
        this.activeCoins().forEach(c => c.draw());
        if (this.world === 'overworld') {
          this.vehicles.forEach((v) => v.draw());
          this.items.forEach(i => i.draw());
          this.cages.forEach(c => c.draw());
          this.enemies.forEach(e => e.draw());
          this.bossMinions.forEach(e => e.draw());
          this.bossProjectiles.forEach((p) => p.draw());
          if (this.boss) this.boss.draw();
          drawFlag();
        }
        this.fireballs.forEach(f => f.draw());
        this.iceballs.forEach(f => f.draw());
        this.players.forEach(p => p.draw());
        this.pets.forEach(p => p.draw(this));

        this.particles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x - cameraX, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });

        drawPopups();
        this.updateHUD();
      }

      loop(t) {
        if (!this.running) return;
        const dt = Math.min(50, t - (this.lastFrameT || t));
        this.lastFrameT = t;

        if (!this.gameOver) {
          if (this.levelTransition > 0) {
            this.levelTransition--;
            if (this.levelTransition === 0) this.advanceLevel();
          } else {
          const step = this.tickMs();
          this.simAccumulator += dt;
          if (this.solo) {
            while (this.simAccumulator >= step) {
              this.simAccumulator -= step;
              const inputs = {};
              inputs[this.myIndex] = this.sampleLocalInput();
              this.applyFrame(this.simTick, inputs);
            }
          } else if (this.isHost) {
            while (this.simAccumulator >= step) {
              // 대기 중에는 accumulator를 깎지 않음 → 타임아웃/도착 후 정상 진행
              if (!this.trySealCurrentTick(t)) break;
              this.simAccumulator -= step;
            }
          } else {
            // 비신뢰 채널: FRAME 오기 전까지 같은 tick 스냅샷을 ~40Hz로 재전송
            const tick = this.simTick;
            if (!this.pendingGuestInput || this.pendingGuestInput.tick !== tick) {
              this.pendingGuestInput = { tick, input: this.sampleLocalInput() };
            }
            if (!this._lastGuestSendT || t - this._lastGuestSendT >= NET_TICK_MS * 0.5) {
              WwNetRef.sendGame({
                type: 'INP',
                proto: 2,
                tick,
                input: this.pendingGuestInput.input,
              });
              this._lastGuestSendT = t;
              this.lastSentInputTick = tick;
            }
            this.simAccumulator = 0;
            this.runGuestPrediction(dt);
          }
          }
        }

        this.draw();
        if (!this.externalDriver) {
          this.rafId = requestAnimationFrame(ts => this.loop(ts));
        }
      }

      start() {
        this.levelIndex = 0;
        this.running = true;
        this.initLevel();
        this.lastFrameT = 0;
        cancelAnimationFrame(this.rafId);
        if (!this.externalDriver) {
          this.rafId = requestAnimationFrame(ts => this.loop(ts));
        }
      }

      stop() {
        this.running = false;
        cancelAnimationFrame(this.rafId);
      }

      restart() {
        this.stop();
        getHudEl('overlay').classList.remove('show');
        this.start();
      }
    }

    function win() {
      if (game) game.win();
    }

    function initLevel() {
      if (game) game.initLevel();
    }

    function rectOverlap(a, b) {
      return a.x + a.w > b.x && a.x < b.x + b.w &&
             a.y + a.h > b.y && a.y < b.y + b.h;
    }

    function drawPipes() {
      if (!game) return;
      const list = pipeDefs[game.world] || [];
      for (const pipe of list) {
        const sx = pipe.x - cameraX;
        if (sx + pipe.w < -20 || sx > VW + 20) continue;
        const bodyH = pipe.h;
        const lipH = 10;
        const isBonus = pipe.kind === 'bonus' || pipe.toWorld === 'bonus' || (pipe.id || '').startsWith('bg');
        const isWater = pipe.kind === 'water' || pipe.id === 'uw1' || pipe.id === 'owWater' || pipe.toWorld === 'underwater';
        const base = isWater ? '#0284c7' : isBonus ? '#ca8a04' : '#16a34a';
        const mid = isWater ? '#38bdf8' : isBonus ? '#eab308' : '#22c55e';
        const deep = isWater ? '#0369a1' : isBonus ? '#a16207' : '#15803d';
        const edge = isWater ? '#0c4a6e' : isBonus ? '#854d0e' : '#166534';
        ctx.fillStyle = base;
        ctx.fillRect(sx - 4, pipe.y - lipH, pipe.w + 8, lipH);
        ctx.fillStyle = mid;
        ctx.fillRect(sx - 2, pipe.y - lipH + 2, pipe.w + 4, lipH - 4);
        const grad = ctx.createLinearGradient(sx, pipe.y, sx + pipe.w, pipe.y);
        grad.addColorStop(0, deep);
        grad.addColorStop(0.5, mid);
        grad.addColorStop(1, edge);
        ctx.fillStyle = grad;
        ctx.fillRect(sx, pipe.y, pipe.w, bodyH);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(sx + pipe.w - 8, pipe.y + lipH, 6, bodyH - lipH);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(sx + 4, pipe.y + lipH, 6, bodyH - lipH);
        if (game.world === 'overworld') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(sx + 8, pipe.y + 4, pipe.w - 16, 18);
          if (isBonus) {
            ctx.fillStyle = '#fde68a';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('$', sx + pipe.w / 2, pipe.y + 17);
          }
        }
      }
    }

    function drawThemeDecor(theme, underground, underwater) {
      const deco = theme?.deco || "clouds";
      if (underwater) {
        ctx.fillStyle = 'rgba(125,211,252,0.12)';
        for (let i = 0; i < 14; i++) {
          const sx = (i * 140 - cameraX * 0.2) % (VW + 180) - 90;
          ctx.beginPath();
          ctx.arc(sx, 70 + (i % 5) * 55, 10 + (i % 4) * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      if (underground || deco === "sewer") {
        ctx.fillStyle = 'rgba(99,102,241,0.25)';
        for (let i = 0; i < 8; i++) {
          const sx = (i * 180 - cameraX * 0.15) % (VW + 200) - 100;
          ctx.beginPath();
          ctx.arc(sx, 120 + (i % 3) * 40, 30 + (i % 2) * 10, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      if (deco === "clouds" || deco === "waves") {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        [[100, 80, 60], [300, 120, 40], [550, 60, 80]].forEach(([x, y, s]) => {
          const sx = x - cameraX * 0.3;
          ctx.beginPath();
          ctx.arc(sx, y, s, 0, Math.PI * 2);
          ctx.arc(sx + s * 1.2, y, s * 0.8, 0, Math.PI * 2);
          ctx.arc(sx + s * 2, y, s * 0.6, 0, Math.PI * 2);
          ctx.fill();
        });
        if (deco === "waves") {
          ctx.fillStyle = 'rgba(56,189,248,0.25)';
          for (let i = 0; i < 6; i++) {
            const sx = (i * 200 - cameraX * 0.25) % (VW + 200) - 50;
            ctx.fillRect(sx, 400, 120, 8);
          }
        }
      } else if (deco === "trees") {
        for (let i = 0; i < 9; i++) {
          const wx = 120 + i * 280;
          const sx = wx - cameraX * 0.35;
          if (sx < -80 || sx > VW + 80) continue;
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 8, 320, 10, 50);
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(sx + 13, 310, 28, 0, Math.PI * 2);
          ctx.arc(sx - 8, 325, 22, 0, Math.PI * 2);
          ctx.arc(sx + 34, 325, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (deco === "buildings") {
        for (let i = 0; i < 7; i++) {
          const wx = 80 + i * 320;
          const sx = wx - cameraX * 0.2;
          if (sx < -100 || sx > VW + 100) continue;
          const bh = 80 + (i % 3) * 45;
          ctx.fillStyle = '#334155';
          ctx.fillRect(sx, 360 - bh, 70, bh);
          ctx.fillStyle = '#475569';
          ctx.fillRect(sx + 4, 360 - bh + 8, 62, 8);
          ctx.fillStyle = 'rgba(250,204,21,0.55)';
          for (let r = 0; r < Math.floor(bh / 22); r++) {
            for (let c = 0; c < 3; c++) {
              if ((i + r + c) % 2 === 0) ctx.fillRect(sx + 10 + c * 18, 360 - bh + 18 + r * 22, 10, 12);
            }
          }
        }
      } else if (deco === "lava") {
        ctx.fillStyle = 'rgba(251,146,60,0.2)';
        for (let i = 0; i < 8; i++) {
          const sx = (i * 200 - cameraX * 0.18) % (VW + 200) - 80;
          ctx.beginPath();
          ctx.moveTo(sx, 420);
          ctx.quadraticCurveTo(sx + 30, 400 + Math.sin(i) * 10, sx + 60, 420);
          ctx.fill();
        }
      } else if (deco === "coins") {
        ctx.fillStyle = 'rgba(250,204,21,0.12)';
        for (let i = 0; i < 10; i++) {
          const sx = (i * 160 - cameraX * 0.12) % (VW + 200) - 100;
          ctx.beginPath();
          ctx.arc(sx, 90 + (i % 4) * 35, 18 + (i % 3) * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawThemedPlatform(p, sx, theme, underground, underwater, isBonus) {
      const g = theme?.ground || { body: '#c84c0c', top: '#22c55e', stripe: 'grass' };
      if (isBonus) {
        ctx.fillStyle = '#a16207';
        ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(sx, p.y, p.w, 10);
      } else if (underwater) {
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.fillStyle = '#14b8a6';
        ctx.fillRect(sx, p.y, p.w, 10);
        ctx.fillStyle = 'rgba(45,212,191,0.25)';
        for (let i = 0; i < p.w; i += 22) ctx.fillRect(sx + i, p.y + 12, 8, 4);
      } else {
        ctx.fillStyle = g.body;
        ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.fillStyle = g.top;
        ctx.fillRect(sx, p.y, p.w, 14);
        if (g.stripe === 'moss') {
          ctx.fillStyle = 'rgba(34,197,94,0.25)';
          for (let i = 0; i < p.w; i += 24) ctx.fillRect(sx + i, p.y + 4, 10, 6);
        } else if (g.stripe === 'concrete') {
          ctx.fillStyle = 'rgba(148,163,184,0.35)';
          for (let i = 0; i < p.w; i += 28) ctx.fillRect(sx + i, p.y + 14, 2, p.h - 14);
        } else if (g.stripe === 'sand') {
          ctx.fillStyle = 'rgba(234,179,8,0.2)';
          for (let i = 0; i < p.w; i += 18) ctx.fillRect(sx + i, p.y + 10, 6, 3);
        } else if (g.stripe === 'brick') {
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.lineWidth = 1;
          for (let i = 0; i < p.w; i += 20) {
            ctx.strokeRect(sx + i, p.y + 14, 20, 8);
          }
        }
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < p.w; i += 30) ctx.fillRect(sx + i, p.y + 14, 2, p.h - 14);
      }
    }

    function drawBackground() {
      const underground = game && (game.world === 'underground' || game.world === 'bonus');
      const underwater = game && game.world === 'underwater';
      const isBonus = game && game.world === 'bonus';
      const theme = getThemeForWorld(game?.world, game?.mapTheme);
      const grad = ctx.createLinearGradient(0, 0, 0, VH);
      const sky = theme?.sky || ['#5c94fc', '#94c5ff'];
      grad.addColorStop(0, sky[0]);
      grad.addColorStop(underwater ? 0.45 : 1, sky[1] || sky[0]);
      if (underwater && sky[2]) grad.addColorStop(1, sky[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VW, VH);

      drawThemeDecor(theme, underground, underwater);

      for (const p of platforms) {
        if (p.pipeId) continue;
        const sx = p.x - cameraX;
        if (sx + p.w < 0 || sx > VW) continue;
        drawThemedPlatform(p, sx, theme, underground, underwater, isBonus);
      }

      if (!underground && !underwater) {
        for (const pit of pits) {
          const sx = pit.x - cameraX;
          if (sx + pit.w < 0 || sx > VW) continue;
          if (pit.water) {
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(sx, 440, pit.w, 80);
            ctx.fillStyle = 'rgba(56,189,248,0.55)';
            ctx.fillRect(sx, 440, pit.w, 14);
            ctx.fillStyle = 'rgba(125,211,252,0.45)';
            for (let i = 6; i < pit.w - 6; i += 16) {
              ctx.beginPath();
              ctx.arc(sx + i, 448, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (pit.lava) {
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(sx, 440, pit.w, 80);
            const lg = ctx.createLinearGradient(sx, 440, sx, 500);
            lg.addColorStop(0, 'rgba(251,146,60,0.85)');
            lg.addColorStop(0.5, 'rgba(239,68,68,0.9)');
            lg.addColorStop(1, 'rgba(127,29,29,0.95)');
            ctx.fillStyle = lg;
            ctx.fillRect(sx, 448, pit.w, 72);
            ctx.fillStyle = 'rgba(253,224,71,0.45)';
            for (let i = 8; i < pit.w - 8; i += 20) {
              ctx.beginPath();
              ctx.arc(sx + i, 460 + (i % 3) * 4, 5, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(sx, 440, pit.w, 80);
            ctx.fillStyle = '#7f1d1d';
            for (let i = 10; i < pit.w - 10; i += 18) {
              ctx.beginPath();
              ctx.moveTo(sx + i, 450);
              ctx.lineTo(sx + i + 8, 470);
              ctx.lineTo(sx + i + 16, 450);
              ctx.fill();
            }
          }
        }
      }

      drawPipes();

      if (game && game.boss && !game.boss.alive && game.world === 'overworld') {
        ctx.fillStyle = 'rgba(251,191,36,0.3)';
        ctx.fillRect(3600 - cameraX, 180, 400, 260);
      }
    }

    function drawFlag() {
      const fx = 4700 - cameraX;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(fx, 200, 8, 240);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(fx + 8, 210);
      ctx.lineTo(fx + 60, 230);
      ctx.lineTo(fx + 8, 250);
      ctx.fill();
    }
  return {
    get game() { return game; },
    set game(v) { game = v; },
    get cameraX() { return cameraX; },
    set cameraX(v) { cameraX = v; },
    MarioGame,
    win() { if (game) game.win(); },
    initLevel() { if (game) game.initLevel(); },
    drawBackground,
    drawPipes,
    drawFlag,
    drawPopups,
    getWorldW,
    platforms: () => platforms,
    setCtx(c) { ctx = c; },
    getCtx() { return ctx || getCanvasContext(); },
  };
}
