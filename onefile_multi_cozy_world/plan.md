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
