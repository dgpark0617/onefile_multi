import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { panelZoom, placeActors } from './placeActors';
import { DEFAULT_LOOK, type ComicMsg } from './types';

function msg(partial: Partial<ComicMsg> & Pick<ComicMsg, 'id' | 'peerId' | 'text'>): ComicMsg {
  return {
    nick: 't',
    characterId: 'ink',
    look: DEFAULT_LOOK,
    emotion: 'happy',
    pose: 'idle',
    bubble: 'speech',
    bg: 'park',
    shot: 'medium',
    at: 0,
    ...partial,
  };
}

describe('placeActors', () => {
  it('centers solo speaker facing right', () => {
    const [a] = placeActors([msg({ id: '1', peerId: 'a', text: '안녕' })]);
    assert.equal(a.side, 'center');
    assert.equal(a.facing, 'left');
  });

  it('faces duo toward each other', () => {
    const placed = placeActors([
      msg({ id: '1', peerId: 'a', text: 'hi' }),
      msg({ id: '2', peerId: 'b', text: 'yo' }),
    ]);
    assert.equal(placed[0].side, 'left');
    assert.equal(placed[0].facing, 'right');
    assert.equal(placed[1].side, 'right');
    assert.equal(placed[1].facing, 'left');
  });

  it('lays out trio left-center-right', () => {
    const placed = placeActors([
      msg({ id: '1', peerId: 'a', text: 'a' }),
      msg({ id: '2', peerId: 'b', text: 'b' }),
      msg({ id: '3', peerId: 'c', text: 'c' }),
    ]);
    assert.deepEqual(
      placed.map((p) => p.side),
      ['left', 'center', 'right'],
    );
  });

  it('narrows balloons when crowded', () => {
    const placed = placeActors([
      msg({ id: '1', peerId: 'a', text: 'a'.repeat(50) }),
      msg({ id: '2', peerId: 'b', text: 'b'.repeat(50) }),
      msg({ id: '3', peerId: 'c', text: 'c'.repeat(50) }),
    ]);
    assert.ok(parseInt(placed[0].balloonMaxWidth, 10) <= 76);
  });

  it('attaches side balloons to panel edges in duo', () => {
    const placed = placeActors([
      msg({ id: '1', peerId: 'a', text: 'hi' }),
      msg({ id: '2', peerId: 'b', text: 'yo' }),
    ]);
    assert.ok(placed[0].balloonAttach.includes('left'));
    assert.ok(placed[1].balloonAttach.includes('right'));
  });

  it('panel zoom varies by shot', () => {
    assert.ok(panelZoom('close') > panelZoom('wide'));
    assert.equal(panelZoom('medium'), 1);
  });
});
