/**
 * WebRTC ICE — Vercel은 정적 호스팅만 하므로 P2P/TURN은 브라우저에서 처리.
 *
 * 커스텀 주입:
 *   window.__MARIO_ICE__ = [ ... ]
 *   window.__MARIO_PEER__ = { host, port, path, key, secure }
 *   window.__MARIO_TURN_API__ = "https://..../turn/credentials?apiKey=..."
 *   window.__MARIO_LAN__ = true  // TURN 없이 같은 WiFi 직접 연결
 */

const DEFAULT_TURN_USER = "openrelayproject";
const DEFAULT_TURN_PASS = "openrelayproject";

function readCustomIce() {
  if (typeof window !== "undefined" && Array.isArray(window.__MARIO_ICE__)) {
    return window.__MARIO_ICE__;
  }
  return null;
}

function readLanFlag(explicit) {
  if (typeof explicit === "boolean") return explicit;
  if (typeof window !== "undefined" && typeof window.__MARIO_LAN__ === "boolean") {
    return window.__MARIO_LAN__;
  }
  return false;
}

/** 같은 WiFi용 — TURN(해외 중계) 제외, STUN만. 집 공유기 안에서는 보통 5~20ms */
export function buildLanIceServers() {
  const custom = readCustomIce();
  if (custom?.length) {
    return custom.filter((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.every((u) => String(u).startsWith("stun:"));
    }).length
      ? custom.filter((s) => {
          const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
          return urls.every((u) => String(u).startsWith("stun:"));
        })
      : [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ];
  }
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
}

/** 원격 친구용 — STUN + Open Relay TURN */
export function buildIceServers() {
  const custom = readCustomIce();
  if (custom?.length) return custom;

  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
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
    {
      urls: "turn:global.relay.metered.ca:80",
      username: DEFAULT_TURN_USER,
      credential: DEFAULT_TURN_PASS,
    },
    {
      urls: "turns:global.relay.metered.ca:443",
      username: DEFAULT_TURN_USER,
      credential: DEFAULT_TURN_PASS,
    },
  ];
}

/**
 * @param {{ lanMode?: boolean }} [opts]
 */
export async function resolveIceServers(opts = {}) {
  const lanMode = readLanFlag(opts.lanMode);
  if (lanMode) return buildLanIceServers();

  const custom = readCustomIce();
  if (custom?.length) return custom;

  const apiUrl =
    (typeof window !== "undefined" && window.__MARIO_TURN_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_MARIO_TURN_API) ||
    "";

  if (apiUrl) {
    try {
      const res = await fetch(String(apiUrl), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) return data;
        if (Array.isArray(data?.iceServers) && data.iceServers.length) return data.iceServers;
      }
    } catch {
      /* fall through */
    }
  }

  return buildIceServers();
}

/**
 * @param {RTCIceServer[]} iceServers
 * @param {{ lanMode?: boolean }} [opts]
 */
export function buildPeerOptions(iceServers, opts = {}) {
  const lanMode = readLanFlag(opts.lanMode);
  const base = {
    debug: 0,
    config: {
      iceServers: iceServers || (lanMode ? buildLanIceServers() : buildIceServers()),
      iceTransportPolicy: "all",
      sdpSemantics: "unified-plan",
      iceCandidatePoolSize: lanMode ? 4 : 8,
    },
  };

  const custom =
    (typeof window !== "undefined" && window.__MARIO_PEER__) ||
    null;
  if (!custom || typeof custom !== "object") return base;

  return {
    ...base,
    host: custom.host,
    port: custom.port ?? (custom.secure === false ? 80 : 443),
    path: custom.path ?? "/",
    key: custom.key ?? "peerjs",
    secure: custom.secure !== false,
    pingInterval: custom.pingInterval ?? (lanMode ? 3000 : 5000),
  };
}

/**
 * 게임 채널: 신뢰 전송 (호스트 권위 SNAP/INP).
 */
export const GAME_CONN_OPTS = {
  reliable: true,
  serialization: "binary",
  label: "game",
};

/** 제어 채널: 로비/시작 */
export const CTRL_CONN_OPTS = {
  reliable: true,
  serialization: "json",
  label: "ctrl",
};
