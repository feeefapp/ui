# iOS 27 Liquid Glass, from Apple's Figma kit

Source: Apple "iOS and iPadOS 27" Community file, copied by the owner to
`figma.com/design/7sXU5CReDiYJZDDwj84Lwn` (page "Glass reference (Claude)" holds the test tiles).
Recipes were read with the Figma plugin API (exact layer values, not exports). Reference renders are
Figma's own GLASS effect, 3x: `figma27/sheet-3x.png` (bubbles), `figma27/sizes-3x.png` (bars, panels).

Every glass shape is a component `Liquid Glass - <Regular|…> - <Small|…>` with variants
`Mode=Light|Dark`, `Active=True|False`, `Prominent=True|False`, built from two layers, bottom to top:

1. **Fill + Shadow**: veil fills plus outer edge effects.
2. **Glass Effect**: Figma GLASS effect + three inner shadows.

Blend names: Figma LINEAR_BURN = `plus-darker` (dst + src − 1), LINEAR_DODGE = `plus-lighter` (dst + src).

## Glass Effect layer (all active variants)

GLASS: blur radius 6 (bound to a variable), refraction 0.7, depth 30, dispersion 0.2, splay 0.2,
light angle 0, light intensity 0.25 (Control Center tiles: 0.4).

Inner shadows (all spread −40, so on shapes under ~80 px they cover the whole interior; on larger
shapes they become bands 80 px deep at top/bottom and 40 px at the sides):
- LINEAR_BURN `#E6E6E6` (−0.098), offset y +40, blur 30
- LINEAR_DODGE `#282828` (+0.157) light / `#1A1A1A` (+0.102) dark, offset y −40, blur 10
- LINEAR_DODGE same colour, offset y +40, blur 10

## Fill + Shadow layer

| Variant | Fills (in order) | Outer ring (spread 0.5, LINEAR_BURN) | Side slivers (dx ±1.25, spread −0.75, LINEAR_BURN) | Drop shadow |
|---|---|---|---|---|
| Regular light | black 25% · white 25% · `#444` 60% LINEAR_DODGE · `#F8F8F8` 20% LUMINOSITY | `#E8E8E8` (−0.090) | `#D0D0D0` (−0.184) | y 8, blur 15, black 2% |
| Regular dark | `#999` 17% LUMINOSITY | `#A6A6A6` (−0.349) | `#A6A6A6` (−0.349) | y 8, blur 15, black 4% |
| Prominent light / dark | (separate layers) white 94% backing, then tint (`#0088FF`) LINEAR_BURN | none | `#E6E6E6` (−0.098) | 2% / 4% |
| Clear (Control Center, light) | `#101010` 100% LINEAR_DODGE · white 4% LUMINOSITY | `#CCCCCC` (−0.200) | `#D0D0D0` (−0.184) | y 8, blur 15, black 2% |
| Inactive light | `#747480` 8% | `#EBEBEB` (−0.078) | none | none |
| Inactive dark | `#767680` 24% | `#E6E6E6` (−0.098) | none | none |

Inactive = flat, no GLASS effect (controls that are not floating).

## Measured from Figma's render (48 px bubble, R channel, interior above the stripe)

| Backdrop | 255 | 235 | 128 | 26 | 0 |
|---|---|---|---|---|---|
| Regular light | 241 | 233 | 185 | 138 | 126 |
| Regular dark | 231 | 214 | 125 | 42 | 20 |
| Clear (66 px) | 250 | 246 | 143 | 46 | 21 |

- Regular light ≈ `0.45·x + 0.49`, i.e. a veil of ≈ 0.90 grey at 55 %.
- Regular dark ≈ `0.83·x + 0.08`, i.e. a veil of ≈ 0.47 grey at 17 %.
- Clear ≈ `x + 0.07`, clipped.
- **Edge:** every variant has a dark hairline outside the shape, about 1 pt.
  - At its darkest pixel (3x) the backdrop drops by about 65 (regular light), 170 (regular dark) and 65 (clear).
  - It is strongest at the left and right, where the side slivers add up.
  - Inside it there is a 1–2 px brighter rim (+5 to +10).
- **The lower half reads 6 levels brighter than the upper half** (from the inner dodge bands).

## What this changes vs our iOS 26.2 model (LIGHT-EDGES.md)

The iOS 26.2 simulator had no dark edge. iOS 27 (this kit) puts a darkening hairline outside every
glass shape, in light **and** dark mode. That hairline, not the veil, is what keeps a bubble readable
on white. The clear lift we already ship (`x + 0.076`) matches this kit's clear recipe.

## Kit fit (2026-10-24, uncommitted)

