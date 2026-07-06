/**
 * 원본 onefile HTML → public/games/[slug]/ 복사
 * node scripts/sync-games.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.join(__dirname, '..');
const GAME_ROOT = path.join(WEB_ROOT, '..');
const PUBLIC_GAMES = path.join(WEB_ROOT, 'public', 'games');

const games = JSON.parse(
  fs.readFileSync(path.join(WEB_ROOT, 'src', 'data', 'games.json'), 'utf8')
);

let copied = 0;
let missing = 0;
const isCI = process.env.VERCEL === '1' || process.env.CI === 'true';

for (const game of games) {
  const src = path.join(GAME_ROOT, game.source);
  if (!fs.existsSync(src)) {
    missing++;
    console.error(`[missing] ${game.source}`);
    continue;
  }
  const destDir = path.join(PUBLIC_GAMES, game.slug);
  fs.mkdirSync(destDir, { recursive: true });
  const html = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(path.join(destDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(destDir, game.downloadName), html, 'utf8');
  copied++;
  console.log(`  ${game.slug} ← ${game.source}`);
}

console.log(`\nSynced ${copied}/${games.length} games → public/games/`);

if (missing > 0 && isCI) {
  console.error('\nBuild failed: game HTML sources must be committed at repo root (onefile_multi_*/)');
  process.exit(1);
}
