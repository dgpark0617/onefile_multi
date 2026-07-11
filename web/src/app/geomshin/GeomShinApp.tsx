'use client';

import dynamic from 'next/dynamic';

const GeomShinClient = dynamic(() => import('./GeomShinClient'), {
  ssr: false,
  loading: () => (
    <div className="gs-root">
      <div className="gs-phaser-host gs-map-skel">검신 맵 여는 중…</div>
    </div>
  ),
});

export default function GeomShinApp() {
  return <GeomShinClient />;
}
