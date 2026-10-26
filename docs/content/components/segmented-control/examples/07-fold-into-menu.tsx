import { useState } from 'react'
import { Columns3, LayoutGrid, List, Search } from 'lucide-react'
import { GlassScope } from '@feeef.dev/ui/glass'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Slider } from '@feeef.dev/ui/primitives/slider'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'

type View = 'list' | 'board' | 'grid'
const LABELS: Record<View, string> = { list: 'List', board: 'Board', grid: 'Grid' }

export default function FoldIntoMenu() {
  const [width, setWidth] = useState(280)
  const [view, setView] = useState<View>('board')
  return (
    <div className="demo-wide" style={{ display: 'grid', justifyItems: 'center', gap: 16 }}>
      <Slider label="Bar width" min={200} max={560} value={width} onValueChange={setWidth} />
      <GlassScope style={{ display: 'flex', gap: 8, width, maxWidth: '100%' }}>
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
        <ToolbarGroup label="Tools">
          <IconButton variant="text" appearance="toolbar" aria-label="Search orders">
            <Search />
          </IconButton>
        </ToolbarGroup>
      </GlassScope>
      <p style={{ margin: 0 }}>Showing orders as {LABELS[view]}</p>
    </div>
  )
}

export const meta = {
  title: 'Folding into a menu',
  description:
    'When the bar has no room for every option, the others fold into the selected one, which gains a chevron and opens them as a single-choice menu. Widen the bar and it unfolds. Arrow Left and Right still step through the options; Up and Down open the menu.',
}
