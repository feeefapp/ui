import { LockKeyhole } from 'lucide-react'
import './badge.css'

/** A small lock + "PRO" tag for a feature that needs a paid plan. Takes no props. */
export function ProBadge() {
  return (
    <span className="lab-badge">
      <LockKeyhole size={10} /> PRO
    </span>
  )
}
