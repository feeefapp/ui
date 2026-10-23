# Performance bench: fixes

Web: 2026-10-23T16:51:03.855Z, 1280×800 @2x, median of 3 reps. Machine 8 CPUs, load avg 7.9 / 7.9 / 12.4.

- **chrome** Chrome/155.0.8059.82: backdrop-filter painted: true
- **firefox** firefox/158.0.1: backdrop-filter painted: false. ⚠ Backdrop filters are not painted in this automation mode: Firefox numbers measure main-thread work only, not glass compositing.

Flutter: 2026-10-23T17:23:00.926087Z, macos Version 26.4.1 (Build 25E253) profile. Build = UI thread, raster = raster thread, per frame (ms). missed = build or raster > 16.7 ms. Each window includes a 400 ms tail. Idle = 3 s with nothing moving: ideally 0 frames.

## Steady state (3 s idle, nothing moving; ideally all zero)

| platform | page | frames drawn | page rAF callbacks | infinite animations | main-thread ms (trace / Flutter build) | task ms (CDP) | script ms | raster ms (Flutter) |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| chrome | components/glass-container/examples | 47 | 92 | 0 | 197.7 | 201.5 | 134.2 | – |
| chrome | components/actions-bar/examples | 47 | 93 | 0 | 197.2 | 215.9 | 145.8 | – |
| chrome | components/segmented-control/examples | 45 | 90 | 0 | 194 | 196.1 | 133.2 | – |
| chrome | components/toolbar/examples | 47 | 94 | 0 | 208.1 | 205.2 | 142.9 | – |
| chrome | components/switch/examples | 46 | 92 | 0 | 198.7 | 200 | 144.4 | – |
| chrome | foundations/glass-reflections | 45 | 90 | 0 | 194.7 | 195.5 | 147.7 | – |
| chrome | guidelines/patterns | 47 | 93 | 0 | 204.3 | 207.1 | 133.6 | – |
| chrome | get-started/introduction | 45 | 90 | 0 | 200.9 | 201.3 | 148.4 | – |
| firefox | components/glass-container/examples | – | 94 | 0 | – | – | – | – |
| firefox | components/actions-bar/examples | – | 94 | 0 | – | – | – | – |
| firefox | components/segmented-control/examples | – | 92 | 0 | – | – | – | – |
| firefox | components/toolbar/examples | – | 94 | 0 | – | – | – | – |
| firefox | components/switch/examples | – | 94 | 0 | – | – | – | – |
| firefox | foundations/glass-reflections | – | 94 | 0 | – | – | – | – |
| firefox | guidelines/patterns | – | 94 | 0 | – | – | – | – |
| firefox | get-started/introduction | – | 94 | 0 | – | – | – | – |
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

- **chrome components/glass-container/examples**: 47 frames, 92 rAF callbacks, 0 infinite animations
  - rAF 45× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onMeasureFrame (index-C_oLPotk.js:20882:10) < index-C_oLPotk.js:31067:22`
  - rAF 44× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onRenderFrame (index-C_oLPotk.js:20885:10) < index-C_oLPotk.js:31070:19`
- **chrome components/actions-bar/examples**: 47 frames, 93 rAF callbacks, 0 infinite animations
  - rAF 45× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onMeasureFrame (index-C_oLPotk.js:20882:10) < index-C_oLPotk.js:31067:22`
  - rAF 45× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onRenderFrame (index-C_oLPotk.js:20885:10) < index-C_oLPotk.js:31070:19`
- **chrome components/segmented-control/examples**: 45 frames, 90 rAF callbacks, 0 infinite animations
  - rAF 46× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onMeasureFrame (index-C_oLPotk.js:20882:10) < index-C_oLPotk.js:31067:22`
  - rAF 46× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onRenderFrame (index-C_oLPotk.js:20885:10) < index-C_oLPotk.js:31070:19`
