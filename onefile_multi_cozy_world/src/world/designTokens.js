/**
 * Warm Storybook Coast — Seabeard식 통일 팔레트
 * 색은 머티리얼에서 맞추고, CSS saturate는 미세 조정만.
 */

export const TOKENS = {
  // --- Surface (야외) ---
  grassLight: 0x6aaa48,
  grassDeep: 0x3e8a32,
  path: 0xc9a878,
  pond: 0x3aa0b8,
  pondRim: 0x6ab058,
  lily: 0x4a9840,
  trunk: 0xa07040,
  leaf: [0x4a9e38, 0x3a8830, 0x5cb048, 0x348028],
  bush: 0x4a9840,
  stem: 0x4a9848,
  rock: 0xa89888,
  fence: 0xd4b890,
  houseWall: 0xf0dcc4,
  houseDoor: 0x9a6838,
  houseChimney: 0xb07048,
  houseWin: 0x5ab8c8,
  cottageRoofDefault: 0xc85068,

  // --- Lighting ---
  hemiSky: 0xffe6d0,
  hemiGround: 0x7cb068,
  sun: 0xffe4bc,
  fill: 0x88b0d8,
  ambientDay: 0.78,
  sunDay: 0.92,

  // --- Sky cycle ---
  skyKeys: [
    { p: 0.0, top: 0x3a4878, bot: 0x6a5a98, fog: 0x585088 },
    { p: 0.2, top: 0xd86888, bot: 0xffb888, fog: 0xe09888 },
    { p: 0.35, top: 0x5aa8d8, bot: 0xffd0a8, fog: 0xc0d0e0 },
    { p: 0.5, top: 0x4898d0, bot: 0xffdcb0, fog: 0xb0cce0 },
    { p: 0.7, top: 0xd86838, bot: 0xe08868, fog: 0xe09870 },
    { p: 0.85, top: 0x485888, bot: 0x7868a0, fog: 0x685888 },
    { p: 1.0, top: 0x3a4878, bot: 0x6a5a98, fog: 0x585088 },
  ],

  // --- Flowers / accents ---
  flower: [0xd84870, 0xd8a828, 0x9860c8, 0xd86838, 0x48a8c8],
  mushCap: [0xd04058, 0xd88830, 0x9050c0],
  petal: 0xd85078,
  fruit: [0xc83850, 0xd89820, 0x9048c0],

  // --- Pocket / story ---
  cosmosBg: 0x0a0818,
  islandSand: 0xd4a878,
  islandRim: 0x8a6848,
  islandUnder: 0x5a4840,
  muralTint: "#e8d4b8",
  muralAccent: "#1a100c",
  muralWall: 0xb89070,
  gatePillar: 0xc8a878,
  exitDoor: 0x9a6030,

  // --- UI labels ---
  ink: "#1a100c",
  labelBg: "rgba(255,252,248,0.97)",
  labelBorder: "rgba(40,28,20,0.4)",

  // --- Player ---
  players: [0xd86088, 0x4898c8, 0x5ca840, 0xd88838],

  // --- Kids (채도 맞춘 패밀리) ---
  kids: {
    woojin: { color: 0x3a90c8, roof: 0x2a68a8, accent: 0x68b8e0 },
    gahyun: { color: 0xd84870, roof: 0xb02848, accent: 0xe87898 },
    youngsun: { color: 0xb050c8, roof: 0x8838a8, accent: 0xc880e0 },
    taemi: { color: 0x5aa838, roof: 0x388028, accent: 0x78c850 },
    nammun: { color: 0xd88830, roof: 0xb05818, accent: 0xe8a848 },
    jongmyo: { color: 0xc85888, roof: 0xa03058, accent: 0xe078a8 },
  },

  // --- Design panel defaults (필터는 약하게) ---
  design: {
    sat: 112,
    bri: 100,
    con: 108,
    exp: 104,
    warm: 4,
    fog: 0,
    petal: 48,
    shadow: 0,
    minimap: 1,
  },
};

/** CSS variables for lobby (same coast language) */
export const LOBBY_CSS_VARS = {
  "--coast-sand": "#f0dcc4",
  "--coast-sand-deep": "#e0c4a0",
  "--coast-ink": "#2a1c14",
  "--coast-muted": "#6a5848",
  "--coast-coral": "#c84860",
  "--coast-teal": "#3a98a8",
  "--coast-green": "#4a9840",
  "--coast-sky": "#8ec8e8",
};
