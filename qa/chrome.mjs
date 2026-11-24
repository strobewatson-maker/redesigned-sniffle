// Real-browser verification (Chromium via puppeteer-core): loads a built page, drives window.FahhMIDI.
// usage: node qa/chrome.mjs <dist/index.html> <outDir> [scene,scene|all] [WxH]
import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const puppeteer = require("puppeteer-core");
const { PNG } = require("pngjs");
import fs from "fs";
import { scenes, midiB64 } from "./lab_scenes.mjs";
import { crop, save } from "./lib.mjs";
const [html, out, which = "all", size = "1920x1080"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const [W, H] = size.split("x").map(Number);
const browser = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: "shell", pipe: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars", "--force-color-profile=srgb"] });
const page = await browser.newPage();
const logs = []; page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`)); page.on("pageerror", (e) => logs.push("[pageerror] " + e.message));
await page.setViewport({ width: W, height: H });
await page.goto("file://" + html, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => window.FahhMIDI && window.FahhMIDI.isReady(), { timeout: 30000 });
await page.evaluate((b) => window.FahhMIDI.loadMidiBase64(b, "lab.mid"), midiB64);
const names = which === "all" ? Object.keys(scenes) : which.split(",");
const blackSet = [1, 3, 6, 8, 10], WHITE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const whiteX = (m) => { const i = m - 21, pc = (i + 9) % 12, wi = Math.floor((i + 9) / 12) * 7 + WHITE[pc] - 5; return (wi + (blackSet.includes(m % 12) ? 1 : 0.5)) * (W / 52); };
for (const n of names) {
  const sc = scenes[n] ?? { t: Number(n), key: Number(process.env.KEY ?? 64), span: Number(process.env.SPAN ?? 9) };
  const url = await page.evaluate((t, w, h) => window.FahhMIDI.renderFrame({ time: t, width: w, height: h }), sc.t, W, H);
  const buf = Buffer.from(url.split(",")[1], "base64"); fs.writeFileSync(`${out}/${n}.png`, buf);
  const png = PNG.sync.read(buf), wk = W / 52, cw = wk * sc.span, x0 = Math.min(Math.max(0, whiteX(sc.key) - cw / 2), W - cw);
  save(crop(png, x0, H * 0.585, cw, H * 0.375, Number(process.env.SCALE ?? 3)), `${out}/${n}_crop.png`);
}
console.log("rendered", names.length, "scenes in real Chromium; console messages:", logs.length); logs.slice(0, 6).forEach((l) => console.log("  ", l));
await browser.close();
