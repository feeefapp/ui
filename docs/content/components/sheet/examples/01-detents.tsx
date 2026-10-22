import { useState } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { LabSheet, LabNavigationPage, LabNavigationStack } from '@feeef.dev/ui/containers'
import { LabListRow, LabListSection } from '@feeef.dev/ui/primitives/list'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabDock } from '@feeef.dev/ui/dock'
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
            <LabNavigationStack label="Orders">
              <LabNavigationPage
                key="orders"
                title="Orders"
                subtitle={`${status} · ${wilayas.length ? wilayas.join(', ') : 'All wilayas'}`}
                trailing={
                  <LabToolbarGroup label="Orders tools">
                    <LabButton variant="text" appearance="toolbar" onClick={() => setOpen(true)}>
                      <SlidersHorizontal size={18} /> Filters
                    </LabButton>
                  </LabToolbarGroup>
                }
              >
                <LabListSection header="Results">
                  {Array.from({ length: 12 }, (_, i) => (
                    <LabListRow
                      key={i}
                      static
                      title={`#${1048 - i} · ${wilayas[0] ?? 'Alger'}`}
                      subtitle={status}
                      trailing={`${(2 + i) * 450} DA`}
                    />
                  ))}
                </LabListSection>
              </LabNavigationPage>
            </LabNavigationStack>
          </div>

          <LabSheet
            open={open}
            onOpenChange={setOpen}
            label="Filters"
            container={screen}
            detents={['medium', 'large']}
            top={
              <div className="demo-sheet-bar">
                <LabToolbarGroup label="Sheet title">
                  <strong className="demo-sheet-title">Filters</strong>
                </LabToolbarGroup>
                <LabToolbarGroup label="Sheet actions">
                  <LabButton variant="text" appearance="toolbar" onClick={() => setWilayas([])}>
                    Reset
                  </LabButton>
                </LabToolbarGroup>
              </div>
            }
            bottom={
              <LabDock label="Apply filters">
                <LabButton variant="filled" onClick={() => setOpen(false)}>
                  Show 24 orders
                </LabButton>
              </LabDock>
            }
          >
            <LabListSection header="Status">
              {STATUSES.map((s) => (
                <LabListRow
                  key={s}
                  title={s}
                  trailing={s === status ? <Check size={18} aria-label="Selected" /> : undefined}
                  onClick={() => setStatus(s)}
                />
              ))}
            </LabListSection>
            <LabListSection header="Wilaya" footer="Drag the sheet up to see every wilaya.">
              {WILAYAS.map((w) => (
                <LabListRow
                  key={w}
                  title={w}
                  trailing={wilayas.includes(w) ? <Check size={18} aria-label="Selected" /> : undefined}
                  onClick={() =>
                    setWilayas((list) => (list.includes(w) ? list.filter((x) => x !== w) : [...list, w]))
                  }
                />
              ))}
            </LabListSection>
          </LabSheet>
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
