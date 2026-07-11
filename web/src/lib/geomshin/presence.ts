/**
 * B2B 체류·밀집도 수집
 * - 플레이 맵과 분리: /geomshin/presence 방문 지도에서 시각화
 * - 목적: 어디서·얼마나·몇 시에 접속했는지 (광고 타겟 지표)
 */
export type PresenceHit = {
  userId: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  atMs: number;
  onsite: boolean;
};

type PresenceStore = {
  hits: PresenceHit[];
};

declare global {
  // eslint-disable-next-line no-var
  var __geomshinPresence: PresenceStore | undefined;
}

function store(): PresenceStore {
  if (!globalThis.__geomshinPresence) {
    globalThis.__geomshinPresence = { hits: [] };
  }
  return globalThis.__geomshinPresence;
}

const MAX_HITS = 50_000;

export function recordPresence(hit: PresenceHit): void {
  const s = store();
  s.hits.push(hit);
  if (s.hits.length > MAX_HITS) s.hits.splice(0, s.hits.length - MAX_HITS);
}

/** 격자별 최근 N분 히트 수 */
export function densityByCell(sinceMs: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const h of store().hits) {
    if (h.atMs < sinceMs) continue;
    if (h.x < 0 || h.y < 0) continue;
    const key = `${h.x},${h.y}`;
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

/** 최근 방문 이벤트 (시간순, 최신 먼저) */
export function recentVisits(limit = 100, nowMs = Date.now()) {
  const dayAgo = nowMs - 24 * 60 * 60 * 1000;
  return store()
    .hits.filter((h) => h.atMs >= dayAgo && h.x >= 0 && h.y >= 0)
    .slice(-limit)
    .reverse()
    .map((h) => ({
      x: h.x,
      y: h.y,
      lat: h.lat,
      lng: h.lng,
      atMs: h.atMs,
      onsite: h.onsite,
      // 개인식별 최소화 — userId 원문 미노출
      anon: h.userId.slice(0, 4) + '…',
    }));
}

export function presenceSummary(nowMs = Date.now()) {
  const hourAgo = nowMs - 60 * 60 * 1000;
  const dens = densityByCell(hourAgo);
  const top = [...dens.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([cell, n]) => {
      const [xs, ys] = cell.split(',');
      const x = Number(xs);
      const y = Number(ys);
      return { cell, x, y, hits: n };
    })
    .filter((c) => Number.isFinite(c.x) && Number.isFinite(c.y) && c.x >= 0 && c.y >= 0);
  const visits = recentVisits(80, nowMs);
  return {
    totalHits: store().hits.length,
    lastHourUniqueCells: dens.size,
    topCells: top,
    visits,
    note: 'B2B 방문 지도용 — 어디서·몇 시·얼마나. 익명화·판매 대시보드는 후속',
  };
}
