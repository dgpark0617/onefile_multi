import { WORLD_W, UNDERGROUND_W, UNDERWATER_W } from "./marioConstants.js";
import { pickMapTheme, pickThemeEnemyType } from "./mapThemes.js";

const GROUND_Y = 440;
const GROUND_H = 60;
const PIPE_Y = 388;

/** 점프 가능 웅덩이 폭 (물리 여유 포함) */
const GAP = {
  easy: [72, 90],
  mid: [85, 105],
  hard: [95, 118],
};

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng, a, b) {
  return a + Math.floor(rng() * (b - a + 1));
}

function gapW(rng, tier) {
  const [lo, hi] = GAP[tier] || GAP.mid;
  return randInt(rng, lo, hi);
}

function densOf(name) {
  if (name === "1-3") return 0.72;
  if (name === "1-2") return 0.5;
  return 0.32;
}

function tierOf(name) {
  if (name === "1-3") return "hard";
  if (name === "1-2") return "mid";
  return "easy";
}

/* ========== 검증된 플레이 조각 ========== */

function makeStart(rng) {
  const w = 640;
  return {
    tag: "start",
    width: w,
    ground: [{ x: 0, w }],
    air: [
      { x: 160, y: 350, w: 90 },
      { x: 300, y: 310, w: 80 },
      { x: 430, y: 300, w: 100 },
    ],
    coins: [
      { x: 190, y: 310 },
      { x: 330, y: 270 },
      { x: 460, y: 260 },
    ],
    enemies: [],
    pipes: [],
    mushroomAt: 260,
  };
}

function makeFlat(rng, dens) {
  const w = 260 + randInt(rng, 0, 120);
  const coins = [];
  for (let i = 0; i < 2 + (dens > 0.4 ? 1 : 0); i++) {
    coins.push({ x: 50 + i * 70, y: 300 + randInt(rng, 0, 30) });
  }
  const enemies = [];
  if (dens > 0.25 && w > 220) {
    enemies.push({
      type: dens > 0.6 && rng() > 0.5 ? "turtle" : "mushroom",
      x: Math.floor(w * 0.6),
      range: 48,
      speed: 2.0,
    });
  }
  return {
    tag: "flat",
    width: w,
    ground: [{ x: 0, w }],
    air: rng() > 0.5 ? [{ x: randInt(rng, 30, Math.max(40, w - 90)), y: 340, w: 75 }] : [],
    coins,
    enemies,
    pipes: [],
  };
}

function makeGap(rng, dens, tier) {
  const left = 170 + randInt(rng, 0, 50);
  const gap = gapW(rng, tier);
  const right = 190 + randInt(rng, 0, 70);
  const w = left + gap + right;
  return {
    tag: "gap",
    width: w,
    ground: [
      { x: 0, w: left },
      { x: left + gap, w: right },
    ],
    air: [{ x: Math.max(20, left - 50), y: 330, w: 65 }],
    coins: [
      { x: left + gap * 0.5, y: 275 },
      { x: left + gap + 50, y: 300 },
    ],
    enemies:
      dens > 0.4
        ? [{ type: "mushroom", x: left + gap + 70, range: 42, speed: 2.05 }]
        : [],
    pipes: [],
  };
}

function makeIsland(rng, dens, tier) {
  const a = 150 + randInt(rng, 0, 40);
  const g1 = gapW(rng, tier);
  const mid = 85 + randInt(rng, 0, 25);
  const g2 = gapW(rng, tier);
  const b = 160 + randInt(rng, 0, 50);
  const w = a + g1 + mid + g2 + b;
  return {
    tag: "island",
    width: w,
    ground: [
      { x: 0, w: a },
      { x: a + g1, w: mid },
      { x: a + g1 + mid + g2, w: b },
    ],
    air: [],
    coins: [
      { x: a + g1 + mid * 0.5, y: 295 },
      { x: a + g1 + mid + g2 * 0.5, y: 285 },
    ],
    enemies:
      dens > 0.45
        ? [{ type: dens > 0.65 ? "turtle" : "mushroom", x: a + g1 + mid + g2 + 55, range: 40, speed: 2.1 }]
        : [],
    pipes: [],
  };
}

