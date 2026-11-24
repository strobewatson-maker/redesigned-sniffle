// usage: node qa/chrome_export.mjs <dist/index.html> <out.mp4> [WxH=1280x720] [fps=60]
import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const puppeteer = require("puppeteer-core");
import fs from "fs";
import { passageB64 } from "./passage.mjs";
const [html, out, size = "1280x720", fps = "60"] = process.argv.slice(2);
const [W, H] = size.split("x").map(Number);
const browser = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: "shell", pipe: true, protocolTimeout: 600000,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--force-color-profile=srgb"] });
const page = await browser.newPage();
const logs = []; page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`)); page.on("pageerror", (e) => logs.push("[pageerror] " + e.message));
await page.setViewport({ width: W, height: H });
await page.goto("file://" + html, { waitUntil: "load" });
await page.waitForFunction(() => window.FahhMIDI && window.FahhMIDI.isReady(), { timeout: 30000 });
await page.evaluate((b) => window.FahhMIDI.loadMidiBase64(b, "passage.mid"), passageB64);
const t0 = Date.now();
const res = await page.evaluate((w, h, f) => window.FahhMIDI.exportMp4({ width: w, height: h, fps: f, leadInSeconds: 0.5, tailOutSeconds: 0.5, download: false }), W, H, +fps);
const info = await page.evaluate(() => window.FahhMIDI.getLastExportInfo());
const parts = []; for (let i = 0; i < info.chunks; i++) parts.push(Buffer.from(await page.evaluate((k) => window.FahhMIDI.readLastExportChunk(k), i), "base64"));
fs.writeFileSync(out, Buffer.concat(parts));
console.log(`exported ${out}: ${info.bytes} bytes, ${((Date.now() - t0) / 1000).toFixed(1)} s wall;`, JSON.stringify(res.manifest ?? {}).slice(0, 200)); console.log("console messages:", logs.length); logs.slice(0, 5).forEach((l) => console.log("  ", l));
await browser.close();
