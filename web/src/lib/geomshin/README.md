# 검신 (Geom-Shin)

검단신도시 실시간 픽셀 전광판 플랫폼.

## 스택

- **호스트**: 저장소 [`web/`](.) Next.js (`vercel.json` Root Directory = `web`)
- **렌더**: Phaser WebGL — 500×500 보드 텍스처 + 뷰포트 delta
- **규칙**: 픽셀 잉크(집관 5분=1 / 현장 1분=1, cap 200), 시작 씨앗 1회, 상하좌우 인접 확장
- **접속**: 아이디만 입력 (비밀번호 없음). `POST /api/geomshin/session`

## 실행

```bash
cd web
npm install
npm run dev
```

- 맵: http://localhost:3000/geomshin
- 약관: /geomshin/terms
- 관리 스텁: /geomshin/admin

## 멀티플레이 / 배포

| 환경 | 보드·유저 저장 | 비고 |
|------|----------------|------|
| `npm run dev` | 프로세스 메모리 | 같은 서버에 붙은 클라끼리 공유 |
| Vercel 서버리스 | 인스턴스마다 메모리 분리 | **진짜 멀티는 DB 필요** |
| Supabase 연결 후 | Postgres + (선택) Realtime | `supabase-schema.sql`, `.env.example` |

이 머신에서는 Vercel CLI 로그인·프로젝트 링크가 없어 **배포 URL은 확인하지 못했습니다.**  
`vercel.json`은 준비되어 있으니, 계정 연결 후 Root Directory=`web` 로 배포하면 됩니다.

Supabase를 쓰려면 `.env.example` → `.env.local` 에 URL/키를 넣고 알려 주세요. 그때 `store` 어댑터를 붙입니다.

## API

- `POST /api/geomshin/session` `{ userId }` — 아이디 입장
- `GET /api/geomshin/ink`
- `GET /api/geomshin/pixels?x0&y0&x1&y1`
- `POST /api/geomshin/seed` `{ userId, x, y }`
- `POST /api/geomshin/claim`
- `POST /api/geomshin/reward` · `lock` · `upload` · `admin` (스텁)
