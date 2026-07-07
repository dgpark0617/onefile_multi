import Peer from "peerjs";
import { MAX_PLAYERS, PLAYER_DEFS } from "../core/marioConstants.js";

let peer = null;
let guestConn = null;
const clients = new Map();
let isHost = false;
let myIndex = 0;
let roomId = "";
let gameStarted = false;
let onData = null;
let onOpen = null;
let onClose = null;
let onError = null;
let onLobby = null;

function allocSlot() {
  for (let i = 1; i < MAX_PLAYERS; i++) {
    if (!clients.has(i)) return i;
  }
  return -1;
}

function buildRoster() {
  const roster = [
    {
      index: 0,
      emoji: PLAYER_DEFS[0].emoji,
      name: PLAYER_DEFS[0].name + (isHost ? " (방장)" : ""),
      connected: true,
    },
  ];
  [...clients.keys()].sort((a, b) => a - b).forEach((i) => {
    roster.push({
      index: i,
      emoji: PLAYER_DEFS[i].emoji,
      name: PLAYER_DEFS[i].name,
      connected: true,
    });
  });
  return roster;
}

function broadcast(data) {
  clients.forEach(({ conn }) => {
    if (conn.open) conn.send(data);
  });
}

function broadcastLobby() {
  const payload = { type: "LOBBY", roster: buildRoster(), playerCount: buildRoster().length };
  broadcast(payload);
  onLobby?.(payload);
}

function sendToHost(data) {
  if (guestConn?.open) guestConn.send(data);
}

function initPeer(opts) {
  const { asHost, remoteId, handlers, multiFileIosBlocked } = opts;
  isHost = asHost;
  myIndex = asHost ? 0 : -1;
  gameStarted = false;
  clients.clear();
  guestConn = null;
  onData = handlers.onData;
  onOpen = handlers.onOpen;
  onClose = handlers.onClose;
  onError = handlers.onError;
  onLobby = handlers.onLobby;

  let guestConnectAttempt = 0;
  const GUEST_CONNECT_MAX = 6;

  function connectAsGuest(id) {
    guestConn = peer.connect(id.trim(), { reliable: true });
    guestConn.on("open", () => onOpen?.({ role: "client", connOpen: true }));
    guestConn.on("data", (d) => {
      if (d.type === "WELCOME") myIndex = d.index;
      onData?.(d);
    });
    guestConn.on("close", () => {
      guestConn = null;
      onClose?.();
    });
    guestConn.on("error", () => {
      onError?.({ type: "connection", message: "데이터 연결 오류" });
    });
  }

  peer = new Peer({ debug: 0 });
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
    if (asHost) {
      peer.on("connection", (conn) => {
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
          clients.set(slot, { conn });
          conn.send({ type: "WELCOME", index: slot, roster: buildRoster() });
          broadcastLobby();
          onOpen?.({ role: "host", clientJoined: true, index: slot });
          conn.on("data", (d) => {
            if (typeof d === "object" && d !== null) d.from = slot;
            onData?.(d);
          });
          conn.on("close", () => {
            clients.delete(slot);
            if (!gameStarted) broadcastLobby();
            else onData?.({ type: "PEER_LEFT", index: slot });
          });
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

function startGameBroadcast(playerCount, seed) {
  gameStarted = true;
  broadcast({ type: "START", playerCount, seed });
}

function destroy() {
  clients.forEach(({ conn }) => {
    try {
      conn.close();
    } catch {
      /* ignore */
    }
  });
  clients.clear();
  if (guestConn) guestConn.close();
  if (peer) peer.destroy();
  peer = null;
  guestConn = null;
  gameStarted = false;
  myIndex = 0;
}

export const WwNet = {
  initPeer,
  broadcast,
  sendToHost,
  startGameBroadcast,
  destroy,
  buildRoster,
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
