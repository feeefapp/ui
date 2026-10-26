import { definePage, examplesFrom } from '../../../src/model'
import { DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

const usage = `<PromptComposer
  label="Message"
  placeholder="Ask about your orders"
  value={prompt}
  onValueChange={setPrompt}
  onSubmit={send}
  busy={sending}
  onStop={cancel}
  submitLabel="Send message"
  leading={<IconButton variant="ghost" appearance="toolbar" aria-label="Attach a file"><Plus /></IconButton>}
  tools={<ModelLadder variant="compact" … />}
/>`

const parts = `<ComposerBar
  leading={…}                 // the round + bubble
  attachments={
    <ComposerAttachments label="Reference images" count={2} max={4}>
      <ComposerAttachment id="a" src={url} label="Bottle" badge="Main" onRemove={…} />
    </ComposerAttachments>
  }
  field={<ComposerField value={text} onValueChange={setText} label="Prompt" onSubmit={send} />}
  tools={<ModelLadder variant="compact" … />}
  actions={<IconButton …><WandSparkles /></IconButton>}
  send={<ComposerSend label="Create image" ready={!!text.trim()} onSend={send} />}
  hasText={!!text}
/>`

function Overview() {
  return (
    <>
      <Section title="What it is">
        <p>
          The Lab's AI prompt input, in the iOS 26 Liquid Glass style of Messages and Apple Intelligence: a
          round <C>leading</C> bubble (+ or attach) and one glass capsule that holds everything else.
          Attachments sit inside the capsule above the text, the field grows to six lines and then
          scrolls, and send is a circle at the capsule's trailing end. Both bubbles share one glass
          container in a <C>GlassBar</C>, so text stays readable when the composer floats over content.
        </p>
        <Table
          head={['Component', 'Use it for']}
          rows={[
            [<C>PromptComposer</C>, 'A ready composer form: chat, writing, any prompt with optional tools.'],
            [<C>ImagePromptComposer</C>, 'The image studio composer: references, the + menu, model ladder, output settings and AI help built in.'],
            [<C>ComposerBar</C>, 'The row both are built from: leading bubble, capsule, the two layouts and their spring.'],
            [<C>ComposerField</C>, 'The growing text field with the animated hint; Enter sends, Shift+Enter breaks the line.'],
            [<C>ComposerAttachments</C>, 'Attachment tiles inside the capsule, scrolling sideways with edge fades, with a quiet "2 of 4" count.'],
            [<C>ComposerAttachment</C>, 'One rounded-square thumbnail (or a wide icon tile) with a × badge and an optional "Main" label.'],
            [<C>ComposerSend</C>, 'Send: quiet neutral when there is nothing to send, primary when there is, the loader (or stop) while sending.'],
            [<C>PromptSettingsPanel</C>, "The titled, scrolling panel the image composer's settings render in."],
            [<C>ComposerHint</C>, 'The word-by-word animated placeholder.'],
          ]}
        />
        <Code code={usage} title="Usage" />
      </Section>

      <Section title="One calm line, then two rows">
        <p>
          Empty and idle, the composer is one line: the + bubble, the field, at most one quiet action
          (the image composer's ideas bulb) and send. When it has text, takes focus or one of its menus
          is open, a second row opens inside the capsule: <C>tools</C> (model, settings) at its leading
          end, the actions and send at its trailing end, under the text. The capsule's height, the
          moving controls and the field's lines all spring together on <C>SPRINGS.snappy</C>, mixed in
          the capsule's own pixels, so a composer pinned to the bottom of a screen grows upward and its
          send button stays under the thumb. The field never remounts, so focus and the caret stay put.
        </p>
        <p>
          Send shows the primary colour only when there is something to send; otherwise it is a quiet
          neutral circle. While <C>busy</C> (or <C>submitting</C>) it shows the kit's loader, and with{' '}
          <C>onStop</C> it stays pressable and stops the request.
        </p>
      </Section>

      <Section title="Building your own">
        <p>
          Both composers are made of the same parts; compose them for a new kind of prompt instead of
          restyling one. <C>ComposerBar</C> decides the layout from <C>hasText</C>, focus inside it and
          open triggers (<C>data-state="open"</C>, <C>aria-expanded</C>, <C>aria-pressed</C>); in
          Flutter, pass <C>pinned</C> while one of your menus or panels is open.
        </p>
        <Code code={parts} title="Parts" />
        <p>
          <C>ImagePromptComposer</C> is fully controlled by the image studio: the owner validates files
          from <C>onAddFiles</C>, runs AI help from <C>onEnhance</C> (it asks for <C>ideas</C> when the
          prompt is empty, <C>enhance</C> otherwise) and passes the model control as <C>ladder</C>,
          usually a <C>ModelLadder</C> with <C>variant="compact"</C>. Its clipboard paste goes through the
          kit's <C>readClipboard</C> service; Flutter hosts pass <C>pickFiles</C> and{' '}
          <C>readClipboard</C>.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Keep the calm bar calm: one leading bubble, the field, at most one action, send.',
            'Mark the reference that leads with a label (Main) and show how many more fit.',
            'Pass the model as a compact ModelLadder so it sits on the second row like a chip.',
          ]}
          dontItems={[
            'Put every tool on the first line; it hides the prompt behind a row of icons.',
            'Mark the main reference with a coloured border; it reads as focus.',
            'Paint send yourself; ComposerSend already shows ready, idle, sending and stop.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The text field takes its name from <C>label</C>; the animated hint is hidden from assistive
          technology, so the label must say what to type. While <C>busy</C>, the form sets{' '}
          <C>aria-busy</C> and the field turns read-only rather than disabled, so focus stays. The calm
          layout's hidden tools are inert. Every icon control and every × badge has its own name, and
          removing an attachment moves focus to the next × (or the field).
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
  summary: 'The Liquid Glass AI prompt input of Lab chat and the image studio: a + bubble and one capsule with attachments, a growing field and send.',
  importLine: "import { PromptComposer } from '@feeef.dev/ui/composer/composer'",
  source: 'src/composer/composer.tsx',
  api: [
    'PromptComposer',
    'ImagePromptComposer',
    'ComposerBar',
    'ComposerField',
    'ComposerAttachments',
    'ComposerAttachment',
    'ComposerSend',
    'PromptSettingsPanel',
    'ComposerHint',
  ],
  keywords: ['chat input', 'prompt', 'ai', 'textarea', 'send', 'attachments', 'composer'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
