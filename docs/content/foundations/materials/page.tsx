import { Bold, Italic, Underline } from 'lucide-react'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { PixelTexture } from '@feeef.dev/ui/pixel-art'
import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'
import { block, SCAFFOLD, SELECTORS, SYSTEM } from '../_lib/css-tokens'
import { Tok } from '../_lib/live'
import '../_lib/foundations.css'

const ROLES: Record<string, string> = {
  '--lab-glass-tint': 'ThemeConfig glassTint: 0 clear … 1 tinted (0.5 by default).',
  '--lab-glass-fill': 'Veil over control-sized glass: the surface at tint × --lab-glass-veil (43.5% by default in light).',
  '--lab-glass-fill-large': 'Veil over panel-sized glass: tint × --lab-glass-veil-large.',
  '--lab-glass-saturate': 'Backdrop saturation, derived from the tint so the colour kept stays on the measured curve.',
  '--lab-glass-lift': 'Clear glass brightness lift (1.03 · x + 0.076), fading out toward tinted.',
  '--lab-glass-blur': 'Backdrop blur: 0 unless ThemeConfig glassBlur is on (then 2.9px → 5.2px by size).',
  '--lab-glass-edge-light': 'Bright end of the diagonal rim highlight.',
  '--lab-glass-edge-low': 'Quiet end of the rim and the inner top highlight.',
  '--lab-glass-shadow': 'Soft neutral drop shadow under floating groups.',
  '--lab-glass-light': 'Inset top light and bottom shade.',
  '--lab-glass-radius': 'Corner of a glass group; components override it locally.',
  '--lab-control-highlight': 'Top highlight on raised controls.',
  '--lab-control-depth': 'Small shadow under raised controls.',
  '--lab-control-raised-shadow': 'Highlight + depth, for elevated controls.',
}

const light = block(SYSTEM, SELECTORS.base)
const dark = block(SYSTEM, SELECTORS.dark)
const glassGroup = block(SCAFFOLD, '.lab-glass-group')
const rows = [
  ...[...light].filter(([n]) => n.startsWith('--lab-glass-') || /control-(highlight|depth|raised)/.test(n)),
  ...[...glassGroup].filter(([n]) => n === '--lab-glass-radius'),
]

function Overview() {
  return (
    <>
      <Lead>
        Two materials do all the work: opaque surfaces hold the content, and one glass material holds
        the tools that float over it.
      </Lead>

      <Section title="Surfaces and glass">
        <div className="fd-material-grid">
          <div className="fd-surface" style={{ background: 'var(--lab-ground)' }}>
            <strong>Ground</strong>
            The page behind everything. <C>--lab-ground</C>
          </div>
          <div className="fd-surface" style={{ background: 'var(--lab-surface)' }}>
            <strong>Surface</strong>
            Panels, cards, editors, forms, menus. Opaque, no blur. <C>--lab-surface</C>
          </div>
          <div className="fd-surface" style={{ background: 'var(--lab-surface-soft)' }}>
            <strong>Soft surface</strong>
            Wells and tracks inside a surface. <C>--lab-surface-soft</C>
          </div>
        </div>
        <p>
          Content (text being edited, results, tables) always sits on an opaque surface, so it stays
          readable. Glass is reserved for chrome: toolbars, docks, floating navigation.
        </p>
      </Section>

      <Section title="Glass groups">
        <p>
          <Link to="/components/glass-group">GlassGroup</Link> paints the glass material once around a
          related group of controls: a light veil of the surface over the backdrop (how much is the
          app’s <C>glassTint</C>, from clear to tinted), the backdrop bent at the edges where the browser
          can (Chromium), an optional blur (<C>glassBlur</C>), a two-sided rim light and a soft shadow.
          Controls inside it stay borderless and share the material. Try the Liquid Glass slider in
          Customize.
        </p>
        <div className="fd-glass-stage">
          <GlassGroup role="toolbar" aria-label="Text style">
            <IconButton variant="ghost" aria-label="Bold">
              <Bold />
            </IconButton>
            <IconButton variant="ghost" aria-label="Italic">
              <Italic />
            </IconButton>
            <IconButton variant="ghost" aria-label="Underline">
              <Underline />
            </IconButton>
          </GlassGroup>
        </div>
        <Code
          code={`import { GlassGroup } from '@feeef.dev/ui/scaffold'

<GlassGroup role="toolbar" aria-label="Text style">
  <IconButton variant="ghost" aria-label="Bold"><Bold /></IconButton>
  <IconButton variant="ghost" aria-label="Italic"><Italic /></IconButton>
</GlassGroup>`}
        />
        <Table
          head={['Token', 'Light', 'Dark', 'Role']}
          rows={rows.map(([name, value]) => [
            <Tok>{name}</Tok>,
            <C>{value}</C>,
            dark.has(name) ? <C>{dark.get(name)!}</C> : <span className="docs-muted">same</span>,
            ROLES[name] ?? '—',
          ])}
        />
      </Section>

      <Section title="Fallbacks">
        <p>The glass material degrades to an opaque surface whenever transparency would hurt:</p>
        <Table
          head={['Condition', 'Result']}
          rows={[
            [<C>prefers-reduced-transparency: reduce</C>, <>Solid <C>--lab-surface</C>, no backdrop filter, no refraction.</>],
            [<C>prefers-contrast: more</C>, <>Solid <C>--lab-surface</C> with an <C>--lab-ink</C> outline; no rim light, no refraction.</>],
            [<C>prefers-reduced-motion: reduce</C>, <>The light stays still and presses don’t swell the glass.</>],
            [<>No <C>backdrop-filter</C> support</>, <>Solid <C>--lab-surface</C>.</>],
            [<C>forced-colors: active</C>, <><C>Canvas</C> fill with a <C>CanvasText</C> border; rim highlight hidden.</>],
          ]}
        />
        <Callout title="Never hand-build glass">
          <p>
            Use <C>GlassGroup</C> instead of writing your own <C>backdrop-filter</C>, rim or
            transparent panel; you would lose these fallbacks and the shared rim paint.
          </p>
        </Callout>
      </Section>

      <Section title="Pixel textures">
        <p>
          Quiet pixel grain is the kit’s decorative signature, for example on filled buttons and
          popover menus. <Link to="/components/pixel-art">PixelTexture</Link> is an overlay for a
          positioned, clipped surface and inherits its color from the surface’s text color or a{' '}
          <C>tone</C>.
        </p>
        <div className="fd-material-grid">
          {(['corner', 'grain', 'wave'] as const).map((variant) => (
            <div key={variant} className="fd-surface" style={{ background: 'var(--lab-surface)' }}>
              <PixelTexture variant={variant} tone="sage" />
              <strong>{variant}</strong>
              <C>{`<PixelTexture variant="${variant}" tone="sage" />`}</C>
            </div>
          ))}
        </div>
        <p>
          Textures are <C>aria-hidden</C> and ignore pointer events. Keep them faint, never behind text
          the reader must parse, and don’t animate them where it competes with content.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Put related tools on one glass group.',
            'Keep editable content on opaque surfaces.',
            'Use neutral shadows from the tokens.',
          ]}
          dontItems={[
            'Nest a glass group inside another.',
            'Put body text or forms on glass.',
            'Give each control its own glass background.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'foundations',
  id: 'materials',
  title: 'Materials',
  order: 5,
  summary: 'Opaque surfaces for content, one glass material for floating tools, and pixel textures.',
  keywords: ['glass', 'blur', 'backdrop-filter', 'surface', 'elevation', 'shadow', 'pixel texture', 'reduced transparency'],
  Overview,
})
