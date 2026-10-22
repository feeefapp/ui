import { useState } from 'react'
import { Heart, Share2, X } from 'lucide-react'
import { GlassContainer } from '@feeef.dev/ui/glass'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import '../glass-container-demo.css'

export default function Adaptive() {
  const [backdrop, setBackdrop] = useState<'photo' | 'page'>('photo')
  return (
    <div className="glass-stage">
      <div className={backdrop === 'photo' ? 'glass-photo' : 'glass-page'} data-lab-backdrop={backdrop === 'photo' ? 'dark' : undefined}>
        <GlassContainer className="glass-row">
          <ToolbarGroup label="Close">
            <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Close">
              <X />
            </IconButton>
          </ToolbarGroup>
          <ToolbarGroup label="Photo actions">
            <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Save">
              <Heart />
            </IconButton>
            <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Share">
              <Share2 />
            </IconButton>
          </ToolbarGroup>
        </GlassContainer>
      </div>
      <SegmentedControl
        label="Behind the glass"
        value={backdrop}
        onChange={setBackdrop}
        options={[
          { value: 'photo', label: 'Dark photo' },
          { value: 'page', label: 'Page' },
        ]}
      />
    </div>
  )
}

export const meta = {
  title: 'Adapting to a dark photo',
  description:
    'Over a region marked data-lab-backdrop="dark" the bubbles switch to dark glass with light icons; over the page they keep the theme. In dark mode it works the other way round over light content.',
}
