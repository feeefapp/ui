import { definePage, examplesFrom } from '../../../src/model'
import { Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

const usage = `<PromptComposer
  label="Message"
  placeholder="Ask about your orders"
  value={prompt}
  onValueChange={setPrompt}
  onSubmit={send}
  busy={sending}
  tools={<ModelLadder variant="icon" … />}
  submit={
    <IconButton type="submit" variant="filled" aria-label="Send message" loading={sending}>
      <ArrowUp size={20} />
    </IconButton>
  }
/>`

function Overview() {
  return (
    <>
      <Section title="What it is">
        <p>
          The Lab's AI prompt input: a glass card that is one line while short and grows into two rows
          (the field on top, tools below) when the text needs room or has a line break. The text field
          never remounts while the layout changes, so focus and the caret stay put.
        </p>
        <Table
          head={['Component', 'Use it for']}
          rows={[
            [<C>PromptComposer</C>, 'A generic composer form with slots for tools and the send control (chat, writing).'],
            [<C>ImagePromptComposer</C>, 'The image studio composer, with references, the + menu, ladder, settings and AI wand built in.'],
            [<C>PromptSettingsPanel</C>, "The titled, scrolling panel the image composer's settings render in."],
            [<C>ComposerCard</C>, 'The bare card and layout grid, for a composer with its own fields.'],
            [<C>ComposerHint</C>, 'The word-by-word animated placeholder, placed inside a composer field.'],
          ]}
        />
        <Code code={usage} title="Usage" />
      </Section>

      <Section title="Slots and submitting">
        <p>
          <C>PromptComposer</C> owns the text field and the measured layout; you own the controls.{' '}
          <C>above</C> sits over the card (attachments, notes), <C>tools</C> holds attach, record and
          model controls, <C>submit</C> holds your send or stop button, and <C>footer</C> sits below.{' '}
          <C>onSubmit</C> runs on Enter or form submit only when the prompt is not blank and none of{' '}
          <C>disabled</C>, <C>busy</C> or <C>submitDisabled</C> is set. When slot content changes size
          without the text changing, bump <C>contentRevision</C> so the layout re-measures.
        </p>
        <p>
          <C>ImagePromptComposer</C> is fully controlled by the image studio: the owner validates files
          from <C>onAddFiles</C>, runs the AI wand from <C>onEnhance</C> (it asks for{' '}
          <C>ideas</C> when the prompt is empty, <C>enhance</C> otherwise), and renders the model
          control through <C>ladder(variant)</C>. Its clipboard paste goes through the kit's{' '}
          <C>readClipboard</C> service.
        </p>
      </Section>

      <Section title="Accessibility">
        <p>
          The text field takes its name from <C>label</C>; the animated hint is hidden from assistive
          technology, so the label must say what to type. While <C>busy</C>, the form sets{' '}
          <C>aria-busy</C> and the field turns read-only rather than disabled, so focus stays. Every
          icon control in the image composer has its own label.
        </p>
        <Keys
          rows={[
            ['Enter', 'Sends the prompt.'],
            ['Shift + Enter', 'Adds a line break.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'prompt-composer',
  title: 'Prompt composer',
  group: 'Studio',
  status: 'studio',
  order: 2,
  summary: 'The growing AI prompt input used by Lab chat and image studio, with slots for tools and send.',
  importLine: "import { PromptComposer } from '@feeef.dev/ui/composer/composer'",
  source: 'src/composer/composer.tsx',
  api: ['PromptComposer', 'ImagePromptComposer', 'PromptSettingsPanel', 'ComposerCard', 'ComposerHint'],
  keywords: ['chat input', 'prompt', 'ai', 'textarea', 'send'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
})
