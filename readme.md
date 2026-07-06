# Amurtaht Games

브라우저 원파일 HTML 게임 모음 + Next.js 플레이·다운로드 포털.

> **단독 Git 저장소** — GitHub: `onefile_multi` (루트 = 이 폴더)

## 구조

```
(저장소 루트)
  onefile_multi_*/   ← 원본 HTML 게임
  web/               ← Next.js 포털 → Vercel Root Directory
  legacy/            ← 구버전·실험 (선택)
```

## 로컬 실행

```bash
cd web
npm install
npm run dev
```

- 홈: http://localhost:3000
- 플레이: `/play/soccer` 등

## Vercel 자동 배포

1. 이 폴더만 **새 GitHub 저장소**에 push
2. Vercel → Import → **Root Directory = `web`**
3. 이후 `main` push 시 자동 배포

상세: [web/README.md](web/README.md)

## 새 저장소 만들기 (최초 1회)

```bash
cd Game
git init
git add .
git commit -m "Initial games portal"
git branch -M main
git remote add origin https://github.com/dgpark0617/onefile_multi.git
git push -u origin main
```

## 문서

- [readme_textwizard.md](readme_textwizard.md) — 글자 마법사
- [onefile_multi_soccer/real_plan.md](onefile_multi_soccer/real_plan.md) — 미니 사커 택틱스
