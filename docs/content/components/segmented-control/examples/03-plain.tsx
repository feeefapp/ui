import { useState } from 'react'
import { Download } from 'lucide-react'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabSegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { LabToolbar, LabToolbarGroup } from '@feeef.dev/ui/toolbar'

export default function Plain() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  return (
    <LabToolbar
      label="Sales report"
      className="demo-wide"
      leading={
        <LabToolbarGroup label="Period">
          <LabSegmentedControl
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
        </LabToolbarGroup>
      }
      trailing={
        <LabToolbarGroup label="Export">
          <LabIconButton variant="text" appearance="toolbar" aria-label="Export report">
            <Download size={20} />
          </LabIconButton>
        </LabToolbarGroup>
      }
    />
  )
}

export const meta = {
  title: 'Plain, in a toolbar',
  description:
    'appearance="plain" drops the control’s own container so it shares the surface it sits on.',
}
