import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const outDir = path.join(projectRoot, "dist");
const outHtml = path.join(projectRoot, "onefile_multi_chart_predict.html");
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
  loader: { ".json": "json" },
});

const js = fs.readFileSync(tempJs, "utf8");
const lobbyCss = fs.readFileSync(path.join(projectRoot, "src/ui/lobby.css"), "utf8");
const shellCss = `
html, body { margin: 0; height: 100%; background: #070b14; overflow: hidden; }
#gameShell { display: flex; flex-direction: column; height: 100dvh; width: 100vw; background: #070b14; }
#app { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
#app canvas {
  width: min(100%, 900px) !important;
  height: auto !important;
  aspect-ratio: 900 / 560;
  display: block;
  border: 1px solid #1e3a5f;
  border-radius: 14px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(56, 189, 248, 0.08);
}
#gameShellHeader {
  flex-shrink: 0; text-align: center; padding: 8px 10px 6px;
  border-bottom: 1px solid #1e293b; background: rgba(7, 11, 20, 0.9);
}
#gameShellHeader h1 {
  margin: 0; font-size: clamp(0.9rem, 3.2vw, 1.05rem); font-weight: 700; letter-spacing: 0.06em;
  background: linear-gradient(90deg, #38bdf8, #34d399);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  font-family: "Pretendard", "Segoe UI", system-ui, sans-serif;
}
#backBtn { position: absolute; top: 10px; right: 10px; z-index: 5; font-size: 0.78rem; padding: 7px 12px; border-radius: 8px; }
#gameWrap { flex: 1; min-height: 0; position: relative; display: flex; align-items: center; justify-content: center; padding: 8px; }
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
  <title>차트 예측 — Onefile</title>
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
