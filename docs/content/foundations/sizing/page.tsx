import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'
import { Plus } from 'lucide-react'
import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'
import { block, SELECTORS, SYSTEM } from '../_lib/css-tokens'
import { useComputed, useHeight, Tok } from '../_lib/live'
import '../_lib/foundations.css'

const ROLES: Record<string, string> = {
  '--lab-control-height': 'Regular buttons, text fields, icon buttons.',
  '--lab-control-compact': 'Compact controls (controlSize="compact"), compact icon buttons.',
  '--lab-control-small': 'The smallest control size.',
  '--lab-field-height': 'Plain inputs and selects without a field shell.',
  '--lab-row-height': 'Navigation items, list rows, workspace actions.',
  '--lab-control-padding': 'Inline padding of base controls.',
  '--lab-control-touch-target': 'Minimum hit size on coarse pointers. Never changes.',
  '--lab-sidebar-width': 'Expanded scaffold sidebar.',
  '--lab-navigation-rail-width': 'Collapsed scaffold navigation rail.',
}

const comfortable = block(SYSTEM, SELECTORS.base)
const compact = block(SYSTEM, SELECTORS.compact)
const thin = block(SYSTEM, SELECTORS.thin)
const spaceTokens = [...comfortable.keys()].filter((n) => n.startsWith('--lab-space-'))
const sizeTokens = Object.keys(ROLES).filter((n) => comfortable.has(n))

function SpaceRow({ token }: { token: string }) {
  const [ref, width] = useComputed<HTMLDivElement>('width')
  return (
    <div className="fd-space-row">
      <code>{token}</code>
      <output className="fd-live-value" style={{ margin: 0 }}>
        {width}
      </output>
      <div>
        <div ref={ref} className="fd-space-bar" style={{ width: `var(${token})` }} />
      </div>
    </div>
  )
}

function Measured({ label, children }: { label: string; children: React.ReactNode }) {
  const [ref, height] = useHeight<HTMLDivElement>()
  return (
    <div className="fd-measure">
      <div ref={ref} style={{ display: 'inline-flex' }}>
        {children}
      </div>
      <output>
        {label} · {height}px
      </output>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Lead>
        Space and control sizes are tokens too. Density swaps them as a set, so a whole app becomes
        denser without touching a component.
      </Lead>

      <Section title="Spacing scale">
        <p>
          A 4px-based scale for gaps and padding. The bars below are live: switch density in Customize
          and the larger steps tighten.
        </p>
        <div className="fd-stage" data-layout="column">
          {spaceTokens.map((token) => (
            <SpaceRow key={token} token={token} />
          ))}
        </div>
        <Table
          head={['Token', 'Comfortable', 'Compact']}
          rows={spaceTokens.map((name) => [
            <Tok>{name}</Tok>,
            comfortable.get(name) ?? '—',
            compact.get(name) ?? comfortable.get(name) ?? '—',
          ])}
        />
      </Section>

      <Section title="Control heights">
        <p>
          Buttons and fields share one height scale. <C>controlSize="regular"</C> uses{' '}
          <C>--lab-control-height</C> (44px), <C>compact</C> uses <C>--lab-control-compact</C> (40px).
          The numbers below are measured from the rendered controls.
        </p>
        <div className="fd-stage">
          <Measured label="regular">
            <LabButton variant="filled">Save changes</LabButton>
          </Measured>
          <Measured label="compact">
            <LabButton variant="tonal" controlSize="compact">
              Save changes
            </LabButton>
          </Measured>
          <Measured label="icon">
            <LabIconButton variant="outlined" aria-label="Add item">
              <Plus />
            </LabIconButton>
          </Measured>
          <Measured label="text field">
            <LabTextField hint="Order number" />
          </Measured>
        </div>
        <Callout title="Touch keeps 44px">
          <p>
            On coarse pointers (<C>@media (pointer: coarse)</C>) buttons, icon buttons, fields, selects
            and menu options grow to <C>--lab-control-touch-target</C>, 44px, whatever their size or the
            app’s density. Never shrink a hit area below it.
          </p>
        </Callout>
      </Section>

      <Section title="Density">
        <p>
          Set density once in the theme config: <C>{"theme={{ density: 'compact' }}"}</C>. It sets{' '}
          <C>data-lab-density="compact"</C> on <C>{'<html>'}</C>, which redefines these tokens:
        </p>
        <Table
          head={['Token', 'Comfortable', 'Compact', 'Thin', 'Used for']}
          rows={sizeTokens.map((name) => [
            <Tok>{name}</Tok>,
            comfortable.get(name) ?? '—',
            compact.get(name) ?? <span className="docs-muted">same</span>,
            thin.get(name) ?? <span className="docs-muted">same</span>,
            ROLES[name],
          ])}
        />
        <p>
          Compact also sets button text to 13px and field text to 14px; thin goes to 12px and 13px, for very dense tools like inspectors and spreadsheets. In both, inside labels float onto the field border, since there is no room for two lines. Use compact for consoles and admin lists, thin only where density matters more than comfort, and keep <C>comfortable</C> for products people use on phones.
        </p>
      </Section>

      <Section title="Sizing in app CSS">
        <Code
          lang="css"
          code={`.order-row {
  min-height: var(--lab-row-height);
  padding-inline: var(--lab-space-3);
  gap: var(--lab-space-2);
}
.order-toolbar {
  height: var(--lab-control-height);
}
@media (pointer: coarse) {
  .order-row .quick-action {
    min-width: var(--lab-control-touch-target);
    min-height: var(--lab-control-touch-target);
  }
}`}
        />
        <DoDont
          doItems={[
            'Space with the scale; pick the nearest step.',
            <>Size custom rows and controls from <C>--lab-row-height</C> and <C>--lab-control-*</C> so density reaches them.</>,
            <>Set a component’s height with <C>controlSize</C>, not CSS.</>,
          ]}
          dontItems={[
            'Hard-code 44px or 40px heights; compact density cannot change them.',
            'Mix densities in one screen.',
            'Shrink touch targets on phones to fit more in.',
          ]}
        />
        <p>
          Corners scale separately with <C>radius</C>; see <Link to="/foundations/shape">Shape and corners</Link>.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'foundations',
  id: 'sizing',
  title: 'Sizing and density',
  order: 2,
  summary: 'The spacing scale, control heights, touch targets and what compact density changes.',
  keywords: ['spacing', 'space', 'density', 'compact', 'height', 'touch target', '44px', 'padding'],
  Overview,
})
