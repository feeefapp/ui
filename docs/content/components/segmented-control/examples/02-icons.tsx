import { useState } from 'react'
import { Columns3, LayoutGrid, List } from 'lucide-react'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'

export default function WithIcons() {
  const [view, setView] = useState<'list' | 'board' | 'grid'>('board')
  return (
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
  )
}

export const meta = {
  title: 'With icons',
  description: 'Icons are decorative and sit before the label. Keep the label.',
}
