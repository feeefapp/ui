# Performance bench

Before/after numbers for kit performance work. One command per platform, JSON + Markdown out.

```sh
node bench/web.mjs --label baseline        # docs site in Chrome + Firefox  → web.json
bench/flutter.sh --label baseline          # docs' Dart examples, macOS profile → flutter.json
node bench/compare.mjs baseline after      # before/after table (labels or run dirs)
```

Both write to `bench/out/<date>-<label>/` and refresh `summary.md` there (`node bench/summarize.mjs <dir>` redoes it).
Run on a quiet machine and compare runs made on the same machine: the numbers are wall-clock.

## Web (`bench/web.mjs`)

Builds the docs once (`vite build`, production React, app code left unminified so stacks are readable)
into `bench/.build/docs`, serves it with an SPA fallback, and drives it with puppeteer-core from
`../helium/node_modules` at 1280×800, DPR 2. Each repetition (default 3) reloads the page; the report
holds medians.

Options: `--reps N`, `--browsers chrome,firefox`, `--pages components/toolbar/examples,…`,
`--scenarios idle,scroll,…`, `--no-build` (reuse the last build), `--headful`, `--out DIR`.
Env: `CHROME`, `FIREFOX`, `PUPPETEER_CORE`.

Pages: the Examples view of glass-container, actions-bar, segmented-control, toolbar and switch,
foundations/glass-reflections, guidelines/patterns, and get-started/introduction as the plain-text baseline.

| scenario | what | metrics |
|---|---|---|
| idle | 3 s, pointer parked, nothing moving | page rAF callbacks (attributed to the requesting stack), running infinite animations; Chrome: trace frames drawn + main-thread busy time, CDP deltas |
| scroll | 30 wheel ticks down, 30 up, on the content scroller | rAF frame deltas, CDP deltas, long tasks, heap |
| pointer | 2 s of mouse moves over the first glass surface | same |
| menu | actions-bar example 06: open "More actions", Escape, twice | same |
| drag | carry a segmented pill across and back, then a switch thumb | same |
| split | glass-container example 01: split into two bubbles, merge back | same |

Frame metrics: p50/p95/max rAF delta, `>16` = deltas over 19.2 ms (a missed 60 Hz vsync, with jitter
margin), `>33` = over 33.4 ms. Chrome adds CDP `Performance.getMetrics` deltas (ScriptDuration,
LayoutDuration, RecalcStyleDuration, TaskDuration) and `longtask` entries. The idle scenario never runs
the rAF recorder, since a rAF loop would itself keep frames coming.

Firefox: the run probes whether backdrop filters are painted (same striped box screenshotted with and
without a blur overlay). Headless Firefox under WebDriver BiDi does not paint them, so Firefox numbers
are flagged as main-thread only. Its refresh driver is pinned to 60 Hz (`layout.frame_rate`).

## Flutter (`bench/flutter.sh`)

`bench/flutter` is a small app that depends on `../../flutter` and on copies of the docs' Dart examples
(`tool/sync_examples.mjs`, gitignored). Each page stacks every example of one docs page on the docs
stage, like the docs Examples view, plus `baseline/text`. `lib/bench_main.dart` drives itself in
`flutter run --profile -d macos`: synthetic pointer events through `GestureBinding`, `FrameTiming`s
via `SchedulerBinding.addTimingsCallback`, and writes `flutter.json`. The macOS runner is generated on
first run (1280×800 window, App Sandbox off so it can write the report).

Same scenarios (menu closes by clicking outside). Per window: frames, build (UI thread) and raster
p50/p95/max, `missed` = build or raster over 16.7 ms, totals. Each window has a 400 ms tail so the
engine's batched timing reports arrive. `harness/providers` is the floor (kit providers, empty page;
should be 0 idle frames). A page that renders frames while idle is re-measured one example at a time
(`idleByExample`) to name the culprit.

It is not an integration test on purpose: `flutter_test`'s live binding renders about 48 fps forever
whenever a scroll view is on screen, which hides the idle numbers.

Options: `--reps N`, `--pages`, `--scenarios`, `--out DIR`.
