// usage: node qa/lab.mjs <bundle.mjs> <outDir> <scene,scene|all> [WxH] ['{"patch":1}'] [scale]
import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const { PNG } = require("pngjs");
import fs from "fs";
import path from "path";
import { scenes, midiB64 } from "./lab_scenes.mjs";
import { crop, save } from "./lib.mjs";
const [bundle, out, which = "all", size = "1920x1080", patchJ = "{}", scaleArg = "3"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const E = await import(path.resolve(bundle) + "?" + Date.now());
const sg = E.song(Buffer.from(midiB64, "base64"));
const doc = E.settings(JSON.parse(patchJ));
const [W, H] = size.split("x").map(Number);
const names = which === "all" ? Object.keys(scenes) : which.split(",");
const blackSet = [1, 3, 6, 8, 10];
const WHITE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
function whiteX(midi) { const i = midi - 21; const pc = (i + 9) % 12; const wi = Math.floor((i + 9) / 12) * 7 + WHITE[pc] - 5; return (wi + (blackSet.includes(midi % 12) ? 1 : 0.5)) * (W / 52); }
for (const n of names) {
  const sc = scenes[n] ?? { t: Number(n), key: Number(process.env.KEY ?? 64), span: Number(process.env.SPAN ?? 9) };
  const r = E.render(sg, sc.t, W, H, doc);
  fs.writeFileSync(`${out}/${n}.png`, r.png);
  const wk = W / 52, cw = wk * sc.span, cx = whiteX(sc.key), x0 = Math.min(Math.max(0, cx - cw / 2), W - cw);
  const png = PNG.sync.read(r.png);
  save(crop(png, x0, H * 0.585, cw, H * 0.375, Number(scaleArg)), `${out}/${n}_crop.png`);
}
console.log("ok", names.length, "scenes ->", out);
