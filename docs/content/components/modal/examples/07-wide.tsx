import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabModal } from '@feeef.dev/ui/primitives/modal'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'

export default function Wide() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <LabButton variant="outlined" onClick={() => setOpen(true)}>
        Compare addresses
      </LabButton>
      <LabModal
        open={open}
        close={close}
        label="Merge duplicate customers"
        scrollable
        fitContent
        wide
        bottom={
          <LabDock label="Merge actions">
            <LabButton variant="text" onClick={close}>
              Keep both
            </LabButton>
            <LabButton variant="filled" onClick={close}>
              Merge customers
            </LabButton>
          </LabDock>
        }
      >
        <div
          style={{
            display: 'grid',
            gap: 24,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {[
            { name: 'Yacine Benali', phone: '0555 12 34 56', city: 'Bab Ezzouar, Alger' },
            { name: 'Yacine B.', phone: '0555123456', city: 'Bab Ezzouar, Alger' },
          ].map((customer, index) => (
            <div key={index} style={{ display: 'grid', gap: 12 }}>
              <strong>{index === 0 ? 'Existing customer' : 'New order'}</strong>
              <LabTextField hint="Name" defaultValue={customer.name} />
              <LabTextField hint="Phone" defaultValue={customer.phone} />
              <LabTextField hint="City" defaultValue={customer.city} />
            </div>
          ))}
        </div>
      </LabModal>
    </>
  )
}

export const meta = {
  title: 'Wide',
  description: 'wide gives side-by-side content room (980px, capped by the viewport). Columns still stack on phones.',
}