function makeStairs(rng, dens, up) {
  const w = 370;
  const air = up
    ? [
        { x: 50, y: 360, w: 70 },
        { x: 140, y: 320, w: 70 },
        { x: 230, y: 290, w: 80 },
      ]
    : [
        { x: 50, y: 290, w: 80 },
        { x: 150, y: 320, w: 70 },
        { x: 250, y: 350, w: 70 },
      ];
  return {
    tag: up ? "stairsUp" : "stairsDown",
    width: w,
    ground: [{ x: 0, w }],
    air,
    coins: air.map((p) => ({ x: p.x + 30, y: p.y - 38 })),
    enemies:
      dens > 0.4
        ? [{ type: dens > 0.6 ? "turtle" : "mushroom", x: w - 95, range: 38, speed: 2.0 }]
        : [],
    pipes: [],
  };
}

function makeSky(rng, dens, tier) {
  // 공중 징검다리: 바닥 간격은 넓지만, 발판 간격은 점프 가능 폭으로
  const left = 140;
  const right = 150;
  const hops = dens > 0.55 ? 4 : 3;
  const air = [];
  const coins = [];
  let cursor = left;
  for (let i = 0; i < hops; i++) {
    const stepGap = Math.min(gapW(rng, tier), tier === "hard" ? 100 : 88);
    cursor += stepGap;
    const py = 318 - (i % 2) * 26;
    air.push({ x: cursor - 32, y: py, w: 68 });
    coins.push({ x: cursor, y: py - 36 });
    cursor += 68;
  }
  const span = cursor - left;
  const w = left + span + right;
  return {
    tag: "sky",
    width: w,
    ground: [
      { x: 0, w: left },
      { x: left + span, w: right },
    ],
    air,
    coins,
    enemies:
      dens > 0.5
        ? [{ type: "mushroom", x: left + span + 55, range: 36, speed: 2.15 }]
        : [],
    pipes: [],
  };
}

function makePipe(rng, dens) {
  const w = 300 + randInt(rng, 0, 40);
  return {
    tag: "pipe",
    width: w,
    ground: [{ x: 0, w }],
    air: [{ x: 36, y: 340, w: 70 }],
    coins: [
      { x: 60, y: 300 },
      { x: w - 70, y: 300 },
    ],
    enemies:
      dens > 0.35
        ? [{ type: dens > 0.6 ? "turtle" : "mushroom", x: w - 90, range: 40, speed: 2.0 }]
        : [],
    pipes: [{ x: Math.floor(w / 2) - 26 }],
  };
}

function makeRest(rng) {
  const w = 210 + randInt(rng, 0, 40);
  return {
    tag: "rest",
    width: w,
    ground: [{ x: 0, w }],
    air: [],
    coins: [{ x: w * 0.5, y: 320 }],
    enemies: [],
    pipes: [],
  };
}

function makeReward(rng) {
  const w = 280;
  return {
    tag: "reward",
    width: w,
    ground: [{ x: 0, w }],
    air: [
      { x: 70, y: 330, w: 90 },
      { x: 150, y: 290, w: 85 },
    ],
    coins: [
      { x: 90, y: 290 },
      { x: 120, y: 290 },
      { x: 170, y: 250 },
      { x: 200, y: 250 },
      { x: 160, y: 250, blue: true },
    ],
    enemies: [],
    pipes: [],
    feather: true,
  };
}

