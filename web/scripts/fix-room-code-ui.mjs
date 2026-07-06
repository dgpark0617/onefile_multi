/**
 * HTTPS(배포)에서도 방 코드 입력 UI가 보이도록 USE_ROOM_CODE 통일
 * node web/scripts/fix-room-code-ui.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GAME_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

let count = 0;
for (const file of walk(GAME_ROOT)) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;

  s = s.replace(
    /const USE_ROOM_CODE = IS_FILE \|\| window\.WW_STANDALONE;/g,
    'const USE_ROOM_CODE = true;'
  );
  s = s.replace(/const USE_ROOM_CODE = IS_FILE;/g, 'const USE_ROOM_CODE = true;');
  s = s.replace(
    /class="mode-block hidden" id="joinPanel"/g,
    'class="mode-block" id="joinPanel"'
  );
  s = s.replace(/if \(USE_ROOM_CODE\) return;\r?\n(\s*const join = new URLSearchParams)/g, '$1');
  s = s.replace(/if \(USE_ROOM_CODE\) return;\r?\n(\s*const joinParam = new URLSearchParams)/g, '$1');
  s = s.replace(
    /document\.getElementById\('joinPanel'\)\.classList\.toggle\('hidden', !USE_ROOM_CODE\);/g,
    "document.getElementById('joinPanel').classList.remove('hidden');"
  );

  if (
    file.includes('infinitestairs') &&
    !s.includes("joinPanel.classList.remove('hidden')") &&
    s.includes('const joinParam = new URLSearchParams')
  ) {
    s = s.replace(
      /const joinParam = new URLSearchParams/,
      "joinPanel.classList.remove('hidden');\n\n  const joinParam = new URLSearchParams"
    );
  }

  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    count++;
    console.log('updated', path.relative(GAME_ROOT, file));
  }
}

console.log(`\nDone: ${count} file(s)`);
