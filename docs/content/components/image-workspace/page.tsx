import { definePage, examplesFrom } from '../../../src/model'
import { Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

const usage = `<ImageWorkspace
  top={<ProjectHeader />}
  bottom={<ImagePromptComposer … />}
  board={(insets) => (
    <FreeformBoard
      embedded
      takes={project.takes}
      selectedId={selectedId}
      onSelect={setSelectedId}
      insets={insets}
      now={now}
      …
    />
  )}
/>`

function Overview() {
  return (
    <>
      <Section title="What it is">
        <p>
          The Lab image studio's canvas: an endless dotted board with every version of an image side by
          side, and floating chrome (a header and the composer) above it.
        </p>
        <Table
          head={['Component', 'Use it for']}
          rows={[
            [<C>ImageWorkspace</C>, 'Measures the top and bottom chrome and hands the board the room they take.'],
            [<C>FreeformBoard</C>, 'The pan-and-zoom board of image takes (versions).'],
          ]}
        />
        <Code code={usage} title="Usage" />
      </Section>

      <Section title="Layout">
        <p>
          <C>ImageWorkspace</C> fills a flex parent (give it a height) and places <C>top</C> and{' '}
          <C>bottom</C> 12 px from the edges; the bottom slot is at most 780 px wide. It observes both and
          calls <C>board(insets)</C> with their heights plus a gap, so the board can center cards in the
          free area. <C>FreeformBoard</C> covers the whole window unless you pass <C>embedded</C>, which
          makes it fill its positioned parent.
        </p>
      </Section>

      <Section title="Empty board">
        <p>
          <C>emptyContent</C> places a custom welcome in the viewport. Use <C>emptyScene</C> for
          interactive content that pans and zooms with the board. Give the scene a <C>maxWidth</C>
          and content that lays out at that width or smaller. The board measures its height and
          fits it between the floating panels when it appears or the available space changes.
        </p>
      </Section>

      <Section title="Takes">
        <p>
          <C>takes</C> are <C>ImageTake</C> records (<C>@feeef.dev/ui/image/types</C>), newest first; the
          board lays them out oldest to newest, left to right, sized from <C>options.aspectRatio</C> until
          the image loads. Completed takes show the image, pending and processing ones a loader with the
          time since <C>createdAt</C> (tick <C>now</C> to update it), and failed ones the error with Try
          again and Remove. A known <C>errorCode</C> shows its translated message instead of{' '}
          <C>error</C>. The selected take glides into view whenever the selection, the takes, the insets
          or the size change; animation is skipped under reduced motion.
        </p>
      </Section>

      <Section title="Interaction">
        <p>
          The board is a <C>role="application"</C> region. Zoom buttons (zoom out, fit selection, zoom in,
          show all) float on the right edge and are reachable by keyboard; panning and pinching are
          pointer-only.
        </p>
        <Keys
          rows={[
            ['Drag', 'Pans the board.'],
            ['Scroll', 'Pans the board.'],
            ['Ctrl + Scroll', 'Zooms at the pointer (⌘ + scroll on macOS, or pinch).'],
            ['Double-click', 'Fits the card under the pointer.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'image-workspace',
  title: 'Image workspace',
  group: 'Studio',
  status: 'studio',
  order: 4,
  summary: 'The image studio canvas: a pan-and-zoom board of versions under measured floating chrome.',
  importLine:
    "import { ImageWorkspace } from '@feeef.dev/ui/image/workspace'\nimport { FreeformBoard } from '@feeef.dev/ui/image/freeform-board'",
  source: 'src/image/workspace.tsx',
  api: ['ImageWorkspace', 'FreeformBoard'],
  keywords: ['canvas', 'board', 'zoom', 'pan', 'image studio', 'versions', 'takes'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
