# @feeef.dev/ui changes

This repo is the single source of the Feeef UI kit. Apps (Lab, Cloud console, …) install it
from git; never copy kit files into an app or fork them there. App-specific chrome and features
live in the app and compose these pieces.

Workflow: edit `src/`, add or update tests in `tests/` for pure logic, run `npm run check`,
then `npm run release -- <patch|minor|major>` and bump consumers. The live examples at
lab.feeef.org/ui (Lab repo, `inertia/pages/lab/ui.tsx` + `components/lab/docs/`) and the
Lab README contract must be updated when a public primitive changes.

Theming is configuration, not code: apps pass `LabThemeConfig` (palette, density, radius;
README "Theme config") and the kit CSS reads the resulting tokens. Never hard-code a color,
control height/padding or radius in kit CSS: use `--lab-*` color tokens, the density size
tokens, and `var(--lab-radius-*)` or `calc(Npx * var(--lab-radius-scale, 1))`.

Keep the kit framework-neutral: no Inertia, Next.js or router imports. Hosts pass locale,
translations, URL and navigation through `LabProvider` / `LabServices`. Modules using hooks
start with `'use client'`. Kit strings use the `lab.*` keys in `src/messages.ts` (en/ar/fr);
keep all three locales in sync.

The live contract is lab.feeef.org/ui and the Lab README.
Reuse ui.tsx controls, system.css tokens and scaffold.tsx layout/materials.
Lab buttons and fields own native elements; do not inherit generic UI visual classes.
New buttons use explicit variant/controlSize props. Never add class-name inference.
Use native CSS superellipses by default; unsupported browsers use normal rounded
corners. The shared SVG engine is opt-in through LabProvider enableCornerFallback.
Never clip interactive hosts or fork geometry.
Update the /ui live examples and this contract when a public primitive changes.
Run npm run check here and the consuming apps' lint/tests. Preserve browser zoom and reduced-motion,
reduced-transparency, forced-colors and opaque material fallbacks.

Architecture: use LabProvider as the composition root. Keep primitives in focused
modules behind ui.tsx. Use typed props/callbacks for independent widgets, local
state for local interactions, and context only for inherited/shared dependencies.
Inject platform dependencies through LabServices; do not access browser storage
or clipboard in leaf widgets. Keep feature orchestration in feature hooks.

Merchant patterns are normative for new bounded scrolling surfaces: use
LabScrollArea to fill the nearest closed/bordered container. Float controls in
its top/bottom slots; reserve measured height + twice the edge gap, never fixed
spacer guesses. Use LabDock + LabActionsBar for responsive grouped controls.
Keep dock swap keys coarse and action effects injected. Read the Merchant
layout/dock/action/pixel sections in README and update /ui examples with changes.

General form fields use LabTextField with an integrated floating label (inside or outlined), meaningful
leading icons/affixes and actionable validation feedback; see /ui#controls.
Use LabRawInput for unpainted bespoke editors, preserving native input semantics.
Do not add new label-above-input form patterns.

New common buttons prefer explicit filled, tonal, elevated, outlined or text
variants (Material categories, Feeef visual styling); see /ui#controls.

LabTextField defaults to outlined labels. Use labelStyle="inside" only when an
internal floating label is intentional. Migrate general text/search fields to
LabTextField; legacy LabInput is for non-text controls and LabTextarea for existing
specialized composers only.

Buttons, TextField and Select share LabControlVariant and control-variants.css.
Reuse the five shared paint recipes; keep labelStyle independent of variant.

General selects supply a floating label through LabSelect. Reuse LabFieldShell for
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

All dropdown/popover hosts use LabPopoverSurface (asChild for Radix Content and
SubContent); preserve portal/focus/collision behavior and avoid nested paint.
Use filled for primary actions. The primary variant spelling is deprecated.

Icon-only actions use LabIconButton with an accessible name and explicit variant;
filled uses the same primary decoration. Icon-triggered menus/popovers use the
same LabPopoverSurface as labeled triggers. Do not fork icon paint or hit targets.

LabScaffold (workspace/scaffold.tsx) is used by /ui and the Image, Voice and Chat tool shells; see /ui#layout.
Keep application routing/account behavior in slot owners and useLabScaffold events.
Image, Voice and Chat compose workspace/tool-scaffold.tsx. Billing retains its existing adapter.

