# @feeef.dev/ui changes

This repo is the single source of the Feeef UI kit. Apps (Lab, Cloud console, …) install it
from git; never copy kit files into an app or fork them there. App-specific chrome and features
live in the app and compose these pieces.

Workflow: edit `src/`, add or update tests in `tests/` for pure logic, run `npm run check`,
then `npm run release -- <patch|minor|major>` and bump consumers. The docs live in this repo
(`docs/`, `npm run docs`; authoring contract `docs/README.md`): update the component's docs page
and its examples when a public primitive changes, and JSDoc every public prop (the API tables are
generated from it). `DESIGN.md` ships with the package and is the short form of the docs'
Guidelines; keep it in sync when a principle or decision rule changes.

Theming is configuration, not code: apps pass `ThemeConfig` (palette, density, radius;
README "Theme config") and the kit CSS reads the resulting tokens. Never hard-code a color,
control height/padding or radius in kit CSS: use `--lab-*` color tokens, the density size
tokens, and `var(--lab-radius-*)` or `calc(Npx * var(--lab-corner-scale, 1))` (never the raw `--lab-radius-scale`: `--lab-corner-scale` also carries the corner fit that keeps circle-only browsers looking like the superellipse). Inside an inset surface the gap between its controls never exceeds the inset (tie both to one variable, like `--lab-segmented-inset`).

Keep the kit framework-neutral: no Inertia, Next.js or router imports. Hosts pass locale,
translations, URL and navigation through `Provider` / `Services`. Modules using hooks
start with `'use client'`. Kit strings use the `lab.*` keys in `src/messages.ts` (en/ar/fr);
keep all three locales in sync.

The live contract is lab.feeef.org/ui and the Lab README.
Reuse ui.tsx controls, system.css tokens and scaffold.tsx layout/materials.
Lab buttons and fields own native elements; do not inherit generic UI visual classes.
New buttons use explicit variant/controlSize props. Never add class-name inference.
Use native CSS superellipses by default; unsupported browsers use normal rounded
corners. The shared SVG engine is opt-in through Provider enableCornerFallback.
Never clip interactive hosts or fork geometry.
Update the /ui live examples and this contract when a public primitive changes.
Run npm run check here and the consuming apps' lint/tests. Preserve browser zoom and reduced-motion,
reduced-transparency, forced-colors and opaque material fallbacks.

Architecture: use Provider as the composition root. Keep primitives in focused
modules behind ui.tsx. Use typed props/callbacks for independent widgets, local
state for local interactions, and context only for inherited/shared dependencies.
Inject platform dependencies through Services; do not access browser storage
or clipboard in leaf widgets. Keep feature orchestration in feature hooks.

Containers and physics (`src/containers`, `src/physics`): navigation stack, sheet, split view and
layout transitions share one physics core (analytic springs with velocity, pan recognizer, momentum
projection, rubber band). Gestures write transform/opacity/clip-path only and track velocity with
event timestamps; layout changes happen once at rest. Pure geometry lives in `*-model.ts` with tests
in `tests/physics.test.ts` and `tests/containers.test.ts`. Never hand-roll a drag or a page
transition in a feature: extend these.

Merchant patterns are normative for new bounded scrolling surfaces: use
ScrollArea to fill the nearest closed/bordered container. Float controls in
its top/bottom slots; reserve measured height + twice the edge gap, never fixed
spacer guesses. Use Dock + ActionsBar for responsive grouped controls.
Keep dock swap keys coarse and action effects injected. Read the Merchant
layout/dock/action/pixel sections in README and update /ui examples with changes.

General form fields use TextField with an integrated floating label (inside or outlined), meaningful
leading icons/affixes and actionable validation feedback; see /ui#controls.
Use RawInput for unpainted bespoke editors, preserving native input semantics.
Do not add new label-above-input form patterns.

New common buttons prefer explicit filled, tonal, elevated, outlined or text
variants (Material categories, Feeef visual styling); see /ui#controls.

TextField defaults to outlined labels. Use labelStyle="inside" only when an
internal floating label is intentional. Migrate general text/search fields to
TextField; legacy Input is for non-text controls and Textarea for existing
specialized composers only.

Buttons, TextField and Select share ControlVariant and control-variants.css.
Reuse the five shared paint recipes; keep labelStyle independent of variant.

General selects supply a floating label through Select. Reuse FieldShell for
new field decoration (icons, helper/error text, sizes and labels); keep behavior
in the owning control. Supply actionable, localized validation messages.

Field interaction rule: the native input/textarea/select trigger fills the entire
visible field and owns its outer border/focus ring. Use measured logical padding
for overlay adornments; decorative overlays pass clicks through, independent
actions retain their own focus. Do not fake hit areas with wrapper clicks or
pseudo-elements. See README: Field surfaces are interaction surfaces.

Field copy rule: hint is the floating label (label is a compatibility alias).
Placeholders appear only for empty fields without a hint, including while focused.
Keep field chrome in UI direction; auto text direction must not swap measured
adornment padding. Select portals inherit the trigger direction.

