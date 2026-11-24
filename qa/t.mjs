const E=await import("./node/entry.bundle.mjs");
const d=E.settings({"render.finish.keyPhysics":false,"render.glow.keyWash":0});
console.log(d.render.finish.keyPhysics,d.render.glow.keyWash);
