import { Plus } from 'lucide-react'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Dock } from '@feeef.dev/ui/dock'
import { Button } from '@feeef.dev/ui/primitives/button'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'
import './scroll-demo.css'

const controls = {
  rows: { type: 'number', label: 'Rows', min: 1, max: 30, default: 14 },
  edgeGap: { type: 'number', label: 'Edge gap', min: 0, max: 32, default: 8 },
  contentPadding: { type: 'number', label: 'Content padding', min: 0, max: 48, default: 8 },
  top: { type: 'boolean', label: 'Top float', default: true },
  bottom: { type: 'boolean', label: 'Bottom float', default: true },
  gradient: { type: 'boolean', label: 'Edge washes', default: true },
} as const

function Anatomy() {
  return (
    <div
      className="scroll-demo-anatomy"
      role="img"
      aria-label="Scroll area anatomy: a top float, the scrolling viewport behind it, and a bottom float"
    >
      <div data-float>
        <b>1</b> top
      </div>
      <div>
        <b>2</b> viewport: content padded by the measured reservations
      </div>
      <div data-float>
        <b>3</b> bottom
      </div>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <div className="scroll-demo-frame" style={{ height: 320 }}>
            <ScrollArea
              label="Orders"
              edgeGap={v.edgeGap}
              contentPadding={v.contentPadding}
              gradient={v.gradient}
              top={
                v.top ? (
                  <Toolbar
                    label="Order tools"
                    leading={
                      <ToolbarGroup label="Title">
                        <strong style={{ paddingInline: 12, fontSize: 14 }}>Orders</strong>
                      </ToolbarGroup>
                    }
                  />
                ) : undefined
              }
              bottom={
                v.bottom ? (
                  <Dock label="Order actions">
                    <Button variant="filled">
                      <Plus />
                      New order
                    </Button>
                  </Dock>
                ) : undefined
              }
            >
              <div className="scroll-demo-list">
                {Array.from({ length: v.rows }, (_, i) => (
                  <div key={i} className="scroll-demo-row">
                    <span>
                      <strong>Order #{1100 - i}</strong>
                      <small>Cash on delivery</small>
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        code={(v) =>
          jsx(
            'ScrollArea',
            {
              label: 'Orders',
              edgeGap: v.edgeGap,
              contentPadding: v.contentPadding,
              gradient: v.gradient,
              top: v.top ? '__TOP__' : undefined,
              bottom: v.bottom ? '__BOTTOM__' : undefined,
            },
            '<OrderList />',
            { edgeGap: 8, contentPadding: 8, gradient: true }
          )
            .replace('top="__TOP__"', 'top={<Toolbar label="Order tools" leading={…} />}')
            .replace('bottom="__BOTTOM__"', 'bottom={<Dock label="Order actions">…</Dock>}')
        }
      />

      <Section title="How it works">
        <p>
          <C>ScrollArea</C> fills the nearest bounded box and turns it into one scroll viewport with
          floating chrome. The box you put it in owns the border, the corners and the opaque surface; the
          scroll area itself is transparent and inherits the radius, so content reaches the real edge and
          scrolls behind the toolbar and dock instead of stopping short of them.
        </p>
        <Anatomy />
        <ol>
          <li>
            <strong>Top float</strong> (<C>top</C>): a toolbar, search or filter bar, placed{' '}
            <C>edgeGap</C> from the top and both sides. <C>edgeGap</C> and <C>contentPadding</C>{' '}
            default to the shell gap G (<C>--lab-shell-gap</C>, 8px), so they follow{' '}
            <C>metrics.shellGap</C>; cards inside bring their own 16px padding.
          </li>
          <li>
            <strong>Viewport</strong>: the element that scrolls. Its content gets inline padding of{' '}
            <C>contentPadding</C>, and top/bottom padding equal to each float's measured height plus two
            edge gaps (or <C>contentPadding</C> when there is no float). The same values are set as scroll
            padding, so focus and <C>revealScrollChild</C> also keep rows out from under the floats.
          </li>
          <li>
            <strong>Bottom float</strong> (<C>bottom</C>): usually a <C>Dock</C>.
          </li>
        </ol>
        <p>
          A <C>ResizeObserver</C> remeasures the floats whenever they wrap, resize or swap content, so a
          dock that grows from one button to three never covers the last row. Safe-area insets are added
          on phones. Empty space around a float passes clicks through to the content below.
        </p>
      </Section>

      <Section title="Edge washes">
        <p>
          With <C>gradient</C> on (the default), a dithered wash in the surface color sits under each edge,
          so content fades as it passes beneath the floats. Each wash fades in over the first 80px of scroll
          away from its edge; when everything fits, both rest at a faint level. Wash heights follow the
          floats (at least 100px top and 140px bottom); override them with <C>topFadeHeight</C> and{' '}
          <C>bottomFadeHeight</C>. The color comes from <C>--lab-scroll-surface</C>, falling back to{' '}
          <C>--lab-surface</C>; set that custom property when the box has a different paint. For a scroller
          you build yourself, use <C>ScrollGradientOverlay</C>.
        </p>
      </Section>

      <Section title="Pull to refresh">
        <p>
          Pass <C>onRefresh</C> and a touch pull at the top refreshes the area, with a loader below
          the top float. See <Link to="/components/pull-to-refresh">Pull to refresh</Link>.
        </p>
      </Section>

      <Section title="Reaching the viewport">
        <Table
          head={['Need', 'Use']}
          rows={[
            ['Scroll position, scroll events, keyboard handlers', <><C>ref</C> (forwarded to the viewport) or <C>viewportProps</C></>],
            ['Show a selected or focused row', <C>revealScrollChild(viewport, child, options)</C>],
            ['Its role and name', <><C>label</C> (required); override with <C>viewportProps.role</C></>],
          ]}
        />
        <Code
          code={`import { revealScrollChild } from '@feeef.dev/ui/scroll'

// Minimum movement to show the row, inside this viewport only. Options:
// block / inline: 'nearest' (default) | 'center' | false, behavior: 'instant' (default) | 'smooth'
revealScrollChild(viewport.current, row, { block: 'nearest', behavior: 'smooth' })`}
        />
        <p>
          Prefer it to <C>element.scrollIntoView()</C>, which also scrolls every ancestor, including the
          page behind a dialog or panel. Under reduced motion it always scrolls instantly.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Give the parent a bounded height (a flex child with min-height: 0, a fixed-height panel, 100dvh).',
            'Put toolbars and docks in top and bottom, not as rows inside the content.',
            'Use one scroll area per surface; a scrollable dialog uses Modal scrollable.',
            'Let the measured reservations do the spacing.',
          ]}
          dontItems={[
            'Hard-code bottom padding for a dock or player.',
            'Inset the scroll area away from the box edges to “make room” for chrome.',
            'Use position: sticky headers for chrome that belongs in a float.',
            'Nest a second unbounded scroll area in the content.',
          ]}
        />
        <Callout tone="warning" title="Nothing scrolls?">
          <p>
            The area takes <C>height: 100%</C> of its parent. If the parent has no definite height (it grows
            with its content), the viewport grows too and never scrolls.
          </p>
        </Callout>
      </Section>

      <Section title="Accessibility">
        <p>
          The viewport is a focusable <C>region</C> named by <C>label</C>, so keyboard users can scroll it
          without a pointer. Floats are siblings of the viewport, placed before and after it in the DOM, so
          Tab reaches the top chrome, then the content, then the bottom chrome. Washes are decorative (
          <C>aria-hidden</C>) and hidden under forced colors and reduced transparency.
        </p>
        <Keys
          rows={[
            ['Arrow Up / Arrow Down', 'Scroll the focused viewport.'],
            ['Page Up / Page Down', 'Scroll by a page.'],
            ['Home / End', 'Jump to the start or end.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'scroll-area',
  title: 'Scroll area',
  group: 'Navigation and layout',
  order: 2,
  summary:
    'A full-bleed scroll viewport with floating top and bottom chrome whose measured heights are reserved, so content never hides under it.',
  importLine: "import { ScrollArea, ScrollGradientOverlay, revealScrollChild } from '@feeef.dev/ui/scroll'",
  source: 'src/scroll/scroll-area.tsx',
  api: ['ScrollArea', 'ScrollGradientOverlay'],
  keywords: ['scroll', 'overflow', 'viewport', 'sticky', 'fade', 'gradient', 'revealScrollChild', 'scrollIntoView'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <span className="scroll-demo-preview">
      <i />
      <i />
      <i />
      <i />
      <b />
    </span>
  ),
})
