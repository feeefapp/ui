import { LabGlassGroup } from '@feeef.dev/ui/scaffold'
import '../glass-demo.css'

export default function Materials() {
  return (
    <div className="glass-demo-backdrop">
      <div className="glass-demo-pair">
        <div className="glass-demo-surface">
          <strong>Surface</strong>
          <p>Content: order details, forms, lists. Opaque, so text stays readable.</p>
        </div>
        <LabGlassGroup className="glass-demo-panel">
          <strong>Glass</strong>
          <p>Chrome: toolbars, docks, floating controls. Lets the work show through.</p>
        </LabGlassGroup>
      </div>
    </div>
  )
}

export const meta = {
  title: 'Glass and surface',
  description: 'Glass is for chrome that floats; solid surfaces protect the content people read and edit.',
}
