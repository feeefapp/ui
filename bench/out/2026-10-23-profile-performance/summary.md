# Performance bench: profile-performance

Web: 2026-10-23T14:29:04.728Z, 1280×800 @2x, median of 3 reps. Machine 8 CPUs, load avg 30.6 / 38 / 53.1.

- **chrome** Chrome/155.0.8059.82: backdrop-filter painted: true
- **firefox** firefox/158.0.1: backdrop-filter painted: false. ⚠ Backdrop filters are not painted in this automation mode: Firefox numbers measure main-thread work only, not glass compositing.

Flutter: 2026-10-23T14:51:44.877407Z, macos Version 26.4.1 (Build 25E253) profile. Build = UI thread, raster = raster thread, per frame (ms). missed = build or raster > 16.7 ms. Each window includes a 400 ms tail. Idle = 3 s with nothing moving: ideally 0 frames.

## Steady state (3 s idle, nothing moving; ideally all zero)

| platform | page | frames drawn | page rAF callbacks | infinite animations | main-thread ms (trace / Flutter build) | task ms (CDP) | script ms | raster ms (Flutter) |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| chrome | components/glass-container/examples | 0 | 0 | 0 | 6 | 7.7 | 0.2 | – |
| chrome | components/actions-bar/examples | 0 | 0 | 0 | 6.6 | 3.9 | 0.2 | – |
| chrome | components/segmented-control/examples | 0 | 0 | 0 | 2.4 | 1.9 | 0.1 | – |
| chrome | components/toolbar/examples | 0 | 0 | 0 | 9.1 | 1.9 | 0.2 | – |
| chrome | components/switch/examples | 0 | 0 | 0 | 11.2 | 8.3 | 0.3 | – |
| chrome | foundations/glass-reflections | 0 | 0 | 0 | 9.4 | 9.2 | 0.1 | – |
| chrome | guidelines/patterns | 0 | 0 | 0 | 5.8 | 6.1 | 0.2 | – |
| chrome | get-started/introduction | 0 | 0 | 0 | 5.1 | 5.1 | 0.4 | – |
| firefox | components/glass-container/examples | – | 0 | 0 | – | – | – | – |
| firefox | components/actions-bar/examples | – | 0 | 0 | – | – | – | – |
| firefox | components/segmented-control/examples | – | 0 | 0 | – | – | – | – |
| firefox | components/toolbar/examples | – | 0 | 0 | – | – | – | – |
| firefox | components/switch/examples | – | 0 | 0 | – | – | – | – |
| firefox | foundations/glass-reflections | – | 0 | 0 | – | – | – | – |
| firefox | guidelines/patterns | – | 0 | 0 | – | – | – | – |
| firefox | get-started/introduction | – | 0 | 0 | – | – | – | – |
| flutter | harness/providers | 0 | – | – | 0 | – | – | 0 |
| flutter | components/glass-container | 0 | – | – | 0 | – | – | 0 |
| flutter | components/actions-bar | 0 | – | – | 0 | – | – | 0 |
| flutter | components/segmented-control | 0 | – | – | 0 | – | – | 0 |
| flutter | components/toolbar | 0 | – | – | 0 | – | – | 0 |
| flutter | components/switch | 0 | – | – | 0 | – | – | 0 |
| flutter | guidelines/patterns | 0 | – | – | 0 | – | – | 0 |
| flutter | baseline/text | 0 | – | – | 0 | – | – | 0 |

Web frames drawn = Chrome trace DrawFrame events (Firefox: not available). Page rAF callbacks = the page's own requestAnimationFrame callbacks (the bench's recorder is off while idle).

## Interactions

Web: rAF frame deltas (ms). Flutter: build times (ms), raster in its own columns. `>16` = frames over budget (web: > 19.2 ms delta; Flutter: build or raster > 16.7 ms).

