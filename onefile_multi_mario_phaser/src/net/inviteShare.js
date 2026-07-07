import QRCode from "qrcode";

export function getInviteUrl(hostPeerId) {
  if (!hostPeerId) return location.href;
  try {
    if (self !== top) {
      const parentUrl = new URL(parent.location.href);
      const playMatch = parentUrl.pathname.match(/\/play\/([^/]+)/);
      if (playMatch) {
        const u = new URL(parentUrl.origin + "/play/" + playMatch[1]);
        u.searchParams.set("join", hostPeerId);
        return u.toString();
      }
    }
  } catch {
    /* cross-origin parent */
  }
  const gameMatch = location.pathname.match(/\/games\/([^/]+)\//);
  if (gameMatch) {
    const u = new URL(location.origin + "/play/" + gameMatch[1]);
    u.searchParams.set("join", hostPeerId);
    return u.toString();
  }
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("join", hostPeerId);
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
  const url = getInviteUrl(hostPeerId);
  if (els?.inviteCodeEl) {
    els.inviteCodeEl.textContent = "방 코드: " + hostPeerId;
  }
  setLinkEl(els?.inviteLinkEl, url);
  drawQr(els?.qrCanvas, url);
  return url;
}
