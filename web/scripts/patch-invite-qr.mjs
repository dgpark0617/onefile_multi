/**
 * PeerJS 멀티 게임에 초대 링크·QR 공유 UI 주입
 * node scripts/patch-invite-qr.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.join(__dirname, '..', '..');
const INVITE_JS = fs.readFileSync(path.join(GAME_ROOT, 'shared', 'invite-share.js'), 'utf8');

const games = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'games.json'), 'utf8')
);

const INVITE_CSS = `
  .invite-share-box { text-align: center; margin: 10px 0; }
  .invite-share-box canvas { border-radius: 8px; background: #fff; padding: 6px; max-width: min(176px, 80vw); height: auto; }
  .invite-code-text { font-size: 0.75rem; opacity: 0.85; margin: 6px 0; word-break: break-all; }
  #inviteLink { word-break: break-all; }
`;

const INVITE_HTML = `      <div class="invite-share-box">
        <canvas id="inviteQr" width="176" height="176" aria-label="초대 QR 코드"></canvas>
        <p id="inviteCodeText" class="invite-code-text"></p>
      </div>
`;

const QR_SCRIPT =
  '<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>';
const INVITE_SCRIPT = `<script>\n${INVITE_JS}\n</script>`;

const SETUP_HOST_BLOCK = `currentInviteUrl = InviteShare.setupHost(hostPeerId, {
          inviteLinkEl,
          inviteCodeEl: document.getElementById('inviteCodeText'),
          qrCanvas: document.getElementById('inviteQr')
        });
        document.getElementById('btnCopyLink').textContent = '초대 링크 복사';`;

function ensureInviteAssets(html) {
  if (html.includes('global.InviteShare')) return html;

  if (!html.includes('qrcode.min.js')) {
    html = html.replace(
      /<script src="https:\/\/unpkg\.com\/peerjs[^"]*"><\/script>/,
      (m) => m + '\n' + QR_SCRIPT
    );
  }
  if (!html.includes('global.InviteShare')) {
    html = html.replace(QR_SCRIPT, (m) => m + '\n' + INVITE_SCRIPT);
  }
  if (!html.includes('.invite-share-box')) {
    html = html.replace(/<\/style>/, INVITE_CSS + '\n</style>');
  }
  if (!html.includes('id="inviteQr"')) {
    html = html.replace(
      /(\s*)<(a|span) id="inviteLink"/,
      INVITE_HTML + '$1<$2 id="inviteLink"'
    );
  }
  return html;
}

function patchMarioStyleShowCoopWait(html) {
  const re =
    /if \(asHost\) \{\s*if \(USE_ROOM_CODE\) \{[\s\S]*?\} else \{[\s\S]*?\}\s*\} else \{/;
  if (!re.test(html)) return html;
  return html.replace(re, `if (asHost) {
        ${SETUP_HOST_BLOCK.replace(/hostPeerId/g, 'hostPeerId').replace(/inviteLinkEl/g, 'inviteLinkEl')}
      } else {`);
}

function patchFloodStyleShowCoopWait(html) {
  const re =
    /if \(asHost\) \{\s*currentInviteUrl = USE_ROOM_CODE \? hostId : getInviteUrl\(hostId\);[\s\S]*?\n    \}/;
  if (!re.test(html)) return html;
  return html.replace(
    re,
    `if (asHost) {
      currentInviteUrl = InviteShare.setupHost(hostId, {
        inviteLinkEl: document.getElementById('inviteLink'),
        inviteCodeEl: document.getElementById('inviteCodeText'),
        qrCanvas: document.getElementById('inviteQr')
      });
      document.getElementById('btnCopyLink').textContent = '초대 링크 복사';
    }`
  );
}

function patchNeonShowWait(html) {
  const re =
    /if \(asHost\) \{\s*currentInviteUrl = USE_ROOM_CODE \? hostId : \(\(\) => \{[\s\S]*?\}\)\(\);\s*link\.textContent = USE_ROOM_CODE \? '코드: ' \+ hostId : currentInviteUrl;\s*\}/;
  if (!re.test(html)) return html;
  return html.replace(
    re,
    `if (asHost) {
      currentInviteUrl = InviteShare.setupHost(hostId, {
        inviteLinkEl: link,
        inviteCodeEl: document.getElementById('inviteCodeText'),
        qrCanvas: document.getElementById('inviteQr')
      });
      document.getElementById('btnCopyLink').textContent = '초대 링크 복사';
    }`
  );
}

function patchTextwizardShowWaiting(html) {
  const re =
    /if \(USE_ROOM_CODE\) \{\s*currentInviteUrl = hostPeerId;[\s\S]*?waitingTitle\.textContent = '친구에게 방 코드를 보내세요[\s\S]*?';[\s\S]*?\} else \{[\s\S]*?waitingTitle\.textContent = '친구가 링크를 열면 자동으로 붙습니다';[\s\S]*?\}/;
  if (!re.test(html)) return html;
  return html.replace(
    re,
    `currentInviteUrl = InviteShare.setupHost(hostPeerId, {
      inviteLinkEl,
      inviteCodeEl: document.getElementById('inviteCodeText'),
      qrCanvas: document.getElementById('inviteQr')
    });
    btnCopyLink.textContent = '초대 링크 복사';
    waitingTitle.textContent = '링크·QR·방 코드로 친구를 초대하세요';`
  );
}

function patchTextwizardCopyInvite(html) {
  const re =
    /function copyInviteLink\(\) \{\s*if \(USE_ROOM_CODE\) \{[\s\S]*?copyText\(currentInviteUrl, '초대 링크 복사됨 — 친구에게 보내세요'\);\s*\}/;
  if (!re.test(html)) return html;
  return html.replace(
    re,
    `function copyInviteLink() {
    if (!currentInviteUrl) return;
    copyText(currentInviteUrl, '초대 링크 복사됨 — 친구에게 보내세요');
  }`
  );
}

function patchInfinitestairs(html) {
  if (!html.includes('function showCoopWait(hostPeerId, asHost)')) return html;
  const re =
    /function showCoopWait\(hostPeerId, asHost\) \{[\s\S]*?updateRosterUI\(\{ roster: WwNet\.buildRoster\(\), playerCount: WwNet\.isHost \? 1 : 0 \}\);\s*\}/;
  if (!re.test(html)) return html;
  return html.replace(
    re,
    `function showCoopWait(hostPeerId, asHost) {
    waitingBox.classList.remove('hidden');
    modeBlocks.classList.add('hidden');
    coopBlock.classList.add('hidden');
    joinPanel.classList.add('hidden');
    document.getElementById('guestWaitTip').classList.toggle('hidden', asHost);
    document.getElementById('roomCode').textContent = '방 코드: ' + hostPeerId;
    document.getElementById('btnCopyLink').classList.toggle('hidden', !asHost);
    if (asHost) {
      currentInviteUrl = InviteShare.setupHost(hostPeerId, {
        inviteLinkEl: document.getElementById('inviteLink'),
        inviteCodeEl: document.getElementById('inviteCodeText'),
        qrCanvas: document.getElementById('inviteQr')
      });
      document.getElementById('btnCopyLink').textContent = '초대 링크 복사';
    }
    updateRosterUI({ roster: WwNet.buildRoster(), playerCount: WwNet.isHost ? 1 : 0 });
  }`
  );
}

function patchSoccer(html, relPath) {
  if (!relPath.includes('onefile_multi_soccer/onefile_multi_soccer.html')) return html;

  if (!html.includes('id="btnCopyLink"')) {
    html = html.replace(
      '<button class="btn-green hidden" id="btnStartGame"',
      '<button class="btn-yellow hidden" id="btnCopyLink">초대 링크 복사</button>\n      <button class="btn-green hidden" id="btnStartGame"'
    );
  }
  html = html.replace('<span id="inviteLink"></span>', '<a id="inviteLink" href="#" rel="noopener"></a>');

  if (!html.includes('let currentInviteUrl')) {
    html = html.replace(
      'let lastSoloOpts = { soloSubMode: \'ace\', aiDifficulty: \'medium\' };',
      'let lastSoloOpts = { soloSubMode: \'ace\', aiDifficulty: \'medium\' };\n  let currentInviteUrl = \'\';'
    );
  }

  html = html.replace(
    /if \(asHost\) document\.getElementById\('inviteLink'\)\.textContent = '방 코드: ' \+ hostId;/,
    `if (asHost) {
      document.getElementById('btnCopyLink').classList.remove('hidden');
      currentInviteUrl = InviteShare.setupHost(hostId, {
        inviteLinkEl: document.getElementById('inviteLink'),
        inviteCodeEl: document.getElementById('inviteCodeText'),
        qrCanvas: document.getElementById('inviteQr')
      });
    } else {
      document.getElementById('btnCopyLink').classList.add('hidden');
    }`
  );

  if (!html.includes("getElementById('btnCopyLink').onclick")) {
    html = html.replace(
      "document.getElementById('btnCancelWait').onclick = showLobby;",
      `document.getElementById('btnCopyLink').onclick = () => {
    if (!currentInviteUrl) return;
    navigator.clipboard?.writeText(currentInviteUrl).then(() => lobbyLog('초대 링크 복사됨')).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = currentInviteUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      lobbyLog('초대 링크 복사됨');
    });
  };
  document.getElementById('btnCancelWait').onclick = showLobby;`
    );
  }

  if (!html.includes("get('join')")) {
    html = html.replace(
      '})();\n</script>',
      `  const joinParam = new URLSearchParams(location.search).get('join');
  if (joinParam) {
    document.getElementById('joinCodeInput').value = joinParam;
    lobbyLog('초대 링크 감지 — 연결 중…');
    document.getElementById('btnJoin').click();
  }
})();
</script>`
    );
  }

  return html;
}

function patchCopyHandlers(html) {
  html = html.replace(
    /copyText\(currentInviteUrl, USE_ROOM_CODE \? '[^']*' : '[^']*'\)/g,
    "copyText(currentInviteUrl, '초대 링크 복사됨')"
  );
  return html;
}

function patchInfinitestairsExtras(html, relPath) {
  if (!relPath.includes('onefile_multi_infinitestairs')) return html;
  if (!html.includes('id="inviteQr"')) {
    html = html.replace(
      /(<div id="waitingTitle">대기실<\/div>)/,
      `$1
      <div class="invite-share-box">
        <canvas id="inviteQr" width="176" height="176" aria-label="초대 QR 코드"></canvas>
        <p id="inviteCodeText" class="invite-code-text"></p>
      </div>
      <a id="inviteLink" href="#" rel="noopener" style="font-size:0.75rem;color:var(--neon-blue);word-break:break-all;"></a>`
    );
  }
  if (!html.includes('id="btnCopyLink"')) {
    html = html.replace(
      'id="btnCopyCode"',
      'id="btnCopyLink"'
    );
    html = html.replace(
      '>코드 복사<',
      '>초대 링크 복사<'
    );
  }
  if (!html.includes('let currentInviteUrl')) {
    html = html.replace(
      /(const waitingBox = document\.getElementById\('waitingBox'\);)/,
      'let currentInviteUrl = \'\';\n  $1'
    );
  }
  if (!html.includes("getElementById('btnCopyLink')")) {
    html = html.replace(
      "document.getElementById('btnCopyCode')",
      "document.getElementById('btnCopyLink')"
    );
  }
  return html;
}

function dedupeInviteShare(html) {
  const marker = '멀티 게임 대기실 — 초대 URL';
  const first = html.indexOf(marker);
  if (first < 0) return html;
  let second = html.indexOf(marker, first + marker.length);
  while (second >= 0) {
    const scriptStart = html.lastIndexOf('<script>', second);
    const scriptEnd = html.indexOf('</script>', second);
    if (scriptStart < 0 || scriptEnd < 0) break;
    html = html.slice(0, scriptStart) + html.slice(scriptEnd + '</script>'.length);
    second = html.indexOf(marker, first + marker.length);
  }
  return html;
}

function patchFile(relPath) {
  const abs = path.join(GAME_ROOT, relPath);
  if (!fs.existsSync(abs)) {
    console.warn(`[skip] missing ${relPath}`);
    return false;
  }
  let html = fs.readFileSync(abs, 'utf8');
  if (!html.includes('peerjs.min.js') || !html.includes('waitingBox')) {
    return false;
  }
  const before = html;
  html = ensureInviteAssets(html);
  html = patchMarioStyleShowCoopWait(html);
  html = patchFloodStyleShowCoopWait(html);
  html = patchNeonShowWait(html);
  html = patchTextwizardShowWaiting(html);
  html = patchTextwizardCopyInvite(html);
  html = patchInfinitestairsExtras(html, relPath);
  html = patchInfinitestairs(html);
  html = patchSoccer(html, relPath);
  html = patchCopyHandlers(html);
  html = dedupeInviteShare(html);

  if (html !== before) {
    fs.writeFileSync(abs, html, 'utf8');
    console.log(`  patched ${relPath}`);
    return true;
  }
  if (html.includes('global.InviteShare')) {
    console.log(`  ok ${relPath}`);
    return true;
  }
  console.warn(`  no-op ${relPath}`);
  return false;
}

let n = 0;
for (const game of games) {
  if (patchFile(game.source)) n++;
}
console.log(`\nInvite QR patch: ${n} game(s)`);
