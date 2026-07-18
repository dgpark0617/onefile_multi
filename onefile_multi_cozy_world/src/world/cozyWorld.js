/** Cozy World 3D — expects global THREE (r128). */
import { mulberry32 } from "../core/rng.js";

const PLAYER_COLORS = [0xf9c9d6, 0xa8d8f0, 0xc9e8a8, 0xf5d0a0];

function makeCharacterMesh(THREE, color) {
  const player = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6ec });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x6a5a52 });
  const shadowify = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const bodyCyl = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.55, 10), bodyMat));
  bodyCyl.position.y = 0.45;
  player.add(bodyCyl);
  const bodyTop = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat));
  bodyTop.position.y = 0.72;
  player.add(bodyTop);
  const bodyBottom = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bodyMat));
  bodyBottom.position.y = 0.18;
  player.add(bodyBottom);
  const head = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), headMat));
  head.position.y = 1.05;
  player.add(head);
  [-0.16, 0.16].forEach((offset) => {
    const ear = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), headMat));
    ear.position.set(offset, 1.32, -0.05);
    player.add(ear);
  });
  const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 1.05, 0.29);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.1, 1.05, 0.29);
  player.add(eyeL, eyeR);
  return player;
}

/**
 * @param {{ mount?: HTMLElement, myIndex?: number, seed?: number, onPose?: (p:any)=>void }} opts
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
const fogColor = 0xf3ecf7;
scene.fog = new THREE.Fog(fogColor, 32, 92);

const camera = new THREE.PerspectiveCamera(38, innerWidth/innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputEncoding = THREE.sRGBEncoding;
mount.appendChild(renderer.domElement);
renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";

// ---------- 색감 설정 패널 ----------
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('open'));

const satSlider = document.getElementById('satSlider');
const briSlider = document.getElementById('briSlider');
const conSlider = document.getElementById('conSlider');
const expSlider = document.getElementById('expSlider');
const satVal = document.getElementById('satVal');
const briVal = document.getElementById('briVal');
const conVal = document.getElementById('conVal');
const expVal = document.getElementById('expVal');

function applyColorSettings(){
  const sat = satSlider.value, bri = briSlider.value, con = conSlider.value;
  renderer.domElement.style.filter = `saturate(${sat}%) brightness(${bri}%) contrast(${con}%)`;
  renderer.toneMappingExposure = expSlider.value / 100;
  satVal.textContent = sat + '%';
  briVal.textContent = bri + '%';
  conVal.textContent = con + '%';
  expVal.textContent = (expSlider.value/100).toFixed(1);
}
[satSlider, briSlider, conSlider, expSlider].forEach(s => s.addEventListener('input', applyColorSettings));

document.getElementById('resetBtn').addEventListener('click', () => {
  satSlider.value = 125; briSlider.value = 100; conSlider.value = 112; expSlider.value = 100;
  applyColorSettings();
});

applyColorSettings();

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- 하늘: 그라데이션 돔 ----------
const skyGeo = new THREE.SphereGeometry(180, 24, 16);
const skyColors = [];
const topColor = new THREE.Color(0xcfe8fb);
const bottomColor = new THREE.Color(0xfdf1e6);
const posAttrSky = skyGeo.attributes.position;
for (let i=0;i<posAttrSky.count;i++){
  const y = posAttrSky.getY(i);
  const tmix = THREE.MathUtils.clamp((y/180)*0.5+0.5, 0, 1);
  const c = bottomColor.clone().lerp(topColor, tmix);
  skyColors.push(c.r, c.g, c.b);
}
skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog:false });
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// 뭉게구름
function makeCloud(x, y, z, scale){
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent:true, opacity:0.85, fog:false });
  for (let i=0;i<4;i++){
    const s = (0.6 + rand()*0.5) * scale;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 8), mat);
    puff.position.set((rand()-0.5)*2.2*scale, (rand()-0.5)*0.4*scale, (rand()-0.5)*1.2*scale);
    g.add(puff);
  }
  g.position.set(x, y, z);
  scene.add(g);
  return g;
}
const clouds = [];
for (let i=0;i<8;i++){
  clouds.push(makeCloud((rand()-0.5)*140, 28+rand()*10, (rand()-0.5)*140, 2.5+rand()*2));
}

// ---------- 조명 ----------
const ambient = new THREE.HemisphereLight(0xfff3f9, 0xd9f0d0, 0.75);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2e0, 0.8);
sun.position.set(18, 26, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
sun.shadow.camera.far = 100;
sun.shadow.bias = -0.001;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0xd9c9f7, 0.22);
fillLight.position.set(-15, 10, -10);
scene.add(fillLight);

function shadowify(mesh){ mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

// ---------- 바닥: 패치형 색상 변화 ----------
const groundGeo = new THREE.PlaneGeometry(200, 200, 60, 60);
groundGeo.rotateX(-Math.PI/2);
const gPos = groundGeo.attributes.position;
const gColors = [];
const baseGreen = new THREE.Color(0xaee091);
const deepGreen = new THREE.Color(0x8ed488);
for (let i=0;i<gPos.count;i++){
  const x = gPos.getX(i), z = gPos.getZ(i);
  gPos.setY(i, Math.sin(x*0.15)*0.06 + Math.cos(z*0.15)*0.06);
  const n = (Math.sin(x*0.4)*Math.cos(z*0.37)+1)/2;
  const c = baseGreen.clone().lerp(deepGreen, n*0.5);
  gColors.push(c.r, c.g, c.b);
}
groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gColors, 3));
groundGeo.computeVertexNormals();
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);

// ---------- 돌길 ----------
const pathMat = new THREE.MeshStandardMaterial({ color: 0xe8dfd0, roughness: 0.9 });
const pathPoints = [];
for (let i=0;i<14;i++){
  const t = i/13;
  const px = THREE.MathUtils.lerp(0, 6, t) + Math.sin(t*4)*0.4;
  const pz = THREE.MathUtils.lerp(0, -6, t) + Math.cos(t*3)*0.3;
  const stone = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.08, 7), pathMat));
  stone.position.set(px, 0.04, pz);
  stone.rotation.y = rand()*Math.PI;
  scene.add(stone);
  pathPoints.push({x:px, z:pz});
}

// ---------- 연못 ----------
const pondMat = new THREE.MeshStandardMaterial({ color: 0xa9d8e6, roughness: 0.3, metalness: 0.1, transparent:true, opacity:0.9 });
const pond = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.12, 24), pondMat);
pond.position.set(-14, 0.02, 12);
pond.receiveShadow = true;
scene.add(pond);
const pondRimMat = new THREE.MeshStandardMaterial({ color: 0xc9e8cf, roughness:1 });
const pondRim = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.25, 8, 24), pondRimMat);
pondRim.rotation.x = Math.PI/2;
pondRim.position.set(-14, 0.05, 12);
scene.add(pondRim);
for (let i=0;i<5;i++){
  const lilyMat = new THREE.MeshStandardMaterial({ color: 0x8fc47a });
  const lily = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 10), lilyMat));
  const ang = rand()*Math.PI*2, r = rand()*3;
  lily.position.set(-14+Math.cos(ang)*r, 0.09, 12+Math.sin(ang)*r);
  scene.add(lily);
}

// ---------- 나무 ----------
const treeLeafColors = [0x8fd47f, 0x7cc96f, 0x9edb87, 0x6fc98a];
function makeTree(x, z){
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xd6b184, roughness: 0.9 });
  const trunk = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.4, 6), trunkMat));
  trunk.position.y = 0.7;
  g.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({
    color: treeLeafColors[Math.floor(rand()*treeLeafColors.length)], roughness: 0.8
  });
  for (let i=0;i<3;i++){
    const s = 1.1 - i*0.22;
    const leaf = shadowify(new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMat));
    leaf.position.y = 1.6 + i*0.75;
    leaf.rotation.y = rand()*Math.PI;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.userData.sway = rand()*Math.PI*2;
  scene.add(g);
  return g;
}

function makeBush(x, z){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xaee0a0, roughness: 0.85 });
  for (let i=0;i<3;i++){
    const s = 0.35 + rand()*0.2;
    const puff = shadowify(new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat));
    puff.position.set((rand()-0.5)*0.5, s*0.7, (rand()-0.5)*0.5);
    g.add(puff);
  }
  g.position.set(x, 0, z);
  scene.add(g);
}

function makeMushroom(x, z){
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xfff6ec });
  const capMat = new THREE.MeshStandardMaterial({ color: [0xf29ba0, 0xf7c9a0, 0xc9a0f2][Math.floor(rand()*3)] });
  const stem = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 6), stemMat));
  stem.position.y = 0.09;
  g.add(stem);
  const cap = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI*2, 0, Math.PI/2), capMat));
  cap.position.y = 0.18;
  g.add(cap);
  g.position.set(x, 0, z);
  g.scale.setScalar(1.4);
  scene.add(g);
}

function makeFlower(x, z){
  const g = new THREE.Group();
  const colors = [0xf9c6d3, 0xfde9a0, 0xd8c6f9, 0xf9dcc4, 0xbfe6f2];
  const petalMat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand()*colors.length)] });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xa3d98f });
  const stem = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.3,4), stemMat));
  stem.position.y = 0.15;
  g.add(stem);
  const bloom = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), petalMat));
  bloom.position.y = 0.32;
  g.add(bloom);
  g.position.set(x, 0, z);
  scene.add(g);
}

function makeRock(x, z){
  const mat = new THREE.MeshStandardMaterial({ color: 0xdcd6dc, roughness: 1 });
  const rock = shadowify(new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + rand()*0.2, 0), mat));
  rock.position.set(x, 0.25, z);
  rock.rotation.set(rand(), rand(), rand());
  scene.add(rock);
  return { x, z, radius: 0.55 };
}

function makeFence(x, z, rotY){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf7ede0, roughness: 0.9 });
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
}

function makeHouse(x, z){
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xfdeedb });
  const wall = shadowify(new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), wallMat));
  wall.position.y = 1;
  g.add(wall);

  const roofMat = new THREE.MeshStandardMaterial({ color: 0xf0a3ab });
  const roof = shadowify(new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.6, 4), roofMat));
  roof.position.y = 2.8;
  roof.rotation.y = Math.PI/4;
  g.add(roof);

  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0xd9a98f });
  const chimney = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.35,0.7,0.35), chimneyMat));
  chimney.position.set(0.9, 3.1, 0.5);
  g.add(chimney);

  const doorMat = new THREE.MeshStandardMaterial({ color: 0xcd9a72 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.05), doorMat);
  door.position.set(0, 0.55, 1.53);
  g.add(door);

  const winMat = new THREE.MeshStandardMaterial({ color: 0xcdeaf0 });
  const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.05), winMat);
  win1.position.set(-1, 1.2, 1.53);
  const win2 = win1.clone(); win2.position.x = 1;
  g.add(win1, win2);

  g.position.set(x, 0, z);
  scene.add(g);
  return { x, z, radius: 2.2 };
}

// ---------- 월드 채우기 ----------
const obstacles = [];
const trees = [];
const flowerPts = [];

function randPos(range){ return (rand()-0.5)*range; }
function nearPath(x, z){
  return pathPoints.some(p => Math.hypot(p.x-x, p.z-z) < 1.6) || Math.hypot(x,z) < 5;
}

for (let i=0;i<40;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z) || Math.hypot(x-(-14), z-12) < 6) continue;
  const tree = makeTree(x, z);
  trees.push(tree);
  obstacles.push({ x, z, radius: 0.7 });
}
for (let i=0;i<24;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z)) continue;
  makeBush(x, z);
  obstacles.push({ x, z, radius: 0.45 });
}
for (let i=0;i<50;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z)) continue;
  makeFlower(x, z);
  flowerPts.push({x, z});
}
for (let i=0;i<16;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z)) continue;
  makeMushroom(x, z);
}
for (let i=0;i<12;i++){
  const x = randPos(70), z = randPos(70);
  if (nearPath(x,z)) continue;
  obstacles.push(makeRock(x, z));
}
// 집 주변 울타리
[-2,-1,0,1,2].forEach(i => makeFence(6+i*1.6, -8.3, 0));
[-2,-1,0,1,2].forEach(i => makeFence(6+i*1.6, -3.7, 0));

const housePos = makeHouse(6, -6);
obstacles.push(housePos);
obstacles.push({ x:-14, z:12, radius: 4.6 }); // 연못 충돌

// ---------- 플레이어 (캡슐 대신 원기둥+구 조합, 구버전 호환) ----------
const player = new THREE.Group();
const bodyMat = new THREE.MeshStandardMaterial({ color: PLAYER_COLORS[myIndex % PLAYER_COLORS.length] });
const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6ec });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x6a5a52 });

const bodyCyl = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.55, 10), bodyMat));
bodyCyl.position.y = 0.45;
player.add(bodyCyl);
const bodyTop = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10, 0, Math.PI*2, 0, Math.PI/2), bodyMat));
bodyTop.position.y = 0.72;
player.add(bodyTop);
const bodyBottom = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10, 0, Math.PI*2, Math.PI/2, Math.PI/2), bodyMat));
bodyBottom.position.y = 0.18;
player.add(bodyBottom);

const head = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), headMat));
head.position.y = 1.05;
player.add(head);

[-0.16, 0.16].forEach(offset => {
  const ear = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), headMat));
  ear.position.set(offset, 1.32, -0.05);
  player.add(ear);
});

const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.1, 1.05, 0.29);
const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.1, 1.05, 0.29);
player.add(eyeL, eyeR);

const cheekMat = new THREE.MeshStandardMaterial({ color: 0xf7a8b8, transparent:true, opacity:0.6 });
const cheekGeo = new THREE.SphereGeometry(0.05, 6, 6);
const cheekL = new THREE.Mesh(cheekGeo, cheekMat); cheekL.position.set(-0.2, 0.96, 0.22);
const cheekR = new THREE.Mesh(cheekGeo, cheekMat); cheekR.position.set(0.2, 0.96, 0.22);
player.add(cheekL, cheekR);

player.position.set(0, 0, 0);
player.castShadow = true;
scene.add(player);

// ---------- 카메라 오빗 ----------
let camYaw = Math.PI/4;
let camPitch = 0.9;
let camDist = 19;
const CAM_PITCH_MIN = 0.45, CAM_PITCH_MAX = 1.25;
const CAM_DIST_MIN = 9, CAM_DIST_MAX = 34;

function computeCamOffset(){
  const y = Math.sin(camPitch) * camDist;
  const horiz = Math.cos(camPitch) * camDist;
  const x = Math.cos(camYaw) * horiz;
  const z = Math.sin(camYaw) * horiz;
  return new THREE.Vector3(x, y, z);
}

let camPos = player.position.clone().add(computeCamOffset());
camera.position.copy(camPos);
camera.lookAt(player.position);

// ---------- 카메라 드래그 컨트롤 ----------
let dragging = false, lastX = 0, lastY = 0;
const joyPad = document.getElementById('joyPad');

function isInsideJoyPad(x, y){
  const r = joyPad.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

renderer.domElement.addEventListener('pointerdown', e => {
  if (isInsideJoyPad(e.clientX, e.clientY)) return;
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
});
addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  camYaw -= dx * 0.006;
  camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + dy * 0.004));
});
addEventListener('pointerup', () => dragging = false);
addEventListener('pointercancel', () => dragging = false);

renderer.domElement.addEventListener('wheel', e => {
  camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + e.deltaY * 0.02));
  e.preventDefault();
}, { passive:false });

let pinchStartDist = null;
addEventListener('touchmove', e => {
  if (e.touches.length === 2){
    const t1 = e.touches[0], t2 = e.touches[1];
    const d = Math.hypot(t1.clientX-t2.clientX, t1.clientY-t2.clientY);
    if (pinchStartDist !== null){
      camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist - (d - pinchStartDist) * 0.03));
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

// ---------- 키보드 ----------
const keys = {};
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// ---------- 충돌 ----------
function collides(x, z){
  for (const o of obstacles){
    if (Math.hypot(x-o.x, z-o.z) < o.radius + 0.35) return true;
  }
  return false;
}

const WORLD_LIMIT = 95;

// ---------- 관성 이동 ----------
const velocity = new THREE.Vector2(0, 0);
const MAX_SPEED = 5.2;
const ACCEL = 22;
const FRICTION = 14;
let walkT = 0;
let facingAngle = 0;

function updatePlayer(dt){
  let ix = 0, iz = 0;
  if (keys['arrowup'] || keys['w']) iz -= 1;
  if (keys['arrowdown'] || keys['s']) iz += 1;
  if (keys['arrowleft'] || keys['a']) ix -= 1;
  if (keys['arrowright'] || keys['d']) ix += 1;
  if (joyActive){ ix += joyVec.x; iz += joyVec.y; }

  const ilen = Math.hypot(ix, iz);
  const moving = ilen > 0.08;

  if (moving){
    ix /= ilen; iz /= ilen;
    const wx = -ix * Math.sin(camYaw) + iz * Math.cos(camYaw);
    const wz = ix * Math.cos(camYaw) + iz * Math.sin(camYaw);
    velocity.x += wx * ACCEL * dt;
    velocity.y += wz * ACCEL * dt;
    const speed = velocity.length();
    if (speed > MAX_SPEED){ velocity.multiplyScalar(MAX_SPEED/speed); }
  } else {
    const speed = velocity.length();
    const drop = FRICTION * dt;
    if (speed > 0){
      const newSpeed = Math.max(0, speed - drop);
      velocity.multiplyScalar(speed > 0 ? newSpeed/speed : 0);
    }
  }

  const nx = player.position.x + velocity.x * dt;
  const nz = player.position.z + velocity.y * dt;
  if (!collides(nx, player.position.z)) player.position.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nx));
  else velocity.x = 0;
  if (!collides(player.position.x, nz)) player.position.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nz));
  else velocity.y = 0;

  if (velocity.length() > 0.3){
    facingAngle = Math.atan2(velocity.x, velocity.y);
    walkT += dt * 9;
    bodyCyl.scale.y = 1 + Math.abs(Math.sin(walkT))*0.08;
    player.position.y = Math.abs(Math.sin(walkT*2))*0.04;
  } else {
    bodyCyl.scale.y += (1 - bodyCyl.scale.y) * 0.2;
    player.position.y += (0 - player.position.y) * 0.2;
  }
  let diff = facingAngle - player.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  player.rotation.y += diff * 0.15;
}

function updateCamera(dt){
  const targetOffset = computeCamOffset();
  const targetPos = player.position.clone().add(targetOffset);
  const lerpFactor = 1 - Math.pow(0.0008, dt);
  camPos.lerp(targetPos, lerpFactor);
  camera.position.copy(camPos);
  camera.lookAt(player.position.x, player.position.y + 0.6, player.position.z);
}

// ---------- 떠다니는 꽃잎 파티클 ----------
const petalCount = 40;
const petalGeo = new THREE.PlaneGeometry(0.12, 0.12);
const petalMat = new THREE.MeshBasicMaterial({ color: 0xf9c6d3, transparent:true, opacity:0.8, side: THREE.DoubleSide });
const petals = [];
for (let i=0;i<petalCount;i++){
  const p = new THREE.Mesh(petalGeo, petalMat);
  p.position.set(randPos(90), rand()*10+2, randPos(90));
  p.userData = { speed: 0.2+rand()*0.3, drift: rand()*Math.PI*2, fallSpeed: 0.3+rand()*0.3 };
  scene.add(p);
  petals.push(p);
}

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
  mmCtx.fillStyle = '#cdeec1';
  mmCtx.beginPath(); mmCtx.arc(s/2, s/2, s/2, 0, Math.PI*2); mmCtx.fill();

  const scale = (s/2) / MM_RANGE;
  function toMM(wx, wz){
    return {
      x: s/2 + (wx - player.position.x) * scale,
      y: s/2 + (wz - player.position.z) * scale
    };
  }

  mmCtx.fillStyle = '#a9d8e6';
  const pp = toMM(-14, 12);
  mmCtx.beginPath(); mmCtx.arc(pp.x, pp.y, 4.2*scale*1, 0, Math.PI*2); mmCtx.fill();

  mmCtx.fillStyle = '#8fcf82';
  trees.forEach(t => {
    const p = toMM(t.position.x, t.position.z);
    if (Math.hypot(p.x-s/2, p.y-s/2) > s/2) return;
    mmCtx.beginPath(); mmCtx.arc(p.x, p.y, 3.2*(s/150), 0, Math.PI*2); mmCtx.fill();
  });
  mmCtx.fillStyle = '#f6b6cd';
  flowerPts.forEach(f => {
    const p = toMM(f.x, f.z);
    if (Math.hypot(p.x-s/2, p.y-s/2) > s/2) return;
    mmCtx.beginPath(); mmCtx.arc(p.x, p.y, 1.4*(s/150), 0, Math.PI*2); mmCtx.fill();
  });
  const hp = toMM(housePos.x, housePos.z);
  mmCtx.fillStyle = '#f0a3ab';
  mmCtx.fillRect(hp.x-5*(s/150), hp.y-5*(s/150), 10*(s/150), 10*(s/150));

  mmCtx.save();
  mmCtx.translate(s/2, s/2);
  mmCtx.rotate(facingAngle);
  mmCtx.fillStyle = '#e0577a';
  mmCtx.beginPath();
  const tri = 6*(s/150);
  mmCtx.moveTo(0, -tri*1.6);
  mmCtx.lineTo(-tri, tri);
  mmCtx.lineTo(tri, tri);
  mmCtx.closePath();
  mmCtx.fill();
  mmCtx.restore();

  mmCtx.strokeStyle = 'rgba(255,255,255,0.9)';
  mmCtx.lineWidth = 3*(s/150);
  mmCtx.beginPath(); mmCtx.arc(s/2, s/2, s/2-2, 0, Math.PI*2); mmCtx.stroke();
}


const remotePlayers = new Map();

function ensureRemote(index) {
  if (index === myIndex || remotePlayers.has(index)) return remotePlayers.get(index);
  const mesh = makeCharacterMesh(THREE, PLAYER_COLORS[index % PLAYER_COLORS.length]);
  mesh.position.set(2 + index * 1.2, 0, 2);
  scene.add(mesh);
  const entry = { mesh, tx: mesh.position.x, ty: 0, tz: mesh.position.z, try: 0 };
  remotePlayers.set(index, entry);
  return entry;
}

function applyRemotePose(index, pose) {
  if (index === myIndex || !pose) return;
  const e = ensureRemote(index);
  e.tx = pose.x; e.ty = pose.y || 0; e.tz = pose.z; e.try = pose.ry || 0;
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
    e.mesh.position.x += (e.tx - e.mesh.position.x) * k;
    e.mesh.position.y += (e.ty - e.mesh.position.y) * k;
    e.mesh.position.z += (e.tz - e.mesh.position.z) * k;
    let diff = e.try - e.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    e.mesh.rotation.y += diff * k;
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
  });
}


// ---------- 애니메이션 루프 ----------
const clock = new THREE.Clock();
let t = 0;
function animate(){
  if (!running) return;
  rafId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;
  updatePlayer(dt);
  updateCamera(dt);
  smoothRemotes(dt);
  maybeSendPose(performance.now());

  trees.forEach(tree => {
    tree.rotation.z = Math.sin(t*0.8 + tree.userData.sway) * 0.015;
  });

  clouds.forEach((c, i) => { c.position.x += dt * 0.3; if (c.position.x > 90) c.position.x = -90; });

  petals.forEach(p => {
    p.position.y -= p.userData.fallSpeed * dt;
    p.position.x += Math.sin(t*p.userData.speed + p.userData.drift) * dt * 0.4;
    p.rotation.z += dt * 0.5;
    p.rotation.x += dt * 0.3;
    if (p.position.y < 0){
      p.position.y = 10 + rand()*4;
      p.position.x = player.position.x + randPos(50);
      p.position.z = player.position.z + randPos(50);
    }
  });

  drawMinimap();
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
    },
    applyRemotePose,
    removeRemote,
    getPose() {
      return {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        ry: player.rotation.y,
      };
    },
  };


}
