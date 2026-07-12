const ADS = [
  {
    bg: ["#1e3a5f", "#0f766e"],
    title: "AMURTAHT GAMES",
    sub: "광고 자리 · AdSense 예정",
  },
  {
    bg: ["#4c1d95", "#db2777"],
    title: "NEW STAGE",
    sub: "결과 화면 더미 배너",
  },
  {
    bg: ["#854d0e", "#ea580c"],
    title: "PLAY MORE",
    sub: "테스트 이미지 광고",
  },
];

function svgDataUri(ad) {
  const [c1, c2] = ad.bg;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="320" height="100" rx="14" fill="url(#g)"/>
  <rect x="10" y="10" width="300" height="80" rx="10" fill="rgba(255,255,255,0.08)"/>
  <text x="160" y="44" text-anchor="middle" fill="#f8fafc" font-size="16" font-family="Segoe UI,sans-serif" font-weight="700">${ad.title}</text>
  <text x="160" y="70" text-anchor="middle" fill="#e2e8f0" font-size="12" font-family="Segoe UI,sans-serif">${ad.sub}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 게임 오버/클리어 오버레이의 더미 광고 이미지를 갱신 */
export function refreshEndgameAd() {
  const img = document.querySelector("#overlay .ad-slot-img");
  const slot = document.querySelector("#overlay .ad-slot");
  if (!img || !slot) return;
  const ad = ADS[Math.floor(Math.random() * ADS.length)];
  img.src = svgDataUri(ad);
  img.alt = `${ad.title} (더미 광고)`;
  slot.classList.add("show");
}
