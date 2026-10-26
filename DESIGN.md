# Designing with @feeef.dev/ui

Read this before building or changing a screen with the kit. It is the short form of the docs'
Guidelines (`docs/` → Guidelines: Principles, Layout, Choosing components, Page patterns, Writing,
Review checklist). The components only make a good product when they are used for the right job.

Feeef apps are used by merchants, confirmation agents and couriers, all day, often on a phone, often
in Arabic, often in a hurry. Every rule here protects their speed and their trust.

## Principles

1. **Content first; chrome floats.** Content sits on opaque surfaces (the scaffold panel, content
   cards, dialogs). Tools float over it in glass groups (app bar, docks), one `GlassContainer` per floating
   row so neighbouring bubbles merge, split and share light. Floating cards are glass too: menus and
   popovers (`PopoverSurface`: the model ladder, pickers, filter editors) use the thick `menu`
   material, and number fields are glass bubbles; `ScrollArea` reserves their space
   and fades content under them. Never stack fixed header bars. Remove chrome before adding it.
2. **One primary action per view.** One `filled` button per view or dialog, at the end of the reading
   direction. Supporting actions `tonal`, cancel/secondary `text`. Destructive is `destructive`, never
   the default, and confirms.
3. **Related tools travel together.** One `ToolbarGroup` (bubble) per purpose: navigation/identity,
   title, page views, tools, page actions. Controls inside use `appearance="toolbar"`. When space runs
   out, overflow into a menu (`ActionsBar`; a `SegmentedControl` folds into its own), don't shrink or wrap.
   Two levels at most: a surface, then the bubbles on it, never a bubble inside a bubble. Content on a
   surface stays flat (a calendar heading is a plain row); bubbles on one surface share height and
   line up with its content. Example: `TemporalDialog` (top bar · calendars · action bar).
4. **Navigation, work, details: in that order.** Sidebar → content → inspector. As the screen shrinks:
   inspector → pane → sheet, sidebar → rail → hidden → drawer, the logo rises into the app bar, page
   views drop to a bottom `Dock` on phones, the page title collapses into the bar on scroll.
   Nothing disappears; it moves.
5. **Comfortable by default, dense on purpose.** Density is one app-wide `theme.density`
   (`comfortable` merchant apps, `compact` consoles, `thin` very dense tools). Comfortable is iOS's
   control sizes (capsule buttons 30 / 36 / 52, 44px toolbar bubbles, 54px list rows); compact steps
   one size down. Change a single size app-wide with `theme.metrics`, never one screen by hand. Touch
   keeps the look and reaches 44px: controls gain an invisible 44 × 44 hit area, layout untouched.
6. **Color means something.** Primary = main action, selection, focus. Red = destructive/error. Green =
   success. Everything else neutral. Never decorate with color; never rely on color alone. Brand through
   `theme.primary` / `palette`, not by painting components.
7. **Motion explains change.** Springs for direct manipulation, short fades for presence
   (`Presence`). Never animate data being read or block input. Respect reduced motion and the app's ThemeConfig
   `motion` (`full`/`reduced`/`none`): read `prefersReducedMotion()` / `reducedMotionOf(context)`;
   a crossfade that replaces movement under reduced motion takes its length from `motionFade()` (0 under `none`).
8. **Speak like a helpful colleague.** Sentence case. Buttons name the outcome ("Confirm order", not
   "Submit"). Errors say how to fix it, at the field. Limits are next steps ("Add funds"), not toasts.
9. **For everyone, in every language.** RTL is not a later mode: logical properties, mirrored
   directional icons (`lab-dir-flip`), check every screen in Arabic. Native elements, real labels,
   visible keyboard focus (the hugging `--lab-focus-ring-*` ring; fields tint their own edge), focus
   that returns. Don't lighten text or borders below the tokens.
