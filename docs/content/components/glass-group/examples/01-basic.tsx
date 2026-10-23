import { Minus, Plus, RotateCcw } from 'lucide-react'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import '../glass-demo.css'

export default function Basic() {
  return (
    <div className="glass-demo-backdrop">
      <GlassGroup role="group" aria-label="Zoom" className="glass-demo-group-content">
        <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Zoom out">
          <Minus />
        </IconButton>
        <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Reset zoom">
          <RotateCcw />
        </IconButton>
        <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Zoom in">
          <Plus />
        </IconButton>
      </GlassGroup>
    </div>
  )
}

export const meta = {
  title: 'One material for a group',
  description:
    'Related controls share one glass surface floating over the work, here zoom controls over a product photo. The controls inside drop their own paint.',
}
