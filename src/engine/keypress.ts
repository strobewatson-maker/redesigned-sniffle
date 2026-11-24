/* ------------------------------------------------------------------ *
 *  Fahh MIDI · physical key-press model
 *
 *  d ∈ [-0.03 … 1.06]  — how far a key is pushed down (0 = rest, 1 = on the keybed felt).
 *  d is an ANALYTIC, STATELESS function of (time, the key's note events, settings):
 *  the same frame rendered directly or reached by stepping is bit-identical.
 *
 *  Real-grand facts modelled here
 *   · hold depth grows with velocity (pp ≈ 0.72 of the travel, ff reaches the felt)
 *   · attack is an ease-out that takes ~110 ms (pp) … ~18 ms (ff)
 *   · hard strikes compress the felt a little (d > hold) and rebound, dying out in ~70 ms
 *   · release is an ease-in-out of 70–140 ms with a tiny overshoot above rest height
 *   · a re-struck key starts its new attack from the height it has reached while returning
 *
 *  Light is NOT motion. keyLightAt() gives every key a second analytic envelope — the light the
 *  struck key carries: it ignites with a short flash at the strike (in sync with the falling note
 *  landing), settles to a velocity-dependent glow while held, and afterwards fades slowly like a
 *  cooling filament, long after the key itself has come back up. Also stateless / frame-exact.
 * ------------------------------------------------------------------ */

export interface PressParams {
  hold: number; // hold depth at pp (0..1); ff always reaches 1
  attackSlow: number; // s, pp attack
  attackFast: number; // s, ff attack
  bottomOut: number; // felt compression at ff (fraction of travel)
  releaseSlow: number; // s
  releaseFast: number; // s
  overshoot: number; // fraction of travel above rest after release
  anticipation: number; // s, press starts / releases this much before the note event
  variation: number; // 0 = identical keys, 1 = subtle per-key variation
}

export interface KeyNote<T = unknown> {
  start: number;
  end: number; // visual end
  vel: number; // 1..127
  ref: T;
}

