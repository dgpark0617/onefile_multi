import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stagePanel, inferBubble } from './staging';
import { inferEmotion } from './emotions';
import { layoutPanels } from './layoutPanels';
import { DEFAULT_LOOK, type ComicMsg } from './types';

function msg(partial: Partial<ComicMsg> & Pick<ComicMsg, 'id' | 'peerId' | 'text' | 'at'>): ComicMsg {
  return {
    nick: 't',
    characterId: 'ink',
    look: DEFAULT_LOOK,
    emotion: 'happy',
    pose: 'idle',
    bubble: 'speech',
    bg: 'park',
    shot: 'medium',
    ...partial,
  };
}

describe('comicchat staging', () => {
  it('picks rain bg from text', () => {
    const s = stagePanel({
      text: '비가 와서 우산 필요해',
      emotion: 'sad',
      bubble: 'speech',
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
      bubble: 'speech',
      peerId: 'a',
      panelIndex: 1,
    });
    assert.equal(s.pose, 'heart');
    assert.equal(emo, 'love');
  });

  it('infers shout bubble', () => {
    assert.equal(inferBubble('헐!!!', 'surprise'), 'shout');
  });
});

describe('layoutPanels', () => {
  it('merges different speakers in window', () => {
    const panels = layoutPanels([
      msg({ id: '1', peerId: 'a', text: 'hi', at: 1000, bg: 'cafe' }),
      msg({ id: '2', peerId: 'b', text: 'yo', at: 2000, bg: 'cafe' }),
    ]);
    assert.equal(panels.length, 1);
    assert.equal(panels[0].lines.length, 2);
  });

  it('splits same speaker', () => {
    const panels = layoutPanels([
      msg({ id: '1', peerId: 'a', text: 'hi', at: 1000, bg: 'cafe' }),
      msg({ id: '2', peerId: 'a', text: 'again', at: 2000, bg: 'cafe' }),
    ]);
    assert.equal(panels.length, 2);
  });
});
