import {PNG} from "./lib.mjs";
import {scenes,midiB64} from "./scenes.mjs";
import crypto from "crypto";
const E=await import("./node/entry.bundle.mjs?v"+Date.now());
const sg=E.song(Buffer.from(midiB64,"base64"));
const dflt=E.settings({}),old=E.settings({"render.finish.keyPhysics":false});
const md5=b=>crypto.createHash("md5").update(b).digest("hex");
const W=1920,H=1080;// 4. geometry: key boundaries in an unpressed frame
const A=PNG.sync.read(E.render(sg,.2,W,H,old).png),B=PNG.sync.read(E.render(sg,.2,W,H,dflt).png);
function gaps(P,y){const r=[];let prev=999;for(let x=0;x<W;x++){const i=(y*W+x)*4;const l=P.data[i]+P.data[i+1]+P.data[i+2];if(l<150&&prev>=150)r.push(x);prev=l}return r}
const y=1040;const ga=gaps(A,y),gb=gaps(B,y);console.log("unpressed gap columns at y=1040: legacy",ga.length,"new",gb.length,"identical:",JSON.stringify(ga)===JSON.stringify(gb));
let blackA=0;{const yy=830;const g2=gaps(A,yy),g3=gaps(B,yy);console.log("black-key edges at y=830: identical:",JSON.stringify(g2)===JSON.stringify(g3),g2.length)}
// 5. settings round trip + old JSON import
const exp=E.exportDocument(dflt);const r=E.applyPatch(E.freshDefaults(),JSON.parse(JSON.stringify(exp)).settings??exp);
console.log("export/import round trip rejected:",r.rejected.length,"new keys present:",["keyPhysics","pressHold","lightAngle","cueNose"].map(k=>r.doc.render.finish[k]).join(","));
const oldJson={render:{finish:{keyGrain:1.4,cheekBlocks:1},keys:{pressDepth:1.5}}};const r2=E.applyPatch(E.freshDefaults(),oldJson);console.log("legacy json import ok:",r2.rejected.length===0,"defaults filled:",r2.doc.render.finish.pressHold);
const clampTest=E.applyPatch(E.freshDefaults(),{"render.finish.cueNose":99,"render.finish.lightAngle":-500});console.log("clamped:",clampTest.doc.render.finish.cueNose,clampTest.doc.render.finish.lightAngle,"rejected",clampTest.rejected.length);
