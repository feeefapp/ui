import { Mic, Sparkles } from 'lucide-react'
import { LabProBadge } from '@feeef.dev/ui/primitives/badge'
import { LabButton } from '@feeef.dev/ui/primitives/button'

export default function OnAButton() {
  const paid = false
  return (
    <div className="demo-row">
      <LabButton variant="outlined">
        <Mic size={18} />
        Clone a voice
        {!paid && <LabProBadge />}
      </LabButton>
      <LabButton variant="outlined">
        <Sparkles size={18} />
        Design a voice
        {!paid && <LabProBadge />}
      </LabButton>
    </div>
  )
}

export const meta = {
  title: 'On a button',
  description:
    'Show the badge after the label on actions that need a paid plan, and drop it once the user has one.',
}
