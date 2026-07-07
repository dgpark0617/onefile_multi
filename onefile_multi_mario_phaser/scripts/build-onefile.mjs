import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const outDir = path.join(projectRoot, "dist");
const outHtml = path.join(projectRoot, "onefile_multi_mario_phaser.html");
const tempJs = path.join(outDir, "bundle.js");

fs.mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [path.join(projectRoot, "src/main.js")],
  outfile: tempJs,
  bundle: true,
  format: "iife",
  minify: true,
  sourcemap: false,
  target: ["es2020"],
});

const js = fs.readFileSync(tempJs, "utf8");
const lobbyCss = fs.readFileSync(path.join(projectRoot, "src/ui/lobby.css"), "utf8");
const shellCss = `
html, body { margin: 0; height: 100%; background: #1a1a2e; overflow: hidden; }
#gameShell { display: flex; flex-direction: column; height: 100dvh; width: 100vw; }
#app { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; position: relative; }
#app canvas.mario-surface {
  position: relative;
  z-index: 1;
  border: 2px solid #334155;
  border-radius: 8px;
  box-shadow: 0 0 24px rgba(74, 222, 128, 0.12);
  max-width: 100%;
  height: auto;
}
#app canvas:not(.mario-surface) {
  position: absolute !important;
  inset: 0;
  margin: auto;
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}
#gameShellHeader { flex-shrink: 0; text-align: center; padding: 6px 10px 4px; }
#gameShellHeader h1 {
  margin: 0; font-size: clamp(0.95rem, 3.5vw, 1.2rem);
  background: linear-gradient(90deg, #4ade80, #22d3ee);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  font-family: "Segoe UI", system-ui, sans-serif;
}
#backBtn { position: absolute; top: 8px; right: 10px; z-index: 5; }
#gameWrap { flex: 1; min-height: 0; position: relative; display: flex; align-items: center; justify-content: center; padding: 0 6px; }
`;

const bodyMatch = fs
  .readFileSync(path.join(projectRoot, "public/index.html"), "utf8")
  .match(/<body>([\s\S]*)<\/body>/i);
const bodyInner = bodyMatch
  ? bodyMatch[1].replace(/<script[^>]*src="[^"]*main\.js"[^>]*><\/script>/i, "").trim()
  : "";

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>버섯 어드벤처 — Phaser Onefile</title>
  <style>${lobbyCss}${shellCss}</style>
</head>
<body>
${bodyInner}
  <script>${js}</script>
</body>
</html>
`;

fs.writeFileSync(outHtml, html, "utf8");
console.log(`Built onefile: ${path.relative(projectRoot, outHtml)}`);
