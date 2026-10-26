import { useState } from 'react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { GlassScope } from '@feeef.dev/ui/glass'
import { Plus, Share2 } from 'lucide-react'
import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'
import { block, SELECTORS, SYSTEM } from '../_lib/css-tokens'
import { useComputed, useHeight, Tok } from '../_lib/live'
import '../_lib/foundations.css'

const ROLES: Record<string, string> = {
  '--lab-control-small': 'Small buttons and icon buttons (controlSize="small").',
  '--lab-control-height': 'Regular buttons and icon buttons; thick sliders.',
  '--lab-control-large': 'Large buttons (controlSize="large").',
  '--lab-control-padding-small': 'Side padding of small text buttons.',
  '--lab-control-padding': 'Side padding of regular text buttons and segments.',
  '--lab-control-padding-large': 'Side padding of large text buttons.',
  '--lab-control-font-small': 'Label size of small buttons.',
  '--lab-control-font': 'Label size of regular buttons.',
  '--lab-control-font-large': 'Label size of large buttons.',
  '--lab-field-height-small': 'Small text fields, selects and number fields.',
  '--lab-field-height': 'Text fields, selects and number fields.',
  '--lab-row-height': 'Workspace actions, tool-sidebar headings.',
  '--lab-menu-row-height': 'Menu and floating-panel rows.',
  '--lab-toolbar-item': 'A toolbar bubble (controls inside are 6px less).',
  '--lab-shell-gap': 'G, the one chrome gap: window, top bar, panel, sidebar items, scroll-area floats and content.',
  '--lab-toolbar-gap': 'Space between toolbar groups (G unless set).',
  '--lab-toolbar-inset': 'A floating bar’s inset from its panel’s sides (G unless set).',
  '--lab-segmented-inset': 'Segmented control edge to its pill, and between options.',
  '--lab-switch-width': 'Switch track width.',
  '--lab-switch-height': 'Switch track height.',
  '--lab-thumb-width': 'Switch and thin-slider thumb width.',
  '--lab-thumb-height': 'Switch and thin-slider thumb height.',
  '--lab-slider-track': 'Thin slider rail.',
  '--lab-list-row-height': 'Inset-grouped list rows.',
  '--lab-list-corner': 'Inset-grouped list card radius (× the radius scale).',
  '--lab-list-inset': 'List row sides, headers and hairlines.',
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

function ViewPicker() {
  const [view, setView] = useState<'list' | 'board'>('list')
  return (
    <SegmentedControl
      label="View"
      className="demo-segmented-box"
      value={view}
      onChange={setView}
      options={[
        { value: 'list', label: 'List' },
        { value: 'board', label: 'Board' },
      ]}
    />
  )
}

function Overview() {
  return (
    <>
      <Lead>
        Space and control sizes are tokens too. The default density is iOS 26's standard controls,
        measured in the simulator; density swaps the sizes as a set, and <C>metrics</C> changes single
        ones, so a whole app changes without touching a component.
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

      <Section title="Chrome spacing">
        <p>
          One gap separates chrome neighbours: the shell gap <strong>G</strong> (<C>--lab-shell-gap</C>,
          8px at every density, <C>metrics.shellGap</C>). It sits between the window and the top bar,
          the top bar and the panel, the sidebar and its items, between toolbar groups
          (<C>--lab-toolbar-gap</C>), between a floating bar and its panel's sides
          (<C>--lab-toolbar-inset</C>), and between a <C>ScrollArea</C>'s floats and content and its
          edges (<C>edgeGap</C>, <C>contentPadding</C>). Change <C>shellGap</C> and all of them move;
          set <C>toolbarGap</C> or <C>toolbarInset</C> only to break one away from it.
        </p>
        <p>
          Inside a card the rhythm is 16: cards, list sections (<C>--lab-list-inset</C>) and dialog
          bodies bring their own inner padding, so page content can sit G from the panel and still
          read comfortably. Inset surfaces (segmented controls, docks, a group of buttons) keep their
          own small inset, and the gap between their controls never exceeds it.
        </p>
      </Section>

      <Section title="Control metrics">
        <p>
          Comfortable density matches iOS 26's controls: capsule buttons <C>small</C> 30px,{' '}
          <C>regular</C> 36px and <C>large</C> 52px (side padding 10 / 12 / 20, labels 15 / 17 / 17
          regular weight), 44px toolbar bubbles 8px (the shell gap) apart, a segmented control as tall as a regular button (36px, its pill 32px),
          a 63 × 28 switch with a 37 × 24 thumb, a 6px slider rail, and 54px list rows on 26px cards.
          Every shape is a capsule (radius half its height) drawn with the kit's superellipse corners,
          not a perfect circle. Text fields keep their own design: 44px with room for an inside hint,
          36px when small so they line up with regular buttons. The numbers below are measured from the
          rendered controls.
        </p>
        <div className="fd-stage">
          <Measured label="small">
            <Button variant="tonal" controlSize="small">
              Save changes
            </Button>
          </Measured>
          <Measured label="regular">
            <Button variant="filled">Save changes</Button>
          </Measured>
          <Measured label="large">
            <Button variant="filled" controlSize="large">
              Save changes
            </Button>
          </Measured>
          <Measured label="icon">
            <IconButton variant="outlined" aria-label="Add item">
              <Plus />
            </IconButton>
          </Measured>
          <Measured label="toolbar">
            <GlassScope>
              <ToolbarGroup label="Share">
                <IconButton variant="text" appearance="toolbar" aria-label="Share">
                  <Share2 />
                </IconButton>
              </ToolbarGroup>
            </GlassScope>
          </Measured>
          <Measured label="segmented">
            <ViewPicker />
          </Measured>
          <Measured label="switch">
            <SlideSwitch label="Cash on delivery" defaultChecked />
          </Measured>
          <Measured label="text field">
            <TextField hint="Order number" />
          </Measured>
        </div>
        <Callout title="Touch keeps 44px">
          <p>
            On coarse pointers (<C>@media (pointer: coarse)</C>) buttons, icon buttons, chips, switches,
            segmented options, checkboxes and radios keep their size, so phones show iOS’s 36px buttons,
            and gain an invisible hit area of at least <C>--lab-control-touch-target</C> (44 × 44px)
            centred on them: a <C>::before</C> that changes no layout (Flutter: <C>TouchTarget</C>). Where
            two reaches overlap the later control wins; a press on a control itself is always its own.
            Inside a toolbar bubble the bubble is the target. Fields, selects and menu rows still grow
            to 44px, except inside a toolbar bubble, where they take the bubble's control height like
            buttons do. Never shrink a hit area below it.
          </p>
        </Callout>
      </Section>

      <Section title="Density">
        <p>
          Set density once in the theme config: <C>{"theme={{ density: 'compact' }}"}</C>. It sets{' '}
          <C>data-lab-density="compact"</C> on <C>{'<html>'}</C>, which redefines these tokens. Compact is
          one step down (its large button is a comfortable regular one, its regular a comfortable small),
          thin two:
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
          Compact also sets field text to 14px; thin goes to 13px, for very dense tools like inspectors and spreadsheets. In both, inside labels float onto the field border, since there is no room for two lines. Use compact for consoles and admin lists, thin only where density matters more than comfort, and keep <C>comfortable</C> for products people use on phones.
        </p>
      </Section>

      <Section title="Metrics">
        <p>
          To change one size without changing density, set it in <C>ThemeConfig.metrics</C>. It replaces
          that token at every density, and whatever is built on it follows (capsule radii, the controls
          inside a toolbar bubble). The provider writes it as an inline variable on <C>{'<html>'}</C>;{' '}
          <C>themeAttributes</C> does the same for server rendering.
        </p>
        <Code
          code={`<Provider theme={{ metrics: { controlHeight: { regular: 40 }, toolbarItem: 48 } }}>`}
        />
        <Code
          lang="dart"
          title="Flutter"
          code={`ThemeProvider(
  config: const ThemeConfig(
    metrics: Metrics(controlHeight: MetricScale(regular: 40), toolbarItem: 48),
  ),
  child: app,
)`}
        />
        <p>
          The full list is on <Link to="/get-started/theming">Theming</Link>. In Flutter the same values
          come from <C>ThemeProvider.of(context).sizes</C> (<C>SizeTokens</C>): <C>controlHeight</C>,{' '}
          <C>toolbarItem</C>, <C>listRowHeight</C>, ….
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
/* A custom control: keep its size, reach 44px on touch screens. */
.order-row .quick-action {
  position: relative;
}
@media (pointer: coarse) {
  .order-row .quick-action::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: max(100%, var(--lab-control-touch-target));
    height: max(100%, var(--lab-control-touch-target));
    translate: -50% -50%;
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
            'Hard-code 36px or 44px heights; density and metrics cannot change them.',
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
  summary: 'The spacing scale, the iOS control metrics, touch targets, density and ThemeConfig metrics.',
  keywords: ['spacing', 'space', 'density', 'compact', 'height', 'touch target', '44px', 'padding', 'metrics', 'ios', 'control size', 'toolbar', 'switch', 'segmented'],
  Overview,
})
