# iOS 26 controls, measured

Standard SwiftUI/UIKit controls measured in the iOS 26.2 simulator (Xcode 26.2, iPhone 17 Pro,
402 × 874 pt, 3×) from screenshots and screen recordings only. A second small app
(`app/controls/CtlLab.swift`, built by `app/controls/build.sh`) draws stock controls with public
API over flat backgrounds we control. Nothing comes from Apple code or binaries. All lengths are
points (pt = CSS px = Flutter logical px), measured to ⅓ pt (one device pixel). Raw numbers:
`data/controls-buttons.json`, `data/controls.json`, `data/controls-menu.json` (+ plot
`data/controls-menu.png`).

These are **iOS 26.2** values. No iOS 27 simulator was available, so treat them as the iOS 26
baseline. Apple has published no iOS 27 metric change (see IOS27-CONTROLS.md §11).

## Method

| What | How |
|---|---|
| Shapes | Each control sits over flat `#808080` (also `#ffffff` / `#000000` for translucent system fills). Coverage = colour distance from the background ÷ distance of the shape's fill, which gives soft edges. Height and width come from sub-pixel edge crossings scanned from outside in, so labels inside don't matter. The corner fit compares each row's inset with a circular corner `r − √(r² − (r − d)²)`, and an area radius is taken from the missing corner area. A capsule is r = h/2. |
| Layout cross-check | The app reports SwiftUI frames (`onGeometryChange`) and UIKit `intrinsicContentSize`. The visible shape matched the SwiftUI frame to within 0.02 pt for every button. |
| Fonts | Labels are set to "HxH". Ink cap height, ink width and ink area are matched against reference `Text("HxH")` at 11–22 pt in regular, medium, semibold and bold, drawn by the same app. Size is reliable to ±0. The weight is the best match, and the runner-up is listed in the JSON. |
| Icon sizes | `square.fill` glyph ink compared against the same symbol at known font sizes. |
| Menu morph | `xcrun simctl io booted recordVideo` (h264). Frames are written only when the screen changes, at the 120 Hz display rate (5–20 ms apart while animating), and every frame is extracted with its timestamp. The glass bubble is the largest region that differs from the background. We track its bounds, an area-equivalent corner radius, and the content's contrast and sharpness (Laplacian) per frame. A damped spring is fitted per dimension. UIKit menus are opened with `UIButton.performPrimaryAction()` and closed with `contextMenuInteraction?.dismissMenu()` (both public API, no touch). The SwiftUI toolbar `Menu` was opened by a simulator tap. |

**Not measured:** interactive press scale (needs a held touch while recording). Tab bar: not in the
app. Popover, action sheet and sheet. Dynamic Type sizes other than the default (Large). Menu width
with long labels: only short labels were tested, so 250 pt may be a minimum rather than a fixed width.

## 1. Buttons

All four styles have **the same geometry** at each size: `.glass`, `.glassProminent`,
`.borderedProminent` and `.bordered`, in light and dark. Only the fill changes. Every one is a
**capsule** (corner radius = h/2; the fit gives r = 15.00 / 18.17 / 26.17 at h = 30 / 36.33 /
52.33, rms < 1.6 px; an area radius within 0.3 pt of the profile radius means a circular end,
not a squircle).

| controlSize | Height (text) | Text-only padding X | Font | Icon-only (w × h) | Icon glyph | Icon+text: leading · gap · trailing (ink) |
|---|---|---|---|---|---|---|
| mini | **30** | 10 | 15 regular | 37.67 × 25.67 | 13.33 (= symbol at 15 pt) | 12 · 11.67 · 11.67 |
| small | **30** (same as mini) | 10 | 15 regular | 37.67 × 25.67 | 13.33 | 12 · 11.67 · 11.67 |
| regular | **36.33** | 12 | 17 regular | 43.33 × 31.33 | 15.33 (= symbol at 17 pt) | 14 · 11.67 · 13.33 |
| large | **52.33** | 20 | 17 regular | 59.33 × 47.33 | 15.33 | 22 · 11.67 · 21.33 |
| extraLarge | **52.33** (resolves to large on iOS) | 20 | 17 regular | 59.33 × 47.33 | 15.33 | 22 · 11.67 · 21.33 |

