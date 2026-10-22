import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabModal } from '@feeef.dev/ui/primitives/modal'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'

export default function Scrollable() {
  const [open, setOpen] = useState(false)
  const [wilaya, setWilaya] = useState('16')
  const [delivery, setDelivery] = useState('home')
  const close = () => setOpen(false)
  return (
    <>
      <LabButton variant="filled" onClick={() => setOpen(true)}>
        Edit order
      </LabButton>
      <LabModal
        open={open}
        close={close}
        label="Edit order #10482"
        scrollable
        bottom={
          <LabDock label="Order actions">
            <LabButton variant="text" onClick={close}>
              Discard
            </LabButton>
            <LabButton variant="filled" onClick={close}>
              Save order
            </LabButton>
          </LabDock>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <LabTextField hint="Customer name" defaultValue="Yacine Benali" />
          <LabTextField hint="Phone" type="tel" defaultValue="0555 12 34 56" />
          <LabSelect hint="Wilaya" value={wilaya} onValueChange={setWilaya}>
            <LabOption value="16">16 · Alger</LabOption>
            <LabOption value="31">31 · Oran</LabOption>
            <LabOption value="25">25 · Constantine</LabOption>
          </LabSelect>
          <LabTextField hint="Commune" defaultValue="Bab Ezzouar" />
          <LabTextField hint="Address" defaultValue="Cité 2068 Logements, Bt 12" />
          <LabSelect hint="Delivery" value={delivery} onValueChange={setDelivery}>
            <LabOption value="home">Home delivery · 600 DZD</LabOption>
            <LabOption value="desk">Stop desk · 400 DZD</LabOption>
          </LabSelect>
          <LabTextField hint="Quantity" type="number" defaultValue="2" />
          <LabTextField hint="Unit price (DZD)" type="number" defaultValue="3900" />
          <LabTextField hint="Note for the courier" multiline minLines={3} />
        </div>
      </LabModal>
    </>
  )
}

export const meta = {
  title: 'Scrollable with docked actions',
  description:
    'scrollable keeps the header and the bottom dock in place while only the content scrolls. Recommended for most dialogs.',
}
