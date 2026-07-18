import { CHARACTER_DEFS, getCharacter, MAX_PLAYERS } from "../core/marioConstants.js";
import { CHAR_SPRITE_URLS, preloadCharSprites } from "../assets/charSprites.js";
import { gameSession } from "../core/gameSession.js";
import { setupHost } from "../net/inviteShare.js";
import { toShortRoomCode } from "../net/roomCode.js";
import { WwNet } from "../net/WwNet.js";
import { startBgm } from "../audio/bgm.js";
import { setMarioGameRef } from "./marioInput.js";
import { refreshEndgameAd } from "./dummyAd.js";

const IS_FILE = location.protocol === "file:";
const CHAR_STORAGE_KEY = "mario_phaser_char";
const LAN_STORAGE_KEY = "mario_phaser_lan";

let currentInviteUrl = "";
let callbacks = {};
let selectedCharId = loadSavedChar();

preloadCharSprites();

function loadLanMode() {
  try {
    const v = localStorage.getItem(LAN_STORAGE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return true; // 기본: 같은 WiFi 빠른 연결
}

function saveLanMode(on) {
  try {
    localStorage.setItem(LAN_STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function isLanModeChecked() {
  const el = $("lanModeCheck");
  return el ? !!el.checked : loadLanMode();
}

function loadSavedChar() {
  try {
    const id = localStorage.getItem(CHAR_STORAGE_KEY);
    if (id && CHARACTER_DEFS.some((c) => c.id === id)) return id;
  } catch {
    /* ignore */
  }
  return CHARACTER_DEFS[0].id;
}

function saveChar(id) {
  selectedCharId = getCharacter(id).id;
  try {
    localStorage.setItem(CHAR_STORAGE_KEY, selectedCharId);
  } catch {
    /* ignore */
  }
  WwNet.setMyCharacter(selectedCharId);
  renderCharPicker();
}

function $(id) {
  return document.getElementById(id);
}

function lobbyLog(msg) {
  const el = $("netLog");
  if (!el) return;
  el.textContent = msg + "\n" + (el.textContent || "");
}

function copyText(text, msg) {
  const done = () => lobbyLog(msg);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else {
    fallback();
  }
  function fallback() {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    done();
  }
}

function renderCharPicker() {
  const box = $("charPicker");
  if (!box) return;
  box.innerHTML = "";
  CHARACTER_DEFS.forEach((ch) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "char-pick" + (ch.id === selectedCharId ? " selected" : "");
    btn.dataset.charId = ch.id;
    const thumb = CHAR_SPRITE_URLS[ch.sprite || ch.id];
    const thumbHtml = thumb
      ? `<img class="char-thumb" src="${thumb}" alt="${ch.name}" />`
      : `<span class="char-emoji">${ch.emoji}</span>`;
    btn.innerHTML = `${thumbHtml}<span class="char-name">${ch.name}</span>`;
    btn.addEventListener("click", () => saveChar(ch.id));
    box.appendChild(btn);
  });
  const label = $("charSelectedLabel");
  if (label) {
    const ch = getCharacter(selectedCharId);
    label.textContent = `선택: ${ch.name}`;
  }
}

function updateRosterUI(data) {
  const roster = data.roster || WwNet.buildRoster();
  const count = data.playerCount || roster.length;
  const ul = $("rosterList");
  if (!ul) return;
  ul.innerHTML = "";
  roster.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `${r.emoji} ${r.name}`;
    ul.appendChild(li);
  });
  for (let i = count; i < MAX_PLAYERS; i++) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = `${CHARACTER_DEFS[i % CHARACTER_DEFS.length].emoji} (빈 슬롯)`;
    ul.appendChild(li);
  }
  const title = $("waitingTitle");
  if (title) title.textContent = `대기실 — ${count}/${MAX_PLAYERS}명`;
  const btn = $("btnStartGame");
  if (btn) {
    btn.disabled = count < 2;
    btn.textContent = count < 2 ? "게임 시작 (2인 이상)" : `게임 시작 (${count}인)`;
  }
}

function showCoopWait(hostPeerId, asHost) {
  const code = toShortRoomCode(hostPeerId);
  $("roomCode").textContent = code;
  $("roomBox")?.classList.remove("hidden");
  $("waitingBox")?.classList.remove("hidden");
  $("joinPanel")?.classList.add("hidden");
  $("btnStartGame")?.classList.toggle("hidden", !asHost);
  $("guestWaitHint")?.classList.toggle("hidden", asHost);
  $("btnCopyLink")?.classList.toggle("hidden", !asHost);
  if (asHost) {
    currentInviteUrl = setupHost(hostPeerId, {
      inviteLinkEl: $("inviteLink"),
      inviteCodeEl: $("inviteCodeText"),
      qrCanvas: $("inviteQr"),
    });
  }
  updateRosterUI({ roster: WwNet.buildRoster(), playerCount: WwNet.isHost ? 1 : 0 });
  lobbyLog(asHost ? "대기실 — 친구를 초대하세요" : "대기실 입장");
  if (WwNet.lanMode) lobbyLog("WiFi 모드: 같은 공유기에서 직접 연결 시도");
}

function hideCoopWait() {
  $("waitingBox")?.classList.add("hidden");
  $("roomBox")?.classList.add("hidden");
  $("joinPanel")?.classList.remove("hidden");
  currentInviteUrl = "";
}

export function showLobby() {
  setMarioGameRef(null);
  gameSession.simulation = null;
  callbacks.onStopGame?.();
  WwNet.destroy();
  hideCoopWait();
  $("overlay")?.classList.remove("show");
  $("gameShell")?.classList.add("hidden");
  $("lobby")?.classList.remove("hidden");
  renderCharPicker();
  if (!IS_FILE) history.replaceState(null, "", location.pathname);
}

export function showGameOverlay({ title, msg }) {
  if ($("overlayTitle")) $("overlayTitle").textContent = title;
  if ($("overlayMsg")) $("overlayMsg").textContent = msg;
  refreshEndgameAd();
  $("overlay")?.classList.add("show");
}

function showGameShell() {
  hideCoopWait();
  $("lobby")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  $("overlay")?.classList.remove("show");
  startBgm();
}

function startSolo() {
  startBgm();
  showGameShell();
  callbacks.onStartGame?.({
    solo: true,
    isHost: true,
    myIndex: 0,
    playerCount: 1,
    seed: Date.now() >>> 0,
    characterIds: [selectedCharId],
  });
}

function startNet(asHost) {
  const raw = asHost ? "" : ($("roomInput")?.value.trim() || $("joinCodeInput")?.value.trim() || "");
  const remoteId = asHost ? "" : raw.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!asHost && !remoteId) {
    lobbyLog("방 코드를 입력하세요");
    return;
  }
  if (!asHost && remoteId.length < 4) {
    lobbyLog("방 코드 6자를 입력하세요");
    return;
  }

  WwNet.setMyCharacter(selectedCharId);
  const lan = isLanModeChecked();
  saveLanMode(lan);
  lobbyLog(lan ? "WiFi 빠른 연결 모드 (같은 공유기)" : "원격 연결 모드 (TURN 허용)");
  WwNet.initPeer({
    asHost,
    remoteId,
    lanMode: lan,
    handlers: {
      onOpen: (info) => {
        if (info.roomReady) showCoopWait(info.id, true);
        else if (info.clientJoined) {
          updateRosterUI({ roster: WwNet.buildRoster(), playerCount: WwNet.buildRoster().length });
        } else if (info.connOpen) lobbyLog("연결됨 — 방장 시작 대기");
      },
      onLobby: updateRosterUI,
      onData: handleNetData,
      onClose: () => lobbyLog("연결 끊김"),
      onError: (e) => lobbyLog(e.message || `오류: ${e.type || e.message || e}`),
      onNetStatus: () => {
        const el = $("netStatus");
        if (el) el.textContent = WwNet.getNetStatusLabel();
      },
    },
  });
}

