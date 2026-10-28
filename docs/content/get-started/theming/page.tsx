import { ThemeSwitch, useTheme } from '@feeef.dev/ui/theme'
import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'

function ModeDemo() {
  const { mode, resolvedMode } = useTheme()
  return (
    <div className="docs-stage">
      <div className="demo-row">
        <ThemeSwitch />
        <span>
          mode <C>{mode}</C> · resolved <C>{resolvedMode}</C>
        </span>
      </div>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Lead>
        An app chooses its look once, with a small config object. Components never branch on it: the
        config becomes attributes and CSS variables on <C>{'<html>'}</C>, and the kit’s stylesheets
        read those.
      </Lead>

      <Section title="Theme config">
        <Code
          code={`import type { ThemeConfig } from '@feeef.dev/ui/theme-config'
import { Provider } from '@feeef.dev/ui/provider'

export const theme: ThemeConfig = { palette: 'lab', primary: '#2563eb', density: 'compact', radius: 0.6 }

export function Root({ children }: { children: React.ReactNode }) {
  return <Provider theme={theme}>{children}</Provider>
}`}
        />
        <Table
          head={['Option', 'Values', 'What it changes']}
          rows={[
            [
              <C>palette</C>,
              <><C>lab</C> (default, Feeef green) or <C>mono</C> (black and white)</>,
              <>Every color token. See <Link to="/foundations/color">Color</Link>.</>,
            ],
            [
              <C>primary</C>,
              <>A hex color, e.g. <C>'#2563eb'</C>. Unset: the palette’s own (green, or black in mono)</>,
              <>Primary actions, focus, brand mark, fills and pixel tints, in light and dark. With <C>lab</C> the surfaces, lines and ink are tinted toward it too; with <C>mono</C> they stay grey. Text on primary picks black or white for contrast. Invalid values are ignored.</>,
            ],
            [
              <C>density</C>,
              <><C>comfortable</C> (default), <C>compact</C> or <C>thin</C></>,
              <>Control and row heights, padding, spacing steps, sidebar widths, field text size. Comfortable is iOS's sizes (36px regular buttons); compact steps one size down, thin two (26px buttons) for very dense tools. Touch keeps 44px targets. See <Link to="/foundations/sizing">Sizing and density</Link>.</>,
            ],
            [
              <C>metrics</C>,
              <>A partial <C>Metrics</C> object: <C>{'{ controlHeight: { regular: 40 }, toolbarItem: 48 }'}</C></>,
              <>Replaces single sizes at every density: button heights, padding and label sizes, field heights, toolbar item, gap and inset, segmented control, switch and thumb, slider rail, list rows, the focus ring. Each becomes a <C>--lab-*</C> variable. See <Link to="/foundations/sizing">Sizing and density</Link>.</>,
            ],
            [
              <C>radius</C>,
              <>A number: <C>1</C> default, <C>0</C> square, clamped to 0–1.5</>,
              <>Every corner, through <C>--lab-radius-scale</C>. See <Link to="/foundations/shape">Shape and corners</Link>.</>,
            ],
            [
              <C>glass</C>,
              <><C>liquid</C> (default), <C>transparent</C> or <C>solid</C></>,
              <>Floating chrome. Liquid glass merges, lights up toward the pointer and responds to presses; still glass keeps the material and the morphs with a fixed light; solid paints opaque surfaces, for dense tools. See <Link to="/components/glass-container">Glass container</Link>.</>,
            ],
            [
              <C>glassTint</C>,
              <>A number: <C>0</C> clear … <C>1</C> tinted, <C>0.5</C> default, clamped to 0–1</>,
              <>The Liquid Glass slider: how much of the surface veils the backdrop. Clear has no veil; tinted is iOS 27's regular material; the default is halfway (a 26 % veil in light). Sets <C>--lab-glass-tint</C>. Bars floating over scrolling content (a scroll area's app bar and dock, the tab bar) stay at least <C>0.85</C> tinted and always blurred, as iOS bars are, so their labels read over moving content (<C>GlassBar</C>, <C>GLASS_BAR_TINT</C>).</>,
            ],
            [
              <C>glassBlur</C>,
              <><C>false</C> (default) or <C>true</C></>,
              <>The measured backdrop blur (2.9px on controls → 5.2px on panels). Off, what is behind the glass stays sharp.</>,
            ],
            [
              <C>glassRefraction</C>,
              <><C>true</C> (default) or <C>false</C></>,
              <>Bends the backdrop at the glass edges, built when the glass settles. Chromium only; Firefox and Safari (and reduced transparency or increased contrast) show the same glass without the bend.</>,
            ],
            [
              <C>motion</C>,
              <><C>full</C> (default), <C>reduced</C> or <C>none</C></>,
              <>How much the kit animates. <C>reduced</C> is the reduced-motion behaviour (springs jump, transitions become instant or short fades, no moving glass light or press response); <C>none</C> also stops ambient motion (pixel textures, shaders, loaders, glass sampling). The reader's reduced-motion setting still applies when stricter. Sets <C>data-lab-motion</C>; code reads it with <C>motionOf()</C> / <C>prefersReducedMotion()</C>.</>,
            ],
            [
              <C>performance</C>,
              <><C>auto</C> (default), <C>full</C>, <C>balanced</C> or <C>light</C></>,
              <>How much the effects may cost. <C>light</C> keeps the glass look (tint, rim, shadow) but filters nothing behind it (no backdrop blur or refraction), and bubbles never merge. <C>auto</C> keeps the full look and steps down to <C>light</C> on weak devices (2 GB of memory or less, 2 cores or fewer, no hardware GPU) and on devices whose frames measure slow after a tap or key (remembered for 14 days; <C>measuredPerformance.forget()</C> clears it). Resolved in the browser; sets <C>data-lab-performance</C>, and code reads it with <C>usePerformanceTier()</C>.</>,
            ],
          ]}
        />
        <p>
          Unset options fall back to <C>THEME_DEFAULTS</C>:{' '}
          <C>{"{ palette: 'lab', density: 'comfortable', radius: 1, glass: 'liquid', glassTint: 0.5, glassBlur: false, glassRefraction: true, motion: 'full', performance: 'auto' }"}</C>. Try every combination live in
          Customize, in the top bar.
        </p>
      </Section>

      <Section title="Profiles">
        <p>
          Three ready-made looks, as plain partial configs. Spread one and override anything; the kit
          still checks what the browser or device supports, so one profile works everywhere. No
          profile (the default) is <C>THEME_DEFAULTS</C>.
        </p>
        <Table
          head={['Profile', 'glass', 'glassRefraction', 'glassBlur', 'motion']}
          rows={[
            [<C>quality</C>, <C>liquid</C>, <C>true</C>, <C>true</C>, <C>full</C>],
            [<C>balanced</C>, <C>transparent</C>, <C>false</C>, <C>false</C>, <C>full</C>],
            [<C>performance</C>, <C>solid</C>, <C>false</C>, <C>false</C>, <C>none</C>],
          ]}
        />
        <Code
          code={`import { PROFILES, type ThemeConfig } from '@feeef.dev/ui/theme-config'
import { glassCapabilities } from '@feeef.dev/ui/glass'

export const theme: ThemeConfig = { ...PROFILES.balanced, palette: 'mono' }

console.log(glassCapabilities()) // { refraction, elementRefraction, backdropBlur } in this browser`}
        />
        <Code
          lang="dart"
          title="Flutter"
          code={`final theme = ThemeProfiles.balanced.copyWith(palette: .mono);

print(glassCapabilities()); // (backdropBlur: true, refraction: <Impeller shader filters>)`}
        />
      </Section>

      <Section title="Metrics">
        <p>
          Density picks a whole set of sizes. When an app needs one size different, set it in{' '}
          <C>metrics</C> instead of overriding CSS: the value replaces that token at every density and
          everything built on it (capsule radii, toolbar controls, the thin slider's thumb) follows.
          Values are pixels; leave the rest unset.
        </p>
        <Code
          code={`export const theme: ThemeConfig = {
  density: 'comfortable',
  metrics: {
    controlHeight: { regular: 40 },     // --lab-control-height: 40px
    toolbarItem: 48,                    // --lab-toolbar-item: 48px (controls inside 42px)
    listRowHeight: 48,                  // --lab-list-row-height: 48px
    focusRingWidth: 3,                  // --lab-focus-ring-width: 3px
  },
}`}
        />
        <Code
          lang="dart"
          title="Flutter"
          code={`const theme = ThemeConfig(
  density: .comfortable,
  metrics: Metrics(
    controlHeight: MetricScale(regular: 40),
    toolbarItem: 48,
    listRowHeight: 48,
    focusRingWidth: 3,
  ),
);
// SizeTokens.of(theme).controlHeight == 40`}
        />
        <Table
          head={['Metric', 'Default (comfortable)', 'CSS variable']}
          rows={[
            [<C>controlHeight</C>, 'small 30 · regular 36 · large 52', <><C>--lab-control-small</C>, <C>--lab-control-height</C>, <C>--lab-control-large</C></>],
            [<C>controlPadding</C>, '10 · 12 · 20', <C>--lab-control-padding(-small|-large)</C>],
            [<C>controlFont</C>, '15 · 17 · 17', <C>--lab-control-font(-small|-large)</C>],
            [<C>fieldHeight</C>, 'small 36 · regular 44', <><C>--lab-field-height-small</C>, <C>--lab-field-height</C></>],
            [<C>rowHeight</C>, '44', <C>--lab-row-height</C>],
            [<C>toolbarItem</C>, '44', <C>--lab-toolbar-item</C>],
            [<C>toolbarGap</C>, 'shellGap (8)', <C>--lab-toolbar-gap</C>],
            [<C>toolbarInset</C>, 'shellGap (8)', <C>--lab-toolbar-inset</C>],
            [<C>segmentedInset</C>, '2', <C>--lab-segmented-inset</C>],
            [<C>switchSize</C>, '63 × 28', <><C>--lab-switch-width</C>, <C>--lab-switch-height</C></>],
            [<C>thumbSize</C>, '37 × 24', <><C>--lab-thumb-width</C>, <C>--lab-thumb-height</C></>],
            [<C>sliderTrack</C>, '6', <C>--lab-slider-track</C>],
            [<C>listRowHeight</C>, '54', <C>--lab-list-row-height</C>],
            [<C>listRadius</C>, '26 (× radius)', <C>--lab-list-corner</C>],
            [<C>listInset</C>, '16', <C>--lab-list-inset</C>],
            [<C>focusRingWidth</C>, '2', <C>--lab-focus-ring-width</C>],
            [<C>focusRingOffset</C>, '1', <C>--lab-focus-ring-offset</C>],
            [<C>sidebarWidth</C>, '304', <C>--lab-sidebar-width</C>],
            [<C>railWidth</C>, '64', <C>--lab-navigation-rail-width</C>],
            [<C>shellGap</C>, '8: every chrome gap (G), see Sizing', <C>--lab-shell-gap</C>],
          ]}
        />
      </Section>

      <Section title="Light, dark and system">
        <p>
          Color mode is separate from the config because the reader chooses it, not the app.{' '}
          <C>Provider</C> starts in <C>initialTheme</C> (default <C>system</C>, which follows the OS
          and updates when it changes) and remembers the reader’s choice in the <C>preferences</C>{' '}
          service under <C>feeef-lab-theme</C>.
        </p>
        <ModeDemo />
        <p>
          <C>ThemeSwitch</C> is a ready-made icon button that cycles system → light → dark. For your
          own control, use <C>useTheme()</C>:
        </p>
        <Code
          code={`import { useTheme } from '@feeef.dev/ui/theme'
import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'

function DarkModeToggle() {
  const { resolvedMode, setMode } = useTheme()
  return (
    <SlideSwitch
      label="Dark mode"
      checked={resolvedMode === 'dark'}
      onCheckedChange={(dark) => setMode(dark ? 'dark' : 'light')}
    />
  )
}`}
        />
        <Table
          head={['Field', 'Type', 'Meaning']}
          rows={[
            [<C>mode</C>, <C>{"'system' | 'light' | 'dark'"}</C>, 'What the reader picked.'],
            [<C>resolvedMode</C>, <C>{"'light' | 'dark'"}</C>, 'What is painted now.'],
            [<C>setMode</C>, <C>{'(mode) => void'}</C>, 'Changes and stores the mode.'],
          ]}
        />
      </Section>

      <Section title="Server rendering">
        <p>
          On the client the provider writes everything in a layout effect. A server-rendered page needs
          the same attributes in its HTML so the first paint is already right. Two things go on{' '}
          <C>{'<html>'}</C>:
        </p>
        <ul>
          <li>
            <C>themeAttributes(theme)</C>: <C>data-lab-palette</C>, <C>data-lab-density</C>, <C>data-lab-glass</C>, <C>data-lab-glass-blur</C>,{' '}
            <C>data-lab-glass-refraction</C> and the <C>--lab-radius-scale</C> and <C>--lab-glass-tint</C> styles, plus one
            style variable per set <C>metrics</C> value.
          </li>
          <li>
            <C>data-lab-theme</C>: the color mode. Every color token hangs off this attribute, so set it
            with a tiny inline script before the stylesheet paints.
          </li>
        </ul>
        <Code
          title="app/layout.tsx (Next.js)"
          code={`import { themeAttributes } from '@feeef.dev/ui/theme-config'
import { theme } from './theme'
import { Providers } from './providers' // 'use client' wrapper around Provider

const THEME_BOOT = \`(function(){try{var s=localStorage.getItem('feeef-lab-theme')||'system';
var d=s==='dark'||(s==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.setAttribute('data-lab-theme',d?'dark':'light')}
catch(e){document.documentElement.setAttribute('data-lab-theme','light')}})()\`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...themeAttributes(theme)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="lab-app">
        <Providers theme={theme}>{children}</Providers>
      </body>
    </html>
  )
}`}
        />
        <p>
          With Inertia (or any server template), the root view writes the same attributes. Render them
          from the same config so server and client agree:
        </p>
        <Code
          lang="html"
          title="resources/views/inertia_layout.edge"
          code={`<html lang="{{ locale }}" dir="{{ dir }}"
      data-lab-palette="lab" data-lab-density="comfortable"
      style="--lab-radius-scale: 1">
  <head>
    <script>/* the same THEME_BOOT snippet */</script>
    @vite(['inertia/app/app.tsx'])
    @inertiaHead()
  </head>
  <body class="lab-app">@inertia()</body>
</html>`}
        />
        <Callout title="Why suppressHydrationWarning">
          <p>
            The boot script sets <C>data-lab-theme</C> before React hydrates, so the server and client
            attributes differ on purpose. If your theme comes from a cookie instead of{' '}
            <C>localStorage</C>, render <C>data-lab-theme</C> on the server and skip the script. Supply a
            matching <C>preferences</C> service so the provider stores the choice there too (see{' '}
            <Link to="/get-started/services">Services</Link>).
          </p>
        </Callout>
      </Section>

      <Section title="Applying a config outside React">
        <p>
          <C>applyThemeConfig(element, config)</C> sets the same attributes imperatively. The provider
          calls it on <C>document.documentElement</C>; use it yourself for a preview iframe or a
          standalone widget.
        </p>
        <Code
          code={`import { applyThemeConfig } from '@feeef.dev/ui/theme-config'

applyThemeConfig(previewFrame.contentDocument!.documentElement, {
  palette: 'mono',
  radius: 0.5,
})`}
        />
      </Section>

      <Section title="Theme in your app CSS">
        <p>
          A theme only reaches your own screens if your CSS reads the same tokens. Use color tokens,
          the size tokens and radius tokens, and multiply any one-off radius by{' '}
          <C>--lab-radius-scale</C>:
        </p>
        <Code
          lang="css"
          code={`.invoice {
  padding: var(--lab-space-4);
  border: 1px solid var(--lab-line);
  border-radius: var(--lab-radius-panel);
  corner-shape: superellipse(1.5);
  background: var(--lab-surface);
  color: var(--lab-ink);
}
.invoice-total {
  min-height: var(--lab-row-height);
  color: var(--lab-muted);
}
.invoice-badge {
  border-radius: calc(8px * var(--lab-corner-scale, 1));
  background: color-mix(in srgb, var(--lab-primary) 18%, var(--lab-surface));
}
.invoice a:focus-visible {
  outline: var(--lab-focus-ring-width) solid var(--lab-focus-ring-color);
  outline-offset: var(--lab-focus-ring-offset);
}`}
        />
        <DoDont
          doItems={[
            'Pick the look once in a shared theme file and pass it everywhere it is needed.',
            <>Read <C>--lab-*</C> tokens in every stylesheet you write.</>,
            'Check light, dark, mono and compact before shipping a screen.',
          ]}
          dontItems={[
            'Write literal colors, control heights or radii.',
            <>Branch on palette or density in components; let CSS read <C>data-lab-*</C>.</>,
            'Override kit classes to restyle a component; change the config instead.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'get-started',
  id: 'theming',
  title: 'Theming',
  order: 2,
  summary: 'Choose a palette, density, radius and metrics, support light and dark mode, and theme server-rendered pages.',
  keywords: ['theme', 'ThemeConfig', 'palette', 'mono', 'density', 'radius', 'metrics', 'Metrics', 'control height', 'dark mode', 'ssr', 'next.js', 'inertia', 'themeAttributes'],
  Overview,
})