| platform | page | scenario | frames | p50 | p95 | max | >16 | >33 | task ms | script ms | layout+style ms | long tasks | raster p50/p95/max |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| chrome | components/glass-container/examples | scroll | 160 | 16.7 | 16.8 | 16.8 | 0 | 0 | 191.4 | 94.6 | 15.8 | 0 |  |
| chrome | components/glass-container/examples | pointer | 122 | 16.7 | 16.7 | 16.8 | 0 | 0 | 80.5 | 11.9 | 1.4 | 0 |  |
| chrome | components/glass-container/examples | drag | 120 | 16.7 | 16.8 | 16.8 | 0 | 0 | 107.7 | 11.2 | 4.2 | 0 |  |
| chrome | components/glass-container/examples | split | 146 | 16.7 | 16.8 | 16.8 | 0 | 0 | 76.5 | 26.2 | 7.7 | 0 |  |
| chrome | components/actions-bar/examples | scroll | 159 | 16.7 | 16.7 | 16.8 | 0 | 0 | 174.6 | 65.3 | 14.2 | 0 |  |
| chrome | components/actions-bar/examples | pointer | 122 | 16.7 | 16.8 | 16.8 | 0 | 0 | 51 | 7.6 | 0.9 | 0 |  |
| chrome | components/actions-bar/examples | menu | 170 | 16.7 | 16.8 | 16.8 | 0 | 0 | 90.5 | 22.6 | 12.5 | 0 |  |
| chrome | components/segmented-control/examples | scroll | 160 | 16.7 | 16.8 | 16.8 | 0 | 0 | 183.9 | 73.6 | 11.5 | 0 |  |
| chrome | components/segmented-control/examples | pointer | 122 | 16.7 | 16.7 | 16.8 | 0 | 0 | 57.9 | 8.3 | 1 | 0 |  |
| chrome | components/segmented-control/examples | drag | 120 | 16.7 | 16.7 | 16.8 | 0 | 0 | 69.8 | 9.7 | 10 | 0 |  |
| chrome | components/toolbar/examples | scroll | 157 | 16.7 | 16.7 | 16.8 | 0 | 0 | 141.5 | 64.7 | 8.8 | 0 |  |
| chrome | components/toolbar/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 51 | 8.6 | 1.1 | 0 |  |
| chrome | components/switch/examples | scroll | 157 | 16.7 | 16.7 | 16.8 | 0 | 0 | 144.1 | 60 | 10.8 | 0 |  |
| chrome | components/switch/examples | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 51.8 | 8 | 0.8 | 0 |  |
| chrome | components/switch/examples | drag | 120 | 16.7 | 16.8 | 16.8 | 0 | 0 | 180.1 | 39.8 | 49.8 | 0 |  |
| chrome | foundations/glass-reflections | scroll | 154 | 16.7 | 16.7 | 16.8 | 0 | 0 | 129 | 53.4 | 8 | 0 |  |
| chrome | foundations/glass-reflections | pointer | 120 | 16.7 | 16.7 | 16.8 | 0 | 0 | 46 | 8.4 | 2.1 | 0 |  |
| chrome | guidelines/patterns | scroll | 154 | 16.7 | 16.7 | 16.8 | 0 | 0 | 94.8 | 34.5 | 4.8 | 0 |  |
| chrome | guidelines/patterns | pointer | 120 | 16.7 | 16.8 | 16.8 | 0 | 0 | 73.5 | 9.2 | 3 | 0 |  |
| chrome | guidelines/patterns | drag | 240 | 16.7 | 16.7 | 16.8 | 0 | 0 | 303.7 | 54.9 | 60.9 | 0 |  |
| chrome | get-started/introduction | scroll | 154 | 16.7 | 16.7 | 16.8 | 0 | 0 | 51.1 | 12.3 | 1.4 | 0 |  |
| chrome | get-started/introduction | pointer | 120 | 16.7 | 16.8 | 16.8 | 0 | 0 | 63.9 | 8.7 | 7.2 | 0 |  |
| firefox | components/glass-container/examples | scroll | 106 | 16.7 | 16.7 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | pointer | 121 | 16.7 | 16.7 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | drag | 82 | 16.7 | 17.1 | 17.6 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/glass-container/examples | split | 149 | 16.7 | 16.9 | 37 | 1 | 1 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | scroll | 105 | 16.7 | 16.9 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | pointer | 120 | 16.7 | 16.9 | 33.3 | 1 | 0 | – | – | – | 0 |  |
| firefox | components/actions-bar/examples | menu | 173 | 16.7 | 16.8 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | scroll | 104 | 16.7 | 17 | 17.3 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | pointer | 121 | 16.7 | 17 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/segmented-control/examples | drag | 79 | 16.7 | 17.2 | 17.5 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/toolbar/examples | scroll | 105 | 16.7 | 17.1 | 17.5 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/toolbar/examples | pointer | 121 | 16.7 | 16.8 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/switch/examples | scroll | 112 | 16.7 | 17.2 | 32.8 | 1 | 0 | – | – | – | 0 |  |
| firefox | components/switch/examples | pointer | 122 | 16.7 | 17 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | components/switch/examples | drag | 87 | 16.7 | 17.2 | 17.4 | 0 | 0 | – | – | – | 0 |  |
| firefox | foundations/glass-reflections | scroll | 122 | 16.7 | 17.5 | 100 | 6 | 3 | – | – | – | 0 |  |
| firefox | foundations/glass-reflections | pointer | 121 | 16.7 | 17.2 | 17.5 | 0 | 0 | – | – | – | 0 |  |
| firefox | guidelines/patterns | scroll | 121 | 16.7 | 50 | 83.3 | 19 | 10 | – | – | – | 0 |  |
| firefox | guidelines/patterns | pointer | 120 | 16.7 | 17 | 17.5 | 0 | 0 | – | – | – | 0 |  |
| firefox | guidelines/patterns | drag | 171 | 16.7 | 17.1 | 50 | 1 | 1 | – | – | – | 0 |  |
| firefox | get-started/introduction | scroll | 105 | 16.7 | 16.8 | 17.6 | 0 | 0 | – | – | – | 0 |  |
| firefox | get-started/introduction | pointer | 121 | 16.7 | 16.7 | 17.2 | 0 | 0 | – | – | – | 0 |  |
| flutter | components/glass-container | scroll | 39 | 0.2 | 2.2 | 3.8 | 6 | 4 | – | – | – | – | 3.8/55.3/78.8 |
| flutter | components/glass-container | pointer | 0 | 0.4 | 1 | 1.9 | 0 | 0 | – | – | – | – | 3.2/8.7/10.5 |
| flutter | components/glass-container | drag | 4 | 1.5 | 1.6 | 1.6 | 1 | 0 | – | – | – | – | 8.1/16.7/16.7 |
| flutter | components/glass-container | split | 4 | 1.9 | 2.1 | 2.1 | 1 | 0 | – | – | – | – | 12.4/18.6/18.6 |
| flutter | components/actions-bar | scroll | 52 | 0.1 | 0.8 | 0.9 | 0 | 0 | – | – | – | – | 1/2.2/9.4 |
| flutter | components/actions-bar | pointer | 0 | – | – | – | 0 | 0 | – | – | – | – | –/–/– |
| flutter | components/actions-bar | menu | 47 | 1 | 1.6 | 1.7 | 0 | 0 | – | – | – | – | 0.9/1.2/1.7 |
| flutter | components/segmented-control | scroll | 50 | 0.2 | 0.9 | 1.4 | 0 | 0 | – | – | – | – | 1/3.2/10.6 |
| flutter | components/segmented-control | pointer | 0 | – | – | – | 0 | 0 | – | – | – | – | –/–/– |
| flutter | components/segmented-control | drag | 4 | 0.7 | 0.8 | 0.8 | 0 | 0 | – | – | – | – | 1.7/4.4/4.4 |
| flutter | components/toolbar | scroll | 54 | 0.2 | 1.6 | 1.7 | 0 | 0 | – | – | – | – | 1.1/4.3/4.9 |
| flutter | components/toolbar | pointer | 0 | – | – | – | 0 | 0 | – | – | – | – | –/–/– |
| flutter | components/switch | scroll | 54 | 0.1 | 0.5 | 0.7 | 0 | 0 | – | – | – | – | 3/9.5/12.4 |
| flutter | components/switch | drag | 45 | 0.4 | 0.5 | 0.5 | 0 | 0 | – | – | – | – | 2.4/3.6/9.7 |
| flutter | guidelines/patterns | scroll | 90 | 2.5 | 3.5 | 4.1 | 0 | 0 | – | – | – | – | 1.9/5.8/6.6 |
| flutter | guidelines/patterns | pointer | 16 | 0.3 | 0.5 | 0.5 | 0 | 0 | – | – | – | – | 4/5.8/5.8 |
| flutter | guidelines/patterns | drag | 108 | 2.4 | 3.3 | 6.7 | 0 | 0 | – | – | – | – | 1.8/3.8/5.6 |
| flutter | baseline/text | scroll | 46 | 0.3 | 0.4 | 0.8 | 0 | 0 | – | – | – | – | 0.6/2.1/5.2 |

Worst by p95 (Flutter: the worse of build and raster):

- flutter components/glass-container scroll: p95 2.2 build / 55.3 raster ms, max 78.8 ms, 6 over budget
- firefox guidelines/patterns scroll: p95 50 ms, max 83.3 ms, 19 over budget
- flutter components/glass-container split: p95 2.1 build / 18.6 raster ms, max 18.6 ms, 1 over budget
- firefox foundations/glass-reflections scroll: p95 17.5 ms, max 100 ms, 6 over budget
- firefox components/switch/examples scroll: p95 17.2 ms, max 32.8 ms, 1 over budget
- firefox components/segmented-control/examples drag: p95 17.2 ms, max 17.5 ms, 0 over budget
- firefox components/switch/examples drag: p95 17.2 ms, max 17.4 ms, 0 over budget
- firefox foundations/glass-reflections pointer: p95 17.2 ms, max 17.5 ms, 0 over budget
- firefox guidelines/patterns drag: p95 17.1 ms, max 50 ms, 1 over budget
- firefox components/glass-container/examples drag: p95 17.1 ms, max 17.6 ms, 0 over budget
