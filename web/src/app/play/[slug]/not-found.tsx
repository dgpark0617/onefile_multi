import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
      <h1>게임을 찾을 수 없습니다</h1>
      <p style={{ color: 'var(--muted)' }}>삭제되었거나 아직 등록되지 않은 게임입니다.</p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>
        목록으로
      </Link>
    </div>
  );
}
