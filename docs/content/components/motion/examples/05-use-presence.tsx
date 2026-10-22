import { useState } from 'react'
import { usePresence, useLatched } from '@feeef.dev/ui/motion'
import { LabButton } from '@feeef.dev/ui/primitives/button'
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
          <LabButton key={name} variant="outlined" controlSize="compact" onClick={() => setSelected(name)}>
            {name}
          </LabButton>
        ))}
        <LabButton variant="text" controlSize="compact" disabled={!open} onClick={() => setSelected(null)}>
          Close
        </LabButton>
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
    'usePresence and useLatched are the pieces LabPresence is built from. Use them when the exiting element is yours to render.',
}
