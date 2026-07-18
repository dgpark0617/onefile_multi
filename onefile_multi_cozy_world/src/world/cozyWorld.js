/** Cozy World 3D — expects global THREE (r128). */
import { mulberry32 } from "../core/rng.js";
import { makeCharacterMesh, setCharacterImage, getCharFaceUrl, setCharacterColor } from "./characterVisual.js";
import { buildSundayContent, SUNDAY_KIDS } from "./sundayScenes.js";
import { TOKENS } from "./designTokens.js";

const PLAYER_COLORS = TOKENS.players;

/**
 * @param {{ mount?: HTMLElement, myIndex?: number, seed?: number, onPose?: (p:any)=>void, localImageUrl?: string|null, characterId?: string, characterColor?: number }} opts
 */
export function startCozyWorld(opts = {}) {
  const THREE = globalThis.THREE;
  if (!THREE) throw new Error("THREE is not loaded");
  const mount = opts.mount || document.getElementById("gameMount") || document.body;
  const myIndex = opts.myIndex ?? 0;
  const seed = (opts.seed ?? 0xc02a01) >>> 0;
  const rand = mulberry32(seed);
  const onPose = opts.onPose || null;
  const myKid =
    SUNDAY_KIDS.find((k) => k.id === opts.characterId) ||
    SUNDAY_KIDS[myIndex % SUNDAY_KIDS.length];
  const characterId = myKid.id;
  let running = true;
  let rafId = 0;


// ---------- 기본 세팅 ----------
const scene = new THREE.Scene();
// 맑은 맵: 동숲식 지평선 안개 제거 — 원거리 컬링만 유지
const CULL_DIST = 62;
const REMOTE_HIDE_DIST = 58;
const fogColor = 0xc8d8e0;
scene.fog = null;

const camera = new THREE.PerspectiveCamera(37, innerWidth/innerHeight, 0.1, 90);
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

const DESIGN_KEY = "cozy_world_design_v10";
// Warm Storybook Coast — 색은 머티리얼, 필터는 미세 조정만
const DESIGN_DEFAULTS = { ...TOKENS.design };
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
const shadowCheck = document.getElementById('shadowCheck');
const minimapCheck = document.getElementById('minimapCheck');
const satVal = document.getElementById('satVal');
const briVal = document.getElementById('briVal');
const conVal = document.getElementById('conVal');
const expVal = document.getElementById('expVal');
const warmVal = document.getElementById('warmVal');
const fogVal = document.getElementById('fogVal');
const minimapWrap = document.getElementById('minimapWrap');

function syncDesignInputs() {
  if (satSlider) satSlider.value = design.sat;
  if (briSlider) briSlider.value = design.bri;
  if (conSlider) conSlider.value = design.con;
  if (expSlider) expSlider.value = design.exp;
  if (warmSlider) warmSlider.value = design.warm;
  if (fogSlider) fogSlider.value = design.fog;
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

  // 지평선 안개 미사용 — 맑은 시야 + 카메라 far만 확보
  scene.fog = null;
  const inOverworld = typeof currentSceneId === "undefined" || currentSceneId === "overworld";
  camera.far = inOverworld ? Math.max(90, SKY_RADIUS + 12) : 80;
  camera.updateProjectionMatrix();
  if (fogVal) fogVal.textContent = "끔";
  if (fogSlider) fogSlider.value = 0;

  renderer.shadowMap.enabled = !!design.shadow;
  sun.castShadow = !!design.shadow;
  if (minimapWrap) minimapWrap.classList.toggle('hidden-ui', !design.minimap);

  saveDesign(design);
}

function onDesignInput() {
  readDesignFromInputs();
  applyDesignSettings();
}

[satSlider, briSlider, conSlider, expSlider, warmSlider, fogSlider]
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
const topColor = new THREE.Color(TOKENS.skyKeys[2].top);
const bottomColor = new THREE.Color(TOKENS.skyKeys[2].bot);
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
scene.background = new THREE.Color(TOKENS.skyKeys[2].top);

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
  const dist = 18 + rand() * 24;
  clouds.push(
    makeCloud(
      Math.cos(ang) * dist,
      8 + rand() * 5, // 더 낮게 — 시야에 가깝게
      Math.sin(ang) * dist,
      3.2 + rand() * 2.2
    )
  );
}

// ---------- 조명 ----------
const ambient = new THREE.HemisphereLight(TOKENS.hemiSky, TOKENS.hemiGround, TOKENS.ambientDay);
scene.add(ambient);

const sun = new THREE.DirectionalLight(TOKENS.sun, TOKENS.sunDay);
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

const fillLight = new THREE.DirectionalLight(TOKENS.fill, 0.28);
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

// Warm Storybook Coast 하늘 키프레임
const SKY_KEYS = TOKENS.skyKeys;

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

// 별 (둥근 포인트 — map 없으면 흰 사각형으로 보임)
function makeStarSpriteTex() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,250,255,0.85)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
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
  map: makeStarSpriteTex(),
  color: 0xfff8ff,
  size: 1.4,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0,
  fog: false,
  depthWrite: false,
  alphaTest: 0.08,
});
const stars = new THREE.Points(starGeo, starMat);
stars.visible = false;
scene.add(stars);

// 달 · 해 (보이는 천체)
// 마을 좌표: +Z = 동쪽(말씀 문) · −Z = 서쪽 — 성막이 동쪽을 향하던 것과 같음
const CELESTIAL_R = 78;
const EAST_Z = 1; // +Z 동쪽

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

const sunGroup = new THREE.Group();
const sunDiskMat = new THREE.MeshBasicMaterial({
  color: 0xfff2a8,
  fog: false,
  transparent: true,
  opacity: 1,
  depthWrite: false,
});
const sunGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffc878,
  fog: false,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
});
const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(4.2, 14, 12), sunDiskMat);
const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(7.2, 12, 10), sunGlowMat);
sunGroup.add(sunHalo);
sunGroup.add(sunDisk);
sunGroup.visible = false;
scene.add(sunGroup);

const moonLight = new THREE.DirectionalLight(0xd0d8ec, 0);
moonLight.position.set(-20, 18, -12);
scene.add(moonLight);

/**
 * 천체 궤도 — phase 0=자정, 0.25=일출(+Z 동쪽), 0.5=정오, 0.75=일몰(−Z 서쪽)
 * offset 0.5 = 반대편(달)
 */
