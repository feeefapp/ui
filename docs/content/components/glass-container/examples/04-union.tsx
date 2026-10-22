import { Bold, Italic, Link, Underline } from 'lucide-react'
import { GlassContainer } from '@feeef.dev/ui/glass'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import '../glass-container-demo.css'

export default function Union() {
  return (
    <div className="glass-stage">
      <GlassContainer className="glass-row" style={{ gap: 24 }}>
        <ToolbarGroup label="Text style" glassUnion="format">
          <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Bold">
            <Bold />
          </IconButton>
          <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Italic">
            <Italic />
          </IconButton>
        </ToolbarGroup>
        <ToolbarGroup label="Text decoration" glassUnion="format">
          <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Underline">
            <Underline />
          </IconButton>
        </ToolbarGroup>
        <ToolbarGroup label="Link">
          <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Add link">
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
