import { useMemo, useRef, useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import {
  SPRINGS,
  nearestTarget,
  projectMomentum,
  rubberBandClamp,
  solveSpring,
  useMotionPaint,
  useMotionValue,
  usePan,
  type Spring,
} from '@feeef.dev/ui/physics'
import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'
import '../_lib/foundations.css'
import './physics.css'

type Preset = keyof typeof SPRINGS

/** Position over time for a spring from 0 to 1, drawn as a curve, with a ball that plays it. */
function SpringExplorer() {
  const [preset, setPreset] = useState<Preset | 'custom'>('snappy')
  const [custom, setCustom] = useState<Spring>({ duration: 0.5, bounce: 0.2 })
  const spring = preset === 'custom' ? custom : SPRINGS[preset]
  const path = useMemo(() => {
    const at = solveSpring(spring, 0, 1)
    const points: string[] = []
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * 1.2
      points.push(`${(i / 120) * 300},${100 - at(t).position * 70}`)
    }
    return `M${points.join(' L')}`
  }, [spring.duration, spring.bounce])
  const ball = useMotionValue(0, 0.001)
  const dot = useRef<HTMLDivElement>(null)
  useMotionPaint(ball, (v) => {
    if (dot.current) dot.current.style.insetInlineStart = `calc(${v} * (100% - 32px))`
  })
  return (
    <div className="fd-stage" data-layout="column">
      <div className="ph-controls">
        <SegmentedControl<Preset | 'custom'>
          label="Spring"
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'smooth', label: 'smooth' },
            { value: 'snappy', label: 'snappy' },
            { value: 'bouncy', label: 'bouncy' },
            { value: 'release', label: 'release' },
            { value: 'custom', label: 'custom' },
          ]}
        />
        {preset === 'custom' && (
          <div className="ph-fields">
            <NumberField
              label="Duration"
              controlSize="compact"
              min={0.1}
              max={1.5}
              step={0.05}
              unit="s"
              value={custom.duration}
              onValueChange={(duration) => setCustom((s) => ({ ...s, duration }))}
            />
            <NumberField
              label="Bounce"
              controlSize="compact"
              min={-0.5}
              max={0.9}
              step={0.05}
              value={custom.bounce}
              onValueChange={(bounce) => setCustom((s) => ({ ...s, bounce }))}
            />
          </div>
        )}
      </div>
      <svg className="ph-curve" viewBox="0 0 300 110" role="img" aria-label="Position of the spring over 1.2 seconds">
        <line x1="0" x2="300" y1="30" y2="30" className="ph-target" />
        <line x1="0" x2="300" y1="100" y2="100" className="ph-axis" />
        <path d={path} className="ph-path" />
      </svg>
      <div className="fd-motion-track">
        <div ref={dot} className="fd-motion-dot" />
      </div>
      <div className="demo-row" style={{ justifyContent: 'flex-start' }}>
        <Button
          variant="tonal"
          controlSize="compact"
          onClick={() => void ball.animateTo(ball.getTarget() > 0.5 ? 0 : 1, { spring })}
        >
          Play
        </Button>
        <span className="docs-muted">
          duration {spring.duration}s · bounce {spring.bounce}. Press Play again mid-flight: it turns around
          without a jump.
        </span>
      </div>
    </div>
  )
}

const SNAPS = [0, 0.33, 0.66, 1]
/** Drag the puck: 1:1 tracking, rubber band past the ends, momentum projected onto snap points. */
function FlickDemo() {
  const track = useRef<HTMLDivElement>(null)
  const puck = useRef<HTMLDivElement>(null)
  const ghost = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0, 0.5)
  const [readout, setReadout] = useState('Drag or flick the puck.')
  const width = () => (track.current?.clientWidth ?? 300) - 40
  useMotionPaint(x, (v) => {
    if (puck.current) puck.current.style.transform = `translateX(${v}px)`
  })
  const start = useRef(0)
  usePan(track, {
    axis: 'x',
    threshold: 2,
    onStart: () => {
      x.stop()
      start.current = x.get()
      ghost.current?.setAttribute('data-on', '')
    },
    onMove: ({ dx, time, vx }) => {
      const w = width()
      x.track(rubberBandClamp(start.current + dx, 0, w, w), time)
      const target = nearestTarget(projectMomentum(x.get(), vx, 0.99), SNAPS.map((s) => s * w))
      if (ghost.current) ghost.current.style.transform = `translateX(${target}px)`
    },
    onEnd: ({ time }) => {
      const w = width()
      const velocity = x.getVelocity(time)
      const projected = projectMomentum(x.get(), velocity, 0.99)
      const target = nearestTarget(projected, SNAPS.map((s) => s * w))
      ghost.current?.removeAttribute('data-on')
      setReadout(
        `Released at ${Math.round(velocity)} px/s → would travel to ${Math.round(projected)}px → snaps to ${Math.round(target)}px`
      )
      void x.animateTo(target, { spring: SPRINGS.release, velocity })
    },
  })
  return (
    <div className="fd-stage" data-layout="column">
      {/* Physical axis: the demo moves in screen pixels in every language. */}
      <div ref={track} className="ph-flick" data-lab-pan="" dir="ltr">
        {SNAPS.map((s) => (
          <span key={s} className="ph-snap" style={{ insetInlineStart: `calc(${s} * (100% - 40px) + 16px)` }} />
        ))}
        <div ref={ghost} className="ph-ghost" />
        <div ref={puck} className="ph-puck" />
      </div>
      <p className="docs-muted" role="status" style={{ margin: 0 }}>
        {readout}
      </p>
    </div>
  )
}

