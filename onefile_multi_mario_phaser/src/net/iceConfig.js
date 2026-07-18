/**
 * WebRTC ICE — Vercel은 정적 호스팅만 하므로 P2P/TURN은 클라이언트 브라우저에서 처리.
 * TURN 자격증명은 배포 시 환경변수로 교체 가능 (Vite/esbuild define 또는 window.__MARIO_ICE__).
 */
const DEFAULT_TURN_USER = "openrelayproject";
const DEFAULT_TURN_PASS = "openrelayproject";

function readCustomIce() {
  if (typeof window !== "undefined" && Array.isArray(window.__MARIO_ICE__)) {
    return window.__MARIO_ICE__;
  }
  return null;
}

export function buildIceServers() {
  const custom = readCustomIce();
  if (custom?.length) return custom;

  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: DEFAULT_TURN_USER,
      credential: DEFAULT_TURN_PASS,
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: DEFAULT_TURN_USER,
      credential: DEFAULT_TURN_PASS,
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: DEFAULT_TURN_USER,
      credential: DEFAULT_TURN_PASS,
    },
  ];
}
