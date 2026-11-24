import { makeMidi } from "./lib.mjs";
const N = []; const add = (key, start, end, vel = 90) => N.push({ key, start, end, vel });
add(48, 0.2, 1.4, 95); add(52, 0.2, 1.4, 95); add(55, 0.2, 1.4, 95); add(60, 0.2, 1.4, 100); add(64, 0.2, 1.4, 100); add(67, 0.2, 1.4, 100);   // two-hand chord
for (let i = 0; i < 16; i++) add(61 + i, 1.6 + i * 0.105, 1.6 + i * 0.105 + 0.16, 70 + i * 3);                                                       // fast chromatic run
for (let i = 0; i < 10; i++) add(64, 3.5 + i * 0.1, 3.5 + i * 0.1 + 0.07, 110);                                                                    // repeated notes on one key (re-strike while returning)
add(66, 5.0, 5.9, 30); add(70, 5.0, 5.9, 75); add(73, 5.0, 5.9, 125);                                                                               // pp / mf / ff on black keys
export const passageB64 = makeMidi(N);
