import type { ReactNode } from 'react'
import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'
import { block, paletteMaps, paletteTokenNames, resolveValue, SELECTORS, SYSTEM } from '../_lib/css-tokens'
import { Chip, Swatch, Tok } from '../_lib/live'
import '../_lib/foundations.css'

/** What each color token is for. Tokens missing here still render, under "Other". */
const ROLES: Record<string, { group: string; role: string }> = {
  '--lab-ground': { group: 'Surfaces', role: 'Page background behind panels and scroll areas.' },
  '--lab-surface': { group: 'Surfaces', role: 'Cards, panels, fields, menus and dialogs.' },
  '--lab-surface-soft': { group: 'Surfaces', role: 'Quiet wells and tracks inside a surface.' },
  '--lab-line': { group: 'Surfaces', role: 'Borders and dividers.' },
  '--lab-ink': { group: 'Text and icons', role: 'Primary text and icons.' },
  '--lab-muted': { group: 'Text and icons', role: 'Secondary text, hints and metadata.' },
  '--lab-primary': { group: 'Action', role: 'Filled buttons, selection tints, slider fills.' },
  '--lab-on-primary': { group: 'Action', role: 'Text and icons on a primary fill.' },
  '--lab-accent': { group: 'Action', role: 'A second brand highlight next to primary.' },
  '--lab-focus': { group: 'Action', role: 'Focus rings (2px outline).' },
  '--lab-success': { group: 'Status', role: 'Completed, saved, healthy.' },
  '--lab-warning': { group: 'Status', role: 'Needs attention but not broken.' },
  '--lab-danger': { group: 'Status', role: 'Destructive actions and errors.' },
  '--lab-on-danger': { group: 'Status', role: 'Text and icons on a danger fill.' },
  '--lab-field-error': { group: 'Status', role: 'Invalid text field outline and message.' },
  '--lab-brand-1': { group: 'Brand and pixel art', role: 'Logo stroke, first tone.' },
  '--lab-brand-2': { group: 'Brand and pixel art', role: 'Logo stroke, second tone.' },
  '--lab-pixel-ink': { group: 'Brand and pixel art', role: 'Main pixel-art and loader ink.' },
  '--lab-pixel-sage': { group: 'Brand and pixel art', role: 'Pixel tone `sage`.' },
  '--lab-pixel-muted': { group: 'Brand and pixel art', role: 'Pixel tone `muted`.' },
  '--lab-control-surface': { group: 'Derived control colors', role: 'Raised control fill.' },
  '--lab-control-border': { group: 'Derived control colors', role: 'Control and field edges: ink at 15% over surface.' },
  '--lab-control-hover': { group: 'Derived control colors', role: 'Hover fill: ink at 5% over surface.' },
  '--lab-control-pressed': { group: 'Derived control colors', role: 'Pressed fill: ink at 10% over surface.' },
  '--lab-control-selected': { group: 'Derived control colors', role: 'Selected or pressed-on state: primary at 22%.' },
}

const GROUP_ORDER = [
  'Surfaces',
  'Text and icons',
  'Action',
  'Status',
  'Brand and pixel art',
  'Derived control colors',
  'Other',
]

/** Color tokens = everything the palette file declares + the color tokens system.css adds. */
function colorTokens(): string[] {
  const system = [...block(SYSTEM, SELECTORS.base).keys()].filter(
    (name) => /^--lab-(danger|on-danger|control-(surface|border|hover|pressed|selected))$/.test(name)
  )
  return [...new Set([...paletteTokenNames(), ...system])]
}

function grouped() {
  const groups = new Map<string, string[]>()
  for (const name of colorTokens()) {
    const group = ROLES[name]?.group ?? 'Other'
    groups.set(group, [...(groups.get(group) ?? []), name])
  }
  return GROUP_ORDER.filter((g) => groups.has(g)).map((g) => [g, groups.get(g)!] as const)
}

function LiveSwatches() {
  return (
    <>
      {grouped().map(([group, names]) => (
        <Section key={group} title={group} level={3}>
          <div className="fd-swatch-grid">
            {names.map((name) => (
              <Swatch key={name} token={name} role={ROLES[name]?.role} />
            ))}
          </div>
        </Section>
      ))}
    </>
  )
}

function PaletteTable() {
  const maps = paletteMaps()
  const cell = (map: Map<string, string>, name: string): ReactNode => {
    const raw = map.get(name)
    if (!raw) return '—'
    const color = resolveValue(map, raw)
    const label = color.startsWith('#') ? color : color.startsWith('color-mix') ? 'mix' : raw
    return <Chip color={color} label={label} />
  }
  return (
    <Table
      head={['Token', 'lab · light', 'lab · dark', 'mono · light', 'mono · dark']}
      rows={colorTokens().map((name) => [
        <code className="fd-token-name">{name.replace('--lab-', '')}</code>,
        cell(maps.lab, name),
        cell(maps.labDark, name),
        cell(maps.mono, name),
        cell(maps.monoDark, name),
      ])}
    />
  )
}

