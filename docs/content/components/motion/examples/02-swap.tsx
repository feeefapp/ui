import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Swap } from '@feeef.dev/ui/motion'
import { IconButton } from '@feeef.dev/ui/primitives/button'

export default function SwapExample() {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="demo-row">
      <IconButton
        variant="filled"
        aria-label={playing ? 'Pause preview' : 'Play preview'}
        aria-pressed={playing}
        onClick={() => setPlaying(!playing)}
      >
        <Swap swapKey={playing ? 'pause' : 'play'}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </Swap>
      </IconButton>
      <span>{playing ? 'Playing take 3' : 'Take 3 · 0:42'}</span>
    </div>
  )
}

export const meta = {
  title: 'Icon swap',
  description:
    'Swap cross-fades icons in one fixed cell. It is hidden from assistive technology, so the button carries the label.',
}
