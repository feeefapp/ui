import { definePage, examplesFrom } from '../../../src/model'
import { DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          When something changes place because of what the person did (sorted, filtered, moved to
          another status, the view switched from grid to list), let it travel instead of teleporting.
          The eye follows the thing it cared about, and the change explains itself. This is SwiftUI’s
          matched geometry, done with FLIP on springs.
        </p>
      </Section>

      <Section title="How it works">
        <p>
          Wrap the area in <C>LabLayoutGroup</C> and give each moving element a stable{' '}
          <C>data-lab-layout-id</C>. After a render the group compares where each id was with where it
          is now and plays the difference back as a transform. Ids can move between containers inside
          the group (a card from one column to another). New ids fade and scale in.
        </p>
        <Code
          code={`<LabLayoutGroup>
  {columns.map((column) => (
    <section key={column}>
      {cards(column).map((card) => (
        <Card key={card.id} data-lab-layout-id={card.id} />
      ))}
    </section>
  ))}
</LabLayoutGroup>`}
        />
        <Table
          head={['Option', 'Effect']}
          rows={[
            [<C>data-lab-layout-id</C>, 'Required on each element that moves. Unique within the group.'],
            [<C>data-lab-layout="size"</C>, 'Also animate size (by scaling). Use on media and shapes; text would stretch.'],
            [<C>layoutKey</C>, 'Only animate when this value changes, instead of after every render.'],
            [<C>spring</C>, 'Movement spring; default LAB_SPRINGS.snappy.'],
            [<C>animateEnter</C>, 'false to make new elements appear without the fade.'],
          ]}
        />
      </Section>

      <Section title="Physics">
        <p>
          Every element has its own springs for x, y and scale. If the layout changes again while it is
          moving, it starts from where it is on screen at the speed it has. Only <C>transform</C> and{' '}
          <C>opacity</C> change; under reduced motion elements simply appear in place. See{' '}
          <Link to="/foundations/physics">Physics</Link>.
        </p>
        <DoDont
          doItems={[
            'Animate moves the person caused, so the result is easy to follow.',
            'Keep ids stable across renders (database ids, not array indexes).',
          ]}
          dontItems={[
            'Animate data arriving from the server into a list the person is reading.',
            'Wrap a whole page in one group: scope it to the area that changes.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'layout-transitions',
  title: 'Layout transitions',
  group: 'Feedback and motion',
  order: 1,
  summary: 'Shared-element moves: marked elements fly from their old place to their new one on springs.',
  importLine: "import { LabLayoutGroup } from '@feeef.dev/ui/physics'",
  source: 'src/physics/layout-group.tsx',
  api: ['LabLayoutGroup'],
  keywords: ['flip', 'matched geometry', 'shared element', 'reorder', 'animate layout', 'kanban', 'hero'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
})