All dropdown/popover hosts use PopoverSurface (asChild for Radix Content and
SubContent); preserve portal/focus/collision behavior and avoid nested paint.
Use filled for primary actions. The primary variant spelling is deprecated.

Icon-only actions use IconButton with an accessible name and explicit variant;
filled uses the same primary decoration. Icon-triggered menus/popovers use the
same PopoverSurface as labeled triggers. Do not fork icon paint or hit targets.

Scaffold (workspace/scaffold.tsx) is used by /ui and the Image, Voice and Chat tool shells; see /ui#layout.
Keep application routing/account behavior in slot owners and useScaffold events.
Image, Voice and Chat compose workspace/tool-scaffold.tsx. Billing retains its existing adapter.

Scaffold compact navigation uses a full-height, logical-start drawer (not a bottom
sheet), leaving a visible backdrop. Keep account identity and trailing appearance/
language actions in one full-width tile; quota/upgrade cards reuse PixelTexture
and shared surface tokens. Portal menus opened inside native dialogs stay inside
that dialog so they remain interactive.
Scaffold main content fills one ScrollArea. Its appBar floats transparently in
that area's top slot and bottom task controls use Dock in the bottom slot.
Retain ScrollGradientOverlay and ResizeObserver-measured clearance; do not
restore a separate header row or nest route scroll containers.
Toolbar bubbles and Scaffold titles fit their content by default; flexible space
belongs between groups, not inside a stretched title bubble. Filter toolbars use
FilterBar with injected query behavior and measured ScrollArea placement.
Filter pins and query values are independent. Clear preserves a pin with a null
value; unpin removes the shortcut, not its query. Filter catalogs autofocus search,
use typed editors and trailing pin actions. Keep action-group width allocation
separate from painted content width so overflow remains responsive without blank
space inside bubbles. Controls inside bubbles inherit the inset corner radius.

Filter catalogs use plain menu rows. Enum values edit directly from pinned chips
in small searchable popovers; reserve dialogs for date-range/custom editors.
Apply the full ScrollArea contract inside menus too: floating search, floating
action dock, measured reservations and ScrollGradientOverlay. Scaffold side
leading/trailing slots float within the same boundary as the scrollable tree.

General sliders use Slider and boolean sliding toggles use SlideSwitch.
Keep geometry, pointer/keyboard behavior and motion in the shared primitive.
Extend decorative renderFill/renderThumb slots for domain controls such as ModelLadder;
use onValueChange for previews and onValueCommit for expensive effects. See /ui#controls.
Temporal filters reuse filters/temporal.ts and TemporalFilterEditor; do not fork
calendar/time validation or presets. Date/time/datetime each support single and
range values. Keep timezone conversion in the query owner. Scrollable dialogs use
transparent title/close groups and a measured action dock; no full-width painted
header or fixed footer clearance. Test temporal boundaries and open/overnight ranges.

Temporal inputs are selection-first: preset list/dropdown, calendar day/range
selection, and hour/minute menus. Manual entry is optional and initially collapsed.
Reuse the shared calendar and date-selection model; preserve native form values,
keyboard navigation, bounds and validation.

Selection controls use Checkbox, Radio and RadioGroup; keep native inputs,
label hit areas, form semantics and browser keyboard navigation. Use Checkbox's
indeterminate state for partial selection. Slider motion shares one damped spring
clock for fill, thumb travel and shape; do not stack independent easing timelines.

General date/time fields use TemporalField or its six typed date/time/datetime
single/range wrappers. Reuse FieldShell and TemporalFilterEditor; keep local
ISO form values separate from formatted display. Preserve draft Apply/cancel,
native required/custom validity, trigger focus and measured floating picker chrome.

Use Checkbox/Radio/RadioGroup for every checkbox/radio field, including
feature cards, generated forms and docs. Native or Input choice inputs are
lint errors outside primitives. Owner CSS may arrange controls, never replace or
resize shared marks/input hit areas. Segmented view/mode pickers remain shared
SegmentedControl; do not fork their radio semantics into feature buttons.

Every slider/toggle uses Slider/SlideSwitch, including docs and specialized
features. Menu indicators use noninteractive SlideSwitchIndicator while the
menu owns checkbox semantics. Switch names are compatibility-only; native
ranges and feature-authored slider/switch roles are lint errors. /ui mounts the
shared Scaffold and uses its measured appBar/content/side slots; do not restore
a separate documentation shell or a nested reader scroll area.

All general selects require an integrated hint/label. Do not wrap TextField/Select
in Label. Bespoke composers use RawInput multiline; autoResize=false is for
an existing measured editor sizing engine. Textarea is compatibility-only.
Docs chrome uses ScaffoldSide/AppBar and NavigationItem like /ui#layout,
including the sidebar logo/toggle/search and trailing appearance actions.


Names carry no prefix: components, hooks and constants are `Button`, `useTheme`, `SPRINGS`, not
`LabButton`. CSS classes (`.lab-*`), tokens (`--lab-*`), data attributes (`data-lab-*`) and message
keys (`lab.*`) keep the `lab` namespace so they never collide with app styles. Never reintroduce a
prefixed alias.

