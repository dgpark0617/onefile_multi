import { MAX_PLAYERS, PLAYER_DEFS } from "../core/constants.js";
import { gameSession } from "../core/gameSession.js";
import { setupHost } from "../net/inviteShare.js";
import { WwNet } from "../net/WwNet.js";

const IS_FILE = location.protocol === "file:";
const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /MacIntel|Macintosh/.test(navigator.platform));
const MULTI_FILE_IOS_BLOCKED = IS_FILE && IS_IOS;

let currentInviteUrl = "";
let inCoopWait = false;
let callbacks = {};

function $(id) {
  return document.getElementById(id);
}

function lobbyLog(msg) {
  const el = $("log");
  if (!el) return;
  el.textContent = (el.textContent ? el.textContent + "\n" : "") + msg;
  el.scrollTop = el.scrollHeight;
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
    li.style.color = "#666";
    li.textContent = `${PLAYER_DEFS[i].emoji} (빈)`;
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
  inCoopWait = true;
  const roomCode = $("roomCode");
  if (roomCode) roomCode.textContent = hostPeerId;
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
    const copyBtn = $("btnCopyLink");
    if (copyBtn) copyBtn.textContent = "초대 링크 복사";
  }
  updateRosterUI({ roster: WwNet.buildRoster(), playerCount: WwNet.isHost ? 1 : 0 });
  lobbyLog(asHost ? "대기실 — 친구를 초대하세요" : "대기실 입장");
}

function hideCoopWait() {
  inCoopWait = false;
  $("waitingBox")?.classList.add("hidden");
  $("roomBox")?.classList.add("hidden");
  $("joinPanel")?.classList.remove("hidden");
  currentInviteUrl = "";
}

export function showLobby() {
  gameSession.clear();
  callbacks.onStopGame?.();
  WwNet.destroy();
  hideCoopWait();
  $("overlay")?.classList.remove("show");
  $("gameShell")?.classList.add("hidden");
  $("lobby")?.classList.remove("hidden");
  if (!IS_FILE) history.replaceState(null, "", location.pathname);
}

function showGameShell() {
  hideCoopWait();
  $("lobby")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  $("overlay")?.classList.remove("show");
}

export function showGameOverlay({ title, msg }) {
  const overlay = $("overlay");
  const titleEl = $("overlayTitle");
  const msgEl = $("overlayMsg");
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = msg;
  overlay?.classList.add("show");
}

function startSolo() {
  showGameShell();
  gameSession.isInGame = true;
  callbacks.onStartGame?.({
    solo: true,
    isHost: true,
    myIndex: 0,
    playerCount: 1,
    seed: Date.now() >>> 0,
  });
}

function startNet(asHost) {
  if (MULTI_FILE_IOS_BLOCKED) {
    lobbyLog("아이폰에서는 다운로드 파일로 멀티할 수 없습니다. 웹사이트에서 접속하세요.");
    return;
  }
  const remoteId = asHost
    ? ""
    : ($("roomInput")?.value.trim() || $("joinCodeInput")?.value.trim() || "");
  if (!asHost && !remoteId) {
    lobbyLog("방 코드를 입력하세요");
    return;
  }

  WwNet.initPeer({
    asHost,
    remoteId,
    multiFileIosBlocked: MULTI_FILE_IOS_BLOCKED,
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
    },
  });
}

function hostBeginGame() {
  const count = WwNet.buildRoster().length;
  const seed = Date.now() >>> 0;
  WwNet.startGameBroadcast(count, seed);
  showGameShell();
  gameSession.isInGame = true;
  callbacks.onStartGame?.({
    solo: false,
    isHost: true,
    myIndex: 0,
    playerCount: count,
    seed,
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
    gameSession.isInGame = true;
    callbacks.onStartGame?.({
      solo: false,
      isHost: false,
      myIndex: WwNet.myIndex,
      playerCount: d.playerCount,
      seed: d.seed,
    });
    return;
  }

  const sim = gameSession.simulation;
  if (!sim) return;

  if (d.type === "FRAME" && !sim.isHost) {
    sim.onFrame(d.tick, d.inputs);
  } else if (d.type === "INP" && sim.isHost && d.from != null) {
    sim.onRemoteInput(d.from, d.tick, d.turn);
  } else if (d.type === "PEER_LEFT") {
    sim.onPeerLeft(d.index);
  } else if (d.type === "END" && !sim.isHost && !sim.gameOver) {
    sim.gameOver = true;
    const won = d.won === WwNet.myIndex;
    showGameOverlay({
      title: won ? "🏆 승리!" : "경기 종료",
      msg: d.msg || "",
    });
  }
}

function applyIosFileRestrictions() {
  if (!MULTI_FILE_IOS_BLOCKED) return;
  $("iosFileWarn")?.classList.remove("hidden");
  const hostBtn = $("btnHost");
  const joinBtn = $("btnJoin");
  if (hostBtn) {
    hostBtn.disabled = true;
    hostBtn.title = "아이폰 저장 파일에서는 멀티 불가";
  }
  if (joinBtn) {
    joinBtn.disabled = true;
    joinBtn.title = "아이폰 저장 파일에서는 멀티 불가";
  }
  lobbyLog("아이폰 + 저장 파일: 멀티 불가 (솔로만 가능). 웹사이트 /play/worms 사용");
}

function bindTurnButton(el, side) {
  if (!el) return;
  const down = (e) => {
    e.preventDefault();
    gameSession.input[side] = true;
    el.classList.add("active");
  };
  const up = () => {
    gameSession.input[side] = false;
    el.classList.remove("active");
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointerleave", up);
  el.addEventListener("pointercancel", up);
}

export function initLobby(opts) {
  callbacks = opts;

  $("btnSolo")?.addEventListener("click", startSolo);
  $("btnHost")?.addEventListener("click", () => startNet(true));
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
  $("toLobbyBtn")?.addEventListener("click", showLobby);
  $("restartBtn")?.addEventListener("click", () => {
    $("overlay")?.classList.remove("show");
    if (gameSession.simulation?.solo) {
      callbacks.onRestartSolo?.();
    } else {
      showLobby();
    }
  });

  bindTurnButton($("btnLeft"), "left");
  bindTurnButton($("btnRight"), "right");

  applyIosFileRestrictions();

  const join = new URLSearchParams(location.search).get("join");
  if (join) {
    if ($("joinCodeInput")) $("joinCodeInput").value = join;
    if ($("roomInput")) $("roomInput").value = join;
    if (!MULTI_FILE_IOS_BLOCKED) startNet(false);
  }
}

export { MULTI_FILE_IOS_BLOCKED, IS_FILE };
