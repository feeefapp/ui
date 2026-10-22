import { useState } from 'react'
import { Volume1, Volume2 } from 'lucide-react'
import { LabSlider } from '@feeef.dev/ui/primitives/slider'

export default function Thin() {
  const [volume, setVolume] = useState(60)
  return (
    <div className="demo-wide" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Volume1 size={18} aria-hidden="true" />
      <div style={{ flex: 1 }}>
        <LabSlider
          label="Notification volume"
          trackStyle="thin"
          value={volume}
          onValueChange={setVolume}
          getValueText={(value) => `${value}%`}
        />
      </div>
      <Volume2 size={18} aria-hidden="true" />
    </div>
  )
}

export const meta = {
  title: 'Thin track',
  description: 'trackStyle="thin" draws a 4px rail with a round thumb for settings panels.',
}
