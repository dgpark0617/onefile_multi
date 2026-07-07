/**
 * onefile_multi_mario.html → src/core/marioEngine.js 추출
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const htmlPath = path.join(root, "..", "onefile_multi_mario", "onefile_multi_mario.html");
const outPath = path.join(root, "src", "core", "marioEngine.js");

const html = fs.readFileSync(htmlPath, "utf8");
const startMark = "    let cameraX = 0;";
const endMark = "    function setInput(key, active) {";
const start = html.indexOf(startMark);
const end = html.indexOf(endMark);
if (start < 0 || end < 0) throw new Error("extract markers not found");

let body = html.slice(start, end).trim();
body = body.replace(/^let cameraX = 0;\s*/m, "");

const header = `import { mulberry32 } from "./rng.js";
import {
  DOUBLE_JUMP_FORCE,
  FEATHER_DURATION,
  FRICTION,
  GRAVITY,
  JUMP_FORCE,
  MAX_SPEED,
  MOVE_SPEED,
  PIPE_COOLDOWN,
  PLAYER_DEFS,
  TICK_MS,
  UNDERGROUND_W,
  VH,
  VW,
  WORLD_W,
} from "./marioConstants.js";

export function createMarioEngine(env) {
  const { getCanvasContext, getHudEl, netBroadcast, WwNetRef } = env;

  let ctx = null;
  let game = null;
  let cameraX = 0;

`;

const footer = `
  return {
    get game() { return game; },
    set game(v) { game = v; },
    get cameraX() { return cameraX; },
    set cameraX(v) { cameraX = v; },
    MarioGame,
    win() { if (game) game.win(); },
    initLevel() { if (game) game.initLevel(); },
    drawBackground,
    drawPipes,
    drawFlag,
    drawPopups,
    getWorldW,
    platforms: () => platforms,
    setCtx(c) { ctx = c; },
    getCtx() { return ctx || getCanvasContext(); },
  };
}
`;

body = body
  .replace(/document\.getElementById\('([^']+)'\)/g, "getHudEl('$1')")
  .replace(/WwNet\.broadcast/g, "netBroadcast")
  .replace(/WwNet\./g, "WwNetRef.")
  .replace(/playerTagsEl/g, "getHudEl('playerTags')")
  .replace(
    /this\.rafId = 0;\n      \}/,
    `this.rafId = 0;
        this.externalDriver = !!opts.externalDriver;
      }`,
  )
  .replace(
    /this\.draw\(\);\n        this\.rafId = requestAnimationFrame\(ts => this\.loop\(ts\)\);/,
    `this.draw();
        if (!this.externalDriver) {
          this.rafId = requestAnimationFrame(ts => this.loop(ts));
        }`,
  )
  .replace(
    /cancelAnimationFrame\(this\.rafId\);\n        this\.rafId = requestAnimationFrame\(ts => this\.loop\(ts\)\);\n      \}\n\n      stop\(\)/,
    `cancelAnimationFrame(this.rafId);
        if (!this.externalDriver) {
          this.rafId = requestAnimationFrame(ts => this.loop(ts));
        }
      }

      stop()`,
  );

fs.writeFileSync(outPath, header + body + footer, "utf8");
const lines = fs.readFileSync(outPath, "utf8").split("\n").length;
console.log(`Extracted ${outPath} (${lines} lines)`);
