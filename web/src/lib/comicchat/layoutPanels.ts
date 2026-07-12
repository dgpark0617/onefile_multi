import {
  MAX_PANEL_ACTORS,
  MAX_PANELS,
  MERGE_WINDOW_MS,
  type ComicMsg,
  type ComicPanelModel,
} from './types';

/**
 * 발화 목록 → 만화 칸.
 * 짧은 시간·다른 화자·같은 배경이면 한 칸에 합침 (원작 합연출).
 */
export function layoutPanels(messages: ComicMsg[]): ComicPanelModel[] {
  const panels: ComicPanelModel[] = [];

  for (const msg of messages) {
    const last = panels[panels.length - 1];
    if (last && canMerge(last, msg)) {
      last.lines.push(msg);
      last.shot = msg.shot;
      continue;
    }
    panels.push({
      id: `p-${msg.id}`,
      bg: msg.bg,
      shot: msg.shot,
      lines: [msg],
    });
  }

  return panels.slice(-MAX_PANELS);
}

function canMerge(panel: ComicPanelModel, msg: ComicMsg): boolean {
  if (panel.lines.length >= MAX_PANEL_ACTORS) return false;
  if (panel.bg !== msg.bg) return false;
  const last = panel.lines[panel.lines.length - 1];
  if (!last) return false;
  if (msg.at - last.at > MERGE_WINDOW_MS) return false;
  // 같은 사람이 연속으로만 말하면 칸을 나눔 (원작도 턴이 바뀌면 새 칸)
  if (last.peerId === msg.peerId) return false;
  const peers = new Set(panel.lines.map((l) => l.peerId));
  if (peers.has(msg.peerId)) return false;
  return true;
}
