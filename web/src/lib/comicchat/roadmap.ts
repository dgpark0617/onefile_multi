/**
 * 컷톡 향후 기획 방향 (미구현 — 방향성만)
 *
 * 1) 캐릭터 꾸미기 (인형옷 갈아입히기)
 *    - 기본 바디 위에 아이템 슬롯(모자·안경·아우터·손에 든 것 등)을 레이어로 합성
 *    - 사용자가 슬롯별 에셋을 고르거나, 얼굴/전신 사진을 교체(리사이즈·마스킹)해
 *      “내 캐릭터”로 저장
 *
 * 2) 감정·포즈 팩 / 꾸미기 팩 제작·판매 (먼 로드맵)
 *    - 팩 = Storage 파일 묶음 + pack.json 매니페스트 (감정 키 → 이미지 URL)
 *    - 채팅 메시지에는 packId + emotion + pose(+ 장착 아이템 id)만 실어 나르고
 *      Base64를 메시지/유저 로우에 넣지 않음
 *    - user_id → 소유 pack / 구매 기록 → CDN 캐시
 *    - draft → published → for_sale 상태, 마켓 결제·라이선스는 후속
 *
 * 3) 모바일 UX 원칙 (현재 구현 중)
 *    - 키보드 위 남는 화면 ≈ 작업 공간 → 만화 컷 최대화
 *    - 참가자·내 캐릭터·QR·큰 휠은 접고, 말/생각/외침·기분 칩만 입력바에
 */
export const CUTTOK_ROADMAP_NOTE =
  'See comments above — doll dress-up + sellable expression packs (Storage + packId), not Base64 in chat.';
