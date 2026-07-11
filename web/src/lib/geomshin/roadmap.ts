/**
 * =============================================================================
 * 검신(Geom-Shin) — 확장 기획 메모 (코드 반영용)
 * =============================================================================
 *
 * [동기화]
 * - 칠하기: 로컬 즉시 반영 → 서버는 도착 순서대로 덮어쓰기(LWW). 별도 충돌 UI 없음.
 * - 인접 확장 규칙은 유지(내 영역에서만 뻗어나감).
 *
 * [접속]
 * - 아이디만 입력해 시작 (비밀번호 없음). 같은 아이디 = 같은 시민.
 * - 배포 멀티플레이 보드 공유는 Supabase(또는 동급 DB) 필요 — Vercel 서버리스 메모리는 공유 안 됨.
 *
 * [접속 즉시]
 * - HTML5 Geolocation 동의 팝업.
 * - 거부 시에도 플레이 가능(집관). GPS는 플레이 카메라와 분리.
 *
 * [1] GPS = B2B 방문 로그 (+ 현장 잉크 버프)
 * [2] 만원의 행복 QR — 7일 만료 출석 잉크 충전
 * [3] 바이럴 투트랙 — 아이돌 도트 / 라이더 QR (planned)
 *
 * 용어: 잉크 / 수정 권한 / 덮어쓰기 / 쿨타임
 * =============================================================================
 */

export const GEOM_SHIN_ROADMAP = Object.freeze({
  optimisticPaint: true,
  lastWriteWins: true,
  idLoginNoPassword: true,
  geolocationConsent: true,
  onsiteInkBoost: true,
  b2bPresenceMap: 'stub',
  qrSevenDay: true,
  supabaseBoard: 'planned',
  viralIdolDots: 'planned',
  viralRiderQr: 'planned',
});