function Overview() {
  return (
    <>
      <Lead>
        Every color the kit paints comes from a small set of semantic <C>--lab-*</C> tokens. Themes
        supply the values; components only ever name the role.
      </Lead>

      <Section title="How color works">
        <p>
          Color tokens are defined on <C>{'html[data-lab-theme]'}</C>. <C>LabThemeProvider</C> sets that
          attribute to <C>light</C> or <C>dark</C>, and <C>data-lab-palette</C> picks the palette. Nothing
          is themed until <C>data-lab-theme</C> exists, which is why SSR hosts set it before first paint
          (see <Link to="/get-started/theming">Theming</Link>).
        </p>
        <p>
          The swatches below are painted with the live variables, so they follow the current mode and
          palette. Try it in Customize: switch to <C>mono</C> or dark mode and watch the values change.
        </p>
      </Section>

      <Section title="Color tokens">
        <LiveSwatches />
      </Section>

      <Section title="Palettes">
        <p>
          A palette redefines the token list and nothing else. There are two:
        </p>
        <Table
          head={['Palette', 'Character', 'Used by']}
          rows={[
            [<C>lab</C>, 'Feeef green controls, quiet paper surfaces, a forest dark mode. Default.', 'Feeef Lab and merchant-facing apps'],
            [
              <C>mono</C>,
              'Black and white. Color stays only where it carries meaning: danger stays red, warning a muted amber, success turns to ink.',
              'Developer tools such as the Cloud console',
            ],
          ]}
        />
        <p>
          Every value, read from the kit’s stylesheets (token names without the <C>--lab-</C> prefix;
          “mix” is a <C>color-mix()</C> of other tokens):
        </p>
        <PaletteTable />
        <Callout title="Derived colors follow the palette">
          <p>
            Control colors are <C>color-mix()</C> blends of <C>--lab-ink</C>, <C>--lab-primary</C> and{' '}
            <C>--lab-surface</C>, so they adapt to any palette without their own values. Do the same in
            app CSS instead of picking a new hex.
          </p>
        </Callout>
      </Section>

      <Section title="Semantic colors">
        <p>
          Status colors exist to explain state. Pair them with text or an icon, never color alone.
        </p>
        <Table
          head={['Token', 'Use it for']}
          rows={[
            [<Tok>--lab-danger</Tok>, <>Destructive buttons (<C>variant="destructive"</C>), invalid select borders, error icons.</>],
            [<Tok>--lab-field-error</Tok>, 'The outline and message of an invalid text field. Falls back to danger.'],
            [<Tok>--lab-warning</Tok>, 'Limits that are close, settings that need review.'],
            [<Tok>--lab-success</Tok>, 'Confirmation that something finished. In mono it is plain ink.'],
            [<Tok>--lab-focus</Tok>, <>The keyboard focus ring: <C>outline: 2px solid var(--lab-focus)</C>. Always visible against ground and surface.</>],
          ]}
        />
      </Section>

      <Section title="Using color in app CSS">
        <Code
          lang="css"
          code={`.order-card {
  background: var(--lab-surface);
  border: 1px solid var(--lab-line);
  color: var(--lab-ink);
}
.order-card .meta {
  color: var(--lab-muted);
}
/* Tints: blend tokens, don't invent a hex. */
.order-card[data-selected] {
  background: color-mix(in srgb, var(--lab-primary) 14%, var(--lab-surface));
}
.order-card[data-late] .status {
  color: var(--lab-warning);
}`}
        />
        <DoDont
          doItems={[
            'Name the role: surface, line, ink, muted, primary.',
            <>Derive tints with <C>color-mix()</C> over <C>--lab-surface</C>.</>,
            'Check both modes and both palettes in Customize.',
          ]}
          dontItems={[
            'Write literal hex or rgb colors; they ignore the palette and dark mode.',
            <>Use <C>--lab-primary</C> for text on a surface; it is a fill color.</>,
            'Signal state by color alone.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'foundations',
  id: 'color',
  title: 'Color',
  order: 1,
  summary: 'Semantic color tokens, the lab and mono palettes, and how to use them in your CSS.',
  keywords: ['tokens', 'palette', 'mono', 'dark mode', 'swatch', 'danger', 'focus', 'css variables'],
  Overview,
})
