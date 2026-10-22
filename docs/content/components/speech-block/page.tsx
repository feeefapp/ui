import { definePage, examplesFrom } from '../../../src/model'
import { Keys, Section } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

const usage = `import { LabSpeechBlock } from '@feeef.dev/ui/speech/block'
import { moveSpeechBlock } from '@feeef.dev/ui/speech/block-order'

{blocks.map((block, index) => (
  <LabSpeechBlock
    key={block.id}
    seed={block.id}
    index={index}
    count={blocks.length}
    onMove={(from, to) => setBlocks((old) => moveSpeechBlock(old, from, to))}
    toolbar={<SpeakerPicker block={block} />}
  >
    <SpeechEditor block={block} />
  </LabSpeechBlock>
))}`

function Overview() {
  return (
    <>
      <Section title="What it is">
        <p>
          One card in a Lab voice script: a drag handle, a toolbar for the speaker and style, and the
          block's text editor as <C>children</C>. A sparse pixel texture, seeded by <C>seed</C>, sits in
          the corner and brightens while the block has focus or the user types. Render the blocks as
          siblings in one parent with the <C>lab-voice-writing</C> class: the reorder logic finds its
          neighbors there, and the class keeps the other blocks still during a drag.
        </p>
        <Code code={usage} title="Usage" />
      </Section>

      <Section title="Reordering">
        <p>
          Only the handle drags; text selection, editing and scrolling inside the block stay native.
          While a block is dragged, the others slide to preview the drop, and <C>onMove(from, to)</C> runs
          once on drop, so the move is a single undoable edit. <C>moveSpeechBlock(blocks, from, to)</C>{' '}
          from <C>@feeef.dev/ui/speech/block-order</C> returns the reordered array (or the same array for
          an invalid move). The handle is disabled when <C>count</C> is below 2 or{' '}
          <C>reorderDisabled</C> is set. Animations are skipped under reduced motion.
        </p>
      </Section>

      <Section title="Accessibility">
        <p>
          The block is a labeled region (“Speech block 2”). The handle is a button with a reorder label
          and a hint, and every pick-up, position change, drop and cancel is announced through a status
          region. Give the editor inside its own label.
        </p>
        <Keys
          rows={[
            ['Arrow Up', 'With the handle focused: moves the block up one place.'],
            ['Arrow Down', 'With the handle focused: moves the block down one place.'],
            ['Escape', 'Cancels a drag in progress.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'speech-block',
  title: 'Speech block',
  group: 'Studio',
  status: 'studio',
  order: 3,
  summary: 'A reorderable card for one block of a voice script, with a drag handle and a toolbar slot.',
  importLine: "import { LabSpeechBlock } from '@feeef.dev/ui/speech/block'",
  source: 'src/speech/block.tsx',
  api: ['LabSpeechBlock'],
  keywords: ['voice', 'script', 'tts', 'reorder', 'drag', 'sortable'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
})
