import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Stage } from '../../../src/blocks/example'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Stage>
        <PopoverSurface style={{ width: 'min(100%, 280px)', padding: 16, display: 'grid', gap: 6 }}>
          <strong>Order #10482</strong>
          <span>Yacine Benali · Bab Ezzouar, Alger</span>
          <span>2 × Air Max 90 · 7 800 DZD</span>
        </PopoverSurface>
      </Stage>

      <Section title="When to use">
        <p>
          <C>PopoverSurface</C> is the material every floating panel in the kit shares: menus,
          select lists, the date picker, the actions overflow. Use it when you build your own popover
          or menu, so it looks like the rest of the app: an opaque surface, a hairline border, group
          corners, a soft shadow and a faint animated pixel grain.
        </p>
        <p>
          It is paint only. It does not open, position, trap focus or dismiss. Pair it with a
          behavior library; the kit uses Radix Popover and Radix DropdownMenu. For a menu of actions
          that also needs overflow handling, use <Link to="/components/actions-bar">Actions bar</Link>{' '}
          instead of building one.
        </p>
      </Section>

      <Section title="Decorating a Radix component">
        <p>
          With <C>asChild</C>, the surface adds no element of its own. It merges its class, ref and
          props onto its single child, and inserts the decoration layer before the child’s content.
          Place it directly around the Radix <C>Content</C>, inside the <C>Portal</C>, so Radix keeps
          positioning the element that is actually painted.
        </p>
        <Code
          code={`import * as Popover from '@radix-ui/react-popover'
import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'

<Popover.Root>
  <Popover.Trigger asChild>
    <Button variant="tonal">Delivery note</Button>
  </Popover.Trigger>
  <Popover.Portal>
    <PopoverSurface asChild>
      <Popover.Content sideOffset={8} collisionPadding={12} aria-label="Delivery note">
        …
      </Popover.Content>
    </PopoverSurface>
  </Popover.Portal>
</Popover.Root>`}
        />
        <Table
          head={['Prop', 'Effect']}
          rows={[
            [<C>asChild</C>, 'Decorate the child element instead of rendering a div. Use it for every Radix content part.'],
            [<C>seed</C>, 'Changes the pixel grain pattern, so two surfaces open at once don’t look identical.'],
            ['Any div attribute', <>Without <C>asChild</C>, the surface renders a <C>div</C> and passes attributes such as <C>style</C>, <C>role</C> and <C>aria-label</C> through.</>],
          ]}
        />
        <p>
          The surface sets no width or padding: size the content yourself. Menu rows inside it get
          corners that follow the surface’s curve when they use the kit’s menu item classes, as in
          the dropdown example.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Put the surface directly around the element Radix positions.',
            <>Give every popover an accessible name (<C>aria-label</C> on the content).</>,
            <>Set <C>sideOffset</C> and <C>collisionPadding</C> so it never touches the trigger or the screen edge.</>,
            'Keep popovers small; move a long form into a modal.',
          ]}
          dontItems={[
            'Wrap the Radix Content in an extra div; the positioned element would be unpainted.',
            'Add your own background, border or shadow on top of the surface.',
            'Use it as a card on the page; it is meant for floating layers.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The decoration is <C>aria-hidden</C> and ignores the pointer, so the surface adds nothing to
          the accessibility tree. Roles, focus and keyboard behavior come from the component you
          decorate. With Radix:
        </p>
        <Keys
          rows={[
            ['Enter', 'On the trigger, opens the popover or menu.'],
            ['Escape', 'Closes it and returns focus to the trigger.'],
            ['Tab', 'Popover: moves through its controls. Menu: closes it.'],
            ['ArrowDown', 'Menu: next item.'],
            ['ArrowUp', 'Menu: previous item.'],
            ['ArrowRight', 'Menu: opens a submenu.'],
          ]}
        />
        <Callout title="Reduced motion and transparency">
          <p>
            The grain freezes under reduced motion and disappears under reduced transparency and forced
            colors, where the surface falls back to system colors.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'popover-surface',
  title: 'Popover surface',
  group: 'Containment',
  order: 2,
  summary: 'The shared material for menus and popovers. Wrap a Radix Popover or DropdownMenu content with asChild.',
  importLine: "import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'",
  source: 'src/primitives/popover-surface.tsx',
  api: ['PopoverSurface'],
  keywords: ['popover', 'menu', 'dropdown', 'radix', 'floating', 'surface', 'panel'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <PopoverSurface style={{ width: 180, padding: 12, display: 'grid', gap: 4, fontSize: 13 }}>
      <strong>Order #10482</strong>
      <span>7 800 DZD · Alger</span>
    </PopoverSurface>
  ),
})
