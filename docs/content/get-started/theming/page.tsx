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
              <>Control and row heights, padding, spacing steps, sidebar widths, field text size. Thin is for very dense tools (28px controls). Touch keeps 44px targets. See <Link to="/foundations/sizing">Sizing and density</Link>.</>,
            ],
            [
              <C>radius</C>,
              <>A number: <C>1</C> default, <C>0</C> square, clamped to 0–1.5</>,
              <>Every corner, through <C>--lab-radius-scale</C>. See <Link to="/foundations/shape">Shape and corners</Link>.</>,
            ],
            [
              <C>glass</C>,
              <><C>liquid</C> (default), <C>frosted</C> or <C>solid</C></>,
              <>Floating chrome. Liquid glass merges, lights up toward the pointer and responds to presses; frosted keeps the blur and the morphs with a still light; solid paints opaque surfaces, for dense tools. See <Link to="/components/glass-container">Glass container</Link>.</>,
            ],
            [
              <C>glassRenderer</C>,
              <><C>fill</C> (default), <C>css</C> or <C>canvas</C></>,
              <>How much work glass does on the web. Fill paints a filled glass colour with light and shadow but no backdrop blur, the cheapest. CSS adds the blur. Canvas also bends the content behind the glass at its edges, with displacement maps built whenever the glass settles: heavier, Chromium only (other browsers keep CSS), off with reduced transparency or increased contrast.</>,
            ],
          ]}
        />
        <p>
          Unset options fall back to <C>THEME_DEFAULTS</C>:{' '}
          <C>{"{ palette: 'lab', density: 'comfortable', radius: 1 }"}</C>. Try every combination live in
          Customize, in the top bar.
        </p>
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
            <C>themeAttributes(theme)</C>: <C>data-lab-palette</C>, <C>data-lab-density</C>, <C>data-lab-glass</C>, <C>data-lab-glass-renderer</C> and the{' '}
            <C>--lab-radius-scale</C> style.
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
  border-radius: calc(8px * var(--lab-radius-scale, 1));
  background: color-mix(in srgb, var(--lab-primary) 18%, var(--lab-surface));
}
.invoice a:focus-visible {
  outline: 2px solid var(--lab-focus);
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
  summary: 'Choose a palette, density and radius, support light and dark mode, and theme server-rendered pages.',
  keywords: ['theme', 'ThemeConfig', 'palette', 'mono', 'density', 'radius', 'dark mode', 'ssr', 'next.js', 'inertia', 'themeAttributes'],
  Overview,
})
