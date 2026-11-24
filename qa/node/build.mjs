import { createRequire } from "module";
const require = createRequire("/tmp/pw/");
const esbuild = require("esbuild");
await esbuild.build({ entryPoints: ["qa/node/entry.ts"], bundle: true, platform: "node", format: "esm", outfile: "qa/node/entry.bundle.mjs", external: ["@napi-rs/canvas"], logLevel: "error", loader: { ".mid": "empty" } });
