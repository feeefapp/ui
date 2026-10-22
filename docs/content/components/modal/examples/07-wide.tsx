import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Modal } from '@feeef.dev/ui/primitives/modal'
import { Dock } from '@feeef.dev/ui/dock'
import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function Wide() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Compare addresses
      </Button>
      <Modal
        open={open}
        close={close}
        label="Merge duplicate customers"
        scrollable
        fitContent
        wide
        bottom={
          <Dock label="Merge actions">
            <Button variant="text" onClick={close}>
              Keep both
            </Button>
            <Button variant="filled" onClick={close}>
              Merge customers
            </Button>
          </Dock>
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
              <TextField hint="Name" defaultValue={customer.name} />
              <TextField hint="Phone" defaultValue={customer.phone} />
              <TextField hint="City" defaultValue={customer.city} />
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}

export const meta = {
  title: 'Wide',
  description: 'wide gives side-by-side content room (980px, capped by the viewport). Columns still stack on phones.',
}
