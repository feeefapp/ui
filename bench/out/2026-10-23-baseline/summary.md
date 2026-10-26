# Performance bench: baseline

Web: 2026-10-23T13:51:17.556Z, 1280×800 @2x, median of 3 reps. Machine 8 CPUs, load avg 51.4 / 27.8 / 24.5.

- **chrome** Chrome/155.0.8059.82: backdrop-filter painted: true
- **firefox** firefox/158.0.1: backdrop-filter painted: false. ⚠ Backdrop filters are not painted in this automation mode: Firefox numbers measure main-thread work only, not glass compositing.

Flutter: 2026-10-23T14:17:04.417032Z, macos Version 26.4.1 (Build 25E253) profile. Build = UI thread, raster = raster thread, per frame (ms). missed = build or raster > 16.7 ms. Each window includes a 400 ms tail. Idle = 3 s with nothing moving: ideally 0 frames.

## Steady state (3 s idle, nothing moving; ideally all zero)

| platform | page | frames drawn | page rAF callbacks | infinite animations | main-thread ms (trace / Flutter build) | task ms (CDP) | script ms | raster ms (Flutter) |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| chrome | components/glass-container/examples | 45 | 221 | 0 | 268.5 | 277.1 | 193.1 | – |
| chrome | components/actions-bar/examples | 45 | 215 | 0 | 246.9 | 259.7 | 186.3 | – |
| chrome | components/segmented-control/examples | 46 | 210 | 0 | 332.2 | 359.7 | 254.3 | – |
| chrome | components/toolbar/examples | 45 | 215 | 0 | 239.2 | 257.1 | 188.1 | – |
| chrome | components/switch/examples | 45 | 209 | 0 | 225.3 | 237.5 | 175.9 | – |
| chrome | foundations/glass-reflections | 46 | 204 | 0 | 298.1 | 320.8 | 234.4 | – |
| chrome | guidelines/patterns | 46 | 198 | 0 | 301.7 | 337.2 | 207.8 | – |
| chrome | get-started/introduction | 45 | 216 | 0 | 229.7 | 264.2 | 191.1 | – |
| firefox | components/glass-container/examples | – | 196 | 0 | – | – | – | – |
| firefox | components/actions-bar/examples | – | 207 | 0 | – | – | – | – |
| firefox | components/segmented-control/examples | – | 208 | 0 | – | – | – | – |
| firefox | components/toolbar/examples | – | 212 | 0 | – | – | – | – |
| firefox | components/switch/examples | – | 205 | 0 | – | – | – | – |
| firefox | foundations/glass-reflections | – | 203 | 0 | – | – | – | – |
| firefox | guidelines/patterns | – | 197 | 0 | – | – | – | – |
| firefox | get-started/introduction | – | 213 | 0 | – | – | – | – |
| flutter | harness/providers | 0 | – | – | 0 | – | – | 0 |
| flutter | components/glass-container | 0 | – | – | 0 | – | – | 0 |
| flutter | components/actions-bar | 0 | – | – | 0 | – | – | 0 |
| flutter | components/segmented-control | 0 | – | – | 0 | – | – | 0 |
| flutter | components/toolbar | 0 | – | – | 0 | – | – | 0 |
| flutter | components/switch | 0 | – | – | 0 | – | – | 0 |
| flutter | guidelines/patterns | 0 | – | – | 0 | – | – | 0 |
| flutter | baseline/text | 0 | – | – | 0 | – | – | 0 |

Web frames drawn = Chrome trace DrawFrame events (Firefox: not available). Page rAF callbacks = the page's own requestAnimationFrame callbacks (the bench's recorder is off while idle).

Idle pages that keep working:

