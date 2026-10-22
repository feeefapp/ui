# feeef_ui

The Flutter twin of `@feeef.dev/ui`: same component names and props, same tokens and geometry,
built on `package:flutter/widgets.dart` only (it works inside a MaterialApp but doesn't need one).

Status: parity spike. `ThemeProvider`, `Button` and `SegmentedControl`, with the kit's colour tokens
and superellipse corners.

## Use

```dart
import 'package:feeef_ui/feeef_ui.dart' as ui;

ui.ThemeProvider(
  config: const ui.ThemeConfig(density: .comfortable),
  child: ui.Button(variant: .filled, onClick: save, children: const [Text('Save')]),
)
```

Import paths mirror the web kit (`package:feeef_ui/primitives/button.dart` ↔
`@feeef.dev/ui/primitives/button`). Names such as `Button` are generic; prefix the import when an app
also imports Material.

## Parity

- `test/tokens_test.dart`: every colour token and emphasis recipe, in the lab and mono palettes,
  light and dark, matches what the browser computes from the web kit's CSS (fixture
  `test/fixtures/css_tokens.json`, resolved with `getComputedStyle`).
- `test/geometry_test.dart`: superellipse corners match `brand/geometry.ts` point for point (fixture
  generated from the TypeScript).
- `test/widgets_test.dart`: sizes per density and pointer type, activation, disabled/loading,
  semantics, and the segmented control's radio keyboard model (arrows, Home/End, RTL, one Tab stop).
- `example/`: a Flutter web gallery rendering the same demos as the docs, for side-by-side checks
  (`flutter build web` in `example/`, then the `ui-flutter-gallery` launch config).

Known gap: the web kit uses the system font stack and Flutter web can't, so text widths differ until
both sides bundle one font for comparisons.

```bash
flutter test
```
