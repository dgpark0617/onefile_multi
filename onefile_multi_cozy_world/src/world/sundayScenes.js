/**
 * 주일학교 마을 — Seabeard식 장면(집·말씀 씬) 정의/빌드
 * sceneId: overworld | house_* | elijah_*
 */
import { TOKENS } from "./designTokens.js";
import { STORY_FACES } from "./characterVisual.js";

const K = TOKENS.kids;

/** 남아 1 · 여아 5 — 부피(크기)는 동일, style로 구조·디자인만 다름 */
export const SUNDAY_KIDS = [
  {
    id: "woojin", name: "우진", gender: "boy",
    color: K.woojin.color, roof: K.woojin.roof, accent: K.woojin.accent,
    house: { x: -17, z: -5, rotY: 0.45, style: "classic" },
  },
  {
    id: "gahyun", name: "가현", gender: "girl",
    color: K.gahyun.color, roof: K.gahyun.roof, accent: K.gahyun.accent,
    house: { x: -11, z: -15, rotY: -0.55, style: "dormer" },
  },
  {
    id: "youngsun", name: "영선", gender: "girl",
    color: K.youngsun.color, roof: K.youngsun.roof, accent: K.youngsun.accent,
    house: { x: -2, z: -10, rotY: 0.15, style: "porch" },
  },
  {
    id: "taemi", name: "태미", gender: "girl",
    color: K.taemi.color, roof: K.taemi.roof, accent: K.taemi.accent,
    house: { x: 6, z: -17, rotY: -0.7, style: "bay" },
  },
  {
    id: "nammun", name: "남문", gender: "girl",
    color: K.nammun.color, roof: K.nammun.roof, accent: K.nammun.accent,
    house: { x: 14, z: -8, rotY: 0.9, style: "turret" },
  },
  {
    id: "jongmyo", name: "종묘", gender: "girl",
    color: K.jongmyo.color, roof: K.jongmyo.roof, accent: K.jongmyo.accent,
    house: { x: 11, z: -14, rotY: -0.25, style: "garden" },
  },
];

/** 문 앞 방향 (로컬 +Z 기준, Y회전) */
function doorOffset(rotY, dist) {
  return { x: Math.sin(rotY) * dist, z: Math.cos(rotY) * dist };
}

/**
 * @param {typeof THREE} THREE
 * @param {{ scene: any, shadowify: Function, makeCharacterMesh: Function }} ctx
 */
