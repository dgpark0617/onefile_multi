import fs from 'fs';

const soloHtml = fs.readFileSync('_solo_extract.html', 'utf8');
const onefile = fs.readFileSync('ww_onefile.html', 'utf8');

const script2 = soloHtml.split(/<\/script>\s*/i).find(p => p.includes('const GAME_CONFIG'));
const src = script2.replace(/^<script>\s*/i, '');

const cfgMatch = src.match(/const GAME_CONFIG = \{[\s\S]*?\};\n/);
const gameConfigBlock = cfgMatch[0];

// Inner IIFE body: from canvas to end of draw(), before auto-init input/loop
const innerMatch = src.match(/\(function\(\)\{\s*([\s\S]*)\s*updateWaveHud\(\);\s*\n\s*updatePlayerHud\(\);\s*\n\s*loop\(\);\s*\n\}\)\(\);/);
if (!innerMatch) {
  console.error('inner body not found');
  process.exit(1);
}
let body = innerMatch[1];

// DOM id renames for coop coexistence
body = body.replace(/getElementById\('waveVal'\)/g, "getElementById('soloWaveVal')");
body = body.replace(/getElementById\('killVal'\)/g, "getElementById('soloKillVal')");
body = body.replace(/getElementById\('killTargetVal'\)/g, "getElementById('soloKillTargetVal')");
body = body.replace(/getElementById\('btnRetry'\)/g, "getElementById('btnSoloRetry')");

// Shared Hangul engine
body = body.replace(
  /\/\* ═+[\s\S]*?§ INPUT — QWERTY[\s\S]*?const HangulInput = \(function\(\)[\s\S]*?return \{ inputJamo, backspace, commitCompose, commitSpace, getDisplayText, flushAndGet, resetCompose \};\s*\}\)\(\);\s*\n/,
  `  const KEY_TO_JAMO = HangulInputEngine.KEY_TO_JAMO;
  const inputBufferRef = {
    get value() { return state.inputBuffer; },
    set value(v) { state.inputBuffer = v; }
  };
  let HangulInput = HangulInputEngine.createHangul(inputBufferRef);
  function resetHangulInput() {
    HangulInput = HangulInputEngine.createHangul(inputBufferRef);
  }

`
);

