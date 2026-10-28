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
            [<C>'peek'</C>, 'Just the grabber and the header: a search field over a map, like Maps. Measured, so it follows the header.'],
            [<C>'medium'</C>, 'Half the screen. Enough for a short list with the page still visible above.'],
            [<C>'large'</C>, 'Full height minus a gap at the top. The page behind recedes like a stacked card.'],
            [<C>'fit'</C>, 'The content plus its header and dock, up to large: the same measured body a Modal hugs with. For short action sheets and forms.'],
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
  title="Filters"
  detents={['medium', 'large']}
  trailing={<ToolbarGroup label="Sheet actions"><Button variant="text" appearance="toolbar">Reset</Button></ToolbarGroup>}
  dock={<PresentationDock><Button variant="filled">Show 24 orders</Button></PresentationDock>}
>
  <ListSection header="Status">…</ListSection>
</Sheet>`}
        />
      </Section>

      <Section title="Floating glass">
        <p>
          A phone sheet with any detent below <C>'large'</C> floats, as in iOS 26 and 27: inset from the
          sides and the bottom, every corner rounded, on the thick glass menus and alerts use. As it rises
          the gap closes and the bottom corners square off, continuously with the finger (a medium sheet
          already sits closer to the edges); over the last stretch the opaque surface fades in, so at full
          height it is an ordinary attached sheet. A sheet with only <C>'large'</C> is attached from the start.
          Force either with <C>floating</C>.
        </p>
        <p>
          The content keeps the floating gap at every height, so nothing reflows while the sheet moves: the
          surface is drawn on its own layer and only it changes. Content that should change with the height
          reads <C>useSheet()</C>: the resting <C>detent</C>, a live <C>expansion</C> (0 low … 1 full, a
          motion value to subscribe to) and <C>setDetent</C>.
        </p>
      </Section>

      <Section title="Living on the page">
        <p>
          A Maps-style sheet never goes away: <C>{`detents={['peek', 'medium', 'large']}`}</C>,{' '}
          <C>{'dismissible={false}'}</C> and a search field as its <C>header</C> (mark it{' '}
          <C>data-lab-sheet-handle</C> so it drags the sheet). <C>backgroundInteraction</C> names the highest
          detent at which the page stays usable: below it there is no dim and taps reach the map; above it the
          page dims, and tapping it (or Escape) brings the sheet back down. Focusing a field at <C>'peek'</C>{' '}
          raises the sheet to its top detent; change that with <C>focusDetent</C>.
        </p>
      </Section>

      <Section title="Growing out of a button">
        <p>
          Pass the button that opens the sheet as <C>source</C>. The sheet grows out of it header first (the
          button hides as the sheet covers it) and flies back into it when it closes from the close bubble,
          the scrim or Escape. A sheet dragged away slides down instead, following the finger.
        </p>
      </Section>

      <Section title="Wide screens">
        <Table
          head={['regular', 'From 720 px (regularBreakpoint)']}
          rows={[
            [<C>'dialog'</C>, 'A centered dialog (default). For tasks: forms, filters, confirmations.'],
            [<C>'card'</C>, 'A floating glass card at the leading edge with the same detents and dragging, like Maps on iPad. For sheets that live on the page.'],
            [<C>'sheet'</C>, 'Still a bottom sheet, kept a readable width.'],
            [<C>'pane'</C>, 'An inspector beside the page: a full-height panel that slides in from the end side. For the details of the thing the page is about.'],
          ]}
        />
      </Section>

      <Section title="Inspector pane">
        <p>
          <C>{'regular="pane"'}</C> shows the details of the order, customer or product the page is about,
          often with a form to change them. On a wide screen it slides in from the end side as a full-height
          opaque panel the shell gap G from the edges, with its close bubble floating beside it, so the page
          stays visible next to it. Below the breakpoint the same content rises from the bottom, so you write
          it once. As a phone sheet it fits its content (<C>{"detents={['fit']}"}</C>; pass{' '}
          <C>{"['large']"}</C> for long lists) and pads 16, a card’s inside.
        </p>
        <Table
          head={['Prop', 'Effect']}
          rows={[
            [<C>paneWidth</C>, 'Width in px, default 420, at most 60% of the window.'],
            [<C>paneSide</C>, <>'end' (default) slides in from the inline end: the right in English, the left in Arabic. 'start' from the other side.</>],
            [<C>{'modal={false}'}</C>, 'No dimming and no focus trap: the page stays usable beside the pane, like an inspector you keep open while picking rows. Escape still closes it while focus is inside.'],
            [<C>container</C>, 'Present inside an element instead of the window (previews). The breakpoint then reads that element’s width.'],
          ]}
        />
        <Callout title="Panes float">
          <p>
            A pane floats over the end of the page; it does not push the page aside. When the details belong in
            the layout (a list and its record side by side), use a <Link to="/components/split-view">split view</Link>{' '}
            or the scaffold’s inspector column instead. Never open a pane from a pane.
          </p>
        </Callout>
        <Code
          lang="dart"
          code={`final saved = await showSheet<Customer>(
  context,
  builder: (context) => Sheet(
    regular: SheetRegular.pane,
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

      <Section title="Header and dock">
        <p>
          A sheet is made of the same parts as <Link to="/components/modal">Modal</Link>: a floating glass header (<C>title</C>, <C>trailing</C>{' '}
          bubbles and a close bubble, or your own <C>header</C>), the scrolling body, and a <C>dock</C> of
          actions floating at the bottom. Set <C>{'showClose={false}'}</C> when a visible Done or Cancel
          already closes it.
        </p>
      </Section>

      <Section title="Dragging">
        <Table
          head={['Where', 'What the drag does']}
          rows={[
            ['Grabber, header and dock', 'Always moves the sheet.'],
            ['Content, finger moving down', 'Scrolls the content. When the content is already at the top, pulling down drags the sheet instead, and a pull past the lowest detent closes it.'],
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
          the scrim, <kbd>Escape</kbd> and the close bubble call <C>onOpenChange(false)</C>. In Flutter,{' '}
          <C>await showSheet&lt;T&gt;(context, builder: …)</C> shows one from an event and completes with what
          you pass to <C>Navigator.pop(context, value)</C>. Set{' '}
          <C>{'dismissible={false}'}</C> when closing would lose unsaved work: then only your own
          actions close it, and the sheet rubber-bands instead of leaving.
        </p>
        <DoDont
          doItems={[
            'Put the sheet’s one main action in its dock, and a Reset or Done in the header’s trailing bubbles.',
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
          <C>{'modal={false}'}</C> keeps the page usable around the sheet at every height (no scrim, no
          Escape dismissal), for a mini player. For a sheet that should dim only when raised, use{' '}
          <C>backgroundInteraction</C> instead.
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
  summary: 'An iOS-style bottom sheet: floating glass detents that reach the edges as it rises, momentum, scroll handoff, morphing out of its button, a dialog or a card on wide screens.',
  importLine: "import { Sheet } from '@feeef.dev/ui/containers'",
  source: 'src/containers/sheet.tsx',
  api: ['Sheet', 'useSheet'],
  keywords: ['inspector', 'side panel', 'pane', 'details', 'maps', 'floating', 'liquid glass', 'morph', 'peek', 'bottom sheet', 'drawer', 'detent', 'action sheet', 'half sheet', 'panel', 'ios'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
