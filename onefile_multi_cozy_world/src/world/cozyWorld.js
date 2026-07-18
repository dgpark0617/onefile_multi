/** Cozy World 3D — expects global THREE (r128). */
import { mulberry32 } from "../core/rng.js";
import { makeCharacterMesh, setCharacterImage } from "./characterVisual.js";
import { buildSundayContent, SUNDAY_KIDS } from "./sundayScenes.js";

const PLAYER_COLORS = [0xe86890, 0x4aa8d8, 0x6cb848, 0xe89840];

/**
 * @param {{ mount?: HTMLElement, myIndex?: number, seed?: number, onPose?: (p:any)=>void, localImageUrl?: string|null }} opts
 */
export function startCozyWorld(opts = {}) {
  const THREE = globalThis.THREE;
  if (!THREE) throw new Error("THREE is not loaded");
  const mount = opts.mount || document.getElementById("gameMount") || document.body;
  const myIndex = opts.myIndex ?? 0;
  const seed = (opts.seed ?? 0xc02a01) >>> 0;
  const rand = mulberry32(seed);
  const onPose = opts.onPose || null;
  let running = true;
  let rafId = 0;


// ---------- 기본 세팅 ----------
const scene = new THREE.Scene();
// 동숲식: 짧은 지평선 — 멀리 안 보이게 하되 하늘색에 녹임
const HORIZON_FOG_NEAR = 28;
const HORIZON_FOG_FAR = 58;
const CULL_DIST = 54;
const REMOTE_HIDE_DIST = 52;
const fogColor = 0xc8d8e0;
scene.fog = new THREE.Fog(fogColor, HORIZON_FOG_NEAR, HORIZON_FOG_FAR);

const camera = new THREE.PerspectiveCamera(37, innerWidth/innerHeight, 0.1, 60);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputEncoding = THREE.sRGBEncoding;
mount.appendChild(renderer.domElement);
renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";

const DESIGN_KEY = "cozy_world_design_v8";
// Seabeard식: 파스텔 유지하되 채도·대비 진하게
const DESIGN_DEFAULTS = {
  sat: 152, bri: 102, con: 122, exp: 110, warm: 6, fog: 42, petal: 58, shadow: 0, minimap: 1,
};
function loadDesign() {
  try {
    return { ...DESIGN_DEFAULTS, ...JSON.parse(localStorage.getItem(DESIGN_KEY) || "{}") };
  } catch {
    return { ...DESIGN_DEFAULTS };
  }
}
function saveDesign(d) {
  try { localStorage.setItem(DESIGN_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}
let design = loadDesign();
let petalMatRef = null;
let petalsRef = null;

// ---------- 색감·디자인 설정 패널 ----------
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
settingsBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsPanel?.classList.toggle('open');
});
document.addEventListener('pointerdown', (e) => {
  if (!settingsPanel?.classList.contains('open')) return;
  if (settingsPanel.contains(e.target) || settingsBtn?.contains(e.target)) return;
  settingsPanel.classList.remove('open');
});

const satSlider = document.getElementById('satSlider');
const briSlider = document.getElementById('briSlider');
const conSlider = document.getElementById('conSlider');
const expSlider = document.getElementById('expSlider');
const warmSlider = document.getElementById('warmSlider');
const fogSlider = document.getElementById('fogSlider');
const petalSlider = document.getElementById('petalSlider');
const shadowCheck = document.getElementById('shadowCheck');
const minimapCheck = document.getElementById('minimapCheck');
const satVal = document.getElementById('satVal');
const briVal = document.getElementById('briVal');
const conVal = document.getElementById('conVal');
const expVal = document.getElementById('expVal');
const warmVal = document.getElementById('warmVal');
const fogVal = document.getElementById('fogVal');
const petalVal = document.getElementById('petalVal');
const minimapWrap = document.getElementById('minimapWrap');

function syncDesignInputs() {
  if (satSlider) satSlider.value = design.sat;
  if (briSlider) briSlider.value = design.bri;
  if (conSlider) conSlider.value = design.con;
  if (expSlider) expSlider.value = design.exp;
  if (warmSlider) warmSlider.value = design.warm;
  if (fogSlider) fogSlider.value = design.fog;
  if (petalSlider) petalSlider.value = design.petal;
  if (shadowCheck) shadowCheck.checked = !!design.shadow;
  if (minimapCheck) minimapCheck.checked = !!design.minimap;
}

function readDesignFromInputs() {
  design = {
    sat: +(satSlider?.value ?? design.sat),
    bri: +(briSlider?.value ?? design.bri),
    con: +(conSlider?.value ?? design.con),
    exp: +(expSlider?.value ?? design.exp),
    warm: +(warmSlider?.value ?? design.warm),
    fog: +(fogSlider?.value ?? design.fog),
    petal: +(petalSlider?.value ?? design.petal),
    shadow: shadowCheck?.checked ? 1 : 0,
    minimap: minimapCheck?.checked ? 1 : 0,
  };
}

function applyDesignSettings() {
  const warm = design.warm | 0;
  renderer.domElement.style.filter =
    `saturate(${design.sat}%) brightness(${design.bri}%) contrast(${design.con}%) hue-rotate(${warm}deg)`;
  renderer.toneMappingExposure = design.exp / 100;
  if (satVal) satVal.textContent = design.sat + '%';
  if (briVal) briVal.textContent = design.bri + '%';
  if (conVal) conVal.textContent = design.con + '%';
  if (expVal) expVal.textContent = (design.exp / 100).toFixed(2);
  if (warmVal) warmVal.textContent = (warm >= 0 ? '+' : '') + warm + '°';

  // 동숲식 지평선: 발밑은 맑고, 먼 곳이 하늘색 안개로 녹음 (짙은 안개 느낌 아님)
  const fogAmt = design.fog / 100;
  scene.fog.near = THREE.MathUtils.lerp(36, 18, fogAmt);
  scene.fog.far = THREE.MathUtils.lerp(70, 46, fogAmt);
  // 하늘 돔(SKY_RADIUS)이 far에 잘리지 않게
  camera.far = Math.max(scene.fog.far + 8, SKY_RADIUS + 6);
  camera.updateProjectionMatrix();
  if (fogVal) {
    fogVal.textContent = fogAmt < 0.25 ? '멀게' : fogAmt < 0.55 ? '보통' : fogAmt < 0.8 ? '가까이' : '짙음';
  }

  if (petalMatRef) {
    petalMatRef.opacity = 0.15 + (design.petal / 100) * 0.75;
    petalMatRef.visible = design.petal > 2;
  }
  if (petalsRef) {
    for (const p of petalsRef) p.visible = design.petal > 2;
  }
  if (petalVal) petalVal.textContent = design.petal + '%';

  renderer.shadowMap.enabled = !!design.shadow;
  sun.castShadow = !!design.shadow;
  if (minimapWrap) minimapWrap.classList.toggle('hidden-ui', !design.minimap);

  saveDesign(design);
}

function onDesignInput() {
  readDesignFromInputs();
  applyDesignSettings();
}

[satSlider, briSlider, conSlider, expSlider, warmSlider, fogSlider, petalSlider]
  .forEach((s) => s?.addEventListener('input', onDesignInput));
shadowCheck?.addEventListener('change', onDesignInput);
minimapCheck?.addEventListener('change', onDesignInput);

document.getElementById('resetBtn')?.addEventListener('click', () => {
  design = { ...DESIGN_DEFAULTS };
  syncDesignInputs();
  applyDesignSettings();
});

syncDesignInputs();

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- 하늘: 그라데이션 돔 (카메라 far 안에 들어와야 함) ----------
const SKY_RADIUS = 52;
const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 24, 16);
const skyColors = [];
const skyMix = new Float32Array(skyGeo.attributes.position.count);
const topColor = new THREE.Color(0x5aa8e0);
const bottomColor = new THREE.Color(0xffc8a0);
const posAttrSky = skyGeo.attributes.position;
for (let i = 0; i < posAttrSky.count; i++) {
  const y = posAttrSky.getY(i);
  const tmix = THREE.MathUtils.clamp((y / SKY_RADIUS) * 0.5 + 0.5, 0, 1);
  skyMix[i] = tmix;
  const c = bottomColor.clone().lerp(topColor, tmix);
  skyColors.push(c.r, c.g, c.b);
}
skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
const skyColorAttr = skyGeo.attributes.color;
const skyMat = new THREE.MeshBasicMaterial({
  vertexColors: true,
  side: THREE.BackSide,
  fog: false,
  depthWrite: false,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.renderOrder = -10;
scene.add(sky);
scene.background = new THREE.Color(0x5aa8e0);

// 뭉게구름 — 시야 안 하늘 링에 배치 (멀리 흩어지면 안 보임)
const cloudMat = new THREE.MeshBasicMaterial({
  color: 0xfff0e8,
  transparent: true,
  opacity: 0.9,
  fog: false,
  depthWrite: false,
});
const cloudGeo = new THREE.SphereGeometry(1, 6, 6);

function makeCloud(x, y, z, scale){
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = (0.7 + rand() * 0.55) * scale;
    const puff = new THREE.Mesh(cloudGeo, cloudMat);
    puff.scale.setScalar(s);
    puff.position.set(
      (rand() - 0.5) * 2.4 * scale,
      (rand() - 0.5) * 0.45 * scale,
      (rand() - 0.5) * 1.3 * scale
    );
    g.add(puff);
  }
  g.position.set(x, y, z);
  g.userData.drift = 0.15 + rand() * 0.25;
  g.userData.baseY = y;
  g.userData.bob = rand() * Math.PI * 2;
  scene.add(g);
  return g;
}
const clouds = [];
for (let i = 0; i < 9; i++) {
  const ang = (i / 9) * Math.PI * 2 + rand() * 0.25;
  const dist = 22 + rand() * 28;
  clouds.push(
    makeCloud(
      Math.cos(ang) * dist,
      20 + rand() * 10,
      Math.sin(ang) * dist,
      3.2 + rand() * 2.2
    )
  );
}

// ---------- 조명 ----------
const ambient = new THREE.HemisphereLight(0xffe8d0, 0x88c070, 0.85);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffe8c0, 0.95);
sun.position.set(18, 26, 14);
sun.castShadow = false;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.camera.far = 80;
sun.shadow.bias = -0.002;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0x88b8e0, 0.28);
fillLight.position.set(-15, 10, -10);
scene.add(fillLight);