Liquid glass uses circular corners by default (an exception to the general superellipse rule),
a 1px reference rim and the measured refraction profile. Keep these defaults shared by
GlassContainer and GlassScene so GlassScope consumers inherit them. Theme tint/blur and
member CSS radii remain configurable.
Liquid glass (`src/glass`): `GlassContainer` paints ONE material for every GlassGroup, ToolbarGroup
and Dock inside it: a backdrop clipped to the blended outline plus an SVG edge, pointer-following
rim light and masked shadow. Bubbles keep layout, focus and semantics; the container springs their
glass (`SPRINGS.snappy`) and plans splits, merges and materialize/dematerialize in
`transitions.ts`. Geometry (`geometry.ts`: superellipse SDF, smooth union with k = spacing, marching
squares) and light (`light.ts`) are pure and tested in `tests/glass.test.ts`; keep them pure, they
are the contract the Flutter twin ports. Bubbles that animate their own size pass
`glassMotion="follow"`. Hide bubbles with `inert`/removal, never with opacity, filter, mask or
clip-path on a container or its ancestors (they cut the backdrop). Glass is clipped like content: a bubble inside a clipping ancestor below its container (overflow,
clip-path, contain: paint; Flutter: any render object's `describeApproximatePaintClip`, e.g. a scroll
view or ClipRect) paints only inside it, cut straight at the edge (`clippedGlassPaths`), and only
bubbles sharing a clip merge; a scroll there moves the glass exactly. One container per floating row;
never nest containers or put one inside a bubble.
Kit rows (ScaffoldAppBar, ScaffoldTopBar, Toolbar, Dock host, ToolbarSearch) are GlassScopes:
a container unless one encloses them. Wrap any other standalone ToolbarGroup row in GlassScope.
Bubbles leave the glass when they or an ancestor are `inert`, `hidden` or `data-glass-hidden`
(use it for a bubble that fades out but stays mounted).
The material (blur, saturation, veil, rim, shadow), the refraction profile and the merge width are
our own fit to measured Liquid Glass (`research/liquid-glass/FINDINGS.md`, `data/model.json`); change
them there first and keep `material.ts`/`refraction.ts`/`geometry.ts`, their Dart twins,
`shaders/glass_refraction.frag` and the tokens in step.
ThemeConfig `glass` (liquid/still/solid), `glassTint` (0 clear … 1 tinted, `--lab-glass-tint`),
`glassBlur` and `glassRefraction` (`data-lab-glass-blur|refraction` on/off) are read live from
`<html>`; the tint curve is `glassMaterial()` (material.ts / material.dart) and the
`--lab-glass-*` calc() formulas in system.css + glass.css (tests/glass-tint.test.ts checks the
anchors); refraction (glass/refraction.ts, pure) stays active during motion in Chromium and with Firefox live sources. Reuse maps for translation/material changes; never clear optics on spring frames or defer them until rest.
The glass scene measures in the container's own pixels (`hostFrame`), so scaled ancestors (demo
frames, receding sheets) stay exact; bubbles moved by a running transform/transition/WAAPI animation
(on them or an ancestor below the container) are followed every frame; departed glass is removed
within 900 ms even when frames are paused; dispose clears every painted piece.

Glass defaults to tint 0.5 (a light veil) on web and Flutter alike (`GLASS_TINT_DEFAULT`,
`glassTintDefault`). Firefox bends only glass given an explicit backdropSource: a separate,
non-scrolling background layer (a scroller is refused: Firefox scrolls it on the compositor,
so an element-image copy trails it). Keep source ancestry guards and
reduced-transparency/contrast handling when changing Firefox refraction.
Merged paint bounds include smooth-union growth and an antialias fringe. Keep rim canvases at
their exact sampling scale through fractional sizes. Firefox clips the live outline independently
from its predecoded map; bound pending work and release Blob URLs on eviction/disposal. Never
apply a stale map alpha as a second Firefox silhouette. Undo the last written content press scale
when measuring layout, and clear it when a member leaves.

Menus and floating panels (`src/menu`, `flutter/lib/menu`): a list of commands or choices behind a
button is a `MenuSurface` (asChild on the Radix content): one glass bubble that grows out of its
trigger and flies back into it (`SPRINGS.menu` / `SPRINGS.menuDismiss`, pure geometry in
`morph-model.ts` and its Dart twin, vectors in `flutter/test/fixtures/menu.json` via
`flutter/tool/generate_menu_fixture.ts`). It supplies the Radix placement (cover offset, align,
collision padding and boundary); don't set those on the content. Forms and pickers stay on
`PopoverSurface`. Every floating panel respects the app's bounds: pass `useFloatingBoundary()` as
portal container and `collisionBoundary`; apps in a frame wrap themselves in `FloatingBoundary`. In
Flutter every popup lays out in `AnchoredPanel` (inside the hosting overlay, flip, shift, max
extent, follows scrolling); never position a popup with `CompositedTransformFollower` or screen
maths.
