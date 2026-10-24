import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          A pane is an inspector beside the page: the details of the order, customer or product the page
          is about, often with a form to change them. On a wide screen it slides in from the end side as
          a full-height panel, so the page stays visible next to it. Below the compact breakpoint (720px)
          the same pane presents as a bottom <Link to="/components/sheet">sheet</Link>, so you write the
          content once.
        </p>
        <p>
          Use a <Link to="/components/modal">modal</Link> for a short task that doesn’t need the page in
          view, an <Link to="/components/modal">alert</Link> for a decision, and a{' '}
          <Link to="/components/split-view">split view</Link> when the list and its details are the whole
          page.
        </p>
      </Section>

      <Section title="Anatomy">
        <Table
          head={['Part', 'What it is']}
          rows={[
            ['Panel', 'The opaque kit surface with panel corners and a 1px line, full height, the shell gap G from the screen edges. Content scrolls inside it.'],
            ['Close bubble', 'A glass bubble floating beside the panel, at its top. As a sheet it moves into the header.'],
            [<C>title</C>, 'The title bubble of the floating glass header (PresentationHeader). trailing adds bubbles after it.'],
            [<C>dock</C>, 'Floating actions at the bottom, usually a PresentationDock: Cancel as text, the main action filled.'],
          ]}
        />
        <Code
          code={`const [open, setOpen] = useState(false)

<Pane
  open={open}
  onOpenChange={setOpen}
  label="Edit customer"
  title="Edit customer"
  dock={
    <PresentationDock>
      <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="filled" onClick={save}>Save customer</Button>
    </PresentationDock>
  }
>
  <TextField hint="Name" />
  …
</Pane>`}
        />
      </Section>

      <Section title="Options">
        <Table
          head={['Prop', 'Effect']}
          rows={[
            [<C>width</C>, 'Width in px, default 420, at most 60% of the window.'],
            [<C>side</C>, <>'end' (default) slides in from the inline end: the right in English, the left in Arabic. 'start' from the other side.</>],
            [<C>{'modal={false}'}</C>, 'No dimming and no focus trap: the page stays usable beside the pane, like an inspector you keep open while picking rows. Escape still closes it while focus is inside.'],
            [<C>fill</C>, 'As a sheet, open at full height instead of fitting the content (long lists).'],
            [<C>compactBreakpoint</C>, 'The width below which it is a sheet. Default 720.'],
            [<C>container</C>, 'Present inside an element instead of the window (previews like the phone below). The breakpoint then reads that element’s width.'],
          ]}
        />
        <Callout title="Non-modal panes float">
          <p>
            A non-modal pane floats over the end of the page; it does not push the page aside. When the
            details belong in the layout (a list and its record side by side), use a{' '}
            <Link to="/components/split-view">split view</Link> or the scaffold’s inspector column instead.
          </p>
        </Callout>
      </Section>

      <Section title="In Flutter">
        <p>
          The widget is declared the same way (<C>Pane(open: …, onOpenChange: …)</C>). To show one from an
          event and wait for its result, use <C>showPane</C>; close it with{' '}
          <C>Navigator.pop(context, value)</C>. It works in a plain <C>WidgetsApp</C>.
        </p>
        <Code
          lang="dart"
          code={`final saved = await showPane<Customer>(
  context,
  builder: (context) => Pane(
    label: 'Edit customer',
    title: const Text('Edit customer'),
    dock: PresentationDock(children: [
      Button(onClick: () => Navigator.pop(context), children: const [Text('Cancel')]),
      Button(variant: .filled, onClick: () => Navigator.pop(context, draft), children: const [Text('Save customer')]),
    ]),
    child: form,
  ),
);`}
        />
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Show the details of the thing the page is about, and keep the page in view.',
            'Put the one main action last in the dock; Cancel as text before it.',
            'Write the label as the task or the record: “Edit customer”, “Order #10482”.',
          ]}
          dontItems={[
            'Open a pane from a pane, or a modal from a pane.',
            'Use a pane for a yes/no decision; that is an alert.',
            'Put a second scroll area inside the pane.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          A modal pane is a dialog in the browser’s top layer: the page is inert, focus moves inside and
          returns to the opener when it closes. It is named by its visible title, or by <C>label</C>. The
          close bubble is named from <C>label</C> (“Close Edit customer”). With reduced motion it fades
          instead of sliding.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves through the pane’s controls.'],
            ['Escape', 'Closes it (when dismissible).'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'pane',
  title: 'Pane',
  group: 'Containment',
  order: 1.5,
  summary: 'An inspector beside the page that slides in from the end side, and becomes a bottom sheet on phones.',
  importLine: "import { Pane, PresentationDock } from '@feeef.dev/ui/presentation'",
  source: 'src/presentation/pane.tsx',
  api: ['Pane', 'PresentationHeader', 'PresentationBody', 'PresentationDock'],
  keywords: ['inspector', 'side panel', 'drawer', 'details', 'panel', 'showPanel', 'showPane'],
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
        height: 120,
        display: 'grid',
        gridTemplateColumns: '1fr 96px',
        gap: 6,
        padding: 6,
        borderRadius: 16,
        background: 'var(--lab-ground)',
        boxShadow: 'var(--lab-glass-shadow)',
      }}
    >
      <div style={{ borderRadius: 10, background: 'color-mix(in srgb, var(--lab-ink) 6%, transparent)' }} />
      <div style={{ display: 'grid', alignContent: 'start', gap: 6, padding: 8, border: '1px solid var(--lab-line)', borderRadius: 12, background: 'var(--lab-surface)', fontSize: 11 }}>
        <strong>Order #10482</strong>
        <span style={{ color: 'var(--lab-muted)' }}>Amina Benali</span>
        <span style={{ color: 'var(--lab-muted)' }}>4,500 DA</span>
      </div>
    </div>
  ),
})
