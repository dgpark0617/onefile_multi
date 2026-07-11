import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDisplayName,
  validatePlayerId,
  normalizePlayerId,
  isAuthUserId,
} from './session';

test('닉네임 한글·영문 허용', () => {
  assert.equal(validateDisplayName('geomdan').ok, true);
  assert.equal(validateDisplayName('시민A').ok, true);
  assert.equal(validateDisplayName('a_b-1').ok, true);
});

test('닉네임 짧거나 예약어 거부', () => {
  assert.equal(validateDisplayName('a').ok, false);
  assert.equal(validateDisplayName('guest').ok, false);
  assert.equal(validateDisplayName('admin').ok, false);
});

test('닉네임 공백 정규화', () => {
  assert.equal(normalizePlayerId('  hi  '), 'hi');
});

test('validatePlayerId는 닉네임 검증과 동일', () => {
  assert.equal(validatePlayerId('시민B').ok, true);
  assert.equal(validatePlayerId('x').ok, false);
});

test('Auth uid(UUID)만 저장 세션 id로 인정', () => {
  assert.equal(isAuthUserId('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isAuthUserId('시민A'), false);
  assert.equal(isAuthUserId('not-a-uuid'), false);
});
