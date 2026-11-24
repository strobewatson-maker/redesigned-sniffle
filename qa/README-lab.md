# qa/ — pressed-key lab (dev tooling, git-ignored)

One-time setup (tools live outside the repo):

    mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i @napi-rs/canvas pngjs esbuild puppeteer-core @sparticuz/chromium
    # make the Chromium binary available at /tmp/chromium (the @sparticuz package unpacks it there on first launch)
    cd <repo> && npm i && mkdir -p node_modules/@napi-rs && ln -s /tmp/pw/node_modules/@napi-rs/* node_modules/@napi-rs/ && ln -s /tmp/pw/node_modules/pngjs node_modules/pngjs

Fast Skia harness (no browser):

    node qa/node/build.mjs                                                   # bundle the renderer
    node qa/lab.mjs qa/node/entry.bundle.mjs /tmp/out all 1920x1080 '{}' 3   # scenes → full frames + 3x keyboard crops
    node qa/strip.mjs qa/node/entry.bundle.mjs - /tmp/strip.png 64 838 847 1 3   # filmstrip of 60 fps frames
    node qa/probe.mjs <png> <x> <y0> <y1> <step>    node qa/diff.mjs a.png b.png    node qa/lum.mjs <png> x0 x1 y0 y1

Real browser (after `npm run build`):

    node qa/chrome.mjs $PWD/dist/index.html /tmp/out all 1920x1080
    node qa/chrome_checks.mjs $PWD/dist/index.html            # determinism, settings, timing, H.264 support
    node qa/chrome_export.mjs $PWD/dist/index.html /tmp/p.mp4 1280x720 60   # real MP4 of a fast passage
