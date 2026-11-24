// Synthetic song for the press-look lab: every scene lives in its own time slot.
import { makeMidi } from "./lib.mjs";
const N = [];
const add = (key, start, end, vel = 90) => N.push({ key, start, end, vel });
add(60, 2, 3.5); add(64, 2, 3.5); add(67, 2, 3.5);                                      // triad (right hand, amber)  t=2.9
add(48, 5, 6.5); add(52, 5, 6.5); add(55, 5, 6.5); add(66, 5, 6.5); add(70, 5, 6.5); add(73, 5, 6.5); add(62, 5, 6.5); // mixed teal + amber, white + black  t=5.9
add(72, 8, 9.5, 25); add(74, 8, 9.5, 70); add(76, 8, 9.5, 120);                         // pp / mf / ff  t=8.8
add(61, 11, 12.5, 100); add(49, 11, 12.5, 100);                                         // single black keys, amber + teal  t=11.8
add(64, 14, 14.8, 110);                                                                  // E4 attack / hold / release / afterglow filmstrip from 13.98
for (const k of [60, 62, 64, 65, 67, 69, 71, 72]) add(k, 20, 21.5, 95);                  // a row of adjacent white keys  t=20.8
for (let i = 0; i < 12; i++) add(55 + i, 23 + i * 0.09, 24.6, 80 + i * 3);               // chromatic run, both colours  t=24.2
add(21, 27, 28.5, 100); add(60, 27, 28.5, 100); add(108, 27, 28.5, 100);                // extremes  t=27.8
export const scenes = {
  triad: { t: 2.9, key: 64, span: 9 },
  mixed: { t: 5.9, key: 62, span: 14 },
  vel: { t: 8.8, key: 74, span: 9 },
  black: { t: 11.8, key: 61, span: 9 },
  blackT: { t: 11.8, key: 49, span: 9 },
  row: { t: 20.8, key: 66, span: 12 },
  run: { t: 24.2, key: 60, span: 14 },
  ext: { t: 27.8, key: 60, span: 9 },
  rest: { t: 0.3, key: 60, span: 9 },
};
export const midiB64 = makeMidi(N);
