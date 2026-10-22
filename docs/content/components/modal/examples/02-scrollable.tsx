import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Modal } from '@feeef.dev/ui/primitives/modal'
import { Dock } from '@feeef.dev/ui/dock'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { Option, Select } from '@feeef.dev/ui/primitives/select'

export default function Scrollable() {
  const [open, setOpen] = useState(false)
  const [wilaya, setWilaya] = useState('16')
  const [delivery, setDelivery] = useState('home')
  const close = () => setOpen(false)
  return (
    <>
      <Button variant="filled" onClick={() => setOpen(true)}>
        Edit order
      </Button>
      <Modal
        open={open}
        close={close}
        label="Edit order #10482"
        scrollable
        bottom={
          <Dock label="Order actions">
            <Button variant="text" onClick={close}>
              Discard
            </Button>
            <Button variant="filled" onClick={close}>
              Save order
            </Button>
          </Dock>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <TextField hint="Customer name" defaultValue="Yacine Benali" />
          <TextField hint="Phone" type="tel" defaultValue="0555 12 34 56" />
          <Select hint="Wilaya" value={wilaya} onValueChange={setWilaya}>
            <Option value="16">16 · Alger</Option>
            <Option value="31">31 · Oran</Option>
            <Option value="25">25 · Constantine</Option>
          </Select>
          <TextField hint="Commune" defaultValue="Bab Ezzouar" />
          <TextField hint="Address" defaultValue="Cité 2068 Logements, Bt 12" />
          <Select hint="Delivery" value={delivery} onValueChange={setDelivery}>
            <Option value="home">Home delivery · 600 DZD</Option>
            <Option value="desk">Stop desk · 400 DZD</Option>
          </Select>
          <TextField hint="Quantity" type="number" defaultValue="2" />
          <TextField hint="Unit price (DZD)" type="number" defaultValue="3900" />
          <TextField hint="Note for the courier" multiline minLines={3} />
        </div>
      </Modal>
    </>
  )
}

export const meta = {
  title: 'Scrollable with docked actions',
  description:
    'scrollable keeps the header and the bottom dock in place while only the content scrolls. Recommended for most dialogs.',
}
