// one synthetic song holding every test scene; each scene lives in its own time slot
import {makeMidi} from "./lib.mjs";
const N=[];const add=(key,start,end,vel=90)=>N.push({key,start,end,vel});
// scene times
add(60,2.0,3.5);                                   // single white C4 (render 3.0)
add(61,4.0,5.5);                                   // single black C#4 (render 5.0)
add(60,6.0,7.5);add(64,6.0,7.5);add(67,6.0,7.5);   // C-E-G (7.0)
for(let i=0;i<13;i++)add(60+i,8.0+0.07*i,9.2);     // chromatic run (8.6)
add(48,10.0,11.5,25);add(50,10.0,11.5,70);add(52,10.0,11.5,120);add(54,10.0,11.5,25);add(56,10.0,11.5,120); // vel (11.0)
add(60,12.0,13.5,70);                              // attack frames 12.0.. release 13.5..
add(21,16.0,17.5);add(60,16.0,17.5);add(108,16.0,17.5); // extremes (17.0)
for(let i=0;i<10;i++)add(65,18.0+i*0.11,18.0+i*0.11+0.07,100); // fast repeated notes F4
add(62,20.0,21.5,127);add(63,20.0,21.5,127);add(66,20.0,21.5,127);add(65,20.0,21.5,127); // ff cluster (21.0)
export const scenes={
 up:{t:0.2},c4:{t:3.0,key:60},c4s:{t:5.0,key:61},cEG:{t:7.0,key:64},run:{t:8.6,key:66},vel:{t:11.0,key:53},
 att1:{t:12.012,key:60},att2:{t:12.03,key:60},att3:{t:12.06,key:60},hold:{t:12.9,key:60},rel1:{t:13.52,key:60},rel2:{t:13.56,key:60},rel3:{t:13.62,key:60},
 a0:{t:17.0,key:21},mid:{t:17.0,key:60},c8:{t:17.0,key:108},cluster:{t:21.0,key:64},
};
export const midiB64=makeMidi(N);