// ---------- 밤낮 · 별 · 달 · 별똥별 (동숲식 부드러운 밤) ----------
const DAY_CYCLE_MS = 5 * 60 * 1000; // 5분 = 하루 (벽시계 동기 → 멀티 동일)
const _tmpC = new THREE.Color();
const _lerpTop = new THREE.Color();
const _lerpBot = new THREE.Color();
const _lerpFog = new THREE.Color();
const _paintTop = new THREE.Color();
const _paintBot = new THREE.Color();
const _paintC = new THREE.Color();

// Seabeard식: 또렷한 하늘·지평선 (연한 파스텔 탈피)
const SKY_KEYS = [
  { p: 0.0, top: 0x3a4878, bot: 0x7868a8, fog: 0x685898 }, // 자정
  { p: 0.2, top: 0xe06088, bot: 0xffb080, fog: 0xe8a090 }, // 새벽
  { p: 0.35, top: 0x5aa8e0, bot: 0xffc8a0, fog: 0xc8d8e0 }, // 오전
  { p: 0.5, top: 0x4098d8, bot: 0xffd8b0, fog: 0xb0d0e8 }, // 정오
  { p: 0.7, top: 0xe06830, bot: 0xe88868, fog: 0xe8a078 }, // 노을
  { p: 0.85, top: 0x485888, bot: 0x8870a8, fog: 0x786898 }, // 초저녁
  { p: 1.0, top: 0x3a4878, bot: 0x7868a8, fog: 0x685898 }, // 자정
];

function sampleSkyKey(phase) {
  const p = ((phase % 1) + 1) % 1;
  let a = SKY_KEYS[0], b = SKY_KEYS[1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (p >= SKY_KEYS[i].p && p <= SKY_KEYS[i + 1].p) {
      a = SKY_KEYS[i];
      b = SKY_KEYS[i + 1];
      break;
    }
  }
  const t = (p - a.p) / Math.max(1e-6, b.p - a.p);
  const st = t * t * (3 - 2 * t);
  return { a, b, t: st };
}

function paintSky(topHex, botHex) {
  _paintTop.setHex(topHex);
  _paintBot.setHex(botHex);
  for (let i = 0; i < skyMix.length; i++) {
    _paintC.copy(_paintBot).lerp(_paintTop, skyMix[i]);
    skyColorAttr.setXYZ(i, _paintC.r, _paintC.g, _paintC.b);
  }
  skyColorAttr.needsUpdate = true;
}

// 별 (포인트)
const STAR_COUNT = 120;
const starPositions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  const u = rand();
  const v = rand();
  const theta = u * Math.PI * 2;
  const phi = Math.acos(THREE.MathUtils.clamp(0.15 + v * 0.85, -1, 1)); // 위쪽 반구
  const r = 46; // 카메라 far 안쪽
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.cos(phi);
  starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xfff8ff,
  size: 3.2,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0,
  fog: false,
  depthWrite: false,
});
const stars = new THREE.Points(starGeo, starMat);
stars.visible = false;
scene.add(stars);

// 달
const moonGroup = new THREE.Group();
const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff0d8, fog: false, transparent: true, opacity: 0 });
const moonGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffe4c4,
  fog: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const moon = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 12), moonMat);
const moonGlow = new THREE.Mesh(new THREE.SphereGeometry(5.2, 10, 10), moonGlowMat);
moonGroup.add(moonGlow);
moonGroup.add(moon);
moonGroup.visible = false;
scene.add(moonGroup);

const moonLight = new THREE.DirectionalLight(0xd0d8ec, 0);
moonLight.position.set(-20, 18, -12);
scene.add(moonLight);

// 별똥별
const shooting = [];
let nextShootAt = 8 + rand() * 12;
const shootLineMat = new THREE.LineBasicMaterial({
  color: 0xfff8ff,
  transparent: true,
  opacity: 0.95,
  fog: false,
});

function spawnShootingStar(origin) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-5.5, -0.8, 0),
  ]);
  const line = new THREE.Line(geo, shootLineMat.clone());
  const ang = rand() * Math.PI * 2;
  const elev = 0.35 + rand() * 0.4;
  const dist = 70 + rand() * 40;
  line.position.set(
    origin.x + Math.cos(ang) * dist * Math.cos(elev),
    28 + rand() * 18,
    origin.z + Math.sin(ang) * dist * Math.cos(elev)
  );
  line.rotation.y = ang + Math.PI * 0.5;
  line.rotation.z = -0.35 - rand() * 0.25;
  line.userData.life = 0.7 + rand() * 0.5;
  line.userData.age = 0;
  line.userData.vx = Math.cos(ang + 0.4) * (28 + rand() * 18);
  line.userData.vy = -6 - rand() * 5;
  line.userData.vz = Math.sin(ang + 0.4) * (28 + rand() * 18);
  scene.add(line);
  shooting.push(line);
}

function updateShootingStars(dt, nightAmt, origin) {
  if (nightAmt > 0.45) {
    nextShootAt -= dt;
    if (nextShootAt <= 0) {
      spawnShootingStar(origin);
      nextShootAt = 10 + rand() * 22;
    }
  } else {
    nextShootAt = Math.min(nextShootAt, 6);
  }
  for (let i = shooting.length - 1; i >= 0; i--) {
    const s = shooting[i];
    s.userData.age += dt;
    s.position.x += s.userData.vx * dt;
    s.position.y += s.userData.vy * dt;
    s.position.z += s.userData.vz * dt;
    const u = s.userData.age / s.userData.life;
    s.material.opacity = Math.max(0, 1 - u) * 0.95;
    if (u >= 1) {
      scene.remove(s);
      s.geometry.dispose();
      s.material.dispose();
      shooting.splice(i, 1);
    }
  }
}

const clockBadge = document.createElement("div");
clockBadge.id = "dayClock";
clockBadge.textContent = "☀️ 12:00";
(document.getElementById("hudRight") || mount).prepend(clockBadge);

let lastDayBucket = -1;

