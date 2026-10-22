import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'

export default function Sizes() {
  return (
    <div className="demo-row">
      <SlideSwitch label="Regular" defaultChecked />
      <SlideSwitch label="Compact" controlSize="compact" defaultChecked />
      <SlideSwitch label="Thin" trackStyle="thin" defaultChecked />
      <SlideSwitch label="With text" defaultChecked onText="On" offText="Off" />
      <SlideSwitch label="Disabled" disabled />
    </div>
  )
}

export const meta = {
  title: 'Sizes, track and text',
  description: 'Regular, compact and thin tracks, optional on/off text, and the disabled state.',
}
