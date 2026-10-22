import { Printer, Truck } from 'lucide-react'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import './dock-demo.css'

const ALIGNS = ['center', 'start', 'end', 'stretch'] as const

const controls = {
  align: { type: 'select', options: ALIGNS, default: 'center' },
  content: { type: 'boolean', label: 'Status tile', default: true },
  secondary: { type: 'boolean', label: 'Second action', default: true },
  title: { type: 'text', label: 'Tile title', default: 'Order #1048' },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <div className="dock-demo-host">
            <LabDock
              label="Order actions"
              align={v.align as (typeof ALIGNS)[number]}
              content={
                v.content ? (
                  <>
                    <strong>{v.title}</strong>
                    <small>Confirmed · 4 500 DA</small>
                  </>
                ) : undefined
              }
            >
              <div className="demo-row">
                {v.secondary && (
                  <LabButton variant="text">
                    <Printer />
                    Print label
                  </LabButton>
                )}
                <LabButton variant="filled">
                  <Truck />
                  Ship order
                </LabButton>
              </div>
            </LabDock>
          </div>
        )}
        code={(v) =>
          jsx(
            'LabDock',
            {
              label: 'Order actions',
              align: v.align,
              content: v.content ? '__CONTENT__' : undefined,
            },
            v.secondary
              ? '<LabButton variant="text">Print label</LabButton>\n<LabButton variant="filled">Ship order</LabButton>'
              : '<LabButton variant="filled">Ship order</LabButton>',
            { align: 'center' }
          ).replace('content="__CONTENT__"', `content={<strong>${v.title}</strong>}`)
        }
      />

      <Section title="When to use it">
        <p>
          A dock is the floating glass container for a task's actions: the main action of a page, the
          commands for a selection, pagination, or the Save / Cancel pair of a dialog. It optionally leads
          with a small status tile (a title, a count, a total). Put it where actions float: the{' '}
          <C>bottom</C> slot of a <C>LabScrollArea</C>, <C>LabScaffold</C> or scrollable <C>LabModal</C>.
        </p>
        <p>
          The dock does not position itself. Its host decides where it floats and reserves its height, so
          content scrolls clear of it. Inside, it only sizes itself: it hugs its content up to the host's
          width and animates its width and height as the content changes.
        </p>
      </Section>

      <Section title="Anatomy">
        <ol>
          <li>
            <strong>Host</strong>: a full-width, click-through row that aligns the dock (<C>align</C>).
          </li>
          <li>
            <strong>Glass</strong>: one <C>LabGlassGroup</C> with a 4px inset, named by <C>label</C>.
          </li>
          <li>
            <strong>Status tile</strong> (<C>content</C>, optional): one or two short lines. It can shrink
            to about 40% of the width and truncates, so it never pushes actions out.
          </li>
          <li>
            <strong>Actions</strong> (<C>children</C>): buttons laid out in a row, or one{' '}
            <C>LabActionsBar</C>. The dock passes the width left after the tile to the actions bar, which
            moves low-priority actions into a More menu instead of wrapping.
          </li>
        </ol>
      </Section>

      <Section title="Alignment">
        <Table
          head={['align', 'Use it for']}
          rows={[
            [<C>center</C>, 'Default. Bottom task actions, a single sign-in button, dialog actions, selection commands.'],
            [<><C>start</C> / <C>end</C></>, 'Contextual chrome tied to one side of the content, such as an inspector.'],
            [<C>stretch</C>, 'A true full-width interaction surface. Not for separating a label from a button.'],
          ]}
        />
      </Section>

      <Section title="Swapping content">
        <p>
          When the dock's task changes (browsing → selecting, idle → editing), change <C>swapKey</C>. The
          old content fades out and becomes inert, focus moves to the dock so it is not lost on a removed
          button, then the glass resizes and the new content fades in. Keep the key coarse: a count or label
          change under the same key updates in place and keeps focus. Reduced motion swaps instantly.
        </p>
        <Code
          code={`<LabDock
  label="Selection actions"
  swapKey={selected.length ? 'selected' : 'browsing'}
  content={<strong>{selected.length} selected</strong>}
>
  <LabActionsBar actions={actions} label="Selection actions" size="compact" />
</LabDock>`}
        />
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Keep one filled button per dock, last in reading order.',
            'Give the dock a label that names the task (“Order actions”).',
            'Use LabActionsBar when there are more than two or three actions or the width can get narrow.',
            'Put it in a host’s bottom slot so its height is reserved.',
          ]}
          dontItems={[
            'Position the dock yourself with fixed positioning inside scrolling content.',
            'Key swapKey on every count change.',
            'Put long text or form fields in the status tile.',
            'Stack two docks on the same edge.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The dock is a <C>group</C> named by <C>label</C>. It is programmatically focusable (
          <C>tabIndex=-1</C>) so a swap can park focus on it, but it is not a Tab stop itself; Tab moves
          through its buttons in source order.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves through the tile’s links (if any) and the actions.'],
            ['Enter / Space', 'Activates the focused action.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'dock',
  title: 'Dock',
  group: 'Navigation and layout',
  order: 3,
  summary:
    'A floating glass container for a task’s actions and a short status, sized to its content and placed by its host.',
  importLine: "import { LabDock } from '@feeef.dev/ui/dock'",
  source: 'src/dock/dock.tsx',
  api: ['LabDock'],
  keywords: ['action bar', 'footer', 'bottom bar', 'floating actions', 'selection', 'swapKey'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <LabDock label="Order actions" content={<strong>#1048</strong>}>
      <LabButton variant="filled" controlSize="compact">
        Ship
      </LabButton>
    </LabDock>
  ),
})
