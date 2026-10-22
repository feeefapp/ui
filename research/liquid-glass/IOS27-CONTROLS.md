# iOS 26/27 Liquid Glass controls: metrics and behaviours

Research date 2026-10-22. Public sources only: Apple HIG, Apple developer docs, WWDC25/26 transcripts, Apple support pages, plus a few clearly labelled third-party observations. No reverse engineering.

Units: points (pt) = CSS px = Flutter logical px.

**Confidence tags** (used in every table):
- **D**: documented by Apple (HIG or API docs).
- **W**: stated in a WWDC session transcript (qualitative, rarely numeric).
- **M**: third-party measurement or report (forum, press). Treat as likely, not certain.
- **I**: inferred. Apple publishes no number. This is our best estimate from observed iOS 26 UI and earlier iOS values. **Measure it in the iOS 26/27 Simulator, or in Apple's official Figma kit, before shipping it as an "exact" default.**

Main finding: Apple documents behaviour (capsules, concentricity, morphing, interactive glass) much more than numbers. For iOS the HIG gives numbers only for hit targets, Dynamic Type, dimming and padding. Apple's Figma kit "iOS and iPadOS 26" holds the exact frames ([news](https://developer.apple.com/news/?id=pnfbj8je), [Figma](https://www.figma.com/community/file/1527721578857867021/ios-and-ipados-26)), but it can't be fetched as text. Opening it in Figma is the cheapest way to turn the **I** rows below into **D**.

