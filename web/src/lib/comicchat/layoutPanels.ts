import {
  MAX_PANEL_ACTORS,
  MAX_PANELS,
  MERGE_WINDOW_MS,
  type ComicMsg,
  type ComicPanelModel,
} from './types';

/**
 * 발화 → 만화 칸.
 * 원작처럼: 짧은 대화는 한 무대에 여러 캐릭터, 배경은 칸이 유지.
 */
export function layoutPanels(messages: ComicMsg[]): ComicPanelModel[] {
  const panels: ComicPanelModel[] = [];

  for (const msg of messages) {
    const last = panels[panels.length - 1];
    if (!last) {
      panels.push(newPanel(msg));
      continue;
    }

    const lastLine = last.lines[last.lines.length - 1];
    const fresh = msg.at - lastLine.at <= MERGE_WINDOW_MS;
    const idx = last.lines.findIndex((l) => l.peerId === msg.peerId);

    // 이미 칸에 있는 사람이 다시 말함 + 상대가 있음 → 그 사람 말풍선만 갱신 (같은 컷 유지)
    if (fresh && idx >= 0 && last.lines.length >= 2) {
      last.lines[idx] = msg;
      last.shot = msg.shot;
      continue;
    }

    // 새 화자가 끼어듦 → 같은 컷에 합류
    if (
      fresh &&
      idx < 0 &&
      last.lines.length < MAX_PANEL_ACTORS &&
      lastLine.peerId !== msg.peerId
    ) {
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