body = body.replace(
  /function clearBuffer\(\) \{\s*state\.inputBuffer = "";\s*HangulInput\.resetCompose\(\);/,
  'function clearBuffer() {\n    state.inputBuffer = "";\n    resetHangulInput();'
);

// Remove init-time resize listener
body = body.replace(/\s*window\.addEventListener\('resize', resize\);\s*\n\s*resize\(\);/, '');

// Remove applyConfigToHud() immediate call
body = body.replace(/\n\s*applyConfigToHud\(\);\s*\n\s*\/\* ═+[\s\S]*?§ DISPLAY/, '\n\n  /* ═══════════════════════════════════════════════════════════════════════════\n     § DISPLAY');

body = body.replace(/\n\s*buildKeyboard\(\);\s*\n\s*function inputBlocked/, '\n\n  function inputBlocked');

const kbLayout = `const SOLO_KB_LAYOUT = [
  [
    { code:'q', en:'Q', ko:'ㅂ' }, { code:'w', en:'W', ko:'ㅈ' }, { code:'e', en:'E', ko:'ㄷ' },
    { code:'r', en:'R', ko:'ㄱ' }, { code:'t', en:'T', ko:'ㅅ' }, { code:'y', en:'Y', ko:'ㅛ' },
    { code:'u', en:'U', ko:'ㅕ' }, { code:'i', en:'I', ko:'ㅑ' }, { code:'o', en:'O', ko:'ㅐ' },
    { code:'p', en:'P', ko:'ㅔ' },
    { code:'Backspace', en:'⌫', ko:'', mod:true, wide:'w15' }
  ],
  [
    { code:'a', en:'A', ko:'ㅁ' }, { code:'s', en:'S', ko:'ㄴ' }, { code:'d', en:'D', ko:'ㅇ' },
    { code:'f', en:'F', ko:'ㄹ' }, { code:'g', en:'G', ko:'ㅎ' }, { code:'h', en:'H', ko:'ㅗ' },
    { code:'j', en:'J', ko:'ㅓ' }, { code:'k', en:'K', ko:'ㅏ' }, { code:'l', en:'L', ko:'ㅣ' }
  ],
  [
    { code:'z', en:'Z', ko:'ㅋ' }, { code:'x', en:'X', ko:'ㅌ' }, { code:'c', en:'C', ko:'ㅊ' },
    { code:'v', en:'V', ko:'ㅍ' }, { code:'b', en:'B', ko:'ㅠ' }, { code:'n', en:'N', ko:'ㅜ' },
    { code:'m', en:'M', ko:'ㅡ' },
    { code:'Enter', en:'Enter', ko:'발사', enter:true, wide:'w2' }
  ],
  [
    { code:'Escape', en:'Esc', ko:'', mod:true, wide:'w15' },
    { code:'Shift', en:'⇧', ko:'', mod:true, wide:'w15' },
    { code:'Space', en:'Space', ko:'', mod:true, wide:'w2' }
  ]
];
`;

body = body.replace(/KB_LAYOUT\.forEach/g, 'SOLO_KB_LAYOUT.forEach');
body = body.replace(/const KB_LAYOUT = \[[\s\S]*?\];\s*\n\s*const KEY_TO_JAMO = HangulInputEngine/, 'const KEY_TO_JAMO = HangulInputEngine');
// If KB_LAYOUT still in body from failed replace, remove it
body = body.replace(/const KB_LAYOUT = \[[\s\S]*?\];\s*\n/, '');

const soloModule = `/* ═══ 솔로 모드 — GAME_CONFIG만 수정하면 됩니다 ═══ */
${gameConfigBlock}
const WW_WORD_POOL = GAME_CONFIG.fallingWords;
if (typeof window !== 'undefined') window.WW_WORD_POOL = WW_WORD_POOL;

${kbLayout}
const SoloGame = (function () {
${body}
  let running = false;
  let rafId = 0;
  let soloEventsBound = false;

  function onSoloKeydown(e) {
    if (!running || inputBlocked()) return;
    if (e.repeat) return;
    const code = e.code === 'Space' ? 'Space'
      : e.code === 'Enter' ? 'Enter'
      : e.code === 'Backspace' ? 'Backspace'
      : e.code === 'Escape' ? 'Escape'
      : e.key.length === 1 ? e.key : null;
    if (!code) return;
    if (code === 'Enter' || code === 'Backspace' || code === 'Escape' || code === 'Space'
      || KEY_TO_JAMO[e.key] || KEY_TO_JAMO[e.key.toLowerCase()]) {
      e.preventDefault();
      handleKeyAction(code, e.shiftKey);
      flashKey(code === 'Space' ? 'Space' : code.length === 1 ? code.toLowerCase() : code);
    }
  }

  function bindSoloEventsOnce() {
    if (soloEventsBound) return;
    soloEventsBound = true;
    bindKeyboardInput();
    document.addEventListener('keydown', onSoloKeydown);
    document.getElementById('btnSoloRetry').addEventListener('click', resetGame);
    window.addEventListener('resize', resize);
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(2.5, (now - lastFrameTs) / (1000 / 60));
    lastFrameTs = now;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    bindSoloEventsOnce();
    applyConfigToHud();
    resetGame();
    buildKeyboard();
    resize();
    document.getElementById('perkRow').classList.remove('hidden');
    lastFrameTs = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    hideUpgradeOverlay();
    gameOverOverlay.classList.remove('show', 'win', 'lose');
    words = [];
    missiles = [];
    particles = [];
    rings = [];
    pops = [];
  }

  return { start, stop, isRunning: () => running };
})();
window.SoloGame = SoloGame;
`;

const replaced = onefile.replace(
  /\/\* ═══ 솔로 모드[\s\S]*?window\.SoloGame = SoloGame;\s*\n/,
  soloModule + '\n'
);

if (replaced === onefile) {
  console.error('SoloGame block not replaced');
  process.exit(1);
}

fs.writeFileSync('ww_onefile.html', replaced);
fs.writeFileSync('_solo_module_preview.js', soloModule);

// validate
try {
  const m = replaced.match(/<script>\s*window\.WW_STANDALONE[\s\S]*<\/script>/);
  new Function(m[0].replace(/^<script>\s*/, '').replace(/<\/script>$/, ''));
  console.log('syntax OK, size', replaced.length);
} catch (e) {
  console.error('syntax fail', e.message);
  process.exit(1);
}
