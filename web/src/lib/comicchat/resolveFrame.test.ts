import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFrameKey, POSE_EMOTION_FALLBACK } from './frameGuide';
import { resolvePackFrameFile, type PackManifest } from './packRegistry';

const manifest: PackManifest = {
  id: 'ink',
  name: '잉크',
  version: 1,
  facing: 'right',
  flipForLeft: true,
  kind: 'sprite',
  fallback: 'idle.svg',
  frames: {
    idle: 'idle.svg',
    happy: 'happy.svg',
    wave: 'wave.svg',
  },
};

describe('frameGuide', () => {
  it('pose beats emotion when not idle', () => {
    assert.equal(resolveFrameKey('sad', 'wave'), 'wave');
  });

  it('uses emotion when pose idle', () => {
    assert.equal(resolveFrameKey('angry', 'idle'), 'angry');
  });

  it('maps shrug fallback emotion', () => {
    assert.equal(POSE_EMOTION_FALLBACK.shrug, 'neutral');
  });
});

describe('resolvePackFrameFile', () => {
  it('prefers pose frame', () => {
    assert.equal(resolvePackFrameFile(manifest, 'sad', 'wave'), 'wave.svg');
  });

  it('falls back to emotion then idle', () => {
    assert.equal(resolvePackFrameFile(manifest, 'happy', 'idle'), 'happy.svg');
    assert.equal(resolvePackFrameFile(manifest, 'angry', 'idle'), 'idle.svg');
  });

  it('pose fallback emotion when pose file missing', () => {
    assert.equal(resolvePackFrameFile(manifest, 'sad', 'shrug'), 'idle.svg');
  });
});