function updateDayNight(dt) {
  const phase = (Date.now() % DAY_CYCLE_MS) / DAY_CYCLE_MS; // 0=자정, 0.5=정오
  const { a, b, t } = sampleSkyKey(phase);

  // 태양 고도: 정오(0.5)에서 최고
  const sunElev = Math.sin((phase - 0.25) * Math.PI * 2); // -1..1
  const dayAmt = THREE.MathUtils.smoothstep(sunElev, -0.15, 0.55);
  const nightAmt = 1 - dayAmt;

  // 하늘/안개 (프레임 버킷으로 가끔만 재페인트)
  const bucket = (phase * 200) | 0;
  if (bucket !== lastDayBucket) {
    lastDayBucket = bucket;
    _lerpTop.setHex(a.top).lerp(_tmpC.setHex(b.top), t);
    _lerpBot.setHex(a.bot).lerp(_tmpC.setHex(b.bot), t);
    _lerpFog.setHex(a.fog).lerp(_tmpC.setHex(b.fog), t);
    paintSky(_lerpTop.getHex(), _lerpBot.getHex());
    // 지평선 안개 = 하늘 하단색에 가깝게 (안개 낀 날 느낌 완화)
    scene.fog.color.copy(_lerpFog).lerp(_lerpBot, 0.45);
    scene.background.copy(_lerpTop);
  }

  // 조명 — 낮에 또렷한 방향광, 밤은 밝되 색이 죽지 않게
  ambient.color.setRGB(
    THREE.MathUtils.lerp(0.78, 1.0, dayAmt),
    THREE.MathUtils.lerp(0.82, 0.96, dayAmt),
    THREE.MathUtils.lerp(0.98, 0.94, dayAmt)
  );
  ambient.groundColor.setRGB(
    THREE.MathUtils.lerp(0.48, 0.72, dayAmt),
    THREE.MathUtils.lerp(0.58, 0.88, dayAmt),
    THREE.MathUtils.lerp(0.55, 0.7, dayAmt)
  );
  ambient.intensity = THREE.MathUtils.lerp(0.58, 0.8, dayAmt);

  const sunAng = (phase - 0.25) * Math.PI * 2;
  sun.position.set(Math.cos(sunAng) * 40, Math.max(4, sunElev * 32), Math.sin(sunAng) * 22);
  sun.color.setRGB(1, THREE.MathUtils.lerp(0.88, 0.95, dayAmt), THREE.MathUtils.lerp(0.76, 0.88, dayAmt));
  sun.intensity = THREE.MathUtils.lerp(0.12, 0.88, dayAmt);

  fillLight.intensity = THREE.MathUtils.lerp(0.12, 0.22, dayAmt);
  moonLight.intensity = nightAmt * 0.26;
  moonLight.position.set(-Math.cos(sunAng) * 36, 14 + nightAmt * 12, -Math.sin(sunAng) * 20);

  // 구름
  cloudMat.color.setRGB(
    THREE.MathUtils.lerp(0.86, 1, dayAmt),
    THREE.MathUtils.lerp(0.86, 0.98, dayAmt),
    THREE.MathUtils.lerp(0.94, 0.98, dayAmt)
  );
  cloudMat.opacity = THREE.MathUtils.lerp(0.58, 0.9, dayAmt);

  // 별
  const starVis = THREE.MathUtils.smoothstep(nightAmt, 0.25, 0.7);
  starMat.opacity = starVis * 0.95;
  stars.visible = starVis > 0.02;
  if (stars.visible) {
    stars.position.copy(player.position);
    stars.position.y = 0;
  }

  // 달
  const moonVis = THREE.MathUtils.smoothstep(nightAmt, 0.2, 0.65);
  moonGroup.visible = moonVis > 0.02;
  moonMat.opacity = moonVis * 0.95;
  moonGlowMat.opacity = moonVis * 0.28;
  if (moonGroup.visible) {
    const mAng = sunAng + Math.PI;
    moonGroup.position.set(
      player.position.x + Math.cos(mAng) * 70,
      32 + Math.max(0, -sunElev) * 18,
      player.position.z + Math.sin(mAng) * 50
    );
  }

  // 별똥별
  updateShootingStars(dt, nightAmt, player.position);

  // 하늘 돔·별이 플레이어를 따라가며 far clip에 안 잘리게
  sky.position.copy(camera.position);

  // 시계 HUD (게임내 시각)
  const mins = (phase * 24 * 60) | 0;
  const hh = String((mins / 60) | 0).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");
  const icon = nightAmt > 0.55 ? "🌙" : nightAmt > 0.25 ? "🌅" : "☀️";
  clockBadge.textContent = `${icon} ${hh}:${mm}`;
}

/** 그림자는 큰 오브젝트만 (꽃/버섯은 스킵) */
function shadowify(mesh, heavy = false){
  mesh.castShadow = !!heavy;
  mesh.receiveShadow = true;
  return mesh;
}

// 지오메트리/머티리얼 재사용
const shared = {
  leafGeo: new THREE.IcosahedronGeometry(1, 0),
  bushGeo: new THREE.IcosahedronGeometry(1, 0),
  rockGeo: new THREE.IcosahedronGeometry(1, 0),
  flowerBloomGeo: new THREE.SphereGeometry(0.11, 5, 5),
  flowerStemGeo: new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4),
  trunkGeo: new THREE.CylinderGeometry(0.18, 0.25, 1.4, 5),
  mushStemGeo: new THREE.CylinderGeometry(0.05, 0.06, 0.18, 5),
  mushCapGeo: new THREE.SphereGeometry(0.12, 6, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  bushMat: new THREE.MeshStandardMaterial({ color: 0x4a9840, roughness: 0.75 }),
  trunkMat: new THREE.MeshStandardMaterial({ color: 0xb07840, roughness: 0.85 }),
  stemMat: new THREE.MeshStandardMaterial({ color: 0x4a9848, roughness: 0.8 }),
  mushStemMat: new THREE.MeshStandardMaterial({ color: 0xffe8c8 }),
  fruitGeo: new THREE.SphereGeometry(0.09, 5, 5),
  fruitMats: [
    new THREE.MeshStandardMaterial({ color: 0xd03850, roughness: 0.55 }),
    new THREE.MeshStandardMaterial({ color: 0xe89820, roughness: 0.55 }),
    new THREE.MeshStandardMaterial({ color: 0x9848c8, roughness: 0.55 }),
  ],
  nestMat: new THREE.MeshStandardMaterial({ color: 0x986838, roughness: 0.9 }),
  nestGeo: new THREE.TorusGeometry(0.14, 0.045, 5, 8),
  grassMat: new THREE.MeshStandardMaterial({ color: 0x4a9840, roughness: 0.8 }),
  grassGeo: new THREE.ConeGeometry(0.06, 0.28, 4),
  critterBodyGeo: new THREE.SphereGeometry(0.18, 6, 6),
  critterHeadGeo: new THREE.SphereGeometry(0.12, 6, 6),
  critterEarGeo: new THREE.SphereGeometry(0.05, 5, 5),
  rabbitMat: new THREE.MeshStandardMaterial({ color: 0xe8d0b0, roughness: 0.8 }),
  foxMat: new THREE.MeshStandardMaterial({ color: 0xd06020, roughness: 0.72 }),
  foxTailMat: new THREE.MeshStandardMaterial({ color: 0xf0d8b8, roughness: 0.82 }),
  moleMat: new THREE.MeshStandardMaterial({ color: 0x786048, roughness: 0.85 }),
};

// ---------- 바닥: 패치형 색상 변화 ----------
const groundGeo = new THREE.PlaneGeometry(200, 200, 24, 24);
groundGeo.rotateX(-Math.PI/2);
const gPos = groundGeo.attributes.position;
const gColors = [];
const baseGreen = new THREE.Color(0x68b848);
const deepGreen = new THREE.Color(0x3a8830);
for (let i=0;i<gPos.count;i++){
  const x = gPos.getX(i), z = gPos.getZ(i);
  gPos.setY(i, Math.sin(x*0.15)*0.06 + Math.cos(z*0.15)*0.06);
  const n = (Math.sin(x*0.4)*Math.cos(z*0.37)+1)/2;
  const c = baseGreen.clone().lerp(deepGreen, n*0.65);
  gColors.push(c.r, c.g, c.b);
}
groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gColors, 3));
groundGeo.computeVertexNormals();
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);

// ---------- 돌길 ----------
const pathMat = new THREE.MeshStandardMaterial({ color: 0xd0b888, roughness: 0.88 });
const pathPoints = [];
const pathStones = [];
for (let i=0;i<14;i++){
  const t = i/13;
  const px = THREE.MathUtils.lerp(0, 6, t) + Math.sin(t*4)*0.4;
  const pz = THREE.MathUtils.lerp(0, -6, t) + Math.cos(t*3)*0.3;
  const stone = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.08, 7), pathMat));
  stone.position.set(px, 0.04, pz);
  stone.rotation.y = rand()*Math.PI;
  scene.add(stone);
  pathStones.push(stone);
  pathPoints.push({x:px, z:pz});
}

// ---------- 연못 ----------
const pondMat = new THREE.MeshStandardMaterial({ color: 0x38a8c0, roughness: 0.28, metalness: 0.15, transparent:true, opacity:0.92 });
const pond = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.12, 24), pondMat);
pond.position.set(-14, 0.02, 12);
pond.receiveShadow = true;
scene.add(pond);
const pondRimMat = new THREE.MeshStandardMaterial({ color: 0x78c060, roughness:1 });
const pondRim = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.25, 8, 24), pondRimMat);
pondRim.rotation.x = Math.PI/2;
pondRim.position.set(-14, 0.05, 12);
scene.add(pondRim);
for (let i=0;i<5;i++){
  const lilyMat = new THREE.MeshStandardMaterial({ color: 0x489840 });
  const lily = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 10), lilyMat));
  const ang = rand()*Math.PI*2, r = rand()*3;
  lily.position.set(-14+Math.cos(ang)*r, 0.09, 12+Math.sin(ang)*r);
  scene.add(lily);
}

