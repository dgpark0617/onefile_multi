import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '컷톡 CutTok — Amurtaht';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 72,
          background: 'linear-gradient(145deg, #0b1020 0%, #141b2f 50%, #1a1520 100%)',
          color: '#e8edf8',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700 }}>컷톡</div>
        <div style={{ fontSize: 36, color: '#8b97b5', marginTop: 20 }}>
          만화칸 실시간 채팅 · CutTok
        </div>
      </div>
    ),
    { ...size },
  );
}
