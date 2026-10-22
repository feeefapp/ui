import { useState, type ComponentType, type ReactNode } from 'react'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { definePage, examplesFrom, type DocExample } from '../../../src/model'
import { Link } from '../../../src/router'
import { C } from '../../../src/blocks/code'
import { Example } from '../../../src/blocks/example'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import './patterns.css'

const EXAMPLES = examplesFrom(
  import.meta.glob('./examples/*.tsx', { eager: true }),
  import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
  import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
)
const example = (id: string) => EXAMPLES.find((e) => e.id === id)!

/** Page-only harness: lets the reader flip a demo between a desktop column and a phone width. */
function withWidthToggle(ex: DocExample): DocExample {
  const Demo: ComponentType = () => {
    const [width, setWidth] = useState<'desktop' | 'phone'>('desktop')
    return (
      <div className="pt-preview">
        <SegmentedControl<'desktop' | 'phone'>
          label="Preview width"
          value={width}
          onChange={setWidth}
          options={[
            { value: 'desktop', label: 'Desktop' },
            { value: 'phone', label: 'Phone' },
          ]}
        />
        <div className="pt-preview-box" data-phone={width === 'phone' || undefined}>
          <ex.Demo />
        </div>
      </div>
    )
  }
  return { ...ex, Demo }
}

const DETAIL = withWidthToggle(example('02-order-detail'))

function Anatomy({ items }: { items: [string, ReactNode][] }) {
  return (
    <ol>
      {items.map(([name, text]) => (
        <li key={name}>
          <strong>{name}</strong>: {text}
        </li>
      ))}
    </ol>
  )
}

