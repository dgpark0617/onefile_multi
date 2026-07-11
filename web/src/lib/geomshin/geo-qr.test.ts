import test from 'node:test';
import assert from 'node:assert/strict';
import { lngLatToCell, INK_REFILL_MS_ONSITE, INK_REFILL_MS_REMOTE } from './geo';
import { refillInk } from './ink';
import {
  resetStoreForTests,
  ensureUser,
  applyGeoPresence,
  syncUserInk,
  refillMsFor,
  userPublic,
} from './store';
import { createQrOffer, redeemQr, resetQrForTests, QR_TTL_MS } from './qr';
import { recordPresence, presenceSummary } from './presence';

test('검단 bbox 안 좌표 → 격자', () => {
  const c = lngLatToCell(126.73, 37.615);
  assert.ok(c);
  assert.ok(c!.x >= 0 && c!.x < 500);
  assert.ok(c!.y >= 0 && c!.y < 500);
});

test('검단 밖 → null', () => {
  assert.equal(lngLatToCell(127.0, 37.5), null);
});

test('현장 잉크는 1분당 1', () => {
  const t0 = 1_000_000;
  const s = refillInk({ ink: 0, lastInkAtMs: t0 }, t0 + INK_REFILL_MS_ONSITE * 5, INK_REFILL_MS_ONSITE);
  assert.equal(s.ink, 5);
});

test('집관 잉크는 5분당 1', () => {
  const t0 = 1_000_000;
  const s = refillInk({ ink: 0, lastInkAtMs: t0 }, t0 + INK_REFILL_MS_REMOTE * 3, INK_REFILL_MS_REMOTE);
  assert.equal(s.ink, 3);
});

test('GPS 현장 적용 시 refillMs 가속', () => {
  resetStoreForTests();
  const u = ensureUser('geo1');
  u.ink = 0;
  const t0 = Date.now();
  u.lastInkAtMs = t0;
  applyGeoPresence('geo1', { lng: 126.73, lat: 37.615, x: 100, y: 100, onsite: true }, t0);
  assert.equal(refillMsFor(u, t0), INK_REFILL_MS_ONSITE);
  syncUserInk(u, t0 + INK_REFILL_MS_ONSITE * 4);
  assert.equal(u.ink, 4);
  const pub = userPublic(u, t0 + INK_REFILL_MS_ONSITE * 4);
  assert.equal(pub.onsite, true);
  assert.equal(pub.geoMode, 'onsite');
});

test('QR 7일 만료 · 1회 사용', () => {
  resetQrForTests();
  const t0 = 1_000_000;
  const { offer } = createQrOffer({ shopName: '테스트학원', nowMs: t0 });
  assert.equal(offer.expiresAtMs, t0 + QR_TTL_MS);
  const ok = redeemQr(offer.id, 'u1', t0 + 1000);
  assert.equal(ok.ok, true);
  assert.equal(ok.inkReward, 30);
  const again = redeemQr(offer.id, 'u1', t0 + 2000);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'QR_ALREADY_USED');
  const expired = redeemQr(offer.id, 'u2', t0 + QR_TTL_MS + 1);
  assert.equal(expired.ok, false);
  assert.equal(expired.reason, 'QR_EXPIRED');
});

test('presence 밀집도 스텁', () => {
  recordPresence({
    userId: 'a',
    x: 10,
    y: 20,
    lat: 37.61,
    lng: 126.73,
    atMs: Date.now(),
    onsite: true,
  });
  const s = presenceSummary();
  assert.ok(s.totalHits >= 1);
  assert.ok(Array.isArray(s.topCells));
  const hit = s.topCells.find((c) => c.x === 10 && c.y === 20);
  assert.ok(hit);
  assert.ok((hit?.hits ?? 0) >= 1);
  assert.ok(Array.isArray(s.visits));
});
