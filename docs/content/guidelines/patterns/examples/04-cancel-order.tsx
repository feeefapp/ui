import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Modal } from '@feeef.dev/ui/primitives/modal'
import { Option, Select } from '@feeef.dev/ui/primitives/select'
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
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Cancel order
        </Button>
      </div>
      <Modal open={open} close={close} label="Cancel order #1048?" showClose={false}>
        <div className="pt-dialog">
          <h2>Cancel order #1048?</h2>
          <p>
            Amina Benali won’t be called again, the 2 reserved items go back to stock and the order moves to
            Failed. You can’t undo this.
          </p>
          <Select hint="Reason" value={reason} error={error} onValueChange={(value) => { setReason(value); setError(null) }}>
            <Option>Customer refused</Option>
            <Option>Duplicate order</Option>
            <Option>Fake order</Option>
            <Option>Out of stock</Option>
          </Select>
          <div className="pt-dialog-actions">
            <Button variant="text" onClick={close}>
              Keep order
            </Button>
            <Button variant="destructive" onClick={cancel}>
              Cancel order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export const meta = {
  title: 'Cancel an order',
  description:
    'The title asks the exact question, the body says what will happen to the customer, the stock and the order, and the two buttons repeat the choice in words.',
}