function celestialOffset(phase, offset = 0) {
  const theta = (phase - 0.25 + offset) * Math.PI * 2;
  // 남쪽(+X)으로 살짝 기울인 동→서 대호
  const y = Math.sin(theta) * CELESTIAL_R;
  const z = Math.cos(theta) * CELESTIAL_R * EAST_Z;
  const x = Math.sin(theta) * CELESTIAL_R * 0.32;
  return { x, y, z, theta, above: y > -6 };
}

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

  // 시계 HUD (게임내 시각) — 항상
  const mins = (phase * 24 * 60) | 0;
  const hh = String((mins / 60) | 0).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");

  // 포켓(말씀·집) 장면: 우주 조명, 마을 하늘 갱신 스킵
  if (currentSceneId !== "overworld") {
    clockBadge.textContent = `✨ ${hh}:${mm}`;
    sky.visible = false;
    stars.visible = false;
    moonGroup.visible = false;
    sunGroup.visible = false;
    scene.background.setHex(0x07051a);
    if (scene.fog) scene.fog = null;
    ambient.intensity = 0.65;
    ambient.color.setRGB(0.75, 0.78, 0.95);
    ambient.groundColor.setRGB(0.25, 0.28, 0.45);
    sun.intensity = 0.42;
    sun.color.setRGB(0.85, 0.88, 1);
    sun.position.set(6, 16, 8);
    fillLight.intensity = 0.2;
    moonLight.intensity = 0.15;
    const bag = sceneBags.get(currentSceneId);
    if (bag?.root?.userData?.cosmos) {
      bag.root.userData.cosmos.rotation.y += dt * 0.025;
    }
    return;
  }

  if (!scene.fog) {
    // 지평선 안개 비활성 — 재생성하지 않음
  }
  sky.visible = true;

  const { a, b, t } = sampleSkyKey(phase);

  // 태양 고도: 정오(0.5)에서 최고 — +Z(동)에서 떠 −Z(서)로 짐
  const sunCel = celestialOffset(phase, 0);
  const moonCel = celestialOffset(phase, 0.5);
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

  // 방향광 = 천체 위치 (동→서 궤도)
  sun.position.set(sunCel.x, Math.max(sunCel.y, 2), sunCel.z);
  // 지평선 근처일수록 따뜻한 석양/여명색
  const horizonWarm = THREE.MathUtils.clamp(1 - Math.abs(sunElev), 0, 1);
  sun.color.setRGB(
    1,
    THREE.MathUtils.lerp(0.72, 0.95, dayAmt * (1 - horizonWarm * 0.35)),
    THREE.MathUtils.lerp(0.55, 0.88, dayAmt * (1 - horizonWarm * 0.55))
  );
  sun.intensity = THREE.MathUtils.lerp(0.08, 0.92, dayAmt);

  fillLight.intensity = THREE.MathUtils.lerp(0.12, 0.22, dayAmt);
  moonLight.intensity = nightAmt * 0.28;
  moonLight.position.set(moonCel.x, Math.max(moonCel.y, 4), moonCel.z);

  // 보이는 해 — 지평선 위로 떠오르고 짐
  const sunVis = THREE.MathUtils.smoothstep(sunElev, -0.08, 0.22);
  sunGroup.visible = sunVis > 0.02;
  if (sunGroup.visible) {
    sunGroup.position.set(
      player.position.x + sunCel.x,
      sunCel.y,
      player.position.z + sunCel.z
    );
    sunDiskMat.opacity = sunVis;
    sunGlowMat.opacity = sunVis * (0.28 + horizonWarm * 0.25);
    sunDiskMat.color.setRGB(1, THREE.MathUtils.lerp(0.75, 0.95, 1 - horizonWarm * 0.5), THREE.MathUtils.lerp(0.45, 0.7, 1 - horizonWarm));
    sunGlowMat.color.setRGB(1, THREE.MathUtils.lerp(0.55, 0.85, 1 - horizonWarm * 0.4), THREE.MathUtils.lerp(0.3, 0.55, 1 - horizonWarm));
  }

  // 구름
  cloudMat.color.setRGB(
    THREE.MathUtils.lerp(0.86, 1, dayAmt),
    THREE.MathUtils.lerp(0.86, 0.98, dayAmt),
    THREE.MathUtils.lerp(0.94, 0.98, dayAmt)
  );
  cloudMat.opacity = THREE.MathUtils.lerp(0.58, 0.9, dayAmt);

  // 별 — 깊은 밤에만 (석양·보랏빛 하늘에 사각형처럼 안 뜨게)
  const starVis = THREE.MathUtils.smoothstep(nightAmt, 0.55, 0.88);
  starMat.opacity = starVis * 0.9;
  stars.visible = starVis > 0.05;
  if (stars.visible) {
    stars.position.copy(player.position);
    stars.position.y = 0;
  }

  // 달 — 해의 반대편, +Z(동)에서 떠 −Z(서)로 짐
  const moonElev = Math.sin((phase - 0.25 + 0.5) * Math.PI * 2);
  const moonVis = THREE.MathUtils.smoothstep(moonElev, -0.05, 0.25) * THREE.MathUtils.smoothstep(nightAmt, 0.12, 0.55);
  moonGroup.visible = moonVis > 0.02;
  moonMat.opacity = moonVis * 0.95;
  moonGlowMat.opacity = moonVis * 0.28;
  if (moonGroup.visible) {
    moonGroup.position.set(
      player.position.x + moonCel.x,
      moonCel.y,
      player.position.z + moonCel.z
    );
  }

  // 별똥별
  updateShootingStars(dt, nightAmt, player.position);

  // 하늘 돔·별이 플레이어를 따라가며 far clip에 안 잘리게
  sky.position.copy(camera.position);

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
  bushMat: new THREE.MeshStandardMaterial({ color: TOKENS.bush, roughness: 0.75 }),
  trunkMat: new THREE.MeshStandardMaterial({ color: TOKENS.trunk, roughness: 0.85 }),
  stemMat: new THREE.MeshStandardMaterial({ color: TOKENS.stem, roughness: 0.8 }),
  mushStemMat: new THREE.MeshStandardMaterial({ color: 0xffe8c8 }),
  fruitGeo: new THREE.SphereGeometry(0.1, 8, 7),
  fruitMats: TOKENS.fruit.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })
  ),
  fruitStemMat: new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.85 }),
  fruitLeafMat: new THREE.MeshStandardMaterial({ color: 0x58a048, roughness: 0.75, side: THREE.DoubleSide }),
  nestMat: new THREE.MeshStandardMaterial({ color: 0x986838, roughness: 0.9 }),
  nestGeo: new THREE.TorusGeometry(0.14, 0.045, 5, 8),
  grassMat: new THREE.MeshStandardMaterial({ color: TOKENS.grassDeep, roughness: 0.8 }),
  grassGeo: new THREE.ConeGeometry(0.06, 0.28, 4),
  rabbitMat: new THREE.MeshStandardMaterial({ color: 0xf0e0d0, roughness: 0.82 }),
  rabbitEarInMat: new THREE.MeshStandardMaterial({ color: 0xf0a8b8, roughness: 0.75 }),
  rabbitTailMat: new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.9 }),
  foxMat: new THREE.MeshStandardMaterial({ color: 0xd06020, roughness: 0.72 }),
  foxTailMat: new THREE.MeshStandardMaterial({ color: 0xf0d8b8, roughness: 0.82 }),
  moleMat: new THREE.MeshStandardMaterial({ color: 0x786048, roughness: 0.85 }),
  fishMats: [
    new THREE.MeshStandardMaterial({ color: 0xe84828, roughness: 0.45, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: 0xe8a818, roughness: 0.42, metalness: 0.22 }),
  ],
};

// ---------- 바닥: 패치형 색상 변화 ----------
const groundGeo = new THREE.PlaneGeometry(200, 200, 24, 24);
groundGeo.rotateX(-Math.PI/2);
const gPos = groundGeo.attributes.position;
const gColors = [];
const baseGreen = new THREE.Color(TOKENS.grassLight);
const deepGreen = new THREE.Color(TOKENS.grassDeep);
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
const pathMat = new THREE.MeshStandardMaterial({ color: TOKENS.path, roughness: 0.88 });
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

// ---------- 연못 (반투명 수면 — 잉어가 비침) ----------
const pondFloorMat = new THREE.MeshStandardMaterial({
  color: 0x2a6870,
  roughness: 1,
});
const pondFloor = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.05, 0.12, 24), pondFloorMat);
pondFloor.position.set(-14, -0.52, 12);
pondFloor.receiveShadow = true;
scene.add(pondFloor);

const pondMat = new THREE.MeshStandardMaterial({
  color: TOKENS.pond,
  roughness: 0.22,
  metalness: 0.08,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});
const pond = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.55, 24), pondMat);
pond.position.set(-14, -0.2, 12); // 수면 ≈ y 0.07
pond.receiveShadow = true;
pond.renderOrder = 2;
scene.add(pond);
const pondRimMat = new THREE.MeshStandardMaterial({ color: TOKENS.pondRim, roughness: 1 });
const pondRim = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.25, 8, 24), pondRimMat);
pondRim.rotation.x = Math.PI / 2;
pondRim.position.set(-14, 0.05, 12);
scene.add(pondRim);
for (let i = 0; i < 5; i++) {
  const lilyMat = new THREE.MeshStandardMaterial({ color: TOKENS.lily });
  const lily = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 10), lilyMat));
  const ang = rand() * Math.PI * 2,
    r = rand() * 3;
  lily.position.set(-14 + Math.cos(ang) * r, 0.09, 12 + Math.sin(ang) * r);
  scene.add(lily);
}

/** 연못 잉어 — 유선형 관절 몸체, 유영만 흉내 */
const POND_CX = -14;
const POND_CZ = 12;
const POND_R = 3.2;
/** 토끼·여우가 못 들어가는 연못 바깥 반경 (수면 실린더 4.2 + 여유) */
const POND_KEEP_OUT = 4.75;
const POND_SURFACE_Y = 0.07;