function makeBossLead(rng) {
  return {
    tag: "bossLead",
    width: 460,
    ground: [{ x: 0, w: 460 }],
    air: [
      { x: 70, y: 350, w: 100 },
      { x: 200, y: 320, w: 90 },
      { x: 320, y: 300, w: 100 },
    ],
    coins: [
      { x: 100, y: 310 },
      { x: 230, y: 280 },
      { x: 350, y: 260 },
    ],
    enemies: [{ type: "mushroom", x: 180, range: 40, speed: 2.1 }],
    pipes: [],
  };
}

function makeBoss() {
  return {
    tag: "boss",
    width: 1000,
    ground: [{ x: 0, w: 1000 }],
    air: [
      { x: 140, y: 350, w: 160 },
      { x: 380, y: 320, w: 110 },
    ],
    coins: [],
    enemies: [],
    pipes: [],
  };
}

function weightedPool(name) {
  if (name === "1-3") {
    return [
      ["flat", 1],
      ["gap", 3],
      ["island", 3],
      ["stairs", 2],
      ["sky", 3],
      ["pipe", 1],
      ["rest", 1],
      ["reward", 1],
    ];
  }
  if (name === "1-2") {
    return [
      ["flat", 2],
      ["gap", 3],
      ["island", 2],
      ["stairs", 2],
      ["sky", 2],
      ["pipe", 2],
      ["rest", 2],
      ["reward", 2],
    ];
  }
  return [
    ["flat", 3],
    ["gap", 3],
    ["island", 1],
    ["stairs", 3],
    ["sky", 1],
    ["pipe", 2],
    ["rest", 2],
    ["reward", 2],
  ];
}

function pickKind(rng, pool) {
  let sum = 0;
  for (const [, w] of pool) sum += w;
  let r = rng() * sum;
  for (const [k, w] of pool) {
    r -= w;
    if (r <= 0) return k;
  }
  return pool[0][0];
}

function makeByKind(kind, rng, dens, tier) {
  switch (kind) {
    case "flat":
      return makeFlat(rng, dens);
    case "gap":
      return makeGap(rng, dens, tier);
    case "island":
      return makeIsland(rng, dens, tier);
    case "stairs":
      return makeStairs(rng, dens, rng() > 0.4);
    case "sky":
      return makeSky(rng, dens, tier);
    case "pipe":
      return makePipe(rng, dens);
    case "rest":
      return makeRest(rng);
    case "reward":
      return makeReward(rng);
    default:
      return makeFlat(rng, dens);
  }
}

/**
 * 리듬 규칙:
 * 시작 → (도전 후 숨고르기 선호) 중간 반복 → 보스 접근 → 보스
 * - 같은 태그 연속 금지
 * - 도전(gap/island/sky) 뒤에는 rest/flat
 * - pipe 최대 2, reward 최대 1
 */
function assembleChunks(rng, levelName) {
  const dens = densOf(levelName);
  const tier = tierOf(levelName);
  const pool = weightedPool(levelName);
  const chunks = [makeStart(rng)];

  let budget = WORLD_W - 1000 - 500;
  let used = chunks[0].width;
  let last = "start";
  let pipes = 0;
  let rewards = 0;
  let forceEasy = false;

  for (let i = 0; i < 36 && used < budget; i++) {
    let kind;
    if (forceEasy) {
      kind = rng() > 0.45 ? "rest" : "flat";
      forceEasy = false;
    } else {
      kind = pickKind(rng, pool);
      if (kind === "pipe" && pipes >= 2) kind = "gap";
      if (kind === "reward" && rewards >= 1) kind = "flat";
      if (kind === last) kind = "flat";
      if ((kind === "sky" || kind === "island") && (last === "sky" || last === "island")) {
        kind = "rest";
      }
    }

    const ch = makeByKind(kind, rng, dens, tier);
    if (ch.tag === "pipe") pipes++;
    if (ch.tag === "reward") rewards++;
    if (ch.tag === "gap" || ch.tag === "island" || ch.tag === "sky") forceEasy = true;

    chunks.push(ch);
    used += ch.width;
    last = ch.tag;
  }

  chunks.push(makeBossLead(rng));
  chunks.push(makeBoss());
  return chunks;
}

