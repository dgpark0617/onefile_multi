/**
 * cozy-world-3d.html → src/world/cozyWorld.raw.js (중간 산출물)
 * 수동 래핑은 src/world/cozyWorld.js 가 담당.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "cozy-world-3d.html"), "utf8");
const m = html.match(/function initWorld\(\)\{([\s\S]*)\}\s*\/\/ initWorld 끝/);
if (!m) {
  console.error("initWorld body not found");
  process.exit(1);
}
let body = m[1];
body = body.replace(/Math\.random\(\)/g, "rand()");
fs.mkdirSync(path.join(root, "src/world"), { recursive: true });
fs.writeFileSync(path.join(root, "src/world/_initWorldBody.js"), body, "utf8");
console.log("Wrote src/world/_initWorldBody.js", body.length, "chars");
