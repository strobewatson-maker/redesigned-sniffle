import {PNG} from "./lib.mjs";
import {scenes,midiB64} from "./scenes.mjs";
import crypto from "crypto";
const E=await import("./node/entry.bundle.mjs?v"+Date.now());
const sg=E.song(Buffer.from(midiB64,"base64"));
const dflt=E.settings({}),old=E.settings({"render.finish.keyPhysics":false});
const md5=b=>crypto.createHash("md5").update(b).digest("hex");
// 1. motion curve for single notes at 60 fps
const P={hold:.72,attackSlow:.11,attackFast:.018,bottomOut:.045,releaseSlow:.14,releaseFast:.07,overshoot:.03,anticipation:.02,variation:1};
function curve(vel,start,end,extra=[]){const n=[{start,end,vel,ref:0},...extra];const out=[];for(let i=-3;i<40;i++){const t=start-0.05+i/60*1;const r=E.keyDepressAt(n,t,40,P,.004+.02);out.push(r?r.d:0)}return out}
for(const v of [25,70,127]){const c=curve(v,2,2.6);const att=c.slice(0,16).map(x=>x.toFixed(2)).join(" ");console.log("vel",v,"attack@60fps:",att);}
{const n=[{start:2,end:2.6,vel:127,ref:0}];let mx=0,mn=0,prev=0,mono=true,pk=0;for(let t=1.9;t<2.5;t+=1/240){const d=E.keyDepressAt(n,t,40,P,.024)?.d??0;mx=Math.max(mx,d);if(t<2.05&&d<prev-1e-9)mono=false;prev=d}
for(let t=2.55;t<3.0;t+=1/240){const d=E.keyDepressAt(n,t,40,P,.024)?.d??0;mn=Math.min(mn,d)}
console.log("ff: peak",mx.toFixed(3),"monotonic attack(before bounce)",mono,"release overshoot min",mn.toFixed(4));
let jump=0,pd=0;for(let t=1.9;t<3.2;t+=1/1000){const d=E.keyDepressAt(n,t,40,P,.024)?.d??0;jump=Math.max(jump,Math.abs(d-pd));pd=d}console.log("max per-ms step (continuity)",jump.toFixed(4));}
{// fast repeats: 10 notes 110ms apart, 70ms long
const n=[];for(let i=0;i<10;i++)n.push({start:2+i*.11,end:2.07+i*.11,vel:100,ref:0});let pd=0,mj=0,lo=9;for(let t=1.9;t<3.3;t+=1/1000){const d=E.keyDepressAt(n,t,40,P,.024)?.d??0;mj=Math.max(mj,Math.abs(d-pd));pd=d;if(t>2.2&&t<3.0)lo=Math.min(lo,d)}console.log("repeats: max step",mj.toFixed(4),"min d between repeats",lo.toFixed(3));}
// 2. determinism
const W=1920,H=1080;const f=(t,d=dflt)=>E.render(sg,t,W,H,d);
const a=md5(Buffer.from(f(8.6).rgba));for(let t=0;t<10;t+=0.25)f(t);const b=md5(Buffer.from(f(8.6).rgba));
console.log("determinism same-frame after other frames:",a===b);
// stepping vs direct at 60fps frame index
const fps=dflt.video.fps;const N=Math.round(8.6*fps);const tN=N/fps;
const direct=md5(Buffer.from(f(tN).rgba));for(let i=N-30;i<=N;i++)f(i/fps);const step=md5(Buffer.from(f(tN).rgba));console.log("seek vs sequential identical:",direct===step,"(fps",fps+")");
// 3. perf
function perf(doc,W,H){const ts=[];const times=[8.5,8.6,8.7,10.9,11,17,21,21.2,5,7,3,12.5,13.55];for(let r=0;r<(W>2000?1:3);r++)for(const t of (W>2000?[8.6,11,21,3,12.5]:times)){ts.push(E.render(sg,t,W,H,doc).ms)}ts.shift();ts.sort((x,y)=>x-y);return (ts.reduce((x,y)=>x+y)/ts.length).toFixed(1)+" ms (median "+ts[ts.length>>1].toFixed(1)+")"}
for(const [w,h] of [[1280,720],[1920,1080],[3840,2160]]){console.log(`perf ${w}x${h}  legacy ${perf(old,w,h)}  new ${perf(dflt,w,h)}`)}
// 4. geometry: key boundaries in an unpressed frame
const A=PNG.sync.read(E.render(sg,.2,W,H,old).png),B=PNG.sync.read(E.render(sg,.2,W,H,dflt).png);
function gaps(P,y){const r=[];let prev=999;for(let x=0;x<W;x++){const i=(y*W+x)*4;const l=P.data[i]+P.data[i+1]+P.data[i+2];if(l<150&&prev>=150)r.push(x);prev=l}return r}
const y=1040;const ga=gaps(A,y),gb=gaps(B,y);console.log("unpressed gap columns at y=1040: legacy",ga.length,"new",gb.length,"identical:",JSON.stringify(ga)===JSON.stringify(gb));
let blackA=0;{const yy=830;const g2=gaps(A,yy),g3=gaps(B,yy);console.log("black-key edges at y=830: identical:",JSON.stringify(g2)===JSON.stringify(g3),g2.length)}
// 5. settings round trip + old JSON import
const exp=E.exportDocument(dflt);const r=E.applyPatch(E.freshDefaults(),JSON.parse(JSON.stringify(exp)).settings??exp);
console.log("export/import round trip rejected:",r.rejected.length,"new keys present:",["keyPhysics","pressHold","lightAngle","cueNose"].map(k=>r.doc.render.finish[k]).join(","));
const oldJson={render:{finish:{keyGrain:1.4,cheekBlocks:1},keys:{pressDepth:1.5}}};const r2=E.applyPatch(E.freshDefaults(),oldJson);console.log("legacy json import ok:",r2.rejected.length===0,"defaults filled:",r2.doc.render.finish.pressHold);
const clampTest=E.applyPatch(E.freshDefaults(),{"render.finish.cueNose":99,"render.finish.lightAngle":-500});console.log("clamped:",clampTest.doc.render.finish.cueNose,clampTest.doc.render.finish.lightAngle,"rejected",clampTest.rejected.length);
