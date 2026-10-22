import { useEffect, useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabCheckbox } from '@feeef.dev/ui/primitives/choice'
import { definePage } from '../../../src/model'
import { Link } from '../../../src/router'
import { Lead, Section } from '../../../src/blocks/prose'
import './checklist.css'

type Item = {
  id: string
  label: string
  description: string
  /** Where the rule comes from. */
  source: { to: string; label: string }
}

type Group = { id: string; title: string; items: Item[] }

const P = (anchor: string, n: number) => ({ to: `/guidelines/principles#${anchor}`, label: `Principle ${n}` })
const CHOOSING = (anchor: string, label: string) => ({ to: `/guidelines/choosing#${anchor}`, label })
const WRITING = (anchor: string, label: string) => ({ to: `/guidelines/writing#${anchor}`, label })

const GROUPS: Group[] = [
  {
    id: 'layout',
    title: 'Layout',
    items: [
      { id: 'layout-surface', label: 'Content sits on opaque surfaces', description: 'Lists, forms and results live in the content panel, cards or dialogs, never on glass.', source: P('content-first', 1) },
      { id: 'layout-floats', label: 'Chrome floats in the scroll area’s slots', description: 'App bar in top, dock in bottom; no fixed header rows or hand-made bottom padding.', source: { to: '/components/scaffold', label: 'Scaffold' } },
      { id: 'layout-order', label: 'Navigation, work, details, in that order', description: 'Sidebar → content → inspector; on phones the inspector becomes a dialog.', source: P('navigation-work-details', 4) },
      { id: 'layout-one-scroll', label: 'One scroll area per task', description: 'No scroll area inside a scrollable dialog, no scaffold inside a scaffold.', source: { to: '/components/scroll-area', label: 'Scroll area' } },
      { id: 'layout-narrow', label: 'Works at 360px with no sideways scroll', description: 'Long names wrap or truncate, rows become cards, nothing is cut off.', source: P('navigation-work-details', 4) },
      { id: 'layout-chrome', label: 'Every bar and button earns its place', description: 'Tools used once a week live in a menu, not in the app bar.', source: P('content-first', 1) },
    ],
  },
  {
    id: 'actions',
    title: 'Actions',
    items: [
      { id: 'actions-one-filled', label: 'One filled button per view or dialog', description: 'Everything else is tonal, outlined or text, and the filled one comes last.', source: P('one-primary-action', 2) },
      { id: 'actions-verbs', label: 'Buttons say what happens', description: '“Confirm order”, not “Submit”, “OK” or “Yes”.', source: WRITING('buttons', 'Writing') },
      { id: 'actions-destructive', label: 'Destructive actions are red and confirmed', description: 'variant destructive, a dialog that names the object, never the default focus.', source: P('one-primary-action', 2) },
      { id: 'actions-links', label: 'Navigation is a link', description: 'Buttons that open another page use asChild with a router link.', source: CHOOSING('actions', 'Choosing') },
      { id: 'actions-icons', label: 'Icon-only buttons are rare and named', description: 'A well-known icon and an aria-label; anything people would guess gets text.', source: CHOOSING('actions', 'Choosing') },
      { id: 'actions-groups', label: 'Related tools share one toolbar group', description: 'One glass bubble per purpose, controls inside use appearance="toolbar".', source: P('tools-travel-together', 3) },
      { id: 'actions-overflow', label: 'Rows that can run out of width overflow', description: 'LabActionsBar with the main action at the highest priority; nothing wraps or clips in French.', source: CHOOSING('actions', 'Choosing') },
    ],
  },
  {
    id: 'inputs',
    title: 'Inputs',
    items: [
      { id: 'inputs-hint', label: 'Every field has a short hint', description: 'A noun, not an instruction; a placeholder is never the only name.', source: WRITING('fields', 'Writing') },
      { id: 'inputs-view', label: 'View and mode switches are segmented controls', description: 'Not radios, a select or a row of toggle buttons.', source: CHOOSING('options', 'Choosing') },
      { id: 'inputs-switch', label: 'Switches apply now; checkboxes wait for Save', description: 'No Save button next to switches, no auto-saving checkboxes.', source: CHOOSING('options', 'Choosing') },
      { id: 'inputs-count', label: 'The number of options picked the control', description: 'Two to five to compare: radio group; more: select; hundreds: a searchable picker.', source: CHOOSING('options', 'Choosing') },
      { id: 'inputs-identifiers', label: 'Phones and IDs are text fields', description: 'type and inputMode set so phones show the right keypad; never a number field.', source: CHOOSING('values', 'Choosing') },
      { id: 'inputs-amounts', label: 'Amounts use the number field with a unit', description: 'unit="DA", a real step, and saves in onValueCommit.', source: CHOOSING('values', 'Choosing') },
      { id: 'inputs-dates', label: 'Dates and spans use the temporal fields', description: 'One range field for a period, with min and max set.', source: CHOOSING('values', 'Choosing') },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    items: [
      { id: 'feedback-field', label: 'Field errors appear at the field', description: 'After blur, saying how to fix the value.', source: WRITING('errors', 'Writing') },
      { id: 'feedback-limits', label: 'Limits and blockers are next steps in the page', description: 'Quota, wallet, missing courier: a notice with the action that fixes it.', source: CHOOSING('feedback', 'Choosing') },
      { id: 'feedback-no-toast', label: 'No toast asks for action', description: 'Toasts only confirm what finished; anything to act on stays on screen.', source: CHOOSING('feedback', 'Choosing') },
      { id: 'feedback-loading', label: 'Running work shows on its own control', description: 'loading on the button or switch; no double submits, no full-screen spinner.', source: CHOOSING('feedback', 'Choosing') },
      { id: 'feedback-states', label: 'Every list has empty, no-results and error states', description: 'Each says what happened and offers the next action.', source: WRITING('empty-states', 'Writing') },
      { id: 'feedback-keep', label: 'Reloads keep what is on screen', description: 'Rows stay while a filter reloads; a failed save keeps the person’s input.', source: CHOOSING('feedback', 'Choosing') },
      { id: 'feedback-modal', label: 'Dialogs are for decisions, not information', description: 'A detail opens inline or in a popover; a modal blocks only for a choice or a short task.', source: CHOOSING('more', 'Choosing') },
    ],
  },
  {
    id: 'writing',
    title: 'Writing',
    items: [
      { id: 'writing-case', label: 'Sentence case everywhere', description: 'Titles, buttons, tabs and menu items; only proper nouns keep capitals.', source: WRITING('sentence-case', 'Writing') },
      { id: 'writing-confirm', label: 'Confirmations name the object and the consequence', description: '“Cancel order #10482?” with “Keep order” and “Cancel order”.', source: WRITING('confirmations', 'Writing') },
      { id: 'writing-errors', label: 'Errors say what is wrong and how to fix it', description: 'No raw codes, field names or untranslated server messages.', source: WRITING('errors', 'Writing') },
      { id: 'writing-terms', label: 'One word per concept', description: 'Order, delivery company, stop desk, wilaya: the same word on every screen.', source: WRITING('tone', 'Writing') },
      { id: 'writing-formats', label: 'Money, dates and phones use Algerian formats', description: 'Whole dinars with DA, day month year, 24-hour time, phones in pairs.', source: WRITING('formats', 'Writing') },
      { id: 'writing-tone', label: 'Calm and specific', description: 'No “Oops”, no exclamation marks, no blame.', source: P('speak-like-a-colleague', 8) },
    ],
  },
  {
    id: 'color',
    title: 'Color and theme',
    items: [
      { id: 'color-meaning', label: 'Color only for meaning', description: 'Primary for action and selection, red for danger, green for success.', source: P('color-means-something', 6) },
      { id: 'color-not-alone', label: 'State never depends on color alone', description: 'A label or icon carries the same meaning.', source: P('color-means-something', 6) },
      { id: 'color-tokens', label: 'Only tokens, no literal colors, sizes or radii', description: 'var(--lab-*) everywhere, in light and dark.', source: { to: '/foundations/color', label: 'Color' } },
      { id: 'color-dark', label: 'Checked in light and dark', description: 'Every screen, including its empty and error states.', source: { to: '/foundations/color', label: 'Color' } },
      { id: 'color-no-repaint', label: 'Kit components are not repainted', description: 'The look changes through LabThemeConfig, not CSS on kit classes.', source: P('configure-dont-override', 10) },
    ],
  },
  {
    id: 'motion',
    title: 'Motion',
    items: [
      { id: 'motion-explains', label: 'Every animation explains a change', description: 'Where something came from or went; nothing moves for decoration.', source: P('motion-explains', 7) },
      { id: 'motion-reduced', label: 'Works with reduced motion', description: 'Transitions become instant; nothing is lost without them.', source: { to: '/foundations/motion', label: 'Motion' } },
      { id: 'motion-never-blocks', label: 'Nothing waits for an animation', description: 'Input stays live, and numbers people read don’t move.', source: P('motion-explains', 7) },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    items: [
      { id: 'a11y-keyboard', label: 'Everything works with the keyboard alone', description: 'Tab reaches every control in reading order; Escape closes what opened.', source: { to: '/get-started/accessibility', label: 'Accessibility' } },
      { id: 'a11y-focus', label: 'Focus is visible and returns where it came from', description: 'After a dialog, menu or drawer closes.', source: { to: '/get-started/accessibility', label: 'Accessibility' } },
      { id: 'a11y-names', label: 'Every control and group has a name', description: 'Icon buttons, sliders, switches, docks and toolbar groups carry a label.', source: { to: '/get-started/accessibility', label: 'Accessibility' } },
      { id: 'a11y-native', label: 'Native elements first', description: 'Buttons are buttons, links are links, no clickable divs.', source: P('everyone-every-language', 9) },
      { id: 'a11y-status', label: 'Status changes are announced', description: 'Saved, generating and errors use a polite live region.', source: CHOOSING('feedback', 'Choosing') },
      { id: 'a11y-zoom', label: 'Readable at 200% zoom and in sunlight', description: 'Nothing overlaps; text and borders stay at token contrast.', source: P('everyone-every-language', 9) },
    ],
  },
  {
    id: 'rtl',
    title: 'RTL and languages',
    items: [
      { id: 'rtl-arabic', label: 'Checked in Arabic, right to left', description: 'Every screen, not only the one you changed.', source: { to: '/get-started/internationalization', label: 'Internationalization' } },
      { id: 'rtl-logical', label: 'Logical properties only', description: 'inline-start and inline-end; no left, right or margin-left.', source: { to: '/get-started/internationalization', label: 'Internationalization' } },
      { id: 'rtl-icons', label: 'Directional icons flip', description: 'Back, forward and chevrons use lab-dir-flip; play and search don’t.', source: { to: '/get-started/internationalization', label: 'Internationalization' } },
      { id: 'rtl-messages', label: 'One message per sentence, ICU plurals', description: 'No concatenation; Arabic gets all six plural forms.', source: WRITING('translation', 'Writing') },
      { id: 'rtl-isolate', label: 'Numbers and Latin text are isolated', description: 'Phones, order numbers and emails in <bdi> inside Arabic text.', source: WRITING('punctuation', 'Writing') },
      { id: 'rtl-french', label: 'Fits in French', description: 'About 30% longer; labels wrap or overflow into menus instead of clipping.', source: WRITING('translation', 'Writing') },
    ],
  },
  {
    id: 'density',
    title: 'Density and touch',
    items: [
      { id: 'density-once', label: 'Density is set once in the theme config', description: 'No screen shrunk by hand; a crowded screen is split or trimmed.', source: P('comfortable-by-default', 5) },
      { id: 'density-targets', label: 'Touch targets are at least 44px', description: 'Including icon buttons, chips and row actions.', source: { to: '/foundations/sizing', label: 'Sizing' } },
      { id: 'density-hover', label: 'Nothing depends on hover', description: 'Row actions and tooltips have a tap or focus equivalent.', source: P('comfortable-by-default', 5) },
      { id: 'density-thumb', label: 'The main action is in thumb reach on phones', description: 'In the bottom dock, not only in the app bar.', source: CHOOSING('actions', 'Choosing') },
      { id: 'density-keyboard', label: 'Phones show the right keyboard', description: 'type, inputMode and autoComplete on every field.', source: { to: '/components/text-field', label: 'Text field' } },
    ],
  },
]

const TOTAL = GROUPS.reduce((sum, group) => sum + group.items.length, 0)
const STORAGE_KEY = 'feeef-ui-docs:review-checklist'

function readChecks(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const ids: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeChecks(checks: Set<string>) {
  try {
    if (checks.size) window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...checks]))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked or full; the checklist still works for this visit.
  }
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div
      className="gc-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
    >
      <span style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  )
}