/** (x,z)가 연못 안이면 가장자리 밖으로 밀어냄 */
function awayFromPond(x, z, margin = POND_KEEP_OUT) {
  const dx = x - POND_CX;
  const dz = z - POND_CZ;
  const d = Math.hypot(dx, dz);
  if (d >= margin) return { x, z };
  if (d < 1e-4) {
    return { x: POND_CX + margin, z: POND_CZ };
  }
  const s = margin / d;
  return { x: POND_CX + dx * s, z: POND_CZ + dz * s };
}
const fishes = [];
function makeFish(matIdx = 0) {
  const g = new THREE.Group();
  const mat = shared.fishMats[matIdx % shared.fishMats.length];
  // 머리→꼬리로 이어진 관절 (세밀한 지느러미/눈 없음)
  const radii = [0.1, 0.12, 0.11, 0.085, 0.06, 0.04];
  const joints = [];
  let parent = g;
  for (let i = 0; i < radii.length; i++) {
    const joint = new THREE.Group();
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5), mat);
    blob.scale.set(radii[i] * 0.72, radii[i] * 0.88, radii[i] * 1.35);
    joint.add(blob);
    joint.position.z = i === 0 ? 0.22 : -(radii[i - 1] + radii[i]) * 1.05;
    parent.add(joint);
    joints.push(joint);
    parent = joint;
  }

  g.scale.setScalar(1.05 + matIdx * 0.1);
  g.userData = {
    joints,
    phase: matIdx * Math.PI * 0.9 + rand() * 0.4,
    speed: 0.14 + matIdx * 0.03,
    radius: 1.6 + matIdx * 0.7,
    depth: POND_SURFACE_Y - (0.28 + matIdx * 0.1),
    swimT: rand() * Math.PI * 2,
  };
  g.renderOrder = 1;
  scene.add(g);
  fishes.push(g);
  return g;
}
makeFish(0);
makeFish(1);

function updateFishes(dt, time) {
  for (let i = 0; i < fishes.length; i++) {
    const f = fishes[i];
    const u = f.userData;
    const ang = time * u.speed + u.phase;
    const x = POND_CX + Math.cos(ang) * u.radius;
    const z = POND_CZ + Math.sin(ang) * u.radius * 0.88;
    const prevX = f.position.x;
    const prevZ = f.position.z;
    f.position.set(x, u.depth, z);
    const dx = x - prevX;
    const dz = z - prevZ;
    if (Math.hypot(dx, dz) > 0.0004) {
      f.rotation.y = Math.atan2(dx, dz);
    }
    // 관절 파도 — 유영
    u.swimT += dt * (3.8 + u.speed * 2);
    const joints = u.joints;
    for (let j = 0; j < joints.length; j++) {
      const amp = 0.12 + j * 0.07;
      joints[j].rotation.y = Math.sin(u.swimT + j * 0.9) * amp;
    }
  }
}

// ---------- 나무 ----------
const treeLeafColors = TOKENS.leaf;

