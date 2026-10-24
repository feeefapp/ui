# Light edges: why iOS glass stays readable on light content

Owner's report: "the bubble looks like a water drop, but Apple's glass is clear in both light and dark,
ours is barely seen in light mode". Measured from screenshots only (public SwiftUI `glassEffect`,
`.regular` / `.clear`), same pipeline as FINDINGS.md.

**Runtime: iOS 26.2.** `xcrun simctl list runtimes` (2026-10-24) lists only iOS 26.2 (Xcode 26.2,
17C52); there is no iOS 27 runtime installed, so every number below is iOS 26.2, iPhone 17 Pro, 3×.

## Short answer

1. **It is not a dark edge.** iOS draws no dark band, no inner shadow and no dark outline on light
   content, in either material or appearance. On pure white, iOS `.clear` is completely invisible too
   (every pixel 255, no shadow).
2. **Clear glass is readable because it brightens what is behind it, and lets light content clip.**
   Its interior is `min(1, 1.03·x + 0.076)`, so a 235 backdrop becomes 255 and 208 becomes 236. The
   glass reads as a whiter pill with a clean step at the silhouette. The kit's web clear lift is capped to
   preserve the white point (`0.924·x + 0.076`): 235 → 236, 208 → 211. **That cap is about 90 % of the
   "barely seen" gap.**
3. iOS clear also softens what it covers (σ ≈ 1.6 pt; text under it drops to 0.4 of its contrast), so
   the glass reads as a surface. The kit's clear has no blur.
4. The rim is stronger and wider in angle than the kit's. Clear: white α 0.66 at the lit ends with a
   `|cos a|` lobe; the kit has 0.39 with `cos²`. It is a flat-topped 1 pt profile, and nothing outside
   the outline. In dark appearance the rim is additive and scales with the backdrop, and regular glass
   thins its veil over the outer ~0.5 pt.
5. **Regular glass in light mode already matches** (compare 1.5–2.1, the same silhouette contrast
   as iOS). Nothing to fix there beyond the rim shape.

## Method

| Step | Tool | Output |
|---|---|---|
| New backgrounds: `lightphoto` (photo pushed 55 % to white), `darkphoto` (×0.3), `lightstripes` (220/250, 4 pt bars), `text` (dark strokes on 250, 20 pt lines), plus flats ffffff, ebebeb, d0d0d0, 808080, 1a1a1a, 000000 and `photo` | `app/LGLab.swift`, mirrored in `compare/backgrounds.ts` | |
| Layout `edges`: circle 44, capsule 132×44, card 240×160 r28, circle 88, capsule 300×64 | `app/layouts.json` | |
| iOS capture: regular and clear × light and dark × 11 backgrounds, plus bare backgrounds (55 shots) | `tools/capture_all.py lightedges` | `raw/lightedges/` (not kept) |
| Kit render, same scenes: `regular` = tint 1 + blur + refraction, `clear` = tint 0 + refraction, circular corners (so shape is not counted) | `tools/lightedges_kit.mjs`; page built from a snapshot of `src/` (`KIT_SRC`, taken 2026-10-24 while another agent edits src) | `raw/lightedges-kit/` |
| Per-band layer fit `out = g·bg + o` by depth (1 device px) × normal angle | `tools/analyze_light_edges.py`, `tools/print_light_edges.py`, `tools/rim_angles.py`, `tools/edge_veil.py` | `data/light-edges-{ios,kit}.json` |
| Parametric edge model fitted to iOS and kit | `tools/fit_light_edges.py` | `data/light-edges-model.json` |
| Metrics, simulated proposal, side-by-sides | `tools/light_edges_report.py` | `data/light-edges-metrics.json`, `data/light-edges-ablation.json`, `reference/light-edges-*.png` |

Angles: `a` is the angle between the edge's outward normal and the top-left ↔ bottom-right light
axis (0 = lit ends, 90° = top-right / bottom-left). Depth `t` is in pt inward from the outline.

**Silhouette contrast**: the mean, over 12 normal directions, of the absolute difference between the
luminance just inside (−2…−⅓ pt) and just outside (⅓…2 pt) the outline, 0–255, both from the same
screenshot. This is the "can I see the drop" number. **Compare**: the mean |kit − iOS| over each
shape's box + 16 pt, as in `compare_kit.py`.

## Measured

### Interior transfer (backdrop → glass, flat greys, 0–255, 6–9 pt deep)