function Overview() {
  return (
    <>
      <Lead>
        Things on screen behave like objects: they follow the finger exactly, keep their speed when let
        go, resist when pulled past an edge and settle without a jolt. The same few rules run every
        sheet, page and divider in the kit, so the whole product feels like one physical system.
      </Lead>

      <Section title="Springs, not curves">
        <p>
          A spring is described by a perceptual <C>duration</C> (how long it takes to look done) and a{' '}
          <C>bounce</C> (0 settles without overshoot; positive values overshoot). It is solved in closed
          form, so it knows its exact position and velocity at every frame: a new target takes over from
          the current position at the current speed, and nothing ever jumps.
        </p>
        <SpringExplorer />
        <Table
          head={['Spring', 'Duration · bounce', 'Use it for']}
          rows={[
            [<C>smooth</C>, '0.5s · 0', 'Layout and presentation: pages, sheets, panels.'],
            [<C>snappy</C>, '0.35s · 0.15', 'Small state changes: toggles, chips, indicators, layout moves.'],
            [<C>bouncy</C>, '0.5s · 0.3', 'Arrivals that deserve attention. Rarely.'],
            [<C>release</C>, '0.42s · 0.08', 'Anything let go after a drag; it keeps the finger’s speed.'],
            [<C>interactive</C>, '0.2s · 0', 'Following a pointer with a touch of lag.'],
          ]}
        />
      </Section>

      <Section title="Flick, project, snap">
        <p>
          While a finger drags, content moves with it 1:1. When it lets go, the kit asks where the
          content would come to rest if it kept gliding (<C>projectMomentum</C>, the iOS scroll-view
          formula) and snaps to the nearest resting place: a fast flick goes far, a careful release
          stays close, and a finger that stopped before lifting does not fling at all. Past an edge the
          content rubber-bands (<C>rubberBandClamp</C>): it follows less and less, then springs back.
        </p>
        <FlickDemo />
        <Code
          code={`import { SPRINGS, nearestTarget, projectMomentum, rubberBandClamp,
  useMotionPaint, useMotionValue, usePan } from '@feeef.dev/ui/physics'

const x = useMotionValue(0)
useMotionPaint(x, (v) => (puck.current!.style.transform = \`translateX(\${v}px)\`))
let start = 0
usePan(track, {
  axis: 'x',
  onStart: () => { x.stop(); start = x.get() },
  onMove: ({ dx, time }) => x.track(rubberBandClamp(start + dx, 0, max, max), time),
  onEnd: ({ time }) => {
    const velocity = x.getVelocity(time)
    const target = nearestTarget(projectMomentum(x.get(), velocity, 0.99), [0, max / 2, max])
    void x.animateTo(target, { spring: SPRINGS.release, velocity })
  },
})`}
        />
      </Section>

      <Section title="The pieces">
        <Table
          head={['API', 'What it is']}
          rows={[
            [<C>MotionValue</C>, 'One animatable number with a velocity. animateTo(spring), track(pointer), set, stop; subscribers paint it without React renders.'],
            [<C>usePan</C>, 'A one-axis pan recognizer with velocity: hands perpendicular movement back to the browser, leaves nested scrollers and sliders alone, and can claim touches that compete with native scrolling (touch: "claim").'],
            [<C>projectMomentum</C>, 'Where a value moving at a speed would come to rest (0.998 normal, 0.99 fast deceleration).'],
            [<C>rubberBand</C>, 'How far content visibly moves when pulled past a limit.'],
            [<C>LayoutGroup</C>, 'Shared-element layout transitions: marked elements fly from their old place to their new one. See Layout transitions.'],
            [<C>solveSpring</C>, 'The closed-form spring itself, for custom drivers.'],
          ]}
        />
        <p>
          The containers are built from these: <Link to="/components/navigation-stack">navigation stack</Link>,{' '}
          <Link to="/components/sheet">sheet</Link>, <Link to="/components/split-view">split view</Link> and{' '}
          <Link to="/components/layout-transitions">layout transitions</Link>.
        </p>
      </Section>

      <Section title="Rules">
        <DoDont
          doItems={[
            'Track the pointer 1:1 while it is down; animate only after release.',
            'Release with the gesture’s velocity, measured at the release event (getVelocity(time)).',
            'Decide outcomes by projection, not by position alone.',
            'Rubber-band at limits instead of stopping dead.',
            'Animate transform and opacity; switch layout once at rest.',
          ]}
          dontItems={[
            'Start a fixed-duration animation from a released drag: the speed jumps.',
            'Make a gesture the only way to do something; pair it with a control.',
            'Lock vertical scrolling for a horizontal gesture; let the browser have the other axis.',
          ]}
        />
        <Callout tone="note" title="Reduced motion">
          Under reduced motion, presentations cross-fade instead of sliding, zooming or receding, and
          layout moves jump. Direct manipulation still follows the finger: it is the person’s own motion.
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'foundations',
  id: 'physics',
  title: 'Physics',
  order: 5,
  summary: 'Springs with velocity, momentum projection, rubber-banding and pans: how things move under a finger.',
  keywords: ['spring', 'gesture', 'drag', 'flick', 'velocity', 'momentum', 'rubber band', 'pan', 'swipe', 'physics'],
  Overview,
})