/** 열매 — 둥근 몸통 + 꼭지 + 잎 */
function makeFruit(matIdx = 0) {
  const g = new THREE.Group();
  const mat = shared.fruitMats[matIdx % shared.fruitMats.length];
  const body = new THREE.Mesh(shared.fruitGeo, mat);
  // 살짝 위가 납작한 사과 느낌
  body.scale.set(1, 0.92, 1);
  g.add(body);
  const dent = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 })
  );
  dent.position.y = 0.085;
  dent.scale.set(1.2, 0.35, 1.2);
  g.add(dent);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.016, 0.08, 4),
    shared.fruitStemMat
  );
  stem.position.y = 0.12;
  stem.rotation.z = 0.2;
  g.add(stem);
  const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), shared.fruitLeafMat);
  leaf.position.set(0.04, 0.13, 0);
  leaf.rotation.set(-0.6, 0.3, 0.8);
  g.add(leaf);
  g.scale.setScalar(1.15);
  return g;
}

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

  // 열매 — 사과/자두 형태 (꼭지·잎)
  const fruitN = Math.floor(rand() * 3.2);
  g.userData.fruitLocals = [];
  for (let i = 0; i < fruitN; i++) {
    const fruit = makeFruit(Math.floor(rand() * shared.fruitMats.length));
    const ang = rand() * Math.PI * 2;
    const r = 0.35 + rand() * 0.45;
    const fy = 1.9 + rand() * 0.7;
    fruit.position.set(Math.cos(ang) * r, fy, Math.sin(ang) * r);
    fruit.rotation.y = rand() * Math.PI;
    g.add(fruit);
    g.userData.fruitLocals.push({
      x: fruit.position.x,
      y: fruit.position.y,
      z: fruit.position.z,
    });
  }

  // 새집 (~40%) — 새가 드나들 수 있게
  if (rand() < 0.4) {
    const nest = new THREE.Mesh(shared.nestGeo, shared.nestMat);
    nest.rotation.x = Math.PI / 2;
    const nx = 0.35 + rand() * 0.2;
    const ny = 1.55;
    const nz = 0.1;
    nest.position.set(nx, ny, nz);
    g.add(nest);
    g.userData.hasNest = true;
    g.userData.nestLocal = { x: nx, y: ny, z: nz };
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

/** 토끼 / 여우 / 두더지 — 종류별로 실루엣 구분 */
const critters = [];
function makeCritter(kind, x, z) {
  const g = new THREE.Group();

  if (kind === "rabbit") {
    const mat = shared.rabbitMat;
    // 타원 몸통
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), mat);
    body.scale.set(0.95, 0.85, 1.25);
    body.position.y = 0.18;
    g.add(body);
    // 머리
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 7), mat);
    head.position.set(0, 0.3, 0.18);
    g.add(head);
    // 볼
    [-0.08, 0.08].forEach((ox) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 5), mat);
      cheek.position.set(ox, 0.26, 0.26);
      g.add(cheek);
    });
    // 긴 귀
    [-0.05, 0.05].forEach((ox) => {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.28, 6), mat);
      ear.position.set(ox, 0.48, 0.12);
      ear.rotation.z = ox > 0 ? -0.18 : 0.18;
      ear.rotation.x = -0.15;
      g.add(ear);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.2, 5), shared.rabbitEarInMat);
      inner.position.set(ox, 0.48, 0.125);
      inner.rotation.copy(ear.rotation);
      g.add(inner);
    });
    // 코
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 5, 5),
      new THREE.MeshStandardMaterial({ color: 0xe07090, roughness: 0.7 })
    );
    nose.position.set(0, 0.28, 0.3);
    g.add(nose);
    // 솜꼬리
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), shared.rabbitTailMat);
    tail.position.set(0, 0.2, -0.18);
    g.add(tail);
  } else if (kind === "fox") {
    const mat = shared.foxMat;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), mat);
    body.scale.set(1.05, 0.8, 1.45);
    body.position.y = 0.2;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), mat);
    head.scale.set(0.9, 0.85, 1.15);
    head.position.set(0, 0.3, 0.26);
    g.add(head);
    // 뾰족한 귀
    [-0.06, 0.06].forEach((ox) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 5), mat);
      ear.position.set(ox, 0.42, 0.22);
      g.add(ear);
    });
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 5), mat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.26, 0.38);
    g.add(snout);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), shared.foxTailMat);
    tail.scale.set(0.55, 0.55, 1.4);
    tail.position.set(0, 0.22, -0.32);
    g.add(tail);
  } else {
    // mole
    const mat = shared.moleMat;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6), mat);
    body.scale.set(1.15, 0.65, 1.3);
    body.position.y = 0.1;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat);
    head.position.set(0, 0.14, 0.18);
    g.add(head);
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 5, 5),
      new THREE.MeshStandardMaterial({ color: 0xc08090, roughness: 0.7 })
    );
    nose.position.set(0, 0.12, 0.28);
    g.add(nose);
  }

  g.position.set(x, 0, z);
  const home =
    kind === "rabbit" || kind === "fox" ? awayFromPond(x, z, POND_KEEP_OUT + 0.5) : { x, z };
  g.position.set(home.x, 0, home.z);
  g.userData = {
    kind,
    homeX: home.x,
    homeZ: home.z,
    phase: rand() * Math.PI * 2,
    speed: kind === "rabbit" ? 0.9 + rand() * 0.4 : 0.6 + rand() * 0.5,
    facing: rand() * Math.PI * 2,
    // 토끼: 작은 깡총 자주 / 큰 깡총 가끔 / 쉬는 구간
    hopState: "idle",
    hopKind: "small",
    hopAge: 0,
    hopDur: 0.28,
    hopsLeft: 0,
    pauseLeft: 0.3 + rand() * 0.8,
    hopH: 0,
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
    const roam = u.kind === "mole" ? 0.8 : u.kind === "rabbit" ? 2.0 : 1.6;
    const ox = Math.sin(time * u.speed + u.phase) * roam;
    const oz = Math.cos(time * u.speed * 0.85 + u.phase) * roam;
    let tx = u.homeX + ox;
    let tz = u.homeZ + oz;
    // 토끼·여우: 연못 안으로 목표/위치 못 들어감
    if (u.kind === "rabbit" || u.kind === "fox") {
      const safeT = awayFromPond(tx, tz);
      tx = safeT.x;
      tz = safeT.z;
    }
    const dx = tx - c.position.x;
    const dz = tz - c.position.z;

    if (u.kind === "rabbit") {
      // 자연스러운 토끼: 작게 자주 깡총 / 크게 한두 번 / 잠깐 쉼
      const startHop = (kind) => {
        u.hopState = "hop";
        u.hopKind = kind;
        u.hopAge = 0;
        if (kind === "big") {
          u.hopDur = 0.42 + rand() * 0.1;
          u.hopPeak = 0.38 + rand() * 0.1;
          u.hopStep = 5.5 + rand() * 1.5;
        } else {
          u.hopDur = 0.18 + rand() * 0.06;
          u.hopPeak = 0.1 + rand() * 0.06;
          u.hopStep = 3.2 + rand() * 1.2;
        }
      };
      const pickNextBurst = () => {
        const r = rand();
        if (r < 0.55) {
          // 작은 깡총 3~6번 연속
          u.hopsLeft = 3 + Math.floor(rand() * 4);
          startHop("small");
        } else if (r < 0.72) {
          // 큰 깡총 1~2번
          u.hopsLeft = 1 + (rand() < 0.45 ? 1 : 0);
          startHop("big");
        } else {
          // 잠깐 멈춰 두리번
          u.hopState = "idle";
          u.pauseLeft = 0.35 + rand() * 1.1;
          u.hopH = 0;
          c.rotation.x = 0.02;
          c.scale.set(1, 1, 1);
        }
      };

      if (u.hopState === "idle") {
        u.pauseLeft -= dt;
        u.hopH = 0;
        c.rotation.x = 0.02 + Math.sin(time * 2.2 + u.phase) * 0.03;
        c.scale.set(1, 1, 1);
        // 쉴 때도 아주 살짝 목표 쪽으로 몸을 돌림
        if (Math.hypot(dx, dz) > 0.05) {
          const turn = Math.atan2(dx, dz);
          u.facing += Math.atan2(Math.sin(turn - u.facing), Math.cos(turn - u.facing)) * Math.min(1, dt * 1.8);
        }
        if (u.pauseLeft <= 0) pickNextBurst();
      } else {
        u.hopAge += dt;
        const t = Math.min(1, u.hopAge / u.hopDur);
        const airborne = t < 0.72;
        if (airborne) {
          const airT = t / 0.72;
          u.hopH = Math.sin(airT * Math.PI) * u.hopPeak;
          const step = Math.min(1, dt * u.hopStep);
          c.position.x += dx * step;
          c.position.z += dz * step;
          const safe = awayFromPond(c.position.x, c.position.z);
          c.position.x = safe.x;
          c.position.z = safe.z;
          c.rotation.x = -0.12 - (u.hopKind === "big" ? 0.1 : 0.04) + airT * 0.12;
          const stretch = Math.sin(airT * Math.PI);
          c.scale.set(1.04 - stretch * 0.06, 0.94 + stretch * 0.14, 1.04 - stretch * 0.06);
        } else {
          // 착지 스쿼시
          const land = (t - 0.72) / 0.28;
          u.hopH = 0;
          c.rotation.x = 0.06;
          const squash = 1 - Math.sin(Math.min(1, land) * Math.PI) * (u.hopKind === "big" ? 0.14 : 0.08);
          c.scale.set(1.1 / squash, 0.9 * squash, 1.1 / squash);
        }
        if (Math.hypot(dx, dz) > 0.02) u.facing = Math.atan2(dx, dz);

        if (t >= 1) {
          u.hopsLeft -= 1;
          if (u.hopsLeft > 0) {
            // 같은 버스트 안 짧은 착지 후 바로 다음 hop
            startHop(u.hopKind);
            u.hopAge = 0;
          } else if (u.hopKind === "small" && rand() < 0.22) {
            // 작은 hop 끝에 가끔 큰 hop 한 번 덧붙임
            u.hopsLeft = 1;
            startHop("big");
          } else {
            u.hopState = "idle";
            u.pauseLeft = 0.15 + rand() * 0.55;
            u.hopH = 0;
            c.scale.set(1, 1, 1);
          }
        }
      }
      c.position.y = u.hopH;
      c.rotation.y = u.facing;
      continue;
    }

    c.position.x += dx * Math.min(1, dt * 2.2);
    c.position.z += dz * Math.min(1, dt * 2.2);
    if (u.kind === "fox") {
      const safe = awayFromPond(c.position.x, c.position.z);
      c.position.x = safe.x;
      c.position.z = safe.z;
    }
    if (Math.hypot(dx, dz) > 0.02) {
      u.facing = Math.atan2(dx, dz);
    }
    c.rotation.y = u.facing;
    c.rotation.x = 0;
    c.scale.set(1, 1, 1);
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
  const capMat = new THREE.MeshStandardMaterial({ color: TOKENS.mushCap[Math.floor(rand()*3)] });
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
  const colors = TOKENS.flower;
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
  const mat = new THREE.MeshStandardMaterial({ color: TOKENS.rock, roughness: 1 });
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
  const mat = new THREE.MeshStandardMaterial({ color: TOKENS.fence, roughness: 0.9 });
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
  const wallMat = new THREE.MeshStandardMaterial({ color: TOKENS.houseWall });
  const wall = shadowify(new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), wallMat));
  wall.position.y = 1;
  g.add(wall);

  const roofMat = new THREE.MeshStandardMaterial({ color: TOKENS.cottageRoofDefault });
  const roof = shadowify(new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.6, 4), roofMat));
  roof.position.y = 2.8;
  roof.rotation.y = Math.PI/4;
  g.add(roof);

  const chimneyMat = new THREE.MeshStandardMaterial({ color: TOKENS.houseChimney });
  const chimney = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.35,0.7,0.35), chimneyMat));
  chimney.position.set(0.9, 3.1, 0.5);
  g.add(chimney);

  const doorMat = new THREE.MeshStandardMaterial({ color: TOKENS.houseDoor });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.05), doorMat);
  door.position.set(0, 0.55, 1.53);
  g.add(door);

  const winMat = new THREE.MeshStandardMaterial({ color: TOKENS.houseWin });
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

/** 새집·열매·연못 웨이포인트 */
const nestSites = [];
const fruitSites = [];
for (const tree of trees) {
  if (tree.userData.hasNest && tree.userData.nestLocal) {
    const n = tree.userData.nestLocal;
    nestSites.push({
      kind: "nest",
      x: tree.position.x + n.x,
      y: n.y,
      z: tree.position.z + n.z,
    });
  }
  for (const f of tree.userData.fruitLocals || []) {
    fruitSites.push({
      kind: "fruit",
      x: tree.position.x + f.x,
      y: f.y,
      z: tree.position.z + f.z,
    });
  }
}
const pondSite = { kind: "pond", x: POND_CX, y: POND_SURFACE_Y + 0.45, z: POND_CZ };

/** 새 — 참새 실루엣, 새집↔열매↔연못을 오가며 자연 비행 */
const birdBodyMat = new THREE.MeshStandardMaterial({ color: 0xc07040, roughness: 0.7 });
const birdBellyMat = new THREE.MeshStandardMaterial({ color: 0xf0dcc0, roughness: 0.78 });
const birdWingMat = new THREE.MeshStandardMaterial({ color: 0x7a4830, roughness: 0.72 });
const birdBeakMat = new THREE.MeshStandardMaterial({ color: 0xe88828, roughness: 0.5 });
const birds = [];

