import { useState } from 'react'
import { LabSlider } from '@feeef.dev/ui/primitives/slider'

export default function RenderSlots() {
  const [strength, setStrength] = useState(70)
  return (
    <div className="demo-wide">
      <LabSlider
        label="Background removal strength"
        value={strength}
        onValueChange={setStrength}
        getValueText={(value) => `${value}%`}
        renderThumb={({ value }) => (
          <span style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 12, fontWeight: 600 }}>
            {value}
          </span>
        )}
      />
    </div>
  )
}

export const meta = {
  title: 'Custom decoration',
  description: 'renderThumb draws inside the thumb from the live state; the slider keeps its own geometry and motion. renderFill and renderTrack work the same way.',
}
