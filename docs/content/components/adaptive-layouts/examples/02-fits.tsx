import { useState } from 'react'
import { Copy, MessageSquare, MoreHorizontal, Phone } from 'lucide-react'
import { LabViewThatFits } from '@feeef.dev/ui/containers'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabSlider } from '@feeef.dev/ui/primitives/slider'
import '../adaptive-demo.css'

export default function ContactActions() {
  const [width, setWidth] = useState(520)
  return (
    <div className="ad-demo">
      <LabSlider label="Width" min={60} max={600} value={width} onValueChange={setWidth} />
      <div className="ad-frame" style={{ width }}>
        <LabViewThatFits>
          <div className="ad-actions">
            <LabButton variant="tonal"><Phone size={18} /> Call customer</LabButton>
            <LabButton variant="tonal"><MessageSquare size={18} /> Send SMS</LabButton>
            <LabButton variant="tonal"><Copy size={18} /> Copy number</LabButton>
          </div>
          <div className="ad-actions">
            <LabIconButton variant="tonal" aria-label="Call customer"><Phone /></LabIconButton>
            <LabIconButton variant="tonal" aria-label="Send SMS"><MessageSquare /></LabIconButton>
            <LabIconButton variant="tonal" aria-label="Copy number"><Copy /></LabIconButton>
          </div>
          <LabIconButton variant="tonal" aria-label="Contact actions"><MoreHorizontal /></LabIconButton>
        </LabViewThatFits>
      </div>
    </div>
  )
}

export const meta = {
  title: 'The view that fits',
  description:
    'Three versions of the same actions, most preferred first: labelled buttons, icons, one menu button. The first one that fits is shown.',
}
