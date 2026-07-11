import test from 'node:test';
import assert from 'node:assert/strict';
import { refillInk, spendInk } from './ink';
import { INK_CAP, INK_REFILL_MS } from './config';
import { neighbors4, isAdjacentOwned } from './grid';
import {
  resetStoreForTests,
  ensureUser,
  seedPixel,
  claimPixel,
} from './store';

test('잉크 5분당 1 충전 · cap 200', () => {
  const t0 = 1_000_000;
  let s = { ink: 0, lastInkAtMs: t0 };
  s = refillInk(s, t0 + INK_REFILL_MS * 12);
  assert.equal(s.ink, 12);
  s = refillInk(s, t0 + INK_REFILL_MS * 500);
  assert.equal(s.ink, INK_CAP);
});

test('잉크 부족 시 spend 실패', () => {
  const out = spendInk({ ink: 0, lastInkAtMs: Date.now() }, 1, Date.now());
  assert.equal(out.ok, false);
});

test('4방 인접', () => {
  const n = neighbors4(10, 10);
  assert.equal(n.length, 4);
});

test('씨앗 후 인접만 확장', () => {
  resetStoreForTests();
  const uid = 'tester';
  ensureUser(uid);
  const seed = seedPixel(uid, 100, 100, '#ef4444');
  assert.equal(seed.ok, true);
  assert.equal(seed.delta?.color, 0xef4444);
  const far = claimPixel(uid, 110, 110, '#ef4444');
  assert.equal(far.ok, false);
  assert.equal(far.reason, 'NOT_ADJACENT');
  const near = claimPixel(uid, 101, 100, '#3b82f6');
  assert.equal(near.ok, true);
  assert.equal(near.delta?.color, 0x3b82f6);
});

test('내 칸은 색만 변경', () => {
  resetStoreForTests();
  const uid = 'painter';
  seedPixel(uid, 5, 5, '#000000');
  const re = claimPixel(uid, 5, 5, '#ffffff');
  assert.equal(re.ok, true);
  assert.equal(re.kind, 'RECOLOR');
  assert.equal(re.delta?.color, 0xffffff);
});

test('자동 랜덤 시작점', async () => {
  const { autoSeedPixel } = await import('./store');
  resetStoreForTests();
  const out = autoSeedPixel('auto1', '#22c55e', Date.now(), () => 0.02);
  assert.equal(out.ok, true);
  assert.ok(out.delta);
  assert.equal(out.user?.homeX, out.delta?.x);
  assert.equal(out.user?.homeY, out.delta?.y);
});

test('isAdjacentOwned', () => {
  const owners = new Uint32Array(500 * 500);
  owners[100 * 500 + 100] = 3;
  assert.equal(isAdjacentOwned(owners, 3, 101, 100), true);
  assert.equal(isAdjacentOwned(owners, 3, 105, 100), false);
});
