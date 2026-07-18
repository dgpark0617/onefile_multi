# 코지월드 3D

Three.js(r128) 파스텔 오픈월드 + PeerJS 초대코드 멀티.

## 구조

- `src/world/cozyWorld.js` — 월드/조작/렌더 (시드 고정으로 클라이언트 동일 맵)
- `src/net/` — 초대코드 · PeerJS (`cozy-xxxxxx`)
- `src/ui/` — 로비 · HUD 스타일
- `src/main.js` — 로비 ↔ 월드 연결, POS 동기화
- `cozy-world-3d.html` — 원본 솔로 참고용
- `onefile_multi_cozy_world.html` — 빌드 산출물

## 명령

```bash
npm install
npm run dev      # http://localhost:4188
npm run build    # onefile_multi_cozy_world.html
```

원본 HTML을 수정했다면:

```bash
npm run extract  # cozy-world-3d.html → src/world/cozyWorld.js 재생성
```

## 멀티

호스트 권위 없이 **위치 스냅샷(POS)** 만 공유. 락스텝 없음.
앞으로 아이템/채팅/상호작용 추가 시 `src/net` 메시지 타입만 늘리면 됨.

## 장면 (Seabeard식)

- 주일학교 **집 6채** (우진·가현·영선·태미·남문·종묘) — 흩어진 배치, 문 앞 **E** 입장
- 집 설정은 `sundayScenes.js`의 `SUNDAY_KIDS[].house` (`x/z/rotY/style`) — **크기는 동일**, style로 구조만 다름
  (`classic` `dormer` `porch` `bay` `turret` `garden`)
- **엘리야** 말씀「하나님께 실패한 엘리야」(열왕기상 19장) — 바깥 문 1개 → 허브 → 3장면
  1. 낙심·로뎀나무 + **천사의 돌봄** (1~8 전반, 천사 5~7)
  2. 호렙산 **바람·지진·불** — 하나님이 계시지 않음 (8 후반~12 전반)
  3. **세미한 음성**과 새 사명 하사엘·예후·엘리사 (12 후반~16)
- 외울말씀 **시편 62:8** — 허브·각 장면·마을 표지판에 표시
  > 백성들아 시시로 그를 의지하고 그의 앞에 마음을 토하라 하나님은 우리의 피난처시로다.
- 멀티 `POS`에 `scene` 포함 — 같은 장면끼리만 서로 보임

## 캐릭터 이미지

얼굴 앞 플레인 슬롯 준비됨. 자세한 API는 `src/world/CHAR_IMAGES.md`.
- `setLocalImage` / `setRemoteImage` / `spawnNpc` + `setNpcImage`
