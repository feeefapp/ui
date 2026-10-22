import { useState } from 'react'
import { Download } from 'lucide-react'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'

export default function Plain() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  return (
    <Toolbar
      label="Sales report"
      className="demo-wide"
      leading={
        <ToolbarGroup label="Period">
          <SegmentedControl
            label="Report period"
            appearance="plain"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
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
  )
}

export const meta = {
  title: 'Plain, in a toolbar',
  description:
    'appearance="plain" drops the control’s own container so it shares the surface it sits on.',
}
