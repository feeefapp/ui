import { useState } from 'react'
import { LabNumberField } from '@feeef.dev/ui/primitives/number-field'

export default function Precision() {
  const [rating, setRating] = useState(4.2)
  return (
    <div className="demo-column">
      <LabNumberField
        label="Minimum courier rating"
        min={0}
        max={5}
        step={0.1}
        value={rating}
        onValueChange={setRating}
        format={(value) => `${value.toFixed(1)} ★`}
      />
      <small>Hold Shift while dragging to scrub ten times slower.</small>
    </div>
  )
}

export const meta = {
  title: 'Fine control and custom display',
  description: 'step sets the precision; format changes only the display text. Typing still edits the plain number.',
}
