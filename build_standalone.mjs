/**
 * 단일 HTML 파일(블로그 배포용) 생성
 * node build_standalone.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

function buildSoloHtml() {
  let solo = read('ww_mvp2.html');
  solo = solo.replace(
    '<script src="./pretext.js"></script>',
    `<script>\n${read('pretext.js')}\n</script>`
  );
  return solo;
}

let html = read('index.html');
const soloHtml = buildSoloHtml();
const soloB64 = Buffer.from(soloHtml, 'utf8').toString('base64');
const inline = [
  'window.WW_STANDALONE = true;',
  `window.WW_SOLO_B64 = ${JSON.stringify(soloB64)};`,
  read('ww_words.js'),
  read('hangul_input.js'),
  read('pretext.js'),
  read('ww_net.js'),
  read('ww_multi.js')
].join('\n');

const scriptBlock =
  /<script src="\.\/ww_words\.js"><\/script>\s*<script src="\.\/hangul_input\.js"><\/script>\s*<script src="https:\/\/unpkg.com\/peerjs@1\.5\.4\/dist\/peerjs\.min\.js"><\/script>\s*<script src="\.\/pretext\.js"><\/script>\s*<script src="\.\/ww_net\.js"><\/script>\s*<script src="\.\/ww_multi\.js"><\/script>/;

if (!scriptBlock.test(html)) {
  console.error('build_standalone: index.html 스크립트 태그 패턴 불일치 — index.html을 확인하세요.');
  process.exit(1);
}

html = html.replace(
  scriptBlock,
  `<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>\n<script>\n${inline}\n</script>`
);

html = html.replace(
  '<title>Word Wizard</title>',
  '<title>Word Wizard — 단일 파일</title>'
);

const out = path.join(__dirname, 'ww_onefile.html');
fs.writeFileSync(out, html, 'utf8');

const built = fs.readFileSync(out, 'utf8');
const checks = [
  ["bindClick('btnJoin'", 'btnJoin 리스너'],
  ['WW_SOLO_B64', '솔로 HTML 내장'],
  ["getElementById('btnVersusHost')", '구버전 btnVersusHost', true]
];
for (const [needle, label, shouldAbsent] of checks) {
  const found = built.includes(needle);
  if (shouldAbsent ? found : !found) {
    console.error(`build 검증 실패: ${label}`);
    process.exit(1);
  }
}

console.log('Built:', out, '(' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
