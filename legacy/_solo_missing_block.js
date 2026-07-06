  /* ═══════════════════════════════════════════════════════════════════════════
     § CORE — 상태·웨이브·상수
     ═══════════════════════════════════════════════════════════════════════════ */
  const EMOJI_FONT = "'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif";
  const BOSS_EMOJI = GAME_CONFIG.boss.emoji;
  const BOSS_DMG_PER_WORD = GAME_CONFIG.boss.damagePerWord;
  const LEAK_DAMAGE = GAME_CONFIG.leakDamage;
  const EXPLOSION_RADIUS = [0, 72, 118];
  const MISSILE_SPEED = 8.5;
  const MISSILE_SPEED_NO_TARGET = 9;
  const HIT_COLORS = ["#00e0ff", "#ff4757", "#ffa502", "#2ed573", "#a55eea", "#ff6b81"];

  let WORD_FONT = "bold 22px monospace";
  let MISSILE_FONT = "bold 20px monospace";
  let PARTICLE_FONT = "bold 16px monospace";

  function buildWavesFromConfig() {
    const all = GAME_CONFIG.fallingWords;
    return GAME_CONFIG.waves.map(w => ({
      killTarget: w.killTarget,
      spawnInterval: w.spawnInterval,
      wordPool: all.slice(0, Math.min(w.wordPoolCount, all.length)),
      speedMin: w.speedMin * GAME_SPEED,
      speedMax: w.speedMax * GAME_SPEED
    }));
  }
  const WAVES = buildWavesFromConfig();

  function getWaveConfig(index) {
    if (index < WAVES.length) return WAVES[index];
    const base = WAVES[WAVES.length - 1];
    const extra = index - WAVES.length + 1;
    return {
      killTarget: base.killTarget + extra * 4,
      spawnInterval: Math.max(20, base.spawnInterval - extra * 3),
      wordPool: base.wordPool,
      speedMin: base.speedMin + extra * 0.04,
      speedMax: base.speedMax + extra * 0.04
    };
  }

  function wordColor(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return HIT_COLORS[h % HIT_COLORS.length];
  }

  function getWordBox(text, x, y) {
    return Pretext.getWordHitbox(text, x, y, WORD_FONT, 'center');
  }

  function getMissileDamage() {
    return BOSS_DMG_PER_WORD;
  }

  function getExplosionRadius() {
    return EXPLOSION_RADIUS[state.playerPerks.explosionLevel] || 0;
  }

  const state = {
    gameState: 'WAVE',
    gameResult: null,
    waveIndex: 0,
    killCount: 0,
    inputBuffer: '',
    playerPerks: { piercing: false, bounce: false, splitLevel: 0, explosionLevel: 0 }
  };

  const boss = { hp: GAME_CONFIG.boss.maxHp, maxHp: GAME_CONFIG.boss.maxHp };
  const players = [
    { side: 'left', hp: GAME_CONFIG.players[0].maxHp, maxHp: GAME_CONFIG.players[0].maxHp, emoji: GAME_CONFIG.players[0].emoji, xRatio: 0.28 },
    { side: 'right', hp: GAME_CONFIG.players[1].maxHp, maxHp: GAME_CONFIG.players[1].maxHp, emoji: GAME_CONFIG.players[1].emoji, xRatio: 0.72 }
  ];

  let words = [];
  let missiles = [];
  let particles = [];
  let rings = [];
  let pops = [];
  let spawnTimer = 0;
  let wordIdCounter = 0;

  function updateFontMetrics() {
    const w = canvas.width || 360;
    const wordPx = Math.round(Math.max(18, Math.min(28, w * 0.058)));
    const missilePx = Math.round(wordPx * 0.88);
    const particlePx = Math.round(wordPx * 0.78);
    WORD_FONT = `bold ${wordPx}px monospace`;
    MISSILE_FONT = `bold ${missilePx}px monospace`;
    PARTICLE_FONT = `bold ${particlePx}px monospace`;
  }

  function resize() {
    canvas.width = battlefield.clientWidth || LOGIC_W || 600;
    canvas.height = battlefield.clientHeight || LOGIC_H || 450;
    updateFontMetrics();
  }

  function midX() { return canvas.width / 2; }

  function playerPos(idx) {
    return { x: canvas.width * players[idx].xRatio, y: canvas.height - 28 };
  }

  function drawEmojiChar(emoji, cx, cy, size = 36) {
    ctx.save();
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy);
    ctx.restore();
  }

  function updatePlayerHud() {
    hpLeft.textContent = players[0].hp;
    hpRight.textContent = players[1].hp;
    hpBoss.textContent = boss.hp;
  }

  function findTargets(text, count) {
    const candidates = words.filter(w => w.text === text && !w.hit);
    candidates.sort((a, b) => b.y - a.y);
    return candidates.slice(0, count);
  }

  function spawnWordOnSide(text, side, speed) {
    const idx = side === 'left' ? 0 : 1;
    const target = playerPos(idx);
    const mid = midX();
    const half = Pretext.getTextWidth(text, WORD_FONT) / 2;
    const pad = 10;
    let startX;
    if (side === 'left') {
      const minX = half + pad;
      const maxX = mid - half - pad;
      startX = maxX <= minX ? mid * 0.5 : minX + Math.random() * (maxX - minX);
    } else {
      const minX = mid + half + pad;
      const maxX = canvas.width - half - pad;
      startX = maxX <= minX ? mid * 1.5 : minX + Math.random() * (maxX - minX);
    }
    const startY = -20;
    const dx = target.x - startX;
    const dy = target.y - startY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      x: startX,
      y: startY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed
    };
  }

  function spawnWord() {
    const cfg = getWaveConfig(state.waveIndex);
    const text = cfg.wordPool[Math.floor(Math.random() * cfg.wordPool.length)];
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    const motion = spawnWordOnSide(text, side, speed);
    words.push({
      id: wordIdCounter++,
      text,
      side,
      x: motion.x,
      y: motion.y,
      vx: motion.vx,
      vy: motion.vy
    });
  }

  function processWordLeaks() {
    const leakY = playerPos(0).y - 10;
    words.forEach(w => {
      if (w.hit || w.y < leakY) return;
      const idx = w.side === 'left' ? 0 : 1;
      players[idx].hp = Math.max(0, players[idx].hp - LEAK_DAMAGE);
      w.hit = true;
      updatePlayerHud();
    });
  }

  function missileHitsWord(m, w, oldX, oldY) {
    if (m.text !== w.text) return false;
    const box = getWordBox(w.text, w.x, w.y);
    if (Pretext.checkLineIntersection({ x: oldX, y: oldY }, { x: m.x, y: m.y }, box)) return true;
    const misBox = { x: m.x - 3, y: m.y - 3, width: 6, height: 6 };
    return Pretext.checkAABBCollision(misBox, box);
  }

  function fxDir(w, m, hitX, hitY) {
    if (m) {
      const dx = m.x - m.oldX, dy = m.y - m.oldY;
      if (dx * dx + dy * dy > 0.01) {
        const d = Math.sqrt(dx * dx + dy * dy);
        return { x: dx / d, y: dy / d };
      }
    }
    const p = playerPos(w.side === 'left' ? 0 : 1);
    const dx = hitX - p.x, dy = hitY - p.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / d, y: dy / d };
  }

  function fxBurst(x, y, dirX, dirY, color, text) {
    const spd = 5.5 * (FX.burstSpeed || 1);
    const jit = FX.burstSpread ?? 0.35;
    let off = 0;
    const tw = Pretext.getTextWidth(text, PARTICLE_FONT);
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const cw = Pretext.getTextWidth(ch, PARTICLE_FONT);
      const cx = x + off - tw / 2;
      off += cw;
      for (let n = 0; n < 3; n++) {
        const k = 1 + (Math.random() - 0.5) * jit;
        particles.push({
          char: ch, x: cx, y, color,
          vx: dirX * spd * k + (Math.random() - 0.5) * 2.5,
          vy: dirY * spd * k + (Math.random() - 0.5) * 2.5,
          life: 16
        });
      }
    }
    for (let n = 0; n < 6; n++) {
      particles.push({
        char: n & 1 ? '•' : '✦', x, y, color,
        vx: dirX * spd + (Math.random() - 0.5) * 5,
        vy: dirY * spd + (Math.random() - 0.5) * 5,
        life: 12
      });
    }
    rings.push({ x, y, r: 5, maxR: 40, life: 10, color });
    shakeT = Math.max(shakeT, FX.hitShake || 0);
  }

  function fxPop(x, y, dirX, dirY, text, color) {
    const d = FX.popDrift || 2;
    pops.push({ x, y, text, color, vx: dirX * d, vy: dirY * d, scale: 1.12, life: 9 });
  }

  function fxExplosion(x, y, color, radius) {
    rings.push({ x, y, r: 6, maxR: radius, life: 14, color });
    rings.push({ x, y, r: 3, maxR: radius * 0.45, life: 9, color });
    const n = 8 + (radius / 18 | 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283;
      const s = 5 + Math.random() * 6;
      particles.push({
        char: '✦', x, y, color,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 14
      });
    }
    shakeT = Math.max(shakeT, (FX.hitShake || 0) + 2);
  }

  function tickFx() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.9;
      p.vy = p.vy * 0.9 + 0.2;
      if (--p.life <= 0) particles.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const f = rings[i];
      f.r += (f.maxR - f.r) * 0.38;
      if (--f.life <= 0) rings.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      const h = pops[i];
      h.x += h.vx;
      h.y += h.vy;
      h.vx *= 0.86;
      h.vy *= 0.86;
      h.scale += 0.05;
      if (--h.life <= 0) pops.splice(i, 1);
    }
    if (shakeT > 0) shakeT--;
  }

  function drawFx() {
    ctx.save();
    ctx.font = PARTICLE_FONT;
    ctx.textAlign = 'center';
    particles.forEach(p => {
      ctx.globalAlpha = Math.min(1, p.life / 14);
      ctx.fillStyle = p.color;
      ctx.fillText(p.char, p.x, p.y);
    });
    rings.forEach(f => {
      const a = f.life / 12;
      ctx.globalAlpha = a * 0.75;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 6.283);
      ctx.stroke();
    });
    ctx.font = WORD_FONT;
    pops.forEach(h => {
      ctx.globalAlpha = h.life / 9;
      ctx.fillStyle = h.color;
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.scale(h.scale, h.scale);
      ctx.fillText(h.text, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  function applyExplosionAt(hitX, hitY, color, skipWord) {
    const radius = getExplosionRadius();
    if (radius <= 0) return;
    fxExplosion(hitX, hitY, color, radius);
    const r2 = radius * radius;
    words.forEach(w => {
      if (w.hit || w === skipWord) return;
      const dx = w.x - hitX, dy = w.y - hitY;
      if (dx * dx + dy * dy > r2) return;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      resolveWordHit(w, null, w.x, w.y, true, dx / d, dy / d);
    });
  }

  function checkWaveClear() {
    const cfg = getWaveConfig(state.waveIndex);
    if (state.killCount >= cfg.killTarget && state.gameState === 'WAVE') {
      showUpgradeOverlay();
    }
  }

  function resolveWordHit(w, m, hitX, hitY, fromExplosion, forceDirX, forceDirY) {
    if (w.hit) return;
    w.hit = true;
    boss.hp = Math.max(0, boss.hp - getMissileDamage());
    state.killCount += 1;
    updateWaveHud();
    const col = wordColor(w.text);
    let dirX = forceDirX, dirY = forceDirY;
    if (dirX === undefined || dirY === undefined) {
      const dir = fxDir(w, m, hitX, hitY);
      dirX = dir.x;
      dirY = dir.y;
    }
    fxBurst(hitX, hitY, dirX, dirY, col, w.text);
    if (!fromExplosion) {
      fxPop(hitX, hitY, dirX, dirY, w.text, col);
      applyExplosionAt(hitX, hitY, col, w);
      if (m && !m.piercing) m.dead = true;
      checkWaveClear();
    }
    checkGameEnd();
  }

  function checkGameEnd() {
    if (state.gameState === 'END') return;
    if (boss.hp <= 0) {
      endGame('WIN', '🧙 마법사를 물리쳤습니다!', '승리!');
      return;
    }
    if (players[0].hp <= 0) {
      endGame('LOSE', '👸 공주가 쓰러졌습니다…', '패배');
      return;
    }
    if (players[1].hp <= 0) {
      endGame('LOSE', '🦸 용사가 쓰러졌습니다…', '패배');
    }
  }

  function endGame(result, msg, title) {
    state.gameState = 'END';
    state.gameResult = result;
    words = [];
    missiles = [];
    hideUpgradeOverlay();
    gameOverOverlay.className = result === 'WIN' ? 'win show' : 'lose show';
    gameOverTitle.textContent = title;
    gameOverMsg.textContent = msg;
    gameOverOverlay.classList.add('show');
  }

  function resetGame() {
    state.gameState = 'WAVE';
    state.gameResult = null;
    state.waveIndex = 0;
    state.killCount = 0;
    state.playerPerks = { piercing: false, bounce: false, splitLevel: 0, explosionLevel: 0 };
    boss.hp = boss.maxHp;
    players[0].hp = players[0].maxHp;
    players[1].hp = players[1].maxHp;
    words = [];
    missiles = [];
    particles = [];
    rings = [];
    pops = [];
    spawnTimer = 0;
    wordIdCounter = 0;
    clearBuffer();
    hideUpgradeOverlay();
    gameOverOverlay.classList.remove('show', 'win', 'lose');
    updateWaveHud();
    updatePlayerHud();
    updatePerkStatusDisplay();
  }
