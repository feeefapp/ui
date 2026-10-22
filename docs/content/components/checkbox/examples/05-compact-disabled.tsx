import { LabCheckbox } from '@feeef.dev/ui/primitives/choice'

export default function CompactAndDisabled() {
  return (
    <div className="demo-column">
      <LabCheckbox controlSize="compact" label="Show archived products" />
      <LabCheckbox controlSize="compact" label="Include out-of-stock variants" defaultChecked />
      <LabCheckbox label="Sync stock with Feeef Cloud" description="Available on the Pro plan." disabled />
      <LabCheckbox label="Track inventory" defaultChecked disabled />
    </div>
  )
}

export const meta = {
  title: 'Compact and disabled',
  description: 'Compact checkboxes fit filter panels. Disabled ones keep their label readable; explain why in the description.',
}
