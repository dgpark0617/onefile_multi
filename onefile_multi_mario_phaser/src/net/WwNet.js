import Peer from "peerjs";
import { CHARACTER_DEFS, getCharacter, MAX_PLAYERS } from "../core/marioConstants.js";
import { buildIceServers } from "./iceConfig.js";

const GAME_TYPES = new Set(["INP", "FRAME"]);

let peer = null;
/** slot -> { ctrlConn, gameConn, peerId } */
const clients = new Map();
let guestCtrlConn = null;
let guestGameConn = null;
/** slot index -> character id */
const slotChars = new Map();
let isHost = false;
let myIndex = 0;
let myCharId = CHARACTER_DEFS[0].id;
let roomId = "";
let gameStarted = false;
let onData = null;
let onOpen = null;
let onClose = null;
let onError = null;
let onLobby = null;
let onNetStatus = null;

/** @type {{ role: string, path: string, rttMs: number|null, updated: number }} */
let netStatus = { role: "-", path: "-", rttMs: null, updated: 0 };
let statsTimer = 0;

function isGameMessage(d) {
  return d && typeof d === "object" && GAME_TYPES.has(d.type);
}

function routeOutgoing(data) {
  if (isGameMessage(data)) sendGame(data);
  else sendCtrl(data);
}

function allocSlot() {
  for (let i = 1; i < MAX_PLAYERS; i++) {
    if (!clients.has(i)) return i;
  }
  return -1;
}

function findSlotByPeerId(peerId) {
  for (const [slot, entry] of clients) {
    if (entry.peerId === peerId) return slot;
  }
  return -1;
}

function buildRoster() {
  const hostChar = getCharacter(slotChars.get(0) || myCharId);
  const roster = [
    {
      index: 0,
      emoji: hostChar.emoji,
      name: hostChar.name + (isHost ? " (방장)" : ""),
      charId: hostChar.id,
      connected: true,
    },
  ];
  [...clients.keys()].sort((a, b) => a - b).forEach((i) => {
    const ch = getCharacter(slotChars.get(i) || CHARACTER_DEFS[i % CHARACTER_DEFS.length].id);
    roster.push({
      index: i,
      emoji: ch.emoji,
      name: ch.name,
      charId: ch.id,
      connected: true,
    });
  });
  return roster;
}

function buildCharacterIds() {
  return buildRoster().map((r) => r.charId || CHARACTER_DEFS[0].id);
}

function forEachGameConn(fn) {
  clients.forEach((entry) => {
    if (entry.gameConn?.open) fn(entry.gameConn);
  });
}

function forEachCtrlConn(fn) {
  clients.forEach((entry) => {
    if (entry.ctrlConn?.open) fn(entry.ctrlConn);
  });
}

function broadcastGame(data) {
  forEachGameConn((conn) => conn.send(data));
}

function broadcastCtrl(data) {
  forEachCtrlConn((conn) => conn.send(data));
}

function broadcast(data) {
  routeOutgoing(data);
}

function broadcastLobby() {
  const payload = { type: "LOBBY", roster: buildRoster(), playerCount: buildRoster().length };
  broadcastCtrl(payload);
  onLobby?.(payload);
}

function sendGame(data) {
  if (isHost) broadcastGame(data);
  else if (guestGameConn?.open) guestGameConn.send(data);
}

function sendCtrl(data) {
  if (isHost) broadcastCtrl(data);
  else if (guestCtrlConn?.open) guestCtrlConn.send(data);
}

function sendToHost(data) {
  routeOutgoing(data);
}

function dispatchData(d, fromSlot) {
  if (typeof d === "object" && d !== null && fromSlot != null) d.from = fromSlot;
  onData?.(d);
}

function attachGameConn(conn, slot) {
  conn.on("data", (d) => dispatchData(d, slot));
  conn.on("close", () => {
    const entry = clients.get(slot);
    if (entry) entry.gameConn = null;
  });
  conn.on("error", () => {
    onError?.({ type: "connection", message: "게임 데이터 연결 오류" });
  });
  pollConnectionStats(conn);
}

function attachCtrlConn(conn, slot) {
  conn.on("data", (d) => {
    if (d.type === "CHAR_SELECT" && d.charId) {
      slotChars.set(slot, getCharacter(d.charId).id);
      broadcastLobby();
      return;
    }
    dispatchData(d, slot);
  });
  conn.on("close", () => {
    clients.delete(slot);
    slotChars.delete(slot);
    if (!gameStarted) broadcastLobby();
    else dispatchData({ type: "PEER_LEFT", index: slot });
  });
  pollConnectionStats(conn);
}

