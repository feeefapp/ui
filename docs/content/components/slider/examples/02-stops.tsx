import { LabSlider } from '@feeef.dev/ui/primitives/slider'

export default function Stops() {
  return (
    <div className="demo-wide">
      <LabSlider
        label="Minimum rating"
        min={1}
        max={5}
        defaultValue={4}
        showStops
        getValueText={(value) => `${value} stars and up`}
      />
    </div>
  )
}

export const meta = {
  title: 'Stops',
  description: 'showStops draws a dot on every step. Use it for short ranges like a star rating.',
}
