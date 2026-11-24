import {midiB64} from "./scenes.mjs";
const E=await import("./node/entry.bundle.mjs?v"+Date.now());
const sg=E.song(Buffer.from(midiB64,"base64"));
const [W,H]=process.argv[2].split("x").map(Number);
const times=[8.5,8.6,8.7,10.9,11,17,21,21.2,5,7,3,12.5,13.55];
for(const [name,patch] of [["legacy",{"render.finish.keyPhysics":false}],["new",{}]]){
  const d=E.settings(patch);E.render(sg,8.6,W,H,d);const ts=[];
  for(const t of times)ts.push(E.render(sg,t,W,H,d).ms);ts.sort((a,b)=>a-b);
  console.log(W+"x"+H,name,"mean",(ts.reduce((a,b)=>a+b)/ts.length).toFixed(1),"median",ts[ts.length>>1].toFixed(1),"max",ts[ts.length-1].toFixed(1));
}