- **chrome components/toolbar/examples**: 47 frames, 94 rAF callbacks, 0 infinite animations
  - rAF 47× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onMeasureFrame (index-C_oLPotk.js:20882:10) < index-C_oLPotk.js:31067:22`
  - rAF 47× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onRenderFrame (index-C_oLPotk.js:20885:10) < index-C_oLPotk.js:31070:19`
- **chrome components/switch/examples**: 46 frames, 92 rAF callbacks, 0 infinite animations
  - rAF 46× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onMeasureFrame (index-C_oLPotk.js:20882:10) < index-C_oLPotk.js:31067:22`
  - rAF 46× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onRenderFrame (index-C_oLPotk.js:20885:10) < index-C_oLPotk.js:31070:19`
- **chrome foundations/glass-reflections**: 45 frames, 90 rAF callbacks, 0 infinite animations
  - rAF 47× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onMeasureFrame (index-C_oLPotk.js:20882:10) < index-C_oLPotk.js:31067:22`
  - rAF 47× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onRenderFrame (index-C_oLPotk.js:20885:10) < index-C_oLPotk.js:31070:19`
- **chrome guidelines/patterns**: 47 frames, 93 rAF callbacks, 0 infinite animations
  - rAF 47× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onMeasureFrame (index-C_oLPotk.js:20882:10) < index-C_oLPotk.js:31067:22`
  - rAF 47× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onRenderFrame (index-C_oLPotk.js:20885:10) < index-C_oLPotk.js:31070:19`
- **chrome get-started/introduction**: 45 frames, 90 rAF callbacks, 0 infinite animations
  - rAF 45× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onMeasureFrame (index-C_oLPotk.js:20882:10) < index-C_oLPotk.js:31067:22`
  - rAF 45× from `subscribeFrame (index-C_oLPotk.js:20873:71) < onRenderFrame (index-C_oLPotk.js:20885:10) < index-C_oLPotk.js:31070:19`
- **firefox components/glass-container/examples**: – frames, 94 rAF callbacks, 0 infinite animations
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onMeasureFrame@index-C_oLPotk.js:20882:10 < wake/timer<@index-C_oLPotk.js:31067:36`
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onRenderFrame@index-C_oLPotk.js:20885:10 < wake/timer</stopRead<@index-C_oLPotk.js:31070:19`
- **firefox components/actions-bar/examples**: – frames, 94 rAF callbacks, 0 infinite animations
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onMeasureFrame@index-C_oLPotk.js:20882:10 < wake/timer<@index-C_oLPotk.js:31067:36`
  - rAF 46× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onRenderFrame@index-C_oLPotk.js:20885:10 < wake/timer</stopRead<@index-C_oLPotk.js:31070:19`
- **firefox components/segmented-control/examples**: – frames, 92 rAF callbacks, 0 infinite animations
  - rAF 46× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onMeasureFrame@index-C_oLPotk.js:20882:10 < wake/timer<@index-C_oLPotk.js:31067:36`
  - rAF 46× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onRenderFrame@index-C_oLPotk.js:20885:10 < wake/timer</stopRead<@index-C_oLPotk.js:31070:19`
- **firefox components/toolbar/examples**: – frames, 94 rAF callbacks, 0 infinite animations
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onMeasureFrame@index-C_oLPotk.js:20882:10 < wake/timer<@index-C_oLPotk.js:31067:36`
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onRenderFrame@index-C_oLPotk.js:20885:10 < wake/timer</stopRead<@index-C_oLPotk.js:31070:19`
- **firefox components/switch/examples**: – frames, 94 rAF callbacks, 0 infinite animations
  - rAF 48× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onMeasureFrame@index-C_oLPotk.js:20882:10 < wake/timer<@index-C_oLPotk.js:31067:36`
  - rAF 48× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onRenderFrame@index-C_oLPotk.js:20885:10 < wake/timer</stopRead<@index-C_oLPotk.js:31070:19`
- **firefox foundations/glass-reflections**: – frames, 94 rAF callbacks, 0 infinite animations
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onMeasureFrame@index-C_oLPotk.js:20882:10 < wake/timer<@index-C_oLPotk.js:31067:36`
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onRenderFrame@index-C_oLPotk.js:20885:10 < wake/timer</stopRead<@index-C_oLPotk.js:31070:19`
- **firefox guidelines/patterns**: – frames, 94 rAF callbacks, 0 infinite animations
  - rAF 46× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onMeasureFrame@index-C_oLPotk.js:20882:10 < wake/timer<@index-C_oLPotk.js:31067:36`
  - rAF 46× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onRenderFrame@index-C_oLPotk.js:20885:10 < wake/timer</stopRead<@index-C_oLPotk.js:31070:19`
- **firefox get-started/introduction**: – frames, 94 rAF callbacks, 0 infinite animations
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onMeasureFrame@index-C_oLPotk.js:20882:10 < wake/timer<@index-C_oLPotk.js:31067:36`
  - rAF 47× from `subscribeFrame@index-C_oLPotk.js:20873:71 < onRenderFrame@index-C_oLPotk.js:20885:10 < wake/timer</stopRead<@index-C_oLPotk.js:31070:19`