function openGuestGameChannel(hostId) {
  if (guestGameConn?.open) return;
  guestGameConn = peer.connect(hostId.trim(), { reliable: false, label: "game" });
  guestGameConn.on("open", () => pollConnectionStats(guestGameConn));
  guestGameConn.on("data", (d) => dispatchData(d));
  guestGameConn.on("close", () => {
    guestGameConn = null;
  });
  guestGameConn.on("error", () => {
    onError?.({ type: "connection", message: "게임(고속) 채널 오류" });
  });
}

async function pollConnectionStats(conn) {
  const pc = conn?.peerConnection;
  if (!pc) return;
  try {
    const stats = await pc.getStats();
    let rttMs = null;
    let path = "unknown";
    let localCandId = null;
    let remoteCandId = null;

    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        if (report.currentRoundTripTime != null) {
          rttMs = Math.round(report.currentRoundTripTime * 1000);
        }
        localCandId = report.localCandidateId;
        remoteCandId = report.remoteCandidateId;
      }
    });

    stats.forEach((report) => {
      if (report.type === "local-candidate" && report.id === localCandId && report.candidateType) {
        path = report.candidateType;
      }
      if (report.type === "remote-candidate" && report.id === remoteCandId && report.candidateType === "relay") {
        path = "relay";
      }
    });

    netStatus = {
      role: isHost ? "host" : "guest",
      path: path === "relay" ? "relay" : path === "host" ? "direct" : path,
      rttMs,
      updated: Date.now(),
    };
    onNetStatus?.(netStatus);
  } catch {
    /* ignore stats errors */
  }
}

function startStatsLoop() {
  if (statsTimer) return;
  statsTimer = setInterval(() => {
    if (isHost) {
      for (const { gameConn, ctrlConn } of clients.values()) {
        if (gameConn?.open) pollConnectionStats(gameConn);
        else if (ctrlConn?.open) pollConnectionStats(ctrlConn);
      }
    } else if (guestGameConn?.open) pollConnectionStats(guestGameConn);
    else if (guestCtrlConn?.open) pollConnectionStats(guestCtrlConn);
  }, 3000);
}

function stopStatsLoop() {
  if (statsTimer) {
    clearInterval(statsTimer);
    statsTimer = 0;
  }
}

function setMyCharacter(charId) {
  myCharId = getCharacter(charId).id;
  if (isHost) {
    slotChars.set(0, myCharId);
    if (roomId) broadcastLobby();
  } else if (guestCtrlConn?.open && myIndex >= 0) {
    sendCtrl({ type: "CHAR_SELECT", charId: myCharId });
  }
}

