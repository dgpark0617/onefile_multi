import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '컷톡 CutTok — 만화칸 실시간 채팅';
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
          background: 'linear-gradient(145deg, #1a1520 0%, #0b1020 45%, #122033 100%)',
          color: '#e8edf8',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 28, color: '#38bdf8', marginBottom: 16 }}>Amurtaht</div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>컷톡 · CutTok</div>
        <div style={{ fontSize: 32, color: '#8b97b5', marginTop: 24, maxWidth: 900 }}>
          말이 만화 컷으로 쌓이는 P2P 웹채팅
        </div>
      </div>
    ),
    { ...size },
  );
}
