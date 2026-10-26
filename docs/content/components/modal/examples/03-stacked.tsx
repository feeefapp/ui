import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Alert } from '@feeef.dev/ui/presentation'

export default function Stacked() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('The product has unsaved changes.')
  return (
    <div className="demo-column">
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Leave the editor
      </Button>
      <p role="status">{status}</p>
      <Alert
        open={open}
        onOpenChange={setOpen}
        title="Save your changes?"
        message="You changed the price and two photos of “Leather handbag”."
        actions={[
          { label: 'Save changes', role: 'primary', onAction: () => setStatus('Changes saved.') },
          { label: 'Discard changes', role: 'destructive', onAction: () => setStatus('Changes discarded.') },
          { label: 'Keep editing', role: 'cancel' },
        ]}
      />
    </div>
  )
}

export const meta = {
  title: 'Three choices',
  description:
    'More than two actions, or two that don’t fit side by side, stack full width with the cancel action at the bottom.',
}
