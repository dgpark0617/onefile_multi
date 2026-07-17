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
  it('picks rain bg from clear scene phrase', () => {
    const s = stagePanel({
      text: '비가 와서 우산 필요해',
      emotion: 'sad',
      bubble: 'speech',
      peerId: 'a',
      panelIndex: 0,
    });
    assert.equal(s.bg, 'rain');
  });

  it('keeps sticky bg without scene keyword', () => {
    const s = stagePanel({
      text: 'ㅋㅋㅋ',
      emotion: 'laugh',
      bubble: 'speech',
      peerId: 'b',
      panelIndex: 2,
      prevBg: 'cafe',
    });
    assert.equal(s.bg, 'cafe');
  });

  it('does not jump bg on short words like 축하/방', () => {
    const s = stagePanel({
      text: '축하해! 내 방 정리했어',
      emotion: 'happy',
      bubble: 'speech',
      peerId: 'a',
      panelIndex: 3,
      prevBg: 'cafe',
    });
    assert.equal(s.bg, 'cafe');
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

describe('layoutPanels (Comic Chat rules)', () => {
  it('adds different speakers to same panel without overwriting', () => {
    const panels = layoutPanels([
      msg({ id: '1', peerId: 'a', text: 'hi', at: 1000, bg: 'cafe' }),
      msg({ id: '2', peerId: 'b', text: 'yo', at: 2000, bg: 'park' }),
    ]);
    assert.equal(panels.length, 1);
    assert.equal(panels[0].lines.length, 2);
    assert.equal(panels[0].lines[0].text, 'hi');
    assert.equal(panels[0].lines[1].text, 'yo');
    assert.equal(panels[0].bg, 'cafe');
  });

  it('starts new panel when same speaker talks again (no overwrite)', () => {
    const panels = layoutPanels([
      msg({ id: '1', peerId: 'a', text: 'hi', at: 1000, bg: 'cafe' }),
      msg({ id: '2', peerId: 'b', text: 'yo', at: 2000, bg: 'cafe' }),
      msg({ id: '3', peerId: 'a', text: 'again', at: 3000, bg: 'cafe' }),
    ]);
    assert.equal(panels.length, 2);
    assert.equal(panels[0].lines.length, 2);
    assert.equal(panels[0].lines.find((l) => l.peerId === 'a')?.text, 'hi');
    assert.equal(panels[1].lines.length, 1);
    assert.equal(panels[1].lines[0].text, 'again');
  });

  it('splits consecutive same speaker into panels', () => {
    const panels = layoutPanels([
      msg({ id: '1', peerId: 'a', text: 'hi', at: 1000, bg: 'cafe' }),
      msg({ id: '2', peerId: 'a', text: 'again', at: 2000, bg: 'cafe' }),
    ]);
    assert.equal(panels.length, 2);
  });

  it('keeps history of prior panels', () => {
    const panels = layoutPanels([
      msg({ id: '1', peerId: 'a', text: 'one', at: 1000 }),
      msg({ id: '2', peerId: 'a', text: 'two', at: 2000 }),
      msg({ id: '3', peerId: 'b', text: 'three', at: 3000 }),
    ]);
    assert.equal(panels.length, 2);
    assert.equal(panels[0].lines[0].text, 'one');
    assert.equal(panels[1].lines[0].text, 'two');
    assert.equal(panels[1].lines[1].text, 'three');
  });
});
