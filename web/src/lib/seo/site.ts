/** 사이트·컷톡 SEO/AEO 공통 상수 */

export const SITE_NAME = 'Amurtaht';
export const SITE_TAGLINE = '컷톡 · 만화칸 실시간 채팅';

/** 배포 도메인 — 커스텀 도메인 있으면 NEXT_PUBLIC_SITE_URL 우선 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://onefile-multi.vercel.app';
}

export const CUTTOK = {
  name: '컷톡',
  nameEn: 'CutTok',
  path: '/cuttok',
  aboutPath: '/cuttok/about',
  title: '컷톡(CutTok) — 만화칸 실시간 채팅',
  shortDescription:
    '말이 만화 컷으로 쌓이는 P2P 웹채팅. 방 코드·QR로 바로 입장, 대화는 서버에 저장하지 않습니다.',
  longDescription:
    '컷톡(CutTok)은 Microsoft Comic Chat 계보의 만화칸 채팅입니다. 말·생각·외침 풍선과 감정·포즈로 대화를 연출하고, PeerJS로 브라우저끼리 직접 연결합니다. 계정 없이 방 코드나 QR로 입장하며, 대화 기록은 방장이 탭을 닫으면 사라집니다.',
  keywords: [
    '컷톡',
    'CutTok',
    '만화 채팅',
    '만화칸 채팅',
    'Comic Chat',
    '웹툰 채팅',
    'P2P 채팅',
    'PeerJS',
    '실시간 채팅',
    '말풍선 채팅',
    '캐릭터 채팅',
  ],
} as const;

/** AEO: 질문에 바로 답하는 FAQ (페이지에 그대로 노출) */
export const CUTTOK_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: '컷톡(CutTok)이란 무엇인가요?',
    a: '컷톡은 채팅 메시지가 만화 컷·말풍선으로 쌓이는 브라우저 채팅 서비스입니다. 캐릭터·감정·포즈를 고르고, 방 코드나 QR로 친구와 바로 대화할 수 있습니다.',
  },
  {
    q: '컷톡은 앱 설치가 필요한가요?',
    a: '아니요. 모바일·PC 브라우저에서 /cuttok 주소만 열면 됩니다. 아이폰 사파리와 안드로이드 크롬에서도 동작하도록 맞춰 두었습니다.',
  },
  {
    q: '대화 내용이 서버에 저장되나요?',
    a: '아니요. 컷톡은 대화 DB를 두지 않습니다. 메시지는 방장 브라우저 메모리에만 있으며, 방장이 탭을 닫으면 대화는 사라집니다.',
  },
  {
    q: '어떻게 방에 입장하나요?',
    a: '방장이 ‘방 만들기’로 코드를 생성하면, 게스트는 같은 코드를 입력하거나 QR을 스캔해 입장합니다. 계정 로그인 없이 닉네임과 캐릭터만 고르면 됩니다.',
  },
  {
    q: 'Comic Chat과 같은 건가요?',
    a: '컷톡은 Microsoft Comic Chat(1996)의 연출 아이디어(만화칸·말풍선·감정)를 계승한 독립 서비스입니다. MS 아트·캐릭터 이름은 사용하지 않습니다.',
  },
  {
    q: '검신(Geom-Shin)과 같은 서비스인가요?',
    a: '아닙니다. 컷톡은 검신과 별도인 만화칸 채팅 서비스입니다. 검신은 검단신도시 픽셀 전광판 커뮤니티이고, 컷톡은 실시간 만화 채팅에 집중합니다.',
  },
];

export const CUTTOK_FEATURES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: '만화칸으로 쌓이는 대화',
    body: '같은 화자가 이어서 말하면 새 컷이 생기고, 여러 사람의 말은 한 컷에 모일 수 있습니다. 웹툰처럼 아래로 읽습니다.',
  },
  {
    title: '말 · 생각 · 외침',
    body: '말풍선 종류와 기분을 고르거나 자동으로 맞출 수 있습니다. 캐릭터 표정·포즈가 함께 바뀝니다.',
  },
  {
    title: '방 코드 · QR 초대',
    body: '링크나 QR만 공유하면 바로 같은 방에 들어옵니다. PeerJS P2P로 브라우저끼리 연결됩니다.',
  },
  {
    title: '대화 비저장',
    body: '서버에 채팅을 쌓지 않습니다. 가벼운 수다·즉석 모임에 맞고, 방 종료와 함께 내용이 사라집니다.',
  },
];
