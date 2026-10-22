import { useRef, useState } from 'react'
import { Phone } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Modal } from '@feeef.dev/ui/primitives/modal'
import { Dock } from '@feeef.dev/ui/dock'
import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function Focus() {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('0555 12 34 56')
  const phoneField = useRef<HTMLInputElement>(null)
  const row = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)
  return (
    <>
      <Button ref={row} variant="elevated" onClick={() => setOpen(true)}>
        <Phone size={18} />
        {phone}
      </Button>
      <Modal
        open={open}
        close={close}
        label="Correct the phone number"
        scrollable
        fitContent
        initialFocusRef={phoneField}
        returnFocusRef={row}
        bottom={
          <Dock label="Phone actions">
            <Button variant="filled" onClick={close}>
              Save
            </Button>
          </Dock>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <TextField hint="Customer name" defaultValue="Yacine Benali" readOnly />
          <TextField
            ref={phoneField}
            hint="Phone"
            type="tel"
            value={phone}
            onValueChange={setPhone}
          />
        </div>
      </Modal>
    </>
  )
}

export const meta = {
  title: 'Initial and return focus',
  description:
    'initialFocusRef puts the cursor in the field the person came to fix. returnFocusRef says where focus goes after closing.',
}