function makeBird() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), birdBodyMat);
  body.scale.set(0.7, 0.75, 1.35);
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), birdBellyMat);
  belly.scale.set(0.65, 0.55, 1.05);
  belly.position.set(0, -0.05, 0.04);
  g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 7), birdBodyMat);
  head.position.set(0, 0.1, 0.22);
  g.add(head);
  [-0.05, 0.05].forEach((ox) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 5, 5),
      new THREE.MeshStandardMaterial({ color: 0x1a1010, roughness: 0.4 })
    );
    eye.position.set(ox, 0.12, 0.3);
    g.add(eye);
  });
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 5), birdBeakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.08, 0.34);
  g.add(beak);
  for (let i = -1; i <= 1; i++) {
    const feather = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.22), birdWingMat);
    feather.position.set(i * 0.04, 0.02, -0.28);
    feather.rotation.x = -0.4;
    feather.rotation.y = i * 0.25;
    g.add(feather);
  }
  const wingGeo = new THREE.BoxGeometry(0.42, 0.04, 0.22);
  const wingL = new THREE.Mesh(wingGeo, birdWingMat);
  wingL.position.set(-0.2, 0.04, 0.02);
  wingL.rotation.z = 0.25;
  g.add(wingL);
  const wingR = new THREE.Mesh(wingGeo, birdWingMat);
  wingR.position.set(0.2, 0.04, 0.02);
  wingR.rotation.z = -0.25;
  g.add(wingR);
  g.userData.wingL = wingL;
  g.userData.wingR = wingR;
  g.scale.setScalar(1.35);

  // 시작: 연못·새집·열매 중 하나 근처
  const startPool = [
    ...(nestSites.length ? nestSites : []),
    ...(fruitSites.length ? fruitSites : []),
    pondSite,
  ];
  const start = startPool[Math.floor(rand() * startPool.length)] || pondSite;
  g.position.set(start.x, start.y + 0.15, start.z);
  g.userData.state = "perch";
  g.userData.target = start;
  g.userData.lastKind = start.kind;
  g.userData.timer = 1.5 + rand() * 2;
  g.userData.phase = rand() * Math.PI * 2;
  g.userData.flapT = rand() * Math.PI * 2;
  g.userData.cruise = 3.2 + rand() * 0.6;
  g.userData.velY = 0;
  g.userData.from = { x: start.x, y: start.y, z: start.z };
  g.userData.arcH = 2.2;
  scene.add(g);
  birds.push(g);
  return g;
}

function collectBirdTargets() {
  const list = [];
  for (const n of nestSites) list.push(n);
  for (const f of fruitSites) list.push(f);
  list.push(pondSite);
  return list;
}

function pickBirdTarget(u) {
  const all = collectBirdTargets();
  if (!all.length) return pondSite;
  // 직전 종류와 다른 곳을 우선 (새집↔열매↔연못 순환 느낌)
  const kinds = ["nest", "fruit", "pond"].filter((k) => k !== u.lastKind);
  let pool = all.filter((t) => kinds.includes(t.kind));
  if (!pool.length) pool = all;
  // 너무 가까운 같은 지점 제외
  pool = pool.filter(
    (t) =>
      !u.target ||
      Math.hypot(t.x - u.target.x, t.z - u.target.z) > 1.2
  );
  if (!pool.length) pool = all;
  return pool[Math.floor(rand() * pool.length)];
}

function startBirdFlight(b) {
  const u = b.userData;
  const next = pickBirdTarget(u);
  u.from = { x: b.position.x, y: b.position.y, z: b.position.z };
  u.target = next;
  u.state = "fly";
  b.visible = true;
  const dist = Math.hypot(next.x - u.from.x, next.z - u.from.z);
  u.arcH = 1.6 + Math.min(4.5, dist * 0.18) + rand() * 0.8;
  u.cruise = 2.8 + rand() * 1.1;
}

function updateBirds(dt, time) {
  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const u = b.userData;
    u.timer -= dt;

    if (u.state === "perch") {
      const t = u.target;
      if (t) {
        if (t.kind === "nest") {
          // 새집 안 — 잠깐 숨김
          b.visible = false;
          b.position.set(t.x, t.y + 0.04, t.z);
        } else if (t.kind === "fruit") {
          b.visible = true;
          b.position.set(t.x + 0.12, t.y + 0.18, t.z + 0.08);
          b.rotation.x = 0.15;
          b.rotation.z = 0;
        } else {
          // 연못 수면 위 살짝
          b.visible = true;
          b.position.set(
            t.x + Math.sin(time * 0.7 + u.phase) * 0.35,
            t.y + Math.sin(time * 2 + u.phase) * 0.04,
            t.z + Math.cos(time * 0.7 + u.phase) * 0.35
          );
          b.rotation.x = 0.05;
        }
      }
      u.wingL.rotation.z = 0.2;
      u.wingR.rotation.z = -0.2;
      u.wingL.rotation.x = 0;
      u.wingR.rotation.x = 0;
      if (u.timer <= 0) startBirdFlight(b);
      continue;
    }

    // ---- 비행: 출발→도착 호를 그리며 (상승 후 하강) ----
    const tgt = u.target || pondSite;
    const from = u.from || { x: b.position.x, y: b.position.y, z: b.position.z };
    const dx = tgt.x - b.position.x;
    const dz = tgt.z - b.position.z;
    const distXZ = Math.hypot(dx, dz);
    const totalXZ = Math.max(0.01, Math.hypot(tgt.x - from.x, tgt.z - from.z));
    const progress = 1 - Math.min(1, distXZ / totalXZ);
    // 목표 고도 = 직선 보간 + 중앙에서 호
    const baseY = from.y + (tgt.y + 0.12 - from.y) * progress;
    const arc = Math.sin(progress * Math.PI) * u.arcH;
    const wantY = baseY + arc;
    const prevY = b.position.y;

    if (distXZ < 0.35 && Math.abs(b.position.y - (tgt.y + 0.12)) < 0.45) {
      // 도착
      b.position.set(tgt.x, tgt.y + 0.1, tgt.z);
      u.lastKind = tgt.kind;
      u.state = "perch";
      u.timer =
        tgt.kind === "nest"
          ? 2.2 + rand() * 2.5
          : tgt.kind === "pond"
            ? 1.4 + rand() * 1.6
            : 1.8 + rand() * 2.2;
      b.rotation.x = 0;
      continue;
    }

    // 수평 조향 (목표를 향해 부드럽게)
    const speed = u.cruise * (0.75 + 0.35 * Math.sin(progress * Math.PI)); // 중간이 조금 빠름
    const step = Math.min(speed * dt, distXZ);
    if (distXZ > 1e-4) {
      b.position.x += (dx / distXZ) * step;
      b.position.z += (dz / distXZ) * step;
    }
    // 수직: 호를 따라가되 급변하지 않게
    b.position.y += (wantY - b.position.y) * Math.min(1, dt * 3.2);
    u.velY = (b.position.y - prevY) / Math.max(dt, 1e-4);

    // 바라보는 방향 + 기수(피치) + 살짝 뱅크
    const yaw = Math.atan2(dx, dz);
    let turnN = yaw - (u._prevYaw ?? yaw);
    turnN = Math.atan2(Math.sin(turnN), Math.cos(turnN));
    u._prevYaw = yaw;
    b.rotation.y = yaw;
    b.rotation.x = THREE.MathUtils.clamp(-u.velY * 0.08, -0.45, 0.35);
    b.rotation.z = THREE.MathUtils.clamp(-turnN * 1.8, -0.4, 0.4);

    // 날개짓: 상승·출발 때 빠르고, 하강 때는 활공
    u.flapT += dt * (u.velY > 0.15 ? 16 : u.velY < -0.4 ? 5 : 10);
    const flapAmp = u.velY < -0.35 ? 0.25 : 0.7;
    const flap = Math.sin(u.flapT + u.phase) * flapAmp;
    u.wingL.rotation.z = 0.15 + flap;
    u.wingR.rotation.z = -0.15 - flap;
    u.wingL.rotation.x = u.velY < -0.3 ? -0.35 : -0.05;
    u.wingR.rotation.x = u.velY < -0.3 ? -0.35 : -0.05;
    b.visible = true;
  }
}

