import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const port = 4176;
const bundlePath = path.join(root, "dist", "dev.bundle.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

fs.mkdirSync(path.dirname(bundlePath), { recursive: true });

const ctx = await esbuild.context({
  entryPoints: [path.join(root, "src/main.js")],
  outfile: bundlePath,
  bundle: true,
  format: "iife",
  target: ["es2020"],
  sourcemap: true,
  loader: { ".json": "json" },
});

await ctx.watch();
console.log("esbuild watching src/ → dist/dev.bundle.js");

http
  .createServer((req, res) => {
    const reqPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let rel = reqPath;
    if (reqPath === "/") rel = "/public/index.html";
    const abs = path.normalize(path.join(root, rel));
    if (!abs.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(abs, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(abs);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(port, () => {
    console.log(`Chart predict dev server: http://localhost:${port}`);
    console.log(`Onefile preview: http://localhost:${port}/onefile_multi_chart_predict.html`);
  });
