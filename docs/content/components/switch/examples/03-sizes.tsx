import { LabSlideSwitch } from '@feeef.dev/ui/primitives/slider'

export default function Sizes() {
  return (
    <div className="demo-row">
      <LabSlideSwitch label="Regular" defaultChecked />
      <LabSlideSwitch label="Compact" controlSize="compact" defaultChecked />
      <LabSlideSwitch label="Thin" trackStyle="thin" defaultChecked />
      <LabSlideSwitch label="With text" defaultChecked onText="On" offText="Off" />
      <LabSlideSwitch label="Disabled" disabled />
    </div>
  )
}

export const meta = {
  title: 'Sizes, track and text',
  description: 'Regular, compact and thin tracks, optional on/off text, and the disabled state.',
}