Key sources (short names are used in the tables):
- HIG pages: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [Menus](https://developer.apple.com/design/human-interface-guidelines/menus), [Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus), [Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles).
- WWDC25: [219 Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/), [356 Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/), [323 Build a SwiftUI app with the new design](https://developer.apple.com/videos/play/wwdc2025/323/), [284 Build a UIKit app with the new design](https://developer.apple.com/videos/play/wwdc2025/284/).
- WWDC26: [269 What's new in SwiftUI](https://developer.apple.com/videos/play/wwdc2026/269/), [278 Modernize your UIKit app](https://developer.apple.com/videos/play/wwdc2026/278/), [292 Design intuitive search experiences](https://developer.apple.com/videos/play/wwdc2026/292/).
- WWDC23: [10158 Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/).

---

## 1. Buttons

| Item | Value | Tag | Source / note |
|---|---|---|---|
| Hit region | ≥ 44×44 (iOS default control size); 28×28 is the minimum control size | D | HIG Buttons ("at least 44x44 pt"); HIG Accessibility table (iOS default 44×44, minimum 28×28) |
| Size ladder mini / small / regular / large / extraLarge | **28 / 32 / 44 / 52 / 64** | D (visionOS only) | HIG Buttons, visionOS section. This is the only published ladder. iOS uses the same five `ControlSize` names, but Apple publishes no iOS heights. |
| iOS visible heights | regular bordered ≈ 34–36, large ≈ 50–52, mini ≈ small | I | Earlier iOS values; [Use Your Loaf](https://useyourloaf.com/blog/swiftui-button-styles-and-shapes/) notes that mini and small look the same on iOS |
| `extraLarge` on iOS | WWDC: "support for extra large sized buttons". API docs: "Resolves to large on platforms other than visionOS" | W vs D (conflict) | [323](https://developer.apple.com/videos/play/wwdc2025/323/); [ControlSize.extraLarge](https://developer.apple.com/documentation/swiftui/controlsize/extralarge). The doc abstract may be out of date. |
| Default shape | Capsule. "Bordered buttons now have a capsule shape by default." Large controls use capsules, and the new X-Large size uses glass. | W | [323](https://developer.apple.com/videos/play/wwdc2025/323/), [356](https://developer.apple.com/videos/play/wwdc2025/356/); [forum](https://developer.apple.com/forums/thread/816614) (large/xl capsule; macOS small sizes keep rounded rects) |
| Shape guidance | Prefer circle (icon only) or capsule. Use a capsule for a lone button or a horizontal row. Use a rounded rectangle in a vertical stack. | D | HIG Buttons |
| Styles | `.glass` = glass that adapts to context; `.glassProminent` = tinted with the accent, for 1–2 primary actions per view | D | [glass](https://developer.apple.com/documentation/swiftui/primitivebuttonstyle/glass), [glassProminent](https://developer.apple.com/documentation/swiftui/primitivebuttonstyle/glassprominent); UIKit [`UIButton.Configuration.glass()`](https://developer.apple.com/documentation/uikit/uibutton/configuration-swift.struct/glass()). HIG: keep prominent buttons to 1–2 per view. |
| Destructive role | System red. Never give the primary role to a destructive action. | D | HIG Buttons, Role |
| Press response | Interactive glass "reacts to user interaction by scaling, bouncing, and shimmering". In UIKit: "When tapping the button, it scales and bounces." | W | [323](https://developer.apple.com/videos/play/wwdc2025/323/), [284](https://developer.apple.com/videos/play/wwdc2025/284/). API: `Glass.interactive()`, `UIGlassEffect.isInteractive` |
| Press scale | Glass **grows** on press (it does not shrink like iOS 18 cells): about 1.04–1.08 for bar-size buttons, with a light glow centred on the touch point that follows the finger | I | Apple publishes no number |
| Horizontal padding | ≈ height / 2 − 4 (capsule): 10 / 12 / 16 / 20 / 24 for the five sizes | I | — |
| Label font | mini/small: subheadline 15 or footnote 13; regular: body 17; large/xl: body or headline 17 semibold; xl may use title3 20 | I | Text styles from the HIG Typography table |
| Icon-only toolbar button | 44×44 circle (glass shared with its group) | I (44 = D hit target) | — |
| Activity state | A button can show an activity indicator and a different label ("Checking out…") | D | HIG Buttons, iOS section |

## 2. Toolbars, navigation bars, tab bars

| Item | Value | Tag | Source / note |
|---|---|---|---|
| Bars | Navigation bars and toolbars are transparent and float above content. Items sit on Liquid Glass, and a scroll-edge effect (soft blur and fade, or `.hard`) sits under them. | W | [284](https://developer.apple.com/videos/play/wwdc2025/284/), [323](https://developer.apple.com/videos/play/wwdc2025/323/) |
| Grouping | The system groups items automatically. Each group shares one glass capsule. The back button gets its own group. `ToolbarSpacer(.fixed)` splits groups and `.flexible` pushes them apart. In UIKit, `hidesSharedBackground` opts an item out. | W | [323](https://developer.apple.com/videos/play/wwdc2025/323/), [284](https://developer.apple.com/videos/play/wwdc2025/284/) |
| Max groups | About 3 | D | HIG Toolbars |
| Primary action | One per toolbar, on the trailing side, tinted (`.prominent`); usually a blue checkmark on iOS | D/W | HIG Toolbars; [356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| Icons | Monochrome symbols without borders. Keep text-labelled items apart from symbol items, with a fixed space between them. | D | HIG Toolbars |
| Inner radii | Buttons, text fields, headers and footers inside a bar are concentric with the bar's corners | D | HIG Toolbars |
| Bar item size | 44 high; icon item 44 wide; items inside a group touch, and the group is a capsule 44 high | I | — |
| Gap between groups (fixed spacer) | ≈ 8–12 | I | — |
| Side inset (iPhone) | ≈ 16 | I | Matches iPhone layout margins |
| Nav bar | Large title scrolls with the content under the bar. New `subtitle`. Reported "much higher in landscape" on iOS 26. | W / M | [284](https://developer.apple.com/videos/play/wwdc2025/284/); [forum 787925](https://developer.apple.com/forums/thread/787925) |
| Tab bar (iPhone) | Floating glass capsule. Can minimize on scroll (`tabBarMinimizeBehavior`, `.onScrollDown`). An optional bottom accessory (mini player) moves inline when the bar is minimized. A dedicated Search tab sits at the trailing end as a separate circle. | D/W | HIG Tab bars; [284](https://developer.apple.com/videos/play/wwdc2025/284/), [323](https://developer.apple.com/videos/play/wwdc2025/323/), [356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| Tab bar height | Bar ≈ **62** inside an ≈ 83 container. The extra height leaves room for the glass to spill. | M | [forum 796986](https://developer.apple.com/forums/thread/796986). The poster says "px" but the values look like points. The 68 pt in the HIG is **tvOS**. |
| Tab selection lens | The selected tab sits on an inner glass capsule. Dragging along the bar moves a liquid lens that magnifies whatever is under it, and it snaps to a tab on release. | W (lens), I (geometry) | [219](https://developer.apple.com/videos/play/wwdc2025/219/): controls use "the transparent liquid lens … to precisely observe the value underneath" |
| Tab item | ≈ 54–60 wide pill inside the bar; icon ≈ 24–28; label ≈ 10 semibold | I | — |
| Glass merge distance | Shapes start to blend when they are closer than the container `spacing` | D (no default given) | [GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer), [UIGlassContainerEffect.spacing](https://developer.apple.com/documentation/uikit/uiglasscontainereffect/spacing) |

## 3. Segmented control (`Picker(.segmented)`)

| Item | Value | Tag | Source |
|---|---|---|---|
| Shape | **Capsule** track and capsule thumb. The shape can't be customized, and there's no API to bring back the rounded rectangle. | M (Apple DTS reply) | [forum 797629](https://developer.apple.com/forums/thread/797629) |
| Interaction | "Control thumbs, like those on switch and segmentedControl, automatically have a new liquid glass appearance for interactions." Segmented pickers "transform into liquid glass during interaction". | W | [284](https://developer.apple.com/videos/play/wwdc2025/284/), [323](https://developer.apple.com/videos/play/wwdc2025/323/) |
| Drag behaviour | While pressed, the thumb lifts into a clear glass lens, slightly larger than the segment. While dragging it stretches toward the direction of motion, then settles with a spring on the nearest segment. | I | Same family as the slider "momentum and stretch" in [284](https://developer.apple.com/videos/play/wwdc2025/284/) |
| Height | ≈ 32 (iOS 18 value); iOS 26 looks ≈ 32–36 | I | — |
| Thumb inset | ≈ 2–3 | I | — |
| Label | Footnote 13; medium for unselected, semibold for selected | I | — |

## 4. Menus (`Menu`, `UIMenu`, context menus)

**Appearance from the source.**
- "When a presentation, like a menu or a popover is originated from a glass button, the button morphs into the overlay. Menus get this behavior automatically." ([284](https://developer.apple.com/videos/play/wwdc2025/284/)) **W**
- "When showing a menu, the bubble simply pops open to reveal the content contained within." ([219](https://developer.apple.com/videos/play/wwdc2025/219/)) **W**
- When glass flexes into a larger size (for example a menu from a toolbar button), it acts like **thicker material**: deeper shadow, stronger lensing and refraction, softer light scattering. Large elements such as menus don't flip between light and dark. ([219](https://developer.apple.com/videos/play/wwdc2025/219/)) **W**
- Glass appears and disappears by modulating its lensing, not by fading opacity ("materialize"). ([219](https://developer.apple.com/videos/play/wwdc2025/219/)) **W**
- Custom equivalents use `glassEffectID(_:in:)` inside a `GlassEffectContainer` ([docs](https://developer.apple.com/documentation/swiftui/view/glasseffectid(_:in:))). Sheets morph from a toolbar item through a navigation zoom transition (`matchedTransitionSource` / UIKit `preferredTransition = .zoom { barButtonItem }`). Popovers morph when their source is a `barButtonItem`. ([323](https://developer.apple.com/videos/play/wwdc2025/323/), [284](https://developer.apple.com/videos/play/wwdc2025/284/)) **W**
- Dismissal plays the morph in reverse (observed; implied by the zoom transitions). **I**

**Timing.** Apple publishes no duration or spring for the menu morph. The closest documented anchors:

| Anchor | Value | Tag |
|---|---|---|
| SwiftUI `Animation.default` (iOS 17+) | spring response 0.55, dampingFraction 1.0 | D ([docs](https://developer.apple.com/documentation/swiftui/animation/default)) |
| `.spring(response:dampingFraction:)` defaults | 0.5 / 0.825 | D ([docs](https://developer.apple.com/documentation/swiftui/animation/spring(response:dampingfraction:blendduration:))) |
| `.snappy` / `.bouncy` / `.smooth` | duration 0.5 by default. Bounce: about 0.15 is "brisk" and about 0.3 is "noticeably bouncy". Exact preset bounces aren't documented. | D (duration), W (bounce scale, [WWDC23 10158](https://developer.apple.com/videos/play/wwdc2023/10158/)) |

Recommended morph (**I**):
- Frame and corner radius spring from the button rect to the menu rect: duration 0.42, bounce 0.15–0.2.
- Content fades and scales from 0.92 to 1 starting about 80 ms in, over about 0.25 s.
- Dismiss: content fades out first (about 0.12 s), then the frame springs back with bounce 0.

**Layout.**

| Item | Value | Tag | Source |
|---|---|---|---|
| Layouts | Small (top row of 4 icons), medium (top row of 3 icons with labels), large (default, a plain list) | D | HIG Menus, iOS |
| Separators | Between groups: "a horizontal line or a short gap", depending on platform | D | HIG Menus |
| Icons | Use them sparingly and to help recognition: all items in a group have one, or none do. iOS 26 places icons the same way on every platform (leading). iOS 27: menu images may be hidden by default in some contexts (iPad/Mac menu bar). | D / W | HIG Menus (updated 2026-06-08); [323](https://developer.apple.com/videos/play/wwdc2025/323/); [278](https://developer.apple.com/videos/play/wwdc2026/278/) |
| Anatomy | Selection indicator (checkmark), icon, label, accessory (chevron for a submenu, keyboard shortcut) | W | [356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| Submenus | One level; about 5 items at most | D | HIG Menus |
| Destructive | System red label and icon | D | HIG Buttons, Role |
| Row height | ≈ 44 (label body 17) | I | — |
| Row padding | ≈ 16 horizontal; icon column ≈ 28 | I | — |
| Corner radius | Large, ≈ 22–28; rows get concentric highlight radii | I | — |
| Width | ≈ 250 (the classic iOS context-menu width); iOS 26 looks ≈ 250–280 | I | — |
| iOS 27 | Menus can show an "Ask Siri" item automatically | W | [278](https://developer.apple.com/videos/play/wwdc2026/278/) |

## 5. Popovers, alerts, action sheets, sheets

| Item | Value | Tag | Source |
|---|---|---|---|
| Concentricity | Shapes are fixed, capsule (radius = h/2), or concentric (radius = parent radius − padding). Sheets and popovers are concentric with the device or container automatically. `ConcentricRectangle` / `.containerConcentric` and UIKit `cornerConfiguration .containerRelative` give the same, with a fallback radius when standalone. | D/W | [356](https://developer.apple.com/videos/play/wwdc2025/356/), [ConcentricRectangle](https://developer.apple.com/documentation/swiftui/concentricrectangle), [284](https://developer.apple.com/videos/play/wwdc2025/284/) |
| Sheets | Partial-height sheets are inset with a glass background, and their bottom corners pull in to nest in the display curve. At full height they turn opaque and anchor to the screen edge. Dragging up makes the glass recede, become more opaque and grow slightly. | W | [323](https://developer.apple.com/videos/play/wwdc2025/323/), [356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| Action sheets | Spring from their source action. With a source they are inline and have **no Cancel button** (tap outside dismisses). Without a source they are centred and have Cancel. | W | [284](https://developer.apple.com/videos/play/wwdc2025/284/), [356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| Alerts / dialogs | Morph out of the button that presents them. Typography is bolder and left-aligned. Keep them short so they don't scroll. | W / D | [323](https://developer.apple.com/videos/play/wwdc2025/323/), [356](https://developer.apple.com/videos/play/wwdc2025/356/); HIG Alerts |
| Modality | Dimming layer under modal glass | W | [356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| Popovers on iPhone | Avoid in compact width (use a sheet) | D | HIG Popovers |
| Alert metrics | Width ≈ 300; corner radius ≈ 32–36; buttons are capsules ≈ 48 high, side by side when there are two, stacked when there are three or more; padding ≈ 20–24 | I | visionOS-only number: accessory view max 154 high, 16 radius (HIG Alerts) |
| Popover radius | ≈ 26–30 | I | — |

## 6. Text fields and search

| Item | Value | Tag | Source |
|---|---|---|---|
| Search placement | On iPhone, search goes in the bottom toolbar and animates up over the keyboard. It can start as a button that expands into a field. On iPad/Mac it sits at the top trailing edge. It can also be a search tab, which replaces the tab bar with a field. The field width adapts to how many items share the bar (more than 2 other items → start as a button). | W | [323](https://developer.apple.com/videos/play/wwdc2025/323/), [284](https://developer.apple.com/videos/play/wwdc2025/284/), [WWDC26 292](https://developer.apple.com/videos/play/wwdc2026/292/) |
| Search anatomy | Leading magnifier, clear button once there's text, Cancel button on iOS while focused, tokens, scope bar | W | [292](https://developer.apple.com/videos/play/wwdc2026/292/) |
| Material | Glass in a toolbar; standard content styling in the scroll region | W | [292](https://developer.apple.com/videos/play/wwdc2026/292/) |
| Text field (iOS) | Clear button at the trailing end; leading image shows purpose, trailing image adds features | D | HIG Text fields |
| Search field shape | Capsule | W/I | Capsule geometry ([356](https://developer.apple.com/videos/play/wwdc2025/356/)) |
| Search height | ≈ 44–48 in bars; ≈ 36 inline | I | — |
| Search padding | ≈ 12–14 horizontal; icon 17 | I | — |
| Text field in content | Rounded rect, radius ≈ 10–12 (concentric inside cards); height ≈ 44 | I | — |

## 7. Toggle (switch) and slider

| Item | Value | Tag | Source |
|---|---|---|---|
| Switch | "Sizes are updated slightly for controls like UISwitch". The thumb turns into glass while pressed. Pressing and holding grows the thumb into a larger refracting nub that you can slide. | W, M | [284](https://developer.apple.com/videos/play/wwdc2025/284/); [Macworld](https://www.macworld.com/article/2891233/this-liquid-glass-toggle-is-a-window-into-apples-broken-design-process.html) |
| Switch size | ≈ **63×28** (wider and shorter than iOS 18's 51×31); thumb ≈ 37×24 capsule at rest | I | No public number; verify in the Simulator |
| Switch use | Only in list rows. Outside lists, use a toggle-style button. Default on-colour is green. | D | HIG Toggles |
| Slider | Glass thumb during drag; "preserve momentum and stretch when they are moved"; tick marks (`TrackConfiguration`, `allowsTickValuesOnly`); `neutralValue` fill anchor; `.thumbless` style | W | [284](https://developer.apple.com/videos/play/wwdc2025/284/), [323](https://developer.apple.com/videos/play/wwdc2025/323/) |
| Content-layer glass | Sliders and toggles in content take on glass **only while active** | D | HIG Materials |
| Slider metrics | Track ≈ 6 high (capsule); thumb ≈ 38×24 capsule at rest, ≈ 1.3–1.5× while dragging as a clear lens | I | — |

## 8. Lists

| Item | Value | Tag | Source |
|---|---|---|---|
| Row minimum | 44 (hit target) | D | HIG Accessibility |
| Typical row (Settings style, with icon) | ≈ 52 | I | — |
| Inset grouped corner radius | ≈ **26** (much rounder than iOS 18's ≈ 10). "Rounded corners of grouped table views" follow capsule/concentric geometry. | W (rounder) / I (26) | [356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| Horizontal inset | 16 on iPhone (20 on larger widths) | I | — |
| Separator inset | Leading inset to the text column (≈ 16, or ≈ 60 with an icon) | I | — |
| Swipe actions | Row corners round while swiping (Mail) | M | [forum 811328](https://developer.apple.com/forums/thread/811328) |
| Section header | Footnote 13, secondary colour (iOS 26 headers look bolder and sentence case) | I | — |

## 9. Focus (keyboard)

- The HIG focus system is "not supported in iOS". iPadOS 15+ has focus groups, Tab between groups and arrows inside a group. Focus shows as a **halo** (ring) shaped like the item, or as a **highlight**: accent-coloured row with white text. Use a ring for text and search fields and a highlight in lists. Full Keyboard Access reaches every control, so custom focus is only needed for content items. ([HIG Focus](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection), [UIFocusHaloEffect](https://developer.apple.com/documentation/uikit/uifocushaloeffect)) **D**
- On iPhone, Full Keyboard Access draws a coloured border plus highlight around the focused element. The user can change it with: **Auto-Hide** (default 15 s), **Increase Size** (thicker border), **High Contrast** (black border) and **Color**. ([Apple user guide](https://support.apple.com/en-euro/guide/iphone/ipha7c3927eb/13.0/ios), [AbilityNet iOS 26](https://mcmw.abilitynet.org.uk/how-to-control-your-device-using-an-external-keyboard-in-ios-26-on-your-iphone-or-ipad)) **D/M**
- Touch never shows a ring. **D** (behaviour)

**Recommendation for the web kit** (meets WCAG 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured (Minimum), 1.4.11 Non-text Contrast, and AAA 2.4.13 Focus Appearance):
1. Draw the ring only on `:focus-visible`. Pointer and touch never show it, which matches iOS.
2. Halo = 2 px ring (3 px with `prefers-contrast: more`, like Increase Size) in the accent colour, 2 px outside the shape. Radius = shape radius + offset (concentric); a capsule stays a capsule. Add a 1 px inner contrast hairline (white or black, whichever contrasts) so the ring reaches 3:1 against both glass and content.
3. Lists and menus: highlight the row (accent fill, white text) instead of drawing a ring, like iPadOS.
4. 2.4.11: floating glass bars cover content. Set `scroll-padding-top` and `scroll-padding-bottom` to the measured bar reservations so the focused element is never fully hidden under a bar.
5. Under `forced-colors`, use `outline: 2px solid Highlight`. Never remove the outline without a replacement.
6. Make the colour, width and offset tokens (`--lab-focus-color|width|offset`), and offer an "increase size" option and a high-contrast variant.

## 10. Typography (Dynamic Type "Large", the default; D, [HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography))

| Style | Weight | Size | Leading | Emphasized |
|---|---|---|---|---|
| Large Title | Regular | 34 | 41 | Bold |
| Title 1 | Regular | 28 | 34 | Bold |
| Title 2 | Regular | 22 | 28 | Bold |
| Title 3 | Regular | 20 | 25 | Semibold |
| Headline | Semibold | 17 | 22 | Semibold |
| Body | Regular | 17 | 22 | Semibold |
| Callout | Regular | 16 | 21 | Semibold |
| Subheadline | Regular | 15 | 20 | Semibold |
| Footnote | Regular | 13 | 18 | Semibold |
| Caption 1 | Regular | 12 | 16 | Semibold |
| Caption 2 | Regular | 11 | 13 | Semibold |

iOS default text size is 17 and the minimum is 11 (D, HIG Accessibility). iOS 26 typography is "bolder and left-aligned" in alerts and onboarding (W, [356](https://developer.apple.com/videos/play/wwdc2025/356/)).

Weights in controls (**I**):
- Nav title: headline 17 semibold.
- Large title: 34 bold.
- Bar buttons: body 17 (Done is semibold).
- Tab labels: about 10 semibold.
- Segmented: 13 medium, semibold when selected.
- Menu rows: body 17.
- Alert title: 17 semibold; alert message: footnote 13.

## 11. iOS 27 vs 26

| Change | Tag | Source |
|---|---|---|
| Refined Liquid Glass look, applied automatically with no code changes. It diffuses busy content more for legibility. | W / M | [WWDC26 269](https://developer.apple.com/videos/play/wwdc2026/269/); [Tom's Guide](https://www.tomsguide.com/phones/iphones/ios-27-has-a-bunch-of-changes-including-a-refined-liquid-glass-design-but-how-much-has-changed-from-ios-26) |
| System **Liquid Glass slider**: system glass adjusts its tint in response | W / M | [269](https://developer.apple.com/videos/play/wwdc2026/269/) ("automatically responds to the new Liquid Glass slider to adjust its tint"); [BGR](https://www.bgr.com/2191219/ios-27-liquid-glass-fix-customization/) |
| (iOS 26.1) Clear / Tinted setting under Display & Brightness | M | [9to5Mac](https://9to5mac.com/2025/11/03/apple-releases-ios-26-1-for-iphone-with-these-changes/) |
| Navigation bar minimize on scroll (`toolbarMinimizeBehavior`) | W | [269](https://developer.apple.com/videos/play/wwdc2026/269/), [278](https://developer.apple.com/videos/play/wwdc2026/278/) |
| Toolbar overflow APIs: `ToolbarOverflowMenu`, `topBarPinnedTrailing`, priority groups | W | [269](https://developer.apple.com/videos/play/wwdc2026/269/) |
| Prominent tab (`prominentTabIdentifier`), which stays visible when the tab bar collapses | W | [278](https://developer.apple.com/videos/play/wwdc2026/278/) |
| iPhone apps can opt into a sidebar | W | [278](https://developer.apple.com/videos/play/wwdc2026/278/) |
| Scroll-edge `.automatic` has its own visuals (no longer just soft or hard) | W | [278](https://developer.apple.com/videos/play/wwdc2026/278/) |
| Menu images hidden by default in some contexts; Ask Siri item in menus | W | [278](https://developer.apple.com/videos/play/wwdc2026/278/) |
| Interactive glass also on macOS | W | [269](https://developer.apple.com/videos/play/wwdc2026/269/) |
| Control metrics | No published change found | — | — |

**Kit implication:** expose a global `glassIntensity` (0 = frosted/tinted … 1 = clear) that maps to blur, tint opacity and refraction, mirroring the iOS 27 slider. Also honour `prefers-reduced-transparency` and `prefers-contrast`.

---

## Recommended kit defaults

Every value is a token. Confidence: **H** = documented by Apple, **M** = WWDC behaviour or third-party measurement, **L** = inferred; verify in the iOS 27 Simulator or Apple's Figma kit. Rows marked **measured iOS 26.2 sim** come from CONTROLS-MEASURED.md (screenshots and recordings of stock controls in the iOS 26.2 simulator; no iOS 27 simulator was available).

| Token | Default | Source / confidence |
|---|---|---|
| `hitTarget.min` | 44 | HIG Buttons/Accessibility, H |
| `control.minVisible` | 28 | HIG Accessibility, H |
| `button.height.{mini,small,regular,large,xl}` | **30 / 30 / 36.33 / 52.33 / 52.33** (mini = small; extraLarge resolves to large on iOS) | measured iOS 26.2 sim (CONTROLS-MEASURED §1); visionOS ladder 28/32/44/52/64 is visionOS only |
| `button.height.regular` (compact density) | 30 (= small) | measured iOS 26.2 sim |
| `button.shape` | capsule (r = h/2, circular ends) for all four styles (glass, glassProminent, bordered, borderedProminent) and every size; icon-only = capsule around the glyph (SwiftUI) or circle (UIKit glass config); rounded rect only by explicit choice | measured iOS 26.2 sim; HIG guidance H |
| `button.paddingX.{…}` | text-only 10 / 10 / 12 / 20 / 20 (to layout box); icon+text leading 12 / 12 / 14 / 22 / 22, icon→text gap 11.67 (ink); icon-only 12×6.17 / 14×8 / 22×16 (w 37.67 / 43.33 / 59.33, h 25.67 / 31.33 / 47.33) | measured iOS 26.2 sim |
| `button.font.{mini,small,regular,large,xl}` | 15 / 15 / 17 / 17 / 17, **regular** weight for every style (prominent too); icon glyph = symbol at 15 / 15 / 17 / 17 / 17 pt | measured iOS 26.2 sim |
| `button.prominentMaxPerView` | 2 | HIG Buttons, H |
| `press.scale` (glass, grows) | 1.06 | "scales, bounces" W; value L |
| `press.spring` | duration 0.3, bounce 0.3 | Spring model H (WWDC23); values L |
| `press.glow` | radial highlight at the touch point, 0.25 opacity | "shimmering" W; value L |
| `toolbar.itemSize` | top bar 44 circle (glyph = symbol at 22 pt); bottom bar 48 high (prominent = 48 circle); group of 2 icons = 103.33 × 44 (bottom 107.33 × 48), glyph pitch 55.67 | measured iOS 26.2 sim |
| `toolbar.groupGap` | 12 (fixed spacer) | measured iOS 26.2 sim |
| `toolbar.sideInset` | top bar 16; bottom bar 28 from sides and bottom | measured iOS 26.2 sim |
| `toolbar.maxGroups` | 3 | HIG Toolbars, H |
| `tabBar.height` | 62 | Forum measurement, M |
| `tabBar.itemWidth` | 58 | L |
| `tabBar.label` | 10 semibold | L |
| `tabBar.lens` | glass capsule, draggable, magnifies under the finger | WWDC25 219/284 behaviour, M |
| `segmented.height` | 32 (large: 49) | measured iOS 26.2 sim |
| `segmented.inset` | 2 (thumb 28 high capsule; thumb width = segment − 2.67); label 13 semibold | measured iOS 26.2 sim |
| `segmented.shape` | capsule track + capsule thumb | measured iOS 26.2 sim (agrees with Apple DTS forum reply) |
| `segmented.thumbPress` | lift to glass lens, scale 1.15, stretch ≤ 1.25× along drag | WWDC25 284 behaviour, M; numbers L |
| `menu.morph` | open: frame spring response 0.30, damping 0.73 (bounce ≈ 0.27); width peaks +3–4 % at 0.21 s, settles ±0.5 pt by 0.41–0.50 s; content blurred inside the bubble from frame 1, contrast 90 % at ~0.21 s, sharp at ~0.35 s; close: content gone in ≤ 0.05 s, width spring response 0.31 / damping 0.67 (narrows ~16 pt past the button), height ease-out ~0.25 s, settled 0.6 s | measured iOS 26.2 sim (CONTROLS-MEASURED §8) |
| `menu.material` | thicker glass (fill #dbdbdb light / #3c3c3c dark over #808080), background not dimmed | measured iOS 26.2 sim; behaviour WWDC25 219 |
| `menu.rowHeight` | 42 (17 regular label); top/bottom padding 10 | measured iOS 26.2 sim |
| `menu.paddingX` | icon ink at 27.7, text ink at 60.7 from the leading edge | measured iOS 26.2 sim |
| `menu.iconColumn` | leading; glyph = symbol at 17 pt, text origin ≈ 59.3 | measured iOS 26.2 sim |
| `menu.radius` | 32.7 (≈ 33) | measured iOS 26.2 sim |
| `menu.width` | 250 with short labels (max not measured) | measured iOS 26.2 sim |
| `menu.groupSeparator` | ≈ 21 pt band with a 1 pt hairline in its middle, inset 24 from both edges | measured iOS 26.2 sim |
| `menu.destructiveColor` | system red | HIG, H |
| `radius.model` | fixed / capsule (h/2) / concentric (parent − padding) with fallback | WWDC25 356, H |
| `sheet.partial` | inset glass, bottom corners concentric with the device, opaque at full height | WWDC25 323, M |
| `alert.width` | 320 | measured iOS 26.2 sim |
| `alert.radius` | 35 | measured iOS 26.2 sim |
| `alert.buttonHeight` | 48 capsule; 2 buttons side by side 140 + 8 + 140, 3+ stacked (gap 8); inset 16 sides and bottom | measured iOS 26.2 sim |
| `alert.textAlign` | leading; title 17 semibold (text origin ≈ 30 from the edge), message 15 regular secondary; dim × 0.80 light / × 0.52 dark | measured iOS 26.2 sim |
| `actionSheet.anchor` | spring from the source; no Cancel when anchored | WWDC25 284/356, M |
| `popover.radius` | 28 | L |
| `searchField.height` (bar) | 48 capsule in the bottom toolbar (346 wide, inset 28); 44 capsule in the nav-bar drawer (plain fill, not glass) | measured iOS 26.2 sim |
| `searchField.height` (inline) | 44 capsule (nav-bar drawer, inset 16) | measured iOS 26.2 sim |
| `searchField.paddingX` | 12 | L |
| `textField.height` | 34 (`.roundedBorder`) | measured iOS 26.2 sim |
| `textField.radius` | 5 (rounded rect, 1 px border), not a capsule | measured iOS 26.2 sim |
| `switch.size` | 63 × 28 visible (layout frame 61 × 28) | measured iOS 26.2 sim |
| `switch.thumb` | 37 × 24 capsule, inset 2; on colour #34c759 / #30d158 | measured iOS 26.2 sim (rest); press lens not measured |
| `switch.onColor` | system green (accent optional) | HIG Toggles, H |
| `slider.trackHeight` | 6 (capsule) | measured iOS 26.2 sim |
| `slider.thumb` | 37 × 24 capsule (same as the switch thumb) at rest | measured iOS 26.2 sim (rest); drag lens not measured |
| `slider.extras` | ticks, neutralValue, thumbless | WWDC25 284, H (API) |
| `list.rowMin` | 44 | HIG, H |
| `list.rowDefault` | 54 (one-line 17 regular) | measured iOS 26.2 sim |
| `list.insetGroupedRadius` | 26.4 | measured iOS 26.2 sim |
| `list.insetX` | 16; separator inset 16 from both card edges; header 17 semibold secondary | measured iOS 26.2 sim |
| `focus.ring` | `:focus-visible` only, 2 px accent + 2 px offset, concentric radius, 1 px contrast hairline; 3 px when `prefers-contrast: more` | WCAG 2.4.7/2.4.13 + HIG halo, H/M |
| `focus.listStyle` | row highlight (accent fill, white text) | HIG Focus, H |
| `focus.scrollPadding` | bar reservations (2.4.11) | WCAG, H |
| `type.*` | Large table in section 10 (body 17/22, subhead 15/20, footnote 13/18, …) | HIG Typography, H |
| `glass.clearDimming` | 35 % dark layer over bright content | HIG Materials, H |
| `glass.intensity` | 0–1 user setting (iOS 27 slider) | WWDC26 269, M |
| `spring.default` | response 0.55, damping 1.0 | SwiftUI `Animation.default`, H |
| `spring.snappy` | duration 0.5, bounce ≈ 0.15 | Duration H; bounce M (WWDC23) |
| `spring.bouncy` | duration 0.5, bounce ≈ 0.3 | Duration H; bounce M (WWDC23) |
| `padding.bezel` | about 12 around bezeled elements, 24 around borderless ones | HIG Accessibility, H |