export function buildSundayContent(THREE, ctx) {
  const { scene, shadowify, makeCharacterMesh } = ctx;
  const portals = [];
  const sceneBags = new Map();

  /** @param {'title'|'plaque'|'chip'} role */
  function labelSprite(text, color = TOKENS.ink, opts = {}) {
    const role = opts.role || "plaque";
    const presets = {
      title: { fontSize: 30, height: 0.72, maxWidth: 520, padX: 28, padY: 18 },
      plaque: { fontSize: 26, height: 0.5, maxWidth: 560, padX: 22, padY: 16 },
      chip: { fontSize: 22, height: 0.4, maxWidth: 360, padX: 16, padY: 12 },
    };
    const pre = presets[role] || presets.plaque;
    const fontSize = opts.fontSize || pre.fontSize;
    const padX = pre.padX;
    const padY = pre.padY;
    const maxW = opts.maxWidth || pre.maxWidth;
    const lineH = fontSize * 1.35;

    const measure = document.createElement("canvas").getContext("2d");
    measure.font = `bold ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;

    const lines = [];
    let cur = "";
    for (const ch of String(text)) {
      const next = cur + ch;
      if (measure.measureText(next).width > maxW - padX * 2 && cur) {
        lines.push(cur);
        cur = ch;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    if (!lines.length) lines.push(" ");

    const textW = Math.max(...lines.map((ln) => measure.measureText(ln).width), 40);
    const c = document.createElement("canvas");
    c.width = Math.ceil(Math.min(maxW, textW + padX * 2));
    c.height = Math.ceil(lines.length * lineH + padY * 2);
    const g = c.getContext("2d");
    g.fillStyle = TOKENS.labelBg;
    const rr = role === "chip" ? 10 : 14;
    const w = c.width;
    const h = c.height;
    g.beginPath();
    g.moveTo(rr, 4);
    g.lineTo(w - rr, 4);
    g.quadraticCurveTo(w - 4, 4, w - 4, rr);
    g.lineTo(w - 4, h - rr);
    g.quadraticCurveTo(w - 4, h - 4, w - rr, h - 4);
    g.lineTo(rr, h - 4);
    g.quadraticCurveTo(4, h - 4, 4, h - rr);
    g.lineTo(4, rr);
    g.quadraticCurveTo(4, 4, rr, 4);
    g.closePath();
    g.fill();
    g.strokeStyle = TOKENS.labelBorder;
    g.lineWidth = role === "title" ? 3.5 : 2.5;
    g.stroke();

    g.font = `bold ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    lines.forEach((ln, i) => {
      const y = padY + lineH * (i + 0.5);
      g.lineWidth = Math.max(2.5, fontSize * 0.1);
      g.strokeStyle = "rgba(255,255,255,0.92)";
      g.strokeText(ln, w / 2, y);
      g.fillStyle = color;
      g.fillText(ln, w / 2, y);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    const worldH = opts.height ?? Math.min(pre.height, 0.36 + lines.length * 0.2);
    const aspect = c.width / Math.max(1, c.height);
    spr.scale.set(worldH * aspect, worldH, 1);
    return spr;
  }

  const labelTitle = (t, o = {}) => labelSprite(t, TOKENS.ink, { role: "title", ...o });
  const labelPlaque = (t, o = {}) => labelSprite(t, TOKENS.ink, { role: "plaque", ...o });
  const labelChip = (t, o = {}) => labelSprite(t, TOKENS.ink, { role: "chip", ...o });

  /**
   * 클래식 축구공 — 흰 구 + 정십이면체 꼭짓점(12)에 검은 오각형
   * (실제 축구공 = 깎은 정이십면체: 검은 오각형 12 + 흰 육각형 20)
   */
  function makeSoccerBall(radius = 0.22) {
    const g = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf3f3f3,
      roughness: 0.5,
      metalness: 0.04,
    });
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x1c1c1c,
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const ball = shadowify(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), whiteMat));
    g.add(ball);

    const pentR = radius * 0.36;
    const shape = new THREE.Shape();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * pentR;
      const py = Math.sin(a) * pentR;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();
    const pentGeo = new THREE.ShapeGeometry(shape);

    const ico = new THREE.IcosahedronGeometry(1, 0);
    const pos = ico.attributes.position;
    const seen = new Set();
    const dirs = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dirs.push(v);
    }
    ico.dispose();

    const zUp = new THREE.Vector3(0, 0, 1);
    for (const dir of dirs) {
      const patch = new THREE.Mesh(pentGeo, blackMat);
      patch.position.copy(dir).multiplyScalar(radius * 1.006);
      patch.quaternion.setFromUnitVectors(zUp, dir);
      g.add(patch);
    }

    g.rotation.set(0.35, 0.6, 0.15);
    return g;
  }

  /** 본체 부피 고정(약 2.8³) — style만 구조/디테일 차이 */
  function makeCottage(kid) {
    const h = kid.house || { x: 0, z: 0, rotY: 0, style: "classic" };
    const style = h.style || "classic";
    const g = new THREE.Group();
    const bw = 2.8;
    const bh = 1.95;
    const bd = 2.8;
    const roofH = 1.35;

    const wallMat = new THREE.MeshStandardMaterial({ color: TOKENS.houseWall, roughness: 0.88 });
    const woodMat = new THREE.MeshStandardMaterial({ color: TOKENS.houseDoor, roughness: 0.88 });
    const roofMat = new THREE.MeshStandardMaterial({ color: kid.roof, roughness: 0.8 });
    const winMat = new THREE.MeshStandardMaterial({ color: kid.accent });
    const doorMat = new THREE.MeshStandardMaterial({ color: TOKENS.houseDoor });

    const wall = shadowify(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMat));
    wall.position.y = bh * 0.5;
    g.add(wall);

    // --- 지붕 형태 (부피 비슷한 높이) ---
    if (style === "dormer") {
      const hip = shadowify(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.15, 0.2, bd + 0.15), roofMat));
      hip.position.y = bh + 0.05;
      g.add(hip);
      const peak = shadowify(new THREE.Mesh(new THREE.ConeGeometry(1.6, roofH, 4), roofMat));
      peak.position.y = bh + roofH * 0.45;
      peak.rotation.y = Math.PI / 4;
      g.add(peak);
      const dorm = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.55), wallMat));
      dorm.position.set(0, bh + 0.45, bd * 0.28);
      g.add(dorm);
      const dormRoof = shadowify(new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.45, 4), roofMat));
      dormRoof.position.set(0, bh + 0.95, bd * 0.28);
      dormRoof.rotation.y = Math.PI / 4;
      g.add(dormRoof);
      const dormWin = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), winMat);
      dormWin.position.set(0, bh + 0.45, bd * 0.28 + 0.29);
      g.add(dormWin);
    } else if (style === "bay") {
      const roof = shadowify(new THREE.Mesh(new THREE.ConeGeometry(2.15, roofH, 4), roofMat));
      roof.position.y = bh + roofH * 0.35;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      const bay = shadowify(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 0.55), wallMat));
      bay.position.set(0, 0.85, bd * 0.5 + 0.2);
      g.add(bay);
      const bayRoof = shadowify(new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 0.7), roofMat));
      bayRoof.position.set(0, 1.45, bd * 0.5 + 0.2);
      g.add(bayRoof);
      [-0.35, 0, 0.35].forEach((ox) => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.04), winMat);
        w.position.set(ox, 0.9, bd * 0.5 + 0.48);
        g.add(w);
      });
    } else if (style === "turret") {
      const roof = shadowify(new THREE.Mesh(new THREE.ConeGeometry(2.0, roofH * 0.85, 4), roofMat));
      roof.position.y = bh + roofH * 0.28;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      const turret = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 2.4, 8), wallMat));
      turret.position.set(-bw * 0.35, 1.2, -bd * 0.35);
      g.add(turret);
      const cap = shadowify(new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.7, 8), roofMat));
      cap.position.set(-bw * 0.35, 2.7, -bd * 0.35);
      g.add(cap);
      const tw = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), winMat);
      tw.position.set(-bw * 0.35, 1.8, -bd * 0.35 + 0.52);
      g.add(tw);
    } else {
      // classic / porch / garden — 사각뿔 지붕
      const roof = shadowify(new THREE.Mesh(new THREE.ConeGeometry(2.15, roofH, 4), roofMat));
      roof.position.y = bh + roofH * 0.35;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
    }

    // --- 구조 디테일 ---
    if (style === "classic" || style === "garden") {
      const chimney = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.32), new THREE.MeshStandardMaterial({ color: TOKENS.houseChimney })));
      chimney.position.set(bw * 0.32, bh + roofH * 0.55, -bd * 0.1);
      g.add(chimney);
    }
    if (style === "classic") {
      const chimney2 = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.28), new THREE.MeshStandardMaterial({ color: TOKENS.houseChimney })));
      chimney2.position.set(-bw * 0.28, bh + roofH * 0.45, bd * 0.05);
      g.add(chimney2);
    }

    if (style === "porch") {
      const porch = shadowify(new THREE.Mesh(new THREE.BoxGeometry(bw * 0.85, 0.1, 0.85), woodMat));
      porch.position.set(0, 0.05, bd * 0.5 + 0.35);
      g.add(porch);
      [-0.9, 0.9].forEach((ox) => {
        const post = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6), woodMat));
        post.position.set(ox, 0.8, bd * 0.5 + 0.65);
        g.add(post);
      });
      const lintel = shadowify(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.12), woodMat));
      lintel.position.set(0, 1.55, bd * 0.5 + 0.65);
      g.add(lintel);
      const porchRoof = shadowify(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.0), roofMat));
      porchRoof.position.set(0, 1.65, bd * 0.5 + 0.4);
      g.add(porchRoof);
    }

    if (style === "garden") {
      // 옆 격자·화단 (본체 부피 유지, 장식만)
      const trellis = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 1.8), woodMat));
      trellis.position.set(bw * 0.55, 0.85, 0);
      g.add(trellis);
      for (let i = 0; i < 4; i++) {
        const vine = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 5, 5),
          new THREE.MeshStandardMaterial({ color: kid.color })
        );
        vine.position.set(bw * 0.55, 0.4 + i * 0.35, -0.6 + i * 0.35);
        g.add(vine);
      }
      const bed = shadowify(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.45), new THREE.MeshStandardMaterial({ color: 0xa08060 })));
      bed.position.set(0, 0.1, bd * 0.5 + 0.55);
      g.add(bed);
    }

    // 문 (공통 위치 — 입장 포털과 정렬)
    const doorFaceZ = bd * 0.5 + 0.04;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6038, roughness: 0.85 });
    const oDoorW = 0.78;
    const oDoorH = 1.15;
    const fL = new THREE.Mesh(new THREE.BoxGeometry(0.08, oDoorH + 0.1, 0.1), frameMat);
    fL.position.set(-oDoorW / 2, oDoorH / 2, doorFaceZ);
    g.add(fL);
    const fR = fL.clone();
    fR.position.x = oDoorW / 2;
    g.add(fR);
    const fT = new THREE.Mesh(new THREE.BoxGeometry(oDoorW + 0.1, 0.08, 0.1), frameMat);
    fT.position.set(0, oDoorH + 0.02, doorFaceZ);
    g.add(fT);
    const door = new THREE.Mesh(new THREE.BoxGeometry(oDoorW - 0.08, oDoorH - 0.04, 0.07), doorMat);
    door.position.set(0, oDoorH / 2 - 0.02, doorFaceZ - 0.02);
    g.add(door);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xe8c040, roughness: 0.4, metalness: 0.35 })
    );
    knob.position.set(oDoorW * 0.22, oDoorH * 0.48, doorFaceZ - 0.08);
    g.add(knob);
    if (style === "porch" || style === "classic") {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 6, 10, Math.PI), woodMat);
      arch.position.set(0, oDoorH + 0.08, doorFaceZ + 0.02);
      arch.rotation.x = Math.PI / 2;
      g.add(arch);
    }
    const enterHint = null; // E는 하단 HUD만 — 문 앞 중복 보드 제거
    // 창 (스타일별 배치, bay는 이미 전면 창)
    if (style !== "bay") {
      if (style === "dormer") {
        [-0.75, 0.75].forEach((ox) => {
          const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.04), winMat);
          w.position.set(ox, bh * 0.55, bd * 0.5 + 0.02);
          g.add(w);
        });
      } else if (style === "turret") {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.04), winMat);
        w1.position.set(0.55, bh * 0.55, bd * 0.5 + 0.02);
        g.add(w1);
        const round = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), winMat);
        round.position.set(-0.6, bh * 0.65, bd * 0.5 + 0.02);
        g.add(round);
      } else {
        [-0.7, 0.7].forEach((ox) => {
          const w = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.04), winMat);
          w.position.set(ox, bh * 0.58, bd * 0.5 + 0.02);
          g.add(w);
        });
      }
    }

    // 아이별 개성 소품 (문 옆, 입장 경로 방해 안 하게)
    const propX = 1.15;
    const propZ = bd * 0.5 + 0.85;
    if (kid.id === "woojin") {
      const ball = makeSoccerBall(0.24);
      ball.position.set(propX, 0.24, propZ);
      g.add(ball);
    } else if (kid.id === "taemi") {
      // 접이식 캠핑의자 — X프레임 + 천 시트 + 팔걸이
      const fabric = new THREE.MeshStandardMaterial({ color: 0xd87840, roughness: 0.78 });
      const frame = new THREE.MeshStandardMaterial({ color: 0x3a3834, roughness: 0.45, metalness: 0.35 });
      const chair = new THREE.Group();
      // X다리 (앞뒤 한 쌍씩)
      [[-0.2, 0.22], [0.2, 0.22]].forEach(([ox]) => {
        const a = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 5), frame);
        a.position.set(ox, 0.28, 0);
        a.rotation.x = 0.55;
        chair.add(a);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 5), frame);
        b.position.set(ox, 0.28, 0);
        b.rotation.x = -0.55;
        chair.add(b);
      });
      // 좌우 연결 힌지
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 6), frame);
      hinge.rotation.z = Math.PI / 2;
      hinge.position.set(0, 0.32, 0);
      chair.add(hinge);
      // 좌석 천
      const seat = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.42), fabric));
      seat.position.set(0, 0.48, 0.02);
      chair.add(seat);
      // 등받이 천 (살짝 뒤로)
      const back = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.04), fabric));
      back.position.set(0, 0.78, -0.22);
      back.rotation.x = -0.2;
      chair.add(back);
      // 팔걸이
      [-0.26, 0.26].forEach((ox) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.38), frame);
        arm.position.set(ox, 0.62, -0.02);
        chair.add(arm);
      });
      chair.position.set(propX, 0, propZ);
      chair.rotation.y = -0.25;
      g.add(chair);
    } else if (kid.id === "gahyun") {
      // 삼각 이젤 + 받침대 + 그림 캔버스
      const wood = new THREE.MeshStandardMaterial({ color: 0xa87848, roughness: 0.85 });
      const darkWood = new THREE.MeshStandardMaterial({ color: 0x8a6038, roughness: 0.8 });
      const easel = new THREE.Group();
      // 앞다리 두 개 (A자)
      [-0.28, 0.28].forEach((ox) => {
        const leg = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.35, 0.05), wood));
        leg.position.set(ox, 0.68, 0.08);
        leg.rotation.z = ox > 0 ? -0.18 : 0.18;
        easel.add(leg);
      });
      // 뒷다리
      const backLeg = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.05), wood));
      backLeg.position.set(0, 0.58, -0.38);
      backLeg.rotation.x = 0.42;
      easel.add(backLeg);
      // 가로대 (중·상)
      [0.55, 1.05].forEach((y) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.04), darkWood);
        bar.position.set(0, y, 0.12);
        easel.add(bar);
      });
      // 캔버스 받침 턱
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.12), darkWood);
      ledge.position.set(0, 0.52, 0.18);
      easel.add(ledge);
      // 캔버스 + 그림
      const canvas = shadowify(new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.58, 0.035),
        new THREE.MeshStandardMaterial({ color: 0xf8f4ec, roughness: 0.92 })
      ));
      canvas.position.set(0, 0.88, 0.16);
      canvas.rotation.x = -0.06;
      easel.add(canvas);
      // 풍경 느낌 그림
      const sky = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xa8d0e8, roughness: 1 })
      );
      sky.position.set(0, 1.02, 0.185);
      easel.add(sky);
      const hill = new THREE.Mesh(
        new THREE.CircleGeometry(0.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x78b068, roughness: 1 })
      );
      hill.position.set(-0.06, 0.78, 0.185);
      easel.add(hill);
      const hill2 = new THREE.Mesh(
        new THREE.CircleGeometry(0.16, 8),
        new THREE.MeshStandardMaterial({ color: 0x5a9850, roughness: 1 })
      );
      hill2.position.set(0.12, 0.74, 0.185);
      easel.add(hill2);
      const sun = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 8),
        new THREE.MeshStandardMaterial({ color: 0xf0c050, roughness: 1 })
      );
      sun.position.set(0.12, 1.05, 0.19);
      easel.add(sun);
      easel.position.set(propX, 0, propZ);
      easel.rotation.y = 0.15;
      g.add(easel);
    } else if (kid.id === "youngsun") {
      // 프로펠러 비행기 모형
      const stand = shadowify(new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.1, 0.28, 6),
        new THREE.MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.85 })
      ));
      stand.position.set(propX, 0.14, propZ);
      g.add(stand);
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.22, 5),
        new THREE.MeshStandardMaterial({ color: 0xb0a090, metalness: 0.3, roughness: 0.5 })
      );
      rod.position.set(propX, 0.35, propZ);
      g.add(rod);

      const plane = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf0ebe4, roughness: 0.5, metalness: 0.15 });
      const accentMat = new THREE.MeshStandardMaterial({ color: kid.accent, roughness: 0.55 });
      const darkMat = new THREE.MeshStandardMaterial({ color: kid.color, roughness: 0.55 });
      // 동체
      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.85, 8), bodyMat);
      fuselage.rotation.z = Math.PI / 2;
      plane.add(fuselage);
      // 기수
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 8), accentMat);
      nose.rotation.z = -Math.PI / 2;
      nose.position.set(0.48, 0, 0);
      plane.add(nose);
      // 조종석
      const cockpit = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({ color: 0x68a8c8, roughness: 0.35, metalness: 0.2, transparent: true, opacity: 0.85 })
      );
      cockpit.position.set(0.12, 0.06, 0);
      plane.add(cockpit);
      // 주익
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 1.05), accentMat);
      wing.position.set(0.05, -0.02, 0);
      plane.add(wing);
      // 수평꼬리날개
      const hTail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.42), darkMat);
      hTail.position.set(-0.32, 0.02, 0);
      plane.add(hTail);
      // 수직꼬리
      const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.035), darkMat);
      vTail.position.set(-0.34, 0.12, 0);
      plane.add(vTail);
      // 프로펠러
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 })
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(0.58, 0, 0);
      plane.add(hub);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.55), new THREE.MeshStandardMaterial({ color: 0xc8b090, roughness: 0.7 }));
      blade.position.set(0.6, 0, 0);
      plane.add(blade);
      const blade2 = blade.clone();
      blade2.rotation.x = Math.PI / 2;
      plane.add(blade2);

      plane.position.set(propX, 0.52, propZ);
      plane.rotation.set(0.12, 0.55, 0.08);
      g.add(plane);
    } else if (kid.id === "nammun") {
      // 예쁜 꽃병 + 꽃잎 있는 꽃들
      const vaseGrp = new THREE.Group();
      const vaseMat = new THREE.MeshStandardMaterial({
        color: 0xd46898,
        roughness: 0.35,
        metalness: 0.12,
      });
      const glaze = new THREE.MeshStandardMaterial({
        color: 0xf0a0c0,
        roughness: 0.3,
        metalness: 0.1,
      });
      // 병 몸통 (잘록한 형태)
      const belly = shadowify(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), vaseMat));
      belly.scale.set(1, 1.15, 1);
      belly.position.y = 0.28;
      vaseGrp.add(belly);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 10), vaseMat);
      foot.position.y = 0.04;
      vaseGrp.add(foot);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.22, 10), glaze);
      neck.position.y = 0.55;
      vaseGrp.add(neck);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12), glaze);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.66;
      vaseGrp.add(rim);
      // 무늬 띠
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.19, 0.015, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8e8a0, roughness: 0.4, metalness: 0.2 })
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.32;
      vaseGrp.add(band);

      const flowerColors = [0xf05078, 0xf0c040, 0xe070d0, 0xff8898, 0xf8e060];
      const petalMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const lean = 0.2 + (i % 3) * 0.08;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.016, 0.42 + (i % 2) * 0.08, 4),
          new THREE.MeshStandardMaterial({ color: 0x3a8840, roughness: 0.85 })
        );
        stem.position.set(Math.cos(ang) * 0.05, 0.88, Math.sin(ang) * 0.05);
        stem.rotation.z = Math.cos(ang) * lean;
        stem.rotation.x = Math.sin(ang) * lean * 0.6;
        vaseGrp.add(stem);
        // 꽃잎 5장
        const bloom = new THREE.Group();
        const col = flowerColors[i];
        for (let p = 0; p < 5; p++) {
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), petalMat(col));
          petal.scale.set(1, 0.45, 0.7);
          const pa = (p / 5) * Math.PI * 2;
          petal.position.set(Math.cos(pa) * 0.05, 0, Math.sin(pa) * 0.05);
          bloom.add(petal);
        }
        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xfff0a0, roughness: 0.55 })
        );
        bloom.add(center);
        bloom.position.set(Math.cos(ang) * 0.1, 1.12 + (i % 2) * 0.06, Math.sin(ang) * 0.1);
        vaseGrp.add(bloom);
      }
      // 잎
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 6, 5),
          new THREE.MeshStandardMaterial({ color: 0x4a9850, roughness: 0.8 })
        );
        leaf.scale.set(1.4, 0.25, 0.7);
        leaf.position.set((i - 1) * 0.1, 0.78, 0.06);
        leaf.rotation.z = (i - 1) * 0.4;
        vaseGrp.add(leaf);
      }

      vaseGrp.position.set(propX, 0, propZ);
      g.add(vaseGrp);
    } else if (kid.id === "jongmyo") {
      // 코트랙 옷걸이 — 받침대 + 세로대 + 갈고리 + 옷걸이·옷
      const wood = new THREE.MeshStandardMaterial({ color: 0x8a6848, roughness: 0.8 });
      const metal = new THREE.MeshStandardMaterial({ color: 0xc8c0b0, metalness: 0.55, roughness: 0.35 });
      const rack = new THREE.Group();
      const base = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.07, 10), wood));
      base.position.y = 0.035;
      rack.add(base);
      const pole = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.45, 8), wood));
      pole.position.y = 0.78;
      rack.add(pole);
      // 꼭대기 장식
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), wood);
      knob.position.y = 1.55;
      rack.add(knob);
      // 사방 갈고리
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const hookArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 5), metal);
        hookArm.rotation.z = Math.PI / 2;
        hookArm.position.set(Math.cos(a) * 0.12, 1.35, Math.sin(a) * 0.12);
        hookArm.rotation.y = -a;
        rack.add(hookArm);
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 4, 10, Math.PI * 1.2), metal);
        hook.position.set(Math.cos(a) * 0.22, 1.28, Math.sin(a) * 0.22);
        hook.rotation.y = -a;
        hook.rotation.z = Math.PI / 2;
        rack.add(hook);
      }
      // 가로대 + 옷걸이 2개
      const cross = shadowify(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6), wood));
      cross.rotation.z = Math.PI / 2;
      cross.position.set(0, 1.15, 0);
      rack.add(cross);

      function addHangingClothes(ox, color, accent) {
        const hanger = new THREE.Group();
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), metal);
        hook.rotation.x = Math.PI / 2;
        hook.position.y = 0.12;
        hanger.add(hook);
        const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5), metal);
        shoulder.rotation.z = Math.PI / 2;
        hanger.add(shoulder);
        // 옷 몸통 (어깨에서 내려오는 형태)
        const shirt = shadowify(new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.42, 0.06),
          new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
        ));
        shirt.position.y = -0.22;
        hanger.add(shirt);
        // 소매
        [-0.18, 0.18].forEach((sx) => {
          const sleeve = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.28, 0.05),
            new THREE.MeshStandardMaterial({ color: accent, roughness: 0.88 })
          );
          sleeve.position.set(sx, -0.12, 0);
          hanger.add(sleeve);
        });
        hanger.position.set(ox, 1.12, 0.02);
        rack.add(hanger);
      }
      addHangingClothes(-0.18, kid.color, kid.accent);
      addHangingClothes(0.18, kid.accent, kid.color);

      rack.position.set(propX, 0, propZ);
      rack.rotation.y = 0.2;
      g.add(rack);
    }

    const nameTag = labelChip(`${kid.name}의 집`);
    nameTag.position.set(0, bh + roofH + 0.4, 0);
    g.add(nameTag);

    // 현관 꽃 (공통, 색만 다름)
    const flowerColors = [kid.color, kid.accent, kid.roof];
    for (let i = 0; i < 3; i++) {
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 5, 5),
        new THREE.MeshStandardMaterial({ color: flowerColors[i % 3] })
      );
      bloom.position.set((i - 1) * 0.4, 0.12, bd * 0.5 + 0.75);
      g.add(bloom);
    }

    g.position.set(h.x, 0, h.z);
    g.rotation.y = h.rotY || 0;
    return g;
  }

  function makeHouseInterior(kid) {
    const root = new THREE.Group();
    root.visible = false;

    addHouseCosmosPlatform(root);

    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd8b898, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 8), floorMat);
    floor.position.y = -0.06;
    root.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: kid.accent, roughness: 0.95 });
    const wallH = 2.6;
    const roomHalf = 3.9;
    const doorW = 1.15;
    const doorH = 1.85;
    const winW = 1.4;
    const winH = 1.1;
    // 뒷벽·측벽 — 우주가 보이는 창 구멍
    function wallWithWindow(wx, wy, wz, sx, sy, sz, winAlongX) {
      const g = new THREE.Group();
      if (winAlongX) {
        const side = (sx - winW) / 2;
        const left = new THREE.Mesh(new THREE.BoxGeometry(side, sy, sz), wallMat);
        left.position.set(-winW / 2 - side / 2, 0, 0);
        g.add(left);
        const right = new THREE.Mesh(new THREE.BoxGeometry(side, sy, sz), wallMat);
        right.position.set(winW / 2 + side / 2, 0, 0);
        g.add(right);
        const above = new THREE.Mesh(new THREE.BoxGeometry(winW, (sy - winH) / 2, sz), wallMat);
        above.position.set(0, winH / 2 + (sy - winH) / 4, 0);
        g.add(above);
        const below = new THREE.Mesh(new THREE.BoxGeometry(winW, (sy - winH) / 2, sz), wallMat);
        below.position.set(0, -winH / 2 - (sy - winH) / 4, 0);
        g.add(below);
      } else {
        const side = (sz - winW) / 2;
        const front = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, side), wallMat);
        front.position.set(0, 0, -winW / 2 - side / 2);
        g.add(front);
        const back = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, side), wallMat);
        back.position.set(0, 0, winW / 2 + side / 2);
        g.add(back);
        const above = new THREE.Mesh(new THREE.BoxGeometry(sx, (sy - winH) / 2, winW), wallMat);
        above.position.set(0, winH / 2 + (sy - winH) / 4, 0);
        g.add(above);
        const below = new THREE.Mesh(new THREE.BoxGeometry(sx, (sy - winH) / 2, winW), wallMat);
        below.position.set(0, -winH / 2 - (sy - winH) / 4, 0);
        g.add(below);
      }
      // 창틀
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(winAlongX ? winW + 0.1 : 0.08, winAlongX ? 0.08 : winH + 0.1, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x8a6038 })
      );
      g.add(frame);
      g.position.set(wx, wy, wz);
      root.add(g);
    }

    wallWithWindow(0, wallH / 2, -roomHalf, 8, wallH, 0.2, true);
    wallWithWindow(-roomHalf, wallH / 2, 0, 0.2, wallH, 8, false);
    wallWithWindow(roomHalf, wallH / 2, 0, 0.2, wallH, 8, false);
    const sideW = (8 - doorW) / 2;
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallH, 0.2), wallMat);
    leftWall.position.set(-(doorW / 2 + sideW / 2), wallH / 2, roomHalf);
    root.add(leftWall);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallH, 0.2), wallMat);
    rightWall.position.set(doorW / 2 + sideW / 2, wallH / 2, roomHalf);
    root.add(rightWall);
    const lintelH = wallH - doorH;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.08, lintelH, 0.2), wallMat);
    lintel.position.set(0, doorH + lintelH / 2, roomHalf);
    root.add(lintel);

    // 침대
    const bedMat = new THREE.MeshStandardMaterial({ color: kid.color, roughness: 0.85 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 2.0), bedMat);
    bed.position.set(-2.2, 0.25, -2.0);
    root.add(bed);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffe8d0 })
    );
    pillow.position.set(-2.2, 0.48, -2.7);
    root.add(pillow);

    // 책상·의자
    const wood = new THREE.MeshStandardMaterial({ color: 0xc09058, roughness: 0.88 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.7), wood);
    desk.position.set(2.0, 0.55, -2.2);
    root.add(desk);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), wood);
    [
      [1.5, 0.25, -2.45],
      [2.5, 0.25, -2.45],
      [1.5, 0.25, -1.95],
      [2.5, 0.25, -1.95],
    ].forEach(([lx, ly, lz]) => {
      const l = leg.clone();
      l.position.set(lx, ly, lz);
      root.add(l);
    });

    // 러그
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.04, 2.2),
      new THREE.MeshStandardMaterial({ color: kid.roof, roughness: 1 })
    );
    rug.position.set(0, 0.02, 0.5);
    root.add(rug);

    // 천장이 열려 우주가 보임 — 방 이름만 살짝 위에
    const title = labelChip(`${kid.name}의 방`);
    title.position.set(0, 3.0, 0);
    root.add(title);

    // 출구 문 — E 포털과 같은 위치
    const doorZ = roomHalf - 0.06;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6038, roughness: 0.85 });
    const doorMat = new THREE.MeshStandardMaterial({ color: TOKENS.houseDoor, roughness: 0.8 });
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorH + 0.08, 0.14), frameMat);
    frameL.position.set(-doorW / 2, doorH / 2, doorZ);
    root.add(frameL);
    const frameR = frameL.clone();
    frameR.position.x = doorW / 2;
    root.add(frameR);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.12, 0.1, 0.14), frameMat);
    frameTop.position.set(0, doorH + 0.02, doorZ);
    root.add(frameTop);

    const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.12, doorH - 0.06, 0.08), doorMat);
    exitDoor.position.set(0, (doorH - 0.06) / 2, doorZ - 0.02);
    root.add(exitDoor);
    // 문 패널 라인
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x8a5020, roughness: 0.85 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.35, doorH * 0.38, 0.03), panelMat);
    panel.position.set(0, doorH * 0.62, doorZ - 0.07);
    root.add(panel);
    const panel2 = panel.clone();
    panel2.position.y = doorH * 0.28;
    root.add(panel2);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8c040, roughness: 0.4, metalness: 0.4 })
    );
    knob.position.set(doorW * 0.28, doorH * 0.48, doorZ - 0.1);
    root.add(knob);

    const hint = labelChip("나가기");
    hint.position.set(0, doorH + 0.35, doorZ - 0.4);
    root.add(hint);

    // 문 바로 안쪽 — 서서 E로 나가기
    const exitZ = doorZ - 0.85;
    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: 1.6 },
      exitPortal: { x: 0, z: exitZ, r: 1.15, to: "overworld", outPos: null },
    };
  }

  /** 우주 셸 — 장면 밖은 별이 가득한 공간 */
  function addCosmosShell(root) {
    const cosmos = new THREE.Group();
    cosmos.name = "cosmosShell";

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(46, 28, 20),
      new THREE.MeshBasicMaterial({
        color: TOKENS.cosmosBg,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      })
    );
    cosmos.add(shell);

    // 성운 덩어리 — 채도 낮은 청록·코랄 (네온 보라 배제)
    const nebulaColors = [0x284868, 0x385878, 0x684848, 0x286060];
    for (let i = 0; i < 7; i++) {
      const neb = new THREE.Mesh(
        new THREE.SphereGeometry(4 + (i % 3) * 2.2, 10, 10),
        new THREE.MeshBasicMaterial({
          color: nebulaColors[i % nebulaColors.length],
          transparent: true,
          opacity: 0.12 + (i % 3) * 0.04,
          fog: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      const a = (i / 7) * Math.PI * 2;
      neb.position.set(Math.cos(a) * 28, (i % 3) * 8 - 6, Math.sin(a) * 28);
      cosmos.add(neb);
    }

    // 별
    const N = 520;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 22 + Math.random() * 20;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const starsPts = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xfff8ff,
        size: 0.22,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
        fog: false,
        depthWrite: false,
      })
    );
    cosmos.add(starsPts);

    // 먼 행성
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x6890c8, fog: false })
    );
    planet.position.set(-18, 10, -22);
    cosmos.add(planet);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.12, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xc8b090, fog: false, transparent: true, opacity: 0.7 })
    );
    ring.position.copy(planet.position);
    ring.rotation.x = Math.PI / 2.6;
    cosmos.add(ring);

    const planet2 = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xc87060, fog: false })
    );
    planet2.position.set(20, -8, 16);
    cosmos.add(planet2);

    root.add(cosmos);
    root.userData.cosmos = cosmos;
    return cosmos;
  }

  /** 호렙 산 하늘 — 행성/우주 없이 고요한 산 하늘 */
  function addMountainShell(root) {
    const shell = new THREE.Group();
    shell.name = "mountainShell";
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(46, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0x6a7888,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      })
    );
    shell.add(sky);
    // 먼 산 실루엣
    const ridgeMat = new THREE.MeshBasicMaterial({ color: 0x4a5868, fog: false, depthWrite: false });
    for (let i = 0; i < 5; i++) {
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(8 + i * 1.2, 5 + (i % 2), 5), ridgeMat);
      const a = (i / 5) * Math.PI * 2;
      ridge.position.set(Math.cos(a) * 28, -2, Math.sin(a) * 28);
      shell.add(ridge);
    }
    root.add(shell);
    root.userData.cosmos = shell;
    return shell;
  }

  /** 말씀 장면 바닥 — cosmos:false 면 산/굴 분위기 */
  function desertFloor(root, color = TOKENS.islandSand, radius = 14, opts = {}) {
    if (opts.cosmos === false) addMountainShell(root);
    else addCosmosShell(root);

    const island = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 36),
      new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.02;
    island.add(top);

    // 가장자리 — 두꺼운 링 대신 얇은 턱 (하얀 띠처럼 안 보이게)
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius - 0.08, 0.1, 6, 40),
      new THREE.MeshStandardMaterial({ color: TOKENS.islandRim, roughness: 1 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.02;
    island.add(rim);

    // 아랫면 — 바위 덩어리로 떠 있는 느낌
    const underMat = new THREE.MeshStandardMaterial({ color: TOKENS.islandUnder, roughness: 1 });
    const belly = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.92, 4.5, 10), underMat);
    belly.position.y = -2.2;
    belly.rotation.x = Math.PI;
    island.add(belly);
    for (let i = 0; i < 6; i++) {
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + (i % 3) * 0.4, 0), underMat);
      const a = (i / 6) * Math.PI * 2;
      rock.position.set(Math.cos(a) * radius * 0.55, -1.2 - (i % 2) * 0.6, Math.sin(a) * radius * 0.55);
      rock.scale.set(1, 1.4, 1);
      island.add(rock);
    }

    // 섬 아래 은은한 빛 (밝기↓ — 지평선 하얀 띠처럼 안 보이게)
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.55, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0x4050a0,
        transparent: true,
        opacity: 0.08,
        fog: false,
        depthWrite: false,
      })
    );
    glow.position.y = -3.8;
    island.add(glow);

    // 떠다니는 작은 별·돌 파편
    for (let i = 0; i < 10; i++) {
      const speck = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false })
      );
      const a = Math.random() * Math.PI * 2;
      const rr = radius + 1.5 + Math.random() * 4;
      speck.position.set(Math.cos(a) * rr, 1 + Math.random() * 5, Math.sin(a) * rr);
      island.add(speck);
    }

    root.add(island);
    root.userData.island = island;
  }

  /** 집이 우주에 떠 있는 방 */
  function addHouseCosmosPlatform(root) {
    addCosmosShell(root);
    const under = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 0.5, 9.2),
      new THREE.MeshStandardMaterial({ color: 0x6a5848, roughness: 1 })
    );
    under.position.y = -0.35;
    root.add(under);
    const keel = new THREE.Mesh(
      new THREE.ConeGeometry(5.5, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 1 })
    );
    keel.position.y = -2.0;
    keel.rotation.x = Math.PI;
    root.add(keel);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0x8090ff,
        transparent: true,
        opacity: 0.12,
        fog: false,
        depthWrite: false,
      })
    );
    glow.position.y = -2.8;
    root.add(glow);
  }

  /**
   * 이야기 장면 출구 문 — 벽면보다 장면 쪽에 두어
   * 배치: 벽면(+Z 바깥) > 문 > 장면 > 우주
   */
  function addStoryExit(root, z = 9.2) {
    const exitDoor = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.55, 0.1),
      new THREE.MeshStandardMaterial({ color: TOKENS.exitDoor })
    );
    exitDoor.position.set(0, 0.78, z);
    root.add(exitDoor);
    const leave = labelChip("이야기로");
    leave.position.set(0, 1.95, z - 0.45);
    root.add(leave);
    return { x: 0, z: z - 0.15, r: 1.35, to: "elijah_hub", outPos: null };
  }

  /** 입구 깊이 상수 — 벽면이 문 뒤(+Z) */
  const STORY_WALL_Z = 10.5;
  const STORY_DOOR_Z = 9.15;
  const STORY_SPAWN_Z = 5.2;

  /** 장면당 짧은 포인트 1줄 */
  function addScenePoint(root, text, y = 3.6, z = 0.5) {
    const spr = labelPlaque(text);
    spr.position.set(0, y, z);
    root.add(spr);
  }

  /** 시편 62:8 — 마을 말씀 문 위에만 표시 */
  const MEMORY_VERSE = {
    ref: "시편 62:8",
    text: "백성들아 시시로 그를 의지하고 그의 앞에 마음을 토하라 하나님은 우리의 피난처시로다.",
    short: "시편 62:8 · 하나님은 우리의 피난처시로다",
  };

  /** 성경 구절 벽화 — 원래 산세리프 + 볼드 */
  const MURAL_FONT = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

  function wrapCanvasLines(g, text, maxW) {
    const lines = [];
    let cur = "";
    for (const ch of String(text)) {
      const next = cur + ch;
      if (g.measureText(next).width > maxW && cur) {
        lines.push(cur);
        cur = ch;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [" "];
  }

  function makeScriptureMural({
    ref,
    verses,
    tint = TOKENS.muralTint,
    accent = TOKENS.muralAccent,
    compact = false,
  }) {
    const c = document.createElement("canvas");
    // compact(장면① 긴 본문): 큰 캔버스 + 큰 글씨로 벽면을 채움
    c.width = compact ? 1400 : 1024;
    c.height = compact ? 2400 : 900;
    const g = c.getContext("2d");

    // 돌벽 바탕
    g.fillStyle = tint;
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 80; i++) {
      const px = Math.random() * c.width;
      const py = Math.random() * c.height;
      g.fillStyle = `rgba(90,70,50,${0.03 + Math.random() * 0.06})`;
      g.fillRect(px, py, 4 + Math.random() * 40, 2 + Math.random() * 8);
    }
    // 테두리 액자
    g.strokeStyle = "rgba(40,28,20,0.55)";
    g.lineWidth = compact ? 22 : 18;
    g.strokeRect(28, 28, c.width - 56, c.height - 56);
    g.strokeStyle = "rgba(255,240,220,0.25)";
    g.lineWidth = 6;
    g.strokeRect(44, 44, c.width - 88, c.height - 88);

    // 참조
    g.fillStyle = accent;
    g.font = `bold ${compact ? 60 : 40}px ${MURAL_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.fillText(ref, c.width / 2, compact ? 110 : 100);

    // 구분선
    g.strokeStyle = "rgba(40,28,20,0.45)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(90, compact ? 145 : 125);
    g.lineTo(c.width - 90, compact ? 145 : 125);
    g.stroke();

    const bodySize = compact ? 50 : 36;
    const lineH = compact ? 70 : 56;
    const verseGap = compact ? 42 : 34; // 절 사이 여백
    g.font = `bold ${bodySize}px ${MURAL_FONT}`;
    g.fillStyle = "#120c08";
    g.strokeStyle = "rgba(255,248,236,0.55)";
    g.lineWidth = Math.max(2.5, bodySize * 0.06);
    g.lineJoin = "round";
    let y = compact ? 215 : 185;
    const maxTextW = c.width - (compact ? 100 : 120);
    for (const v of verses) {
      const lines = wrapCanvasLines(g, v, maxTextW);
      for (const ln of lines) {
        if (y > c.height - 70) break;
        // 밝은 외곽선 → 돌벽 위 가독성
        g.strokeText(ln, c.width / 2, y);
        g.fillText(ln, c.width / 2, y);
        y += lineH;
      }
      y += verseGap;
    }

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.scale.set(4.6, compact ? 7.9 : 4.05, 1);
    return mesh;
  }

  /**
   * 구절 벽화 배치
   * atEntrance:true → 맨 바깥(+Z) 벽면. 그 앞(장면 쪽)에 문, 더 안쪽에 장면·우주
   * 순서: 벽면 > 문 > 장면 > 우주
   */
  function addMuralBackdrop(root, panels, {
    wallZ = -9.2,
    wallColor = TOKENS.muralWall,
    tall = false,
    atEntrance = false,
  } = {}) {
    const wallH = tall ? 9.2 : 5.8;
    const wallY = tall ? 4.5 : 2.85;

    if (atEntrance) {
      // 통짜 벽 — 문 뒤(+Z). 문은 별도로 더 안쪽(작은 Z)에 둠
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(20, wallH, 0.5),
        new THREE.MeshStandardMaterial({ color: wallColor, roughness: 1 })
      );
      wall.position.set(0, wallY, wallZ);
      root.add(wall);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(20.5, 0.32, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x9a8068, roughness: 0.95 })
      );
      cap.position.set(0, wallY + wallH / 2, wallZ);
      root.add(cap);

      // 벽화 — 장면 쪽(-Z)을 향해, 문 너머로 읽힘
      const n = panels.length;
      const span = Math.min(15, 5.2 * n);
      panels.forEach((p, i) => {
        const mural = makeScriptureMural(p);
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = -span / 2 + t * span;
        mural.rotation.y = Math.PI;
        if (p.compact || tall) {
          mural.scale.set(11.5, 9.2, 1);
          mural.position.set(x, 4.55, wallZ - 0.32);
        } else {
          mural.scale.set(6.2, 3.9, 1);
          mural.position.set(x, 3.6, wallZ - 0.32);
        }
        root.add(mural);
      });
      return;
    }

    // (구형) 장면 뒤쪽 벽
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(20, wallH, 0.45),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 1 })
    );
    wall.position.set(0, wallY, wallZ - 0.15);
    root.add(wall);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(20.5, 0.32, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x9a8068, roughness: 0.95 })
    );
    cap.position.set(0, wallY + wallH / 2, wallZ);
    root.add(cap);

    const n = panels.length;
    const span = Math.min(15, 5.2 * n);
    panels.forEach((p, i) => {
      const mural = makeScriptureMural(p);
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = -span / 2 + t * span;
      if (p.compact || tall) {
        mural.scale.set(11.5, 9.2, 1);
        mural.position.set(x, 4.55, wallZ + 0.28);
      } else {
        mural.scale.set(6.2, 3.9, 1);
        mural.position.set(x, 3.6, wallZ + 0.28);
      }
      root.add(mural);
    });
  }

  /**
   * ① 도망치다 낙심한 엘리야 + 천사의 돌봄
   * 열왕기상 19:1~8 전반부 (천사 5~7절 포함)
   */
  function makeElijahFlee() {
    const root = new THREE.Group();
    root.visible = false;
    desertFloor(root, TOKENS.islandSand);

    addMuralBackdrop(root, [
      {
        ref: "열왕기상 19:4-8",
        tint: TOKENS.muralTint,
        accent: TOKENS.muralAccent,
        compact: true,
        verses: [
          "4 스스로 광야로 들어가 하룻길쯤 가서 한 로뎀 나무 아래에 앉아서 자기가 죽기를 원하여 이르되 여호와여 넉넉하오니 지금 내 생명을 거두시옵소서 나는 내 조상들보다 낫지 못하니이다 하고",
          "5 로뎀 나무 아래에 누워 자더니 천사가 그를 어루만지며 그에게 이르되 일어나서 먹으라 하는지라",
          "6 본즉 머리맡에 숯불에 구운 떡과 한 병 물이 있더라 이에 먹고 마시고 다시 누웠더니",
          "7 여호와의 천사가 또 다시 와서 어루만지며 이르되 일어나 먹으라 네가 갈 길을 다 가지 못할까 하노라 하는지라",
          "8 이에 일어나 먹고 마시고 그 음식물의 힘을 의지하여 사십 주 사십 야를 가서 하나님의 산 호렙에 이르니라",
        ],
      },
    ], { wallZ: STORY_WALL_Z, wallColor: TOKENS.muralWall, tall: true, atEntrance: true });

    // 로뎀나무 (Retama raetam) — 잎 거의 없는 회녹 가지, 처지는 싸리형 관목
    // 광야의 빈약한 그늘·고난의 상징 (예쁜 활엽수/꽃덤불 X)
    const rotem = new THREE.Group();
    rotem.position.set(-1.85, 0, -2.7);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.95 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x7a8a68, roughness: 0.92 }); // 회녹색 줄기
    const stemDry = new THREE.MeshStandardMaterial({ color: 0x8a9070, roughness: 0.95 });
    // 모래에 박힌 뿌리 기부
    const rootCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.18, 7), woodMat);
    rootCrown.position.y = 0.06;
    rotem.add(rootCrown);
    // 여러 줄기가 기부에서 올라와 바깥·아래로 처짐 (weeping broom)
    const stemCount = 22;
    for (let i = 0; i < stemCount; i++) {
      const ang = (i / stemCount) * Math.PI * 2 + (i % 5) * 0.07;
      const lean = 0.45 + (i % 4) * 0.12; // 많이 기울어 처짐
      const len = 1.35 + (i % 6) * 0.18;
      const thick = 0.012 + (i % 3) * 0.004;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(thick * 0.55, thick, len, 5),
        i % 3 === 0 ? stemDry : stemMat
      );
      // 기부에서 방사 → 위·바깥으로 뻗다 처지는 실루엣
      const baseR = 0.06 + (i % 4) * 0.02;
      stem.position.set(
        Math.cos(ang) * baseR,
        len * 0.38,
        Math.sin(ang) * baseR
      );
      stem.rotation.z = Math.cos(ang) * lean;
      stem.rotation.x = Math.sin(ang) * lean;
      rotem.add(stem);
      // 끝가지 — 더 가늘고 처짐 (잎 없음)
      for (let j = 0; j < 3; j++) {
        const tipLen = 0.28 + (j % 2) * 0.12;
        const tip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.004, thick * 0.5, tipLen, 4),
          stemMat
        );
        const tipAng = ang + (j - 1) * 0.35;
        const tipLean = lean + 0.25 + j * 0.08;
        tip.position.set(
          Math.cos(tipAng) * (0.22 + j * 0.08),
          len * 0.72 + j * 0.06,
          Math.sin(tipAng) * (0.22 + j * 0.08)
        );
        tip.rotation.z = Math.cos(tipAng) * tipLean;
        tip.rotation.x = Math.sin(tipAng) * tipLean + 0.15; // 끝만 더 처짐
        rotem.add(tip);
      }
    }
    // 드문 잔꽃만 (흰 콩꽃 느낌, 화려하지 않게)
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.85 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 4), petalMat);
      fl.scale.set(1.2, 0.5, 0.8);
      fl.position.set(Math.cos(a) * 0.45, 0.85 + (i % 3) * 0.25, Math.sin(a) * 0.45);
      rotem.add(fl);
    }
    // 마른 낙엽/모래 기슭
    for (let i = 0; i < 4; i++) {
      const grit = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + (i % 2) * 0.03, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 1 })
      );
      grit.scale.set(1.4, 0.35, 1.1);
      grit.position.set((i - 1.5) * 0.18, 0.02, 0.15 + (i % 2) * 0.1);
      rotem.add(grit);
    }
    root.add(rotem);

    // 낙심한 엘리야 — 로뎀 그늘 아래 누워 잠듦 (발 +Z / 머리 −Z)
    const elijah = makeCharacterMesh(THREE, 0xc8a888, {
      index: 90,
      showFace: true,
      imageUrl: STORY_FACES.elijah,
    });
    elijah.position.set(-0.35, 0.22, -0.95);
    elijah.rotation.x = -Math.PI / 2;
    elijah.rotation.z = 0.08;
    root.add(elijah);

    // 머리맡: 「숯불에 구운 떡과 한 병 물」(왕상 19:6)
    const headX = 0.55;
    const headZ = -2.05;
    {
      const meal = new THREE.Group();
      meal.position.set(headX + 0.25, 0, headZ);

      // 숯불 자리 — 검은 숯 + 빨간 잔불
      const ash = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.42, 0.06, 10),
        new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 1 })
      );
      ash.position.y = 0.03;
      meal.add(ash);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const coal = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.07, 0.08),
          new THREE.MeshStandardMaterial({
            color: i % 2 ? 0x1a1410 : 0x3a2820,
            roughness: 1,
          })
        );
        coal.position.set(Math.cos(a) * 0.18, 0.08, Math.sin(a) * 0.18);
        coal.rotation.y = a;
        coal.rotation.z = (i % 3) * 0.2;
        meal.add(coal);
      }
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff6020, transparent: true, opacity: 0.75 })
      );
      ember.position.set(0.02, 0.1, -0.02);
      meal.add(ember);
      const ember2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.65 })
      );
      ember2.position.set(-0.1, 0.09, 0.08);
      meal.add(ember2);

      // 구운 떡 — 둥근 납작한 케이크/빵 (숯불 위)
      const cakeCrust = new THREE.MeshStandardMaterial({
        color: 0xb86830,
        roughness: 0.88,
      });
      const cakeTop = new THREE.MeshStandardMaterial({
        color: 0xd4a048,
        roughness: 0.72,
      });
      const cake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.1, 12),
        cakeCrust
      );
      cake.position.set(0.05, 0.2, 0.05);
      meal.add(cake);
      const cakeFace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12),
        cakeTop
      );
      cakeFace.position.set(0.05, 0.26, 0.05);
      meal.add(cakeFace);
      // 구운 표면 얼룩
      for (let i = 0; i < 4; i++) {
        const spot = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 5, 4),
          new THREE.MeshStandardMaterial({ color: 0x8a4820, roughness: 1 })
        );
        const a = (i / 4) * Math.PI * 2 + 0.3;
        spot.position.set(0.05 + Math.cos(a) * 0.1, 0.27, 0.05 + Math.sin(a) * 0.1);
        spot.scale.set(1, 0.35, 1);
        meal.add(spot);
      }

      // 한 병 물 — 숯·떡 왼쪽(엘리야 머리 쪽), 천사와 안 겹치게
      const bottle = new THREE.Group();
      bottle.position.set(-0.42, 0, 0.22);
      const clay = new THREE.MeshStandardMaterial({
        color: 0xc4a078,
        roughness: 0.8,
      });
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.38, 10),
        clay
      );
      body.position.y = 0.22;
      bottle.add(body);
      const shoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        clay
      );
      shoulder.scale.set(1, 0.55, 1);
      shoulder.position.y = 0.42;
      bottle.add(shoulder);
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.06, 0.14, 8),
        clay
      );
      neck.position.y = 0.52;
      bottle.add(neck);
      const lip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.05, 0.04, 8),
        clay
      );
      lip.position.y = 0.6;
      bottle.add(lip);
      // 병 속 물 (살짝 비치는 하늘색)
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.1, 0.28, 10),
        new THREE.MeshStandardMaterial({
          color: 0x6ec8e8,
          roughness: 0.25,
          metalness: 0.05,
          transparent: true,
          opacity: 0.72,
        })
      );
      water.position.y = 0.2;
      bottle.add(water);
      const cork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.045, 0.06, 6),
        new THREE.MeshStandardMaterial({ color: 0x8a6840, roughness: 0.9 })
      );
      cork.position.y = 0.65;
      bottle.add(cork);
      meal.add(bottle);

      root.add(meal);
    }

    // 천사 — 머리맡 오른쪽 (사람 형상). 떡·물과 간격 확보
    const angelX = 2.25;
    const angelZ = -1.85;
    const angel = makeCharacterMesh(THREE, 0xffe8a0, {
      index: 91,
      showFace: true,
      imageUrl: STORY_FACES.angel,
    });
    angel.position.set(angelX, 0, angelZ);
    angel.rotation.y = -0.95; // 누운 얼굴을 내려다보게
    angel.scale.setScalar(1.05);
    root.add(angel);

    // 멀리 위협 느낌 (어두운 바위)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a7868, roughness: 0.95 });
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), rockMat);
      r.position.set(-4 + i * 0.8, 0.4, 2 + i * 0.5);
      root.add(r);
    }

    addScenePoint(root, "하나님은 다그치지 않으시고 먼저 위로하세요", 3.7, -0.5);

    const exitPortal = addStoryExit(root, STORY_DOOR_Z);
    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: STORY_SPAWN_Z },
      faceYaw: 0, // +Z 벽면(말씀)을 먼저 봄
      exitPortal,
      title: "① 도망·낙심과 천사의 돌봄",
    };
  }

  /**
   * ② 호렙산의 바람·지진·불
   * 열왕기상 19:8 후반~12 전반
   */
  function makeElijahHoreb() {
    const root = new THREE.Group();
    root.visible = false;
    desertFloor(root, TOKENS.islandSand);

    addMuralBackdrop(root, [
      {
        ref: "열왕기상 19:11-12",
        tint: TOKENS.muralTint,
        accent: TOKENS.muralAccent,
        verses: [
          "여호와께서 지나가시는데",
          "크고 강한 바람이 산을 가르고 바위를 부수나",
          "바람 가운데에 여호와께서 계시지 아니하며",
          "바람 후에 지진이 있으나 지진 가운데에도 계시지 아니하며",
          "지진 후에 불이 있으나 불 가운데에도 계시지 아니하더니",
          "불 후에 세미한 소리가 있는지라",
        ],
      },
    ], { wallZ: STORY_WALL_Z, wallColor: TOKENS.muralWall, atEntrance: true });

    // 호렙산
    const mount = new THREE.Mesh(
      new THREE.ConeGeometry(7, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 1 })
    );
    mount.position.set(0, -1.0, -3);
    root.add(mount);
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x786858, roughness: 1 })
    );
    peak.position.set(0, 1.2, -3.5);
    root.add(peak);

    const elijah = makeCharacterMesh(THREE, 0xc8a888, {
      index: 92,
      showFace: true,
      imageUrl: STORY_FACES.elijah,
    });
    // 갈라진 발판 왼쪽 위에 서 있음
    elijah.position.set(-1.1, 0.42, 0.4);
    elijah.rotation.y = 0.55;
    root.add(elijah);

    // —— 강풍: 더 왼쪽에서, 더 크게
    const windGroup = new THREE.Group();
    windGroup.position.set(-5.5, 0, -0.8);
    windGroup.scale.set(1.35, 1.25, 1.2);
    const windMat = new THREE.MeshBasicMaterial({
      color: 0xd8ecf8,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let i = 0; i < 11; i++) {
      const streak = new THREE.Mesh(
        new THREE.PlaneGeometry(5.5 + (i % 4) * 0.8, 0.16 + (i % 2) * 0.08),
        windMat
      );
      streak.position.set((i % 4) * 0.45, 0.5 + i * 0.32, (i - 5) * 0.35);
      streak.rotation.y = -0.5;
      streak.rotation.z = -0.1 + (i % 3) * 0.04;
      windGroup.add(streak);
    }
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x8a7868, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.45), debrisMat);
      bit.position.set(1.5 + i * 0.55, 0.4 + (i % 3) * 0.45, -1.2 + (i % 4) * 0.5);
      bit.rotation.set(0.3, 0.5, 0.9 + i * 0.15);
      windGroup.add(bit);
    }
    const leanRock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 0), debrisMat);
    leanRock.position.set(0.4, 0.7, 0.8);
    leanRock.rotation.z = -0.85;
    windGroup.add(leanRock);
    root.add(windGroup);
    const windTag = labelChip("강풍");
    windTag.position.set(-5.2, 4.0, -0.5);
    root.add(windTag);

    // —— 지진: 딛고 있는 섬 발판 자체가 갈라짐 (중앙 플레이 바닥)
    const quakeGroup = new THREE.Group();
    quakeGroup.position.set(0, 0.02, 0.3);
    const crustMat = new THREE.MeshStandardMaterial({ color: TOKENS.islandSand, roughness: 0.92 });
    const darkCrack = new THREE.MeshStandardMaterial({ color: 0x1a140e, roughness: 1 });
    // 깊은 틈 — 발판을 좌우로 가름
    const gap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 7.5), darkCrack);
    gap.position.set(0.15, -0.12, 0.2);
    quakeGroup.add(gap);
    // 왼쪽 발판 (엘리야가 서는 쪽) — 위로·바깥으로 들림
    const leftSlab = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.28, 6.8), crustMat);
    leftSlab.position.set(-2.75, 0.22, 0.15);
    leftSlab.rotation.z = 0.14;
    leftSlab.rotation.x = -0.04;
    quakeGroup.add(leftSlab);
    // 오른쪽 발판 — 반대쪽으로 들림
    const rightSlab = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.28, 6.8), crustMat);
    rightSlab.position.set(2.9, 0.16, 0.05);
    rightSlab.rotation.z = -0.18;
    rightSlab.rotation.x = 0.05;
    quakeGroup.add(rightSlab);
    // 틈 가장자리 들쭉날쭉한 바위
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x5a4838, roughness: 1 });
    for (let i = 0; i < 7; i++) {
      const cliff = new THREE.Mesh(
        new THREE.BoxGeometry(0.4 + (i % 2) * 0.25, 0.85 + (i % 3) * 0.4, 0.7),
        cliffMat
      );
      cliff.position.set(-0.55, 0.4 + (i % 2) * 0.2, -2.4 + i * 0.85);
      cliff.rotation.z = 0.2;
      quakeGroup.add(cliff);
      const cliffR = cliff.clone();
      cliffR.position.x = 0.7;
      cliffR.rotation.z = -0.25;
      quakeGroup.add(cliffR);
    }
    root.add(quakeGroup);
    const quakeTag = labelChip("지진");
    quakeTag.position.set(0.2, 2.4, 3.2);
    root.add(quakeTag);

    // —— 불: 더 오른쪽, 더 크게
    const fireGroup = new THREE.Group();
    fireGroup.position.set(5.2, 0, -1.5);
    fireGroup.scale.set(1.45, 1.4, 1.3);
    const scorched = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.1, 5.0),
      new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 1 })
    );
    scorched.position.set(0, 0.05, 0.5);
    fireGroup.add(scorched);
    const wallColors = [
      { c: 0xff6020, o: 0.55, h: 4.2, w: 1.8 },
      { c: 0xff9030, o: 0.48, h: 5.2, w: 1.5 },
      { c: 0xffc050, o: 0.38, h: 3.6, w: 1.3 },
      { c: 0xff4820, o: 0.45, h: 4.8, w: 1.6 },
      { c: 0xffa040, o: 0.32, h: 3.2, w: 1.2 },
    ];
    wallColors.forEach((f, i) => {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(f.w, f.h),
        new THREE.MeshBasicMaterial({
          color: f.c,
          transparent: true,
          opacity: f.o,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      wall.position.set((i - 2) * 0.65, f.h * 0.42, (i % 2) * 0.35 - 0.5);
      wall.rotation.y = -0.4 + i * 0.06;
      fireGroup.add(wall);
    });
    for (let i = 0; i < 4; i++) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.45 - i * 0.05, 3.4 + i * 0.7, 6),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xff7030 : 0xffe080,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
        })
      );
      pillar.position.set(-0.5 + i * 0.55, 2.0 + i * 0.15, -0.7);
      fireGroup.add(pillar);
    }
    const haze = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff8030, transparent: true, opacity: 0.24, depthWrite: false })
    );
    haze.position.set(0.3, 3.0, -0.4);
    fireGroup.add(haze);
    root.add(fireGroup);
    const fireTag = labelChip("불");
    fireTag.position.set(5.4, 5.2, -1.2);
    root.add(fireTag);

    addScenePoint(root, "크고 화려한 곳에만 하나님이 계신 건 아니에요", 3.8, -0.5);

    const exitPortal = addStoryExit(root, STORY_DOOR_Z);
    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: STORY_SPAWN_Z },
      faceYaw: 0,
      exitPortal,
      title: "② 호렙산의 바람·지진·불",
    };
  }

  /**
   * ③ 세미한 음성과 새로운 사명
   * 열왕기상 19:12 후반~16 — 엘리야가 굴 어귀에 서서 (19:13)
   */
  function makeElijahWhisper() {
    const root = new THREE.Group();
    root.visible = false;
    // 우주/행성 없음 — 호렙 산·굴
    desertFloor(root, 0x9a8a78, 14, { cosmos: false });

    addMuralBackdrop(root, [
      {
        ref: "열왕기상 19:12-13, 15-16",
        tint: TOKENS.muralTint,
        accent: TOKENS.muralAccent,
        verses: [
          "불 후에 세미한 소리가 있는지라",
          "엘리야가 듣고 겉옷으로 얼굴을 가리고",
          "나가 굴 어귀에 서매",
          "소리가 그에게 임하여 이르시되",
          "엘리야야 네가 어찌하여 여기 있느냐",
          "너는 네 길을 돌이켜…",
        ],
      },
    ], { wallZ: STORY_WALL_Z, wallColor: 0x6a6058, atEntrance: true });

    // —— 호렙 산 바위 + 큰 굴 (어귀는 +Z, 세 사명을 향함)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a6054, roughness: 1 });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x2a2420,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    // 산 덩어리 (굴 뒤·옆)
    const mountL = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 0), rockMat);
    mountL.position.set(-4.2, 1.2, -5.8);
    mountL.scale.set(1.4, 1.8, 1.2);
    root.add(mountL);
    const mountR = new THREE.Mesh(new THREE.IcosahedronGeometry(3.0, 0), rockMat);
    mountR.position.set(4.2, 1.0, -5.6);
    mountR.scale.set(1.3, 1.6, 1.2);
    root.add(mountR);
    const mountBack = new THREE.Mesh(new THREE.ConeGeometry(6.5, 5.5, 7), rockMat);
    mountBack.position.set(0, 1.5, -8.2);
    root.add(mountBack);

    // 굴 내부 — 반구 어귀가 +Z(하사엘·예후·엘리사)를 향함
    const caveInner = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      darkMat
    );
    caveInner.position.set(0, 1.45, -5.15);
    caveInner.rotation.x = -Math.PI / 2; // 열린 면이 +Z
    root.add(caveInner);
    // 굴 어귀 아치 (XY 평면 = Z축으로 뚫린 입구)
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.4, 8, 22, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.95 })
    );
    mouth.position.set(0, 0.12, -3.45);
    root.add(mouth);
    // 어귀 옆 바위 턱
    [-1, 1].forEach((side) => {
      const jamb = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 2.6, 1.1),
        rockMat
      );
      jamb.position.set(side * 2.15, 1.2, -3.7);
      root.add(jamb);
    });
    // 굴 바닥 돌판
    const caveFloorMesh = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: 1 })
    );
    caveFloorMesh.rotation.x = -Math.PI / 2;
    caveFloorMesh.position.set(0, 0.03, -4.4);
    root.add(caveFloorMesh);

    // 엘리야 — 겉옷으로 얼굴 가리고 굴 어귀에 서서 (19:13)
    const elijah = makeCharacterMesh(THREE, 0xc8a888, {
      index: 93,
      showFace: true,
      imageUrl: STORY_FACES.elijah,
    });
    elijah.position.set(0, 0.22, -2.7);
    elijah.rotation.y = 0; // 바깥(세 사명)을 향함
    root.add(elijah);
    const cloak = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.7, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 })
    );
    cloak.position.set(0, 1.25, -2.5);
    root.add(cloak);

    // 세미한 소리 — 굴 어귀 앞, 형체 없는 은은한 빛
    const whisper = new THREE.Group();
    whisper.position.set(0, 1.9, -1.5);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfff4d0,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 + i * 0.4, 0.03, 6, 28), ringMat.clone());
      ring.material.opacity = 0.38 - i * 0.06;
      ring.rotation.x = Math.PI / 2;
      ring.position.y = i * 0.06;
      whisper.add(ring);
    }
    const soft = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xfff8e8,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        fog: false,
      })
    );
    soft.position.y = 0.2;
    whisper.add(soft);
    const whisperTag = labelChip("세미한 소리");
    whisperTag.position.set(0, 1.35, 0);
    whisper.add(whisperTag);
    root.add(whisper);

    // 새 사명 — 세 갈래가 다르게 보이게
    function makeMissionPlinth(x, z, color) {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.62, 0.22, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
      );
      stone.position.set(x, 0.11, z);
      root.add(stone);
    }

    // 하사엘 — 이방 아람의 왕, 심판의 도구 (왕관·창)
    {
      const x = -3.4;
      const z = 1.6;
      makeMissionPlinth(x, z, 0x4a6070);
      const haz = makeCharacterMesh(THREE, 0x5a7888, {
        index: 94,
        showFace: true,
        imageUrl: STORY_FACES.hazael,
      });
      haz.position.set(x, 0.22, z);
      haz.rotation.y = 0.35;
      root.add(haz);
      const cloak = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.9, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x3a5060, roughness: 0.85 })
      );
      cloak.position.set(x, 0.85, z - 0.18);
      root.add(cloak);
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.12, 8),
        new THREE.MeshStandardMaterial({ color: 0xd4a848, roughness: 0.45, metalness: 0.35 })
      );
      crown.position.set(x, 1.55, z);
      root.add(crown);
      const spear = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5),
        new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.6 })
      );
      spear.position.set(x + 0.35, 0.95, z + 0.1);
      spear.rotation.z = -0.15;
      root.add(spear);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.18, 5),
        new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.4, roughness: 0.4 })
      );
      tip.position.set(x + 0.42, 1.7, z + 0.1);
      root.add(tip);
      const n1 = labelChip("하사엘");
      n1.position.set(x, 2.15, z);
      root.add(n1);
      const n2 = labelChip("아람의 왕");
      n2.position.set(x, 1.75, z + 0.15);
      root.add(n2);
    }

    // 예후 — 이스라엘의 왕, 개혁·공의 (투구·방패)
    {
      const x = 0;
      const z = 1.85;
      makeMissionPlinth(x, z, 0x8a4038);
      const jehu = makeCharacterMesh(THREE, 0xb05040, {
        index: 95,
        showFace: true,
        imageUrl: STORY_FACES.jehu,
      });
      jehu.position.set(x, 0.22, z);
      jehu.rotation.y = 0;
      root.add(jehu);
      const armor = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.55, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x7a3830, roughness: 0.7, metalness: 0.25 })
      );
      armor.position.set(x, 0.75, z);
      root.add(armor);
      const helm = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.65, metalness: 0.3 })
      );
      helm.scale.set(1, 0.7, 1.1);
      helm.position.set(x, 1.42, z);
      root.add(helm);
      const shield = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: 0xc87840, roughness: 0.55, metalness: 0.2 })
      );
      shield.rotation.x = Math.PI / 2;
      shield.rotation.y = 0.4;
      shield.position.set(x - 0.4, 0.85, z + 0.15);
      root.add(shield);
      const n1 = labelChip("예후");
      n1.position.set(x, 2.2, z);
      root.add(n1);
      const n2 = labelChip("이스라엘의 왕");
      n2.position.set(x, 1.8, z + 0.15);
      root.add(n2);
    }

    // 엘리사 — 후계자·위로 (쟁기·겉옷)
    {
      const x = 3.4;
      const z = 1.6;
      makeMissionPlinth(x, z, 0x5a8848);
      const elisha = makeCharacterMesh(THREE, 0x88a868, {
        index: 96,
        showFace: true,
        imageUrl: STORY_FACES.elisha,
      });
      elisha.position.set(x, 0.22, z);
      elisha.rotation.y = -0.35;
      root.add(elisha);
      // 소박한 겉옷(망토) — 후계의 표식
      const mantle = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.85, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x6a5840, roughness: 0.9 })
      );
      mantle.position.set(x, 0.9, z - 0.2);
      mantle.rotation.x = -0.15;
      root.add(mantle);
      // 쟁기 (밭을 갈던 중 부름)
      const plowBeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x8a6840, roughness: 0.85 })
      );
      plowBeam.position.set(x + 0.55, 0.25, z + 0.2);
      plowBeam.rotation.y = 0.5;
      root.add(plowBeam);
      const plowBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.08, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.5, metalness: 0.35 })
      );
      plowBlade.position.set(x + 0.85, 0.12, z + 0.45);
      plowBlade.rotation.y = 0.5;
      root.add(plowBlade);
      const n1 = labelChip("엘리사");
      n1.position.set(x, 2.15, z);
      root.add(n1);
      const n2 = labelChip("후계자");
      n2.position.set(x, 1.75, z + 0.15);
      root.add(n2);
    }

    addScenePoint(root, "조용한 음성으로 다시 일으켜 세우세요", 3.9, -0.2);

    const exitPortal = addStoryExit(root, STORY_DOOR_Z);
    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: STORY_SPAWN_Z },
      faceYaw: 0,
      exitPortal,
      title: "③ 세미한 음성과 새 사명",
    };
  }

  /** 말씀 허브 — 한 장면·한 초점: 세 문만 */
  function makeElijahHub() {
    const root = new THREE.Group();
    root.visible = false;
    // 따뜻한 섬 + 우주 (회색 돌밭 느낌 줄임)
    desertFloor(root, TOKENS.islandSand, 13.5);

    // 뒤쪽 배경벽 — 읽기 거리 확보
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(16, 4.6, 0.35),
      new THREE.MeshStandardMaterial({ color: TOKENS.muralWall, roughness: 0.95 })
    );
    backWall.position.set(0, 2.2, -8.0);
    root.add(backWall);
    const mural = makeScriptureMural({
      ref: "열왕기상 19:12",
      tint: TOKENS.muralTint,
      accent: TOKENS.muralAccent,
      verses: ["또 불 후에 세미한 소리가 있는지라"],
    });
    mural.scale.set(6.0, 3.6, 1);
    mural.position.set(0, 2.35, -7.75);
    root.add(mural);

    // 타이틀 — 한 줄만
    const t1 = labelTitle("하나님께 실패한 엘리야");
    t1.position.set(0, 4.75, -7.2);
    root.add(t1);

    // 중앙: 낮은 단상 (시편은 마을 문 위에만)
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.85, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: TOKENS.islandRim, roughness: 0.9 })
    );
    plinth.position.set(0, 0.14, 0.8);
    root.add(plinth);

    // 세 문 — 반원 배치, 라벨은 문 위 제목만
    const chapters = [
      { id: "elijah_flee", title: "① 낙심과 천사", x: -4.8, z: -3.6, color: 0xc87860 },
      { id: "elijah_horeb", title: "② 호렙 바람·불", x: 0, z: -4.8, color: 0xe07038 },
      { id: "elijah_whisper", title: "③ 세미한 음성", x: 4.8, z: -3.6, color: 0xe8c050 },
    ];
    const innerPortals = [];
    for (const ch of chapters) {
      const arch = makeStoryGate(ch.x, ch.z, ch.id, ch.title, ch.color, { showTip: false });
      arch.position.set(ch.x, 0, ch.z);
      // 살짝 중앙을 향하게
      arch.rotation.y = Math.atan2(-ch.x, -ch.z) * 0.35;
      root.add(arch);
      const fx = Math.sin(arch.rotation.y) * 1.1;
      const fz = Math.cos(arch.rotation.y) * 1.1;
      innerPortals.push({
        x: ch.x + fx,
        z: ch.z + fz,
        r: 1.35,
        to: ch.id,
        label: ch.title,
      });
    }

    // 출구 — 남쪽, 소박한 문만
    const exitDoor = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.7, 0.12),
      new THREE.MeshStandardMaterial({ color: TOKENS.exitDoor, roughness: 0.85 })
    );
    exitDoor.position.set(0, 0.85, 9.2);
    root.add(exitDoor);
    const exitFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.12, 0.16),
      new THREE.MeshStandardMaterial({ color: TOKENS.houseDoor })
    );
    exitFrame.position.set(0, 1.75, 9.2);
    root.add(exitFrame);
    const leave = labelChip("마을로");
    leave.position.set(0, 2.15, 8.95);
    root.add(leave);

    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: 3.2 },
      exitPortal: { x: 0, z: 8.95, r: 1.4, to: "overworld", outPos: null },
      innerPortals,
      title: "하나님께 실패한 엘리야",
      chapters,
    };
  }

  function makeStoryGate(x, z, sceneId, title, color, opts = {}) {
    const showTip = opts.showTip === true;
    const showChip = opts.showChip !== false && title;
    const g = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: TOKENS.gatePillar, roughness: 0.88 });
    [-1.05, 1.05].forEach((ox) => {
      const p = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.5, 0.32), pillarMat), true);
      p.position.set(ox, 1.25, 0);
      g.add(p);
    });
    const lintel = shadowify(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 0.38), pillarMat), true);
    lintel.position.set(0, 2.55, 0);
    g.add(lintel);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.9),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    cloth.position.set(0, 1.25, 0.04);
    g.add(cloth);
    if (showChip) {
      const tag = labelChip(title);
      tag.position.set(0, 3.05, 0);
      g.add(tag);
    }
    if (opts.overheadTitle) {
      const t = labelTitle(opts.overheadTitle);
      t.position.set(0, opts.overheadPlaque ? 3.85 : 3.35, 0.15);
      g.add(t);
    }
    if (opts.overheadPlaque) {
      const p = labelPlaque(opts.overheadPlaque);
      p.position.set(0, 3.15, 0.15);
      g.add(p);
    }
    if (showTip) {
      const tip = labelChip("들어가기");
      tip.position.set(0, 0.32, 0.75);
      g.add(tip);
    }
    g.position.set(x, 0, z);
    return g;
  }

  // ----- 아이들 집: 흩어진 마을 배치 (일렬 X) -----
  const outdoorHouses = [];
  SUNDAY_KIDS.forEach((kid) => {
    const h = kid.house;
    const cottage = makeCottage(kid);
    const rotY = h.rotY || 0;
    const radius = 2.0;
    const front = doorOffset(rotY, 1.85);
    const exit = doorOffset(rotY, 2.55);
    const npc = doorOffset(rotY, 2.8);
    const side = doorOffset(rotY + Math.PI * 0.5, 1.15);

    outdoorHouses.push({
      mesh: cottage,
      x: h.x,
      z: h.z,
      radius,
      kid,
      npcX: h.x + npc.x + side.x * 0.35,
      npcZ: h.z + npc.z + side.z * 0.35,
    });

    const sceneId = `house_${kid.id}`;
    const interior = makeHouseInterior(kid);
    interior.exitPortal.outPos = { x: h.x + exit.x, z: h.z + exit.z };
    sceneBags.set(sceneId, {
      id: sceneId,
      kind: "house",
      root: interior.root,
      spawn: interior.spawn,
      exitPortal: interior.exitPortal,
      title: `${kid.name}의 집`,
    });

    portals.push({
      x: h.x + front.x,
      z: h.z + front.z,
      r: 1.2,
      to: sceneId,
      label: `${kid.name}의 집`,
      overworldOnly: true,
    });
  });

  // ----- 엘리야 말씀: 바깥 문 1개 → 허브 → 안쪽 장면 -----
  const gateX = 0;
  const gateZ = 22;
  // 마을 쪽(남쪽) 앞에 배치 — 문 충돌에 가려지지 않게
  portals.push({
    x: gateX,
    z: gateZ - 1.6,
    r: 2.4,
    to: "elijah_hub",
    label: "하나님께 실패한 엘리야",
    overworldOnly: true,
  });

  const hub = makeElijahHub();
  hub.exitPortal.outPos = { x: gateX, z: gateZ - 2.4 };
  sceneBags.set("elijah_hub", {
    id: "elijah_hub",
    kind: "story_hub",
    root: hub.root,
    spawn: hub.spawn,
    exitPortal: hub.exitPortal,
    innerPortals: hub.innerPortals,
    title: hub.title,
  });

  const storyGates = [];
  const mainGate = makeStoryGate(gateX, gateZ, "elijah_hub", null, 0xe8b060, {
    showChip: false,
    overheadTitle: "하나님께 실패한 엘리야",
    overheadPlaque: MEMORY_VERSE.short,
  });
  storyGates.push({ mesh: mainGate, x: gateX, z: gateZ, noCollide: true });

  const chapterBuilds = [
    { id: "elijah_flee", build: makeElijahFlee, hubPos: { x: -4.8, z: -3.2 } },
    { id: "elijah_horeb", build: makeElijahHoreb, hubPos: { x: 0, z: -4.3 } },
    { id: "elijah_whisper", build: makeElijahWhisper, hubPos: { x: 4.8, z: -3.2 } },
  ];
  for (const d of chapterBuilds) {
    const bag = d.build();
    bag.exitPortal.outPos = d.hubPos;
    bag.exitPortal.to = "elijah_hub";
    sceneBags.set(d.id, {
      id: d.id,
      kind: "story",
      root: bag.root,
      spawn: bag.spawn,
      faceYaw: bag.faceYaw ?? 0,
      exitPortal: bag.exitPortal,
      title: bag.title,
    });
  }

  // 문 앞 떠다니는 중복 보드 제거 — 제목·시편은 문 위에만
  const board = new THREE.Group();

  return {
    SUNDAY_KIDS,
    outdoorHouses,
    storyGates,
    board,
    portals,
    sceneBags,
  };
}
