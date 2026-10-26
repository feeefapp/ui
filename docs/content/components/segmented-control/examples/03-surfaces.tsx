import { useState } from 'react'
import { Download } from 'lucide-react'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'

type Period = 'day' | 'week' | 'month'
const PERIODS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const

export default function Surfaces() {
  const [period, setPeriod] = useState<Period>('week')
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      {/* Floating: in a glass bubble of a toolbar. */}
      <Toolbar
        label="Sales report"
        leading={
          <ToolbarGroup label="Period">
            <SegmentedControl label="Report period" value={period} onChange={setPeriod} options={PERIODS} />
          </ToolbarGroup>
        }
        trailing={
          <ToolbarGroup label="Export">
            <IconButton variant="text" appearance="toolbar" aria-label="Export report">
              <Download size={20} />
            </IconButton>
          </ToolbarGroup>
        }
      />
      {/* In content or a form: on a plain box (the root already has the capsule radius). */}
      <SegmentedControl
        label="Report period"
        className="demo-segmented-box"
        value={period}
        onChange={setPeriod}
        options={PERIODS}
      />
      {/* Bare: just the options and the pill. */}
      <SegmentedControl label="Report period" value={period} onChange={setPeriod} options={PERIODS} />
    </div>
  )
}

export const meta = {
  title: 'Glass, box or bare',
  description:
    'The control paints no container of its own. Put it in glass where it floats (a ToolbarGroup), on a plain box in content and forms, or leave it bare.',
}
