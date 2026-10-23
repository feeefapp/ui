import { useId, useState } from 'react'
import { ArrowLeft, Brain, Share2 } from 'lucide-react'
import { GlassContainer } from '@feeef.dev/ui/glass'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import '../glass-container-demo.css'

export default function Appear() {
  const backdropId = `container-demo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [started, setStarted] = useState(false)
  return (
    <div className="glass-stage" data-lab-backdrop="light">
      <div id={backdropId} className="glass-stage-source" aria-hidden="true" />
      <GlassContainer tint={0} backdropSource={backdropId} className="glass-row">
        <ToolbarGroup label="Navigation">
          <IconButton variant="text" appearance="toolbar" aria-label="Back">
            <ArrowLeft />
          </IconButton>
        </ToolbarGroup>
        <ToolbarGroup label="Conversation" glassId="title">
          <span className="glass-title">{started ? 'Weekly sales summary' : 'New chat'}</span>
        </ToolbarGroup>
        {started && (
          <ToolbarGroup label="Chat actions" glassId="actions">
            <IconButton variant="text" appearance="toolbar" aria-label="Share">
              <Share2 />
            </IconButton>
            <IconButton variant="text" appearance="toolbar" aria-label="Memory">
              <Brain />
            </IconButton>
          </ToolbarGroup>
        )}
      </GlassContainer>
      <Button variant="tonal" onClick={() => setStarted(!started)}>
        {started ? 'Clear the chat' : 'Send the first message'}
      </Button>
    </div>
  )
}

export const meta = {
  title: 'Bubbles that come and go',
  description:
    'A new bubble farther than spacing from its neighbours materializes; bubbles that move because of it slide with their content. Removing it reverses the motion.',
}