- **chrome components/glass-container/examples**: 45 frames, 221 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-CMkY3tOd.js:30908:14)`
  - rAF 42× from `GlassScene.requestSample (index-CMkY3tOd.js:34672:24) < index-CMkY3tOd.js:34572:77`
- **chrome components/actions-bar/examples**: 45 frames, 215 rAF callbacks, 0 infinite animations
  - rAF 180× from `animate (index-CMkY3tOd.js:30908:14)`
  - rAF 36× from `GlassScene.requestSample (index-CMkY3tOd.js:34672:24) < index-CMkY3tOd.js:34572:77`
- **chrome components/segmented-control/examples**: 46 frames, 210 rAF callbacks, 0 infinite animations
  - rAF 177× from `animate (index-CMkY3tOd.js:30908:14)`
  - rAF 30× from `GlassScene.requestSample (index-CMkY3tOd.js:34672:24) < index-CMkY3tOd.js:34572:77`
- **chrome components/toolbar/examples**: 45 frames, 215 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-CMkY3tOd.js:30908:14)`
  - rAF 36× from `GlassScene.requestSample (index-CMkY3tOd.js:34672:24) < index-CMkY3tOd.js:34572:77`
- **chrome components/switch/examples**: 45 frames, 209 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-CMkY3tOd.js:30908:14)`
  - rAF 30× from `GlassScene.requestSample (index-CMkY3tOd.js:34672:24) < index-CMkY3tOd.js:34572:77`
- **chrome foundations/glass-reflections**: 46 frames, 204 rAF callbacks, 0 infinite animations
  - rAF 180× from `animate (index-CMkY3tOd.js:30908:14)`
  - rAF 24× from `GlassScene.requestSample (index-CMkY3tOd.js:34672:24) < index-CMkY3tOd.js:34572:77`
- **chrome guidelines/patterns**: 46 frames, 198 rAF callbacks, 0 infinite animations
  - rAF 180× from `animate (index-CMkY3tOd.js:30908:14)`
  - rAF 18× from `GlassScene.requestSample (index-CMkY3tOd.js:34672:24) < index-CMkY3tOd.js:34572:77`
- **chrome get-started/introduction**: 45 frames, 216 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-CMkY3tOd.js:30908:14)`
  - rAF 36× from `GlassScene.requestSample (index-CMkY3tOd.js:34672:24) < index-CMkY3tOd.js:34572:77`
- **firefox components/glass-container/examples**: – frames, 196 rAF callbacks, 0 infinite animations
  - rAF 180× from `animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14`
  - rAF 42× from `requestSample@index-CMkY3tOd.js:34672:24 < GlassScene/this.visibility</this.sampleTimer<@index-CMkY3tOd.js:34572:77 < setInterval handler*GlassScene/this.visibility<@index-CMkY3tOd.js:34571:52`
- **firefox components/actions-bar/examples**: – frames, 207 rAF callbacks, 0 infinite animations
  - rAF 155× from `animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14`
  - rAF 36× from `requestSample@index-CMkY3tOd.js:34672:24 < GlassScene/this.visibility</this.sampleTimer<@index-CMkY3tOd.js:34572:77 < setInterval handler*GlassScene/this.visibility<@index-CMkY3tOd.js:34571:52`
- **firefox components/segmented-control/examples**: – frames, 208 rAF callbacks, 0 infinite animations
  - rAF 176× from `animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14`
  - rAF 30× from `requestSample@index-CMkY3tOd.js:34672:24 < GlassScene/this.visibility</this.sampleTimer<@index-CMkY3tOd.js:34572:77 < setInterval handler*GlassScene/this.visibility<@index-CMkY3tOd.js:34571:52`
