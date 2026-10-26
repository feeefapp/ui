import { Package, ShoppingBag, Truck } from 'lucide-react'
import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import './nav-demo.css'

const controls = {
  label: { type: 'text', default: 'Deliveries' },
  compact: { type: 'boolean', label: 'Compact (rail)', default: false },
  active: { type: 'boolean', default: true },
  link: { type: 'boolean', label: 'As link (href)', default: false },
  count: { type: 'boolean', label: 'Trailing count', default: false },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <nav
            aria-label="Store"
            className="nav-demo-side"
            data-compact={v.compact}
            onClick={(event) => event.preventDefault()}
          >
            <NavigationItem compact={v.compact} label="Orders" icon={<ShoppingBag />} />
            <NavigationItem
              compact={v.compact}
              label={v.label}
              icon={<Truck />}
              active={v.active}
              href={v.link ? '/deliveries' : undefined}
              trailing={v.count ? '12' : undefined}
            />
            <NavigationItem compact={v.compact} label="Products" icon={<Package />} />
          </nav>
        )}
        code={(v) =>
          jsx(
            'NavigationItem',
            {
              label: v.label,
              icon: '__ICON__',
              compact: v.compact ? true : '__FALSE__',
              active: v.active,
              href: v.link ? '/deliveries' : undefined,
              trailing: v.count ? '12' : undefined,
              onSelect: v.link ? undefined : '__SELECT__',
            }
          )
            .replace('icon="__ICON__"', 'icon={<Truck />}')
            .replace('compact="__FALSE__"', 'compact={false}')
            .replace('onSelect="__SELECT__"', "onSelect={() => setPage('deliveries')}")
        }
      />

      <Section title="When to use it">
        <p>
          Use <C>NavigationItem</C> for the rows of a sidebar or drawer: top-level destinations in a
          workspace, usually inside <C>ScaffoldSide</C>. Each item is a quiet ghost toolbar{' '}
          <C>Button</C>, exactly as tall as a regular button (<C>--lab-control-height</C>: 36px, 30px in
          compact density), filling the sidebar's width. The 20px icon sits centred in a square{' '}
          <C>SquareSlot</C> as tall as the item, then the label, then an optional trailing square for a
          count, badge or chevron. In the rail the item is just the icon's square. The current destination
          gets the Button's selected fill, flat (no edge). On touch screens it keeps its size and reaches a
          44px target, like every button.
        </p>
        <Table
          head={['Prop', 'Effect']}
          rows={[
            [<C>href</C>, 'Renders an <a>, so the browser can open it in a new tab. Without href it is a <button>.'],
            [<C>onSelect</C>, 'Click handler for both forms: route client-side, close a drawer.'],
            [<C>active</C>, 'Paints the selected state and sets aria-current="page".'],
            [<C>trailing</C>, 'A count, badge or chevron in a square at the end. Hidden in the rail, where it stays in the accessible name.'],
            [<C>compact</C>, 'Required. Icon-only rail mode: the item is the icon square; the label is visually hidden and shown in a tooltip.'],
          ]}
        />
      </Section>

      <Section title="In a scaffold">
        <p>
          Derive <C>compact</C> from the scaffold so items follow the sidebar: compact when the sidebar is a
          rail, full when it is expanded or shown in the compact drawer.
        </p>
        <Code
          code={`<Scaffold
  side={(state) => {
    const rail = state.sideMode === 'rail' && !state.drawerOpen
    return (
      <ScaffoldSide>
        <nav aria-label="Store">
          {pages.map((page) => (
            <NavigationItem
              key={page.href}
              compact={rail}
              label={page.label}
              icon={page.icon}
              href={page.href}
              active={page.href === pathname}
              onSelect={() => state.setDrawerOpen(false)}
            />
          ))}
        </nav>
      </ScaffoldSide>
    )
  }}
>
  …
</Scaffold>`}
        />
        <Callout title="Tooltip provider">
          <p>
            Rail tooltips use Radix Tooltip, so mount a <C>Tooltip.Provider</C> from{' '}
            <C>@radix-ui/react-tooltip</C> once near your app root.
          </p>
        </Callout>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Use short nouns for destinations: Orders, Products, Deliveries.',
            'Mark exactly one item active, the page being shown.',
            'Use href for real routes so links can be opened in new tabs.',
            'Group long lists under small headings rather than nesting items.',
          ]}
          dontItems={[
            'Use navigation items for actions like “New order”; use a button in the dock.',
            'Show a rail without tooltips (keep compact on the items).',
            'Put badges or counts inside the label (use trailing) or add second lines; the label truncates to one line.',
            'Mix icons from different sets in one sidebar.',
          ]}
        />
      </Section>

      <Section title="Square slots">
        <p>
          The icon and trailing squares are <C>SquareSlot</C>, the kit's one leading/trailing slot: a
          square as tall as its row with the content centred. Inside a <C>Button</C> it is the button's
          height and replaces the padding at the end it sits on; <C>ListRow</C> uses it for its leading
          media. Use it for your own rows instead of sizing an icon box by hand.
        </p>
        <Code
          code={`<Button variant="ghost">
  <SquareSlot aria-hidden="true"><Inbox /></SquareSlot>
  Inbox
  <SquareSlot>4</SquareSlot>
</Button>`}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          Put the items in a <C>{'<nav aria-label="…">'}</C>. The label (and any trailing text) is always
          the accessible name, also in rail mode where it is only visually hidden; the icon is{' '}
          <C>aria-hidden</C>. The active item has{' '}
          <C>aria-current="page"</C>. The rail tooltip appears on hover and keyboard focus.
        </p>
        <Keys
          rows={[
            ['Tab', 'Moves to the next item.'],
            ['Enter', 'Follows the link or activates the button.'],
            ['Space', 'Activates a button item.'],
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'navigation-item',
  title: 'Navigation item',
  group: 'Navigation and layout',
  order: 6,
  summary: 'A sidebar destination with an icon and a label that collapses to an icon with a tooltip in a rail.',
  importLine: "import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'",
  source: 'src/navigation/navigation-item.tsx',
  api: ['NavigationItem', 'SquareSlot'],
  keywords: ['sidebar', 'nav', 'menu item', 'rail', 'link', 'aria-current', 'badge', 'count', 'square slot'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <span className="nav-demo-side" style={{ width: 180 }}>
      <NavigationItem compact={false} label="Orders" icon={<ShoppingBag />} active />
      <NavigationItem compact={false} label="Products" icon={<Package />} />
    </span>
  ),
})
