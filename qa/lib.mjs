import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
let _c=null;try{_c=require("playwright").chromium}catch(e){}
export const chromium=_c;
export const { PNG } = require("pngjs");
import fs from "fs";
import http from "http";

export function varLen(n){const b=[n&0x7f];n>>=7;while(n>0){b.unshift((n&0x7f)|0x80);n>>=7;}return b;}
/** notes: [{key(midi), start(s), end(s), vel}] -> base64 SMF (120bpm, 480ppq => 960 ticks/s) */
export function makeMidi(notes){
  const ev=[];
  for(const n of notes){ev.push({t:Math.round(n.start*960),d:[0x90,n.key,n.vel]});ev.push({t:Math.round(n.end*960),d:[0x80,n.key,0]});}
  ev.sort((a,b)=>a.t-b.t||(a.d[0]===0x80?-1:1));
  let last=0;const tr=[0,0xff,0x51,3,0x07,0xa1,0x20];
  for(const e of ev){tr.push(...varLen(e.t-last),...e.d);last=e.t;}
  tr.push(0,0xff,0x2f,0);
  const hdr=[0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,0x01,0xe0];
  const len=tr.length;
  const buf=[...hdr,0x4d,0x54,0x72,0x6b,(len>>24)&255,(len>>16)&255,(len>>8)&255,len&255,...tr];
  return Buffer.from(buf).toString("base64");
}
export async function serve(dir){
  const srv=http.createServer((q,r)=>{r.setHeader("content-type","text/html");r.end(fs.readFileSync(dir+"/index.html"));});
  await new Promise(r=>srv.listen(0,r));return {srv,url:`http://127.0.0.1:${srv.address().port}/?automation=1`};
}
export async function open(browser,url){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const logs=[];page.on("console",m=>logs.push(m.type()+": "+m.text()));page.on("pageerror",e=>logs.push("pageerror: "+e.message));
  await page.goto(url);
  await page.waitForFunction(()=>window.FahhMIDI&&window.FahhMIDI.isReady(),null,{timeout:60000});
  return {page,logs};
}
export async function frame(page,o){
  const d=await page.evaluate(async o=>await window.FahhMIDI.renderFrame(o),o);
  return PNG.sync.read(Buffer.from(d.split(",")[1],"base64"));
}
export function crop(png,x,y,w,h,scale=1){
  x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));w=Math.min(Math.round(w),png.width-x);h=Math.min(Math.round(h),png.height-y);
  const o=new PNG({width:w*scale,height:h*scale});
  for(let j=0;j<h*scale;j++)for(let i=0;i<w*scale;i++){const s=((y+(j/scale|0))*png.width+x+(i/scale|0))*4,d=(j*o.width+i)*4;
    o.data[d]=png.data[s];o.data[d+1]=png.data[s+1];o.data[d+2]=png.data[s+2];o.data[d+3]=255;}
  return o;
}
export function hstack(imgs,gap=6){
  const H=Math.max(...imgs.map(i=>i.height)),W=imgs.reduce((a,i)=>a+i.width+gap,-gap);
  const o=new PNG({width:W,height:H});o.data.fill(0);for(let i=3;i<o.data.length;i+=4)o.data[i]=255;
  let x=0;for(const im of imgs){PNG.bitblt(im,o,0,0,im.width,im.height,x,0);x+=im.width+gap;}return o;
}
export function vstack(imgs,gap=6){
  const W=Math.max(...imgs.map(i=>i.width)),H=imgs.reduce((a,i)=>a+i.height+gap,-gap);
  const o=new PNG({width:W,height:H});o.data.fill(0);for(let i=3;i<o.data.length;i+=4)o.data[i]=255;
  let y=0;for(const im of imgs){PNG.bitblt(im,o,0,0,im.width,im.height,0,y);y+=im.height+gap;}return o;
}
export const save=(png,p)=>fs.writeFileSync(p,PNG.sync.write(png));
// white-key index of midi note relative to A0 (midi 21)
export const WHITE=[0,0,1,1,2,3,3,4,4,5,5,6];
export function whiteIdx(m){const i=m-21;return Math.floor((i+9)/12)*7+WHITE[(i+9)%12]-WHITE[9]*0- (0);}
export function sheet(files,out,gap=6){const imgs=files.map(f=>PNG.sync.read(fs.readFileSync(f)));save(hstack(imgs,gap),out);}