- **firefox components/toolbar/examples**: – frames, 212 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14`
  - rAF 30× from `requestSample@index-CMkY3tOd.js:34672:24 < GlassScene/this.visibility</this.sampleTimer<@index-CMkY3tOd.js:34572:77 < setInterval handler*GlassScene/this.visibility<@index-CMkY3tOd.js:34571:52`
- **firefox components/switch/examples**: – frames, 205 rAF callbacks, 0 infinite animations
  - rAF 173× from `animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14`
  - rAF 30× from `requestSample@index-CMkY3tOd.js:34672:24 < GlassScene/this.visibility</this.sampleTimer<@index-CMkY3tOd.js:34572:77 < setInterval handler*GlassScene/this.visibility<@index-CMkY3tOd.js:34571:52`
- **firefox foundations/glass-reflections**: – frames, 203 rAF callbacks, 0 infinite animations
  - rAF 180× from `animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14`
  - rAF 24× from `requestSample@index-CMkY3tOd.js:34672:24 < GlassScene/this.visibility</this.sampleTimer<@index-CMkY3tOd.js:34572:77 < setInterval handler*GlassScene/this.visibility<@index-CMkY3tOd.js:34571:52`
- **firefox guidelines/patterns**: – frames, 197 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14`
  - rAF 18× from `requestSample@index-CMkY3tOd.js:34672:24 < GlassScene/this.visibility</this.sampleTimer<@index-CMkY3tOd.js:34572:77 < setInterval handler*GlassScene/this.visibility<@index-CMkY3tOd.js:34571:52`
- **firefox get-started/introduction**: – frames, 213 rAF callbacks, 0 infinite animations
  - rAF 177× from `animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14 < animate@index-CMkY3tOd.js:30908:14`
  - rAF 36× from `requestSample@index-CMkY3tOd.js:34672:24 < GlassScene/this.visibility</this.sampleTimer<@index-CMkY3tOd.js:34572:77 < setInterval handler*GlassScene/this.visibility<@index-CMkY3tOd.js:34571:52`

## Interactions

Web: rAF frame deltas (ms). Flutter: build times (ms), raster in its own columns. `>16` = frames over budget (web: > 19.2 ms delta; Flutter: build or raster > 16.7 ms).

