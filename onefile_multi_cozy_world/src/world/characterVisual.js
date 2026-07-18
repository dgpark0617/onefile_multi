/**
 * 캐릭터 비주얼 — 로우폴리 몸 + 얼굴 앞 이미지 슬롯.
 * 이후 유저/NPC도 setCharacterImage(mesh, url) 로 동일하게 표시.
 */

const FACE_W = 0.55;
const FACE_H = 0.55;
const FACE_Y = 1.35;
const FACE_Z = 0.42;

/** 파스텔 기본 얼굴 (이미지 없을 때) */
export function makePlaceholderFaceDataUrl(label = "🌸", bg = "#f7c9d6") {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(48, 48, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "48px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 64, 70);
  return c.toDataURL("image/png");
}

const PLACEHOLDER_COLORS = ["#f7c9d6", "#c9e4f5", "#d4ecc8", "#f5e0c0"];
const PLACEHOLDER_LABELS = ["🌸", "🐰", "🍀", "🍊"];

/**
 * @param {typeof THREE} THREE
 * @param {number} color body hex
 * @param {{ index?: number, imageUrl?: string|null, showFace?: boolean }} opts
 */
export function makeCharacterMesh(THREE, color, opts = {}) {
  const index = opts.index ?? 0;
  const showFace = opts.showFace !== false;
  const player = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe8d0 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x4a3830 });
  const shadowify = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const bodyCyl = shadowify(
    new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.55, 10), bodyMat)
  );
  bodyCyl.position.y = 0.45;
  player.add(bodyCyl);

  const bodyTop = shadowify(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      bodyMat
    )
  );
  bodyTop.position.y = 0.72;
  player.add(bodyTop);

  const bodyBottom = shadowify(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 10, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      bodyMat
    )
  );
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

  player.userData.bodyCyl = bodyCyl;
  player.userData.charIndex = index;
  player.userData.imageUrl = null;

  if (showFace) {
    attachFacePlate(THREE, player);
    const placeholder = makePlaceholderFaceDataUrl(
      PLACEHOLDER_LABELS[index % PLACEHOLDER_LABELS.length],
      PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]
    );
    setCharacterImage(THREE, player, opts.imageUrl || placeholder);
  }

  return player;
}

function attachFacePlate(THREE, player) {
  const geo = new THREE.PlaneGeometry(FACE_W, FACE_H);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plate = new THREE.Mesh(geo, mat);
  plate.position.set(0, FACE_Y, FACE_Z);
  plate.name = "facePlate";
  player.add(plate);
  player.userData.facePlate = plate;
  player.userData.faceMat = mat;
}

/**
 * 캐릭터 앞면 이미지 설정. url=null 이면 숨김.
 * @param {typeof THREE} THREE
 * @param {THREE.Object3D} character
 * @param {string|null} url
 */
export function setCharacterImage(THREE, character, url) {
  if (!character?.userData) return;
  if (!character.userData.facePlate) attachFacePlate(THREE, character);

  const plate = character.userData.facePlate;
  const mat = character.userData.faceMat;
  character.userData.imageUrl = url || null;

  if (!url) {
    mat.map = null;
    mat.opacity = 0;
    mat.needsUpdate = true;
    plate.visible = false;
    return;
  }

  plate.visible = true;
  mat.opacity = 1;
  const loader = new THREE.TextureLoader();
  loader.load(
    url,
    (tex) => {
      if (character.userData.imageUrl !== url) return;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      if (tex.encoding !== undefined && THREE.sRGBEncoding !== undefined) {
        tex.encoding = THREE.sRGBEncoding;
      }
      mat.map = tex;
      mat.needsUpdate = true;
    },
    undefined,
    () => {
      // 로드 실패 시 플레이스홀더
      const fb = makePlaceholderFaceDataUrl("?");
      loader.load(fb, (tex) => {
        mat.map = tex;
        mat.needsUpdate = true;
      });
    }
  );
}

/** NPC/유저 공용: 앞으로 카메라 쪽을 살짝 바라보게 할 때 사용 (옵션) */
export function facePlateLookAtCamera(character, camera) {
  const plate = character?.userData?.facePlate;
  if (!plate || !camera) return;
  // 캐릭터 local +Z 앞에 붙어 있으므로 기본은 캐릭터 방향을 따름.
  // 필요 시 월드 빌보드:
  // plate.quaternion.copy(camera.quaternion);
}
