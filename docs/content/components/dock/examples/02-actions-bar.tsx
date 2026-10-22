import { useState } from 'react'
import { Copy, Printer, Trash2, Truck } from 'lucide-react'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabActionsBar, type LabAction } from '@feeef.dev/ui/actions'
import { LabSlider } from '@feeef.dev/ui/primitives/slider'
import '../dock-demo.css'

export default function WithActionsBar() {
  const [width, setWidth] = useState(560)
  const actions: LabAction[] = [
    { id: 'delete', type: 'action', label: 'Delete', icon: <Trash2 />, destructive: true, priority: 0, onAction: () => {} },
    { id: 'duplicate', type: 'action', label: 'Duplicate', icon: <Copy />, priority: 1, onAction: () => {} },
    { id: 'print', type: 'action', label: 'Print label', icon: <Printer />, priority: 2, onAction: () => {} },
    { id: 'ship', type: 'action', label: 'Ship order', icon: <Truck />, variant: 'filled', priority: 10, onAction: () => {} },
  ]
  return (
    <div className="dock-demo-stack">
      <LabSlider label="Host width" min={240} max={640} step={10} value={width} onValueChange={setWidth} />
      <div className="dock-demo-host dock-demo-host-narrow" style={{ maxWidth: width }} data-label={`Host: ${width}px`}>
        <LabDock label="Order actions" content={<strong>Order #1048</strong>}>
          <LabActionsBar actions={actions} label="Order actions" size="compact" />
        </LabDock>
      </div>
    </div>
  )
}

export const meta = {
  title: 'Overflowing actions',
  description:
    'With a LabActionsBar inside, the dock tells it how much width is left after the tile; low-priority actions move into a More menu as the host narrows.',
}
