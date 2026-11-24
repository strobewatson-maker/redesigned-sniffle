import { drawFrame, setCanvasFactory } from "../../src/engine/renderer";
import { parseMidi } from "../../src/engine/midi";
import { freshDefaults, applyPatch } from "../../src/engine/settings";
import { createCanvas } from "@napi-rs/canvas";
setCanvasFactory(((w: number, h: number) => createCanvas(w, h)) as never);
export function song(bytes: Uint8Array) { return parseMidi(bytes, { fileName: "scenes.mid" }); }
export function settings(patch: Record<string, unknown> = {}) {
  const r = applyPatch(freshDefaults(), patch);
  const d = r.doc;
  if (r.rejected && (r.rejected as unknown[]).length) console.error("rejected", r.rejected);
  return d;
}
export function render(sg: ReturnType<typeof song>, t: number, W: number, H: number, doc: ReturnType<typeof settings>) {
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  const t0 = process.hrtime.bigint();
  drawFrame(ctx as never, sg, t, doc.render, { width: W, height: H, dpr: 1, hitEps: 0.5 / doc.video.fps });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { png: c.toBuffer("image/png"), ms, rgba: ctx.getImageData(0, 0, W, H).data };
}
export { keyDepressAt, keyLightAt } from "../../src/engine/keypress";
export { exportDocument, applyPatch, freshDefaults, SCHEMA, parseSettingsInput, THEME_PRESETS } from "../../src/engine/settings";
