import { useMemo, useState, type ReactNode } from 'react'
import { Columns3, List, Printer, Tag, Truck } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Checkbox, RadioGroup } from '@feeef.dev/ui/primitives/choice'
import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'
import { DateRangeField } from '@feeef.dev/ui/primitives/temporal-field'
import { Modal } from '@feeef.dev/ui/presentation'
import { Dock } from '@feeef.dev/ui/dock'
import { ActionsBar, type Action } from '@feeef.dev/ui/actions'
import { AutoHeight } from '@feeef.dev/ui/motion'
import { definePage } from '../../../src/model'
import { Link } from '../../../src/router'
import { C } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Compare } from '../_lib/compare'
import './choosing.css'

/** A question-led decision flow: ask in order, the first yes decides. */
function Flow({ steps }: { steps: [question: ReactNode, answer: ReactNode][] }) {
  return (
    <ol className="gl-flow">
      {steps.map(([question, answer], i) => (
        <li key={i}>
          <span className="gl-flow-q">{question}</span>
          <span className="gl-flow-a">{answer}</span>
        </li>
      ))}
    </ol>
  )
}

/* ---------- Demos ---------- */

function SelectionDock() {
  const actions = useMemo<Action[]>(
    () => [
      { id: 'tag', type: 'action', label: 'Add tag', icon: <Tag />, priority: 0, onAction: () => {} },
      { id: 'print', type: 'action', label: 'Print labels', icon: <Printer />, priority: 1, onAction: () => {} },
      { id: 'ship', type: 'action', label: 'Ship orders', icon: <Truck />, variant: 'filled', priority: 10, onAction: () => {} },
    ],
    []
  )
  return (
    <Dock label="Actions for 3 selected orders">
      <ActionsBar label="Selected orders" actions={actions} size="small" />
    </Dock>
  )
}

function ScatteredIcons() {
  return (
    <div className="demo-row" style={{ gap: 20 }}>
      <IconButton variant="elevated" aria-label="Add tag">
        <Tag size={20} />
      </IconButton>
      <IconButton variant="filled" aria-label="Ship orders">
        <Truck size={20} />
      </IconButton>
      <IconButton variant="elevated" aria-label="Print labels">
        <Printer size={20} />
      </IconButton>
    </div>
  )
}

function ViewSwitchGood() {
  const [view, setView] = useState<'list' | 'board'>('list')
  return (
    <SegmentedControl
      label="Orders view"
      className="demo-segmented-box"
      value={view}
      onChange={setView}
      options={[
        { value: 'list', label: 'List', icon: <List /> },
        { value: 'board', label: 'Board', icon: <Columns3 /> },
      ]}
    />
  )
}

function ViewSwitchBad() {
  return (
    <div className="demo-column">
      <RadioGroup
        label="Orders view"
        defaultValue="list"
        options={[
          { value: 'list', label: 'List' },
          { value: 'board', label: 'Board' },
        ]}
      />
    </div>
  )
}

function SettingsGood() {
  return (
    <div className="demo-column">
      <div className="gl-setting">
        <span aria-hidden="true">Cash on delivery</span>
        <SlideSwitch label="Cash on delivery" defaultChecked />
      </div>
      <div className="gl-setting">
        <span aria-hidden="true">Stop desk delivery</span>
        <SlideSwitch label="Stop desk delivery" />
      </div>
    </div>
  )
}

function SettingsBad() {
  return (
    <div className="demo-column">
      <Checkbox label="Cash on delivery" defaultChecked />
      <Checkbox label="Stop desk delivery" />
      <p className="gl-caption">Saved automatically.</p>
    </div>
  )
}

function ArithmeticField() {
  return (
    <div className="demo-column">
      <NumberField label="Order total" unit="DA" min={0} step={50} defaultValue={3750} />
      <p className="gl-caption">
        Click the value and type <code>1250*3</code>, <code>4500+400</code> or <code>3750*10%</code>.
      </p>
    </div>
  )
}