makeBird();
makeBird(); // 두 마리가 지점 사이를 오감
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
  let x = randPos(40), z = randPos(40);
  if (nearPath(x, z) || Math.hypot(x - POND_CX, z - POND_CZ) < POND_KEEP_OUT + 1.2) continue;
  ({ x, z } = awayFromPond(x, z, POND_KEEP_OUT + 0.5));
  trackScenery(makeCritter("rabbit", x, z), x, z, true);
}
{
  let x = randPos(45), z = randPos(45);
  if (!nearPath(x, z) && Math.hypot(x - POND_CX, z - POND_CZ) >= POND_KEEP_OUT + 1.2) {
    ({ x, z } = awayFromPond(x, z, POND_KEEP_OUT + 0.5));
    trackScenery(makeCritter("fox", x, z), x, z, true);
  }
}
// 두더쥐 — 맵에 1마리만
{
  const x = randPos(35), z = randPos(35);
  if (!nearPath(x, z)) trackScenery(makeCritter("mole", x, z), x, z, true);
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
trackScenery(pondFloor, -14, 12);
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
const overworldHideList = [ground, pondFloor, pond, pondRim, ...overworldExtras];

// ---------- 플레이어 (얼굴 앞 이미지 슬롯 포함) ----------
const player = makeCharacterMesh(
  THREE,
  opts.characterColor ?? myKid.color ?? PLAYER_COLORS[myIndex % PLAYER_COLORS.length],
  {
    index: myIndex,
    faceId: characterId,
    imageUrl: opts.localImageUrl || getCharFaceUrl(characterId),
  }
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

// 집 앞 아이들 (내가 고른 캐릭터는 NPC로 안 둠)
for (const h of sunday.outdoorHouses) {
  if (h.kid.id === characterId) continue;
  spawnNpc(h.kid.id, {
    x: h.npcX ?? h.x + 1.4,
    z: h.npcZ ?? h.z + 2.3,
    color: h.kid.color,
    label: h.kid.name,
    imageUrl: getCharFaceUrl(h.kid.id),
  });
}

// ---------- 아이별 능력 ----------
function localPropToWorld(hx, hz, rotY, lx, lz) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return { x: hx + lx * c + lz * s, z: hz - lx * s + lz * c };
}

const abilitySpots = {};
for (const h of sunday.outdoorHouses) {
  const ab = h.mesh.userData.ability;
  if (!ab) continue;
  const ry = h.kid.house.rotY || 0;
  const w = localPropToWorld(h.x, h.z, ry, ab.localX, ab.localZ);
  abilitySpots[h.kid.id] = {
    kind: ab.kind,
    x: w.x,
    z: w.z,
    paintCanvas: h.mesh.userData.paintCanvas || null,
  };
}

const abilityToast = document.createElement("div");
abilityToast.style.cssText =
  "display:none;position:fixed;top:72px;left:50%;transform:translateX(-50%);" +
  "background:rgba(255,252,248,0.94);padding:8px 14px;border-radius:12px;" +
  "font-size:13px;color:#3a2c24;font-weight:600;z-index:40;" +
  "box-shadow:0 2px 12px rgba(0,0,0,0.14);pointer-events:none;";
(document.getElementById("gameShell") || document.body).appendChild(abilityToast);
let abilityToastT = 0;
function toastAbility(msg) {
  abilityToast.textContent = msg;
  abilityToast.style.display = "block";
  abilityToastT = 2.2;
}

const BALL_R = 0.24;
let kickBall = null;
let ballVx = 0;
let ballVz = 0;
{
  const spot = abilitySpots.woojin;
  const bx = spot?.x ?? -15.8;
  const bz = spot?.z ?? -3.8;
  kickBall = new THREE.Group();
  kickBall.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.55 })
    )
  );
  for (let i = 0; i < 5; i++) {
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(BALL_R * 0.26, 5),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide })
    );
    const a = (i / 5) * Math.PI * 2;
    const elev = (i % 2) * 0.55 - 0.2;
    patch.position.set(
      Math.cos(a) * Math.cos(elev) * BALL_R * 0.95,
      Math.sin(elev) * BALL_R * 0.95,
      Math.sin(a) * Math.cos(elev) * BALL_R * 0.95
    );
    patch.lookAt(0, 0, 0);
    kickBall.add(patch);
  }
  kickBall.position.set(bx, BALL_R, bz);
  scene.add(kickBall);
  overworldHideList.push(kickBall);
}

let youngsunJumpCount = 0;
let youngsunLastPress = 0;
let youngsunBoost = false;
const JONGMYO_PALETTE = [
  0xd86088, 0x4898c8, 0x5ca840, 0xd88838, 0xb050c8, 0x3a90c8, 0xe07040, 0x58a090,
];
let jongmyoColorIdx = 0;

function distXZ(x, z) {
  return Math.hypot(player.position.x - x, player.position.z - z);
}

function placeTent(x, z) {
  const g = new THREE.Group();
  const fabric = new THREE.MeshStandardMaterial({
    color: 0xd87840,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.45, 5),
    new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.8 })
  );
  pole.position.y = 0.72;
  g.add(pole);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 4), fabric);
  cone.position.y = 0.9;
  g.add(cone);
  g.position.set(x, 0, z);
  scene.add(g);
  trackScenery(g, x, z, true);
  overworldExtras.push(g);
  overworldHideList.push(g);
}

function openPaintUI(spot) {
  if (document.getElementById("paintOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "paintOverlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:80;background:rgba(20,16,28,0.72);" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;";
  const title = document.createElement("div");
  title.textContent = "가현의 그림 — 마우스로 그려요";
  title.style.cssText = "color:#fff;font-weight:700;font-size:15px;";
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 420;
  canvas.style.cssText =
    "width:min(72vw,360px);height:auto;background:#f8f4ec;border-radius:8px;touch-action:none;cursor:crosshair;";
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8f4ec";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let painting = false;
  let color = "#2a1c14";
  const colors = ["#2a1c14", "#c83860", "#3a88d0", "#4a9828", "#d88830", "#ffffff"];
  const palette = document.createElement("div");
  palette.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center;";
  colors.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.style.cssText = `width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:${c};cursor:pointer;`;
    b.addEventListener("click", () => {
      color = c;
    });
    palette.appendChild(b);
  });
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: ((src.clientX - r.left) / r.width) * canvas.width,
      y: ((src.clientY - r.top) / r.height) * canvas.height,
    };
  }
  function draw(e) {
    if (!painting) return;
    e.preventDefault();
    const p = pos(e);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  canvas.addEventListener("pointerdown", (e) => {
    painting = true;
    canvas.setPointerCapture(e.pointerId);
    draw(e);
  });
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", () => {
    painting = false;
  });
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;";
  const done = document.createElement("button");
  done.type = "button";
  done.textContent = "이젤에 붙이기";
  done.style.cssText =
    "padding:10px 16px;border:none;border-radius:10px;background:#fff;font-weight:700;cursor:pointer;";
  done.addEventListener("click", () => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    if (spot.paintCanvas) {
      const m = spot.paintCanvas.material;
      if (m.map) m.map.dispose?.();
      m.map = tex;
      m.color.setHex(0xffffff);
      m.needsUpdate = true;
    }
    overlay.remove();
    toastAbility("그림이 이젤에 붙었어요!");
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "닫기";
  cancel.style.cssText =
    "padding:10px 16px;border:none;border-radius:10px;background:#666;color:#fff;font-weight:700;cursor:pointer;";
  cancel.addEventListener("click", () => overlay.remove());
  row.append(done, cancel);
  overlay.append(title, canvas, palette, row);
  (document.getElementById("gameShell") || document.body).appendChild(overlay);
}

function tryKickBall() {
  if (characterId !== "woojin" || !kickBall || currentSceneId !== "overworld") return false;
  if (distXZ(kickBall.position.x, kickBall.position.z) > 1.75) {
    toastAbility("공 앞으로 가서 슛하세요!");
    return true;
  }
  const power = 15;
  ballVx = Math.sin(facingAngle) * power;
  ballVz = Math.cos(facingAngle) * power;
  toastAbility("슛!");
  return true;
}

function updateKickBall(dt) {
  if (!kickBall || currentSceneId !== "overworld") return;
  const spd = Math.hypot(ballVx, ballVz);
  if (spd < 0.05) {
    ballVx = 0;
    ballVz = 0;
    return;
  }
  kickBall.position.x += ballVx * dt;
  kickBall.position.z += ballVz * dt;
  kickBall.position.y = BALL_R;
  kickBall.rotation.x += ballVz * dt * 2.2;
  kickBall.rotation.z -= ballVx * dt * 2.2;
  ballVx *= Math.pow(0.12, dt);
  ballVz *= Math.pow(0.12, dt);
  // 연못에 빠지지 않게
  const safe = awayFromPond(kickBall.position.x, kickBall.position.z, POND_KEEP_OUT);
  if (safe.x !== kickBall.position.x || safe.z !== kickBall.position.z) {
    kickBall.position.x = safe.x;
    kickBall.position.z = safe.z;
    ballVx *= -0.35;
    ballVz *= -0.35;
  }
  kickBall.position.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, kickBall.position.x));
  kickBall.position.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, kickBall.position.z));
}

