import { useState } from 'react'
import { DateRangeField } from '@feeef.dev/ui/primitives/temporal-field'
import { temporalPresets, type TemporalPreset } from '@feeef.dev/ui/filters/temporal'

const iso = (date: Date) => date.toLocaleDateString('en-CA')

function salesPresets(now = new Date()): TemporalPreset[] {
  const weekStart = new Date(now)
  // The Algerian work week starts on Sunday.
  weekStart.setDate(now.getDate() - now.getDay())
  const ramadan = { from: '2026-02-18', to: '2026-03-19' }
  return [
    ...temporalPresets('dateRange', now).filter((preset) =>
      ['Today', 'Last 7 days', 'Last 30 days'].includes(preset.label)
    ),
    { label: 'This week', value: { from: iso(weekStart), to: iso(now) } },
    { label: 'Ramadan 2026', value: ramadan },
  ]
}

export default function Presets() {
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null)
  return (
    <div className="demo-column">
      <DateRangeField
        hint="Sales period"
        value={period}
        onValueChange={setPeriod}
        presets={salesPresets()}
      />
    </div>
  )
}

export const meta = {
  title: 'Custom presets',
  description:
    'Replace the defaults with presets that fit the task. Mix in temporalPresets() to keep the standard ones.',
}
