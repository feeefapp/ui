import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'

export default function Loading() {
  const [saving, setSaving] = useState(false)
  const save = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 1600)
  }
  return (
    <div className="demo-row">
      <Button variant="filled" loading={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="elevated" disabled>
        Disabled
      </Button>
    </div>
  )
}

export const meta = {
  title: 'Loading and disabled',
  description:
    'loading shows a pixel loader, sets aria-busy and blocks clicks until it clears, so a request is never sent twice.',
}