Implemented in both kits (`src/glass`, `flutter/lib/glass`). Measured with `tools/analyze_figma27.py` (Figma),
`tools/figma27_kit.mjs` + `flutter_compare/figma27.dart` (kit renders, same layouts and backdrops),
`tools/figma27_compare.py` (numbers, sheets).

- **Material (moved a lot):** regular light veil 0.87/0.71 → 0.52 with gain 0.92; regular dark veil
  0.75/0.72 → 0.05 with gain 0.863 and offset 0.095 (Figma's dark veil is a light grey, so a dark-surface
  veil cannot reach it); colour kept 0.52 light / 0.99 dark. No small/large split (iOS 27 shows none).
  Clear unchanged (the shipped lift already matches). Tokens: `--lab-glass-lift-gain|offset` per scheme.
- **Hairline:** ring 0.5 px + side slivers (±1.25, −0.75), light clear 0.2/0.184, regular 0.09/0.184,
  dark 0.349/0.349 (`GLASS_HAIRLINE`, `hairline.ts`). Web paints it as even-odd SVG paths, black at that
  alpha: exact on white, proportionally weaker on darker backdrops. A backdrop-filter clipped to the
  band would be exact, but Chromium clips such filters to the clip's bounding box inside glass
  (the grey-rectangle bug). Flutter subtracts exactly (`ClipPath` + `BackdropFilter(subtractMatrix)`).
  It stays with reduced transparency and more contrast and is hidden for solid glass.
