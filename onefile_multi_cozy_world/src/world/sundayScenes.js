/**
 * 주일학교 마을 — Seabeard식 장면(집·말씀 씬) 정의/빌드
 * sceneId: overworld | house_* | elijah_*
 */

/** 남아 1 · 여아 5 — 부피(크기)는 동일, style로 구조·디자인만 다름 */
export const SUNDAY_KIDS = [
  {
    id: "woojin", name: "우진", gender: "boy",
    color: 0x3890d0, roof: 0x2868b8, accent: 0x58b0e8,
    house: { x: -17, z: -5, rotY: 0.45, style: "classic" },
  },
  {
    id: "gahyun", name: "가현", gender: "girl",
    color: 0xe05078, roof: 0xc03050, accent: 0xf07898,
    house: { x: -11, z: -15, rotY: -0.55, style: "dormer" },
  },
  {
    id: "youngsun", name: "영선", gender: "girl",
    color: 0xc050d8, roof: 0x9030b0, accent: 0xd880f0,
    house: { x: -2, z: -10, rotY: 0.15, style: "porch" },
  },
  {
    id: "taemi", name: "태미", gender: "girl",
    color: 0x68b040, roof: 0x388028, accent: 0x88d058,
    house: { x: 6, z: -17, rotY: -0.7, style: "bay" },
  },
  {
    id: "nammun", name: "남문", gender: "girl",
    color: 0xe88830, roof: 0xc05818, accent: 0xf0b050,
    house: { x: 14, z: -8, rotY: 0.9, style: "turret" },
  },
  {
    id: "jongmyo", name: "종묘", gender: "girl",
    color: 0xd86090, roof: 0xb03060, accent: 0xf080b0,
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

  function labelSprite(text, color = "#5a4a42", opts = {}) {
    const fontSize = opts.fontSize || 28;
    const padX = 22;
    const padY = 16;
    const maxW = opts.maxWidth || 560;
    const lineH = fontSize * 1.38;

    const measure = document.createElement("canvas").getContext("2d");
    measure.font = `bold ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;

    // 한글 포함 — 글자 단위로 줄바꿈
    const lines = [];
    let cur = "";
    for (const ch of String(text)) {
      const next = cur + ch;
      if (measure.measureText(next).width > maxW - padX * 2 && cur) {
        lines.push(cur);
        cur = ch;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    if (!lines.length) lines.push(" ");

    const textW = Math.max(...lines.map((ln) => measure.measureText(ln).width), 40);
    const c = document.createElement("canvas");
    c.width = Math.ceil(Math.min(maxW, textW + padX * 2));
    c.height = Math.ceil(lines.length * lineH + padY * 2);
    const g = c.getContext("2d");
    g.fillStyle = "rgba(255,248,240,0.94)";
    const rr = 12;
    // 둥근 배경
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

    g.fillStyle = color;
    g.font = `bold ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    lines.forEach((ln, i) => {
      g.fillText(ln, w / 2, padY + lineH * (i + 0.5));
    });

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    const worldH = opts.height ?? Math.min(0.85, 0.38 + lines.length * 0.22);
    const aspect = c.width / Math.max(1, c.height);
    spr.scale.set(worldH * aspect, worldH, 1);
    return spr;
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

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0d8b8, roughness: 0.88 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xc09058, roughness: 0.88 });
    const roofMat = new THREE.MeshStandardMaterial({ color: kid.roof, roughness: 0.8 });
    const winMat = new THREE.MeshStandardMaterial({ color: kid.accent });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xa86830 });

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
      const chimney = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.32), new THREE.MeshStandardMaterial({ color: 0xd09070 })));
      chimney.position.set(bw * 0.32, bh + roofH * 0.55, -bd * 0.1);
      g.add(chimney);
    }
    if (style === "classic") {
      const chimney2 = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.28), new THREE.MeshStandardMaterial({ color: 0xd09070 })));
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
    const enterHint = labelSprite("들어가기 · E", "#5a4a42", { height: 0.38 });
    enterHint.position.set(0, oDoorH + 0.55, doorFaceZ + 0.15);
    g.add(enterHint);

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

    const nameTag = labelSprite(`${kid.name}의 집`);
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

    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd8b898, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 8), floorMat);
    floor.position.y = -0.06;
    root.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: kid.accent, roughness: 0.95 });
    const wallH = 2.6;
    const roomHalf = 3.9;
    const doorW = 1.15;
    const doorH = 1.85;
    // 앞쪽(+Z) 벽은 문 구멍 남기고 좌·우·상단만
    const walls = [
      [0, wallH / 2, -roomHalf, 8, wallH, 0.2], // 뒷벽
      [-roomHalf, wallH / 2, 0, 0.2, wallH, 8], // 왼
      [roomHalf, wallH / 2, 0, 0.2, wallH, 8], // 오른
    ];
    for (const [wx, wy, wz, sx, sy, sz] of walls) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
      w.position.set(wx, wy, wz);
      root.add(w);
    }
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

    // 창문 빛
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.55 })
    );
    glow.position.set(0, 1.5, -roomHalf + 0.11);
    root.add(glow);

    const title = labelSprite(`${kid.name}의 방`);
    title.position.set(0, 2.9, 0);
    root.add(title);

    // 출구 문 — E 포털과 같은 위치
    const doorZ = roomHalf - 0.06;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6038, roughness: 0.85 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xa86830, roughness: 0.8 });
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

    const hint = labelSprite("나가기 · E", "#5a4a42", { height: 0.42 });
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

  /** 엘리야 장면 공통 바닥 */
  function desertFloor(root, color = 0xd8c0a0) {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 24),
      new THREE.MeshStandardMaterial({ color, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);
  }

  function addStoryExit(root, z = 8) {
    const exitDoor = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.55, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xa86830 })
    );
    exitDoor.position.set(0, 0.78, z);
    root.add(exitDoor);
    const leave = labelSprite("이야기로 · E", "#5a4a42", { height: 0.42 });
    leave.position.set(0, 1.95, z - 0.5);
    root.add(leave);
    return { x: 0, z: z - 0.25, r: 1.35, to: "elijah_hub", outPos: null };
  }

  function addVerseLabels(root, lines, y0 = 3.4, z = -1) {
    lines.forEach((ln, i) => {
      const spr = labelSprite(ln, "#5a4a42", { height: i === 0 ? 0.68 : 0.52, maxWidth: 620 });
      spr.position.set(0, y0 - i * 0.62, z);
      root.add(spr);
    });
  }

  /** 외울말씀 시편 62:8 */
  const MEMORY_VERSE = {
    ref: "외울말씀 시편 62:8",
    text: "백성들아 시시로 그를 의지하고 그의 앞에 마음을 토하라 하나님은 우리의 피난처시로다.",
  };

  function addMemoryVerse(root, { x = 0, y = 1.4, z = 5.5, height = 0.48 } = {}) {
    const ref = labelSprite(MEMORY_VERSE.ref, "#6a4838", { height: height * 0.85, maxWidth: 480 });
    ref.position.set(x, y + 0.55, z);
    root.add(ref);
    const body = labelSprite(MEMORY_VERSE.text, "#4a3830", { height, maxWidth: 640, fontSize: 24 });
    body.position.set(x, y, z);
    root.add(body);
  }

  /**
   * ① 도망치다 낙심한 엘리야 + 천사의 돌봄
   * 열왕기상 19:1~8 전반부 (천사 5~7절 포함)
   */
  function makeElijahFlee() {
    const root = new THREE.Group();
    root.visible = false;
    desertFloor(root, 0xc8a878);

    // 로뎀나무 (빗자루 덤불)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6840, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x589840, roughness: 0.85 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6), trunkMat);
    trunk.position.set(-0.8, 0.8, -2.0);
    root.add(trunk);
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + (i % 2) * 0.15, 0), leafMat);
      leaf.position.set(-0.8 + (i - 1.5) * 0.35, 1.7 + (i % 2) * 0.25, -2.0 + (i % 3) * 0.15);
      root.add(leaf);
    }

    // 낙심한 엘리야 (나무 아래)
    const elijah = makeCharacterMesh(THREE, 0xc8a888, { index: 90, showFace: true });
    elijah.position.set(-0.2, 0, -1.5);
    elijah.rotation.y = -0.5;
    elijah.rotation.x = 0.15; // 살짝 숙인 느낌
    root.add(elijah);

    // 숯불
    const coals = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a2820, roughness: 1 })
    );
    coals.position.set(1.0, 0.06, -1.2);
    root.add(coals);
    const fireGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff8030, transparent: true, opacity: 0.7 })
    );
    fireGlow.position.set(1.0, 0.28, -1.2);
    root.add(fireGlow);

    // 천사 + 떡·물
    const angel = makeCharacterMesh(THREE, 0xffe8a0, { index: 91, showFace: true });
    angel.position.set(1.4, 0, -0.6);
    angel.scale.setScalar(1.08);
    root.add(angel);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.8 });
    [-1, 1].forEach((s) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), wingMat);
      wing.scale.set(0.35, 1.1, 0.7);
      wing.position.set(1.4 + s * 0.55, 1.1, -0.6);
      root.add(wing);
    });
    const bread = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xd89840 })
    );
    bread.position.set(0.85, 0.18, -0.85);
    root.add(bread);
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.32, 8),
      new THREE.MeshStandardMaterial({ color: 0x48a8c8 })
    );
    jar.position.set(1.2, 0.2, -0.9);
    root.add(jar);

    // 멀리 위협 느낌 (어두운 바위)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a7868, roughness: 0.95 });
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), rockMat);
      r.position.set(-4 + i * 0.8, 0.4, 2 + i * 0.5);
      root.add(r);
    }

    addVerseLabels(root, [
      "① 도망치다 낙심한 엘리야",
      "열왕기상 19:1~8 전반 · 로뎀나무 아래",
      "「차라리 제 목숨을 거두어 주세요」",
      "천사: 숯불 떡과 물 · 「갈 길이 너무 멀다」",
      "포인트: 하나님은 다그치지 않으시고 먼저 위로하세요",
    ], 4.0, 0.5);
    addMemoryVerse(root, { y: 1.35, z: 5.2 });

    const exitPortal = addStoryExit(root, 8);
    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: 3.5 },
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
    desertFloor(root, 0xa89880);

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

    const elijah = makeCharacterMesh(THREE, 0xc8a888, { index: 92, showFace: true });
    elijah.position.set(0, 0.55, -0.8);
    root.add(elijah);

    // 강풍 — 소용돌이 링
    const windMat = new THREE.MeshBasicMaterial({
      color: 0xc8e8f8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 + i * 0.55, 0.06, 6, 24), windMat);
      ring.position.set(-2.5, 1.2 + i * 0.5, -1.5);
      ring.rotation.x = Math.PI / 2 + 0.3;
      ring.rotation.z = i * 0.4;
      root.add(ring);
    }
    const windTag = labelSprite("강풍 — 하나님이 계시지 않으심", "#4a6080", { height: 0.42 });
    windTag.position.set(-2.5, 3.0, -1.5);
    root.add(windTag);

    // 지진 — 갈라진 바위
    const quakeMat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const shard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.5), quakeMat);
      shard.position.set(0.3 + (i - 2) * 0.55, 0.15, 1.2 + (i % 2) * 0.4);
      shard.rotation.y = i * 0.5;
      shard.rotation.z = (i - 2) * 0.15;
      root.add(shard);
    }
    const quakeTag = labelSprite("지진 — 하나님이 계시지 않으심", "#5a4838", { height: 0.42 });
    quakeTag.position.set(0.5, 1.6, 1.8);
    root.add(quakeTag);

    // 불
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6020, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 4; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35 - i * 0.04, 1.1 + i * 0.15, 6), fireMat);
      flame.position.set(2.8 + (i % 2) * 0.3, 0.55 + i * 0.15, -0.5 - i * 0.2);
      root.add(flame);
    }
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.35 })
    );
    ember.position.set(2.9, 1.4, -0.7);
    root.add(ember);
    const fireTag = labelSprite("불 — 하나님이 계시지 않으심", "#a04020", { height: 0.42 });
    fireTag.position.set(2.9, 2.8, -0.5);
    root.add(fireTag);

    addVerseLabels(root, [
      "② 호렙산의 바람·지진·불",
      "열왕기상 19:8 후반~12 전반 · 40일 길",
      "거대하고 무서운 현상 속에 하나님은 계시지 않으셨어요",
      "포인트: 화려하고 큰 곳에만 하나님이 계신 건 아니에요",
    ], 4.2, 1.5);
    addMemoryVerse(root, { y: 1.35, z: 5.2 });

    const exitPortal = addStoryExit(root, 8);
    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: 4 },
      exitPortal,
      title: "② 호렙산의 바람·지진·불",
    };
  }

  /**
   * ③ 세미한 음성과 새로운 사명
   * 열왕기상 19:12 후반~16
   */
  function makeElijahWhisper() {
    const root = new THREE.Group();
    root.visible = false;
    desertFloor(root, 0xb8a888);

    // 굴 어귀
    const caveMat = new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 1, side: THREE.DoubleSide });
    const cave = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      caveMat
    );
    cave.position.set(0, 0.3, -3.8);
    cave.rotation.x = Math.PI;
    root.add(cave);
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.18, 6, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x7a6a58 })
    );
    mouth.position.set(0, 1.0, -2.4);
    mouth.rotation.x = Math.PI / 2;
    root.add(mouth);

    // 엘리야 — 겉옷으로 얼굴 가림
    const elijah = makeCharacterMesh(THREE, 0xc8a888, { index: 93, showFace: true });
    elijah.position.set(0, 0.2, -1.8);
    root.add(elijah);
    const cloak = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.55, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.9 })
    );
    cloak.position.set(0, 1.35, -1.55);
    root.add(cloak);

    // 세미한 빛
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.32 })
    );
    glow.position.set(0, 2.6, -1.5);
    root.add(glow);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.9 })
    );
    core.position.copy(glow.position);
    root.add(core);

    // 새 사명 — 세 사람 표식
    const mission = [
      { name: "하사엘", x: -3.2, color: 0xc07050 },
      { name: "예후", x: 0, color: 0x5080c0 },
      { name: "엘리사", x: 3.2, color: 0x60a850 },
    ];
    mission.forEach((m) => {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.85 })
      );
      stone.position.set(m.x, 0.15, 1.5);
      root.add(stone);
      const tag = labelSprite(m.name, "#5a4a42", { height: 0.38 });
      tag.position.set(m.x, 0.85, 1.5);
      root.add(tag);
    });
    const missionHint = labelSprite("새 사명 · 아직 끝이 아니에요", "#5a4a42", { height: 0.45 });
    missionHint.position.set(0, 1.5, 1.5);
    root.add(missionHint);

    addVerseLabels(root, [
      "③ 세미한 음성과 새로운 사명",
      "열왕기상 19:12 후반~16",
      "「엘리야야, 네가 어찌하여 여기 있느냐?」",
      "조용한 음성으로 다시 일으켜 세우세요",
      "포인트: 하나님은 화려한 곳이 아니라 마음에 말씀하세요",
    ], 4.3, 0.2);
    addMemoryVerse(root, { y: 1.35, z: 5.8 });

    const exitPortal = addStoryExit(root, 9);
    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: 4.5 },
      exitPortal,
      title: "③ 세미한 음성과 새 사명",
    };
  }

  /** 말씀 허 — 바깥 문 1개로 들어와 안쪽에서 장면 연결 */
  function makeElijahHub() {
    const root = new THREE.Group();
    root.visible = false;
    desertFloor(root, 0xc4a888);

    const t1 = labelSprite("하나님께 실패한 엘리야", "#5a4a42", { height: 0.75 });
    t1.position.set(0, 3.5, -1);
    root.add(t1);
    const t2 = labelSprite("열왕기상 19장 · 문을 골라 장면으로", "#5a4a42", { height: 0.55 });
    t2.position.set(0, 2.8, -1);
    root.add(t2);
    const t3 = labelSprite("①낙심+천사  →  ②호렙 바람·불  →  ③세미한 음성", "#5a4a42", { height: 0.48 });
    t3.position.set(0, 2.15, -1);
    root.add(t3);
    addMemoryVerse(root, { y: 1.15, z: 5.2, height: 0.5 });

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a8878, roughness: 0.95 });
    const center = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.4, 8), rockMat);
    center.position.set(0, 0.2, -0.5);
    root.add(center);

    const chapters = [
      { id: "elijah_flee", title: "① 낙심과 천사", x: -5, z: -4, color: 0xb08070 },
      { id: "elijah_horeb", title: "② 호렙 바람·불", x: 0, z: -5.5, color: 0xe07040 },
      { id: "elijah_whisper", title: "③ 세미한 음성", x: 5, z: -4, color: 0xf0d878 },
    ];
    const innerPortals = [];
    for (const ch of chapters) {
      const arch = makeStoryGate(ch.x, ch.z, ch.id, ch.title, ch.color);
      arch.position.set(ch.x, 0, ch.z);
      root.add(arch);
      innerPortals.push({
        x: ch.x,
        z: ch.z + 0.6,
        r: 1.25,
        to: ch.id,
        label: ch.title,
      });
    }

    const exitDoor = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.6, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xa86830 })
    );
    exitDoor.position.set(0, 0.8, 8);
    root.add(exitDoor);
    const leave = labelSprite("마을로 · E", "#5a4a42", { height: 0.42 });
    leave.position.set(0, 2.0, 7.5);
    root.add(leave);

    scene.add(root);
    return {
      root,
      spawn: { x: 0, y: 0, z: 4 },
      exitPortal: { x: 0, z: 7.8, r: 1.35, to: "overworld", outPos: null },
      innerPortals,
      title: "하나님께 실패한 엘리야",
      chapters,
    };
  }

  function makeStoryGate(x, z, sceneId, title, color) {
    const g = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.88 });
    [-1.1, 1.1].forEach((ox) => {
      const p = shadowify(new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.35), pillarMat), true);
      p.position.set(ox, 1.2, 0);
      g.add(p);
    });
    const lintel = shadowify(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.4), pillarMat), true);
    lintel.position.set(0, 2.5, 0);
    g.add(lintel);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    cloth.position.set(0, 1.2, 0.05);
    g.add(cloth);
    const tag = labelSprite(title, "#5a4a42", { height: 0.55 });
    tag.position.set(0, 3.1, 0);
    g.add(tag);
    const tip = labelSprite("들어가기 · E", "#5a4a42", { height: 0.4 });
    tip.position.set(0, 0.35, 0.8);
    g.add(tip);
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
  const mainGate = makeStoryGate(gateX, gateZ, "elijah_hub", "하나님께 실패한 엘리야", 0xe8b060);
  storyGates.push({ mesh: mainGate, x: gateX, z: gateZ, noCollide: true });

  const chapterBuilds = [
    { id: "elijah_flee", build: makeElijahFlee, hubPos: { x: -5, z: -3.2 } },
    { id: "elijah_horeb", build: makeElijahHoreb, hubPos: { x: 0, z: -4.5 } },
    { id: "elijah_whisper", build: makeElijahWhisper, hubPos: { x: 5, z: -3.2 } },
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
      exitPortal: bag.exitPortal,
      title: bag.title,
    });
  }

  // 안내 표지판 + 외울말씀
  const board = new THREE.Group();
  const boardTitle = labelSprite("말씀 → 하나님께 실패한 엘리야", "#5a4a42", { height: 0.58 });
  boardTitle.position.set(0, 2.55, 18);
  board.add(boardTitle);
  const verseBoard = labelSprite(
    "외울말씀 시편 62:8 · 하나님은 우리의 피난처시로다",
    "#5a4a42",
    { height: 0.5, maxWidth: 640 }
  );
  verseBoard.position.set(0, 1.9, 18);
  board.add(verseBoard);

  return {
    SUNDAY_KIDS,
    outdoorHouses,
    storyGates,
    board,
    portals,
    sceneBags,
  };
}
