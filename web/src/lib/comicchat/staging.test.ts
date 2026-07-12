import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stagePanel } from './staging';
import { inferEmotion } from './emotions';

describe('comicchat staging', () => {
  it('picks rain bg from text', () => {
    const s = stagePanel({
      text: '비가 와서 우산 필요해',
      emotion: 'sad',
      peerId: 'a',
      panelIndex: 0,
    });
    assert.equal(s.bg, 'rain');
  });

  it('maps love to heart pose', () => {
    const emo = inferEmotion('사랑해 ❤');
    const s = stagePanel({
      text: '사랑해 ❤',
      emotion: emo,
      peerId: 'a',
      panelIndex: 1,
    });
    assert.equal(s.pose, 'heart');
    assert.equal(emo, 'love');
  });

  it('respects manual pose', () => {
    const s = stagePanel(
      {
        text: '안녕',
        emotion: 'happy',
        peerId: 'a',
        panelIndex: 0,
      },
      'facepalm',
    );
    assert.equal(s.pose, 'facepalm');
  });
});
