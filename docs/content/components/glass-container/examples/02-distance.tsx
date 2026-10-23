import { useId, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { GlassContainer } from '@feeef.dev/ui/glass'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { Slider } from '@feeef.dev/ui/primitives/slider'
import '../glass-container-demo.css'

export default function Distance() {
  const backdropId = `container-demo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [gap, setGap] = useState(28)
  const [playing, setPlaying] = useState(false)
  return (
    <div className="glass-stage" data-lab-backdrop="light">
      <div id={backdropId} className="glass-stage-source" aria-hidden="true" />
      <GlassContainer tint={0} backdropSource={backdropId} className="glass-row" spacing={20} style={{ gap }}>
        <ToolbarGroup label="Previous">
          <IconButton variant="text" appearance="toolbar" aria-label="Previous take">
            <SkipBack />
          </IconButton>
        </ToolbarGroup>
        <ToolbarGroup label="Playback">
          <IconButton
            variant="text"
            appearance="toolbar"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause /> : <Play />}
          </IconButton>
        </ToolbarGroup>
        <ToolbarGroup label="Next">
          <IconButton variant="text" appearance="toolbar" aria-label="Next take">
            <SkipForward />
          </IconButton>
        </ToolbarGroup>
      </GlassContainer>
      <div className="glass-controls">
        <Slider label="Gap between bubbles" min={0} max={48} value={gap} onValueChange={setGap} />
      </div>
    </div>
  )
}

export const meta = {
  title: 'Merging by distance',
  description:
    'With spacing 20, bubbles closer than 20px bend toward each other and join below 10px, like drops of water. Drag the gap.',
}
