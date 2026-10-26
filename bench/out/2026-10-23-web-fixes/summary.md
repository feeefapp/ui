# Performance bench: web-fixes

Web: 2026-10-23T15:32:55.721Z, 1280×800 @2x, median of 3 reps. Machine 8 CPUs, load avg 13 / 15.2 / 17.1.

- **chrome** Chrome/155.0.8059.82: backdrop-filter painted: true

## Steady state (3 s idle, nothing moving; ideally all zero)

| platform | page | frames drawn | page rAF callbacks | infinite animations | main-thread ms (trace / Flutter build) | task ms (CDP) | script ms | raster ms (Flutter) |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| chrome | components/glass-container/examples | 52 | 101 | 0 | 630.3 | 171.5 | 92.2 | – |
| chrome | components/actions-bar/examples | 47 | 91 | 0 | 328.4 | 108.2 | 62.8 | – |
| chrome | components/segmented-control/examples | 51 | 99 | 0 | 99.5 | 107.6 | 60.4 | – |
| chrome | components/toolbar/examples | 46 | 90 | 0 | 103.9 | 93.4 | 55.3 | – |
| chrome | components/switch/examples | 49 | 98 | 0 | 101 | 105.6 | 59.9 | – |
| chrome | foundations/glass-reflections | 50 | 99 | 0 | 109.2 | 108.5 | 61.4 | – |
| chrome | guidelines/patterns | 50 | 100 | 0 | 137.4 | 110.5 | 58.9 | – |
| chrome | get-started/introduction | 46 | 90 | 0 | 88.2 | 90.3 | 54.3 | – |

Web frames drawn = Chrome trace DrawFrame events (Firefox: not available). Page rAF callbacks = the page's own requestAnimationFrame callbacks (the bench's recorder is off while idle).

Idle pages that keep working:

- **chrome components/glass-container/examples**: 52 frames, 101 rAF callbacks, 0 infinite animations
  - rAF 51× from `subscribeFrame (index-D6YyELGx.js:20872:71) < onMeasureFrame (index-D6YyELGx.js:20881:10) < index-D6YyELGx.js:30904:22`
  - rAF 51× from `loop (index-D6YyELGx.js:20865:77)`
- **chrome components/actions-bar/examples**: 47 frames, 91 rAF callbacks, 0 infinite animations
  - rAF 45× from `loop (index-D6YyELGx.js:20865:77)`
  - rAF 45× from `subscribeFrame (index-D6YyELGx.js:20872:71) < onMeasureFrame (index-D6YyELGx.js:20881:10) < index-D6YyELGx.js:30904:22`
- **chrome components/segmented-control/examples**: 51 frames, 99 rAF callbacks, 0 infinite animations
  - rAF 50× from `subscribeFrame (index-D6YyELGx.js:20872:71) < onMeasureFrame (index-D6YyELGx.js:20881:10) < index-D6YyELGx.js:30904:22`
  - rAF 50× from `loop (index-D6YyELGx.js:20865:77)`
- **chrome components/toolbar/examples**: 46 frames, 90 rAF callbacks, 0 infinite animations
  - rAF 50× from `subscribeFrame (index-D6YyELGx.js:20872:71) < onMeasureFrame (index-D6YyELGx.js:20881:10) < index-D6YyELGx.js:30904:22`
  - rAF 49× from `loop (index-D6YyELGx.js:20865:77)`
- **chrome components/switch/examples**: 49 frames, 98 rAF callbacks, 0 infinite animations
  - rAF 51× from `subscribeFrame (index-D6YyELGx.js:20872:71) < onMeasureFrame (index-D6YyELGx.js:20881:10) < index-D6YyELGx.js:30904:22`
  - rAF 50× from `loop (index-D6YyELGx.js:20865:77)`
- **chrome foundations/glass-reflections**: 50 frames, 99 rAF callbacks, 0 infinite animations
  - rAF 45× from `subscribeFrame (index-D6YyELGx.js:20872:71) < onMeasureFrame (index-D6YyELGx.js:20881:10) < index-D6YyELGx.js:30904:22`
  - rAF 45× from `loop (index-D6YyELGx.js:20865:77)`
- **chrome guidelines/patterns**: 50 frames, 100 rAF callbacks, 0 infinite animations
  - rAF 49× from `subscribeFrame (index-D6YyELGx.js:20872:71) < onMeasureFrame (index-D6YyELGx.js:20881:10) < index-D6YyELGx.js:30904:22`
  - rAF 49× from `loop (index-D6YyELGx.js:20865:77)`
- **chrome get-started/introduction**: 46 frames, 90 rAF callbacks, 0 infinite animations
  - rAF 45× from `subscribeFrame (index-D6YyELGx.js:20872:71) < onMeasureFrame (index-D6YyELGx.js:20881:10) < index-D6YyELGx.js:30904:22`
  - rAF 45× from `loop (index-D6YyELGx.js:20865:77)`

## Interactions

Web: rAF frame deltas (ms). Flutter: build times (ms), raster in its own columns. `>16` = frames over budget (web: > 19.2 ms delta; Flutter: build or raster > 16.7 ms).