// ---------- 나무 ----------
const treeLeafColors = [0x48a838, 0x389030, 0x68c048, 0x2e7828];
function makeTree(x, z){
  const g = new THREE.Group();
  const trunk = shadowify(new THREE.Mesh(shared.trunkGeo, shared.trunkMat), true);
  trunk.position.y = 0.7;
  g.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({
    color: treeLeafColors[Math.floor(rand()*treeLeafColors.length)], roughness: 0.8
  });
  for (let i=0;i<2;i++){
    const s = 1.05 - i*0.28;
    const leaf = shadowify(new THREE.Mesh(shared.leafGeo, leafMat), true);
    leaf.scale.setScalar(s);
    leaf.position.y = 1.7 + i*0.7;
    leaf.rotation.y = rand()*Math.PI;
    g.add(leaf);
  }

  // 열매 (나무당 0~3개, 공유 지오메트리)
  const fruitN = Math.floor(rand() * 3.2);
  for (let i = 0; i < fruitN; i++) {
    const fruit = new THREE.Mesh(
      shared.fruitGeo,
      shared.fruitMats[Math.floor(rand() * shared.fruitMats.length)]
    );
    const ang = rand() * Math.PI * 2;
    const r = 0.35 + rand() * 0.45;
    fruit.position.set(Math.cos(ang) * r, 1.9 + rand() * 0.7, Math.sin(ang) * r);
    g.add(fruit);
  }

  // 새집 (~28%)
  if (rand() < 0.28) {
    const nest = new THREE.Mesh(shared.nestGeo, shared.nestMat);
    nest.rotation.x = Math.PI / 2;
    nest.position.set(0.35 + rand() * 0.2, 1.55, 0.1);
    g.add(nest);
  }

  g.position.set(x, 0, z);
  g.userData.sway = rand()*Math.PI*2;
  scene.add(g);
  return g;
}

function makeGrassTuft(x, z) {
  const g = new THREE.Group();
  const n = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const blade = new THREE.Mesh(shared.grassGeo, shared.grassMat);
    blade.position.set((rand() - 0.5) * 0.2, 0.12, (rand() - 0.5) * 0.2);
    blade.rotation.z = (rand() - 0.5) * 0.35;
    blade.rotation.x = (rand() - 0.5) * 0.2;
    g.add(blade);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

/** 토끼 / 여우 / 두더지 — 메시 소수, 애니 가벼움 */
const critters = [];
function makeCritter(kind, x, z) {
  const g = new THREE.Group();
  let mat = shared.rabbitMat;
  if (kind === "fox") mat = shared.foxMat;
  if (kind === "mole") mat = shared.moleMat;

  const body = new THREE.Mesh(shared.critterBodyGeo, mat);
  body.position.y = kind === "mole" ? 0.12 : 0.2;
  if (kind === "mole") body.scale.set(1.1, 0.7, 1.2);
  if (kind === "fox") body.scale.set(1.15, 0.85, 1.4);
  g.add(body);

  const head = new THREE.Mesh(shared.critterHeadGeo, mat);
  head.position.set(0, kind === "mole" ? 0.18 : 0.32, kind === "mole" ? 0.16 : 0.2);
  g.add(head);

  if (kind === "rabbit") {
    [-0.06, 0.06].forEach((ox) => {
      const ear = new THREE.Mesh(shared.critterEarGeo, mat);
      ear.scale.set(0.7, 1.8, 0.5);
      ear.position.set(ox, 0.48, 0.05);
      g.add(ear);
    });
  }
  if (kind === "fox") {
    const tail = new THREE.Mesh(shared.critterBodyGeo, shared.foxTailMat);
    tail.scale.set(0.45, 0.45, 0.9);
    tail.position.set(0, 0.22, -0.28);
    g.add(tail);
  }

  g.position.set(x, 0, z);
  g.userData = {
    kind,
    homeX: x,
    homeZ: z,
    phase: rand() * Math.PI * 2,
    speed: 0.6 + rand() * 0.5,
    facing: rand() * Math.PI * 2,
  };
  scene.add(g);
  critters.push(g);
  return g;
}

function updateCritters(dt, time) {
  for (let i = 0; i < critters.length; i++) {
    const c = critters[i];
    const u = c.userData;
    // 집 근처 작은 배회
    const ox = Math.sin(time * u.speed + u.phase) * (u.kind === "mole" ? 0.8 : 1.6);
    const oz = Math.cos(time * u.speed * 0.85 + u.phase) * (u.kind === "mole" ? 0.8 : 1.6);
    const tx = u.homeX + ox;
    const tz = u.homeZ + oz;
    const dx = tx - c.position.x;
    const dz = tz - c.position.z;
    c.position.x += dx * Math.min(1, dt * 2.2);
    c.position.z += dz * Math.min(1, dt * 2.2);
    if (Math.hypot(dx, dz) > 0.02) {
      u.facing = Math.atan2(dx, dz);
    }
    c.rotation.y = u.facing;
    if (u.kind === "mole") {
      c.position.y = Math.max(0, Math.sin(time * 2 + u.phase) * 0.04);
    } else {
      c.position.y = Math.abs(Math.sin(time * 4 + u.phase)) * 0.03;
    }
  }
}

function makeBush(x, z){
  const g = new THREE.Group();
  for (let i=0;i<2;i++){
    const s = 0.38 + rand()*0.18;
    const puff = new THREE.Mesh(shared.bushGeo, shared.bushMat);
    puff.scale.setScalar(s);
    puff.position.set((rand()-0.5)*0.45, s*0.7, (rand()-0.5)*0.45);
    puff.receiveShadow = true;
    g.add(puff);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

function makeMushroom(x, z){
  const g = new THREE.Group();
  const capMat = new THREE.MeshStandardMaterial({ color: [0xe04058, 0xe88830, 0x9848c8][Math.floor(rand()*3)] });
  const stem = new THREE.Mesh(shared.mushStemGeo, shared.mushStemMat);
  stem.position.y = 0.09;
  g.add(stem);
  const cap = new THREE.Mesh(shared.mushCapGeo, capMat);
  cap.position.y = 0.18;
  g.add(cap);
  g.position.set(x, 0, z);
  g.scale.setScalar(1.4);
  scene.add(g);
  return g;
}

function makeFlower(x, z){
  const g = new THREE.Group();
  const colors = [0xe85880, 0xe8b828, 0xa858d8, 0xe87840, 0x48b0d8];
  const bloomMat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand()*colors.length)] });
  const stem = new THREE.Mesh(shared.flowerStemGeo, shared.stemMat);
  stem.position.y = 0.15;
  g.add(stem);
  const bloom = new THREE.Mesh(shared.flowerBloomGeo, bloomMat);
  bloom.position.y = 0.32;
  g.add(bloom);
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

function makeRock(x, z){
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8b0a8, roughness: 1 });
  const rock = shadowify(new THREE.Mesh(shared.rockGeo, mat), true);
  const s = 0.4 + rand()*0.2;
  rock.scale.setScalar(s);
  rock.position.set(x, 0.25, z);
  rock.rotation.set(rand(), rand(), rand());
  scene.add(rock);
  return { mesh: rock, x, z, radius: 0.55 };
}

function makeFence(x, z, rotY){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe0c8a0, roughness: 0.9 });
  for (let i=-1;i<=1;i++){
    const post = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.5,6), mat));
    post.position.set(i*0.5, 0.25, 0);
    g.add(post);
  }
  const rail1 = shadowify(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), mat));
  rail1.position.y = 0.35; g.add(rail1);
  const rail2 = rail1.clone(); rail2.position.y = 0.15; g.add(rail2);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}

function makeHouse(x, z){
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0d8b8 });
  const wall = shadowify(new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), wallMat));
  wall.position.y = 1;
  g.add(wall);

  const roofMat = new THREE.MeshStandardMaterial({ color: 0xd04868 });
  const roof = shadowify(new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.6, 4), roofMat));
  roof.position.y = 2.8;
  roof.rotation.y = Math.PI/4;
  g.add(roof);

  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0xb86840 });
  const chimney = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.35,0.7,0.35), chimneyMat));
  chimney.position.set(0.9, 3.1, 0.5);
  g.add(chimney);

  const doorMat = new THREE.MeshStandardMaterial({ color: 0xa86830 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.05), doorMat);
  door.position.set(0, 0.55, 1.53);
  g.add(door);

  const winMat = new THREE.MeshStandardMaterial({ color: 0x58c0d8 });
  const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.05), winMat);
  win1.position.set(-1, 1.2, 1.53);
  const win2 = win1.clone(); win2.position.x = 1;
  g.add(win1, win2);

  g.position.set(x, 0, z);
  scene.add(g);
  return { mesh: g, x, z, radius: 2.2 };
}