function PhoneGood() {
  return (
    <div className="demo-column">
      <TextField
        hint="Customer phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue="0555 12 34 56"
        supportingText="10 digits, starting with 05, 06 or 07."
      />
    </div>
  )
}

function PhoneBad() {
  return (
    <div className="demo-column">
      <NumberField label="Customer phone" defaultValue={555123456} />
    </div>
  )
}

function RangeGood() {
  const [period, setPeriod] = useState<{ from: string; to: string } | null>({
    from: '2026-10-01',
    to: '2026-10-21',
  })
  return (
    <div className="demo-column">
      <DateRangeField hint="Orders placed" value={period} onValueChange={setPeriod} />
    </div>
  )
}

function RangeBad() {
  return (
    <div className="demo-column">
      <TextField hint="From" placeholder="DD/MM/YYYY" defaultValue="01/10/2026" />
      <TextField hint="To" placeholder="DD/MM/YYYY" defaultValue="21/10/26" />
    </div>
  )
}

function DetailInline() {
  const [open, setOpen] = useState(false)
  return (
    <div className="gl-card">
      <div className="gl-card-row">
        <strong>Order #10482</strong>
        <Button variant="text" controlSize="small" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Hide address' : 'Show address'}
        </Button>
      </div>
      <AutoHeight>
        {open && <p className="gl-card-detail">Cité 500 logements, bloc C, Bab Ezzouar, 16 · Alger</p>}
      </AutoHeight>
    </div>
  )
}

function DetailModal() {
  const [open, setOpen] = useState(false)
  return (
    <div className="gl-card">
      <div className="gl-card-row">
        <strong>Order #10482</strong>
        <Button variant="text" controlSize="small" onClick={() => setOpen(true)}>
          Show address
        </Button>
      </div>
      <Modal open={open} onOpenChange={setOpen} label="Delivery address" title="Delivery address">
        <p className="gl-modal-body">Cité 500 logements, bloc C, Bab Ezzouar, 16 · Alger</p>
      </Modal>
    </div>
  )
}

function LimitNotice() {
  return (
    <div className="gl-notice" role="status">
      <p>
        <strong>You have used today’s 5 free generations.</strong> They reset at midnight. Add funds to
        keep going now.
      </p>
      <div className="gl-notice-actions">
        <Button variant="filled" controlSize="small">
          Add funds
        </Button>
        <Button variant="text" controlSize="small">
          See plans
        </Button>
      </div>
    </div>
  )
}

function LimitToast() {
  return (
    <div className="demo-column" style={{ justifyItems: 'center' }}>
      <Button variant="filled" className="gl-faded">
        Generate
      </Button>
      <span className="gl-toast" role="status">
        Error 429: quota exceeded
      </span>
    </div>
  )
}

function LoadingGood() {
  return (
    <div className="demo-row">
      <Button variant="text">Cancel</Button>
      <Button variant="filled" loading>
        Ship order
      </Button>
    </div>
  )
}

function LoadingBad() {
  return (
    <div className="demo-column" style={{ justifyItems: 'center' }}>
      <p className="gl-caption">Please wait…</p>
      <div className="demo-row">
        <Button variant="text" disabled>
          Cancel
        </Button>
        <Button variant="filled" disabled>
          Ship order
        </Button>
      </div>
    </div>
  )
}

/* ---------- Page ---------- */

