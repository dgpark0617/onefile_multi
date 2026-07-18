import { initLobby, CozyNet } from "./ui/lobbyDom.js";
import { startCozyWorld } from "./world/cozyWorld.js";

let worldApi = null;

function setNetBadge(text) {
  const el = document.getElementById("netBadge");
  if (el) el.textContent = text || "";
}

function stopWorld() {
  try {
    worldApi?.stop();
  } catch {
    /* ignore */
  }
  worldApi = null;
  setNetBadge("");
}

async function startWorld(opts) {
  stopWorld();
  const mount = document.getElementById("gameMount");
  if (!mount) return;

  worldApi = startCozyWorld({
    mount,
    myIndex: opts.myIndex ?? 0,
    seed: opts.seed ?? 0xc02a01,
    onPose: (pose) => {
      if (opts.solo) return;
      const msg = { type: "POS", index: opts.myIndex, ...pose };
      CozyNet.send(msg);
    },
  });

  if (opts.solo) setNetBadge("솔로");
  else setNetBadge(opts.isHost ? `방장 · ${CozyNet.roomId || ""}` : `손님 · P${(opts.myIndex ?? 0) + 1}`);
}

function onNetData(d) {
  if (!worldApi || !d) return;
  if (d.type === "POS") {
    const idx = d.index != null ? d.index : d.from;
    if (idx == null || idx === CozyNet.myIndex) return;
    worldApi.applyRemotePose(idx, d);
    if (CozyNet.isHost && d.from != null) {
      CozyNet.broadcast({
        type: "POS",
        index: d.from,
        x: d.x,
        y: d.y,
        z: d.z,
        ry: d.ry,
        scene: d.scene,
      });
    }
  } else if (d.type === "PEER_LEFT") {
    worldApi.removeRemote(d.index);
  }
}

function boot() {
  if (typeof THREE === "undefined") {
    const lobby = document.getElementById("lobby");
    if (lobby) {
      lobby.innerHTML =
        "<p style='padding:24px'>Three.js 로딩 실패 — 인터넷 연결을 확인해주세요.</p>";
    }
    return;
  }

  initLobby({
    onStartGame: startWorld,
    onStopGame: stopWorld,
    onNetData,
    onPeerLeft() {
      /* host handles PEER_LEFT via onNetData */
    },
  });
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
