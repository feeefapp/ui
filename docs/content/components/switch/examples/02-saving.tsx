import { useState } from 'react'
import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'

const savePixel = (on: boolean) =>
  new Promise<void>((resolve, reject) => setTimeout(() => (on && Math.random() < 0.3 ? reject() : resolve()), 900))

export default function Saving() {
  const [active, setActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  return (
    <div className="demo-column">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span aria-hidden="true">Meta pixel</span>
        <SlideSwitch
          label="Meta pixel"
          checked={active}
          loading={saving}
          onCheckedCommit={(next) => {
            setActive(next)
            setSaving(true)
            setMessage('')
            savePixel(next)
              .then(() => setMessage(next ? 'Pixel is tracking orders.' : 'Pixel turned off.'))
              .catch(() => {
                setActive(!next)
                setMessage('Could not reach Meta. Try again in a minute.')
              })
              .finally(() => setSaving(false))
          }}
        />
      </div>
      <p role="status">{message}</p>
    </div>
  )
}

export const meta = {
  title: 'Saving state',
  description:
    'Save on onCheckedCommit and set loading while the request runs. On failure, flip it back and say why.',
}
