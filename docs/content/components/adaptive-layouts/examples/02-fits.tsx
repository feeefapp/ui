import { useState } from 'react'
import { Copy, MessageSquare, MoreHorizontal, Phone } from 'lucide-react'
import { ViewThatFits } from '@feeef.dev/ui/containers'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { Slider } from '@feeef.dev/ui/primitives/slider'
import '../adaptive-demo.css'

export default function ContactActions() {
  const [width, setWidth] = useState(520)
  return (
    <div className="ad-demo">
      <Slider label="Width" min={60} max={600} value={width} onValueChange={setWidth} />
      <div className="ad-frame" style={{ width }}>
        <ViewThatFits>
          <div className="ad-actions">
            <Button variant="tonal"><Phone size={18} /> Call customer</Button>
            <Button variant="tonal"><MessageSquare size={18} /> Send SMS</Button>
            <Button variant="tonal"><Copy size={18} /> Copy number</Button>
          </div>
          <div className="ad-actions">
            <IconButton variant="tonal" aria-label="Call customer"><Phone /></IconButton>
            <IconButton variant="tonal" aria-label="Send SMS"><MessageSquare /></IconButton>
            <IconButton variant="tonal" aria-label="Copy number"><Copy /></IconButton>
          </div>
          <IconButton variant="tonal" aria-label="Contact actions"><MoreHorizontal /></IconButton>
        </ViewThatFits>
      </div>
    </div>
  )
}

export const meta = {
  title: 'The view that fits',
  description:
    'Three versions of the same actions, most preferred first: labelled buttons, icons, one menu button. The first one that fits is shown.',
}
