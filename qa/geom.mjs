import {PNG} from "./lib.mjs";
import {midiB64} from "./scenes.mjs";
const E=await import("./node/entry.bundle.mjs?v"+Date.now());
const sg=E.song(Buffer.from(midiB64,"base64"));
for(const [W,H] of [[1280,720],[1920,1080],[3840,2160]]){
  const A=PNG.sync.read(E.render(sg,.2,W,H,E.settings({"render.finish.keyPhysics":false})).png),B=PNG.sync.read(E.render(sg,.2,W,H,E.settings({})).png);
  const lum=(P,x,y)=>{const i=(y*W+x)*4;return P.data[i]+P.data[i+1]+P.data[i+2]};
  const wkw=W/52;
  // white gaps: argmin of luminance around each key boundary on a row in the lower (white-only) part of the keys
  const yw=Math.round(H*0.94),yb=Math.round(H*0.78);
  let wd=0,bd=0,n=0;
  for(let i=1;i<52;i++){const c=Math.round(i*wkw);let ma=1e9,xa=0,mb=1e9,xb=0;for(let x=c-4;x<=c+4;x++){const la=lum(A,x,yw),lb=lum(B,x,yw);if(la<ma){ma=la;xa=x}if(lb<mb){mb=lb;xb=x}}wd=Math.max(wd,Math.abs(xa-xb));n++}
  // black keys: columns where the 1-px black outline sits (dark run start) at a row inside the black keys
  const edges=(P)=>{const r=[];for(let x=1;x<W;x++){const l=lum(P,x,yb),lp=lum(P,x-1,yb);if(l<60&&lp>=60)r.push(x)}return r};
  const ea=edges(A),eb=edges(B);
  const sil=(P)=>{const r=[];for(let x=1;x<W;x++){const l=lum(P,x,yb),lp=lum(P,x-1,yb);if((l<330)!==(lp<330))r.push(x)}return r};
  const sa=sil(A);let bm=0;
  for(const x0 of sa){let ma=1e9,xa=0,mb=1e9,xb=0;for(let x=x0-5;x<=x0+5;x++){const la=lum(A,x,yb),lb=lum(B,x,yb);if(la<ma){ma=la;xa=x}if(lb<mb){mb=lb;xb=x}}bm=Math.max(bm,Math.abs(xa-xb))}
  const sb=sa;
  console.log(`${W}x${H}: white-gap max shift ${wd}px over ${n} gaps; black silhouette edges legacy ${sa.length} new ${sb.length}, max shift ${bm}px`);
}
