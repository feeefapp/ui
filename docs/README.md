# Feeef UI docs

The documentation site for `@feeef.dev/ui`. It imports the kit from `../src` exactly like an app
does (`@feeef.dev/ui/primitives/button`), so every demo and API table always matches the source.
The site is not part of the npm package.

```bash
npm run docs            # dev server on http://localhost:4180
npm run docs:typecheck  # types for docs + examples
npm run docs:build      # static site in docs/dist (SPA: serve index.html for unknown paths)
```

## Layout

```
docs/
  content/
    get-started/<id>/page.tsx
    foundations/<id>/page.tsx
    components/<id>/page.tsx
    components/<id>/examples/NN-name.tsx
  src/          site shell and building blocks (blocks/*)
  plugins/api.ts  generates the API tables from TypeScript (virtual:feeef-api)
```

Pages are discovered automatically. Navigation order comes from `section`, `group` (components) and
`order`.

## The site is built with the kit

The docs shell is a normal Feeef workspace, so it doubles as the kit's largest integration test:
`Scaffold` (sidebar modes, compact drawer, content `ScrollArea`), a filterable documentation tree with compact `NavigationItem` links in rail mode, a floating `ScaffoldAppBar` with
`ToolbarGroup`s and a `SegmentedControl` for Overview / Examples / API, `Modal` search,
`PopoverSurface` customize panel, `ThemeSwitch`. The small blocks follow the same rules: code
boxes are opaque surfaces whose tools float in `ToolbarGroup` glass bubbles over a `ScrollArea`
(washes, in-box scrolling); example and playground actions sit in glass groups; every surface uses
the kit's `--lab-radius-*` tokens and superellipse corners (`src/styles/materials.css`). Docs CSS
only adds prose, tables and example stages. If the shell needs something the kit can't do, fix or extend the kit
rather than hand-rolling it here.

## Writing a component page

Copy `content/components/button/`. A page is `definePage({...})`:

- `id`, `title`, `group` (one of `GROUPS` in `src/model.ts`), `order`, `summary` (one sentence).
- `importLine`: the exact import a developer copies. Use the module path, not the package root.
- `source`: the kit file, for the "View source" link.
- `api`: component names whose props the API tab lists. Names are the exported components.
- `Overview`: start with a `<Playground>` when the component has meaningful knobs, then
  `Section`s: when to use it, the main options, `DoDont` guidelines, and Accessibility (`Keys`).
- `examples`: always the two `import.meta.glob` lines from the Button page.
- `Preview`: a tiny static render for the components index card (no state, fits 128px tall).

### Examples

One file per example, named `NN-kebab-name.tsx`. The default export is the demo; `meta` gives the
title and a one-sentence description. The file's source is shown verbatim (minus `meta`), so write it
the way an app developer would: imports from `@feeef.dev/ui/...`, no docs internals, realistic labels,
local state when the demo is interactive. Use `demo-row`, `demo-column` and `demo-wide` for layout.

### Prop descriptions

The API tab reads JSDoc from the kit source. A prop without a `/** … */` comment shows an empty
description, so document props in `src/` (one short sentence: what it does, its unit or values).
Comments only; never change behavior from a docs change.

### Style

Sentence case, plain words, short paragraphs. Say what to use and when. Describe the current API,
not its history.