function hostBeginGame() {
  const count = WwNet.buildRoster().length;
  if (count < 2) return;
  const seed = Date.now() >>> 0;
  const characterIds = WwNet.startGameBroadcast(count, seed);
  showGameShell();
  callbacks.onStartGame?.({
    solo: false,
    isHost: true,
    myIndex: 0,
    playerCount: count,
    seed,
    characterIds,
  });
}

export function handleNetData(d) {
  if (d.type === "LOBBY") {
    updateRosterUI(d);
    return;
  }
  if (d.type === "WELCOME" && !WwNet.isHost) {
    showCoopWait($("roomInput")?.value || "", false);
    updateRosterUI({ roster: d.roster, playerCount: d.roster.length });
    return;
  }
  if (d.type === "REJECT") {
    lobbyLog("거절: " + (d.reason || ""));
    return;
  }
  if (d.type === "START" && !WwNet.isHost) {
    showGameShell();
    callbacks.onStartGame?.({
      solo: false,
      isHost: false,
      myIndex: WwNet.myIndex,
      playerCount: d.playerCount,
      seed: d.seed,
      characterIds: d.characterIds,
    });
    return;
  }

  const sim = gameSession.simulation;
  if (!sim) return;

  if (d.type === "SNAP" && !sim.isHost) {
    sim.onSnap(d);
  } else if (d.type === "INP" && sim.isHost && d.from != null) {
    sim.onRemoteInput(d.from, d.input);
  } else if (d.type === "PEER_LEFT") {
    sim.onPeerLeft(d.index);
  } else if (d.type === "END" && !sim.isHost && !sim.gameOver) {
    sim.gameOver = true;
    sim.gameWon = !!d.won;
    showGameOverlay({
      title: d.won ? "🎉 클리어!" : "💀 게임 오버",
      msg: d.msg || "",
    });
  } else if (d.type === "LEVEL" && !sim.isHost) {
    sim.applyLevelAdvance(d.levelIndex, d.seed);
  }
}

