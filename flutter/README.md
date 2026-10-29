# feeef_ui

The Flutter twin of `@feeef.dev/ui`: same component names and props, same tokens and geometry,
built on `package:flutter/widgets.dart` only (it works inside a MaterialApp but doesn't need one).
Labels and other visible content are widgets (`Text`, `LucideBold()`), on both sides.

## What is ported

Everything in the web kit. Every docs example has a Dart twin (156 of them, next to the `.tsx` in
`docs/content/**/examples/`), and each is rendered by both kits and diffed pixel by pixel in six
variants (light, dark, mono, compact, thin, right-to-left). The numbers are the share of differing
pixels per docs page: median / worst variant. Almost all of what remains is glyph rasterization
(Skia and the browser draw the same font slightly differently).

| Web kit | Flutter | Docs parity |
|---|---|---|
| `theme`, `theme-config`, tokens, `i18n` | `ThemeProvider`, `ThemeModeProvider`, `ThemeConfig`, `ColorTokens`, `SizeTokens`, `I18nProvider`, `ThemeSwitch`, `LanguageSwitcher` | every page |
| `primitives/button` | `Button`, `IconButton`, `ControlOverrides` | button 0.21 / 0.64% |
| `primitives/segmented` | `SegmentedControl` | segmented-control 0.35 / 0.61% |
| `primitives/choice`, `switch`, `badge` | `Checkbox`, `Radio`, `RadioGroup`, `Switch`, `ProBadge` | checkbox 0.50 / 1.03%, radio-group 0.34 / 0.68%, switch 0.07 / 0.88%, badge 0.34 / 0.62% |
| `primitives/slider` | `Slider`, `SlideSwitch` | slider 0.07 / 0.62% |
| `primitives/text-field`, `field-shell`, `raw-input`, `fields` | `TextField`, `FieldShell`, `RawInput`, `FieldForm`, `Input`, `Textarea` | text-field 0.48 / 1.39% |
| `primitives/number-field` | `NumberField` | number-field 0.40 / 1.12% |
| `primitives/select` | `Select`, `Option` | select 0.38 / 1.20% |
| `primitives/temporal-field`, `filters/*` | `DateField` … `DateTimeRangeField`, `CalendarMonth`, `TemporalFilterEditor`, `TemporalDialog` | date-time-fields 0.43 / 0.93%, temporal-filter-editor 0.40 / 1.28% |
| `primitives/list` | `ListSection`, `ListRow`, `RowAction` | list 0.39 / 0.67% |
| `presentation` | `Alert`, `Modal`, `PresentationHeader`, `PresentationBody`, `PresentationDock`, `showAlert`, `showModal`, `showSheet` (a `PopupRoute`, so they work in a plain `WidgetsApp`) | modal 0.13–0.50%, pane 0.13–0.43%, sheet 0.06–0.49% (docs examples and open scenes) |
| `popover-surface`, tooltip | `PopoverSurface`, `Popover`, `Tooltip` | popover-surface 0.23 / 0.44% |
| `menu` | `MenuSurface`, `MenuRow`, `MenuSeparator`, `MenuLabel`, `MenuTokens`, `FloatingBoundary`, `AnchoredPanel` (the Radix Popper twin every popup lays out in) | menu (new) |
| `glass` | `GlassContainer`, `GlassScope`, `GlassLayer`, `GlassBackdrop`, refraction shader | glass-container 1.82 / 4.77% (Chrome bends the backdrop; Flutter web can't), glass-group 0.30 / 2.09% |
| `scaffold` (`GlassGroup`), `toolbar`, `toolbar-search` | `GlassGroup`, `Toolbar`, `ToolbarGroup`, `ToolbarSearch`, `ScaffoldProvider`, `FloatingLayer` | toolbar 0.32 / 0.77% |
| `filter-bar` | `FilterBar`, `FilterOption` | filter-bar 0.59 / 1.48% |
| `dock`, `actions` | `Dock`, `DockContentSwap`, `ActionsBar`, `ActionsMenuAnchor` | dock 0.85 / 1.84%, actions-bar 0.55 / 1.54% |
| `scroll` | `ScrollArea`, `ScrollGradientOverlay`, `revealScrollChild` | scroll-area 1.06 / 2.62% |
| `containers` | `NavigationStack`, `Sheet`, `SplitView`, `TabView`, `Carousel`, `AdaptiveStack`, `ViewThatFits` | navigation-stack 0.30 / 0.49%, sheet 0.24 / 0.48%, split-view 0.62 / 0.68%, tab-view 0.49 / 0.74%, carousel 0.18 / 0.42%, adaptive-layouts 0.29 / 0.70% |
| `workspace`, `navigation` | `Scaffold`, `ScaffoldSide`, `ScaffoldAppBar`, `ScaffoldTopBar`, `WorkspaceHeader`, `NavigationItem`, `MovingBrand` | scaffold 0.61 / 2.44%, navigation-item 0.38 / 0.60% |
| `motion`, `physics` | `Presence`, `Swap`, `AutoHeight`, `StableText`, `LayoutGroup`, `Springs`, `MotionValue`, `VelocityTracker` | motion 0.14 / 0.44%, layout-transitions 0.43 / 0.68% |
| `model-ladder`, `speech` | `ModelLadder`, `ModelLadderCard`, `SpeechBlock`, `SpeechReorderGroup` | model-ladder 0.31 / 0.49%, speech-block 0.80 / 0.94% |
| `composer`, `image` | `PromptComposer`, `ImagePromptComposer`, `PromptSettingsPanel`, `FreeformBoard`, `ImageWorkspace` | prompt-composer 0.52 / 0.80%, image-workspace 5.42 / 23.72% (the pending take's shimmer is captured at a different time) |
| `brand`, `pixel-art`, `avatar-fingerprint` | `FoAnimatedLogo`, `FoAnimatedLogoPlayer`, `PixelArtwork`, `PixelTexture`, `PixelLoader`, `PixelShader`, `voiceFingerprint` | pixel-art 0.30 / 1.06% (shader phase) |
| `lucide-react` | `LucideIcon` + all 1,895 icons (generated) | every page |
| Guidelines | — | patterns 0.64 / 1.52% |

Not ported on purpose: `brand/corners.ts` (Flutter always draws the true superellipse), a
`List`/`ListItem` pair (a Dart `List` would shadow `dart:core`; use `ListSection`/`ListRow`).
Glass is configured like the web kit: `ThemeConfig(glass: liquid|still|solid, glassTint: 0…1
(0.5 default, the Liquid Glass slider: 0 clear, 1 tinted), glassBlur: false, glassRefraction: true)`.
The tint curve is `glassMaterial()` in `glass/material.dart` (same vectors as the web, via
`test/fixtures/glass.json`). Refraction needs Impeller; Flutter web and Skia show the same glass
without the bend. `MediaQuery.highContrast` makes glass solid with an ink outline
(`glassStyleOf(context)`), `disableAnimations` stops the moving light and press response; Flutter
has no reduce-transparency flag, so apps that read one pass `glass: GlassStyle.solid`.
`ThemeConfig(motion: full|reduced|none)` joins `disableAnimations`: kit widgets read
`reducedMotionOf(context)` / `motionOf(context)`, never the MediaQuery flag directly; `none` also
stops ambient tickers. Profiles: `ThemeProfiles.quality|balanced|performance` (change with `copyWith`);
`glassCapabilities()` reports Impeller refraction and blur. Glass is
fitted to iOS 26 Liquid Glass measured from the outside: `../research/liquid-glass/FINDINGS.md`.

Glass is built to cost little per frame: outlines are cached per geometry (`superellipsePath`,
`outlineBand`), a container rebuilds its clusters at most once per frame and walks each cluster's
contour once for its outline, rim light and hairline, bubble contents paint in their own layers so a
spring, a press or the moving light never re-records the buttons inside, and the pointer light turns
in 2° steps so a mouse far from the glass seldom repaints it. `ThemeConfig(performance:)` still picks
the tier (`auto` steps weak and measured-slow devices down; see `performance.dart`).
`test/dev/glass_bench_test.dart --dart-define=bench=true` prints the costs.

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
  from the web kit's CSS (`test/fixtures/css_tokens.json`, regenerated in Chrome by
  `node flutter/tool/generate_css_tokens.mjs` after building the parity app).
- `test/geometry_test.dart`, `glass_test.dart`, `motion_test.dart`, `pixel_noise_test.dart`:
  superellipse corners, glass distances and outlines, light, springs, press response, transition
  plans and pixel noise match vectors generated from the TypeScript
  (`npx tsx flutter/tool/generate_glass_fixture.ts` from `ui/`).
- Widget tests cover sizes per density and pointer type, keyboard models (radio groups, sliders),
  validation, semantics and glass motion.
- `../parity/`: the same scenes and every docs example rendered by React (`parity/src`) and by
  Flutter web (`example/`), captured in headless Chrome at 2x in six variants and diffed pixel by
  pixel. One or more docs pages, in their own folder (safe to run in parallel):

```bash
parity/docs-check.sh components/button,components/toolbar
```

  Everything (hand-built scenes too):

```bash
npx vite build --config parity/vite.config.ts
node flutter/tool/sync_docs_examples.mjs
cd flutter/example && flutter build web --release && cd ../..
node parity/compare.mjs docs
node parity/compare.mjs
```

  Pages that draw a phone or tablet frame (sheet, tab-view, navigation-stack) are taller than
  the default 700px capture window: run them with `PARITY_VH=900`, or the Flutter capture is
  cut off below the window and dark mode reads as ~17% different.

Text sits on Chrome's baseline: `CssBaseline` reproduces Blink's line layout (ascent and descent
rounded at the device scale, half leading floored). What remains in the diffs is glyph
rasterization (CoreText on macOS draws heavier, slightly differently hinted glyphs than Skia); the
`text` scene measures it. Flutter's paragraph layout rounds every line's height to the nearest
whole pixel (19.5px → 20, 20.8px → 21, 19.2px → 19) and there is no API to turn that off, while
Chrome keeps fractional line heights. So every line height in the kit is a whole number of pixels
on both sides (`font: 14px/20px`, `height: 20 / 14`); where the font size varies, CSS uses
`round(1.12em, 1px)` and Dart `(size * 1.12).roundToDouble() / size`. Text that inherits a
unitless line height from the host (a dock tile in a `line-height: 1.6` page) can still differ
by a fraction of a pixel per line.

```bash
flutter test
```
