/**
 * 컷톡 캐릭터 팩 SVG 생성 — npm run gen:cuttok-packs
 * 프레임 가이드: src/lib/comicchat/frameGuide.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'cuttok', 'packs');

const FRAMES = [
  'idle',
  'neutral',
  'happy',
  'laugh',
  'angry',
  'sad',
  'surprise',
  'shy',
  'cool',
  'love',
  'think',
  'wave',
  'shrug',
  'fist',
  'facepalm',
  'heart',
  'point',
  'cheer',
];

/** @typedef {{ id: string, name: string, skin: string, shirt: string, pants: string, hair: string, hairStyle: 'none'|'bob'|'spike'|'ponytail'|'cap', accent: string }} PackDef */

/** @type {PackDef[]} */
const PACKS = [
  {
    id: 'ink',
    name: '잉크',
    skin: '#ffcba4',
    shirt: '#3b82f6',
    pants: '#1e40af',
    hair: '#1e293b',
    hairStyle: 'none',
    accent: '#2563eb',
  },
  {
    id: 'brush',
    name: '붓',
    skin: '#ffcba4',
    shirt: '#ea580c',
    pants: '#7c2d12',
    hair: '#422006',
    hairStyle: 'spike',
    accent: '#f97316',
  },
  {
    id: 'dot',
    name: '점',
    skin: '#ffcba4',
    shirt: '#ec4899',
    pants: '#9d174d',
    hair: '#831843',
    hairStyle: 'bob',
    accent: '#f472b6',
  },
  {
    id: 'frame',
    name: '칸',
    skin: '#ffcba4',
    shirt: '#22c55e',
    pants: '#166534',
    hair: '#14532d',
    hairStyle: 'cap',
    accent: '#16a34a',
  },
];

