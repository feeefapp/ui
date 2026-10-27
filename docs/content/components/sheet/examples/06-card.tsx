import { Search, Store, Truck } from 'lucide-react'
import { Sheet } from '@feeef.dev/ui/containers'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { Device } from '../../../../src/blocks/device'
import { DemoMap } from '../demo-map'

export default function CardSheet() {
  return (
    <Device kind="tablet" label="A tablet with a map and a floating card">
      {(screen) => (
        <>
          <DemoMap />
          <Sheet
            open
            onOpenChange={() => {}}
            label="Hubs"
            container={screen}
            detents={['peek', 'medium', 'large']}
            defaultDetent="medium"
            dismissible={false}
            modal={false}
            regular="card"
            header={
              <div className="demo-maps-header" data-lab-sheet-handle="">
                <TextField variant="tonal" placeholder="Search hubs" aria-label="Search hubs" leadingIcon={<Search size={18} />} />
              </div>
            }
          >
            <ListSection header="Nearby">
              <ListRow leading={<Store size={18} />} title="Warehouse, Bab Ezzouar" subtitle="Open until 20:00" onClick={() => {}} />
              <ListRow leading={<Truck size={18} />} title="Yalidine hub, Hussein Dey" subtitle="Drop-off until 17:00" onClick={() => {}} />
              <ListRow leading={<Truck size={18} />} title="ZR Express, Kouba" subtitle="Drop-off until 16:30" onClick={() => {}} />
            </ListSection>
          </Sheet>
        </>
      )}
    </Device>
  )
}

export const meta = {
  title: 'A floating card on wide screens',
  description:
    'regular="card": from 720 px the sheet becomes a glass card at the leading edge, with the same detents and dragging, like Maps on iPad. It never reaches the edges.',
}
