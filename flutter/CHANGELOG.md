## Unreleased

Flutter DevTools:

* Every widget, State and render object describes its properties for the inspector, and the
  theme objects are `Diagnosticable`; `diagnostic_describe_all_properties` is on for `lib/`.
* A `feeef_ui` DevTools tab (`extension/devtools`, source `devtools_extension/`): the themes in the
  tree with their tokens, the effects tier, live theme overrides and a slow-device switch, over the
  new `ext.feeef_ui.*` service extensions (`KitDevTools`, `ThemeOverride`).
* `feeef_ui:` timeline events for glass outlines and rasters, and `feeef_ui.*` logs for shader load
  failures and a device measured slow (`kitTimeline`, `kitLog`).

Performance, with no change to the look:

* Glass: a container rebuilds its outlines at most once per frame (springs, presses and measures
  only mark them stale) and compares them to a tenth of a pixel; each cluster walks its contour
  once (`clusterOutline`) and its rim light and hairline sample that polygon (`loopNormals`,
  `hairlineBandsOfLoops`) instead of running marching squares and path metrics again: a lone
  bubble's hairline costs about 3% of what it did. The ring-and-sliver band no longer needs a
  path union.
* Glass: the pointer light is kept to 2° steps and notifies on its own (`GlassContainer.debugLightOf`
  in tests), so a mouse far from the glass repaints it only when the rim can show the turn and never
  reclips its backdrop filters.
* Glass: every bubble's content paints in its own layer under the glass transform, so the moving
  light, springs and presses no longer re-record the buttons inside each bubble, and a control's
  hover or press no longer repaints the glass and its backdrop filters. A bubble out of the glass
  (hidden, squeezed away, closing) paints with its container again, keeping its state.
* `superellipsePath` / `superellipsePoints` are cached per geometry and round without going
  through strings (13× cheaper per call); `outlineBand` caches the inset-shadow bands lenses,
  buttons and floating surfaces draw. Cached paths are shared: never mutate them.
* Theme: resolved colour tokens are cached per palette, brightness, tint and primary.
* Menus: rows blur and fade in one offscreen pass while a menu opens or closes.
* Lists: while a row is reordered, the rows it moves are layers shifted per frame, not repainted;
  each keeps its element and state across the move.
* Glass: the hairline outside every shape is painted (black at its strength, as the web kit
  paints it: on white exactly iOS 27's plus-darker) instead of filtered: a cluster now costs one
  backdrop pass, the material's, instead of two or three. Over dark content it reads a touch
  lighter than the old subtract and the same as on the web.
* Still shadows (elevated and prominent buttons, segmented pills, slider thumbs, fields, tooltips,
  alerts, sheets, lifted speech blocks) are rendered once per geometry at the device pixel ratio
  and drawn as images (`paintStill`, `theme/raster.dart`, 24 MB kept, oldest dropped): Impeller
  has no raster cache, so every blur on screen was a Gaussian pass on every frame anything moved.
  A fading shadow scales the image's alpha; nothing is re-rendered.
* `test/dev/glass_bench_test.dart` (`--dart-define=bench=true`) prints the glass costs.

## 0.0.1

* TODO: Describe initial release.
