// usage: node qa/probe.mjs <png> <x> <y0> <y1> <step>   → prints RGB along a vertical line;  or  node qa/probe.mjs <png> h <y> <x0> <x1> <step> for a horizontal line
import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const { PNG } = require("pngjs");
import fs from "fs";
const [f, a, b, c, d] = process.argv.slice(2);
const png = PNG.sync.read(fs.readFileSync(f));
const px = (x, y) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
if (a === "h") { const y = +b; for (let x = +c; x <= +d; x += +process.argv[7] || 2) console.log(`x=${x}`, px(x, y).join(",")); }
else { const x = +a; for (let y = +b; y <= +c; y += +d) console.log(`y=${y}`, px(x, y).join(",")); }
