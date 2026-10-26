import { useId } from 'react'
import { Bold, Italic, Link, Underline } from 'lucide-react'
import { GlassContainer } from '@feeef.dev/ui/glass'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import '../glass-container-demo.css'

export default function Union() {
  const backdropId = `container-demo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <div className="glass-stage" data-lab-backdrop="light">
      <div id={backdropId} className="glass-stage-source" aria-hidden="true" />
      <GlassContainer tint={0} backdropSource={backdropId} className="glass-row" style={{ gap: 24 }}>
        <ToolbarGroup label="Text style" glassUnion="format">
          <IconButton variant="text" appearance="toolbar" aria-label="Bold">
            <Bold />
          </IconButton>
          <IconButton variant="text" appearance="toolbar" aria-label="Italic">
            <Italic />
          </IconButton>
        </ToolbarGroup>
        <ToolbarGroup label="Text decoration" glassUnion="format">
          <IconButton variant="text" appearance="toolbar" aria-label="Underline">
            <Underline />
          </IconButton>
        </ToolbarGroup>
        <ToolbarGroup label="Link">
          <IconButton variant="text" appearance="toolbar" aria-label="Add link">
            <Link />
          </IconButton>
        </ToolbarGroup>
      </GlassContainer>
    </div>
  )
}

export const meta = {
  title: 'One shape for separate groups',
  description:
    'glassUnion draws several groups as one shape even when they sit apart, while each keeps its own label and keyboard group.',
}
