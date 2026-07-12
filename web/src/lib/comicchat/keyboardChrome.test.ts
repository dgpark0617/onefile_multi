import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeKeyboardChrome } from './keyboardChrome';

describe('computeKeyboardChrome (iOS Safari model)', () => {
  it('keeps full stage when keyboard is closed', () => {
    const v = computeKeyboardChrome(
      { layoutHeight: 844, visualHeight: 844, offsetTop: 0 },
      72,
    );
    assert.equal(v.kb, 0);
    assert.equal(v.vvHeight, 844);
    assert.equal(v.stageHeight, 772);
  });

  it('shrinks stage by keyboard overlay without shrinking layout', () => {
    // iPhone-ish: layout stays 844, visual shrinks to 520 (keyboard ~324)
    const v = computeKeyboardChrome(
      { layoutHeight: 844, visualHeight: 520, offsetTop: 0 },
      64,
    );
    assert.equal(v.kb, 324);
    assert.equal(v.vvHeight, 520);
    assert.equal(v.dockSpace, 64);
    assert.equal(v.stageHeight, 456);
  });

  it('accounts for visualViewport.offsetTop when Safari scrolls', () => {
    const v = computeKeyboardChrome(
      { layoutHeight: 844, visualHeight: 500, offsetTop: 40 },
      70,
    );
    assert.equal(v.kb, 304); // 844 - 500 - 40
    assert.equal(v.vvTop, 40);
    assert.equal(v.vvHeight, 500);
  });
});
