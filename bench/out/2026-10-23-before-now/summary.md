# Performance bench: before-now

Web: 2026-10-23T15:14:32.891Z, 1280×800 @2x, median of 3 reps. Machine 8 CPUs, load avg 7.7 / 8.3 / 12.6.

- **chrome** Chrome/155.0.8059.82: backdrop-filter painted: true

## Steady state (3 s idle, nothing moving; ideally all zero)

| platform | page | frames drawn | page rAF callbacks | infinite animations | main-thread ms (trace / Flutter build) | task ms (CDP) | script ms | raster ms (Flutter) |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| chrome | components/glass-container/examples | 45 | 221 | 0 | 249.9 | 269.2 | 196.6 | – |
| chrome | components/actions-bar/examples | 45 | 215 | 0 | 251.3 | 267.8 | 195.9 | – |
| chrome | components/segmented-control/examples | 45 | 209 | 0 | 231.9 | 246.1 | 176.3 | – |
| chrome | components/toolbar/examples | 45 | 216 | 0 | 266.8 | 282.4 | 208.3 | – |
| chrome | components/switch/examples | 45 | 210 | 0 | 277.8 | 297.1 | 199.5 | – |
| chrome | foundations/glass-reflections | 46 | 203 | 0 | 230.5 | 244.9 | 178.8 | – |
| chrome | guidelines/patterns | 45 | 198 | 0 | 310.7 | 290.6 | 198.6 | – |
| chrome | get-started/introduction | 45 | 215 | 0 | 257.3 | 281 | 203.3 | – |

Web frames drawn = Chrome trace DrawFrame events (Firefox: not available). Page rAF callbacks = the page's own requestAnimationFrame callbacks (the bench's recorder is off while idle).

Idle pages that keep working:

- **chrome components/glass-container/examples**: 45 frames, 221 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-DtrFYmLS.js:30943:14)`
  - rAF 42× from `GlassScene.requestSample (index-DtrFYmLS.js:34712:24) < index-DtrFYmLS.js:34612:102`
- **chrome components/actions-bar/examples**: 45 frames, 215 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-DtrFYmLS.js:30943:14)`
  - rAF 36× from `GlassScene.requestSample (index-DtrFYmLS.js:34712:24) < index-DtrFYmLS.js:34612:102`
- **chrome components/segmented-control/examples**: 45 frames, 209 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-DtrFYmLS.js:30943:14)`
  - rAF 30× from `GlassScene.requestSample (index-DtrFYmLS.js:34712:24) < index-DtrFYmLS.js:34612:102`
- **chrome components/toolbar/examples**: 45 frames, 216 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-DtrFYmLS.js:30943:14)`
  - rAF 36× from `GlassScene.requestSample (index-DtrFYmLS.js:34712:24) < index-DtrFYmLS.js:34612:102`
- **chrome components/switch/examples**: 45 frames, 210 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-DtrFYmLS.js:30943:14)`
  - rAF 25× from `GlassScene.requestSample (index-DtrFYmLS.js:34712:24) < index-DtrFYmLS.js:34612:102`
- **chrome foundations/glass-reflections**: 46 frames, 203 rAF callbacks, 0 infinite animations
  - rAF 180× from `animate (index-DtrFYmLS.js:30943:14)`
  - rAF 24× from `GlassScene.requestSample (index-DtrFYmLS.js:34712:24) < index-DtrFYmLS.js:34612:102`
- **chrome guidelines/patterns**: 45 frames, 198 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-DtrFYmLS.js:30943:14)`
  - rAF 18× from `GlassScene.requestSample (index-DtrFYmLS.js:34712:24) < index-DtrFYmLS.js:34612:102`
- **chrome get-started/introduction**: 45 frames, 215 rAF callbacks, 0 infinite animations
  - rAF 179× from `animate (index-DtrFYmLS.js:30943:14)`
  - rAF 36× from `GlassScene.requestSample (index-DtrFYmLS.js:34712:24) < index-DtrFYmLS.js:34612:102`

## Interactions

Web: rAF frame deltas (ms). Flutter: build times (ms), raster in its own columns. `>16` = frames over budget (web: > 19.2 ms delta; Flutter: build or raster > 16.7 ms).

