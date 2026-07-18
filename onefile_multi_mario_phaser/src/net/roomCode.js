/** 컷톡과 동일: 짧은 6자 코드 → PeerJS ID (`mario-xxxxxx`) */

export const MARIO_PEER_PREFIX = "mario-";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function makeRoomCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

/** 입력(짧은 코드 또는 전체 ID) → PeerJS가 쓰는 전체 ID */
export function roomPeerId(codeOrId) {
  const clean = String(codeOrId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();
  if (!clean) return "";
  if (clean.startsWith(MARIO_PEER_PREFIX)) return clean;
  // 예전 긴 PeerJS 자동 ID는 그대로 사용
  if (clean.length > 12) return clean;
  return `${MARIO_PEER_PREFIX}${clean}`;
}

/** 전체 Peer ID → 화면에 보여줄 6자 코드 */
export function toShortRoomCode(peerId) {
  const id = String(peerId || "");
  if (id.toLowerCase().startsWith(MARIO_PEER_PREFIX)) {
    return id.slice(MARIO_PEER_PREFIX.length);
  }
  return id;
}