function tryKidAbility() {
  if (currentSceneId !== "overworld") return false;
  if (characterId === "gahyun") {
    const spot = abilitySpots.gahyun;
    if (spot && distXZ(spot.x, spot.z) < 1.9) {
      openPaintUI(spot);
      return true;
    }
    toastAbility("집 앞 이젤로 가서 E를 누르세요");
    return true;
  }
  if (characterId === "jongmyo") {
    const spot = abilitySpots.jongmyo;
    if (spot && distXZ(spot.x, spot.z) < 1.9) {
      jongmyoColorIdx = (jongmyoColorIdx + 1) % JONGMYO_PALETTE.length;
      setCharacterColor(player, JONGMYO_PALETTE[jongmyoColorIdx]);
      toastAbility("옷 색깔이 바뀌었어요!");
      return true;
    }
    toastAbility("집 앞 옷걸이에서 E를 누르세요");
    return true;
  }
  if (characterId === "nammun") {
    const x = player.position.x + (rand() - 0.5) * 0.35;
    const z = player.position.z + (rand() - 0.5) * 0.35;
    if (((Math.random() * 20) | 0) === 0) {
      const m = makeMushroom(x, z);
      trackScenery(m, x, z);
      toastAbility("버섯이 자랐어요!");
    } else {
      const f = makeFlower(x, z);
      trackScenery(f, x, z);
      toastAbility("꽃이 피었어요!");
    }
    return true;
  }
  if (characterId === "taemi") {
    placeTent(player.position.x, player.position.z);
    toastAbility("텐트를 쳤어요!");
    return true;
  }
  return false;
}

{
  const jb = document.getElementById("jumpBtn");
  if (characterId === "woojin" && jb) {
    jb.textContent = "⚽";
    jb.setAttribute("aria-label", "슛");
  }
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
  for (const f of fishes) f.visible = vis;
  for (const b of birds) {
    if (!vis) b.visible = false;
    // visible일 때 perch/fly 표시는 updateBirds가 담당
  }
  for (const b of birds) {
    if (!vis) b.visible = false;
  }
  for (const e of npcs.values()) {
    e.mesh.visible = vis;
  }
  sky.visible = vis;
  if (!vis) {
    sunGroup.visible = false;
    moonGroup.visible = false;
    stars.visible = false;
  }
}

function enterScene(sceneId, spawnOverride = null) {
  for (const bag of sceneBags.values()) bag.root.visible = false;

  if (sceneId === "overworld") {
    setOverworldVisible(true);
    lastDayBucket = -1; // 하늘 즉시 복구
    scene.fog = null;
    applyDesignSettings();
    const pos = spawnOverride || { x: player.position.x, z: player.position.z };
    player.position.set(pos.x, 0, pos.z);
  } else {
    const bag = sceneBags.get(sceneId);
    if (!bag) return;
    setOverworldVisible(false);
    bag.root.visible = true;
    // 포켓 장면: 안개 끔. ③호렙 굴은 산 하늘, 그 외는 우주 톤
    scene.background.setHex(sceneId === "elijah_whisper" ? 0x6a7888 : 0x07051a);
    scene.fog = null;
    camera.far = 80;
    camera.updateProjectionMatrix();
    stars.visible = false;
    moonGroup.visible = false;
    sunGroup.visible = false;
    const sp = spawnOverride || bag.spawn;
    player.position.set(sp.x, 0, sp.z);
    // 이야기 장면: 입장 시 벽면(+Z)을 먼저 보도록 시선 고정
    if (typeof bag.faceYaw === "number") {
      player.rotation.y = bag.faceYaw;
      facingAngle = bag.faceYaw;
      // 1·3인칭 공통: camYaw = 시선(캐릭터 전방). 3인칭은 그 반대편에 카메라
      if (camMode === "first" || (activeCamPreset && CAM_PRESETS[activeCamPreset]?.behind)) {
        camYaw = bag.faceYaw;
      }
    }
  }

  currentSceneId = sceneId;
  bobY = 0;
  vy = 0;
  onGround = true;
  velocity.set(0, 0);
  if (currentSceneId === "overworld" || typeof sceneBags.get(sceneId)?.faceYaw !== "number") {
    if (activeCamPreset && CAM_PRESETS[activeCamPreset]?.behind) {
      camYaw = player.rotation.y;
    }
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
  if (p) {
    interactCooldown = 0.45;
    if (p.outPos) enterScene(p.to, p.outPos);
    else enterScene(p.to);
    return;
  }
  if (tryKidAbility()) {
    interactCooldown = 0.4;
  }
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
  if (p) {
    interactHint = p.label || "들어가기";
    interactHud.style.display = "block";
    interactHud.textContent = `${interactHint}  ·  E / 문`;
    return;
  }
  if (currentSceneId === "overworld") {
    if (characterId === "gahyun" && abilitySpots.gahyun && distXZ(abilitySpots.gahyun.x, abilitySpots.gahyun.z) < 1.9) {
      interactHud.style.display = "block";
      interactHud.textContent = "그림 그리기  ·  E";
      return;
    }
    if (characterId === "jongmyo" && abilitySpots.jongmyo && distXZ(abilitySpots.jongmyo.x, abilitySpots.jongmyo.z) < 1.9) {
      interactHud.style.display = "block";
      interactHud.textContent = "옷 색 바꾸기  ·  E";
      return;
    }
    if (characterId === "nammun") {
      interactHud.style.display = "block";
      interactHud.textContent = "꽃 심기  ·  E";
      return;
    }
    if (characterId === "taemi") {
      interactHud.style.display = "block";
      interactHud.textContent = "텐트 치기  ·  E";
      return;
    }
    if (characterId === "woojin" && kickBall && distXZ(kickBall.position.x, kickBall.position.z) < 1.75) {
      interactHud.style.display = "block";
      interactHud.textContent = "슛  ·  스페이스";
      return;
    }
  }
  interactHud.style.display = "none";
  interactHint = "";
}

// ---------- 카메라 오빗 + 프리셋 ----------
let camYaw = Math.PI / 4;
let camPitch = 0.82;
let camDist = 16;
let camMode = "orbit"; // orbit | first
let activeCamPreset = "third";
// 3인칭 오빗: pitch≈+90° → 머리 위(땅 정면), pitch≈−90° → 발밑(하늘 정면)
const CAM_PITCH_MIN = -Math.PI / 2 + 0.05;
const CAM_PITCH_MAX = Math.PI / 2 - 0.05;
// 1인칭: 거의 ±90° — 하늘/바닥을 정면으로
const FP_PITCH_MIN = -Math.PI / 2 + 0.02;
const FP_PITCH_MAX = Math.PI / 2 - 0.02;
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

function applyCamPreset(id) {
  const p = CAM_PRESETS[id];
  if (!p) return;
  activeCamPreset = id;
  camMode = p.mode;
  camPitch = p.pitch;
  camDist = p.dist;
  // 1·3인칭 공통: camYaw = 수평 시선 방향 (캐릭터가 보는 쪽)
  if (p.mode === "first" || p.behind) {
    camYaw = player.rotation.y;
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

/** 3인칭: 시선(camYaw) 반대편 — 캐릭터 등 뒤에 카메라 */
function computeCamOffset() {
  const y = Math.sin(camPitch) * camDist;
  const horiz = Math.cos(camPitch) * camDist;
  const x = -Math.sin(camYaw) * horiz;
  const z = -Math.cos(camYaw) * horiz;
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

// ---------- 카메라: FPS 포인터락 + 휠클릭 시점 + 휠 줌 ----------
const joyPad = document.getElementById("joyPad");
const LOOK_SENS = 0.0022;
let middleDragging = false;
let touchDragging = false;
let lastTouchX = 0;
let lastTouchY = 0;

function isPointerLocked() {
  return document.pointerLockElement === renderer.domElement;
}

function applyLookDelta(dx, dy) {
  if (!dx && !dy) return;
  const pMin = camMode === "first" ? FP_PITCH_MIN : CAM_PITCH_MIN;
  const pMax = camMode === "first" ? FP_PITCH_MAX : CAM_PITCH_MAX;
  // FPS식: 마우스 오른쪽 → 오른쪽 보기
  camYaw -= dx * LOOK_SENS;
  if (camMode === "first") {
    camPitch = Math.max(pMin, Math.min(pMax, camPitch - dy * LOOK_SENS));
  } else {
    camPitch = Math.max(pMin, Math.min(pMax, camPitch + dy * LOOK_SENS));
  }
  activeCamPreset = "";
  syncCamPresetButtons();
}

function isInsideControls(x, y) {
  const joy = document.getElementById("joyPad");
  const jump = document.getElementById("jumpBtn");
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

function onCamPointerDown(e) {
  if (!running) return;
  if (isInsideControls(e.clientX, e.clientY)) return;

  // 휠(가운데) 버튼 드래그 → 시점 변경 (잠금 없이)
  if (e.button === 1) {
    e.preventDefault();
    middleDragging = true;
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
    try {
      renderer.domElement.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    return;
  }

  // 터치: 드래그로 시점
  if (e.pointerType === "touch") {
    touchDragging = true;
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
    return;
  }

  // 좌클릭: FPS 포인터 잠금 → 이후 마우스 이동만으로 시선
  if (e.button === 0 && e.pointerType === "mouse") {
    if (!isPointerLocked()) {
      renderer.domElement.requestPointerLock?.();
    }
  }
}

function onCamPointerMove(e) {
  if (!running) return;

  if (isPointerLocked()) {
    applyLookDelta(e.movementX || 0, e.movementY || 0);
    return;
  }

  if (middleDragging || touchDragging) {
    const dx = e.movementX != null ? e.movementX : e.clientX - lastTouchX;
    const dy = e.movementY != null ? e.movementY : e.clientY - lastTouchY;
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
    applyLookDelta(dx, dy);
  }
}

function onCamPointerUp(e) {
  if (e.button === 1 || e.pointerType === "touch") {
    middleDragging = false;
    touchDragging = false;
    try {
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }
}

function onCamContextMenu(e) {
  if (e.target === renderer.domElement) e.preventDefault();
}

function onCamAuxClick(e) {
  if (e.button === 1) e.preventDefault();
}

renderer.domElement.addEventListener("pointerdown", onCamPointerDown);
addEventListener("pointermove", onCamPointerMove);
addEventListener("pointerup", onCamPointerUp);
addEventListener("pointercancel", onCamPointerUp);
renderer.domElement.addEventListener("contextmenu", onCamContextMenu);
renderer.domElement.addEventListener("auxclick", onCamAuxClick);
renderer.domElement.addEventListener("mousedown", (e) => {
  if (e.button === 1) e.preventDefault();
});

renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (!running) return;
    if (camMode === "first") {
      camPitch = Math.max(FP_PITCH_MIN, Math.min(FP_PITCH_MAX, camPitch - e.deltaY * 0.0015));
      activeCamPreset = "";
      syncCamPresetButtons();
      return;
    }
    camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + e.deltaY * 0.02));
    activeCamPreset = "";
    syncCamPresetButtons();
  },
  { passive: false }
);

let pinchStartDist = null;
addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchStartDist !== null && camMode !== "first") {
        camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist - (d - pinchStartDist) * 0.03));
        activeCamPreset = "";
        syncCamPresetButtons();
      }
      pinchStartDist = d;
    }
  },
  { passive: true }
);
addEventListener("touchend", () => {
  pinchStartDist = null;
});

