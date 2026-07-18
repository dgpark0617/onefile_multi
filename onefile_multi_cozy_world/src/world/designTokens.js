/**
 * Warm Storybook Coast — Seabeard식 통일 팔레트
 * 색은 머티리얼에서 맞추고, CSS saturate는 미세 조정만.
 */

export const TOKENS = {
  // --- Surface (야외) — 파스텔에서 살짝 진하게 ---
  grassLight: 0x5a9a38,
  grassDeep: 0x348028,
  path: 0xb89060,
  pond: 0x2a88a0,
  pondRim: 0x589848,
  lily: 0x3a8830,
  trunk: 0x8a5830,
  leaf: [0x3a8e28, 0x2a7820, 0x4ca038, 0x287018],
  bush: 0x3a8830,
  stem: 0x3a8838,
  rock: 0x988878,
  fence: 0xc4a878,
  houseWall: 0xe8d0b0,
  houseDoor: 0x8a5828,
  houseChimney: 0xa06038,
  houseWin: 0x48a8b8,
  cottageRoofDefault: 0xb84058,

  // --- Lighting ---
  hemiSky: 0xc8e4ff,
  hemiGround: 0x6ca058,
  sun: 0xfff0d0,
  fill: 0x6aa0d8,
  ambientDay: 0.74,
  sunDay: 0.95,

  // --- Sky cycle (낮=청명한 파란하늘, 출몰만 따뜻한 색) ---
  skyKeys: [
    { p: 0.0, top: 0x1a2860, bot: 0x3a4878, fog: 0x2a3868 },
    { p: 0.2, top: 0xb86888, bot: 0xe8a878, fog: 0xc88878 },
    { p: 0.32, top: 0x3a88d0, bot: 0xa8d0f0, fog: 0x88b8e0 },
    { p: 0.5, top: 0x2a78d8, bot: 0x98ccf0, fog: 0x78b0e0 },
    { p: 0.68, top: 0x3a88d0, bot: 0xa8d0f0, fog: 0x88b8e0 },
    { p: 0.78, top: 0xc86838, bot: 0xe08858, fog: 0xd08050 },
    { p: 0.88, top: 0x384878, bot: 0x586090, fog: 0x485070 },
    { p: 1.0, top: 0x1a2860, bot: 0x3a4878, fog: 0x2a3868 },
  ],

  // --- Flowers / accents ---
  flower: [0xc83860, 0xc89818, 0x8850b8, 0xc85828, 0x3898b8],
  mushCap: [0xc03048, 0xc87820, 0x8040b0],
  petal: 0xc84068,
  fruit: [0xb82840, 0xc88810, 0x8038b0],

  // --- Pocket / story ---
  cosmosBg: 0x0a0818,
  islandSand: 0xc49868,
  islandRim: 0x7a5838,
  islandUnder: 0x4a3830,
  muralTint: "#e0c8a8",
  muralAccent: "#1a100c",
  muralWall: 0xa88060,
  exitDoor: 0x8a5020,

  // --- UI labels ---
  ink: "#1a100c",
  labelBg: "rgba(255,252,248,0.97)",
  labelBorder: "rgba(40,28,20,0.4)",

  // --- Player ---
  players: [0xc85078, 0x3888b8, 0x4c9830, 0xc87828],

  // --- Kids (채도 맞춘 패밀리) ---
  kids: {
    woojin: { color: 0x2a80b8, roof: 0x1a5898, accent: 0x58a8d0 },
    gahyun: { color: 0xc83860, roof: 0xa01838, accent: 0xd86888 },
    youngsun: { color: 0xa040b8, roof: 0x782898, accent: 0xb870d0 },
    taemi: { color: 0x4a9828, roof: 0x287018, accent: 0x68b840 },
    nammun: { color: 0xc87820, roof: 0xa04808, accent: 0xd89838 },
    jongmyo: { color: 0xb84878, roof: 0x902048, accent: 0xd06898 },
  },

  // --- Design panel defaults (필터는 약하게) ---
  design: {
    sat: 118,
    bri: 98,
    con: 110,
    exp: 102,
    warm: 5,
    fog: 0,
    shadow: 0,
    minimap: 1,
  },
};

/** CSS variables for lobby (same coast language) */
export const LOBBY_CSS_VARS = {
  "--coast-sand": "#e8d0b0",
  "--coast-sand-deep": "#d0b490",
  "--coast-ink": "#2a1c14",
  "--coast-muted": "#5a4838",
  "--coast-coral": "#b83850",
  "--coast-teal": "#2a8898",
  "--coast-green": "#3a8830",
  "--coast-sky": "#3a88d0",
};