Scaffold compact navigation uses a full-height, logical-start drawer (not a bottom
sheet), leaving a visible backdrop. Keep account identity and trailing appearance/
language actions in one full-width tile; quota/upgrade cards reuse PixelTexture
and shared surface tokens. Portal menus opened inside native dialogs stay inside
that dialog so they remain interactive.
Scaffold main content fills one LabScrollArea. Its appBar floats transparently in
that area's top slot and bottom task controls use LabDock in the bottom slot.
Retain LabScrollGradientOverlay and ResizeObserver-measured clearance; do not
restore a separate header row or nest route scroll containers.
Toolbar bubbles and Scaffold titles fit their content by default; flexible space
belongs between groups, not inside a stretched title bubble. Filter toolbars use
LabFilterBar with injected query behavior and measured LabScrollArea placement.
Filter pins and query values are independent. Clear preserves a pin with a null
value; unpin removes the shortcut, not its query. Filter catalogs autofocus search,
use typed editors and trailing pin actions. Keep action-group width allocation
separate from painted content width so overflow remains responsive without blank
space inside bubbles. Controls inside bubbles inherit the inset corner radius.

Filter catalogs use plain menu rows. Enum values edit directly from pinned chips
in small searchable popovers; reserve dialogs for date-range/custom editors.
Apply the full LabScrollArea contract inside menus too: floating search, floating
action dock, measured reservations and ScrollGradientOverlay. Scaffold side
leading/trailing slots float within the same boundary as the scrollable tree.

General sliders use LabSlider and boolean sliding toggles use LabSlideSwitch.
Keep geometry, pointer/keyboard behavior and motion in the shared primitive.
Extend decorative renderFill/renderThumb slots for domain controls such as ModelLadder;
use onValueChange for previews and onValueCommit for expensive effects. See /ui#controls.
Temporal filters reuse filters/temporal.ts and LabTemporalFilterEditor; do not fork
calendar/time validation or presets. Date/time/datetime each support single and
range values. Keep timezone conversion in the query owner. Scrollable dialogs use
transparent title/close groups and a measured action dock; no full-width painted
header or fixed footer clearance. Test temporal boundaries and open/overnight ranges.

Temporal inputs are selection-first: preset list/dropdown, calendar day/range
selection, and hour/minute menus. Manual entry is optional and initially collapsed.
Reuse the shared calendar and date-selection model; preserve native form values,
keyboard navigation, bounds and validation.

Selection controls use LabCheckbox, LabRadio and LabRadioGroup; keep native inputs,
label hit areas, form semantics and browser keyboard navigation. Use LabCheckbox's
indeterminate state for partial selection. Slider motion shares one damped spring
clock for fill, thumb travel and shape; do not stack independent easing timelines.

General date/time fields use LabTemporalField or its six typed date/time/datetime
single/range wrappers. Reuse LabFieldShell and LabTemporalFilterEditor; keep local
ISO form values separate from formatted display. Preserve draft Apply/cancel,
native required/custom validity, trigger focus and measured floating picker chrome.

Use LabCheckbox/LabRadio/LabRadioGroup for every checkbox/radio field, including
feature cards, generated forms and docs. Native or LabInput choice inputs are
lint errors outside primitives. Owner CSS may arrange controls, never replace or
resize shared marks/input hit areas. Segmented view/mode pickers remain shared
LabSegmentedControl; do not fork their radio semantics into feature buttons.

Every slider/toggle uses LabSlider/LabSlideSwitch, including docs and specialized
features. Menu indicators use noninteractive LabSlideSwitchIndicator while the
menu owns checkbox semantics. LabSwitch names are compatibility-only; native
ranges and feature-authored slider/switch roles are lint errors. /ui mounts the
shared LabScaffold and uses its measured appBar/content/side slots; do not restore
a separate documentation shell or a nested reader scroll area.

All general selects require an integrated hint/label. Do not wrap TextField/Select
in LabLabel. Bespoke composers use LabRawInput multiline; autoResize=false is for
an existing measured editor sizing engine. LabTextarea is compatibility-only.
Docs chrome uses LabScaffoldSide/AppBar and LabNavigationItem like /ui#layout,
including the sidebar logo/toggle/search and trailing appearance actions.

