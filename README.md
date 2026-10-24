# @feeef.dev/ui

The Feeef UI kit: tokens, light/dark theme, workspace scaffold, floating glass chrome and
controls shared by every Feeef web app. Live reference: <https://lab.feeef.org/ui>.

Used by:

- Feeef Lab (`feeef.all/backend`, Inertia + React)
- Feeef Cloud console (`cod_pilot_clone/cloud/apps/console`, Next.js)

Product features (Lab voice/image/chat/billing, console resources) stay in their apps and are
built from these pieces.

## Install

Private repo, installed as a git dependency pinned to a tag:

```bash
npm install github:feeefapp/ui#v0.2.0
```

The installing machine (and CI / Docker builds) needs read access to `feeefapp/ui` — an SSH key
or a token in the git URL (`git+https://<token>@github.com/feeefapp/ui.git#v0.2.0`).

Peer dependencies: `react`, `react-dom` (19), `lucide-react`, `intl-messageformat` and the Radix
`dropdown-menu`, `popover`, `select`, `slot`, `tooltip` packages.

## Use

```tsx
import { Provider, Button, TextField } from '@feeef.dev/ui'
// Deep imports for everything else, same layout as src/:
import { Scaffold } from '@feeef.dev/ui/workspace/scaffold'
import { Dock } from '@feeef.dev/ui/dock'
import '@feeef.dev/ui/workspace.css'

export function App({ locale, translations, url, children }) {
  return (
    <Provider
      i18n={{ locale, translations, url, navigate: (to) => router.visit(to) }}
      services={{ navigate: (to) => router.visit(to) }}
    >
      {children}
    </Provider>
  )
}
```

`Provider` composes services → i18n → theme → scaffold and loads the brand fonts.

- **i18n**: the host owns `locale`, `dir`, `availableLocales` and a flat `translations` map
  (`{ "lab.common.close": "…" }`, ICU messages). The kit ships English/Arabic/French defaults
  for its own strings (`UI_MESSAGES`); host translations override them. A language change
  calls `navigate(url + '?hl=<code>')` so the host can persist it. `url` defaults to
  `window.location`.
- **services**: `navigate`, `preferences` (storage), `copyText`, `readClipboard`,
  `downloadText`. Browser defaults; inject your own for routers, tests or embedded hosts.
- Modules that use hooks start with `'use client'`, so they work from Next.js server components.
- Every component imports its own CSS; the host bundler (Vite, Next.js) loads it.

## Theme config

Each app picks its look once and passes it down; components never branch on it.

```tsx
import type { ThemeConfig } from '@feeef.dev/ui/theme-config'

export const theme: ThemeConfig = { palette: 'mono', density: 'compact', radius: 0.35 }

<Provider theme={theme}>…</Provider>
// Server-rendered hosts also put it on <html> for the first paint:
<html {...themeAttributes(theme)}>
```

| Option | Values | What it drives |
|---|---|---|
| `palette` | `lab` (default, Feeef green), `mono` (black and white; only danger/warning keep a hue) | every color token in `theme-tokens.css`: surfaces, ink, primary, focus, brand logo strokes, pixel tones, `--lab-success`, `--lab-warning` |
| `glass` | `liquid` (default), `still`, `solid` | `data-lab-glass`: GlassContainer pointer light and press response (liquid only; still keeps a fixed light), opaque chrome (solid) |
| `glassTint` | number `0` clear … `1` tinted, `0.5` default | `--lab-glass-tint`: the Liquid Glass slider. 0 = measured clear glass (no veil, no shadow, brightness lift), 1 = measured regular material (veil 71–87 %), 0.5 = light veil (~40 %). Curve: `glassMaterial()` in `glass/material.ts` |
| `glassBlur` | `false` (default), `true` | `data-lab-glass-blur`: the measured backdrop blur (2.9px → 5.2px by size); off = no blur |
| `glassRefraction` | `true` (default), `false` | `data-lab-glass-refraction`: bend the backdrop at glass edges (SVG displacement map built when glass settles; Chromium only, other browsers show the same glass unbent) |
| `motion` | `full` (default), `reduced`, `none` | `data-lab-motion`: `reduced` = the reduced-motion paths (instant springs/transitions, short fades, no moving glass light or press response); `none` also stops ambient motion (pixel textures, shaders, loaders) and drops the reduced crossfades: sheets, page transitions and menus switch instantly (one helper decides the length: `motionFade(motion, seconds)`, Flutter `motionFade(motion, duration)`). The OS setting still wins when stricter; JS reads `motionOf()` / `prefersReducedMotion()` |
| `density` | `comfortable` (default, iOS 26 control sizes), `compact` (one step down), `thin` (two) | the metric tokens below, `--lab-space-1…8`, `--lab-sidebar-width`, `--lab-navigation-rail-width` (coarse pointers keep 44px hit areas: controls reach out without growing) |
| `metrics` | partial `Metrics` (px) | single sizes at every density, as inline variables: `controlHeight {small, regular, large}` (30/36/52) → `--lab-control-small/-height/-large`, `controlPadding` (10/12/20), `controlFont` (15/17/17), `fieldHeight {small, regular}` (36/44), `rowHeight` (44), `toolbarItem` (44), `toolbarGap` (= `shellGap`), `toolbarInset` (= `shellGap`), `segmentedInset` (2; the control is `controlHeight.regular` tall), `switchSize` (63×28), `thumbSize` (37×24), `sliderTrack` (6), `listRowHeight` (54), `listRadius` (26), `listInset` (16), `focusRingWidth` (2), `focusRingOffset` (1), `sidebarWidth`, `railWidth`, `shellGap` (8: the one chrome gap G; toolbar gap/inset and `ScrollArea` edge gap/content padding default to it). Flutter: `ThemeConfig(metrics: Metrics(...))` → `SizeTokens` |
| `radius` | number, `1` default, `0` square, max `1.5` | `--lab-radius-scale`, which multiplies every radius token and component radius (circles such as radios stay round) |

