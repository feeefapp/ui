import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowDownUp, Copy, MoreHorizontal, Printer, Trash2 } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { GlassScope } from '@feeef.dev/ui/glass'
import { MenuSurface } from '@feeef.dev/ui/menu'
import '@feeef.dev/ui/actions/actions.css'

const item = 'lab-actions-menu__item'

/** A busy backdrop (stripes, colour, text) so the menu's material shows what it does. */
const backdrop: React.CSSProperties = {
  position: 'relative',
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 'min(560px, 100%)',
  minHeight: 340,
  padding: 16,
  borderRadius: 16,
  overflow: 'hidden',
  background:
    'repeating-linear-gradient(115deg, rgb(255 255 255 / 0.35) 0 10px, transparent 10px 26px), conic-gradient(from 40deg at 30% 40%, #ef6c3b, #f2c14e, #3fa36b, #2f6fdf, #9b4fd1, #ef6c3b)',
  color: '#10130f',
  font: '800 28px/1.1 var(--lab-font)',
}

export default function GlassAndPlainTriggers() {
  return (
    <div style={backdrop}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: '70px 16px auto', opacity: 0.85 }}>
        Order #10482 · Yalidine · Confirmed · 4 200 DA · Oran → Alger
      </div>
      <GlassScope style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ToolbarGroup label="Order">
          <OrderMenu
            trigger={
              <IconButton variant="text" appearance="toolbar" aria-label="Order actions">
                <MoreHorizontal />
              </IconButton>
            }
          />
        </ToolbarGroup>
      </GlassScope>
      <div style={{ position: 'absolute', insetInlineStart: 140, insetBlockEnd: 150 }}>
        <OrderMenu
          trigger={
            <Button variant="tonal">
              <ArrowDownUp size={16} aria-hidden="true" /> Sort
            </Button>
          }
        />
      </div>
    </div>
  )
}

function OrderMenu({ trigger }: { trigger: React.ReactNode }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <MenuSurface asChild>
          <DropdownMenu.Content className="lab-actions-menu" aria-label="Order actions">
            <DropdownMenu.Item className={item}>
              <Copy size={18} aria-hidden="true" />
              Copy tracking number
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item}>
              <Printer size={18} aria-hidden="true" />
              Print shipping label
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="lab-menu__separator" />
            <DropdownMenu.Item className={item} data-destructive>
              <Trash2 size={18} aria-hidden="true" />
              Cancel order
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </MenuSurface>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export const meta = {
  title: 'Glass and plain triggers',
  description:
    'Over a busy backdrop: the toolbar button’s menu is born out of its glass and merges back into it; the plain button in content has no glass, so its menu grows out of a droplet at the button’s centre.',
}
