// usage: node qa/chrome_checks.mjs <dist/index.html> [label]  — determinism, settings listing, timing in a real browser
import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const puppeteer = require("puppeteer-core");
import { createHash } from "crypto";
import { midiB64 } from "./lab_scenes.mjs";
const [html, label = ""] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: "/tmp/chromium", headless: "shell", pipe: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--force-color-profile=srgb"] });
const page = await browser.newPage();
const logs = []; page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`)); page.on("pageerror", (e) => logs.push("[pageerror] " + e.message));
await page.setViewport({ width: 1920, height: 1080 });
await page.goto("file://" + html, { waitUntil: "load" });
await page.waitForFunction(() => window.FahhMIDI && window.FahhMIDI.isReady(), { timeout: 30000 });
await page.evaluate((b) => window.FahhMIDI.loadMidiBase64(b, "lab.mid"), midiB64);
const r = await page.evaluate(async () => {
  const F = window.FahhMIDI; const out = {};
  const h = async (s) => { const b = new TextEncoder().encode(s); const d = await crypto.subtle.digest("SHA-1", b); return [...new Uint8Array(d)].slice(0, 6).map((x) => x.toString(16).padStart(2, "0")).join(""); };
  const f = (t) => F.renderFrame({ time: t, width: 1920, height: 1080 });
  const a1 = await h(f(5.9)), b1 = await h(f(14.005)), c1 = await h(f(24.2));
  const c2 = await h(f(24.2)), a2 = await h(f(5.9)), b2 = await h(f(14.005));
  out.determinism = { "t=5.9": a1 === a2, "t=14.005": b1 === b2, "t=24.2": c1 === c2 };
  // frame N rendered directly (cold) must equal frame N reached by stepping through the frames before it
  const fr = (n) => F.renderFrame({ width: 1920, height: 1080, frame: n });
  const direct = await h(fr(843));
  for (let i = 800; i < 843; i++) fr(i); // step
  out.stepVsDirectIdentical = (await h(fr(843))) === direct;
  const list = F.listSettings(); out.totalSettings = list.length;
  out.newSettings = list.filter((s) => /finish\.key(Light|LightCore|Ignite|Afterglow|Spill)$/.test(s.path)).map((s) => `${s.path} def=${s.default ?? s.def} [${s.min}..${s.max}]`);
  // timing: renderFrame incl. PNG encode (same overhead in both builds)
  const T = {}; for (const [n, t] of Object.entries({ rest: 0.3, triad: 2.9, mixed: 5.9, row: 20.8, run: 24.2 })) {
    for (let i = 0; i < 3; i++) f(t); const xs = []; for (let i = 0; i < 15; i++) { const p0 = performance.now(); F.renderFrame({ time: t + i * 1e-4, width: 1920, height: 1080, type: "image/jpeg", quality: 0.5 }); xs.push(performance.now() - p0); }
    xs.sort((x, y) => x - y); T[n] = +xs[7].toFixed(1);
  } out.msPerFrame = T;
  out.h264 = typeof VideoEncoder === "undefined" ? "no WebCodecs" : (await VideoEncoder.isConfigSupported({ codec: "avc1.640028", width: 1920, height: 1080, bitrate: 8e6, framerate: 60 })).supported;
  return out;
});
console.log(`== ${label || html}`); console.log(JSON.stringify(r, null, 1)); console.log("console messages:", logs.length); logs.slice(0, 5).forEach((l) => console.log("  ", l));
await browser.close();
