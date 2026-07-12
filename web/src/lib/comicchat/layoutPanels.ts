import {
  MAX_PANEL_ACTORS,
  MAX_PANELS,
  type ComicMsg,
  type ComicPanelModel,
} from './types';

/** 말풍선이 물리적으로 더 안 들어갈 때 (원작 PlaceBalloons 실패 근사) */
const MAX_BALLOONS_PER_PANEL = 5;
const MAX_PANEL_TEXT_CHARS = 220;
/** 첫 대사가 이보다 길면 15% 확률로 솔로 컷 유도 (SIGGRAPH) */
const LONG_UTTERANCE_CHARS = 40;

/**
 * SIGGRAPH ’96 / Interaction ’98 Comic Chat panel breaks:
 * - 새 발화는 가능하면 마지막 컷에 **추가** (덮어쓰기 없음)
 * - 같은 화자가 그 컷에서 이미 말했으면 → 새 컷
 * - 인원/풍선/텍스트가 너무 많으면 → 새 컷
 * - (부가) 긴 첫 대사면 가끔 솔로 컷 유지
 * - 시간 윈도우로 끊지 않음
 */
export function layoutPanels(messages: ComicMsg[]): ComicPanelModel[] {
  const panels: ComicPanelModel[] = [];

  for (const msg of messages) {
    const last = panels[panels.length - 1];
    if (last && canAddToPanel(last, msg)) {
      last.lines.push(msg);
      last.shot = msg.shot;
      continue;
    }
    panels.push(newPanel(msg));
  }

  return panels.slice(-MAX_PANELS);
}

function newPanel(msg: ComicMsg): ComicPanelModel {
  return {
    id: `p-${msg.id}`,
    bg: msg.bg,
    shot: msg.shot,
    lines: [msg],
  };
}

function canAddToPanel(panel: ComicPanelModel, msg: ComicMsg): boolean {
  // 한 컷·한 캐릭터당 말풍선 1개 — 같은 화자 재발화면 새 컷
  if (panel.lines.some((l) => l.peerId === msg.peerId)) {
    return false;
  }

  if (panel.lines.length >= MAX_PANEL_ACTORS) return false;
  if (panel.lines.length >= MAX_BALLOONS_PER_PANEL) return false;

  const textLen =
    panel.lines.reduce((n, l) => n + l.text.length, 0) + msg.text.length;
  if (textLen > MAX_PANEL_TEXT_CHARS) return false;

  // 긴 첫 대사 후 다음 말을 가끔 새 컷으로 (시각적 변화, ~15%)
  if (panel.lines.length === 1) {
    const first = panel.lines[0];
    if (
      first.text.length > LONG_UTTERANCE_CHARS &&
      deterministicPct(msg.id) < 15
    ) {
      return false;
    }
  }

  return true;
}

/** 테스트 안정용 결정적 퍼센트 0–99 */
function deterministicPct(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 100;
}
