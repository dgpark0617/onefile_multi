import Link from 'next/link';
import {
  CATEGORY_LABELS,
  downloadUrl,
  GAMES,
  type GameEntry,
} from '@/lib/games';

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
      <section className="hero">
        <h1>브라우저 게임 아카이브</h1>
        <p>
          PeerJS 멀티·솔로 원파일 HTML 게임 모음입니다. 페이지에서 바로 플레이하거나
          단일 파일을 내려받아 오프라인에서 실행할 수 있습니다.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 className="section-title">검단 · 소셜</h2>
        <div className="game-grid">
          <article className="game-card featured">
            <div className="tag-row">
              <span className="tag">커뮤니티</span>
              <span className="tag">픽셀</span>
              <span className="tag">Phaser</span>
            </div>
            <h2>검신 (Geom-Shin)</h2>
            <p>검단신도시 실시간 픽셀 전광판 · 잉크 · 인접 확장</p>
            <div className="card-actions">
              <Link href="/geomshin" className="btn btn-primary">
                플레이
              </Link>
              <Link href="/geomshin/terms" className="btn btn-secondary">
                약관
              </Link>
            </div>
          </article>
          <article className="game-card featured">
            <div className="tag-row">
              <span className="tag">채팅</span>
              <span className="tag">만화칸</span>
              <span className="tag">PeerJS</span>
            </div>
            <h2>컷톡 (CutTok)</h2>
            <p>만화칸 웹채팅 · 감정·포즈 · Comic Chat 계승 (별도 서비스)</p>
            <div className="card-actions">
              <Link href="/cuttok" className="btn btn-primary">
                입장
              </Link>
            </div>
          </article>
        </div>
      </section>

      {featured.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 className="section-title">추천</h2>
          <div className="game-grid">
            {featured.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">전체 게임 ({GAMES.length})</h2>
        <div className="game-grid">
          {rest.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </section>
    </div>
  );
}