- **Shadow:** y 8, std dev 7.5, 2 % light / 4 % dark, at every tint (clear too); one shadow token.
- **Lens:** the default refraction profile is now `gentle` on both kits (Figma's lens never folds); this
  alone took regular bubbles from ~2 to ~0.6 mean difference.
- **Not done:** inner dodge/burn bands (additive, not cheap on the web paths; the net transfer already
  includes them for small glass); Figma's top/bottom inner rim (the kit keeps its diagonal rim);
  prominent tinted glass (separate Button task).

Mean |Δ| vs Figma (0–255), before → after:

| | web | Flutter (web build) |
|---|---|---|
| regular light bubbles (5 backdrops) | 4.0–10.3 → 0.58–0.79 | 4.0–10.8 → 0.77–1.04 |
| regular dark bubbles | 4.4–18.3 → 0.77–0.94 | 4.9–14.2 → 1.13–1.41 |
| clear bubbles (66 pt) | 5.1–8.2 → 2.6–3.5 | 3.7–5.3 → 2.1–3.6 |
| bars/panels light | 8.2–44 → 1.9–3.3 | 4.1–49 → 2.0–4.4 |
| bars/panels dark | 21–111 → 2.9–5.1 | 22–97 → 3.2–11.0 |

Edge (Δ just outside, sides / top, Figma → kit after): regular light on white −68/−23 → web −64/−24,
Flutter −69.5/−24; on 128 −64/−23 → web −26/−7, Flutter −63.5/−23; regular dark on white −172/−90 →
web −148/−90, Flutter −179/−90. Sheets: `reference/figma27-{sheet,sizes,edges}-{web,flutter}.png`
(Figma / kit before / kit after). Flutter "before" bubbles may be slightly undersized (captured with the
materialize spring possibly still running; "after" renders with motion off).

## Prominent buttons (2026-10-24, uncommitted)

`Button variant="filled"` (and `primary`) and `variant="destructive"` (danger colour, on-danger ink) are
iOS 27's prominent glass on both kits, every size and appearance (they stay prominent in toolbars).
Web: CSS on the button (`control-variants.css`, `[data-prominent]`); Flutter: `_SurfacePainter`
(`button.dart`, `prominent`).
- Base: the tint pre-darkened at 97 % over a 6 px backdrop blur = `tint − 0.03 + 0.03 · backdrop`. iOS lets
  ~6 % through, but an alpha blend cannot take a channel below the share it lets through (`#0088FF`'s
  R = 0 read 15 at 6 %), so 3 % keeps saturated tints near-exact on white. Flutter: flat tint (no leak).
- Rim: the 1 px border itself, white 55 % at top and bottom, 15 % at the sides (the CSS border sides meet
  at 45° on a capsule; Flutter strokes the ring and clips the bright quarters). Figma: 1 px tint, then
  G 230 / 190 at the top edge, 192 / 224 at the bottom. Kit: 202 / 202.
- Shade: the upper third 5 % darker (a gradient layer of the fill, so hover, press and focus still work);
  a lighter lower edge (inset 0 −8px 8px −4px white 6 %).
- Outside: the glass shadow (y 8, blur 15, 2 % / 4 %) and the two side slivers (±1.25, −0.75, black
  9.8 %); no ring. Press keeps the rim. Reduced transparency: flat tint, rim kept. Forced colours unchanged.
- 48 pt bubble on white vs Figma, mean |Δ| over the box + 4 pt: before 8.45 → after 7.03 (the interior is
  flat tint before, 3.9; after 4.3, mostly the residual red channel and the pixel texture).
- Sheet: `reference/figma27-prominent-buttons.png`: Figma prominent (255 / 128 / 0), then kit before | after,
  light (top) and dark (bottom), 36 / 44 / 48 pt circles and a 160×44 capsule, primary `#0088ff`.
- Parity `components/button`: ≤ 0.66 % differing, mean Δ ≤ 1.20 (README baseline 0.21 / 0.64 %; the
  remainder is the web-only backdrop leak).

## Tab bar (iOS 27 kit SVG export, light, 402 pt wide screen)

- **Bar.** A capsule 290 × 62 at (21, 12), using the Regular light glass recipe (same fills, hairline and shadow as above).
  - Search is its own 62 × 62 circle bubble, 8 pt to the right (x 319). It is a separate member of the same glass container.
- **Selected tab at rest.**
  - A capsule inset 4 pt on all sides: 102 × 54, radius 27, here at x 25–127.
  - Filled `#EDEDED` blended plus-darker: it darkens what's behind by 0.071 (about 18 levels).
  - This is a quiet grey pill, not a tinted one.
- **Tabs.** Icon and label stack as one glyph, about 26 × 38 pt.
  - Tab centres are 90 pt apart (76, 166, 256).
  - The selected pill is 12 pt wider than that pitch, so it reaches into its neighbours.
  - The selected icon and label take the accent colour.
- **While pressing or dragging** (iOS 26 beta 6+ and iOS 27 behaviour, from the owner's reference screenshots):
  - The pill turns into a clear glass lens, a water drop. It is a little wider than the pill and taller than the bar, sticking out above and below it.
  - It magnifies the tabs under it by about 1.15–1.25×, with a refracting rim and slight colour fringing (dispersion 0.2 in the kit's GLASS effect).
  - The grey fill goes away while it's a lens.
  - On release it springs back into the grey pill on the chosen tab.

### Tab bar component: exact values ("Tab Bar - iPhone", read from the owner's copy)

Variants: `Minimized` True/False × `Tabs` 2–5 × `Type` Default / Search Role / Prominent Tab.
The tab item is a separate component, "_Tab Bar Button - iPhone" (`Mode` Light/Dark × `Selected`).

- **Bar** (not minimized, 402 pt screen):
  - Auto-layout, padding 25 at the sides and 16 at the top.
  - The tabs group and the Search bubble sit 16 apart in layout; the visible glass gap is 8.
  - The tabs group lays out tabs with **−8 spacing** (they overlap) and 2 pt side padding.
  - The glass BG is the group inset −4 on all sides: 62 tall for 54 pt tabs, capsule radius.
  - BG recipe: Regular light/dark glass, as in the tables above.
- **Tabs fill the width equally.**
  - 3 tabs (with search): 98 wide each, 90 apart, group 282.
  - 4 tabs (no search): 93 wide, 85 apart, group 352.
  - Minimum tab width 72.
- **Tab item.**
  - 53.5 tall. Vertical layout, padding 8 at the sides, 6 top, 7 bottom, 0.5 between the glyph and the label.
  - Glyph: SF Symbol, Semibold 18, in a 28 pt line.
  - Label: Semibold 10, 12 pt line.
- **Unselected ink.**
  - Light: `#1A1A1A` plus-darker, so it darkens.
  - Dark: `#F5F5F5` plus-lighter, so it lightens.
- **Selected tab.**
  - The "Selection" capsule is 4 pt wider than the tab (−2 each side), 54 tall, radius full.
    - Light: `#EDEDED` plus-darker, about −18 levels.
    - Dark: `#121212` plus-lighter, about +18 levels.
  - The glyph and label are a mask over two layers:
    - Light: white at 50%, then the tint `#0088FF` plus-darker.
    - Dark: black at 50%, then `#0091FF` plus-lighter.
  - So the selected glyph reads as the accent colour, and the selected label is 0.1 tighter (−0.1 letter spacing).
- **Minimized.** One 40 × 40 tab, glyph only (centred, label gone), inside a 48 × 48 glass circle (inset 4).
  - The bar keeps 32 pt side padding (the accessory sits between).
  - With Search Role, the search bubble also shrinks to 40 in a 48 circle.
- **Search bubble.** A 54 × 54 tab inside a 62 × 62 glass circle.
  - Glyph: magnifying glass, Semibold 17, `#1A1A1A` plus-darker.

Reference renders (light and dark × full, search role, minimized) were placed on the Figma page
"Glass reference (Claude)" as `tabbar-ref@3x`. The Figma MCP Starter-plan call limit was reached
before they could be exported here.