export interface KeyDepress<T = unknown> {
  d: number;
  vf: number; // velocity factor 0..1 of the note that drives the key
  held: boolean;
  ref: T;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** deterministic integer hash → [0,1) (no Math.sin: identical on every machine) */
export function ihash(n: number): number {
  n = Math.imul((n | 0) ^ ((n | 0) >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

export const velocityFactor = (vel: number) => clamp((vel - 20) / 100, 0, 1);

interface Seg {
  kind: 0 | 1; // 0 = attack, 1 = release
  t0: number;
  h0: number;
  target: number;
  dur: number;
  vf: number;
  amp: number; // bounce (attack) / overshoot (release) amplitude
}

const TWO_PI = Math.PI * 2;

function evalSeg(s: Seg, t: number): number {
  const tau = t - s.t0;
  if (tau <= 0) return s.h0;
  if (s.kind === 0) {
    if (tau < s.dur) {
      const u = tau / s.dur;
      return s.h0 + (s.target - s.h0) * (1 - Math.pow(1 - u, 2.2));
    }
    const a = tau - s.dur;
    // felt compression: starts continuous at the hold depth, peaks ~12 ms later, rebounds, dies in ~70 ms
    return s.target + s.amp * 1.6 * Math.exp(-a / 0.022) * Math.sin((TWO_PI * a) / 0.05);
  }
  if (tau < s.dur) {
    const u = tau / s.dur;
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    return s.h0 * (1 - e);
  }
  const a = tau - s.dur;
  // return spring: rises a hair above rest and settles
  return -s.amp * 1.6 * Math.exp(-a / 0.02) * Math.sin((TWO_PI * a) / 0.05);
}

/** `notes` must be sorted by start. Returns null when the key is at rest and settled. */
export function keyDepressAt<T>(notes: KeyNote<T>[], t: number, key: number, P: PressParams, lead: number): KeyDepress<T> | null {
  const n = notes.length;
  if (n === 0) return null;
  // events: even slot = press, odd = release
  const ev: { t: number; i: number; press: boolean }[] = [];
  const jit = (ihash(key * 7 + 3) - 0.5) * 0.08 * P.variation; // ±4 % attack-speed jitter
  for (let i = 0; i < n; i++) {
    const nt = notes[i];
    const ta = nt.start - lead;
    ev.push({ t: ta, i, press: true });
    ev.push({ t: Math.max(ta + 0.012, nt.end - P.anticipation), i, press: false });
  }
  ev.sort((a, b) => a.t - b.t || (a.press ? 1 : 0) - (b.press ? 1 : 0));
  let seg: Seg | null = null;
  let held = 0;
  let ref: T = notes[0].ref;
  let vf = 0;
  const depthVar = 1 - ihash(key * 13 + 5) * 0.045 * P.variation; // each key bottoms out a hair differently
  for (const e of ev) {
    if (e.t > t) break;
    const cur = seg as Seg | null;
    const h: number = cur ? evalSeg(cur, e.t) : 0;
    if (e.press) {
      held++;
      const nt = notes[e.i];
      ref = nt.ref;
      vf = velocityFactor(nt.vel);
      let target = (P.hold + (1 - P.hold) * Math.pow(vf, 0.85)) * (vf > 0.97 ? 1 : depthVar);
      target = clamp(target, 0.2, 1);
      const atk = lerp(P.attackSlow, P.attackFast, Math.pow(vf, 0.8)) * (1 + jit);
      const dur = Math.max(0.004, atk * clamp((target - Math.max(h, 0)) / target, 0.25, 1));
      const hard = clamp((vf - 0.5) / 0.5, 0, 1);
      seg = { kind: 0, t0: e.t, h0: h, target, dur, vf, amp: P.bottomOut * Math.pow(hard, 1.4) * (target > 0.95 ? 1 : 0) };
    } else {
      held--;
      if (held <= 0) {
        held = 0;
        const base = lerp(P.releaseSlow, P.releaseFast, vf);
        const dur = Math.max(0.01, base * clamp(0.45 + 0.55 * Math.max(h, 0), 0.45, 1));
        seg = { kind: 1, t0: e.t, h0: Math.max(h, 0), target: 0, dur, vf, amp: P.overshoot * 1.1 * clamp(h, 0, 1) };
      }
    }
  }
  const last = seg as Seg | null;
  if (!last) return null;
  const d = evalSeg(last, t);
  if (last.kind === 1 && t - last.t0 > last.dur + 0.2) return null;
  return { d, vf: last.vf, held: held > 0, ref };
}

/* ------------------------------------------------------------------ *
 *  Light envelope of a key (see header). lit ∈ [0,1], flash ∈ [0,1].
 * ------------------------------------------------------------------ */

export interface KeyLight<T = unknown> {
  lit: number; // sustained glow + afterglow
  flash: number; // ignition flash, ~150 ms after the strike
  vf: number; // velocity factor of the note that owns the light
  ref: T; // that note (its colour tints the key)
}

const smooth01 = (x: number) => {
  const q = x < 0 ? 0 : x > 1 ? 1 : x;
  return q * q * (3 - 2 * q);
};

/**
 * `notes` sorted by start. `afterglow` = decay time constant (s) after the note ends,
 * `eps` = the strike tolerance the lane uses, so the light ignites on the very frame the note lands.
 * Returns null when the key carries no visible light.
 */
export function keyLightAt<T>(notes: KeyNote<T>[], t: number, afterglow: number, eps: number, ante = 0): KeyLight<T> | null {
  let lit = 0;
  let flash = 0;
  let vf = 0;
  let ref: T | null = null;
  const tau = Math.max(0.01, afterglow);
  for (let i = 0; i < notes.length; i++) {
    const nt = notes[i];
    const t0 = nt.start - eps;
    if (t < t0 - ante) break;
    const v = velocityFactor(nt.vel);
    const sustain = 0.55 + 0.45 * v; // harder strike → clearly brighter key (pp ≈ 0.57, mf ≈ 0.78, ff = 1)
    const level = (a: number) => sustain * (0.88 + 0.12 * Math.exp(-a / 0.6)) * smooth01(a / 0.028);
    // the light starts to build while the finger is already pressing (the key leaves its rest `ante` before the sound),
    // so a key never shows a shaded-but-dark frame; the flash itself stays locked to the instant the note lands
    const pre = ante > 0 && t < t0 ? 0.5 * sustain * smooth01((t - (t0 - ante)) / ante) : 0;
    if (t < t0) {
      if (pre > lit) {
        lit = pre;
        ref = nt.ref;
        vf = v;
      }
      continue;
    }
    const end = Math.max(nt.end, t0 + 0.03);
    const L = Math.max(0.5 * sustain * (t < t0 + ante ? 1 : 0), t < end ? level(t - t0) : level(end - t0) * Math.exp(-(t - end) / tau));
    const a = t - t0;
    const F = (0.5 + 0.5 * v) * Math.exp(-a / 0.085) * smooth01(a / 0.01);
    if (L >= lit - 1e-9) {
      lit = L;
      ref = nt.ref;
      vf = v;
    }
    if (F > flash) flash = F;
  }
  if (ref === null || (lit < 0.003 && flash < 0.003)) return null;
  return { lit, flash, vf, ref };
}
