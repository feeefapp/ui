import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronRight, Copy, MoreHorizontal, Printer, Trash2, Truck } from 'lucide-react'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabPopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import '@feeef.dev/ui/actions/actions.css'

const item = 'lab-actions-menu__item'

export default function DropdownMenuExample() {
  const [status, setStatus] = useState('Order #10482 · Confirmed')
  return (
    <div className="demo-row">
      <span role="status">{status}</span>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <LabIconButton variant="text" aria-label="Order actions">
            <MoreHorizontal size={20} />
          </LabIconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <LabPopoverSurface asChild>
            <DropdownMenu.Content className="lab-actions-menu" sideOffset={8} collisionPadding={12} align="end">
              <DropdownMenu.Item className={item} onSelect={() => setStatus('Tracking number copied.')}>
                <Copy size={18} aria-hidden="true" />
                Copy tracking number
              </DropdownMenu.Item>
              <DropdownMenu.Item className={item} onSelect={() => setStatus('Label sent to printer.')}>
                <Printer size={18} aria-hidden="true" />
                Print shipping label
              </DropdownMenu.Item>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className={item}>
                  <Truck size={18} aria-hidden="true" />
                  <span style={{ flex: 1 }}>Send with</span>
                  <ChevronRight size={16} aria-hidden="true" className="lab-dir-flip" />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <LabPopoverSurface asChild seed="courier-menu">
                    <DropdownMenu.SubContent className="lab-actions-menu" sideOffset={4} collisionPadding={12}>
                      {['Yalidine', 'ZR Express', 'Maystro'].map((courier) => (
                        <DropdownMenu.Item
                          key={courier}
                          className={item}
                          onSelect={() => setStatus(`Order #10482 · Sent with ${courier}`)}
                        >
                          {courier}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.SubContent>
                  </LabPopoverSurface>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
              <DropdownMenu.Item
                className={item}
                data-destructive
                onSelect={() => setStatus('Order #10482 · Cancelled')}
              >
                <Trash2 size={18} aria-hidden="true" />
                Cancel order
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </LabPopoverSurface>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

export const meta = {
  title: 'Dropdown menu',
  description:
    'Radix DropdownMenu on the surface, with the kit’s menu row classes. Each submenu gets its own surface and seed.',
}
