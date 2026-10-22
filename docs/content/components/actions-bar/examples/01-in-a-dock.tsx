import { useMemo, useState } from 'react'
import { Check, Printer, Trash2, Truck, UserRound } from 'lucide-react'
import { LabActionsBar, type LabAction } from '@feeef.dev/ui/actions'
import { LabDock } from '@feeef.dev/ui/dock'

export default function InADock() {
  const [status, setStatus] = useState('3 selected')
  const actions = useMemo<LabAction[]>(
    () => [
      { id: 'delete', type: 'action', label: 'Delete', icon: <Trash2 />, destructive: true, priority: -1, onAction: () => setStatus('3 orders deleted') },
      { id: 'print', type: 'action', label: 'Print labels', icon: <Printer />, onAction: () => setStatus('Labels sent to the printer') },
      { id: 'assign', type: 'action', label: 'Assign agent', icon: <UserRound />, priority: 1, onAction: () => setStatus('Assigned to Amina') },
      { id: 'ship', type: 'action', label: 'Ship', icon: <Truck />, priority: 2, onAction: () => setStatus('3 orders sent to Yalidine') },
      { id: 'confirm', type: 'action', label: 'Confirm', icon: <Check />, variant: 'filled', priority: 10, onAction: () => setStatus('3 orders confirmed') },
    ],
    []
  )
  return (
    <div className="demo-wide">
      <LabDock label="Selected orders" content={<span role="status">{status}</span>}>
        <LabActionsBar label="Selected order actions" actions={actions} />
      </LabDock>
    </div>
  )
}

export const meta = {
  title: 'In a dock',
  description:
    'The usual home: a dock holds a status tile and the bar, and tells the bar how much room it has.',
}
