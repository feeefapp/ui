import { Bell, CreditCard, Store, Truck, Users } from 'lucide-react'
import { LabListRow, LabListSection } from '@feeef.dev/ui/primitives/list'
import { LabSlideSwitch } from '@feeef.dev/ui/primitives/slider'
import { useState } from 'react'

export default function SettingsList() {
  const [notify, setNotify] = useState(true)
  return (
    <div className="demo-wide">
      <LabListSection header="Store">
        <LabListRow chevron leading={<Store />} title="Atlas Store" subtitle="atlas.feeef.store" onClick={() => {}} />
        <LabListRow chevron leading={<Truck />} title="Couriers" trailing="3 active" onClick={() => {}} />
        <LabListRow chevron leading={<CreditCard />} title="Payments" trailing="Cash on delivery" onClick={() => {}} />
      </LabListSection>
      <LabListSection header="Team" footer="Agents see only the orders assigned to them.">
        <LabListRow chevron leading={<Users />} title="Members" trailing="5" onClick={() => {}} />
        <LabListRow
          static
          leading={<Bell />}
          title="Order alerts"
          trailing={<LabSlideSwitch label="Order alerts" checked={notify} onCheckedChange={setNotify} />}
        />
      </LabListSection>
    </div>
  )
}

export const meta = {
  title: 'Grouped rows',
  description:
    'Sections with headers and footers; rows that open a page show a chevron, static rows show a value or a control.',
}
