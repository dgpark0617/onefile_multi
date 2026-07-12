import Peer, { type DataConnection } from 'peerjs';
import {
  MAX_PANELS,
  PEER_PREFIX,
  type ComicMsg,
  type RoomMember,
  type WireMsg,
} from './types';

function trimMessages(list: ComicMsg[]): ComicMsg[] {
  const keep = MAX_PANELS * 4;
  if (list.length <= keep) return list;
  return list.slice(-keep);
}

export type RoomHandlers = {
  onStatus: (s: string) => void;
  onMessages: (msgs: ComicMsg[]) => void;
  onPeerId: (id: string) => void;
  onMembers: (members: RoomMember[]) => void;
};

export type ComicRoom = {
  peerId: string;
  isHost: boolean;
  sendMessage: (msg: ComicMsg) => void;
  destroy: () => void;
};

function roomPeerId(code: string): string {
  const clean = code.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  return `${PEER_PREFIX}${clean}`;
}

export function makeRoomCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export async function createHostRoom(
  self: RoomMember,
  handlers: RoomHandlers,
): Promise<ComicRoom> {
  const code = makeRoomCode();
  const id = roomPeerId(code);
  const peer = new Peer(id, { debug: 0 });
  const conns = new Map<string, DataConnection>();
  let messages: ComicMsg[] = [];
  const members = new Map<string, RoomMember>();
  members.set(self.peerId || 'host', { ...self, peerId: self.peerId || 'host' });

  const publishMembers = () => {
    const list = Array.from(members.values());
    handlers.onMembers(list);
    const wire: WireMsg = { type: 'roster', members: list };
    for (const c of conns.values()) {
      if (c.open) c.send(wire);
    }
  };

  const broadcast = (wire: WireMsg, except?: string) => {
    for (const [cid, c] of conns) {
      if (cid === except) continue;
      if (c.open) c.send(wire);
    }
  };

  const pushLocal = (msg: ComicMsg) => {
    messages = trimMessages([...messages, msg]);
    handlers.onMessages(messages);
  };

  await new Promise<void>((resolve, reject) => {
    peer.on('open', () => {
      const hostMember = { ...self, peerId: code };
      members.clear();
      members.set(code, hostMember);
      handlers.onPeerId(code);
      handlers.onMembers(Array.from(members.values()));
      handlers.onStatus('방 열림 — QR/코드로 초대하세요');
      resolve();
    });
    peer.on('error', (err) => {
      handlers.onStatus(`Peer 오류: ${err.type || err.message}`);
      reject(err);
    });
  });

  peer.on('connection', (conn) => {
    conns.set(conn.peer, conn);
    handlers.onStatus(`접속 ${conns.size + 1}명`);

    conn.on('open', () => {
      conn.send({
        type: 'sync',
        messages,
        members: Array.from(members.values()),
      } satisfies WireMsg);
    });

    conn.on('data', (raw) => {
      const data = raw as WireMsg;
      if (data.type === 'msg') {
        pushLocal(data.payload);
        broadcast({ type: 'msg', payload: data.payload }, conn.peer);
      } else if (data.type === 'hello') {
        members.set(data.peerId, {
          peerId: data.peerId,
          nick: data.nick,
          look: data.look,
          characterId: data.characterId,
        });
        publishMembers();
        handlers.onStatus(`${data.nick} 입장`);
      }
    });

    conn.on('close', () => {
      conns.delete(conn.peer);
      members.delete(conn.peer);
      publishMembers();
      handlers.onStatus(`접속 ${conns.size + 1}명`);
    });
  });

  return {
    peerId: code,
    isHost: true,
    sendMessage(msg) {
      pushLocal(msg);
      broadcast({ type: 'msg', payload: msg });
    },
    destroy() {
      for (const c of conns.values()) c.close();
      peer.destroy();
    },
  };
}

export async function joinGuestRoom(
  code: string,
  hello: RoomMember,
  handlers: RoomHandlers,
): Promise<ComicRoom> {
  const hostId = roomPeerId(code);
  const peer = new Peer({ debug: 0 });
  let messages: ComicMsg[] = [];
  let conn: DataConnection | null = null;

  await new Promise<void>((resolve, reject) => {
    peer.on('open', (myId) => {
      handlers.onPeerId(myId);
      conn = peer.connect(hostId, { reliable: true });
      conn.on('open', () => {
        conn!.send({
          type: 'hello',
          peerId: myId,
          nick: hello.nick,
          characterId: hello.characterId,
          look: hello.look,
        } satisfies WireMsg);
        handlers.onStatus('방에 연결됨');
        resolve();
      });
      conn.on('error', (err) => {
        handlers.onStatus(`연결 실패: ${String(err)}`);
        reject(err);
      });
      conn.on('data', (raw) => {
        const data = raw as WireMsg;
        if (data.type === 'sync') {
          messages = trimMessages(data.messages);
          handlers.onMessages(messages);
          handlers.onMembers(data.members || []);
        } else if (data.type === 'msg') {
          messages = trimMessages([...messages, data.payload]);
          handlers.onMessages(messages);
        } else if (data.type === 'roster') {
          handlers.onMembers(data.members);
        }
      });
      conn.on('close', () => {
        handlers.onStatus('방장과 연결이 끊겼습니다');
      });
    });
    peer.on('error', (err) => {
      handlers.onStatus(`Peer 오류: ${err.type || err.message}`);
      reject(err);
    });
  });

  return {
    peerId: peer.id,
    isHost: false,
    sendMessage(msg) {
      messages = trimMessages([...messages, msg]);
      handlers.onMessages(messages);
      if (conn?.open) conn.send({ type: 'msg', payload: msg } satisfies WireMsg);
    },
    destroy() {
      conn?.close();
      peer.destroy();
    },
  };
}
