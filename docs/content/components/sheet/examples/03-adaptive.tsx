import { useState } from 'react'
import { Sheet } from '@feeef.dev/ui/containers'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { PresentationDock } from '@feeef.dev/ui/presentation'

export default function AdaptiveSheet() {
  const [open, setOpen] = useState(false)
  return (
    <div className="demo-column">
      <Button variant="filled" onClick={() => setOpen(true)}>
        Edit delivery address
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        label="Delivery address"
        detents={['fit']}
        title="Delivery address"
        dock={
          <PresentationDock>
            <Button variant="text" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" onClick={() => setOpen(false)}>
              Save address
            </Button>
          </PresentationDock>
        }
      >
        <div style={{ display: 'grid', gap: 16, paddingBlock: 4 }}>
          <TextField hint="Wilaya" defaultValue="Alger" />
          <TextField hint="Commune" defaultValue="Bab Ezzouar" />
          <TextField hint="Street and building" defaultValue="Cité 2068 Logements, Bt 12" />
        </div>
      </Sheet>
    </div>
  )
}

export const meta = {
  title: 'Adapts to the screen',
  description:
    'Without a container the sheet lives in the top layer of the real page: a bottom sheet on a phone, a centered dialog on a wide window (regular="dialog", the default). Resize the window to compare.',
}
