# Liquid Glass, measured

How rendered iOS 26 Liquid Glass behaves, measured from screenshots only, and the model the kit now
uses (`src/glass/material.ts`, `refraction.ts`, `geometry.ts` and their Dart twins). Nothing here
comes from Apple code: a small app draws glass with public SwiftUI API (`glassEffect(_:in:)`,
`Glass.regular/.clear`, `GlassEffectContainer(spacing:)`, `glassEffectUnion`) over backgrounds we
control, we screenshot the simulator, and we fit our own functions to the pixels.

Setup: Xcode 26.2, iOS 26.2 simulator, iPhone 17 Pro (402 × 874 pt, 3×). All lengths are points =
CSS px = Flutter logical px. Raw numbers: `data/*.json`; fit plots: `data/model-fit.png`.

## How it was measured

| What | Background | Method |
|---|---|---|
| Refraction field | grey sinusoids, 4 phase steps, periods 768/192/96 px, x and y | Per pixel the four shifted captures give phase (where the glass sampled from), modulation (blur × contrast) and mean (veil), independent of any per-pixel brightness/contrast change. Unwrapped coarse to fine. The bare pattern decodes to 0.04 px median error. |
| Blur | the same fringes (two periods cancel the gain), binary noise spectra | Gaussian fit `ln(m96/m192) = −2π²σ²(1/96² − 1/192²)` |
| Material | 14 flat colours (greys, saturated, skin, dark green), regular/clear, light/dark | median colour of each shape's flat middle; line fit on greys, chroma ratio on colours |
| Rim and shadow | flat black, grey, white | luminance by signed distance (1 px bins) × edge-normal direction (12 × 30°) |
| Merging | 2 px checker (glass blurs it away: low local variance = glass) | neck half-height between two 64 pt circles, gaps 40…0, spacing 0/20/40 |

Shapes: circles 44/64/88/120/240, capsules 44/56/64/120 high, rounded rects r 8/12/24/28/44
(`app/layouts.json`). Not measured: interactive press (needs a live touch), motion, tinted glass.

## The model

### 1. Refraction

Inside the edge every pixel shows the backdrop from further in, along the inward normal, never
sideways (across-normal shift < 0.1 pt everywhere):

    shift(t) = A · (1 − t / T)^4          t = depth from the edge, 0 ≤ t < T
    A = 47 · s,  T = 27 · s,  s = min(1, side / 88) ^ 0.78       side = shorter side of the shape

| depth (pt) | 0.25 | 1.25 | 2.25 | 4.25 | 8.25 | 12.25 | 16.25 | 20 |
|---|---|---|---|---|---|---|---|---|
| measured, large glass | 50.7 | 39.1 | 32.3 | 23.0 | 11.4 | 4.7 | 1.1 | 0.0 |
| model | 40.4 | 38.9 | 32.6 | 24.1 | 11.6 | 4.6 | 1.4 | 0.2 |

The shift exceeds the bezel, so `t + shift(t)` falls then rises: the rim shows a compressed,
mirrored band of what lies 15–47 pt inside (stripes bending round the ends). Smaller glass is a
scaled copy (fitted scales: 44 pt → 0.56, 56 → 0.70, 64 → 0.78, ≥ 88 → 1). Same profile for
regular and clear, light and dark (clear keeps the full bezel down to ~60 pt).

### 2. Blur

Regular glass: Gaussian σ = 2.9 pt up to a 64 pt shorter side, growing ~0.025 pt/pt to ~5.2 pt
on panels (measured 2.75–3.0 at 44–64, 3.6 at 88, 4.9 at 120, 5–6 at ≥ 160). The kit used 18 px.
Clear glass: ~1.6 pt (resolution level), contrast kept.

### 3. Material

Regular glass is a veil of a near-surface colour over the blurred backdrop, in sRGB, with strong
saturation. On greys `out = gain · bg + offset`:

| | gain | offset | veil α | veil colour | saturation |
|---|---|---|---|---|---|
| light, small (≤ 72 pt) | 0.133 | 0.861 | 0.87 | 0.99 | 5.6 |
| light, large | 0.288 | 0.702 | 0.71 | 0.985 | 2.2 |
| dark, small | 0.254 | 0.102 | 0.75 | 0.136 | 2.9 |
| dark, large | 0.278 | 0.089 | 0.72 | 0.124 | 2.4 |
| clear (any) | 1.03 | 0.076 | none | none | 1.0 |

