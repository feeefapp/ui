import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Modal } from '@feeef.dev/ui/primitives/modal'
import { Dock } from '@feeef.dev/ui/dock'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

const controls = {
  label: { type: 'text', default: 'Edit delivery address' },
  scrollable: { type: 'boolean', default: true },
  fitContent: { type: 'boolean', default: true },
  showClose: { type: 'boolean', default: true },
  wide: { type: 'boolean', default: false },
  dock: { type: 'boolean', label: 'Bottom dock', default: true },
} as const

function PlaygroundModal(props: {
  label: string
  scrollable: boolean
  fitContent: boolean
  showClose: boolean
  wide: boolean
  dock: boolean
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <Button variant="filled" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Modal
        open={open}
        close={close}
        label={props.label}
        scrollable={props.scrollable}
        fitContent={props.fitContent}
        showClose={props.showClose}
        wide={props.wide}
        bottom={
          props.dock ? (
            <Dock label="Address actions">
              <Button variant="text" onClick={close}>
                Cancel
              </Button>
              <Button variant="filled" onClick={close}>
                Save address
              </Button>
            </Dock>
          ) : undefined
        }
      >
        <div style={{ display: 'grid', gap: 16, padding: props.scrollable ? 0 : 24 }}>
          <TextField hint="Wilaya" defaultValue="Alger" />
          <TextField hint="Commune" defaultValue="Bab Ezzouar" />
          <TextField hint="Street and building" defaultValue="Cité 2068 Logements, Bt 12" />
          {!props.scrollable && (
            <Button variant="filled" onClick={close}>
              Save address
            </Button>
          )}
        </div>
      </Modal>
    </>
  )
}

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => <PlaygroundModal {...v} />}
        code={(v) =>
          jsx(
            'Modal',
            {
              open: '{open}',
              close: '{close}',
              label: v.label,
              scrollable: v.scrollable,
              fitContent: v.scrollable && v.fitContent,
              showClose: v.showClose ? undefined : '{false}',
              wide: v.wide,
              bottom: v.scrollable && v.dock ? '{<Dock label="Address actions">…</Dock>}' : undefined,
            },
            '<TextField hint="Wilaya" />\n…'
          ).replace(/="\{(.+?)\}"(?=\s|\n|>|\/)/g, '={$1}')
        }
      />

      <Section title="When to use">
        <p>
          A modal interrupts the page for a short, focused task the person must finish or dismiss:
          confirming a cancellation, editing an address, choosing a courier. Everything behind it is
          inert until it closes.
        </p>
        <p>
          Prefer inline editing, a side panel or a{' '}
          <Link to="/components/popover-surface">popover</Link> when the person needs to see or use
          the page while working. Don’t open a modal from a modal.
        </p>
      </Section>

      <Section title="Opening and closing">
        <p>
          <C>Modal</C> is controlled. Keep it mounted, set <C>open</C>, and set it back to false in{' '}
          <C>close</C>. The dialog plays an exit transition before it unmounts, so toggling{' '}
          <C>open</C> (rather than rendering the modal conditionally) keeps the animation and focus
          return intact. <C>close</C> is called by Escape, a click on the backdrop and the close
          button; your own Cancel and Save buttons call it too.
        </p>
        <Code
          code={`const [open, setOpen] = useState(false)

<Button variant="destructive" onClick={() => setOpen(true)}>Cancel order</Button>
<Modal open={open} close={() => setOpen(false)} label="Cancel order #10482?">
  …
</Modal>`}
        />
      </Section>

      <Section title="Layouts">
        <Table
          head={['Prop', 'Effect']}
          rows={[
            [<C>scrollable</C>, 'The recommended layout. Content fills the dialog and scrolls on its own; a floating header (the label as a quiet title and a close button) and the bottom slot stay put.'],
            [<C>bottom</C>, 'Floating chrome at the bottom of a scrollable dialog. Put the actions here, in a Dock, so they never scroll away.'],
            [<C>top</C>, 'Replaces the default title in the floating header, for a toolbar, tabs or a search field. The close button stays unless showClose is false.'],
            [<C>fitContent</C>, 'With scrollable: the dialog measures its content and floating chrome and grows to fit, up to the viewport. Use it for short forms; long content still scrolls.'],
            [<C>headerless</C>, 'Drops the default header entirely. The content supplies its own heading and a visible way to close.'],
            [<C>showClose</C>, 'false hides the close icon when a visible Cancel or Close action already dismisses the dialog.'],
            [<C>wide</C>, 'A wider dialog (980px instead of 560px), for side-by-side content.'],
          ]}
        />
        <p>
          Without <C>scrollable</C>, the dialog is a plain surface: your content sets its own padding
          and a close icon sits in the top corner. Use that only for very short content such as a
          confirmation.
        </p>
      </Section>

      <Section title="Focus">
        <p>
          The modal opens with the native <C>showModal()</C>, so the rest of the page is inert and
          Tab stays inside the dialog. By default the browser focuses the first focusable element. To
          start somewhere else, pass <C>initialFocusRef</C>, for example the field the person came to
          edit. On close, focus returns to whatever had it before the dialog opened; pass{' '}
          <C>returnFocusRef</C> when that element may disappear, such as a row menu that closes when
          the dialog opens.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Write the label as the task: “Edit delivery address”, “Cancel order #10482?”.',
            'Use scrollable with the actions in a bottom Dock for anything longer than a sentence.',
            <>Use <C>fitContent</C> for short forms so the dialog isn’t taller than its content.</>,
            'Make the destructive choice explicit: “Cancel order”, not “OK”.',
          ]}
          dontItems={[
            <>Render <C>{'{open && <Modal …/>}'}</C>; toggle <C>open</C> instead.</>,
            'Repeat the label as a heading inside a scrollable dialog; the header already shows it.',
            'Stack modals, or open one without a clear way out.',
            'Put a second scroll area inside a scrollable dialog.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The dialog is a native <C>{'<dialog>'}</C> in the browser’s top layer. In a scrollable
          dialog with the default header, it is labelled by the visible title; otherwise{' '}
          <C>label</C> becomes its <C>aria-label</C>. Always pass a meaningful <C>label</C>, even when
          the dialog is headerless. The close button is named from <C>label</C> (“Close Edit delivery
          address”). Escape and backdrop clicks only call <C>close</C> while the dialog is fully open.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves focus to the next control inside the dialog.'],
            ['Shift + Tab', 'Moves focus to the previous control inside the dialog.'],
            ['Escape', 'Calls close.'],
          ]}
        />
        <Callout title="Menus and pickers inside a dialog">
          <p>
            Kit components that open menus or popovers, such as <C>ActionsBar</C> and the date
            fields, detect the enclosing dialog and portal into it, so they stay above it and remain
            reachable.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'modal',
  title: 'Modal',
  group: 'Containment',
  order: 1,
  summary: 'A modal dialog for short, focused tasks, with floating header and actions, focus handling and an exit transition.',
  importLine: "import { Modal } from '@feeef.dev/ui/primitives/modal'",
  source: 'src/primitives/modal.tsx',
  api: ['Modal'],
  keywords: ['dialog', 'popup', 'confirm', 'sheet', 'overlay', 'focus trap'],
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
        width: 200,
        padding: 12,
        display: 'grid',
        gap: 10,
        border: '1px solid var(--lab-line)',
        borderRadius: 16,
        background: 'var(--lab-surface)',
        boxShadow: 'var(--lab-glass-shadow)',
        fontSize: 12,
      }}
    >
      <strong>Cancel order #10482?</strong>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Button variant="text" controlSize="small" tabIndex={-1}>
          Keep
        </Button>
        <Button variant="destructive" controlSize="small" tabIndex={-1}>
          Cancel order
        </Button>
      </div>
    </div>
  ),
})
