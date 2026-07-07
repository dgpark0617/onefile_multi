# Worms Phaser Migration (Steam-ready base)

지렁이 게임을 **Phaser + 모듈 분리**로 옮기기 위한 시작점입니다.

## 목표

- 개발: `src/`에서 모듈 단위로 유지보수
- 빌드: `onefile_multi_worms_phaser.html` 한 파일 산출
- 장기: Steam 출시 대비 구조(씬 분리, 로직 분리, 향후 네트워크 모듈 결합)

## 현재 상태

- `LobbyScene` + `WormArenaScene` 싱글 플레이 동작
- 기존 지렁이 규칙 일부를 Phaser 렌더/업데이트 루프로 이식
- lockstep 멀티는 아직 미연동 (다음 단계)

## 사용 방법

```bash
cd onefile_multi_worms_phaser
npm install
npm run dev
```

브라우저에서 `http://localhost:4173` 열기

## 원파일 빌드

```bash
npm run build
```

결과물:

- `onefile_multi_worms_phaser/onefile_multi_worms_phaser.html`

## 다음 단계 권장

1. lockstep 네트워크 레이어(`WwNet` 상당)를 별도 모듈로 결합
2. 입력/시뮬/렌더 3계층 분리
3. 모바일 터치 입력과 UI 오버레이 씬 추가
4. Electron/Tauri 패키징 + Steam 연동 준비
