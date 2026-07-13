import Link from 'next/link';
import {
  CATEGORY_LABELS,
  downloadUrl,
  GAMES,
  type GameEntry,
} from '@/lib/games';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, cutTokFaqJsonLd } from '@/lib/seo/metadata';
import { CUTTOK, CUTTOK_FAQ, CUTTOK_FEATURES } from '@/lib/seo/site';

function GameCard({ game }: { game: GameEntry }) {
  return (
    <article className={`game-card${game.featured ? ' featured' : ''}`}>
      <div className="tag-row">
        <span className="tag">{CATEGORY_LABELS[game.category]}</span>
        {game.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
      <h2>{game.title}</h2>
      <p>{game.subtitle}</p>
      <div className="card-actions">
        <Link href={`/play/${game.slug}`} className="btn btn-primary">
          플레이
        </Link>
        <a
          href={downloadUrl(game.slug, game.downloadName)}
          download={game.downloadName}
          className="btn btn-secondary"
        >
          다운로드
        </a>
      </div>
    </article>
  );
}

export default function HomePage() {
  const featured = GAMES.filter((g) => g.featured);
  const rest = GAMES.filter((g) => !g.featured);

  return (
    <div className="container">
      <JsonLd
        data={breadcrumbJsonLd([{ name: '홈', path: '/' }])}
      />
      <JsonLd data={cutTokFaqJsonLd()} />

      <section className="hero cuttok-hero">
        <p className="hero-kicker">주요 서비스</p>
        <h1>
          {CUTTOK.name}
          <span className="hero-en"> {CUTTOK.nameEn}</span>
        </h1>
        <p>{CUTTOK.longDescription}</p>
        <div className="hero-actions">
          <Link href={CUTTOK.path} className="btn btn-primary">
            컷톡 시작하기
          </Link>
          <Link href={CUTTOK.aboutPath} className="btn btn-secondary">
            소개·FAQ
          </Link>
        </div>
      </section>

      <section className="home-features" aria-label="컷톡 특징">
        <h2 className="section-title">왜 컷톡인가</h2>
        <ul className="feature-grid">
          {CUTTOK_FEATURES.map((f) => (
            <li key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-faq" id="faq" aria-label="자주 묻는 질문">
        <h2 className="section-title">자주 묻는 질문</h2>
        <div className="home-faq-list">
          {CUTTOK_FAQ.map((item) => (
            <details key={item.q} open>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <p className="home-faq-more">
          <Link href={CUTTOK.aboutPath}>컷톡 소개 페이지에서 더 보기 →</Link>
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 className="section-title">다른 서비스</h2>
        <div className="game-grid">
          <article className="game-card">
            <div className="tag-row">
              <span className="tag">커뮤니티</span>
              <span className="tag">픽셀</span>
            </div>
            <h2>검신 (Geom-Shin)</h2>
            <p>검단신도시 실시간 픽셀 전광판 · 컷톡과 별도 서비스</p>
            <div className="card-actions">
              <Link href="/geomshin" className="btn btn-secondary">
                열기
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section id="games">
        <h2 className="section-title">게임 아카이브</h2>
        <p className="section-blurb">
          예전에 모은 브라우저 원파일 게임입니다. 턴제 등 일부는 계속 둘 수 있고,
          메인 제품은 컷톡입니다.
        </p>
        {featured.length > 0 && (
          <div className="game-grid" style={{ marginBottom: 20 }}>
            {featured.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        )}
        <div className="game-grid">
          {rest.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </section>
    </div>
  );
}
