import { useState } from 'react'
import { ModelLadder, type LadderStop } from '@feeef.dev/ui/model-ladder'
import { definePage, examplesFrom } from '../../../src/model'
import { Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

const STOPS: LadderStop[] = [
  { modelId: 'gemini-flash-lite', modelName: 'Gemini Flash Lite', label: 'Fast', access: 'free' },
  { modelId: 'gemini-pro', modelName: 'Gemini Pro', label: 'Smart', access: 'pro' },
  { modelId: 'claude-opus', modelName: 'Claude Opus', label: 'Best', access: 'pro' },
]

const usage = `const [index, setIndex] = useState(ladder.defaultIndex)

<ModelLadder
  stops={ladder.stops}
  index={index}
  defaultIndex={ladder.defaultIndex}
  onChange={setIndex}
  enabled={!pending}
/>`

function Preview() {
  const [index, setIndex] = useState(1)
  return <ModelLadder stops={STOPS} index={index} defaultIndex={1} onChange={setIndex} side="bottom" />
}

function Overview() {
  return (
    <>
      <Section title="What it is">
        <p>
          A quality ladder: one control that moves between a few curated models, cheapest first,
          instead of a long model menu. The title opens the full model list for people who want a
          specific one. It is a web port of marchant's model ladder selector and is used by the Lab's
          voice, image and chat tools.
        </p>
        <Table
          head={['Component', 'Use it for']}
          rows={[
            [<C>ModelLadder</C>, 'A trigger (chip, icon, or compact for toolbar and composer rows) that opens the ladder in a popover.'],
            [<C>ModelLadderCard</C>, 'The same ladder card, inline in an inspector that is already open.'],
          ]}
        />
        <Code code={usage} title="Usage" />
      </Section>

      <Section title="Stops and selection">
        <p>
          Both components are controlled by <C>stops</C>, <C>index</C> and <C>onChange</C>; the owner
          keeps the default (the Lab uses the middle rung, <C>middleIndex(count)</C>). Each stop has a{' '}
          <C>modelId</C>, a human <C>modelName</C> and a tier <C>label</C>. A label that only repeats the
          name or id is replaced by Fast / Balanced / Best by position. The model list keeps the
          model name, or its id when no distinct name is available, so choices remain identifiable.
          <C>priceUsd</C> shows “Usually
          about …” and must come from the server; <C>access</C> shows a Free or Pro tag but enforces
          nothing. <C>catalog</C> adds models to the title list; picking one that is not a rung calls{' '}
          <C>onPickModel</C>, and passing it back as <C>selectedModel</C> hides the track until the user
          resets. Nothing renders when <C>stops</C> is empty, so load the catalog first.
        </p>
      </Section>

      <Section title="Accessibility">
        <p>
          The trigger's name includes the current tier and model. Opening the popover focuses the
          slider. The model list is a listbox with a single tab stop.
        </p>
        <Keys
          rows={[
            ['Arrow Right', 'Next rung; previous in right-to-left layouts.'],
            ['Arrow Left', 'Previous rung; next in right-to-left layouts.'],
            ['Home', 'First rung, or first model in the list.'],
            ['End', 'Last rung, or last model in the list.'],
            ['Arrow Down', 'Next model in the list.'],
            ['Arrow Up', 'Previous model in the list.'],
            ['Escape', 'Leaves the model list, then closes the popover.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'model-ladder',
  title: 'Model ladder',
  group: 'Studio',
  status: 'studio',
  order: 1,
  summary: 'A quality slider over curated AI models, with a searchable list for picking a specific one.',
  importLine: "import { ModelLadder, ModelLadderCard } from '@feeef.dev/ui/model-ladder'",
  source: 'src/model-ladder.tsx',
  api: ['ModelLadder', 'ModelLadderCard'],
  keywords: ['model picker', 'quality', 'ai', 'llm', 'slider'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview,
})
