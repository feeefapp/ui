import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'

export default function Sizes() {
  return (
    <div className="demo-row">
      <SlideSwitch label="Regular" defaultChecked />
      <SlideSwitch label="Thin" trackStyle="thin" defaultChecked />
      <SlideSwitch label="With text" defaultChecked onText="On" offText="Off" />
      <SlideSwitch label="Disabled" disabled />
    </div>
  )
}

export const meta = {
  title: 'Track and text',
  description: 'The iOS-sized thick track, the thin track, optional on/off text, and the disabled state. Switches have one size, set by density and ThemeConfig metrics.',
}
