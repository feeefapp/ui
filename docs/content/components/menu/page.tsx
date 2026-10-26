import { Copy, Printer, Trash2 } from 'lucide-react'
import { MenuSurface } from '@feeef.dev/ui/menu'
import '@feeef.dev/ui/actions/actions.css'
import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Stage } from '../../../src/blocks/example'
import { Link } from '../../../src/router'

function StaticMenu() {
  return (
    <MenuSurface role="menu" aria-label="Order actions" style={{ width: 260 }}>
      <div className="lab-actions-menu__item" role="menuitem">
        <span className="lab-actions-menu__leading">
          <Copy aria-hidden="true" />
        </span>
        Copy tracking number
      </div>
      <div className="lab-actions-menu__item" role="menuitem">
        <span className="lab-actions-menu__leading">
          <Printer aria-hidden="true" />
        </span>
        Print shipping label
      </div>
      <div className="lab-menu__separator" role="separator" />
      <div className="lab-actions-menu__item" role="menuitem" data-destructive>
        <span className="lab-actions-menu__leading">
          <Trash2 aria-hidden="true" />
        </span>
        Cancel order
      </div>
    </MenuSurface>
  )
}

function Overview() {
  return (
    <>
      <Stage>
        <StaticMenu />
      </Stage>

      <Section title="When to use">
        <p>
          <C>MenuSurface</C> is the kit’s menu: a list of choices or commands that a button opens.
          It is one glass shape of the kit’s <Link to="/components/glass-container">glass
          container</Link>, in the thick menu material, born out of the button’s glass and covering
          it, like menus on iOS 26. The <Link to="/components/actions-bar">Actions bar</Link> overflow and group menus,{' '}
          <Link to="/components/select">Select</Link>, the language switcher and the prompt
          composer’s add menu all use it. For a panel that holds a form or a picker (a delivery note,
          a date), use <Link to="/components/popover-surface">PopoverSurface</Link> instead: popovers
          sit beside their trigger in the same thick glass and don’t morph.
        </p>
      </Section>

      <Section title="Decorating a Radix component">
        <p>
          With <C>asChild</C>, put it directly around a Radix <C>DropdownMenu.Content</C>,{' '}
          <C>Select.Content</C> or <C>Popover.Content</C>, inside the <C>Portal</C>. Radix keeps
          focus, typeahead, keyboard and dismissal; the surface adds the glass, the motion and its
          placement: <C>sideOffset</C> (it covers the trigger), <C>align</C> (the trigger’s outer edge
          in a toolbar, centred elsewhere), <C>collisionPadding</C> and <C>collisionBoundary</C>.
          Props you set on the content win, so leave those out unless you mean them. Submenus pass{' '}
          <C>{'cover={false}'}</C> and open beside their row.
        </p>
        <Code
          code={`import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MenuSurface } from '@feeef.dev/ui/menu'

<DropdownMenu.Root modal={false}>
  <DropdownMenu.Trigger asChild>
    <IconButton variant="text" aria-label="Order actions"><MoreHorizontal /></IconButton>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <MenuSurface asChild>
      <DropdownMenu.Content className="lab-actions-menu" aria-label="Order actions">
        <DropdownMenu.Item className="lab-actions-menu__item">Print shipping label</DropdownMenu.Item>
        <DropdownMenu.Separator className="lab-menu__separator" />
        <DropdownMenu.Item className="lab-actions-menu__item" data-destructive>Cancel order</DropdownMenu.Item>
      </DropdownMenu.Content>
    </MenuSurface>
  </DropdownMenu.Portal>
</DropdownMenu.Root>`}
        />
        <p>
          In Flutter, put <C>MenuSurface</C> in an <C>AnchoredPanel</C> with <C>cover: true</C>, or
          use <C>ActionsMenuAnchor</C>, which does both. Rows are <C>MenuRow</C>,{' '}
          <C>MenuSeparator</C> and <C>MenuLabel</C>.
        </p>
      </Section>

      <Section title="Glass">
        <p>
          The menu is a <C>GlassContainer</C> with <C>{'material="menu"'}</C> holding one bubble, so
          it has everything container glass has: the dark exterior hairline, the rim light that
          turns toward the pointer, the lens at the rim and the shadow. Its material is thicker than
          a toolbar’s because menus carry text over anything: the full regular material veiled at
          least 88 % and blurred at least 20 px whatever the theme’s <C>glassBlur</C>, with a
          deeper shadow (<C>GLASS_MENU</C>; Flutter <C>GlassKind.menu</C>). Reduced transparency,
          more contrast and <C>{"glass: 'solid'"}</C> make it opaque; forced colors paint system
          colors.
        </p>
      </Section>

      <Section title="How it moves">
        <p>
          The menu’s glass is born out of its button the way a container births a bubble out of its
          neighbour: the bubble’s <C>origin</C> is the button. A button in its own glass bubble (a
          toolbar button) gives that bubble, so the menu leaves the button’s glass and, when it
          closes, flies back and merges into it. A button with no glass (a plain button in content)
          gives a small droplet at its centre (<C>GLASS_ORIGIN_SEED</C>, 8 px), so a glass copy of
          the button never pops in: the menu grows out of the point you pressed and shrinks back into
          it. A button inside a wider bubble (a group of buttons) gives its own rect.
        </p>
        <p>
          The springs are measured from iOS 26.2 menus (<C>GLASS_ORIGIN_SPRINGS</C>): out on{' '}
          <C>SPRINGS.menu</C> (response 0.30 s, damping 0.73, settled by about 0.36 s), back on{' '}
          <C>SPRINGS.menuDismiss</C>, narrowing past the button before it lands by 0.48 s. The rows
          are in the glass from its first frame, clipped to it, blurred and faint, and sharpen by
          about 0.42 s; closing, they go within 50 ms, then the glass flies back while the button
          reappears. Nothing behind the menu dims. Reduced motion shows the glass in place and
          crossfades the rows; closing, the rows fade first and then the glass leaves.
        </p>
      </Section>

      <Section title="Placement and app bounds">
        <p>
          A menu covers its button. It lines up with the edge it grows from: top-aligned when it
          opens down, bottom-aligned when there is only room above. In a toolbar, glass group or dock
          it also lines up with the button’s edge on its side of the app (a menu at the end of a bar
          grows toward the start), elsewhere it is centred on the button. It is at least 250 px wide,
          grows with its content up to 360 px, and scrolls when it is taller than the room it has.
        </p>
        <p>
          Every floating panel stays 12 px inside the window. When your app does not fill the window
          (a phone frame, an embedded preview), wrap it in <C>FloatingBoundary</C>: menus, selects,
          popovers and tooltips opened inside then render inside it and never cross its edges. In
          Flutter, <C>FloatingBoundary</C> hosts their overlay, and every popup lays out inside the
          overlay that hosts it, not the screen.
        </p>
        <Code
          code={`import { FloatingBoundary } from '@feeef.dev/ui/menu'

<FloatingBoundary className="preview-frame">
  <App />
</FloatingBoundary>`}
        />
      </Section>

      <Section title="Beside the trigger">
        <p>
          A menu that should leave its trigger visible, such as a sidebar rail item’s menu, passes{' '}
          <C>{'cover={false}'}</C> and a <C>side</C> (<C>start</C>, <C>end</C>, <C>top</C> or{' '}
          <C>bottom</C>, logical, so <C>end</C> is the left in RTL). It opens <C>gap</C> px away
          (4 by default), lined up with the trigger’s start edge, and flips to the other side when
          there is no room. Submenus always open toward the inline end. A menu beside its trigger is
          never squeezed under its minimum width: when neither side has room for it (a submenu in a
          390 px window), it drops below its row over the parent menu, like iOS, and shifts to stay
          inside the app.
        </p>
        <Code
          code={`<MenuSurface asChild cover={false} side="end">
  <DropdownMenu.Content className="lab-actions-menu" aria-label="Orders">…</DropdownMenu.Content>
</MenuSurface>

// Flutter
ActionsMenuAnchor(
  label: 'Orders',
  actions: actions,
  cover: false,
  side: PanelSide.end,
  builder: (open) => IconButton(
    ariaLabel: 'Orders',
    onClick: open ?? () {},
    icon: const LucideIcon(LucideIcons.package),
  ),
)`}
        />
        <p>
          Rows keep an 18 px icon slot only when some row of that menu has an icon, a check or a
          loader, so labels line up; a menu of plain labels has no empty slot.
        </p>
      </Section>

      <Section title="Tokens">
        <Table
          head={['Token', 'Default', 'Compact · thin']}
          rows={[
            [<C>--lab-menu-min-width</C>, '250px', '220px · 200px'],
            [<C>--lab-menu-max-width</C>, '360px', '360px'],
            [<C>--lab-menu-row</C>, '42px (44px on touch)', '34px · 28px'],
            [<C>--lab-menu-separator</C>, '21px band, hairline in the middle', '15px · 11px'],
            [<C>--lab-menu-inset</C>, '10px around the rows', '6px · 4px'],
            [<C>--lab-menu-radius</C>, <C>--lab-radius-glass</C>, 'same'],
            [<C>--lab-menu-tint</C>, '1: the full regular material', 'same'],
            [<C>--lab-menu-veil</C>, 'the large glass veil, at least 88%', 'same'],
            [<C>--lab-menu-blur</C>, 'the large glass blur, at least 20px', 'same'],
            [<C>--lab-menu-exit</C>, '500ms: mounted until the glass has landed', '120ms with reduced motion'],
          ]}
        />
        <p>
          Flutter reads the same numbers from <C>MenuTokens</C>; override them for a subtree with{' '}
          <C>MenuTokensScope</C>.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Use a menu for choices and commands, a popover for forms and pickers.',
            'Group related rows and split groups with a separator.',
            'Put destructive commands last, in their own group, with data-destructive.',
            'Wrap an app that lives in a frame in FloatingBoundary.',
          ]}
          dontItems={[
            'Set sideOffset or align on the content unless you mean to override the morph’s placement.',
            'Paint your own background, border or shadow on the content; the surface owns them.',
            'Put a form in a menu; use a popover or a sheet.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The glass is the container’s <C>aria-hidden</C> material and ignores the pointer; roles, focus and keys come
          from Radix. The button is hidden while the menu covers it and keeps its focus state, and
          focus returns to it when the menu closes.
        </p>
        <Keys
          rows={[
            ['Enter', 'On the button, opens the menu; on a row, runs it.'],
            ['ArrowDown', 'Next row.'],
            ['ArrowUp', 'Previous row.'],
            ['ArrowRight', 'Opens a submenu.'],
            ['Escape', 'Closes the menu and returns focus to its button.'],
          ]}
        />
        <Callout title="Reduced motion and transparency">
          <p>
            Reduced motion shows the glass in place and crossfades the rows instead of springing. Reduced transparency, more contrast and{' '}
            <C>glass: 'solid'</C> paint the menu on the opaque surface; forced colors use system
            colors.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'menu',
  title: 'Menu',
  group: 'Containment',
  order: 3,
  summary: 'A glass menu born out of the button that opens it, merging back into it, inside the app.',
  importLine: "import { MenuSurface, FloatingBoundary } from '@feeef.dev/ui/menu'",
  source: 'src/menu/menu-surface.tsx',
  api: ['MenuSurface', 'FloatingBoundary'],
  keywords: ['menu', 'dropdown', 'context menu', 'glass', 'morph', 'popup', 'boundary', 'radix'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <MenuSurface aria-label="Order actions" style={{ width: 200, fontSize: 13 }}>
      <div className="lab-actions-menu__item">Print label</div>
      <div className="lab-actions-menu__item" data-destructive>
        Cancel order
      </div>
    </MenuSurface>
  ),
})
