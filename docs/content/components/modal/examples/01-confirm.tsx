import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabModal } from '@feeef.dev/ui/primitives/modal'

export default function Confirm() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('Order #10482 is waiting for confirmation.')
  const close = () => setOpen(false)
  return (
    <div className="demo-column">
      <LabButton variant="destructive" onClick={() => setOpen(true)}>
        Cancel order
      </LabButton>
      <p role="status">{status}</p>
      <LabModal open={open} close={close} label="Cancel order #10482?" showClose={false}>
        <div style={{ display: 'grid', gap: 16, padding: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Cancel order #10482?</h2>
          <p style={{ margin: 0 }}>
            The customer won’t be called again and the reserved stock goes back to inventory.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <LabButton variant="text" onClick={close}>
              Keep order
            </LabButton>
            <LabButton
              variant="destructive"
              onClick={() => {
                setStatus('Order #10482 was cancelled.')
                close()
              }}
            >
              Cancel order
            </LabButton>
          </div>
        </div>
      </LabModal>
    </div>
  )
}

export const meta = {
  title: 'Confirmation',
  description:
    'A short confirmation on the plain layout: your content sets its padding. showClose={false} because “Keep order” already dismisses it.',
}
