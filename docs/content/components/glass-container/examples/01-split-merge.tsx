import { useId, useState } from 'react'
import { Copy, Share2, Trash2 } from 'lucide-react'
import { GlassContainer, GlassScope } from '@feeef.dev/ui/glass'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import '../glass-container-demo.css'

export default function SplitMerge() {
  const backdropId = `container-demo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [split, setSplit] = useState(false)
  const share = (
    <IconButton variant="text" appearance="toolbar" aria-label="Share">
      <Share2 />
    </IconButton>
  )
  const copy = (
    <IconButton variant="text" appearance="toolbar" aria-label="Duplicate">
      <Copy />
    </IconButton>
  )
  const remove = (
    <IconButton variant="text" appearance="toolbar" aria-label="Delete">
      <Trash2 />
    </IconButton>
  )
  return (
    <div className="glass-stage" data-lab-backdrop="light">
      <div id={backdropId} className="glass-stage-source" aria-hidden="true" />
      <GlassContainer tint={0} backdropSource={backdropId} className="glass-row">
        {split ? (
          <>
            <ToolbarGroup label="Share" glassId="share">{share}{copy}</ToolbarGroup>
            <ToolbarGroup label="Delete" glassId="delete">{remove}</ToolbarGroup>
          </>
        ) : (
          <ToolbarGroup label="Order actions" glassId="actions">
            {share}
            {copy}
            {remove}
          </ToolbarGroup>
        )}
      </GlassContainer>
      <GlassScope>
        <ToolbarGroup label="Delete action">
          <SegmentedControl
            label="Delete action"
            value={split ? 'apart' : 'together'}
            onChange={(value) => setSplit(value === 'apart')}
            options={[
              { value: 'together', label: 'One bubble' },
              { value: 'apart', label: 'Delete on its own' },
            ]}
          />
        </ToolbarGroup>
      </GlassScope>
    </div>
  )
}

export const meta = {
  title: 'Split and merge',
  description:
    'One bubble becomes two: the new bubbles grow out of the old one, stretch a neck and break apart. Turn it off and they flow back together.',
}
