import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          A sheet rises from the bottom for a task that belongs to the current page: filtering it,
          contacting the customer on screen, editing one field group. The page stays where it is,
          dimmed behind, and comes back the moment the sheet goes down. On wide screens the same
          sheet becomes a centered dialog.
        </p>
        <p>
          Use a <Link to="/components/navigation-stack">navigation stack</Link> when the person is
          going somewhere (a new page with its own back), and a{' '}
          <Link to="/components/modal">modal</Link> for a blocking confirmation that must be answered.
          Use a popover for a few options anchored to a control on a wide screen.
        </p>
      </Section>

      <Section title="Detents">
        <p>
          A detent is a height the sheet rests at. Pass one or more; the sheet opens at the first (or{' '}
          <C>defaultDetent</C>) and the person drags or taps the grabber between them.
        </p>
        <Table
          head={['Detent', 'Height']}
          rows={[
            [<C>'medium'</C>, 'Half the screen. Enough for a short list with the page still visible above.'],
            [<C>'large'</C>, 'Full height minus a gap at the top. The page behind recedes like a stacked card.'],
            [<C>'fit'</C>, 'The content’s height, up to large. For short action sheets and forms.'],
            [<C>{'240'}</C>, 'A pixel height.'],
            [<C>'35%'</C>, 'A share of the screen height.'],
          ]}
        />
        <Code
          code={`const [open, setOpen] = useState(false)

<Sheet
  open={open}
  onOpenChange={setOpen}
  label="Filters"
  detents={['medium', 'large']}
  top={<ToolbarGroup label="Sheet title"><strong>Filters</strong></ToolbarGroup>}
  bottom={<Dock label="Apply filters"><Button variant="filled">Show 24 orders</Button></Dock>}
>
  <ListSection header="Status">…</ListSection>
</Sheet>`}
        />
      </Section>

      <Section title="Dragging">
        <Table
          head={['Where', 'What the drag does']}
          rows={[
            ['Grabber, top and bottom chrome', 'Always moves the sheet.'],
            ['Content, finger moving down', 'Scrolls the content; once it is at the top, the same direction drags the sheet down.'],
            ['Content, finger moving up', 'Grows the sheet to its next detent first, then scrolls.'],
            ['Mouse', 'The grabber and the chrome; the content keeps text selection.'],
          ]}
        />
        <p>
          The sheet follows the finger 1:1 and rubber-bands past its highest detent. On release it
          projects the flick’s momentum and settles on the nearest detent, or closes when the
          projection lands below the lowest one. The grabber is also a button: press it (or use the
          arrow keys) to step through the heights.
        </p>
      </Section>

      <Section title="Closing">
        <p>
          <C>Sheet</C> is controlled and stays mounted; toggle <C>open</C>. A drag down, a tap on
          the scrim and <kbd>Escape</kbd> call <C>onOpenChange(false)</C>. Set{' '}
          <C>{'dismissible={false}'}</C> when closing would lose unsaved work: then only your own
          actions close it, and the sheet rubber-bands instead of leaving.
        </p>
        <DoDont
          doItems={[
            'Put the sheet’s one main action in a bottom dock, and a Reset or Done in the top chrome.',
            'Keep sheets to one level. Push a page inside the sheet’s own stack if the task needs depth.',
          ]}
          dontItems={['Open a sheet from a sheet.', 'Use a sheet for navigation the person would expect to go back from.']}
        />
      </Section>

      <Section title="The page behind">
        <p>
          A modal sheet dims the page. When a sheet rises to full height on a phone, the element marked{' '}
          <C>data-lab-sheet-backdrop</C> (the scaffold root, or your own) recedes: it scales back,
          moves down and rounds its corners, as the person’s attention moves to the sheet. Turn it off
          with <C>{'recede={false}'}</C>.
        </p>
        <p>
          <C>{'modal={false}'}</C> keeps the page usable around the sheet (no scrim, no Escape), for a
          results sheet over a map or a mini player.
        </p>
      </Section>

      <Section title="Embedding">
        <Callout tone="note" title="Top layer or a container">
          By default the sheet renders in the browser’s top layer, so nothing can cover it and the
          page is inert while it is open. Pass <C>container</C> to render inside an element instead
          (that element must be positioned): for previews like the phone frames on this page, or a
          sheet that belongs to one pane of a split view.
        </Callout>
      </Section>

      <Section title="Accessibility">
        <ul>
          <li>The sheet is a modal dialog named by <C>label</C>; focus moves into it and returns to the trigger when it closes.</li>
          <li>The grabber is a labelled button; arrow keys and presses change the height without dragging.</li>
          <li>With reduced motion the sheet fades in and out; dragging still follows the finger.</li>
        </ul>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'sheet',
  title: 'Sheet',
  group: 'Containment',
  order: 2,
  summary: 'A bottom sheet with detents, momentum and scroll handoff that becomes a dialog on wide screens.',
  importLine: "import { Sheet } from '@feeef.dev/ui/containers'",
  source: 'src/containers/sheet.tsx',
  api: ['Sheet'],
  keywords: ['bottom sheet', 'drawer', 'detent', 'action sheet', 'half sheet', 'panel', 'ios'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
