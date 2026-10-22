import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { StableText, Swap } from '@feeef.dev/ui/motion'
import { Button } from '@feeef.dev/ui/primitives/button'
import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'

const presenceHook = `import { usePresence, useLatched } from '@feeef.dev/ui/motion'

function OrderPanel({ order }: { order: Order | null }) {
  const open = order !== null
  // mounted stays true for exitMs after open turns false; state is 'open' | 'closed'.
  const { mounted, state } = usePresence(open, 200)
  // While closing, keep rendering the order that was open.
  const shown = useLatched(order, open)
  if (!mounted) return null
  return <aside className="order-panel" data-state={state}>{shown?.number}</aside>
}`

const presenceCss = `.order-panel[data-state='open'] { animation: panel-in 240ms var(--lab-ease-out) both; }
.order-panel[data-state='closed'] { animation: panel-out 160ms var(--lab-ease-in) both; }
@media (prefers-reduced-motion: reduce) {
  .order-panel[data-state] { animation: none; }
}`

function CopyLinkButton() {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="tonal"
      onClick={() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      <Swap swapKey={copied ? 'done' : 'copy'}>
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </Swap>
      <StableText value={copied ? 'Copied' : 'Copy link'} options={['Copy link', 'Copied']} />
    </Button>
  )
}

function Overview() {
  return (
    <>
      <Section title="What's in the kit">
        <p>
          Small motion helpers for the moments React makes abrupt: content that unmounts, icons that
          swap, labels that change length, and boxes whose height changes. They animate only opacity,
          transforms and height, and every one of them respects reduced motion.
        </p>
        <Table
          head={['Helper', 'Use it for']}
          rows={[
            [<C>Presence</C>, 'Showing and hiding a notice, panel or popover with an exit animation.'],
            [<C>Swap</C>, 'Swapping one icon for another in place: play/pause, copy/copied, mic/stop.'],
            [<C>StableText</C>, 'A label that switches between known values without changing width.'],
            [<C>AutoHeight</C>, 'A box whose content grows or shrinks: results, errors, breakdowns.'],
            [<C>usePresence</C>, 'Hook: keeps an element mounted while it animates out.'],
            [<C>useLatched</C>, 'Hook: holds the last value while an element closes.'],
          ]}
        />
      </Section>

      <Section title="Presence">
        <p>
          <C>Presence</C> renders <C>render(state)</C> while <C>open</C> is true. When it turns
          false, the last output stays mounted for <C>exitMs</C> (160 ms by default) with{' '}
          <C>data-state="closed"</C>, then unmounts. Your CSS owns the motion: put the state on{' '}
          <C>data-state</C> and animate the two values. Because the closing frame is frozen, content
          that depends on now-empty data never flashes during the exit.
        </p>
        <p>
          When you render the element yourself, use the two hooks it is built from.{' '}
          <C>usePresence(open, exitMs = 200)</C> returns <C>{'{ mounted, state }'}</C>, and{' '}
          <C>useLatched(value, hold)</C> returns <C>value</C> while <C>hold</C> is true and the last
          held value afterwards.
        </p>
        <Code code={presenceHook} title="order-panel.tsx" />
        <Code code={presenceCss} title="order-panel.css" />
      </Section>

      <Section title="Swaps and stable labels">
        <div className="docs-stage" style={{ minHeight: 0, padding: 24 }}>
          <CopyLinkButton />
        </div>
        <p>
          <C>Swap</C> keeps the outgoing icon in the same grid cell while the new one, keyed by{' '}
          <C>swapKey</C>, scales and rotates in. Change <C>swapKey</C> only when the icon really
          changes. <C>StableText</C> lays every option in one cell and shows only{' '}
          <C>value</C>, so the widest option sets the width. Pass every value the slot can show in{' '}
          <C>options</C>; a value outside the list still renders but can change the width.
        </p>
      </Section>

      <Section title="Auto height">
        <p>
          <C>AutoHeight</C> measures its content with a <C>ResizeObserver</C> and transitions its own
          height over 320 ms. It clips overflow (with a 24 px allowance for shadows and focus rings),
          so don't put popovers that must escape inside it. It renders a <C>div</C>, or a{' '}
          <C>section</C> with <C>as="section"</C>, and passes other attributes through.
        </p>
      </Section>

      <Section title="Reduced motion">
        <p>
          Under <C>prefers-reduced-motion: reduce</C>, <C>usePresence</C> and <C>Presence</C>{' '}
          unmount immediately, <C>Swap</C> drops the outgoing icon at once, and{' '}
          <C>AutoHeight</C> jumps to the new height. Add the same media query to your own{' '}
          <C>data-state</C> animations.
        </p>
        <Callout title="Motion tokens">
          <p>
            <C>--lab-ease-out</C> for things arriving and <C>--lab-ease-in</C> for things leaving.
            Exits should be shorter than entrances.
          </p>
        </Callout>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Keep exits shorter than entrances (about 160 ms out, 240 ms in).',
            <>Match <C>exitMs</C> to the length of your closing animation.</>,
            <>Label the control around a <C>Swap</C>; the swap itself is hidden.</>,
            <>List every possible label in <C>StableText</C>'s <C>options</C>.</>,
          ]}
          dontItems={[
            'Animate layout properties (width, top, margin) in your data-state CSS.',
            'Use motion to tell the user something that is not also in text.',
            <>Wrap long scrolling content in <C>AutoHeight</C>; it is for small regions.</>,
            'Forget a reduced-motion rule for your own animations.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          <C>Swap</C> is <C>aria-hidden</C>: give its button an <C>aria-label</C> (and{' '}
          <C>aria-pressed</C> for a toggle). <C>StableText</C> hides the inactive options, so screen
          readers read only the current value. A notice shown through <C>Presence</C> keeps whatever
          role you render, such as <C>role="status"</C>.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'motion',
  title: 'Motion',
  group: 'Feedback and motion',
  order: 20,
  summary:
    'Presence, icon swaps, width-stable labels and auto height: small helpers that make changes ease instead of jump.',
  importLine:
    "import { AutoHeight, Presence, StableText, Swap, useLatched, usePresence } from '@feeef.dev/ui/motion'",
  source: 'src/motion.tsx',
  api: ['Presence', 'Swap', 'StableText', 'AutoHeight'],
  keywords: ['animation', 'transition', 'presence', 'exit', 'swap', 'height', 'reduced motion'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <Button variant="tonal">
      <Swap swapKey="done">
        <Check size={18} />
      </Swap>
      <StableText value="Copied" options={['Copy link', 'Copied']} />
    </Button>
  ),
})
