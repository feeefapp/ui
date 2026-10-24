import { useState } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { Sheet, NavigationPage, NavigationStack } from '@feeef.dev/ui/containers'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { Button } from '@feeef.dev/ui/primitives/button'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { PresentationDock } from '@feeef.dev/ui/presentation'
import { Device } from '../../../../src/blocks/device'

const STATUSES = ['New', 'Confirmed', 'Shipped', 'Delivered', 'Returned', 'Cancelled']
const WILAYAS = ['Alger', 'Oran', 'Constantine', 'Blida', 'Sétif', 'Annaba', 'Tlemcen', 'Béjaïa', 'Batna', 'Djelfa']

export default function FilterSheet() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('Confirmed')
  const [wilayas, setWilayas] = useState<string[]>(['Alger'])
  return (
    <Device label="A phone with a filters sheet">
      {(screen) => (
        <>
          {/* data-lab-sheet-backdrop marks what recedes behind a full-height sheet. */}
          <div className="demo-fill" data-lab-sheet-backdrop="">
            <NavigationStack label="Orders">
              <NavigationPage
                key="orders"
                title="Orders"
                subtitle={`${status} · ${wilayas.length ? wilayas.join(', ') : 'All wilayas'}`}
                trailing={
                  <ToolbarGroup label="Orders tools">
                    <Button variant="text" appearance="toolbar" onClick={() => setOpen(true)}>
                      <SlidersHorizontal size={18} /> Filters
                    </Button>
                  </ToolbarGroup>
                }
              >
                <ListSection header="Results">
                  {Array.from({ length: 12 }, (_, i) => (
                    <ListRow
                      key={i}
                      static
                      title={`#${1048 - i} · ${wilayas[0] ?? 'Alger'}`}
                      subtitle={status}
                      trailing={`${(2 + i) * 450} DA`}
                    />
                  ))}
                </ListSection>
              </NavigationPage>
            </NavigationStack>
          </div>

          <Sheet
            open={open}
            onOpenChange={setOpen}
            label="Filters"
            container={screen}
            detents={['medium', 'large']}
            title="Filters"
            trailing={
              <ToolbarGroup label="Sheet actions">
                <Button variant="text" appearance="toolbar" onClick={() => setWilayas([])}>
                  Reset
                </Button>
              </ToolbarGroup>
            }
            dock={
              <PresentationDock label="Apply filters">
                <Button variant="filled" onClick={() => setOpen(false)}>
                  Show 24 orders
                </Button>
              </PresentationDock>
            }
          >
            <ListSection header="Status">
              {STATUSES.map((s) => (
                <ListRow
                  key={s}
                  title={s}
                  trailing={s === status ? <Check size={18} aria-label="Selected" /> : undefined}
                  onClick={() => setStatus(s)}
                />
              ))}
            </ListSection>
            <ListSection header="Wilaya" footer="Drag the sheet up to see every wilaya.">
              {WILAYAS.map((w) => (
                <ListRow
                  key={w}
                  title={w}
                  trailing={wilayas.includes(w) ? <Check size={18} aria-label="Selected" /> : undefined}
                  onClick={() =>
                    setWilayas((list) => (list.includes(w) ? list.filter((x) => x !== w) : [...list, w]))
                  }
                />
              ))}
            </ListSection>
          </Sheet>
        </>
      )}
    </Device>
  )
}

export const meta = {
  title: 'Filters with two heights',
  description:
    'detents={["medium", "large"]}: it opens at half height. Drag the grabber or the content up to grow it (the page behind recedes), flick down to close. Scrolling the list hands off to dragging the sheet when it reaches the top.',
}