| platform | page | scenario | frames | p50 | p95 | max | >16 | >33 | task ms | script ms | layout+style ms | long tasks | raster p50/p95/max |
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| chrome | components/glass-container/examples | scroll | 204 | 16.7 | 16.8 | 66.7 | 14 | 2 | 1011.6 | 458 | 211 | 1 |  |
| chrome | components/glass-container/examples | pointer | 122 | 16.7 | 16.7 | 16.8 | 0 | 0 | 228.5 | 144.2 | 12.6 | 0 |  |
| chrome | components/glass-container/examples | drag | 132 | 16.7 | 16.8 | 16.8 | 0 | 0 | 695.6 | 237.5 | 144.8 | 0 |  |
| chrome | components/glass-container/examples | split | 145 | 16.7 | 16.7 | 33.4 | 2 | 0 | 736.3 | 431.6 | 107.4 | 0 |  |
| chrome | components/actions-bar/examples | scroll | 193 | 16.7 | 16.8 | 33.5 | 7 | 1 | 573.3 | 295.2 | 40.4 | 0 |  |
| chrome | components/actions-bar/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 211.9 | 127.1 | 9.7 | 0 |  |
| chrome | components/actions-bar/examples | menu | 175 | 16.7 | 16.8 | 33.3 | 2 | 0 | 714.9 | 318.8 | 94.2 | 0 |  |
| chrome | components/segmented-control/examples | scroll | 196 | 16.7 | 33.3 | 50 | 18 | 3 | 674.2 | 381.2 | 45.5 | 0 |  |
| chrome | components/segmented-control/examples | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 215.9 | 121.4 | 9.7 | 0 |  |
| chrome | components/segmented-control/examples | drag | 134 | 16.7 | 16.7 | 16.8 | 0 | 0 | 621.8 | 187.7 | 122.8 | 0 |  |
| chrome | components/toolbar/examples | scroll | 182 | 16.7 | 16.8 | 33.4 | 4 | 0 | 475.5 | 277.1 | 33.1 | 0 |  |
| chrome | components/toolbar/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 198.2 | 122.3 | 8.3 | 0 |  |
| chrome | components/switch/examples | scroll | 186 | 16.7 | 16.7 | 33.4 | 2 | 0 | 570 | 342.4 | 34.7 | 0 |  |
| chrome | components/switch/examples | pointer | 121 | 16.7 | 16.7 | 16.8 | 0 | 0 | 253.1 | 154.2 | 11.6 | 0 |  |
| chrome | components/switch/examples | drag | 124 | 16.7 | 16.7 | 16.8 | 0 | 0 | 553.5 | 201.5 | 93.3 | 0 |  |
| chrome | foundations/glass-reflections | scroll | 195 | 16.7 | 16.8 | 33.4 | 5 | 0 | 593.4 | 309.1 | 72.2 | 0 |  |
| chrome | foundations/glass-reflections | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 213.3 | 129.9 | 6.1 | 0 |  |
| chrome | guidelines/patterns | scroll | 169 | 16.7 | 16.8 | 33.4 | 4 | 0 | 397.6 | 179 | 18.7 | 0 |  |
| chrome | guidelines/patterns | pointer | 120 | 16.7 | 16.7 | 16.8 | 0 | 0 | 288.2 | 121.7 | 24.4 | 0 |  |
| chrome | guidelines/patterns | drag | 255 | 16.7 | 16.7 | 16.8 | 0 | 0 | 1175.3 | 351 | 204 | 0 |  |
| chrome | get-started/introduction | scroll | 158 | 16.7 | 16.8 | 16.8 | 0 | 0 | 112.8 | 54.4 | 0.8 | 0 |  |
| chrome | get-started/introduction | pointer | 121 | 16.7 | 16.8 | 16.8 | 0 | 0 | 193.7 | 111.5 | 10.6 | 0 |  |

Worst by p95 (Flutter: the worse of build and raster):

- chrome components/segmented-control/examples scroll: p95 33.3 ms, max 50 ms, 18 over budget
- chrome components/glass-container/examples scroll: p95 16.8 ms, max 66.7 ms, 14 over budget
- chrome components/actions-bar/examples scroll: p95 16.8 ms, max 33.5 ms, 7 over budget
- chrome foundations/glass-reflections scroll: p95 16.8 ms, max 33.4 ms, 5 over budget
- chrome components/toolbar/examples scroll: p95 16.8 ms, max 33.4 ms, 4 over budget
- chrome guidelines/patterns scroll: p95 16.8 ms, max 33.4 ms, 4 over budget
- chrome components/actions-bar/examples menu: p95 16.8 ms, max 33.3 ms, 2 over budget
- chrome components/glass-container/examples drag: p95 16.8 ms, max 16.8 ms, 0 over budget
- chrome components/segmented-control/examples pointer: p95 16.8 ms, max 16.8 ms, 0 over budget
- chrome foundations/glass-reflections pointer: p95 16.8 ms, max 16.8 ms, 0 over budget
