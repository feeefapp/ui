import { Copy, Share2 } from 'lucide-react'
import { GlassContainer } from '@feeef.dev/ui/glass'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Section, Table } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'
import SplitMerge from './examples/01-split-merge'
import './glass-container-demo.css'

function Overview() {
  return (
    <>
      <SplitMerge />

      <Section title="One material for a row of bubbles">
        <p>
          A <C>GlassContainer</C> draws the glass of every bubble inside it as one material, like Apple's
          Liquid Glass. Bubbles keep their layout, focus order, labels and keyboard groups; only the paint
          moves to the container. That lets bubbles do what separate boxes can't:
        </p>
        <Table
          head={['Change', 'What the glass does']}
          rows={[
            ['Two bubbles move closer than spacing', 'Their outlines bend toward each other and join below half of it'],
            ['One bubble is replaced by several nearby', 'The new bubbles grow out of the old one and break apart'],
            ['Several bubbles are replaced by one nearby', 'They flow into it'],
            ['A bubble appears or leaves far from others', 'It materializes from a point, or shrinks away'],
            ['A bubble moves because the layout changed', 'Its glass and content spring to the new place'],
            ['A bubble becomes inert (ToolbarSearch opening over its neighbours)', 'It is absorbed into the nearest bubble and grows back out when it returns'],
          ]}
        />
        <p>
          The rim light follows a mouse or pen, so the edge facing the pointer brightens. Touch keeps the
          default light from the top-left. Pressing a bubble swells it a little; dragging stretches it
          toward the finger with growing resistance, and light spreads from the touch point onto nearby
          bubbles. Releasing springs it back.
        </p>
      </Section>

      <Section title="Using it">
        <p>
          Make the container the row itself (it keeps your <C>className</C> and layout) and put{' '}
          <C>ToolbarGroup</C>, <C>GlassGroup</C>, <C>Dock</C> or a grouped <C>SegmentedControl</C> inside. A standalone <C>ToolbarSearch</C> is its own container. Give a bubble a <C>glassId</C> when
          the same bubble can be rendered from different places, so it moves instead of reappearing. Use{' '}
          <C>glassUnion</C> to draw separate groups as one shape.
        </p>
        <Table
          head={['Prop', 'On', 'Use']}
          rows={[
            [<C>spacing</C>, 'GlassContainer', 'Blend distance in px (default 8). Keep it below the gap between bubbles at rest.'],
            [<C>light</C>, 'GlassContainer', <><C>pointer</C> (default) or <C>static</C>.</>],
            [<C>interactive</C>, 'GlassContainer', 'Press response: swell, stretch and glow (default true).'],
            [<C>adaptive</C>, 'GlassContainer', 'Flip small glass light or dark over contrasting content (default true).'],
            [<C>glassId</C>, 'GlassGroup, ToolbarGroup', 'Stable identity across renders and layouts.'],
            [<C>glassUnion</C>, 'GlassGroup, ToolbarGroup', 'Groups with the same name share one shape.'],
            [<C>glassMotion</C>, 'GlassGroup, ToolbarGroup', <><C>follow</C> for bubbles that animate their own size (Dock, search do this already).</>],
          ]}
        />
        <Callout title="Keep the backdrop visible">
          Don't put <C>filter</C>, <C>opacity</C>, <C>mask</C> or <C>clip-path</C> on the container or its
          ancestors: the blur would stop seeing the page behind it. Fade bubbles out by making them{' '}
          <C>inert</C> or removing them; the container dematerializes them.
        </Callout>
      </Section>

      <Section title="Adapting to what is behind">
        <p>
          Small glass (up to 72px tall) flips between light and dark to stay legible over what scrolls
          under it, like Apple's bars over photos. The browser can't read pixels, so mark media regions
          with <C>{'data-lab-backdrop="dark"'}</C> or <C>"light"</C>; elsewhere the first solid background
          colour behind the glass decides. Taller glass keeps the theme's colours. Turn it off with{' '}
          <C>{'adaptive={false}'}</C>.
        </p>
      </Section>

      <Section title="Glass style">
        <p>
          The app's <C>ThemeConfig</C> <C>glass</C> option sets how all of it behaves: <C>liquid</C>{' '}
          (default) has the moving light and press response, <C>frosted</C> keeps the blur and the morphs
          with a still light, <C>solid</C> paints opaque chrome for dense tools. Try it in Customize.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'One container per floating row: an app bar, a toolbar, a dock area.',
            'Let layout state decide grouping; the glass animates whatever changed.',
            'Leave gaps between separate bubbles larger than spacing.',
          ]}
          dontItems={[
            'Nest containers, or put a container inside a bubble.',
            'Animate bubbles yourself with transforms; change the layout and let the container move them.',
            'Use glass for content. Cards and panels stay on opaque surfaces.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The material is decorative (<C>aria-hidden</C>) and ignores the pointer; focus, Tab order and
          group names never change during a morph. With reduced motion, layouts change at once and presses don't swell, stretch or glow. With
          reduced transparency or increased contrast the material is opaque, without the light rim. In forced
          colors every bubble draws its own system border. Without JavaScript bubbles paint themselves.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'glass-container',
  title: 'Glass container',
  group: 'Containment',
  order: 21,
  summary: 'One liquid-glass material for a row of bubbles, so they merge, split and share light.',
  importLine: "import { GlassContainer } from '@feeef.dev/ui/glass'",
  source: 'src/glass/container.tsx',
  api: ['GlassContainer'],
  keywords: ['glass', 'liquid glass', 'merge', 'split', 'morph', 'bubble', 'union', 'blend', 'spacing', 'light'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <GlassContainer className="glass-row" style={{ gap: 4 }} spacing={12}>
      <ToolbarGroup label="Share">
        <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Share">
          <Share2 />
        </IconButton>
      </ToolbarGroup>
      <ToolbarGroup label="Copy">
        <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Copy">
          <Copy />
        </IconButton>
      </ToolbarGroup>
    </GlassContainer>
  ),
})
