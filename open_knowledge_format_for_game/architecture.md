---
type: architecture
title: 글자 마법사 파일 구조 및 개발자 가이드
description: 분리된 파일 구조(HTML, CSS, JS) 설명 및 에이전트 수정 지침
timestamp: 2026-06-29T22:00:00+09:00
---

# 📂 글자 마법사 파일 구조 및 에이전트 개발 가이드

이 문서는 게임의 전체 파일 구조와 주요 기능 추가/변경 시 어떤 파일의 어느 영역을 수정해야 하는지 설명합니다. AI 에이전트가 이 문서를 참고하여 즉시 수정 작업을 시작할 수 있도록 돕는 역할을 합니다.

## 1. 전체 파일 구조 및 역할

게임은 크게 4개의 주요 파일로 구성되어 있습니다.

| 파일명 | 경로 | 역할 |
| :--- | :--- | :--- |
| **HTML** | [word_wizard.html](file:///c:/Repo/Amurtaht/Game/word_wizard.html) | 게임 UI 뼈대 정의 (로비 화면, 게임 플레이 화면, 캔버스 영역, 입력창, 시스템 로그창 구조 등) |
| **CSS** | [word_wizard.css](file:///c:/Repo/Amurtaht/Game/word_wizard.css) | 프리미엄 라이트 테마 기반의 레이아웃 스타일, 카드 섀도우, 애니메이션 및 미디어 쿼리(모바일 대응) 정의 |
| **Core JS** | [word_wizard.js](file:///c:/Repo/Amurtaht/Game/word_wizard.js) | 단어 풀(`VOCAB_POOL`), 게임 상태 변수, P2P 통신(PeerJS) 및 AI 파트너 동료 로직, 물리 및 충돌 감지, 캔버스 렌더링 루프 |
| **Helper JS** | [pretext.js](file:///c:/Repo/Amurtaht/Game/pretext.js) | 캔버스 텍스트의 히트박스 계산, 라인 교차 판정, 텍스트 넓이 구하기 등 수학/유틸리티 헬퍼 함수 라이브러리 |

---

## 2. 작업별 주요 수정 파일 및 위치 안내

새로운 기능을 추가하거나 수정할 때 참고해야 할 파일 및 핵심 위치 지점입니다.

### ① 게임 단어(어휘) 추가 및 난이도 조절
- **수정 대상**: [word_wizard.js](file:///c:/Repo/Amurtaht/Game/word_wizard.js)
- **위치**: 최상단 `VOCAB_POOL` 상수 정의 영역
- **방법**: 뜻풀이가 포함된 객체 형태 `{ word: "단어", meaning: "뜻" }`로 리스트 추가/삭제.

### ② 게임 밸런스 튜닝 (속도, 체력, 공격 데미지 등)
- **수정 대상**: [word_wizard.js](file:///c:/Repo/Amurtaht/Game/word_wizard.js)
- **위치**: `updateGame()` 함수
  - **보스 하강 속도**: `boss.y += 0.003 * dt;`
  - **저주 낙하 및 조준 속도**: `speed` 관련 난수 조절 부분
  - **공격 및 피격 데미지**: `processPlayerInput()` 또는 `missiles` & `projectiles` 충돌 로직 내부 (`obs.hp -= 25;`, `player1Hp = Math.max(0, player1Hp - damage);`)

### ③ UI 스타일 변경 및 렌더링 스타일 수정
- **수정 대상**: [word_wizard.css](file:///c:/Repo/Amurtaht/Game/word_wizard.css) 및 [word_wizard.html](file:///c:/Repo/Amurtaht/Game/word_wizard.html)
- **위치**: 스타일 시트 최상단 `:root` 변수 및 컴포넌트별 클래스 정의
- **방법**: 테마 컬러 변경 시 `:root` 내의 HSL/HEX 색상 코드를 교체하고, 마크업 구조 변경 시 `word_wizard.html` 수정.

### ④ 캔버스 내 그래픽 렌더링 (보스, 플레이어, 파티클 연출)
- **수정 대상**: [word_wizard.js](file:///c:/Repo/Amurtaht/Game/word_wizard.js)
- **위치**: `draw()` 함수 및 파티클 연출 관련 `spawnParticles()`, `drawParticles()` 함수
- **방법**: HTML5 Canvas의 2D Context(`ctx`) API를 이용해 그래픽 프리미티브(도형, 선, 글자)를 렌더링하므로, 비주얼 연출 추가 시 `draw()` 함수의 해당 레이어 영역을 편집.

### ⑤ P2P 멀티플레이어 통신 데이터 추가
- **수정 대상**: [word_wizard.js](file:///c:/Repo/Amurtaht/Game/word_wizard.js)
- **위치**: `broadcastState()` 함수 및 `conn.on('data')` 핸들러
- **방법**: 호스트와 클라이언트가 동기화해야 할 새로운 상태값이 생긴 경우, `STATE` 메시지 패킷 구조에 속성을 추가하고 양쪽 수신 핸들러에서 동기화 코드를 대입.

---

## 3. 검증 (Verification) 및 테스트 지침

에이전트가 게임 기능을 수정하거나 새로 추가한 뒤에는 반드시 아래의 검증 과정을 거쳐 오작동이나 런타임 오류가 없는지 테스트해야 합니다.

### ① Playwright E2E 자동화 테스트
- **목적**: 브라우저 실행 시 콘솔 에러가 발생하는지, 싱글 플레이 화면이 정상 노출되는지 헤드리스 크롬 환경에서 테스트합니다.
- **실행 위치**: `c:\Repo\Amurtaht\Game`
- **실행 명령어**:
  ```bash
  npx playwright test
  ```
- **테스트 명세**: [game.spec.js](file:///c:/Repo/Amurtaht/Game/tests/game.spec.js) 파일에 기술되어 있습니다.

### ② 로컬 정적 서버 실행
- **목적**: PeerJS 또는 정적 에셋 로드 문제를 방지하기 위해 로컬 웹서버를 서빙하여 수동 테스트합니다.
- **실행 명령어**:
  ```bash
  python -m http.server 8080 --directory c:\Repo\Amurtaht\Game
  ```
- **접속 주소**: `http://localhost:8080/word_wizard.html`
