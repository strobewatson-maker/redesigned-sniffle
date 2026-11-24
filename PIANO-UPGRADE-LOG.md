# Piano realism upgrade — log

## Phase 0 audit (original behaviour)
- `drawFrame` (renderer.ts) is shared by live preview (player.ts), export (exporter.ts) and `renderFrame` (automation.ts) → one code path.
- Press state was `KeyState.press`: a 45 ms ease-out ramp (min 0.18) on note-on, linear 110 ms release; no velocity, no hold/rest model, no rebound.
- `drawKeys` turned that into: 2.6u translate, 1.2u shorter bottom, 0.34-alpha 1.7u edge shadow, a strong flat colour wash (keyWash 0.92) → a *tinted key that moved 3 px*. No occlusion, no side walls, no nose change, no black-key shadow response. That is why it read weak.
- Projection is pure top-down (rectangles); depth must come from shading, occlusion and small perspective drop.

## Decisions
- New `keypress.ts`: analytic depress d(t) per key from its notes (attack ease-out, hold depth by velocity, felt compression + damped rebound, release ease-in-out + overshoot, restart from current height, anticipation, deterministic per-key variation via integer hash).
- New `keyboard.ts`: `drawKeysPhysical`, all cues driven by d; sprites cached per size/light; shared local-space gradients; seeded textures (integer hash, no Math.random/Math.sin).
- Old `drawKeys` is kept and used when `render.finish.keyPhysics=false` (exact legacy look & timing; also the A/B baseline).
- Press colour wash is kept (identity) but all shading is layered on top of it.
- Light model: `finish.lightAngle` (deg), `lightFill`, `lightAmbient`.

## Spec (new settings, all `render.finish.*`, see settings.ts for ranges/hints)
keyPhysics true · pressHold 0.72 · pressAttackSlow 0.11 s · pressAttackFast 0.018 s · pressBottomOut 0.045 · pressReleaseSlow 0.14 s · pressReleaseFast 0.07 s · pressOvershoot 0.03 · pressAnticipation 20 ms · pressVariation 1 · cueDrop/Nose/SideWalls/Channel/Contact/Tilt/BlackKeys/Overhang/Bounce 1 · lightAngle −38° · lightFill 1 · lightAmbient 1 · ivoryDetail/ebonyDetail/woodDetail/brassDetail 1 · keyDither 1.

## QA tooling (qa/ is git-ignored)
Chromium can't launch here (missing libnspr4, no root) → `drawFrame` is bundled with esbuild and rendered in Node with @napi-rs/canvas (Skia). `qa/shoot.mjs <out> <scenes> <WxH,..> '<json patch>'`.

## Verification results (Node/Skia harness, 1920x1080 unless noted)
- Motion @60fps: pp attack 0→0.72 over ~5 frames; ff 0→1.04 (felt compression)→0.99→1.00; release overshoot −0.030; fast repeats restart from current height (min d between 110 ms repeats 0.60).
- Determinism: same frame after rendering 40 others → identical MD5; seek-to-N vs stepping-to-N → identical.
- Perf (software Skia, mean of 13 dense frames): legacy 24.9 ms → new 33.0 ms (1.33x) at 1080p.
- Geometry: white key gaps identical at 1280x720 / 1920x1080 (±2 px argmin ambiguity at 4K); black key silhouettes use the same x/w/rect code.
- Settings: export→import round-trip OK, legacy JSON imports (new fields default), out-of-range values clamp.

## Bugs found by critique
- harness patch was not applied (applyPatch returns a new doc) → fixed; first "after" images were defaults.
- drawKeysPhysical forgot drawCheeks → cheek blocks vanished; fixed.
- ebony looked milky/grainy → narrower streak, weaker env term, dither 3.2→1.6/255.

