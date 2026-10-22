import { ProBadge } from '@feeef.dev/ui/primitives/badge'
import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Section } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

function Overview() {
  return (
    <>
      <Section title="Usage">
        <p>
          <C>ProBadge</C> is a small lock icon with the word “PRO”. Put it after the label of an
          action or a feature that needs a paid plan, so people see the requirement before they click.
          It takes no props: the text, icon and size are fixed so every paid feature reads the same.
        </p>
        <div className="docs-stage" style={{ minHeight: 0, padding: 24 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Voice cloning <ProBadge />
          </span>
        </div>
        <Callout title="Free and Pro tags on models">
          <p>
            Model pickers show access with their own Free / Pro tags (<C>access</C> on a ladder stop).
            Use <C>ProBadge</C> for features, not for model rows.
          </p>
        </Callout>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Hide the badge once the user has the plan.',
            'Let the click still work: open the upgrade offer instead of disabling the action.',
            'Place it after the label, on the same line.',
          ]}
          dontItems={[
            'Use it as a status, count or category tag.',
            'Mark every row in a list; mark only the paid ones.',
            'Rely on it as the only explanation; say what the plan unlocks where people upgrade.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The badge is plain text, so assistive technology reads “PRO” as part of the control's name
          (“Clone a voice PRO”). If the action opens an upgrade offer, say so in the destination, not in
          the badge.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'badge',
  title: 'Badge',
  group: 'Containment',
  order: 60,
  summary: 'A small “PRO” tag that marks actions and features which need a paid plan.',
  importLine: "import { ProBadge } from '@feeef.dev/ui/primitives/badge'",
  source: 'src/primitives/badge.tsx',
  api: ['ProBadge'],
  keywords: ['pro', 'plan', 'paid', 'upgrade', 'lock', 'tag', 'chip'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      Voice cloning <ProBadge />
    </span>
  ),
})
