import { useRef, useState } from 'react'
import { Phone } from 'lucide-react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabModal } from '@feeef.dev/ui/primitives/modal'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'

export default function Focus() {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('0555 12 34 56')
  const phoneField = useRef<HTMLInputElement>(null)
  const row = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)
  return (
    <>
      <LabButton ref={row} variant="elevated" onClick={() => setOpen(true)}>
        <Phone size={18} />
        {phone}
      </LabButton>
      <LabModal
        open={open}
        close={close}
        label="Correct the phone number"
        scrollable
        fitContent
        initialFocusRef={phoneField}
        returnFocusRef={row}
        bottom={
          <LabDock label="Phone actions">
            <LabButton variant="filled" onClick={close}>
              Save
            </LabButton>
          </LabDock>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <LabTextField hint="Customer name" defaultValue="Yacine Benali" readOnly />
          <LabTextField
            ref={phoneField}
            hint="Phone"
            type="tel"
            value={phone}
            onValueChange={setPhone}
          />
        </div>
      </LabModal>
    </>
  )
}

export const meta = {
  title: 'Initial and return focus',
  description:
    'initialFocusRef puts the cursor in the field the person came to fix. returnFocusRef says where focus goes after closing.',
}
