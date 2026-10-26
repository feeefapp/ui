# iOS control lenses, measured

What the moving part of a stock control becomes while it is held: the segmented `Picker` pill
("pill lens") and the `Slider` / `Toggle` thumb ("thumb lens"), measured in the iOS 26.2 simulator
(Xcode 26.2, iPhone 17 Pro, 402 × 874 pt, 3×). Black box only: screen recordings of public SwiftUI
controls, nothing from Apple code. All lengths in pt (= CSS px = Flutter logical px). Both kits
implement these numbers: web `src/glass/{refraction,material,lens-layer}.ts` + `primitives/lens.css`,
Flutter `glass/lens_glass.dart` (GlassLens).

## Method

- App: `app/controls/CtlLab.swift`, `scene=lens`: a 3-segment `Picker(.segmented)` 300 pt wide at
  (51, 182), a `Slider` 300 pt wide at (51, 261) at value 0.5, a `Toggle`, and a 4-tab `TabView`.
  `pattern=cycle&step=0.6` steps the backdrop every 0.6 s through 16 images (`LENS_CYCLE`): flat
  white, black, grey, then phase-shifted fringes `0.5 + 0.4 cos(2π c / P + 2πk / 3)` along x and y
  (P = 96 and 24 device px, k = 0, 1, 2; c = the device-pixel centre), then 1 pt stripes every 6 pt.
  Each image's index is drawn as 4 bits at (14 + 12i, 104) pt.
- Capture: `xcrun simctl io booted recordVideo` while a two-finger touch holds the selected
  segment (101, 197.5) and the slider thumb (201, 276.5) for 13 s (one full cycle). Frames at 20 fps;
  for every index, the held frame and the same index before the press (rest) are averaged over 3
  frames. Light and dark appearance (`scheme=dark`) recorded separately.
- Decoding: 3-step phase shifting per colour channel gives, for every pixel, which backdrop
  coordinate it shows: the displacement field, unwrapped from P = 96 to 24. Flat images give the
  material (`out = a·in + b` per pixel). `tools/measure_lens.py` reduces both to the numbers below.
- The web twin: `compare/lens.html` draws the same backdrops under the kit's lenses at the same
  boxes; `tools/lens_kit.mjs` screenshots it at 3× and the same `measure_lens.py` measures it.

## 1. Size

| Lens | Rest | Held lens | Rule |
|---|---|---|---|
| Segmented pill | 96 × 28 at (53, 184) | **120 × 44** at (41, 176), centred | +12 pt each side across, +8 pt along: `LENS_PILL_LIFT {x: 12, y: 8}` |
| Tab bar pill | ≈ 95 × 54 | ≈ 73 pt tall, sticks out of the 62 pt bar | same +8 pt along (+9 measured) |
| Slider / switch thumb | 37 × 24 | **≈ 57 × 37** | ×1.54 both ways: `LENS_THUMB_SCALE` |

## 2. Bend (displacement), same in light and dark

Shift along the outline's normal, in pt, positive = the pixel shows the backdrop from further inside.
Depth `d` = distance inside the outline.

**Pill** (outward: lines crowd toward the rim, the middle stays put):

| d | 0.17 | 1.17 | 2.17 | 3.17 | 4.17 | 5.17 | 7.17 | 9.17 | 13.17 | 20.17 | 25.17 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| shift | +3.7…+6.4 (rim) | −0.2…−0.7 | −2.0 | −3.0 | −4.0 | −4.3 | −3.6 | −3.0 | −2.0 | −1.0 | −0.6 |

Model (`lensBend('pill', d)`): inward rim 6 × (1 − d / 0.6) for d < 0.6; then outward rising to
4.3 at d = 5; then 4.3 · exp(−(d − 5) / 10.5). The direction leans away from the centre: normal +
1.5 × (offset from centre / half size), normalised. That is why vertical stripes bow along the top
and bottom bands (iOS: dx ≈ ±1.5 pt 36 pt off-centre, 4 pt under the top edge). The middle is never
magnified: the backdrop and the label keep their size (label "One" 23.7 → 24.0 pt wide, within a
device pixel).

**Thumb** (inward):

| d | 0.17 | 1.17 | 2.17 | 3.17 | 4.17 | 5.17 | 6.17 | 7.17 |
|---|---|---|---|---|---|---|---|---|
| shift | ≈ 7.0 | 6.9…7.3 | 4.5…4.7 | 2.7…2.9 | 1.5…1.6 | 0.7…0.8 | 0.3 | 0.1 |

Model (`lensBend('thumb', d)`): 7.1 for d ≤ 1, then 7.1 · (1 − (d − 1) / 6.5)^2.2.

**Colour split:** red bends ≈ 6 % less and blue ≈ 5 % more than green across the pill's strongest
band (`LENS_DISPERSION` 0.06): the rainbow along the rim.

## 3. Material, rim and shadow

No blur, no brightening lift (the container material's clear-glass lift does not apply). Fitted as
"white veil α, then black shade β" (`out = (in·(1 − α) + α)·(1 − β)`):

| | Veil α | Shade β, top edge → half height (then flat) |
|---|---|---|
| Pill | 0 (black stays 0.00) | 0.105 → 0.035 (white 0.89 → 0.965) |
| Thumb | 0.09 (black → 0.08–0.09) | 0.14 → 0.04 (white 0.86 → 0.96) |

Rim on black (max over the outer 1 pt; it fades over about 1 pt: 0.60, 0.42, 0.23 per device px):

| | Light | Dark |
|---|---|---|
| Pill | 0.60 all round | 1.0 at the outline, ≈ 0.2 inside |
| Thumb | ≈ 0.1 top, 0.3–0.46 sides and bottom | ≈ 0.29 all round (incl. the 0.09 veil) |

The thumb also has a dark line on its top edge over light backdrops: 0.56 just inside, 0.77 just
outside (dark appearance 0.65 / 0.69). No hairline around either lens otherwise.

Shadow on white (both lenses, both appearances): 0.90 right under the bottom edge, 0.93 at 5 pt,
0.98 at 12 pt; 0.98–0.99 above the top edge: `0 6px 11px rgb(0 0 0 / 0.13)`.

No touch glow: the pill's interior on black stays 0.00 under the finger.

## 4. What changes under the lens

- Segmented control: nothing but the lens (labels keep size and colour rules of the control).
- Tab bar: the selected item (icon + label) grows ×1.2 (ink 26.7 × 34.7 → 32 × 38.3 pt):
  `LENS_TAB_SCALE`. Done by the control on its content, not by the glass.

Raw numbers: `data/lens-ios-{light,dark}.json`, `data/lens-web-{light,dark}.json`. Side by side on the
stripes backdrop: `reference/lens-stripes-ios-vs-web.png` (iOS left).

## 5. Web match (`measure_lens.py` on `lens_kit.mjs` captures, Chrome 155)

Box: exact for both lenses. Bend: within one device pixel at every depth (Chromium samples whole
device pixels). Material, rim on black, shadow: within ±0.03 except the thumb's 1-device-pixel rim
corners. Not reproduced: iOS's continuous (sub-pixel) sampling, the full strength of the rim's
rainbow.
