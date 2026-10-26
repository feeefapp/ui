import { Checkbox } from '@feeef.dev/ui/primitives/choice'

export default function CompactAndDisabled() {
  return (
    <div className="demo-column">
      <Checkbox controlSize="small" label="Show archived products" />
      <Checkbox controlSize="small" label="Include out-of-stock variants" defaultChecked />
      <Checkbox label="Sync stock with Feeef Cloud" description="Available on the Pro plan." disabled />
      <Checkbox label="Track inventory" defaultChecked disabled />
    </div>
  )
}

export const meta = {
  title: 'Small and disabled',
  description: 'Small checkboxes fit filter panels. Disabled ones keep their label readable; explain why in the description.',
}