| backdrop | 255 | 235 | 208 | 128 | 26 | 0 |
|---|---|---|---|---|---|---|
| iOS clear (light = dark) | 255 | **255** | **236** | **152** | 46 | 19 |
| kit clear (web, tint 0) | 255 | 236 | 211 | 137 | 43 | 19 |
| iOS regular light, ≤ 64 pt | 253 | 250 | 247 | 236 | 223 | 220 |
| kit regular light, ≤ 64 pt | 255 | 252 | 249 | 239 | 225 | 222 |
| iOS regular light, card | 250 | 246 | 240 | 219 | 188 | 179 |
| kit regular light, card | 255 | 249 | 241 | 218 | 189 | 181 |

iOS clear is exactly the FINDINGS lift `1.03·x + 0.076`, clipped. The kit's web refraction filter
caps the slope at `1 − offset` (`scene.ts` `preserveHighlights`; the same cap is in `glass.css`
`[data-glass-local-tint]`), which removes the lift on light content.

### Is there a dark edge? No.

Δ = glass − backdrop, card, light appearance, by depth (pt):

| backdrop | material | −4…−1 pt | −0.8 | −0.5 | −0.2 | outside +0.2…+3 |
|---|---|---|---|---|---|---|
| 255 | iOS regular | −5 (veil 250) | −4 | −1 | 0 | −7 top … −16 bottom (shadow) |
| 255 | kit regular | 0 | 0 | 0 | 0 | −8 top … −15 bottom |
| 255 | iOS clear | 0 | 0 | 0 | 0 | **0 (no shadow)** |
| 235 | iOS clear | +20 | +20 | +20 | +20 | 0 |
| 235 | kit clear | +1 | +2 | +6 | +8 | +1 (outside bleed) |
| 128 | iOS clear, lit end | +24 | +68 | +90 | +83 | 0 |
| 128 | kit clear, lit end | +9 | +20 | +46 | +54 | **+24 at +0.2 pt** |

