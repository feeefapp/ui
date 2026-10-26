import { useState } from 'react'
import { Slider } from '@feeef.dev/ui/primitives/slider'

const LEVELS = ['Draft', 'Standard', 'High', 'Best']

export default function Marks() {
  const [quality, setQuality] = useState(1)
  return (
    <div className="demo-wide">
      <Slider
        label="Image quality"
        min={0}
        max={3}
        value={quality}
        onValueChange={setQuality}
        marks={LEVELS.map((label, value) => ({ value, label }))}
        getValueText={(value) => LEVELS[value]}
      />
    </div>
  )
}

export const meta = {
  title: 'Labelled marks',
  description: 'marks names each level under the track. Pair them with getValueText so the name is also announced.',
}
