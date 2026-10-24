import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { block, SELECTORS, SYSTEM } from '../_lib/css-tokens'
import { LiveValue, useThemeVersion, Tok } from '../_lib/live'
import { CORNER_SMOOTHING_FADE, FO_CORNER_EXPONENT, cornerSmoothing, foContinuousEdge, foSuperellipsePath } from '@feeef.dev/ui/brand/geometry'
import '../_lib/foundations.css'

const ROLES: Record<string, string> = {
  '--lab-radius-small': 'Small pieces: filter chips, calendar days, navigation badges.',
  '--lab-radius-control-small': 'Half a small control (a capsule): small selects and capsule pieces a small control tall.',
  '--lab-radius-control': 'Half a regular control (a capsule): selects and other capsules a control tall. Buttons compute their own half height.',
  '--lab-radius-group': 'Menus, popovers, selects and segmented controls.',
  '--lab-radius-panel': 'Content panels, docks and scroll areas.',
  '--lab-radius-glass': 'Floating glass groups (27px at 720px and below).',
}

const base = block(SYSTEM, SELECTORS.base)
const radiusTokens = [...base.keys()].filter((n) => n.startsWith('--lab-radius-') && n !== '--lab-radius-scale')

function nativeCorners() {
  return typeof CSS !== 'undefined' && CSS.supports('corner-shape', 'superellipse(1.5)')
}

/** Smoothing against radius ÷ half the shorter side, and three shapes with the old full smoothing dashed. */
function ClampedCornersFigure() {
  const plot = { x: 16, y: 16, w: 200, h: 120 }
  const curve = Array.from({ length: 101 }, (_, i) => {
    const fill = i / 100
    const x = plot.x + fill * plot.w
    const y = plot.y + (1 - cornerSmoothing(fill * 22, 132, 44)) * plot.h
    return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
  }).join('')
  const fade = plot.x + CORNER_SMOOTHING_FADE * plot.w
  const shapes = [
    { label: '44 × 44 · r 22', w: 44, h: 44, r: 22, x: 258, y: 24 },
    { label: '132 × 44 · r 22', w: 132, h: 44, r: 22, x: 352, y: 24 },
    { label: '150 × 100 · r 16', w: 150, h: 100, r: 16, x: 258, y: 104 },
  ]
  const full = (w: number, h: number, r: number) => foSuperellipsePath(w, h, [{ x: r, y: r }, { x: r, y: r }, { x: r, y: r }, { x: r, y: r }], 0, FO_CORNER_EXPONENT)
  return (
    <svg className="fd-corner-figure" viewBox="0 0 500 230" role="img" aria-label="Corner smoothing is full up to 0.75 of the largest radius, then eases to none: a full-radius bubble is a circle, a bar a capsule, a card keeps its continuous corner.">
      <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} className="fd-corner-figure__plot" />
      <line x1={fade} x2={fade} y1={plot.y} y2={plot.y + plot.h} className="fd-corner-figure__mark" />
      <path d={curve} className="fd-corner-figure__curve" />
      <text x={plot.x} y={plot.y + plot.h + 16}>0</text>
      <text x={fade} y={plot.y + plot.h + 16} textAnchor="middle">0.75</text>
      <text x={plot.x + plot.w} y={plot.y + plot.h + 16} textAnchor="end">1</text>
      <text x={plot.x + plot.w / 2} y={plot.y + plot.h + 34} textAnchor="middle">radius ÷ half the shorter side</text>
      <text x={plot.x + 6} y={plot.y + 18}>1 · superellipse(1.5)</text>
      <text x={plot.x + 6} y={plot.y + plot.h - 8}>0 · round</text>
      {shapes.map((shape) => (
        <g key={shape.label} transform={`translate(${shape.x} ${shape.y})`}>
          <path d={foContinuousEdge(shape.w, shape.h, shape.r)} className="fd-corner-figure__shape" />
          <path d={full(shape.w, shape.h, shape.r)} className="fd-corner-figure__old" />
          <text x={0} y={shape.h + 14}>{shape.label}</text>
        </g>
      ))}
    </svg>
  )
}

