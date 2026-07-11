import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlayerId, normalizePlayerId } from './session';

test('아이디 한글·영문 허용', () => {
  assert.equal(validatePlayerId('geomdan').ok, true);
  assert.equal(validatePlayerId('시민A').ok, true);
  assert.equal(validatePlayerId('a_b-1').ok, true);
});

test('아이디 짧거나 예약어 거부', () => {
  assert.equal(validatePlayerId('a').ok, false);
  assert.equal(validatePlayerId('guest').ok, false);
  assert.equal(validatePlayerId('admin').ok, false);
});

test('아이디 공백 정규화', () => {
  assert.equal(normalizePlayerId('  hi  '), 'hi');
});
