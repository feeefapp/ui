import { useState } from 'react'
import { Columns3, LayoutGrid, List } from 'lucide-react'
import { GlassScope } from '@feeef.dev/ui/glass'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'

export default function WithIcons() {
  const [view, setView] = useState<'list' | 'board' | 'grid'>('board')
  return (
    <GlassScope>
      <ToolbarGroup label="Orders view">
        <SegmentedControl
          label="Orders view"
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List', icon: <List /> },
            { value: 'board', label: 'Board', icon: <Columns3 /> },
            { value: 'grid', label: 'Grid', icon: <LayoutGrid /> },
          ]}
        />
      </ToolbarGroup>
    </GlassScope>
  )
}

export const meta = {
  title: 'With icons',
  description:
    'Icons are decorative and sit before the label; keep the label. In glass: a ToolbarGroup bubble.',
}