## Interactions

Web: rAF frame deltas (ms). Flutter: build times (ms), raster in its own columns. `>16` = frames over budget (web: > 19.2 ms delta; Flutter: build or raster > 16.7 ms).

| platform | page | scenario | frames | p50 | p95 | max | >16 | >33 | task ms | script ms | layout+style ms | long tasks | raster p50/p95/max |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| chrome | components/glass-container/examples | scroll | 201 | 16.7 | 16.7 | 16.8 | 0 | 0 | 759.6 | 342.2 | 165.2 | 0 |  |
| chrome | components/glass-container/examples | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 311.3 | 196.4 | 11.4 | 0 |  |
| chrome | components/glass-container/examples | drag | 119 | 16.7 | 16.7 | 16.8 | 0 | 0 | 458.4 | 192.4 | 75.8 | 0 |  |
| chrome | components/glass-container/examples | split | 144 | 16.7 | 16.7 | 16.8 | 0 | 0 | 612.5 | 363.2 | 65.7 | 0 |  |
| chrome | components/actions-bar/examples | scroll | 191 | 16.7 | 16.8 | 33.4 | 6 | 1 | 536.3 | 285.2 | 34.7 | 0 |  |
| chrome | components/actions-bar/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 287.1 | 179.1 | 9.6 | 0 |  |
| chrome | components/actions-bar/examples | menu | 169 | 16.7 | 16.7 | 16.8 | 0 | 0 | 515.5 | 225.9 | 54.6 | 0 |  |
| chrome | components/segmented-control/examples | scroll | 193 | 16.7 | 16.8 | 33.4 | 8 | 1 | 575.3 | 335.9 | 36.6 | 0 |  |
| chrome | components/segmented-control/examples | pointer | 122 | 16.7 | 16.8 | 16.8 | 0 | 0 | 322.9 | 197.5 | 11.7 | 0 |  |
| chrome | components/segmented-control/examples | drag | 120 | 16.7 | 16.7 | 16.8 | 0 | 0 | 409.4 | 143.4 | 71.8 | 0 |  |
| chrome | components/toolbar/examples | scroll | 183 | 16.7 | 16.7 | 33.4 | 3 | 0 | 436.3 | 251.2 | 28.1 | 0 |  |
| chrome | components/toolbar/examples | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 278.2 | 187.8 | 9.5 | 0 |  |
| chrome | components/switch/examples | scroll | 181 | 16.7 | 16.7 | 16.8 | 0 | 0 | 488.7 | 290 | 29 | 0 |  |
| chrome | components/switch/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 284.5 | 189.5 | 9 | 0 |  |
| chrome | components/switch/examples | drag | 120 | 16.7 | 16.8 | 16.8 | 0 | 0 | 390.7 | 139.1 | 63.3 | 0 |  |
| chrome | foundations/glass-reflections | scroll | 190 | 16.7 | 16.7 | 16.8 | 0 | 0 | 513 | 275.5 | 51.9 | 0 |  |
| chrome | foundations/glass-reflections | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 259.8 | 179.5 | 2 | 0 |  |
| chrome | guidelines/patterns | scroll | 165 | 16.7 | 16.7 | 33.3 | 1 | 0 | 369.9 | 188.5 | 15.2 | 0 |  |
| chrome | guidelines/patterns | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 275.5 | 132.9 | 19.5 | 0 |  |
| chrome | guidelines/patterns | drag | 242 | 16.7 | 16.7 | 16.8 | 0 | 0 | 906.4 | 283.9 | 136.5 | 0 |  |
| chrome | get-started/introduction | scroll | 157 | 16.7 | 16.7 | 16.8 | 0 | 0 | 198.6 | 118.8 | 0.2 | 0 |  |
| chrome | get-started/introduction | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 231.2 | 148.7 | 10.3 | 0 |  |
| firefox | components/glass-container/examples | scroll | 93 | 16.7 | 33.3 | 50 | 16 | 3 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | pointer | 117 | 16.7 | 16.8 | 33.3 | 2 | 0 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | drag | 73 | 16.7 | 33.3 | 33.3 | 13 | 0 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | split | 145 | 16.7 | 16.7 | 33.3 | 1 | 0 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | scroll | 106 | 16.7 | 16.8 | 33.6 | 4 | 1 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | pointer | 120 | 16.7 | 16.7 | 17.5 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | menu | 166 | 16.7 | 17 | 33.3 | 5 | 0 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | scroll | 100 | 16.7 | 33.3 | 33.3 | 7 | 0 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | pointer | 120 | 16.7 | 16.7 | 17.3 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | drag | 85 | 16.7 | 16.7 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/toolbar/examples | scroll | 98 | 16.7 | 33.3 | 50 | 10 | 1 | – | – | – | 0 |  |
| firefox | components/toolbar/examples | pointer | 120 | 16.7 | 16.7 | 16.9 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/switch/examples | scroll | 106 | 16.7 | 16.7 | 33.3 | 1 | 0 | – | – | – | 0 |  |
| firefox | components/switch/examples | pointer | 120 | 16.7 | 16.8 | 17.6 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/switch/examples | drag | 84 | 16.7 | 16.7 | 17.3 | 0 | 0 | – | – | – | 0 |  |
| firefox | foundations/glass-reflections | scroll | 104 | 16.7 | 33.2 | 33.7 | 6 | 3 | – | – | – | 0 |  |
| firefox | foundations/glass-reflections | pointer | 120 | 16.7 | 16.8 | 17.2 | 0 | 0 | – | – | – | 0 |  |
| firefox | guidelines/patterns | scroll | 104 | 16.7 | 17.1 | 33.3 | 4 | 0 | – | – | – | 0 |  |
| firefox | guidelines/patterns | pointer | 120 | 16.7 | 16.7 | 17.3 | 0 | 0 | – | – | – | 0 |  |
| firefox | guidelines/patterns | drag | 170 | 16.7 | 16.7 | 33.3 | 1 | 0 | – | – | – | 0 |  |
| firefox | get-started/introduction | scroll | 106 | 16.7 | 16.9 | 33.3 | 2 | 0 | – | – | – | 0 |  |
| firefox | get-started/introduction | pointer | 120 | 16.7 | 17 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| flutter | components/glass-container | scroll | 40 | 0.4 | 37 | 39.3 | 10 | 9 | – | – | – | – | 8.7/174.7/201.6 |
| flutter | components/glass-container | pointer | 47 | 8.8 | 86.4 | 107.7 | 22 | 11 | – | – | – | – | 13.4/121.9/134.8 |
| flutter | components/glass-container | drag | 63 | 11.3 | 43.3 | 75.6 | 34 | 24 | – | – | – | – | 20.5/69.2/160 |
| flutter | components/glass-container | split | 47 | 21.5 | 91.9 | 128.3 | 28 | 19 | – | – | – | – | 21.5/126/242.4 |
| flutter | components/actions-bar | scroll | 53 | 0.4 | 5 | 12.7 | 1 | 0 | – | – | – | – | 3.8/13.3/18.7 |
| flutter | components/actions-bar | pointer | 71 | 3.2 | 15.3 | 48.7 | 11 | 5 | – | – | – | – | 5.1/32.5/47.4 |
| flutter | components/actions-bar | menu | 82 | 7.9 | 45.5 | 115.6 | 26 | 14 | – | – | – | – | 8.6/53.4/77.5 |
| flutter | components/segmented-control | scroll | 50 | 0.4 | 4.6 | 8.4 | 6 | 1 | – | – | – | – | 5.6/28.2/48.6 |
| flutter | components/segmented-control | pointer | 81 | 2.4 | 10.6 | 38.8 | 10 | 2 | – | – | – | – | 4.8/30.3/49.8 |
| flutter | components/segmented-control | drag | 65 | 8.3 | 78.3 | 102.4 | 25 | 16 | – | – | – | – | 21.9/82.9/147.8 |
| flutter | components/toolbar | scroll | 55 | 0.3 | 11.4 | 19.4 | 3 | 1 | – | – | – | – | 6.5/16.6/134.6 |
| flutter | components/toolbar | pointer | 72 | 6.9 | 46.8 | 78.8 | 16 | 10 | – | – | – | – | 7.4/47.8/79.1 |
| flutter | components/switch | scroll | 55 | 0.3 | 1.6 | 4 | 5 | 1 | – | – | – | – | 8.7/30.6/62.7 |
| flutter | components/switch | drag | 67 | 3.7 | 31.5 | 101.9 | 25 | 11 | – | – | – | – | 13.6/62.1/221.8 |
| flutter | guidelines/patterns | scroll | 77 | 9.9 | 98.2 | 522.4 | 35 | 14 | – | – | – | – | 9.8/114.3/363.7 |
| flutter | guidelines/patterns | pointer | 41 | 16.7 | 139.6 | 257.2 | 28 | 17 | – | – | – | – | 18.1/107.6/263.7 |
| flutter | guidelines/patterns | drag | 117 | 40.1 | 234 | 665.1 | 87 | 74 | – | – | – | – | 40/296.7/701.7 |
| flutter | baseline/text | scroll | 47 | 1 | 2.5 | 5.7 | 2 | 0 | – | – | – | – | 2.4/8.2/28.9 |

Worst by p95 (Flutter: the worse of build and raster):

- flutter guidelines/patterns drag: p95 234 build / 296.7 raster ms, max 701.7 ms, 87 over budget
- flutter components/glass-container scroll: p95 37 build / 174.7 raster ms, max 201.6 ms, 10 over budget
- flutter guidelines/patterns pointer: p95 139.6 build / 107.6 raster ms, max 263.7 ms, 28 over budget
- flutter components/glass-container split: p95 91.9 build / 126 raster ms, max 242.4 ms, 28 over budget
- flutter components/glass-container pointer: p95 86.4 build / 121.9 raster ms, max 134.8 ms, 22 over budget
- flutter guidelines/patterns scroll: p95 98.2 build / 114.3 raster ms, max 522.4 ms, 35 over budget
- flutter components/segmented-control drag: p95 78.3 build / 82.9 raster ms, max 147.8 ms, 25 over budget
- flutter components/glass-container drag: p95 43.3 build / 69.2 raster ms, max 160 ms, 34 over budget
- flutter components/switch drag: p95 31.5 build / 62.1 raster ms, max 221.8 ms, 25 over budget
- flutter components/actions-bar menu: p95 45.5 build / 53.4 raster ms, max 115.6 ms, 26 over budget
