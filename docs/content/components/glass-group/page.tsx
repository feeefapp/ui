import { Minus, Plus } from 'lucide-react'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import './glass-demo.css'

const controls = {
  as: { type: 'select', options: ['div', 'header', 'nav', 'aside', 'section', 'footer'], default: 'div' },
  primary: { type: 'boolean', label: 'Filled action', default: true },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <div className="glass-demo-backdrop">
            <GlassGroup
              as={v.as as 'div'}
              role={v.as === 'div' ? 'group' : undefined}
              aria-label="Quantity"
              className="glass-demo-group-content"
            >
              <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Remove one">
                <Minus />
              </IconButton>
              <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Add one">
                <Plus />
              </IconButton>
              {v.primary && (
                <Button variant="filled" appearance="toolbar" controlSize="small">
                  Add to order
                </Button>
              )}
            </GlassGroup>
          </div>
        )}
        code={(v) =>
          jsx(
            'GlassGroup',
            { as: v.as, role: v.as === 'div' ? 'group' : undefined, 'aria-label': 'Quantity' },
            `<IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Remove one">…</IconButton>\n<IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Add one">…</IconButton>${v.primary ? '\n<Button variant="filled" appearance="toolbar" controlSize="small">Add to order</Button>' : ''}`,
            { as: 'div' }
          )
        }
      />

      <Section title="Two materials">
        <p>
          The kit has two materials. <strong>Surfaces</strong> are opaque and hold the work: lists, forms,
          editors, reading. <strong>Glass</strong> is translucent and holds the chrome that floats over the
          work: toolbars, docks, zoom controls, notices. Glass is one translucent fill with a restrained
          blur, a light edge and a neutral shadow, drawn once around a group of related controls.
        </p>
        <p>
          <C>GlassGroup</C> is that material. The kit's own floating pieces are built on it:{' '}
          <C>ToolbarGroup</C>, <C>Dock</C> and the filter bar's chips. Reach for it directly when you
          build a floating control group those do not cover.
        </p>
        <Table
          head={['Use', 'Material']}
          rows={[
            ['Toolbar or app bar controls', <C>ToolbarGroup</C>],
            ['Task actions at the bottom of a view', <C>Dock</C>],
            ['Any other floating group of related controls', <C>GlassGroup</C>],
            ['Content, forms, cards, panels', 'An opaque surface (--lab-surface)'],
          ]}
        />
        <p>
          Without <C>backdrop-filter</C> support, and when the user asks for reduced transparency, glass
          falls back to the opaque surface color. It takes the glass radius (<C>--lab-radius-glass</C>) with continuous corners; to change one
          group's radius, set <C>--lab-glass-radius</C> on it with an inline style or a more specific
          rule.
        </p>
      </Section>

      <Section title="Floating over the page">
        <p>
          Chrome that floats over the whole window (a media player, a page header, a notice) has two
          problems: an ancestor with a transform or filter traps <C>position: fixed</C>, and content has
          to leave room for it. The floating system solves both.
        </p>
        <Table
          head={['Piece', 'Job']}
          rows={[
            [<C>ScaffoldProvider</C>, 'Mount once near the page root. Creates the viewport-fixed portal and publishes reservations as CSS custom properties.'],
            [<C>FloatingLayer</C>, 'Portals its child into that layer under a named slot and reserves the child’s measured size.'],
            [<C>useFloatingReserve</C>, 'Registers an element you already position yourself, without moving it.'],
          ]}
        />
        <Table
          head={['Slot', 'Measured from', 'Custom property']}
          rows={[
            [<C>header</C>, 'top', <C>--lab-header-reserve</C>],
            [<C>rail</C>, 'left (top under 720px)', <><C>--lab-rail-reserve</C>, <C>--lab-rail-width</C>, <C>--lab-rail-height</C></>],
            [<C>player</C>, 'bottom', <C>--lab-player-reserve</C>],
            [<C>notice</C>, 'bottom, stacked above the others', <C>--lab-notice-reserve</C>],
          ]}
        />
        <p>
          Each reservation is the distance from the window edge to the far side of the surface, plus{' '}
          <C>gap</C> (the shell gap G, 8px, by default). The provider also writes the largest reservation per edge as{' '}
          <C>--lab-floating-top|bottom|left|right</C>, and the on-screen keyboard's height as{' '}
          <C>--lab-viewport-bottom</C>. Notices sit above whatever else floats at the bottom. Use the values
          as padding so content never ends under a floating surface:
        </p>
        <Code
          code={`<ScaffoldProvider>
  <main style={{ paddingBottom: 'var(--lab-floating-bottom)' }}>…</main>

  <FloatingLayer slot="player">
    <GlassGroup className="order-call-player">…</GlassGroup>
  </FloatingLayer>
</ScaffoldProvider>

// An element you already render and position:
const bar = useRef<HTMLElement>(null)
useFloatingReserve('header', bar)
<header ref={bar} className="pinned-header">…</header>`}
          title="tsx"
        />
        <Callout title="The layer does not position its child">
          <p>
            <C>FloatingLayer</C> covers the viewport and ignores pointer input; its child gets pointer
            input back and must place itself (<C>position: absolute</C> with insets). For a <C>position: fixed</C>{' '}
            surface, a pure translation (a slide-in) is not counted, so the reservation does not jump.
          </p>
        </Callout>
        <p>
          Inside a scroll area or scaffold you rarely need any of this: <C>ScrollArea</C>'s{' '}
          <C>top</C> and <C>bottom</C> floats already reserve their own space locally.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Wrap related controls in one group; give it role="group" and a label, or a landmark element via as.',
            'Use appearance="toolbar" on controls inside so they share the glass.',
            'Keep glass for chrome that floats over content.',
            'Use reservations for spacing under floating surfaces.',
          ]}
          dontItems={[
            'Nest glass groups, or put glass behind body text.',
            'Hand-build blur, rim highlights or translucent panels.',
            'Put a transform or filter on the floating root.',
            'Use glass for cards and panels; they are surfaces.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          <C>GlassGroup</C> renders a plain element, so give it meaning: <C>role="group"</C> with an{' '}
          <C>aria-label</C> for a set of controls, or a landmark (<C>as="nav"</C>, <C>"header"</C>) when it is
          one. Contrast never depends on the blur: text and controls on glass stay readable on the fallback
          surface. Floating layers render outside the page's DOM
          order (in a portal at the end of <C>body</C>), so keep them for persistent chrome and status, and
          use <C>role="status"</C> for notices.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'glass-group',
  title: 'Glass group',
  group: 'Containment',
  order: 20,
  summary:
    'The glass material for floating chrome, and the floating layer that keeps viewport-fixed surfaces from covering content.',
  importLine:
    "import { GlassGroup, FloatingLayer, ScaffoldProvider, useFloatingReserve } from '@feeef.dev/ui/scaffold'",
  source: 'src/scaffold.tsx',
  api: ['GlassGroup', 'FloatingLayer', 'ScaffoldProvider'],
  keywords: ['glass', 'material', 'blur', 'floating', 'fixed', 'portal', 'reserve', 'liquid glass', 'useFloatingReserve'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <GlassGroup className="glass-demo-group-content">
      <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Remove one">
        <Minus />
      </IconButton>
      <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Add one">
        <Plus />
      </IconButton>
    </GlassGroup>
  ),
})