function sanitizeLayout(platforms, pits, rng) {
  // 바닥만 모아 정렬 후, 웅덩이 재계산
  const ground = platforms
    .filter((p) => p.y === GROUND_Y)
    .sort((a, b) => a.x - b.x);
  const air = platforms.filter((p) => p.y !== GROUND_Y);
  const newPits = [];
  const MAX_BARE = 122; // 발판 없이 뛰어넘을 최대 폭

  for (let i = 1; i < ground.length; i++) {
    const prev = ground[i - 1];
    const cur = ground[i];
    const gapStart = prev.x + prev.w;
    const gapEnd = cur.x;
    const gap = gapEnd - gapStart;
    if (gap <= 8) continue;

    const hasBridge = air.some(
      (a) => a.x + a.w > gapStart - 10 && a.x < gapEnd + 10 && a.y < GROUND_Y - 40
    );

    if (!hasBridge && gap > MAX_BARE) {
      // 너무 넓은 맨바닥 구멍 → 중간 섬으로 메워 플레이 가능하게
      const islandW = 90;
      const ix = gapStart + Math.floor((gap - islandW) / 2);
      ground.splice(i, 0, { x: ix, y: GROUND_Y, w: islandW, h: GROUND_H });
      // 다시 이 구간 검사
      i--;
      continue;
    }
    newPits.push({ x: gapStart, w: gap });
  }

  return {
    platforms: ground.concat(air),
    pits: newPits,
  };
}