// ---------- 월드 채우기 ----------
const obstacles = [];
const trees = [];
const flowerPts = [];
/** 지평선 너머 컬링용 (원거리 디테일 스킵) */
const sceneryCull = [];
function trackScenery(mesh, x, z, dyn = false) {
  sceneryCull.push({ mesh, x, z, dyn: !!dyn });
  return mesh;
}

function randPos(range){ return (rand()-0.5)*range; }
function nearPath(x, z){
  return pathPoints.some(p => Math.hypot(p.x-x, p.z-z) < 1.6) || Math.hypot(x,z) < 5;
}

for (let i=0;i<18;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z) || Math.hypot(x-(-14), z-12) < 6) continue;
  const tree = makeTree(x, z);
  trees.push(tree);
  trackScenery(tree, x, z);
  obstacles.push({ x, z, radius: 0.7, height: 2.4 });
}
for (let i=0;i<10;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z)) continue;
  trackScenery(makeBush(x, z), x, z);
  obstacles.push({ x, z, radius: 0.45, height: 0.55 });
}
for (let i=0;i<22;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z)) continue;
  trackScenery(makeFlower(x, z), x, z);
  flowerPts.push({x, z});
}
for (let i=0;i<6;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z)) continue;
  trackScenery(makeMushroom(x, z), x, z);
}
for (let i=0;i<6;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z)) continue;
  const rock = makeRock(x, z);
  trackScenery(rock.mesh, x, z);
  obstacles.push({ x: rock.x, z: rock.z, radius: rock.radius, height: 0.5 });
}
for (let i = 0; i < 14; i++) {
  const x = randPos(55), z = randPos(55);
  if (nearPath(x, z) || Math.hypot(x + 14, z - 12) < 5) continue;
  trackScenery(makeGrassTuft(x, z), x, z);
}
for (let i = 0; i < 2; i++) {
  const x = randPos(40), z = randPos(40);
  if (nearPath(x, z)) continue;
  trackScenery(makeCritter("rabbit", x, z), x, z, true);
}
{
  const x = randPos(45), z = randPos(45);
  if (!nearPath(x, z)) trackScenery(makeCritter("fox", x, z), x, z, true);
}
for (let i = 0; i < 2; i++) {
  const x = randPos(35), z = randPos(35);
  if (nearPath(x, z)) continue;
  trackScenery(makeCritter("mole", x, z), x, z, true);
}
// 집 주변 울타리 (가운데 광장)
[-2,-1,0,1,2].forEach(i => {
  const fx = i * 1.6;
  trackScenery(makeFence(fx, 2.5, 0), fx, 2.5);
});

// ---------- 주일학교 집 6채 + 엘리야 말씀 장면 ----------
const sunday = buildSundayContent(THREE, { scene, shadowify, makeCharacterMesh });
const sceneBags = sunday.sceneBags;
const interactPortals = sunday.portals;
let currentSceneId = "overworld";
let interactHint = "";
let interactCooldown = 0;

const overworldExtras = [];
for (const h of sunday.outdoorHouses) {
  scene.add(h.mesh);
  trackScenery(h.mesh, h.x, h.z);
  obstacles.push({ x: h.x, z: h.z, radius: h.radius, height: 2.4 });
  overworldExtras.push(h.mesh);
}
obstacles.push({ x:-14, z:12, radius: 4.6, height: 0.22 }); // 연못
trackScenery(pond, -14, 12);
trackScenery(pondRim, -14, 12);

for (const g of sunday.storyGates) {
  scene.add(g.mesh);
  trackScenery(g.mesh, g.x, g.z);
  // 말씀 문은 통과·입장용 — 충돌이 포털을 막지 않게
  if (!g.noCollide) {
    obstacles.push({ x: g.x, z: g.z, radius: 1.4, height: 2.2 });
  }
  overworldExtras.push(g.mesh);
}
scene.add(sunday.board);
overworldExtras.push(sunday.board);

/** 실내 입장 시 가릴 야외 메시 */
const overworldHideList = [ground, pond, pondRim, ...overworldExtras];

// ---------- 플레이어 (얼굴 앞 이미지 슬롯 포함) ----------
const player = makeCharacterMesh(
  THREE,
  PLAYER_COLORS[myIndex % PLAYER_COLORS.length],
  { index: myIndex, imageUrl: opts.localImageUrl }
);
const bodyCyl = player.userData.bodyCyl;
player.position.set(0, 0, 0);
player.castShadow = true;
scene.add(player);

/** 이후 NPC용 — spawnNpc / setNpcImage */
const npcs = new Map();

function spawnNpc(id, { x = 0, z = 0, color, imageUrl, label } = {}) {
  if (npcs.has(id)) return npcs.get(id);
  const mesh = makeCharacterMesh(
    THREE,
    color ?? PLAYER_COLORS[npcs.size % PLAYER_COLORS.length],
    { index: npcs.size + 10, imageUrl }
  );
  mesh.position.set(x, 0, z);
  mesh.userData.npcId = id;
  mesh.userData.npcLabel = label || id;
  scene.add(mesh);
  const entry = { mesh, id };
  npcs.set(id, entry);
  return entry;
}

function setNpcImage(id, url) {
  const e = npcs.get(id);
  if (!e) return;
  setCharacterImage(THREE, e.mesh, url);
}

function removeNpc(id) {
  const e = npcs.get(id);
  if (!e) return;
  scene.remove(e.mesh);
  npcs.delete(id);
}

// 집 앞 아이들 (플레이어가 없을 때 마을에 보이는 주일학교 친구들)
for (const h of sunday.outdoorHouses) {
  spawnNpc(h.kid.id, {
    x: h.npcX ?? h.x + 1.4,
    z: h.npcZ ?? h.z + 2.3,
    color: h.kid.color,
    label: h.kid.name,
  });
}

function setOverworldVisible(vis) {
  for (const m of overworldHideList) {
    if (m) m.visible = vis;
  }
  for (const s of pathStones) s.visible = vis;
  for (const t of trees) t.visible = vis;
  for (const o of sceneryCull) {
    if (o.mesh) o.mesh.visible = vis;
  }
  for (const c of clouds) c.visible = vis;
  for (const c of critters) c.visible = vis;
  if (petalsRef) {
    for (const p of petalsRef) p.visible = vis && design.petal > 2;
  }
  for (const e of npcs.values()) {
    e.mesh.visible = vis;
  }
}

function enterScene(sceneId, spawnOverride = null) {
  for (const bag of sceneBags.values()) bag.root.visible = false;

  if (sceneId === "overworld") {
    setOverworldVisible(true);
    const pos = spawnOverride || { x: player.position.x, z: player.position.z };
    player.position.set(pos.x, 0, pos.z);
  } else {
    const bag = sceneBags.get(sceneId);
    if (!bag) return;
    setOverworldVisible(false);
    bag.root.visible = true;
    const sp = spawnOverride || bag.spawn;
    player.position.set(sp.x, 0, sp.z);
  }

  currentSceneId = sceneId;
  bobY = 0;
  vy = 0;
  onGround = true;
  velocity.set(0, 0);
  if (activeCamPreset && CAM_PRESETS[activeCamPreset]?.behind) {
    camYaw = yawBehindPlayer();
  }
  player.visible = camMode !== "first";
  if (camMode === "first") {
    camPos.set(player.position.x, player.position.y + 1.35, player.position.z);
  } else {
    camPos.copy(player.position.clone().add(computeCamOffset()));
  }
  camera.position.copy(camPos);
  updateInteractHud();
}

function findNearbyPortal() {
  if (currentSceneId === "overworld") {
    for (const p of interactPortals) {
      if (Math.hypot(player.position.x - p.x, player.position.z - p.z) <= p.r) return p;
    }
    return null;
  }
  const bag = sceneBags.get(currentSceneId);
  if (!bag) return null;
  if (bag.innerPortals) {
    for (const p of bag.innerPortals) {
      if (Math.hypot(player.position.x - p.x, player.position.z - p.z) <= p.r) return p;
    }
  }
  if (bag.exitPortal) {
    const p = bag.exitPortal;
    if (Math.hypot(player.position.x - p.x, player.position.z - p.z) <= p.r) {
      const backLabel = p.to === "overworld" ? "마을로 나가기" : "이야기로 돌아가기";
      return { to: p.to, outPos: p.outPos, label: backLabel };
    }
  }
  return null;
}

function tryInteract() {
  if (interactCooldown > 0) return;
  const p = findNearbyPortal();
  if (!p) return;
  interactCooldown = 0.45;
  if (p.outPos) enterScene(p.to, p.outPos);
  else enterScene(p.to);
}

