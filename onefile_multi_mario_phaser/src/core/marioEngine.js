import { mulberry32 } from "./rng.js";
import {
  DOUBLE_JUMP_FORCE,
  FEATHER_DURATION,
  FRICTION,
  GRAVITY,
  JUMP_CUT,
  JUMP_FORCE,
  MAX_SPEED,
  MOVE_SPEED,
  PIPE_COOLDOWN,
  PLAYER_DEFS,
  TICK_MS,
  UNDERGROUND_W,
  VH,
  VW,
  WORLD_W,
} from "./marioConstants.js";

export function createMarioEngine(env) {
  const { getCanvasContext, getHudEl, netBroadcast, WwNetRef } = env;

  let ctx = null;
  let game = null;
  let cameraX = 0;

  function getWorldW() {
    return game && game.world === "underground" ? UNDERGROUND_W : WORLD_W;
  }

const overworldPlatforms = [
      { x: 0, y: 440, w: 730, h: 60 },
      { x: 815, y: 440, w: 370, h: 60 },
      { x: 1270, y: 440, w: 420, h: 60 },
      { x: 1775, y: 440, w: 310, h: 60 },
      { x: 2170, y: 440, w: 380, h: 60 },
      { x: 2635, y: 440, w: 330, h: 60 },
      { x: 3135, y: 440, w: 420, h: 60 },
      { x: 3645, y: 440, w: 1155, h: 60 },
      // 계단형 공중 발판: 한 단 차이 ~40~100 (1~2단 점프 도달)
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

    const undergroundPlatforms = [
      { x: 0, y: 440, w: UNDERGROUND_W, h: 60 },
      { x: 80, y: 350, w: 140, h: 18 },
      { x: 220, y: 310, w: 90, h: 18 },
      { x: 320, y: 300, w: 120, h: 18 },
      { x: 520, y: 350, w: 100, h: 18 },
      { x: 620, y: 310, w: 90, h: 18 },
      { x: 700, y: 300, w: 130, h: 18 },
      { x: 920, y: 330, w: 110, h: 18 },
      { x: 1100, y: 300, w: 140, h: 18 },
      { x: 1240, y: 310, w: 120, h: 18 }
    ];

    let platforms = overworldPlatforms;
    const PIPE_LIP = 10;

    const pipeDefs = {
      overworld: [
        { id: 'ow1', x: 700, y: 388, w: 52, h: 64, to: 'ug1', toWorld: 'underground' },
        { id: 'ow2', x: 2180, y: 388, w: 52, h: 64, to: 'ug2', toWorld: 'underground' }
      ],
      underground: [
        { id: 'ug1', x: 100, y: 388, w: 52, h: 64, to: 'ow1', toWorld: 'overworld' },
        { id: 'ug2', x: 880, y: 388, w: 52, h: 64, to: 'ow2', toWorld: 'overworld' }
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
      const base = world === 'underground' ? undergroundPlatforms : overworldPlatforms;
      const solids = (pipeDefs[world] || []).map(pipeSolid);
      platforms = base.concat(solids);
    }
    rebuildPlatforms('overworld');

    const pits = [
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
      return pits.some(p => cx > p.x && cx < p.x + p.w);
    }

    function placePipeExit(dest, player, xOffset = 0) {
      const safeX = {
        ow1: 828,
        ow2: 2190,
        ug1: 108,
        ug2: 888
      };
      player.x = (safeX[dest.id] != null ? safeX[dest.id] : dest.x + 8) + xOffset;
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
      if (grounded) player.jumpsLeft = 2;
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
      constructor(g, index) {
        this.game = g;
        this.index = index;
        this.def = PLAYER_DEFS[index];
        this.input = { left: false, right: false, jumpPressed: false, jumpHeld: false, downPressed: false };
        this.alive = true;
        this.reset();
      }

      reset() {
        this.x = 80 + this.index * 48;
        this.y = 408;
        this.vx = 0;
        this.vy = 0;
        this.big = false;
        this.onGround = false;
        this.facing = 1;
        this.invincible = 0;
        this.w = 28;
        this.h = 32;
        this.jumpsLeft = 2;
        this.jumpCutApplied = false;
        this.alive = true;
        this.fireCooldown = 0;
        this.featherTimer = 0;
        this.updateSize();
        snapToGround(this);
      }

      updateSize() {
        if (this.big) {
          this.w = 36;
          this.h = 52;
        } else {
          this.w = 28;
          this.h = 32;
        }
      }

      grow() {
        if (!this.big) {
          this.big = true;
          this.y -= 20;
          this.updateSize();
        }
        this.invincible = 60;
      }

      shrink() {
        if (this.big) {
          this.big = false;
          this.y += 20;
          this.updateSize();
          this.invincible = 60;
          return false;
        }
        return true;
      }

      get cx() { return this.x + this.w / 2; }
      get cy() { return this.y + this.h / 2; }
      get bottom() { return this.y + this.h; }
      get top() { return this.y; }

      update() {
        if (!this.alive) return;
        const input = this.input;
        if (this.fireCooldown > 0) this.fireCooldown--;
        if (input.downPressed && this.fireCooldown <= 0 && !isPlayerOnPipe(this)) {
          if (this.game.iceAmmo > 0) this.game.shootIce(this.index);
          else this.game.shootFireball(this.index);
          this.fireCooldown = 18;
        }
        if (input.left) { this.vx -= MOVE_SPEED; this.facing = -1; }
        if (input.right) { this.vx += MOVE_SPEED; this.facing = 1; }
        if (this.featherTimer > 0) this.featherTimer--;
        if (this.featherTimer > 0 && input.jumpHeld && !this.onGround) {
          this.vy -= 0.42;
          this.vy = Math.max(this.vy, -7.2);
        }
        if (input.jumpPressed && this.jumpsLeft > 0) {
          this.vy = this.jumpsLeft === 2 ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
          this.jumpsLeft--;
          this.onGround = false;
          this.jumpCutApplied = false;
        }
        if (!input.jumpHeld && this.vy < 0 && !this.jumpCutApplied) {
          this.vy *= JUMP_CUT;
          this.jumpCutApplied = true;
        }
        input.jumpPressed = false;

        this.vx *= FRICTION;
        this.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, this.vx));
        this.vy += this.vy > 0 ? GRAVITY * 1.12 : GRAVITY;

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
              this.jumpsLeft = 2;
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

        if (this.y > VH + 50 || (this.game.world === 'overworld' && inPit(this.x, this.w) && this.bottom > 441)) {
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
        drawHero(sx, this.y, this.w, this.h, this.facing, this.big, this.animPhase || 0, this.onGround, this.def);
        if (this.game && this.index === this.game.myIndex) {
          ctx.strokeStyle = 'rgba(251,191,36,0.85)';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx - 2, this.y - 2, this.w + 4, this.h + 4);
        }
      }

      toNet() {
        return {
          x: this.x, y: this.y, vx: this.vx, vy: this.vy, big: this.big, facing: this.facing,
          invincible: this.invincible, w: this.w, h: this.h, jumpsLeft: this.jumpsLeft,
          alive: this.alive, animPhase: this.animPhase || 0, featherTimer: this.featherTimer
        };
      }

      applyNet(s) {
        this.x = s.x; this.y = s.y; this.vx = s.vx; this.vy = s.vy;
        this.big = s.big; this.facing = s.facing; this.invincible = s.invincible;
        this.w = s.w; this.h = s.h; this.jumpsLeft = s.jumpsLeft;
        this.alive = s.alive; this.animPhase = s.animPhase || 0;
        if (s.featherTimer !== undefined) this.featherTimer = s.featherTimer;
      }
    }

    function drawHero(sx, y, w, h, facing, big, anim, onGround, def) {
      const hatColor = def?.hat || '#dc2626';
      const overallColor = def?.overall || '#2563eb';
      const dir = facing > 0 ? 1 : -1;
      const walk = onGround ? Math.sin(anim) : 0;
      const cx = sx + w / 2;
      const baseY = y + h;

      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(dir, 1);
      ctx.translate(-w / 2, -h + walk * -1.5);

      const scale = big ? 1.28 : 1;
      const headR = (big ? 13 : 10) * scale;
      const headCx = w / 2;
      const headCy = headR + (big ? 4 : 2);
      const bodyTop = headCy + headR - 2;
      const bodyH = (big ? 22 : 14) * scale;
      const legH = h - (headCy + headR) - bodyH + 4;
      const legSwing = walk * 4;

      ctx.fillStyle = '#4a2c14';
      ctx.beginPath();
      ctx.ellipse(w * 0.35 - legSwing, h - 3, 6 * scale, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.65 + legSwing, h - 3, 6 * scale, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e4fa8';
      ctx.fillRect(w * 0.28, bodyTop + bodyH - 2, w * 0.18, legH);
      ctx.fillRect(w * 0.54, bodyTop + bodyH - 2, w * 0.18, legH);

      ctx.fillStyle = overallColor;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(w * 0.18, bodyTop, w * 0.64, bodyH, 4);
      else ctx.rect(w * 0.18, bodyTop, w * 0.64, bodyH);
      ctx.fill();

      ctx.fillStyle = hatColor;
      ctx.fillRect(w * 0.18, bodyTop + 2, w * 0.64, bodyH * 0.45);
      ctx.fillRect(w * 0.05, bodyTop + 4, w * 0.18, bodyH * 0.35);
      ctx.fillRect(w * 0.77, bodyTop + 4, w * 0.18, bodyH * 0.35);

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(w * 0.42, bodyTop + bodyH * 0.55, 2.5, 0, Math.PI * 2);
      ctx.arc(w * 0.58, bodyTop + bodyH * 0.55, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffcba4';
      ctx.beginPath();
      ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(headCx, headCy - headR * 0.35, headR * 1.05, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(headCx - headR * 1.1, headCy - headR * 0.2, headR * 2.2, headR * 0.35);
      ctx.fillStyle = hatColor;
      ctx.fillRect(headCx - headR * 1.15, headCy - headR * 0.05, headR * 2.3, headR * 0.22);

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(headCx, headCy - headR * 0.55, headR * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.arc(headCx, headCy - headR * 0.55, headR * 0.18, 0, Math.PI * 2);
      ctx.fill();

      const eyeX = headCx + headR * 0.28;
      const eyeY = headCy + headR * 0.05;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, headR * 0.28, headR * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(eyeX + headR * 0.1, eyeY + headR * 0.04, headR * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(eyeX + headR * 0.16, eyeY - headR * 0.06, headR * 0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5c3d1e';
      ctx.beginPath();
      ctx.ellipse(headCx + headR * 0.35, headCy + headR * 0.42, headR * 0.42, headR * 0.12, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(headCx, headCy, headR, 0.2, Math.PI * 2 - 0.2);
      ctx.stroke();

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
        this.x = x; this.y = y; this.w = 26; this.h = 26;
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
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(sx + 13, cy + 13, 12, 6, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🪶', sx + 13, cy + 18);
      }
    }

    class PowerMushroom {
      constructor(x, y) {
        this.x = x; this.y = y; this.w = 28; this.h = 28;
        this.vx = 1.5; this.vy = 0; this.collected = false;
        this.onGround = false;
      }
      update() {
        if (this.collected) return;
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;
        this.onGround = false;

        if (this.x < 0) { this.x = 0; this.vx *= -1; }
        if (this.x + this.w > getWorldW()) { this.x = getWorldW() - this.w; this.vx *= -1; }

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
        if (this.onGround && Math.abs(this.vx) < 0.5) this.vx = this.vx < 0 ? -1.5 : 1.5;
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

    class Boss {
      constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 200; this.h = 210;
        this.vx = 3;
        this.vy = 0;
        this.hp = 18;
        this.maxHp = 18;
        this.alive = true;
        this.hurtTimer = 0;
        this.bob = 0;
        this.startX = x;
        this.range = 280;
        this.stompInvincible = 0;
        this.jumpCooldown = 120;
        this.onGround = true;
        this.rage = 0;
        this.spawnTimer = 200;
        this.frozen = false;
        this.frozenTimer = 0;
        snapToGround(this);
      }
      update() {
        if (!this.alive) return;
        if (this.frozen) {
          this.frozenTimer--;
          if (this.frozenTimer <= 0) this.frozen = false;
          return;
        }
        this.bob += 0.05;
        this.jumpCooldown--;
        this.spawnTimer--;

        if (this.stompInvincible > 0) this.stompInvincible--;
        if (this.hurtTimer > 0) this.hurtTimer--;

        if (this.jumpCooldown <= 0 && this.onGround) {
          this.vy = -16 - this.rage * 0.5;
          this.onGround = false;
          this.jumpCooldown = Math.max(60, 150 - this.rage * 8);
        }

        this.vy += GRAVITY * 0.9;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < this.startX - this.range || this.x > this.startX + this.range) {
          this.vx *= -1;
          this.vx = Math.sign(this.vx) * (3 + this.rage * 0.3);
        }

        if (snapToGround(this)) {
          this.vy = 0;
        }

        if (this.spawnTimer <= 0) {
          this.spawnTimer = Math.max(90, 200 - this.rage * 10);
          const rng = game && game.rng ? game.rng : Math.random;
          const mx = this.x + (rng() > 0.5 ? this.w + 20 : -50);
          const m = new MushroomEnemy(mx, 0, 60, 2.2 + this.rage * 0.1);
          snapToGround(m);
          if (game) game.bossMinions.push(m);
        }
      }
      get headZone() {
        return { x: this.x + 30, y: this.y, w: this.w - 60, h: 55 };
      }
      stomp() {
        if (this.stompInvincible > 0) return;
        this.hp--;
        this.hurtTimer = 20;
        this.stompInvincible = 70;
        this.rage++;
        this.vx = Math.sign(this.vx || 1) * (3 + this.rage * 0.4);
        addParticles(this.x + this.w / 2, this.y + 30, '#ef4444', 25);
        if (this.hp <= 0) {
          this.alive = false;
          addParticles(this.x + this.w / 2, this.y + this.h / 2, '#fbbf24', 50);
          win();
        }
      }
      draw() {
        if (!this.alive) return;
        const sx = this.x - cameraX;
        const bobY = Math.sin(this.bob) * 6;
        const hurt = this.hurtTimer > 0 && Math.floor(this.hurtTimer / 3) % 2 === 0;
        const cx = sx + this.w / 2;
        const footY = this.y + this.h + bobY;

        drawEnemyMushroom(cx, footY, 88, hurt ? '#f87171' : '#991b1b', true);

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(cx - 35, this.y + 95 + bobY, 18, 22, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 35, this.y + 95 + bobY, 18, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx - 30, this.y + 90 + bobY, 7, 0, Math.PI * 2);
        ctx.arc(cx + 30, this.y + 90 + bobY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx - 28, this.y + 92 + bobY, 3, 0, Math.PI * 2);
        ctx.arc(cx + 32, this.y + 92 + bobY, 3, 0, Math.PI * 2);
        ctx.fill();

        const barW = this.w - 20;
        ctx.fillStyle = '#334155';
        if (ctx.roundRect) ctx.roundRect(sx + 10, this.y - 24 + bobY, barW, 12, 4);
        else ctx.rect(sx + 10, this.y - 24 + bobY, barW, 12);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        if (ctx.roundRect) ctx.roundRect(sx + 10, this.y - 24 + bobY, barW * (this.hp / this.maxHp), 12, 4);
        else ctx.rect(sx + 10, this.y - 24 + bobY, barW * (this.hp / this.maxHp), 12);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('보스', cx, this.y - 14 + bobY);
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
      constructor(x, y, vx, vy, ownerIdx) {
        this.x = x; this.y = y; this.w = 14; this.h = 14;
        this.vx = vx; this.vy = vy; this.ownerIdx = ownerIdx; this.alive = true;
      }
      update() {
        this.vy += GRAVITY * 0.35;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > getWorldW() || this.y > VH + 50) this.alive = false;
        for (const p of platforms) {
          if (this.x + this.w > p.x && this.x < p.x + p.w &&
              this.y + this.h > p.y && this.y < p.y + p.h) {
            this.alive = false;
            break;
          }
        }
      }
      draw() {
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

    function spawnEnemy(EnemyClass, x, range, speed) {
      const temp = { x, w: 34, y: 0, h: EnemyClass === TurtleEnemy ? 38 : 30 };
      const plat = getPlatformUnder(x, temp.w);
      if (!plat) return null;
      const y = plat.y - temp.h;
      return new EnemyClass(x, y, range, speed);
    }

    class MarioGame {
      constructor(opts) {
        this.solo = opts.solo;
        this.isHost = opts.isHost;
        this.myIndex = opts.myIndex;
        this.playerCount = opts.playerCount || 1;
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
        this.particles = [];
        this.fireballs = [];
        this.iceballs = [];
        this.coinsCount = 0;
        this.iceAmmo = 0;
        this.world = 'overworld';
        this.undergroundCoins = [];
        this.pipeCooldown = 0;
        this.simTick = 0;
        this.simAccumulator = 0;
        this.inputBuffer = {};
        this.lastSentInputTick = -1;
        this.lastFrameT = 0;
        this.disconnectedPlayers = new Set();
        this.rafId = 0;
        this.externalDriver = !!opts.externalDriver;
      }

      me() { return this.players[this.myIndex] || this.players[0]; }

      initLevel() {
        if (this.solo) this.seed = Date.now() >>> 0;
        this.rng = mulberry32(this.seed);
        this.simTick = 0;
        this.simAccumulator = 0;
        this.inputBuffer = {};
        this.lastSentInputTick = -1;
        this.disconnectedPlayers = new Set();
        popups.length = 0;
        this.players = [];
        for (let i = 0; i < this.playerCount; i++) {
          this.players.push(new Player(this, i));
        }
        this.particles = [];
        this.fireballs = [];
        this.iceballs = [];
        this.coinsCount = 0;
        this.iceAmmo = 0;
        this.bossMinions = [];
        this.world = 'overworld';
        this.pipeCooldown = 0;
        rebuildPlatforms('overworld');

        const rng = this.rng;
        this.coins = [
          [250, 300], [520, 240], [950, 290], [1250, 220],
          [1600, 260], [1950, 290], [2550, 250], [3000, 200],
          [3400, 270], [4100, 300], [4500, 240],
          [380, 310, 'blue'], [1050, 250, 'blue'], [1850, 270, 'blue'], [3200, 290, 'blue']
        ].map(c => c.length === 3 ? new Coin(c[0], c[1], c[2], rng) : new Coin(c[0], c[1], 'gold', rng));

        this.undergroundCoins = [
          [120, 380], [220, 300], [350, 240], [480, 310], [620, 260],
          [760, 300], [900, 240], [1040, 280], [1180, 320], [1280, 250]
        ].map(([x, y]) => new Coin(x, y, 'gold', rng));

        const m1plat = getPlatformUnder(500, 28);
        const fplat = getPlatformUnder(1280, 28);
        this.items = [
          new PowerMushroom(500, m1plat ? m1plat.y - 60 : 350),
          new PowerFeather(fplat ? fplat.x + 40 : 1280, fplat ? fplat.y - 50 : 210, rng)
        ];

        this.enemies = [
          spawnEnemy(MushroomEnemy, 300, 60, 2.0),
          spawnEnemy(TurtleEnemy, 550, 50, 1.8),
          spawnEnemy(MushroomEnemy, 900, 70, 2.2),
          spawnEnemy(MushroomEnemy, 1000, 50, 2.0),
          spawnEnemy(TurtleEnemy, 1400, 60, 2.0),
          spawnEnemy(MushroomEnemy, 1600, 80, 2.3),
          spawnEnemy(TurtleEnemy, 1950, 50, 2.1),
          spawnEnemy(MushroomEnemy, 2100, 60, 2.2),
          spawnEnemy(MushroomEnemy, 2400, 70, 2.4),
          spawnEnemy(TurtleEnemy, 2600, 55, 2.2),
          spawnEnemy(MushroomEnemy, 2900, 60, 2.3),
          spawnEnemy(TurtleEnemy, 3100, 50, 2.3),
          spawnEnemy(MushroomEnemy, 3400, 70, 2.5),
          spawnEnemy(MushroomEnemy, 3600, 50, 2.4),
          spawnEnemy(TurtleEnemy, 3800, 60, 2.5)
        ].filter(Boolean);

        const bossPlat = getPlatformUnder(4000, 200);
        this.boss = new Boss(4050, bossPlat ? bossPlat.y - 210 : 230);
        this.gameOver = false;
        this.gameWon = false;
        cameraX = 0;
        getHudEl('overlay').classList.remove('show');
        this.updateHUD();
        this.updatePlayerTags();
      }

      activeCoins() {
        return this.world === 'underground' ? this.undergroundCoins : this.coins;
      }

      totalCoinsCollected() {
        return this.coins.filter(c => c.collected).length +
          this.undergroundCoins.filter(c => c.collected).length;
      }

      checkPipeWarp(player) {
        if (this.pipeCooldown > 0 || !player.onGround || !player.input.downPressed) return;
        const list = pipeDefs[this.world] || [];
        for (const pipe of list) {
          const top = pipeTopY(pipe);
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
        popup(this.world === 'underground' ? '🕳️ 지하' : '☀️ 지상');
      }

      checkCollisions() {
        for (const player of this.players) {
          if (!player.alive) continue;
          this.checkPipeWarp(player);
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
            if (player.vy > 0 && player.bottom - player.vy <= e.y + 12) {
              e.stomp(player);
              player.vy = JUMP_FORCE * 0.45;
            } else if (player.invincible <= 0) {
              if (player.shrink()) this.playerDie(player);
            }
          }
          if (this.world === 'overworld' && this.boss && this.boss.alive && rectOverlap(player, this.boss)) {
            const head = this.boss.headZone;
            const onHead = player.vy > 2 &&
              player.bottom - player.vy <= head.y + head.h &&
              player.cx > head.x && player.cx < head.x + head.w;
            if (onHead) {
              this.boss.stomp();
              player.vy = JUMP_FORCE * 0.35;
            } else if (player.invincible <= 0) {
              if (player.shrink()) this.playerDie(player);
              player.vx = (player.cx < this.boss.x + this.boss.w / 2 ? -6 : 6);
            }
          }
          }
        }
      }

      playerDie(player) {
        player.alive = false;
        player.vx = 0; player.vy = 0;
        addParticles(player.cx, player.cy, '#ef4444', 16);
        this.updatePlayerTags();
        if (!this.players.some(p => p.alive)) {
          this.endGame(false, `코인 ${this.totalCoinsCollected()}개 수집`);
        }
      }

      win() {
        if (this.gameWon) return;
        this.gameWon = true;
        this.gameOver = true;
        this.endGame(true, `보스 처치! 코인 ${this.totalCoinsCollected()}개`);
      }

      endGame(won, msg) {
        this.gameOver = true;
        getHudEl('overlayTitle').textContent = won ? '🎉 클리어!' : '💀 게임 오버';
        getHudEl('overlayMsg').textContent = msg;
        if (typeof window.refreshEndgameAd === 'function') window.refreshEndgameAd();
        getHudEl('overlay').classList.add('show');
        if (!this.solo && this.isHost) {
          netBroadcast({ type: 'END', proto: 1, won, msg });
        }
      }

      shootFireball(playerIdx) {
        const p = this.players[playerIdx];
        if (!p || !p.alive) return;
        if (this.coinsCount > 0) {
          this.coinsCount--;
          this.updateHUD();
          const f = new Fireball(p.x + p.w / 2, p.y + p.h / 2 - 4, p.facing * 6.5, -2, playerIdx);
          this.fireballs.push(f);
          addParticles(p.cx, p.cy, '#ef4444', 5);
        }
      }

      shootIce(playerIdx) {
        const p = this.players[playerIdx];
        if (!p || !p.alive) return;
        if (this.iceAmmo <= 0) return;
        this.iceAmmo--;
        this.updateHUD();
        const ice = new Iceball(
          p.x + p.w / 2 + p.facing * 8,
          p.y + p.h / 2 - 4,
          p.facing * 7.5,
          -1.5,
          playerIdx
        );
        this.iceballs.push(ice);
        addParticles(p.cx, p.cy, '#38bdf8', 8);
      }

      updateHUD() {
        const me = this.me();
        const collected = this.totalCoinsCollected();
        getHudEl('coins').textContent = collected;
        getHudEl('fireballsAmmo').textContent = this.coinsCount;
        getHudEl('iceAmmo').textContent = this.iceAmmo;
        let status = me && me.alive ? (me.big ? '큼' : '작음') : '전멸';
        if (me && me.featherTimer > 0) status += ' · 비행';
        getHudEl('status').textContent = status;
        getHudEl('featherTime').textContent =
          me && me.featherTimer > 0 ? Math.ceil(me.featherTimer / 60) + 's' : '-';
        getHudEl('bossHp').textContent =
          this.world === 'underground' ? '지하' :
          (this.boss && this.boss.alive ? this.boss.hp : '처치!');
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
        this.activeCoins().forEach(c => c.update());
        if (this.world === 'overworld') {
          this.items.forEach(i => i.update());
          this.enemies.forEach(e => e.update());
          this.bossMinions.forEach(e => e.update());
          this.bossMinions = this.bossMinions.filter(e => e.alive || e.squished);
          if (this.boss) this.boss.update();
        }

        this.fireballs.forEach(f => f.update());
        this.iceballs.forEach(f => f.update());
        this.fireballs.forEach(f => {
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
        if (!me) return { l: 0, r: 0, j: 0, jh: 0, d: 0 };
        const inp = {
          l: me.input.left ? 1 : 0,
          r: me.input.right ? 1 : 0,
          j: me.input.jumpPressed ? 1 : 0,
          jh: me.input.jumpHeld ? 1 : 0,
          d: me.input.downPressed ? 1 : 0
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
          if (inp.j) p.input.jumpPressed = true;
          if (inp.d) p.input.downPressed = true;
        }
      }

      storeInput(tick, playerIndex, inp) {
        if (tick < this.simTick) return;
        if (!this.inputBuffer[tick]) this.inputBuffer[tick] = {};
        this.inputBuffer[tick][playerIndex] = inp;
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
            ? { l: 0, r: 0, j: 0, jh: 0, d: 0 }
            : (this.inputBuffer[tick]?.[i] ?? { l: 0, r: 0, j: 0, jh: 0, d: 0 });
        }
        return inputs;
      }

      simulateTick(inputs) {
        this.applyInputsForTick(inputs);
        this.hostTick();
      }

      applyFrame(tick, inputs) {
        if (tick !== this.simTick || this.gameOver) return;
        this.simulateTick(inputs);
        this.simTick++;
        delete this.inputBuffer[tick];
      }

      sealFrame(tick) {
        if (tick !== this.simTick || this.gameOver) return;
        const inputs = this.getInputsArray(tick);
        if (!this.solo && this.isHost) {
          netBroadcast({ type: 'FRAME', proto: 1, tick, inputs });
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
        this.applyFrame(tick, inputs);
      }

      onPeerLeft(index) {
        this.disconnectedPlayers.add(index);
        const p = this.players[index];
        if (p && p.alive) this.playerDie(p);
        if (this.isHost && this.hasAllInputs(this.simTick)) {
          this.sealFrame(this.simTick);
        }
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
        this.activeCoins().forEach(c => c.draw());
        if (this.world === 'overworld') {
          this.items.forEach(i => i.draw());
          this.enemies.forEach(e => e.draw());
          this.bossMinions.forEach(e => e.draw());
          if (this.boss) this.boss.draw();
          drawFlag();
        }
        this.fireballs.forEach(f => f.draw());
        this.iceballs.forEach(f => f.draw());
        this.players.forEach(p => p.draw());

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
          this.simAccumulator += dt;
          if (this.solo) {
            while (this.simAccumulator >= TICK_MS) {
              this.simAccumulator -= TICK_MS;
              const inputs = {};
              inputs[this.myIndex] = this.sampleLocalInput();
              this.applyFrame(this.simTick, inputs);
            }
          } else if (this.isHost) {
            while (this.simAccumulator >= TICK_MS) {
              this.simAccumulator -= TICK_MS;
              const tick = this.simTick;
              this.storeInput(tick, this.myIndex, this.sampleLocalInput());
              if (this.hasAllInputs(tick)) {
                this.sealFrame(tick);
              } else {
                break;
              }
            }
          } else if (this.simAccumulator >= TICK_MS) {
            this.simAccumulator -= TICK_MS;
            const tick = this.simTick;
            if (this.lastSentInputTick < tick) {
              WwNetRef.sendToHost({ type: 'INP', proto: 1, tick, input: this.sampleLocalInput() });
              this.lastSentInputTick = tick;
            }
          }
        }

        this.draw();
        if (!this.externalDriver) {
          this.rafId = requestAnimationFrame(ts => this.loop(ts));
        }
      }

      start() {
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
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(sx - 4, pipe.y - lipH, pipe.w + 8, lipH);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(sx - 2, pipe.y - lipH + 2, pipe.w + 4, lipH - 4);
        const grad = ctx.createLinearGradient(sx, pipe.y, sx + pipe.w, pipe.y);
        grad.addColorStop(0, '#15803d');
        grad.addColorStop(0.5, '#22c55e');
        grad.addColorStop(1, '#166534');
        ctx.fillStyle = grad;
        ctx.fillRect(sx, pipe.y, pipe.w, bodyH);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(sx + pipe.w - 8, pipe.y + lipH, 6, bodyH - lipH);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(sx + 4, pipe.y + lipH, 6, bodyH - lipH);
        if (game.world === 'overworld') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(sx + 8, pipe.y + 4, pipe.w - 16, 18);
        }
      }
    }

    function drawBackground() {
      const underground = game && game.world === 'underground';
      const grad = ctx.createLinearGradient(0, 0, 0, VH);
      if (underground) {
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(1, '#312e81');
      } else {
        grad.addColorStop(0, '#5c94fc');
        grad.addColorStop(1, '#94c5ff');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VW, VH);

      if (!underground) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        [[100, 80, 60], [300, 120, 40], [550, 60, 80]].forEach(([x, y, s]) => {
          const sx = x - cameraX * 0.3;
          ctx.beginPath();
          ctx.arc(sx, y, s, 0, Math.PI * 2);
          ctx.arc(sx + s * 1.2, y, s * 0.8, 0, Math.PI * 2);
          ctx.arc(sx + s * 2, y, s * 0.6, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        ctx.fillStyle = 'rgba(99,102,241,0.25)';
        for (let i = 0; i < 8; i++) {
          const sx = (i * 180 - cameraX * 0.15) % (VW + 200) - 100;
          ctx.beginPath();
          ctx.arc(sx, 120 + (i % 3) * 40, 30 + (i % 2) * 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const p of platforms) {
        if (p.pipeId) continue; // 파이프 솔리드는 drawPipes에서만 그린다
        const sx = p.x - cameraX;
        if (sx + p.w < 0 || sx > VW) continue;
        if (underground) {
          ctx.fillStyle = '#57534e';
          ctx.fillRect(sx, p.y, p.w, p.h);
          ctx.fillStyle = '#78716c';
          ctx.fillRect(sx, p.y, p.w, 10);
        } else {
          ctx.fillStyle = '#c84c0c';
          ctx.fillRect(sx, p.y, p.w, p.h);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(sx, p.y, p.w, 14);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < p.w; i += 30) ctx.fillRect(sx + i, p.y + 14, 2, p.h - 14);
      }

      if (!underground) {
        for (const pit of pits) {
          const sx = pit.x - cameraX;
          if (sx + pit.w < 0 || sx > VW) continue;
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
