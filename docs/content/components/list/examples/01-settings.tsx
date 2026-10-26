import { Bell, CreditCard, Store, Truck, Users } from 'lucide-react'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'
import { useState } from 'react'

export default function SettingsList() {
  const [notify, setNotify] = useState(true)
  return (
    <div className="demo-wide">
      <ListSection header="Store">
        <ListRow chevron leading={<Store />} title="Atlas Store" subtitle="atlas.feeef.store" onClick={() => {}} />
        <ListRow chevron leading={<Truck />} title="Couriers" trailing="3 active" onClick={() => {}} />
        <ListRow chevron leading={<CreditCard />} title="Payments" trailing="Cash on delivery" onClick={() => {}} />
      </ListSection>
      <ListSection header="Team" footer="Agents see only the orders assigned to them.">
        <ListRow chevron leading={<Users />} title="Members" trailing="5" onClick={() => {}} />
        <ListRow
          static
          leading={<Bell />}
          title="Order alerts"
          trailing={<SlideSwitch label="Order alerts" checked={notify} onCheckedChange={setNotify} />}
        />
      </ListSection>
    </div>
  )
}

export const meta = {
  title: 'Grouped rows',
  description:
    'Sections with headers and footers; rows that open a page show a chevron, static rows show a value or a control.',
}