const interactHud = document.createElement("div");
interactHud.id = "interactHud";
interactHud.style.cssText =
  "display:none;position:fixed;bottom:110px;left:50%;transform:translateX(-50%);" +
  "background:rgba(255,252,248,0.92);padding:8px 16px;border-radius:14px;" +
  "font-size:13px;color:#5a4a42;font-weight:600;z-index:25;" +
  "box-shadow:0 2px 12px rgba(0,0,0,0.12);pointer-events:auto;cursor:pointer;";
(document.getElementById("gameShell") || document.body).appendChild(interactHud);
interactHud.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  tryInteract();
});

function updateInteractHud() {
  const p = findNearbyPortal();
  if (!p) {
    interactHud.style.display = "none";
    interactHint = "";
    return;
  }
  interactHint = p.label || "들어가기";
  interactHud.style.display = "block";
  interactHud.textContent = `${interactHint}  ·  E / 문`;
}

// ---------- 카메라 오빗 + 프리셋 ----------
let camYaw = Math.PI / 4;
let camPitch = 0.82;
let camDist = 16;
let camMode = "orbit"; // orbit | first
let activeCamPreset = "third";
// 자유 조작 여유 (프리셋·드래그 공통)
const CAM_PITCH_MIN = 0.08;
const CAM_PITCH_MAX = 1.12;
const CAM_DIST_MIN = 1.5;
const CAM_DIST_MAX = 28;

/** 대표 시점 — 버튼/숫자키로 바로 적용 */
const CAM_PRESETS = {
  third: {
    label: "3인칭 후방",
    short: "3인칭",
    mode: "orbit",
    pitch: 0.78,
    dist: 15,
    behind: true,
  },
  shoulder: {
    label: "숄더",
    short: "숄더",
    mode: "orbit",
    pitch: 0.52,
    dist: 6.2,
    behind: true,
  },
  first: {
    label: "1인칭",
    short: "1인칭",
    mode: "first",
    pitch: 0.12,
    dist: 1.5,
    behind: true,
  },
  wide: {
    label: "멀리 보기",
    short: "멀리",
    mode: "orbit",
    pitch: 0.92,
    dist: 23,
    behind: true,
  },
};

function yawBehindPlayer() {
  // 캐릭터 뒤쪽 오빗 각도 (로컬 +Z 전방 기준)
  return Math.PI / 2 - player.rotation.y;
}

function applyCamPreset(id) {
  const p = CAM_PRESETS[id];
  if (!p) return;
  activeCamPreset = id;
  camMode = p.mode;
  camPitch = p.pitch;
  camDist = p.dist;
  if (p.mode === "first") {
    camYaw = player.rotation.y; // 전방 시선
  } else if (p.behind) {
    camYaw = yawBehindPlayer();
  }
  player.visible = camMode !== "first";
  if (camMode === "first") {
    camPos.set(player.position.x, player.position.y + 1.35, player.position.z);
  } else {
    camPos.copy(player.position.clone().add(computeCamOffset()));
  }
  camera.position.copy(camPos);
  syncCamPresetButtons();
}

function computeCamOffset() {
  const y = Math.sin(camPitch) * camDist;
  const horiz = Math.cos(camPitch) * camDist;
  const x = Math.cos(camYaw) * horiz;
  const z = Math.sin(camYaw) * horiz;
  return new THREE.Vector3(x, y, z);
}

let camPos = player.position.clone().add(computeCamOffset());
camera.position.copy(camPos);
camera.lookAt(player.position);

// 카메라 프리셋 버튼
const camPresetBar = document.createElement("div");
camPresetBar.id = "camPresetBar";
(document.getElementById("gameShell") || document.body).appendChild(camPresetBar);
for (const [id, p] of Object.entries(CAM_PRESETS)) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.camPreset = id;
  btn.textContent = p.short;
  btn.title = `${p.label} (키 ${Object.keys(CAM_PRESETS).indexOf(id) + 1})`;
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    applyCamPreset(id);
  });
  camPresetBar.appendChild(btn);
}
function syncCamPresetButtons() {
  camPresetBar.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.camPreset === activeCamPreset);
  });
}
syncCamPresetButtons();
applyCamPreset("third");

// ---------- 카메라 드래그 컨트롤 ----------
let dragging = false, lastX = 0, lastY = 0;
const joyPad = document.getElementById('joyPad');

function isInsideControls(x, y){
  const joy = document.getElementById('joyPad');
  const jump = document.getElementById('jumpBtn');
  const hit = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  if (hit(joy) || hit(jump)) return true;
  if (camPresetBar) {
    const r = camPresetBar.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}

renderer.domElement.addEventListener('pointerdown', e => {
  if (isInsideControls(e.clientX, e.clientY)) return;
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
});
addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  camYaw -= dx * 0.006;
  camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + dy * 0.004));
  activeCamPreset = "";
  syncCamPresetButtons();
});
addEventListener('pointerup', () => dragging = false);
addEventListener('pointercancel', () => dragging = false);

renderer.domElement.addEventListener('wheel', e => {
  if (camMode === "first") {
    e.preventDefault();
    return;
  }
  camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + e.deltaY * 0.02));
  activeCamPreset = "";
  syncCamPresetButtons();
  e.preventDefault();
}, { passive:false });

let pinchStartDist = null;
addEventListener('touchmove', e => {
  if (e.touches.length === 2){
    const t1 = e.touches[0], t2 = e.touches[1];
    const d = Math.hypot(t1.clientX-t2.clientX, t1.clientY-t2.clientY);
    if (pinchStartDist !== null && camMode !== "first"){
      camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist - (d - pinchStartDist) * 0.03));
      activeCamPreset = "";
      syncCamPresetButtons();
    }
    pinchStartDist = d;
  }
}, { passive:true });
addEventListener('touchend', () => pinchStartDist = null);

// ---------- 가상 조이스틱 ----------
const joyKnob = document.getElementById('joyKnob');
let joyActive = false, joyVec = {x:0, y:0}, joyCenter = {x:0, y:0};

function joyStart(x, y){
  joyActive = true;
  const r = joyPad.getBoundingClientRect();
  joyCenter = { x: r.left + r.width/2, y: r.top + r.height/2 };
}
function joyMove(x, y){
  if (!joyActive) return;
  let dx = x - joyCenter.x, dy = y - joyCenter.y;
  const padRect = joyPad.getBoundingClientRect();
  const knobR = joyKnob.offsetWidth / 2;
  const maxR = padRect.width/2 - knobR*0.6;
  const len = Math.hypot(dx, dy);
  if (len > maxR){ dx = dx/len*maxR; dy = dy/len*maxR; }
  joyKnob.style.transform = `translate(${dx-knobR}px, ${dy-knobR}px)`;
  joyVec = { x: dx/maxR, y: dy/maxR };
}
function joyEnd(){
  joyActive = false;
  joyVec = { x:0, y:0 };
  joyKnob.style.transform = 'translate(-50%, -50%)';
}

joyPad.addEventListener('pointerdown', e => { joyStart(e.clientX, e.clientY); joyMove(e.clientX, e.clientY); e.stopPropagation(); });
addEventListener('pointermove', e => { if (joyActive) joyMove(e.clientX, e.clientY); });
addEventListener('pointerup', joyEnd);
addEventListener('pointercancel', joyEnd);

// ---------- 점프 버튼 ----------
const jumpBtn = document.getElementById('jumpBtn');
let jumpQueued = false;
function queueJump() {
  jumpQueued = true;
}
jumpBtn?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  queueJump();
  jumpBtn.classList.add('active');
});
jumpBtn?.addEventListener('pointerup', () => jumpBtn.classList.remove('active'));
jumpBtn?.addEventListener('pointerleave', () => jumpBtn.classList.remove('active'));
jumpBtn?.addEventListener('pointercancel', () => jumpBtn.classList.remove('active'));

// ---------- 키보드 ----------
const keys = {};
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) queueJump();
    keys[' '] = true;
    return;
  }
  if (k === 'e' || k === 'enter' || e.code === 'KeyE' || e.code === 'Enter') {
    e.preventDefault();
    if (!e.repeat) tryInteract();
    return;
  }
  if (!e.repeat && (k === '1' || k === '2' || k === '3' || k === '4')) {
    const ids = Object.keys(CAM_PRESETS);
    applyCamPreset(ids[+k - 1]);
    return;
  }
  keys[k] = true;
});
addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ' || e.code === 'Space') {
    keys[' '] = false;
    return;
  }
  keys[k] = false;
});

// ---------- 충돌 (높이 인식: 점프로 낮은 장애물 넘기) ----------
function collides(x, z, y = 0){
  if (currentSceneId !== "overworld") return false;
  for (const o of obstacles){
    if (Math.hypot(x - o.x, z - o.z) < o.radius + 0.35) {
      if (y > (o.height ?? 1)) continue;
      return true;
    }
  }
  return false;
}

