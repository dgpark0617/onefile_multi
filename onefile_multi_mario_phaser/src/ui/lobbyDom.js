import { MAX_PLAYERS, PLAYER_DEFS } from "../core/marioConstants.js";
import { gameSession } from "../core/gameSession.js";
import { setupHost } from "../net/inviteShare.js";
import { WwNet } from "../net/WwNet.js";
import { setMarioGameRef } from "./marioInput.js";

const IS_FILE = location.protocol === "file:";

let currentInviteUrl = "";
let callbacks = {};

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
    li.textContent = `${PLAYER_DEFS[i].emoji} (빈 슬롯)`;
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
  $("roomCode").textContent = hostPeerId;
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
  if (!IS_FILE) history.replaceState(null, "", location.pathname);
}

export function showGameOverlay({ title, msg }) {
  if ($("overlayTitle")) $("overlayTitle").textContent = title;
  if ($("overlayMsg")) $("overlayMsg").textContent = msg;
  $("overlay")?.classList.add("show");
}

function showGameShell() {
  hideCoopWait();
  $("lobby")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  $("overlay")?.classList.remove("show");
}

function startSolo() {
  showGameShell();
  callbacks.onStartGame?.({
    solo: true,
    isHost: true,
    myIndex: 0,
    playerCount: 1,
    seed: Date.now() >>> 0,
  });
}

function startNet(asHost) {
  const remoteId = asHost ? "" : ($("roomInput")?.value.trim() || $("joinCodeInput")?.value.trim() || "");
  if (!asHost && !remoteId) {
    lobbyLog("방 코드를 입력하세요");
    return;
  }

  WwNet.initPeer({
    asHost,
    remoteId,
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
  if (count < 2) return;
  const seed = Date.now() >>> 0;
  WwNet.startGameBroadcast(count, seed);
  showGameShell();
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
    sim.onRemoteInput(d.from, d.tick, d.input);
  } else if (d.type === "PEER_LEFT") {
    sim.onPeerLeft(d.index);
  } else if (d.type === "END" && !sim.isHost && !sim.gameOver) {
    sim.gameOver = true;
    showGameOverlay({
      title: d.won ? "🎉 클리어!" : "💀 게임 오버",
      msg: d.msg || "",
    });
  }
}

export function initLobby(opts) {
  callbacks = opts;

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
      callbacks.onRestartSolo?.();
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