// ---------- 가상 조이스틱 ----------
const joyKnob = document.getElementById("joyKnob");
let joyActive = false,
  joyVec = { x: 0, y: 0 },
  joyCenter = { x: 0, y: 0 };

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
  if (characterId === "youngsun" && !youngsunBoost) {
    const now = performance.now();
    if (now - youngsunLastPress > 2200) youngsunJumpCount = 0;
    youngsunLastPress = now;
    youngsunJumpCount += 1;
    toastAbility(`점프 ${youngsunJumpCount}/8`);
    if (youngsunJumpCount >= 8) {
      youngsunBoost = true;
      toastAbility("영선 점프 파워 업! 2배 높이!");
    }
  }
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

// ---------- FPS식 즉각 이동 + 점프 ----------
const velocity = new THREE.Vector2(0, 0);
let vy = 0;
const MAX_SPEED = 5.4;
const GRAVITY = 26;
const JUMP_V = 10.2;
let walkT = 0;
let facingAngle = 0;
let onGround = true;
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

  const moving = ilen > 0.08;

  if (moving) {
    // 가속/마찰/스무딩 없음 — 입력 즉시 최대 속도
    const forward = -iz;
    const right = -ix;
    const wx = Math.sin(camYaw) * forward + Math.cos(camYaw) * right;
    const wz = Math.cos(camYaw) * forward - Math.sin(camYaw) * right;
    velocity.set(wx * MAX_SPEED, wz * MAX_SPEED);
  } else {
    velocity.set(0, 0);
  }

  const feetY = Math.max(0, bobY);
  const nx = player.position.x + velocity.x * dt;
  const nz = player.position.z + velocity.y * dt;
  if (!collides(nx, player.position.z, feetY)) player.position.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nx));
  else velocity.x = 0;
  if (!collides(player.position.x, nz, feetY)) player.position.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nz));
  else velocity.y = 0;

  if (jumpQueued) {
    if (characterId === "woojin") {
      tryKickBall();
    } else if (onGround) {
      const jumpMul = characterId === "youngsun" && youngsunBoost ? 2 : 1;
      vy = JUMP_V * jumpMul;
      onGround = false;
      bodyCyl.scale.y = 0.72;
      bodyCyl.scale.x = 1.18;
      bodyCyl.scale.z = 1.18;
    }
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

  if (camMode === "first") {
    // FPS: 몸통 yaw = 시선 yaw (피치와 분리)
    facingAngle = camYaw;
    player.rotation.y = camYaw;
  } else if (velocity.length() > 0.25) {
    // 3인칭: 이동 방향으로 몸이 돌아감 (젤다/겐신식)
    facingAngle = Math.atan2(velocity.x, velocity.y);
    let diff = facingAngle - player.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.rotation.y += diff * Math.min(1, dt * 10);
  } else {
    let diff = facingAngle - player.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.rotation.y += diff * Math.min(1, dt * 8);
  }
}

function updateCamera(dt){
  const lerpFactor = 1 - Math.pow(0.0012, dt);
  if (camMode === "first") {
    // 걷기 헤드밥 (카메라만, 살짝)
    const headBob =
      onGround && velocity.length() > 0.35
        ? Math.sin(walkT * 2) * 0.045
        : 0;
    const eye = new THREE.Vector3(
      player.position.x,
      player.position.y + 1.35 + headBob,
      player.position.z
    );
    camPos.lerp(eye, Math.min(1, lerpFactor * 1.4));
    camera.position.copy(camPos);
    const lookDist = 10;
    const lp = THREE.MathUtils.clamp(camPitch, FP_PITCH_MIN, FP_PITCH_MAX);
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

// ---------- 미니맵 ----------
applyDesignSettings();

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
  mmCtx.fillStyle = '#f0b0b8';
  for (const h of sunday.outdoorHouses) {
    const hp = toMM(h.x, h.z);
    if (Math.hypot(hp.x - s / 2, hp.y - s / 2) > s / 2) continue;
    mmCtx.fillRect(hp.x - 5 * (s / 150), hp.y - 5 * (s / 150), 10 * (s / 150), 10 * (s / 150));
  }

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
  updateKickBall(dt);
  if (abilityToastT > 0) {
    abilityToastT -= dt;
    if (abilityToastT <= 0) abilityToast.style.display = "none";
  }
  smoothRemotes(dt);
  maybeSendPose(performance.now());
  if (frameN % 5 === 0) updateInteractHud();

  // 나무 흔들림·동물은 야외에서만
  if (currentSceneId === "overworld" && frameN % 2 === 0) {
    const px = player.position.x, pz = player.position.z;
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      const dx = tree.position.x - px, dz = tree.position.z - pz;
      if (dx * dx + dz * dz > 900) continue;
      tree.rotation.z = Math.sin(t * 0.8 + tree.userData.sway) * 0.015;
    }
  }

  if (currentSceneId === "overworld" && frameN % 3 === 0) {
    updateCritters(dt * 3, t);
    updateBirds(dt * 3, t);
    updateFishes(dt * 3, t);
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
        c.userData.baseY = 8 + rand() * 5;
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
      middleDragging = false;
      touchDragging = false;
      try {
        if (document.pointerLockElement) document.exitPointerLock();
      } catch {
        /* ignore */
      }
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
