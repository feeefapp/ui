import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Alert, type AlertAction } from '@feeef.dev/ui/presentation'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

const controls = {
  title: { type: 'text', default: 'Cancel order #10482?' },
  message: { type: 'text', default: 'The reserved stock goes back to inventory. You can’t undo this.' },
  actions: { type: 'select', options: ['Two', 'Three', 'Long labels'], default: 'Two' },
  destructive: { type: 'boolean', label: 'Destructive', default: true },
} as const

function actionsFor(kind: string, destructive: boolean): AlertAction[] {
  const main: AlertAction = { label: 'Cancel order', role: destructive ? 'destructive' : 'primary' }
  if (kind === 'Three') return [main, { label: 'Move to Failed' }, { label: 'Keep order', role: 'cancel' }]
  if (kind === 'Long labels')
    return [{ label: 'Keep the order as it is', role: 'cancel' }, { ...main, label: 'Cancel and restock 2 items' }]
  return [{ label: 'Keep order', role: 'cancel' }, main]
}

function PlaygroundAlert(props: { title: string; message: string; actions: string; destructive: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="filled" onClick={() => setOpen(true)}>
        Open alert
      </Button>
      <Alert
        open={open}
        onOpenChange={setOpen}
        title={props.title}
        message={props.message}
        actions={actionsFor(props.actions, props.destructive)}
      />
    </>
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => <PlaygroundAlert {...v} />}
        code={(v) =>
          `<Alert
  open={open}
  onOpenChange={setOpen}
  title="${v.title}"
  message="${v.message}"
  actions={[
${actionsFor(v.actions, v.destructive)
  .map((a) => `    { label: '${a.label}'${a.role ? `, role: '${a.role}'` : ''} },`)
  .join('\n')}
  ]}
/>`
        }
      />

      <Section title="Alert or modal">
        <p>
          Both are centred dialogs that interrupt the page; everything behind is inert until they close.
          Pick by what the person has to do:
        </p>
        <Table
          head={['', 'Use for', 'Looks like']}
          rows={[
            [<C>Alert</C>, 'A decision: confirm, discard, allow. A title, a sentence and two or three choices.', 'Thick glass, 320 wide, centred text, capsule buttons.'],
            [<C>Modal</C>, 'A short task with a form: edit an address, correct a phone, merge two customers.', 'An opaque card that hugs its content, a floating glass header and a dock of actions.'],
          ]}
        />
        <p>
          When the person needs the page in view, use a <Link to="/components/pane">pane</Link>; for a
          short task on a phone, a <Link to="/components/sheet">sheet</Link>. Don’t open one dialog from
          another.
        </p>
      </Section>

      <Section title="Alert">
        <p>
          <C>actions</C> lists the choices in reading order. Each has a <C>label</C> naming its outcome and
          an optional <C>role</C>: <C>cancel</C> backs out (Escape runs it), <C>primary</C> is the one main
          action, <C>destructive</C> deletes or loses something and is tinted danger. Two actions sit side
          by side when both labels fit, the cancel action first; otherwise they stack full width with the
          cancel action at the bottom.
        </p>
        <p>
          Choosing an action runs its <C>onAction</C> and closes the alert. Return <C>false</C> from{' '}
          <C>onAction</C> to keep it open, for example to show an error in a field you passed as children.
        </p>
        <Code
          code={`<Alert
  open={open}
  onOpenChange={setOpen}
  title="Cancel order #10482?"
  message="The reserved stock goes back to inventory. You can’t undo this."
  actions={[
    { label: 'Keep order', role: 'cancel' },
    { label: 'Cancel order', role: 'destructive', onAction: cancelOrder },
  ]}
/>`}
        />
      </Section>

      <Section title="Modal">
        <Table
          head={['Prop', 'Effect']}
          rows={[
            [<C>title</C>, 'The title bubble of the floating glass header. trailing adds bubbles after it; the close bubble ends the row unless showClose is false.'],
            [<C>dock</C>, 'Floating actions at the bottom, usually a PresentationDock. They never scroll away.'],
            [<C>header</C>, 'Replaces the whole header with your own glass bars (a search field, range ends). label still names the dialog.'],
            [<C>fill</C>, 'Takes the full height (up to 720px) instead of hugging the content: long lists.'],
            [<C>wide</C>, '980px instead of 560px, for side-by-side content.'],
            [<C>{'dismissible={false}'}</C>, 'Escape and the backdrop no longer close it; your own actions and the close bubble still do.'],
          ]}
        />
        <Code
          code={`<Modal
  open={open}
  onOpenChange={setOpen}
  label="Edit delivery address"
  title="Edit delivery address"
  dock={
    <PresentationDock>
      <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="filled" onClick={save}>Save address</Button>
    </PresentationDock>
  }
>
  <TextField hint="Wilaya" />
  …
</Modal>`}
        />
        <p>
          The header, body and dock are the shared parts every presentation surface is made of:{' '}
          <C>PresentationHeader</C>, <C>PresentationBody</C> (a scroll area that hugs its content up to the
          room it has) and <C>PresentationDock</C>. <C>Pane</C> and <C>Sheet</C> use the same ones.
        </p>
      </Section>

      <Section title="Opening and closing">
        <p>
          Both are controlled. Keep them mounted, set <C>open</C>, and set it back to false in{' '}
          <C>onOpenChange</C>. They open with a small spring from a little larger than their size and
          fade out; with reduced motion they crossfade, and with the theme’s <C>motion: 'none'</C> they
          appear and disappear at once. The page dims behind them.
        </p>
        <Callout title="In Flutter">
          <p>
            Declare <C>Alert</C> and <C>Modal</C> the same way, or show them from an event and wait for the
            result: <C>await showAlert&lt;bool&gt;(context, builder: …)</C> completes with the chosen
            action’s <C>value</C>, and <C>showModal&lt;T&gt;</C> with what you pass to{' '}
            <C>Navigator.pop(context, value)</C>. Both work in a plain <C>WidgetsApp</C>.
          </p>
        </Callout>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Write the title as the question: “Cancel order #10482?”, then say what happens.',
            'Name actions by their outcome: “Cancel order”, “Keep order”, never “OK”.',
            'Give a destructive alert a cancel action; focus starts there.',
            'Use a Modal with a dock for anything with fields.',
          ]}
          dontItems={[
            'Render {open && <Modal …/>}; toggle open so the exit can play.',
            'Put more than three actions in an alert.',
            'Repeat the title as a heading inside a modal; the header shows it.',
            'Stack dialogs, or nest a second scroll area inside one.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          Both are native <C>{'<dialog>'}</C> elements in the browser’s top layer: the page is inert, Tab
          stays inside, and focus returns to the opener (or <C>returnFocusRef</C>) when they close. An
          alert is an <C>alertdialog</C> named by its title and described by its message; its focus starts
          on the cancel action, or the last action. A modal is named by its visible title, or by{' '}
          <C>label</C>; pass <C>initialFocusRef</C> to start in a specific field.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves to the next control inside the dialog.'],
            ['Shift + Tab', 'Moves to the previous control.'],
            ['Escape', 'Alert: runs the cancel action. Modal: closes it (when dismissible).'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'modal',
  title: 'Modal and alert',
  group: 'Containment',
  order: 1,
  summary: 'Centred dialogs: Alert for a decision on thick glass, Modal for a short form with a floating header and dock.',
  importLine: "import { Alert, Modal, PresentationDock } from '@feeef.dev/ui/presentation'",
  source: 'src/presentation/modal.tsx',
  api: ['Alert', 'Modal', 'PresentationHeader', 'PresentationBody', 'PresentationDock'],
  keywords: ['dialog', 'alert', 'confirm', 'popup', 'overlay', 'focus trap', 'showModal', 'showAlert'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div
      aria-hidden="true"
      style={{
        width: 180,
        padding: '14px 10px 10px',
        display: 'grid',
        gap: 10,
        borderRadius: 24,
        background: 'color-mix(in srgb, var(--lab-surface) 90%, transparent)',
        boxShadow: 'var(--lab-glass-shadow), inset 0 0 0 1px var(--lab-line)',
        fontSize: 12,
        textAlign: 'center',
      }}
    >
      <strong>Cancel order #10482?</strong>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Button variant="elevated" controlSize="small" tabIndex={-1}>
          Keep
        </Button>
        <Button variant="destructive" controlSize="small" tabIndex={-1}>
          Cancel
        </Button>
      </div>
    </div>
  ),
})
