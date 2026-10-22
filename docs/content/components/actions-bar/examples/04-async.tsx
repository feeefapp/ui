import { useMemo, useState } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import { LabActionsBar, type LabAction } from '@feeef.dev/ui/actions'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Async() {
  const [log, setLog] = useState('')
  const actions = useMemo<LabAction[]>(
    () => [
      {
        id: 'sync',
        type: 'action',
        label: 'Sync with courier',
        icon: <RefreshCw />,
        onAction: async () => {
          await wait(1500)
          setLog('Statuses updated from ZR Express.')
        },
      },
      {
        id: 'print',
        type: 'action',
        label: 'Print labels',
        icon: <Printer />,
        variant: 'filled',
        onAction: async () => {
          await wait(800)
          throw new Error('Printer offline')
        },
      },
    ],
    []
  )
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 12 }}>
      <LabActionsBar
        label="Shipping actions"
        actions={actions}
        onActionError={(error, action) =>
          setLog(`${action.label}: ${error instanceof Error ? error.message : 'failed'}`)
        }
      />
      <p role="status" style={{ margin: 0 }}>{log}</p>
    </div>
  )
}

export const meta = {
  title: 'Async actions and errors',
  description:
    'A returned promise shows a loader and blocks double clicks. A rejection shows an inline alert and calls onActionError.',
}
