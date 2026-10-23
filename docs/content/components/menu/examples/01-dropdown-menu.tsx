import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronRight, Copy, MoreHorizontal, Printer, Trash2, Truck } from 'lucide-react'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { MenuSurface } from '@feeef.dev/ui/menu'
import '@feeef.dev/ui/actions/actions.css'

const item = 'lab-actions-menu__item'

export default function DropdownMenuExample() {
  const [status, setStatus] = useState('Order #10482 · Confirmed')
  return (
    <div className="demo-row">
      <span role="status">{status}</span>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <IconButton variant="text" aria-label="Order actions">
            <MoreHorizontal size={20} />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <MenuSurface asChild>
            <DropdownMenu.Content className="lab-actions-menu" aria-label="Order actions">
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
                  <MenuSurface asChild cover={false}>
                    <DropdownMenu.SubContent className="lab-actions-menu" aria-label="Couriers">
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
                  </MenuSurface>
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
          </MenuSurface>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

export const meta = {
  title: 'Dropdown menu',
  description:
    'A Radix DropdownMenu on MenuSurface: the glass bubble grows out of the button and covers it. The submenu opens beside its row.',
}
