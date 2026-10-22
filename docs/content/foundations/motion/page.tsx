import { useEffect, useRef, useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabSlider } from '@feeef.dev/ui/primitives/slider'
import { stepSpring } from '@feeef.dev/ui/primitives/spring-core'
import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'
import { block, MOTION, SELECTORS, SYSTEM } from '../_lib/css-tokens'
import { Tok } from '../_lib/live'
import '../_lib/foundations.css'

const ROLES: Record<string, string> = {
  '--lab-duration-fast': 'Feedback: hover, press, color and border changes.',
  '--lab-duration-normal': 'Small transitions: a panel or label changing state.',
  '--lab-ease': 'Default curve for control feedback.',
  '--lab-ease-out': 'Things entering: dialogs, menus, swaps, auto height.',
  '--lab-ease-in': 'Things leaving: closing dialogs and sheets.',
}

const system = block(SYSTEM, SELECTORS.base)
const reduced = block(SYSTEM, SELECTORS.reducedMotion)
const root = block(MOTION, ':root')
const tokens = [
  ...[...system].filter(([n]) => n.startsWith('--lab-duration-') || n === '--lab-ease'),
  ...[...root].filter(([n]) => n.startsWith('--lab-ease')),
]

function EasingDemo() {
  const [on, setOn] = useState(false)
  const rows: [string, string][] = [
    ['--lab-ease', '--lab-duration-normal'],
    ['--lab-ease-out', '--lab-duration-normal'],
    ['--lab-ease-in', '--lab-duration-normal'],
    ['--lab-ease', '--lab-duration-fast'],
  ]
  return (
    <div className="fd-stage" data-layout="column">
      {rows.map(([ease, duration]) => (
        <div key={ease + duration} className="fd-motion-row">
          <code>
            {ease.replace('--lab-', '')} · {duration.replace('--lab-duration-', '')}
          </code>
          <div className="fd-motion-track">
            <div
              className="fd-motion-dot"
              data-on={on || undefined}
              style={{ transition: `inset-inline-start var(${duration}) var(${ease})` }}
            />
          </div>
        </div>
      ))}
      <div>
        <LabButton variant="tonal" controlSize="compact" onClick={() => setOn((v) => !v)}>
          Play
        </LabButton>
      </div>
    </div>
  )
}

