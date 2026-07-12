'use client';

import { Suspense } from 'react';
import './comic.css';
import ComicChatApp from './ComicChatApp';

export default function CutTokPage() {
  return (
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
  );
}