/** 착지 시 장애물 안에 있으면 가장자리로 살짝 밀어냄 */
function resolveOverlap() {
  if (currentSceneId !== "overworld") return;
  for (const o of obstacles) {
    const dx = player.position.x - o.x;
    const dz = player.position.z - o.z;
    const d = Math.hypot(dx, dz);
    const min = o.radius + 0.35;
    if (d >= min) continue;
    if (bobY > (o.height ?? 1)) continue;
    const nx = d < 1e-4 ? 1 : dx / d;
    const nz = d < 1e-4 ? 0 : dz / d;
    player.position.x = o.x + nx * min;
    player.position.z = o.z + nz * min;
  }
}

const WORLD_LIMIT = 95;

// ---------- 부드러운 이동 + 점프 ----------
const velocity = new THREE.Vector2(0, 0);
let vy = 0;
const MAX_SPEED = 5.4;
const ACCEL = 18;
const FRICTION = 12;
const GRAVITY = 26;
const JUMP_V = 10.2;
let walkT = 0;
let facingAngle = 0;
let onGround = true;
let inputSmooth = { x: 0, z: 0 };
let bobY = 0;

function updatePlayer(dt){
  let ix = 0, iz = 0;
  if (keys['arrowup'] || keys['w']) iz -= 1;
  if (keys['arrowdown'] || keys['s']) iz += 1;
  if (keys['arrowleft'] || keys['a']) ix -= 1;
  if (keys['arrowright'] || keys['d']) ix += 1;
  if (joyActive){ ix += joyVec.x; iz += joyVec.y; }

  const ilen = Math.hypot(ix, iz);
  if (ilen > 0.08) {
    ix /= ilen;
    iz /= ilen;
  } else {
    ix = 0;
    iz = 0;
  }

  // 입력 스무딩 → 덜 끊기는 가속
  const blend = 1 - Math.exp(-10 * dt);
  inputSmooth.x += (ix - inputSmooth.x) * blend;
  inputSmooth.z += (iz - inputSmooth.z) * blend;
  const moving = Math.hypot(inputSmooth.x, inputSmooth.z) > 0.05;

  if (moving){
    // 카메라 기준 이동 (좌우 부호: 화면 오른쪽 = 카메라 right)
    const wx = inputSmooth.x * Math.sin(camYaw) + inputSmooth.z * Math.cos(camYaw);
    const wz = -inputSmooth.x * Math.cos(camYaw) + inputSmooth.z * Math.sin(camYaw);
    velocity.x += wx * ACCEL * dt;
    velocity.y += wz * ACCEL * dt;
    const speed = velocity.length();
    if (speed > MAX_SPEED) velocity.multiplyScalar(MAX_SPEED / speed);
  } else {
    const speed = velocity.length();
    if (speed > 0) {
      const newSpeed = Math.max(0, speed - FRICTION * dt);
      velocity.multiplyScalar(newSpeed / speed);
      if (newSpeed < 0.05) velocity.set(0, 0);
    }
  }

  // 공중에서는 조향을 꽤 유지 (뛰어넘기용)
  const airCtrl = onGround ? 1 : 0.88;
  const feetY = Math.max(0, bobY);
  const nx = player.position.x + velocity.x * dt * airCtrl;
  const nz = player.position.z + velocity.y * dt * airCtrl;
  if (!collides(nx, player.position.z, feetY)) player.position.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nx));
  else velocity.x *= 0.2;
  if (!collides(player.position.x, nz, feetY)) player.position.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nz));
  else velocity.y *= 0.2;

  if (jumpQueued && onGround) {
    vy = JUMP_V;
    onGround = false;
    bodyCyl.scale.y = 0.72;
    bodyCyl.scale.x = 1.18;
    bodyCyl.scale.z = 1.18;
  }
  jumpQueued = false;

  if (!onGround) {
    vy -= GRAVITY * dt;
    bobY += vy * dt;
    if (bobY <= 0) {
      bobY = 0;
      vy = 0;
      onGround = true;
      resolveOverlap();
      bodyCyl.scale.y = 0.85;
      bodyCyl.scale.x = 1.12;
      bodyCyl.scale.z = 1.12;
    }
  } else if (moving && velocity.length() > 0.35) {
    walkT += dt * (6.5 + velocity.length() * 0.35);
    bobY = Math.abs(Math.sin(walkT * 2)) * 0.035;
    const stretch = 1 + Math.abs(Math.sin(walkT)) * 0.06;
    bodyCyl.scale.y += (stretch - bodyCyl.scale.y) * 0.25;
    bodyCyl.scale.x += ((1 / Math.sqrt(stretch)) - bodyCyl.scale.x) * 0.25;
    bodyCyl.scale.z = bodyCyl.scale.x;
  } else {
    bobY += (0 - bobY) * Math.min(1, dt * 10);
    bodyCyl.scale.y += (1 - bodyCyl.scale.y) * 0.2;
    bodyCyl.scale.x += (1 - bodyCyl.scale.x) * 0.2;
    bodyCyl.scale.z += (1 - bodyCyl.scale.z) * 0.2;
    walkT = 0;
  }

  player.position.y = bobY;

  // 실내 경계
  if (currentSceneId !== "overworld") {
    const lim = currentSceneId.startsWith("house_") ? 3.4 : 11;
    player.position.x = Math.max(-lim, Math.min(lim, player.position.x));
    player.position.z = Math.max(-lim, Math.min(lim, player.position.z));
  }

  if (velocity.length() > 0.25) {
    facingAngle = Math.atan2(velocity.x, velocity.y);
  }
  let diff = facingAngle - player.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  player.rotation.y += diff * Math.min(1, dt * 8);
}

function updateCamera(dt){
  const lerpFactor = 1 - Math.pow(0.0012, dt);
  if (camMode === "first") {
    const eye = new THREE.Vector3(
      player.position.x,
      player.position.y + 1.35,
      player.position.z
    );
    camPos.lerp(eye, Math.min(1, lerpFactor * 1.4));
    camera.position.copy(camPos);
    const lookDist = 10;
    const lp = THREE.MathUtils.clamp(camPitch, -0.45, 0.85);
    const look = new THREE.Vector3(
      eye.x + Math.sin(camYaw) * Math.cos(lp) * lookDist,
      eye.y + Math.sin(lp) * lookDist,
      eye.z + Math.cos(camYaw) * Math.cos(lp) * lookDist
    );
    camera.lookAt(look);
    return;
  }
  const targetOffset = computeCamOffset();
  const targetPos = player.position.clone().add(targetOffset);
  camPos.lerp(targetPos, lerpFactor);
  camera.position.copy(camPos);
  camera.lookAt(player.position.x, player.position.y + 0.65, player.position.z);
}

// ---------- 떠다니는 꽃잎 파티클 ----------
const petalCount = 14;
const petalGeo = new THREE.PlaneGeometry(0.12, 0.12);
const petalMat = new THREE.MeshBasicMaterial({ color: 0xe85880, transparent:true, opacity:0.78, side: THREE.DoubleSide, depthWrite: false });
petalMatRef = petalMat;
const petals = [];
for (let i=0;i<petalCount;i++){
  const p = new THREE.Mesh(petalGeo, petalMat);
  p.position.set(randPos(90), rand()*10+2, randPos(90));
  p.userData = { speed: 0.2+rand()*0.3, drift: rand()*Math.PI*2, fallSpeed: 0.3+rand()*0.3 };
  p.frustumCulled = true;
  scene.add(p);
  petals.push(p);
}
petalsRef = petals;
applyDesignSettings();

// ---------- 미니맵 ----------
const mmCanvas = document.getElementById('minimap');
const mmCtx = mmCanvas.getContext('2d');
function resizeMinimap(){
  const rect = mmCanvas.getBoundingClientRect();
  const size = rect.width * (devicePixelRatio || 1);
  mmCanvas.width = size; mmCanvas.height = size;
}
resizeMinimap();
addEventListener('resize', resizeMinimap);

const MM_RANGE = 40;

