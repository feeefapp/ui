import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, Lead, Section, Table } from '../../../src/blocks/prose'

function Overview() {
  return (
    <>
      <Lead>
        <C>feeef_ui</C> is the Flutter twin of the kit: the same component names, props, tokens and
        geometry, so an example copied in React or in Dart renders the same screen. Every example in
        these docs has both; pick Flutter in an example’s code switch.
      </Lead>

      <Section title="Install">
        <p>
          The package lives in the kit’s repository, in <C>flutter/</C>. Depend on it from git, pinned to
          the same tag as the web kit, so both sides of an app move together.
        </p>
        <Code
          lang="yaml"
          title="pubspec.yaml"
          code={`dependencies:
  feeef_ui:
    git:
      url: git@github.com:feeefapp/ui.git
      path: flutter
      ref: vX.Y.Z # the web kit's version`}
        />
        <p>
          It is built on <C>package:flutter/widgets.dart</C> only. It works inside a <C>MaterialApp</C>,
          but doesn’t need one.
        </p>
      </Section>

      <Section title="Set up">
        <p>
          The React <C>Provider</C> becomes two widgets: <C>ThemeProvider</C> (palette, density, radius,
          glass) and <C>I18nProvider</C> (locale and the kit’s strings). Direction follows the locale.
        </p>
        <Code
          lang="dart"
          code={`import 'package:feeef_ui/feeef_ui.dart' as ui;
import 'package:flutter/widgets.dart';

void main() => runApp(
  WidgetsApp(
    color: const Color(0xFF72CE5D),
    builder: (context, _) => ui.I18nProvider(
      locale: 'ar',
      child: ui.ThemeProvider(
        config: const ui.ThemeConfig(palette: .lab, density: .comfortable),
        child: const OrdersScreen(),
      ),
    ),
  ),
);`}
        />
        <p>
          Names such as <C>Button</C>, <C>Tab</C> and <C>RadioGroup</C> are generic. Prefix the
          import (<C>as ui</C>) when the app also imports Material, or hide the few clashes from{' '}
          <C>widgets.dart</C>: <C>hide Action, RadioGroup, Tab, Tooltip</C>.
        </p>
      </Section>

      <Section title="How the APIs map">
        <Table
          head={['React', 'Flutter']}
          rows={[
            ['Children, labels, icons', <>Widgets: <C>children: [Text('Save')]</C>, <C>LucideIcon(LucideIcons.plus)</C></>],
            [<C>variant="filled"</C>, <><C>variant: .filled</C> (enums, dot shorthand)</>],
            [<C>aria-label</C>, <><C>ariaLabel</C>; semantics are built in</>],
            [<C>{'<form>'}</C>, <><C>FieldForm</C>: validates, focuses the first error, returns named values</>],
            [<><C>useServices()</C> (clipboard, files)</>, <>Callbacks the host passes, such as <C>pickFiles</C> and <C>readClipboard</C></>],
            [<><C>Button asChild</C> with a link</>, <>A <C>Button</C> wrapped in <C>Semantics(link: true)</C> that calls your router</>],
            [<><C>className</C>, <C>style</C></>, <>Not ported: change the look through <C>ThemeConfig</C> and tokens, like on the web</>],
          ]}
        />
      </Section>

      <Section title="How close it is">
        <p>
          The kit checks itself. Colour tokens, corner geometry, glass outlines, springs, list and
          action layouts, temporal and number parsing are tested against vectors generated from the
          TypeScript. Every docs example is rendered by both kits in Chrome and diffed pixel by pixel,
          in light, dark, mono, compact and right to left. Most examples differ by under 1% of their
          pixels, almost all of it glyph rasterization (Skia and the browser draw text slightly
          differently).
        </p>
        <Callout tone="note" title="What Flutter does differently">
          <p>
            Glass can’t refract what is behind it yet, and adaptive tint follows a{' '}
            <C>GlassBackdrop</C> you mark instead of sampling the page. Corners are always the true
            superellipse, even where a browser falls back to circles.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'get-started',
  id: 'flutter',
  title: 'Flutter',
  order: 6,
  summary: 'The Dart twin of the kit: install, set up, and how React props map to Flutter.',
  keywords: ['Flutter', 'Dart', 'feeef_ui', 'pubspec', 'ThemeProvider', 'I18nProvider', 'FieldForm'],
  Overview,
})
