// usage: node qa/diff.mjs a.png b.png  → count of differing pixels, max channel delta, bbox
import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const { PNG } = require("pngjs");
import fs from "fs";
const [a, b] = process.argv.slice(2).map((f) => PNG.sync.read(fs.readFileSync(f)));
let n = 0, mx = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
  const i = (y * a.width + x) * 4; const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
  if (d) { n++; mx = Math.max(mx, d); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
}
console.log(JSON.stringify({ differingPixels: n, maxDelta: mx, bbox: n ? [x0, y0, x1, y1] : null }));