function Overview() {
  const [checks, setChecks] = useState<Set<string>>(() => new Set())
  useEffect(() => setChecks(readChecks()), [])

  const update = (next: Set<string>) => {
    setChecks(next)
    writeChecks(next)
  }
  const toggle = (id: string, on: boolean) => {
    const next = new Set(checks)
    if (on) next.add(id)
    else next.delete(id)
    update(next)
  }
  const done = GROUPS.reduce((sum, group) => sum + group.items.filter((item) => checks.has(item.id)).length, 0)

  return (
    <>
      <Lead>
        Go through this before a screen ships. Each line is a mistake that reviews keep finding; each
        links to the rule it comes from. Checks are saved in this browser only.
      </Lead>

      <div className="gc-summary">
        <div className="gc-summary-row">
          <span className="gc-summary-count" aria-live="polite">
            {done === TOTAL ? `All ${TOTAL} checks done` : `${done} of ${TOTAL} checked`}
          </span>
          <LabButton variant="text" controlSize="compact" disabled={done === 0} onClick={() => update(new Set())}>
            Clear checks
          </LabButton>
        </div>
        <Bar value={done} max={TOTAL} label="Review progress" />
        <ul className="gc-summary-groups" aria-label="Groups">
          {GROUPS.map((group) => {
            const count = group.items.filter((item) => checks.has(item.id)).length
            return (
              <li key={group.id}>
                <Link to={`#${group.id}`} data-done={count === group.items.length}>
                  {group.title}
                  <span>
                    {count}/{group.items.length}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {GROUPS.map((group) => {
        const count = group.items.filter((item) => checks.has(item.id)).length
        return (
          <Section key={group.id} title={group.title} id={group.id}>
            <div className="gc-group-progress">
              <span>
                {count} of {group.items.length}
              </span>
              <Bar value={count} max={group.items.length} label={`${group.title} progress`} />
            </div>
            <fieldset className="gc-list" aria-labelledby={group.id}>
              {group.items.map((item) => (
                <div key={item.id} className="gc-item">
                  <LabCheckbox
                    label={item.label}
                    description={item.description}
                    checked={checks.has(item.id)}
                    onCheckedChange={(on) => toggle(item.id, on)}
                  />
                  <Link className="gc-item-source" to={item.source.to}>
                    {item.source.label}
                  </Link>
                </div>
              ))}
            </fieldset>
          </Section>
        )
      })}
    </>
  )
}

export default definePage({
  section: 'guidelines',
  id: 'checklist',
  title: 'Review checklist',
  order: 6,
  summary: 'A pre-ship checklist for any screen built with the kit, grouped by area and linked to the rule behind each item.',
  keywords: ['review', 'checklist', 'qa', 'pre-ship', 'audit', 'design review'],
  Overview,
})