Profiles are plain partial configs: `PROFILES.quality` (liquid, refraction, blur, full motion),
`PROFILES.balanced` (still, no refraction or blur, full motion) and `PROFILES.performance` (solid, no
motion). Spread one and override anything: `{ ...PROFILES.balanced, palette: 'mono' }` (Flutter:
`ThemeProfiles.balanced.copyWith(palette: .mono)`). `glassCapabilities()` reports what the browser
supports (refraction, element refraction, backdrop blur).

Accessibility always wins over the glass options: `prefers-reduced-transparency` and
`prefers-contrast: more` paint glass as an opaque surface (more contrast adds an ink outline), both
turn refraction off, and `prefers-reduced-motion` stops the moving light and press response.

Keyboard focus uses three tokens, `--lab-focus-ring-width` (2px), `--lab-focus-ring-offset` (1px)
and `--lab-focus-ring-color` (the focus color at 65 %): a thin ring hugging the control plus its hover
fill, only for `:focus-visible`. Fields tint and thicken their own edge instead. Increased contrast
and forced colors force a 3px ring 2px out in the full color.

How it works: `themeAttributes()` / `applyThemeConfig()` set `data-lab-palette`,
`data-lab-density`, `--lab-radius-scale` and the `metrics` variables on `<html>`; the kit CSS reads them. To add a
palette or density, add its token block next to the existing ones (`theme-tokens.css`,
`system.css`) and extend the union in `theme-config.ts`. Kit CSS must use these tokens, never
literal colors, control sizes or radii, so every theme reaches it. App CSS should do the same
(derive from `--lab-*` tokens and `--lab-corner-scale`, the radius scale times the corner fit that browsers without `corner-shape` need; capsules use `--lab-capsule-scale` and `corner-shape: var(--lab-corner-shape-capsule)`).

## Develop

```bash
npm install
npm run typecheck
npm test            # pure logic: geometry, springs, sliders, scroll metrics, temporal, actions
npm run build       # dist/ (tsc + explicit .js specifiers + copied CSS)
npm run check       # all of the above + dist/ must match the commit
```

To try changes inside an app before releasing, pack and install the tarball (a symlink would
load a second React):

```bash
npm run build && npm pack
cd ../backend && npm install ../ui/feeef-ui-<version>.tgz
```

## Release

`dist/` is committed because consumers install from git.

```bash
npm run release -- patch      # or minor / major / x.y.z: checks, builds, commits, tags
git push --follow-tags
```

Then bump each consumer's `"@feeef.dev/ui": "github:feeefapp/ui#vX.Y.Z"` and reinstall.

## Rules

See [AGENTS.md](AGENTS.md). In short: change shared look and behaviour here, never by
copying or overriding kit files inside an app; keep platform access behind `Services`;
update the `/ui` reference in the Lab when a public primitive changes.

## Segmented controls bring no surface

`SegmentedControl` (React and Flutter) paints only its options and the moving selection pill,
which slides, can be dragged and turns into a glass lens under a press. It has no track, border
or glass of its own: put it in glass where it floats (a `ToolbarGroup`, in a `GlassScope` when
no bar provides one, or a `Dock`), on a plain box in content and forms (a `className` with
`background: var(--lab-surface-soft)`; Flutter a `DecoratedBox` with `colors.surfaceSoft` and
`SuperellipseBorder(radius: sizes.radiusControl)`), or leave it bare. It is as tall as a regular
button. **Consumers (Lab, Cloud console, …) must wrap their segmented controls when they upgrade:**
`appearance` (Flutter `appearance` / `SegmentedAppearance`) and the `segmentedHeight` metric
(`--lab-segmented-height`) are removed.

