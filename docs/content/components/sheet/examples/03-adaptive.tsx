import { useState } from 'react'
import { LabSheet } from '@feeef.dev/ui/containers'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabDock } from '@feeef.dev/ui/dock'

export default function AdaptiveSheet() {
  const [open, setOpen] = useState(false)
  return (
    <div className="demo-column">
      <LabButton variant="filled" onClick={() => setOpen(true)}>
        Edit delivery address
      </LabButton>
      <LabSheet
        open={open}
        onOpenChange={setOpen}
        label="Delivery address"
        detents={['fit']}
        top={
          <LabToolbarGroup label="Sheet title">
            <strong className="demo-sheet-title">Delivery address</strong>
          </LabToolbarGroup>
        }
        bottom={
          <LabDock label="Address actions">
            <LabButton variant="text" onClick={() => setOpen(false)}>
              Cancel
            </LabButton>
            <LabButton variant="filled" onClick={() => setOpen(false)}>
              Save address
            </LabButton>
          </LabDock>
        }
      >
        <div style={{ display: 'grid', gap: 16, paddingBlock: 4 }}>
          <LabTextField hint="Wilaya" defaultValue="Alger" />
          <LabTextField hint="Commune" defaultValue="Bab Ezzouar" />
          <LabTextField hint="Street and building" defaultValue="Cité 2068 Logements, Bt 12" />
        </div>
      </LabSheet>
    </div>
  )
}

export const meta = {
  title: 'Adapts to the screen',
  description:
    'Without a container the sheet lives in the top layer of the real page: a bottom sheet on a phone, a centered dialog on a wide window (regular="dialog", the default). Resize the window to compare.',
}
