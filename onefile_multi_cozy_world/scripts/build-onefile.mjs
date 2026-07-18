import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const outDir = path.join(projectRoot, "dist");
const outHtml = path.join(projectRoot, "onefile_multi_cozy_world.html");
const tempJs = path.join(outDir, "bundle.js");

fs.mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [path.join(projectRoot, "src/main.js")],
  outfile: tempJs,
  bundle: true,
  format: "iife",
  minify: true,
  target: ["es2020"],
});

const js = fs.readFileSync(tempJs, "utf8");
const css = fs.readFileSync(path.join(projectRoot, "src/ui/lobby.css"), "utf8");
const bodyMatch = fs
  .readFileSync(path.join(projectRoot, "public/index.html"), "utf8")
  .match(/<body>([\s\S]*)<\/body>/i);
const bodyInner = bodyMatch
  ? bodyMatch[1]
      .replace(/<script[^>]*three[^>]*><\/script>/gi, "")
      .replace(/<script[^>]*dev\.bundle\.js[^>]*><\/script>/i, "")
      .replace(/<link[^>]*lobby\.css[^>]*>/gi, "")
      .trim()
  : "";

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>말씀으로 이루어진 세상</title>
  <style>${css}</style>
</head>
<body>
${bodyInner}
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"><\/script>
<script>${js}<\/script>
</body>
</html>
`;

fs.writeFileSync(outHtml, html, "utf8");
console.log(`Built onefile: ${path.relative(projectRoot, outHtml)}`);