The law behind it: the veil keeps 13–29 % of the backdrop's brightness but ~70 % of its chroma
(`(1 − α) · saturation ≈ 0.64–0.74`). Small glass switches material between 64 and 88 pt; the kit
uses 72 pt (its adaptive-tint limit). Small dark glass also adapts non-monotonically to the
backdrop (not modelled). The kit keeps its palette surface as the veil colour (Lab light #fcfdf9
matches Apple's 0.99).

### 4. Rim light

A ~1 pt line of light on the inner edge, peaking at the outermost pixel, lit at **both** ends of a
top-left ↔ bottom-right axis (the old kit rim was one-sided). White over the material, by the
angle `a` between edge normal and light axis:

    α(a) = base + (peak − base) · cos² a       light: 0.27 → 0.72     dark: 0.14 → 0.25

No dark outline: the kit's 1 px `--lab-line` stroke is gone from liquid/frosted container glass
(kept for solid glass and `prefers-contrast: more`).

### 5. Shadow

Wide, soft, outside only: dy ≈ 7.5 pt, σ ≈ 19.5 pt; black at 9.5 % (light, large), 6.6 % (light,
small), 14 % (dark, large), 3.3 % (dark, small). Clear glass casts none. (Old kit: 6 px, σ 7.)

### 6. Merging

With container `spacing` k: outlines bend toward each other below a gap of ~k (pointed bulges,
2 pt at gap 24 for k 40), join below ~k/2, and the neck stays slimmer than a constant smooth-min.
A quadratic smooth-min with a gap-dependent width fits every measured neck within ~1 pt:

    k(gap) = spacing · min(1, 0.65 + 0.65 · gap / spacing)

`glassEffectUnion` draws members as one shape of the given kind over their combined bounds (two
circles → one circle), which matches the kit's bounds + smallest-radius union.

## In the kit

- Web tokens: `--lab-glass-fill` (small) / `--lab-glass-fill-large`, `--lab-glass-saturate(-large)`,
  `--lab-glass-blur` (set per cluster by the scene), `--lab-glass-edge-light` (lit-end light over
  the base) / `--lab-glass-edge-low` (base rim), `--lab-glass-shadow-color` / `-small`.
  `css` renderer: `blur() saturate()` + veil. `canvas` (Chromium): SVG filter blur → displacement
  from the fitted profile (`displacementMap(...).scale`) → saturate, clipped by the map's alpha.
  `fill` keeps its dense flat fill (no backdrop access) with the new rim, shadow and outline rules.
- Flutter: same tokens (`glassFill`, `glassFillLarge`, `glassShadowSmall`, …), `glass/material.dart`,
  `glass/refraction.dart`; on Impeller `GlassRefraction` runs `shaders/glass_refraction.frag` (same
  profile, rounded-box SDF, per-shape blend widths) as a backdrop filter; Skia and web fall back to
  blur + saturate.
- Accessibility unchanged: reduced transparency / more contrast → opaque surface, no rim, outline
  back; forced colours hide the material; reduced motion as before.

## Results

Mean absolute difference (0–255, all channels) between the kit and the iOS capture over each
shape's box + 16 pt (so rim and shadow count), `mono` palette, lower is closer. Web:
`tools/compare_kit.mjs` + `compare_kit.py`; Flutter on the iOS simulator (Impeller):
`tools/flutter_ios_compare.sh`. Per-shape numbers and the share of pixels off by > 24 in
`data/compare-*.json`. "Before" is the previous build (`dist/`).

| scene | css before | css after | canvas before | canvas after | Flutter Impeller after | fill before | fill after |
|---|---|---|---|---|---|---|---|
| light photo | 8.46 | 5.18 | 8.29 | 5.02 | 3.95 | 16.20 | 13.06 |
| light stripes | 9.46 | 5.50 | 9.45 | 5.42 | 4.60 | 20.64 | 15.79 |
| light grey | 8.93 | 5.06 | 8.92 | 5.07 | 4.07 | 20.47 | 15.39 |
| light white | 5.25 | 4.19 | 5.25 | 4.20 | 2.61 | 4.88 | 4.20 |
| light near-black | 14.53 | 6.88 | 14.52 | 6.88 | 6.70 | 34.01 | 25.91 |
| dark photo | 13.91 | 9.14 | 13.70 | 9.07 | 7.77 | 31.51 | 24.04 |
| dark stripes | 11.09 | 8.16 | 11.10 | 8.05 | 7.21 | 24.24 | 18.56 |
| dark grey | 10.22 | 6.88 | 10.13 | 6.87 | 6.08 | 23.89 | 18.15 |
| dark white | 16.91 | 9.78 | 16.85 | 9.77 | 7.91 | 46.52 | 34.64 |
| dark near-black | 4.22 | 3.85 | 4.17 | 3.85 | 3.36 | 4.65 | 4.04 |

What is left is mostly shape, not material: the kit draws superellipse corners, so a "circle"
bubble is a squircle (see `reference/*_ios-before-web-flutter.png`: iOS, before, web after, Flutter
after), plus the dark palette's surface colour and the small-dark adaptive tone.
`reference/refraction-ios-vs-web-noveil.png` shows iOS against the web filter with the veil removed.

## Reproduce

    app/build.sh                                   # LGLab.app with swiftc, no Xcode project
    xcrun simctl boot "iPhone 17 Pro"
    LG_RAW=/tmp/lg python3 tools/capture_all.py    # ~400 screenshots, ~15 min (raw/ not kept)
    LG_RAW=/tmp/lg python3 tools/analyze_refraction.py   # then analyze_{tint,edge,blur,merge}.py
    python3 tools/fit_model.py                     # data/model.json, data/model-fit.png
    # web: OUT_DIR=<dir> npx vite build --config research/liquid-glass/compare/vite.config.ts
    #      (KIT=before KIT_DIST=<old dist> for a baseline), then
    node tools/compare_kit.mjs <built> <shots> css canvas fill && python3 tools/compare_kit.py <shots> after
    OUT=/tmp/flutter-ios tools/flutter_ios_compare.sh && python3 tools/compare_kit.py /tmp/flutter-ios flutter canvas

Python needs numpy, scipy, Pillow, matplotlib (`/usr/bin/python3` on macOS has them).

## Known gaps

- Web refraction is Chromium only (SVG filters as `backdrop-filter`) and only on settled glass;
  Safari and Firefox get blur + saturate + veil. Flutter refraction needs Impeller; Flutter web
  and Skia get the blurred material. The Flutter shader reads the glass position when it paints,
  so glass moved by a parent scroll without repainting keeps a stale origin until it repaints.
- Not modelled: interactive press, the clear variant (numbers above, no API for it yet), tints,
  the small-dark adaptive tone curve, motion timing.
- Full-radius shapes: superellipse corners vs Apple's circles.
