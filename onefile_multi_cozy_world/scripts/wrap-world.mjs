import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let body = fs.readFileSync(path.join(root, "src/world/_initWorldBody.js"), "utf8");

body = body.replace(
  "document.body.appendChild(renderer.domElement);",
  'mount.appendChild(renderer.domElement);\nrenderer.domElement.style.cssText = "display:block;width:100%;height:100%;";'
);

body = body.replace(
  "const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf9c9d6 });",
  "const bodyMat = new THREE.MeshStandardMaterial({ color: PLAYER_COLORS[myIndex % PLAYER_COLORS.length] });"
);

// inject remote helpers + pose send before animate loop
const injectBeforeAnimate = `
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

`;

body = body.replace("// ---------- 애니메이션 루프 ----------", injectBeforeAnimate + "\n// ---------- 애니메이션 루프 ----------");

body = body.replace(
  "  updatePlayer(dt);\n  updateCamera(dt);",
  "  updatePlayer(dt);\n  updateCamera(dt);\n  smoothRemotes(dt);\n  maybeSendPose(performance.now());"
);

body = body.replace(
  "animate();\n",
  `animate();

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
`
);

// animate uses requestAnimationFrame(animate) - need running flag and rafId
body = body.replace(
  "function animate(){\n  requestAnimationFrame(animate);",
  "function animate(){\n  if (!running) return;\n  rafId = requestAnimationFrame(animate);"
);

const header = `/** Cozy World 3D — expects global THREE (r128). */
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

`;

const footer = `\n}\n`;

fs.writeFileSync(path.join(root, "src/world/cozyWorld.js"), header + body + footer, "utf8");
console.log("Wrote src/world/cozyWorld.js");