## Scaffold brand transitions

`MovingBrand` from `@feeef.dev/ui/workspace/moving-brand` keeps one visual wordmark
following the accessible logo links as `Scaffold` changes sidebar mode or opens its drawer.
Mount it under `Scaffold` and pass a `host` ref for the surrounding workspace. Mark the
sidebar link `data-tool-brand-anchor="side"` and the compact header link
`data-tool-brand-anchor="header"`; both retain their accessible names and navigation.
Anchors reserve 104 × 26 pixels for the logo; product suffixes sit outside the anchor.
The component follows reduced motion, resize and the native drawer's top layer.

The navigation rail uses `--lab-navigation-rail-width`; floating media reservations
retain `--lab-rail-width`. Keep these independent so registering floating surfaces
cannot collapse the workspace navigation rail.

## Prompt composers

`@feeef.dev/ui/composer/composer` exports `PromptComposer` and the parts it and
`ImagePromptComposer` are built from: `ComposerBar` (a round leading bubble and one
glass capsule in a `GlassBar`), `ComposerField`, `ComposerAttachments` /
`ComposerAttachment`, `ComposerSend` and `ComposerHint`. Lab Chat and Image and the
Cloud playground use them.

Use controlled `value`/`onValueChange`, `onSubmit`, an accessible `label` and a
`submitLabel`; `leading` for the + or attach bubble, `attachments` for tiles inside
the capsule, `tools` for the second row (model, settings), `actions` for one small
button beside send, `above` and `footer` around it. Empty and idle it is one line;
text, focus inside or an open menu (`data-state="open"`, `aria-expanded`,
`aria-pressed` on a trigger inside) opens the second row, and every layout change
springs on `SPRINGS.snappy` (`useComposerMotion`, pure rules in `composer-model.ts`).
Send is neutral until there is something to send; `busy` shows the loader and
`onStop` turns it into a stop button. Enter sends, Shift+Enter inserts a line, and IME
composition preserves Enter. Busy, disabled and submitDisabled gate submission.
File-drop outlines appear only with `dropActive`.

### Expanding toolbar search

`ToolbarSearch` (`@feeef.dev/ui/toolbar-search`) is the reusable toolbar search pattern.
Put adjacent filter/navigation bubbles in `children` and persistent actions in `trailing`.
The same glass host grows from its search icon into a full-width `RawInput`; never nest a
painted text field inside it. Input text is not scaled. Closing/Escape clears the query and
restores the search button's focus. Filter state remains owned by the caller. The material
morph supports interrupted reversals, logical directions, resize and reduced motion.

```tsx
<ToolbarSearch label="Search models" value={query} onValueChange={setQuery}
  trailing={<ToolbarGroup label="Close">…</ToolbarGroup>}>
  <FilterBar {...filters} />
</ToolbarSearch>
```

Search across Lab and Cloud uses `ToolbarSearch`, including list filters, catalogs, sidebar
history, and model/voice pickers. Command palettes can pass `renderInput` to retain their own
combobox registration; the shared surface still owns search interaction and geometry.
`inputRef` and `onInputKeyDown` preserve catalog focus and arrow navigation. `defaultExpanded`
is available when search is the primary task.

The morph uses the shared bounded spring integrator, retaining velocity on reversal and
retargeting on resize. Adjacent controls occupy a stable grid cell throughout the transition.
Their visibility interval never overlaps the editor's; closing text is retained until the
editor is invisible. Reduced motion snaps to the final geometry.

Speech cards are shared through `@feeef.dev/ui/speech/block`. `SpeechBlock` owns the Lab voice-page material, typing texture, one-row toolbar and accessible drag handle; hosts supply voice/actions and native editors. Use stable block keys and pass `onMove` as one state edit. `speech/block-order` preserves whole block identity and measured mixed-height slots. Pointer drag auto-scrolls the nearest ScrollArea; Up/Down reorders from the handle and Escape cancels. Lab `/voice` and `/ui` examples use this same component.

Image studios share `image/freeform-board` (pointer pan, pinch/keyboard-modified zoom, measured card fitting, versions and pending/error states) and `image/prompt-composer` (the Lab compact-to-expanded composer, references, clipboard and output settings). Hosts supply model/provider capabilities and billing actions; omit `onEnhance` when no prompt assistant is configured. `image/workspace` bounds that same canvas inside an application panel and measures floating toolbar/composer insets with 12px edges. Lab `/image` and Cloud consume these modules directly.

`model-ladder` shares the exact Lab image quality control and model ladder. Hosts supply ordered catalog/collection rungs and may use `onBrowseModels` to replace the local list with a paged advanced model/provider browser. `onOpenChange` enables fetching only when the selector is opened. No client-estimated price is required.