## Not done / limitations
- Real Chromium could not launch (missing libnspr4); browser GPU timing, real H.264/MP4 export and the Python --list-settings/UI were NOT run here. They use the same schema code paths.
- Black-key cast-shadow reach is one quantised sprite per black key (9 levels, crossfaded), driven by the black key's own depth and the deeper neighbour white.

---

# Phase 8 — Key light: a struck key is *lit*, not *painted*  (theme-coherent redesign of the pressed-key look)

Supersedes the Phase 3 decision "press colour wash is kept (identity); all shading is layered on top of it". That decision is the root cause of the "dull / off-theme" press described below. The depress model (keypress.ts `keyDepressAt`) and every geometry rule are unchanged.

## 8.1 Why the pressed key still looked wrong (measured, not guessed)

The site's visual language is **light**: glass note bodies, a white inner core, additive bloom, a white-hot strike edge, warm brass and ink-black. The pressed key spoke a different language — **paint**.

| Symptom | Cause | Evidence |
|---|---|---|
| Khaki / pastel-mint keys instead of glowing keys | translucent note colour composited `source-over` on ivory (α 0.92 → 0.28) | lit C4 probed (217,177,104)-ish, luminance ≈ the unlit ivory (207,201,186); the note above it is (255,208,113) |
| "Dirty" / muddy | brown-black overlays (rgb 22/9,2 etc.) drawn over an already-pastel base | darkening a pastel gives mud; teal keys went grey-mint |
| Thick outlines around pressed keys | solid walls (0.10·key width) + channel + neighbour bleed, all dark | read as a black frame, not as depth |
| Black keys flat olive rectangles | opaque tint over the lacquer, then a black tilt overlay | probe down a lit black key (R channel, previous build): 187 → 71; the lacquer gloss is gone |
| Smudge around black keys | circular radial halo | white blotch on the neighbouring ivory |
| Lifeless in video | colour followed the key's travel 1:1 — no ignition, no afterglow | key returned to plain ivory in ≈ 3 frames |
| One ugly frame at every strike | the key starts moving 20 ms before the sound, the light only after | frame 839: d = 0.69, lit = 0 → a shaded, un-lit grey key |

## 8.2 Design principles

1. **Light, not paint.** The note's light is carried into the key like a lamp behind translucent ivory / inside smoked glass. A MULTIPLY tint colours the material (chroma and luminance kept); SCREEN passes put the light back: hot pool where the note enters, lens-like body (brighter in the middle, deeper at the glass edge), a glassy core line that echoes the note's own, rim, strike flash.
2. **Emission is never shadowed.** Shadows that fall on a key's surface do not darken the light it gives off, so the light passes are drawn AFTER every shadow (white keys: dedicated emission pass; black keys: after the tilt shading). Shadows are multiplied in so they stay a deeper shade of the key's own hue.
3. **Light has its own envelope**, separate from the key's travel (`keyLightAt`, stateless like `keyDepressAt`): pre-glow while the finger is pressing → strike flash locked to the instant the note lands → velocity-dependent sustain with a slow sag → exponential afterglow ("cooling filament") that outlives the key's return. pp ≈ 0.57, mf ≈ 0.78, ff = 1.0 sustain.
4. **Depth stays readable without colour** (cue 11). With `glow.keyWash = 0` + greyscale the pressed/neighbour luminance ratio is 0.79 / 0.76 / 0.67 (top / middle / nose) vs 0.76 / 0.77 / 0.74 before — same readability, no brown. A lit key fills in its own *surface* shading (ambient occlusion, tilt) by up to 62 %, but keeps the *geometric* cues (edge shadows, nose under the rail, channel).
5. **Same hue everywhere.** Bounce light, channel seam, wall spill and the neighbour pool all use the note colour (saturated hue for lifts; pastel lifts only wash colours out).

## 8.3 What changed

