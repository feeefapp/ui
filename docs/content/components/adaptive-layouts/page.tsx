import { definePage, examplesFrom } from '../../../src/model'
import { DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          Components live in panes of every width: a phone, a split view’s detail column, a sheet, a
          desktop page. Adaptive layouts decide from the room a component actually has, not from the
          window, so one component works everywhere. The bigger containers adapt the same way:{' '}
          <Link to="/components/split-view">split view</Link> collapses into a stack and{' '}
          <Link to="/components/sheet">sheet</Link> becomes a dialog.
        </p>
      </Section>
      <Section title="Three tools">
        <Table
          head={['Tool', 'Like SwiftUI', 'Use it for']}
          rows={[
            [<C>AdaptiveStack</C>, 'AnyLayout (HStack ↔ VStack)', 'The same items in a row when they fit, a column when not; items fly between layouts.'],
            [<C>ViewThatFits</C>, 'ViewThatFits', 'Several versions of one thing, most preferred first: labels, icons, a menu.'],
            [<C>useSizeClass</C>, 'horizontalSizeClass', 'Your own layout decisions: compact or regular by the element’s width.'],
          ]}
        />
        <Code
          code={`<AdaptiveStack>                 {/* row while it fits, else column */}
  <Stat label="To confirm" value={24} />
  <Stat label="Cash to collect" value="184 500 DA" />
</AdaptiveStack>

<ViewThatFits>
  <FullActions />   {/* preferred */}
  <IconActions />
  <MenuButton />    {/* always fits */}
</ViewThatFits>

const size = useSizeClass(ref, 420) // 'compact' | 'regular'`}
        />
      </Section>
      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Decide from the component’s own width so it works inside panes and sheets.',
            'Keep every version complete: icons-only buttons still have labels for assistive technology.',
            'End a ViewThatFits with something that always fits.',
          ]}
          dontItems={['Hide functionality in the smaller version without another way to reach it.', 'Use window media queries for components that also appear in panes.']}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'adaptive-layouts',
  title: 'Adaptive layouts',
  group: 'Navigation and layout',
  order: 3,
  summary: 'Rows that become columns, views that pick the version that fits, and size classes measured on the component.',
  importLine: "import { AdaptiveStack, ViewThatFits, useSizeClass } from '@feeef.dev/ui/containers'",
  source: 'src/containers/adaptive.tsx',
  api: ['AdaptiveStack', 'ViewThatFits'],
  keywords: ['responsive', 'adaptive', 'container query', 'size class', 'view that fits', 'hstack', 'vstack'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
})
