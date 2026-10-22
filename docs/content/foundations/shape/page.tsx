import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { block, SELECTORS, SYSTEM } from '../_lib/css-tokens'
import { LiveValue, useThemeVersion, Tok } from '../_lib/live'
import '../_lib/foundations.css'

const ROLES: Record<string, string> = {
  '--lab-radius-small': 'Small pieces: filter chips, calendar days, navigation badges.',
  '--lab-radius-control-compact': 'Compact buttons, fields and icon buttons.',
  '--lab-radius-control': 'Regular buttons, fields and selects.',
  '--lab-radius-group': 'Menus, popovers, selects and segmented controls.',
  '--lab-radius-panel': 'Content panels, docks and scroll areas.',
  '--lab-radius-glass': 'Floating glass groups (27px at 720px and below).',
}

const base = block(SYSTEM, SELECTORS.base)
const radiusTokens = [...base.keys()].filter((n) => n.startsWith('--lab-radius-') && n !== '--lab-radius-scale')

function nativeCorners() {
  return typeof CSS !== 'undefined' && CSS.supports('corner-shape', 'superellipse(1.5)')
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
          <C>--lab-corner-scale</C> (the radius scale times the corner fit below), so circles such as
          radio marks stay round while everything else follows.
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
          which look rounder at the same radius. There the kit sets <C>--lab-corner-fit: 0.76</C>: every
          radius shrinks to the circle that matches the superellipse most closely (measured against
          Chrome’s <C>corner-shape</C> from 12 to 44px), so corners look the same everywhere.
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
  summary: 'Radius tokens, the app-wide radius scale and continuous superellipse corners.',
  keywords: ['radius', 'border-radius', 'corner-shape', 'superellipse', 'rounded', 'squircle', 'enableCornerFallback'],
  Overview,
})