function Overview() {
  return (
    <>
      <Lead>
        Most Feeef screens are one of a handful of patterns: a list of orders, one order, a settings form,
        a confirmation. Start from the recipe instead of a blank page; each one is built only from kit
        components and follows the <Link to="/guidelines/layout">layout</Link> and{' '}
        <Link to="/guidelines/principles">principles</Link>.
      </Lead>
      <Callout title="The demos are app code">
        <p>
          Open “Show code” on any demo: that is what you write in your page. Each demo sits in a fixed box
          standing in for the scaffold’s content panel; in an app, the <C>top</C> and <C>bottom</C> floats go
          in <C>Scaffold</C>’s <C>appBar</C> and <C>bottom</C> slots instead.
        </p>
      </Callout>

      <Section title="List">
        <p>
          For any collection people scan, narrow down and act on: orders, confirmation queues, products,
          customers, deliveries. It is the most used screen in every Feeef app, so it gets the most care.
        </p>
        <Anatomy
          items={[
            ['Floating bar', 'the filter bar with pinned filters and search, floating over the list.'],
            ['Rows', 'one opaque row per item with the two or three facts people decide on: number and customer, wilaya and courier, total and state.'],
            ['Selection', 'a checkbox per row and a select-all with a count. Selecting changes the dock.'],
            ['Dock', 'the page’s primary action when nothing is selected (New order); actions on the selection when something is (Confirm 3).'],
            ['No results', 'says why and offers to clear the search and filters.'],
          ]}
        />
        <Example example={example('01-orders-list')} headingLevel={3} />
        <DoDont
          doItems={[
            <>Filter with <Link to="/components/filter-bar">FilterBar</Link>; pin the two or three filters people use daily.</>,
            'Swap the dock’s content on selection (swapKey) and keep one filled action in it.',
            'Show the count of what is selected and a way to clear it.',
            'Keep rows short: identity first, numbers aligned at the end.',
          ]}
          dontItems={[
            'Put Confirm, Call and Cancel buttons on every row.',
            'Paint a header row of column titles over a phone list.',
            'Leave a blank area when nothing matches.',
            'Add a second toolbar for bulk actions above the list.',
          ]}
        />
      </Section>

      <Section title="Detail with inspector">
        <p>
          For one record people work on: an order during a confirmation call, a product, a delivery. The
          record’s story (products, calls, notes) fills the middle; its facts (status, phone, courier,
          totals) sit in an inspector at the end, in the order of{' '}
          <Link to="/guidelines/principles#navigation-work-details">navigation, work, details</Link>.
        </p>
        <Anatomy
          items={[
            ['App bar', 'a navigation bubble with Back and the record name; a tools bubble with Call, Print and, when narrow, Details.'],
            ['Content', 'the record’s story on surfaces: products, call log, customer note.'],
            ['Inspector', 'a sticky surface at the end with the facts. Below about 640px of content it moves into a dialog behind the Details tool.'],
            ['Dock', 'the next step in the workflow, one filled action (Confirm order) and a tonal alternative.'],
          ]}
        />
        <Example example={DETAIL} headingLevel={3} />
        <DoDont
          doItems={[
            'Decide by the content width, not the window: the same screen can be in a split view.',
            'Keep the inspector one tap away on phones (a tool in the app bar), never removed.',
            'Mirror the back arrow in right-to-left (lab-dir-flip).',
          ]}
          dontItems={[
            'Squeeze the inspector into a 200px column on a phone.',
            'Put the primary action in the inspector; it belongs in the dock.',
            'Use tabs to separate details that people need at the same time.',
          ]}
        />
      </Section>

      <Section title="Form and settings">
        <p>
          For anything people fill in and save: store settings, delivery prices, a new product. Group fields
          into a few titled sections on surfaces, and save them with one button.
        </p>
        <Anatomy
          items={[
            ['Sections', 'a title, one line on what it affects, then fields in a grid that wraps to one column on phones.'],
            [
              'Fields',
              'TextField and Select with a hint (their name), NumberField for amounts with a unit, checkboxes for on/off choices that wait for Save.',
            ],
            ['Dock', 'Save changes, enabled only when something changed, with Discard next to it. The status tile says whether everything is saved.'],
            ['Validation', 'at the field, on blur and on save; the first invalid field takes focus.'],
          ]}
        />
        <Example example={example('03-store-settings')} headingLevel={3} />
        <Table
          head={['Choice', 'Control', 'Saves']}
          rows={[
            ['Text, phone, address', <Link to="/components/text-field">TextField</Link>, 'With the form'],
            ['One of many (wilaya, courier)', <Link to="/components/select">Select</Link>, 'With the form'],
            ['Money, counts, percentages', <Link to="/components/number-field">NumberField</Link>, 'With the form'],
            ['On/off inside the form', <Link to="/components/checkbox">Checkbox</Link>, 'With the form'],
            ['On/off that applies right away', <Link to="/components/switch">SlideSwitch</Link>, 'Immediately, with loading; never in a form with Save'],
          ]}
        />
        <DoDont
          doItems={[
            'One Save for the page, in the dock.',
            'Errors that say how to fix it, under the field (see the writing principle).',
            'Keep the form’s Save disabled until there is something to save.',
          ]}
          dontItems={[
            'A Save button per section, or Save at the top and the bottom.',
            'A switch whose change silently waits for Save.',
            'Validate on every keystroke before people finish typing, or only in a toast.',
          ]}
        />
      </Section>

      <Section title="Confirm a destructive action">
        <p>
          For anything that loses work or can’t be undone: cancelling an order, deleting a product, removing
          an agent. If the action can be undone, don’t ask; do it and offer Undo instead.
        </p>
        <Anatomy
          items={[
            ['Title', 'the exact question with the object: “Cancel order #1048?”, not “Are you sure?”.'],
            ['Consequence', 'what happens to the customer, the stock and the record, and whether it can be undone.'],
            ['Input, if needed', 'a reason people will report on. Keep it to one field.'],
            ['Actions', <>a <C>text</C> button that keeps things as they are (“Keep order”) and a <C>destructive</C> button that repeats the verb.</>],
          ]}
        />
        <Example example={example('04-cancel-order')} headingLevel={3} />
        <DoDont
          doItems={[
            <>Use <Link to="/components/modal">Modal</Link> with <C>{'showClose={false}'}</C> when Keep already dismisses it.</>,
            'Name both buttons with verbs; the safe one is never filled.',
            'Return focus to the button that opened the dialog.',
          ]}
          dontItems={[
            '“Are you sure?” with OK and Cancel: on a cancel dialog, “Cancel” is ambiguous.',
            'Make the destructive button the default for Enter.',
            'Confirm actions that are easy to undo.',
          ]}
        />
      </Section>

      <Section title="Empty, loading and error states">
        <p>
          Every list and every page has these three states. Each one says what is happening and offers the
          next step; none is a dead end (<Link to="/guidelines/principles#speak-like-a-colleague">speak like a helpful colleague</Link>).
        </p>
        <Table
          head={['State', 'It says', 'It offers']}
          rows={[
            ['Loading', 'What is loading, once, calmly. A PixelLoader with a label.', 'Nothing to do yet; keep earlier content on screen while refreshing.'],
            ['Empty (never had data)', 'What this place is for and where items come from.', 'The first step: Copy store link, Add an order.'],
            ['No results (filtered)', 'That nothing matches the current search or filters.', 'Clear search and filters.'],
            ['Error', 'What failed and that nothing was lost.', 'Try again; a way to get help if it keeps failing.'],
          ]}
        />
        <Example example={example('05-states')} headingLevel={3} />
        <DoDont
          doItems={[
            <>One <Link to="/components/pixel-art">PixelLoader</Link> for the region, with a label that names what loads.</>,
            'Keep the old rows visible while a list refreshes; show the loader only on first load.',
            'Put the next step in a tonal button inside the state.',
          ]}
          dontItems={[
            'A spinner per row, or skeletons that flash for 100 ms.',
            '“No data”, “Something went wrong” or an error code with no way forward.',
            'Show an error only as a toast that disappears.',
          ]}
        />
      </Section>

      <Section title="In place, dialog or page">
        <p>Choose where an edit happens by how much changes together and how long it takes.</p>
        <Table
          head={['Edit', 'Use', 'Example']}
          rows={[
            ['One field, one value, seconds', 'In place: the row becomes a field with Save and Cancel; Enter saves, Escape restores', 'Fix a customer’s phone during a call'],
            ['A few fields that must change together', 'A dialog with its actions in a dock', 'Change the delivery address'],
            ['Many fields, long work, or a link people share', 'A page of its own, with Back', 'Edit products, prices and delivery of an order'],
          ]}
        />
        <Example example={example('06-quick-edit')} headingLevel={3} />
        <DoDont
          doItems={[
            'Keep in-place edits to one field, and focus it when it opens.',
            <>Use <C>Modal scrollable</C> with a dock for dialogs that hold a form.</>,
            'Open a page when the edit needs its own URL, history or undo.',
          ]}
          dontItems={[
            'Open a dialog to change one number.',
            'Put a whole order form in a dialog on a phone.',
            'Open a dialog from a dialog; move the work to a page instead.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'guidelines',
  id: 'patterns',
  title: 'Page patterns',
  order: 4,
  summary:
    'Recipes for the screens Feeef apps have: lists, details with an inspector, settings forms, confirmations, empty and error states, and where edits happen.',
  keywords: ['recipes', 'list', 'detail', 'inspector', 'form', 'settings', 'empty state', 'error state', 'loading', 'confirmation', 'bulk actions', 'inline edit'],
  Overview,
})
