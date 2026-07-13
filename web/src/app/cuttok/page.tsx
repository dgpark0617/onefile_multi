import { Suspense } from 'react';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, cutTokAppJsonLd } from '@/lib/seo/metadata';
import { CUTTOK } from '@/lib/seo/site';
import './shell.css';
import './comic.css';
import ComicChatApp from './ComicChatApp';

/** 앱 엔트리 — FAQ 스키마는 노출 본문이 있는 /cuttok/about 에만 둠 */
export default function CutTokPage() {
  return (
    <div className="cc-shell">
      <JsonLd data={cutTokAppJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: '홈', path: '/' },
          { name: CUTTOK.name, path: CUTTOK.path },
        ])}
      />
      <Suspense
        fallback={
          <div className="cc-root">
            <p className="cc-status" style={{ padding: 16 }}>
              컷톡 불러오는 중…
            </p>
          </div>
        }
      >
        <ComicChatApp />
      </Suspense>
    </div>
  );
}
