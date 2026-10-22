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
| `primitives/button` | `Button`, `IconButton`, `ControlOverrides` | button 0.24 / 0.71% |
| `primitives/segmented` | `SegmentedControl` | segmented-control 0.17 / 0.50% |
| `primitives/choice`, `switch`, `badge` | `Checkbox`, `Radio`, `RadioGroup`, `Switch`, `ProBadge` | checkbox 0.49 / 1.03%, radio-group 0.34 / 0.68%, switch 0.07 / 0.88%, badge 0.42 / 0.66% |
| `primitives/slider` | `Slider`, `SlideSwitch` | slider 0.06 / 0.59% |
| `primitives/text-field`, `field-shell`, `raw-input`, `fields` | `TextField`, `FieldShell`, `RawInput`, `FieldForm`, `Input`, `Textarea` | text-field 0.47 / 1.39% |
| `primitives/number-field` | `NumberField` | number-field 0.40 / 1.12% |
| `primitives/select` | `Select`, `Option` | select 0.37 / 1.24% |
| `primitives/temporal-field`, `filters/*` | `DateField` … `DateTimeRangeField`, `CalendarMonth`, `TemporalFilterEditor`, `TemporalDialog` | date-time-fields 0.47 / 1.07%, temporal-filter-editor 0.62 / 1.25% |
| `primitives/list` | `ListSection`, `ListRow`, `RowAction` | list 0.52 / 0.79% |
| `primitives/modal`, `popover-surface`, tooltip | `Modal`, `PopoverSurface`, `Popover`, `Tooltip` | modal 0.17 / 1.97%, popover-surface 0.17 / 0.44% |
| `glass` | `GlassContainer`, `GlassScope`, `GlassLayer`, `GlassSurface`, `GlassBackdrop`, refraction shader | glass-container 0.34 / 1.30%, glass-group 0.33 / 2.11% |
| `scaffold` (`GlassGroup`), `toolbar`, `toolbar-search` | `GlassGroup`, `Toolbar`, `ToolbarGroup`, `ToolbarSearch`, `ScaffoldProvider`, `FloatingLayer` | toolbar 0.31 / 0.71% |
| `filter-bar` | `FilterBar`, `FilterOption` | filter-bar 0.61 / 1.61% |
| `dock`, `actions` | `Dock`, `DockContentSwap`, `ActionsBar`, `ActionsMenuAnchor` | dock 1.04 / 2.00%, actions-bar 0.69 / 1.69% |
| `scroll` | `ScrollArea`, `ScrollGradientOverlay`, `revealScrollChild` | scroll-area 1.06 / 2.39% |
| `containers` | `NavigationStack`, `Sheet`, `SplitView`, `TabView`, `Carousel`, `AdaptiveStack`, `ViewThatFits` | navigation-stack 0.44 / 0.78%, sheet 0.20 / 0.75%, split-view 0.76 / 0.81%, tab-view 0.83 / 0.93%, carousel 0.18 / 0.42%, adaptive-layouts 0.29 / 0.59% |
| `workspace`, `navigation` | `Scaffold`, `ScaffoldSide`, `ScaffoldAppBar`, `ScaffoldTopBar`, `WorkspaceHeader`, `NavigationItem`, `MovingBrand` | scaffold 0.61 / 2.44%, navigation-item 0.34 / 0.53% |
| `motion`, `physics` | `Presence`, `Swap`, `AutoHeight`, `StableText`, `LayoutGroup`, `Springs`, `MotionValue`, `VelocityTracker` | motion 0.18 / 0.59%, layout-transitions 0.76 / 1.47% |
| `model-ladder`, `speech` | `ModelLadder`, `ModelLadderCard`, `SpeechBlock`, `SpeechReorderGroup` | model-ladder 0.20 / 0.78%, speech-block 0.81 / 0.91% |
| `composer`, `image` | `PromptComposer`, `ImagePromptComposer`, `PromptSettingsPanel`, `FreeformBoard`, `ImageWorkspace` | prompt-composer 0.51 / 0.66%, image-workspace 0.25 / 0.66% |
| `brand`, `pixel-art`, `avatar-fingerprint` | `FoAnimatedLogo`, `FoAnimatedLogoPlayer`, `PixelArtwork`, `PixelTexture`, `PixelLoader`, `PixelShader`, `voiceFingerprint` | pixel-art 0.37 / 2.28% (shader phase) |
| `lucide-react` | `LucideIcon` + all 1,895 icons (generated) | every page |
| Guidelines | — | patterns 0.84 / 2.22% |

Not ported on purpose: `brand/corners.ts` (Flutter always draws the true superellipse), a
`List`/`ListItem` pair (a Dart `List` would shadow `dart:core`; use `ListSection`/`ListRow`).
Glass is configured like the web kit: `ThemeConfig(glass: liquid|still|solid, glassTint: 0…1
(0.5 default, the Liquid Glass slider: 0 clear, 1 tinted), glassBlur: false, glassRefraction: true)`.
The tint curve is `glassMaterial()` in `glass/material.dart` (same vectors as the web, via
`test/fixtures/glass.json`). Refraction needs Impeller; Flutter web and Skia show the same glass
without the bend. `MediaQuery.highContrast` makes glass solid with an ink outline
(`glassStyleOf(context)`), `disableAnimations` stops the moving light and press response; Flutter
has no reduce-transparency flag, so apps that read one pass `glass: GlassStyle.solid`. Glass is
fitted to iOS 26 Liquid Glass measured from the outside: `../research/liquid-glass/FINDINGS.md`.

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