| platform | page | scenario | frames | p50 | p95 | max | >16 | >33 | task ms | script ms | layout+style ms | long tasks | raster p50/p95/max |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| chrome | components/glass-container/examples | scroll | 200 | 16.7 | 33.2 | 50 | 10 | 3 | 957.1 | 502.8 | 175.2 | 0 |  |
| chrome | components/glass-container/examples | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 296.9 | 203.6 | 8.3 | 0 |  |
| chrome | components/glass-container/examples | drag | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 634.1 | 323.6 | 86.1 | 0 |  |
| chrome | components/glass-container/examples | split | 144 | 16.7 | 16.8 | 16.8 | 0 | 0 | 908.9 | 561.4 | 83.9 | 0 |  |
| chrome | components/actions-bar/examples | scroll | 185 | 16.7 | 16.8 | 33.4 | 7 | 1 | 701.6 | 432.3 | 36 | 0 |  |
| chrome | components/actions-bar/examples | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 320 | 213.5 | 10.5 | 0 |  |
| chrome | components/actions-bar/examples | menu | 133 | 16.7 | 16.8 | 616.7 | 4 | 2 | 703.6 | 405 | 77 | 0 |  |
| chrome | components/segmented-control/examples | scroll | 200 | 16.7 | 33.3 | 33.4 | 18 | 2 | 952 | 600.8 | 59.4 | 0 |  |
| chrome | components/segmented-control/examples | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 325 | 216 | 9.7 | 0 |  |
| chrome | components/segmented-control/examples | drag | 127 | 16.7 | 16.8 | 33.3 | 1 | 0 | 868.2 | 345.2 | 168.3 | 0 |  |
| chrome | components/toolbar/examples | scroll | 197 | 16.7 | 16.8 | 33.4 | 7 | 1 | 737.1 | 484.4 | 43 | 0 |  |
| chrome | components/toolbar/examples | pointer | 120 | 16.7 | 16.7 | 16.8 | 0 | 0 | 282.6 | 196.4 | 8.1 | 0 |  |
| chrome | components/switch/examples | scroll | 179 | 16.7 | 16.8 | 33.3 | 3 | 0 | 573.3 | 372.2 | 28.5 | 0 |  |
| chrome | components/switch/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 273.6 | 191.4 | 8.8 | 0 |  |
| chrome | components/switch/examples | drag | 123 | 16.7 | 16.7 | 16.8 | 0 | 0 | 565.5 | 260.9 | 84.4 | 0 |  |
| chrome | foundations/glass-reflections | scroll | 198 | 16.7 | 16.8 | 50 | 5 | 2 | 831.1 | 480.8 | 111.3 | 1 |  |
| chrome | foundations/glass-reflections | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 367.7 | 251.4 | 16.1 | 0 |  |
| chrome | guidelines/patterns | scroll | 173 | 16.7 | 16.8 | 66.6 | 4 | 3 | 512.5 | 316.6 | 21.2 | 0 |  |
| chrome | guidelines/patterns | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 380.4 | 225.9 | 27 | 0 |  |
| chrome | guidelines/patterns | drag | 254 | 16.7 | 16.8 | 150 | 2 | 1 | 1668.2 | 642.4 | 213.3 | 0 |  |
| chrome | get-started/introduction | scroll | 155 | 16.7 | 16.8 | 16.8 | 0 | 0 | 209.6 | 151.9 | 0.2 | 0 |  |
| chrome | get-started/introduction | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 271.2 | 186.7 | 10.6 | 0 |  |
| firefox | components/glass-container/examples | scroll | 86 | 16.7 | 50 | 66.7 | 33 | 12 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | pointer | 100 | 16.7 | 33.3 | 50 | 18 | 4 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | drag | 71 | 16.7 | 50 | 83.3 | 34 | 12 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | split | 104 | 16.7 | 50.2 | 100 | 21 | 12 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | scroll | 98 | 16.7 | 50 | 50 | 16 | 5 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | pointer | 115 | 16.7 | 17.4 | 33.7 | 5 | 1 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | menu | 137 | 16.7 | 50 | 50.3 | 24 | 8 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | scroll | 92 | 16.7 | 66.7 | 83.3 | 25 | 10 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | pointer | 112 | 16.7 | 33.3 | 33.8 | 7 | 1 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | drag | 83 | 16.7 | 33.3 | 50 | 8 | 2 | – | – | – | 0 |  |
| firefox | components/toolbar/examples | scroll | 83 | 16.7 | 66.7 | 204.8 | 32 | 19 | – | – | – | 0 |  |
| firefox | components/toolbar/examples | pointer | 78 | 16.7 | 50.1 | 67.2 | 29 | 9 | – | – | – | 0 |  |
| firefox | components/switch/examples | scroll | 92 | 16.7 | 66.7 | 216.7 | 37 | 24 | – | – | – | 0 |  |
| firefox | components/switch/examples | pointer | 98 | 16.7 | 33.4 | 66.7 | 6 | 4 | – | – | – | 0 |  |
| firefox | components/switch/examples | drag | 87 | 16.7 | 66.7 | 66.7 | 24 | 12 | – | – | – | 0 |  |
| firefox | foundations/glass-reflections | scroll | 103 | 16.7 | 33.3 | 66.7 | 20 | 5 | – | – | – | 0 |  |
| firefox | foundations/glass-reflections | pointer | 106 | 16.7 | 33.3 | 66.7 | 10 | 4 | – | – | – | 0 |  |
| firefox | guidelines/patterns | scroll | 83 | 32.8 | 66.7 | 100 | 41 | 22 | – | – | – | 0 |  |
| firefox | guidelines/patterns | pointer | 72 | 33 | 50 | 83.3 | 36 | 12 | – | – | – | 0 |  |
| firefox | guidelines/patterns | drag | 155 | 33.2 | 83.3 | 145.5 | 75 | 44 | – | – | – | 0 |  |
| firefox | get-started/introduction | scroll | 105 | 16.7 | 33.3 | 49.8 | 11 | 1 | – | – | – | 0 |  |
| firefox | get-started/introduction | pointer | 118 | 16.7 | 17.1 | 33.3 | 2 | 0 | – | – | – | 0 |  |
| flutter | components/glass-container | scroll | 32 | 0.2 | 3 | 4.2 | 7 | 5 | – | – | – | – | 8.2/74.1/266.1 |
| flutter | components/glass-container | pointer | 96 | 1.5 | 2.4 | 4.8 | 2 | 1 | – | – | – | – | 9.2/15/45 |
| flutter | components/glass-container | drag | 69 | 2.1 | 2.7 | 4.1 | 3 | 1 | – | – | – | – | 8.7/14.7/139.2 |
| flutter | components/glass-container | split | 63 | 3.9 | 4.9 | 7.9 | 4 | 1 | – | – | – | – | 9/16.7/106.3 |
| flutter | components/actions-bar | scroll | 50 | 0.2 | 0.9 | 2 | 0 | 0 | – | – | – | – | 1.1/2.4/11.9 |
| flutter | components/actions-bar | pointer | 97 | 0.8 | 1 | 1.6 | 0 | 0 | – | – | – | – | 1.1/1.3/5.2 |
| flutter | components/actions-bar | menu | 109 | 1.6 | 2.6 | 10.5 | 0 | 0 | – | – | – | – | 1.6/3.7/5.6 |
| flutter | components/segmented-control | scroll | 50 | 0.2 | 1.5 | 1.5 | 1 | 1 | – | – | – | – | 1.3/6.3/35.6 |
| flutter | components/segmented-control | pointer | 96 | 0.8 | 1.1 | 2 | 0 | 0 | – | – | – | – | 1.4/1.9/13.1 |
| flutter | components/segmented-control | drag | 73 | 1.4 | 1.7 | 3.7 | 1 | 0 | – | – | – | – | 1.6/4.2/30 |
| flutter | components/toolbar | scroll | 44 | 0.2 | 2.7 | 5.8 | 1 | 1 | – | – | – | – | 2.3/11.9/230.8 |
| flutter | components/toolbar | pointer | 92 | 1.9 | 3.9 | 5.2 | 1 | 1 | – | – | – | – | 2.3/4.2/63.6 |
| flutter | components/switch | scroll | 52 | 0.2 | 0.3 | 0.8 | 2 | 1 | – | – | – | – | 3/9.9/68.8 |
| flutter | components/switch | drag | 77 | 1 | 1.6 | 2 | 1 | 1 | – | – | – | – | 2.7/5.3/46.6 |
| flutter | guidelines/patterns | scroll | 87 | 2.8 | 5.6 | 11.5 | 3 | 1 | – | – | – | – | 2.7/9.5/106.5 |
| flutter | guidelines/patterns | pointer | 97 | 2.8 | 4.6 | 8.7 | 1 | 0 | – | – | – | – | 2.8/5.2/31 |
| flutter | guidelines/patterns | drag | 184 | 3.3 | 3.8 | 8.2 | 1 | 0 | – | – | – | – | 1.9/2.6/18.4 |
| flutter | baseline/text | scroll | 46 | 0.3 | 0.4 | 0.4 | 0 | 0 | – | – | – | – | 0.6/2.6/6.8 |

Worst by p95 (Flutter: the worse of build and raster):

- firefox guidelines/patterns drag: p95 83.3 ms, max 145.5 ms, 75 over budget
- flutter components/glass-container scroll: p95 3 build / 74.1 raster ms, max 266.1 ms, 7 over budget
- firefox components/switch/examples scroll: p95 66.7 ms, max 216.7 ms, 37 over budget
- firefox components/segmented-control/examples scroll: p95 66.7 ms, max 83.3 ms, 25 over budget
- firefox guidelines/patterns scroll: p95 66.7 ms, max 100 ms, 41 over budget
- firefox components/toolbar/examples scroll: p95 66.7 ms, max 204.8 ms, 32 over budget
- firefox components/switch/examples drag: p95 66.7 ms, max 66.7 ms, 24 over budget
- firefox components/glass-container/examples split: p95 50.2 ms, max 100 ms, 21 over budget
- firefox components/toolbar/examples pointer: p95 50.1 ms, max 67.2 ms, 29 over budget
- firefox guidelines/patterns pointer: p95 50 ms, max 83.3 ms, 36 over budget