function drawMinimap(){
  const s = mmCanvas.width;
  mmCtx.clearRect(0,0,s,s);
  mmCtx.fillStyle = '#a8dc90';
  mmCtx.beginPath(); mmCtx.arc(s/2, s/2, s/2, 0, Math.PI*2); mmCtx.fill();

  const scale = (s/2) / MM_RANGE;
  function toMM(wx, wz){
    return {
      x: s/2 + (wx - player.position.x) * scale,
      y: s/2 + (wz - player.position.z) * scale
    };
  }

  mmCtx.fillStyle = '#a8d4e4';
  const pp = toMM(-14, 12);
  mmCtx.beginPath(); mmCtx.arc(pp.x, pp.y, 4.2*scale*1, 0, Math.PI*2); mmCtx.fill();

  mmCtx.fillStyle = '#8fcf82';
  trees.forEach(t => {
    const p = toMM(t.position.x, t.position.z);
    if (Math.hypot(p.x-s/2, p.y-s/2) > s/2) return;
    mmCtx.beginPath(); mmCtx.arc(p.x, p.y, 3.2*(s/150), 0, Math.PI*2); mmCtx.fill();
  });
  mmCtx.fillStyle = '#f0b8cc';
  flowerPts.forEach(f => {
    const p = toMM(f.x, f.z);
    if (Math.hypot(p.x-s/2, p.y-s/2) > s/2) return;
    mmCtx.beginPath(); mmCtx.arc(p.x, p.y, 1.4*(s/150), 0, Math.PI*2); mmCtx.fill();
  });
  const hp = toMM(housePos.x, housePos.z);
  mmCtx.fillStyle = '#f0b0b8';
  mmCtx.fillRect(hp.x-5*(s/150), hp.y-5*(s/150), 10*(s/150), 10*(s/150));

  mmCtx.save();
  mmCtx.translate(s/2, s/2);
  mmCtx.rotate(facingAngle);
  mmCtx.fillStyle = '#e088a0';
  mmCtx.beginPath();
  const tri = 6*(s/150);
  mmCtx.moveTo(0, -tri*1.6);
  mmCtx.lineTo(-tri, tri);
  mmCtx.lineTo(tri, tri);
  mmCtx.closePath();
  mmCtx.fill();
  mmCtx.restore();

  // 원격 플레이어
  for (const [idx, e] of remotePlayers) {
    const rp = toMM(e.mesh.position.x, e.mesh.position.z);
    if (Math.hypot(rp.x-s/2, rp.y-s/2) > s/2) continue;
    mmCtx.fillStyle = idx === 1 ? '#8ec8e8' : idx === 2 ? '#a8d898' : '#f0c8a0';
    mmCtx.beginPath(); mmCtx.arc(rp.x, rp.y, 3.5*(s/150), 0, Math.PI*2); mmCtx.fill();
  }

  mmCtx.strokeStyle = 'rgba(255,255,255,0.95)';
  mmCtx.lineWidth = 3*(s/150);
  mmCtx.beginPath(); mmCtx.arc(s/2, s/2, s/2-2, 0, Math.PI*2); mmCtx.stroke();
}


const remotePlayers = new Map();

function ensureRemote(index) {
  if (index === myIndex || remotePlayers.has(index)) return remotePlayers.get(index);
  const mesh = makeCharacterMesh(THREE, PLAYER_COLORS[index % PLAYER_COLORS.length], {
    index,
  });
  mesh.position.set(2 + index * 1.2, 0, 2);
  scene.add(mesh);
  const entry = { mesh, tx: mesh.position.x, ty: 0, tz: mesh.position.z, try: 0, scene: "overworld" };
  remotePlayers.set(index, entry);
  return entry;
}

function setRemoteImage(index, url) {
  const e = ensureRemote(index);
  if (!e) return;
  setCharacterImage(THREE, e.mesh, url);
}

function applyRemotePose(index, pose) {
  if (index === myIndex || !pose) return;
  const e = ensureRemote(index);
  e.tx = pose.x; e.ty = pose.y || 0; e.tz = pose.z; e.try = pose.ry || 0;
  e.scene = pose.scene || "overworld";
  e.mesh.visible = e.scene === currentSceneId;
  if (pose.imageUrl) setCharacterImage(THREE, e.mesh, pose.imageUrl);
}

function removeRemote(index) {
  const e = remotePlayers.get(index);
  if (!e) return;
  scene.remove(e.mesh);
  remotePlayers.delete(index);
}

function smoothRemotes(dt) {
  const k = Math.min(1, dt * 12);
  for (const e of remotePlayers.values()) {
    e.mesh.visible = (e.scene || "overworld") === currentSceneId;
    if (!e.mesh.visible) continue;
    e.mesh.position.x += (e.tx - e.mesh.position.x) * k;
    e.mesh.position.y += (e.ty - e.mesh.position.y) * k;
    e.mesh.position.z += (e.tz - e.mesh.position.z) * k;
    let diff = e.try - e.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    e.mesh.rotation.y += diff * k;
  }
}

/** 지평선 너머 오브젝트/원격 플레이어 숨김 (미니맵은 유지) */
function updateHorizonCull() {
  if (currentSceneId !== "overworld") {
    for (const e of remotePlayers.values()) {
      e.mesh.visible = (e.scene || "overworld") === currentSceneId;
    }
    return;
  }
  const px = player.position.x;
  const pz = player.position.z;
  const r2 = CULL_DIST * CULL_DIST;
  for (let i = 0; i < sceneryCull.length; i++) {
    const o = sceneryCull[i];
    if (!o.mesh) continue;
    const x = o.dyn ? o.mesh.position.x : o.x;
    const z = o.dyn ? o.mesh.position.z : o.z;
    const dx = x - px;
    const dz = z - pz;
    o.mesh.visible = dx * dx + dz * dz < r2;
  }
  const rr2 = REMOTE_HIDE_DIST * REMOTE_HIDE_DIST;
  for (const e of remotePlayers.values()) {
    if ((e.scene || "overworld") !== "overworld") {
      e.mesh.visible = false;
      continue;
    }
    const dx = e.mesh.position.x - px;
    const dz = e.mesh.position.z - pz;
    e.mesh.visible = dx * dx + dz * dz < rr2;
  }
}

let lastPoseT = 0;
function maybeSendPose(now) {
  if (!onPose) return;
  if (now - lastPoseT < 50) return;
  lastPoseT = now;
  onPose({
    x: +player.position.x.toFixed(3),
    y: +player.position.y.toFixed(3),
    z: +player.position.z.toFixed(3),
    ry: +player.rotation.y.toFixed(3),
    scene: currentSceneId,
  });
}


// ---------- 애니메이션 루프 ----------
const clock = new THREE.Clock();
let t = 0;
let frameN = 0;
function animate(){
  if (!running) return;
  rafId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;
  frameN++;
  if (interactCooldown > 0) interactCooldown -= dt;
  updatePlayer(dt);
  updateCamera(dt);
  updateDayNight(dt);
  smoothRemotes(dt);
  maybeSendPose(performance.now());
  if (frameN % 5 === 0) updateInteractHud();

  // 나무 흔들림·꽃잎·동물은 야외에서만
  if (currentSceneId === "overworld" && frameN % 2 === 0) {
    const px = player.position.x, pz = player.position.z;
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      const dx = tree.position.x - px, dz = tree.position.z - pz;
      if (dx * dx + dz * dz > 900) continue;
      tree.rotation.z = Math.sin(t * 0.8 + tree.userData.sway) * 0.015;
    }
    if (design.petal > 2) {
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.position.y -= p.userData.fallSpeed * dt * 2;
        p.position.x += Math.sin(t * p.userData.speed + p.userData.drift) * dt * 0.8;
        p.rotation.z += dt;
        if (p.position.y < 0) {
          p.position.y = 10 + rand() * 4;
          p.position.x = player.position.x + randPos(40);
          p.position.z = player.position.z + randPos(40);
        }
      }
    }
  }

  if (currentSceneId === "overworld" && frameN % 3 === 0) {
    updateCritters(dt * 3, t);
    updateHorizonCull();
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.position.x += c.userData.drift * dt * 3;
      c.position.y = c.userData.baseY + Math.sin(t * 0.35 + c.userData.bob) * 0.6;
      // 플레이어 주변 하늘 링 유지
      const dx = c.position.x - player.position.x;
      const dz = c.position.z - player.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 55 || dist < 12) {
        const ang = rand() * Math.PI * 2;
        const d = 24 + rand() * 22;
        c.position.x = player.position.x + Math.cos(ang) * d;
        c.position.z = player.position.z + Math.sin(ang) * d;
        c.userData.baseY = 20 + rand() * 10;
      }
    }
  }

  if (design.minimap && currentSceneId === "overworld" && frameN % 4 === 0) drawMinimap();
  renderer.render(scene, camera);
}
animate();

  return {
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      try { renderer.dispose(); } catch {}
      if (renderer.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      for (const e of remotePlayers.values()) scene.remove(e.mesh);
      remotePlayers.clear();
      for (const e of npcs.values()) scene.remove(e.mesh);
      npcs.clear();
    },
    applyRemotePose,
    removeRemote,
    setLocalImage(url) {
      setCharacterImage(THREE, player, url);
    },
    setRemoteImage,
    /** NPC 스폰 — 이후 퀘스트/상점 등에 사용 */
    spawnNpc,
    setNpcImage,
    removeNpc,
    getPose() {
      return {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        ry: player.rotation.y,
        scene: currentSceneId,
        imageUrl: player.userData.imageUrl || null,
      };
    },
    getSceneId: () => currentSceneId,
    enterScene,
    SUNDAY_KIDS,
  };


}