function initPeer(opts) {
  const { asHost, remoteId, handlers, multiFileIosBlocked } = opts;
  isHost = asHost;
  myIndex = asHost ? 0 : -1;
  gameStarted = false;
  clients.clear();
  slotChars.clear();
  if (asHost) slotChars.set(0, myCharId);
  guestCtrlConn = null;
  guestGameConn = null;
  netStatus = { role: asHost ? "host" : "guest", path: "-", rttMs: null, updated: 0 };
  onData = handlers.onData;
  onOpen = handlers.onOpen;
  onClose = handlers.onClose;
  onError = handlers.onError;
  onLobby = handlers.onLobby;
  onNetStatus = handlers.onNetStatus;

  let guestConnectAttempt = 0;
  const GUEST_CONNECT_MAX = 6;

  function connectAsGuest(id) {
    guestCtrlConn = peer.connect(id.trim(), { reliable: true, label: "ctrl" });
    guestCtrlConn.on("open", () => {
      onOpen?.({ role: "client", connOpen: true });
      sendCtrl({ type: "CHAR_SELECT", charId: myCharId });
      pollConnectionStats(guestCtrlConn);
    });
    guestCtrlConn.on("data", (d) => {
      if (d.type === "WELCOME") {
        myIndex = d.index;
        openGuestGameChannel(id);
      }
      dispatchData(d);
    });
    guestCtrlConn.on("close", () => {
      guestCtrlConn = null;
      guestGameConn?.close();
      guestGameConn = null;
      onClose?.();
    });
    guestCtrlConn.on("error", () => {
      onError?.({ type: "connection", message: "제어 연결 오류" });
    });
  }

  peer = new Peer({
    debug: 0,
    config: { iceServers: buildIceServers() },
  });

  const openTimer = setTimeout(() => {
    if (!roomId) {
      onError?.({
        type: "timeout",
        message: multiFileIosBlocked
          ? "아이폰 저장 파일에서는 멀티 불가. 웹사이트에서 열어주세요."
          : "시그널링 서버 연결 시간 초과. 네트워크·방화벽을 확인하세요.",
      });
    }
  }, 12000);

  peer.on("open", (id) => {
    clearTimeout(openTimer);
    roomId = id;
    startStatsLoop();
    if (asHost) {
      peer.on("connection", (conn) => {
        if (conn.label === "game") {
          const slot = findSlotByPeerId(conn.peer);
          if (slot < 0) {
            setTimeout(() => conn.close(), 300);
            return;
          }
          const entry = clients.get(slot);
          entry.gameConn = conn;
          attachGameConn(conn, slot);
          return;
        }

        conn.on("open", () => {
          if (gameStarted) {
            conn.send({ type: "REJECT", reason: "이미 시작됨" });
            setTimeout(() => conn.close(), 300);
            return;
          }
          const slot = allocSlot();
          if (slot < 0) {
            conn.send({ type: "REJECT", reason: "방 가득 참" });
            setTimeout(() => conn.close(), 300);
            return;
          }
          clients.set(slot, { ctrlConn: conn, gameConn: null, peerId: conn.peer });
          slotChars.set(slot, CHARACTER_DEFS[slot % CHARACTER_DEFS.length].id);
          attachCtrlConn(conn, slot);
          conn.send({ type: "WELCOME", index: slot, roster: buildRoster() });
          broadcastLobby();
          onOpen?.({ role: "host", clientJoined: true, index: slot });
        });
      });
      onOpen?.({ id, role: "host", roomReady: true });
    } else {
      connectAsGuest(remoteId);
    }
  });

  peer.on("error", (e) => {
    if (!asHost && e.type === "peer-unavailable" && guestConnectAttempt < GUEST_CONNECT_MAX) {
      guestConnectAttempt += 1;
      onError?.({
        type: "retry",
        message: `방 연결 재시도 (${guestConnectAttempt}/${GUEST_CONNECT_MAX})…`,
      });
      setTimeout(() => connectAsGuest(remoteId), 800 + guestConnectAttempt * 400);
      return;
    }
    if (!asHost && e.type === "peer-unavailable") {
      onError?.({
        type: "peer-unavailable",
        message: "방을 찾을 수 없습니다. 방장이 대기실을 연 상태인지, 방 코드가 맞는지 확인하세요.",
      });
      return;
    }
    onError?.(e);
  });
}

function startGameBroadcast(playerCount, seed, characterIds) {
  gameStarted = true;
  const ids = characterIds || buildCharacterIds();
  broadcastCtrl({ type: "START", playerCount, seed, characterIds: ids });
  return ids;
}

function destroy() {
  stopStatsLoop();
  clients.forEach(({ ctrlConn, gameConn }) => {
    try {
      gameConn?.close();
      ctrlConn?.close();
    } catch {
      /* ignore */
    }
  });
  clients.clear();
  slotChars.clear();
  if (guestGameConn) guestGameConn.close();
  if (guestCtrlConn) guestCtrlConn.close();
  if (peer) peer.destroy();
  peer = null;
  guestCtrlConn = null;
  guestGameConn = null;
  gameStarted = false;
  myIndex = 0;
}

function getNetStatusLabel() {
  const { role, path, rttMs } = netStatus;
  const rtt = rttMs != null ? `${rttMs}ms` : "…";
  const pathKo = path === "relay" ? "중계" : path === "direct" || path === "host" ? "직접" : path;
  return `${role === "host" ? "방장" : "참가"} · ${pathKo} · ${rtt}`;
}

export const WwNet = {
  initPeer,
  broadcast,
  broadcastGame,
  broadcastCtrl,
  sendGame,
  sendCtrl,
  sendToHost,
  startGameBroadcast,
  destroy,
  buildRoster,
  buildCharacterIds,
  setMyCharacter,
  getNetStatusLabel,
  get myCharId() {
    return myCharId;
  },
  get isHost() {
    return isHost;
  },
  get myIndex() {
    return myIndex;
  },
  get roomId() {
    return roomId;
  },
  get gameStarted() {
    return gameStarted;
  },
};
