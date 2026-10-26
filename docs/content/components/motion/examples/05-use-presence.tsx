import { useState } from 'react'
import { usePresence, useLatched } from '@feeef.dev/ui/motion'
import { Button } from '@feeef.dev/ui/primitives/button'
import './presence.css'

const CUSTOMERS = ['Sara B.', 'Karim M.', 'Nour H.']

export default function UsePresenceHook() {
  const [selected, setSelected] = useState<string | null>(null)
  const open = selected !== null
  const { mounted, state } = usePresence(open, 160)
  // While closing, keep showing the customer that was open.
  const shown = useLatched(selected, open)
  return (
    <div className="demo-column">
      <div className="demo-row">
        {CUSTOMERS.map((name) => (
          <Button key={name} variant="outlined" controlSize="small" onClick={() => setSelected(name)}>
            {name}
          </Button>
        ))}
        <Button variant="text" controlSize="small" disabled={!open} onClick={() => setSelected(null)}>
          Close
        </Button>
      </div>
      {mounted && (
        <div className="sync-notice" data-state={state}>
          Now calling {shown}
        </div>
      )}
    </div>
  )
}

export const meta = {
  title: 'Hooks',
  description:
    'usePresence and useLatched are the pieces Presence is built from. Use them when the exiting element is yours to render.',
}