10. **Configure, don't override.** Change the look only through `ThemeConfig` and tokens. Lay kit
    components out freely (position, gaps); never repaint them (color, radius, height, shadow). If the
    kit can't do something, extend the kit instead of hand-rolling a one-off. Inside an inset surface
    (segmented control, dock, a glass group of buttons) controls sit no farther apart than the inset
    around them: a 4px inset means a 4px gap.

## Choosing components (short)

| Need | Use | Not |
|---|---|---|
| The one main action | `Button variant="filled"` | two filled buttons side by side |
| Icon-only action | `IconButton` with `aria-label` | an unlabeled icon in a `<div>` |
| Navigate with button looks | `Button asChild` + your router link | `onClick={() => navigate()}` on a button |
| Switch views or modes (2–5), or filter a list by status (counts as `badge`; many take `overflow="scroll"`) | `SegmentedControl`, in a glass bubble when it floats, on a plain box in content; it folds into a menu when its row runs out of room | tabs drawn from buttons |
| Pick one of a few, all visible | `RadioGroup` | a select with 3 options |
| Pick one of many | `Select` | a long radio list |
| Independent on/off in a form | `Checkbox` | a switch that only applies on Save |
| Setting that applies immediately | `SlideSwitch` | a checkbox plus a Save button |
| Text | `TextField` (`hint`) | a label stacked above an input |
| Numbers people tweak | `NumberField` (drag, type `1250*3`) | a plain text input for a price |
| Bounded continuous value | `Slider` | a number field for 0–100% when feel matters |
| Dates and times | `DateField`, `DateRangeField`… | free text dates |
| A decision that blocks the task ("Delete order?") | `Alert` (title, message, 2–3 actions; cancel + destructive) | a popover, or a Modal with hand-made buttons |
| A short form that blocks the task (edit an address) | `Modal` (floating title + close, actions in a `PresentationDock`) | a full-width painted header and footer |
| Details of the thing the page is about, with the page still in view | `Pane` (beside the page; a bottom sheet below 720 automatically) | a modal that hides the page |
| A short task about the page on a phone (filters, contact, quick edit) | `Sheet` (detents, `fit` for short forms; dialog when wide) | a new page that loses the person's place |
| Going deeper and coming back | `NavigationStack` + `NavigationPage` | swapping content with no back or swipe |
| Many items from one list | `SplitView` (stack on phones) | a modal per item |
| Rows that open, choose or show values | `ListSection` + `ListRow` | hand-made `<div>` rows |
| Sidebar destinations | `NavigationItem` (a regular-height button; icon and count in square slots) | list rows or hand-made links |
| An icon, count or chevron at the start or end of your own row or button | `SquareSlot` | a hand-sized icon box |
| Things that move because of the person | `LayoutGroup` (`data-lab-layout-id`) | teleporting cards |
| 2–5 top-level places on a phone | `TabView` (each tab its own stack) | a segmented control as app navigation |
| Quick per-row actions | `ListRow` `leadingActions`/`trailingActions` (also offered elsewhere) | swipe as the only way |
| Person-defined order | `ListSection onReorder` | up/down buttons on every row |
| Browsing a few items sideways | `Carousel` | auto-advancing slides |
| One component, any pane width | `AdaptiveStack`, `ViewThatFits`, `useSizeClass` | window media queries in components |
| Commands or choices behind a button | `MenuSurface` (a thick glass shape born out of the button's glass, merging back into it) | a popover with a column of buttons |
| Light, anchored, dismissable extra | `PopoverSurface` | a modal for a color picker |
| Task actions for the whole view | `Dock` (+ `ActionsBar`) | buttons scattered through content |
| Fresh data in a list people keep open | `ScrollArea onRefresh` (pull) + a Refresh button on the same `RefreshController` | pull as the only way to reload |
| Problem the user must act on | inline error or in-page notice with the next step | a toast that disappears |

## Layout recipe

One spacing rhythm: the shell gap **G** (`--lab-shell-gap`, 8px, `metrics.shellGap`) between every
chrome neighbour: window ↔ top bar ↔ panel ↔ sidebar items, toolbar groups (`--lab-toolbar-gap`), a
floating bar and its panel's sides (`--lab-toolbar-inset`), a `ScrollArea`'s floats and content and
its edges. Inside cards (list sections, dialog bodies) it's 16. Change G once in the theme; set
`toolbarGap`/`toolbarInset` only to break one away from it.

```
Provider (theme once)
└─ Scaffold
   ├─ side: ScaffoldSide → brand + toggle, ToolbarSearch filter, NavigationItem…, account/appearance at the bottom
   ├─ appBar: ScaffoldAppBar → bubbles: [nav/identity] [title] … [views] [tools] [page actions]
   ├─ children: page content on opaque surfaces (scrolls in the scaffold's ScrollArea)
   └─ bottom: Dock → task actions (and page views on phones)
```

Drill-down areas swap the scaffold's scroll area for a container (`renderViewport`):

```
Scaffold renderViewport
└─ SplitView                        (wide: list | detail · phones: one stack)
   ├─ list:   NavigationPage → ListSection → ListRow selected…
   └─ detail: NavigationPage (bar: back · title · actions, bottom: Dock) → deeper pages push
Sheet over any of it                (filters, contact, quick edits; recedes the scaffold)
Pane beside it                      (an inspector; becomes the Sheet on phones)
```

Presentation surfaces share three parts (`@feeef.dev/ui/presentation`): `PresentationHeader`
(title bubble, trailing bubbles, close bubble, all glass), `PresentationBody` (a ScrollArea that
hugs its content up to the room it has, or fills it) and `PresentationDock` (the actions). Alert,
Modal, Pane and Sheet are built from them; Flutter shows them from events with `showAlert`,
`showModal`, `showPane` and `showSheet`, which complete with the value passed to `Navigator.pop`.

## Physics

Direct manipulation follows the finger 1:1, releases with its velocity (`getVelocity(event time)`),
decides by momentum projection (`projectMomentum`), rubber-bands at limits and settles on springs
(`SPRINGS`: smooth for layout, snappy for small changes, release after drags). Only transform and
opacity animate; layout switches once at rest. Gestures never replace a visible control.

## Before shipping a screen

- One filled action; destructive actions confirm; nothing important only on hover.
- No hand-made bars, spacers, paddings for floats, or repainted kit components.
- Chrome gaps come from G (`--lab-shell-gap`), never a literal 12/16/24.
- Every field has a `hint`; every error says how to fix it; every icon button has a name.
- Checked in light, dark, Arabic (RTL), a 360px phone and the app's density.
- An app that lives in a frame (a preview, an embed) is wrapped in `FloatingBoundary`, so menus and
  popovers never leave it.
- Empty, loading and error states each offer a next step.
- Keyboard: Tab order follows the reading order, focus is visible and returns after dialogs.

Menus are glass container shapes (`GlassContainer material="menu"` / `GlassKind.menu`): thicker
than toolbar glass so their text reads over anything, with the container's hairline, moving light
and lens. A menu is born out of its button's glass and merges back into it; a button with no glass
(plain, in content) gives a small droplet at its centre instead, so no glass copy of it pops in.
Never paint your own menu glass or morph: give the bubble an `origin`.

Flutter compact glass (shorter side up to 72px) has one rim on its outer silhouette.
Do not stack a dark exterior hairline or an inset border on toolbar bubbles. Large
panels retain their hairline and solid/high-contrast surfaces retain their outline.
The native refraction shader and painted clip must share the clamped continuous-corner
distance, including its fade to circular capsules, so the material has one silhouette.

Flutter ToolbarGroup opts into a single reflective rim at every width and orientation.
A wide label in a vertical rail must not add the exterior panel hairline; the shared
GlassGroup singleRim flag follows that member through merges and motion.