/** @param {PackDef} p @param {string} frame */
function drawSvg(p, frame) {
  const mouth = mouthPath(frame);
  const eyes = eyeShape(frame);
  const brows = browPath(frame);
  const arms = armPaths(frame);
  const hair = hairPaths(p, frame);
  const acc = frame === 'heart' ? heartAcc() : frame === 'point' ? '' : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 168" width="120" height="168">
  <defs>
    <filter id="sh" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g filter="url(#sh)" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- 다리 (오른쪽 향함) -->
    <path d="M52 128 L46 158" stroke-width="5" fill="none"/>
    <path d="M68 128 L74 158" stroke-width="5" fill="none"/>
    <ellipse cx="46" cy="160" rx="9" ry="4" fill="${p.pants}" stroke-width="2"/>
    <ellipse cx="74" cy="160" rx="9" ry="4" fill="${p.pants}" stroke-width="2"/>
    <!-- 몸 -->
    <ellipse cx="60" cy="108" rx="26" ry="32" fill="${p.shirt}"/>
    <path d="M38 98 L38 118 L82 118 L82 98" fill="${p.pants}" stroke-width="2"/>
    <!-- 팔 -->
    ${arms}
    <!-- 머리 -->
    <circle cx="60" cy="52" r="24" fill="${p.skin}" stroke-width="2.5"/>
    ${hair}
    <!-- 눈 -->
    ${eyes}
    ${brows}
    ${mouth}
    ${acc}
    ${p.hairStyle === 'cap' ? `<path d="M34 48 Q60 22 86 48 L82 54 Q60 34 38 54 Z" fill="${p.accent}" stroke-width="2"/>` : ''}
  </g>
</svg>`;
}

/** @param {string} frame */
function mouthPath(frame) {
  const map = {
    idle: 'M48 58 Q60 66 72 58',
    neutral: 'M48 58 Q60 66 72 58',
    happy: 'M46 56 Q60 70 74 56',
    laugh: 'M44 56 Q60 74 76 56',
    angry: 'M48 62 Q60 56 72 62',
    sad: 'M48 64 Q60 58 72 64',
    surprise: 'M54 56 Q60 68 66 56 Q60 72 54 56',
    shy: 'M50 60 Q60 64 70 60',
    cool: 'M48 62 L72 62',
    love: 'M46 58 Q60 68 74 58',
    think: 'M52 60 Q60 64 68 58',
    wave: 'M46 56 Q60 70 74 56',
    shrug: 'M48 60 Q60 64 72 60',
    fist: 'M48 62 Q60 56 72 62',
    facepalm: 'M48 64 Q60 58 72 64',
    heart: 'M46 58 Q60 68 74 58',
    point: 'M48 60 L72 60',
    cheer: 'M44 56 Q60 74 76 56',
  };
  const d = map[frame] || map.idle;
  const fill =
    frame === 'surprise' || frame === 'laugh'
      ? ' fill="#1a1a1a" stroke="none"'
      : ' fill="none" stroke-width="2.5"';
  return `<path d="${d}"${fill}/>`;
}

/** @param {string} frame */
function eyeShape(frame) {
  const laugh = frame === 'laugh';
  const surprise = frame === 'surprise';
  const cool = frame === 'cool';
  const ry = laugh ? 1.5 : surprise ? 7 : cool ? 2 : 5;
  const rx = surprise ? 5 : 4;
  return `<ellipse cx="50" cy="48" rx="${rx}" ry="${ry}" fill="#1a1a1a" stroke="none"/>
<ellipse cx="70" cy="48" rx="${rx}" ry="${ry}" fill="#1a1a1a" stroke="none"/>`;
}

/** @param {string} frame */
function browPath(frame) {
  if (frame === 'angry' || frame === 'fist') {
    return `<path d="M42 38 L52 34" stroke-width="2" fill="none"/><path d="M78 38 L68 34" stroke-width="2" fill="none"/>`;
  }
  if (frame === 'sad' || frame === 'facepalm') {
    return `<path d="M42 36 L52 42" stroke-width="2" fill="none"/><path d="M78 36 L68 42" stroke-width="2" fill="none"/>`;
  }
  return '';
}

/** @param {string} frame */
function armPaths(frame) {
  const skin = '#ffcba4';
  if (frame === 'wave' || frame === 'cheer') {
    return `<path d="M34 96 Q18 78 22 58" stroke-width="4.5" fill="none" stroke="${skin}"/>
<circle cx="22" cy="56" r="5" fill="${skin}" stroke-width="2"/>
<path d="M86 96 Q92 110 88 124" stroke-width="4.5" fill="none" stroke="${skin}"/>
<circle cx="88" cy="126" r="5" fill="${skin}" stroke-width="2"/>`;
  }
  if (frame === 'point') {
    return `<path d="M34 96 Q20 88 14 72" stroke-width="4.5" fill="none" stroke="${skin}"/>
<circle cx="14" cy="70" r="5" fill="${skin}" stroke-width="2"/>
<path d="M86 96 Q100 90 108 76" stroke-width="4.5" fill="none" stroke="${skin}"/>
<circle cx="110" cy="74" r="5" fill="${skin}" stroke-width="2"/>`;
  }
  if (frame === 'heart') {
    return `<path d="M34 98 Q28 88 34 82" stroke-width="4" fill="none" stroke="${skin}"/>
<path d="M86 98 Q92 88 86 82" stroke-width="4" fill="none" stroke="${skin}"/>
<path d="M52 102 Q60 92 68 102 Q60 112 52 102" fill="#ec4899" stroke-width="1.5"/>`;
  }
  if (frame === 'facepalm') {
    return `<path d="M34 96 Q28 72 48 52" stroke-width="4.5" fill="none" stroke="${skin}"/>
<circle cx="50" cy="50" r="5" fill="${skin}" stroke-width="2"/>
<path d="M86 96 Q92 110 88 124" stroke-width="4.5" fill="none" stroke="${skin}"/>`;
  }
  if (frame === 'shrug') {
    return `<path d="M32 92 Q24 78 28 68" stroke-width="4.5" fill="none" stroke="${skin}"/>
<path d="M88 92 Q96 78 92 68" stroke-width="4.5" fill="none" stroke="${skin}"/>`;
  }
  if (frame === 'think') {
    return `<path d="M34 96 Q26 84 30 74" stroke-width="4.5" fill="none" stroke="${skin}"/>
<circle cx="30" cy="72" r="5" fill="${skin}" stroke-width="2"/>
<path d="M86 96 Q94 82 90 68" stroke-width="4.5" fill="none" stroke="${skin}"/>`;
  }
  return `<path d="M34 96 Q22 108 18 124" stroke-width="4.5" fill="none" stroke="${skin}"/>
<circle cx="18" cy="126" r="5" fill="${skin}" stroke-width="2"/>
<path d="M86 96 Q98 108 102 124" stroke-width="4.5" fill="none" stroke="${skin}"/>
<circle cx="102" cy="126" r="5" fill="${skin}" stroke-width="2"/>`;
}

/** @param {PackDef} p @param {string} frame */
function hairPaths(p, frame) {
  const h = p.hair;
  if (p.hairStyle === 'none') return '';
  if (p.hairStyle === 'spike') {
    return `<path d="M36 52 L42 28 L50 44 L58 24 L66 44 L74 28 L80 52 Q60 38 36 52 Z" fill="${h}" stroke-width="2"/>`;
  }
  if (p.hairStyle === 'bob') {
    return `<path d="M36 54 Q38 32 60 30 Q82 32 84 54 Q60 42 36 54 Z" fill="${h}" stroke-width="2"/>
<ellipse cx="82" cy="58" rx="6" ry="10" fill="${p.accent}" stroke-width="1.5"/>`;
  }
  if (p.hairStyle === 'ponytail') {
    return `<path d="M36 54 Q38 32 60 30 Q82 32 84 54 Q60 42 36 54 Z" fill="${h}" stroke-width="2"/>`;
  }
  return `<path d="M36 50 Q60 28 84 50 Q60 38 36 50 Z" fill="${h}" stroke-width="2"/>`;
}

function heartAcc() {
  return '';
}

for (const pack of PACKS) {
  const dir = path.join(OUT, pack.id);
  const manifestPath = path.join(dir, 'pack.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (existing.external) {
        console.log(`skip ${pack.id} (external art pack)`);
        continue;
      }
    } catch {
      /* rewrite */
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  const frames = {};
  for (const frame of FRAMES) {
    const file = `${frame}.svg`;
    fs.writeFileSync(path.join(dir, file), drawSvg(pack, frame), 'utf8');
    frames[frame] = file;
  }
  const manifest = {
    id: pack.id,
    name: pack.name,
    version: 1,
    facing: 'right',
    flipForLeft: true,
    kind: 'sprite',
    fallback: 'idle.svg',
    frames,
  };
  fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`pack ${pack.id}: ${FRAMES.length} frames`);
}

console.log('done ->', OUT);