- Text-only padding X = (button width − the Text's layout width at the matched font) / 2. Measured to ink, the "H" side bearing adds about 1.3–1.7 pt (11.3 / 13.7 / 21.7).
- **Icon-only buttons are not square.** They are a capsule around the glyph with padding 12 × 6.17 (mini/small), 14 × 8 (regular) and 22 × 16 (large). They are shorter than the text buttons because a symbol's line height is smaller than text's.
- Label weight is **regular** for every style, including the prominent ones. The runner-up match is always one size down at medium.
- `ControlSize.extraLarge` = `large` on iOS 26.2. This settles the WWDC-vs-docs conflict in IOS27-CONTROLS.md: the docs are right.
- Colours over `#808080`:

  | Style | Light fill / label | Dark fill / label |
  |---|---|---|
  | glass | #ececec / black | #333333 / #f4f4f4 |
  | glassProminent | #0083f7 / white | #0392ff / white |
  | borderedProminent | #0088ff / white | #0091ff / white |
  | bordered | translucent grey (#e9e9eb over white, #262629 over black) / accent | same rule / accent |

- UIKit `UIButton.Configuration` reports intrinsic heights 32 / 38.33 / 54.33 for .small / .medium / .large with a text title. That is 2 pt more than the SwiftUI visible height, and was not checked visually. With an image only: `.glass()` / `.prominentGlass()` give **square** 28 / 34.33 / 50.33. `.filled()` / `.tinted()` / `.gray()` with an image are wider (42 × 28, 49 × 34.33, 65 × 50.33). So UIKit's glass icon buttons are circles, while SwiftUI's icon-only bordered or glass buttons are capsules.

## 2. Toolbars and navigation bar (iPhone, `NavigationStack` + `.toolbar`)

| Item | Measured |
|---|---|
| Top bar item (single icon) | **44 × 44 circle** (r 21.83 ≈ 22), glass `#ececec` / `#333333` |
| Grouped items (`ToolbarItemGroup`, 2 icons) | one capsule **103.33 × 44**. Glyph centres are 55.67 apart; outer glyph-to-edge ≈ 13.7–14.3 |
| Gap between groups (`ToolbarSpacer(.fixed)`) | **12** |
| Side inset (top bar) | **16** |
| Top bar item y | 62 → 106 (under the status-bar safe area) |
| Toolbar glyph | 19.67 pt (= `square.fill` at 22 pt). Bar symbols are drawn larger than button symbols. |
| Bottom bar (`.bottomBar`) items | **48 high**. Text item "Edit" 61.33 × 48 (17 pt). Icon group of 2 is 107.33 × 48. `.glassProminent` icon is a **48 × 48 circle**. |
| Bottom bar insets | **28** from the screen sides and **28** from the bottom (y 798 → 846) |
| Gap between bottom groups (fixed spacer) | 12 |
| Inline title | with a leading item, the inline title sat at the leading side (ink x 72.7, 12.7 after the leading circle). Without bar items (search scene) it was centred. |

## 3. Segmented `Picker`

| | regular | `.controlSize(.large)` |
|---|---|---|
| Track | **300 × 32 capsule** (SwiftUI frame says 31; the visible track is 32) | 300 × **49** capsule (frame 48) |
| Thumb | **28 high capsule, inset 2** all round | 45 high, inset 2 |
| Thumb width | segment − 2.67 (3 segments: 96 of 98.67) | 146 of 148 (2 segments) |
| Label | **13 semibold** (selected) | 13 semibold |
| Track fill | light ≈ 6.5 % black (#eeeeef over white); dark #1c1c1f over black | same |
| Thumb fill | light white; dark #9e9ea3 | same |

UIKit `UISegmentedControl` intrinsic height: 31.

## 4. Toggle (switch)

| | Measured |
|---|---|
| Track | **63 × 28 capsule**. SwiftUI frame and `UISwitch.intrinsicContentSize` are **61 × 28**; the visible track extends 2 pt past the frame's trailing edge. |
| Thumb | **37 × 24 capsule** (r 12), inset 2 (on: x + 24; off: x + 2) |
| On colour | light #34c759, dark #30d158 |
| Off track | light #6c6c6e, dark #a0a0a3 over #808080 (a translucent fill) |

## 5. Slider

| | Measured |
|---|---|
| Track | **6 pt capsule** (coverage 5.83, centred). Filled part is accent blue (#0088ff / #0091ff); empty part darkens the background (128 → 115 light, 128 → 140 dark). |
| Thumb | **37 × 24 capsule**, white: the same size as the switch thumb |
| Frame height | SwiftUI 31; `UISlider` intrinsic 34 |

## 6. Text fields and search

| | Measured |
|---|---|
| `TextField` `.roundedBorder` | **34 high**, corner **r ≈ 5** (circular fit, rms 0.07 px), 1 px border (light #cccccc, dark #333333), fill white / black. Placeholder 17 pt; ink starts 8.7 from the edge. `UITextField.roundedRect` intrinsic height is 34 too. **Not a capsule.** |
| `.searchable` (default placement, iPhone) | Goes to the **bottom toolbar**: a **346 × 48 capsule**, inset 28 from the screen sides and bottom, glass #ececec / #333333 |
| `.searchable(placement: .navigationBarDrawer(.always))` | **370 × 44 capsule** at x 16, y 117. A plain fill (light #cdcdcd, dark #595959), not glass. |
| `UISearchBar.sizeToFit` | 402 × 64 (bar including its margins) |

## 7. `List` `.insetGrouped`

| | Measured |
|---|---|
| Card side inset | **16** (card 370 wide on a 402 screen) |
| Card corner radius | **26.4** (profile fit 26.43, area 26.52; circular) |
| Row height, one-line 17 pt text | **54** (53.83 / 54.0 / 54.17 including the separator) |
| Separator | 1 px (⅓ pt), inset **16 from both card edges** (x 32 → 370) with a text-only row. Colour light #e8e8e8 on white, dark #38383b on #1c1c1e. |
| Row text | 17 regular; ink starts 17.7 from the card edge (≈ 16 + side bearing) |
| Section header | **17 semibold**, secondary colour (#85858b light, #8c8c92 dark). Ink 17.3 from the card edge, ink top 27.7 above the card. |
| Backgrounds | light #f2f2f7 / card white; dark black / card #1c1c1e |

## 8. Menu (glass morph)

### Final layout (UIKit `UIMenu` and SwiftUI `Menu` are identical)

| | Measured |
|---|---|
| Width | **250** (short labels) |
| Corner radius | **≈ 32.7** (profile 32.3–32.7, area 32.85; circular fit rms 1.5 px, so a slightly continuous corner) |
| Height, 4 rows in 2 groups | 209 |
| Row pitch | **41.8–42** |
| Top / bottom padding | ≈ 10 (first text centre 31 from the top = 10 + 42/2) |
| Between groups | **one extra ≈ 21 pt band** with a 1 pt hairline in its middle, inset **24** from both menu edges (light #c9c9c9 on #dbdbdb, dark #4c4c4c on #3c3c3c) |
| Icon column | glyph ink starts **27.7** from the leading edge (square.fill at 17 pt, 15.33 wide) |
| Text column | ink starts **60.7** (text origin ≈ 59.3). Label **17 regular**. Destructive is red with a red icon. |
| Fill | light #dbdbdb, dark #3c3c3c over #808080 (thicker glass than buttons) |
| Background | **not dimmed** (pixels outside stay at #808080) |
| Anchor | The menu covers its button. It is aligned to the button's edge on the side it grows from: top-aligned when opening down (button y 190 → menu y 190), bottom-aligned when opening up (button bottom 684.33 = menu bottom), and trailing + top aligned for a toolbar button (menu right edge 386 = button right edge, top 62). In-content menus are centred horizontally on the button. Upward menus reverse the item order (Delete first). |

### Opening morph (button → menu)

Five clean runs: UIKit in-content opening down and up, light and dark, plus the SwiftUI toolbar
`Menu`. t = 0 is the first frame where the bubble moved by more than 1 pt.

| | Width | Height |
|---|---|---|
| t50 | 0.06–0.09 s | 0.03–0.08 s |
| t90 | 0.12–0.15 s | 0.11–0.14 s |
| Peak (overshoot) | **0.20–0.23 s, +6–6.7 pt (+3–4 %)** | 0.19–0.25 s, +4–4.3 pt (+2.5–2.8 %) |
| Settled (±0.5 pt) | **0.41–0.50 s** | 0.38–0.43 s |
| Spring fit | **response 0.28–0.32, dampingFraction 0.72–0.75 (bounce ≈ 0.27)** | response 0.20–0.30, damping 0.73–0.87 (noisier) |

- Shape: in the first 15–30 ms the button pinches. A content button narrows and grows taller (83 × 54 → 59 × 67); the bar circle shrinks to about 39 then 22 × 19. Then it grows as a near-elliptical blob: the area radius is 0.9–1.0 × half its short side until about 0.15 s. It becomes the 32.7-radius rectangle as it reaches full size (radius ratio 0.49 at 0.2 s, 0.31 when settled). Along the growth axis the centre overshoots strongly: the bubble swings 24–35 pt past its final centre on the way out, peaking at about 0.10–0.13 s.
- Content: drawn inside the bubble **from the first frames, blurred and refracted** (the button label first, then the menu rows). There is no separate fade-in. Contrast reaches 90 % of final at **0.19–0.25 s**. Sharpness (blur gone) reaches 90 % at **0.33–0.50 s**, so the blur clears as the shape settles.
- No background dim, no scale-in of content separate from the shape.

### Dismissal (menu → button)

Four UIKit runs (programmatic `dismissMenu()`) and the toolbar `Menu` (tap outside).

| | Width | Height |
|---|---|---|
| t50 | 0.04–0.07 s | 0.09–0.12 s |
| t90 | 0.10–0.12 s | 0.19–0.22 s |
| Overshoot | **narrows ~16 pt past the button (83 → ~67) at 0.15–0.18 s, then springs back** | none (ease-in to the button height, done by ~0.26 s) |
| Settled | **0.59–0.62 s** | 0.47–0.50 s |
| Spring fit | response 0.29–0.33, damping 0.66–0.67 (bounce ≈ 0.33) | response 0.48–0.53, damping ≈ 0.78 (poor fit: it ends like an ease-out, not a spring) |

- The content disappears first and fast. Contrast falls below 10 % within **0.01–0.05 s** (blur and fade together), so the bubble flies back empty and frosted.
- Shape: the menu briefly brightens (lift) in the first frame. It rounds into a blob with a point toward the button (a droplet), shrinks toward the button, and the button label reappears at about 0.15–0.18 s. A small tail on the far side retracts, and the button sinks the last ~6 pt into place over 0.2 s.
- Toolbar `Menu` dismissed by a tap outside: same profile (t90 0.10–0.14 s, settled 0.49 s), +3.7 pt width / +7 pt height pop when it lands on the 44 pt circle.

Low-confidence run: an in-content SwiftUI `Menu` opened by a tap. Its recording dropped frames.
It agrees on geometry (250 × 209, opens upward, bottom-aligned) and on peak/settle (0.25 s / 0.38–0.46 s),
but its fits are not used.

## 9. Alert (`.alert` with title + message)

| | Measured |
|---|---|
| Width | **320** (x 41 on a 402 screen) |
| Corner radius | **≈ 35** (profile 34.7–35.4, area 35.1) |
| Height | 156 with 1 or 2 buttons; 268 with 3 |
| Buttons | **48 high capsules** (r 24). Two side by side, **140 + 8 + 140**. Three or more stacked full width **288**, 8 apart. |
| Button insets | **16** from the sides and bottom |
| Title | **17 semibold**, leading. Ink starts 31.3 from the edge (text origin ≈ 30); ink top 28.3 below the alert top. |
| Message | **15 regular**, secondary (#5f5f5f light, #a8a8a8 dark). Message ink bottom → buttons: 24. |
| Button label | 17, best match **medium** (runner-up 16 semibold). Cancel is the same style; destructive is red. |
| Fill | light #d3d3d3 with buttons #bababa; dark #292929 with buttons #414141 |
| Dimming | light: background × 0.80 (20 % black); dark: × 0.52 (48 % black) |

## Reproduce

    app/controls/build.sh                          # CtlLab.app (swiftc, ~40 s)
    xcrun simctl boot "iPhone 17 Pro"
    LG_RAW=/tmp/lg python3 tools/controls_capture.py install
    LG_RAW=/tmp/lg python3 tools/controls_capture.py all          # ~70 screenshots + frames JSON
    LG_RAW=/tmp/lg /usr/bin/python3 tools/analyze_buttons.py      # data/controls-buttons.json
    LG_RAW=/tmp/lg /usr/bin/python3 tools/analyze_controls.py     # data/controls.json
    # menu morph (UIKit opens/closes itself):
    LG_RAW=/tmp/lg /usr/bin/python3 tools/record_menu.py uikit uikit-light-dy-220 \
      "scene=umenu&open=content&delay=1.5&close=2.5&dy=-220&bg=808080&status=shown&scheme=light&total=6"
    # toolbar menu: scene=smenu, then `record_menu.py raw <name> 30` and tap the ⋯ button, then outside
    LG_RAW=/tmp/lg /usr/bin/python3 tools/analyze_menu.py uikit-light-dy-220 "swiftui-bar-light@58,420,0,10"
    /usr/bin/python3 tools/plot_menu.py                           # data/controls-menu.png

Scene keys are listed at the top of `CtlLab.swift`. `analyze_menu.py` takes
`name[@ymin,ymax[,tmin,tmax]][=label]` to limit the search band and time window. Gotchas: a
presented alert outlives a scene change, so the capture relaunches the app after each alert. The
app ignores a repeated query, so `request()` adds a nonce. Tap-driven recordings can drop frames
when the host is busy, so check the frame gaps.
