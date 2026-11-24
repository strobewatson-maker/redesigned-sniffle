// usage: node qa/lum.mjs <png> <x0> <x1> <y0> <y1>  → mean luminance of the box
import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const { PNG } = require("pngjs");
import fs from "fs";
const [f, x0, x1, y0, y1] = process.argv.slice(2);
const p = PNG.sync.read(fs.readFileSync(f)); let s = 0, n = 0;
for (let y = +y0; y <= +y1; y++) for (let x = +x0; x <= +x1; x++) { const i = (y * p.width + x) * 4; s += 0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2]; n++; }
console.log((s / n).toFixed(1));
