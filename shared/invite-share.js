/**
 * 멀티 게임 대기실 — 초대 URL · QR · 방 코드 표시
 * iframe(/play/slug) 및 단독 HTML(/games/slug) 모두 지원
 */
(function (global) {
  'use strict';

  function getInviteUrl(hostPeerId) {
    if (!hostPeerId) return global.location.href;
    try {
      if (global.self !== global.top) {
        const parentUrl = new URL(global.parent.location.href);
        const playMatch = parentUrl.pathname.match(/\/play\/([^/]+)/);
        if (playMatch) {
          const u = new URL(parentUrl.origin + '/play/' + playMatch[1]);
          u.searchParams.set('join', hostPeerId);
          return u.toString();
        }
      }
    } catch (_) {
      /* cross-origin parent */
    }
    const gameMatch = global.location.pathname.match(/\/games\/([^/]+)\//);
    if (gameMatch) {
      const u = new URL(global.location.origin + '/play/' + gameMatch[1]);
      u.searchParams.set('join', hostPeerId);
      return u.toString();
    }
    const u = new URL(global.location.href);
    u.search = '';
    u.searchParams.set('join', hostPeerId);
    return u.toString();
  }

  function drawQr(canvas, url) {
    if (!canvas || !global.QRCode) return;
    canvas.style.display = '';
    global.QRCode.toCanvas(
      canvas,
      url,
      { width: 176, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } },
      function (err) {
        if (err) canvas.style.display = 'none';
      }
    );
  }

  function setLinkEl(el, url) {
    if (!el) return;
    el.textContent = url;
    if (el.tagName === 'A') {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener';
    }
  }

  function setupHost(hostPeerId, els) {
    const url = getInviteUrl(hostPeerId);
    if (els && els.inviteCodeEl) {
      els.inviteCodeEl.textContent = '방 코드: ' + hostPeerId;
    }
    setLinkEl(els && els.inviteLinkEl, url);
    if (els && els.hintEl) {
      els.hintEl.textContent = '링크를 열거나 QR을 스캔하면 자동 참가';
    }
    drawQr(els && els.qrCanvas, url);
    return url;
  }

  global.InviteShare = {
    getInviteUrl: getInviteUrl,
    setupHost: setupHost,
    drawQr: drawQr,
  };
})(typeof window !== 'undefined' ? window : globalThis);
