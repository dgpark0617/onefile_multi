/** 짧은 PeerJS 네트 — 오픈월드 위치 동기화용 (락스텝 없음) */
import Peer from "peerjs";
import { makeRoomCode, roomPeerId, toShortRoomCode } from "./roomCode.js";

const MAX_PLAYERS = 4;

let peer = null;
let isHost = false;
let myIndex = 0;
let roomId = "";
/** @type {Map<number, {conn: any, peerId: string}>} */
const clients = new Map();
let guestConn = null;
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

function findSlotByPeerId(peerId) {
  for (const [slot, e] of clients) {
    if (e.peerId === peerId) return slot;
  }
  return -1;
}

function buildRoster() {
  const roster = [{ index: 0, name: "방장", connected: true }];
  [...clients.keys()]
    .sort((a, b) => a - b)
    .forEach((i) => {
      roster.push({ index: i, name: `플레이어 ${i + 1}`, connected: true });
    });
  return roster;
}

function broadcastLobby() {
  const payload = { type: "LOBBY", roster: buildRoster(), playerCount: buildRoster().length };
  broadcast(payload);
  onLobby?.(payload);
}

function broadcast(data) {
  if (isHost) {
    for (const { conn } of clients.values()) {
      if (conn?.open) conn.send(data);
    }
  } else if (guestConn?.open) {
    guestConn.send(data);
  }
}

function send(data) {
  broadcast(data);
}

function sendTo(slot, data) {
  const e = clients.get(slot);
  if (e?.conn?.open) e.conn.send(data);
}

function attachConn(conn, slot) {
  conn.on("data", (d) => {
    if (d && typeof d === "object") d.from = slot;
    onData?.(d);
  });
  conn.on("close", () => {
    clients.delete(slot);
    if (isHost) {
      broadcast({ type: "PEER_LEFT", index: slot });
      broadcastLobby();
    }
    onClose?.({ index: slot });
  });
  conn.on("error", () => {
    onError?.({ message: "연결 오류" });
  });
}

function initPeer(opts) {
  const { asHost, remoteId, handlers } = opts;
  isHost = asHost;
  myIndex = asHost ? 0 : -1;
  clients.clear();
  guestConn = null;
  onData = handlers.onData;
  onOpen = handlers.onOpen;
  onClose = handlers.onClose;
  onError = handlers.onError;
  onLobby = handlers.onLobby;

  if (peer) {
    try {
      peer.destroy();
    } catch {
      /* ignore */
    }
    peer = null;
  }

  const desiredId = asHost ? roomPeerId(makeRoomCode()) : undefined;
  peer = desiredId ? new Peer(desiredId) : new Peer();

  const openTimer = setTimeout(() => {
    if (!roomId) onError?.({ message: "시그널링 연결 시간 초과" });
  }, 12000);

  peer.on("open", (id) => {
    clearTimeout(openTimer);
    roomId = asHost ? toShortRoomCode(id) : id;
    if (asHost) {
      peer.on("connection", (conn) => {
        conn.on("open", () => {
          const slot = allocSlot();
          if (slot < 0) {
            conn.send({ type: "REJECT", reason: "방 가득 참" });
            setTimeout(() => conn.close(), 200);
            return;
          }
          clients.set(slot, { conn, peerId: conn.peer });
          attachConn(conn, slot);
          conn.send({
            type: "WELCOME",
            index: slot,
            seed: 0xc02a01,
            roster: buildRoster(),
          });
          broadcastLobby();
          onOpen?.({ role: "host", clientJoined: true, index: slot });
        });
      });
      onOpen?.({ role: "host", roomReady: true, id: roomId, peerId: id });
      broadcastLobby();
    } else {
      const target = roomPeerId(remoteId);
      guestConn = peer.connect(target, { reliable: true });
      guestConn.on("open", () => {
        onOpen?.({ role: "client", connOpen: true });
      });
      guestConn.on("data", (d) => {
        if (d?.type === "WELCOME") myIndex = d.index;
        onData?.(d);
      });
      guestConn.on("close", () => {
        guestConn = null;
        onClose?.({});
      });
      guestConn.on("error", () => onError?.({ message: "방 연결 실패" }));
    }
  });

  peer.on("error", (e) => {
    if (asHost && e.type === "unavailable-id") {
      try {
        peer.destroy();
      } catch {
        /* ignore */
      }
      peer = null;
      roomId = "";
      initPeer(opts);
      return;
    }
    onError?.({ message: e.message || String(e.type || e) });
  });
}

function destroy() {
  try {
    peer?.destroy();
  } catch {
    /* ignore */
  }
  peer = null;
  clients.clear();
  guestConn = null;
  roomId = "";
}

export const CozyNet = {
  initPeer,
  send,
  sendTo,
  broadcast,
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
};
