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
            [<C>tint</C>, 'GlassContainer', 'Local clear-to-tinted material, 0–1. Omit to inherit ThemeConfig.'],
            [<C>highlightProfile</C>, 'GlassContainer', 'surface (default): convex bevel; rim: thin symmetric highlight fitted to native screenshots. Use width 1 and strength 1 for the reference rim.'],
            [<C>highlightWidth</C>, 'GlassContainer', 'Reflective bevel width in px, 0–20 (default 5).'],
            [<C>highlightStrength</C>, 'GlassContainer', 'Highlight strength, 0–3 (default 1).'],
            [<C>backdropSource</C>, 'GlassContainer', 'ID of a separate background-only element. Enables live background refraction in Firefox; the source must not contain the glass.'],
            [<C>refractionStrength</C>, 'GlassContainer', 'Backdrop bend, 0–3 (default 1). Above 1 allows stronger distortion. Theme refraction must be enabled.'],
            [<C>cornerShape</C>, 'GlassContainer', 'Superellipse by default; round uses circular corners consistently across the outline, highlights and refraction. Supply matching member radii.'],
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
          <C>inert</C>, setting <C>data-glass-hidden</C> or removing them; the container dematerializes them.
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
          (default) has the moving light and press response, <C>still</C> keeps the material and the
          morphs with a fixed light and no press response, <C>solid</C> paints opaque chrome for dense
          tools. Try it in Customize.
        </p>
      </Section>

      <Section title="Clear to tinted, blur and refraction">
        <p>
          Like the Liquid Glass setting on iOS, one number moves the material:{' '}
          <C>ThemeConfig</C> <C>glassTint</C>, from <C>0</C> (clear: no veil, no shadow, a slight
          brightness lift) to <C>1</C> (tinted: the measured regular material, a dense veil, strong
          saturation and a soft shadow). The default <C>0.5</C> lays a light veil (about 40% of the
          surface) over the backdrop: controls stay legible and the bending shows. The rim light follows the local curve of the blended outline and stays the same at every tint. Inspect it on plain, grid and colored backgrounds in the <a href="/foundations/glass-reflections">Glass reflections</a> guide.
        </p>
        <p>
          <C>glassRefraction</C> (default on) bends what is behind the glass at its edges, like a lens,
          with a bounded bezel profile that avoids folded background lines: whenever the glass settles, the kit builds a displacement map of
          its outline on a canvas and applies it as an SVG backdrop filter (while bubbles move it shows
          the same glass unbent, so morphs stay smooth). Chromium filters the actual backdrop directly. Firefox can apply the same bend when you pass <C>backdropSource</C>, the ID of a separate background-only element. It captures that layer as a live element image and filters it normally. Keep the source and glass as siblings: capturing an ancestor containing the glass would create a recursive image. Without a source, Firefox keeps CSS glass. Safari keeps CSS glass without the bend. <C>glassBlur</C> (default off) adds the measured
          backdrop blur, 2.9px on controls growing to 5.2px on panels. Reduced transparency and
          increased contrast turn all of it into an opaque surface; increased contrast also draws an
          outline. Try the Liquid Glass slider in Customize.
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
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
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
