import { Minus, Plus, RotateCcw } from 'lucide-react'
import { LabGlassGroup } from '@feeef.dev/ui/scaffold'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'
import '../glass-demo.css'

export default function Basic() {
  return (
    <div className="glass-demo-backdrop">
      <LabGlassGroup role="group" aria-label="Zoom" className="glass-demo-group-content">
        <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Zoom out">
          <Minus />
        </LabIconButton>
        <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Reset zoom">
          <RotateCcw />
        </LabIconButton>
        <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Zoom in">
          <Plus />
        </LabIconButton>
      </LabGlassGroup>
    </div>
  )
}

export const meta = {
  title: 'One material for a group',
  description:
    'Related controls share one glass surface floating over the work, here zoom controls over a product photo. The controls inside drop their own paint.',
}