function Overview() {
  return (
    <>
      <Lead>
        Most interface mistakes are a good component in the wrong place: a select for a view switch, a
        modal for one line of text, a toast for a problem someone has to fix. Each guide below asks its
        questions in order. The first yes decides.
      </Lead>
      <Callout title="When nothing here fits">
        <p>
          Decide with the <Link to="/guidelines/principles">Principles</Link>, then read the component’s own
          page. If the kit really has no answer, extend the kit instead of hand-rolling a one-off (
          <Link to="/guidelines/principles#configure-dont-override">principle 10</Link>).
        </p>
      </Callout>

      <Section title="Triggering actions" id="actions">
        <p>
          Start from what the action does, then where it lives. Emphasis comes last: it is decided by how
          many other actions share the view.
        </p>
        <Flow
          steps={[
            [
              'Does it take people to another page?',
              <>
                It is navigation, so it must be a link. Use <C>Button asChild</C> around your router link
                when it should look like a button; people can then open it in a new tab.
              </>,
            ],
            [
              'Is it the action that completes this view?',
              <>
                <C>filled</C>, and only one per view or dialog, at the end of the reading direction (
                <Link to="/guidelines/principles#one-primary-action">principle 2</Link>).
              </>,
            ],
            [
              'Is it one of the task’s actions: the main one, commands for a selection, Save and Cancel?',
              <>
                Put them in a <Link to="/components/dock">Dock</Link> in the bottom slot of the scaffold,
                scroll area or scrollable modal. On phones that is where the thumb already is.
              </>,
            ],
            [
              'Is it one of a few related tools in the app bar: view, zoom, text style?',
              <>
                One <Link to="/components/toolbar">ToolbarGroup</Link> per purpose, with{' '}
                <C>appearance="toolbar"</C> on every control inside (
                <Link to="/guidelines/principles#tools-travel-together">principle 3</Link>).
              </>,
            ],
            [
              'Could the row run out of width on a phone, in French, or with a long selection?',
              <>
                <Link to="/components/actions-bar">ActionsBar</Link>, usually inside the dock. Give the
                main action the highest <C>priority</C>; the rarest go to “More actions” first.
              </>,
            ],
            [
              'Is space tight and the icon one everybody knows?',
              <>
                <C>IconButton</C> with an <C>aria-label</C>. Close, search, back, more, bold. Anything
                people would have to guess gets a text label.
              </>,
            ],
          ]}
        />
        <Table
          head={['Situation', 'Use', 'Why']}
          rows={[
            ['Goes to another page', <><C>Button asChild</C> + router link</>, 'Links open in new tabs and work with the back button.'],
            ['Completes the view', <><C>variant="filled"</C>, once</>, 'People find the next step without reading.'],
            ['Supports the main action', <><C>tonal</C>, <C>outlined</C> or <C>text</C></>, 'Steps down so the main action stays the main one.'],
            ['Deletes or discards', <><C>variant="destructive"</C> + confirmation</>, 'Red keeps its meaning only if it is rare.'],
            ['Task actions of a page or dialog', <C>Dock</C>, 'Floats over content, height is reserved, reachable by thumb.'],
            ['Related tools over the content', <C>ToolbarGroup</C>, 'One glass bubble reads as one thing.'],
            ['More actions than the width allows', <C>ActionsBar</C>, 'Overflows into a menu instead of wrapping or clipping.'],
            ['A well-known icon in tight space', <C>IconButton</C>, 'Compact, but only when nobody has to guess.'],
          ]}
        />
        <Compare
          good={<SelectionDock />}
          goodNote="Selection commands in one dock, labelled, with one filled action; the rarest wait in More actions."
          bad={<ScatteredIcons />}
          badNote="Unlabelled icons spread out: the agent has to hover to learn which truck ships."
        />
        <DoDont
          doItems={[
            <>Show <C>loading</C> on the button while its request runs.</>,
            'Keep the same action in the same place on every screen.',
            'Put destructive actions last in a menu, away from the main action.',
          ]}
          dontItems={[
            <>Use <C>onClick</C> + <C>navigate()</C> on a button where a link belongs.</>,
            'Hide the main action in an overflow menu; give it the highest priority.',
            'Repeat the same action in the app bar and in the dock.',
          ]}
        />
      </Section>

      <Section title="Picking options" id="options">
        <p>
          Three questions decide almost every choice control: is it a view switch, does it apply
          immediately, and how many options are there?
        </p>
        <Flow
          steps={[
            [
              'Does it change what the view shows: List or Board, Day or Week?',
              <>
                <Link to="/components/segmented-control">SegmentedControl</Link>. It is the only view
                and mode picker in the kit, in a glass bubble when it floats and on a plain box in content.
              </>,
            ],
            [
              'Is it on or off for one thing, and does it apply as soon as it is flipped?',
              <>
                <Link to="/components/switch">SlideSwitch</Link>, with no Save button. Show{' '}
                <C>loading</C> while it saves.
              </>,
            ],
            [
              'Is it on or off inside a form that is saved later?',
              <>
                <Link to="/components/checkbox">Checkbox</Link>, with a positive label.
              </>,
            ],
            [
              'Exactly one of two to five options that people should compare?',
              <>
                <Link to="/components/radio-group">RadioGroup</Link>. Descriptions under each option
                explain the difference (“Stop desk: the customer picks it up”).
              </>,
            ],
            [
              'Exactly one of a longer or familiar list: wilaya, courier, currency?',
              <>
                <Link to="/components/select">Select</Link>. Hundreds of items, such as products or
                communes, need a searchable picker instead.
              </>,
            ],
            [
              'Any number of items?',
              <>
                Checkboxes in a fieldset. To narrow a list, use the{' '}
                <Link to="/components/filter-bar">filter bar</Link> instead.
              </>,
            ],
          ]}
        />
        <Table
          head={['Options', 'Applies', 'Is it a view?', 'Use']}
          rows={[
            ['2–5 short', 'Immediately', 'Yes', <C>SegmentedControl</C>],
            ['Statuses of one list, with counts', 'Immediately', 'Yes', <><C>SegmentedControl</C> with badges (scrolls)</>],
            ['1 (on/off)', 'Immediately', 'No', <C>SlideSwitch</C>],
            ['1 (on/off)', 'With the form', 'No', <C>Checkbox</C>],
            ['2–5, worth comparing', 'With the form', 'No', <C>RadioGroup</C>],
            ['About 6 or more', 'Either', 'No', <C>Select</C>],
            ['Any number', 'With the form', 'No', <>Several <C>Checkbox</C></>],
            ['Narrowing a list', 'Immediately', 'No', <C>FilterBar</C>],
          ]}
        />
        <Compare
          good={<ViewSwitchGood />}
          goodNote="A view switch is a segmented control: compact, applies at once, reads as a mode."
          bad={<ViewSwitchBad />}
          badNote="Radios look like a form question, so people look for a Save button that isn’t there."
        />
        <Compare
          good={<SettingsGood />}
          goodNote="Settings that save on their own are switches: flipping one is the whole action."
          bad={<SettingsBad />}
          badNote="Checkboxes promise a Save step. A caption saying “saved automatically” is a sign of the wrong control."
        />
      </Section>

      <Section title="Entering values" id="values">
        <p>
          Ask what the value is, not what it looks like. A phone number is made of digits but it is not a
          number; a price is.
        </p>
        <Flow
          steps={[
            [
              'Is it a day, a time, or a span of either?',
              <>
                The <Link to="/components/date-time-fields">date and time fields</Link>: pick the wrapper
                that names the value (<C>DateField</C>, <C>DateRangeField</C>…). One range field,
                never two date fields.
              </>,
            ],
            [
              'Is it an identifier made of digits: phone, order number, tracking code, postal code?',
              <>
                <Link to="/components/text-field">TextField</Link> with <C>inputMode="tel"</C> or{' '}
                <C>"numeric"</C>. Leading zeros and spaces must survive, and nobody scrubs a phone number.
              </>,
            ],
            [
              'Is it an amount people set, adjust or work out: price, fee, quantity, stock?',
              <>
                <Link to="/components/number-field">NumberField</Link> with a <C>unit</C> and a real{' '}
                <C>step</C>. Leave out <C>max</C> for open-ended amounts.
              </>,
            ],
            [
              'Is it a position in a known range, where the effect matters more than the exact number?',
              <>
                <Link to="/components/slider">Slider</Link> with the value shown next to it: a discount,
                an image strength, a volume. In a dense panel, a bounded <C>NumberField</C> does the same
                in one row.
              </>,
            ],
            ['Anything else people type?', <><C>TextField</C>; <C>multiline</C> for notes and addresses.</>],
          ]}
        />
        <Table
          head={['Value', 'Use', 'Set']}
          rows={[
            ['Customer name, address, note', <C>TextField</C>, <><C>autoComplete</C>, <C>multiline</C> for long text</>],
            ['Phone number', <C>TextField</C>, <><C>type="tel"</C>, <C>inputMode="tel"</C>, a <C>+213</C> prefix in <C>leading</C> if needed</>],
            ['Order number, tracking code', <C>TextField</C>, <C>inputMode="numeric"</C>],
            ['Price, delivery fee, quantity', <C>NumberField</C>, <><C>unit="DA"</C>, <C>{'min={0}'}</C>, <C>step</C></>],
            ['Discount, strength, rating', <><C>Slider</C> or bounded <C>NumberField</C></>, <><C>min</C>, <C>max</C>, <C>getValueText</C></>],
            ['Delivery date, callback time', <><C>DateField</C>, <C>TimeField</C></>, <><C>min</C>, presets like Today and Tomorrow</>],
            ['Report period, working hours', <><C>DateRangeField</C>, <C>TimeRangeField</C></>, 'Presets that match the task'],
          ]}
        />
        <Section title="When typed arithmetic helps" id="arithmetic" level={3}>
          <p>
            <C>NumberField</C> evaluates what people type: <C>1250*3</C>, <C>(4500+900)/2</C>,{' '}
            <C>2000*15%</C>. It saves a trip to the calculator whenever the number comes from other
            numbers:
          </p>
          <ul>
            <li>A unit price times a quantity, when an agent rebuilds an order on the phone.</li>
            <li>A product price plus the delivery fee for the customer’s wilaya.</li>
            <li>A percentage discount or commission on a known amount.</li>
            <li>Splitting one courier invoice over several orders.</li>
          </ul>
          <p>
            Say so in supporting text or onboarding the first time; people don’t expect it. Never use it
            for identifiers, where <C>05-55</C> would become a subtraction.
          </p>
          <div className="docs-stage">
            <ArithmeticField />
          </div>
        </Section>
        <Compare
          good={<PhoneGood />}
          goodNote="A phone number is text: the leading zero, the spaces and the phone keypad all survive."
          bad={<PhoneBad />}
          badNote="As a number it loses its zero, can be dragged to another customer, and reads as a quantity."
        />
        <Compare
          good={<RangeGood />}
          goodNote="One range field: presets, a calendar, and an end that can’t come before the start."
          bad={<RangeBad />}
          badNote="Two typed dates: every agent invents a format, and the second one is already wrong."
        />
      </Section>

      <Section title="Showing more" id="more">
        <p>
          More detail can open over the page, next to it, inside it, or on its own page. Choose by how
          much the person still needs the page they are on.
        </p>
        <Flow
          steps={[
            [
              'Must the person decide or finish something before going on?',
              <>
                A decision is an <Link to="/components/modal">Alert</Link>: confirming a cancellation,
                discarding changes. A short form is a <Link to="/components/modal">Modal</Link> with its
                actions in a dock: editing an address, choosing a courier. Never a dialog from a dialog.
              </>,
            ],
            [
              'Does the person need the page in view while working: the details of the order or customer the page is about?',
              <>
                A <Link to="/components/pane">Pane</Link>: an inspector that slides in beside the page on
                wide screens and becomes a bottom sheet on phones.
              </>,
            ],
            [
              'Is it a short task about this page that should not take the person away: filters, contact options, a quick edit?',
              <>
                A <Link to="/components/sheet">Sheet</Link>. It rises from the bottom on phones (half
                height, growing to full when dragged) and becomes a centered dialog on wide screens. The page
                stays behind it, dimmed.
              </>,
            ],
            [
              'Is it a small detail or a few quick controls tied to one element?',
              <>
                A popover on <Link to="/components/popover-surface">PopoverSurface</Link>: a delivery
                note, a sort menu, a row’s actions. It closes when people click away, so it never holds
                work they could lose.
              </>,
            ],
            [
              'Does it belong to the thing on screen, and is it worth seeing together with it?',
              <>
                Expand it inline: an address, advanced options, an order’s call history. Wrap it in{' '}
                <C>AutoHeight</C> so the height change is explained, not a jump.
              </>,
            ],
            [
              'Do people open item after item from a list and keep the list in view?',
              <>
                A <Link to="/components/split-view">SplitView</Link>: list and item side by side on wide
                screens, the item pushed over the list on phones. For editing properties of a selection, an
                inspector at the end of the layout (
                <Link to="/guidelines/principles#navigation-work-details">principle 4</Link>).
              </>,
            ],
            [
              'Is the person going deeper into one thing and expecting to come back the same way?',
              <>
                Push a page on a <Link to="/components/navigation-stack">NavigationStack</Link>: back button
                with the previous title, swipe back, and the previous page exactly as it was left. When the page
                grows out of a card (a product, a photo), push it with a zoom.
              </>,
            ],
            [
              'Is it a place of its own: long, linkable, something people come back to?',
              'A new page with its own URL: an order’s full detail, a report, a settings area. In a stack, keep the path in the URL.',
            ],
          ]}
        />
        <Table
          head={['Need', 'Use', 'Behavior']}
          rows={[
            ['A decision that blocks the rest', <C>Alert</C>, 'Two or three choices on glass; Escape runs Cancel; focus returns.'],
            ['A short form that blocks the rest', <C>Modal</C>, 'Page is inert; the actions float in a dock; focus returns.'],
            ['Details of the thing the page is about', <C>Pane</C>, 'Beside the page when wide, a sheet on phones.'],
            ['A short task about the page, mostly on phones', <C>Sheet</C>, 'Detents, drag and flick; a dialog on wide screens.'],
            ['Going deeper and coming back', <C>NavigationStack</C>, 'Push and pop, swipe back, pages stay mounted.'],
            ['Many items from one list', <C>SplitView</C>, 'Side by side when wide, a stack on phones.'],
            ['Top-level places on a phone', <C>TabView</C>, 'Each tab keeps its stack; the bar shrinks while reading.'],
            ['Browsing a few items sideways', <C>Carousel</C>, 'Snap paging, a peek of the next item, never auto-advancing.'],
            ['Fresh data in a list people keep open', <><C>ScrollArea onRefresh</C> + a Refresh button</>, 'Pull at the top on touch; the button runs the same RefreshController.'],
            ['A glance or a quick control on one element', <>Popover on <C>PopoverSurface</C></>, 'Anchored, light, dismissed by clicking away.'],
            ['A few more lines about the same thing', <>Inline, in <C>AutoHeight</C></>, 'Stays in context; nothing covers the page.'],
            ['Properties of the selected item', <>Inspector column, or a <C>Pane</C></>, 'List and details visible together; a sheet on phones.'],
            ['Long or shareable content', 'New page', 'Own URL, back button, bookmarks.'],
          ]}
        />
        <Compare
          good={<DetailInline />}
          goodNote="One line of detail opens in place, next to the order it belongs to."
          bad={<DetailModal />}
          badNote="A modal for one line: the page goes dark, then the agent has to close it to keep working."
        />
      </Section>

      <Section title="Feedback" id="feedback">
        <p>
          Put feedback where the problem is, and make it as loud as what the person has to do about it.
          Something they must act on never disappears on its own.
        </p>
        <Flow
          steps={[
            [
              'Is one field wrong?',
              <>
                The field’s own <C>error</C> or <C>validator</C>, after blur, saying how to fix it. See{' '}
                <Link to="/guidelines/writing#errors">Writing errors</Link>.
              </>,
            ],
            [
              'Is the task blocked by something the person can fix: a quota, a low wallet, a courier not connected, no connection?',
              'A notice in the page, next to the task, with the fixing action as its button: “Add funds”, “Connect Yalidine”, “Try again”. Limits are next steps, not toasts.',
            ],
            [
              'Is the next step irreversible or costly?',
              <>
                An <C>Alert</C> that names the object and the consequence, with a <C>destructive</C> action
                that repeats the verb.
              </>,
            ],
            [
              'Did something finish that needs nothing more?',
              'Let the result show it: the row updates, the button stops loading, “Saved” appears in place. A short status message is the most it needs.',
            ],
            [
              'Is something still running?',
              <>
                Show it on the control that started it: <C>loading</C> on the button or switch, a promise
                returned to <C>ActionsBar</C>. Long jobs show their stage in place (Queued, Generating,
                Ready).
              </>,
            ],
          ]}
        />
        <Table
          head={['Situation', 'Show', 'Where']}
          rows={[
            ['A field value is wrong', <>Field <C>error</C></>, 'Under the field, announced politely'],
            ['A limit or missing setup blocks the task', 'Notice with the next step as a button', 'Next to the task, until it is resolved'],
            ['A request failed', 'Notice with “Try again”, keeping the person’s work', 'Where the result would have appeared'],
            ['An irreversible step', <><C>Alert</C> confirmation</>, 'Over the page'],
            ['An action is running', <><C>loading</C> on its control</>, 'On the button, switch or action'],
            ['A list is reloading', 'Keep the current rows; mark the control that changed', 'In place; nothing jumps'],
            ['Something finished', 'The changed result, or a short status', 'Where the change happened'],
          ]}
        />
        <Callout tone="warning" title="Never a toast for something people must act on">
          <p>
            Toasts disappear, sit far from the task and are easy to miss in a busy confirmation call. A
            quota, a wallet balance, a failed save or a courier error stays on screen as a notice until it
            is fixed, and carries the action that fixes it.
          </p>
        </Callout>
        <Compare
          good={<LimitNotice />}
          goodNote="The limit is a next step: what happened, when it resets, and the button that fixes it."
          bad={<LimitToast />}
          badNote="A code in a toast that fades in four seconds. The person is stuck, and now doesn’t know why."
        />
        <Compare
          good={<LoadingGood />}
          goodNote="The button that started the work shows it is running, and blocks a second click."
          bad={<LoadingBad />}
          badNote="Everything disabled and a vague line elsewhere: is it frozen, and which action is running?"
        />
        <DoDont
          doItems={[
            'Keep the person’s input when a request fails, and say so (“Your work is still here”).',
            <>Announce status changes with <C>role="status"</C> or a polite live region.</>,
            'Keep showing old content while new content loads.',
          ]}
          dontItems={[
            'Show raw error codes or server messages as the only explanation.',
            'Block the whole screen with a spinner for a request that only affects one row.',
            'Open a dialog to say something succeeded.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'guidelines',
  id: 'choosing',
  title: 'Choosing components',
  order: 3,
  summary:
    'Decision guides for actions, options, values, extra detail and feedback: which component fits, and the common wrong choice.',
  keywords: [
    'which component',
    'when to use',
    'decision',
    'segmented vs radio',
    'switch vs checkbox',
    'select',
    'number field',
    'modal vs popover',
    'toast',
    'notice',
    'loading',
    'dock',
  ],
  Overview,
})