export function initLobby(opts) {
  callbacks = opts;
  WwNet.setMyCharacter(selectedCharId);
  renderCharPicker();

  const lanCheck = $("lanModeCheck");
  if (lanCheck) {
    lanCheck.checked = loadLanMode();
    lanCheck.addEventListener("change", () => saveLanMode(!!lanCheck.checked));
  }

  $("btnSolo")?.addEventListener("click", startSolo);
  $("btnCoopHost")?.addEventListener("click", () => startNet(true));
  $("btnJoin")?.addEventListener("click", () => {
    const code = $("joinCodeInput")?.value.trim();
    if ($("roomInput")) $("roomInput").value = code;
    startNet(false);
  });
  $("btnCopyLink")?.addEventListener("click", () => {
    if (!currentInviteUrl) return;
    copyText(currentInviteUrl, "초대 링크 복사됨");
  });
  $("btnStartGame")?.addEventListener("click", hostBeginGame);
  $("btnCancelWait")?.addEventListener("click", showLobby);
  $("backBtn")?.addEventListener("click", showLobby);
  $("btnToLobby")?.addEventListener("click", showLobby);
  $("restartBtn")?.addEventListener("click", () => {
    $("overlay")?.classList.remove("show");
    if (gameSession.simulation?.solo) {
      callbacks.onRestartSolo?.({ characterIds: [selectedCharId] });
    } else {
      showLobby();
    }
  });

  const join = new URLSearchParams(location.search).get("join");
  if (join) {
    if ($("joinCodeInput")) $("joinCodeInput").value = join;
    if ($("roomInput")) $("roomInput").value = join;
    startNet(false);
  }
}
