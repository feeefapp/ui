import { useRef, useState } from 'react'
import { Phone } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Modal, PresentationDock } from '@feeef.dev/ui/presentation'
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
        onOpenChange={setOpen}
        label="Correct the phone number"
        title="Correct the phone number"
        initialFocusRef={phoneField}
        returnFocusRef={row}
        dock={
          <PresentationDock>
            <Button variant="filled" onClick={close}>
              Save
            </Button>
          </PresentationDock>
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
