import { Mic, Sparkles } from 'lucide-react'
import { ProBadge } from '@feeef.dev/ui/primitives/badge'
import { Button } from '@feeef.dev/ui/primitives/button'

export default function OnAButton() {
  const paid = false
  return (
    <div className="demo-row">
      <Button variant="outlined">
        <Mic size={18} />
        Clone a voice
        {!paid && <ProBadge />}
      </Button>
      <Button variant="outlined">
        <Sparkles size={18} />
        Design a voice
        {!paid && <ProBadge />}
      </Button>
    </div>
  )
}

export const meta = {
  title: 'On a button',
  description:
    'Show the badge after the label on actions that need a paid plan, and drop it once the user has one.',
}
