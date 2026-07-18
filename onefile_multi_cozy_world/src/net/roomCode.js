export const COZY_PEER_PREFIX = "cozy-";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function makeRoomCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

export function roomPeerId(codeOrId) {
  const clean = String(codeOrId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();
  if (!clean) return "";
  if (clean.startsWith(COZY_PEER_PREFIX)) return clean;
  if (clean.length > 12) return clean;
  return `${COZY_PEER_PREFIX}${clean}`;
}

export function toShortRoomCode(peerId) {
  const id = String(peerId || "");
  if (id.toLowerCase().startsWith(COZY_PEER_PREFIX)) {
    return id.slice(COZY_PEER_PREFIX.length);
  }
  return id;
}
