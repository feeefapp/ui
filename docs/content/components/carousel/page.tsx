import { definePage, examplesFrom } from '../../../src/model'
import { DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          A carousel shows a few things of the same kind side by side and lets people move through
          them sideways: featured products, promotions, a shelf of recent customers. It is a browsing
          surface, never the only place an item can be reached, and never where something important
          hides.
        </p>
      </Section>
      <Section title="Physics">
        <p>
          The track is a native scroll container with snapping, so touch screens and trackpads get the
          platform’s own momentum and rubber-banding. A mouse can drag it too: the track follows 1:1,
          and on release the flick’s momentum is projected and the nearest slide caught. Each slide
          knows how far it is from the center (<C>--lab-carousel-progress</C>, in slide steps), which
          drives the built-in effects and any of your own.
        </p>
        <Code
          code={`<Carousel label="Featured products" slideWidth={0.62} effect="scale">
  {products.map((p) => <ProductCard key={p.id} product={p} />)}
</Carousel>`}
        />
        <Table
          head={['Option', 'Effect']}
          rows={[
            [<C>slideWidth</C>, 'A fraction of the carousel (0.8 shows the next slide peeking) or a CSS length.'],
            [<C>align</C>, 'center (default) or start, where a resting slide sits.'],
            [<C>effect</C>, 'scale, fade, parallax (moves data-lab-parallax media) or none.'],
            [<C>index</C> , 'Controlled current slide; onIndexChange reports the slide at rest.'],
            [<C>dots</C>, 'Page dots; also buttons to jump to a slide.'],
            [<C>controls</C>, 'auto shows previous/next on hover for mouse users; always or never.'],
          ]}
        />
      </Section>
      <Section title="Guidelines">
        <DoDont
          doItems={['Let the next slide peek so people see there is more.', 'Keep slides the same size and kind.']}
          dontItems={['Auto-advance slides: people lose what they were reading.', 'Put a form or the only copy of key information in a slide.']}
        />
      </Section>
      <Section title="Accessibility">
        <ul>
          <li>The carousel is a named region; slides are labelled “2 of 5”.</li>
          <li>The track is focusable: arrow keys, Home and End move between slides.</li>
          <li>Under reduced motion, slides keep still and jumps are instant.</li>
        </ul>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'carousel',
  title: 'Carousel',
  group: 'Containment',
  order: 4,
  summary: 'Sideways browsing on native scroll snapping, with scale, fade and parallax scroll transitions.',
  importLine: "import { Carousel } from '@feeef.dev/ui/containers'",
  source: 'src/containers/carousel.tsx',
  api: ['Carousel'],
  keywords: ['carousel', 'slider', 'gallery', 'paging', 'snap', 'parallax', 'shelf', 'swiper'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
