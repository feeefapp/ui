import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabModal } from '@feeef.dev/ui/primitives/modal'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'
import '../patterns.css'

export default function CancelOrder() {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Order #1048 · Amina Benali · 9 600 DA · waiting for confirmation')
  const close = () => {
    setOpen(false)
    setError(null)
  }
  const cancel = () => {
    if (!reason) {
      setError('Choose why the order is cancelled; it shows in your failure reports.')
      return
    }
    setStatus(`Order #1048 was cancelled (${reason.toLowerCase()}). 2 items went back to stock.`)
    close()
  }
  return (
    <div className="demo-column">
      <p role="status">{status}</p>
      <div className="demo-row" style={{ justifyContent: 'flex-start' }}>
        <LabButton variant="destructive" onClick={() => setOpen(true)}>
          Cancel order
        </LabButton>
      </div>
      <LabModal open={open} close={close} label="Cancel order #1048?" showClose={false}>
        <div className="pt-dialog">
          <h2>Cancel order #1048?</h2>
          <p>
            Amina Benali won’t be called again, the 2 reserved items go back to stock and the order moves to
            Failed. You can’t undo this.
          </p>
          <LabSelect hint="Reason" value={reason} error={error} onValueChange={(value) => { setReason(value); setError(null) }}>
            <LabOption>Customer refused</LabOption>
            <LabOption>Duplicate order</LabOption>
            <LabOption>Fake order</LabOption>
            <LabOption>Out of stock</LabOption>
          </LabSelect>
          <div className="pt-dialog-actions">
            <LabButton variant="text" onClick={close}>
              Keep order
            </LabButton>
            <LabButton variant="destructive" onClick={cancel}>
              Cancel order
            </LabButton>
          </div>
        </div>
      </LabModal>
    </div>
  )
}

export const meta = {
  title: 'Cancel an order',
  description:
    'The title asks the exact question, the body says what will happen to the customer, the stock and the order, and the two buttons repeat the choice in words.',
}
