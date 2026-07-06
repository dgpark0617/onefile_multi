# Games Web — Next.js 포털

원파일 HTML 게임 **플레이·다운로드** 사이트.

## 구조 (저장소 루트 기준)

```
onefile_multi_*/     ← 원본 HTML (Git 필수)
web/                 ← 이 Next.js 앱 (Vercel Root Directory)
  src/data/games.json
  scripts/sync-games.mjs
  public/games/      ← 빌드 시 자동 생성 (gitignore)
```

## 로컬

```bash
cd web
npm install
npm run dev
```

## Vercel 자동 배포

**이 `Game` 폴더 전체가 단독 Git 저장소**라고 가정합니다. Amurtaht 모노레포가 아닙니다.

### 1) GitHub에 게임 저장소 push

저장소 루트에 `onefile_multi_*`, `web/` 등이 있어야 합니다.

### 2) Vercel 연결

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. **게임 전용** GitHub 저장소 Import
3. Configure:

| 항목 | 값 |
|------|-----|
| Framework | Next.js |
| **Root Directory** | **`web`** |
| Build Command | `npm run build` |
| Install Command | `npm install` |

4. **Deploy**

### 3) 자동 배포

- `main` push → Production
- PR / 기타 브랜치 → Preview

### 빌드 시 동작

`prebuild` → `sync-games`가 저장소 루트의 `onefile_multi_*/*.html`을 `public/games/`로 복사합니다.  
원본 HTML이 없으면 Vercel 빌드가 실패합니다.

### CLI (선택)

```bash
cd web
npx vercel login
npx vercel link
npx vercel --prod
```

## 새 게임 추가

1. `onefile_multi_xxx/`에 HTML 추가
2. `src/data/games.json` 등록
3. `git push`
