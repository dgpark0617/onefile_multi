import QRCode from "qrcode";
import { toShortRoomCode } from "./roomCode.js";

export function getInviteUrl(hostPeerId) {
  const code = toShortRoomCode(hostPeerId);
  if (!code) return location.href;
  try {
    if (self !== top) {
      const parentUrl = new URL(parent.location.href);
      const playMatch = parentUrl.pathname.match(/\/play\/([^/]+)/);
      if (playMatch) {
        const u = new URL(parentUrl.origin + "/play/" + playMatch[1]);
        u.searchParams.set("join", code);
        return u.toString();
      }
    }
  } catch {
    /* cross-origin parent */
  }
  const gameMatch = location.pathname.match(/\/games\/([^/]+)\//);
  if (gameMatch) {
    const u = new URL(location.origin + "/play/" + gameMatch[1]);
    u.searchParams.set("join", code);
    return u.toString();
  }
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("join", code);
  return u.toString();
}

export async function drawQr(canvas, url) {
  if (!canvas) return;
  try {
    canvas.style.display = "";
    await QRCode.toCanvas(canvas, url, {
      width: 176,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  } catch {
    canvas.style.display = "none";
  }
}

function setLinkEl(el, url) {
  if (!el) return;
  el.textContent = url;
  if (el.tagName === "A") {
    el.href = url;
    el.target = "_blank";
    el.rel = "noopener";
  }
}

export function setupHost(hostPeerId, els) {
  const code = toShortRoomCode(hostPeerId);
  const url = getInviteUrl(code);
  if (els?.inviteCodeEl) {
    els.inviteCodeEl.textContent = "방 코드: " + code;
  }
  setLinkEl(els?.inviteLinkEl, url);
  drawQr(els?.qrCanvas, url);
  return url;
}
