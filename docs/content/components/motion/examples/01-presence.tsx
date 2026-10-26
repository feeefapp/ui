import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Presence } from '@feeef.dev/ui/motion'
import { Button } from '@feeef.dev/ui/primitives/button'
import './presence.css'

export default function PresenceExample() {
  const [synced, setSynced] = useState<number | null>(null)
  return (
    <div className="demo-column">
      <Button variant="tonal" onClick={() => setSynced(synced === null ? 12 : null)}>
        {synced === null ? 'Sync orders' : 'Dismiss'}
      </Button>
      <Presence
        open={synced !== null}
        exitMs={160}
        render={(state) => (
          <div className="sync-notice" data-state={state} role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            {synced} orders synced from your store.
          </div>
        )}
      />
    </div>
  )
}

export const meta = {
  title: 'Enter and exit',
  description:
    'Presence keeps the notice mounted for its exit animation and freezes its last content, so "12 orders" does not flash to "null orders" while it fades.',
}