function placeChunks(chunks, rng, level) {
  const theme = pickMapTheme(rng, level.levelIndex ?? 0);
  const platforms = [];
  const pits = [];
  const coins = [];
  const enemies = [];
  const pipeSlots = [];
  const mushroomCandidates = [];
  let featherX = 1100;
  let featherY = 240;
  let x0 = 0;
  let pipeN = 0;
  const speedMul = level.enemySpeedMul ?? 1;

  for (const ch of chunks) {
    // 청크 끝이 항상 바닥으로 닫히도록 보정
    const gs = [...ch.ground].sort((a, b) => a.x - b.x);
    const last = gs[gs.length - 1];
    if (last && last.x + last.w < ch.width - 1) {
      // trailing void → 연장 (의도된 끝 웅덩이 방지)
      last.w = ch.width - last.x;
    }

    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      platforms.push({ x: x0 + g.x, y: GROUND_Y, w: g.w, h: GROUND_H });
      if (i > 0) {
        const prev = gs[i - 1];
        const pitX = x0 + prev.x + prev.w;
        const pitW = g.x - (prev.x + prev.w);
        if (pitW > 8) pits.push({ x: pitX, w: pitW });
      }
    }
    for (const a of ch.air || []) {
      platforms.push({ x: x0 + a.x, y: a.y, w: a.w, h: 18 });
    }
    for (const c of ch.coins || []) {
      if (c.blue) coins.push([x0 + c.x, c.y, "blue"]);
      else coins.push([x0 + c.x, c.y]);
    }
    for (const e of ch.enemies || []) {
      enemies.push({
        type: e.type,
        x: x0 + e.x,
        range: e.range,
        speed: e.speed * speedMul,
      });
    }
    for (const p of ch.pipes || []) {
      if (pipeN >= 2) break;
      const isJump = pipeN === 0;
      pipeSlots.push({
        id: isJump ? "ow1" : "ow2",
        x: x0 + p.x,
        y: PIPE_Y,
        w: 52,
        h: 64,
        to: isJump ? "ug1" : "bg1",
        toWorld: isJump ? "underground" : "bonus",
        kind: isJump ? "jump" : "bonus",
      });
      pipeN++;
    }
    if (ch.mushroomAt != null) mushroomCandidates.push(x0 + ch.mushroomAt);
    if (ch.feather) {
      const a = ch.air?.[0] || { x: 80, y: 300 };
      featherX = x0 + a.x + 20;
      featherY = a.y - 50;
    }
    x0 += ch.width;
  }

  if (x0 < WORLD_W) {
    platforms.push({ x: x0, y: GROUND_Y, w: WORLD_W - x0, h: GROUND_H });
  }

  const fixed = sanitizeLayout(platforms, pits, rng);

  while (pipeSlots.length < 2) {
    const n = pipeSlots.length;
    pipeSlots.push({
      id: n === 0 ? "ow1" : "ow2",
      x: 900 + n * 1000,
      y: PIPE_Y,
      w: 52,
      h: 64,
      to: n === 0 ? "ug1" : "bg1",
      toWorld: n === 0 ? "underground" : "bonus",
      kind: n === 0 ? "jump" : "bonus",
    });
  }

  // 파이프 종류 고정: 1호=점프대 하수구, 2호=보너스 동전 하수구
  pipeSlots[0] = {
    ...pipeSlots[0],
    id: "ow1",
    to: "ug1",
    toWorld: "underground",
    kind: "jump",
  };
  pipeSlots[1] = {
    ...pipeSlots[1],
    id: "ow2",
    to: "bg1",
    toWorld: "bonus",
    kind: "bonus",
  };

  const wantE = level.enemyCount ?? 10;
  const wantC = level.coinCount ?? 12;
  const wantB = level.blueCoins ?? 3;
  while (enemies.length > wantE) enemies.pop();
  while (enemies.length < wantE) {
    const flats = fixed.platforms.filter((p) => p.y === GROUND_Y && p.w > 220 && p.x > 600 && p.x < WORLD_W - 1100);
    if (!flats.length) break;
    const g = pick(rng, flats);
    enemies.push({
      type: pickThemeEnemyType(rng, theme, level),
      x: g.x + randInt(rng, 50, Math.max(60, g.w - 50)),
      range: 44,
      speed: (1.95 + rng() * 0.45) * speedMul,
    });
  }

  // 청크·보충 적 모두 테마에 맞게 통일
  for (let i = 0; i < enemies.length; i++) {
    enemies[i] = {
      ...enemies[i],
      type: pickThemeEnemyType(rng, theme, level),
    };
  }

  let gold = coins.filter((c) => c.length === 2);
  let blue = coins.filter((c) => c.length === 3);
  while (gold.length > wantC) gold.pop();
  while (blue.length > wantB) blue.pop();
  while (gold.length < wantC) {
    const flats = fixed.platforms.filter((p) => p.y === GROUND_Y && p.w > 100);
    const g = pick(rng, flats);
    gold.push([g.x + randInt(rng, 20, g.w - 20), 290 + randInt(rng, 0, 40)]);
  }
  while (blue.length < wantB) {
    const airs = fixed.platforms.filter((p) => p.h === 18);
    const a = pick(rng, airs.length ? airs : fixed.platforms);
    blue.push([a.x + a.w / 2, a.y - 40, "blue"]);
  }

  // 스테이지당 파워버섯 정확히 2개
  const mushroomXs = [...mushroomCandidates];
  const flatsForMush = fixed.platforms.filter(
    (p) => p.y === GROUND_Y && p.w > 160 && p.x > 200 && p.x < WORLD_W - 900
  );
  while (mushroomXs.length < 2 && flatsForMush.length) {
    const g = pick(rng, flatsForMush);
    const mx = g.x + randInt(rng, 40, Math.max(50, g.w - 40));
    if (mushroomXs.every((x) => Math.abs(x - mx) > 280)) mushroomXs.push(mx);
    else if (mushroomXs.length === 0) mushroomXs.push(mx);
    else break;
  }
  while (mushroomXs.length < 2) {
    mushroomXs.push(400 + mushroomXs.length * 900);
  }

  // 요정 감옥: 스테이지 중간중간 3~4개
  const cages = [];
  const wantCages = 3 + (rng() < 0.5 ? 1 : 0);
  const flatsForCage = fixed.platforms.filter(
    (p) => p.y === GROUND_Y && p.w > 140 && p.x > 500 && p.x < WORLD_W - 800
  );
  const airsForCage = fixed.platforms.filter(
    (p) => p.h === 18 && p.w > 60 && p.x > 400 && p.x < WORLD_W - 700
  );
  let tries = 0;
  while (cages.length < wantCages && tries < 40) {
    tries++;
    const useAir = airsForCage.length && rng() < 0.45;
    const pool = useAir ? airsForCage : flatsForCage;
    if (!pool.length) break;
    const g = pick(rng, pool);
    const cx = g.x + randInt(rng, 24, Math.max(30, g.w - 24));
    const cy = useAir ? g.y - 44 : g.y - 52;
    if (cages.every((c) => Math.abs(c.x - cx) > 420)) {
      cages.push({ x: cx, y: cy, hue: Math.floor(rng() * 360) });
    }
  }
  while (cages.length < 3) {
    cages.push({
      x: 700 + cages.length * 1100,
      y: GROUND_Y - 52,
      hue: (cages.length * 90) % 360,
    });
  }

  // 점프 장애물 중 1곳 — 테마별 특수 구덩이 (물/용암)
  const jumpable = fixed.pits.filter((p) => p.w >= 70 && p.w <= 140 && p.x > 600 && p.x < WORLD_W - 900);
  let waterPit = null;
  let specialPit = null;
  if (jumpable.length) {
    specialPit = pick(rng, jumpable);
  } else if (fixed.pits.length) {
    const mid = fixed.pits.filter((p) => p.x > 800 && p.x < WORLD_W - 1000);
    specialPit = pick(rng, mid.length ? mid : fixed.pits);
    if (specialPit.w > 120) specialPit.w = randInt(rng, 85, 115);
  }
  if (specialPit) {
    if (theme.pitDefault === "lava") {
      specialPit.lava = true;
    } else if (theme.pitDefault === "water" || theme.id === "beach" || theme.id === "grass") {
      specialPit.water = true;
      waterPit = specialPit;
    } else if (rng() < 0.55) {
      specialPit.water = true;
      waterPit = specialPit;
    }
  }

  return {
    worldW: WORLD_W,
    theme,
    platforms: fixed.platforms,
    pits: fixed.pits,
    pipes: pipeSlots.slice(0, 2),
    coins: gold.concat(blue),
    enemies,
    mushroomXs: mushroomXs.slice(0, 2),
    mushroomX: mushroomXs[0],
    featherX,
    featherY,
    bossX: Math.min(WORLD_W - 520, WORLD_W - 650),
    cages,
    waterPitX: waterPit ? waterPit.x + waterPit.w / 2 : null,
  };
}

