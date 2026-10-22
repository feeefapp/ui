import { LabDock } from '@feeef.dev/ui/dock'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import '../dock-demo.css'

const ALIGNS = ['start', 'center', 'end', 'stretch'] as const

export default function Align() {
  return (
    <div className="dock-demo-stack">
      {ALIGNS.map((align) => (
        <div key={align} className="dock-demo-host" data-label={`align="${align}"`}>
          <LabDock label={`Delivery actions, ${align}`} align={align} content={<span>3 parcels</span>}>
            <LabButton variant="tonal">Call courier</LabButton>
          </LabDock>
        </div>
      ))}
    </div>
  )
}

export const meta = {
  title: 'Alignment',
  description:
    'center is the default for bottom task actions. start and end suit contextual chrome tied to one side; stretch is for true full-width surfaces.',
}
