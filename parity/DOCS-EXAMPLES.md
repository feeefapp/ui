# Dart siblings for docs examples

Every docs example `docs/content/<section>/<page>/examples/NN-name.tsx` can have a Flutter twin
`NN-name.dart` next to it. The docs show a React | Flutter switch for it, and the parity harness
renders both and diffs the pixels. Goal: copy either snippet into an app and get the same screen.

## Writing one
- One file, one public widget class named exactly like the TSX default export (`Variants`,
  `WithIcons`). `const` constructor with `{super.key}`. Private helpers (`_Row`, `_Card`) are fine.
- Imports: `package:feeef_ui/feeef_ui.dart` and `package:flutter/widgets.dart` (add `hide …`
  for clashes: `RadioGroup`, `Action`, `Tab`, `Scaffold`, `Tooltip`, `VelocityTracker`), plus
  `dart:async` etc. as needed. No Material, no extra packages.
- Same content, same strings, same state behaviour (StatefulWidget for `useState`, cancel timers in
  `dispose`). Use dot shorthands (`variant: .filled`) like the Button examples.
- Layout helpers from `docs/src/styles/docs.css`:
  `.demo-row` = `Wrap(spacing: 12, runSpacing: 12, alignment: WrapAlignment.center,
  crossAxisAlignment: WrapCrossAlignment.center)`; `.demo-column` = a `SizedBox(width: 360)`
  `Column(crossAxisAlignment: stretch, spacing: 16)`; `.demo-wide` = `SizedBox(width: 560)`.
  The stage is 720px wide, padding 40/24, children centred, text 15px / 1.6.
- Page demo CSS (`<page>/*-demo.css`) is part of the example: reproduce it in the Dart file with
  plain widgets (Container, DecoratedBox, Padding, Text styles from `ThemeProvider.of(context)`
  colors/sizes). Never hardcode a colour the CSS takes from a token; use the token.
- In buttons, don't pass `size:` to `LucideIcon` (the button sets 18px / 20px like the CSS does).
- Reference: `docs/content/components/button/examples/*.dart`.

## Checking one
    parity/docs-check.sh components/<page>[,components/<page2>] [grep-filter]
builds both sides for those pages only (the shared gallery build runs under a lock, so parallel
runs are safe) and prints the diff per example × variant (light, dark, mono, compact, rtl).
Captures: `parity/runs/<pages>/out/<case>-{react,flutter,diff}.png`. Look at them (stack react
over flutter with Pillow) — numbers alone hide layout mistakes. Aim below ~1%; text-heavy
examples sit around 1–2% from glyph rasterization (CoreText vs Skia), which is fine.
Also run `cd flutter/example && flutter analyze lib` (it analyzes the synced examples).

Flutter is at `/Users/mohamad/dev/flutter/bin` (put it on PATH).
