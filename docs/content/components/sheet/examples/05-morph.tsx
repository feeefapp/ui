import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Sheet } from '@feeef.dev/ui/containers'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { GlassScope } from '@feeef.dev/ui/glass'
import { PresentationDock } from '@feeef.dev/ui/presentation'
import { Device } from '../../../../src/blocks/device'
import { DemoMap } from '../demo-map'

export default function MorphSheet() {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <Device label="A phone with a button that grows into a sheet">
      {(screen) => (
        <>
          <DemoMap />
          <div className="demo-sheet-toolbar">
            <GlassScope>
              <ToolbarGroup label="Map actions">
                <Button ref={button} variant="text" appearance="toolbar" onClick={() => setOpen(true)}>
                  <Plus size={18} /> New stop
                </Button>
              </ToolbarGroup>
            </GlassScope>
          </div>
          <Sheet
            open={open}
            onOpenChange={setOpen}
            label="New stop"
            title="New stop"
            container={screen}
            source={button}
            detents={['medium', 'large']}
            dock={
              <PresentationDock label="Save the stop">
                <Button variant="filled" onClick={() => setOpen(false)}>
                  Add to route
                </Button>
              </PresentationDock>
            }
          >
            <div style={{ display: 'grid', gap: 16, paddingBlock: 4 }}>
              <TextField hint="Customer" defaultValue="Amina B." />
              <TextField hint="Address" defaultValue="Cité 2068 Logements, Bt 12" />
              <TextField hint="Note for the driver" />
            </div>
          </Sheet>
        </>
      )}
    </Device>
  )
}

export const meta = {
  title: 'Grows out of its button',
  description:
    'source={buttonRef}: the toolbar button becomes the sheet, header first, and the sheet flies back into it when closed with the close bubble, the scrim or Escape. Dragged away, it slides down instead.',
}