function Overview() {
  useThemeVersion()
  return (
    <>
      <Lead>
        Corners are continuous superellipses, sized by a small set of radius tokens and one scale
        the app chooses.
      </Lead>

      <Section title="Radius tokens">
        <p>
          Each shape below uses its token directly; the value under it is what the browser computes now.
          Change Radius in Customize and every corner, here and in the site chrome, follows.
        </p>
        <div className="fd-stage">
          <div className="fd-radius-grid">
            {radiusTokens.map((token) => (
              <LiveValue
                key={token}
                property="border-top-left-radius"
                style={{ borderRadius: `var(${token})`, cornerShape: 'superellipse(1.5)' } as React.CSSProperties}
              >
                <code style={{ display: 'block', padding: 12 }}>{token.replace('--lab-radius-', '')}</code>
              </LiveValue>
            ))}
          </div>
        </div>
        <Table
          head={['Token', 'Definition', 'Use it for']}
          rows={radiusTokens.map((name) => [<Tok>{name}</Tok>, <C>{base.get(name)!}</C>, ROLES[name] ?? '—'])}
        />
        <p>
          Nested corners should get smaller as they move inward: a 20px menu holding smaller rows, a
          24px panel holding 18px fields. Avoid the same radius at every level.
        </p>
      </Section>

      <Section title="Radius scale">
        <p>
          The theme config’s <C>radius</C> option sets <C>--lab-radius-scale</C> on <C>{'<html>'}</C>.{' '}
          <C>1</C> is the default rounding, <C>0.5</C> half, <C>0</C> square; values are clamped to 0–1.5.
          Every radius token, and every radius inside component CSS, is written as a multiple of{' '}
          <C>--lab-corner-scale</C> (the radius scale times the corner fit below), or, for a capsule
          (a radius of half its own height), of <C>--lab-capsule-scale</C>. Circles such as radio
          marks stay round while everything else follows.
        </p>
        <Code code={`<Provider theme={{ palette: 'mono', density: 'compact', radius: 0.35 }}>`} />
        <p>Write your own radii the same way:</p>
        <Code
          lang="css"
          code={`.order-card {
  border-radius: var(--lab-radius-panel);
  corner-shape: superellipse(1.5);
}
.order-card .thumbnail {
  /* A one-off size: still multiply by the scale. */
  border-radius: calc(10px * var(--lab-corner-scale, 1));
}`}
        />
      </Section>

      <Section title="Continuous corners">
        <p>
          Kit surfaces use <C>corner-shape: superellipse(1.5)</C>, a continuous curve rather than a
          quarter circle joined to a straight edge. Its exponent is 2<sup>1.5</sup> ≈ 2.83. Browsers
          without <C>corner-shape</C> (Firefox, Safari, most mobile browsers today) draw quarter circles,
          which look rounder at the same radius. There the kit sets <C>--lab-corner-fit: 0.76</C>: a
          smoothed radius shrinks to the circle that matches the superellipse most closely (measured
          against Chrome’s <C>corner-shape</C> from 12 to 44px), so corners look the same everywhere.
          The fit fades with the smoothing, so a capsule keeps its full radius and stays a capsule.
        </p>
        <div className="fd-stage" style={{ justifyContent: 'center' }}>
          <div className="fd-corner-compare">
            <div>
              <div className="fd-corner-box" style={{ borderRadius: 'var(--lab-radius-glass)' }} />
              <span>border-radius only</span>
            </div>
            <div>
              <div
                className="fd-corner-box"
                style={{ borderRadius: 'var(--lab-radius-glass)', cornerShape: 'superellipse(1.5)' } as React.CSSProperties}
              />
              <span>+ superellipse(1.5)</span>
            </div>
          </div>
        </div>
        <p className="docs-muted">
          {nativeCorners()
            ? 'Your browser supports corner-shape, so the two shapes differ.'
            : 'Your browser does not support corner-shape yet, so both shapes are fitted rounded corners.'}
        </p>
      </Section>

      <Section title="Clamped corners">
        <p>
          A continuous corner at full radius would square off a circle and the ends of a capsule. So,
          like Apple’s continuous corners and Figma’s clamped corner smoothing, the smoothing fades as
          the radius approaches half the box’s shorter side: full smoothing up to 0.75 of it, then a
          smoothstep down to none, a circular arc, at the full radius. A 44px bubble is a circle, a
          44px-tall bar a true capsule, and a card’s 16px corner is unchanged. The dashed outlines are
          the old full smoothing.
        </p>
        <div className="fd-stage" style={{ justifyContent: 'center' }}>
          <ClampedCornersFigure />
        </div>
        <p>
          The rule is one pure function shared by both kits: <C>cornerSmoothing(radius, width, height)</C>{' '}
          (<C>@feeef.dev/ui/brand/geometry</C> and Flutter’s <C>brand/geometry.dart</C>, tested against the
          same vectors). A smoothing <C>s</C> is <C>corner-shape: superellipse(1 + s / 2)</C>, exponent
          2<sup>1 + s/2</sup>. Everything the kit draws itself (glass, menus, the SVG fallback, every
          Flutter shape) applies it per corner from the measured box.
        </p>
        <p>
          CSS can’t measure a box, so stylesheets mark capsules instead: give them a radius of half their
          height times <C>--lab-capsule-scale</C> and <C>corner-shape: var(--lab-corner-shape-capsule)</C>,
          which is <C>round</C> at the default radius scale and follows the same curve as the scale
          drops (with <C>radius: 0.35</C> a capsule radius is 35% of the full one, so it keeps the full
          continuous corner). Buttons, selects, segmented controls, toolbar bubbles, docks, sliders and
          switches already do. Every other radius keeps <C>superellipse(1.5)</C>.
        </p>
        <Code
          lang="css"
          code={`.status-pill {
  height: 28px;
  border-radius: calc(14px * var(--lab-capsule-scale, 1));
  corner-shape: var(--lab-corner-shape-capsule, superellipse(1.5));
}`}
        />
      </Section>

      <Section title="SVG fallback">
        <p>
          The fitted circle is close but not exact. For a true superellipse on browsers without native
          support you can opt in to an SVG engine that repaints kit surfaces with the real curve. It starts only when <C>corner-shape</C> is unsupported and restores
          the original paint when it stops.
        </p>
        <Code
          code={`// Default: native CSS corners, ordinary rounding elsewhere.
<Provider>{children}</Provider>

// Opt in to the SVG fallback on unsupported browsers.
<Provider enableCornerFallback>{children}</Provider>`}
        />
        <Callout tone="warning" title="Mark reusable surfaces">
          <p>
            Put <C>data-lab-corners</C> on your own rounded surfaces so the fallback can find them. It
            never clips interactive elements: focus rings, menus and shadows stay visible.
          </p>
        </Callout>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            <>Use a radius token, or <C>calc(Npx * var(--lab-corner-scale, 1))</C> for a one-off.</>,
            <>Add <C>corner-shape: superellipse(1.5)</C> next to the radius on surfaces.</>,
            <>Give capsules <C>--lab-capsule-scale</C> and <C>var(--lab-corner-shape-capsule)</C>.</>,
            'Decrease radii as surfaces nest.',
          ]}
          dontItems={[
            <>Write a bare <C>border-radius: 16px</C>; it ignores the app’s radius.</>,
            'Clip a button or field to fake a shape; it cuts off the focus ring.',
            'Scale circles (avatars, radio marks) with the radius scale; use 50%.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'foundations',
  id: 'shape',
  title: 'Shape and corners',
  order: 3,
  summary: 'Radius tokens, the app-wide radius scale and clamped continuous corners.',
  keywords: ['radius', 'border-radius', 'corner-shape', 'superellipse', 'rounded', 'squircle', 'capsule', 'corner smoothing', 'enableCornerFallback'],
  Overview,
})
