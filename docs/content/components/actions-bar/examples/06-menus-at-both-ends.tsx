import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowDownUp, Check, Copy, MoreHorizontal, Printer, Trash2 } from 'lucide-react'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { MenuSurface } from '@feeef.dev/ui/menu'
import '@feeef.dev/ui/actions/actions.css'

const item = 'lab-actions-menu__item'
const sorts = ['Newest first', 'Oldest first', 'Highest total']

export default function MenusAtBothEnds() {
  const [sort, setSort] = useState(sorts[0])
  const [status, setStatus] = useState('Nothing done yet.')
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 12 }}>
      <Toolbar
        label="Orders"
        leading={
          <ToolbarGroup label="Sorting">
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <IconButton variant="text" appearance="toolbar" aria-label="Sort orders">
                  <ArrowDownUp />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <MenuSurface asChild>
                  <DropdownMenu.Content className="lab-actions-menu" aria-label="Sort orders">
                    <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
                      {sorts.map((label) => (
                        <DropdownMenu.RadioItem key={label} value={label} className={item}>
                          <span className="lab-actions-menu__leading">
                            <DropdownMenu.ItemIndicator>
                              <Check size={18} />
                            </DropdownMenu.ItemIndicator>
                          </span>
                          {label}
                        </DropdownMenu.RadioItem>
                      ))}
                    </DropdownMenu.RadioGroup>
                  </DropdownMenu.Content>
                </MenuSurface>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </ToolbarGroup>
        }
        trailing={
          <ToolbarGroup label="Order actions">
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <IconButton variant="text" appearance="toolbar" aria-label="More actions">
                  <MoreHorizontal />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <MenuSurface asChild>
                  <DropdownMenu.Content className="lab-actions-menu" aria-label="More actions">
                    <DropdownMenu.Item className={item} onSelect={() => setStatus('Tracking numbers copied.')}>
                      <Copy size={18} aria-hidden="true" />
                      Copy tracking numbers
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className={item} onSelect={() => setStatus('Labels sent to the printer.')}>
                      <Printer size={18} aria-hidden="true" />
                      Print labels
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className={item} data-destructive onSelect={() => setStatus('Orders cancelled.')}>
                      <Trash2 size={18} aria-hidden="true" />
                      Cancel orders
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </MenuSurface>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </ToolbarGroup>
        }
      />
      <p role="status" style={{ margin: 0 }}>
        {sort} · {status}
      </p>
    </div>
  )
}

export const meta = {
  title: 'Menus at both ends of a toolbar',
  description:
    'Each menu grows out of its button as one glass bubble and covers it, lined up with the button’s outer edge: the start menu grows toward the end, the end menu toward the start.',
}
