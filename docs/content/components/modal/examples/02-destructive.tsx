import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Alert } from '@feeef.dev/ui/presentation'

export default function DestructiveConfirm() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('Order #10482 is waiting for confirmation.')
  return (
    <div className="demo-column">
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <p role="status">{status}</p>
      <Alert
        open={open}
        onOpenChange={setOpen}
        title="Cancel order #10482?"
        message="The customer won’t be called again and the reserved stock goes back to inventory. You can’t undo this."
        actions={[
          { label: 'Keep order', role: 'cancel' },
          { label: 'Cancel order', role: 'destructive', onAction: () => setStatus('Order #10482 was cancelled.') },
        ]}
      />
    </div>
  )
}

export const meta = {
  title: 'Destructive confirmation',
  description:
    'role: "destructive" tints the action danger. Focus starts on the cancel action, so Enter never deletes by accident.',
}
