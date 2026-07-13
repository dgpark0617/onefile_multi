import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import {
  breadcrumbJsonLd,
  buildCutTokAboutMetadata,
  cutTokAppJsonLd,
  cutTokFaqJsonLd,
} from '@/lib/seo/metadata';
import {
  CUTTOK,
  CUTTOK_FAQ,
  CUTTOK_FEATURES,
  SITE_NAME,
} from '@/lib/seo/site';
import './about.css';

export const metadata: Metadata = buildCutTokAboutMetadata();

export default function CutTokAboutPage() {
  return (
    <div className="cc-about container">
      <JsonLd data={cutTokAppJsonLd()} />
      <JsonLd data={cutTokFaqJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: '홈', path: '/' },
          { name: CUTTOK.name, path: CUTTOK.path },
          { name: '소개', path: CUTTOK.aboutPath },
        ])}
      />

      <nav className="cc-about-crumb" aria-label="경로">
        <Link href="/">홈</Link>
        <span aria-hidden> / </span>
        <Link href={CUTTOK.path}>{CUTTOK.name}</Link>
        <span aria-hidden> / </span>
        <span>소개</span>
      </nav>

      <header className="cc-about-hero">
        <p className="cc-about-kicker">{SITE_NAME} 주요 서비스</p>
        <h1>
          {CUTTOK.name}
          <span className="cc-about-en"> {CUTTOK.nameEn}</span>
        </h1>
        <p className="cc-about-lead">{CUTTOK.longDescription}</p>
        <div className="cc-about-cta">
          <Link href={CUTTOK.path} className="btn btn-primary">
            컷톡 시작하기
          </Link>
          <Link href="/" className="btn btn-secondary">
            홈으로
          </Link>
        </div>
      </header>

      <section className="cc-about-section">
        <h2>이런 채팅입니다</h2>
        <ul className="cc-about-features">
          {CUTTOK_FEATURES.map((f) => (
            <li key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="cc-about-section">
        <h2>시작 방법</h2>
        <ol className="cc-about-steps">
          <li>
            <Link href={CUTTOK.path}>컷톡</Link>에서 닉네임과 캐릭터를 고릅니다.
          </li>
          <li>방장이 <strong>방 만들기</strong>로 코드를 만듭니다.</li>
          <li>친구는 코드 입력 또는 QR 스캔으로 같은 방에 들어옵니다.</li>
          <li>말을 치면 만화 컷·말풍선으로 대화가 쌓입니다.</li>
        </ol>
      </section>

      <section className="cc-about-section" id="faq">
        <h2>자주 묻는 질문</h2>
        <div className="cc-about-faq">
          {CUTTOK_FAQ.map((item) => (
            <details key={item.q} open>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="cc-about-section">
        <h2>한 줄 요약</h2>
        <p>
          <strong>{CUTTOK.name}</strong>는 설치 없이 브라우저에서 쓰는{' '}
          <strong>만화칸 실시간 채팅</strong>입니다. 계정·대화 DB 없이 방
          코드로 만나고, 탭을 닫으면 대화는 사라집니다.
        </p>
      </section>

      <p className="cc-about-foot">
        <Link href={CUTTOK.path} className="btn btn-primary">
          지금 방 만들기
        </Link>
      </p>
    </div>
  );
}