- No darkening layer anywhere on the inside, for either material, scheme or backdrop.
- The only "dark line" is the regular material's **veil thinning**. The outermost device pixel at the
  perpendicular sides shows more backdrop (gain 1.37 × the interior's). Over a 128 backdrop that is
  69 against a 91 interior; over light content it is 0 to +1, so invisible.
- **No outline, light or dark, outside the shape**: iOS is exactly the backdrop from +⅓ pt out
  (apart from the regular shadow). The kit's rim canvas bleeds +9…+24 one device pixel outside.
- **Clear glass casts no shadow**, confirmed on white (every pixel outside is 255). The regular shadow
  in light mode matches the kit within 1–2 levels (−7 top, −11 sides, −15 bottom on white).

### Rim (white layer W, relative to the interior; veil thinning K)

Model: `out = (1 − W)·(M + K·(x − M)) + W`, with `W = (w0 + w1·|cos a|^p)·(1 − (t/wt)³)₊`,
`K = (k0 + k1·|cos a|)·(1 − t/kt)₊`, M = the interior result, x = the backdrop. Fitted on the six flat
greys, exact outlines only (iOS cards have continuous corners); RMS in 0–255.

| | w0 | w1 | p | wt (pt) | k0 | k1 | kt (pt) | RMS |
|---|---|---|---|---|---|---|---|---|
| **iOS clear light** | 0.031 | 0.625 | 1.13 | 1.10 | ≈ 0 (M ≈ x) | | | 5.5 |
| kit clear light | 0.135 | 0.255 | 1.72 | 0.92 | | | | 2.0 |
| **iOS regular light** | 0.049 | 0.810 | 0.88 | 0.98 | 0.11 | 0.74 | 0.54 | 6.1 |
| kit regular light | 0.143 | 0.249 | 2.48 | 0.93 | 0.02 | 0 | | 1.3 |
| **iOS regular dark** | 0.003 | 0.159 | 1.01 | 1.17 | 0.22 | 0.36 | 0.65 | 5.0 |
| kit regular dark | 0.078 | 0.062 | 1.53 | 0.92 | 0.07 | 0.02 | | 1.5 |
| **iOS clear dark** | additive: `out = M + |cos a|^1.1 · (1 − (t/1.17)³)₊ · (0.106 + 0.31·x)` | | | | | | | |
| kit clear dark | 0.062 | 0.063 | 1.37 | 0.92 | | | | 1.1 |

Raw check, clear light, 88 pt circle, white α by device pixel (outermost first) and angle:

| a | 0° | 15° | 30° | 45° | 60° | 75° | 90° |
|---|---|---|---|---|---|---|---|
| iOS px0 / px1 / px2 | .64/.57/.31 | .64/.57/.31 | .58/.49/.30 | .49/.41/.27 | .31/.28/.18 | .14/.14/.08 | .03/.02/.02 |
| kit px0 / px1 / px2 | .39/.30/.09 | .38/.31/.09 | .33/.28/.09 | .30/.24/.07 | .18/.17/.05 | .14/.13/.04 | .13/.11/.03 |

In short, iOS has twice the peak, an angular lobe close to `|cos a|` (not `cos²`), almost nothing at
the perpendicular, and a flat top that holds through the outer 0.67 pt then ends by 1 pt
(`1 − (t/1.1)³`). The kit's `cos²(t/w · π/2)` profile halves by 0.5 pt.

Regular light pushes the lit ends almost to white (W up to 0.86) and thins the veil at the edge:
measured against the backdrop, the outermost pixel's veil goes 0.70 → 0.58 at the perpendicular.
Regular dark doubles the backdrop share at the lit outer pixel (G 0.25 → 0.49) and adds white
(O 0.10 → 0.22). So in dark appearance over light content the iOS rim is bright (+52…+86 on 235)
where the kit's is +28…+36.

### Contrast and saturation in the edge band (textured backdrops)

Luminance std and chroma in the band (−4…−⅓ pt) and the interior, as a ratio of the bare backdrop:

| scene (card) | iOS band | iOS interior | kit band | kit interior |
|---|---|---|---|---|
| clear light, light photo | std 1.09, chroma 0.89 | 1.03, 0.85 | 0.82, 0.94 | 0.74, 0.91 |
| clear light, text | std 0.44 | 0.39 | 0.97 | 0.87 |
| regular light, light photo | std 0.44, chroma 0.60 | 0.21, 0.66 | 0.37, 0.58 | 0.33, 0.58 |
| regular dark, light photo | std 2.17, chroma 0.68 | 0.12, 0.60 | 0.91, 0.60 | 0.34, 0.59 |

There is no separate saturation or contrast boost in light mode. In dark mode the band has more
chroma (+13–20 %) and contrast, which is the veil thinning letting the backdrop through. iOS clear
on text keeps only 0.4 of the contrast: that is its blur.

## Kit vs iOS on the same scenes

Mean over the five shapes. Silhouette: iOS / kit today / kit + proposal (simulated).

| | backdrop | compare today → proposal | silhouette iOS | kit | kit + proposal |
|---|---|---|---|---|---|
| clear light | white | 0.00 → 0.00 | 0 | 0 | 0 |
| | light grey ebebeb | **9.12 → 0.03** | 20.0 | 2.2 | 20.0 |
| | grey d0d0d0 | **11.93 → 1.35** | 30.6 | 5.7 | 27.7 |
| | light photo | **11.19 → 0.97** | 26.1 | 5.2 | 25.7 |
| | light stripes | **9.09 → 0.05** | 20.0 | 3.9 | 19.9 |
| | text | **17.45 → 5.31** | 32.5 | 28.1 | 26.2 |
| | 808080 | 7.63 → 0.89 | 37.3 | 16.1 | 35.5 |
| | photo | 9.38 → 1.38 | 29.8 | 11.9 | 31.1 |
| | dark photo | 3.46 → 0.71 | 43.5 | 26.2 | 43.0 |
| clear dark | light grey | 9.17 → 0.03 | 20.0 | 1.4 | 20.0 |
| | light photo | 11.36 → 1.04 | 27.6 | 4.1 | 29.9 |
| | text | 17.58 → 5.19 | 32.5 | 28.9 | 27.6 |
| | dark photo | 3.03 → 0.59 | 29.1 | 18.9 | 28.0 |
| regular light | light grey / light photo / text | 1.77 / 1.52 / 1.87 → 1.78 / 1.56 / 1.88 | 23.2 / 38.5 / 40.1 | 22.8 / 38.1 / 39.0 | 23.0 / 38.8 / 39.6 |
| regular dark | light grey / light photo / text | 3.97 / 4.58 / 4.37 → 3.71 / 4.38 / 4.16 | 135.8 / 120.3 / 122.4 | 147.6 / 133.5 / 134.6 | 143.0 / 129.1 / 130.1 |

All scenes: `data/light-edges-metrics.json`. Regular dark keeps a ~4 compare residual from its interior
(kit dark veil colour 0.08 vs iOS 0.14: 79 vs 86 over light content). The 47 on regular dark over
white is iOS's adaptive small glass flipping to light (circle 44 = 253), which the kit's `adaptive`
handles separately and the comparison page turns off.

Ablation, clear light (`data/light-edges-ablation.json`), compare / silhouette:

| terms | light grey | light photo | text | photo | 808080 |
|---|---|---|---|---|---|
| kit today | 9.12 / 2.2 | 11.19 / 5.2 | 17.45 / 28.1 | 9.38 / 11.9 | 7.63 / 16.1 |
| measured lift only | 0.03 / 20.0 | 0.98 / 25.5 | 16.28 / 28.1 | 1.34 / 28.2 | 1.10 / 30.4 |
| lift + 1.6 pt blur | 0.03 / 20.0 | 0.93 / 25.5 | 5.42 / 26.5 | 1.39 / 27.7 | 1.42 / 29.8 |
| rim only | 9.06 / 3.4 | 11.09 / 7.5 | 17.26 / 27.0 | 9.29 / 17.0 | 7.27 / 23.7 |
| all | 0.03 / 20.0 | 0.97 / 25.7 | 5.31 / 26.2 | 1.38 / 31.1 | 0.89 / 35.5 |

The lift fixes light content; the blur fixes detailed content; the rim matters on mid and dark content.

## Images

`reference/light-edges-<material>-<scheme>-<shape>.png`: rows are iOS 26.2 / kit today / kit +
proposal (simulated); columns are white, light grey, light photo, text, near-black, dark photo; each
crop is the shape + 20 pt.

- Clear light: `light-edges-clear-light-circle44.png`, `…-capsule132x44.png`, `…-card240x160r28.png`
- Clear dark: `light-edges-clear-dark-{circle44,capsule132x44,card240x160r28}.png`
- Regular light: `light-edges-regular-light-{circle44,capsule132x44,card240x160r28}.png`
- Regular dark: `light-edges-regular-dark-{circle44,capsule132x44,card240x160r28}.png`

The capsule crops include a sliver of the Dynamic Island at the top edge (iOS only). The text column
shows the kit's refraction aliasing on fine strokes in the "kit" rows; the simulation keeps the kit's
refraction and only changes the material.

## Proposal

Keep: the refraction profile, the regular material (veil, saturation, sizes), the regular shadow, and
"clear casts no shadow". Change four things. Numbers are per CSS px = Flutter logical px = pt.
`t` = glass tint (0 clear … 1 regular); `a` = normal vs light axis; depth `d` inward from the outline.

### 1. Measured clear lift, no white-point cap (the main fix)

`out = min(1, gain·x + offset)`, `gain = 1 + 0.03·(1 − t)`, `offset = 0.076·(1 − t)`.

- **Web**: `scene.ts` line ~945 writes `slope = min(gain, 1 − offset)` when `preserveHighlights`.
  Write `material.gain`, and delete `preserveHighlights` (option, cache-key part and
  `container.tsx:176`). `feComponentTransfer` clamps to 1 by itself. In `glass.css`
  `.lab-glass-container[data-glass-local-tint]`, use the root formula from `system.css:135`:
  `contrast(calc((1.03 - 0.03·t) / (1.182 - 0.182·t))) brightness(calc(1.182 - 0.182·t))`.
  Also update FINDINGS "white-point preservation" notes and the `GlassContainerProps.tint` doc.
- **Flutter**: `material.dart` already uses the uncapped lift (kept).
- Expected: clear on light content, compare 9–12 → ~1, silhouette 2–6 → 20–26 (iOS 20–31).

### 2. Clear blur σ = 1.6 px, independent of `glassBlur`

`σ(t) = 1.6·(1 − t) + t·σ_regular`, where `σ_regular = glassBlur(side)` when ThemeConfig
`glassBlur` is on, and 0 when it is off. So clear glass always softens by 1.6 and regular-without-blur
stays sharp.

- Web: the scene sets `--lab-glass-blur` / the SVG `soft` stdDeviation from this formula (it is 0 today
  when blur is off).
- Flutter: the `ImageFilter.blur` sigma before the refraction shader, same formula.
- Expected: text under clear, compare 16.3 → 5.4. A 1.6 px Gaussian is cheap (small kernel); the
  `performance` profile can still turn glass solid.

### 3. Rim: flat-topped 1 px, `|cos a|` lobe, stronger, inside only

Replace `measuredRimReflection` (web `light.ts`) and the rim gradient stops (Flutter
`material.dart` `glassRim` / `glassRimStops`):

    W(d, a) = (w0 + w1 · |cos a|^p) · max(0, 1 − (d / wt)^3)        white, over the material
                  light appearance                     dark appearance
    clear  (t=0)  w0 0.03, w1 0.63, p 1.1, wt 1.1      additive (term 4b), no white layer
    regular(t=1)  w0 0.05, w1 0.81, p 0.9, wt 1.0      w0 0.00, w1 0.16, p 1.0, wt 1.2
    in between: each parameter linear in t

- Tokens: replace `--lab-glass-rim-base/peak` (light 0.27/0.718, dark 0.139/0.246) with
  `--lab-glass-rim-w0`, `-w1`, `-pow`, `-width` per appearance, mixed by `--lab-glass-tint` in calc().
  This supersedes FINDINGS §4's `cos²` fit (12 × 30° bins, regular material, luminance by distance).
  The finer 15° fit by layer here shows the lobe is close to `|cos a|`, with almost nothing at the
  perpendicular.
- Clip the rim canvas to `d ≥ 0` (inside the outline). Today it paints +9…+24 levels one device pixel
  outside; iOS paints nothing there.
- Flutter: draw it in the refraction shader (it already has the SDF and normal `n`), or keep the
  stroked path with a 1 px gradient whose stops come from `|cos|^p` instead of `cos²`.

### 4. Edge veil (regular) and additive dark rim (clear dark)

a. **Veil thinning** (regular, both appearances): over the outer edge the material gives part of the
   backdrop back: `M' = M + K·(x − M)` with `K = t · (k0 + k1·|cos a|) · max(0, 1 − d/kt)`.
   Light: k0 0.11, k1 0.74, kt 0.54. Dark: k0 0.22, k1 0.36, kt 0.65.
b. **Clear dark rim**: `out = M + |cos a|^1.1 · max(0, 1 − (d/1.17)^3) · (0.106 + 0.31·x)`, scaled by
   `(1 − t)`. It is a light that scales with the backdrop, not a white layer. Over light content it is
   as bright as the light-mode rim; over black it is faint (46 vs 171).

- **Web**: both need the backdrop, so they belong in the SVG filter, not the canvas. The
  displacement map's blue channel is unused (R/G = shift, A = coverage). Have the map worker write
  `B = |cos a|^p · edge profile(d)` (same samples, same BMP). In the filter: `feColorMatrix` B → alpha
  = `edge`; then `feComposite operator="arithmetic"` blends the bent backdrop (`bent`) into the toned
  result, by `K·edge` (thinning) or adds `(0.106 + 0.31·bent)·edge` (dark clear). The veil is painted
  by `background` after the filter, so for 4a also give `.lab-glass-backdrop` a 0.5 px inner ring of
  thinner veil: `border: 0.5px solid` the fill at `(1 − K_mean)·veil` with
  `background-clip: padding-box`, with K_mean ≈ 0.4 light / 0.3 dark × t. The CSS-only (no
  refraction) path gets just that ring.
- **Flutter**: in `glass_refraction.frag`, sample the backdrop at the same uv, and apply `K` and the
  additive term there with uniforms `uEdge = (k0, k1, kt, mode)`; the veil is drawn after the shader,
  so pass its alpha in and composite in-shader, or draw the veil with a 0.5 px inner ring as on web.
- Expected: regular dark on light content, compare −0.2…−0.3 and silhouette 6–10 % closer. Clear
  dark on mid content, silhouette 11.6 → 36 (iOS 37.4).

### Not proposed

- No dark band, inner shadow, outline or clear-glass shadow: iOS has none.
- Regular light needs no change beyond item 3 (it already matches within 2 levels).
- Out of scope but measured: the dark regular veil colour (kit 0.08 vs iOS 0.14, a ~4 compare
  residual) and the small dark glass's adaptive flip over white.

## Implemented (2026-10-24, uncommitted)

All four changes are in both kits:

- **Web**
  - **Lift**: `scene.ts` writes the measured `gain`; `preserveHighlights` is gone. `glass.css`
    `[data-glass-local-tint]` uses the root lift.
  - **Blur**: `glassBlurAt` sets `--lab-glass-blur` and the filter's blur.
  - **Rim**: `material.ts` `GLASS_RIM` / `glassRim` / `rimLayer` replace `rimAlpha`,
    `GLASS_RIM_STOPS`, `light.ts` `measuredRimReflection` / `rimReflection` / `rimGradient`, and
    the `--lab-glass-rim-base/peak` tokens. Highlight samples are inside the outline only.
  - **Edge**: `refraction.ts` writes `edgeMask` into the map's blue channel. The filter turns it
    into an opaque grey `edge` image and applies `glassEdgeTerms` in one
    `feComposite arithmetic` (`x + k1·x·E + k3·E`; alpha stays ≥ 1). The veil colour comes
    from `--lab-surface` through the paint svg's `stop-color`.
- **Flutter**
  - **Lift**: already uncapped.
  - **Blur**: `glassBlurAt` drives the backdrop and refraction blur.
  - **Rim**: `glassRim` / `rimLayer`, drawn as a triangle band (`_rimVertices`) clipped to the
    outline. `rimAlpha` / `glassRimStops` / `rimGradient` are gone.
  - **Edge**: the colour matrix now runs before the shader, which is the same picture because it
    is pointwise. `glass_refraction.frag` applies the edge terms with the live light
    (`uLight`, `uEdge`).
- **Fixtures**: `flutter/tool/generate_glass_fixture.ts` writes `rimLayer`, `edgeMask`, `blurAt`,
  `edgeTerms`.

Real built kit vs iOS (`data/light-edges-metrics-after.json`, sheets
`reference/light-edges-after-<material>-<scheme>-<shape>.png`: iOS / kit before / kit after):

| | light grey | light photo | light stripes | text | 808080 | photo |
|---|---|---|---|---|---|---|
| clear light, compare before → after | 9.12 → 0.06 | 11.19 → 1.00 | 9.09 → 0.06 | 17.45 → 5.38 | 7.63 → 0.93 | 9.38 → 1.34 |
| clear light, silhouette iOS / before / after | 20.0 / 2.2 / 19.4 | 26.1 / 5.2 / 24.7 | 20.0 / 3.9 / 19.4 | 32.5 / 28.1 / 27.3 | 37.3 / 16.1 / 33.9 | 29.8 / 11.9 / 29.5 |
| clear dark, compare before → after | 9.17 → 0.07 | 11.36 → 1.07 | 9.14 → 0.07 | 17.58 → 5.17 | 7.91 → 0.91 | 9.57 → 1.45 |
| regular light, compare before → after | 1.77 → 1.78 | 1.52 → 1.54 | 1.75 → 1.76 | 1.87 → 1.93 | 1.67 → 1.77 | 1.88 → 1.91 |
| regular dark, compare before → after | 3.97 → 3.93 | 4.58 → 4.53 | 4.08 → 4.03 | 4.37 → 4.25 | 3.85 → 3.74 | 5.19 → 5.13 |

The real render lands where the simulation predicted.

## Caveats

- iOS 26.2, not 27: no iOS 27 runtime is installed. Re-run `tools/capture_all.py lightedges` when one
  is, and refit with `fit_light_edges.py`.
- "kit + proposal" is a per-pixel simulation over the kit's screenshots: it removes the fitted kit rim,
  inverts the kit's lift, and uses the bare backdrop for the thinning term. The model was fitted on
  the flats. Photo, light photo, stripes and text were not used in the fit, so they are the real test.
  Expect the implemented version to land near, not exactly on, these numbers.
- Kit renders were taken from a snapshot of `src/` (2026-10-24) with circular corners; the default
  superellipse corners would add shape error on top.

## Reproduce

    app/build.sh && xcrun simctl boot "iPhone 17 Pro"
    cd tools
    LG_RAW=../raw python3 capture_all.py lightedges                    # 55 shots
    # kit: KIT_SRC=<snapshot of src under ui/> OUT_DIR=<dir> npx vite build --config research/liquid-glass/compare/vite.config.ts
    node lightedges_kit.mjs <dir> ../raw/lightedges-kit
    LG_RAW=../raw python3 analyze_light_edges.py ../raw/lightedges "" ios
    LG_RAW=../raw python3 analyze_light_edges.py ../raw/lightedges-kit "" kit
    LG_RAW=../raw python3 fit_light_edges.py
    LG_RAW=../raw python3 light_edges_report.py ../raw/lightedges-kit  # metrics + images

Use `/usr/bin/python3` (numpy, scipy, Pillow).
