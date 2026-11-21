# Liquid Glass, measured

How rendered iOS 26 Liquid Glass behaves, measured from screenshots, and the earlier kit model (`src/glass/material.ts`, `refraction.ts`, `geometry.ts` and their Dart twins). Nothing here
comes from Apple code: a small app draws glass with public SwiftUI API (`glassEffect(_:in:)`,
`Glass.regular/.clear`, `GlassEffectContainer(spacing:)`, `glassEffectUnion`) over backgrounds we
control, we screenshot the simulator, and we fit our own functions to the pixels.

Setup: Xcode 26.2, iOS 26.2 simulator, iPhone 17 Pro (402 × 874 pt, 3×). All lengths are points =
CSS px = Flutter logical px. Raw numbers: `data/*.json`; fit plots: `data/model-fit.png`.

## Current regular lens

Feeef’s default refracting surface uses the neutral face, rounded bevel and glint from
[liquid_glass_renderer 1.0.0-dev.2](https://pub.dev/packages/liquid_glass_renderer/versions/1.0.0-dev.2).
Feeef tint 0 selects clear, 0.5 selects the regular preset at slider 0, and 1 selects fully tinted
regular. The existing blur switch controls frost. The web profiles `gentle` and `measured` retain
the quartic optics described below.

The pixel fixtures in `flutter/test/fixtures/glass-reference-*.png` were rendered with the package
on macOS Impeller, using a 192 × 56 capsule, DPR 1, `ios27Regular` settings and appearance,
and explicit frost 0. The fixture test recreates the same stripes through Feeef’s normal
GlassContainer and compares the interior, bevel and flat face separately. Run it with
`flutter test --enable-impeller test/glass_reference_test.dart` from the Flutter package.

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

(Superseded by LIGHT-EDGES.md: a white layer `(w0 + w1·|cos a|^p)·(1 − (d/width)³)` inside the
outline, fitted per tint and appearance, plus veil thinning and a dark-mode additive edge.)

A ~1 pt line of light on the inner edge, peaking at the outermost pixel, lit at **both** ends of a
top-left ↔ bottom-right axis (the old kit rim was one-sided). White over the material, by the
angle `a` between edge normal and light axis:

    α(a) = base + (peak − base) · cos² a       light: 0.27 → 0.72     dark: 0.14 → 0.25

No dark outline: the kit's 1 px `--lab-line` stroke is gone from liquid/frosted container glass
(kept for solid glass and `prefers-contrast: more`).

Web reflection now shades a convex quarter-circle cross-section over a 5 CSS px bevel,
using local blended-field normals and an elevated-light half vector (specular exponent 18).
A weaker opposite light supplies a 32% bounce. Both ends of the band fade to transparent,
so it has width without an extra inner contour. A 2× alpha mask replaces segmented strokes;
geometry and the last light mask are cached per outline. This is an art-directed surface
highlight, not a claim of measured Apple parity. Flutter retains its previous rim model.
Reference: https://kube.io/blog/liquid-glass-css-svg/ (surface function / specular highlight).
The original 47px displacement over a 27px quartic bezel has slope > 1 and folds
background lines back on themselves. Web displacement now caps the shift at 0.8 × bezel / 4,
keeping the inward sampling monotonic on straight edges. This deliberately supersedes the
measured mirrored-band fit on web; Flutter retains that fit pending separate visual review.
Inspect the web result at `/foundations/glass-reflections`.

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
  ThemeConfig (both twins): `glassTint` 0 clear … 1 tinted (default 0.5) interpolates between the
  measured clear and regular materials (`glassMaterial()`: veil = tint · veil₁, colour kept
  `(1 − veil) · saturate` linear from 1 to its regular value, shadow = tint · shadow₁, the clear
  lift 1.03 · x + 0.076 fading out; CSS reads `--lab-glass-tint` in calc() formulas), `glassBlur`
  (default off: no blur stage; on: σ 2.9 → 5.2), `glassRefraction` (default on). CSS glass:
  `blur(0 | σ) saturate() contrast() brightness()` + veil. Refraction (Chromium): SVG filter
  [blur →] displacement from the fitted profile → saturate → lift, clipped by the map's alpha.
  (The comparison numbers below were measured with the regular material, tint 1 + blur.)
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


### Web polish pass

The web surface highlight now combines a grazing edge lobe, a broader environment lobe and
an elevated key reflection (exponent 14), with a 28% opposite bounce. A separate alpha mask
adds soft occlusion on the unlit inner bevel; both layers fade at the flat interior. These are
art-directed approximations, informed by Apple's layered highlights/lensing description in
https://developer.apple.com/videos/play/wwdc2025/219/ — not measured optical parity.
The inspection page includes a landscape contrast scene alongside the plain/grid backgrounds.


### Browser-reviewed clear preset

The inspection demo now starts at local tint 0.22, highlight width 7px and strength 1.2.
This separates material opacity from highlight intensity without changing the host theme.
The specular key exponent is 20 and the broad environment contribution is 0.1, reducing the
frosted/plastic shoulder while keeping a crisp edge. The landscape specimens declare their
local backdrop tone (bright sky / dark ridge) and use control-sized geometry so the kit's
existing adaptive foreground can keep labels legible. Tint is an optional GlassContainer
configuration; its local derived CSS and SVG material parameters share the same value.

(Superseded, LIGHT-EDGES.md: the white-point cap on the clear lift made clear glass vanish on light
content. Web and Flutter now use the measured `min(1, 1.03·x + 0.076)` at every tint.)

A final browser pass raised the opposite specular bounce to 55% (45% for the grazing lobe):
the earlier 28% bounce left the lower silhouette too weak on the dark landscape ridge.

### Browser stability

Curved highlights now paint into persistent canvas elements instead of encoding PNGs and
replacing SVG image masks on every pointer frame. Firefox uses this same highlight renderer
with the CSS backdrop material; SVG backdrop refraction remains Chromium-only. The inspection
page disables its unavailable refraction control and removes the shell's pixel scroll wash.
A pending refraction rebuild is canceled when settings change, preventing a stale filter from
being applied after refraction is disabled. Firefox was checked through its native browser UI.


### Firefox live-source refraction

Firefox's `-moz-element(#id)` provides a live image of an explicit background-only DOM layer.
`GlassContainer backdropSource` aligns that image to each cluster in host-local coordinates and
runs the same SVG displacement / tone / alpha-clip filter through CSS `filter` rather than
`backdrop-filter`. The source must be separate from the glass (ancestor / descendant sources
are rejected to prevent recursive painting). The docs stage uses a separate paint layer shared
by both containers. Resize and scroll update image alignment; source changes repaint live.
Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/element
This enables real refraction for authored background layers; it does not capture arbitrary page
content behind an unconfigured Firefox glass container. Chromium retains native backdrop capture.


### Bending and roundness controls

The inspection page exposes light bending from 0 to 3× the normal lens. The 1× normal transport
cap remains unchanged; higher strengths intentionally permit optical edge reversal. Container
`refractionStrength` accepts 0–3 on both render paths. A local roundness slider (0–1.5) scales the
kit's `--lab-radius-glass` starting radius, default 1. The measured member radius feeds geometry,
highlights and both refraction maps together; the existing half-short-side clamp produces full
capsules at the upper end. The starting point is iOS-inspired, not an exact iOS 27 measurement.

### Round outline correction

The earlier maximum-radius outline was still a superellipse, so a nominally round bubble
remained a squircle. `GlassContainer cornerShape="round"` now carries exponent 2 through the
shape distance field, SVG outline, pressed geometry, highlights and both lens render paths;
CSS clipping uses circular corners and does not apply the superellipse fallback radius fit.
The inspection page uses this explicit circular profile. Its slider now maps 0–100% directly
to 0–half-height corner radius, defaulting to a true circle/capsule with no dead upper range.
The kit's normal superellipse profile remains the default for other containers.

### Reference rim preset (October 2026)

The inspection page now distinguishes the earlier broad, art-directed surface bevel from
a rim fitted to §4: approximately 1pt wide, with symmetric cos² angular lighting and
light alpha 0.27–0.718 / dark alpha 0.139–0.246. The finite inward cosine falloff is our
interpolation, not an Apple shader formula. Regular and Clear presets use tint endpoints
1 and 0; both now opt into the measured 47pt shift / 27pt quartic bezel from §1. The new
refractionProfile="measured" restores that existing fit on web; the default "gentle"
profile and Water drop preset retain the conservative cap. Both paths share the same
map on Chromium and Firefox.
These are iOS 26.2 screenshot-derived approximations, not official parameters or an
iOS 27 match. The existing surface mode remains available for wider water-drop bevels.

### Shared web defaults and extended tuning

The reference rim (1px, strength 1), measured refraction profile (strength 1), and
circular corner profile now default in GlassContainer/GlassScope. Toolbar, Dock,
Scaffold and navigation bubbles inherit this shared renderer instead of requiring
per-component overrides. Theme tint, blur, accessibility, and authored member radii
remain controlled by their existing settings for legibility. The public width range
is 0–100px and strength/refraction multipliers are 0–10. The docs radius uses CSS px
(0–120), with a large specimen to expose radii beyond the 36px small-bubble cap.
Geometry still clamps radii to half the shortest side, and highlights to fit inside
the surface. These are web tuning ranges, not native Apple limits.

### Consistent web material and Firefox floating chrome

Web now defaults to tint 0 (lift: see LIGHT-EDGES.md). ScrollArea provides its viewport
as a live disjoint Firefox source only to its floating top/bottom slots, including
Scaffold header, dock and sidebar controls. Source descendants do not inherit that
source, preventing recursive captures. Explicit demo sources still override inherited
ones. Firefox cannot capture arbitrary ancestors containing the glass; standalone
content glass needs a disjoint backdropSource.

### Web motion continuity

Refraction remains mounted during press, drag and shape blending, including adaptive contrast changes. Cluster-local displacement maps exclude translation and material uniforms from their cache key. Live maps have a fixed pixel budget and are transported as uncompressed RGBA BMPs to avoid PNG encoding on animation frames. Reflection lighting inherits the theme rather than changing when the sampled backdrop tone flips; adaptive text and veil remain available. Flutter is unchanged.

Merged bounds now include the smooth union's growth beyond member boxes. The contour grid,
refraction samples and rim canvas all cover that growth; the rim has an antialias fringe and
keeps an exact 2× pixel scale at fractional spring dimensions. Measuring pressed content first
undoes the last scale actually written to the DOM so it cannot be counted twice.

Firefox retains the current decoded lens while decoding its replacement, with one active decode
and one replaceable pending geometry. Binary BMP Blob URLs avoid base64 string work there;
retained resources are bounded and revoked on eviction/disposal. The current CSS outline clips
the lens once, independently of the image's asynchronous lifetime. Prepared distance evaluators
and conservative tile rejection reduce map work without changing the sampled lens or resolution
between motion and rest. Chromium retains the alpha silhouette required by its backdrop filter.

Firefox map generation now runs in one shared module worker. Each cluster retains only its newest
unstarted request; ready intermediate maps still publish during continuous movement. The worker
uses the same sampling resolution, displacement calculation and BMP bytes as the main-thread
fallback. Disposing the last cluster terminates the worker. Worker/CSP failures use the same
calculation asynchronously on the main thread, preserving the last displayed lens.

Glass scenes share ordered motion, measurement and paint phases. ResizeObserver notifications
and pointer updates coalesce into one paint per refresh, with a final paint at spring settlement.
Style reads precede paint writes, and unchanged geometry/material attributes are left alone.
Prepared contour distances, smaller empty-highlight tiles, and exact neighboring-distance reuse
in full-density maps reduce repeated math without changing the optical settings or sampled pixels.

Rim canvases retain backing capacity in 64-physical-pixel buckets instead of resetting it at
every fractional spring size. Their CSS extent is always half the backing extent, preserving
the exact 2× sampling scale. Shrinking clears obsolete pixels and releases capacity above twice
the active bucket. A representative 160-frame grow/shrink sequence reduces backing dimension
writes from 130 to 10; this measures allocation resets, not browser frame rate.
