# feeef_ui

The Flutter twin of `@feeef.dev/ui`: same component names and props, same tokens and geometry,
built on `package:flutter/widgets.dart` only (it works inside a MaterialApp but doesn't need one).
Labels and other visible content are widgets (`Text`, `LucideBold()`), on both sides.

## What is ported

| Web kit | Flutter | Parity scene (React vs Flutter pixels) |
|---|---|---|
| `theme`, `theme-config`, tokens | `ThemeProvider`, `ThemeConfig` (palette, density, radius, glass, glassRenderer) | every scene |
| `brand/geometry`, `pixel-art` noise | `superellipsePath`, `SuperellipseBorder`, `paintPixelTexture` | `corners` 0.02–0.04% |
| `primitives/button` | `Button`, `IconButton`, `ControlOverrides` | `buttons`, `button-states` ≈1% |
| `primitives/segmented` | `SegmentedControl` | `segmented` 0.21–0.50% |
| `primitives/choice`, `primitives/badge` | `Checkbox`, `Radio`, `RadioGroup`, `ProBadge` | `choices` 0.60–0.80% |
| `primitives/slider`, `switch` | `Slider`, `SlideSwitch`, `SlideSwitchIndicator` | `sliders` 0.03–0.07% |
| `primitives/text-field`, `field-shell` | `TextField`, `FieldShell` | `fields` 0.59–0.78% |
| `glass` | `GlassContainer`, `GlassScope`, glass geometry, light, press, transitions | `glass` 0.36–0.49% |
| `scaffold` (`GlassGroup`), `toolbar` | `GlassGroup`, `Toolbar`, `ToolbarGroup` | `glass` |
| `physics/spring`, `motion-value` | `Spring`, `Springs`, `solveSpring`, `MotionValue`, `rubberBand` | vectors |
| `primitives/popover-surface` | `PopoverSurface` (breathing pixel grain) | `popover` 0.33–0.43% |
| `scroll` | `ScrollArea`, `ScrollGradientOverlay`, scroll metrics | `scroll` 0.47–0.63% |
| `actions` | `ActionsBar`, `Action` (`CommandAction`, `ToggleAction`, `GroupAction`), `computeActionsLayout`, `ActionsWidthProvider` | `actions` 0.86–1.20% |
| `primitives/list`, `list-model` | `ListSection`, `ListRow`, `RowAction` (swipe actions, full swipe, drag and keyboard reorder) | `list` 0.45–0.53% |
| `primitives/select` | `Select`, `Option` (field or plain trigger, anchored menu, keyboard, validation) | `select` 0.45–0.65% (closed) |
| `primitives/modal` | `Modal` (OverlayPortal: focus scope, Escape, backdrop, return focus) | `modal` 0.21–0.26% |
| `dock` | `Dock`, `DockContentSwap` | `dock` 0.52–1.05% |
| `lucide-react` | `LucideIcon` + all 1,895 icons (generated) | `icons` 0.43–0.63% |

Not yet: navigation containers, sheets, workspace scaffold.
Glass on Flutter has no adaptive tint (it can't sample what is behind it) and no refraction yet;
`GlassRenderer.canvas` blurs like `css` until the Impeller shader lands.

## Use

```dart
import 'package:feeef_ui/feeef_ui.dart' as ui;

ui.ThemeProvider(
  config: const ui.ThemeConfig(density: .comfortable),
  child: ui.Button(variant: .filled, onClick: save, children: const [Text('Save')]),
)
```

Import paths mirror the web kit (`package:feeef_ui/primitives/button.dart` ↔
`@feeef.dev/ui/primitives/button`). Names such as `Button` and `RadioGroup` are generic: prefix the
import when an app also imports Material, or `hide Action, RadioGroup` from `widgets.dart`. Always pass
a `variant` to `Button`: the web kit's variant-less button is a legacy unstyled mode with no twin.

## Parity

Numbers are tested against the web kit, not eyeballed:

- `test/tokens_test.dart`: every colour token and emphasis recipe matches what the browser computes
  from the web kit's CSS (`test/fixtures/css_tokens.json`).
- `test/geometry_test.dart`, `glass_test.dart`, `motion_test.dart`, `pixel_noise_test.dart`:
  superellipse corners, glass distances and outlines, light, springs, press response, transition
  plans and pixel noise match vectors generated from the TypeScript
  (`npx tsx flutter/tool/generate_glass_fixture.ts` from `ui/`).
- Widget tests cover sizes per density and pointer type, keyboard models (radio groups, sliders),
  validation, semantics and glass motion.
- `../parity/`: the same scenes rendered by React (`parity/src`) and by Flutter web
  (`example/`), captured in headless Chrome at 2x and diffed pixel by pixel:

```bash
npx vite build --config parity/vite.config.ts
cd flutter/example && flutter build web --release && cd ../..
node parity/compare.mjs
```

Text sits on Chrome's baseline: `CssBaseline` reproduces Blink's line layout (ascent and descent
rounded at the device scale, half leading floored). What remains in the diffs is glyph
rasterization (CoreText on macOS draws heavier, slightly differently hinted glyphs than Skia); the
`text` scene measures it. Flutter's paragraph layout rounds every line's height up to a whole
pixel, so text with `line-height: normal` (a Plex line is 1.5em, 19.5px at 13px) can come out up
to 1px taller per line than Chrome's; kit components set explicit line heights, so this only
affects free content such as a dock tile.

```bash
flutter test
```