* `keypress.ts` — new `keyLightAt()` (+ `KeyLight`): `lit`, `flash`, `vf`, owner note. Stateless, max over the key's notes.
* `renderer.ts` — pressView now also carries `lit` / `flash`; the look-back window grows with `keyAfterglow` so the afterglow can finish; keys with light but no travel get a view (d = 0).
* `keyboard.ts` — `buildLit` / `litFor` (cached tint + glow sprites per quantised note colour, LRU 24, seeded dither), `buildLitBlack` / `litBlackFor`, glassy-core sprite; lit-ivory tint pass + `EMISSION` pass + `spillPool` (warm multiply cast + soft screen lift, shared by white and black keys); shading sprites now neutral-warm and MULTIPLIED; slimmer walls (0.10 → 0.062·key width); channel = dark floor + a seam of light instead of a black outline; black key: glow after shading, rim light, light rolling over the sloped front, elongated pool instead of the round halo; lit keys keep the key-label contrast.
* `settings.ts` / `types.ts` — 5 new settings (Fine detail): `render.finish.keyLight` (1, 0–3), `keyLightCore` (1, 0–3), `keyIgnite` (1, 0–3), `keyAfterglow` (0.18 s, 0–0.6), `keySpill` (1, 0–3). Zero = off. `glow.keyWash` still scales the colour overall. No default of an existing setting changed.

## 8.4 Verification (real Chromium 153 driving the built dist/index.html + Node/Skia harness)

* Frame with no key down: **0 differing pixels** vs the previous build. Legacy mode (`keyPhysics = false`): **0 differing pixels** (2 scenes).
* Determinism (real browser): same frame twice / after other frames — identical; frame 843 stepped to from 800 vs rendered cold — identical. Node: also identical from a cold module instance (cache state does not matter).
* Settings: 230 → 235 in `FahhMIDI.listSettings()`; a settings JSON exported by the previous build imports with 0 rejections; export → import round-trips non-default values; all-zero accepted.
* Build: `tsc --noEmit` clean, `vite build` clean (900 KB single file, 0 warnings); 0 console messages while loading and rendering.
* Per-frame time (real Chromium, software raster, 1080p, incl. JPEG encode, median of 15): previous 62 / 67 / 71 / 70 / 71 ms → new 65 / 65 / 71 / 77 / 77 ms (rest / triad / mixed / 8-key row / fast run) = within +0…11 %.
* MP4 (real H.264 export, 1280×720, 60 fps, 414 frames, fast run + 10 re-strikes of one key + pp/mf/ff black keys): 5 445 219 → 5 629 586 bytes (+3.4 %); export 13.3 s → 14.4 s. Brightness of the re-struck key across 70 frames: previous 108.5…109.2 (dark, no light) → new 129.7…132.8 (steady glow with a ±1.5 % re-strike pulse); mean |Δ| per frame 4.59 → 2.73, no spikes.
* Palettes: checked with Midnight Neon, Rose Gold, Sunset, Monochrome Noir.

## 8.5 Known limitations / ideas

* Software-raster timings only (no GPU in the test box) — expect faster live preview on a GPU.
* In very bright monochrome palettes the lit white key differs from ivory mostly by depth cues (by design: white light on ivory).
* Peach/rose and orange black keys read as bronze/mauve glass rather than a saturated tint (screen on near-black); `keyLight` > 1 pushes them brighter.
* The brass plate lettering can wash out when ≥ 8 notes land at once — that is the existing lane/rail bloom, untouched here.
* Ideas: velocity-dependent `keyAfterglow`; a subtle reflection of the lit key in the brass rail.

## 8.6 Tooling added under qa/ (git-ignored)

`lab.mjs`, `lab_scenes.mjs`, `strip.mjs` (frame filmstrips), `probe.mjs`, `lum.mjs`, `diff.mjs` (pixel probes / diffs), `chrome.mjs`, `chrome_checks.mjs`, `chrome_export.mjs`, `passage.mjs` (real-browser renders, determinism/timing, MP4 export). See `qa/README-lab.md`.