/** A dot driven by the kit's spring integrator; clicking mid-flight retargets with its velocity. */
function SpringDemo() {
  const track = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const target = useRef(0)
  const frame = useRef(0)
  const state = useRef({ position: 0, velocity: 0 })
  const [, force] = useState(0)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const run = () => {
    cancelAnimationFrame(frame.current)
    let last = performance.now()
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = (now: number) => {
      const next = reduce
        ? { position: target.current, velocity: 0 }
        : stepSpring(state.current, target.current, (now - last) / 1000)
      last = now
      state.current = next
      const width = (track.current?.clientWidth ?? 0) - 44
      if (dot.current) dot.current.style.insetInlineStart = `${6 + next.position * width}px`
      const settled = Math.abs(next.position - target.current) < 0.0005 && Math.abs(next.velocity) < 0.002
      if (!settled) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  return (
    <div className="fd-stage" data-layout="column">
      <div ref={track} className="fd-motion-track">
        <div ref={dot} className="fd-motion-dot" />
      </div>
      <div className="demo-row" style={{ justifyContent: 'flex-start' }}>
        <LabButton
          variant="tonal"
          controlSize="compact"
          onClick={() => {
            target.current = target.current === 0 ? 1 : 0
            force((v) => v + 1)
            run()
          }}
        >
          Move
        </LabButton>
        <span className="docs-muted">Click again before it settles: it turns around without a jump.</span>
      </div>
    </div>
  )
}

function SliderDemo() {
  const [value, setValue] = useState(40)
  return (
    <div className="fd-stage">
      <div style={{ width: 'min(100%, 360px)' }}>
        <LabSlider label="Volume" min={0} max={100} value={value} onValueChange={setValue} />
      </div>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Lead>
        Motion explains what changed. It is short, uses transforms and opacity so nothing reflows, and
        steps aside entirely when the reader asks for reduced motion.
      </Lead>

      <Section title="Duration and easing tokens">
        <Table
          head={['Token', 'Value', 'Reduced motion', 'Use it for']}
          rows={tokens.map(([name, value]) => [
            <Tok>{name}</Tok>,
            <C>{value}</C>,
            reduced.get(name) ?? <span className="docs-muted">unchanged</span>,
            ROLES[name] ?? '—',
          ])}
        />
        <EasingDemo />
      </Section>

      <Section title="Built-in transitions">
        <Table
          head={['Element', 'Enter', 'Exit']}
          rows={[
            ['Dialog', '300ms, ease-out: fade, rise 14px, scale from 0.965', '180ms, ease-in'],
            ['Dialog as a sheet (720px and below)', '360ms: fade, rise 32px', '220ms'],
            ['Icon and label swap (LabSwap)', '220ms, ease-out', '160ms, ease-in'],
            ['Stable text (LabStableText)', '180ms fade, 220ms rise, ease-out', 'same'],
            ['Auto height', '320ms, ease-out', 'same'],
          ]}
        />
        <p>
          React helpers for presence, swaps, stable labels and auto height are documented in{' '}
          <Link to="/components/motion">Motion components</Link>.
        </p>
      </Section>

      <Section title="Spring motion">
        <Callout title="Gestures and containers">
          <p>
            Springs with velocity, flicks, rubber-banding and the pan recognizer behind sheets, stacks and
            layout transitions are on the <Link to="/foundations/physics">Physics</Link> page.
          </p>
        </Callout>
        <p>
          Direct manipulation uses a spring instead of a fixed curve, so an interrupted movement keeps
          its velocity. <C>LabSlider</C> drives its fill, thumb travel and shape from one damped spring
          clock; the toolbar search morph uses the same integrator.
        </p>
        <SliderDemo />
        <p>
          The integrator is <C>stepSpring</C> (stiffness 420, damping 28 by default). It runs in bounded
          substeps, so a frame after a suspended tab does not explode.
        </p>
        <SpringDemo />
        <Code
          code={`import { stepSpring } from '@feeef.dev/ui/primitives/spring-core'

let state = { position: 0, velocity: 0 }
let last = performance.now()
function tick(now: number) {
  state = stepSpring(state, target, (now - last) / 1000) // seconds
  last = now
  element.style.transform = \`translateX(\${state.position * 200}px)\`
  if (Math.abs(state.position - target) > 0.0005 || Math.abs(state.velocity) > 0.002)
    requestAnimationFrame(tick)
}
requestAnimationFrame(tick)`}
        />
      </Section>

      <Section title="Reduced motion">
        <p>
          Under <C>prefers-reduced-motion: reduce</C> both duration tokens become <C>0ms</C>, keyframe
          animations on dialogs, menus and swaps shrink to 1ms, view transitions are dropped, and springs
          jump straight to their target. Anything you build on the tokens inherits this for free.
        </p>
        <Code
          lang="css"
          code={`.order-row {
  transition: background-color var(--lab-duration-fast) var(--lab-ease);
}
.order-panel[data-state='open'] {
  animation: order-panel-in 240ms var(--lab-ease-out) both;
}
@media (prefers-reduced-motion: reduce) {
  .order-panel[data-state='open'] {
    animation-duration: 1ms;
  }
}`}
        />
        <Callout title="Check it">
          <p>
            Turn on reduced motion in your OS (or emulate it in DevTools, Rendering panel) and make sure
            every state change is still visible and nothing waits on an animation event that never fires.
          </p>
        </Callout>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Animate transform and opacity.',
            'Enter with ease-out, exit faster with ease-in.',
            'Use a spring for things the pointer drags.',
          ]}
          dontItems={[
            'Animate width, height or position on large surfaces every frame.',
            'Stack several easing timelines on one element.',
            'Hide information behind an animation that reduced motion skips.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'foundations',
  id: 'motion',
  title: 'Motion',
  order: 4,
  summary: 'Duration and easing tokens, spring motion for direct manipulation, and reduced motion.',
  keywords: ['animation', 'transition', 'easing', 'duration', 'spring', 'reduced motion', 'prefers-reduced-motion'],
  Overview,
})
