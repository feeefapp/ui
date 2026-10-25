import { useMemo, useState } from 'react'
import { Check, ChevronDown, Clock, MessageSquareOff, Truck } from 'lucide-react'
import { ActionsBar, type Action } from '@feeef.dev/ui/actions'
import { Dock } from '@feeef.dev/ui/dock'

export default function SplitButton() {
  const [status, setStatus] = useState('')
  const actions = useMemo<Action[]>(
    () => [
      {
        id: 'confirm',
        type: 'action',
        label: 'Confirm order',
        icon: <Check />,
        variant: 'filled',
        priority: 100,
        onAction: () => setStatus('Order #10482 confirmed'),
      },
      {
        id: 'confirm-options',
        type: 'group',
        label: 'More ways to confirm',
        icon: <ChevronDown />,
        display: 'icon',
        // Same priority as the main action: the two halves never split up when the bar runs out of room.
        priority: 100,
        actions: [
          { id: 'confirm-ship', type: 'action', label: 'Confirm and ship', icon: <Truck />, onAction: () => setStatus('Confirmed and sent to the courier') },
          { id: 'confirm-quiet', type: 'action', label: 'Confirm without SMS', icon: <MessageSquareOff />, onAction: () => setStatus('Confirmed, no SMS sent') },
          { id: 'call-back', type: 'action', label: 'Call back later', icon: <Clock />, onAction: () => setStatus('Call back scheduled') },
        ],
      },
    ],
    []
  )
  return (
    <div className="demo-column" style={{ justifyItems: 'center' }}>
      {/* A dock tells its bar how much room it has: a bubble that hugs its content would fold both halves into ⋯. */}
      <Dock label="Order">
        <ActionsBar label="Confirm order" actions={actions} />
      </Dock>
      <p role="status" style={{ minHeight: 20, margin: 0, color: 'var(--lab-muted)' }}>
        {status}
      </p>
    </div>
  )
}

export const meta = {
  title: 'Split button',
  description:
    'The main action and a chevron for its variants, side by side in one bubble: an ActionsBar (in a dock or a toolbar slot that gives it room) with an action and an icon-only group. The menu grows out of the chevron. Both parts keep the same priority so they stay together.',
}
