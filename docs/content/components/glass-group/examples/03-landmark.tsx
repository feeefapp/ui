import { Share2 } from 'lucide-react'
import { LabGlassGroup } from '@feeef.dev/ui/scaffold'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import '../glass-demo.css'

export default function Landmark() {
  return (
    <div className="glass-demo-backdrop">
      <LabGlassGroup as="header" className="glass-demo-header">
        <strong>Store preview</strong>
        <span className="demo-row">
          <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Share store link">
            <Share2 />
          </LabIconButton>
          <LabButton variant="filled" controlSize="compact">
            Publish
          </LabButton>
        </span>
      </LabGlassGroup>
    </div>
  )
}

export const meta = {
  title: 'Semantic element',
  description: 'as picks the element, so a floating group can be a header, nav, aside, section or footer.',
}
