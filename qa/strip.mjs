// usage: node qa/strip.mjs <bundleA> <bundleB|-> <out.png> <key> <f0> <f1> [step=1] [scale=2] ['{patch}']
// renders frames f0..f1 (video frames @60 fps) of the lab song; crop = 3 white keys around <key>, rail + upper 62 % of the key. Row A over row B.
import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const { PNG } = require("pngjs");
import fs from "fs";
import path from "path";
import { midiB64 } from "./lab_scenes.mjs";
import { crop, hstack, vstack, save } from "./lib.mjs";
const [bA, bB, out, keyS, f0S, f1S, stepS = "1", scaleS = "2", patchJ = "{}"] = process.argv.slice(2);
const key = +keyS, f0 = +f0S, f1 = +f1S, step = +stepS, sc = +scaleS;
const LIST = f0S.includes(",") ? f0S.split(",").map(Number) : null;
const W = 1920, H = 1080;
const blackSet = [1, 3, 6, 8, 10], WHITE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const wk = W / 52; const i = key - 21, pc = (i + 9) % 12, wi = Math.floor((i + 9) / 12) * 7 + WHITE[pc] - 5;
const cx = (wi + (blackSet.includes(key % 12) ? 1 : 0.5)) * wk;
async function row(bundle) {
  const E = await import(path.resolve(bundle) + "?" + Math.random());
  const sg = E.song(Buffer.from(midiB64, "base64")); const doc = E.settings(JSON.parse(patchJ));
  const tiles = [];
  for (const f of LIST ?? Array.from({ length: Math.floor((f1 - f0) / step) + 1 }, (_, i) => f0 + i * step)) {
    const r = E.render(sg, f / 60, W, H, doc); const png = PNG.sync.read(r.png);
    tiles.push(crop(png, cx - wk * 1.5, H * 0.728, wk * 3, H * 0.2, sc));
  }
  return hstack(tiles, 4);
}
const rows = [await row(bA)]; if (bB !== "-") rows.push(await row(bB));
save(rows.length > 1 ? vstack(rows, 6) : rows[0], out); console.log("ok", out);
