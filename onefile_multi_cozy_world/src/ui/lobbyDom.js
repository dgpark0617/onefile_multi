import { CozyNet } from "../net/CozyNet.js";
import { roomPeerId } from "../net/roomCode.js";

let callbacks = {};
let currentInviteUrl = "";
let worldSeed = 0xc02a01;

const $ = (id) => document.getElementById(id);

function lobbyLog(msg) {
  const el = $("log");
  if (!el) return;
  el.textContent = `${msg}\n${el.textContent}`.slice(0, 500);
}

function showLobby() {
  callbacks.onStopGame?.();
  CozyNet.destroy();
  $("gameShell")?.classList.add("hidden");
  $("lobby")?.classList.remove("hidden");
  $("waitingBox")?.classList.add("hidden");
  $("roomBox")?.classList.add("hidden");
}

function showGameShell() {
  $("lobby")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
}

function updateRoster(d) {
  const list = $("rosterList");
  if (!list) return;
  const roster = d?.roster || CozyNet.buildRoster();
  list.innerHTML = "";
  roster.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `${r.index === 0 ? "🌸" : "🐰"} ${r.name}${r.index === CozyNet.myIndex ? " (나)" : ""}`;
    list.appendChild(li);
  });
}

function inviteUrlFor(code) {
  const u = new URL(location.href);
  u.searchParams.set("join", code);
  return u.toString();
}

function copyText(text, okMsg) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => lobbyLog(okMsg)).catch(() => lobbyLog(text));
  } else lobbyLog(text);
}

function startSolo() {
  showGameShell();
  callbacks.onStartGame?.({ solo: true, isHost: true, myIndex: 0, seed: worldSeed });
}

function startNet(asHost) {
  const joinCode = $("joinCodeInput")?.value.trim() || $("roomInput")?.value.trim();
  if (!asHost && !joinCode) {
    lobbyLog("초대 코드를 입력하세요");
    return;
  }

  $("waitingBox")?.classList.remove("hidden");
  $("roomBox")?.classList.toggle("hidden", !asHost);
  lobbyLog(asHost ? "방 만드는 중…" : "입장 중…");

  CozyNet.initPeer({
    asHost,
    remoteId: joinCode,
    handlers: {
      onOpen(info) {
        if (info.roomReady && asHost) {
          currentInviteUrl = inviteUrlFor(info.id);
          if ($("roomCodeText")) $("roomCodeText").textContent = info.id;
          if ($("inviteLink")) {
            $("inviteLink").textContent = currentInviteUrl;
            $("inviteLink").href = currentInviteUrl;
          }
          lobbyLog(`방 코드: ${info.id}`);
          showGameShell();
          callbacks.onStartGame?.({
            solo: false,
            isHost: true,
            myIndex: 0,
            seed: worldSeed,
          });
        }
        if (info.clientJoined) {
          lobbyLog(`플레이어 ${info.index + 1} 입장`);
          updateRoster();
        }
        if (info.connOpen && !asHost) lobbyLog("연결됨 — 환영 대기…");
      },
      onLobby: updateRoster,
      onData(d) {
        if (d.type === "WELCOME" && !asHost) {
          worldSeed = d.seed ?? worldSeed;
          updateRoster(d);
          lobbyLog(`입장 완료 (P${d.index + 1})`);
          showGameShell();
          callbacks.onStartGame?.({
            solo: false,
            isHost: false,
            myIndex: d.index,
            seed: worldSeed,
          });
          return;
        }
        if (d.type === "REJECT") {
          lobbyLog(`거절: ${d.reason || ""}`);
          return;
        }
        callbacks.onNetData?.(d);
      },
      onClose() {
        if (!asHost) lobbyLog("연결 종료");
        callbacks.onPeerLeft?.();
      },
      onError(e) {
        lobbyLog(e.message || "오류");
      },
    },
  });
}

export function initLobby(opts) {
  callbacks = opts;

  $("btnSolo")?.addEventListener("click", startSolo);
  $("btnHost")?.addEventListener("click", () => startNet(true));
  $("btnJoin")?.addEventListener("click", () => startNet(false));
  $("btnCopyLink")?.addEventListener("click", () => {
    if (currentInviteUrl) copyText(currentInviteUrl, "초대 링크 복사됨");
  });
  $("btnCopyCode")?.addEventListener("click", () => {
    const code = $("roomCodeText")?.textContent;
    if (code) copyText(code, "코드 복사됨");
  });
  $("backBtn")?.addEventListener("click", showLobby);

  const params = new URLSearchParams(location.search);
  const join = params.get("join");
  if (join) {
    if ($("joinCodeInput")) $("joinCodeInput").value = join;
    if ($("roomInput")) $("roomInput").value = join;
    lobbyLog(`초대 링크 감지: ${join}`);
  }
}

export { showLobby, CozyNet, roomPeerId };
