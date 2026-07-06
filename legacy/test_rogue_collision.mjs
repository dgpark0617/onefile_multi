/** v5 — floor(x),floor(y) 타일 walkable (턴제와 동일) */
const MAP_W = 25, MAP_H = 17;
const PLAYER_SPEED = 4.8;
const MOB_SPEED = 2.4;
const TILE = { WALL: 0, FLOOR: 1, DOOR: 2 };

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function roomsOverlap(a, b, pad) {
  return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x ||
           a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);
}
function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y++)
    for (let x = room.x; x < room.x + room.w; x++) map[y][x] = TILE.FLOOR;
}
function carveH(map, x1, x2, y, width = 3) {
  const xMin = Math.min(x1, x2), xMax = Math.max(x1, x2);
  for (let t = 0; t < width; t++) {
    const yy = y + t;
    if (yy < 0 || yy >= map.length) continue;
    for (let x = xMin; x <= xMax; x++)
      if (x >= 0 && x < map[0].length) map[yy][x] = TILE.FLOOR;
  }
}
function carveV(map, y1, y2, x, width = 3) {
  const yMin = Math.min(y1, y2), yMax = Math.max(y1, y2);
  for (let t = 0; t < width; t++) {
    const xx = x + t;
    if (xx < 0 || xx >= map[0].length) continue;
    for (let y = yMin; y <= yMax; y++)
      if (y >= 0 && y < map.length) map[y][xx] = TILE.FLOOR;
  }
}
function carveBlob(map, cx, cy, w, h) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < map[0].length && y < map.length) map[y][x] = TILE.FLOOR;
    }
}
function connectRooms(map, a, b, rnd) {
  if (rnd() < 0.5) {
    carveH(map, a.cx, b.cx, a.cy); carveV(map, a.cy, b.cy, b.cx);
    carveBlob(map, b.cx, a.cy, 3, 3);
  } else {
    carveV(map, a.cy, b.cy, a.cx); carveH(map, a.cx, b.cx, b.cy);
    carveBlob(map, a.cx, b.cy, 3, 3);
  }
}
function buildRandomDungeon(w, h, targetRooms, rnd) {
  const map = Array.from({ length: h }, () => Array(w).fill(TILE.WALL));
  const rooms = [];
  for (let attempt = 0; attempt < 120 && rooms.length < targetRooms; attempt++) {
    const rw = 4 + Math.floor(rnd() * 5), rh = 3 + Math.floor(rnd() * 4);
    const rx = 1 + Math.floor(rnd() * (w - rw - 2)), ry = 1 + Math.floor(rnd() * (h - rh - 2));
    const room = { x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) };
    if (rooms.some(r => roomsOverlap(r, room, 1))) continue;
    carveRoom(map, room);
    if (rooms.length) connectRooms(map, rooms[rooms.length - 1], room, rnd);
    rooms.push(room);
  }
  return { map, rooms };
}

function tileWalkable(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  const t = map[ty][tx];
  return t === TILE.FLOOR || t === TILE.DOOR;
}
function onWalkableTile(map, x, y) {
  return tileWalkable(map, Math.floor(x), Math.floor(y));
}
function moveSmooth(map, x, y, vx, vy, dt) {
  const ox = x, oy = y;
  let nx = x, ny = y;
  const dx = vx * dt, dy = vy * dt;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-8) return { x, y };
  const steps = Math.max(1, Math.ceil(dist / 0.03));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const tx = ox + dx * t, ty = oy + dy * t;
    let sx = nx;
    if (onWalkableTile(map, tx, ny)) sx = tx;
    let sy = ny;
    if (onWalkableTile(map, sx, ty)) sy = ty;
    if (sx === nx && sy === ny) break;
    nx = sx; ny = sy;
  }
  return onWalkableTile(map, nx, ny) ? { x: nx, y: ny } : { x: ox, y: oy };
}

function auditMap(map) {
  let bad = 0;
  const dt = 1 / 60;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (!tileWalkable(map, tx, ty)) continue;
      const cx = tx + 0.5, cy = ty + 0.5;
      for (const [dx, dy] of dirs) {
        for (let f = 0; f < 120; f++) {
          const m = moveSmooth(map, cx, cy, dx * PLAYER_SPEED, dy * PLAYER_SPEED, dt);
          if (!onWalkableTile(map, m.x, m.y)) bad++;
        }
      }
    }
  }
  return bad;
}

let fails = 0;
for (let seed = 1; seed <= 500; seed++) {
  const rnd = mulberry32(seed);
  const { map } = buildRandomDungeon(MAP_W, MAP_H, 7, rnd);
  const bad = auditMap(map);
  if (bad > 0) { fails++; if (fails <= 3) console.log('FAIL seed', seed, 'violations', bad); }
}
console.log('=== v5 tile-floor audit (500 seeds x 120 frames x 8 dirs) ===');
console.log('Failed seeds:', fails, '/ 500');
console.log(fails === 0 ? 'ALL PASS' : 'HAS FAILURES');

// 벽 타일 중심에 있으면 무조건 fail
let wallCenterOk = true;
const { map: m0 } = buildRandomDungeon(MAP_W, MAP_H, 7, mulberry32(1));
for (let ty = 0; ty < MAP_H; ty++) {
  for (let tx = 0; tx < MAP_W; tx++) {
    if (tileWalkable(m0, tx, ty)) continue;
    if (onWalkableTile(m0, tx + 0.5, ty + 0.5)) wallCenterOk = false;
  }
}
console.log('Wall tile centers blocked:', wallCenterOk ? 'OK' : 'FAIL');
