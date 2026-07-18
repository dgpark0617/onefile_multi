# 캐릭터 이미지

캐릭터 **앞면(얼굴 앞 플레인)** 에 이미지를 붙입니다. 유저·NPC 공통 API입니다.

## 모듈

- `src/world/characterVisual.js`
  - `makeCharacterMesh(THREE, color, { index, imageUrl })`
  - `setCharacterImage(THREE, mesh, url | null)`

## 월드 API (`startCozyWorld` 반환)

```js
world.setLocalImage(url);          // 나
world.setRemoteImage(index, url);  // 다른 플레이어
world.spawnNpc(id, { x, z, imageUrl, color, label });
world.setNpcImage(id, url);
world.removeNpc(id);
```

## 에셋

이미지 URL은 http(s), data URL, 또는 빌드에 포함한 상대 경로를 쓰면 됩니다.
나중에 `public/chars/` 또는 `src/assets/chars/` 에 넣어 로드하면 됩니다.

기본값은 파스텔 플레이스홀더(이모지 원)가 표시됩니다.
