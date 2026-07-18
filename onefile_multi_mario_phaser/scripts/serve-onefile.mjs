import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4176);

http
  .createServer((req, res) => {
    const u = decodeURIComponent((req.url || "/").split("?")[0]);
    const f = u === "/" ? "/onefile_multi_mario_phaser.html" : u;
    fs.readFile(path.join(root, f), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("nf");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
  })
  .listen(port, () => console.log(`up ${port}`));
