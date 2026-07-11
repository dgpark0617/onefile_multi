/**
 * GPS ↔ 검단 추상 격자 매핑
 * - 네이버/카카오 지도 타일 미사용 (저작권). OSM/실좌표 bbox만 사용.
 * - 기획: 현장 격자 서 있으면 잉크 가속 + 체류 통계(B2B).
 */
import { GRID_H, GRID_W, inBounds } from './config';

/** 검단신도시 대략 bbox (lng/lat) */
export const GEOMDAN_BBOX = Object.freeze({
  minLng: 126.68,
  maxLng: 126.78,
  minLat: 37.58,
  maxLat: 37.65,
});

/** 집관 5분/1, 현장 1분/1 (5배) */
export const INK_REFILL_MS_REMOTE = 5 * 60 * 1000;
export const INK_REFILL_MS_ONSITE = 1 * 60 * 1000;

export function lngLatToCell(lng: number, lat: number): { x: number; y: number } | null {
  const { minLng, maxLng, minLat, maxLat } = GEOMDAN_BBOX;
  if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return null;
  const nx = (lng - minLng) / (maxLng - minLng);
  const ny = (maxLat - lat) / (maxLat - minLat);
  const x = Math.min(GRID_W - 1, Math.max(0, Math.floor(nx * GRID_W)));
  const y = Math.min(GRID_H - 1, Math.max(0, Math.floor(ny * GRID_H)));
  if (!inBounds(x, y)) return null;
  return { x, y };
}

export function isInsideGeomdan(lng: number, lat: number): boolean {
  return lngLatToCell(lng, lat) != null;
}
