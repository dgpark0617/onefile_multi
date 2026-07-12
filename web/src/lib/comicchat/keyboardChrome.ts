/** iOS Safari: layout viewport는 유지되고 visualViewport만 줄어듦 */
export type ViewportMetrics = {
  layoutHeight: number;
  visualHeight: number;
  offsetTop: number;
};

export type KeyboardChromeVars = {
  vvHeight: number;
  vvTop: number;
  kb: number;
  dockSpace: number;
  stageHeight: number;
};

export function computeKeyboardChrome(
  vp: ViewportMetrics,
  dockHeight: number,
): KeyboardChromeVars {
  const layoutH = Math.max(0, Math.round(vp.layoutHeight));
  const visualH = Math.max(0, Math.round(vp.visualHeight));
  const offsetTop = Math.max(0, Math.round(vp.offsetTop));
  const kb = Math.max(0, layoutH - visualH - offsetTop);
  const dockSpace = Math.max(0, Math.round(dockHeight));
  return {
    vvHeight: visualH || layoutH,
    vvTop: offsetTop,
    kb,
    dockSpace,
    stageHeight: Math.max(120, (visualH || layoutH) - dockSpace),
  };
}

export function applyKeyboardChromeVars(
  el: HTMLElement,
  vars: KeyboardChromeVars,
): void {
  el.style.setProperty('--cc-vv-height', `${vars.vvHeight}px`);
  el.style.setProperty('--cc-vv-top', `${vars.vvTop}px`);
  el.style.setProperty('--cc-kb', `${vars.kb}px`);
  el.style.setProperty('--cc-dock-space', `${vars.dockSpace}px`);
  el.style.setProperty('--cc-stage-height', `${vars.stageHeight}px`);
}

export function clearKeyboardChromeVars(el: HTMLElement): void {
  el.style.removeProperty('--cc-vv-height');
  el.style.removeProperty('--cc-vv-top');
  el.style.removeProperty('--cc-kb');
  el.style.removeProperty('--cc-dock-space');
  el.style.removeProperty('--cc-stage-height');
}

/** 최신 컷이 스트립 가시 영역(=독 위) 안에 있는지 */
export function isLatestPanelVisibleAboveDock(opts: {
  strip: HTMLElement;
  panel: HTMLElement;
  dock: HTMLElement;
  /** 허용 오차 px */
  slack?: number;
}): { ok: boolean; panelBottom: number; dockTop: number; detail: string } {
  const slack = opts.slack ?? 4;
  const panelRect = opts.panel.getBoundingClientRect();
  const dockRect = opts.dock.getBoundingClientRect();
  const stripRect = opts.strip.getBoundingClientRect();
  const panelBottom = panelRect.bottom;
  const dockTop = dockRect.top;
  const visibleBottom = Math.min(stripRect.bottom, dockTop);
  const ok = panelBottom <= visibleBottom + slack && panelRect.top >= stripRect.top - slack;
  return {
    ok,
    panelBottom,
    dockTop,
    detail: ok
      ? `panel.bottom(${panelBottom.toFixed(1)}) <= visibleBottom(${visibleBottom.toFixed(1)})`
      : `panel.bottom(${panelBottom.toFixed(1)}) > visibleBottom(${visibleBottom.toFixed(1)}) — cut hidden under dock/keyboard`,
  };
}
