import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Alert } from '@feeef.dev/ui/presentation'

export default function AlertDemo() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('Order notifications are off.')
  return (
    <div className="demo-column">
      <Button variant="tonal" onClick={() => setOpen(true)}>
        <Bell size={18} /> Notify me about new orders
      </Button>
      <p role="status">{status}</p>
      <Alert
        open={open}
        onOpenChange={setOpen}
        title="Turn on order notifications?"
        message="You’ll get a notification on this device for every new order."
        actions={[
          { label: 'Not now', role: 'cancel' },
          { label: 'Turn on', role: 'primary', onAction: () => setStatus('Order notifications are on.') },
        ]}
      />
    </div>
  )
}

export const meta = {
  title: 'Alert',
  description:
    'A plain decision: a title, one sentence and two capsule buttons on thick glass. Choosing either closes it; Escape runs the cancel action.',
}
