import { useState } from 'react'
import { LabTemporalFilterEditor } from '@feeef.dev/ui/filters/temporal-editor'
import {
  temporalPresets,
  type LabTemporalConfig,
  type LabTemporalValue,
} from '@feeef.dev/ui/filters/temporal'

const today = new Date()
const iso = (date: Date) => date.toLocaleDateString('en-CA')
const daysAgo = (count: number) => {
  const date = new Date(today)
  date.setDate(today.getDate() - count)
  return iso(date)
}

const config: LabTemporalConfig = {
  type: 'dateRange',
  // Delivered orders are only kept for 90 days, so older presets are hidden automatically.
  min: daysAgo(89),
  max: iso(today),
  presets: [
    ...temporalPresets('dateRange', today).filter((preset) => preset.value !== null),
    { label: 'Last 90 days', value: { from: daysAgo(89), to: iso(today) } },
    { label: 'Last 180 days', value: { from: daysAgo(179), to: iso(today) } },
  ],
}

export default function Presets() {
  const [value, setValue] = useState<LabTemporalValue>(null)
  return (
    <div className="demo-wide">
      <LabTemporalFilterEditor config={config} value={value} onChange={setValue} />
    </div>
  )
}

export const meta = {
  title: 'Presets and bounds',
  description:
    'Presets that break min, max or step are hidden. Here “Last 180 days” falls outside the 90-day window.',
}
