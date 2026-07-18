import { CozyNet } from "../net/CozyNet.js";
import { roomPeerId } from "../net/roomCode.js";
import { SUNDAY_KIDS } from "../world/sundayScenes.js";
import { CHAR_FACE_EMOJI } from "../world/characterVisual.js";

let callbacks = {};
let currentInviteUrl = "";
let worldSeed = 0xc02a01;
let selectedCharId = "woojin";

const CHAR_ABILITY_HINT = {
  woojin: "⚽ 우진 — 점프 대신 공 앞에서 슛(스페이스)으로 공을 찹니다.",
  gahyun: "🎨 가현 — 집 앞 이젤에서 E를 누르면 그림을 그릴 수 있어요.",
  youngsun: "✈️ 영선 — 스페이스를 연속 8번 누르면 점프가 2배가 됩니다.",
  taemi: "🏕️ 태미 — E를 누르면 그 자리에 텐트를 칩니다.",
  nammun: "💐 남문 — E로 꽃을 심어요. 가끔(1/20) 버섯이 나와요.",
  jongmyo: "🧥 종묘 — 집 앞 옷걸이에서 E를 누르면 옷 색이 바뀝니다.",
};

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

function getSelectedCharacter() {
  return SUNDAY_KIDS.find((k) => k.id === selectedCharId) || SUNDAY_KIDS[0];
}

function renderCharPicker() {
  const box = $("charPicker");
  const hint = $("charAbilityHint");
  if (!box) return;
  box.innerHTML = "";
  SUNDAY_KIDS.forEach((kid) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "char-pick" + (kid.id === selectedCharId ? " selected" : "");
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", kid.id === selectedCharId ? "true" : "false");
    const face = CHAR_FACE_EMOJI[kid.id] || { emoji: "🙂" };
    btn.innerHTML = `<span class="emoji">${face.emoji}</span>${kid.name}`;
    btn.addEventListener("click", () => {
      selectedCharId = kid.id;
      try {
        localStorage.setItem("cozy_char_id", kid.id);
      } catch {
        /* ignore */
      }
      renderCharPicker();
    });
    box.appendChild(btn);
  });
  if (hint) hint.textContent = CHAR_ABILITY_HINT[selectedCharId] || "";
}

function startOpts(extra = {}) {
  const kid = getSelectedCharacter();
  return {
    characterId: kid.id,
    characterName: kid.name,
    characterColor: kid.color,
    ...extra,
  };
}

function startSolo() {
  showGameShell();
  callbacks.onStartGame?.({
    solo: true,
    isHost: true,
    myIndex: 0,
    seed: worldSeed,
    ...startOpts(),
  });
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
            ...startOpts(),
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
            ...startOpts(),
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

  try {
    const saved = localStorage.getItem("cozy_char_id");
    if (saved && SUNDAY_KIDS.some((k) => k.id === saved)) selectedCharId = saved;
  } catch {
    /* ignore */
  }
  renderCharPicker();

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