/**
 * 하수구 내부 생성 (로그라이크)
 * @param {'jump'|'bonus'} kind
 */
export function generateUnderground(rng, kind = "jump") {
  const W = UNDERGROUND_W;
  const platforms = [{ x: 0, y: GROUND_Y, w: W, h: GROUND_H }];
  const coins = [];

  if (kind === "bonus") {
    // 보너스: 동전 금고 + 가벼운 발판
    for (let i = 0; i < 5; i++) {
      platforms.push({
        x: 140 + i * 240 + randInt(rng, 0, 50),
        y: 260 + randInt(rng, 0, 80),
        w: randInt(rng, 90, 150),
        h: 18,
      });
    }
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 16; col++) {
        if (rng() < 0.12) continue;
        coins.push([
          70 + col * 78 + (row % 2) * 24,
          100 + row * 48 + randInt(rng, -6, 6),
        ]);
      }
    }
  } else {
    // 점프대: 계단형 발판 루트
    let x = 70;
    let y = 350;
    let step = 0;
    while (x < W - 220) {
      const pw = randInt(rng, 72, 128);
      platforms.push({ x, y, w: pw, h: 18 });
      if (rng() < 0.7) coins.push([x + pw / 2, y - 34]);
      if (rng() < 0.35 && step % 2 === 1) {
        coins.push([x + 20, y - 70]);
        coins.push([x + pw - 20, y - 70]);
      }
      x += pw + randInt(rng, 36, 88);
      y = Math.max(210, Math.min(380, y + randInt(rng, -55, 35)));
      step++;
    }
    // 중간 높이 코인 라인
    for (let i = 0; i < 8; i++) {
      coins.push([180 + i * 140 + randInt(rng, 0, 30), 180 + randInt(rng, 0, 40)]);
    }
  }

  const entryPipe = { x: 100, y: PIPE_Y, w: 52, h: 64 };
  const exitPipe = { x: W - 160, y: PIPE_Y, w: 52, h: 64 };

  return { worldW: W, platforms, coins, entryPipe, exitPipe, kind };
}

