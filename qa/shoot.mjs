import {PNG,crop,hstack,vstack,save} from "./lib.mjs";
import {scenes,midiB64} from "./scenes.mjs";
import {createRequire} from "module";
import fs from "fs";
const out=process.argv[2]||"qa/after";fs.mkdirSync(out,{recursive:true});
const only=process.argv[3]?process.argv[3].split(","):null;
const sizes=(process.argv[4]||"1920x1080").split(",").map(s=>s.split("x").map(Number));
const patch=process.argv[5]?JSON.parse(process.argv[5]):{};
const E=await import("./node/entry.bundle.mjs?"+Date.now());
const sg=E.song(Buffer.from(midiB64,"base64"));const doc=E.settings(patch);
const black=m=>[1,3,6,8,10].includes(m%12);
for(const [W,H] of sizes)for(const [name,sc] of Object.entries(scenes)){
  if(only&&!only.includes(name))continue;
  const r=E.render(sg,sc.t,W,H,doc);fs.writeFileSync(`${out}/${name}_${W}.png`,r.png);
  if(sc.key){const wk=W/52;const i=sc.key-21,pc=(i+9)%12,wi=Math.floor((i+9)/12)*7+[0,0,1,1,2,3,3,4,4,5,5,6][pc];
    const cx=(wi-5+(black(sc.key)?1:0.5))*wk;const cw=wk*7,x0=Math.min(Math.max(0,cx-cw/2),W-cw);
    const png=PNG.sync.read(r.png);const sc4=Math.round(4*1080/H*(H/1080)>=1?4:4);
    save(crop(png,x0,H*0.60,cw,H*0.40,sc4*(1080/H>1?1:1)),`${out}/${name}_${W}_crop.png`);}
}
