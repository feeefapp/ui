import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { Pane, PresentationDock } from '@feeef.dev/ui/presentation'

export default function Inspector() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('Amina Benali · 0555 12 34 56')
  const close = () => setOpen(false)
  return (
    <div className="demo-column">
      <Button variant="tonal" onClick={() => setOpen(true)}>
        <Pencil size={18} /> Edit customer
      </Button>
      <p role="status">{status}</p>
      <Pane
        open={open}
        onOpenChange={setOpen}
        label="Edit customer"
        title="Edit customer"
        dock={
          <PresentationDock>
            <Button variant="text" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                setStatus('Customer saved.')
                close()
              }}
            >
              Save customer
            </Button>
          </PresentationDock>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <TextField hint="Name" defaultValue="Amina Benali" />
          <TextField hint="Phone" type="tel" defaultValue="0555 12 34 56" />
          <TextField hint="Wilaya" defaultValue="Alger" />
          <TextField hint="Commune" defaultValue="Bab Ezzouar" />
          <TextField hint="Note for the courier" defaultValue="Call before coming." />
        </div>
      </Pane>
    </div>
  )
}

export const meta = {
  title: 'Inspector with a form',
  description:
    'A full-height pane slides in from the end side with its close bubble beside it; the actions float in a dock. Narrow the window below 720px and the same pane opens as a bottom sheet.',
}