| platform | page | scenario | frames | p50 | p95 | max | >16 | >33 | task ms | script ms | layout+style ms | long tasks | raster p50/p95/max |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| chrome | components/glass-container/examples | scroll | 199 | 16.7 | 16.8 | 50 | 9 | 1 | 947.1 | 486.3 | 191.5 | 0 |  |
| chrome | components/glass-container/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 310.7 | 212.4 | 9.5 | 0 |  |
| chrome | components/glass-container/examples | drag | 122 | 16.7 | 16.8 | 33.3 | 1 | 0 | 688 | 317.2 | 113.5 | 0 |  |
| chrome | components/glass-container/examples | split | 144 | 16.7 | 16.7 | 16.8 | 0 | 0 | 839.1 | 543.4 | 80.6 | 0 |  |
| chrome | components/actions-bar/examples | scroll | 192 | 16.7 | 33.3 | 33.4 | 10 | 0 | 735.6 | 445.3 | 39.2 | 0 |  |
| chrome | components/actions-bar/examples | pointer | 120 | 16.7 | 16.7 | 16.8 | 0 | 0 | 306.3 | 210.7 | 9.3 | 0 |  |
| chrome | components/actions-bar/examples | menu | 169 | 16.7 | 16.8 | 16.8 | 0 | 0 | 700.4 | 377.3 | 62.4 | 0 |  |
| chrome | components/segmented-control/examples | scroll | 190 | 16.7 | 33.3 | 50.1 | 14 | 4 | 806.7 | 510.4 | 40.5 | 0 |  |
| chrome | components/segmented-control/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 296.1 | 198.9 | 8.9 | 0 |  |
| chrome | components/segmented-control/examples | drag | 122 | 16.7 | 16.7 | 16.8 | 0 | 0 | 624.6 | 274.2 | 100.7 | 0 |  |
| chrome | components/toolbar/examples | scroll | 184 | 16.7 | 16.8 | 49.9 | 8 | 2 | 673 | 427.9 | 39.6 | 0 |  |
| chrome | components/toolbar/examples | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 297.6 | 203.5 | 9 | 0 |  |
| chrome | components/switch/examples | scroll | 196 | 16.7 | 16.8 | 33.4 | 6 | 0 | 720.4 | 471.9 | 38.7 | 0 |  |
| chrome | components/switch/examples | pointer | 120 | 16.7 | 16.7 | 16.8 | 0 | 0 | 293.2 | 207.7 | 9.6 | 0 |  |
| chrome | components/switch/examples | drag | 126 | 16.7 | 16.8 | 33.3 | 1 | 0 | 649.6 | 302 | 98.9 | 0 |  |
| chrome | foundations/glass-reflections | scroll | 195 | 16.7 | 16.8 | 33.4 | 4 | 1 | 674.8 | 395.7 | 71.8 | 0 |  |
| chrome | foundations/glass-reflections | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 235 | 165.5 | 2 | 0 |  |
| chrome | guidelines/patterns | scroll | 167 | 16.7 | 16.8 | 33.4 | 4 | 0 | 538.4 | 330.2 | 21.1 | 0 |  |
| chrome | guidelines/patterns | pointer | 120 | 16.7 | 16.8 | 16.8 | 0 | 0 | 366.5 | 212.9 | 25.5 | 0 |  |
| chrome | guidelines/patterns | drag | 250 | 16.7 | 16.8 | 116.7 | 5 | 3 | 1744.2 | 715.3 | 235 | 2 |  |
| chrome | get-started/introduction | scroll | 160 | 16.7 | 16.8 | 16.8 | 0 | 0 | 223.4 | 160.7 | 0.4 | 0 |  |
| chrome | get-started/introduction | pointer | 120 | 16.7 | 16.7 | 16.8 | 0 | 0 | 275.8 | 196.7 | 10.5 | 0 |  |

Worst by p95 (Flutter: the worse of build and raster):

- chrome components/segmented-control/examples scroll: p95 33.3 ms, max 50.1 ms, 14 over budget
- chrome components/actions-bar/examples scroll: p95 33.3 ms, max 33.4 ms, 10 over budget
- chrome components/glass-container/examples scroll: p95 16.8 ms, max 50 ms, 9 over budget
- chrome components/toolbar/examples scroll: p95 16.8 ms, max 49.9 ms, 8 over budget
- chrome components/switch/examples scroll: p95 16.8 ms, max 33.4 ms, 6 over budget
- chrome guidelines/patterns drag: p95 16.8 ms, max 116.7 ms, 5 over budget
- chrome foundations/glass-reflections scroll: p95 16.8 ms, max 33.4 ms, 4 over budget
- chrome guidelines/patterns scroll: p95 16.8 ms, max 33.4 ms, 4 over budget
- chrome components/glass-container/examples drag: p95 16.8 ms, max 33.3 ms, 1 over budget
- chrome components/switch/examples drag: p95 16.8 ms, max 33.3 ms, 1 over budget