/**
 * 물속 세상 (로그라이크)
 * — 물고기·수초·조개(진주 1)·공기방울
 */
export function generateUnderwater(rng) {
  const W = UNDERWATER_W;
  const platforms = [{ x: 0, y: GROUND_Y, w: W, h: GROUND_H }];
  const coins = [];
  const kelp = [];
  const fish = [];
  const clams = [];
  const bubbles = [];

  // 해저 언덕 / 바위 발판
  let x = 60;
  while (x < W - 180) {
    const pw = randInt(rng, 80, 160);
    const py = randInt(rng, 260, 390);
    platforms.push({ x, y: py, w: pw, h: 18 });
    if (rng() < 0.55) coins.push([x + pw / 2, py - 36]);
    x += pw + randInt(rng, 50, 120);
  }

  // 수초
  for (let i = 0; i < 18; i++) {
    kelp.push({
      x: 40 + i * 85 + randInt(rng, 0, 40),
      y: GROUND_Y,
      h: randInt(rng, 50, 120),
      sway: rng() * Math.PI * 2,
    });
  }

  // 물고기
  for (let i = 0; i < 10; i++) {
    fish.push({
      x: randInt(rng, 120, W - 120),
      y: randInt(rng, 80, 360),
      dir: rng() < 0.5 ? 1 : -1,
      speed: 1.2 + rng() * 1.4,
      amp: 18 + rng() * 30,
      phase: rng() * Math.PI * 2,
      color: pick(rng, ["#f97316", "#38bdf8", "#a78bfa", "#f472b6"]),
    });
  }

  // 조개 (바닥) — 하나 진주
  const clamCount = 5 + randInt(rng, 0, 2);
  const pearlIdx = randInt(rng, 0, clamCount - 1);
  for (let i = 0; i < clamCount; i++) {
    clams.push({
      x: 180 + i * ((W - 360) / Math.max(1, clamCount - 1)) + randInt(rng, -30, 30),
      y: GROUND_Y - 22,
      hasPearl: i === pearlIdx,
    });
  }

  // 공기방울
  for (let i = 0; i < 12; i++) {
    bubbles.push({
      x: randInt(rng, 80, W - 80),
      y: randInt(rng, 200, 420),
      r: randInt(rng, 14, 28),
      speed: 0.4 + rng() * 0.7,
      phase: rng() * Math.PI * 2,
    });
  }

  const exitPipe = { x: W - 150, y: PIPE_Y, w: 52, h: 64 };

  return { worldW: W, platforms, coins, kelp, fish, clams, bubbles, exitPipe };
}

export function generateOverworld(rng, level = {}) {
  const name = level.name || "1-1";
  const chunks = assembleChunks(rng, name);
  return placeChunks(chunks, rng, level);
}
