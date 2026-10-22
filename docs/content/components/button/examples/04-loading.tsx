import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'

export default function Loading() {
  const [saving, setSaving] = useState(false)
  const save = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 1600)
  }
  return (
    <div className="demo-row">
      <LabButton variant="filled" loading={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save'}
      </LabButton>
      <LabButton variant="elevated" disabled>
        Disabled
      </LabButton>
    </div>
  )
}

export const meta = {
  title: 'Loading and disabled',
  description:
    'loading shows a pixel loader, sets aria-busy and blocks clicks until it clears, so a request is never sent twice.',
}
