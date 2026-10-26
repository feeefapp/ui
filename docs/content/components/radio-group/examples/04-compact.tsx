import { RadioGroup } from '@feeef.dev/ui/primitives/choice'

export default function Compact() {
  return (
    <div className="demo-column">
      <RadioGroup
        label="Show orders from"
        controlSize="small"
        defaultValue="7d"
        options={[
          { value: 'today', label: 'Today' },
          { value: '7d', label: 'Last 7 days' },
          { value: '30d', label: 'Last 30 days' },
          { value: 'all', label: 'All time' },
        ]}
      />
    </div>
  )
}

export const meta = {
  title: 'Small',
  description: 'controlSize="small" for filter panels and side sheets.',
}
